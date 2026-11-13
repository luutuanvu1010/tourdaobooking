// Giao diện CHẾ ĐỘ BẢO TRÌ: (1) lớp phủ toàn trang cho người bị chặn khi đang dùng app (web/api.ts gọi khi máy chủ trả 503 `maintenance`), (2) đoạn thông điệp + đồng hồ
// đếm ngược SỐNG dùng chung với banner ở trang đăng nhập và với mục "Chế độ bảo trì" ở trang Tôi. Chữ thông điệp và cách đếm là luật thuần ở src/shared/maintenance.ts
// (một nguồn với máy chủ, có test) — ở đây chỉ dựng DOM. Máy chủ mới là nơi ÉP chặn; lớp phủ chỉ là cách báo cho người dùng.
import type { AuthConfigResponse } from "../src/shared/contracts";
import { MAINTENANCE_CONTACT_PHONE, MAINTENANCE_WEBSITE, MAINTENANCE_ZALO_URL, countdownBoxes, maintenanceMessageParts, phoneVnText } from "../src/shared/maintenance";
import { vnDateTimeText } from "../src/shared/vn-date";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";
import { xoaKhungNho } from "./khung-nho";
import { donNhapTam } from "./nhap-tam-don";

const SCREEN_ID = "maintenance-screen";
/** Khoảng hỏi lại xem chế độ bảo trì đã tắt chưa (GET /api/auth/config — công khai, một truy vấn nhẹ). */
const RECOVERY_POLL_MS = 20_000;

/** `endsAt` trong thân `error` của phản hồi 503 (hoặc `ApiError.details`): chuỗi ISO, còn lại → null. Không tin kiểu dữ liệu của thân lỗi. */
export function endsAtFrom(details: unknown): string | null {
  const v = details && typeof details === "object" ? (details as { endsAt?: unknown }).endsAt : null;
  return typeof v === "string" && v ? v : null;
}

/**
 * Dựng vào `container` câu thông điệp bảo trì với đồng hồ đếm ngược SỐNG (cập nhật mỗi giây trong MỘT phần tử riêng, `aria-live="off"` để trình đọc màn hình
 * không đọc từng giây). Hết giờ dự kiến → tự đổi sang câu "…sắp hoàn tất…", dừng đếm và gọi `onEnded` (máy chủ TỰ TẮT chế độ bảo trì đúng giờ này — `stateFromRow`,
 * nên nơi gọi hỏi lại / ẩn banner). Trả hàm huỷ (dọn bộ đếm giờ).
 */
export function renderMaintenanceMessage(container: HTMLElement, endsAt: string | null, onEnded?: () => void): () => void {
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
    const wasCounting = mode === "count";
    if (mode !== "static") {
      mode = "static";
      countEl = null;
      replaceChildren(container, parts.before);
    }
    stop(); // không có giờ dự kiến hoặc đã hết giờ: không còn gì để đếm
    if (wasCounting) onEnded?.(); // vừa đếm về 0 (không gọi khi mở ra đã hết giờ / không có giờ)
  };
  paint();
  if (mode === "count") timer = setInterval(paint, 1000);
  return stop;
}

/**
 * Phủ MỘT lớp toàn trang báo "đang bảo trì" lên trang hiện tại rồi trả Promise không bao giờ xong (như `goLogin`) để mã đang gọi API dừng lại thay vì chạy tiếp.
 * KHÔNG xoá/thay nội dung trang bên dưới (chữ người dùng đang gõ vẫn còn trong trang suốt lúc lớp phủ hiện) — chỉ vô hiệu hoá nó với bàn phím/trình đọc màn hình (`inert`).
 * Lời gọi API đang treo (vd "Đang lưu…") KHÔNG tự chạy tiếp, nên khi hệ thống mở lại người dùng phải TẢI LẠI trang: phần chưa lưu sẽ mất và lớp phủ nói rõ điều đó.
 * Người bị chặn có nút "Đăng xuất" (để không còn phiên treo trên máy dùng chung); cứ mỗi RECOVERY_POLL_MS — và ngay khi đồng hồ đếm về 0 (máy chủ tự tắt đúng giờ) —
 * lớp phủ hỏi lại cấu hình công khai và tự đổi sang trạng thái "Đã mở lại".
 * Bố cục theo bản mẫu của chủ dự án 13/11/2026, phương án 2a (thẻ giữa màn, đồng hồ ba ô số, nút gọi / Zalo, thẻ website). Liên hệ cố định ở src/shared/maintenance.ts.
 * Gọi nhiều lần (nhiều lời gọi API cùng gặp 503) vẫn chỉ có một lớp.
 */
