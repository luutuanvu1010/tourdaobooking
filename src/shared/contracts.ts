// HỢP ĐỒNG API giữa Worker và giao diện (web/). Chỉ chứa kiểu — không có mã chạy.
// Server khai kiểu trả về theo file này (và `satisfies` ở chỗ trả JSON); web/api.ts re-export. Đổi một bên mà quên bên kia → typecheck báo.
import type { AuditAction, AuditTargetType } from "./audit-actions.ts";
import type { CatalogService, PaxCode, PaxCounts, Prices } from "./order-lines.ts";
import type { FeedbackKind, FeedbackStatus } from "./feedback-catalog.ts";
import type { PermissionCode } from "./permissions.ts";
import type { RoleCode } from "./roles.ts";

export type { AuditAction, AuditTargetType, FeedbackKind, FeedbackStatus, CatalogService, PaxCode, PaxCounts, PermissionCode, Prices, RoleCode };

// ---- Nhân viên / phiên -------------------------------------------------------
export interface StaffProfile {
  id: string;
  /** Tên hiển thị lấy từ hồ sơ (pty_party.display_name), không phải cột staff.full_name (cột chết). */
  fullName: string;
  phone: string;
  /** Hồ sơ của tài khoản; null chỉ trong khoảng giữa hai lần triển khai N1 (đặc tả N1 §9). */
  partyId: string | null;
  /** Quyền trong app (ADR-0005), đọc từ stf_permission — KHÔNG phải vai trò hồ sơ (HDV, tài xế…). */
  permissions: PermissionCode[];
}

/** Hồ sơ đầy đủ cho màn hình quản trị. */
export interface StaffAccount extends StaffProfile {
  active: boolean;
  createdAt: string;
  /** Lần đăng nhập thành công gần nhất (ISO UTC); null = chưa từng đăng nhập (kể từ khi có cột này). Đăng nhập PIN (`POST /api/auth/login`) và đăng nhập Face ID (`POST /api/auth/passkey/login`) đều ghi — đổi PIN/làm mới phiên thì không (ADR-0016). */
  lastLoginAt: string | null;
}

export interface StaffAccountDto extends StaffAccount {
  /** Đang bị khoá đăng nhập do nhập sai PIN quá nhiều lần. */
  locked: boolean;
  /** Số passkey (Face ID) còn hiệu lực. */
  passkeyCount: number;
  /** Vai với Tour Đảo đang mở (ADR-0018). Rỗng = tài khoản chưa chuyển sang cách mới (đang dùng quyền cũ). */
  roles: RoleCode[];
}

/** Thân yêu cầu PUT /api/staff/:id/permissions: TOÀN BỘ tập quyền mong muốn (không rỗng). */
export interface StaffPermissionsRequest { permissions: PermissionCode[] }
/** Thân PUT /api/staff/:id/roles: TOÀN BỘ tập vai mong muốn (không rỗng) + chỉnh tay (lý do bắt buộc khi có). */
export interface StaffRolesRequest { roles: RoleCode[]; adds?: PermissionCode[]; removes?: PermissionCode[]; reason?: string }
/** Vai + chỉnh tay đang có; `reason` = lý do của lần chỉnh tay gần nhất (giao diện điền sẵn), null khi không chỉnh tay. */
export interface StaffRolesResponse { roles: RoleCode[]; adds: PermissionCode[]; removes: PermissionCode[]; reason: string | null }

export interface StaffSheetCandidateDto {
  row: number;
  name: string;
  phone: string;
  status: "new" | "same" | "name_differs";
  currentName: string | null;
}

/** `maintenance` chỉ có ở `GET /api/auth/me` (không có ở phản hồi đăng nhập): chế độ bảo trì đang BẬT thì chỉ người được phép mới tới được đây, để giao diện hiện dải "Đang ở chế độ bảo trì". */
export interface MeResponse { staff: StaffProfile; maintenance?: MaintenanceStatusDto }
/**
 * `GET /api/auth/config` (công khai): khoá site để trang đăng nhập dựng widget Turnstile; null = máy chủ không bật Turnstile (đừng dựng widget, đăng nhập không cần token).
 * `maintenance`: trang đăng nhập hiện banner + đếm ngược khi đang bảo trì. KHÔNG lộ ai được phép.
 */
