// Đ1b (ADR-0210): đổi họ tên hồ sơ cá nhân đã xác minh ⇒ dòng «cần xác minh lại» cho HO_TEN, trong CÙNG lô, ở MỌI đường sửa tên: sửa hồ sơ (updatePartyStatements),
// đổi tên tài khoản (renameAccountStatements → renamePersonStatements), và câu SQL thô (trigger giữ luật ở CSDL nên đường nào thêm sau cũng lọt vào). Mọi giá trị là GIẢ.
// Phá thử: bỏ trigger pty_person_name_reverify khỏi migration 0168 → cả bốn ca đỏ (xem task-10-report).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, openDb } from "../../../tests/audit/harness.mjs";
import { renamePersonStatements, updatePartyStatements } from "./repository.ts";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tinhDauXacMinh, dkienTuView } from "../../shared/dau-xac-minh.ts";

const T0 = "2026-11-01T00:00:00.000Z";
const AT = "2026-11-14T02:00:00.000Z";

function ban(daXacMinh = true) {
  const sqlite = openDb();
  sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p', 'PERSON', 'Nguyễn Văn A', 1, '${T0}', '${T0}')`);
  sqlite.exec(`INSERT INTO pty_person (party_id, family_name, middle_name, given_name, created_at, updated_at) VALUES ('p', 'Nguyễn', 'Văn', 'A', '${T0}', '${T0}')`);
  if (daXacMinh) sqlite.exec(`INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, created_at, created_by, updated_at, updated_by)
    VALUES ('v1', 'p', 'ATTRIBUTE', NULL, 'HO_TEN', 'DA_XAC_MINH', '${T0}', 'ng', '${T0}', 'ng')`);
  return { sqlite, d1: fakeD1(sqlite) };
}
const dongHoTen = (s: ReturnType<typeof ban>["sqlite"]) =>
  s.prepare("SELECT outcome, created_by, created_at FROM pty_verification WHERE party_id = 'p' AND attribute_code = 'HO_TEN' ORDER BY created_at, rowid").all() as { outcome: string; created_by: string; created_at: string }[];

test("sửa hồ sơ (updatePartyStatements) đổi họ tên ⇒ thêm «cần xác minh lại» cho HO_TEN, người sửa ghi tên, dấu thành Cần lại", async () => {
  const b = ban();
  const kq = await b.d1.batch(updatePartyStatements(b.d1, "p", { kind: "PERSON", name: { family: "Nguyễn", middle: "Văn", given: "B" }, gender: null, birthDate: null, active: true, expectedUpdatedAt: T0 }, "u1", AT));
  assert.equal(kq[kq.length - 1]!.meta.changes, 1);
  assert.deepEqual(dongHoTen(b.sqlite).map((r) => [r.outcome, r.created_by]), [["DA_XAC_MINH", "ng"], ["CAN_XAC_MINH_LAI", "u1"]]);
  const dk = (b.sqlite.prepare("SELECT * FROM v_pty_verification_facts WHERE party_id = 'p'").all() as Record<string, unknown>[]).map(dkienTuView);
  assert.equal(tinhDauXacMinh(dk, "2026-11-15", true), "CAN_LAI", "HO_TEN đã từng đạt rồi bị sửa ⇒ Cần lại");
});

test("sửa hồ sơ mà mốc kỳ vọng cũ (409, không sửa gì) ⇒ KHÔNG đánh dấu", async () => {
  const b = ban();
  await b.d1.batch(updatePartyStatements(b.d1, "p", { kind: "PERSON", name: { family: "Nguyễn", middle: "Văn", given: "B" }, gender: null, birthDate: null, active: true, expectedUpdatedAt: "2000-01-01T00:00:00.000Z" }, "u1", AT));
  assert.equal(dongHoTen(b.sqlite).length, 1);
});

test("sửa hồ sơ mà tên giữ nguyên (chỉ đổi ô khác) ⇒ KHÔNG đánh dấu", async () => {
  const b = ban();
  await b.d1.batch(updatePartyStatements(b.d1, "p", { kind: "PERSON", name: { family: "Nguyễn", middle: "Văn", given: "A" }, gender: "NAM", birthDate: null, active: true, expectedUpdatedAt: T0 }, "u1", AT));
  assert.equal(dongHoTen(b.sqlite).length, 1);
});

