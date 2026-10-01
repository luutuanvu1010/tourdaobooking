// Kiểm migration *_hanh_chinh_nhan_su.sql (ADR-0071 điều 1a, accepted 2026-10-01): mã quyền HR ("Nhân sự") + vai tài khoản HR_STAFF ("Hành chính nhân sự",
// nhóm Nội bộ) + công tắc trợ lý Hỗ trợ cho mã quyền mới (bật, như mọi mã đã gieo ở 0054 — ADR-0069 điều 3). CHỈ THÊM dòng danh mục; không trigger, không đổi
// quyền / vai / hồ sơ của ai. LC-1 (trigger lc1_stf_permission_external_partner_only, 0037) dùng danh sách NOT IN ('PARTNER', 'DRIVER_PARTNER') nên tự gạt HR
// khỏi tài khoản có vai bên ngoài — bài (e) CHỨNG MINH trên CSDL thật, không suy luận. Tệp tìm theo ĐUÔI tên (số có thể phải đổi khi nhiều nhánh cùng xếp hàng).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { PERMISSION_LABEL } from "./shared/permissions.ts";
import { ROLES } from "./shared/roles.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_hanh_chinh_nhan_su.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
const before = () => open(files.filter((f) => f < FILE));
type Row = Record<string, unknown>;
const row = (db: DatabaseSync, sql: string, ...a: string[]): Row => ({ ...(db.prepare(sql).get(...a) as Row) });
const triggers = (db: DatabaseSync): string[] => (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").all() as { name: string }[]).map((r) => r.name);
const count = (db: DatabaseSync, sql: string): number => (db.prepare(sql).get() as { n: number }).n;

test("(a) đúng một tệp *_hanh_chinh_nhan_su.sql; không phải migration siết B5; không tạo trigger nào", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_hanh_chinh_nhan_su.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/, "src/migrations-n1.test.ts nhận migration siết B5 theo tên tệp");
  const db = before();
  const truoc = triggers(db);
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db), truoc, "migration chỉ thêm dòng danh mục — không trigger mới");
});

test("(b) quyền app HR: nhãn = PERMISSION_LABEL.HR ('Nhân sự'), đang dùng, đứng thứ mười", () => {
  const r = row(all(), "SELECT name, active, sort_order FROM stf_permission_type WHERE code = 'HR'");
  assert.deepEqual(r, { name: PERMISSION_LABEL.HR, active: 1, sort_order: 10 });
  assert.equal(PERMISSION_LABEL.HR, "Nhân sự");
});

test("(c) vai tài khoản HR_STAFF: 'Hành chính nhân sự' (= ROLES.HR_STAFF.name), nhóm Nội bộ, đang dùng, thứ tự 18 (sau Tài xế công ty)", () => {
  const r = row(all(), "SELECT name, role_group, active, sort_order FROM pty_role_type WHERE code = 'HR_STAFF'");
  assert.deepEqual(r, { name: ROLES.HR_STAFF.name, role_group: "INTERNAL", active: 1, sort_order: 18 });
  assert.equal(ROLES.HR_STAFF.name, "Hành chính nhân sự");
  assert.deepEqual([...ROLES.HR_STAFF.defaults], ["HR"]);
  assert.equal(ROLES.HR_STAFF.handles, "never");
  assert.equal(ROLES.HR_STAFF.superAdminOnly, true, "ADR-0071 điều 1d: chỉ Toàn quyền gán vai HCNS");
});

test("(d) không đổi dữ liệu có sẵn: số dòng quyền / vai / tài khoản giữ nguyên; trợ lý Hỗ trợ có đúng MỘT công tắc bật cho HR", () => {
  const db = before();
  const q = ["SELECT count(*) AS n FROM stf_permission", "SELECT count(*) AS n FROM pty_party_role", "SELECT count(*) AS n FROM staff"];
  const truoc = q.map((s) => count(db, s));
  db.exec(sqlOf(FILE));
  assert.deepEqual(q.map((s) => count(db, s)), truoc);
  assert.deepEqual(row(db, "SELECT count(*) AS n, min(bat) AS bat FROM tl_vai WHERE ma_quyen = 'HR'"), { n: 1, bat: 1 });
});

const AT = "2026-10-01T03:00:00.000Z";
let n = 0;
function account(db: DatabaseSync, role: string): string {
  const i = ++n;
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(`p-${i}`, `Người${i}`, AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(`p-${i}`, `Người${i}`, AT, AT);
  db.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)").run(`s-${i}`, `09${String(i).padStart(8, "0")}`, AT, `p-${i}`);
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, NULL, '2026-09-20', ?, ?)")
    .run(`r-${i}`, `p-${i}`, role, AT, AT);
  return `s-${i}`;
}
const grant = (db: DatabaseSync, staff: string, code: string) =>
  db.prepare(`INSERT OR IGNORE INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, created_by, updated_at, updated_by)
              SELECT ?, ?, ?, ?, ?, NULL, ?, NULL WHERE 1`).run(`g-${++n}`, staff, code, AT, AT, AT);

test("(e) LC-1 trên CSDL: tài khoản có vai bên ngoài (Cộng tác viên) chèn HR → ABORT lc1; tài khoản vai HCNS (nội bộ) giữ HR được", () => {
  const db = all();
  const ngoai = account(db, "COLLABORATOR");
  assert.throws(() => grant(db, ngoai, "HR"), /lc1_external_account_permission/);
  const noiBo = account(db, "HR_STAFF");
  grant(db, noiBo, "HR");
  assert.equal(count(db, `SELECT count(*) AS n FROM stf_permission WHERE staff_id = '${noiBo}' AND permission_type_code = 'HR' AND valid_to_at IS NULL`), 1);
});
