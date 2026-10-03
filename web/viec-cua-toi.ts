// "Việc của tôi" của hướng dẫn viên ở trang Tôi (Task 1.8 ADR-0030) — dựng lại ĐÚNG bố cục/chữ/màu của bản thiết kế chủ dự án đã chọn
// `docs/design/tour-o-booking-hdv/project/Viec cua toi - HDV v2.dc.html` bằng khuôn mã của repo: h()/replaceChildren (không innerHTML), api(), CSS
// token ở `public/app.css` (khối `.hdv-*`). Luật thuần (nhãn ngày, số khách, chip, thứ tự, thân sửa số khách) ở `src/shared/viec-cua-toi.ts`.
//
// Hai khối:
//  - "Đơn chờ nhận" — `GET /api/orders/pool` (PHẦN HẸP, nơi đón đã che dãy số ở máy chủ — không tự che lần hai). Nút "Nhận" → `PUT /api/orders/:id/handler`
//    { staffId: chính mình }. Thua đua (409 stale) hay máy chủ từ chối → banner (`handlerFailure`) + tải lại. KHÔNG dựng dữ liệu đơn ở trình duyệt sau khi
//    nhận: tải lại CẢ hai danh sách từ máy chủ. Tài khoản lai (có quyền Đối tác) → máy chủ 403 → khối này ẩn hẳn (không hiện lỗi).
//  - "Đơn của tôi" — `GET /api/dispatch/mine` (Tổng tiền) + `POST /api/ledger/balances` (Đã thu/Còn thu — sổ tiền lượt 1, billing). Nút theo `myJobActions`. Tên HDV
//    lấy từ PHIÊN (`staff.fullName`, Task 1.6) — KHÔNG gọi `GET /api/dispatch/handlers`, và KHÔNG dùng tên phiên cho đơn ở hàng chờ (chưa ai phụ trách).
// Bảng tin (`don-thay-doi`, `can-tai-lai`): tải lại CẢ hai khối — đây là cách hàng chờ tự cập nhật lặng lẽ khi người khác Nhận (chủ dự án chọn: không
// thông báo nổi cho người không liên quan). Không dựng lại dưới tay người đang dùng: hoãn khi bảng sửa/huỷ đang mở hoặc đang Nhận, thử lại khi xong.
import { APP_NAME } from "../src/shared/app-info";
import { handlerFailure, myJobActions } from "../src/shared/handler-view";
import { PAX_LABEL, type PaxCode } from "../src/shared/order-lines";
import { banner, type Banner } from "../src/shared/order-errors";
import { can, holdsPartner } from "../src/shared/permissions";
import { tripDeparted } from "../src/shared/trip-rules";
import { ngayNgan, vnToday } from "../src/shared/vn-date";
import {
  EDIT_REASON_QUICK, departLabel, moneyEditServices, myJobChip, orderDepartDate, paxSummary, relLabel, sortMyJobs, telHref, type MyJobChipTone,
} from "../src/shared/viec-cua-toi";
import { ApiError, api, type Api, type Staff } from "./api";
import { renderBanner } from "./banner";
import { counter } from "./counter";
import { h, replaceChildren, type Child } from "./dom";
import { vnd } from "./format";
import { icon } from "./icons";
import { nenHoanLamMoi, taoBoLamMoi } from "./lam-moi-logic";
import { showError } from "./shell";

/**
 * Lý do huỷ của hướng dẫn viên — bản chép tay của danh sách ĐÓNG ở máy chủ (`src/modules/dispatch/rules.ts` `CANCEL_REASONS`, ADR-0014 điều 11; ADR-0030
 * điều 2 "HDV huỷ: giữ đúng hai lý do"). Kế hoạch Task 2.1 (lượt 2) gộp về một tệp chung ở `src/shared/`. Thêm lựa chọn = thêm một phần tử ở đây và ở máy chủ.
 * `"other"` ("Khác", ADR-0030 điều 2 "Sửa đổi sau khi duyệt", chủ dự án quyết 2026-09-27) mở một ô chữ tự do — máy chủ chặn số điện thoại/dãy số dài
 * trong ô đó bằng `hasLongDigitRun` (`src/shared/text-guards.ts`); giao diện KHÔNG tự lọc lại, chỉ hiện đúng lỗi máy chủ trả về (xem `openCancelSheet`).
 */
