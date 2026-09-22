import { ApiError, api, type Api, type AuditEntry, type Order, type Staff } from "./api";
import { renderBanner } from "./banner";
import { openBookerSheet } from "./booker-sheet";
import { openConfirmationDialog } from "./confirmation-dialog";
import { byId, h, replaceChildren } from "./dom";
import { METHOD_LABEL, STATUS_LABEL, actionLabel, dateTime, dayMonth, paxCounts, vnd } from "./format";
import { openHandlerSheet } from "./handler-sheet";
import { icon } from "./icons";
import { renderServices } from "./order-services";
import { initShell, setBarTitle } from "./shell";
import { openTripSheet } from "./trip-sheet";
import { NO_BOOKER_TEXT } from "../src/shared/booker";
import { NO_HANDLER_TEXT, handlerControls, handlerFailure, handlerSaved } from "../src/shared/handler-view";
import { type PaxCounts } from "../src/shared/order-lines";
import { banner, classifyOrderError, type Banner } from "../src/shared/order-errors";
import { orderActions } from "../src/shared/order-view";

const id = new URLSearchParams(location.search).get("id");
const bannerEl = byId("error");
const root = byId("order");
const actions = byId("actions");
const sendEl = byId("send");
let current: Order | null = null;
let staff: Staff | null = null; // gán sau `initShell()`; các hàm dưới chỉ chạy sau đó

// Form lập đơn MỚI chuyển tới `/order?id=…&moi=1`: mở hộp thoại "Xác nhận đơn để gửi khách" (ảnh PNG) đúng một lần, sau lần tải đơn đầu tiên. Bỏ `moi` khỏi URL NGAY (trước mọi await), để dù
// bước dựng trang sau đó ném lỗi thì tải lại trang cũng không bật lại hộp thoại.
let autoOpenConfirmation = new URLSearchParams(location.search).get("moi") === "1";
if (autoOpenConfirmation) {
  const url = new URL(location.href);
  url.searchParams.delete("moi");
  history.replaceState(history.state, "", url.pathname + url.search + url.hash);
}

const sendButton = (): HTMLButtonElement | null => sendEl.querySelector("button");
/** Ảnh xác nhận gửi khách của đơn đang xem (mọi trạng thái, mọi người xem được đơn — ảnh chỉ in lại dữ liệu họ đã thấy). */
function openConfirmation(): void {
  if (current) openConfirmationDialog({ order: current, opener: sendButton });
}

/** `null` ẩn banner. Liên kết "Sửa" của banner incomplete_trip mở form ĐÚNG thẻ (`?focus=`, Task 7). */
function show(b: Banner | null): void {
  renderBanner(bannerEl, b, {
    reloadOrder: () => void load(),
    reloadPage: () => location.reload(),
    editHref: (serviceId) => `/order-form?id=${encodeURIComponent(id!)}&focus=${encodeURIComponent(serviceId)}`,
  });
}

/** Lỗi của máy chủ → banner theo ma trận đặc tả 5.2 (incomplete_trip có danh sách thiếu); lỗi mạng → câu chung. */
function errorBanner(err: unknown): Banner {
  if (!(err instanceof ApiError)) return banner("danger", "Không kết nối được máy chủ.");
  const b = classifyOrderError(
    { status: err.status, code: err.code, message: err.message, details: err.details },
    { serviceNames: current?.services.map((s) => s.name) ?? [], formatMoney: vnd },
  );
  // 409 ở trang đơn (vd invalid_transition: đơn vừa đổi trạng thái ở nơi khác) phải có nút "Tải lại đơn" — PWA standalone không có tải lại của trình duyệt.
  // Trừ incomplete_trip: banner đó đã có liên kết "Sửa" tới đúng dịch vụ và ma trận đặc tả 5.2 ghi cột Hành động là "—" (stale đã có reload_order sẵn).
  return b.action === "none" && err.status === 409 && err.code !== "incomplete_trip" ? { ...b, action: "reload_order" } : b;
}

