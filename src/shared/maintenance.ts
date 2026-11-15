// Luật CHẾ ĐỘ BẢO TRÌ dùng ở cả máy chủ (chặn) và giao diện (thông điệp + đếm ngược) — một nguồn duy nhất, thuần, không import module.
// ADR-0071 điều 3 (thay quyết định cũ "miễn trừ theo SĐT trong danh sách được phép" của docs/HANDOFF-CHE-DO-BAO-TRI.md §2): bật thì chặn MỌI tài khoản không
// giữ Toàn quyền (SUPER_ADMIN), kể cả Quản trị và phiên đang mở; thông điệp đúng chữ đã chốt. Nơi ÉP là máy chủ (module `maintenance`, router, đăng nhập);
// giao diện chỉ hiển thị. Cột `mnt_setting.allowed_phones` thôi được đọc (giữ cột — expand–contract).
import { hasPermission, type PermissionCode } from "./permissions.ts";

/** Mã lỗi (`error.code`) của phản hồi 503 khi bị chặn vì bảo trì. Giao diện nhận ra chế độ bảo trì bằng mã này. */
export const MAINTENANCE_CODE = "maintenance";

/**
 * NỘI DUNG MÀN BẢO TRÌ (bản mẫu 2c của chủ dự án 13/11/2026): Toàn quyền tự sửa ở trang Tôi › Chế độ bảo trì, lưu ở `mnt_setting.content_json` (migration 0162).
 * Máy chủ gửi kèm nội dung trong chính thân 503 (người bị chặn không gọi được API nào khác). Ô tuỳ chọn để trống hoặc công tắc tắt thì khối đó ẩn.
 */
export interface MaintenanceContent {
  tieuDe: string;
  loiNhan: string;
  /** Nội dung bảo trì (vd: nâng cấp máy chủ…) — tuỳ chọn. */
  lyDo: string;
  /** SĐT hỗ trợ, 10 số không dấu cách (bắt buộc): nút Gọi + câu thông điệp. */
  sdt: string;
  /** Liên kết Zalo `https://zalo.me/…` — tuỳ chọn. */
  zalo: string;
  /** Website công ty `https://…` — tuỳ chọn. */
  website: string;
  camOn: string;
  hienLyDo: boolean;
  hienGoi: boolean;
  hienZalo: boolean;
  hienWeb: boolean;
  hienCamOn: boolean;
}

/** Nội dung khi chủ CHƯA lưu lần nào (cột NULL) và đích của nút «Khôi phục mặc định» — đúng giá trị trong bản mẫu 2c (riêng «Nội dung bảo trì» để trống). */
export const MAINTENANCE_CONTENT_DEFAULT: MaintenanceContent = Object.freeze({
  tieuDe: "Hệ thống đang bảo trì",
  loiNhan: "Tour Đảo Booking đang được nâng cấp để chạy nhanh và ổn định hơn. Trong lúc này chưa lập hay sửa đơn được.",
  lyDo: "",
  sdt: "0989929373",
  zalo: "https://zalo.me/0989929373",
  website: "https://tourdao.vn",
  camOn: "Cảm ơn bạn đã kiên nhẫn chờ. Hệ thống sẽ sớm quay lại.",
  hienLyDo: true,
  hienGoi: true,
  hienZalo: true,
  hienWeb: true,
  hienCamOn: true,
});

/** Độ dài tối đa từng ô chữ (nội dung đi kèm MỌI phản hồi 503 nên phải gọn). */
export const MAINTENANCE_CONTENT_MAX = { tieuDe: 80, loiNhan: 300, lyDo: 300, camOn: 160, zalo: 200, website: 200 } as const;

const CHU = ["tieuDe", "loiNhan", "lyDo", "camOn"] as const;
const CONG_TAC = ["hienLyDo", "hienGoi", "hienZalo", "hienWeb", "hienCamOn"] as const;

/** Đường dẫn an toàn để làm `href`: chỉ `https://`, không khoảng trắng; `chiHost` ép đúng tên miền (Zalo). Chặn `javascript:` vì giá trị hiện ở trang công khai. */
function urlAnToan(v: string, chiHost?: string): boolean {
  if (!/^https:\/\/[^\s]+$/.test(v)) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && (!chiHost || u.hostname === chiHost);
  } catch {
    return false;
  }
}

export type MaintenanceContentResult = { ok: true; content: MaintenanceContent } | { ok: false; message: string };

