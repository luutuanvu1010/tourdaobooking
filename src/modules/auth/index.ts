import { authenticate, getActiveStaff, isValidPin, normalizePhone, type StaffProfile } from "../staff";
import type { MeResponse } from "../../shared/contracts";
import { error, getCookie, json, readJson, type AppModule } from "../../shared/http";
import { SESSION_COOKIE, clearedSessionCookie, createSessionToken, sessionCookie, verifySessionToken } from "./session";
import { IP_LIMIT, PHONE_LIMIT, clearAttempts, ipKey, lockedPhones, phoneKey, reserveAttempts, unlockPhone } from "./throttle";

export { lockedPhones, unlockPhone };

const isSecure = (request: Request) => new URL(request.url).protocol === "https:";

/** Nhân viên đang hoạt động ứng với cookie phiên của request, hoặc null. Phiên phát hành trước lần đổi PIN gần nhất bị từ chối. */
async function currentStaff(request: Request, env: Env): Promise<StaffProfile | null> {
  const token = getCookie(request, SESSION_COOKIE);
  const session = token ? await verifySessionToken(env.SESSION_SECRET, token) : null;
  return session ? getActiveStaff(env.DB, session.staffId, session.issuedAt) : null;
}

/** Dùng chung cho mọi module có API cần đăng nhập: trả StaffProfile, hoặc Response 401 để trả thẳng về client. */
export async function requireStaff(request: Request, env: Env): Promise<StaffProfile | Response> {
  return (await currentStaff(request, env)) ?? error(401, "unauthenticated", "Chưa đăng nhập hoặc phiên đã hết hạn.");
}

/** Như requireStaff nhưng chỉ cho quản trị viên; người khác nhận Response 403. */
export async function requireAdmin(request: Request, env: Env): Promise<StaffProfile | Response> {
  const staff = await requireStaff(request, env);
  if (staff instanceof Response) return staff;
  return staff.role === "admin" ? staff : error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
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

export const authModule: AppModule = {
  name: "auth",
  async handle(request, env) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith("/api/auth/")) return null;

    if (pathname === "/api/auth/login" && request.method === "POST") {
      const body = await readJson(request);
      const phone = typeof body?.phone === "string" ? body.phone : "";
      const pin = body?.pin;
      if (!phone || !isValidPin(pin)) return error(400, "invalid_input", "Cần số điện thoại và mã PIN 6 số.");

      const result = await verifyPinThrottled(request, env, phone, pin);
      if (!result.ok) return result.response;
      return json({ staff: result.profile } satisfies MeResponse, 200, { "set-cookie": await newSessionCookie(request, env, result.profile.id) });
    }

    if (pathname === "/api/auth/me" && request.method === "GET") {
      const staff = await requireStaff(request, env);
      return staff instanceof Response ? staff : json({ staff } satisfies MeResponse);
    }

    if (pathname === "/api/auth/logout" && request.method === "POST") {
      return json({ ok: true }, 200, { "set-cookie": clearedSessionCookie(isSecure(request)) });
    }

    return error(404, "not_found", "Không tìm thấy.");
  },
};
