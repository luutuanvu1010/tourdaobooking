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

// ---- Bước xác minh của người trong công ty (ADR-0207 Đ2, Đ9; đợt 1 Task 6) ----
export interface PhieuXetRow {
  id: string; kind: string; status: string; role_code: string; current_version: number; reason_code: string | null;
  match_kind: string | null; match_party_id: string | null; verified_by: string | null; verified_version: number | null;
  submitted_at: string | null; activated_at: string | null; created_at: string;
}
const PHIEU_XET = defineSql(
  "dang-ky",
  "registration_for_review",
  `SELECT id, kind, status, role_code, current_version, reason_code, match_kind, match_party_id, verified_by, verified_version, submitted_at, activated_at, created_at
   FROM dk_registration WHERE id = ?1`,
);
export const phieuXet = (db: D1Database, id: string): Promise<PhieuXetRow | null> => db.prepare(PHIEU_XET).bind(id).first<PhieuXetRow>();

export interface HangChoRow { id: string; status: string; role_code: string; current_version: number; submitted_at: string | null; created_at: string }
// Quản trị, Toàn quyền: mọi phiếu CHƯA KẾT THÚC (không gồm ĐÃ DUYỆT, TỪ CHỐI, ĐÃ RÚT, HẾT HẠN). Chỉ mã, loại, mốc — không tên, không liên hệ.
const HANG_CHO_TAT_CA = defineSql(
  "dang-ky",
  "queue_all_open",
  `SELECT id, status, role_code, current_version, submitted_at, created_at FROM dk_registration
   WHERE status IN ('DANG_DIEN', 'CHO_XAC_MINH', 'CAN_BO_SUNG', 'CHO_DUYET') ORDER BY COALESCE(submitted_at, created_at), id LIMIT 200`,
);
// Nhân sự: phiếu CHỜ DUYỆT (ADR-0207 Đ4) và phiếu ĐÃ DUYỆT mà tài khoản chưa kích hoạt (Đ7: «Chưa kích hoạt» hiện ở hàng chờ để Nhân sự theo dõi, gửi lại lời mời).
const HANG_CHO_DUYET = defineSql(
  "dang-ky",
  "queue_awaiting_approval",
  `SELECT id, status, role_code, current_version, submitted_at, created_at FROM dk_registration
   WHERE status = 'CHO_DUYET' OR (status = 'DA_DUYET' AND activated_at IS NULL) ORDER BY COALESCE(submitted_at, created_at), id LIMIT 200`,
);
export async function hangCho(db: D1Database, chiChoDuyet: boolean): Promise<HangChoRow[]> {
  return (await db.prepare(chiChoDuyet ? HANG_CHO_DUYET : HANG_CHO_TAT_CA).all<HangChoRow>()).results;
}

export interface BanKhaiRow {
  version: number; family_name: string | null; middle_name: string | null; given_name: string; gender: string | null; birth_date: string | null; address_value: string | null;
  phone_value: string | null; phone_key: string | null; document_type_code: string | null; number_key: string | null; license_class_code: string | null;
  issued_date: string | null; issued_place: string | null; expiry_date: string | null; referrer_text: string | null; created_at: string;
}
// KHÔNG chọn document_number: số đầy đủ chỉ ra khỏi máy chủ ở route xem-so, sau khi nhật ký đã ghi.
const BAN_KHAI = defineSql(
  "dang-ky",
  "submission_for_review",
  `SELECT version, family_name, middle_name, given_name, gender, birth_date, address_value, phone_value, phone_key, document_type_code, number_key, license_class_code,
          issued_date, issued_place, expiry_date, referrer_text, created_at
   FROM dk_submission WHERE registration_id = ?1 AND version = ?2`,
);
export const banKhaiXet = (db: D1Database, registrationId: string, version: number): Promise<BanKhaiRow | null> => db.prepare(BAN_KHAI).bind(registrationId, version).first<BanKhaiRow>();

