import { fromBase64Url, timingSafeEqual, toBase64Url } from "../../shared/encoding.ts";

export const SESSION_COOKIE = "td_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/** Cookie phiên/thách thức chỉ thêm `Secure` khi kết nối thật là https (local http vẫn nhận cookie được). Dùng chung cho mọi cookie ký HMAC của module auth (session.ts, passkey.ts) — chỉ xuất MỘT lần ở đây, tránh trùng logic. */
export const isSecure = (request: Request): boolean => new URL(request.url).protocol === "https:";

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

/**
 * Token = `staffId.<phát hành, mili-giây>.<mã phiên>.<chữ ký>` (ADR-0075 điều 1); hết hạn = phát hành + SESSION_TTL. Token kiểu cũ 3 phần bị từ chối
 * → đăng nhập lại một lần. Mã phiên do máy chủ sinh bằng `crypto.randomUUID()` (không chứa dấu chấm).
 */
export async function createSessionToken(secret: string, staffId: string, sessionId: string, now = Date.now()): Promise<string> {
  const payload = `${staffId}.${now}.${sessionId}`;
  return `${payload}.${toBase64Url(await hmac(secret, payload))}`;
}

/** Trả staffId + mã phiên + thời điểm phát hành (mili-giây) nếu token hợp lệ và chưa hết hạn (`ignoreExpiry`: bỏ qua hạn, vẫn kiểm chữ ký và đồng hồ lạ — cho route báo lý do đăng xuất). Dòng `aut_session` do người gọi kiểm. */
export async function verifySessionToken(
  secret: string,
  token: string,
  now = Date.now(),
  opts: { ignoreExpiry?: boolean } = {},
): Promise<{ staffId: string; sessionId: string; issuedAt: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [staffId, iat, sessionId, sig] = parts as [string, string, string, string];
  let given: Uint8Array;
  try {
    given = fromBase64Url(sig);
  } catch {
    return null;
  }
  if (!timingSafeEqual(await hmac(secret, `${staffId}.${iat}.${sessionId}`), given)) return null;
  const issuedAt = Number(iat);
  if (!Number.isFinite(issuedAt) || issuedAt > now + 60_000) return null; // chữ ký đúng nhưng đồng hồ lạ: từ chối
  return opts.ignoreExpiry || now < issuedAt + SESSION_TTL_SECONDS * 1000 ? { staffId, sessionId, issuedAt } : null;
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function clearedSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}
