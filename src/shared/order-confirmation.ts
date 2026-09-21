// Nội dung ẢNH XÁC NHẬN ĐƠN gửi khách (v1.0, đặc tả "Việc 2"): đơn + hồ sơ công ty → mô hình khối/dòng ĐÃ ĐỊNH DẠNG CHỮ. Thuần: không DOM, không canvas.
// CÁCH BỘ VẼ (web/confirmation-image.ts) ĐỌC: đi qua `blocks` theo thứ tự và `switch (block.kind)`. Mọi chuỗi đã sẵn sàng để vẽ (tiền "1.350.000 ₫", ngày
// "dd/mm/yyyy", giờ "HH:MM", số khách "2 người lớn, 1 trẻ em") và dòng rỗng đã bị bỏ lúc dựng — bộ vẽ chỉ đo chữ, ngắt dòng, vẽ; KHÔNG tự định dạng hay tự lọc.
// Chuỗi có thể chứa "\n" (ghi chú nhiều dòng): tách theo "\n" rồi mới ngắt theo chiều rộng. `SummaryRow.emphasis` chỉ nói "nổi bật" (Tổng cộng, Còn lại →
// bộ vẽ tô `--c-accent`); mô hình không mang màu. `title.status.code` để bộ vẽ chọn màu huy hiệu. Logo do bộ vẽ tự vẽ ở đầu khối "header".
// Bảng dịch vụ: bốn cột cố định description | quantity | unitPrice | lineTotal (tiêu đề ở `columns`; ba cột sau căn phải); `detail` là dòng phụ nhỏ dưới mô tả.
// CỐ Ý KHÔNG có trong mô hình (đặc tả "Nội dung"): ghi chú vận hành của dịch vụ, nhãn khác giá danh mục, mã danh mục, giá danh mục, id, đơn vị thô,
// ghi chú thanh toán, cách cọc, người lập (chỉ làm dự phòng cho "Nhân viên phụ trách"). Tiền lấy NGUYÊN từ đơn (máy chủ tính); chỉ "tổng dịch vụ" được cộng ở đây.
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
  /** Mã đơn, Ngày lập, Nhân viên phụ trách (dòng nào thiếu dữ liệu thì bỏ). */
  rows: LabelValue[];
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
  /** Tổng tiền của dịch vụ; null khi dịch vụ chỉ có MỘT dòng tiền (tổng sẽ lặp lại đúng thành tiền của dòng đó). */
  subtotal: string | null;
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

const COLUMNS: ServiceColumns = { description: "Mô tả", quantity: "SL", unitPrice: "Đơn giá", lineTotal: "Thành tiền" };

// ---- định dạng chữ ----------------------------------------------------------------------------------------------------

/** Chuẩn xuống dòng về "\n" và cắt khoảng trắng hai đầu; null/undefined → "". */
const clean = (s: string | null | undefined): string => (s ?? "").replace(/\r\n?/g, "\n").trim();

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
  // Người phụ trách (việc 3); chưa có thì người lập của đơn. Tên người lập KHÔNG bao giờ thành dòng riêng.
  const handler = clean(handlerName) !== "" ? handlerName : order.staffName;
  return {
    kind: "title",
    title: "XÁC NHẬN ĐƠN DỊCH VỤ",
    status: { code: order.status, text: CONFIRMATION_STATUS_TEXT[order.status] },
    rows: rowsOf([["Mã đơn", order.orderCode], ["Ngày lập", vnDate(order.createdAt)], ["Nhân viên phụ trách", handler]]),
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
    subtotal: s.items.length >= 2 ? money(s.items.reduce((sum, it) => sum + it.lineTotal, 0)) : null,
  };
}

function summaryBlock(order: OrderDetailDto): SummaryBlock {
  return {
    kind: "summary",
    rows: [
      { label: "Tạm tính", value: money(order.subtotal), emphasis: false },
      { label: "Giảm giá", value: money(order.discount > 0 ? -order.discount : order.discount), emphasis: false },
      { label: "Tổng cộng", value: money(order.total), emphasis: true },
      { label: "Đã cọc", value: money(order.depositAmount), emphasis: false },
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
 * null/trống → dùng tên người lập của đơn. Không sửa `order`/`company`; kết quả chỉ gồm chuỗi, số, mảng, đối tượng.
 */
export function buildConfirmation(order: OrderDetailDto, company: CompanyDto, handlerName: string | null): ConfirmationModel {
  return {
    orderCode: order.orderCode,
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
