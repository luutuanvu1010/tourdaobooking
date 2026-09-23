import { ApiError, api, type Api, type OrderSummary, type Staff } from "./api";
import { byId, h, replaceChildren, type Child } from "./dom";
import { dayMonth, paxCounts, vnd, vndShort } from "./format";
import { icon } from "./icons";
import { initShell, showError } from "./shell";
import { canSeeReviewAlerts, reviewAlerts, type ReviewAlerts } from "../src/shared/dashboard-review";
import { vnToday } from "../src/shared/vn-date";

const SHORT_WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]; // chỉ số = Date.getUTCDay() (0 = Chủ nhật)
const FULL_WEEKDAY = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
/** "2026-09-24" → chỉ số thứ trong tuần (0 = Chủ nhật). Chuỗi ngày thuần (không giờ) nên đọc bằng UTC, không lệch múi giờ thiết bị — cùng cách `addDays`/`isISODate` đang dùng. */
const weekdayOf = (isoDate: string): number => new Date(`${isoDate}T00:00:00Z`).getUTCDay();

/**
 * Biểu đồ cột "Doanh thu của tôi" (Đợt D Task 2) — 7 cột T2…CN, dựng bằng `h()` (không thư viện ngoài).
 * Chiều cao theo % so với ngày cao nhất; sàn 4% cho ngày 0 đ để cột vẫn thấy được (không biến mất).
 * Tô đậm `--c-primary`: NGÀY ĐÃ QUA + HÔM NAY (`d.date <= today`), ngày CHƯA TỚI để nhạt — quyết định chốt của chủ dự
 * án sau vòng kiểm Task 2 (`docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md` mục 7, câu 7). LƯU Ý LỊCH
 * SỬ: bản trước tô đậm theo VỊ TRÍ (hai cột cuối T7/CN, đúng pixel ảnh mẫu — người kiểm độc lập đã đo xác nhận), vì
 * ảnh mẫu tình cờ vẽ vào đúng Chủ nhật nên hai cột cuối trong mẫu ĐỒNG THỜI là "hôm qua + hôm nay". Ảnh chụp thật hôm
 * Thứ Tư lộ sai: quy tắc vị trí tô đậm 2 ngày CHƯA TỚI (0 đ) trong khi ngày có tiền thật (hôm nay) lại nhạt. Đừng
 * quay lại `i >= 5`.
 * Máy đọc màn hình: các cột (`aria-hidden`) không mang nghĩa; thay bằng MỘT bảng `.visually-hidden` liệt kê đủ 7 ngày.
 * Mọi ngày đều 0 đ → không vẽ 7 cột rỗng, hiện dòng "Chưa có đơn nào tuần này" (đúng kế hoạch bước 4).
 * Fix round 1 (phát hiện của người kiểm độc lập Task 2): dòng chữ rỗng này CŨNG phải mang class `dash-revenue-chart`
 * — luật ẩn ở khổ điện thoại (`public/app.css`, `@media (max-width: 639px)`) chỉ nhắm class đó; thiếu là dòng chữ lộ
 * ra thành một dòng thừa trong ô "Doanh thu của tôi" ở lưới 2×2 (sáng thứ Hai hay nhân viên mới, chưa có đơn tuần
 * này). Gắn thêm class cũng khớp với `querySelector(".dash-revenue-chart")?.remove()` ở `renderRevenue()` bên dưới
 * — nếu không, dòng chữ rỗng cũ sẽ không bị dọn khi vẽ lại, dồn thành nhiều dòng lặp.
 */
