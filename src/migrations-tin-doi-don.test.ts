// Kiểm migration view `v_aud_order_change` (ADR-0062 Đ1 + ADR-0052 D6.2 MQ-07) trên SQLite thật (node:sqlite). Tệp tìm theo ĐUÔI tên (số migration đổi được
// lúc gộp — CHANGE-GUIDE công thức d). View lọc ĐÚNG tập nguồn đã khai (HANH_DONG_TIN_DOI — gồm `order_money_adjusted` khai trước), chỉ dòng có đơn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { HANH_DONG_TIN_DOI } from "./shared/thong-bao.ts";

const DIR = join(import.meta.dirname, "..", "migrations");
const TEP = readdirSync(DIR).filter((f) => f.endsWith("_aud_order_change.sql"));
function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(join(DIR, f), "utf8"));
  return db;
}
const T = "2026-10-08T01:00:00.000Z";

test("có đúng MỘT tệp migration *_aud_order_change.sql", () => {
  assert.equal(TEP.length, 1, JSON.stringify(TEP));
});

test("view v_aud_order_change: đúng 7 cột (id, order_id, staff_id, action, detail, created_at, leg_id)", () => {
  const db = moi();
  const cot = (db.prepare("SELECT name FROM pragma_table_info('v_aud_order_change')").all() as { name: string }[]).map((r) => r.name);
  assert.deepEqual(cot, ["id", "order_id", "staff_id", "action", "detail", "created_at", "leg_id"]);
});

test("IN (…) của view = ĐÚNG HANH_DONG_TIN_DOI (so tập — bỏ một hành động khỏi view hoặc hằng → đỏ)", () => {
  const sql = readFileSync(join(DIR, TEP[0]!), "utf8").replace(/--.*$/gm, "");
  const m = /WHERE[\s\S]*\baction\s+IN\s*\(([^)]*)\)/i.exec(sql); // IN (…) của mệnh đề WHERE (CASE … IN ở cột leg_id không tính)
  assert.ok(m, "không thấy WHERE … action IN (…)");
  const trongView = [...m[1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
  assert.deepEqual(trongView, [...HANH_DONG_TIN_DOI].sort());
  assert.ok(trongView.includes("order_money_adjusted"), "ADR-0062 Đ1 cách (a): khai trước order_money_adjusted");
});

test("lọc: dòng không đơn (order_id NULL) và hành động ngoài tập nguồn (staff_updated, updated, confirmed) không lọt; leg_id chỉ khi dòng chặng ghi được chặng", () => {
  const db = moi();
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '${T}')`);
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-1', 's1', 'confirmed', 'K', '0900000009', '${T}', '${T}')`);
  const ghi = (id: string, action: string, orderId: string | null, targetType: string | null, targetId: string | null) =>
    db.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, 's1', ?, ?, ?, 'x', ?)")
      .run(id, orderId, action, targetType, targetId, T);
  ghi("a1", "trip_updated", "o1", "order", "o1");
  ghi("a2", "order_leg_updated", "o1", "order", "leg-1"); // dòng mới: target_id = chặng
  ghi("a3", "order_leg_updated", "o1", "order", "o1"); // dòng cũ: target_id = đơn → leg_id NULL
  ghi("a4", "order_money_adjusted_by_field", "o1", "order", "o1");
  ghi("a5", "staff_updated", null, "staff", "s1");
  ghi("a6", "updated", "o1", "order", "o1");
  ghi("a7", "confirmed", "o1", "order", "o1");
  ghi("a8", "trip_updated", null, "order", null);
  ghi("a9", "order_leg_closed", "o1", "order", "leg-2");
  const r = db.prepare("SELECT id, leg_id FROM v_aud_order_change ORDER BY id").all() as { id: string; leg_id: string | null }[];
  assert.deepEqual(r.map((x) => [x.id, x.leg_id]), [["a1", null], ["a2", "leg-1"], ["a3", null], ["a4", null], ["a9", "leg-2"]]);
});
