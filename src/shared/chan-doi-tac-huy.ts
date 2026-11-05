// ADR-0170 Đ3: người giữ quyền Đối tác (kể cả tài khoản lai) không tự huỷ đơn đã có vé mở. MỘT luật cho hai đường huỷ (`POST /status` nhánh cancelled của orders,
// `POST /handler-cancel` của dispatch). Không I/O, không import module: hàm hỏi «đơn có vé đã mở không» do gốc lắp ráp tiêm (`ctx.veDaMoCuaDon`); `null` = không đọc được ⇒ CHẶN.
import { error } from "./http.ts";
import { holdsPartner, type PermissionHolder } from "./permissions.ts";

export const CAU_DON_DA_MO_VE = "Đơn đã mở vé nên bạn không tự huỷ được. Liên hệ văn phòng.";

/** Trả câu 409 khi phải chặn, `null` khi cho đi tiếp. Người không giữ quyền Đối tác: không hỏi gì (không tốn truy vấn). */
export async function chanDoiTacHuy(
  staff: Pick<PermissionHolder, "permissions">,
  orderId: string,
  veDaMoCuaDon: (orderId: string) => Promise<boolean | null>,
): Promise<Response | null> {
  if (!holdsPartner(staff)) return null;
  const daMo = await veDaMoCuaDon(orderId);
  return daMo === false ? null : error(409, "don_da_mo_ve", CAU_DON_DA_MO_VE);
}
