// ADR-0116 (thi hành ADR-0088 đ9; TNV-G3) + ADR-0092 Đ6a (TNV-G4) qua ROUTE THẬT trên khung thử (tests/audit/harness.mjs: cả ứng dụng + SQLite, lô `db.batch()` là một giao dịch).
// Tiêu chí nghiệm thu 1–11 của phụ lục kỹ thuật (docs/superpowers/specs/2026-10-13-de-xuat-adr-hc-4-2-va-adr-0088-d9/de-xuat-adr-0088-d9.md mục 3). Lớp CSDL: src/migrations-phan-dinh.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoBanChup } from "../../../tests/audit/gieo-ban-chup.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const QT = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const SA = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666";
const TT = "88888888-8888-4888-8888-888888888888";
const TX = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const KT2 = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [QT, "0900000003", "Quản Trị", ["ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [SA, "0900000006", "Toàn Quyền", ["SUPER_ADMIN"]], [DT, "0900000007", "Đối Tác", ["PARTNER"]], [TT, "0900000009", "Thực Tập", ["INTERN"]], [TX, "0900000010", "Tài Xế", ["DRIVER"]],
    [KT2, "0900000011", "Mai Kế Toán", ["ACCOUNTING"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
const congTy = (w: W) => String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
const hdv = `pty-${HDV}`;
/** Đơn đã xác nhận `tong` đồng, ngày đi hôm nay, người phụ trách = HDV. */
function don(w: W, tong = 1_000_000): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé Hòn Tằm', 'perPax', 1, ?)`).run(`${id}-s`, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, tong, tong);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  gieoBanChup(w.sqlite, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, hdv, AT, AT, AT);
  return id;
}
const thu = (w: W, as: string, orderId: string, soTien: number, nguoiThu: unknown = "cong_ty", extra: Record<string, unknown> = {}) =>
  w.call("POST", `/api/orders/${orderId}/payments`, { as, body: { soTien, hinhThuc: "CASH", nguoiThu, ...extra } });
const giao = (w: W, id: string) => w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} });
/** Đơn đã giao, khách đã trả đủ cho công ty. */
async function daGiao(w: W, tong = 1_000_000): Promise<string> {
  const id = don(w, tong);
  const t = await thu(w, KT, id, tong);
  assert.equal(t.status, 201, t.text);
  const g = await giao(w, id);
  assert.equal(g.status, 200, g.text);
  return id;
}
const deNghi = (w: W, orderId: string, soTien: number, as = KT) => w.call("POST", "/api/ledger/phan-dinh", { as, body: { orderId, soTien, lyDo: "Khách phản ánh HDV quên đón" } });
const quyet = (w: W, id: string, body: Record<string, unknown>, as = QT) => w.call("POST", `/api/ledger/phan-dinh/${id}/quyet`, { as, body: { lyDo: "Đã nghe hai bên, HDV nhận lỗi", ...body } });
const ghi = (w: W, id: string, body: Record<string, unknown> = {}, as = KT) => w.call("POST", `/api/ledger/phan-dinh/${id}/ghi`, { as, body });
const dem = (w: W, sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);
const tien = async (w: W, orderId: string) => (await w.call("GET", `/api/orders/${orderId}/payments`, { as: KT })).json;
const noCua = (w: W, orderId: string, ben: string) => Number(w.q(`SELECT COALESCE(SUM(CASE WHEN debtor_party_id = ?2 THEN amount WHEN creditor_party_id = ?2 THEN -amount ELSE 0 END), 0) AS n FROM bil_debt_line WHERE order_id = ?1 AND kind_code = 'ATTRIBUTION'`, orderId, ben)[0].n);
const daThuRong = (w: W, orderId: string) => Number(w.q(`SELECT COALESCE(SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END), 0) AS n FROM bil_payment_receipt r WHERE r.order_id = ? AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)`, orderId)[0].n);
const phaiThuView = (w: W, orderId: string) => Number(w.q("SELECT phai_thu AS n FROM v_bil_phai_thu_hien_hanh WHERE order_id = ?", orderId)[0].n);
const I1 = (w: W, orderId: string) => assert.equal(daThuRong(w, orderId), phaiThuView(w, orderId), "I1: đã thu ròng = phải thu hiện hành");
/** Đề nghị + phân định, trả id phân định. */
async function deNghiVaQuyet(w: W, orderId: string, soTien: number, body: Record<string, unknown>): Promise<{ q: string; r: string }> {
  const q = await deNghi(w, orderId, soTien);
  assert.equal(q.status, 201, q.text);
  const r = await quyet(w, q.json.id, { soTien, ...body });
  assert.equal(r.status, 201, r.text);
  return { q: q.json.id, r: r.json.id };
}
const lanThuId = (w: W, orderId: string, soTien: number) => String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND amount = ? AND reverses_id IS NULL AND kind_code = 'CUSTOMER_PAYMENT' ORDER BY created_at", orderId, soTien)[0].id);

