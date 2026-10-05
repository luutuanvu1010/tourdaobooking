// Kiểm migration *_billing_coc_don_huy.sql (ADR-0089 đ2, đ4, đ5, đ6, đ15, đ16, X-2…X-4; kế hoạch Đợt 1 Task 7). Chèn THẲNG bằng SQL (không qua mã ứng dụng):
// chứng minh khoá nằm ở CSDL — mỗi trigger một ca chặn + một ca qua; bài ĐỐI CHIẾU HAI NƠI: view `v_bil_coc_don` ↔ hàm `soTienCoc` (rules.ts) trên cùng dữ liệu.
// Khoá ngoại TẮT (chỉ cần bảng orders / bil_ / ord_cancel_reason; không dựng hồ sơ người) — CHECK và trigger vẫn chạy. Tên ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { soTienCoc, type DuyetRow, type HoanNgoaiRow, type LineRow, type ReceiptRow } from "./modules/billing/rules.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_billing_coc_don_huy.sql"));
const AT = "2026-10-05T03:00:00.000Z";
const CT = "cong-ty";
type V = string | number | null;

function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
const one = (db: DatabaseSync, sql: string, ...a: V[]) => ({ ...(db.prepare(sql).get(...a) as Record<string, unknown>) });

/** Đơn `id`: một dịch vụ ngày đi `depart`; `huy` = nhóm lý do huỷ (null = còn xác nhận). */
function don(db: DatabaseSync, id: string, o: { huy?: string | null; depart?: string | null; legacy?: number; ngayHuy?: string } = {}) {
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 2000000, 2000000, 2000000, ?, ?)`, id, `TD-${id}`, AT, AT);
  run(db, `INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Tour', 'perPax', 1, ?)`, `${id}-s`, id, o.depart === undefined ? "2026-11-10" : o.depart);
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?", AT, id);
  if (o.huy) {
    run(db, `INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, 's1', ?, 's1')`, `lydo-${id}`, id, o.huy === "CHUA_KET_LUAN" ? "OTHER" : "X", o.huy, o.huy === "CHUA_KET_LUAN" ? "ghi chú" : null, o.ngayHuy ?? "2026-10-20", o.legacy ?? 0, AT, AT);
    run(db, "UPDATE orders SET status = 'cancelled' WHERE id = ?", id);
  }
}
/** Huỷ một đơn đang xác nhận (dòng lý do trước, rồi đổi trạng thái — như lô huỷ thật). */
function huyDon(db: DatabaseSync, id: string, nhom: string) {
  run(db, `INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'X', ?, NULL, '2026-10-20', NULL, 0, ?, 's1', ?, 's1')`, `lydo-${id}`, id, nhom, AT, AT);
  run(db, "UPDATE orders SET status = 'cancelled' WHERE id = ?", id);
}
let n = 0;
interface Thu { id?: string; order: string; amount: number; kind?: "CUSTOMER_PAYMENT" | "CUSTOMER_REFUND"; role?: string; collector?: string | null; by?: string; approval?: string | null; transferOf?: string | null; reverses?: string | null }
function thu(db: DatabaseSync, t: Thu): string {
  const id = t.id ?? `r${++n}`;
  run(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by, approval_id, transfer_of_id)
    VALUES (?, ?, ?, ?, ?, ?, 'CASH', ?, 'PREPAID', '2026-10-05', ?, NULL, ?, ?, ?, ?, ?, ?)`,
    id, t.order, t.kind ?? "CUSTOMER_PAYMENT", t.amount, t.collector === undefined ? CT : t.collector, t.role ?? "COMPANY", CT, t.reverses ?? null, AT, t.by ?? "kt", AT, t.by ?? "kt", t.approval ?? null, t.transferOf ?? null);
  return id;
}
/** Dòng giữ hộ (HELD) của lần thu `receipt` trên `debtor` — "Công ty thu – CK" do người khác khai. */
function held(db: DatabaseSync, order: string, receipt: string, debtor: string, amount: number, reverses: string | null = null): string {
  const id = `l${++n}`;
  run(db, `INSERT INTO bil_posting (id, kind_code, order_id, occurred_date, created_at, updated_at) VALUES (?, 'RECEIPT', ?, '2026-10-05', ?, ?)`, `p${id}`, order, AT, AT);
  run(db, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'HELD', ?, ?, ?, ?, ?)`, id, `p${id}`, reverses ? CT : debtor, reverses ? debtor : CT, amount, order, receipt, reverses, AT, AT);
  return id;
}
interface Duyet { id?: string; order: string; amount: number; kind?: "REFUND" | "TRANSFER"; target?: string | null; by?: string; date?: string; voids?: string | null }
function duyet(db: DatabaseSync, d: Duyet): string {
  const id = d.id ?? `d${++n}`;
  run(db, `INSERT INTO bil_deposit_approval (id, order_id, kind_code, amount, target_order_id, reason, approved_date, voids_id, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, 'lý do', ?, ?, ?, ?, ?, ?)`, id, d.order, d.kind ?? "REFUND", d.amount, d.target ?? null, d.date ?? "2026-10-25", d.voids ?? null, AT, d.by ?? "qt", AT, d.by ?? "qt");
  return id;
}
function ngoai(db: DatabaseSync, o: { id?: string; order: string; kind: "RECORD" | "CONFIRM" | "REJECT"; amount?: number | null; target?: string | null; by: string }): string {
  const id = o.id ?? `h${++n}`;
  run(db, `INSERT INTO bil_outside_refund (id, order_id, kind_code, amount, reason, target_id, occurred_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, '2026-10-05', ?, ?, ?, ?)`, id, o.order, o.kind, o.amount ?? null, o.kind === "CONFIRM" ? null : "lý do", o.target ?? null, AT, o.by, AT, o.by);
  return id;
}
const coc = (db: DatabaseSync, order: string) => one(db, "SELECT * FROM v_bil_coc_don WHERE order_id = ?", order);

