import { ApiError, api, type Api, type AuditEntry, type Order } from "./api";
import { renderBanner } from "./banner";
import { byId, h, replaceChildren } from "./dom";
import { METHOD_LABEL, STATUS_LABEL, actionLabel, dateTime, vnd } from "./format";
import { icon } from "./icons";
import { renderServices } from "./order-services";
import { initShell, setBarTitle } from "./shell";
import { openTripSheet } from "./trip-sheet";
import { banner, classifyOrderError, type Banner } from "../src/shared/order-errors";
import { orderActions } from "../src/shared/order-view";

const id = new URLSearchParams(location.search).get("id");
const bannerEl = byId("error");
const root = byId("order");
const actions = byId("actions");
let current: Order | null = null;

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
  // Mọi 409 ở trang đơn (vd invalid_transition: đơn vừa đổi trạng thái ở nơi khác) phải có nút "Tải lại đơn" — PWA standalone không có tải lại của trình duyệt.
  return b.action === "none" && err.status === 409 ? { ...b, action: "reload_order" } : b;
}

function kv(label: string, value: string | null, cls = ""): HTMLElement {
  return h("div", { class: `kv ${cls}` }, h("span", { class: "muted" }, label), h("span", null, value || "—"));
}

function render(order: Order, history: AuditEntry[], canModify: boolean): void {
  current = order;
  const a = orderActions(order.status, canModify);
  document.title = `${order.orderCode} — Tour Đảo Booking`;
  setBarTitle(order.orderCode);
  replaceChildren(
    root,
    h(
      "header",
      { class: "detail-head" },
      h("h1", null, order.orderCode),
      h("span", { class: `badge badge-${order.status}` }, STATUS_LABEL[order.status]),
    ),
    h("p", { class: "muted" }, `Lập ${dateTime(order.createdAt)} bởi ${order.staffName}`, order.confirmedAt && ` · Xác nhận ${dateTime(order.confirmedAt)}`),
    a.locked ? h("p", { class: "lock-note" }, icon("lock", 18), "Đơn đã xác nhận: dịch vụ, số khách và tiền đã khoá. Chỉ sửa được thông tin chuyến.") : null,

    h("section", { class: "card" }, h("h2", null, "Khách hàng"), kv("Tên", order.customerName), kv("Số điện thoại", order.customerPhone), kv("Email", order.customerEmail), kv("Ghi chú", order.customerNote)),

    renderServices(order, a.locked),

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
  if (a.noPermission) btns.push(h("p", { class: "muted" }, `Chỉ ${order.staffName} (người lập đơn) hoặc quản trị viên mới được sửa, xác nhận hoặc huỷ đơn này.`));
  if (a.edit) btns.push(h("a", { class: "btn", href: `/order-form?id=${encodeURIComponent(order.id)}` }, "Sửa"));
  if (a.confirm) btns.push(change("Xác nhận đơn", "confirmed", "Xác nhận đơn này? Sau khi xác nhận, dịch vụ, số khách và tiền sẽ bị khoá — chỉ còn sửa được thông tin chuyến.", "btn btn-accent"));
  if (a.editTrip) btns.push(editTripButton(order));
  if (a.cancel) btns.push(change("Huỷ đơn", "cancelled", "Huỷ đơn này? Việc huỷ không thể hoàn tác.", "btn btn-danger"));
  replaceChildren(actions, ...btns);
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
    const { order, history, canModify } = await api<Api.OrderDetailResponse>(`/api/orders/${encodeURIComponent(id!)}`);
    show(null);
    render(order, history, canModify);
  } catch (err) {
    // Có nút "Tải lại đơn": PWA standalone không có tải lại của trình duyệt, và `load()` tự nuốt lỗi nên các nút vừa bấm (Xác nhận/Huỷ) có thể đang khoá.
    show(banner("danger", err instanceof ApiError ? err.message : "Không tải được đơn.", { action: "reload_order" }));
  }
}

await initShell();
if (!id) show(banner("danger", "Thiếu mã đơn."));
else await load();
