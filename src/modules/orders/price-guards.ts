// Luật thuần vá DK-T3-01 (kiểm toán điểm khuất 24/9, HIGH — "Đối tác ngoài tự phát phiếu mang MST Tour Đảo với giá tự gõ hoặc giảm giá tuỳ ý"),
// theo câu trả lời của chủ dự án ngày 2026-09-26. Hai kiểm RIÊNG, route gọi SAU `validateOrder` (không đổi cách `validateService` phân tích dữ liệu):
//  R1 (mọi tài khoản) — Câu 1: "loại bỏ hoàn toàn dịch vụ nhập tay khỏi giao diện, đây là quyết định cuối cùng. Sẽ mở lại khi cần thiết."
//     Máy chủ không nhận dịch vụ nhập tay MỚI; dịch vụ nhập tay CŨ đã lưu của chính đơn bị "đóng băng": tên + dòng tiền (mô tả, chi tiết, số lượng,
//     đơn giá) phải giữ nguyên; thông tin chuyến và số khách vẫn sửa được (đơn một ngày cho cả đơn — ADR-0021 — nên đổi ngày đơn đổi cả dịch vụ nhập
//     tay: cho qua); bỏ dịch vụ nhập tay khỏi đơn nháp thì được. Dữ liệu cũ không bị xoá.
//  R2 (tài khoản CHỈ Đối tác) — Câu 2: "dù đối tác có giảm giá bao nhiêu đi nữa thì đối tác vẫn phải trả một mức giá cố định cho công ty Tour đảo"
//     + ADR-0014 điều 3 ("ảnh xác nhận/hoá đơn luôn là giá bán lẻ"): mọi dòng tiền phải có giá danh mục và đơn giá = giá danh mục. Giảm giá cấp
//     đơn KHÔNG chặn. Áp ở lập, sửa VÀ xác nhận đơn (xác nhận không kiểm lại giá — đơn nháp cũ phải bị bắt ở đó).
// Không I/O; test cạnh tệp (price-guards.test.ts).
import type { PermissionCode } from "../../shared/permissions.ts";

export const MANUAL_FROZEN_MESSAGE = "dịch vụ nhập tay đã ngừng — không thêm mới, không sửa tên hay giá. Muốn đổi, hãy xoá dịch vụ này rồi chọn dịch vụ từ danh mục.";
export const RETAIL_PRICE_MESSAGE = "Tài khoản đối tác dùng đúng giá bán lẻ theo danh mục; muốn giá khác, nhờ văn phòng.";

/** Dòng tiền có nội dung so được "giữ nguyên" của dịch vụ nhập tay. */
export interface FrozenLine {
  description: string;
  detail: string | null;
  quantity: number;
  unitPrice: number;
}
/** Dịch vụ ĐÃ LƯU của đơn đang sửa (từ `getStoredServices`): `catalogCode` null = nhập tay; `lines` theo đúng thứ tự dòng đã lưu. */
export interface FrozenStored {
  id: string;
  catalogCode: string | null;
  name: string;
  lines: readonly FrozenLine[];
}
/** Dịch vụ đầu vào ĐÃ KIỂM DẠNG (`ValidService` của `validateOrder`): `id` = id dịch vụ đã lưu mà đầu vào trỏ tới, null = mới. */
export interface FrozenInput {
  id: string | null;
  kind: "catalog" | "manual";
  name: string;
  items: readonly FrozenLine[];
}

/** Chữ so "giữ nguyên": bỏ khoảng trắng hai đầu; null và "" là một (dòng cũ có thể lưu chi tiết rỗng, form gửi "" cho chi tiết trống). */
const sameText = (a: string | null, b: string | null): boolean => (a ?? "").trim() === (b ?? "").trim();
const sameLine = (a: FrozenLine, b: FrozenLine): boolean =>
  sameText(a.description, b.description) && sameText(a.detail, b.detail) && a.quantity === b.quantity && a.unitPrice === b.unitPrice;

/**
 * R1: câu lỗi (có "Dịch vụ N: " để giao diện cuộn tới đúng thẻ — `classifyOrderError`) cho dịch vụ nhập tay ĐẦU TIÊN không phải "dịch vụ nhập tay đã
 * lưu của chính đơn này, giữ nguyên tên và dòng tiền"; null = đạt. Dịch vụ danh mục không bị xét. `id` phải trỏ tới dịch vụ đã lưu CÓ `catalogCode` null
 * (không mượn được id của dịch vụ danh mục — `validateService` tra id trên mọi dịch vụ đã lưu).
 */
export function manualFreezeViolation(services: readonly FrozenInput[], stored: readonly FrozenStored[]): string | null {
  for (const [i, s] of services.entries()) {
    if (s.kind !== "manual") continue;
    const st = s.id === null ? undefined : stored.find((x) => x.id === s.id);
    const kept =
      st !== undefined &&
      st.catalogCode === null &&
      sameText(st.name, s.name) &&
      st.lines.length === s.items.length &&
      st.lines.every((l, k) => sameLine(l, s.items[k]!));
    if (!kept) return `Dịch vụ ${i + 1}: ${MANUAL_FROZEN_MESSAGE}`;
  }
  return null;
}

/**
 * Tài khoản CHỈ Đối tác: có ít nhất một quyền và MỌI quyền đều là `PARTNER` (định nghĩa của điều phối viên khi giao việc 2026-09-26). Chỉ xét MÃ QUYỀN,
 * không xét vai hồ sơ (vai hồ sơ không bao giờ là điều kiện — `src/CLAUDE.md`). Tài khoản PARTNER kèm quyền khác (nội bộ) KHÔNG thuộc luật R2.
 */
export const isPartnerOnly = (who: { readonly permissions: readonly PermissionCode[] }): boolean =>
  who.permissions.length > 0 && who.permissions.every((p) => p === "PARTNER");

/** R2: mọi dòng tiền có giá danh mục và đơn giá = giá danh mục (dòng nhập tay — `catalogPrice` null — không đạt). */
export const retailPricesOnly = (items: readonly { catalogPrice: number | null; unitPrice: number }[]): boolean =>
  items.every((i) => i.catalogPrice !== null && i.unitPrice === i.catalogPrice);
