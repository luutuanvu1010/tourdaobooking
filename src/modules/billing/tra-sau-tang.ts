// Câu tăng phiên bản cho các đường ĐẢO / SỬA / HOÀN khoản thu của đơn Trả sau (ADR-0168 Đ2 mục 4: mọi đường làm nợ tăng đều tăng phiên bản của bên đặt, để lệnh xác nhận
// đang chờ thua cả lô). Tách khỏi `tra-sau.ts` vì `service.ts` (nơi gọi) bị `tra-sau.ts` import — tránh vòng nhập. Chỉ đơn Trả sau đã xác nhận mới có câu; đơn Trả trước = rỗng.
import { cauTangPhienBan } from "./tra-sau-gac";
import { donTraSauTheoId } from "./tra-sau-repo";

/** Câu tăng phiên bản của bên đặt đơn `orderId` (rỗng nếu đơn không phải Trả sau đã xác nhận, hoặc chưa có bên đặt). Nối vào CUỐI lô của đường đảo / sửa / hoàn. */
export async function cauTangChoDon(db: D1Database, orderId: string, at: string): Promise<D1PreparedStatement[]> {
  const d = await donTraSauTheoId(db, orderId);
  return d && d.booker_party_id !== null ? cauTangPhienBan(db, d.booker_party_id, at) : [];
}
