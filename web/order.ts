import { ApiError, api, type AuditEntry, type Order } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { ACTION_LABEL, METHOD_LABEL, STATUS_LABEL, dateTime, vnd } from "./format";
import { initShell, showError } from "./shell";

const id = new URLSearchParams(location.search).get("id");
const errorEl = byId("error");
const root = byId("order");
const actions = byId("actions");

function kv(label: string, value: string | null, cls = ""): HTMLElement {
  return h("div", { class: `kv ${cls}` }, h("span", { class: "muted" }, label), h("span", null, value || "—"));
}

function render(order: Order, history: AuditEntry[], canModify: boolean): void {
  document.title = `${order.orderCode} — Tour Đảo Sales`;
  replaceChildren(
    root,
    h(
      "header",
      { class: "detail-head" },
      h("h1", null, order.orderCode),
      h("span", { class: `badge badge-${order.status}` }, STATUS_LABEL[order.status]),
    ),
    h("p", { class: "muted" }, `Lập ${dateTime(order.createdAt)} bởi ${order.staffName}`, order.confirmedAt && ` · Xác nhận ${dateTime(order.confirmedAt)}`),

    h("section", { class: "card" }, h("h2", null, "Khách hàng"), kv("Tên", order.customerName), kv("Số điện thoại", order.customerPhone), kv("Email", order.customerEmail), kv("Ghi chú", order.customerNote)),

    h(
      "section",
      { class: "card" },
      h("h2", null, "Dịch vụ"),
      h(
        "div",
        { class: "table-wrap" },
        h(
          "table",
          { class: "items" },
          h("thead", null, h("tr", null, h("th", null, "Dịch vụ"), h("th", { class: "num" }, "SL"), h("th", { class: "num" }, "Đơn giá"), h("th", { class: "num" }, "Thành tiền"))),
          h(
            "tbody",
            null,
            ...order.items.map((it) =>
              h(
                "tr",
                null,
                h("td", null, it.description, it.detail && h("div", { class: "muted" }, it.detail)),
                h("td", { class: "num" }, it.quantity),
                h("td", { class: "num" }, vnd(it.unitPrice)),
                h("td", { class: "num" }, vnd(it.lineTotal)),
              ),
            ),
          ),
        ),
      ),
    ),

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

    h(
      "section",
      { class: "card" },
      h("h2", null, "Lịch sử"),
      h("ul", { class: "history" }, ...history.map((e) => h("li", null, h("span", { class: "muted" }, dateTime(e.at)), ` — ${ACTION_LABEL[e.action]} · ${e.staffName}`))),
    ),
  );

  const btns: HTMLElement[] = [];
  if (!canModify) {
    btns.push(h("p", { class: "muted" }, `Chỉ ${order.staffName} (người lập đơn) hoặc quản trị viên mới được sửa, xác nhận hoặc huỷ đơn này.`));
  } else if (order.status === "draft") {
    btns.push(h("a", { class: "btn", href: `/order-form?id=${encodeURIComponent(order.id)}` }, "Sửa"));
    btns.push(change("Xác nhận đơn", "confirmed", "Xác nhận đơn này? Sau khi xác nhận sẽ không sửa được nữa.", "btn btn-accent"));
  }
  if (canModify && order.status !== "cancelled") btns.push(change("Huỷ đơn", "cancelled", "Huỷ đơn này? Việc huỷ không thể hoàn tác.", "btn btn-danger"));
  replaceChildren(actions, ...btns);
}

function change(label: string, to: "confirmed" | "cancelled", prompt: string, cls: string): HTMLButtonElement {
  const btn = h("button", { type: "button", class: cls }, label);
  btn.addEventListener("click", async () => {
    if (!confirm(prompt)) return;
    btn.disabled = true;
    showError(errorEl, null);
    try {
      await api(`/api/orders/${encodeURIComponent(id!)}/status`, { method: "POST", body: { status: to } });
      await load();
    } catch (err) {
      showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
      btn.disabled = false;
    }
  });
  return btn;
}

async function load(): Promise<void> {
  try {
    const { order, history, canModify } = await api<{ order: Order; history: AuditEntry[]; canModify: boolean }>(`/api/orders/${encodeURIComponent(id!)}`);
    render(order, history, canModify);
  } catch (err) {
    showError(errorEl, err instanceof ApiError ? err.message : "Không tải được đơn.");
  }
}

await initShell();
if (!id) showError(errorEl, "Thiếu mã đơn.");
else await load();
