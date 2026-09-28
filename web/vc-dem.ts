// Danh sách giấy tờ sắp hết hạn (xe + tài xế) — GET /api/van-chuyen/sap-het-han — dùng chung cho huy hiệu "Sắp hết hạn" ở thanh bên, dòng "Giấy tờ sắp hết hạn" ở
// trang Tôi (bản vẽ Vận chuyển 00; Ruling R15 điểm 2: `count` của route danh sách — không route đếm riêng) và lần nạp đầu của trang /giay-to-sap-het-han. MỘT lời
// gọi mỗi lần mở trang dù nhiều nơi cùng cần. Chỉ gọi khi người dùng có ô vehicle.manage (nơi gọi hỏi `can()` trước). Huy hiệu: lỗi mạng → 0 (không vẽ số giả).
import { api, type Api } from "./api";

let dangHoi: Promise<Api.ExpiringListResponse> | null = null;

export function layDanhSachSapHet(): Promise<Api.ExpiringListResponse> {
  dangHoi ??= api<Api.ExpiringListResponse>("/api/van-chuyen/sap-het-han");
  return dangHoi;
}

export function demSapHetHan(): Promise<number> {
  return layDanhSachSapHet().then(
    (r) => r.count,
    () => 0,
  );
}
