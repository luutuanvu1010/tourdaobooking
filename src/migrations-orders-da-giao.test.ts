// Kiểm migration *_orders_da_giao.sql (sổ tiền lượt 1 — ADR-0024 điều 3, ADR-0025 điều 5; kế hoạch Task 2: NT-D1, NT-D3, NT-D4, NT-D7, NT-R6).
// Chèn/sửa THẲNG bằng SQL (không qua mã ứng dụng): chứng minh khoá nằm ở CSDL (SQL chạy tay cũng bị chặn). Dựng schema bằng node:sqlite từ
// migrations/*.sql; tệp tìm theo ĐUÔI tên (CHANGE-GUIDE công thức d). Tên, SĐT dùng ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { gieoLyDoHuy } from "../tests/audit/huy-don.mjs";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_orders_da_giao.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
const before = () => open(files.filter((f) => f < FILE));
const AT = "2026-09-30T03:00:00.000Z";
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: (string | number | null)[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const run = (db: DatabaseSync, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).run(...a);
const fails = (db: DatabaseSync, sql: string, re: RegExp, ...a: (string | number | null)[]) => assert.throws(() => run(db, sql, ...a), re, sql);

function seedStaff(db: DatabaseSync) {
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
}
/** Đơn `id` có một dịch vụ + một dòng tiền (100.000 × 1), một chặng, một hành khách; trạng thái `status`. */
function seedOrder(db: DatabaseSync, id: string, status: "draft" | "confirmed" | "cancelled" = "confirmed") {
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 100000, 100000, 100000, ?, ?)`, id, `TD-${id}`, AT, AT);
  run(db, `INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Tour', 'perPax', 1, '2026-10-10')`, `${id}-svc`, id);
  run(db, `INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 100000, 100000)`, `${id}-it`, id, `${id}-svc`);
  run(db, `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES (?, ?, ?, 'OUT', '2026-10-10', 'Khách sạn A', ?, ?)`,
    `${id}-leg`, id, `${id}-svc`, AT, AT);
  run(db, `INSERT INTO ord_passenger (id, order_id, full_name, birth_year, pax_code, previous_id, person_key, voided_at, source, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'Khách Giả', 1990, 'adult', NULL, ?, NULL, 'OFFICE', ?, NULL, ?, NULL)`, `${id}-p1`, id, `${id}-p1`, AT, AT);
  if (status === "cancelled") gieoLyDoHuy(db, id);
  if (status !== "draft") run(db, "UPDATE orders SET status = ?, confirmed_at = ?, updated_at = ? WHERE id = ?", status === "cancelled" ? "cancelled" : "confirmed", AT, AT, id);
}
const deliver = (db: DatabaseSync, id: string) => run(db, "UPDATE orders SET delivered_at = ?, delivered_by = 's1', updated_at = ? WHERE id = ?", AT, AT, id);
const complete = (db: DatabaseSync, id: string) => run(db, "UPDATE orders SET completed_at = ?, completed_by = 's1', updated_at = ? WHERE id = ?", AT, AT, id);

function fresh(): DatabaseSync {
  const db = all();
  seedStaff(db);
  return db;
}

test("(a) đúng một tệp *_orders_da_giao.sql, số 0044 (Task 0), không phải B5", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_orders_da_giao.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.equal(FILE, "0044_orders_da_giao.sql");
  assert.doesNotMatch(FILE, /staff_party_required/, "src/migrations-n1.test.ts nhận migration siết B5 theo tên tệp");
});

test("NT-D1: áp migration lên CSDL có đơn mẫu — số dòng và MỌI giá trị cột cũ của orders không đổi; bốn cột mốc NULL; view v_ord_order_state đúng cột", () => {
  const db = before();
  seedStaff(db);
  seedOrder(db, "o1", "draft");
  seedOrder(db, "o2", "confirmed");
  seedOrder(db, "o3", "cancelled");
  const truoc = rows(db, "SELECT * FROM orders ORDER BY id");
  db.exec(sqlOf(FILE));
  const sau = rows(db, "SELECT * FROM orders ORDER BY id");
  assert.equal(sau.length, truoc.length);
  for (let i = 0; i < truoc.length; i++) {
    const { delivered_at, delivered_by, completed_at, completed_by, ...cu } = sau[i]!;
    assert.deepEqual(cu, truoc[i], "giá trị cột cũ không đổi");
    assert.deepEqual([delivered_at, delivered_by, completed_at, completed_by], [null, null, null, null]);
  }
  assert.deepEqual(rows(db, "PRAGMA table_info(v_ord_order_state)").map((c) => c.name), ["id", "status", "delivered_at", "completed_at"]);
});

