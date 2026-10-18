// ADR-0092 Đ1, Đ3, Đ4, Đ5a–c (TNV-G4 — phần thi công được; Đ5d tin báo, Đ6 mã giao dịch, Đ6a cảnh báo trùng DỪNG chờ chủ) — hành vi qua ROUTE THẬT trên khung
// thử (tests/audit/harness.mjs: cả ứng dụng + SQLite, lô `db.batch()` là một giao dịch). Lớp CSDL (migration 0082) kiểm riêng ở src/migrations-so-khong-am.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const KT = "44444444-4444-4444-8444-444444444444";
const KT2 = "77777777-7777-4777-8777-777777777777"; // ADR-0115: người duyệt điều chỉnh công nợ — khác người tạo
const AT = "2026-09-01T00:00:00.000Z";
const vnNgay = (d: number) => new Date(Date.now() + 7 * 3600_000 + d * 86400_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [KT2, "0900000008", "Mai Kế Toán", ["ACCOUNTING"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Đơn ĐÃ XÁC NHẬN 1.000.000 (ngày đi sau 10 ngày), người phụ trách = HDV. */
function don(w: W): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?)`).run(id, `TD-${seq}`, SALES, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé Hòn Tằm', 'perPax', 1, ?)`).run(`${id}-s`, id, vnNgay(10));
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 1000000, 1000000)`).run(`${id}-i`, id, `${id}-s`);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const congTy = (w: W) => String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
const thu = (w: W, as: string, orderId: string, soTien: number, nguoiThu: unknown) => w.call("POST", `/api/orders/${orderId}/payments`, { as, body: { soTien, hinhThuc: "CASH", nguoiThu } });
const hoan = (w: W, orderId: string, soTien: number, nguoiTra: unknown) => w.call("POST", "/api/ledger/refunds", { as: KT, body: { orderId, soTien, hinhThuc: "CASH", nguoiTra } });
const dieuChinh = (w: W, body: Record<string, unknown>) => w.call("POST", "/api/ledger/adjustments", { as: KT, body });
/** ADR-0115: lệnh `dieu_chinh` chỉ TẠO yêu cầu (201 "chờ duyệt", số dư chưa đổi); người KHÁC (KT2) duyệt thì số dư mới đổi. */
const duyet = (w: W, requestId: string) => w.call("POST", `/api/ledger/adjustment-requests/${requestId}/approve`, { as: KT2 });
const lanThu = (w: W, orderId: string, kind: string) => String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND kind_code = ? AND reverses_id IS NULL ORDER BY created_at", orderId, kind)[0].id);
const daThuRong = (w: W, orderId: string) => Number(w.q(`SELECT COALESCE(SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END), 0) AS n FROM bil_payment_receipt r
  WHERE r.order_id = ? AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)`, orderId)[0].n);
const soDu = (w: W, orderId: string, ben: string, chu: string) => Number(w.q(`SELECT COALESCE(SUM(CASE WHEN debtor_party_id = ?2 AND creditor_party_id = ?3 THEN amount
  WHEN debtor_party_id = ?3 AND creditor_party_id = ?2 THEN -amount ELSE 0 END), 0) AS n FROM bil_debt_line WHERE order_id = ?1`, orderId, ben, chu)[0].n);

test("Đ1 (KT06): thu 300.000 → hoàn 200.000 → đảo lần thu gốc ⇒ 409 net_paid_negative (đã thu ròng không âm); đảo lần hoàn trước rồi đảo lần thu ⇒ qua", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, 300_000, "cong_ty")).status, 201);
  assert.equal((await hoan(w, id, 200_000, "cong_ty")).status, 201);
  const r = await dieuChinh(w, { loai: "dao_lan_thu", receiptId: lanThu(w, id, "CUSTOMER_PAYMENT"), lyDo: "ghi nhầm lần thu của đơn" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "net_paid_negative");
  assert.match(r.json.error.message, /huỷ khoản trả lại khách trước/);
  assert.equal(daThuRong(w, id), 100_000, "không ghi gì");
  assert.equal((await dieuChinh(w, { loai: "dao_lan_thu", receiptId: lanThu(w, id, "CUSTOMER_REFUND"), lyDo: "hoàn nhầm cho khách" })).status, 201);
  assert.equal((await dieuChinh(w, { loai: "dao_lan_thu", receiptId: lanThu(w, id, "CUSTOMER_PAYMENT"), lyDo: "ghi nhầm lần thu của đơn" })).status, 201);
  assert.equal(daThuRong(w, id), 0);
});

test("Đ3 (KT09): người trả không phải công ty — số hoàn ≤ số người đó đang giữ trên đơn; vượt ⇒ 409 refund_exceeds_held, không ghi; công ty trả thì như cũ", async () => {
  const w = setup();
  const id = don(w);
  const ct = congTy(w);
  assert.equal((await thu(w, HDV, id, 200_000, "toi")).status, 201);
  assert.equal((await thu(w, KT, id, 300_000, "cong_ty")).status, 201, "khách trả thêm cho công ty — đã thu 500.000");
  assert.equal(soDu(w, id, `pty-${HDV}`, ct), 200_000, "HDV đang giữ 200.000");
  const r = await hoan(w, id, 300_000, { partyId: `pty-${HDV}` });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "refund_exceeds_held");
  assert.match(r.json.error.message, /đang giữ 200\.000/);
  assert.equal(daThuRong(w, id), 500_000, "không ghi gì");
  assert.equal((await hoan(w, id, 150_000, { partyId: `pty-${HDV}` })).status, 201);
  assert.equal((await hoan(w, id, 100_000, { partyId: `pty-${HDV}` })).json.error.code, "refund_exceeds_held", "còn giữ 50.000");
  assert.equal((await hoan(w, id, 50_000, "cong_ty")).status, 201, "công ty trả: chỉ ràng số đã thu");
});

test("Đ4: không đảo riêng dòng giữ hộ khi lần thu sinh ra nó còn hiệu lực ⇒ 409 held_single_reversal; đảo lần thu thì dòng giữ hộ đảo theo", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, 200_000, "toi")).status, 201);
  const held = String(w.q("SELECT id FROM bil_debt_line WHERE order_id = ? AND kind_code = 'HELD' AND reverses_line_id IS NULL", id)[0].id);
  const r = await dieuChinh(w, { loai: "dao_dong", lineId: held, lyDo: "đảo thử dòng giữ hộ" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "held_single_reversal");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM bil_debt_line WHERE reverses_line_id = ?", held)[0].n), 0);
  assert.equal((await dieuChinh(w, { loai: "dao_lan_thu", receiptId: lanThu(w, id, "CUSTOMER_PAYMENT"), lyDo: "HDV ghi nhầm lần thu" })).status, 201);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM bil_debt_line WHERE reverses_line_id = ?", held)[0].n), 1);
});

test("Đ5 (KT05) + ADR-0115: điều chỉnh — lý do < 10 ký tự ⇒ 400; giảm nợ vượt số đang nợ (đổi dấu) ⇒ 409; tăng nợ vượt max(phải thu, đã thu ròng) ⇒ 409 (đều lúc TẠO); trong trần ⇒ 201 chờ duyệt, người khác duyệt thì số dư mới đổi, nhật ký ghi số dư trước / sau", async () => {
  const w = setup();
  const id = don(w);
  const ct = congTy(w);
  const hdv = `pty-${HDV}`;
  assert.equal((await thu(w, HDV, id, 200_000, "toi")).status, 201);
  const giam = { loai: "dieu_chinh", orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", lyDo: "bù trừ phần HDV đã chi hộ" };
  assert.equal((await dieuChinh(w, { ...giam, soTien: 100_000, lyDo: "ngắn" })).status, 400, "lý do < 10 ký tự");
  const vuot = await dieuChinh(w, { ...giam, soTien: 300_000 });
  assert.equal(vuot.status, 409, vuot.text);
  assert.equal(vuot.json.error.code, "adjustment_flips_sign");
  assert.equal(soDu(w, id, hdv, ct), 200_000, "không ghi gì");
  const g = await dieuChinh(w, { ...giam, soTien: 200_000 });
  assert.equal(g.status, 201, g.text);
  assert.equal(g.json.choDuyet, true);
  assert.equal(soDu(w, id, hdv, ct), 200_000, "chưa duyệt: số dư KHÔNG đổi");
  assert.equal((await duyet(w, g.json.yeuCauId)).status, 201);
  assert.equal(soDu(w, id, hdv, ct), 0);
  const tang = { loai: "dieu_chinh", orderId: id, benNo: hdv, benDuocNo: ct, loaiDong: "HELD", lyDo: "HDV nhận thêm tiền khách gửi" };
  const thua = await dieuChinh(w, { ...tang, soTien: 10_000_000 });
  assert.equal(thua.status, 409, thua.text);
  assert.equal(thua.json.error.code, "adjustment_exceeds_cap");
  const t = await dieuChinh(w, { ...tang, soTien: 1_000_000 });
  assert.equal(t.status, 201, "bằng phải thu: được tạo");
  assert.equal((await duyet(w, t.json.yeuCauId)).status, 201);
  assert.equal(soDu(w, id, hdv, ct), 1_000_000);
  const nk = w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'ledger_adjustment' ORDER BY created_at", id).map((r: { detail: string }) => r.detail);
  assert.match(nk[0], /trước 200\.000 ₫ → sau 0 ₫/);
  assert.match(nk[1], /trước 0 ₫ → sau 1\.000\.000 ₫/);
});
