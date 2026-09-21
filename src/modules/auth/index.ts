// Module auth — phiên đăng nhập (cookie ký HMAC) + chống dò PIN + Cloudflare Turnstile ở đăng nhập (./turnstile.ts). Route: /api/auth/*.
// Kiểm quyền từng route KHÔNG nằm ở đây: router (src/shared/router.ts) dùng `currentStaff` do gốc lắp ráp truyền vào.
import { authenticate, getActiveStaff, isValidPin, normalizePhone, type StaffProfile } from "../staff";
import type { AuthConfigResponse, MeResponse } from "../../shared/contracts";
import { error, getCookie, json, readJson } from "../../shared/http";
import { route, type AppModule } from "../../shared/router";
import { SESSION_COOKIE, clearedSessionCookie, createSessionToken, sessionCookie, verifySessionToken } from "./session";
import { IP_LIMIT, PHONE_LIMIT, clearAttempts, ipKey, lockedPhones, phoneKey, reserveAttempts, unlockPhone } from "./throttle";
import { turnstileGate, turnstileLog, turnstileSiteKey } from "./turnstile";

export { lockedPhones, unlockPhone };

/** Độ dài tối thiểu của SESSION_SECRET (khoá ký phiên). */
export const MIN_SECRET_LENGTH = 32;

/** Kiểm cấu hình bắt buộc của auth; trả thông báo lỗi cho log, hoặc null nếu ổn. Không bao giờ in giá trị bí mật. */
export function checkAuthConfig(env: Env): string | null {
  const secret = env.SESSION_SECRET;
  if (typeof secret !== "string" || secret.length === 0) return "Thiếu SESSION_SECRET (wrangler secret put SESSION_SECRET).";
  if (secret.length < MIN_SECRET_LENGTH) return `SESSION_SECRET quá ngắn (${secret.length} < ${MIN_SECRET_LENGTH} ký tự).`;
  return null;
}

const isSecure = (request: Request) => new URL(request.url).protocol === "https:";

/** Nhân viên đang hoạt động ứng với cookie phiên của request, hoặc null. Phiên phát hành trước lần đổi PIN gần nhất bị từ chối. */
export async function currentStaff(request: Request, env: Env): Promise<StaffProfile | null> {
  const token = getCookie(request, SESSION_COOKIE);
  const session = token ? await verifySessionToken(env.SESSION_SECRET, token) : null;
  return session ? getActiveStaff(env.DB, session.staffId, session.issuedAt) : null;
}

/** Header Set-Cookie cho một phiên mới của nhân viên (dùng sau khi đổi PIN để giữ thiết bị hiện tại đăng nhập). */
export async function newSessionCookie(request: Request, env: Env, staffId: string): Promise<string> {
  return sessionCookie(await createSessionToken(env.SESSION_SECRET, staffId), isSecure(request));
}

export type PinAttemptResult =
  | { ok: true; profile: StaffProfile }
  | { ok: false; response: Response };

/**
 * Kiểm SĐT+PIN có chống dò: đặt chỗ lần thử theo SĐT và theo IP trước khi kiểm; quá giới hạn trả 429.
 * Dùng cho đăng nhập và cả đổi PIN (cùng bộ đếm, để đổi PIN không thành đường vòng dò PIN hiện tại).
 */
export async function verifyPinThrottled(request: Request, env: Env, rawPhone: string, pin: string): Promise<PinAttemptResult> {
  const phone = normalizePhone(rawPhone);
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const keys = [{ key: ipKey(ip), max: IP_LIMIT }, ...(phone ? [{ key: phoneKey(phone), max: PHONE_LIMIT }] : [])];
  const reservation = await reserveAttempts(env.DB, keys);
  if (!reservation.allowed) {
    const seconds = reservation.retryAfterSeconds;
    const res = json(
      { error: { code: "too_many_attempts", message: `Nhập sai quá nhiều lần. Thử lại sau ${Math.ceil(seconds / 60)} phút hoặc nhờ quản trị viên mở khoá.`, retryAfterSeconds: seconds } },
      429,
      { "retry-after": String(seconds) },
    );
    return { ok: false, response: res };
  }
  const profile = await authenticate(env.DB, rawPhone, pin);
  if (!profile) return { ok: false, response: error(401, "invalid_credentials", "Số điện thoại hoặc mã PIN không đúng.") };
  await clearAttempts(env.DB, phone ? phoneKey(phone) : null, reservation.ids);
  return { ok: true, profile };
}

/**
 * Phía route của cổng Turnstile ở đăng nhập: `null` = cho qua, hoặc Response chặn (403 `turnstile_failed` / 503 `turnstile_unavailable`). Chạy TRƯỚC
 * `verifyPinThrottled` — kẻ tấn công không có token thì không tiêu hao lượt thử PIN của SĐT nạn nhân (và không làm SĐT đó bị khoá).
 * Quyết định thuần là `turnstileGate` và các dòng nhật ký là `turnstileLog` (cả hai ở ./turnstile.ts, có test; log KHÔNG bao giờ chứa secret/token/IP — kể cả
 * 403 mỗi lần bị từ chối, để vận hành thấy 403 hàng loạt); hàm này chỉ đổi kết quả thành Response và in nhật ký.
 * (Tên khác `turnstileGate` có chủ ý: đây là chỗ DUY NHẤT dựng Response; `turnstileGate` thuần, không biết HTTP.)
 */
async function turnstileBlockResponse(request: Request, env: Env, token: unknown): Promise<Response | null> {
  const gate = await turnstileGate(env, token, request.headers.get("cf-connecting-ip"));
  for (const entry of turnstileLog(gate)) {
    const line = JSON.stringify(entry);
    if (entry.level === "error") console.error(line);
    else console.warn(line);
  }
  return gate.pass ? null : error(gate.status, gate.code, gate.message);
}

export const authModule: AppModule = {
  name: "auth",
  routes: [
    // Công khai: trang đăng nhập hỏi trước khi dựng widget. Khoá site không nhúng cứng vào HTML (local dùng khoá thử của Cloudflare).
    route("GET", "/api/auth/config", "public", async ({ env }) => json({ turnstileSiteKey: turnstileSiteKey(env) } satisfies AuthConfigResponse)),

    route("POST", "/api/auth/login", "public", async ({ request, env }) => {
      const body = await readJson(request);
      const phone = typeof body?.phone === "string" ? body.phone : "";
      const pin = body?.pin;
      if (!phone || !isValidPin(pin)) return error(400, "invalid_input", "Cần số điện thoại và mã PIN 6 số.");
      const blocked = await turnstileBlockResponse(request, env, body?.turnstileToken);
      if (blocked) return blocked;
      const result = await verifyPinThrottled(request, env, phone, pin);
      if (!result.ok) return result.response;
      return json({ staff: result.profile } satisfies MeResponse, 200, { "set-cookie": await newSessionCookie(request, env, result.profile.id) });
    }),

    route("GET", "/api/auth/me", "staff", async ({ staff }) => json({ staff } satisfies MeResponse)),

    route("POST", "/api/auth/logout", "public", async ({ request }) => json({ ok: true }, 200, { "set-cookie": clearedSessionCookie(isSecure(request)) })),
  ],
};
