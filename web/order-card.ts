// Thẻ đơn rút gọn 2 dòng (+ dòng "Đón tại" khi có nơi đón — góp ý T5) + nút xổ xuống (Đợt E Phần A, đặc tả docs/superpowers/specs/2026-09-23-dot-e-the-don-gon-va-bieu-tuong.md §A;
// LUẬT KHUNG 30/10/2026 (chủ duyệt; docs/superpowers/plans/2026-10-30-sua-hien-thi-va-luat-khung.md): DOM dưới đây giữ nguyên, khối «Luật khung 30/10» cuối
// public/app.css xếp lại — thẻ ba hàng, KHÔNG cắt tên khách / số khách / còn thu (thay quyết định «đúng 2 dòng» bên dưới); ở trang Đơn hàng, khi vùng chứa danh sách
// đủ rộng thì thành bảng thẳng cột (đo theo vùng nội dung, không theo cửa sổ — bảng lưới của phần «Khung gốc giao diện» trong app.css, ADR-0222).
// Các câu «đúng 2 dòng», «cắt bằng …» trong chú thích tệp này là lịch sử Đợt E.
// bố cục ĐÃ SỬA theo hai quyết định của chủ dự án 2026-09-24 — xem mục "Vòng sửa 2026-09-24" ở cuối đặc tả đó:
// (1) GIỮ tên khách + mã đơn (Phần A trước đó làm mất, đã sửa); (2) đúng 2 dòng THẬT ở mọi khổ, kể cả 390px —
// "đã trả"/"tổng" chuyển hẳn vào phần xổ để nhường chỗ, dòng 2 KHÔNG được xuống hàng.
// Dùng ở /orders (web/orders.ts). THIẾT KẾ để dùng lại cho màn "Việc của tôi" (web/account.ts) khi ADR-0017
// (docs/adr/ADR-0017-huong-dan-vien-xem-tien-can-thu.md — proposed, CHƯA duyệt) được chủ dự án duyệt: hướng dẫn
// viên chỉ được xem "còn thu" + "đã trả", KHÔNG tổng tiền, KHÔNG giá từng gói. CHƯA nối ở đợt này (web/account.ts
// không đổi); tham số `money` đã có sẵn mức "no-total" đúng phạm vi đó (tên tham số là GIẢ ĐỊNH của người thi
// công, P8 — bề mặt, đảo ngược được — ADR chưa duyệt nên chưa có nơi thứ hai dùng để đối chiếu).
//
// Cấu trúc DOM cố ý KHÔNG lồng nút xổ vào trong thẻ <a>: `button.order-card-toggle` là ANH EM của `a.order-row`
// (cả hai nằm trong `div.order-card-head` chỉ để xếp cạnh nhau bằng flexbox — KHÔNG phải quan hệ cha/con giữa
// <a> và <button>), `div.order-card-details` là con của `div.order-card`, cũng không lồng trong <a>. Bấm nút xổ vì
// vậy KHÔNG BAO GIỜ điều hướng, CHẮC CHẮN đúng ở mọi engine, không cần preventDefault/stopPropagation như số điện
// thoại, và không phải tin vào việc trình duyệt tự chặn điều hướng khi click một nút lồng trong <a> — đã THỬ đột
// biến: lồng button vào bên trong <a> rồi bấm bằng `.click()` trong Chrome headless KHÔNG điều hướng và axe-core
// (bản dùng ở kịch bản kiểm) cũng KHÔNG báo lỗi — nghĩa là việc lồng "trông có vẻ an toàn" ở MỘT engine, nhưng đây
// là app PWA chạy trên Safari/WebKit thật của iPhone, khác engine — không có bằng chứng hành vi đó bền vững ở đó.
// Giữ anh em là cách CHẮC CHẮN không phụ thuộc hành vi ngầm của trình duyệt, đổi lại được — bề mặt, đã tự quyết
// theo P8).
// KHUNG GỐC (ADR-0222, 21/11/2026): thẻ đơn mang thêm lớp và vùng ô của bảng lưới (`the-dong`, `bang-hang`, `bang-gop`, `data-o`) — ở trang Đơn hàng
// (khuôn Danh sách) vùng nội dung từ 800 thì thẻ thành một dòng bảng thẳng cột theo khuôn cột của src/shared/bang-don.ts; ở chỗ khác các lớp này không có tác dụng.
import { type OrderStatus } from "./api";
import { h, replaceChildren, type Child } from "./dom";
import { dateTime, ngayNganHomNay, paxCounts, paxCountsShort, trangThaiHienThi, vnd, vndShort } from "./format";
import { icon } from "./icons";
import { o as vungO } from "./khung";
import { type PaxCounts } from "../src/shared/order-lines";
import { NHAN_DA_NHAP } from "../src/shared/nhap-ke-toan";
import { VUNG_O_DON } from "../src/shared/bang-don";

