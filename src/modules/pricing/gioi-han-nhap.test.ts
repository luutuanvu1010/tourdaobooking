// ADR-0161 Đ3, Đ4 (kế hoạch 2026-11-03-chinh-sach-chiet-khau-bon-truc, Task 1–2) — GIỚI HẠN NHẬP mức hoa hồng (trần phần trăm, bước số tiền) do Toàn quyền đổi được, áp ở máy chủ cho mọi route
// ghi mức có số mới; Task 2 thêm vế «mức vượt giá bán». Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Khuôn: muc-ta.test.ts, sua-muc-route.test.ts.
// Luật thuần: src/shared/gioi-han-nhap-muc.test.ts. Rào quét mọi đường ghi: ghi-muc-qua-cong.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SA = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666"; // Đối tác
const KP = "99999999-9999-4999-8999-999999999990"; // tài khoản lai: Kế toán + Đối tác
const AT = "2026-10-01T00:00:00.000Z";
const ORG = "dda00000-0000-4000-8000-0000000000c1";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [ADM, "0900000006", "Quản Trị", ["ADMIN"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]], [KP, "0900000011", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 1000000, 1, '2026-01-01', '2026-01-01')");
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
const nhatKy = (w: W, action: string): { detail: string; staff_id: string; target_type: string | null }[] => w.q("SELECT detail, staff_id, target_type FROM audit_log WHERE action = ? ORDER BY rowid", action);
const soDong = (w: W): number => dem(w, "SELECT count(*) AS n FROM prc_commission_rule");
const soNhatKy = (w: W): number => dem(w, "SELECT count(*) AS n FROM audit_log");

const docGH = (w: W, as = KT) => w.call("GET", "/api/pricing/gioi-han-nhap", { as });
const datGH = (w: W, body: Record<string, unknown>, as = SA) => w.call("POST", "/api/pricing/gioi-han-nhap", { as, body });
/** Đổi giới hạn bằng Toàn quyền, `tuLuc` lấy từ lần đọc ngay trước (đúng việc của hộp). */
async function doiGH(w: W, tranTyLeBp: number, buocTien: number): Promise<Res> {
  const hien = (await ok(docGH(w, SA), 200, "đọc giới hạn")).json;
  return ok(datGH(w, { tranTyLeBp, buocTien, tuLuc: hien.tuLuc }), 200, `đổi giới hạn ${tranTyLeBp}/${buocTien}`);
}

async function themLoai(w: W, ten: string): Promise<string> {
  return (await ok(w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten } }), 201, `thêm loại ${ten}`)).json.loai.code as string;
}
const ganHoSo = (w: W, partyId: string, code: string) => ok(w.call("POST", `/api/parties/${partyId}/roles`, { as: ADM, body: { roleTypeCode: code } }), 201, `gắn loại ${code} cho ${partyId}`);
/** Loại đối tác mới, hồ sơ ORG mang loại đó ⇒ ORG được hưởng; trả mã loại. */
async function loaiChoOrg(w: W, ten = "Lễ tân khách sạn nhỏ"): Promise<string> {
  const loai = await themLoai(w, ten);
  await ganHoSo(w, ORG, loai);
  return loai;
}
async function taoMuc(w: W, ten: string): Promise<string> {
  return (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten } }), 201, `tạo mức ${ten}`)).json.muc.code as string;
}
const themDongTa = (w: W, code: string, body: Record<string, unknown>, as = KT) =>
  w.call("POST", `/api/pricing/muc-ta/${code}/dong`, { as, body: { phamVi: "ALL", kieu: "RATE", tuNgay: "2026-01-01", ...body } });
const themHoaHong = (w: W, body: Record<string, unknown>, as = KT) =>
  w.call("POST", "/api/pricing/hoa-hong", { as, body: { doiTuong: { loai: "DOI_TAC", partyId: ORG }, phamVi: "ALL", kieu: "RATE", tuNgay: "2026-01-01", ...body } });