function kv(label: string, value: string | null, cls = ""): HTMLElement {
  return h("div", { class: `kv ${cls}` }, h("span", { class: "muted" }, label), h("span", null, value || "—"));
}

// ---- người phụ trách (v1.0, Task 8) ----
type Handler = Api.HandlerDto | null | undefined; // null = chưa có người phụ trách; undefined = CHƯA BIẾT (lời gọi lỗi) — xem handlerControls

/**
 * Người phụ trách đang mở của đơn. KHÔNG bao giờ ném lỗi: lời gọi hỏng thì đơn vẫn hiển thị, khối người phụ trách báo "chưa tải được" (không đoán "chưa có người" rồi mời nhận).
 * Phản hồi thiếu khoá hoặc sai dạng cũng coi là chưa biết (dữ liệu từ ngoài trang).
 */
async function loadHandler(orderId: string): Promise<Handler> {
  try {
    const found = (await api<Api.HandlersResponse>(`/api/dispatch/handlers?orderIds=${encodeURIComponent(orderId)}`)).handlers[orderId];
    if (found === null) return null;
    return found && typeof found.name === "string" && found.name.trim() !== "" ? found : undefined;
  } catch {
    return undefined;
  }
}

const asErrorInput = (err: unknown) => (err instanceof ApiError ? { status: err.status, code: err.code, message: err.message } : null);
/** Sau đổi/nhận người phụ trách hoặc khi màn hình đã lỗi thời: tải lại đơn, báo bằng `b` (tải lại lỗi thì giữ banner lỗi của `load()`, không đè), trả focus. */
async function reloadWith(b: Banner): Promise<void> {
  await load();
  if (bannerEl.hidden) show(b);
  focusHandlerControl();
}
/** Nút đổi đã bị dựng lại sau khi tải lại → trả focus về nút mới; người dùng không còn nút nào (vd vừa giao đơn đi) thì focus tiêu đề khối để không rơi ra `body`. */
const focusHandlerControl = (): void => (document.querySelector<HTMLElement>('[data-action="change-handler"]') ?? document.getElementById("handler-title"))?.focus();

function changeButton(order: Order, handler: Api.HandlerDto | null, label: string): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn", "data-action": "change-handler" }, label);
  btn.addEventListener("click", () =>
    openHandlerSheet(
      {
        order,
        current: handler,
        onSaved: (saved) => void reloadWith(banner("info", handlerSaved("assign", saved.name, handler !== null))),
        onOutdated: (b) => void reloadWith(b),
      },
      btn,
    ),
  );
  return btn;
}

/** "Nhận phụ trách": nhận cho CHÍNH MÌNH khi đơn chưa có người (máy chủ kiểm lại `dispatch.claim` và "chưa có người"). */
function claimButton(order: Order): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn btn-primary", "data-action": "claim-handler" }, "Nhận phụ trách");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    show(null);
    try {
      const { handler } = await api<Api.SetHandlerResponse>(`/api/orders/${encodeURIComponent(order.id)}/handler`, { method: "PUT", body: { staffId: staff!.id } });
      await reloadWith(banner("info", handlerSaved("claim", handler.name, false)));
    } catch (err) {
      const failure = handlerFailure(asErrorInput(err), "claim");
      if (failure.reload) await reloadWith(failure.banner);
      else {
        show(failure.banner);
        btn.disabled = false;
      }
    }
  });
  return btn;
}

