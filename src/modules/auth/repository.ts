// SQL của các bảng module auth sở hữu: `login_attempt` (bảng cũ, giữ tên — ADR-0002 điều 2), `aut_passkey` (ADR-0016, migration 0023) và `aut_session` (sổ phiên, ADR-0075, migration 0065).
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
// ADR-0074 (kế hoạch Task 6): tài khoản đang bị khoá bước hai (khoá đếm `mfa:<staffId>` đủ số lần sai trong cửa sổ) — danh sách Quản lý tài khoản hiện "bị khoá".
const ATTEMPT_LOCKED_MFA = defineSql(
  "auth",
  "attempt_locked_mfa",
  "SELECT key FROM login_attempt WHERE key LIKE 'mfa:%' AND at > ?1 GROUP BY key HAVING count(*) >= ?2",
);
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
export async function lockedMfaKeys(db: D1Database, since: number, limit: number): Promise<string[]> {
  const { results } = await db.prepare(ATTEMPT_LOCKED_MFA).bind(since, limit).all<{ key: string }>();
  return results.map((r) => r.key);
}
export const attemptDeleteKeyStatement = (db: D1Database, key: string): D1PreparedStatement => db.prepare(ATTEMPT_DELETE_KEY).bind(key);
export async function lockedPhoneKeys(db: D1Database, since: number, limit: number): Promise<string[]> {
  const { results } = await db.prepare(ATTEMPT_LOCKED).bind(since, limit).all<{ key: string }>();
  return results.map((r) => r.key);
}

// ---- Sổ phiên đăng nhập `aut_session` (ADR-0075, migration 0065) ----------------------------------------------------------------------
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
// (2) kết thúc mọi phiên còn sống của tài khoản (trừ ?2 nếu có) — dùng cho "bị thay", đổi PIN, gỡ, ngưng… RETURNING id: lô đăng nhập lấy ĐÚNG các phiên
// câu này vừa kết thúc (không đọc trước lô — tránh khe giữa lúc đọc và lúc ghi) để đóng Bảng tin của chúng (ADR-0075 điều 6a).
const SS_END_OTHERS = defineSql("auth", "session_end_others",
  "UPDATE aut_session SET ended_at = ?4, end_reason = ?3, ended_by = ?5, updated_at = ?4, updated_by = ?5 WHERE staff_id = ?1 AND ended_at IS NULL AND (?2 IS NULL OR id <> ?2) RETURNING id");
// (2b) ngưng tài khoản (ADR-0075 điều 4): kết thúc mọi phiên CHỈ KHI tài khoản đã thật sự ngưng lúc câu chạy — khuôn PK_REVOKE_ALL_IF_SUSPENDED: nối CUỐI lô
// của `PATCH /api/staff/:id` (active:false); câu chốt "còn quản trị viên khác" thua thì active vẫn = 1, EXISTS sai, không kết thúc phiên nào.
const SS_END_ALL_IF_SUSPENDED = defineSql("auth", "session_end_all_if_suspended",
  "UPDATE aut_session SET ended_at = ?3, end_reason = ?2, ended_by = ?4, updated_at = ?3, updated_by = ?4 WHERE staff_id = ?1 AND ended_at IS NULL " +
    "AND EXISTS (SELECT 1 FROM v_stf_staff_label WHERE id = ?1 AND active = 0)");
// (2c) phiên được GIỮ khi người dùng tự đổi PIN / gỡ Face ID (ADR-0075 điều 5): last_seen_at = đúng mốc ghi vào credentials_changed_at, để màn sổ phiên
// (sessionStatus, so max(created_at, last_seen_at)) không coi phiên đang dùng là "Đã đổi thông tin đăng nhập".
const SS_MARK_REISSUED = defineSql("auth", "session_mark_reissued",
  "UPDATE aut_session SET last_seen_at = ?2, updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND ended_at IS NULL");
