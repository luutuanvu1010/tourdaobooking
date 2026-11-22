// ADR-0209 (chủ duyệt 2026-11-15) — CẤP ĐỘ ĐẠI LÝ MẶC ĐỊNH cho đối tác tự đăng ký, CHẠY THẬT trên SQLite (khung tests/audit/harness.mjs): đặt chính sách qua route,
// lô duyệt phiếu (route duyệt thật, gốc lắp ráp ghép câu 8 của pricing) ghi đúng MỘT cấp riêng, bốn ca «không làm hỏng lô», Nhân sự đổi vai, đổi chính sách sau duyệt,
// đơn đầu tiên tính hoa hồng đúng cấp đã áp qua ĐƯỜNG XÁC NHẬN THẬT. Phiếu gieo bằng SQL + bước xác minh bằng route (khuôn duyet-route.test.ts). Mọi tên, số, tiền là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "44444444-4444-4444-8444-444444444444";
const SM = "55555555-5555-4555-8555-555555555555"; // Quản lý bán hàng (kèm Bán hàng — ADR-0169)
const DTAC = "66666666-6666-4666-8666-666666666666";
const HR = "77777777-7777-4777-8777-777777777777";
const AT = "2026-11-10T00:00:00.000Z";
const DT = "0912 345 678";
const DT_KHOA = "0912345678";
const EMAIL = "khach@example.com";
const MUC = ["ROLE", "CALLED", "HO_TEN", "NGAY_SINH", "CCCD"];
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
let dem = 0;
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any; headers: Headers };

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [KT, "0900000002", "Lan Kế Toán", ["ACCOUNTING"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]],
    [SUP, "0900000004", "Chủ", ["SUPER_ADMIN"]], [SM, "0900000005", "Quản Lý Bán", ["SALES", "SALES_MANAGER"]], [DTAC, "0900000006", "Đối Tác Một", ["PARTNER"]],
    [HR, "0900000007", "Nhân Sự", ["HR"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  if (w.q("SELECT 1 FROM pty_privacy_policy LIMIT 1").length === 0) {
    w.sqlite.exec(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol', 1, 'thử', 'thử', '${AT}', '${AT}', '${SUP}', '${AT}', '${SUP}')`);
  }
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => {
  const r = await p;
  assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`);
  return r;
};
const dem1 = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);

// ---- cấp độ đại lý (route Kế toán sẵn có) ----
async function taoMuc(w: W, ten: string): Promise<string> {
  return (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten } }), 201, `tạo cấp ${ten}`)).json.muc.code as string;
}
async function dongTyLe(w: W, code: string, tyLeBp: number): Promise<string> {
  return (await ok(w.call("POST", `/api/pricing/muc-ta/${code}/dong`, { as: KT, body: { phamVi: "ALL", kieu: "RATE", tuNgay: "2026-01-01", tyLeBp } }), 201, `dòng ${code}`)).json.dong.id as string;
}
/** TA1 10% gắn cho cả vai Hướng dẫn viên độc lập; TA2 12% chưa gắn cho ai (để bài phân biệt «có câu 8» với «không có»). */
async function nen(w: W) {
  const ta1 = await taoMuc(w, "TA1");
  const ta2 = await taoMuc(w, "TA2");
  const d1 = await dongTyLe(w, ta1, 1000);
  const d2 = await dongTyLe(w, ta2, 1200);
  await ok(w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai: "GUIDE_FREELANCE", muc: ta1, tuNgay: "2026-01-01" } }), 201, "gắn vai");
  return { ta1, ta2, d1, d2 };
}

// ---- chính sách cấp mặc định (route mới) ----
const xemCs = (w: W, as: string) => w.call("GET", "/api/pricing/cap-mac-dinh", { as });
/** Dòng hiệu lực mà người đặt đang thấy cho `loai` (khoá lạc quan của lệnh đặt). */
async function hienHanh(w: W, loai: string): Promise<string | null> {
  const r = await ok(xemCs(w, SUP), 200, "xem chính sách");
  return r.json.loai.find((l: any) => l.code === loai)?.hienHanh?.id ?? null;
}
const datCs = async (w: W, as: string, loai: string, muc: string | null, dangHieuLuc?: string | null) =>
  w.call("POST", "/api/pricing/cap-mac-dinh", { as, body: { loai, muc, dangHieuLuc: dangHieuLuc === undefined ? await hienHanh(w, loai) : dangHieuLuc } });

// ---- phiếu đăng ký (khuôn duyet-route.test.ts) ----
function phieu(w: W, role = "GUIDE_FREELANCE"): string {
  const id = `DK_${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(dem % 18, (dem % 18) + 8)}`;
  dem++;
  w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', ?, ?, ?)").run(id, role, AT, AT);
  w.sqlite.prepare("INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES (?, ?, 'EMAIL', ?, ?, ?, ?)").run(`ident-${id}`, id, `khach-${id.toLowerCase()}@example.com`, EMAIL, AT, AT);
  w.sqlite.prepare(`INSERT INTO dk_submission (id, registration_id, version, family_name, given_name, birth_date, address_value, phone_value, phone_key, document_type_code, document_number, number_key, issued_date, issued_place,
      expiry_date, policy_id, consented_at, created_at, updated_at) VALUES (?, ?, 1, 'Phạm', 'Thử Nghiệm', '1990-05-06', '12 Đường Thử, Nha Trang', ?, ?, 'CCCD', '079 000 000 111', '079000000111', '2021-01-02', 'Cục thử', '2040-01-02', (SELECT id FROM pty_privacy_policy LIMIT 1), ?, ?, ?)`)
    .run(`sub-${id}`, id, DT, DT_KHOA, AT, AT, AT);
  w.sqlite.prepare("UPDATE dk_registration SET current_version = 1, submitted_at = ? WHERE id = ?").run(AT, id);
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CHO_XAC_MINH' WHERE id = ?").run(id);
  return id;
}
async function xacMinh(w: W, id: string, hoSo: any = { kieu: "MOI" }) {
  for (const m of MUC) await ok(w.call("POST", `/api/dang-ky/phieu/${id}/ket-luan`, { as: SM, body: { phienBan: 1, muc: m, dat: true } }), 200, m);
  await ok(w.call("POST", `/api/dang-ky/phieu/${id}/dat`, { as: SM, body: { phienBan: 1, hoSo } }), 200, "đạt");
}
const duyet = (w: W, id: string, roleCode = "GUIDE_FREELANCE", as = HR) => w.call("POST", `/api/dang-ky/phieu/${id}/duyet`, { as, body: { roleCode, phienBan: 1 } });
/** Phiếu mới → xác minh → duyệt (200) ⇒ mã hồ sơ của tài khoản vừa mở. */
async function duyetMoi(w: W, o: { xin?: string; chon?: string; hoSo?: any } = {}): Promise<string> {
  const id = phieu(w, o.xin);
  await xacMinh(w, id, o.hoSo);
  await ok(duyet(w, id, o.chon ?? o.xin ?? "GUIDE_FREELANCE"), 200, "duyệt");
  return w.q("SELECT party_id FROM staff WHERE phone = ?", DT_KHOA)[0].party_id as string;
}
const capRieng = (w: W, partyId: string) =>
  w.q("SELECT tier_code, valid_from_date, valid_to_date, created_by, voided_at FROM prc_party_tier WHERE party_id = ? ORDER BY rowid", partyId).map((r: any) => ({ ...r }));
/** Hồ sơ cá nhân có sẵn mang vai Hướng dẫn viên độc lập (gắn qua route Danh bạ), chưa có tài khoản. */
async function hoSoCoSan(w: W): Promise<string> {
  const id = "dda00000-0000-4000-8000-0000000000a1";
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Người Có Sẵn', 1, ?, ?)").run(id, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, 'Người Có Sẵn', ?, ?)").run(id, AT, AT);
  await ok(w.call("POST", `/api/parties/${id}/roles`, { as: ADM, body: { roleTypeCode: "GUIDE_FREELANCE" } }), 201, "gắn vai hồ sơ có sẵn");
  return id;
}

// ---- đơn (khuôn gan-rieng-route.test.ts) ----
let seq = 0;
function nhap(w: W, booker: string, tong = 2_000_000): string {
  const id = `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, booker, AT, AT);
  const s = `${id}-s0`;
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'ZA1', 'Tour đảo', 'perPax', 1, ?)`).run(s, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'ZA1', 'adult', 'Người lớn', 1, ?, ?, ?)`).run(`${s}-i`, id, s, tong, tong, tong);
  return id;
}

