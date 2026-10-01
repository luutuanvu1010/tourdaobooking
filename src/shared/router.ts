// Router tối giản cho Worker (không thư viện). Module khai route: phương thức + đường dẫn + mức truy cập; router lo phần chung:
// khớp đường dẫn, 401/403/404/405 thống nhất, chặn ghi cross-site (CSRF), bắt lỗi toàn cục → 500 JSON có requestId.
// Router KHÔNG import module nào: cách xác định "ai đang đăng nhập" do gốc lắp ráp (src/index.ts) truyền vào.
import type { StaffProfile } from "./contracts";
import type { ThayDoiDon, TrangThaiPhuTrach } from "./bang-tin.ts";
import { error, json } from "./http.ts";
import type { MocToiThieu } from "./moc-toi-thieu.ts";
import { canAccessOrders, isOffice, passesAdminGate } from "./permissions.ts";

/** public: không cần đăng nhập; staff: mọi tài khoản đăng nhập; office: nhân sự văn phòng (mọi quyền trừ chỉ-FIELD — ADR-0007); orders: văn phòng HOẶC Đối tác (ADR-0014); admin: quyền ADMIN. */
export type Access = "public" | "staff" | "office" | "orders" | "admin";

/** ADR-0013 điều 4: hồ sơ có gắn tài khoản không, và người đang đăng nhập có quản được tài khoản đó không (luật cấp bậc ADR-0014 điều 8, module `staff` tính). */
/** `vaiAn` (ADR-0044): tài khoản gắn hồ sơ đang giữ Toàn quyền — vai ẩn; người xem không giữ Toàn quyền chỉ thấy vai đang mở của hồ sơ đó. */
export type PartyAccountVerdict = { linked: false } | { linked: true; manageable: boolean; vaiAn?: boolean };

/**
 * Kết luận của `dispatch` về người mà người lập CHỌN làm người phụ trách ngay lúc lập đơn (ADR-0030 S20-4, ADR-0020 điều 1, Q-C). Đạt → `statements`
 * dựng các câu lệnh D1 (CHƯA chạy) cho MỘT lần thử của lô tạo đơn: nhận id đơn và mốc `at` của CHÍNH lần thử đó từ `createOrder` (id đơn đổi mỗi lần
 * thử lại khi trùng mã) — không tự đọc đồng hồ: dòng `HANDLE` mở và dòng nhật ký mang ĐÚNG mốc của dòng nhật ký `created` cùng lô. Không đạt → `message`
 * (lời báo cho người dùng, route trả 400 `invalid_assignee` và KHÔNG tạo đơn).
 */
export type NewOrderHandler = { ok: true; statements: (orderId: string, at: string) => D1PreparedStatement[] } | { ok: false; message: string };

/**
 * GỘP HỒ SƠ (ADR-0068 Đ2, Đ6, Đ8) — phần của module KHÁC mà route gộp / nghi trùng của `parties` cần. `parties` không import orders / dispatch / van-chuyen /
 * billing / staff và không đọc bảng của chúng: gốc lắp ráp nối (khuôn `isAssigned`, `mocToiThieu`). Mỗi phương thức là MỘT truy vấn D1 (trừ `cauDoiDon`:
 * câu CHƯA chạy, route gộp đặt nó TRƯỚC câu lật hồ sơ phụ trong cùng `db.batch()`).
 */
