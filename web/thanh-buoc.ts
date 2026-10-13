// Thanh tiến độ dính của màn Tạo đơn bốn bước (14/10/2026; phương án A của ảnh phác): bốn chấm tròn đánh số kèm chữ ngắn. Bấm thì cuộn tới bước; bước đủ thông tin có dấu ✓; bước đang xem nổi bật theo vị trí cuộn.
// Luật (bước nào đủ, bước nào đang xem) ở src/shared/buoc-tao-don.ts; ở đây chỉ vẽ và nối. Chỉ ẩn / hiện — không bao giờ chặn Lưu (máy chủ vẫn là nơi quyết).
import { BUOC_TAO_DON, buocDangXem, type MaBuoc } from "../src/shared/buoc-tao-don";
import { h } from "./dom";

export interface ThanhBuoc {
  root: HTMLElement;
  /** Cập nhật dấu ✓ theo `buocXong`. */
  datXong(xong: Record<MaBuoc, boolean>): void;
  /** Ẩn / hiện một bước (vai không chọn được người phụ trách, đang sửa đơn: chỉ ba bước; số thứ tự dồn lại). */
  an(ma: MaBuoc, an: boolean): void;
}

/** `phanTu` = phần tử bước theo mã (mỗi bước là một khối của form, có `id` `buoc-<mã>`). */
export function taoThanhBuoc(o: { phanTu: (ma: MaBuoc) => HTMLElement | null }): ThanhBuoc {
  const nut = new Map<MaBuoc, HTMLButtonElement>();
  const mucLi = new Map<MaBuoc, HTMLElement>();
  const cham = new Map<MaBuoc, HTMLElement>();
  const doc = new Map<MaBuoc, HTMLElement>();
  const an = new Set<MaBuoc>();
  const xong = new Set<MaBuoc>();
  let dang: MaBuoc = "khach";

  const items = BUOC_TAO_DON.map((b) => {
    const c = h("span", { class: "buoc-cham", "aria-hidden": "true" });
    const d = h("span", { class: "visually-hidden" });
    const n = h("button", { type: "button", class: "buoc-nut", "data-buoc": b.ma }, c, h("span", { class: "buoc-chu" }, b.nhan), d);
    n.addEventListener("click", () => {
      const el = o.phanTu(b.ma);
      if (!el) return;
      const giam = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: giam ? "auto" : "smooth", block: "start" }); // dừng cách mép trên đúng bằng `scroll-margin-top` của `.buoc` (chừa thanh trên và thanh này)
      el.focus({ preventScroll: true });
    });
    nut.set(b.ma, n);
    cham.set(b.ma, c);
    doc.set(b.ma, d);
    const li = h("li", { class: "buoc-muc" }, n);
    mucLi.set(b.ma, li);
    return li;
  });
  const root = h("nav", { class: "buoc-thanh", "aria-label": "Các bước lập đơn" }, h("ol", { class: "buoc-ds" }, ...items));

  const ve = (): void => {
    let so = 0;
    for (const b of BUOC_TAO_DON) {
      const li = mucLi.get(b.ma)!;
      li.hidden = an.has(b.ma);
      if (an.has(b.ma)) continue;
      so++;
      const xongB = xong.has(b.ma);
      const dangB = dang === b.ma;
      const n = nut.get(b.ma)!;
      cham.get(b.ma)!.textContent = xongB ? "✓" : String(so);
      n.classList.toggle("is-xong", xongB);
      if (dangB) n.setAttribute("aria-current", "step");
      else n.removeAttribute("aria-current");
      doc.get(b.ma)!.textContent = `, bước ${so}${xongB ? ", đã đủ thông tin" : ""}`;
    }
  };

  // Bước đang xem theo vị trí cuộn: đọc mép trên từng bước hiện, so với mép dưới thanh dính + đoạn đệm (`buocDangXem`). Gộp theo khung hình (rAF).
  let cho = false;
  const theoCuon = (): void => {
    cho = false;
    const hien = BUOC_TAO_DON.filter((b) => !an.has(b.ma) && o.phanTu(b.ma));
    if (hien.length === 0) return;
    const nguong = root.getBoundingClientRect().bottom + 24;
    const cuoiTrang = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const i = buocDangXem(hien.map((b) => o.phanTu(b.ma)!.getBoundingClientRect().top), nguong, cuoiTrang);
    const ma = hien[i]!.ma;
    if (ma !== dang) {
      dang = ma;
      ve();
    }
  };
  window.addEventListener("scroll", () => {
    if (cho) return;
    cho = true;
    requestAnimationFrame(theoCuon);
  }, { passive: true });
  window.addEventListener("resize", theoCuon);

  ve();
  return {
    root,
    datXong(x) {
      xong.clear();
      for (const b of BUOC_TAO_DON) if (x[b.ma]) xong.add(b.ma);
      ve();
    },
    an(ma, v) {
      if (v) an.add(ma);
      else an.delete(ma);
      ve();
    },
  };
}
