// Module dispatch — phân công (ADR-0006). Đợt này chỉ có NGƯỜI PHỤ TRÁCH đơn (dòng `HANDLE` hạt đơn của `dsp_assignment`): người nhận trách nhiệm chăm sóc khách
// (gọi xác nhận, đón), đổi được, và SỬA ĐƯỢC ĐƠN như người lập (ADR-0009). Đơn mới KHÔNG tự gắn người lập (ADR-0030 S20-4, ADR-0020 điều 1, Q-C): người lập
// CHỌN người phụ trách ngay trong form (có hiệu lực ngay, cùng lô tạo đơn — `newOrderHandler`), không chọn thì đơn chờ người nhận (`dispatch.claim`).
// Nhiệm vụ đón/lái cano, gán theo dịch vụ: N2.
// Route: GET /api/dispatch/handlers, GET /api/dispatch/assignees, PUT /api/orders/:id/handler (đường dẫn dưới /api/orders/:id/ vì là thao tác trên MỘT đơn;
// router khớp theo đoạn nên không đụng route của `orders`).
// Chiều phụ thuộc (ADR-0006 điều 8): dispatch → orders, staff, audit. `orders` KHÔNG import `dispatch` và không đọc view `v_dsp_*` (ADR-0030 S20-13,
// `src/architecture.test.ts` canh): gốc lắp ráp (src/index.ts) tiêm `isOrderHandler`, `newOrderHandler`, `ordersWithHandler` và `handledOrderIdsOf`
// vào ctx (ADR-0007 điều 4(b)). Ghi nhật ký và đổi dữ liệu trong cùng một db.batch() (`handlerChangeStatements`, `newOrderHandlerStatements`).
import { cancelOrderByHandler, editMoneyAsHandler, findOrderDepartDates, findOrderOwner, getMyAssignments } from "../orders";
import { getStaffAccount, listStaffAccounts } from "../staff";
import type { AssigneeDto, AssigneesResponse, HandlerCancelResponse, HandlerDto, HandlerMoneyEditResponse, HandlersResponse, MyAssignmentsResponse, SetHandlerResponse } from "../../shared/contracts";
import { assigneeRoleLabel } from "../../shared/assignee-pick";
import { thayDoiCuaHandler, type TrangThaiPhuTrach } from "../../shared/bang-tin";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { can, hasPermission, holdsPartner, MATRIX } from "../../shared/permissions";
import { lyDoHuyCuaHdv } from "../../shared/ly-do-huy";
import { route, type AppModule, type NewOrderHandler } from "../../shared/router";
import { tripDeparted } from "../../shared/trip-rules";
import { vnToday } from "../../shared/vn-date";
import { findHandledOrderIds, findHandlerOf, findHandlersOf, guardHandlerStatement, isHandler, orderDelivered, soDonDangPhuTrach, type HandlerRow } from "./repository";
import {
  CANCEL_REASON_LABEL, checkAssignee, handlerChangeVerdict, isOpenHandlerCollision, parseCancelReason, parseOrderIds, parseSetHandler,
} from "./rules";
import { handlerChangeStatements, newOrderHandlerStatements } from "./service";

const toDto = (r: HandlerRow): HandlerDto => ({ partyId: r.party_id, staffId: r.staff_id, name: r.label });

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy đơn.");
const FORBIDDEN = () =>
  error(403, "forbidden", "Chỉ người lập đơn, người phụ trách hiện tại hoặc quản trị viên mới được đổi người phụ trách. Đơn chưa có người phụ trách thì nhân viên bán hàng hoặc hướng dẫn viên nhận cho chính mình được.");
