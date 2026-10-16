// Kiểm migration *_aut_mfa_email.sql (ADR-0074 điều 4; kế hoạch Phần C Task 1): bảng mã email của bước hai lớp. Tệp tìm theo ĐUÔI tên.
// Bảng chỉ giữ BĂM của mã và của địa chỉ (không lưu địa chỉ, không lưu mã thô); mỗi (người, mục đích) tối đa một mã còn mở.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_aut_mfa_email.sql"));
const T0 = "2026-10-16T00:00:00.000Z";
const HAN = "2026-10-16T00:10:00.000Z";

function build(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${T0}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('s2', '', '0900000002', 'x', 'sales', 1, '${T0}')`);
  return db;
}
const ma = (db: DatabaseSync, id: string, staff: string, o: { purpose?: string; attempts?: number; used?: string | null; revoked?: string | null } = {}) =>
  db.prepare(
    "INSERT INTO aut_mfa_email_code (id, staff_id, purpose, email_hash, code_hash, created_at, created_by, updated_at, updated_by, expires_at, attempts, used_at, revoked_at) " +
      "VALUES (?, ?, ?, 'eh', 'ch', ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(id, staff, o.purpose ?? "login", T0, staff, T0, staff, HAN, o.attempts ?? 0, o.used ?? null, o.revoked ?? null);

test("(a) đúng một tệp *_aut_mfa_email.sql, số 0102, không phải migration siết B5", () => {
  assert.deepEqual(MATCHES, ["0102_aut_mfa_email.sql"]);
  assert.doesNotMatch(MATCHES[0]!, /staff_party_required/);
});

test("(b) cột: không có cột địa chỉ / mã thô; có cột kiểm toán (ADR-0003)", () => {
  const db = build();
  const cols = (db.prepare("PRAGMA table_info(aut_mfa_email_code)").all() as { name: string }[]).map((c) => c.name);
  for (const c of ["id", "staff_id", "purpose", "email_hash", "code_hash", "created_at", "created_by", "updated_at", "updated_by", "expires_at", "attempts", "used_at", "revoked_at"])
    assert.ok(cols.includes(c), `thiếu cột ${c}`);
  for (const c of cols) assert.doesNotMatch(c, /^(email|code|ma)$/, `cột ${c} trông như giữ giá trị thô`);
});

test("(c) CHECK: mục đích chỉ login/enroll; số lần nhập 0–5; staff_id phải có thật", () => {
  const db = build();
  ma(db, "a", "s1");
  ma(db, "b", "s1", { purpose: "enroll" });
  assert.throws(() => ma(db, "c", "s2", { purpose: "reset" }), /CHECK/);
  assert.throws(() => ma(db, "d", "s2", { attempts: 6 }), /CHECK/);
  assert.throws(() => ma(db, "e", "s2", { attempts: -1 }), /CHECK/);
  assert.throws(() => ma(db, "f", "khong-co", { purpose: "enroll" }), /FOREIGN KEY/);
  assert.throws(() => db.prepare("UPDATE aut_mfa_email_code SET attempts = 6 WHERE id = 'a'").run(), /CHECK/);
});

test("(d) mỗi (người, mục đích) tối đa MỘT mã còn mở; mã đã dùng / đã huỷ không tính; người khác không vướng", () => {
  const db = build();
  ma(db, "a", "s1");
  assert.throws(() => ma(db, "b", "s1"), /UNIQUE/);
  ma(db, "c", "s1", { purpose: "enroll" });
  ma(db, "d", "s2");
  db.prepare("UPDATE aut_mfa_email_code SET revoked_at = ? WHERE id = 'a'").run(T0);
  ma(db, "e", "s1");
  db.prepare("UPDATE aut_mfa_email_code SET used_at = ? WHERE id = 'e'").run(T0);
  ma(db, "f", "s1");
  ma(db, "g", "s1", { used: T0 });
  ma(db, "h", "s1", { revoked: T0 });
});