export interface ViecCuaHoSo { phuTrachDon: number; laiChuyen: number; toLaiChuyen: number; chuXeChuyen: number; soXe: number }
/** `maDoi` = mã các đơn sẽ đổi người đặt (nháp + đã xác nhận chưa giao) — route gộp nêu tên khi lô bị trigger tiền của đơn huỷ (ADR-0068 Đ1 bước 5). */
export interface DonCuaNguoiDatTom { doi: number; giuDaGiao: number; giuDaHuy: number; lechTien: string[]; maDoi: string[] }
export interface GopHoSoNoi {
  viecCua: (partyId: string) => Promise<ViecCuaHoSo>;
  donNguoiDat: (partyId: string) => Promise<DonCuaNguoiDatTom>;
  cauDoiDon: (tuPartyId: string, sangPartyId: string, at: string) => D1PreparedStatement;
  soDongNo: (partyId: string) => Promise<number>;
  soDangNhap: () => Promise<{ partyId: string; phone: string }[]>;
}

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
   * Người phụ trách do người lập CHỌN ngay lúc lập đơn (ADR-0030 S20-4, ADR-0020 điều 1, Q-C) — đơn mới KHÔNG BAO GIỜ tự gắn người lập; không chọn thì
   * route không gọi hàm này và đơn "chờ nhận". `dispatch` đọc tài khoản `staffId` và xét bằng CHÍNH luật người được giao (`checkAssignee`: đang hoạt
   * động, có hồ sơ, không phải tài khoản có quyền Đối tác, đủ cấp); đạt thì trả hàm dựng câu lệnh để gộp vào CÙNG `db.batch()` tạo đơn (xem
   * `NewOrderHandler`). Quyền CHỌN của người gọi (`dispatch.assign`) route tự hỏi TRƯỚC khi gọi. Do gốc lắp ráp tiêm; mỗi lần gọi là một truy vấn D1.
   * Chưa đăng nhập → không đạt, không truy vấn.
   */
  newOrderHandler: (staffId: string) => Promise<NewOrderHandler>;
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
   * `tatThongBao` (BẮT BUỘC, ADR-0046): có tắt luôn mọi máy nhận thông báo điện thoại của tài khoản không — `true` CHỈ cho thao tác bảo mật
   * (đổi/đặt lại PIN, gỡ Face ID, ngưng tài khoản, đổi SĐT đăng nhập); `false` cho đổi vai/quyền (người nhận tính lúc gửi theo quyền hiện tại).
   */
  dongBangTin: (muc: { staffId: string; tatThongBao: boolean } | "tat-ca") => void;
  /**
   * WEB PUSH (ADR-0036) — giao một danh sách địa chỉ nhận cho trạm `BangTin` chia lô ≤ 40 bằng báo thức (khi > 40 máy). Hàm tiêm để `thongbao` không
   * import `bangtin` (không nới ALLOWED_EDGES). Trả địa chỉ đã nhận 410 ở các lượt trước của trạm (người gọi đánh dấu hết hiệu lực). Không có trạm → `[]`.
   * Khác `baoThayDoi`: trả lời hứa — người gọi tự bọc `waitUntil` + bắt lỗi.
   */
  giaoLoDay: (ds: string[]) => Promise<string[]>;
  /**
   * MỐC TỐI THIỂU đang hiệu lực (ADR-0049 D2, kế hoạch I25) — do gốc lắp ráp tiêm (`van-chuyen.mocToiThieuHienHanh`; `orders` KHÔNG đọc bảng `vc_`, không
   * import `van-chuyen`). Mỗi lần gọi là MỘT truy vấn D1 — route gọi ĐÚNG MỘT lần mỗi request (TC-26). `null` = bảng chính sách rỗng HOẶC môi trường không
   * tiêm hàm (khung thử cố ý) → route CHẶN lệnh cần mốc (503 `moc_toi_thieu_chua_co`), KHÔNG đoán con số. Không phụ thuộc người đang gọi.
   */
  mocToiThieu: () => Promise<MocToiThieu | null>;
  /**
   * NHÃN NGƯỜI BẤM (ruling R-P20 của điều phối, ADR-0049 kế hoạch mục 1.8 / R-P11) — do gốc lắp ráp tiêm (`staff`, view `v_stf_staff_label`; `van-chuyen`
   * KHÔNG import `staff`, không nới ALLOWED_EDGES — khuôn `mocToiThieu`, `giaoLoDay`). Trả TÊN HIỂN THỊ theo id tài khoản (không SĐT, không email, không
   * quyền). Route gọi MỘT lần mỗi request cho CẢ danh sách id (mảng rỗng: không truy vấn). `null` = môi trường không tiêm (khung thử cố ý) ⇒ route để trống
   * nhãn — KHÔNG đoán tên (nhãn chỉ để hiển thị, không quyết quyền).
   */
  nhanNhanVien: (ids: readonly string[]) => Promise<Map<string, string> | null>;
  /** GỘP HỒ SƠ (ADR-0068) — do gốc lắp ráp tiêm; xem `GopHoSoNoi`. Lười: chỉ gọi hàm tiêm khi route dùng (khung thử cũ không có hàm này vẫn chạy route khác). */
  gopHoSo: GopHoSoNoi;
  /**
   * DẤU "ĐÃ NHẬP PHẦN MỀM KẾ TOÁN" (ADR-0060 điều 5) — do gốc lắp ráp tiêm (`billing.nhapKeToanCuaDon`; `orders` KHÔNG đọc bảng `bil_`, không import `billing` —
   * khuôn `ordersWithHandler`): trong các đơn `orderIds`, đơn nào có trạng thái hiện tại = đã nhập. KHÔNG phụ thuộc người gọi và KHÔNG tự kiểm quyền — route
   * hỏi `accounting.entry.view` trước khi dùng kết quả. MỘT truy vấn D1, mảng id trong MỘT tham số JSON (mảng rỗng: không truy vấn). `null` = môi trường
   * không tiêm (khung thử cố ý) ⇒ route không gắn nhãn, bộ lọc trả 503 — KHÔNG đoán "chưa nhập".
   */
  nhapKeToanCuaDon: (orderIds: readonly string[]) => Promise<Set<string> | null>;
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
    /** ADR-0030 S20-4. BẮT BUỘC. `actor` = người đang đăng nhập (người lập — ghi vào cột người thao tác và nhật ký), `staffId` = người được chọn. */
    newOrderHandler: (env: Env, actor: StaffProfile, staffId: string) => Promise<NewOrderHandler>;
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
    dongBangTin: (env: Env, muc: { staffId: string; tatThongBao: boolean } | "tat-ca") => Promise<void>;
    /** WEB PUSH (ADR-0036). BẮT BUỘC. Bản thật ở `src/index.ts` (`xepHangDay` của module `bangtin`); `[]` khi môi trường không có binding `BANG_TIN`. */
    giaoLoDay: (env: Env, ds: string[]) => Promise<string[]>;
    /**
     * MỐC TỐI THIỂU (ADR-0049 D2, I25). BẮT BUỘC trong mã chạy thật (`src/index.ts`: `mocToiThieuHienHanh(env.DB)`); thiếu (chỉ khung thử cố ý — TC-26) thì
     * router trả `null` ⇒ `orders` chặn lệnh cần mốc (khuôn `isAssigned`: không bao giờ lặng lẽ "không có mốc").
     */
    mocToiThieu: (env: Env) => Promise<MocToiThieu | null>;
    /** R-P20. BẮT BUỘC trong mã chạy thật (`src/index.ts`: `nhanNhanVienTheoId` của staff); thiếu (khung thử cố ý) → router trả `null` (route để trống nhãn). */
    nhanNhanVien: (env: Env, ids: readonly string[]) => Promise<Map<string, string>>;
    /** GỘP HỒ SƠ (ADR-0068). BẮT BUỘC trong mã chạy thật (`src/index.ts`). */
    gopHoSo: (env: Env) => GopHoSoNoi;
    /** ADR-0060 điều 5. BẮT BUỘC trong mã chạy thật (`src/index.ts`: `nhapKeToanCuaDon` của billing); thiếu (khung thử cố ý) → router trả `null`. */
    nhapKeToanCuaDon: (env: Env, orderIds: readonly string[]) => Promise<Set<string>>;
  };
}

