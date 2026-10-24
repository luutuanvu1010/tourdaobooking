// Người phụ trách đơn ở giao diện (v1.0, Task 8): ai thấy nút nào, chữ hiển thị, và câu báo khi máy chủ từ chối. Thuần, không DOM (web/orders.ts, web/order.ts, web/handler-sheet.ts dựng DOM).
// Quyền đi qua `can()` (một nguồn — permissions.ts), KHÔNG chép ma trận: "được giao" = `handler.staffId` là chính người dùng. Máy chủ vẫn kiểm lại mọi thao tác (`PUT /api/orders/:id/handler`).
import type { HandlerDto, OrderStatus, StaffProfile } from "./contracts.ts";
import { banner, type Banner, type ErrorInput } from "./order-errors.ts";
import { can, seesOnlyAssignedOrders, type PermissionHolder } from "./permissions.ts";
import { LY_DO_TU_CHOI } from "./ly-do-tu-choi.ts";
import { vnDateTimeText } from "./vn-date.ts";

/** Chip ở danh sách đơn và ở khối "Người phụ trách" khi đơn chưa có người (ADR-0030 điều 3, Q-A2: "Chờ nhận" thay
 * "Chưa có người phụ trách" — đơn mới không tự gắn người lập, HDV cần thấy ngay đây là đơn đang chờ ai đó bấm Nhận). */
export const NO_HANDLER_TEXT = "Chờ nhận";
/** Chip «Chờ nhận» kèm dấu «được trả lại» khi lần thay đổi phụ trách gần nhất là Từ chối (ADR-0030 điều 3) — chỉ ở trang đơn văn phòng và thẻ hàng chờ
 * của HDV; danh sách đơn văn phòng giữ «Chờ nhận». `traLai` do máy chủ trả (cờ, không tên, không lý do). */
export const nhanChoNhan = (traLai: boolean): string => (traLai ? `${NO_HANDLER_TEXT} · được trả lại` : NO_HANDLER_TEXT);
/** Dòng ở danh sách đơn (ADR-0030 điều 3, Q-A2: "HDV: <tên>" thay "Phụ trách: <tên>"). */
export const handlerText = (name: string): string => `HDV: ${name}`;

/**
 * Người phụ trách suy từ PHIÊN ĐĂNG NHẬP, không hỏi máy chủ (ADR-0030 S23-4/S23-8; vòng sửa 1 sau kiểm độc lập lượt 1, phát hiện I-2 — cùng cách
 * `web/account.ts` đã làm ở Task 1.6). Tài khoản CHỈ xem được đơn mình ĐANG phụ trách (`seesOnlyAssignedOrders`: máy chủ trả danh sách = đúng tập đơn
 * họ phụ trách, chi tiết đơn khác → 404) thì MỌI đơn đang hiện trước mặt họ là đơn họ phụ trách → người phụ trách = chính họ; tên `fullName` của phiên
 * = `display_name` của hồ sơ, cùng nguồn với `label` của `v_dsp_order_handler`. Trang KHÔNG gọi `GET /api/dispatch/handlers` cho họ — route đó hỏi
 * `order.view` không ngữ cảnh (xem mọi đơn), 403 với họ, và không mở cho họ (ruling điều phối Task 1.6).
 * `undefined` = không suy được: người xem mọi đơn, Đối tác, Thực tập, tài khoản ghép (HDV + Thực tập/Đối tác thấy cả đơn mình lập — người phụ trách
 * có thể là người khác), hoặc phiên thiếu hồ sơ/tên → trang hỏi máy chủ như cũ.
 */
export function nguoiPhuTrachTuPhien(staff: Pick<StaffProfile, "id" | "fullName" | "partyId" | "permissions">): HandlerDto | undefined {
  if (!seesOnlyAssignedOrders(staff)) return undefined;
  if (staff.partyId === null || staff.fullName.trim() === "") return undefined;
  return { partyId: staff.partyId, staffId: staff.id, name: staff.fullName };
}

