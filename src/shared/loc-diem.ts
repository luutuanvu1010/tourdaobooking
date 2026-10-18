// Ô tìm điểm ở ô chọn "Nơi đón" / "Nơi trả" của khối Đưa đón (đánh giá ERP 7/10 C10; việc 11 — C4). Khuôn ô tìm dịch vụ "Tìm theo tên hoặc mã dịch vụ" (`web/catalog-picker.ts`,
// `locDanhMuc`): lọc trên nhãn hiển thị, giữ thứ tự danh mục. Khác: bỏ dấu tiếng Việt (MỘT hàm `normName` của ô chọn người phụ trách) và gộp khoảng trắng,
// vì tên điểm hay gõ không dấu ("muong thanh"). CHỈ để hiển thị: KHÔNG đụng khoá so sánh nơi (`place_key`, `khoaNoi*` — cửa một chiều). Thuần, không I/O.
import { normName } from "./assignee-pick.ts";

const chuan = (s: string): string => normName(s).replace(/\s+/g, " ").trim();

/**
 * Điểm có nhãn chứa chuỗi gõ (bỏ dấu, không phân biệt hoa thường, gộp khoảng trắng); ô trống → cả danh sách. Điểm `dangChon` (id đang lưu trong ô chọn)
 * LUÔN giữ — thiếu nó thì ô chọn tự rơi về trống, mất lựa chọn của người dùng.
 */
export function locDiem<T extends { id: string; nhan: string }>(ds: readonly T[], kim: string, dangChon: string): T[] {
  const k = chuan(kim);
  if (k === "") return [...ds];
  return ds.filter((d) => d.id === dangChon || chuan(d.nhan).includes(k));
}
