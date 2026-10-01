// Máy nhận thông báo màn hình khoá gắn với phiên đăng nhập (ADR-0075 điều 6b) — SQL chạy trên SQLite THẬT dựng từ migrations/*.sql:
// (1) đăng nhập tài khoản một máy tắt MỌI đăng ký của tài khoản trừ đăng ký mang đúng phiên mới (kể cả đăng ký cũ session_id NULL — Review Focus 3);
// (2) đăng ký máy ghi session_id; đăng ký lại cùng máy (cùng người) bằng phiên mới cập nhật session_id; máy đã bị tắt đăng ký lại → dòng mới.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { batMayStatements, tatMayCuaCacPhienStatement, tatMayCuaPhienStatement, tatMayTruPhienStatement } from "./repository.ts";

const DIR = new URL("../../../migrations/", import.meta.url);

function fakeD1(sqlite: DatabaseSync): D1Database {
  const stmt = (sql: string, args: SupportedValueType[] = []) => ({
    sql, args,
    bind: (...a: SupportedValueType[]) => stmt(sql, a),
    run: async () => ({ results: [], meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
  });
  return {
    prepare: (sql: string) => stmt(sql),
    batch: async (stmts: { sql: string; args: SupportedValueType[] }[]) => {
      sqlite.exec("BEGIN");
      try {
        const out = stmts.map((s) => ({ results: [], meta: { changes: Number(sqlite.prepare(s.sql).run(...s.args).changes) } }));
        sqlite.exec("COMMIT");
        return out;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  } as unknown as D1Database;
}

function setup(): { sqlite: DatabaseSync; db: D1Database } {
  const sqlite = new DatabaseSync(":memory:");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  return { sqlite, db: fakeD1(sqlite) };
}
const T0 = "2026-10-01T00:00:00.000Z";
const T1 = "2026-10-01T01:00:00.000Z";
const T2 = "2026-10-01T02:00:00.000Z";
const ep = (n: string) => `https://fcm.googleapis.com/fcm/send/${n}`;
function chen(sqlite: DatabaseSync, id: string, staffId: string, endpoint: string, sessionId: string | null): void {
  sqlite.prepare("INSERT INTO ntf_push_sub (id, staff_id, endpoint, thiet_bi, created_at, updated_at, session_id) VALUES (?, ?, ?, 'iPhone', ?, ?, ?)")
    .run(id, staffId, endpoint, T0, T0, sessionId);
}
const dong = (sqlite: DatabaseSync, sql: string, ...a: SupportedValueType[]) => sqlite.prepare(sql).all(...a).map((r) => ({ ...r }));

test("TAT_MAY_TRU_PHIEN: 3 đăng ký cùng tài khoản (phiên NULL, A, B) — tắt trừ B → chỉ B còn; lý do bi-thay, updated_by NULL; tài khoản khác không đụng", async () => {
  const { sqlite, db } = setup();
  chen(sqlite, "n", "s1", ep("n"), null);
  chen(sqlite, "a", "s1", ep("a"), "A");
  chen(sqlite, "b", "s1", ep("b"), "B");
  chen(sqlite, "x", "s2", ep("x"), null);
  const r = await tatMayTruPhienStatement(db, "s1", "B", T1).run();
  assert.equal(r.meta.changes, 2);
  assert.deepEqual(dong(sqlite, "SELECT id, revoked_at, revoke_reason, updated_at, updated_by FROM ntf_push_sub ORDER BY id"), [
    { id: "a", revoked_at: T1, revoke_reason: "bi-thay", updated_at: T1, updated_by: null },
    { id: "b", revoked_at: null, revoke_reason: null, updated_at: T0, updated_by: null },
    { id: "n", revoked_at: T1, revoke_reason: "bi-thay", updated_at: T1, updated_by: null },
    { id: "x", revoked_at: null, revoke_reason: null, updated_at: T0, updated_by: null },
  ]);
});

test("TAT_MAY_TRU_PHIEN: không ghi đè dòng đã tắt trước đó (giữ lý do cũ); giuPhien null → tắt mọi đăng ký của tài khoản", async () => {
  const { sqlite, db } = setup();
  chen(sqlite, "a", "s1", ep("a"), "A");
  sqlite.exec(`UPDATE ntf_push_sub SET revoked_at = '${T0}', revoke_reason = 'tu-tat' WHERE id = 'a'`);
  chen(sqlite, "b", "s1", ep("b"), "B");
  await tatMayTruPhienStatement(db, "s1", null, T1).run();
  assert.deepEqual(dong(sqlite, "SELECT id, revoked_at, revoke_reason FROM ntf_push_sub ORDER BY id"), [
    { id: "a", revoked_at: T0, revoke_reason: "tu-tat" },
    { id: "b", revoked_at: T1, revoke_reason: "bi-thay" },
  ]);
});

test("TAT_MAY_CUA_PHIEN (IT/Toàn quyền gỡ phiên — ADR-0075 điều 6b): chỉ tắt đăng ký mang ĐÚNG phiên bị gỡ, lý do bi-go, updated_by NULL; phiên khác, dòng session_id NULL, tài khoản khác và dòng đã tắt không đụng", async () => {
  const { sqlite, db } = setup();
  chen(sqlite, "a", "s1", ep("a"), "A");
  chen(sqlite, "b", "s1", ep("b"), "B");
  chen(sqlite, "n", "s1", ep("n"), null);
  chen(sqlite, "z", "s2", ep("z"), "A"); // mã phiên trùng nhưng tài khoản khác (không xảy ra thật — canh điều kiện staff_id)
  chen(sqlite, "c", "s1", ep("c"), "A");
  sqlite.exec(`UPDATE ntf_push_sub SET revoked_at = '${T0}', revoke_reason = 'tu-tat' WHERE id = 'c'`);
  const r = await tatMayCuaPhienStatement(db, "s1", ["A"], T1).run();
  assert.equal(r.meta.changes, 1);
  assert.deepEqual(dong(sqlite, "SELECT id, revoked_at, revoke_reason, updated_at, updated_by FROM ntf_push_sub ORDER BY id"), [
    { id: "a", revoked_at: T1, revoke_reason: "bi-go", updated_at: T1, updated_by: null },
    { id: "b", revoked_at: null, revoke_reason: null, updated_at: T0, updated_by: null },
    { id: "c", revoked_at: T0, revoke_reason: "tu-tat", updated_at: T0, updated_by: null },
    { id: "n", revoked_at: null, revoke_reason: null, updated_at: T0, updated_by: null },
    { id: "z", revoked_at: null, revoke_reason: null, updated_at: T0, updated_by: null },
  ]);
  assert.equal((await tatMayCuaPhienStatement(db, "s1", [], T2).run()).meta.changes, 0, "danh sách phiên rỗng → không tắt gì");
});

test("đăng ký máy ghi session_id; đăng ký lại CÙNG máy (cùng người) bằng phiên mới → cập nhật session_id, không thêm dòng", async () => {
  const { sqlite, db } = setup();
  await db.batch(batMayStatements(db, { id: "m1", staffId: "s1", endpoint: ep("1"), thietBi: "iPhone", at: T0, sessionId: "A" }));
  assert.deepEqual(dong(sqlite, "SELECT id, session_id, revoked_at FROM ntf_push_sub"), [{ id: "m1", session_id: "A", revoked_at: null }]);
  await db.batch(batMayStatements(db, { id: "m2", staffId: "s1", endpoint: ep("1"), thietBi: "iPhone", at: T1, sessionId: "B" }));
  assert.deepEqual(dong(sqlite, "SELECT id, session_id, revoked_at, updated_at FROM ntf_push_sub"), [{ id: "m1", session_id: "B", revoked_at: null, updated_at: T1 }]);
});

test("máy bị tắt (bi-thay) rồi đăng ký lại bằng phiên mới → một dòng ĐANG BẬT mang phiên mới (dòng cũ giữ làm lịch sử)", async () => {
  const { sqlite, db } = setup();
  await db.batch(batMayStatements(db, { id: "m1", staffId: "s1", endpoint: ep("1"), thietBi: "iPhone", at: T0, sessionId: null }));
  await tatMayTruPhienStatement(db, "s1", "B", T1).run();
  await db.batch(batMayStatements(db, { id: "m2", staffId: "s1", endpoint: ep("1"), thietBi: "iPhone", at: T2, sessionId: "B" }));
  assert.deepEqual(dong(sqlite, "SELECT id, session_id, revoke_reason FROM ntf_push_sub WHERE revoked_at IS NULL"), [{ id: "m2", session_id: "B", revoke_reason: null }]);
  assert.deepEqual(dong(sqlite, "SELECT id, revoke_reason FROM ntf_push_sub WHERE revoked_at IS NOT NULL"), [{ id: "m1", revoke_reason: "bi-thay" }]);
});

test("máy dùng chung đổi chủ: tài khoản khác đăng ký cùng endpoint → dòng của người cũ bị thu hồi, dòng mới mang phiên của người mới; dòng người cũ không bị đổi session_id", async () => {
  const { sqlite, db } = setup();
  await db.batch(batMayStatements(db, { id: "m1", staffId: "s1", endpoint: ep("1"), thietBi: "iPhone", at: T0, sessionId: "A" }));
  await db.batch(batMayStatements(db, { id: "m2", staffId: "s2", endpoint: ep("1"), thietBi: "iPhone", at: T1, sessionId: "Z" }));
  assert.deepEqual(dong(sqlite, "SELECT id, staff_id, session_id, revoke_reason FROM ntf_push_sub ORDER BY id"), [
    { id: "m1", staff_id: "s1", session_id: "A", revoke_reason: "doi-tai-khoan" },
    { id: "m2", staff_id: "s2", session_id: "Z", revoke_reason: null },
  ]);
});

test("ADR-0085 Q3: TAT_MAY_CUA_CAC_PHIEN — chỉ tắt đăng ký mang ĐÚNG các phiên trong danh sách (nhiều tài khoản), lý do mat-mien; máy giữ lại, đăng ký session_id NULL, phiên ngoài danh sách, dòng đã tắt không đụng; danh sách rỗng → 0 dòng", async () => {
  const { sqlite, db } = setup();
  chen(sqlite, "a1", "s1", ep("a1"), "A1"); // phiên vừa kết thúc của s1
  chen(sqlite, "a2", "s1", ep("a2"), "A2"); // máy giữ lại của s1
  chen(sqlite, "an", "s1", ep("an"), null); // đăng ký chưa gắn phiên
  chen(sqlite, "b1", "s2", ep("b1"), "B1"); // phiên vừa kết thúc của s2
  chen(sqlite, "c1", "s3", ep("c1"), "C1"); // phiên không trong danh sách
  chen(sqlite, "ax", "s1", ep("ax"), "A1");
  sqlite.exec(`UPDATE ntf_push_sub SET revoked_at = '${T0}', revoke_reason = 'tu-tat' WHERE id = 'ax'`);
  const r = await tatMayCuaCacPhienStatement(db, ["A1", "B1"], T1).run();
  assert.equal(r.meta.changes, 2);
  assert.deepEqual(dong(sqlite, "SELECT id, revoked_at, revoke_reason, updated_by FROM ntf_push_sub ORDER BY id"), [
    { id: "a1", revoked_at: T1, revoke_reason: "mat-mien", updated_by: null },
    { id: "a2", revoked_at: null, revoke_reason: null, updated_by: null },
    { id: "an", revoked_at: null, revoke_reason: null, updated_by: null },
    { id: "ax", revoked_at: T0, revoke_reason: "tu-tat", updated_by: null },
    { id: "b1", revoked_at: T1, revoke_reason: "mat-mien", updated_by: null },
    { id: "c1", revoked_at: null, revoke_reason: null, updated_by: null },
  ]);
  assert.equal((await tatMayCuaCacPhienStatement(db, [], T2).run()).meta.changes, 0, "danh sách rỗng → không tắt gì");
});
