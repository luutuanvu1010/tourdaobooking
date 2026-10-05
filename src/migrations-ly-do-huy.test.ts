// Kiểm migration *_ly_do_huy_don.sql (ADR-0089 đ8, X-2, X-3; kế hoạch Đợt 1 Task 5: NT-L3, NT-L6, NT-L7, H-C6). Chèn/sửa THẲNG bằng SQL (không qua mã
// ứng dụng): chứng minh khoá nằm ở CSDL. Tệp tìm theo ĐUÔI tên (CHANGE-GUIDE công thức d). Tên, SĐT ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { hanHoanCoc } from "./modules/billing/rules.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_ly_do_huy_don.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const AT = "2026-09-30T03:00:00.000Z";
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: (string | number | null)[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const run = (db: DatabaseSync, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).run(...a);

function seedStaff(db: DatabaseSync) {
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
}
function seedOrder(db: DatabaseSync, id: string, depart: string | null, updatedAt = AT) {
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 100000, 100000, 100000, ?, ?)`, id, `TD-${id}`, AT, updatedAt);
  run(db, `INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Tour', 'perPax', 1, ?)`, `${id}-svc`, id, depart);
  run(db, `INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 100000, 100000)`, `${id}-it`, id, `${id}-svc`);
}
const lyDo = (db: DatabaseSync, id: string, orderId: string, group: string, extra: { reason?: string; note?: string | null; reclassifies?: string | null; date?: string; legacy?: number } = {}) =>
  run(db, `INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 's1', ?, 's1')`, id, orderId, extra.reason ?? "KHACH_DOI_Y", group, extra.note ?? null, extra.date ?? "2026-10-05",
    extra.reclassifies ?? null, extra.legacy ?? 0, AT, AT);

test("migration lý do huỷ tồn tại đúng một tệp", () => {
  assert.ok(FILE, "thiếu migrations/*_ly_do_huy_don.sql");
  assert.equal(files.filter((f) => f.endsWith("_ly_do_huy_don.sql")).length, 1);
});

test("NT-L3 (H-C6): đổi đơn sang 'huỷ' bằng SQL thẳng mà thiếu dòng lý do → CSDL chặn; có dòng lý do thì qua; trước migration thì không chặn", () => {
  const truoc = open(files.filter((f) => f < FILE!));
  seedStaff(truoc);
  seedOrder(truoc, "o0", "2026-11-10");
  run(truoc, "UPDATE orders SET status = 'cancelled' WHERE id = 'o0'"); // trước migration: không chặn (đỏ của luật cũ)
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "o1", "2026-11-10");
  assert.throws(() => run(db, "UPDATE orders SET status = 'cancelled' WHERE id = 'o1'"), /cancel_reason_required:/);
  lyDo(db, "r1", "o1", "KHACH_HUY");
  run(db, "UPDATE orders SET status = 'cancelled' WHERE id = 'o1'");
  assert.equal(rows(db, "SELECT status FROM orders WHERE id = 'o1'")[0]!.status, "cancelled");
  // Câu giữ nguyên 'cancelled' (cột status có trong SET) không bị chặn lại.
  run(db, "UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = 'o1'", "2026-10-05T00:00:00.000Z");
});

test("NT-L7: gieo đơn huỷ cũ — đúng số dòng, nhóm 'chưa kết luận', mã LEGACY, legacy = 1, người ghi 'he-thong', ngày huỷ = ngày VN của nhật ký huỷ mới nhất / updated_at; cột của orders không đổi", () => {
  const db = open(files.filter((f) => f < FILE!));
  seedStaff(db);
  seedOrder(db, "a", "2026-11-10");
  seedOrder(db, "b", null, "2026-09-20T18:30:00.000Z"); // không nhật ký → updated_at 18:30 UTC = 01:30 ngày 21/9 giờ VN
  seedOrder(db, "c", "2026-11-12");
  seedOrder(db, "d", "2026-11-12"); // còn xác nhận — không gieo
  for (const id of ["a", "b", "c"]) run(db, "UPDATE orders SET status = 'cancelled' WHERE id = ?", id);
  run(db, "UPDATE orders SET updated_at = ? WHERE id = 'b'", "2026-09-20T18:30:00.000Z");
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = 'd'", AT);
  const nk = (id: string, orderId: string, action: string, at: string) =>
    run(db, "INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, 's1', ?, 'order', ?, NULL, ?)", id, orderId, action, orderId, at);
  nk("n1", "a", "cancelled", "2026-10-01T16:59:59.000Z"); // 23:59:59 ngày 1/10 giờ VN
  nk("n2", "a", "cancelled", "2026-10-01T17:00:00.000Z"); // mới nhất: 00:00 ngày 2/10 giờ VN
  nk("n3", "c", "order_cancelled_by_field", "2026-09-28T05:00:00.000Z");
  const chupDon = rows(db, "SELECT * FROM orders ORDER BY id");
  db.exec(sqlOf(FILE!));
  const g = rows(db, "SELECT order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_by FROM ord_cancel_reason ORDER BY order_id");
  assert.deepEqual(g, [
    { order_id: "a", reason_code: "LEGACY", group_code: "CHUA_KET_LUAN", note: null, cancelled_date: "2026-10-02", reclassifies_id: null, legacy: 1, created_by: "he-thong" },
    { order_id: "b", reason_code: "LEGACY", group_code: "CHUA_KET_LUAN", note: null, cancelled_date: "2026-09-21", reclassifies_id: null, legacy: 1, created_by: "he-thong" },
    { order_id: "c", reason_code: "LEGACY", group_code: "CHUA_KET_LUAN", note: null, cancelled_date: "2026-09-28", reclassifies_id: null, legacy: 1, created_by: "he-thong" },
  ]);
  assert.equal(g.length, (rows(db, "SELECT count(*) AS n FROM orders WHERE status = 'cancelled'")[0]!.n as number), "số dòng gieo = số đơn huỷ");
  assert.deepEqual(rows(db, "SELECT * FROM orders ORDER BY id"), chupDon, "mọi giá trị cột của orders không đổi");
});