test("migration cọc đơn huỷ tồn tại đúng một tệp, sau migration lý do huỷ", () => {
  assert.ok(FILE, "thiếu migrations/*_billing_coc_don_huy.sql");
  assert.ok(FILE! > files.find((f) => f.endsWith("_ly_do_huy_don.sql"))!, "cần v_ord_cancel_state của migration lý do huỷ");
});

test("duyệt (đ4a, đ5, X-2): đơn chưa huỷ / chưa kết luận / khách huỷ quá hạn / vượt tiền còn giữ lúc huỷ / chuyển sang đơn huỷ → CSDL chặn; ca hợp lệ qua", () => {
  const db = moi();
  don(db, "xn");
  thu(db, { order: "xn", amount: 500_000 });
  assert.throws(() => duyet(db, { order: "xn", amount: 1 }), /coc_not_cancelled:/);
  don(db, "ck", { huy: "CHUA_KET_LUAN" });
  thu(db, { order: "ck", amount: 500_000 });
  assert.throws(() => duyet(db, { order: "ck", amount: 1 }), /coc_unclassified:/);
  don(db, "kh", { huy: "KHACH_HUY", depart: "2026-11-10" });
  thu(db, { order: "kh", amount: 500_000 });
  duyet(db, { order: "kh", amount: 100_000, date: "2027-01-09" }); // biên: đúng hạn
  assert.throws(() => duyet(db, { order: "kh", amount: 100_000, date: "2027-01-10" }), /coc_deadline:/);
  don(db, "ct", { huy: "CONG_TY_HUY", depart: "2026-11-10" });
  thu(db, { order: "ct", amount: 500_000 });
  duyet(db, { order: "ct", amount: 400_000, date: "2027-03-01" }); // công ty huỷ: hạn không chặn
  assert.throws(() => duyet(db, { order: "ct", amount: 100_001 }), /coc_exceeds_paid:/);
  duyet(db, { order: "ct", amount: 100_000 });
  don(db, "huy2", { huy: "KHACH_HUY" });
  don(db, "lap", { huy: "LAP_LAI" });
  thu(db, { order: "lap", amount: 300_000 });
  assert.throws(() => duyet(db, { order: "lap", amount: 1, kind: "TRANSFER", target: "huy2" }), /coc_bad_target:/);
  assert.throws(() => duyet(db, { order: "lap", amount: 1, kind: "TRANSFER", target: null }), /CHECK constraint failed|coc_bad_target:/);
  don(db, "moi");
  duyet(db, { order: "lap", amount: 300_000, kind: "TRANSFER", target: "moi", date: "2027-05-01" }); // lập lại: hạn không chặn
});

