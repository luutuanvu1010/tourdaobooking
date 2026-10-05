// Kiểm migration *_khoa_tien_don_xac_nhan.sql (F-03 / GD-B-02; Hiến chương 5.1). SQL chạy THẲNG — chứng minh khoá tiền đơn đã xác nhận nằm ở CSDL (trước đây
// chỉ ở mã, CSDL chỉ khoá từ "Đã giao"): dòng tiền và cột tiền của đơn không còn nháp không đổi được; lúc xác nhận, tạm tính = Σ thành tiền dòng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { gieoLyDoHuy } from "../tests/audit/huy-don.mjs";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_khoa_tien_don_xac_nhan.sql"));
const AT = "2026-10-05T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
function moi(list = files): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
/** Đơn nháp 2 dòng: 2 × 300.000 + 1 × 150.000 = 750.000, giảm 50.000. */
function don(db: DatabaseSync, id: string, subtotal = 750_000) {
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', ?, 50000, ?, ?, ?, ?)`, id, `TD-${id}`, subtotal, subtotal - 50_000, subtotal - 50_000, AT, AT);
  run(db, "INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Tour', 'perPax', 2, '2026-11-10')", `${id}-s`, id);
  run(db, "INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 2, 300000, 600000)", `${id}-i1`, id, `${id}-s`);
  run(db, "INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Xe', 1, 150000, 150000)", `${id}-i2`, id, `${id}-s`);
}

test("migration khoá tiền đơn tồn tại đúng một tệp", () => assert.ok(FILE, "thiếu migrations/*_khoa_tien_don_xac_nhan.sql"));

test("F-03 (redteam D1): đơn ĐÃ XÁC NHẬN — sửa đơn giá / số lượng / thêm / xoá dòng tiền bằng SQL tay → chặn; trước migration thì lọt", () => {
  const truoc = moi(files.filter((f) => f < FILE!));
  don(truoc, "o");
  run(truoc, "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = 'o'", AT);
  run(truoc, "UPDATE order_item SET unit_price = 1, line_total = 2 WHERE id = 'o-i1'"); // lỗ cũ: lọt
  const db = moi();
  don(db, "o");
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = 'o'", AT);
  const re = /order_money_frozen:/;
  assert.throws(() => run(db, "UPDATE order_item SET unit_price = 1, line_total = 2 WHERE id = 'o-i1'"), re);
  assert.throws(() => run(db, "UPDATE order_item SET quantity = 1, line_total = 300000 WHERE id = 'o-i1'"), re);
  assert.throws(() => run(db, "INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('x', 'o', 'o-s', 'Thêm', 1, 1, 1)"), re);
  assert.throws(() => run(db, "DELETE FROM order_item WHERE id = 'o-i2'"), re);
  assert.throws(() => run(db, "UPDATE order_item SET catalog_price = 1 WHERE id = 'o-i1'"), re); // giá niêm yết lúc lập — căn cứ "giá đổi so với bảng giá"
  assert.throws(() => run(db, "UPDATE order_item SET service_id = NULL WHERE id = 'o-i2'"), re);
  run(db, "UPDATE order_item SET description = 'Người lớn (sửa chữ)', detail = 'ghi chú' WHERE id = 'o-i1'"); // chữ mô tả không phải tiền — không chặn
});

test("F-03 (redteam D2): đơn ĐÃ XÁC NHẬN / ĐÃ HUỶ — sửa tạm tính, giảm giá, tổng bằng SQL tay → chặn; đơn NHÁP sửa được như cũ", () => {
  const db = moi();
  don(db, "o");
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = 'o'", AT);
  assert.throws(() => run(db, "UPDATE orders SET discount = 0, total = 750000, remaining_amount = 750000 WHERE id = 'o'"), /order_money_frozen:/);
  assert.throws(() => run(db, "UPDATE orders SET subtotal = 1, total = -49999 WHERE id = 'o'"), /order_money_frozen:|money_invariant:/);
  run(db, "UPDATE orders SET customer_note = 'đổi ghi chú', updated_at = ? WHERE id = 'o'", AT); // cột không phải tiền — không chặn
  don(db, "h");
  gieoLyDoHuy(db, "h");
  run(db, "UPDATE orders SET status = 'cancelled' WHERE id = 'h'");
  assert.throws(() => run(db, "UPDATE orders SET discount = 0, total = 750000, remaining_amount = 750000 WHERE id = 'h'"), /order_money_frozen:/);
  don(db, "n");
  run(db, "UPDATE orders SET discount = 0, total = 750000, remaining_amount = 750000 WHERE id = 'n'");
  run(db, "UPDATE order_item SET quantity = 3, line_total = 900000 WHERE id = 'n-i1'");
});

