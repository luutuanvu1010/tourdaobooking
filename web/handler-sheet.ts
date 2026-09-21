// Bảng trượt "Đổi người phụ trách" (v1.0, Task 8; đặc tả "Việc 3 → Giao diện") — cùng khuôn với trip-sheet.ts và dùng chung CSS `.sheet*`: ≤ 640px trượt từ đáy, > 640px hộp giữa màn hình;
// role=dialog + aria-modal, phần nền `inert`, Esc / ✕ / chạm nền để đóng, trả focus về nút mở. Danh sách người có thể nhận phụ trách lấy từ GET /api/dispatch/assignees khi mở bảng
// (chỉ tên, đã lọc ở máy chủ: đang hoạt động, có hồ sơ, có quyền Bán hàng/Quản trị); chọn một người rồi "Lưu người phụ trách" → PUT /api/orders/:id/handler.
// KHÓA KHI ĐANG LƯU: nút, danh sách và ✕ khoá, Esc/chạm nền không đóng (đóng giữa chừng thì lỗi của máy chủ không còn chỗ hiện và người dùng tưởng đã huỷ).
// Máy chủ từ chối vì màn hình đã cũ (409 stale/no_change, 403) → bảng đóng và nơi gọi tải lại đơn kèm thông báo (`onOutdated`); lỗi khác (vd người vừa nghỉ, 400) → thông báo ngay trong bảng
// và danh sách được tải lại. Không có test tự động cho tệp này (như trip-sheet.ts): bằng chứng là docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs. Luật thuần (câu báo lỗi) ở src/shared/handler-view.ts.
import type { AssigneeDto, HandlerDto } from "../src/shared/contracts";
import type { Banner } from "../src/shared/order-errors";
import { handlerFailure } from "../src/shared/handler-view";
import { ApiError, api, type Api, type Order } from "./api";
import { renderBanner } from "./banner";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";

export interface HandlerSheetOptions {
  order: Order;
  /** Người phụ trách hiện tại (null = chưa có): hàng của người đó bị khoá và có nhãn "Đang phụ trách". */
  current: HandlerDto | null;
  /** Lưu thành công: bảng đã đóng; nơi gọi tải lại đơn rồi báo. */
  onSaved: (handler: HandlerDto) => void;
  /** Màn hình đã lỗi thời (409, 403): bảng đã đóng; nơi gọi tải lại đơn rồi hiện `banner`. */
  onOutdated: (banner: Banner) => void;
}