export interface OrderCardData {
  id: string;
  /** Đích khi bấm vào hai dòng hiện ngay (thường `/order?id=…`). */
  href: string;
  orderCode: string;
  status: OrderStatus;
  departDate: string | null;
  pickupTime: string | null;
  customerName: string;
  customerPhone: string;
  pax: PaxCounts;
  /** Mốc sổ tiền (ADR-0025) — nhãn "Đã giao – đã thu đủ" / "Hoàn thành" suy ra bằng `trangThaiHienThi`. */
  deliveredAt?: string | null;
  completedAt?: string | null;
  /** Bỏ qua khi `money` ≠ "full". */
  /** Vắng = máy chủ không gửi Tổng bán lẻ (Kế toán thuần xem đơn đối tác — ADR-0226). */
  total?: number;
  serviceNames: string[];
  staffName: string;
  createdAt: string;
  customerNote: string | null;
  pickupPlace: string | null;
  /** Số thứ tự trong danh sách (1, 2, 3…); bỏ qua = không hiện. */
  index?: number;
  /** ADR-0060 A-12: máy chủ chỉ gửi `true` khi đơn đã nhập phần mềm kế toán VÀ người xem qua ô xem dấu — vắng = không hiện gì. */
  nhapKeToan?: true;
  /** ADR-0166 câu 5: máy chủ chỉ gửi `true` khi đơn nháp đã gửi đi kiểm vé và chưa ai quyết → nhãn «Chờ xác nhận»; vắng = đơn nháp ghi «Chưa xác nhận». */
  dangCho?: true | undefined;
}

export type OrderCardMoneyMode = "full" | "no-total" | "none";

export interface OrderCardOptions {
  /**
   * Mặc định "full": dòng 2 hiện "Còn thu"; phần xổ hiện thêm "Đã trả" và "Tổng" — dùng ở /orders.
   * "no-total": dòng 2 vẫn hiện "Còn thu"; phần xổ hiện "Đã trả" nhưng KHÔNG hiện "Tổng" — đúng phạm vi ADR-0017
   * (proposed) cho "Việc của tôi" của hướng dẫn viên. Giá từng gói vốn CHƯA BAO GIỜ hiện ở đây (dòng dịch vụ chỉ
   * có tên) nên không cần mức riêng cho việc đó.
   * "none": ẩn hết tiền (chưa có nơi dùng, thêm cho đủ bộ bật/tắt).
   */
  money?: OrderCardMoneyMode;
}

export interface OrderCardResult {
  /** Thẻ hoàn chỉnh (`div.order-card`) — nối thẳng vào danh sách. */
  el: HTMLElement;
  /** Chỗ giữ dòng người phụ trách bên trong phần xổ xuống — `web/orders.ts` điền tên sau khi `GET /api/dispatch/handlers` về (mẫu `is-pending`, giống trước Đợt E). */
  handlerSlot: HTMLElement;
  /** Chỗ giữ "Còn thu" / "Đã trả" — điền bằng `dienTien` khi số của billing về (sổ tiền lượt 1). */
  tien: { tienSlot: HTMLElement; daTraSlot: HTMLElement };
}

/** "Xe 7 chỗ" · "Xe 7 chỗ +2 dịch vụ" · "" (đơn chưa có dịch vụ nào — dòng bị bỏ qua, không hiện "—"). */
function serviceLine(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  return `${names[0]} +${names.length - 1} dịch vụ`;
}

/** Cặp "đầy đủ ở máy tính / rút gọn ở điện thoại" (`.lbl-full`/`.lbl-short`, ngưỡng 639px ở public/app.css). */
function moneySpan(cls: string | undefined, amount: number): HTMLElement {
  return h(
    "b",
    { class: cls },
    h("span", { class: "lbl-full" }, vnd(amount)),
    h("span", { class: "lbl-short" }, `${vndShort(amount)} ₫`),
  );
}

