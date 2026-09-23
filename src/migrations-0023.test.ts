import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
function open() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);
const T = "2026-09-23T00:00:00.000Z";
const CRED = "A".repeat(43);
const HANDLE = "u".repeat(22); // 16 byte base64url
const row = (over: Record<string, string> = {}) => {
  const v = { id: "'p1'", staff_id: "'s1'", credential_id: `'${CRED}'`, public_key: "'pk'", algorithm: "-7", user_handle: `'${HANDLE}'`, sign_count: "0", label: "'iPhone'", valid_to_at: "NULL", ...over };
  return `INSERT INTO aut_passkey (id, staff_id, credential_id, public_key, algorithm, user_handle, sign_count, label, last_used_at, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by)
          VALUES (${v.id}, ${v.staff_id}, ${v.credential_id}, ${v.public_key}, ${v.algorithm}, ${v.user_handle}, ${v.sign_count}, ${v.label}, NULL, '${T}', ${v.valid_to_at}, '${T}', 's1', '${T}', 's1')`;
};
function seeded() {
  const db = open();
  db.exec("INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '2026-01-01T00:00:00Z')");
  return db;
}

test("0023: bảng aut_passkey có đủ cột, kiểu và NOT NULL như đặc tả", () => {
  const cols = open().prepare("PRAGMA table_info(aut_passkey)").all() as { name: string; type: string; notnull: number }[];
  const by = Object.fromEntries(cols.map((c) => [c.name, c]));
  for (const n of ["id", "staff_id", "credential_id", "public_key", "algorithm", "user_handle", "sign_count", "label", "valid_from_at", "created_at", "updated_at"]) assert.equal(by[n]?.notnull, 1, n);
  for (const n of ["last_used_at", "valid_to_at", "created_by", "updated_by"]) assert.equal(by[n]?.notnull, 0, n);
  assert.equal(by.algorithm!.type, "INTEGER");
  assert.equal(by.sign_count!.type, "INTEGER");
});

test("0023: chèn hợp lệ được; credential_id trùng, staff không tồn tại, bộ đếm âm, nhãn rỗng, hiệu lực ngược đều bị chặn", () => {
  const db = seeded();
  db.exec(row());
  fails(db, row({ id: "'p2'" }), /UNIQUE/);
  fails(db, row({ id: "'p3'", credential_id: "'" + "B".repeat(43) + "'", staff_id: "'khong-co'" }), /FOREIGN KEY/);
  fails(db, row({ id: "'p4'", credential_id: "'" + "C".repeat(43) + "'", sign_count: "-1" }), /CHECK/);
  fails(db, row({ id: "'p5'", credential_id: "'" + "D".repeat(43) + "'", label: "''" }), /CHECK/);
  fails(db, row({ id: "'p6'", credential_id: "'" + "E".repeat(43) + "'", valid_to_at: "'2020-01-01T00:00:00.000Z'" }), /CHECK/);
  fails(db, row({ id: "'p7'", credential_id: "'ngan'" }), /CHECK/);
});