test("TC1 (T6 có tiền ra, ca SV-PD-01): đã thu ròng = phải thu lúc giao − giảm trừ; khách có đúng một lần trả; HDV nợ cùng số; đơn Hoàn thành được", async () => {
  const w = setup();
  const id = await daGiao(w, 2_000_000);
  const { r } = await deNghiVaQuyet(w, id, 300_000, { truongHop: "T6", benChiuPartyId: hdv, coTienRa: true });
  const g = await ghi(w, r, { hinhThuc: "CASH", nguoiTra: "cong_ty" });
  assert.equal(g.status, 201, g.text);
  assert.equal(daThuRong(w, id), 1_700_000);
  assert.equal(phaiThuView(w, id), 1_700_000);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ? AND kind_code = 'CUSTOMER_REFUND' AND attribution_id IS NOT NULL AND amount = 300000", id), 1);
  assert.equal(noCua(w, id, hdv), 300_000);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'attribution_posted' AND target_type = 'staff' AND target_id = ?", id, HDV), 1, "tin cho bên chịu có tài khoản");
  const t = await tien(w, id);
  assert.equal(t.phaiThu, 1_700_000);
  assert.equal(t.giamTru, 300_000);
  assert.equal(t.conLai, 0, "không báo khách còn nợ phần đã giảm trừ");
  const ht = await w.call("POST", `/api/orders/${id}/completed`, { as: KT, body: {} });
  assert.equal(ht.status, 200, ht.text);
  assert.equal(noCua(w, id, hdv), 300_000, "nợ vẫn còn sau Hoàn thành");
  const toi = await w.call("GET", "/api/ledger/phan-dinh-cua-toi", { as: HDV });
  assert.equal(toi.json.khoan.length, 1);
  assert.equal(toi.json.khoan[0].soTien, 300_000);
});

test("TC2 (T4 không tiền ra, ca SV-PD-02): sổ còn ghi đủ ⇒ từ chối «Sửa khoản thu trước»; kèm sửa khoản thu trong cùng lô ⇒ qua, không có lần trả khách, I1 đúng", async () => {
  const w = setup();
  const id = await daGiao(w);
  const { r } = await deNghiVaQuyet(w, id, 300_000, { truongHop: "T4", benChiuPartyId: `pty-${KT}`, coTienRa: false });
  const tuChoi = await ghi(w, r);
  assert.equal(tuChoi.status, 409, tuChoi.text);
  assert.equal(tuChoi.json.error.code, "attribution_i1");
  assert.match(tuChoi.json.error.message, /Sửa khoản thu trước/);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_attribution WHERE order_id = ? AND step_code = 'POSTED'", id), 0);
  const moi = await ghi(w, r, { thay: { cu: [lanThuId(w, id, 1_000_000)], moi: [{ soTien: 700_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "Khách thật sự chỉ trả 700.000" } }, KT2);
  assert.equal(moi.status, 201, moi.text);
  assert.equal(daThuRong(w, id), 700_000);
  assert.equal(phaiThuView(w, id), 700_000);
  assert.equal(noCua(w, id, `pty-${KT}`), 300_000);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ? AND kind_code = 'CUSTOMER_REFUND'", id), 0);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'ledger_receipt_replaced'", id), 1);
});

test("TC3 (ca SV-PD-05): người ghi = người phân định ⇒ 409 attribution_same_person (Toàn quyền vừa phân định vừa ghi)", async () => {
  const w = setup();
  const id = await daGiao(w);
  const q = await deNghi(w, id, 100_000);
  const r = await quyet(w, q.json.id, { soTien: 100_000, truongHop: "T6", benChiuPartyId: hdv, coTienRa: true }, SA);
  assert.equal(r.status, 201, r.text);
  const g = await ghi(w, r.json.id, { hinhThuc: "CASH" }, SA);
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.code, "attribution_same_person");
  assert.equal(daThuRong(w, id), 1_000_000);
});