// (2d) Một tài khoản MẤT nhiều máy khi đổi quyền / vai (ADR-0085 Q2 điều 7, thay ADR-0075 điều 3): [dọn hạn (1) → kết thúc mọi phiên trừ phiên còn sống mới nhất
// → đánh dấu phiên còn lại single = 1]. Thứ tự giữ chỉ mục aut_session_one_live không vỡ. KHÔNG còn tự kiểm "không giữ Toàn quyền" trong SQL: route đặt hai câu
// này ở lô THỨ HAI, chỉ chạy khi lô đổi quyền/vai đã thắng câu chốt "quản trị viên cuối" (bài accounts/mat-mien-route.test.ts, đột biến ở sổ hàng rào).
// RETURNING id: phiên vừa bị kết thúc (đóng Bảng tin) / phiên được giữ (giữ thông báo của máy đó) — ADR-0075 điều 6.
const SS_END_ALL_BUT_NEWEST = defineSql("auth", "session_end_all_but_newest",
  "UPDATE aut_session SET ended_at = ?2, end_reason = 'mat_mien', ended_by = ?3, updated_at = ?2, updated_by = ?3 WHERE staff_id = ?1 AND ended_at IS NULL AND id <> " +
    "(SELECT id FROM aut_session WHERE staff_id = ?1 AND ended_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 1) RETURNING id");
const SS_MARK_SINGLE = defineSql("auth", "session_mark_single",
  "UPDATE aut_session SET single = 1, updated_at = ?2, updated_by = ?3 WHERE staff_id = ?1 AND ended_at IS NULL RETURNING id");
// Nới (một máy → nhiều máy) KHÔNG ghi gì lên aut_session (ADR-0085 đặc tả §4.2 bước 4, §4.4): chỉ mục chỉ đếm single = 1 nên phiên cũ single = 1 sống cạnh
// phiên mới single = 0 không vi phạm.
const SS_END_ONE = defineSql("auth", "session_end_one",
  "UPDATE aut_session SET ended_at = ?3, end_reason = ?2, ended_by = ?4, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND ended_at IS NULL");
// (3) chèn phiên mới: last_seen_at = updated_at = created_at; created_by = chính tài khoản đăng nhập (như aut_passkey).
const SS_INSERT = defineSql("auth", "session_insert",
  `INSERT INTO aut_session (${SS_COLS}, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9, ?10, NULL, NULL, NULL, ?2, ?9, NULL)`);
const SS_FIND_LIVE = defineSql("auth", "session_find_live",
  `SELECT ${SS_COLS} FROM aut_session WHERE id = ?1 AND staff_id = ?2 AND ended_at IS NULL AND expires_at > ?3`);
const SS_TOUCH = defineSql("auth", "session_touch",
  "UPDATE aut_session SET last_seen_at = ?2, updated_at = ?2 WHERE id = ?1 AND ended_at IS NULL AND last_seen_at < ?3");
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
export const endAllButNewestStatement = (db: D1Database, staffId: string, at: string, by: string): D1PreparedStatement =>
  db.prepare(SS_END_ALL_BUT_NEWEST).bind(staffId, at, by);