test("đổi tên tài khoản (renameAccountStatements → renamePersonStatements) ⇒ đánh dấu, cả khi đứng sau câu chốt (onlyIfPrevApplied) đã thắng; câu chốt thua ⇒ không đánh dấu", async () => {
  const thang = ban();
  const lo = renamePersonStatements(thang.d1, "p", { family: "Trần", middle: "Thị", given: "C" }, "adm", AT, true);
  await thang.d1.batch([thang.d1.prepare("UPDATE pty_party SET updated_at = updated_at WHERE id = 'p'"), ...lo]);
  assert.deepEqual(dongHoTen(thang.sqlite).map((r) => [r.outcome, r.created_by]), [["DA_XAC_MINH", "ng"], ["CAN_XAC_MINH_LAI", "adm"]]);
  const thua = ban();
  const lo2 = renamePersonStatements(thua.d1, "p", { family: "Trần", middle: "Thị", given: "C" }, "adm", AT, true);
  await thua.d1.batch([thua.d1.prepare("UPDATE pty_party SET updated_at = updated_at WHERE id = 'khong-co'"), ...lo2]);
  assert.equal(dongHoTen(thua.sqlite).length, 1);
  assert.equal((thua.sqlite.prepare("SELECT given_name FROM pty_person WHERE party_id = 'p'").get() as { given_name: string }).given_name, "A", "câu chốt thua ⇒ tên không đổi");
});

test("đổi tên qua renamePersonStatements trực tiếp, hồ sơ chưa từng xác minh HO_TEN ⇒ không thêm dòng nào", async () => {
  const b = ban(false);
  await b.d1.batch(renamePersonStatements(b.d1, "p", { family: "Lê", middle: null, given: "D" }, "adm", AT));
  assert.equal(dongHoTen(b.sqlite).length, 0);
});

test("đã «cần xác minh lại» rồi thì đổi tên tiếp KHÔNG thêm dòng thứ hai; đạt lại rồi đổi tên thì thêm", async () => {
  const b = ban();
  await b.d1.batch(renamePersonStatements(b.d1, "p", { family: "Lê", middle: null, given: "D" }, "adm", AT));
  await b.d1.batch(renamePersonStatements(b.d1, "p", { family: "Lê", middle: null, given: "E" }, "adm", "2026-11-14T03:00:00.000Z"));
  assert.equal(dongHoTen(b.sqlite).length, 2);
  b.sqlite.exec(`INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, created_at, created_by, updated_at, updated_by)
    VALUES ('v2', 'p', 'ATTRIBUTE', NULL, 'HO_TEN', 'DA_XAC_MINH', '2026-11-14T04:00:00.000Z', 'ng', '2026-11-14T04:00:00.000Z', 'ng')`);
  await b.d1.batch(renamePersonStatements(b.d1, "p", { family: "Lê", middle: null, given: "F" }, "adm", "2026-11-14T05:00:00.000Z"));
  assert.equal(dongHoTen(b.sqlite).length, 4);
});

// Danh sách ĐẦY ĐỦ các đường đổi cột tên của pty_person (Đ1b «mọi đường»). Thêm đường mới ⇒ bài này đỏ, buộc người thêm nghĩ tới dấu xác minh (trigger đã phủ, nhưng phải biết).
const SRC = fileURLToPath(new URL("../../", import.meta.url));
function tep(dir: string, ra: string[] = []): string[] {
  for (const t of readdirSync(dir)) {
    const d = join(dir, t);
    if (statSync(d).isDirectory()) tep(d, ra);
    else if (/\.ts$/.test(t) && !/\.test\.ts$/.test(t)) ra.push(d);
  }
  return ra;
}
test("quét mã: chỉ ba câu UPDATE pty_person đụng cột tên, đều ở parties/repository.ts (sửa hồ sơ, đổi tên tài khoản, ẩn danh); module khác không ghi tên", () => {
  const hit: string[] = [];
  for (const f of tep(SRC)) {
    const src = readFileSync(f, "utf8");
    // không phân biệt hoa thường và khoảng trắng / xuống dòng giữa các từ; cắt tới dấu đóng chuỗi SQL kế tiếp
    for (const m of src.matchAll(/update\s+pty_person\s+set[\s\S]{0,600}?(?:`|")/gi)) if (/(family_name|middle_name|given_name)\s*=/i.test(m[0])) hit.push(f.slice(SRC.length));
  }
  assert.deepEqual(hit, ["modules/parties/repository.ts", "modules/parties/repository.ts", "modules/parties/repository.ts"]);
  const stf = readFileSync(join(SRC, "modules/staff/index.ts"), "utf8");
  assert.match(stf, /renameAccountStatements[\s\S]{0,400}renamePersonStatements\(/, "đổi tên tài khoản phải đi qua renamePersonStatements");
});
