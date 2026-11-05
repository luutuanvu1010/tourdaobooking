// Kiểm migration 0141 (ADR-0168; kế hoạch 2026-11-05 Task 1) trên SQLite thật: chèn/sửa THẲNG bằng SQL để chứng minh khoá nằm ở CSDL.
// Tên, SĐT dùng ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const AT = "2026-11-05T03:00:00.000Z";
type Arg = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: Arg[]) => db.prepare(sql).run(...a);
const get = (db: DatabaseSync, sql: string, ...a: Arg[]) => db.prepare(sql).get(...a) as Record<string, unknown> | undefined;
const fails = (db: DatabaseSync, sql: string, re: RegExp, ...a: Arg[]) => assert.throws(() => run(db, sql, ...a), re, sql);

function fresh(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, ?, ?)", AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', ?, ?)", AT, AT);
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, ?, 'pty-s1')", AT);
  return db;
}
function toChuc(db: DatabaseSync, id: string, vai?: string) {
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)", id, id, AT, AT);
  run(db, "INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)", id, AT, AT);
  if (vai) run(db, "INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)", `vai-${id}`, id, vai, AT, AT);
}
const moHanMuc = (db: DatabaseSync, id: string, party: string, tu: string, den: string | null = null, hanMuc = 50_000_000, ngay = 7) =>
  run(db, "INSERT INTO bil_credit_limit (id, party_id, limit_amount, term_days, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", id, party, hanMuc, ngay, tu, den, AT, AT);
function donMau(db: DatabaseSync, id: string, status: "draft" | "confirmed" = "draft") {
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 100000, 100000, 100000, ?, ?)`, id, `TD-${id}`, AT, AT);
  run(db, `INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Tour', 'perPax', 1, '2026-12-10')`, `${id}-svc`, id);
  run(db, `INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 100000, 100000)`, `${id}-it`, id, `${id}-svc`);
  run(db, `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES (?, ?, ?, 'OUT', '2026-12-10', 'Khách sạn A', ?, ?)`, `${id}-leg`, id, `${id}-svc`, AT, AT);
  run(db, `INSERT INTO ord_passenger (id, order_id, full_name, birth_year, pax_code, previous_id, person_key, voided_at, source, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'Khách Giả', 1990, 'adult', NULL, ?, NULL, 'OFFICE', ?, NULL, ?, NULL)`, `${id}-p1`, id, `${id}-p1`, AT, AT);
  if (status === "confirmed") run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?", AT, AT, id);
}

test("hạn mức: chỉ cấp cho hồ sơ mang loại được hưởng; nội bộ bị từ chối", () => {
  const db = fresh();
  toChuc(db, "dl-1", "TRAVEL_AGENCY");
  toChuc(db, "khong-vai");
  moHanMuc(db, "h1", "dl-1", "2026-11-01");
  fails(db, "INSERT INTO bil_credit_limit (id, party_id, limit_amount, term_days, valid_from_date, created_at, updated_at) VALUES ('h2', 'khong-vai', 1000, 7, '2026-11-01', ?, ?)", /bil_credit_not_beneficiary/, AT, AT);
  fails(db, "INSERT INTO bil_credit_limit (id, party_id, limit_amount, term_days, valid_from_date, created_at, updated_at) VALUES ('h3', 'pty-s1', 1000, 7, '2026-11-01', ?, ?)", /bil_credit_not_beneficiary/, AT, AT);
});

test("hạn mức: số tiền > 0, số ngày 1–365, không chồng ngày, không xoá, chỉ đóng một lần", () => {
  const db = fresh();
  toChuc(db, "dl-1", "TRAVEL_AGENCY");
  assert.throws(() => moHanMuc(db, "a", "dl-1", "2026-11-01", null, 0), /CHECK/);
  assert.throws(() => moHanMuc(db, "b", "dl-1", "2026-11-01", null, 1000, 0), /CHECK/);
  assert.throws(() => moHanMuc(db, "c", "dl-1", "2026-11-01", null, 1000, 366), /CHECK/);
  moHanMuc(db, "h1", "dl-1", "2026-11-01");
  assert.throws(() => moHanMuc(db, "h2", "dl-1", "2026-11-03"), /bil_credit_limit_overlap/);
  fails(db, "DELETE FROM bil_credit_limit WHERE id = 'h1'", /bil_append_only/);
  fails(db, "UPDATE bil_credit_limit SET limit_amount = 9 WHERE id = 'h1'", /bil_append_only/);
  fails(db, "UPDATE bil_credit_limit SET valid_to_date = NULL WHERE id = 'h1'", /bil_append_only/);
  run(db, "UPDATE bil_credit_limit SET valid_to_date = '2026-11-04' WHERE id = 'h1'");
  fails(db, "UPDATE bil_credit_limit SET valid_to_date = '2026-11-05' WHERE id = 'h1'", /bil_append_only/);
  moHanMuc(db, "h2", "dl-1", "2026-11-05", null, 70_000_000, 14); // đổi hạn mức: dòng mới liền sau dòng cũ
  assert.equal(get(db, "SELECT count(*) AS n FROM bil_credit_limit")!.n, 2);
});