test("NT-D4: Đã giao chỉ từ đơn đã xác nhận; Hoàn thành chỉ sau Đã giao; không đặt lại / không xoá mốc; mốc và người bấm đi cùng nhau; đơn mới không mang sẵn mốc", () => {
  const db = fresh();
  seedOrder(db, "nhap", "draft");
  seedOrder(db, "huy", "cancelled");
  seedOrder(db, "xn", "confirmed");
  fails(db, "UPDATE orders SET delivered_at = ?, delivered_by = 's1' WHERE id = 'nhap'", /order_delivered:/, AT);
  fails(db, "UPDATE orders SET delivered_at = ?, delivered_by = 's1' WHERE id = 'huy'", /order_delivered:/, AT);
  fails(db, "UPDATE orders SET delivered_at = ? WHERE id = 'xn'", /order_delivered:/, AT); // thiếu người bấm
  fails(db, "UPDATE orders SET completed_at = ?, completed_by = 's1' WHERE id = 'xn'", /order_completed:/, AT); // nhảy cóc
  gieoLyDoHuy(db, "xn"); // có lý do huỷ — để chính khoá Đã giao (không phải khoá lý do 0078) là lớp chặn được kiểm
  fails(db, "UPDATE orders SET delivered_at = ?, delivered_by = 's1', status = 'cancelled' WHERE id = 'xn'", /order_delivered:/, AT); // huỷ cùng lúc
  deliver(db, "xn");
  assert.equal(rows(db, "SELECT delivered_at FROM v_ord_order_state WHERE id = 'xn'")[0]!.delivered_at, AT);
  fails(db, "UPDATE orders SET delivered_at = '2026-10-01T00:00:00.000Z' WHERE id = 'xn'", /order_delivered:/); // đặt lại
  fails(db, "UPDATE orders SET delivered_at = NULL, delivered_by = NULL WHERE id = 'xn'", /order_delivered:/); // xoá mốc
  fails(db, "UPDATE orders SET completed_at = ? WHERE id = 'xn'", /order_completed:/, AT); // thiếu người bấm
  complete(db, "xn");
  fails(db, "UPDATE orders SET completed_at = NULL, completed_by = NULL WHERE id = 'xn'", /order_(completed|delivered):/);
  fails(db, "UPDATE orders SET completed_at = '2026-10-02T00:00:00.000Z' WHERE id = 'xn'", /order_(completed|delivered):/);
  fails(db, `INSERT INTO orders (id, order_code, staff_id, customer_name, customer_phone, created_at, updated_at, delivered_at, delivered_by)
    VALUES ('moi', 'TD-moi', 's1', 'K', '0900000009', ?, ?, ?, 's1')`, /order_delivered:/, AT, AT, AT);
});