const CANCEL_REASONS: readonly { code: string; label: string }[] = [
  { code: "not_reachable", label: "Không liên hệ được với khách" },
  { code: "customer_requested", label: "Khách yêu cầu huỷ" },
  { code: "other", label: "Khác" },
];
const NO_NET = "Không kết nối được máy chủ.";
const CHIP_CLASS: Record<MyJobChipTone, string> = {
  warn: "chip chip-warn hdv-chip",
  ok: "chip chip-unit hdv-chip hdv-chip-ok",
  muted: "chip chip-muted hdv-chip hdv-chip-muted",
};

/** Số bảng (sửa/huỷ) đang mở — Bảng tin hoãn làm mới khi > 0. */
let openSheets = 0;

// ---- Bảng trượt dùng chung (khuôn `.sheet*` của public/app.css, cùng cách web/handler-sheet.ts) --------------------------------------------------
interface SheetHandle {
  dialog: HTMLElement;
  /** `restoreFocus` false khi nơi gọi sẽ dựng lại danh sách (nút mở bị thay — nơi gọi tự đặt focus). */
  close(restoreFocus?: boolean): void;
  /** Khoá khi đang gửi: ✕ khoá, Esc/chạm nền không đóng (đóng giữa chừng thì lỗi máy chủ không còn chỗ hiện). */
  setBusy(busy: boolean): void;
  isBusy(): boolean;
}

function openSheet(o: { id: string; title: string | Child[]; subtitle?: string; body: Node[]; foot: Node[]; opener: HTMLElement; onClosed: () => void }): SheetHandle | null {
  if (document.querySelector(".sheet-root")) return null; // bấm đúp không mở hai bảng
  let busy = false;
  let closed = false;
  const closeBtn = h("button", { type: "button", class: "btn btn-link sheet-close", "aria-label": "Đóng" }, icon("close", 20));
  const scrim = h("div", { class: "sheet-scrim" });
  const dialog = h(
    "div",
    { class: "sheet hdv-sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": `${o.id}-title`, tabindex: -1 },
    h("div", { class: "sheet-head" }, h("div", null, h("h2", { id: `${o.id}-title`, class: "sheet-title" }, ...(typeof o.title === "string" ? [o.title] : o.title)), o.subtitle ? h("p", { class: "hdv-sheet-sub" }, o.subtitle) : null), closeBtn),
    h("div", { class: "sheet-body" }, ...o.body),
    h("div", { class: "sheet-foot hdv-sheet-foot" }, ...o.foot),
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
    openSheets--;
    if (restoreFocus && o.opener.isConnected) o.opener.focus();
    o.onClosed();
  }
  closeBtn.addEventListener("click", requestClose);
  scrim.addEventListener("click", requestClose);
  document.addEventListener("keydown", onKey);
  openSheets++;
  document.body.append(root);
  for (const el of background) el.setAttribute("inert", "");
  document.body.classList.add("sheet-open");
  dialog.focus();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("open")));
  return {
    dialog,
    close,
    setBusy(value) {
      busy = value;
      closeBtn.disabled = value;
      if (value) dialog.focus();
    },
    isBusy: () => busy,
  };
}

/** Kết quả một thao tác trong bảng: tải lại danh sách, kèm banner (vd máy chủ báo đơn đã đổi) nếu có, và câu đọc cho trình đọc màn hình. */
interface SheetOutcome {
  banner?: Banner;
  said?: string;
}

/** Lỗi của máy chủ nghĩa là "màn hình đã cũ" (đơn vừa đổi, không còn phụ trách, không còn đơn) → đóng bảng, tải lại, báo bằng banner. */
const isOutdated = (err: unknown): err is ApiError => err instanceof ApiError && (err.status === 409 || err.status === 403 || err.status === 404);