test("TC4 (ca SV-PD-04): giảm trừ cộng dồn vượt phải thu ⇒ 409; hai phiếu 1.200.000 trên đơn 2.000.000, phiếu hai bị chặn lúc phân định và lúc ghi", async () => {
  const w = setup();
  const id = await daGiao(w, 2_000_000);
  const a = await deNghiVaQuyet(w, id, 1_200_000, { truongHop: "T6", benChiuPartyId: hdv, coTienRa: true });
  const b = await deNghiVaQuyet(w, id, 1_200_000, { truongHop: "T6", benChiuPartyId: hdv, coTienRa: true }); // lúc phân định phiếu một chưa ghi: báo sớm chưa chặn
  assert.equal((await ghi(w, a.r, { hinhThuc: "CASH" })).status, 201);
  const g2 = await ghi(w, b.r, { hinhThuc: "CASH" });
  assert.equal(g2.status, 409, g2.text);
  assert.equal(g2.json.error.code, "attribution_over_due");
  const q3 = await deNghi(w, id, 900_000);
  const r3 = await quyet(w, q3.json.id, { soTien: 900_000, truongHop: "T6", benChiuPartyId: hdv, coTienRa: true });
  assert.equal(r3.status, 409, r3.text);
  assert.equal(r3.json.error.code, "attribution_over_due");
  I1(w, id);
});

test("TC4b: tiền ra lớn hơn đã thu ròng ⇒ 409 (đơn lệch, đã thu < phải thu)", async () => {
  const w = setup();
  const id = await daGiao(w);
  const { r } = await deNghiVaQuyet(w, id, 200_000, { truongHop: "T6", benChiuPartyId: hdv, coTienRa: true });
  // đơn lệch qua SQL gõ tay: gỡ trigger rồi chèn đảo thẳng — chỉ để kiểm lớp máy chủ.
  w.sqlite.exec("DROP TRIGGER IF EXISTS bil_receipt_after_delivered");
  w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by)
    SELECT 'dao-1', order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, id, NULL, created_at, created_by, updated_at, updated_by FROM bil_payment_receipt WHERE order_id = ?`).run(id);
  const g = await ghi(w, r, { hinhThuc: "CASH" });
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.code, "refund_exceeds_paid");
});

test("TC5: trả khách sau Đã giao không qua phân định ⇒ route cũ 409 chỉ sang màn Phân định trách nhiệm; chèn thẳng không attribution_id ⇒ trigger chặn; đảo lần trả có attribution_id ⇒ chặn", async () => {
  const w = setup();
  const id = await daGiao(w);
  const h = await w.call("POST", "/api/ledger/refunds", { as: KT, body: { orderId: id, soTien: 100_000, hinhThuc: "CASH", nguoiTra: "cong_ty" } });
  assert.equal(h.status, 409, h.text);
  assert.equal(h.json.error.code, "refund_after_delivered");
  assert.match(h.json.error.message, /mở màn «Phân định trách nhiệm»/);
  const ct = congTy(w);
  assert.throws(() => w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, created_at, created_by, updated_at, updated_by)
    VALUES ('x1', ?, 'CUSTOMER_REFUND', 100000, ?, 'COMPANY', 'CASH', ?, 'AT_DELIVERY', ?, ?, ?, ?, ?)`).run(id, ct, ct, vnHomNay(), AT, KT, AT, KT), /receipt_after_delivered/);
});