// =============================================================================================================================================

test("(1) Quyền đặt: Quản lý bán hàng, Quản trị, Toàn quyền ⇒ 200; Kế toán, Bán hàng, Nhân sự, Đối tác ⇒ 403 không thêm dòng. Xem: Bán hàng 200, Đối tác 403", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  for (const [as, muc] of [[SM, ta2], [ADM, ta1], [SUP, null]] as const) await ok(datCs(w, as, "GUIDE_FREELANCE", muc), 200, `đặt bởi ${as}`);
  const n = dem1(w, "SELECT count(*) n FROM prc_signup_tier_policy");
  assert.equal(n, 3);
  for (const as of [KT, SALES, HR, DTAC]) assert.equal((await datCs(w, as, "GUIDE_FREELANCE", ta1, null)).status, 403, as);
  assert.equal(dem1(w, "SELECT count(*) n FROM prc_signup_tier_policy"), n);
  const xem = await ok(xemCs(w, SALES), 200, "Bán hàng xem");
  assert.ok(xem.json.loai.some((l: any) => l.code === "GUIDE_FREELANCE"));
  assert.ok(xem.json.cap.some((c: any) => c.code === ta1 && c.ten === "TA1"));
  assert.equal((await xemCs(w, DTAC)).status, 403);
});

