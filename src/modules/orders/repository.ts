import { auditStatement, type AuditAction } from "../audit";
import { LY_DO_DAT_GAP, chieuDiDau, isLyDoDatGap, xepChang, type ChangDaLuu, type ChangHopLe, type LyDoDongChang } from "../../shared/chang-dua-don";
import type { LegDto, OrderDetailDto, OrderDto, OrderItemDto, OrderServiceDto, OrderSummaryDto, OrderSummaryTripDto } from "../../shared/contracts";
import { escapeLike } from "../../shared/http";
import { moTaDanhSachNhap, type HanhKhachHopLe } from "../../shared/hanh-khach";
import {
  legCloseChecked, legCloseGuarded, legDeleteDraft, legFillDateOnConfirm, legInsert, legInsertGuarded, legUpdateChecked, legUpdateGuarded, openLegsByOrders,
  openLegsStatement, orderConfirm, orderTouch, orderTouchGuarded, passengerDeleteDraft, passengerInsert, passengerInsertGuarded, passengerVoidGuarded,
  serviceMirrorUpdateGuarded, type DatGapWrite, type LegFields, type LegRow, type LegWrite, type PassengerWrite, type ServicePaxRow,
} from "./chang-hanh-khach-repo";
import type { LocDon } from "../../shared/loc-don";
import type { PaxCode, PaxCounts } from "../../shared/order-lines";
import { addDays, vnLocalToIso, vnToday } from "../../shared/vn-date";
import { effectiveMoney, effectiveSubtotal, isAdjustmentSeqCollision, parseAdjustmentAfter, type AdjustmentEntry, type SubtotalServiceInput } from "./money-adjustment";
import type { PoolSourceOrder, PoolSourceService } from "./pool";
import type { FrozenLine } from "./price-guards";
import { orderCodePrefix, type DepositMethod, type OrderStatus, type ValidOrder } from "./rules";
import { confirmWindow, summarizeDeviations, type StoredService, type ValidService, type ValidTrip } from "./service-rules";

interface OrderRow {
  id: string;
  order_code: string;
  staff_id: string;
  staff_name: string;
  booker_party_id: string | null;
  booker_name: string | null;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_note: string | null;
  subtotal: number;
  discount: number;
  total: number;
  deposit_amount: number;
  deposit_method: DepositMethod | null;
  remaining_amount: number;
  payment_note: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
}

interface ServiceRow {
  id: string;
  catalog_code: string | null;
  name: string;
  unit: string;
  pax_adult: number;
  pax_child: number;
  pax_senior: number;
  pax_infant: number;
  depart_date: string | null;
  depart_time: string | null;
  checkin_date: string | null;
  checkin_time: string | null;
  checkin_place: string | null;
  note: string | null;
}

interface ItemRow {
  id: string;
  service_id: string | null;
  catalog_code: string | null;
  pax_code: PaxCode | null;
  description: string;
  detail: string | null;
  quantity: number;
  unit_price: number;
  catalog_price: number | null;
  line_total: number;
}

const ORDER_SELECT = `SELECT o.*, s.label AS staff_name, b.display_name AS booker_name FROM orders o
  JOIN v_stf_staff_label s ON s.id = o.staff_id LEFT JOIN v_pty_party_label b ON b.id = o.booker_party_id`;
// ADR-0047 (Ruling R2a): KHÔNG đọc `pickup_time`/`pickup_place` của order_service nữa — hai khoá đó dẫn xuất từ chặng (`chieuDiDau`); cột cũ chỉ còn
// được GHI KÉP ở phát hành 1 (R3).
const SERVICE_SELECT = `SELECT id, catalog_code, name, unit, pax_adult, pax_child, pax_senior, pax_infant, depart_date, depart_time,
  checkin_date, checkin_time, checkin_place, note FROM order_service WHERE order_id = ? ORDER BY sort_order`;
const ITEM_SELECT = `SELECT id, service_id, catalog_code, pax_code, description, detail, quantity, unit_price, catalog_price, line_total FROM order_item WHERE order_id = ? ORDER BY sort_order`;

export interface ServiceSummaryRow {
  id: string;
  order_id: string;
  name: string;
  sort_order: number;
  pax_adult: number;
  pax_child: number;
  pax_senior: number;
  pax_infant: number;
  depart_date: string | null;
  pickup_time: string | null;
  pickup_place: string | null;
}

export interface ServiceSummary {
  serviceNames: string[];
  pax: PaxCounts;
  trip: OrderSummaryTripDto;
}

/** Đơn chưa có dòng order_service nào (không nên xảy ra do rules.ts chặn tạo đơn rỗng, nhưng vẫn cần giá trị mặc định an toàn).
 * MỘT HÀM TẠO mới mỗi lần gọi — KHÔNG dùng hằng đối tượng cấp module: Worker isolate sống lâu qua nhiều request, một hằng dùng chung
 * theo tham chiếu sẽ bị sửa "dính" nếu có chỗ nào lỡ tay đổi trường của nó (dù hiện tại không có, vẫn là bẫy khi sửa code sau này). */
function emptySummary(): ServiceSummary {
  return {
    serviceNames: [],
    pax: { adult: 0, child: 0, senior: 0, infant: 0 },
    trip: { departDate: null, pickupTime: null, pickupPlace: null },
  };
}

/**
 * Gộp các dòng order_service thành tóm tắt cho từng đơn, dùng cho thẻ ở danh sách đơn (đặc tả §7).
 * ĐÒI HỎI `rows` đã sắp theo (order_id, sort_order) — dòng đầu gặp của mỗi order_id quyết định `trip`
 * (dịch vụ có sort_order nhỏ nhất, cùng quy ước với SERVICE_SELECT đã dùng ở tệp này). `pax` cộng dồn TẤT CẢ dịch vụ của đơn.
 * Thuần, không đụng DB — test độc lập ở repository.test.ts.
 */
export function summarizeServices(rows: readonly ServiceSummaryRow[]): Map<string, ServiceSummary> {
  const out = new Map<string, ServiceSummary>();
  for (const r of rows) {
    let s = out.get(r.order_id);
    if (!s) {
      s = { serviceNames: [], pax: { adult: 0, child: 0, senior: 0, infant: 0 }, trip: { departDate: r.depart_date, pickupTime: r.pickup_time, pickupPlace: r.pickup_place } };
      out.set(r.order_id, s);
    }
    s.serviceNames.push(r.name);
    s.pax = { adult: s.pax.adult + r.pax_adult, child: s.pax.child + r.pax_child, senior: s.pax.senior + r.pax_senior, infant: s.pax.infant + r.pax_infant };
  }
  return out;
}

/**
 * Ghi đè pax_* của các dòng dịch vụ có mặt trong `afterByOrder` (dòng điều chỉnh gần nhất của ĐÚNG đơn đó, ADR-0014 điều 6 Phase B) bằng số khách
 * MỚI, TRƯỚC KHI gộp bằng `summarizeServices` — CÙNG kỹ thuật đang dùng cho chi tiết một đơn (`money-adjustment.ts:applyAdjustmentToOrder`, dùng
 * `after.pax` thẳng không qua `recomputeService` vì `recomputeService` cũng chỉ trả lại đúng `pax` đầu vào, không biến đổi gì), áp cho TÓM TẮT
 * nhiều đơn (đặc tả Đợt E — bài học: bản trước chỉ ghi đè TIỀN ở `toSummaryDtos`, quên ghi đè SỐ KHÁCH, hai con số cạnh nhau trên một thẻ lệch
 * nhau vì `order_service.pax_*` bị trigger `order_service_frozen_update` (0008) đóng băng sau khi đơn không còn nháp — CHỦ ĐÍCH, không đổi).
 * Dịch vụ KHÔNG có mặt trong `after` của đơn nó thuộc về (nhập tay — `editMoneyAsHandler` chỉ xét dịch vụ từ danh mục —, hoặc đơn chưa có khoá
 * trong `afterByOrder` = chưa có điều chỉnh nào) giữ NGUYÊN số đã lưu ở `order_service`. `afterByOrder` đến từ `getLatestAdjustments`, đã đi qua
 * `money-adjustment.ts:parseAdjustmentAfter` (MỘT hàm phân tích duy nhất, dùng chung với đường chi tiết một đơn — sửa Lỗi 1/2 kiểm độc lập Đợt E
 * vòng 2) nên MỌI phần tử ở đây đã đảm bảo `pax` hợp lệ (`isPaxCounts`) — hàm này không cần (và không nên) tự kiểm lại, tự kiểm lại là đúng kiểu
 * "hai luật khác nhau ở hai nơi" đã gây ra Lỗi 1. Thuần, không đụng DB — test độc lập ở repository.test.ts.
 */
export function applyAdjustedPax<R extends Pick<ServiceSummaryRow, "id" | "order_id" | "pax_adult" | "pax_child" | "pax_senior" | "pax_infant">>(
  rows: readonly R[],
  afterByOrder: ReadonlyMap<string, readonly { serviceId: string; pax: PaxCounts }[]>,
): R[] {
  return rows.map((r) => {
    const pax = afterByOrder.get(r.order_id)?.find((a) => a.serviceId === r.id)?.pax;
    return pax ? { ...r, pax_adult: pax.adult, pax_child: pax.child, pax_senior: pax.senior, pax_infant: pax.infant } : r;
  });
}

function toDto(r: OrderRow): OrderDto {
  return {
    id: r.id,
    orderCode: r.order_code,
    staffId: r.staff_id,
    staffName: r.staff_name,
    bookerPartyId: r.booker_party_id,
    bookerName: r.booker_name,
    status: r.status,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    customerNote: r.customer_note,
    subtotal: r.subtotal,
    discount: r.discount,
    total: r.total,
    depositAmount: r.deposit_amount,
    depositMethod: r.deposit_method,
    remainingAmount: r.remaining_amount,
    paymentNote: r.payment_note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    confirmedAt: r.confirmed_at,
  };
}

const paxOf = (s: ServiceRow): PaxCounts => ({ adult: s.pax_adult, child: s.pax_child, senior: s.pax_senior, infant: s.pax_infant });
/** Thông tin chuyến của một dịch vụ; `pickupTime`/`pickupPlace` = DẪN XUẤT từ chặng còn hiệu lực của dịch vụ (`chieuDiDau` — ADR-0047 R2a). */
const tripOf = (s: ServiceRow, legs: readonly StoredLeg[]): ValidTrip => ({
  departDate: s.depart_date,
  departTime: s.depart_time,
  ...chieuDiDau(legs),
  checkinDate: s.checkin_date,
  checkinTime: s.checkin_time,
  checkinPlace: s.checkin_place,
  note: s.note,
});

/** Chặng CÒN HIỆU LỰC đã lưu (ADR-0047): dạng luật cần (`ChangDaLuu`) + dịch vụ, dấu vết (giữ `created_*` khi lưu nháp xoá–chèn lại), mốc khoá lạc quan. */
/** Dấu đặt gấp đã lưu của chặng (0040) — ĐỦ; lớp route rút gọn theo vai trước khi trả (`xemDuDatGap`, chủ H4 / N-14). */
export interface DatGapDaLuu { lyDo: string; ghiChu: string | null; luc: string; nguoiDuyet: string | null }
export type StoredLeg = ChangDaLuu & { serviceId: string; createdAt: string; createdBy: string | null; updatedAt: string; datGap: DatGapDaLuu | null };

export const toStoredLeg = (r: LegRow): StoredLeg => ({
  id: r.id,
  direction: r.direction,
  pickupDate: r.pickup_date,
  pickupTime: r.pickup_time,
  pickupLocationId: r.pickup_location_id,
  pickupPlace: r.pickup_place,
  pickupLabel: r.pickup_label,
  dropoffLocationId: r.dropoff_location_id,
  dropoffPlace: r.dropoff_place,
  dropoffLabel: r.dropoff_label,
  serviceId: r.order_service_id,
  createdAt: r.created_at,
  createdBy: r.created_by,
  updatedAt: r.updated_at,
  datGap: r.short_notice_reason !== null && r.short_notice_at !== null
    ? { lyDo: r.short_notice_reason, ghiChu: r.short_notice_note, luc: r.short_notice_at, nguoiDuyet: r.short_notice_by_label }
    : null,
});