const doiMuc = (w: W, id: string, body: Record<string, unknown>, as = KT) => w.call("POST", `/api/pricing/hoa-hong/${id}/doi`, { as, body });
const suaMuc = (w: W, id: string, body: Record<string, unknown>, as = KT) =>
  w.call("POST", `/api/pricing/hoa-hong/${id}/sua`, { as, body: { lyDo: "Sửa theo bảng giá mới của đại lý", ...body } });
const thuTra = async (w: W, dichVu = "ZA1") => (await ok(w.call("GET", `/api/pricing/thu-tra?doiTac=${ORG}&dichVu=${dichVu}&ngay=${vnHomNay()}`, { as: SALES }), 200, "thử tra")).json.ketQua;
const CAU_LE = "Số tiền phải chia hết cho 1.000đ (không trả thì gõ 0).";

/** Đơn nháp bằng SQL (ZA1, 1.000.000đ, ngày đi hôm nay, bên đặt ORG) rồi xác nhận qua route ⇒ bản chụp ghi `ord_service_terms`. */
async function xacNhan(w: W): Promise<string> {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, ORG, AT, AT);
  const s = `${id}-s0`;
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'ZA1', 'Tour đảo', 'perPax', 1, ?)`).run(s, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'ZA1', 'adult', 'Người lớn', 1, 1000000, 1000000, 1000000)`).run(`${s}-i`, id, s);
  await ok(w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } }), 200, "xác nhận");
  return id;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Đọc / đổi giới hạn
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("gieo 50% và 1.000 đ: Kế toán, Bán hàng, Quản trị, Toàn quyền đọc được; thân có tuLuc để gửi lại khi đổi", async () => {
  const w = setup();
  for (const as of [KT, SALES, ADM, SA]) {
    const r = await ok(docGH(w, as), 200, `GET bằng ${as}`);
    assert.deepEqual([r.json.tranTyLeBp, r.json.buocTien, typeof r.json.tuLuc], [5000, 1000, "string"]);
  }
  assert.deepEqual(w.q("SELECT id, max_rate_bp, amount_step FROM prc_entry_limit_policy").map((x: object) => ({ ...x })), [{ id: "gieo-0137", max_rate_bp: 5000, amount_step: 1000 }]);
  assert.equal((await docGH(w, KT)).json.tuLuc, w.q("SELECT valid_from_at FROM prc_entry_limit_policy")[0].valid_from_at);
});

