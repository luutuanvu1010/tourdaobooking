// Migration *_tl_bo_nao.sql (ADR-0073 Đ1, Đ2, Đ4, Đ5): bảng chỉ-thêm tl_bo_nao + ba cột (tl_luot_hoi.mau, .la_thu; tl_hoi_dap.cuoc_tro_chuyen) trên SQLite thật
// (node:sqlite), cùng cách với migrations-tro-ly-bang-dieu-khien.test.ts. Tìm tệp theo ĐUÔI tên — số tạm 0060, người gộp đổi số (docs/CHANGE-GUIDE.md công thức d).
// Hàng rào: tập cột tl_bo_nao GHIM đúng danh sách (không cột khoá); lời nhắc 1–12.000 ký tự và token ra 800–4.000 chặn ở CẢ CSDL (lớp hai sau kiemBoNao).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const TEP = files.find((f) => f.endsWith("_tl_bo_nao.sql"));

function open(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-10-01T01:00:00.000Z";
const cols = (db: DatabaseSync, t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name);
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql.slice(0, 120));
const AUDIT = ["created_at", "created_by", "updated_at", "updated_by"];
const boNao = (id: string, token = 1200, loiNhac = "Bạn là trợ lý.") =>
  `INSERT INTO tl_bo_nao (id, mau, muc_suy_nghi, do_dai, token_ra_toi_da, loi_nhac, valid_from_at, created_at, created_by, updated_at, updated_by)
   VALUES ('${id}', 'gpt-5-nano', 'minimal', 'low', ${token}, '${loiNhac}', '${NOW}', '${NOW}', 's1', '${NOW}', 's1')`;

test("tệp *_tl_bo_nao.sql có; số > 0057 (số tạm 0060 — người gộp đổi lên số lớn nhất của main + 1)", () => {
  assert.ok(TEP, "thiếu migrations/*_tl_bo_nao.sql");
  assert.ok(Number(TEP!.slice(0, 4)) >= 58, TEP);
});

test("HÀNG RÀO không cột khoá: ĐÚNG tập cột tl_bo_nao", () => {
  const db = open();
  assert.deepEqual(cols(db, "tl_bo_nao"), ["id", "mau", "muc_suy_nghi", "do_dai", "token_ra_toi_da", "loi_nhac", "valid_from_at", ...AUDIT]);
  for (const c of cols(db, "tl_bo_nao")) assert.ok(!/khoa|key|secret|token_api/i.test(c), `cột nghi chứa khoá: ${c}`);
});

test("tl_bo_nao: không gieo; chỉ thêm (UPDATE / DELETE bị trigger chặn); token ra 800–4000; lời nhắc 1–12.000 ký tự", () => {
  const db = open();
  assert.equal((db.prepare("SELECT count(*) AS n FROM tl_bo_nao").get() as { n: number }).n, 0, "không gieo — chưa có bản ⇒ bản mặc định trong mã (B5)");
  db.exec(boNao("a"));
  fails(db, "UPDATE tl_bo_nao SET mau = 'gpt-5' WHERE id = 'a'", /tl_append_only/);
  fails(db, "DELETE FROM tl_bo_nao WHERE id = 'a'", /tl_append_only/);
  fails(db, boNao("b", 799), /CHECK/);
  fails(db, boNao("c", 4001), /CHECK/);
  db.exec(boNao("d", 800));
  db.exec(boNao("e", 4000));
  fails(db, boNao("f", 1200, ""), /CHECK/);
  fails(db, boNao("g", 1200, "a".repeat(12_001)), /CHECK/);
  db.exec(boNao("h", 1200, "a".repeat(12_000)));
});

test("tl_luot_hoi: thêm mau (NULL = lượt cũ) + la_thu (mặc định 0, chỉ 0/1); tl_hoi_dap: thêm cuoc_tro_chuyen + chỉ mục (staff_id, cuoc_tro_chuyen, created_at)", () => {
  const db = open();
  db.exec(`INSERT INTO tl_luot_hoi (id, staff_id, ngay_vn, ket_qua, created_at, updated_at) VALUES ('cu', 's1', '2026-10-01', 'ok', '${NOW}', '${NOW}')`);
  assert.deepEqual({ ...(db.prepare("SELECT mau, la_thu FROM tl_luot_hoi WHERE id = 'cu'").get() as object) }, { mau: null, la_thu: 0 });
  db.exec(`INSERT INTO tl_luot_hoi (id, staff_id, ngay_vn, ket_qua, mau, la_thu, created_at, updated_at) VALUES ('thu', 's1', '2026-10-01', 'ok', 'gpt-5-mini', 1, '${NOW}', '${NOW}')`);
  fails(db, `INSERT INTO tl_luot_hoi (id, staff_id, ngay_vn, ket_qua, la_thu, created_at, updated_at) VALUES ('x', 's1', '2026-10-01', 'ok', 2, '${NOW}', '${NOW}')`, /CHECK/);
  assert.ok(cols(db, "tl_hoi_dap").includes("cuoc_tro_chuyen"));
  const ic = (db.prepare("SELECT name FROM pragma_index_info('tl_hoi_dap_cuoc') ORDER BY seqno").all() as { name: string }[]).map((x) => x.name);
  assert.deepEqual(ic, ["staff_id", "cuoc_tro_chuyen", "created_at"]);
});
