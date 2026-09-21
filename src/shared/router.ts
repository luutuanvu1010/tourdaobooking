// Router tối giản cho Worker (không thư viện). Module khai route: phương thức + đường dẫn + mức truy cập; router lo phần chung:
// khớp đường dẫn, 401/403/404/405 thống nhất, chặn ghi cross-site (CSRF), bắt lỗi toàn cục → 500 JSON có requestId.
// Router KHÔNG import module nào: cách xác định "ai đang đăng nhập" do gốc lắp ráp (src/index.ts) truyền vào.
import type { StaffProfile } from "./contracts";
import { error, json } from "./http";
import { hasPermission, isOffice } from "./permissions.ts";

/** public: không cần đăng nhập; staff: mọi tài khoản đăng nhập; office: nhân sự văn phòng (mọi quyền trừ chỉ-FIELD — ADR-0007); admin: quyền ADMIN. */
export type Access = "public" | "staff" | "office" | "admin";

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
   * `ownOrAssigned`/`assigned` (ADR-0007 điều 4(b), ADR-0009 điều 3). Do gốc lắp ráp tiêm (module `orders` không import `dispatch`); tính khi gọi
   * (một truy vấn D1 mỗi lần), chỉ route nào cần thì gọi. Chưa đăng nhập → false.
   */
  isAssigned: (orderId: string) => Promise<boolean>;
  /**
   * Câu lệnh D1 (CHƯA chạy) đặt người đang đăng nhập làm người phụ trách mặc định của đơn MỚI `orderId` (ADR-0009 điều 4) — gộp vào cùng `db.batch()`
   * tạo đơn, sau câu INSERT đơn. `null` nếu không có (chưa đăng nhập, hoặc tài khoản chưa có hồ sơ). Do gốc lắp ráp tiêm.
   */
  defaultHandlerStatement: (orderId: string, at: string) => D1PreparedStatement | null;
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
  };
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
      if (hit.r.access === "admin" && !hasPermission(staff, "ADMIN")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      if (hit.r.access === "office" && !isOffice(staff)) return error(403, "forbidden", "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này.");
    }
    const who = staff;
    return hit.r.handler({
      request, env, exec, url, params: hit.params, staff,
      isAssigned: (orderId) => (who ? opts.injected.isAssigned(env, who.id, orderId) : Promise.resolve(false)),
      defaultHandlerStatement: (orderId, at) => (who ? opts.injected.defaultHandlerStatement(env, who, orderId, at) : null),
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
