// Khối giao diện dùng chung của ba màn tiền xe thuê (bản vẽ Đợt 4 "Chi phí xe thuê"): form nội tuyến ở máy tính (thẻ nền --c-soft-hover, như bản vẽ) / tấm đáy ở
// điện thoại (`moBangTruot`), ô có nhãn, dải lỗi hiện NGUYÊN VĂN câu máy chủ. Chữ / nhãn thuần ở src/shared/tien-xe-hien-thi.ts. Không innerHTML, không tính tiền.
import type { ToneTienXe } from "../src/shared/tien-xe-hien-thi";
import { ApiError } from "./api";
import { moBangTruot } from "./bang-truot";
import { chip, LOI_MANG } from "./dieu-phoi-ui";
import { h, replaceChildren, type Child } from "./dom";
import { icon } from "./icons";

/** Bảng nhiều cột / form nội tuyến từ 900px (cùng mốc `.table-wrap`); hẹp hơn: thẻ dọc + tấm đáy. */
export const laMayTinh = (): boolean => matchMedia("(min-width: 900px)").matches;

export const chipTx = (nhan: string, tone: ToneTienXe): HTMLElement => chip(nhan, tone);

/** Câu lỗi cho người dùng: câu máy chủ nguyên văn (ApiError), mất mạng → câu chung. */
export const cauLoi = (e: unknown): string => (e instanceof ApiError ? e.message : LOI_MANG);

/** Một ô có nhãn (khuôn `.vc-field`). `batBuoc` thêm " *" như bản vẽ. */
export function o(idO: string, nhan: string, el: HTMLElement, opt: { batBuoc?: boolean; goiY?: HTMLElement | string | null; rong?: boolean } = {}): HTMLElement {
  el.id = idO;
  const goiY = typeof opt.goiY === "string" ? h("div", { class: "vc-hint" }, opt.goiY) : (opt.goiY ?? null);
  return h("div", { class: `vc-field tx-o${opt.rong ? " tx-o-rong" : ""}` }, h("label", { for: idO }, `${nhan}${opt.batBuoc ? " *" : ""}`), el, goiY);
}

/** Dải lỗi trong form (ẩn tới khi có lỗi). */
export function daiLoi(): { el: HTMLElement; hien(cau: string | null): void } {
  const el = h("div", { class: "banner banner-danger tx-loi", role: "alert", hidden: true });
  return {
    el,
    hien(cau) {
      replaceChildren(el, ...(cau ? [h("div", { class: "banner-title" }, cau)] : []));
      el.hidden = !cau;
    },
  };
}

export interface FormTienXe {
  close(): void;
  setBusy(busy: boolean): void;
}

/**
 * Mở một form: máy tính = thẻ nội tuyến đặt vào `host` (thay nội dung cũ của `host`); điện thoại = tấm đáy. `nut` là các nút chính (đặt cạnh nút "Đóng").
 * Trả null nếu không mở được (tấm đáy khác đang mở).
 */
export function moForm(o2: { tieuDe: string; body: Child[]; nut: HTMLButtonElement[]; host: HTMLElement; opener?: HTMLElement | null; onClosed?: () => void }): FormTienXe | null {
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "dong-form" }, "Đóng");
  if (laMayTinh()) {
    const the = h("section", { class: "tx-form", "aria-label": o2.tieuDe }, h("h3", { class: "tx-form-title" }, o2.tieuDe), h("div", { class: "tx-form-o" }, ...o2.body), h("div", { class: "tx-form-nut" }, ...o2.nut, dong));
    replaceChildren(o2.host, the);
    o2.host.hidden = false;
    let busy = false;
    const close = (): void => {
      if (busy) return;
      replaceChildren(o2.host);
      o2.host.hidden = true;
      if (o2.opener?.isConnected) o2.opener.focus();
      o2.onClosed?.();
    };
    dong.addEventListener("click", close);
    the.scrollIntoView({ block: "nearest" });
    (the.querySelector("input:not([disabled]), select:not([disabled]), textarea") as HTMLElement | null)?.focus();
    return {
      close() {
        busy = false;
        close();
      },
      setBusy(b) {
        busy = b;
        dong.disabled = b;
      },
    };
  }
  const bang = moBangTruot({ title: o2.tieuDe, body: o2.body, foot: [dong, ...o2.nut], footClass: "vc-foot-2", opener: o2.opener, onClosed: o2.onClosed });
  if (!bang) return null;
  dong.addEventListener("click", () => bang.close());
  return { close: () => bang.close(), setBusy: (b) => bang.setBusy(b) };
}

/** Nút chính có trạng thái "đang gửi". */
export function nutGui(nhan: string, lop: string, action: string): HTMLButtonElement {
  const b = h("button", { type: "button", class: `vc-btn ${lop}`, "data-action": action }, nhan);
  b.dataset.nhan = nhan;
  return b;
}
export function dangGui(b: HTMLButtonElement, gui: boolean): void {
  b.disabled = gui;
  b.textContent = gui ? "Đang lưu…" : (b.dataset.nhan ?? "");
}

/** Trạng thái trống (khuôn `.vc-empty`). */
export const trong = (tieuDe: string, loi: string, them: Child = null): HTMLElement =>
  h("div", { class: "vc-empty tx-trong" }, h("div", { class: "vc-empty-title" }, tieuDe), loi ? h("div", { class: "vc-empty-text" }, loi) : null, them);

/** Đang tải. */
export const dangTai = (): HTMLElement => h("div", { class: "tx-tai", role: "status" }, "Đang tải…");

/** Lỗi tải + nút "Thử lại". */
export function loiTai(cau: string, thuLai: () => void): HTMLElement {
  const b = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "thu-lai" }, "Thử lại");
  b.addEventListener("click", thuLai);
  return h("div", { class: "banner banner-danger", role: "alert" }, h("div", { class: "banner-title" }, icon("alert", 16, 2), " ", cau), h("div", { class: "banner-actions" }, b));
}
