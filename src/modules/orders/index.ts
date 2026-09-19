// Module orders — sổ đơn hàng (spec §2.1 order/order_service/order_item, §2.3 bất biến). Route: /api/orders*.
// Mọi nhân viên đang hoạt động xem được mọi đơn (§2.4-4); chỉ người lập đơn hoặc admin được sửa/xác nhận/huỷ.
import { getAuditTrail } from "../audit";
import type { CatalogChangeDto, CatalogChangedBody, IncompleteTripBody, OrderDetailResponse, OrderListResponse, OrderResponse } from "../../shared/contracts";
import { UUID_RE, error, intParam, json, readJson } from "../../shared/http";
import { route, type AppModule } from "../../shared/router";
import { vnToday } from "../../shared/vn-date";
import { cancelOrder, confirmOrder, createOrder, findOrder, getMeta, getStoredServices, listOrders, updateDraftOrder, updateTrip } from "./repository";
import { canModify, canTransition, isOrderStatus, validateOrder, type Failure } from "./rules";
import { loadOrderView, validationContext } from "./service";
import { confirmGaps, describeTripUpdates, summarizeDeviations, validateTripUpdate } from "./service-rules";

const FORBIDDEN = () => error(403, "forbidden", "Chỉ người lập đơn hoặc quản trị viên mới được thay đổi đơn này.");
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

export const ordersModule: AppModule = {
  name: "orders",
  routes: [
    route("GET", "/api/orders", "staff", async ({ env, url }) => {
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

    route("POST", "/api/orders", "staff", async ({ env, request, staff }) => {
      const parsed = validateOrder(await readJson(request), await validationContext(env.DB, null));
      if (!parsed.ok) return failure(parsed);
      const id = await createOrder(env.DB, staff.id, parsed.value);
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse, 201);
    }),

    route("GET", "/api/orders/:id", "staff", async ({ env, params, staff }) => {
      if (!UUID_RE.test(params.id!)) return NOT_FOUND();
      const order = await loadOrderView(env.DB, params.id!);
      if (!order) return NOT_FOUND();
      return json({ order, history: await getAuditTrail(env.DB, order.id), canModify: canModify(staff, order) } satisfies OrderDetailResponse);
    }),

    route("PUT", "/api/orders/:id", "staff", async ({ env, request, params, staff }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (!canModify(staff, meta)) return FORBIDDEN();
      if (meta.status !== "draft") return NOT_EDITABLE();
      const parsed = validateOrder(await readJson(request), await validationContext(env.DB, id));
      if (!parsed.ok) return failure(parsed);
      const expected = parsed.value.expectedUpdatedAt;
      if (!expected) return error(400, "invalid_input", "Thiếu expectedUpdatedAt (mốc cập nhật của đơn mà form đã đọc).");
      if (!(await updateDraftOrder(env.DB, id, staff.id, { ...parsed.value, expectedUpdatedAt: expected }))) {
        const now = await getMeta(env.DB, id);
        return now && now.status !== "draft" ? NOT_EDITABLE() : STALE();
      }
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),

    // Sửa trường vận hành (ngày giờ khởi hành, đón, check-in, ghi chú) — kể cả đơn ĐÃ XÁC NHẬN (Q9). Không đổi khách/tiền.
    route("PUT", "/api/orders/:id/trip", "staff", async ({ env, request, params, staff }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (!canModify(staff, meta)) return FORBIDDEN();
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

    route("POST", "/api/orders/:id/status", "staff", async ({ env, request, params, staff }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const body = await readJson(request);
      const to = body?.status;
      if (to !== "confirmed" && to !== "cancelled") return error(400, "invalid_input", "Trạng thái đích phải là confirmed hoặc cancelled.");
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (!canModify(staff, meta)) return FORBIDDEN();
      const from = meta.status;
      if (!canTransition(from, to)) return error(409, "invalid_transition", `Không thể chuyển đơn từ "${from}" sang "${to}".`);

      if (to === "cancelled") {
        if (!(await cancelOrder(env.DB, id, staff.id, from))) return RACED();
      } else {
        const today = vnToday(new Date());
        const order = await findOrder(env.DB, id);
        const detail = order ? summarizeDeviations(order.services.flatMap((s) => s.items)) : undefined;
        if (!(await confirmOrder(env.DB, id, staff.id, today, detail))) {
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
