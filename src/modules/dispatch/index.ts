// Module dispatch — phân công (ADR-0006). Đợt này chỉ có NGƯỜI PHỤ TRÁCH đơn (dòng `HANDLE` hạt đơn của `dsp_assignment`): người nhận trách nhiệm chăm sóc khách
// (gọi xác nhận, đón), mặc định là người lập đơn NẾU người lập đủ điều kiện được giao (tài khoản chỉ Đối tác thì không — ADR-0014 điều 9/10), đổi được, và
// SỬA ĐƯỢC ĐƠN như người lập (ADR-0009). Nhiệm vụ đón/lái cano, gán theo dịch vụ: N2.
// Route: GET /api/dispatch/handlers, GET /api/dispatch/assignees, PUT /api/orders/:id/handler (đường dẫn dưới /api/orders/:id/ vì là thao tác trên MỘT đơn;
// router khớp theo đoạn nên không đụng route của `orders`).
// Chiều phụ thuộc (ADR-0006 điều 8): dispatch → orders, staff, audit. `orders` KHÔNG import `dispatch`: gốc lắp ráp (src/index.ts) tiêm `isOrderHandler` và
// `defaultHandlerStatement` vào ctx (ADR-0007 điều 4(b)). Ghi nhật ký và đổi dữ liệu trong cùng một db.batch() (`handlerChangeStatements`).
import { cancelOrderByHandler, editMoneyAsHandler, findOrderOwner, getMyAssignments } from "../orders";
import { getStaffAccount, listStaffAccounts } from "../staff";
import type { AssigneeDto, AssigneesResponse, HandlerCancelResponse, HandlerDto, HandlerMoneyEditResponse, HandlersResponse, MyAssignmentsResponse, SetHandlerResponse } from "../../shared/contracts";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { can, hasPermission, MATRIX } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { findHandledOrderIds, findHandlerOf, findHandlersOf, insertHandlerStatement, isHandler, type HandlerRow } from "./repository";
import {
  CANCEL_REASON_LABEL, checkAssignee, defaultHandlerPartyId, handlerChangeVerdict, isOpenHandlerCollision, parseCancelReason, parseOrderIds, parseSetHandler,
  type AssigneeCandidate,
} from "./rules";
import { handlerChangeStatements } from "./service";

const toDto = (r: HandlerRow): HandlerDto => ({ partyId: r.party_id, staffId: r.staff_id, name: r.label });

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy đơn.");
const FORBIDDEN = () =>
  error(403, "forbidden", "Chỉ người lập đơn, người phụ trách hiện tại hoặc quản trị viên mới được đổi người phụ trách. Đơn chưa có người phụ trách thì nhân viên bán hàng nhận cho chính mình được.");
const NO_CHANGE = () => error(409, "no_change", "Người này đang phụ trách đơn rồi.");
const STALE = () => error(409, "stale", "Người phụ trách đơn vừa được người khác đổi, hãy tải lại rồi thử lại.");
const CANCEL_FORBIDDEN = () => error(403, "forbidden", "Chỉ hướng dẫn viên đang phụ trách đơn mới huỷ được đơn theo cách này.");
const NOT_CONFIRMED = () => error(409, "not_editable", "Chỉ huỷ được đơn đã xác nhận qua đường này; đơn nháp hoặc đã huỷ không dùng được.");
const HANDLER_RACED = () => error(409, "stale", "Đơn vừa được người khác đổi, hãy tải lại rồi thử lại.");
const MONEY_EDIT_FORBIDDEN = () => error(403, "forbidden", "Chỉ hướng dẫn viên đang phụ trách đơn mới sửa được số khách theo cách này.");
const MONEY_EDIT_NOT_CONFIRMED = () => error(409, "not_editable", "Chỉ sửa được số khách của đơn đã xác nhận qua đường này.");
const MONEY_EDIT_STALE = () => error(409, "stale", "Đơn vừa được sửa bởi người khác, hãy tải lại rồi thử lại.");

/** Người dùng `staffId` có phải người phụ trách ĐANG MỞ của đơn `orderId` không. Gốc lắp ráp tiêm vào `ctx.isAssigned` (ADR-0007 điều 4(b)). */
export const isOrderHandler = (db: D1Database, staffId: string, orderId: string): Promise<boolean> => isHandler(db, staffId, orderId);

/**
 * Câu lệnh (CHƯA chạy) đặt người lập `who` làm người phụ trách mặc định của đơn MỚI `orderId` — `orders/repository.ts` gộp vào db.batch() tạo đơn, sau câu
 * INSERT đơn (ADR-0009 điều 4). null nếu người lập KHÔNG đủ điều kiện làm người phụ trách (luật `defaultHandlerPartyId` → `checkAssignee`: tài khoản chỉ Đối tác
 * — ADR-0014 điều 9/10 —, hoặc chưa có hồ sơ `party_id`): đơn không có người phụ trách là trạng thái hợp lệ, nhận sau bằng `dispatch.claim`/`dispatch.assign`.
 * `active: true` KHÔNG phải giả định: `who` là người ĐANG ĐĂNG NHẬP (router → `currentStaff` → `getActiveStaff`, hàm này trả null với tài khoản đã ngưng),
 * nên không đọc lại D1. Quyền (`who.permissions`) cũng chính là tập quyền route vừa dùng để cho phép lập đơn (`can(staff, "order.create")`).
 */
