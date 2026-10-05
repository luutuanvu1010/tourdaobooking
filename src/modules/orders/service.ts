// Điều phối có I/O của module orders: dựng ngữ cảnh kiểm (danh mục hiệu lực + dịch vụ đã lưu của đơn) và bản xem đơn kèm
// trạng thái so với danh mục hiện tại. Luật thuần nằm ở rules.ts / service-rules.ts; SQL ở repository.ts.
import type { OrderDetailDto, PassengerDto, PassengerListResponse } from "../../shared/contracts";
import {
  dongHienHanh, keHoachHanhKhach, kiemDanhSachHanhKhach, kiemHanhKhach, moTaThayDoiKhach, soKhachDoan, vuotSoKhach, type DongHanhKhach, type KeHoach,
  type ThayDoiHanhKhach,
} from "../../shared/hanh-khach";
import { describeBookerChange, type BookerInput } from "../../shared/booker";
import { vnToday } from "../../shared/vn-date";
import { auditStatement } from "../audit";
import { datGapTheoVai } from "./dat-gap";
import { getEffectiveServices } from "../catalog";
import { composePersonName, newPersonStatements, validatePersonFullName, type ContactInput, type RoleInput } from "../parties";
import {
  MAX_CHANG_MOI_DICH_VU, chiDoiOPhu, chieuDiDau, docSoNguoiVe, doiNgayChang, isLyDoDongChang, kiemChang, moTaChang, tronChangCu, type ChangHopLe, type LyDoDongChang,
} from "../../shared/chang-dua-don";
import { tongKhach } from "../../shared/so-nguoi-chang";
import {
  activeLocations, legById, passengerRowsByOrders, servicePaxByIds, servicePaxByOrder, type LegFields, type OPhuGhi, type PassengerRow,
} from "./chang-hanh-khach-repo";
import { applyAdjustmentToOrder } from "./money-adjustment";
import {
  effectivePax, findOrder, getLatestAdjustment, getMeta, getStoredServices, type BookerWrite, type LegOp, type StoredLeg, type StoredServiceRow,
} from "./repository";
import type { ValidOrder } from "./rules";
import { catalogStatusOf, type ServiceContext, type ValidTrip } from "./service-rules";

/** `ServiceContext` kèm dịch vụ đã lưu ĐẦY ĐỦ (có `lines`) — route dùng lại cho kiểm "dịch vụ nhập tay đóng băng" (DK-T3-01) sau `validateOrder`. */
export interface OrderValidationContext extends ServiceContext {
  stored: readonly StoredServiceRow[];
}

/**
 * Ngữ cảnh cho `validateOrder`: toàn bộ danh mục hiệu lực (~vài chục dòng, kể cả dịch vụ đang ẩn — có cờ `visible`) và, khi SỬA một đơn,
 * các dịch vụ đã lưu của đơn đó (để giữ bản chụp cho nháp cũ, và để so "giữ nguyên" dịch vụ nhập tay cũ — `manualFreezeViolation`).
 */
export async function validationContext(db: D1Database, orderId: string | null): Promise<OrderValidationContext> {
  const [catalog, stored, paxRows] = await Promise.all([
    getEffectiveServices(db),
    orderId ? getStoredServices(db, orderId) : Promise.resolve([]),
    orderId ? passengerRowsByOrders(db, [orderId]) : Promise.resolve([]),
  ]);
  return {
    catalog,
    stored,
    // ADR-0047: chặng còn hiệu lực + ngày đi đang lưu (trộn thân cũ, dời ngày, kiểm id chặng); id hành khách đang lưu (đơn nháp: giữ id khi lưu lại).
    storedTrips: new Map(stored.map((s) => [s.id, { departDate: s.trip.departDate, legs: s.legs }] as const)),
    storedPassengerIds: new Set(paxRows.filter((p) => !p.voided).map((p) => p.id)),
    today: vnToday(new Date()),
  };
}

const sameFields = (a: LegFields, b: LegFields): boolean =>
  a.pickupDate === b.pickupDate && a.pickupTime === b.pickupTime && a.pickupLocationId === b.pickupLocationId && a.pickupPlace === b.pickupPlace &&
  a.dropoffLocationId === b.dropoffLocationId && a.dropoffPlace === b.dropoffPlace;
const fieldsOf = (l: LegFields): LegFields => ({
  pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace, dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace,
});

