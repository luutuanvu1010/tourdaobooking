// Trang đơn (A2, đặc tả 5.3): DTO → mô hình hiển thị (mỗi dịch vụ một khối chỉ-đọc) và bộ nút theo trạng thái/quyền. Thuần, không DOM.
import type { CatalogStatus, OrderServiceDto, OrderStatus } from "./contracts.ts";
import { PAX_LABEL, PAX_ORDER, priceDeviation, type PaxCounts } from "./order-lines.ts";
import { can, seesOnlyAssignedOrders, type PermissionHolder } from "./permissions.ts";
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

/** `orderDate` (bản 1.39) = ngày của đơn đã hiện ở dải đầu trang — dịch vụ cùng ngày không lặp dòng "Khởi hành" (`tripRows`). */
export function serviceView(s: OrderServiceDto, orderDate: string | null = null): ServiceView {
  return {
    id: s.id,
    name: s.name,
    code: s.catalogCode,
    unit: unitLabel(s.unit),
    pax: paxSummary(s.pax, s.unit),
    trip: tripRows(s, orderDate),
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

/** Số khách viết đủ chữ cho dải đầu trang đơn (bản 1.39): "8 người lớn, 1 trẻ em"; bỏ loại 0 khách; không khách → "". Danh sách đơn vẫn viết tắt. */
export function paxFullText(pax: PaxCounts): string {
  return PAX_ORDER.filter((c) => pax[c] > 0).map((c) => `${pax[c]} ${PAX_LABEL[c].toLowerCase()}`).join(", ");
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
  /** Dòng "Chỉ <người lập> (người lập đơn), người phụ trách đơn hoặc quản trị viên mới được sửa, xác nhận hoặc huỷ đơn này." (ADR-0009; chữ do web/order.ts dựng, quyền do máy chủ quyết qua `canModify`) */
  noPermission: boolean;
  /** Đơn đã xác nhận: dòng nhắc "dịch vụ, số khách và tiền đã khoá" và biểu tượng khoá. */
  locked: boolean;
}

/**
 * Câu giải thích ở trang đơn khi người đang xem KHÔNG sửa/xác nhận/huỷ được (`orderActions(...).noPermission`). Hướng dẫn viên chỉ xem đơn mình ĐANG phụ
 * trách (`seesOnlyAssignedOrders`) — họ LÀ người phụ trách nhưng ô `order.modify` của FIELD là `none` (chỉ người phụ trách thuộc bán hàng mới sửa được
 * như người lập, ADR-0009) — nên câu chung "… người phụ trách đơn … mới được sửa" mâu thuẫn với chính họ (vòng sửa 1 sau kiểm độc lập lượt 1 ADR-0030,
 * phát hiện I-2). Câu cho họ chỉ nói điều TRANG NÀY không làm và nhờ ai; đơn đã xác nhận thì chỉ tới mục "Việc của tôi" (nơi có nút của HDV, `myJobActions`)
 * mà không hứa nút cụ thể (đã qua ngày đi thì không còn nút huỷ). Người khác giữ câu cũ.
 */
export function khongQuyenSuaText(input: { ownerName: string; status: OrderStatus; viewer: Pick<PermissionHolder, "permissions"> }): string {
  const { ownerName, status, viewer } = input;
  if (seesOnlyAssignedOrders(viewer)) {
    return status === "confirmed"
      ? `Hướng dẫn viên không sửa, xác nhận hoặc huỷ đơn ở trang này. Việc hướng dẫn viên làm được với đơn đã xác nhận nằm ở mục “Việc của tôi” (trang Tôi); việc khác, nhờ ${ownerName} (người lập đơn) hoặc văn phòng.`
      : `Hướng dẫn viên không sửa, xác nhận hoặc huỷ đơn ở trang này — cần đổi gì, nhờ ${ownerName} (người lập đơn) hoặc văn phòng.`;
  }
  return `Chỉ ${ownerName} (người lập đơn), người phụ trách đơn hoặc quản trị viên mới được sửa, xác nhận hoặc huỷ đơn này.`;
}

/**
 * `canModify` là cờ của máy chủ (`can(order.modify, owner)`), không suy ra ở client (D4). `canEditTrip` = `suaChuyenDuoc(...)`: nút "Sửa thông tin chuyến"
 * và "Đổi khách" của đơn đã xác nhận (route PUT …/trip, PUT …/booker hỏi ô `order.trip.edit`, hẹp hơn `order.modify` — Đối tác, Thực tập: none).
 */
export function orderActions(status: OrderStatus, canModify: boolean, canEditTrip: boolean): OrderActions {
  const none: OrderActions = { edit: false, confirm: false, editTrip: false, cancel: false, noPermission: false, locked: status === "confirmed" };
  if (!canModify) return { ...none, noPermission: true };
  if (status === "draft") return { ...none, edit: true, confirm: true, cancel: true };
  if (status === "confirmed") return { ...none, editTrip: canEditTrip, cancel: true };
  return none;
}

/**
 * Người xem có sửa được THÔNG TIN CHUYẾN / đổi khách của đơn này không (ô `order.trip.edit` — một nguồn `permissions.ts`, không chép luật). Lỗi báo 30/9 (L1):
 * trước đây giao diện chỉ dựa `canModify` nên Đối tác, Thực tập (order.modify = own, order.trip.edit = none) thấy hai nút rồi bị 403.
 * Giao diện không luôn biết "đang phụ trách" (lời gọi người phụ trách có thể lỗi; Đối tác/Thực tập không được hỏi) nên suy PHẠM VI từ cờ `canModify` của máy
 * chủ: không sửa được đơn → không sửa được chuyến; là người lập → phạm vi "own"; không phải người lập mà máy chủ vẫn cho sửa → chỉ có thể do đang phụ trách
 * hoặc ô "any" → hỏi với `assigned: true`. Bài `order-view.test.ts` thử mọi tổ hợp quyền để ghim rằng cách suy này bằng đúng điều máy chủ quyết.
 */
export function suaChuyenDuoc(viewer: PermissionHolder, ownerId: string, canModify: boolean): boolean {
  if (!canModify) return false;
  return can(viewer, "order.trip.edit", { ownerId, assigned: ownerId !== viewer.id });
}
