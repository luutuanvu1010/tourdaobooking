// ADR-0148 Đ1 (lượt 1) — nút «Sửa» qua route thật trên SQLite thật (tests/audit/harness.mjs): tiêu chí 1–5 của kế hoạch docs/superpowers/plans/2026-10-29-sua-muc-luot-1-ke-hoach.md.
// Luật thuần: sua-muc.test.ts; trigger CSDL: sua-muc-csdl.test.ts. Đồng hồ giả cố định 29/10/2026 10:00 giờ VN (bài không phụ thuộc ngày chạy). Ca «đã có đơn chụp» đi đường THẬT
// (xác nhận đơn rồi Sửa) ở mỗi loại dòng; hàm tiêm giả `ngayChupGia` chỉ cho ca khó dựng bằng đơn thật (dòng có ngày kết thúc đã có đơn chụp).
import { mock, test, type TestContext } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SA = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666"; // Đối tác
const HR = "77777777-7777-4777-8777-777777777777";
const KP = "99999999-9999-4999-8999-999999999990"; // tài khoản lai Kế toán + Đối tác
const AT = "2026-10-01T00:00:00.000Z";
const ORG = "dda00000-0000-4000-8000-0000000000b1";
const HN = "2026-10-29";
const LY_DO = "Nhập sai giá đại lý của vé tiêu chuẩn";
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };

const { CHECKS, demViPham } = (await import(new URL("../../../scripts/audit-checks.mjs", import.meta.url).href)) as {
  CHECKS: { code: string; sql: string }[];
  demViPham: (c: unknown, rows: unknown[]) => number;
};

