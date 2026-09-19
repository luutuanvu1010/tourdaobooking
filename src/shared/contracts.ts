// HỢP ĐỒNG API giữa Worker và giao diện (web/). Chỉ chứa kiểu — không có mã chạy.
// Server khai kiểu trả về theo file này (và `satisfies` ở chỗ trả JSON); web/api.ts re-export. Đổi một bên mà quên bên kia → typecheck báo.
import type { AuditAction, AuditTargetType } from "./audit-actions.ts";
import type { CatalogService, PaxCode, Prices } from "./order-lines.ts";

export type { AuditAction, AuditTargetType, CatalogService, PaxCode, Prices };

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
  description: string;
  detail: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
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
  items: OrderItemDto[];
}

export type OrderSummaryDto = Pick<
  OrderDto,
  "id" | "orderCode" | "status" | "customerName" | "customerPhone" | "total" | "remainingAmount" | "staffName" | "createdAt"
>;

/** Dữ liệu client gửi lên khi tạo/sửa đơn: chỉ các trường nhập, KHÔNG có số dẫn xuất — server tự tính (§2.3). */
export interface OrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNote: string;
  items: { catalogCode: string | null; description: string; detail: string; quantity: number; unitPrice: number }[];
  discount: number;
  depositAmount: number;
  depositMethod: DepositMethod | null;
  paymentNote: string;
}

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
