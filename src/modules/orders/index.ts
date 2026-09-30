// Module orders — sổ đơn hàng (spec §2.1 order/order_service/order_item, §2.3 bất biến). Route: /api/orders*.
// Mọi nhân viên đang hoạt động xem được mọi đơn (§2.4-4); chỉ người lập đơn, người phụ trách đang mở của đơn (ADR-0009) hoặc admin được sửa/xác nhận/huỷ.
// "Người phụ trách" do module `dispatch` giữ: `orders` KHÔNG import `dispatch` mà hỏi qua `ctx.isAssigned(orderId)` (gốc lắp ráp tiêm — ADR-0007 điều 4(b)).
import { auditStatement, getAuditTrail } from "../audit";
import type {
  CanhBaoMocDto, CatalogChangeDto, CatalogChangedBody, DashboardResponse, IncompleteTripBody, MyAssignmentDto, NhapTayResponse, OrderDetailDto, OrderDetailResponse,
  OrderListResponse, MocToiThieuResponse, OrderResponse, PassengerListResponse, PaxCounts, PoolResponse, ShortNoticeRequiredBody,
} from "../../shared/contracts";
import { UUID_RE, error, intParam, json, readJson } from "../../shared/http";
import { can, seesOnlyAssignedOrders, type PermissionHolder } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { vnToday, vnWeekRange } from "../../shared/vn-date";
import { docLocDon } from "../../shared/loc-don";
import { editablePaxCodesOf, planMoneyEdit } from "./money-adjustment";
import {
  addLeg, cancelOrder, changeBooker, changeLeg, cocCuNhap, confirmOrder, createOrder, effectivePax, findOrder, getDashboard, getDepartDates, getLatestAdjustment, getMeta, getOrderRef,
  getServicesForSubtotal, getStoredServices, insertMoneyAdjustment, listOrders, listPoolSources, updateDraftOrder, updateTrip, writePassengerChange,
} from "./repository";
import {
  legById, legDatGapByOrder, legLichChungNhapRows, legLichChungRows, legShortNotice, legTripRows, manualPolicy, manualPolicyInsert, orderContactRows, passengerRowsByOrders,
  servicePaxByIds, type DatGapWrite,
} from "./chang-hanh-khach-repo";
import { khoaNoi } from "../../shared/khoa-noi";
import { CHIEU_LABEL, LY_DO_DAT_GAP } from "../../shared/chang-dua-don";
import { nguongMocVn, type MocToiThieu } from "../../shared/moc-toi-thieu";
import { canhBaoMocCua, chepDatGapNhap, docDatGap, duoiMocKhiSua, ghiDatGapNhatKy, lichSuTheoVai } from "./dat-gap";
import { dongHienHanh } from "../../shared/hanh-khach";
import { maskLongDigits } from "../../shared/text-guards";
import { toPoolOrders } from "./pool";
import {
  PARTNER_DISCOUNT_CAP, PARTNER_DISCOUNT_MESSAGE, RETAIL_PRICE_MESSAGE, discountWithinCap, duocNhapTay, holdsPartner, lyDoKhongNhapTay, manualFreezeViolation,
  retailPricesOnly,
} from "./price-guards";
import { canTransition, hasHandlerPick, parseHandlerPick, validateBookerChange, validateOrder, type Failure, type OrderStatus, type ValidOrder } from "./rules";
import {
  keHoachChangTrip, loadOrderView, passengerList, planAddLeg, planCloseLeg, planEditLeg, planPassengerChange, resolveBooker, resolveLegPlaces, validationContext,
  type OrderValidationContext,
} from "./service";
import { confirmGaps, describeTripUpdates, summarizeDeviations, validateTripUpdate } from "./service-rules";