/**
 * `PUT /api/orders/:id/trip` (bảng "Sửa thông tin chuyến" CŨ — ADR-0047 R2c, R4e; THUẦN): với mỗi dịch vụ, dời chặng đang lưu theo ngày đi mới
 * (`doiNgayChang`), trộn hai khoá cũ CÓ MẶT vào chặng chiều đi đầu (`tronChangCu` — vắng thì không đụng), rồi so với chặng đang lưu ra danh sách thao tác:
 * sửa (trường vận hành đổi), thêm (chiều đi mới), ĐÓNG (giờ + nơi đều rỗng → lý do NOT_NEEDED — cả đơn nháp: không xoá ở đường này). Trả `trip` mới với
 * `pickupTime`/`pickupPlace` = DẪN XUẤT sau khi trộn (ghi kép R3 + so nhật ký "trước → sau").
 */
export function keHoachChangTrip(
  stored: readonly StoredServiceRow[],
  updates: readonly { id: string; trip: ValidTrip; cu: { pickupTime?: string | null; pickupPlace?: string | null } }[],
): { updates: { id: string; trip: ValidTrip }[]; ops: LegOp[] } {
  const ops: LegOp[] = [];
  const out = updates.map((u) => {
    const st = stored.find((s) => s.id === u.id)!;
    const merged = tronChangCu(doiNgayChang(st.legs, st.trip.departDate, u.trip.departDate), u.cu, u.trip.departDate);
    for (const l of merged.legs) {
      if (l.id === null) ops.push({ kind: "insert", serviceId: u.id, leg: l });
      else if (!sameFields(st.legs.find((x) => x.id === l.id)!, l)) ops.push({ kind: "update", legId: l.id, fields: fieldsOf(l) });
    }
    if (merged.boChieuDi) ops.push({ kind: "close", legId: merged.boChieuDi, reason: "NOT_NEEDED" });
    const labelled = merged.legs.map((l) => {
      const old = l.id === null ? undefined : st.legs.find((x) => x.id === l.id);
      return { id: l.id ?? "", direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLabel: l.pickupLocationId ? (old?.pickupLabel ?? "") : l.pickupPlace! };
    });
    return { id: u.id, trip: { ...u.trip, ...chieuDiDau(labelled) } };
  });
  return { updates: out, ops };
}

// ---- Route chặng SAU XÁC NHẬN (ADR-0047 A1; Ruling R1) — lập kế hoạch ghi (có I/O đọc), repository ghi --------------------------------------------

type Pickup = { pickupTime: string | null; pickupPlace: string | null };
type Failed = { ok: false; code: "invalid_input" | "leg_not_found" | "leg_closed"; message: string };

/** Nhãn nơi đón/trả của một chặng (tên điểm danh mục theo `names`, hoặc chữ). */
function noiCua(l: LegFields, names: ReadonlyMap<string, string>): { noiDon: string; noiTra: string | null } {
  return {
    noiDon: l.pickupLocationId ? (names.get(l.pickupLocationId) ?? "") : (l.pickupPlace ?? ""),
    noiTra: l.dropoffLocationId ? (names.get(l.dropoffLocationId) ?? null) : l.dropoffPlace,
  };
}
const moTaVao = (
  l: LegFields & { direction: "OUT" | "RETURN"; flightCode?: string | null; paxOverride?: number | null; exclusiveVehicle?: boolean; minVehicleSeats?: number | null },
  names: ReadonlyMap<string, string>,
) =>
  ({
    direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, ...noiCua(l, names), soHieu: l.flightCode ?? null, soNguoiVe: l.paxOverride ?? null,
    xeRieng: l.exclusiveVehicle ?? false, choToiThieu: l.minVehicleSeats ?? null,
  });

/** Số khách HIỆU LỰC của một dịch vụ (L-R1 — ADR-0054 D10.3): `effectivePax` (một nguồn với `soKhachHieuLuc`, bài học Đợt E). */
async function soKhachDichVu(db: D1Database, serviceId: string): Promise<number> {
  const p = (await effectivePax(db, await servicePaxByIds(db, [serviceId]))).get(serviceId);
  return p ? tongKhach(p) : 0;
}
/** L-R1: số người chiều về MỚI / ĐỔI vượt số khách hiệu lực của dịch vụ → câu lỗi; null = đạt. */
const vuotLR1 = (so: number | null, soKhach: number): string | null =>
  so !== null && so > soKhach ? `Số người chiều về (${so}) không được nhiều hơn số khách của dịch vụ (${soKhach}).` : null;

