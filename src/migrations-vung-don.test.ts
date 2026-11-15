// Kiểm migration *_vung_don.sql (kế hoạch Phí đưa đón, Đợt A, Task 1; ADR-0147 Đ1) trên SQLite thật (node:sqlite) với schema dựng từ migrations/*.sql.
// Tìm tệp theo ĐUÔI tên (đổi số không đổi bài).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_vung_don.sql"));
const LOC_BEN_TAU = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // dòng gieo BEN_TAU_NHA_TRANG của 0010

function open(): DatabaseSync {
  assert.equal(MATCHES.length, 1, `đúng MỘT tệp *_vung_don.sql — thấy ${MATCHES.length}`);
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files.filter((x) => x <= MATCHES[0]!)) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const them = (db: DatabaseSync, code: string, name = "Vùng thử") =>
  db.prepare("INSERT INTO loc_zone (code, name, sort_order, created_at, updated_at) VALUES (?, ?, 1, '2026-11-14T00:00:00.000Z', '2026-11-14T00:00:00.000Z')").run(code, name);

test("0164: gieo NGOAI_VUNG, địa điểm cũ chưa xếp vùng", () => {
  const db = open();
  assert.deepEqual(db.prepare("SELECT code FROM loc_zone").all().map((r) => r.code), ["NGOAI_VUNG"]);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM loc_location WHERE zone_code IS NOT NULL").get()!.n, 0);
  const tong = db.prepare("SELECT COUNT(*) AS n FROM loc_location").get()!.n;
  const v = db.prepare("SELECT zone_code FROM v_loc_location_zone").all();
  assert.equal(v.length, tong);
  assert.ok(v.length > 0);
  for (const r of v) assert.equal(r.zone_code, "NGOAI_VUNG");
});

test("0164: không xoá vùng, không ngưng NGOAI_VUNG", () => {
  const db = open();
  assert.throws(() => db.exec("DELETE FROM loc_zone"), /loc_zone_append_only/);
  assert.throws(() => db.exec("UPDATE loc_zone SET active = 0 WHERE code = 'NGOAI_VUNG'"), /NGOAI_VUNG/);
  assert.equal(db.prepare("SELECT active FROM loc_zone WHERE code = 'NGOAI_VUNG'").get()!.active, 1);
});

test("0164: không ngưng vùng còn địa điểm, không gán vùng đã ngưng", () => {
  const db = open();
  them(db, "TT");
  db.prepare("UPDATE loc_location SET zone_code = 'TT' WHERE id = ?").run(LOC_BEN_TAU);
  assert.throws(() => db.exec("UPDATE loc_zone SET active = 0 WHERE code = 'TT'"), /còn địa điểm|loc_zone_con_dia_diem/);
  db.prepare("UPDATE loc_location SET zone_code = NULL WHERE id = ?").run(LOC_BEN_TAU);
  db.exec("UPDATE loc_zone SET active = 0 WHERE code = 'TT'");
  assert.throws(() => db.prepare("UPDATE loc_location SET zone_code = 'TT' WHERE id = ?").run(LOC_BEN_TAU), /đã ngưng|loc_location_zone_dang_bat/);
  assert.throws(
    () => db.prepare("INSERT INTO loc_location (id, code, name, location_type_code, zone_code, sort_order, created_at, updated_at) VALUES ('x1', 'DIEM_X1', 'X', 'TICKET_COUNTER', 'TT', 0, '2026-11-14T00:00:00.000Z', '2026-11-14T00:00:00.000Z')").run(),
    /đã ngưng|loc_location_zone_dang_bat/,
  );
});

test("0164: view đúng cột", () => {
  const db = open();
  assert.deepEqual(db.prepare("PRAGMA table_info(v_loc_location_zone)").all().map((c) => c.name), ["location_id", "zone_code"]);
  assert.deepEqual(db.prepare("PRAGMA table_info(v_loc_zone_label)").all().map((c) => c.name), ["code", "name", "active"]);
});
