// MỘT LUẬT số người của chặng đưa đón (ADR-0054 D10.3 — bài "một luật" `src/so-nguoi-chang-mot-luat.test.ts`, khuôn bài học Đợt E "hai luật"). Luật THUẦN,
// không I/O, không import module. Mọi nơi cần "số người của chặng" (lịch chung, hàm hẹp cho chuyến, L-D1, cổng xuất bến L-B1, trạng thái chặng) đi qua
// `soNguoiChang` — không nơi nào tự cộng bốn loại tuổi để ra số người chặng. Bản SQL cho kiểm định kỳ: `soNguoiChangSql` ở scripts/audit-checks.mjs (cùng nghĩa).
import type { LegDirection, PaxCounts } from "./contracts.ts";

/** Số khách của MỘT dịch vụ = tổng bốn loại tuổi của số khách HIỆU LỰC (nơi gọi truyền kết quả `effectivePax` / `soKhachHieuLuc` — một nguồn). */
export const tongKhach = (p: PaxCounts): number => p.adult + p.child + p.senior + p.infant;

/**
 * Số người HIỆU LỰC của một chặng: chặng VỀ có `pax_override` → min(số riêng, số khách dịch vụ) — số khách dịch vụ giảm dưới số riêng thì kẹp lúc ĐỌC (máy không
 * tự sửa cột; kiểm định kỳ L-R1 báo); còn lại = số khách dịch vụ.
 * `them.soKhachDiXe`: MÓC cho ADR-0065 (`orders.ride_pax`, proposed — kế hoạch Task 8). Hôm nay BỊ BỎ QUA (bài ghim); khi ADR-0065 được duyệt, luật mới sửa ở
 * ĐÂY, không sửa nơi gọi.
 */
export function soNguoiChang(chang: { direction: LegDirection; paxOverride: number | null }, soKhachDichVu: number, them?: { soKhachDiXe?: number | null }): number {
  void them;
  if (chang.direction === "RETURN" && chang.paxOverride !== null) return Math.min(chang.paxOverride, soKhachDichVu);
  return soKhachDichVu;
}
