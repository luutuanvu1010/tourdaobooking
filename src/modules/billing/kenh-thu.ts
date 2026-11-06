// Công tắc «Khách của đối tác trả cho Công ty» (ADR-0178 Đ1 mục 1): đọc trạng thái hiện hành. Mặc định BẬT (1) khi chưa có dòng nào — đúng như trước khi có công tắc.
// Hàm này do gốc lắp ráp tiêm vào `ctx.kenhThuHienTai` (`orders` không import billing); lỗi đọc ném ra để router đổi thành `null` (route lập đơn của Đối tác trả 503, không đoán).
import type { KenhThuDoiTacDto } from "../../shared/contracts.ts";
import { kenhThuLichSu, kenhThuTai } from "./kenh-thu-repo.ts";

export async function kenhThuHienTai(db: D1Database, at: string = new Date().toISOString()): Promise<0 | 1> {
  const v = await kenhThuTai(db, at);
  return v === 0 ? 0 : 1;
}

/** Trạng thái công tắc và lịch sử đổi (mới nhất trước) cho `GET`/`POST /api/kenh-thu-doi-tac`. */
export async function kenhThuDto(db: D1Database): Promise<KenhThuDoiTacDto> {
  const rows = await kenhThuLichSu(db);
  const lichSu = rows.map((r) => ({ congTyThu: r.company_collects === 1, tuLuc: r.valid_from, nguoiDoi: r.nguoi_doi ?? "(không rõ)" }));
  return { congTyThu: await kenhThuHienTai(db) === 1, tuLuc: lichSu[0]?.tuLuc ?? null, lichSu };
}