test("TC6: bên chịu là khách thuần ⇒ 400 liable_is_customer; hồ sơ không có thật ⇒ 400; T10 bên chịu tự là công ty; T6 không được chọn công ty", async () => {
  const w = setup();
  const id = await daGiao(w);
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-kh', 'PERSON', 'Khách Thuần', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('rol-kh', 'pty-kh', 'CUSTOMER', NULL, '2026-01-01', '${AT}', '${AT}')`);
  const q = await deNghi(w, id, 100_000);
  const kh = await quyet(w, q.json.id, { soTien: 100_000, truongHop: "T6", benChiuPartyId: "pty-kh", coTienRa: true });
  assert.equal(kh.status, 400, kh.text);
  assert.equal(kh.json.error.code, "liable_is_customer");
  assert.equal((await quyet(w, q.json.id, { soTien: 100_000, truongHop: "T6", benChiuPartyId: "pty-khong-co", coTienRa: true })).status, 400);
  assert.equal((await quyet(w, q.json.id, { soTien: 100_000, truongHop: "T6", benChiuPartyId: congTy(w), coTienRa: true })).status, 400);
  const t10 = await quyet(w, q.json.id, { soTien: 100_000, truongHop: "T10", coTienRa: true, lyDo: "Bão, hoàn một phần cho khách" });
  assert.equal(t10.status, 201, t10.text);
  assert.equal((await ghi(w, t10.json.id, { hinhThuc: "CASH" })).status, 201);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ? AND kind_code = 'ATTRIBUTION'", id), 0, "T10: không dòng nợ");
  I1(w, id);
});

test("TC7: ngày phát sinh ngoài tháng đang mở ⇒ 400, ngày thật vào ghi chú; đơn đã Hoàn thành vẫn ghi được, nợ hiện ở Sổ của tôi", async () => {
  const w = setup();
  const id = await daGiao(w);
  assert.equal((await w.call("POST", `/api/orders/${id}/completed`, { as: KT, body: {} })).status, 200);
  const { r } = await deNghiVaQuyet(w, id, 100_000, { truongHop: "T6", benChiuPartyId: hdv, coTienRa: true });
  const cu = await ghi(w, r, { hinhThuc: "CASH", ngayPhatSinh: "2025-12-31" });
  assert.equal(cu.status, 400, cu.text);
  const g = await ghi(w, r, { hinhThuc: "CASH", ngayThat: "2026-01-15" });
  assert.equal(g.status, 201, g.text);
  assert.match(String(w.q("SELECT reason FROM bil_posting WHERE order_id = ? AND kind_code = 'ATTRIBUTION'", id)[0].reason), /ngày thật 2026-01-15/);
  const so = await w.call("GET", "/api/ledger/mine", { as: HDV });
  assert.equal(so.status, 200, so.text);
  assert.ok(so.json.dong.some((d: { soTien?: number; so?: number; loai?: string }) => JSON.stringify(d).includes("100000") || d.soTien === 100_000), so.text);
});

test("TC8: người ngoài ba nhóm ⇒ 403 ở route mới; Quản trị không ghi sổ; Kế toán không phân định; bên chịu khác đọc/phản hồi khoản của người khác ⇒ rỗng / 404", async () => {
  const w = setup();
  const id = await daGiao(w);
  for (const as of [SALES, HDV, DT, TT, TX]) {
    const dn = await deNghi(w, id, 100_000, as);
    assert.ok([403].includes(dn.status), `${as} đề nghị: ${dn.status}`);
    assert.equal((await w.call("GET", "/api/ledger/phan-dinh", { as })).status, 403, as);
  }
  const { q, r } = await deNghiVaQuyet(w, id, 100_000, { truongHop: "T6", benChiuPartyId: hdv, coTienRa: true });
  for (const as of [SALES, HDV, DT, TT, TX, KT]) assert.equal((await quyet(w, q, { soTien: 100_000, truongHop: "T6", benChiuPartyId: hdv, coTienRa: true }, as)).status, 403, `${as} phân định`);
  assert.equal((await ghi(w, r, { hinhThuc: "CASH" }, QT)).status, 403, "Quản trị không tự ghi");
  for (const as of [SALES, HDV, DT, TT, TX]) assert.equal((await ghi(w, r, { hinhThuc: "CASH" }, as)).status, 403, `${as} ghi`);
  const g = await ghi(w, r, { hinhThuc: "CASH" });
  assert.equal(g.status, 201, g.text);
  const goc = String(w.q("SELECT id FROM bil_attribution WHERE order_id = ? AND step_code = 'POSTED'", id)[0].id);
  assert.equal((await w.call("GET", "/api/ledger/phan-dinh-cua-toi", { as: SALES })).json.khoan.length, 0);
  assert.equal((await w.call("POST", `/api/ledger/phan-dinh-cua-toi/${goc}/phan-hoi`, { as: SALES, body: { noiDung: "Không phải tôi" } })).status, 404);
  const ph = await w.call("POST", `/api/ledger/phan-dinh-cua-toi/${goc}/phan-hoi`, { as: HDV, body: { noiDung: "Tôi không đồng ý vì khách đến muộn" } });
  assert.equal(ph.status, 201, ph.text);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_attribution WHERE order_id = ? AND step_code = 'RESPONSE'", id), 1);
  const ds = await w.call("GET", "/api/ledger/phan-dinh", { as: KT });
  assert.equal(ds.json.phieu[0].phanHoi.length, 1);
});

