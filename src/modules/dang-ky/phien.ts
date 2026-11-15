// Phiên đăng ký (ADR-0206 Đ5): cookie `td_dang_ky` ký HMAC bằng khoá dẫn xuất RIÊNG từ SESSION_SECRET (khuôn `pendingKey` của auth/mfa-rules.ts, ADR-0016 Đ8) —
// cookie này không bao giờ qua `verifySessionToken`, và `td_session` không bao giờ qua `docPhienDangKy`. Route đăng ký khai `access: "public"` rồi tự gọi
// `docPhienDangKy` trong thân route; không có cổng router mới. Token = `dk1.<mã phiếu>.<mã danh tính>.<bắt đầu ms>.<thao tác cuối ms>.<chữ ký>`.
// Hạn không thao tác (idleMin) tính từ mốc thao tác cuối; route cấp lại cookie sau mỗi lệnh (giữ mốc bắt đầu) thì phiên sống tiếp, tối đa maxHours từ mốc bắt đầu.
import { fromBase64Url, timingSafeEqual, toBase64Url } from "../../shared/encoding.ts";
import { getCookie } from "../../shared/http.ts";

export const DK_COOKIE = "td_dang_ky";
const enc = new TextEncoder();

async function hmacBytes(keyBytes: Uint8Array, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
const dkKey = (secret: string): Promise<Uint8Array> => hmacBytes(enc.encode(secret), "td-dang-ky-v1");

/** Cấp token. `startMs` bỏ trống = phiên mới (bắt đầu = bây giờ); cấp lại sau một thao tác thì truyền mốc bắt đầu cũ. */
export async function taoPhienDangKy(secret: string, registrationId: string, identityId: string, nowMs: number, startMs: number = nowMs): Promise<string> {
  if (registrationId.includes(".") || identityId.includes(".")) throw new Error("Mã phiếu / danh tính không được chứa dấu chấm.");
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs) || startMs > nowMs) throw new Error("Mốc bắt đầu phiên không được sau mốc hiện tại.");
  const payload = `dk1.${registrationId}.${identityId}.${startMs}.${nowMs}`;
  return `${payload}.${toBase64Url(await hmacBytes(await dkKey(secret), payload))}`;
}

/** Đọc cookie đăng ký của yêu cầu; sai / hết hạn / không có ⇒ null. `policy` lấy từ `dk_policy` (`session_idle_minutes`, `session_max_hours`). */
export async function docPhienDangKy(
  request: Request,
  env: Env,
  nowMs: number,
  policy: { idleMin: number; maxHours: number },
): Promise<{ registrationId: string; identityId: string; startMs: number } | null> {
  const token = getCookie(request, DK_COOKIE);
  if (!token || token.length > 300) return null;
  const parts = token.split(".");
  if (parts.length !== 6 || parts[0] !== "dk1") return null;
  const [, registrationId, identityId, start, last, sig] = parts as [string, string, string, string, string, string];
  let given: Uint8Array;
  try {
    given = fromBase64Url(sig);
  } catch {
    return null;
  }
  if (!timingSafeEqual(await hmacBytes(await dkKey(env.SESSION_SECRET), `dk1.${registrationId}.${identityId}.${start}.${last}`), given)) return null;
  const s = Number(start);
  const l = Number(last);
  if (!Number.isFinite(s) || !Number.isFinite(l) || l < s || l > nowMs + 60_000) return null; // chữ ký đúng nhưng đồng hồ lạ: từ chối
  if (nowMs >= l + policy.idleMin * 60_000 || nowMs >= s + policy.maxHours * 3_600_000) return null;
  return { registrationId, identityId, startMs: s };
}

/** Khoá bộ đếm chống dò (ADR-0206 Đ8): không gian tên `dk:` riêng, không đụng khoá đăng nhập; dùng với `reserveAttempts`, `clearAttempts` của auth. */
export const dkEmailKey = (email: string): string => `dk:email:${email}`;
export const dkIpKey = (ip: string): string => `dk:ip:${ip}`;
export const dkTepIpKey = (ip: string): string => `dk:tep:ip:${ip}`;

/** Set-Cookie của phiên đăng ký: HttpOnly, SameSite=Lax, Secure khi https; Path chỉ /api/dang-ky; Max-Age = hạn tối đa của phiên (hạn không thao tác do chính token kiểm). */
export function cookiePhienDangKy(token: string, maxHours: number, secure: boolean): string {
  return `${DK_COOKIE}=${token}; Path=/api/dang-ky; Max-Age=${Math.floor(maxHours * 3600)}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

/**
 * Khoá băm có khoá (HMAC-SHA256, khoá dẫn xuất riêng từ SESSION_SECRET) cho email, địa chỉ mạng, mã: để khoá bộ đếm `dk:` và `dk_email_code.email_key` KHÔNG chứa email hay địa chỉ ở dạng rõ
 * (khuôn `emailHash` của auth/mfa-email.ts nhưng có khoá — email dễ đoán nên băm trần dò ngược được). `loai` tách không gian băm; trả hex.
 */
export async function khoaBam(secret: string, loai: "email" | "ip" | "ma", giaTri: string): Promise<string> {
  const khoa = await hmacBytes(enc.encode(secret), "td-dang-ky-bam-v1");
  return Array.from(await hmacBytes(khoa, `${loai}:${giaTri}`), (b) => b.toString(16).padStart(2, "0")).join("");
}