/** Khối "Người phụ trách": tên (hoặc chip "Chưa có người phụ trách") + nút đổi/nhận theo `can()` (src/shared/handler-view.ts). Chưa biết người phụ trách → chữ báo + "Thử lại", không nút nào khác. */
function handlerCard(order: Order, handler: Handler): HTMLElement {
  const controls = handlerControls(staff!, order, handler);
  const buttons: HTMLElement[] = [];
  let summary: HTMLElement;
  if (handler === undefined) {
    summary = h("p", { class: "handler-unknown" }, "Chưa tải được người phụ trách.");
    const retry = h("button", { type: "button", class: "btn", "data-action": "retry-handler" }, "Thử lại");
    retry.addEventListener("click", () => void load().then(focusHandlerControl));
    buttons.push(retry);
  } else {
    summary = h("p", { class: "handler-name" }, handler === null ? h("span", { class: "chip chip-warn" }, NO_HANDLER_TEXT) : handler.name);
    if (controls.assign) buttons.push(changeButton(order, handler, controls.assignLabel));
    if (controls.claim) buttons.push(claimButton(order));
  }
  return h(
    "section",
    { class: "card handler-card", "aria-labelledby": "handler-title" },
    h("h2", { id: "handler-title", tabindex: -1 }, "Người phụ trách"),
    summary,
    buttons.length ? h("div", { class: "handler-actions" }, ...buttons) : null,
  );
}

/**
 * Dải tóm tắt đầu trang (Bước 2 Đợt B): mã đơn + trạng thái, chuyến (của DỊCH VỤ ĐẦU TIÊN — cùng quy ước
 * "dịch vụ đầu quyết định trip" dùng ở trang Đơn hàng, `OrderSummaryTripDto`), khách, tổng số khách (cộng dồn
 * mọi dịch vụ), còn lại phải thu. Phải chạy được khi đơn CHƯA có dịch vụ nào (đơn nháp mới tạo, `services` rỗng):
 * mọi trường của dịch vụ đọc qua `?.`, không văng lỗi.
 */
function summaryBand(order: Order): HTMLElement {
  const firstSvc = order.services[0];
  const when = firstSvc?.departDate ? `${dayMonth(firstSvc.departDate)}${firstSvc.pickupTime ? ` · ${firstSvc.pickupTime}` : ""}` : "Chưa có ngày đón";
  const totalPax = order.services.reduce<PaxCounts>(
    (sum, s) => ({ adult: sum.adult + s.pax.adult, child: sum.child + s.pax.child, senior: sum.senior + s.pax.senior, infant: sum.infant + s.pax.infant }),
    { adult: 0, child: 0, senior: 0, infant: 0 },
  );
  const pax = paxCounts(totalPax);
  // Cùng công thức rút gọn tên dịch vụ dùng ở trang Đơn hàng (`web/orders.ts`, `serviceLine`): tổng số khách phía trên CỘNG DỒN mọi
  // dịch vụ, nên dòng phụ này không được chỉ ghi tên dịch vụ đầu tiên (I2) — phải phản ánh đơn có bao nhiêu dịch vụ.
  const serviceNames = order.services.map((s) => s.name);
  const serviceLine = serviceNames.length === 0 ? "—" : serviceNames.length === 1 ? serviceNames[0] : `${serviceNames[0]} +${serviceNames.length - 1} dịch vụ`;
  const stat = (label: string, value: string, sub?: string, due = false) =>
    h("div", null, h("div", { class: "label" }, label), h("div", { class: due ? "value due" : "value" }, value), sub ? h("div", { class: "sub" }, sub) : null);
  return h(
    "div",
    { class: "order-summary-band" },
    h(
      "div",
      null,
      h("div", { class: "label" }, "MÃ ĐƠN"),
      h("div", { class: "value" }, order.orderCode, " ", h("span", { class: `badge badge-${order.status}` }, STATUS_LABEL[order.status])),
    ),
    h("div", { class: "sep" }),
    h(
      "div",
      { class: "grid4" },
      stat("ĐÓN", when, firstSvc?.pickupPlace ?? undefined),
      stat("KHÁCH", order.customerName, order.customerPhone),
      stat("SỐ KHÁCH", pax || "—", serviceLine),
      stat("CÒN LẠI", vnd(order.remainingAmount), `Tổng ${vnd(order.total)} · đã cọc ${vnd(order.depositAmount)}`, order.remainingAmount > 0),
    ),
  );
}