test("đ15 + lời chủ (c): trần duyệt = đã trả − hoàn trước huỷ; khoản 'Công ty thu – CK' chờ xác nhận chưa tính (SV-DH-10, SV-DH-13)", () => {
  const db = moi();
  don(db, "a");
  thu(db, { order: "a", amount: 1_200_000 });
  thu(db, { order: "a", amount: 200_000, kind: "CUSTOMER_REFUND" }); // hoàn dư TRƯỚC khi huỷ (đơn còn xác nhận)
  huyDon(db, "a", "KHACH_HUY");
  assert.throws(() => duyet(db, { order: "a", amount: 1_000_001 }), /coc_exceeds_paid:/);
  duyet(db, { order: "a", amount: 1_000_000 });
  const b = "b";
  don(db, b, { huy: "KHACH_HUY" });
  const ck = thu(db, { order: b, amount: 300_000, role: "COMPANY", by: "hdv" });
  const l = held(db, b, ck, "hdv", 300_000);
  assert.throws(() => duyet(db, { order: b, amount: 1 }), /coc_exceeds_paid:/, "chờ xác nhận: đã trả 0");
  held(db, b, ck, "hdv", 300_000, l); // Kế toán "Công ty đã nhận" = đảo dòng giữ hộ
  duyet(db, { order: b, amount: 300_000 });
});

test("H-C7: đơn HUỶ chỉ hoàn qua khoản duyệt — trả lại khách không khoản duyệt bị chặn; đơn không huỷ trả dư như cũ", () => {
  const db = moi();
  don(db, "h", { huy: "KHACH_HUY" });
  thu(db, { order: "h", amount: 500_000 });
  assert.throws(() => thu(db, { order: "h", amount: 100_000, kind: "CUSTOMER_REFUND" }), /coc_needs_approval:/);
  don(db, "x");
  thu(db, { order: "x", amount: 500_000 });
  thu(db, { order: "x", amount: 100_000, kind: "CUSTOMER_REFUND" });
});

test("chi hoàn (đ4b, đ4c): gắn khoản gốc của chính đơn; không vượt phần còn lại; người chi ≠ người duyệt; huỷ duyệt chỉ phần chưa chi", () => {
  const db = moi();
  don(db, "a", { huy: "KHACH_HUY" });
  thu(db, { order: "a", amount: 500_000 });
  const d = duyet(db, { order: "a", amount: 400_000, by: "qt" });
  assert.throws(() => thu(db, { order: "a", amount: 100_000, kind: "CUSTOMER_REFUND", approval: d, by: "qt" }), /coc_same_person:/);
  thu(db, { order: "a", amount: 150_000, kind: "CUSTOMER_REFUND", approval: d, by: "kt" });
  assert.throws(() => thu(db, { order: "a", amount: 250_001, kind: "CUSTOMER_REFUND", approval: d, by: "kt" }), /coc_exceeds_approved:/);
  assert.throws(() => duyet(db, { order: "a", amount: 250_001, voids: d }), /coc_void_exceeds_unspent:/);
  const huy = duyet(db, { order: "a", amount: 250_000, voids: d });
  assert.throws(() => duyet(db, { order: "a", amount: 1, voids: d }), /UNIQUE constraint failed/, "mỗi khoản huỷ duyệt một lần");
  assert.throws(() => thu(db, { order: "a", amount: 1, kind: "CUSTOMER_REFUND", approval: d, by: "kt" }), /coc_exceeds_approved:/);
  assert.throws(() => thu(db, { order: "a", amount: 1, kind: "CUSTOMER_REFUND", approval: huy, by: "kt" }), /coc_bad_approval:/, "không gắn dòng huỷ duyệt");
  const d3 = duyet(db, { order: "a", amount: 50_000, by: "qt" });
  don(db, "b", { huy: "KHACH_HUY" });
  thu(db, { order: "b", amount: 500_000 });
  assert.throws(() => thu(db, { order: "b", amount: 1, kind: "CUSTOMER_REFUND", approval: d3, by: "kt" }), /coc_bad_approval:/, "khoản của đơn khác");
  const v = coc(db, "a");
  assert.deepEqual([v.da_duyet, v.da_chi, v.con_giu, v.cho_chi], [200_000, 150_000, 350_000, 50_000]);
});

