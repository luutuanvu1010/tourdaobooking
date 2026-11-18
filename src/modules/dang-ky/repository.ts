// dang-ky/repository.ts — SQL của module dang-ky (ADR-0206). Câu TĨNH, qua defineSql. Chỉ đọc/ghi bảng dk_*.
import { defineSql } from "../../shared/sql-registry.ts";
import type { PhanToChucMoi } from "../../shared/to-chuc.ts";

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
  activation_grace_days: number;
  photo_max_mb: number;
  photo_max_count: number;
  anonymize_days: number;
  files_per_network_hour: number;
  valid_from_at: string;
}

const CHINH_SACH = defineSql("dang-ky", "policy_current", `SELECT id, registration_open, open_role_codes, code_digits, code_ttl_minutes, code_max_attempts, ask_per_mailbox, ask_per_network,
  ask_window_minutes, ask_global_per_hour, session_idle_minutes, session_max_hours, draft_expire_days, supplement_expire_days, activation_days, activation_grace_days, photo_max_mb, photo_max_count,
  anonymize_days, files_per_network_hour, valid_from_at FROM dk_policy WHERE valid_from_at <= ?1 ORDER BY valid_from_at DESC LIMIT 1`);

// Đổi công tắc «Nhận đăng ký mới» và danh sách loại mở (ADR-0206 Đ9; Task 12 vòng sửa 1, I-3). dk_policy CHỈ THÊM DÒNG (trigger dk_policy_no_update / no_delete, migration 0170): chép dòng
// đang hiệu lực, chỉ đổi hai cột `registration_open`, `open_role_codes`; mọi con số khác GIỮ NGUYÊN. Khoá lạc quan: dòng người đặt đã thấy (?4) phải còn là dòng MỚI NHẤT (không xét mốc —
// lệnh của người khác đã ghi thì 0 dòng ⇒ 409; `valid_from_at` UNIQUE là lưới cuối khi hai lệnh cùng mốc). Mở (?2 = 1) mà không có chính sách riêng tư đang hiệu lực ⇒ 0 dòng (lưới sau kiểm ở route).
const DOI_CHINH_SACH = defineSql("dang-ky", "policy_switch_insert", `INSERT INTO dk_policy (id, registration_open, open_role_codes, code_digits, code_ttl_minutes, code_max_attempts, ask_per_mailbox,
    ask_per_network, ask_window_minutes, ask_global_per_hour, session_idle_minutes, session_max_hours, draft_expire_days, supplement_expire_days, activation_days, activation_grace_days, photo_max_mb,
    photo_max_count, anonymize_days, files_per_network_hour, phieu_required_items, valid_from_at, created_at, created_by, updated_at, updated_by)
  SELECT ?1, ?2, ?3, p.code_digits, p.code_ttl_minutes, p.code_max_attempts, p.ask_per_mailbox, p.ask_per_network, p.ask_window_minutes, p.ask_global_per_hour, p.session_idle_minutes,
    p.session_max_hours, p.draft_expire_days, p.supplement_expire_days, p.activation_days, p.activation_grace_days, p.photo_max_mb, p.photo_max_count, p.anonymize_days, p.files_per_network_hour,
    p.phieu_required_items, ?5, ?5, ?6, ?5, ?6
  FROM dk_policy p
  WHERE p.id = ?4 AND p.id = (SELECT e.id FROM dk_policy e ORDER BY e.valid_from_at DESC LIMIT 1) AND p.valid_from_at < ?5
    AND (?2 = 0 OR EXISTS (SELECT 1 FROM v_pty_privacy_effective))`);
export const doiChinhSachStatement = (db: D1Database, v: { id: string; mo: boolean; loaiMo: string; dangHieuLuc: string; at: string; by: string }): D1PreparedStatement =>
  db.prepare(DOI_CHINH_SACH).bind(v.id, v.mo ? 1 : 0, v.loaiMo, v.dangHieuLuc, v.at, v.by);

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

// Dòng lịch sử «gỡ tệp» của người đăng ký (đợt 2 Task 8): chỉ mã lệnh — không tên ô, không khoá kho. ĐỨNG ĐẦU lô gỡ và canh trạng thái phiếu: phiếu không còn ĐANG ĐIỀN / CẦN BỔ SUNG ⇒ 0 dòng
// ⇒ câu gỡ liền sau (`changes() > 0`) cũng không chạy.
const SU_KIEN_GO_TEP = defineSql(
  "dang-ky",
  "event_remove_file",
  `INSERT INTO dk_event (id, registration_id, actor_kind, actor_ref, command, reason_code, at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, 'REGISTRANT', ?3, 'GO_TEP', NULL, ?4, ?4, ?3, ?4, ?3
   WHERE EXISTS (SELECT 1 FROM dk_registration WHERE id = ?2 AND status IN ('DANG_DIEN', 'CAN_BO_SUNG'))`,
);
export const suKienGoTepStatement = (db: D1Database, v: { registrationId: string; identityId: string; at: string }): D1PreparedStatement =>
  db.prepare(SU_KIEN_GO_TEP).bind(crypto.randomUUID(), v.registrationId, v.identityId, v.at);

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
  submitted_at: string | null; activated_at: string | null; created_at: string; referrer_party_id: string | null; verified_at: string | null;
  /** Phần tổ chức (ADR-0212 Đ4): vai của tổ chức và kết luận Danh bạ của tổ chức. */
  org_role_code: string | null; org_match_kind: "NEW" | "EXISTING" | null; org_match_party_id: string | null;
  /** Lời mời vào tổ chức mà phiếu đã gắn lúc gửi (ADR-0213 Đ7.5; migration 0176). Chỉ mã định danh — trạng thái giữ chỗ đọc ở parties. */
  invite_id: string | null;
}
const PHIEU_XET = defineSql(
  "dang-ky",
  "registration_for_review",
  `SELECT id, kind, status, role_code, current_version, reason_code, match_kind, match_party_id, verified_by, verified_version, submitted_at, activated_at, created_at,
          referrer_party_id, verified_at, org_role_code, org_match_kind, org_match_party_id, invite_id
   FROM dk_registration WHERE id = ?1`,
);
export const phieuXet = (db: D1Database, id: string): Promise<PhieuXetRow | null> => db.prepare(PHIEU_XET).bind(id).first<PhieuXetRow>();

