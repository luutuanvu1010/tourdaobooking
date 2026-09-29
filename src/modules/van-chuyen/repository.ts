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
// Khoá lạc quan updated_at. Chủ xe KHÔNG đổi ở đây (ADR-0040 D1: chuyển chủ xe là việc riêng); ngày bắt đầu dùng không đổi.
const UPDATE_VEHICLE = defineSql(
  "van-chuyen",
  "update_vehicle",
  `UPDATE vc_vehicle SET plate_number = ?3, plate_key = ?4, chassis_number = ?5, chassis_key = ?6, name = ?7, model_year = ?8, passenger_capacity = ?9,
     status = ?10, valid_to_date = ?11, updated_at = ?12, updated_by = ?13
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
export const updateVehicleStatement = (db: D1Database, id: string, v: XeSua, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(UPDATE_VEHICLE).bind(id, v.expectedUpdatedAt, v.plateNumber, v.plateKey, v.chassisNumber, v.chassisKey, v.name, v.modelYear, v.passengerCapacity, v.status, v.validTo, at, actorId);

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
// Giấy HIỆN HÀNH có ngày hết hạn của mọi xe CHƯA NGỪNG, hạn ≤ ?1 — nguồn cảnh báo ở danh sách xe (canhBaoXe) và của danh sách "sắp hết hạn".
const EXPIRING_VEHICLE_DOCS = defineSql(
  "van-chuyen",
  "expiring_vehicle_documents",
  `SELECT d.vehicle_id, v.plate_number, v.name AS vehicle_name, t.name AS type_name, d.expiry_date
   FROM vc_vehicle_document d JOIN vc_vehicle v ON v.id = d.vehicle_id JOIN vc_vehicle_document_type t ON t.code = d.document_type_code
   WHERE v.status <> 'retired' AND d.expiry_date IS NOT NULL AND d.expiry_date <= ?1 AND ${HIEN_HANH}
   ORDER BY d.expiry_date, v.plate_key, t.sort_order, d.id`,
);
export async function listVehicleDocuments(db: D1Database, vehicleId: string): Promise<VehicleDocRow[]> {
  return (await db.prepare(LIST_VEHICLE_DOCS).bind(vehicleId).all<VehicleDocRow>()).results;
}
export interface ExpiringVehicleDocRow { vehicle_id: string; plate_number: string; vehicle_name: string; type_name: string; expiry_date: string }
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
