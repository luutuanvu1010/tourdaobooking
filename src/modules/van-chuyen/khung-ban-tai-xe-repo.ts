// SQL KHUNG BẬN CỦA TÀI XẾ (ADR-0053 D9; migration 0071 + 0092; kế hoạch A4 T4, T8, G-A4-8). Tệp nghiêm (STRICT — src/architecture.test.ts nạp và EXPLAIN
// từng câu). Tách khỏi khung-ban-repo.ts (chỉ VEHICLE — SO-HANG-RAO Review Focus 4): MỌI câu đọc ở đây lọc `subject = 'DRIVER'` TƯỜNG MINH. Câu dùng cho
// LC-03 và cho văn phòng KHÔNG đọc lý do bận (lời chủ 6.2 — văn phòng chỉ thấy "bận"); lịch chung (`dungLichNgay`, ô trip.view — Kế toán) không gọi tệp
// này (ADR-0053 :147). Bài khoá: khung-ban-tai-xe.test.ts.
import { defineSql } from "../../shared/sql-registry.ts";

export interface KhungTaiXeRow {
  id: string;
  driver_party_id: string;
  start_ms: number;
  end_ms: number;
}
const KHUNG_TAI_XE_TRONG_KHOANG = defineSql("van-chuyen", "khung_tai_xe_trong_khoang",
  `SELECT u.id, u.driver_party_id, u.start_ms, u.end_ms FROM vc_unavailability u
   WHERE u.subject = 'DRIVER' AND u.driver_party_id = ?1 AND u.withdrawn_at IS NULL AND u.start_ms < ?3 AND u.end_ms > ?2 ORDER BY u.start_ms`);

/** Khung CÒN HIỆU LỰC của MỘT tài xế giao [tuMs, denMs) (nửa mở) — LC-03 lúc tạo / sửa chuyến. Không lý do. */
export async function khungTaiXeTrongKhoang(db: D1Database, partyId: string, tuMs: number, denMs: number): Promise<KhungTaiXeRow[]> {
  return (await db.prepare(KHUNG_TAI_XE_TRONG_KHOANG).bind(partyId, tuMs, denMs).all<KhungTaiXeRow>()).results;
}