/** Tên điểm đã biết từ chặng đang lưu của dịch vụ + điểm ĐANG DÙNG của những id mới (R7). Thiếu một id mới → lỗi. */
async function tenDiem(db: D1Database, stored: readonly StoredLeg[], ids: readonly (string | null)[], keep: ReadonlySet<string>): Promise<{ ok: true; names: Map<string, string> } | Failed> {
  const names = new Map<string, string>();
  for (const l of stored) {
    if (l.pickupLocationId) names.set(l.pickupLocationId, l.pickupLabel);
    if (l.dropoffLocationId && l.dropoffLabel !== null) names.set(l.dropoffLocationId, l.dropoffLabel);
  }
  const need = ids.filter((x): x is string => x !== null && !keep.has(x));
  const active = await activeLocations(db, need);
  for (const x of need) if (!active.has(x)) return { ok: false, code: "invalid_input", message: "Nơi đón / nơi trả: điểm đã chọn không còn dùng được — hãy chọn lại điểm khác hoặc gõ nơi đón." };
  for (const [k, v] of active) names.set(k, v);
  return { ok: true, names };
}

/** Dẫn xuất hai khoá cũ của dịch vụ sau khi thay tập chặng mở (ghi kép R3). */
const dauSau = (legs: readonly (LegFields & { id: string; direction: "OUT" | "RETURN" })[], names: ReadonlyMap<string, string>): Pickup =>
  chieuDiDau(legs.map((l) => ({ id: l.id, direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLabel: noiCua(l, names).noiDon })));

const expectedOf = (body: Record<string, unknown> | null): string | null =>
  body && typeof body.expectedUpdatedAt === "string" && body.expectedUpdatedAt ? body.expectedUpdatedAt : null;

export interface AddLegPlan { serviceId: string; leg: ChangHopLe; expected: string; detail: string; mirror: Pickup }
/** `POST /api/orders/:id/legs` — kiểm thân `{ expectedUpdatedAt (của đơn), serviceId, leg }`, trần chặng, điểm đang dùng; dựng nhật ký + dẫn xuất mới. */
export async function planAddLeg(db: D1Database, orderId: string, body: Record<string, unknown> | null, today: string): Promise<{ ok: true; value: AddLegPlan } | Failed> {
  const expected = expectedOf(body);
  if (!expected) return { ok: false, code: "invalid_input", message: "Thiếu expectedUpdatedAt (mốc cập nhật của đơn mà trang đã đọc)." };
  const stored = await getStoredServices(db, orderId);
  const svc = typeof body!.serviceId === "string" ? stored.find((s) => s.id === body!.serviceId) : undefined;
  if (!svc) return { ok: false, code: "invalid_input", message: "Dịch vụ không thuộc đơn này — hãy tải lại trang." };
  if (svc.legs.length >= MAX_CHANG_MOI_DICH_VU) return { ok: false, code: "invalid_input", message: `Mỗi dịch vụ tối đa ${MAX_CHANG_MOI_DICH_VU} chặng đưa đón.` };
  const raw = body!.leg && typeof body!.leg === "object" && !Array.isArray(body!.leg) ? { ...(body!.leg as Record<string, unknown>), id: undefined } : body!.leg;
  const k = kiemChang(raw, { at: "Chặng đưa đón", departDate: svc.trip.departDate, today });
  if (!k.ok) return { ok: false, code: "invalid_input", message: k.message };
  const named = await tenDiem(db, svc.legs, [k.value.pickupLocationId, k.value.dropoffLocationId], new Set());
  if (!named.ok) return named;
  // L-R1 (ADR-0054 D10.3): chặng mới có số người chiều về → ≤ số khách hiệu lực của dịch vụ.
  if (k.value.paxOverride != null) {
    const vuot = vuotLR1(k.value.paxOverride, await soKhachDichVu(db, svc.id));
    if (vuot) return { ok: false, code: "invalid_input", message: vuot };
  }
  const detail = moTaChang(svc.name, null, moTaVao(k.value, named.names))!;
  const mirror = dauSau([...svc.legs, { ...k.value, id: "~moi" }], named.names);
  return { ok: true, value: { serviceId: svc.id, leg: k.value, expected, detail, mirror } };
}