function revenueChart(daily: readonly { date: string; total: number }[]): HTMLElement {
  const max = Math.max(0, ...daily.map((d) => d.total));
  if (max === 0) return h("p", { class: "empty dash-chart-empty dash-revenue-chart" }, "Chưa có đơn nào tuần này");
  const today = vnToday(new Date()); // giờ Việt Nam — cùng hàm/quy ước server dùng, tránh lệch ngày 00:00–07:00 giờ VN
  const bars = daily.map((d) => {
    const pct = Math.max(Math.round((d.total / max) * 100), 4);
    const isDark = d.date <= today; // ngày ĐÃ QUA hoặc HÔM NAY — so sánh chuỗi "YYYY-MM-DD" đúng thứ tự thời gian
    return h("span", { class: isDark ? "dash-chart-bar dash-chart-bar-dark" : "dash-chart-bar", style: `height:${pct}%`, "aria-hidden": "true" });
  });
  const labels = daily.map((d) => h("span", null, SHORT_WEEKDAY[weekdayOf(d.date)]));
  const rows = daily.map((d) => h("tr", null, h("th", { scope: "row" }, FULL_WEEKDAY[weekdayOf(d.date)]), h("td", null, vnd(d.total))));
  return h(
    "div",
    { class: "dash-revenue-chart" },
    h("div", { class: "dash-chart-bars" }, ...bars),
    h("div", { class: "dash-chart-labels" }, ...labels),
    h("table", { class: "visually-hidden" }, h("caption", null, "Doanh thu từng ngày trong tuần"), h("tbody", null, ...rows)),
  );
}

/**
 * Một ô số liệu (dạng liên kết về "/", như bản thiết kế) — ba ô đầu là số liệu TOÀN CÔNG TY.
 * Mỗi phần (nhãn/giá trị/dòng phụ) có hai bản: đầy đủ (`.lbl-full`, máy tính) và rút gọn (`.lbl-short`, khổ điện
 * thoại ≤639px) — CSS ẩn/hiện theo khổ màn hình (`public/app.css`), không đổi DOM bằng JS.
 */
function statTile(labelFull: string, labelShort: string, valueFull: string, valueShort: string, subFull: string, subShort: string, valueClass?: string): HTMLElement {
  return h(
    "a",
    { class: "dash-stat", href: "/" },
    h("span", { class: "dash-stat-label" }, h("span", { class: "lbl-full" }, labelFull), h("span", { class: "lbl-short" }, labelShort)),
    h("span", { class: valueClass ? `dash-stat-value ${valueClass}` : "dash-stat-value" }, h("span", { class: "lbl-full" }, valueFull), h("span", { class: "lbl-short" }, valueShort)),
    h("span", { class: "dash-stat-sub" }, h("span", { class: "lbl-full" }, subFull), h("span", { class: "lbl-short" }, subShort)),
  );
}

function renderStats(data: Api.DashboardResponse): void {
  const { unpaid, draftCount, unassignedCount } = data;
  const unpaidSubFull = unpaid.count === 0 ? "Không có đơn nào" : `${unpaid.count} đơn${unpaid.earliestDate ? ` · sớm nhất đón ${dayMonth(unpaid.earliestDate)}` : ""}`;
  const unpaidSubShort = unpaid.count === 0 ? "Không có đơn nào" : `${unpaid.count} đơn`;
  replaceChildren(
    byId("dash-stats"),
    statTile("Còn thiếu tiền", "Còn thiếu", vnd(unpaid.total), `${vndShort(unpaid.total)} ₫`, unpaidSubFull, unpaidSubShort, "money-due"),
    statTile("Đơn nháp chưa xác nhận", "Đơn nháp", String(draftCount), String(draftCount), "Cần xác nhận đơn", "Cần xác nhận đơn"),
    statTile("Chưa có người phụ trách", "Chưa phụ trách", String(unassignedCount), String(unassignedCount), "Cần gán trước giờ đón", "Cần gán"),
  );
}

