// Kiểm migration 0017 (trigger bảo vệ luật chuyển trạng thái đơn + nhật ký chỉ-thêm) trên SQLite thật (node:sqlite).
// Báo cáo đối chiếu Oracle TCA bản 2, P-2 và P-5: mã đã chặn đủ; đây là lưới ở CSDL cho SQL chạy tay và mã viết sau.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

function open(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-09-21T00:00:00.000Z";
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);
const statusOf = (db: DatabaseSync, id: string) => (db.prepare("SELECT status FROM orders WHERE id = ?").get(id) as { status: string }).status;

/** Đơn nháp có một dịch vụ đủ thông tin chuyến (để `orders_confirm_requires_trip` của 0008 không che lỗi cần kiểm). */
function seedDraft(db: DatabaseSync, id: string): void {
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
           VALUES ('${id}', 'TD-${id}', 's1', 'draft', 'K', '0900000009', '${NOW}', '${NOW}')`);
  db.exec(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('sv-${id}', '${id}', 'Tour', 'perPax', 2, '2026-09-25')`);
}
function seed(db: DatabaseSync): void {
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '${NOW}')`);
}

test("0017: ba cặp chuyển hợp lệ đi qua (nháp→xác nhận, nháp→huỷ, xác nhận→huỷ)", () => {
  const db = open();
  seed(db);
  seedDraft(db, "a");
  seedDraft(db, "b");
  db.exec("UPDATE orders SET status = 'confirmed' WHERE id = 'a'");
  db.exec("UPDATE orders SET status = 'cancelled' WHERE id = 'a'");
  db.exec("UPDATE orders SET status = 'cancelled' WHERE id = 'b'");
  assert.equal(statusOf(db, "a"), "cancelled");
  assert.equal(statusOf(db, "b"), "cancelled");
});

test("0017: mọi đường quay lại bị chặn ở CSDL", () => {
  const db = open();
  seed(db);
  seedDraft(db, "c");
  db.exec("UPDATE orders SET status = 'confirmed' WHERE id = 'c'");
  fails(db, "UPDATE orders SET status = 'draft' WHERE id = 'c'", /invalid_transition/);
  db.exec("UPDATE orders SET status = 'cancelled' WHERE id = 'c'");
  fails(db, "UPDATE orders SET status = 'confirmed' WHERE id = 'c'", /invalid_transition/); // đơn đã huỷ "sống lại": lỗ hổng mà 0008 để lọt
  fails(db, "UPDATE orders SET status = 'draft' WHERE id = 'c'", /invalid_transition/);
  assert.equal(statusOf(db, "c"), "cancelled");
});

test("0017: cập nhật giữ nguyên trạng thái (cột status có trong SET) vẫn đi qua", () => {
  const db = open();
  seed(db);
  seedDraft(db, "d");
  db.exec("UPDATE orders SET status = 'confirmed' WHERE id = 'd'");
  db.exec("UPDATE orders SET status = status, customer_note = 'ghi chú' WHERE id = 'd'");
  db.exec("UPDATE orders SET status = 'confirmed', updated_at = updated_at WHERE id = 'd'");
  assert.equal(statusOf(db, "d"), "confirmed");
});

test("0017: nhật ký chỉ-thêm — thêm được, không sửa, không xoá", () => {
  const db = open();
  seed(db);
  db.exec(`INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at)
           VALUES ('l1', NULL, 's1', 'created', 'order', 'x', NULL, '${NOW}')`);
  fails(db, "UPDATE audit_log SET detail = 'sửa lén' WHERE id = 'l1'", /audit_append_only/);
  fails(db, "DELETE FROM audit_log WHERE id = 'l1'", /audit_append_only/);
  fails(db, "DELETE FROM audit_log", /audit_append_only/);
  assert.equal((db.prepare("SELECT count(*) AS n FROM audit_log").get() as { n: number }).n, 1);
});

test("0017: ba trigger bảo vệ còn tồn tại trên schema đầy đủ (bắt migration sau dựng lại bảng mà quên tạo lại)", () => {
  const db = open();
  const names = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN ('orders_status_transition', 'audit_log_no_update', 'audit_log_no_delete') ORDER BY name").all() as { name: string }[]).map((r) => r.name);
  assert.deepEqual(names, ["audit_log_no_delete", "audit_log_no_update", "orders_status_transition"]);
});
