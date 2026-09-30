import { can } from "../src/shared/permissions";
import { NO_HANDLER_TEXT, handlerText, nguoiPhuTrachTuPhien } from "../src/shared/handler-view";
import { ApiError, api, type OrderStatus, type OrderSummary, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { soDongCanTai, taoBoLamMoi } from "./lam-moi-logic";
import { dienTien, orderCard } from "./order-card";
import { goiSom } from "./goi-som";
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
let moreLoading = false; // đang chạy "Tải thêm": làm mới theo tin đợi xong lượt này (nếu không, `loadSeq` của nó sẽ vứt kết quả của lượt "Tải thêm")
let refreshWaiting = false;
let lastLoadIsMore = false; // lần tải bắt đầu gần nhất là "Tải thêm" (nó là thứ có thể đã thay thế một lần làm mới đang bay)
const MAX_PAGE = 100; // `GET /api/orders` nhận limit tối đa 100

/** Đường dẫn `GET /api/orders` theo bộ lọc/ô tìm đang hiện. */
function listUrl(base: number, limit: number): string {
  const params = new URLSearchParams({ limit: String(limit), offset: String(base) });
  if (qInput.value.trim()) params.set("q", qInput.value.trim());
  if (statusSel.value) params.set("status", statusSel.value as OrderStatus);
  return `/api/orders?${params}`;
}

// Ô tìm kiếm trên thanh công việc (`web/shell.ts`) đưa người dùng về đây kèm `?q=…` (đặc tả Đợt D §47: dùng lại
// tham số `q` mà `GET /api/orders` đã hỗ trợ). ĐỔ VÀO Ô TÌM CỦA TRANG trước lần tải đầu, vì ba lý do: `load()` chỉ
// đọc `qInput.value` nên đây là chỗ duy nhất nối được; người dùng THẤY mình đang lọc theo gì; và sửa/xoá được ngay
// trên ô đó. Trước sửa này, gõ rồi Enter chỉ tải lại trang và hiện TOÀN BỘ danh sách (ô tìm là nút chết).
const qFromUrl = new URLSearchParams(location.search).get("q")?.trim();
if (qFromUrl) qInput.value = qFromUrl;
// Gọi sớm (web/goi-som.ts): lần tải đầu gửi NGAY, song song với /api/auth/me của initShell(). Chỉ lần `load()` ĐẦU TIÊN được dùng, và chỉ
// khi đường dẫn trùng; lần đầu đã bắt đầu thì bỏ hẳn — không để một lần tải sau (bộ lọc đổi rồi quay về mặc định) nhận nhầm bản chụp lúc mở trang
// (người kiểm độc lập 2026-09-27, phát hiện Important).
const urlDau = listUrl(0, PAGE);
let layDau: (() => Promise<Api.OrderListResponse>) | null = goiSom(() => api<Api.OrderListResponse>(urlDau));

/** Một thẻ đơn + chỗ ghi người phụ trách (điền sau khi `GET /api/dispatch/handlers` về). */
interface Row {
  id: string;
  el: HTMLElement;
  slot: HTMLElement;
  tien: { tienSlot: HTMLElement; daTraSlot: HTMLElement };
}

function row(o: OrderSummary, index: number): Row {
  // Đợt E Phần A (bố cục sửa lại 2026-09-24): thẻ rút gọn 2 dòng + nút xổ xuống, dựng bằng thành phần dùng chung
  // web/order-card.ts (chỉ áp cho /orders ở đợt này — xem đặc tả 2026-09-23-dot-e-the-don-gon-va-bieu-tuong.md,
  // mục "Vòng sửa 2026-09-24"). `handlerSlot` thay cho `slot` cũ: vẫn cùng class `order-row-handler`/`is-pending`,
  // chỉ đổi CHỖ ĐỨNG (nay trong phần xổ xuống thay vì luôn hiện).
  const { el, handlerSlot, tien } = orderCard({
    id: o.id,
    href: `/order?id=${encodeURIComponent(o.id)}`,
    orderCode: o.orderCode,
    status: o.status,
    departDate: o.trip.departDate,
    pickupTime: o.trip.pickupTime,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    pax: o.pax,
    deliveredAt: o.deliveredAt,
    completedAt: o.completedAt,
    total: o.total,
    serviceNames: o.serviceNames,
    staffName: o.staffName,
    createdAt: o.createdAt,
    customerNote: o.customerNote,
    pickupPlace: o.trip.pickupPlace,
    index,
  });
  return { id: o.id, el, slot: handlerSlot, tien };
}

/** "Còn thu" / "Đã trả" của các thẻ vừa dựng: MỘT lời gọi billing cho cả trang (sổ tiền lượt 1 — ADR-0026 đ9). Lỗi → chỗ tiền giữ ẩn, danh sách vẫn dùng được. */
async function fillTien(rows: readonly Row[]): Promise<void> {
  if (rows.length === 0) return;
  let balances: Api.LedgerBalancesResponse["balances"] = {};
  try {
    balances = (await api<Api.LedgerBalancesResponse>("/api/ledger/balances", { method: "POST", body: { orderIds: rows.map((r) => r.id) } })).balances;
  } catch {
    return;
  }
  for (const r of rows) dienTien(r.tien, balances[r.id]);
}

/**
 * Người phụ trách của các thẻ vừa dựng: MỘT lời gọi cho cả trang (`GET /api/dispatch/handlers?orderIds=…`, ≤ 30 mã ở đây, máy chủ nhận ≤ 100). Ba trạng thái, không hai:
 * chưa biết (chỗ trống rồi ẩn) · `null` = chưa có người (chip) · có tên. Lời gọi lỗi hoặc thiếu khoá cho một đơn → ẩn dòng đó, danh sách đơn không bị ảnh hưởng.
 * Thẻ đã bị thay (người dùng gõ tìm kiếm mới trong lúc chờ) thì `slot.isConnected` là false → bỏ qua.
 * Hướng dẫn viên (chỉ thấy đơn mình phụ trách — ADR-0030 S23-4): mọi thẻ là đơn của chính họ → tên từ phiên (`nguoiPhuTrachTuPhien`), KHÔNG gọi route
 * trên (403 với họ, không mở cho họ — ruling Task 1.6; vòng sửa 1 sau kiểm độc lập lượt 1, phát hiện I-2: trước đây dòng này bị ẩn lặng lẽ).
 */
async function fillHandlers(rows: readonly Row[]): Promise<void> {
  if (rows.length === 0) return;
  const tuPhien = nguoiPhuTrachTuPhien(await nhanVien);
  let handlers: Record<string, Api.HandlerDto | null> | null = null;
  if (tuPhien) handlers = Object.fromEntries(rows.map((r) => [r.id, tuPhien]));
  else {
    try {
      handlers = (await api<Api.HandlersResponse>(`/api/dispatch/handlers?orderIds=${rows.map((r) => encodeURIComponent(r.id)).join(",")}`)).handlers;
    } catch {
      handlers = null; // danh sách vẫn dùng được; chỉ thiếu dòng người phụ trách
    }
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

/**
 * `refresh` = làm mới theo tin của Bảng tin (Task 9): giữ bộ lọc/ô tìm (đọc lại từ `qInput`/`statusSel`), KHÔNG hiện khung "đang tải", lỗi mạng thì
 * giữ danh sách cũ và không hiện lỗi, giữ vị trí cuộn, và xin `limit` = số dòng đang xem (sau "Tải thêm", tối đa 100) để không mất dòng đang xem.
 */
async function load(reset: boolean, refresh = false): Promise<void> {
  const seq = ++loadSeq;
  // KHÔNG đụng `offset` của module cho tới khi phản hồi được áp: lần tải lỗi/bị bỏ mà đã đặt lại `offset = 0` thì danh sách cũ vẫn trên màn hình
  // còn "Tải thêm" xin lại từ 0 → trùng dòng. Yêu cầu dùng `base` cục bộ; `offset` chỉ gán lúc render.
  const base = reset ? 0 : offset;
  lastLoadIsMore = !reset;
  if (reset) refreshWaiting = false; // tải mới hoàn toàn (lọc/tìm/làm mới) đã đọc dữ liệu mới nhất: không còn làm mới nào bị bỏ chờ
  const limit = refresh ? soDongCanTai(listEl.children.length, PAGE, MAX_PAGE) : PAGE;
  if (!refresh) showError(errorEl, null);
  if (reset && !refresh) loadingEl.hidden = false;
  const url = listUrl(base, limit);
  const som = layDau;
  layDau = null;
  try {
    const { orders, hasMore } = await (som && url === urlDau ? som() : api<Api.OrderListResponse>(url));
    if (seq !== loadSeq) {
      // Làm mới bị "Tải thêm" (bấm trong lúc chờ) thay thế: xếp lại để chạy lại, không để mất tin — sau khi "Tải thêm" xong (nếu còn chạy), hoặc ngay (nếu đã xong).
      if (refresh && lastLoadIsMore) {
        if (moreLoading) refreshWaiting = true;
        else void lamMoi.yeuCau();
      }
      return;
    }
    loadingEl.hidden = true;
    const rows = orders.map((o, i) => row(o, base + i + 1)); // số thứ tự nối tiếp khi "Tải thêm"; tìm/lọc mới đánh lại từ 1
    const scrollY = window.scrollY; // đọc LÚC dựng (không lúc bắt đầu tải): người dùng có thể đã cuộn trong lúc chờ
    if (reset) replaceChildren(listEl, ...rows.map((r) => r.el));
    else listEl.append(...rows.map((r) => r.el));
    if (refresh) window.scrollTo(0, scrollY);
    offset = base + orders.length;
    moreBtn.hidden = !hasMore;
    emptyEl.hidden = offset > 0;
    void fillHandlers(rows); // không chờ: danh sách hiện ngay, người phụ trách điền vào khi về
    void fillTien(rows); // như trên: tiền của billing điền vào khi về
  } catch (err) {
    // Làm mới lặng lẽ giữ danh sách cũ — trừ khi khung "đang tải" của lần tải ĐẦU (bị làm mới này thay thế) còn hiện: lúc đó phải báo lỗi, không để trang kẹt.
    if (seq === loadSeq && (!refresh || !loadingEl.hidden)) {
      loadingEl.hidden = true;
      showError(errorEl, err instanceof ApiError ? err.message : "Không tải được danh sách.");
    }
  }
}

/** Làm mới theo tin: MỘT lần tải mỗi lúc (bộ gộp), và không chen vào lượt "Tải thêm" đang chạy. */
const lamMoi = taoBoLamMoi(async () => {
  if (moreLoading) {
    refreshWaiting = true;
    return;
  }
  await load(true, true);
});

async function loadMore(): Promise<void> {
  moreLoading = true;
  try {
    await load(false);
  } finally {
    moreLoading = false;
    if (refreshWaiting) {
      refreshWaiting = false;
      void lamMoi.yeuCau();
    }
  }
}

let timer: number | undefined;
qInput.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => void load(true), 300);
});
statusSel.addEventListener("change", () => void load(true));
moreBtn.addEventListener("click", () => void loadMore());
// Bảng tin (ADR-0022, TD-3): đơn đổi ở nơi khác / vừa nối lại → tải lại danh sách. Đăng ký MỘT lần ở đây (đầu trang), không trong hàm dựng lại.
window.addEventListener("don-thay-doi", () => void lamMoi.yeuCau());
window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());

// Nút "+ Đơn mới" mặc định ẩn trong HTML tĩnh, chỉ hiện cho người được lập đơn (bản đồ quyền ADR-0007 — không chép ma trận ở đây):
// tài khoản chỉ-ACCOUNTING bấm vào sẽ bị máy chủ từ chối 403 sau khi đã điền cả form.
// Tra cứu chịu được phần tử VẮNG (như setBarTitle ở shell.ts): nếu một bản HTML cũ còn nằm trong cache mà JS đã mới thì thiếu nút
// vẫn phải để trang đơn hàng chạy bình thường — mặc định ẩn nên không có nút cũng là phía an toàn.
// `nhanVien` gọi `initShell()` TRƯỚC lần `await` đầu tiên của trang, nên mọi hàm gọi lại (ô tìm, bộ lọc, Bảng tin — chỉ chạy được sau khi trang nhường luồng)
// đọc được nó; `fillHandlers` chờ nó để biết người đang xem có phải hướng dẫn viên không.
const nhanVien = initShell();
const staff = await nhanVien;
const newOrderBtn = document.getElementById("new-order");
if (newOrderBtn) newOrderBtn.hidden = !can(staff, "order.create");


await load(true);