test("(2) Đặt chính sách: nhật ký mang loại, cấp cũ và cấp mới; khoá lạc quan sai ⇒ 409 không thêm dòng; cấp đang khoá ⇒ 409; vai lạ ⇒ 400", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta1), 200);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", null), 200);
  const nk = w.q("SELECT detail, staff_id FROM audit_log WHERE action = 'prc_signup_tier_set' ORDER BY rowid");
  assert.deepEqual(nk.map((x: any) => x.detail), [
    "Hướng dẫn viên độc lập (GUIDE_FREELANCE) · Theo cấp của vai trò → TA1",
    "Hướng dẫn viên độc lập (GUIDE_FREELANCE) · TA1 → TA2",
    "Hướng dẫn viên độc lập (GUIDE_FREELANCE) · TA2 → Theo cấp của vai trò",
  ]);
  assert.deepEqual(nk.map((x: any) => x.staff_id), [SM, SM, SM]);
  const n = dem1(w, "SELECT count(*) n FROM prc_signup_tier_policy");
  assert.equal((await datCs(w, SM, "GUIDE_FREELANCE", ta1, null)).status, 409, "dòng đã đổi từ lúc mở");
  assert.equal(dem1(w, "SELECT count(*) n FROM prc_signup_tier_policy"), n);
  await ok(w.call("POST", `/api/pricing/muc-ta/${ta1}/tat`, { as: KT }), 200, "khoá TA1");
  assert.equal((await datCs(w, SM, "GUIDE_FREELANCE", ta1)).status, 409, "cấp đang khoá");
  assert.equal((await datCs(w, SM, "SALES_STAFF", ta2)).status, 400, "vai nội bộ");
  assert.equal(dem1(w, "SELECT count(*) n FROM prc_signup_tier_policy"), n);
});

test("(2b) Hai người đặt cùng lúc: người kia ghi xong NGAY TRƯỚC lô của mình (đã qua kiểm trước) ⇒ 409, không thêm dòng, không dòng nhật ký nói sai cấp cũ", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta1), 200);
  const thay = await hienHanh(w, "GUIDE_FREELANCE");
  let daChen = 0;
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /INSERT INTO prc_signup_tier_policy/.test(s.sql)), async () => {
    daChen++;
    await ok(datCs(w, ADM, "GUIDE_FREELANCE", null, thay), 200, "Quản trị đặt trước");
  });
  const r = await datCs(w, SM, "GUIDE_FREELANCE", ta2, thay);
  assert.equal(daChen, 1);
  assert.equal(r.status, 409, r.text);
  assert.equal(dem1(w, "SELECT count(*) n FROM prc_signup_tier_policy"), 2);
  assert.deepEqual(w.q("SELECT detail FROM audit_log WHERE action = 'prc_signup_tier_set' ORDER BY rowid").map((x: any) => x.detail),
    ["Hướng dẫn viên độc lập (GUIDE_FREELANCE) · Theo cấp của vai trò → TA1", "Hướng dẫn viên độc lập (GUIDE_FREELANCE) · TA1 → Theo cấp của vai trò"]);
});