export function defaultHandlerStatement(db: D1Database, who: Omit<AssigneeCandidate, "active">, orderId: string, at: string): D1PreparedStatement | null {
  const partyId = defaultHandlerPartyId({ ...who, active: true });
  return partyId ? insertHandlerStatement(db, { id: crypto.randomUUID(), orderId, partyId, at, actorId: who.id }) : null;
}

export const dispatchModule: AppModule = {
  name: "dispatch",
  routes: [
    // Người phụ trách của các đơn đang hiện ở danh sách (một lời gọi mỗi trang). Mọi id gửi lên đều có mặt trong kết quả; đơn chưa có người → null.
    route("GET", "/api/dispatch/handlers", "office", async ({ env, url }) => {
      const parsed = parseOrderIds(url.searchParams.get("orderIds"));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const rows = parsed.ids.length ? await findHandlersOf(env.DB, parsed.ids) : [];
      const byOrder = new Map(rows.map((r) => [r.order_id, r]));
      const handlers: Record<string, HandlerDto | null> = {};
      for (const id of parsed.ids) {
        const row = byOrder.get(id);
        handlers[id] = row ? toDto(row) : null;
      }
      return json({ handlers } satisfies HandlersResponse);
    }),

    // Nhân sự có thể được giao: đang hoạt động, có hồ sơ, có quyền Bán hàng/Quản trị (luật `checkAssignee`). Thứ tự theo tên (kiểu Việt Nam) của module staff.
    route("GET", "/api/dispatch/assignees", "office", async ({ env }) => {
      const assignees = (await listStaffAccounts(env.DB)).flatMap((account): AssigneeDto[] => {
        const checked = checkAssignee(account);
        return checked.ok ? [{ staffId: account.id, partyId: checked.partyId, name: checked.name }] : [];
      });
      return json({ assignees } satisfies AssigneesResponse);
    }),

    // "Việc của tôi": đơn mà CHÍNH staff gọi đang phụ trách — không tham số (staff.id lấy từ phiên đăng nhập), an toàn với MỌI quyền vì tự khoanh
    // phạm vi bằng chính người gọi, không cần can() riêng. Dùng cho khối "Việc của tôi" ở trang Tôi (FIELD — ADR-0014 điều 6/11).
    route("GET", "/api/dispatch/mine", "staff", async ({ env, staff }) => {
      const orderIds = await findHandledOrderIds(env.DB, staff.id);
      const assignments = await getMyAssignments(env.DB, orderIds);
      return json({ assignments } satisfies MyAssignmentsResponse);
    }),

    // Đặt/đổi người phụ trách (hoặc tự nhận khi đơn chưa có người). Thứ tự: 404 → 400 (thân) → 403 (vượt quyền) hoặc 409 stale (nhận đơn ĐÃ có người) → 400 (người được giao)
    // → 409 (không đổi) → ghi (409 stale nếu thua tranh chấp). Mọi kết quả "thua đua" là MỘT mã: 409 stale.
    route("PUT", "/api/orders/:id/handler", "office", async ({ env, request, params, staff }) => {
      const orderId = params.id!;
      if (!UUID_RE.test(orderId)) return NOT_FOUND();
      const [order, current] = await Promise.all([findOrderOwner(env.DB, orderId), findHandlerOf(env.DB, orderId)]);
      if (!order) return NOT_FOUND();
      // CỐ Ý không xét trạng thái đơn: đổi/nhận người phụ trách được cả với đơn đã xác nhận và đơn ĐÃ HUỶ (khách của đơn huỷ vẫn cần người theo dõi). Với đơn huỷ, việc này chỉ
      // mở thêm cho người phụ trách quyền xem nhật ký đơn (order.history.view); sửa nội dung đơn vẫn bị các luật trạng thái của `orders` chặn như mọi người.
      const input = parseSetHandler(await readJson(request));
      if (!input.ok) return error(400, "invalid_input", input.message);
      // "Nhận" đơn ĐÃ có người phụ trách (người có quyền nhận thua đua) là 409 stale để giao diện tải lại — không phải 403 (xem `handlerChangeVerdict`).
      const verdict = handlerChangeVerdict(staff, { ownerId: order.staffId }, current ? { staffId: current.staff_id } : null, input.staffId);
      if (verdict === "stale") return STALE();
      if (verdict === "forbidden") return FORBIDDEN();
      const target = checkAssignee(await getStaffAccount(env.DB, input.staffId));
      if (!target.ok) return error(400, "invalid_assignee", target.message);
      if (current?.party_id === target.partyId) return NO_CHANGE();

      // MỘT batch: đóng dòng cũ + mở dòng mới + nhật ký (hoặc mở dòng + nhật ký khi chưa có người). `changes` của câu ĐẦU = thắng/thua tranh chấp.
      const statements = handlerChangeStatements(env.DB, {
        orderId,
        from: current ? { partyId: current.party_id, name: current.label } : null,
        to: { partyId: target.partyId, name: target.name },
        actorId: staff.id,
        at: new Date().toISOString(),
      });
      let results: D1Result[];
      try {
        results = await env.DB.batch(statements);
      } catch (e) {
        if (isOpenHandlerCollision(e)) return STALE(); // lưới cuối của chỉ mục duy nhất (cả batch đã quay lại): coi như thua tranh chấp, không phải 500
        throw e;
      }
      if ((results[0]!.meta.changes ?? 0) === 0) return STALE();
      const now = await findHandlerOf(env.DB, orderId);
      return json({ handler: toDto(now!) } satisfies SetHandlerResponse);
    }),

    // Huỷ đơn qua đường hẹp của người phụ trách CẤP HẸP (FIELD đang phụ trách — ADR-0014 điều 11). Không dùng cho SALES/ADMIN/PARTNER (họ huỷ qua
    // POST /api/orders/:id/status như hôm nay — order.cancel của họ vẫn "none"). Thứ tự: 404 → 403 (không phải người phụ trách/không có order.cancel) →
    // 409 (không phải đơn đã xác nhận, hoặc đã bị đổi trạng thái) → 400 (lý do) → ghi.
    route("POST", "/api/orders/:id/handler-cancel", "staff", async ({ env, request, params, staff, isAssigned }) => {
      const orderId = params.id!;
      if (!UUID_RE.test(orderId)) return NOT_FOUND();
      const [order, assigned] = await Promise.all([findOrderOwner(env.DB, orderId), isAssigned(orderId)]);
      if (!order) return NOT_FOUND();
      if (!can(staff, "order.cancel", { assigned })) return CANCEL_FORBIDDEN();
      if (order.status !== "confirmed") return NOT_CONFIRMED();
      const input = parseCancelReason(await readJson(request));
      if (!input.ok) return error(400, "invalid_input", input.message);
      const ok = await cancelOrderByHandler(env.DB, orderId, staff.id, order.updatedAt, CANCEL_REASON_LABEL[input.reason]);
      if (!ok) {
        const now = await findOrderOwner(env.DB, orderId);
        return now?.status === "confirmed" ? HANDLER_RACED() : NOT_CONFIRMED();
      }
      return json({ ok: true } satisfies HandlerCancelResponse);
    }),

    // Sửa số khách của đơn đang phụ trách CẤP HẸP (FIELD — ADR-0014 điều 6). Ghi thêm dòng điều chỉnh, KHÔNG sửa đè order_service/order_item/cột
    // tiền. Không lộ giá cho FIELD: phản hồi chỉ { ok: true }. Thứ tự: 404 → 403 (không phải người phụ trách/không có order.money.edit) → 409/400
    // do editMoneyAsHandler tự kiểm (không phải đơn đã xác nhận; thân yêu cầu sai/thiếu/thừa dịch vụ) → 409 stale nếu thua khoá lạc quan.
    route("POST", "/api/orders/:id/handler-money-edit", "staff", async ({ env, request, params, staff, isAssigned }) => {
      const orderId = params.id!;
      if (!UUID_RE.test(orderId)) return NOT_FOUND();
      const [order, assigned] = await Promise.all([findOrderOwner(env.DB, orderId), isAssigned(orderId)]);
      if (!order) return NOT_FOUND();
      // CỐ Ý không dùng can(staff, "order.money.edit", { assigned }) trần: ô order.money.edit của ACCOUNTING/ADMIN trong MATRIX là "any" (dành cho
      // một route KHÁC, chưa làm — N3, sửa tiền MỌI đơn không cần đang phụ trách) — can() hợp nhiều quyền nên sẽ cho ACCOUNTING/ADMIN qua route HẸP
      // này dù không phải người phụ trách (lỗ đã bị kiểm độc lập bắt: đổi số khách/tiền của BẤT KỲ đơn đã xác nhận nào). Route hẹp này CHỈ dành cho
      // cấp hẹp thật (ô CHÍNH XÁC = "assigned", tức FIELD) VÀ đang được giao, cộng SUPER_ADMIN (ADR-0014 điều 2: any ở MỌI thao tác, không ngoại lệ).
      const narrowEligible = assigned && staff.permissions.some((p) => MATRIX["order.money.edit"][p] === "assigned");
      if (!narrowEligible && !hasPermission(staff, "SUPER_ADMIN")) return MONEY_EDIT_FORBIDDEN();
      const result = await editMoneyAsHandler(env.DB, orderId, staff.id, await readJson(request));
      if (!result.ok) {
        if (result.code === "not_found") return NOT_FOUND();
        if (result.code === "not_confirmed") return MONEY_EDIT_NOT_CONFIRMED();
        if (result.code === "stale") return MONEY_EDIT_STALE();        return error(400, "invalid_input", result.message ?? "Dữ liệu không hợp lệ.");
      }
      return json({ ok: true } satisfies HandlerMoneyEditResponse);
    }),
  ],
};
