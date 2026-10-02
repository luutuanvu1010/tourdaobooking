// SQL của các bảng module van-chuyen sở hữu (vc_*; ADR-0040 D1). Module nghiêm (STRICT): mọi câu đi qua defineSql, câu TĨNH, tham số ?N; import đuôi .ts để
// bài kiểm kiến trúc nạp được tệp này. Không đọc bảng của module khác: chủ xe lấy qua hàm công bố ownerCompany của parties (index.ts), khoá ngoại
// vc_vehicle.owner_party_id → pty_party là cạnh van-chuyen → parties đã khai. Không câu DELETE nào (không xoá cứng — trigger *_no_delete giữ ở CSDL).
import { defineSql } from "../../shared/sql-registry.ts";
import type { XeNhap, XeSua } from "./rules.ts";

// ---- Xe ------------------------------------------------------------------------------------------------------------------------------------------------------
export interface VehicleRow {
  id: string;
  plate_number: string;
  chassis_number: string | null;
  name: string;
  model_year: number | null;
  passenger_capacity: number;
  status: "active" | "maintenance" | "retired";
  valid_from_date: string;
  valid_to_date: string | null;
  updated_at: string;
  /** ADR-0048 D1: chủ xe — công ty chủ hoặc hồ sơ nhà xe; tên hiển thị qua view v_pty_party_label; cờ = chủ là công ty chủ HIỆN TẠI (view v_pty_owner_company). */
  owner_party_id: string;
  owner_name: string;
  owner_is_company: number;
}
// Cột xe + chủ xe. Tên chủ và cờ "công ty chủ hiện tại" đọc qua VIEW công bố của parties (cạnh van-chuyen → parties đã khai; không JOIN bảng của parties).
const COT_XE = `v.id, v.plate_number, v.chassis_number, v.name, v.model_year, v.passenger_capacity, v.status, v.valid_from_date, v.valid_to_date, v.updated_at,
  v.owner_party_id, COALESCE(l.display_name, '') AS owner_name, (oc.party_id IS NOT NULL) AS owner_is_company`;
const TU_XE = "vc_vehicle v LEFT JOIN v_pty_party_label l ON l.id = v.owner_party_id LEFT JOIN v_pty_owner_company oc ON oc.party_id = v.owner_party_id";
// Xe đang dùng / bảo dưỡng trước, xe đã ngừng sau; trong nhóm theo biển số.
const LIST_VEHICLES = defineSql("van-chuyen", "list_vehicles", `SELECT ${COT_XE} FROM ${TU_XE} ORDER BY v.status = 'retired', v.plate_key, v.id`);
const FIND_VEHICLE = defineSql("van-chuyen", "find_vehicle", `SELECT ${COT_XE} FROM ${TU_XE} WHERE v.id = ?1`);
// ADR-0048 D1: danh sách xe lọc theo chủ ?1 (câu riêng — không ghép điều kiện động).
const LIST_VEHICLES_OF_OWNER = defineSql(
  "van-chuyen",
  "list_vehicles_of_owner",
  `SELECT ${COT_XE} FROM ${TU_XE} WHERE v.owner_party_id = ?1 ORDER BY v.status = 'retired', v.plate_key, v.id`,
);
// ADR-0048 D1 (giả định G5): số xe CHƯA NGỪNG theo chủ — cột "số xe" của danh sách nhà xe.
const VEHICLE_COUNT_BY_OWNER = defineSql(
  "van-chuyen",
  "vehicle_count_by_owner",
  "SELECT owner_party_id, count(*) AS n FROM vc_vehicle WHERE status <> 'retired' GROUP BY owner_party_id",
);
// R15 điểm 1 (lớp route): biển số ?1 (đã chuẩn hoá) đang thuộc xe CHƯA NGỪNG nào khác xe ?2 không — kiểm TRƯỚC khi thêm, sửa, dùng lại xe.
const PLATE_HOLDER = defineSql("van-chuyen", "plate_holder", "SELECT id FROM vc_vehicle WHERE plate_key = ?1 AND status <> 'retired' AND id <> ?2 LIMIT 1");
// Số khung ?1 (đã chuẩn hoá) đã có ở xe nào khác xe ?2 (kể cả xe đã ngừng — định danh bền).
const CHASSIS_HOLDER = defineSql("van-chuyen", "chassis_holder", "SELECT id FROM vc_vehicle WHERE chassis_key = ?1 AND id <> ?2 LIMIT 1");
const INSERT_VEHICLE = defineSql(
  "van-chuyen",
  "insert_vehicle",
  `INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     valid_to_date, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, NULL, ?12, ?13, ?12, ?13)`,
);
// Khoá lạc quan updated_at. Chủ xe ?14: SỬA NHẬP NHẦM (ADR-0048 D1, Q1 = (a) — chủ 29/9 "Sửa được, ghi nhật ký"; route gửi chủ hiện tại khi không đổi). Chuyển
// chủ có lịch sử (bán xe, ai là chủ lúc nào) vẫn là việc riêng (ADR-0040 D1). Trigger vc_vehicle_owner_upd (0039) chỉ kiểm khi GIÁ TRỊ đổi. Ngày bắt đầu không đổi.
const UPDATE_VEHICLE = defineSql(
  "van-chuyen",
  "update_vehicle",
  `UPDATE vc_vehicle SET plate_number = ?3, plate_key = ?4, chassis_number = ?5, chassis_key = ?6, name = ?7, model_year = ?8, passenger_capacity = ?9,
     status = ?10, valid_to_date = ?11, updated_at = ?12, updated_by = ?13, owner_party_id = ?14
   WHERE id = ?1 AND updated_at = ?2`,
);

