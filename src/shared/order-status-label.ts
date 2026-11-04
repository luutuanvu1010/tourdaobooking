// Nhãn trạng thái đơn hiển thị cho người dùng (ADR-0166 câu 5, chủ dự án chọn 2026-11-04). Đơn `draft` có HAI nhãn:
//   «Chưa xác nhận» = chưa gửi đi kiểm vé (nhân viên còn tự sửa được, chưa ai được giao việc);
//   «Chờ xác nhận»  = đã gửi và đang chờ người kiểm vé quyết (dòng `ord_confirm_request` còn mở, `dangCho`).
// Lý do: nhân viên bấm «Lưu đơn (chưa xác nhận)» rồi thấy chính đơn đó ghi «Chờ xác nhận» thì tưởng đã có người xử lý. `status` vẫn chỉ ba giá trị.
// Chữ KHÁCH đọc (ảnh gửi khách, biên nhận) vẫn «Chờ xác nhận» cho đơn nháp: khách không cần biết đơn đã qua bước kiểm vé hay chưa (`dungBienNhan`).
// Lịch sử: ADR-0030 điều 3 đổi «Nháp» → «Chờ xác nhận»; ADR-0166 tách làm hai.
// Tệp thuần riêng (không đặt trong web/format.ts): `npm test` chỉ nạp `src/**/*.test.ts`, tệp dưới web/ không có bài
// kiểm chạy được qua `node --test` của repo — web/format.ts re-export lại để chỗ dùng cũ (`./format`) không đổi.
import type { OrderStatus } from "./contracts.ts";

export const STATUS_LABEL: Record<OrderStatus, string> = { draft: "Chưa xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã huỷ" };
/** Nhãn của đơn nháp ĐÃ GỬI đi kiểm vé và chưa ai quyết (ADR-0166 câu 5). Chỉ dùng khi có cờ `dangCho` — không thay `STATUS_LABEL.draft`. */
export const NHAN_DANG_CHO_XAC_NHAN = "Chờ xác nhận";

/**
 * Câu 409 `invalid_transition` khi đơn không chuyển được từ `tu` sang `sang` (route đổi trạng thái): nêu trạng thái hiện tại BẰNG NHÃN (không lộ mã thô như `confirmed` — CLAUDE.md §7).
 * Hai trạng thái giống nhau (bấm lại) thì nói «đã ở trạng thái … rồi» cho tự nhiên; khác nhau thì nêu cả hai nhãn. Nhãn lấy từ `STATUS_LABEL` — không bảng nhãn thứ hai.
 */
export function cauKhongDoiDuocTrangThai(tu: OrderStatus, sang: OrderStatus): string {
  return tu === sang
    ? `Đơn đã ở trạng thái “${STATUS_LABEL[tu]}” rồi.`
    : `Đơn đang ở trạng thái “${STATUS_LABEL[tu]}”, không thể chuyển sang “${STATUS_LABEL[sang]}”.`;
}

/**
 * Nhãn trạng thái HIỂN THỊ của đơn kèm hai mốc sổ tiền (ADR-0024 đ3, ADR-0025 đ9): `status` vẫn chỉ ba giá trị; "Đã giao – đã thu đủ" / "Hoàn thành" SUY
 * RA từ mốc; đơn nháp có cờ `dangCho` ghi «Chờ xác nhận», không cờ ghi «Chưa xác nhận». MỘT hàm cho danh sách, chi tiết, Trang chủ, biên nhận — không chép tay nhãn ở `web/`. `khoa` (dùng cho lớp CSS) KHÔNG phải chữ hiển thị.
 */
export type KhoaTrangThai = OrderStatus | "delivered" | "completed";
export function trangThaiHienThi(o: { status: OrderStatus; deliveredAt?: string | null; completedAt?: string | null; dangCho?: boolean | null }): { khoa: KhoaTrangThai; nhan: string } {
  if (o.status === "confirmed" && o.completedAt) return { khoa: "completed", nhan: "Hoàn thành" };
  if (o.status === "confirmed" && o.deliveredAt) return { khoa: "delivered", nhan: "Đã giao – đã thu đủ" };
  // Cờ chỉ có nghĩa với đơn nháp; `khoa` vẫn `draft` (lớp CSS, màu không đổi). Viết gọn một lệnh vì hàm này nằm trong gói trang Đơn hàng, đang sát trần dung lượng.
  return { khoa: o.status, nhan: o.status === "draft" && o.dangCho ? NHAN_DANG_CHO_XAC_NHAN : STATUS_LABEL[o.status] };
}
