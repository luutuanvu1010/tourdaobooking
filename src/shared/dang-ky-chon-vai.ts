// Ô chọn vai ở màn DUYỆT phiếu (ADR-0212 Đ3, PF2): luật thuần dùng ở cả giao diện (`web/dang-ky-hang-cho.ts`) lẫn máy chủ (câu báo). Danh sách `vaiChon` do máy chủ trả; không tra bảng vai tĩnh.
// Loại của phiếu không còn trong danh sách (Kế toán vừa tắt) ⇒ ô KHÔNG tự nhảy sang mục đầu: để trống, nút Duyệt chỉ gửi khi người duyệt chọn rõ một loại.

export const CAU_LOAI_DA_TAT = "Vai người dùng này đã tắt. Hãy chọn vai người dùng khác hoặc từ chối phiếu.";

export interface VaiChonDong { ma: string; ten: string }

/** `conDung` = loại của phiếu còn trong danh sách; `giaTriDau` = mã chọn sẵn lúc dựng ô («» = chưa chọn). */
export function trangThaiChonVai(loai: string, vaiChon: readonly VaiChonDong[]): { conDung: boolean; giaTriDau: string } {
  const conDung = vaiChon.some((r) => r.ma === loai);
  return { conDung, giaTriDau: conDung ? loai : "" };
}

/** Hiện câu «đổi loại thì cấp mặc định đổi» khi đã chọn một loại KHÁC loại của phiếu (chưa chọn thì chưa hiện). */
export const canhBaoDoiVai = (chon: string, loai: string): boolean => chon !== "" && chon !== loai;

/**
 * Người đang mở màn duyệt chính là người đã xác minh phiếu: chỉ Toàn quyền duyệt tiếp được (ADR-0207 Đ1, Hiến chương 5.29). Cùng điều kiện với cờ ở máy chủ
 * (`duyet-route.ts`: người xác minh VÀ ô `admin.manage.superadmin`) và trigger `dk_decision_guard` — giao diện chỉ khoá nút cho khớp, máy chủ vẫn chặn.
 */
export const tuDuyetBiChan = (nguoiXacMinhLaBan: boolean, laToanQuyen: boolean): boolean => nguoiXacMinhLaBan && !laToanQuyen;

/** Câu nhắc khi người mở màn duyệt là người đã xác minh phiếu. */
export const cauNguoiXacMinh = (laToanQuyen: boolean): string =>
  laToanQuyen
    ? "Bạn là người đã xác minh phiếu này. Toàn quyền vẫn duyệt được, và lần duyệt sẽ được ghi dấu."
    : "Bạn là người đã xác minh phiếu này nên không duyệt được. Người duyệt phải là một người khác.";

/** Mã gửi lên lệnh duyệt; null = chưa chọn, KHÔNG được gửi (không thay mã âm thầm). */
export const maDuyetGui = (chon: string): string | null => (chon === "" ? null : chon);
