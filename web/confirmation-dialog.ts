// Hộp thoại "Xác nhận đơn để gửi khách" (v1.0, đặc tả "Việc 2"): dựng ảnh PNG xác nhận từ đơn đang xem rồi cho xem trước, tải về ("Tải ảnh PNG") hoặc chia sẻ ("Chia sẻ" — chỉ khi
// `navigator.canShare({ files })`, vd iPhone → Zalo). Cùng khuôn với bảng trượt "Sửa thông tin chuyến" (trip-sheet.ts, dùng chung CSS `.sheet*`): role=dialog + aria-modal, phần nền `inert`,
// Esc / ✕ / chạm nền để đóng, trả focus về nút mở. Đóng được mọi lúc (kể cả lúc đang dựng ảnh): kết quả đến muộn bị bỏ và `blob:` URL luôn được thu hồi.
// Dựng ảnh: tên người phụ trách (GET /api/dispatch/handlers, tối đa 3 giây) + hồ sơ công ty (GET /api/company, nhớ lại sau lần đầu) → buildConfirmation →
// renderConfirmationPng. Người phụ trách có BA trạng thái, không hai (quyết định chủ dự án 2026-09-28, xem loadHandlerName): có tên → in tên; CHẮC CHẮN
// chưa có (máy chủ trả lời rõ) → mô hình tự in câu chờ nhận, KHÔNG BAO GIỜ dùng tên người lập; KHÔNG BIẾT (404/5xx/mất mạng/hết giờ/dữ liệu hỏng) → KHÔNG
// tạo ảnh, dừng lại ở thông báo "Chưa tải được người phụ trách" + Thử lại — không được đoán. Lỗi ở bất kỳ bước nào khác → thông báo tiếng Việt + nút "Thử
// lại", không bao giờ kẹt ở "Đang tạo ảnh…" (hạn chót 30 giây).
import type { CompanyDto } from "../src/shared/contracts";
import { buildConfirmation, HANDLER_HIDDEN, type HandlerInput } from "../src/shared/order-confirmation";
import { api, ApiError, type Api, type Order } from "./api";
import { ConfirmationImageError, renderConfirmationPng, type ImageErrorCode } from "./confirmation-image";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";

export interface ConfirmationDialogOptions {
  order: Order;
  /** Nút đã mở hộp thoại (nơi trả focus khi đóng). Là hàm vì trang đơn dựng lại các nút mỗi lần tải lại đơn. */
  opener: () => HTMLElement | null;
}

const HANDLER_TIMEOUT_MS = 3_000;
const TOTAL_TIMEOUT_MS = 30_000;

// ---- dữ liệu phụ ----------------------------------------------------------------------------------------------------------------------------------------------------
let companyCache: Promise<CompanyDto> | null = null;
/** Hồ sơ công ty: nhớ sau lần thành công; lỗi thì KHÔNG nhớ (lần Thử lại hỏi lại). */
function loadCompany(): Promise<CompanyDto> {
  if (!companyCache) {
    const p = api<Api.CompanyResponse>("/api/company").then((r) => r.company);
    companyCache = p;
    p.catch(() => {
      if (companyCache === p) companyCache = null;
    });
  }
  return companyCache;
}

/** Sentinel riêng cho "hết giờ" — không được lẫn với `null` (nghĩa là máy chủ đã trả lời rõ "chưa có người phụ trách"). */
const HANDLER_TIMED_OUT = Symbol("handler-timed-out");

/**
 * Tên người phụ trách đang mở của đơn (`GET /api/dispatch/handlers?orderIds=<id>` → `{ handlers: { [id]: { name } | null } }`), tối đa 3 giây. BA trạng
 * thái, không hai (quyết định chủ dự án 2026-09-28 — "một sự thật duy nhất", đừng gộp lại như hồi trước): chuỗi tên hợp lệ → dùng tên; `null` = máy chủ
 * trả lời RÕ RÀNG "chưa có người phụ trách"; `undefined` = KHÔNG BIẾT (404, 5xx, mất mạng, hết giờ, thiếu khoá `handlers`/khoá `orderId`, hoặc `name`
 * không phải chuỗi/rỗng) — không được đoán, `make()` phải dừng lại chứ không tạo ảnh. Riêng 403 → `HANDLER_HIDDEN` (người xem không được biết). Kiểm cấu trúc chặt vì đây là dữ liệu từ ngoài trang.
 */
