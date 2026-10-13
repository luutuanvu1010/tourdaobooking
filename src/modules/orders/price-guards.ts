// Luật thuần vá DK-T3-01 (kiểm toán điểm khuất 24/9, HIGH — "Đối tác ngoài tự phát phiếu mang MST Tour Đảo với giá tự gõ hoặc giảm giá tuỳ ý"),
// theo câu trả lời của chủ dự án ngày 2026-09-26. Hai kiểm RIÊNG, route gọi SAU `validateOrder` (không đổi cách `validateService` phân tích dữ liệu):
//  R1 — Câu 1 (26/9): "loại bỏ hoàn toàn dịch vụ nhập tay khỏi giao diện, đây là quyết định cuối cùng. Sẽ mở lại khi cần thiết." ADR-0061 (accepted
//     2026-09-30) MỞ LẠI CÓ ĐIỀU KIỆN: R1 nay áp khi `duocNhapTay` SAI — công tắc nhập tay TẮT, người gọi không có ô `order.service.manual`, hoặc người gọi
//     CÓ quyền Đối tác (luôn luôn, kể cả tài khoản lai). Khi R1 áp: máy chủ không nhận dịch vụ nhập tay MỚI; dịch vụ nhập tay CŨ đã lưu của chính đơn bị
//     "đóng băng": tên + dòng tiền (mô tả, chi tiết, số lượng, đơn giá) phải giữ nguyên; thông tin chuyến và số khách vẫn sửa được (đơn một ngày cho cả
//     đơn — ADR-0021 — nên đổi ngày đơn đổi cả dịch vụ nhập tay: cho qua); bỏ dịch vụ nhập tay khỏi đơn nháp thì được. Dữ liệu cũ không bị xoá.
//     `duocNhapTay` đúng ⇒ bỏ qua R1 (thêm mới, sửa tên/giá dịch vụ nhập tay được). R2, R3 KHÔNG đổi (lớp chặn thứ hai cho Đối tác, cả ở xác nhận).
//  R2 (tài khoản có quyền Đối tác) — Câu 2: "dù đối tác có giảm giá bao nhiêu đi nữa thì đối tác vẫn phải trả một mức giá cố định cho công ty Tour đảo"
//     + ADR-0014 điều 3 ("ảnh xác nhận/hoá đơn luôn là giá bán lẻ"): mọi dòng tiền phải có giá danh mục và đơn giá = giá danh mục. Áp ở lập, sửa
//     VÀ xác nhận đơn (xác nhận không kiểm lại giá — đơn nháp cũ phải bị bắt ở đó).
//  R3 (tài khoản có quyền Đối tác) — chủ dự án chốt 2026-09-26: "Đối tác không tự đặt giá, giá luôn là giá công bố (giá bán lẻ), đối tác được quyền giảm
//     giá cho khách nhưng luôn phải trả một mức giá cố định (giá vốn) cho công ty Tour đảo … có thể đặt mức giảm tối đa là mức chiết khấu của công ty
//     Tour đảo dành cho đối tác." App CHƯA có bảng mức chiết khấu → chủ chọn "Tạm không cho giảm": trần giảm giá cấp đơn = 0 (`PARTNER_DISCOUNT_CAP`).
//     Áp ở lập, sửa VÀ xác nhận (xác nhận đọc giảm giá ĐÃ LƯU). Khi có bảng chiết khấu (việc sau): route tính trần từ bảng đó rồi truyền vào
//     `discountWithinCap` thay cho hằng 0, và đổi câu lỗi (câu hiện tại nói "chưa được thiết lập").
//  ADR-0100 (accepted 2026-10-03): R2 + R3 áp NGUYÊN cho tài khoản có quyền Thực tập (`INTERN`, kể cả kèm quyền nội bộ) với trần giảm giá riêng = 0, ở cùng ba cổng;
//     tài khoản nào bị áp do `chiGiaDanhMuc` (src/shared/permissions.ts, form lập đơn dùng chung), `giaDanhMucViolation` ở cuối tệp gộp R2 + R3 cho cả ba cổng. R1 KHÔNG đổi.
// Không I/O; test cạnh tệp (price-guards.test.ts).
import { can, chiGiaDanhMuc, holdsIntern, holdsPartner, type PermissionHolder } from "../../shared/permissions.ts";

/** Vì sao người gọi KHÔNG được nhập tay (ADR-0061): tài khoản có quyền Đối tác / công tắc đang TẮT / không có ô `order.service.manual`. */
export type LyDoKhongNhapTay = "doi_tac" | "tat" | "khong_o";