export const markSingleStatement = (db: D1Database, staffId: string, at: string, by: string): D1PreparedStatement => db.prepare(SS_MARK_SINGLE).bind(staffId, at, by);
export const endSessionStatement = (db: D1Database, id: string, reason: string, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(SS_END_ONE).bind(id, reason, at, by);
export const insertSessionStatement = (db: D1Database, v: {
  id: string; staffId: string; method: string; single: 0 | 1; trustedDeviceId: string | null; deviceLabel: string; userAgent: string | null; ip: string | null; at: string; expiresAt: string;
}): D1PreparedStatement => db.prepare(SS_INSERT).bind(v.id, v.staffId, v.method, v.single, v.trustedDeviceId, v.deviceLabel, v.userAgent, v.ip, v.at, v.expiresAt);
export const findLiveSession = (db: D1Database, id: string, staffId: string, nowIso: string): Promise<SessionRow | null> =>
  db.prepare(SS_FIND_LIVE).bind(id, staffId, nowIso).first<SessionRow>();
export const touchSessionStatement = (db: D1Database, id: string, nowIso: string, staleBeforeIso: string): D1PreparedStatement =>
  db.prepare(SS_TOUCH).bind(id, nowIso, staleBeforeIso);
export async function listMySessions(db: D1Database, staffId: string): Promise<SessionRow[]> {
  return (await db.prepare(SS_LIST_MINE).bind(staffId).all<SessionRow>()).results;
}
export async function listSessions(db: D1Database, staffId: string | null, liveOnly: boolean, nowIso: string): Promise<SessionRow[]> {
  return (await db.prepare(SS_LIST_ALL).bind(staffId, liveOnly ? 1 : 0, nowIso).all<SessionRow>()).results;
}
export const getSession = (db: D1Database, id: string): Promise<SessionRow | null> => db.prepare(SS_GET).bind(id).first<SessionRow>();

// ---- Chính sách đăng nhập `aut_session_policy` (ADR-0085, migration 0067) ----------------------------------------------------------------
// MỘT mẩu điều kiện "tài khoản <cột> được nhiều máy" cho ba câu (siết, đánh dấu, đếm xem trước) và cho bất biến R-AUT-SESSION-3 (scripts/audit-checks.mjs chép
// nguyên văn — bài đối chiếu ở src/audit-invariants.test.ts). Nguồn chính sách: bảng (khi lưu — đọc SAU các câu ghi chính sách cùng lô) hoặc tham số JSON
// (xem trước). Quyền / vai IT đọc qua view công bố của staff (v_stf_*), không JOIN bảng stf_/pty_. Bản TypeScript: isSingleDevice (session-ledger.ts).
const nhieuMayDieuKien = (cotStaff: string, nguonQuyen: string): string =>
  `(EXISTS (SELECT 1 FROM v_stf_nhieu_may_co_dinh f WHERE f.staff_id = ${cotStaff}) OR EXISTS (SELECT 1 FROM v_stf_quyen_mo q WHERE q.staff_id = ${cotStaff} AND q.permission_code IN (${nguonQuyen})))`;
const NGUON_BANG = "SELECT p.permission_code FROM aut_session_policy p WHERE p.valid_to_at IS NULL AND p.multi = 1";
const moiNhatConSong = (cotStaff: string, locHan: string) =>
  `(SELECT n.id FROM aut_session n WHERE n.staff_id = ${cotStaff} AND n.ended_at IS NULL${locHan} ORDER BY n.created_at DESC, n.id DESC LIMIT 1)`;

export interface PolicyRow { id: string; permission_code: string; multi: number }
const POL_LIST = defineSql("auth", "policy_list", "SELECT id, permission_code, multi FROM aut_session_policy WHERE valid_to_at IS NULL ORDER BY permission_code");
const POL_CLOSE = defineSql("auth", "policy_close",
  "UPDATE aut_session_policy SET valid_to_at = ?3, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND permission_code = ?2 AND valid_to_at IS NULL");
// Chèn SAU câu đóng: câu đóng thua (id đang xem đã không còn là dòng hiện hành) ⇒ permission_code NULL ⇒ lỗi NOT NULL ⇒ CẢ lô lùi (all-or-nothing, đặc tả §4.2
// bước 3.1 — lần lưu nhiều quyền không được ghi một nửa). changes() là của câu hoàn tất ngay trước (câu đóng).
const POL_INSERT_AFTER_CLOSE = defineSql("auth", "policy_insert_after_close",
  "INSERT INTO aut_session_policy (id, permission_code, multi, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) " +
    "SELECT ?1, CASE WHEN changes() > 0 THEN ?2 END, ?3, ?4, NULL, ?4, ?5, ?4, ?5");
// Chèn khi bản đang xem CHƯA có dòng: dòng hiện hành đã có (người khác vừa đặt) ⇒ chỉ mục aut_session_policy_one_current vỡ ⇒ cả lô lùi.
const POL_INSERT_NEW = defineSql("auth", "policy_insert_new",
  "INSERT INTO aut_session_policy (id, permission_code, multi, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, NULL, ?4, ?5, ?4, ?5)");
// Siết theo tập (đặc tả §4.2 bước 3.3): dọn hạn MỌI tài khoản → kết thúc mọi phiên trừ phiên mới nhất của tài khoản nay một máy → đánh dấu single = 1.
// Số câu cố định, không phụ thuộc số người. Câu ghi không mở đầu bằng WITH (khung thử coi WITH là câu đọc).
const SS_END_EXPIRED_ALL = defineSql("auth", "session_end_expired_all",
  "UPDATE aut_session SET ended_at = ?1, end_reason = 'het_han', updated_at = ?1, updated_by = NULL WHERE ended_at IS NULL AND expires_at <= ?1");
const SS_SIET_THEO_TAP = defineSql("auth", "session_siet_theo_tap",
  "UPDATE aut_session SET ended_at = ?1, end_reason = 'mat_mien', ended_by = ?2, updated_at = ?1, updated_by = ?2 WHERE ended_at IS NULL " +
    `AND NOT ${nhieuMayDieuKien("aut_session.staff_id", NGUON_BANG)} AND id <> ${moiNhatConSong("aut_session.staff_id", "")} RETURNING id, staff_id`);
const SS_DANH_DAU_MOT_MAY = defineSql("auth", "session_danh_dau_mot_may_theo_tap",
  `UPDATE aut_session SET single = 1, updated_at = ?1, updated_by = ?2 WHERE ended_at IS NULL AND single = 0 AND NOT ${nhieuMayDieuKien("aut_session.staff_id", NGUON_BANG)}`);
// Xem trước (đặc tả §4.3): cùng mẩu điều kiện, nguồn = tập đề xuất (JSON ?1); phiên còn hạn tại ?2 (lô thật dọn hạn trước nên tương đương).
const SS_DEM_SIET = defineSql("auth", "session_dem_siet_theo_tap",
  "SELECT count(*) AS so_phien, count(DISTINCT s.staff_id) AS so_nguoi FROM aut_session s WHERE s.ended_at IS NULL AND s.expires_at > ?2 " +
    `AND NOT ${nhieuMayDieuKien("s.staff_id", "SELECT value FROM json_each(?1)")} AND s.id <> ${moiNhatConSong("s.staff_id", " AND n.expires_at > ?2")}`);
export async function listPolicyRows(db: D1Database): Promise<PolicyRow[]> {
  return (await db.prepare(POL_LIST).all<PolicyRow>()).results;
}
export const closePolicyStatement = (db: D1Database, v: { id: string; code: string; at: string; by: string }): D1PreparedStatement =>
  db.prepare(POL_CLOSE).bind(v.id, v.code, v.at, v.by);
export const insertPolicyAfterCloseStatement = (db: D1Database, v: { id: string; code: string; multi: boolean; at: string; by: string }): D1PreparedStatement =>
  db.prepare(POL_INSERT_AFTER_CLOSE).bind(v.id, v.code, v.multi ? 1 : 0, v.at, v.by);
export const insertPolicyNewStatement = (db: D1Database, v: { id: string; code: string; multi: boolean; at: string; by: string }): D1PreparedStatement =>
  db.prepare(POL_INSERT_NEW).bind(v.id, v.code, v.multi ? 1 : 0, v.at, v.by);
/** Lỗi ràng buộc do lần lưu dựa trên bản chính sách cũ (NOT NULL của câu chèn sau đóng, hoặc UNIQUE dòng hiện hành). */
export const laLoiChinhSachCu = (e: unknown): boolean => e instanceof Error && /aut_session_policy\.permission_code/.test(e.message);
export const endExpiredAllStatement = (db: D1Database, at: string): D1PreparedStatement => db.prepare(SS_END_EXPIRED_ALL).bind(at);
export const sietTheoTapStatement = (db: D1Database, at: string, by: string): D1PreparedStatement => db.prepare(SS_SIET_THEO_TAP).bind(at, by);
export const danhDauMotMayTheoTapStatement = (db: D1Database, at: string, by: string): D1PreparedStatement => db.prepare(SS_DANH_DAU_MOT_MAY).bind(at, by);
export async function demSietTheoTap(db: D1Database, nhieuMay: readonly string[], nowIso: string): Promise<{ soPhien: number; soNguoi: number }> {
  const r = await db.prepare(SS_DEM_SIET).bind(JSON.stringify(nhieuMay), nowIso).first<{ so_phien: number; so_nguoi: number }>();
  return { soPhien: r?.so_phien ?? 0, soNguoi: r?.so_nguoi ?? 0 };
}