test("51% và 123.456 đ trả 400; 50%, 50.000 đ, 0 đ nhận — qua Thêm dòng của cấp (phạm vi một dịch vụ), Thêm mức đối tác và Đổi mức", async () => {
  const w = setup();
  const ta = await taoMuc(w, "TA1");
  const loai = await loaiChoOrg(w);
  // POST /muc-ta/:code/dong — phạm vi SERVICE
  const dich = { phamVi: "SERVICE", catalogCode: "ZA1" };
  const truoc = [soDong(w), soNhatKy(w)];
  const a = await themDongTa(w, ta, { ...dich, kieu: "RATE", tyLeBp: 5100 });
  assert.deepEqual([a.status, a.json.error.message], [400, "Phần trăm không quá 50%."], a.text);
  const b = await themDongTa(w, ta, { ...dich, kieu: "PER_PAX", moiKhach: 123_456 });
  assert.deepEqual([b.status, b.json.error.message], [400, CAU_LE], b.text);
  assert.deepEqual([soDong(w), soNhatKy(w)], truoc, "bị từ chối thì không ghi dòng, không ghi nhật ký");
  await ok(themDongTa(w, ta, { ...dich, kieu: "RATE", tyLeBp: 5000, tuNgay: "2026-01-01", denNgay: "2026-12-31" }), 201, "50% nhận");
  await ok(themDongTa(w, ta, { ...dich, kieu: "PER_PAX", moiKhach: 50_000, tuNgay: "2027-01-01", denNgay: "2027-12-31" }), 201, "50.000 đ nhận");
  await ok(themDongTa(w, ta, { ...dich, kieu: "PER_PAX", moiKhach: 0, tuNgay: "2028-01-01", denNgay: "2028-12-31" }), 201, "0 đ nhận");
  await ok(themDongTa(w, ta, { phamVi: "ALL", kieu: "RATE", tyLeBp: 0, tuNgay: "2029-01-01" }), 201, "0% nhận");

  // POST /hoa-hong — hồ sơ đối tác
  const t2 = [soDong(w), soNhatKy(w)];
  const c = await themHoaHong(w, { kieu: "RATE", tyLeBp: 5100 });
  assert.deepEqual([c.status, c.json.error.message], [400, "Phần trăm không quá 50%."], c.text);
  const d = await themHoaHong(w, { kieu: "PER_PAX", moiKhach: 123_456 });
  assert.deepEqual([d.status, d.json.error.message], [400, CAU_LE], d.text);
  const e = await themHoaHong(w, { kieu: "PER_PAX", moiKhach: 80_000, theoLoai: { treEm: 30_500, nguoiCaoTuoi: 0 } });
  assert.deepEqual([e.status, e.json.error.message], [400, CAU_LE], `số lẻ ở ô trẻ em: ${e.text}`);
  const f = await themHoaHong(w, { kieu: "PER_PAX", moiKhach: 80_000, theoLoai: { treEm: 30_000, nguoiCaoTuoi: 123 } });
  assert.deepEqual([f.status, f.json.error.message], [400, CAU_LE], `số lẻ ở ô người cao tuổi: ${f.text}`);
  assert.deepEqual([soDong(w), soNhatKy(w)], t2);
  const goc = await ok(themHoaHong(w, { kieu: "RATE", tyLeBp: 5000 }), 201, "50% đối tác nhận");

  // POST /hoa-hong/:id/doi
  const t3 = [soDong(w), soNhatKy(w)];
  const g = await doiMuc(w, goc.json.dong.id, { kieu: "RATE", tyLeBp: 5100, tuNgay: inDays(1) });
  assert.deepEqual([g.status, g.json.error.message], [400, "Phần trăm không quá 50%."], g.text);
  const h = await doiMuc(w, goc.json.dong.id, { kieu: "PER_PAX", moiKhach: 123_456, tuNgay: inDays(1) });
  assert.deepEqual([h.status, h.json.error.message], [400, CAU_LE], h.text);
  assert.deepEqual([soDong(w), soNhatKy(w)], t3, "Đổi bị từ chối thì dòng cũ vẫn nguyên, không thêm dòng, không nhật ký");
  await ok(doiMuc(w, goc.json.dong.id, { kieu: "PER_PAX", moiKhach: 50_000, tuNgay: inDays(1) }), 200, "Đổi sang 50.000 đ nhận");
  const vai = await ok(themHoaHong(w, { doiTuong: { loai: "VAI", code: loai }, kieu: "RATE", tyLeBp: 1000 }), 201, "dòng của loại");
  await ok(doiMuc(w, vai.json.dong.id, { kieu: "PER_PAX", moiKhach: 0, tuNgay: inDays(1) }), 200, "Đổi sang 0 đ nhận");
});

