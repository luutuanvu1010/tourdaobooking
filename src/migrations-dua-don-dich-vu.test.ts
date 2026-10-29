// Kiểm migration "đưa đón theo từng dịch vụ" (ADR-0149 Đ1; kế hoạch docs/superpowers/plans/2026-10-29-adr-0149-dua-don-theo-dich-vu-ke-hoach.md Task 1–2).
// Chạy trên SQLite thật (node:sqlite) với schema dựng từ migrations/*.sql. Chèn / sửa THẲNG bằng SQL: chứng minh chặn nằm ở CSDL. Tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { choPhepDuaDon } from "./modules/catalog/nhom-rules.ts";
import { QUY_TAC_DUA_DON, type QuyTacDuaDon } from "./shared/dua-don-dich-vu.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_dua_don_theo_dich_vu.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const AT = "2026-10-29T03:00:00.000Z";
const SAU = "2026-10-29T04:00:00.000Z";

function db() {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files) d.exec(sqlOf(f));
  return d;
}
const dichVu = (d: DatabaseSync, code: string) =>
  d.prepare(`INSERT INTO catalog_item (code, name, unit, price_adult, sheet_row, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', 100000, 1, 1, ?, ?)`).run(code, `Dịch vụ ${code}`, AT, AT);
let n = 0;
const gan = (d: DatabaseSync, code: string, nhom: string | null) =>
  d.prepare(`INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, 1, ?, ?, NULL, ?, NULL)`)
    .run(`g-${++n}`, code, nhom, AT, AT, AT);
const datQuyTac = (d: DatabaseSync, code: string, mode: string, id = `r-${++n}`) =>
  d.prepare(`INSERT INTO ctl_service_transfer_rule (id, service_code, mode, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, NULL, ?, NULL)`).run(id, code, mode, AT, AT, AT);
const dongQuyTac = (d: DatabaseSync, code: string) =>
  d.prepare(`UPDATE ctl_service_transfer_rule SET valid_to_at = ?, updated_at = ?, updated_by = NULL WHERE service_code = ? AND valid_to_at IS NULL`).run(SAU, SAU, code);
const cho = (d: DatabaseSync, code: string): number | undefined =>
  (d.prepare("SELECT transfer_enabled FROM v_ctl_service_transfer WHERE catalog_code = ?").get(code) as { transfer_enabled: number } | undefined)?.transfer_enabled;