/** DTO một chặng — dựng TỪNG khoá (không trải dòng nguồn). */
const toLegDto = (l: StoredLeg): LegDto => ({
  id: l.id,
  direction: l.direction,
  pickupDate: l.pickupDate,
  pickupTime: l.pickupTime,
  pickupLocationId: l.pickupLocationId,
  pickupPlace: l.pickupPlace,
  pickupLabel: l.pickupLabel,
  dropoffLocationId: l.dropoffLocationId,
  dropoffPlace: l.dropoffPlace,
  dropoffLabel: l.dropoffLabel,
  updatedAt: l.updatedAt,
  datGap: l.datGap
    ? {
        daDuyet: true,
        lyDo: l.datGap.lyDo,
        lyDoNhan: isLyDoDatGap(l.datGap.lyDo) ? LY_DO_DAT_GAP[l.datGap.lyDo] : "Lý do khác",
        nguoiDuyet: l.datGap.nguoiDuyet,
        luc: l.datGap.luc,
        ghiChu: l.datGap.ghiChu,
      }
    : null,
});

/** Chặng còn hiệu lực theo dịch vụ (xếp theo ngày, giờ đón, chiều — `xepChang`). */
export function legsByService(rows: readonly LegRow[]): Map<string, StoredLeg[]> {
  const out = new Map<string, StoredLeg[]>();
  for (const r of rows) out.set(r.order_service_id, [...(out.get(r.order_service_id) ?? []), toStoredLeg(r)]);
  for (const [k, v] of out) out.set(k, xepChang(v));
  return out;
}

/** Giờ + nơi đón DẪN XUẤT (chiều đi đầu) của từng dịch vụ có chặng — nguồn DUY NHẤT cho danh sách đơn, Trang chủ, hàng chờ (R2a). */
async function derivedPickupByService(db: D1Database, orderIds: readonly string[]): Promise<Map<string, { pickupTime: string | null; pickupPlace: string | null }>> {
  const by = legsByService(await openLegsByOrders(db, orderIds));
  return new Map(Array.from(by, ([serviceId, legs]) => [serviceId, chieuDiDau(legs)] as const));
}

function groupItems(rows: ItemRow[]): Map<string, ItemRow[]> {
  const by = new Map<string, ItemRow[]>();
  for (const i of rows) {
    if (!i.service_id) continue; // sau migration 0008 mọi dòng đều có dịch vụ
    const list = by.get(i.service_id);
    if (list) list.push(i);
    else by.set(i.service_id, [i]);
  }
  return by;
}

const toItemDto = (i: ItemRow): OrderItemDto => ({
  id: i.id,
  catalogCode: i.catalog_code,
  paxCode: i.pax_code,
  description: i.description,
  detail: i.detail,
  quantity: i.quantity,
  unitPrice: i.unit_price,
  catalogPrice: i.catalog_price,
  lineTotal: i.line_total,
});

/** Đơn + dịch vụ + dòng tiền. `catalogStatus` luôn null ở đây — do lớp điều phối (service.ts) điền cho đơn nháp. */
export async function findOrder(db: D1Database, id: string): Promise<OrderDetailDto | null> {
  const [orderRes, servicesRes, itemsRes, legsRes] = await db.batch([
    db.prepare(`${ORDER_SELECT} WHERE o.id = ?`).bind(id),
    db.prepare(SERVICE_SELECT).bind(id),
    db.prepare(ITEM_SELECT).bind(id),
    openLegsStatement(db, [id]),
  ]);
  const row = (orderRes!.results as OrderRow[])[0];
  if (!row) return null;
  const items = groupItems(itemsRes!.results as ItemRow[]);
  const legs = legsByService(legsRes!.results as LegRow[]);
  const services = (servicesRes!.results as ServiceRow[]).map((s): OrderServiceDto => {
    const own = legs.get(s.id) ?? [];
    return {
      id: s.id,
      kind: s.catalog_code === null ? "manual" : "catalog",
      catalogCode: s.catalog_code,
      name: s.name,
      unit: s.unit,
      pax: paxOf(s),
      ...tripOf(s, own),
      items: (items.get(s.id) ?? []).map(toItemDto),
      catalogStatus: null,
      legs: own.map(toLegDto),
    };
  });
  return { ...toDto(row), services };
}

/**
 * `lines` = nội dung dòng tiền đã lưu theo thứ tự (mô tả, chi tiết, số lượng, đơn giá) — cho kiểm "dịch vụ nhập tay đóng băng" (DK-T3-01, `price-guards.ts`).
 * `legs` = chặng CÒN HIỆU LỰC của dịch vụ (ADR-0047) — cho trộn thân cũ (`tronChangCu`), dời ngày (`doiNgayChang`), giữ id chặng khi lưu nháp.
 */
export type StoredServiceRow = StoredService & { trip: ValidTrip; lines: FrozenLine[]; legs: StoredLeg[] };

/** Dịch vụ đã lưu của đơn ở dạng luật cần: đủ để dựng "bản chụp" (Q11), so sánh thay đổi chuyến (Q9) và so "giữ nguyên" dịch vụ nhập tay (DK-T3-01). */
export async function getStoredServices(db: D1Database, orderId: string): Promise<StoredServiceRow[]> {
  const [servicesRes, itemsRes, legsRes] = await db.batch([db.prepare(SERVICE_SELECT).bind(orderId), db.prepare(ITEM_SELECT).bind(orderId), openLegsStatement(db, [orderId])]);
  const items = groupItems(itemsRes!.results as ItemRow[]);
  const legs = legsByService(legsRes!.results as LegRow[]);
  return (servicesRes!.results as ServiceRow[]).map((s) => ({
    id: s.id,
    catalogCode: s.catalog_code,
    name: s.name,
    unit: s.unit,
    pax: paxOf(s),
    trip: tripOf(s, legs.get(s.id) ?? []),
    items: (items.get(s.id) ?? []).map((i) => ({ paxCode: i.pax_code, detail: i.detail, catalogPrice: i.catalog_price, unitPrice: i.unit_price })),
    lines: (items.get(s.id) ?? []).map((i) => ({ description: i.description, detail: i.detail, quantity: i.quantity, unitPrice: i.unit_price })),
    legs: legs.get(s.id) ?? [],
  }));
}

/** Ngày khởi hành của từng dịch vụ trong đơn (null = chưa có ngày), theo thứ tự dịch vụ. Đơn không có/không tồn tại → mảng rỗng. */
export async function getDepartDates(db: D1Database, orderId: string): Promise<(string | null)[]> {
  const res = await db.prepare("SELECT depart_date FROM order_service WHERE order_id = ? ORDER BY sort_order").bind(orderId).all<{ depart_date: string | null }>();
  return res.results.map((r) => r.depart_date);
}

export interface OrderMeta {
  status: OrderStatus;
  staffId: string;
  updatedAt: string;
  bookerPartyId: string | null;
  bookerName: string | null;
  customerName: string;
  customerPhone: string;
}

/** Mã đơn + người lập — chỉ hai trường này (Bảng tin, ADR-0022 điều 4: sự kiện không mang tên/SĐT khách, không tiền). null nếu không có đơn. */
export async function getOrderRef(db: D1Database, id: string): Promise<{ staffId: string; orderCode: string } | null> {
  const row = await db.prepare("SELECT staff_id, order_code FROM orders WHERE id = ?").bind(id).first<{ staff_id: string; order_code: string }>();
  return row ? { staffId: row.staff_id, orderCode: row.order_code } : null;
}

export async function getMeta(db: D1Database, id: string): Promise<OrderMeta | null> {
  const row = await db
    .prepare(
      `SELECT o.status, o.staff_id, o.updated_at, o.booker_party_id, b.display_name AS booker_name, o.customer_name, o.customer_phone
       FROM orders o LEFT JOIN v_pty_party_label b ON b.id = o.booker_party_id WHERE o.id = ?`,
    )
    .bind(id)
    .first<{ status: OrderStatus; staff_id: string; updated_at: string; booker_party_id: string | null; booker_name: string | null; customer_name: string; customer_phone: string }>();
  return row
    ? { status: row.status, staffId: row.staff_id, updatedAt: row.updated_at, bookerPartyId: row.booker_party_id, bookerName: row.booker_name, customerName: row.customer_name, customerPhone: row.customer_phone }
    : null;
}

/**
 * Dòng tóm tắt dịch vụ của các đơn (sắp theo đơn, `sort_order`), `pickup_time`/`pickup_place` = DẪN XUẤT từ chặng chiều đi đầu (ADR-0047 R2a — một nguồn
 * cho danh sách đơn, Trang chủ, hàng chờ). Hai câu TUẦN TỰ `prepare().bind().all()` (không `batch()` — D1 giả của dashboard.test.ts chỉ có vậy).
 */
async function summaryRows(db: D1Database, orderIds: readonly string[]): Promise<ServiceSummaryRow[]> {
  if (orderIds.length === 0) return [];
  const { results } = await db
    .prepare(
      `SELECT id, order_id, name, sort_order, pax_adult, pax_child, pax_senior, pax_infant, depart_date
       FROM order_service WHERE order_id IN (SELECT value FROM json_each(?1)) ORDER BY order_id, sort_order`,
    )
    .bind(JSON.stringify(orderIds))
    .all<Omit<ServiceSummaryRow, "pickup_time" | "pickup_place">>();
  const derived = await derivedPickupByService(db, orderIds);
  return results.map((r) => {
    const d = derived.get(r.id);
    return { ...r, pickup_time: d?.pickupTime ?? null, pickup_place: d?.pickupPlace ?? null };
  });
}

/**
 * Áp SỐ HIỆN HÀNH (gốc + điều chỉnh gần nhất, nếu có — bài học Đợt B: danh sách và chi tiết đơn từng lệch nhau vì chỉ trang chi tiết áp điều
 * chỉnh) rồi gộp tóm tắt dịch vụ (`summarizeServices`) cho ĐÚNG các đơn trong `rows` — dùng chung cho `listOrders` (một trang) và `getDashboard`
 * (các tập đơn rời rạc: hôm nay, còn thiếu tiền…), để tránh viết lại/viết lệch logic tính tiền ở hai nơi.
 */