function render(order: Order, history: AuditEntry[], canModify: boolean, handler: Handler): void {
  current = order;
  const a = orderActions(order.status, canModify);
  document.title = `${order.orderCode} — Tour Đảo Booking`;
  setBarTitle(order.orderCode);
  replaceChildren(
    root,
    // Mã đơn + trạng thái đã hiện nổi bật ở dải tóm tắt ngay dưới đây; h1 ở đây chỉ còn phục vụ trình đọc màn hình (axe page-has-heading-one), ẩn khỏi mắt (CSS `.detail-head h1`).
    h("header", { class: "detail-head" }, h("h1", null, order.orderCode)),
    summaryBand(order),
    h("p", { class: "muted" }, `Lập ${dateTime(order.createdAt)} bởi ${order.staffName}`, order.confirmedAt && ` · Xác nhận ${dateTime(order.confirmedAt)}`),
    a.locked ? h("p", { class: "lock-note" }, icon("lock", 18), "Đơn đã xác nhận: dịch vụ, số khách và tiền đã khoá. Chỉ sửa được thông tin chuyến.") : null,

    h(
      "div",
      { class: "order-layout" },
      h(
        "div",
        null,
        handlerCard(order, handler),

        h(
          "section",
          { class: "card" },
          h("h2", null, "Khách hàng"),
          kv("Tên", order.customerName),
          kv("Số điện thoại", order.customerPhone),
          kv("Email", order.customerEmail),
          kv("Ghi chú", order.customerNote),
          kv("Hồ sơ khách", order.bookerName ?? NO_BOOKER_TEXT),
          a.editTrip ? bookerButton(order) : null,
        ),

        renderServices(order, a.locked),
      ),
      h(
        "div",
        { class: "side" },
        h(
          "section",
          { class: "card totals" },
          h("h2", null, "Thanh toán"),
          kv("Tạm tính", vnd(order.subtotal)),
          kv("Giảm giá", vnd(order.discount)),
          kv("Tổng cộng", vnd(order.total), "strong"),
          kv("Đã cọc", order.depositAmount ? `${vnd(order.depositAmount)}${order.depositMethod ? ` (${METHOD_LABEL[order.depositMethod]})` : ""}` : vnd(0)),
          kv("Còn lại", vnd(order.remainingAmount), "strong"),
          kv("Ghi chú thanh toán", order.paymentNote),
        ),
      ),
    ),

    // Ở NGOÀI `.order-layout` có chủ đích (điện thoại dưới 900px không có rule riêng cho lưới → các con xếp theo thứ tự DOM;
    // đặt ở đây giữ đúng thứ tự cũ "Thanh toán trước Lịch sử". Máy tính ≥900px: khối này trải hết bề ngang, nằm dưới lưới 2 cột.
    // D6: SALES không thấy nhật ký đơn của người khác → history rỗng: ẩn cả khối.
    history.length
      ? h(
          "section",
          { class: "card" },
          h("h2", null, "Lịch sử"),
          h("ul", { class: "history" }, ...history.map((e) => h("li", null, h("span", { class: "muted" }, dateTime(e.at)), ` — ${actionLabel(e.action)} · ${e.staffName}`))),
        )
      : null,
  );

  const btns: HTMLElement[] = [];
  // Quyền sửa/xác nhận/huỷ do MÁY CHỦ quyết (`canModify`, kể cả người phụ trách — ADR-0009); câu này chỉ giải thích cho người không có quyền.
  if (a.noPermission) btns.push(h("p", { class: "muted" }, `Chỉ ${order.staffName} (người lập đơn), người phụ trách đơn hoặc quản trị viên mới được sửa, xác nhận hoặc huỷ đơn này.`));
  if (a.edit) btns.push(h("a", { class: "btn", href: `/order-form?id=${encodeURIComponent(order.id)}` }, "Sửa"));
  if (a.confirm) btns.push(change("Xác nhận đơn", "confirmed", "Xác nhận đơn này? Sau khi xác nhận, dịch vụ, số khách và tiền sẽ bị khoá — chỉ còn sửa được thông tin chuyến.", "btn btn-accent"));
  if (a.editTrip) btns.push(editTripButton(order));
  if (a.cancel) btns.push(change("Huỷ đơn", "cancelled", "Huỷ đơn này? Việc huỷ không thể hoàn tác.", "btn btn-danger"));
  replaceChildren(actions, ...btns);
  // Nút riêng, ngoài `#actions` (bộ nút sửa/xác nhận/huỷ phụ thuộc trạng thái và quyền; nút này luôn có).
  const send = h("button", { type: "button", class: "btn btn-primary", "data-action": "send-confirmation" }, "Xác nhận gửi khách");
  send.addEventListener("click", openConfirmation);
  replaceChildren(sendEl, send);
}