/** Từ chối XEM (người phụ trách của mọi đơn, liên hệ khách của "Việc của tôi" — ADR-0019 điều 2). */
const VIEW_FORBIDDEN = () => error(403, "forbidden", "Tài khoản này không được xem thông tin này.");
const NO_CHANGE = () => error(409, "no_change", "Người này đang phụ trách đơn rồi.");
const STALE = () => error(409, "stale", "Người phụ trách đơn vừa được người khác đổi, hãy tải lại rồi thử lại.");
const CANCEL_FORBIDDEN = () => error(403, "forbidden", "Chỉ hướng dẫn viên đang phụ trách đơn mới huỷ được đơn theo cách này.");
const NOT_CONFIRMED = () => error(409, "not_editable", "Chỉ huỷ được đơn đã xác nhận qua đường này; đơn chờ xác nhận hoặc đã huỷ không dùng được.");
const DEPARTED = () => error(409, "departed", "Tour đã qua ngày đi — hướng dẫn viên không huỷ được nữa. Nhờ văn phòng huỷ nếu cần.");
const MONEY_EDIT_DEPARTED = () => error(409, "departed", "Đơn đã qua ngày đi — không sửa số khách được nữa. Cần sửa, nhờ tài khoản Toàn quyền.");
const HANDLER_RACED = () => error(409, "stale", "Đơn vừa được người khác đổi, hãy tải lại rồi thử lại.");
/** Chốt "Nhận" (ADR-0030 S20-5, lệch có chủ ý 5.1 — `docs/SYSTEM-DESIGN.md` §16): áp CHỈ cho tự nhận đơn chưa có người, không áp cho "giao". */
const CLAIM_PARTNER_FORBIDDEN = () => error(403, "forbidden", "Tài khoản có quyền Đối tác không làm người phụ trách được.");
const CLAIM_CANCELLED = () => error(409, "cancelled", "Đơn đã huỷ, không nhận được.");
const CLAIM_DEPARTED = () => error(409, "departed", "Tour đã qua ngày đi, không nhận được.");
const MONEY_EDIT_FORBIDDEN = () => error(403, "forbidden", "Chỉ hướng dẫn viên đang phụ trách đơn mới sửa được số khách theo cách này.");
const MONEY_EDIT_NOT_CONFIRMED = () => error(409, "not_editable", "Chỉ sửa được số khách của đơn đã xác nhận qua đường này.");
const MONEY_EDIT_STALE = () => error(409, "stale", "Đơn vừa được sửa bởi người khác, hãy tải lại rồi thử lại.");
/** Sổ tiền lượt 1 (ADR-0025 đ5, bản làm mới §3 mục 12): đơn đã "Đã giao – đã thu đủ" — không đổi / nhận người phụ trách, không huỷ, không sửa số khách. */
const DA_GIAO = () => error(409, "order_delivered", "Đơn đã Đã giao – đã thu đủ: không sửa, huỷ hay đổi người phụ trách được nữa. Sai sót thì Kế toán dùng “Thay lần thu”.");

/** Người dùng `staffId` có phải người phụ trách ĐANG MỞ của đơn `orderId` không. Gốc lắp ráp tiêm vào `ctx.isAssigned` (ADR-0007 điều 4(b)). */
export const isOrderHandler = (db: D1Database, staffId: string, orderId: string): Promise<boolean> => isHandler(db, staffId, orderId);

/**
 * Trong các đơn `orderIds`, đơn nào ĐANG có người phụ trách (dòng `HANDLE` đang mở — kể cả khi người phụ trách là hồ sơ không có tài khoản). Gốc lắp ráp
 * tiêm vào `ctx.ordersWithHandler` (ADR-0030 S20-13, ADR-0007 điều 4(b)): `orders` hỏi hàm này thay vì tự đọc view của dispatch (câu đếm "Chưa phụ trách"
 * của Trang chủ; hàng chờ nhận của lượt sau). Dùng lại câu `findHandlersOf` (json_each — câu SQL tĩnh dù số id đổi), không SQL mới. Mảng rỗng → tập
 * rỗng, không truy vấn. GIỚI HẠN ĐÃ BIẾT: không cắt lô — cả mảng id đi trong MỘT tham số JSON, lớn dần theo số đơn nơi gọi đưa vào (Trang chủ: mọi đơn
 * chưa huỷ); khi số đó vượt vài nghìn thì phải xem lại (số đo ở chú thích khối 4 của `getDashboard`, `orders/repository.ts`).
 */
