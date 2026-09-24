import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
const dir = process.argv[2];
const db = new DatabaseSync(":memory:");
for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(`${dir}/${f}`, "utf8"));
const qs = {
  confirmedAll: `SELECT id, discount, total, deposit_amount, remaining_amount FROM orders WHERE status = 'confirmed'`,
  todayOrder: `SELECT o.id, os.depart_date, os.pickup_time, os.pickup_place FROM orders o JOIN order_service os ON os.order_id = o.id WHERE o.status = 'confirmed' AND os.depart_date = ?1 AND os.id = (SELECT id FROM order_service os2 WHERE os2.order_id = o.id AND os2.depart_date IS NOT NULL ORDER BY os2.depart_date, (os2.pickup_time IS NULL), os2.pickup_time, os2.sort_order, os2.id LIMIT 1) ORDER BY (os.pickup_time IS NULL), os.pickup_time, os.sort_order, os.id`,
  draftCount: `SELECT COUNT(*) AS n FROM orders WHERE status = 'draft'`,
  unassigned: `SELECT COUNT(*) AS n FROM orders o WHERE o.status = 'confirmed' AND NOT EXISTS (SELECT 1 FROM v_dsp_order_handler h WHERE h.order_id = o.id)`,
  weekRows: `SELECT id FROM orders WHERE status = 'confirmed' AND staff_id = ?1 AND created_at >= ?2 AND created_at < ?3`,
  latestAdj: `SELECT a.order_id, a.after_json FROM order_money_adjustment a WHERE a.order_id IN (SELECT value FROM json_each(?1)) AND a.seq = (SELECT MAX(seq) FROM order_money_adjustment b WHERE b.order_id = a.order_id)`,
  listPage: `SELECT id FROM orders o ORDER BY o.created_at DESC, o.rowid DESC LIMIT 31 OFFSET 0`,
};
for (const [k, q] of Object.entries(qs)) {
  try { console.log(k, "→", db.prepare("EXPLAIN QUERY PLAN " + q).all().map((r) => r.detail).join(" | ")); } catch (e) { console.log(k, "LỖI", e.message); }
}
console.log("indexes on orders:", db.prepare("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='orders'").all().map((r) => r.name + ": " + (r.sql ?? "auto")).join(" ; "));
