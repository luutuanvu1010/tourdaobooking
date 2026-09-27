// Router tối giản cho Worker (không thư viện). Module khai route: phương thức + đường dẫn + mức truy cập; router lo phần chung:
// khớp đường dẫn, 401/403/404/405 thống nhất, chặn ghi cross-site (CSRF), bắt lỗi toàn cục → 500 JSON có requestId.
// Router KHÔNG import module nào: cách xác định "ai đang đăng nhập" do gốc lắp ráp (src/index.ts) truyền vào.
import type { StaffProfile } from "./contracts";
import type { ThayDoiDon, TrangThaiPhuTrach } from "./bang-tin.ts";
import { error, json } from "./http.ts";
import { canAccessOrders, isOffice, passesAdminGate } from "./permissions.ts";

/** public: không cần đăng nhập; staff: mọi tài khoản đăng nhập; office: nhân sự văn phòng (mọi quyền trừ chỉ-FIELD — ADR-0007); orders: văn phòng HOẶC Đối tác (ADR-0014); admin: quyền ADMIN. */
export type Access = "public" | "staff" | "office" | "orders" | "admin";

/** ADR-0013 điều 4: hồ sơ có gắn tài khoản không, và người đang đăng nhập có quản được tài khoản đó không (luật cấp bậc ADR-0014 điều 8, module `staff` tính). */
export type PartyAccountVerdict = { linked: false } | { linked: true; manageable: boolean };

export interface Ctx<A extends Access = Access> {
  request: Request;
  env: Env;
  exec: ExecutionContext;
  url: URL;
  /** Tham số `:tên` trong đường dẫn, đã giải mã. */
  params: Record<string, string>;
  /** Nhân viên đang đăng nhập — luôn có với route "staff"/"admin". */
  staff: A extends "public" ? StaffProfile | null : StaffProfile;
  /**
   * Người đang đăng nhập có phải người phụ trách ĐANG MỞ của đơn `orderId` không — kết quả điền vào `can(staff, op, { ownerId, assigned })` cho các ô
   * `ownOrAssigned`/`assigned` (ADR-0007 điều 4(b), ADR-0009 điều 3). Do gốc lắp ráp tiêm (module `orders` không import `dispatch`). Là một HÀM (không phải giá trị
   * tính sẵn): MỖI LẦN GỌI là một truy vấn D1. Route phải truyền kết quả vào MỌI lời gọi `can()` có ô như vậy (quên là lặng lẽ tụt về `own`).
   * Bốn route của `orders` (GET/PUT đơn, PUT trip, POST status) gọi nó VÔ ĐIỀU KIỆN, song song với việc đọc đơn (`Promise.all`) — kể cả khi đơn không tồn tại hoặc
   * người dùng đằng nào cũng là người lập — chứ KHÔNG gọi lười sau khi biết cần. Chưa đăng nhập → false.
   */
  isAssigned: (orderId: string) => Promise<boolean>;
  /**
   * Câu lệnh D1 (CHƯA chạy) đặt người đang đăng nhập làm người phụ trách mặc định của đơn MỚI `orderId` (ADR-0009 điều 4) — gộp vào cùng `db.batch()`
   * tạo đơn, sau câu INSERT đơn. `null` nếu không có (chưa đăng nhập, hoặc người lập không đủ điều kiện làm người phụ trách — chưa có hồ sơ, tài khoản chỉ
   * Đối tác: ADR-0014 điều 9/10; luật do `dispatch` quyết). Do gốc lắp ráp tiêm.
   */
  defaultHandlerStatement: (orderId: string, at: string) => D1PreparedStatement | null;
  /**
   * Trong các đơn `orderIds`, đơn nào ĐANG có người phụ trách (ADR-0030 S20-13) — do gốc lắp ráp tiêm; `dispatch` trả lời. Module `orders` không import
   * `dispatch` và không đọc view `v_dsp_*` của nó (`src/architecture.test.ts` canh): cần biết đơn nào có người thì hỏi hàm này. KHÔNG phụ thuộc người
   * đang gọi (chỉ tra theo mã đơn nơi gọi đã có) — cả route công khai cũng nhận câu trả lời THẬT: trả tập rỗng ở đó sẽ là câu trả lời SAI ("không đơn nào
   * có người"), không phải từ chối. Mỗi lần gọi là MỘT truy vấn D1 với cả mảng id trong một tham số JSON (mảng rỗng: không truy vấn).
   */
  ordersWithHandler: (orderIds: readonly string[]) => Promise<Set<string>>;
  /**
   * Mọi đơn mà NGƯỜI ĐANG ĐĂNG NHẬP đang phụ trách (ADR-0030) — do gốc lắp ráp tiêm; id người lấy từ phiên, KHÔNG nhận tham số (route không hỏi được
   * thay người khác). Chưa đăng nhập → `[]` (không phụ trách gì), không truy vấn. Mỗi lần gọi là một truy vấn D1.
   */
  myHandledOrderIds: () => Promise<string[]>;
  /**
   * ADR-0013 điều 4 — do gốc lắp ráp tiêm (module `parties` không import `staff`). Mỗi lần gọi là 1–2 truy vấn D1.
   * Chưa đăng nhập → `{ linked: true, manageable: false }` (TỪ CHỐI; không được tụt về ô `party.write`).
   */
  partyAccount: (partyId: string) => Promise<PartyAccountVerdict>;
  /**
   * BẢNG TIN (ADR-0022) — báo một thay đổi đơn vừa xảy ra, để trạm (Durable Object) phát cho mọi kết nối đang mở liên quan. Kiểu `void`: route
   * KHÔNG `await` được (bắn-và-quên, DP-3) — router tự bọc `exec.waitUntil` + bắt lỗi, lỗi phát tin không bao giờ làm hỏng hay làm chậm thao tác
   * ghi. Route công khai (`staff` null, chưa đăng nhập) → no-op, không có ai "báo" thay mặt.
   */
  baoThayDoi: (e: { orderId: string; thayDoi: ThayDoiDon; handlerTruoc?: TrangThaiPhuTrach }) => void;
  /**
   * BẢNG TIN — đóng các kết nối đang mở của một tài khoản (`{ staffId }`, khi tài khoản đó bị ngưng/đổi quyền/đổi SĐT/đổi PIN…) hoặc MỌI kết
   * nối (`"tat-ca"`, khi bật chế độ bảo trì). Không phụ thuộc người đang gọi (không cần ai đăng nhập) — bắn-và-quên như `baoThayDoi`.
   */
  dongBangTin: (muc: { staffId: string } | "tat-ca") => void;
}

