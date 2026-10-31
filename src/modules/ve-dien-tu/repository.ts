// SQL của kho vé điện tử (`vdt_*`, migration 0131, ADR-0153 Đ1 — ĐỀ XUẤT chờ chủ duyệt). Câu tĩnh qua defineSql (module nghiêm).
// Mã vé, nội dung QR, khoá kho KHÔNG bao giờ vào nhật ký / phản hồi ghi / câu lỗi: hàm đọc ở đây không có bản trả mã vé thô ra ngoài module.
import { defineSql } from "../../shared/sql-registry.ts";

const DEM_VE_THEO_TRANG_THAI = defineSql("ve-dien-tu", "dem_ve_theo_trang_thai", "SELECT status, count(*) AS so FROM vdt_ticket GROUP BY status");

/** Số vé theo trạng thái (không mã, không ảnh). Dùng làm câu chạm đầu tiên của khung; thống kê theo dịch vụ/nhóm làm ở Task 4c. */
export const demVeTheoTrangThai = async (db: D1Database): Promise<Record<string, number>> => {
  const { results } = await db.prepare(DEM_VE_THEO_TRANG_THAI).all<{ status: string; so: number }>();
  return Object.fromEntries(results.map((r) => [r.status, r.so]));
};
