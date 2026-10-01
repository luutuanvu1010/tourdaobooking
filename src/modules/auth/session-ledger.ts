// Luật THUẦN của sổ phiên (ADR-0075): lý do kết thúc, miễn luật một máy, tên máy, trạng thái hiển thị. Không đọc CSDL.
import { LY_DO_BI_THAY } from "../../shared/session-ended.ts";
import type { SessionDto, SessionMethod } from "../../shared/contracts.ts";
import type { PermissionCode } from "../../shared/permissions.ts";
import type { RoleCode } from "../../shared/roles.ts";

export type EndReason = "dang_xuat" | "bi_thay" | "bi_go" | "doi_pin" | "dat_lai_pin" | "tat_hai_lop" | "ngung" | "het_han" | "mat_mien" | "doi_face_id";
export const END_REASON_LABEL: Record<EndReason, string> = {
  dang_xuat: "Đã đăng xuất",
  bi_thay: LY_DO_BI_THAY,
  bi_go: "Bị IT/Toàn quyền gỡ",
  doi_pin: "Đã đổi PIN",
  dat_lai_pin: "Bị đặt lại PIN",
  tat_hai_lop: "Bị tắt bảo mật hai lớp",
  ngung: "Tài khoản ngưng",
  het_han: "Hết hạn",
  mat_mien: "Không còn quyền dùng nhiều máy",
  doi_face_id: "Đã gỡ Face ID",
};
/** `last_seen_at` ghi tối đa một lần mỗi 5 phút (ADR-0075 điều 9). */
export const SESSION_TOUCH_MS = 5 * 60 * 1000;

/** Tập quyền mà chính sách đăng nhập hiện hành đặt "Nhiều máy" (ADR-0085). Tập rỗng = bảng chính sách trống = hành vi bản 1.58. */
export type TapNhieuMay = ReadonlySet<PermissionCode>;

/**
 * ADR-0085 Q1 điều 2 (thay ADR-0075 điều 3): tài khoản chịu luật MỘT máy trừ khi giữ SUPER_ADMIN, hoặc vai IT còn hiệu lực (hai điều khoá cứng), hoặc ít nhất
 * một quyền hiệu lực mà chính sách đặt Nhiều máy. Bản TypeScript của mẩu SQL `nhieuMayDieuKien` (auth/repository.ts) — bài đối chiếu ở chinh-sach-repo.test.ts.
 * Tham số `nhieuMay` BẮT BUỘC: quên chính sách là lỗi typecheck (tệp test và khung thử không qua typecheck — tự rà).
 */
export const isSingleDevice = (permissions: readonly PermissionCode[], roles: readonly RoleCode[], nhieuMay: TapNhieuMay): boolean =>
  !(permissions.includes("SUPER_ADMIN") || roles.includes("IT") || permissions.some((p) => nhieuMay.has(p)));

/** Tên máy hiển thị = loại máy + trình duyệt rút gọn từ User-Agent (ADR-0075 điều 9). Ứng dụng đã cài trên iPhone/iPad không có `Version/… Safari`. */
export function sessionDeviceLabel(userAgent: string | null): string {
  const ua = userAgent ?? "";
  const kind = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android"
    : /Macintosh|Mac OS X/.test(ua) ? "Máy Mac" : /Windows/.test(ua) ? "Máy Windows" : null;
  if (!kind) return "Thiết bị khác";
  const browser = /EdgA?\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox\//.test(ua) ? "Firefox"
    : /Version\/[\d.]+.*Safari/.test(ua) ? "Safari" : /(iPhone|iPad)/.test(ua) ? "Ứng dụng đã cài" : "Trình duyệt";
  return `${kind} · ${browser}`;
}

/** User-Agent lưu tối đa 200 ký tự (CHECK của bảng aut_session). */
export const trimUserAgent = (ua: string | null): string | null => (ua === null ? null : ua.slice(0, 200));

/** IP lưu tối đa 64 ký tự (CHECK của aut_session); thiếu/rỗng → NULL. Header quá dài không được làm đăng nhập lỗi 500. */
export const trimIp = (ip: string | null): string | null => (ip === null || ip === "" ? null : ip.slice(0, 64));