export interface Route {
  method: string;
  path: string;
  access: Access;
  handler: (ctx: Ctx) => Promise<Response>;
}

export interface AppModule {
  name: string;
  routes: Route[];
}

/** Khai một route. `path` dạng "/api/orders/:id/status". */
export function route<A extends Access>(method: string, path: string, access: A, handler: (ctx: Ctx<A>) => Promise<Response>): Route {
  return { method, path, access, handler: handler as (ctx: Ctx) => Promise<Response> };
}

function match(pattern: string, pathname: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const s = pathname.split("/").filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i]!.startsWith(":")) {
      try {
        params[p[i]!.slice(1)] = decodeURIComponent(s[i]!);
      } catch {
        return null;
      }
    } else if (p[i] !== s[i]) return null;
  }
  return params;
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Chặn yêu cầu ghi không đến từ chính trang này (CSRF). Cookie SameSite=Lax đã chặn site khác; lớp này chặn thêm trang
 * cùng site (*.tourdao.vn) và form `enctype="text/plain"` giả JSON. Trả Response lỗi, hoặc null nếu hợp lệ.
 */
function checkWriteRequest(request: Request, url: URL): Response | null {
  if (!WRITE_METHODS.has(request.method)) return null;
  const origin = request.headers.get("origin");
  const sameOrigin = origin ? origin === url.origin : request.headers.get("sec-fetch-site") === "same-origin";
  if (!sameOrigin) return error(403, "cross_origin", "Yêu cầu không đến từ trang của hệ thống.");
  const type = request.headers.get("content-type");
  const hasBody = type !== null || (request.headers.get("content-length") ?? "0") !== "0";
  if (hasBody && !(type ?? "").toLowerCase().startsWith("application/json")) return error(415, "unsupported_media_type", "Dữ liệu phải gửi dạng JSON.");
  return null;
}