/**
 * Một dòng "Chuyến đón hôm nay". CẢNH BÁO (kiểm độc lập Task 1): `serviceNames[0]` là dịch vụ có sort_order NHỎ NHẤT của đơn, còn `trip`
 * (giờ + nơi đón) lấy theo dịch vụ QUYẾT ĐỊNH đơn thuộc "hôm nay" (ngày đón sớm nhất) — CÓ THỂ LÀ HAI DỊCH VỤ KHÁC NHAU.
 * Vì vậy giờ đón VÀ nơi đón (cùng đến từ dịch vụ quyết định) LUÔN đứng CHUNG một cụm bên trái (`.dash-today-when`); tên dịch vụ
 * (`serviceNames[0]`, có thể là dịch vụ khác) chỉ xuất hiện ở dòng phụ bên phải cùng SĐT, KHÔNG bao giờ đứng cạnh nơi đón — tránh gợi ý
 * sai rằng nơi đón đó thuộc về dịch vụ được nêu tên. Đừng gộp lại "cho gọn": hai cụm cố ý tách theo hai nguồn dữ liệu khác nhau.
 *
 * Đợt D Task 1 (đúng mockup điện thoại): ở khổ ≤639px KHÔNG đủ chỗ cho SĐT + cụm giờ/nơi đón riêng, nên dòng phụ đổi thành
 * "nơi đón · tên dịch vụ" và `.dash-today-place` trong `.dash-today-when` ẩn đi (CSS `display:none`, không phải kỹ thuật ẩn-cho-mắt —
 * tránh trình đọc màn hình đọc nơi đón hai lần). Đây CHỈ là chỗ HIỂN THỊ khác nhau theo khổ màn hình, dữ liệu nguồn vẫn luôn là
 * `o.trip.pickupPlace` (không suy ra từ `serviceNames`) — nguyên tắc "nơi đón không thuộc dịch vụ được nêu tên" vẫn giữ nguyên ở tầng dữ liệu;
 * chỉ khác là bản rút gọn buộc phải đặt hai cụm cạnh nhau trên cùng một dòng vì máy hẹp, không còn hai cụm tách biệt như bản đầy đủ.
 *
 * Fix round 2 (quyết định chủ dự án 2026-09-23, `docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md` mục 5): dòng phụ rút gọn
 * ở trên bỏ SĐT nên khổ điện thoại MẤT thao tác gọi khách — chủ chốt GIỮ LẠI nút gọi dù lệch bản mẫu. Thêm `.dash-today-call`
 * (chỉ hiện ở ≤639px, cùng cơ chế `.lbl-short`) trong cụm tiền bên phải — tái dùng ĐÚNG kỹ thuật gọi đã có (span + onclick +
 * `tel:`, giống `.order-row-phone` ở `web/orders.ts`), không đổi bố cục ba cụm khi/tên/tiền hiện có.
 */
function todayRow(o: OrderSummary): HTMLElement {
  const time = o.trip.pickupTime ?? "—";
  const pax = paxCounts(o.pax);
  const serviceLine = o.serviceNames.length === 0 ? "—" : o.serviceNames.length === 1 ? o.serviceNames[0] : `${o.serviceNames[0]} +${o.serviceNames.length - 1} dịch vụ`;
  const mobileSubText = o.trip.pickupPlace ? `${o.trip.pickupPlace} · ${serviceLine}` : serviceLine;
  const sub: Child[] = [
    h(
      "span",
      { class: "lbl-full" },
      h("span", { class: "order-row-phone", onclick: (e: Event) => { e.preventDefault(); e.stopPropagation(); location.href = `tel:${o.customerPhone}`; } }, o.customerPhone),
      " · ",
      serviceLine,
    ),
    h("span", { class: "lbl-short" }, mobileSubText),
  ];
  const when: Child[] = [h("span", { class: "dash-today-time" }, time)];
  if (o.trip.pickupPlace) when.push(h("span", { class: "dash-today-place" }, o.trip.pickupPlace));
  return h(
    "a",
    { class: "dash-today-row", href: `/order?id=${encodeURIComponent(o.id)}` },
    h("span", { class: "dash-today-when" }, ...when),
    h(
      "span",
      { class: "dash-today-main" },
      h("span", { class: "dash-today-name" }, o.customerName, pax ? ` · ${pax}` : false),
      h("span", { class: "muted dash-today-sub" }, ...sub),
    ),
    h(
      "span",
      { class: "dash-today-money" },
      h("b", { class: o.remainingAmount === 0 ? "money-ok" : "money-due" }, h("span", { class: "lbl-full" }, vnd(o.remainingAmount)), h("span", { class: "lbl-short" }, `${vndShort(o.remainingAmount)} ₫`)),
      h("span", { class: "muted lbl-full" }, o.remainingAmount === 0 ? "đã trả đủ" : "còn lại"),
      h(
        "span",
        { class: "dash-today-call lbl-short", "aria-label": `Gọi ${o.customerPhone}`, onclick: (e: Event) => { e.preventDefault(); e.stopPropagation(); location.href = `tel:${o.customerPhone}`; } },
        "Gọi",
      ),
    ),
  );
}