/**
 * Trạng thái hiển thị của một dòng phiên: theo dòng (đã kết thúc), theo hạn, rồi theo lưới `credentials_changed_at` (đổi PIN/gỡ Face ID sau lần cuối phiên
 * được cấp/cấp lại). Mốc so = max(created_at, last_seen_at): bốn route tự phục vụ GIỮ phiên hiện tại và đặt last_seen_at = đúng mốc đổi
 * (markSessionReissuedStatement) — nếu chỉ so created_at, phiên đang dùng bị gắn nhầm "Đã đổi thông tin đăng nhập". Phiên đã bị lưới giết không thể
 * chạm last_seen_at sau mốc đổi: currentStaff từ chối nó (getActiveStaff) TRƯỚC khi ghi last_seen_at. last_seen_at hỏng → chỉ dùng created_at (không mở cửa).
 */
export function sessionStatus(
  row: { ended_at: string | null; end_reason: EndReason | null; expires_at: string; created_at: string; last_seen_at: string },
  credentialsChangedAtMs: number | null,
  nowIso: string,
): { live: boolean; label: string } {
  if (row.ended_at !== null && row.end_reason !== null) return { live: false, label: END_REASON_LABEL[row.end_reason] };
  if (row.expires_at <= nowIso) return { live: false, label: END_REASON_LABEL.het_han };
  const created = Date.parse(row.created_at);
  const seen = Date.parse(row.last_seen_at);
  const moc = Number.isNaN(seen) ? created : Math.max(created, seen);
  if (credentialsChangedAtMs !== null && !(credentialsChangedAtMs <= moc)) return { live: false, label: "Đã đổi thông tin đăng nhập" };
  return { live: true, label: "Đang hiệu lực" };
}

/** Nhãn cách đăng nhập hiển thị (đặc tả §5b màn "Phiên đăng nhập": PIN + mã / PIN máy tin / Face ID). */
export const METHOD_LABEL: Record<SessionMethod, string> = { PIN: "PIN", PIN_MFA: "PIN + mã", PIN_TRUSTED: "PIN máy tin", PASSKEY: "Face ID" };
const isSessionMethod = (v: string): v is SessionMethod => Object.hasOwn(METHOD_LABEL, v);
const isEndReason = (v: string | null): v is EndReason => v !== null && Object.hasOwn(END_REASON_LABEL, v);

/**
 * Dòng `aut_session` → DTO (ADR-0075 điều 7, 9). KHÔNG đưa `user_agent` ra ngoài (chỉ `deviceLabel`). Trạng thái tính bằng `sessionStatus` (dòng → hạn → lưới
 * `credentials_changed_at` của CHỦ phiên) — phiên đã chết theo lưới không hiện "Đang hiệu lực" (Review Focus 2). Mã cách đăng nhập / lý do kết thúc lạ (CHECK của
 * migration 0065 không cho có) thì không đoán: nhãn "Không rõ" / "Đã kết thúc".
 */
export function toSessionDto(
  row: { id: string; method: string; device_label: string; ip: string | null; created_at: string; last_seen_at: string; expires_at: string; ended_at: string | null; end_reason: string | null },
  credentialsChangedAtMs: number | null,
  nowIso: string,
  currentSessionId: string | null,
): SessionDto {
  const st = row.ended_at !== null && !isEndReason(row.end_reason)
    ? { live: false, label: "Đã kết thúc" }
    : sessionStatus({ ...row, end_reason: isEndReason(row.end_reason) ? row.end_reason : null }, credentialsChangedAtMs, nowIso);
  return {
    id: row.id,
    deviceLabel: row.device_label,
    ip: row.ip,
    method: isSessionMethod(row.method) ? row.method : "PIN",
    methodLabel: isSessionMethod(row.method) ? METHOD_LABEL[row.method] : "Không rõ",
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    live: st.live,
    statusLabel: st.label,
    endedAt: row.ended_at,
    thisDevice: row.id === currentSessionId,
  };
}