// ---- Bảng "Sửa số khách" --------------------------------------------------------------------------------------------------------------------------
function openEditSheet(a: Api.MyAssignmentDto, opener: HTMLElement, done: (r: SheetOutcome) => void, onClosed: () => void): void {
  const draft = new Map<string, Partial<Record<PaxCode, number>>>();
  const counters: ReturnType<typeof counter>[] = [];
  const blocks = a.services.map((s) => {
    const name = h("div", { class: "hdv-edit-name" }, [s.name, s.pickupTime].filter(Boolean).join(" · "));
    // Dịch vụ nhập tay, hoặc từ danh mục mà thiếu giá đã chụp (`editablePaxCodes` rỗng): CHỈ HIỂN THỊ — máy chủ không nhận số mới cho chúng.
    if (s.catalogCode === null || s.editablePaxCodes.length === 0) {
      const p = paxSummary(s.pax);
      return h("div", { class: "hdv-edit-svc" }, name, h("p", { class: "hdv-edit-fixed" }, `${p.total} khách${p.detail ? ` · ${p.detail}` : ""} — không sửa được ở đây`));
    }
    const d: Partial<Record<PaxCode, number>> = {};
    draft.set(s.id, d);
    const rows = s.editablePaxCodes.map((code) => {
      const c = counter({ label: `${PAX_LABEL[code]} — ${s.name}`, value: s.pax[code], onChange: (n) => (d[code] = n) });
      counters.push(c);
      return h("div", { class: "hdv-pax-row" }, h("span", { class: "hdv-pax-label" }, PAX_LABEL[code]), c.root);
    });
    return h("div", { class: "hdv-edit-svc" }, name, ...rows);
  });

  const reasonInput = h("input", { id: "hdv-edit-reason", type: "text", maxlength: 300, autocomplete: "off" });
  // Quyết định C của chủ dự án (2026-09-27): nút chọn nhanh CHỈ ĐIỀN chữ vào ô — ô vẫn là chữ tự do, bắt buộc (máy chủ đòi như hôm nay).
  const quick = EDIT_REASON_QUICK.map((text) => {
    const b = h("button", { type: "button", class: "pill-btn" }, text);
    b.addEventListener("click", () => {
      reasonInput.value = text;
      showError(errorBox, null);
    });
    return b;
  });
  const errorBox = h("div", { class: "alert", role: "alert", hidden: true });
  const closeBtn = h("button", { type: "button", class: "btn" }, "Đóng");
  const saveBtn = h("button", { type: "button", class: "btn btn-accent" }, "Xác nhận");

  const sheet = openSheet({
    id: "hdv-edit",
    title: "Sửa số khách",
    subtitle: a.orderCode,
    body: [
      ...blocks,
      h(
        "div",
        { class: "hdv-reason" },
        h("label", { for: "hdv-edit-reason", class: "hdv-reason-label" }, "Lý do sửa (bắt buộc)"),
        h("div", { class: "hdv-quick", role: "group", "aria-label": "Chọn nhanh lý do sửa" }, ...quick),
        reasonInput,
      ),
      errorBox,
    ],
    foot: [closeBtn, saveBtn],
    opener,
    onClosed,
  });
  if (!sheet) return;
  const setBusy = (busy: boolean): void => {
    sheet.setBusy(busy);
    saveBtn.disabled = busy;
    closeBtn.disabled = busy;
    reasonInput.disabled = busy;
    for (const b of quick) b.disabled = busy;
    for (const c of counters) c.setDisabled(busy);
    saveBtn.textContent = busy ? "Đang lưu…" : "Xác nhận";
  };
  closeBtn.addEventListener("click", () => {
    if (!sheet.isBusy()) sheet.close();
  });
  saveBtn.addEventListener("click", async () => {
    if (sheet.isBusy()) return;
    showError(errorBox, null);
    const reason = reasonInput.value.trim();
    if (!reason) {
      showError(errorBox, "Cần nhập lý do sửa.");
      reasonInput.focus();
      return;
    }
    setBusy(true);
    try {
      await api<Api.HandlerMoneyEditResponse>(`/api/orders/${encodeURIComponent(a.orderId)}/handler-money-edit`, {
        method: "POST",
        body: { reason, services: moneyEditServices(a.services, draft) },
      });
      sheet.close(false);
      done({ said: `Đã lưu số khách mới cho đơn ${a.orderCode}.` });
    } catch (err) {
      setBusy(false);
      if (isOutdated(err)) {
        sheet.close(false);
        done({ banner: banner("warning", err.message) });
        return;
      }
      showError(errorBox, err instanceof ApiError ? err.message : NO_NET);
    }
  });
}