test("NT-D3: đơn đã Đã giao — SQL chạy tay bị chặn: UPDATE orders (mọi cột, kể cả huỷ), dịch vụ / dòng tiền / chặng / hành khách (thêm/sửa/xoá), THÊM dòng điều chỉnh, dòng HANDLE", () => {
  const db = fresh();
  seedOrder(db, "o1", "confirmed");
  run(db, `INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-h2', 'PERSON', 'HDV Hai', 1, ?, ?)`, AT, AT);
  run(db, `INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('a1', 'o1', 'HANDLE', 'pty-s1', 'PENDING', ?, ?, NULL, ?, NULL)`, AT, AT, AT);
  deliver(db, "o1");
  const lock = /order_delivered:/;
  gieoLyDoHuy(db, "o1"); // có lý do huỷ — để chính khoá Đã giao là lớp chặn được kiểm
  fails(db, "UPDATE orders SET status = 'cancelled' WHERE id = 'o1'", lock);
  fails(db, "UPDATE orders SET customer_name = 'Khác' WHERE id = 'o1'", lock);
  fails(db, "UPDATE orders SET updated_at = '2026-10-01T00:00:00.000Z' WHERE id = 'o1'", lock);
  fails(db, "UPDATE orders SET booker_party_id = 'pty-s1' WHERE id = 'o1'", lock);
  fails(db, "INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('s2', 'o1', 'Tour 2', 'perPax', 1, '2026-10-10')", lock);
  fails(db, "UPDATE order_service SET note = 'x' WHERE id = 'o1-svc'", lock);
  fails(db, "UPDATE order_service SET pickup_time = '08:00' WHERE id = 'o1-svc'", lock); // trường vận hành cũng khoá
  fails(db, "DELETE FROM order_service WHERE id = 'o1-svc'", lock);
  // Dòng tiền: từ 0081 (F-03) khoá "đơn hết nháp" cũng chặn — chấp nhận lời báo của khoá nào đến trước.
  fails(db, "INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('i2', 'o1', 'o1-svc', 'Trẻ em', 1, 1, 1)", /order_delivered:|order_money_frozen:/);
  fails(db, "UPDATE order_item SET detail = 'x' WHERE id = 'o1-it'", lock);
  fails(db, "DELETE FROM order_item WHERE id = 'o1-it'", /order_delivered:|order_money_frozen:/);
  fails(db, "INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES ('m1', 'o1', 1, '[]', '[]', 0, 0)", lock);
  fails(db, `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES ('l2', 'o1', 'o1-svc', 'RETURN', '2026-10-10', 'Bến', ?, ?)`, lock, AT, AT);
  fails(db, "UPDATE ord_transfer_leg SET pickup_time = '09:00' WHERE id = 'o1-leg'", lock);
  fails(db, "UPDATE ord_transfer_leg SET closed_at = ?, close_reason_code = 'CUSTOMER_CANCEL', updated_at = ? WHERE id = 'o1-leg'", lock, AT, AT); // đóng chặng cũng khoá (Q1)
  fails(db, "DELETE FROM ord_transfer_leg WHERE id = 'o1-leg'", /order_delivered:|leg_frozen/);
  fails(db, `INSERT INTO ord_passenger (id, order_id, full_name, birth_year, pax_code, previous_id, person_key, voided_at, source, created_at, created_by, updated_at, updated_by)
    VALUES ('p2', 'o1', 'Người Hai', 1991, 'adult', NULL, 'p2', NULL, 'OFFICE', ?, NULL, ?, NULL)`, lock, AT, AT);
  fails(db, "UPDATE ord_passenger SET voided_at = ? WHERE id = 'o1-p1'", lock, AT);
  fails(db, "DELETE FROM ord_passenger WHERE id = 'o1-p1'", /order_delivered:|passenger/);
  fails(db, `INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('a2', 'o1', 'HANDLE', 'pty-h2', 'PENDING', ?, ?, NULL, ?, NULL)`, lock, AT, AT, AT);
  fails(db, "UPDATE dsp_assignment SET valid_to_at = ?, updated_at = ? WHERE id = 'a1'", lock, AT, AT);
});

test("NT-D3: được phép đúng MỘT lần đặt completed_at/completed_by/updated_at từ NULL — và CHỈ thế (đổi thêm bất kỳ cột nào cùng câu → chặn)", () => {
  const db = fresh();
  seedOrder(db, "o1", "confirmed");
  deliver(db, "o1");
  fails(db, "UPDATE orders SET completed_at = ?, completed_by = 's1', updated_at = ?, customer_note = 'x' WHERE id = 'o1'", /order_delivered:/, AT, AT);
  complete(db, "o1");
  assert.deepEqual(rows(db, "SELECT completed_at, completed_by FROM orders WHERE id = 'o1'")[0], { completed_at: AT, completed_by: "s1" });
  fails(db, "UPDATE orders SET customer_note = 'x' WHERE id = 'o1'", /order_delivered:/);
});

/**
 * NT-R6 (lưới cho `ALTER TABLE orders ADD COLUMN` sau này): với MỖI cột của `orders` (đọc PRAGMA — cột thêm sau tự vào danh sách), câu "Hoàn thành" kèm đổi
 * thêm cột đó phải bị chặn. Trả danh sách cột LỌT (câu đi qua). Không phụ thuộc chữ trong thân trigger — thử hành vi.
 */
