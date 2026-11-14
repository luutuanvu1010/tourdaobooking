// Giao diện CHẾ ĐỘ BẢO TRÌ: (1) lớp phủ toàn trang cho người bị chặn khi đang dùng app (web/api.ts gọi khi máy chủ trả 503 `maintenance`), (2) đoạn thông điệp + đồng hồ
// đếm ngược SỐNG dùng chung với banner ở trang đăng nhập và với mục "Chế độ bảo trì" ở trang Tôi. Chữ thông điệp và cách đếm là luật thuần ở src/shared/maintenance.ts
// (một nguồn với máy chủ, có test) — ở đây chỉ dựng DOM. Máy chủ mới là nơi ÉP chặn; lớp phủ chỉ là cách báo cho người dùng.
import type { AuthConfigResponse } from "../src/shared/contracts";
import { MAINTENANCE_CONTENT_DEFAULT, countdownBoxes, maintenanceMessageParts, phoneVnText, type MaintenanceContent } from "../src/shared/maintenance";
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

/** Nội dung màn bảo trì trong thân 503 (máy chủ gửi kèm — bản mẫu 2c). Không tin thân lỗi: kiểm lại đúng bộ luật của máy chủ, sai thì dùng mặc định. */
export function contentFrom(details: unknown): MaintenanceContent {
  // Máy chủ đã kiểm đủ luật khi ghi VÀ khi đọc (checkMaintenanceContent / contentFromStored). Ở đây chỉ canh hình dạng + đường dẫn https (khỏi nạp cả bộ kiểm vào gói MỌI trang).
  const v = (details && typeof details === "object" ? (details as { content?: unknown }).content : null) as Record<string, unknown> | null;
  const ok = !!v && typeof v === "object" && Object.entries(MAINTENANCE_CONTENT_DEFAULT).every(([k, d]) => typeof v[k] === typeof d) && [v.zalo, v.website].every((u) => u === "" || String(u).startsWith("https://"));
  return ok ? (v as unknown as MaintenanceContent) : MAINTENANCE_CONTENT_DEFAULT;
}

/**
 * Dựng vào `container` câu thông điệp bảo trì với đồng hồ đếm ngược SỐNG (cập nhật mỗi giây trong MỘT phần tử riêng, `aria-live="off"` để trình đọc màn hình
 * không đọc từng giây). Hết giờ dự kiến → tự đổi sang câu "…sắp hoàn tất…", dừng đếm và gọi `onEnded` (máy chủ TỰ TẮT chế độ bảo trì đúng giờ này — `stateFromRow`,
 * nên nơi gọi hỏi lại / ẩn banner). Trả hàm huỷ (dọn bộ đếm giờ).
 */
