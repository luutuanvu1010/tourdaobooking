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

/** Mã gửi lên lệnh duyệt; null = chưa chọn, KHÔNG được gửi (không thay mã âm thầm). */
export const maDuyetGui = (chon: string): string | null => (chon === "" ? null : chon);