test("chỉ-thêm; mỗi đơn một dòng gốc; 'Khác' bắt ghi chú; ghi chú ≤ 300 ký tự; ngày huỷ đúng dạng", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "o1", "2026-11-10");
  lyDo(db, "r1", "o1", "KHACH_HUY");
  assert.throws(() => run(db, "UPDATE ord_cancel_reason SET group_code = 'CONG_TY_HUY' WHERE id = 'r1'"), /ord_append_only:/);
  assert.throws(() => run(db, "DELETE FROM ord_cancel_reason WHERE id = 'r1'"), /ord_append_only:/);
  assert.throws(() => lyDo(db, "r2", "o1", "LAP_LAI"), /UNIQUE constraint failed/);
  seedOrder(db, "o2", "2026-11-10");
  assert.throws(() => lyDo(db, "r3", "o2", "CHUA_KET_LUAN", { reason: "OTHER" }), /CHECK constraint failed/);
  assert.throws(() => lyDo(db, "r4", "o2", "CHUA_KET_LUAN", { reason: "OTHER", note: "x".repeat(301) }), /CHECK constraint failed/);
  assert.throws(() => lyDo(db, "r5", "o2", "KHACH_HUY", { date: "05/10/2026" }), /CHECK constraint failed/);
});

test("NT-L6 (X-2): phân loại chỉ từ dòng 'chưa kết luận' của cùng đơn sang nhóm khác, một lần; giữ ngày huỷ và cờ legacy", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "o1", "2026-11-10");
  seedOrder(db, "o2", "2026-11-10");
  lyDo(db, "ck", "o1", "CHUA_KET_LUAN", { reason: "OTHER", note: "Khách ốm" });
  lyDo(db, "kh", "o2", "KHACH_HUY");
  const pl = (id: string, orderId: string, group: string, target: string, date = "2026-10-05", legacy = 0) =>
    lyDo(db, id, orderId, group, { reason: "PHAN_LOAI", note: "Đã gọi khách", reclassifies: target, date, legacy });
  assert.throws(() => pl("x1", "o2", "CONG_TY_HUY", "kh"), /cancel_reclassify_invalid:/, "đích đã kết luận");
  assert.throws(() => pl("x2", "o2", "KHACH_HUY", "ck"), /cancel_reclassify_invalid:/, "khác đơn");
  assert.throws(() => pl("x3", "o1", "CHUA_KET_LUAN", "ck"), /cancel_reclassify_invalid:/, "không đổi sang chưa kết luận");
  assert.throws(() => pl("x4", "o1", "KHACH_HUY", "ck", "2026-10-06"), /cancel_reclassify_invalid:/, "đổi ngày huỷ");
  assert.throws(() => pl("x5", "o1", "KHACH_HUY", "ck", "2026-10-05", 1), /cancel_reclassify_invalid:/, "đổi cờ legacy");
  pl("ok", "o1", "KHACH_HUY", "ck");
  assert.throws(() => pl("x6", "o1", "CONG_TY_HUY", "ck"), /UNIQUE constraint failed|cancel_reclassify_invalid:/, "dòng gốc đã được phân loại");
  const v = rows(db, "SELECT order_id, group_code FROM v_ord_cancel_state ORDER BY order_id");
  assert.deepEqual(v, [{ order_id: "o1", group_code: "KHACH_HUY" }, { order_id: "o2", group_code: "KHACH_HUY" }], "view: một dòng hiện hành mỗi đơn");
});

test("đối chiếu hai nơi: refund_deadline của view = hanHoanCoc (TS) — ngày đi muộn nhất + 60; không ngày đi → ngày huỷ + 60", () => {
  const db = open(files);
  seedStaff(db);
  const ca: { id: string; ngay: (string | null)[]; huy: string }[] = [
    { id: "m1", ngay: ["2026-11-10"], huy: "2026-10-05" },
    { id: "m2", ngay: ["2026-11-10", "2026-12-31"], huy: "2026-10-05" },
    { id: "m3", ngay: [null], huy: "2026-10-05" },
    { id: "m4", ngay: ["2027-01-01", null], huy: "2026-12-30" },
  ];
  for (const c of ca) {
    seedOrder(db, c.id, c.ngay[0]!);
    c.ngay.slice(1).forEach((d, i) => run(db, `INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Tour 2', 'perPax', 1, ?)`, `${c.id}-svc${i + 2}`, c.id, d));
    lyDo(db, `r-${c.id}`, c.id, "KHACH_HUY", { date: c.huy });
    const v = rows(db, "SELECT refund_deadline FROM v_ord_cancel_state WHERE order_id = ?", c.id)[0]!;
    assert.equal(v.refund_deadline, hanHoanCoc({ ngayDi: c.ngay, ngayHuy: c.huy }), c.id);
  }
});