// ---- Bảng "Huỷ đơn" -------------------------------------------------------------------------------------------------------------------------------
function openCancelSheet(a: Api.MyAssignmentDto, departDate: string | null, opener: HTMLElement, done: (r: SheetOutcome) => void, onClosed: () => void): void {
  let chosen: string | null = null;
  const errorBox = h("div", { class: "alert", role: "alert", hidden: true });
  const keepBtn = h("button", { type: "button", class: "btn" }, "Giữ đơn");
  const confirmBtn = h("button", { type: "button", class: "btn btn-primary", disabled: true }, "Huỷ đơn");
  // Ô chữ của lý do "Khác" (ADR-0030 điều 2 "Sửa đổi sau khi duyệt") — chỉ hiện khi đã chọn "Khác"; máy chủ (không phải ở đây) chặn số điện thoại.
  const otherInput = h("input", {
    type: "text",
    maxlength: 300,
    autocomplete: "off",
    placeholder: "Lý do khác (không nhập số điện thoại)",
    "aria-label": "Lý do khác",
    hidden: true,
  });
  function updateConfirm(): void {
    confirmBtn.disabled = sheet?.isBusy() === true || chosen === null || (chosen === "other" && otherInput.value.trim() === "");
  }
  const radios = CANCEL_REASONS.map((r) => {
    const input = h("input", { type: "radio", name: "hdv-cancel-reason", value: r.code });
    input.addEventListener("change", () => {
      chosen = r.code;
      otherInput.hidden = r.code !== "other";
      if (r.code === "other") otherInput.focus();
      showError(errorBox, null);
      updateConfirm();
    });
    return { input, el: h("label", { class: "pick" }, input, h("span", { class: "pick-mark", "aria-hidden": "true" }), h("span", { class: "pick-name" }, r.label)) };
  });
  otherInput.addEventListener("input", () => {
    showError(errorBox, null);
    updateConfirm();
  });
  const fieldset = h("fieldset", { class: "pick-list" }, h("legend", { class: "pick-legend" }, "Chọn lý do huỷ"), ...radios.map((r) => r.el), otherInput);

  const sheet = openSheet({
    id: "hdv-cancel",
    title: ["Huỷ đơn ", h("span", { class: "hdv-nowrap" }, `${a.orderCode}?`)], // mã đơn không bị ngắt ở dấu gạch
    body: [h("p", { class: "hdv-cancel-text" }, `Đơn của ${a.customerName}, đi ${departLabel(departDate)}. Thao tác này không hoàn tác được.`), fieldset, errorBox],
    foot: [keepBtn, confirmBtn],
    opener,
    onClosed,
  });
  if (!sheet) return;
  const setBusy = (busy: boolean): void => {
    sheet.setBusy(busy);
    keepBtn.disabled = busy;
    fieldset.disabled = busy;
    otherInput.disabled = busy;
    confirmBtn.disabled = busy || chosen === null || (chosen === "other" && otherInput.value.trim() === "");
    confirmBtn.textContent = busy ? "Đang huỷ…" : "Huỷ đơn";
  };
  keepBtn.addEventListener("click", () => {
    if (!sheet.isBusy()) sheet.close();
  });
  confirmBtn.addEventListener("click", async () => {
    const note = chosen === "other" ? otherInput.value.trim() : null;
    if (sheet.isBusy() || chosen === null || (chosen === "other" && note === "")) return;
    showError(errorBox, null);
    setBusy(true);
    try {
      await api<Api.HandlerCancelResponse>(`/api/orders/${encodeURIComponent(a.orderId)}/handler-cancel`, {
        method: "POST",
        body: chosen === "other" ? { reason: chosen, note } : { reason: chosen },
      });
      sheet.close(false);
      done({ said: `Đã huỷ đơn ${a.orderCode}.` });
    } catch (err) {
      // 400 (note rỗng hoặc chứa số điện thoại — máy chủ, không phải ở đây, kiểm) → giữ bảng mở, KHÔNG mất nội dung đã gõ, hiện đúng lỗi máy chủ.
      setBusy(false);
      if (isOutdated(err)) {
        sheet.close(false);
        done({ banner: banner("warning", err.message) });
        return;
      }
      showError(errorBox, err instanceof ApiError ? err.message : NO_NET);
    }
  });
}

// ---- Thẻ ------------------------------------------------------------------------------------------------------------------------------------------
function cardTop(departDate: string | null, orderCode: string, today: string, chip: { label: string; className: string }): HTMLElement {
  const rel = relLabel(departDate, today);
  return h(
    "div",
    { class: "hdv-card-top" },
    h("div", { class: "hdv-when" }, h("div", { class: "hdv-date" }, departLabel(departDate)), h("div", { class: "hdv-code" }, rel ? `${orderCode} · ${rel}` : orderCode)),
    h("span", { class: chip.className }, chip.label),
  );
}