export function orderCard(o: OrderCardData, opts: OrderCardOptions = {}): OrderCardResult {
  const money = opts.money ?? "full";
  const when = o.departDate ? `${ngayNganHomNay(o.departDate)}${o.pickupTime ? ` · ${o.pickupTime}` : ""}` : "Chưa có ngày đón";
  const detailsId = `order-details-${o.id}`;

  // ---- Dòng 1: ngày · giờ đón · tên khách (co giãn, cắt bằng "…" khi dài) · huy hiệu trạng thái ----
  const line1 = h(
    "div",
    { class: "order-row-top bang-gop" },
    o.index !== undefined && h("span", { class: "order-row-index", "data-an-bang": "" }, `${o.index}.`),
    h("span", { class: "order-row-when", ...vungO(VUNG_O_DON.ngay) }, when),
    h("span", { class: "order-row-name", ...vungO(VUNG_O_DON.ten) }, o.customerName),
    (() => {
      const tt = trangThaiHienThi(o);
      return h("span", { class: `badge badge-${tt.khoa}`, ...vungO(VUNG_O_DON.trangThai) }, tt.nhan);
    })(),
  );

  // ---- Dòng 2: SĐT (bấm gọi) · số khách (bản rút gọn) · "Còn thu" — ĐÚNG một hàng, không xuống dòng ----
  const line2: Child[] = [
    h(
      "span",
      { class: "order-row-phone icon-label", ...vungO(VUNG_O_DON.sdt), onclick: (e: Event) => { e.preventDefault(); e.stopPropagation(); location.href = `tel:${o.customerPhone}`; } },
      icon("handset", 16),
      o.customerPhone,
    ),
  ];
  const pax = paxCountsShort(o.pax);
  if (pax) line2.push(h("span", { class: "order-row-pax icon-label", ...vungO(VUNG_O_DON.khach) }, icon("guests", 16), pax));
  // Sổ tiền lượt 1 (ADR-0026 đ9): "Còn thu" / "Đã trả" là số của billing — chỗ trống điền SAU (`dienTien`, một lời gọi `POST /api/ledger/balances` cho cả
  // trang); chưa có số thì ẩn, không đoán.
  const tienSlot = h("span", { class: "order-row-remaining", ...vungO(VUNG_O_DON.tien), "data-so": "", hidden: true });
  if (money !== "none") line2.push(tienSlot);

  // ---- Dòng 3 (góp ý T5, 2026-09-30): "Đón tại" luôn thấy, ngay dưới giờ đón — chỉ khi đơn có nơi đón; một hàng, dài thì cắt "…" (tên đầy đủ vẫn ở
  // phần xổ, như tên khách). Nới quyết định "đúng 2 dòng" của Đợt E — ghi làm câu hỏi cho chủ ở docs/design/gop-y-2026-09-30/README.md.
  const line3 = o.pickupPlace
    ? h("div", { class: "order-card-line3", ...vungO(VUNG_O_DON.noiDon) }, icon("pin", 16), h("span", { class: "order-row-place" }, "Đón tại ", o.pickupPlace))
    : null;

  // ADR-0060 A-12: nhãn "Đã nhập phần mềm kế toán" — một hàng riêng (dòng 2 không được xuống hàng), dùng lại khuôn dòng 3. YC-0018 (24/10): thêm
  // nền xanh nhạt + viền bo tròn (`nhap-kt-noi`) để Kế toán liếc là thấy — chỉ CSS, token màu có sẵn.
  const lineKt = o.nhapKeToan
    ? h("div", { class: "order-card-line3 money-ok nhap-kt-noi", ...vungO(VUNG_O_DON.nhapKeToan), "data-nhap-ke-toan": "" }, icon("doc-check", 16), h("span", { class: "order-row-place" }, NHAN_DA_NHAP))
    : null;

  const link = h(
    "a",
    { class: "order-row bang-hang", href: o.href },
    line1,
    h("div", { class: "order-card-line2 bang-gop" }, ...line2),
    line3,
    lineKt,
  );

  const toggle = h("button", {
    type: "button",
    class: "order-card-toggle",
    "aria-expanded": "false",
    "aria-controls": detailsId,
    "aria-label": "Xem thêm chi tiết đơn",
    onclick: () => {
      const willOpen = details.hidden;
      details.hidden = !willOpen;
      toggle.setAttribute("aria-expanded", String(willOpen));
    },
  });

  const head = h("div", { class: "order-card-head the-dong-dau" }, link, toggle);

  // ---- Phần xổ xuống: Khách · Mã đơn · Số khách · Đã trả · Tổng · Tên gói · Nơi đón · Người lập · Ngày giờ lập · Ghi chú · Người phụ trách ----
  // Thứ tự và bộ trường gốc ĐÚNG theo yêu cầu chủ dự án 2026-09-24; "Số khách" thêm sau (điều phối viên quyết định
  // sau vòng sửa đó — xem đầu tệp docs/superpowers/specs/2026-09-23-dot-e-the-don-gon-va-bieu-tuong.md): ở dòng 2,
  // `.order-row-pax` là phần DUY NHẤT được phép co lại bằng "…" khi hết chỗ (SĐT và "Còn thu" không bao giờ co) —
  // đơn đủ 4 loại khách + số hai chữ số có thể co hết, mất thông tin trên thẻ đóng. Phần xổ vì vậy LUÔN hiện dòng
  // này khi đơn có khách (kể cả lúc dòng 2 chưa bị co) — trùng lặp nhẹ, đổi lấy việc không bao giờ mất thông tin.
  // "Khách" (tên khách ĐẦY ĐỦ) thêm ở vòng sửa sau kiểm độc lập Đợt E (2026-09-24, mục A của phiếu kiểm): dòng 1
  // (`.order-row-name`) cắt tên bằng "…" khi hẹp — CỐ Ý giữ (chủ dự án đã chọn đúng 2 dòng ở mọi khổ) — nhưng trước
  // khi có dòng này, xem tên đầy đủ phải rời danh sách, mở từng đơn. Đặt NGAY TRƯỚC "Mã đơn" — quyết định của điều
  // phối viên (không phải giả định của người thi công), luôn hiện vì đơn luôn có tên khách.
  const handlerSlot = h("div", { class: "order-row-handler is-pending" });
  const svc = serviceLine(o.serviceNames);
  const paxFull = paxCounts(o.pax);
  const detailLines: Child[] = [h("div", null, "Khách: ", o.customerName), h("div", null, "Mã đơn: ", o.orderCode)];
  if (paxFull) detailLines.push(h("div", null, "Số khách: ", paxFull));
  // Phần xổ luôn đủ chỗ (mỗi trường một hàng riêng, không chung hàng với SĐT/nút xổ như dòng 2) — hiện số ĐẦY ĐỦ,
  // không rút gọn (khác "Còn thu" ở dòng 2, phải rút gọn vì chung hàng với SĐT trong khổ hẹp).
  const daTraSlot = h("div", { hidden: true });
  if (money !== "none") detailLines.push(daTraSlot);
  if (money === "full" && o.total !== undefined) detailLines.push(h("div", null, "Tổng ", vnd(o.total)));
  if (svc) detailLines.push(h("div", null, svc));
  if (o.pickupPlace) detailLines.push(h("div", null, "Đón tại ", o.pickupPlace));
  if (o.staffName) detailLines.push(h("div", null, "Người lập: ", o.staffName));
  detailLines.push(h("div", null, "Lập lúc: ", dateTime(o.createdAt)));
  if (o.customerNote) detailLines.push(h("div", { class: "order-row-note" }, o.customerNote));
  detailLines.push(handlerSlot);
  const details = h("div", { id: detailsId, class: "order-card-details the-dong-xo", hidden: true }, ...detailLines);

  const el = h("div", { class: "order-card the-dong" }, head, details);
  return { el, handlerSlot, tien: { tienSlot, daTraSlot } };
}

