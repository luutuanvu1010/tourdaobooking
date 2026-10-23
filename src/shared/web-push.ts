// WEB PUSH (ADR-0036) — luật thuần dùng ở server: kiểm địa chỉ nhận (Task 1), giờ yên lặng + chọn người nhận + ký VAPID ES256 + gửi
// một lô (Task 2). Không dependency runtime — chỉ Web Crypto (`crypto.subtle`, có ở Worker lẫn Node 22 → test thuần chạy được).
import type { ThayDoiDon } from "./bang-tin.ts";
import type { PermissionHolder } from "./permissions.ts";
import { locHopThongBao, type DongDon, type DongThuCong } from "./thong-bao.ts";
import type { DongChuyen } from "./tin-chuyen.ts";
import { vnHour } from "./vn-date.ts";

/** Tên máy chủ dịch vụ đẩy được coi là hợp lệ — khớp CHÍNH XÁC hoặc là một máy con (subdomain) của các tên này. */
const DUOI_HOP_LE = [".push.apple.com", ".notify.windows.com"];
const DUNG_HOP_LE = ["fcm.googleapis.com", "updates.push.services.mozilla.com"];

/**
 * Địa chỉ nhận (endpoint) do trình duyệt cấp có hợp lệ để máy chủ POST tới không — chặn dùng bảng `ntf_push_sub` làm bàn đạp
 * gọi tới nơi khác (SSRF): chỉ `https:`, dài ≤ 1024 (kiểm TRƯỚC khi parse — chuỗi quá dài không cần parse), host thuộc đúng
 * danh sách dịch vụ đẩy thật (Apple/FCM/Windows/Mozilla). Không throw với đầu vào bất kỳ — luôn trả boolean.
 */
export function kiemDiaChi(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length < 1 || raw.length > 1024) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  // Sửa từ kiểm độc lập Task 1: chỉ đọc u.hostname bỏ lọt cổng lạ (":8443") và userinfo ("u:p@host") — cả hai vẫn là địa chỉ máy chủ
  // đẩy THẬT máy chủ sẽ POST tới nếu host khớp danh sách, nhưng dạng này không phải giá trị trình duyệt cấp thật (PushSubscription.endpoint
  // không có cổng lạ/userinfo) nên từ chối cho chặt. u.port === "" khi là cổng mặc định của https: (443) — URL tự chuẩn hoá.
  if (u.port !== "" || u.username !== "" || u.password !== "") return false;
  const host = u.hostname; // URL đã tách userinfo (user:pass@host) khỏi hostname — "…@evil.com" chỉ còn evil.com ở đây
  if (DUNG_HOP_LE.includes(host)) return true;
  // host.length > d.length: đòi có ít nhất một nhãn con thật đứng trước hậu tố (endsWith khớp cả khi host === d, ví dụ
  // host === ".push.apple.com" — không có máy con nào, không phải địa chỉ trình duyệt cấp thật).
  return DUOI_HOP_LE.some((d) => host.length > d.length && host.endsWith(d));
}

/** Đang trong giờ yên lặng (22:00–06:00 giờ VN, hai đầu: ≥22 hoặc <6). Từ ADR-0039: KHÔNG còn chặn gửi cú gõ cửa (điều đó do
 * `dayGoCua` quyết — nay luôn gửi, xem hàm đó); đây là nguồn luật DUY NHẤT cho cờ `imLang` ở `GET /api/thong-bao/moi-nhat`,
 * để service worker biết hiện thông báo không rung/không kêu (`silent: true`) hay hiện như bình thường. */
export function trongGioYenLang(now: Date): boolean {
  const h = vnHour(now);
  return h >= 22 || h < 6;
}

/** Có nên hiện KHÔNG RUNG (`silent`, ADR-0039) không: tin quan trọng luôn rung như thường; tin thường chỉ im lặng trong giờ yên lặng. */
export function imLang(quanTrong: boolean, now: Date): boolean {
  return !quanTrong && trongGioYenLang(now);
}

/** `THAY_DOI` (`src/shared/bang-tin.ts`, ADR-0022) → hành động của hộp thông báo (`ntf_*`/`loaiTinDon`, ADR-0034) mà `dayGoCua` (Task 3)
 * dựng thành một `DongDon` để đưa qua `nguoiNhanDay`. `sua`/`chuyen`/`tien` = null ở bảng này; riêng "chuyen" / "tien" gốc lắp ráp (`src/index.ts`) gõ cửa
 * theo DÒNG ĐỔI do chính request ghi (ADR-0062, `dayGoCuaDoi` của `thongbao`) — request không ghi dòng đổi thì không rung máy nào. */
