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

/**
 * Dòng `mnt_setting` → trạng thái có hiệu lực LÚC `nowMs`. TỰ TẮT: dòng còn bật nhưng đã tới/qua giờ dự kiến hoàn tất thì coi là TẮT (chủ dự án 30/9: hết giờ bảo trì
 * mà hệ thống không tự tắt là lỗi) — không ghi lại dòng, lần bật sau ghi đè. Bật không kèm giờ (chỉ có khi sửa tay bằng SQL; route luôn đòi giờ) thì giữ bật. Chưa có dòng → TẮT.
 */
export function stateFromRow(row: { enabled: number; ends_at: string | null; allowed_phones: string | null } | null, nowMs: number): MaintenanceState {
  if (!row) return { on: false, endsAt: null, allowedPhones: [] };
  const at = row.ends_at ? Date.parse(row.ends_at) : NaN;
  const on = row.enabled === 1 && !(Number.isFinite(at) && at <= nowMs);
  return { on, endsAt: on ? row.ends_at : null, allowedPhones: parseAllowedPhones(row.allowed_phones) };
}

/** SĐT có nằm trong danh sách được phép không (dùng cho cả "được dùng app khi bảo trì" và "được bật/tắt chế độ"), bất kể đang bật hay tắt. */
export function isAllowedPhone(state: MaintenanceState, rawPhone: string): boolean {
  const phone = normalizePhone(rawPhone);
  return phone !== null && state.allowedPhones.includes(phone);
}

/**
 * Danh sách được phép nhận diện tài khoản chủ theo SĐT, nên đổi SĐT của tài khoản đang trong danh sách làm mất (hoặc chuyển cho người khác nếu số cũ được dùng lại) quyền
 * dùng/bật-tắt chế độ bảo trì — kể cả khi đang bật thì không ai tắt được từ giao diện. Trả thông báo lỗi để `PATCH /api/staff/:id` từ chối (409), hoặc null nếu được đổi.
 */
export function phoneChangeProblem(state: MaintenanceState, currentPhone: string, nextPhone: string): string | null {
  if (!isAllowedPhone(state, currentPhone) || normalizePhone(nextPhone) === normalizePhone(currentPhone)) return null;
  return "Số điện thoại này là của chủ dự án dùng chế độ bảo trì nên không đổi được ở đây.";
}

/**
 * Tài khoản có SĐT `rawPhone` có bị chặn lúc này không. TẮT → không chặn ai. BẬT → chặn mọi SĐT không nằm trong danh sách được phép, kể cả SĐT không
 * chuẩn hoá được hoặc không tồn tại (cùng một kết quả cho mọi người lạ — không lộ ai có tài khoản). Danh sách rỗng khi BẬT = chặn tất cả (không mở toang).
 */
export function isBlocked(state: MaintenanceState, rawPhone: string): boolean {
  return state.on && !isAllowedPhone(state, rawPhone);
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

const CONTACT = `liên hệ quản trị viên khi cần hỗ trợ thêm (${MAINTENANCE_CONTACT_PHONE}).`;

/**
 * Thông điệp cho người bị chặn, tách thành ba đoạn để giao diện đặt một phần tử đếm ngược SỐNG ở giữa: `before + countdown + after`. Câu chủ dự án đã chốt:
 * "Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là (countdown), liên hệ quản trị viên khi cần hỗ trợ thêm (0989929373)."
 * Hết giờ dự kiến → "…bảo trì và sắp hoàn tất, …" (giao diện hiện thoáng qua lúc đồng hồ về 0; máy chủ đã tự tắt — `stateFromRow`); chưa có giờ dự kiến → câu không nhắc giờ. `countdown` là null trong hai trường hợp đó.
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