test("(3) Trigger: chính sách không sửa, không xoá; không chèn cấp đang khoá hay loại không được hưởng", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta1), 200);
  assert.throws(() => w.sqlite.exec(`UPDATE prc_signup_tier_policy SET tier_code = '${ta2}'`), /prc_append_only/);
  assert.throws(() => w.sqlite.exec("DELETE FROM prc_signup_tier_policy"), /prc_append_only/);
  w.sqlite.exec(`UPDATE prc_rate_tier SET active = 0 WHERE code = '${ta2}'`);
  assert.throws(() => w.sqlite.exec(`INSERT INTO prc_signup_tier_policy (id, role_type_code, tier_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('x1', 'GUIDE_FREELANCE', '${ta2}', '2030-01-01T00:00:00.000Z', '${AT}', '${SUP}', '${AT}', '${SUP}')`), /prc_tier_inactive/);
  w.sqlite.exec("UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = 'COLLABORATOR'");
  assert.throws(() => w.sqlite.exec(`INSERT INTO prc_signup_tier_policy (id, role_type_code, tier_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('x2', 'COLLABORATOR', '${ta1}', '2030-01-01T00:00:00.000Z', '${AT}', '${SUP}', '${AT}', '${SUP}')`), /prc_tier_target/);
});

test("(4) Lô duyệt ghi ĐÚNG MỘT cấp riêng = cấp mặc định lúc duyệt, từ ngày duyệt, người tạo = người duyệt; nhật ký mang mã cấp, không dữ liệu cá nhân", async () => {
  const w = setup();
  const { ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  const party = await duyetMoi(w);
  assert.deepEqual(capRieng(w, party), [{ tier_code: ta2, valid_from_date: vnHomNay(), valid_to_date: null, created_by: HR, voided_at: null }]);
  const nk = w.q("SELECT detail, staff_id FROM audit_log WHERE action = 'prc_party_tier_set'");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].staff_id, HR);
  assert.ok(nk[0].detail.includes(ta2) && nk[0].detail.includes("TA2"), nk[0].detail);
  const toanBo = JSON.stringify(w.q("SELECT detail FROM audit_log"));
  for (const bi of [DT_KHOA, DT, EMAIL, "079000000111", "1990-05-06", "Đường Thử"]) assert.ok(!toanBo.includes(bi), `nhật ký lộ ${bi}`);
});

test("(5) Chưa đặt chính sách, hoặc «Theo cấp của vai trò» ⇒ lô duyệt thành công, không dòng cấp riêng", async () => {
  const w = setup();
  await nen(w);
  const a = await duyetMoi(w);
  assert.deepEqual(capRieng(w, a), []);
  const w2 = setup();
  const { ta2 } = await nen(w2);
  await ok(datCs(w2, SM, "GUIDE_FREELANCE", ta2), 200);
  await ok(datCs(w2, SM, "GUIDE_FREELANCE", null), 200);
  const b = await duyetMoi(w2);
  assert.deepEqual(capRieng(w2, b), []);
  assert.equal(dem1(w2, "SELECT count(*) n FROM audit_log WHERE action = 'prc_party_tier_set'"), 0);
});

test("(6) Hồ sơ có sẵn đã có cấp riêng đang áp dụng, không thời hạn ⇒ lô thành công, dòng cũ nguyên, không dòng mới", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  const goc = await hoSoCoSan(w);
  await ok(w.call("POST", `/api/pricing/ho-so/${goc}/muc-rieng`, { as: KT, body: { muc: ta1, tuNgay: "2026-01-01" } }), 201, "cấp riêng đang áp dụng");
  const truoc = capRieng(w, goc);
  assert.equal(await duyetMoi(w, { hoSo: { kieu: "CO_SAN", partyId: goc } }), goc);
  assert.deepEqual(capRieng(w, goc), truoc);
  assert.equal(truoc.length, 1);
});

