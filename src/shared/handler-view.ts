// Người phụ trách đơn ở giao diện (v1.0, Task 8): ai thấy nút nào, chữ hiển thị, và câu báo khi máy chủ từ chối. Thuần, không DOM (web/orders.ts, web/order.ts, web/handler-sheet.ts dựng DOM).
// Quyền đi qua `can()` (một nguồn — permissions.ts), KHÔNG chép ma trận: "được giao" = `handler.staffId` là chính người dùng. Máy chủ vẫn kiểm lại mọi thao tác (`PUT /api/orders/:id/handler`).
import type { HandlerDto } from "./contracts.ts";
import { banner, type Banner, type ErrorInput } from "./order-errors.ts";
import { can, type PermissionHolder } from "./permissions.ts";

/** Chip ở danh sách đơn và ở khối "Người phụ trách" khi đơn chưa có người. */
export const NO_HANDLER_TEXT = "Chưa có người phụ trách";
/** Dòng ở danh sách đơn. */
export const handlerText = (name: string): string => `Phụ trách: ${name}`;

export interface HandlerControls {
  /** Nút mở bảng chọn người phụ trách (đổi, hoặc giao lần đầu). */
  assign: boolean;
  assignLabel: string;
  /** Nút "Nhận phụ trách" (nhận cho chính mình) — chỉ khi đơn chưa có người. */
  claim: boolean;
}

/**
 * Nút nào hiện ở trang đơn. `handler`: người phụ trách đang mở; `null` = CHƯA có; `undefined` = CHƯA BIẾT (lời gọi lỗi/chưa xong) → KHÔNG nút nào: nói "chưa có người" rồi mời nhận là khẳng định điều
 * chưa biết, còn ẩn nút đổi thì chỉ tạm thiếu một đường (tải lại là có).
 */
export function handlerControls(staff: PermissionHolder, order: { staffId: string }, handler: HandlerDto | null | undefined): HandlerControls {
  if (handler === undefined) return { assign: false, assignLabel: "", claim: false };
  const assign = can(staff, "dispatch.assign", { ownerId: order.staffId, assigned: handler !== null && handler.staffId === staff.id });
  return { assign, assignLabel: handler === null ? "Chọn người phụ trách" : "Đổi người phụ trách", claim: handler === null && can(staff, "dispatch.claim") };
}

export interface HandlerFailure {
  banner: Banner;
  /** true → tải lại đơn (trạng thái ở màn hình đã lỗi thời hoặc quyền đã đổi); false → giữ nguyên, người dùng chọn lại. */
  reload: boolean;
}

/**
 * Máy chủ từ chối đổi/nhận người phụ trách → một banner tiếng Việt (không lộ mã lỗi). `e` = null khi không tới được máy chủ. 409 stale/no_change và 403 đều nghĩa là màn hình đã cũ → tải lại.
 * (Không dùng `classifyOrderError`: câu "Đơn vừa được người khác sửa" của nó nói về sửa nội dung đơn.)
 */
export function handlerFailure(e: ErrorInput | null, kind: "assign" | "claim"): HandlerFailure {
  if (e === null) return { banner: banner("danger", "Không kết nối được máy chủ.", { lines: [{ text: "Kiểm tra kết nối mạng rồi thử lại." }] }), reload: false };
  if (e.status === 409 && e.code === "stale") {
    const title = kind === "claim" ? "Đơn này vừa có người khác nhận phụ trách. Đã tải lại đơn." : "Người phụ trách của đơn vừa được đổi ở nơi khác. Đã tải lại — hãy xem người phụ trách hiện tại rồi thử lại nếu cần.";
    return { banner: banner("warning", title), reload: true };
  }
  if (e.status === 409 && e.code === "no_change") return { banner: banner("info", "Người này đang phụ trách đơn rồi. Đã tải lại đơn."), reload: true };
  if (e.status === 403) return { banner: banner("danger", "Bạn không còn quyền đổi người phụ trách của đơn này. Đã tải lại đơn."), reload: true };
  return { banner: banner("danger", e.message || "Có lỗi xảy ra, thử lại sau."), reload: false };
}

/** Câu báo (banner thông tin) sau khi lưu thành công. `hadHandler`: trước đó đơn đã có người phụ trách. */
export function handlerSaved(kind: "assign" | "claim", name: string, hadHandler: boolean): string {
  if (kind === "claim") return "Bạn đã nhận phụ trách đơn này.";
  return hadHandler ? `Đã đổi người phụ trách sang ${name}.` : `Đã giao đơn cho ${name} phụ trách.`;
}
