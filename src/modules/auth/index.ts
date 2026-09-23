// Module auth — phiên đăng nhập (cookie ký HMAC) + chống dò PIN + Cloudflare Turnstile ở đăng nhập (./turnstile.ts). Route: /api/auth/*.
// Kiểm quyền từng route KHÔNG nằm ở đây: router (src/shared/router.ts) dùng `currentStaff` do gốc lắp ráp truyền vào.
import { getMaintenanceState, maintenanceBlock, toStatus } from "../maintenance";
import { authenticate, getActiveStaff, isValidPin, normalizePhone, recordLogin, type StaffProfile } from "../staff";
import type { AuthConfigResponse, MeResponse, PasskeyRequestOptionsResponse } from "../../shared/contracts";
import { error, getCookie, json, readJson } from "../../shared/http";
import { route, type AppModule } from "../../shared/router";
import { PASSKEY_ERRORS, checkPasskeyAssertion, clearChallengeCookie, issuePasskeyChallenge, limitChallenge, passkeyRp, readPasskeyChallenge } from "./passkey";
import { SESSION_COOKIE, clearedSessionCookie, createSessionToken, isSecure, sessionCookie, verifySessionToken } from "./session";
import { IP_LIMIT, PHONE_LIMIT, clearAttempts, ipKey, lockedPhones, phoneKey, reserveAttempts, unlockPhone } from "./throttle";
import { turnstileGate, turnstileLog, turnstileSiteKey } from "./turnstile";
import { passkeyRelyingParty } from "./webauthn";

export { lockedPhones, unlockPhone };
// Xuất cho module `accounts` (bật/gỡ/đặt PIN bằng Face ID, danh sách passkey của tài khoản — ADR-0016).
export {
  countActivePasskeys, firstUserHandle, insertPasskeyStatement, listActivePasskeys, revokeAllPasskeysIfSuspendedStatement, revokeAllPasskeysStatement, revokePasskeyStatement,
  type PasskeyRow,
} from "./repository";
export { logPasskeyRejected, toPasskeyDto } from "./passkey";
export { PASSKEY_ERRORS, checkPasskeyAssertion, clearChallengeCookie, issuePasskeyChallenge, limitChallenge, passkeyRp, readPasskeyChallenge };
export { verifyRegistration } from "./webauthn";
export { deviceLabel } from "./device-label";

/** Độ dài tối thiểu của SESSION_SECRET (khoá ký phiên). */
export const MIN_SECRET_LENGTH = 32;

/** Kiểm cấu hình bắt buộc của auth; trả thông báo lỗi cho log, hoặc null nếu ổn. Không bao giờ in giá trị bí mật. */
export function checkAuthConfig(env: Env): string | null {
  const secret = env.SESSION_SECRET;
  if (typeof secret !== "string" || secret.length === 0) return "Thiếu SESSION_SECRET (wrangler secret put SESSION_SECRET).";
  if (secret.length < MIN_SECRET_LENGTH) return `SESSION_SECRET quá ngắn (${secret.length} < ${MIN_SECRET_LENGTH} ký tự).`;
  return null;
}

/** Nhân viên đang hoạt động ứng với cookie phiên của request, hoặc null. Phiên phát hành trước lần đổi PIN gần nhất bị từ chối. */
export async function currentStaff(request: Request, env: Env): Promise<StaffProfile | null> {
  const token = getCookie(request, SESSION_COOKIE);
  const session = token ? await verifySessionToken(env.SESSION_SECRET, token) : null;
  return session ? getActiveStaff(env.DB, session.staffId, session.issuedAt) : null;
}

/**
 * Header Set-Cookie cho một phiên mới của nhân viên (dùng sau khi đổi PIN để giữ thiết bị hiện tại đăng nhập, hoặc sau khi
 * đăng nhập bằng Face ID). `issuedAt` (mili-giây): truyền đúng mốc vừa ghi vào `credentials_changed_at` để phiên mới không
 * tự bị thu hồi (`getActiveStaff` từ chối khi `credentials_changed_at > sessionIssuedAt`).
 */
