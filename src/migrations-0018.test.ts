// Kiểm migration 0018 (N2 lát 1: orders.booker_party_id) trên SQLite thật (node:sqlite). Mẫu: src/migrations-0017.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const before0018 = files.filter((f) => f < "0018");

function open(list: string[] = files): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-09-21T00:00:00.000Z";
const rows = (db: DatabaseSync, sql: string) => db.prepare(sql).all().map((r) => ({ ...r }));

function seed(db: DatabaseSync): void {
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '${NOW}')`);
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('p1', 'PERSON', 'Khách A', '${NOW}', '${NOW}')`);
}
const insertOrder = (db: DatabaseSync, id: string, booker: string | null) =>
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at, booker_party_id)
           VALUES ('${id}', 'TD-${id}', 's1', 'draft', 'K', '0900000009', '${NOW}', '${NOW}', ${booker === null ? "NULL" : `'${booker}'`})`);

test("0018: cột booker_party_id để trống được, khoá ngoại NO ACTION tới pty_party(id), có chỉ mục", () => {
  const db = open();
  const col = (db.prepare("PRAGMA table_info(orders)").all() as { name: string; notnull: number; dflt_value: unknown }[]).find((c) => c.name === "booker_party_id");
  assert.ok(col, "thiếu cột booker_party_id");
  assert.equal(col.notnull, 0);
  assert.equal(col.dflt_value, null);
  const fk = (db.prepare("PRAGMA foreign_key_list(orders)").all() as { table: string; from: string; to: string; on_delete: string }[]).find((f) => f.from === "booker_party_id");
  assert.deepEqual(fk && { table: fk.table, to: fk.to, on_delete: fk.on_delete }, { table: "pty_party", to: "id", on_delete: "NO ACTION" });
  assert.ok(rows(db, "PRAGMA index_list(orders)").some((i) => i.name === "orders_booker_party_idx"));
});

test("0018: gắn hồ sơ có thật được, hồ sơ không tồn tại bị khoá ngoại chặn, NULL được", () => {
  const db = open();
  seed(db);
  insertOrder(db, "o1", "p1");
  insertOrder(db, "o2", null);
  assert.throws(() => insertOrder(db, "o3", "khong-co"), /FOREIGN KEY/);
  assert.deepEqual(rows(db, "SELECT id, booker_party_id FROM orders ORDER BY id"), [{ id: "o1", booker_party_id: "p1" }, { id: "o2", booker_party_id: null }]);
  assert.deepEqual(rows(db, "PRAGMA foreign_key_check"), []);
});

test("0018: đơn cũ giữ nguyên (người đặt để trống), trigger orders_* không mất", () => {
  const old = open(before0018);
  seed(old);
  old.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o0', 'TD-o0', 's1', 'draft', 'K', '0900000009', '${NOW}', '${NOW}')`);
  const triggersBefore = rows(old, "SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'orders' ORDER BY name").map((r) => r.name);
  old.exec(readFileSync(new URL("0018_orders_booker_party.sql", DIR), "utf8"));
  assert.deepEqual(rows(old, "SELECT id, customer_name, booker_party_id FROM orders"), [{ id: "o0", customer_name: "K", booker_party_id: null }]);
  assert.deepEqual(rows(old, "SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'orders' ORDER BY name").map((r) => r.name), triggersBefore);
  assert.ok(triggersBefore.includes("orders_status_transition"), "0017 phải có trước 0018");
});
