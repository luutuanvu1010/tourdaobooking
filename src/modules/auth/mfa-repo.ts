// SQL bảo mật hai lớp (ADR-0074, migration 0101, 0102): `aut_mfa_factor`, `aut_mfa_recovery_code`, `aut_trusted_device`, `aut_mfa_email_code`. Mọi câu đi qua defineSql (ADR-0002 điều 8(b)), SQL TĨNH.
// Khoá TOTP đã mã hoá (secret_enc), băm mã dự phòng và băm token máy tin KHÔNG bao giờ vào nhật ký / DTO / câu lỗi: hàm đọc dưới đây không trả băm token.
import { defineSql } from "../../shared/sql-registry.ts";

export type MfaKind = "TOTP" | "EMAIL";
export interface MfaFactorRow {
  id: string;
  staff_id: string;
  kind: MfaKind;
  secret_enc: string | null;
  email: string | null;
  last_totp_step: number;
  valid_from_at: string;
}
export interface TrustedDeviceRow {
  id: string;
  staff_id: string;
  label: string;
  created_at: string;
  last_used_at: string;
  expires_at: string;
}
export type TrustedRevokeReason = "quen_may" | "quen_moi_may" | "doi_pin" | "dat_lai_pin" | "tat_hai_lop" | "bi_go" | "ngung";

const F_COLS = "id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at";
const FACTOR_LIST_LIVE = defineSql("auth", "mfa_factor_list_live", `SELECT ${F_COLS} FROM aut_mfa_factor WHERE staff_id = ?1 AND valid_to_at IS NULL ORDER BY created_at, id`);
// Nhãn "Hai lớp" ở danh sách Quản lý tài khoản (kế hoạch Task 6): những tài khoản đang có ít nhất một yếu tố sống — chỉ id.
const FACTOR_STAFF_LIVE = defineSql("auth", "mfa_factor_staff_live", "SELECT DISTINCT staff_id FROM aut_mfa_factor WHERE valid_to_at IS NULL");
const FACTOR_INSERT = defineSql(
  "auth",
  "mfa_factor_insert",
  "INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) " +
    "VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, NULL, ?6, ?7, ?6, ?7)",
);
const FACTOR_END = defineSql("auth", "mfa_factor_end", "UPDATE aut_mfa_factor SET valid_to_at = ?3, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND staff_id = ?2 AND valid_to_at IS NULL");
// Tài khoản nội bộ tự gỡ một yếu tố (ADR-0074, đặc tả §4.3): chỉ kết thúc khi CÒN yếu tố sống khác — lưới khi hai lần gỡ chạy đua (kiểm trước ở route chỉ
// cho câu báo rõ). Đổi 0 dòng ⇒ người gọi trả 409.
const FACTOR_END_KEEP_ONE = defineSql(
  "auth",
  "mfa_factor_end_keep_one",
  "UPDATE aut_mfa_factor SET valid_to_at = ?3, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND staff_id = ?2 AND valid_to_at IS NULL " +
    "AND EXISTS (SELECT 1 FROM aut_mfa_factor o WHERE o.staff_id = ?2 AND o.valid_to_at IS NULL AND o.id <> ?1)",
);
const FACTOR_END_ALL = defineSql("auth", "mfa_factor_end_all", "UPDATE aut_mfa_factor SET valid_to_at = ?2, updated_at = ?2, updated_by = ?3 WHERE staff_id = ?1 AND valid_to_at IS NULL");
// Chống dùng lại mã TOTP: chỉ đổi khi bước mới LỚN HƠN bước đã dùng. Người gọi đòi changes = 1.
const TOTP_CONSUME = defineSql("auth", "mfa_totp_consume", "UPDATE aut_mfa_factor SET last_totp_step = ?2, updated_at = ?3 WHERE id = ?1 AND valid_to_at IS NULL AND last_totp_step < ?2");

