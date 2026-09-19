// Kiểm migration 0008 (order_service) trên SQLite thật (node:sqlite) — chạy nhanh, không cần wrangler.
// D1 là SQLite và bật khoá ngoại mặc định, nên đây là lưới đầu tiên cho CHECK/TRIGGER/backfill; e2e xác nhận lại trên D1 local.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const upTo = (last: string) => files.filter((f) => f <= last);

function open(list: string[]): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
}

const NOW = "2026-09-19T00:00:00.000Z";
function seedStaff(db: DatabaseSync) {
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '${NOW}')`);
}
function seedOrder(db: DatabaseSync, id: string, status = "draft") {
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
           VALUES ('${id}', 'TD-${id}', 's1', '${status}', 'K', '0900000009', '${NOW}', '${NOW}')`);
}
function seedService(db: DatabaseSync, id: string, orderId: string, extra = "") {
  db.exec(`INSERT INTO order_service (id, order_id, name, unit, pax_adult ${extra ? ", " + extra.split("=")[0] : ""}) VALUES ('${id}', '${orderId}', 'Tour', 'perPax', 2 ${extra ? ", " + extra.split("=")[1] : ""})`);
}
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);

test("backfill: mỗi dòng tiền cũ thành một dịch vụ nhập tay, dùng lại id của dòng", () => {
  const db = open(upTo("0007_audit_open_actions_catalog_code_money_guards.sql"));
  seedStaff(db);
  seedOrder(db, "o1", "confirmed");
  seedOrder(db, "o2", "draft");
  db.exec(`INSERT INTO order_item (id, order_id, description, quantity, unit_price, line_total, sort_order) VALUES
    ('i1', 'o1', 'Tour A', 2, 100, 200, 0), ('i2', 'o1', 'Áo phao', 1, 50, 50, 1), ('i3', 'o2', 'Tour B', 1, 10, 10, 0)`);
  db.exec(sqlOf("0008_order_service.sql"));
  const services = db.prepare("SELECT id, order_id, name, unit, catalog_code, pax_adult, depart_date FROM order_service ORDER BY id").all();
  assert.deepEqual(
    services.map((s) => ({ ...s })),
    [
      { id: "i1", order_id: "o1", name: "Tour A", unit: "manual", catalog_code: null, pax_adult: 0, depart_date: null },
      { id: "i2", order_id: "o1", name: "Áo phao", unit: "manual", catalog_code: null, pax_adult: 0, depart_date: null },
      { id: "i3", order_id: "o2", name: "Tour B", unit: "manual", catalog_code: null, pax_adult: 0, depart_date: null },
    ],
  );
  assert.deepEqual(db.prepare("SELECT id, service_id FROM order_item ORDER BY id").all().map((r) => ({ ...r })), [
    { id: "i1", service_id: "i1" }, { id: "i2", service_id: "i2" }, { id: "i3", service_id: "i3" },
  ]);
});

test("CHECK: ngày/giờ đúng khuôn dạng, số khách không âm", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "o1");
  const ins = (cols: string, vals: string) => `INSERT INTO order_service (id, order_id, name, unit, ${cols}) VALUES ('${Math.random()}', 'o1', 'T', 'perPax', ${vals})`;
  db.exec(ins("depart_date, depart_time, pickup_time, checkin_date, checkin_time", "'2026-09-20', '07:30', '06:45', '2026-09-20', '23:59'"));
  db.exec(ins("depart_date", "NULL"));
  for (const bad of ["'2026-02-30'", "'2026-9-2'", "'20/09/2026'", "''"]) fails(db, ins("depart_date", bad), /CHECK constraint failed/);
  for (const bad of ["'24:00'", "'7:30'", "'07:60'", "'0730'"]) fails(db, ins("depart_time", bad), /CHECK constraint failed/);
  fails(db, ins("pickup_time", "'25:00'"), /CHECK constraint failed/);
  fails(db, ins("checkin_date", "'2026-13-01'"), /CHECK constraint failed/);
  fails(db, ins("pax_child", "-1"), /CHECK constraint failed/);
  fails(db, `INSERT INTO order_item (id, order_id, description, quantity, unit_price, line_total, pax_code) VALUES ('x', 'o1', 'd', 1, 1, 1, 'giant')`, /CHECK constraint failed/);
});

