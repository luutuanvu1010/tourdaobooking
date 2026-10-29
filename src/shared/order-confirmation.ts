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
// Tiền lấy NGUYÊN từ biên nhận máy chủ dựng (ReceiptDto — danh sách trắng, sổ tiền lượt 1); chỉ "tổng dịch vụ" được cộng ở đây.
// NGƯỜI LẬP ĐƠN (`order.staffName`) KHÔNG BAO GIỜ được in trong vai "Nhân viên phụ trách" (quyết định chủ dự án 2026-09-28, sửa lỗi hiển thị sai sự thật khi đơn do
// Đối tác/HDV lập chưa có ai phụ trách — cùng gốc với ADR-0020 điều 9/ADR-0030 S20-4: đơn mới không tự gắn người lập làm người phụ trách): đơn CHƯA có
// người phụ trách (`handlerName` null hoặc rỗng sau khi làm sạch — xem `titleBlock`) thì KHÔNG có dòng "Nhân viên phụ trách", thay bằng `TitleBlock.note`
// = `PENDING_HANDLER_TEXT`. Trường hợp KHÔNG BIẾT (404/5xx/mất mạng/hết giờ/dữ liệu hỏng) KHÔNG đi tới đây: hộp thoại (`web/confirmation-dialog.ts`) chặn
// lại trước, không tạo ảnh, không đoán — hàm này không có tham số nào biểu diễn "chưa biết".
import type { CompanyDto, ReceiptDto, ReceiptServiceDto } from "./contracts.ts";
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
  /** `code` chỉ để bộ vẽ chọn màu huy hiệu (không in ra); `text` = nhãn tiếng Việt do máy chủ gửi (`ReceiptDto.status.nhan`). */
  status: { code: ReceiptDto["status"]["khoa"]; text: string };
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
  /** Số khách, Khởi hành, Xe đón khách, Khách có mặt — chỉ dòng có nội dung. */
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


/** Đơn CHƯA có người phụ trách (quyết định chủ dự án 2026-09-28): một sự thật duy nhất, không đoán tên. Thay cho dòng "Nhân viên phụ trách" ở `TitleBlock.note`. */
export const PENDING_HANDLER_TEXT = "Đơn khởi tạo thành công và đang chờ hướng dẫn viên nhận khách";
/**
 * Người xem KHÔNG được biết người phụ trách (Đối tác/Thực tập: `GET /api/dispatch/handlers` trả 403 theo ADR-0019 — có chủ đích). Khác "chưa biết"
 * (lỗi mạng → dừng, không tạo ảnh) và khác "chưa có ai" (câu chờ nhận): ảnh vẫn tạo, bỏ hẳn phần người phụ trách — không tên, không câu chờ —
 * vì người xem không có sự thật nào để in (một sự thật duy nhất, chủ dự án 2026-09-28).
 */
export const HANDLER_HIDDEN: unique symbol = Symbol("handler-hidden");
export type HandlerInput = string | null | typeof HANDLER_HIDDEN;

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
function departureText(s: ReceiptServiceDto): string {
  return joinDot([s.departDate === null ? null : formatDmy(s.departDate), s.departTime]);
}

