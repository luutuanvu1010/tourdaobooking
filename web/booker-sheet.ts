// Bảng "Đổi khách" (N2 lát 1, ADR-0011 điều 2) — cho đơn ĐÃ XÁC NHẬN (đơn nháp đổi khách trong form). Tên + SĐT trên đơn + khối "Hồ sơ khách";
// lưu bằng PUT /api/orders/:id/booker (khoá lạc quan theo `updatedAt`). Khuôn modal như web/trip-sheet.ts.
import { ApiError, api, type Order } from "./api";
import { renderBanner } from "./banner";
import { createBookerPicker } from "./booker-picker";
import { oDatQuaDoiTac } from "./dat-qua-doi-tac";
import { h } from "./dom";
import { vnd } from "./format";
import { icon } from "./icons";
import { NETWORK_BANNER, banner, classifyOrderError, type Banner } from "../src/shared/order-errors";
import { gopBenDat, noiNapBenDat, type BenDatChon } from "../src/shared/phan-doi-tac-hien-thi";

export interface BookerSheetOptions {
  order: Order;
  /** Có ô "Đặt qua đối tác" không (sổ đại lý đợt 1, Task 11): `coODatQuaDoiTac(staff)` — người lập đơn không giữ quyền Đối tác; tài khoản lai KHÔNG có. Máy chủ vẫn kiểm lại. */
  coDatQuaDoiTac: boolean;
  /** Lưu thành công: bảng đã đóng; nơi gọi tải lại đơn. */
  onSaved: () => void;
  /** Nút "Tải lại đơn" trong banner: bảng đã đóng; nơi gọi tải lại đơn. */
  onReload: () => void;
}

export function openBookerSheet(o: BookerSheetOptions, opener: HTMLElement): void {
  let saving = false;
  const nameInput = h("input", { type: "text", maxLength: 200, autocomplete: "off", value: o.order.customerName });
  const phoneInput = h("input", { type: "tel", inputMode: "tel", maxLength: 30, autocomplete: "off", value: o.order.customerPhone });
  const picker = createBookerPicker({ name: nameInput, phone: phoneInput });
  // Bên đặt đang lưu là đối tác (cờ `bookerLaDoiTac` do MÁY CHỦ tính) và người sửa có ô "Đặt qua đối tác" ⇒ nạp vào ô đó, không vào ô tra SĐT (đặc tả §7); đã chọn thì ô tra SĐT ẩn.
  let daChon: BenDatChon | null = null;
  const datQua = o.coDatQuaDoiTac
    ? oDatQuaDoiTac({
        daChon: null,
        onDoi: (c) => {
          daChon = c;
          picker.root.hidden = c !== null;
        },
      })
    : null;
  if (datQua && noiNapBenDat({ coODatQua: true, bookerLaDoiTac: o.order.bookerLaDoiTac, bookerPartyId: o.order.bookerPartyId }) === "dat-qua" && o.order.bookerPartyId) {
    daChon = { partyId: o.order.bookerPartyId, ten: o.order.bookerName ?? "" };
    datQua.datChon(daChon);
    picker.root.hidden = true;
  } else picker.set(o.order.bookerPartyId, o.order.bookerName);

  const bannerEl = h("div", { class: "banner", role: "alert", hidden: true });
  const saveBtn = h("button", { type: "button", class: "btn btn-primary btn-block" }, "Lưu khách");
  const closeBtn = h("button", { type: "button", class: "btn btn-link sheet-close", "aria-label": "Đóng" }, icon("close", 20));
  const scrim = h("div", { class: "sheet-scrim" });

  const dialog = h(
    "div",
    { class: "sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "booker-sheet-title", tabindex: -1 },
    h("div", { class: "sheet-head" }, h("h2", { id: "booker-sheet-title", class: "sheet-title" }, "Đổi khách"), closeBtn),
    h(
      "div",
      { class: "sheet-body" },
      h("p", { class: "sheet-warn" }, icon("alert", 18), "Bản xác nhận đã gửi khách trước đó có thể lỗi thời — cần gửi lại."),
      bannerEl,
      h("label", null, "Tên khách *", nameInput),
      h("label", null, "Số điện thoại *", phoneInput),
      datQua,
      picker.root,
    ),
    h("div", { class: "sheet-foot" }, saveBtn),
  );
  const root = h("div", { class: "sheet-root" }, scrim, dialog);

  const background = [...document.body.children];
  const requestClose = (): void => {
    if (!saving) close();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") requestClose();
  };
  function close(restoreFocus = true): void {
    document.removeEventListener("keydown", onKey);
    for (const el of background) el.removeAttribute("inert");
    document.body.classList.remove("sheet-open");
    root.remove();
    if (restoreFocus && opener.isConnected) opener.focus();
  }

  const errorBanner = (err: unknown): Banner => {
    if (!(err instanceof ApiError)) return NETWORK_BANNER;
    const b = classifyOrderError({ status: err.status, code: err.code, message: err.message, details: err.details }, { serviceNames: o.order.services.map((s) => s.name), formatMoney: vnd });
    return b.action === "lock_form" ? { ...b, action: "reload_order" } : b;
  };

  async function save(): Promise<void> {
    if (saving) return;
    if (!nameInput.value.trim() || !phoneInput.value.trim()) {
      renderBanner(bannerEl, banner("danger", "Nhập tên và số điện thoại khách."));
      return;
    }
    saving = true;
    saveBtn.disabled = true;
    saveBtn.textContent = "Đang lưu…";
    renderBanner(bannerEl, null);
    try {
      await api(`/api/orders/${encodeURIComponent(o.order.id)}/booker`, {
        method: "PUT",
        body: { customerName: nameInput.value, customerPhone: phoneInput.value, ...gopBenDat({ chiDoc: null, daChon, tra: picker.payload() }), expectedUpdatedAt: o.order.updatedAt },
      });
      close(false);
      o.onSaved();
    } catch (err) {
      saving = false;
      saveBtn.disabled = false;
      saveBtn.textContent = "Lưu khách";
      renderBanner(bannerEl, errorBanner(err), {
        reloadOrder: () => {
          close(false);
          o.onReload();
        },
        reloadPage: () => location.reload(),
      });
      bannerEl.scrollIntoView({ block: "nearest" });
    }
  }

  saveBtn.addEventListener("click", () => void save());
  closeBtn.addEventListener("click", requestClose);
  scrim.addEventListener("click", requestClose);
  document.addEventListener("keydown", onKey);

  document.body.append(root);
  for (const el of background) el.setAttribute("inert", "");
  document.body.classList.add("sheet-open");
  dialog.focus();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("open")));
}