export interface EditLegPlan {
  legId: string;
  serviceId: string;
  fields: LegFields;
  expected: string;
  detail: string | null;
  mirror: Pickup;
  /** Ngày / giờ đón ĐANG LƯU — xét "sửa dưới mốc" theo min(giờ cũ, giờ mới) (ADR-0049 I14). */
  cu: { pickupDate: string | null; pickupTime: string | null };
  /** Các ô phụ sẽ ghi (số hiệu, số người về, xe riêng, số chỗ tối thiểu) — CHỈ khoá có trong thân (vắng = giữ). */
  oPhu: OPhuGhi;
  /** Ngày, giờ, nơi đón, nơi trả y nguyên (`chiDoiOPhu`) — route không xét mốc, giữ dấu đặt gấp nếu thân không có `datGap` (chủ Q-B 1/10). */
  chiOPhu: boolean;
}
/** `PUT /api/orders/:id/legs/:legId` — thân `{ expectedUpdatedAt (của CHẶNG), leg }`; không đổi chiều; điểm mới phải đang dùng; ngày đón đổi không được đã qua. */
export async function planEditLeg(db: D1Database, orderId: string, legId: string, body: Record<string, unknown> | null, today: string): Promise<{ ok: true; value: EditLegPlan } | Failed> {
  const row = await legById(db, legId, orderId);
  if (!row) return { ok: false, code: "leg_not_found", message: "Không tìm thấy chặng đưa đón của đơn này." };
  if (row.closed_at !== null) return { ok: false, code: "leg_closed", message: "Chặng đưa đón này đã bỏ — không sửa được." };
  const expected = expectedOf(body);
  if (!expected) return { ok: false, code: "invalid_input", message: "Thiếu expectedUpdatedAt (mốc cập nhật của chặng mà trang đã đọc)." };
  const svc = (await getStoredServices(db, orderId)).find((s) => s.id === row.order_service_id)!;
  const old = svc.legs.find((l) => l.id === legId)!;
  const raw = body!.leg && typeof body!.leg === "object" && !Array.isArray(body!.leg) ? { ...(body!.leg as Record<string, unknown>), id: undefined } : body!.leg;
  const k = kiemChang(raw, { at: "Chặng đưa đón", departDate: svc.trip.departDate, direction: old.direction, today, ngayCu: old.pickupDate });
  if (!k.ok) return { ok: false, code: "invalid_input", message: k.message };
  const keep = new Set([old.pickupLocationId, old.dropoffLocationId].filter((x): x is string => x !== null));
  const named = await tenDiem(db, svc.legs, [k.value.pickupLocationId, k.value.dropoffLocationId], keep);
  if (!named.ok) return named;
  const fields: LegFields = {
    pickupDate: k.value.pickupDate, pickupTime: k.value.pickupTime, pickupLocationId: k.value.pickupLocationId, pickupPlace: k.value.pickupPlace,
    dropoffLocationId: k.value.dropoffLocationId, dropoffPlace: k.value.dropoffPlace,
  };
  const oPhu: OPhuGhi = {
    ...(k.value.flightCode !== undefined ? { flightCode: k.value.flightCode } : {}),
    ...(k.value.paxOverride !== undefined ? { paxOverride: k.value.paxOverride } : {}),
    ...(k.value.exclusiveVehicle !== undefined ? { exclusiveVehicle: k.value.exclusiveVehicle } : {}),
    ...(k.value.minVehicleSeats !== undefined ? { minVehicleSeats: k.value.minVehicleSeats } : {}),
  };
  // L-R1 CHỈ cho giá trị MỚI / ĐỔI (TC-P10): so số khách HIỆU LỰC (có điều chỉnh) của dịch vụ.
  if (oPhu.paxOverride != null && oPhu.paxOverride !== old.paxOverride) {
    const vuot = vuotLR1(oPhu.paxOverride, await soKhachDichVu(db, svc.id));
    if (vuot) return { ok: false, code: "invalid_input", message: vuot };
  }
  const sau = { ...fields, direction: old.direction, flightCode: oPhu.flightCode !== undefined ? oPhu.flightCode : old.flightCode, paxOverride: oPhu.paxOverride !== undefined ? oPhu.paxOverride : old.paxOverride,
    exclusiveVehicle: oPhu.exclusiveVehicle !== undefined ? oPhu.exclusiveVehicle : old.exclusiveVehicle, minVehicleSeats: oPhu.minVehicleSeats !== undefined ? oPhu.minVehicleSeats : old.minVehicleSeats };
  const detail = moTaChang(svc.name, moTaVao(old, named.names), moTaVao(sau, named.names));
  const mirror = dauSau(svc.legs.map((l) => (l.id === legId ? { ...l, ...fields } : l)), named.names);
  return {
    ok: true,
    value: { legId, serviceId: svc.id, fields, expected, detail, mirror, cu: { pickupDate: old.pickupDate, pickupTime: old.pickupTime }, oPhu, chiOPhu: chiDoiOPhu(old, fields) },
  };
}

