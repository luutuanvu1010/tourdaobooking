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
  // 0053 gieo một dòng nhật ký hệ thống (catalog_groups_seeded) — không tính vào dòng của bài này.
  assert.equal((db.prepare("SELECT count(*) AS n FROM audit_log WHERE action != 'catalog_groups_seeded'").get() as { n: number }).n, 1);
});

test("0017: ba trigger bảo vệ còn tồn tại trên schema đầy đủ (bắt migration sau dựng lại bảng mà quên tạo lại)", () => {
  const db = open();
  const names = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN ('orders_status_transition', 'audit_log_no_update', 'audit_log_no_delete') ORDER BY name").all() as { name: string }[]).map((r) => r.name);
  assert.deepEqual(names, ["audit_log_no_delete", "audit_log_no_update", "orders_status_transition"]);
});

// Người kiểm độc lập (C-1): bài kiểm trên chỉ khai 3/18 trigger — 15 trigger còn lại (0007, 0008, 0011) không có bài kiểm "còn tồn tại trên
// schema đầy đủ" nào, nên một migration sau dựng lại bảng (CREATE TABLE mới thay bảng cũ) mà quên tạo lại trigger vẫn để `npm test` xanh 100%.
// Bài kiểm dưới liệt kê ĐỦ 18 trigger của cả 4 tệp migration định nghĩa trigger (0007, 0008, 0011, 0017), cùng cách hỏi SQLite như trên.
test("0017: đủ 18 trigger bảo vệ (0007 + 0008 + 0011 + 0017) còn tồn tại trên schema đầy đủ", () => {
  const db = open();
  const ALL_TRIGGERS = [
    // 0007_audit_open_actions_catalog_code_money_guards.sql — khoá tiền dẫn xuất không được ghi khác 0 phía trình duyệt.
    "order_item_money_insert",
    "order_item_money_update",
    "orders_money_insert",
    "orders_money_update",
    // 0008_order_service.sql — phạm vi dịch vụ, đóng băng thông tin chuyến sau xác nhận, bắt buộc có thông tin chuyến khi xác nhận.
    "order_item_service_scope_insert",
    "order_item_service_scope_update",
    "order_service_frozen_insert",
    "order_service_frozen_delete",
    "order_service_frozen_update",
    "order_service_confirmed_keeps_date",
    "orders_confirm_requires_trip",
    // 0011_parties.sql — vai trò/quan hệ hồ sơ không chồng hiệu lực.
    "pty_party_role_no_overlap_ins",
    "pty_party_role_no_overlap_upd",
    "pty_relationship_no_overlap_ins",
    "pty_relationship_no_overlap_upd",
    // 0017_order_status_audit_guards.sql — chuyển trạng thái đơn đúng chiều, nhật ký chỉ-thêm.
    "orders_status_transition",
    "audit_log_no_update",
    "audit_log_no_delete",
  ].sort();
  const inList = ALL_TRIGGERS.map((n) => `'${n}'`).join(", ");
  const names = (
    db.prepare(`SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN (${inList}) ORDER BY name`).all() as { name: string }[]
  ).map((r) => r.name);
  assert.deepEqual(names, ALL_TRIGGERS, "thiếu trigger nghĩa là một migration sau đã dựng lại bảng mà quên tạo lại trigger bảo vệ");
});