export function renderMaintenanceMessage(container: HTMLElement, endsAt: string | null, sdt: string, onEnded?: () => void): () => void {
  let countEl: HTMLElement | null = null;
  let mode: "count" | "static" | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  const stop = (): void => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  const paint = (): void => {
    const parts = maintenanceMessageParts(endsAt, Date.now(), sdt);
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

/** Các phần của thẻ bảo trì mà lớp phủ cần đổi về sau (đồng hồ, trạng thái «Đã mở lại»). */
interface TheBaoTri {
  cot: HTMLElement;
  badge: HTMLElement;
  title: HTMLElement;
  message: HTMLElement;
  note: HTMLElement;
  timeBlock: HTMLElement;
  countBlock: HTMLElement;
  status: HTMLElement;
  so: HTMLElement[];
  nhan: HTMLElement[];
  contact: HTMLElement | null;
  lyDo: HTMLElement | null;
  retry: HTMLButtonElement;
  logoutBtn: HTMLButtonElement;
}

/**
 * Dựng thẻ bảo trì (bản mẫu 2a) từ NỘI DUNG chủ đã lưu — không gắn sự kiện, không bộ đếm, không đụng trang: dùng chung cho lớp phủ thật và bản xem trước ở trang Tôi.
 * Ô tuỳ chọn để trống hoặc công tắc tắt thì khối đó không dựng. `endsAt` chỉ để in «Mở lại lúc …»; ô đồng hồ do nơi gọi tô.
 */
export function dungTheBaoTri(nd: MaintenanceContent, endsAt: string | null): TheBaoTri {
  const endsMs = endsAt ? Date.parse(endsAt) : NaN;
  const badge = h("span", { class: "huy-hieu", "data-tong": "cat" }, icon("clock", 14), "Đang bảo trì");
  const title = h("h1", { class: "maint-title", id: "maintenance-title" }, nd.tieuDe);
  const message = h("p", { class: "maint-msg", id: "maintenance-message" }, nd.loiNhan);
  const lyDo = nd.hienLyDo && nd.lyDo ? h("div", { class: "maint-ly-do" }, h("span", { class: "maint-nhan" }, "Nội dung bảo trì"), h("span", null, nd.lyDo)) : null;
  const note = h("span", { class: "dai-cau" }, "Khi hệ thống mở lại, tải lại trang để tiếp tục — phần chưa lưu trên trang này sẽ mất.");
  // Đồng hồ: ba ô số (role=timer, aria-live=off: trình đọc màn hình không đọc từng giây). Không có giờ dự kiến → một dòng nói thẳng, không bịa đồng hồ.
  const so = [0, 1, 2].map(() => h("span", { class: "maint-o-so" }));
  const nhan = [0, 1, 2].map(() => h("span", { class: "maint-o-nhan" }));
  const status = h("p", { class: "maint-mo-lai" }, icon("clock", 16), Number.isFinite(endsMs) ? h("span", null, "Mở lại lúc ", h("strong", null, vnDateTimeText(endsAt!))) : h("span", null, "Chưa có giờ dự kiến hoàn tất — hệ thống tự kiểm tra lại mỗi 20 giây."));
  const timer = h("div", { class: "maint-o", role: "timer", "aria-live": "off" }, ...so.map((s, i) => h("div", null, s, nhan[i]!)));
  const countBlock = h("div", { class: "maint-dem" }, h("span", { class: "maint-nhan" }, "Dự kiến hoàn tất sau"), timer);
  const timeBlock = h("div", { class: "maint-dem-khoi" }, countBlock, status);
  if (!Number.isFinite(endsMs)) countBlock.hidden = true;
  const retry = h("button", { class: "nut", "data-cap": "chinh", "data-co": "lon", type: "button" }, "Thử lại") as HTMLButtonElement;
  const goi = nd.hienGoi && nd.sdt ? h("a", { class: "nut", "data-cap": "phu", href: `tel:${nd.sdt}` }, icon("handset", 18), `Gọi ${phoneVnText(nd.sdt)}`) : null;
  const zalo = nd.hienZalo && nd.zalo ? h("a", { class: "nut", "data-cap": "phu", href: nd.zalo, target: "_blank", rel: "noopener" }, "Nhắn Zalo") : null;
  const contact = goi || zalo ? h("div", { class: "maint-lien-he" }, ...[goi, zalo].filter((x) => x !== null)) : null;
  const logoutBtn = h("button", { class: "nut", "data-cap": "loi", type: "button" }, "Đăng xuất") as HTMLButtonElement;
  const webTen = nd.website.replace(/^https?:\/\//, "").replace(/\/$/, ""); // tính NGOÀI lời gọi h("a"): bài quét liên kết (chi-duong-tinh.test.ts) đọc đối số h("a", …) và coi «//» là chú thích
  const web = nd.hienWeb && nd.website
    ? h("a", { class: "the maint-web", href: nd.website, target: "_blank", rel: "noopener" }, h("strong", null, webTen), h("span", null, "Trong lúc chờ, tour và giá vẫn xem được trên website của công ty."))
    : null;
  const camOn = nd.hienCamOn && nd.camOn ? h("p", { class: "maint-cam-on" }, nd.camOn) : null;
  const card = h(
    "div",
    { class: "maint-card" },
    h("div", { class: "maint-dau" }, h("span", { class: "maint-thuong" }, h("img", { class: "maint-logo", src: "/icons/icon-192.png", alt: "", width: "36", height: "36" }), "Tour Đảo Booking"), badge),
    h("div", { class: "maint-chu" }, title, message),
    ...(lyDo ? [lyDo] : []),
    timeBlock,
    h("div", { class: "dai", "data-tong": "cat" }, note),
    h("div", { class: "maint-nut" }, retry, ...(contact ? [contact] : []), logoutBtn),
  );
  const cot = h("div", { class: "maint-cot" }, card, ...[web, camOn].filter((x) => x !== null));
  return { cot, badge, title, message, note, timeBlock, countBlock, status, so, nhan, contact, lyDo, retry, logoutBtn };
}

/** Tô ba ô đồng hồ theo thời gian còn lại (> 0). */
export function toDongHo(t: Pick<TheBaoTri, "so" | "nhan">, msLeft: number): void {
  countdownBoxes(msLeft).forEach((o, i) => {
    t.so[i]!.textContent = o.so;
    t.nhan[i]!.textContent = o.nhan;
  });
}

/**
 * Phủ MỘT lớp toàn trang báo "đang bảo trì" lên trang hiện tại rồi trả Promise không bao giờ xong (như `goLogin`) để mã đang gọi API dừng lại thay vì chạy tiếp.
 * KHÔNG xoá/thay nội dung trang bên dưới (chữ người dùng đang gõ vẫn còn trong trang suốt lúc lớp phủ hiện) — chỉ vô hiệu hoá nó với bàn phím/trình đọc màn hình (`inert`).
 * Lời gọi API đang treo (vd "Đang lưu…") KHÔNG tự chạy tiếp, nên khi hệ thống mở lại người dùng phải TẢI LẠI trang: phần chưa lưu sẽ mất và lớp phủ nói rõ điều đó.
 * Người bị chặn có nút "Đăng xuất" (để không còn phiên treo trên máy dùng chung); cứ mỗi RECOVERY_POLL_MS — và ngay khi đồng hồ đếm về 0 (máy chủ tự tắt đúng giờ) —
 * lớp phủ hỏi lại cấu hình công khai và tự đổi sang trạng thái "Đã mở lại".
 * Bố cục theo bản mẫu 2a; chữ, SĐT, Zalo, website lấy từ NỘI DUNG chủ đã lưu (bản mẫu 2c — máy chủ gửi kèm trong thân 503).
 * Gọi nhiều lần (nhiều lời gọi API cùng gặp 503) vẫn chỉ có một lớp.
 */
export function showMaintenanceScreen(endsAt: string | null, nd: MaintenanceContent): Promise<never> {
  if (!document.getElementById(SCREEN_ID)) {
    donNhapTam(""); // ADR-0192 mục 5: màn bảo trì chặn ⇒ xoá mọi bản chụp form đơn
    const endsMs = endsAt ? Date.parse(endsAt) : NaN;
    const t = dungTheBaoTri(nd, endsAt);
    let tick: ReturnType<typeof setInterval> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    const paint = (): void => {
      const left = endsMs - Date.now();
      if (left > 0) return toDongHo(t, left);
      if (tick !== null) clearInterval(tick); // vừa đếm về 0: máy chủ tự tắt đúng giờ này → hỏi lại sau 2 giây (đồng hồ máy người dùng có thể nhanh hơn máy chủ)
      tick = null;
      t.countBlock.hidden = true;
      replaceChildren(t.status, icon("clock", 16), h("span", null, "Bảo trì sắp hoàn tất — hệ thống đang kiểm tra lại."));
      setTimeout(checkReopened, 2000);
    };
    t.retry.addEventListener("click", () => location.reload()); // chủ đã tắt chế độ bảo trì thì vào lại được
    t.logoutBtn.addEventListener("click", () => {
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
          replaceChildren(t.badge, icon("check", 14), "Đã mở lại");
          t.badge.dataset.tong = "la";
          t.title.textContent = "Hệ thống đã mở lại";
          t.message.textContent = "Bảo trì đã xong. Tải lại trang để tiếp tục làm việc.";
          t.note.textContent = "Phần chưa lưu trên trang này sẽ mất khi tải lại.";
          t.timeBlock.hidden = true;
          for (const el of [t.contact, t.lyDo]) if (el) el.hidden = true;
          t.retry.textContent = "Tải lại trang";
        })
        .catch(() => undefined); // mất mạng: lần sau hỏi lại
    }
    poll = setInterval(checkReopened, RECOVERY_POLL_MS);
    if (Number.isFinite(endsMs)) {
      paint();
      if (endsMs > Date.now()) tick = setInterval(paint, 1000); // bộ đếm chạy tới khi trang bị tải lại
    }
    const screen = h(
      "div",
      { class: "maint-screen", id: SCREEN_ID, role: "alertdialog", "aria-modal": "true", "aria-labelledby": "maintenance-title", "aria-describedby": "maintenance-message" },
      t.cot,
    );
    for (const el of Array.from(document.body.children)) el.setAttribute("inert", ""); // trang bên dưới không nhận focus/đọc được nữa, nhưng vẫn nguyên vẹn
    document.body.append(screen);
    document.body.classList.add("maint-open");
    t.retry.focus();
  }
  return new Promise<never>(() => undefined);
}
