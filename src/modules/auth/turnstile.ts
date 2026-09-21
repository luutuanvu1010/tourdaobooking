// Cloudflare Turnstile ở màn hình đăng nhập — PHÍA MÁY CHỦ (đặc tả v1.0, việc 1). Tệp THUẦN, không import gì:
// `node --test` chạy thẳng, và `fetch` được tiêm vào nên test không chạm mạng. Route ghép nó vào ở ./index.ts.
//
// Ba trạng thái của một lần kiểm (đóng khi lỗi — mọi trường hợp không chắc chắn đều KHÔNG cho qua):
//   ok          Cloudflare xác nhận token.
//   failed      token thiếu/sai/hết hạn/đã dùng            → route trả 403 `turnstile_failed`
//   unavailable Cloudflare không trả lời/lỗi/hết giờ/cấu hình secret hỏng → route trả 503 `turnstile_unavailable`
// `detail` là mã ngắn cho nhật ký vận hành (không bao giờ chứa secret hay token).

export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
/** Hạn chót cho cả lời gọi siteverify (kể cả đọc thân trả về). */
export const TURNSTILE_TIMEOUT_MS = 5000;
/**
 * Token Turnstile dài tối đa 2048 ký tự; dài hơn coi là sai nên không tốn một lời gọi mạng.
 * ĐÃ ĐỐI CHIẾU 2026-09-21 với tài liệu Cloudflare (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/, mục đặc điểm của token: "Maximum length: 2048 characters"): khớp ngưỡng này. Vẫn nên xem log ngay sau khi bật khoá thật ở production
 * (`turnstile_failed` kèm `missing_token` hàng loạt = ngưỡng hoặc máy khách sai); khoá thử của Cloudflare cấp token ngắn nên e2e không bắt được lỗi loại này.
 * Giá trị KHÔNG đổi ở đây; muốn đổi thì sửa hằng số này và kiểm `turnstile.test.ts` (ca 2048 / 2049 ký tự).
 */
export const MAX_TOKEN_LENGTH = 2048;

/** Phần của `Env` mà Turnstile cần. Cả hai đều có thể VẮNG (chưa cấu hình) nên đều tuỳ chọn. */
export interface TurnstileEnv {
  /** Khoá công khai của widget (`vars`). */
  TURNSTILE_SITE_KEY?: string;
  /** Khoá bí mật (`wrangler secret put` / `.dev.vars`). Vắng → không kiểm Turnstile. */
  TURNSTILE_SECRET_KEY?: string;
}

const clean = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim(); // secret dán bằng `echo … | wrangler secret put` hay dính ký tự xuống dòng
  return t === "" ? null : t;
};

/** Khoá bí mật đã cấu hình, hoặc null = chưa cấu hình ⇒ đăng nhập BỎ QUA bước Turnstile (đặc tả: không khoá chết local/e2e/lần deploy đầu). */
export const turnstileSecret = (env: TurnstileEnv): string | null => clean(env.TURNSTILE_SECRET_KEY);

/** Khoá site cho trang đăng nhập dựng widget: chỉ khi có CẢ secret lẫn khoá site; ngược lại null (trang không dựng widget). */
export const turnstileSiteKey = (env: TurnstileEnv): string | null => (turnstileSecret(env) === null ? null : clean(env.TURNSTILE_SITE_KEY));

export type TurnstileResult = { ok: true } | { ok: false; reason: "failed" | "unavailable"; detail: string };

export interface TurnstileInput {
  secret: string;
  /** Token từ thân request — chưa được tin nên kiểu `unknown`. */
  token: unknown;
  /** `CF-Connecting-IP`; chỉ gửi đi khi đúng là địa chỉ IP. */
  ip: string | null;
  /** Ghi đè hạn chót (chỉ để test không phải đợi 5 giây). */
  timeoutMs?: number;
}

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6 = /^(?=(?:[^:]*:){2})[0-9a-f:.]{2,45}$/i;
const isIp = (s: string): boolean => IPV4.test(s) || IPV6.test(s);

/** Mã lỗi phía Cloudflare/cấu hình — người dùng không có lỗi, nên KHÔNG đổ thành "chưa xác minh được bạn là người thật". */
const SERVER_SIDE_CODES = new Set(["internal-error", "invalid-input-secret", "missing-input-secret"]);

const unavailable = (detail: string): TurnstileResult => ({ ok: false, reason: "unavailable", detail });

/** Lấy `error-codes` dạng an toàn để ghi nhật ký (chỉ chữ thường/số/gạch, tối đa 5 mã). */
function errorCodes(data: unknown): string[] {
  const raw = (data as { "error-codes"?: unknown } | null | undefined)?.["error-codes"];
  return Array.isArray(raw) ? raw.filter((c): c is string => typeof c === "string" && /^[a-z0-9-]{1,64}$/.test(c)).slice(0, 5) : [];
}

async function exchange(input: TurnstileInput, token: string, fetchImpl: typeof fetch, signal: AbortSignal): Promise<TurnstileResult> {
  const form = new URLSearchParams({ secret: input.secret, response: token });
  if (input.ip !== null && isIp(input.ip)) form.set("remoteip", input.ip);
  let res: Response;
  try {
    res = await fetchImpl(TURNSTILE_VERIFY_URL, { method: "POST", body: form, signal });
  } catch {
    return unavailable("network");
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = undefined; // thân rỗng/không phải JSON: xử lý ở dưới theo mã HTTP
  }
  const success = (data as { success?: unknown } | null | undefined)?.success;
  const serverSide = errorCodes(data).find((c) => SERVER_SIDE_CODES.has(c));
  if (serverSide && success !== true) return unavailable(serverSide); // vd secret sai: siteverify trả HTTP 400 kèm `invalid-input-secret`
  if (!res.ok) return unavailable(`http_${res.status}`);
  if (typeof success !== "boolean") return unavailable("bad_response");
  return success ? { ok: true } : { ok: false, reason: "failed", detail: errorCodes(data)[0] ?? "rejected" };
}