const RECOVERY_INSERT = defineSql("auth", "mfa_recovery_insert", "INSERT INTO aut_mfa_recovery_code (id, staff_id, batch_id, code_hash, created_at, created_by, updated_at, updated_by, used_at, revoked_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5, ?6, NULL, NULL)");
const RECOVERY_REVOKE_ALL = defineSql("auth", "mfa_recovery_revoke_all", "UPDATE aut_mfa_recovery_code SET revoked_at = ?2, updated_at = ?2, updated_by = ?3 WHERE staff_id = ?1 AND used_at IS NULL AND revoked_at IS NULL");
// Dùng MỘT lần: chỉ đổi khi chưa dùng, chưa thu hồi. Người gọi đòi changes = 1.
const RECOVERY_USE = defineSql("auth", "mfa_recovery_use", "UPDATE aut_mfa_recovery_code SET used_at = ?3, updated_at = ?3, updated_by = ?1 WHERE staff_id = ?1 AND code_hash = ?2 AND used_at IS NULL AND revoked_at IS NULL");
const RECOVERY_COUNT_LEFT = defineSql("auth", "mfa_recovery_count_left", "SELECT count(*) AS n FROM aut_mfa_recovery_code WHERE staff_id = ?1 AND used_at IS NULL AND revoked_at IS NULL");

const TD_COLS = "id, staff_id, label, created_at, last_used_at, expires_at";
const TRUSTED_INSERT = defineSql(
  "auth",
  "trusted_insert",
  "INSERT INTO aut_trusted_device (id, staff_id, token_hash, label, created_at, created_by, updated_at, updated_by, last_used_at, expires_at, revoked_at, revoke_reason) VALUES (?1, ?2, ?3, ?4, ?5, ?2, ?5, ?2, ?5, ?6, NULL, NULL)",
);
const TRUSTED_FIND = defineSql("auth", "trusted_find", `SELECT ${TD_COLS} FROM aut_trusted_device WHERE token_hash = ?1 AND staff_id = ?2 AND revoked_at IS NULL AND expires_at > ?3`);
const TRUSTED_TOUCH = defineSql("auth", "trusted_touch", "UPDATE aut_trusted_device SET last_used_at = ?2, updated_at = ?2 WHERE id = ?1 AND revoked_at IS NULL");
const TRUSTED_REVOKE = defineSql("auth", "trusted_revoke", "UPDATE aut_trusted_device SET revoked_at = ?4, revoke_reason = ?3, updated_at = ?4, updated_by = ?5 WHERE id = ?1 AND staff_id = ?2 AND revoked_at IS NULL");
const TRUSTED_REVOKE_ALL = defineSql("auth", "trusted_revoke_all", "UPDATE aut_trusted_device SET revoked_at = ?3, revoke_reason = ?2, updated_at = ?3, updated_by = ?4 WHERE staff_id = ?1 AND revoked_at IS NULL");
// Ngưng tài khoản (Task 8, bất biến R-AUT-MFA-3): thu hồi mọi máy tin CHỈ KHI tài khoản đang ngưng lúc câu chạy (đặt cuối lô ngưng, như câu kết thúc phiên).
const TRUSTED_REVOKE_ALL_IF_SUSPENDED = defineSql("auth", "trusted_revoke_all_if_suspended",
  "UPDATE aut_trusted_device SET revoked_at = ?2, revoke_reason = 'ngung', updated_at = ?2, updated_by = ?3 WHERE staff_id = ?1 AND revoked_at IS NULL " +
    "AND EXISTS (SELECT 1 FROM v_stf_staff_label WHERE id = ?1 AND active = 0)");
// IT/Toàn quyền gỡ MỘT phiên (ADR-0075 điều 6c): thu hồi máy được tin GẮN VỚI phiên đó ('bi_go') CHỈ KHI chính lô gỡ vừa kết thúc phiên (khớp đủ lý do,
// mốc giờ, người gỡ của dòng phiên) — phiên vào không qua máy tin (trusted_device_id NULL) hay đã kết thúc từ trước thì không đổi dòng nào.
const TRUSTED_REVOKE_OF_SESSION = defineSql("auth", "trusted_revoke_of_session",
  "UPDATE aut_trusted_device SET revoked_at = ?2, revoke_reason = 'bi_go', updated_at = ?2, updated_by = ?3 WHERE revoked_at IS NULL " +
    "AND id = (SELECT trusted_device_id FROM aut_session WHERE id = ?1 AND end_reason = 'bi_go' AND ended_at = ?2 AND ended_by = ?3) " +
    "AND staff_id = (SELECT staff_id FROM aut_session WHERE id = ?1)");
