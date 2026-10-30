// Kiểm migration «luật bán theo loại đối tác» (ADR-0146 Đ1, Đ6 (b); ADR-0152 Đ2, Đ6 (g); kế hoạch docs/superpowers/plans/2026-10-30-adr-0146-va-dac-diem-dich-vu-ke-hoach.md T3, R-1).
// Chạy trên SQLite thật (node:sqlite) với schema dựng từ migrations/*.sql. Chèn / sửa THẲNG bằng SQL: chứng minh chặn nằm ở CSDL. Tệp tìm theo ĐUÔI tên.
// Loại đối tác dùng trong bài: các loại 0090 gieo sẵn vào danh sách được hưởng (TAXI_DRIVER, HOTEL_RECEPTION…); đặc điểm / giá trị do bài tự tạo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_luat_ban.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const boChuThich = (s: string) => s.replace(/--[^\n]*/g, "");
const AT = "2026-10-30T03:00:00.000Z";

function db(boSung?: (sql: string) => string) {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files) d.exec(boSung && f === MATCHES[0] ? boSung(sqlOf(f)) : sqlOf(f));
  d.prepare(`INSERT INTO ctl_attribute (code, name, sort_order, active, created_at, updated_at) VALUES ('aX', 'Đặc điểm X', 1, 1, ?, ?), ('aY', 'Đặc điểm Y', 2, 1, ?, ?)`).run(AT, AT, AT, AT);
  d.prepare(`INSERT INTO ctl_attribute_value (code, attribute_code, name, sort_order, active, created_at, updated_at) VALUES
    ('x1', 'aX', 'Một', 1, 1, ?, ?), ('x2', 'aX', 'Hai', 2, 1, ?, ?), ('y1', 'aY', 'Có', 1, 1, ?, ?)`).run(AT, AT, AT, AT, AT, AT);
  return d;
}
type Luat = { id?: string; role?: string; scope: string; catalog?: string | null; group?: string | null; attr?: string | null; value?: string | null; tu?: string; den?: string | null; note?: string | null };
let n = 0;
const them = (d: DatabaseSync, l: Luat) =>
  d.prepare(`INSERT INTO prc_sales_block (id, role_type_code, scope, catalog_code, group_code, attribute_code, value_code, valid_from_date, valid_to_date, note, created_at, created_by, updated_at, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)`)
    .run(l.id ?? `sb-${++n}`, l.role ?? "TAXI_DRIVER", l.scope, l.catalog ?? null, l.group ?? null, l.attr ?? null, l.value ?? null, l.tu ?? "2026-10-30", l.den ?? null, l.note ?? null, AT, AT);

test("migration luật bán: đúng MỘT tệp `*_luat_ban.sql`, số ≥ 0129 và SAU tệp đặc điểm dịch vụ; chỉ thêm; không CASE … END)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${MATCHES.length}`);
  assert.ok(MATCHES[0]! >= "0129", MATCHES[0]);
  const dacDiem = files.find((f) => f.endsWith("_dac_diem_dich_vu.sql"));
  assert.ok(dacDiem && dacDiem < MATCHES[0]!, "khoá ngoại trỏ bảng đặc điểm: tệp đặc điểm phải đứng trước");
  const sql = boChuThich(sqlOf(MATCHES[0]!));
  assert.doesNotMatch(sql, /DELETE\s+FROM|ALTER\s+TABLE|DROP\s+|UPDATE\s+\w+\s+SET|INSERT\s+INTO/i);
  assert.doesNotMatch(sql, /END\s*\)/i, "bộ tách câu của wrangler");
});

