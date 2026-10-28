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
import { can, type PermissionHolder } from "./permissions.ts";
import type { ThuTruocDem } from "./thu-truoc-hien-thi.ts";

export interface ReviewCatalogAlert {
  /** Mã dịch vụ có ghi đè lệch Sheet — dịch vụ ĐẦU TIÊN theo thứ tự `items` truyền vào (đủ cho một dòng tóm tắt; xem đủ chi tiết ở trang Dịch vụ & giá). */
  code: string;
  /** Tên dịch vụ đó — dòng «Cần xem lại» hiện tên, không hiện mã (chủ chọn 28/10: «Sheet đã đổi giá: <tên>»). */
  name: string;
  base: number | null;
  current: number | null;
  /** Số dịch vụ KHÁC cũng đang lệch Sheet (0 = chỉ một). */
  moreCount: number;
  /** Dịch vụ `code` (ĐẦU) hiện có đang bị ẩn (không bán, `CatalogAdminItemDto.hidden`) hay không — ẩn và có cảnh báo
   * lệch giá KHÔNG loại trừ nhau (rules.ts `applyOverride`: `conflicts` tính độc lập với `hidden`). web/home.ts phải
   * đọc trường này để chọn đúng câu chữ, KHÔNG được mặc định "vẫn đang bán" cho dịch vụ đã ẩn. */
  hidden: boolean;
}

export interface ReviewFeedbackAlert {
  /** Tổng số yêu cầu còn ở trạng thái "Mới" (chưa trả lời). */
  count: number;
  /** Tối đa `max` yêu cầu gần nhất (tickets truyền vào đã sắp mới nhất trước — GET /api/feedback: ORDER BY last_activity_at DESC). */
  items: { id: string; code: string; kindName: string }[];
}

export interface ReviewAlerts {
  catalogConflict: ReviewCatalogAlert | null;
  feedbackQueue: ReviewFeedbackAlert | null;
  /** Giấy tờ sắp hết hạn (xe + tài xế — `count` của GET /api/van-chuyen/sap-het-han, bản vẽ "Trang chu Quan tri.dc.html" 1.73). Chỉ ô vehicle.manage. */
  expiringDocs: { count: number } | null;
  /** Khoản "Công ty thu" đang đối chiếu quá 3 ngày (ADR-0120 Điều 1 mục 3; `doiChieuQua3Ngay` của GET /api/ledger/coc/dem). Chỉ ô `ledger.view` (Kế toán, Toàn quyền). */
  doiChieu: { count: number } | null;
  /** Thu trước của đơn huỷ (ADR-0089 đ5, đ9c, đ11; NT-V6): số từ CÙNG lời gọi GET /api/ledger/coc/dem. Chỉ ô `ledger.view`; mọi số = 0 → null. Chữ: `thu-truoc-hien-thi.ts`. */
  thuTruoc: ThuTruocDem | null;
}

/** Hỏi bảng quyền — ô `admin.manage`, CÙNG ô route `GET /api/catalog/admin` hỏi (ADR-0072 mục 4a: giao diện không hỏi thẳng mã quyền). Quản trị và
 * Toàn quyền (kể cả tài khoản chỉ Toàn quyền, ADR-0014 điều 2) thấy; Nhân sự, Bán hàng, Kế toán… không. Hàng đợi Góp ý trong khối hỏi thêm `feedback.triage`. */
export const canSeeReviewAlerts = (staff: PermissionHolder): boolean => can(staff, "admin.manage");

function summarizeCatalogConflicts(items: readonly CatalogAdminItemDto[]): ReviewCatalogAlert | null {
  const withConflicts = items.filter((i) => i.conflicts.length > 0);
  if (withConflicts.length === 0) return null;
  const first = withConflicts[0]!;
  const c = first.conflicts[0]!;
  return { code: first.code, name: first.name, base: c.base, current: c.current, moreCount: withConflicts.length - 1, hidden: first.hidden };
}