const TRUSTED_LIST = defineSql("auth", "trusted_list", `SELECT ${TD_COLS} FROM aut_trusted_device WHERE staff_id = ?1 AND revoked_at IS NULL ORDER BY last_used_at DESC, id`);

// ---- Mã email (Phần C, migration 0102). Chỉ băm: email_hash (địa chỉ chuẩn hoá), code_hash ("<staffId>:<id>:<mã>"). Mã sống 10 phút, tối đa 5 lần nhập.
export type EmailCodePurpose = "login" | "enroll";
// Gửi mã mới: huỷ MỌI mã còn mở của (người, mục đích) — kể cả mã đã hết hạn chưa dùng (chỉ mục duy nhất aut_mfa_email_code_one_open là lưới).
const EMAIL_CODE_REVOKE_OPEN = defineSql("auth", "email_code_revoke_open",
  "UPDATE aut_mfa_email_code SET revoked_at = ?3, updated_at = ?3, updated_by = ?4 WHERE staff_id = ?1 AND purpose = ?2 AND used_at IS NULL AND revoked_at IS NULL");
const EMAIL_CODE_INSERT = defineSql("auth", "email_code_insert",
  "INSERT INTO aut_mfa_email_code (id, staff_id, purpose, email_hash, code_hash, created_at, created_by, updated_at, updated_by, expires_at, attempts, used_at, revoked_at) " +
    "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?8, ?6, ?8, ?7, 0, NULL, NULL)");
// Mã đang mở (chưa dùng, chưa huỷ, chưa hết hạn, chưa đủ 5 lần) — không trả băm mã.
const EMAIL_CODE_OPEN = defineSql("auth", "email_code_open",
  "SELECT id, email_hash FROM aut_mfa_email_code WHERE staff_id = ?1 AND purpose = ?2 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?3 AND attempts < 5 " +
    "ORDER BY created_at DESC, id DESC LIMIT 1");
// Dùng MỘT lần: người gọi đòi changes = 1.
const EMAIL_CODE_TRY = defineSql("auth", "email_code_try",
  "UPDATE aut_mfa_email_code SET used_at = ?4, updated_at = ?4 WHERE id = ?1 AND staff_id = ?2 AND code_hash = ?3 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?4 AND attempts < 5");
// Đếm lần nhập sai; dừng ở 5 (CHECK attempts BETWEEN 0 AND 5 — lần thứ 6 không làm vỡ câu).
const EMAIL_CODE_BUMP = defineSql("auth", "email_code_bump",
  "UPDATE aut_mfa_email_code SET attempts = attempts + 1, updated_at = ?2 WHERE id = ?1 AND attempts < 5 AND used_at IS NULL AND revoked_at IS NULL");

