// Ô "Chọn từ danh mục": ô tìm + danh sách kết quả (tên, mã, đơn vị, giá người lớn). Chạm một kết quả = thêm thẻ (onPick).
// Dịch vụ chưa hỗ trợ đơn vị hoặc chưa có giá hiện mờ, không chạm được (ghi "chưa hỗ trợ" / "chưa có giá"; ADR-0061: người ĐƯỢC nhập tay — `setNhapTay(true)` —
// thấy "chưa hỗ trợ — dùng nhập tay", gợi ý nút "+ Dịch vụ nhập tay"; người không được nhập tay chỉ thấy "chưa hỗ trợ" như bản 1.40): `aria-disabled` chứ không `disabled`, để vẫn nằm trong cây truy cập (người dùng đọc màn hình biết có mục này). Dịch vụ đã ẩn không có trong /api/catalog/for-order (nguồn của form lập đơn, ADR-0033) nên không hiện.
// Danh sách là các nút thường (không role listbox/option: listbox đòi tên + mô hình phím mũi tên mà ở đây không có). Mỗi dòng: nút chọn (`.catalog-pick`) + nút ghim ☆/★ "Hay dùng" (`.catalog-ghim`) — anh em, không lồng.
import type { CatalogServiceDto } from "../src/shared/contracts";
import { unitLabel } from "../src/shared/service-form";
import { LOC_DANH_MUC, docNhoDanhMuc, doiGhim, locDanhMuc, type NhoDanhMuc } from "../src/shared/loc-danh-muc";
import { h, replaceChildren } from "./dom";
import { vnd } from "./format";

export interface CatalogPicker {
  root: HTMLElement;
  setItems(items: readonly CatalogServiceDto[]): void;
  /** Thông báo của danh mục (trống / chưa đồng bộ được / không tải được); null = ẩn. */
  setNotice(text: string | null): void;
  /** Khoá ô tìm kèm lý do (vd "Đơn đã đủ 20 dịch vụ."); null = mở lại. */
  setDisabled(reason: string | null): void;
  /** Bản 1.39: mã dịch vụ đang có trong đơn — kết quả tìm trùng mã gắn nhãn "đã chọn" (KHÔNG chặn chọn trùng, chủ quyết). */
  setSelected(codes: Iterable<string>): void;
  /** ADR-0061: người dùng được nhập tay (`duocDung` của máy chủ) — dịch vụ chưa hỗ trợ ghi "chưa hỗ trợ — dùng nhập tay". */
  setNhapTay(duocNhapTay: boolean): void;
  focus(): void;
}

const MAX_RESULTS = 40;

const KHOA_NHO = "td.dmLoc.v1";
function docBoNho(): string | null {
  try {
    return localStorage.getItem(KHOA_NHO);
  } catch {
    return null;
  }
}
function ghiBoNho(v: NhoDanhMuc): void {
  try {
    localStorage.setItem(KHOA_NHO, JSON.stringify(v));
  } catch {
    /* bộ nhớ bị chặn: chỉ không nhớ */
  }
}

export function createCatalogPicker(o: { onPick: (item: CatalogServiceDto) => void }): CatalogPicker {
  const notice = h("div", { class: "alert warn", role: "status", hidden: true });
  const q = h("input", { id: "catalog-q", type: "search", placeholder: "Gõ tên hoặc mã dịch vụ…", autocomplete: "off", "aria-controls": "catalog-list" });
  const reason = h("p", { class: "muted", hidden: true });
  const list = h("div", { id: "catalog-list", class: "catalog-list", hidden: true });
  // Hàng lọc (góp ý YC-0003 — chủ duyệt 30/9): "★ Hay dùng" (ghim trên máy) + đơn vị tính; chọn một, bấm lại để bỏ. Bộ lọc và mã đã ghim nhớ TRÊN MÁY
  // này (bộ nhớ trình duyệt; bị chặn → chỉ không nhớ). Chip "nhóm dịch vụ" (ADR-0058, phiên khác) sẽ thêm vào CUỐI hàng này — `data-cho="nhom"`.
  let nho: NhoDanhMuc = docNhoDanhMuc(docBoNho());
  const locNut = LOC_DANH_MUC.map((l) => {
    const b = h("button", { type: "button", class: "loc-nut catalog-loc-nut", "aria-pressed": String(nho.loc === l.khoa), "data-loc": l.khoa }, l.nhan);
    b.addEventListener("click", () => {
      nho = { ...nho, loc: nho.loc === l.khoa ? null : l.khoa };
      for (const x of locNut) x.setAttribute("aria-pressed", String(x.dataset.loc === nho.loc));
      ghiBoNho(nho);
      render();
    });
    return b;
  });
  const locHang = h("div", { class: "catalog-loc", role: "group", "aria-label": "Lọc danh mục", "data-cho": "nhom" }, ...locNut);
  const root = h("div", { class: "catalog" }, notice, h("label", null, "Chọn từ danh mục", q), locHang, reason, list);
  let items: readonly CatalogServiceDto[] = [];
  let selected = new Set<string>();
  let nhapTay = false;

  function render(): void {
    const found = locDanhMuc(items, { kim: q.value, loc: nho.loc, ghim: nho.ghim }).slice(0, MAX_RESULTS);
    replaceChildren(
      list,
      ...found.map((c) => {
        const usable = c.supported && c.prices.adult !== null;
        const b = h(
          "button",
          { type: "button", class: "catalog-pick", "aria-disabled": usable ? false : "true" },
          h("span", { class: "catalog-name" }, h("strong", null, c.code), " ", c.name, c.supported ? h("span", { class: "chip chip-unit" }, unitLabel(c.unit)) : null, selected.has(c.code) ? h("span", { class: "chip chip-picked" }, "đã chọn") : null),
          h("span", { class: "price" }, c.supported ? (c.prices.adult === null ? "chưa có giá" : vnd(c.prices.adult)) : nhapTay ? "chưa hỗ trợ — dùng nhập tay" : "chưa hỗ trợ"),
        );
        b.addEventListener("click", () => {
          if (!usable) return; // mục không chọn được: bỏ qua (danh sách vẫn mở)
          o.onPick(c);
          q.value = "";
          list.hidden = true;
        });
        const daGhim = nho.ghim.includes(c.code);
        const ghim = h("button", { type: "button", class: "catalog-ghim", "aria-pressed": String(daGhim), "aria-label": `${daGhim ? "Bỏ" : "Thêm"} ${c.code} ${daGhim ? "khỏi" : "vào"} Hay dùng`, "data-ghim": c.code }, daGhim ? "★" : "☆");
        ghim.addEventListener("click", () => {
          nho = { ...nho, ghim: doiGhim(nho.ghim, c.code) };
          ghiBoNho(nho);
          render();
          list.querySelector<HTMLButtonElement>(`[data-ghim="${CSS.escape(c.code)}"]`)?.focus();
        });
        return h("div", { class: "catalog-row" }, b, ghim);
      }),
      found.length === 0 &&
        h("div", { class: "catalog-empty", role: "status" }, nho.loc === "hay-dung" && !nho.ghim.length ? "Chưa ghim dịch vụ nào — bấm ☆ cạnh một dịch vụ để thêm vào Hay dùng." : "Không tìm thấy dịch vụ."),
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
    setSelected(codes) {
      selected = new Set(codes);
      if (!list.hidden) render();
    },
    setNhapTay(v) {
      nhapTay = v;
      if (!list.hidden) render();
    },
    focus: () => q.focus(),
  };
}
