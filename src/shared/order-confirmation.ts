// Nội dung ẢNH XÁC NHẬN ĐƠN gửi khách (v1.0, đặc tả "Việc 2"): đơn + hồ sơ công ty → mô hình khối/dòng ĐÃ ĐỊNH DẠNG CHỮ. Thuần: không DOM, không canvas.
// CÁCH BỘ VẼ (web/confirmation-image.ts) ĐỌC: đi qua `blocks` theo thứ tự và `switch (block.kind)`. Mọi chuỗi đã sẵn sàng để vẽ (tiền "1.350.000 ₫", ngày
// "dd/mm/yyyy", giờ "HH:MM", số khách "2 người lớn, 1 trẻ em") và dòng rỗng đã bị bỏ lúc dựng — bộ vẽ chỉ đo chữ, ngắt dòng, vẽ; KHÔNG tự định dạng hay tự lọc.
// Chuỗi có thể chứa "\n" (ghi chú nhiều dòng): tách theo "\n" rồi mới ngắt theo chiều rộng. `SummaryRow.emphasis` chỉ nói "nổi bật" (Tổng cộng, Còn lại →
// bộ vẽ tô `--c-accent`); mô hình không mang màu. `title.status.code` để bộ vẽ chọn màu huy hiệu. Logo do bộ vẽ tự vẽ ở đầu khối "header".
// Bảng dịch vụ: bốn cột cố định description | quantity | unitPrice | lineTotal (tiêu đề ở `columns`; ba cột sau căn phải); `detail` là dòng phụ nhỏ dưới mô tả.
// `ServiceBlock.subtotal` (chỉ khi dịch vụ có ≥ 2 dòng tiền) mang cả NHÃN ("Cộng dịch vụ") lẫn giá trị: bộ vẽ vẽ MỌI dịch vụ có `subtotal` giống hệt nhau — nhãn
// căn phải ngay trái giá trị, giá trị thẳng cột "Thành tiền" — không tự đặt nhãn riêng, không tự cộng.
// CHUỖI ĐÃ LÀM SẠCH: mọi chuỗi trong mô hình (kể cả ô người dùng gõ tay: tên/ghi chú khách, tên dịch vụ nhập tay, mô tả/chi tiết dòng tiền, nơi đón/check-in, tên phụ trách,
// hồ sơ công ty) đã bỏ ký tự điều khiển, NUL, DEL, ký tự bidi (U+202A–202E, U+2066–2069), tab → dấu cách, dấu ngắt dòng lạ (VT, FF, NEL, U+2028, U+2029) → "\n", và gộp dấu
// gõ rời về dạng dựng sẵn (NFC). Bộ vẽ có thể đưa thẳng vào canvas; nó chỉ cần tách theo "\n".
// Đơn nháp CHƯA có ngày khởi hành thì dịch vụ đó KHÔNG có dòng "Khởi hành" (ảnh gửi khách không mang cảnh báo nội bộ "Chưa có ngày khởi hành" của trang đơn).
// CỐ Ý KHÔNG có trong mô hình (đặc tả "Nội dung"): ghi chú vận hành của dịch vụ, nhãn khác giá danh mục, mã danh mục, giá danh mục, id, đơn vị thô, ghi chú thanh toán, cách cọc.
// Tiền lấy NGUYÊN từ đơn (máy chủ tính); chỉ "tổng dịch vụ" được cộng ở đây.
// NGƯỜI LẬP ĐƠN (`order.staffName`) KHÔNG BAO GIỜ được in trong vai "Nhân viên phụ trách" (quyết định chủ dự án 2026-09-28, sửa lỗi hiển thị sai sự thật khi đơn do
// Đối tác/HDV lập chưa có ai phụ trách): đơn CHƯA có người phụ trách (`handlerName === null`, kể cả khi máy chủ chưa xác nhận rõ vẫn coi như vậy — xem `titleBlock`)
// thì KHÔNG có dòng "Nhân viên phụ trách", thay bằng `TitleBlock.note` = `PENDING_HANDLER_TEXT`. Trường hợp KHÔNG BIẾT (404/5xx/mất mạng/hết giờ) không đi tới đây:
// hộp thoại (`web/confirmation-dialog.ts`) chặn lại trước, không tạo ảnh, không đoán.
import type { CompanyDto, OrderDetailDto, OrderServiceDto, OrderStatus } from "./contracts.ts";
import { PAX_LABEL, PAX_ORDER, parseUnit, paxTotal, type PaxCounts } from "./order-lines.ts";
import { formatDmy } from "./trip-form.ts";
import { vnToday } from "./vn-date.ts";