export const emailCodeRevokeOpenStatement = (db: D1Database, staffId: string, purpose: EmailCodePurpose, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(EMAIL_CODE_REVOKE_OPEN).bind(staffId, purpose, at, by);
export const emailCodeInsertStatement = (
  db: D1Database,
  r: { id: string; staffId: string; purpose: EmailCodePurpose; emailHash: string; codeHash: string; at: string; expiresAt: string; by: string | null },
): D1PreparedStatement => db.prepare(EMAIL_CODE_INSERT).bind(r.id, r.staffId, r.purpose, r.emailHash, r.codeHash, r.at, r.expiresAt, r.by);
export const emailCodeOpen = (db: D1Database, staffId: string, purpose: EmailCodePurpose, now: string): Promise<{ id: string; email_hash: string } | null> =>
  db.prepare(EMAIL_CODE_OPEN).bind(staffId, purpose, now).first<{ id: string; email_hash: string }>();
export const emailCodeTryStatement = (db: D1Database, id: string, staffId: string, codeHash: string, at: string): D1PreparedStatement =>
  db.prepare(EMAIL_CODE_TRY).bind(id, staffId, codeHash, at);
export const emailCodeBumpStatement = (db: D1Database, id: string, at: string): D1PreparedStatement => db.prepare(EMAIL_CODE_BUMP).bind(id, at);

export async function factorListLive(db: D1Database, staffId: string): Promise<MfaFactorRow[]> {
  return (await db.prepare(FACTOR_LIST_LIVE).bind(staffId).all<MfaFactorRow>()).results;
}
export async function staffIdsWithFactor(db: D1Database): Promise<Set<string>> {
  return new Set((await db.prepare(FACTOR_STAFF_LIVE).all<{ staff_id: string }>()).results.map((r) => r.staff_id));
}
export const factorInsertStatement = (
  db: D1Database,
  r: { id: string; staffId: string; kind: MfaKind; secretEnc: string | null; email: string | null; at: string; by: string | null },
): D1PreparedStatement => db.prepare(FACTOR_INSERT).bind(r.id, r.staffId, r.kind, r.secretEnc, r.email, r.at, r.by);
export const factorEndStatement = (db: D1Database, id: string, staffId: string, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(FACTOR_END).bind(id, staffId, at, by);
export const factorEndKeepOneStatement = (db: D1Database, id: string, staffId: string, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(FACTOR_END_KEEP_ONE).bind(id, staffId, at, by);
export const factorEndAllStatement =(db: D1Database, staffId: string, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(FACTOR_END_ALL).bind(staffId, at, by);
export const totpConsumeStatement = (db: D1Database, id: string, step: number, at: string): D1PreparedStatement => db.prepare(TOTP_CONSUME).bind(id, step, at);

export const recoveryInsertStatement = (db: D1Database, r: { id: string; staffId: string; batchId: string; codeHash: string; at: string; by: string | null }): D1PreparedStatement =>
  db.prepare(RECOVERY_INSERT).bind(r.id, r.staffId, r.batchId, r.codeHash, r.at, r.by);
export const recoveryRevokeAllStatement = (db: D1Database, staffId: string, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(RECOVERY_REVOKE_ALL).bind(staffId, at, by);
export const recoveryUseStatement = (db: D1Database, staffId: string, codeHash: string, at: string): D1PreparedStatement =>
  db.prepare(RECOVERY_USE).bind(staffId, codeHash, at);
export async function recoveryCountLeft(db: D1Database, staffId: string): Promise<number> {
  return (await db.prepare(RECOVERY_COUNT_LEFT).bind(staffId).first<{ n: number }>())?.n ?? 0;
}

export const trustedInsertStatement = (
  db: D1Database,
  r: { id: string; staffId: string; tokenHash: string; label: string; at: string; expiresAt: string },
): D1PreparedStatement => db.prepare(TRUSTED_INSERT).bind(r.id, r.staffId, r.tokenHash, r.label, r.at, r.expiresAt);
export const trustedFind = (db: D1Database, tokenHash: string, staffId: string, now: string): Promise<TrustedDeviceRow | null> =>
  db.prepare(TRUSTED_FIND).bind(tokenHash, staffId, now).first<TrustedDeviceRow>();
export const trustedTouchStatement = (db: D1Database, id: string, at: string): D1PreparedStatement => db.prepare(TRUSTED_TOUCH).bind(id, at);
export const trustedRevokeStatement = (db: D1Database, id: string, staffId: string, reason: TrustedRevokeReason, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(TRUSTED_REVOKE).bind(id, staffId, reason, at, by);
export const trustedRevokeAllStatement = (db: D1Database, staffId: string, reason: TrustedRevokeReason, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(TRUSTED_REVOKE_ALL).bind(staffId, reason, at, by);
export const trustedRevokeAllIfSuspendedStatement = (db: D1Database, staffId: string, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(TRUSTED_REVOKE_ALL_IF_SUSPENDED).bind(staffId, at, by);
export const trustedRevokeOfSessionStatement = (db: D1Database, sessionId: string, at: string, by: string): D1PreparedStatement =>
  db.prepare(TRUSTED_REVOKE_OF_SESSION).bind(sessionId, at, by);
export async function trustedList(db: D1Database, staffId: string): Promise<TrustedDeviceRow[]> {
  return (await db.prepare(TRUSTED_LIST).bind(staffId).all<TrustedDeviceRow>()).results;
}