export async function loadHandlerName(orderId: string): Promise<HandlerInput | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const res = await Promise.race([
      api<Api.HandlersResponse>(`/api/dispatch/handlers?orderIds=${encodeURIComponent(orderId)}`),
      new Promise<typeof HANDLER_TIMED_OUT>((resolve) => {
        timer = setTimeout(() => resolve(HANDLER_TIMED_OUT), HANDLER_TIMEOUT_MS);
      }),
    ]);
    if (res === HANDLER_TIMED_OUT) return undefined;
    if (typeof res?.handlers !== "object" || res.handlers === null || !(orderId in res.handlers)) return undefined;
    const found = res.handlers[orderId];
    if (found === null) return null;
    return found && typeof found.name === "string" && found.name.trim() !== "" ? found.name : undefined;
  } catch (e) {
    // 403 = người xem KHÔNG được biết người phụ trách (Đối tác/Thực tập, ADR-0019) — sự thật rõ ràng, không phải lỗi: ảnh bỏ phần người phụ trách.
    return e instanceof ApiError && e.status === 403 ? HANDLER_HIDDEN : undefined;
  } finally {
    clearTimeout(timer);
  }
}

type Stage = ImageErrorCode | "company" | "handler" | "timeout" | "other";
class StageError extends Error {
  constructor(readonly stage: Stage) {
    super(stage);
  }
}

const MESSAGES: Record<Stage, string> = {
  company: "Chưa tải được thông tin công ty để in lên ảnh. Kiểm tra kết nối mạng rồi bấm “Thử lại”.",
  handler: "Chưa tải được người phụ trách, vui lòng thử lại.",
  font: "Chưa tải được phông chữ để vẽ ảnh. Kiểm tra kết nối mạng rồi bấm “Thử lại”.",
  canvas: "Trình duyệt chưa vẽ được ảnh xác nhận. Bấm “Thử lại”; nếu vẫn lỗi, hãy đóng rồi mở lại đơn này.",
  encode: "Trình duyệt chưa vẽ được ảnh xác nhận (không tạo được tệp PNG). Bấm “Thử lại”.",
  theme: "Chưa đọc được màu và phông của giao diện. Hãy đóng và mở lại ứng dụng rồi thử lại.",
  timeout: "Tạo ảnh quá lâu. Kiểm tra kết nối mạng rồi bấm “Thử lại”.",
  other: "Chưa tạo được ảnh xác nhận. Bấm “Thử lại”.",
};

const stageOf = (e: unknown): Stage => (e instanceof StageError ? e.stage : e instanceof ConfirmationImageError ? e.code : "other");

interface Made {
  blob: Blob;
  fileName: string;
  orderCode: string;
}

/** Tên người phụ trách + công ty → mô hình → PNG. Mỗi lỗi mang tên bước hỏng để hiện đúng thông báo. */
async function make(order: Order): Promise<Made> {
  const handler = loadHandlerName(order.id); // chạy song song với công ty và việc nạp phông; không bao giờ lỗi (ba trạng thái, xem loadHandlerName)
  let company: CompanyDto;
  try {
    company = await loadCompany();
  } catch {
    throw new StageError("company");
  }
  const handlerName = await handler;
  if (handlerName === undefined) throw new StageError("handler"); // KHÔNG BIẾT: dừng lại, không tạo ảnh, không đoán (chủ dự án 2026-09-28)
  const model = buildConfirmation(order, company, handlerName);
  const blob = await renderConfirmationPng(model);
  return { blob, fileName: model.fileName, orderCode: model.orderCode };
}

function withDeadline<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new StageError("timeout")), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e: unknown) => { clearTimeout(timer); reject(e); },
    );
  });
}

/** Chia sẻ được không? (cần một tệp thật để hỏi; trình duyệt không có `canShare`/`File` → false). */
function shareFile(made: Made): File | null {
  try {
    if (typeof navigator.canShare !== "function" || typeof navigator.share !== "function") return null;
    const file = new File([made.blob], made.fileName, { type: "image/png" });
    return navigator.canShare({ files: [file] }) ? file : null;
  } catch {
    return null;
  }
}

