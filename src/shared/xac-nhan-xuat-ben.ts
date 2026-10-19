// Nội dung hộp xác nhận "Xuất bến" (HT-03, kiểm theo vai 2/10 — lộ trình 3/10 V1.3; NGUYEN-NHAN-GOC.md §3.3). THUẦN — không DOM, không I/O; import kèm
// đuôi .ts. Test: xac-nhan-xuat-ben.test.ts.
// - Màn tài xế: bấm "Xuất bến" mở bảng trượt nêu mã chuyến, NGÀY CHẠY, giờ dự kiến, biển số, số khách — một chạm nhầm không còn xuất bến được.
// - Ngày chạy khác hôm nay (chuyến của ngày khác, hoặc vắt đêm của hôm qua): dòng cảnh báo ĐỎ ở màn tài xế (trên trang + trong hộp) và trong hộp bấm thay của
//   văn phòng — CÙNG một câu (`canhBaoNgayChay`). Chỉ nhắc ở đây; ngoài cửa sổ xuất bến máy chủ chặn bằng mã giữ NGOAI_CUA_SO_XUAT_BEN (ADR-0096 Đ2).
// - Xuất bến nhầm: tài xế không tự gỡ; văn phòng "Thu hồi xuất bến" khi chưa có tiến độ nào (ADR-0097 Đ3).
import { ngayCoThu } from "./vn-date.ts";

export interface VaoXuatBen {
  ma: string;
  /** Ngày chạy (YYYY-MM-DD, giờ VN) = ngày của giờ bắt đầu dự kiến. */
  ngayChay: string;
  /** Giờ bắt đầu dự kiến "HH:MM". */
  gioDuKien: string;
  bienSo: string;
  soKhach: number;
}
export interface HopXuatBen {
  tieuDe: string;
  /** Cặp [nhãn, giá trị] theo thứ tự hiện. */
  dong: [string, string][];
  /** Câu cảnh báo đỏ khi ngày chạy ≠ hôm nay; null = cùng ngày. */
  canhBao: string | null;
  nutXacNhan: string;
  ghiChu: string;
}

/** Câu cảnh báo khi ngày chạy khác hôm nay (giờ VN); cùng ngày → null. Dùng chung màn tài xế và hộp bấm thay của văn phòng. */
export function canhBaoNgayChay(ngayChay: string, homNay: string): string | null {
  if (ngayChay === homNay) return null;
  return `Chuyến này chạy ngày ${ngayCoThu(ngayChay)}, không phải hôm nay (${ngayCoThu(homNay)}). Chỉ bấm khi xe thật sự lăn bánh cho chuyến này.`;
}

export function hopXuatBen(v: VaoXuatBen, homNay: string): HopXuatBen {
  const canhBao = canhBaoNgayChay(v.ngayChay, homNay);
  return {
    tieuDe: `Cho xe chạy ${v.ma}?`,
    dong: [
      ["Mã chuyến", v.ma],
      ["Ngày chạy", canhBao ? ngayCoThu(v.ngayChay) : `${ngayCoThu(v.ngayChay)} (hôm nay)`],
      ["Giờ dự kiến", v.gioDuKien],
      ["Biển số", v.bienSo],
      ["Số khách", `${Math.max(0, v.soKhach)} khách`],
    ],
    canhBao,
    // Chữ nút ngắn (vừa nửa chân hộp ở khổ 390 — "Vẫn xuất bến chuyến ngày dd/mm" bị cắt, ảnh 2a 3/10); ngày chạy đã nêu ở dải đỏ + dòng "Ngày chạy".
    nutXacNhan: canhBao ? "Vẫn cho xe chạy" : "Cho xe chạy",
    ghiChu: "Bấm lúc xe lăn bánh — giờ ghi là lúc bấm. Bấm nhầm thì báo văn phòng ngay để thu hồi.",
  };
}