/**
 * Thông tin chuyến THÊM dưới dòng "Đón:" (bản 1.39, chỉ "Đơn của tôi" — DTO `MyAssignmentServiceDto` đã có sẵn; hàng chờ KHÔNG có các trường này, phần hẹp
 * ADR-0030 S23-1): giờ khởi hành, check-in (ngày nếu khác ngày đi, giờ, nơi), ghi chú dịch vụ. Trường trống bị bỏ.
 */
interface ChuyenThem {
  departTime?: string | null;
  checkinDate?: string | null;
  checkinTime?: string | null;
  checkinPlace?: string | null;
  note?: string | null;
}

function dongChuyenThem(s: ChuyenThem): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (s.departTime) out.push(h("div", { class: "hdv-svc-place" }, `Khởi hành: ${s.departTime}`));
  const checkin = [s.checkinDate ? ngayNgan(s.checkinDate, vnToday(new Date())) : null, s.checkinTime, s.checkinPlace].filter(Boolean).join(" · ");
  if (checkin) out.push(h("div", { class: "hdv-svc-place" }, `Check-in: ${checkin}`));
  if (s.note) out.push(h("div", { class: "hdv-svc-place hdv-svc-note" }, `Ghi chú: ${s.note}`));
  return out;
}

function serviceRows(services: readonly ({ name: string; pax: Api.PoolServiceDto["pax"]; pickupTime: string | null; pickupPlace: string | null } & ChuyenThem)[]): HTMLElement {
  return h(
    "div",
    { class: "hdv-svcs" },
    ...services.map((s) => {
      const p = paxSummary(s.pax);
      return h(
        "div",
        { class: "hdv-svc" },
        h("div", { class: "hdv-svc-time" }, s.pickupTime ?? "—"),
        h(
          "div",
          { class: "hdv-svc-body" },
          h("div", { class: "hdv-svc-name" }, s.name),
          h("div", { class: "hdv-svc-pax" }, h("strong", null, `${p.total} khách`), p.detail ? ` · ${p.detail}` : null),
          s.pickupPlace ? h("div", { class: "hdv-svc-place" }, `Đón: ${s.pickupPlace}`) : null,
          ...dongChuyenThem(s),
        ),
      );
    }),
  );
}