const HANH_DONG_CUA_THAY_DOI: Record<ThayDoiDon, string | null> = {
  tao: "created",
  tao_cho_nhan: "created",
  nhan: "order_claimed",
  giao: "order_handler_changed",
  xac_nhan: "confirmed",
  huy: "cancelled",
  sua: null,
  chuyen: null,
  tien: null,
  chot_giao: null, // ADR-0025 điều 8 + ADR-0045: "Đã giao" / "Hoàn thành" không gõ cửa màn hình khoá (bản làm mới §3.14)
  hoan_thanh: null,
  tu_choi: null, // ADR-0030 điều 1 + Q4 (a) chủ 2026-10-23: chỉ thông báo nổi Bảng tin — hộp thông báo / màn hình khoá không có tin "được trả lại"
};
export function hanhDongCuaThayDoi(t: ThayDoiDon): string | null {
  return HANH_DONG_CUA_THAY_DOI[t];
}

/**
 * Ai nhận cú gõ cửa cho MỘT tin (đơn hoặc thủ công) — bọc mỏng `locHopThongBao` (`src/shared/thong-bao.ts`), KHÔNG viết luật quyền mới:
 * với từng tài khoản, dựng đúng hộp ngăn "Của tôi" chỉ chứa một tin này rồi xem tài khoản đó có thấy nó không (đã gồm: chủ đơn, người
 * phụ trách sau, "chờ nhận" cho ai có `dispatch.claim`, người gửi/diễn viên không tự nhận tin của mình, tin đã thu hồi → không ai —
 * mọi luật đó đã có sẵn trong `locHopThongBao`). `now` phải là ISO đủ mili-giây (hàm so chuỗi — xem `chuanHoaMocGio`).
 */
export function nguoiNhanDay(
  taiKhoan: (PermissionHolder & { readonly partyId?: string | null })[],
  tin: { don: DongDon } | { loDoi: readonly DongDon[] } | { thuCong: DongThuCong } | { chuyen: DongChuyen },
  now: string,
): string[] {
  // `loDoi` (G17): một LÔ dòng đổi của cùng lệnh (cùng đơn + người làm + mốc) — locHopThongBao gom lô, mỗi tài khoản tối đa một tin.
  const don = "don" in tin ? [tin.don] : "loDoi" in tin ? [...tin.loDoi] : [];
  const thuCong = "thuCong" in tin ? [tin.thuCong] : [];
  const chuyen = "chuyen" in tin ? [tin.chuyen] : []; // ADR-0052 D6.2: tin chuyến — cùng hàm người nhận (tinChuyenCho) qua locHopThongBao
  return taiKhoan
    .filter((tk) => locHopThongBao(tk, { don, thuCong, chuyen, docDenLuc: now, now, ngan: "cua-toi" }).tin.length > 0)
    .map((tk) => tk.id);
}

/** Chia một danh sách thành các lô cỡ `co` (mặc định 40 — trần một lần xếp hàng ở `bangtin` DO, Task 3). Lô cuối có thể ngắn hơn. */
export function chiaLo<T>(ds: T[], co = 40): T[][] {
  const ra: T[][] = [];
  for (let i = 0; i < ds.length; i += co) ra.push(ds.slice(i, i + co));
  return ra;
}

const VAPID_SUB = "https://booking.tourdao.vn"; // Apple nhận https: hoặc mailto:
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uChu = (s: string) => b64u(new TextEncoder().encode(s));

/** JWT ES256 cho VAPID. `khoaBiMat` = JSON JWK P-256 (kty, crv, x, y, d) — đúng dạng lệnh tạo khoá ở Task 5 in ra. */
export async function taoJwtVapid(khoaBiMat: string, aud: string, nowSec: number): Promise<string> {
  const { kty, crv, x, y, d } = JSON.parse(khoaBiMat) as JsonWebKey; // bỏ key_ops/ext: importKey sẽ ném nếu key_ops lệch usages
  const key = await crypto.subtle.importKey("jwk", { kty, crv, x, y, d }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const dau = `${b64uChu(JSON.stringify({ typ: "JWT", alg: "ES256" }))}.${b64uChu(JSON.stringify({ aud, exp: nowSec + 12 * 3600, sub: VAPID_SUB }))}`;
  const chuKy = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(dau));
  return `${dau}.${b64u(chuKy)}`; // Web Crypto trả r‖s 64 byte (IEEE P1363) = đúng dạng JWS ES256 — KHÔNG đổi sang DER
}

const b64uDecode = (s: string): Uint8Array => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/**
 * Khoá công khai TÍNH LẠI từ khoá bí mật (JWK P-256: trường `x`/`y`) có bằng đúng chuỗi khoá công khai đang cấu hình không — cùng
 * dạng "raw" (0x04 ‖ X ‖ Y, 65 byte, base64url) mà lệnh tạo khoá ở Task 5 in ra và `crypto.subtle.exportKey("raw", …)` trả về.
 * Không dùng `crypto.subtle` (không cần ký/verify, chỉ ghép byte) nên chạy đồng bộ, không ném với JSON hỏng/thiếu trường.
 */