test("(6a) KHÔNG LÀM HỎNG LÔ — hồ sơ có sẵn đã có cấp riêng bắt đầu từ ngày mai ⇒ lô thành công, cấp cũ nguyên, không dòng mới", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  const goc = await hoSoCoSan(w);
  await ok(w.call("POST", `/api/pricing/ho-so/${goc}/muc-rieng`, { as: KT, body: { muc: ta1, tuNgay: inDays(1) } }), 201, "cấp riêng từ mai");
  const truoc = capRieng(w, goc);
  assert.equal(await duyetMoi(w, { hoSo: { kieu: "CO_SAN", partyId: goc } }), goc);
  assert.deepEqual(capRieng(w, goc), truoc);
  assert.equal(dem1(w, "SELECT count(*) n FROM audit_log WHERE action = 'prc_party_tier_set'"), 1, "chỉ dòng nhật ký của lệnh gắn riêng của Kế toán");
});

test("(6b) KHÔNG LÀM HỎNG LÔ — hồ sơ có sẵn có cấp riêng đóng vào một ngày sắp tới ⇒ lô thành công, không dòng mới", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  const goc = await hoSoCoSan(w);
  await ok(w.call("POST", `/api/pricing/ho-so/${goc}/muc-rieng`, { as: KT, body: { muc: ta1, tuNgay: "2026-01-01", denNgay: inDays(5) } }), 201, "cấp riêng đóng sắp tới");
  const truoc = capRieng(w, goc);
  assert.equal(await duyetMoi(w, { hoSo: { kieu: "CO_SAN", partyId: goc } }), goc);
  assert.deepEqual(capRieng(w, goc), truoc);
});

test("(6c) KHÔNG LÀM HỎNG LÔ — cấp mặc định bị khoá sau khi đặt ⇒ lô thành công, không dòng cấp riêng", async () => {
  const w = setup();
  const { ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  await ok(w.call("POST", `/api/pricing/muc-ta/${ta2}/tat`, { as: KT }), 200, "khoá TA2");
  const party = await duyetMoi(w);
  assert.deepEqual(capRieng(w, party), []);
});

test("(6d) KHÔNG LÀM HỎNG LÔ — vai trò bị tắt khỏi danh sách được hưởng sau khi đặt ⇒ lô thành công, không dòng cấp riêng", async () => {
  const w = setup();
  const { ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  w.sqlite.exec("UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = 'GUIDE_FREELANCE'"); // vai có sẵn: route tắt loại chỉ nhận loại do người dùng thêm
  const party = await duyetMoi(w);
  assert.deepEqual(capRieng(w, party), []);
});

test("(6e) Vai người duyệt chọn bị tắt khỏi danh sách được hưởng, dù hồ sơ có sẵn còn một vai được hưởng khác ⇒ lô thành công, không dòng cấp riêng", async () => {
  const w = setup();
  const { ta2 } = await nen(w);
  await ok(datCs(w, SM, "COLLABORATOR", ta2), 200);
  const goc = await hoSoCoSan(w); // đang mở vai Hướng dẫn viên độc lập (được hưởng, còn bật)
  w.sqlite.exec("UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = 'COLLABORATOR'");
  const id = phieu(w);
  await xacMinh(w, id, { kieu: "CO_SAN", partyId: goc });
  await ok(duyet(w, id, "COLLABORATOR"), 200, "duyệt vai Cộng tác viên");
  assert.deepEqual(capRieng(w, goc), []);
});

test("(6f) Dòng chính sách hiệu lực LÚC BẤM đổi sau khi gốc lắp ráp đọc, trước khi lô chạy (lệnh đặt lấy mốc trước lúc bấm nhưng ghi sau) ⇒ lô thành công, KHÔNG ghi cấp, nhật ký không ghi cấp sai", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  const cu = w.q("SELECT valid_from_at FROM prc_signup_tier_policy")[0].valid_from_at as string;
  const id = phieu(w);
  await xacMinh(w, id);
  await new Promise((r) => setTimeout(r, 5)); // lúc bấm duyệt sau mốc dòng cũ ít nhất vài phần nghìn giây
  let daChen = 0;
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /INSERT INTO dk_decision/.test(s.sql)), async () => {
    daChen++;
    const moc = new Date(Date.parse(cu) + 1).toISOString(); // sau dòng cũ, trước lúc bấm
    w.sqlite.prepare(`INSERT INTO prc_signup_tier_policy (id, role_type_code, tier_code, valid_from_at, created_at, created_by, updated_at, updated_by)
      VALUES ('cs-chen', 'GUIDE_FREELANCE', ?, ?, ?, ?, ?, ?)`).run(ta1, moc, moc, ADM, moc, ADM);
  });
  await ok(duyet(w, id), 200, "duyệt");
  assert.equal(daChen, 1);
  const party = w.q("SELECT party_id FROM staff WHERE phone = ?", DT_KHOA)[0].party_id;
  assert.deepEqual(capRieng(w, party), []);
  assert.equal(dem1(w, "SELECT count(*) n FROM audit_log WHERE action = 'prc_party_tier_set'"), 0);
});

