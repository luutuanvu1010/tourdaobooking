// Kiểm migration "đưa đón theo nhóm và điểm chọn nhanh" (ADR-0118 Đ1, Đ2, Đ4; kế hoạch docs/superpowers/plans/2026-10-14-dot-2-luot-1-ke-hoach.md Task 1, N-1…N-3).
// Chạy trên SQLite thật (node:sqlite) với schema dựng từ migrations/*.sql. Chèn / sửa THẲNG bằng SQL: chứng minh chặn nằm ở CSDL. Tệp tìm theo ĐUÔI tên
// (CHANGE-GUIDE công thức d) — số migration do người thi công chốt lúc thi công (không dùng 0096–0097: đã giữ cho ADR-0117 lần 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_dua_don_theo_nhom_va_diem_nhanh.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const AT = "2026-10-14T03:00:00.000Z";

function db(truocMigration?: string) {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files) if (truocMigration === undefined || f < truocMigration) d.exec(sqlOf(f));
  return d;
}
const dichVu = (d: DatabaseSync, code: string) =>
  d.prepare(
    `INSERT INTO catalog_item (code, name, unit, price_adult, sheet_row, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', 100000, 1, 1, ?, ?)`,
  ).run(code, `Dịch vụ ${code}`, AT, AT);
let seq = 0;
/** Gán nhóm bằng một dòng lịch sử mới (seq của từng dịch vụ tăng dần); `null` = Chưa phân loại. */
const gan = (d: DatabaseSync, code: string, nhom: string | null, seqRieng: number) =>
  d.prepare(
    `INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL)`,
  ).run(`g-${++seq}`, code, nhom, seqRieng, AT, AT, AT);
const cho = (d: DatabaseSync, code: string): number | undefined =>
  (d.prepare("SELECT transfer_enabled FROM v_ctl_service_transfer WHERE catalog_code = ?").get(code) as { transfer_enabled: number } | undefined)?.transfer_enabled;
const tatDuaDon = (d: DatabaseSync, nhom: string) => d.prepare("UPDATE ctl_group SET transfer_enabled = 0 WHERE code = ?").run(nhom);

test("migration đưa đón theo nhóm: đúng MỘT tệp `*_dua_don_theo_nhom_va_diem_nhanh.sql`, số ≥ 0121 (đổi từ số tạm 0098 khi dựng lại trên main 28/10 — đứng SAU 0119 vì đọc cùng CSDL với bước xác nhận); chỉ THÊM (không DROP, không xoá, không sửa dữ liệu ngoài hai điểm gieo)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${MATCHES.length}`);
  assert.ok(MATCHES[0]! >= "0121", MATCHES[0]);
  const sql = sqlOf(MATCHES[0]!).replace(/--[^\n]*/g, ""); // bỏ chú thích (chú thích có nói tới cách hoàn tác bằng DROP VIEW)
  assert.doesNotMatch(sql, /DROP |DELETE /i);
  const capNhat = [...sql.matchAll(/^\s*UPDATE\s+(\w+)/gim)].map((m) => m[1]);
  assert.deepEqual([...new Set(capNhat)], ["loc_location"], "chỉ UPDATE loc_location (gieo hai điểm chọn nhanh)");
});

test("N-1: ctl_group.transfer_enabled mặc định 1 cho cả 14 nhóm gieo; 2 / NULL bị CHẶN ở CSDL; 0 và 1 ghi được", () => {
  const d = db();
  const r = d.prepare("SELECT code, transfer_enabled FROM ctl_group").all() as { code: string; transfer_enabled: number }[];
  assert.equal(r.length, 14);
  assert.ok(r.every((x) => x.transfer_enabled === 1), "mọi nhóm gieo mặc định BẬT đưa đón");
  assert.throws(() => d.prepare("UPDATE ctl_group SET transfer_enabled = 2 WHERE code = 'TDA'").run(), /CHECK constraint failed/);
  assert.throws(() => d.prepare("UPDATE ctl_group SET transfer_enabled = NULL WHERE code = 'TDA'").run(), /NOT NULL constraint failed/);
  assert.doesNotThrow(() => tatDuaDon(d, "TDA"));
  assert.equal((d.prepare("SELECT transfer_enabled FROM ctl_group WHERE code = 'TDA'").get() as { transfer_enabled: number }).transfer_enabled, 0);
  assert.doesNotThrow(() => d.prepare("UPDATE ctl_group SET transfer_enabled = 1 WHERE code = 'TDA'").run());
  // Nhóm MỚI (không nói tới cột) cũng mặc định bật.
  d.prepare("INSERT INTO ctl_group (code, name, sort_order, active, created_at, updated_at) VALUES ('gmoi', 'Nhóm mới', 99, 1, ?, ?)").run(AT, AT);
  assert.equal((d.prepare("SELECT transfer_enabled FROM ctl_group WHERE code = 'gmoi'").get() as { transfer_enabled: number }).transfer_enabled, 1);
});

