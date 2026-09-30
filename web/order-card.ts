// Thẻ đơn rút gọn 2 dòng + nút xổ xuống (Đợt E Phần A, đặc tả docs/superpowers/specs/2026-09-23-dot-e-the-don-gon-va-bieu-tuong.md §A;
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
import { type OrderStatus } from "./api";
import { h, replaceChildren, type Child } from "./dom";
import { dateTime, dayMonth, paxCounts, paxCountsShort, trangThaiHienThi, vnd, vndShort } from "./format";
import { icon } from "./icons";
import { type PaxCounts } from "../src/shared/order-lines";

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
  total: number;
  serviceNames: string[];
  staffName: string;
  createdAt: string;
  customerNote: string | null;
  pickupPlace: string | null;
  /** Số thứ tự trong danh sách (1, 2, 3…); bỏ qua = không hiện. */
  index?: number;
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
  const when = o.departDate ? `${dayMonth(o.departDate)}${o.pickupTime ? ` · ${o.pickupTime}` : ""}` : "Chưa có ngày đón";
  const detailsId = `order-details-${o.id}`;

  // ---- Dòng 1: ngày · giờ đón · tên khách (co giãn, cắt bằng "…" khi dài) · huy hiệu trạng thái ----
  const line1 = h(
    "div",
    { class: "order-row-top" },
    o.index !== undefined && h("span", { class: "order-row-index" }, `${o.index}.`),
    h("span", { class: "order-row-when" }, when),
    h("span", { class: "order-row-name" }, o.customerName),
    (() => {
      const tt = trangThaiHienThi(o);
      return h("span", { class: `badge badge-${tt.khoa}` }, tt.nhan);
    })(),
  );

  // ---- Dòng 2: SĐT (bấm gọi) · số khách (bản rút gọn) · "Còn thu" — ĐÚNG một hàng, không xuống dòng ----
  const line2: Child[] = [
    h(
      "span",
      { class: "order-row-phone icon-label", onclick: (e: Event) => { e.preventDefault(); e.stopPropagation(); location.href = `tel:${o.customerPhone}`; } },
      icon("handset", 16),
      o.customerPhone,
    ),
  ];
  const pax = paxCountsShort(o.pax);
  if (pax) line2.push(h("span", { class: "order-row-pax icon-label" }, icon("guests", 16), pax));
  // Sổ tiền lượt 1 (ADR-0026 đ9): "Còn thu" / "Đã trả" là số của billing — chỗ trống điền SAU (`dienTien`, một lời gọi `POST /api/ledger/balances` cho cả
  // trang); chưa có số thì ẩn, không đoán.
  const tienSlot = h("span", { class: "order-row-remaining", hidden: true });
  if (money !== "none") line2.push(tienSlot);

  const link = h(
    "a",
    { class: "order-row", href: o.href },
    line1,
    h("div", { class: "order-card-line2" }, ...line2),
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

  const head = h("div", { class: "order-card-head" }, link, toggle);

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
  if (money === "full") detailLines.push(h("div", null, "Tổng ", vnd(o.total)));
  if (svc) detailLines.push(h("div", null, svc));
  if (o.pickupPlace) detailLines.push(h("div", null, "Đón tại ", o.pickupPlace));
  if (o.staffName) detailLines.push(h("div", null, "Người lập: ", o.staffName));
  detailLines.push(h("div", null, "Lập lúc: ", dateTime(o.createdAt)));
  if (o.customerNote) detailLines.push(h("div", { class: "order-row-note" }, o.customerNote));
  detailLines.push(handlerSlot);
  const details = h("div", { id: detailsId, class: "order-card-details", hidden: true }, ...detailLines);

  const el = h("div", { class: "order-card" }, head, details);
  return { el, handlerSlot, tien: { tienSlot, daTraSlot } };
}

/** Điền "Còn thu" (dòng 2) + "Đã trả" (phần xổ) từ số của billing. `t` vắng = chưa biết → giữ ẩn. */
export function dienTien(slots: { tienSlot: HTMLElement; daTraSlot: HTMLElement }, t: { daThu: number; conLai: number } | undefined): void {
  if (!t || !slots.tienSlot.isConnected) return;
  replaceChildren(slots.tienSlot, "Còn thu ", moneySpan(t.conLai === 0 ? "money-ok" : "money-due", t.conLai));
  slots.tienSlot.hidden = false;
  replaceChildren(slots.daTraSlot, "Đã trả ", vnd(t.daThu));
  slots.daTraSlot.hidden = false;
}
