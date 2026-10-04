// Kiểm migration *_lan_gui.sql (ADR-0094 đ2, đ8a, A-1, A-3, A-7): bảng vé `lg_lan_gui` + bảng chính sách thời hạn giữ vé `lg_chinh_sach_giu`.
// Tệp tìm theo ĐUÔI tên (số migration đổi được lúc gộp). Hàng rào H9 (phần CSDL): sàn 90 ngày nằm ở CHECK.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_lan_gui.sql"));
const all = () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
};
const AT = "2026-10-03T01:00:00.000Z";
const chenVe = (db: DatabaseSync, staff: string, khoa: string) =>
  db.prepare(
    "INSERT INTO lg_lan_gui (staff_id, khoa, van_tay, duong, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'vt', 'POST /api/orders', ?, ?, ?, ?)",
  ).run(staff, khoa, AT, staff, AT, staff);
const chenChinhSach = (db: DatabaseSync, id: string, soNgay: number | null, from: string) =>
  db.prepare("INSERT INTO lg_chinh_sach_giu (id, so_ngay, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, NULL, ?, NULL)").run(id, soNgay, from, AT, AT);

test("(a) đúng một tệp *_lan_gui.sql", () => {
  assert.equal(MATCHES.length, 1, JSON.stringify(MATCHES));
});

test("(b) lg_lan_gui: WITHOUT ROWID, khoá chính (staff_id, khoa), đủ cột, có chỉ mục created_at", () => {
  const db = all();
  const sql = (db.prepare("SELECT sql FROM sqlite_master WHERE name = 'lg_lan_gui'").get() as { sql: string }).sql;
  assert.match(sql, /WITHOUT\s+ROWID/i);
  const cols = db.prepare("PRAGMA table_info(lg_lan_gui)").all() as { name: string; pk: number; notnull: number; dflt_value: string | null }[];
  assert.deepEqual(cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name), ["staff_id", "khoa"]);
  assert.deepEqual(
    cols.map((c) => c.name).sort(),
    ["created_at", "created_by", "duong", "ket_qua", "khoa", "ma_loi", "ma_tra", "so_lan_lap", "staff_id", "updated_at", "updated_by", "van_tay"].sort(),
  );
  assert.equal(cols.find((c) => c.name === "so_lan_lap")!.dflt_value, "0");
  const idx = db.prepare("SELECT name FROM pragma_index_list('lg_lan_gui')").all() as { name: string }[];
  const coCreatedAt = idx.some((i) => (db.prepare(`SELECT name FROM pragma_index_info('${i.name}')`).all() as { name: string }[])[0]?.name === "created_at");
  assert.ok(coCreatedAt, "thiếu chỉ mục đứng đầu bằng created_at (đường dọn vé, ADR-0094 đ2)");
});

test("(c) chèn trùng (staff_id, khoa) ⇒ lỗi khoá; cùng khoa khác tài khoản ⇒ được", () => {
  const db = all();
  chenVe(db, "s1", "k-0000000000000001");
  assert.throws(() => chenVe(db, "s1", "k-0000000000000001"), /UNIQUE constraint failed: lg_lan_gui\.staff_id, lg_lan_gui\.khoa/);
  chenVe(db, "s2", "k-0000000000000001");
  assert.equal((db.prepare("SELECT so_lan_lap FROM lg_lan_gui WHERE staff_id = 's1'").get() as { so_lan_lap: number }).so_lan_lap, 0);
});

test("(d) lg_chinh_sach_giu: gieo đúng một dòng 365 ngày, created_by NULL", () => {
  const db = all();
  const rows = db.prepare("SELECT so_ngay, created_by FROM lg_chinh_sach_giu").all() as { so_ngay: number; created_by: string | null }[];
  assert.deepEqual(rows.map((r) => ({ ...r })), [{ so_ngay: 365, created_by: null }]);
});

test("(e) H9 phần CSDL: số ngày dưới sàn 90 ⇒ CHECK chặn; 90 và NULL (Không dọn) được", () => {
  const db = all();
  assert.throws(() => chenChinhSach(db, "p30", 30, "2026-11-01T00:00:00.000Z"), /CHECK/);
  assert.throws(() => chenChinhSach(db, "p89", 89, "2026-11-02T00:00:00.000Z"), /CHECK/);
  chenChinhSach(db, "p90", 90, "2026-11-03T00:00:00.000Z");
  chenChinhSach(db, "pnull", null, "2026-11-04T00:00:00.000Z");
});

test("(f) lg_chinh_sach_giu chỉ-thêm: UPDATE, DELETE ⇒ RAISE; valid_from_at UNIQUE", () => {
  const db = all();
  assert.throws(() => db.exec("UPDATE lg_chinh_sach_giu SET so_ngay = 400"), /lg_chinh_sach_giu_chi_them/);
  assert.throws(() => db.exec("DELETE FROM lg_chinh_sach_giu"), /lg_chinh_sach_giu_chi_them/);
  chenChinhSach(db, "a", 180, "2026-12-01T00:00:00.000Z");
  assert.throws(() => chenChinhSach(db, "b", 180, "2026-12-01T00:00:00.000Z"), /UNIQUE/);
});
