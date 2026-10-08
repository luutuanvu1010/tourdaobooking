// ĐỒNG BỘ CHUYẾN THEO ĐƠN (ADR-0104 Đ2, Q-2 = a). Luật THUẦN dùng chung cho máy (lệnh đơn nối khúc chuyến vào CÙNG lô — `ctx.dongBoChuyen`) và nút tay
// "Cập nhật khách theo đơn" (route `cap-nhat-khach`). Không I/O, không import module.

/**
 * Hành động nhật ký của CÂU CỔNG ĐƠN mà câu cổng chuyến hỏi (`v_aud_order_cmd`, ADR-0104 Đ2.2). Bằng ĐÚNG danh sách `IN (…)` của migration view (bài
 * src/migrations-dong-bo-chuyen.test.ts so tập). Thêm điểm gọi mang hành động ngoài danh sách → bài ghép đỏ (cổng chuyến không bao giờ thắng).
 */
export const HANH_DONG_CONG_DON = [
  "cancelled", "order_cancelled_by_field", "order_money_adjusted", "order_money_adjusted_by_field", "order_passenger_changed", "order_leg_updated", "order_leg_closed",
] as const;
export type HanhDongCongDon = (typeof HANH_DONG_CONG_DON)[number];
