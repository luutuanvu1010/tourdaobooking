// Kiểm migration «Đặc điểm dịch vụ» (ADR-0152 Đ1, Đ6 (h), (j); kế hoạch docs/superpowers/plans/2026-10-30-adr-0146-va-dac-diem-dich-vu-ke-hoach.md T1).
// Chạy trên SQLite thật (node:sqlite) với schema dựng từ migrations/*.sql. Chèn / sửa THẲNG bằng SQL: chứng minh chặn nằm ở CSDL. Tệp tìm theo ĐUÔI tên
// (đổi số lúc gộp chỉ đổi tên tệp). Tên đặc điểm / giá trị trong bài là ví dụ tự tạo — mã không biết đặc điểm nào.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_dac_diem_dich_vu.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const boChuThich = (s: string) => s.replace(/--[^\n]*/g, "");
const AT = "2026-10-30T03:00:00.000Z";
const SAU = "2026-10-30T04:00:00.000Z";

function db() {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files) d.exec(sqlOf(f));
  return d;
}
const dichVu = (d: DatabaseSync, code: string) =>
  d.prepare(`INSERT INTO catalog_item (code, name, unit, price_adult, sheet_row, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', 100000, 1, 1, ?, ?)`).run(code, `Dịch vụ ${code}`, AT, AT);
let n = 0;
let seq = 0;
const ganNhom = (d: DatabaseSync, code: string, nhom: string | null) =>
  d.prepare(`INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL)`)
    .run(`sg-${++n}`, code, nhom, ++seq, AT, AT, AT);
const dacDiem = (d: DatabaseSync, code: string, name = `Đặc điểm ${code}`) =>
  d.prepare(`INSERT INTO ctl_attribute (code, name, sort_order, active, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 1, 1, ?, NULL, ?, NULL)`).run(code, name, AT, AT);
const giaTri = (d: DatabaseSync, code: string, attr: string, name = `Giá trị ${code}`) =>
  d.prepare(`INSERT INTO ctl_attribute_value (code, attribute_code, name, sort_order, active, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, 1, 1, ?, NULL, ?, NULL)`)
    .run(code, attr, name, AT, AT);
const gan = (d: DatabaseSync, o: { id?: string; service?: string | null; group?: string | null; attr: string; value: string }) =>
  d.prepare(`INSERT INTO ctl_attribute_assignment (id, service_code, group_code, attribute_code, value_code, valid_from_at, created_at, created_by, updated_at, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)`).run(o.id ?? `as-${++n}`, o.service ?? null, o.group ?? null, o.attr, o.value, AT, AT, AT);
const dong = (d: DatabaseSync, id: string) =>
  d.prepare(`UPDATE ctl_attribute_assignment SET valid_to_at = ?, updated_at = ?, updated_by = NULL WHERE id = ?`).run(SAU, SAU, id);
const hieuLuc = (d: DatabaseSync, code: string, attr: string) =>
  d.prepare("SELECT value_code, source FROM v_ctl_service_attribute WHERE catalog_code = ? AND attribute_code = ?").all(code, attr) as { value_code: string; source: string }[];

