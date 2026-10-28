// Bảng trượt / hộp thoại dùng chung của phân hệ Vận chuyển (bản vẽ docs/design/van-chuyen-1a/project/bang-truot.dc.html) — khuôn `.sheet*` CÓ SẴN của
// public/app.css (điện thoại: trượt từ đáy; ≥641px: hộp giữa màn, rộng --w-sheet), cùng cách web/viec-cua-toi.ts và web/handler-sheet.ts: nền phía sau `inert`,
// Esc / chạm nền / ✕ đóng (trừ khi đang gửi), trả tiêu điểm về nút mở. Không innerHTML.
import { h, type Child } from "./dom";
import { icon } from "./icons";

export interface BangTruot {
  dialog: HTMLElement;
  body: HTMLElement;
  foot: HTMLElement;
  /** `restoreFocus` false khi nơi gọi sẽ dựng lại trang (nút mở bị thay). */
  close(restoreFocus?: boolean): void;
  /** Đang gửi: ✕ khoá, Esc / chạm nền không đóng (đóng giữa chừng thì lỗi máy chủ không còn chỗ hiện). */
  setBusy(busy: boolean): void;
}

let dem = 0;

export function moBangTruot(o: {
  title: string;
  body: Child[];
  foot: Child[];
  footClass?: string;
  opener?: HTMLElement | null;
  onClosed?: () => void;
  /** `alertdialog` cho hộp hỏi xác nhận (đọc to cả nội dung khi mở). Mặc định `dialog`. */
  vaiTro?: "dialog" | "alertdialog";
  /** Hộp xác nhận không có nút ✕ (đã có hai nút ở chân); Esc / chạm nền vẫn đóng. */
  khongNutDong?: true;
}): BangTruot | null {
  if (document.querySelector(".sheet-root")) return null; // bấm đúp không mở hai bảng
  const id = `vc-sheet-${++dem}`;
  let busy = false;
  let closed = false;
  const closeBtn = h("button", { type: "button", class: "btn btn-link sheet-close", "aria-label": "Đóng" }, icon("close", 20));
  const scrim = h("div", { class: "sheet-scrim" });
  const body = h("div", { class: "sheet-body" }, ...o.body);
  const foot = h("div", { class: `sheet-foot ${o.footClass ?? ""}`.trim() }, ...o.foot);
  const dialog = h(
    "div",
    { class: "sheet", role: o.vaiTro ?? "dialog", "aria-modal": "true", "aria-labelledby": `${id}-title`, tabindex: -1 },
    h("div", { class: "sheet-head" }, h("h2", { id: `${id}-title`, class: "sheet-title" }, o.title), o.khongNutDong ? null : closeBtn),
    body,
    foot,
  );
  const root = h("div", { class: "sheet-root" }, scrim, dialog);
  const background = [...document.body.children];
  const requestClose = (): void => {
    if (!busy) close();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") requestClose();
  };
  function close(restoreFocus = true): void {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKey);
    for (const el of background) el.removeAttribute("inert");
    document.body.classList.remove("sheet-open");
    root.remove();
    if (restoreFocus && o.opener?.isConnected) o.opener.focus();
    o.onClosed?.();
  }
  closeBtn.addEventListener("click", requestClose);
  scrim.addEventListener("click", requestClose);
  document.addEventListener("keydown", onKey);
  document.body.append(root);
  for (const el of background) el.setAttribute("inert", "");
  document.body.classList.add("sheet-open");
  dialog.focus();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("open")));
  return {
    dialog,
    body,
    foot,
    close,
    setBusy(value) {
      busy = value;
      closeBtn.disabled = value;
    },
  };
}

/** Hộp hỏi xác nhận một chiều thay `confirm()`: Esc / chạm nền / nút giữ → false; nút nguy hiểm → true; đang mở bảng khác → false (không làm gì). */
export function hoiXacNhan(o: { tieuDe: string; hauQua: string; nhanNguyHiem: string; nhanGiu?: string; opener?: HTMLElement | null }): Promise<boolean> {
  return new Promise((resolve) => {
    const giu = h("button", { type: "button", class: "btn" }, o.nhanGiu ?? "Giữ nguyên");
    const nguy = h("button", { type: "button", class: "btn btn-danger" }, o.nhanNguyHiem);
    let kq = false;
    const bang = moBangTruot({
      title: o.tieuDe,
      body: [h("div", { class: "sheet-canh-bao" }, icon("alertCircle", 24)), h("p", null, o.hauQua)],
      foot: [giu, nguy],
      footClass: "sheet-foot-xac-nhan",
      opener: o.opener,
      vaiTro: "alertdialog",
      khongNutDong: true,
      onClosed: () => resolve(kq),
    });
    if (!bang) return resolve(false);
    giu.addEventListener("click", () => bang.close());
    nguy.addEventListener("click", () => {
      kq = true;
      bang.close();
    });
  });
}