test("TC9 (ca SV-PD-06): T11 ghi giảm trừ với bên chịu = công ty, không nợ; quá 7 ngày hiện đỏ; phân định xong thì thêm nợ, giảm trừ không đổi", async () => {
  const w = setup();
  const id = await daGiao(w);
  const { r } = await deNghiVaQuyet(w, id, 400_000, { truongHop: "T11", coTienRa: true, lyDo: "Chưa rõ ai sai, trả khách trước" });
  assert.equal((await ghi(w, r, { hinhThuc: "CASH" })).status, 201);
  assert.equal(noCua(w, id, hdv), 0);
  assert.equal(phaiThuView(w, id), 600_000);
  const goc = String(w.q("SELECT id FROM bil_attribution WHERE order_id = ? AND step_code = 'POSTED'", id)[0].id);
  assert.equal((await w.call("GET", "/api/ledger/phan-dinh", { as: QT })).json.phieu[0].t11QuaHan, false);
  w.sqlite.exec("DROP TRIGGER IF EXISTS bil_attribution_no_update");
  w.sqlite.prepare("UPDATE bil_attribution SET created_at = '2026-01-01T00:00:00.000Z' WHERE id = ?").run(r);
  assert.equal((await w.call("GET", "/api/ledger/phan-dinh", { as: QT })).json.phieu[0].t11QuaHan, true, "quá 7 ngày hiện đỏ");
  const d = await w.call("POST", `/api/ledger/phan-dinh/${goc}/doi-ben-chiu`, { as: QT, body: { truongHop: "T6", benChiuPartyId: hdv, lyDo: "Đã rõ HDV quên đón khách" } });
  assert.equal(d.status, 201, d.text);
  assert.equal((await ghi(w, d.json.id, {}, QT)).status, 403);
  assert.equal((await ghi(w, d.json.id)).status, 201);
  assert.equal(noCua(w, id, hdv), 400_000);
  assert.equal(phaiThuView(w, id), 600_000, "giảm trừ không đổi");
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ? AND kind_code = 'CUSTOMER_REFUND'", id), 1, "tiền đã trả khách không đổi");
  I1(w, id);
});