function khopCapKhoa(congKhai: string, biMatJwk: string): boolean {
  try {
    const { x, y } = JSON.parse(biMatJwk) as { x?: unknown; y?: unknown };
    if (typeof x !== "string" || typeof y !== "string") return false;
    const raw = new Uint8Array(65);
    raw[0] = 0x04;
    raw.set(b64uDecode(x), 1);
    raw.set(b64uDecode(y), 33);
    return b64u(raw) === congKhai;
  } catch {
    return false;
  }
}

export interface KhoaVapid { congKhai: string; biMat: string }
/**
 * Cả hai khoá VAPID có mặt VÀ khớp nhau (bẫy 47, `docs/CHANGE-GUIDE.md`): khoá công khai (`vars`) và khoá bí mật (`wrangler secret`)
 * do CHỦ đặt ở hai lệnh/hai lượt deploy khác nhau — lệch cặp (vd chạy lệnh tạo khoá quá một lần) làm mọi lần gửi bị dịch vụ đẩy từ
 * chối (403) mà không có dấu hiệu nào khác ngoài log `day_loi`. Bắt lệch NGAY ở đây (trả `null`, tắt tính năng, không throw) thay vì
 * để lộ ra bằng gửi thật — một dòng log `vapid_khoa_lech` (không có giá trị khoá) để chủ dò khi cần.
 */
export const khoaVapid = (env: { VAPID_PUBLIC_KEY?: string; VAPID_PRIVATE_KEY?: string }): KhoaVapid | null => {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null;
  if (!khopCapKhoa(env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)) {
    console.warn(JSON.stringify({ level: "warn", event: "vapid_khoa_lech" }));
    return null;
  }
  return { congKhai: env.VAPID_PUBLIC_KEY, biMat: env.VAPID_PRIVATE_KEY };
};

/** Nhớ JWT trong isolate tối đa 1 giờ theo (`aud`, khoá) — JWT còn hiệu lực 12 giờ nhưng ký lại sớm hơn nhiều để không bao giờ ký một
 * JWT gần hết hạn (đồng hồ Worker/dịch vụ đẩy lệch). Không giữ qua nhiều isolate: mất khi Worker tái tạo, không phải bug. */
const nhoJwt = new Map<string, { jwt: string; hetLuc: number }>();
async function layJwt(khoaBiMat: string, aud: string, nowMs: number): Promise<string> {
  const khoaNho = `${aud}\u0000${khoaBiMat}`;
  const c = nhoJwt.get(khoaNho);
  if (c && nowMs < c.hetLuc) return c.jwt;
  const jwt = await taoJwtVapid(khoaBiMat, aud, Math.floor(nowMs / 1000));
  nhoJwt.set(khoaNho, { jwt, hetLuc: nowMs + 3600_000 });
  return jwt;
}

/** Gõ cửa từng địa chỉ, tối đa 6 kết nối cùng lúc (trần của Worker). Trả địa chỉ nhận 410. Không ném; không log địa chỉ. */
export async function guiLo(ds: string[], khoa: KhoaVapid, nowMs: number, goi: typeof fetch = fetch): Promise<{ hetHieuLuc: string[] }> {
  const het: string[] = [];
  for (const nhom of chiaLo(ds, 6)) {
    await Promise.all(nhom.map(async (ep) => {
      try {
        const jwt = await layJwt(khoa.biMat, new URL(ep).origin, nowMs);
        // Thân rỗng: KHÔNG đặt Content-Length/Content-Encoding bằng tay (Apple: thân rỗng thì bỏ Content-Encoding). Phải thử máy thật.
        // Hạn giờ 10 giây: một dịch vụ đẩy treo không được giữ cả lô (và waitUntil) — hết giờ = lỗi thường (vào catch), không phải 410.
        const r = await goi(ep, {
          method: "POST",
          headers: { TTL: "3600", Urgency: "high", Authorization: `vapid t=${jwt}, k=${khoa.congKhai}` },
          signal: AbortSignal.timeout(10_000),
        });
        await r.body?.cancel();
        if (r.status === 410) het.push(ep);
        else if (!r.ok) console.warn(JSON.stringify({ level: "warn", event: "day_loi", ma: r.status }));
      } catch (e) {
        console.warn(JSON.stringify({ level: "warn", event: "day_loi", name: e instanceof Error ? e.name : "unknown" }));
      }
    }));
  }
  return { hetHieuLuc: het };
}