/** Log lỗi phát tin (DP-3): KHÔNG ghi SĐT/email/tên/nội dung lỗi — chỉ mã lỗi (`name`) và việc nào (`bao` báo thay đổi, `dong` đóng kết nối). */
function ghiLoiBangTin(viec: "bao" | "dong", e: unknown): void {
  const name = e instanceof Error ? e.name : "unknown";
  console.error(JSON.stringify({ level: "error", event: "bang_tin_loi", viec, name }));
}

/** `ctx.newOrderHandler` ở route công khai (không ai đăng nhập): không đạt, không truy vấn. */
const NOT_SIGNED_IN: NewOrderHandler = { ok: false, message: "Chưa đăng nhập hoặc phiên đã hết hạn." };

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
      newOrderHandler: (staffId) => (who ? opts.injected.newOrderHandler(env, who, staffId) : Promise.resolve(NOT_SIGNED_IN)),
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
      giaoLoDay: (ds) => opts.injected.giaoLoDay(env, ds),
      // Thiếu hàm tiêm (khung thử cố ý) → null: route chặn, không đoán (I25). Kiểm lúc GỌI, không lúc dựng app (typeof — JS không kiểm kiểu).
      mocToiThieu: () => (typeof opts.injected.mocToiThieu === "function" ? opts.injected.mocToiThieu(env) : Promise.resolve(null)),
      nhanNhanVien: (ids) =>
        typeof opts.injected.nhanNhanVien !== "function" ? Promise.resolve(null) : ids.length === 0 ? Promise.resolve(new Map()) : opts.injected.nhanNhanVien(env, ids),
      // Lười (kế hoạch R9): gọi opts.injected.gopHoSo(env) trong từng phương thức — app dựng bằng injected cũ (src/shared/router.test.ts) không vỡ ở route khác.
      gopHoSo: {
        viecCua: (id) => opts.injected.gopHoSo(env).viecCua(id),
        donNguoiDat: (id) => opts.injected.gopHoSo(env).donNguoiDat(id),
        cauDoiDon: (tu, sang, at) => opts.injected.gopHoSo(env).cauDoiDon(tu, sang, at),
        soDongNo: (id) => opts.injected.gopHoSo(env).soDongNo(id),
        soDangNhap: () => opts.injected.gopHoSo(env).soDangNhap(),
      },
      nhapKeToanCuaDon: (ids) =>
        typeof opts.injected.nhapKeToanCuaDon !== "function" ? Promise.resolve(null) : ids.length === 0 ? Promise.resolve(new Set<string>()) : opts.injected.nhapKeToanCuaDon(env, ids),
    } as Ctx);
  }

  return {
    async fetch(request: Request, env: Env, exec: ExecutionContext): Promise<Response> {
      try {
        return await dispatch(request, env, exec);
      } catch (e) {
        const requestId = request.headers.get("cf-ray") ?? crypto.randomUUID();
        // Sổ tiền lượt 1 (ADR-0025 đ4; kiểm độc lập T-1): route đã đọc "chưa Đã giao" nhưng người khác bấm Đã giao / Hoàn thành giữa lúc đọc và lúc ghi →
        // trigger 0044 RAISE (`order_delivered:` / `order_completed:`), cả lô đã huỷ. Trả 409 câu cố định (không lộ chữ thô của CSDL), không 500 chung.
        const msg = e instanceof Error ? e.message : String(e);
        if (/\border_(delivered|completed):/.test(msg)) {
          console.warn(JSON.stringify({ level: "warn", event: "order_delivered_race", requestId, method: request.method, path: new URL(request.url).pathname }));
          return json({ error: { code: "order_delivered", message: "Đơn đã Đã giao – đã thu đủ (vừa có người bấm) — không sửa được nữa. Tải lại để xem đơn mới nhất." } }, 409);
        }
        const err = e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : { message: String(e) };
        console.error(JSON.stringify({ level: "error", event: "unhandled", requestId, method: request.method, path: new URL(request.url).pathname, error: err }));
        return json({ error: { code: "internal", message: "Có lỗi hệ thống. Thử lại sau; nếu còn lỗi, báo quản trị viên kèm mã này.", requestId } }, 500);
      }
    },
  };
}
