// Module orders — sổ đơn hàng (spec §2.1 order/order_service/order_item, §2.3 bất biến). Route: /api/orders*.
// Mọi nhân viên đang hoạt động xem được mọi đơn (§2.4-4); chỉ người lập đơn, người phụ trách đang mở của đơn (ADR-0009) hoặc admin được sửa/xác nhận/huỷ.
// "Người phụ trách" do module `dispatch` giữ: `orders` KHÔNG import `dispatch` mà hỏi qua `ctx.isAssigned(orderId)` (gốc lắp ráp tiêm — ADR-0007 điều 4(b)).
import { getAuditTrail } from "../audit";
import type {
  CatalogChangeDto, CatalogChangedBody, DashboardResponse, IncompleteTripBody, MyAssignmentDto, OrderDetailDto, OrderDetailResponse, OrderListResponse, OrderResponse,
} from "../../shared/contracts";
import { UUID_RE, error, intParam, json, readJson } from "../../shared/http";
import type { PaxCounts } from "../../shared/order-lines";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { vnToday, vnWeekRange } from "../../shared/vn-date";
import { editablePaxCodesOf, effectiveSubtotal, parseMoneyEditInput, recomputeService } from "./money-adjustment";
import {
  cancelOrder, changeBooker, confirmOrder, createOrder, findOrder, getDashboard, getLatestAdjustment, getMeta, getServicesForSubtotal, getStoredServices, insertMoneyAdjustment, listOrders,
  updateDraftOrder, updateTrip,
} from "./repository";
import { canTransition, isOrderStatus, validateBookerChange, validateOrder, type Failure, type OrderStatus } from "./rules";
import { loadOrderView, resolveBooker, validationContext } from "./service";
import { confirmGaps, describeTripUpdates, summarizeDeviations, validateTripUpdate } from "./service-rules";

