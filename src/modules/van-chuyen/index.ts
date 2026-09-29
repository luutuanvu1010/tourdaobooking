// Module van-chuyen — phân hệ Vận chuyển, lượt 1a (ADR-0040 D1): xe, giấy tờ xe, danh mục loại giấy tờ xe, ngưỡng "sắp hết hạn", danh sách giấy tờ sắp hết
// hạn (xe + tài xế). Route: /api/van-chuyen/*. Tiền tố bảng vc_ (module nghiêm — STRICT). Phụ thuộc: parties (hàm công bố ownerCompany — chủ xe;
// expiringDriverDocuments — giấy tờ tài xế, KHÔNG số) và audit (auditStatement). KHÔNG module nào import van-chuyen (không có gì xuất ra ngoài ngoài AppModule).
// Ô quyền: vehicle.manage (Quản trị + Toàn quyền) hỏi ở ĐẦU thân mọi route, trước khi đọc thân yêu cầu (403 trước 400).
import { auditStatement } from "../audit";
import { expiringDriverDocuments, ownerCompany } from "../parties";
import type { ExpiringListResponse, VanChuyenMetaResponse, VehicleDocumentDto, VehicleDto, VehicleListResponse, VehicleResponse } from "../../shared/contracts";
import { MA_LOAI_GIAY_TO_RE, TRANG_THAI_XE, kiemLoaiGiayToMoi, kiemSuaLoaiGiayTo, soNgayConLai } from "../../shared/giay-to";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { addDays, vnToday } from "../../shared/vn-date";
import {
  chassisHolder, currentWarnDays, expiringVehicleDocuments, findVehicle, findVehicleDocument, findVehicleDocumentType, insertPolicyStatement, insertVehicleDocStatement,
  insertVehicleDocTypeStatement, insertVehicleStatement, listVehicleDocumentTypes, listVehicleDocuments, listVehicles, plateHolder, updateVehicleDocStatement,
  updateVehicleDocTypeStatement, updateVehicleStatement, voidVehicleDocStatement, type VehicleDocRow, type VehicleRow,
} from "./repository";
import {
  CAU_BIEN_TRUNG, CAU_KHUNG_TRUNG, canhBaoXe, chiTietNhatKyXe, gopSapHetHan, kiemGiaHanXe, kiemNguong, kiemSuaSaiXe, kiemSuaXe, kiemThemGiayToXe, kiemXeMoi, loiRangBuocXe,
  type CanhBaoXe, type DanhMucGiayToXe, type XeNhap, type XeSua,
} from "./rules";

// ADR-0049 D2 (lát 1.1): hàm công bố mốc tối thiểu (chỉ gốc lắp ráp gọi — không module nào import van-chuyen); route chính sách điều phối, điều kiện xuất
// bến, hạng bằng (cổng office + ô settings.ops), danh mục lý do (cổng admin + ô admin.manage).
import type {
  DepartureRuleDto, DepartureRuleListResponse, DispatchPolicyDto, DispatchPolicyResponse, LicenseCapacityDto, LicenseCapacityResponse, TripReasonDto, TripReasonListResponse,
} from "../../shared/contracts";
import { NHAN_NHOM_LY_DO, type NhomLyDo } from "../../shared/dieu-phoi-kieu";
import type { MocToiThieu } from "../../shared/moc-toi-thieu";
import {
  MA_LY_DO_RE, chiTietChinhSach, chiTietDieuKien, chiTietHangBang, chiTietLyDo, kiemChinhSachMoi, kiemDieuKienMoi, kiemHangBangMoi, kiemLyDoMoi, kiemSuaLyDo,
} from "./chinh-sach";
import {
  closeDepartureRuleStatement, currentDispatchPolicy, currentLicenseCapacity, findDepartureRule, findTripReason, insertDepartureRuleStatement, insertDispatchPolicyStatement,
  insertLicenseCapacityStatement, insertTripReasonStatement, listDepartureRules, listDispatchPolicies, listLicenseCapacity, listTripReasons, updateTripReasonStatement,
  type DepartureRuleRow, type DispatchPolicyRow, type LicenseCapacityRow, type TripReasonRow,
} from "./repository";