const SO_DAY_DU = defineSql(
  "dang-ky",
  "submission_full_number",
  "SELECT document_number, document_type_code FROM dk_submission WHERE registration_id = ?1 AND version = ?2 AND document_number IS NOT NULL",
);
export const soDayDuCuaBanKhai = (db: D1Database, registrationId: string, version: number): Promise<{ document_number: string; document_type_code: string | null } | null> =>
  db.prepare(SO_DAY_DU).bind(registrationId, version).first<{ document_number: string; document_type_code: string | null }>();

const MUC_RIENG_PHIEU = defineSql(
  "dang-ky",
  "policy_phieu_required_items",
  "SELECT phieu_required_items AS items FROM dk_policy WHERE valid_from_at <= ?1 ORDER BY valid_from_at DESC LIMIT 1",
);
/** Mục bắt buộc CHỈ phiếu cần ở dòng chính sách hiệu lực tại `at`; chưa có dòng ⇒ rỗng. */
export async function mucRiengCuaPhieu(db: D1Database, at: string): Promise<string> {
  return (await db.prepare(MUC_RIENG_PHIEU).bind(at).first<{ items: string }>())?.items ?? "";
}

// Kết luận MỚI NHẤT của từng mục ở một bản khai (dòng chỉ-thêm; dòng sau thắng).
const KET_LUAN_MOI_NHAT = defineSql(
  "dang-ky",
  "item_result_latest",
  `SELECT r.item_code, r.result, r.reason_code FROM dk_item_result r
   WHERE r.registration_id = ?1 AND r.version = ?2
     AND NOT EXISTS (SELECT 1 FROM dk_item_result n WHERE n.registration_id = r.registration_id AND n.version = r.version AND n.item_code = r.item_code
                       AND (n.created_at > r.created_at OR (n.created_at = r.created_at AND n.rowid > r.rowid)))
   ORDER BY r.item_code`,
);
export async function ketLuanMoiNhat(db: D1Database, registrationId: string, version: number): Promise<{ item_code: string; result: "DAT" | "KHONG_DAT"; reason_code: string | null }[]> {
  return (await db.prepare(KET_LUAN_MOI_NHAT).bind(registrationId, version).all<{ item_code: string; result: "DAT" | "KHONG_DAT"; reason_code: string | null }>()).results;
}

// Câu ghi. Thứ tự lô CỐ ĐỊNH: [câu đổi (mang điều kiện trạng thái), dòng lịch sử (WHERE changes() > 0), nhật ký (onlyIf changes() > 0), …]. Điều kiện nằm TRONG câu; 0 dòng ⇒ phiếu đã bị xử lý.
const KET_LUAN_CHEN = defineSql(
  "dang-ky",
  "item_result_insert",
  `INSERT INTO dk_item_result (id, registration_id, version, item_code, result, reason_code, verified_by, verified_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, r.id, r.current_version, ?3, ?4, ?5, ?6, ?7, ?7, ?6, ?7, ?6 FROM dk_registration r WHERE r.id = ?2 AND r.status = 'CHO_XAC_MINH' AND r.current_version >= 1`,
);
export const ketLuanMucStatement = (db: D1Database, v: { registrationId: string; item: string; dat: boolean; lyDo: string | null; by: string; at: string }): D1PreparedStatement =>
  db.prepare(KET_LUAN_CHEN).bind(crypto.randomUUID(), v.registrationId, v.item, v.dat ? "DAT" : "KHONG_DAT", v.lyDo, v.by, v.at);

