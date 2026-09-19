// Module orders — sổ đơn hàng (spec §2.1 order/order_item, §2.3 bất biến). Route: /api/orders*.
// Mọi nhân viên đang hoạt động xem được mọi đơn (§2.4-4); chỉ người lập đơn hoặc admin được sửa/xác nhận/huỷ.
import { getAuditTrail } from "../audit";
import { requireStaff } from "../auth";
import { error, json, readJson, type AppModule } from "../../shared/http";
import { createOrder, findOrder, getMeta, listOrders, transitionOrder, updateDraftOrder } from "./repository";
import { canModify, canTransition, isOrderStatus, validateOrder } from "./rules";

const FORBIDDEN = () => error(403, "forbidden", "Chỉ người lập đơn hoặc quản trị viên mới được thay đổi đơn này.");

const ID_RE = /^[0-9a-f-]{36}$/;

function intParam(v: string | null, fallback: number, min: number, max: number): number {
  const n = v === null ? NaN : Number(v);
  return Number.isInteger(n) ? Math.min(Math.max(n, min), max) : fallback;
}

export const ordersModule: AppModule = {
  name: "orders",
  async handle(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["api", "orders", id?, "status"?]
    if (parts[0] !== "api" || parts[1] !== "orders") return null;

    const staff = await requireStaff(request, env);
    if (staff instanceof Response) return staff;
    const db = env.DB;
    const method = request.method;

    // /api/orders
    if (parts.length === 2) {
      if (method === "GET") {
        const statusParam = url.searchParams.get("status");
        if (statusParam && !isOrderStatus(statusParam)) return error(400, "invalid_input", "Trạng thái lọc không hợp lệ.");
        const result = await listOrders(db, {
          q: (url.searchParams.get("q") ?? "").trim().slice(0, 100),
          status: statusParam as "draft" | "confirmed" | "cancelled" | null,
          limit: intParam(url.searchParams.get("limit"), 30, 1, 100),
          offset: intParam(url.searchParams.get("offset"), 0, 0, 100000),
        });
        return json(result);
      }
      if (method === "POST") {
        const parsed = validateOrder(await readJson(request));
        if (!parsed.ok) return error(400, "invalid_input", parsed.message);
        const id = await createOrder(db, staff.id, parsed.value);
        return json({ order: await findOrder(db, id) }, 201);
      }
      return error(405, "method_not_allowed", "Phương thức không được hỗ trợ.");
    }

    const id = parts[2]!;
    if (!ID_RE.test(id)) return error(404, "not_found", "Không tìm thấy đơn.");

    // /api/orders/:id
    if (parts.length === 3) {
      if (method === "GET") {
        const order = await findOrder(db, id);
        if (!order) return error(404, "not_found", "Không tìm thấy đơn.");
        return json({ order, history: await getAuditTrail(db, id), canModify: canModify(staff, order) });
      }
      if (method === "PUT") {
        const meta = await getMeta(db, id);
        if (!meta) return error(404, "not_found", "Không tìm thấy đơn.");
        if (!canModify(staff, meta)) return FORBIDDEN();
        if (meta.status !== "draft") return error(409, "not_editable", "Chỉ sửa được đơn ở trạng thái nháp. Muốn đổi đơn đã xác nhận, hãy huỷ và tạo đơn mới.");
        const parsed = validateOrder(await readJson(request));
        if (!parsed.ok) return error(400, "invalid_input", parsed.message);
        if (!(await updateDraftOrder(db, id, staff.id, parsed.value))) {
          return error(409, "not_editable", "Đơn vừa được đổi trạng thái, không sửa được nữa.");
        }
        return json({ order: await findOrder(db, id) });
      }
      return error(405, "method_not_allowed", "Phương thức không được hỗ trợ.");
    }

    // /api/orders/:id/status
    if (parts.length === 4 && parts[3] === "status") {
      if (method !== "POST") return error(405, "method_not_allowed", "Phương thức không được hỗ trợ.");
      const body = await readJson(request);
      const to = body?.status;
      if (to !== "confirmed" && to !== "cancelled") return error(400, "invalid_input", "Trạng thái đích phải là confirmed hoặc cancelled.");
      const meta = await getMeta(db, id);
      if (!meta) return error(404, "not_found", "Không tìm thấy đơn.");
      if (!canModify(staff, meta)) return FORBIDDEN();
      const from = meta.status;
      if (!canTransition(from, to)) return error(409, "invalid_transition", `Không thể chuyển đơn từ "${from}" sang "${to}".`);
      if (!(await transitionOrder(db, id, staff.id, from, to))) {
        return error(409, "invalid_transition", "Đơn vừa được người khác đổi trạng thái, hãy tải lại.");
      }
      return json({ order: await findOrder(db, id) });
    }

    return error(404, "not_found", "Không tìm thấy.");
  },
};
