// Module orders — sổ đơn hàng (spec §2.1 order/order_item, §2.3 bất biến). Route: /api/orders*.
// Mọi nhân viên đang hoạt động xem được mọi đơn (§2.4-4); chỉ người lập đơn hoặc admin được sửa/xác nhận/huỷ.
import { getAuditTrail } from "../audit";
import type { OrderDetailResponse, OrderListResponse, OrderResponse } from "../../shared/contracts";
import { UUID_RE, error, intParam, json, readJson } from "../../shared/http";
import { route, type AppModule } from "../../shared/router";
import { createOrder, findOrder, getMeta, listOrders, transitionOrder, updateDraftOrder } from "./repository";
import { canModify, canTransition, isOrderStatus, validateOrder } from "./rules";

const FORBIDDEN = () => error(403, "forbidden", "Chỉ người lập đơn hoặc quản trị viên mới được thay đổi đơn này.");
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy đơn.");

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
      const parsed = validateOrder(await readJson(request), { catalog: new Map(), stored: [] });
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const id = await createOrder(env.DB, staff.id, parsed.value);
      return json({ order: (await findOrder(env.DB, id))! } satisfies OrderResponse, 201);
    }),

    route("GET", "/api/orders/:id", "staff", async ({ env, params, staff }) => {
      if (!UUID_RE.test(params.id!)) return NOT_FOUND();
      const order = await findOrder(env.DB, params.id!);
      if (!order) return NOT_FOUND();
      return json({ order, history: await getAuditTrail(env.DB, order.id), canModify: canModify(staff, order) } satisfies OrderDetailResponse);
    }),

    route("PUT", "/api/orders/:id", "staff", async ({ env, request, params, staff }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (!canModify(staff, meta)) return FORBIDDEN();
      if (meta.status !== "draft") return error(409, "not_editable", "Chỉ sửa được đơn ở trạng thái nháp. Muốn đổi đơn đã xác nhận, hãy huỷ và tạo đơn mới.");
      const parsed = validateOrder(await readJson(request), { catalog: new Map(), stored: [] });
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (!(await updateDraftOrder(env.DB, id, staff.id, parsed.value))) {
        return error(409, "not_editable", "Đơn vừa được đổi trạng thái, không sửa được nữa.");
      }
      return json({ order: (await findOrder(env.DB, id))! } satisfies OrderResponse);
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
      if (!(await transitionOrder(env.DB, id, staff.id, from, to))) {
        return error(409, "invalid_transition", "Đơn vừa được người khác đổi trạng thái, hãy tải lại.");
      }
      return json({ order: (await findOrder(env.DB, id))! } satisfies OrderResponse);
    }),
  ],
};
