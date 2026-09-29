// Module orders — sổ đơn hàng (spec §2.1 order/order_service/order_item, §2.3 bất biến). Route: /api/orders*.
// Mọi nhân viên đang hoạt động xem được mọi đơn (§2.4-4); chỉ người lập đơn, người phụ trách đang mở của đơn (ADR-0009) hoặc admin được sửa/xác nhận/huỷ.
// "Người phụ trách" do module `dispatch` giữ: `orders` KHÔNG import `dispatch` mà hỏi qua `ctx.isAssigned(orderId)` (gốc lắp ráp tiêm — ADR-0007 điều 4(b)).
import { getAuditTrail } from "../audit";
import type {
  CatalogChangeDto, CatalogChangedBody, DashboardResponse, IncompleteTripBody, MyAssignmentDto, OrderDetailDto, OrderDetailResponse, OrderListResponse, OrderResponse,
  PaxCounts, PoolResponse,
} from "../../shared/contracts";
import { UUID_RE, error, intParam, json, readJson } from "../../shared/http";
import { can, seesOnlyAssignedOrders, type PermissionHolder } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { vnToday, vnWeekRange } from "../../shared/vn-date";
import { editablePaxCodesOf, planMoneyEdit } from "./money-adjustment";
import {
  addLeg, applyAdjustedPax, cancelOrder, changeBooker, changeLeg, confirmOrder, createOrder, findOrder, getDashboard, getDepartDates, getLatestAdjustment, getLatestAdjustments,
  getMeta, getOrderRef, getServicesForSubtotal, getStoredServices, insertMoneyAdjustment, listOrders, listPoolSources, updateDraftOrder, updateTrip,
} from "./repository";
import { legById, servicePaxByIds } from "./chang-hanh-khach-repo";
import { toPoolOrders } from "./pool";
import {
  PARTNER_DISCOUNT_CAP, PARTNER_DISCOUNT_MESSAGE, RETAIL_PRICE_MESSAGE, discountWithinCap, holdsPartner, manualFreezeViolation, retailPricesOnly,
} from "./price-guards";
import { canTransition, hasHandlerPick, isOrderStatus, parseHandlerPick, validateBookerChange, validateOrder, type Failure, type OrderStatus, type ValidOrder } from "./rules";
import {
  keHoachChangTrip, loadOrderView, planAddLeg, planCloseLeg, planEditLeg, resolveBooker, resolveLegPlaces, validationContext, type OrderValidationContext,
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
const STALE = () => error(409, "stale", "Đơn vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
const RACED = () => error(409, "invalid_transition", "Đơn vừa được người khác đổi trạng thái, hãy tải lại.");
const PARTNER_PRICE = () => error(403, "forbidden", RETAIL_PRICE_MESSAGE);
const PARTNER_DISCOUNT = () => error(403, "forbidden", PARTNER_DISCOUNT_MESSAGE);
/** ADR-0047 Ruling R1: chặng / danh sách khách của ĐƠN NHÁP đi trong thân `POST/PUT /api/orders`; route riêng chỉ nhận đơn đã xác nhận. */
const USE_ORDER_FORM = () => error(409, "use_order_form", "Đơn nháp: sửa đưa đón và danh sách hành khách ngay trong form đơn.");
const LEG_NOT_FOUND = () => error(404, "leg_not_found", "Không tìm thấy chặng đưa đón của đơn này.");
const LEG_CLOSED = (message = "Chặng đưa đón này đã bỏ — không sửa được.") => error(409, "leg_closed", message);

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
 * theo thứ tự: R1 (mọi tài khoản) dịch vụ nhập tay mới / sửa tên-giá dịch vụ nhập tay cũ → 400 `invalid_input`; R2 (tài khoản có quyền Đối tác) đơn giá
 * khác giá danh mục → 403 `forbidden`; R3 (tài khoản có quyền Đối tác) giảm giá cấp đơn vượt trần — hôm nay trần 0, "tạm không cho giảm" (chủ dự án 26/9)
 * → 403 `forbidden`. null = đạt.
 */
function priceGuard(staff: PermissionHolder, order: ValidOrder, ctx: OrderValidationContext): Response | null {
  const frozen = manualFreezeViolation(order.services, ctx.stored);
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
  const rows = await servicePaxByIds(db, serviceIds);
  const latest = await getLatestAdjustments(db, [...new Set(rows.map((r) => r.order_id))]);
  const afterByOrder = new Map(Array.from(latest, ([id, a]) => [id, a.after] as const));
  return new Map(applyAdjustedPax(rows, afterByOrder).map((r) => [r.id, { adult: r.pax_adult, child: r.pax_child, senior: r.pax_senior, infant: r.pax_infant }] as const));
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
    Promise.all(orderIds.map((id) => loadOrderView(db, id))),
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
        depositAmount: o.depositAmount,
        remainingAmount: o.remainingAmount,
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
      const raw = url.searchParams.get("status");
      const status = raw ? (isOrderStatus(raw) ? raw : undefined) : null;
      if (status === undefined) return error(400, "invalid_input", "Trạng thái lọc không hợp lệ.");
      const result = await listOrders(env.DB, {
        q: (url.searchParams.get("q") ?? "").trim().slice(0, 100),
        status,
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
    route("POST", "/api/orders", "orders", async ({ env, request, staff, newOrderHandler, baoThayDoi }) => {
      if (!can(staff, "order.create")) return CANNOT_CREATE();
      const body = await readJson(request);
      if (hasHandlerPick(body) && !can(staff, "dispatch.assign", { ownerId: staff.id })) return CANNOT_PICK_HANDLER();
      const pick = parseHandlerPick(body);
      if (!pick.ok) return error(400, "invalid_input", pick.message);
      const ctx = await validationContext(env.DB, null);
      const parsed = validateOrder(body, ctx);
      if (!parsed.ok) return failure(parsed);
      const guard = priceGuard(staff, parsed.value, ctx);
      if (guard) return guard;
      // ADR-0047 (R7, R3): điểm danh mục của chặng phải đang dùng; đặt hai khoá cũ = dẫn xuất từ chặng (ghi kép vào cột cũ).
      const placed = await resolveLegPlaces(env.DB, parsed.value, ctx);
      if (!placed.ok) return error(400, "invalid_input", placed.message);
      const booker = await resolveBooker(env.DB, placed.value.booker, staff.id, new Date());
      if (!booker.ok) return error(400, "invalid_input", booker.message);
      // Người được chọn: `dispatch` trả câu lệnh (mở dòng `HANDLE` + nhật ký `order_handler_changed`) để gộp vào CÙNG db.batch() tạo đơn — dựng theo id
      // đơn và mốc `at` của TỪNG lần thử của `createOrder`, nên dòng phụ trách và nhật ký cùng mốc với dòng `created`. Không đạt → 400, không tạo đơn.
      const handler = pick.staffId === null ? null : await newOrderHandler(pick.staffId);
      if (handler && !handler.ok) return error(400, "invalid_assignee", handler.message);
      const id = await createOrder(env.DB, staff.id, placed.value, handler?.statements, booker.write);
      // Bảng tin (ADR-0022 điều 4/7): "tao" — KHÔNG truyền `handlerTruoc` (ADR-0030 Review Focus 5); gốc lắp ráp (src/index.ts) tự đổi thành
      // "tao_cho_nhan" khi đơn không có người phụ trách (chỉ làm mới màn hình, KHÔNG thông báo nổi/gõ cửa — ADR-0045). Không bao giờ phát "giao" cho đơn vừa lập.
      baoThayDoi({ orderId: id, thayDoi: "tao" });
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse, 201);
    }),

    route("GET", "/api/orders/:id", "orders", async ({ env, params, staff, isAssigned }) => {
      if (!UUID_RE.test(params.id!)) return NOT_FOUND();
      const [order, assigned] = await Promise.all([loadOrderView(env.DB, params.id!), isAssigned(params.id!)]);
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
      const history = can(staff, "order.history.view", scope) ? await getAuditTrail(env.DB, order.id) : [];
      return json({ order, history, canModify: can(staff, "order.modify", scope) } satisfies OrderDetailResponse);
    }),

    route("PUT", "/api/orders/:id", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.modify", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.status !== "draft") return NOT_EDITABLE();
      const body = await readJson(request);
      const ctx = await validationContext(env.DB, id);
      const parsed = validateOrder(body, ctx);
      if (!parsed.ok) return failure(parsed);
      const guard = priceGuard(staff, parsed.value, ctx);
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
      if (!(await updateDraftOrder(env.DB, id, staff.id, { ...placed.value, expectedUpdatedAt: expected }, booker.write, legMeta))) {
        const now = await getMeta(env.DB, id);
        return now && now.status !== "draft" ? NOT_EDITABLE() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "sua" });
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),

    // Sửa trường vận hành (ngày giờ khởi hành, đón, check-in, ghi chú) — kể cả đơn ĐÃ XÁC NHẬN (Q9). Không đổi khách/tiền.
    route("PUT", "/api/orders/:id/trip", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.status === "cancelled") return CANCELLED();
      const stored = await getStoredServices(env.DB, id);
      const parsed = validateTripUpdate(await readJson(request), stored.map((s) => ({ id: s.id, departDate: s.trip.departDate })), meta.status, vnToday(new Date()));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      // ADR-0047 (R2c, R4e, R3): trộn hai khoá cũ CÓ MẶT vào chặng chiều đi đầu, dời chặng theo ngày đi mới; `trip` mang giá trị dẫn xuất (ghi kép + nhật ký).
      const planned = keHoachChangTrip(stored, parsed.value.updates);
      const detail = describeTripUpdates(stored, planned.updates) ?? (planned.ops.length ? "cập nhật chặng đưa đón" : null);
      if (detail === null) return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse); // không đổi gì
      if (!(await updateTrip(env.DB, id, staff.id, planned.updates, parsed.value.expectedUpdatedAt, detail, planned.ops))) {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),

    // ---- Chặng đưa đón SAU XÁC NHẬN (ADR-0047 A1, Ruling R1): thêm / sửa trường vận hành / bỏ (= đóng dòng có lý do). Ô `order.trip.edit` { ownerId,
    // assigned } (cùng loại dữ liệu với "Sửa thông tin chuyến"), hỏi TRƯỚC khi đọc thân. Đơn nháp → 409 `use_order_form` (chặng của nháp đi trong thân
    // PUT /api/orders); đơn huỷ → 409. Khoá lạc quan: thêm theo mốc ĐƠN, sửa/đóng theo mốc CHẶNG. Mỗi lần ghi báo Bảng tin "chuyen" đúng một lần.
    route("POST", "/api/orders/:id/legs", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.status === "draft") return USE_ORDER_FORM();
      if (meta.status === "cancelled") return CANCELLED();
      const plan = await planAddLeg(env.DB, id, await readJson(request), vnToday(new Date()));
      if (!plan.ok) return error(400, "invalid_input", plan.message);
      if (!(await addLeg(env.DB, id, staff.id, plan.value))) {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse, 201);
    }),

    route("PUT", "/api/orders/:id/legs/:legId", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const id = params.id!;
      const legId = params.legId!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.status === "draft") return USE_ORDER_FORM();
      if (meta.status === "cancelled") return CANCELLED();
      if (!UUID_RE.test(legId)) return LEG_NOT_FOUND();
      const plan = await planEditLeg(env.DB, id, legId, await readJson(request), vnToday(new Date()));
      if (!plan.ok) return legFailure(plan);
      if (plan.value.detail === null) return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse); // không đổi gì
      if (!(await changeLeg(env.DB, id, staff.id, meta.updatedAt, { kind: "update", ...plan.value, detail: plan.value.detail }))) return legRaced(env.DB, id, legId);
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),

    route("POST", "/api/orders/:id/legs/:legId/close", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const id = params.id!;
      const legId = params.legId!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.status === "draft") return USE_ORDER_FORM();
      if (meta.status === "cancelled") return CANCELLED();
      if (!UUID_RE.test(legId)) return LEG_NOT_FOUND();
      const plan = await planCloseLeg(env.DB, id, legId, await readJson(request));
      if (!plan.ok) return legFailure(plan);
      if (!(await changeLeg(env.DB, id, staff.id, meta.updatedAt, { kind: "close", ...plan.value }))) return legRaced(env.DB, id, legId);
      baoThayDoi({ orderId: id, thayDoi: "chuyen" });
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),

    // Đổi khách (hồ sơ người đặt + tên/SĐT trên đơn) — đơn nháp HOẶC đã xác nhận: coi như thông tin vận hành, cùng quyền với sửa chuyến (ADR-0011 điều 2).
    route("PUT", "/api/orders/:id/booker", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.status === "cancelled") return CANCELLED();
      const parsed = validateBookerChange(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const booker = await resolveBooker(env.DB, v.booker, staff.id, new Date(), { id: meta.bookerPartyId, name: meta.bookerName });
      if (!booker.ok) return error(400, "invalid_input", booker.message);
      const snapshotChanged = v.customerName !== meta.customerName || v.customerPhone !== meta.customerPhone;
      const detail = [booker.write.note, snapshotChanged ? "sửa tên/SĐT khách trên đơn" : null].filter(Boolean).join(" | ");
      if (!detail) return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse); // không đổi gì
      if (!(await changeBooker(env.DB, id, staff.id, v, booker.write, detail))) {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      baoThayDoi({ orderId: id, thayDoi: "sua" });
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),

    route("POST", "/api/orders/:id/status", "orders", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const body = await readJson(request);
      const to = body?.status;
      if (to !== "confirmed" && to !== "cancelled") return error(400, "invalid_input", "Trạng thái đích phải là confirmed hoặc cancelled.");
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.modify", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
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
        if (!(await confirmOrder(env.DB, id, staff.id, today, meta.updatedAt, detail))) {
          // Thua vì đơn đã đổi trạng thái, hay vì chưa đủ chuyến? Đọc lại để trả đúng lý do (không ghi nhật ký cho lần xác nhận thất bại).
          const now = await getMeta(env.DB, id);
          if (!now || now.status !== "draft") return RACED();
          const stored = await getStoredServices(env.DB, id);
          const missing = confirmGaps(stored.map((s) => ({ id: s.id, name: s.name, departDate: s.trip.departDate, pax: s.pax })), today);
          if (missing.length === 0) return STALE(); // vừa có người bổ sung xong — thử lại
          return json({ error: { code: "incomplete_trip", message: "Chưa đủ thông tin chuyến để xác nhận đơn.", missing } } satisfies IncompleteTripBody, 409);
        }
      }
      baoThayDoi({ orderId: id, thayDoi: to === "cancelled" ? "huy" : "xac_nhan" });
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),
  ],
};
