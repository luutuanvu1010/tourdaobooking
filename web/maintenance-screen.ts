// Giao diện CHẾ ĐỘ BẢO TRÌ: (1) lớp phủ toàn trang cho người bị chặn khi đang dùng app (web/api.ts gọi khi máy chủ trả 503 `maintenance`), (2) đoạn thông điệp + đồng hồ
// đếm ngược SỐNG dùng chung với banner ở trang đăng nhập và với mục "Chế độ bảo trì" ở trang Tôi. Chữ thông điệp và cách đếm là luật thuần ở src/shared/maintenance.ts
// (một nguồn với máy chủ, có test) — ở đây chỉ dựng DOM. Máy chủ mới là nơi ÉP chặn; lớp phủ chỉ là cách báo cho người dùng.
import { maintenanceMessageParts } from "../src/shared/maintenance";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";

const SCREEN_ID = "maintenance-screen";

/** `endsAt` trong thân `error` của phản hồi 503 (hoặc `ApiError.details`): chuỗi ISO, còn lại → null. Không tin kiểu dữ liệu của thân lỗi. */
export function endsAtFrom(details: unknown): string | null {
  const v = details && typeof details === "object" ? (details as { endsAt?: unknown }).endsAt : null;
  return typeof v === "string" && v ? v : null;
}

/**
 * Dựng vào `container` câu thông điệp bảo trì với đồng hồ đếm ngược SỐNG (cập nhật mỗi giây trong MỘT phần tử riêng, `aria-live="off"` để trình đọc màn hình
 * không đọc từng giây). Hết giờ dự kiến → tự đổi sang câu "…sắp hoàn tất…" (vẫn chặn cho tới khi chủ tắt) và dừng đếm. Trả hàm huỷ (dọn bộ đếm giờ).
 */
export function renderMaintenanceMessage(container: HTMLElement, endsAt: string | null): () => void {
  let countEl: HTMLElement | null = null;
  let mode: "count" | "static" | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  const stop = (): void => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  const paint = (): void => {
    const parts = maintenanceMessageParts(endsAt, Date.now());
    if (parts.countdown !== null) {
      if (mode === "count" && countEl) {
        countEl.textContent = parts.countdown; // cùng cấu trúc: chỉ đổi chữ của đồng hồ
        return;
      }
      mode = "count";
      countEl = h("span", { class: "maint-count", "aria-live": "off" }, parts.countdown);
      replaceChildren(container, parts.before, countEl, parts.after);
      return;
    }
    if (mode !== "static") {
      mode = "static";
      countEl = null;
      replaceChildren(container, parts.before);
    }
    stop(); // không có giờ dự kiến hoặc đã hết giờ: không còn gì để đếm
  };
  paint();
  if (mode === "count") timer = setInterval(paint, 1000);
  return stop;
}

/**
 * Phủ MỘT lớp toàn trang báo "đang bảo trì" lên trang hiện tại rồi trả Promise không bao giờ xong (như `goLogin`) để mã đang gọi API dừng lại thay vì chạy tiếp.
 * KHÔNG xoá/thay nội dung trang bên dưới (chữ người dùng đang gõ vẫn còn nguyên trong trang) — chỉ vô hiệu hoá nó với bàn phím/trình đọc màn hình (`inert`).
 * Gọi nhiều lần (nhiều lời gọi API cùng gặp 503) vẫn chỉ có một lớp.
 */
export function showMaintenanceScreen(endsAt: string | null): Promise<never> {
  if (!document.getElementById(SCREEN_ID)) {
    const message = h("p", { class: "maint-msg", id: "maintenance-message" });
    renderMaintenanceMessage(message, endsAt); // bộ đếm chạy tới khi trang bị tải lại
    const retry = h("button", { class: "btn btn-primary", type: "button" }, "Thử lại");
    retry.addEventListener("click", () => location.reload()); // chủ đã tắt chế độ bảo trì thì vào lại được
    const screen = h(
      "div",
      { class: "maint-screen", id: SCREEN_ID, role: "alertdialog", "aria-modal": "true", "aria-labelledby": "maintenance-title", "aria-describedby": "maintenance-message" },
      h("div", { class: "maint-card" }, h("div", { class: "maint-icon", "aria-hidden": "true" }, icon("alert", 40)), h("h2", { class: "maint-title", id: "maintenance-title" }, "Đang bảo trì"), message, retry),
    );
    for (const el of Array.from(document.body.children)) el.setAttribute("inert", ""); // trang bên dưới không nhận focus/đọc được nữa, nhưng vẫn nguyên vẹn
    document.body.append(screen);
    document.body.classList.add("maint-open");
    retry.focus();
  }
  return new Promise<never>(() => undefined);
}