/**
 * Người xem có được HỎI máy chủ danh sách người phụ trách (`GET /api/dispatch/handlers`) không — CÙNG câu hỏi với route (`can(order.view)` không ngữ cảnh =
 * xem được mọi đơn; src/modules/dispatch/index.ts). Sai (Đối tác, Thực tập, tài khoản lai của họ, HDV): KHÔNG gọi route (chắc chắn 403). HDV đã có tên từ
 * phiên (`nguoiPhuTrachTuPhien`, hỏi trước hàm này); người còn lại không được biết người phụ trách → trang đơn ẩn khối "Người phụ trách", danh sách ẩn dòng
 * "HDV: …" — cùng tiền lệ `HANDLER_HIDDEN` của ảnh biên nhận (không dòng, không câu chờ). Lỗi báo 30/9 (L2): trước đây trang đơn luôn hiện "Chưa tải được
 * người phụ trách." + Thử lại.
 */
export const hoiDuocNguoiPhuTrach = (viewer: PermissionHolder): boolean => can(viewer, "order.view");

export interface HandlerControls {
  /** Nút mở bảng chọn người phụ trách (đổi, hoặc giao lần đầu). */
  assign: boolean;
  assignLabel: string;
  /** Nút "Nhận phụ trách" (nhận cho chính mình) — chỉ khi đơn chưa có người. */
  claim: boolean;
  /** Nút "Từ chối đơn" (ADR-0030 điều 1) — chỉ người ĐANG phụ trách, đơn đã xác nhận, chưa Đã giao, ngày đi còn sau ngày mai. */
  refuse: boolean;
}

/** Trạng thái đơn mà nút "Từ chối đơn" cần (trang đơn tính `quaMuon` bằng `tuChoiQuaMuon`, `daGiao` từ `deliveredAt`). Thiếu `status` → ẩn nút (không đoán). */
export interface DonChoNutPhuTrach {
  staffId: string;
  status?: OrderStatus;
  daGiao?: boolean;
  quaMuon?: boolean;
}

/**
 * Nút nào hiện ở trang đơn. `handler`: người phụ trách đang mở; `null` = CHƯA có; `undefined` = CHƯA BIẾT (lời gọi lỗi/chưa xong) → KHÔNG nút nào: nói "chưa có người" rồi mời nhận là khẳng định điều
 * chưa biết, còn ẩn nút đổi thì chỉ tạm thiếu một đường (tải lại là có).
 */