test("migration đặc điểm dịch vụ: đúng MỘT tệp `*_dac_diem_dich_vu.sql`, số ≥ 0128; không xoá dữ liệu, không sửa bảng cũ, không CASE trong trigger", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${MATCHES.length}`);
  assert.ok(MATCHES[0]! >= "0128", MATCHES[0]);
  const sql = boChuThich(sqlOf(MATCHES[0]!));
  assert.doesNotMatch(sql, /DELETE\s+FROM|ALTER\s+TABLE|DROP\s+TABLE|DROP\s+VIEW|UPDATE\s+\w+\s+SET/i);
  // Bộ tách câu của wrangler không đóng khối ở `END)` — không viết `(CASE … END)` (bài «tách câu» ở migrations-dung-lai-muc.test.ts).
  assert.doesNotMatch(sql, /END\s*\)/i);
});

test("(j) ADR-0152 Đ1 «không gieo dữ liệu»: migration của lượt này không INSERT vào ctl_attribute* (đặc điểm do Quản trị nhập trên màn)", () => {
  const luot = files.filter((f) => f.endsWith("_dac_diem_dich_vu.sql") || f.endsWith("_luat_ban.sql"));
  assert.ok(luot.length >= 1);
  for (const f of luot) assert.doesNotMatch(boChuThich(sqlOf(f)), /INSERT\s+(OR\s+\w+\s+)?INTO\s+ctl_attribute/i, f);
  const d = db();
  for (const t of ["ctl_attribute", "ctl_attribute_value", "ctl_attribute_assignment"])
    assert.equal((d.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n, 0, `${t} rỗng sau migration`);
});

test("định nghĩa: tên 1–40 ký tự; tên trùng chỉ cấm giữa các đặc điểm đang dùng (và giữa giá trị đang dùng CÙNG đặc điểm); không xoá; không đổi mã / đặc điểm của giá trị", () => {
  const d = db();
  assert.throws(() => dacDiem(d, "a1", ""), /CHECK constraint failed/);
  assert.throws(() => dacDiem(d, "a1", "x".repeat(41)), /CHECK constraint failed/);
  dacDiem(d, "a1", "Vận chuyển");
  assert.throws(() => dacDiem(d, "a2", "Vận chuyển"), /UNIQUE constraint failed/);
  d.prepare("UPDATE ctl_attribute SET active = 0 WHERE code = 'a1'").run();
  assert.doesNotThrow(() => dacDiem(d, "a2", "Vận chuyển"), "tên của đặc điểm đã tắt được dùng lại");
  dacDiem(d, "a3");
  giaTri(d, "v1", "a2", "Gồm");
  assert.throws(() => giaTri(d, "v2", "a2", "Gồm"), /UNIQUE constraint failed/);
  assert.doesNotThrow(() => giaTri(d, "v3", "a3", "Gồm"), "cùng tên ở đặc điểm khác được");
  assert.throws(() => giaTri(d, "v4", "khong-co", "Lạ"), /FOREIGN KEY constraint failed/);
  assert.throws(() => d.prepare("DELETE FROM ctl_attribute WHERE code = 'a3'").run(), /ctl_append_only/);
  assert.throws(() => d.prepare("DELETE FROM ctl_attribute_value WHERE code = 'v1'").run(), /ctl_append_only/);
  assert.throws(() => d.prepare("UPDATE ctl_attribute SET code = 'a9' WHERE code = 'a3'").run(), /ctl_append_only/);
  assert.throws(() => d.prepare("UPDATE ctl_attribute_value SET attribute_code = 'a3' WHERE code = 'v1'").run(), /ctl_append_only/);
  assert.throws(() => d.prepare("UPDATE ctl_attribute_value SET code = 'v9' WHERE code = 'v1'").run(), /ctl_append_only/);
  assert.doesNotThrow(() => d.prepare("UPDATE ctl_attribute_value SET name = 'Khứ hồi', sort_order = 2, updated_at = ? WHERE code = 'v1'").run(SAU), "đổi tên / thứ tự được");
});

test("tiêu chí 5 (ADR-0152): CSDL từ chối xoá dòng gắn, sửa cột khác ngoài đóng, đóng dòng đã đóng, giá trị thuộc đặc điểm khác (trigger — không khoá ngoại nhiều cột), đặc điểm / giá trị / nhóm đang tắt, dòng có cả hai mã, hai dòng mở cùng (đích, đặc điểm)", () => {
  const d = db();
  dichVu(d, "D1");
  dacDiem(d, "aX");
  dacDiem(d, "aY");
  giaTri(d, "x1", "aX");
  giaTri(d, "x2", "aX");
  giaTri(d, "y1", "aY");
  // Khoá ngoại: mỗi khoá MỘT cột, trỏ khoá chính (bài architecture.test.ts «khoá ngoại xuyên module» canh thêm).
  const fk = d.prepare("PRAGMA foreign_key_list(ctl_attribute_assignment)").all() as { id: number; table: string; from: string; to: string }[];
  assert.deepEqual(fk.map((f) => `${f.from}>${f.table}.${f.to}`).sort(),
    ["attribute_code>ctl_attribute.code", "group_code>ctl_group.code", "service_code>catalog_item.code", "value_code>ctl_attribute_value.code"]);
  assert.equal(new Set(fk.map((f) => f.id)).size, fk.length, "không khoá ngoại nhiều cột");

  gan(d, { id: "g1", service: "D1", attr: "aX", value: "x1" });
  assert.throws(() => d.prepare("DELETE FROM ctl_attribute_assignment WHERE id = 'g1'").run(), /ctl_append_only/, "xoá");
  assert.throws(() => d.prepare("UPDATE ctl_attribute_assignment SET value_code = 'x2' WHERE id = 'g1'").run(), /ctl_append_only/, "sửa giá trị");
  assert.throws(() => d.prepare("UPDATE ctl_attribute_assignment SET valid_to_at = ?, service_code = NULL, group_code = 'HTA' WHERE id = 'g1'").run(SAU), /ctl_append_only/, "đóng kèm sửa cột khác");
  dong(d, "g1");
  assert.throws(() => dong(d, "g1"), /ctl_append_only/, "đóng dòng đã đóng");
  assert.throws(() => gan(d, { service: "D1", attr: "aX", value: "y1" }), /ctl_attribute_mismatch/, "giá trị thuộc đặc điểm khác");
  assert.throws(() => gan(d, { service: "D1", group: "HTA", attr: "aX", value: "x1" }), /CHECK constraint failed/, "có cả mã dịch vụ lẫn mã nhóm");
  assert.throws(() => gan(d, { attr: "aX", value: "x1" }), /CHECK constraint failed/, "không có đích");
  gan(d, { id: "g2", service: "D1", attr: "aX", value: "x2" });
  assert.throws(() => gan(d, { service: "D1", attr: "aX", value: "x1" }), /UNIQUE constraint failed/, "hai dòng mở cùng (dịch vụ, đặc điểm)");
  assert.doesNotThrow(() => gan(d, { service: "D1", attr: "aY", value: "y1" }), "đặc điểm khác của cùng dịch vụ được");
  gan(d, { id: "gn", group: "HTA", attr: "aX", value: "x1" });
  assert.throws(() => gan(d, { group: "HTA", attr: "aX", value: "x2" }), /UNIQUE constraint failed/, "hai dòng mở cùng (nhóm, đặc điểm)");
  dong(d, "gn");
  // Đang tắt: giá trị, đặc điểm, nhóm (tắt khi KHÔNG còn dòng mở — R-8).
  dong(d, "g2");
  d.prepare("UPDATE ctl_attribute_value SET active = 0 WHERE code = 'x2'").run();
  assert.throws(() => gan(d, { service: "D1", attr: "aX", value: "x2" }), /ctl_attribute_inactive/, "giá trị đang tắt");
  d.prepare("UPDATE ctl_attribute_value SET active = 1 WHERE code = 'x2'").run();
  d.prepare("UPDATE ctl_attribute SET active = 0 WHERE code = 'aX'").run();
  assert.throws(() => gan(d, { service: "D1", attr: "aX", value: "x2" }), /ctl_attribute_inactive/, "đặc điểm đang tắt");
  d.prepare("UPDATE ctl_attribute SET active = 1 WHERE code = 'aX'").run();
  d.prepare("UPDATE ctl_group SET active = 0 WHERE code = 'TDA'").run();
  assert.throws(() => gan(d, { group: "TDA", attr: "aX", value: "x1" }), /ctl_attribute_inactive/, "nhóm đang tắt");
  assert.throws(() => gan(d, { service: "KHONG-CO", attr: "aX", value: "x1" }), /FOREIGN KEY constraint failed/, "mã ngoài danh mục");
});

test("tiêu chí 6 (lớp CSDL, R-8 của kế hoạch): tắt giá trị / đặc điểm còn dòng gắn mở → trigger từ chối; đóng hết dòng rồi tắt → được; bật lại được", () => {
  const d = db();
  dichVu(d, "D1");
  dacDiem(d, "aX");
  giaTri(d, "x1", "aX");
  gan(d, { id: "g1", service: "D1", attr: "aX", value: "x1" });
  gan(d, { id: "g2", group: "HTA", attr: "aX", value: "x1" });
  assert.throws(() => d.prepare("UPDATE ctl_attribute_value SET active = 0 WHERE code = 'x1'").run(), /ctl_attribute_in_use/);
  assert.throws(() => d.prepare("UPDATE ctl_attribute SET active = 0 WHERE code = 'aX'").run(), /ctl_attribute_in_use/);
  dong(d, "g1");
  assert.throws(() => d.prepare("UPDATE ctl_attribute_value SET active = 0 WHERE code = 'x1'").run(), /ctl_attribute_in_use/, "còn dòng theo nhóm");
  dong(d, "g2");
  assert.doesNotThrow(() => d.prepare("UPDATE ctl_attribute_value SET active = 0 WHERE code = 'x1'").run());
  assert.doesNotThrow(() => d.prepare("UPDATE ctl_attribute SET active = 0 WHERE code = 'aX'").run());
  assert.doesNotThrow(() => d.prepare("UPDATE ctl_attribute SET active = 1 WHERE code = 'aX'").run(), "bật lại đặc điểm");
  assert.doesNotThrow(() => d.prepare("UPDATE ctl_attribute_value SET active = 1 WHERE code = 'x1'").run(), "bật lại giá trị");
});

test("(h) bảng chân trị v_ctl_service_attribute: {riêng có / không} × {nhóm có / không giá trị chung} × {nhóm đang dùng / đã tắt / Chưa phân loại} — 12 ô, riêng thắng chung", () => {
  const d = db();
  dacDiem(d, "aX");
  giaTri(d, "xR", "aX"); // giá trị riêng của dịch vụ
  giaTri(d, "xC", "aX"); // giá trị chung của nhóm
  // Nhóm thử: GD (đang dùng), GT (sẽ tắt), GC (nhóm cũ của dịch vụ đã đưa về Chưa phân loại).
  for (const [code, name] of [["GD", "Nhóm dùng"], ["GT", "Nhóm tắt"], ["GC", "Nhóm cũ"], ["GD0", "Nhóm dùng trống"], ["GT0", "Nhóm tắt trống"], ["GC0", "Nhóm cũ trống"]] as const)
    d.prepare("INSERT INTO ctl_group (code, name, sort_order, active, created_at, updated_at) VALUES (?, ?, 99, 1, ?, ?)").run(code, name, AT, AT);
  // Giá trị chung chỉ ở GD, GT, GC; GD0, GT0, GC0 không có.
  for (const g of ["GD", "GT", "GC"]) gan(d, { group: g, attr: "aX", value: "xC" });
  type O = { rieng: boolean; chung: boolean; nhom: "dung" | "tat" | "chua" };
  const ky = (o: O) => `${o.rieng ? "R" : "_"}${o.chung ? "C" : "_"}-${o.nhom}`;
  // Đáp án viết tay (không suy từ mã): riêng có ⇒ (xR, SERVICE); không riêng mà nhóm HIỆN HÀNH đang dùng có chung ⇒ (xC, GROUP); còn lại ⇒ không dòng.
  const DAP_AN: Record<string, [string, string] | null> = {
    "RC-dung": ["xR", "SERVICE"], "R_-dung": ["xR", "SERVICE"], "_C-dung": ["xC", "GROUP"], "__-dung": null,
    "RC-tat": ["xR", "SERVICE"], "R_-tat": ["xR", "SERVICE"], "_C-tat": null, "__-tat": null,
    "RC-chua": ["xR", "SERVICE"], "R_-chua": ["xR", "SERVICE"], "_C-chua": null, "__-chua": null,
  };
  const ca: O[] = [];
  for (const rieng of [true, false]) for (const chung of [true, false]) for (const nhom of ["dung", "tat", "chua"] as const) ca.push({ rieng, chung, nhom });
  assert.equal(ca.length, 12);
  for (const o of ca) {
    const code = `S${ky(o)}`;
    dichVu(d, code);
    const g = { dung: o.chung ? "GD" : "GD0", tat: o.chung ? "GT" : "GT0", chua: o.chung ? "GC" : "GC0" }[o.nhom];
    ganNhom(d, code, g);
    if (o.nhom === "chua") ganNhom(d, code, null); // nhóm cũ còn giá trị chung, nhưng nhóm HIỆN HÀNH là Chưa phân loại
    if (o.rieng) gan(d, { service: code, attr: "aX", value: "xR" });
  }
  // Tắt nhóm SAU khi gán (trigger chỉ chặn gán MỚI vào nhóm tắt). Dòng chung của GT vẫn MỞ: chứng minh view bỏ qua nhóm đã tắt dù dòng còn mở.
  d.prepare("UPDATE ctl_group SET active = 0 WHERE code IN ('GT', 'GT0')").run();
  for (const o of ca) {
    const code = `S${ky(o)}`;
    const got = hieuLuc(d, code, "aX");
    const want = DAP_AN[ky(o)];
    if (want === null) assert.deepEqual(got, [], `${ky(o)}: không dòng (chưa khai)`);
    else assert.deepEqual(got.map((r) => [r.value_code, r.source]), [want], ky(o));
  }
  // Tiêu chí 3 ở mức view: đóng dòng riêng ⇒ về giá trị chung.
  const id = (d.prepare("SELECT id FROM ctl_attribute_assignment WHERE service_code = 'SRC-dung' AND valid_to_at IS NULL").get() as { id: string }).id;
  dong(d, id);
  assert.deepEqual(hieuLuc(d, "SRC-dung", "aX").map((r) => [r.value_code, r.source]), [["xC", "GROUP"]]);
  // View chỉ có khoá (không cột tên — hàng rào (l2)).
  assert.deepEqual((d.prepare("PRAGMA table_info(v_ctl_service_attribute)").all() as { name: string }[]).map((c) => c.name), ["catalog_code", "attribute_code", "value_code", "source"]);
  assert.deepEqual((d.prepare("PRAGMA table_info(v_ctl_attribute_value)").all() as { name: string }[]).map((c) => c.name), ["attribute_code", "code", "active", "attribute_active"]);
});

test("v_ctl_service_attribute: tối đa MỘT dòng mỗi (dịch vụ, đặc điểm) — hai đặc điểm, nhóm chung và riêng cùng lúc không nhân dòng", () => {
  const d = db();
  for (const c of ["P1", "P2"]) dichVu(d, c);
  dacDiem(d, "aX");
  dacDiem(d, "aY");
  giaTri(d, "x1", "aX");
  giaTri(d, "x2", "aX");
  giaTri(d, "y1", "aY");
  ganNhom(d, "P1", "HTA");
  ganNhom(d, "P2", "HTA");
  gan(d, { group: "HTA", attr: "aX", value: "x1" });
  gan(d, { group: "HTA", attr: "aY", value: "y1" });
  gan(d, { service: "P1", attr: "aX", value: "x2" });
  const rows = d.prepare("SELECT catalog_code, attribute_code, value_code, source FROM v_ctl_service_attribute WHERE catalog_code IN ('P1', 'P2') ORDER BY catalog_code, attribute_code").all();
  assert.deepEqual(rows.map((r) => Object.values(r as object)), [
    ["P1", "aX", "x2", "SERVICE"], ["P1", "aY", "y1", "GROUP"], ["P2", "aX", "x1", "GROUP"], ["P2", "aY", "y1", "GROUP"],
  ]);
  assert.deepEqual(d.prepare("SELECT attribute_code, code, active FROM v_ctl_attribute_value ORDER BY code").all().map((r) => Object.values(r as object)),
    [["aX", "x1", 1], ["aX", "x2", 1], ["aY", "y1", 1]]);
});
