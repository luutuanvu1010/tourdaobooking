import { can } from "../src/shared/permissions";
import { NO_HANDLER_TEXT, handlerText } from "../src/shared/handler-view";
import { ApiError, api, type OrderStatus, type OrderSummary, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { orderCard } from "./order-card";
import { initShell, showError } from "./shell";

const PAGE = 30;
const qInput = byId<HTMLInputElement>("q");
const statusSel = byId<HTMLSelectElement>("status");
const listEl = byId("list");
const moreBtn = byId<HTMLButtonElement>("more");
const emptyEl = byId("empty");
const errorEl = byId("error");
const loadingEl = byId("loading");

let offset = 0;
let loadSeq = 0; // bỏ kết quả của lần tải cũ khi người dùng gõ tiếp

/** Một thẻ đơn + chỗ ghi người phụ trách (điền sau khi `GET /api/dispatch/handlers` về). */
interface Row {
  id: string;
  el: HTMLElement;
  slot: HTMLElement;
}

function row(o: OrderSummary): Row {
  // Đợt E Phần A: thẻ rút gọn 2 dòng + nút xổ xuống, dựng bằng thành phần dùng chung web/order-card.ts (chỉ áp cho
  // /orders ở đợt này — xem đặc tả 2026-09-23-dot-e-the-don-gon-va-bieu-tuong.md). `handlerSlot` thay cho `slot` cũ:
  // vẫn cùng class `order-row-handler`/`is-pending`, chỉ đổi CHỖ ĐỨNG (nay trong phần xổ xuống thay vì luôn hiện).
  const { el, handlerSlot } = orderCard({
    id: o.id,
    href: `/order?id=${encodeURIComponent(o.id)}`,
    status: o.status,
    departDate: o.trip.departDate,
    pickupTime: o.trip.pickupTime,
    customerPhone: o.customerPhone,
    pax: o.pax,
    depositAmount: o.depositAmount,
    remainingAmount: o.remainingAmount,
    serviceNames: o.serviceNames,
    staffName: o.staffName,
    createdAt: o.createdAt,
    customerNote: o.customerNote,
    pickupPlace: o.trip.pickupPlace,
  });
  return { id: o.id, el, slot: handlerSlot };
}

/**
 * Người phụ trách của các thẻ vừa dựng: MỘT lời gọi cho cả trang (`GET /api/dispatch/handlers?orderIds=…`, ≤ 30 mã ở đây, máy chủ nhận ≤ 100). Ba trạng thái, không hai:
 * chưa biết (chỗ trống rồi ẩn) · `null` = chưa có người (chip) · có tên. Lời gọi lỗi hoặc thiếu khoá cho một đơn → ẩn dòng đó, danh sách đơn không bị ảnh hưởng.
 * Thẻ đã bị thay (người dùng gõ tìm kiếm mới trong lúc chờ) thì `slot.isConnected` là false → bỏ qua.
 */
async function fillHandlers(rows: readonly Row[]): Promise<void> {
  if (rows.length === 0) return;
  let handlers: Record<string, Api.HandlerDto | null> | null = null;
  try {
    handlers = (await api<Api.HandlersResponse>(`/api/dispatch/handlers?orderIds=${rows.map((r) => encodeURIComponent(r.id)).join(",")}`)).handlers;
  } catch {
    handlers = null; // danh sách vẫn dùng được; chỉ thiếu dòng người phụ trách
  }
  for (const { id, slot } of rows) {
    if (!slot.isConnected) continue;
    slot.classList.remove("is-pending");
    const found = handlers?.[id];
    if (found === null) replaceChildren(slot, h("span", { class: "chip chip-warn" }, NO_HANDLER_TEXT));
    else if (found && typeof found.name === "string" && found.name.trim() !== "") replaceChildren(slot, handlerText(found.name));
    else slot.hidden = true; // chưa biết (lỗi, hoặc phản hồi thiếu/sai dạng)
  }
}

async function load(reset: boolean): Promise<void> {
  const seq = ++loadSeq;
  if (reset) offset = 0;
  showError(errorEl, null);
  if (reset) loadingEl.hidden = false;
  const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
  if (qInput.value.trim()) params.set("q", qInput.value.trim());
  if (statusSel.value) params.set("status", statusSel.value as OrderStatus);
  try {
    const { orders, hasMore } = await api<Api.OrderListResponse>(`/api/orders?${params}`);
    if (seq !== loadSeq) return;
    loadingEl.hidden = true;
    const rows = orders.map(row);
    if (reset) replaceChildren(listEl, ...rows.map((r) => r.el));
    else listEl.append(...rows.map((r) => r.el));
    offset += orders.length;
    moreBtn.hidden = !hasMore;
    emptyEl.hidden = offset > 0;
    void fillHandlers(rows); // không chờ: danh sách hiện ngay, người phụ trách điền vào khi về
  } catch (err) {
    if (seq === loadSeq) {
      loadingEl.hidden = true;
      showError(errorEl, err instanceof ApiError ? err.message : "Không tải được danh sách.");
    }
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

// Ô tìm kiếm trên thanh công việc (`web/shell.ts`) đưa người dùng về đây kèm `?q=…` (đặc tả Đợt D §47: dùng lại
// tham số `q` mà `GET /api/orders` đã hỗ trợ). ĐỔ VÀO Ô TÌM CỦA TRANG trước lần tải đầu, vì ba lý do: `load()` chỉ
// đọc `qInput.value` nên đây là chỗ duy nhất nối được; người dùng THẤY mình đang lọc theo gì; và sửa/xoá được ngay
// trên ô đó. Trước sửa này, gõ rồi Enter chỉ tải lại trang và hiện TOÀN BỘ danh sách (ô tìm là nút chết).
const qFromUrl = new URLSearchParams(location.search).get("q")?.trim();
if (qFromUrl) qInput.value = qFromUrl;

await load(true);