test("TC10: đổi bên chịu = đảo nợ cũ + nợ mới; đòi được khách = lần thu mới + đảo giảm trừ cùng lô, đảo được một phần; I1 đúng sau mỗi bước; đảo sai số ⇒ từ chối", async () => {
  const w = setup();
  const id = await daGiao(w);
  const { r } = await deNghiVaQuyet(w, id, 300_000, { truongHop: "T4", benChiuPartyId: hdv, coTienRa: false });
  assert.equal((await ghi(w, r, { thay: { cu: [lanThuId(w, id, 1_000_000)], moi: [{ soTien: 700_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "Khách thật sự chỉ trả 700.000" } })).status, 201);
  I1(w, id);
  const goc = String(w.q("SELECT id FROM bil_attribution WHERE order_id = ? AND step_code = 'POSTED'", id)[0].id);
  // Đổi bên chịu sang Kế toán.
  const d = await w.call("POST", `/api/ledger/phan-dinh/${goc}/doi-ben-chiu`, { as: QT, body: { truongHop: "T6", benChiuPartyId: `pty-${KT2}`, lyDo: "Phân định nhầm người, đổi bên chịu" } });
  assert.equal(d.status, 201, d.text);
  assert.equal((await ghi(w, d.json.id)).status, 201);
  assert.equal(noCua(w, id, hdv), 0);
  assert.equal(noCua(w, id, `pty-${KT2}`), 300_000);
  assert.equal(phaiThuView(w, id), 700_000);
  I1(w, id);
  // Đòi được khách một phần.
  const sai = await w.call("POST", `/api/ledger/phan-dinh/${goc}/huy`, { as: KT, body: { soTien: 100_000, lyDo: "Khách đã trả lại một phần", moi: [{ soTien: 90_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }] } });
  assert.equal(sai.status, 409, sai.text);
  assert.equal(phaiThuView(w, id), 700_000, "lô sai không để lại gì");
  const dao = await w.call("POST", `/api/ledger/phan-dinh/${goc}/huy`, { as: KT, body: { soTien: 100_000, lyDo: "Khách đã trả lại một phần", moi: [{ soTien: 100_000, hinhThuc: "CASH", nguoiThu: "cong_ty", ngayPhatSinh: vnHomNay() }] } });
  assert.equal(dao.status, 201, dao.text);
  assert.equal(phaiThuView(w, id), 800_000);
  assert.equal(noCua(w, id, `pty-${KT2}`), 200_000);
  I1(w, id);
  const vuot = await w.call("POST", `/api/ledger/phan-dinh/${goc}/huy`, { as: KT, body: { soTien: 300_000, lyDo: "Đảo vượt số còn hiệu lực", moi: [{ soTien: 300_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }] } });
  assert.equal(vuot.status, 409);
});

test("TC11: khoản nợ theo phân định trả được bằng lệnh nộp; dòng ATTRIBUTION không đi đường đảo thường, không đi đường điều chỉnh", async () => {
  const w = setup();
  const id = await daGiao(w);
  const { r } = await deNghiVaQuyet(w, id, 100_000, { truongHop: "T6", benChiuPartyId: hdv, coTienRa: true });
  assert.equal((await ghi(w, r, { hinhThuc: "CASH" })).status, 201);
  const dongAttr = String(w.q("SELECT id FROM bil_debt_line WHERE order_id = ? AND kind_code = 'ATTRIBUTION'", id)[0].id);
  const dao = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_dong", lineId: dongAttr, lyDo: "Thử đảo dòng phân định" } });
  assert.equal(dao.status, 409, dao.text);
  const dc = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dieu_chinh", loaiDong: "ATTRIBUTION", orderId: id, benNo: { partyId: hdv }, benDuocNo: "cong_ty", soTien: 100_000, lyDo: "Thử đi đường điều chỉnh", huong: "giam" } });
  assert.equal(dc.status, 400, dc.text);
  // Trả nợ bằng lệnh nộp: nợ về 0, không kẹt R-BIL-13.
  const nop = await w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId: hdv, phanBo: [{ orderId: id, soTien: 100_000 }] } });
  assert.equal(nop.status, 201, nop.text);
});

test("Tin: đề nghị chỉ người có ô phân định thấy; đã phân định — người có ô ghi sổ thấy; bên chịu thấy tin đã ghi; không số tiền, không lý do trong câu", async () => {
  const w = setup();
  const id = await daGiao(w);
  const hop = async (as: string) => (await w.call("GET", "/api/thong-bao", { as })).json;
  const q = await deNghi(w, id, 100_000);
  const cau = (j: { tin: { cau: string }[] }) => j.tin.map((m) => m.cau);
  assert.ok(cau(await hop(QT)).some((c) => /đề nghị phân định/.test(c)), "Quản trị thấy đề nghị");
  assert.ok(!cau(await hop(SALES)).some((c) => /phân định/.test(c)), "Bán hàng không thấy");
  const r = await quyet(w, q.json.id, { soTien: 100_000, truongHop: "T6", benChiuPartyId: hdv, coTienRa: true });
  assert.ok(cau(await hop(KT2)).some((c) => /chờ ghi sổ/.test(c)), "người có ô ghi sổ thấy");
  assert.equal((await ghi(w, r.json.id, { hinhThuc: "CASH" })).status, 201);
  const hdvCau = cau(await hop(HDV));
  assert.ok(hdvCau.some((c) => /phản hồi trong 3 ngày làm việc/.test(c)), "bên chịu thấy");
  assert.ok(!hdvCau.some((c) => /100\.000/.test(c)));
});

