// Vẽ một Banner (src/shared/order-errors.ts) vào phần tử `role="alert"` có sẵn trong HTML. Quyết định giọng/hành động nằm ở hàm thuần; ở đây chỉ dựng DOM.
import type { Banner } from "../src/shared/order-errors";
import { h, replaceChildren } from "./dom";

export interface BannerHandlers {
  reloadOrder?: () => void;
  reloadPage?: () => void;
  /** Đường dẫn cho liên kết "Sửa" của dòng có serviceId (banner incomplete_trip). */
  editHref?: (serviceId: string) => string;
}

const action = (label: string, onClick: () => void): HTMLButtonElement => {
  const b = h("button", { type: "button", class: "btn" }, label);
  b.addEventListener("click", onClick);
  return b;
};

/** `b = null` ẩn banner. */
export function renderBanner(el: HTMLElement, b: Banner | null, handlers: BannerHandlers = {}): void {
  el.hidden = b === null;
  el.className = b ? `banner banner-${b.tone}` : "banner";
  if (!b) {
    el.replaceChildren();
    return;
  }
  const lines = b.lines.length
    ? h(
        "ul",
        { class: "banner-lines" },
        ...b.lines.map((l) => h("li", null, l.text, l.serviceId && handlers.editHref ? h("a", { class: "banner-edit", href: handlers.editHref(l.serviceId) }, "Sửa") : null)),
      )
    : null;
  const actions: HTMLElement[] = [];
  if (b.action === "reload_order" && handlers.reloadOrder) actions.push(action("Tải lại đơn", handlers.reloadOrder));
  if (b.action === "reload_page") actions.push(action("Tải lại trang", handlers.reloadPage ?? (() => location.reload())));
  replaceChildren(el, h("div", { class: "banner-title" }, b.title), lines, actions.length ? h("div", { class: "banner-actions" }, ...actions) : null);
}
