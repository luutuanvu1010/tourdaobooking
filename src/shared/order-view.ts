// Trang đơn (A2, đặc tả 5.3): DTO → mô hình hiển thị (mỗi dịch vụ một khối chỉ-đọc) và bộ nút theo trạng thái/quyền. Thuần, không DOM.
import type { CatalogStatus, OrderServiceDto, OrderStatus } from "./contracts.ts";
import { priceDeviation } from "./order-lines.ts";
import { paxSummary, unitLabel } from "./service-form.ts";
import { tripRows, type TripRow } from "./trip-form.ts";

export interface LineView {
  id: string;
  description: string;
  detail: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  catalogPrice: number | null;
  /** `priceDeviation`: dương = cao hơn giá danh mục; null = khớp hoặc dòng nhập tay (không bao giờ có nhãn). */
  deviation: number | null;
}

export interface CatalogTag {
  tone: "warning" | "muted";
  text: string;
}

export interface ServiceView {
  id: string;
  name: string;
  /** Mã danh mục; null = nhập tay. */
  code: string | null;
  unit: string;
  pax: string;
  trip: TripRow[];
  lines: LineView[];
  subtotal: number;
  tag: CatalogTag | null;
}

/** So với danh mục hiện tại (máy chủ chỉ điền cho đơn NHÁP): ok/null → không nhãn. */
export function catalogTag(status: CatalogStatus | null): CatalogTag | null {
  if (status === "price_changed") return { tone: "warning", text: "Giá danh mục đã đổi" };
  if (status === "unavailable") return { tone: "muted", text: "Dịch vụ đã ẩn khỏi danh mục" };
  return null;
}

export function serviceView(s: OrderServiceDto): ServiceView {
  return {
    id: s.id,
    name: s.name,
    code: s.catalogCode,
    unit: unitLabel(s.unit),
    pax: paxSummary(s.pax, s.unit),
    trip: tripRows(s),
    lines: s.items.map((it) => ({
      id: it.id,
      description: it.description,
      detail: it.detail,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
      catalogPrice: it.catalogPrice,
      deviation: priceDeviation(it),
    })),
    subtotal: s.items.reduce((sum, it) => sum + it.lineTotal, 0),
    tag: catalogTag(s.catalogStatus),
  };
}

export interface OrderActions {
  /** Nút "Sửa" (mở form) — đơn nháp. */
  edit: boolean;
  /** Nút "Xác nhận đơn" — đơn nháp. */
  confirm: boolean;
  /** Nút "Sửa thông tin chuyến" (bảng trượt) — đơn đã xác nhận. */
  editTrip: boolean;
  /** Nút "Huỷ đơn" — đơn nháp hoặc đã xác nhận. */
  cancel: boolean;
  /** Dòng "Chỉ <người lập> hoặc quản trị viên mới được sửa, xác nhận hoặc huỷ đơn này." */
  noPermission: boolean;
  /** Đơn đã xác nhận: dòng nhắc "dịch vụ, số khách và tiền đã khoá" và biểu tượng khoá. */
  locked: boolean;
}

/** `canModify` là cờ của máy chủ (`can(order.modify, owner)`), không suy ra ở client (D4). */
export function orderActions(status: OrderStatus, canModify: boolean): OrderActions {
  const none: OrderActions = { edit: false, confirm: false, editTrip: false, cancel: false, noPermission: false, locked: status === "confirmed" };
  if (!canModify) return { ...none, noPermission: true };
  if (status === "draft") return { ...none, edit: true, confirm: true, cancel: true };
  if (status === "confirmed") return { ...none, editTrip: true, cancel: true };
  return none;
}
