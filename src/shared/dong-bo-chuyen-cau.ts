// Câu CỐ ĐỊNH của máy đồng bộ chuyến theo đơn (ADR-0104 Đ2.7, kế hoạch §8) — tệp chỉ import KIỂU (không mã chạy) để màn hình (web/) dùng chung đúng câu máy chủ
// trả mà không kéo theo kiểu D1 của phần lô (src/shared/dong-bo-chuyen.ts re-export hai hằng này). Không kèm mã chuyến, biển số, tài xế, tên khách.
import type { DongBoChuyenDto } from "./contracts.ts";

/** Đơn có khách chờ đón trên xe ĐANG CHẠY (máy không ghi lên xe đang chạy — Đ2.7). */
export const CAU_NHAC_XE_DANG_CHAY = "Đơn có khách trên xe đang chạy — văn phòng bấm Báo huỷ";
/** Máy không nối được phần chuyến (vượt trần câu / thua cổng chuyến). */
export const CAU_CAP_NHAT_TAY = "Chuyến cần cập nhật tay — người xếp xe bấm Cập nhật khách theo đơn";

/**
 * Câu màn hình hiện sau lệnh đơn có nối máy (trang đơn, bảng sửa đưa đón / hành khách / số khách, trang HDV — kế hoạch §8): `nhac` đúng như máy chủ trả,
 * rồi câu cố định khi `capNhatTay`. Nhận NHIỀU phản hồi (bảng "Sửa đưa đón" chạy nhiều lệnh) — mỗi câu một lần. Rỗng = không có gì để nhắc.
 */
export function cauDongBoChuyen(ds: readonly (DongBoChuyenDto | undefined)[]): string[] {
  const nhac = [...new Set(ds.flatMap((d) => (d?.nhac ? [d.nhac] : [])))];
  return ds.some((d) => d?.capNhatTay === true) ? [...nhac, CAU_CAP_NHAT_TAY] : nhac;
}