export interface AuthConfigResponse {
  turnstileSiteKey: string | null;
  maintenance: MaintenanceStatusDto;
  /** Máy chủ bật đăng nhập bằng Face ID — PASSKEY_RP_ID/PASSKEY_ORIGIN hợp lệ. */
  passkey: boolean;
  /** Số phiên bản đang chạy (= APP_VERSION, từ nhật ký thay đổi). Công khai; scripts/kiem-phien-ban.mjs so với bản ở máy trước/sau deploy. */
  version: string;
}

// ---- Đăng nhập bằng Face ID (passkey, ADR-0016; đặc tả 2026-09-23-passkey-design.md) ----
export interface PasskeyDto { id: string; label: string; createdAt: string; lastUsedAt: string | null }
export interface PasskeyListResponse { passkeys: PasskeyDto[] }
export interface PasskeyResponse { passkey: PasskeyDto }
export interface PasskeyDescriptorJson { type: "public-key"; id: string }
/** Cho navigator.credentials.get — mọi trường nhị phân là base64url. */
export interface PasskeyRequestOptionsResponse {
  publicKey: { challenge: string; rpId: string; timeout: number; userVerification: "required"; allowCredentials: PasskeyDescriptorJson[] };
}
/** Cho navigator.credentials.create — mọi trường nhị phân là base64url. */
export interface PasskeyCreationOptionsResponse {
  publicKey: {
    challenge: string;
    rp: { id: string; name: string };
    user: { id: string; name: string; displayName: string };
    pubKeyCredParams: { type: "public-key"; alg: number }[];
    timeout: number;
    attestation: "none";
    authenticatorSelection: { residentKey: "required"; requireResidentKey: true; userVerification: "required" };
    excludeCredentials: PasskeyDescriptorJson[];
  };
}
/** Dạng JSON của PublicKeyCredential gửi lên máy chủ (base64url). */
export interface PasskeyCredentialJson {
  id: string;
  rawId: string;
  type: "public-key";
  response: { clientDataJSON: string; attestationObject?: string; authenticatorData?: string; signature?: string; userHandle?: string | null };
}

// ---- Chế độ bảo trì (src/shared/maintenance.ts; module `maintenance`) ----
export interface MaintenanceStatusDto {
  on: boolean;
  /** Giờ dự kiến hoàn tất (ISO UTC); null khi tắt hoặc bật mà chưa có giờ. */
  endsAt: string | null;
}
/** `GET`/`PUT /api/maintenance` (chỉ ADMIN): `canToggle` = chính người gọi có nằm trong danh sách được phép bật/tắt không (không lộ danh sách). */
export interface MaintenanceResponse extends MaintenanceStatusDto { canToggle: boolean }
/** Thân `PUT /api/maintenance`. `endsAt` bắt buộc khi `on = true`. */
export interface MaintenanceRequest { on: boolean; endsAt?: string }
/** Thân `error` của phản hồi 503 `maintenance` (mọi `/api/*` cần đăng nhập với người bị chặn, và `POST /api/auth/login`): `endsAt` để giao diện dựng đồng hồ đếm ngược mà không cần gọi thêm. */
export interface MaintenanceErrorBody { code: "maintenance"; message: string; endsAt: string | null }
export interface StaffListResponse { staff: StaffAccountDto[] }
export interface StaffResponse { staff: StaffAccountDto }
export interface StaffWithPinResponse { staff: StaffAccountDto; pin: string }
export interface StaffSheetPreviewResponse {
  candidates: StaffSheetCandidateDto[];
  problems: { row: number; message: string }[];
  notInSheet: { fullName: string; phone: string; active: boolean }[];
}
export interface StaffSheetApplyResponse { created: { id: string; fullName: string; phone: string; pin: string }[] }

