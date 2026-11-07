// Kiểm migration *_xem_nhu_vai.sql (ADR-0180): cột acting_role của phiên (aut_session) và nhật ký (audit_log). Tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { PERMISSION_CODES } from "./shared/permissions.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_xem_nhu_vai.sql"));
const all = () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
};
type Col = { name: string; type: string; notnull: number; dflt_value: unknown };
const col = (db: DatabaseSync, table: string, name: string) =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as Col[]).find((c) => c.name === name);
const ALLOWED = PERMISSION_CODES.filter((c) => c !== "SUPER_ADMIN");
const NOW = "2026-11-07T01:00:00.000Z";
const LATER = "2026-11-14T01:00:00.000Z";
function staffId(db: DatabaseSync): string {
  const r = db.prepare("SELECT id FROM staff LIMIT 1").get() as { id: string } | undefined;
  if (r) return r.id;
  db.exec("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '2026-10-01T00:00:00.000Z')");
  return "s1";
}
const insSession = (db: DatabaseSync, id: string, sid: string, role: string | null) =>
  db.prepare(
    "INSERT INTO aut_session (id, staff_id, method, single, device_label, user_agent, ip, created_at, updated_at, last_seen_at, expires_at, acting_role) " +
      "VALUES (?, ?, 'PIN', 0, 'x', 'ua', '1.2.3.4', ?, ?, ?, ?, ?)",
  ).run(id, sid, NOW, NOW, NOW, LATER, role);

test("(a) đúng một tệp *_xem_nhu_vai.sql", () => {
  assert.equal(MATCHES.length, 1, JSON.stringify(MATCHES));
});

test("(b) aut_session.acting_role: TEXT, cho rỗng, không mặc định", () => {
  const c = col(all(), "aut_session", "acting_role");
  assert.ok(c, "thiếu cột aut_session.acting_role");
  assert.equal(c.type, "TEXT");
  assert.equal(c.notnull, 0);
  assert.equal(c.dflt_value, null);
});

test("(c) audit_log.acting_role: TEXT, cho rỗng", () => {
  const c = col(all(), "audit_log", "acting_role");
  assert.ok(c, "thiếu cột audit_log.acting_role");
  assert.equal(c.type, "TEXT");
  assert.equal(c.notnull, 0);
});

test("(d) CHECK của phiên: rỗng và 10 mã quyền (không SUPER_ADMIN) qua; mã khác bị chặn", () => {
  assert.equal(ALLOWED.length, 10);
  const db = all();
  const s = staffId(db);
  insSession(db, "n", s, null);
  ALLOWED.forEach((code, i) => insSession(db, `ok${i}`, s, code));
  for (const bad of ["SUPER_ADMIN", "sales", "", "XYZ"]) assert.throws(() => insSession(db, `bad-${bad}`, s, bad), /CHECK/, bad);
});

test("(e) audit_log.acting_role nhận mã vai và rỗng", () => {
  const db = all();
  const ins = (id: string, role: string | null) =>
    db.prepare("INSERT INTO audit_log (id, action, created_at, acting_role) VALUES (?, 'x', ?, ?)").run(id, NOW, role);
  ins("a1", null);
  ins("a2", "SALES");
});