test("order_item.service_id phải thuộc cùng đơn", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "o1");
  seedOrder(db, "o2");
  seedService(db, "sv1", "o1");
  db.exec(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('i1', 'o1', 'sv1', 'd', 1, 5, 5)`);
  fails(db, `INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('i2', 'o2', 'sv1', 'd', 1, 5, 5)`, /service_scope/);
  fails(db, `UPDATE order_item SET order_id = 'o2' WHERE id = 'i1'`, /service_scope/);
});

test("khoá ngoại: xoá dịch vụ khi còn dòng tiền trỏ vào bị chặn (thứ tự sửa nháp: xoá dòng tiền trước, dịch vụ sau)", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "o1");
  seedService(db, "sv1", "o1");
  db.exec(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('i1', 'o1', 'sv1', 'd', 1, 5, 5)`);
  fails(db, `DELETE FROM order_service WHERE id = 'sv1'`, /FOREIGN KEY constraint failed/);
  db.exec(`DELETE FROM order_item WHERE order_id = 'o1'`);
  db.exec(`DELETE FROM order_service WHERE order_id = 'o1'`); // đúng thứ tự → qua
});

test("đơn không còn nháp: không thêm/xoá dịch vụ, không đổi thành phần; trường vận hành vẫn sửa được", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "o1");
  seedService(db, "sv1", "o1", "depart_date='2026-09-20'");
  db.exec(`UPDATE orders SET status = 'confirmed' WHERE id = 'o1'`);
  fails(db, `INSERT INTO order_service (id, order_id, name, unit) VALUES ('sv2', 'o1', 'T', 'perPax')`, /order_frozen/);
  fails(db, `DELETE FROM order_service WHERE id = 'sv1'`, /order_frozen/);
  for (const col of ["pax_adult = 3", "pax_child = 1", "name = 'X'", "unit = 'per5Pax'", "catalog_code = 'TD1'", "sort_order = 5"]) {
    fails(db, `UPDATE order_service SET ${col} WHERE id = 'sv1'`, /order_frozen/);
  }
  db.exec(`UPDATE order_service SET depart_date = '2026-09-25', depart_time = '08:00', pickup_place = 'KS A', note = 'ăn chay' WHERE id = 'sv1'`);
  fails(db, `UPDATE order_service SET depart_date = NULL WHERE id = 'sv1'`, /incomplete_trip/);
  db.exec(`UPDATE order_service SET pickup_place = NULL, checkin_place = 'Cảng' WHERE id = 'sv1'`);
});

test("chỉ khi CHUYỂN sang xác nhận mới đòi đủ ngày + khách + có dịch vụ", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "none");
  fails(db, `UPDATE orders SET status = 'confirmed' WHERE id = 'none'`, /incomplete_trip/); // không có dịch vụ
  seedOrder(db, "nodate");
  seedService(db, "a", "nodate");
  fails(db, `UPDATE orders SET status = 'confirmed' WHERE id = 'nodate'`, /incomplete_trip/);
  seedOrder(db, "noguest");
  db.exec(`INSERT INTO order_service (id, order_id, name, unit, depart_date) VALUES ('b', 'noguest', 'T', 'perPax', '2026-09-20')`);
  fails(db, `UPDATE orders SET status = 'confirmed' WHERE id = 'noguest'`, /incomplete_trip/);
  seedOrder(db, "ok");
  seedService(db, "c", "ok", "depart_date='2026-09-20'");
  db.exec(`INSERT INTO order_service (id, order_id, name, unit, depart_date, pax_child) VALUES ('d', 'ok', 'T2', 'manual', '2026-09-21', 1)`);
  db.exec(`UPDATE orders SET status = 'confirmed' WHERE id = 'ok'`);
  db.exec(`UPDATE orders SET updated_at = '2026-09-20T00:00:00.000Z' WHERE id = 'ok'`); // cập nhật sau xác nhận không bị chặn lại
  db.exec(`UPDATE orders SET status = 'cancelled' WHERE id = 'ok'`);
});

test("đơn cũ đã xác nhận trước migration (không có ngày/khách) vẫn cập nhật/huỷ được", () => {
  const db = open(upTo("0007_audit_open_actions_catalog_code_money_guards.sql"));
  seedStaff(db);
  seedOrder(db, "old", "confirmed");
  db.exec(`INSERT INTO order_item (id, order_id, description, quantity, unit_price, line_total) VALUES ('i1', 'old', 'Tour', 1, 10, 10)`);
  db.exec(sqlOf("0008_order_service.sql"));
  db.exec(`UPDATE orders SET updated_at = '2026-09-20T00:00:00.000Z' WHERE id = 'old'`);
  db.exec(`UPDATE orders SET status = 'cancelled' WHERE id = 'old'`);
});
