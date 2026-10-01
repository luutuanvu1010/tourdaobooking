// SQL của các bảng module auth sở hữu: `login_attempt` (bảng cũ, giữ tên — ADR-0002 điều 2), `aut_passkey` (ADR-0016, migration 0023) và `aut_session` (sổ phiên, ADR-0075, migration 0061).
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

// ---- Sổ phiên đăng nhập `aut_session` (ADR-0075, migration 0061) ----------------------------------------------------------------------
// Không xoá dòng: kết thúc = đặt ended_at + end_reason (+ ended_by khi do người gỡ). Mọi câu ghi đặt cả cột kiểm toán updated_at/updated_by.
export interface SessionRow {
  id: string; staff_id: string; method: string; single: number; trusted_device_id: string | null; device_label: string;
  user_agent: string | null; ip: string | null; created_at: string; last_seen_at: string; expires_at: string;
  ended_at: string | null; end_reason: string | null; ended_by: string | null;
}
const SS_COLS = "id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by";
// (1) dọn phiên đã quá hạn mà chưa kết thúc — PHẢI đứng trước (2)/(3): dòng hết hạn chưa kết thúc vẫn nằm trong chỉ mục duy nhất aut_session_one_live.
const SS_END_EXPIRED = defineSql("auth", "session_end_expired",
  "UPDATE aut_session SET ended_at = ?2, end_reason = 'het_han', updated_at = ?2, updated_by = NULL WHERE staff_id = ?1 AND ended_at IS NULL AND expires_at <= ?2");
// (2) kết thúc mọi phiên còn sống của tài khoản (trừ ?2 nếu có) — dùng cho "bị thay", đổi PIN, gỡ, ngưng…
const SS_END_OTHERS = defineSql("auth", "session_end_others",
  "UPDATE aut_session SET ended_at = ?4, end_reason = ?3, ended_by = ?5, updated_at = ?4, updated_by = ?5 WHERE staff_id = ?1 AND ended_at IS NULL AND (?2 IS NULL OR id <> ?2)");
// (2b) ngưng tài khoản (ADR-0075 điều 4): kết thúc mọi phiên CHỈ KHI tài khoản đã thật sự ngưng lúc câu chạy — khuôn PK_REVOKE_ALL_IF_SUSPENDED: nối CUỐI lô
// của `PATCH /api/staff/:id` (active:false); câu chốt "còn quản trị viên khác" thua thì active vẫn = 1, EXISTS sai, không kết thúc phiên nào.
const SS_END_ALL_IF_SUSPENDED = defineSql("auth", "session_end_all_if_suspended",
  "UPDATE aut_session SET ended_at = ?3, end_reason = ?2, ended_by = ?4, updated_at = ?3, updated_by = ?4 WHERE staff_id = ?1 AND ended_at IS NULL " +
    "AND EXISTS (SELECT 1 FROM v_stf_staff_label WHERE id = ?1 AND active = 0)");
// (2c) phiên được GIỮ khi người dùng tự đổi PIN / gỡ Face ID (ADR-0075 điều 5): last_seen_at = đúng mốc ghi vào credentials_changed_at, để màn sổ phiên
// (sessionStatus, so max(created_at, last_seen_at)) không coi phiên đang dùng là "Đã đổi thông tin đăng nhập".
const SS_MARK_REISSUED = defineSql("auth", "session_mark_reissued",
  "UPDATE aut_session SET last_seen_at = ?2, updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND ended_at IS NULL");
const SS_END_ONE = defineSql("auth", "session_end_one",
  "UPDATE aut_session SET ended_at = ?3, end_reason = ?2, ended_by = ?4, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND ended_at IS NULL");
// (3) chèn phiên mới: last_seen_at = updated_at = created_at; created_by = chính tài khoản đăng nhập (như aut_passkey).
const SS_INSERT = defineSql("auth", "session_insert",
  `INSERT INTO aut_session (${SS_COLS}, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9, ?10, NULL, NULL, NULL, ?2, ?9, NULL)`);
