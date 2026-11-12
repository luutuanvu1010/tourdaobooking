// ADR-0182 phần A (accepted 2026-11-12) — luật thuần dùng chung máy chủ ↔ giao diện cho hai phiếu của đơn đại lý. Số tiền KHÔNG tính ở đây (phần nghiệp vụ «Công nợ đại lý» ở billing).
import { holdsPartner, type PermissionHolder } from "./permissions.ts";

/**
 * «Tài khoản Đối tác» theo ADR-0196 mục 1 (1): giữ quyền Đối tác và KHÔNG giữ quyền Kế toán (Nền tảng không cho tồn tại tài khoản lai Kế toán + Đối tác, luật vẫn viết đủ).
 * Dùng cho: chữ nút «Tạo biên nhận cho khách» (Đ2 mục 1), bỏ QR giá bán lẻ (Đ2 mục 3 — máy chủ chặn, giao diện ẩn).
 */
export const laTaiKhoanDoiTac = (who: Pick<PermissionHolder, "permissions">): boolean => holdsPartner(who) && !who.permissions.includes("ACCOUNTING");

/** Câu khi đơn chưa xác nhận (Đ2 mục 2; chữ khuyến nghị ở bảng «Chữ chờ chủ chọn», chủ duyệt theo khuyến nghị 12/11). */
export const CAU_PHIEU_CHUA_XAC_NHAN = "Phiếu công nợ có sau khi đơn được xác nhận.";
/** Tên phiếu (Đ2 mục 2; khuyến nghị, chủ duyệt 12/11). */
export const TEN_PHIEU_CONG_NO = "Phiếu công nợ với Tour Đảo";
/** Tiền tố nội dung chuyển khoản trên QR của phiếu (khuyến nghị «DL», chủ duyệt 12/11) — để Kế toán nhìn sao kê biết tiền đại lý nộp. QR của khách giữ nguyên. */
export const TIEN_TO_NOI_DUNG_DAI_LY = "DL";
