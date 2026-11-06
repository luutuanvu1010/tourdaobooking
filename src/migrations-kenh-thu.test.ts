// Kiểm migration 0144 (ADR-0178 Phần A, Task A1): bảng công tắc chỉ-thêm, dấu `company_collects_snapshot` trên đơn khoá ở CSDL, khoá «Xong và đủ tiền» có cột mới.
// Chèn/sửa THẲNG bằng SQL: chứng minh khoá nằm ở CSDL. Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const AT = "2026-11-06T03:00:00.000Z";
const run = (db: DatabaseSync, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).run(...a);
function fresh(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
  return db;
}
const don = (db: DatabaseSync, id: string, dau: number | null, tien = 100000) =>
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at, company_collects_snapshot)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', ?, ?, ?, ?, ?, ?)`, id, `TD-${id}`, tien, tien, tien, AT, AT, dau);

test("migration 0144 có mặt, đúng tên", () => {
  assert.ok(files.includes("0144_kenh_thu_doi_tac.sql"));
});

test("dấu chụp: đổi giá trị bị khoá (0→1, 1→0, 0→NULL, NULL→0); ghi lại cùng giá trị không lỗi", () => {
  const db = fresh();
  don(db, "o0", 0);
  assert.throws(() => run(db, "UPDATE orders SET company_collects_snapshot = 1 WHERE id = 'o0'"), /company_collects_locked/);
  assert.throws(() => run(db, "UPDATE orders SET company_collects_snapshot = NULL WHERE id = 'o0'"), /company_collects_locked/);
  don(db, "o1", 1);
  assert.throws(() => run(db, "UPDATE orders SET company_collects_snapshot = 0 WHERE id = 'o1'"), /company_collects_locked/);
  don(db, "on", null);
  assert.throws(() => run(db, "UPDATE orders SET company_collects_snapshot = 0 WHERE id = 'on'"), /company_collects_locked/, "đơn cũ / văn phòng lập không được gắn dấu về sau");
  run(db, "UPDATE orders SET company_collects_snapshot = 0 WHERE id = 'o0'"); // cùng giá trị: qua
  run(db, "UPDATE orders SET customer_note = 'sửa' WHERE id = 'o0'"); // cột khác: qua
});

test("dấu chụp: giá trị ngoài 0/1/NULL bị CHECK chặn", () => {
  const db = fresh();
  assert.throws(() => don(db, "o2", 2), /CHECK/i);
});

test("sau «Xong và đủ tiền» cột dấu cũng khoá (trigger liệt kê cột mới)", () => {
  const db = fresh();
  don(db, "od", 0);
  run(db, `INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('od-svc', 'od', 'Tour', 'perPax', 1, '2026-11-10')`);
  run(db, `INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('od-it', 'od', 'od-svc', 'Người lớn', 1, 100000, 100000)`);
  run(db, `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES ('od-leg', 'od', 'od-svc', 'OUT', '2026-11-10', 'Khách sạn A', ?, ?)`, AT, AT);
  run(db, `INSERT INTO ord_passenger (id, order_id, full_name, birth_year, pax_code, previous_id, person_key, voided_at, source, created_at, created_by, updated_at, updated_by)
    VALUES ('od-p1', 'od', 'Khách Giả', 1990, 'adult', NULL, 'od-p1', NULL, 'OFFICE', ?, NULL, ?, NULL)`, AT, AT);
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = 'od'", AT, AT);
  run(db, "UPDATE orders SET delivered_at = ?, delivered_by = 's1', updated_at = ? WHERE id = 'od'", AT, AT);
  assert.throws(() => run(db, "UPDATE orders SET company_collects_snapshot = 1 WHERE id = 'od'"), /company_collects_locked|order_delivered/);
});

test("bảng công tắc: CHECK 0/1, chỉ đóng một lần, không xoá", () => {
  const db = fresh();
  const them = (id: string, v: number) => run(db, "INSERT INTO bil_partner_channel_setting (id, company_collects, valid_from, valid_to, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, NULL, ?, 's1', ?, 's1')", id, v, AT, AT, AT);
  assert.throws(() => them("x", 2), /CHECK/i);
  them("a", 0);
  assert.throws(() => run(db, "UPDATE bil_partner_channel_setting SET company_collects = 1 WHERE id = 'a'"), /bil_append_only/);
  assert.throws(() => run(db, "DELETE FROM bil_partner_channel_setting WHERE id = 'a'"), /bil_append_only/);
  run(db, "UPDATE bil_partner_channel_setting SET valid_to = ? WHERE id = 'a'", "2026-11-07T00:00:00.000Z");
  assert.throws(() => run(db, "UPDATE bil_partner_channel_setting SET valid_to = ? WHERE id = 'a'", "2026-11-08T00:00:00.000Z"), /bil_append_only/);
});

test("view v_ord_kenh_thu công bố người lập và dấu", () => {
  const db = fresh();
  don(db, "ov", 0);
  assert.deepEqual({ ...(db.prepare("SELECT id, staff_id, company_collects_snapshot AS d FROM v_ord_kenh_thu WHERE id = 'ov'").get() as object) }, { id: "ov", staff_id: "s1", d: 0 });
});