const focusChangeBooker = (): void => document.querySelector<HTMLElement>('[data-action="change-booker"]')?.focus();

/** Đơn đã xác nhận: mở bảng "Đổi khách" (ADR-0011 điều 2 — cùng điều kiện hiện nút với "Sửa thông tin chuyến"). Đơn nháp đổi khách trong form. */
function bookerButton(order: Order): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn", "data-action": "change-booker" }, "Đổi khách");
  btn.addEventListener("click", () =>
    openBookerSheet(
      {
        order,
        onSaved: () =>
          void load().then(() => {
            if (bannerEl.hidden) show(banner("info", "Đã đổi khách."));
            focusChangeBooker();
          }),
        onReload: () => void load().then(focusChangeBooker),
      },
      btn,
    ),
  );
  return btn;
}

const focusEditTrip = (): void => document.querySelector<HTMLElement>('[data-action="edit-trip"]')?.focus();

/** Đơn đã xác nhận: mở bảng sửa chuyến. Sau khi lưu/tải lại, nút bị dựng lại → trả focus về nút mới; lưu xong báo bằng banner thông tin (bảng vừa biến mất). */
function editTripButton(order: Order): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn btn-primary", "data-action": "edit-trip" }, "Sửa thông tin chuyến");
  btn.addEventListener("click", () =>
    openTripSheet(
      {
        order,
        onSaved: () =>
          void load().then(() => {
            if (bannerEl.hidden) show(banner("info", "Đã lưu thông tin chuyến.")); // tải lại lỗi thì giữ banner lỗi, không đè
            focusEditTrip();
          }),
        onReload: () => void load().then(focusEditTrip),
      },
      btn,
    ),
  );
  return btn;
}

function change(label: string, to: "confirmed" | "cancelled", prompt: string, cls: string): HTMLButtonElement {
  const btn = h("button", { type: "button", class: cls }, label);
  btn.addEventListener("click", async () => {
    if (!confirm(prompt)) return;
    btn.disabled = true;
    show(null);
    try {
      await api(`/api/orders/${encodeURIComponent(id!)}/status`, { method: "POST", body: { status: to } });
      await load();
    } catch (err) {
      show(errorBanner(err));
      btn.disabled = false;
    }
  });
  return btn;
}

async function load(): Promise<void> {
  try {
    // Người phụ trách tải song song với đơn; lời gọi của nó không bao giờ ném lỗi (xem loadHandler) nên đơn luôn hiển thị được.
    const [{ order, history, canModify }, handler] = await Promise.all([api<Api.OrderDetailResponse>(`/api/orders/${encodeURIComponent(id!)}`), loadHandler(id!)]);
    show(null);
    render(order, history, canModify, handler);
    if (autoOpenConfirmation) {
      autoOpenConfirmation = false;
      openConfirmation();
    }
  } catch (err) {
    // Có nút "Tải lại đơn": PWA standalone không có tải lại của trình duyệt, và `load()` tự nuốt lỗi nên các nút vừa bấm (Xác nhận/Huỷ) có thể đang khoá.
    show(banner("danger", err instanceof ApiError ? err.message : "Không tải được đơn.", { action: "reload_order" }));
  }
}

staff = await initShell();
if (!id) show(banner("danger", "Thiếu mã đơn."));
else await load();