// ---- Khối chính -----------------------------------------------------------------------------------------------------------------------------------
/** Dựng "Việc của tôi" vào `el` (#myjobs). Chỉ gọi cho tài khoản có quyền Hướng dẫn viên (web/account.ts). Lỗi mạng ở cả hai lần tải đầu → khối ẩn. */
export async function initViecCuaToi(el: HTMLElement, staff: Staff): Promise<void> {
  // Hàng chờ: ô `order.pool.view` và không mang quyền Đối tác (tài khoản lai — máy chủ 403, Q-M). Chỉ ẩn/hiện; máy chủ vẫn kiểm lại.
  const showPool = can(staff, "order.pool.view") && !holdsPartner(staff);
  const poolCount = h("span", { class: "hdv-count" }, "0");
  const mineCount = h("span", { class: "hdv-count" }, "0");
  const poolTile = h("a", { class: "hdv-tile hdv-tile-queue", href: "#cho-nhan", hidden: !showPool }, h("span", null, "Chờ nhận"), poolCount);
  const mineTile = h("a", { class: "hdv-tile hdv-tile-mine", href: "#cua-toi" }, h("span", null, "Đơn của tôi"), mineCount);
  const said = h("p", { class: "visually-hidden", role: "status" });

  const poolHeading = h("h2", { id: "cho-nhan-h", tabindex: -1 }, "Đơn chờ nhận");
  const poolBanner = h("div", { class: "banner", role: "alert", hidden: true });
  const poolEmpty = h("p", { class: "hdv-empty", hidden: true }, "Không có đơn nào đang chờ nhận.");
  const poolError = h("p", { class: "hdv-empty", hidden: true }, "Chưa tải được đơn chờ nhận. Kiểm tra kết nối mạng rồi tải lại trang.");
  const poolList = h("div", { class: "hdv-pool-list" });
  const poolSec = h(
    "section",
    { id: "cho-nhan", class: "hdv-sec", "aria-labelledby": "cho-nhan-h", hidden: !showPool },
    h("div", { class: "hdv-sec-head" }, poolHeading, h("p", { class: "hdv-sub" }, "Chưa có ai phụ trách · ngày đi gần nhất lên trước")),
    poolBanner,
    poolEmpty,
    poolError,
    poolList,
  );

  const mineHeading = h("h2", { id: "cua-toi-h", tabindex: -1 }, "Đơn của tôi");
  const mineBanner = h("div", { class: "banner", role: "alert", hidden: true });
  const mineEmpty = h("p", { class: "hdv-empty", hidden: true }, "Bạn chưa được giao phụ trách đơn nào.");
  const mineError = h("p", { class: "hdv-empty", hidden: true }, "Chưa tải được đơn của bạn. Kiểm tra kết nối mạng rồi tải lại trang.");
  const mineList = h("div", { class: "hdv-mine-list" });
  const mineSec = h(
    "section",
    { id: "cua-toi", class: "hdv-sec", "aria-labelledby": "cua-toi-h" },
    h("div", { class: "hdv-sec-head" }, mineHeading, h("p", { class: "hdv-sub" }, "Đơn bạn đang phụ trách")),
    mineBanner,
    mineEmpty,
    mineError,
    mineList,
  );

  el.classList.add("hdv");
  replaceChildren(
    el,
    h(
      "div",
      { class: "hdv-head" },
      h("div", { class: "hdv-titles" }, h("div", { class: "hdv-eyebrow" }, `${APP_NAME} · Việc của tôi`), h("div", { class: "hdv-title" }, `HDV: ${staff.fullName}`)),
      h("nav", { class: "hdv-nav", "aria-label": "Việc của tôi" }, poolTile, mineTile),
    ),
    said,
    h("div", { class: "hdv-cols" }, poolSec, mineSec),
  );

  let claiming = false;
  let pending = false;
  let lastPool: Api.PoolOrderDto[] = [];
  let poolSeq = 0;
  const claimButtons = new Set<HTMLButtonElement>();

  // -- Hàng chờ --
  /** Thẻ biến mất có chuyển động (bản thiết kế: co lại + mờ dần) rồi mới dựng danh sách mới; tắt chuyển động (prefers-reduced-motion) → dựng ngay. */
  const leaveMs = (): number => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
    const v = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--m-base"));
    return Number.isFinite(v) ? v + 50 : 350;
  };
  function poolCard(o: Api.PoolOrderDto, today: string): HTMLElement {
    const btn = h("button", { type: "button", class: "btn btn-accent hdv-claim", disabled: claiming }, "Nhận");
    claimButtons.add(btn);
    btn.addEventListener("click", () => void claim(o, btn));
    const card = h("article", { class: "hdv-card" }, cardTop(o.departDate, o.orderCode, today, { label: "Chờ nhận", className: "chip chip-warn hdv-chip" }), serviceRows(o.services), btn);
    return h("div", { class: "hdv-collapse", "data-order-id": o.orderId }, h("div", { class: "hdv-collapse-inner" }, card));
  }
  function renderPool(orders: Api.PoolOrderDto[]): void {
    poolCount.textContent = String(orders.length);
    poolEmpty.hidden = orders.length > 0;
    const ids = new Set(orders.map((o) => o.orderId));
    const leaving = [...poolList.children].filter((w): w is HTMLElement => w instanceof HTMLElement && !ids.has(w.dataset.orderId ?? ""));
    const build = (): void => {
      claimButtons.clear();
      const today = vnToday(new Date());
      replaceChildren(poolList, ...orders.map((o) => poolCard(o, today)));
    };
    const ms = leaving.length > 0 ? leaveMs() : 0;
    const mine = ++poolSeq;
    if (ms === 0) return build();
    for (const w of leaving) {
      w.classList.add("is-leaving");
      w.setAttribute("aria-hidden", "true");
      w.setAttribute("inert", "");
    }
    setTimeout(() => {
      if (mine === poolSeq) build();
    }, ms);
  }
  async function loadPool(): Promise<boolean> {
    try {
      const { orders } = await api<Api.PoolResponse>("/api/orders/pool");
      lastPool = orders;
      poolError.hidden = true;
      renderPool(orders);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        poolSec.hidden = true; // máy chủ không cho xem hàng chờ (vd tài khoản lai): ẩn khối, không hiện lỗi
        poolTile.hidden = true;
        return false;
      }
      poolError.hidden = false;
      poolEmpty.hidden = true;
      renderPool(lastPool); // dựng lại danh sách cũ: nút Nhận mở khoá lại
      return false;
    }
  }
  const setClaimLock = (locked: boolean): void => {
    for (const b of claimButtons) b.disabled = locked;
  };
  async function claim(o: Api.PoolOrderDto, btn: HTMLButtonElement): Promise<void> {
    if (claiming) return;
    claiming = true;
    renderBanner(poolBanner, null);
    setClaimLock(true);
    btn.textContent = "Đang nhận…";
    try {
      await api<Api.SetHandlerResponse>(`/api/orders/${encodeURIComponent(o.orderId)}/handler`, { method: "PUT", body: { staffId: staff.id } });
      said.textContent = `Bạn đã nhận đơn ${o.orderCode}.`;
    } catch (err) {
      // 409 stale (người khác nhận trước) → "Đơn này vừa có người khác nhận phụ trách…"; đơn vừa huỷ/qua ngày đi → câu của máy chủ. Mọi trường hợp: tải lại.
      const f = handlerFailure(err instanceof ApiError ? { status: err.status, code: err.code, message: err.message } : null, "claim");
      renderBanner(poolBanner, f.banner);
    } finally {
      claiming = false;
      setClaimLock(false); // mở khoá ngay (thẻ đang co lại đã `inert`); danh sách mới dựng lại sau lần tải dưới đây
      await lamMoi.yeuCau();
      poolHeading.focus({ preventScroll: true });
    }
  }

  // -- Đơn của tôi --
  /** Tiền của đơn lấy từ billing (`POST /api/ledger/balances` — sổ tiền lượt 1, ADR-0026 đ9); `undefined` = chưa tải được (hiện "—", không đoán). */
  type TienDon = Api.LedgerBalancesResponse["balances"][string] | undefined;
  function mineCard(a: Api.MyAssignmentDto, today: string, tien: TienDon): HTMLElement {
    const dates = a.services.map((s) => s.departDate);
    const departDate = orderDepartDate(dates);
    const departed = tripDeparted(dates, today);
    const chip = myJobChip(a.status, departed);
    // Đơn đã "Đã giao – đã thu đủ" bị khoá (ADR-0025 đ5): không còn nút sửa số khách / huỷ (máy chủ cũng từ chối).
    const actions = tien?.daGiao ? { editPax: false, cancel: false } : myJobActions({ status: a.status, departed });
    // "Sửa số khách" chỉ khi có ít nhất một dịch vụ sửa được (dịch vụ nhập tay / thiếu giá đã chụp thì bảng chỉ để xem — không mở bảng rỗng).
    const canEdit = actions.editPax && a.services.some((s) => s.catalogCode !== null && s.editablePaxCodes.length > 0);
    const buttons: HTMLElement[] = [];
    if (canEdit) {
      const b = h("button", { type: "button", class: "btn btn-primary hdv-act" }, "Sửa số khách");
      b.addEventListener("click", () => openEditSheet(a, b, afterSheet, onSheetClosed));
      buttons.push(b);
    }
    if (actions.cancel) {
      const b = h("button", { type: "button", class: "btn hdv-act hdv-act-cancel" }, "Huỷ đơn");
      b.addEventListener("click", () => openCancelSheet(a, departDate, b, afterSheet, onSheetClosed));
      buttons.push(b);
    }
    return h(
      "article",
      { class: "hdv-card", "data-order-id": a.orderId },
      cardTop(departDate, a.orderCode, today, { label: chip.label, className: CHIP_CLASS[chip.tone] }),
      h(
        "div",
        { class: "hdv-customer" },
        h("div", { class: "hdv-customer-text" }, h("div", { class: "hdv-customer-name" }, a.customerName), h("div", { class: "hdv-customer-phone" }, a.customerPhone)),
        h("a", { class: "hdv-call", href: telHref(a.customerPhone), "aria-label": `Gọi khách ${a.customerName}` }, icon("handset", 18), h("span", null, "Gọi")),
      ),
      serviceRows(a.services), // bản 1.39: bỏ dòng "HDV: <tên>" lặp ở từng thẻ — tên đã ở đầu khối
      h(
        "dl",
        { class: "hdv-money" },
        h("div", null, h("dt", null, "Tổng tiền"), h("dd", null, vnd(a.total))),
        // Sổ tiền lượt 1 (kiểm độc lập T-2): số là ĐÃ THU của billing (gồm cả tiền thu lúc giao) nên nhãn "Đã thu", không "Thanh toán trước" của bản 1.40.
        h("div", null, h("dt", null, "Đã thu"), h("dd", null, tien ? vnd(tien.daThu) : "—")),
        h("div", null, h("dt", null, "Còn lại"), h("dd", { class: tien && tien.conLai > 0 ? "money-due" : null }, tien ? vnd(tien.conLai) : "—")),
      ),
      tien?.daGiao ? h("p", { class: "hdv-note" }, tien.hoanThanh ? "Hoàn thành." : "Đã giao – đã thu đủ: đơn đã khoá.") : null,
      a.status === "draft" ? h("p", { class: "hdv-note" }, "Đơn đang chờ xác nhận — chưa thể huỷ hay sửa số khách.") : null,
      // bản 1.39: "Xem đơn" mở trang đơn (hướng dẫn viên xem được đơn mình đang phụ trách — máy chủ quyết). Ghi tiền đã thu / bấm "Đã giao – đã thu đủ"
      // làm ở đó (mục Thanh toán — sổ tiền lượt 1).
      h("div", { class: "hdv-actions" }, ...buttons, h("a", { class: "btn hdv-act hdv-xem", href: `/order?id=${encodeURIComponent(a.orderId)}` }, "Xem đơn")),
    );
  }
  async function loadMine(): Promise<boolean> {
    try {
      const { assignments } = await api<Api.MyAssignmentsResponse>("/api/dispatch/mine");
      // Tiền từng đơn: MỘT lời gọi billing cho cả danh sách; lỗi thì thẻ hiện "—" (không đoán số) — danh sách vẫn hiện.
      const tien = assignments.length
        ? await api<Api.LedgerBalancesResponse>("/api/ledger/balances", { method: "POST", body: { orderIds: assignments.map((a) => a.orderId) } }).then((r) => r.balances, () => ({}) as Api.LedgerBalancesResponse["balances"])
        : {};
      const today = vnToday(new Date());
      const rows = sortMyJobs(
        assignments.map((a) => ({ a, orderCode: a.orderCode, status: a.status, departDate: orderDepartDate(a.services.map((s) => s.departDate)), departed: tripDeparted(a.services.map((s) => s.departDate), today) })),
      );
      mineCount.textContent = String(assignments.length);
      mineError.hidden = true;
      mineEmpty.hidden = assignments.length > 0;
      // bản 1.39: tiêu đề nhóm "Đã đi tour" trước thẻ đầu tiên đã đi (cùng điều kiện xếp cuối của `sortMyJobs`: đã xác nhận và qua ngày đi)
      const daDi = rows.findIndex((r) => r.status === "confirmed" && r.departed);
      const the = rows.map((r) => mineCard(r.a, today, tien[r.a.orderId]));
      if (daDi >= 0) the.splice(daDi, 0, h("h3", { class: "hdv-nhom" }, "Đã đi tour"));
      replaceChildren(mineList, ...the);
      return true;
    } catch {
      mineError.hidden = false;
      return false;
    }
  }

  // -- Làm mới (Bảng tin, sau thao tác) --
  const lamMoi = taoBoLamMoi(async () => {
    if (nenHoanLamMoi({ dangGo: false, coODaSua: false, hopHuyMo: openSheets > 0 || claiming })) {
      pending = true;
      return;
    }
    pending = false;
    await Promise.all([showPool && !poolSec.hidden ? loadPool() : Promise.resolve(true), loadMine()]);
  });
  function onSheetClosed(): void {
    if (pending) void lamMoi.yeuCau();
  }
  function afterSheet(r: SheetOutcome): void {
    renderBanner(mineBanner, r.banner ?? null);
    if (r.said) said.textContent = r.said;
    void lamMoi.yeuCau().then(() => mineHeading.focus({ preventScroll: true }));
  }

  const [poolOk, mineOk] = await Promise.all([showPool ? loadPool() : Promise.resolve(false), loadMine()]);
  if (!poolOk && !mineOk) return; // lỗi mạng cả hai: khối ẩn, không ảnh hưởng phần còn lại của trang (cùng khuôn initMaintenance)
  el.hidden = false;
  // Đăng ký MỘT lần, sau lần tải đầu; bộ gộp tránh hai lần tải song song.
  window.addEventListener("don-thay-doi", () => void lamMoi.yeuCau());
  window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
}
