// ADR-0170 Đ3: người giữ quyền Đối tác (kể cả tài khoản lai) không tự huỷ đơn đã có vé mở. MỘT luật cho hai đường huỷ (`POST /status` nhánh cancelled của orders,
// `POST /handler-cancel` của dispatch). Không I/O, không import module: hàm hỏi «đơn có vé đã mở không» do gốc lắp ráp tiêm (`ctx.veDaMoCuaDon`); `null` = không đọc được ⇒ CHẶN.
// Hai lớp: (1) kiểm TRƯỚC khi soạn lô (`chanDoiTacHuy`); (2) câu bảo vệ NỐI VÀO lô huỷ (module `ve-dien-tu`, `cauChanVeDaMo`) làm hỏng cả lô nếu vé vừa được mở xen giữa — route bắt lỗi
// bằng `laLoiVeDaMoTrongLo` và trả cùng câu với lớp (1).
import { error } from "./http.ts";
import { holdsPartner, type PermissionHolder } from "./permissions.ts";

export const CAU_DON_DA_MO_VE = "Đơn đã mở vé nên bạn không tự huỷ được. Liên hệ văn phòng.";
export const CAU_CHUA_KIEM_DUOC_VE = "Chưa kiểm tra được vé của đơn này nên chưa huỷ được. Bạn thử lại sau.";
/** Dấu nhận ra lỗi của câu bảo vệ trong lô: câu bảo vệ cố ý đưa đường dẫn JSON này vào `json_extract`, thông báo lỗi của SQLite nêu lại nó. */
export const DAU_LOI_VE_DA_MO = "don_da_mo_ve";

export const laLoiVeDaMoTrongLo = (e: unknown): boolean => (e instanceof Error ? e.message : String(e)).includes(DAU_LOI_VE_DA_MO);
export const chanVeDaMoTrongLo = (): Response => error(409, "don_da_mo_ve", CAU_DON_DA_MO_VE);

// ADR-0175 Đ3 mục 3: vé đã DÙNG (lượt quét DA_TINH chưa bỏ) chặn mọi đường huỷ và rút xác nhận, mọi người gọi (không riêng Đối tác). Câu bảo vệ `cauChanVeDaDung` đứng đầu lô; dấu nhận ra lỗi là
// đường dẫn `json_extract` hỏng, KHÁC `DAU_LOI_VE_DA_MO` (không chứa nhau) để nơi dịch lỗi không nhầm.
export const CAU_DON_CO_VE_DA_DUNG = "Đơn có vé đã dùng. Bỏ lượt quét trước khi huỷ.";
export const DAU_LOI_VE_DA_DUNG = "don_co_ve_da_dung";
export const laLoiVeDaDungTrongLo = (e: unknown): boolean => (e instanceof Error ? e.message : String(e)).includes(DAU_LOI_VE_DA_DUNG);
export const chanVeDaDungTrongLo = (): Response => error(409, "don_co_ve_da_dung", CAU_DON_CO_VE_DA_DUNG);
export const CAU_DUOI_SO_VE_DA_DUNG = "Số khách mới ít hơn số vé đã dùng của dịch vụ này. Bỏ lượt quét trước khi giảm khách.";
export const CAU_CHUA_KIEM_DUOC_VE_DA_DUNG = "Chưa kiểm tra được vé đã dùng của đơn này nên chưa sửa số khách được. Bạn thử lại sau.";

// ADR-0171 Đ1: CÙNG lõi cho «sửa số khách» (`money-edit`, `handler-money-edit`): tăng hay giảm đều chặn khi đơn đã mở vé; chưa mở thì thôi.
export const CAU_DON_DA_MO_VE_SUA_KHACH = "Đơn đã mở vé nên bạn không tự sửa số khách được. Liên hệ văn phòng.";
export const CAU_CHUA_KIEM_DUOC_VE_SUA_KHACH = "Chưa kiểm tra được vé của đơn này nên chưa sửa số khách được. Bạn thử lại sau.";

/** Trả câu 409 khi phải chặn, `null` khi cho đi tiếp. Người không giữ quyền Đối tác: không hỏi gì (không tốn truy vấn). */
export async function chanDoiTacHuy(
  staff: Pick<PermissionHolder, "permissions">,
  orderId: string,
  veDaMoCuaDon: (orderId: string) => Promise<boolean | null>,
): Promise<Response | null> {
  if (!holdsPartner(staff)) return null;
  const daMo = await veDaMoCuaDon(orderId);
  if (daMo === false) return null;
  return daMo === true ? chanVeDaMoTrongLo() : error(409, "chua_kiem_duoc_ve", CAU_CHUA_KIEM_DUOC_VE);
}

/** ADR-0171 Đ1: như `chanDoiTacHuy` nhưng nói về sửa số khách. Gọi TRƯỚC khi đọc thân và soạn lô ghi. */
export async function chanDoiTacSuaSoKhach(
  staff: Pick<PermissionHolder, "permissions">,
  orderId: string,
  veDaMoCuaDon: (orderId: string) => Promise<boolean | null>,
): Promise<Response | null> {
  if (!holdsPartner(staff)) return null;
  const daMo = await veDaMoCuaDon(orderId);
  if (daMo === false) return null;
  return daMo === true ? error(409, "don_da_mo_ve", CAU_DON_DA_MO_VE_SUA_KHACH) : error(409, "chua_kiem_duoc_ve", CAU_CHUA_KIEM_DUOC_VE_SUA_KHACH);
}