test("Toàn quyền đổi trần thành 60% thì 60% nhận ngay; có nhật ký prc_entry_limit_changed (số cũ, số mới); dòng mức và đơn đã chụp không đổi", async () => {
  const w = setup();
  await loaiChoOrg(w);
  const ta = await taoMuc(w, "TA1");
  await ok(themHoaHong(w, { kieu: "RATE", tyLeBp: 5000 }), 201);
  const don = await xacNhan(w);
  const anh = () => JSON.stringify([w.q("SELECT * FROM prc_commission_rule ORDER BY id"), w.q("SELECT * FROM ord_service_terms ORDER BY id"), w.q("SELECT * FROM orders ORDER BY id")]);
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", don), 1, "đơn đã chụp mức");
  const bi = await themDongTa(w, ta, { kieu: "RATE", tyLeBp: 6000 });
  assert.deepEqual([bi.status, bi.json.error.message], [400, "Phần trăm không quá 50%."], bi.text);

  const truoc = anh();
  const r = await doiGH(w, 6000, 1000);
  assert.deepEqual([r.json.tranTyLeBp, r.json.buocTien, typeof r.json.tuLuc], [6000, 1000, "string"]);
  assert.equal(anh(), truoc, "đổi giới hạn không đổi dòng mức, đơn hay bản chụp nào");
  assert.equal((await docGH(w, KT)).json.tranTyLeBp, 6000);
  await ok(themDongTa(w, ta, { kieu: "RATE", tyLeBp: 6000 }), 201, "60% nhận ngay");
  const nk = nhatKy(w, "prc_entry_limit_changed");
  assert.equal(nk.length, 1);
  assert.equal(nk[0]!.staff_id, SA);
  assert.match(nk[0]!.detail, /50%/);
  assert.match(nk[0]!.detail, /60%/);
  assert.match(nk[0]!.detail, /1\.000đ/);
  assert.ok(!/\d{8,}/.test(nk[0]!.detail), "nhật ký không có dãy số dài (SĐT, tài khoản)");
  assert.equal(dem(w, "SELECT count(*) AS n FROM prc_entry_limit_policy"), 2, "đổi = thêm dòng, không sửa dòng gieo");
});

test("Kế toán, Quản trị, Bán hàng POST đổi giới hạn 403; Đối tác và tài khoản lai GET 403; không ghi gì", async () => {
  const w = setup();
  const tuLuc = (await docGH(w, KT)).json.tuLuc as string;
  const truoc = [dem(w, "SELECT count(*) AS n FROM prc_entry_limit_policy"), soNhatKy(w)];
  for (const as of [KT, ADM, SALES, DT, KP]) {
    const r = await datGH(w, { tranTyLeBp: 6000, buocTien: 1000, tuLuc }, as);
    assert.equal(r.status, 403, `${as} POST: ${r.text}`);
  }
  for (const as of [DT, KP]) assert.equal((await docGH(w, as)).status, 403, `${as} GET`);
  assert.deepEqual([dem(w, "SELECT count(*) AS n FROM prc_entry_limit_policy"), soNhatKy(w)], truoc);
  assert.equal((await docGH(w, KT)).json.tranTyLeBp, 5000);
});

test("thân đổi giới hạn sai ⇒ 400 và không ghi: trần 0, bước 0, số lẻ, thiếu tuLuc", async () => {
  const w = setup();
  const tuLuc = (await docGH(w, SA)).json.tuLuc as string;
  const truoc = [dem(w, "SELECT count(*) AS n FROM prc_entry_limit_policy"), soNhatKy(w)];
  for (const body of [{ tranTyLeBp: 0, buocTien: 1000, tuLuc }, { tranTyLeBp: 10001, buocTien: 1000, tuLuc }, { tranTyLeBp: 6000, buocTien: 0, tuLuc },
    { tranTyLeBp: 6000, buocTien: 1_000_001, tuLuc }, { tranTyLeBp: 6000.5, buocTien: 1000, tuLuc }, { tranTyLeBp: 6000, buocTien: 1000 }]) {
    const r = await datGH(w, body);
    assert.equal(r.status, 400, `${JSON.stringify(body)}: ${r.text}`);
  }
  assert.deepEqual([dem(w, "SELECT count(*) AS n FROM prc_entry_limit_policy"), soNhatKy(w)], truoc);
});