export async function newSessionCookie(request: Request, env: Env, staffId: string, issuedAt = Date.now()): Promise<string> {
  return sessionCookie(await createSessionToken(env.SESSION_SECRET, staffId, issuedAt), isSecure(request));
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
    // `maintenance`: trang đăng nhập hiện banner + đếm ngược khi đang bảo trì. Chỉ {on, endsAt} — KHÔNG lộ ai được phép.
    route("GET", "/api/auth/config", "public", async ({ env }) =>
      json({ turnstileSiteKey: turnstileSiteKey(env), maintenance: toStatus(await getMaintenanceState(env.DB)), passkey: passkeyRelyingParty(env) !== null } satisfies AuthConfigResponse),
    ),

    route("POST", "/api/auth/login", "public", async ({ request, env }) => {
      const body = await readJson(request);
      const phone = typeof body?.phone === "string" ? body.phone : "";
      const pin = body?.pin;
      if (!phone || !isValidPin(pin)) return error(400, "invalid_input", "Cần số điện thoại và mã PIN 6 số.");
      const blocked = await turnstileBlockResponse(request, env, body?.turnstileToken);
      if (blocked) return blocked;
      // Chế độ bảo trì: SĐT không được phép → 503 `maintenance`, cùng một thân cho MỌI SĐT (kể cả không tồn tại). Đặt sau Turnstile và TRƯỚC PIN: không tiêu hao lượt thử PIN.
      const inMaintenance = await maintenanceBlock(env.DB, phone);
      if (inMaintenance) return inMaintenance;
      const result = await verifyPinThrottled(request, env, phone, pin);
      if (!result.ok) return result.response;
      // Ghi nhận đăng nhập thành công cho cột "Đăng nhập gần nhất". Lỗi ghi không được làm hỏng đăng nhập (chỉ là thống kê): ghi log rồi cho qua.
      await recordLogin(env.DB, result.profile.id, new Date().toISOString()).catch((e: unknown) =>
        console.error(JSON.stringify({ level: "error", event: "record_login_failed", message: e instanceof Error ? e.message : String(e) })),
      );
      return json({ staff: result.profile } satisfies MeResponse, 200, { "set-cookie": await newSessionCookie(request, env, result.profile.id) });
    }),

    // ---- Đăng nhập bằng Face ID (passkey, ADR-0016). Công khai: KHÔNG đi qua cổng bảo trì của router nên tự gọi maintenanceBlock. Không Turnstile, không bộ chống dò PIN (không có PIN để dò) — chỉ hạn mức xin thách thức theo IP.
    route("POST", "/api/auth/passkey/options", "public", async ({ request, env }) => {
      const rp = passkeyRp(env);
      if (!rp) return PASSKEY_ERRORS.off();
      const limited = await limitChallenge(request, env);
      if (limited) return limited;
      const { challenge, cookie } = await issuePasskeyChallenge(request, env, "login", null);
      return json(
        { publicKey: { challenge, rpId: rp.rpId, timeout: 120_000, userVerification: "required", allowCredentials: [] } } satisfies PasskeyRequestOptionsResponse,
        200,
        { "set-cookie": cookie },
      );
    }),

    route("POST", "/api/auth/passkey/login", "public", async ({ request, env }) => {
      const rp = passkeyRp(env);
      if (!rp) return PASSKEY_ERRORS.off();
      const credential = (await readJson(request))?.credential;
      const ch = await readPasskeyChallenge(request, env, "login", null);
      if (!ch) return PASSKEY_ERRORS.expired();
      // Thứ tự đặc tả §2.6: kiểm chữ ký/bộ đếm (trong checkPasskeyAssertion) → cổng bảo trì theo SĐT (gate, TRƯỚC dùng một lần) → dùng một lần → recordLogin → td_session.
      // Mốc phiên lấy TRƯỚC khi kiểm (rà soát cuối M-1): khoá bị gỡ trước lúc đánh dấu dùng thì markPasskeyUsed thua (valid_to_at IS NULL); bị gỡ
      // SAU mốc này thì credentials_changed_at > issuedAt nên getActiveStaff thu hồi phiên — phiên không thể "mới hơn" lần gỡ khoá đã sinh ra nó.
      // Còn lại đúng một ca biên: lần gỡ rơi vào CÙNG mili-giây với mốc này (phép so là `>`), cửa sổ 1 ms.
      const issuedAt = Date.now();
      const checked = await checkPasskeyAssertion(env, rp, ch, credential, null, async (pk) => {
        const owner = await getActiveStaff(env.DB, pk.staff_id);
        if (!owner) return PASSKEY_ERRORS.unknown();
        return maintenanceBlock(env.DB, owner.phone);
      });
      if (!checked.ok) return checked.response;
      // Gate ở trên đã xác nhận tài khoản đang hoạt động; đọc lại để có kiểu StaffProfile cho phản hồi (tránh giả định trạng thái không đổi giữa hai lần đọc).
      const profile = await getActiveStaff(env.DB, checked.passkey.staff_id);
      if (!profile) return PASSKEY_ERRORS.unknown();
      await recordLogin(env.DB, profile.id, new Date().toISOString()).catch((e: unknown) =>
        console.error(JSON.stringify({ level: "error", event: "record_login_failed", message: e instanceof Error ? e.message : String(e) })),
      );
      const res = json({ staff: profile } satisfies MeResponse, 200, { "set-cookie": await newSessionCookie(request, env, profile.id, issuedAt) });
      res.headers.append("set-cookie", clearChallengeCookie(request));
      return res;
    }),

    // `maintenance` ở đây chỉ tới được người ĐƯỢC PHÉP khi đang bảo trì (router chặn người khác trước) — giao diện dùng để hiện dải "Đang ở chế độ bảo trì".
    route("GET", "/api/auth/me", "staff", async ({ env, staff }) => json({ staff, maintenance: toStatus(await getMaintenanceState(env.DB)) } satisfies MeResponse)),

    route("POST", "/api/auth/logout", "public", async ({ request }) => json({ ok: true }, 200, { "set-cookie": clearedSessionCookie(isSecure(request)) })),
  ],
};
