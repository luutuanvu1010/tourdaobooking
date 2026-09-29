// Module van-chuyen — phân hệ Vận chuyển, lượt 1a (ADR-0040 D1): xe, giấy tờ xe, danh mục loại giấy tờ xe, ngưỡng "sắp hết hạn", danh sách giấy tờ sắp hết
// hạn (xe + tài xế). Route: /api/van-chuyen/*. Tiền tố bảng vc_ (module nghiêm — STRICT). Phụ thuộc: parties (hàm công bố ownerCompany — chủ xe;
// expiringDriverDocuments — giấy tờ tài xế, KHÔNG số; nhaXeDangHopTac — nhà xe đối tác, ADR-0048 D1) và audit (auditStatement). KHÔNG module nào import van-chuyen; ngoài AppModule chỉ xuất hàm công bố mocToiThieuHienHanh (ADR-0049 D2 — CHỈ gốc lắp ráp src/index.ts gọi).
// Ô quyền: vehicle.manage (Quản trị + Toàn quyền) hỏi ở ĐẦU thân mọi route, trước khi đọc thân yêu cầu (403 trước 400).
import { auditStatement } from "../audit";
import { expiringDriverDocuments, nhaXeDangHopTac, ownerCompany } from "../parties";
import type {
  CarrierListResponse, ExpiringListResponse, VanChuyenMetaResponse, VehicleDocumentDto, VehicleDto, VehicleListResponse, VehicleResponse,
} from "../../shared/contracts";
import { MA_LOAI_GIAY_TO_RE, TRANG_THAI_XE, kiemLoaiGiayToMoi, kiemSuaLoaiGiayTo, soNgayConLai } from "../../shared/giay-to";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { PARTY_ID_RE } from "../../shared/party-id";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { addDays, vnToday } from "../../shared/vn-date";
import {
  chassisHolder, currentWarnDays, expiringVehicleDocuments, findVehicle, findVehicleDocument, findVehicleDocumentType, insertPolicyStatement, insertVehicleDocStatement,
  insertVehicleDocTypeStatement, insertVehicleStatement, listVehicleDocumentTypes, listVehicleDocuments, listVehicles, listVehiclesOfOwner, plateHolder,
  updateVehicleDocStatement, updateVehicleDocTypeStatement, updateVehicleStatement, vehicleCountByOwner, voidVehicleDocStatement, type VehicleDocRow, type VehicleRow,
} from "./repository";
import {
  CAU_BIEN_TRUNG, CAU_CHU_XE, CAU_KHUNG_TRUNG, canhBaoXe, chiTietNhatKyXe, gopSapHetHan, kiemGiaHanXe, kiemNguong, kiemSuaSaiXe, kiemSuaXe, kiemThemGiayToXe, kiemXeMoi, loiRangBuocXe,
  type CanhBaoXe, type DanhMucGiayToXe, type XeNhap, type XeSua,
} from "./rules";

// ADR-0049 D2 (lát 1.1): hàm công bố mốc tối thiểu (chỉ gốc lắp ráp gọi — không module nào import van-chuyen); route chính sách điều phối, điều kiện xuất
// bến, hạng bằng (cổng office + ô settings.ops), danh mục lý do (cổng admin + ô admin.manage).
import type {
  DepartureRuleDto, DepartureRuleListResponse, DispatchPolicyDto, DispatchPolicyResponse, LicenseCapacityDto, LicenseCapacityResponse, TripReasonDto, TripReasonListResponse,
} from "../../shared/contracts";
import { NHAN_NHOM_LY_DO, laLyDoHeThong, type NhomLyDo } from "../../shared/dieu-phoi-kieu";
import type { MocToiThieu } from "../../shared/moc-toi-thieu";
import {
  MA_LY_DO_RE, chiTietChinhSach, chiTietDieuKien, chiTietHangBang, chiTietLyDo, kiemChinhSachMoi, kiemDieuKienMoi, kiemHangBangMoi, kiemLyDoMoi, kiemSuaLyDo,
} from "./chinh-sach";
import {
  chinhSachHienHanh, closeDepartureRuleStatement, currentDispatchPolicy, currentLicenseCapacity, findDepartureRule, findTripReason, insertDepartureRuleStatement, insertDispatchPolicyStatement,
  insertLicenseCapacityStatement, insertTripReasonStatement, listDepartureRules, listDispatchPolicies, listLicenseCapacity, listTripReasons, updateTripReasonStatement,
  type DepartureRuleRow, type DispatchPolicyRow, type LicenseCapacityRow, type TripReasonRow,
} from "./repository";

// ADR-0049 D1–D3 (Task A13): chuyến xe — hàm hẹp của orders (chỉ gọi trong THÂN route, sau can() — bài src/orders-cong-bo.test.ts), đọc / dựng lô / DTO.
import { hanhKhachChoChuyen, lichChungChang, lienHeChoTaiXe } from "../orders";
import type { CapNhatDiemResponse, ChuyenChiTietResponse, CuocChiTietResponse, CuocCuaToiResponse, StaffProfile } from "../../shared/contracts";
import { kiemTaoSuaChuyen, trongNgayChay } from "../../shared/dieu-phoi-kiem";
import { lyDoGiu } from "../../shared/ly-do-giu";
import { isISODate, msToVnLocal } from "../../shared/vn-date";
import { eventByRequest, eventsByTrips, tripCountByDate, tripsByDate, tripsCuaTaiXe, tripsTouching } from "./chuyen-repo";
import { loTaoChuyen } from "./dieu-phoi";
import { chinhSachVao, docChung, docNen, khungChuyen, taiXeVao, xeVao, type NenChuyen } from "./dieu-phoi-doc";
import { dungLichNgay, lenhCapNhatDiem, lenhDoi, lenhHuy, lenhRut, lenhSuaChuyen, lenhXep } from "./dieu-phoi-lenh";
import {
  CAN_DIEU_PHOI, CAN_PHA_LE, CAN_XEM_CHUYEN, KHONG_CO_CHUYEN, chayLo, chiTietChuyen, cuocChiTiet, danhSachCuoc, gioNgan, loi409, loiKiem, lyDoHopLe, nhanLyDo, phaLeNhatKy,
} from "./dieu-phoi-route";
import { docCapNhatDiem, docDoi, docDoiThuTu, docHuy, docKetThucGianDoan, docRut, docSuaChuyen, docTaoChuyen, docTienDo, docXep } from "./dieu-phoi-than";
// Task A15: lệnh tiến độ — MỘT hàm mỗi lệnh cho cả route tài xế lẫn route văn phòng bấm thay (R-P1).
import {
  lenhDaDon, lenhDaToi, lenhDaTra, lenhDoiThuTu, lenhKetThuc, lenhKetThucGianDoan, lenhKhachHuy, lenhVang, lenhXuatBen, type NguoiBam,
} from "./dieu-phoi-tien-do";
import type { GoiBaoChangDto, NhacGoiKhachResponse } from "../../shared/contracts";
import { NHAC_GOI_SO_NGAY } from "../../shared/goi-bao";
import { changChoTrongKhoang, changChuDon, mocByRequest } from "./chuyen-repo";
import { docBoDanhDauGoiBao, docDaGoiBao } from "./dieu-phoi-than";
import { danhSachNhac, docGoiBao, goiBaoChang, nguoiBamGoiBao, phanHoiLenhLap, xuLyMoc, type QuyenGoiBao } from "./goi-bao-lenh";
const CAN_XEM_CUOC = () => error(403, "forbidden", "Tài khoản này không có cuốc xe.");
const CAN_BAM_THAY = () => error(403, "forbidden", "Tài khoản này không bấm thay tiến độ chuyến được.");
/** `assigned` của route tài xế (kế hoạch mục 1.2): người gọi có hồ sơ và là tài xế ĐANG MỞ dòng lái của chuyến. */
const dangLai = (nen: NenChuyen | null, staff: StaffProfile): boolean => nen !== null && staff.partyId !== null && nen.trip.driver_party_id === staff.partyId;
/** Văn phòng bấm thay: người bấm = tài khoản văn phòng; `bamThay` trừ khi chính người đó là tài xế đang lái chuyến. */
const nguoiBamVanPhong = (staff: StaffProfile, nen: NenChuyen): NguoiBam => ({ id: staff.id, bamThay: !dangLai(nen, staff) });
// ADR-0051 (Task A-GB): nhắc "gọi báo khách" khi giờ hẹn đổi — mốc giờ hẹn của chặng, họ lệnh "Đã gọi báo" / "Bỏ đánh dấu", danh sách nhắc.
const CAN_GOI_BAO = () => error(403, "forbidden", "Chỉ người lập đơn, người phụ trách đơn, Quản trị, Toàn quyền ghi được \"đã gọi báo\".");
const KHONG_CO_CHANG = () => error(404, "not_found", "Không tìm thấy chặng.");
/**
 * Quyền bấm "Đã gọi báo" / "Bỏ đánh dấu" trên chặng của đơn `orderId` — ĐÚNG lời gọi của route ghi (GB2): ô `trip.call_ack` với người lập (`ownerId`) và người
 * phụ trách ĐƠN (`ctx.isAssigned` — khác `assigned` của tài xế). Dùng cho `baoDuoc` / `boDuoc` của DTO (màn chỉ ẩn / hiện nút; máy chủ luôn kiểm lại).
 */