test("chuyển (đ6, NT-H8): nửa thu ở đơn nhận phải khớp nửa chi (đơn nhận, số, người giữ); lệch → chặn; một nửa chi có tối đa một nửa thu", () => {
  const db = moi();
  don(db, "a", { huy: "CONG_TY_HUY" });
  don(db, "b");
  don(db, "c");
  thu(db, { order: "a", amount: 500_000, role: "STAFF", collector: "hdv-x", by: "hdv-x" });
  const d = duyet(db, { order: "a", amount: 500_000, kind: "TRANSFER", target: "b" });
  const ra = thu(db, { order: "a", amount: 500_000, kind: "CUSTOMER_REFUND", role: "STAFF", collector: "hdv-x", approval: d, by: "kt" });
  assert.throws(() => thu(db, { order: "c", amount: 500_000, role: "STAFF", collector: "hdv-x", transferOf: ra }), /coc_transfer_mismatch:/, "sai đơn nhận");
  assert.throws(() => thu(db, { order: "b", amount: 499_999, role: "STAFF", collector: "hdv-x", transferOf: ra }), /coc_transfer_mismatch:/, "lệch số");
  assert.throws(() => thu(db, { order: "b", amount: 500_000, role: "STAFF", collector: "hdv-y", transferOf: ra }), /coc_transfer_mismatch:/, "lệch người giữ");
  thu(db, { order: "b", amount: 500_000, role: "STAFF", collector: "hdv-x", transferOf: ra });
  assert.throws(() => thu(db, { order: "b", amount: 500_000, role: "STAFF", collector: "hdv-x", transferOf: ra }), /UNIQUE constraint failed/);
  const va = coc(db, "a");
  assert.deepEqual([va.da_chuyen, va.con_giu], [500_000, 0]);
  assert.equal(coc(db, "b").da_tra, 500_000);
});

test("NT-B2/B3 (đ15 MỌI LÚC): đảo lần thu làm đã trả dưới tổng duyệt → chặn; huỷ duyệt rồi đảo → qua; 'Thay lần thu' giả lập (thu mới TRƯỚC, đảo SAU, một lô) → qua", () => {
  const db = moi();
  don(db, "a", { huy: "KHACH_HUY" });
  const goc = thu(db, { order: "a", amount: 500_000 });
  const d = duyet(db, { order: "a", amount: 400_000 });
  assert.throws(() => thu(db, { order: "a", amount: 500_000, reverses: goc }), /coc_paid_below_approved:/);
  // "Thay lần thu" giả lập: ghi lần thu đúng 450.000 trước, rồi đảo lần thu cũ — một giao dịch.
  db.exec("BEGIN");
  thu(db, { order: "a", amount: 450_000 });
  thu(db, { order: "a", amount: 500_000, reverses: goc });
  db.exec("COMMIT");
  assert.equal(coc(db, "a").da_tra, 450_000);
  // Thay bằng số NHỎ hơn tổng duyệt → cả lô bị chặn.
  const lan2 = (one(db, "SELECT id FROM bil_payment_receipt WHERE order_id = 'a' AND amount = 450000 AND reverses_id IS NULL") as { id: string }).id;
  db.exec("BEGIN");
  thu(db, { order: "a", amount: 300_000 });
  assert.throws(() => thu(db, { order: "a", amount: 450_000, reverses: lan2 }), /coc_paid_below_approved:/);
  db.exec("ROLLBACK");
  duyet(db, { order: "a", amount: 400_000, voids: d });
  thu(db, { order: "a", amount: 450_000, reverses: lan2 }); // không còn duyệt → đảo được
  assert.deepEqual([coc(db, "a").da_tra, coc(db, "a").da_duyet], [0, 0]);
});