export interface AppOptions {
  modules: AppModule[];
  /** Nhân viên đang đăng nhập ứng với request (đọc cookie phiên), hoặc null. */
  currentStaff: (request: Request, env: Env) => Promise<StaffProfile | null>;
  /** Kiểm cấu hình bắt buộc trước khi xử lý; trả thông báo lỗi (→ 500) hoặc null. */
  checkConfig?: (env: Env) => string | null;
  /**
   * Hàm nối chéo module do gốc lắp ráp cung cấp, router chỉ đưa vào `ctx` (ADR-0007 điều 4(b)) — router không biết chúng đến từ module nào và module
   * nhận (`orders`) không import module cung cấp (`dispatch`). BẮT BUỘC: thiếu là ô `ownOrAssigned` lặng lẽ tụt về `own`.
   */
  injected: {
    isAssigned: (env: Env, staffId: string, orderId: string) => Promise<boolean>;
    defaultHandlerStatement: (env: Env, staff: StaffProfile, orderId: string, at: string) => D1PreparedStatement | null;
    /** ADR-0030 S20-13. BẮT BUỘC: thiếu là `orders` không biết đơn nào đang có người phụ trách (Trang chủ đếm sai "Chưa phụ trách"). */
    ordersWithHandler: (env: Env, orderIds: readonly string[]) => Promise<Set<string>>;
    /** ADR-0030. BẮT BUỘC. Router luôn truyền `staffId` = người đang đăng nhập (`ctx.myHandledOrderIds`). */
    handledOrderIdsOf: (env: Env, staffId: string) => Promise<string[]>;
    /**
     * Cổng CHẾ ĐỘ BẢO TRÌ (module `maintenance`, gốc lắp ráp tiêm — router không biết module đó): Response 503 nếu tài khoản này bị chặn LÚC NÀY, hoặc null để cho qua.
     * Chạy cho mọi route cần đăng nhập, ngay sau khi biết ai đang đăng nhập và TRƯỚC kiểm quyền admin/văn phòng (người bị chặn thấy "đang bảo trì", không phải "không đủ quyền").
     * Route công khai (`/api/auth/*` trừ `/me`, `/api/company`) không qua cổng. BẮT BUỘC: thiếu là chế độ bảo trì lặng lẽ không còn hiệu lực với phiên đang mở.
     */
    maintenanceBlock: (env: Env, staff: StaffProfile) => Promise<Response | null>;
    /** ADR-0013 điều 4. BẮT BUỘC: thiếu là route Hồ sơ không biết hồ sơ nào gắn tài khoản. */
    partyAccount: (env: Env, actor: StaffProfile, partyId: string) => Promise<PartyAccountVerdict>;
    /** BẢNG TIN (ADR-0022). BẮT BUỘC: router gọi cho MỌI route có đăng nhập gọi `ctx.baoThayDoi`. Bản thật ở `src/index.ts` (trạm `BangTin` đã có); chỉ là no-op khi môi trường không có binding `BANG_TIN` (khung thử). */
    baoThayDoi: (env: Env, actor: StaffProfile, e: { orderId: string; thayDoi: ThayDoiDon; handlerTruoc?: TrangThaiPhuTrach }) => Promise<void>;
    /** BẢNG TIN (ADR-0022). BẮT BUỘC. Bản thật ở `src/index.ts` (`dongCua` của module `bangtin`); chỉ là no-op khi môi trường không có binding `BANG_TIN`. */
    dongBangTin: (env: Env, muc: { staffId: string } | "tat-ca") => Promise<void>;
  };
}

/** Log lỗi phát tin (DP-3): KHÔNG ghi SĐT/email/tên/nội dung lỗi — chỉ mã lỗi (`name`) và việc nào (`bao` báo thay đổi, `dong` đóng kết nối). */
function ghiLoiBangTin(viec: "bao" | "dong", e: unknown): void {
  const name = e instanceof Error ? e.name : "unknown";
  console.error(JSON.stringify({ level: "error", event: "bang_tin_loi", viec, name }));
}

