// Migration *_tl_van_nghia.sql (ADR-0082 Đ2, đặc tả V4): bảng chỉ-thêm dấu vân nghĩa của đoạn kho, trên SQLite thật (node:sqlite) — cùng cách với
// migrations-tro-ly-bo-nao.test.ts. Tìm tệp theo ĐUÔI tên — số tạm 0062 (main tới 0060, 0061 ở nhánh đăng nhập), người gộp đổi số (CHANGE-GUIDE công thức d).
// Hàng rào: đúng tập cột (không cột câu hỏi / người hỏi — trang ghép §7 đặc tả); vec phải là BLOB đúng so_chieu × 4 byte; chỉ thêm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const TEP = files.find((f) => f.endsWith("_tl_van_nghia.sql"));

function open(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-10-01T01:00:00.000Z";
const K = (c: string) => c.repeat(64);
const them = (db: DatabaseSync, khoa: string, soChieu: number, vec: unknown, xungDot = "") =>
  db.prepare(`INSERT INTO tl_van_nghia (khoa, mau, so_chieu, vec, created_at, created_by, updated_at, updated_by) VALUES (?, 'text-embedding-3-small', ?, ?, ?, NULL, ?, NULL) ${xungDot}`)
    .run(khoa, soChieu, vec as Uint8Array, NOW, NOW);

test("tệp *_tl_van_nghia.sql có; số > 0060 (số tạm 0062 — người gộp đổi lên số lớn nhất của main + 1)", () => {
  assert.ok(TEP, "thiếu migrations/*_tl_van_nghia.sql");
  assert.ok(Number(TEP!.slice(0, 4)) >= 61, TEP);
});

test("HÀNG RÀO trang ghép: ĐÚNG tập cột tl_van_nghia — chỉ véc-tơ nội dung kho, không cột câu hỏi / người hỏi", () => {
  const db = open();
  const cols = (db.prepare("PRAGMA table_info(tl_van_nghia)").all() as { name: string }[]).map((c) => c.name);
  assert.deepEqual(cols, ["khoa", "mau", "so_chieu", "vec", "created_at", "created_by", "updated_at", "updated_by"]);
});

test("V4: vec phải là BLOB dài ĐÚNG so_chieu × 4; so_chieu > 0; khoá 64 ký tự; không gieo", () => {
  const db = open();
  assert.equal((db.prepare("SELECT count(*) AS n FROM tl_van_nghia").get() as { n: number }).n, 0);
  them(db, K("a"), 2, new Uint8Array(8));
  assert.throws(() => them(db, K("b"), 2, new Uint8Array(7)), /CHECK/);
  assert.throws(() => them(db, K("c"), 2, "abcdefgh"), /CHECK/);
  assert.throws(() => them(db, K("d"), 0, new Uint8Array(0)), /CHECK/);
  assert.throws(() => them(db, "a".repeat(63), 2, new Uint8Array(8)), /CHECK/);
  const r = db.prepare("SELECT typeof(vec) AS t, length(vec) AS n FROM tl_van_nghia WHERE khoa = ?").get(K("a")) as { t: string; n: number };
  assert.deepEqual({ ...r }, { t: "blob", n: 8 });
});

test("V4: chỉ thêm — UPDATE / DELETE bị trigger chặn; INSERT … ON CONFLICT(khoa) DO NOTHING hai lần cùng khoá không lỗi, không trùng", () => {
  const db = open();
  them(db, K("a"), 2, new Uint8Array(8));
  them(db, K("a"), 2, Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]), "ON CONFLICT(khoa) DO NOTHING");
  assert.equal((db.prepare("SELECT count(*) AS n FROM tl_van_nghia").get() as { n: number }).n, 1);
  assert.deepEqual([...(db.prepare("SELECT vec FROM tl_van_nghia").get() as { vec: Uint8Array }).vec], [0, 0, 0, 0, 0, 0, 0, 0], "dòng cũ giữ nguyên");
  assert.throws(() => db.exec(`UPDATE tl_van_nghia SET mau = 'x' WHERE khoa = '${K("a")}'`), /tl_append_only/);
  assert.throws(() => db.exec(`DELETE FROM tl_van_nghia WHERE khoa = '${K("a")}'`), /tl_append_only/);
});
