// Kiểm migration N1 (0009…0012) trên SQLite thật (node:sqlite) với schema dựng từ migrations/*.sql — bản chuyển thể của
// docs/superpowers/specs/2026-09-20-n1-schema-verify.py. D1 là SQLite và bật khoá ngoại, nên đây là lưới đầu tiên; e2e xác nhận lại trên D1 local.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const upTo = (prefix: string) => files.filter((f) => f.slice(0, 4) <= prefix);

function open(list: string[] = files): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-09-20T00:00:00.000Z";
const rows = (db: DatabaseSync, sql: string, ...args: (string | number | null)[]) => db.prepare(sql).all(...args).map((r) => ({ ...r }));
const one = (db: DatabaseSync, sql: string, ...args: (string | number | null)[]) => Object.values(db.prepare(sql).get(...args) ?? {})[0];
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);

// ---------------------------------------------------------------------------------------------------------------------
// 0009 + 0010: orders label view, locations
// ---------------------------------------------------------------------------------------------------------------------
test("0009: v_ord_order_label chỉ có (id, order_code) và trả mã đơn", () => {
  const db = open(upTo("0009"));
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '${NOW}')`);
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-1', 's1', 'draft', 'K', '0900000009', '${NOW}', '${NOW}')`);
  assert.deepEqual(db.prepare("PRAGMA table_info(v_ord_order_label)").all().map((c) => c.name), ["id", "order_code"]);
  assert.deepEqual(rows(db, "SELECT id, order_code FROM v_ord_order_label"), [{ id: "o1", order_code: "TD-1" }]);
});

test("0010: 8 địa điểm gieo, id cố định giữa các lần dựng, 4 loại", () => {
  const a = open(upTo("0010"));
  const b = open(upTo("0010"));
  const codes = ["BEN_TAU_NHA_TRANG", "CANG_VINPEARL", "QUAY_VE_01", "QUAY_VE_02", "QUAY_VE_03", "QUAY_VE_04", "VP_2_THANG_4", "VP_TRAN_PHU"];
  assert.deepEqual(rows(a, "SELECT code FROM loc_location ORDER BY code").map((r) => r.code), codes);
  assert.deepEqual(rows(a, "SELECT id, code FROM loc_location ORDER BY code"), rows(b, "SELECT id, code FROM loc_location ORDER BY code"), "id gieo phải giống nhau ở mọi môi trường");
  for (const r of rows(a, "SELECT id FROM loc_location")) assert.match(String(r.id), /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  assert.deepEqual(rows(a, "SELECT code FROM loc_location_type ORDER BY sort_order").map((r) => r.code), ["OFFICE", "TICKET_COUNTER", "PIER", "PORT"]);
  assert.equal(one(a, "SELECT count(*) FROM loc_location WHERE location_type_code = 'TICKET_COUNTER'"), 4);
});

test("0010: ràng buộc địa điểm (mã trùng, mã chữ thường, loại lạ, tên rỗng, cờ active)", () => {
  const db = open(upTo("0010"));
  const ins = (id: string, code: string, name: string, type: string, active = 1) =>
    `INSERT INTO loc_location (id, code, name, location_type_code, active, created_at, updated_at) VALUES ('${id}', '${code}', '${name}', '${type}', ${active}, '${NOW}', '${NOW}')`;
  db.exec(ins("x1", "QUAY_VE_05", "Quầy vé 05", "TICKET_COUNTER"));
  fails(db, ins("x2", "QUAY_VE_05", "Trùng mã", "TICKET_COUNTER"), /UNIQUE/);
  fails(db, ins("x3", "quay_ve_06", "Chữ thường", "TICKET_COUNTER"), /CHECK/);
  fails(db, ins("x4", "LOAI_LA", "Loại lạ", "KHONG_CO"), /FOREIGN KEY/);
  fails(db, ins("x5", "TEN_RONG", "   ", "OFFICE"), /CHECK/);
  fails(db, ins("x6", "CO_LA", "Cờ lạ", "OFFICE", 2), /CHECK/);
});

test("0010: v_loc_location_label chỉ có khoá + nhãn + cờ", () => {
  const db = open(upTo("0010"));
  assert.deepEqual(db.prepare("PRAGMA table_info(v_loc_location_label)").all().map((c) => c.name), ["id", "code", "name", "location_type_code", "active"]);
});
