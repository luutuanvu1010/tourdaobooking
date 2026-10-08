// Kiểm migration *_loc_location_dia_chi.sql (ADR-0105 mục 6, bài kiểm 6; kế hoạch T3 — NT-7) trên SQLite thật (node:sqlite) với schema dựng từ migrations/*.sql.
// View công bố mới của `locations`: ĐÚNG ba cột `id, address, active` (khuôn ghim cột `v_loc_location_label` ở src/migrations-n1.test.ts). Tệp chỉ làm MỘT việc
// (CREATE VIEW) — không bảng, không cột, không trigger, không DROP. Tìm tệp theo ĐUÔI tên (đổi số không đổi bài).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_loc_location_dia_chi.sql"));
const LOC_BEN_TAU = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // dòng gieo BEN_TAU_NHA_TRANG của 0010 (không có địa chỉ)

function open(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files.filter((x) => x <= MATCHES[0]!)) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}

test("ADR-0105: đúng MỘT tệp *_loc_location_dia_chi.sql", () => {
  assert.equal(MATCHES.length, 1, `đúng MỘT tệp *_loc_location_dia_chi.sql — thấy ${MATCHES.length}`);
});

test("ADR-0105: tệp chỉ có MỘT câu CREATE VIEW v_loc_location_dia_chi AS SELECT id, address, active FROM loc_location; (bỏ chú thích)", () => {
  assert.equal(MATCHES.length, 1);
  const sql = readFileSync(new URL(MATCHES[0]!, DIR), "utf8").replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();
  assert.equal(sql, "CREATE VIEW v_loc_location_dia_chi AS SELECT id, address, active FROM loc_location;");
  assert.doesNotMatch(sql, /\b(DROP|ALTER|CREATE TABLE|CREATE TRIGGER|INSERT|UPDATE|DELETE)\b/i);
  const goc = readFileSync(new URL(MATCHES[0]!, DIR), "utf8");
  assert.match(goc, /HOÀN TÁC/, "chú thích đầu tệp ghi cách hoàn tác (D1 không có bước down)");
});

test("ADR-0105: v_loc_location_dia_chi chỉ có id, address, active; dòng gieo không địa chỉ → NULL; địa chỉ nhập → đọc ra đúng chuỗi", () => {
  assert.equal(MATCHES.length, 1);
  const db = open();
  assert.deepEqual(db.prepare("PRAGMA table_info(v_loc_location_dia_chi)").all().map((c) => c.name), ["id", "address", "active"]);
  assert.deepEqual({ ...db.prepare("SELECT id, address, active FROM v_loc_location_dia_chi WHERE id = ?").get(LOC_BEN_TAU) }, { id: LOC_BEN_TAU, address: null, active: 1 });
  db.prepare("UPDATE loc_location SET address = ? WHERE id = ?").run("Số 2 Trần Phú, Nha Trang", LOC_BEN_TAU);
  assert.equal(db.prepare("SELECT address FROM v_loc_location_dia_chi WHERE id = ?").get(LOC_BEN_TAU)!.address, "Số 2 Trần Phú, Nha Trang");
});