export function createApp(opts: AppOptions) {
  const routes = opts.modules.flatMap((m) => m.routes);

  async function dispatch(request: Request, env: Env, exec: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const candidates = routes.flatMap((r) => {
      const params = match(r.path, url.pathname);
      return params ? [{ r, params }] : [];
    });
    if (candidates.length === 0) return error(404, "not_found", "Không tìm thấy.");
    const hit = candidates.find((c) => c.r.method === request.method);
    if (!hit) {
      const allow = [...new Set(candidates.map((c) => c.r.method))].join(", ");
      return json({ error: { code: "method_not_allowed", message: "Phương thức không được hỗ trợ." } }, 405, { allow });
    }

    const misconfigured = opts.checkConfig?.(env);
    if (misconfigured) {
      console.error(JSON.stringify({ level: "error", event: "server_misconfigured", message: misconfigured }));
      return error(500, "server_misconfigured", "Hệ thống chưa được cấu hình đúng. Hãy báo quản trị viên.");
    }
    const blocked = checkWriteRequest(request, url);
    if (blocked) return blocked;

    let staff: StaffProfile | null = null;
    if (hit.r.access !== "public") {
      staff = await opts.currentStaff(request, env);
      if (!staff) return error(401, "unauthenticated", "Chưa đăng nhập hoặc phiên đã hết hạn.");
      const maintenance = await opts.injected.maintenanceBlock(env, staff);
      if (maintenance) return maintenance;
      // ADR-0014 điều 2: SUPER_ADMIN = any ở mọi thao tác, kể cả admin.manage — không thay thế ADMIN, nên tài khoản chỉ giữ SUPER_ADMIN (không giữ ADMIN)
      // vẫn phải dùng được route access "admin" (bản đồ quyền — MATRIX — đã cho phép; cổng thô này chỉ đi theo, không siết chặt hơn).
      if (hit.r.access === "admin" && !passesAdminGate(staff)) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      if (hit.r.access === "office" && !isOffice(staff)) return error(403, "forbidden", "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này.");
      if (hit.r.access === "orders" && !canAccessOrders(staff)) return error(403, "forbidden", "Tài khoản này không dùng được màn hình đơn.");
    }
    const who = staff;
    return hit.r.handler({
      request, env, exec, url, params: hit.params, staff,
      isAssigned: (orderId) => (who ? opts.injected.isAssigned(env, who.id, orderId) : Promise.resolve(false)),
      defaultHandlerStatement: (orderId, at) => (who ? opts.injected.defaultHandlerStatement(env, who, orderId, at) : null),
      ordersWithHandler: (orderIds) => opts.injected.ordersWithHandler(env, orderIds),
      myHandledOrderIds: () => (who ? opts.injected.handledOrderIdsOf(env, who.id) : Promise.resolve([])),
      partyAccount: (partyId) => (who ? opts.injected.partyAccount(env, who, partyId) : Promise.resolve({ linked: true, manageable: false } as const)),
      baoThayDoi: (e) => {
        if (!who) return; // route công khai: không ai "báo" thay mặt.
        exec.waitUntil(Promise.resolve().then(() => opts.injected.baoThayDoi(env, who, e)).catch((err) => ghiLoiBangTin("bao", err)));
      },
      dongBangTin: (muc) => {
        exec.waitUntil(Promise.resolve().then(() => opts.injected.dongBangTin(env, muc)).catch((err) => ghiLoiBangTin("dong", err)));
      },
    } as Ctx);
  }

  return {
    async fetch(request: Request, env: Env, exec: ExecutionContext): Promise<Response> {
      try {
        return await dispatch(request, env, exec);
      } catch (e) {
        const requestId = request.headers.get("cf-ray") ?? crypto.randomUUID();
        const err = e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : { message: String(e) };
        console.error(JSON.stringify({ level: "error", event: "unhandled", requestId, method: request.method, path: new URL(request.url).pathname, error: err }));
        return json({ error: { code: "internal", message: "Có lỗi hệ thống. Thử lại sau; nếu còn lỗi, báo quản trị viên kèm mã này.", requestId } }, 500);
      }
    },
  };
}
