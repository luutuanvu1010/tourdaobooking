// Migration Vé hỗ trợ đợt 2a (ADR-0127): fbk_ticket thêm mức ưu tiên (priority) và mã đơn liên quan (order_id + order_code, cùng có hoặc cùng vắng).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MOI = files.find((f) => f.endsWith("_ve_ho_tro_2a.sql"));
const NOW = "2026-10-16T00:00:00.000Z";

/** Câu INSERT của mã đợt 1 (không nêu cột mới) — phải chạy được cả trước lẫn sau migration (hoàn tác bằng rollback mã, không xoá cột). */
const insertCu = (id: string, seq: number, req: string) =>
  `INSERT INTO fbk_ticket (id, seq, kind_code, status_code, title, context, submitter_id, client_request_id, last_activity_at, created_at, updated_at, team_id)
   VALUES ('${id}', ${seq}, 'BUG', 'NEW', 'Phiếu', '{}', 's1', '${req.repeat(36)}', '${NOW}', '${NOW}', '${NOW}', 'fbk-team-ky-thuat')`;
const insertMoi = (id: string, seq: number, req: string, orderId: string | null, orderCode: string | null, priority = "NORMAL") =>
  `INSERT INTO fbk_ticket (id, seq, kind_code, status_code, title, context, submitter_id, client_request_id, last_activity_at, created_at, updated_at, team_id, priority, order_id, order_code)
   VALUES ('${id}', ${seq}, 'BUG', 'NEW', 'Phiếu', '{}', 's1', '${req.repeat(36)}', '${NOW}', '${NOW}', '${NOW}', 'fbk-team-ky-thuat', '${priority}',
           ${orderId === null ? "NULL" : `'${orderId}'`}, ${orderCode === null ? "NULL" : `'${orderCode}'`})`;

/** Dựng CSDL tới trước migration mới, gieo một phiếu CŨ, rồi áp migration mới (đúng thứ tự production). */
function dung(): DatabaseSync {
  assert.ok(MOI, "chưa có migration *_ve_ho_tro_2a.sql");
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files.filter((f) => f < MOI!)) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec(insertCu("t-cu", 1, "a"));
  db.exec(readFileSync(new URL(MOI!, DIR), "utf8"));
  return db;
}
const one = (db: DatabaseSync, sql: string) => db.prepare(sql).get() as Record<string, unknown>;

test("phiếu CŨ nhận priority = NORMAL, order_id / order_code NULL; số dòng không đổi", () => {
  const db = dung();
  const r = one(db, "SELECT priority, order_id, order_code FROM fbk_ticket WHERE id = 't-cu'");
  assert.deepEqual({ ...r }, { priority: "NORMAL", order_id: null, order_code: null });
  assert.equal(one(db, "SELECT count(*) AS n FROM fbk_ticket").n, 1);
});

test("câu INSERT của mã cũ (không nêu cột mới) vẫn chạy trên cấu trúc mới", () => {
  const db = dung();
  db.exec(insertCu("t-ma-cu", 2, "b"));
  assert.equal(one(db, "SELECT priority FROM fbk_ticket WHERE id = 't-ma-cu'").priority, "NORMAL");
});

test("order_id và order_code cùng có hoặc cùng vắng (CHECK, cả hai chiều)", () => {
  const db = dung();
  assert.throws(() => db.exec(insertMoi("t-x", 3, "c", "o-1", null)), /CHECK/);
  assert.throws(() => db.exec(insertMoi("t-y", 4, "d", null, "TD-20261016-0001")), /CHECK/);
  db.exec(insertMoi("t-z", 5, "e", "o-1", "TD-20261016-0001"));
  assert.equal(one(db, "SELECT order_code FROM fbk_ticket WHERE id = 't-z'").order_code, "TD-20261016-0001");
  assert.throws(() => db.exec("UPDATE fbk_ticket SET order_code = NULL WHERE id = 't-z'"), /CHECK/);
});

test("priority KHÔNG có CHECK liệt kê (giá trị hợp lệ kiểm ở mã — src/CLAUDE.md), nhưng vẫn NOT NULL", () => {
  const db = dung();
  db.exec(insertMoi("t-la", 6, "f", null, null, "BAT_KY"));
  db.exec("UPDATE fbk_ticket SET priority = 'MUC_KHAC' WHERE id = 't-cu'");
  assert.throws(() => db.exec("UPDATE fbk_ticket SET priority = NULL WHERE id = 't-cu'"), /NOT NULL/);
});

test("migration chỉ THÊM cột: không view, không chỉ mục, không trigger mới; không đụng 0100", () => {
  const sql = readFileSync(new URL(MOI!, DIR), "utf8").replace(/--.*$/gm, "");
  assert.equal((sql.match(/ALTER TABLE fbk_ticket ADD COLUMN/g) ?? []).length, 3);
  assert.doesNotMatch(sql, /CREATE\s+(VIEW|INDEX|UNIQUE|TRIGGER|TABLE)/i);
  assert.ok(!readFileSync(new URL("0100_ve_ho_tro_nhom.sql", DIR), "utf8").includes("priority"), "0100 không được chứa cột mới");
});
