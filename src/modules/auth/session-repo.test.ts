// SQL sổ phiên (ADR-0075 điều 1–2) chạy trên SQLite THẬT dựng từ migrations/*.sql: thứ tự lô đăng nhập một máy, phiên hết hạn chưa kết thúc,
// chỉ mục duy nhất aut_session_one_live khi hai lần đăng nhập chạy đua, giữ đúng phiên, ghi last_seen_at thưa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import {
  endExpiredSessionsStatement, endOtherSessionsStatement, getSession, insertSessionStatement, touchSessionStatement,
} from "./repository.ts";

const DIR = new URL("../../../migrations/", import.meta.url);

/** D1 giả tối thiểu: `prepare().bind().run()/first()/all()`; `batch()` chạy tuần tự trong BEGIN/COMMIT, lỗi thì ROLLBACK (như D1 thật). */
function fakeD1(sqlite: DatabaseSync): D1Database {
  const stmt = (sql: string, args: SupportedValueType[] = []) => ({
    sql, args,
    bind: (...a: SupportedValueType[]) => stmt(sql, a),
    first: async () => {
      const r = sqlite.prepare(sql).get(...args);
      return r ? { ...r } : null;
    },
    all: async () => ({ results: sqlite.prepare(sql).all(...args).map((r) => ({ ...r })), meta: {} }),
    run: async () => ({ results: [], meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
  });
  const db = {
    prepare: (sql: string) => stmt(sql),
    batch: async (stmts: { sql: string; args: SupportedValueType[] }[]) => {
      sqlite.exec("BEGIN");
      try {
        // Câu có RETURNING trả các dòng trong `results` (như D1 thật) — lô đăng nhập đọc mã phiên vừa bị thay từ đó (ADR-0075 điều 6).
        const out = stmts.map((s) => {
          if (/\bRETURNING\b/i.test(s.sql)) {
            const rows = sqlite.prepare(s.sql).all(...s.args).map((r) => ({ ...r }));
            return { results: rows, meta: { changes: rows.length } };
          }
          return { results: [], meta: { changes: Number(sqlite.prepare(s.sql).run(...s.args).changes) } };
        });
        sqlite.exec("COMMIT");
        return out;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return db as unknown as D1Database;
}

function setup(): { sqlite: DatabaseSync; db: D1Database } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.exec("INSERT INTO staff (id, phone, pin_hash, role, full_name, active, created_at) VALUES ('s1', '0900000001', 'x', 'sales', '', 1, '2026-01-01T00:00:00Z')");
  return { sqlite, db: fakeD1(sqlite) };
}

/** Mã các phiên còn sống (chưa kết thúc) của một tài khoản — đọc thẳng bảng (hàm repo cũ đã gỡ vì mã chạy thật không dùng). */
const phienSong = (sqlite: DatabaseSync, staffId: string): string[] =>
  sqlite.prepare("SELECT id FROM aut_session WHERE staff_id = ? AND ended_at IS NULL ORDER BY id").all(staffId).map((r) => String(r.id));

const NOW = "2026-10-02T00:00:00.000Z";
const EXPIRED = "2026-10-01T00:00:00.000Z"; // hạn đã qua so với NOW
const LATER = "2026-10-09T00:00:00.000Z"; // còn hạn
const row = (id: string, single: 0 | 1, at: string, expiresAt: string) => ({
  id, staffId: "s1", method: "PIN", single, trustedDeviceId: null, deviceLabel: "iPhone · Safari", userAgent: "UA", ip: "10.0.0.1", at, expiresAt,
});

test("lô đăng nhập một máy: kết thúc phiên hết hạn → kết thúc phiên sống (bi_thay) → chèn", async () => {
  const { db, sqlite } = setup();
  // p1 hết hạn nhưng chưa kết thúc (single = 0 để chèn được cùng lúc với p2 — dữ liệu cũ trước luật), p2 sống single = 1.
  await insertSessionStatement(db, row("p1", 0, "2026-09-20T00:00:00.000Z", EXPIRED)).run();
  await insertSessionStatement(db, row("p2", 1, "2026-10-01T12:00:00.000Z", LATER)).run();
  const kq = await db.batch([
    endExpiredSessionsStatement(db, "s1", NOW),
    endOtherSessionsStatement(db, "s1", null, "bi_thay", NOW, null),
    insertSessionStatement(db, row("p3", 1, NOW, LATER)),
  ]);
  // ADR-0075 điều 6: câu "kết thúc phiên còn sống" trả mã phiên vừa bị thay (RETURNING id) — CHỈ p2; p1 hết hạn đã bị câu (1) kết thúc trước.
  assert.deepEqual(kq[1]!.results, [{ id: "p2" }]);
  const [p1, p2, p3] = await Promise.all([getSession(db, "p1"), getSession(db, "p2"), getSession(db, "p3")]);
  assert.equal(p1!.end_reason, "het_han");
  assert.equal(p1!.ended_at, NOW);
  assert.equal(p2!.end_reason, "bi_thay");
  assert.equal(p2!.ended_at, NOW);
  assert.equal(p2!.ended_by, null);
  assert.equal(p3!.ended_at, null);
  assert.equal(p3!.single, 1);
  assert.equal(p3!.last_seen_at, NOW);
  assert.deepEqual(phienSong(sqlite, "s1"), ["p3"]);
});

test("phiên hết hạn chưa kết thúc KHÔNG chặn lần đăng nhập sau", async () => {
  const { db } = setup();
  await insertSessionStatement(db, row("p1", 1, "2026-09-20T00:00:00.000Z", EXPIRED)).run();
  // Không có bước "bị thay" (vd tài khoản được miễn) — chỉ dọn hạn rồi chèn: chỉ mục duy nhất không được chặn.
  await db.batch([endExpiredSessionsStatement(db, "s1", NOW), insertSessionStatement(db, row("p2", 1, NOW, LATER))]);
  assert.equal((await getSession(db, "p1"))!.end_reason, "het_han");
  assert.equal((await getSession(db, "p2"))!.ended_at, null);
});

test("hai lô đăng nhập cùng lúc (mô phỏng: lô 2 bỏ bước kết thúc) → UNIQUE, cả lô 2 lùi", async () => {
  const { db } = setup();
  await insertSessionStatement(db, row("p0", 0, "2026-09-20T00:00:00.000Z", EXPIRED)).run(); // hết hạn chưa kết thúc: thấy được lô có lùi không
  await insertSessionStatement(db, row("p2", 1, "2026-10-01T12:00:00.000Z", LATER)).run();
  await assert.rejects(
    db.batch([endExpiredSessionsStatement(db, "s1", NOW), insertSessionStatement(db, row("p3", 1, NOW, LATER))]),
    /UNIQUE/,
  );
  assert.equal((await getSession(db, "p2"))!.ended_at, null, "phiên đang sống giữ nguyên");
  assert.equal(await getSession(db, "p3"), null, "không có phiên mới");
  assert.equal((await getSession(db, "p0"))!.ended_at, null, "bước dọn hạn trong cùng lô cũng lùi");
});

test("endOtherSessions giữ đúng phiên được giữ", async () => {
  const { db, sqlite } = setup();
  await insertSessionStatement(db, row("p1", 0, "2026-10-01T10:00:00.000Z", LATER)).run();
  await insertSessionStatement(db, row("p2", 0, "2026-10-01T11:00:00.000Z", LATER)).run();
  const r = await endOtherSessionsStatement(db, "s1", "p2", "doi_pin", NOW, "s1").run();
  assert.equal(r.meta.changes, 1);
  const [p1, p2] = await Promise.all([getSession(db, "p1"), getSession(db, "p2")]);
  assert.equal(p1!.end_reason, "doi_pin");
  assert.equal(p1!.ended_by, "s1");
  assert.equal(p2!.ended_at, null);
  assert.deepEqual(phienSong(sqlite, "s1"), ["p2"]);
});

test("touch chỉ ghi khi last_seen_at cũ hơn 5 phút", async () => {
  const { db, sqlite } = setup();
  await insertSessionStatement(db, row("p1", 1, NOW, LATER)).run();
  const t0 = Date.parse(NOW);
  const iso = (ms: number) => new Date(ms).toISOString();
  const fresh = await touchSessionStatement(db, "p1", iso(t0 + 60_000), iso(t0 + 60_000 - 5 * 60_000)).run();
  assert.equal(fresh.meta.changes, 0);
  const stale = await touchSessionStatement(db, "p1", iso(t0 + 10 * 60_000), iso(t0 + 5 * 60_000)).run();
  assert.equal(stale.meta.changes, 1);
  const p1 = sqlite.prepare("SELECT last_seen_at, updated_at FROM aut_session WHERE id = 'p1'").get() as { last_seen_at: string; updated_at: string };
  assert.deepEqual({ ...p1 }, { last_seen_at: iso(t0 + 10 * 60_000), updated_at: iso(t0 + 10 * 60_000) });
});