export interface LabelValue { label: string; value: string }

export interface HeaderBlock {
  kind: "header";
  companyName: string;
  /** Mỗi phần tử một dòng logic (MST; địa chỉ; hotline · email); dòng dài do bộ vẽ tự ngắt. */
  lines: string[];
}
export interface TitleBlock {
  kind: "title";
  title: string;
  status: { code: OrderStatus; text: string };
  /** Mã đơn, Ngày lập, Nhân viên phụ trách (dòng nào thiếu dữ liệu thì bỏ; KHÔNG có dòng "Nhân viên phụ trách" khi đơn chưa có người — xem `note`). */
  rows: LabelValue[];
  /** Câu chờ nhận (`PENDING_HANDLER_TEXT`) khi đơn CHƯA có người phụ trách; `null` khi đã có (dòng "Nhân viên phụ trách" ở `rows` đủ). */
  note: string | null;
}
export interface CustomerBlock { kind: "customer"; heading: string; rows: LabelValue[] }

export interface ServiceLine {
  description: string;
  /** Dòng phụ dưới mô tả (vd "Trẻ 5–10 tuổi"); null = không có. */
  detail: string | null;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}
export interface ServiceColumns { description: string; quantity: string; unitPrice: string; lineTotal: string }
export interface ServiceBlock {
  kind: "service";
  /** Số thứ tự dịch vụ trong đơn, từ 1. */
  index: number;
  name: string;
  /** Số khách, Khởi hành, Đón khách, Check-in — chỉ dòng có nội dung. */
  details: LabelValue[];
  columns: ServiceColumns;
  lines: ServiceLine[];
  /** Tổng tiền của dịch vụ kèm nhãn ("Cộng dịch vụ"); null khi dịch vụ chỉ có MỘT dòng tiền (tổng sẽ lặp lại đúng thành tiền của dòng đó). */
  subtotal: { label: string; value: string } | null;
}
export interface SummaryRow { label: string; value: string; emphasis: boolean }
export interface SummaryBlock { kind: "summary"; rows: SummaryRow[] }
export interface FooterBlock { kind: "footer"; lines: string[] }

export type ConfirmationBlock = HeaderBlock | TitleBlock | CustomerBlock | ServiceBlock | SummaryBlock | FooterBlock;

export interface ConfirmationModel {
  orderCode: string;
  /** "xac-nhan-<mã đơn>.png" (ký tự ngoài chữ/số/gạch được thay bằng gạch) — tên tệp cho nút "Tải ảnh PNG". */
  fileName: string;
  blocks: ConfirmationBlock[];
}

/** Chữ hiện cho khách theo trạng thái đơn (đặc tả: nháp = "Chờ xác nhận" vì ảnh xuất được ngay sau khi tạo đơn). */
export const CONFIRMATION_STATUS_TEXT: Record<OrderStatus, string> = { draft: "Chờ xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã huỷ" };

/** Đơn CHƯA có người phụ trách (quyết định chủ dự án 2026-09-28): một sự thật duy nhất, không đoán tên. Thay cho dòng "Nhân viên phụ trách" ở `TitleBlock.note`. */
export const PENDING_HANDLER_TEXT = "Đơn khởi tạo thành công và đang chờ hướng dẫn viên nhận khách";

const COLUMNS: ServiceColumns = { description: "Mô tả", quantity: "SL", unitPrice: "Đơn giá", lineTotal: "Thành tiền" };
const SUBTOTAL_LABEL = "Cộng dịch vụ";

// ---- định dạng chữ ----------------------------------------------------------------------------------------------------

/**
 * Một ký tự của chuỗi người dùng → ký tự được phép in ("" = bỏ). Viết bằng MÃ SỐ, không chép ký tự ẩn vào mã nguồn.
 * Giữ "\n"; tab → dấu cách; VT (0x0B), FF (0x0C), NEL (0x85), U+2028, U+2029 là dấu ngắt dòng của trình soạn văn bản/Word → "\n" (khỏi dính hai dòng làm một);
 * bỏ NUL và ký tự điều khiển còn lại (C0 0x00–0x1F, DEL 0x7F, C1 0x80–0x9F) và ký tự bidi (U+202A–202E, U+2066–2069) vì chúng đảo chiều chữ ngay trong ảnh.
 */
