import { ApiError, api, type Api, type OrderSummary } from "./api";
import { byId, h, replaceChildren, type Child } from "./dom";
import { dayMonth, paxCounts, vnd } from "./format";
import { initShell, showError } from "./shell";

/** Một ô số liệu (dạng liên kết về "/", như bản thiết kế) — ba ô đầu là số liệu TOÀN CÔNG TY (tiêu đề "Số liệu toàn công ty" ở trên nhóm này, không lặp lại ở từng ô). */
function statTile(label: string, value: string, sub: string, valueClass?: string): HTMLElement {
  return h(
    "a",
    { class: "dash-stat", href: "/" },
    h("span", { class: "dash-stat-label" }, label),
    h("span", { class: valueClass ? `dash-stat-value ${valueClass}` : "dash-stat-value" }, value),
    h("span", { class: "dash-stat-sub" }, sub),
  );
}

function renderStats(data: Api.DashboardResponse): void {
  const { unpaid, draftCount, unassignedCount } = data;
  replaceChildren(
    byId("dash-stats"),
    statTile(
      "Còn thiếu tiền",
      vnd(unpaid.total),
      unpaid.count === 0 ? "Không có đơn nào" : `${unpaid.count} đơn${unpaid.earliestDate ? ` · sớm nhất đón ${dayMonth(unpaid.earliestDate)}` : ""}`,
      "money-due",
    ),
    statTile("Đơn nháp chưa xác nhận", String(draftCount), "Cần xác nhận đơn"),
    statTile("Chưa có người phụ trách", String(unassignedCount), "Cần gán người phụ trách"),
  );
}

/**
 * Một dòng "Chuyến đón hôm nay". CẢNH BÁO (kiểm độc lập Task 1): `serviceNames[0]` là dịch vụ có sort_order NHỎ NHẤT của đơn, còn `trip`
 * (giờ/nơi đón) lấy theo dịch vụ QUYẾT ĐỊNH đơn thuộc "hôm nay" (ngày đón sớm nhất) — CÓ THỂ LÀ HAI DỊCH VỤ KHÁC NHAU. Vì vậy giờ đón đứng
 * RIÊNG một cột bên trái (không ghép cụm "tên dịch vụ — giờ"); tên dịch vụ nằm ở dòng phụ cùng SĐT/nơi đón, không gắn với giờ đón.
 */
function todayRow(o: OrderSummary): HTMLElement {
  const time = o.trip.pickupTime ?? "—";
  const pax = paxCounts(o.pax);
  const serviceLine = o.serviceNames.length === 0 ? "—" : o.serviceNames.length === 1 ? o.serviceNames[0] : `${o.serviceNames[0]} +${o.serviceNames.length - 1} dịch vụ`;
  const sub: Child[] = [
    h("span", { class: "order-row-phone", onclick: (e: Event) => { e.preventDefault(); e.stopPropagation(); location.href = `tel:${o.customerPhone}`; } }, o.customerPhone),
    " · ",
    serviceLine,
  ];
  if (o.trip.pickupPlace) sub.push(" · ", o.trip.pickupPlace);
  return h(
    "a",
    { class: "dash-today-row", href: `/order?id=${encodeURIComponent(o.id)}` },
    h("span", { class: "dash-today-time" }, time),
    h(
      "span",
      { class: "dash-today-main" },
      h("span", { class: "dash-today-name" }, o.customerName, pax ? ` · ${pax}` : false),
      h("span", { class: "muted" }, ...sub),
    ),
    h(
      "span",
      { class: "dash-today-money" },
      h("b", { class: o.remainingAmount === 0 ? "money-ok" : "money-due" }, vnd(o.remainingAmount)),
      h("span", { class: "muted" }, o.remainingAmount === 0 ? "đã trả đủ" : "còn lại"),
    ),
  );
}

function renderToday(today: readonly OrderSummary[]): void {
  byId("dash-today-count").textContent = String(today.length);
  replaceChildren(byId("dash-today-list"), ...today.map(todayRow));
  byId("dash-today-empty").hidden = today.length > 0;
}

function renderRevenue(rev: Api.DashboardResponse["revenueWeek"]): void {
  byId("dash-revenue-range").textContent = `Tuần này · ${dayMonth(rev.from)}–${dayMonth(rev.to)}`;
  replaceChildren(
    byId("dash-revenue-total"),
    h("span", { class: "dash-revenue-value" }, vnd(rev.total)),
    h("span", { class: "muted" }, `${rev.count} đơn đã xác nhận`),
  );
}

async function main(): Promise<void> {
  const staff = await initShell();
  const words = staff.fullName.trim().split(/\s+/).filter(Boolean);
  byId("dash-name").textContent = `Chào ${words[words.length - 1] ?? staff.fullName}`;
  // Dải "Đang ở chế độ bảo trì" chung của khung (web/shell.ts) đã dựng xong tại đây (initShell() đã trả về) — suy ra trạng thái từ đó thay vì đọc lại API, tránh đổi chữ ký initShell().
  byId("dash-maint").hidden = !document.querySelector(".maint-strip");
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long" }).format(now);
  const dateStr = now.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
  const loadingEl = byId("loading");
  try {
    const data = await api<Api.DashboardResponse>("/api/orders/dashboard");
    loadingEl.hidden = true;
    byId("dash-date").textContent = `${weekday}, ${dateStr} · ${data.today.length} chuyến đón hôm nay`;
    renderStats(data);
    renderToday(data.today);
    renderRevenue(data.revenueWeek);
  } catch (err) {
    loadingEl.hidden = true;
    byId("dash-date").textContent = `${weekday}, ${dateStr}`;
    showError(byId("error"), err instanceof ApiError ? err.message : "Không tải được Trang chủ. Thử tải lại trang.");
  }
}
void main();
