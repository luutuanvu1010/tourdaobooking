// Nhãn trạng thái đơn hiển thị cho người dùng (ADR-0030 điều 3, Q-A2): "Chờ xác nhận" thay "Nháp" — đơn mới không tự
// gắn người phụ trách nên "Nháp" khiến người xem tưởng đơn chưa cần ai xử lý; "Chờ xác nhận" đúng bản chất (đợi văn
// phòng bấm Xác nhận). Cùng chữ với `CONFIRMATION_STATUS_TEXT.draft` (order-confirmation.ts, đã dùng từ v1.0).
// Tệp thuần riêng (không đặt trong web/format.ts): `npm test` chỉ nạp `src/**/*.test.ts`, tệp dưới web/ không có bài
// kiểm chạy được qua `node --test` của repo — web/format.ts re-export lại để chỗ dùng cũ (`./format`) không đổi.
import type { OrderStatus } from "./contracts.ts";

export const STATUS_LABEL: Record<OrderStatus, string> = { draft: "Chờ xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã huỷ" };

/**
 * Nhãn trạng thái HIỂN THỊ của đơn kèm hai mốc sổ tiền (ADR-0024 đ3, ADR-0025 đ9): `status` vẫn chỉ ba giá trị; "Đã giao – đã thu đủ" / "Hoàn thành" SUY
 * RA từ mốc. MỘT hàm cho danh sách, chi tiết, Trang chủ, biên nhận — không chép tay nhãn ở `web/`. `khoa` (dùng cho lớp CSS) KHÔNG phải chữ hiển thị.
 */
export type KhoaTrangThai = OrderStatus | "delivered" | "completed";
export function trangThaiHienThi(o: { status: OrderStatus; deliveredAt?: string | null; completedAt?: string | null }): { khoa: KhoaTrangThai; nhan: string } {
  if (o.status === "confirmed" && o.completedAt) return { khoa: "completed", nhan: "Hoàn thành" };
  if (o.status === "confirmed" && o.deliveredAt) return { khoa: "delivered", nhan: "Đã giao – đã thu đủ" };
  return { khoa: o.status, nhan: STATUS_LABEL[o.status] };
}