/**
 * Điền "Còn thu" (dòng 2) + "Đã trả" (phần xổ) từ số của billing. `t` vắng = chưa biết → giữ ẩn.
 * ADR-0226: `n` có (đơn đối tác của Kế toán thuần, máy chủ không gửi số bán lẻ) ⇒ dòng 2 là số nợ với nhãn máy chủ chọn theo dấu, phần xổ là «Tour Đảo đã thu hộ tiền mặt».
 */
export function dienTien(slots: { tienSlot: HTMLElement; daTraSlot: HTMLElement }, t: { daThu: number; conLai: number } | undefined, n?: { no: number; thuHoTienMat: number; nhan: string; nhanThuHo: string }): void {
  const x = n ? ([n.nhan, n.no > 0, Math.abs(n.no), n.nhanThuHo, n.thuHoTienMat] as const) : t && (["Còn thu", t.conLai !== 0, t.conLai, "Đã trả", t.daThu] as const);
  if (!x || !slots.tienSlot.isConnected) return;
  // Chữ «Còn thu» ẩn khi thẻ nằm trong bảng thẳng cột (đầu cột đã ghi) — data-an-bang của khung gốc. Nhãn nợ đối tác KHÔNG ẩn: đầu cột ghi «Còn thu», thiếu nhãn thì đọc sai chiều tiền.
  replaceChildren(slots.tienSlot, h("span", n ? null : { "data-an-bang": "" }, `${x[0]} `), moneySpan(x[1] ? "money-due" : "money-ok", x[2]));
  slots.tienSlot.hidden = false;
  replaceChildren(slots.daTraSlot, `${x[3]} `, vnd(x[4]));
  slots.daTraSlot.hidden = false;
}