const LAM_TIEP = " — không thêm mới, không sửa tên hay giá. Muốn đổi, hãy xoá dịch vụ này rồi chọn dịch vụ từ danh mục.";
/** Câu lỗi R1 theo lý do (ADR-0061 "Mã": nói rõ "chưa bật / tài khoản không được nhập tay"). Máy chủ ghép "Dịch vụ N: " phía trước (`classifyOrderError`). */
export const NHAP_TAY_MESSAGE: Record<LyDoKhongNhapTay, string> = {
  tat: `dịch vụ nhập tay đang tắt${LAM_TIEP}`,
  khong_o: `tài khoản này không được dùng dịch vụ nhập tay${LAM_TIEP}`,
  doi_tac: `tài khoản có quyền Đối tác không dùng được dịch vụ nhập tay${LAM_TIEP}`,
};

/**
 * ADR-0061 điều 3 — MỘT hàm duy nhất quyết "được nhập tay". Thứ tự CỐ ĐỊNH: Đối tác TRƯỚC (`holdsPartner` — tài khoản lai SALES+PARTNER, PARTNER+FIELD,
 * ADMIN+PARTNER cũng bị chặn, dù ô của quyền kia = any; `can()` là HỢP các ô nên chỉ hỏi ô thì tài khoản lai lọt), rồi công tắc, rồi ô. null = được.
 * `chinhSachBat` do route đọc MỘT lần mỗi request (bảng `ord_manual_service_policy`; bảng rỗng = TẮT). Mọi đường ghi dịch vụ (hôm nay POST/PUT
 * /api/orders; route sửa sau xác nhận C2 tương lai) phải đi qua hàm này — bài tĩnh `src/nhap-tay-guard.test.ts`.
 */
export function lyDoKhongNhapTay(staff: PermissionHolder, chinhSachBat: boolean): LyDoKhongNhapTay | null {
  if (holdsPartner(staff)) return "doi_tac";
  if (!chinhSachBat) return "tat";
  if (!can(staff, "order.service.manual")) return "khong_o";
  return null;
}
/** ADR-0061 điều 3: `duocNhapTay = chinhSachBat && can(staff, "order.service.manual") && !holdsPartner(staff)` — đọc CÙNG hàm `lyDoKhongNhapTay`. */
export const duocNhapTay = (staff: PermissionHolder, chinhSachBat: boolean): boolean => lyDoKhongNhapTay(staff, chinhSachBat) === null;
export const RETAIL_PRICE_MESSAGE = "Tài khoản đối tác dùng đúng giá bán lẻ theo danh mục; muốn giá khác, nhờ văn phòng.";
export const PARTNER_DISCOUNT_MESSAGE =
  "Tài khoản đối tác chưa được giảm giá: mức giảm tối đa bằng mức chiết khấu Tour Đảo dành cho đối tác, mà mức này chưa được thiết lập. Muốn giảm cho khách, nhờ văn phòng.";

/**
 * R3: trần giảm giá cấp đơn (VNĐ) cho tài khoản có quyền Đối tác HÔM NAY. Chủ dự án 2026-09-26: mức giảm tối đa = mức chiết khấu Tour Đảo dành cho đối tác;
 * app chưa có bảng mức chiết khấu nên "Tạm không cho giảm" → 0. Đổi hằng này (hoặc thay bằng trần tính từ bảng chiết khấu) là quyết định của chủ dự án.
 */
export const PARTNER_DISCOUNT_CAP = 0;

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
 * R1 (chỉ gọi khi `lyDoKhongNhapTay` ≠ null): câu lỗi theo `lyDo` (có "Dịch vụ N: " để giao diện cuộn tới đúng thẻ — `classifyOrderError`) cho dịch vụ nhập tay ĐẦU TIÊN không phải "dịch vụ nhập tay đã
 * lưu của chính đơn này, giữ nguyên tên và dòng tiền"; null = đạt. Dịch vụ danh mục không bị xét. `id` phải trỏ tới dịch vụ đã lưu CÓ `catalogCode` null
 * (không mượn được id của dịch vụ danh mục — `validateService` tra id trên mọi dịch vụ đã lưu).
 */
export function manualFreezeViolation(services: readonly FrozenInput[], stored: readonly FrozenStored[], lyDo: LyDoKhongNhapTay = "tat"): string | null {
  for (const [i, s] of services.entries()) {
    if (s.kind !== "manual") continue;
    const st = s.id === null ? undefined : stored.find((x) => x.id === s.id);
    const kept =
      st !== undefined &&
      st.catalogCode === null &&
      sameText(st.name, s.name) &&
      st.lines.length === s.items.length &&
      st.lines.every((l, k) => sameLine(l, s.items[k]!));
    if (!kept) return `Dịch vụ ${i + 1}: ${NHAP_TAY_MESSAGE[lyDo]}`;
  }
  return null;
}