async function toSummaryDtos(db: D1Database, rows: readonly OrderRow[]): Promise<OrderSummaryDto[]> {
  // Đơn NHÁP không thể có dòng điều chỉnh (route sửa số khách bắt buộc status = confirmed) — bỏ qua để đỡ một điều kiện IN() thừa.
  const idsMayHaveAdjustment = rows.filter((r) => r.status !== "draft").map((r) => r.id);
  const latestAdjustments = await getLatestAdjustments(db, idsMayHaveAdjustment);
  const dtos = rows.map((r) => toDto(r));
  // Tiền hiệu lực qua NGUỒN DUY NHẤT `computeEffectiveMoney` (Đợt E task 7) — không còn đọc `subtotal_after` đã lưu (có thể SAI với đơn cũ có
  // dịch vụ nhập tay), tự tính lại từ order_service/order_item GỐC, CÙNG cách trang chi tiết đơn đã làm đúng từ trước.
  const effectiveByOrder = await computeEffectiveMoney(db, dtos, latestAdjustments);
  const page = dtos.map((d) => {
    const money = effectiveByOrder.get(d.id)!;
    return { ...d, total: money.total, remainingAmount: money.remainingAmount };
  });

  // Tóm tắt dịch vụ CHỈ cho các đơn thật sự cần (page). `json_each(?1)` nhận MẢNG JSON các id: câu SQL vẫn TĨNH dù số đơn đổi (mẫu ở dispatch/repository.ts).
  // Đợt E: số khách hiệu lực (`applyAdjustedPax`, CÙNG map `latestAdjustments` vừa dùng cho tiền ở trên) — trước bản sửa này chỉ tiền được ghi đè,
  // số khách vẫn lấy thẳng từ order_service đã đóng băng nên hai con số cạnh nhau trên một thẻ lệch nhau (bài học Đợt E).
  const afterByOrder = new Map(Array.from(latestAdjustments, ([id, a]) => [id, a.after] as const));
  // ADR-0047 R2a: giờ/nơi đón của thẻ = DẪN XUẤT từ chặng (`derivedPickupByService`), không đọc cột cũ của order_service.
  const summaries = page.length
    ? summarizeServices(applyAdjustedPax(await summaryRows(db, page.map((d) => d.id)), afterByOrder))
    : new Map<string, ServiceSummary>();

  return page.map((d) => {
    const s = summaries.get(d.id) ?? emptySummary();
    return {
      id: d.id,
      orderCode: d.orderCode,
      status: d.status,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      customerNote: d.customerNote,
      total: d.total,
      depositAmount: d.depositAmount,
      remainingAmount: d.remainingAmount,
      staffName: d.staffName,
      createdAt: d.createdAt,
      serviceNames: s.serviceNames,
      pax: s.pax,
      trip: s.trip,
    };
  });
}

/**
 * Danh sách đơn một trang. PHẠM VI (máy chủ thi hành, không chỉ ở tầng một bản ghi): `ownerId` = null VÀ `orderIds` = null → MỌI đơn (người xem được mọi
 * đơn); có ít nhất một trong hai → CHỈ các đơn khớp MỘT trong hai (hợp): người lập = `ownerId` (ô `own` — ADR-0014 điều 3, D-01) HOẶC id thuộc `orderIds`
 * (đơn đang phụ trách — ô `assigned`, ADR-0030 S23-4; tập do route lấy qua `ctx.myHandledOrderIds`, orders không tự đọc dữ liệu phân công). `orderIds` = []
 * nghĩa là "không đơn nào" (KHÔNG phải "không lọc") — điều kiện json_each vẫn được đặt dù mảng rỗng. `orderIds` là trường BẮT BUỘC (không tuỳ chọn): mọi nơi
 * gọi phải tự nói rõ phạm vi.
 */
export async function listOrders(
  db: D1Database,
  opts: { q: string; loc: LocDon; limit: number; offset: number; ownerId: string | null; orderIds: readonly string[] | null },
): Promise<{ orders: OrderSummaryDto[]; hasMore: boolean }> {
  const where: string[] = [];
  const binds: (string | number)[] = [];
  const scope: string[] = [];
  if (opts.ownerId !== null) {
    scope.push("o.staff_id = ?");
    binds.push(opts.ownerId);
  }
  if (opts.orderIds !== null) {
    scope.push("o.id IN (SELECT value FROM json_each(?))");
    binds.push(JSON.stringify(opts.orderIds));
  }
  if (scope.length) where.push(`(${scope.join(" OR ")})`);
  // Bộ lọc (góp ý T4, `src/shared/loc-don.ts`) — mọi điều kiện AND với phạm vi ở trên. Ngày đi + dịch vụ xét trên CÙNG một dòng dịch vụ (một EXISTS);
  // dịch vụ nhập tay không có mã danh mục nên không bao giờ khớp ô "dịch vụ". Mảng đi qua json_each để câu SQL vẫn tĩnh dạng.
  const { loc } = opts;
  if (loc.trangThai.length) {
    where.push("o.status IN (SELECT value FROM json_each(?))");
    binds.push(JSON.stringify(loc.trangThai));
  }
  if (loc.nguoiLap !== null) {
    where.push("o.staff_id = ?");
    binds.push(loc.nguoiLap);
  }
  const dv: string[] = [];
  if (loc.tu !== null) {
    dv.push("sv.depart_date >= ?");
    binds.push(loc.tu);
  }
  if (loc.den !== null) {
    dv.push("sv.depart_date <= ?");
    binds.push(loc.den);
  }
  if (loc.dichVu.length) {
    dv.push("sv.catalog_code IN (SELECT value FROM json_each(?))");
    binds.push(JSON.stringify(loc.dichVu));
  }
  if (dv.length) where.push(`EXISTS (SELECT 1 FROM order_service sv WHERE sv.order_id = o.id AND ${dv.join(" AND ")})`);
  if (opts.q) {
    const like = `%${escapeLike(opts.q)}%`;
    where.push(`(o.order_code LIKE ? ESCAPE '\\' OR o.customer_name LIKE ? ESCAPE '\\' OR o.customer_phone LIKE ? ESCAPE '\\' OR s.label LIKE ? ESCAPE '\\')`);
    binds.push(like, like, like, like);
  }
  const sql = `${ORDER_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY o.created_at DESC, o.rowid DESC LIMIT ? OFFSET ?`;
  const { results } = await db
    .prepare(sql)
    .bind(...binds, opts.limit + 1, opts.offset)
    .all<OrderRow>();
  const rows = results.slice(0, opts.limit);
  const orders = await toSummaryDtos(db, rows);
  return { orders, hasMore: results.length > opts.limit };
}

/**
 * Nguồn của hàng chờ nhận (`GET /api/orders/pool`, ADR-0030 S23-2) — CHỈ đọc đúng các cột phần hẹp cần (mã đơn, trạng thái; dịch vụ: tên, số khách, ngày
 * khởi hành, nơi đón, giờ đón): không đọc tên/SĐT/email khách, tiền, ghi chú, người lập — lớp thứ nhất; lớp thứ hai là danh sách trường được phép ở
 * `pool.ts`. Số khách là số HIỆN HÀNH (áp dòng điều chỉnh gần nhất — `applyAdjustedPax`, cùng kỹ thuật danh sách đơn), vì đơn đã xác nhận quay về hàng chờ
 * có thể đã được người phụ trách trước sửa số khách.
 * Câu SQL chỉ LỌC THÔ trước (một TẬP CHA của hàng chờ, cho đỡ đọc mọi đơn cũ đã xác nhận): đơn nháp/đã xác nhận mà CÓ dịch vụ ngày ≥ `today`, HOẶC không
 * dịch vụ nào có ngày — đúng bằng phủ định của `tripDeparted` (ngày đi = ngày lớn nhất; đã qua ⇔ < hôm nay). Luật QUYẾT ĐỊNH (chưa huỷ, không có người
 * phụ trách, chưa qua ngày đi) nằm ở `toPoolOrders` (thuần). "Đơn nào có người phụ trách" KHÔNG hỏi ở đây: route hỏi `ctx.ordersWithHandler` (S20-13).
 * GIỚI HẠN ĐÃ BIẾT: không chia trang — trả mọi đơn chưa đi, chưa huỷ (hôm nay vài chục); nhiều hơn vài trăm thì phải xem lại.
 */
export async function listPoolSources(db: D1Database, today: string): Promise<PoolSourceOrder[]> {
  const { results: orderRows } = await db
    .prepare(
      `SELECT o.id, o.order_code, o.status FROM orders o
       WHERE o.status IN ('draft', 'confirmed')
         AND (EXISTS (SELECT 1 FROM order_service s WHERE s.order_id = o.id AND s.depart_date >= ?)
              OR NOT EXISTS (SELECT 1 FROM order_service s WHERE s.order_id = o.id AND s.depart_date IS NOT NULL AND s.depart_date <> ''))`,
    )
    .bind(today)
    .all<{ id: string; order_code: string; status: OrderStatus }>();
  if (orderRows.length === 0) return [];
  const [serviceRows, latest] = await Promise.all([
    // ADR-0047 R2a: nơi đón/giờ đón của phần hẹp = DẪN XUẤT từ chặng chiều đi đầu (`summaryRows`); `pool.ts` giữ ĐÚNG bốn khoá, vẫn che dãy số.
    summaryRows(db, orderRows.map((r) => r.id)),
    // Đơn NHÁP không thể có dòng điều chỉnh (route sửa số khách bắt buộc đơn đã xác nhận) — như `toSummaryDtos`.
    getLatestAdjustments(db, orderRows.filter((r) => r.status !== "draft").map((r) => r.id)),
  ]);
  const afterByOrder = new Map(Array.from(latest, ([id, a]) => [id, a.after] as const));
  const servicesByOrder = new Map<string, PoolSourceService[]>();
  for (const s of applyAdjustedPax(serviceRows, afterByOrder)) {
    const list = servicesByOrder.get(s.order_id) ?? [];
    list.push({
      name: s.name,
      pax: { adult: s.pax_adult, child: s.pax_child, senior: s.pax_senior, infant: s.pax_infant },
      departDate: s.depart_date,
      pickupTime: s.pickup_time,
      pickupPlace: s.pickup_place,
    });
    servicesByOrder.set(s.order_id, list);
  }
  return orderRows.map((r) => ({ id: r.id, orderCode: r.order_code, status: r.status, services: servicesByOrder.get(r.id) ?? [] }));
}

export interface DashboardData {
  /** "Chuyến đón hôm nay": đơn confirmed mà dịch vụ SỚM NHẤT có ngày đón (bỏ qua dịch vụ không có ngày) rơi đúng hôm nay — sắp theo giờ đón. */
  today: OrderSummaryDto[];
  /** Cùng luật `today` cho ngày mai / ngày kia (góp ý YC-0007). */
  tomorrow: OrderSummaryDto[];
  dayAfter: OrderSummaryDto[];
  /** Đơn confirmed còn thiếu tiền (remainingAmount HIỆN HÀNH > 0, không phải cột gốc). */
  unpaid: { total: number; count: number; earliestDate: string | null };
  /** Đơn nháp chưa xác nhận (cùng `unassignedCount` là hai số duy nhất của Trang chủ có đếm đơn nháp). */
  draftCount: number;
  /**
   * Đơn NHÁP hoặc ĐÃ XÁC NHẬN (không tính đơn huỷ) chưa có người phụ trách đang mở — ADR-0020 điều 7 (M1 = A), ADR-0030 S20-13. Tập đơn đang có người
   * lấy qua hàm tiêm `ordersWithHandler` (module `dispatch` trả lời, gốc lắp ráp nối) — `orders` không import `dispatch` và không đọc view của nó.
   */
  unassignedCount: number;
  /**
   * Đơn confirmed CỦA CHÍNH `staffId` được lập trong tuần [weekFrom, weekTo] (giờ VN, hai đầu bao gồm) — "doanh thu của tôi tuần này".
   * `daily`: ĐÚNG 7 phần tử, thứ tự `weekFrom`→`weekTo` (thứ Hai→Chủ nhật), mỗi phần tử là TỔNG số hiện hành của các đơn có `created_at`
   * rơi vào ĐÚNG ngày dân sự VN đó (Đợt D Task 2, biểu đồ cột Trang chủ) — ngày không có đơn vẫn có phần tử, `total: 0`.
   */
  revenueWeek: { total: number; count: number; daily: { date: string; total: number }[] };
}

/**
 * "Chuyến đón" của MỘT ngày (Trang chủ): đơn confirmed mà dịch vụ SỚM NHẤT có ngày đón rơi đúng `ngay`, sắp theo giờ đón của dịch vụ quyết định.
 * Tách từ khối 1 của `getDashboard` (góp ý YC-0007, 30/9) để dùng CÙNG luật cho hôm nay, ngày mai, ngày kia.
 */
