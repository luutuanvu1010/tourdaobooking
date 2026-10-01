// Luật thuần dùng riêng ở giao diện cho mục "Thông báo trên điện thoại" (Web Push màn hình khoá, ADR-0036, Task 4).
// KHÔNG đặt trong src/shared/web-push.ts: tệp đó đang được một trợ lý khác sửa cùng lúc (Task 2/3) — hai hàm dưới đây
// chỉ dùng ở trình duyệt (đặt tên máy, giải mã khoá công khai VAPID để đưa vào pushManager.subscribe), không server nào cần.

/** Tên máy để lưu cùng địa chỉ nhận (`thiet_bi`, CHECK độ dài 1..40) — suy từ User-Agent, không cần chính xác tuyệt đối. */
export function thietBiTu(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "iPhone";
  if (/android/.test(ua)) return "Android";
  return "Máy tính";
}

/** Giải mã chuỗi base64url (khoá công khai VAPID, dạng điểm EC chưa nén 65 byte) thành bytes cho `applicationServerKey`. */
export function b64uSangBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * Cờ sessionStorage "máy này đã gắn đăng ký thông báo với phiên đăng nhập hiện tại" (ADR-0075 điều 6b): web/shell.ts gửi lại địa chỉ nhận MỘT lần sau đăng nhập
 * (để đăng ký mang mã phiên mới, không bị lần đăng nhập sau coi là của máy cũ); trang /login xoá cờ mỗi lần mở — đăng nhập xong là gắn lại.
 */
export const KHOA_GAN_PHIEN_THONG_BAO = "td_push_gan_phien";
