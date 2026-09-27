// Hàm vai cho tài khoản của module parties (ADR-0018 điều 3) — chạy SQL THẬT (defineSql của repository.ts) trên schema dựng từ migrations/*.sql.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import { accountRolesOf, openRoleCodesFor, reopenRoleStatement, roleRowOf, roleTypeGroup } from "./repository.ts";

const DIR = new URL("../../../migrations/", import.meta.url);
const AT = "2026-09-24T03:00:00.000Z";

/** D1 giả tối thiểu trên node:sqlite: prepare().bind() → all/first/run; câu chưa chạy mang sql + args để chạy tay. */
function fakeD1(sqlite: DatabaseSync): D1Database {
  const bound = (sql: string, args: SupportedValueType[]) => ({
    sql,
    args,
    all: async () => ({ results: (sqlite.prepare(sql).all(...args) as object[]).map((r) => ({ ...r })) }),
    first: async () => {
      const row = sqlite.prepare(sql).get(...args);
      return row ? { ...row } : null;
    },
    run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...args).changes } }),
  });
  return { prepare: (sql: string) => ({ bind: (...args: SupportedValueType[]) => bound(sql, args) }) } as unknown as D1Database;
}

function seed(): { sqlite: DatabaseSync; db: D1Database } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  for (const p of ["p-a", "p-b"]) {
    sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(p, p, AT, AT);
    sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(p, p, AT, AT);
  }
  const role = (id: string, party: string, code: string, from: string, to: string | null) =>
    sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?)")
      .run(id, party, code, from, to, AT, AT);
  role("r-staff", "p-a", "STAFF", "2026-09-01", "2026-09-22"); // đóng từ trước hôm nay → không trả
  role("r-sales", "p-a", "SALES_STAFF", "2026-09-24", "2026-09-24"); // đóng TRONG hôm nay → trả (để mở lại)
  role("r-acc", "p-a", "ACCOUNTANT", "2026-09-10", null); // đang mở → trả
  role("r-cus", "p-b", "CUSTOMER", "2026-09-10", null);
  return { sqlite, db: fakeD1(sqlite) };
}

test("accountRolesOf: vai không gắn nơi, đang mở hoặc đóng từ hôm nay", async () => {
  const { db } = seed();
  const rows = await accountRolesOf(db, "p-a", "2026-09-24");
  assert.deepEqual(rows.map((r) => [r.id, r.valid_to_date]), [["r-acc", null], ["r-sales", "2026-09-24"]]);
});

test("openRoleCodesFor: vai đang mở, gộp theo hồ sơ, một truy vấn", async () => {
  const { sqlite, db } = seed();
  // Ruling R1: vai gắn MỘT NƠI cụ thể (location_id NOT NULL) không phải vai của TÀI KHOẢN — openRoleCodesFor phải lọc
  // location_id IS NULL giống accountRolesOf, để danh sách tài khoản sau này khớp đúng các vai module staff coi là vai tài khoản.
  sqlite
    .prepare("INSERT INTO loc_location (id, code, name, location_type_code, created_at, updated_at) VALUES (?, ?, ?, 'OFFICE', ?, ?)")
    .run("loc-r1", "VP_THU_R1", "Văn phòng thử R1", AT, AT);
  sqlite
    .prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)")
    .run("r-loc", "p-a", "GUIDE", "loc-r1", "2026-09-01", AT, AT);
  const map = await openRoleCodesFor(db, ["p-a", "p-b", "p-khong-co"]);
  assert.deepEqual(map.get("p-a"), ["ACCOUNTANT"], "vai GUIDE gắn nơi không được gộp vào vai tài khoản (Ruling R1: lọc location_id IS NULL)");
  assert.deepEqual(map.get("p-b"), ["CUSTOMER"]);
  assert.equal(map.has("p-khong-co"), false);
  assert.equal((await openRoleCodesFor(db, [])).size, 0);
});

test("roleTypeGroup / roleRowOf: đọc nhóm của loại vai; nhóm + mã của một dòng vai", async () => {
  const { db } = seed();
  assert.equal(await roleTypeGroup(db, "SALES_STAFF"), "INTERNAL");
  assert.equal(await roleTypeGroup(db, "COLLABORATOR"), "EXTERNAL");
  assert.equal(await roleTypeGroup(db, "CUSTOMER"), "OTHER");
  assert.equal(await roleTypeGroup(db, "KHONG_CO"), null);
  assert.deepEqual(await roleRowOf(db, "p-a", "r-acc"), { group: "INTERNAL", code: "ACCOUNTANT" });
  assert.equal(await roleRowOf(db, "p-b", "r-acc"), null, "dòng của hồ sơ khác");
});

test("reopenRoleStatement: mở lại dòng đã đóng (valid_to_date → NULL), không chèn dòng chồng lấn", async () => {
  const { sqlite, db } = seed();
  const stmt = reopenRoleStatement(db, "p-a", "r-sales", "s-admin", AT) as unknown as { sql: string; args: SupportedValueType[] };
  assert.equal(sqlite.prepare(stmt.sql).run(...stmt.args).changes, 1);
  const row = sqlite.prepare("SELECT valid_to_date, updated_by FROM pty_party_role WHERE id = 'r-sales'").get() as { valid_to_date: string | null; updated_by: string };
  assert.deepEqual({ ...row }, { valid_to_date: null, updated_by: "s-admin" });
});
