// Migration 0187 phần B «Trả lúc check-in» (ADR-0230 Đ2): bảng chỉ thêm `ord_checkin_payment` của `orders` (dòng hiệu lực = `valid_from_at` lớn nhất), view công bố
// `v_ord_tra_luc_checkin`, và trigger `bil_receipt_checkin_cash_only` (khoản khách trả mới phía Tour Đảo của đơn này phải là tiền mặt — khuôn 0184).
// Chạy thật trên SQLite mọi migration; SQL chạy tay (không qua mã ứng dụng) cũng bị chặn. Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const AT = "2026-11-23T03:00:00.000Z";
const open = () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
};
const run = (db: DatabaseSync, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).run(...a);

function seed(db: DatabaseSync) {
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
}
function seedOrder(db: DatabaseSync, id: string, term: "PREPAID" | "CREDIT" = "PREPAID") {
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, payment_term, created_at, updated_at)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 100000, 100000, 100000, ?, ?, ?)`, id, `TD-${id}`, term, AT, AT);
  run(db, `INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Tour', 'perPax', 1, '2026-12-10')`, `${id}-svc`, id);
  run(db, `INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 100000, 100000)`, `${id}-it`, id, `${id}-svc`);
}
let seq = 0;
const chon = (db: DatabaseSync, orderId: string, enabled: number, at: string) =>
  run(db, `INSERT INTO ord_checkin_payment (id, order_id, enabled, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 's1', ?, 's1')`,
    `ck-${++seq}`, orderId, enabled, at, at, at);
const xacNhan = (db: DatabaseSync, id: string) => run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?", AT, AT, id);
const checkin = (db: DatabaseSync) => (db.prepare("SELECT order_id AS id FROM v_ord_tra_luc_checkin ORDER BY order_id").all() as { id: string }[]).map((r) => r.id);

test("ord_checkin_payment: chọn khi nháp; dòng hiệu lực = valid_from_at lớn nhất; view chỉ đơn có dòng hiệu lực bật", () => {
  const db = open();
  seed(db);
  seedOrder(db, "a");
  seedOrder(db, "b");
  seedOrder(db, "c");
  chon(db, "a", 1, "2026-11-23T03:00:00.001Z");
  chon(db, "b", 1, "2026-11-23T03:00:00.001Z");
  chon(db, "b", 0, "2026-11-23T03:00:00.002Z"); // đổi ý khi còn nháp = dòng mới
  chon(db, "c", 0, "2026-11-23T03:00:00.001Z");
  assert.deepEqual(checkin(db), ["a"]);
  chon(db, "b", 1, "2026-11-23T03:00:00.003Z");
  assert.deepEqual(checkin(db), ["a", "b"]);
  assert.throws(() => chon(db, "a", 1, "2026-11-23T03:00:00.001Z"), /UNIQUE/, "trùng mốc của cùng đơn");
  assert.throws(() => chon(db, "a", 2, "2026-11-23T03:00:00.009Z"), /CHECK/, "enabled chỉ 0/1");
});

test("chỉ thêm: cấm UPDATE, cấm DELETE (kể cả khi đơn còn nháp)", () => {
  const db = open();
  seed(db);
  seedOrder(db, "a");
  chon(db, "a", 1, AT);
  assert.throws(() => run(db, "UPDATE ord_checkin_payment SET enabled = 0"), /checkin_payment_append_only:/);
  assert.throws(() => run(db, "DELETE FROM ord_checkin_payment"), /checkin_payment_append_only:/);
});

test("chỉ chèn khi đơn đang nháp; đơn rời nháp không đổi được lựa chọn; nháp Trả sau chèn được (hình thức chốt ở câu xác nhận)", () => {
  const db = open();
  seed(db);
  seedOrder(db, "a");
  chon(db, "a", 1, "2026-11-23T03:00:00.001Z");
  xacNhan(db, "a");
  assert.throws(() => chon(db, "a", 0, "2026-11-23T03:00:00.002Z"), /checkin_payment_draft_only:/, "đơn đã xác nhận");
  seedOrder(db, "t", "CREDIT");
  chon(db, "t", 1, "2026-11-23T03:00:00.001Z"); // lô lưu nháp chèn TRƯỚC câu đổi hình thức sang Thanh toán ngay
  run(db, "UPDATE orders SET payment_term = 'PREPAID' WHERE id = 't'");
  xacNhan(db, "t");
  assert.throws(() => chon(db, "khong-co", 1, AT), /FOREIGN KEY|checkin_payment_draft_only:/);
});

test("xác nhận: đơn mang dòng bật mà hình thức đã bị đổi sang Trả sau khi còn nháp ⇒ câu xác nhận bị chặn", () => {
  const db = open();
  seed(db);
  seedOrder(db, "a");
  chon(db, "a", 1, AT);
  run(db, "UPDATE orders SET payment_term = 'CREDIT' WHERE id = 'a'"); // nháp: đổi hình thức không qua máy chủ
  assert.throws(() => xacNhan(db, "a"), /checkin_payment_prepaid_only:/);
});

/** Khoản thu chèn thẳng (như thu-ho-tien-mat.test.ts). */
function chenKhoan(db: DatabaseSync, orderId: string, o: { role: string; method: string; kind?: string; reverses?: string | null }) {
  const id = `rc-${++seq}`;
  run(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date,
    reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, 1000, 'pty-s1', ?, ?, (SELECT party_id FROM v_pty_owner_company LIMIT 1), 'PREPAID', '2026-11-23', ?, NULL, ?, 's1', ?, 's1')`,
    id, orderId, o.kind ?? "CUSTOMER_PAYMENT", o.role, o.method, o.reverses ?? null, AT, AT);
  return id;
}

test("bil_receipt_checkin_cash_only: đơn «Trả lúc check-in» — khoản khách trả mới phía Tour Đảo (Công ty, nhân viên) chỉ tiền mặt; đơn khác không đổi", () => {
  const db = open();
  seed(db);
  seedOrder(db, "a");
  chon(db, "a", 1, AT);
  xacNhan(db, "a");
  assert.throws(() => chenKhoan(db, "a", { role: "STAFF", method: "BANK_TRANSFER" }), /checkin_cash_only:/);
  assert.throws(() => chenKhoan(db, "a", { role: "COMPANY", method: "OTHER" }), /checkin_cash_only:/);
  chenKhoan(db, "a", { role: "STAFF", method: "CASH" });
  chenKhoan(db, "a", { role: "SUPPLIER", method: "BANK_TRANSFER" }); // tại quầy nhà cung cấp: không phải phía Tour Đảo
  seedOrder(db, "b");
  xacNhan(db, "b");
  chenKhoan(db, "b", { role: "STAFF", method: "BANK_TRANSFER" }); // đơn Thanh toán ngay thường
  seedOrder(db, "c");
  chon(db, "c", 1, "2026-11-23T03:00:00.001Z");
  chon(db, "c", 0, "2026-11-23T03:00:00.002Z"); // đã bỏ chọn khi còn nháp
  xacNhan(db, "c");
  chenKhoan(db, "c", { role: "COMPANY", method: "BANK_TRANSFER" });
});