/**
 * "Chưa trả lời" = trạng thái NEW (nhãn "Mới" — đúng chữ mockup "góp ý MỚI chưa trả lời") VÀ chưa có trả lời công khai nào
 * (`lastPublicReplyAt` rỗng). Người xử lý trả lời công khai KHÔNG đổi trạng thái (chỉ Nhận việc / đổi trạng thái mới đổi), nên nếu chỉ
 * xét NEW thì phiếu đã được trả lời vẫn bị đếm là "chưa trả lời" cho tới khi ai đó bấm Nhận việc. CỐ Ý không dùng cờ
 * `unread` (UNREAD_USER ở feedback/repository.ts, riêng từng người xem): cờ đó tắt ngay khi người xem MỞ yêu cầu (markSeen), kể
 * cả khi chưa ai trả lời — dùng nó sẽ làm rớt những yêu cầu admin đã lỡ mở xem nhưng quên trả lời, khiến số đếm ít
 * hơn số "mới chưa trả lời" thật.
 */
function summarizeFeedbackQueue(tickets: readonly FeedbackTicketDto[], max = 2): ReviewFeedbackAlert | null {
  const pending = tickets.filter((t) => t.status === "NEW" && t.lastPublicReplyAt === null);
  if (pending.length === 0) return null;
  return { count: pending.length, items: pending.slice(0, max).map((t) => ({ id: t.id, code: t.code, kindName: t.kindName })) };
}

/**
 * Dựng khối "Cần xem lại". `staff` không phải quản trị → `null` (ẩn khối) DÙ `data` có cảnh báo thật — đây là điều
 * kiểm được bằng test thuần (không chỉ bằng `data === null`). `data === null` = CHƯA TẢI được (web/home.ts chỉ gọi
 * hai API trên khi là admin; lỗi mạng/hết giờ cũng rơi vào nhánh này). Không có cảnh báo nào (cả hai đều null) →
 * `null` (ẩn cả khối, KHÔNG hiện thẻ trống — bài học Đợt C).
 */
export function reviewAlerts(
  staff: PermissionHolder,
  data: {
    catalogItems: readonly CatalogAdminItemDto[];
    tickets: readonly FeedbackTicketDto[];
    expiringCount?: number | null;
    doiChieuQuaHan?: number | null;
    /** Bốn số thu trước của GET /api/ledger/coc/dem; `null` = chưa tải được → không dòng. */
    thuTruoc?: { canChi: number; duyetQua7Ngay: number; sapHetHan: number; conNguoiGiu: number } | null;
  } | null,
): ReviewAlerts | null {
  // Dòng "đang đối chiếu" và dòng thu trước hỏi ô RIÊNG `ledger.view` (Kế toán + Toàn quyền) — Kế toán không phải Quản trị vẫn thấy khối với đúng các dòng này, không thấy dòng nào khác.
  const laQuanTri = canSeeReviewAlerts(staff);
  const laKeToan = can(staff, "ledger.view");
  const n2 = laKeToan ? (data?.doiChieuQuaHan ?? 0) : 0;
  const doiChieu = n2 > 0 ? { count: n2 } : null;
  const t = laKeToan ? data?.thuTruoc : null;
  const thuTruoc = t && t.canChi + t.sapHetHan + t.conNguoiGiu > 0 ? { canChi: t.canChi, qua7Ngay: t.duyetQua7Ngay, sapHetHan: t.sapHetHan, conNguoiGiu: t.conNguoiGiu } : null;
  if (!laQuanTri && !doiChieu && !thuTruoc) return null;
  if (!data) return null;
  if (!laQuanTri) return { catalogConflict: null, feedbackQueue: null, expiringDocs: null, doiChieu, thuTruoc };
  const catalogConflict = summarizeCatalogConflicts(data.catalogItems);
  // ADR-0038: hàng đợi Góp ý chỉ dành cho người có `feedback.triage` (hôm nay: Toàn quyền) — Quản trị không nhận dòng góp ý dù `data` có.
  const feedbackQueue = can(staff, "feedback.triage") ? summarizeFeedbackQueue(data.tickets) : null;
  // Cùng ô với ô "Giấy tờ sắp hết hạn" và route danh sách (vehicle.manage); `null` = chưa tải được / lỗi → không dòng (không vẽ số giả).
  const n = can(staff, "vehicle.manage") ? (data.expiringCount ?? 0) : 0;
  const expiringDocs = n > 0 ? { count: n } : null;
  if (!catalogConflict && !feedbackQueue && !expiringDocs && !doiChieu && !thuTruoc) return null;
  return { catalogConflict, feedbackQueue, expiringDocs, doiChieu, thuTruoc };
}