test("(b) ADR-0146 Đ1/Đ6: bảng chỉ có nghĩa «chặn» — đúng tập cột, không cột «cho phép»; (g) CHECK kiểu phạm vi đúng ba giá trị; mọi khoá ngoại một cột trỏ khoá chính", () => {
  const d = db();
  const cot = (d.prepare("PRAGMA table_info(prc_sales_block)").all() as { name: string }[]).map((c) => c.name);
  assert.deepEqual(cot, ["id", "role_type_code", "scope", "catalog_code", "group_code", "attribute_code", "value_code", "valid_from_date", "valid_to_date", "note",
    "created_at", "created_by", "updated_at", "updated_by"]);
  assert.deepEqual(cot.filter((c) => /allow|cho_phep|permit|grant|whitelist/i.test(c)), []);
  const ddl = (d.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'prc_sales_block'").get() as { sql: string }).sql;
  const m = ddl.match(/scope\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*scope\s+IN\s*\(([^)]*)\)\s*\)/i);
  assert.ok(m, "CHECK kiểu phạm vi phải nằm ở cột scope");
  assert.deepEqual(m[1]!.split(",").map((s) => s.trim()).sort(), ["'ATTRIBUTE'", "'GROUP'", "'SERVICE'"]);
  assert.doesNotMatch(ddl, /'ALL'|'ALLOW'/i);
  const fk = d.prepare("PRAGMA foreign_key_list(prc_sales_block)").all() as { id: number; table: string; from: string; to: string }[];
  assert.deepEqual(fk.map((f) => `${f.from}>${f.table}.${f.to}`).sort(),
    ["attribute_code>ctl_attribute.code", "group_code>ctl_group.code", "role_type_code>prc_beneficiary_role.role_type_code", "value_code>ctl_attribute_value.code"]);
  assert.equal(new Set(fk.map((f) => f.id)).size, fk.length, "không khoá ngoại nhiều cột");
  for (const t of ["prc_sales_block_no_delete", "prc_sales_block_close_only", "prc_sales_block_role_ok", "prc_sales_block_value_ok"])
    assert.ok(d.prepare("SELECT 1 FROM sqlite_master WHERE type = 'trigger' AND name = ?").get(t), `thiếu trigger ${t}`);
});

test("ADR-0146 tiêu chí 6: xoá → từ chối; sửa scope / loại / ghi chú / ngày bắt đầu → từ chối; đặt ngày kết thúc lần hai → từ chối; lần đầu được", () => {
  const d = db();
  them(d, { id: "L1", scope: "SERVICE", catalog: "D1", note: "Thử" });
  assert.throws(() => d.prepare("DELETE FROM prc_sales_block WHERE id = 'L1'").run(), /prc_append_only/);
  for (const sua of ["scope = 'GROUP', catalog_code = NULL, group_code = 'HTA'", "role_type_code = 'HOTEL_RECEPTION'", "note = 'Khác'", "valid_from_date = '2026-11-01'", "catalog_code = 'D2'"])
    assert.throws(() => d.prepare(`UPDATE prc_sales_block SET ${sua} WHERE id = 'L1'`).run(), /prc_append_only/, sua);
  assert.throws(() => d.prepare("UPDATE prc_sales_block SET valid_to_date = '2026-11-05', note = 'Khác' WHERE id = 'L1'").run(), /prc_append_only/, "đặt ngày kèm sửa cột khác");
  assert.doesNotThrow(() => d.prepare("UPDATE prc_sales_block SET valid_to_date = '2026-11-05', updated_at = ?, updated_by = 's' WHERE id = 'L1'").run(AT));
  assert.throws(() => d.prepare("UPDATE prc_sales_block SET valid_to_date = '2026-11-06' WHERE id = 'L1'").run(), /prc_append_only/, "lần hai");
});

test("ADR-0152 tiêu chí 14 (CHECK): ATTRIBUTE thiếu giá trị / thiếu đặc điểm / kèm mã dịch vụ; SERVICE kèm đặc điểm hay nhóm; GROUP kèm dịch vụ; tiêu chí 13: kiểu lạ → CHECK", () => {
  const d = db();
  const loi = /CHECK constraint failed/;
  assert.throws(() => them(d, { scope: "ATTRIBUTE", attr: "aX" }), loi, "ATTRIBUTE thiếu giá trị");
  assert.throws(() => them(d, { scope: "ATTRIBUTE", value: "x1" }), loi, "ATTRIBUTE thiếu đặc điểm");
  assert.throws(() => them(d, { scope: "ATTRIBUTE", attr: "aX", value: "x1", catalog: "D1" }), loi, "ATTRIBUTE kèm dịch vụ");
  assert.throws(() => them(d, { scope: "SERVICE", catalog: "D1", attr: "aX", value: "x1" }), loi, "SERVICE kèm đặc điểm");
  assert.throws(() => them(d, { scope: "SERVICE", catalog: "D1", group: "HTA" }), loi, "SERVICE kèm nhóm");
  assert.throws(() => them(d, { scope: "SERVICE" }), loi, "SERVICE thiếu mã");
  assert.throws(() => them(d, { scope: "GROUP", group: "HTA", catalog: "D1" }), loi, "GROUP kèm dịch vụ");
  assert.throws(() => them(d, { scope: "GROUP", group: "HTA", attr: "aX", value: "x1" }), loi, "GROUP kèm đặc điểm");
  assert.throws(() => them(d, { scope: "ALL" }), loi, "phạm vi «mọi dịch vụ» không có");
  assert.throws(() => them(d, { scope: "allow", catalog: "D1" }), loi, "kiểu lạ");
  assert.throws(() => them(d, { scope: "SERVICE", catalog: "D1", note: "x".repeat(201) }), loi, "ghi chú > 200");
  assert.doesNotThrow(() => them(d, { scope: "SERVICE", catalog: "D1" }));
  assert.doesNotThrow(() => them(d, { scope: "GROUP", group: "HTA" }));
  assert.doesNotThrow(() => them(d, { scope: "ATTRIBUTE", attr: "aX", value: "x1" }), "ATTRIBUTE không nhóm");
  assert.doesNotThrow(() => them(d, { scope: "ATTRIBUTE", attr: "aX", value: "x1", group: "HTA" }), "ATTRIBUTE kèm nhóm (tuỳ chọn)");
  assert.throws(() => them(d, { scope: "GROUP", group: "KHONG-CO" }), /FOREIGN KEY constraint failed/);
});