// ---- Đơn hàng ----------------------------------------------------------------
export type OrderStatus = "draft" | "confirmed" | "cancelled";
export type DepositMethod = "cash" | "bank_transfer" | "other";

export interface OrderItemDto {
  id: string;
  /** Mã dịch vụ nguồn khi dòng sinh từ danh mục; null = nhập tay. */
  catalogCode: string | null;
  /** Loại khách của dòng (dịch vụ tính theo nhóm: "adult" = số khách); null = nhập tay. */
  paxCode: PaxCode | null;
  description: string;
  detail: string | null;
  quantity: number;
  unitPrice: number;
  /** Giá danh mục hiệu lực lúc lập dòng; null = nhập tay. Lệch giá = `unitPrice ≠ catalogPrice` (hàm `priceDeviation` ở order-lines). */
  catalogPrice: number | null;
  lineTotal: number;
}

/** So với danh mục hiện tại — chỉ tính cho đơn nháp, dịch vụ từ danh mục. */
export type CatalogStatus = "ok" | "price_changed" | "unavailable";
export type MissingReason = "no_date" | "past_date" | "too_far" | "no_guests";
export interface TripGapDto { serviceId: string; name: string; reasons: MissingReason[] }
export interface CatalogChangeDto { serviceIndex: number; catalogCode: string; pax: PaxCode; seen: number; current: number }

/** Thông tin chuyến của một dịch vụ (ngày YYYY-MM-DD, giờ HH:MM theo giờ Việt Nam). */
export interface TripInfoDto {
  departDate: string | null;
  departTime: string | null;
  pickupTime: string | null;
  pickupPlace: string | null;
  /** null = cùng ngày khởi hành. */
  checkinDate: string | null;
  checkinTime: string | null;
  checkinPlace: string | null;
  note: string | null;
}

export interface OrderServiceDto extends TripInfoDto {
  id: string;
  kind: "catalog" | "manual";
  catalogCode: string | null;
  name: string;
  /** Chuỗi đơn vị của Sheet lúc lập đơn; "manual" = nhập tay. */
  unit: string;
  pax: PaxCounts;
  items: OrderItemDto[];
  catalogStatus: CatalogStatus | null;
}

export interface OrderDto {
  id: string;
  orderCode: string;
  staffId: string;
  staffName: string;
  /** Hồ sơ người đặt (N2 lát 1, ADR-0011); null = chưa gắn (đơn cũ hoặc bỏ qua). */
  bookerPartyId: string | null;
  /** Nhãn hồ sơ người đặt (view `v_pty_party_label`); null khi chưa gắn. */
  bookerName: string | null;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerNote: string | null;
  subtotal: number;
  discount: number;
  total: number;
  depositAmount: number;
  depositMethod: DepositMethod | null;
  remainingAmount: number;
  paymentNote: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
}

export interface OrderDetailDto extends OrderDto {
  services: OrderServiceDto[];
}

/** Thông tin chuyến rút gọn cho thẻ trong danh sách đơn — lấy từ dịch vụ ĐẦU TIÊN theo sort_order của đơn (không gộp nhiều dịch vụ). */
export interface OrderSummaryTripDto {
  departDate: string | null;
  pickupTime: string | null;
  pickupPlace: string | null;
}

export type OrderSummaryDto = Pick<
  OrderDto,
  "id" | "orderCode" | "status" | "customerName" | "customerPhone" | "customerNote" | "total" | "depositAmount" | "remainingAmount" | "staffName" | "createdAt"
> & {
  /** Tên các dịch vụ theo đúng thứ tự trong đơn (sort_order) — client tự quyết hiện đầu + "+N dịch vụ" hay liệt kê hết (§7 mục 3). */
  serviceNames: string[];
  /** Tổng số khách theo loại, CỘNG DỒN mọi dịch vụ của đơn. */
  pax: PaxCounts;
  /** Của dịch vụ ĐẦU TIÊN (sort_order nhỏ nhất); mọi trường null nếu đơn chưa có dịch vụ nào. */
  trip: OrderSummaryTripDto;
};