export interface PaxNhapPlan { legId: string; serviceId: string; paxOverride: number | null; expected: string; detail: string | null; mirror: Pickup }
/**
 * NHÁNH NHÁP của `PUT /api/orders/:id/legs/:legId` (ADR-0054 D10.3 "đường mới cho đơn nháp"; kế hoạch ô mới Task 3.5): thân CHỈ `{ expectedUpdatedAt (của CHẶNG),
 * paxOverride }` (route đã kiểm tập khoá). Chặng phải là chiều VỀ còn mở; L-R1 cho giá trị mới / đổi; `detail` null = không đổi gì. Ghi kép hai cột cũ không đổi.
 */
export async function planPaxOverrideNhap(db: D1Database, orderId: string, legId: string, body: Record<string, unknown>): Promise<{ ok: true; value: PaxNhapPlan } | Failed> {
  const row = await legById(db, legId, orderId);
  if (!row) return { ok: false, code: "leg_not_found", message: "Không tìm thấy chặng đưa đón của đơn này." };
  if (row.closed_at !== null) return { ok: false, code: "leg_closed", message: "Chặng đưa đón này đã bỏ — không sửa được." };
  const expected = expectedOf(body);
  if (!expected) return { ok: false, code: "invalid_input", message: "Thiếu expectedUpdatedAt (mốc cập nhật của chặng mà trang đã đọc)." };
  if (row.direction !== "RETURN") return { ok: false, code: "invalid_input", message: "Chặng đưa đón: chỉ chiều về mới có số người chiều về riêng." };
  const p = docSoNguoiVe(body.paxOverride, "RETURN", "Chặng đưa đón");
  if (!p.ok) return { ok: false, code: "invalid_input", message: p.message };
  const svc = (await getStoredServices(db, orderId)).find((s) => s.id === row.order_service_id)!;
  const old = svc.legs.find((l) => l.id === legId)!;
  if (p.value !== null && p.value !== old.paxOverride) {
    const vuot = vuotLR1(p.value, await soKhachDichVu(db, svc.id));
    if (vuot) return { ok: false, code: "invalid_input", message: vuot };
  }
  const names = new Map<string, string>();
  for (const l of svc.legs) {
    if (l.pickupLocationId) names.set(l.pickupLocationId, l.pickupLabel);
    if (l.dropoffLocationId && l.dropoffLabel !== null) names.set(l.dropoffLocationId, l.dropoffLabel);
  }
  const detail = moTaChang(svc.name, moTaVao(old, names), moTaVao({ ...old, paxOverride: p.value }, names));
  return { ok: true, value: { legId, serviceId: svc.id, paxOverride: p.value, expected, detail, mirror: dauSau(svc.legs, names) } };
}

export interface CloseLegPlan { legId: string; serviceId: string; reason: LyDoDongChang; expected: string; detail: string; mirror: Pickup }
/** `POST /api/orders/:id/legs/:legId/close` — thân `{ expectedUpdatedAt (của CHẶNG), reasonCode }`; lý do thuộc danh sách đóng ở mã (R6). */
export async function planCloseLeg(db: D1Database, orderId: string, legId: string, body: Record<string, unknown> | null): Promise<{ ok: true; value: CloseLegPlan } | Failed> {
  const row = await legById(db, legId, orderId);
  if (!row) return { ok: false, code: "leg_not_found", message: "Không tìm thấy chặng đưa đón của đơn này." };
  if (row.closed_at !== null) return { ok: false, code: "leg_closed", message: "Chặng đưa đón này đã bỏ rồi." };
  const expected = expectedOf(body);
  if (!expected) return { ok: false, code: "invalid_input", message: "Thiếu expectedUpdatedAt (mốc cập nhật của chặng mà trang đã đọc)." };
  if (!isLyDoDongChang(body!.reasonCode)) return { ok: false, code: "invalid_input", message: "Cần chọn lý do bỏ chặng đưa đón." };
  const svc = (await getStoredServices(db, orderId)).find((s) => s.id === row.order_service_id)!;
  const old = svc.legs.find((l) => l.id === legId)!;
  const names = new Map<string, string>();
  for (const l of svc.legs) {
    if (l.pickupLocationId) names.set(l.pickupLocationId, l.pickupLabel);
    if (l.dropoffLocationId && l.dropoffLabel !== null) names.set(l.dropoffLocationId, l.dropoffLabel);
  }
  const detail = moTaChang(svc.name, moTaVao(old, names), null, body!.reasonCode)!;
  const mirror = dauSau(svc.legs.filter((l) => l.id !== legId), names);
  return { ok: true, value: { legId, serviceId: svc.id, reason: body!.reasonCode, expected, detail, mirror } };
}

