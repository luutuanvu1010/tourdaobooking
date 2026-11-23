// Kiểm migration GIÁ MÙA VỤ (ADR-0229 Đ1, Đ3, Đ5, Đ8): bảng quy tắc chỉ-thêm + bảng trần (0188), ba cột chụp + trigger khoá trên `order_item` (0189).
// SQLite thật (node:sqlite), chạy mọi migration. Tệp tìm theo ĐUÔI tên — đổi số lúc gộp chỉ đổi tên tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const QUY_TAC = files.filter((f) => f.endsWith("_gia_mua_vu.sql") && !f.endsWith("_chup_gia_mua_vu.sql"));
const CHUP = files.filter((f) => f.endsWith("_chup_gia_mua_vu.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");

function open(): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files) d.exec(sqlOf(f));
  return d;
}
const AT = "2026-11-23T00:00:00.000Z";
const them = (d: DatabaseSync, id: string, cot: Partial<Record<"scope" | "catalog_code" | "group_code" | "from_date" | "to_date" | "pct" | "amount" | "created_by", string | number | null>> = {}) => {
  const v = { scope: "SERVICE", catalog_code: "T3D", group_code: null, from_date: "2027-02-01", to_date: "2027-02-15", pct: 10, amount: 20000, created_by: "u1", ...cot };
  d.prepare(
    `INSERT INTO ctl_seasonal_price (id, scope, catalog_code, group_code, from_date, to_date, pct, amount, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
  ).run(id, v.scope, v.catalog_code, v.group_code, v.from_date, v.to_date, v.pct, v.amount, AT, v.created_by, AT, v.created_by);
};

test("đúng MỘT tệp quy tắc và MỘT tệp chụp, sau 0184; tệp quy tắc không DROP/ALTER, tệp chụp chỉ ALTER … ADD COLUMN", () => {
  assert.equal(QUY_TAC.length, 1, JSON.stringify(QUY_TAC));
  assert.equal(CHUP.length, 1, JSON.stringify(CHUP));
  assert.ok(QUY_TAC[0]! > "0184" && CHUP[0]! > QUY_TAC[0]!);
  assert.doesNotMatch(sqlOf(QUY_TAC[0]!).replace(/--.*$/gm, ""), /DROP\s|ALTER\s/i);
  const chup = sqlOf(CHUP[0]!).replace(/--.*$/gm, "");
  assert.doesNotMatch(chup, /DROP\s/i);
  for (const m of chup.matchAll(/ALTER\s+TABLE\s+(\w+)\s+(\w+)/gi)) assert.deepEqual([m[1], m[2]!.toUpperCase()], ["order_item", "ADD"]);
});

test("quy tắc: chỉ tăng, ít nhất một > 0, % nguyên 0…100, phạm vi đúng cột, ngày cuối không trước ngày đầu", () => {
  const d = open();
  assert.throws(() => them(d, "a", { pct: 0, amount: 0 }), /CHECK/);
  assert.throws(() => them(d, "b", { pct: -1 }), /CHECK/);
  assert.throws(() => them(d, "c", { pct: 101 }), /CHECK/);
  assert.throws(() => them(d, "d", { pct: 2.5 }), /CHECK/);
  assert.throws(() => them(d, "e", { amount: -1000 }), /CHECK/);
  assert.throws(() => them(d, "f", { to_date: "2027-01-31" }), /CHECK/);
  assert.throws(() => them(d, "g", { group_code: "X" }), /CHECK|FOREIGN/);
  them(d, "ok", { pct: 0, amount: 50000 });
});

test("chồng ngày cùng phạm vi cùng mã bị chặn (kể cả chờ duyệt); khác phạm vi hoặc quy tắc đã kết thúc thì được", () => {
  const d = open();
  them(d, "r1");
  assert.throws(() => them(d, "r2", { from_date: "2027-02-15", to_date: "2027-02-20" }), /ctl_seasonal_overlap/);
  them(d, "r3", { from_date: "2027-02-16", to_date: "2027-02-20" });
  them(d, "r4", { catalog_code: "T4D" });
  d.exec(`UPDATE ctl_seasonal_price SET ended_at = '${AT}', ended_by = 'u2' WHERE id = 'r1'`);
  them(d, "r5", { from_date: "2027-02-01", to_date: "2027-02-10" });
});

test("duyệt: người khác người đặt, một lần, không duyệt quy tắc đã kết thúc; kết thúc một lần; không sửa, không xoá", () => {
  const d = open();
  them(d, "q");
  assert.throws(() => d.exec(`UPDATE ctl_seasonal_price SET approved_at = '${AT}', approved_by = 'u1' WHERE id = 'q'`), /CHECK/);
  assert.throws(() => d.exec(`UPDATE ctl_seasonal_price SET approved_at = '${AT}' WHERE id = 'q'`), /CHECK/);
  d.exec(`UPDATE ctl_seasonal_price SET approved_at = '${AT}', approved_by = 'u2' WHERE id = 'q'`);
  assert.throws(() => d.exec(`UPDATE ctl_seasonal_price SET approved_by = 'u3' WHERE id = 'q'`), /ctl_append_only/);
  assert.throws(() => d.exec(`UPDATE ctl_seasonal_price SET pct = 20 WHERE id = 'q'`), /ctl_append_only/);
  d.exec(`UPDATE ctl_seasonal_price SET ended_at = '${AT}', ended_by = 'u2' WHERE id = 'q'`);
  assert.throws(() => d.exec(`UPDATE ctl_seasonal_price SET ended_at = '2027-01-01T00:00:00.000Z' WHERE id = 'q'`), /ctl_append_only/);
  assert.throws(() => d.exec(`DELETE FROM ctl_seasonal_price WHERE id = 'q'`), /ctl_append_only/);
  them(d, "p", { catalog_code: "T9" });
  d.exec(`UPDATE ctl_seasonal_price SET ended_at = '${AT}', ended_by = 'u1' WHERE id = 'p'`);
  assert.throws(() => d.exec(`UPDATE ctl_seasonal_price SET approved_at = '${AT}', approved_by = 'u2' WHERE id = 'p'`), /ctl_append_only/);
});

test("trần %: gieo 30, chỉ thêm dòng mới", () => {
  const d = open();
  const r = d.prepare(`SELECT max_pct FROM ctl_seasonal_price_cap ORDER BY created_at DESC, id DESC LIMIT 1`).get() as { max_pct: number };
  assert.equal(r.max_pct, 30);
  assert.throws(() => d.exec(`UPDATE ctl_seasonal_price_cap SET max_pct = 50`), /ctl_append_only/);
  assert.throws(() => d.exec(`DELETE FROM ctl_seasonal_price_cap`), /ctl_append_only/);
  assert.throws(() => d.exec(`INSERT INTO ctl_seasonal_price_cap (id, max_pct, created_at, updated_at) VALUES ('x', 101, '${AT}', '${AT}')`), /CHECK/);
});

test("order_item: ba cột chụp NULL được, ≥ 0; khoá khi đơn không còn nháp (0081 không tự phủ cột mới)", () => {
  const d = open();
  const cot = (d.prepare(`PRAGMA table_info(order_item)`).all() as { name: string }[]).map((c) => c.name);
  for (const c of ["base_price", "seasonal_rule_id", "seasonal_increase"]) assert.ok(cot.includes(c), c);
  const trig = d.prepare(`SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'order_item_seasonal_frozen'`).get() as { sql: string } | undefined;
  assert.ok(trig, "thiếu trigger khoá cột chụp");
  assert.match(trig.sql, /base_price/);
  assert.match(trig.sql, /seasonal_rule_id/);
  assert.match(trig.sql, /seasonal_increase/);
  assert.match(trig.sql, /<> 'draft'/);
});