// `holdsPartner` (tài khoản CÓ quyền Đối tác — luật R2/R3 áp cho ai) nay ở `src/shared/permissions.ts` để form lập đơn (web) dùng CÙNG định nghĩa.
export { holdsPartner };

/** R2: mọi dòng tiền có giá danh mục và đơn giá = giá danh mục (dòng nhập tay — `catalogPrice` null — không đạt). */
export const retailPricesOnly = (items: readonly { catalogPrice: number | null; unitPrice: number }[]): boolean =>
  items.every((i) => i.catalogPrice !== null && i.unitPrice === i.catalogPrice);

/** R3: giảm giá cấp đơn không vượt trần `maxDiscount` (VNĐ). Trần là THAM SỐ để sau này truyền mức chiết khấu thật; hôm nay route truyền `PARTNER_DISCOUNT_CAP` (0). */
export const discountWithinCap = (discount: number, maxDiscount: number): boolean => discount <= maxDiscount;

// ---- ADR-0100: Thực tập theo luật giá R2/R3 của Đối tác — chỉ giá danh mục, không giảm giá --------------------------------------------------------
// Tài khoản nào bị áp do MỘT hàm thuần ở `src/shared/permissions.ts` (`chiGiaDanhMuc` = Đối tác HOẶC Thực tập — "có quyền … là áp", kể cả kèm quyền nội bộ khác);
// ở đây chỉ chọn trần giảm giá và câu báo theo quyền. R1 (nhập tay, `lyDoKhongNhapTay`) KHÔNG đổi: vẫn chỉ `holdsPartner`.
/** Câu báo khi tài khoản CHỈ có quyền Thực tập (không có quyền Đối tác) bị chặn giá hoặc giảm giá — ADR-0100 Đ3. Tài khoản vừa Đối tác vừa Thực tập dùng câu của Đối tác. */
export const INTERN_PRICE_MESSAGE = "Tài khoản Thực tập chỉ dùng giá danh mục, không giảm giá — nhờ nhân viên Bán hàng nếu cần giá khác.";
/** Trần giảm giá cấp đơn của quyền Thực tập: 0. KHÁC Đối tác — Thực tập không có bảng chiết khấu, trần này không đổi theo `PARTNER_DISCOUNT_CAP` (ADR-0100 Đ1). */
export const INTERN_DISCOUNT_CAP = 0;

/**
 * Trần giảm giá cấp đơn (VNĐ) của tài khoản bị áp luật giá: Đối tác → `tranDoiTac` (hôm nay `PARTNER_DISCOUNT_CAP` = 0; THAM SỐ để sau này truyền mức chiết
 * khấu thật), Thực tập → luôn `INTERN_DISCOUNT_CAP`, có cả hai → số nhỏ hơn (có quyền Thực tập thì không bao giờ được giảm hơn 0). Tài khoản không bị áp → `Infinity`.
 */
export function tranGiamGia(staff: PermissionHolder, tranDoiTac: number = PARTNER_DISCOUNT_CAP): number {
  const tran: number[] = [];
  if (holdsPartner(staff)) tran.push(tranDoiTac);
  if (holdsIntern(staff)) tran.push(INTERN_DISCOUNT_CAP);
  return tran.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...tran);
}

/**
 * R2 rồi R3 của luật giá, MỘT hàm cho cả ba cổng (lập đơn, sửa nháp, xác nhận): câu lỗi 403 cho tài khoản bị áp (`chiGiaDanhMuc`) mà đơn có dòng lệch giá danh mục
 * (kể cả dòng nhập tay — không có giá danh mục) hoặc giảm giá vượt trần; null = đạt, hoặc tài khoản không bị áp. Câu theo quyền: có quyền Đối tác → câu của Đối tác
 * (kể cả khi kèm Thực tập); chỉ Thực tập → `INTERN_PRICE_MESSAGE` cho cả lỗi giá lẫn giảm giá. Xác nhận truyền giá + giảm giá ĐÃ LƯU (bắt cả đơn nháp cũ).
 */
export function giaDanhMucViolation(staff: PermissionHolder, items: readonly { catalogPrice: number | null; unitPrice: number }[], discount: number, tranDoiTac: number = PARTNER_DISCOUNT_CAP): string | null {
  if (!chiGiaDanhMuc(staff)) return null;
  const chiThucTap = !holdsPartner(staff);
  if (!retailPricesOnly(items)) return chiThucTap ? INTERN_PRICE_MESSAGE : RETAIL_PRICE_MESSAGE;
  if (!discountWithinCap(discount, tranGiamGia(staff, tranDoiTac))) return chiThucTap ? INTERN_PRICE_MESSAGE : PARTNER_DISCOUNT_MESSAGE;
  return null;
}
