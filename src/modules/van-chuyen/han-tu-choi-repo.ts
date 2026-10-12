// SQL HẠN TỪ CHỐI + dấu Từ chối của van-chuyen (ADR-0053 D7.2, D8; migration 0092; kế hoạch A4 T3). Tệp nghiêm (STRICT — src/architecture.test.ts nạp
// và EXPLAIN từng câu). CHỈ câu ĐỌC: hạn do trigger 0092 chèn / hạ (`vc_trip_driver_refuse_deadline_ins`, `vc_trip_refuse_deadline_move`); câu GHI bảng
// chuyến (dòng lái REFUSED) chỉ ở chuyen-repo.ts (bài bảng sự kiện (d)). Mọi câu tĩnh qua defineSql, tham số ?N.
import { defineSql } from "../../shared/sql-registry.ts";

const HAN_CUA_CAP = defineSql("van-chuyen", "han_tu_choi_cua_cap",
  `SELECT deadline_ms FROM vc_refuse_deadline WHERE trip_id = ?1 AND driver_party_id = ?2`);
/** Dòng lái đã đóng vì Từ chối của một chuyến (mới trước) + nhãn lý do — chi tiết chuyến văn phòng (T7; lý do chỉ người có trip.dispatch — G-A4-14). */
const TU_CHOI_CUA_CHUYEN = defineSql("van-chuyen", "tu_choi_cua_chuyen",
  `SELECT d.id, d.driver_party_id, d.valid_to_at, d.refuse_reason_code, r.label AS reason_label
   FROM vc_trip_driver d LEFT JOIN vc_reason r ON r.code = d.refuse_reason_code
   WHERE d.trip_id = ?1 AND d.close_reason = 'REFUSED' ORDER BY d.valid_to_at DESC`);
/** G-A4-29: lệnh lặp của Từ chối — sự kiện theo mã yêu cầu (không sửa traLenhLap / EVENT_BY_REQUEST dùng chung). */
const SU_KIEN_TU_CHOI_THEO_YEU_CAU = defineSql("van-chuyen", "su_kien_tu_choi_theo_yeu_cau",
  `SELECT trip_id, kind, created_by FROM vc_trip_event WHERE request_id = ?1`);

/** Hạn Từ chối (ms) của cặp (chuyến, tài xế); `null` = thiếu dòng (khung coi là NGOÀI — đóng mặc định, G-A4-2). */
export async function hanTuChoiCuaCap(db: D1Database, tripId: string, partyId: string): Promise<number | null> {
  return (await db.prepare(HAN_CUA_CAP).bind(tripId, partyId).first<{ deadline_ms: number }>())?.deadline_ms ?? null;
}
export interface TuChoiRow {
  id: string;
  driver_party_id: string;
  valid_to_at: string;
  refuse_reason_code: string | null;
  reason_label: string | null;
}
export async function tuChoiCuaChuyen(db: D1Database, tripId: string): Promise<TuChoiRow[]> {
  return (await db.prepare(TU_CHOI_CUA_CHUYEN).bind(tripId).all<TuChoiRow>()).results;
}
export async function suKienTheoYeuCau(db: D1Database, requestId: string): Promise<{ trip_id: string; kind: string; created_by: string | null }[]> {
  return (await db.prepare(SU_KIEN_TU_CHOI_THEO_YEU_CAU).bind(requestId).all<{ trip_id: string; kind: string; created_by: string | null }>()).results;
}
