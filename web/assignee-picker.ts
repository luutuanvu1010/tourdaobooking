// Bảng "Chọn người phụ trách" NGAY TRONG FORM LẬP ĐƠN (Task 1.8 phần b ADR-0030; bản thiết kế "Nguoi phu trach - Form lap don.dc.html" của chủ dự án,
// phương án 1b). Khác `handler-sheet.ts` (đơn ĐÃ có — bấm "Lưu" là gọi `PUT /api/orders/:id/handler`): bảng này KHÔNG gọi API ghi nào và KHÔNG có nút
// "Lưu" riêng — bấm một người (hoặc "Chưa chọn ai") là bảng đóng ngay và lựa chọn nằm trong STATE CỦA FORM (`onPick`); máy chủ chỉ nhận lựa chọn khi
// bấm "Lưu" của CẢ đơn (`handlerStaffId` trong thân `POST /api/orders`), đúng hành vi `pick` của bản thiết kế.
// Cùng khuôn `.sheet*` với trip-sheet.ts / handler-sheet.ts: ≤ 640px trượt từ đáy, > 640px hộp giữa màn hình; role=dialog + aria-modal, nền `inert`,
// Esc / ✕ / chạm nền để đóng, trả focus về nút mở (hoặc nơi gọi tự đặt focus khi khối "Người phụ trách" dựng lại sau khi chọn).
// Danh sách lấy từ `GET /api/dispatch/assignees` KHI MỞ bảng (không gọi trước); ô "Tìm theo tên" lọc CỤC BỘ (không gọi lại API mỗi lần gõ) — luật thuần
// bỏ dấu + gom nhóm theo `roleLabel` ở src/shared/assignee-pick.ts (có test). Bằng chứng giao diện: kịch bản Chrome
// docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/chon-hdv-lap-don-smoke.mjs.
import { groupAssignees } from "../src/shared/assignee-pick";
import type { AssigneeDto } from "../src/shared/contracts";
import { api, type Api } from "./api";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";

export interface AssigneePickerOptions {
  /** Người đang được chọn trong form (null = chưa chọn ai): hàng đó có dấu ✓ và nền nhấn. */
  current: AssigneeDto | null;
  /** Người dùng bấm một hàng: bảng ĐÃ đóng (không trả focus — nơi gọi dựng lại khối rồi tự đặt focus). `null` = "Chưa chọn ai". */
  onPick: (picked: AssigneeDto | null) => void;
}

export function openAssigneePicker(o: AssigneePickerOptions, opener: HTMLElement): void {
  if (document.querySelector(".sheet-root")) return; // bấm đúp không mở hai bảng
  let closed = false;
  let loadSeq = 0;
  let list: readonly AssigneeDto[] | null = null; // null = chưa tải xong / tải lỗi

  const closeBtn = h("button", { type: "button", class: "assignee-close", "aria-label": "Đóng" }, icon("close", 18));
  const search = h("input", { type: "search", class: "assignee-search", placeholder: "Tìm theo tên", "aria-label": "Tìm theo tên", autocomplete: "off", enterkeyhint: "search" });
  const listSlot = h("div", { class: "assignee-list" });
  const scrim = h("div", { class: "sheet-scrim" });
  const dialog = h(
    "div",
    { class: "sheet assignee-sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "assignee-sheet-title", tabindex: -1 },
    h(
      "div",
      { class: "assignee-head" },
      h("div", { class: "assignee-head-row" }, h("h2", { id: "assignee-sheet-title", class: "assignee-title" }, "Chọn người phụ trách"), closeBtn),
      search,
    ),
    h("div", { class: "sheet-body assignee-body" }, listSlot),
  );
  const root = h("div", { class: "sheet-root assignee-root" }, scrim, dialog);

  const background = [...document.body.children]; // mọi thứ đang có trên trang → inert khi bảng mở
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") close();
  };
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
  function pick(a: AssigneeDto | null): void {
    close(false);
    o.onPick(a);
  }

  const check = (): SVGSVGElement => icon("check", 20);

  /** Dòng đầu danh sách — LUÔN có (kể cả khi đang tìm), chọn = xoá lựa chọn hiện tại (đơn "Chờ nhận"). */
  function noneRow(): HTMLButtonElement {
    const selected = o.current === null;
    const btn = h(
      "button",
      { type: "button", class: "assignee-none", "aria-pressed": String(selected), "data-staff-id": "" },
      h("span", { class: "assignee-none-text" }, h("span", { class: "chip hdv-chip chip-warn" }, "Chờ nhận"), " ", "Chưa chọn ai"), // " ": trình đọc màn hình không đọc dính "Chờ nhậnChưa chọn ai" (flex bỏ qua khoảng trắng khi vẽ)
      selected ? check() : null,
    );
    btn.addEventListener("click", () => pick(null));
    return btn;
  }

  function personRow(a: AssigneeDto): HTMLButtonElement {
    const selected = o.current !== null && o.current.staffId === a.staffId;
    const btn = h(
      "button",
      { type: "button", class: selected ? "assignee-person is-selected" : "assignee-person", "aria-pressed": String(selected), "data-staff-id": a.staffId },
      h("span", { class: "assignee-person-name" }, a.name),
      selected ? check() : null,
    );
    btn.addEventListener("click", () => pick(a));
    return btn;
  }

  function render(): void {
    if (list === null) return;
    const query = search.value;
    const groups = groupAssignees(list, query);
    const rows: Node[] = [noneRow()];
    groups.forEach((g, i) => {
      const id = `assignee-group-${i}`;
      rows.push(h("div", { class: "assignee-group", role: "group", "aria-labelledby": id }, h("h3", { id, class: "assignee-group-label" }, g.label), ...g.people.map(personRow)));
    });
    if (groups.length === 0) {
      rows.push(h("p", { class: "assignee-empty", role: "status" }, query.trim() === "" ? "Chưa có nhân viên nào có thể nhận phụ trách." : `Không tìm thấy ai tên “${query.trim()}”.`));
    }
    replaceChildren(listSlot, ...rows);
  }

  function showLoadError(): void {
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
    list = null;
    // Focus đang ở nút "Thử lại" (sắp bị gỡ khỏi DOM) → giữ focus trong bảng, không để rơi ra `body`.
    const focusWasThere = listSlot.contains(document.activeElement);
    replaceChildren(listSlot, h("p", { class: "pick-status", role: "status" }, "Đang tải danh sách nhân viên…"));
    if (focusWasThere) dialog.focus();
    try {
      const { assignees } = await api<Api.AssigneesResponse>("/api/dispatch/assignees");
      if (closed || mine !== loadSeq) return;
      list = assignees;
      render();
    } catch {
      if (closed || mine !== loadSeq) return;
      showLoadError();
    }
  }

  search.addEventListener("input", render); // lọc cục bộ trên danh sách đã tải — không gọi lại API
  search.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault(); // phím "Tìm" của bàn phím iPhone: không làm gì (bảng nằm ngoài <form> nhưng giữ đúng thói quen ô tìm danh mục)
  });
  closeBtn.addEventListener("click", () => close());
  scrim.addEventListener("click", () => close());
  document.addEventListener("keydown", onKey);

  document.body.append(root);
  for (const el of background) el.setAttribute("inert", "");
  document.body.classList.add("sheet-open");
  dialog.focus();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("open"))); // hai khung hình: trạng thái đầu được vẽ trước khi chuyển động chạy
  void loadList();
}
