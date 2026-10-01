// Kiểm migration *_ten_vai_tai_xe_taxi.sql (ADR-0083 điều 3, accepted 2026-10-01): đổi CHỮ tên vai TAXI_DRIVER thành "Tài xế taxi (giới thiệu khách)" — một
// câu UPDATE; mã vai, nhóm, thứ tự, trạng thái và mọi bảng khác giữ nguyên; không trigger. Tên phải khớp ROLES (src/roles-schema.test.ts giữ hai nguồn khớp).
// Tệp tìm theo ĐUÔI tên (số có thể phải đổi khi nhiều nhánh cùng xếp hàng).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { ROLES } from "./shared/roles.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_ten_vai_tai_xe_taxi.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string): Row[] => (db.prepare(sql).all() as Row[]).map((r) => ({ ...r }));
const triggers = (db: DatabaseSync): string[] => (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").all() as { name: string }[]).map((r) => r.name);

test("(a) đúng một tệp *_ten_vai_tai_xe_taxi.sql; không phải migration siết B5; chỉ một câu UPDATE pty_role_type, không trigger", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_ten_vai_tai_xe_taxi.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/);
  const cau = sqlOf(FILE).replace(/--.*$/gm, "").split(";").map((x) => x.trim()).filter(Boolean);
  assert.equal(cau.length, 1, JSON.stringify(cau));
  assert.match(cau[0]!, /^UPDATE pty_role_type SET name = .+ WHERE code = 'TAXI_DRIVER'$/s);
  const db = open(files.filter((f) => f < FILE));
  const truoc = triggers(db);
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db), truoc);
});

test("(b) sau migration: TAXI_DRIVER tên 'Tài xế taxi (giới thiệu khách)' = ROLES; mọi dòng khác của pty_role_type và cột khác giữ nguyên", () => {
  const truoc = rows(open(files.filter((f) => f < FILE)), "SELECT * FROM pty_role_type ORDER BY code");
  const sau = rows(open(files), "SELECT * FROM pty_role_type ORDER BY code");
  assert.equal(ROLES.TAXI_DRIVER.name, "Tài xế taxi (giới thiệu khách)");
  const taxi = sau.find((r) => r.code === "TAXI_DRIVER")!;
  assert.equal(taxi.name, ROLES.TAXI_DRIVER.name);
  assert.equal(truoc.find((r) => r.code === "TAXI_DRIVER")!.name, "Tài xế taxi", "trước migration là tên cũ");
  assert.deepEqual(
    sau.map((r) => (r.code === "TAXI_DRIVER" ? { ...r, name: "Tài xế taxi" } : r)),
    truoc,
    "chỉ đổi đúng cột name của đúng một dòng",
  );
});