/** Kiểm thân `PUT /api/maintenance/content` (và nội dung đọc lại từ CSDL). Bắt buộc: tiêu đề, lời nhắn, SĐT 10 số; Zalo / website nếu có phải là `https://`. */
export function checkMaintenanceContent(body: Record<string, unknown> | null): MaintenanceContentResult {
  if (!body || typeof body !== "object") return { ok: false, message: "Thiếu nội dung màn bảo trì." };
  const out: Record<string, string | boolean> = {};
  for (const k of [...CHU, "sdt", "zalo", "website"] as const) {
    const v = body[k];
    if (typeof v !== "string") return { ok: false, message: "Nội dung màn bảo trì không hợp lệ." };
    out[k] = v.trim();
  }
  for (const k of CONG_TAC) {
    if (typeof body[k] !== "boolean") return { ok: false, message: "Nội dung màn bảo trì không hợp lệ." };
    out[k] = body[k] as boolean;
  }
  const c = out as unknown as MaintenanceContent;
  if (!c.tieuDe) return { ok: false, message: "Cần tiêu đề." };
  if (!c.loiNhan) return { ok: false, message: "Cần lời nhắn chính." };
  for (const k of [...CHU, "zalo", "website"] as const) if (c[k].length > MAINTENANCE_CONTENT_MAX[k]) return { ok: false, message: `Chữ quá dài (tối đa ${MAINTENANCE_CONTENT_MAX[k]} ký tự).` };
  c.sdt = c.sdt.replace(/[\s.]/g, "");
  if (!/^0\d{9}$/.test(c.sdt)) return { ok: false, message: "Số điện thoại hỗ trợ cần đủ 10 số, bắt đầu bằng 0." };
  if (c.zalo && !urlAnToan(c.zalo, "zalo.me")) return { ok: false, message: "Liên kết Zalo cần có dạng https://zalo.me/…" };
  if (c.website && !urlAnToan(c.website)) return { ok: false, message: "Website cần bắt đầu bằng https://" };
  return { ok: true, content: c };
}

/** Cột `content_json` → nội dung dùng được. NULL, hỏng, hoặc không qua bộ kiểm (sửa tay bằng SQL) → mặc định, để màn bảo trì không bao giờ trống hay chở đường dẫn lạ. */
export function contentFromStored(raw: string | null | undefined): MaintenanceContent {
  if (!raw) return MAINTENANCE_CONTENT_DEFAULT;
  try {
    const r = checkMaintenanceContent(JSON.parse(raw) as Record<string, unknown>);
    return r.ok ? r.content : MAINTENANCE_CONTENT_DEFAULT;
  } catch {
    return MAINTENANCE_CONTENT_DEFAULT;
  }
}

/** SĐT 10 số → "0989 929 373" (dễ đọc trên nút gọi); số khác giữ nguyên. */
export function phoneVnText(phone: string): string {
  return /^\d{10}$/.test(phone) ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
}

/** Giờ dự kiến hoàn tất tối đa tính từ lúc bật — chặn gõ nhầm năm/ngày làm khoá cả công ty nhiều tuần. */
export const MAX_MAINTENANCE_MS = 7 * 24 * 3600_000;

export interface MaintenanceState {
  on: boolean;
  /** Giờ dự kiến hoàn tất, ISO UTC; null khi tắt (hoặc bật mà chưa có giờ). */
  endsAt: string | null;
  /** Cột `content_json` thô (đọc cùng câu với trạng thái — không thêm truy vấn); chỉ giải mã khi cần (`contentFromStored`). */
  contentJson?: string | null;
}

/**
 * Dòng `mnt_setting` → trạng thái có hiệu lực LÚC `nowMs`. TỰ TẮT: dòng còn bật nhưng đã tới/qua giờ dự kiến hoàn tất thì coi là TẮT (chủ dự án 30/9: hết giờ bảo trì
 * mà hệ thống không tự tắt là lỗi) — không ghi lại dòng, lần bật sau ghi đè. Bật không kèm giờ (chỉ có khi sửa tay bằng SQL; route luôn đòi giờ) thì giữ bật. Chưa có dòng → TẮT.
 */
export function stateFromRow(row: { enabled: number; ends_at: string | null } | null, nowMs: number): MaintenanceState {
  if (!row) return { on: false, endsAt: null };
  const at = row.ends_at ? Date.parse(row.ends_at) : NaN;
  const on = row.enabled === 1 && !(Number.isFinite(at) && at <= nowMs);
  return { on, endsAt: on ? row.ends_at : null };
}

/**
 * ADR-0071 điều 3a: tài khoản có bộ quyền `permissions` có bị chặn lúc này không. TẮT → không chặn ai. BẬT → chặn mọi tài khoản không giữ Toàn quyền
 * (SUPER_ADMIN), kể cả Quản trị. `null` = không có tài khoản đang hoạt động ứng với SĐT đăng nhập (SĐT lạ, hỏng, tài khoản đã ngưng) → bị chặn như mọi người
 * khác, cùng một kết quả (không lộ ai có tài khoản).
 */
export function isBlocked(state: MaintenanceState, permissions: readonly PermissionCode[] | null): boolean {
  return state.on && !(permissions !== null && hasPermission({ permissions }, "SUPER_ADMIN"));
}

export type MaintenanceInputResult = { ok: true; on: boolean; endsAt: string | null } | { ok: false; message: string };

/** Mốc ISO UTC có "Z" (giao diện luôn gửi `toISOString()`) → mili giây, hoặc NaN. Không nhận chuỗi thiếu múi giờ (mơ hồ giờ VN/UTC — Date.parse hiểu theo giờ máy) và không nhận ngày không có thật (`Date.parse` cho 30/02 lăn sang 02/03). */
function parseUtcIso(raw: unknown): number {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/.test(raw)) return NaN;
  const at = Date.parse(raw);
  return Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) === raw.slice(0, 10) ? at : NaN;
}