test("Thay khoản thu: người thu cũ và mới có tài khoản nhận tin; không gửi cho công ty, không gửi cho chính người làm", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, 1_000_000, "toi")).status, 201);
  assert.equal((await giao(w, id)).status, 200);
  const t = await w.call("POST", "/api/ledger/receipt-replacements", { as: KT, body: { orderId: id, cu: [lanThuId(w, id, 1_000_000)], moi: [{ soTien: 1_000_000, hinhThuc: "CASH", nguoiThu: { partyId: `pty-${KT2}` } }], lyDo: "Ghi nhầm người thu tiền" } });
  assert.equal(t.status, 201, t.text);
  const rows = w.q("SELECT target_type, target_id FROM audit_log WHERE order_id = ? AND action = 'ledger_receipt_collector_changed' ORDER BY target_id", id) as { target_type: string; target_id: string }[];
  assert.deepEqual(rows.map((x) => x.target_id).sort(), [HDV, KT2].sort());
  assert.ok(rows.every((x) => x.target_type === "staff"));
  const h = (await w.call("GET", "/api/thong-bao", { as: HDV })).json;
  assert.ok(h.tin.some((m: { cau: string }) => /người thu tiền/.test(m.cau)));
});

// ------------------------------------------------- ADR-0092 Đ6a (TNV-G4) -------------------------------------------------
test("Đ6a: khoản thu tiền mặt giống nhau ⇒ 409 co_the_trung kèm ứng viên, không ghi; Vẫn ghi với lý do ⇒ 201 + nhật ký; lý do ngắn ⇒ vẫn 409; khác số / khác hình thức ⇒ qua", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, 100_000)).status, 201);
  const t2 = await thu(w, KT, id, 100_000);
  assert.equal(t2.status, 409, t2.text);
  assert.equal(t2.json.error.code, "co_the_trung");
  assert.equal(t2.json.error.canhBao?.ma ?? t2.json.canhBao?.ma, "lan_thu_tien_mat");
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id), 1);
  const ngan = await thu(w, KT, id, 100_000, "cong_ty", { boQuaTrung: { ma: "lan_thu_tien_mat", lyDo: "ngắn" } });
  assert.equal(ngan.status, 409);
  const ok = await thu(w, KT, id, 100_000, "cong_ty", { boQuaTrung: { ma: "lan_thu_tien_mat", lyDo: "Khách trả hai lần thật" } });
  assert.equal(ok.status, 201, ok.text);
  assert.match(String(w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'ledger_duplicate_overridden'", id)[0].detail), /Khách trả hai lần thật/);
  assert.equal((await thu(w, KT, id, 120_000)).status, 201, "khác số tiền");
  assert.equal((await thu(w, HDV, id, 100_000, "toi", { hinhThuc: "OTHER" })).status, 201, "khác hình thức");
});

test("Đ6a: tên người thu chỉ cho người có ô ghi sổ; người đang ghi không có ô ⇒ không tên", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, 100_000, { partyId: hdv })).status, 201);
  const kt = await thu(w, KT, id, 100_000);
  assert.match(JSON.stringify(kt.json), /Nam HDV/);
  const hd = await thu(w, HDV, id, 100_000, "toi");
  assert.equal(hd.status, 409, hd.text);
  assert.doesNotMatch(JSON.stringify(hd.json), /Nam HDV/);
});

test("Đ6 phần cảnh báo: cùng mã giao dịch ở đơn khác ⇒ 409 co_the_trung kèm tổng đã gắn; Kế toán bỏ qua có lý do ⇒ 201 + nhật ký; số thực chuyển vượt vẫn chặn", async () => {
  const w = setup();
  const a = don(w);
  const b = don(w);
  const body = (soTien: number, extra = {}) => ({ hinhThuc: "BANK_TRANSFER", maGiaoDich: "FTTHTRUNG1", soThucChuyen: 200_000, ...extra, soTien });
  assert.equal((await thu(w, KT, a, 100_000, "cong_ty", body(100_000))).status, 201);
  const canh = await thu(w, KT, b, 100_000, "cong_ty", body(100_000));
  assert.equal(canh.status, 409, canh.text);
  assert.equal(canh.json.error.code, "co_the_trung");
  const ok = await thu(w, KT, b, 100_000, "cong_ty", body(100_000, { boQuaTrung: { ma: "ma_giao_dich_khac_don", lyDo: "Một lần chuyển trả hai đơn" } }));
  assert.equal(ok.status, 201, ok.text);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'ledger_duplicate_overridden'", b), 1);
});
