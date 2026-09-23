// Thách thức WebAuthn trong cookie tạm ký HMAC (ADR-0016 điều 2, 8) — không lưu D1. THUẦN.
// Khoá ký DẪN XUẤT riêng từ SESSION_SECRET bằng nhãn mục đích, và token có 7 phần (phiên có 3): token thách thức không bao giờ qua được
// `verifySessionToken`, và ngược lại (test ở challenge.test.ts). Token: w1.<mục đích>.<staffId|->.<ms phát hành>.<challenge>.<phụ|->.<chữ ký>.
import { fromBase64Url, timingSafeEqual, toBase64Url } from "../../shared/encoding.ts";

export const CHALLENGE_COOKIE = "td_webauthn";
export const CHALLENGE_TTL_SECONDS = 300;
export type ChallengePurpose = "login" | "register" | "pin";

const KEY_LABEL = "td-webauthn-challenge-v1";
const enc = new TextEncoder();

async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key.slice(), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}
const signingKey = (secret: string) => hmac(enc.encode(secret), KEY_LABEL);

/** `-` là placeholder cho "vắng mặt" trong token; dấu `.` là ký tự phân cách phần. staffId/extra chứa một trong hai thứ
 * này sẽ làm hỏng ngầm việc tách token (Task 7 phải tự tránh, không được để lọt qua rồi đọc lại sai lặng lẽ). */
function assertSafeField(name: string, value: string | null): void {
  if (value === null) return;
  if (value.includes(".") || value === "-") throw new Error(`${name} không hợp lệ cho token thách thức (không được chứa "." hoặc đúng bằng "-").`);
}

export async function issueChallenge(
  secret: string,
  purpose: ChallengePurpose,
  staffId: string | null,
  extra: string | null = null,
  now = Date.now(),
  random: Uint8Array = crypto.getRandomValues(new Uint8Array(32)),
): Promise<{ token: string; challenge: string; issuedAt: number }> {
  assertSafeField("staffId", staffId);
  assertSafeField("extra", extra);
  const challenge = toBase64Url(random);
  const payload = ["w1", purpose, staffId ?? "-", String(now), challenge, extra ?? "-"].join(".");
  return { token: `${payload}.${toBase64Url(await hmac(await signingKey(secret), payload))}`, challenge, issuedAt: now };
}

export async function readChallenge(
  secret: string,
  token: string | null,
  purpose: ChallengePurpose,
  staffId: string | null,
  now = Date.now(),
): Promise<{ challenge: string; issuedAt: number; extra: string | null } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 7) return null;
  const [v, p, s, iat, challenge, extra, sig] = parts as [string, string, string, string, string, string, string];
  if (v !== "w1" || p !== purpose || s !== (staffId ?? "-")) return null;
  let given: Uint8Array;
  try {
    given = fromBase64Url(sig);
  } catch {
    return null;
  }
  const expected = await hmac(await signingKey(secret), parts.slice(0, 6).join("."));
  if (!timingSafeEqual(expected, given)) return null;
  // Không chỉ so byte: base64url không phải song ánh (2 bit đệm cuối của khối 32-byte có thể mang giá trị khác 0 mà vẫn
  // giải mã ra cùng byte — xem test). Ép chữ ký phải đúng CHUỖI canonical, không chỉ đúng byte sau khi giải mã.
  if (toBase64Url(given) !== sig) return null;
  const issuedAt = Number(iat);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 60_000 || now >= issuedAt + CHALLENGE_TTL_SECONDS * 1000) return null;
  return { challenge, issuedAt, extra: extra === "-" ? null : extra };
}

export const challengeCookie = (token: string, secure: boolean): string =>
  `${CHALLENGE_COOKIE}=${token}; Path=/api; Max-Age=${CHALLENGE_TTL_SECONDS}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
export const clearedChallengeCookie = (secure: boolean): string =>
  `${CHALLENGE_COOKIE}=; Path=/api; Max-Age=0; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
