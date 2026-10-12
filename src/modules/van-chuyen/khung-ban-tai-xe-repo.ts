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

// ---- Báo bận của tài xế (kế hoạch A4 T8; ADR-0053 D9) — chỉ thêm; một kiểu sửa: rút một lần (khoá lạc quan `version`). Không câu DELETE. Câu ghi / rút / đọc
// theo id đều kèm `driver_party_id` của NGƯỜI GỌI — chặn IDOR ở SQL, không chỉ ở route.
export interface KhungCuaToiRow extends KhungTaiXeRow {
  reason_code: string;
  reason_label: string;
  withdrawn_at: string | null;
  version: number;
}
/** Khung CÒN HIỆU LỰC (chưa rút, chưa qua) của CHÍNH tài xế — câu DUY NHẤT của tệp được đọc nhãn lý do (người đọc là chủ khung; G-A4-8). */
const KHUNG_TAI_XE_CUA_TOI = defineSql("van-chuyen", "khung_tai_xe_cua_toi",
  `SELECT u.id, u.driver_party_id, u.start_ms, u.end_ms, u.reason_code, r.label AS reason_label, u.withdrawn_at, u.version
   FROM vc_unavailability u JOIN vc_reason r ON r.code = u.reason_code
   WHERE u.subject = 'DRIVER' AND u.driver_party_id = ?1 AND u.withdrawn_at IS NULL AND u.end_ms > ?2 ORDER BY u.start_ms LIMIT 200`);
/** Một khung của CHÍNH tài xế theo id (rút) — không lý do. */
const KHUNG_TAI_XE_THEO_ID = defineSql("van-chuyen", "khung_tai_xe_theo_id",
  `SELECT u.id, u.driver_party_id, u.start_ms, u.end_ms, u.withdrawn_at, u.version FROM vc_unavailability u
   WHERE u.subject = 'DRIVER' AND u.id = ?1 AND u.driver_party_id = ?2`);
/** Dải "Tài xế bận" của văn phòng (G-A4-19): khung còn hiệu lực của MỌI tài xế giao [tuMs, denMs) — KHÔNG lý do (lời chủ 6.2). */
const KHUNG_TAI_XE_VAN_PHONG = defineSql("van-chuyen", "khung_tai_xe_van_phong",
  `SELECT u.id, u.driver_party_id, u.start_ms, u.end_ms FROM vc_unavailability u
   WHERE u.subject = 'DRIVER' AND u.withdrawn_at IS NULL AND u.start_ms < ?2 AND u.end_ms > ?1 ORDER BY u.start_ms, u.driver_party_id LIMIT 500`);
const KHUNG_TAI_XE_INSERT = defineSql("van-chuyen", "khung_tai_xe_insert",
  `INSERT INTO vc_unavailability (id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, created_by, updated_at, updated_by)
   VALUES (?1, 'DRIVER', NULL, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?8, ?9)`);
const KHUNG_TAI_XE_RUT = defineSql("van-chuyen", "khung_tai_xe_rut",
  `UPDATE vc_unavailability SET withdrawn_at = ?3, withdrawn_by = ?4, version = version + 1, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND version = ?2 AND withdrawn_at IS NULL AND subject = 'DRIVER' AND driver_party_id = ?5`);

export async function khungCuaToi(db: D1Database, partyId: string, bayGioMs: number): Promise<KhungCuaToiRow[]> {
  return (await db.prepare(KHUNG_TAI_XE_CUA_TOI).bind(partyId, bayGioMs).all<KhungCuaToiRow>()).results;
}
export async function khungTaiXeTheoId(db: D1Database, id: string, partyId: string): Promise<(KhungTaiXeRow & { withdrawn_at: string | null; version: number }) | null> {
  return db.prepare(KHUNG_TAI_XE_THEO_ID).bind(id, partyId).first<KhungTaiXeRow & { withdrawn_at: string | null; version: number }>();
}
export async function khungTaiXeVanPhong(db: D1Database, tuMs: number, denMs: number): Promise<KhungTaiXeRow[]> {
  return (await db.prepare(KHUNG_TAI_XE_VAN_PHONG).bind(tuMs, denMs).all<KhungTaiXeRow>()).results;
}
/** `start_at`/`end_at` = ISO UTC của cùng mốc (phút tròn — CHECK của 0071). */
export const insertKhungTaiXeStatement = (db: D1Database, id: string, partyId: string, k: { batDauMs: number; ketThucMs: number; lyDo: string }, at: string, actorId: string): D1PreparedStatement =>
  db.prepare(KHUNG_TAI_XE_INSERT).bind(id, partyId, k.batDauMs, k.ketThucMs, new Date(k.batDauMs).toISOString(), new Date(k.ketThucMs).toISOString(), k.lyDo, at, actorId);
export const rutKhungTaiXeStatement = (db: D1Database, id: string, version: number, at: string, actorId: string, partyId: string): D1PreparedStatement =>
  db.prepare(KHUNG_TAI_XE_RUT).bind(id, version, at, actorId, partyId);
