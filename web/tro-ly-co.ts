// Cờ "tự mở khung Hỗ trợ MỘT lần sau mỗi lần đăng nhập" (ADR-0066 điều 9). Đặt ở web/login.ts NGAY SAU khi POST đăng nhập (PIN hoặc Face ID) thành công —
// không đặt ở nhánh "đã có phiên → vào thẳng"; web/tro-ly.ts đọc rồi XOÁ ở lần dựng khung đầu. sessionStorage: sống trong thẻ / cửa sổ app đang mở.
// Bộ nhớ lỗi (chế độ riêng tư, bị chặn) ⇒ không tự mở — không bao giờ làm hỏng đăng nhập.
const KHOA = "td_tro_ly_tu_mo";

export function datCoTuMo(): void {
  try {
    sessionStorage.setItem(KHOA, "1");
  } catch {
    // không có bộ nhớ: bỏ qua, khung không tự mở
  }
}

/** Có cờ không — và xoá luôn (chỉ tự mở một lần). */
export function layCoTuMo(): boolean {
  try {
    const co = sessionStorage.getItem(KHOA) === "1";
    if (co) sessionStorage.removeItem(KHOA);
    return co;
  } catch {
    return false;
  }
}
