// HỢP ĐỒNG API giữa Worker và giao diện (web/). Chỉ chứa kiểu — không có mã chạy.
// Server khai kiểu trả về theo file này (và `satisfies` ở chỗ trả JSON); web/api.ts re-export. Đổi một bên mà quên bên kia → typecheck báo.
import type { AuditAction, AuditTargetType } from "./audit-actions.ts";
import type { CatalogService, PaxCode, PaxCounts, Prices } from "./order-lines.ts";

export type { AuditAction, AuditTargetType, CatalogService, PaxCode, PaxCounts, Prices };

// ---- Nhân viên / phiên -------------------------------------------------------
export type StaffRole = "sales" | "admin";

export interface StaffProfile {
  id: string;
  fullName: string;
  phone: string;
  role: StaffRole;
}

/** Hồ sơ đầy đủ cho màn hình quản trị. */
export interface StaffAccount extends StaffProfile {
  active: boolean;
  createdAt: string;
}

export interface StaffAccountDto extends StaffAccount {
  /** Đang bị khoá đăng nhập do nhập sai PIN quá nhiều lần. */
  locked: boolean;
}

export interface StaffSheetCandidateDto {
  row: number;
  name: string;
  phone: string;
  status: "new" | "same" | "name_differs";
  currentName: string | null;
}

export interface MeResponse { staff: StaffProfile }
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

export type OrderSummaryDto = Pick<
  OrderDto,
  "id" | "orderCode" | "status" | "customerName" | "customerPhone" | "total" | "remainingAmount" | "staffName" | "createdAt"
>;

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
  /** Bắt buộc khi sửa (PUT): `updatedAt` của đơn mà form đã đọc — lệch → 409 `stale`. */
  expectedUpdatedAt?: string;
}

/** `PUT /api/orders/:id/trip` — sửa trường vận hành (đơn nháp hoặc đã xác nhận). */
export interface TripUpdateInput {
  expectedUpdatedAt: string;
  services: ({ id: string } & TripInput)[];
}

/** Thân lỗi có thêm dữ liệu: 409 `incomplete_trip` (xác nhận thiếu chuyến) và 409 `catalog_changed` (giá danh mục vừa đổi). */
export interface IncompleteTripBody { error: { code: "incomplete_trip"; message: string; missing: TripGapDto[] } }
export interface CatalogChangedBody { error: { code: "catalog_changed"; message: string; changes: CatalogChangeDto[] } }

export interface OrderListResponse { orders: OrderSummaryDto[]; hasMore: boolean }
export interface OrderResponse { order: OrderDetailDto }
export interface OrderDetailResponse { order: OrderDetailDto; history: AuditEntryDto[]; canModify: boolean }

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
