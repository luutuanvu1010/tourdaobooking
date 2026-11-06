// Bảng trượt "Đổi Hướng dẫn viên" / "Đổi người phụ trách" (v1.0, Task 8; ADR-0142 + quyết định chủ 5/11: mỗi đơn có HAI vai — `kieu: "hdv"` là ô cũ `HANDLE`, `kieu: "ban-hang"` là người phụ trách mới, PUT …/ban-hang; đặc tả "Việc 3 → Giao diện") — cùng khuôn với trip-sheet.ts và dùng chung CSS `.sheet*`: ≤ 640px trượt từ đáy, > 640px hộp giữa màn hình;
// role=dialog + aria-modal, phần nền `inert`, Esc / ✕ / chạm nền để đóng, trả focus về nút mở. Danh sách người có thể nhận phụ trách lấy từ GET /api/dispatch/assignees khi mở bảng
// (chỉ tên, đã lọc ở máy chủ bằng `checkAssignee`: đang hoạt động, có hồ sơ, không mang quyền Đối tác, có quyền Bán hàng/Quản trị/Toàn quyền HOẶC Hướng dẫn
// viên — ADR-0030, Task 1.1); chọn một người rồi "Lưu người phụ trách" → PUT /api/orders/:id/handler. Chọn người ngay lúc LẬP đơn là bảng khác:
// `web/assignee-picker.ts` (không gọi API ghi, chọn xong chỉ lưu vào form).
// KHÓA KHI ĐANG LƯU: nút, danh sách và ✕ khoá, Esc/chạm nền không đóng (đóng giữa chừng thì lỗi của máy chủ không còn chỗ hiện và người dùng tưởng đã huỷ).
// Máy chủ từ chối vì màn hình đã cũ (409 stale/no_change, 403) → bảng đóng và nơi gọi tải lại đơn kèm thông báo (`onOutdated`); lỗi khác (vd người vừa nghỉ, 400) → thông báo ngay trong bảng
// và danh sách được tải lại. Không có test tự động cho tệp này (như trip-sheet.ts): bằng chứng là docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs. Luật thuần (câu báo lỗi) ở src/shared/handler-view.ts.
import { laNhomHdv } from "../src/shared/assignee-pick";
import type { AssigneeDto, BanHangGhiResponse, BanHangMoiResponse } from "../src/shared/contracts";
import { banHangFailure } from "../src/shared/ban-hang-view";
import type { Banner } from "../src/shared/order-errors";
import { dongTuChoiTruoc, handlerFailure } from "../src/shared/handler-view";
import { ApiError, api, type Api, type Order } from "./api";
import { renderBanner } from "./banner";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";

export interface HandlerSheetOptions {
  order: Order;
  /** "hdv" (mặc định) = Hướng dẫn viên của đơn; "ban-hang" = người phụ trách (Bán hàng). */
  kieu?: "hdv" | "ban-hang";
  /** Người hiện tại (null = chưa có): hàng của người đó bị khoá và có nhãn. Hướng dẫn viên so theo hồ sơ (`partyId`), người phụ trách so theo tài khoản (`staffId`). */
  current: { name: string; partyId?: string; staffId?: string | null } | null;
  /** Lưu thành công: bảng đã đóng; nơi gọi tải lại đơn rồi báo (`name` = tên người vừa được đặt). */
  onSaved: (name: string) => void;
  /** Màn hình đã lỗi thời (409, 403): bảng đã đóng; nơi gọi tải lại đơn rồi hiện `banner`. */
  onOutdated: (banner: Banner) => void;
}

