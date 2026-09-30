// Kiểm migration *_billing_nhap_ke_toan.sql (ADR-0060 điều 1 — dấu "đã nhập phần mềm kế toán" + "Số hoá đơn đã nhập", bảng CHỈ-THÊM của billing).
// Chèn/sửa THẲNG bằng SQL (không qua mã ứng dụng): chứng minh chặn nằm ở CSDL. Dựng schema bằng node:sqlite từ migrations/*.sql; tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_billing_nhap_ke_toan.sql"));
const AT = "2026-09-30T03:00:00.000Z";
const open = () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}')`);
  db.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES ('o1', 'TD-1', 's1', 'confirmed', 'Khách Giả', '0900000009', 1, 1, 1, ?, ?)`).run(AT, AT);
  return db;
};
const ins = (db: DatabaseSync, id: string, entered: number, so: string | null, lyDo: string | null, order = "o1") =>
  db.prepare(`INSERT INTO bil_accounting_entry (id, order_id, entered, invoice_number, reason, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, 's1', ?, 's1')`).run(id, order, entered, so, lyDo, AT, AT);

test("ADR-0060: đúng MỘT tệp migration *_billing_nhap_ke_toan.sql", () => {
  assert.equal(MATCHES.length, 1, `tệp khớp: ${MATCHES.join(", ")}`);
});

test("ADR-0060: bảng có đủ cột (4 cột dấu vết), chỉ mục theo đơn", () => {
  const db = open();
  const cols = db.prepare("PRAGMA table_info(bil_accounting_entry)").all().map((c) => (c as { name: string }).name);
  assert.deepEqual(cols, ["id", "order_id", "entered", "invoice_number", "reason", "created_at", "created_by", "updated_at", "updated_by"]);
  const ix = db.prepare("PRAGMA index_list(bil_accounting_entry)").all().map((i) => (i as { name: string }).name);
  assert.ok(ix.includes("bil_accounting_entry_order_ix"), ix.join(","));
});

test("ADR-0060 (tiêu chí 4): UPDATE / DELETE chạy tay bị trigger chặn (bil_append_only:)", () => {
  const db = open();
  ins(db, "e1", 1, "HD-000123", null);
  assert.throws(() => db.exec("UPDATE bil_accounting_entry SET invoice_number = 'HD-9' WHERE id = 'e1'"), /bil_append_only:/);
  assert.throws(() => db.exec("DELETE FROM bil_accounting_entry WHERE id = 'e1'"), /bil_append_only:/);
  assert.equal((db.prepare("SELECT invoice_number FROM bil_accounting_entry WHERE id = 'e1'").get() as { invoice_number: string }).invoice_number, "HD-000123");
});

test("ADR-0060: CHECK — bỏ dấu thiếu lý do / lý do rỗng / bỏ dấu kèm số; số hoá đơn rỗng hoặc > 50 ký tự; entered ngoài {0,1}; đơn không tồn tại", () => {
  const db = open();
  assert.throws(() => ins(db, "x1", 0, null, null), /CHECK/);
  assert.throws(() => ins(db, "x2", 0, null, "   "), /CHECK/);
  assert.throws(() => ins(db, "x3", 0, "HD-1", "nhập nhầm"), /CHECK/);
  assert.throws(() => ins(db, "x4", 1, "  ", null), /CHECK/);
  assert.throws(() => ins(db, "x5", 1, "H".repeat(51), null), /CHECK/);
  assert.throws(() => ins(db, "x6", 2, null, null), /CHECK/);
  assert.throws(() => ins(db, "x7", 1, null, null, "khong-co"), /FOREIGN KEY/);
  ins(db, "ok1", 1, null, null); // đánh dấu không số — hợp lệ
  ins(db, "ok2", 1, "H".repeat(50), null);
  ins(db, "ok3", 0, null, "đơn huỷ sau khi nhập");
  assert.equal((db.prepare("SELECT count(*) AS n FROM bil_accounting_entry").get() as { n: number }).n, 3);
});