// ---- Danh sách hành khách (ADR-0047 A2) ---------------------------------------------------------------------------------------------------------

const toDong = (r: PassengerRow): DongHanhKhach => ({
  id: r.id, personKey: r.person_key, previousId: r.previous_id, voided: r.voided === 1, fullName: r.ten, birthYear: r.birth_year, paxCode: r.pax_code, updatedAt: r.updated_at,
});

/**
 * `GET/POST /api/orders/:id/passengers` — CHỈ dòng hiện hành (giả định G3: tên cũ không hiện), mỗi người dựng TỪNG khoá; cờ "danh sách nhiều hơn số khách"
 * so với số khách HIỆU LỰC của dịch vụ đông nhất (R9, G4 — `effectivePax`, một nguồn với danh sách đơn). Chỉ là cờ, không tự tăng số khách (N7).
 */
export async function passengerList(db: D1Database, orderId: string): Promise<PassengerListResponse> {
  const [rows, paxRows, meta] = await Promise.all([passengerRowsByOrders(db, [orderId]), servicePaxByOrder(db, orderId), getMeta(db, orderId)]);
  const passengers = dongHienHanh(rows.map(toDong)).map((p): PassengerDto => ({ personKey: p.personKey, rowId: p.id, fullName: p.fullName, birthYear: p.birthYear, paxCode: p.paxCode, updatedAt: p.updatedAt }));
  const soKhach = soKhachDoan([...(await effectivePax(db, paxRows)).values()]);
  return { passengers, soNguoiCoTen: passengers.length, soKhachDoan: soKhach, vuotSoKhach: vuotSoKhach(passengers.length, soKhach), orderUpdatedAt: meta?.updatedAt ?? "" };
}

export interface PassengerChangePlan { expected: string; chen: KeHoach["chen"]; huy: KeHoach["huy"]; detail: string; none: boolean }
/**
 * `POST /api/orders/:id/passengers` (đơn ĐÃ XÁC NHẬN — R1): thân `{ expectedUpdatedAt (của đơn), them: [...], sua: [{ personKey, ... }], huy: [personKey] }`.
 * Kiểm từng người (`kiemHanhKhach`), lập kế hoạch chỉ-thêm (`keHoachHanhKhach` — R8). `none` = không có gì để ghi (sửa y nguyên).
 */
export async function planPassengerChange(db: D1Database, orderId: string, body: Record<string, unknown> | null, today: string): Promise<{ ok: true; value: PassengerChangePlan } | { ok: false; message: string }> {
  const expected = expectedOf(body);
  if (!expected) return { ok: false, message: "Thiếu expectedUpdatedAt (mốc cập nhật của đơn mà trang đã đọc)." };
  const b = body!;
  const them = kiemDanhSachHanhKhach(b.them ?? [], today, "Khách thêm");
  if (!them.ok) return them;
  if (!Array.isArray(b.sua ?? [])) return { ok: false, message: "Danh sách khách cần sửa không hợp lệ." };
  const sua: ThayDoiHanhKhach["sua"] = [];
  for (const [i, raw] of ((b.sua ?? []) as unknown[]).entries()) {
    const personKey = raw && typeof raw === "object" ? (raw as Record<string, unknown>).personKey : undefined;
    if (typeof personKey !== "string" || !personKey) return { ok: false, message: `Khách sửa ${i + 1}: thiếu mã người (personKey).` };
    const k = kiemHanhKhach({ ...(raw as Record<string, unknown>), id: undefined }, { at: `Khách sửa ${i + 1}`, today });
    if (!k.ok) return k;
    sua.push({ personKey, fullName: k.value.fullName, birthYear: k.value.birthYear, paxCode: k.value.paxCode });
  }
  const huy = b.huy ?? [];
  if (!Array.isArray(huy) || !huy.every((x) => typeof x === "string" && x)) return { ok: false, message: "Danh sách khách cần huỷ không hợp lệ." };
  const rows = (await passengerRowsByOrders(db, [orderId])).map(toDong);
  const plan = keHoachHanhKhach(rows, { them: them.value.map((t) => ({ ...t, id: null })), sua, huy: huy as string[] }, () => crypto.randomUUID());
  if (!plan.ok) return plan;
  const none = plan.value.chen.length === 0 && plan.value.huy.length === 0;
  return { ok: true, value: { expected, chen: plan.value.chen, huy: plan.value.huy, detail: moTaThayDoiKhach(plan.value.dem), none } };
}

