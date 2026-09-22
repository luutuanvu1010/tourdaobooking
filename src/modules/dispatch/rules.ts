// Luật THUẦN của module dispatch (không I/O): danh sách id đơn khi tra người phụ trách, điều kiện người được giao, ai được đặt/đổi người phụ trách,
// câu nhật ký. Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`). Ma trận quyền là MỘT nơi (`src/shared/permissions.ts`): ở đây chỉ HỎI `can()`.
import { UUID_RE } from "../../shared/http.ts";
import { can, MATRIX, type PermissionHolder } from "../../shared/permissions.ts";

/** Số đơn tối đa của một lần tra `GET /api/dispatch/handlers` (danh sách đơn có trang tối đa 100 đơn). */
export const MAX_HANDLER_LOOKUP = 100;

export type Parsed<T> = ({ ok: true } & T) | { ok: false; message: string };

/**
 * `orderIds=a,b,c` → danh sách id đơn (bỏ trùng, giữ thứ tự). Thiếu hoặc rỗng = danh sách rỗng (trang không có đơn nào thì chẳng có gì để tra).
 * Đoạn rỗng giữa hai dấu phẩy, id sai dạng, hoặc quá 100 id khác nhau = lỗi.
 */
export function parseOrderIds(raw: string | null): Parsed<{ ids: string[] }> {
  const text = (raw ?? "").trim();
  if (text === "") return { ok: true, ids: [] };
  const parts = text.split(",").map((p) => p.trim());
  if (!parts.every((p) => UUID_RE.test(p))) return { ok: false, message: "Danh sách mã đơn không hợp lệ (các mã cách nhau bằng dấu phẩy)." };
  const ids = [...new Set(parts)];
  if (ids.length > MAX_HANDLER_LOOKUP) return { ok: false, message: `Chỉ tra được tối đa ${MAX_HANDLER_LOOKUP} đơn mỗi lần.` };
  return { ok: true, ids };
}

/** Thân `PUT /api/orders/:id/handler`: `{ staffId }`. */
export function parseSetHandler(body: Record<string, unknown> | null): Parsed<{ staffId: string }> {
  const staffId = body?.staffId;
  if (typeof staffId !== "string" || !UUID_RE.test(staffId)) return { ok: false, message: "Thiếu hoặc sai nhân viên được giao phụ trách." };
  return { ok: true, staffId };
}

/** Phần của tài khoản mà luật người được giao cần (khớp `StaffAccount`). */
export interface AssigneeCandidate extends PermissionHolder {
  fullName: string;
  active: boolean;
  partyId: string | null;
}

/**
 * Người được giao phụ trách (ADR-0009 điều 5, mở rộng ADR-0014 điều 6): nhân sự ĐANG HOẠT ĐỘNG, CÓ HỒ SƠ, và có quyền để người phụ trách luôn SỬA/HUỶ ĐƯỢC
 * ÍT NHẤT MỘT VIỆC của người phụ trách — hỏi thẳng bản đồ quyền với phạm vi "được giao", chấp nhận MỘT trong hai cấp: `order.modify` phạm vi `assigned`
 * (cấp đầy đủ — SALES/ADMIN hôm nay, hỏi qua `can()` như cũ) HOẶC `order.money.edit` mà Ô CHÍNH XÁC của quyền đó là `assigned` (cấp hẹp — FIELD, Phase B).
 * Cố ý đọc thẳng Ô của `MATRIX` (không dùng `can(..., "order.money.edit", { assigned: true })`): `can()` hợp NHIỀU quyền và ACCOUNTING/SUPER_ADMIN có ô
 * `order.money.edit = any` (sửa tiền MỌI đơn, không cần đang phụ trách) — nếu chỉ hỏi `can()`, ACCOUNTING sẽ lọt qua thành "đủ điều kiện làm người phụ
 * trách" dù ADR không hề nói vậy (họ sửa được tiền, không có nghĩa họ là một CẤP người phụ trách). Đổi ô nào thì luật này đổi theo, không cần sửa ở đây.
 * Không giao cho tài khoản chỉ kế toán hoặc không quyền nào. Vai trò hồ sơ (HDV, tài xế…) KHÔNG là điều kiện (ADR-0001 mục 4).
 * CỐ Ý CHƯA nhận `task.progress` (cấp thứ ba của PARTNER, ADR-0014 điều 10): việc đó cần thêm luật "chỉ qua duyệt yêu cầu đang chờ" ở `mayChangeHandler`
 * cùng lúc (Phase C) — nếu chỉ mở ở đây mà chưa có luật đó, một SALES gán thẳng được một PARTNER chưa từng xin việc, phá đúng điều 10 cấm.
 */