/** Kiểm thân `PUT /api/maintenance`: `{ on: boolean, endsAt?: ISO }`. Bật cần giờ dự kiến hợp lệ, ở tương lai, không quá MAX_MAINTENANCE_MS; tắt bỏ qua giờ. */
export function checkMaintenanceInput(body: Record<string, unknown> | null, nowMs: number): MaintenanceInputResult {
  if (!body || typeof body.on !== "boolean") return { ok: false, message: "Cần cho biết bật hay tắt chế độ bảo trì." };
  if (!body.on) return { ok: true, on: false, endsAt: null };
  const at = parseUtcIso(body.endsAt);
  if (!Number.isFinite(at)) return { ok: false, message: "Cần giờ dự kiến hoàn tất hợp lệ." };
  if (at <= nowMs) return { ok: false, message: "Giờ dự kiến hoàn tất phải ở tương lai." };
  if (at > nowMs + MAX_MAINTENANCE_MS) return { ok: false, message: "Giờ dự kiến hoàn tất không được quá 7 ngày kể từ bây giờ." };
  return { ok: true, on: true, endsAt: new Date(at).toISOString() };
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Thời gian còn lại (mili giây, > 0) → "3 ngày 5 giờ 10 phút" (từ 1 ngày: bỏ giây, làm tròn LÊN phút — chủ dự án 2026-10-01) /
 * "3 giờ 05 phút 09 giây" / "23 phút 10 giây" / "42 giây"; làm tròn LÊN giây để đồng hồ không hiện "0 giây" khi còn chút ít. */
export function formatCountdown(msLeft: number): string {
  const total = Math.max(1, Math.ceil(msLeft / 1000));
  if (total >= 86400) {
    const mins = Math.ceil(total / 60);
    return `${Math.floor(mins / 1440)} ngày ${Math.floor((mins % 1440) / 60)} giờ ${mins % 60} phút`;
  }
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} giờ ${pad2(m)} phút ${pad2(s)} giây`;
  if (m > 0) return `${m} phút ${pad2(s)} giây`;
  return `${s} giây`;
}

/** Ba ô đồng hồ của màn bảo trì (bản mẫu 2a): giờ/phút/giây có số 0 đứng đầu; từ 1 ngày là ngày/giờ/phút, làm tròn LÊN phút — cùng cách đếm với `formatCountdown`. */
export function countdownBoxes(msLeft: number): { so: string; nhan: string }[] {
  const total = Math.max(1, Math.ceil(msLeft / 1000));
  if (total >= 86400) {
    const mins = Math.ceil(total / 60);
    return [{ so: String(Math.floor(mins / 1440)), nhan: "ngày" }, { so: pad2(Math.floor((mins % 1440) / 60)), nhan: "giờ" }, { so: pad2(mins % 60), nhan: "phút" }];
  }
  return [{ so: pad2(Math.floor(total / 3600)), nhan: "giờ" }, { so: pad2(Math.floor((total % 3600) / 60)), nhan: "phút" }, { so: pad2(total % 60), nhan: "giây" }];
}

/** "liên hệ quản trị viên … (SĐT)." — SĐT là số hỗ trợ chủ đã lưu (nội dung màn bảo trì). */
const lienHe = (sdt: string): string => `liên hệ quản trị viên khi cần hỗ trợ thêm${sdt ? ` (${sdt})` : ""}.`;

/**
 * Thông điệp cho người bị chặn, tách thành ba đoạn để giao diện đặt một phần tử đếm ngược SỐNG ở giữa: `before + countdown + after`. Câu chủ dự án đã chốt:
 * "Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là (countdown), liên hệ quản trị viên khi cần hỗ trợ thêm (SĐT hỗ trợ)."
 * Hết giờ dự kiến → "…bảo trì và sắp hoàn tất, …" (giao diện hiện thoáng qua lúc đồng hồ về 0; máy chủ đã tự tắt — `stateFromRow`); chưa có giờ dự kiến → câu không nhắc giờ. `countdown` là null trong hai trường hợp đó.
 */
export function maintenanceMessageParts(endsAt: string | null, nowMs: number, sdt: string): { before: string; countdown: string | null; after: string } {
  const at = endsAt ? Date.parse(endsAt) : NaN;
  if (!Number.isFinite(at)) return { before: `Hệ thống đang tạm đóng để bảo trì, ${lienHe(sdt)}`, countdown: null, after: "" };
  if (at <= nowMs) return { before: `Hệ thống đang tạm đóng để bảo trì và sắp hoàn tất, ${lienHe(sdt)}`, countdown: null, after: "" };
  return { before: "Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là ", countdown: formatCountdown(at - nowMs), after: `, ${lienHe(sdt)}` };
}

/** Thông điệp đầy đủ (ảnh chụp tại `nowMs`) — máy chủ đặt vào `error.message` của phản hồi 503. */
export function maintenanceMessage(endsAt: string | null, nowMs: number, sdt: string): string {
  const p = maintenanceMessageParts(endsAt, nowMs, sdt);
  return p.before + (p.countdown ?? "") + p.after;
}