test("hạ trần dưới dòng đã có: dòng vẫn áp, Sửa chỉ đổi ngày nhận 200, Sửa đổi số vượt trần 400", async () => {
  const w = setup();
  await loaiChoOrg(w);
  const goc = await ok(themHoaHong(w, { kieu: "RATE", tyLeBp: 5000 }), 201);
  const id = goc.json.dong.id as string;
  await doiGH(w, 2000, 1000);
  const t = await thuTra(w);
  assert.deepEqual([t.trangThai, t.muc.id, t.muc.tyLeBp ?? t.muc.rateBp], ["SET", id, 5000], "dòng 50% vẫn áp dù trần mới 20%");
  const truoc = [soDong(w), soNhatKy(w)];
  const x = await suaMuc(w, id, { kieu: "RATE", tyLeBp: 4000, tuNgay: "2026-01-01" });
  assert.deepEqual([x.status, x.json.error.message], [400, "Phần trăm không quá 20%."], x.text);
  assert.deepEqual([soDong(w), soNhatKy(w)], truoc, "Sửa bị từ chối thì không ghi gì");
  const dd = await doiMuc(w, id, { kieu: "RATE", tyLeBp: 4000, tuNgay: inDays(1) });
  assert.deepEqual([dd.status, dd.json.error.message], [400, "Phần trăm không quá 20%."], `Đổi số vượt trần: ${dd.text}`);
  const y = await ok(suaMuc(w, id, { kieu: "RATE", tyLeBp: 5000, tuNgay: "2026-01-01", denNgay: inDays(60) }), 200, "Sửa chỉ đổi ngày");
  assert.deepEqual([y.json.moi.tyLeBp, y.json.moi.denNgay], [5000, inDays(60)]);
  const z = await ok(suaMuc(w, y.json.moi.id, { kieu: "RATE", tyLeBp: 2000, tuNgay: "2026-01-01", denNgay: inDays(60) }), 200, "Sửa xuống trong trần");
  assert.equal(z.json.moi.tyLeBp, 2000);
});

test("đổi giới hạn rồi Thêm mức theo số cũ trả 400 câu theo số mới (hộp đang mở giữ nguyên số đã gõ)", async () => {
  const w = setup();
  const ta = await taoMuc(w, "TA1");
  await ok(themDongTa(w, ta, { kieu: "RATE", tyLeBp: 4000, tuNgay: "2026-01-01", denNgay: "2026-12-31" }), 201, "40% trong trần 50%");
  await doiGH(w, 3000, 5000);
  const a = await themDongTa(w, ta, { kieu: "RATE", tyLeBp: 4000, tuNgay: "2027-01-01" });
  assert.deepEqual([a.status, a.json.error.message], [400, "Phần trăm không quá 30%."], a.text);
  const b = await themDongTa(w, ta, { kieu: "PER_PAX", moiKhach: 51_000, tuNgay: "2027-01-01" });
  assert.deepEqual([b.status, b.json.error.message], [400, "Số tiền phải chia hết cho 5.000đ (không trả thì gõ 0)."], b.text);
  await ok(themDongTa(w, ta, { kieu: "PER_PAX", moiKhach: 55_000, tuNgay: "2027-01-01" }), 201, "55.000 chia hết 5.000");
});

test("tuLuc cũ ⇒ 409 stale, không nhật ký, không dòng mới; gửi đúng số đang hiệu lực ⇒ 200, không thêm dòng", async () => {
  const w = setup();
  const cu = (await docGH(w, SA)).json.tuLuc as string;
  await doiGH(w, 6000, 1000); // một người khác (hoặc tab khác) đã đổi ⇒ `cu` không còn là dòng mới nhất
  const truoc = [dem(w, "SELECT count(*) AS n FROM prc_entry_limit_policy"), soNhatKy(w)];
  const stale = await datGH(w, { tranTyLeBp: 7000, buocTien: 1000, tuLuc: cu });
  assert.deepEqual([stale.status, stale.json.error.code], [409, "stale"], stale.text);
  assert.deepEqual([dem(w, "SELECT count(*) AS n FROM prc_entry_limit_policy"), soNhatKy(w)], truoc);
  assert.equal((await docGH(w, KT)).json.tranTyLeBp, 6000, "số đang hiệu lực không đổi");

  const moi = (await docGH(w, SA)).json;
  const giong = await ok(datGH(w, { tranTyLeBp: 6000, buocTien: 1000, tuLuc: moi.tuLuc }), 200, "gửi đúng số đang hiệu lực");
  assert.deepEqual([giong.json.tranTyLeBp, giong.json.buocTien, giong.json.tuLuc], [6000, 1000, moi.tuLuc]);
  assert.deepEqual([dem(w, "SELECT count(*) AS n FROM prc_entry_limit_policy"), soNhatKy(w)], truoc, "không thêm dòng, không nhật ký");
});

