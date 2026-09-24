// Hai nguồn phải khớp nhau (ADR-0018 điều 2): danh mục vai trong mã (src/shared/roles.ts) ↔ pty_role_type; nhãn quyền (PERMISSION_LABEL) ↔
// stf_permission_type. Dựng schema THẬT từ migrations/*.sql bằng node:sqlite. Đỏ = ai đó sửa một bên mà quên bên kia.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { PERMISSION_CODES, PERMISSION_LABEL } from "./shared/permissions.ts";
import { ROLES, ROLE_CODES } from "./shared/roles.ts";

const DIR = new URL("../migrations/", import.meta.url);
const db = new DatabaseSync(":memory:");
for (const f of readdirSync(DIR).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));

test("mỗi vai trong roles.ts có dòng pty_role_type cùng tên, cùng nhóm, đang dùng", () => {
  for (const code of ROLE_CODES) {
    const row = db.prepare("SELECT name, role_group, active FROM pty_role_type WHERE code = ?").get(code) as { name: string; role_group: string; active: number } | undefined;
    assert.ok(row, `thiếu ${code} trong pty_role_type`);
    assert.equal(row.name, ROLES[code].name, `${code}: tên`);
    assert.equal(row.role_group, ROLES[code].group, `${code}: nhóm`);
    assert.equal(row.active, 1, `${code}: phải đang dùng`);
  }
  const grouped = (db.prepare("SELECT code FROM pty_role_type WHERE role_group IN ('INTERNAL', 'EXTERNAL')").all() as { code: string }[]).map((r) => r.code);
  assert.deepEqual(grouped.sort(), [...ROLE_CODES].sort(), "không có vai nội bộ/bên ngoài nào ngoài roles.ts");
});

test("mỗi mã quyền có dòng stf_permission_type với đúng nhãn hiển thị", () => {
  for (const code of PERMISSION_CODES) {
    const row = db.prepare("SELECT name FROM stf_permission_type WHERE code = ?").get(code) as { name: string } | undefined;
    assert.equal(row?.name, PERMISSION_LABEL[code], code);
  }
});
