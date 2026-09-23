// Ghép thách thức (./challenge.ts) + kiểm WebAuthn (./webauthn.ts) + D1 (./repository.ts) cho các route passkey — ở auth (đăng nhập)
// và ở accounts (bật/gỡ/đặt PIN, qua index.ts). Không ghi nhật ký ở đây: auth không phụ thuộc audit (đặc tả §2.1).
import type { PasskeyDto } from "../../shared/contracts";
import { error, getCookie, json } from "../../shared/http";
import { CHALLENGE_COOKIE, challengeCookie, clearedChallengeCookie, issueChallenge, readChallenge, type ChallengePurpose } from "./challenge";
import { findActivePasskey, markPasskeyUsed, type PasskeyRow } from "./repository";
import { isSecure } from "./session";
import { reserveAttempts } from "./throttle";
import { WebAuthnError, counterRegressed, credentialIdOf, passkeyRelyingParty, verifyAssertion, type RelyingParty } from "./webauthn";

/** Hạn mức xin thách thức theo IP (đặc tả §2.4). Trang đăng nhập lấy sẵn thách thức mỗi lần mở, nên hạn mức rộng. */
export const CHALLENGE_IP_LIMIT = 120;

export const PASSKEY_ERRORS = {
  off: () => error(503, "passkey_unavailable", "Đăng nhập bằng Face ID chưa được bật."),
  expired: () => error(400, "passkey_expired", "Phiên xác nhận Face ID đã hết hạn. Hãy bấm lại."),
  unknown: () => error(401, "passkey_unknown", "Face ID này đã bị gỡ hoặc không thuộc tài khoản nào. Hãy đăng nhập bằng số điện thoại và PIN."),
  invalid: () => error(401, "passkey_invalid", "Không xác nhận được Face ID. Hãy thử lại hoặc đăng nhập bằng PIN."),
  registerInvalid: () => error(400, "passkey_invalid", "Không bật được Face ID. Hãy thử lại."),
  exists: () => error(409, "passkey_exists", "Máy này đã bật Face ID cho tài khoản."),
  none: () => error(409, "passkey_none", "Tài khoản chưa bật Face ID trên máy nào."),
  notYours: () => error(403, "passkey_not_yours", "Face ID này không thuộc tài khoản đang đăng nhập."),
};

let warned = false;

/** Cấu hình RP, hoặc null (TẮT). Ghi cảnh báo MỘT lần mỗi isolate để thiếu cấu hình không thành tắt lặng lẽ (như Turnstile). */
export function passkeyRp(env: Env): RelyingParty | null {
  const rp = passkeyRelyingParty(env);
  if (!rp && !warned) {
    warned = true;
    console.warn(JSON.stringify({ level: "warn", event: env.PASSKEY_RP_ID || env.PASSKEY_ORIGIN ? "passkey_misconfigured" : "passkey_disabled" }));
  }
  return rp;
}

export async function limitChallenge(request: Request, env: Env): Promise<Response | null> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const r = await reserveAttempts(env.DB, [{ key: `webauthn:${ip}`, max: CHALLENGE_IP_LIMIT }]);
  if (r.allowed) return null;
  return json(
    { error: { code: "too_many_attempts", message: `Thử quá nhiều lần. Thử lại sau ${Math.ceil(r.retryAfterSeconds / 60)} phút.`, retryAfterSeconds: r.retryAfterSeconds } },
    429,
    { "retry-after": String(r.retryAfterSeconds) },
  );
}

export async function issuePasskeyChallenge(request: Request, env: Env, purpose: ChallengePurpose, staffId: string | null, extra: string | null = null) {
  const c = await issueChallenge(env.SESSION_SECRET, purpose, staffId, extra);
  return { challenge: c.challenge, cookie: challengeCookie(c.token, isSecure(request)) };
}
export const readPasskeyChallenge = (request: Request, env: Env, purpose: ChallengePurpose, staffId: string | null) =>
  readChallenge(env.SESSION_SECRET, getCookie(request, CHALLENGE_COOKIE), purpose, staffId);
export const clearChallengeCookie = (request: Request): string => clearedChallengeCookie(isSecure(request));

/** Log lý do từ chối — CHỈ mã ngắn, không id khoá/token (N10). */
export function logPasskeyRejected(e: unknown): void {
  console.warn(JSON.stringify({ level: "warn", event: "passkey_rejected", reason: e instanceof WebAuthnError ? e.reason : "unexpected" }));
}

export const toPasskeyDto = (r: PasskeyRow): PasskeyDto => ({ id: r.id, label: r.label, createdAt: r.created_at, lastUsedAt: r.last_used_at });

/**
 * Kiểm một lần xác nhận bằng passkey (đăng nhập hoặc đặt PIN): tìm khoá còn hiệu lực → (nếu `ownerId`) đúng chủ → chữ ký → bộ đếm
 * → (nếu có `gate`) cổng bổ sung của người gọi, chạy TRƯỚC khi tiêu thụ thách thức (vd. cổng bảo trì theo SĐT ở đăng nhập —
 * đặc tả §2.6: "kiểm → cổng bảo trì → dùng một lần") → dùng một lần.
 * Thành công thì `last_used_at` đã được ghi (thách thức này không dùng lại được nữa).
 */
export async function checkPasskeyAssertion(
  env: Env,
  rp: RelyingParty,
  ch: { challenge: string; issuedAt: number },
  credential: unknown,
  ownerId: string | null,
  gate?: (pk: PasskeyRow) => Promise<Response | null>,
): Promise<{ ok: true; passkey: PasskeyRow } | { ok: false; response: Response }> {
  const id = credentialIdOf(credential);
  if (!id) return { ok: false, response: error(400, "invalid_input", "Thiếu dữ liệu Face ID.") };
  const pk = await findActivePasskey(env.DB, id);
  if (!pk) return { ok: false, response: PASSKEY_ERRORS.unknown() };
  if (ownerId !== null && pk.staff_id !== ownerId) return { ok: false, response: PASSKEY_ERRORS.notYours() };
  let signCount: number;
  try {
    ({ signCount } = await verifyAssertion(rp, ch.challenge, { publicKey: pk.public_key, algorithm: pk.algorithm }, credential));
  } catch (e) {
    logPasskeyRejected(e);
    return { ok: false, response: PASSKEY_ERRORS.invalid() };
  }
  if (counterRegressed(pk.sign_count, signCount)) {
    logPasskeyRejected(new WebAuthnError("counter_regressed"));
    return { ok: false, response: PASSKEY_ERRORS.invalid() };
  }
  if (gate) {
    const blocked = await gate(pk);
    if (blocked) return { ok: false, response: blocked };
  }
  if (!(await markPasskeyUsed(env.DB, pk.id, signCount, new Date().toISOString(), new Date(ch.issuedAt).toISOString()))) return { ok: false, response: PASSKEY_ERRORS.expired() };
  return { ok: true, passkey: pk };
}