test("hai lần đổi liền nhau và đổi khi đồng hồ chạy lùi: dòng sau luôn đi sau dòng trước (mốc lanSau), không va UNIQUE", async () => {
  const w = setup();
  await doiGH(w, 5500, 1000);
  await doiGH(w, 5600, 1000);
  await doiGH(w, 5700, 2000);
  const ds = w.q("SELECT max_rate_bp, amount_step, valid_from_at FROM prc_entry_limit_policy ORDER BY valid_from_at");
  assert.deepEqual(ds.map((d: { max_rate_bp: number }) => d.max_rate_bp), [5000, 5500, 5600, 5700]);
  assert.equal(new Set(ds.map((d: { valid_from_at: string }) => d.valid_from_at)).size, 4);
  assert.equal((await docGH(w, KT)).json.buocTien, 2000);
});

test("bảng chỉ thêm: UPDATE, DELETE thẳng prc_entry_limit_policy bị trigger chặn; cột giữ CHECK 1…10000 và 1…1.000.000", () => {
  const w = setup();
  assert.throws(() => w.sqlite.exec("UPDATE prc_entry_limit_policy SET max_rate_bp = 9000"), /prc_policy_append_only/);
  assert.throws(() => w.sqlite.exec("DELETE FROM prc_entry_limit_policy"), /prc_policy_append_only/);
  assert.equal(dem(w, "SELECT count(*) AS n FROM prc_entry_limit_policy"), 1);
  const them = (rate: number, step: number, at: string) => w.sqlite.prepare("INSERT INTO prc_entry_limit_policy (id, max_rate_bp, amount_step, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(uuid(), rate, step, at, at, at);
  assert.throws(() => them(0, 1000, "2099-01-01T00:00:00.000Z"), /CHECK/);
  assert.throws(() => them(10001, 1000, "2099-01-01T00:00:00.000Z"), /CHECK/);
  assert.throws(() => them(5000, 0, "2099-01-01T00:00:00.000Z"), /CHECK/);
  assert.throws(() => them(5000, 1_000_001, "2099-01-01T00:00:00.000Z"), /CHECK/);
  them(10000, 1_000_000, "2099-01-01T00:00:00.000Z");
  assert.throws(() => them(5000, 1000, "2099-01-01T00:00:00.000Z"), /UNIQUE/);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Task 2 — hoa hồng KHÔNG vượt thành tiền lúc nhập (ADR-0161 Đ4): dòng phạm vi MỘT dịch vụ, tính bằng số tiền, so với giá bán lẻ hiệu lực của dịch vụ
// ---------------------------------------------------------------------------------------------------------------------------------------------
/** Dịch vụ gieo thêm trong danh mục (giá người lớn/trẻ em/người cao tuổi; `inSheet` 0 = đã rời Sheet). */
function dichVu(w: W, code: string, ten: string, v: { unit?: string; adult: number; child?: number | null; senior?: number | null; inSheet?: number }): void {
  w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, in_sheet, first_seen_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, '2026-01-01', '2026-01-01')")
    .run(code, ten, v.unit ?? "perPax", v.adult, v.child ?? null, v.senior ?? null, v.inSheet ?? 1);
}
const dichVuMuc = (code: string, them: Record<string, unknown>) => ({ phamVi: "SERVICE", catalogCode: code, kieu: "PER_PAX", ...them });
const CAU_VE3 = "Hoa hồng 500.000đ lớn hơn giá bán cao nhất 300.000đ của «Vé 300».";

test("500.000 đ cho vé 300.000 đ trả 400 qua Thêm dòng của cấp, Thêm mức đối tác, Đổi và Sửa; bằng giá thì nhận; không ghi dòng, không nhật ký", async () => {
  const w = setup();
  dichVu(w, "VE3", "Vé 300", { adult: 300_000 });
  await loaiChoOrg(w);
  const ta = await taoMuc(w, "TA1");
  const truoc = [soDong(w), soNhatKy(w)];
  const a = await themDongTa(w, ta, dichVuMuc("VE3", { moiKhach: 500_000 }));
  assert.deepEqual([a.status, a.json.error.message], [400, CAU_VE3], a.text);
  const b = await themDongTa(w, ta, dichVuMuc("VE3", { moiKhach: 500_000, theoLoai: { treEm: 0, nguoiCaoTuoi: 0 } }));
  assert.deepEqual([b.status, b.json.error.message], [400, "Hoa hồng 500.000đ của người lớn lớn hơn giá bán 300.000đ của «Vé 300»."], b.text);
  const c = await themHoaHong(w, dichVuMuc("VE3", { moiKhach: 500_000 }));
  assert.deepEqual([c.status, c.json.error.message], [400, CAU_VE3], c.text);
  assert.deepEqual([soDong(w), soNhatKy(w)], truoc, "Thêm bị từ chối thì không ghi gì");

  const goc = await ok(themHoaHong(w, dichVuMuc("VE3", { moiKhach: 100_000 })), 201, "100.000 đ trong giá");
  const t2 = [soDong(w), soNhatKy(w)];
  const d = await doiMuc(w, goc.json.dong.id, { kieu: "PER_PAX", moiKhach: 500_000, tuNgay: inDays(1) });
  assert.deepEqual([d.status, d.json.error.message], [400, CAU_VE3], `Đổi: ${d.text}`);
  const e = await suaMuc(w, goc.json.dong.id, { kieu: "PER_PAX", moiKhach: 500_000, tuNgay: "2026-01-01" });
  assert.deepEqual([e.status, e.json.error.message], [400, CAU_VE3], `Sửa: ${e.text}`);
  assert.deepEqual([soDong(w), soNhatKy(w)], t2, "Đổi, Sửa bị từ chối thì dòng cũ vẫn nguyên, không thêm dòng, không nhật ký");
  await ok(suaMuc(w, goc.json.dong.id, { kieu: "PER_PAX", moiKhach: 300_000, tuNgay: "2026-01-01" }), 200, "Sửa đúng bằng giá thì nhận");
  await ok(themDongTa(w, ta, dichVuMuc("VE3", { moiKhach: 300_000 })), 201, "Thêm đúng bằng giá thì nhận");
});

test("cùng số 500.000 đ ở phạm vi nhóm và tất cả được nhận (không có một giá để so); phần trăm không so giá", async () => {
  const w = setup();
  dichVu(w, "VE3", "Vé 300", { adult: 300_000 });
  w.sqlite.prepare("INSERT INTO ctl_group (code, name, sort_order, active, created_at, updated_at) VALUES ('GRP1', 'Nhóm thử', 99, 1, ?, ?)").run(AT, AT);
  const ta = await taoMuc(w, "TA1");
  await ok(themDongTa(w, ta, { phamVi: "ALL", kieu: "PER_PAX", moiKhach: 500_000 }), 201, "tất cả dịch vụ");
  await ok(themDongTa(w, ta, { phamVi: "GROUP", groupCode: "GRP1", kieu: "PER_PAX", moiKhach: 500_000 }), 201, "nhóm dịch vụ");
  await ok(themDongTa(w, ta, { phamVi: "SERVICE", catalogCode: "VE3", kieu: "RATE", tyLeBp: 5000 }), 201, "phần trăm cho vé 300.000 đ: không so giá");
});

test("«Mọi khách như nhau» 100.000 đ cho dịch vụ người lớn 1.000.000 đ, trẻ em 0 đ được nhận; «Riêng từng loại» với trẻ em 0 đ mà gõ 30.000 đ thì bị chặn", async () => {
  const w = setup();
  dichVu(w, "VE0", "Vé gia đình", { adult: 1_000_000, child: 0 });
  const ta = await taoMuc(w, "TA1");
  await ok(themDongTa(w, ta, dichVuMuc("VE0", { moiKhach: 100_000, tuNgay: "2026-01-01", denNgay: "2026-12-31" })), 201, "Mọi khách như nhau");
  const x = await themDongTa(w, ta, dichVuMuc("VE0", { moiKhach: 100_000, theoLoai: { treEm: 30_000, nguoiCaoTuoi: 0 }, tuNgay: "2027-01-01" }));
  assert.deepEqual([x.status, x.json.error.message], [400, "Hoa hồng 30.000đ của trẻ em lớn hơn giá bán 0đ của «Vé gia đình»."], x.text);
  await ok(themDongTa(w, ta, dichVuMuc("VE0", { moiKhach: 100_000, theoLoai: { treEm: 0, nguoiCaoTuoi: 0 }, tuNgay: "2027-01-01" })), 201, "Riêng từng loại, trẻ em 0 đ");
});

test("dịch vụ tính theo lượt so số mỗi lượt; dịch vụ đã rời Sheet, đơn vị lạ: nhập được dù số lớn hơn giá lưu (bỏ qua so vượt giá)", async () => {
  const w = setup();
  dichVu(w, "PHAO", "Phao", { unit: "per5Pax", adult: 800_000 });
  dichVu(w, "CU", "Tour cũ", { adult: 300_000, inSheet: 0 });
  dichVu(w, "LA", "Dịch vụ lạ", { unit: "perRoom", adult: 300_000 });
  const ta = await taoMuc(w, "TA1");
  const a = await themDongTa(w, ta, dichVuMuc("PHAO", { moiKhach: 801_000 }));
  assert.deepEqual([a.status, a.json.error.message], [400, "Hoa hồng 801.000đ của mỗi lượt lớn hơn giá bán 800.000đ của «Phao»."], a.text);
  await ok(themDongTa(w, ta, dichVuMuc("PHAO", { moiKhach: 800_000, theoLoai: { treEm: 9_000_000, nguoiCaoTuoi: 9_000_000 } })), 201, "theo lượt: chỉ số mỗi lượt được so");
  await ok(themDongTa(w, ta, dichVuMuc("CU", { moiKhach: 500_000 })), 201, "đã rời Sheet: bỏ qua so giá");
  await ok(themDongTa(w, ta, dichVuMuc("LA", { moiKhach: 500_000 })), 201, "đơn vị lạ: bỏ qua so giá");
});

test("dòng đã có vượt giá vì giá giảm sau đó: Sửa chỉ đổi ngày 200, Sửa đổi số vẫn phải trong giá hiện hành 400", async () => {
  const w = setup();
  dichVu(w, "VE3", "Vé 300", { adult: 300_000 });
  await loaiChoOrg(w);
  const goc = await ok(themHoaHong(w, dichVuMuc("VE3", { moiKhach: 200_000 })), 201);
  w.sqlite.prepare("UPDATE catalog_item SET price_adult = 100000 WHERE code = 'VE3'").run(); // Sheet giảm giá vé: dòng 200.000 đ nay vượt giá
  const id = goc.json.dong.id as string;
  const y = await ok(suaMuc(w, id, { kieu: "PER_PAX", moiKhach: 200_000, tuNgay: "2026-01-01", denNgay: inDays(60) }), 200, "Sửa chỉ đổi ngày");
  assert.deepEqual([y.json.moi.moiKhach, y.json.moi.denNgay], [200_000, inDays(60)]);
  const z = await suaMuc(w, y.json.moi.id, { kieu: "PER_PAX", moiKhach: 150_000, tuNgay: "2026-01-01", denNgay: inDays(60) });
  assert.deepEqual([z.status, z.json.error.message], [400, "Hoa hồng 150.000đ lớn hơn giá bán cao nhất 100.000đ của «Vé 300»."], z.text);
  await ok(suaMuc(w, y.json.moi.id, { kieu: "PER_PAX", moiKhach: 100_000, tuNgay: "2026-01-01", denNgay: inDays(60) }), 200, "Sửa xuống đúng giá hiện hành");
});