function printable(ch: string): string {
  const c = ch.codePointAt(0) ?? 0;
  if (c === 0x0a) return "\n";
  if (c === 0x09) return " ";
  if (c === 0x0b || c === 0x0c || c === 0x85 || c === 0x2028 || c === 0x2029) return "\n";
  if (c <= 0x1f || (c >= 0x7f && c <= 0x9f)) return "";
  if ((c >= 0x202a && c <= 0x202e) || (c >= 0x2066 && c <= 0x2069)) return "";
  return ch;
}

/** Chuẩn xuống dòng về "\n", bỏ ký tự điều khiển/bidi, gộp dấu gõ rời về NFC, cắt khoảng trắng hai đầu; null/undefined → "". */
const clean = (s: string | null | undefined): string =>
  [...(s ?? "").replace(/\r\n?/g, "\n")].map(printable).join("").normalize("NFC").trim();

/** 1350000 → "1.350.000 ₫" (cách định dạng tiền của máy chủ, catalog/rules.ts). Số âm giữ dấu "-". */
const money = (n: number): string => `${n.toLocaleString("vi-VN")} ₫`;

/** Ghép các mảnh có nội dung bằng " · " (như trang đơn); không mảnh nào → "". */
const joinDot = (parts: readonly (string | null | undefined)[]): string => parts.map(clean).filter((p) => p !== "").join(" · ");

/** "Nhãn: giá trị" hoặc null khi giá trị trống. */
const labelled = (label: string, v: string | null | undefined): string | null => (clean(v) === "" ? null : `${label}: ${clean(v)}`);

/** Giữ dòng có giá trị (sau khi làm sạch), bỏ dòng rỗng. */
function rowsOf(pairs: readonly (readonly [string, string | null | undefined])[]): LabelValue[] {
  const out: LabelValue[] = [];
  for (const [label, raw] of pairs) {
    const value = clean(raw);
    if (value !== "") out.push({ label, value });
  }
  return out;
}

/** Ngày lập theo giờ Việt Nam ("dd/mm/yyyy") từ dấu thời gian ISO UTC; dữ liệu hỏng → null. */
function vnDate(iso: string): string | null {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? null : formatDmy(vnToday(t));
}

/** Số khách: theo người liệt kê từng loại CÓ khách ("2 người lớn, 1 trẻ em"); theo nhóm và nhập tay chỉ "N khách"; không khách → null (ẩn dòng). */
function guestText(pax: PaxCounts, unit: string): string | null {
  const total = paxTotal(pax);
  if (total === 0) return null;
  if (unit === "manual" || parseUnit(unit).kind === "group") return `${total} khách`;
  return PAX_ORDER.filter((c) => pax[c] > 0).map((c) => `${pax[c]} ${PAX_LABEL[c].toLowerCase()}`).join(", ");
}

/** Ngày + giờ khởi hành: "25/09/2026 · 07:30"; thiếu mảnh nào bỏ mảnh đó. */
function departureText(s: OrderServiceDto): string {
  return joinDot([s.departDate === null ? null : formatDmy(s.departDate), s.departTime]);
}

/** Check-in: chỉ khi có ít nhất một trong ngày/giờ/nơi; không ngày = "Cùng ngày khởi hành" (giống trang đơn). */
function checkinText(s: OrderServiceDto): string {
  if (clean(s.checkinDate) === "" && clean(s.checkinTime) === "" && clean(s.checkinPlace) === "") return "";
  return joinDot([clean(s.checkinDate) === "" ? "Cùng ngày khởi hành" : formatDmy(clean(s.checkinDate)), s.checkinTime, s.checkinPlace]);
}

// ---- dựng khối ----------------------------------------------------------------------------------------------------------

function headerBlock(company: CompanyDto): HeaderBlock {
  const contact = joinDot([labelled("Hotline", company.hotline), labelled("Email", company.email)]);
  return {
    kind: "header",
    companyName: clean(company.name),
    lines: [labelled("MST", company.taxCode) ?? "", clean(company.address), contact].filter((l) => l !== ""),
  };
}

function titleBlock(order: OrderDetailDto, handlerName: string | null): TitleBlock {
  // Người phụ trách (việc 3): CHẮC CHẮN chưa có (handlerName trống sau khi làm sạch) → không dòng "Nhân viên phụ trách", thay bằng câu chờ nhận (note).
  // Tên người lập (`order.staffName`) KHÔNG BAO GIỜ đứng vào vai này (quyết định chủ dự án 2026-09-28) — xem đầu tệp.
  const noHandler = clean(handlerName) === "";
  return {
    kind: "title",
    title: "XÁC NHẬN ĐƠN DỊCH VỤ",
    status: { code: order.status, text: CONFIRMATION_STATUS_TEXT[order.status] },
    rows: rowsOf([["Mã đơn", order.orderCode], ["Ngày lập", vnDate(order.createdAt)], ["Nhân viên phụ trách", handlerName]]),
    note: noHandler ? PENDING_HANDLER_TEXT : null,
  };
}