export function checkAssignee(who: AssigneeCandidate | null): Parsed<{ partyId: string; name: string }> {
  if (!who) return { ok: false, message: "Không tìm thấy nhân viên được chọn." };
  if (!who.active) return { ok: false, message: "Nhân viên này đã ngưng hoạt động, không thể giao phụ trách." };
  if (!who.partyId) return { ok: false, message: "Nhân viên này chưa có hồ sơ, không thể giao phụ trách." };
  const narrowTier = who.permissions.some((p) => MATRIX["order.money.edit"][p] === "assigned");
  const eligible = can(who, "order.modify", { assigned: true }) || narrowTier;
  if (!eligible) return { ok: false, message: "Chỉ giao phụ trách cho người có quyền Bán hàng, Quản trị hoặc Thực hiện." };
  return { ok: true, partyId: who.partyId, name: who.fullName };
}

/**
 * Người dùng `who` được đặt/đổi người phụ trách của đơn không (ADR-0009):
 *  - `dispatch.assign` (người lập HOẶC người phụ trách hiện tại; quản trị mọi đơn) — người lập giữ quyền cả khi đã giao lại;
 *  - hoặc `dispatch.claim`: đơn CHƯA có người phụ trách và `who` nhận cho CHÍNH MÌNH.
 * `current` = người phụ trách đang mở (null = chưa có); `current.staffId` null = hồ sơ chưa có tài khoản (không ai là "người được giao").
 */
export function mayChangeHandler(who: PermissionHolder, order: { ownerId: string }, current: { staffId: string | null } | null, targetStaffId: string): boolean {
  if (can(who, "dispatch.assign", { ownerId: order.ownerId, assigned: current !== null && current.staffId === who.id })) return true;
  return current === null && targetStaffId === who.id && can(who, "dispatch.claim");
}

/**
 * Phán quyết của route `PUT /api/orders/:id/handler` (một nguồn: hỏi `mayChangeHandler`, không chép luật):
 *  - `allow`     được phép (đổi người, hoặc nhận đơn chưa có người);
 *  - `stale`     NHẬN PHỤ TRÁCH THUA ĐUA: `who` tự đặt CHÍNH MÌNH và có quyền nhận (`dispatch.claim`) nhưng đơn ĐÃ có người phụ trách (ai đó nhận/được giao trước). Đây không phải
 *                vượt quyền mà là dữ liệu đã cũ ⇒ route trả 409 `stale` (giao diện tải lại). Trả 403 sẽ làm CÙNG một cuộc đua ra hai mã tuỳ thời điểm (409 nếu thua đúng lúc ghi, 403 nếu đến sau);
 *  - `forbidden` còn lại (giao hộ người khác khi không phải người lập/người phụ trách/quản trị, hoặc không có quyền nhận như kế toán/FIELD) ⇒ 403.
 */
export type HandlerChangeVerdict = "allow" | "stale" | "forbidden";

export function handlerChangeVerdict(who: PermissionHolder, order: { ownerId: string }, current: { staffId: string | null } | null, targetStaffId: string): HandlerChangeVerdict {
  if (mayChangeHandler(who, order, current, targetStaffId)) return "allow";
  return current !== null && targetStaffId === who.id && can(who, "dispatch.claim") ? "stale" : "forbidden";
}

/**
 * Lỗi "đã có người phụ trách đang mở" của chính CSDL (chỉ mục duy nhất `dsp_assignment_handler_open_uq`). Các câu của `service.ts` đã có điều kiện nên đường thường
 * KHÔNG đến được đây; đây là lưới cuối: route đổi nó thành 409 `stale` thay vì để thành 500.
 */
export const isOpenHandlerCollision = (e: unknown): boolean => e instanceof Error && /UNIQUE constraint failed: dsp_assignment\.order_id/.test(e.message);

/** Dòng nhật ký `order_handler_changed`: CHỈ TÊN (không SĐT). */
export const describeHandlerChange = (from: string | null, to: string): string => `từ ${from ?? "chưa có người phụ trách"} sang ${to}`;