/** Thông tin chuyến client gửi lên: "" = chưa có. */
export interface TripInput {
  departDate: string;
  departTime: string;
  pickupTime: string;
  pickupPlace: string;
  checkinDate: string;
  checkinTime: string;
  checkinPlace: string;
  note: string;
}

/**
 * Một dịch vụ trong đơn. `catalog`: chỉ gửi mã + số khách + đơn giá thực tế; dòng tiền do MÁY CHỦ sinh (không nhận số lượng từ client).
 * `id` = dịch vụ đã lưu của chính đơn này (giữ bản chụp nếu mã và số khách không đổi).
 */
export type ServiceInput = { id?: string; pax: PaxCounts } & TripInput &
  (
    | {
        kind: "catalog";
        catalogCode: string;
        /** Đơn giá thực tế từng loại có khách (mặc định giao diện = giá danh mục); vắng = giá danh mục. */
        unitPrices: Partial<Record<PaxCode, number>>;
        /** Giá danh mục mà form đang hiển thị; lệch giá hiện tại → 409 `catalog_changed`. */
        catalogPriceSeen: Partial<Record<PaxCode, number>>;
      }
    | { kind: "manual"; name: string; items: { description: string; detail: string; quantity: number; unitPrice: number }[] }
  );

/** Dữ liệu client gửi lên khi tạo/sửa đơn: chỉ các trường nhập, KHÔNG có số dẫn xuất — server tự tính (§2.3). */
export interface OrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNote: string;
  services: ServiceInput[];
  discount: number;
  depositAmount: number;
  depositMethod: DepositMethod | null;
  paymentNote: string;
  /** Gắn hồ sơ có sẵn (id `pty_party`, chỉ cá nhân đang hoạt động); null/vắng = không gắn. Không gửi kèm `newBooker`. */
  bookerPartyId?: string | null;
  /** Tạo hồ sơ cá nhân mới + vai CUSTOMER cùng lúc lưu đơn (ADR-0011 điều 1). Không gửi kèm `bookerPartyId`. */
  newBooker?: { fullName: string; phone: string } | null;
  /** Bắt buộc khi sửa (PUT): `updatedAt` của đơn mà form đã đọc — lệch → 409 `stale`. */
  expectedUpdatedAt?: string;
  /**
   * CHỈ khi lập (POST /api/orders; PUT bỏ qua): người phụ trách người lập chọn ngay trong form (mã tài khoản — ADR-0030 S20-4). Vắng/`null` = không chọn
   * (đơn "Chờ nhận"). Người gọi không có `dispatch.assign` trên đơn của mình → 403; người được chọn không đủ điều kiện → 400 `invalid_assignee`, không tạo đơn.
   */
  handlerStaffId?: string | null;
}

/** `PUT /api/orders/:id/trip` — sửa trường vận hành (đơn nháp hoặc đã xác nhận). */
export interface TripUpdateInput {
  expectedUpdatedAt: string;
  services: ({ id: string } & TripInput)[];
}

/** `PUT /api/orders/:id/booker` — đổi khách (hồ sơ người đặt + tên/SĐT chụp trên đơn) của đơn nháp hoặc đã xác nhận (ADR-0011 điều 2). */
export interface BookerChangeInput {
  customerName: string;
  customerPhone: string;
  bookerPartyId?: string | null;
  newBooker?: { fullName: string; phone: string } | null;
  expectedUpdatedAt: string;
}

/** Thân lỗi có thêm dữ liệu: 409 `incomplete_trip` (xác nhận thiếu chuyến) và 409 `catalog_changed` (giá danh mục vừa đổi). */
export interface IncompleteTripBody { error: { code: "incomplete_trip"; message: string; missing: TripGapDto[] } }
export interface CatalogChangedBody { error: { code: "catalog_changed"; message: string; changes: CatalogChangeDto[] } }

export interface OrderListResponse { orders: OrderSummaryDto[]; hasMore: boolean }
export interface OrderResponse { order: OrderDetailDto }
export interface OrderDetailResponse { order: OrderDetailDto; history: AuditEntryDto[]; canModify: boolean }

