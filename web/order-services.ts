// Khối dịch vụ của trang đơn (A2, đặc tả 5.3): mỗi dịch vụ một thẻ CHỈ ĐỌC — chip đơn vị/mã/trạng thái danh mục, số khách, thông tin chuyến,
// dòng tiền và tổng dịch vụ. Số liệu/nhãn đến từ mô hình thuần `serviceView` (src/shared/order-view.ts); ở đây chỉ dựng DOM (không innerHTML).
import type { Order } from "./api";
import { h } from "./dom";
import { vnd } from "./format";
import { icon } from "./icons";
import { serviceView, type LineView, type ServiceView } from "../src/shared/order-view";

const lockIcon = (): HTMLElement => h("span", { class: "lock" }, icon("lock", 16));

/** Một dòng "nhãn — giá trị"; `lock` đặt biểu tượng khoá trước giá trị (đơn đã xác nhận), `warn` tô kiểu cảnh báo (chưa có ngày). */
const kv = (label: string, value: string, o: { warn?: boolean; lock?: boolean } = {}): HTMLElement =>
  h("div", { class: o.warn ? "kv kv-warn" : "kv" }, h("span", { class: "muted" }, label), h("span", null, o.lock ? lockIcon() : null, value));

function lineRow(l: LineView): HTMLElement {
  // Nhãn chỉ khi CÓ giá danh mục để so (dịch vụ nhập tay: catalogPrice null → deviation null → không nhãn).
  const flag =
    l.deviation !== null && l.catalogPrice !== null
      ? h("div", { class: "line-flag" }, h("span", { class: "tag-price" }, "Khác giá danh mục"), h("span", { class: "price-old" }, "giá danh mục ", h("s", null, vnd(l.catalogPrice))))
      : null;
  return h(
    "div",
    { class: "line-view" },
    h("div", { class: "line-name" }, l.description, l.detail && h("div", { class: "muted" }, l.detail)),
    h("div", { class: "line-total" }, vnd(l.lineTotal)),
    h("div", { class: "line-calc muted" }, `${l.quantity} × ${vnd(l.unitPrice)}`),
    flag,
  );
}

function serviceBlock(v: ServiceView, locked: boolean, extra: HTMLElement | null): HTMLElement {
  const chips = [
    h("span", { class: "chip chip-unit" }, v.unit),
    v.code ? h("span", { class: "chip chip-code" }, v.code) : null,
    v.tag ? h("span", { class: v.tag.tone === "warning" ? "chip chip-warn" : "chip chip-muted" }, v.tag.text) : null,
  ];
  return h(
    "article",
    { class: "svc svc-view", "data-service-id": v.id },
    h("div", { class: "svc-head" }, h("div", { class: "svc-title" }, h("h3", { class: "svc-name" }, v.name), h("div", { class: "svc-chips" }, ...chips))),
    h("div", { class: "svc-facts" }, kv("Số khách", v.pax, { lock: locked }), ...v.trip.map((r) => kv(r.label, r.value, { warn: r.warn }))),
    extra,
    h("div", { class: "svc-lines" }, ...v.lines.map(lineRow)),
    h("div", { class: "svc-sum" }, h("span", null, locked ? lockIcon() : null, "Tổng dịch vụ"), h("span", { class: "svc-total-amount" }, vnd(v.subtotal))),
  );
}

/**
 * `locked` = đơn đã xác nhận (số khách và tiền hiển thị kiểu chỉ-đọc kèm biểu tượng khoá). `extra` (ADR-0049 V12): khối riêng của một dịch vụ đặt ngay dưới
 * thông tin chuyến — nhãn đặt gấp / cảnh báo dưới mốc của các chặng (web/order.ts dựng); null = không có gì.
 */
// Bản 1.39: ngày của đơn = ngày của dịch vụ ĐẦU (cùng quy ước dải đầu trang, `summaryBand` ở web/order.ts) — dịch vụ cùng ngày không lặp dòng "Khởi hành".
export function renderServices(order: Order, locked: boolean, extra: (serviceId: string) => HTMLElement | null = () => null): HTMLElement {
  return h("section", { class: "services" }, h("h2", null, "Dịch vụ"), h("div", { class: "svc-list" }, ...order.services.map((s) => serviceBlock(serviceView(s, order.services[0]?.departDate ?? null), locked, extra(s.id)))));
}