const FORBIDDEN = () => error(403, "forbidden", "Tài khoản này không quản lý được xe.");
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy xe.");
const STALE = () => error(409, "stale", "Xe vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
// R15 điểm 1, 3 (điều phối 2026-09-28): lớp ROUTE của biển số / số khung trùng — mã riêng; lớp CSDL (chỉ mục duy nhất) trả mã KHÁC (loiRangBuocXe).
const PLATE_TAKEN = () => error(409, "vehicle_plate_taken", CAU_BIEN_TRUNG);
const CHASSIS_TAKEN = () => error(409, "vehicle_chassis_taken", CAU_KHUNG_TRUNG);
const NO_OWNER = () => error(409, "no_owner_company", "Chưa có hồ sơ công ty chủ nên chưa thêm xe được. Báo người phụ trách hệ thống.");

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
  const r = await currentDispatchPolicy(db, new Date().toISOString());
  return r ? { phut: r.min_lead_minutes, policyId: r.id } : null;
}

// ---- Chính sách điều phối, điều kiện xuất bến, hạng bằng, danh mục lý do (ADR-0049 D2; kế hoạch mục 1.7 route 9–18, Task A7) ------------------------------
// Chính sách / điều kiện / hạng bằng: dòng có ngày hiệu lực, CHỈ THÊM, `valid_from_at` = lúc ghi (I28). Hai lần ghi cùng mili-giây vấp khoá duy nhất → 409
// stale (tiền lệ Ruling R19). Mã lạ trỏ danh mục của parties vấp khoá ngoại → 400 (van-chuyen không đọc thẳng bảng của parties; cả lô huỷ, không nhật ký).
const CHI_TOAN_QUYEN = () => error(403, "forbidden", "Chỉ người phụ trách hệ thống xem và đổi được chính sách điều phối xe.");
const LOI_KHOA_NGOAI = /FOREIGN KEY constraint failed/;
const toPolicyDto = (r: DispatchPolicyRow, currentId: string | null): DispatchPolicyDto => ({
  id: r.id,
  minLeadMinutes: r.min_lead_minutes,
  warnLeadMinutes: r.warn_lead_minutes,
  restMinutes: r.rest_minutes,
  requireManifest: r.require_manifest === 1,
  requireContract: r.require_contract === 1,
  validFrom: r.valid_from_at,
  current: r.id === currentId,
});
async function respondChinhSach(db: D1Database, status = 200): Promise<Response> {
  const rows = await listDispatchPolicies(db); // mới trước
  const now = new Date().toISOString();
  const cur = rows.find((r) => r.valid_from_at <= now) ?? null;
  return json({ current: cur ? toPolicyDto(cur, cur.id) : null, history: rows.map((r) => toPolicyDto(r, cur?.id ?? null)) } satisfies DispatchPolicyResponse, status);
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

/** Nhãn thay đổi cho nhật ký sửa xe — biển số là định danh của xe (không phải "số giấy tờ"), mở đầu `detail` (giả định G12). */
function thayDoiXe(cu: VehicleRow, moi: XeSua): string {
  const doi: string[] = [];
  if (cu.plate_number !== moi.plateNumber) doi.push(`biển số ${cu.plate_number} → ${moi.plateNumber}`);
  if ((cu.chassis_number ?? "") !== moi.chassisNumber) doi.push("số khung");
  if (cu.name !== moi.name) doi.push(`tên ${cu.name} → ${moi.name}`);
  if (cu.model_year !== moi.modelYear) doi.push(`đời xe ${cu.model_year ?? "—"} → ${moi.modelYear ?? "—"}`);
  if (cu.passenger_capacity !== moi.passengerCapacity) doi.push(`số người được chở ${cu.passenger_capacity} → ${moi.passengerCapacity}`);
  if (cu.status !== moi.status) doi.push(`trạng thái ${TRANG_THAI_XE[cu.status]} → ${TRANG_THAI_XE[moi.status]}`);
  return `xe ${cu.plate_number}: ${doi.length ? doi.join("; ") : "không đổi gì"}`;
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
    route("GET", "/api/van-chuyen/xe", "office", async ({ env, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const [rows, cb] = await Promise.all([listVehicles(env.DB), canhBaoTheoXe(env.DB, new Date())]);
      return json({ vehicles: rows.map((r) => toVehicleDto(r, cb(r.id))) } satisfies VehicleListResponse);
    }),

    route("POST", "/api/van-chuyen/xe", "office", async ({ request, env, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const now = new Date();
      const parsed = kiemXeMoi(await readJson(request), vnToday(now));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      // ADR-0040 D1: chủ xe = hồ sơ công ty chủ LÚC THÊM (đổi công ty chủ sau này không tự đổi chủ xe).
      const chu = await ownerCompany(env.DB);
      if (!chu) return NO_OWNER();
      const trung = await trungXe(env.DB, v, "");
      if (trung) return trung;
      const id = crypto.randomUUID();
      const at = now.toISOString();
      try {
        await env.DB.batch([
          insertVehicleStatement(env.DB, id, v, chu.partyId, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "vehicle_created", at, targetType: "vehicle", targetId: id, detail: `xe ${v.plateNumber}: thêm ${v.name}, ${v.passengerCapacity} người` }),
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
      // R15 điểm 1: sửa biển, hoặc DÙNG LẠI xe đã ngừng (Ngừng → Đang dùng/Bảo dưỡng) — biển không được đang thuộc xe khác chưa ngừng.
      const trung = await trungXe(env.DB, v, id);
      if (trung) return trung;
      const at = now.toISOString();
      let results: D1Result[];
      try {
        results = await env.DB.batch([
          updateVehicleStatement(env.DB, id, v, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "vehicle_updated", at, targetType: "vehicle", targetId: id, detail: thayDoiXe(cu, v) }, "changes() > 0"),
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
    route("GET", "/api/van-chuyen/chinh-sach-dieu-phoi", "office", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      return respondChinhSach(env.DB);
    }),

    route("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", "office", async ({ request, env, staff }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      const parsed = kiemChinhSachMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const at = new Date().toISOString();
      const cu = await currentDispatchPolicy(env.DB, at);
      const truoc = cu ? { minLeadMinutes: cu.min_lead_minutes, warnLeadMinutes: cu.warn_lead_minutes, restMinutes: cu.rest_minutes, requireManifest: cu.require_manifest === 1 } : null;
      try {
        await env.DB.batch([
          insertDispatchPolicyStatement(env.DB, crypto.randomUUID(), parsed.value, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "dispatch_policy_changed", at, detail: chiTietChinhSach(truoc, parsed.value) }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: vc_dispatch_policy\.valid_from_at/.test(e.message)) return error(409, "stale", "Vừa có người đổi chính sách, tải lại rồi thử lại.");
        throw e;
      }
      return respondChinhSach(env.DB, 201);
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

    route("GET", "/api/van-chuyen/sap-het-han", "office", async ({ env, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const now = new Date();
      const today = vnToday(now);
      const warnDays = await currentWarnDays(env.DB, now.toISOString());
      const until = addDays(today, warnDays);
      // Giấy tờ xe (xe chưa ngừng, dòng hiện hành) + giấy tờ tài xế qua hàm công bố của parties (KHÔNG số, không nơi cấp, không id giấy tờ).
      const [xe, nguoi] = await Promise.all([expiringVehicleDocuments(env.DB, until), expiringDriverDocuments(env.DB, { today, until })]);
      const items = gopSapHetHan(
        xe.map((r) => ({ vehicleId: r.vehicle_id, plateNumber: r.plate_number, vehicleName: r.vehicle_name, typeName: r.type_name, expiryDate: r.expiry_date })),
        nguoi,
        today,
      );
      return json({ warnDays, count: items.length, items } satisfies ExpiringListResponse);
    }),
  ],
};