test("N-2: view v_ctl_service_transfer — nhóm tắt → 0; nhóm bật → 1; Chưa phân loại → 1; chưa từng gán → 1; mã không có trong danh mục → không dòng", () => {
  const d = db();
  for (const c of ["X-TAT", "X-BAT", "X-CHUA", "X-CHUAGAN"]) dichVu(d, c);
  tatDuaDon(d, "TDA");
  gan(d, "X-TAT", "TDA", 1);
  gan(d, "X-BAT", "HTA", 1);
  gan(d, "X-CHUA", null, 1);
  assert.equal(cho(d, "X-TAT"), 0);
  assert.equal(cho(d, "X-BAT"), 1);
  assert.equal(cho(d, "X-CHUA"), 1, "Chưa phân loại luôn cho đưa đón");
  assert.equal(cho(d, "X-CHUAGAN"), 1, "chưa từng gán (không dòng ctl_service_group) vẫn cho đưa đón");
  assert.equal(cho(d, "KHONG-CO"), undefined);
  const cot = (d.prepare("SELECT * FROM v_ctl_service_transfer LIMIT 1").get() as object);
  assert.deepEqual(Object.keys(cot).sort(), ["catalog_code", "transfer_enabled"], "view chỉ mang khoá + cờ (ADR-0118 Đ2)");
});

test("N-2: nhóm hiện hành đổi giữa chừng (dòng seq lớn nhất) thì view đổi theo — chuyển sang nhóm bật → 1, về nhóm tắt → 0, về Chưa phân loại → 1", () => {
  const d = db();
  dichVu(d, "X-DOI");
  tatDuaDon(d, "TDA");
  gan(d, "X-DOI", "TDA", 1);
  assert.equal(cho(d, "X-DOI"), 0);
  gan(d, "X-DOI", "HTA", 2);
  assert.equal(cho(d, "X-DOI"), 1, "đã chuyển sang nhóm bật");
  gan(d, "X-DOI", "TDA", 3);
  assert.equal(cho(d, "X-DOI"), 0, "lại về nhóm tắt");
  gan(d, "X-DOI", null, 4);
  assert.equal(cho(d, "X-DOI"), 1, "về Chưa phân loại");
  assert.equal(d.prepare("SELECT COUNT(*) AS n FROM v_ctl_service_transfer WHERE catalog_code = 'X-DOI'").get()!.n, 1, "mỗi mã đúng MỘT dòng (không nhân dòng theo lịch sử gán)");
});

test("N-2 (nhóm đang TẮT dùng): cờ đưa đón của nhóm đã ngưng không còn nghĩa — cùng luật với `nhomChoForm` (dịch vụ của nhóm tắt coi như Chưa phân loại → 1)", () => {
  const d = db();
  dichVu(d, "X-NGUNG");
  gan(d, "X-NGUNG", "TDA", 1);
  tatDuaDon(d, "TDA");
  assert.equal(cho(d, "X-NGUNG"), 0, "nhóm còn dùng + tắt đưa đón → 0");
  d.prepare("UPDATE ctl_group SET active = 0 WHERE code = 'TDA'").run(); // đường route chặn khi còn dịch vụ; SQL thẳng vẫn làm được → view phải có đáp án rõ ràng
  assert.equal(cho(d, "X-NGUNG"), 1, "nhóm ngưng dùng → dịch vụ coi như Chưa phân loại → cho đưa đón");
});

test("N-3: loc_location.quick_pick_order — NULL mặc định; 0, 100, 1.5, chữ bị CHẶN; 1 và 99 ghi được; xoá về NULL được", () => {
  const d = db();
  const cap = (v: unknown) => d.prepare("UPDATE loc_location SET quick_pick_order = ? WHERE code = 'QUAY_VE_01'").run(v as never);
  assert.equal((d.prepare("SELECT quick_pick_order AS q FROM loc_location WHERE code = 'QUAY_VE_01'").get() as { q: number | null }).q, null);
  assert.throws(() => cap(0), /CHECK constraint failed/);
  assert.throws(() => cap(100), /CHECK constraint failed/);
  assert.doesNotThrow(() => cap(1));
  assert.doesNotThrow(() => cap(99));
  assert.doesNotThrow(() => cap(null));
  // Điểm mới (không nói tới cột) cũng NULL.
  d.prepare("INSERT INTO loc_location (id, code, name, location_type_code, sort_order, created_at, updated_at) VALUES ('l-moi', 'DIEM_MOI', 'Điểm mới', 'PIER', 20, ?, ?)").run(AT, AT);
  assert.equal((d.prepare("SELECT quick_pick_order AS q FROM loc_location WHERE code = 'DIEM_MOI'").get() as { q: number | null }).q, null);
});

test("N-3: gieo — Bến cảng Vinpearl = 1, Bến tàu du lịch Nha Trang = 2, mọi địa điểm khác NULL", () => {
  const d = db();
  const r = d.prepare("SELECT code, quick_pick_order AS q FROM loc_location WHERE quick_pick_order IS NOT NULL ORDER BY q").all() as { code: string; q: number }[];
  assert.deepEqual(r.map((x) => [x.code, x.q]), [["CANG_VINPEARL", 1], ["BEN_TAU_NHA_TRANG", 2]]);
});

test("N-3: chạy migration trên CSDL THIẾU hai mã (chủ đã xoá / đổi mã) không lỗi và không gieo gì (UPDATE … WHERE code IN chạm 0 dòng)", () => {
  const ten = MATCHES[0]!;
  const d = db(ten); // mọi migration TRƯỚC tệp này
  d.exec("DELETE FROM loc_location WHERE code IN ('CANG_VINPEARL', 'BEN_TAU_NHA_TRANG')");
  assert.doesNotThrow(() => d.exec(sqlOf(ten)));
  assert.equal((d.prepare("SELECT COUNT(*) AS n FROM loc_location WHERE quick_pick_order IS NOT NULL").get() as { n: number }).n, 0);
  assert.equal((d.prepare("SELECT COUNT(*) AS n FROM ctl_group WHERE transfer_enabled = 1").get() as { n: number }).n, 14);
});