async function chuyenDonTrongNgay(db: D1Database, ngay: string): Promise<OrderSummaryDto[]> {
  // 1) "Chuyến đón hôm nay": id các đơn confirmed mà dịch vụ CÓ NGÀY sớm nhất của đơn (os.id = kết quả subquery) đúng bằng `today`.
  //    Đơn không có dịch vụ nào có ngày đón → subquery không ra dòng nào → không đơn nào khớp `os.id = NULL` → đơn đó không lọt vào (đúng ý §7).
  //    Sắp theo giờ đón của CHÍNH dịch vụ quyết định "hôm nay" (khác quy ước `summarizeServices` sắp theo sort_order — ở đây cần thứ tự lịch trình trong ngày).
  //    `os` trong câu này ĐÃ bị ép bằng đúng dòng subquery chọn ra (os.id = subquery) — tức chính là dịch vụ QUYẾT ĐỊNH "hôm nay".
  //    Lấy luôn 3 cột chuyến của DÒNG NÀY để override `trip` bên dưới — KHÔNG dùng `trip` do `toSummaryDtos`/`summarizeServices` điền
  //    (hàm đó lấy theo sort_order nhỏ nhất, có thể là MỘT dịch vụ KHÁC — bài học kiểm độc lập vòng 1, xem dashboard.test.ts).
  // Khoá phá hoà (kiểm gộp I-1): SQLite xếp NULL TRƯỚC giá trị thật ở ORDER BY mặc định. `pickup_time` là trường TUỲ CHỌN (trigger xác
  // nhận đơn không đòi) — khi hai dịch vụ CÙNG là "ngày sớm nhất" của đơn mà một dịch vụ không nhập giờ đón, khoá phá hoà PHẢI ưu tiên
  // dòng CÓ giờ đón trước (`os2.pickup_time IS NULL` = 0 cho dòng có giờ, = 1 cho dòng NULL → ASC đẩy NULL xuống sau), rồi mới tới
  // chính giờ đón, rồi `sort_order`, rồi `id` (khoá tất định cuối cùng khi mọi khoá trên bằng nhau). Same lý do cho ORDER BY ngoài
  // (thứ tự hiển thị danh sách) — dòng không có giờ đón không được nổi lên đầu "Chuyến đón hôm nay".
  // ADR-0047 (Q3 — chủ trả lời 2026-09-29: GIỮ theo ngày đi): tập đơn vẫn chọn theo NGÀY ĐI; giờ/nơi đón nay DẪN XUẤT từ chặng (R2a) nên phần "chọn dịch vụ
  // quyết định" + "sắp" chuyển từ SQL sang TS với CÙNG khoá phá hoà (có giờ trước, rồi giờ, `sort_order`, `id` — Review Focus 9). SQL chỉ lấy dịch vụ
  // ứng viên: dịch vụ ngày = hôm nay của đơn confirmed mà KHÔNG có dịch vụ nào ngày sớm hơn (⇔ ngày sớm nhất trong các dịch vụ có ngày = hôm nay).
  const { results: candidates } = await db
    .prepare(
      `SELECT os.id, os.order_id, os.depart_date, os.sort_order FROM orders o
       JOIN order_service os ON os.order_id = o.id
       WHERE o.status = 'confirmed'
         AND os.depart_date = ?1
         AND NOT EXISTS (SELECT 1 FROM order_service x WHERE x.order_id = o.id AND x.depart_date IS NOT NULL AND x.depart_date < ?1)`,
    )
    .bind(ngay)
    .all<{ id: string; order_id: string; depart_date: string; sort_order: number }>();
  const pickupOf = await derivedPickupByService(db, [...new Set(candidates.map((c) => c.order_id))]);
  const withPickup = candidates.map((c) => ({ ...c, pickupTime: pickupOf.get(c.id)?.pickupTime ?? null, pickupPlace: pickupOf.get(c.id)?.pickupPlace ?? null }));
  type Cand = (typeof withPickup)[number];
  const cmp = (x: string, y: string): number => (x < y ? -1 : x > y ? 1 : 0); // so theo mã ký tự như ORDER BY của SQLite (không theo ngôn ngữ)
  const byTie = (a: Cand, b: Cand): number =>
    Number(a.pickupTime === null) - Number(b.pickupTime === null) || cmp(a.pickupTime ?? "", b.pickupTime ?? "") || a.sort_order - b.sort_order || cmp(a.id, b.id);
  const deciding = new Map<string, Cand>();
  for (const c of withPickup) {
    const cur = deciding.get(c.order_id);
    if (!cur || byTie(c, cur) < 0) deciding.set(c.order_id, c);
  }
  const todayOrder = [...deciding.values()].sort(byTie);
  const todayIds = todayOrder.map((r) => r.order_id);
  // trip của CHÍNH dịch vụ quyết định "hôm nay" — dùng để ghi đè trường `trip` do toSummaryDtos() điền, CHỈ cho mảng `today` (không đụng listOrders()).
  const todayTripById = new Map(todayOrder.map((r) => [r.order_id, { departDate: r.depart_date, pickupTime: r.pickupTime, pickupPlace: r.pickupPlace } satisfies OrderSummaryTripDto] as const));
  const todayRowsById = new Map(
    todayIds.length
      ? (await db.prepare(`${ORDER_SELECT} WHERE o.id IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(todayIds)).all<OrderRow>()).results.map((r) => [r.id, r] as const)
      : [],
  );
  // json_each() không giữ thứ tự — sắp lại theo ĐÚNG thứ tự `todayIds` (đã sắp theo giờ đón ở câu trên).
  return (
    await toSummaryDtos(
      db,
      todayIds.flatMap((id) => (todayRowsById.has(id) ? [todayRowsById.get(id)!] : [])),
    )
  ).map((s) => ({ ...s, trip: todayTripById.get(s.id) ?? s.trip }));
}

/**
 * Dữ liệu Trang chủ mới (`GET /api/orders/dashboard`, route `index.ts`). `today` = ngày dân sự VN (`vnToday`). `weekFrom`/`weekTo` = ngày dân sự VN
 * (thứ Hai/Chủ nhật, `vnWeekRange`), hai đầu bao gồm — hàm này tự đổi sang mốc ISO UTC nửa-mở khi lọc `created_at` (đúng quy ước `vnLocalToIso` đã
 * dùng nơi khác, KHÔNG tự chế cách đổi múi giờ mới).
 * BÀI HỌC ĐỢT B: `unpaid`/`revenueWeek` không lọc/tổng hợp thẳng trên cột `remaining_amount`/`total` GỐC của bảng `orders` — phải áp
 * `getLatestAdjustments` + `effectiveMoney` cho TỪNG đơn trước (đúng kỹ thuật `toSummaryDtos`/`listOrders` đang dùng).
 * `ordersWithHandler` = `ctx.ordersWithHandler` của route (gốc lắp ráp nối vào `dispatch`, ADR-0030 S20-13): trong các đơn đưa vào, đơn nào đang có
 * người phụ trách — nguồn DUY NHẤT của `unassignedCount`.
 */
export async function getDashboard(
  db: D1Database,
  staffId: string,
  today: string,
  weekFrom: string,
  weekTo: string,
  ordersWithHandler: (orderIds: readonly string[]) => Promise<ReadonlySet<string>>,
): Promise<DashboardData> {
  // 1) "Chuyến đón" hôm nay, ngày mai, ngày kia — cùng một luật (`chuyenDonTrongNgay`). Ngày mai / ngày kia: góp ý YC-0007 (chủ chọn cách A, 30/9).
  const [todaySummaries, tomorrowSummaries, dayAfterSummaries] = await Promise.all([
    chuyenDonTrongNgay(db, today), chuyenDonTrongNgay(db, addDays(today, 1)), chuyenDonTrongNgay(db, addDays(today, 2)),
  ]);

  // 2) "Còn thiếu tiền": MỌI đơn confirmed (không lọc trước theo cột gốc — điều chỉnh có thể đưa remainingAmount từ 0 lên dương hoặc ngược lại),
  //    áp effective money từng đơn (qua NGUỒN DUY NHẤT `computeEffectiveMoney`, Đợt E task 7) RỒI mới lọc/tổng hợp trong JS.
  const { results: confirmedRows } = await db
    .prepare(`SELECT id, discount, total, deposit_amount, remaining_amount FROM orders WHERE status = 'confirmed'`)
    .all<{ id: string; discount: number; total: number; deposit_amount: number; remaining_amount: number }>();
  const latestConfirmed = await getLatestAdjustments(db, confirmedRows.map((r) => r.id));
  const confirmedMoney = await computeEffectiveMoney(
    db,
    confirmedRows.map((r) => ({ id: r.id, discount: r.discount, depositAmount: r.deposit_amount, total: r.total, remainingAmount: r.remaining_amount })),
    latestConfirmed,
  );
  const unpaidIds: string[] = [];
  let unpaidTotal = 0;
  for (const r of confirmedRows) {
    const money = confirmedMoney.get(r.id)!;
    if (money.remainingAmount > 0) {
      unpaidIds.push(r.id);
      unpaidTotal += money.remainingAmount;
    }
  }
  // Ngày đón SỚM NHẤT trong số các đơn còn thiếu tiền (giúp biết chuyến gần nhất đang chưa thu đủ) — null nếu không đơn nào có dịch vụ có ngày.
  const earliestUnpaid = unpaidIds.length
    ? await db
        .prepare(`SELECT MIN(depart_date) AS d FROM order_service WHERE order_id IN (SELECT value FROM json_each(?1)) AND depart_date IS NOT NULL`)
        .bind(JSON.stringify(unpaidIds))
        .first<{ d: string | null }>()
    : null;

  // 3) Đơn nháp chưa xác nhận.
  const draftCountRow = await db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE status = 'draft'`).first<{ n: number }>();

  // 4) "Chưa phụ trách" (ADR-0020 điều 7, M1 = A; ADR-0030 S20-13): đơn NHÁP hoặc ĐÃ XÁC NHẬN (không tính đơn huỷ) chưa có người phụ trách đang mở.
  //    `orders` KHÔNG đọc dữ liệu phân công (không import `dispatch`, không đọc view của nó — `src/architecture.test.ts` canh): lấy id các đơn còn hiệu
  //    lực ở đây, hỏi `ordersWithHandler` đơn nào đang có người (dispatch trả lời), đếm phần còn lại. Ngữ nghĩa "dòng đã đóng coi như chưa có ai", "hồ
  //    sơ không có tài khoản vẫn là có người" thuộc dispatch (`src/modules/dispatch/handler-of.test.ts`).
  //    GIỚI HẠN ĐÃ BIẾT: mảng id (MỌI đơn chưa huỷ, không lọc theo ngày) lớn dần theo số đơn và đi trong MỘT tham số JSON sang dispatch — cùng loại giới
  //    hạn đã có ở khối 2 (`getLatestAdjustments` nhận mọi đơn đã xác nhận). Hôm nay vài trăm đơn; khi số đơn chưa huỷ vượt vài nghìn thì phải xem lại.
  //    Đo 2026-09-27 trên node:sqlite (CHƯA đo trên D1): 2 000 đơn → chuỗi JSON 78 001 byte, cả hàm ~5 ms; 50 000 đơn → 1 950 001 byte — sát giới hạn
  //    2 MB/chuỗi của D1 (tài liệu Cloudflare; tài liệu không nói rõ giới hạn đó có áp cho tham số ràng buộc hay không).
  const { results: openRows } = await db.prepare(`SELECT id FROM orders WHERE status IN ('draft', 'confirmed')`).all<{ id: string }>();
  const withHandler = await ordersWithHandler(openRows.map((r) => r.id));
  const unassignedCount = openRows.filter((r) => !withHandler.has(r.id)).length;

  // 5) "Doanh thu của tôi tuần này": đơn confirmed do CHÍNH staffId lập, trong [weekFrom, weekTo] giờ VN (hai đầu bao gồm) — đổi sang mốc ISO UTC
  //    nửa-mở [đầu thứ Hai, đầu thứ Hai TUẦN SAU) bằng `vnLocalToIso` (đúng quy ước "00:00 giờ VN" đã dùng ở nơi khác, không tự chế).
  //    Doanh thu = `total` HIỆN HÀNH (subtotal đã trừ giảm giá) — không phải remainingAmount (đây là giá trị đơn, không phải số còn phải thu).
  const weekFromIso = vnLocalToIso(`${weekFrom}T00:00`)!;
  const weekToIsoExclusive = vnLocalToIso(`${addDays(weekTo, 1)}T00:00`)!;
  const { results: weekRows } = await db
    .prepare(`SELECT id, discount, total, deposit_amount, remaining_amount, created_at FROM orders WHERE status = 'confirmed' AND staff_id = ?1 AND created_at >= ?2 AND created_at < ?3`)
    .bind(staffId, weekFromIso, weekToIsoExclusive)
    .all<{ id: string; discount: number; total: number; deposit_amount: number; remaining_amount: number; created_at: string }>();
  const latestWeek = await getLatestAdjustments(db, weekRows.map((r) => r.id));
  const weekMoney = await computeEffectiveMoney(
    db,
    weekRows.map((r) => ({ id: r.id, discount: r.discount, depositAmount: r.deposit_amount, total: r.total, remainingAmount: r.remaining_amount })),
    latestWeek,
  );
  let revenueTotal = 0;
  // Đợt D Task 2: gộp doanh thu HIỆN HÀNH theo ngày dân sự VN của `created_at` — CÙNG tập đơn/CÙNG số tiền đang cộng
  // vào `revenueTotal` ở trên, không tính lại từ nguồn khác (tránh lệch giữa `daily` và `total`, xem test tổng invariant).
  const dailyTotals = new Map<string, number>();
  for (const r of weekRows) {
    const money = weekMoney.get(r.id)!;
    revenueTotal += money.total;
    const day = vnToday(new Date(r.created_at));
    dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + money.total);
  }
  // Luôn ĐÚNG 7 phần tử (weekFrom là thứ Hai — vnWeekRange đảm bảo) dù ngày đó không có đơn nào (total: 0) — biểu đồ cột cần đủ 7 cột.
  const daily = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekFrom, i);
    return { date, total: dailyTotals.get(date) ?? 0 };
  });

  return {
    today: todaySummaries,
    tomorrow: tomorrowSummaries,
    dayAfter: dayAfterSummaries,
    unpaid: { total: unpaidTotal, count: unpaidIds.length, earliestDate: earliestUnpaid?.d ?? null },
    draftCount: draftCountRow?.n ?? 0,
    unassignedCount,
    revenueWeek: { total: revenueTotal, count: weekRows.length, daily },
  };
}