test("đ16 (X-3, X-4, lời chủ (b)): hoàn ngoài chỉ đơn cũ; một dòng đang hiệu lực; ≤ còn giữ; người ghi không tự xác nhận / từ chối; bị từ chối thì ghi lại được; xác nhận tính cả duyệt lẫn chi", () => {
  const db = moi();
  don(db, "moi-huy", { huy: "KHACH_HUY" });
  thu(db, { order: "moi-huy", amount: 300_000 });
  assert.throws(() => ngoai(db, { order: "moi-huy", kind: "RECORD", amount: 1, by: "sa" }), /coc_outside_not_legacy:/);
  don(db, "cu", { huy: "CHUA_KET_LUAN", legacy: 1, depart: "2026-09-20" });
  thu(db, { order: "cu", amount: 300_000 });
  assert.throws(() => ngoai(db, { order: "cu", kind: "RECORD", amount: 300_001, by: "sa" }), /coc_outside_exceeds:/);
  const g1 = ngoai(db, { order: "cu", kind: "RECORD", amount: 200_000, by: "sa" });
  assert.throws(() => ngoai(db, { order: "cu", kind: "RECORD", amount: 1, by: "sa" }), /coc_outside_once:/);
  assert.throws(() => ngoai(db, { order: "cu", kind: "REJECT", target: g1, by: "sa" }), /coc_same_person:/);
  ngoai(db, { order: "cu", kind: "REJECT", target: g1, by: "qt" });
  assert.throws(() => ngoai(db, { order: "cu", kind: "CONFIRM", target: g1, by: "qt2" }), /UNIQUE constraint failed/, "mỗi dòng ghi một quyết định");
  const g2 = ngoai(db, { order: "cu", kind: "RECORD", amount: 300_000, by: "sa" }); // bị từ chối → ghi lại được
  assert.deepEqual([coc(db, "cu").con_giu, coc(db, "cu").da_duyet], [300_000, 0], "chưa xác nhận: không tính");
  assert.throws(() => ngoai(db, { order: "cu", kind: "CONFIRM", target: g2, by: "sa" }), /coc_same_person:/);
  ngoai(db, { order: "cu", kind: "CONFIRM", target: g2, by: "qt" });
  const v = coc(db, "cu");
  assert.deepEqual([v.da_duyet, v.da_chi, v.hoan_ngoai, v.con_giu, v.cho_chi], [300_000, 300_000, 300_000, 0, 0]);
  assert.throws(() => ngoai(db, { order: "cu", kind: "RECORD", amount: 1, by: "sa" }), /coc_outside_once:|coc_outside_exceeds:/);
  assert.throws(() => duyet(db, { order: "cu", amount: 1 }), /coc_unclassified:|coc_exceeds_paid:/);
});

test("chỉ-thêm: khoản duyệt và dòng hoàn ngoài không sửa, không xoá", () => {
  const db = moi();
  don(db, "a", { huy: "CONG_TY_HUY" });
  thu(db, { order: "a", amount: 500_000 });
  const d = duyet(db, { order: "a", amount: 100_000 });
  assert.throws(() => run(db, "UPDATE bil_deposit_approval SET amount = 1 WHERE id = ?", d), /bil_append_only:/);
  assert.throws(() => run(db, "DELETE FROM bil_deposit_approval WHERE id = ?", d), /bil_append_only:/);
  don(db, "cu", { huy: "CHUA_KET_LUAN", legacy: 1 });
  thu(db, { order: "cu", amount: 100_000 });
  const g = ngoai(db, { order: "cu", kind: "RECORD", amount: 100_000, by: "sa" });
  assert.throws(() => run(db, "UPDATE bil_outside_refund SET amount = 1 WHERE id = ?", g), /bil_append_only:/);
  assert.throws(() => run(db, "DELETE FROM bil_outside_refund WHERE id = ?", g), /bil_append_only:/);
});

