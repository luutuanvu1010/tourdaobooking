/**
 * Dòng nhắc "chuyến chưa bấm Kết thúc" trên màn tài xế (ADR-0189 Quyết định 4, Q-05). Không đổi route hay DTO: suy từ dữ liệu đã có — chuyến `RUNNING`,
 * cờ khung `trongNgayChay` của DTO tắt, và hôm nay (ngày VN) đã SAU ngày chạy. Vế "sau ngày chạy" để chuyến xuất bến tối hôm trước ngày chạy (hay tài xế đối
 * tác xuất bến trước hạn Từ chối trong ngày chạy) không hiện nhầm. Hàm này KHÔNG tự tính khung (không gọi `trongNgayChay` — bài
 * src/modules/van-chuyen/mot-ham-khung.test.ts): khung là cờ máy chủ gửi. Ngày dạng "YYYY-MM-DD" so như chuỗi.
 */
export const CAU_NHAC_KET_THUC = "Chuyến chưa bấm Kết thúc — tên khách đã ẩn. Bấm Kết thúc khi xong hoặc báo văn phòng.";

export function hienNhacKetThuc(v: { trangThai: string; trongNgayChay: boolean; ngayChay: string }, homNayVn: string): boolean {
  return v.trangThai === "RUNNING" && !v.trongNgayChay && homNayVn > v.ngayChay;
}
