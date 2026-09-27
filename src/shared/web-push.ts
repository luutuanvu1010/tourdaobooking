// WEB PUSH (ADR-0036) — luật thuần dùng ở server (Task 2 thêm ký VAPID + chọn người nhận; tệp này Task 1 chỉ có kiemDiaChi).
// Không dependency runtime.

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
  const host = u.hostname; // URL đã tách userinfo (user:pass@host) khỏi hostname — "…@evil.com" chỉ còn evil.com ở đây
  return DUNG_HOP_LE.includes(host) || DUOI_HOP_LE.some((d) => host.endsWith(d));
}