/** Một dịch vụ trong PHẦN HẸP của hàng chờ nhận (ADR-0030 S23-2) — ĐÚNG bốn khoá này. `pickupPlace` (và `name`) đã che mọi dãy từ 8 chữ số. */
export interface PoolServiceDto {
  name: string;
  pax: PaxCounts;
  pickupPlace: string | null;
  pickupTime: string | null;
}
/**
 * Một đơn trong hàng chờ nhận `GET /api/orders/pool` (ADR-0030 S23-1, S23-2) — PHẦN HẸP, ĐÚNG bốn khoá: không tên/SĐT/email khách, không tiền, không
 * ghi chú, không lịch sử, không người lập. `departDate` = ngày đi (ngày khởi hành lớn nhất; null nếu chưa có ngày). Dựng ở `orders/pool.ts` (danh sách
 * trường được phép); thêm khoá = sửa cả bài khoá `src/modules/orders/pool.test.ts`.
 */
export interface PoolOrderDto {
  orderId: string;
  orderCode: string;
  departDate: string | null;
  services: PoolServiceDto[];
}
/** Đơn chờ nhận: chưa có người phụ trách đang mở, chưa huỷ, chưa qua ngày đi — xếp ngày đi gần nhất trước, chưa có ngày xuống cuối. */
export interface PoolResponse { orders: PoolOrderDto[] }

/**
 * `GET /api/orders/dashboard` (Trang chủ mới, `access: "office"`) — tổng quan cho nhân viên văn phòng.
 * `today`: đơn confirmed mà dịch vụ SỚM NHẤT có ngày đón (bỏ qua dịch vụ không có ngày) rơi đúng hôm nay.
 * `unpaid`: đơn confirmed còn thiếu tiền theo số HIỆN HÀNH (đã áp điều chỉnh, nếu có) — `earliestDate` = ngày đón sớm nhất trong số đó, null nếu không đơn nào có ngày.
 * `draftCount`: đơn nháp chưa xác nhận.
 * `unassignedCount`: đơn nháp hoặc đã xác nhận (không tính đơn huỷ) chưa có người phụ trách — ADR-0020 điều 7 (M1 = A), ADR-0030 S20-13.
 * `revenueWeek`: doanh thu (tổng `total` hiện hành) của CHÍNH người xem trong tuần `from`..`to` (thứ Hai–Chủ nhật, giờ Việt Nam, hai đầu bao gồm).
 * `revenueWeek.daily`: ĐÚNG 7 phần tử (thứ Hai→Chủ nhật, cùng số hiện hành), ngày không có đơn vẫn có phần tử `total: 0` — dữ liệu cho
 * biểu đồ cột "Doanh thu của tôi" (Đợt D Task 2).
 */
export interface DashboardResponse {
  today: OrderSummaryDto[];
  unpaid: { total: number; count: number; earliestDate: string | null };
  draftCount: number;
  unassignedCount: number;
  revenueWeek: { total: number; count: number; from: string; to: string; daily: { date: string; total: number }[] };
}

// ---- Nhật ký -----------------------------------------------------------------
export interface AuditEntryDto {
  action: AuditAction;
  staffId: string | null;
  staffName: string;
  at: string;
  detail: string | null;
}

export interface AuditRecordDto extends AuditEntryDto {
  id: string;
  targetType: AuditTargetType | null;
  targetId: string | null;
  /** Nhãn dễ đọc của đối tượng: mã đơn, tên nhân viên hoặc mã dịch vụ. */
  targetLabel: string | null;
  /** Có giá trị khi đối tượng là đơn — để giao diện tạo liên kết. */
  orderId: string | null;
}

export interface AuditListResponse { entries: AuditRecordDto[]; hasMore: boolean }

// ---- Danh mục dịch vụ --------------------------------------------------------
/** Dịch vụ như nhân viên bán hàng thấy (giá đã áp ghi đè của Admin). */
export interface CatalogServiceDto extends CatalogService {
  supported: boolean;
}

export interface CatalogConflictDto { code: PaxCode; base: number | null; current: number | null; override: number }