/**
 * Hỏi Cloudflare xem token Turnstile có hợp lệ không. KHÔNG bao giờ ném lỗi và KHÔNG bao giờ cho qua khi không chắc chắn.
 * Thiếu token (hoặc không phải chuỗi, rỗng, quá dài) → `failed` mà KHÔNG gọi mạng.
 */
export async function verifyTurnstile(input: TurnstileInput, fetchImpl: typeof fetch = fetch): Promise<TurnstileResult> {
  const { token } = input;
  if (typeof token !== "string" || token.trim() === "" || token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: "failed", detail: "missing_token" };

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Đua với hạn chót thay vì chỉ trông vào tín hiệu huỷ: fetch tiêm vào (hay đọc thân chậm) có thể phớt lờ `signal`.
  const expired = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => {
      resolve("timeout"); // trước abort(): kết quả "hết giờ" phải thắng lỗi huỷ do chính ta gây ra
      controller.abort();
    }, input.timeoutMs ?? TURNSTILE_TIMEOUT_MS);
  });
  try {
    const outcome = await Promise.race([exchange(input, token, fetchImpl, controller.signal), expired]);
    return outcome === "timeout" ? unavailable("timeout") : outcome;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

const FAILED_MESSAGE = "Chưa xác minh được bạn là người thật. Hãy thử lại.";
const UNAVAILABLE_MESSAGE = "Chưa kết nối được dịch vụ xác minh. Hãy thử lại sau ít phút.";

/**
 * Quyết định của cổng Turnstile ở đăng nhập — thuần, để route chỉ việc đổi thành Response và ghi nhật ký.
 *   warn `disabled`     chưa đặt secret: BỎ QUA kiểm (không khoá chết local/e2e/lần deploy đầu); route phải `console.warn` MỖI LẦN
 *                       để mất secret không thành tắt lặng lẽ.
 *   warn `no_site_key`  có secret mà thiếu khoá site: vẫn kiểm (đóng khi lỗi) nhưng trang không dựng được widget nên chẳng ai có token — route phải kêu to.
 */
export type TurnstileGate = { warn: "disabled" | "no_site_key" | null } & (
  | { pass: true }
  | { pass: false; status: 403 | 503; code: "turnstile_failed" | "turnstile_unavailable"; message: string; detail: string }
);

/** Một dòng nhật ký vận hành (route in ra dạng JSON một dòng). Chỉ chứa mã/thông điệp cố định — KHÔNG bao giờ có secret, token hay IP. */
export interface TurnstileLogEntry {
  level: "warn" | "error";
  event: "turnstile_disabled" | "turnstile_misconfigured" | "turnstile_failed" | "turnstile_unavailable";
  message?: string;
  /** Mã lý do ngắn đã lọc (`errorCodes()` chỉ nhận `[a-z0-9-]{1,64}`) hoặc `missing_token` / `rejected` / `network` / `timeout` / `http_<mã>`. */
  detail?: string;
}

/**
 * Các dòng nhật ký ứng với một quyết định của cổng — thuần, để test được (route chỉ in ra). Để vận hành thấy sự cố qua `wrangler tail`/Logs:
 *   `turnstile_failed` (403)      warn  — MỘT dòng ngắn mỗi lần bị từ chối: 403 hàng loạt = bot đang dò, hoặc widget/khoá site hỏng ở trình duyệt thật;
 *   `turnstile_unavailable` (503) error — Cloudflare không trả lời được, hoặc secret sai;
 *   `turnstile_disabled`          warn  — chưa đặt secret (mỗi lần đăng nhập, để mất secret không thành tắt lặng lẽ);
 *   `turnstile_misconfigured`     error — có secret mà thiếu khoá site.
 */
export function turnstileLog(gate: TurnstileGate): TurnstileLogEntry[] {
  const entries: TurnstileLogEntry[] = [];
  if (gate.warn === "disabled") entries.push({ level: "warn", event: "turnstile_disabled", message: "Chưa đặt TURNSTILE_SECRET_KEY: đăng nhập KHÔNG được bảo vệ bằng Turnstile." });
  if (gate.warn === "no_site_key") {
    entries.push({ level: "error", event: "turnstile_misconfigured", message: "Có TURNSTILE_SECRET_KEY nhưng thiếu TURNSTILE_SITE_KEY: trang đăng nhập không dựng được widget nên không ai đăng nhập được." });
  }
  if (!gate.pass) entries.push(gate.status === 503 ? { level: "error", event: "turnstile_unavailable", detail: gate.detail } : { level: "warn", event: "turnstile_failed", detail: gate.detail });
  return entries;
}

export async function turnstileGate(env: TurnstileEnv, token: unknown, ip: string | null, fetchImpl: typeof fetch = fetch, timeoutMs?: number): Promise<TurnstileGate> {
  const secret = turnstileSecret(env);
  if (secret === null) return { pass: true, warn: "disabled" };
  const warn = turnstileSiteKey(env) === null ? "no_site_key" : null;
  const result = await verifyTurnstile({ secret, token, ip, timeoutMs }, fetchImpl);
  if (result.ok) return { pass: true, warn };
  return result.reason === "unavailable"
    ? { pass: false, warn, status: 503, code: "turnstile_unavailable", message: UNAVAILABLE_MESSAGE, detail: result.detail }
    : { pass: false, warn, status: 403, code: "turnstile_failed", message: FAILED_MESSAGE, detail: result.detail };
}