function customerBlock(order: OrderDetailDto): CustomerBlock {
  return {
    kind: "customer",
    heading: "Thông tin khách hàng",
    rows: rowsOf([["Họ tên", order.customerName], ["Số điện thoại", order.customerPhone], ["Email", order.customerEmail], ["Ghi chú / yêu cầu", order.customerNote]]),
  };
}

function serviceBlock(s: OrderServiceDto, index: number): ServiceBlock {
  return {
    kind: "service",
    index,
    name: clean(s.name),
    // KHÔNG dùng `s.note` (ghi chú vận hành nội bộ), `s.catalogCode`, `s.unit`, `s.catalogStatus`, `s.id`.
    details: rowsOf([["Số khách", guestText(s.pax, s.unit)], ["Khởi hành", departureText(s)], ["Đón khách", joinDot([s.pickupTime, s.pickupPlace])], ["Check-in", checkinText(s)]]),
    columns: { ...COLUMNS },
    lines: s.items.map((it) => ({
      description: clean(it.description),
      detail: clean(it.detail) === "" ? null : clean(it.detail),
      quantity: String(it.quantity),
      unitPrice: money(it.unitPrice),
      lineTotal: money(it.lineTotal),
    })),
    subtotal: s.items.length >= 2 ? { label: SUBTOTAL_LABEL, value: money(s.items.reduce((sum, it) => sum + it.lineTotal, 0)) } : null,
  };
}

function summaryBlock(order: OrderDetailDto): SummaryBlock {
  return {
    kind: "summary",
    rows: [
      { label: "Tạm tính", value: money(order.subtotal), emphasis: false },
      { label: "Giảm giá", value: money(order.discount > 0 ? -order.discount : order.discount), emphasis: false },
      { label: "Tổng cộng", value: money(order.total), emphasis: true },
      { label: "Thanh toán trước", value: money(order.depositAmount), emphasis: false },
      { label: "Còn lại", value: money(order.remainingAmount), emphasis: true },
    ],
  };
}

function footerBlock(company: CompanyDto): FooterBlock {
  // CompanyDto cố ý không có số Zalo (đặc tả việc 1): chân trang chỉ nêu hotline.
  const contact = clean(company.hotline) === "" ? "" : `Cần hỗ trợ, quý khách vui lòng liên hệ hotline ${clean(company.hotline)}.`;
  return { kind: "footer", lines: ["Cảm ơn quý khách đã tin tưởng và lựa chọn dịch vụ của chúng tôi.", contact].filter((l) => l !== "") };
}

/** "xac-nhan-<mã đơn>.png"; ký tự ngoài chữ/số/gạch → gạch (gộp, bỏ ở hai đầu); mã trống → "xac-nhan.png". */
function fileNameOf(orderCode: string): string {
  const safe = orderCode.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe === "" ? "xac-nhan.png" : `xac-nhan-${safe}.png`;
}

/**
 * Đơn + hồ sơ công ty + tên người phụ trách → mô hình nội dung ảnh xác nhận. `handlerName` = người phụ trách đang mở của đơn (việc 3);
 * `null`/trống = CHẮC CHẮN chưa có người phụ trách → dòng "Nhân viên phụ trách" biến mất, thay bằng câu chờ nhận (`PENDING_HANDLER_TEXT`) ở
 * `TitleBlock.note`. KHÔNG có tham số/giá trị nào cho trạng thái "chưa biết" — người gọi (`web/confirmation-dialog.ts`) phải tự chặn ảnh lại
 * trước khi tới đây nếu chưa biết. Không sửa `order`/`company`; kết quả chỉ gồm chuỗi, số, mảng, đối tượng.
 */
export function buildConfirmation(order: OrderDetailDto, company: CompanyDto, handlerName: string | null): ConfirmationModel {
  return {
    orderCode: clean(order.orderCode),
    fileName: fileNameOf(order.orderCode),
    blocks: [
      headerBlock(company),
      titleBlock(order, handlerName),
      customerBlock(order),
      ...order.services.map((s, i) => serviceBlock(s, i + 1)),
      summaryBlock(order),
      footerBlock(company),
    ],
  };
}
