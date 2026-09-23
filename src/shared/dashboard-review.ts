// "Cần xem lại" trên Trang chủ mới (Đợt D Task 3) — CHỈ TÀI KHOẢN QUẢN TRỊ thấy (quyết định chủ dự án,
// docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md mục 3: giữ đúng quyền hiện có của dữ liệu cảnh báo
// giá, TUYỆT ĐỐI KHÔNG mở quyền đọc cho mọi nhân viên).
//
// Hàm THUẦN, gọi từ web/home.ts. Dữ liệu lấy từ HAI route sẵn có (KHÔNG đổi, KHÔNG thêm route/migration) — cả hai
// đã tự khai `access: "admin"` (router.ts kiểm ADMIN/SUPER_ADMIN trước khi vào tới đây):
//   GET /api/catalog/admin  → items[].conflicts[]  (cảnh báo Sheet đổi giá)
//   GET /api/feedback       → tickets[]            (cảnh báo góp ý admin chưa xem)
// web/home.ts CHỈ gọi hai route này khi biết trước người xem là admin (tránh gọi thừa/403 cho phần lớn người dùng),
// nhưng hàm ở đây KIỂM LẠI quyền một lần nữa — không tin "web/home.ts có gọi API hay không": module orders KHÔNG
// được import module catalog/feedback (src/CLAUDE.md, luật ranh giới module), nên không có cách nào ép buộc quyền
// này ở phía server cho RIÊNG khối này; việc kiểm lại ở đây làm cho "không phải quản trị không nhận được dữ liệu"
// là một điều kiểm được bằng test thuần, không chỉ dựa vào kỷ luật gọi API đúng chỗ ở web/.
import type { CatalogAdminItemDto, FeedbackTicketDto } from "./contracts.ts";
import { hasPermission, type PermissionHolder } from "./permissions.ts";

export interface ReviewCatalogAlert {
  /** Mã dịch vụ có ghi đè lệch Sheet — dịch vụ ĐẦU TIÊN theo thứ tự `items` truyền vào (đủ cho một dòng tóm tắt; xem đủ chi tiết ở trang Dịch vụ & giá). */
  code: string;
  base: number | null;
  current: number | null;
  /** Số dịch vụ KHÁC cũng đang lệch Sheet (0 = chỉ một). */
  moreCount: number;
}

export interface ReviewFeedbackAlert {
  /** Tổng số yêu cầu còn ở trạng thái "Mới" (chưa trả lời). */
  count: number;
  /** Tối đa `max` yêu cầu gần nhất (tickets truyền vào đã sắp mới nhất trước — GET /api/feedback: ORDER BY last_activity_at DESC). */
  items: { code: string; kindName: string }[];
}

export interface ReviewAlerts {
  catalogConflict: ReviewCatalogAlert | null;
  feedbackQueue: ReviewFeedbackAlert | null;
}

/** Đúng cổng `access === "admin"` của router.ts (ADMIN hoặc SUPER_ADMIN) — KHÔNG chỉ ADMIN như web/shell.ts dùng để
 * vẽ menu (một tài khoản giữ SUPER_ADMIN mà không giữ ADMIN vẫn gọi được hai route trên, xem ADR-0014 điều 2). */
export const canSeeReviewAlerts = (staff: PermissionHolder): boolean => hasPermission(staff, "ADMIN") || hasPermission(staff, "SUPER_ADMIN");

function summarizeCatalogConflicts(items: readonly CatalogAdminItemDto[]): ReviewCatalogAlert | null {
  const withConflicts = items.filter((i) => i.conflicts.length > 0);
  if (withConflicts.length === 0) return null;
  const first = withConflicts[0]!;
  const c = first.conflicts[0]!;
  return { code: first.code, base: c.base, current: c.current, moreCount: withConflicts.length - 1 };
}

/**
 * "Chưa trả lời" = trạng thái NEW (nhãn "Mới" — đúng chữ mockup "góp ý MỚI chưa trả lời"). CỐ Ý không dùng cờ
 * `unread` (UNREAD_ADMIN ở feedback/repository.ts): cờ đó tắt ngay khi MỘT admin nào đó MỞ yêu cầu (markSeen), kể
 * cả khi chưa ai trả lời — dùng nó sẽ làm rớt những yêu cầu admin đã lỡ mở xem nhưng quên trả lời, khiến số đếm ít
 * hơn số "mới chưa trả lời" thật.
 */
function summarizeFeedbackQueue(tickets: readonly FeedbackTicketDto[], max = 2): ReviewFeedbackAlert | null {
  const pending = tickets.filter((t) => t.status === "NEW");
  if (pending.length === 0) return null;
  return { count: pending.length, items: pending.slice(0, max).map((t) => ({ code: t.code, kindName: t.kindName })) };
}

/**
 * Dựng khối "Cần xem lại". `staff` không phải quản trị → `null` (ẩn khối) DÙ `data` có cảnh báo thật — đây là điều
 * kiểm được bằng test thuần (không chỉ bằng `data === null`). `data === null` = CHƯA TẢI được (web/home.ts chỉ gọi
 * hai API trên khi là admin; lỗi mạng/hết giờ cũng rơi vào nhánh này). Không có cảnh báo nào (cả hai đều null) →
 * `null` (ẩn cả khối, KHÔNG hiện thẻ trống — bài học Đợt C).
 */
export function reviewAlerts(
  staff: PermissionHolder,
  data: { catalogItems: readonly CatalogAdminItemDto[]; tickets: readonly FeedbackTicketDto[] } | null,
): ReviewAlerts | null {
  if (!canSeeReviewAlerts(staff)) return null;
  if (!data) return null;
  const catalogConflict = summarizeCatalogConflicts(data.catalogItems);
  const feedbackQueue = summarizeFeedbackQueue(data.tickets);
  if (!catalogConflict && !feedbackQueue) return null;
  return { catalogConflict, feedbackQueue };
}
