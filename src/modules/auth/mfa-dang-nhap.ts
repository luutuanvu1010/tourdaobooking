// Bước hai của đăng nhập (ADR-0074 điều 2–3): kiểm mã TOTP / mã dự phòng, cookie máy được tin. Route ở ./index.ts (`POST /api/auth/login`, `POST /api/auth/mfa/verify`).
// KHÔNG BAO GIỜ đưa khoá TOTP (thô hay đã mã hoá), mã người dùng gõ, mã dự phòng, token máy tin vào nhật ký, log máy, DTO hay câu lỗi.
import { checkMfaKey, decryptSecret, normalizeRecoveryCode, recoveryHash } from "./mfa-crypto";
import { factorListLive, recoveryUseStatement, totpConsumeStatement } from "./mfa-repo";
import { attemptDeleteKeyStatement, lockedMfaKeys } from "./repository";
import { LOGIN_WINDOW_MS, phoneKey } from "./throttle";
import { matchTotp } from "./totp";

/** Hạn mức bước hai: 5 lần sai / 15 phút, khoá theo TÀI KHOẢN (`mfa:<staffId>`) — không theo cookie chờ (người có PIN tự tạo được cookie chờ mới). */
export const MFA_LIMIT = 5;
export const mfaKey = (staffId: string): string => `mfa:${staffId}`;

/** Id các tài khoản đang bị khoá bước hai (khoá `mfa:<id>` đủ MFA_LIMIT lần sai trong cửa sổ 15 phút) — bảng Quản lý tài khoản hiện "bị khoá" (kế hoạch Task 6). */
export async function lockedMfaStaffIds(db: D1Database, now = Date.now()): Promise<Set<string>> {
  return new Set((await lockedMfaKeys(db, now - LOGIN_WINDOW_MS, MFA_LIMIT)).map((k) => k.slice("mfa:".length)));
}
/** Câu (CHƯA chạy) xoá bộ đếm bước hai của tài khoản — gộp vào lô Quản trị tắt lớp hai, để bật lại ngay không bị 429 (kế hoạch Task 6). */
export const clearMfaAttemptsStatement = (db: D1Database, staffId: string): D1PreparedStatement => attemptDeleteKeyStatement(db, mfaKey(staffId));
/**
 * Nút "Mở khoá" của Quản trị (kế hoạch Task 6, nhóm (c) của người kiểm độc lập Task 3–4): gỡ CẢ khoá "sai PIN quá nhiều" (`phone:`) lẫn khoá "sai mã bước hai
 * quá nhiều" (`mfa:<id>`) trong MỘT lô. Phạm vi quyền của nút do route giữ — không đổi.
 */
export async function unlockLogin(db: D1Database, phone: string, staffId: string): Promise<void> {
  await db.batch([attemptDeleteKeyStatement(db, phoneKey(phone)), clearMfaAttemptsStatement(db, staffId)]);
}

export const TRUSTED_COOKIE = "td_trusted";
export const TRUSTED_TTL_SECONDS = 30 * 86_400;
/** Cookie máy được tin: token 32 byte ngẫu nhiên (CSDL chỉ giữ SHA-256), chỉ gửi tới /api/auth (đăng nhập), 30 ngày. */
export function trustedCookie(token: string, secure: boolean): string {
  return `${TRUSTED_COOKIE}=${token}; Path=/api/auth; Max-Age=${TRUSTED_TTL_SECONDS}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

/** Log một dòng KHÔNG chứa khoá (chỉ tên sự kiện + lý do cố định). */
const logMfa = (event: "mfa_key_missing" | "mfa_decrypt_failed", reason: string): void =>
  console.error(JSON.stringify({ level: "error", event, message: reason }));

/** Máy chủ có khoá giải mã hợp lệ không — thiếu/sai thì ghi log `mfa_key_missing` (không in khoá) và trả false. */
export function mfaKeyReady(env: Env): boolean {
  const err = checkMfaKey(env);
  if (err) logMfa("mfa_key_missing", err);
  return err === null;
}

/**
 * Kiểm mã TOTP của yếu tố TOTP còn sống: giải mã khoá → khớp bước 0/−1/+1 → MỘT câu `UPDATE … WHERE last_totp_step < ?` (đòi changes = 1: mã đã dùng,
 * hay mã của bước cũ hơn bước đã dùng, bị từ chối — kể cả hai yêu cầu cùng mã chạy song song). `"unavailable"` = khoá không giải mã được (cấu hình sai).
 */
export async function useTotp(env: Env, staffId: string, code: string, nowMs: number): Promise<"ok" | "invalid" | "unavailable"> {
  const f = (await factorListLive(env.DB, staffId)).find((x) => x.kind === "TOTP");
  if (!f?.secret_enc) return "invalid";
  if (!mfaKeyReady(env)) return "unavailable";
  let secret: Uint8Array;
  try {
    secret = await decryptSecret(env.MFA_ENCRYPTION_KEY!, f.secret_enc);
  } catch {
    logMfa("mfa_decrypt_failed", "không giải mã được khoá TOTP (MFA_ENCRYPTION_KEY khác khoá đã dùng lúc bật?)");
    return "unavailable";
  }
  const step = await matchTotp(secret, code, nowMs);
  if (step === null) return "invalid";
  const r = await totpConsumeStatement(env.DB, f.id, step, new Date(nowMs).toISOString()).run();
  return r.meta.changes === 1 ? "ok" : "invalid";
}

/** Dùng MỘT lần một mã dự phòng (chuẩn hoá: bỏ gạch/khoảng trắng, chữ thường). */
export async function useRecoveryCode(db: D1Database, staffId: string, code: string, nowIso: string): Promise<boolean> {
  const n = normalizeRecoveryCode(code);
  if (!n) return false;
  const r = await recoveryUseStatement(db, staffId, await recoveryHash(staffId, n), nowIso).run();
  return r.meta.changes === 1;
}