test("(6g) Chính sách đặt SAU lúc bấm duyệt (trước khi lô chạy) ⇒ lô ghi cấp hiệu lực lúc bấm, nhật ký cùng cấp đó", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  const id = phieu(w);
  await xacMinh(w, id);
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /INSERT INTO dk_decision/.test(s.sql)), async () => {
    await new Promise((r) => setTimeout(r, 2));
    await ok(datCs(w, ADM, "GUIDE_FREELANCE", ta1), 200, "Quản trị đổi sang TA1");
  });
  await ok(duyet(w, id), 200, "duyệt");
  const party = w.q("SELECT party_id FROM staff WHERE phone = ?", DT_KHOA)[0].party_id;
  assert.deepEqual(capRieng(w, party).map((r: any) => r.tier_code), [ta2]);
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'prc_party_tier_set'");
  assert.equal(nk.length, 1);
  assert.ok(nk[0].detail.includes(ta2), nk[0].detail);
});

test("(7) Đổi chính sách SAU khi duyệt ⇒ cấp riêng đã ghi không đổi", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  const party = await duyetMoi(w);
  const truoc = capRieng(w, party);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta1), 200);
  await ok(datCs(w, ADM, "GUIDE_FREELANCE", null), 200);
  assert.deepEqual(capRieng(w, party), truoc);
  assert.equal(truoc[0].tier_code, ta2);
});

test("(8) Nhân sự đổi vai lúc duyệt (xin Hướng dẫn viên độc lập, chọn Cộng tác viên) ⇒ cấp theo chính sách của vai MỚI", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta1), 200);
  await ok(datCs(w, SM, "COLLABORATOR", ta2), 200);
  const party = await duyetMoi(w, { xin: "GUIDE_FREELANCE", chon: "COLLABORATOR" });
  assert.deepEqual(capRieng(w, party).map((r: any) => r.tier_code), [ta2]);
});

test("(9) Đơn đầu tiên của đối tác vừa duyệt (ĐƯỜNG XÁC NHẬN THẬT) chụp dòng của cấp đã áp: TA2 12% ⇒ 240.000, không phải TA1 10% của vai", async () => {
  const w = setup();
  const { ta2, d2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  const party = await duyetMoi(w);
  const id = nhap(w, party);
  await ok(w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } }), 200, "xác nhận");
  const chup = w.q("SELECT commission_status, commission_rule_id, commission_rate_bp FROM ord_service_terms WHERE order_id = ?", id);
  assert.deepEqual([chup[0].commission_status, chup[0].commission_rule_id, chup[0].commission_rate_bp], ["SET", d2, 1200]);
  const tm = await ok(w.call("GET", `/api/orders/${id}/thuong-mai`, { as: KT }), 200, "thương mại");
  assert.equal(tm.json.vanPhong.dong[0].hoaHong, 240_000);
});

// ---- «Cấp sẽ áp» và kết quả cấp của lệnh duyệt (ADR-0209 Đ3, Đ4; Task 12, mục I-1 và m-2 của bài kiểm Task 11) ----
const seAp = (w: W, loai: string, hoSo?: string, as = ADM) => w.call("GET", `/api/pricing/cap-mac-dinh/se-ap?loai=${loai}${hoSo ? `&hoSo=${hoSo}` : ""}`, { as });