export function showMaintenanceScreen(endsAt: string | null): Promise<never> {
  if (!document.getElementById(SCREEN_ID)) {
    donNhapTam(""); // ADR-0192 mục 5: màn bảo trì chặn ⇒ xoá mọi bản chụp form đơn
    const endsMs = endsAt ? Date.parse(endsAt) : NaN;
    const badge = h("span", { class: "huy-hieu", "data-tong": "cat" }, icon("clock", 14), "Đang bảo trì");
    const title = h("h1", { class: "maint-title", id: "maintenance-title" }, "Hệ thống đang bảo trì");
    const message = h("p", { class: "maint-msg", id: "maintenance-message" }, "Tour Đảo Booking đang được nâng cấp để chạy nhanh và ổn định hơn. Trong lúc này chưa lập hay sửa đơn được.");
    const note = h("span", { class: "dai-cau" }, "Khi hệ thống mở lại, tải lại trang để tiếp tục — phần chưa lưu trên trang này sẽ mất.");
    // Đồng hồ: ba ô số (role=timer, aria-live=off: trình đọc màn hình không đọc từng giây). Không có giờ dự kiến → một dòng nói thẳng, không bịa đồng hồ.
    const so = [0, 1, 2].map(() => h("span", { class: "maint-o-so" }));
    const nhan = [0, 1, 2].map(() => h("span", { class: "maint-o-nhan" }));
    const status = h("p", { class: "maint-mo-lai" }, icon("clock", 16), Number.isFinite(endsMs) ? h("span", null, "Mở lại lúc ", h("strong", null, vnDateTimeText(endsAt!))) : h("span", null, "Chưa có giờ dự kiến hoàn tất — hệ thống tự kiểm tra lại mỗi 20 giây."));
    const timer = h("div", { class: "maint-o", role: "timer", "aria-live": "off" }, ...so.map((s, i) => h("div", null, s, nhan[i]!)));
    const countBlock = h("div", { class: "maint-dem" }, h("span", { class: "maint-nhan" }, "Dự kiến hoàn tất sau"), timer);
    const timeBlock = h("div", { class: "maint-dem-khoi" }, countBlock, status);
    let tick: ReturnType<typeof setInterval> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    const paint = (): void => {
      const left = endsMs - Date.now();
      if (left > 0) {
        countdownBoxes(left).forEach((o, i) => {
          so[i]!.textContent = o.so;
          nhan[i]!.textContent = o.nhan;
        });
        return;
      }
      if (tick !== null) clearInterval(tick); // vừa đếm về 0: máy chủ tự tắt đúng giờ này → hỏi lại sau 2 giây (đồng hồ máy người dùng có thể nhanh hơn máy chủ)
      tick = null;
      countBlock.hidden = true;
      replaceChildren(status, icon("clock", 16), h("span", null, "Bảo trì sắp hoàn tất — hệ thống đang kiểm tra lại."));
      setTimeout(checkReopened, 2000);
    };
    const retry = h("button", { class: "nut", "data-cap": "chinh", "data-co": "lon", type: "button" }, "Thử lại");
    retry.addEventListener("click", () => location.reload()); // chủ đã tắt chế độ bảo trì thì vào lại được
    const contact = h(
      "div",
      { class: "maint-lien-he" },
      h("a", { class: "nut", "data-cap": "phu", href: `tel:${MAINTENANCE_CONTACT_PHONE}` }, icon("handset", 18), `Gọi ${phoneVnText(MAINTENANCE_CONTACT_PHONE)}`),
      h("a", { class: "nut", "data-cap": "phu", href: MAINTENANCE_ZALO_URL, target: "_blank", rel: "noopener" }, "Nhắn Zalo"),
    );
    const logoutBtn = h("button", { class: "nut", "data-cap": "loi", type: "button" }, "Đăng xuất");
    logoutBtn.addEventListener("click", () => {
      // /api/auth/logout là route công khai nên không bị chặn bảo trì. Không dùng `api()` (api.ts import tệp này). Lỗi mạng: vẫn về trang đăng nhập, cookie sẽ hết hạn sau.
      xoaKhungNho(); // ADR-0035: như logout() ở shell.ts — không dựa ngầm vào việc /login cũng xoá
      void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
        .catch(() => undefined)
        .finally(() => location.assign("/login"));
    });
    function checkReopened(): void {
      void fetch("/api/auth/config", { credentials: "same-origin" })
        .then((res) => (res.ok ? (res.json() as Promise<AuthConfigResponse>) : null))
        .then((config) => {
          if (config?.maintenance?.on !== false || poll === null) return;
          clearInterval(poll);
          poll = null;
          if (tick !== null) clearInterval(tick);
          tick = null;
          replaceChildren(badge, icon("check", 14), "Đã mở lại");
          badge.dataset.tong = "la";
          title.textContent = "Hệ thống đã mở lại";
          message.textContent = "Bảo trì đã xong. Tải lại trang để tiếp tục làm việc.";
          note.textContent = "Phần chưa lưu trên trang này sẽ mất khi tải lại.";
          timeBlock.hidden = contact.hidden = true;
          retry.textContent = "Tải lại trang";
        })
        .catch(() => undefined); // mất mạng: lần sau hỏi lại
    }
    poll = setInterval(checkReopened, RECOVERY_POLL_MS);
    if (Number.isFinite(endsMs)) {
      paint();
      if (endsMs > Date.now()) tick = setInterval(paint, 1000); // bộ đếm chạy tới khi trang bị tải lại
    } else countBlock.hidden = true;
    const web = MAINTENANCE_WEBSITE.replace(/^https?:\/\//, "");
    const screen = h(
      "div",
      { class: "maint-screen", id: SCREEN_ID, role: "alertdialog", "aria-modal": "true", "aria-labelledby": "maintenance-title", "aria-describedby": "maintenance-message" },
      h(
        "div",
        { class: "maint-cot" },
        h(
          "div",
          { class: "maint-card" },
          h("div", { class: "maint-dau" }, h("span", { class: "maint-thuong" }, h("img", { class: "maint-logo", src: "/icons/icon-192.png", alt: "", width: "36", height: "36" }), "Tour Đảo Booking"), badge),
          h("div", { class: "maint-chu" }, title, message),
          timeBlock,
          h("div", { class: "dai", "data-tong": "cat" }, note),
          h("div", { class: "maint-nut" }, retry, contact, logoutBtn),
        ),
        h("a", { class: "the maint-web", href: MAINTENANCE_WEBSITE, target: "_blank", rel: "noopener" }, h("strong", null, web), h("span", null, "Trong lúc chờ, tour và giá vẫn xem được trên website của công ty.")),
        h("p", { class: "maint-cam-on" }, "Cảm ơn bạn đã kiên nhẫn chờ. Hệ thống sẽ sớm quay lại."),
      ),
    );
    for (const el of Array.from(document.body.children)) el.setAttribute("inert", ""); // trang bên dưới không nhận focus/đọc được nữa, nhưng vẫn nguyên vẹn
    document.body.append(screen);
    document.body.classList.add("maint-open");
    retry.focus();
  }
  return new Promise<never>(() => undefined);
}