export function openHandlerSheet(o: HandlerSheetOptions, opener: HTMLElement): void {
  if (document.querySelector(".handler-root")) return; // bấm đúp không mở hai bảng
  let saving = false;
  let closed = false;
  let loadSeq = 0;
  let chosen: AssigneeDto | null = null;
  const bh = o.kieu === "ban-hang";
  // Chữ của hai vai (chủ dự án 5/11): «Hướng dẫn viên» là người đón, hướng dẫn khách, thu tiền tại cảng; người phụ trách là Bán hàng chịu trách nhiệm chính cho đơn.
  const chu = bh
    ? { chon: "Chọn người phụ trách", doi: "Đổi người phụ trách", luu: "Lưu người phụ trách", goiY: "Người phụ trách chịu trách nhiệm chính cho đơn này.", moi: "Chọn người phụ trách mới", rong: "Chưa có Bán hàng nào có thể nhận phụ trách.", dang: "Đang phụ trách", ten: "danh sách Bán hàng" }
    : { chon: "Chọn Hướng dẫn viên", doi: "Đổi Hướng dẫn viên", luu: "Lưu Hướng dẫn viên", goiY: "Hướng dẫn viên đón và hướng dẫn khách, thu tiền tại cảng.", moi: "Chọn Hướng dẫn viên mới", rong: "Chưa có Hướng dẫn viên nào có thể nhận.", dang: "Đang là Hướng dẫn viên", ten: "danh sách nhân viên" };

  const bannerEl = h("div", { class: "banner", role: "alert", hidden: true });
  const listSlot = h("div", { class: "pick-slot" });
  const thuocLuu = { type: "button", class: "btn btn-primary btn-block", disabled: true } as const;
  const saveBtn = bh ? h("button", thuocLuu, "Lưu người phụ trách") : h("button", thuocLuu, "Lưu Hướng dẫn viên"); // hai nút MỘT tên mỗi cái: bảng tham chiếu khai từng tên (ADR-0167)
  const closeBtn = h("button", { type: "button", class: "btn btn-link sheet-close", "aria-label": "Đóng" }, icon("close", 20));
  const scrim = h("div", { class: "sheet-scrim" });
  const dialog = h(
    "div",
    { class: "sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "handler-sheet-title", tabindex: -1 },
    h("div", { class: "sheet-head" }, h("h2", { id: "handler-sheet-title", class: "sheet-title" }, o.current === null ? chu.chon : chu.doi), closeBtn),
    h("div", { class: "sheet-body" }, h("p", { class: "pick-hint" }, chu.goiY), bannerEl, listSlot),
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
    saveBtn.textContent = value ? "Đang lưu…" : chu.luu;
    saveBtn.disabled = value || chosen === null;
    closeBtn.disabled = value;
    const set = fieldset();
    if (set) set.disabled = value;
    if (value) dialog.focus();
    else if (!saveBtn.disabled) saveBtn.focus();
  }

  /** ADR-0032 điều 10: «Đã từ chối đơn này lúc … — <lý do>» — nguồn sổ sự kiện (route tu-choi-truoc); không ẩn ai. */
  let tuChoi: Api.TuChoiTruocResponse["tuChoi"] = {};
  const dongPhu = (a: AssigneeDto): string | null => (bh ? null : dongTuChoiTruoc(tuChoi[a.partyId]));

  function renderRow(a: AssigneeDto): HTMLElement {
    const phu = dongPhu(a);
    const isCurrent = o.current !== null && (bh ? o.current.staffId === a.staffId : o.current.partyId === a.partyId); // Hướng dẫn viên: máy chủ so theo hồ sơ (party), cùng người = 409 no_change
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
      h("span", { class: "pick-name" }, a.name, phu ? h("span", { class: "assignee-tu-choi" }, phu) : null),
      isCurrent ? h("span", { class: "chip chip-unit pick-current" }, chu.dang) : null,
    );
  }

  function showList(list: readonly AssigneeDto[]): void {
    chosen = null;
    saveBtn.disabled = true;
    if (list.length === 0) {
      replaceChildren(listSlot, h("p", { class: "pick-empty" }, chu.rong));
      return;
    }
    replaceChildren(listSlot, h("fieldset", { class: "pick-list" }, h("legend", { class: "pick-legend" }, chu.moi), ...list.map(renderRow)));
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
        h("div", { class: "banner-title" }, `Chưa tải được ${chu.ten}.`),
        h("p", { class: "pick-error-text" }, "Kiểm tra kết nối mạng rồi bấm “Thử lại”."),
        h("div", { class: "banner-actions" }, retry),
      ),
    );
    if (dialog.contains(document.activeElement) || document.activeElement === document.body) retry.focus();
  }

  async function loadList(): Promise<void> {
    const mine = ++loadSeq;
    chosen = null;
    // Focus đang ở nút Lưu (vd sau 400: `setSaving(false)` vừa trả focus cho nó) hoặc ở trong danh sách/nút "Thử lại" — cả hai sắp bị khoá/gỡ khỏi DOM → giữ focus trong bảng, không để rơi ra `body`.
    const focusWasThere = document.activeElement === saveBtn || listSlot.contains(document.activeElement);
    saveBtn.disabled = true;
    replaceChildren(listSlot, h("p", { class: "pick-status", role: "status" }, `Đang tải ${chu.ten}…`));
    if (focusWasThere) dialog.focus();
    try {
      // Dòng phụ «đã từ chối đơn này» gọi song song; lỗi thì bỏ qua (danh sách vẫn hiện).
      const [danhSach, truoc] = await Promise.all([
        bh
          ? api<BanHangMoiResponse>("/api/dispatch/ban-hang-moi").then((r) => r.banHang.map((x): AssigneeDto => ({ staffId: x.staffId, partyId: "", name: x.name, roleLabel: "" })))
          : api<Api.AssigneesResponse>("/api/dispatch/assignees").then((r) => r.assignees.filter(laNhomHdv)), // chỉ nhóm Hướng dẫn viên (chủ 5/11); máy chủ vẫn nhận mọi người hợp lệ
        bh ? null : api<Api.TuChoiTruocResponse>(`/api/orders/${encodeURIComponent(o.order.id)}/tu-choi-truoc`).catch(() => null),
      ]);
      if (closed || mine !== loadSeq) return;
      tuChoi = truoc?.tuChoi ?? {};
      showList(danhSach);
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
      const goc = `/api/orders/${encodeURIComponent(o.order.id)}`;
      const ten = bh
        ? (await api<BanHangGhiResponse>(`${goc}/ban-hang`, { method: "PUT", body: { staffId: target.staffId } })).banHang?.name ?? target.name
        : (await api<Api.SetHandlerResponse>(`${goc}/handler`, { method: "PUT", body: { staffId: target.staffId } })).handler.name;
      close(false);
      o.onSaved(ten);
    } catch (err) {
      setSaving(false); // đặt lại TRƯỚC khi vẽ banner: nếu bước vẽ ném lỗi thì bảng vẫn không kẹt "Đang lưu…"
      const loi = err instanceof ApiError ? { status: err.status, code: err.code, message: err.message } : null;
      const failure = bh ? banHangFailure(loi, "doi") : handlerFailure(loi, "assign");
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