test("hạn mức: đổi hoặc ngừng ngay trong ngày bắt đầu (đóng bằng ngày trước đó) là khoảng rỗng, không chồng ngày", () => {
  const db = fresh();
  toChuc(db, "dl-1", "TRAVEL_AGENCY");
  moHanMuc(db, "h1", "dl-1", "2026-11-05");
  run(db, "UPDATE bil_credit_limit SET valid_to_date = '2026-11-04' WHERE id = 'h1'");
  moHanMuc(db, "h2", "dl-1", "2026-11-05", null, 20_000_000, 3);
  assert.equal(get(db, "SELECT limit_amount AS v FROM bil_credit_limit WHERE party_id = 'dl-1' AND valid_from_date <= '2026-11-05' AND (valid_to_date IS NULL OR valid_to_date >= '2026-11-05')")!.v, 20_000_000);
  assert.throws(() => run(db, "UPDATE bil_credit_limit SET valid_to_date = '2026-11-03' WHERE id = 'h2'"), /CHECK|bil_append_only/, "không đóng sớm hơn một ngày trước ngày bắt đầu");
});

test("dòng phiên bản: đúng phiên bản thì tăng, sai thì cả câu bị huỷ", () => {
  const db = fresh();
  toChuc(db, "dl-1", "TRAVEL_AGENCY");
  const gac = (daDoc: number) => {
    run(db, "INSERT OR IGNORE INTO bil_credit_guard (party_id, version, created_at, updated_at) VALUES ('dl-1', 0, ?, ?)", AT, AT);
    run(db, "UPDATE bil_credit_guard SET version = ? + 1, updated_at = ? WHERE party_id = 'dl-1'", daDoc, AT);
  };
  gac(0);
  assert.equal(get(db, "SELECT version AS v FROM bil_credit_guard")!.v, 1);
  assert.throws(() => gac(0), /credit_version_stale/, "lệnh thứ hai cùng đọc phiên bản 0 phải thua");
  gac(1);
  assert.equal(get(db, "SELECT version AS v FROM bil_credit_guard")!.v, 2);
  fails(db, "DELETE FROM bil_credit_guard", /bil_append_only/);
});

test("orders: đơn mới và đơn cũ đều PREPAID; giá trị lạ bị từ chối; hạn trả NULL", () => {
  const db = fresh();
  donMau(db, "o1");
  assert.deepEqual({ ...get(db, "SELECT payment_term, credit_due_date FROM orders WHERE id = 'o1'") }, { payment_term: "PREPAID", credit_due_date: null });
  fails(db, "UPDATE orders SET payment_term = 'LATER' WHERE id = 'o1'", /CHECK/);
  run(db, "UPDATE orders SET payment_term = 'CREDIT' WHERE id = 'o1'"); // còn nháp: đổi được
  assert.equal(get(db, "SELECT payment_term AS v FROM orders WHERE id = 'o1'")!.v, "CREDIT");
});

test("orders: hình thức khoá khi đã rời nháp; sau «Đã giao» cả hai cột mới bị khoá", () => {
  const db = fresh();
  donMau(db, "o1", "confirmed");
  fails(db, "UPDATE orders SET payment_term = 'CREDIT' WHERE id = 'o1'", /payment_term_locked/);
  donMau(db, "o2", "draft");
  run(db, "UPDATE orders SET payment_term = 'CREDIT' WHERE id = 'o2'");
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, credit_due_date = '2026-11-12', updated_at = ? WHERE id = 'o2'", AT, AT);
  run(db, "UPDATE orders SET delivered_at = ?, delivered_by = 's1', updated_at = ? WHERE id = 'o2'", AT, AT);
  fails(db, "UPDATE orders SET credit_due_date = '2026-12-01' WHERE id = 'o2'", /order_delivered/);
  fails(db, "UPDATE orders SET payment_term = 'PREPAID' WHERE id = 'o2'", /order_delivered|payment_term_locked/);
  // Câu «Hoàn thành» là câu duy nhất được lọt qua khoá; kèm đổi hai cột mới thì vẫn phải bị chặn (bài NT-R6 của 0044).
  fails(db, "UPDATE orders SET completed_at = ?, completed_by = 's1', credit_due_date = '2026-12-01' WHERE id = 'o2'", /order_delivered/, AT);
  fails(db, "UPDATE orders SET completed_at = ?, completed_by = 's1', payment_term = 'PREPAID' WHERE id = 'o2'", /order_delivered|payment_term_locked/, AT);
  run(db, "UPDATE orders SET completed_at = ?, completed_by = 's1' WHERE id = 'o2'", AT);
});

test("v_ord_don_tra_sau: chỉ đơn CREDIT, đúng sáu cột", () => {
  const db = fresh();
  donMau(db, "o1");
  donMau(db, "o2");
  run(db, "UPDATE orders SET payment_term = 'CREDIT' WHERE id = 'o2'");
  assert.deepEqual(db.prepare("PRAGMA table_info(v_ord_don_tra_sau)").all().map((c) => c.name), ["id", "order_code", "booker_party_id", "status", "delivered_at", "credit_due_date"]);
  assert.deepEqual(db.prepare("SELECT id FROM v_ord_don_tra_sau").all().map((r) => r.id), ["o2"]);
});
