// Kiểm migration 0015 (staff.last_login_at) và 0016 (mnt_setting — chế độ bảo trì) trên SQLite thật (node:sqlite), cùng cách với migrations-n1.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { MAINTENANCE_CONTACT_PHONE, parseAllowedPhones } from "./shared/maintenance.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const upTo = (prefix: string) => files.filter((f) => f.slice(0, 4) <= prefix);

function open(list: string[] = files): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-09-21T00:00:00.000Z";
const one = (db: DatabaseSync, sql: string, ...args: (string | number | null)[]) => Object.values(db.prepare(sql).get(...args) ?? {})[0];
const cols = (db: DatabaseSync, table: string) => db.prepare(`PRAGMA table_info(${table})`).all() as { name: string; type: string; notnull: number; dflt_value: string | null }[];
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);

test("0015: staff.last_login_at là TEXT NULL, tài khoản có sẵn giữ NULL (chưa đăng nhập kể từ khi có cột)", () => {
  const before = open(upTo("0014"));
  before.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '${NOW}')`);
  before.exec(readFileSync(new URL(files.find((f) => f.startsWith("0015"))!, DIR), "utf8"));
  const col = cols(before, "staff").find((c) => c.name === "last_login_at");
  assert.ok(col, "thiếu cột staff.last_login_at");
  assert.equal(col.type, "TEXT");
  assert.equal(col.notnull, 0);
  assert.equal(one(before, "SELECT last_login_at FROM staff WHERE id = 's1'"), null);
  before.exec(`UPDATE staff SET last_login_at = '${NOW}' WHERE id = 's1'`);
  assert.equal(one(before, "SELECT last_login_at FROM staff WHERE id = 's1'"), NOW);
});

test("0016: mnt_setting là singleton, gieo TẮT với đúng SĐT được phép mặc định của chủ dự án", () => {
  const db = open();
  assert.equal(one(db, "SELECT count(*) FROM mnt_setting"), 1);
  const row = db.prepare("SELECT id, enabled, ends_at, allowed_phones, created_by, updated_by FROM mnt_setting").get() as Record<string, unknown>;
  assert.equal(row.id, "default");
  assert.equal(row.enabled, 0);
  assert.equal(row.ends_at, null);
  assert.equal(row.created_by, null);
  assert.equal(row.updated_by, null);
  // Giá trị gieo phải đi qua normalizePhone ra ĐÚNG số của chủ — sai số = khoá chính người duy nhất mở khoá được.
  assert.deepEqual(parseAllowedPhones(String(row.allowed_phones)), [MAINTENANCE_CONTACT_PHONE]);
  assert.equal(String(row.allowed_phones), "0989929373");
});

test("0016: ràng buộc — chỉ một dòng 'default', cờ enabled chỉ 0/1, allowed_phones và mốc thời gian bắt buộc", () => {
  const db = open();
  fails(db, `INSERT INTO mnt_setting (id, enabled, allowed_phones, created_at, updated_at) VALUES ('khac', 0, '0989929373', '${NOW}', '${NOW}')`, /CHECK/);
  fails(db, `INSERT INTO mnt_setting (id, enabled, allowed_phones, created_at, updated_at) VALUES ('default', 0, '0989929373', '${NOW}', '${NOW}')`, /UNIQUE/);
  fails(db, "UPDATE mnt_setting SET enabled = 2", /CHECK/);
  fails(db, "UPDATE mnt_setting SET allowed_phones = NULL", /NOT NULL/);
  fails(db, "UPDATE mnt_setting SET updated_at = NULL", /NOT NULL/);
});

test("0016: đường thoát khẩn — một câu UPDATE đơn giản tắt chế độ bảo trì dù đang có giờ dự kiến (không vướng CHECK chéo cột)", () => {
  const db = open();
  db.exec(`UPDATE mnt_setting SET enabled = 1, ends_at = '2026-09-22T00:00:00.000Z', updated_at = '${NOW}'`);
  db.exec("UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'");
  assert.equal(one(db, "SELECT enabled FROM mnt_setting"), 0);
});
