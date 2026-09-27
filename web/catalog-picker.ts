// Ô "Chọn từ danh mục": ô tìm + danh sách kết quả (tên, mã, đơn vị, giá người lớn). Chạm một kết quả = thêm thẻ (onPick).
// Dịch vụ chưa hỗ trợ đơn vị hoặc chưa có giá hiện mờ, không chạm được (gợi ý nhập tay): `aria-disabled` chứ không `disabled`, để vẫn nằm trong cây truy cập (người dùng đọc màn hình biết có mục này). Dịch vụ đã ẩn không có trong /api/catalog/for-order (nguồn của form lập đơn, ADR-0033) nên không hiện.
// Danh sách là các nút thường (không role listbox/option: listbox đòi tên + mô hình phím mũi tên mà ở đây không có).
import type { CatalogServiceDto } from "../src/shared/contracts";
import { unitLabel } from "../src/shared/service-form";
import { h, replaceChildren } from "./dom";
import { vnd } from "./format";

export interface CatalogPicker {
  root: HTMLElement;
  setItems(items: readonly CatalogServiceDto[]): void;
  /** Thông báo của danh mục (trống / chưa đồng bộ được / không tải được); null = ẩn. */
  setNotice(text: string | null): void;
  /** Khoá ô tìm kèm lý do (vd "Đơn đã đủ 20 dịch vụ."); null = mở lại. */
  setDisabled(reason: string | null): void;
  focus(): void;
}

const MAX_RESULTS = 40;

export function createCatalogPicker(o: { onPick: (item: CatalogServiceDto) => void }): CatalogPicker {
  const notice = h("div", { class: "alert warn", role: "status", hidden: true });
  const q = h("input", { id: "catalog-q", type: "search", placeholder: "Gõ tên hoặc mã dịch vụ…", autocomplete: "off", "aria-controls": "catalog-list" });
  const reason = h("p", { class: "muted", hidden: true });
  const list = h("div", { id: "catalog-list", class: "catalog-list", hidden: true });
  const root = h("div", { class: "catalog" }, notice, h("label", null, "Chọn từ danh mục", q), reason, list);
  let items: readonly CatalogServiceDto[] = [];

  function render(): void {
    const needle = q.value.trim().toLowerCase();
    const found = items.filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.code.toLowerCase().includes(needle)).slice(0, MAX_RESULTS);
    replaceChildren(
      list,
      ...found.map((c) => {
        const usable = c.supported && c.prices.adult !== null;
        const b = h(
          "button",
          { type: "button", "aria-disabled": usable ? false : "true" },
          h("span", { class: "catalog-name" }, h("strong", null, c.code), " ", c.name, c.supported ? h("span", { class: "chip chip-unit" }, unitLabel(c.unit)) : null),
          h("span", { class: "price" }, c.supported ? (c.prices.adult === null ? "chưa có giá" : vnd(c.prices.adult)) : "nhập tay"),
        );
        b.addEventListener("click", () => {
          if (!usable) return; // mục không chọn được: bỏ qua (danh sách vẫn mở)
          o.onPick(c);
          q.value = "";
          list.hidden = true;
        });
        return b;
      }),
      found.length === 0 && h("div", { class: "catalog-empty", role: "status" }, "Không tìm thấy dịch vụ."),
    );
    list.hidden = false;
  }
  q.addEventListener("focus", render);
  q.addEventListener("input", render);
  document.addEventListener("click", (e) => {
    if (e.target instanceof Node && !root.contains(e.target)) list.hidden = true;
  });

  return {
    root,
    setItems(next) {
      items = next;
    },
    setNotice(text) {
      notice.textContent = text ?? "";
      notice.hidden = !text;
    },
    setDisabled(why) {
      q.disabled = why !== null;
      reason.textContent = why ?? "";
      reason.hidden = why === null;
      if (why !== null) list.hidden = true;
    },
    focus: () => q.focus(),
  };
}