const SS_FIND_LIVE = defineSql("auth", "session_find_live",
  `SELECT ${SS_COLS} FROM aut_session WHERE id = ?1 AND staff_id = ?2 AND ended_at IS NULL AND expires_at > ?3`);
const SS_TOUCH = defineSql("auth", "session_touch",
  "UPDATE aut_session SET last_seen_at = ?2, updated_at = ?2 WHERE id = ?1 AND ended_at IS NULL AND last_seen_at < ?3");
const SS_LIVE_IDS = defineSql("auth", "session_live_ids",
  "SELECT id FROM aut_session WHERE staff_id = ?1 AND ended_at IS NULL");
const SS_LIST_MINE = defineSql("auth", "session_list_mine",
  `SELECT ${SS_COLS} FROM aut_session WHERE staff_id = ?1 ORDER BY created_at DESC LIMIT 30`);
const SS_LIST_ALL = defineSql("auth", "session_list_all",
  `SELECT ${SS_COLS} FROM aut_session WHERE (?1 IS NULL OR staff_id = ?1) AND (?2 = 0 OR (ended_at IS NULL AND expires_at > ?3)) ORDER BY created_at DESC LIMIT 200`);
const SS_GET = defineSql("auth", "session_get", `SELECT ${SS_COLS} FROM aut_session WHERE id = ?1`);

export const endExpiredSessionsStatement = (db: D1Database, staffId: string, at: string): D1PreparedStatement => db.prepare(SS_END_EXPIRED).bind(staffId, at);
export const endOtherSessionsStatement = (db: D1Database, staffId: string, keep: string | null, reason: string, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(SS_END_OTHERS).bind(staffId, keep, reason, at, by);
export const endAllSessionsIfSuspendedStatement = (db: D1Database, staffId: string, reason: string, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(SS_END_ALL_IF_SUSPENDED).bind(staffId, reason, at, by);
export const markSessionReissuedStatement = (db: D1Database, id: string, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(SS_MARK_REISSUED).bind(id, at, by);
export const endSessionStatement = (db: D1Database, id: string, reason: string, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(SS_END_ONE).bind(id, reason, at, by);
export const insertSessionStatement = (db: D1Database, v: {
  id: string; staffId: string; method: string; single: 0 | 1; trustedDeviceId: string | null; deviceLabel: string; userAgent: string | null; ip: string | null; at: string; expiresAt: string;
}): D1PreparedStatement => db.prepare(SS_INSERT).bind(v.id, v.staffId, v.method, v.single, v.trustedDeviceId, v.deviceLabel, v.userAgent, v.ip, v.at, v.expiresAt);
export const findLiveSession = (db: D1Database, id: string, staffId: string, nowIso: string): Promise<SessionRow | null> =>
  db.prepare(SS_FIND_LIVE).bind(id, staffId, nowIso).first<SessionRow>();
export const touchSessionStatement = (db: D1Database, id: string, nowIso: string, staleBeforeIso: string): D1PreparedStatement =>
  db.prepare(SS_TOUCH).bind(id, nowIso, staleBeforeIso);
export async function liveSessionIds(db: D1Database, staffId: string): Promise<string[]> {
  return (await db.prepare(SS_LIVE_IDS).bind(staffId).all<{ id: string }>()).results.map((r) => r.id);
}
export async function listMySessions(db: D1Database, staffId: string): Promise<SessionRow[]> {
  return (await db.prepare(SS_LIST_MINE).bind(staffId).all<SessionRow>()).results;
}
export async function listSessions(db: D1Database, staffId: string | null, liveOnly: boolean, nowIso: string): Promise<SessionRow[]> {
  return (await db.prepare(SS_LIST_ALL).bind(staffId, liveOnly ? 1 : 0, nowIso).all<SessionRow>()).results;
}
export const getSession = (db: D1Database, id: string): Promise<SessionRow | null> => db.prepare(SS_GET).bind(id).first<SessionRow>();
