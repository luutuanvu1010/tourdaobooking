// dang-ky/repository.ts — SQL của module dang-ky (ADR-0206). Câu TĨNH, qua defineSql. Chỉ đọc/ghi bảng dk_*.
import { defineSql } from "../../shared/sql-registry.ts";

export interface ChinhSachDangKyRow {
  id: string;
  registration_open: number;
  open_role_codes: string;
  code_digits: number;
  code_ttl_minutes: number;
  code_max_attempts: number;
  ask_per_mailbox: number;
  ask_per_network: number;
  ask_window_minutes: number;
  ask_global_per_hour: number;
  session_idle_minutes: number;
  session_max_hours: number;
  draft_expire_days: number;
  supplement_expire_days: number;
  activation_days: number;
  photo_max_mb: number;
  photo_max_count: number;
  anonymize_days: number;
  files_per_network_hour: number;
  valid_from_at: string;
}

const CHINH_SACH = defineSql("dang-ky", "policy_current", `SELECT id, registration_open, open_role_codes, code_digits, code_ttl_minutes, code_max_attempts, ask_per_mailbox, ask_per_network,
  ask_window_minutes, ask_global_per_hour, session_idle_minutes, session_max_hours, draft_expire_days, supplement_expire_days, activation_days, photo_max_mb, photo_max_count,
  anonymize_days, files_per_network_hour, valid_from_at FROM dk_policy WHERE valid_from_at <= ?1 ORDER BY valid_from_at DESC LIMIT 1`);

/** Dòng chính sách hiệu lực tại `at` (ISO UTC); chưa có dòng nào ⇒ null (người gọi coi là ĐÓNG đăng ký). */
export const chinhSachHienHanh = (db: D1Database, at: string): Promise<ChinhSachDangKyRow | null> => db.prepare(CHINH_SACH).bind(at).first<ChinhSachDangKyRow>();

// ---- Tải tệp của phiếu (ADR-0208 Đ2; Task 5) ----
const PHIEU_CUA_PHIEN = defineSql(
  "dang-ky",
  "registration_of_session",
  `SELECT r.id, r.status FROM dk_registration r JOIN dk_identity i ON i.registration_id = r.id
   WHERE r.id = ?1 AND i.id = ?2 AND i.is_open = 1`,
);
/** Phiếu của phiên đăng ký (danh tính còn mở); không khớp ⇒ null. */
export const phieuCuaPhien = (db: D1Database, registrationId: string, identityId: string): Promise<{ id: string; status: string } | null> =>
  db.prepare(PHIEU_CUA_PHIEN).bind(registrationId, identityId).first<{ id: string; status: string }>();

// Dòng lịch sử «thêm tệp» (chỉ mã, không tên ô hay khoá kho). PHẢI đứng NGAY SAU câu chèn tệp trong lô: `changes() > 0` đọc kết quả của câu liền trước — câu chèn bị trần phiếu từ chối
// (0 dòng) thì không có dòng lịch sử. Trạng thái phiếu do trigger dk_event_tep_status canh (sai ⇒ cả lô hỏng).
const SU_KIEN_THEM_TEP = defineSql(
  "dang-ky",
  "event_add_file",
  `INSERT INTO dk_event (id, registration_id, actor_kind, actor_ref, command, reason_code, at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, 'REGISTRANT', ?3, 'THEM_TEP', NULL, ?4, ?4, ?3, ?4, ?3
   WHERE changes() > 0`,
);
export const suKienThemTepStatement = (db: D1Database, v: { registrationId: string; identityId: string; at: string }): D1PreparedStatement =>
  db.prepare(SU_KIEN_THEM_TEP).bind(crypto.randomUUID(), v.registrationId, v.identityId, v.at);

const TEP_MANG_CHEN = defineSql(
  "dang-ky",
  "upload_attempt_insert",
  "INSERT INTO dk_upload_attempt (id, ip_key, at_ms, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)",
);
const TEP_MANG_DEM = defineSql("dang-ky", "upload_attempt_count", "SELECT count(*) AS n FROM dk_upload_attempt WHERE ip_key = ?1 AND at_ms >= ?2");

/**
 * Đặt chỗ MỘT lượt tải tệp cho địa chỉ mạng trong cửa sổ `windowMs` (khuôn `reserveAttempts` của auth: chèn rồi đếm lại — bắn song song vẫn không vượt `max`).
 * KHÔNG xoá dòng nào (R-N1-9: bảng mới không xoá cứng): lượt bị từ chối do chạy song song vẫn nằm lại và tính vào cửa sổ; địa chỉ đã đủ `max` thì không chèn thêm,
 * nên mỗi địa chỉ chỉ để lại tối đa `max` dòng mỗi cửa sổ. Dọn dòng cũ là việc của tác nhân dọn phiếu (ADR-0208 Đ8), cần quyết định riêng về xoá cứng. Trả `true` nếu được tải.
 */
export async function datChoTepMang(db: D1Database, ipKey: string, max: number, nowMs: number, windowMs: number): Promise<boolean> {
  const since = nowMs - windowMs;
  const dem = async (): Promise<number> => (await db.prepare(TEP_MANG_DEM).bind(ipKey, since).first<{ n: number }>())?.n ?? 0;
  if ((await dem()) >= max) return false;
  await db.prepare(TEP_MANG_CHEN).bind(crypto.randomUUID(), ipKey, nowMs, new Date(nowMs).toISOString()).run();
  return (await dem()) <= max;
}
