// Luật bước đăng nhập hai lớp + cookie chờ (ADR-0074). Thuần: không I/O, không đọc CSDL.
import { fromBase64Url, timingSafeEqual, toBase64Url } from "../../shared/encoding.ts";
import { isExternalPermission, type PermissionCode } from "../../shared/permissions.ts";

export type MfaFactor = "TOTP" | "EMAIL";
export type LoginStep = "session" | "mfa" | "enroll" | "blocked_no_factor";

/** Tài khoản nội bộ = có ít nhất một quyền không thuộc nhóm bên ngoài (cùng hằng EXTERNAL_PERMISSIONS với LC-1 và migration ân hạn). */
export const isInternal = (perms: readonly PermissionCode[]): boolean => perms.some((p) => !isExternalPermission(p));

/** ADR-0074 điều 7: Quản trị, Toàn quyền, Kế toán chỉ được TOTP (email không đủ tin cho quyền nhạy cảm); còn lại TOTP hoặc email. */
export function allowedFactors(perms: readonly PermissionCode[]): MfaFactor[] {
  return perms.some((p) => p === "ADMIN" || p === "SUPER_ADMIN" || p === "ACCOUNTING") ? ["TOTP"] : ["TOTP", "EMAIL"];
}

/**
 * Nhãn "Hai lớp: Đã bật" ở Quản lý tài khoản (Phần C Task 4): có ít nhất một yếu tố sống mà quyền HIỆN TẠI cho dùng (`allowedFactors`). Dòng EMAIL lệch
 * của tài khoản giữ Quản trị / Toàn quyền / Kế toán (dữ liệu sửa tay; bất biến R-AUT-MFA-4) không dùng được ở bước đăng nhập nên không tính là đã bật.
 */
export const daBatHaiLop = (perms: readonly PermissionCode[], kinds: readonly MfaFactor[]): boolean => {
  const choPhep = allowedFactors(perms);
  return kinds.some((k) => choPhep.includes(k));
};

export type LoginStepInput = {
  perms: readonly PermissionCode[];
  hasFactor: boolean;
  trusted: boolean;
  graceUntil: string | null;
  enrollUntil: string | null;
  nowIso: string;
};

/** Sau khi PIN/passkey đúng: đi tiếp bước nào. Các mốc là chuỗi ISO UTC cùng định dạng nên so chuỗi được. */
export function loginStep(i: LoginStepInput): LoginStep {
  if (i.hasFactor) return i.trusted ? "session" : "mfa";
  if (i.enrollUntil !== null && i.enrollUntil > i.nowIso) return "enroll";
  if (!isInternal(i.perms)) return "session";
  return i.graceUntil !== null && i.graceUntil > i.nowIso ? "session" : "blocked_no_factor";
}

/** Dải báo cho `/api/auth/me`: nội bộ chưa có yếu tố thì bắt buộc bật; `graceUntil` chỉ trả khi còn hiệu lực. */
export function mfaBanner(i: LoginStepInput): { required: boolean; graceUntil: string | null } {
  const required = !i.hasFactor && isInternal(i.perms);
  const graceUntil = required && i.graceUntil !== null && i.graceUntil > i.nowIso ? i.graceUntil : null;
  return { required, graceUntil };
}

// ---- Cookie chờ (giữa bước PIN/passkey và bước mã) ----
export const PENDING_COOKIE = "td_mfa_pending";
export const PENDING_TTL_SECONDS = 300;
export type PendingPurpose = "verify" | "enroll";

const enc = new TextEncoder();
async function hmacBytes(keyBytes: Uint8Array, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
/** Khoá ký riêng, dẫn xuất từ SESSION_SECRET: token chờ và token phiên không dùng lẫn được. */
const pendingKey = (secret: string): Promise<Uint8Array> => hmacBytes(enc.encode(secret), "td-mfa-pending-v1");

export async function createPendingToken(secret: string, staffId: string, purpose: PendingPurpose, nowMs: number): Promise<string> {
  const payload = `mfa1.${staffId}.${nowMs}.${purpose}`;
  return `${payload}.${toBase64Url(await hmacBytes(await pendingKey(secret), payload))}`;
}

export async function verifyPendingToken(secret: string, token: string, nowMs: number): Promise<{ staffId: string; purpose: PendingPurpose; issuedAt: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "mfa1") return null;
  const [, staffId, iat, purpose, sig] = parts as [string, string, string, string, string];
  if (purpose !== "verify" && purpose !== "enroll") return null;
  let given: Uint8Array;
  try {
    given = fromBase64Url(sig);
  } catch {
    return null;
  }
  if (!timingSafeEqual(await hmacBytes(await pendingKey(secret), `mfa1.${staffId}.${iat}.${purpose}`), given)) return null;
  const issuedAt = Number(iat);
  if (!Number.isFinite(issuedAt) || issuedAt > nowMs + 60_000) return null;
  return nowMs < issuedAt + PENDING_TTL_SECONDS * 1000 ? { staffId, purpose, issuedAt } : null;
}

export function pendingCookie(token: string, secure: boolean): string {
  return `${PENDING_COOKIE}=${token}; Path=/api/auth/mfa; Max-Age=${PENDING_TTL_SECONDS}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function clearedPendingCookie(secure: boolean): string {
  return `${PENDING_COOKIE}=; Path=/api/auth/mfa; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

// ---- Phiếu bật TOTP (ADR-0074 điều 5; kế hoạch Task 5): `POST /api/account/mfa/totp/start` chưa ghi CSDL — khoá mới (ĐÃ mã hoá AES-GCM) đi trong phiếu
// ký HMAC (khoá dẫn xuất riêng, khác cookie chờ và phiên), gắn mã người, sống 10 phút. Bước xác nhận đọc lại khoá từ phiếu; chỉ khi mã đúng mới lưu.
export const SETUP_TTL_SECONDS = 600;
const setupKey = (secret: string): Promise<Uint8Array> => hmacBytes(enc.encode(secret), "td-totp-setup-v1");
const ENC_PART = /^[A-Za-z0-9_-]+$/;

/** `secretEnc` là chuỗi `v1.<iv>.<ct>` của encryptSecret; phiếu = `ts1.<staffId>.<iat>.v1.<iv>.<ct>.<chữ ký>`. */
export async function createSetupToken(secret: string, staffId: string, secretEnc: string, nowMs: number): Promise<string> {
  const payload = `ts1.${staffId}.${nowMs}.${secretEnc}`;
  return `${payload}.${toBase64Url(await hmacBytes(await setupKey(secret), payload))}`;
}

export async function verifySetupToken(secret: string, token: string, nowMs: number): Promise<{ staffId: string; secretEnc: string; issuedAt: number } | null> {
  if (token.length > 512) return null;
  const parts = token.split(".");
  if (parts.length !== 7 || parts[0] !== "ts1" || parts[3] !== "v1") return null;
  const [, staffId, iat, , iv, ct, sig] = parts as [string, string, string, string, string, string, string];
  if (!ENC_PART.test(iv) || !ENC_PART.test(ct)) return null;
  let given: Uint8Array;
  try {
    given = fromBase64Url(sig);
  } catch {
    return null;
  }
  const secretEnc = `v1.${iv}.${ct}`;
  if (!timingSafeEqual(await hmacBytes(await setupKey(secret), `ts1.${staffId}.${iat}.${secretEnc}`), given)) return null;
  const issuedAt = Number(iat);
  if (!Number.isFinite(issuedAt) || issuedAt > nowMs + 60_000) return null;
  return nowMs < issuedAt + SETUP_TTL_SECONDS * 1000 ? { staffId, secretEnc, issuedAt } : null;
}