test("ADR-0152 tiêu chí 13 (trigger): giá trị không thuộc đặc điểm ghi trên dòng → từ chối; giá trị đang tắt → từ chối (đọc view công bố v_ctl_attribute_value)", () => {
  const d = db();
  assert.throws(() => them(d, { scope: "ATTRIBUTE", attr: "aY", value: "x1" }), /prc_sales_block_value/, "x1 thuộc aX");
  d.prepare("UPDATE ctl_attribute_value SET active = 0 WHERE code = 'x2'").run();
  assert.throws(() => them(d, { scope: "ATTRIBUTE", attr: "aX", value: "x2" }), /prc_sales_block_value/, "giá trị đang tắt");
  assert.doesNotThrow(() => them(d, { scope: "ATTRIBUTE", attr: "aY", value: "y1" }));
});

test("ADR-0146 Đ1 bất biến (lớp CSDL): loại không trong danh sách được hưởng, hoặc đang tắt → từ chối; bật lại → được", () => {
  const d = db();
  assert.throws(() => them(d, { role: "SUPPLIER", scope: "SERVICE", catalog: "D1" }), /FOREIGN KEY constraint failed|prc_sales_block_target/, "không trong danh sách");
  d.prepare("UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = 'TAXI_DRIVER'").run();
  assert.throws(() => them(d, { scope: "SERVICE", catalog: "D1" }), /prc_sales_block_target/, "loại đang tắt");
  d.prepare("UPDATE prc_beneficiary_role SET active = 1 WHERE role_type_code = 'TAXI_DRIVER'").run();
  assert.doesNotThrow(() => them(d, { scope: "SERVICE", catalog: "D1" }));
});

test("R-1 (Q-3 chủ chọn (a)): ngày kết thúc ≥ ngày bắt đầu − 1 — «khoảng rỗng» (kết thúc ngay luật bắt đầu hôm nay) được; − 2 → CHECK; lúc chèn và lúc đặt ngày kết thúc", () => {
  const d = db();
  assert.doesNotThrow(() => them(d, { scope: "SERVICE", catalog: "D1", tu: "2026-10-30", den: "2026-10-29" }), "chèn sẵn −1");
  assert.throws(() => them(d, { scope: "SERVICE", catalog: "D1", tu: "2026-10-30", den: "2026-10-28" }), /CHECK constraint failed/, "chèn −2");
  them(d, { id: "R1", scope: "SERVICE", catalog: "D1", tu: "2026-11-01" });
  assert.throws(() => d.prepare("UPDATE prc_sales_block SET valid_to_date = '2026-10-30' WHERE id = 'R1'").run(), /CHECK constraint failed/, "đặt −2");
  assert.doesNotThrow(() => d.prepare("UPDATE prc_sales_block SET valid_to_date = '2026-10-31' WHERE id = 'R1'").run(), "đặt −1");
});

test("(g) tự kiểm bài lược đồ: bỏ vế ATTRIBUTE khỏi CHECK trong bản dựng thử ⇒ luật ATTRIBUTE bị CSDL từ chối (bài canh đúng câu CHECK)", () => {
  const d = db((sql) => sql.replace(/'SERVICE',\s*'GROUP',\s*'ATTRIBUTE'/, "'SERVICE', 'GROUP'"));
  assert.throws(() => them(d, { scope: "ATTRIBUTE", attr: "aX", value: "x1" }), /CHECK constraint failed/);
});