const quyenGoiBaoCua = (staff: StaffProfile, isAssigned: (orderId: string) => Promise<boolean>): QuyenGoiBao => async (orderId, ownerId) =>
  can(staff, "trip.call_ack", { ownerId: ownerId ?? undefined, assigned: await isAssigned(orderId) });
const NGAY_MS = 86_400_000;

const FORBIDDEN = () => error(403, "forbidden", "Tài khoản này không quản lý được xe.");
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy xe.");
const STALE = () => error(409, "stale", "Xe vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
// R15 điểm 1, 3 (điều phối 2026-09-28): lớp ROUTE của biển số / số khung trùng — mã riêng; lớp CSDL (chỉ mục duy nhất) trả mã KHÁC (loiRangBuocXe).
const PLATE_TAKEN = () => error(409, "vehicle_plate_taken", CAU_BIEN_TRUNG);
const CHASSIS_TAKEN = () => error(409, "vehicle_chassis_taken", CAU_KHUNG_TRUNG);
const NO_OWNER = () => error(409, "no_owner_company", "Chưa có hồ sơ công ty chủ nên chưa thêm xe được. Báo người phụ trách hệ thống.");
// ADR-0048 B1.1 lớp ROUTE: chủ xe không phải công ty chủ / nhà xe đang hợp tác — mã riêng; lớp CSDL (trigger 0039) trả vehicle_owner_conflict (loiRangBuocXe).
const OWNER_NOT_CARRIER = () => error(409, "vehicle_owner_not_carrier", CAU_CHU_XE);
const BAD_OWNER_FILTER = () => error(400, "invalid_input", "Bộ lọc chủ xe không hợp lệ.");

const RETIRED = () => error(409, "vehicle_retired", "Xe đã ngừng dùng.");
const DOC_NOT_FOUND = () => error(404, "not_found", "Không tìm thấy giấy tờ này của xe.");
const DOC_NOT_CURRENT = () => error(409, "document_not_current", "Dòng này đã được gia hạn hoặc đã huỷ — chỉ dòng hiện hành mới gia hạn hay sửa sai được.");
const DOC_STALE = () => error(409, "stale", "Giấy tờ vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");

/**
 * HÀM CÔNG BỐ (ADR-0049 D2; kế hoạch I25, mục 1.6): mốc tối thiểu đang hiệu lực = dòng `vc_dispatch_policy` mới nhất có `valid_from_at` ≤ bây giờ. Không cần
 * quyền (chính sách công khai trong công ty — [TK] §1.11). CHỈ gốc lắp ráp gọi, để tiêm `ctx.mocToiThieu` cho orders (Task A10) — orders không được đọc
 * bảng vc_. `null` = bảng rỗng → orders CHẶN lệnh cần mốc, không đoán con số.
 */
export async function mocToiThieuHienHanh(db: D1Database): Promise<MocToiThieu | null> {
  const r = await chinhSachHienHanh(db);
  return r ? { phut: r.min_lead_minutes, policyId: r.id, canhBaoPhut: r.warn_lead_minutes } : null;
}

// ---- Chính sách điều phối, điều kiện xuất bến, hạng bằng, danh mục lý do (ADR-0049 D2; kế hoạch mục 1.7 route 9–18, Task A7) ------------------------------
// Chính sách / điều kiện / hạng bằng: dòng có ngày hiệu lực, CHỈ THÊM, `valid_from_at` = lúc ghi (I28). Hai lần ghi cùng mili-giây vấp khoá duy nhất → 409
// stale (tiền lệ Ruling R19). Mã lạ trỏ danh mục của parties vấp khoá ngoại → 400 (van-chuyen không đọc thẳng bảng của parties; cả lô huỷ, không nhật ký).
const CHI_TOAN_QUYEN = () => error(403, "forbidden", "Chỉ người phụ trách hệ thống xem và đổi được chính sách điều phối xe.");
const LOI_KHOA_NGOAI = /FOREIGN KEY constraint failed/;
const toPolicyDto = (r: DispatchPolicyRow, currentId: string | null, nhan: ReadonlyMap<string, string> | null): DispatchPolicyDto => ({
  id: r.id,
  minLeadMinutes: r.min_lead_minutes,
  warnLeadMinutes: r.warn_lead_minutes,
  restMinutes: r.rest_minutes,
  requireManifest: r.require_manifest === 1,
  requireContract: r.require_contract === 1,
  proxyBackdateMaxMinutes: r.proxy_backdate_max_minutes,
  validFrom: r.valid_from_at,
  current: r.id === currentId,
  nguoiLuu: r.created_by === null ? null : (nhan?.get(r.created_by) ?? null),
});
// R-P23: "ai lưu" = nhãn qua hàm tiêm `ctx.nhanNhanVien` (R-P20) — gom id rồi gọi MỘT lần; thiếu hàm tiêm → null (để trống, không đoán).
async function respondChinhSach(
  db: D1Database,
  nhanNhanVien: (ids: readonly string[]) => Promise<Map<string, string> | null>,
  status = 200,
): Promise<Response> {
  const rows = await listDispatchPolicies(db); // mới trước
  const now = new Date().toISOString();
  const cur = rows.find((r) => r.valid_from_at <= now) ?? null;
  const nhan = await nhanNhanVien([...new Set(rows.flatMap((r) => (r.created_by === null ? [] : [r.created_by])))]);
  return json(
    { current: cur ? toPolicyDto(cur, cur.id, nhan) : null, history: rows.map((r) => toPolicyDto(r, cur?.id ?? null, nhan)) } satisfies DispatchPolicyResponse,
    status,
  );
}
const toRuleDto = (r: DepartureRuleRow, now: string): DepartureRuleDto => ({
  id: r.id,
  minCapacity: r.min_capacity,
  subject: r.subject,
  documentTypeCode: r.vehicle_document_type_code ?? r.person_document_type_code ?? "",
  documentTypeName: r.vehicle_document_type_name,
  validFrom: r.valid_from_at,
  validTo: r.valid_to_at,
  active: r.valid_from_at <= now && (r.valid_to_at === null || r.valid_to_at > now),
});
async function respondDieuKien(db: D1Database, status = 200): Promise<Response> {
  const now = new Date().toISOString();
  return json({ rules: (await listDepartureRules(db)).map((r) => toRuleDto(r, now)) } satisfies DepartureRuleListResponse, status);
}
const tenLoaiDieuKien = (r: Pick<DepartureRuleRow, "vehicle_document_type_name" | "vehicle_document_type_code" | "person_document_type_code">): string =>
  r.vehicle_document_type_name ?? r.vehicle_document_type_code ?? r.person_document_type_code ?? "";
async function respondHangBang(db: D1Database, status = 200): Promise<Response> {
  const rows = await listLicenseCapacity(db); // theo hạng, mới trước
  const now = new Date().toISOString();
  const currentIds = new Set<string>();
  const hangDaCo = new Set<string>();
  for (const r of rows) {
    if (r.valid_from_at > now || hangDaCo.has(r.license_class_code)) continue;
    hangDaCo.add(r.license_class_code);
    currentIds.add(r.id);
  }
  const dto = (r: LicenseCapacityRow): LicenseCapacityDto => ({ id: r.id, classCode: r.license_class_code, maxPassengers: r.max_passengers, validFrom: r.valid_from_at, current: currentIds.has(r.id) });
  return json({ current: rows.filter((r) => currentIds.has(r.id)).map(dto), history: rows.map(dto) } satisfies LicenseCapacityResponse, status);
}
const toReasonDto = (r: TripReasonRow): TripReasonDto => ({
  code: r.code,
  group: r.reason_group as NhomLyDo,
  groupLabel: NHAN_NHOM_LY_DO[r.reason_group as NhomLyDo] ?? r.reason_group,
  label: r.label,
  active: r.active === 1,
  sortOrder: r.sort_order,
  updatedAt: r.updated_at,
  heThong: laLyDoHeThong(r.code),
});
async function respondLyDo(db: D1Database, status = 200): Promise<Response> {
  return json({ reasons: (await listTripReasons(db)).map(toReasonDto) } satisfies TripReasonListResponse, status);
}

/** Danh mục loại giấy tờ xe cho một lần kiểm (mọi loại, kể cả đã ngưng — sửa sai dòng cũ vẫn cần `hasExpiry`) + tra tên cho nhật ký. */
async function danhMucXe(db: D1Database, homNay: string): Promise<{ dm: DanhMucGiayToXe; tenLoai: (c: string) => string }> {
  const types = await listVehicleDocumentTypes(db);
  return {
    dm: { loai: new Map(types.map((t) => [t.code, { hasExpiry: t.has_expiry === 1, active: t.active === 1 }])), homNay },
    tenLoai: (c) => types.find((t) => t.code === c)?.name ?? c,
  };
}

const ADMIN_ONLY = () => error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
/** Danh mục loại giấy tờ xe (cả loại đã ngưng) + ngưỡng đang hiệu lực. */
async function respondMeta(db: D1Database, status = 200): Promise<Response> {
  const [types, warnDays] = await Promise.all([listVehicleDocumentTypes(db), currentWarnDays(db, new Date().toISOString())]);
  return json({
    documentTypes: types.map((t) => ({ code: t.code, name: t.name, hasExpiry: t.has_expiry === 1, sortOrder: t.sort_order, active: t.active === 1, updatedAt: t.updated_at })),
    warnDays,
  } satisfies VanChuyenMetaResponse, status);
}

function dbProblem(e: unknown): Response | null {
  const p = loiRangBuocXe(e instanceof Error ? e.message : "");
  return p ? error(p.status, p.code, p.message) : null;
}

const KHONG_CANH_BAO: CanhBaoXe = { alert: "none", alertTypeName: null, alertDaysLeft: null, alertCount: 0 };
const toVehicleDto = (r: VehicleRow, cb: CanhBaoXe): VehicleDto => ({
  id: r.id,
  plateNumber: r.plate_number,
  chassisNumber: r.chassis_number,
  name: r.name,
  modelYear: r.model_year,
  passengerCapacity: r.passenger_capacity,
  status: r.status,
  validFrom: r.valid_from_date,
  validTo: r.valid_to_date,
  ...(r.status === "retired" ? KHONG_CANH_BAO : cb),
  updatedAt: r.updated_at,
  ownerPartyId: r.owner_party_id,
  ownerName: r.owner_name,
  ownerIsCompany: r.owner_is_company === 1,
});
const toVehicleDocDto = (d: VehicleDocRow, today: string): VehicleDocumentDto => ({
  id: d.id,
  typeCode: d.document_type_code,
  typeName: d.type_name,
  number: d.document_number,
  issuedDate: d.issued_date,
  expiryDate: d.expiry_date,
  daysLeft: d.expiry_date === null ? null : soNgayConLai(d.expiry_date, today),
  previousId: d.previous_id,
  current: d.is_current === 1,
  voided: d.voided_at !== null,
  updatedAt: d.updated_at,
});

/** Cảnh báo giấy tờ theo từng xe (giấy hiện hành có hạn ≤ hôm nay + ngưỡng đang hiệu lực). */
async function canhBaoTheoXe(db: D1Database, now: Date): Promise<(vehicleId: string) => CanhBaoXe> {
  const today = vnToday(now);
  const warnDays = await currentWarnDays(db, now.toISOString());
  const rows = await expiringVehicleDocuments(db, addDays(today, warnDays));
  return (vehicleId) => canhBaoXe(rows.filter((r) => r.vehicle_id === vehicleId).map((r) => ({ typeName: r.type_name, expiryDate: r.expiry_date })), today, warnDays);
}

/** Một xe + giấy tờ của nó (đủ lịch sử). */
async function respondVehicle(db: D1Database, id: string, status = 200): Promise<Response> {
  const now = new Date();
  const [row, docs, cb] = await Promise.all([findVehicle(db, id), listVehicleDocuments(db, id), canhBaoTheoXe(db, now)]);
  if (!row) return NOT_FOUND();
  const today = vnToday(now);
  return json({ vehicle: toVehicleDto(row, cb(id)), documents: docs.map((d) => toVehicleDocDto(d, today)) } satisfies VehicleResponse, status);
}

/** Nhãn thay đổi cho nhật ký sửa xe — biển số là định danh của xe (không phải "số giấy tờ"), mở đầu `detail` (giả định G12). `chuMoi` ≠ null khi đổi chủ
 * xe (ADR-0048 Q1 = (a)): ghi "chủ xe <tên cũ> → <tên mới>" — TÊN hiển thị, không liên hệ, không MST. */
function thayDoiXe(cu: VehicleRow, moi: XeSua, chuMoi: string | null = null): string {
  const doi: string[] = [];
  if (chuMoi !== null) doi.push(`chủ xe ${cu.owner_name} → ${chuMoi}`);
  if (cu.plate_number !== moi.plateNumber) doi.push(`biển số ${cu.plate_number} → ${moi.plateNumber}`);
  if ((cu.chassis_number ?? "") !== moi.chassisNumber) doi.push("số khung");
  if (cu.name !== moi.name) doi.push(`tên ${cu.name} → ${moi.name}`);
  if (cu.model_year !== moi.modelYear) doi.push(`đời xe ${cu.model_year ?? "—"} → ${moi.modelYear ?? "—"}`);
  if (cu.passenger_capacity !== moi.passengerCapacity) doi.push(`số người được chở ${cu.passenger_capacity} → ${moi.passengerCapacity}`);
  if (cu.status !== moi.status) doi.push(`trạng thái ${TRANG_THAI_XE[cu.status]} → ${TRANG_THAI_XE[moi.status]}`);
  return `xe ${cu.plate_number}: ${doi.length ? doi.join("; ") : "không đổi gì"}`;
}

/**
 * ADR-0048 D1, B1.1 (lớp route): chủ xe được chọn → hồ sơ chủ; `null` = công ty chủ (mặc định, như ADR-0040 D1). Chủ phải là công ty chủ HIỆN TẠI hoặc nhà xe
 * đang hợp tác (hàm công bố nhaXeDangHopTac) — không thì 409 vehicle_owner_not_carrier. `tenNhaXe` ≠ null khi chủ là nhà xe (ghi nhật ký).
 */
async function xacDinhChuXe(db: D1Database, ownerPartyId: string | null): Promise<{ partyId: string; ten: string; tenNhaXe: string | null } | Response> {
  const congTy = await ownerCompany(db);
  if (ownerPartyId === null || ownerPartyId === congTy?.partyId) return congTy ? { partyId: congTy.partyId, ten: congTy.displayName, tenNhaXe: null } : NO_OWNER();
  const nhaXe = (await nhaXeDangHopTac(db)).find((c) => c.partyId === ownerPartyId);
  return nhaXe ? { partyId: nhaXe.partyId, ten: nhaXe.displayName, tenNhaXe: nhaXe.displayName } : OWNER_NOT_CARRIER();
}

/** R15 điểm 1 (lớp route): biển số / số khung đã thuộc xe khác → phản hồi 409; `exceptId` = chính xe đang sửa (thêm xe: chuỗi rỗng). */
async function trungXe(db: D1Database, v: XeNhap | XeSua, exceptId: string): Promise<Response | null> {
  if (v.status !== "retired" && (await plateHolder(db, v.plateKey, exceptId))) return PLATE_TAKEN();
  if (await chassisHolder(db, v.chassisKey, exceptId)) return CHASSIS_TAKEN();
  return null;
}

export const vanChuyenModule: AppModule = {
  name: "van-chuyen",
  routes: [
    route("GET", "/api/van-chuyen/xe", "office", async ({ env, staff, url }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      // ADR-0048 D1: `?chu=<partyId>` lọc theo chủ xe (vắng hoặc rỗng = mọi xe); sai khuôn → 400.
      const chu = url.searchParams.get("chu") || null;
      if (chu !== null && !PARTY_ID_RE.test(chu)) return BAD_OWNER_FILTER();
      const [rows, cb] = await Promise.all([chu === null ? listVehicles(env.DB) : listVehiclesOfOwner(env.DB, chu), canhBaoTheoXe(env.DB, new Date())]);
      return json({ vehicles: rows.map((r) => toVehicleDto(r, cb(r.id))) } satisfies VehicleListResponse);
    }),

    route("POST", "/api/van-chuyen/xe", "office", async ({ request, env, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const now = new Date();
      const parsed = kiemXeMoi(await readJson(request), vnToday(now));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      // ADR-0040 D1: chủ xe mặc định = hồ sơ công ty chủ LÚC THÊM (đổi công ty chủ sau này không tự đổi chủ xe). ADR-0048 D1 (B1.1 lớp route): chọn được nhà
      // xe đang hợp tác — kiểm qua hàm công bố nhaXeDangHopTac của parties (không xuất hàm "isCarrier" riêng).
      const chu = await xacDinhChuXe(env.DB, v.ownerPartyId);
      if (chu instanceof Response) return chu;
      const trung = await trungXe(env.DB, v, "");
      if (trung) return trung;
      const id = crypto.randomUUID();
      const at = now.toISOString();
      try {
        await env.DB.batch([
          insertVehicleStatement(env.DB, id, v, chu.partyId, staff.id, at),
          auditStatement(env.DB, {
            staffId: staff.id, action: "vehicle_created", at, targetType: "vehicle", targetId: id,
            // G7: tên nhà xe (tên hiển thị — không liên hệ, không MST) khi chủ không phải công ty chủ.
            detail: `xe ${v.plateNumber}: thêm ${v.name}, ${v.passengerCapacity} người${chu.tenNhaXe ? `; chủ: ${chu.tenNhaXe}` : ""}`,
          }),
        ]);
      } catch (e) {
        const p = dbProblem(e);
        if (p) return p;
        throw e;
      }
      return respondVehicle(env.DB, id, 201);
    }),

    route("GET", "/api/van-chuyen/xe/:id", "office", async ({ env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      return UUID_RE.test(id) ? respondVehicle(env.DB, id) : NOT_FOUND();
    }),

    route("PUT", "/api/van-chuyen/xe/:id", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const cu = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      if (!cu) return NOT_FOUND();
      const now = new Date();
      const parsed = kiemSuaXe(await readJson(request), { status: cu.status, validFrom: cu.valid_from_date, validTo: cu.valid_to_date }, vnToday(now));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      // ADR-0048 D1, Q1 = (a): đổi chủ xe (sửa nhập nhầm) — chỉ kiểm khi chủ ĐỔI (không gửi, hoặc gửi đúng chủ hiện tại → giữ nguyên, kể cả xe của công ty chủ cũ).
      let chuMoi: { partyId: string; ten: string } | null = null;
      if (v.ownerPartyId !== null && v.ownerPartyId !== cu.owner_party_id) {
        const chu = await xacDinhChuXe(env.DB, v.ownerPartyId);
        if (chu instanceof Response) return chu;
        chuMoi = chu;
      }
      // R15 điểm 1: sửa biển, hoặc DÙNG LẠI xe đã ngừng (Ngừng → Đang dùng/Bảo dưỡng) — biển không được đang thuộc xe khác chưa ngừng.
      const trung = await trungXe(env.DB, v, id);
      if (trung) return trung;
      const at = now.toISOString();
      let results: D1Result[];
      try {
        results = await env.DB.batch([
          updateVehicleStatement(env.DB, id, v, chuMoi?.partyId ?? cu.owner_party_id, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "vehicle_updated", at, targetType: "vehicle", targetId: id, detail: thayDoiXe(cu, v, chuMoi?.ten ?? null) }, "changes() > 0"),
        ]);
      } catch (e) {
        const p = dbProblem(e);
        if (p) return p;
        throw e;
      }
      if ((results[0]!.meta.changes ?? 0) === 0) return STALE();
      return respondVehicle(env.DB, id);
    }),

    // ---- Giấy tờ xe (Task A14): thứ tự 403 ô → 404 xe → 409 xe đã ngừng (thêm, gia hạn) → 404 dòng → 400 thân → 409 dòng hiện hành → ghi + nhật ký cùng lô
    // (chi tiết mở đầu bằng biển số, KHÔNG số) → 409 stale. Lớp CSDL (trigger) trả document_changed — khác document_not_current của lớp route.
    route("POST", "/api/van-chuyen/xe/:id/giay-to", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const xe = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      if (!xe) return NOT_FOUND();
      if (xe.status === "retired") return RETIRED();
      const now = new Date();
      const d = await danhMucXe(env.DB, vnToday(now));
      const parsed = kiemThemGiayToXe(await readJson(request), d.dm);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const at = now.toISOString();
      try {
        await env.DB.batch([
          insertVehicleDocStatement(env.DB, crypto.randomUUID(), id, v, null, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "vehicle_document_added", at, targetType: "vehicle", targetId: id, detail: chiTietNhatKyXe(xe.plate_number, { loai: d.tenLoai(v.typeCode), hetHan: v.expiryDate }) }),
        ]);
      } catch (e) {
        const p = dbProblem(e);
        if (p) return p;
        throw e;
      }
      return respondVehicle(env.DB, id, 201);
    }),

    route("POST", "/api/van-chuyen/xe/:id/giay-to/:did/gia-han", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const xe = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      if (!xe) return NOT_FOUND();
      if (xe.status === "retired") return RETIRED();
      const did = params.did ?? "";
      const cu = UUID_RE.test(did) ? await findVehicleDocument(env.DB, did, id) : null;
      if (!cu) return DOC_NOT_FOUND();
      const now = new Date();
      const d = await danhMucXe(env.DB, vnToday(now));
      // Gia hạn = dòng MỚI; không gửi số thì chép số dòng trước.
      const parsed = kiemGiaHanXe(await readJson(request), { typeCode: cu.document_type_code, number: cu.document_number }, d.dm);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (cu.is_current !== 1) return DOC_NOT_CURRENT();
      const v = parsed.value;
      const at = now.toISOString();
      try {
        await env.DB.batch([
          insertVehicleDocStatement(env.DB, crypto.randomUUID(), id, v, did, staff.id, at),
          auditStatement(env.DB, {
            staffId: staff.id, action: "vehicle_document_renewed", at, targetType: "vehicle", targetId: id,
            detail: chiTietNhatKyXe(xe.plate_number, { loai: d.tenLoai(v.typeCode), giaHan: true, truoc: cu.expiry_date, sau: v.expiryDate }),
          }),
        ]);
      } catch (e) {
        const p = dbProblem(e);
        if (p) return p;
        throw e;
      }
      return respondVehicle(env.DB, id, 201);
    }),

    route("POST", "/api/van-chuyen/xe/:id/giay-to/:did/sua-sai", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const xe = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      if (!xe) return NOT_FOUND();
      const did = params.did ?? "";
      const cu = UUID_RE.test(did) ? await findVehicleDocument(env.DB, did, id) : null;
      if (!cu) return DOC_NOT_FOUND();
      const now = new Date();
      const d = await danhMucXe(env.DB, vnToday(now));
      const hienHanh = { typeCode: cu.document_type_code, number: cu.document_number, issuedDate: cu.issued_date, expiryDate: cu.expiry_date };
      const parsed = kiemSuaSaiXe(await readJson(request), hienHanh, d.dm);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (cu.is_current !== 1) return DOC_NOT_CURRENT();
      const s = parsed.value;
      const at = now.toISOString();
      const loai = d.tenLoai(cu.document_type_code);
      let ghi: D1PreparedStatement;
      let detail: string;
      if (s.huy) {
        ghi = voidVehicleDocStatement(env.DB, did, id, s.expectedUpdatedAt, staff.id, at);
        detail = chiTietNhatKyXe(xe.plate_number, { loai, lyDo: s.lyDo });
      } else {
        const moi = { ...hienHanh, [s.truong]: s.giaTri };
        ghi = updateVehicleDocStatement(env.DB, did, id, s.expectedUpdatedAt, moi, staff.id, at);
        const ngay = s.truong === "issuedDate" || s.truong === "expiryDate";
        detail = chiTietNhatKyXe(xe.plate_number, { loai, lyDo: s.lyDo, truoc: ngay ? hienHanh[s.truong] : null, sau: ngay ? moi[s.truong] : null });
      }
      let results: D1Result[];
      try {
        results = await env.DB.batch([ghi, auditStatement(env.DB, { staffId: staff.id, action: "vehicle_document_corrected", at, targetType: "vehicle", targetId: id, detail }, "changes() > 0")]);
      } catch (e) {
        const p = dbProblem(e);
        if (p) return p;
        throw e;
      }
      if ((results[0]!.meta.changes ?? 0) === 0) return DOC_STALE();
      return respondVehicle(env.DB, id);
    }),

    // ---- ADR-0049 D2 (Task A7): chính sách điều phối, điều kiện xuất bến, hạng bằng — cổng office + ô settings.ops (chỉ Toàn quyền) viết thẳng ở đầu thân,
    // kể cả route ĐỌC (luật (1b) hàng rào 2). Khác tiền lệ `nguong-het-han` (cổng admin): ADR-0049 D3 ghi rõ cổng office.
    route("GET", "/api/van-chuyen/chinh-sach-dieu-phoi", "office", async ({ env, staff, nhanNhanVien }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      return respondChinhSach(env.DB, nhanNhanVien);
    }),

    route("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", "office", async ({ request, env, staff, nhanNhanVien }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      const parsed = kiemChinhSachMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const at = new Date().toISOString();
      const cu = await currentDispatchPolicy(env.DB, at);
      const truoc = cu
        ? {
          minLeadMinutes: cu.min_lead_minutes, warnLeadMinutes: cu.warn_lead_minutes, restMinutes: cu.rest_minutes, requireManifest: cu.require_manifest === 1,
          proxyBackdateMaxMinutes: cu.proxy_backdate_max_minutes,
        }
        : null;
      try {
        await env.DB.batch([
          insertDispatchPolicyStatement(env.DB, crypto.randomUUID(), parsed.value, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "dispatch_policy_changed", at, detail: chiTietChinhSach(truoc, parsed.value) }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: vc_dispatch_policy\.valid_from_at/.test(e.message)) return error(409, "stale", "Vừa có người đổi chính sách, tải lại rồi thử lại.");
        throw e;
      }
      return respondChinhSach(env.DB, nhanNhanVien, 201);
    }),

    route("GET", "/api/van-chuyen/dieu-kien", "office", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      return respondDieuKien(env.DB);
    }),

    route("POST", "/api/van-chuyen/dieu-kien", "office", async ({ request, env, staff }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      const parsed = kiemDieuKienMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      // Loại giấy tờ XE: danh mục của chính module → kiểm trước. Loại giấy tờ của NGƯỜI: danh mục của parties → khoá ngoại giữ (lỗi → 400 dưới).
      const loaiXe = v.subject === "VEHICLE" ? await findVehicleDocumentType(env.DB, v.documentTypeCode) : null;
      if (v.subject === "VEHICLE" && !loaiXe) return error(400, "invalid_input", "Không có loại giấy tờ xe này trong danh mục.");
      const at = new Date().toISOString();
      try {
        await env.DB.batch([
          insertDepartureRuleStatement(env.DB, crypto.randomUUID(), v, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "departure_rule_added", at, detail: chiTietDieuKien(v, loaiXe?.name ?? v.documentTypeCode) }),
        ]);
      } catch (e) {
        if (e instanceof Error && LOI_KHOA_NGOAI.test(e.message)) return error(400, "invalid_input", "Không có loại giấy tờ này trong danh mục.");
        throw e;
      }
      return respondDieuKien(env.DB, 201);
    }),

    route("POST", "/api/van-chuyen/dieu-kien/:id/dong", "office", async ({ env, params, staff }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      const id = params.id ?? "";
      const r = UUID_RE.test(id) ? await findDepartureRule(env.DB, id) : null;
      if (!r) return error(404, "not_found", "Không tìm thấy điều kiện xuất bến.");
      const DA_DONG = () => error(409, "rule_closed", "Điều kiện này đã đóng rồi — tải lại.");
      if (r.valid_to_at !== null) return DA_DONG();
      const at = new Date().toISOString();
      const detail = chiTietDieuKien({ minCapacity: r.min_capacity, subject: r.subject, documentTypeCode: r.vehicle_document_type_code ?? r.person_document_type_code ?? "" }, tenLoaiDieuKien(r));
      const results = await env.DB.batch([
        closeDepartureRuleStatement(env.DB, id, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "departure_rule_closed", at, detail }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return DA_DONG();
      return respondDieuKien(env.DB);
    }),

    route("GET", "/api/van-chuyen/hang-bang", "office", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      return respondHangBang(env.DB);
    }),

    route("POST", "/api/van-chuyen/hang-bang", "office", async ({ request, env, staff }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      const parsed = kiemHangBangMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const at = new Date().toISOString();
      const cu = await currentLicenseCapacity(env.DB, v.classCode, at);
      try {
        await env.DB.batch([
          insertLicenseCapacityStatement(env.DB, crypto.randomUUID(), v, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "license_capacity_changed", at, detail: chiTietHangBang(v.classCode, cu ? cu.max_passengers : undefined, v.maxPassengers) }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: vc_license_capacity\./.test(e.message)) return error(409, "stale", "Vừa có người đổi hạng bằng này, tải lại rồi thử lại.");
        if (e instanceof Error && LOI_KHOA_NGOAI.test(e.message)) return error(400, "invalid_input", "Không có hạng bằng này trong danh mục.");
        throw e;
      }
      return respondHangBang(env.DB, 201);
    }),

    // Danh mục lý do (ADR-0049 D2 CH-06) — Quản trị sửa: cổng admin + ô admin.manage viết thẳng (luật (4) của hàng rào 2); khuôn loc_location (Ruling R7).
    route("GET", "/api/van-chuyen/ly-do", "admin", async ({ env, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      return respondLyDo(env.DB);
    }),

    route("POST", "/api/van-chuyen/ly-do", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const parsed = kiemLyDoMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const at = new Date().toISOString();
      try {
        await env.DB.batch([
          insertTripReasonStatement(env.DB, v, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "trip_reason_added", at, detail: chiTietLyDo(v.code, v.group, v.label) }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: vc_reason\.code/.test(e.message)) return error(409, "code_taken", "Mã này đã có trong danh mục lý do.");
        throw e;
      }
      return respondLyDo(env.DB, 201);
    }),

    route("PUT", "/api/van-chuyen/ly-do/:code", "admin", async ({ request, env, params, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const code = params.code ?? "";
      const cu = MA_LY_DO_RE.test(code) ? await findTripReason(env.DB, code) : null;
      if (!cu) return error(404, "not_found", "Không tìm thấy lý do.");
      const parsed = kiemSuaLyDo(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      // R-P22: mã lý do máy tự dùng không ngưng được (máy chủ sẽ ghi mã này dù màn không còn chọn được) — sửa nhãn / thứ tự vẫn được.
      if (!v.active && laLyDoHeThong(code)) return error(409, "ly_do_he_thong", "Lý do này do hệ thống tự dùng nên không ngưng được — chỉ sửa được tên và thứ tự.");
      const at = new Date().toISOString();
      const results = await env.DB.batch([
        updateTripReasonStatement(env.DB, code, v, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "trip_reason_updated", at, detail: chiTietLyDo(code, cu.reason_group as NhomLyDo, v.label, v.active) }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return error(409, "stale", "Danh mục lý do vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
      return respondLyDo(env.DB);
    }),

    // ---- Danh mục loại giấy tờ xe + ngưỡng "sắp hết hạn" + danh sách giấy tờ sắp hết hạn (Task A15) ---------------------------------------------------------
    route("GET", "/api/van-chuyen/meta", "office", async ({ env, staff }) => {
      // Người quản lý xe (chọn loại khi thêm giấy tờ) và người sửa danh mục (admin.manage).
      if (!can(staff, "vehicle.manage") && !can(staff, "admin.manage")) return FORBIDDEN();
      return respondMeta(env.DB);
    }),

    // Danh mục loại giấy tờ xe — Quản trị sửa (ô admin.manage viết thẳng — luật (4) của hàng rào 2); khuôn loc_location (Ruling R7). Luật kiểm chung với loại
    // giấy tờ của người (src/shared/giay-to.ts). Nhật ký cùng lô, chỉ mã + tên.
    route("POST", "/api/van-chuyen/loai-giay-to-xe", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const parsed = kiemLoaiGiayToMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const at = new Date().toISOString();
      try {
        await env.DB.batch([
          insertVehicleDocTypeStatement(env.DB, v, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "vehicle_document_type_changed", at, detail: `loại giấy tờ xe: ${v.code} — ${v.name}` }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: vc_vehicle_document_type\.code/.test(e.message)) return error(409, "code_taken", "Mã này đã có trong danh mục.");
        throw e;
      }
      return respondMeta(env.DB, 201);
    }),

    route("PUT", "/api/van-chuyen/loai-giay-to-xe/:code", "admin", async ({ request, env, params, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const code = params.code ?? "";
      if (!MA_LOAI_GIAY_TO_RE.test(code) || !(await findVehicleDocumentType(env.DB, code))) return error(404, "not_found", "Không tìm thấy loại giấy tờ xe.");
      const parsed = kiemSuaLoaiGiayTo(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const at = new Date().toISOString();
      const results = await env.DB.batch([
        updateVehicleDocTypeStatement(env.DB, code, v, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "vehicle_document_type_changed", at, detail: `loại giấy tờ xe: ${code} — ${v.name}` }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return error(409, "stale", "Danh mục vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
      return respondMeta(env.DB);
    }),

    // Ngưỡng "sắp hết hạn" (ADR-0040 D1) — chính sách có ngày hiệu lực, CHỈ Toàn quyền (ô settings.ops viết thẳng ở đầu thân). Đổi = chèn dòng mới, hiệu lực ngay.
    route("POST", "/api/van-chuyen/nguong-het-han", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống đổi được mốc nhắc giấy tờ sắp hết hạn.");
      const parsed = kiemNguong(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const now = new Date();
      const at = now.toISOString();
      const cu = await currentWarnDays(env.DB, at);
      try {
        await env.DB.batch([
          insertPolicyStatement(env.DB, crypto.randomUUID(), parsed.value, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "expiry_policy_changed", at, detail: `mốc nhắc giấy tờ sắp hết hạn: ${cu} → ${parsed.value} ngày` }),
        ]);
      } catch (e) {
        // Ruling R19 (điều phối 2026-09-28): hai lần đổi CÙNG một mili-giây vấp khoá duy nhất valid_from_at (cả lô huỷ, không dòng nhật ký) → 409, không 500.
        if (e instanceof Error && /UNIQUE constraint failed: vc_expiry_policy\.valid_from_at/.test(e.message)) {
          return error(409, "stale", "Vừa có người đổi mốc nhắc, tải lại rồi thử lại.");
        }
        throw e;
      }
      return respondMeta(env.DB);
    }),

    // ADR-0048 D1: danh sách nhà xe đang hợp tác (hàm công bố của parties) + công ty chủ + số xe CHƯA NGỪNG theo chủ (bảng của chính module). Xếp theo tên.
    route("GET", "/api/van-chuyen/nha-xe", "office", async ({ env, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const [congTy, nhaXe, soXe] = await Promise.all([ownerCompany(env.DB), nhaXeDangHopTac(env.DB), vehicleCountByOwner(env.DB)]);
      return json({
        ownerCompany: congTy ? { partyId: congTy.partyId, name: congTy.displayName } : null,
        carriers: nhaXe.map((c) => ({ partyId: c.partyId, name: c.displayName, kind: c.kind, vehicleCount: soXe.get(c.partyId) ?? 0, driverCount: c.driverCount })),
      } satisfies CarrierListResponse);
    }),

    route("GET", "/api/van-chuyen/sap-het-han", "office", async ({ env, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const now = new Date();
      const today = vnToday(now);
      const warnDays = await currentWarnDays(env.DB, now.toISOString());
      const until = addDays(today, warnDays);
      // Giấy tờ xe (xe chưa ngừng, dòng hiện hành) + giấy tờ tài xế qua hàm công bố của parties (KHÔNG số, không nơi cấp, không id giấy tờ).
      const [xe, nguoi] = await Promise.all([expiringVehicleDocuments(env.DB, until), expiringDriverDocuments(env.DB, { today, until })]);
      const items = gopSapHetHan(
        xe.map((r) => ({
          vehicleId: r.vehicle_id, plateNumber: r.plate_number, vehicleName: r.vehicle_name, typeName: r.type_name, expiryDate: r.expiry_date,
          // ADR-0048 D1 (I6, G4): null = xe của công ty chủ HIỆN TẠI; nhà xe hay công ty chủ cũ → tên chủ.
          ownerLabel: r.owner_is_company === 1 ? null : r.owner_name,
        })),
        nguoi,
        today,
      );
      return json({ warnDays, count: items.length, items } satisfies ExpiringListResponse);
    }),
    // ---- CHUYẾN XE — route văn phòng lập kế hoạch (ADR-0049 D1–D3 lát 1.5; ADR-0050 VK1-B route 40; kế hoạch mục 1.7 route 1–8, 40; Task A13) -------------
    // Mọi route: `can()` ĐẦU thân (403 trước 400). Hàm hẹp của orders (`lichChungChang`, `hanhKhachChoChuyen`) CHỈ gọi ở đây, SAU `can()`, rồi truyền xuống
    // (dieu-phoi-doc.ts, dieu-phoi-route.ts không gọi). Mỗi lệnh ghi: một `db.batch` có thứ tự cố định (dieu-phoi.ts — bài thứ tự lô A14); lệnh lặp cùng
    // `requestId` → 200 kết quả hiện tại (LC-11). Nhật ký `trip_*`: orderId NULL (I17).
    route("GET", "/api/van-chuyen/lich", "office", async ({ env, url, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.view")) return CAN_XEM_CHUYEN();
      const ngay = url.searchParams.get("ngay") ?? vnToday(new Date());
      if (!isISODate(ngay)) return error(400, "invalid_input", "Ngày xem lịch: YYYY-MM-DD.");
      const bayGioMs = Date.now();
      const trips = await tripsByDate(env.DB, ngay);
      const lich = await lichChungChang(env.DB, addDays(ngay, -1), addDays(ngay, 1));
      return json(await dungLichNgay(env.DB, ngay, trips, lich, nhanNhanVien, bayGioMs, can(staff, "order.leg.short_notice")));
    }),

    route("GET", "/api/van-chuyen/chuyen/:id", "office", async ({ env, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.view")) return CAN_XEM_CHUYEN();
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const lich = await lichChungChang(env.DB, nen.tu, nen.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen.legIds);
      return json(await chiTietChuyen(env.DB, nen, lich.chang, hk, true, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), Date.now()) satisfies ChuyenChiTietResponse);
    }),

    route("POST", "/api/van-chuyen/chuyen", "office", async ({ env, request, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docTaoChuyen(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const t = than.value;
      if (t.nghiPhaLe && !can(staff, "trip.override")) return CAN_PHA_LE();
      const lap = await eventByRequest(env.DB, t.requestId);
      const bayGioMs = Date.now();
      const nowIso = new Date(bayGioMs).toISOString();
      if (!lap) {
        const chung = await docChung(env.DB, nowIso, vnToday(new Date(bayGioMs)));
        const xeRow = chung.xe.find((x) => x.id === t.xeId);
        if (!xeRow) return error(400, "invalid_input", "Xe không có hoặc đã ngừng dùng.");
        if (t.nghiPhaLe && !lyDoHopLe(chung, t.nghiPhaLe.lyDo, "PHA_LE")) return error(400, "invalid_input", "Lý do phá lệ không có trong danh mục.");
        // LC-13 phần CHỈ máy chủ giữ (R-P8): hồ sơ không có trong `taiXeChoDieuPhoi` (không mở vai tài xế công ty, không thuộc nhà xe nào) → chéo xe – tài xế.
        if (!chung.taiXe.some((x) => x.partyId === t.taiXePartyId)) return loi409("cheo_xe_tai_xe", [lyDoGiu("CHEO_XE_TAI_XE")]);
        const khac = await tripsTouching(env.DB, t.batDauMs - NGAY_MS, t.ketThucMs + NGAY_MS);
        const kq = kiemTaoSuaChuyen({
          lenh: "TAO", chuyen: { id: null, batDauMs: t.batDauMs, ketThucMs: t.ketThucMs, xe: xeVao(xeRow, chung.giayToXe), taiXe: taiXeVao(t.taiXePartyId, chung.taiXe), nghiPhaLe: t.nghiPhaLe !== null },
          chuyenKhac: khac.map(khungChuyen), chinhSach: chinhSachVao(chung.chinhSach), hangBang: chung.hangBang, bayGioMs,
        });
        const chan = loiKiem(kq, staff, null, { moc: false, nghi: t.nghiPhaLe !== null });
        if (chan) return chan;
        const ngayChay = msToVnLocal(t.batDauMs).date;
        const id = crypto.randomUUID();
        for (let lan = 0; ; lan++) {
          const ma = `CX-${ngayChay.slice(8, 10)}${ngayChay.slice(5, 7)}-${String((await tripCountByDate(env.DB, ngayChay)) + 1 + lan).padStart(2, "0")}`;
          const lo = loTaoChuyen(env.DB, {
            cmd: crypto.randomUUID(), requestId: t.requestId, lucIso: nowIso, nguoiId: staff.id,
            chuyen: { id, ma, xeId: xeRow.id, chuXePartyId: xeRow.owner_party_id, ngayChay, batDauMs: t.batDauMs, ketThucMs: t.ketThucMs, nghiChup: chung.chinhSach?.rest_minutes ?? 0, nghiPhaLeLyDo: t.nghiPhaLe?.lyDo ?? null },
            taiXePartyId: t.taiXePartyId, policyId: chung.chinhSach?.id ?? null,
            phaLeNghi: t.nghiPhaLe ? { luat: "KHOANG_NGHI", lyDo: t.nghiPhaLe.lyDo, policyId: chung.chinhSach?.id ?? null } : null,
            detail: `${ma} · xe ${xeRow.plate_number} (${xeRow.passenger_capacity} chỗ) · ${gioNgan(t.batDauMs)} → ${gioNgan(t.ketThucMs)}${t.nghiPhaLe ? phaLeNhatKy("KHOANG_NGHI", nhanLyDo(chung, t.nghiPhaLe.lyDo)) : ""}`,
          });
          try {
            const r = await chayLo(env.DB, lo, t.requestId);
            if (!r.ok) return r.res;
            break;
          } catch (e) {
            if (lan < 3 && e instanceof Error && /UNIQUE constraint failed: vc_trip\.service_date, vc_trip\.code/.test(e.message)) continue;
            throw e;
          }
        }
      }
      const nen = await docNen(env.DB, lap?.trip_id ?? (await eventByRequest(env.DB, t.requestId))!.trip_id);
      if (!nen) return KHONG_CO_CHUYEN();
      const lich = await lichChungChang(env.DB, nen.tu, nen.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen.legIds);
      return json(await chiTietChuyen(env.DB, nen, lich.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse, lap ? 200 : 201);
    }),

    route("PUT", "/api/van-chuyen/chuyen/:id", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docSuaChuyen(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      if ((b.phaLe || b.nghiPhaLe) && !can(staff, "trip.override")) return CAN_PHA_LE();
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, b.requestId))) {
        const r = await lenhSuaChuyen(env.DB, nen, b, staff, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    route("POST", "/api/van-chuyen/chuyen/:id/phan-bo", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docXep(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      if (b.phaLe && !can(staff, "trip.override")) return CAN_PHA_LE();
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, b.requestId))) {
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const r = await lenhXep(env.DB, nen, lich.chang, b, staff, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    route("POST", "/api/van-chuyen/chuyen/:id/rut", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docRut(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      if (b.phaLe && !can(staff, "trip.override")) return CAN_PHA_LE();
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, b.requestId))) {
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const r = await lenhRut(env.DB, nen, lich.chang, b, staff, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    route("POST", "/api/van-chuyen/chuyen/:id/doi", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docDoi(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      if (b.phaLe && !can(staff, "trip.override")) return CAN_PHA_LE();
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, b.requestId))) {
        const dich = b.denChuyenId === nen.trip.id ? null : await docNen(env.DB, b.denChuyenId);
        if (!dich) return error(400, "invalid_input", "Chuyến đích không hợp lệ.");
        const lich = await lichChungChang(env.DB, nen.tu < dich.tu ? nen.tu : dich.tu, nen.den > dich.den ? nen.den : dich.den);
        const r = await lenhDoi(env.DB, nen, dich, lich.chang, b, staff, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    route("POST", "/api/van-chuyen/chuyen/:id/huy", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docHuy(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      if (b.phaLe && !can(staff, "trip.override")) return CAN_PHA_LE();
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, b.requestId))) {
        const r = await lenhHuy(env.DB, nen, b, staff, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    // ADR-0050 VK1-B (route 40, I42): "Cập nhật điểm theo đơn" — máy tự tìm MỌI suất khách mở lệch nơi (không chọn tay), đóng STOP_CHANGED + mở suất mới ở điểm
    // theo khoá nơi hiện hành. Chỉ chuyến PLANNED; KHÔNG khoá theo mốc (DOI_DIEM_THEO_CHANG ngoài LENH_KHOA_THEO_MOC), không cần phá lệ. Không suất nào lệch →
    // 200 daCapNhat 0, không ghi gì — xét TRƯỚC câu cổng version (người thứ hai bấm sau khi người khác đã cập nhật nhận 200 / 0, không 409).
    route("POST", "/api/van-chuyen/chuyen/:id/cap-nhat-diem", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docCapNhatDiem(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      let daCapNhat = 0;
      const lap = await eventByRequest(env.DB, b.requestId);
      if (!lap) {
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const r = await lenhCapNhatDiem(env.DB, nen, lich.chang, b, staff, bayGioMs);
        if (r instanceof Response) return r;
        daCapNhat = r;
      } else daCapNhat = (await eventsByTrips(env.DB, [nen.trip.id])).find((e) => e.id === lap.id)?.count ?? 0;
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json({ ...(await chiTietChuyen(env.DB, nen2, lich2.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs)), daCapNhat } satisfies CapNhatDiemResponse);
    }),

    // ---- LỆNH TIẾN ĐỘ — route TÀI XẾ (cổng staff; kế hoạch mục 1.7 route 19–29; Task A15) ------------------------------------------------------------------
    // Khuôn hai bước (mục 1.2): (1) `can(trip.view, { assigned: true })` — tài khoản không có ô nào → 403 trước mọi truy vấn; (2) chuyến có dòng lái MỞ của
    // CHÍNH người gọi (`assigned`) và ô của lệnh → không thì 404 (kể cả người có ô `any` — văn phòng bấm thay qua route office, R-P1); (3) rồi mới đọc thân
    // (400). Thân có `xayRaLuc` → 400 `xay_ra_khong_nhan` (tài xế bấm = giờ máy chủ). Hàm hẹp của orders gọi ở đây, SAU `can()`; `lienHeChoTaiXe` CHỈ ở GET
    // chi tiết và chỉ khi `trongNgayChay` (mục 1.6).
    route("GET", "/api/van-chuyen/cuoc-cua-toi", "staff", async ({ env, url, staff }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const bayGioMs = Date.now();
      const homNay = vnToday(new Date(bayGioMs));
      const tu = url.searchParams.get("tu") ?? homNay;
      const den = url.searchParams.get("den") ?? addDays(tu, 6);
      if (!isISODate(tu) || !isISODate(den) || den < tu || den > addDays(tu, 31)) return error(400, "invalid_input", "Khoảng ngày: tu, den dạng YYYY-MM-DD, tối đa 31 ngày.");
      const trips = staff.partyId ? await tripsCuaTaiXe(env.DB, staff.partyId, tu, den) : [];
      const ngay = trips.map((t) => t.service_date).sort();
      const lich = trips.length === 0 ? { chang: [] } : await lichChungChang(env.DB, addDays(ngay[0]!, -1), addDays(ngay[ngay.length - 1]!, 1));
      return json({ tu, den, chuyen: await danhSachCuoc(env.DB, trips, lich.chang, bayGioMs) } satisfies CuocCuaToiResponse);
    }),

    route("GET", "/api/van-chuyen/cuoc-cua-toi/:id", "staff", async ({ env, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.view", { assigned })) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const trongNgay = trongNgayChay({ ngayChay: nen.trip.service_date, trangThai: nen.trip.status }, vnToday(new Date(bayGioMs)));
      const lich = await lichChungChang(env.DB, nen.tu, nen.den);
      const hk = trongNgay ? await hanhKhachChoChuyen(env.DB, nen.legIds) : [];
      const donIds = [...new Set(lich.chang.filter((c) => nen.allocs.some((a) => a.valid_to_at === null && a.leg_id === c.legId)).map((c) => c.orderId))];
      const lienHe = trongNgay ? await lienHeChoTaiXe(env.DB, donIds) : null;
      return json(await cuocChiTiet(env.DB, nen, lich.chang, hk, lienHe, nhanNhanVien, bayGioMs, trongNgay) satisfies CuocChiTietResponse);
    }),

    // route 21 ↔ 31
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/xuat-ben", "staff", async ({ env, request, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const hk = await hanhKhachChoChuyen(env.DB, nen.legIds);
        const r = await lenhXuatBen(env.DB, nen, lich.chang, hk, than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const trongNgay = trongNgayChay({ ngayChay: nen2.trip.service_date, trangThai: nen2.trip.status }, vnToday(new Date(bayGioMs)));
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, trongNgay) satisfies CuocChiTietResponse);
    }),

    // route 22 ↔ 32
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/diem/:sid/da-toi", "staff", async ({ env, request, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhDaToi(env.DB, nen, params.sid ?? "", than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const trongNgay = trongNgayChay({ ngayChay: nen2.trip.service_date, trangThai: nen2.trip.status }, vnToday(new Date(bayGioMs)));
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, trongNgay) satisfies CuocChiTietResponse);
    }),

    // route 23 ↔ 33
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/don", "staff", async ({ env, request, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhDaDon(env.DB, nen, params.aid ?? "", than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const trongNgay = trongNgayChay({ ngayChay: nen2.trip.service_date, trangThai: nen2.trip.status }, vnToday(new Date(bayGioMs)));
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, trongNgay) satisfies CuocChiTietResponse);
    }),

    // route 24 ↔ 34
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/vang", "staff", async ({ env, request, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhVang(env.DB, nen, params.aid ?? "", than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const trongNgay = trongNgayChay({ ngayChay: nen2.trip.service_date, trangThai: nen2.trip.status }, vnToday(new Date(bayGioMs)));
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, trongNgay) satisfies CuocChiTietResponse);
    }),

    // route 25 ↔ 35
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/khach-huy", "staff", async ({ env, request, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhKhachHuy(env.DB, nen, params.aid ?? "", than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const trongNgay = trongNgayChay({ ngayChay: nen2.trip.service_date, trangThai: nen2.trip.status }, vnToday(new Date(bayGioMs)));
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, trongNgay) satisfies CuocChiTietResponse);
    }),

    // route 26 ↔ 36
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/tra", "staff", async ({ env, request, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhDaTra(env.DB, nen, params.aid ?? "", than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const trongNgay = trongNgayChay({ ngayChay: nen2.trip.service_date, trangThai: nen2.trip.status }, vnToday(new Date(bayGioMs)));
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, trongNgay) satisfies CuocChiTietResponse);
    }),

    // route 27 ↔ 37
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/ket-thuc", "staff", async ({ env, request, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhKetThuc(env.DB, nen, than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const trongNgay = trongNgayChay({ ngayChay: nen2.trip.service_date, trangThai: nen2.trip.status }, vnToday(new Date(bayGioMs)));
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, trongNgay) satisfies CuocChiTietResponse);
    }),

    // route 28 ↔ 38
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/ket-thuc-gian-doan", "staff", async ({ env, request, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docKetThucGianDoan(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhKetThucGianDoan(env.DB, nen, than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const trongNgay = trongNgayChay({ ngayChay: nen2.trip.service_date, trangThai: nen2.trip.status }, vnToday(new Date(bayGioMs)));
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, trongNgay) satisfies CuocChiTietResponse);
    }),

    // route 29 ↔ 39
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/thu-tu", "staff", async ({ env, request, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docDoiThuTu(await readJson(request));
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhDoiThuTu(env.DB, nen, than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const trongNgay = trongNgayChay({ ngayChay: nen2.trip.service_date, trangThai: nen2.trip.status }, vnToday(new Date(bayGioMs)));
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, trongNgay) satisfies CuocChiTietResponse);
    }),

    // ---- LỆNH TIẾN ĐỘ — route VĂN PHÒNG BẤM THAY (cổng office; kế hoạch mục 1.7 route 31–39; R-P1 — Task A15) ---------------------------------------------
    // `can(trip.progress)` ĐẦU thân (Kế toán → 403), rồi gọi ĐÚNG hàm xử lý mà route tài xế cùng lệnh gọi (bài tien-do-mot-luat.test.ts). Route 31–38 nhận
    // `xayRaLuc` (văn phòng khai giờ xảy ra — ADR-0050 VK1-A); route 39 (đổi thứ tự) thì không. Phản hồi = chi tiết chuyến của văn phòng.

    // route 31 ↔ 21
    route("POST", "/api/van-chuyen/chuyen/:id/xuat-ben", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const hk = await hanhKhachChoChuyen(env.DB, nen.legIds);
        const r = await lenhXuatBen(env.DB, nen, lich.chang, hk, than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    // route 32 ↔ 22
    route("POST", "/api/van-chuyen/chuyen/:id/diem/:sid/da-toi", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhDaToi(env.DB, nen, params.sid ?? "", than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    // route 33 ↔ 23
    route("POST", "/api/van-chuyen/chuyen/:id/phan-bo/:aid/don", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhDaDon(env.DB, nen, params.aid ?? "", than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    // route 34 ↔ 24
    route("POST", "/api/van-chuyen/chuyen/:id/phan-bo/:aid/vang", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhVang(env.DB, nen, params.aid ?? "", than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    // route 35 ↔ 25
    route("POST", "/api/van-chuyen/chuyen/:id/phan-bo/:aid/khach-huy", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhKhachHuy(env.DB, nen, params.aid ?? "", than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    // route 36 ↔ 26
    route("POST", "/api/van-chuyen/chuyen/:id/phan-bo/:aid/tra", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhDaTra(env.DB, nen, params.aid ?? "", than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    // route 37 ↔ 27
    route("POST", "/api/van-chuyen/chuyen/:id/ket-thuc", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhKetThuc(env.DB, nen, than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    // route 38 ↔ 28
    route("POST", "/api/van-chuyen/chuyen/:id/ket-thuc-gian-doan", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docKetThucGianDoan(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhKetThucGianDoan(env.DB, nen, than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    // route 39 ↔ 29
    route("POST", "/api/van-chuyen/chuyen/:id/thu-tu", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docDoiThuTu(await readJson(request));
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      if (!(await eventByRequest(env.DB, than.value.requestId))) {
        const r = await lenhDoiThuTu(env.DB, nen, than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs) satisfies ChuyenChiTietResponse);
    }),

    // ---- NHẮC "GỌI BÁO KHÁCH" KHI GIỜ HẸN ĐỔI (ADR-0051 GB1, GB2 — Task A-GB) ----------------------------------------------------------------------------
    // Danh sách nhắc KHÔNG theo ngày đang xem (Q-GB-3 = (a) "Hiện ngay hôm nay"): chuyến chưa kết thúc có ngày CHUYẾN trong [hôm nay − 1, hôm nay + 14]. Giờ hẹn
    // hiện hành đọc THEO ID qua hàm hẹp `hanhKhachChoChuyen` (sau `can()`); tên khách của hàm đó KHÔNG ra DTO (TC-GB-9b).
    route("GET", "/api/van-chuyen/nhac-goi-khach", "office", async ({ env, staff, isAssigned }) => {
      if (!can(staff, "trip.view")) return CAN_XEM_CHUYEN();
      const homNay = vnToday(new Date());
      const tu = addDays(homNay, -1);
      const den = addDays(homNay, NHAC_GOI_SO_NGAY);
      const legIds = await changChoTrongKhoang(env.DB, tu, den);
      const hk = await hanhKhachChoChuyen(env.DB, legIds);
      const d = await docGoiBao(env.DB, legIds);
      return json({ tu, den, muc: await danhSachNhac(legIds, hk, d, quyenGoiBaoCua(staff, isAssigned)) } satisfies NhacGoiKhachResponse);
    }),

    // Thứ tự mã CỐ ĐỊNH (GB1): 403 thô (trip.view + trip.call_ack ≠ none ở một cột — trước mọi truy vấn) → 404 (chặng lạ, qua v_ord_leg_key) → 403 (người lập /
    // người phụ trách đơn / Quản trị / Toàn quyền) → 400 (thân) → lệnh lặp 200 → 409 (khong_con_can_goi / gio_hen_vua_doi). Không chạm vc_trip (không version).
    route("POST", "/api/van-chuyen/chang/:legId/da-goi-bao", "office", async ({ env, request, params, staff, isAssigned, nhanNhanVien }) => {
      if (!can(staff, "trip.view") || !can(staff, "trip.call_ack", { ownerId: staff.id, assigned: true })) return CAN_GOI_BAO();
      const legId = params.legId ?? "";
      const chu = (await changChuDon(env.DB, [legId]))[0];
      if (!chu) return KHONG_CO_CHANG();
      if (!can(staff, "trip.call_ack", { ownerId: chu.owner_id ?? undefined, assigned: await isAssigned(chu.order_id) })) return CAN_GOI_BAO();
      const than = docDaGoiBao(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      // Lệnh lặp → kết quả của LẦN ĐẦU, dựng từ dòng mốc mang requestId (ADR-0051 bước 4; K2a T2) — không đọc trạng thái mới nhất.
      const lap = await mocByRequest(env.DB, than.value.requestId);
      if (lap) return json((await phanHoiLenhLap(env.DB, lap, quyenGoiBaoCua(staff, isAssigned), await nhanNhanVien(lap.created_by ? [lap.created_by] : []))) satisfies GoiBaoChangDto);
      const hk = await hanhKhachChoChuyen(env.DB, [legId]);
      const r = await xuLyMoc("DA_GOI", env.DB, legId, hk, than.value, staff.id, Date.now());
      if (r) return r;
      const d = await docGoiBao(env.DB, [legId]);
      const nhan = await nhanNhanVien(nguoiBamGoiBao(d));
      return json((await goiBaoChang(legId, hk, d, quyenGoiBaoCua(staff, isAssigned), nhan)) ?? { legId, maDon: null, gioHenDoi: null, daGoiBao: null } satisfies GoiBaoChangDto);
    }),

    // Thứ tự mã CỐ ĐỊNH (GB1): 403 thô (trip.view + trip.call_ack ≠ none ở một cột — trước mọi truy vấn) → 404 (chặng lạ, qua v_ord_leg_key) → 403 (người lập /
    // người phụ trách đơn / Quản trị / Toàn quyền) → 400 (thân) → lệnh lặp 200 → 409 (khong_con_can_goi / gio_hen_vua_doi). Không chạm vc_trip (không version).
    route("POST", "/api/van-chuyen/chang/:legId/bo-danh-dau-goi-bao", "office", async ({ env, request, params, staff, isAssigned, nhanNhanVien }) => {
      if (!can(staff, "trip.view") || !can(staff, "trip.call_ack", { ownerId: staff.id, assigned: true })) return CAN_GOI_BAO();
      const legId = params.legId ?? "";
      const chu = (await changChuDon(env.DB, [legId]))[0];
      if (!chu) return KHONG_CO_CHANG();
      if (!can(staff, "trip.call_ack", { ownerId: chu.owner_id ?? undefined, assigned: await isAssigned(chu.order_id) })) return CAN_GOI_BAO();
      const than = docBoDanhDauGoiBao(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      // Lệnh lặp → kết quả của LẦN ĐẦU, dựng từ dòng mốc mang requestId (ADR-0051 bước 4; K2a T2) — không đọc trạng thái mới nhất.
      const lap = await mocByRequest(env.DB, than.value.requestId);
      if (lap) return json((await phanHoiLenhLap(env.DB, lap, quyenGoiBaoCua(staff, isAssigned), await nhanNhanVien(lap.created_by ? [lap.created_by] : []))) satisfies GoiBaoChangDto);
      const hk = await hanhKhachChoChuyen(env.DB, [legId]);
      const r = await xuLyMoc("BO_DANH_DAU", env.DB, legId, hk, than.value, staff.id, Date.now());
      if (r) return r;
      const d = await docGoiBao(env.DB, [legId]);
      const nhan = await nhanNhanVien(nguoiBamGoiBao(d));
      return json((await goiBaoChang(legId, hk, d, quyenGoiBaoCua(staff, isAssigned), nhan)) ?? { legId, maDon: null, gioHenDoi: null, daGoiBao: null } satisfies GoiBaoChangDto);
    }),
  ],
};