function renderToday(today: readonly OrderSummary[]): void {
  const badge = byId("dash-today-count");
  badge.textContent = String(today.length);
  badge.hidden = false; // chỉ hiện huy hiệu SAU khi đã có số thật — trước đó không để lộ viên thuốc xanh rỗng
  replaceChildren(byId("dash-today-list"), ...today.map(todayRow));
  byId("dash-today-empty").hidden = today.length > 0;
}

function renderRevenue(rev: Api.DashboardResponse["revenueWeek"]): void {
  byId("dash-revenue-range").textContent = `Tuần này · ${dayMonth(rev.from)}–${dayMonth(rev.to)}`;
  replaceChildren(
    byId("dash-revenue-total"),
    h("span", { class: "dash-revenue-value" }, h("span", { class: "lbl-full" }, vnd(rev.total)), h("span", { class: "lbl-short" }, `${vndShort(rev.total)} ₫`)),
    h("span", { class: "muted" }, h("span", { class: "lbl-full" }, `${rev.count} đơn đã xác nhận`), h("span", { class: "lbl-short" }, `Tuần này · ${rev.count} đơn`)),
  );
  // Mockup mobile (390px) KHÔNG có biểu đồ trong ô "Doanh thu của tôi" (ô đó chỉ là một trong 4 ô số liệu rút gọn của
  // lưới 2×2) — biểu đồ chỉ ẩn ở khổ hẹp qua CSS (`.dash-revenue-chart` trong `public/app.css`), không đổi bằng JS ở đây.
  byId("dash-revenue").querySelector(".dash-revenue-chart")?.remove();
  byId("dash-revenue").append(revenueChart(rev.daily));
}

/**
 * Khối "Cần xem lại" (Đợt D Task 3) — CHỈ ADMIN thấy (quyết định chủ dự án, `docs/superpowers/specs/2026-09-23-
 * trang-chu-moi-quyet-dinh.md` mục 3): giữ đúng quyền hiện có của dữ liệu cảnh báo giá (`/api/catalog/admin`,
 * chỉ admin), TUYỆT ĐỐI KHÔNG mở quyền đọc cho nhân viên bán hàng. `reviewAlerts()` (src/shared/dashboard-review.ts)
 * tự kiểm lại quyền — ở đây CHỈ gọi hai API admin-only khi `canSeeReviewAlerts()` đã xác nhận, để KHÔNG gọi (và
 * không nhận 403) cho phần lớn tài khoản (SALES/ACCOUNTING/FIELD) mở Trang chủ mỗi ngày.
 *
 * KHÔNG import module `catalog`/`feedback` ở máy chủ (luật ranh giới module, `src/CLAUDE.md`: `orders` không được
 * import chúng): dữ liệu lấy bằng cách gọi thẳng HAI ROUTE ĐÃ CÓ SẴN, không đổi, từ TRÌNH DUYỆT — `web/` không phải
 * `src/modules/*` nên không vướng luật đó. `/api/catalog/admin` chỉ đọc (`loadAll` + `getSyncState`, không đồng bộ
 * Sheet — khác `/api/catalog` của nhân viên bán hàng, có `bootstrapIfNeverSynced`); `/api/feedback` cũng chỉ đọc.
 * Không lỗi phụ nào cả hai lời gọi này có thể gây ra.
 *
 * Dùng `allSettled`: MỘT trong hai API lỗi (mạng chập chờn) không được kéo API còn lại xuống theo — coi phần lỗi là
 * "không có cảnh báo nào" (mảng rỗng) thay vì ẩn HẲN khối chỉ vì một nửa dữ liệu chưa tải được.
 */
