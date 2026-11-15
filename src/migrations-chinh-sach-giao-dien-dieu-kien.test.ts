// Kiểm migration ĐIỀU KIỆN của chính sách giao diện (ADR-0195 Đ2, `0156_chinh_sach_giao_dien_dieu_kien.sql`): thêm cột `dieu_kien` (NULL = luôn áp) vào bảng chỉ-thêm `gd_field_policy` bằng cách DỰNG LẠI bảng
// (ràng buộc UNIQUE cấp bảng của 0154 không bỏ được bằng ALTER). Phải: giữ nguyên dòng cũ, UNIQUE mới tính cả điều kiện (dòng trống là một giá trị riêng), trigger chỉ-thêm và CHECK còn nguyên.
// SQLite thật (node:sqlite). Tìm tệp theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_chinh_sach_giao_dien_dieu_kien.sql"));
const FILE = MATCHES[0] ?? "";
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const AT = "2026-11-10T03:00:00.000Z";
type Row = Record<string, unknown>;
const rows = (d: DatabaseSync, sql: string): Row[] => d.prepare(sql).all().map((r) => ({ ...(r as Row) }));
/** Áp mọi migration TRƯỚC 0156 (gồm 0154), chèn dòng cũ nếu cần, rồi áp 0156 (và các tệp sau nó). */
function mo(truoc?: (d: DatabaseSync) => void): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files.filter((x) => x < FILE)) d.exec(sqlOf(f));
  truoc?.(d);
  for (const f of files.filter((x) => x >= FILE)) d.exec(sqlOf(f));
  return d;
}
const them = (d: DatabaseSync, id: string, truong: string, quyen: string, cheDo: string, at: string, dieuKien: string | null = null) =>
  d.prepare("INSERT INTO gd_field_policy (id, man, truong, quyen, che_do, valid_from_at, created_at, created_by, updated_at, updated_by, dieu_kien) VALUES (?, 'dich-vu-trong-don', ?, ?, ?, ?, ?, 's1', ?, 's1', ?)")
    .run(id, truong, quyen, cheDo, at, at, at, dieuKien);

test("đúng MỘT tệp `0156_*_dieu_kien.sql`, số 0156 hoặc sau, không sửa tệp 0154", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${JSON.stringify(MATCHES)}`);
  assert.ok(FILE >= "0156", FILE);
  assert.ok(files.includes("0154_chinh_sach_giao_dien.sql"));
});

test("thêm cột dieu_kien (cho phép NULL); dòng cũ của 0154 được GIỮ NGUYÊN, dieu_kien = NULL", () => {
  const d = mo((x) => {
    x.prepare("INSERT INTO gd_field_policy (id, man, truong, quyen, che_do, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('cu1','tao-don','passengers','SALES','AN',?,?,'s9',?,'s9')").run(AT, AT, AT);
  });
  assert.deepEqual(rows(d, "SELECT id, man, truong, quyen, che_do, valid_from_at, created_by, dieu_kien FROM gd_field_policy"),
    [{ id: "cu1", man: "tao-don", truong: "passengers", quyen: "SALES", che_do: "AN", valid_from_at: AT, created_by: "s9", dieu_kien: null }]);
  const cot = rows(d, "PRAGMA table_info(gd_field_policy)").map((r) => r.name).sort();
  assert.deepEqual(cot, ["che_do", "created_at", "created_by", "dieu_kien", "id", "man", "quyen", "truong", "updated_at", "updated_by", "valid_from_at"]);
});

test("UNIQUE mới: cùng (màn, trường, quyền, mốc) khác điều kiện được; trùng cả điều kiện bị chặn; hai dòng không điều kiện cùng mốc vẫn bị chặn (NULL tính là một giá trị)", () => {
  const d = mo();
  them(d, "a", "note", "SALES", "AN", AT, null);
  them(d, "b", "note", "SALES", "HIEN", AT, "DICH_VU_CO_DON");
  them(d, "c", "note", "SALES", "AN", AT, "DICH_VU_KHONG_DON");
  assert.throws(() => them(d, "d", "note", "SALES", "HIEN", AT, null), /UNIQUE/, "trống ⇔ trống");
  assert.throws(() => them(d, "e", "note", "SALES", "HIEN", AT, "DICH_VU_CO_DON"), /UNIQUE/, "cùng điều kiện");
  them(d, "f", "note", "SALES", "HIEN", "2026-11-10T04:00:00.000Z", null);
});

test("chỉ-thêm: UPDATE và DELETE vẫn bị trigger chặn sau khi dựng lại bảng; CHECK che_do còn", () => {
  const d = mo();
  them(d, "a", "note", "SALES", "AN", AT, "DICH_VU_KHONG_DON");
  assert.throws(() => d.exec("UPDATE gd_field_policy SET che_do = 'HIEN' WHERE id = 'a'"), /gd_policy_append_only/);
  assert.throws(() => d.exec("DELETE FROM gd_field_policy WHERE id = 'a'"), /gd_policy_append_only/);
  assert.throws(() => them(d, "x", "note", "SALES", "ANH", AT), /CHECK/);
  assert.deepEqual(rows(d, "SELECT count(*) AS n FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'gd_field_policy'"), [{ n: 2 }]);
});

test("dòng hiệu lực phân theo điều kiện: dòng điều kiện mới KHÔNG che dòng trống cùng ô (câu SQL của module giao-dien)", () => {
  const d = mo();
  them(d, "a", "note", "SALES", "AN", "2026-11-10T01:00:00.000Z", null);
  them(d, "b", "note", "SALES", "HIEN", "2026-11-10T02:00:00.000Z", "DICH_VU_CO_DON");
  const dong = rows(d,
    `SELECT p.truong, p.quyen, p.che_do, p.dieu_kien FROM gd_field_policy p WHERE p.valid_from_at <= ?1 AND p.valid_from_at = (SELECT max(q.valid_from_at) FROM gd_field_policy q WHERE q.man = p.man AND q.truong = p.truong AND q.quyen = p.quyen AND COALESCE(q.dieu_kien, '') = COALESCE(p.dieu_kien, '') AND q.valid_from_at <= ?1) ORDER BY p.dieu_kien`.replaceAll("?1", "'2026-11-10T09:00:00.000Z'"));
  assert.equal(dong.length, 2);
});
