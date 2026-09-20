import { can } from "../src/shared/permissions";
import { ApiError, api, type OrderStatus, type OrderSummary, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { STATUS_LABEL, dateTime, vnd } from "./format";
import { initShell, showError } from "./shell";

const PAGE = 30;
const qInput = byId<HTMLInputElement>("q");
const statusSel = byId<HTMLSelectElement>("status");
const listEl = byId("list");
const moreBtn = byId<HTMLButtonElement>("more");
const emptyEl = byId("empty");
const errorEl = byId("error");

let offset = 0;
let loadSeq = 0; // bỏ kết quả của lần tải cũ khi người dùng gõ tiếp

function row(o: OrderSummary): HTMLElement {
  return h(
    "a",
    { class: "order-row", href: `/order?id=${encodeURIComponent(o.id)}` },
    h("div", { class: "order-row-main" }, h("strong", null, o.orderCode), h("span", { class: `badge badge-${o.status}` }, STATUS_LABEL[o.status])),
    h("div", null, o.customerName, " · ", o.customerPhone),
    h("div", { class: "muted" }, dateTime(o.createdAt), " · ", o.staffName),
    h("div", { class: "order-row-money" }, h("span", null, "Tổng ", h("b", null, vnd(o.total))), h("span", null, "Còn lại ", h("b", null, vnd(o.remainingAmount)))),
  );
}

async function load(reset: boolean): Promise<void> {
  const seq = ++loadSeq;
  if (reset) offset = 0;
  showError(errorEl, null);
  const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
  if (qInput.value.trim()) params.set("q", qInput.value.trim());
  if (statusSel.value) params.set("status", statusSel.value as OrderStatus);
  try {
    const { orders, hasMore } = await api<Api.OrderListResponse>(`/api/orders?${params}`);
    if (seq !== loadSeq) return;
    const rows = orders.map(row);
    if (reset) replaceChildren(listEl, ...rows);
    else listEl.append(...rows);
    offset += orders.length;
    moreBtn.hidden = !hasMore;
    emptyEl.hidden = offset > 0;
  } catch (err) {
    if (seq === loadSeq) showError(errorEl, err instanceof ApiError ? err.message : "Không tải được danh sách.");
  }
}

let timer: number | undefined;
qInput.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => void load(true), 300);
});
statusSel.addEventListener("change", () => void load(true));
moreBtn.addEventListener("click", () => void load(false));

// Nút "+ Đơn mới" mặc định ẩn trong HTML tĩnh, chỉ hiện cho người được lập đơn (bản đồ quyền ADR-0007 — không chép ma trận ở đây):
// tài khoản chỉ-ACCOUNTING bấm vào sẽ bị máy chủ từ chối 403 sau khi đã điền cả form.
// Tra cứu chịu được phần tử VẮNG (như setBarTitle ở shell.ts): nếu một bản HTML cũ còn nằm trong cache mà JS đã mới thì thiếu nút
// vẫn phải để trang đơn hàng chạy bình thường — mặc định ẩn nên không có nút cũng là phía an toàn.
const staff = await initShell();
const newOrderBtn = document.getElementById("new-order");
if (newOrderBtn) newOrderBtn.hidden = !can(staff, "order.create");
await load(true);
