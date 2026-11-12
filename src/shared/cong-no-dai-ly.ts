// ADR-0182 phần A (accepted 2026-11-12) — luật thuần dùng chung máy chủ ↔ giao diện cho hai phiếu của đơn đại lý. Số tiền KHÔNG tính ở đây (phần nghiệp vụ «Công nợ đại lý» ở billing).
import { can, holdsPartner, type PermissionHolder } from "./permissions.ts";

/**
 * «Tài khoản Đối tác» theo ADR-0196 mục 1 (1): giữ quyền Đối tác và KHÔNG giữ quyền Kế toán — hỏi bằng ô `ledger.write` như `laKeToan` của billing (Nền tảng không cho tồn tại tài khoản lai Kế toán + Đối tác, luật vẫn viết đủ).
 * Dùng cho: chữ nút «Tạo biên nhận cho khách» (Đ2 mục 1), bỏ QR giá bán lẻ (Đ2 mục 3 — máy chủ chặn, giao diện ẩn).
 */
export const laTaiKhoanDoiTac = (who: Pick<PermissionHolder, "id" | "permissions">): boolean => holdsPartner(who) && !can(who, "ledger.write"); // «Kế toán» = ô ledger.write, như `laKeToan` của billing

/** Câu khi đơn chưa xác nhận (Đ2 mục 2; chữ khuyến nghị ở bảng «Chữ chờ chủ chọn», chủ duyệt theo khuyến nghị 12/11). */
export const CAU_PHIEU_CHUA_XAC_NHAN = "Phiếu công nợ có sau khi đơn được xác nhận.";
/** Tên phiếu (Đ2 mục 2; khuyến nghị, chủ duyệt 12/11). */
export const TEN_PHIEU_CONG_NO = "Phiếu công nợ với Tour Đảo";
/** Tiền tố nội dung chuyển khoản trên QR của phiếu (khuyến nghị «DL», chủ duyệt 12/11) — để Kế toán nhìn sao kê biết tiền đại lý nộp. QR của khách giữ nguyên. */
export const TIEN_TO_NOI_DUNG_DAI_LY = "DL";

/**
 * Ai xem được phiếu công nợ với Tour Đảo (kể cả QR của phiếu) — ADR-0182 Đ2 mục 2, dòng «Xem phiếu» ở Đ3: Kế toán, Quản trị, Toàn quyền (dùng ô sẵn có `credit.limit.view`, đúng
 * nhóm này) và đại lý CHỦ ĐƠN (ô `credit.own.view`, hồ sơ của PHIÊN phải là bên đặt của đơn). Bán hàng, Hướng dẫn viên, Thực tập: không. Không thêm ô mới, không nới ô nào.
 * Tài khoản giữ quyền Đối tác chỉ đi nhánh đại lý (khuôn route hạn mức: `credit.limit.view || holdsPartner` ⇒ chặn).
 */
