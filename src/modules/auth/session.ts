import { fromBase64Url, timingSafeEqual, toBase64Url } from "../../shared/encoding";

export const SESSION_COOKIE = "td_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

/** Token = `staffId.<thời điểm phát hành, mili-giây>.<chữ ký>`; hết hạn = phát hành + SESSION_TTL. */
export async function createSessionToken(secret: string, staffId: string, now = Date.now()): Promise<string> {
  const payload = `${staffId}.${now}`;
  return `${payload}.${toBase64Url(await hmac(secret, payload))}`;
}

/** Trả staffId + thời điểm phát hành (mili-giây) nếu token hợp lệ và chưa hết hạn. */
export async function verifySessionToken(
  secret: string,
  token: string,
  now = Date.now(),
): Promise<{ staffId: string; issuedAt: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [staffId, iat, sig] = parts as [string, string, string];
  let given: Uint8Array;
  try {
    given = fromBase64Url(sig);
  } catch {
    return null;
  }
  if (!timingSafeEqual(await hmac(secret, `${staffId}.${iat}`), given)) return null;
  const issuedAt = Number(iat);
  if (!Number.isFinite(issuedAt) || issuedAt > now + 60_000) return null; // chữ ký đúng nhưng đồng hồ lạ: từ chối
  return now < issuedAt + SESSION_TTL_SECONDS * 1000 ? { staffId, issuedAt } : null;
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function clearedSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}
