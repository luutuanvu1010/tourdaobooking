// Migration *_tro_ly.sql (ADR-0066 điều 7, 10): hai bảng chỉ-thêm của module `tro-ly` trên SQLite thật (node:sqlite), cùng cách với migrations-maintenance.test.ts.
// Tìm tệp theo ĐUÔI tên (đổi số chỉ phải đổi tên tệp — docs/CHANGE-GUIDE.md công thức d).
// Hàng rào "không lưu nội dung" (ADR-0066 điều 7): tập cột của tl_luot_hoi bị GHIM đúng danh sách — thêm một cột chữ tự do (câu hỏi, câu trả lời) là đỏ ở đây.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const TEP = files.find((f) => f.endsWith("_tro_ly.sql"));

function open(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-09-30T01:00:00.000Z";
const cols = (db: DatabaseSync, t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name);
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);
const luot = (id: string) =>
  `INSERT INTO tl_luot_hoi (id, staff_id, ngay_vn, token_vao, token_vao_dem, token_ra, chi_phi_micro_usd, ket_qua, created_at, created_by, updated_at, updated_by)
   VALUES ('${id}', 's1', '2026-09-30', 100, 0, 50, 25, 'ok', '${NOW}', 's1', '${NOW}', 's1')`;

test("tệp migration *_tro_ly.sql có và mang số 0050 (0044–0049 giữ chỗ cho nhánh khác)", () => {
  assert.ok(TEP, "thiếu migrations/*_tro_ly.sql");
  assert.equal(TEP!.slice(0, 4), "0050");
});

test("tl_luot_hoi: ĐÚNG tập cột — không có cột nội dung câu hỏi / câu trả lời (ADR-0066 điều 7)", () => {
  const db = open();
  assert.deepEqual(cols(db, "tl_luot_hoi"), [
    "id", "staff_id", "ngay_vn", "token_vao", "token_vao_dem", "token_ra", "chi_phi_micro_usd", "ket_qua",
    "created_at", "created_by", "updated_at", "updated_by",
  ]);
});

test("tl_luot_hoi: chỉ thêm — UPDATE và DELETE bị trigger chặn; kết quả chỉ ok / het_tran / loi; số không âm; ngày dạng YYYY-MM-DD", () => {
  const db = open();
  db.exec(luot("a"));
  fails(db, "UPDATE tl_luot_hoi SET chi_phi_micro_usd = 0 WHERE id = 'a'", /tl_append_only/);
  fails(db, "DELETE FROM tl_luot_hoi WHERE id = 'a'", /tl_append_only/);
  fails(db, luot("b").replace("'ok'", "'xong'"), /CHECK/);
  fails(db, luot("c").replace(", 25, ", ", -1, "), /CHECK/);
  fails(db, luot("d").replace("'2026-09-30'", "'30/09/2026'"), /CHECK/);
  assert.equal((db.prepare("SELECT count(*) AS n FROM tl_luot_hoi").get() as { n: number }).n, 1);
});

test("tl_cai_dat: gieo MỘT bản — bật, trần tháng 5.000.000 micro-USD (5 USD), trần ngày 30; chỉ thêm (UPDATE/DELETE bị chặn)", () => {
  const db = open();
  const rows = db.prepare("SELECT bat, tran_thang_micro_usd, tran_ngay, created_by FROM tl_cai_dat").all();
  assert.deepEqual(rows.map((r) => ({ ...r })), [{ bat: 1, tran_thang_micro_usd: 5_000_000, tran_ngay: 30, created_by: null }]);
  fails(db, "UPDATE tl_cai_dat SET bat = 0", /tl_append_only/);
  fails(db, "DELETE FROM tl_cai_dat", /tl_append_only/);
  db.exec(`INSERT INTO tl_cai_dat (id, bat, tran_thang_micro_usd, tran_ngay, valid_from_at, created_at, created_by, updated_at, updated_by)
           VALUES ('b2', 0, 1000, 5, '${NOW}', '${NOW}', 'chu', '${NOW}', 'chu')`);
  fails(db, `INSERT INTO tl_cai_dat (id, bat, tran_thang_micro_usd, tran_ngay, valid_from_at, created_at, updated_at) VALUES ('b3', 2, 1, 1, '${NOW}', '${NOW}', '${NOW}')`, /CHECK/);
  fails(db, `INSERT INTO tl_cai_dat (id, bat, tran_thang_micro_usd, tran_ngay, valid_from_at, created_at, updated_at) VALUES ('b4', 1, -1, 1, '${NOW}', '${NOW}', '${NOW}')`, /CHECK/);
});
