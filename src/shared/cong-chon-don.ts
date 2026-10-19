// Cổng "phải chọn Đón / Không đón" (ADR-0134 Đ2) — luật THUẦN, một nguồn cho máy chủ (cửa xác nhận; sau này cửa "Gửi xác nhận" của ADR-0136) và giao diện.
// Chỉ chạy ở cửa xác nhận / gửi xác nhận của đơn NHÁP — KHÔNG chạy khi lưu nháp, KHÔNG chạy với đơn đã xác nhận / đã huỷ (Review Focus 6).
import type { LuaChonDon } from "./khung-gio-don.ts";

/**
 * Chỉ số (0-based) các dịch vụ CHƯA hợp lệ về đưa đón: chưa chọn (NULL); chọn "Đón" mà không còn chặng mở nào; chọn "Không đón" mà vẫn còn chặng mở.
 * `soChangMo` = số chặng CÒN HIỆU LỰC (chưa đóng) của dịch vụ.
 */
export function thieuChonDon(services: readonly { pickupChoice: LuaChonDon | null; soChangMo: number }[]): number[] {
  const out: number[] = [];
  services.forEach((s, i) => {
    if (s.pickupChoice === null || (s.pickupChoice === "DON" && s.soChangMo === 0) || (s.pickupChoice === "KHONG_DON" && s.soChangMo > 0)) out.push(i);
  });
  return out;
}

/** Câu lỗi 409 `pickup_choice_required` (nguyên văn ADR-0134 Đ2) cho dịch vụ ở chỉ số `i` (0-based). */
export const cauThieuChonDon = (i: number): string => `Dịch vụ thứ ${i + 1} chưa chọn Đón hay Không đón.`;