/**
 * ADR-0047 A1, Ruling R7 (có I/O): điểm danh mục ở nơi đón/nơi trả của chặng phải ĐANG DÙNG (`v_loc_location_label`, mọi loại điểm) — TRỪ chặng đang lưu
 * giữ nguyên điểm cũ (điểm đã ngừng sau khi lưu không chặn lần lưu sau). Xong thì đặt `trip.pickupTime/pickupPlace` = DẪN XUẤT (`chieuDiDau`, nơi = tên điểm
 * hoặc chữ) — nguồn của GHI KÉP hai cột cũ (Ruling R3) và của nhật ký. Trả đơn mới (không sửa đầu vào).
 */
export async function resolveLegPlaces(db: D1Database, order: ValidOrder, ctx: OrderValidationContext): Promise<{ ok: true; value: ValidOrder } | { ok: false; message: string }> {
  const known = new Map<string, string>();
  const kept = new Set<string>();
  for (const s of ctx.stored) {
    for (const l of s.legs) {
      if (l.pickupLocationId) {
        known.set(l.pickupLocationId, l.pickupLabel);
        kept.add(`${l.id}|p|${l.pickupLocationId}`);
      }
      if (l.dropoffLocationId && l.dropoffLabel !== null) {
        known.set(l.dropoffLocationId, l.dropoffLabel);
        kept.add(`${l.id}|d|${l.dropoffLocationId}`);
      }
    }
  }
  const need = new Set<string>();
  for (const s of order.services) {
    for (const l of s.legs) {
      if (l.pickupLocationId && !kept.has(`${l.id}|p|${l.pickupLocationId}`)) need.add(l.pickupLocationId);
      if (l.dropoffLocationId && !kept.has(`${l.id}|d|${l.dropoffLocationId}`)) need.add(l.dropoffLocationId);
    }
  }
  const active = await activeLocations(db, [...need]);
  for (const id of need) if (!active.has(id)) return { ok: false, message: "Nơi đón / nơi trả: điểm đã chọn không còn dùng được — hãy chọn lại điểm khác hoặc gõ nơi đón." };
  for (const [id, name] of active) known.set(id, name);
  const services = order.services.map((s) => {
    const labelled = s.legs.map((l) => ({ id: l.id ?? "", direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLabel: l.pickupLocationId ? known.get(l.pickupLocationId)! : l.pickupPlace! }));
    return { ...s, trip: { ...s.trip, ...chieuDiDau(labelled) } };
  });
  return { ok: true, value: { ...order, services } };
}

/**
 * Đơn đầy đủ; với đơn NHÁP điền thêm `catalogStatus` (giá danh mục đã đổi / dịch vụ đã ẩn) để người sửa biết; với đơn ĐÃ XÁC NHẬN HOẶC ĐÃ HUỶ có
 * dòng điều chỉnh (ADR-0014 điều 6, Phase B), overlay SỐ HIỆN HÀNH (gốc + điều chỉnh gần nhất) — chủ dự án đã chọn: màn hình chính hiện số mới, số
 * gốc xem qua lịch sử đơn (`order.history.view`, đã có). KHÔNG đổi gì trong CSDL ở đây, chỉ dựng lại DTO trả về.
 * CỐ Ý áp cho CẢ đơn đã huỷ (không chỉ đã xác nhận): huỷ đơn (điều 11) không đổi cột tiền, chỉ đổi `status`, nên một đơn từng được sửa số khách
 * rồi bị huỷ sau đó VẪN phải hiện đúng số đã sửa gần nhất — không được "quên" điều chỉnh và lùi lại số gốc chỉ vì đổi trạng thái (bản đầu có lỗi
 * này: chỉ overlay khi `status === "confirmed"`, khiến đơn đã huỷ hiện sai). `draft` không cần xét: không đường nào ghi được điều chỉnh cho đơn
 * nháp (route sửa số khách bắt buộc `status === "confirmed"`), và đơn không có đường quay lại `draft` sau khi đã `confirmed` (`rules.ts` TRANSITIONS).
 * `xemDuDatGap` BẮT BUỘC (chủ H4 / N-14): người gọi hỏi ô `order.leg.short_notice.view` của người xem — thiếu thì mã không biên dịch; mọi DTO chặng trả ra
 * đi qua `datGapTheoVai`.
 */
