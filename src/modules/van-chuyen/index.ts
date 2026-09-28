// Module van-chuyen — phân hệ Vận chuyển, lượt 1a (ADR-0040 D1): xe, giấy tờ xe, danh mục loại giấy tờ xe, ngưỡng "sắp hết hạn", danh sách giấy tờ sắp hết
// hạn (xe + tài xế). Route: /api/van-chuyen/*. Tiền tố bảng vc_ (module nghiêm — STRICT). Phụ thuộc: parties (hàm công bố ownerCompany — chủ xe;
// expiringDriverDocuments — giấy tờ tài xế, KHÔNG số) và audit (auditStatement). KHÔNG module nào import van-chuyen (không có gì xuất ra ngoài ngoài AppModule).
// Ô quyền: vehicle.manage (Quản trị + Toàn quyền) hỏi ở ĐẦU thân mọi route, trước khi đọc thân yêu cầu (403 trước 400).
import { auditStatement } from "../audit";
import { ownerCompany } from "../parties";
import type { VehicleDocumentDto, VehicleDto, VehicleListResponse, VehicleResponse } from "../../shared/contracts";
import { TRANG_THAI_XE, soNgayConLai } from "../../shared/giay-to";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { addDays, vnToday } from "../../shared/vn-date";
import {
  chassisHolder, currentWarnDays, expiringVehicleDocuments, findVehicle, insertVehicleStatement, listVehicleDocuments, listVehicles, plateHolder,
  updateVehicleStatement, type VehicleDocRow, type VehicleRow,
} from "./repository";
import { CAU_BIEN_TRUNG, CAU_KHUNG_TRUNG, canhBaoXe, kiemSuaXe, kiemXeMoi, loiRangBuocXe, type CanhBaoXe, type XeNhap, type XeSua } from "./rules";

const FORBIDDEN = () => error(403, "forbidden", "Tài khoản này không quản lý được xe.");
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy xe.");
const STALE = () => error(409, "stale", "Xe vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
// R15 điểm 1, 3 (điều phối 2026-09-28): lớp ROUTE của biển số / số khung trùng — mã riêng; lớp CSDL (chỉ mục duy nhất) trả mã KHÁC (loiRangBuocXe).
const PLATE_TAKEN = () => error(409, "vehicle_plate_taken", CAU_BIEN_TRUNG);
const CHASSIS_TAKEN = () => error(409, "vehicle_chassis_taken", CAU_KHUNG_TRUNG);
const NO_OWNER = () => error(409, "no_owner_company", "Chưa có hồ sơ công ty chủ nên chưa thêm xe được. Báo người phụ trách hệ thống.");

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
  ],
};