export interface CatalogAdminItemDto {
  code: string;
  name: string;
  unit: string;
  supported: boolean;
  inSheet: boolean;
  notes: CatalogService["notes"];
  sheetPrices: Prices;
  prices: Prices;
  hidden: boolean;
  overridden: PaxCode[];
  conflicts: CatalogConflictDto[];
  overrideUpdatedAt: string | null;
  updatedAt: string;
}

export interface CatalogSyncStateDto {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastErrorCode: string | null;
  lastError: string | null;
  itemCount: number | null;
  problems: { row: number; message: string }[];
}

export interface CatalogPublicResponse { items: CatalogServiceDto[]; sync: { lastSuccessAt: string | null; error: string | null } }
export interface CatalogAdminResponse { items: CatalogAdminItemDto[]; sync: CatalogSyncStateDto }
export interface CatalogItemResponse { item: CatalogAdminItemDto }
export interface CatalogSyncResponse {
  ok: true;
  added: number;
  changed: number;
  hidden: number;
  unchanged: number;
  itemCount: number;
  problems: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
}

// ---- Thông tin công ty (module company) --------------------------------------
/** Hồ sơ công ty hiển thị công khai (màn đăng nhập, xác nhận đơn). Cố ý KHÔNG có số Zalo, đường dẫn logo, người sửa. */
export interface CompanyDto {
  /** Tên pháp lý đúng như trong hồ sơ ("CÔNG TY TNHH TOUR ĐẢO"). */
  name: string;
  taxCode: string;
  address: string;
  hotline: string;
  /** Có thể chưa khai → null. */
  email: string | null;
}

export interface CompanyResponse { company: CompanyDto }

// ---- Người phụ trách đơn (module dispatch; ADR-0006, ADR-0009) ---------------
/** Người phụ trách đang mở của một đơn: người nhận trách nhiệm chăm sóc khách (gọi xác nhận, đón); sửa được đơn như người lập. Chỉ tên, KHÔNG có SĐT. */
export interface HandlerDto {
  partyId: string;
  /** Tài khoản của người đó; null nếu hồ sơ chưa/không còn tài khoản. */
  staffId: string | null;
  name: string;
}

/** `GET /api/dispatch/handlers?orderIds=a,b,c` (tối đa 100 id): mọi id gửi lên đều có mặt; `null` = đơn chưa có người phụ trách (hoặc không có đơn đó). */
export interface HandlersResponse { handlers: Record<string, HandlerDto | null> }

/**
 * Nhân sự có thể được giao phụ trách (`checkAssignee` của dispatch): đang hoạt động, có hồ sơ, không mang quyền Đối tác, và có quyền Bán hàng, Quản trị
 * (kể cả Toàn quyền) hoặc Hướng dẫn viên (cấp hẹp — ADR-0014 điều 6, ADR-0030). Chỉ tên, KHÔNG có SĐT.
 */
export interface AssigneeDto {
  staffId: string;
  partyId: string;
  name: string;
  /**
   * Nhãn nhóm HIỂN THỊ để bảng chọn gom người ("Hướng dẫn viên" / "Bán hàng" / "Quản trị" — Task 1.8 phần b ADR-0030), máy chủ tính bằng
   * `assigneeRoleLabel` (`src/shared/assignee-pick.ts`): một nhãn cho mỗi người, ưu tiên Hướng dẫn viên > Quản trị > Bán hàng. KHÔNG phải luật quyền.
   */
  roleLabel: string;
}
export interface AssigneesResponse { assignees: AssigneeDto[] }

/** `PUT /api/orders/:id/handler` — đặt/đổi người phụ trách (hoặc tự nhận khi đơn chưa có người: `staffId` = chính mình). */
export interface SetHandlerInput { staffId: string }
export interface SetHandlerResponse { handler: HandlerDto }
export interface HandlerCancelResponse { ok: true }
export interface HandlerMoneyEditResponse { ok: true }