const isCodeCollision = (e: unknown) => e instanceof Error && /UNIQUE constraint failed: orders\.order_code/.test(e.message);

/** Mốc `updated_at` mới, luôn LỚN HƠN mốc cũ (dù đồng hồ lệch/cùng mili-giây) để điều kiện khoá lạc quan phân biệt được "đã ghi" với "chưa ghi". */
function nextStamp(prev: string): string {
  const p = Date.parse(prev);
  return new Date(Number.isNaN(p) ? Date.now() : Math.max(Date.now(), p + 1)).toISOString();
}

interface Guard {
  sql: string;
  binds: (string | number)[];
}

/**
 * Câu ghi chỉ chạy khi UPDATE đầu của CHÍNH request này đã thắng: dòng nhật ký mang id riêng của request (xem `AuditInput.id`) chỉ được chèn
 * khi `changes() > 0`, nên có mặt ⇔ UPDATE đã áp dụng (đơn còn nháp và đúng mốc `updated_at`). Không dùng so mốc thời gian vì hai request
 * cùng mili-giây có thể tính ra cùng mốc mới, khi đó bên thua vẫn lọt qua và xoá/ghi đè bản của bên thắng.
 */
const wonGuard = (auditId: string): Guard => ({ sql: "EXISTS (SELECT 1 FROM audit_log WHERE id = ?)", binds: [auditId] });

/**
 * Người đặt đã được service kiểm, sẵn để ghi. `before` = câu tạo hồ sơ mới (+ nhật ký `party_created`) của `parties`, đứng TRƯỚC câu ghi đơn
 * trong CÙNG batch vì khoá ngoại. `note` = mẩu nhật ký của đơn (chỉ tên).
 */
export interface BookerWrite {
  partyId: string | null;
  before: D1PreparedStatement[];
  note: string | null;
}
export const NO_BOOKER: BookerWrite = { partyId: null, before: [], note: null };

/**
 * Giá trị ghi vào `orders.booker_party_id`: chỉ khi hồ sơ còn là CÁ NHÂN ĐANG HOẠT ĐỘNG (đọc qua view công bố của `parties`, ADR-0002 điều 3), không thì NULL —
 * lưới cho khoảng giữa lúc service kiểm và lúc ghi; KHÔNG đặt EXISTS vào WHERE (đơn sẽ chèn 0 dòng lặng lẽ). Hai tham số: cùng id.
 */
const BOOKER_VALUE = `CASE WHEN EXISTS (SELECT 1 FROM v_pty_party_label WHERE id = ? AND active = 1 AND party_kind = 'PERSON') THEN ? END`;

const joinDetail = (...parts: (string | null | undefined)[]): string | undefined => parts.filter((p): p is string => !!p).join(" | ") || undefined;

/** Bảng được phép ghi bằng insertRow — union literal thay cho `string` động (ADR-0002 điều 8(b)): tên bảng không bao giờ đến từ đầu vào. */
type WriteTable = "order_service" | "order_item";