export async function ordersWithHandler(db: D1Database, orderIds: readonly string[]): Promise<Set<string>> {
  if (orderIds.length === 0) return new Set();
  return new Set((await findHandlersOf(db, orderIds)).map((r) => r.order_id));
}

/** Mọi đơn mà `staffId` ĐANG phụ trách (dòng `HANDLE` đang mở). Gốc lắp ráp tiêm vào `ctx.myHandledOrderIds` với `staffId` = người đang đăng nhập (ADR-0030). Dùng lại `findHandledOrderIds`. */
export const handledOrderIdsOf = (db: D1Database, staffId: string): Promise<string[]> => findHandledOrderIds(db, staffId);

/**
 * Người phụ trách ĐANG MỞ của đơn, dạng Bảng tin cần (ADR-0022, NT-2) — gốc lắp ráp gọi để tính nhãn người nhận và đổi `tao` → `tao_cho_nhan`. Có dòng
 * đang mở → `coNguoi: true`; `staffId` = tài khoản của hồ sơ đó, **null nếu hồ sơ không có tài khoản** (đơn vẫn CÓ người: không gắn `cho-nhan`, nhưng không
 * có nhãn `nguoi:` cho người đó). Không có dòng đang mở → `{ coNguoi: false, staffId: null }`. Dùng lại câu tra `findHandlerOf` — không SQL mới.
 */
export async function handlerOf(db: D1Database, orderId: string): Promise<TrangThaiPhuTrach> {
  const row = await findHandlerOf(db, orderId);
  return row ? { coNguoi: true, staffId: row.staff_id } : { coNguoi: false, staffId: null };
}

/**
 * Người phụ trách do người lập `actorId` CHỌN (`staffId`) ngay lúc lập đơn (ADR-0030 S20-4, ADR-0020 điều 1, Q-C) — gốc lắp ráp tiêm vào
 * `ctx.newOrderHandler(staffId)`; route `POST /api/orders` chỉ gọi khi thân có `handlerStaffId`, SAU khi tự hỏi quyền chọn của người gọi (`dispatch.assign`
 * với đơn của chính mình). Đọc tài khoản ĐÍCH từ D1 (`getStaffAccount`: đang hoạt động? hồ sơ? quyền?) rồi xét bằng CHÍNH luật người được giao
 * `checkAssignee` (không chép luật: đổi luật người được giao — vd chặn tài khoản lai, ADR-0030 S20-5 — thì đường này đổi theo). Không đạt → lời báo; route
 * trả 400 `invalid_assignee` và không tạo đơn. Đạt → hàm dựng câu lệnh (`newOrderHandlerStatements`) mà `createOrder` gọi với id đơn + mốc `at` của TỪNG
 * lần thử — hàm này KHÔNG đọc đồng hồ (dòng `HANDLE` và nhật ký cùng mốc với dòng `created`).
 */
export async function newOrderHandler(db: D1Database, actorId: string, staffId: string): Promise<NewOrderHandler> {
  const target = checkAssignee(await getStaffAccount(db, staffId));
  if (!target.ok) return { ok: false, message: target.message };
  const to = { partyId: target.partyId, name: target.name };
  return { ok: true, statements: (orderId, at) => newOrderHandlerStatements(db, { orderId, to, actorId, at, tuNhan: false }) };
}

/**
 * API công khai cho BILLING (ADR-0024 điều 2 — cạnh billing → dispatch CHỈ để lấy câu này): câu bảo vệ CHƯA CHẠY "`partyId` vẫn là người phụ trách đang mở
 * của đơn", gộp vào lô "Đã giao" của billing, đứng NGAY TRƯỚC câu `orders` (câu đó có `AND changes() > 0`).
 */
export const cauBaoVeNguoiPhuTrach = (db: D1Database, orderId: string, partyId: string): D1PreparedStatement => guardHandlerStatement(db, orderId, partyId);
/** ADR-0068 Đ2 — CHỈ gốc lắp ráp gọi (ctx.gopHoSo): hồ sơ `partyId` đang phụ trách bao nhiêu đơn chưa xong. Không có câu bảo vệ trong lô gộp: hồ sơ phụ không có
 * tài khoản nên không được giao mới (checkAssignee đòi tài khoản) — khe giữa kiểm và ghi chấp nhận được, R-PTY-MERGE-4 bắt nếu lọt. */
