// Luật CHẾ ĐỘ BẢO TRÌ dùng ở cả máy chủ (chặn) và giao diện (thông điệp + đếm ngược) — một nguồn duy nhất, thuần, không import module.
// Quyết định của chủ dự án (docs/HANDOFF-CHE-DO-BAO-TRI.md §2): bật thì chặn TẤT CẢ trừ tài khoản có SĐT trong danh sách được phép (mặc định chỉ 0989929373),
// kể cả phiên đang mở; thông điệp đúng chữ đã chốt. Nơi ÉP là máy chủ (module `maintenance`, router, đăng nhập); giao diện chỉ hiển thị.
import { normalizePhone } from "./phone.ts";

/** Mã lỗi (`error.code`) của phản hồi 503 khi bị chặn vì bảo trì. Giao diện nhận ra chế độ bảo trì bằng mã này. */
export const MAINTENANCE_CODE = "maintenance";

/** SĐT quản trị viên hiện trong thông điệp cho người bị chặn, và là số được phép mặc định (migration 0016 gieo đúng số này). */
export const MAINTENANCE_CONTACT_PHONE = "0989929373";

/** Giờ dự kiến hoàn tất tối đa tính từ lúc bật — chặn gõ nhầm năm/ngày làm khoá cả công ty nhiều tuần. */
export const MAX_MAINTENANCE_MS = 7 * 24 * 3600_000;

export interface MaintenanceState {
  on: boolean;
  /** Giờ dự kiến hoàn tất, ISO UTC; null khi tắt (hoặc bật mà chưa có giờ). */
  endsAt: string | null;
  /** SĐT đã chuẩn hoá được dùng khi đang bật. */
  allowedPhones: readonly string[];
}

/** Chuỗi lưu trong DB (SĐT cách nhau dấu phẩy) → mảng SĐT đã chuẩn hoá; bỏ mục rỗng/hỏng/trùng. */
export function parseAllowedPhones(raw: string | null | undefined): string[] {
  const out: string[] = [];
  for (const part of (raw ?? "").split(",")) {
    const phone = normalizePhone(part);
    if (phone && !out.includes(phone)) out.push(phone);
  }
  return out;
}

/** SĐT có nằm trong danh sách được phép không (dùng cho cả "được dùng app khi bảo trì" và "được bật/tắt chế độ"), bất kể đang bật hay tắt. */
export function isAllowedPhone(state: MaintenanceState, rawPhone: string): boolean {
  const phone = normalizePhone(rawPhone);
  return phone !== null && state.allowedPhones.includes(phone);
}

/**
 * Tài khoản có SĐT `rawPhone` có bị chặn lúc này không. TẮT → không chặn ai. BẬT → chặn mọi SĐT không nằm trong danh sách được phép, kể cả SĐT không
 * chuẩn hoá được hoặc không tồn tại (cùng một kết quả cho mọi người lạ — không lộ ai có tài khoản). Danh sách rỗng khi BẬT = chặn tất cả (không mở toang).
 */
export function isBlocked(state: MaintenanceState, rawPhone: string): boolean {
  return state.on && !isAllowedPhone(state, rawPhone);
}

export type MaintenanceInputResult = { ok: true; on: boolean; endsAt: string | null } | { ok: false; message: string };

/** Kiểm thân `PUT /api/maintenance`: `{ on: boolean, endsAt?: ISO }`. Bật cần giờ dự kiến hợp lệ, ở tương lai, không quá MAX_MAINTENANCE_MS; tắt bỏ qua giờ. */
export function checkMaintenanceInput(body: Record<string, unknown> | null, nowMs: number): MaintenanceInputResult {
  if (!body || typeof body.on !== "boolean") return { ok: false, message: "Cần cho biết bật hay tắt chế độ bảo trì." };
  if (!body.on) return { ok: true, on: false, endsAt: null };
  const raw = body.endsAt;
  const at = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}T/.test(raw) ? Date.parse(raw) : NaN;
  if (!Number.isFinite(at)) return { ok: false, message: "Cần giờ dự kiến hoàn tất hợp lệ." };
  if (at <= nowMs) return { ok: false, message: "Giờ dự kiến hoàn tất phải ở tương lai." };
  if (at > nowMs + MAX_MAINTENANCE_MS) return { ok: false, message: "Giờ dự kiến hoàn tất không được quá 7 ngày kể từ bây giờ." };
  return { ok: true, on: true, endsAt: new Date(at).toISOString() };
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Thời gian còn lại (mili giây, > 0) → "3 giờ 05 phút 09 giây" / "23 phút 10 giây" / "42 giây"; làm tròn LÊN giây để đồng hồ không hiện "0 giây" khi còn chút ít. */
export function formatCountdown(msLeft: number): string {
  const total = Math.max(1, Math.ceil(msLeft / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} giờ ${pad2(m)} phút ${pad2(s)} giây`;
  if (m > 0) return `${m} phút ${pad2(s)} giây`;
  return `${s} giây`;
}

const CONTACT = `liên hệ quản trị viên khi cần hỗ trợ thêm (${MAINTENANCE_CONTACT_PHONE}).`;

/**
 * Thông điệp cho người bị chặn, tách thành ba đoạn để giao diện đặt một phần tử đếm ngược SỐNG ở giữa: `before + countdown + after`. Câu chủ dự án đã chốt:
 * "Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là (countdown), liên hệ quản trị viên khi cần hỗ trợ thêm (0989929373)."
 * Hết giờ dự kiến → "…bảo trì và sắp hoàn tất, …" (vẫn chặn cho tới khi chủ tắt); chưa có giờ dự kiến → câu không nhắc giờ. `countdown` là null trong hai trường hợp đó.
 */
export function maintenanceMessageParts(endsAt: string | null, nowMs: number): { before: string; countdown: string | null; after: string } {
  const at = endsAt ? Date.parse(endsAt) : NaN;
  if (!Number.isFinite(at)) return { before: `Hệ thống đang tạm đóng để bảo trì, ${CONTACT}`, countdown: null, after: "" };
  if (at <= nowMs) return { before: `Hệ thống đang tạm đóng để bảo trì và sắp hoàn tất, ${CONTACT}`, countdown: null, after: "" };
  return { before: "Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là ", countdown: formatCountdown(at - nowMs), after: `, ${CONTACT}` };
}

/** Thông điệp đầy đủ (ảnh chụp tại `nowMs`) — máy chủ đặt vào `error.message` của phản hồi 503. */
export function maintenanceMessage(endsAt: string | null, nowMs: number): string {
  const p = maintenanceMessageParts(endsAt, nowMs);
  return p.before + (p.countdown ?? "") + p.after;
}
