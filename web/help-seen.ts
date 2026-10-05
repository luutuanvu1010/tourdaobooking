// Nhớ "đã xem nhật ký thay đổi" THEO TỪNG MÁY (localStorage, không lên máy chủ — đặc tả §3.3). localStorage bị chặn/ném lỗi ⇒ coi như ĐÃ xem (không chấm, không lỗi).
import { hasUnseenRelease } from "../src/shared/phien-ban";
import { h } from "./dom";
import { APP_VERSION } from "./phien-ban";

const KEY = "td_help_seen";

export function readHelpSeen(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return APP_VERSION;
  }
}

export function markHelpSeen(version: string): void {
  try {
    localStorage.setItem(KEY, version);
  } catch {
    /* bị chặn: bỏ qua, lần sau vẫn không hiện chấm vì readHelpSeen coi như đã xem */
  }
}

export function helpHasNews(): boolean {
  return hasUnseenRelease(readHelpSeen(), APP_VERSION);
}

/** Chấm đỏ nhỏ báo có bản mới. */
export function newDot(): HTMLElement {
  return h("span", { class: "new-dot", role: "img", "aria-label": "Có bản mới" });
}
