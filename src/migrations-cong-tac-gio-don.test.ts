// Kiểm migration CÔNG TẮC BẮT BUỘC GIỜ ĐÓN CHO ĐƠN ĐỐI TÁC (ADR-0193 mục 1; kế hoạch 2026-11-08 Task 5B.1): bảng `ord_pickup_time_policy` chỉ-thêm (trigger cấm sửa, cấm xoá),
// gieo MỘT dòng Bật (`required = 1` = hành vi hôm nay của ADR-0154 Đ1.2, Đ1.3). SQLite thật (node:sqlite). Tệp tìm theo ĐUÔI tên — đổi số lúc gộp chỉ đổi tên tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_cong_tac_gio_don_doi_tac.sql"));
const FILE = MATCHES[0] ?? "";
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");

function open(): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files) d.exec(sqlOf(f));
  return d;
}
type Row = Record<string, unknown>;
const rows = (d: DatabaseSync, sql: string): Row[] => d.prepare(sql).all().map((r) => ({ ...(r as Row) }));

test("đúng MỘT tệp `*_cong_tac_gio_don_doi_tac.sql`, sau 0156; chỉ-thêm (không DROP, không ALTER bảng cũ)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${JSON.stringify(MATCHES)}`);
  assert.ok(FILE > "0156", FILE);
  const khongChuThich = sqlOf(FILE).replace(/--.*$/gm, "");
  assert.doesNotMatch(khongChuThich, /DROP\s|ALTER\s/i);
});

test("gieo đúng MỘT dòng Bật (required = 1) — phát hành không đổi hành vi", () => {
  const d = open();
  const r = rows(d, "SELECT id, required, created_by FROM ord_pickup_time_policy");
  assert.equal(r.length, 1);
  assert.equal(r[0]!.required, 1);
  assert.equal(r[0]!.created_by, null);
});

test("required chỉ nhận 0 / 1, không NULL; valid_from_at UNIQUE", () => {
  const d = open();
  const them = (id: string, v: string, at: string) => d.exec(`INSERT INTO ord_pickup_time_policy (id, required, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('${id}', ${v}, '${at}', '${at}', 's1', '${at}', 's1')`);
  assert.throws(() => them("x1", "2", "2099-01-01T00:00:00.000Z"), /CHECK/);
  assert.throws(() => them("x2", "NULL", "2099-01-01T00:00:00.001Z"), /NOT NULL/);
  them("x3", "0", "2099-01-01T00:00:00.002Z");
  assert.throws(() => them("x4", "1", "2099-01-01T00:00:00.002Z"), /UNIQUE/);
});

test("trigger chặn UPDATE và DELETE (chỉ thêm dòng mới)", () => {
  const d = open();
  assert.throws(() => d.exec("UPDATE ord_pickup_time_policy SET required = 0"), /ord_policy_append_only/);
  assert.throws(() => d.exec("DELETE FROM ord_pickup_time_policy"), /ord_policy_append_only/);
  assert.equal(rows(d, "SELECT required FROM ord_pickup_time_policy")[0]!.required, 1);
});