export async function loadOrderView(db: D1Database, id: string, xemDuDatGap: boolean): Promise<OrderDetailDto | null> {
  const order = await findOrder(db, id);
  if (!order) return null;
  if (order.status === "draft") {
    const codes = order.services.flatMap((s) => (s.catalogCode ? [s.catalogCode] : []));
    const catalog = await getEffectiveServices(db, codes);
    return datGapTheoVai(
      { ...order, services: order.services.map((s) => ({ ...s, catalogStatus: catalogStatusOf(s, s.catalogCode ? catalog.get(s.catalogCode) : undefined) })) },
      xemDuDatGap,
    );
  }
  const latest = await getLatestAdjustment(db, id);
  return datGapTheoVai(latest ? applyAdjustmentToOrder(order, latest.after) : order, xemDuDatGap);
}

export type ResolvedBooker = { ok: true; write: BookerWrite } | { ok: false; message: string };

/**
 * Người đặt đã kiểm dạng → câu ghi. Hồ sơ có sẵn phải là CÁ NHÂN ĐANG HOẠT ĐỘNG (view công bố `v_pty_party_label`). Hồ sơ mới: cá nhân + SĐT chính +
 * vai CUSTOMER bằng câu của `parties`, CÙNG batch với đơn — ADR-0011 điều 1 (ngoại lệ hẹp của ADR-0007: chỉ hồ sơ MỚI, chỉ CUSTOMER). `current` = người đặt
 * đang lưu trên đơn (để viết mẩu nhật ký "từ A sang B"; tạo đơn = không có).
 */
export async function resolveBooker(
  db: D1Database,
  booker: BookerInput,
  staffId: string,
  now: Date,
  current: { id: string | null; name: string | null } = { id: null, name: null },
): Promise<ResolvedBooker> {
  if (booker.kind === "none") return { ok: true, write: { partyId: null, before: [], note: describeBookerChange(current, { id: null, name: null }) } };
  if (booker.kind === "existing") {
    const row = await db
      .prepare("SELECT display_name, party_kind, active FROM v_pty_party_label WHERE id = ?")
      .bind(booker.partyId)
      .first<{ display_name: string; party_kind: "PERSON" | "ORGANIZATION"; active: number }>();
    if (!row || row.active !== 1) return { ok: false, message: "Hồ sơ khách không còn dùng được, hãy chọn lại." };
    if (row.party_kind !== "PERSON") return { ok: false, message: "Chưa gắn được đại lý vào đơn ở bản này." };
    return { ok: true, write: { partyId: booker.partyId, before: [], note: describeBookerChange(current, { id: booker.partyId, name: row.display_name }) } };
  }
  const name = validatePersonFullName(booker.fullName);
  if (!name.ok) return { ok: false, message: name.message };
  const at = now.toISOString();
  const today = vnToday(now);
  const phone: ContactInput = { kind: "PHONE", value: booker.phone, valueNormalized: booker.phone, label: null, isPrimary: true };
  const role: RoleInput = { roleTypeCode: "CUSTOMER", locationId: null, from: today, to: null };
  const made = newPersonStatements(db, { name: name.value, contacts: [phone], roles: [role], contactsFrom: today }, staffId, at);
  const display = composePersonName(name.value);
  // Nhật ký của hồ sơ: như POST /api/parties (loại + tên), KHÔNG SĐT.
  const log = auditStatement(db, { staffId, action: "party_created", at, targetType: "party", targetId: made.partyId, detail: `cá nhân "${display}" (tạo khi lập/sửa đơn)` });
  return { ok: true, write: { partyId: made.partyId, before: [...made.statements, log], note: describeBookerChange(current, { id: made.partyId, name: display }) } };
}