export function openHandlerSheet(o: HandlerSheetOptions, opener: HTMLElement): void {
  if (document.querySelector(".handler-root")) return; // bấm đúp không mở hai bảng
  let saving = false;
  let closed = false;
  let loadSeq = 0;
  let chosen: AssigneeDto | null = null;

  const bannerEl = h("div", { class: "banner", role: "alert", hidden: true });
  const listSlot = h("div", { class: "pick-slot" });
  const saveBtn = h("button", { type: "button", class: "btn btn-primary btn-block", disabled: true }, "Lưu người phụ trách");
  const closeBtn = h("button", { type: "button", class: "btn btn-link sheet-close", "aria-label": "Đóng" }, icon("close", 20));
  const scrim = h("div", { class: "sheet-scrim" });
  const dialog = h(
    "div",
    { class: "sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "handler-sheet-title", tabindex: -1 },
    h("div", { class: "sheet-head" }, h("h2", { id: "handler-sheet-title", class: "sheet-title" }, o.current === null ? "Chọn người phụ trách" : "Đổi người phụ trách"), closeBtn),
    h("div", { class: "sheet-body" }, h("p", { class: "pick-hint" }, "Người phụ trách chăm sóc khách và sửa được đơn này."), bannerEl, listSlot),
    h("div", { class: "sheet-foot" }, saveBtn),
  );
  const root = h("div", { class: "sheet-root handler-root" }, scrim, dialog);

  const background = [...document.body.children]; // mọi thứ đang có trên trang → inert khi bảng mở
  /** Đóng do người dùng (✕, chạm nền, Esc): KHÔNG đóng khi đang lưu. */
  const requestClose = (): void => {
    if (!saving) close();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") requestClose();
  };
  /** `restoreFocus` false khi nơi gọi sẽ tải lại đơn (nút mở bị dựng lại — nơi gọi tự trả focus). */
  function close(restoreFocus = true): void {
    if (closed) return;
    closed = true;
    loadSeq++; // danh sách đến muộn bị bỏ
    document.removeEventListener("keydown", onKey);
    for (const el of background) el.removeAttribute("inert");
    document.body.classList.remove("sheet-open");
    root.remove();
    if (restoreFocus && opener.isConnected) opener.focus();
  }

  const fieldset = (): HTMLFieldSetElement | null => listSlot.querySelector("fieldset");
  /** Khoá/mở toàn bộ khi đang lưu: nút Lưu (đổi chữ), danh sách, ✕. Focus giữ trong bảng (nút đang focus bị khoá sẽ làm focus rơi ra `body`). */
  function setSaving(value: boolean): void {
    saving = value;
    saveBtn.textContent = value ? "Đang lưu…" : "Lưu người phụ trách";
    saveBtn.disabled = value || chosen === null;
    closeBtn.disabled = value;
    const set = fieldset();
    if (set) set.disabled = value;
    if (value) dialog.focus();
    else if (!saveBtn.disabled) saveBtn.focus();
  }

  function renderRow(a: AssigneeDto): HTMLElement {
    const isCurrent = o.current !== null && o.current.partyId === a.partyId; // máy chủ so theo hồ sơ (party): cùng người = 409 no_change
    const input = h("input", { type: "radio", name: "assignee", value: a.staffId, disabled: isCurrent });
    input.addEventListener("change", () => {
      chosen = a;
      saveBtn.disabled = saving;
      renderBanner(bannerEl, null);
    });
    return h(
      "label",
      { class: isCurrent ? "pick is-current" : "pick" },
      input,
      h("span", { class: "pick-mark", "aria-hidden": "true" }),
      h("span", { class: "pick-name" }, a.name),
      isCurrent ? h("span", { class: "chip chip-unit pick-current" }, "Đang phụ trách") : null,
    );
  }

  function showList(list: readonly AssigneeDto[]): void {
    chosen = null;
    saveBtn.disabled = true;
    if (list.length === 0) {
      replaceChildren(listSlot, h("p", { class: "pick-empty" }, "Chưa có nhân viên nào có thể nhận phụ trách."));
      return;
    }
    replaceChildren(listSlot, h("fieldset", { class: "pick-list" }, h("legend", { class: "pick-legend" }, "Chọn người phụ trách mới"), ...list.map(renderRow)));
  }

  function showLoadError(): void {
    chosen = null;
    saveBtn.disabled = true;
    const retry = h("button", { type: "button", class: "btn" }, "Thử lại");
    retry.addEventListener("click", () => void loadList());
    replaceChildren(
      listSlot,
      h(
        "div",
        { class: "banner banner-danger", role: "alert" },
        h("div", { class: "banner-title" }, "Chưa tải được danh sách nhân viên."),
        h("p", { class: "pick-error-text" }, "Kiểm tra kết nối mạng rồi bấm “Thử lại”."),
        h("div", { class: "banner-actions" }, retry),
      ),
    );
    if (dialog.contains(document.activeElement) || document.activeElement === document.body) retry.focus();
  }

  async function loadList(): Promise<void> {
    const mine = ++loadSeq;
    chosen = null;
    saveBtn.disabled = true;
    replaceChildren(listSlot, h("p", { class: "pick-status", role: "status" }, "Đang tải danh sách nhân viên…"));
    try {
      const { assignees } = await api<Api.AssigneesResponse>("/api/dispatch/assignees");
      if (closed || mine !== loadSeq) return;
      showList(assignees);
    } catch {
      if (closed || mine !== loadSeq) return;
      showLoadError();
    }
  }

  async function save(): Promise<void> {
    if (saving || chosen === null) return;
    const target = chosen;
    renderBanner(bannerEl, null);
    setSaving(true);
    try {
      const res = await api<Api.SetHandlerResponse>(`/api/orders/${encodeURIComponent(o.order.id)}/handler`, { method: "PUT", body: { staffId: target.staffId } });
      close(false);
      o.onSaved(res.handler);
    } catch (err) {
      setSaving(false); // đặt lại TRƯỚC khi vẽ banner: nếu bước vẽ ném lỗi thì bảng vẫn không kẹt "Đang lưu…"
      const failure = handlerFailure(err instanceof ApiError ? { status: err.status, code: err.code, message: err.message } : null, "assign");
      if (failure.reload) {
        close(false);
        o.onOutdated(failure.banner);
        return;
      }
      renderBanner(bannerEl, failure.banner);
      bannerEl.scrollIntoView({ block: "nearest" });
      if (err instanceof ApiError && err.code === "invalid_assignee") void loadList(); // người được chọn vừa nghỉ/mất quyền: làm mới danh sách
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
  void loadList();
}