/**
 * Màn "việc của tôi" (`GET /api/dispatch/mine`, module dispatch — ADR-0014 điều 6/11, ADR-0030 S23-8). Viết ĐỘC LẬP, KHÔNG `Pick`/`Omit` từ
 * `OrderDto`/`OrderServiceDto`/`OrderItemDto` — mỗi trường ở đây là một quyết định có chủ ý, một lần đổi kiểu dữ liệu đơn sau này không được tự lọt
 * thêm trường nào (giá từng dòng, giảm giá, ghi chú thanh toán… vẫn KHÔNG có). Từ Task 1.8 (chủ dự án quyết 2026-09-27: HDV cần biết còn thu bao
 * nhiêu) có ĐÚNG ba trường tiền cấp đơn — `total`, `depositAmount`, `remainingAmount` — số HIỆN HÀNH sau điều chỉnh (ADR-0017 điều 5), dựa trên ô
 * `money.view` phạm vi `assigned` đã cấp cho HDV (ADR-0017, thu hẹp ở ADR-0030 S23-5); route hỏi ô đó (ADR-0019 điều 2). Không có bảng giá, không
 * có tiền từng dịch vụ.
 */
export interface MyAssignmentServiceDto extends TripInfoDto {
  id: string;
  name: string;
  /** null = nhập tay — CHỈ ĐỌC ở màn này (route handler-money-edit chỉ nhận dịch vụ từ danh mục). */
  catalogCode: string | null;
  pax: PaxCounts;
  /** Loại khách sửa được cho dịch vụ này (rỗng nếu nhập tay hoặc thiếu giá đã chụp) — KHÔNG lộ giá, chỉ nói được sửa loại nào. */
  editablePaxCodes: PaxCode[];
}
export interface MyAssignmentDto {
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  /** Từ bản 1.6: đơn NHÁP cũng có trong danh sách (không chỉ đã xác nhận) — giao diện dùng `status` để ẩn nút huỷ/sửa số khách (`myJobActions`). */
  status: OrderStatus;
  /** Tổng tiền của đơn (VNĐ), số hiện hành sau điều chỉnh số khách — cùng số với `OrderDto.total` của chi tiết đơn. */
  total: number;
  /** Đã cọc (VNĐ) — cùng số với `OrderDto.depositAmount`. */
  depositAmount: number;
  /** Còn thu (VNĐ) — cùng số với `OrderDto.remainingAmount` (máy chủ tính, giao diện không tự trừ). */
  remainingAmount: number;
  services: MyAssignmentServiceDto[];
}
export interface MyAssignmentsResponse { assignments: MyAssignmentDto[] }

// ---- Địa điểm (module locations) ---------------------------------------------
export interface LocationTypeDto {
  code: string;
  name: string;
}

export interface LocationDto {
  id: string;
  code: string;
  name: string;
  locationTypeCode: string;
  locationTypeName: string;
  address: string | null;
  sortOrder: number;
  active: boolean;
  /** Mốc cập nhật cuối — gửi lại làm `expectedUpdatedAt` khi sửa (khoá lạc quan). */
  updatedAt: string;
}

export interface LocationListResponse { locations: LocationDto[]; types: LocationTypeDto[] }
export interface LocationResponse { location: LocationDto }

// ---- Hồ sơ (module parties) --------------------------------------------------
export type PartyKind = "PERSON" | "ORGANIZATION";

export interface ContactPointDto {
  id: string;
  kind: "PHONE" | "EMAIL";
  value: string;
  label: string | null;
  isPrimary: boolean;
  /** Ngày dân sự giờ Việt Nam (YYYY-MM-DD). `validTo` null = còn hiệu lực. */
  validFrom: string;
  validTo: string | null;
}

export interface PartyRoleDto {
  id: string;
  roleTypeCode: string;
  roleName: string;
  locationId: string | null;
  locationName: string | null;
  validFrom: string;
  validTo: string | null;
}

export interface PartyRelationshipDto {
  id: string;
  typeCode: string;
  typeName: string;
  fromPartyId: string;
  fromPartyName: string;
  toPartyId: string;
  toPartyName: string;
  validFrom: string;
  validTo: string | null;
}