export function handlerControls(staff: PermissionHolder, order: DonChoNutPhuTrach, handler: HandlerDto | null | undefined): HandlerControls {
  if (handler === undefined) return { assign: false, assignLabel: "", claim: false, refuse: false };
  const dangPhuTrach = handler !== null && handler.staffId === staff.id;
  const assign = can(staff, "dispatch.assign", { ownerId: order.staffId, assigned: dangPhuTrach });
  // Từ chối (ADR-0030 điều 1): hỏi bảng quyền với `assigned` = đang phụ trách thật — máy chủ còn chốt đúng người (cả Toàn quyền), nên KHÔNG hỏi không ngữ cảnh.
  const refuse = dangPhuTrach && can(staff, "dispatch.refuse", { assigned: true }) && order.status === "confirmed" && order.daGiao !== true && order.quaMuon === false;
  return { assign, assignLabel: handler === null ? "Chọn người phụ trách" : "Đổi người phụ trách", claim: handler === null && can(staff, "dispatch.claim"), refuse };
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
export function handlerFailure(e: ErrorInput | null, kind: "assign" | "claim" | "refuse"): HandlerFailure {
  if (e === null) return { banner: banner("danger", "Không kết nối được máy chủ.", { lines: [{ text: "Kiểm tra kết nối mạng rồi thử lại." }] }), reload: false };
  // Từ chối (ADR-0030 điều 1): 409 hạn / đã huỷ / nháp / Đã giao là câu máy chủ nói rõ việc phải làm ("Gọi văn phòng để đổi người") — giữ nguyên, không tải lại.
  if (kind === "refuse" && e.status === 403) return { banner: banner("warning", "Bạn không còn phụ trách đơn này. Đã tải lại."), reload: true };
  // ADR-0032 điều 5, 9: hết lượt Từ chối — hiện NGUYÊN câu máy chủ («… Hãy gọi văn phòng.»), hộp không đóng, không tải lại.
  if (kind === "refuse" && e.status === 409 && e.code === "refuse_limit") return { banner: banner("warning", e.message), reload: false };
  if (e.status === 409 && e.code === "stale") {
    const title = kind === "claim" ? "Đơn này vừa có người khác nhận phụ trách. Đã tải lại đơn." : "Người phụ trách của đơn vừa được đổi ở nơi khác. Đã tải lại — hãy xem người phụ trách hiện tại rồi thử lại nếu cần.";
    return { banner: banner("warning", title), reload: true };
  }
  if (e.status === 409 && e.code === "no_change") return { banner: banner("info", "Người này đang phụ trách đơn rồi. Đã tải lại đơn."), reload: true };
  if (e.status === 403) return { banner: banner("danger", "Bạn không còn quyền đổi người phụ trách của đơn này. Đã tải lại đơn."), reload: true };
  return { banner: banner("danger", e.message || "Có lỗi xảy ra, thử lại sau."), reload: false };
}

/** Câu báo (banner thông tin) sau khi lưu thành công. `hadHandler`: trước đó đơn đã có người phụ trách. */
export function handlerSaved(kind: "assign" | "claim" | "refuse", name: string, hadHandler: boolean): string {
  if (kind === "claim") return "Bạn đã nhận phụ trách đơn này.";
  if (kind === "refuse") return "Đã trả đơn. Đơn quay về danh sách Chờ nhận.";
  return hadHandler ? `Đã đổi người phụ trách sang ${name}.` : `Đã giao đơn cho ${name} phụ trách.`;
}

export interface MyJobActions {
  /** Nút "Huỷ đơn này" ở thẻ đơn trong "Việc của tôi". */
  cancel: boolean;
  /** Ô sửa số khách của từng dịch vụ trong đơn (còn cần `editablePaxCodes` của TỪNG dịch vụ mới thật sự hiện — gate này chỉ ở mức đơn). */
  editPax: boolean;
  /** Nút "Từ chối đơn" (ADR-0030 điều 1): đơn đã xác nhận, ngày đi còn sau ngày mai (`quaMuon` = `tuChoiQuaMuon`). Nơi gọi còn hỏi `can(dispatch.refuse)`. */
  refuse: boolean;
}

/**
 * "Việc của tôi" (`GET /api/dispatch/mine`) từ bản 1.6 (ADR-0030 S23-8, lượt 1) trả CẢ đơn nháp, không chỉ đơn đã xác nhận — hàm thuần này quyết
 * nút nào hiện, theo `status` của đơn và đã qua ngày đi hay chưa. Nháp: `handler-money-edit`/`handler-cancel` đều từ chối bằng 409
 * (`not_confirmed`/`not_editable`) nên ẩn cả hai, tránh bấm hụt — huỷ đơn nháp thuộc lượt 2 (ADR-0030 D5), CHƯA có ở đây. Đã xác nhận còn ngày đi:
 * đủ cả hai. Đã xác nhận, qua ngày đi: ẩn huỷ (DK-T4-02 — nhờ văn phòng) VÀ ẩn sửa số khách (chủ dự án duyệt 2026-09-30 "Cho sửa đến hết ngày
 * đi" — máy chủ `handler-money-edit` chặn 409 `departed` với cùng `tripDeparted`, trừ Toàn quyền). Trong ngày đi vẫn đủ cả hai.
 */
export function myJobActions({ status, departed, quaMuon }: { status: OrderStatus; departed: boolean; quaMuon: boolean }): MyJobActions {
  if (status !== "confirmed") return { cancel: false, editPax: false, refuse: false };
  return { cancel: !departed, editPax: !departed, refuse: !quaMuon };
}

/**
 * Dòng phụ dưới tên người ở bảng chọn người phụ trách (ADR-0032 điều 10): người đó từng Từ chối CHÍNH đơn đang giao. Nhãn lý do từ danh sách đóng (không
 * lộ mã). Không có mục → null (không hiện dòng).
 */
export function dongTuChoiTruoc(muc: { luc: string; lyDo: string } | undefined): string | null {
  if (!muc) return null;
  return `Đã từ chối đơn này lúc ${vnDateTimeText(muc.luc)} — ${LY_DO_TU_CHOI.find((l) => l.ma === muc.lyDo)?.nhan ?? "Khác"}`;
}
