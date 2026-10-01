// Kiểm migration MẪU CHẶNG THEO DỊCH VỤ `vc_leg_template` (ADR-0054 D10.1 — kế hoạch 2026-10-01-may-chu-o-moi-chang Task 6, TC-M1) + cột NƠI TRẢ MẶC ĐỊNH
// (ADR nháp đã duyệt docs/superpowers/specs/2026-10-01-de-xuat-adr-noi-tra-mac-dinh.md D1, NT-D1/NT-D2 — Task 7.2: bảng chưa lên `main` ⇒ cột vào CÙNG
// `CREATE TABLE`, `CHECK` bảng). Chèn/sửa THẲNG bằng SQL: chứng minh chặn nằm ở CSDL. Tệp tìm theo ĐUÔI tên (CHANGE-GUIDE công thức d).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_mau_chang.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const AT = "2026-10-01T03:00:00.000Z";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)

function db() {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files) d.exec(sqlOf(f));
  return d;
}
let n = 0;
const mau = (d: DatabaseSync, o: { code?: string; mode?: string; hint?: string | null; loc?: string | null; at?: string } = {}) =>
  d.prepare(
    `INSERT INTO vc_leg_template (id, code, mode, return_time_hint, default_dropoff_location_id, valid_from_at, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 's1', ?, 's1')`,
  ).run(`m-${++n}`, o.code ?? "TD101", o.mode ?? "ROUND_TRIP", o.hint === undefined ? "16:00" : o.hint, o.loc ?? null, o.at ?? `2026-10-01T03:00:${String(n).padStart(2, "0")}.000Z`, AT, AT);

test("migration mẫu chặng: đúng MỘT tệp `*_mau_chang.sql`, sau 0058; chỉ tạo bảng mới (không đụng bảng cũ)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${MATCHES.length}`);
  assert.ok(MATCHES[0]! > "0058", MATCHES[0]);
  assert.doesNotMatch(sqlOf(MATCHES[0]!), /ALTER TABLE|DROP /i);
});

test("TC-M1: hợp lệ → được; mode ngoài tập → RAISE; return_time_hint khi không phải hai chiều → RAISE; giờ sai khuôn → RAISE; trùng (code, valid_from_at) → UNIQUE", () => {
  const d = db();
  assert.doesNotThrow(() => mau(d));
  assert.doesNotThrow(() => mau(d, { mode: "ONE_WAY", hint: null }));
  assert.doesNotThrow(() => mau(d, { mode: "NONE", hint: null }));
  assert.throws(() => mau(d, { mode: "BOTH" }), /CHECK constraint failed/);
  assert.throws(() => mau(d, { mode: "ONE_WAY", hint: "16:00" }), /CHECK constraint failed/);
  assert.throws(() => mau(d, { mode: "NONE", hint: "16:00" }), /CHECK constraint failed/);
  assert.throws(() => mau(d, { hint: "4pm" }), /CHECK constraint failed/);
  assert.throws(() => mau(d, { hint: "25:00" }), /CHECK constraint failed/);
  mau(d, { code: "TD9", at: "2026-10-02T00:00:00.000Z" });
  assert.throws(() => mau(d, { code: "TD9", at: "2026-10-02T00:00:00.000Z" }), /UNIQUE constraint failed/);
});

test("TC-M1: chỉ-thêm — UPDATE / DELETE dòng mẫu → RAISE (đổi = thêm dòng)", () => {
  const d = db();
  mau(d);
  const id = `m-${n}`;
  assert.throws(() => d.prepare("UPDATE vc_leg_template SET mode = 'ONE_WAY', return_time_hint = NULL WHERE id = ?").run(id), /vc_leg_template_append_only/);
  assert.throws(() => d.prepare("DELETE FROM vc_leg_template WHERE id = ?").run(id), /vc_leg_template_append_only/);
});

test("NT-D1 / NT-D2 (nơi trả mặc định): có điểm mà mode NONE → RAISE (CHECK bảng); điểm không tồn tại → khoá ngoại; điểm có thật + có đưa đón → được", () => {
  const d = db();
  assert.doesNotThrow(() => mau(d, { loc: LOC }));
  assert.doesNotThrow(() => mau(d, { mode: "ONE_WAY", hint: null, loc: LOC }));
  assert.throws(() => mau(d, { mode: "NONE", hint: null, loc: LOC }), /CHECK constraint failed/);
  assert.throws(() => mau(d, { loc: "00000000-0000-4000-8000-000000000000" }), /FOREIGN KEY constraint failed/);
});
