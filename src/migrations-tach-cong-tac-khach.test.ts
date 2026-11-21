// Kiểm migration ADR-0228 (việc 8): hai bảng chỉ-thêm `ord_partner_passenger_policy` (gieo = công tắc ẩn khách cũ lúc áp) và `ord_partner_pickup_time_optional_policy` (gieo Tắt).
// SQLite thật (node:sqlite). Tệp tìm theo ĐUÔI tên — đổi số lúc gộp chỉ đổi tên tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_tach_cong_tac_khach_va_gio_don.sql"));
const FILE = MATCHES[0] ?? "";
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");

/** Áp mọi migration TRƯỚC tệp này, chạy `truoc` (dựng trạng thái công tắc cũ), rồi áp tệp này và phần sau. */
function open(truoc?: (d: DatabaseSync) => void): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files) {
    if (f === FILE) truoc?.(d);
    d.exec(sqlOf(f));
  }
  return d;
}
type Row = Record<string, unknown>;
const rows = (d: DatabaseSync, sql: string): Row[] => d.prepare(sql).all().map((r) => ({ ...(r as Row) }));

test("đúng MỘT tệp `*_tach_cong_tac_khach_va_gio_don.sql`, sau 0181; chỉ-thêm (không DROP, không ALTER)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${JSON.stringify(MATCHES)}`);
  assert.ok(FILE > "0181", FILE);
  assert.doesNotMatch(sqlOf(FILE).replace(/--.*$/gm, ""), /DROP\s|ALTER\s/i);
});

test("công tắc cũ đang TẮT ⇒ «không nhập danh sách hành khách» gieo 0", () => {
  const d = open();
  const r = rows(d, "SELECT khong_nhap, created_by FROM ord_partner_passenger_policy");
  assert.equal(r.length, 1);
  assert.equal(r[0]!.khong_nhap, 0);
  assert.equal(r[0]!.created_by, null);
});

test("công tắc cũ đang BẬT lúc áp ⇒ «không nhập danh sách hành khách» gieo 1 (phát hành không đổi hành vi)", () => {
  const d = open((db) => db.exec("INSERT INTO ord_partner_customer_policy (id, hide_customer_info, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('bat', 1, '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z', 's1', '2026-11-01T00:00:00.000Z', 's1')"));
  // Dòng gieo 0133 mang mốc «bây giờ» (lớn hơn 1/11) ⇒ dòng hiệu lực là dòng gieo 0; thêm dòng bật MỚI hơn để kiểm đúng «dòng mới nhất».
  assert.equal(rows(d, "SELECT khong_nhap FROM ord_partner_passenger_policy")[0]!.khong_nhap, 0);
  const d2 = open((db) => db.exec("INSERT INTO ord_partner_customer_policy (id, hide_customer_info, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('bat', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 second', '+1 second'), '2026-11-01T00:00:00.000Z', 's1', '2026-11-01T00:00:00.000Z', 's1')"));
  assert.equal(rows(d2, "SELECT khong_nhap FROM ord_partner_passenger_policy")[0]!.khong_nhap, 1);
});

test("«đơn đối tác không cần giờ đón» gieo đúng MỘT dòng Tắt", () => {
  const r = rows(open(), "SELECT khong_can FROM ord_partner_pickup_time_optional_policy");
  assert.equal(r.length, 1);
  assert.equal(r[0]!.khong_can, 0);
});

for (const [bang, cot] of [["ord_partner_passenger_policy", "khong_nhap"], ["ord_partner_pickup_time_optional_policy", "khong_can"]] as const) {
  test(`${bang}: cột chỉ 0 / 1, không NULL; valid_from_at UNIQUE; trigger chặn UPDATE, DELETE`, () => {
    const d = open();
    const them = (id: string, v: string, at: string) => d.exec(`INSERT INTO ${bang} (id, ${cot}, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('${id}', ${v}, '${at}', '${at}', 's1', '${at}', 's1')`);
    assert.throws(() => them("x1", "2", "2099-01-01T00:00:00.000Z"), /CHECK/);
    assert.throws(() => them("x2", "NULL", "2099-01-01T00:00:00.001Z"), /NOT NULL/);
    them("x3", "1", "2099-01-01T00:00:00.002Z");
    assert.throws(() => them("x4", "0", "2099-01-01T00:00:00.002Z"), /UNIQUE/);
    assert.throws(() => d.exec(`UPDATE ${bang} SET ${cot} = 1`), /ord_policy_append_only/);
    assert.throws(() => d.exec(`DELETE FROM ${bang}`), /ord_policy_append_only/);
  });
}
