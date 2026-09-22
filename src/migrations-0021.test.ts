// Kiểm migration 0021 (bảng order_money_adjustment — dòng điều chỉnh chỉ-thêm, ADR-0014 điều 6) trên SQLite thật (node:sqlite).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

function open(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}

const NOW = "2026-09-22T00:00:00.000Z";
let staffSeq = 0;
function seedOrder(db: DatabaseSync, id = "o1") {
  const staffId = `s${++staffSeq}`;
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('${staffId}', 'NV', '090000000${staffSeq}', 'x', 'sales', '${NOW}')`);
  db.exec(
    `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
     VALUES ('${id}', 'TD-${id}', '${staffId}', 'confirmed', 'K', '0900000009', '${NOW}', '${NOW}')`,
  );
}
const insertAdjustment = (db: DatabaseSync, id: string, orderId: string, seq: number) =>
  db.exec(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES ('${id}','${orderId}',${seq},'[]','[]',0,0)`);

test("0021: chèn được dòng điều chỉnh đầu tiên (seq=1)", () => {
  const db = open();
  seedOrder(db);
  insertAdjustment(db, "a1", "o1", 1);
  const row = db.prepare("SELECT seq FROM order_money_adjustment WHERE id = 'a1'").get() as { seq: number };
  assert.equal(row.seq, 1);
});

test("0021: hai dòng cùng seq của cùng đơn bị chặn (UNIQUE order_id+seq)", () => {
  const db = open();
  seedOrder(db);
  insertAdjustment(db, "a1", "o1", 1);
  assert.throws(() => insertAdjustment(db, "a2", "o1", 1), /UNIQUE/);
});

test("0021: cùng seq nhưng KHÁC đơn thì không bị chặn", () => {
  const db = open();
  seedOrder(db, "o1");
  seedOrder(db, "o2");
  insertAdjustment(db, "a1", "o1", 1);
  insertAdjustment(db, "a2", "o2", 1); // không throw
  assert.equal(db.prepare("SELECT count(*) AS n FROM order_money_adjustment").get()!["n"], 2);
});

test("0021: order_id sai (không tồn tại) bị khoá ngoại chặn", () => {
  const db = open();
  assert.throws(() => insertAdjustment(db, "a1", "khong-ton-tai", 1), /FOREIGN KEY/);
});

test("0021: chỉ-thêm — UPDATE và DELETE đều bị chặn (P16: quan sát trigger chặn thật bằng cách gỡ trigger rồi thử lại)", () => {
  const db = open();
  seedOrder(db);
  insertAdjustment(db, "a1", "o1", 1);
  assert.throws(() => db.exec(`UPDATE order_money_adjustment SET subtotal_after = 999 WHERE id = 'a1'`), /append_only/);
  assert.throws(() => db.exec(`DELETE FROM order_money_adjustment WHERE id = 'a1'`), /append_only/);
  // Xoá trigger rồi thử lại để CHẮC CHẮN chính trigger (không phải ràng buộc nào khác) là thứ chặn ở trên.
  db.exec("DROP TRIGGER order_money_adjustment_frozen_update");
  db.exec(`UPDATE order_money_adjustment SET subtotal_after = 999 WHERE id = 'a1'`);
  const row = db.prepare("SELECT subtotal_after FROM order_money_adjustment WHERE id = 'a1'").get() as { subtotal_after: number };
  assert.equal(row.subtotal_after, 999, "gỡ trigger thì sửa được — xác nhận trigger là thứ chặn ở trên, không phải cái khác");
});