const SU_KIEN_NEU = defineSql(
  "dang-ky",
  "event_staff_if_prev",
  `INSERT INTO dk_event (id, registration_id, actor_kind, actor_ref, command, reason_code, at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, 'STAFF', ?3, ?4, ?5, ?6, ?6, ?3, ?6, ?3 WHERE changes() > 0`,
);
/** Dòng lịch sử của người trong công ty; chỉ ghi khi câu liền trước đổi dòng. `command` là mã chữ hoa (KET_LUAN, DAT, BO_SUNG, TU_CHOI…); lịch sử KHÔNG mang số, tên, liên hệ. */
export const suKienNhanVienStatement = (db: D1Database, v: { registrationId: string; staffId: string; command: string; lyDo: string | null; at: string }): D1PreparedStatement =>
  db.prepare(SU_KIEN_NEU).bind(crypto.randomUUID(), v.registrationId, v.staffId, v.command, v.lyDo, v.at);

// «Đạt»: mọi mục bắt buộc có kết luận MỚI NHẤT là DAT ở bản khai hiện hành VÀ đã có kết luận Danh bạ (cột match_*, hoặc đặt cùng lệnh). Danh sách mục là tham số JSON (?6).
const DAT_CAP = defineSql(
  "dang-ky",
  "registration_verify_pass",
  `UPDATE dk_registration
      SET status = 'CHO_DUYET', verified_by = ?2, verified_version = current_version, verified_at = ?3,
          match_kind = COALESCE(?4, match_kind), match_party_id = CASE WHEN ?4 IS NULL THEN match_party_id ELSE ?5 END, updated_at = ?3, updated_by = ?2
    WHERE id = ?1 AND status = 'CHO_XAC_MINH' AND current_version >= 1 AND COALESCE(?4, match_kind) IS NOT NULL
      AND (SELECT count(*) FROM json_each(?6) j
            WHERE (SELECT x.result FROM dk_item_result x WHERE x.registration_id = dk_registration.id AND x.version = dk_registration.current_version AND x.item_code = j.value
                    ORDER BY x.created_at DESC, x.rowid DESC LIMIT 1) = 'DAT') = json_array_length(?6)`,
);
export const datStatement = (db: D1Database, v: { registrationId: string; by: string; at: string; matchKind: "NEW" | "EXISTING" | null; matchPartyId: string | null; mucBatBuoc: readonly string[] }): D1PreparedStatement =>
  db.prepare(DAT_CAP).bind(v.registrationId, v.by, v.at, v.matchKind, v.matchPartyId, JSON.stringify(v.mucBatBuoc));

const BO_SUNG_CAP = defineSql(
  "dang-ky",
  "registration_supplement",
  `UPDATE dk_registration SET status = 'CAN_BO_SUNG', reason_code = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND status = 'CHO_XAC_MINH'`,
);
export const boSungStatement = (db: D1Database, v: { registrationId: string; lyDo: string; by: string; at: string }): D1PreparedStatement =>
  db.prepare(BO_SUNG_CAP).bind(v.registrationId, v.lyDo, v.at, v.by);

const TU_CHOI_CAP = defineSql(
  "dang-ky",
  "registration_reject",
  `UPDATE dk_registration SET status = 'TU_CHOI', reason_code = ?2, decided_at = ?3, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND status = 'CHO_XAC_MINH'`,
);
export const tuChoiStatement = (db: D1Database, v: { registrationId: string; lyDo: string; by: string; at: string }): D1PreparedStatement =>
  db.prepare(TU_CHOI_CAP).bind(v.registrationId, v.lyDo, v.at, v.by);

const LY_DO_CUA_PHIEU = defineSql("dang-ky", "registration_reason", "SELECT status, reason_code FROM dk_registration WHERE id = ?1");
/** Trạng thái và mã lý do của phiếu (cho trang trạng thái của người đăng ký — nhãn lấy ở `cauLyDoChoNguoiDangKy`). */
export const lyDoCuaPhieu = (db: D1Database, registrationId: string): Promise<{ status: string; reason_code: string | null } | null> =>
  db.prepare(LY_DO_CUA_PHIEU).bind(registrationId).first<{ status: string; reason_code: string | null }>();
