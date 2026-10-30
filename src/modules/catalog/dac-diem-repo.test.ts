// Câu ghi của `dac-diem-repo.ts` (ADR-0152 Đ1, tiêu chí 4, 6; kế hoạch 2026-10-30 T2) chạy trên SQLite thật dựng từ migrations/*.sql, qua một D1 giả ghi lại câu + tham số
// rồi chạy lần lượt trên cùng kết nối (như một `db.batch`: `changes()` thấy câu ngay trước). Đường route thật (409 `stale`, nhật ký) ở T7.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { doiGiaTriStatements, suaGiaTri, themDacDiemStatements } from "./dac-diem-repo.ts";

const DIR = new URL("../../../migrations/", import.meta.url);
const AT = "2026-10-30T03:00:00.000Z";
function db() {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".sql")).sort()) d.exec(readFileSync(new URL(f, DIR), "utf8"));
  d.prepare(`INSERT INTO catalog_item (code, name, unit, price_adult, sheet_row, in_sheet, first_seen_at, updated_at) VALUES ('D1', 'Dịch vụ D1', 'perPax', 1, 1, 1, ?, ?)`).run(AT, AT);
  return d;
}
const gia = { prepare: (sql: string) => ({ bind: (...a: unknown[]) => ({ sql, a }) }) } as unknown as D1Database;
const chay = (d: DatabaseSync, st: unknown[]) => st.map((x) => { const { sql, a } = x as { sql: string; a: unknown[] }; return Number(d.prepare(sql).run(...(a as never[])).changes); });
const mo = (d: DatabaseSync) => d.prepare("SELECT service_code, group_code, value_code FROM ctl_attribute_assignment WHERE valid_to_at IS NULL ORDER BY id").all().map((r) => Object.values(r as object));

function gieo(d: DatabaseSync) {
  chay(d, themDacDiemStatements(gia, { code: "aX", name: "Đặc điểm X", sortOrder: 1, values: [{ code: "x1", name: "Một", sortOrder: 1 }, { code: "x2", name: "Hai", sortOrder: 2 }], staffId: "s", now: AT }));
}
const dich = { loai: "SERVICE" as const, code: "D1" };

test("tiêu chí 4 (lớp câu): hai lệnh cùng đặt giá trị cho cùng dịch vụ từ cùng giá trị đang thấy — một lệnh đổi, lệnh kia không đổi dòng nào (→ 409 stale); đúng một dòng mở", () => {
  const d = db();
  gieo(d);
  const a = doiGiaTriStatements(gia, { dich, attributeCode: "aX", cu: null, moi: "x1", staffId: "s", now: "2026-10-30T04:00:00.000Z" });
  const b = doiGiaTriStatements(gia, { dich, attributeCode: "aX", cu: null, moi: "x2", staffId: "s", now: "2026-10-30T04:00:01.000Z" });
  assert.deepEqual(chay(d, a.statements), [1]);
  assert.deepEqual(chay(d, b.statements), [0], "lệnh sau thấy dòng mở → không chèn (không lỗi UNIQUE)");
  assert.deepEqual(mo(d), [["D1", null, "x1"]]);
  // x1 → x2 hai lệnh đua: lệnh sau đóng hụt ⇒ mở cũng hụt.
  const c = doiGiaTriStatements(gia, { dich, attributeCode: "aX", cu: "x1", moi: "x2", staffId: "s", now: "2026-10-30T05:00:00.000Z" });
  const e = doiGiaTriStatements(gia, { dich, attributeCode: "aX", cu: "x1", moi: null, staffId: "s", now: "2026-10-30T05:00:01.000Z" });
  assert.deepEqual(chay(d, c.statements), [1, 1]);
  assert.equal(c.chot, 1);
  assert.deepEqual(chay(d, e.statements), [0], "bỏ giá trị x1 khi người khác vừa đổi sang x2 → không đổi");
  assert.deepEqual(mo(d), [["D1", null, "x2"]]);
  const f = doiGiaTriStatements(gia, { dich, attributeCode: "aX", cu: "x1", moi: "x1", staffId: "s", now: "2026-10-30T05:00:02.000Z" });
  assert.deepEqual(chay(d, f.statements), [0, 0], "đang thấy x1 nhưng thật ra là x2: đóng hụt ⇒ mở hụt");
  // Theo nhóm.
  const g = doiGiaTriStatements(gia, { dich: { loai: "GROUP", code: "HTA" }, attributeCode: "aX", cu: null, moi: "x1", staffId: "s", now: "2026-10-30T06:00:00.000Z" });
  assert.deepEqual(chay(d, g.statements), [1]);
  assert.deepEqual(mo(d).length, 2);
});

test("tiêu chí 6 (lớp câu): tắt giá trị còn dòng mở → câu không đổi dòng nào (route trả 409 attribute_in_use); đóng rồi tắt → đổi; khoá lạc quan theo updated_at", () => {
  const d = db();
  gieo(d);
  chay(d, doiGiaTriStatements(gia, { dich, attributeCode: "aX", cu: null, moi: "x1", staffId: "s", now: "2026-10-30T04:00:00.000Z" }).statements);
  const tat = (updatedAtCu: string) => chay(d, [suaGiaTri(gia, { code: "x1", name: "Một", sortOrder: 1, active: false, staffId: "s", now: "2026-10-30T07:00:00.000Z", updatedAtCu })]);
  assert.deepEqual(tat(AT), [0], "còn dòng mở");
  chay(d, doiGiaTriStatements(gia, { dich, attributeCode: "aX", cu: "x1", moi: null, staffId: "s", now: "2026-10-30T05:00:00.000Z" }).statements);
  assert.deepEqual(tat("2026-01-01T00:00:00.000Z"), [0], "updated_at cũ sai → người khác vừa sửa");
  assert.deepEqual(tat(AT), [1]);
});