test("migration đưa đón theo dịch vụ: đúng MỘT tệp `*_dua_don_theo_dich_vu.sql`, số ≥ 0127; không xoá dữ liệu, không sửa bảng cũ", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${MATCHES.length}`);
  assert.ok(MATCHES[0]! >= "0127", MATCHES[0]);
  const sql = sqlOf(MATCHES[0]!).replace(/--[^\n]*/g, "");
  assert.doesNotMatch(sql, /DELETE\s+FROM|ALTER\s+TABLE|DROP\s+TABLE|UPDATE\s+\w+\s+SET/i); // trigger «BEFORE DELETE ON» / «BEFORE UPDATE ON» không phải câu ghi
  assert.deepEqual([...sql.matchAll(/DROP\s+VIEW\s+(\w+)/gi)].map((m) => m[1]), ["v_ctl_service_transfer"], "chỉ dựng lại view công bố");
});

test("bảng quy tắc: chỉ nhận ALWAYS / NEVER; mã phải có trong danh mục; MỘT dòng mở mỗi dịch vụ; không xoá; chỉ được đóng dòng mở một lần", () => {
  const d = db();
  dichVu(d, "X1");
  assert.throws(() => datQuyTac(d, "X1", "GROUP"), /CHECK constraint failed/, "«Theo nhóm» không lưu thành giá trị");
  assert.throws(() => datQuyTac(d, "KHONG-CO", "NEVER"), /FOREIGN KEY constraint failed/);
  datQuyTac(d, "X1", "NEVER", "r-a");
  assert.throws(() => datQuyTac(d, "X1", "ALWAYS"), /UNIQUE constraint failed/, "hai dòng mở cùng mã");
  assert.throws(() => d.prepare("DELETE FROM ctl_service_transfer_rule WHERE id = 'r-a'").run(), /ctl_append_only/);
  assert.throws(() => d.prepare("UPDATE ctl_service_transfer_rule SET mode = 'ALWAYS' WHERE id = 'r-a'").run(), /ctl_append_only/);
  assert.throws(() => d.prepare("UPDATE ctl_service_transfer_rule SET valid_to_at = '2026-10-28T00:00:00.000Z' WHERE id = 'r-a'").run(), /CHECK constraint failed/, "đóng trước ngày mở");
  dongQuyTac(d, "X1");
  assert.throws(() => d.prepare("UPDATE ctl_service_transfer_rule SET valid_to_at = ? WHERE id = 'r-a'").run("2026-10-30T00:00:00.000Z"), /ctl_append_only/, "dòng đã đóng không sửa nữa");
  assert.doesNotThrow(() => datQuyTac(d, "X1", "ALWAYS"), "đóng dòng cũ rồi mới mở dòng mới");
});

test("view v_ctl_service_transfer: ô riêng của dịch vụ thắng cờ nhóm cả hai chiều; đóng ô → về theo nhóm; vẫn đúng MỘT dòng mỗi mã, chỉ khoá + cờ", () => {
  const d = db();
  for (const c of ["A", "B", "C", "D"]) dichVu(d, c);
  d.prepare("UPDATE ctl_group SET transfer_enabled = 0 WHERE code = 'TDA'").run();
  gan(d, "A", "HTA"); // nhóm bật
  gan(d, "B", "TDA"); // nhóm tắt
  gan(d, "C", null); // Chưa phân loại
  datQuyTac(d, "A", "NEVER");
  datQuyTac(d, "B", "ALWAYS");
  datQuyTac(d, "C", "NEVER");
  datQuyTac(d, "D", "NEVER"); // chưa từng gán nhóm
  assert.equal(cho(d, "A"), 0, "nhóm bật + Không đón → 0");
  assert.equal(cho(d, "B"), 1, "nhóm tắt + Luôn đón → 1");
  assert.equal(cho(d, "C"), 0);
  assert.equal(cho(d, "D"), 0);
  dongQuyTac(d, "A");
  dongQuyTac(d, "B");
  assert.equal(cho(d, "A"), 1, "về theo nhóm (bật)");
  assert.equal(cho(d, "B"), 0, "về theo nhóm (tắt)");
  datQuyTac(d, "A", "ALWAYS");
  for (const c of ["A", "B", "C", "D"]) assert.equal((d.prepare("SELECT COUNT(*) AS n FROM v_ctl_service_transfer WHERE catalog_code = ?").get(c) as { n: number }).n, 1, c);
  assert.deepEqual(Object.keys(d.prepare("SELECT * FROM v_ctl_service_transfer LIMIT 1").get() as object).sort(), ["catalog_code", "transfer_enabled"]);
});

test("form ↔ máy chủ một luật (tiêu chí 4): `choPhepDuaDon` cho cùng đáp án với view ở mọi tổ hợp nhóm (bật / tắt / ngưng dùng / Chưa phân loại) × ba lựa chọn", () => {
  const d = db();
  d.prepare("UPDATE ctl_group SET transfer_enabled = 0 WHERE code = 'TDA'").run();
  d.prepare("UPDATE ctl_group SET active = 0 WHERE code = 'BUS'").run();
  const nhomDs = (d.prepare("SELECT code, active, transfer_enabled FROM ctl_group").all() as { code: string; active: number; transfer_enabled: number }[])
    .map((g) => ({ code: g.code, active: g.active === 1, transferEnabled: g.transfer_enabled === 1 }));
  const quyTac = Object.keys(QUY_TAC_DUA_DON) as QuyTacDuaDon[];
  let i = 0;
  for (const nhom of ["HTA", "TDA", "BUS", null] as const) {
    for (const q of quyTac) {
      const code = `K${++i}`;
      dichVu(d, code);
      if (nhom === "BUS") {
        // nhóm ngưng dùng: trigger chặn gán vào nhóm tắt → gán trước rồi mới tắt (đường SQL thẳng như bài ADR-0118)
        d.prepare("UPDATE ctl_group SET active = 1 WHERE code = 'BUS'").run();
        gan(d, code, "BUS");
        d.prepare("UPDATE ctl_group SET active = 0 WHERE code = 'BUS'").run();
      } else gan(d, code, nhom);
      if (q !== "GROUP") datQuyTac(d, code, q);
      // form nhận groupCode SAU `nhomChoForm` (nhóm ngưng dùng → null)
      const groupForm = nhom === "BUS" ? null : nhom;
      assert.equal(cho(d, code) === 1, choPhepDuaDon(groupForm, nhomDs, q), `nhóm ${nhom} × ${q}`);
    }
  }
});

test("đua X → Y (người kiểm độc lập 29/10, LOW-2): người khác vừa đưa về Theo nhóm nên câu đóng hụt → câu mở cũng KHÔNG chạy (không lặng lẽ ghi đè); bình thường X → Y đổi đúng", async () => {
  const { doiQuyTacDuaDonStatements } = await import("./modules/catalog/nhom-repo.ts");
  const d = db();
  dichVu(d, "R1");
  // Giả D1: ghi lại câu + tham số, rồi chạy lần lượt trên cùng kết nối SQLite (như một `db.batch`, `changes()` thấy câu ngay trước).
  const gia = { prepare: (sql: string) => ({ bind: (...a: unknown[]) => ({ sql, a }) }) } as unknown as D1Database;
  const chay = (st: unknown[]) => st.map((x) => { const { sql, a } = x as { sql: string; a: unknown[] }; return Number(d.prepare(sql).run(...(a as never[])).changes); });
  datQuyTac(d, "R1", "NEVER");
  dongQuyTac(d, "R1"); // người khác vừa đưa về Theo nhóm
  const dua = doiQuyTacDuaDonStatements(gia, { serviceCode: "R1", cu: "NEVER", moi: "ALWAYS", staffId: "s", now: "2026-10-29T05:00:00.000Z" });
  assert.deepEqual(chay(dua.statements), [0, 0], "đóng hụt ⇒ mở hụt");
  assert.equal(cho(d, "R1"), 1, "vẫn Theo nhóm (Chưa phân loại → có đưa đón), không thành Luôn đón ngầm");
  assert.equal((d.prepare("SELECT COUNT(*) AS n FROM ctl_service_transfer_rule WHERE service_code = 'R1' AND valid_to_at IS NULL").get() as { n: number }).n, 0);
  datQuyTac(d, "R1", "NEVER");
  const thuong = doiQuyTacDuaDonStatements(gia, { serviceCode: "R1", cu: "NEVER", moi: "ALWAYS", staffId: "s", now: "2026-10-29T06:00:00.000Z" });
  assert.deepEqual(chay(thuong.statements), [1, 1]);
  assert.equal(cho(d, "R1"), 1);
  assert.equal((d.prepare("SELECT mode FROM ctl_service_transfer_rule WHERE service_code = 'R1' AND valid_to_at IS NULL").get() as { mode: string }).mode, "ALWAYS");
});
