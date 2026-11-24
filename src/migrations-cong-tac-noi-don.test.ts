// Kiểm migration CÔNG TẮC «ĐỐI TÁC KHÔNG NHẬP NƠI ĐÓN» (ADR-0221 Đ1; kế hoạch 2026-11-21): bảng `ord_partner_pickup_place_policy` chỉ-thêm (trigger cấm sửa, cấm xoá),
// gieo MỘT dòng TẮT (`khong_nhap = 0` = hành vi trước ADR-0221: đối tác vẫn phải nhập nơi đón). SQLite thật (node:sqlite). Tệp tìm theo ĐUÔI tên — đổi số lúc gộp chỉ đổi tên tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_cong_tac_noi_don_doi_tac.sql"));
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

test("đúng MỘT tệp `*_cong_tac_noi_don_doi_tac.sql`, sau 0180; chỉ-thêm (không DROP, không ALTER bảng cũ)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${JSON.stringify(MATCHES)}`);
  assert.ok(FILE > "0180", FILE);
  const khongChuThich = sqlOf(FILE).replace(/--.*$/gm, "");
  assert.doesNotMatch(khongChuThich, /DROP\s|ALTER\s/i);
});

test("gieo đúng MỘT dòng TẮT (khong_nhap = 0) — phát hành không đổi hành vi", () => {
  const d = open();
  const r = rows(d, "SELECT id, khong_nhap, created_by FROM ord_partner_pickup_place_policy");
  assert.equal(r.length, 1);
  assert.equal(r[0]!.khong_nhap, 0);
  assert.equal(r[0]!.created_by, null);
});

test("khong_nhap chỉ nhận 0 / 1, không NULL; valid_from_at UNIQUE", () => {
  const d = open();
  const them = (id: string, v: string, at: string) => d.exec(`INSERT INTO ord_partner_pickup_place_policy (id, khong_nhap, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('${id}', ${v}, '${at}', '${at}', 's1', '${at}', 's1')`);
  assert.throws(() => them("x1", "2", "2099-01-01T00:00:00.000Z"), /CHECK/);
  assert.throws(() => them("x2", "NULL", "2099-01-01T00:00:00.001Z"), /NOT NULL/);
  them("x3", "0", "2099-01-01T00:00:00.002Z");
  assert.throws(() => them("x4", "1", "2099-01-01T00:00:00.002Z"), /UNIQUE/);
});

test("trigger chặn UPDATE và DELETE (chỉ thêm dòng mới)", () => {
  const d = open();
  assert.throws(() => d.exec("UPDATE ord_partner_pickup_place_policy SET khong_nhap = 1"), /ord_policy_append_only/);
  assert.throws(() => d.exec("DELETE FROM ord_partner_pickup_place_policy"), /ord_policy_append_only/);
  assert.equal(rows(d, "SELECT khong_nhap FROM ord_partner_pickup_place_policy")[0]!.khong_nhap, 0);
});