test("(10) Xem trước «cấp sẽ áp»: Quản trị thấy tên cấp; Nhân sự, Đối tác ⇒ 403; tham số sai ⇒ 400", async () => {
  const w = setup();
  const { ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  const r = await ok(seAp(w, "GUIDE_FREELANCE"), 200, "Quản trị xem trước");
  assert.deepEqual(r.json, { ap: true, cap: { code: ta2, ten: "TA2" }, lyDo: null, cau: null });
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal((await seAp(w, "GUIDE_FREELANCE", undefined, HR)).status, 403, "Nhân sự không giữ partner.commission.view");
  assert.equal((await seAp(w, "GUIDE_FREELANCE", undefined, DTAC)).status, 403, "Đối tác");
  assert.equal((await w.call("GET", "/api/pricing/cap-mac-dinh/se-ap?loai=a b", { as: ADM })).status, 400);
  assert.equal((await w.call("GET", "/api/pricing/cap-mac-dinh/se-ap?loai=GUIDE_FREELANCE&hoSo=%27x", { as: ADM })).status, 400);
});

test("(11) Lệnh duyệt trả kết quả cấp: Nhân sự KHÔNG thấy tên cấp; Toàn quyền thấy; nhật ký prc_party_tier_set trỏ đúng hồ sơ mới (m-2)", async () => {
  const w = setup();
  const { ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  const id = phieu(w);
  await xacMinh(w, id);
  const r = await ok(duyet(w, id), 200, "Nhân sự duyệt");
  assert.deepEqual(r.json.cap, { ap: true, cap: null, lyDo: null, cau: null });
  assert.ok(!r.text.includes("TA2") && !r.text.includes(ta2), "Nhân sự không thấy tên hay mã cấp");
  const party = w.q("SELECT party_id FROM staff WHERE phone = ?", DT_KHOA)[0].party_id;
  const nk = w.q("SELECT target_type, target_id FROM audit_log WHERE action = 'prc_party_tier_set'");
  assert.deepEqual(nk.map((x: any) => [x.target_type, x.target_id]), [["party", party]]);

  const w2 = setup();
  const n2 = await nen(w2);
  await ok(datCs(w2, SM, "GUIDE_FREELANCE", n2.ta2), 200);
  const id2 = phieu(w2);
  await xacMinh(w2, id2);
  const r2 = await ok(duyet(w2, id2, "GUIDE_FREELANCE", SUP), 200, "Toàn quyền duyệt (người xác minh là Quản trị)");
  assert.deepEqual(r2.json.cap, { ap: true, cap: { code: n2.ta2, ten: "TA2" }, lyDo: null, cau: null });
});

/** Mỗi ca dựng một thế giới, trả phiếu đã xác minh + hồ sơ đích (nếu gắn). Bài (12) so «cấp sẽ áp» với việc câu 8 THẬT có chèn hay không. */
const CA: { ten: string; lyDo: string | null; dung: (w: W) => Promise<{ id: string; hoSo?: string; vai?: string }> }[] = [
  { ten: "áp được", lyDo: null, dung: async (w) => { const { ta2 } = await nen(w); await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200); return { id: phieu(w) }; } },
  { ten: "chưa đặt chính sách", lyDo: "CHUA_DAT", dung: async (w) => { await nen(w); return { id: phieu(w) }; } },
  { ten: "«Theo cấp của vai trò»", lyDo: "CHUA_DAT", dung: async (w) => { const { ta2 } = await nen(w); await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200); await ok(datCs(w, SM, "GUIDE_FREELANCE", null), 200); return { id: phieu(w) }; } },
  { ten: "cấp mặc định bị khoá", lyDo: "CAP_TAT", dung: async (w) => { const { ta2 } = await nen(w); await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200); await ok(w.call("POST", `/api/pricing/muc-ta/${ta2}/tat`, { as: KT }), 200); return { id: phieu(w) }; } },
  { ten: "vai không còn được hưởng", lyDo: "VAI_KHONG_HUONG", dung: async (w) => {
    const { ta2 } = await nen(w); await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200); w.sqlite.exec("UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = 'GUIDE_FREELANCE'"); return { id: phieu(w) };
  } },
  { ten: "hồ sơ có sẵn đã có cấp riêng từ ngày mai", lyDo: "DA_CO_CAP_RIENG", dung: async (w) => {
    const { ta1, ta2 } = await nen(w); await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200); const goc = await hoSoCoSan(w);
    await ok(w.call("POST", `/api/pricing/ho-so/${goc}/muc-rieng`, { as: KT, body: { muc: ta1, tuNgay: inDays(1) } }), 201); return { id: phieu(w), hoSo: goc };
  } },
  { ten: "hồ sơ có sẵn có cấp riêng đã hết trước hôm nay", lyDo: null, dung: async (w) => {
    const { ta1, ta2 } = await nen(w); await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200); const goc = await hoSoCoSan(w);
    await ok(w.call("POST", `/api/pricing/ho-so/${goc}/muc-rieng`, { as: KT, body: { muc: ta1, tuNgay: "2026-01-01", denNgay: inDays(-1) } }), 201); return { id: phieu(w), hoSo: goc };
  } },
];

