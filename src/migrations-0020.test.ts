// Kiểm migration 0020 (thêm quyền PARTNER/SUPER_ADMIN vào stf_permission_type) trên SQLite thật (node:sqlite). ADR-0014 điều 1.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

function open(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}

test("0020: PARTNER và SUPER_ADMIN có trong stf_permission_type, đúng tên, không trùng mã với quyền cũ", () => {
  const db = open();
  const rows = db.prepare("SELECT code, name FROM stf_permission_type ORDER BY code").all() as { code: string; name: string }[];
  const byCode = new Map(rows.map((r) => [r.code, r.name]));
  assert.equal(byCode.get("PARTNER"), "Đối tác");
  assert.equal(byCode.get("SUPER_ADMIN"), "Super Admin");
  assert.deepEqual(
    rows.map((r) => r.code),
    [...new Set(rows.map((r) => r.code))],
    "không có mã quyền trùng lặp",
  );
  assert.deepEqual(rows.map((r) => r.code).sort(), ["ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "SALES", "SUPER_ADMIN"]);
});