export interface HangChoRow { id: string; status: string; role_code: string; current_version: number; submitted_at: string | null; created_at: string; thu: string | null }
/** Số dòng tối đa hàng chờ trả về; câu đọc lấy THÊM một dòng để biết «còn nữa» (rà soát cuối I-4). */
export const TRAN_HANG_CHO = 200;
// Hàng chờ dựng theo NĂNG LỰC của người xem (không theo «thiếu party.view»): xác minh được (registration.verify + party.view — ADR-0219) ⇒ phiếu ĐÃ GỬI chưa kết thúc (CHỜ XÁC MINH, CẦN BỔ SUNG, CHỜ DUYỆT —
// KHÔNG gồm ĐANG ĐIỀN: phiếu nháp chưa gửi không phải việc của ai và không được đẩy phiếu thật ra khỏi trần, rà soát cuối I-4); duyệt được (registration.approve) ⇒ CHỜ DUYỆT và ĐÃ DUYỆT mà tài khoản
// chưa kích hoạt (ADR-0207 Đ4, Đ7); có cả hai (Toàn quyền, Quản lý bán hàng kiêm Quản trị hoặc Nhân sự) ⇒ hợp. Thêm: phiếu TỪ CHỐI có thư báo chưa gửi được (ADR-0206 Đ13, Hiến chương 5.16 «thấy được và gửi lại được»)
// cho đúng bước đã từ chối (xác minh ⇒ người xác minh; duyệt ⇒ người duyệt), chỉ khi danh tính còn email. Cột `thu` = lệnh thư báo MỚI NHẤT của phiếu (một câu, không hỏi từng dòng).
// Phiếu TỪ CHỐI chỉ được xét khi danh tính còn email (tác nhân ẩn danh sau số ngày của chính sách ⇒ số dòng TỪ CHỐI được xét có trần tự nhiên).
// Xếp: việc làm được ngay (CHỜ XÁC MINH, CHỜ DUYỆT) trước, rồi gửi sớm nhất trước. Chỉ mã, loại, mốc — không tên, không liên hệ.
const HANG_CHO = defineSql(
  "dang-ky",
  "queue_by_capability",
  `SELECT id, status, role_code, current_version, submitted_at, created_at, thu FROM (
     SELECT r.id, r.status, r.role_code, r.current_version, r.submitted_at, r.created_at, r.activated_at,
            (SELECT e.command FROM dk_event e WHERE e.registration_id = r.id AND e.command GLOB 'THU_*' ORDER BY e.at DESC, e.rowid DESC LIMIT 1) AS thu,
            EXISTS (SELECT 1 FROM dk_identity i WHERE i.registration_id = r.id AND i.contact_email IS NOT NULL) AS con_email
     FROM dk_registration r
     WHERE r.status IN ('CHO_XAC_MINH', 'CAN_BO_SUNG', 'CHO_DUYET', 'DA_DUYET', 'TU_CHOI')
       AND (r.status <> 'DA_DUYET' OR r.activated_at IS NULL)
       AND (r.status <> 'TU_CHOI' OR EXISTS (SELECT 1 FROM dk_identity t WHERE t.registration_id = r.id AND t.contact_email IS NOT NULL))
   ) q
   WHERE (?1 = 1 AND status IN ('CHO_XAC_MINH', 'CAN_BO_SUNG', 'CHO_DUYET'))
      OR (?2 = 1 AND (status = 'CHO_DUYET' OR status = 'DA_DUYET'))
      OR (status = 'TU_CHOI' AND con_email = 1 AND thu NOT GLOB '*_GUI'
          AND ((?1 = 1 AND thu GLOB 'THU_TU_CHOI_[CL]*') OR (?2 = 1 AND thu GLOB 'THU_TU_CHOI_DUYET_*')))
   ORDER BY CASE WHEN status IN ('CHO_XAC_MINH', 'CHO_DUYET') THEN 0 ELSE 1 END, COALESCE(submitted_at, created_at), id LIMIT 201`,
);
export async function hangCho(db: D1Database, nangLuc: { xacMinh: boolean; duyet: boolean }): Promise<{ ds: HangChoRow[]; conNua: boolean }> {
  const r = (await db.prepare(HANG_CHO).bind(nangLuc.xacMinh ? 1 : 0, nangLuc.duyet ? 1 : 0).all<HangChoRow>()).results;
  return { ds: r.slice(0, TRAN_HANG_CHO), conNua: r.length > TRAN_HANG_CHO };
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

// Kết luận và «đạt» chỉ ghi khi `current_version` bằng bản khai người xác minh đã xem (`phienBan` của thân) — người đăng ký gửi lại giữa chừng thì 0 dòng (ADR-0207 Đ2 mục 2, Đ5).
// Câu ghi. Thứ tự lô CỐ ĐỊNH: [câu đổi (mang điều kiện trạng thái), dòng lịch sử (WHERE changes() > 0), nhật ký (onlyIf changes() > 0), …]. Điều kiện nằm TRONG câu; 0 dòng ⇒ phiếu đã bị xử lý.
const KET_LUAN_CHEN = defineSql(
  "dang-ky",
  "item_result_insert",
  `INSERT INTO dk_item_result (id, registration_id, version, item_code, result, reason_code, verified_by, verified_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, r.id, r.current_version, ?3, ?4, ?5, ?6, ?7, ?7, ?6, ?7, ?6 FROM dk_registration r WHERE r.id = ?2 AND r.status = 'CHO_XAC_MINH' AND r.current_version = ?8`,
);
export const ketLuanMucStatement = (db: D1Database, v: { registrationId: string; item: string; dat: boolean; lyDo: string | null; by: string; at: string; phienBan: number }): D1PreparedStatement =>
  db.prepare(KET_LUAN_CHEN).bind(crypto.randomUUID(), v.registrationId, v.item, v.dat ? "DAT" : "KHONG_DAT", v.lyDo, v.by, v.at, v.phienBan);

const SU_KIEN_NEU = defineSql(
  "dang-ky",
  "event_staff_if_prev",
  `INSERT INTO dk_event (id, registration_id, actor_kind, actor_ref, command, reason_code, at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, 'STAFF', ?3, ?4, ?5, ?6, ?6, ?3, ?6, ?3 WHERE changes() > 0`,
);
/** Dòng lịch sử của người trong công ty; chỉ ghi khi câu liền trước đổi dòng. `command` là mã chữ hoa (KET_LUAN, DAT, BO_SUNG, TU_CHOI…); lịch sử KHÔNG mang số, tên, liên hệ. */
export const suKienNhanVienStatement = (db: D1Database, v: { registrationId: string; staffId: string; command: string; lyDo: string | null; at: string }): D1PreparedStatement =>
  db.prepare(SU_KIEN_NEU).bind(crypto.randomUUID(), v.registrationId, v.staffId, v.command, v.lyDo, v.at);

// ---- Thư báo người đăng ký (ADR-0206 Đ13; Hiến chương 5.16; rà soát cuối I-1) ----
// Trạng thái chờ của thư = dòng lịch sử dk_event, lệnh `THU_<loại>_<trạng thái>` (mã ở rules.ts `maLenhThu`): CHO ghi TRONG lô của lệnh sinh ra thư; GUI / LOI ghi SAU khi gửi (trong waitUntil).
// Không ghi email, không ghi câu lỗi của nhà cung cấp. Danh tính đã ẩn danh (không còn email) ⇒ câu xếp thư khớp 0 dòng: không gửi, không ghi gì.
// Câu xếp thư sau một lệnh ĐỔI phiếu: điều kiện ĐỘC LẬP với `changes()` (lô từ chối kết thúc bằng câu gỡ tệp đọc changes() của câu liền trước) — phiếu phải đang ở `?6` VÀ vừa được CHÍNH lệnh
// này đổi (updated_at = ?5, updated_by = ?3); lệnh khớp 0 dòng thì phiếu không mang đúng mốc đó ⇒ không xếp thư.
const THU_XEP = defineSql(
  "dang-ky",
  "notice_queue_after_change",
  `INSERT INTO dk_event (id, registration_id, actor_kind, actor_ref, command, reason_code, at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, 'STAFF', ?3, ?4, NULL, ?5, ?5, ?3, ?5, ?3
   WHERE EXISTS (SELECT 1 FROM dk_registration r WHERE r.id = ?2 AND r.status = ?6 AND r.updated_at = ?5 AND r.updated_by = ?3)
     AND EXISTS (SELECT 1 FROM dk_identity i WHERE i.registration_id = ?2 AND i.contact_email IS NOT NULL)`,
);
export const cauXepThu = (db: D1Database, v: { registrationId: string; staffId: string; lenh: string; at: string; trangThaiPhieu: string }): D1PreparedStatement =>
  db.prepare(THU_XEP).bind(crypto.randomUUID(), v.registrationId, v.staffId, v.lenh, v.at, v.trangThaiPhieu);
// Câu xếp thư khi GỬI LẠI (phiếu không đổi): phiếu còn ở `?6` và danh tính còn email.
const THU_XEP_LAI = defineSql(
  "dang-ky",
  "notice_requeue",
  `INSERT INTO dk_event (id, registration_id, actor_kind, actor_ref, command, reason_code, at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, 'STAFF', ?3, ?4, NULL, ?5, ?5, ?3, ?5, ?3
   WHERE EXISTS (SELECT 1 FROM dk_registration r WHERE r.id = ?2 AND r.status = ?6)
     AND EXISTS (SELECT 1 FROM dk_identity i WHERE i.registration_id = ?2 AND i.contact_email IS NOT NULL)`,
);
export const cauXepThuLai = (db: D1Database, v: { registrationId: string; staffId: string; lenh: string; at: string; trangThaiPhieu: string }): D1PreparedStatement =>
  db.prepare(THU_XEP_LAI).bind(crypto.randomUUID(), v.registrationId, v.staffId, v.lenh, v.at, v.trangThaiPhieu);
// Kết quả gửi (GUI / LOI) — ghi sau khi gửi, ngoài lô.
const THU_KET_QUA = defineSql(
  "dang-ky",
  "notice_result",
  `INSERT INTO dk_event (id, registration_id, actor_kind, actor_ref, command, reason_code, at, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, 'STAFF', ?3, ?4, NULL, ?5, ?5, ?3, ?5, ?3)`,
);
export const ghiKetQuaThu = async (db: D1Database, v: { registrationId: string; staffId: string; lenh: string; at: string }): Promise<void> => {
  await db.prepare(THU_KET_QUA).bind(crypto.randomUUID(), v.registrationId, v.staffId, v.lenh, v.at).run();
};
const THU_MOI_NHAT = defineSql(
  "dang-ky",
  "notice_latest",
  "SELECT command FROM dk_event WHERE registration_id = ?1 AND command GLOB 'THU_*' ORDER BY at DESC, rowid DESC LIMIT 1",
);
/** Lệnh thư báo MỚI NHẤT của phiếu (THU_…); chưa có ⇒ null. */
export async function lenhThuMoiNhat(db: D1Database, registrationId: string): Promise<string | null> {
  return (await db.prepare(THU_MOI_NHAT).bind(registrationId).first<{ command: string }>())?.command ?? null;
}

// «Trả về xác minh» (ADR-0207 Đ5; rà soát cuối I-3): CHỜ DUYỆT → CHỜ XÁC MINH, ghim phiên bản người duyệt đã xem TRONG câu; xoá kết luận Danh bạ, người giới thiệu đã chọn và người / bản /
// lúc xác minh, kể cả kết luận Danh bạ của tổ chức (trigger dk_registration_return_clear bắt buộc; ADR-0212 Đ4) — người xác minh phải kết luận lại; kết luận từng mục (chỉ thêm) giữ nguyên.
const TRA_VE_CAP = defineSql(
  "dang-ky",
  "registration_return_to_verification",
  `UPDATE dk_registration SET status = 'CHO_XAC_MINH', verified_by = NULL, verified_version = NULL, verified_at = NULL, match_kind = NULL, match_party_id = NULL, referrer_party_id = NULL,
          org_match_kind = NULL, org_match_party_id = NULL, updated_at = ?2, updated_by = ?3
   WHERE id = ?1 AND status = 'CHO_DUYET' AND current_version = ?4`,
);
export const traVeXacMinhStatement = (db: D1Database, v: { registrationId: string; by: string; at: string; phienBan: number }): D1PreparedStatement =>
  db.prepare(TRA_VE_CAP).bind(v.registrationId, v.at, v.by, v.phienBan);

// «Đạt»: mọi mục bắt buộc có kết luận MỚI NHẤT là DAT ở bản khai hiện hành VÀ đã có kết luận Danh bạ (cột match_*, hoặc đặt cùng lệnh). Danh sách mục là tham số JSON (?6).
// Bản khai có phần tổ chức (ADR-0212 Đ5): cũng phải có kết luận Danh bạ của tổ chức (org_match_*, ?9/?10, ghi CÙNG câu với match_*) — thiếu thì câu khớp 0 dòng.
const DAT_CAP = defineSql(
  "dang-ky",
  "registration_verify_pass",
  `UPDATE dk_registration
      SET status = 'CHO_DUYET', verified_by = ?2, verified_version = current_version, verified_at = ?3,
          match_kind = COALESCE(?4, match_kind), match_party_id = CASE WHEN ?4 IS NULL THEN match_party_id ELSE ?5 END, referrer_party_id = ?8,
          org_match_kind = COALESCE(?9, org_match_kind), org_match_party_id = CASE WHEN ?9 IS NULL THEN org_match_party_id ELSE ?10 END, updated_at = ?3, updated_by = ?2
    WHERE id = ?1 AND status = 'CHO_XAC_MINH' AND current_version = ?7 AND COALESCE(?4, match_kind) IS NOT NULL
      AND (COALESCE(?9, org_match_kind) IS NOT NULL
           OR NOT EXISTS (SELECT 1 FROM dk_submission_org o WHERE o.registration_id = dk_registration.id AND o.version = dk_registration.current_version))
      AND (SELECT count(*) FROM json_each(?6) j
            WHERE (SELECT x.result FROM dk_item_result x WHERE x.registration_id = dk_registration.id AND x.version = dk_registration.current_version AND x.item_code = j.value
                    ORDER BY x.created_at DESC, x.rowid DESC LIMIT 1) = 'DAT') = json_array_length(?6)`,
);
export const datStatement = (
  db: D1Database,
  v: {
    registrationId: string; by: string; at: string; matchKind: "NEW" | "EXISTING" | null; matchPartyId: string | null; mucBatBuoc: readonly string[]; phienBan: number; referrerPartyId?: string | null;
    orgMatchKind?: "NEW" | "EXISTING" | null; orgMatchPartyId?: string | null;
  },
): D1PreparedStatement =>
  db.prepare(DAT_CAP).bind(v.registrationId, v.by, v.at, v.matchKind, v.matchPartyId, JSON.stringify(v.mucBatBuoc), v.phienBan, v.referrerPartyId ?? null, v.orgMatchKind ?? null, v.orgMatchPartyId ?? null);

const BO_SUNG_CAP = defineSql(
  "dang-ky",
  "registration_supplement",
  `UPDATE dk_registration SET status = 'CAN_BO_SUNG', reason_code = ?2, expires_at = ?6, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND status = 'CHO_XAC_MINH' AND current_version = ?5`,
);
/** `expiresAt` = lúc yêu cầu bổ sung + `supplement_expire_days` (PHU-LUC «Phiếu cần bổ sung mà không sửa: hết hạn sau 14 ngày»); gửi lại thì câu gửi xoá mốc này (đợt 1 Task 9). */
export const boSungStatement = (db: D1Database, v: { registrationId: string; lyDo: string; by: string; at: string; phienBan: number; expiresAt: string }): D1PreparedStatement =>
  db.prepare(BO_SUNG_CAP).bind(v.registrationId, v.lyDo, v.at, v.by, v.phienBan, v.expiresAt);

const TU_CHOI_CAP = defineSql(
  "dang-ky",
  "registration_reject",
  `UPDATE dk_registration SET status = 'TU_CHOI', reason_code = ?2, decided_at = ?3, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND status = 'CHO_XAC_MINH' AND current_version = ?5`,
);
export const tuChoiStatement = (db: D1Database, v: { registrationId: string; lyDo: string; by: string; at: string; phienBan: number }): D1PreparedStatement =>
  db.prepare(TU_CHOI_CAP).bind(v.registrationId, v.lyDo, v.at, v.by, v.phienBan);

const LY_DO_CUA_PHIEU = defineSql("dang-ky", "registration_reason", "SELECT status, reason_code FROM dk_registration WHERE id = ?1");
/** Trạng thái và mã lý do của phiếu (cho trang trạng thái của người đăng ký — nhãn lấy ở `cauLyDoChoNguoiDangKy`). */
export const lyDoCuaPhieu = (db: D1Database, registrationId: string): Promise<{ status: string; reason_code: string | null } | null> =>
  db.prepare(LY_DO_CUA_PHIEU).bind(registrationId).first<{ status: string; reason_code: string | null }>();

// ---- Xin mã và nhập mã của người đăng ký (ADR-0206 Đ6, Đ8; đợt 1 Task 3) ----
export interface DanhTinhTheoEmail { identity_id: string; registration_id: string; status: string; activated_at: string | null; is_open: number }
// (Danh tính đã ẩn danh có số email bị thay bằng dấu nên không bao giờ khớp một email thật.)
// Danh tính EMAIL còn giá trị của một email đã chuẩn hoá: (a) đang mở (phiếu chưa kết thúc), hoặc (b) phiếu ĐÃ DUYỆT mà tài khoản chưa kích hoạt — danh tính đã hạ is_open ở bước duyệt
// nhưng người được duyệt phải vào lại để đặt PIN (ADR-0207 Đ7). Phiếu kết thúc khác (từ chối, rút, hết hạn, đã kích hoạt) không tính: email đó đăng ký lại như người mới.
const DANH_TINH_THEO_EMAIL = defineSql(
  "dang-ky",
  "identity_by_email",
  `SELECT i.id AS identity_id, r.id AS registration_id, r.status, r.activated_at, i.is_open
   FROM dk_identity i JOIN dk_registration r ON r.id = i.registration_id
   WHERE i.provider = 'EMAIL' AND i.subject = ?1
     AND (i.is_open = 1 OR (r.status = 'DA_DUYET' AND r.activated_at IS NULL))
   ORDER BY i.is_open DESC, i.created_at DESC LIMIT 1`,
);
export const danhTinhTheoEmail = (db: D1Database, email: string): Promise<DanhTinhTheoEmail | null> => db.prepare(DANH_TINH_THEO_EMAIL).bind(email).first<DanhTinhTheoEmail>();

// Chèn dòng mã MỚI chỉ khi cả Nền tảng chưa đủ `?7` mã trong cửa sổ `?6` (trần theo giờ, ADR-0206 Đ8): đếm và chèn trong MỘT câu nên chạy song song không vượt trần.
// Không dùng bộ đếm `login_attempt`: bộ đó luôn dọn dòng cũ hơn 15 phút nên không giữ nổi cửa sổ một giờ. Dòng mã không xoá khi dùng (xem `tieuMa`) để trần đếm đúng số thư đã gửi.
const MA_CHEN = defineSql(
  "dang-ky",
  "email_code_insert",
  `INSERT INTO dk_email_code (id, email_key, code_hash, expires_at, attempts, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, 0, ?5, NULL, ?5, NULL
   WHERE (SELECT count(*) FROM dk_email_code WHERE created_at > ?6) < ?7`,
);
/** Chèn mã mới; trả `true` nếu chèn được, `false` nếu cả Nền tảng đã đủ trần trong cửa sổ. */
export async function chenMaEmail(db: D1Database, v: { id: string; emailKey: string; codeHash: string; expiresAt: string; at: string; since: string; tran: number }): Promise<boolean> {
  const r = await db.prepare(MA_CHEN).bind(v.id, v.emailKey, v.codeHash, v.expiresAt, v.at, v.since, v.tran).run();
  return (r.meta.changes ?? 0) === 1;
}

export interface MaGanNhat { id: string; code_hash: string; expires_at: string; attempts: number }
// Chỉ mã MỚI NHẤT của email được kiểm: xin mã mới là mã cũ hết tác dụng.
const MA_GAN_NHAT = defineSql(
  "dang-ky",
  "email_code_latest",
  "SELECT id, code_hash, expires_at, attempts FROM dk_email_code WHERE email_key = ?1 ORDER BY created_at DESC, rowid DESC LIMIT 1",
);
export const maGanNhat = (db: D1Database, emailKey: string): Promise<MaGanNhat | null> => db.prepare(MA_GAN_NHAT).bind(emailKey).first<MaGanNhat>();

// Mã đã dùng hoặc đã nhập sai đủ số lần mang `attempts` = MA_CHET (một dấu cứng, lớn hơn mọi trần có nghĩa): mã đó chết hẳn, kể cả khi Toàn quyền nâng `code_max_attempts` sau đó
// (nếu chỉ so với trần hiện hành thì nâng trần làm mã đã dùng nhập lại được). Dòng được GIỮ để trần theo giờ đếm đúng.
export const MA_CHET = 1_000_000_000;
const MA_DEM_SAI = defineSql(
  "dang-ky",
  "email_code_bump",
  "UPDATE dk_email_code SET attempts = CASE WHEN attempts + 1 >= ?3 THEN ?4 ELSE attempts + 1 END, updated_at = ?2 WHERE id = ?1 AND attempts < ?3",
);
export const demLanNhapSai = (db: D1Database, id: string, at: string, toiDa: number): Promise<D1Result> => db.prepare(MA_DEM_SAI).bind(id, at, toiDa, MA_CHET).run();

// Tiêu mã: đặt dấu MA_CHET (mã không dùng lại được, kể cả khi trần được nâng) nhưng GIỮ dòng để trần theo giờ đếm đúng. MỘT câu có điều kiện, đòi changes = 1 — hai lần nhập song song chỉ một lần thắng.
const MA_TIEU = defineSql("dang-ky", "email_code_consume", "UPDATE dk_email_code SET attempts = ?4, updated_at = ?2 WHERE id = ?1 AND attempts < ?3 AND expires_at > ?2");
export async function tieuMa(db: D1Database, id: string, at: string, toiDa: number): Promise<boolean> {
  return ((await db.prepare(MA_TIEU).bind(id, at, toiDa, MA_CHET).run()).meta.changes ?? 0) === 1;
}

const PHIEU_MOI = defineSql(
  "dang-ky",
  "registration_open_draft",
  `INSERT INTO dk_registration (id, kind, status, role_code, expires_at, created_at, created_by, updated_at, updated_by) VALUES (?1, 'PERSON', 'DANG_DIEN', '', ?3, ?2, NULL, ?2, NULL)`,
);
const DANH_TINH_MOI = defineSql(
  "dang-ky",
  "identity_open",
  `INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, is_open, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, 'EMAIL', ?3, ?3, 1, ?4, NULL, ?4, NULL)`,
);
const SU_KIEN_MO = defineSql(
  "dang-ky",
  "event_open_draft",
  `INSERT INTO dk_event (id, registration_id, actor_kind, actor_ref, command, reason_code, at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, 'REGISTRANT', ?3, 'MO_PHIEU', NULL, ?4, ?4, ?3, ?4, ?3)`,
);
/**
 * Mở phiếu ĐANG ĐIỀN cho một email: MỘT lô [phiếu, danh tính, dòng lịch sử]. `role_code` để trống tới khi người đăng ký chọn loại ở bước lưu nháp. Lô hỏng do chỉ mục «một phiếu đang mở mỗi email» (hai lần nhập song song) ⇒ người gọi đọc lại.
 * `expiresAt` = lúc mở + `draft_expire_days` của chính sách (ADR-0206 Đ3, PHU-LUC «Phiếu đang điền bỏ dở: hết hạn sau 7 ngày») — tác nhân dọn phiếu cho hết hạn theo mốc này (đợt 1 Task 9).
 */
export function moPhieuNhap(db: D1Database, v: { registrationId: string; identityId: string; email: string; at: string; expiresAt: string }): D1PreparedStatement[] {
  return [
    db.prepare(PHIEU_MOI).bind(v.registrationId, v.at, v.expiresAt),
    db.prepare(DANH_TINH_MOI).bind(v.identityId, v.registrationId, v.email, v.at),
    db.prepare(SU_KIEN_MO).bind(crypto.randomUUID(), v.registrationId, v.identityId, v.at),
  ];
}

// ---- Phiếu của chính người đăng ký: xem, lưu nháp, gửi, rút (ADR-0206 Đ6, Đ7; đợt 1 Task 4) ----
export interface PhieuDeXemRow {
  id: string; status: string; role_code: string; org_role_code: string | null; current_version: number; reason_code: string | null; submitted_at: string | null; expires_at: string | null;
  invite_id: string | null;
}
// Khác `phieuCuaPhien` (chỉ danh tính còn mở — cổng của tải tệp): đây là cổng ĐỌC phiếu của chính mình ở mọi trạng thái, vì phiếu ĐÃ DUYỆT (danh tính đã hạ is_open ở bước duyệt, ADR-0207 Đ7),
// TỪ CHỐI, ĐÃ RÚT, HẾT HẠN vẫn phải xem được lý do và trạng thái bằng cookie còn sống. Quyền GHI do từng route kiểm theo trạng thái (không phải ở câu này).
const PHIEU_DE_XEM = defineSql(
  "dang-ky",
  "registration_for_registrant",
  `SELECT r.id, r.status, r.role_code, r.org_role_code, r.current_version, r.reason_code, r.submitted_at, r.expires_at, r.invite_id
   FROM dk_registration r JOIN dk_identity i ON i.registration_id = r.id WHERE r.id = ?1 AND i.id = ?2`,
);
export const phieuDeXem = (db: D1Database, registrationId: string, identityId: string): Promise<PhieuDeXemRow | null> =>
  db.prepare(PHIEU_DE_XEM).bind(registrationId, identityId).first<PhieuDeXemRow>();

// Phiên bản chính sách riêng tư ĐANG CÓ HIỆU LỰC để người đăng ký đồng ý lúc gửi: view công bố của parties (0171) — cùng nghĩa với GET cau-hinh và GET chinh-sach-rieng-tu (bản ngày hiệu lực ở tương lai không tính). Bản mới đăng giữa lúc đọc và lúc ghi
// làm câu chèn bản khai (điều kiện id = id hiện hành) khớp 0 dòng.
const CHINH_SACH_RIENG_TU = defineSql("dang-ky", "privacy_policy_current", "SELECT id, version, covers_org_data FROM v_pty_privacy_effective");
/** `coToChuc` = bản này đã nêu việc thu thông tin tổ chức (ADR-0212 Đ7, cột `covers_org_data`). */
export async function chinhSachRiengTuHienHanh(db: D1Database): Promise<{ id: string; version: number; coToChuc: boolean } | null> {
  const r = await db.prepare(CHINH_SACH_RIENG_TU).first<{ id: string; version: number; covers_org_data: number }>();
  return r ? { id: r.id, version: r.version, coToChuc: r.covers_org_data === 1 } : null;
}
/**
 * Phần tổ chức của biểu mẫu mở được về phía chính sách riêng tư không (ADR-0212 Đ7): bản ĐANG hiệu lực có dấu «Thu thông tin tổ chức». Bản hẹn giờ tương lai chưa tính.
 * Lúc xét luôn là «bây giờ» theo đồng hồ CSDL (view công bố của parties tính hiệu lực bằng `strftime('now')`), nên hàm không nhận tham số giờ.
 */
export async function phanToChucMo(db: D1Database): Promise<boolean> {
  return (await chinhSachRiengTuHienHanh(db))?.coToChuc === true;
}

// Bản khai MỚI NHẤT (không bao giờ lùi về bản cũ hơn), để người đăng ký sửa khi CẦN BỔ SUNG. Đã ẩn danh = tên bị thay bằng dấu «(đã ẩn)» (trigger dk_submission_erase_shape bắt buộc đúng dấu đó) — route kiểm dấu, vì chữ cột ẩn danh chỉ nằm ở parties/repository.ts (bài src/xoa-mot-lenh-co-ten.test.ts). KHÔNG chọn document_number, issued_place, phone_value, phone_key (chỉ «đã khai điện thoại»): DTO không trả các giá trị đó.
export interface BanKhaiTruocRow {
  family_name: string | null; middle_name: string | null; given_name: string; gender: string | null; birth_date: string | null; address_value: string | null; co_dien_thoai: number;
  document_type_code: string | null; number_key: string | null; license_class_code: string | null; issued_date: string | null; expiry_date: string | null;
}
const BAN_KHAI_TRUOC = defineSql(
  "dang-ky",
  "submission_latest_for_registrant",
  `SELECT family_name, middle_name, given_name, gender, birth_date, address_value, phone_key IS NOT NULL AS co_dien_thoai, document_type_code, number_key, license_class_code, issued_date, expiry_date
   FROM dk_submission WHERE registration_id = ?1 ORDER BY version DESC LIMIT 1`,
);
export const banKhaiTruoc = (db: D1Database, registrationId: string): Promise<BanKhaiTruocRow | null> => db.prepare(BAN_KHAI_TRUOC).bind(registrationId).first<BanKhaiTruocRow>();

// Phần tổ chức của bản khai MỚI NHẤT (ADR-0212 Đ4), để người đăng ký sửa khi CẦN BỔ SUNG. KHÔNG chọn mã số thuế, số GPKD, số giấy phép đầy đủ, nơi cấp, số điện thoại (chỉ «đã khai»):
// DTO chỉ trả số che (từ khoá). Đã ẩn danh = tên gọi là dấu «(đã ẩn)» — route kiểm dấu (khuôn banKhaiTruoc).
export interface BanKhaiToChucTruocRow {
  display_name: string; legal_name: string | null; tax_key: string | null; address: string | null; invoice_email: string | null; co_dien_thoai: number;
  gpkd_key: string; gpkd_issued_date: string | null; extra_type_code: string | null; extra_key: string | null; extra_issued_date: string | null; extra_expiry_date: string | null;
}
const BAN_KHAI_TO_CHUC_TRUOC = defineSql(
  "dang-ky",
  "submission_org_for_registrant",
  `SELECT display_name, legal_name, tax_key, address, invoice_email, phone_key IS NOT NULL AS co_dien_thoai, gpkd_key, gpkd_issued_date, extra_type_code, extra_key,
          extra_issued_date, extra_expiry_date
   FROM dk_submission_org WHERE registration_id = ?1 AND version = ?2`,
);
export const banKhaiToChucTruoc = (db: D1Database, registrationId: string, version: number): Promise<BanKhaiToChucTruocRow | null> =>
  db.prepare(BAN_KHAI_TO_CHUC_TRUOC).bind(registrationId, version).first<BanKhaiToChucTruocRow>();

// Phần tổ chức ĐẦY ĐỦ của một bản khai cho người trong công ty (ADR-0212 Đ5, Đ6): bước xác minh (route chỉ trả số CHE, tên, địa chỉ, email, điện thoại) và lô duyệt (chép một–một sang hồ sơ
// tổ chức). Chỉ gọi sau cổng quyền của route. Không ghi giá trị nào vào nhật ký / lịch sử.
export interface BanKhaiToChucRow {
  id: string; display_name: string; legal_name: string | null; tax_code: string | null; tax_key: string | null; address: string | null; invoice_email: string | null;
  phone_value: string | null; phone_key: string | null; gpkd_number: string; gpkd_key: string; gpkd_issued_date: string | null; gpkd_issued_place: string | null;
  extra_type_code: string | null; extra_number: string | null; extra_key: string | null; extra_issued_date: string | null; extra_issued_place: string | null; extra_expiry_date: string | null;
}
const BAN_KHAI_TO_CHUC_DAY_DU = defineSql(
  "dang-ky",
  "submission_org_full_for_staff",
  `SELECT id, display_name, legal_name, tax_code, tax_key, address, invoice_email, phone_value, phone_key, gpkd_number, gpkd_key, gpkd_issued_date, gpkd_issued_place,
          extra_type_code, extra_number, extra_key, extra_issued_date, extra_issued_place, extra_expiry_date
   FROM dk_submission_org WHERE registration_id = ?1 AND version = ?2`,
);
export const banKhaiToChucDayDu = (db: D1Database, registrationId: string, version: number): Promise<BanKhaiToChucRow | null> =>
  db.prepare(BAN_KHAI_TO_CHUC_DAY_DU).bind(registrationId, version).first<BanKhaiToChucRow>();

// Dòng lịch sử lệnh của người đăng ký; chỉ ghi khi câu LIỀN TRƯỚC trong lô đổi dòng. `command` là mã chữ hoa (LUU_NHAP, GUI, GUI_LAI, RUT); lịch sử KHÔNG mang số, tên, liên hệ.
const SU_KIEN_NGUOI_DANG_KY = defineSql(
  "dang-ky",
  "event_registrant_if_prev",
  `INSERT INTO dk_event (id, registration_id, actor_kind, actor_ref, command, reason_code, at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, 'REGISTRANT', ?3, ?4, NULL, ?5, ?5, ?3, ?5, ?3 WHERE changes() > 0`,
);
export const suKienNguoiDangKyStatement = (db: D1Database, v: { registrationId: string; identityId: string; command: string; at: string }): D1PreparedStatement =>
  db.prepare(SU_KIEN_NGUOI_DANG_KY).bind(crypto.randomUUID(), v.registrationId, v.identityId, v.command, v.at);

// Hạn phiếu ĐANG ĐIỀN tính từ THAO TÁC cuối (ADR-0206: «quá 7 ngày không thao tác»; đợt 1 Task 9 vòng sửa 1): mọi lệnh ghi của người đăng ký trên phiếu đang điền (lưu nháp, tải tệp)
// đẩy `expires_at` = lúc thao tác + draft_expire_days, TRONG cùng lô với lệnh đó. Điều kiện trạng thái nằm trong câu (phiếu đã gửi / kết thúc không bị đẩy hạn).
const KEO_DAI_HAN_NHAP = defineSql(
  "dang-ky",
  "registration_touch_draft",
  "UPDATE dk_registration SET expires_at = ?2 WHERE id = ?1 AND status = 'DANG_DIEN'",
);
export const cauKeoDaiHanNhap = (db: D1Database, v: { registrationId: string; expiresAt: string }): D1PreparedStatement => db.prepare(KEO_DAI_HAN_NHAP).bind(v.registrationId, v.expiresAt);

// Đổi vai cá nhân và vai của tổ chức (ADR-0212 Đ4) trong MỘT câu: chỉ khi còn sửa được VÀ chưa gửi lần nào (trigger dk_registration_immutable khoá cả hai sau lần gửi đầu — route kiểm trước,
// trigger là lớp cuối). Không đổi gì ⇒ khớp 0 dòng (dòng lịch sử LUU_NHAP liền sau không ghi).
const LOAI_DOI = defineSql(
  "dang-ky",
  "registration_set_role",
  `UPDATE dk_registration SET role_code = ?2, org_role_code = ?5, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND status IN ('DANG_DIEN', 'CAN_BO_SUNG') AND current_version = 0 AND (role_code <> ?2 OR org_role_code IS NOT ?5)`,
);
export const doiLoaiStatement = (db: D1Database, v: { registrationId: string; role: string; roleToChuc: string | null; identityId: string; at: string }): D1PreparedStatement =>
  db.prepare(LOAI_DOI).bind(v.registrationId, v.role, v.at, v.identityId, v.roleToChuc);

export interface BanKhaiMoi {
  family: string | null; middle: string | null; given: string; gender: string | null; birthDate: string | null; address: string | null; phoneValue: string | null; phoneKey: string | null;
  documentType: string | null; documentNumber: string | null; numberKey: string | null; licenseClass: string | null; issuedDate: string | null; issuedPlace: string | null; expiryDate: string | null;
  referrer: string | null;
}
// GỬI là hai câu có điều kiện NẰM TRONG câu ghi (không dựa vào đọc trước rồi ghi): (1) chèn bản khai kế tiếp CHỈ khi phiếu còn ĐANG ĐIỀN / CẦN BỔ SUNG, đúng số bản khai đã đọc, đã chọn loại, và `?3` vẫn là
// phiên bản chính sách hiện hành (đã chọn loại = vai cá nhân HOẶC vai của tổ chức — phiếu «chỉ tổ chức», Task 13; route đòi phần tổ chức đi cùng); (2) đưa phiếu sang CHỜ XÁC MINH + tăng current_version CHỈ khi bản khai vừa chèn (đúng mã `?2`) có thật. Bấm hai lần: lô thứ hai khớp 0 dòng ở cả hai câu.
// Thứ tự lô CỐ ĐỊNH [chèn, đổi phiếu, dòng lịch sử]: trigger dk_submission_version đòi version = current_version + 1 TRƯỚC khi phiếu tăng.
const GUI_CHEN = defineSql(
  "dang-ky",
  "registration_submit_insert",
  `INSERT INTO dk_submission (id, registration_id, version, family_name, middle_name, given_name, gender, birth_date, address_value, phone_value, phone_key, document_type_code, document_number, number_key,
     license_class_code, issued_date, issued_place, expiry_date, referrer_text, policy_id, consented_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, r.id, r.current_version + 1, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?3, ?4, ?4, ?5, ?4, ?5
   FROM dk_registration r
   WHERE r.id = ?2 AND r.status IN ('DANG_DIEN', 'CAN_BO_SUNG') AND r.current_version = ?22 AND (r.role_code <> '' OR r.org_role_code IS NOT NULL OR ?23 = 1)
     AND ?3 = (SELECT id FROM v_pty_privacy_effective)`,
);
/**
 * `coLoiMoi` (ADR-0213 Đ7.5; mốc B2 Task 15): phiếu có lời mời vào tổ chức hợp lệ ⇒ vai rỗng cả hai vẫn chèn được. Cờ này CHỈ đúng khi CÙNG lô có câu giữ chỗ lời mời của parties
 * (lính gác NULL-on-invalid làm CẢ lô hỏng khi lời mời không còn hợp lệ) — route gửi bảo đảm điều đó.
 */
export const guiChenStatement = (
  db: D1Database, v: { id: string; registrationId: string; policyId: string; at: string; identityId: string; phienBanDaDoc: number; b: BanKhaiMoi; coLoiMoi?: boolean },
): D1PreparedStatement =>
  db.prepare(GUI_CHEN).bind(
    v.id, v.registrationId, v.policyId, v.at, v.identityId, v.b.family, v.b.middle, v.b.given, v.b.gender, v.b.birthDate, v.b.address, v.b.phoneValue, v.b.phoneKey, v.b.documentType,
    v.b.documentNumber, v.b.numberKey, v.b.licenseClass, v.b.issuedDate, v.b.issuedPlace, v.b.expiryDate, v.b.referrer, v.phienBanDaDoc, v.coLoiMoi ? 1 : 0,
  );
// Phần tổ chức (ADR-0212 Đ4): câu thứ HAI của lô gửi, CÙNG phiên bản với bản khai vừa chèn — chỉ chèn khi bản khai mã `?2` có thật và đúng phiên bản kế tiếp (khớp 0 dòng khi lô bấm
// hai lần thua, thay vì để trigger dk_submission_org_version làm hỏng lô). Mọi giá trị đã kiểm ở `kiemPhanToChuc` (src/shared/to-chuc.ts).
const GUI_CHEN_TO_CHUC = defineSql(
  "dang-ky",
  "registration_submit_insert_org",
  `INSERT INTO dk_submission_org (id, registration_id, version, display_name, legal_name, tax_code, tax_key, address, invoice_email, phone_value, phone_key, gpkd_number, gpkd_key,
     gpkd_issued_date, gpkd_issued_place, extra_type_code, extra_number, extra_key, extra_issued_date, extra_issued_place, extra_expiry_date, authority_confirmed_at,
     created_at, created_by, updated_at, updated_by)
   SELECT ?1, s.registration_id, s.version, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?3, ?3, ?4, ?3, ?4
   FROM dk_submission s JOIN dk_registration r ON r.id = s.registration_id
   WHERE s.id = ?2 AND s.version = r.current_version + 1`,
);
export const guiChenToChucStatement = (db: D1Database, v: { id: string; submissionId: string; at: string; identityId: string; t: PhanToChucMoi }): D1PreparedStatement =>
  db.prepare(GUI_CHEN_TO_CHUC).bind(
    v.id, v.submissionId, v.at, v.identityId, v.t.displayName, v.t.legalName, v.t.taxCode, v.t.taxKey, v.t.address, v.t.invoiceEmail, v.t.phoneValue, v.t.phoneKey, v.t.gpkdNumber, v.t.gpkdKey,
    v.t.gpkdIssuedDate, v.t.gpkdIssuedPlace, v.t.extraTypeCode, v.t.extraNumber, v.t.extraKey, v.t.extraIssuedDate, v.t.extraIssuedPlace, v.t.extraExpiryDate,
  );
const GUI_TIEN = defineSql(
  "dang-ky",
  "registration_submit_advance",
  `UPDATE dk_registration SET status = 'CHO_XAC_MINH', current_version = current_version + 1, reason_code = NULL, expires_at = NULL, submitted_at = ?3, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND status IN ('DANG_DIEN', 'CAN_BO_SUNG')
     AND EXISTS (SELECT 1 FROM dk_submission s WHERE s.id = ?2 AND s.registration_id = dk_registration.id AND s.version = dk_registration.current_version + 1)`,
);
export const guiTienStatement = (db: D1Database, v: { registrationId: string; submissionId: string; at: string; identityId: string }): D1PreparedStatement =>
  db.prepare(GUI_TIEN).bind(v.registrationId, v.submissionId, v.at, v.identityId);

// Rút: mọi trạng thái chưa kết thúc (khớp đồ thị của trigger dk_registration_transition). Mốc `decided_at` là lúc phiếu kết thúc (đồng hồ ẩn danh của phiếu không được duyệt, ADR-0208 Đ8).
const RUT_CAP = defineSql(
  "dang-ky",
  "registration_withdraw",
  `UPDATE dk_registration SET status = 'DA_RUT', decided_at = ?2, updated_at = ?2, updated_by = ?3
   WHERE id = ?1 AND status IN ('DANG_DIEN', 'CHO_XAC_MINH', 'CAN_BO_SUNG', 'CHO_DUYET')`,
);
export const rutStatement = (db: D1Database, v: { registrationId: string; identityId: string; at: string }): D1PreparedStatement => db.prepare(RUT_CAP).bind(v.registrationId, v.at, v.identityId);

// Tài khoản CHƯA KÍCH HOẠT (ADR-0207 Đ7): phiếu đã duyệt (`DA_DUYET`) sinh ra tài khoản này mà người đăng ký chưa đặt PIN (`activated_at` còn rỗng). Liên kết là cột `dk_registration.staff_id`
// (ghi ở lô duyệt). Gốc lắp ráp tiêm hàm này cho `accounts` (`ctx.chuaKichHoat`) để các lệnh hỗ trợ đăng nhập từ chối — `accounts` không import `dang-ky`.
const CHUA_KICH_HOAT = defineSql(
  "dang-ky",
  "chua_kich_hoat",
  `SELECT 1 AS co FROM dk_registration WHERE staff_id = ?1 AND status = 'DA_DUYET' AND activated_at IS NULL LIMIT 1`,
);
export async function chuaKichHoat(db: D1Database, staffId: string): Promise<boolean> {
  return (await db.prepare(CHUA_KICH_HOAT).bind(staffId).first<{ co: number }>()) !== null;
}
// Cùng điều kiện, cho CẢ danh sách tài khoản (Task 12 vòng sửa 1, I-1): MỘT câu, trả mọi mã tài khoản chưa kích hoạt — danh sách không gọi một truy vấn cho mỗi tài khoản tắt
// (tài khoản không bao giờ xoá cứng nên số tài khoản tắt chỉ tăng; quá trần truy vấn của một lần gọi D1 thì cả trang hỏng). Các lệnh ghi vẫn hỏi từng mã bằng `chuaKichHoat`.
const TAI_KHOAN_CHUA_KICH_HOAT = defineSql(
  "dang-ky",
  "tai_khoan_chua_kich_hoat",
  `SELECT DISTINCT staff_id FROM dk_registration WHERE status = 'DA_DUYET' AND activated_at IS NULL AND staff_id IS NOT NULL`,
);
export async function taiKhoanChuaKichHoat(db: D1Database): Promise<Set<string>> {
  return new Set((await db.prepare(TAI_KHOAN_CHUA_KICH_HOAT).all<{ staff_id: string }>()).results.map((r) => r.staff_id));
}

// ---- Bước DUYỆT của Nhân sự (ADR-0207 Đ4, Đ5, Đ7; đợt 1 Task 8) ----
export interface BanKhaiDuyetRow {
  family_name: string | null; middle_name: string | null; given_name: string; gender: string | null; birth_date: string | null; address_value: string | null; phone_value: string | null;
  document_type_code: string | null; document_number: string | null; number_key: string | null; license_class_code: string | null; issued_date: string | null; issued_place: string | null;
  expiry_date: string | null; policy_id: string; consented_at: string;
}
// Bản khai ĐÚNG phiên bản đang chờ duyệt, đọc TRƯỚC lô để chép một–một sang hồ sơ. Bản khai bất biến và câu chốt ghim phiên bản, nên giá trị đọc trước không lệch với lúc ghi.
// Đây là câu DUY NHẤT của bước duyệt chọn số giấy tờ đầy đủ: số chỉ đi vào câu ghi của parties, không vào DTO, nhật ký hay câu báo lỗi.
const BAN_KHAI_DUYET = defineSql(
  "dang-ky",
  "submission_for_approval",
  `SELECT family_name, middle_name, given_name, gender, birth_date, address_value, phone_value, document_type_code, document_number, number_key, license_class_code,
          issued_date, issued_place, expiry_date, policy_id, consented_at
   FROM dk_submission WHERE registration_id = ?1 AND version = ?2 AND given_name <> '(đã ẩn)'`,
);
export const banKhaiDeDuyet = (db: D1Database, registrationId: string, version: number): Promise<BanKhaiDuyetRow | null> =>
  db.prepare(BAN_KHAI_DUYET).bind(registrationId, version).first<BanKhaiDuyetRow>();

const TOM_TAT_DUYET = defineSql(
  "dang-ky",
  "submission_summary_for_approver",
  "SELECT family_name, middle_name, given_name, phone_value FROM dk_submission WHERE registration_id = ?1 AND version = ?2 AND given_name <> '(đã ẩn)'",
);
/** Màn duyệt của Nhân sự (ADR-0207 Đ4): CHỈ họ tên và số điện thoại — không ngày sinh, địa chỉ, giấy tờ. */
export const tomTatDeDuyet = (db: D1Database, registrationId: string, version: number): Promise<{ family_name: string | null; middle_name: string | null; given_name: string; phone_value: string | null } | null> =>
  db.prepare(TOM_TAT_DUYET).bind(registrationId, version).first<{ family_name: string | null; middle_name: string | null; given_name: string; phone_value: string | null }>();

const EMAIL_LIEN_LAC = defineSql(
  "dang-ky",
  "identity_contact_email_of_registration",
  "SELECT contact_email FROM dk_identity WHERE registration_id = ?1 AND contact_email IS NOT NULL ORDER BY created_at DESC LIMIT 1",
);
/** Email liên lạc đã xác nhận của phiếu (danh tính còn giữ tới khi kích hoạt — ADR-0208 Đ6); lô duyệt ghi thành liên hệ của hồ sơ. */
export async function emailLienLacCuaPhieu(db: D1Database, registrationId: string): Promise<string | null> {
  return (await db.prepare(EMAIL_LIEN_LAC).bind(registrationId).first<{ contact_email: string }>())?.contact_email ?? null;
}

// Câu 1 — CÂU CHỐT: chèn dòng quyết định DUYET; trigger dk_decision_guard RAISE (hỏng CẢ lô) khi phiếu không CHỜ DUYỆT, sai phiên bản, chưa có kết luận Danh bạ, chưa xác minh đạt,
// hay người duyệt = người xác minh mà không mang cờ. Cờ do MÁY CHỦ đặt (Toàn quyền làm cả hai bước). Chỉ mục dk_decision_once_uq: một dòng DUYET mỗi phiếu.
const CHOT_DUYET = defineSql(
  "dang-ky",
  "decision_approve_insert",
  `INSERT INTO dk_decision (id, registration_id, kind, version, decided_by, super_admin_flag, decided_at, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, 'DUYET', ?3, ?4, ?5, ?6, ?6, ?4, ?6, ?4)`,
);
export const cauChotDuyet = (db: D1Database, v: { id: string; registrationId: string; version: number; by: string; co: 0 | 1; at: string }): D1PreparedStatement =>
  db.prepare(CHOT_DUYET).bind(v.id, v.registrationId, v.version, v.by, v.co, v.at);

// Câu 10a — phiếu sang ĐÃ DUYỆT, ghi hồ sơ + tài khoản kết quả, mốc quyết, và HẠN ĐẶT PIN trong CÙNG câu (trigger dk_registration_deadline). Điều kiện trạng thái + phiên bản là lớp thứ hai.
const DUYET_CAP = defineSql(
  "dang-ky",
  "registration_approve",
  `UPDATE dk_registration SET status = 'DA_DUYET', party_id = ?3, staff_id = ?4, decided_at = ?5, activation_deadline_at = ?6, updated_at = ?5, updated_by = ?7
   WHERE id = ?1 AND status = 'CHO_DUYET' AND current_version = ?2`,
);
export const cauDuyetPhieu = (db: D1Database, v: { registrationId: string; version: number; partyId: string; staffId: string; at: string; deadlineAt: string; by: string }): D1PreparedStatement =>
  db.prepare(DUYET_CAP).bind(v.registrationId, v.version, v.partyId, v.staffId, v.at, v.deadlineAt, v.by);

// Câu 10c — ẨN DANH mọi bản khai của phiếu (ADR-0207 Đ5 câu 9; ADR-0208 Đ6): giá trị đã chép sang hồ sơ nên bản khai không còn giữ; danh tính và email liên lạc (dk_identity) GIỮ tới khi
// kích hoạt. Đúng dấu mà trigger dk_submission_erase_shape đòi. Ngoại lệ có tên của bài src/xoa-mot-lenh-co-ten.test.ts (2). HAI người gọi (đợt 1 Task 9 vòng sửa 1): lô duyệt (câu phiếu
// ĐÃ DUYỆT đứng trước trong lô) và tác nhân dọn phiếu cho phiếu đã kết thúc — khi đó câu CHỈ đổi dòng nếu câu mốc «đã ẩn danh» của CHÍNH lượt này vừa ghi mốc đó (bằng `?2`) lên phiếu
// (chuỗi trong câu: câu mốc mang điều kiện trạng thái + tuổi; khớp 0 dòng thì câu này cũng 0 dòng).
const AN_DANH_BAN_KHAI = defineSql(
  "dang-ky",
  "submission_erase_on_approve",
  `UPDATE dk_submission SET erased_at = ?2, given_name = '(đã ẩn)', family_name = NULL, middle_name = NULL, gender = NULL, birth_date = NULL, address_value = NULL,
          phone_value = NULL, phone_key = NULL, issued_place = NULL, referrer_text = NULL,
          document_number = CASE WHEN document_number IS NULL THEN NULL ELSE 'XOA' || upper(replace(id, '-', '')) END,
          number_key = CASE WHEN number_key IS NULL THEN NULL ELSE 'XOA' || upper(replace(id, '-', '')) END,
          updated_at = ?2, updated_by = ?3
   WHERE registration_id = ?1 AND erased_at IS NULL
     AND EXISTS (SELECT 1 FROM dk_registration r WHERE r.id = ?1 AND (r.status = 'DA_DUYET' OR r.erased_at = ?2))`,
);
export const cauAnDanhBanKhai = (db: D1Database, v: { registrationId: string; at: string; by: string }): D1PreparedStatement => db.prepare(AN_DANH_BAN_KHAI).bind(v.registrationId, v.at, v.by);
// Câu 10c' — ẨN DANH phần tổ chức của mọi bản khai (ADR-0212 Đ7: cùng lúc, cùng hạn với phần cá nhân), đúng dấu trigger dk_submission_org_erase_shape đòi. CÙNG điều kiện chuỗi của câu trên
// (phiếu ĐÃ DUYỆT — lô duyệt; hoặc vừa nhận mốc đã ẩn danh của chính lượt này — tác nhân dọn phiếu). Ngoại lệ có tên của bài src/xoa-mot-lenh-co-ten.test.ts (2), đợt 2 Task 7.
const AN_DANH_BAN_KHAI_TO_CHUC = defineSql(
  "dang-ky",
  "submission_org_erase",
  `UPDATE dk_submission_org SET erased_at = ?2, display_name = '(đã ẩn)', legal_name = NULL, address = NULL, invoice_email = NULL, phone_value = NULL, phone_key = NULL,
          gpkd_issued_place = NULL, extra_issued_place = NULL,
          tax_code = CASE WHEN tax_code IS NULL THEN NULL ELSE 'XOA' || upper(replace(id, '-', '')) END,
          tax_key = CASE WHEN tax_key IS NULL THEN NULL ELSE 'XOA' || upper(replace(id, '-', '')) END,
          gpkd_number = 'XOA' || upper(replace(id, '-', '')), gpkd_key = 'XOA' || upper(replace(id, '-', '')),
          extra_number = CASE WHEN extra_number IS NULL THEN NULL ELSE 'XOA' || upper(replace(id, '-', '')) END,
          extra_key = CASE WHEN extra_key IS NULL THEN NULL ELSE 'XOA' || upper(replace(id, '-', '')) END,
          updated_at = ?2, updated_by = ?3
   WHERE registration_id = ?1 AND erased_at IS NULL
     AND EXISTS (SELECT 1 FROM dk_registration r WHERE r.id = ?1 AND (r.status = 'DA_DUYET' OR r.erased_at = ?2))`,
);
export const cauAnDanhBanKhaiToChuc = (db: D1Database, v: { registrationId: string; at: string; by: string }): D1PreparedStatement => db.prepare(AN_DANH_BAN_KHAI_TO_CHUC).bind(v.registrationId, v.at, v.by);

// «Từ chối duyệt» (ADR-0207 Đ4): CHỜ DUYỆT → TỪ CHỐI theo đồ thị 0170; `?5` = phiên bản người duyệt đã xem — BẮT BUỘC, ghim trong câu (rà soát cuối M-1: bỏ COALESCE).
const TU_CHOI_DUYET_CAP = defineSql(
  "dang-ky",
  "registration_reject_at_approval",
  `UPDATE dk_registration SET status = 'TU_CHOI', reason_code = ?2, decided_at = ?3, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND status = 'CHO_DUYET' AND current_version = ?5`,
);
export const tuChoiDuyetStatement = (db: D1Database, v: { registrationId: string; lyDo: string; by: string; at: string; phienBan: number }): D1PreparedStatement =>
  db.prepare(TU_CHOI_DUYET_CAP).bind(v.registrationId, v.lyDo, v.at, v.by, v.phienBan);

// «Gửi lại lời mời» (ADR-0207 Đ7): mở lại hạn đặt PIN; chỉ phiếu ĐÃ DUYỆT chưa kích hoạt (trigger dk_registration_deadline là lớp thứ hai) VÀ danh tính còn email (tác nhân dọn phiếu
// chưa ẩn danh — ADR-0208 Đ6, Đ8; đợt 1 Task 9): danh tính đã ẩn danh thì người được duyệt không còn đường vào lại phiếu, mở lại hạn là vô nghĩa ⇒ 0 dòng, route trả 409.
const GUI_LAI_LOI_MOI = defineSql(
  "dang-ky",
  "registration_reopen_activation",
  `UPDATE dk_registration SET activation_deadline_at = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND status = 'DA_DUYET' AND activated_at IS NULL
     AND EXISTS (SELECT 1 FROM dk_identity i WHERE i.registration_id = dk_registration.id AND i.contact_email IS NOT NULL)`,
);
export const guiLaiLoiMoiStatement = (db: D1Database, v: { registrationId: string; deadlineAt: string; at: string; by: string }): D1PreparedStatement =>
  db.prepare(GUI_LAI_LOI_MOI).bind(v.registrationId, v.deadlineAt, v.at, v.by);


/** Danh tính của phiếu còn email (chưa ẩn danh)? Dấu «đã ẩn danh» là `contact_email` rỗng (trigger dk_identity_shape bắt buộc bỏ email khi ẩn danh). */
const DANH_TINH_CON_EMAIL = defineSql(
  "dang-ky",
  "identity_has_email",
  "SELECT 1 AS co FROM dk_identity WHERE registration_id = ?1 AND contact_email IS NOT NULL LIMIT 1",
);
export async function danhTinhConEmail(db: D1Database, registrationId: string): Promise<boolean> {
  return (await db.prepare(DANH_TINH_CON_EMAIL).bind(registrationId).first<{ co: number }>()) !== null;
}

// ---- KÍCH HOẠT: người được duyệt tự đặt PIN (ADR-0207 Đ7; đợt 1 Task 9) ----
export interface PhieuKichHoatRow { id: string; status: string; current_version: number; staff_id: string | null; activated_at: string | null; activation_deadline_at: string | null }
const PHIEU_KICH_HOAT = defineSql(
  "dang-ky",
  "registration_for_activation",
  "SELECT id, status, current_version, staff_id, activated_at, activation_deadline_at FROM dk_registration WHERE id = ?1",
);
export const phieuKichHoat = (db: D1Database, id: string): Promise<PhieuKichHoatRow | null> => db.prepare(PHIEU_KICH_HOAT).bind(id).first<PhieuKichHoatRow>();

// Email đã chứng minh của CHÍNH danh tính trong cookie (cột subject — cùng khoá với xin mã), chỉ khi danh tính chưa ẩn danh. Mã email mới được kiểm theo khoá băm của email này.
const EMAIL_CUA_DANH_TINH = defineSql(
  "dang-ky",
  "identity_subject_for_activation",
  "SELECT subject FROM dk_identity WHERE id = ?1 AND registration_id = ?2 AND provider = 'EMAIL' AND contact_email IS NOT NULL",
);
export async function emailCuaDanhTinh(db: D1Database, identityId: string, registrationId: string): Promise<string | null> {
  return (await db.prepare(EMAIL_CUA_DANH_TINH).bind(identityId, registrationId).first<{ subject: string }>())?.subject ?? null;
}

// Câu 1 — CÂU CHỐT của lô kích hoạt: chèn dòng KICH_HOAT; trigger dk_decision_guard RAISE (hỏng CẢ lô) khi phiếu chưa duyệt, đã kích hoạt, hay quá hạn đặt PIN.
// Người quyết = chính tài khoản mới. Chỉ mục dk_decision_once_uq: một dòng KICH_HOAT mỗi phiếu.
const CHOT_KICH_HOAT = defineSql(
  "dang-ky",
  "decision_activate_insert",
  `INSERT INTO dk_decision (id, registration_id, kind, version, decided_by, super_admin_flag, decided_at, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, 'KICH_HOAT', ?3, ?4, 0, ?5, ?5, ?4, ?5, ?4)`,
);
export const cauChotKichHoat = (db: D1Database, v: { registrationId: string; version: number; staffId: string; at: string }): D1PreparedStatement =>
  db.prepare(CHOT_KICH_HOAT).bind(crypto.randomUUID(), v.registrationId, v.version, v.staffId, v.at);

// Câu canh ĐỨNG NGAY SAU câu đặt PIN của staff (`WHERE active = 0`): câu đó khớp 0 dòng (tài khoản đã bật, đã bị thay đổi) thì chèn lệnh dấu KICH_HOAT_LECH — trigger
// dk_event_activation_account RAISE làm hỏng CẢ lô. `changes()` đọc câu liền trước, nên câu này PHẢI là câu kế tiếp sau câu của staff (bài kich-hoat-route.test.ts ca «tài khoản đã bật»).
const CANH_KICH_HOAT = defineSql(
  "dang-ky",
  "activation_account_guard",
  `INSERT INTO dk_event (id, registration_id, actor_kind, actor_ref, command, reason_code, at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, 'REGISTRANT', ?3, 'KICH_HOAT_LECH', NULL, ?4, ?4, ?3, ?4, ?3 WHERE changes() = 0`,
);
export const cauCanhKichHoat = (db: D1Database, v: { registrationId: string; identityId: string; at: string }): D1PreparedStatement =>
  db.prepare(CANH_KICH_HOAT).bind(crypto.randomUUID(), v.registrationId, v.identityId, v.at);

// Mốc kích hoạt: đóng vĩnh viễn đường đặt PIN này với tài khoản (ADR-0207 Đ7). Điều kiện trạng thái là lớp thứ hai sau câu chốt.
const KICH_HOAT_CAP = defineSql(
  "dang-ky",
  "registration_activate",
  "UPDATE dk_registration SET activated_at = ?2, updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND status = 'DA_DUYET' AND activated_at IS NULL",
);
export const cauKichHoatPhieu = (db: D1Database, v: { registrationId: string; at: string; by: string }): D1PreparedStatement => db.prepare(KICH_HOAT_CAP).bind(v.registrationId, v.at, v.by);

// ẨN DANH DANH TÍNH (ADR-0208 Đ6): thay email đã chứng minh bằng dấu, bỏ email liên lạc, đặt mốc — đúng dấu trigger dk_identity_shape đòi. Điều kiện NẰM TRONG câu: chỉ phiếu đã kết thúc
// (TỪ CHỐI, ĐÃ RÚT, HẾT HẠN) mà câu mốc «đã ẩn danh» của CHÍNH lượt này vừa ghi mốc đó bằng `?2` (chuỗi với điều kiện tuổi của câu mốc — vòng sửa 1), hoặc ĐÃ DUYỆT mà đã kích hoạt (lô kích hoạt) hay đã quá hạn kích hoạt CỘNG ân hạn (`?4` = bây giờ − activation_grace_days; tác nhân) — danh tính của phiếu
// đang sống, và của phiếu còn trong ân hạn (Nhân sự còn gửi lại lời mời được), không bao giờ bị xoá qua câu này.
// Ngoại lệ có tên của bài src/xoa-mot-lenh-co-ten.test.ts (2b), chờ chủ duyệt.
const AN_DANH_DANH_TINH = defineSql(
  "dang-ky",
  "identity_erase",
  `UPDATE dk_identity SET erased_at = ?2, subject = 'XOA' || upper(replace(id, '-', '')), contact_email = NULL, is_open = 0, updated_at = ?2, updated_by = ?3
   WHERE registration_id = ?1 AND erased_at IS NULL
     AND EXISTS (SELECT 1 FROM dk_registration r WHERE r.id = ?1
                   AND ((r.status IN ('TU_CHOI', 'DA_RUT', 'HET_HAN') AND r.erased_at = ?2) OR (r.status = 'DA_DUYET' AND (r.activated_at IS NOT NULL OR r.activation_deadline_at < ?4))))`,
);
export const cauAnDanhDanhTinh = (db: D1Database, v: { registrationId: string; at: string; by: string; mocAnHan: string }): D1PreparedStatement =>
  db.prepare(AN_DANH_DANH_TINH).bind(v.registrationId, v.at, v.by, v.mocAnHan);

// ---- TÁC NHÂN DỌN PHIẾU (ADR-0208 Đ8; đợt 1 Task 9) ----
// Việc 1 — hết hạn: phiếu ĐANG ĐIỀN / CẦN BỔ SUNG có `expires_at` đã qua. `expires_at` đặt lúc mở phiếu và lúc yêu cầu bổ sung (theo chính sách); dòng thiếu mốc (đường cũ quên đặt) dùng
// LƯỚI AN TOÀN: tạo phiếu (đang điền) / lần đổi gần nhất (cần bổ sung) quá số ngày của chính sách — để không có phiếu nào giữ dữ liệu mãi mãi. ?1 = bây giờ, ?2 / ?3 = mốc lưới.
const DIEU_KIEN_HET_HAN = `((status = 'DANG_DIEN' AND ((expires_at IS NOT NULL AND expires_at <= ?1) OR (expires_at IS NULL AND created_at <= ?2)))
      OR (status = 'CAN_BO_SUNG' AND ((expires_at IS NOT NULL AND expires_at <= ?1) OR (expires_at IS NULL AND updated_at <= ?3))))`;
const PHIEU_HET_HAN = defineSql("dang-ky", "registration_expire_candidates", `SELECT id, invite_id FROM dk_registration WHERE ${DIEU_KIEN_HET_HAN} ORDER BY id LIMIT ?4`);
export async function phieuCanHetHan(db: D1Database, v: { at: string; mocNhap: string; mocBoSung: string; toiDa: number }): Promise<{ id: string; inviteId: string | null }[]> {
  return (await db.prepare(PHIEU_HET_HAN).bind(v.at, v.mocNhap, v.mocBoSung, v.toiDa).all<{ id: string; invite_id: string | null }>()).results.map((r) => ({ id: r.id, inviteId: r.invite_id }));
}
// Lưới của «bỏ giữ chỗ lời mời khi phiếu kết thúc không duyệt» (ADR-0213 Đ7.5; mốc B2 Task 15): phiếu kết thúc từ mốc ?1 trở đi (tác nhân truyền 30 ngày trước), còn gắn lời mời. Câu bỏ giữ chỗ
// của parties tự canh «đang giữ cho đúng phiếu này», nên chạy lại trên lời mời đã bỏ giữ không đổi gì.
const PHIEU_KET_THUC_CO_LOI_MOI = defineSql(
  "dang-ky",
  "registration_closed_with_invite",
  `SELECT id, invite_id FROM dk_registration WHERE invite_id IS NOT NULL AND status IN ('TU_CHOI', 'DA_RUT', 'HET_HAN') AND decided_at >= ?1 ORDER BY decided_at DESC, id LIMIT ?2`,
);
export async function phieuKetThucCoLoiMoi(db: D1Database, tuMoc: string, toiDa: number): Promise<{ id: string; inviteId: string }[]> {
  return (await db.prepare(PHIEU_KET_THUC_CO_LOI_MOI).bind(tuMoc, toiDa).all<{ id: string; invite_id: string }>()).results.map((r) => ({ id: r.id, inviteId: r.invite_id }));
}
// Gắn mã định danh lời mời vào phiếu, CHỈ khi lần gửi của chính lô này đã thắng (phiếu CHỜ XÁC MINH với submitted_at = lúc gửi). ?1 phiếu, ?2 lời mời, ?3 lúc gửi
const GAN_LOI_MOI = defineSql(
  "dang-ky",
  "registration_set_invite",
  "UPDATE dk_registration SET invite_id = ?2 WHERE id = ?1 AND status = 'CHO_XAC_MINH' AND submitted_at = ?3",
);
export const ganLoiMoiStatement = (db: D1Database, v: { registrationId: string; inviteId: string; at: string }): D1PreparedStatement =>
  db.prepare(GAN_LOI_MOI).bind(v.registrationId, v.inviteId, v.at);
// Task 15 vòng sửa 1 (m4): CHỐT «lô gửi này đã thắng» cho các câu lời mời của parties đứng sau (parties không đọc được bảng dk_*). Bản khai của chính lô (?2) chưa có ⇒ đặt
// `status` = NULL trên đúng phiếu ⇒ ràng buộc / trigger của dk_registration làm CẢ lô hỏng (khuôn NULL-on-invalid); thắng ⇒ WHERE sai, không dòng nào bị chạm, không trigger nào chạy.
// ?1 phiếu, ?2 mã bản khai của lô.
const GUI_CHOT_THANG = defineSql(
  "dang-ky",
  "registration_submit_won_guard",
  "UPDATE dk_registration SET status = NULL WHERE id = ?1 AND NOT EXISTS (SELECT 1 FROM dk_submission WHERE id = ?2)",
);
export const guiChotThangStatement = (db: D1Database, v: { registrationId: string; submissionId: string }): D1PreparedStatement =>
  db.prepare(GUI_CHOT_THANG).bind(v.registrationId, v.submissionId);
/** Lỗi do câu chốt «lô gửi đã thắng» (lô thua): trigger chuyển trạng thái hoặc ràng buộc NOT NULL của dk_registration. Nơi gọi coi như lô khớp 0 dòng. */
export const LOI_CHOT_GUI_THUA = /NOT NULL constraint failed: dk_registration\.status|dk_registration_transition/;
// Mốc `decided_at` = lúc phiếu kết thúc: đồng hồ ẩn danh (việc 2) chạy từ đây.
const HET_HAN_CAP = defineSql(
  "dang-ky",
  "registration_expire",
  `UPDATE dk_registration SET status = 'HET_HAN', decided_at = ?1, updated_at = ?1, updated_by = ?5 WHERE id = ?4 AND ${DIEU_KIEN_HET_HAN}`,
);
export const cauHetHan = (db: D1Database, v: { registrationId: string; at: string; mocNhap: string; mocBoSung: string; by: string }): D1PreparedStatement =>
  db.prepare(HET_HAN_CAP).bind(v.at, v.mocNhap, v.mocBoSung, v.registrationId, v.by);

// Việc 2a — phiếu đã kết thúc không được duyệt, quá số ngày ẩn danh, còn dữ liệu cá nhân (danh tính còn email hoặc bản khai chưa thay dấu).
const PHIEU_CAN_AN_DANH = defineSql(
  "dang-ky",
  "registration_anonymize_candidates",
  `SELECT r.id FROM dk_registration r
   WHERE r.status IN ('TU_CHOI', 'DA_RUT', 'HET_HAN') AND r.decided_at <= ?1
     AND (EXISTS (SELECT 1 FROM dk_identity i WHERE i.registration_id = r.id AND i.contact_email IS NOT NULL)
       OR EXISTS (SELECT 1 FROM dk_submission s WHERE s.registration_id = r.id AND s.given_name <> '(đã ẩn)')
       OR EXISTS (SELECT 1 FROM dk_submission_org o WHERE o.registration_id = r.id AND o.display_name <> '(đã ẩn)'))
   ORDER BY r.id LIMIT ?2`,
);
export async function phieuCanAnDanh(db: D1Database, moc: string, toiDa: number): Promise<string[]> {
  return (await db.prepare(PHIEU_CAN_AN_DANH).bind(moc, toiDa).all<{ id: string }>()).results.map((r) => r.id);
}
// Mốc «đã ẩn danh» của phiếu (ADR-0208 Đ6) — câu ĐẦU của lô ẩn danh, điều kiện trạng thái + tuổi nằm trong câu. Ngoại lệ có tên của bài src/xoa-mot-lenh-co-ten.test.ts (2b), chờ chủ duyệt.
const PHIEU_DANH_DAU_AN_DANH = defineSql(
  "dang-ky",
  "registration_mark_erased",
  `UPDATE dk_registration SET erased_at = ?2, updated_at = ?2, updated_by = ?4
   WHERE id = ?1 AND erased_at IS NULL AND status IN ('TU_CHOI', 'DA_RUT', 'HET_HAN') AND decided_at <= ?3`,
);
export const cauDanhDauAnDanh = (db: D1Database, v: { registrationId: string; at: string; moc: string; by: string }): D1PreparedStatement =>
  db.prepare(PHIEU_DANH_DAU_AN_DANH).bind(v.registrationId, v.at, v.moc, v.by);

// Việc 2b — phiếu ĐÃ DUYỆT, chưa kích hoạt, đã quá hạn đặt PIN CỘNG ân hạn (`?1` = bây giờ − activation_grace_days), danh tính còn email ⇒ ẩn danh danh tính (ADR-0207 Đ7, ADR-0208 Đ6).
const PHIEU_QUA_HAN_KICH_HOAT = defineSql(
  "dang-ky",
  "registration_activation_lapsed",
  `SELECT r.id FROM dk_registration r
   WHERE r.status = 'DA_DUYET' AND r.activated_at IS NULL AND r.activation_deadline_at < ?1
     AND EXISTS (SELECT 1 FROM dk_identity i WHERE i.registration_id = r.id AND i.contact_email IS NOT NULL)
   ORDER BY r.id LIMIT ?2`,
);
export async function phieuQuaHanKichHoat(db: D1Database, mocAnHan: string, toiDa: number): Promise<string[]> {
  return (await db.prepare(PHIEU_QUA_HAN_KICH_HOAT).bind(mocAnHan, toiDa).all<{ id: string }>()).results.map((r) => r.id);
}

// Dòng lịch sử của tác nhân; chỉ ghi khi câu liền trước đổi dòng. `actor_ref` = mã tác nhân (chữ hoa — CHECK của bảng). Không số, tên, liên hệ, khoá kho.
const SU_KIEN_TAC_NHAN = defineSql(
  "dang-ky",
  "event_agent_if_prev",
  `INSERT INTO dk_event (id, registration_id, actor_kind, actor_ref, command, reason_code, at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, 'AGENT', ?3, ?4, NULL, ?5, ?5, ?3, ?5, ?3 WHERE changes() > 0`,
);
export const suKienTacNhanStatement = (db: D1Database, v: { registrationId: string; agentCode: string; command: string; at: string }): D1PreparedStatement =>
  db.prepare(SU_KIEN_TAC_NHAN).bind(crypto.randomUUID(), v.registrationId, v.agentCode, v.command, v.at);

// Việc 4 — XOÁ CỨNG hai bảng KỸ THUẬT (ngoại lệ có tên XOA_CUNG_KY_THUAT của R-N1-9, src/architecture.test.ts; chờ chủ duyệt). Điều kiện tuổi NẰM TRONG câu.
// dk_email_code: trần theo giờ của xin mã đếm dòng TẠO trong một giờ qua (Task 3) ⇒ chỉ xoá dòng tạo trước `?1` = bây giờ − max(hạn mã, 1 giờ), VÀ đã hết hạn (`?2` = bây giờ).
const MA_XOA = defineSql("dang-ky", "email_code_purge", "DELETE FROM dk_email_code WHERE created_at <= ?1 AND expires_at <= ?2");
export async function xoaMaEmailCu(db: D1Database, moc: string, at: string): Promise<number> {
  return (await db.prepare(MA_XOA).bind(moc, at).run()).meta.changes ?? 0;
}
// dk_upload_attempt: cửa sổ đếm tải tệp là một giờ (`files_per_network_hour`) ⇒ xoá dòng có `at_ms` trước `?1` = bây giờ − 1 giờ.
const TEP_MANG_XOA = defineSql("dang-ky", "upload_attempt_purge", "DELETE FROM dk_upload_attempt WHERE at_ms < ?1");
export async function xoaLuotTaiCu(db: D1Database, mocMs: number): Promise<number> {
  return (await db.prepare(TEP_MANG_XOA).bind(mocMs).run()).meta.changes ?? 0;
}
