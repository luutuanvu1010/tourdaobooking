// Công tắc «Khách của đối tác trả cho Công ty» (ADR-0178 Đ1 mục 1): đọc trạng thái hiện hành. Mặc định BẬT (1) khi chưa có dòng nào — đúng như trước khi có công tắc.
// Hàm này do gốc lắp ráp tiêm vào `ctx.kenhThuHienTai` (`orders` không import billing); lỗi đọc ném ra để router đổi thành `null` (route lập đơn của Đối tác trả 503, không đoán).
import { kenhThuTai } from "./kenh-thu-repo.ts";

export async function kenhThuHienTai(db: D1Database, at: string = new Date().toISOString()): Promise<0 | 1> {
  const v = await kenhThuTai(db, at);
  return v === 0 ? 0 : 1;
}