test("(12) «Cấp sẽ áp» trùng ĐÚNG kết quả thật của câu 8 ở từng ca; lệnh duyệt báo cùng lý do (câu không mang tên cấp)", async () => {
  for (const ca of CA) {
    const w = setup();
    const { id, hoSo } = await ca.dung(w);
    const truoc = await ok(seAp(w, "GUIDE_FREELANCE", hoSo), 200, `${ca.ten}: xem trước`);
    assert.equal(truoc.json.lyDo, ca.lyDo, `${ca.ten}: lý do xem trước`);
    assert.equal(truoc.json.ap, ca.lyDo === null, `${ca.ten}: ap`);
    if (ca.lyDo) assert.equal(typeof truoc.json.cau, "string");
    await xacMinh(w, id, hoSo ? { kieu: "CO_SAN", partyId: hoSo } : { kieu: "MOI" });
    const soTruoc = dem1(w, "SELECT count(*) n FROM prc_party_tier");
    const r = await ok(duyet(w, id), 200, `${ca.ten}: duyệt`);
    const daChen = dem1(w, "SELECT count(*) n FROM prc_party_tier") - soTruoc;
    assert.equal(daChen, ca.lyDo === null ? 1 : 0, `${ca.ten}: câu 8 thật`);
    assert.equal(r.json.cap.ap, daChen === 1, `${ca.ten}: kết quả lệnh duyệt khớp câu 8`);
    assert.equal(r.json.cap.lyDo, ca.lyDo, `${ca.ten}: lý do của lệnh duyệt`);
    assert.equal(r.json.cap.cau, truoc.json.cau, `${ca.ten}: cùng câu`);
  }
});

test("(13) Chính sách đổi giữa lúc bấm (câu 8 chèn 0 dòng dù dự đoán là áp) ⇒ lệnh duyệt báo VUA_DOI, không ghi cấp", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  const cu = w.q("SELECT valid_from_at FROM prc_signup_tier_policy")[0].valid_from_at as string;
  const id = phieu(w);
  await xacMinh(w, id);
  await new Promise((r) => setTimeout(r, 5));
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /INSERT INTO dk_decision/.test(s.sql)), async () => {
    const moc = new Date(Date.parse(cu) + 1).toISOString();
    w.sqlite.prepare(`INSERT INTO prc_signup_tier_policy (id, role_type_code, tier_code, valid_from_at, created_at, created_by, updated_at, updated_by)
      VALUES ('cs-chen', 'GUIDE_FREELANCE', ?, ?, ?, ?, ?, ?)`).run(ta1, moc, moc, ADM, moc, ADM);
  });
  const r = await ok(duyet(w, id), 200, "duyệt");
  assert.deepEqual(r.json.cap, { ap: false, cap: null, lyDo: "VUA_DOI", cau: "Cấp mặc định vừa đổi lúc duyệt nên chưa ghi cấp riêng." });
});

test("(14) Dự đoán «không áp» (cấp đang khoá) nhưng cấp được mở lại ngay trước lô và câu 8 chèn thật ⇒ lệnh duyệt báo ĐÃ ÁP kèm tên cấp vừa ghi (m-5)", async () => {
  const w = setup();
  const { ta2 } = await nen(w);
  await ok(datCs(w, SM, "GUIDE_FREELANCE", ta2), 200);
  await ok(w.call("POST", `/api/pricing/muc-ta/${ta2}/tat`, { as: KT }), 200, "khoá TA2");
  const id = phieu(w);
  await xacMinh(w, id);
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /INSERT INTO dk_decision/.test(s.sql)), async () => {
    w.sqlite.prepare("UPDATE prc_rate_tier SET active = 1 WHERE code = ?").run(ta2);
  });
  const r = await ok(duyet(w, id, "GUIDE_FREELANCE", SUP), 200, "duyệt");
  const party = w.q("SELECT party_id FROM staff WHERE phone = ?", DT_KHOA)[0].party_id;
  assert.deepEqual(capRieng(w, party).map((x: any) => x.tier_code), [ta2], "câu 8 chèn thật");
  assert.deepEqual(r.json.cap, { ap: true, cap: { code: ta2, ten: "TA2" }, lyDo: null, cau: null });
});
