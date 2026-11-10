// Kiểm migration CHÍNH SÁCH GIAO DIỆN (ADR-0194 đợt 1, nhiệm vụ 2): bảng chỉ-thêm `gd_field_policy` (module giao-dien), khuôn `ord_partner_customer_policy` (0133).
// Bảng RỖNG khi phát hành (không gieo dòng) ⇒ hành vi hôm nay không đổi. SQLite thật (node:sqlite). Tìm tệp theo ĐUÔI tên — đổi số lúc gộp chỉ phải đổi tên tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_chinh_sach_giao_dien.sql"));
const FILE = MATCHES[0] ?? "";
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const AT = "2026-11-09T03:00:00.000Z";
type Row = Record<string, unknown>;
const rows = (d: DatabaseSync, sql: string): Row[] => d.prepare(sql).all().map((r) => ({ ...(r as Row) }));
function open(list: string[] = files): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of list) d.exec(sqlOf(f));
  return d;
}
const them = (d: DatabaseSync, id: string, man: string, truong: string, quyen: string, cheDo: string, at: string) =>
  d.prepare("INSERT INTO gd_field_policy (id, man, truong, quyen, che_do, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, 's1', ?, 's1')").run(id, man, truong, quyen, cheDo, at, at, at);

test("đúng MỘT tệp `*_chinh_sach_giao_dien.sql`, số 0154 hoặc sau, chỉ-thêm (không DROP bảng, không đụng trigger cũ)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${JSON.stringify(MATCHES)}`);
  assert.ok(FILE >= "0154", FILE);
  const khongChuThich = sqlOf(FILE).replace(/--.*$/gm, "");
  assert.doesNotMatch(khongChuThich, /DROP\s|ALTER\s+TABLE/i);
});

test("bảng gd_field_policy RỖNG sau khi áp (không gieo dòng nào — bảng rỗng = hành vi hôm nay)", () => {
  const d = open();
  assert.deepEqual(rows(d, "SELECT count(*) AS n FROM gd_field_policy"), [{ n: 0 }]);
});

test("che_do chỉ nhận HIEN | AN | BAT_BUOC | TUY_CHON; các cột chính NOT NULL", () => {
  const d = open();
  for (const c of ["HIEN", "AN", "BAT_BUOC", "TUY_CHON"]) them(d, `i-${c}`, "tao-don", `t${c}`, "SALES", c, AT);
  assert.throws(() => them(d, "x1", "tao-don", "t", "SALES", "ANH", AT), /CHECK/);
  assert.throws(() => them(d, "x2", "tao-don", "t", "SALES", "an", AT), /CHECK/);
  for (const cot of ["man", "truong", "quyen", "valid_from_at"]) {
    const cols = ["id", "man", "truong", "quyen", "che_do", "valid_from_at", "created_at", "updated_at"].map((c) => (c === cot ? "NULL" : c === "che_do" ? "'AN'" : "'v'"));
    assert.throws(() => d.exec(`INSERT INTO gd_field_policy (id, man, truong, quyen, che_do, valid_from_at, created_at, updated_at) VALUES (${cols.join(",")})`), /NOT NULL/, cot);
  }
});

test("chỉ-thêm: UPDATE và DELETE bị trigger chặn", () => {
  const d = open();
  them(d, "a", "tao-don", "passengers", "SALES", "AN", AT);
  assert.throws(() => d.exec("UPDATE gd_field_policy SET che_do = 'HIEN' WHERE id = 'a'"), /gd_policy_append_only/);
  assert.throws(() => d.exec("DELETE FROM gd_field_policy WHERE id = 'a'"), /gd_policy_append_only/);
  assert.deepEqual(rows(d, "SELECT che_do FROM gd_field_policy WHERE id = 'a'"), [{ che_do: "AN" }]);
});

test("khoá (màn, trường, quyền, mốc) không trùng; cùng ô khác mốc thì được; khác ô cùng mốc thì được", () => {
  const d = open();
  them(d, "a", "tao-don", "passengers", "SALES", "AN", AT);
  assert.throws(() => them(d, "b", "tao-don", "passengers", "SALES", "HIEN", AT), /UNIQUE/);
  them(d, "c", "tao-don", "passengers", "SALES", "HIEN", "2026-11-09T04:00:00.000Z");
  them(d, "d", "tao-don", "passengers", "INTERN", "AN", AT);
  them(d, "e", "tao-don", "customerNote", "SALES", "AN", AT);
});

test("dòng hiệu lực = mốc lớn nhất ≤ bây giờ theo (màn, trường, quyền); dòng tương lai chưa tính", () => {
  const d = open();
  them(d, "a", "tao-don", "passengers", "SALES", "AN", "2026-11-09T01:00:00.000Z");
  them(d, "b", "tao-don", "passengers", "SALES", "HIEN", "2026-11-09T02:00:00.000Z");
  them(d, "c", "tao-don", "passengers", "SALES", "AN", "2026-11-09T09:00:00.000Z");
  them(d, "d", "tao-don", "passengers", "INTERN", "AN", "2026-11-09T01:00:00.000Z");
  const q = (luc: string) => d.prepare(
    "SELECT p.quyen, p.che_do FROM gd_field_policy p WHERE p.valid_from_at <= ?1 AND p.valid_from_at = (SELECT max(q.valid_from_at) FROM gd_field_policy q WHERE q.man = p.man AND q.truong = p.truong AND q.quyen = p.quyen AND q.valid_from_at <= ?1) ORDER BY p.quyen",
  ).all(luc).map((r) => ({ ...(r as Row) }));
  assert.deepEqual(q("2026-11-09T01:30:00.000Z"), [{ quyen: "INTERN", che_do: "AN" }, { quyen: "SALES", che_do: "AN" }]);
  assert.deepEqual(q("2026-11-09T05:00:00.000Z"), [{ quyen: "INTERN", che_do: "AN" }, { quyen: "SALES", che_do: "HIEN" }]);
  assert.deepEqual(q("2026-11-09T10:00:00.000Z"), [{ quyen: "INTERN", che_do: "AN" }, { quyen: "SALES", che_do: "AN" }]);
});

test("không có cột nào chứa dữ liệu cá nhân của khách (chỉ mã màn, trường, quyền, chế độ, mã điều kiện, mốc, người ghi)", () => {
  const d = open();
  const cot = rows(d, "PRAGMA table_info(gd_field_policy)").map((r) => r.name).sort();
  assert.deepEqual(cot, ["che_do", "created_at", "created_by", "dieu_kien", "id", "man", "quyen", "truong", "updated_at", "updated_by", "valid_from_at"]); // + dieu_kien: ADR-0195, migration 0156
});
