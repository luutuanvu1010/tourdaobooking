// Migration 0187 phần «loại Trả sau» (ADR-0230 Đ1 mục 3): cột `orders.credit_basis` — NULL với Thanh toán ngay; 'LIMIT' (theo hạn mức) | 'SERVICE' (theo dịch vụ) với Trả sau.
// Chụp MỘT lần trong câu chụp hạn trả của lô xác nhận (cùng lúc `credit_due_at` từ NULL thành có), không đổi được sau đó. Đơn Trả sau cũ đã qua nháp mang 'LIMIT'.
// Chạy thật trên SQLite mọi migration; SQL chạy tay (không qua mã ứng dụng) cũng bị chặn. Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = "0187_loai_tra_sau_va_tra_luc_checkin.sql";
const AT = "2026-11-23T03:00:00.000Z";
const HAN = "2026-11-24T03:00:00.000Z";
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
};
const run = (db: DatabaseSync, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).run(...a);
const basis = (db: DatabaseSync, id: string) => (db.prepare("SELECT credit_basis AS b FROM orders WHERE id = ?").get(id) as { b: string | null }).b;

function seedStaff(db: DatabaseSync) {
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
}
/** Đơn nháp một dịch vụ; `term` = hình thức; `xacNhan` ⇒ chuyển sang confirmed (KHÔNG chụp hạn trả). */
function seedOrder(db: DatabaseSync, id: string, term: "PREPAID" | "CREDIT", xacNhan: boolean) {
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, payment_term, created_at, updated_at)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 100000, 100000, 100000, ?, ?, ?)`, id, `TD-${id}`, term, AT, AT);
  run(db, `INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Tour', 'perPax', 1, '2026-12-10')`, `${id}-svc`, id);
  run(db, `INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 100000, 100000)`, `${id}-it`, id, `${id}-svc`);
  if (xacNhan) run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?", AT, AT, id);
}
/** Câu chụp hạn trả như lô xác nhận (`traSauChoXacNhan`), kèm loại. */
const chup = (db: DatabaseSync, id: string, b: string | null) =>
  run(db, "UPDATE orders SET credit_due_at = ?, credit_grace_until = ?, credit_due_date = '2026-11-24', credit_basis = ? WHERE id = ?", HAN, HAN, b, id);

test("0187 có mặt; đơn Trả sau cũ đã qua nháp (kể cả đã tới «Khách đã trả đủ») mang LIMIT; nháp Trả sau và đơn Thanh toán ngay giữ NULL", () => {
  assert.ok(files.includes(FILE), `phải có migration ${FILE}`);
  const db = open(files.filter((f) => f < FILE));
  seedStaff(db);
  seedOrder(db, "cu-xn", "CREDIT", true);
  run(db, "UPDATE orders SET credit_due_at = ?, credit_grace_until = ? WHERE id = 'cu-xn'", HAN, HAN);
  seedOrder(db, "cu-giao", "CREDIT", true);
  run(db, "UPDATE orders SET credit_due_at = ?, credit_grace_until = ? WHERE id = 'cu-giao'", HAN, HAN);
  run(db, "UPDATE orders SET delivered_at = ?, delivered_by = 's1' WHERE id = 'cu-giao'", AT);
  seedOrder(db, "cu-nhap", "CREDIT", false);
  seedOrder(db, "cu-ngay", "PREPAID", true);
  db.exec(readFileSync(new URL(FILE, DIR), "utf8"));
  assert.deepEqual(["cu-xn", "cu-giao", "cu-nhap", "cu-ngay"].map((id) => basis(db, id)), ["LIMIT", "LIMIT", null, null]);
});

test("credit_basis: chỉ LIMIT / SERVICE; chụp được đúng một lần cùng câu chụp hạn trả của đơn Trả sau", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "a", "CREDIT", true);
  assert.throws(() => chup(db, "a", "KHAC"), /CHECK|credit_basis/, "giá trị lạ");
  chup(db, "a", "SERVICE");
  assert.equal(basis(db, "a"), "SERVICE");
  assert.throws(() => run(db, "UPDATE orders SET credit_basis = 'LIMIT' WHERE id = 'a'"), /credit_basis_locked/, "SERVICE → LIMIT");
  assert.throws(() => run(db, "UPDATE orders SET credit_basis = NULL WHERE id = 'a'"), /credit_basis_locked/, "gỡ loại");
  // Nới hạn sau đó (đường «Ân hạn») không đụng loại: vẫn qua.
  run(db, "UPDATE orders SET credit_due_at = '2026-11-25T03:00:00.000Z', credit_grace_until = '2026-11-25T03:00:00.000Z' WHERE id = 'a'");
  assert.equal(basis(db, "a"), "SERVICE");
});

test("credit_basis: không gắn ngoài câu chụp hạn trả; không gắn cho đơn Thanh toán ngay; không gắn khi đơn còn nháp", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "b", "CREDIT", true);
  assert.throws(() => run(db, "UPDATE orders SET credit_basis = 'SERVICE' WHERE id = 'b'"), /credit_basis_locked/, "gắn lẻ, chưa chụp hạn trả");
  seedOrder(db, "c", "PREPAID", true);
  assert.throws(() => chup(db, "c", "LIMIT"), /credit_basis_locked/, "đơn Thanh toán ngay");
  seedOrder(db, "d", "CREDIT", false);
  assert.throws(() => run(db, "UPDATE orders SET credit_basis = 'LIMIT' WHERE id = 'd'"), /credit_basis_locked/, "nháp");
  // Chống bài rỗng: chụp hạn trả không kèm loại vẫn qua (đơn cũ / bài cũ).
  chup(db, "b", null);
  assert.equal(basis(db, "b"), null);
});

test("khoá «Khách đã trả đủ» phủ credit_basis; view billing đọc có credit_basis và giữ mọi cột cũ", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "e", "CREDIT", true);
  chup(db, "e", "LIMIT");
  run(db, "UPDATE orders SET delivered_at = ?, delivered_by = 's1' WHERE id = 'e'", AT);
  assert.throws(() => run(db, "UPDATE orders SET credit_basis = 'SERVICE' WHERE id = 'e'"), /order_delivered|credit_basis_locked/);
  const cot = db.prepare("PRAGMA table_info(v_ord_don_tra_sau)").all().map((c) => (c as { name: string }).name);
  for (const c of ["id", "order_code", "booker_party_id", "status", "delivered_at", "credit_due_date", "credit_due_at", "credit_grace_until", "credit_basis"]) assert.ok(cot.includes(c), c);
  const trig = (db.prepare("SELECT sql FROM sqlite_master WHERE name = 'orders_delivered_lock'").get() as { sql: string }).sql;
  assert.equal(trig.match(/NEW\.credit_basis IS OLD\.credit_basis/g)?.length, 2, "credit_basis ở cả hai nhánh của khoá");
});