function cotLotKhoa(db: DatabaseSync): string[] {
  // 0081 (F-03) khoá thêm cột tiền của đơn hết nháp (`orders_money_frozen`) và báo lỗi TRƯỚC — gỡ nó để bài này đo RIÊNG trigger khoá Đã giao.
  db.exec("DROP TRIGGER IF EXISTS orders_money_frozen");
  const cols = rows(db, "PRAGMA table_info(orders)").map((c) => String(c.name));
  const lot: string[] = [];
  for (const c of cols.filter((x) => !["completed_at", "completed_by", "updated_at"].includes(x))) {
    db.exec("SAVEPOINT thu");
    try {
      // Giá trị KHÁC giá trị cũ, bất kể kiểu (trigger BEFORE chạy trước kiểm ràng buộc, nên CHECK/NOT NULL không che được lời báo của trigger).
      run(db, `UPDATE orders SET completed_at = ?, completed_by = 's1', updated_at = ?, ${c} = CASE WHEN ${c} IS NULL THEN 'z' ELSE NULL END WHERE id = 'o1'`, AT, AT);
      lot.push(c);
    } catch (e) {
      if (!/order_delivered:/.test(String(e))) lot.push(`${c} (lỗi khác: ${String(e).slice(0, 80)})`);
    } finally {
      db.exec("ROLLBACK TO thu");
      db.exec("RELEASE thu");
    }
  }
  return lot;
}

test("NT-R6: trigger khoá orders phủ MỌI cột của orders (thử đổi từng cột trong câu Hoàn thành); tự kiểm: cột thêm tạm mà không thêm vào trigger → lọt", () => {
  const db = fresh();
  seedOrder(db, "o1", "confirmed");
  deliver(db, "o1");
  assert.ok(rows(db, "PRAGMA table_info(orders)").length >= 23, "chống bài rỗng: orders có ≥ 23 cột sau migration");
  assert.deepEqual(cotLotKhoa(db), [], "cột lọt khoá — thêm cột vào orders thì PHẢI tạo lại trigger orders_delivered_lock (migration mới) liệt kê cột đó");
  // Tự kiểm bộ bắt: thêm tạm một cột trong CSDL thử (không đổi trigger) → phải báo đúng cột đó lọt.
  db.exec("ALTER TABLE orders ADD COLUMN cot_them_sau TEXT");
  assert.deepEqual(cotLotKhoa(db), ["cot_them_sau"]);
});

test("luồng hợp lệ không bị chặn trước Đã giao: xác nhận, sửa chuyến, thêm điều chỉnh, đổi người phụ trách, huỷ đơn đã xác nhận", () => {
  const db = fresh();
  seedOrder(db, "o1", "confirmed");
  run(db, "UPDATE order_service SET pickup_time = '08:00' WHERE id = 'o1-svc'");
  run(db, "UPDATE ord_transfer_leg SET pickup_time = '08:00', updated_at = ? WHERE id = 'o1-leg'", AT);
  run(db, "INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES ('m1', 'o1', 1, '[]', '[]', 0, 0)");
  run(db, `INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('a1', 'o1', 'HANDLE', 'pty-s1', 'PENDING', ?, ?, NULL, ?, NULL)`, AT, AT, AT);
  run(db, "UPDATE dsp_assignment SET valid_to_at = ?, updated_at = ? WHERE id = 'a1'", AT, AT);
  gieoLyDoHuy(db, "o1"); // ADR-0089 đ8: lô huỷ thật chèn lý do trước câu đổi trạng thái
  run(db, "UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = 'o1'", AT);
  seedOrder(db, "o2", "draft");
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = 'o2'", AT, AT);
  deliver(db, "o2");
  // Đơn KHÁC chưa Đã giao vẫn sửa được khi có đơn đã Đã giao.
  seedOrder(db, "o3", "confirmed");
  run(db, "UPDATE orders SET customer_note = 'ok' WHERE id = 'o3'");
});

test("NT-D7: mọi trigger mới báo lỗi có tiền tố mã (order_delivered: / order_completed:) — route dịch ra tiếng Việt", () => {
  const moi = sqlOf(FILE).match(/RAISE\(ABORT, '([^']*)'\)/g) ?? [];
  assert.ok(moi.length >= 19, `chống bài rỗng: ${moi.length}`);
  for (const r of moi) assert.match(r, /'(order_delivered|order_completed): /, r);
});
