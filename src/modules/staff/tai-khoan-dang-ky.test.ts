// Biến thể tạo tài khoản TẮT cho phiếu đăng ký đối tác (ADR-0207 Đ5–Đ7; đợt 1 Task 7): chạy CHÍNH các câu staff dựng (gói bằng esbuild như account-roles.test.ts)
// trên SQLite thật dựng từ migrations/*.sql, có trigger LC-1. Hồ sơ và vai do `parties` mở ở Task 8 — ở đây bài tự dựng hồ sơ + vai TRƯỚC câu của staff.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import * as esbuild from "esbuild";

const DIR = new URL("../../../migrations/", import.meta.url);
const AT = "2026-11-15T03:00:00.000Z";

type Module = typeof import("./index.ts");
const built = await esbuild.build({ entryPoints: [new URL("./index.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false });
const staff = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Module;

interface Stmt { sql: string; args: SupportedValueType[] }
function fakeD1(sqlite: DatabaseSync): D1Database {
  const bound = (sql: string, args: SupportedValueType[]) => ({
    sql, args,
    all: async () => ({ results: (sqlite.prepare(sql).all(...args) as object[]).map((r) => ({ ...r })) }),
    first: async () => { const row = sqlite.prepare(sql).get(...args); return row ? { ...row } : null; },
    run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...args).changes } }),
  });
  return {
    prepare: (sql: string) => ({ ...bound(sql, []), bind: (...args: SupportedValueType[]) => bound(sql, args) }),
    batch: async (stmts: Stmt[]) => {
      sqlite.exec("BEGIN");
      try {
        const out = stmts.map((s) => ({ meta: { changes: sqlite.prepare(s.sql).run(...s.args).changes } }));
        sqlite.exec("COMMIT");
        return out;
      } catch (e) { sqlite.exec("ROLLBACK"); throw e; }
    },
  } as unknown as D1Database;
}

function seed(role = "HOTEL_RECEPTION"): { sqlite: DatabaseSync; db: D1Database } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p-moi', 'PERSON', 'Người Mới', 1, ?, ?)").run(AT, AT);
  sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p-moi', 'Mới', ?, ?)").run(AT, AT);
  sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-moi', 'p-moi', ?, NULL, '2026-11-15', ?, ?)").run(role, AT, AT);
  return { sqlite, db: fakeD1(sqlite) };
}
const row = (sqlite: DatabaseSync, id: string) => sqlite.prepare("SELECT active, pin_hash, party_id, credentials_changed_at, mfa_grace_until FROM staff WHERE id = ?").get(id) as Record<string, unknown>;
const perms = (sqlite: DatabaseSync, id: string) =>
  (sqlite.prepare("SELECT permission_type_code AS c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY c").all(id) as { c: string }[]).map((r) => r.c);

test("createAccountOnPartyStatements: tài khoản TẮT trên hồ sơ có sẵn, quyền đúng vai, PIN ngẫu nhiên không ai biết, không sinh hồ sơ/vai", async () => {
  const { sqlite, db } = seed();
  const partiesBefore = Number((sqlite.prepare("SELECT count(*) AS n FROM pty_party").get() as { n: number }).n);
  const rolesBefore = Number((sqlite.prepare("SELECT count(*) AS n FROM pty_party_role").get() as { n: number }).n);
  const made = await staff.createAccountOnPartyStatements(db, { partyId: "p-moi", phone: "0933333333", roles: ["HOTEL_RECEPTION"] }, "s-hr", AT);
  assert.equal("pin" in made, false, "không trả PIN ra ngoài");
  assert.deepEqual(made.permissions, ["PARTNER"]);
  // Câu chưa chạy: chưa có dòng nào trước khi gọi batch.
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM staff WHERE id = ?").get(made.id) !== undefined && Number((sqlite.prepare("SELECT count(*) AS n FROM staff WHERE id = ?").get(made.id) as { n: number }).n), 0);
  await db.batch(made.statements as never);
  const r = row(sqlite, made.id);
  assert.equal(r.active, 0);
  assert.equal(r.party_id, "p-moi");
  assert.match(String(r.pin_hash), /^pbkdf2\$sha256\$/, "PIN ngẫu nhiên đã băm — không thể đăng nhập bằng PIN nào đoán được");
  assert.equal(r.mfa_grace_until, null, "chỉ quyền bên ngoài ⇒ không ân hạn lớp hai");
  assert.deepEqual(perms(sqlite, made.id), ["PARTNER"]);
  assert.equal(Number((sqlite.prepare("SELECT count(*) AS n FROM pty_party").get() as { n: number }).n), partiesBefore);
  assert.equal(Number((sqlite.prepare("SELECT count(*) AS n FROM pty_party_role").get() as { n: number }).n), rolesBefore);
  assert.equal(Number((sqlite.prepare("SELECT count(*) AS n FROM stf_permission_adjustment WHERE staff_id = ?").get(made.id) as { n: number }).n), 0, "không chỉnh tay");
});

