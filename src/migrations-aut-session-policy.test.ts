// Kiểm migration *_aut_session_policy.sql (ADR-0085 Q1): chính sách đăng nhập theo quyền app + hai view công bố của staff mà SQL của auth đọc.
// Tệp tìm theo ĐUÔI tên (số migration đổi được lúc gộp).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_aut_session_policy.sql"));
const all = () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
};
const AT = "2026-10-02T01:00:00.000Z";
const ins = (db: DatabaseSync, id: string, code: string | null, multi: number, to: string | null = null) =>
  db.prepare(
    "INSERT INTO aut_session_policy (id, permission_code, multi, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL)",
  ).run(id, code, multi, AT, to, AT, AT);
function nhanVien(db: DatabaseSync, id: string, perms: string[], roles: string[] = []) {
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-${id}', 'PERSON', 'Người ${id}', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('${id}', '', '09${id.padStart(8, "0")}', 'x', 'sales', 1, '${AT}', 'pty-${id}')`);
  for (const p of perms) db.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('${id}-${p}', '${id}', '${p}', '${AT}', '${AT}', '${AT}')`);
  for (const r of roles) db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-${id}-${r}', 'pty-${id}', '${r}', NULL, '2026-01-01', '${AT}', '${AT}')`);
}

test("(a) đúng một tệp *_aut_session_policy.sql", () => {
  assert.equal(MATCHES.length, 1, JSON.stringify(MATCHES));
});

test("(b) 9 mã đặt được nhận; SUPER_ADMIN, mã lạ, multi ngoài 0/1, permission_code NULL bị CSDL chặn", () => {
  const db = all();
  for (const [i, c] of ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "INTERN", "DRIVER", "DRIVER_PARTNER", "HR"].entries()) ins(db, `ok${i}`, c, i % 2);
  assert.throws(() => ins(db, "x1", "SUPER_ADMIN", 1), /CHECK/);
  assert.throws(() => ins(db, "x2", "BOSS", 1), /CHECK/);
  assert.throws(() => ins(db, "x3", "SALES", 2, "2026-10-03T00:00:00.000Z"), /CHECK/);
  assert.throws(() => ins(db, "x4", null, 1, "2026-10-03T00:00:00.000Z"), /NOT NULL/);
});

test("(c) mỗi quyền tối đa MỘT dòng hiện hành; dòng đã đóng không tính; valid_to_at không trước valid_from_at", () => {
  const db = all();
  ins(db, "p1", "SALES", 1);
  assert.throws(() => ins(db, "p2", "SALES", 0), /UNIQUE/);
  db.prepare("UPDATE aut_session_policy SET valid_to_at = ? WHERE id = 'p1'").run(AT);
  ins(db, "p2", "SALES", 0);
  assert.throws(() => ins(db, "p3", "HR", 0, "2026-01-01T00:00:00.000Z"), /CHECK/);
});

test("(d) v_stf_quyen_mo: chỉ quyền còn hiệu lực; v_stf_nhieu_may_co_dinh: Toàn quyền HOẶC vai IT đang mở (không gắn nơi, chưa đóng)", () => {
  const db = all();
  nhanVien(db, "1", ["SALES"]);
  nhanVien(db, "2", ["SUPER_ADMIN"]);
  nhanVien(db, "3", ["ADMIN"], ["IT"]);
  nhanVien(db, "4", ["ADMIN"], ["DIRECTOR"]);
  db.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, valid_to_at, created_at, updated_at) VALUES ('1-HR-cu', '1', 'HR', '${AT}', '${AT}', '${AT}', '${AT}')`);
  const mo = db.prepare("SELECT staff_id, permission_code FROM v_stf_quyen_mo WHERE staff_id = '1'").all().map((r) => ({ ...r }));
  assert.deepEqual(mo, [{ staff_id: "1", permission_code: "SALES" }], "quyền đã đóng không tính");
  const coDinh = db.prepare("SELECT staff_id FROM v_stf_nhieu_may_co_dinh ORDER BY staff_id").all().map((r) => r.staff_id);
  assert.deepEqual(coDinh, ["2", "3"]);
  db.exec("UPDATE pty_party_role SET valid_to_date = '2026-09-30' WHERE id = 'r-3-IT'");
  assert.deepEqual(db.prepare("SELECT staff_id FROM v_stf_nhieu_may_co_dinh ORDER BY staff_id").all().map((r) => r.staff_id), ["2"], "vai IT đã đóng không tính");
});