/** Đồng hồ giả 29/10/2026 10:00 giờ VN; gọi TRƯỚC `setup()`. */
function dongHo(t: TestContext): void {
  mock.timers.enable({ apis: ["Date"], now: Date.parse(`${HN}T03:00:00.000Z`) });
  t.after(() => mock.timers.reset());
}
function setup(tuyChon: Record<string, unknown> = {}): W {
  const w = world(tuyChon);
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [ADM, "0900000006", "Quản Trị", ["ADMIN"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]], [HR, "0900000009", "Hà Nhân Sự", ["HR"]], [KP, "0900000011", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Spa Hoa Sen', 1, ?, ?)").run(ORG, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(ORG, AT, AT);
  return w;
}
const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => {
  const r = await p;
  assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`);
  return r;
};
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const nhatKy = (w: W, action: string): string[] => w.q("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid", action).map((x: { detail: string }) => x.detail);
const dongMuc = (w: W, id: string): any => w.q("SELECT * FROM prc_commission_rule WHERE id = ?", id)[0];
const dongGan = (w: W, id: string): any => w.q("SELECT * FROM prc_role_tier WHERE id = ?", id)[0];
const dongRieng = (w: W, id: string): any => w.q("SELECT * FROM prc_party_tier WHERE id = ?", id)[0];
/** Mọi bất biến R-PRC-* (kể cả R-PRC-7) trên CSDL thử phải 0. */
function batBienSach(w: W): void {
  for (const c of CHECKS.filter((x) => x.code.startsWith("R-PRC-"))) assert.equal(demViPham(c, w.q(c.sql)), 0, `${c.code} phải 0`);
}
async function themLoai(w: W, ten: string): Promise<string> {
  const loai = (await ok(w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten } }), 201, `thêm loại ${ten}`)).json.loai.code as string;
  await ok(w.call("POST", `/api/parties/${ORG}/roles`, { as: ADM, body: { roleTypeCode: loai } }), 201, "gắn loại cho hồ sơ");
  return loai;
}
/** Dòng mức của LOẠI `loai` (mọi dịch vụ, tỷ lệ) — trả mã dòng. */
async function themDongLoai(w: W, loai: string, tyLeBp: number, tuNgay: string, denNgay?: string): Promise<string> {
  const body = { doiTuong: { loai: "VAI", code: loai }, phamVi: "ALL", kieu: "RATE", tyLeBp, tuNgay, ...(denNgay === undefined ? {} : { denNgay }) };
  return (await ok(w.call("POST", "/api/pricing/hoa-hong", { as: KT, body }), 201, "thêm dòng mức")).json.dong.id as string;
}
async function taoMuc(w: W, ten: string, tyLeBp: number): Promise<string> {
  const code = (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten } }), 201, `tạo chính sách ${ten}`)).json.muc.code as string;
  await ok(w.call("POST", `/api/pricing/muc-ta/${code}/dong`, { as: KT, body: { phamVi: "ALL", kieu: "RATE", tyLeBp, tuNgay: "2026-01-01" } }), 201, `dòng của ${ten}`);
  return code;
}
const ganLoai = async (w: W, loai: string, muc: string, tuNgay: string, denNgay?: string): Promise<string> =>
  (await ok(w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai, muc, tuNgay, ...(denNgay === undefined ? {} : { denNgay }) } }), 201, "gắn loại")).json.gan.id as string;
async function ganRieng(w: W, muc: string, tuNgay: string): Promise<string> {
  await ok(w.call("POST", `/api/pricing/ho-so/${ORG}/muc-rieng`, { as: KT, body: { muc, tuNgay } }), 201, "gắn riêng");
  return String(w.q("SELECT id FROM prc_party_tier WHERE party_id = ? AND voided_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1", ORG)[0].id);
}
const xem = (w: W, duong: string, id: string, as = KT) => w.call("GET", `/api/pricing/${duong}/${id}/sua`, { as });
const sua = (w: W, duong: string, id: string, body: Record<string, unknown>, as = KT) => w.call("POST", `/api/pricing/${duong}/${id}/sua`, { as, body });
const thuTra = async (w: W, ngay = HN) => (await ok(w.call("GET", `/api/pricing/thu-tra?doiTac=${ORG}&dichVu=ZA1&ngay=${ngay}`, { as: KT }), 200, "thử tra")).json.ketQua;

/** Đơn nháp bằng SQL (ZA1, 2.000.000đ, ngày đi hôm nay, bên đặt ORG) rồi xác nhận qua route ⇒ bản chụp AUTO ngày hôm nay. */
async function xacNhan(w: W): Promise<string> {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 2000000, 2000000, 2000000, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, ORG, AT, AT);
  const s = `${id}-s0`;
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'ZA1', 'Tour đảo', 'perPax', 1, ?)`).run(s, id, HN);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'ZA1', 'adult', 'Người lớn', 1, 2000000, 2000000, 2000000)`).run(`${s}-i`, id, s);
  await ok(w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } }), 200, "xác nhận");
  return id;
}
const chup = (w: W, id: string): any[] => w.q("SELECT * FROM ord_service_terms WHERE order_id = ? ORDER BY created_at", id);

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Tiêu chí 1 — ví dụ của chủ: dòng 2027-01-01 → 2028-01-01 chưa có đơn ⇒ Sửa được số, cách tính, hai ngày; dòng cũ «đã huỷ», không ra ở tra mức / chụp
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("tiêu chí 1 (ví dụ chủ): dòng 2027-01-01 → 2028-01-01 chưa có đơn ⇒ xem trước «huỷ–thay»; Sửa đổi cách tính + hai ngày ⇒ dòng cũ đã huỷ (giữ ngày, có người huỷ), dòng mới mang dòng cũ + lý do; tra mức chỉ thấy dòng mới; sửa lại dòng đã huỷ ⇒ 400", async (t) => {
  dongHo(t);
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  const cu = await themDongLoai(w, loai, 1000, "2027-01-01", "2028-01-01");
  assert.deepEqual((await ok(xem(w, "hoa-hong", cu), 200, "xem trước")).json, { homNay: HN, duong: "HUY_THAY" });

  const r = await ok(sua(w, "hoa-hong", cu, { kieu: "PER_PAX", moiKhach: 50_000, tuNgay: "2027-02-01", denNgay: "2027-12-31", lyDo: `  ${LY_DO}  ` }), 200, "sửa");
  assert.equal(r.json.duong, "HUY_THAY");
  assert.deepEqual([r.json.cu.id, r.json.cu.daHuy, r.json.cu.conHieuLuc], [cu, true, false]);
  const moiId = r.json.moi.id as string;
  assert.deepEqual([r.json.moi.kieu, r.json.moi.moiKhach, r.json.moi.tuNgay, r.json.moi.denNgay, r.json.moi.thayCho, r.json.moi.lyDoSua], ["PER_PAX", 50_000, "2027-02-01", "2027-12-31", cu, LY_DO]);
  const a = dongMuc(w, cu), b = dongMuc(w, moiId);
  assert.ok(a.voided_at !== null && a.voided_by === KT, "dòng cũ có dấu huỷ và người huỷ");
  assert.deepEqual([a.valid_from_date, a.valid_to_date, a.kind, a.rate_bp], ["2027-01-01", "2028-01-01", "RATE", 1000], "dòng cũ giữ nguyên số và ngày (lịch sử)");
  assert.deepEqual([b.replaces_id, b.change_reason, b.voided_at, b.target_role_code, b.scope], [cu, LY_DO, null, loai, "ALL"]);
  assert.equal(nhatKy(w, "prc_commission_rule_voided").length, 1);
  assert.equal(nhatKy(w, "prc_commission_rule_added").at(-1), `sửa mức · dòng ${cu} → ${moiId} · huỷ dòng cũ`);
  assert.ok(!JSON.stringify(w.q("SELECT detail FROM audit_log")).includes("Nhập sai"), "nhật ký không chép lý do");

  // Tra mức ngày trong khoảng cũ nhưng ngoài khoảng mới ⇒ KHÔNG rơi về dòng đã huỷ.
  assert.equal((await thuTra(w, "2027-01-15")).trangThai, "MISSING", "dòng đã huỷ không bao giờ được tra");
  const t2 = await thuTra(w, "2027-06-01");
  assert.deepEqual([t2.trangThai, t2.muc.id], ["SET", moiId]);
  // Bảng mức: dòng huỷ còn ở lịch sử, có cờ; dòng mới trỏ dòng huỷ.
  const ds = (await ok(w.call("GET", "/api/pricing/hoa-hong", { as: KT }), 200)).json.dong as any[];
  assert.deepEqual([ds.find((d) => d.id === cu).daHuy, ds.find((d) => d.id === moiId).thayCho], [true, cu]);
  // Dòng đã huỷ: không sửa / đổi / ngừng được nữa; nhập lần hai ⇒ 400, không ghi gì.
  const truoc = [dem(w, "SELECT count(*) n FROM prc_commission_rule"), dem(w, "SELECT count(*) n FROM audit_log")];
  for (const p of [xem(w, "hoa-hong", cu), sua(w, "hoa-hong", cu, { kieu: "RATE", tyLeBp: 900, tuNgay: "2027-01-01", lyDo: LY_DO }),
    w.call("POST", `/api/pricing/hoa-hong/${cu}/dong`, { as: KT, body: { denNgay: "2027-06-01" } }), w.call("POST", `/api/pricing/hoa-hong/${cu}/doi`, { as: KT, body: { kieu: "RATE", tyLeBp: 900, tuNgay: "2027-06-01" } })]) {
    const x = await p;
    assert.deepEqual([x.status, x.json.error.message], [400, "Dòng này đã huỷ — sửa dòng thay cho nó."], x.text);
  }
  assert.deepEqual([dem(w, "SELECT count(*) n FROM prc_commission_rule"), dem(w, "SELECT count(*) n FROM audit_log")], truoc);
  batBienSach(w);
});

test("tiêu chí 1: dòng đã bắt đầu, CHƯA đơn nào chụp ⇒ huỷ–thay giữ đúng ngày bắt đầu cũ (Q5); đơn xác nhận sau đó chụp DÒNG MỚI, không bao giờ dòng huỷ", async (t) => {
  dongHo(t);
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  const cu = await themDongLoai(w, loai, 1000, "2026-10-01");
  const lech = await sua(w, "hoa-hong", cu, { kieu: "RATE", tyLeBp: 1200, tuNgay: "2026-10-15", lyDo: LY_DO });
  assert.equal(lech.status, 400, "ngày bắt đầu mới trong quá khứ (khác ngày cũ) ⇒ từ chối");
  const r = await ok(sua(w, "hoa-hong", cu, { kieu: "RATE", tyLeBp: 1200, tuNgay: "2026-10-01", lyDo: LY_DO }), 200);
  assert.equal(r.json.duong, "HUY_THAY");
  const don = await xacNhan(w);
  assert.deepEqual([chup(w, don)[0].commission_rule_id, chup(w, don)[0].commission_rate_bp], [r.json.moi.id, 1200]);
  batBienSach(w);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Tiêu chí 2 + 3 — dòng đã có đơn chụp: phần sửa áp từ X (Q2), dòng cũ đóng ở X − 1, đơn cũ giữ mức; không huỷ được; R-PRC-7 sạch
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("tiêu chí 2 + 3 (đường thật): đơn xác nhận hôm nay theo dòng mức ⇒ xem trước «từ ngày» 30/10; Sửa từ hôm nay / giữ ngày cũ ⇒ 400 (không huỷ được); Sửa từ 30/10 ⇒ dòng cũ đóng 29/10, đơn cũ giữ 10%, R-PRC-7 sạch", async (t) => {
  dongHo(t);
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  const cu = await themDongLoai(w, loai, 1000, "2026-10-01");
  const don = await xacNhan(w);
  const banChup = chup(w, don);
  assert.equal(banChup[0].commission_rule_id, cu);
  assert.deepEqual((await ok(xem(w, "hoa-hong", cu), 200)).json, { homNay: HN, duong: "TU_NGAY", tuNgaySomNhat: "2026-10-30", denNgayToiDa: null });
  const truoc = [dem(w, "SELECT count(*) n FROM prc_commission_rule"), dem(w, "SELECT count(*) n FROM audit_log")];
  for (const tuNgay of [HN, "2026-10-01"]) {
    const x = await sua(w, "hoa-hong", cu, { kieu: "RATE", tyLeBp: 1200, tuNgay, lyDo: LY_DO });
    assert.deepEqual([x.status, x.json.error.message], [400, "Đã có đơn dùng mức này — phần sửa chỉ áp được từ ngày 30/10/2026; đơn cũ giữ mức cũ."], `${tuNgay}: ${x.text}`);
  }
  assert.deepEqual([dem(w, "SELECT count(*) n FROM prc_commission_rule"), dem(w, "SELECT count(*) n FROM audit_log")], truoc, "từ chối không ghi gì");
  assert.equal(dongMuc(w, cu).voided_at, null, "dòng đã chụp không bị huỷ");

  const r = await ok(sua(w, "hoa-hong", cu, { kieu: "RATE", tyLeBp: 1200, tuNgay: "2026-10-30", lyDo: LY_DO }), 200);
  assert.equal(r.json.duong, "TU_NGAY");
  assert.deepEqual([dongMuc(w, cu).valid_to_date, dongMuc(w, cu).voided_at], [HN, null]);
  assert.deepEqual([dongMuc(w, r.json.moi.id).valid_from_date, dongMuc(w, r.json.moi.id).replaces_id, dongMuc(w, r.json.moi.id).change_reason], ["2026-10-30", cu, LY_DO]);
  assert.equal(nhatKy(w, "prc_commission_rule_closed").at(-1), `sửa mức · dòng ${cu} → ${r.json.moi.id} · từ 2026-10-30`);
  assert.deepEqual(chup(w, don), banChup, "đơn cũ giữ nguyên bản chụp");
  assert.equal((await thuTra(w)).muc.id, cu, "hôm nay vẫn theo dòng cũ");
  assert.equal((await thuTra(w, "2026-10-30")).muc.id, r.json.moi.id);
  batBienSach(w);
});

test("tiêu chí 2: dòng ĐÃ có ngày kết thúc và đã có đơn chụp (hàm tiêm giả: chụp 29/10) ⇒ Sửa được trong khoảng ngày cũ; quá ngày kết thúc cũ ⇒ 400; dòng hết hạn ⇒ 400", async (t) => {
  dongHo(t);
  const w = setup({ ngayChupGia: HN });
  const loai = await themLoai(w, "Lễ tân");
  const cu = await themDongLoai(w, loai, 1000, "2026-10-01", "2026-12-31");
  assert.deepEqual((await ok(xem(w, "hoa-hong", cu), 200)).json, { homNay: HN, duong: "TU_NGAY", tuNgaySomNhat: "2026-10-30", denNgayToiDa: "2026-12-31" });
  const qua = await sua(w, "hoa-hong", cu, { kieu: "RATE", tyLeBp: 1200, tuNgay: "2027-01-05", lyDo: LY_DO });
  assert.equal(qua.status, 400, qua.text);
  assert.match(qua.json.error.message, /^Mức cũ kết thúc ngày 31\/12\/2026/);
  const r = await ok(sua(w, "hoa-hong", cu, { kieu: "RATE", tyLeBp: 1200, tuNgay: "2026-11-15", denNgay: "2026-12-31", lyDo: LY_DO }), 200);
  assert.deepEqual([dongMuc(w, cu).valid_to_date, dongMuc(w, r.json.moi.id).valid_from_date, dongMuc(w, r.json.moi.id).valid_to_date], ["2026-11-14", "2026-11-15", "2026-12-31"]);
  // Dòng đã hết hạn (kết thúc trước hôm nay) ⇒ không sửa.
  const het = await themDongLoai(w, await themLoai(w, "Nhân viên spa"), 1000, "2026-09-01", "2026-09-30");
  const x = await xem(w, "hoa-hong", het);
  assert.deepEqual([x.status, x.json.error.message], [400, "Mức này đã hết hạn nên không sửa được. Thêm mức mới nếu cần."]);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Tiêu chí 4 — lý do bắt buộc; quyền: chỉ Kế toán / Quản trị / Toàn quyền KHÔNG mang quyền Đối tác
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("tiêu chí 4: thiếu lý do / dưới 10 ký tự / quá 300 / có số điện thoại ⇒ 400, không ghi gì", async (t) => {
  dongHo(t);
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  const cu = await themDongLoai(w, loai, 1000, "2027-01-01");
  const truoc = [dem(w, "SELECT count(*) n FROM prc_commission_rule"), dem(w, "SELECT count(*) n FROM audit_log")];
  for (const [lyDo, cau] of [[undefined, /ít nhất 10 ký tự/], ["", /ít nhất 10 ký tự/], ["sai giá  ", /ít nhất 10 ký tự/], ["x".repeat(301), /tối đa 300/], ["gọi lại 0901234567 hỏi giá", /số điện thoại/]] as const) {
    const x = await sua(w, "hoa-hong", cu, { kieu: "RATE", tyLeBp: 1200, tuNgay: "2027-01-01", ...(lyDo === undefined ? {} : { lyDo }) });
    assert.equal(x.status, 400, `${String(lyDo)}: ${x.text}`);
    assert.match(x.json.error.message, cau);
  }
  assert.deepEqual([dem(w, "SELECT count(*) n FROM prc_commission_rule"), dem(w, "SELECT count(*) n FROM audit_log")], truoc);
});

test("tiêu chí 4: Bán hàng, HDV, Nhân sự, Đối tác, tài khoản lai Kế toán + Đối tác ⇒ 403 ở cả sáu đường Sửa (xem trước + ghi); Quản trị và Toàn quyền ⇒ 200", async (t) => {
  dongHo(t);
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  const dong = await themDongLoai(w, loai, 1000, "2027-01-01");
  const ta1 = await taoMuc(w, "TA1", 1000);
  const ta2 = await taoMuc(w, "TA2", 1200);
  const gan = await ganLoai(w, loai, ta1, "2027-01-01");
  const rieng = await ganRieng(w, ta2, "2027-01-01");
  const ca: [string, string, Record<string, unknown>][] = [
    ["hoa-hong", dong, { kieu: "RATE", tyLeBp: 1200, tuNgay: "2027-01-01", lyDo: LY_DO }],
    ["muc-ta/gan", gan, { muc: ta2, tuNgay: "2027-01-01", lyDo: LY_DO }],
    ["muc-rieng", rieng, { muc: ta1, tuNgay: "2027-01-01", lyDo: LY_DO }],
  ];
  const truoc = [dem(w, "SELECT count(*) n FROM prc_commission_rule"), dem(w, "SELECT count(*) n FROM prc_role_tier"), dem(w, "SELECT count(*) n FROM prc_party_tier"), dem(w, "SELECT count(*) n FROM audit_log")];
  for (const as of [SALES, HDV, HR, DT, KP]) {
    for (const [duong, id, body] of ca) {
      assert.equal((await xem(w, duong, id, as)).status, 403, `xem ${duong} — ${as}`);
      assert.equal((await sua(w, duong, id, body, as)).status, 403, `sửa ${duong} — ${as}`);
    }
  }
  assert.deepEqual([dem(w, "SELECT count(*) n FROM prc_commission_rule"), dem(w, "SELECT count(*) n FROM prc_role_tier"), dem(w, "SELECT count(*) n FROM prc_party_tier"), dem(w, "SELECT count(*) n FROM audit_log")], truoc);
  await ok(xem(w, "hoa-hong", dong, ADM), 200, "Quản trị xem trước");
  await ok(sua(w, "hoa-hong", dong, ca[0][2], ADM), 200, "Quản trị sửa");
  await ok(sua(w, "muc-ta/gan", gan, ca[1][2], SA), 200, "Toàn quyền sửa gắn loại");
  await ok(sua(w, "muc-rieng", rieng, ca[2][2], SA), 200, "Toàn quyền sửa gắn riêng");
});

test("từ chối kín (ADR-0148 Đ1): thiếu hàm tiêm «đã chụp chưa» ⇒ Sửa (xem + ghi), Đổi, Ngừng của cả ba loại dòng trả 503, không ghi gì", async (t) => {
  dongHo(t);
  const w = setup({ khongTiemDaChup: true });
  const loai = await themLoai(w, "Lễ tân");
  const dong = await themDongLoai(w, loai, 1000, "2026-10-01");
  const ta1 = await taoMuc(w, "TA1", 1000);
  const ta2 = await taoMuc(w, "TA2", 1200);
  const gan = await ganLoai(w, loai, ta1, "2026-10-01");
  const rieng = await ganRieng(w, ta2, "2026-10-01");
  const truoc = [dem(w, "SELECT count(*) n FROM prc_commission_rule"), dem(w, "SELECT count(*) n FROM prc_role_tier"), dem(w, "SELECT count(*) n FROM prc_party_tier"), dem(w, "SELECT count(*) n FROM audit_log")];
  for (const p of [
    xem(w, "hoa-hong", dong), sua(w, "hoa-hong", dong, { kieu: "RATE", tyLeBp: 1200, tuNgay: "2026-10-30", lyDo: LY_DO }),
    w.call("POST", `/api/pricing/hoa-hong/${dong}/dong`, { as: KT, body: { denNgay: "2026-10-30" } }), w.call("POST", `/api/pricing/hoa-hong/${dong}/doi`, { as: KT, body: { kieu: "RATE", tyLeBp: 1200, tuNgay: "2026-10-30" } }),
    xem(w, "muc-ta/gan", gan), sua(w, "muc-ta/gan", gan, { muc: ta2, tuNgay: "2026-10-30", lyDo: LY_DO }),
    w.call("POST", `/api/pricing/muc-ta/gan/${gan}/ket-thuc`, { as: KT, body: { denNgay: "2026-10-30" } }), w.call("POST", `/api/pricing/muc-ta/gan/${gan}/doi`, { as: KT, body: { muc: ta2, tuNgay: "2026-10-30" } }),
    xem(w, "muc-rieng", rieng), sua(w, "muc-rieng", rieng, { muc: ta1, tuNgay: "2026-10-30", lyDo: LY_DO }),
    w.call("POST", `/api/pricing/muc-rieng/${rieng}/ket-thuc`, { as: KT, body: { denNgay: "2026-10-30" } }),
  ]) {
    const x = await p;
    assert.deepEqual([x.status, x.json.error.code], [503, "chua_kiem_chup"], x.text);
  }
  assert.deepEqual([dem(w, "SELECT count(*) n FROM prc_commission_rule"), dem(w, "SELECT count(*) n FROM prc_role_tier"), dem(w, "SELECT count(*) n FROM prc_party_tier"), dem(w, "SELECT count(*) n FROM audit_log")], truoc);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Tiêu chí 5 — gắn loại và gắn đối tác cũng có Sửa (cả hai đường); Đổi / Ngừng không còn tạo được bản chụp ngoài khoảng ngày (Q4)
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("tiêu chí 5 — gắn loại: chưa có đơn ⇒ huỷ–thay (đổi chính sách + ngày), tra mức theo gắn mới; đã có đơn (đường thật) ⇒ từ 30/10, đơn cũ giữ chính sách cũ", async (t) => {
  dongHo(t);
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  const ta1 = await taoMuc(w, "TA1", 1000);
  const ta2 = await taoMuc(w, "TA2", 1200);
  const ta3 = await taoMuc(w, "TA3", 1500);
  // Chưa có đơn (gắn bắt đầu 2027) ⇒ huỷ–thay.
  const sau = await ganLoai(w, loai, ta1, "2027-01-01", "2027-12-31");
  assert.deepEqual((await ok(xem(w, "muc-ta/gan", sau), 200)).json, { homNay: HN, duong: "HUY_THAY" });
  const r1 = await ok(sua(w, "muc-ta/gan", sau, { muc: ta2, tuNgay: "2027-02-01", lyDo: LY_DO }), 200);
  assert.deepEqual([r1.json.duong, r1.json.cu.daHuy, r1.json.moi.muc.code, r1.json.moi.tuNgay, r1.json.moi.denNgay, r1.json.moi.thayCho, r1.json.moi.lyDoSua], ["HUY_THAY", true, ta2, "2027-02-01", null, sau, LY_DO]);
  assert.equal(dongGan(w, sau).voided_by, KT);
  assert.equal((await thuTra(w, "2027-01-15")).trangThai, "MISSING", "gắn đã huỷ không bao giờ được tra");
  assert.equal((await thuTra(w, "2027-06-01")).muc.tyLeBp, 1200);
  assert.equal(nhatKy(w, "prc_role_tier_voided").length, 1);

  // Đã có đơn: gắn hiện hành TA1 từ 01/10, đơn xác nhận hôm nay ⇒ Sửa chỉ từ 30/10.
  const nay = await ganLoai(w, loai, ta1, "2026-10-01", "2026-12-31");
  const don = await xacNhan(w);
  const banChup = chup(w, don);
  assert.equal(banChup[0].commission_rate_bp, 1000);
  assert.deepEqual((await ok(xem(w, "muc-ta/gan", nay), 200)).json, { homNay: HN, duong: "TU_NGAY", tuNgaySomNhat: "2026-10-30", denNgayToiDa: "2026-12-31" });
  assert.equal((await sua(w, "muc-ta/gan", nay, { muc: ta3, tuNgay: "2026-10-01", denNgay: "2026-12-31", lyDo: LY_DO })).status, 400, "không huỷ được gắn đã có đơn");
  const r2 = await ok(sua(w, "muc-ta/gan", nay, { muc: ta3, tuNgay: "2026-10-30", denNgay: "2026-12-31", lyDo: LY_DO }), 200);
  assert.deepEqual([r2.json.duong, dongGan(w, nay).valid_to_date, dongGan(w, nay).voided_at, dongGan(w, r2.json.moi.id).replaces_id], ["TU_NGAY", HN, null, nay]);
  assert.deepEqual(chup(w, don), banChup, "đơn cũ giữ bản chụp");
  assert.equal((await thuTra(w, "2026-10-30")).muc.tyLeBp, 1500);
  batBienSach(w);
});

test("tiêu chí 5 — gắn đối tác: chưa có đơn ⇒ huỷ–thay giữ ngày bắt đầu cũ; đã có đơn (đường thật) ⇒ từ 30/10; gắn đã huỷ không được tra, không vào bản chụp", async (t) => {
  dongHo(t);
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  const ta1 = await taoMuc(w, "TA1", 1000);
  const ta2 = await taoMuc(w, "TA2", 1200);
  const ta3 = await taoMuc(w, "TA3", 1500);
  await ganLoai(w, loai, ta1, "2026-01-01");
  const rieng = await ganRieng(w, ta2, "2026-10-01");
  assert.deepEqual((await ok(xem(w, "muc-rieng", rieng), 200)).json, { homNay: HN, duong: "HUY_THAY" });
  await ok(sua(w, "muc-rieng", rieng, { muc: ta3, tuNgay: "2026-10-01", lyDo: LY_DO }), 200, "huỷ–thay gắn riêng");
  const moi = String(w.q("SELECT id FROM prc_party_tier WHERE replaces_id = ?", rieng)[0].id);
  assert.deepEqual([dongRieng(w, rieng).voided_by, dongRieng(w, moi).change_reason, dongRieng(w, moi).tier_code], [KT, LY_DO, ta3]);
  assert.equal(nhatKy(w, "prc_party_tier_voided").length, 1);
  assert.equal((await thuTra(w)).muc.tyLeBp, 1500, "tra theo gắn riêng mới, không theo gắn đã huỷ");
  const don = await xacNhan(w);
  assert.equal(chup(w, don)[0].commission_rate_bp, 1500, "bản chụp theo gắn mới");
  // Gắn riêng mới đã có đơn ⇒ Sửa từ 30/10.
  assert.deepEqual((await ok(xem(w, "muc-rieng", moi), 200)).json, { homNay: HN, duong: "TU_NGAY", tuNgaySomNhat: "2026-10-30", denNgayToiDa: null });
  await ok(sua(w, "muc-rieng", moi, { muc: ta2, tuNgay: "2026-10-30", lyDo: LY_DO }), 200, "sửa gắn riêng đã có đơn");
  assert.deepEqual([dongRieng(w, moi).valid_to_date, dongRieng(w, moi).voided_at], [HN, null]);
  assert.equal((await thuTra(w, "2026-10-30")).muc.tyLeBp, 1200);
  batBienSach(w);
});

// Người kiểm độc lập 29/10 (N1): ở bài trên gắn riêng cũ và mới cùng ngày bắt đầu nên không phân biệt được bên nào thắng. Ở đây gắn riêng bị huỷ–thay sang ngày SAU
// ⇒ hôm nay KHÔNG còn gắn riêng nào: mọi câu TRA (thử tra, bản chụp lúc xác nhận, khối «Hoa hồng hiện hành» của hồ sơ, danh sách gắn riêng đang / sắp) phải rơi về gắn
// theo loại — lọt gắn đã huỷ là ra mức của chính sách nhập nhầm (gắn không có lớp CSDL chặn, R-PRC-7 chỉ canh dòng mức).
test("gắn đối tác huỷ–thay sang ngày sau: hôm nay mọi câu tra rơi về gắn theo loại, không về gắn riêng đã huỷ (thử tra, bản chụp, khối hồ sơ, danh sách)", async (t) => {
  dongHo(t);
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  const ta1 = await taoMuc(w, "TA1", 1000);
  const ta2 = await taoMuc(w, "TA2", 1200);
  const ta3 = await taoMuc(w, "TA3", 1500);
  await ganLoai(w, loai, ta1, "2026-01-01");
  const rieng = await ganRieng(w, ta2, "2026-10-01");
  assert.equal((await thuTra(w)).muc.tyLeBp, 1200, "trước khi sửa: gắn riêng TA2");
  await ok(sua(w, "muc-rieng", rieng, { muc: ta3, tuNgay: "2026-11-01", lyDo: LY_DO }), 200, "huỷ–thay gắn riêng sang 01/11");
  assert.equal(dongRieng(w, rieng).voided_by, KT);
  assert.equal((await thuTra(w)).muc.tyLeBp, 1000, "hôm nay: gắn theo loại TA1, không phải gắn riêng đã huỷ");
  assert.equal((await thuTra(w, "2026-11-01")).muc.tyLeBp, 1500, "từ 01/11: gắn riêng mới TA3");
  const ds = (await ok(w.call("GET", "/api/pricing/muc-ta", { as: KT }), 200)).json.ganRieng as { muc: string }[];
  assert.deepEqual(ds.map((g) => g.muc), [ta3], "danh sách gắn riêng đang / sắp: chỉ TA3");
  // N5 (29/10): khối hồ sơ nay có thêm trường LỊCH SỬ `ganRieng` (mọi lần gắn, kể cả đã huỷ). Phần TRA của khối (`mucRieng`, `vai`, số đếm) vẫn không bao giờ nhắc gắn
  // đã huỷ; gắn đã huỷ chỉ đứng trong lịch sử, mang cờ huỷ, không hiệu lực.
  const khoi = (await ok(w.call("GET", `/api/pricing/ho-so/${ORG}/hoa-hong`, { as: KT }), 200)).json;
  const { ganRieng: lichSu, ...phanTra } = khoi;
  assert.equal(khoi.mucRieng, null, "hôm nay không còn gắn riêng nào");
  assert.deepEqual(khoi.vai.map((v: { muc: { code: string } | null }) => v.muc?.code), [ta1], "loại theo chính sách TA1");
  assert.ok(!JSON.stringify(phanTra).includes(ta2), `phần tra của khối không nhắc gắn riêng đã huỷ: ${JSON.stringify(phanTra)}`);
  assert.deepEqual(lichSu.map((g: { muc: { code: string }; daHuy: boolean; conHieuLuc: boolean }) => [g.muc.code, g.daHuy, g.conHieuLuc]), [[ta3, false, false], [ta2, true, false]]);
  const don = await xacNhan(w);
  assert.equal(chup(w, don)[0].commission_rate_bp, 1000, "bản chụp hôm nay theo gắn loại TA1");
  batBienSach(w);
});

// N5 (kế hoạch 2026-10-29-sua-muc-n5-ke-hoach.md, R4, tiêu chí 3–4): khối hồ sơ trả thêm `ganRieng` = MỌI lần gắn riêng của hồ sơ (đã ngừng, đang áp, sắp áp, đã huỷ), mới → cũ;
// cùng ngày bắt đầu (huỷ–thay giữ ngày cũ) thì lần thay đứng trước lần bị huỷ. Chỉ mã, tên mức, ngày, cờ — không SĐT/email/MST, không lý do sửa (người kiểm N5). `mucRieng` không đổi.
test("N5 (R4): khối hồ sơ có lịch sử gắn riêng đủ bốn trạng thái, mới → cũ, đúng cờ; `mucRieng` không đổi sau khi sửa lần sắp áp; không trường nào ngoài danh sách", async (t) => {
  dongHo(t);
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  const ta1 = await taoMuc(w, "TA1", 1000);
  const ta2 = await taoMuc(w, "TA2", 1200);
  const ta3 = await taoMuc(w, "TA3", 1500);
  await ganLoai(w, loai, ta1, "2026-01-01");
  const gan = async (muc: string, tuNgay: string, denNgay?: string): Promise<string> => {
    await ok(w.call("POST", `/api/pricing/ho-so/${ORG}/muc-rieng`, { as: KT, body: { muc, tuNgay, ...(denNgay === undefined ? {} : { denNgay }) } }), 201, `gắn riêng từ ${tuNgay}`);
    return String(w.q("SELECT id FROM prc_party_tier WHERE party_id = ? AND valid_from_date = ? AND voided_at IS NULL", ORG, tuNgay)[0].id);
  };
  const daNgung = await gan(ta2, "2026-09-01", "2026-09-30");
  const dangAp = await gan(ta2, "2026-10-01", "2026-10-31");
  const sapAp = await gan(ta3, "2026-11-01");
  const truoc = (await ok(w.call("GET", `/api/pricing/ho-so/${ORG}/hoa-hong`, { as: KT }), 200)).json;
  assert.equal(truoc.mucRieng.id, dangAp, "mucRieng = lần gắn đang áp hôm nay");
  // Sửa lần SẮP áp (chưa có đơn) ⇒ huỷ–thay, giữ ngày bắt đầu 01/11.
  assert.deepEqual((await ok(xem(w, "muc-rieng", sapAp), 200)).json, { homNay: HN, duong: "HUY_THAY" });
  await ok(sua(w, "muc-rieng", sapAp, { muc: ta1, tuNgay: "2026-11-01", lyDo: LY_DO }), 200, "sửa lần sắp áp");
  const thay = String(w.q("SELECT id FROM prc_party_tier WHERE replaces_id = ?", sapAp)[0].id);
  const sau = (await ok(w.call("GET", `/api/pricing/ho-so/${ORG}/hoa-hong`, { as: KT }), 200)).json;
  assert.deepEqual(sau.mucRieng, truoc.mucRieng, "mucRieng không đổi");
  const muc = (code: string, ten: string) => ({ code, ten, dangBat: true });
  assert.deepEqual(sau.ganRieng, [
    { id: thay, muc: muc(ta1, "TA1"), tuNgay: "2026-11-01", denNgay: null, conHieuLuc: false, daHuy: false },
    { id: sapAp, muc: muc(ta3, "TA3"), tuNgay: "2026-11-01", denNgay: null, conHieuLuc: false, daHuy: true },
    { id: dangAp, muc: muc(ta2, "TA2"), tuNgay: "2026-10-01", denNgay: "2026-10-31", conHieuLuc: true, daHuy: false },
    { id: daNgung, muc: muc(ta2, "TA2"), tuNgay: "2026-09-01", denNgay: "2026-09-30", conHieuLuc: false, daHuy: false },
  ], "lịch sử: không lý do sửa, không mã dòng thay (Bán hàng cũng đọc khối này)");
  assert.ok(!JSON.stringify(sau).includes(LY_DO), "khối hồ sơ không mang lý do sửa ở bất kỳ trường nào");
  assert.deepEqual([dongRieng(w, thay).replaces_id, dongRieng(w, thay).change_reason], [sapAp, LY_DO], "liên kết thay + lý do vẫn nằm trong CSDL");
  // Thử tra hôm nay vẫn theo lần đang áp; từ 01/11 theo lần thay, không bao giờ theo lần đã huỷ.
  assert.equal((await thuTra(w)).muc.tyLeBp, 1200);
  assert.equal((await thuTra(w, "2026-11-01")).muc.tyLeBp, 1000);
  // Phản hồi của lệnh Sửa / Ngừng / Gắn dùng chung hàm khối ⇒ cũng mang lịch sử.
  const r = await ok(w.call("POST", `/api/pricing/muc-rieng/${dangAp}/ket-thuc`, { as: KT, body: { denNgay: "2026-10-30" } }), 200, "ngừng sớm lần đang áp");
  assert.deepEqual(r.json.ganRieng.map((g: { id: string }) => g.id), [thay, sapAp, dangAp, daNgung]);
  batBienSach(w);
});

// Người kiểm độc lập N5 (NÊN SỬA 2): bài trên không bắt được việc đưa LỊCH SỬ vào phần tóm tắt (`tomTatHoaHongHoSo`) — `mucRieng` vẫn đúng nhờ vòng tìm lại, nhưng một gắn
// riêng ĐÃ HUỶ còn trong khoảng ngày hôm nay sẽ lặng lẽ tắt cảnh báo «hai loại theo hai chính sách» (`xungDot`). Ở đây hồ sơ mang hai loại theo hai chính sách khác nhau,
// gắn riêng bị huỷ–thay sang ngày sau ⇒ hôm nay KHÔNG có gắn riêng ⇒ cảnh báo phải bật.
test("N5 (R4): gắn riêng đã huỷ không che cảnh báo «hai loại theo hai chính sách» của khối hồ sơ (phần tóm tắt chỉ đọc câu tra)", async (t) => {
  dongHo(t);
  const w = setup();
  const loai1 = await themLoai(w, "Lễ tân");
  const loai2 = await themLoai(w, "Hướng dẫn");
  const ta1 = await taoMuc(w, "TA1", 1000);
  const ta2 = await taoMuc(w, "TA2", 1200);
  const ta3 = await taoMuc(w, "TA3", 1500);
  await ganLoai(w, loai1, ta1, "2026-01-01");
  await ganLoai(w, loai2, ta2, "2026-01-01");
  const rieng = await ganRieng(w, ta3, "2026-10-01");
  assert.equal((await ok(w.call("GET", `/api/pricing/ho-so/${ORG}/hoa-hong`, { as: KT }), 200)).json.xungDot, false, "có gắn riêng đang áp ⇒ không xung đột");
  await ok(sua(w, "muc-rieng", rieng, { muc: ta3, tuNgay: "2026-11-01", lyDo: LY_DO }), 200, "huỷ–thay gắn riêng sang 01/11");
  const khoi = (await ok(w.call("GET", `/api/pricing/ho-so/${ORG}/hoa-hong`, { as: KT }), 200)).json;
  assert.deepEqual([khoi.mucRieng, khoi.xungDot], [null, true], "hôm nay không còn gắn riêng ⇒ cảnh báo hai chính sách bật lại");
  assert.equal(khoi.ganRieng.find((g: { id: string }) => g.id === rieng)?.daHuy, true, "gắn đã huỷ chỉ nằm trong lịch sử");
});

test("cảnh báo «loại còn dòng riêng» khi gắn loại không tính dòng mức đã huỷ", async (t) => {
  dongHo(t);
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  const ta1 = await taoMuc(w, "TA1", 1000);
  const dongLoai = await themDongLoai(w, loai, 2000, "2027-01-01", "2027-12-31");
  await ok(sua(w, "hoa-hong", dongLoai, { kieu: "RATE", tyLeBp: 2000, tuNgay: "2028-01-01", lyDo: LY_DO }), 200, "huỷ–thay dòng riêng của loại sang 2028");
  const r = await ok(w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai, muc: ta1, tuNgay: "2027-01-01", denNgay: "2027-06-30" } }), 201, "gắn loại 2027");
  assert.deepEqual(r.json.dongRieng, [], "dòng đã huỷ (2027) không gây cảnh báo; dòng thay bắt đầu 2028, ngoài khoảng gắn");
});

// Người kiểm độc lập 29/10 (N3): «đã chụp» của gắn tính cả hai ĐẦU khoảng ngày (Q1). Ca thật hay gặp: gắn bắt đầu hôm nay, đơn xác nhận ngay hôm nay — đếm hụt ⇒ huỷ được gắn đã có đơn.
test("Q1 biên ngày: đơn chụp đúng NGÀY ĐẦU hoặc NGÀY CUỐI của lần gắn vẫn là «đã có đơn» (gắn loại, gắn đối tác)", async (t) => {
  dongHo(t);
  const coDon = async (duong: "muc-ta/gan" | "muc-rieng", dau: string, cuoi?: string) => {
    assert.ok(duong === "muc-ta/gan" || cuoi === undefined, "ca gắn riêng chỉ thử ngày đầu");
    const w = setup();
    const loai = await themLoai(w, "Lễ tân");
    const ta1 = await taoMuc(w, "TA1", 1000);
    const id = duong === "muc-ta/gan" ? await ganLoai(w, loai, ta1, dau, cuoi) : (await ganLoai(w, loai, await taoMuc(w, "TA0", 500), "2026-01-01"), await ganRieng(w, ta1, dau));
    const don = await xacNhan(w);
    assert.equal(chup(w, don)[0].commission_rate_bp, 1000, `${duong}: bản chụp hôm nay theo lần gắn đang thử`);
    return xem(w, duong, id);
  };
  assert.deepEqual((await ok(coDon("muc-ta/gan", HN), 200)).json, { homNay: HN, duong: "TU_NGAY", tuNgaySomNhat: "2026-10-30", denNgayToiDa: null }, "gắn loại bắt đầu hôm nay");
  assert.deepEqual((await ok(coDon("muc-rieng", HN), 200)).json, { homNay: HN, duong: "TU_NGAY", tuNgaySomNhat: "2026-10-30", denNgayToiDa: null }, "gắn riêng bắt đầu hôm nay");
  const r = await coDon("muc-ta/gan", "2026-10-01", HN);
  assert.equal(r.status, 400, `gắn loại kết thúc hôm nay, đơn chụp hôm nay ⇒ không còn ngày để sửa (không phải huỷ–thay): ${r.text}`);
  assert.match(r.json.error.message, /không còn ngày nào để sửa/);
});

test("tiêu chí 5 (Q4, đường thật): đơn chụp hôm nay ⇒ Ngừng tới hôm qua và Đổi từ hôm nay bị từ chối ở dòng mức, gắn loại, gắn riêng; Ngừng hôm nay / Đổi từ mai được; R-PRC-7 sạch", async (t) => {
  dongHo(t);
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  const dong = await themDongLoai(w, loai, 1000, "2026-10-01");
  const d1 = await xacNhan(w);
  const homQua = "2026-10-28";
  const cauNgung = "Đã có đơn dùng mức này tới ngày 29/10/2026 — ngày kết thúc sớm nhất là 29/10/2026.";
  const n1 = await w.call("POST", `/api/pricing/hoa-hong/${dong}/dong`, { as: KT, body: { denNgay: homQua } });
  assert.deepEqual([n1.status, n1.json.error.message], [400, cauNgung]);
  const o1 = await w.call("POST", `/api/pricing/hoa-hong/${dong}/doi`, { as: KT, body: { kieu: "RATE", tyLeBp: 1200, tuNgay: HN } });
  assert.deepEqual([o1.status, o1.json.error.message], [400, "Đã có đơn dùng mức này tới ngày 29/10/2026 — mức mới chỉ áp được từ ngày 30/10/2026."]);
  await ok(w.call("POST", `/api/pricing/hoa-hong/${dong}/doi`, { as: KT, body: { kieu: "RATE", tyLeBp: 1200, tuNgay: "2026-10-30" } }), 200, "đổi từ mai");
  assert.deepEqual(chup(w, d1).map((x) => x.commission_rule_id), [dong]);

  // Gắn loại: dòng riêng của loại ngừng hẳn (để đơn đi theo chính sách), rồi gắn TA1 từ 01/10, đơn chụp hôm nay.
  const w2 = setup();
  const loai2 = await themLoai(w2, "Lễ tân");
  const ta1 = await taoMuc(w2, "TA1", 1000);
  const ta2 = await taoMuc(w2, "TA2", 1200);
  const gan = await ganLoai(w2, loai2, ta1, "2026-10-01");
  await xacNhan(w2);
  const n2 = await w2.call("POST", `/api/pricing/muc-ta/gan/${gan}/ket-thuc`, { as: KT, body: { denNgay: homQua } });
  assert.deepEqual([n2.status, n2.json.error.message], [400, cauNgung]);
  const o2 = await w2.call("POST", `/api/pricing/muc-ta/gan/${gan}/doi`, { as: KT, body: { muc: ta2, tuNgay: HN } });
  assert.equal(o2.status, 400, o2.text);
  await ok(w2.call("POST", `/api/pricing/muc-ta/gan/${gan}/ket-thuc`, { as: KT, body: { denNgay: HN } }), 200, "ngừng gắn hôm nay");
  // Gắn riêng: đơn thứ hai chụp hôm nay theo gắn riêng TA2.
  const rieng = await ganRieng(w2, ta2, "2026-10-01");
  await xacNhan(w2);
  const n3 = await w2.call("POST", `/api/pricing/muc-rieng/${rieng}/ket-thuc`, { as: KT, body: { denNgay: homQua } });
  assert.deepEqual([n3.status, n3.json.error.message], [400, cauNgung]);
  await ok(w2.call("POST", `/api/pricing/muc-rieng/${rieng}/ket-thuc`, { as: KT, body: { denNgay: HN } }), 200, "ngừng gắn riêng hôm nay");
  batBienSach(w);
  batBienSach(w2);
});
