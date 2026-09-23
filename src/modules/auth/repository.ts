// SQL của các bảng module auth sở hữu: `login_attempt` (bảng cũ, giữ tên — ADR-0002 điều 2) và `aut_passkey` (ADR-0016, migration 0023).
// Mọi câu đi qua defineSql (ADR-0002 điều 8(b)), import bằng đuôi .ts để bài kiểm kiến trúc nạp được tệp này. SQL TĨNH, liệt kê cột tường minh.
import { defineSql } from "../../shared/sql-registry.ts";

export interface PasskeyRow {
  id: string;
  staff_id: string;
  credential_id: string;
  public_key: string;
  algorithm: number;
  user_handle: string;
  sign_count: number;
  label: string;
  last_used_at: string | null;
  created_at: string;
}
const PK_COLS = "id, staff_id, credential_id, public_key, algorithm, user_handle, sign_count, label, last_used_at, created_at";
const PK_FIND_ACTIVE = defineSql("auth", "passkey_find_active", `SELECT ${PK_COLS} FROM aut_passkey WHERE credential_id = ?1 AND valid_to_at IS NULL`);
const PK_LIST_ACTIVE = defineSql("auth", "passkey_list_active", `SELECT ${PK_COLS} FROM aut_passkey WHERE staff_id = ?1 AND valid_to_at IS NULL ORDER BY created_at`);
const PK_FIRST_HANDLE = defineSql("auth", "passkey_first_handle", "SELECT user_handle FROM aut_passkey WHERE staff_id = ?1 ORDER BY created_at LIMIT 1");
const PK_COUNT_ACTIVE = defineSql("auth", "passkey_count_active", "SELECT staff_id, count(*) AS n FROM aut_passkey WHERE valid_to_at IS NULL GROUP BY staff_id");
const PK_INSERT = defineSql(
  "auth",
  "passkey_insert",
  "INSERT INTO aut_passkey (id, staff_id, credential_id, public_key, algorithm, user_handle, sign_count, label, last_used_at, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) " +
    "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, ?9, NULL, ?9, ?2, ?9, ?2)",
);
// "Dùng một lần" (đặc tả §2.4): chỉ đổi khi lần dùng trước (nếu có) SỚM HƠN lúc phát hành thách thức. Người gọi đòi changes = 1.
const PK_MARK_USED = defineSql(
  "auth",
  "passkey_mark_used",
  "UPDATE aut_passkey SET sign_count = max(sign_count, ?2), last_used_at = ?3, updated_at = ?3 WHERE id = ?1 AND valid_to_at IS NULL AND (last_used_at IS NULL OR last_used_at < ?4)",
);
const PK_REVOKE_ONE = defineSql("auth", "passkey_revoke_one", "UPDATE aut_passkey SET valid_to_at = ?3, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND staff_id = ?2 AND valid_to_at IS NULL");
const PK_REVOKE_ALL = defineSql("auth", "passkey_revoke_all", "UPDATE aut_passkey SET valid_to_at = ?2, updated_at = ?2, updated_by = ?3 WHERE staff_id = ?1 AND valid_to_at IS NULL");
// 8b (ADR-0016 điều 6): gỡ mọi passkey CHỈ KHI tài khoản đã thật sự ngưng. Nối CUỐI batch của `PATCH /api/staff/:id` (active:false): nếu câu chốt
// "còn quản trị viên khác" thua thì tài khoản vẫn active = 1, EXISTS sai, không gỡ gì. Đọc `staff` qua view công bố v_stf_staff_label (cạnh auth → staff).
const PK_REVOKE_ALL_IF_SUSPENDED = defineSql(
  "auth",
  "passkey_revoke_all_if_suspended",
  "UPDATE aut_passkey SET valid_to_at = ?2, updated_at = ?2, updated_by = ?3 WHERE staff_id = ?1 AND valid_to_at IS NULL " +
    "AND EXISTS (SELECT 1 FROM v_stf_staff_label WHERE id = ?1 AND active = 0)",
);

export const findActivePasskey = (db: D1Database, credentialId: string): Promise<PasskeyRow | null> => db.prepare(PK_FIND_ACTIVE).bind(credentialId).first<PasskeyRow>();
export async function listActivePasskeys(db: D1Database, staffId: string): Promise<PasskeyRow[]> {
  return (await db.prepare(PK_LIST_ACTIVE).bind(staffId).all<PasskeyRow>()).results;
}
export async function firstUserHandle(db: D1Database, staffId: string): Promise<string | null> {
  return (await db.prepare(PK_FIRST_HANDLE).bind(staffId).first<{ user_handle: string }>())?.user_handle ?? null;
}
export async function countActivePasskeys(db: D1Database): Promise<Map<string, number>> {
  const { results } = await db.prepare(PK_COUNT_ACTIVE).all<{ staff_id: string; n: number }>();
  return new Map(results.map((r) => [r.staff_id, r.n]));
}
export const insertPasskeyStatement = (
  db: D1Database,
  v: { id: string; staffId: string; credentialId: string; publicKey: string; algorithm: number; userHandle: string; signCount: number; label: string; at: string },
): D1PreparedStatement => db.prepare(PK_INSERT).bind(v.id, v.staffId, v.credentialId, v.publicKey, v.algorithm, v.userHandle, v.signCount, v.label, v.at);
export async function markPasskeyUsed(db: D1Database, id: string, signCount: number, usedAt: string, challengeIssuedAt: string): Promise<boolean> {
  return ((await db.prepare(PK_MARK_USED).bind(id, signCount, usedAt, challengeIssuedAt).run()).meta.changes ?? 0) === 1;
}
export const revokePasskeyStatement = (db: D1Database, id: string, staffId: string, at: string, by: string): D1PreparedStatement =>
  db.prepare(PK_REVOKE_ONE).bind(id, staffId, at, by);
export const revokeAllPasskeysStatement = (db: D1Database, staffId: string, at: string, by: string): D1PreparedStatement =>
  db.prepare(PK_REVOKE_ALL).bind(staffId, at, by);
/** Câu gỡ mọi passkey của `staffId`, chỉ có hiệu lực khi tài khoản ĐANG ngưng lúc câu chạy (xem PK_REVOKE_ALL_IF_SUSPENDED). Chưa chạy. */
export const revokeAllPasskeysIfSuspendedStatement = (db: D1Database, staffId: string, at: string, by: string): D1PreparedStatement =>
  db.prepare(PK_REVOKE_ALL_IF_SUSPENDED).bind(staffId, at, by);

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
