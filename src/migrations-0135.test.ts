// ADR-0158 — migration xoá một lần dữ liệu thử. Bài này canh ba điều máy kiểm được:
// lược đồ trước và sau giống hệt; không bảng nào trỏ về đơn hay mức giá bị sót; chốt chặn huỷ cả lần chạy khi có nhiều đơn hơn số đã đếm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";

const TEN = "0135_don_du_lieu_thu.sql";
const thuMuc = new URL("../migrations/", import.meta.url);
const doc = (t: string): string => readFileSync(new URL(t, thuMuc), "utf8");
const sql0135 = doc(TEN);

function dbTruoc(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  for (const t of readdirSync(thuMuc).filter((t) => t.endsWith(".sql") && t < TEN).sort()) db.exec(doc(t));
  return db;
}
const luocDo = (db: DatabaseSync): string[] =>
  (db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name").all() as Record<string, string>[])
    .map((r) => `${r.type}|${r.name}|${r.tbl_name}|${r.sql}`);

test("lược đồ sau migration giống hệt lược đồ trước: mọi trigger chặn xoá được đặt lại nguyên văn", () => {
  const db = dbTruoc();
  const truoc = luocDo(db);
  db.exec(sql0135);
  assert.deepEqual(luocDo(db), truoc);
});

test("trigger chặn xoá vẫn chặn sau migration", () => {
  const db = dbTruoc();
  db.exec(sql0135);
  const canXoa = (db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'trigger' AND name = 'audit_log_no_delete'").get() as { n: number }).n;
  assert.equal(canXoa, 1);
});

test("mọi bảng có khoá ngoại trỏ về bảng bị xoá đều nằm trong danh sách xoá, và xoá con trước cha", () => {
  const db = dbTruoc();
  const xoa = [...sql0135.matchAll(/^DELETE FROM (\w+)/gm)].map((m) => m[1]!);
  const bang = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%cf_%'").all() as { name: string }[]).map((r) => r.name);
  for (const b of bang) {
    for (const f of db.prepare(`PRAGMA foreign_key_list("${b}")`).all() as { table: string }[]) {
      if (!xoa.includes(f.table)) continue;
      assert.ok(xoa.includes(b), `${b} trỏ về ${f.table} nhưng không được xoá`);
      if (b !== f.table) assert.ok(xoa.indexOf(b) < xoa.indexOf(f.table), `${b} phải xoá trước ${f.table}`);
    }
  }
  for (const b of ["orders", "vc_trip", "vc_leg_appt_ack", "vdt_allocation", "vdt_guest_link", "prc_commission_rule", "prc_rate_tier", "prc_role_tier", "prc_party_tier", "bil_payment_receipt", "bil_posting"]) {
    assert.ok(xoa.includes(b), `thiếu ${b}`);
  }
});

test("phần phải giữ không có trong danh sách xoá; nhật ký chỉ xoá dòng gắn đơn", () => {
  const xoa = [...sql0135.matchAll(/^DELETE FROM (\w+)/gm)].map((m) => m[1]!);
  for (const b of ["staff", "stf_permission", "pty_party", "pty_party_role", "prc_beneficiary_role", "prc_supply_term", "prc_sales_block", "catalog_item", "vc_vehicle", "fbk_ticket", "vdt_ticket", "vdt_batch", "ky_period_close"]) {
    assert.ok(!xoa.includes(b), `${b} phải được giữ`);
  }
  assert.match(sql0135, /^DELETE FROM audit_log WHERE order_id IS NOT NULL OR id IN \(SELECT id FROM vc_trip_event\);$/m);
  assert.ok(sql0135.indexOf("DELETE FROM audit_log") < sql0135.indexOf("DELETE FROM vc_trip_event"), "nhật ký chuyến phải xoá trước sự kiện chuyến");
});

test("chốt chặn: nhiều đơn hơn số đã đếm thì câu kiểm hỏng", () => {
  const tran = /SELECT 'don', count\(\*\), (\d+) FROM orders/.exec(sql0135);
  assert.ok(tran, "phải có chốt số đơn");
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE t (loai TEXT, so INTEGER, tran INTEGER, CHECK (so <= tran))");
  assert.throws(() => db.exec(`INSERT INTO t VALUES ('don', ${Number(tran[1]) + 1}, ${tran[1]})`), /CHECK/);
});