function insertRow(db: D1Database, table: WriteTable, cols: string[], values: (string | number | null)[], guard?: Guard): D1PreparedStatement {
  const marks = cols.map(() => "?").join(", ");
  if (!guard) return db.prepare(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${marks})`).bind(...values);
  return db.prepare(`INSERT INTO ${table} (${cols.join(", ")}) SELECT ${marks} WHERE ${guard.sql}`).bind(...values, ...guard.binds);
}

const SERVICE_COLS = [
  "id", "order_id", "sort_order", "catalog_code", "name", "unit", "pax_adult", "pax_child", "pax_senior", "pax_infant",
  "depart_date", "depart_time", "pickup_time", "pickup_place", "checkin_date", "checkin_time", "checkin_place", "note",
];
const ITEM_COLS = ["id", "order_id", "service_id", "catalog_code", "pax_code", "description", "detail", "quantity", "unit_price", "catalog_price", "line_total", "sort_order"];

/**
 * INSERT các dịch vụ rồi các dòng tiền của chúng (dịch vụ trước vì dòng tiền trỏ khoá ngoại vào dịch vụ). Trả CẢ mảng id dịch vụ theo thứ tự (ADR-0047:
 * chặng của dịch vụ MỚI phải dùng đúng id vừa sinh — Review Focus 2). Hai cột `pickup_time`/`pickup_place` ghi GIÁ TRỊ DẪN XUẤT từ chặng (`trip` đã được
 * `resolveLegPlaces` đặt lại) — GHI KÉP phát hành 1 (Ruling R3).
 */
function serviceInserts(db: D1Database, orderId: string, services: ValidService[], guard?: Guard): { stmts: D1PreparedStatement[]; ids: string[] } {
  const stmts: D1PreparedStatement[] = [];
  const ids = services.map((s) => s.id ?? crypto.randomUUID());
  services.forEach((s, i) => {
    const t = s.trip;
    stmts.push(
      insertRow(
        db, "order_service", SERVICE_COLS,
        [ids[i]!, orderId, i, s.catalogCode, s.name, s.unit, s.pax.adult, s.pax.child, s.pax.senior, s.pax.infant,
          t.departDate, t.departTime, t.pickupTime, t.pickupPlace, t.checkinDate, t.checkinTime, t.checkinPlace, t.note],
        guard,
      ),
    );
  });
  let sort = 0;
  services.forEach((s, i) => {
    for (const it of s.items) {
      stmts.push(
        insertRow(
          db, "order_item", ITEM_COLS,
          [crypto.randomUUID(), orderId, ids[i]!, it.catalogCode, it.paxCode, it.description, it.detail, it.quantity, it.unitPrice, it.catalogPrice, it.lineTotal, sort++],
          guard,
        ),
      );
    }
  });
  return { stmts, ids };
}

/** Dấu vết của chặng đang lưu (giữ `created_*` khi lưu nháp xoá–chèn lại cùng id) — theo id chặng. */
export type LegMeta = ReadonlyMap<string, { createdAt: string; createdBy: string | null }>;

/** Một thao tác trên chặng của `PUT /trip` tương thích (ADR-0047 R2c, R4e) — `service.ts:keHoachChangTrip` lập, `updateTrip` ghi. */
export type LegOp =
  | { kind: "update"; legId: string; fields: LegFields }
  | { kind: "insert"; serviceId: string; leg: ChangHopLe }
  | { kind: "close"; legId: string; reason: LyDoDongChang };

/** Giá trị ghi MỘT chặng (chặng mới sinh id mới; giữ `created_*` theo `meta` khi chèn lại cùng id). */
function legWriteOf(
  l: ChangHopLe, serviceId: string, orderId: string, staffId: string, at: string, meta: LegMeta = new Map(), datGap: DatGapWrite | null = null,
): LegWrite {
  const id = l.id ?? crypto.randomUUID();
  const m = meta.get(id);
  return {
    id, orderId, serviceId, direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: l.pickupLocationId,
    pickupPlace: l.pickupPlace, dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace,
    createdAt: m?.createdAt ?? at, createdBy: m ? m.createdBy : staffId, updatedAt: at, updatedBy: staffId, datGap,
  };
}

/**
 * Dấu đặt gấp CHÉP khi lưu lại đơn nháp (ADR-0049 Q1 = (a)): khoá `"<vị trí dịch vụ>|<vị trí chặng>"` → năm cột ĐỌC TỪ CSDL (`chepDatGapNhap`, dat-gap.ts).
 */
export type DatGapNhap = ReadonlyMap<string, DatGapWrite>;

/** Giá trị ghi các chặng của mọi dịch vụ (id dịch vụ theo `serviceIds` của lần chèn này). */
function legWrites(
  services: readonly ValidService[], serviceIds: readonly string[], orderId: string, staffId: string, at: string, meta: LegMeta = new Map(), datGap: DatGapNhap = new Map(),
): LegWrite[] {
  return services.flatMap((s, i) => s.legs.map((l, j) => legWriteOf(l, serviceIds[i]!, orderId, staffId, at, meta, datGap.get(`${i}|${j}`) ?? null)));
}

/** Giá trị ghi danh sách hành khách của đơn NHÁP: mỗi người một dòng đầu chuỗi (`person_key` = id; giữ id gửi lại). */
function passengerWrites(passengers: readonly HanhKhachHopLe[], orderId: string, staffId: string, at: string): PassengerWrite[] {
  return passengers.map((p) => {
    const id = p.id ?? crypto.randomUUID();
    return { id, orderId, ten: p.fullName, birthYear: p.birthYear, paxCode: p.paxCode, previousId: null, personKey: id, at, by: staffId };
  });
}

/**
 * Tạo đơn + dịch vụ + dòng tiền + nhật ký trong một transaction. order_code được sinh NGAY TRONG câu INSERT
 * (mã lớn nhất của ngày + 1) nên việc đọc-rồi-ghi là một bước nguyên tử: D1 ghi tuần tự, nhiều người
 * tạo cùng lúc vẫn ra mã khác nhau. UNIQUE vẫn là lưới an toàn cuối; nếu đụng thì thử lại.
 * `alsoCreate` = các câu (chưa chạy) module KHÁC cần chạy cùng giao dịch, dựng theo id đơn và thời điểm của TỪNG lần thử — id đơn đổi mỗi lần thử nên phải là hàm,
 * không phải danh sách dựng sẵn. Dùng cho người phụ trách do người lập CHỌN lúc lập (`dispatch`, ADR-0030 S20-4 — đơn mới không bao giờ tự gắn người lập; không
 * chọn thì không có `alsoCreate`); `orders` không biết đó là gì, chỉ ghép sau câu INSERT đơn và dòng nhật ký `created`. MỘT mốc `at` cho cả lần thử: cùng giá
 * trị đi vào `orders.created_at`, dòng nhật ký `created` và `alsoCreate(id, at)` — đừng đọc đồng hồ lần thứ hai ở đây (hệ thống Thông báo so các mốc này).
 * `booker.before` đứng đầu batch (hồ sơ mới, nếu có, phải tồn tại trước khi đơn trỏ khoá ngoại tới).
 */
export async function createOrder(
  db: D1Database,
  staffId: string,
  order: ValidOrder,
  alsoCreate?: (orderId: string, at: string) => D1PreparedStatement[],
  booker: BookerWrite = NO_BOOKER,
): Promise<string> {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; ; attempt++) {
    const now = new Date();
    const prefix = orderCodePrefix(now);
    const id = crypto.randomUUID();
    const at = now.toISOString();
    // ADR-0047: chặng + hành khách dựng TRONG vòng thử — id đơn và id dịch vụ mới đổi mỗi lần thử (Review Focus 2).
    const services = serviceInserts(db, id, order.services);
    const legs = legWrites(order.services, services.ids, id, staffId, at).map((l) => legInsert(db, l));
    const passengers = passengerWrites(order.passengers ?? [], id, staffId, at).map((p) => passengerInsert(db, p));
    const paxNote = order.passengers === null ? null : moTaDanhSachNhap(order.passengers.length);
    try {
      await db.batch([
        ...booker.before,
        db
          .prepare(
            `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, customer_email, customer_note,
               subtotal, discount, total, deposit_amount, deposit_method, remaining_amount, payment_note, created_at, updated_at, booker_party_id)
             SELECT ?, ? || printf('%04d', COALESCE((SELECT MAX(CAST(substr(order_code, length(?) + 1) AS INTEGER)) FROM orders WHERE order_code LIKE ?), 0) + 1),
               ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${BOOKER_VALUE}`,
          )
          .bind(
            id, prefix, prefix, `${prefix}%`, staffId, order.customerName, order.customerPhone, order.customerEmail, order.customerNote,
            order.subtotal, order.discount, order.total, order.depositAmount, order.depositMethod, order.remainingAmount, order.paymentNote, at, at,
            booker.partyId, booker.partyId,
          ),
        ...services.stmts,
        ...legs,
        ...passengers,
        auditStatement(db, { orderId: id, staffId, action: "created", at, detail: joinDetail(summarizeDeviations(order.items), booker.note, paxNote) }),
        ...(alsoCreate?.(id, at) ?? []),
      ]);
      return id;
    } catch (e) {
      if (!isCodeCollision(e) || attempt >= MAX_ATTEMPTS) throw e;
    }
  }
}

/**
 * Sửa đơn (chỉ khi còn `draft` VÀ `updated_at` còn khớp mốc client đã đọc). Trả false nếu UPDATE đầu không áp dụng (đơn đã đổi trạng thái
 * hoặc đã bị người khác sửa) — khi đó MỌI câu sau đều không chạy vì cùng mang `wonGuard`.
 * Thứ tự cố định vì khoá ngoại (ADR-0047 Review Focus 1): (`booker.before` — hồ sơ mới, nếu có) → UPDATE đơn → [nhật ký] → xoá dòng tiền → XOÁ CHẶNG
 * (trỏ dịch vụ) → xoá dịch vụ → thêm dịch vụ → thêm dòng tiền → THÊM CHẶNG → (chỉ khi thân có khoá `passengers`) xoá rồi thêm hành khách. Chặng và
 * hành khách của đơn NHÁP xoá–chèn lại (ngoại lệ có tên `XOA_CUNG_NHAP` — lệch có chủ ý hẹp của Hiến chương 5.5, chủ trả lời Q0 "Cách 1: chỉ giữ bản
 * cuối"); giữ id chặng/khách gửi lại, giữ `created_*` của chặng (`legMeta`). MỌI câu sau nhật ký mang lính gác.
 * Audit đứng ngay sau UPDATE (idiom `changes() > 0`). Giới hạn đã biết: hồ sơ mới trong `booker.before` không mang điều kiện thắng của khoá lạc quan,
 * nên khi UPDATE đơn thua (đơn đã đổi/đã bị người khác sửa) thì hồ sơ vừa tạo vẫn còn lại — một hồ sơ thừa hiếm gặp, chấp nhận được ở lát này.
 */
export async function updateDraftOrder(
  db: D1Database,
  id: string,
  staffId: string,
  order: ValidOrder & { expectedUpdatedAt: string },
  booker: BookerWrite = NO_BOOKER,
  legMeta: LegMeta = new Map(),
  datGapNhap: DatGapNhap = new Map(),
): Promise<boolean> {
  const at = nextStamp(order.expectedUpdatedAt);
  const auditId = crypto.randomUUID();
  const guard = wonGuard(auditId);
  const services = serviceInserts(db, id, order.services, guard);
  const paxNote = order.passengers === null ? null : moTaDanhSachNhap(order.passengers.length);
  const results = await db.batch([
    ...booker.before,
    db
      .prepare(
        `UPDATE orders SET customer_name = ?, customer_phone = ?, customer_email = ?, customer_note = ?,
           subtotal = ?, discount = ?, total = ?, deposit_amount = ?, deposit_method = ?, remaining_amount = ?, payment_note = ?,
           booker_party_id = ${BOOKER_VALUE}, updated_at = ?
         WHERE id = ? AND status = 'draft' AND updated_at = ?`,
      )
      .bind(
        order.customerName, order.customerPhone, order.customerEmail, order.customerNote,
        order.subtotal, order.discount, order.total, order.depositAmount, order.depositMethod, order.remainingAmount, order.paymentNote,
        booker.partyId, booker.partyId, at, id, order.expectedUpdatedAt,
      ),
    auditStatement(db, { id: auditId, orderId: id, staffId, action: "updated", at, detail: joinDetail(summarizeDeviations(order.items), booker.note, paxNote) }, "changes() > 0"),
    db.prepare(`DELETE FROM order_item WHERE order_id = ? AND ${guard.sql}`).bind(id, ...guard.binds),
    legDeleteDraft(db, id, auditId),
    db.prepare(`DELETE FROM order_service WHERE order_id = ? AND ${guard.sql}`).bind(id, ...guard.binds),
    ...services.stmts,
    ...legWrites(order.services, services.ids, id, staffId, at, legMeta, datGapNhap).map((l) => legInsertGuarded(db, l, auditId)),
    ...(order.passengers === null
      ? []
      : [passengerDeleteDraft(db, id, auditId), ...passengerWrites(order.passengers, id, staffId, at).map((p) => passengerInsertGuarded(db, p, auditId))]),
  ]);
  return (results[booker.before.length]!.meta.changes ?? 0) > 0;
}

/**
 * Xác nhận đơn: điều kiện "có dịch vụ, mọi dịch vụ có ngày khởi hành trong [hôm nay, +365 ngày] và ≥ 1 khách" nằm TRONG câu UPDATE
 * (không đọc-rồi-ghi ở route) nên người khác lưu nháp xoá ngày ngay trước đó cũng không thể tạo ra đơn xác nhận thiếu chuyến.
 * Trigger `orders_confirm_requires_trip` (0008) là lưới thứ hai cho phần không đổi của luật. Trả false nếu điều kiện không còn đúng.
 * `prevUpdatedAt` là mốc `updated_at` route đọc lúc kiểm quyền: mốc mới đi qua `nextStamp` nên luôn lớn hơn nó (như `updateDraftOrder`/`updateTrip`),
 * để client còn giữ mốc cũ không lọt qua khoá lạc quan của `PUT /trip` dù xác nhận rơi vào cùng mili-giây với một lần ghi khác.
 * ADR-0047 Ruling R4c: câu ĐẦU lô điền ngày đón = ngày đi cho chặng mở còn trống ngày (trigger `orders_confirm_requires_leg_date` xét lúc đổi trạng thái)
 * — nên câu UPDATE đổi trạng thái nay là `results[1]`. Không thêm lý do "chưa đủ chuyến" mới cho người dùng (`confirmGaps` không đổi).
 */
export async function confirmOrder(
  db: D1Database, id: string, staffId: string, today: string, prevUpdatedAt: string, nguongMoc: string, detail?: string,
): Promise<boolean> {
  const at = nextStamp(prevUpdatedAt);
  const { from, to } = confirmWindow(today);
  // ADR-0049 D2 (I15): câu xác nhận ở tệp nửa nghiêm (`order_confirm`), thêm vế mốc tối thiểu lúc đặt — ngưỡng chuỗi do route tính bằng `nguongMocVn`.
  const results = await db.batch([
    legFillDateOnConfirm(db, id, at),
    orderConfirm(db, id, at, from, to, nguongMoc),
    auditStatement(db, { orderId: id, staffId, action: "confirmed", at, detail }, "changes() > 0"),
  ]);
  return (results[1]!.meta.changes ?? 0) > 0;
}

/**
 * Huỷ đơn có điều kiện `status = from` VÀ `updated_at = prevUpdatedAt` (khoá lạc quan, chống hai người đổi cùng lúc — kể cả khi người kia chỉ đổi
 * `updated_at` mà KHÔNG đổi `status`, ví dụ `PUT /trip` chen giữa lúc route đọc và lúc gọi hàm này). Trả false nếu điều kiện không còn đúng — KHÔNG
 * đổi gì, KHÔNG ghi nhật ký (T1d, điều kiện tiên quyết ADR-0030 lượt 1: trước bản sửa này câu UPDATE chỉ khoá theo `status`, để lọt ca chen giữa
 * trên). Mốc `updated_at` mới = `nextStamp(prevUpdatedAt)` (xem `confirmOrder`). `opts` cho phép đường huỷ hẹp của FIELD (ADR-0014 điều 11) ghi một
 * hành động nhật ký riêng kèm lý do — mặc định vẫn là `cancelled` không detail, giữ nguyên hành vi cũ của mọi lời gọi khác.
 */
export async function cancelOrder(db: D1Database, id: string, staffId: string, from: OrderStatus, prevUpdatedAt: string, opts?: { action?: AuditAction; detail?: string }): Promise<boolean> {
  const at = nextStamp(prevUpdatedAt);
  const results = await db.batch([
    db.prepare(`UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = ? AND updated_at = ?`).bind(at, id, from, prevUpdatedAt),
    auditStatement(db, { orderId: id, staffId, action: opts?.action ?? "cancelled", at, detail: opts?.detail }, "changes() > 0"),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}

interface LatestAdjustment {
  id: string;
  seq: number;
  after: { serviceId: string; pax: PaxCounts }[];
}

/**
 * Dòng điều chỉnh gần nhất của đơn (seq lớn nhất) — null nếu chưa có lần sửa nào (ADR-0014 điều 6, Phase B). `after` đi qua
 * `money-adjustment.ts:parseAdjustmentAfter` (MỘT hàm phân tích duy nhất, dùng chung với `getLatestAdjustments` — sửa Lỗi 1/2 kiểm độc lập Đợt E
 * vòng 2): trước bản sửa này hàm ở đây gọi thẳng `JSON.parse` không bắt lỗi, không kiểm dạng — `after_json` hỏng (không phải JSON, phần tử không
 * phải object…) làm CẢ trang chi tiết đơn NÀY ném lỗi 500 (bao gồm cả route ghi `editMoneyAsHandler` dùng chung hàm này, khiến đơn hỏng không sửa
 * tiếp được bằng thao tác bình thường). Giờ dữ liệu hỏng chỉ khiến `after` rơi về mảng rỗng (= coi như đơn CHƯA có điều chỉnh, hiện số đã lưu).
 */
export async function getLatestAdjustment(db: D1Database, orderId: string): Promise<LatestAdjustment | null> {
  const row = await db
    .prepare("SELECT id, seq, after_json FROM order_money_adjustment WHERE order_id = ? ORDER BY seq DESC LIMIT 1")
    .bind(orderId)
    .first<{ id: string; seq: number; after_json: string }>();
  return row ? { id: row.id, seq: row.seq, after: parseAdjustmentAfter(row.after_json) } : null;
}

export interface LatestAdjustmentOverlay {
  /** Số khách MỚI của từng dịch vụ từ danh mục — xem `applyAdjustedPax`. */
  after: { serviceId: string; pax: PaxCounts }[];
}

/**
 * Số khách (`after`) của dòng điều chỉnh GẦN NHẤT cho MỖI đơn trong `orderIds` (một lời gọi, không phải N truy vấn) — dùng cho `listOrders`/
 * `getDashboard` overlay số khách ở trang danh sách/Trang chủ, cùng ý với `getLatestAdjustment` (dùng cho trang chi tiết MỘT đơn) nhưng gọn hơn
 * cho nhiều đơn cùng lúc. Đơn CÓ mặt trong kết quả trả về (dù `after` rỗng) = đơn ĐÃ có ít nhất một dòng điều chỉnh — `computeEffectiveMoney` dùng
 * chính sự có-mặt này để quyết định có cần tính lại tiền hay dùng thẳng cột gốc của `orders`. Đơn KHÔNG có trong kết quả = chưa có điều chỉnh nào.
 * Đợt E task 7: KHÔNG còn đọc/trả `subtotal_after` ở đây nữa — cột đó, ở nơi GHI (`orders/index.ts:editMoneyAsHandler`), TỪNG bị tính thiếu cho
 * đơn có dịch vụ nhập tay (chỉ cộng dịch vụ TỪ DANH MỤC); sửa nơi ghi chỉ chữa được đơn TỪ NAY, bảng CHỈ-THÊM nên đơn CŨ đã lưu thiếu không sửa lại
 * được. Tiền hiệu lực giờ LUÔN tính lại từ order_service/order_item GỐC qua `computeEffectiveMoney`/`money-adjustment.ts:effectiveSubtotal` — nguồn
 * DUY NHẤT, dùng chung với trang chi tiết đơn — nên đơn CŨ đã lưu sai cũng tự động hiện ĐÚNG ở đây, không phụ thuộc giá trị đã lưu sai đó nữa.
 * `after_json` hỏng/không đọc được cho một dòng: `money-adjustment.ts:parseAdjustmentAfter` (MỘT hàm phân tích duy nhất, dùng chung với
 * `getLatestAdjustment` ở trên — sửa Lỗi 1/2 kiểm độc lập Đợt E vòng 2) rơi về `after: []` (= không ghi đè số khách của đơn đó, `applyAdjustedPax`
 * giữ nguyên số gốc, và `effectiveSubtotal` cũng lùi mỗi dịch vụ về "own" đã lưu) thay vì làm vỡ cả trang. Trước bản sửa Lỗi 2, một phần tử KHÔNG
 * PHẢI object (vd `null`) lọt qua `Array.isArray` rồi làm nơi gọi (`applyAdjustedPax`) ném `TypeError` khi truy cập `.serviceId` — sập MỌI request
 * `/api/orders`/dashboard cho MỌI nhân viên, không riêng đơn có dòng hỏng.
 */
export async function getLatestAdjustments(db: D1Database, orderIds: readonly string[]): Promise<Map<string, LatestAdjustmentOverlay>> {
  if (orderIds.length === 0) return new Map();
  // `json_each(?1)` (mẫu đã dùng ở `toSummaryDtos`/dispatch/repository.ts) thay vì một `?` cho mỗi id: D1 giới hạn số tham số ràng buộc mỗi câu
  // (tài liệu Cloudflare) — `listOrders` trước đây an toàn vì trang tối đa 100 đơn, nhưng `getDashboard` gọi hàm này với TOÀN BỘ đơn confirmed/tuần,
  // số lượng không có trần cố định, nên câu SQL phải TĨNH (một tham số) dù số id đổi.
  const { results } = await db
    .prepare(
      `SELECT a.order_id, a.after_json FROM order_money_adjustment a
       WHERE a.order_id IN (SELECT value FROM json_each(?1)) AND a.seq = (SELECT MAX(seq) FROM order_money_adjustment b WHERE b.order_id = a.order_id)`,
    )
    .bind(JSON.stringify(orderIds))
    .all<{ order_id: string; after_json: string }>();
  return new Map(results.map((r) => [r.order_id, { after: parseAdjustmentAfter(r.after_json) }] as const));
}

interface SubtotalServiceRow {
  order_id: string;
  id: string;
  catalog_code: string | null;
  name: string;
  unit: string;
}
interface SubtotalItemRow {
  order_id: string;
  service_id: string | null;
  pax_code: PaxCode | null;
  catalog_price: number | null;
  unit_price: number;
  line_total: number;
}

/**
 * Ghép dòng `order_service`/`order_item` THÔ (kết quả SQL) thành `SubtotalServiceInput[]` theo từng đơn — THUẦN, không I/O (test được không cần
 * D1 thật, xem `repository.test.ts`). CÙNG quy tắc "dòng `order_item.service_id IS NULL` bị BỎ QUA" như `groupItems()` (dùng cho `findOrder` —
 * đường trang chi tiết đơn): đơn cũ trước migration 0008 có thể còn dòng tiền chưa gắn dịch vụ; `findOrder` bỏ qua các dòng đó khi dựng DTO, nên
 * đường ĐÂY (danh sách/Trang chủ, qua `getServicesForSubtotal`) phải bỏ qua Y HỆT — khác đi thì hai bề mặt lại tính "own" lệch nhau cho ĐÚNG loại
 * đơn cũ vừa sửa lỗi này, tái phát ngay trong chính bản vá.
 */
export function buildSubtotalServices(serviceRows: readonly SubtotalServiceRow[], itemRows: readonly SubtotalItemRow[]): Map<string, SubtotalServiceInput[]> {
  const itemsByService = new Map<string, SubtotalServiceInput["items"]>();
  for (const i of itemRows) {
    if (!i.service_id) continue; // sau migration 0008 mọi dòng đều có dịch vụ — xem groupItems() ở trên (findOrder).
    const entry = { paxCode: i.pax_code, catalogPrice: i.catalog_price, unitPrice: i.unit_price, lineTotal: i.line_total };
    const list = itemsByService.get(i.service_id);
    if (list) list.push(entry);
    else itemsByService.set(i.service_id, [entry]);
  }
  const out = new Map<string, SubtotalServiceInput[]>();
  for (const s of serviceRows) {
    const list = out.get(s.order_id) ?? [];
    list.push({ id: s.id, catalogCode: s.catalog_code, name: s.name, unit: s.unit, items: itemsByService.get(s.id) ?? [] });
    out.set(s.order_id, list);
  }
  return out;
}

/**
 * `order_service`/`order_item` GỐC (đã đóng băng) của NHIỀU đơn — đủ để `money-adjustment.ts:effectiveSubtotal` tính lại tiền hiệu lực. CHỈ gọi
 * cho đơn THẬT SỰ có điều chỉnh (`orderIds` = khoá của `getLatestAdjustments`) — đơn không có điều chỉnh dùng thẳng cột `orders.total`/
 * `remaining_amount` gốc, không cần đọc gì thêm (xem `computeEffectiveMoney`). HAI câu TUẦN TỰ (không `db.batch()`): hàm này được gọi từ
 * `getDashboard` (chỉ đọc) trong bộ kiểm `dashboard.test.ts` dùng D1 giả KHÔNG có `batch()` (chỉ có `prepare().bind().first()/.all()`, xem chú
 * thích `fakeD1` ở đó) — hai lời gọi độc lập, không cần một giao dịch (đều là SELECT, không ràng buộc lẫn nhau).
 */
export async function getServicesForSubtotal(db: D1Database, orderIds: readonly string[]): Promise<Map<string, SubtotalServiceInput[]>> {
  if (orderIds.length === 0) return new Map();
  const ids = JSON.stringify(orderIds);
  const serviceRows = (
    await db
      .prepare(`SELECT order_id, id, catalog_code, name, unit FROM order_service WHERE order_id IN (SELECT value FROM json_each(?1)) ORDER BY order_id, sort_order`)
      .bind(ids)
      .all<SubtotalServiceRow>()
  ).results;
  const itemRows = (
    await db.prepare(`SELECT order_id, service_id, pax_code, catalog_price, unit_price, line_total FROM order_item WHERE order_id IN (SELECT value FROM json_each(?1))`).bind(ids).all<SubtotalItemRow>()
  ).results;
  return buildSubtotalServices(serviceRows, itemRows);
}

/** Cột gốc của `orders` cần để tính tiền hiệu lực khi đơn KHÔNG có điều chỉnh (dùng thẳng) hoặc CÓ điều chỉnh (nền cho `effectiveSubtotal`). */
export interface OrderMoneyBase {
  id: string;
  discount: number;
  depositAmount: number;
  total: number;
  remainingAmount: number;
}

/**
 * Tiền HIỆU LỰC cho NHIỀU đơn cùng lúc — NGUỒN DUY NHẤT dùng chung cho `toSummaryDtos` (today/`listOrders`) VÀ hai khối còn lại của `getDashboard`
 * (unpaid, revenueWeek); trước đây BA nơi này tự đọc `adj.subtotalAfter` (cột đã lưu, có thể SAI với đơn cũ — Đợt E task 7) theo BA vòng lặp
 * riêng — nay gộp vào MỘT hàm. Đơn KHÔNG có trong `latestAdjustments` (chưa từng điều chỉnh): trả thẳng `total`/`remainingAmount` GỐC, không đọc
 * gì thêm. Đơn CÓ điều chỉnh: tính lại subtotal từ `getServicesForSubtotal` (order_service/order_item GỐC) + `after` bằng `effectiveSubtotal` —
 * CÙNG hàm trang chi tiết đơn dùng (`money-adjustment.ts:applyAdjustmentToOrder`) — rồi suy total/remainingAmount bằng `effectiveMoney`.
 */
export async function computeEffectiveMoney(
  db: D1Database,
  orders: readonly OrderMoneyBase[],
  latestAdjustments: ReadonlyMap<string, LatestAdjustmentOverlay>,
): Promise<Map<string, { total: number; remainingAmount: number }>> {
  const adjustedIds = orders.filter((o) => latestAdjustments.has(o.id)).map((o) => o.id);
  const servicesByOrder = await getServicesForSubtotal(db, adjustedIds);
  const out = new Map<string, { total: number; remainingAmount: number }>();
  for (const o of orders) {
    const adj = latestAdjustments.get(o.id);
    if (adj === undefined) {
      out.set(o.id, { total: o.total, remainingAmount: o.remainingAmount });
      continue;
    }
    const subtotal = effectiveSubtotal(servicesByOrder.get(o.id) ?? [], adj.after);
    out.set(o.id, effectiveMoney(subtotal, o.discount, o.depositAmount));
  }
  return out;
}

/**
 * Ghi một dòng điều chỉnh MỚI tại đúng `expectedSeq` (= `(dòng gần nhất.seq ?? 0) + 1`, route tính lúc đọc). KHÔNG dùng WHERE-guard so sánh
 * "dòng gần nhất còn đúng không" (không đáng tin cậy giữa hai lời gọi `db.batch()` RIÊNG BIỆT của hai request khác nhau — đã thử, quan sát được
 * hai request cùng thắng khi chạy thật). Thay vào đó dựa thẳng vào chỉ mục duy nhất `idx_order_money_adjustment_seq`: hai request cùng nhắm
 * `expectedSeq` giống nhau, chỉ MỘT lần INSERT thắng, lần kia bị CSDL tự chặn (`isAdjustmentSeqCollision`) → 409 stale, không cần đoán trước ai thắng.
 * `id` dùng CHUNG cho dòng điều chỉnh và dòng audit_log (ADR-0007 điều 2 — không lặp ai/khi nào/lý do). Batch thất bại thì cả hai câu đều không
 * được ghi (giao dịch), nên audit không cần `onlyIf` như `cancelOrder`/`updateDraftOrder`.
 */
export async function insertMoneyAdjustment(
  db: D1Database,
  orderId: string,
  staffId: string,
  expectedSeq: number,
  before: AdjustmentEntry[],
  after: AdjustmentEntry[],
  subtotalBefore: number,
  subtotalAfter: number,
  reason: string,
): Promise<boolean> {
  const id = crypto.randomUUID();
  const at = new Date().toISOString();
  try {
    await db.batch([
      db
        .prepare(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, orderId, expectedSeq, JSON.stringify(before), JSON.stringify(after), subtotalBefore, subtotalAfter),
      auditStatement(db, { id, orderId, staffId, action: "order_money_adjusted_by_field", at, detail: reason }),
    ]);
    return true;
  } catch (e) {
    if (isAdjustmentSeqCollision(e)) return false;
    throw e;
  }
}


/**
 * Sửa trường vận hành của các dịch vụ (Q9): đơn nháp HOẶC đã xác nhận, còn khớp mốc `updated_at`. Số khách, dịch vụ, tiền không đổi ở đây
 * (trigger 0008 chặn nếu một đường code quên). Trả false nếu đơn đã huỷ / đã bị người khác sửa.
 */
export async function updateTrip(
  db: D1Database,
  orderId: string,
  staffId: string,
  updates: { id: string; trip: ValidTrip }[],
  expectedUpdatedAt: string,
  detail: string,
  legOps: readonly LegOp[] = [],
  /** Dấu đặt gấp MỚI cho MỌI chặng đổi / thêm của lệnh này (nhánh `datGap`); null = bỏ dấu cũ của chặng đổi (I16). */
  datGap: DatGapWrite | null = null,
): Promise<boolean> {
  const at = nextStamp(expectedUpdatedAt);
  const auditId = crypto.randomUUID();
  const guard = wonGuard(auditId);
  const results = await db.batch([
    db.prepare(`UPDATE orders SET updated_at = ? WHERE id = ? AND status IN ('draft', 'confirmed') AND updated_at = ?`).bind(at, orderId, expectedUpdatedAt),
    auditStatement(db, { id: auditId, orderId, staffId, action: "trip_updated", at, detail }, "changes() > 0"),
    // `pickup_time`/`pickup_place` ghi GIÁ TRỊ DẪN XUẤT từ chặng sau khi trộn (ADR-0047 R3 — ghi kép; `keHoachChangTrip` đã đặt `trip`).
    ...updates.map(({ id, trip: t }) =>
      db
        .prepare(
          `UPDATE order_service SET depart_date = ?, depart_time = ?, pickup_time = ?, pickup_place = ?, checkin_date = ?, checkin_time = ?, checkin_place = ?, note = ?
           WHERE id = ? AND order_id = ? AND ${guard.sql}`,
        )
        .bind(t.departDate, t.departTime, t.pickupTime, t.pickupPlace, t.checkinDate, t.checkinTime, t.checkinPlace, t.note, id, orderId, ...guard.binds),
    ),
    // ADR-0047 R2c/R4e: thao tác trên chặng (dời ngày, trộn giờ/nơi cũ, thêm/đóng chiều đi) — mọi câu có lính gác.
    ...legOps.map((op) => {
      if (op.kind === "update") return legUpdateGuarded(db, op.legId, orderId, op.fields, at, staffId, auditId, datGap);
      if (op.kind === "close") return legCloseGuarded(db, op.legId, orderId, op.reason, at, staffId, auditId);
      return legInsertGuarded(db, legWriteOf(op.leg, op.serviceId, orderId, staffId, at, new Map(), datGap), auditId);
    }),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}

/**
 * SỐ KHÁCH HIỆU LỰC (ADR-0047 A3) của các dòng dịch vụ đã đọc: số đã lưu, phủ dòng điều chỉnh GẦN NHẤT của chính đơn chứa dịch vụ qua ĐÚNG
 * `getLatestAdjustments` → `parseAdjustmentAfter` → `applyAdjustedPax` (một nguồn — bài học Đợt E). Dùng chung cho hàm công bố `soKhachHieuLuc` và cờ
 * "danh sách nhiều hơn số khách" (R9).
 */
export async function effectivePax(db: D1Database, rows: readonly ServicePaxRow[]): Promise<Map<string, PaxCounts>> {
  const latest = await getLatestAdjustments(db, [...new Set(rows.map((r) => r.order_id))]);
  const afterByOrder = new Map(Array.from(latest, ([id, a]) => [id, a.after] as const));
  return new Map(applyAdjustedPax(rows, afterByOrder).map((r) => [r.id, { adult: r.pax_adult, child: r.pax_child, senior: r.pax_senior, infant: r.pax_infant }] as const));
}

/**
 * Sửa danh sách hành khách của đơn ĐÃ XÁC NHẬN (ADR-0047 A2, Ruling R8) — khoá lạc quan theo `orders.updated_at` (câu đầu `order_touch`). Sau nhật ký
 * (`detail` chỉ số lượng): chèn dòng mới (thêm; sửa = dòng trỏ dòng hiện hành, cùng person_key) rồi huỷ dòng (theo ĐÚNG thứ tự kế hoạch: mỗi người mới trước
 * cũ sau). Mọi câu sau nhật ký mang lính gác. Trả true ⇔ câu đầu đã áp dụng.
 */
export async function writePassengerChange(
  db: D1Database,
  orderId: string,
  staffId: string,
  plan: { expected: string; chen: readonly { id: string; personKey: string; previousId: string | null; fullName: string; birthYear: number; paxCode: PaxCode | null }[]; huy: readonly string[]; detail: string },
): Promise<boolean> {
  const at = nextStamp(plan.expected);
  const auditId = crypto.randomUUID();
  const results = await db.batch([
    orderTouch(db, orderId, at, plan.expected),
    auditStatement(db, { id: auditId, orderId, staffId, action: "order_passenger_changed", at, detail: plan.detail }, "changes() > 0"),
    ...plan.chen.map((p) =>
      passengerInsertGuarded(db, { id: p.id, orderId, ten: p.fullName, birthYear: p.birthYear, paxCode: p.paxCode, previousId: p.previousId, personKey: p.personKey, at, by: staffId }, auditId),
    ),
    ...plan.huy.map((rowId) => passengerVoidGuarded(db, rowId, orderId, at, staffId, auditId)),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}

// ---- Route chặng SAU XÁC NHẬN (ADR-0047 A1) ---------------------------------------------------------------------------------------------------
// Lô: câu ĐẦU tự quyết thắng/thua (khoá lạc quan) → nhật ký `changes() > 0` (id riêng) → mọi câu sau mang lính gác của CHÍNH dòng nhật ký đó:
// ghi chặng / đẩy mốc đơn (form khác đang mở thấy "vừa có người sửa") / GHI KÉP hai cột cũ (R3). Trả true ⇔ câu đầu đã áp dụng.

const later = (a: string, b: string): string => (a > b ? a : b);

/** Thêm chặng — khoá lạc quan theo `orders.updated_at` (câu đầu `order_touch`: chỉ đơn ĐÃ XÁC NHẬN, đúng mốc). */
export async function addLeg(
  db: D1Database,
  orderId: string,
  staffId: string,
  plan: { serviceId: string; leg: ChangHopLe; expected: string; detail: string; mirror: { pickupTime: string | null; pickupPlace: string | null }; datGap?: DatGapWrite | null },
): Promise<boolean> {
  const at = nextStamp(plan.expected);
  const auditId = crypto.randomUUID();
  const results = await db.batch([
    orderTouch(db, orderId, at, plan.expected),
    auditStatement(db, { id: auditId, orderId, staffId, action: "order_leg_added", at, detail: plan.detail }, "changes() > 0"),
    legInsertGuarded(db, legWriteOf({ ...plan.leg, id: null }, plan.serviceId, orderId, staffId, at, new Map(), plan.datGap ?? null), auditId),
    serviceMirrorUpdateGuarded(db, plan.serviceId, orderId, plan.mirror, auditId),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}

/** Sửa / đóng chặng — khoá lạc quan theo `updated_at` CỦA CHẶNG (câu đầu `leg_update_checked` / `leg_close_checked`); đẩy mốc đơn nếu mốc đơn còn đúng. */
export async function changeLeg(
  db: D1Database,
  orderId: string,
  staffId: string,
  orderUpdatedAt: string,
  plan:
    | {
      kind: "update"; legId: string; serviceId: string; fields: LegFields; expected: string; detail: string; mirror: { pickupTime: string | null; pickupPlace: string | null };
      /** Dấu đặt gấp MỚI (nhánh `datGap`) hoặc null = bỏ dấu cũ (nội dung chặng đổi — I16). */
      datGap: DatGapWrite | null;
    }
    | { kind: "close"; legId: string; serviceId: string; reason: LyDoDongChang; expected: string; detail: string; mirror: { pickupTime: string | null; pickupPlace: string | null } },
): Promise<boolean> {
  const at = nextStamp(later(plan.expected, orderUpdatedAt));
  const auditId = crypto.randomUUID();
  const first =
    plan.kind === "update"
      ? legUpdateChecked(db, plan.legId, orderId, plan.fields, at, staffId, plan.expected, plan.datGap)
      : legCloseChecked(db, plan.legId, orderId, plan.reason, at, staffId, plan.expected);
  const results = await db.batch([
    first,
    auditStatement(db, { id: auditId, orderId, staffId, action: plan.kind === "update" ? "order_leg_updated" : "order_leg_closed", at, detail: plan.detail }, "changes() > 0"),
    orderTouchGuarded(db, orderId, at, orderUpdatedAt, auditId),
    serviceMirrorUpdateGuarded(db, plan.serviceId, orderId, plan.mirror, auditId),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}

/**
 * Đổi khách (ADR-0011 điều 2): hồ sơ người đặt + tên/SĐT chụp trên đơn, cho đơn NHÁP hoặc ĐÃ XÁC NHẬN, còn khớp mốc `updated_at`. Không đụng tiền, dịch vụ,
 * số khách. `booker.before` (hồ sơ mới) đứng TRƯỚC câu UPDATE vì khoá ngoại. Trả false nếu đơn đã huỷ / đã bị người khác sửa.
 */
export async function changeBooker(
  db: D1Database,
  orderId: string,
  staffId: string,
  change: { customerName: string; customerPhone: string; expectedUpdatedAt: string },
  booker: BookerWrite,
  detail: string,
): Promise<boolean> {
  const at = nextStamp(change.expectedUpdatedAt);
  const results = await db.batch([
    ...booker.before,
    db
      .prepare(
        `UPDATE orders SET customer_name = ?, customer_phone = ?, booker_party_id = ${BOOKER_VALUE}, updated_at = ?
         WHERE id = ? AND status IN ('draft', 'confirmed') AND updated_at = ?`,
      )
      .bind(change.customerName, change.customerPhone, booker.partyId, booker.partyId, at, orderId, change.expectedUpdatedAt),
    auditStatement(db, { orderId, staffId, action: "booker_changed", at, detail }, "changes() > 0"),
  ]);
  return (results[booker.before.length]!.meta.changes ?? 0) > 0;
}