test("F-03: xác nhận đơn có tạm tính KHÁC Σ thành tiền dòng → chặn; khớp → qua", () => {
  const db = moi();
  don(db, "lech", 700_000);
  assert.throws(() => run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = 'lech'", AT), /order_subtotal_mismatch:/);
  don(db, "dung");
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = 'dung'", AT);
});

// ---- R-ORD-15 / R-ORD-15w (scripts/audit-checks.mjs): lưới thứ hai, mốc mượn R-BIL-13 (0080); từ mốc = lỗi, trước mốc = cảnh báo ----
type Check = { code: string; sql: string; level: string; mode?: string };
const { CHECKS } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: Check[] };
const check = (code: string): Check => {
  const f = CHECKS.filter((c) => c.code === code);
  assert.equal(f.length, 1, code);
  return f[0]!;
};
const SAU_MOC = "2999-01-01T00:00:00.000Z";
const TRUOC_MOC = "2000-01-01T00:00:00.000Z";

test("R-ORD-15: đúng luồng (tạm tính = Σ dòng) → 0; mức fail; R-ORD-15w mức warn", () => {
  assert.equal(check("R-ORD-15").level, "fail");
  assert.equal(check("R-ORD-15w").level, "warn");
  const db = moi();
  don(db, "o");
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = 'o'", SAU_MOC);
  assert.equal(Number(Object.values(db.prepare(check("R-ORD-15").sql).get() as object)[0]), 0);
  assert.deepEqual(db.prepare(check("R-ORD-15w").sql).all(), []);
});

test("R-ORD-15 (F-03): gỡ trigger 0081, xác nhận đơn lệch / sửa dòng tiền sau xác nhận → lỗi (từ mốc); đơn lệch xác nhận trước mốc → không lỗi, R-ORD-15w liệt kê", () => {
  const db = moi();
  for (const t of ["orders_confirm_subtotal_matches", "order_item_frozen_update"]) db.exec(`DROP TRIGGER ${t}`);
  don(db, "lech", 700_000);
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = 'lech'", SAU_MOC);
  don(db, "sua");
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = 'sua'", SAU_MOC);
  run(db, "UPDATE order_item SET unit_price = 1, line_total = 2 WHERE id = 'sua-i1'");
  const dem = () => Number(Object.values(db.prepare(check("R-ORD-15").sql).get() as object)[0]);
  assert.equal(dem(), 2);
  don(db, "cu", 800_000);
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = 'cu'", TRUOC_MOC);
  assert.equal(dem(), 2, "đơn xác nhận trước mốc không thành lỗi");
  // Giới hạn của 0081: đơn CHÈN THẲNG ở trạng thái 'confirmed' (SQL tay, không mốc xác nhận) không qua trigger lúc xác nhận — R-ORD-15 bắt (mốc = lúc tạo).
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES ('chen', 'TD-chen', 's1', 'confirmed', 'Khách Giả', '0900000009', 500000, 500000, 500000, ?, ?)`, SAU_MOC, SAU_MOC);
  assert.equal(dem(), 3, "đơn chèn thẳng khác nháp, lệch tiền, tạo từ mốc → lỗi");
  assert.deepEqual(db.prepare(check("R-ORD-15w").sql).all().map((r) => ({ ...(r as object) })), [{ order_code: "TD-cu", subtotal: 800_000, tong_dong: 750_000 }]);
});