export function xemDuocPhieuCongNo(who: Pick<PermissionHolder, "id" | "permissions"> & { partyId: string | null }, bookerPartyId: string | null): boolean {
  if (holdsPartner(who)) return laTaiKhoanDoiTac(who) && can(who, "credit.own.view", { ownerId: who.id }) && who.partyId !== null && who.partyId === bookerPartyId;
  return can(who, "credit.limit.view");
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// ADR-0182 phần B (accepted 2026-11-13) — khoản nộp của đại lý. Chữ theo cột «Khuyến nghị» của bảng «Chữ chờ chủ chọn» (chủ duyệt theo khuyến nghị).
// ---------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * Đơn CÓ PHIẾU theo phạm vi phần B (Đ2 mục 11 «Phạm vi», mục 12) — MỘT vị từ cho route ghi khoản nộp, cổng mở vé (B2) và bài tài khoản lai: đơn đại lý, `nguoi` là tài khoản Đối tác
 * (ADR-0196 mục 1 — giữ quyền Đối tác, không giữ quyền Kế toán) và hồ sơ của `nguoi` CHÍNH LÀ bên đặt. Route ghi truyền người PHIÊN (kèm ô `dai-ly.nop.ghi` own = người lập);
 * cổng vé truyền NGƯỜI LẬP đơn. Sai một điều ⇒ không phiếu, không nút «Đã chuyển tiền», cổng vé giữ như cũ.
 */
export function coPhieuNopTien(v: { nguoi: Pick<PermissionHolder, "id" | "permissions">; partyId: string | null; bookerPartyId: string | null; laDonDaiLy: boolean }): boolean {
  return v.laDonDaiLy && laTaiKhoanDoiTac(v.nguoi) && v.partyId !== null && v.partyId === v.bookerPartyId;
}

/**
 * Trần chống khai trùng (Đ2 mục 4) = số trên QR của phiếu khi có khoản chờ (Đ2 mục 7) — MỘT con số: Công nợ còn lại − khoản nộp đang chờ − khoản «Công ty thu» đang chờ đối chiếu.
 * Không âm (≤ 0 ⇒ không ghi được khoản nộp, không hiện QR).
 */
export const tranNop = (v: { conLai: number; nopCho: number; congTyCho: number }): number => Math.max(0, v.conLai - v.nopCho - v.congTyCho);

/** Nút ghi khoản nộp trên phiếu (Đ2 mục 4). */
export const NUT_DA_CHUYEN_TIEN = "Đã chuyển tiền";
/** Tên khoản (Đ2 mục 4, 7). */
export const TEN_KHOAN_NOP = "Khoản nộp";
/** Dòng khai trong form «Đã chuyển tiền» (Đ2 mục 9); `soTien` đã định dạng. */
export const dongKhachDaTra = (soTien: string): string => `Khách đã trả bạn ${soTien}`;
/** Câu thay QR khi đơn có khoản chờ (Đ2 mục 7). */
export const CAU_CO_KHOAN_CHO = "Đơn đang có khoản chờ Kế toán xác nhận.";
/** Câu chặn quyết toán «nộp» trùng (Đ2 mục 13). */
export const CAU_QUYET_TOAN_TRUNG = "Đơn này đang có khoản nộp chờ xác nhận. Xác nhận hoặc từ chối khoản đó trước.";
/** Câu nhắc ở màn gửi đơn xong (Đ2 mục 11): A = đơn chờ xác nhận, B = đơn đã xác nhận ngay. Cùng chữ cái nhánh với `CAU_BAO_GUI_DON`. */
export const CAU_NHAC_NOP_TIEN: { readonly A: string; readonly B: string } = {
  A: "Đơn đang chờ xác nhận. Khi được xác nhận, bạn chuyển tiền và gửi biên lai ở mục Xem công nợ với Tour Đảo.",
  B: "Đơn đã được xác nhận. Bạn có thể chuyển tiền và gửi biên lai ở mục Xem công nợ với Tour Đảo.",
};
/** Nhãn trạng thái khoản nộp (Đ2 mục 7, 8). */
export const NHAN_TRANG_THAI_NOP: Readonly<Record<"PENDING" | "CONFIRMED" | "REJECTED", string>> = {
  PENDING: "Chờ Kế toán xác nhận",
  CONFIRMED: "Kế toán đã xác nhận",
  REJECTED: "Kế toán từ chối",
};
/** Câu chặn tài khoản Đối tác khai «Công ty thu» cho đơn đang có khoản nộp chờ (Đ2 mục 13, chiều ngược — một lần tiền chỉ khai ở một đường). */
export const CAU_CONG_TY_THU_TRUNG = "Đơn này đang có khoản nộp chờ Kế toán xác nhận. Một lần chuyển tiền chỉ khai ở một chỗ: chờ Kế toán xử lý khoản nộp đó rồi mới ghi «Công ty thu».";