export async function listVehicles(db: D1Database): Promise<VehicleRow[]> {
  return (await db.prepare(LIST_VEHICLES).all<VehicleRow>()).results;
}
export async function listVehiclesOfOwner(db: D1Database, ownerPartyId: string): Promise<VehicleRow[]> {
  return (await db.prepare(LIST_VEHICLES_OF_OWNER).bind(ownerPartyId).all<VehicleRow>()).results;
}
export async function vehicleCountByOwner(db: D1Database): Promise<Map<string, number>> {
  const rows = (await db.prepare(VEHICLE_COUNT_BY_OWNER).all<{ owner_party_id: string; n: number }>()).results;
  return new Map(rows.map((r) => [r.owner_party_id, r.n]));
}
export const findVehicle = (db: D1Database, id: string): Promise<VehicleRow | null> => db.prepare(FIND_VEHICLE).bind(id).first<VehicleRow>();
export async function plateHolder(db: D1Database, plateKey: string, exceptId: string): Promise<string | null> {
  return (await db.prepare(PLATE_HOLDER).bind(plateKey, exceptId).first<{ id: string }>())?.id ?? null;
}
export async function chassisHolder(db: D1Database, chassisKey: string, exceptId: string): Promise<string | null> {
  return (await db.prepare(CHASSIS_HOLDER).bind(chassisKey, exceptId).first<{ id: string }>())?.id ?? null;
}
export const insertVehicleStatement = (db: D1Database, id: string, v: XeNhap, ownerPartyId: string, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(INSERT_VEHICLE).bind(id, v.plateNumber, v.plateKey, v.chassisNumber, v.chassisKey, v.name, v.modelYear, v.passengerCapacity, ownerPartyId, v.status, v.validFrom, at, actorId);
export const updateVehicleStatement = (db: D1Database, id: string, v: XeSua, ownerPartyId: string, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(UPDATE_VEHICLE).bind(
    id, v.expectedUpdatedAt, v.plateNumber, v.plateKey, v.chassisNumber, v.chassisKey, v.name, v.modelYear, v.passengerCapacity, v.status, v.validTo, at, actorId, ownerPartyId,
  );

// ---- Giấy tờ xe (đọc) ------------------------------------------------------------------------------------------------------------------------------------
// "Hiện hành" = chưa huỷ và không có dòng gia hạn CHƯA huỷ nối tiếp (khớp trigger *_superseded của migration *_van_chuyen_xe).
const HIEN_HANH = "(d.voided_at IS NULL AND NOT EXISTS (SELECT 1 FROM vc_vehicle_document n WHERE n.previous_id = d.id AND n.voided_at IS NULL))";
export interface VehicleDocRow {
  id: string;
  vehicle_id: string;
  document_type_code: string;
  type_name: string;
  document_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  previous_id: string | null;
  voided_at: string | null;
  updated_at: string;
  is_current: number;
}
// Giấy tờ của một xe: hiện hành trước (ngày hết hạn tăng dần, không hạn cuối — quyết định thiết kế 3), rồi dòng lịch sử.
const LIST_VEHICLE_DOCS = defineSql(
  "van-chuyen",
  "list_vehicle_documents",
  `SELECT d.id, d.vehicle_id, d.document_type_code, t.name AS type_name, d.document_number, d.issued_date, d.expiry_date, d.previous_id, d.voided_at, d.updated_at,
          ${HIEN_HANH} AS is_current
   FROM vc_vehicle_document d JOIN vc_vehicle_document_type t ON t.code = d.document_type_code
   WHERE d.vehicle_id = ?1
   ORDER BY is_current DESC, d.expiry_date IS NULL, d.expiry_date, t.sort_order, d.created_at, d.id`,
);
// Giấy HIỆN HÀNH có ngày hết hạn của mọi xe CHƯA NGỪNG, hạn ≤ ?1 — nguồn cảnh báo ở danh sách xe (canhBaoXe) và của danh sách "sắp hết hạn". Tên chủ xe + cờ
// "công ty chủ hiện tại" (ADR-0048 D1: nhãn nhà xe) đọc qua view công bố của parties — chỉ TÊN.
const EXPIRING_VEHICLE_DOCS = defineSql(
  "van-chuyen",
  "expiring_vehicle_documents",
  `SELECT d.vehicle_id, v.plate_number, v.name AS vehicle_name, t.name AS type_name, d.expiry_date,
          COALESCE(l.display_name, '') AS owner_name, (oc.party_id IS NOT NULL) AS owner_is_company
   FROM vc_vehicle_document d JOIN vc_vehicle v ON v.id = d.vehicle_id JOIN vc_vehicle_document_type t ON t.code = d.document_type_code
     LEFT JOIN v_pty_party_label l ON l.id = v.owner_party_id LEFT JOIN v_pty_owner_company oc ON oc.party_id = v.owner_party_id
   WHERE v.status <> 'retired' AND d.expiry_date IS NOT NULL AND d.expiry_date <= ?1 AND ${HIEN_HANH}
   ORDER BY d.expiry_date, v.plate_key, t.sort_order, d.id`,
);
export async function listVehicleDocuments(db: D1Database, vehicleId: string): Promise<VehicleDocRow[]> {
  return (await db.prepare(LIST_VEHICLE_DOCS).bind(vehicleId).all<VehicleDocRow>()).results;
}
export interface ExpiringVehicleDocRow {
  vehicle_id: string; plate_number: string; vehicle_name: string; type_name: string; expiry_date: string; owner_name: string; owner_is_company: number;
}
export async function expiringVehicleDocuments(db: D1Database, until: string): Promise<ExpiringVehicleDocRow[]> {
  return (await db.prepare(EXPIRING_VEHICLE_DOCS).bind(until).all<ExpiringVehicleDocRow>()).results;
}

// ---- Giấy tờ xe (ghi — Task A14) -------------------------------------------------------------------------------------------------------------------------
const FIND_VEHICLE_DOC = defineSql(
  "van-chuyen",
  "find_vehicle_document",
  `SELECT d.id, d.vehicle_id, d.document_type_code, t.name AS type_name, d.document_number, d.issued_date, d.expiry_date, d.previous_id, d.voided_at, d.updated_at,
          ${HIEN_HANH} AS is_current
   FROM vc_vehicle_document d JOIN vc_vehicle_document_type t ON t.code = d.document_type_code
   WHERE d.id = ?1 AND d.vehicle_id = ?2`,
);
// ADR-0056 VK3-B lớp ROUTE: xe đã có dòng HIỆN HÀNH của loại này chưa — CÙNG đoạn HIEN_HANH với trigger vc_vehicle_document_one_current và R-VC-11.
const HAS_CURRENT_DOC_OF_TYPE = defineSql(
  "van-chuyen",
  "has_current_vehicle_document_of_type",
  `SELECT 1 AS x FROM vc_vehicle_document d WHERE d.vehicle_id = ?1 AND d.document_type_code = ?2 AND ${HIEN_HANH} LIMIT 1`,
);
export async function hasCurrentVehicleDocOfType(db: D1Database, vehicleId: string, typeCode: string): Promise<boolean> {
  return (await db.prepare(HAS_CURRENT_DOC_OF_TYPE).bind(vehicleId, typeCode).first<{ x: number }>()) !== null;
}
const INSERT_VEHICLE_DOC = defineSql(
  "van-chuyen",
  "insert_vehicle_document",
  `INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, document_number, issued_date, expiry_date, previous_id, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?8, ?9)`,
);
// Sửa sai: một câu tĩnh đặt đủ ba trường sửa được + khoá lạc quan updated_at. Không đổi xe, loại, dòng trước (trigger *_identity giữ ở CSDL).
const UPDATE_VEHICLE_DOC = defineSql(
  "van-chuyen",
  "update_vehicle_document",
  `UPDATE vc_vehicle_document SET document_number = ?4, issued_date = ?5, expiry_date = ?6, updated_at = ?7, updated_by = ?8
   WHERE id = ?1 AND vehicle_id = ?2 AND updated_at = ?3`,
);
const VOID_VEHICLE_DOC = defineSql(
  "van-chuyen",
  "void_vehicle_document",
  "UPDATE vc_vehicle_document SET voided_at = ?4, updated_at = ?4, updated_by = ?5 WHERE id = ?1 AND vehicle_id = ?2 AND updated_at = ?3",
);
export const findVehicleDocument = (db: D1Database, docId: string, vehicleId: string): Promise<VehicleDocRow | null> =>
  db.prepare(FIND_VEHICLE_DOC).bind(docId, vehicleId).first<VehicleDocRow>();
export interface VehicleDocValues { typeCode: string; number: string | null; issuedDate: string | null; expiryDate: string | null }
export const insertVehicleDocStatement = (db: D1Database, id: string, vehicleId: string, v: VehicleDocValues, previousId: string | null, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(INSERT_VEHICLE_DOC).bind(id, vehicleId, v.typeCode, v.number, v.issuedDate, v.expiryDate, previousId, at, actorId);
export const updateVehicleDocStatement = (db: D1Database, id: string, vehicleId: string, expectedUpdatedAt: string, v: VehicleDocValues, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(UPDATE_VEHICLE_DOC).bind(id, vehicleId, expectedUpdatedAt, v.number, v.issuedDate, v.expiryDate, at, actorId);
export const voidVehicleDocStatement = (db: D1Database, id: string, vehicleId: string, expectedUpdatedAt: string, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(VOID_VEHICLE_DOC).bind(id, vehicleId, expectedUpdatedAt, at, actorId);

// ---- Danh mục loại giấy tờ xe (đọc; ghi ở Task A15) -------------------------------------------------------------------------------------------------------
export interface VehicleDocTypeRow { code: string; name: string; has_expiry: number; sort_order: number; active: number; updated_at: string }
const LIST_VEHICLE_DOC_TYPES = defineSql(
  "van-chuyen",
  "list_vehicle_document_types",
  "SELECT code, name, has_expiry, sort_order, active, updated_at FROM vc_vehicle_document_type ORDER BY sort_order, code",
);
export async function listVehicleDocumentTypes(db: D1Database): Promise<VehicleDocTypeRow[]> {
  return (await db.prepare(LIST_VEHICLE_DOC_TYPES).all<VehicleDocTypeRow>()).results;
}
// Khuôn loc_location (Ruling R7): dấu vết, active thay cho xoá, khoá lạc quan updated_at; khoá chính là mã (không sửa được sau khi tạo).
const FIND_VEHICLE_DOC_TYPE = defineSql("van-chuyen", "find_vehicle_document_type", "SELECT code, name, has_expiry, sort_order, active, updated_at FROM vc_vehicle_document_type WHERE code = ?1");
const INSERT_VEHICLE_DOC_TYPE = defineSql(
  "van-chuyen",
  "insert_vehicle_document_type",
  `INSERT INTO vc_vehicle_document_type (code, name, has_expiry, sort_order, active, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?5, ?6)`,
);
const UPDATE_VEHICLE_DOC_TYPE = defineSql(
  "van-chuyen",
  "update_vehicle_document_type",
  "UPDATE vc_vehicle_document_type SET name = ?2, has_expiry = ?3, sort_order = ?4, active = ?5, updated_at = ?6, updated_by = ?7 WHERE code = ?1 AND updated_at = ?8",
);
export const findVehicleDocumentType = (db: D1Database, code: string): Promise<VehicleDocTypeRow | null> => db.prepare(FIND_VEHICLE_DOC_TYPE).bind(code).first<VehicleDocTypeRow>();
export const insertVehicleDocTypeStatement = (db: D1Database, t: { code: string; name: string; hasExpiry: boolean; sortOrder: number }, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(INSERT_VEHICLE_DOC_TYPE).bind(t.code, t.name, t.hasExpiry ? 1 : 0, t.sortOrder, at, actorId);
export const updateVehicleDocTypeStatement = (
  db: D1Database, code: string, t: { name: string; hasExpiry: boolean; sortOrder: number; active: boolean; expectedUpdatedAt: string }, actorId: string, at: string,
): D1PreparedStatement => db.prepare(UPDATE_VEHICLE_DOC_TYPE).bind(code, t.name, t.hasExpiry ? 1 : 0, t.sortOrder, t.active ? 1 : 0, at, actorId, t.expectedUpdatedAt);

// ---- Chính sách ngưỡng "sắp hết hạn" (dòng có ngày hiệu lực — Hiến chương 5.2) --------------------------------------------------------------------------
// Dòng hiệu lực = valid_from_at mới nhất ≤ ?1 (mốc UTC ISO của lúc gọi).
const CURRENT_WARN_DAYS = defineSql("van-chuyen", "current_warn_days", "SELECT warn_days FROM vc_expiry_policy WHERE valid_from_at <= ?1 ORDER BY valid_from_at DESC LIMIT 1");
/** Ngưỡng đang hiệu lực (số ngày). Migration gieo sẵn một dòng (30 ngày) nên luôn có; thiếu (dữ liệu hỏng) → 30 như mặc định của ADR-0040 D1. */
export async function currentWarnDays(db: D1Database, nowIso: string): Promise<number> {
  return (await db.prepare(CURRENT_WARN_DAYS).bind(nowIso).first<{ warn_days: number }>())?.warn_days ?? 30;
}
// Đổi ngưỡng = CHÈN dòng mới có hiệu lực NGAY (valid_from_at = bây giờ — giả định G10); không sửa, không xoá dòng cũ (trigger *_append_only giữ ở CSDL).
const INSERT_POLICY = defineSql(
  "van-chuyen",
  "insert_expiry_policy",
  "INSERT INTO vc_expiry_policy (id, warn_days, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?3, ?4, ?3, ?4)",
);
export const insertPolicyStatement = (db: D1Database, id: string, warnDays: number, at: string, actorId: string): D1PreparedStatement =>
  db.prepare(INSERT_POLICY).bind(id, warnDays, at, actorId);

// ---- Chính sách điều phối, điều kiện xuất bến, hạng bằng, danh mục lý do (ADR-0049 D2, lát 1.1 — migration *_chinh_sach_dieu_phoi) ------------------------
// Dòng có ngày hiệu lực, CHỈ THÊM (trigger *_append_only / *_close_once giữ ở CSDL); máy chủ đặt valid_from_at = lúc ghi. Khoá ngoại sang danh mục của parties
// (pty_license_class, pty_person_document_type) theo cạnh van-chuyen → parties đã khai; mã lạ vấp khoá ngoại (route đổi thành 400).
export interface DispatchPolicyRow {
  id: string;
  min_lead_minutes: number;
  warn_lead_minutes: number;
  rest_minutes: number;
  require_manifest: number;
  require_contract: number;
  /** ADR-0050 VK1-A: kẹp lùi tối đa (phút) khi văn phòng bấm thay khai giờ xảy ra. */
  proxy_backdate_max_minutes: number;
  valid_from_at: string;
  created_at: string;
  /** R-P23: tài khoản đã lưu bản này (null = bản gieo của migration). CHỈ để tra nhãn qua hàm tiêm `ctx.nhanNhanVien` — không ra DTO. */
  created_by: string | null;
}
const COT_CHINH_SACH = "id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, proxy_backdate_max_minutes, valid_from_at, created_at, created_by";
// Dòng hiệu lực = valid_from_at mới nhất ≤ ?1 (mốc UTC ISO của lúc gọi).
const CURRENT_DISPATCH_POLICY = defineSql(
  "van-chuyen",
  "current_dispatch_policy",
  `SELECT ${COT_CHINH_SACH} FROM vc_dispatch_policy WHERE valid_from_at <= ?1 ORDER BY valid_from_at DESC LIMIT 1`,
);
const LIST_DISPATCH_POLICIES = defineSql("van-chuyen", "list_dispatch_policies", `SELECT ${COT_CHINH_SACH} FROM vc_dispatch_policy ORDER BY valid_from_at DESC, id`);
const INSERT_DISPATCH_POLICY = defineSql(
  "van-chuyen",
  "insert_dispatch_policy",
  `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, proxy_backdate_max_minutes, valid_from_at, created_at,
     created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, 0, ?8, ?6, ?6, ?7, ?6, ?7)`,
);
export const currentDispatchPolicy = (db: D1Database, nowIso: string): Promise<DispatchPolicyRow | null> =>
  db.prepare(CURRENT_DISPATCH_POLICY).bind(nowIso).first<DispatchPolicyRow>();
/**
 * Chính sách điều phối ĐANG HIỆU LỰC, đủ cột (kế hoạch A7b) — hàm NỘI BỘ của module (không xuất qua index.ts): hàm công bố `mocToiThieuHienHanh` đọc qua
 * đây; route bấm thay / xuất bến (A15) sẽ đọc `rest_minutes`, `proxy_backdate_max_minutes`, `id` (policy_id) cùng một chỗ. `null` = bảng rỗng → CHẶN.
 */
export const chinhSachHienHanh = (db: D1Database): Promise<DispatchPolicyRow | null> => currentDispatchPolicy(db, new Date().toISOString());
export async function listDispatchPolicies(db: D1Database): Promise<DispatchPolicyRow[]> {
  return (await db.prepare(LIST_DISPATCH_POLICIES).all<DispatchPolicyRow>()).results;
}
export const insertDispatchPolicyStatement = (
  db: D1Database,
  id: string,
  v: { minLeadMinutes: number; warnLeadMinutes: number; restMinutes: number; requireManifest: boolean; proxyBackdateMaxMinutes: number },
  at: string,
  actorId: string,
): D1PreparedStatement =>
  db.prepare(INSERT_DISPATCH_POLICY).bind(id, v.minLeadMinutes, v.warnLeadMinutes, v.restMinutes, v.requireManifest ? 1 : 0, at, actorId, v.proxyBackdateMaxMinutes);

export interface DepartureRuleRow {
  id: string;
  min_capacity: number;
  subject: "VEHICLE" | "DRIVER";
  vehicle_document_type_code: string | null;
  person_document_type_code: string | null;
  vehicle_document_type_name: string | null;
  valid_from_at: string;
  valid_to_at: string | null;
}
// Mọi dòng: đang mở trước (cỡ xe tăng dần), rồi dòng đã đóng (mới đóng trước). Tên loại giấy tờ XE đọc từ danh mục của chính module; loại giấy tờ của NGƯỜI
// là danh mục của parties — chỉ trả mã (không JOIN thẳng bảng module khác).
const LIST_DEPARTURE_RULES = defineSql(
  "van-chuyen",
  "list_departure_rules",
  `SELECT r.id, r.min_capacity, r.subject, r.vehicle_document_type_code, r.person_document_type_code, t.name AS vehicle_document_type_name, r.valid_from_at, r.valid_to_at
   FROM vc_departure_rule r LEFT JOIN vc_vehicle_document_type t ON t.code = r.vehicle_document_type_code
   ORDER BY r.valid_to_at IS NOT NULL, r.valid_to_at DESC, r.min_capacity, r.valid_from_at, r.id`,
);
const FIND_DEPARTURE_RULE = defineSql(
  "van-chuyen",
  "find_departure_rule",
  `SELECT r.id, r.min_capacity, r.subject, r.vehicle_document_type_code, r.person_document_type_code, t.name AS vehicle_document_type_name, r.valid_from_at, r.valid_to_at
   FROM vc_departure_rule r LEFT JOIN vc_vehicle_document_type t ON t.code = r.vehicle_document_type_code
   WHERE r.id = ?1`,
);
const INSERT_DEPARTURE_RULE = defineSql(
  "van-chuyen",
  "insert_departure_rule",
  `INSERT INTO vc_departure_rule (id, min_capacity, subject, vehicle_document_type_code, person_document_type_code, valid_from_at, valid_to_at, closed_by, created_at, created_by,
     updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, NULL, ?6, ?7, ?6, ?7)`,
);
// Đóng MỘT lần: chỉ dòng còn mở (trigger vc_departure_rule_close_once giữ phần "không sửa nội dung" ở CSDL).
const CLOSE_DEPARTURE_RULE = defineSql(
  "van-chuyen",
  "close_departure_rule",
  "UPDATE vc_departure_rule SET valid_to_at = ?2, closed_by = ?3, updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND valid_to_at IS NULL",
);
export async function listDepartureRules(db: D1Database): Promise<DepartureRuleRow[]> {
  return (await db.prepare(LIST_DEPARTURE_RULES).all<DepartureRuleRow>()).results;
}
export const findDepartureRule = (db: D1Database, id: string): Promise<DepartureRuleRow | null> => db.prepare(FIND_DEPARTURE_RULE).bind(id).first<DepartureRuleRow>();
export const insertDepartureRuleStatement = (
  db: D1Database, id: string, v: { minCapacity: number; subject: "VEHICLE" | "DRIVER"; documentTypeCode: string }, at: string, actorId: string,
): D1PreparedStatement =>
  db.prepare(INSERT_DEPARTURE_RULE).bind(id, v.minCapacity, v.subject, v.subject === "VEHICLE" ? v.documentTypeCode : null, v.subject === "DRIVER" ? v.documentTypeCode : null, at, actorId);
export const closeDepartureRuleStatement = (db: D1Database, id: string, at: string, actorId: string): D1PreparedStatement =>
  db.prepare(CLOSE_DEPARTURE_RULE).bind(id, at, actorId);

export interface LicenseCapacityRow { id: string; license_class_code: string; max_passengers: number | null; valid_from_at: string }
const LIST_LICENSE_CAPACITY = defineSql(
  "van-chuyen",
  "list_license_capacity",
  "SELECT id, license_class_code, max_passengers, valid_from_at FROM vc_license_capacity ORDER BY license_class_code, valid_from_at DESC, id",
);
// Dòng hiệu lực của MỘT hạng = valid_from_at mới nhất ≤ ?2.
const CURRENT_LICENSE_CAPACITY = defineSql(
  "van-chuyen",
  "current_license_capacity",
  "SELECT id, license_class_code, max_passengers, valid_from_at FROM vc_license_capacity WHERE license_class_code = ?1 AND valid_from_at <= ?2 ORDER BY valid_from_at DESC LIMIT 1",
);
const INSERT_LICENSE_CAPACITY = defineSql(
  "van-chuyen",
  "insert_license_capacity",
  "INSERT INTO vc_license_capacity (id, license_class_code, max_passengers, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?4, ?5)",
);
export async function listLicenseCapacity(db: D1Database): Promise<LicenseCapacityRow[]> {
  return (await db.prepare(LIST_LICENSE_CAPACITY).all<LicenseCapacityRow>()).results;
}
export const currentLicenseCapacity = (db: D1Database, classCode: string, nowIso: string): Promise<LicenseCapacityRow | null> =>
  db.prepare(CURRENT_LICENSE_CAPACITY).bind(classCode, nowIso).first<LicenseCapacityRow>();
export const insertLicenseCapacityStatement = (db: D1Database, id: string, v: { classCode: string; maxPassengers: number | null }, at: string, actorId: string): D1PreparedStatement =>
  db.prepare(INSERT_LICENSE_CAPACITY).bind(id, v.classCode, v.maxPassengers, at, actorId);

export interface TripReasonRow { code: string; reason_group: string; label: string; active: number; sort_order: number; updated_at: string }
const COT_LY_DO = "code, reason_group, label, active, sort_order, updated_at";
const LIST_TRIP_REASONS = defineSql("van-chuyen", "list_trip_reasons", `SELECT ${COT_LY_DO} FROM vc_reason ORDER BY reason_group, sort_order, code`);
const FIND_TRIP_REASON = defineSql("van-chuyen", "find_trip_reason", `SELECT ${COT_LY_DO} FROM vc_reason WHERE code = ?1`);
const INSERT_TRIP_REASON = defineSql(
  "van-chuyen",
  "insert_trip_reason",
  "INSERT INTO vc_reason (code, reason_group, label, active, sort_order, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, 1, ?4, ?5, ?6, ?5, ?6)",
);
// Khuôn loc_location (Ruling R7): khoá lạc quan updated_at; mã và nhóm không đổi (trigger vc_reason_identity).
const UPDATE_TRIP_REASON = defineSql(
  "van-chuyen",
  "update_trip_reason",
  "UPDATE vc_reason SET label = ?2, sort_order = ?3, active = ?4, updated_at = ?5, updated_by = ?6 WHERE code = ?1 AND updated_at = ?7",
);
export async function listTripReasons(db: D1Database): Promise<TripReasonRow[]> {
  return (await db.prepare(LIST_TRIP_REASONS).all<TripReasonRow>()).results;
}
export const findTripReason = (db: D1Database, code: string): Promise<TripReasonRow | null> => db.prepare(FIND_TRIP_REASON).bind(code).first<TripReasonRow>();
export const insertTripReasonStatement = (db: D1Database, v: { code: string; group: string; label: string; sortOrder: number }, at: string, actorId: string): D1PreparedStatement =>
  db.prepare(INSERT_TRIP_REASON).bind(v.code, v.group, v.label, v.sortOrder, at, actorId);
export const updateTripReasonStatement = (
  db: D1Database, code: string, v: { label: string; sortOrder: number; active: boolean; expectedUpdatedAt: string }, at: string, actorId: string,
): D1PreparedStatement => db.prepare(UPDATE_TRIP_REASON).bind(code, v.label, v.sortOrder, v.active ? 1 : 0, at, actorId, v.expectedUpdatedAt);

// ---- Mẫu đưa đón theo dịch vụ `vc_leg_template` (ADR-0054 D10.1; ADR nháp nơi trả mặc định — 0058) --------------------------------------------------------
// Chỉ thêm; dòng hiện hành của một mã = valid_from_at lớn nhất ≤ bây giờ. Tên điểm qua view công bố của locations (cạnh van-chuyen → locations đã khai).
export interface LegTemplateRow {
  id: string;
  code: string;
  mode: "NONE" | "ONE_WAY" | "ROUND_TRIP";
  return_time_hint: string | null;
  default_dropoff_location_id: string | null;
  /** Tên điểm nơi trả mặc định (view công bố) — null khi không có điểm. */
  noi_tra_ten: string | null;
  /** Điểm còn dùng (1) / đã ngưng (0); null khi không có điểm. */
  noi_tra_active: number | null;
  valid_from_at: string;
  /** Id tài khoản người ghi bản (null = gieo) — chỉ màn Danh mục (cột "Người đổi"); route form KHÔNG trả. */
  created_by: string | null;
}
const COT_MAU = `t.id, t.code, t.mode, t.return_time_hint, t.default_dropoff_location_id, l.name AS noi_tra_ten, l.active AS noi_tra_active, t.valid_from_at, t.created_by`;
const LEG_TEMPLATE_HISTORY = defineSql(
  "van-chuyen",
  "leg_template_history",
  `SELECT ${COT_MAU} FROM vc_leg_template t LEFT JOIN v_loc_location_label l ON l.id = t.default_dropoff_location_id WHERE t.code = ?1 ORDER BY t.valid_from_at DESC, t.id`,
);
const LEG_TEMPLATE_CURRENT_ALL = defineSql(
  "van-chuyen",
  "leg_template_current_all",
  `SELECT ${COT_MAU} FROM vc_leg_template t LEFT JOIN v_loc_location_label l ON l.id = t.default_dropoff_location_id
   WHERE t.valid_from_at = (SELECT max(m.valid_from_at) FROM vc_leg_template m WHERE m.code = t.code AND m.valid_from_at <= ?1) ORDER BY t.code`,
);
const INSERT_LEG_TEMPLATE = defineSql(
  "van-chuyen",
  "insert_leg_template",
  `INSERT INTO vc_leg_template (id, code, mode, return_time_hint, default_dropoff_location_id, valid_from_at, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7, ?6, ?7)`,
);
/** Điểm danh mục theo id (tên + còn dùng) — kiểm "điểm đang dùng lúc ghi" (NT-D3). */
const LOCATION_LABEL = defineSql("van-chuyen", "location_label_by_id", `SELECT id, name, active FROM v_loc_location_label WHERE id = ?1`);
export async function legTemplateHistory(db: D1Database, code: string): Promise<LegTemplateRow[]> {
  return (await db.prepare(LEG_TEMPLATE_HISTORY).bind(code).all<LegTemplateRow>()).results;
}
export async function legTemplatesCurrent(db: D1Database, nowIso: string): Promise<LegTemplateRow[]> {
  return (await db.prepare(LEG_TEMPLATE_CURRENT_ALL).bind(nowIso).all<LegTemplateRow>()).results;
}
export const locationLabel = (db: D1Database, id: string): Promise<{ id: string; name: string; active: number } | null> =>
  db.prepare(LOCATION_LABEL).bind(id).first<{ id: string; name: string; active: number }>();
export const insertLegTemplateStatement = (
  db: D1Database, id: string, code: string, v: { mode: string; returnTimeHint: string | null; noiTraMacDinhId: string | null }, at: string, actorId: string,
): D1PreparedStatement => db.prepare(INSERT_LEG_TEMPLATE).bind(id, code, v.mode, v.returnTimeHint, v.noiTraMacDinhId, at, actorId);
