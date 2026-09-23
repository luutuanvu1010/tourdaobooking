// SQL của các bảng module auth sở hữu: `login_attempt` (bảng cũ, giữ tên — ADR-0002 điều 2) và `aut_passkey` (ADR-0016, migration 0023).
// Mọi câu đi qua defineSql (ADR-0002 điều 8(b)), import bằng đuôi .ts để bài kiểm kiến trúc nạp được tệp này. SQL TĨNH, liệt kê cột tường minh.
import { defineSql } from "../../shared/sql-registry.ts";

const ATTEMPT_COUNT = defineSql("auth", "attempt_count", "SELECT count(*) AS n, min(at) AS oldest FROM login_attempt WHERE key = ?1 AND at > ?2");
const ATTEMPT_INSERT = defineSql("auth", "attempt_insert", "INSERT INTO login_attempt (id, key, at) VALUES (?1, ?2, ?3)");
const ATTEMPT_PRUNE = defineSql("auth", "attempt_prune", "DELETE FROM login_attempt WHERE at < ?1");
const ATTEMPT_DELETE_ID = defineSql("auth", "attempt_delete_id", "DELETE FROM login_attempt WHERE id = ?1");
const ATTEMPT_DELETE_KEY = defineSql("auth", "attempt_delete_key", "DELETE FROM login_attempt WHERE key = ?1");
const ATTEMPT_LOCKED = defineSql(
  "auth",
  "attempt_locked_phones",
  "SELECT key FROM login_attempt WHERE key LIKE 'phone:%' AND at > ?1 GROUP BY key HAVING count(*) >= ?2",
);

export async function attemptCount(db: D1Database, key: string, since: number): Promise<{ n: number; oldest: number | null }> {
  const row = await db.prepare(ATTEMPT_COUNT).bind(key, since).first<{ n: number; oldest: number | null }>();
  return { n: row?.n ?? 0, oldest: row?.oldest ?? null };
}
export const attemptInsertStatement = (db: D1Database, id: string, key: string, at: number): D1PreparedStatement => db.prepare(ATTEMPT_INSERT).bind(id, key, at);
export const attemptPruneStatement = (db: D1Database, before: number): D1PreparedStatement => db.prepare(ATTEMPT_PRUNE).bind(before);
export const attemptDeleteIdStatement = (db: D1Database, id: string): D1PreparedStatement => db.prepare(ATTEMPT_DELETE_ID).bind(id);
export const attemptDeleteKeyStatement = (db: D1Database, key: string): D1PreparedStatement => db.prepare(ATTEMPT_DELETE_KEY).bind(key);
export async function lockedPhoneKeys(db: D1Database, since: number, limit: number): Promise<string[]> {
  const { results } = await db.prepare(ATTEMPT_LOCKED).bind(since, limit).all<{ key: string }>();
  return results.map((r) => r.key);
}
