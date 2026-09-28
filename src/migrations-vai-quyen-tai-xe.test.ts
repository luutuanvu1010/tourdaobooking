// Kiểm migration quyền app Tài xế + vai "Tài xế công ty" (ADR-0040 D3; Ruling R1, R12 của điều phối): mã quyền DRIVER ("Tài xế"), mã vai tài khoản
// DRIVER_INTERNAL (nhóm Nội bộ), NGƯNG gán mới mã vai hồ sơ cũ DRIVER (nhóm OTHER, 0011) mà KHÔNG đổi dòng vai đang có của ai.
// Dựng schema bằng node:sqlite từ migrations/*.sql. Tệp tìm theo ĐUÔI tên (số có thể phải đổi khi nhiều nhánh cùng xếp hàng — CHANGE-GUIDE công thức d).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { PERMISSION_LABEL } from "./shared/permissions.ts";
import { ROLES } from "./shared/roles.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_vai_quyen_tai_xe.sql"));
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

test("(a) đúng một tệp *_vai_quyen_tai_xe.sql; không phải migration siết B5; tệp không tạo trigger nào", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_vai_quyen_tai_xe.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/, "src/migrations-n1.test.ts nhận migration siết B5 theo tên tệp");
  const db = before();
  const truoc = triggers(db);
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db), truoc, "migration chỉ thêm dòng danh mục và ngưng một mã — không trigger mới");
});

test("(b) quyền app DRIVER: nhãn = PERMISSION_LABEL.DRIVER ('Tài xế'), đang dùng, đứng thứ tám", () => {
  const r = row(all(), "SELECT name, active, sort_order FROM stf_permission_type WHERE code = 'DRIVER'");
  assert.deepEqual(r, { name: PERMISSION_LABEL.DRIVER, active: 1, sort_order: 8 });
  assert.equal(PERMISSION_LABEL.DRIVER, "Tài xế");
});

test("(c) vai tài khoản DRIVER_INTERNAL: 'Tài xế công ty' (= ROLES.DRIVER_INTERNAL.name), nhóm Nội bộ, đang dùng, thứ tự 17 (sau IT)", () => {
  const r = row(all(), "SELECT name, role_group, active, sort_order FROM pty_role_type WHERE code = 'DRIVER_INTERNAL'");
  assert.deepEqual(r, { name: ROLES.DRIVER_INTERNAL.name, role_group: "INTERNAL", active: 1, sort_order: 17 });
  assert.equal(ROLES.DRIVER_INTERNAL.name, "Tài xế công ty");
});

test("(d) mã vai hồ sơ cũ DRIVER: vẫn nhóm OTHER, vẫn tên 'Tài xế', NGƯNG gán mới (active = 0)", () => {
  const r = row(all(), "SELECT name, role_group, active FROM pty_role_type WHERE code = 'DRIVER'");
  assert.deepEqual(r, { name: "Tài xế", role_group: "OTHER", active: 0 });
});

test("(e) dòng vai DRIVER đang có của một hồ sơ KHÔNG đổi khi áp migration (chỉ ngưng gán mới)", () => {
  const db = before();
  const at = "2026-09-20T03:00:00.000Z";
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p-tx', 'PERSON', 'Người Lái', 1, ?, ?)").run(at, at);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p-tx', 'Người Lái', ?, ?)").run(at, at);
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-tx', 'p-tx', 'DRIVER', NULL, '2026-09-20', ?, ?)").run(at, at);
  const truoc = row(db, "SELECT * FROM pty_party_role WHERE id = 'r-tx'");
  db.exec(sqlOf(FILE));
  const sau = row(db, "SELECT * FROM pty_party_role WHERE id = 'r-tx'");
  assert.deepEqual(sau, truoc);
  assert.equal(sau.valid_to_date, null);
});

test("(f) văn bản migration (bỏ chú thích --) không có dãy ≥ 8 chữ số (SĐT/số giấy tờ), không có '@'", () => {
  const code = sqlOf(FILE).split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
  assert.doesNotMatch(code, /\d{8,}/);
  assert.doesNotMatch(code, /@/);
});
