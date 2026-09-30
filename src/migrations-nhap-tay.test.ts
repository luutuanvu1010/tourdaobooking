// Migration *_chinh_sach_nhap_tay.sql (ADR-0061 điều 1, accepted 2026-09-30): bảng chính sách "Dịch vụ nhập tay" của module `orders`, chỉ-thêm, có ngày hiệu
// lực, gieo MỘT dòng TẮT (mặc định TẮT). SQLite thật (node:sqlite), cùng cách với migrations-tro-ly.test.ts. Tìm tệp theo ĐUÔI tên (đổi số chỉ đổi tên tệp).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const TEP = files.find((f) => f.endsWith("_chinh_sach_nhap_tay.sql"));

function open(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);

test("tệp migration *_chinh_sach_nhap_tay.sql có và mang số 0051 (số do điều phối chung cấp 30/9)", () => {
  assert.ok(TEP, "thiếu migrations/*_chinh_sach_nhap_tay.sql");
  assert.equal(TEP!.slice(0, 4), "0051");
});

test("ord_manual_service_policy: sau migration có ĐÚNG một dòng, dòng hiệu lực là enabled = 0 (mặc định TẮT — ADR-0061 tiêu chí 1)", () => {
  const db = open();
  const rows = db.prepare("SELECT enabled, valid_from_at, created_at FROM ord_manual_service_policy").all() as { enabled: number; valid_from_at: string; created_at: string }[];
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.enabled, 0);
  assert.match(rows[0]!.valid_from_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "dấu thời gian ISO UTC");
  const hieuLuc = db.prepare(
    "SELECT enabled FROM ord_manual_service_policy WHERE valid_from_at <= ? ORDER BY valid_from_at DESC LIMIT 1",
  ).get(new Date(Date.now() + 1000).toISOString()) as { enabled: number } | undefined;
  assert.equal(hieuLuc?.enabled, 0);
});

test("ord_manual_service_policy: chỉ-thêm — UPDATE và DELETE bị trigger chặn; enabled chỉ 0/1; valid_from_at không trùng", () => {
  const db = open();
  fails(db, "UPDATE ord_manual_service_policy SET enabled = 1", /ord_policy_append_only/);
  fails(db, "DELETE FROM ord_manual_service_policy", /ord_policy_append_only/);
  const at = "2030-01-01T00:00:00.000Z";
  const ins = (id: string, enabled: number, when = at) =>
    `INSERT INTO ord_manual_service_policy (id, enabled, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('${id}', ${enabled}, '${when}', '${when}', 's1', '${when}', 's1')`;
  fails(db, ins("x2", 2), /CHECK/);
  db.exec(ins("x1", 1));
  fails(db, ins("x3", 0), /UNIQUE/);
  assert.equal((db.prepare("SELECT count(*) AS n FROM ord_manual_service_policy").get() as { n: number }).n, 2);
});