export const soDonDangPhuTrachCua = (db: D1Database, partyId: string): Promise<number> => soDonDangPhuTrach(db, partyId);

export const dispatchModule: AppModule = {
  name: "dispatch",
  routes: [
    // Người phụ trách của các đơn đang hiện ở danh sách (một lời gọi mỗi trang). Mọi id gửi lên đều có mặt trong kết quả; đơn chưa có người → null.
    // ADR-0019: cổng "orders" (màn đơn) chỉ lọc thô; route nhận id BẤT KỲ nên thân hỏi `order.view` KHÔNG ngữ cảnh (= xem được mọi đơn) TRƯỚC khi
    // đọc tham số — Đối tác/Thực tập (`own`) → 403.
    route("GET", "/api/dispatch/handlers", "orders", async ({ env, url, staff }) => {
      if (!can(staff, "order.view")) return VIEW_FORBIDDEN();
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

    // Nhân sự có thể được giao: đang hoạt động, có hồ sơ, không mang quyền Đối tác, có quyền Bán hàng/Quản trị/Toàn quyền hoặc Hướng dẫn viên (luật
    // `checkAssignee` — ai có mặt chỉ do luật đó). Thứ tự theo tên (kiểu Việt Nam) của module staff. Mỗi người kèm `roleLabel` (nhãn nhóm hiển thị cho bảng
    // chọn trong form lập đơn — `assigneeRoleLabel`, Task 1.8 phần b ADR-0030; KHÔNG phải luật quyền).
    // ADR-0019 điều 2: chỉ ai giao được ít nhất đơn của mình (`dispatch.assign` với ownerId = chính mình) — kế toán qua cổng "office" nhưng 403 ở đây.
    route("GET", "/api/dispatch/assignees", "office", async ({ env, staff }) => {
      if (!can(staff, "dispatch.assign", { ownerId: staff.id })) return FORBIDDEN();
      const assignees = (await listStaffAccounts(env.DB)).flatMap((account): AssigneeDto[] => {
        const checked = checkAssignee(account);
        return checked.ok ? [{ staffId: account.id, partyId: checked.partyId, name: checked.name, roleLabel: assigneeRoleLabel(account.permissions) }] : [];
      });
      return json({ assignees } satisfies AssigneesResponse);
    }),

    // "Việc của tôi": đơn mà CHÍNH staff gọi đang phụ trách — không tham số (staff.id lấy từ phiên đăng nhập), tự khoanh phạm vi bằng chính người
    // gọi. Dùng cho khối "Việc của tôi" ở trang Tôi (FIELD — ADR-0014 điều 6/11). Phản hồi có tên/SĐT khách nên hỏi `contact.view` phạm vi "được
    // giao", và từ Task 1.8 (chủ dự án quyết 2026-09-27) có Tổng tiền/Đã cọc/Còn thu nên hỏi CẢ `money.view` cùng phạm vi (ADR-0019 điều 2: thiếu
    // một ô → 403 cả phản hồi, không cắt bớt trường). Mọi mã làm người phụ trách được đều có hai ô ⊇ assigned; Thực tập (`own`) và Đối tác thuần
    // (`money.view` = own; không bao giờ làm người phụ trách được — `checkAssignee`) → 403. Giao diện chỉ gọi route này cho tài khoản có quyền Hướng
    // dẫn viên (`web/account.ts`).
    route("GET", "/api/dispatch/mine", "staff", async ({ env, staff }) => {
      if (!can(staff, "contact.view", { assigned: true })) return VIEW_FORBIDDEN();
      if (!can(staff, "money.view", { assigned: true })) return VIEW_FORBIDDEN();
      const orderIds = await findHandledOrderIds(env.DB, staff.id);
      const assignments = await getMyAssignments(env.DB, orderIds);
      return json({ assignments } satisfies MyAssignmentsResponse);
    }),

    // Đặt/đổi người phụ trách (hoặc tự nhận khi đơn chưa có người). Thứ tự: 403 sàng sớm (không có ô nhận/giao nào — ADR-0019) → 404 → 400 (thân) →
    // 403 (vượt quyền trên đơn này) hoặc 409 stale (nhận đơn ĐÃ có người) → 400 (người được giao) → 409 (không đổi) → ghi (409 stale nếu thua tranh chấp).
    // Mọi kết quả "thua đua" là MỘT mã: 409 stale.
    // Sàng sớm KHÔNG đổi 409 nào thành 403: `handlerChangeVerdict` chỉ trả allow/stale cho người có `dispatch.claim` hoặc `dispatch.assign` (theo MATRIX
    // hôm nay SALES/ADMIN/SUPER_ADMIN và — từ ADR-0030 S20-6/S20-12 — FIELD, cả bốn đều `dispatch.claim` = any ⇒ luôn qua sàng; FIELD không có
    // `dispatch.assign` nên chỉ tự Nhận được, giao cho người khác → 403); ai không có cả hai (kế toán, Đối tác, Thực tập) vốn chỉ nhận "forbidden" — nay
    // nhận sớm hơn, trước mọi đọc CSDL/thân yêu cầu.
    route("PUT", "/api/orders/:id/handler", "orders", async ({ env, request, params, staff, baoThayDoi }) => {
      if (!can(staff, "dispatch.claim") && !can(staff, "dispatch.assign", { ownerId: staff.id })) return FORBIDDEN();
      const orderId = params.id!;
      if (!UUID_RE.test(orderId)) return NOT_FOUND();
      const [order, current] = await Promise.all([findOrderOwner(env.DB, orderId), findHandlerOf(env.DB, orderId)]);
      if (!order) return NOT_FOUND();
      // Bảng tin (ADR-0022, NT-2): trạng thái phụ trách TRƯỚC thay đổi, tính từ `current` đã đọc — dùng cho cả luật "nhận"/"giao" và nhãn người nhận.
      const truoc: TrangThaiPhuTrach = { coNguoi: current !== null, staffId: current?.staff_id ?? null };
      // Chốt Nhận đơn đã huỷ/đã qua ngày đi (ADR-0030 S20-5) chỉ áp cho "Nhận" thật (xem khối dưới, sau verdict). GIAO cho người khác vẫn được cả với đơn đã
      // xác nhận và đơn ĐÃ HUỶ (khách của đơn huỷ vẫn cần người theo dõi) — luật chốt Nhận chỉ ở mã máy chủ, không trigger: LỆCH CÓ CHỦ Ý 5.1, xem
      // `docs/SYSTEM-DESIGN.md` §16. Với đơn huỷ, giao chỉ mở thêm cho người phụ trách quyền xem nhật ký đơn (order.history.view); sửa nội dung đơn vẫn bị
      // các luật trạng thái của `orders` chặn như mọi người.
      const input = parseSetHandler(await readJson(request));
      if (!input.ok) return error(400, "invalid_input", input.message);
      // "Nhận" đơn ĐÃ có người phụ trách (người có quyền nhận thua đua) là 409 stale để giao diện tải lại — không phải 403 (xem `handlerChangeVerdict`).
      const verdict = handlerChangeVerdict(staff, { ownerId: order.staffId }, current ? { staffId: current.staff_id } : null, input.staffId);
      if (verdict === "stale") return STALE();
      if (verdict === "forbidden") return FORBIDDEN();
      if (await orderDelivered(env.DB, orderId)) return DA_GIAO();
      // "Nhận" thật: đơn CHƯA có người (current === null) và người gọi tự đặt CHÍNH MÌNH. Chốt Nhận (ADR-0030 S20-5) và chặn tài khoản lai (có quyền Đối
      // tác) chỉ áp NHÁNH này — giao cho người khác không đổi (đúng chú thích ở trên).
      if (current === null && input.staffId === staff.id) {
        if (holdsPartner(staff)) return CLAIM_PARTNER_FORBIDDEN();
        if (order.status === "cancelled") return CLAIM_CANCELLED();
        if (tripDeparted(await findOrderDepartDates(env.DB, orderId), vnToday(new Date()))) return CLAIM_DEPARTED();
      }
      const target = checkAssignee(await getStaffAccount(env.DB, input.staffId));
      if (!target.ok) return error(400, "invalid_assignee", target.message);
      if (current?.party_id === target.partyId) return NO_CHANGE();

      // MỘT batch: đóng dòng cũ + mở dòng mới + nhật ký (hoặc mở dòng + nhật ký khi chưa có người). `changes` của câu ĐẦU = thắng/thua tranh chấp.
      // `thayDoi` tính TRƯỚC khi ghi (không phụ thuộc thắng/thua tranh chấp — chỉ phụ thuộc trạng thái đã đọc): dùng để chọn hành động nhật ký
      // (order_claimed/order_handler_changed) VÀ để báo bảng tin sau khi ghi — đúng MỘT nguồn, đúng MỘT lời gọi baoThayDoi.
      const thayDoi = thayDoiCuaHandler({ nguoiGoi: staff.id, handlerTruoc: truoc, handlerSau: { coNguoi: true, staffId: input.staffId } });
      const statements = handlerChangeStatements(env.DB, {
        orderId,
        from: current ? { partyId: current.party_id, name: current.label } : null,
        to: { partyId: target.partyId, name: target.name },
        actorId: staff.id,
        at: new Date().toISOString(),
        tuNhan: thayDoi === "nhan",
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
      baoThayDoi({ orderId, thayDoi, handlerTruoc: truoc });
      return json({ handler: toDto(now!) } satisfies SetHandlerResponse);
    }),

    // Huỷ đơn qua đường hẹp của người phụ trách CẤP HẸP (FIELD đang phụ trách — ADR-0014 điều 11). Không dùng cho SALES/ADMIN/PARTNER (họ huỷ qua
    // POST /api/orders/:id/status như hôm nay — order.cancel của họ vẫn "none"). Thứ tự: 404 → 403 (không phải người phụ trách/không có order.cancel) →
    // 409 (không phải đơn đã xác nhận, hoặc đã bị đổi trạng thái) → 409 `departed` (tour đã qua ngày đi — DK-T4-02, chủ dự án chốt 2026-09-26: ngày đi
    // = ngày khởi hành lớn nhất trong các dịch vụ, đã qua ⇔ < hôm nay giờ VN; ngay trong ngày đi vẫn huỷ được; từ hôm sau chỉ văn phòng huỷ qua
    // /status) → 400 (lý do) → ghi. Đổi ngày giữa lúc đọc và lúc ghi (PUT /trip) làm đổi `updated_at` (KHÔNG đổi `status`) → khoá lạc quan của
    // cancelOrderByHandler (khoá theo CẢ `status` VÀ `updated_at`, T1d) thua → 409.
    route("POST", "/api/orders/:id/handler-cancel", "staff", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const orderId = params.id!;
      if (!UUID_RE.test(orderId)) return NOT_FOUND();
      const [order, assigned] = await Promise.all([findOrderOwner(env.DB, orderId), isAssigned(orderId)]);
      if (!order) return NOT_FOUND();
      if (!can(staff, "order.cancel", { assigned })) return CANCEL_FORBIDDEN();
      if (await orderDelivered(env.DB, orderId)) return DA_GIAO();
      if (order.status !== "confirmed") return NOT_CONFIRMED();
      if (tripDeparted(await findOrderDepartDates(env.DB, orderId), vnToday(new Date()))) return DEPARTED();
      const input = parseCancelReason(await readJson(request));
      if (!input.ok) return error(400, "invalid_input", input.message);
      // "Khác" (ADR-0030 điều 2, sửa đổi sau khi duyệt 2026-09-27): nhãn nhật ký CHÍNH LÀ note đã kiểm (không chứa dãy số dài) — hai mã cũ vẫn dùng
      // nhãn cố định của CANCEL_REASON_LABEL.
      const label = input.reason === "other" ? input.note! : CANCEL_REASON_LABEL[input.reason];
      // ADR-0089 đ8 + lời chủ (a): lý do HDV ánh xạ nhóm ("không liên hệ được khách" = khách huỷ) — lưu cùng lô huỷ.
      const ok = await cancelOrderByHandler(env.DB, orderId, staff.id, order.updatedAt, lyDoHuyCuaHdv(input.reason, input.note), label);
      if (!ok) {
        const now = await findOrderOwner(env.DB, orderId);
        return now?.status === "confirmed" ? HANDLER_RACED() : NOT_CONFIRMED();
      }
      baoThayDoi({ orderId, thayDoi: "huy" });
      return json({ ok: true } satisfies HandlerCancelResponse);
    }),

    // Sửa số khách của đơn đang phụ trách CẤP HẸP (FIELD — ADR-0014 điều 6). Ghi thêm dòng điều chỉnh, KHÔNG sửa đè order_service/order_item/cột
    // tiền. Không lộ giá cho FIELD: phản hồi chỉ { ok: true }. Thứ tự: 404 → 403 (không phải người phụ trách/không có order.money.edit) → 409 đã
    // giao → 409 `departed` (qua ngày đi — chủ dự án duyệt 2026-09-30 "Cho sửa đến hết ngày đi": cùng `tripDeparted` + `vnToday` với huỷ đơn,
    // DK-T4-02; ĐÚNG ngày đi vẫn sửa được; Toàn quyền KHÔNG bị chặn) → 409/400 do editMoneyAsHandler tự kiểm (không phải đơn đã xác nhận; thân yêu
    // cầu sai/thiếu/thừa dịch vụ; lý do có SĐT — `hasLongDigitRun`) → 409 stale nếu thua khoá lạc quan.
    route("POST", "/api/orders/:id/handler-money-edit", "staff", async ({ env, request, params, staff, isAssigned, baoThayDoi }) => {
      const orderId = params.id!;
      if (!UUID_RE.test(orderId)) return NOT_FOUND();
      const [order, assigned] = await Promise.all([findOrderOwner(env.DB, orderId), isAssigned(orderId)]);
      if (!order) return NOT_FOUND();
      // CỐ Ý không dùng can(staff, "order.money.edit", { assigned }) trần: ô order.money.edit của ACCOUNTING/ADMIN trong MATRIX là "any" (dành cho
      // route văn phòng `POST /api/orders/:id/money-edit` — ADR-0063 D1, cổng office; sửa số khách MỌI đơn không cần đang phụ trách) — can() hợp nhiều quyền nên sẽ cho ACCOUNTING/ADMIN qua route HẸP
      // này dù không phải người phụ trách (lỗ đã bị kiểm độc lập bắt: đổi số khách/tiền của BẤT KỲ đơn đã xác nhận nào). Route hẹp này CHỈ dành cho
      // cấp hẹp thật (ô CHÍNH XÁC = "assigned", tức FIELD) VÀ đang được giao, cộng SUPER_ADMIN (ADR-0014 điều 2: any ở MỌI thao tác, không ngoại lệ).
      const narrowEligible = assigned && staff.permissions.some((p) => MATRIX["order.money.edit"][p] === "assigned");
      if (!narrowEligible && !hasPermission(staff, "SUPER_ADMIN")) return MONEY_EDIT_FORBIDDEN();
      if (await orderDelivered(env.DB, orderId)) return DA_GIAO();
      if (!hasPermission(staff, "SUPER_ADMIN") && tripDeparted(await findOrderDepartDates(env.DB, orderId), vnToday(new Date()))) return MONEY_EDIT_DEPARTED();
      const result = await editMoneyAsHandler(env.DB, orderId, staff.id, await readJson(request));
      if (!result.ok) {
        if (result.code === "not_found") return NOT_FOUND();
        if (result.code === "not_confirmed") return MONEY_EDIT_NOT_CONFIRMED();
        if (result.code === "stale") return MONEY_EDIT_STALE();
        return error(400, "invalid_input", result.message ?? "Dữ liệu không hợp lệ.");
      }
      baoThayDoi({ orderId, thayDoi: "tien" });
      return json({ ok: true } satisfies HandlerMoneyEditResponse);
    }),
  ],
};