/** Khách có mặt (cột `checkin_*`): chỉ khi có ít nhất một trong ngày/giờ/nơi; không ngày = "Cùng ngày khởi hành" (giống trang đơn). */
function checkinText(s: ReceiptServiceDto): string {
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

function titleBlock(order: ReceiptDto, handler: HandlerInput): TitleBlock {
  // Người phụ trách (việc 3): CHẮC CHẮN chưa có (handlerName trống sau khi làm sạch) → không dòng "Nhân viên phụ trách", thay bằng câu chờ nhận (note).
  // Tên người lập (`order.staffName`) KHÔNG BAO GIỜ đứng vào vai này (quyết định chủ dự án 2026-09-28) — xem đầu tệp.
  const hidden = handler === HANDLER_HIDDEN;
  const handlerName = hidden ? null : handler;
  const noHandler = !hidden && clean(handlerName) === "";
  return {
    kind: "title",
    // ADR-0089 đ9a: đơn huỷ dùng mẫu "thông báo huỷ".
    title: order.status.khoa === "cancelled" ? "THÔNG BÁO HUỶ ĐƠN DỊCH VỤ" : "XÁC NHẬN ĐƠN DỊCH VỤ",
    status: { code: order.status.khoa, text: clean(order.status.nhan) },
    rows: rowsOf([["Mã đơn", order.orderCode], ["Ngày lập", vnDate(order.createdAt)], ["Nhân viên phụ trách", handlerName]]),
    note: noHandler ? PENDING_HANDLER_TEXT : null,
  };
}

function customerBlock(order: ReceiptDto): CustomerBlock {
  return {
    kind: "customer",
    heading: "Thông tin khách hàng",
    rows: rowsOf([["Họ tên", order.customerName], ["Số điện thoại", order.customerPhone], ["Email", order.customerEmail], ["Ghi chú / yêu cầu", order.customerNote]]),
  };
}

function serviceBlock(s: ReceiptServiceDto, index: number): ServiceBlock {
  return {
    kind: "service",
    index,
    name: clean(s.name),
    // `ReceiptServiceDto` KHÔNG có ghi chú vận hành, mã/giá danh mục, id (danh sách trắng của máy chủ — ADR-0026 đ11).
    details: rowsOf([["Số khách", guestText(s.pax, s.unit)], ["Khởi hành", departureText(s)], ["Xe đón khách", joinDot([s.pickupTime, s.pickupPlace])], ["Khách có mặt", checkinText(s)]]),
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

function summaryBlock(order: ReceiptDto): SummaryBlock {
  const dau = [
    { label: "Tạm tính", value: money(order.subtotal), emphasis: false },
    { label: "Giảm giá", value: money(order.discount > 0 ? -order.discount : order.discount), emphasis: false },
    { label: "Tổng cộng", value: money(order.total), emphasis: true },
  ];
  const h = order.huy;
  if (order.status.khoa === "cancelled" && h) {
    // ADR-0089 đ9a: thông báo huỷ KHÔNG có dòng "Còn lại" (khách không còn nợ); số của billing (`soTienCoc`), máy chủ đặt vào ReceiptDto.
    const rows = [...dau, { label: "Khách hàng đã trả trước", value: money(h.daTra), emphasis: true }];
    // Chủ 28/10 (SV-DH-13 «ghi đủ các dòng»): phần dư đã trả lại TRƯỚC khi huỷ — thiếu dòng này thì đã trả và số hoàn không khớp nhau trên giấy.
    if (h.hoanTruocHuy > 0) rows.push({ label: "Đã trả lại khách trước khi huỷ", value: money(h.hoanTruocHuy), emphasis: false });
    if (h.dangDoiChieu > 0) rows.push({ label: "Đang đối chiếu", value: money(h.dangDoiChieu), emphasis: false });
    // Kiểm độc lập vòng 2: khoản duyệt CHUYỂN chưa thực hiện không phải "hoàn" — tách riêng dòng "chờ chuyển".
    const hoanDuyet = h.daDuyet - h.daDuyetChuyen;
    if (hoanDuyet - h.daChi > 0) {
      rows.push({ label: h.nhom === "KHACH_HUY" ? `Tour Đảo hoàn (chậm nhất ngày ${formatDmy(h.han)})` : "Tour Đảo hoàn", value: money(hoanDuyet - h.daChi), emphasis: false });
    }
    if (h.daChi > 0) rows.push({ label: "Đã hoàn trả", value: money(h.daChi), emphasis: false }); // chữ của chủ 28/10 (SV-DH-04)
    if (h.daDuyetChuyen - h.daChuyen > 0) rows.push({ label: "Sẽ chuyển sang đơn mới", value: money(h.daDuyetChuyen - h.daChuyen), emphasis: false });
    if (h.daChuyen > 0) rows.push({ label: "Đã chuyển sang đơn mới", value: money(h.daChuyen), emphasis: false });
    return { kind: "summary", rows };
  }
  // ADR-0089 đ3: tiền khách trả trước là nghĩa vụ của công ty — "Khách hàng đã trả trước"; sau "Đã giao" là "Đã thu". Số của billing (một hàm `conLai`).
  const daGiao = order.status.khoa === "delivered" || order.status.khoa === "completed";
  return {
    kind: "summary",
    rows: [...dau, { label: daGiao ? "Đã thu" : "Khách hàng đã trả trước", value: money(order.daTra), emphasis: false }, { label: "Còn lại", value: money(order.conLai), emphasis: true }, ...dongPhan(order)],
  };
}

/**
 * Sổ đại lý đợt 2, Task 12 (ADR-0078 điều 10; đặc tả P5): đơn có HAI người bán trở lên ⇒ sau tổng của cả đơn, in từng phần (người bán, tổng phần, đã trả nếu có,
 * còn lại — phần nhà cung cấp ghi «Trả tại quầy <người bán>»). Một người bán ⇒ không thêm dòng. Số do máy chủ chia (`chiaPhanBienNhan`), không tính lại ở đây.
 */
function dongPhan(order: ReceiptDto): { label: string; value: string; emphasis: boolean }[] {
  if (order.phan.length < 2) return [];
  return order.phan.flatMap((p, i) => {
    const ten = clean(p.nguoiBan);
    const rows = [{ label: `Phần ${i + 1} · ${ten}`, value: money(p.tong), emphasis: false }];
    if (p.daTra > 0) rows.push({ label: "Đã trả", value: money(p.daTra), emphasis: false });
    rows.push({ label: p.traTaiQuay && p.conLai > 0 ? `Trả tại quầy ${ten}` : "Còn lại", value: money(p.conLai), emphasis: false }); // đã trả đủ ⇒ «Còn lại 0 ₫», không «Trả tại quầy … 0 ₫»
    return rows;
  });
}

/** Câu chân trang cho phần nhà cung cấp bán (Tour Đảo là đối tác đặt vé — ADR-0078 điều 10). */
function cauVaiPhan(order: ReceiptDto): string[] {
  if (order.phan.length < 2) return [];
  return order.phan.flatMap((p, i) => (p.vaiTourDao === "doi_tac_dat_ve" ? [`Phần ${i + 1} do ${clean(p.nguoiBan)} bán; Tour Đảo là đối tác đặt vé.`] : []));
}

/** ADR-0089 đ10 (chủ chốt chữ — bản nháp theo ví dụ của ADR, Q5): một dòng điều khoản huỷ IN LUÔN đường dẫn (Đ-5). */
export const DIEU_KHOAN_HUY = "Khi khách huỷ, tiền cọc không được hoàn lại. Xem đầy đủ: tourdao.vn/chinh-sach-thanh-toan";
/** ADR-0089 đ9a: câu chính sách trên thông báo huỷ — khách huỷ (chưa duyệt hoàn) / chưa kết luận (câu trung tính, không in "không hoàn"). */
function cauHuy(order: ReceiptDto): string | null {
  const h = order.huy;
  if (order.status.khoa !== "cancelled" || !h) return null;
  if (h.nhom === "KHACH_HUY" && h.daDuyet === 0) return "Theo chính sách của Tour Đảo, tiền cọc không được hoàn lại khi khách huỷ.";
  if (h.nhom === "CHUA_KET_LUAN") return "Tour Đảo sẽ liên hệ quý khách về khoản đã trả trước.";
  return null;
}

function footerBlock(company: CompanyDto, order: ReceiptDto): FooterBlock {
  // CompanyDto cố ý không có số Zalo (đặc tả việc 1): chân trang chỉ nêu hotline.
  const contact = clean(company.hotline) === "" ? "" : `Cần hỗ trợ, quý khách vui lòng liên hệ hotline ${clean(company.hotline)}.`;
  // ADR-0089: thông báo huỷ in câu chính sách (đ9a); ảnh xác nhận (đơn không huỷ) in điều khoản huỷ kèm đường dẫn (đ10).
  const dau = order.status.khoa === "cancelled" ? cauHuy(order) : DIEU_KHOAN_HUY;
  return { kind: "footer", lines: [dau ?? "", ...cauVaiPhan(order), "Cảm ơn quý khách đã tin tưởng và lựa chọn dịch vụ của chúng tôi.", contact].filter((l) => l !== "") };
}

/** "xac-nhan-<mã đơn>.png"; ký tự ngoài chữ/số/gạch → gạch (gộp, bỏ ở hai đầu); mã trống → "xac-nhan.png". */
function fileNameOf(orderCode: string): string {
  const safe = orderCode.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe === "" ? "xac-nhan.png" : `xac-nhan-${safe}.png`;
}

/**
 * BIÊN NHẬN (`ReceiptDto`, máy chủ dựng theo danh sách trắng — `GET /api/orders/:id/receipt`, module receipt, ADR-0024 đ1 / ADR-0026 đ11) + tên người
 * phụ trách → mô hình nội dung ảnh xác nhận. Không còn nhận cả đơn (`OrderDetailDto`) từ trình duyệt. `handlerName` = người phụ trách đang mở của đơn (việc 3);
 * `null`/trống = CHẮC CHẮN chưa có người phụ trách → dòng "Nhân viên phụ trách" biến mất, thay bằng câu chờ nhận (`PENDING_HANDLER_TEXT`) ở
 * `TitleBlock.note`; `HANDLER_HIDDEN` = người xem không được biết → không dòng, không câu chờ. KHÔNG có tham số/giá trị nào cho trạng thái "chưa biết" — người gọi (`web/confirmation-dialog.ts`) phải tự chặn ảnh lại
 * trước khi tới đây nếu chưa biết. Không sửa `order`/`company`; kết quả chỉ gồm chuỗi, số, mảng, đối tượng.
 */
export function buildConfirmation(receipt: ReceiptDto, handlerName: HandlerInput): ConfirmationModel {
  const order = receipt;
  const company = receipt.company;
  return {
    orderCode: clean(order.orderCode),
    fileName: fileNameOf(order.orderCode),
    blocks: [
      headerBlock(company),
      titleBlock(order, handlerName),
      customerBlock(order),
      ...order.services.map((s, i) => serviceBlock(s, i + 1)),
      summaryBlock(order),
      footerBlock(company, order),
    ],
  };
}
