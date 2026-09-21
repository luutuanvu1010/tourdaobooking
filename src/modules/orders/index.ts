// Module orders — sổ đơn hàng (spec §2.1 order/order_service/order_item, §2.3 bất biến). Route: /api/orders*.
// Mọi nhân viên đang hoạt động xem được mọi đơn (§2.4-4); chỉ người lập đơn, người phụ trách đang mở của đơn (ADR-0009) hoặc admin được sửa/xác nhận/huỷ.
// "Người phụ trách" do module `dispatch` giữ: `orders` KHÔNG import `dispatch` mà hỏi qua `ctx.isAssigned(orderId)` (gốc lắp ráp tiêm — ADR-0007 điều 4(b)).
import { getAuditTrail } from "../audit";
import type { CatalogChangeDto, CatalogChangedBody, IncompleteTripBody, OrderDetailResponse, OrderListResponse, OrderResponse } from "../../shared/contracts";
import { UUID_RE, error, intParam, json, readJson } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { vnToday } from "../../shared/vn-date";
import { cancelOrder, changeBooker, confirmOrder, createOrder, findOrder, getMeta, getStoredServices, listOrders, updateDraftOrder, updateTrip } from "./repository";
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
 * API công khai cho module khác (`dispatch`, cạnh dispatch → orders — ADR-0006 điều 8): đơn có tồn tại không và AI LẬP (để `dispatch` xét "của mình" của
 * `dispatch.assign`). Chỉ trả người lập và trạng thái, không lộ gì khác của đơn; null nếu không có đơn.
 */
export async function findOrderOwner(db: D1Database, id: string): Promise<{ staffId: string; status: OrderStatus } | null> {
  const meta = await getMeta(db, id);
  return meta ? { staffId: meta.staffId, status: meta.status } : null;
}

export const ordersModule: AppModule = {
  name: "orders",
  routes: [
    route("GET", "/api/orders", "office", async ({ env, url }) => {
      const raw = url.searchParams.get("status");
      const status = raw ? (isOrderStatus(raw) ? raw : undefined) : null;
      if (status === undefined) return error(400, "invalid_input", "Trạng thái lọc không hợp lệ.");
      const result = await listOrders(env.DB, {
        q: (url.searchParams.get("q") ?? "").trim().slice(0, 100),
        status,
        limit: intParam(url.searchParams.get("limit"), 30, 1, 100),
        offset: intParam(url.searchParams.get("offset"), 0, 0, 100000),
      });
      return json(result satisfies OrderListResponse);
    }),

    route("POST", "/api/orders", "office", async ({ env, request, staff, defaultHandlerStatement }) => {
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

    route("GET", "/api/orders/:id", "office", async ({ env, params, staff, isAssigned }) => {
      if (!UUID_RE.test(params.id!)) return NOT_FOUND();
      const [order, assigned] = await Promise.all([loadOrderView(env.DB, params.id!), isAssigned(params.id!)]);
      if (!order) return NOT_FOUND();
      // ADR-0007/0009: nhật ký/lịch sử sửa đơn — SALES chỉ đơn của mình hoặc đơn mình đang phụ trách; ACCOUNTING và ADMIN mọi đơn.
      // `assigned` tính MỘT lần cho cả nhật ký và `canModify`.
      const scope = { ownerId: order.staffId, assigned };
      const history = can(staff, "order.history.view", scope) ? await getAuditTrail(env.DB, order.id) : [];
      return json({ order, history, canModify: can(staff, "order.modify", scope) } satisfies OrderDetailResponse);
    }),

    route("PUT", "/api/orders/:id", "office", async ({ env, request, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.modify", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.status !== "draft") return NOT_EDITABLE();
      const parsed = validateOrder(await readJson(request), await validationContext(env.DB, id));
      if (!parsed.ok) return failure(parsed);
      const expected = parsed.value.expectedUpdatedAt;
      if (!expected) return error(400, "invalid_input", "Thiếu expectedUpdatedAt (mốc cập nhật của đơn mà form đã đọc).");
      const booker = await resolveBooker(env.DB, parsed.value.booker, staff.id, new Date(), { id: meta.bookerPartyId, name: meta.bookerName });
      if (!booker.ok) return error(400, "invalid_input", booker.message);
      if (!(await updateDraftOrder(env.DB, id, staff.id, { ...parsed.value, expectedUpdatedAt: expected }, booker.write))) {
        const now = await getMeta(env.DB, id);
        return now && now.status !== "draft" ? NOT_EDITABLE() : STALE();
      }
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),

    // Sửa trường vận hành (ngày giờ khởi hành, đón, check-in, ghi chú) — kể cả đơn ĐÃ XÁC NHẬN (Q9). Không đổi khách/tiền.
    route("PUT", "/api/orders/:id/trip", "office", async ({ env, request, params, staff, isAssigned }) => {
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
    route("PUT", "/api/orders/:id/booker", "office", async ({ env, request, params, staff, isAssigned }) => {
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

    route("POST", "/api/orders/:id/status", "office", async ({ env, request, params, staff, isAssigned }) => {
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