// ---- hộp thoại --------------------------------------------------------------------------------------------------------------------------------------------------------
export function openConfirmationDialog(o: ConfirmationDialogOptions): void {
  if (document.querySelector(".confirm-root")) return; // bấm đúp không mở hai hộp thoại
  const order = o.order;
  let closed = false;
  let attempt = 0;
  let blobUrl: string | null = null;
  let sharing = false;

  const closeBtn = h("button", { type: "button", class: "btn btn-link sheet-close", "aria-label": "Đóng" }, icon("close", 20));
  const scrim = h("div", { class: "sheet-scrim" });
  const stage = h("div", { class: "confirm-stage" });
  const noteSlot = h("div", { class: "confirm-note-slot" });
  const downloadEl = h("a", { class: "btn btn-primary btn-block confirm-download", hidden: true }, "Tải ảnh PNG");
  const shareSlot = h("div", { class: "confirm-share-slot" });
  const dialog = h(
    "div",
    { class: "sheet sheet-wide", role: "dialog", "aria-modal": "true", "aria-labelledby": "confirm-sheet-title", tabindex: -1 },
    h("div", { class: "sheet-head" }, h("h2", { id: "confirm-sheet-title", class: "sheet-title" }, "Xác nhận đơn để gửi khách"), closeBtn),
    // Vùng cuộn được (ảnh cao hơn khung nhìn) mà không có phần tử nhận focus nào bên trong → phải tự nhận focus để cuộn được bằng bàn phím (axe: scrollable-region-focusable).
    h("div", { class: "sheet-body", tabindex: 0, role: "region", "aria-label": "Xem trước ảnh xác nhận" }, h("p", { class: "confirm-hint" }, "Ảnh xác nhận gửi cho khách: tải về máy hoặc chia sẻ qua Zalo."), stage),
    h("div", { class: "sheet-foot confirm-foot" }, noteSlot, downloadEl, shareSlot),
  );
  const root = h("div", { class: "sheet-root confirm-root" }, scrim, dialog);

  const background = [...document.body.children]; // mọi thứ đang có trên trang → inert khi hộp thoại mở
  const revoke = (): void => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = null;
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") close();
  };
  function close(): void {
    if (closed) return;
    closed = true;
    attempt++; // kết quả dựng ảnh đến muộn bị bỏ
    document.removeEventListener("keydown", onKey);
    for (const el of background) el.removeAttribute("inert");
    document.body.classList.remove("sheet-open");
    revoke();
    root.remove();
    o.opener()?.focus();
  }

  const clearNote = (): void => replaceChildren(noteSlot);
  const showNote = (text: string): void => replaceChildren(noteSlot, h("p", { class: "confirm-note", role: "alert" }, icon("alert", 16), text));

  function showBusy(): void {
    revoke();
    downloadEl.hidden = true;
    downloadEl.removeAttribute("href");
    replaceChildren(shareSlot);
    clearNote();
    replaceChildren(stage, h("div", { class: "confirm-status", role: "status" }, "Đang tạo ảnh xác nhận…"));
  }

  function showError(e: unknown): void {
    const retry = h("button", { type: "button", class: "btn confirm-retry" }, "Thử lại");
    retry.addEventListener("click", () => void run());
    replaceChildren(
      stage,
      h("div", { class: "banner banner-danger confirm-error", role: "alert" }, h("div", { class: "banner-title" }, "Chưa tạo được ảnh xác nhận"), h("p", { class: "confirm-error-text" }, MESSAGES[stageOf(e)]), h("div", { class: "banner-actions" }, retry)),
    );
    if (dialog.contains(document.activeElement) || document.activeElement === document.body) retry.focus();
  }

  function showImage(made: Made): void {
    blobUrl = URL.createObjectURL(made.blob);
    const img = h("img", { class: "confirm-img", src: blobUrl, alt: `Ảnh xác nhận đơn ${made.orderCode}` });
    replaceChildren(stage, h("div", { class: "confirm-frame" }, img));
    downloadEl.href = blobUrl;
    downloadEl.download = made.fileName;
    downloadEl.hidden = false;
    const file = shareFile(made);
    if (file) {
      const shareBtn = h("button", { type: "button", class: "btn btn-block confirm-share" }, "Chia sẻ");
      shareBtn.addEventListener("click", () => {
        if (sharing) return; // iOS ném lỗi nếu mở bảng chia sẻ khi bảng trước chưa xong
        clearNote();
        sharing = true;
        Promise.resolve()
          .then(() => navigator.share({ files: [file], title: `Xác nhận đơn ${made.orderCode}` }))
          .catch((err: unknown) => {
            if (err instanceof DOMException && err.name === "AbortError") return; // người dùng tự huỷ: im lặng
            showNote("Chưa mở được bảng chia sẻ. Hãy dùng nút “Tải ảnh PNG”.");
          })
          .finally(() => {
            sharing = false;
          });
      });
      replaceChildren(shareSlot, shareBtn);
    }
  }

  async function run(): Promise<void> {
    const mine = ++attempt;
    showBusy();
    try {
      const made = await withDeadline(make(order), TOTAL_TIMEOUT_MS);
      if (closed || mine !== attempt) return;
      showImage(made);
    } catch (e) {
      if (closed || mine !== attempt) return;
      showError(e);
    }
  }

  closeBtn.addEventListener("click", close);
  scrim.addEventListener("click", close);
  document.addEventListener("keydown", onKey);

  document.body.append(root);
  for (const el of background) el.setAttribute("inert", "");
  document.body.classList.add("sheet-open");
  dialog.focus();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("open"))); // hai khung hình: trạng thái đầu được vẽ trước khi chuyển động chạy
  void run();
}
