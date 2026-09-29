// Module van-chuyen — phân hệ Vận chuyển, lượt 1a (ADR-0040 D1): xe, giấy tờ xe, danh mục loại giấy tờ xe, ngưỡng "sắp hết hạn", danh sách giấy tờ sắp hết
// hạn (xe + tài xế). Route: /api/van-chuyen/*. Tiền tố bảng vc_ (module nghiêm — STRICT). Phụ thuộc: parties (hàm công bố ownerCompany — chủ xe;
// expiringDriverDocuments — giấy tờ tài xế, KHÔNG số; nhaXeDangHopTac — nhà xe đối tác, ADR-0048 D1) và audit (auditStatement). KHÔNG module nào import van-chuyen (không có gì xuất ra ngoài ngoài AppModule).
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
  ],
};