async function loadReview(staff: Staff): Promise<ReviewAlerts | null> {
  if (!canSeeReviewAlerts(staff)) return null;
  const [catalogRes, feedbackRes] = await Promise.allSettled([
    api<Api.CatalogAdminResponse>("/api/catalog/admin"),
    api<Api.FeedbackQueueResponse>("/api/feedback"),
  ]);
  return reviewAlerts(staff, {
    catalogItems: catalogRes.status === "fulfilled" ? catalogRes.value.items : [],
    tickets: feedbackRes.status === "fulfilled" ? feedbackRes.value.tickets : [],
  });
}

/** Một dòng của khối "Cần xem lại": icon cảnh báo (màu theo loại) + tiêu đề đậm + dòng phụ nhạt, cả dòng là liên kết (đúng bản mẫu). */
function reviewRow(iconClass: string, href: string, title: string, sub: string): HTMLElement {
  return h(
    "a",
    { class: "dash-review-row", href },
    h("span", { class: `dash-review-icon ${iconClass}` }, icon("alert", 17)),
    h("span", { class: "dash-review-body" }, h("span", { class: "dash-review-title" }, title), h("span", { class: "muted dash-review-sub" }, sub)),
  );
}

/** `alerts === null` (không phải admin, HOẶC không có gì cần xem lại) → ẨN CẢ KHỐI, không hiện thẻ trống (bài học Đợt C). */
function renderReview(alerts: ReviewAlerts | null): void {
  const section = byId("dash-review");
  if (!alerts) {
    section.hidden = true;
    return;
  }
  const rows: HTMLElement[] = [];
  if (alerts.catalogConflict) {
    const c = alerts.catalogConflict;
    const range = `${c.base === null ? "—" : vnd(c.base)} → ${c.current === null ? "—" : vnd(c.current)} · ${c.hidden ? "đã ẩn, không bán" : "giá ghi đè vẫn đang bán"}`;
    rows.push(reviewRow("dash-review-icon-sand", "/catalog", `Sheet đã đổi giá ${c.code}`, c.moreCount > 0 ? `${range} · +${c.moreCount} dịch vụ khác` : range));
  }
  if (alerts.feedbackQueue) {
    const f = alerts.feedbackQueue;
    const sub = f.items.map((i) => `${i.code} ${i.kindName.toLocaleLowerCase("vi-VN")}`).join(" · ");
    rows.push(reviewRow("dash-review-icon-accent", "/feedback", `${f.count} góp ý mới chưa trả lời`, sub));
  }
  replaceChildren(byId("dash-review-list"), ...rows);
  section.hidden = false;
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
    // loadReview() không bao giờ ném lỗi (allSettled + canSeeReviewAlerts() chặn trước) — gọi song song với
    // dashboard chính, không làm chậm phần còn lại của trang.
    const [data, review] = await Promise.all([api<Api.DashboardResponse>("/api/orders/dashboard"), loadReview(staff)]);
    loadingEl.hidden = true;
    byId("dash-date").textContent = `${weekday}, ${dateStr} · ${data.today.length} chuyến đón hôm nay`;
    renderStats(data);
    renderToday(data.today);
    renderRevenue(data.revenueWeek);
    renderReview(review);
    // Chỉ hiện khối nội dung SAU KHI dựng xong dữ liệu thật — lúc đang tải/lỗi giữ ẩn (tránh khối rỗng đọng lại cạnh skeleton/banner lỗi).
    byId("dash-grid").hidden = false;
  } catch (err) {
    loadingEl.hidden = true;
    byId("dash-date").textContent = `${weekday}, ${dateStr}`;
    showError(byId("error"), err instanceof ApiError ? err.message : "Không tải được Trang chủ. Thử tải lại trang.");
  }
}
void main();