test("NT-3 đối chiếu hai nơi: view v_bil_coc_don = soTienCoc (rules.ts) trên cùng dữ liệu mẫu (thu đã xác nhận + chờ xác nhận, hoàn trước huỷ, duyệt, huỷ duyệt, chi, chuyển, hoàn ngoài, đảo)", () => {
  const db = moi();
  don(db, "a", { huy: "CHUA_KET_LUAN", legacy: 1 });
  const receipts: ReceiptRow[] = [];
  const lines: LineRow[] = [];
  const dsDuyet: DuyetRow[] = [];
  const dsNgoai: HoanNgoaiRow[] = [];
  const t = (x: Thu) => {
    const id = thu(db, x);
    receipts.push({ id, kind: x.kind ?? "CUSTOMER_PAYMENT", amount: x.amount, collectorRole: (x.role ?? "COMPANY") as ReceiptRow["collectorRole"], collectorPartyId: x.collector === undefined ? CT : x.collector, reversesId: x.reverses ?? null, approvalId: x.approval ?? null });
    return id;
  };
  const tm = t({ order: "a", amount: 700_000, role: "STAFF", collector: "hdv", by: "hdv" });
  const ck = t({ order: "a", amount: 300_000, role: "COMPANY", by: "hdv" });
  const lh = held(db, "a", ck, "hdv", 300_000);
  lines.push({ id: lh, debtorPartyId: "hdv", creditorPartyId: CT, amount: 300_000, kind: "HELD", orderId: "a", receiptId: ck, reversesLineId: null });
  const ck2 = t({ order: "a", amount: 50_000, role: "COMPANY", by: "hdv" });
  const lh2 = held(db, "a", ck2, "hdv", 50_000);
  lines.push({ id: lh2, debtorPartyId: "hdv", creditorPartyId: CT, amount: 50_000, kind: "HELD", orderId: "a", receiptId: ck2, reversesLineId: null });
  const lh2d = held(db, "a", ck2, "hdv", 50_000, lh2); // ck2 đã xác nhận
  lines.push({ id: lh2d, debtorPartyId: CT, creditorPartyId: "hdv", amount: 50_000, kind: "HELD", orderId: "a", receiptId: ck2, reversesLineId: lh2 });
  const nho = t({ order: "a", amount: 20_000 });
  t({ order: "a", amount: 20_000, reverses: nho }); // cặp gốc/đảo bỏ
  // phân loại để duyệt được
  run(db, `INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
    VALUES ('pl-a', 'a', 'PHAN_LOAI', 'CONG_TY_HUY', 'đã gọi', '2026-10-20', 'lydo-a', 1, ?, 'qt', ?, 'qt')`, AT, AT);
  const d1 = duyet(db, { order: "a", amount: 300_000, by: "qt" });
  dsDuyet.push({ id: d1, kind: "REFUND", amount: 300_000, voidsId: null, targetOrderId: null, createdBy: "qt", approvedDate: "2026-10-25" });
  don(db, "b");
  const d2 = duyet(db, { order: "a", amount: 100_000, kind: "TRANSFER", target: "b", by: "qt" });
  dsDuyet.push({ id: d2, kind: "TRANSFER", amount: 100_000, voidsId: null, targetOrderId: "b", createdBy: "qt", approvedDate: "2026-10-25" });
  t({ order: "a", amount: 120_000, kind: "CUSTOMER_REFUND", role: "COMPANY", approval: d1, by: "kt" });
  const ra = t({ order: "a", amount: 100_000, kind: "CUSTOMER_REFUND", role: "STAFF", collector: "hdv", approval: d2, by: "kt" });
  thu(db, { order: "b", amount: 100_000, role: "STAFF", collector: "hdv", transferOf: ra });
  const v1 = duyet(db, { order: "a", amount: 80_000, voids: d1 });
  dsDuyet.push({ id: v1, kind: "REFUND", amount: 80_000, voidsId: d1, targetOrderId: null, createdBy: "qt", approvedDate: "2026-10-25" });
  const g = ngoai(db, { order: "a", kind: "RECORD", amount: 50_000, by: "sa" });
  dsNgoai.push({ id: g, kind: "RECORD", amount: 50_000, targetId: null, createdBy: "sa" });
  const x = ngoai(db, { order: "a", kind: "CONFIRM", target: g, by: "qt" });
  dsNgoai.push({ id: x, kind: "CONFIRM", amount: null, targetId: g, createdBy: "qt" });
  void tm;
  const ma = soTienCoc({ receipts, lines, duyet: dsDuyet, hoanNgoai: dsNgoai });
  const v = coc(db, "a");
  assert.deepEqual(
    { da_tra: v.da_tra, dang_doi_chieu: v.dang_doi_chieu, hoan_truoc_huy: v.hoan_truoc_huy, da_duyet: v.da_duyet, da_chi: v.da_chi, da_chuyen: v.da_chuyen, hoan_ngoai: v.hoan_ngoai, con_giu_luc_huy: v.con_giu_luc_huy, con_giu: v.con_giu, cho_chi: v.cho_chi },
    { da_tra: ma.daTra, dang_doi_chieu: ma.dangDoiChieu, hoan_truoc_huy: ma.hoanTruocHuy, da_duyet: ma.daDuyet, da_chi: ma.daChi, da_chuyen: ma.daChuyen, hoan_ngoai: ma.hoanNgoai, con_giu_luc_huy: ma.conGiuLucHuy, con_giu: ma.conGiu, cho_chi: ma.choChi },
  );
  assert.deepEqual([ma.daTra, ma.dangDoiChieu, ma.daDuyet, ma.daChi, ma.daChuyen, ma.conGiu], [750_000, 300_000, 370_000, 170_000, 100_000, 480_000], "số tay (chống cùng sai)");
});

