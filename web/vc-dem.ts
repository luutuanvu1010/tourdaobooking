// Số giấy tờ sắp hết hạn (xe + tài xế) cho huy hiệu "Sắp hết hạn" ở thanh bên và dòng "Giấy tờ sắp hết hạn" ở trang Tôi (bản vẽ Vận chuyển 00; Ruling R15
// điểm 2: `count` của GET /api/van-chuyen/sap-het-han — không route đếm riêng). MỘT lời gọi mỗi lần mở trang dù cả thanh bên lẫn trang Tôi cùng cần. Chỉ gọi khi
// người dùng có ô vehicle.manage (nơi gọi hỏi `can()` trước). Lỗi mạng → 0 (không vẽ số giả), cùng khuôn feedbackBadge().
import { api, type Api } from "./api";

let dangHoi: Promise<number> | null = null;

export function demSapHetHan(): Promise<number> {
  dangHoi ??= api<Api.ExpiringListResponse>("/api/van-chuyen/sap-het-han").then(
    (r) => r.count,
    () => 0,
  );
  return dangHoi;
}
