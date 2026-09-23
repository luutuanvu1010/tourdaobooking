// Thẻ đơn rút gọn 2 dòng + nút xổ xuống (Đợt E Phần A, đặc tả docs/superpowers/specs/2026-09-23-dot-e-the-don-gon-va-bieu-tuong.md §A).
// Dùng ở /orders (web/orders.ts). THIẾT KẾ để dùng lại cho màn "Việc của tôi" (web/account.ts) sau khi chủ dự án
// chốt câu tiền cho FIELD (đi ngược ADR-0007 điều 3 / ADR-0014 điều 6 nếu hiện tiền — xem CLAUDE.md) — CHƯA nối ở
// đợt này; `showMoney` đã có sẵn để tắt phần tiền khi nối, giữ đúng MyAssignmentDto không có trường tiền.
//
// Cấu trúc DOM cố ý KHÔNG lồng nút xổ vào trong thẻ <a>: `button.order-card-toggle` và `div.order-card-details` là
// ANH EM của `a.order-row`, không phải con của nó — bấm nút xổ vì vậy KHÔNG BAO GIỜ điều hướng, CHẮC CHẮN đúng ở mọi
// engine (không cần preventDefault/stopPropagation như số điện thoại, và không phải tin vào việc trình duyệt tự
// chặn điều hướng khi click một nút lồng trong <a> — đã THỬ đột biến: lồng button vào bên trong <a> rồi bấm bằng
// `.click()` trong Chrome headless KHÔNG điều hướng và axe-core (bản dùng ở kịch bản kiểm) cũng KHÔNG báo lỗi —
// nghĩa là việc lồng "trông có vẻ an toàn" ở MỘT engine, nhưng đây là app PWA chạy trên Safari/WebKit thật của
// iPhone, khác engine — không có bằng chứng hành vi đó bền vững ở đó. Giữ anh em là cách CHẮC CHẮN không phụ thuộc
// hành vi ngầm của trình duyệt, đổi lại được — bề mặt, đã tự quyết theo P8).
import { type OrderStatus } from "./api";
import { h, type Child } from "./dom";
import { dateTime, dayMonth, paxCounts, STATUS_LABEL, vnd, vndShort } from "./format";
import { icon } from "./icons";
import { type PaxCounts } from "../src/shared/order-lines";

export interface OrderCardData {
  id: string;
  /** Đích khi bấm vào hai dòng hiện ngay (thường `/order?id=…`). */
  href: string;
  status: OrderStatus;
  departDate: string | null;
  pickupTime: string | null;
  customerPhone: string;
  pax: PaxCounts;
  /** Bỏ qua khi `showMoney` = false (màn không được thấy tiền). */
  depositAmount: number;
  remainingAmount: number;
  serviceNames: string[];
  staffName: string;
  createdAt: string;
  customerNote: string | null;
  pickupPlace: string | null;
}

export interface OrderCardOptions {
  /** Mặc định true. FIELD ở "Việc của tôi" phải truyền false (ADR-0007 điều 3, ADR-0014 điều 6: không xem tổng tiền). */
  showMoney?: boolean;
}

export interface OrderCardResult {
  /** Thẻ hoàn chỉnh (`div.order-card`) — nối thẳng vào danh sách. */
  el: HTMLElement;
  /** Chỗ giữ dòng người phụ trách bên trong phần xổ xuống — `web/orders.ts` điền tên sau khi `GET /api/dispatch/handlers` về (mẫu `is-pending`, giống trước Đợt E). */
  handlerSlot: HTMLElement;
}

/** "Xe 7 chỗ" · "Xe 7 chỗ +2 dịch vụ" · "" (đơn chưa có dịch vụ nào — dòng bị bỏ qua, không hiện "—"). */
function serviceLine(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  return `${names[0]} +${names.length - 1} dịch vụ`;
}

export function orderCard(o: OrderCardData, opts: OrderCardOptions = {}): OrderCardResult {
  const showMoney = opts.showMoney ?? true;
  const when = o.departDate ? `${dayMonth(o.departDate)}${o.pickupTime ? ` · ${o.pickupTime}` : ""}` : "Chưa có ngày đón";
  const detailsId = `order-details-${o.id}`;

  // ---- Dòng 2: SĐT (bấm gọi) · số khách · đã trả · còn lại — trường nào rỗng thì bỏ qua ----
  const line2: Child[] = [
    h(
      "span",
      { class: "order-row-phone icon-label", onclick: (e: Event) => { e.preventDefault(); e.stopPropagation(); location.href = `tel:${o.customerPhone}`; } },
      icon("handset", 16),
      o.customerPhone,
    ),
  ];
  const pax = paxCounts(o.pax);
  if (pax) line2.push(h("span", { class: "icon-label" }, icon("guests", 16), pax));
  if (showMoney) {
    line2.push(h("span", null, "Đã trả ", h("b", null, h("span", { class: "lbl-full" }, vnd(o.depositAmount)), h("span", { class: "lbl-short" }, `${vndShort(o.depositAmount)} ₫`))));
    line2.push(
      h(
        "span",
        null,
        "Còn lại ",
        h("b", { class: o.remainingAmount === 0 ? "money-ok" : "money-due" }, h("span", { class: "lbl-full" }, vnd(o.remainingAmount)), h("span", { class: "lbl-short" }, `${vndShort(o.remainingAmount)} ₫`)),
      ),
    );
  }

  const link = h(
    "a",
    { class: "order-row", href: o.href },
    h("div", { class: "order-row-top" }, h("strong", null, when), h("span", { class: `badge badge-${o.status}` }, STATUS_LABEL[o.status])),
    h("div", { class: "order-card-line2" }, ...line2),
  );

  // ---- Phần xổ xuống: dịch vụ · người lập · lập lúc (giờ VN) · ghi chú · nơi đón · người phụ trách — trường rỗng thì KHÔNG dựng dòng, không hiện "—" ----
  const handlerSlot = h("div", { class: "order-row-handler is-pending" });
  const svc = serviceLine(o.serviceNames);
  const detailLines: Child[] = [];
  if (svc) detailLines.push(h("div", null, svc));
  if (o.staffName) detailLines.push(h("div", null, "Người lập: ", o.staffName));
  detailLines.push(h("div", null, "Lập lúc: ", dateTime(o.createdAt)));
  if (o.customerNote) detailLines.push(h("div", { class: "order-row-note" }, o.customerNote));
  if (o.pickupPlace) detailLines.push(h("div", null, "Đón tại ", o.pickupPlace));
  detailLines.push(handlerSlot);
  const details = h("div", { id: detailsId, class: "order-card-details", hidden: true }, ...detailLines);

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

  const el = h("div", { class: "order-card" }, link, h("div", { class: "order-card-foot" }, toggle), details);
  return { el, handlerSlot };
}
