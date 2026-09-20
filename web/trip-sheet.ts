// Bảng trượt "Sửa thông tin chuyến" (A2, đặc tả 5.3) — CHỈ cho đơn đã xác nhận (đơn nháp sửa mọi thứ trong form). Mỗi dịch vụ một nhóm ô điền sẵn ĐẦY ĐỦ giá trị hiện có,
// vì PUT /api/orders/:id/trip thay TOÀN BỘ (trường vắng = xoá) và phải gửi MỌI dịch vụ. ≤ 640px trượt từ đáy; > 640px hộp giữa màn hình.
// Hộp thoại kiểu modal: role=dialog + aria-modal, phần nền `inert`, Esc / ✕ / chạm nền để đóng, trả focus về nút mở.
import { ApiError, api, type Order } from "./api";
import { renderBanner } from "./banner";
import { h, replaceChildren } from "./dom";
import { vnd } from "./format";
import { icon } from "./icons";
import { tripFields } from "./trip-fields";
import type { TripInput } from "../src/shared/contracts";
import { NETWORK_BANNER, classifyOrderError, type Banner } from "../src/shared/order-errors";
import { tripFromDto, tripPayload, tripSheetIssues } from "../src/shared/trip-form";
import { vnToday } from "../src/shared/vn-date";

export interface TripSheetOptions {
  order: Order;
  /** Lưu thành công: bảng đã đóng; nơi gọi tải lại đơn. */
  onSaved: () => void;
  /** Nút "Tải lại đơn" trong banner (đơn đã đổi ở nơi khác): bảng đã đóng; nơi gọi tải lại đơn. */
  onReload: () => void;
}

interface Row {
  id: string;
  name: string;
  savedDepartDate: string | null;
  trip: TripInput;
}

export function openTripSheet(o: TripSheetOptions, opener: HTMLElement): void {
  const rows: Row[] = o.order.services.map((s) => ({ id: s.id, name: s.name, savedDepartDate: s.departDate, trip: tripFromDto(s) }));
  let saving = false;
  let attempted = false;

  const bannerEl = h("div", { class: "banner", role: "alert", hidden: true });
  const issuesEl = h("div", { class: "field-errors", "aria-live": "polite" });
  const saveBtn = h("button", { type: "button", class: "btn btn-primary btn-block" }, "Lưu thông tin chuyến");
  const closeBtn = h("button", { type: "button", class: "btn btn-link sheet-close", "aria-label": "Đóng" }, icon("close", 20));
  const scrim = h("div", { class: "sheet-scrim" });

  /** Vẽ lỗi chặn Lưu (chữ + biểu tượng, không chỉ màu); trả số lỗi. */
  const showIssues = (): number => {
    const issues = tripSheetIssues(rows, vnToday(new Date()));
    replaceChildren(issuesEl, ...issues.map((t) => h("p", { class: "field-error" }, icon("alert", 16), t)));
    return issues.length;
  };

  const groups = rows.map((r) => {
    const f = tripFields({
      trip: r.trip,
      dateLabel: "Ngày khởi hành (không được xoá)",
      onChange: (t) => {
        r.trip = t;
        if (attempted) showIssues(); // đã bấm Lưu một lần: lỗi cập nhật theo từng lần gõ
      },
    });
    return h("section", { class: "sheet-svc" }, h("h3", { class: "svc-name" }, r.name), f.root);
  });

  const dialog = h(
    "div",
    { class: "sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "trip-sheet-title", tabindex: -1 },
    h("div", { class: "sheet-head" }, h("h2", { id: "trip-sheet-title", class: "sheet-title" }, "Sửa thông tin chuyến"), closeBtn),
    h("div", { class: "sheet-body" }, h("p", { class: "sheet-warn" }, icon("alert", 18), "Bản xác nhận đã gửi khách trước đó có thể lỗi thời — cần gửi lại."), bannerEl, ...groups),
    h("div", { class: "sheet-foot" }, issuesEl, saveBtn),
  );
  const root = h("div", { class: "sheet-root" }, scrim, dialog);

  const background = [...document.body.children]; // mọi thứ đang có trên trang → inert khi bảng mở
  /** Đóng do người dùng (✕, chạm nền, Esc): KHÔNG đóng khi đang lưu — nếu đóng, lỗi của máy chủ không còn chỗ hiển thị và người dùng tưởng đã huỷ. */
  const requestClose = (): void => {
    if (!saving) close();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") requestClose();
  };
  /** `restoreFocus` false khi nơi gọi sẽ tải lại đơn (nút mở bị dựng lại — nơi gọi tự trả focus). */
  function close(restoreFocus = true): void {
    document.removeEventListener("keydown", onKey);
    for (const el of background) el.removeAttribute("inert");
    document.body.classList.remove("sheet-open");
    root.remove();
    if (restoreFocus && opener.isConnected) opener.focus();
  }

  /** Lỗi máy chủ → banner (ma trận đặc tả 5.2). Đơn không còn sửa được (vd vừa bị huỷ ở nơi khác) → cho nút "Tải lại đơn" để thấy trạng thái mới. */
  const errorBanner = (err: unknown): Banner => {
    if (!(err instanceof ApiError)) return NETWORK_BANNER;
    const b = classifyOrderError({ status: err.status, code: err.code, message: err.message, details: err.details }, { serviceNames: rows.map((r) => r.name), formatMoney: vnd });
    return b.action === "lock_form" ? { ...b, action: "reload_order" } : b;
  };

  async function save(): Promise<void> {
    if (saving) return;
    attempted = true;
    if (showIssues() > 0) return; // chặn phía trình duyệt; không gửi gì lên máy chủ
    saving = true;
    saveBtn.disabled = true;
    saveBtn.textContent = "Đang lưu…";
    renderBanner(bannerEl, null);
    try {
      await api(`/api/orders/${encodeURIComponent(o.order.id)}/trip`, { method: "PUT", body: tripPayload(rows, o.order.updatedAt) });
      close(false);
      o.onSaved();
    } catch (err) {
      renderBanner(bannerEl, errorBanner(err), {
        reloadOrder: () => {
          close(false);
          o.onReload();
        },
        reloadPage: () => location.reload(),
      });
      bannerEl.scrollIntoView({ block: "nearest" });
      saving = false;
      saveBtn.disabled = false;
      saveBtn.textContent = "Lưu thông tin chuyến";
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
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("open"))); // hai khung hình: trạng thái đầu được vẽ trước khi chuyển động chạy
}
