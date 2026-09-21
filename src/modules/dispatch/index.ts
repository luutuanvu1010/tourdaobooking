// Module dispatch — phân công (ADR-0006). Đợt này chỉ có NGƯỜI PHỤ TRÁCH đơn (dòng `HANDLE` hạt đơn của `dsp_assignment`): người nhận trách nhiệm chăm sóc khách
// (gọi xác nhận, đón), mặc định là người lập đơn, đổi được, và SỬA ĐƯỢC ĐƠN như người lập (ADR-0009). Nhiệm vụ đón/lái cano, gán theo dịch vụ: N2.
// Route: GET /api/dispatch/handlers, GET /api/dispatch/assignees, PUT /api/orders/:id/handler (đường dẫn dưới /api/orders/:id/ vì là thao tác trên MỘT đơn;
// router khớp theo đoạn nên không đụng route của `orders`).
// Chiều phụ thuộc (ADR-0006 điều 8): dispatch → orders, staff, audit. `orders` KHÔNG import `dispatch`: gốc lắp ráp (src/index.ts) tiêm `isOrderHandler` và
// `defaultHandlerStatement` vào ctx (ADR-0007 điều 4(b)). Ghi nhật ký và đổi dữ liệu trong cùng một db.batch() (`handlerChangeStatements`).
import { findOrderOwner } from "../orders";
import { getStaffAccount, listStaffAccounts } from "../staff";
import type { AssigneeDto, AssigneesResponse, HandlerDto, HandlersResponse, SetHandlerResponse } from "../../shared/contracts";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { route, type AppModule } from "../../shared/router";
import { findHandlerOf, findHandlersOf, insertHandlerStatement, isHandler, type HandlerRow } from "./repository";
import { checkAssignee, handlerChangeVerdict, isOpenHandlerCollision, parseOrderIds, parseSetHandler } from "./rules";
import { handlerChangeStatements } from "./service";

const toDto = (r: HandlerRow): HandlerDto => ({ partyId: r.party_id, staffId: r.staff_id, name: r.label });

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy đơn.");
const FORBIDDEN = () =>
  error(403, "forbidden", "Chỉ người lập đơn, người phụ trách hiện tại hoặc quản trị viên mới được đổi người phụ trách. Đơn chưa có người phụ trách thì nhân viên bán hàng nhận cho chính mình được.");
const NO_CHANGE = () => error(409, "no_change", "Người này đang phụ trách đơn rồi.");
const STALE = () => error(409, "stale", "Người phụ trách đơn vừa được người khác đổi, hãy tải lại rồi thử lại.");

/** Người dùng `staffId` có phải người phụ trách ĐANG MỞ của đơn `orderId` không. Gốc lắp ráp tiêm vào `ctx.isAssigned` (ADR-0007 điều 4(b)). */
export const isOrderHandler = (db: D1Database, staffId: string, orderId: string): Promise<boolean> => isHandler(db, staffId, orderId);

/**
 * Câu lệnh (CHƯA chạy) đặt `who` làm người phụ trách mặc định của đơn MỚI `orderId` — `orders/repository.ts` gộp vào db.batch() tạo đơn, sau câu INSERT đơn
 * (ADR-0009 điều 4). null nếu tài khoản chưa có hồ sơ (`party_id`): đơn không có người phụ trách là trạng thái hợp lệ, nhận sau bằng `dispatch.claim`.
 */
export function defaultHandlerStatement(db: D1Database, who: { id: string; partyId: string | null }, orderId: string, at: string): D1PreparedStatement | null {
  return who.partyId ? insertHandlerStatement(db, { id: crypto.randomUUID(), orderId, partyId: who.partyId, at, actorId: who.id }) : null;
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
  ],
};