const FORBIDDEN = () => error(403, "forbidden", "Chỉ người lập đơn, người phụ trách đơn hoặc quản trị viên mới được thay đổi đơn này.");
const CANNOT_CREATE = () => error(403, "forbidden", "Tài khoản này không được lập đơn.");
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy đơn.");
const NOT_EDITABLE = () => error(409, "not_editable", "Chỉ sửa được đơn ở trạng thái nháp. Muốn đổi đơn đã xác nhận, hãy huỷ và tạo đơn mới.");
const CANCELLED = () => error(409, "not_editable", "Đơn đã huỷ, không sửa được.");
const STALE = () => error(409, "stale", "Đơn vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
const RACED = () => error(409, "invalid_transition", "Đơn vừa được người khác đổi trạng thái, hãy tải lại.");

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
 * (để `dispatch` truyền vào khoá lạc quan khi tự ghi qua `cancelOrderByHandler`). Chỉ trả các trường này, không lộ gì khác của đơn; null nếu không có đơn.
 */
export async function findOrderOwner(db: D1Database, id: string): Promise<{ staffId: string; status: OrderStatus; updatedAt: string } | null> {
  const meta = await getMeta(db, id);
  return meta ? { staffId: meta.staffId, status: meta.status, updatedAt: meta.updatedAt } : null;
}

/**
 * Huỷ đơn qua đường hẹp của người phụ trách CẤP HẸP (`FIELD`, ADR-0014 điều 11) — CHỈ đổi `status`/`updated_at`, không đụng dịch vụ hay cột tiền (đúng khoá
 * "đơn đã xác nhận không đổi tiền" — xem `docs/superpowers/specs/2026-09-22-khoa-tien-don-da-xac-nhan.md`). Route gọi hàm này SAU KHI đã tự kiểm
 * `status === "confirmed"` bằng `findOrderOwner`; hàm này chỉ còn lo tranh chấp (khoá lạc quan) nên vẫn ràng buộc `from: "confirmed"` cho chắc.
 */
export async function cancelOrderByHandler(db: D1Database, id: string, staffId: string, prevUpdatedAt: string, reasonLabel: string): Promise<boolean> {
  return cancelOrder(db, id, staffId, "confirmed", prevUpdatedAt, { action: "order_cancelled_by_field", detail: reasonLabel });
}

export type MoneyEditResult = { ok: true } | { ok: false; code: "not_found" | "not_confirmed" | "invalid_input" | "stale"; message?: string };

/**
 * Sửa số khách qua đường hẹp của người phụ trách CẤP HẸP (FIELD, ADR-0014 điều 6) — CHỈ ghi thêm một dòng điều chỉnh, không đụng
 * order_service/order_item/cột tiền của orders. `body` là thân JSON THÔ (đã đọc từ request, route chưa kiểm) — hàm này tự kiểm dạng bằng
 * `parseMoneyEditInput` VÀ tính lại tiền bằng `recomputeService`, nên route gọi hàm này là đủ, không cần lặp lại kiểm ở dispatch/index.ts.
 */
export async function editMoneyAsHandler(db: D1Database, orderId: string, staffId: string, body: Record<string, unknown> | null): Promise<MoneyEditResult> {
  const meta = await getMeta(db, orderId);
  if (!meta) return { ok: false, code: "not_found" };
  if (meta.status !== "confirmed") return { ok: false, code: "not_confirmed" };

  const stored = await getStoredServices(db, orderId);
  const catalogServices = stored.filter((s) => s.catalogCode !== null);
  const catalogIds = catalogServices.map((s) => s.id);
  const input = parseMoneyEditInput(body, catalogIds);
  if (!input.ok) return { ok: false, code: "invalid_input", message: input.message };

  const latest = await getLatestAdjustment(db, orderId);
  const currentPaxOf = (id: string): PaxCounts => latest?.after.find((a) => a.serviceId === id)?.pax ?? stored.find((s) => s.id === id)!.pax;

  const before: { serviceId: string; pax: PaxCounts }[] = [];
  const after: { serviceId: string; pax: PaxCounts }[] = [];
  for (const s of catalogServices) {
    const beforePax = currentPaxOf(s.id);
    const beforeCalc = recomputeService(s, beforePax);
    if (!beforeCalc.ok) return { ok: false, code: "invalid_input", message: beforeCalc.message };
    before.push({ serviceId: s.id, pax: beforePax });

    const newPax = input.services.find((x) => x.id === s.id)!.pax;
    const afterCalc = recomputeService(s, newPax);
    if (!afterCalc.ok) return { ok: false, code: "invalid_input", message: afterCalc.message };
    after.push({ serviceId: s.id, pax: newPax });
  }

  // Đợt E task 7, mục A (nơi GHI) — LỖI ĐÃ ĐO: vòng lặp trên chỉ duyệt `catalogServices`, nên khi tính subtotal_before/subtotal_after bằng chính
  // vòng lặp đó (bản cũ) thì dịch vụ NHẬP TAY (không bao giờ vào `catalogServices`) bị BỎ SÓT — lưu THIẾU đúng tiền của dịch vụ nhập tay (kiểm độc
  // lập đo được: thiếu 200.000₫). Sửa: tính bằng CHÍNH hàm NGUỒN DUY NHẤT `effectiveSubtotal` (money-adjustment.ts, dùng chung với nơi ĐỌC — trang
  // chi tiết đơn, `/api/orders`, Trang chủ) trên TOÀN BỘ dịch vụ của đơn (`getServicesForSubtotal`, không phải chỉ `catalogServices`). Dịch vụ nhập
  // tay không bao giờ có mặt trong `before`/`after` (route này chỉ cho sửa dịch vụ TỪ DANH MỤC) nên `effectiveService` luôn rơi vào nhánh "own" cho
  // chúng — TỰ ĐỘNG được cộng, không phụ thuộc mã ở đây có nhớ lặp qua nó hay không (đúng bài học Điều 3: gom về MỘT luật, không phải nhớ đủ hai nơi).
  const subtotalServices = (await getServicesForSubtotal(db, [orderId])).get(orderId) ?? [];
  const subtotalBefore = effectiveSubtotal(subtotalServices, before);
  const subtotalAfter = effectiveSubtotal(subtotalServices, after);

  const ok = await insertMoneyAdjustment(db, orderId, staffId, (latest?.seq ?? 0) + 1, before, after, subtotalBefore, subtotalAfter, input.reason);
  return ok ? { ok: true } : { ok: false, code: "stale" };
}

/**
 * Dữ liệu cho màn "việc của tôi" của FIELD (`GET /api/dispatch/mine`, module dispatch) — tái dùng `loadOrderView` (đã có overlay điều chỉnh,
 * ADR-0014 điều 6) rồi LỌC BỎ mọi trường tiền trước khi trả ra, đúng ADR-0007 điều 3 ("không tiền, không bảng giá" cho FIELD). `orderIds` do
 * `dispatch` truyền vào (đơn mà staff gọi đang là người phụ trách — dispatch tự tra, orders không biết khái niệm "người phụ trách").
 * `editablePaxCodes` tính từ đơn GỐC (`findOrder`, trước overlay) qua `editablePaxCodesOf` — KHÔNG tính từ `items` của bản đã overlay
 * (`loadOrderView`), vì overlay có thể bỏ hẳn dòng của một loại khách đã bị sửa về 0, làm loại đó biến mất khỏi ô nhập (lỗi thật, kiểm độc lập
 * 2026-09-22).
 */
export async function getMyAssignments(db: D1Database, orderIds: readonly string[]): Promise<MyAssignmentDto[]> {
  const [views, originals] = await Promise.all([
    Promise.all(orderIds.map((id) => loadOrderView(db, id))),
    Promise.all(orderIds.map((id) => findOrder(db, id))),
  ]);
  const originalById = new Map(originals.flatMap((o) => (o ? [[o.id, o] as const] : [])));
  return views
    .filter((o): o is OrderDetailDto => o !== null && o.status === "confirmed")
    .map((o) => {
      const editableById = new Map(originalById.get(o.id)!.services.map((s) => [s.id, editablePaxCodesOf(s)]));
      return {
        orderId: o.id,
        orderCode: o.orderCode,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
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
    // Trang chủ mới (docs/superpowers/sdd/2026-09-23-trang-chu-moi): tổng quan cho nhân viên văn phòng — "office" (không phải "orders"), PARTNER không dùng màn hình này.
    // PHẢI đứng TRƯỚC route "GET /api/orders/:id" ở dưới: router (`match()`) khớp path theo VỊ TRÍ đoạn, nên ":id" cũng khớp chuỗi "dashboard" —
    // `createApp` lấy candidate ĐẦU TIÊN cùng method trong mảng `routes` (thứ tự khai ở đây), route này đứng trước nên thắng.
    route("GET", "/api/orders/dashboard", "office", async ({ env, staff }) => {
      const today = vnToday(new Date());
      const { from, to } = vnWeekRange(today);
      const data = await getDashboard(env.DB, staff.id, today, from, to);
      return json({ ...data, revenueWeek: { ...data.revenueWeek, from, to } } satisfies DashboardResponse);
    }),

    route("GET", "/api/orders", "orders", async ({ env, url, staff }) => {
      const raw = url.searchParams.get("status");
      const status = raw ? (isOrderStatus(raw) ? raw : undefined) : null;
      if (status === undefined) return error(400, "invalid_input", "Trạng thái lọc không hợp lệ.");
      // can(staff, "order.view") KHÔNG ngữ cảnh: "any" (SALES/ACCOUNTING/ADMIN/SUPER_ADMIN) → true → không lọc; "own" (PARTNER) → false → lọc theo chính mình.
      // An toàn CHỈ đúng vì access "orders" đã loại trước những quyền order.view = "none" (FIELD) ở router — đừng gọi listOrders ở access khác mà không tự lọc.
      const ownerId = can(staff, "order.view") ? null : staff.id;
      const result = await listOrders(env.DB, {
        q: (url.searchParams.get("q") ?? "").trim().slice(0, 100),
        status,
        limit: intParam(url.searchParams.get("limit"), 30, 1, 100),
        offset: intParam(url.searchParams.get("offset"), 0, 0, 100000),
        ownerId,
      });
      return json(result satisfies OrderListResponse);
    }),

    route("POST", "/api/orders", "orders", async ({ env, request, staff, defaultHandlerStatement }) => {
      if (!can(staff, "order.create")) return CANNOT_CREATE();
      const parsed = validateOrder(await readJson(request), await validationContext(env.DB, null));
      if (!parsed.ok) return failure(parsed);
      const booker = await resolveBooker(env.DB, parsed.value.booker, staff.id, new Date());
      if (!booker.ok) return error(400, "invalid_input", booker.message);
      // Đơn mới: người lập là người phụ trách mặc định — dòng do `dispatch` cung cấp, vào CÙNG db.batch() tạo đơn (ADR-0009 điều 4).
      const id = await createOrder(
        env.DB,
        staff.id,
        parsed.value,
        (orderId, at) => {
          const handler = defaultHandlerStatement(orderId, at);
          return handler ? [handler] : [];
        },
        booker.write,
      );
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
      if (!can(staff, "order.view", scope)) return FORBIDDEN();
      const history = can(staff, "order.history.view", scope) ? await getAuditTrail(env.DB, order.id) : [];
      return json({ order, history, canModify: can(staff, "order.modify", scope) } satisfies OrderDetailResponse);
    }),

    route("PUT", "/api/orders/:id", "orders", async ({ env, request, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.modify", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.status !== "draft") return NOT_EDITABLE();
      const body = await readJson(request);
      const parsed = validateOrder(body, await validationContext(env.DB, id));
      if (!parsed.ok) return failure(parsed);
      const expected = parsed.value.expectedUpdatedAt;
      if (!expected) return error(400, "invalid_input", "Thiếu expectedUpdatedAt (mốc cập nhật của đơn mà form đã đọc).");
      // Thân yêu cầu không có CẢ HAI khoá `bookerPartyId`/`newBooker` (một `order-form.js` PWA cũ trong bộ nhớ đệm chưa biết trường người đặt) → GIỮ NGUYÊN
      // người đặt đang lưu, không gọi resolveBooker (đơn đang phụ trách bởi hồ sơ đã bị ngưng sẽ 400 nếu resolveBooker chạy lại). `bookerPartyId: null`
      // tường minh vẫn bỏ gắn như cũ. Giới hạn đã biết: BOOKER_VALUE ghi NULL nếu hồ sơ giữ lại không còn là CÁ NHÂN ĐANG HOẠT ĐỘNG — chấp nhận được.
      const noBookerKeys = body !== null && typeof body === "object" && !("bookerPartyId" in body) && !("newBooker" in body);
      const booker = noBookerKeys
        ? { ok: true as const, write: { partyId: meta.bookerPartyId, before: [], note: null } }
        : await resolveBooker(env.DB, parsed.value.booker, staff.id, new Date(), { id: meta.bookerPartyId, name: meta.bookerName });
      if (!booker.ok) return error(400, "invalid_input", booker.message);
      if (!(await updateDraftOrder(env.DB, id, staff.id, { ...parsed.value, expectedUpdatedAt: expected }, booker.write))) {
        const now = await getMeta(env.DB, id);
        return now && now.status !== "draft" ? NOT_EDITABLE() : STALE();
      }
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),

    // Sửa trường vận hành (ngày giờ khởi hành, đón, check-in, ghi chú) — kể cả đơn ĐÃ XÁC NHẬN (Q9). Không đổi khách/tiền.
    route("PUT", "/api/orders/:id/trip", "orders", async ({ env, request, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.status === "cancelled") return CANCELLED();
      const stored = await getStoredServices(env.DB, id);
      const parsed = validateTripUpdate(await readJson(request), stored.map((s) => ({ id: s.id, departDate: s.trip.departDate })), meta.status, vnToday(new Date()));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const detail = describeTripUpdates(stored, parsed.value.updates);
      if (detail === null) return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse); // không đổi gì
      if (!(await updateTrip(env.DB, id, staff.id, parsed.value.updates, parsed.value.expectedUpdatedAt, detail))) {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),

    // Đổi khách (hồ sơ người đặt + tên/SĐT trên đơn) — đơn nháp HOẶC đã xác nhận: coi như thông tin vận hành, cùng quyền với sửa chuyến (ADR-0011 điều 2).
    route("PUT", "/api/orders/:id/booker", "orders", async ({ env, request, params, staff, isAssigned }) => {
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
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),

    route("POST", "/api/orders/:id/status", "orders", async ({ env, request, params, staff, isAssigned }) => {
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
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),
  ],
};
