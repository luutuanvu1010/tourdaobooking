// ADR-0191 — tập mã quyền "xem được mọi khách" (`contact.view = any`), RÚT TỪ bảng quyền (như MA_QUYEN_TIEN của ADR-0090): thêm mã mới có ô này = any thì tự vào,
// không liệt kê tay. Thuần, không I/O; máy chủ (accounts) và bài kiểm cùng dùng.
import { MATRIX, PERMISSION_CODES, type PermissionCode } from "./permissions.ts";

/** Phần của bảng quyền mà hàm cần — để bài kiểm đưa bản sao có thêm mã giả. */
export type BangXemKhach = { readonly "contact.view": Readonly<Record<PermissionCode, string>> };

export function maXemMoiKhach(matrix: BangXemKhach = MATRIX): PermissionCode[] {
  return PERMISSION_CODES.filter((ma) => matrix["contact.view"][ma] === "any");
}

export function coXemMoiKhach(perms: readonly PermissionCode[], matrix: BangXemKhach = MATRIX): boolean {
  const tap = maXemMoiKhach(matrix);
  return perms.some((p) => tap.includes(p));
}

/** ADR-0191 mục 5: câu thay hộp «PIN của tài khoản mới» khi Nhân sự tạo tài khoản xem mọi khách. */
export const CAU_CHO_QUAN_TRI_CAP_PIN = "Tài khoản này xem được thông tin khách nên PIN đầu do Quản trị cấp. Nhờ Quản trị bấm Đặt lại PIN rồi giao tận tay.";
/** ADR-0191 mục 3(a): 403 khi người không giữ Quản trị gán thêm vai xem mọi khách. */
export const CAU_VAI_XEM_KHACH_NHO_QUAN_TRI = "Vai trò này cho xem thông tin khách — nhờ Quản trị hoặc Toàn quyền gán.";
/** ADR-0191 mục 3 «Rủi ro còn lại»: dòng nhắc ở hộp gán vai của Quản trị. */
export const CAU_NHAC_DAT_LAI_PIN_SAU_GAN_VAI = "Nếu người khác đã biết PIN của tài khoản này, bấm Đặt lại PIN sau khi gán.";
/** Hậu tố nhật ký tạo tài khoản (ADR-0191 mục 6). */
export const HAU_TO_NHAT_KY_CHO_PIN = " — chờ Quản trị cấp PIN";
