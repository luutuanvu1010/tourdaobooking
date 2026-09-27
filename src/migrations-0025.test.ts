// Kiểm migration 0025 — Thông báo hệ thống (ADR-0034): 4 bảng ntf_*, ntf_ack chỉ-thêm, 3 view công bố — trên SQLite thật (node:sqlite).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DIR = join(import.meta.dirname, "..", "migrations");
function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(join(DIR, f), "utf8"));
  return db;
}
const T = "2026-09-27T01:00:00.000Z";

// R3: node:sqlite bật foreign_keys — audit_log.order_id/staff_id trỏ orders/staff thật thì phải seed sẵn (khuôn seedOrder ở src/migrations-0021.test.ts:10-24).
let staffSeq = 0;
function seedOrder(db: DatabaseSync, id = "o1"): { staffId: string } {
  const staffId = `s${++staffSeq}`;
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('${staffId}', 'NV', '090000000${staffSeq}', 'x', 'sales', '${T}')`);
  db.exec(
    `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
     VALUES ('${id}', 'TD-${id}', '${staffId}', 'confirmed', 'K', '0900000009', '${T}', '${T}')`,
  );
  return { staffId };
}

test("0025: có đủ bảng và view", () => {
  const db = moi();
  const ten = (type: string) => (db.prepare(`SELECT name FROM sqlite_master WHERE type = ? ORDER BY name`).all(type) as { name: string }[]).map((r) => r.name);
  for (const t of ["ntf_ack", "ntf_notice", "ntf_notice_target", "ntf_read_mark"]) assert.ok(ten("table").includes(t), t);
  for (const v of ["v_aud_order_event", "v_dsp_first_handler", "v_ord_order_owner"]) assert.ok(ten("view").includes(v), v);
});

test("0025: ntf_ack chỉ-thêm (không sửa, không xoá)", () => {
  const db = moi();
  db.prepare(`INSERT INTO ntf_notice (id, tieu_de, noi_dung, quan_trong, client_request_id, created_at, created_by, updated_at, updated_by) VALUES ('n1','A','B',1,'r1',?,'vu',?,'vu')`).run(T, T);
  db.prepare(`INSERT INTO ntf_ack (notice_id, staff_id, created_at, created_by, updated_at, updated_by) VALUES ('n1','lan',?,'lan',?,'lan')`).run(T, T);
  assert.throws(() => db.exec(`UPDATE ntf_ack SET staff_id = 'x'`), /append_only/);
  assert.throws(() => db.exec(`DELETE FROM ntf_ack`), /append_only/);
});

test("0025: một client_request_id của cùng người gửi chỉ một tin", () => {
  const db = moi();
  const ins = db.prepare(`INSERT INTO ntf_notice (id, tieu_de, noi_dung, quan_trong, client_request_id, created_at, created_by, updated_at, updated_by) VALUES (?, 'A','B',0,'r1',?,'vu',?,'vu')`);
  ins.run("n1", T, T);
  assert.throws(() => ins.run("n2", T, T), /UNIQUE/);
});

test("0025: v_aud_order_event chỉ lấy 6 hành động về đơn", () => {
  const db = moi();
  const { staffId } = seedOrder(db);
  const ins = db.prepare(`INSERT INTO audit_log (id, order_id, staff_id, action, created_at) VALUES (?, 'o1', ?, ?, ?)`);
  ["created", "updated", "order_claimed", "confirmed", "trip_updated"].forEach((a, i) => ins.run("a" + i, staffId, a, T));
  const acts = (db.prepare(`SELECT action FROM v_aud_order_event ORDER BY action`).all() as { action: string }[]).map((r) => r.action);
  assert.deepEqual(acts, ["confirmed", "created", "order_claimed"]);
});