test("createAccountOnPartyStatements: đăng nhập PIN với tài khoản tắt → authenticate trả null (401 ở route)", async () => {
  const { db } = seed();
  const made = await staff.createAccountOnPartyStatements(db, { partyId: "p-moi", phone: "0933333333", roles: ["HOTEL_RECEPTION"] }, "s-hr", AT);
  await db.batch(made.statements as never);
  for (const pin of ["000000", "123456", "654321"]) assert.equal(await staff.authenticate(db, "0933333333", pin), null);
});

test("datPinKichHoatStatements: đặt PIN, bật tài khoản, đẩy credentials_changed_at; chỉ tác động tài khoản đang TẮT", async () => {
  const { sqlite, db } = seed();
  const made = await staff.createAccountOnPartyStatements(db, { partyId: "p-moi", phone: "0933333333", roles: ["HOTEL_RECEPTION"] }, "s-hr", AT);
  await db.batch(made.statements as never);
  const hash = await staff.hashPin("481516");
  await db.batch(staff.datPinKichHoatStatements(db, made.id, hash, 1234) as never);
  const r = row(sqlite, made.id);
  assert.equal(r.active, 1);
  assert.equal(r.pin_hash, hash);
  assert.equal(r.credentials_changed_at, 1234);
  assert.ok(await staff.authenticate(db, "0933333333", "481516"));
  // Tài khoản đã bật: lệnh lặp KHÔNG ghi đè PIN.
  await db.batch(staff.datPinKichHoatStatements(db, made.id, await staff.hashPin("999111"), 5678) as never);
  assert.equal(row(sqlite, made.id).pin_hash, hash);
  assert.equal(row(sqlite, made.id).credentials_changed_at, 1234);
});

test("createAccountOnPartyStatements: vai nội bộ bị từ chối (không ghi ân hạn lớp hai); hai lần gọi cho id khác nhau", async () => {
  const { db } = seed();
  await assert.rejects(staff.createAccountOnPartyStatements(db, { partyId: "p-moi", phone: "0933333333", roles: ["SALES_STAFF"] }, "s-hr", AT), /vai trò bên ngoài/);
  const a = await staff.createAccountOnPartyStatements(db, { partyId: "p-moi", phone: "0933333333", roles: ["HOTEL_RECEPTION"] }, "s-hr", AT);
  const b = await staff.createAccountOnPartyStatements(db, { partyId: "p-moi", phone: "0944444444", roles: ["HOTEL_RECEPTION"] }, "s-hr", AT);
  assert.notEqual(a.id, b.id);
});

test("createAccountOnPartyStatements: vai rỗng hoặc không mang quyền nào → ném lỗi, không dựng câu nào", async () => {
  const { db } = seed();
  await assert.rejects(staff.createAccountOnPartyStatements(db, { partyId: "p-moi", phone: "0933333333", roles: [] }, "s-hr", AT), /không mang quyền/);
});
