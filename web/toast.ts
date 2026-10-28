// Thông báo nổi của Bảng tin (ADR-0022, TD-4): vùng `div.toast-vung` (aria-live="polite") gắn MỘT lần vào body; mỗi thông báo là một `.toast[data-tong]` (Bảng tin: liên kết `a.toast`; báo ngắn: `div.toast`) dựng bằng h() (không innerHTML), tự ẩn sau ~6 giây, tối đa 3 cái cùng lúc (cái cũ nhất bị đẩy ra). Quyết định "có hiện không / câu gì /
// bấm đi đâu" nằm ở src/shared/bang-tin.ts (thongBaoNoi); ở đây chỉ vẽ.
import type { ThongBaoNoi } from "../src/shared/bang-tin.ts";
import { ganThongBao } from "./bangtin-logic.ts";
import { h } from "./dom.ts";
import { icon } from "./icons.ts";

export const TU_AN_NGAN_MS = 3000;
export const TU_AN_HOAN_TAC_MS = 5000;
export const TU_AN_MS = 6000; // Bảng tin
const hienCo: HTMLElement[] = [];
let vung: HTMLElement | null = null;

function vungThongBao(): HTMLElement {
  if (vung && vung.isConnected) return vung;
  vung = h("div", { class: "toast-vung", "aria-live": "polite", "aria-atomic": "false" });
  document.body.append(vung);
  return vung;
}

/** Tạo sẵn vùng aria-live RỖNG lúc khởi động (nhiều trình đọc màn hình bỏ qua vùng vừa được chèn cùng lúc với nội dung). */
export function chuanBiVungThongBao(): void {
  vungThongBao();
}

function go(el: HTMLElement): void {
  const i = hienCo.indexOf(el);
  if (i >= 0) hienCo.splice(i, 1);
  el.remove();
}

function dua(el: HTMLElement, ms: number): void {
  const { con, bo } = ganThongBao(hienCo, el);
  for (const cu of bo) cu.remove();
  hienCo.splice(0, hienCo.length, ...con);
  vungThongBao().append(el);
  setTimeout(() => go(el), ms);
}

export function hienThongBao(tb: ThongBaoNoi): void {
  dua(h("a", { class: "toast", "data-tong": "bien", href: tb.lienKet }, h("span", { class: "toast-cau" }, tb.cau)), TU_AN_MS);
}

/**
 * Báo ngắn KHÔNG phải liên kết (form lập đơn, "Lần bấm trước đã được ghi."): `div.toast[data-tong]` nền tối, hình theo tông (lá = dấu tích, đỏ = chấm than),
 * tự tắt sau 3 giây; có `hoanTac` thì 5 giây và bấm được (lớp `toast-bam-duoc`). Cùng vùng aria-live và trần 3 cái như Bảng tin.
 */
export function hienBaoNgan(cau: string, o: { tong?: "la" | "do" | "bien" | "cat"; hoanTac?: { nhan?: string; khiBam: () => void } } = {}): void {
  const tong = o.tong ?? "la";
  const el = h(
    "div",
    { class: o.hoanTac ? "toast toast-bam-duoc" : "toast", "data-tong": tong },
    icon(tong === "do" ? "alertCircle" : "check", 18),
    h("span", { class: "toast-cau" }, cau),
    o.hoanTac && h("button", { type: "button", class: "toast-hoan-tac", onclick: () => o.hoanTac!.khiBam() }, o.hoanTac.nhan ?? "Hoàn tác"),
    h("button", { type: "button", class: "toast-dong", "aria-label": "Đóng", onclick: () => go(el) }, icon("close", 16)),
  );
  dua(el, o.hoanTac ? TU_AN_HOAN_TAC_MS : TU_AN_NGAN_MS);
}