test("NT-3 + ADR-0092 Đ2b (V2.3): khoản 'Công ty thu – CK' đã được người khai NỘP bù thì hết 'chờ xác nhận' ở CẢ hai nơi (view = soTienCoc)", () => {
  const db = moi();
  don(db, "a", { huy: "KHACH_HUY" });
  const ck = thu(db, { order: "a", amount: 300_000, role: "COMPANY", by: "hdv" });
  const lh = held(db, "a", ck, "hdv", 300_000);
  const receipts: ReceiptRow[] = [{ id: ck, kind: "CUSTOMER_PAYMENT", amount: 300_000, collectorRole: "COMPANY", collectorPartyId: CT, reversesId: null, approvalId: null }];
  const lines: LineRow[] = [{ id: lh, debtorPartyId: "hdv", creditorPartyId: CT, amount: 300_000, kind: "HELD", orderId: "a", receiptId: ck, reversesLineId: null }];
  const so = (x: LineRow[]) => soTienCoc({ receipts, lines: x, duyet: [], hoanNgoai: [] });
  assert.deepEqual([coc(db, "a").dang_doi_chieu, so(lines).dangDoiChieu], [300_000, 300_000], "trước khi nộp: đang đối chiếu ở cả hai nơi");
  // Kế toán ghi "Đã nộp" 300.000 (dòng quyết toán công ty → người khai) — tiền đã về theo đường nộp bù.
  run(db, `INSERT INTO bil_posting (id, kind_code, order_id, occurred_date, created_at, updated_at) VALUES ('pn', 'SETTLEMENT', 'a', '2026-10-05', ?, ?)`, AT, AT);
  run(db, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
    VALUES ('ln', 'pn', ?, 'hdv', 300000, 'SETTLEMENT', 'a', NULL, NULL, ?, ?)`, CT, AT, AT);
  const sau = [...lines, { id: "ln", debtorPartyId: CT, creditorPartyId: "hdv", amount: 300_000, kind: "SETTLEMENT" as const, orderId: "a", receiptId: null, reversesLineId: null }];
  const v = coc(db, "a");
  assert.deepEqual([v.da_tra, v.dang_doi_chieu], [so(sau).daTra, so(sau).dangDoiChieu]);
  assert.deepEqual([so(sau).daTra, so(sau).dangDoiChieu], [300_000, 0], "đã nộp bù ⇒ tính vào đã trả, hết đối chiếu");
});
