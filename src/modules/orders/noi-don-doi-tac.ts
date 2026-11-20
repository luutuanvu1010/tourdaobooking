// ADR-0221 Đ2 — «Đối tác không nhập nơi đón»: MỘT chỗ nối công tắc với thân lập / lưu nháp. Luật thuần (điền chữ tạm) ở src/shared/chang-dua-don.ts (`dienNoiDonTam`); SQL công tắc ở
// `xac-nhan-repo.ts` (tệp nửa nghiêm). Chỉ `POST /api/orders` và `PUT /api/orders/:id` gọi, TRƯỚC `validateOrder`. Mã quyền Đối tác ở đây là điều kiện DỮ LIỆU của một ngoại lệ có công tắc
// (ai được lưu lượt chưa có nơi đón), không mở thêm thao tác nào: lượt mang chữ tạm bị cổng `pickup_place_required` chặn ở mọi đường xác nhận.
import { dienNoiDonTam } from "../../shared/chang-dua-don";
import { holdsPartner, type PermissionHolder } from "../../shared/permissions";
import { docKhongNhapNoiDon } from "./xac-nhan-repo";

/**
 * Thân sẽ đưa vào `validateOrder`. Người gọi giữ quyền Đối tác (kể cả tài khoản lai — chủ chọn câu 2) VÀ công tắc đang bật ⇒ lượt chiều đi không nơi đón được điền chữ tạm; mọi trường
 * hợp khác trả NGUYÊN thân (luật `kiemChang` từ chối lượt thiếu nơi đón như trước). Công tắc đọc ĐÚNG MỘT lần mỗi request và chỉ khi người gọi giữ quyền Đối tác.
 */
export async function thanKhiKhongNhapNoiDon<T>(db: D1Database, staff: Pick<PermissionHolder, "permissions">, than: T, luc: string): Promise<T> {
  if (!holdsPartner(staff)) return than;
  return (await docKhongNhapNoiDon(db, luc)) ? (dienNoiDonTam(than) as T) : than;
}
