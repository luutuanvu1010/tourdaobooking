// Thông báo nổi của Bảng tin (ADR-0022, TD-4): vùng `div.toast-vung` (aria-live="polite") gắn MỘT lần vào body; mỗi thông báo là một liên kết
// `a.toast` dựng bằng h() (không innerHTML), tự ẩn sau ~6 giây, tối đa 3 cái cùng lúc (cái cũ nhất bị đẩy ra). Quyết định "có hiện không / câu gì /
// bấm đi đâu" nằm ở src/shared/bang-tin.ts (thongBaoNoi); ở đây chỉ vẽ.
import type { ThongBaoNoi } from "../src/shared/bang-tin";
import { ganThongBao } from "./bangtin-logic";
import { h } from "./dom";

const TU_AN_MS = 6000;
const hienCo: HTMLElement[] = [];
let vung: HTMLElement | null = null;

function vungThongBao(): HTMLElement {
  if (vung && vung.isConnected) return vung;
  vung = h("div", { class: "toast-vung", "aria-live": "polite", "aria-atomic": "false" });
  document.body.append(vung);
  return vung;
}

function go(el: HTMLElement): void {
  const i = hienCo.indexOf(el);
  if (i >= 0) hienCo.splice(i, 1);
  el.remove();
}

export function hienThongBao(tb: ThongBaoNoi): void {
  const el = h("a", { class: "toast", href: tb.lienKet }, tb.cau);
  const { con, bo } = ganThongBao(hienCo, el);
  for (const cu of bo) cu.remove();
  hienCo.splice(0, hienCo.length, ...con);
  vungThongBao().append(el);
  setTimeout(() => go(el), TU_AN_MS);
}