export interface PartyListItemDto {
  id: string;
  kind: PartyKind;
  displayName: string;
  active: boolean;
  primaryPhone: string | null;
  /** Mã vai trò đang hiệu lực hôm nay (giờ VN). */
  roleCodes: string[];
}

export interface PartyDto extends PartyListItemDto {
  familyName: string | null;
  middleName: string | null;
  givenName: string | null;
  legalName: string | null;
  taxCode: string | null;
  address: string | null;
  invoiceEmail: string | null;
  contacts: ContactPointDto[];
  roles: PartyRoleDto[];
  relationships: PartyRelationshipDto[];
  createdAt: string;
  /** Mốc cập nhật cuối — gửi lại làm `expectedUpdatedAt` khi sửa (khoá lạc quan). */
  updatedAt: string;
  /** ADR-0013 điều 6: hồ sơ gắn một tài khoản (kể cả tài khoản đang ngưng). Không kèm id/quyền của tài khoản. */
  accountLinked: boolean;
  /** ADR-0013 điều 6: NGƯỜI ĐANG XEM sửa được tên/liên hệ của hồ sơ này (máy chủ tính). Chỉ để ẩn/hiện nút; máy chủ vẫn chặn. */
  editable: boolean;
}

export interface PartyListResponse { parties: PartyListItemDto[]; hasMore: boolean }
export interface PartyLookupResponse { matches: PartyListItemDto[] }
export interface PartyResponse { party: PartyDto }
export interface PartyMetaResponse {
  /** MỌI loại vai (cả vai đã ngưng — để hiện đúng tên); `group` OTHER là vai gán được ở trang Danh bạ (/parties), INTERNAL/EXTERNAL chỉ gán ở màn Quản lý tài khoản (/staff) (ADR-0018). */
  roleTypes: { code: string; name: string; group: "INTERNAL" | "EXTERNAL" | "OTHER"; active: boolean }[];
  relationshipTypes: { code: string; name: string }[];
}

// ---- Góp ý / Báo lỗi (module feedback) ----
export interface FeedbackContextDto {
  path?: string;
  orderCode?: string;
  device?: string;
  standalone?: boolean;
  appVersion?: string;
}

export interface FeedbackCreateInput {
  kind: FeedbackKind;
  title: string;
  body: string;
  /** UUID sinh một lần khi mở form; gửi lại cùng mã thì trả yêu cầu cũ (chống trùng khi mạng yếu). */
  clientRequestId: string;
  context?: FeedbackContextDto;
}

export interface FeedbackTicketDto {
  id: string;
  /** Mã người đọc, vd YC-0007. */
  code: string;
  kind: FeedbackKind;
  kindName: string;
  status: FeedbackStatus;
  statusName: string;
  title: string;
  context: FeedbackContextDto;
  submitterId: string;
  submitterName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  resolvedIn: string | null;
  lastActivityAt: string;
  lastPublicReplyAt: string | null;
  createdAt: string;
  /** Có gì mới người xem chưa đọc (chấm đỏ). */
  unread: boolean;
  /** Chỉ admin thấy: true = email báo admin chưa gửi được. */
  mailPending: boolean;
}

export interface FeedbackMessageDto {
  id: string;
  authorId: string;
  authorName: string | null;
  body: string;
  internal: boolean;
  createdAt: string;
  mine: boolean;
}

export interface FeedbackStatRow {
  /** Tuần theo strftime('%Y-%W') của created_at. */
  week: string;
  kind: FeedbackKind;
  status: FeedbackStatus;
  count: number;
}

export interface FeedbackListResponse {
  tickets: FeedbackTicketDto[];
}
export interface FeedbackQueueResponse extends FeedbackListResponse {
  stats: FeedbackStatRow[];
}
export interface FeedbackDetailResponse {
  ticket: FeedbackTicketDto;
  messages: FeedbackMessageDto[];
  canTriage: boolean;
}
export interface FeedbackBadgeResponse {
  /** Số yêu cầu CỦA TÔI có phản hồi mới. */
  mine: number;
  /** Số yêu cầu chờ admin (0 với người không phải admin). */
  queue: number;
}
