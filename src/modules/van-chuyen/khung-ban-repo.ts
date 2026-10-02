// SQL KHUNG BẬN của van-chuyen (ADR-0055 VK2-A; hình bảng dùng chung ADR-0053 D9.1; migration 0071). Tệp thứ BA của module nghiêm (STRICT —
// src/architecture.test.ts nạp và EXPLAIN từng câu). Mọi câu TĨNH qua defineSql, tham số ?N; import đuôi .ts.
// - MỌI câu đọc lọc `subject = 'VEHICLE'` TƯỜNG MINH (D9.2 / Review Focus 4 của kế hoạch Đợt 3): khi Đợt 6 mở khung bận tài xế, người có `trip.view`
//   (Kế toán) không được thấy dòng DRIVER qua các câu này. Bài khoá: src/modules/van-chuyen/dieu-phoi-doc.test.ts.
// - Chỉ thêm; một kiểu sửa: rút một lần (khoá lạc quan `version`, trigger vc_unavailability_withdraw_once ở CSDL). Không câu DELETE.
import { defineSql } from "../../shared/sql-registry.ts";

export interface KhungBanRow {
  id: string;
  vehicle_id: string;
  start_ms: number;
  end_ms: number;
  reason_code: string;
  reason_label: string;
  withdrawn_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}
const COT = `u.id, u.vehicle_id, u.start_ms, u.end_ms, u.reason_code, r.label AS reason_label, u.withdrawn_at, u.version, u.created_at, u.updated_at`;
const KHUNG_CUA_XE = defineSql("van-chuyen", "khung_ban_cua_xe",
  `SELECT ${COT} FROM vc_unavailability u JOIN vc_reason r ON r.code = u.reason_code WHERE u.subject = 'VEHICLE' AND u.vehicle_id = ?1 ORDER BY u.start_ms DESC LIMIT 200`);
const KHUNG_XE_TRONG_KHOANG = defineSql("van-chuyen", "khung_ban_xe_trong_khoang",
  `SELECT ${COT} FROM vc_unavailability u JOIN vc_reason r ON r.code = u.reason_code
   WHERE u.subject = 'VEHICLE' AND u.withdrawn_at IS NULL AND u.start_ms < ?2 AND u.end_ms > ?1 ORDER BY u.vehicle_id, u.start_ms`);
const KHUNG_THEO_ID = defineSql("van-chuyen", "khung_ban_theo_id",
  `SELECT ${COT} FROM vc_unavailability u JOIN vc_reason r ON r.code = u.reason_code WHERE u.subject = 'VEHICLE' AND u.id = ?1 AND u.vehicle_id = ?2`);
const KHUNG_INSERT = defineSql("van-chuyen", "khung_ban_insert",
  `INSERT INTO vc_unavailability (id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, created_by, updated_at, updated_by)
   VALUES (?1, 'VEHICLE', ?2, NULL, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?8, ?9)`);
const KHUNG_RUT = defineSql("van-chuyen", "khung_ban_rut",
  `UPDATE vc_unavailability SET withdrawn_at = ?3, withdrawn_by = ?4, version = version + 1, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND version = ?2 AND withdrawn_at IS NULL AND subject = 'VEHICLE'`);

/** Mọi khung (kể cả đã rút, đã qua) của một xe — mới trước, tối đa 200. */
export async function khungBanCuaXe(db: D1Database, xeId: string): Promise<KhungBanRow[]> {
  return (await db.prepare(KHUNG_CUA_XE).bind(xeId).all<KhungBanRow>()).results;
}
/** Khung CÒN HIỆU LỰC của MỌI xe giao [tuMs, denMs) (nửa mở). */
export async function khungBanXeTrongKhoang(db: D1Database, tuMs: number, denMs: number): Promise<KhungBanRow[]> {
  return (await db.prepare(KHUNG_XE_TRONG_KHOANG).bind(tuMs, denMs).all<KhungBanRow>()).results;
}
export async function khungBanTheoId(db: D1Database, id: string, xeId: string): Promise<KhungBanRow | null> {
  return db.prepare(KHUNG_THEO_ID).bind(id, xeId).first<KhungBanRow>();
}
/** `start_at`/`end_at` = ISO UTC của cùng mốc (phút tròn do ô HH:MM — CHECK của 0071). */
export const insertKhungBanStatement = (db: D1Database, id: string, xeId: string, k: { batDauMs: number; ketThucMs: number; lyDo: string }, at: string, actorId: string): D1PreparedStatement =>
  db.prepare(KHUNG_INSERT).bind(id, xeId, k.batDauMs, k.ketThucMs, new Date(k.batDauMs).toISOString(), new Date(k.ketThucMs).toISOString(), k.lyDo, at, actorId);
export const rutKhungBanStatement = (db: D1Database, id: string, version: number, at: string, actorId: string): D1PreparedStatement =>
  db.prepare(KHUNG_RUT).bind(id, version, at, actorId);
