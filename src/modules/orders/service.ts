// Điều phối có I/O của module orders: dựng ngữ cảnh kiểm (danh mục hiệu lực + dịch vụ đã lưu của đơn) và bản xem đơn kèm
// trạng thái so với danh mục hiện tại. Luật thuần nằm ở rules.ts / service-rules.ts; SQL ở repository.ts.
import type { OrderDetailDto } from "../../shared/contracts";
import { describeBookerChange, type BookerInput } from "../../shared/booker";
import { vnToday } from "../../shared/vn-date";
import { auditStatement } from "../audit";
import { getEffectiveServices } from "../catalog";
import { composePersonName, newPersonStatements, validatePersonFullName, type ContactInput, type RoleInput } from "../parties";
import { chieuDiDau, doiNgayChang, tronChangCu } from "../../shared/chang-dua-don";
import { activeLocations, passengerRowsByOrders, type LegFields } from "./chang-hanh-khach-repo";
import { applyAdjustmentToOrder } from "./money-adjustment";
import { findOrder, getLatestAdjustment, getStoredServices, type BookerWrite, type LegOp, type StoredServiceRow } from "./repository";
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
 */
export async function loadOrderView(db: D1Database, id: string): Promise<OrderDetailDto | null> {
  const order = await findOrder(db, id);
  if (!order) return null;
  if (order.status === "draft") {
    const codes = order.services.flatMap((s) => (s.catalogCode ? [s.catalogCode] : []));
    const catalog = await getEffectiveServices(db, codes);
    return { ...order, services: order.services.map((s) => ({ ...s, catalogStatus: catalogStatusOf(s, s.catalogCode ? catalog.get(s.catalogCode) : undefined) })) };
  }
  const latest = await getLatestAdjustment(db, id);
  return latest ? applyAdjustmentToOrder(order, latest.after) : order;
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