const FORBIDDEN = () => error(403, "forbidden", "Chỉ người lập đơn, người phụ trách đơn hoặc quản trị viên mới được thay đổi đơn này.");
const CANNOT_CREATE = () => error(403, "forbidden", "Tài khoản này không được lập đơn.");
/** Chọn người phụ trách lúc lập đơn cần `dispatch.assign` trên đơn của chính mình (ADR-0030 S20-4, G4) — Thực tập, Đối tác không có. */
const CANNOT_PICK_HANDLER = () => error(403, "forbidden", "Tài khoản này không được chọn người phụ trách khi lập đơn. Bỏ chọn hướng dẫn viên rồi lưu lại.");
/** Từ chối XEM (đơn, tiền, liên hệ khách — ADR-0019 điều 2): không cắt bớt trường, trả 403 cả phản hồi. */
const FORBIDDEN_VIEW = () => error(403, "forbidden", "Tài khoản này không được xem thông tin này.");
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy đơn.");
const NOT_EDITABLE = () => error(409, "not_editable", "Chỉ sửa được đơn đang chờ xác nhận. Muốn đổi đơn đã xác nhận, hãy huỷ và tạo đơn mới.");
const CANCELLED = () => error(409, "not_editable", "Đơn đã huỷ, không sửa được.");
/** Sổ tiền lượt 1 (ADR-0025 đ5): đơn đã "Đã giao – đã thu đủ" bị khoá — mọi route ghi từ chối SỚM bằng câu tiếng Việt (trigger 0044 là lưới cuối). */
const DA_GIAO = () => error(409, "order_delivered", "Đơn đã Đã giao – đã thu đủ: không sửa, huỷ hay đổi người phụ trách được nữa. Sai sót thì Kế toán ghi điều chỉnh trong sổ.");
const STALE = () => error(409, "stale", "Đơn vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
const RACED = () => error(409, "invalid_transition", "Đơn vừa được người khác đổi trạng thái, hãy tải lại.");
const PARTNER_PRICE = () => error(403, "forbidden", RETAIL_PRICE_MESSAGE);
const PARTNER_DISCOUNT = () => error(403, "forbidden", PARTNER_DISCOUNT_MESSAGE);
/** ADR-0047 Ruling R1: chặng / danh sách khách của ĐƠN NHÁP đi trong thân `POST/PUT /api/orders`; route riêng chỉ nhận đơn đã xác nhận. */
const USE_ORDER_FORM = () => error(409, "use_order_form", "Đơn nháp: sửa đưa đón và danh sách hành khách ngay trong form đơn.");
const LEG_NOT_FOUND = () => error(404, "leg_not_found", "Không tìm thấy chặng đưa đón của đơn này.");
const LEG_CLOSED = (message = "Chặng đưa đón này đã bỏ — không sửa được.") => error(409, "leg_closed", message);
const CANNOT_WRITE_PASSENGERS = () => error(403, "forbidden", "Tài khoản này không được nhập danh sách hành khách của đơn này.");
/** ADR-0049 D3: đặt gấp chặng dưới mốc — chỉ Quản trị, Toàn quyền (ô `order.leg.short_notice`). */
const CANNOT_SHORT_NOTICE = () => error(403, "forbidden", "Chỉ Quản trị hoặc Toàn quyền được đặt gấp chặng đưa đón.");
/** Mốc tối thiểu chưa có (bảng chính sách rỗng / môi trường không tiêm) — CHẶN lệnh cần mốc, không đoán con số (I25). */
const MOC_CHUA_CO = () => error(503, "moc_toi_thieu_chua_co", "Chưa có chính sách điều phối đang hiệu lực (mốc tối thiểu) — báo người phụ trách hệ thống.");
/** I14 (Q3 chủ): sửa / thêm chặng đơn ĐÃ XÁC NHẬN dưới mốc cần Quản trị, Toàn quyền + lý do đặt gấp trong CHÍNH lệnh. */
const SUA_DUOI_MOC = () =>
  error(409, "short_notice_required", "Chặng dưới mốc tối thiểu trước giờ đón — chỉ Quản trị hoặc Toàn quyền sửa được, kèm lý do đặt gấp.");

/**
 * Nhánh `datGap` của lệnh sửa / thêm chặng (ADR-0049 I14): thân CÓ khoá `datGap` → phải có ô `order.leg.short_notice` (403) và lý do hợp lệ (400) → dấu MỚI
 * (số phút = mốc hiện hành); VẮNG mà lệnh sửa dưới mốc → 409; vắng và không dưới mốc → null (nội dung đổi thì dấu cũ bỏ — I16).
 */
function xetDatGapSua(
  staff: PermissionHolder & { id: string }, body: Record<string, unknown> | null, duoiMoc: boolean, moc: MocToiThieu,
): { ok: true; value: DatGapWrite | null } | { ok: false; res: Response } {
  const raw = body && typeof body === "object" ? body.datGap : undefined;
  if (raw === undefined || raw === null) return duoiMoc ? { ok: false, res: SUA_DUOI_MOC() } : { ok: true, value: null };
  if (!can(staff, "order.leg.short_notice")) return { ok: false, res: CANNOT_SHORT_NOTICE() };
  const d = docDatGap(raw);
  if (!d.ok) return { ok: false, res: error(400, "invalid_input", d.message) };
  return { ok: true, value: { lyDo: d.value.lyDo, ghiChu: d.value.ghiChu, by: staff.id, at: new Date().toISOString(), phut: moc.phut } };
}
/** Chủ H4 / N-14: người xem thấy ĐỦ dấu đặt gấp (lý do, người duyệt, lúc, ghi chú) hay chỉ cờ — MỘT câu hỏi bảng quyền cho mọi phản hồi chi tiết đơn. */
const xemDuDatGap = (staff: PermissionHolder): boolean => can(staff, "order.leg.short_notice.view");
const kemDatGap = (detail: string, d: DatGapWrite | null) => (d ? `${detail}${ghiDatGapNhatKy(LY_DO_DAT_GAP[d.lyDo as keyof typeof LY_DO_DAT_GAP])}` : detail);

/** Cảnh báo mốc (I27) + con số mốc (I31) cho phản hồi LẬP / SỬA NHÁP. `moc` null = nháp không chặng (không hỏi mốc). */
async function phanHoiMoc(db: D1Database, orderId: string, order: OrderDetailDto, moc: MocToiThieu | null): Promise<{ canhBaoMoc: CanhBaoMocDto[]; mocToiThieuPhut: number | null }> {
  if (!moc) return { canhBaoMoc: [], mocToiThieuPhut: null };
  const daDatGap = new Set((await legDatGapByOrder(db, orderId)).map((r) => r.id));
  return { canhBaoMoc: canhBaoMocCua(order.services.flatMap((s) => s.legs), daDatGap, Date.now(), moc.phut), mocToiThieuPhut: moc.phut };
}
/** Thân yêu cầu CÓ khoá `passengers` (kể cả `[]`) — ADR-0047 R2b: vắng = giữ danh sách đang lưu, không hỏi ô. */
const hasPassengersKey = (body: Record<string, unknown> | null): boolean => body !== null && typeof body === "object" && "passengers" in body;

/** Lỗi lập kế hoạch sửa/đóng chặng → phản hồi. */
function legFailure(f: { code: "invalid_input" | "leg_not_found" | "leg_closed"; message: string }): Response {
  if (f.code === "leg_not_found") return LEG_NOT_FOUND();
  if (f.code === "leg_closed") return LEG_CLOSED(f.message);
  return error(400, "invalid_input", f.message);
}

/** Câu đầu lô sửa/đóng chặng không áp dụng: vì chặng vừa bị bỏ, đơn vừa huỷ, hay vì mốc chặng đã cũ? Đọc lại để trả đúng lý do. */
async function legRaced(db: D1Database, orderId: string, legId: string): Promise<Response> {
  const [now, leg] = await Promise.all([getMeta(db, orderId), legById(db, legId, orderId)]);
  if (now?.status === "cancelled") return CANCELLED();
  if (leg?.closed_at) return LEG_CLOSED();
  return STALE();
}

/**
 * DK-T3-01 (kiểm toán 24/9; chủ dự án trả lời 2026-09-26) — các kiểm RIÊNG chạy SAU `validateOrder` ở POST/PUT đơn (luật thuần: `price-guards.ts`),
 * theo thứ tự: R1 — khi KHÔNG `duocNhapTay` (ADR-0061: tài khoản có quyền Đối tác TRƯỚC, rồi công tắc TẮT, rồi không có ô `order.service.manual`) dịch vụ
 * nhập tay mới / sửa tên-giá dịch vụ nhập tay cũ → 400 `invalid_input` (câu theo lý do); R2 (tài khoản có quyền Đối tác) đơn giá khác giá danh mục → 403
 * `forbidden`; R3 (tài khoản có quyền Đối tác) giảm giá cấp đơn vượt trần — hôm nay trần 0, "tạm không cho giảm" (chủ dự án 26/9) → 403 `forbidden`.
 * `batNhapTay` = công tắc nhập tay, route đọc MỘT lần mỗi request (`manualPolicy`). null = đạt. MỌI route gọi `validateOrder` phải gọi hàm này (bài tĩnh
 * `src/nhap-tay-guard.test.ts` — route sửa sau xác nhận C2 tương lai không lách được).
 */
function priceGuard(staff: PermissionHolder, order: ValidOrder, ctx: OrderValidationContext, batNhapTay: boolean): Response | null {
  const lyDo = lyDoKhongNhapTay(staff, batNhapTay);
  const frozen = lyDo === null ? null : manualFreezeViolation(order.services, ctx.stored, lyDo);
  if (frozen) return error(400, "invalid_input", frozen);
  if (holdsPartner(staff) && !retailPricesOnly(order.items)) return PARTNER_PRICE();
  if (holdsPartner(staff) && !discountWithinCap(order.discount, PARTNER_DISCOUNT_CAP)) return PARTNER_DISCOUNT();
  return null;
}

/** Lỗi kiểm đầu vào → phản hồi: tab cũ 409, giá danh mục vừa đổi 409 kèm chi tiết, còn lại 400. */
function failure(f: Failure): Response {
  if (f.code === "client_outdated") return error(409, "client_outdated", f.message);
  if (f.code === "catalog_changed") {
    return json({ error: { code: "catalog_changed", message: f.message, changes: f.details as CatalogChangeDto[] } } satisfies CatalogChangedBody, 409);
  }
  return error(400, f.code ?? "invalid_input", f.message);
}

/**
 * API công khai cho module khác (`dispatch`, cạnh dispatch → orders — ADR-0006 điều 8): đơn có tồn tại không, AI LẬP, trạng thái, và mốc `updated_at`
 * (để `dispatch` truyền vào khoá lạc quan khi tự ghi qua `cancelOrderByHandler` — khoá theo CẢ `status` VÀ `updated_at`, T1d). Chỉ trả các trường này,
 * không lộ gì khác của đơn; null nếu không có đơn.
 */
export async function findOrderOwner(db: D1Database, id: string): Promise<{ staffId: string; status: OrderStatus; updatedAt: string } | null> {
  const meta = await getMeta(db, id);
  return meta ? { staffId: meta.staffId, status: meta.status, updatedAt: meta.updatedAt } : null;
}

/**
 * API công khai cho GỐC LẮP RÁP (src/index.ts — Bảng tin, ADR-0022): mã đơn (`orders.order_code`) + AI LẬP, để dựng sự kiện 5 khoá (điều 4) và tính nhãn
 * người nhận `nguoi:<người lập>` (NT-2). Chỉ hai trường này — không tên/SĐT khách, không tiền; null nếu không có đơn. Module bảng tin KHÔNG gọi hàm này
 * (hạng KHONG_DB, không import module nào): gốc lắp ráp đọc rồi truyền dữ liệu vào.
 */
export async function findOrderRef(db: D1Database, id: string): Promise<{ staffId: string; orderCode: string } | null> {
  return getOrderRef(db, id);
}

/**
 * API công khai cho `dispatch` (DK-T4-02): ngày khởi hành của từng dịch vụ trong đơn (null = chưa có ngày). `dispatch` đưa vào luật thuần
 * `tripDeparted` (`src/shared/trip-rules.ts`) để chặn hướng dẫn viên huỷ tour đã qua ngày đi — không đọc thẳng bảng `order_service`.
 */
export async function findOrderDepartDates(db: D1Database, id: string): Promise<(string | null)[]> {
  return getDepartDates(db, id);
}

/**
 * API công khai (ADR-0047 A3) — SỐ KHÁCH HIỆU LỰC của từng dịch vụ: số đã lưu ở `order_service`, phủ dòng điều chỉnh GẦN NHẤT của chính đơn chứa dịch
 * vụ đó (ADR-0014 điều 6) qua ĐÚNG `getLatestAdjustments` → `money-adjustment.ts:parseAdjustmentAfter` → `applyAdjustedPax` — một nguồn với danh sách
 * đơn, Trang chủ, hàng chờ (bài học Đợt E: không viết bộ phân tích `after_json` thứ hai). Id lạ: không có trong Map. Không module nào khác đọc
 * `order_money_adjustment`/`after_json` (bài quét src/orders-cong-bo.test.ts).
 * KHÔNG tự kiểm quyền — nơi gọi phải đứng sau `can()` (bài quét nơi gọi ở src/orders-cong-bo.test.ts).
 */
export async function soKhachHieuLuc(db: D1Database, serviceIds: readonly string[]): Promise<Map<string, PaxCounts>> {
  return effectivePax(db, await servicePaxByIds(db, serviceIds));
}

/** Một chặng cho tài xế / chuyến xe (ADR-0047 A3) — ĐÚNG các khoá này; thêm khoá = sửa bài liệt kê khoá ở src/modules/orders/ham-cong-bo.test.ts. */
export interface ChangChoChuyen {
  legId: string;
  orderId: string;
  orderCode: string;
  /** Tên dịch vụ (nhập tay là chữ tự do) — đã che dãy từ 8 chữ số. */
  serviceName: string;
  direction: "OUT" | "RETURN";
  pickupDate: string | null;
  pickupTime: string | null;
  /** Tên điểm danh mục hoặc chữ tự do — đã che dãy số. */
  noiDon: string;
  noiTra: string | null;
  /** Số khách HIỆU LỰC của dịch vụ (chờ lượt 2 nếu có `pax_override`). */
  soNguoi: number;
  /** Người có tên (dòng hiện hành): khoá bền `personKey`, bản tên đã dùng `rowId`. */
  nguoi: { personKey: string; rowId: string; fullName: string; birthYear: number }[];
}

/**
 * API công khai — hàm đọc HẸP cho Vận chuyển (ADR-0047 A3): chặng CÒN MỞ của đơn ĐÃ XÁC NHẬN theo danh sách id chặng, mỗi phần tử dựng MỚI TỪNG KHOÁ (danh
 * sách trường được phép — khuôn `pool.ts`, Hiến chương 4.4): không tiền, ghi chú, người lập, SĐT, email. Chữ tự do (nơi, tên dịch vụ) che dãy số. Liên hệ
 * cho tài xế: chờ lượt 2 (Q3). Chưa module nào gọi hàm này (hôm nay 0 nơi gọi).
 * KHÔNG tự kiểm quyền — nơi gọi phải đứng sau `can()` (bài quét nơi gọi ở src/orders-cong-bo.test.ts).
 */
export async function hanhKhachChoChuyen(db: D1Database, legIds: readonly string[]): Promise<ChangChoChuyen[]> {
  const legs = await legTripRows(db, legIds);
  if (legs.length === 0) return [];
  const orderIds = [...new Set(legs.map((l) => l.order_id))];
  const [paxRows, people] = await Promise.all([servicePaxByIds(db, [...new Set(legs.map((l) => l.service_id))]), passengerRowsByOrders(db, orderIds)]);
  const pax = await effectivePax(db, paxRows);
  const current = new Map<string, ChangChoChuyen["nguoi"]>();
  for (const orderId of orderIds) {
    const rows = people.filter((p) => p.order_id === orderId).map((p) => ({
      id: p.id, personKey: p.person_key, previousId: p.previous_id, voided: p.voided === 1, fullName: p.ten, birthYear: p.birth_year, paxCode: p.pax_code, updatedAt: p.updated_at,
    }));
    current.set(orderId, dongHienHanh(rows).map((p) => ({ personKey: p.personKey, rowId: p.id, fullName: p.fullName, birthYear: p.birthYear })));
  }
  return legs.map((l) => {
    const p = pax.get(l.service_id);
    return {
      legId: l.id,
      orderId: l.order_id,
      orderCode: l.order_code,
      serviceName: maskLongDigits(l.service_name),
      direction: l.direction,
      pickupDate: l.pickup_date,
      pickupTime: l.pickup_time,
      noiDon: maskLongDigits(l.noi_don),
      noiTra: maskLongDigits(l.noi_tra),
      soNguoi: p ? p.adult + p.child + p.senior + p.infant : 0,
      nguoi: (current.get(l.order_id) ?? []).map((n) => ({ personKey: n.personKey, rowId: n.rowId, fullName: n.fullName, birthYear: n.birthYear })),
    };
  });
}

/** Một chặng cho LỊCH CHUNG điều phối (ADR-0049 D1) — ĐÚNG các khoá này; thêm khoá = sửa bài liệt kê khoá ở src/modules/orders/lich-chung-chang.test.ts. */
export interface ChangLichChung {
  legId: string;
  orderId: string;
  orderCode: string;
  /** Tên dịch vụ — đã che dãy từ 8 chữ số. */
  serviceName: string;
  direction: "OUT" | "RETURN";
  pickupDate: string;
  pickupTime: string | null;
  /** Tên điểm danh mục hoặc chữ tự do — ĐÃ CHE dãy số (hiển thị). */
  noiDon: string;
  noiDonDiemId: string | null;
  noiTra: string | null;
  noiTraDiemId: string | null;
  /** Số khách HIỆU LỰC của dịch vụ (cả bốn loại tuổi — LC-02). */
  soNguoi: number;
  /** Khoá người (`person_key`) của hành khách HIỆN HÀNH của đơn — chỉ khoá, không tên (I12). */
  nguoiCuaDon: string[];
  /** Chặng mang dấu đặt gấp. */
  datGap: boolean;
  /**
   * ADR-0050 VK1-B: KHOÁ SO SÁNH NƠI (`khoaNoi`, src/shared/khoa-noi.ts) tính trên chữ CHƯA che — CHỈ để so với `vc_trip_stop.place_key`; KHÔNG BAO GIỜ vào
   * DTO, nhật ký, bản chụp của van-chuyen. `khoaNoiTra` null = chặng chưa có nơi trả.
   */
  khoaNoiDon: string;
  khoaNoiTra: string | null;
}
/** Chặng của đơn NHÁP trên lịch chung (I11) — chỉ khoá, mã đơn, ngày giờ, cờ đặt gấp. */
export interface ChangNhapLichChung {
  legId: string;
  orderId: string;
  orderCode: string;
  pickupDate: string;
  pickupTime: string | null;
  datGap: boolean;
}

/**
 * API công khai — hàm đọc HẸP cho LỊCH CHUNG điều phối (ADR-0049 D1, lát 1.4; kế hoạch A11): chặng CÒN MỞ của đơn ĐÃ XÁC NHẬN có ngày đón trong
 * [tuNgay, denNgay] + chặng của đơn NHÁP (chỉ để đếm / duyệt đặt gấp). Dựng MỚI TỪNG KHOÁ (khuôn `pool.ts`): không tiền, ghi chú, người lập, liên hệ khách,
 * họ tên. Số người qua CÙNG `effectivePax` với `soKhachHieuLuc` (một nguồn). Hàm async vì băm khoá nơi (Web Crypto).
 * KHÔNG tự kiểm quyền — nơi gọi phải đứng sau `can()` (bài quét nơi gọi ở src/orders-cong-bo.test.ts).
 */
export async function lichChungChang(db: D1Database, tuNgay: string, denNgay: string): Promise<{ chang: ChangLichChung[]; nhap: ChangNhapLichChung[] }> {
  const [legs, nhap] = await Promise.all([legLichChungRows(db, tuNgay, denNgay), legLichChungNhapRows(db, tuNgay, denNgay)]);
  const orderIds = [...new Set(legs.map((l) => l.order_id))];
  const [paxRows, people] = legs.length === 0 ? [[], []] : await Promise.all([servicePaxByIds(db, [...new Set(legs.map((l) => l.service_id))]), passengerRowsByOrders(db, orderIds)]);
  const pax = await effectivePax(db, paxRows);
  const khoaNguoi = new Map<string, string[]>();
  for (const orderId of orderIds) {
    const rows = people.filter((p) => p.order_id === orderId).map((p) => ({
      id: p.id, personKey: p.person_key, previousId: p.previous_id, voided: p.voided === 1, fullName: p.ten, birthYear: p.birth_year, paxCode: p.pax_code, updatedAt: p.updated_at,
    }));
    khoaNguoi.set(orderId, dongHienHanh(rows).map((p) => p.personKey));
  }
  const chang = await Promise.all(legs.map(async (l): Promise<ChangLichChung> => {
    const p = pax.get(l.service_id);
    return {
      legId: l.id,
      orderId: l.order_id,
      orderCode: l.order_code,
      serviceName: maskLongDigits(l.service_name),
      direction: l.direction,
      pickupDate: l.pickup_date,
      pickupTime: l.pickup_time,
      noiDon: maskLongDigits(l.noi_don),
      noiDonDiemId: l.pickup_location_id,
      noiTra: maskLongDigits(l.noi_tra),
      noiTraDiemId: l.dropoff_location_id,
      soNguoi: p ? p.adult + p.child + p.senior + p.infant : 0,
      nguoiCuaDon: [...(khoaNguoi.get(l.order_id) ?? [])],
      datGap: l.dat_gap === 1,
      khoaNoiDon: (await khoaNoi({ locationId: l.pickup_location_id, placeText: l.pickup_place }))!,
      khoaNoiTra: await khoaNoi({ locationId: l.dropoff_location_id, placeText: l.dropoff_place }),
    };
  }));
  return {
    chang,
    nhap: nhap.map((n) => ({ legId: n.id, orderId: n.order_id, orderCode: n.order_code, pickupDate: n.pickup_date, pickupTime: n.pickup_time, datGap: n.dat_gap === 1 })),
  };
}

/** Liên hệ khách cho tài xế (ADR-0049 D3) — ĐÚNG bốn khoá. */
export interface LienHeTaiXe {
  orderId: string;
  orderCode: string;
  tenLienHe: string;
  sdtLienHe: string;
}
/**
 * API công khai — tên + SĐT người liên hệ của các đơn ĐÃ XÁC NHẬN được hỏi (ADR-0049 D3: tài xế chỉ thấy TRONG ngày chạy — route van-chuyen kiểm
 * `trongNgayChay` trước khi gọi). Rỗng → [] (không truy vấn).
 * KHÔNG tự kiểm quyền — nơi gọi phải đứng sau `can()` (bài quét nơi gọi ở src/orders-cong-bo.test.ts).
 */
export async function lienHeChoTaiXe(db: D1Database, orderIds: readonly string[]): Promise<LienHeTaiXe[]> {
  return (await orderContactRows(db, orderIds)).map((r) => ({ orderId: r.id, orderCode: r.order_code, tenLienHe: r.customer_name, sdtLienHe: r.customer_phone }));
}

/**
 * Huỷ đơn qua đường hẹp của người phụ trách CẤP HẸP (`FIELD`, ADR-0014 điều 11) — CHỈ đổi `status`/`updated_at`, không đụng dịch vụ hay cột tiền (đúng khoá
 * "đơn đã xác nhận không đổi tiền" — xem `docs/superpowers/specs/2026-09-22-khoa-tien-don-da-xac-nhan.md`). Route gọi hàm này SAU KHI đã tự kiểm
 * `status === "confirmed"` bằng `findOrderOwner`; hàm này chỉ còn lo tranh chấp (khoá lạc quan khoá theo CẢ `status` VÀ `updated_at`, T1d) nên vẫn
 * ràng buộc `from: "confirmed"` cho chắc.
 */
export async function cancelOrderByHandler(db: D1Database, id: string, staffId: string, prevUpdatedAt: string, reasonLabel: string): Promise<boolean> {
  return cancelOrder(db, id, staffId, "confirmed", prevUpdatedAt, { action: "order_cancelled_by_field", detail: reasonLabel });
}

// ---- Sổ tiền lượt 1 (ADR-0024 điều 3–4, ADR-0025): `orders` công bố trạng thái + "phải thu hiện hành" + hai câu mốc CHƯA CHẠY cho billing gộp vào
// MỘT db.batch() (quy tắc 3 ADR-0002). `orders` không đọc bảng của billing. KHÔNG tự kiểm quyền — route của billing hỏi can() trước.
export { donDangThuTien, phaiThuNhieuDon, thongTinGiaoDon, type PhaiThuDon, type ThongTinGiaoDon } from "./hoan-tat";
export { datGiaoStatement, hoanThanhStatement, type DatGiaoInput } from "./hoan-tat-repo";

/**
 * API công khai cho module `receipt` (biên nhận — ADR-0024 đ1): chi tiết đơn HIỆN HÀNH (đã áp điều chỉnh) để receipt CHÉP TỪNG trường được phép vào
 * `ReceiptDto` (danh sách trắng — không trải đối tượng). KHÔNG tự kiểm quyền — route của receipt hỏi can() trước khi trả.
 */
export const donChoBienNhan = (db: D1Database, id: string): Promise<OrderDetailDto | null> => loadOrderView(db, id, false);

export type MoneyEditResult = { ok: true } | { ok: false; code: "not_found" | "not_confirmed" | "invalid_input" | "stale"; message?: string };

/**
 * Sửa số khách qua đường hẹp của người phụ trách CẤP HẸP (FIELD, ADR-0014 điều 6) — CHỈ ghi thêm một dòng điều chỉnh, không đụng
 * order_service/order_item/cột tiền của orders. `body` là thân JSON THÔ (đã đọc từ request, route chưa kiểm). Mọi quyết định (kiểm dạng, lưu y
 * nguyên thì không ghi, tiền trước/sau theo ĐƠN GIÁ ĐÃ THOẢ THUẬN) nằm ở luật thuần `money-adjustment.ts:planMoneyEdit`; hàm
 * này chỉ đọc D1 → gọi luật → ghi. Tiền trước/sau tính bằng `effectiveSubtotal` trên MỌI dịch vụ (kể cả nhập tay — bài học Đợt E task 7/9, lưới
 * e2e ở `tests/e2e/dispatch.mjs` khối D3 đọc thẳng cột đã lưu).
 */
export async function editMoneyAsHandler(db: D1Database, orderId: string, staffId: string, body: Record<string, unknown> | null): Promise<MoneyEditResult> {
  const meta = await getMeta(db, orderId);
  if (!meta) return { ok: false, code: "not_found" };
  if (meta.status !== "confirmed") return { ok: false, code: "not_confirmed" };

  const [stored, latest, servicesByOrder] = await Promise.all([
    getStoredServices(db, orderId),
    getLatestAdjustment(db, orderId),
    getServicesForSubtotal(db, [orderId]),
  ]);
  const plan = planMoneyEdit({
    services: servicesByOrder.get(orderId) ?? [],
    storedPax: new Map(stored.map((s) => [s.id, s.pax])),
    latestAfter: latest?.after ?? null,
    body,
  });
  if (!plan.ok) return { ok: false, code: plan.code, message: plan.message };
  if (!plan.write) return { ok: true }; // y nguyên số khách: không ghi dòng điều chỉnh, không đổi tiền (DK-T2-01)

  const ok = await insertMoneyAdjustment(db, orderId, staffId, (latest?.seq ?? 0) + 1, plan.before, plan.after, plan.subtotalBefore, plan.subtotalAfter, plan.reason);
  return ok ? { ok: true } : { ok: false, code: "stale" };
}

/**
 * Dữ liệu cho màn "việc của tôi" (`GET /api/dispatch/mine`, module dispatch) — tái dùng `loadOrderView` (đã có overlay điều chỉnh, ADR-0014 điều 6)
 * rồi dựng lại TỪNG trường được phép (không trải đối tượng nguồn). Từ bản 1.6 (ADR-0030 S23-8, lượt 1): trả CẢ đơn nháp, chỉ loại đơn đã huỷ — trước đó
 * chỉ trả đơn đã xác nhận, nay HDV cũng thấy đơn nháp mình đang phụ trách (chưa có nút huỷ/sửa số khách cho đơn nháp: `myJobActions` ở giao diện quyết
 * theo `status`). Tiền: chủ dự án quyết 2026-09-27 (Task 1.8): HDV cần biết còn thu bao nhiêu — mở ĐÚNG ba trường tiền cấp đơn (`total`,
 * `depositAmount`, `remainingAmount`, số hiện hành sau điều chỉnh của `loadOrderView` — ADR-0017 điều 5), dựa trên quyền `money.view` (assigned) đã
 * cấp từ Task 1.5/ADR-0017; route hỏi ô đó trước khi gọi hàm này. Không giá từng dòng, không giảm giá, không ghi chú thanh toán.
 * `orderIds` do `dispatch` truyền vào (đơn mà staff gọi đang là người phụ trách — dispatch tự tra, orders
 * không biết khái niệm "người phụ trách"). `editablePaxCodes` tính từ đơn GỐC (`findOrder`, trước overlay) qua `editablePaxCodesOf` — KHÔNG tính từ
 * `items` của bản đã overlay (`loadOrderView`), vì overlay có thể bỏ hẳn dòng của một loại khách đã bị sửa về 0, làm loại đó biến mất khỏi ô nhập
 * (lỗi thật, kiểm độc lập 2026-09-22).
 */
export async function getMyAssignments(db: D1Database, orderIds: readonly string[]): Promise<MyAssignmentDto[]> {
  const [views, originals] = await Promise.all([
    Promise.all(orderIds.map((id) => loadOrderView(db, id, false))), // "việc của tôi" không trả chặng — không cần dấu đặt gấp
    Promise.all(orderIds.map((id) => findOrder(db, id))),
  ]);
  const originalById = new Map(originals.flatMap((o) => (o ? [[o.id, o] as const] : [])));
  return views
    .filter((o): o is OrderDetailDto => o !== null && o.status !== "cancelled")
    .map((o) => {
      const editableById = new Map(originalById.get(o.id)!.services.map((s) => [s.id, editablePaxCodesOf(s)]));
      return {
        orderId: o.id,
        orderCode: o.orderCode,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        status: o.status,
        total: o.total,
        services: o.services.map((s) => ({
          id: s.id,
          name: s.name,
          catalogCode: s.catalogCode,
          pax: s.pax,
          editablePaxCodes: [...(editableById.get(s.id) ?? [])],
          departDate: s.departDate,
          departTime: s.departTime,
          pickupTime: s.pickupTime,
          pickupPlace: s.pickupPlace,
          checkinDate: s.checkinDate,
          checkinTime: s.checkinTime,
          checkinPlace: s.checkinPlace,
          note: s.note,
        })),
      };
    });
}

export const ordersModule: AppModule = {
  name: "orders",
  routes: [
    // ADR-0061 điều 6: công tắc "Dịch vụ nhập tay". Hai route thuộc module orders (bảng ord_manual_service_policy) nhưng CỐ Ý không nằm dưới /api/orders:
    // đổi chính sách không phải thay đổi một đơn (không thuộc bài baoThayDoi của src/bang-tin-guard.test.ts), và tránh bẫy router ":id".
    // ĐỌC (cổng orders): form lập đơn biết hiện nút theo `duocDung` (= duocNhapTay của CHÍNH người gọi). Chỉ người lập đơn cần biết → hỏi order.create
    // (ADR-0019 điều 6: route sau cổng phải hỏi bảng; chỉ-HDV, Kế toán không lập đơn → 403). Toàn quyền có order.create nên màn cài đặt đọc cùng route.
    route("GET", "/api/cai-dat/nhap-tay", "orders", async ({ env, staff }) => {
      if (!can(staff, "order.create")) return error(403, "forbidden", "Tài khoản này không lập đơn nên không dùng dịch vụ nhập tay.");
      const { bat } = await manualPolicy(env.DB, new Date().toISOString());
      return json({ batNhapTay: bat, duocDung: duocNhapTay(staff, bat), doiDuoc: can(staff, "settings.ops") } satisfies NhapTayResponse);
    }),
    // GHI (cổng admin): chỉ ô settings.ops (hôm nay chỉ Toàn quyền — Quản trị qua cổng nhưng 403). Đổi = chèn dòng mới, valid_from_at = lúc ghi, không lùi
    // (đi SAU dòng mới nhất, không trùng UNIQUE). Gửi CÙNG trạng thái đang hiệu lực = 200, không ghi dòng, không nhật ký. Nhật ký không gắn đơn (orderId NULL).
    // Miễn trừ có tên ở bài NT-F7 (src/modules/billing/sau-da-giao.test.ts): không ghi đơn nào, không có đơn để khoá sau "Đã giao".
    route("POST", "/api/cai-dat/nhap-tay", "admin", async ({ env, request, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền bật / tắt được dịch vụ nhập tay.");
      const body = (await readJson(request)) as { batNhapTay?: unknown } | null;
      if (!body || typeof body !== "object" || typeof body.batNhapTay !== "boolean") return error(400, "invalid_input", "Chọn bật hoặc tắt dịch vụ nhập tay.");
      const muon = body.batNhapTay;
      const now = new Date();
      const hienTai = await manualPolicy(env.DB, now.toISOString());
      if (hienTai.bat !== muon) {
        const sau = hienTai.moiNhat && Date.parse(hienTai.moiNhat) >= now.getTime() ? new Date(Date.parse(hienTai.moiNhat) + 1) : now;
        const at = sau.toISOString();
        await env.DB.batch([
          manualPolicyInsert(env.DB, crypto.randomUUID(), muon, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "manual_service_policy_changed", at, targetType: "system", detail: muon ? "Bật dịch vụ nhập tay" : "Tắt dịch vụ nhập tay" }),
        ]);
      }
      return json({ batNhapTay: muon, duocDung: duocNhapTay(staff, muon), doiDuoc: true } satisfies NhapTayResponse);
    }),

    // Trang chủ (docs/superpowers/sdd/2026-09-23-trang-chu-moi): số liệu TOÀN CÔNG TY + "Chuyến đón hôm nay" (`OrderSummaryDto[]` có tên/SĐT khách, tiền).
    // ADR-0019 điều 1–2: cổng "orders" chỉ lọc thô; thân hỏi ba ô KHÔNG ngữ cảnh (= xem được MỌI đơn, mọi tiền, mọi liên hệ) TRƯỚC mọi truy vấn —
    // Đối tác/Thực tập (`own`) → 403. Nếu sau này `money.view`/`contact.view` của một mã bị thu hẹp (vd `assigned`), Trang chủ của mã đó 403 chứ
    // không trả số toàn công ty (Review Focus 4).
    // PHẢI đứng TRƯỚC route "GET /api/orders/:id" ở dưới: router (`match()`) khớp path theo VỊ TRÍ đoạn, nên ":id" cũng khớp chuỗi "dashboard" —
    // `createApp` lấy candidate ĐẦU TIÊN cùng method trong mảng `routes` (thứ tự khai ở đây), route này đứng trước nên thắng.
    // `ordersWithHandler` (ADR-0030 S20-13): tập đơn đang có người phụ trách cho ô "Chưa phụ trách" — gốc lắp ráp nối vào dispatch, orders không tự đọc.
    route("GET", "/api/orders/dashboard", "orders", async ({ env, staff, ordersWithHandler }) => {
      if (!can(staff, "order.view") || !can(staff, "money.view") || !can(staff, "contact.view")) return FORBIDDEN_VIEW();
      const today = vnToday(new Date());
      const { from, to } = vnWeekRange(today);
      const data = await getDashboard(env.DB, staff.id, today, from, to, ordersWithHandler);
      return json({ ...data, revenueWeek: { ...data.revenueWeek, from, to } } satisfies DashboardResponse);
    }),

    // Hàng chờ nhận (ADR-0030 S23-1, S23-2): PHẦN HẸP của các đơn chưa có người phụ trách, chưa huỷ, chưa qua ngày đi — hướng dẫn viên xem để bấm Nhận
    // (`PUT /api/orders/:id/handler`, module dispatch). PHẢI đứng TRƯỚC "GET /api/orders/:id" (cùng lý do với route dashboard ở trên — ":id" cũng khớp
    // chữ "pool"; Review Focus 3). Kiểm quyền TRƯỚC mọi đọc: ô `order.pool.view` (Hướng dẫn viên, Toàn quyền — Quản trị KHÔNG có: đã thấy đủ mọi đơn
    // qua `order.view`) VÀ không mang quyền Đối tác (tài khoản lai, Q-M — một trong "bốn cửa" của S20-5). Không đòi `contact.view`: nơi đón/giờ đón ở
    // phần hẹp là ngoại lệ có tên của ô đó, bù bằng che dãy số (`pool.ts`). Tập đơn đang có người hỏi qua `ordersWithHandler` (gốc lắp ráp nối vào
    // dispatch — S20-13), không SQL nào của orders đọc view của dispatch.
    route("GET", "/api/orders/pool", "orders", async ({ env, staff, ordersWithHandler }) => {
      if (!can(staff, "order.pool.view") || holdsPartner(staff)) return FORBIDDEN_VIEW();
      const today = vnToday(new Date());
      const sources = await listPoolSources(env.DB, today);
      const withHandler = await ordersWithHandler(sources.map((o) => o.id));
      return json({ orders: toPoolOrders(sources, withHandler, today) } satisfies PoolResponse);
    }),

    // Mốc tối thiểu cho biểu mẫu đơn CHƯA lưu (ruling R-P15 của điều phối, 29/9 — kế hoạch I31 cách (a)): người LẬP đơn đọc con số mốc + cảnh báo sát mốc
    // của chính sách HIỆN HÀNH để màn cảnh báo "dưới mốc" ngay khi gõ (CHỈ hiển thị — máy chủ vẫn quyết lúc lưu / xác nhận: `canhBaoMoc`, 409). Không đọc
    // bảng vc_: qua hàm tiêm `ctx.mocToiThieu` (gốc lắp ráp); thiếu hàm tiêm / chính sách rỗng → 503 như cổng Xác nhận (không đoán con số). PHẢI đứng TRƯỚC
    // "GET /api/orders/:id" (cùng lý do với route dashboard, pool ở trên — ":id" cũng khớp chữ "moc-toi-thieu").
    route("GET", "/api/orders/moc-toi-thieu", "orders", async ({ staff, mocToiThieu }) => {
      if (!can(staff, "order.create")) return error(403, "forbidden", "Bạn không lập đơn nên không cần mốc tối thiểu.");
      const moc = await mocToiThieu();
      if (!moc) return MOC_CHUA_CO();
      return json({ mocToiThieuPhut: moc.phut, canhBaoPhut: moc.canhBaoPhut } satisfies MocToiThieuResponse);
    }),

    route("GET", "/api/orders", "orders", async ({ env, url, staff, myHandledOrderIds }) => {
      // BA NHÁNH LỌC (ADR-0030 S23-4, Review Focus 1), mỗi nhánh hỏi bảng quyền với ĐÚNG ngữ cảnh của tập đơn nó trả:
      //  (1) `can(order.view)` KHÔNG ngữ cảnh ("any" — SALES/ACCOUNTING/ADMIN/SUPER_ADMIN) → mọi đơn, không lọc;
      //  (2) "mình lập": `can(order.view, { ownerId: chính mình })` ("own" — PARTNER/INTERN) → đơn có người lập = chính mình;
      //  (3) "mình phụ trách": `can(order.view, { assigned: true })` ("assigned" — FIELD) → đơn đang phụ trách, tập lấy qua `ctx.myHandledOrderIds` (gốc
      //      lắp ráp nối vào dispatch; orders không đọc dữ liệu phân công). Tài khoản ghép (vd FIELD + INTERN) thấy HỢP (2) ∪ (3).
      // Không nhánh nào đúng → 403 (mã `none` lọt qua cổng cũng không bao giờ thành "mọi đơn"). ADR-0019 điều 2: danh sách trả tiền (`total`…) và liên
      // hệ khách (`customerPhone`) → hỏi `money.view`/`contact.view` cho TỪNG tập sẽ trả với đúng ngữ cảnh đó. Mọi câu hỏi quyền đứng TRƯỚC đọc tham
      // số và trước mọi truy vấn (403 không đứng sau 400).
      const seesAll = can(staff, "order.view");
      const mine = { ownerId: staff.id };
      const handling = { assigned: true };
      const own = !seesAll && can(staff, "order.view", mine);
      const handled = !seesAll && can(staff, "order.view", handling);
      if (!seesAll && !own && !handled) return FORBIDDEN_VIEW();
      if (seesAll && (!can(staff, "money.view") || !can(staff, "contact.view"))) return FORBIDDEN_VIEW();
      if (own && (!can(staff, "money.view", mine) || !can(staff, "contact.view", mine))) return FORBIDDEN_VIEW();
      if (handled && (!can(staff, "money.view", handling) || !can(staff, "contact.view", handling))) return FORBIDDEN_VIEW();
      // Bộ lọc nhiều điều kiện (góp ý T4): kiểm ở `docLocDon` (thuần) SAU mọi câu hỏi quyền; listOrders AND bộ lọc với phạm vi ở trên — không bao giờ nới.
      const loc = docLocDon(url.searchParams);
      if (!loc.ok) return error(400, "invalid_input", loc.message);
      const result = await listOrders(env.DB, {
        q: (url.searchParams.get("q") ?? "").trim().slice(0, 100),
        loc: loc.loc,
        limit: intParam(url.searchParams.get("limit"), 30, 1, 100),
        offset: intParam(url.searchParams.get("offset"), 0, 0, 100000),
        ownerId: own ? staff.id : null,
        // Tập rỗng (chưa phụ trách đơn nào) = danh sách rỗng, KHÔNG phải "không lọc" (listOrders coi [] là "không đơn nào").
        orderIds: handled ? await myHandledOrderIds() : null,
      });
      return json(result satisfies OrderListResponse);
    }),

    // Lập đơn. Đơn mới KHÔNG tự gắn người lập (ADR-0030 S20-4, ADR-0020 điều 1, Q-C): người lập chọn người phụ trách ngay trong form (`handlerStaffId`,
    // tuỳ chọn); không chọn → đơn chờ người nhận. Thứ tự: 403 (không lập đơn được) → đọc thân → 403 (có chọn người mà không có `dispatch.assign` trên đơn
    // của chính mình — Thực tập, Đối tác: G4; đứng TRƯỚC mọi 400 và mọi đọc CSDL) → 400 (dạng mã người được chọn) → 400/409 (đơn: validateOrder,
    // priceGuard, người đặt) → 400 `invalid_assignee` (người được chọn không đủ điều kiện — `dispatch` xét bằng `checkAssignee`; KHÔNG tạo đơn) → ghi.
    route("POST", "/api/orders", "orders", async ({ env, request, staff, newOrderHandler, baoThayDoi, mocToiThieu }) => {
      if (!can(staff, "order.create")) return CANNOT_CREATE();
      const body = await readJson(request);
      // ADR-0047 A2: thân có khoá `passengers` (danh sách khách của đơn nháp — Ruling R1) → hỏi thêm ô nhập tên khách trên đơn của chính mình.
      if (hasPassengersKey(body) && !can(staff, "order.passenger.write", { ownerId: staff.id })) return CANNOT_WRITE_PASSENGERS();
      if (hasHandlerPick(body) && !can(staff, "dispatch.assign", { ownerId: staff.id })) return CANNOT_PICK_HANDLER();
      const pick = parseHandlerPick(body);
      if (!pick.ok) return error(400, "invalid_input", pick.message);
      const ctx = await validationContext(env.DB, null);
      const parsed = validateOrder(body, ctx);
      if (!parsed.ok) return failure(parsed);
      const guard = priceGuard(staff, parsed.value, ctx, (await manualPolicy(env.DB, new Date().toISOString())).bat); // ADR-0061: công tắc đọc một lần
      if (guard) return guard;
      // ADR-0047 (R7, R3): điểm danh mục của chặng phải đang dùng; đặt hai khoá cũ = dẫn xuất từ chặng (ghi kép vào cột cũ).
      const placed = await resolveLegPlaces(env.DB, parsed.value, ctx);
      if (!placed.ok) return error(400, "invalid_input", placed.message);
      const booker = await resolveBooker(env.DB, placed.value.booker, staff.id, new Date());
      if (!booker.ok) return error(400, "invalid_input", booker.message);
      // ADR-0049 D2 (I25, I27): nháp CÓ chặng cần mốc tối thiểu để cảnh báo (không chặn lưu) — gọi ĐÚNG MỘT lần; chưa có mốc → 503 (không đoán).
      const coChang = placed.value.services.some((s) => s.legs.length > 0);
      const moc = coChang ? await mocToiThieu() : null;
      if (coChang && !moc) return MOC_CHUA_CO();
      // Người được chọn: `dispatch` trả câu lệnh (mở dòng `HANDLE` + nhật ký `order_handler_changed`) để gộp vào CÙNG db.batch() tạo đơn — dựng theo id
      // đơn và mốc `at` của TỪNG lần thử của `createOrder`, nên dòng phụ trách và nhật ký cùng mốc với dòng `created`. Không đạt → 400, không tạo đơn.
      const handler = pick.staffId === null ? null : await newOrderHandler(pick.staffId);
      if (handler && !handler.ok) return error(400, "invalid_assignee", handler.message);
      const id = await createOrder(env.DB, staff.id, placed.value, handler?.statements, booker.write);
      // Bảng tin (ADR-0022 điều 4/7): "tao" — KHÔNG truyền `handlerTruoc` (ADR-0030 Review Focus 5); gốc lắp ráp (src/index.ts) tự đổi thành
      // "tao_cho_nhan" khi đơn không có người phụ trách (chỉ làm mới màn hình, KHÔNG thông báo nổi/gõ cửa — ADR-0045). Không bao giờ phát "giao" cho đơn vừa lập.
      baoThayDoi({ orderId: id, thayDoi: "tao" });
      const taoXong = (await loadOrderView(env.DB, id, xemDuDatGap(staff)))!;
      return json({ order: taoXong, ...(await phanHoiMoc(env.DB, id, taoXong, moc)) } satisfies OrderResponse, 201);
    }),

    route("GET", "/api/orders/:id", "orders", async ({ env, params, staff, isAssigned, mocToiThieu }) => {
      if (!UUID_RE.test(params.id!)) return NOT_FOUND();
      // ADR-0049 I31: kèm mốc tối thiểu đang hiệu lực (biểu mẫu cảnh báo trước khi xác nhận) — đọc không bị chặn khi chưa có mốc (null).
      const [order, assigned, moc] = await Promise.all([loadOrderView(env.DB, params.id!, xemDuDatGap(staff)), isAssigned(params.id!), mocToiThieu()]);
      if (!order) return NOT_FOUND();
      // ADR-0007/0009: nhật ký/lịch sử sửa đơn — SALES chỉ đơn của mình hoặc đơn mình đang phụ trách; ACCOUNTING và ADMIN mọi đơn.
      // `assigned` tính MỘT lần cho cả nhật ký và `canModify`.
      const scope = { ownerId: order.staffId, assigned };
      // ADR-0014 điều 3 (D-01): PARTNER chỉ xem được chi tiết đơn của chính mình — SALES/ACCOUNTING/ADMIN/SUPER_ADMIN (order.view = any) luôn qua.
      // ADR-0030 S23-4: tài khoản CHỈ xem đơn mình phụ trách (chỉ-FIELD) nhận 404 như đơn không tồn tại (không dò được đơn người khác, kể cả đơn chờ nhận —
      // hàng chờ có route riêng ở dạng phần hẹp); Đối tác/Thực tập mở đơn người khác vẫn 403 (Review Focus 2).
      if (!can(staff, "order.view", scope)) return seesOnlyAssignedOrders(staff) ? NOT_FOUND() : FORBIDDEN();
      // ADR-0019 điều 2: chi tiết đơn trả tiền và liên hệ khách — hỏi hai ô với phạm vi CỦA ĐƠN NÀY; sai thì 403 (không cắt bớt trường).
      if (!can(staff, "money.view", scope) || !can(staff, "contact.view", scope)) return FORBIDDEN_VIEW();
      // R-P21 (áp lời chủ H4): dòng đặt gấp của lịch sử rút gọn theo vai (Đối tác, HDV, Thực tập không thấy lý do, tên người duyệt).
      const history = can(staff, "order.history.view", scope) ? lichSuTheoVai(await getAuditTrail(env.DB, order.id), xemDuDatGap(staff)) : [];
      // Đơn đã "Đã giao" bị khoá (ADR-0025 đ5) ⇒ không còn nút sửa (giao diện chỉ ẩn/hiện; máy chủ từ chối ở mọi route ghi).
      return json({ order, history, canModify: can(staff, "order.modify", scope) && order.deliveredAt === null, mocToiThieuPhut: moc?.phut ?? null } satisfies OrderDetailResponse);
    }),

    route("PUT", "/api/orders/:id", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi, mocToiThieu }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.modify", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status !== "draft") return NOT_EDITABLE();
      const body = await readJson(request);
      // ADR-0047 A2: thân có khoá `passengers` → hỏi thêm ô nhập tên khách với phạm vi CỦA ĐƠN NÀY (trước validateOrder).
      if (hasPassengersKey(body) && !can(staff, "order.passenger.write", { ownerId: meta.staffId, assigned })) return CANNOT_WRITE_PASSENGERS();
      const ctx = await validationContext(env.DB, id);
      const parsed = validateOrder(body, ctx);
      if (!parsed.ok) return failure(parsed);
      const guard = priceGuard(staff, parsed.value, ctx, (await manualPolicy(env.DB, new Date().toISOString())).bat); // ADR-0061: công tắc đọc một lần
      if (guard) return guard;
      const placed = await resolveLegPlaces(env.DB, parsed.value, ctx); // ADR-0047 (R7, R3)
      if (!placed.ok) return error(400, "invalid_input", placed.message);
      const expected = placed.value.expectedUpdatedAt;
      if (!expected) return error(400, "invalid_input", "Thiếu expectedUpdatedAt (mốc cập nhật của đơn mà form đã đọc).");
      // Thân yêu cầu không có CẢ HAI khoá `bookerPartyId`/`newBooker` (một `order-form.js` PWA cũ trong bộ nhớ đệm chưa biết trường người đặt) → GIỮ NGUYÊN
      // người đặt đang lưu, không gọi resolveBooker (đơn đang phụ trách bởi hồ sơ đã bị ngưng sẽ 400 nếu resolveBooker chạy lại). `bookerPartyId: null`
      // tường minh vẫn bỏ gắn như cũ. Giới hạn đã biết: BOOKER_VALUE ghi NULL nếu hồ sơ giữ lại không còn là CÁ NHÂN ĐANG HOẠT ĐỘNG — chấp nhận được.
      const noBookerKeys = body !== null && typeof body === "object" && !("bookerPartyId" in body) && !("newBooker" in body);
      const booker = noBookerKeys
        ? { ok: true as const, write: { partyId: meta.bookerPartyId, before: [], note: null } }
        : await resolveBooker(env.DB, placed.value.booker, staff.id, new Date(), { id: meta.bookerPartyId, name: meta.bookerName });
      if (!booker.ok) return error(400, "invalid_input", booker.message);
      // ADR-0047: lưu nháp xoá–chèn lại chặng — giữ `created_*` của chặng gửi lại cùng id.
      const legMeta = new Map(ctx.stored.flatMap((s) => s.legs.map((l) => [l.id, { createdAt: l.createdAt, createdBy: l.createdBy }] as const)));
      // ADR-0049 D2: nháp có chặng → mốc (một lần; chưa có → 503). Q1 = (a): chặng khớp ĐÚNG MỘT chặng cũ đã đặt gấp thì mang dấu cũ (đọc từ CSDL).
      const coChang = placed.value.services.some((s) => s.legs.length > 0);
      const moc = coChang ? await mocToiThieu() : null;
      if (coChang && !moc) return MOC_CHUA_CO();
      const datGapNhap = coChang ? chepDatGapNhap(await legDatGapByOrder(env.DB, id), placed.value.services) : new Map<string, DatGapWrite>();
      // Q2 (chủ trả lời 2026-09-30 "Đưa cọc cũ về 0, ghi nhật ký"): nháp CŨ còn cọc ghi trên đơn mà tổng mới < cọc cũ → câu lưu nháp đưa cột cọc về 0 (số tiền
      // không mất — đã là lần thu "chưa rõ" trong sổ của billing); ghi số cọc cũ vào dòng nhật ký `updated` (không SĐT).
      const cocCu = await cocCuNhap(env.DB, id);
      const ghiChuCoc = cocCu > placed.value.total ? `đưa tiền cọc cũ ${cocCu.toLocaleString("vi-VN")} ₫ ghi trên đơn về 0 (tiền đã nằm ở lần thu "chưa rõ" trong sổ)` : null;
      if (!(await updateDraftOrder(env.DB, id, staff.id, { ...placed.value, expectedUpdatedAt: expected }, booker.write, legMeta, datGapNhap, ghiChuCoc))) {
        const now = await getMeta(env.DB, id);
        return now && now.status !== "draft" ? NOT_EDITABLE() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "sua" });
      const suaXong = (await loadOrderView(env.DB, id, xemDuDatGap(staff)))!;
      return json({ order: suaXong, ...(await phanHoiMoc(env.DB, id, suaXong, moc)) } satisfies OrderResponse);
    }),

    // Sửa trường vận hành (ngày giờ khởi hành, đón, check-in, ghi chú) — kể cả đơn ĐÃ XÁC NHẬN (Q9). Không đổi khách/tiền.
    route("PUT", "/api/orders/:id/trip", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi, mocToiThieu }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "cancelled") return CANCELLED();
      const stored = await getStoredServices(env.DB, id);
      const tripBody = await readJson(request);
      const parsed = validateTripUpdate(tripBody, stored.map((s) => ({ id: s.id, departDate: s.trip.departDate })), meta.status, vnToday(new Date()));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      // ADR-0047 (R2c, R4e, R3): trộn hai khoá cũ CÓ MẶT vào chặng chiều đi đầu, dời chặng theo ngày đi mới; `trip` mang giá trị dẫn xuất (ghi kép + nhật ký).
      const planned = keHoachChangTrip(stored, parsed.value.updates);
      const moTa = describeTripUpdates(stored, planned.updates) ?? (planned.ops.length ? "cập nhật chặng đưa đón" : null);
      if (moTa === null) return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse); // không đổi gì
      // ADR-0049 I14: đơn ĐÃ XÁC NHẬN mà lệnh đổi / thêm chặng dưới mốc (min giờ cũ, giờ mới) → Quản trị, Toàn quyền + `datGap`. Chặng đổi mà không dấu mới →
      // dấu cũ bỏ (I16). Đơn nháp: mốc xét lúc xác nhận; khoá `datGap` không dùng ở đây (dấu nháp đi qua route đặt gấp).
      let datGap: DatGapWrite | null = null;
      const doiChang = planned.ops.filter((op) => op.kind !== "close");
      if (meta.status === "confirmed" && doiChang.length > 0) {
        const moc = await mocToiThieu();
        if (!moc) return MOC_CHUA_CO();
        const cuTheoId = new Map(stored.flatMap((s) => s.legs).map((l) => [l.id, l] as const));
        const nowMs = Date.now();
        const duoi = doiChang.some((op) => (op.kind === "update" ? duoiMocKhiSua(cuTheoId.get(op.legId) ?? null, op.fields, nowMs, moc.phut) : duoiMocKhiSua(null, op.kind === "insert" ? op.leg : null, nowMs, moc.phut)));
        const x = xetDatGapSua(staff, tripBody, duoi, moc);
        if (!x.ok) return x.res;
        datGap = x.value;
      }
      const detail = kemDatGap(moTa, datGap);
      if (!(await updateTrip(env.DB, id, staff.id, planned.updates, parsed.value.expectedUpdatedAt, detail, planned.ops, datGap))) {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse);
    }),

    // ---- Chặng đưa đón SAU XÁC NHẬN (ADR-0047 A1, Ruling R1): thêm / sửa trường vận hành / bỏ (= đóng dòng có lý do). Ô `order.trip.edit` { ownerId,
    // assigned } (cùng loại dữ liệu với "Sửa thông tin chuyến"), hỏi TRƯỚC khi đọc thân. Đơn nháp → 409 `use_order_form` (chặng của nháp đi trong thân
    // PUT /api/orders); đơn huỷ → 409. Khoá lạc quan: thêm theo mốc ĐƠN, sửa/đóng theo mốc CHẶNG. Mỗi lần ghi báo Bảng tin "chuyen" đúng một lần.
    route("POST", "/api/orders/:id/legs", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi, mocToiThieu }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "draft") return USE_ORDER_FORM();
      if (meta.status === "cancelled") return CANCELLED();
      const body = await readJson(request);
      const plan = await planAddLeg(env.DB, id, body, vnToday(new Date()));
      if (!plan.ok) return error(400, "invalid_input", plan.message);
      // ADR-0049 I14: chặng MỚI dưới mốc → Quản trị, Toàn quyền + `datGap` (dấu ghi cùng dòng).
      const moc = await mocToiThieu();
      if (!moc) return MOC_CHUA_CO();
      const x = xetDatGapSua(staff, body, duoiMocKhiSua(null, plan.value.leg, Date.now(), moc.phut), moc);
      if (!x.ok) return x.res;
      if (!(await addLeg(env.DB, id, staff.id, { ...plan.value, detail: kemDatGap(plan.value.detail, x.value), datGap: x.value }))) {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse, 201);
    }),

    route("PUT", "/api/orders/:id/legs/:legId", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi, mocToiThieu }) => {
      const id = params.id!;
      const legId = params.legId!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "draft") return USE_ORDER_FORM();
      if (meta.status === "cancelled") return CANCELLED();
      if (!UUID_RE.test(legId)) return LEG_NOT_FOUND();
      const body = await readJson(request);
      const plan = await planEditLeg(env.DB, id, legId, body, vnToday(new Date()));
      if (!plan.ok) return legFailure(plan);
      if (plan.value.detail === null) return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse); // không đổi gì
      // ADR-0049 I14 (Q3 chủ): min(giờ cũ, giờ mới) dưới mốc → Quản trị, Toàn quyền + `datGap`; dấu cũ KHÔNG miễn. Không dấu mới → dấu cũ bỏ (I16).
      const moc = await mocToiThieu();
      if (!moc) return MOC_CHUA_CO();
      const x = xetDatGapSua(staff, body, duoiMocKhiSua(plan.value.cu, plan.value.fields, Date.now(), moc.phut), moc);
      if (!x.ok) return x.res;
      const sua = { kind: "update" as const, ...plan.value, detail: kemDatGap(plan.value.detail, x.value), datGap: x.value };
      if (!(await changeLeg(env.DB, id, staff.id, meta.updatedAt, sua))) return legRaced(env.DB, id, legId);
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse);
    }),

    route("POST", "/api/orders/:id/legs/:legId/close", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const id = params.id!;
      const legId = params.legId!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "draft") return USE_ORDER_FORM();
      if (meta.status === "cancelled") return CANCELLED();
      if (!UUID_RE.test(legId)) return LEG_NOT_FOUND();
      const plan = await planCloseLeg(env.DB, id, legId, await readJson(request));
      if (!plan.ok) return legFailure(plan);
      if (!(await changeLeg(env.DB, id, staff.id, meta.updatedAt, { kind: "close", ...plan.value }))) return legRaced(env.DB, id, legId);
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse);
    }),

    // ---- ĐẶT GẤP (ADR-0049 D2, D3; kế hoạch Task A10, TC-22, TC-25, TC-28): Quản trị / Toàn quyền đóng dấu "đặt gấp" lên MỘT chặng còn mở của đơn nháp
    // hoặc đã xác nhận → chặng đó được xác nhận / xếp dưới mốc tối thiểu. Ô hỏi ĐẦU thân (403 trước 400). Số phút = mốc HIỆN HÀNH (chụp tại mốc — 5.6);
    // mốc chưa có → 503. Ghi chú che dãy số, lưu trên chặng, KHÔNG vào nhật ký (I18). Nhật ký: mã đơn + chiều + nhãn lý do.
    route("POST", "/api/orders/:id/legs/:legId/short-notice", "orders", async ({ env, request, params, staff, baoThayDoi, mocToiThieu }) => {
      if (!can(staff, "order.leg.short_notice")) return CANNOT_SHORT_NOTICE();
      const id = params.id!;
      const legId = params.legId!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const than = docDatGap(await readJson(request)); // MỘT bộ đọc với nhánh `datGap` của lệnh sửa chặng
      if (!than.ok) return error(400, "invalid_input", than.message);
      const { lyDo, ghiChu: ghiChuSach } = than.value;
      const [meta, moc] = await Promise.all([getMeta(env.DB, id), mocToiThieu()]);
      if (!meta) return NOT_FOUND();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "cancelled") return CANCELLED();
      if (!UUID_RE.test(legId)) return LEG_NOT_FOUND();
      const [leg, ref] = await Promise.all([legById(env.DB, legId, id), getOrderRef(env.DB, id)]);
      if (!leg) return LEG_NOT_FOUND();
      if (leg.closed_at) return LEG_CLOSED();
      if (!moc) return MOC_CHUA_CO();
      const at = new Date().toISOString();
      const detail = `${ref?.orderCode ?? ""} · ${CHIEU_LABEL[leg.direction]}${ghiDatGapNhatKy(LY_DO_DAT_GAP[lyDo])}`;
      const results = await env.DB.batch([
        legShortNotice(env.DB, legId, id, { lyDo, ghiChu: ghiChuSach, by: staff.id, at, phut: moc.phut }),
        auditStatement(env.DB, { orderId: id, staffId: staff.id, action: "order_leg_short_notice", at, detail }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return legRaced(env.DB, id, legId);
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse);
    }),

    // ---- Danh sách hành khách (ADR-0047 A2). ĐỌC: khuôn chi tiết đơn — `order.view` theo phạm vi đơn (chỉ-FIELD không phụ trách → 404 như đơn không tồn
    // tại), rồi `contact.view` (nay gồm họ tên + năm sinh). Chỉ dòng hiện hành; cờ "nhiều hơn số khách" (R9). Không tên/năm sinh trong nhật ký/Bảng tin.
    route("GET", "/api/orders/:id/passengers", "orders", async ({ env, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      const scope = { ownerId: meta.staffId, assigned };
      if (!can(staff, "order.view", scope)) return seesOnlyAssignedOrders(staff) ? NOT_FOUND() : FORBIDDEN();
      if (!can(staff, "contact.view", scope)) return FORBIDDEN_VIEW();
      return json((await passengerList(env.DB, id)) satisfies PassengerListResponse);
    }),

    // GHI (đơn ĐÃ XÁC NHẬN — Ruling R1; đơn nháp đi trong thân PUT /api/orders): ô `order.passenger.write` { ownerId, assigned } TRƯỚC khi đọc thân; khoá
    // lạc quan theo `orders.updated_at`; chỉ-thêm (R8); nhật ký ĐÚNG khuôn "thêm N, sửa N, huỷ N khách"; Bảng tin "sua" đúng một lần.
    route("POST", "/api/orders/:id/passengers", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.passenger.write", { ownerId: meta.staffId, assigned })) return CANNOT_WRITE_PASSENGERS();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "draft") return USE_ORDER_FORM();
      if (meta.status === "cancelled") return CANCELLED();
      const plan = await planPassengerChange(env.DB, id, await readJson(request), vnToday(new Date()));
      if (!plan.ok) return error(400, "invalid_input", plan.message);
      if (plan.value.none) return json((await passengerList(env.DB, id)) satisfies PassengerListResponse); // không đổi gì
      if (!(await writePassengerChange(env.DB, id, staff.id, plan.value))) {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "sua" });
      return json((await passengerList(env.DB, id)) satisfies PassengerListResponse);
    }),

    // Đổi khách (hồ sơ người đặt + tên/SĐT trên đơn) — đơn nháp HOẶC đã xác nhận: coi như thông tin vận hành, cùng quyền với sửa chuyến (ADR-0011 điều 2).
    route("PUT", "/api/orders/:id/booker", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      if (meta.status === "cancelled") return CANCELLED();
      const parsed = validateBookerChange(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const booker = await resolveBooker(env.DB, v.booker, staff.id, new Date(), { id: meta.bookerPartyId, name: meta.bookerName });
      if (!booker.ok) return error(400, "invalid_input", booker.message);
      const snapshotChanged = v.customerName !== meta.customerName || v.customerPhone !== meta.customerPhone;
      const detail = [booker.write.note, snapshotChanged ? "sửa tên/SĐT khách trên đơn" : null].filter(Boolean).join(" | ");
      if (!detail) return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse); // không đổi gì
      if (!(await changeBooker(env.DB, id, staff.id, v, booker.write, detail))) {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "sua" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse);
    }),

    route("POST", "/api/orders/:id/status", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi, mocToiThieu }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const body = await readJson(request);
      const to = body?.status;
      if (to !== "confirmed" && to !== "cancelled") return error(400, "invalid_input", "Trạng thái đích phải là confirmed hoặc cancelled.");
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.modify", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.deliveredAt) return DA_GIAO();
      const from = meta.status;
      if (!canTransition(from, to)) return error(409, "invalid_transition", `Không thể chuyển đơn từ "${from}" sang "${to}".`);

      if (to === "cancelled") {
        if (!(await cancelOrder(env.DB, id, staff.id, from, meta.updatedAt))) return RACED();
      } else {
        const today = vnToday(new Date());
        const order = await findOrder(env.DB, id);
        // DK-T3-01 R2 + R3: xác nhận là bước phát phiếu gửi khách mang tên/MST công ty → tài khoản có quyền Đối tác chỉ xác nhận được đơn mà MỌI dòng đúng
        // giá danh mục (bắt cả đơn nháp CŨ lập trước bản vá, và dòng nhập tay cũ — không có giá danh mục) VÀ giảm giá ĐÃ LƯU không vượt trần (hôm nay 0).
        if (order && holdsPartner(staff) && !retailPricesOnly(order.services.flatMap((s) => s.items))) return PARTNER_PRICE();
        if (order && holdsPartner(staff) && !discountWithinCap(order.discount, PARTNER_DISCOUNT_CAP)) return PARTNER_DISCOUNT();
        const detail = order ? summarizeDeviations(order.services.flatMap((s) => s.items)) : undefined;
        // ADR-0049 D2 (I15, I25): điều kiện mốc nằm TRONG câu xác nhận — ngưỡng chuỗi giờ VN tính bằng `nguongMocVn` (MỘT luật với `kiemMocDat`). Mốc chưa
        // có → 503, không đoán. MỘT mốc giờ (`nowMs`) cho câu ghi và cho việc đọc lại lý do.
        const moc = await mocToiThieu();
        if (!moc) return MOC_CHUA_CO();
        const nowMs = Date.now();
        if (!(await confirmOrder(env.DB, id, staff.id, today, meta.updatedAt, nguongMocVn(nowMs, moc.phut), detail))) {
          // Thua vì đơn đã đổi trạng thái, vì chưa đủ chuyến, hay vì còn chặng dưới mốc chưa đặt gấp? Đọc lại để trả đúng lý do (không ghi nhật ký).
          const now = await getMeta(env.DB, id);
          if (!now || now.status !== "draft") return RACED();
          const stored = await getStoredServices(env.DB, id);
          const missing = confirmGaps(stored.map((s) => ({ id: s.id, name: s.name, departDate: s.trip.departDate, pax: s.pax })), today);
          if (missing.length > 0) {
            return json({ error: { code: "incomplete_trip", message: "Chưa đủ thông tin chuyến để xác nhận đơn.", missing } } satisfies IncompleteTripBody, 409);
          }
          const daDatGap = new Set((await legDatGapByOrder(env.DB, id)).map((r) => r.id));
          const duoi = canhBaoMocCua(stored.flatMap((s) => s.legs), daDatGap, nowMs, moc.phut);
          if (duoi.length > 0) {
            const legs = duoi.map((d) => ({ legId: d.legKey, phutConLai: d.phutConLai }));
            const message = "Có chặng đón dưới mốc tối thiểu — cần Quản trị hoặc Toàn quyền đặt gấp trước khi xác nhận.";
            return json({ error: { code: "short_notice_required", message, legs } } satisfies ShortNoticeRequiredBody, 409);
          }
          return STALE(); // vừa có người bổ sung xong — thử lại
        }
      }
      baoThayDoi({ orderId: id, thayDoi: to === "cancelled" ? "huy" : "xac_nhan" });
      return json({ order: (await loadOrderView(env.DB, id, xemDuDatGap(staff)))! } satisfies OrderResponse);
    }),
  ],
};
