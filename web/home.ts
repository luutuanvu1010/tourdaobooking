import { ApiError, api, type Api, type OrderSummary, type Staff } from "./api";
import { moBangTruot } from "./bang-truot";
import { byId, h, replaceChildren, type Child } from "./dom";
import { dayMonth, paxCounts, paxCountsShort, vnd, vndShort } from "./format";
import { helpHasNews } from "./help-seen";
import { icon, type IconName } from "./icons";
import { taoBoLamMoi } from "./lam-moi-logic";
import { goiSom } from "./goi-som";
import { layKhungNho } from "./khung-nho";
import { feedbackBadge, initShell } from "./shell";
import { demSapHetHan } from "./vc-dem";
import { canSeeReviewAlerts, reviewAlerts, type ReviewAlerts } from "../src/shared/dashboard-review";
import { can } from "../src/shared/permissions";
import { homeRedirect } from "../src/shared/start-page";
import { oTrangChu, type KhoaO, type LuoiTrangChu, type OChucNang } from "../src/shared/trang-chu-o";
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
 * Một ô số liệu (dạng liên kết về Đơn hàng, như bản thiết kế) — ba ô đầu là số liệu TOÀN CÔNG TY. Đợt D Task 5:
 * trang Đơn hàng dời sang "/orders" ("/" nay là chính Trang chủ này).
 * Mỗi phần (nhãn/giá trị/dòng phụ) có hai bản: đầy đủ (`.lbl-full`, máy tính) và rút gọn (`.lbl-short`, khổ điện
 * thoại ≤639px) — CSS ẩn/hiện theo khổ màn hình (`public/app.css`), không đổi DOM bằng JS.
 */
/** Biểu tượng ở nhãn ô số liệu — trang trí (`aria-hidden`, đi kèm chữ ngay sau), Đợt E Phần B. */
function statTile(iconName: IconName, labelFull: string, labelShort: string, valueFull: string, valueShort: string, subFull: string, subShort: string, valueClass?: string): HTMLElement {
  return h(
    "a",
    { class: "dash-stat", href: "/orders" },
    h("span", { class: "dash-stat-label icon-label" }, icon(iconName, 16), h("span", { class: "lbl-full" }, labelFull), h("span", { class: "lbl-short" }, labelShort)),
    h("span", { class: valueClass ? `dash-stat-value ${valueClass}` : "dash-stat-value" }, h("span", { class: "lbl-full" }, valueFull), h("span", { class: "lbl-short" }, valueShort)),
    h("span", { class: "dash-stat-sub" }, h("span", { class: "lbl-full" }, subFull), h("span", { class: "lbl-short" }, subShort)),
  );
}

/** Ô "Còn thiếu tiền" lấy từ billing (`GET /api/ledger/unpaid-summary` — sổ tiền lượt 1, ADR-0026 đ9); `null` = chưa tải được (hiện "—"). */
function renderStats(data: Api.DashboardResponse, unpaidOrNull: Api.UnpaidSummaryResponse | null): void {
  const { draftCount, unassignedCount } = data;
  const unpaid = unpaidOrNull ?? { count: 0, total: 0, earliestDate: null };
  const unpaidSubFull = unpaid.count === 0 ? "Không có đơn nào" : `${unpaid.count} đơn${unpaid.earliestDate ? ` · sớm nhất đón ${dayMonth(unpaid.earliestDate)}` : ""}`;
  const unpaidSubShort = unpaid.count === 0 ? "Không có đơn nào" : `${unpaid.count} đơn`;
  replaceChildren(
    byId("dash-stats"),
    unpaidOrNull
      ? statTile("money", "Còn thiếu tiền", "Còn thiếu", vnd(unpaid.total), `${vndShort(unpaid.total)} ₫`, unpaidSubFull, unpaidSubShort, "money-due")
      : statTile("money", "Còn thiếu tiền", "Còn thiếu", "—", "—", "Chưa tải được số", "Chưa tải được"),
    statTile("doc-check", "Đơn chờ xác nhận", "Chờ xác nhận", String(draftCount), String(draftCount), "Cần xác nhận đơn", "Cần xác nhận đơn"),
    statTile("assign", "Chưa có người phụ trách", "Chưa phụ trách", String(unassignedCount), String(unassignedCount), "Chờ người nhận", "Chờ người nhận"),
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
function todayRow(o: OrderSummary, tien: { conLai: number } | undefined): HTMLElement {
  const time = o.trip.pickupTime ?? "—";
  const pax = paxCounts(o.pax);
  const serviceLine = o.serviceNames.length === 0 ? "—" : o.serviceNames.length === 1 ? o.serviceNames[0] : `${o.serviceNames[0]} +${o.serviceNames.length - 1} dịch vụ`;
  const mobileSubText = o.trip.pickupPlace ? `${o.trip.pickupPlace} · ${serviceLine}` : serviceLine;
  const sub: Child[] = [
    h(
      "span",
      { class: "lbl-full" },
      h(
        "span",
        { class: "order-row-phone icon-label", onclick: (e: Event) => { e.preventDefault(); e.stopPropagation(); location.href = `tel:${o.customerPhone}`; } },
        icon("handset", 16),
        o.customerPhone,
      ),
      " · ",
      serviceLine,
    ),
    h("span", { class: "lbl-short" }, mobileSubText),
  ];
  const when: Child[] = [h("span", { class: "dash-today-time" }, time)];
  if (o.trip.pickupPlace) when.push(h("span", { class: "dash-today-place icon-label" }, icon("pin", 14), o.trip.pickupPlace));
  return h(
    "a",
    { class: "dash-today-row", href: `/order?id=${encodeURIComponent(o.id)}` },
    h("span", { class: "dash-today-when" }, ...when),
    h(
      "span",
      { class: "dash-today-main" },
      // Số khách trong span riêng: bản vẽ điện thoại cho chữ nhỏ, nhạt hơn tên, dạng rút gọn "2NL 1TE" (máy tính giữ "02 NL · 01 TE", nhìn như cũ).
      h("span", { class: "dash-today-name" }, o.customerName, pax ? h("span", { class: "dash-today-pax" }, h("span", { class: "lbl-full" }, ` · ${pax}`), h("span", { class: "lbl-short" }, ` · ${paxCountsShort(o.pax)}`)) : false),
      h("span", { class: "muted dash-today-sub" }, ...sub),
    ),
    h(
      "span",
      { class: "dash-today-money" },
      // Sổ tiền lượt 1: "còn lại" là số của billing (`POST /api/ledger/balances`); chưa tải được → "—", không đoán.
      tien
        ? h("b", { class: tien.conLai === 0 ? "money-ok dash-tien-du" : "money-due" }, h("span", { class: "lbl-full" }, vnd(tien.conLai)), h("span", { class: "lbl-short" }, `${vndShort(tien.conLai)} ₫`))
        : h("b", null, "—"),
      h("span", { class: "muted lbl-full" }, tien ? (tien.conLai === 0 ? "đã trả đủ" : "còn lại") : ""),
      // Điện thoại (bản vẽ 1a): còn tiền → số + "còn lại" nhỏ bên dưới; đủ tiền → viên thuốc xanh "Đủ tiền" thay cho số 0 ₫ (CSS ẩn `.dash-tien-du` ở khổ này).
      tien && tien.conLai > 0 && h("span", { class: "muted lbl-short dash-con-lai" }, "còn lại"),
      tien && tien.conLai === 0 && h("span", { class: "badge badge-confirmed lbl-short dash-du-tien" }, "Đủ tiền"),
      h(
        "span",
        { class: "dash-today-call lbl-short", "aria-label": `Gọi ${o.customerPhone}`, onclick: (e: Event) => { e.preventDefault(); e.stopPropagation(); location.href = `tel:${o.customerPhone}`; } },
        icon("handset", 16),
        "Gọi",
      ),
    ),
  );
}

/** Ba ngày của khối "Chuyến đón" (góp ý YC-0007 — chủ chọn cách A 30/9: một khối, ba nút chuyển ngày; cùng người xem, cùng dòng như hôm nay). */
const NGAY_DON = [
  { khoa: "today", nhan: "Hôm nay", trong: "Không có chuyến nào hôm nay." },
  { khoa: "tomorrow", nhan: "Ngày mai", trong: "Không có chuyến nào ngày mai." },
  { khoa: "dayAfter", nhan: "Ngày kia", trong: "Không có chuyến nào ngày kia." },
] as const;
/** Ngày đang chọn — giữ qua các lần làm mới lặng lẽ (không nhớ qua lần mở trang: mở lại luôn là Hôm nay). */
let ngayDonChon = 0;

function renderToday(data: Pick<Api.DashboardResponse, "today" | "tomorrow" | "dayAfter">, tien: Api.LedgerBalancesResponse["balances"]): void {
  const ds: readonly OrderSummary[] = data[NGAY_DON[ngayDonChon]!.khoa];
  const badge = byId("dash-today-count");
  badge.textContent = String(ds.length);
  badge.hidden = false; // chỉ hiện huy hiệu SAU khi đã có số thật — trước đó không để lộ viên thuốc xanh rỗng
  const nut = byId("dash-today-days");
  replaceChildren(
    nut,
    ...NGAY_DON.map((n, i) =>
      h("button", {
        type: "button", class: "dash-day", "aria-pressed": String(i === ngayDonChon), "data-ngay": n.khoa,
        onclick: () => { ngayDonChon = i; renderToday(data, tien); },
      }, h("span", { class: "dash-day-nhan" }, `${n.nhan} (${data[n.khoa].length})`)), // span: viên thuốc 36px trong vùng chạm 44px (bản vẽ điện thoại)
    ),
  );
  nut.hidden = false;
  replaceChildren(byId("dash-today-list"), ...ds.map((o) => todayRow(o, tien[o.id])));
  const trong = byId("dash-today-empty");
  trong.textContent = NGAY_DON[ngayDonChon]!.trong;
  trong.hidden = ds.length > 0;
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
    layCatalogAdmin(),
    can(staff, "feedback.triage") ? layFeedback() : Promise.resolve<Api.FeedbackQueueResponse | null>(null),
  ]);
  // Huy hiệu cát của ô "Dịch vụ & giá" (Trang chủ điện thoại) — CÙNG phép đếm với huy hiệu thanh bên (web/shell.ts catalogConflictBadge), dùng lại lời gọi vừa có.
  if (catalogRes.status === "fulfilled") datHuyHieu("dich-vu", catalogRes.value.items.filter((i) => i.conflicts.length > 0).length);
  return reviewAlerts(staff, {
    catalogItems: catalogRes.status === "fulfilled" ? catalogRes.value.items : [],
    tickets: feedbackRes.status === "fulfilled" ? (feedbackRes.value?.tickets ?? []) : [],
  });
}

/** Một dòng của khối "Cần xem lại": icon cảnh báo (màu theo loại) + tiêu đề đậm + dòng phụ nhạt, cả dòng là liên kết (đúng bản mẫu). */
function reviewRow(iconClass: string, iconDienThoai: IconName, href: string, title: string, sub: string): HTMLElement {
  // Máy tính giữ tam giác cảnh báo 17px như cũ; điện thoại theo bản vẽ 1b (biểu tượng theo loại 20px + mũi tên › cuối dòng) — hai bản cùng có trong DOM, CSS ẩn/hiện.
  const iconMayTinh = icon("alert", 17);
  iconMayTinh.classList.add("lbl-full");
  const iconDt = icon(iconDienThoai, 20);
  iconDt.classList.add("lbl-short");
  const muiTen = icon("next", 20);
  muiTen.classList.add("lbl-short", "dash-review-next");
  return h(
    "a",
    { class: "dash-review-row", href },
    h("span", { class: `dash-review-icon ${iconClass}` }, iconMayTinh, iconDt),
    h("span", { class: "dash-review-body" }, h("span", { class: "dash-review-title" }, title), h("span", { class: "muted dash-review-sub" }, sub)),
    muiTen,
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
    rows.push(reviewRow("dash-review-icon-sand", "alert", "/catalog", `Sheet đã đổi giá ${c.code}`, c.moreCount > 0 ? `${range} · +${c.moreCount} dịch vụ khác` : range));
  }
  if (alerts.feedbackQueue) {
    const f = alerts.feedbackQueue;
    const sub = f.items.map((i) => `${i.code} ${i.kindName.toLocaleLowerCase("vi-VN")}`).join(" · ");
    rows.push(reviewRow("dash-review-icon-accent", "chat", "/feedback", `${f.count} góp ý mới chưa trả lời`, sub));
  }
  replaceChildren(byId("dash-review-list"), ...rows);
  section.hidden = false;
}

/** Biểu tượng trang trí trước ba tiêu đề khối tĩnh có sẵn trong `public/index.html` (không phụ thuộc dữ liệu/quyền — chạy một lần, giữ nguyên chữ gốc). Đợt E Phần B. */
function initSectionIcons(): void {
  const prepend = (selector: string, name: IconName) => document.querySelector(selector)?.prepend(icon(name, 16));
  prepend(".dash-today-title", "clock");
  prepend(".dash-revenue-title", "chart");
  prepend(".dash-review-heading", "alert");
  // Trang chủ điện thoại: kính lúp của ô tìm đơn (hiện ngay, trước khi biết người dùng) và mũi tên › sau "Tất cả" của khối Chuyến đón (bản vẽ 1a).
  byId("dash-tim").querySelector(".dash-tim-ico")?.append(icon("search", 22));
  document.querySelector(".dash-today-all .lbl-short")?.append(icon("next", 16));
}

// ---- Trang chủ điện thoại (bản vẽ "Trang chu dien thoai.dc.html" 1a–1g, Claude Design 2026-09-30) -------------------------------------------------------------
// Chỉ hiện ở khổ ≤640px (khổ có thanh tab); máy tính ẩn hết bằng CSS và giữ nguyên bố cục cũ. Không thêm số liệu mới cần máy chủ: mọi con số lấy từ route sẵn có.

/** Biểu tượng từng ô (hình chép từ bản vẽ; cùng hình với mục cùng tên ở thanh bên máy tính khi mục đó có biểu tượng). */
const ICON_O: Record<KhoaO, IconName> = {
  "tao-don": "plus", "don-hang": "orders", "danh-ba": "contact-card",
  "dich-vu": "services", "tai-khoan": "staff", phien: "lock", "dia-diem": "pin", "giay-to-nguoi": "guests", "nhat-ky": "history", "gui-thong-bao": "megaphone", "tro-ly": "chat",
  "dieu-phoi": "swap", cuoc: "clock", xe: "truck", "sap-het-han": "clock", "giay-to-xe": "doc-check", "chinh-sach": "checkCircle", "ly-do": "filePlus",
  "gop-y": "chat", "tro-giup": "help",
};
/** Màu huy hiệu số theo bản vẽ: Đơn hàng xanh biển, giấy tờ sắp hết hạn + dịch vụ lệch Sheet màu cát, Góp ý san hô. Ô không có ở đây không bao giờ có số. */
const MAU_HUY_HIEU: Partial<Record<KhoaO, "xanh" | "cat" | "san-ho">> = { "don-hang": "xanh", "sap-het-han": "cat", "dich-vu": "cat", "gop-y": "san-ho" };
const huyHieu = new Map<KhoaO, number>();
/** Ô vuông (chỗ gắn huy hiệu) của từng ô ĐANG hiện trên lưới chính — để cập nhật số tại chỗ, không dựng lại cả lưới. */
const hopTrenLuoi = new Map<KhoaO, HTMLElement>();
let luoiTrangChu: LuoiTrangChu | null = null;
let nguoiXem: Staff | null = null;

function veHuyHieu(hop: HTMLElement, k: KhoaO): void {
  hop.querySelector(".dash-o-so")?.remove();
  const n = huyHieu.get(k) ?? 0;
  const mau = MAU_HUY_HIEU[k];
  if (n > 0 && mau) hop.append(h("span", { class: `dash-o-so dash-o-so-${mau}` }, n > 99 ? "99+" : String(n)));
}

function datHuyHieu(k: KhoaO, n: number): void {
  huyHieu.set(k, n);
  const hop = hopTrenLuoi.get(k);
  if (hop) veHuyHieu(hop, k);
}

/** Một ô: ô vuông bo góc (biểu tượng + huy hiệu / chấm "có bản mới") và nhãn tối đa hai dòng. "Tạo đơn" là ô duy nhất màu san hô (hành động chốt). */
function oChucNang(o: OChucNang, ghiNho: boolean): HTMLElement {
  const hop = h(
    "span",
    { class: o.khoa === "tao-don" ? "dash-o-hop dash-o-hop-chot" : "dash-o-hop" },
    icon(ICON_O[o.khoa], 26),
    o.khoa === "tro-giup" && helpHasNews() && h("span", { class: "dash-o-cham", role: "img", "aria-label": "Có bản mới" }),
  );
  veHuyHieu(hop, o.khoa);
  if (ghiNho) hopTrenLuoi.set(o.khoa, hop);
  return h("a", { class: "dash-o-muc", href: o.href }, hop, h("span", { class: "dash-o-nhan" }, o.nhan));
}

/** Bảng trượt "Tất cả chức năng" (bản vẽ 1c): bốn nhóm, cùng kiểu ô 4 cột; bảng trượt chung của app (✕ / chạm nền / Esc đóng, trả tiêu điểm về ô "Tất cả"). */
function moTatCa(nut: HTMLElement): void {
  if (!luoiTrangChu) return;
  const bang = moBangTruot({
    title: "Tất cả chức năng",
    body: luoiTrangChu.nhom.map((g) => h("section", { class: "dash-tc-nhom" }, h("h3", { class: "dash-tc-ten" }, g.ten), h("div", { class: "dash-o-luoi" }, ...g.o.map((o) => oChucNang(o, false))))),
    foot: [],
    footClass: "dash-tc-foot",
    opener: nut,
  });
  bang?.dialog.classList.add("dash-tc");
}

function veLuoi(staff: Staff): void {
  const luoi = oTrangChu(staff);
  luoiTrangChu = luoi;
  hopTrenLuoi.clear();
  const cacO = luoi.luoi.map((x) => oChucNang(x, true));
  if (luoi.coTatCa) {
    const nut = h("button", { type: "button", class: "dash-o-muc", "aria-haspopup": "dialog" }, h("span", { class: "dash-o-hop" }, icon("grid", 26)), h("span", { class: "dash-o-nhan" }, "Tất cả"));
    nut.addEventListener("click", () => moTatCa(nut));
    cacO.push(nut);
  }
  const nav = byId("dash-o");
  replaceChildren(nav, ...cacO);
  nav.hidden = false;
  // Huy hiệu cần lời gọi riêng (giấy tờ sắp hết hạn, Góp ý) chỉ nạp khi lưới THẬT SỰ hiển thị (điện thoại) — máy tính đã có số ở thanh bên, không gọi hai lần.
  // Cùng cách thanh bên (web/shell.ts addNav): hỏi trình duyệt `offsetParent`, chờ đổi khổ nếu đang ẩn. "Đơn hàng", "Dịch vụ & giá" dùng lại số trang đã tải.
  const nap = (): void => {
    if (luoi.nhom.some((g) => g.o.some((x) => x.khoa === "sap-het-han"))) void demSapHetHan().then((n) => datHuyHieu("sap-het-han", n));
    void feedbackBadge().then((n) => datHuyHieu("gop-y", n));
  };
  if (nav.offsetParent !== null) nap();
  else {
    const khiDoiKho = (): void => {
      if (nav.offsetParent === null) return;
      window.removeEventListener("resize", khiDoiKho);
      nap();
    };
    window.addEventListener("resize", khiDoiKho);
  }
}

/** "Thứ Tư, 30/09" — hôm nay theo giờ Việt Nam (dải đầu trang điện thoại). */
function ngayChao(now: Date): string {
  const thu = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long" }).format(now);
  // "en-GB" chỉ để lấy dạng số "dd/mm": "vi-VN" không kèm năm cho ra "02-10" (gạch nối), lệch bản vẽ.
  const ngay = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" }).format(now);
  return `${thu}, ${ngay}`;
}

/**
 * Dải đầu trang điện thoại (bản vẽ 1a): CHÍNH #topbar đổi kiểu ở khổ ≤640px trên trang này (CSS `body.trang-chu`), nên chuông thông báo giữ nguyên nút, ngăn tin
 * và cách đếm của web/thong-bao-ui.ts. Ở đây chỉ chèn thêm lời chào + ngày, nút Trợ giúp, viên thuốc bảo trì — máy tính ẩn cả ba bằng CSS.
 * Chèn SAU initShell(): initShell() dựng lại #topbar từ đầu.
 */
function dungDauTrang(staff: Staff): void {
  const topbar = byId("topbar");
  const chao = h(
    "div",
    { class: "dash-hero-chao" },
    h("span", { class: "dash-hero-xin" }, "Xin chào,"),
    h("span", { class: "dash-hero-ten" }, staff.fullName),
    h("span", { class: "dash-hero-ngay" }, ngayChao(new Date())),
  );
  const avatar = topbar.querySelector(".bar-avatar");
  if (avatar) avatar.after(chao);
  else topbar.append(chao);
  topbar.append(h("a", { class: "dash-hero-nut", href: "/help", "aria-label": "Trợ giúp" }, icon("help")));
  // Đang bảo trì (bản vẽ 1g): viên thuốc cát thay cho dải mảnh chung của khung ở khổ này; vẫn dẫn tới trang Tôi, nơi tắt bảo trì (như dải mảnh).
  // Hàng riêng (`.dash-hero-dong` trải hết bề ngang) để viên thuốc xuống dưới lời chào mà vẫn chỉ rộng bằng chữ.
  if (document.querySelector(".maint-strip")) topbar.append(h("div", { class: "dash-hero-dong" }, h("a", { class: "dash-hero-bao-tri", href: "/account" }, icon("alert", 16), "Đang ở chế độ bảo trì")));
}

function ganOTim(): void {
  byId("dash-tim").addEventListener("submit", (e) => {
    e.preventDefault();
    // Cùng đích với ô tìm trên thanh công việc máy tính (web/shell.ts): danh sách Đơn hàng lọc theo `q`.
    location.assign(`/orders?q=${encodeURIComponent((byId("dash-tim-o") as HTMLInputElement).value.trim())}`);
  });
}

/** Một ô của khối số liệu điện thoại (bản vẽ 1a: một thẻ chia 2×2) — nhãn có biểu tượng, số lớn, dòng phụ; bấm → Đơn hàng. */
function oSo(iconName: IconName, nhan: string, giaTri: string, phu: string, lop?: string): HTMLElement {
  return h(
    "a",
    { class: "dash-so-o", href: "/orders" },
    h("span", { class: "dash-so-nhan" }, icon(iconName, 16), h("span", null, nhan)),
    h("span", { class: lop ? `dash-so-gt ${lop}` : "dash-so-gt" }, giaTri),
    h("span", { class: "dash-so-phu" }, phu),
  );
}

/** Thứ tự bản vẽ: Còn thiếu · Doanh thu của tôi · Chờ xác nhận · Chưa phụ trách — cùng số với ba ô + thẻ doanh thu của máy tính (renderStats / renderRevenue). */
function renderSoDienThoai(data: Api.DashboardResponse, unpaid: Api.UnpaidSummaryResponse | null): void {
  const rev = data.revenueWeek;
  replaceChildren(
    byId("dash-so"),
    unpaid
      ? oSo("money", "Còn thiếu", `${vndShort(unpaid.total)} ₫`, unpaid.count === 0 ? "Không có đơn nào" : `${unpaid.count} đơn`, "dash-so-thieu")
      : oSo("money", "Còn thiếu", "—", "Chưa tải được số"),
    oSo("chart", "Doanh thu của tôi", `${vndShort(rev.total)} ₫`, `Tuần này · ${rev.count} đơn`, "dash-so-doanh-thu"),
    oSo("doc-check", "Chờ xác nhận", String(data.draftCount), "Cần xác nhận đơn"),
    oSo("assign", "Chưa phụ trách", String(data.unassignedCount), "Chờ người nhận"),
  );
  byId("dash-so").hidden = false;
}

const LOI_SO_LIEU = "Không tải được số liệu. Kiểm tra mạng rồi thử lại.";
/**
 * Dải báo lỗi của Trang chủ (`#error`). Điện thoại theo bản vẽ 1f: biểu tượng + câu + nút "Thử lại" (tải lại số liệu, không tải lại trang), nằm dưới lưới.
 * Máy tính giữ đúng dải chữ cũ (biểu tượng và nút ẩn bằng CSS). `chiDienThoai`: số "Còn thiếu" không tải được nhưng phần còn lại có — máy tính xưa nay chỉ hiện
 * "—", không có dải, nên dải loại này ẩn ở máy tính. `null` = gỡ. (Câu "Không có kết nối mạng…" của initShell() vẫn ghi thẳng `textContent` vào cùng phần tử.)
 */
function baoLoi(cau: Child, chiDienThoai = false): void {
  const el = byId("error");
  el.classList.toggle("dash-loi-dt", chiDienThoai);
  if (cau === null || cau === false || cau === undefined || cau === "") {
    el.hidden = true;
    replaceChildren(el);
    return;
  }
  const nut = h("button", { type: "button", class: "dash-loi-nut" }, "Thử lại");
  nut.addEventListener("click", () => {
    if (!nguoiXem) return;
    baoLoi(null);
    byId("loading").hidden = false;
    void taiDashboard(nguoiXem);
  });
  replaceChildren(el, h("span", { class: "dash-loi-ico", "aria-hidden": "true" }, icon("alert", 20)), h("span", { class: "dash-loi-chu" }, cau), nut);
  el.hidden = false;
}

// Gọi sớm (web/goi-som.ts) theo bản nhớ khung (ADR-0035): CHỈ khi máy này lần trước thuộc người xem được mọi đơn (`seesAll` — cùng điều kiện
// homeRedirect) thì gửi số liệu Trang chủ NGAY, song song với /api/auth/me. Không có bản nhớ → gọi sau initShell() như cũ. Tài khoản chỉ Đối
// tác không bao giờ gọi route này (trang-chu-smoke.mjs I-1); bản nhớ cũ sai thì máy chủ trả 403 và kết quả bị bỏ.
const nho = layKhungNho();
const layDashboard = nho?.seesAll === true ? goiSom(() => api<Api.DashboardResponse>("/api/orders/dashboard")) : () => api<Api.DashboardResponse>("/api/orders/dashboard");
// Khối "Cần xem lại" (hai API của quản trị): bản nhớ nói lần trước là quản trị → gửi sớm luôn. Vẫn chỉ DÙNG khi canSeeReviewAlerts(staff) thật đồng ý.
const nhoAdmin = nho?.admin === true;
const layCatalogAdmin = nhoAdmin ? goiSom(() => api<Api.CatalogAdminResponse>("/api/catalog/admin")) : () => api<Api.CatalogAdminResponse>("/api/catalog/admin");
// ADR-0038: hàng đợi Góp ý chỉ Toàn quyền (`feedback.triage`) — bản nhớ không biết điều đó nên KHÔNG gọi sớm; chỉ gọi khi can() đồng ý.
const layFeedback = () => api<Api.FeedbackQueueResponse>("/api/feedback");

async function main(): Promise<void> {
  initSectionIcons();
  ganOTim();
  // Cùng luật với web/shell.ts (chấm `.new-dot`): bấm Quay lại từ /help, trang được phục hồi nguyên trạng từ bộ đệm lùi/tiến — đã xem bản mới thì gỡ chấm ô Trợ giúp.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && !helpHasNews()) for (const cham of document.querySelectorAll(".dash-o-cham")) cham.remove();
  });
  const staff = await initShell();
  // Tài khoản chỉ Đối tác: Trang chủ (dashboard văn phòng) không dành cho họ → sang thẳng Đơn hàng, TRƯỚC khi gọi
  // dashboard (không để lộ 403). `replace` để nút Quay lại không dội về "/" (src/shared/start-page.ts).
  const redirect = homeRedirect(staff);
  if (redirect) {
    location.replace(redirect);
    return;
  }
  const words = staff.fullName.trim().split(/\s+/).filter(Boolean);
  byId("dash-name").textContent = `Chào ${words[words.length - 1] ?? staff.fullName}`;
  // Dải "Đang ở chế độ bảo trì" chung của khung (web/shell.ts) đã dựng xong tại đây (initShell() đã trả về) — suy ra trạng thái từ đó thay vì đọc lại API, tránh đổi chữ ký initShell().
  byId("dash-maint").hidden = !document.querySelector(".maint-strip");
  // Điện thoại: lời chào, ô tìm và lưới hiện NGAY khi biết người dùng; số liệu + chuyến đón hiện khung xương tới khi về (bản vẽ 1e).
  nguoiXem = staff;
  dungDauTrang(staff);
  veLuoi(staff);
  await taiDashboard(staff);
  // Bảng tin (ADR-0022, TD-3): đơn đổi / vừa nối lại → tải lại số liệu và danh sách hôm nay. Đăng ký MỘT lần, sau lần tải đầu; bộ gộp bảo đảm
  // một đợt tin + `can-tai-lai` đến cùng lúc không chạy hai lần tải song song.
  const lamMoi = taoBoLamMoi(() => taiDashboard(staff, true));
  window.addEventListener("don-thay-doi", () => void lamMoi.yeuCau());
  window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
}

/**
 * Tải dữ liệu Trang chủ và dựng ba ô số + "Chưa phụ trách" + danh sách hôm nay + doanh thu tuần (một lời gọi `GET /api/orders/dashboard`).
 * `lamMoi` (theo tin của Bảng tin): không hiện lại khung "đang tải", không chạy lại "Cần xem lại" (không phụ thuộc đơn, gọi thêm hai API của Admin),
 * và lỗi mạng thì giữ nguyên số cũ đang hiện (không xoá khối, không dựng banner lỗi).
 */
async function taiDashboard(staff: Staff, lamMoi = false): Promise<void> {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long" }).format(now);
  const dateStr = now.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
  const loadingEl = byId("loading");
  try {
    // loadReview() không bao giờ ném lỗi (allSettled + canSeeReviewAlerts() chặn trước) — gọi song song với
    // dashboard chính, không làm chậm phần còn lại của trang.
    const [data, review, unpaid] = await Promise.all([
      layDashboard(),
      lamMoi ? undefined : loadReview(staff),
      api<Api.UnpaidSummaryResponse>("/api/ledger/unpaid-summary").catch(() => null), // sổ tiền lượt 1: ô "Còn thiếu tiền" rời dashboard của orders
    ]);
    // Số "còn lại" cho cả ba ngày của khối "Chuyến đón" (Hôm nay / Ngày mai / Ngày kia — góp ý YC-0007); billing nhận tối đa 100 mã một lần.
    const maDon = [...new Set([...data.today, ...data.tomorrow, ...data.dayAfter].map((o) => o.id))].slice(0, 100);
    const tien = maDon.length
      ? await api<Api.LedgerBalancesResponse>("/api/ledger/balances", { method: "POST", body: { orderIds: maDon } }).then((r) => r.balances, () => ({}))
      : {};
    loadingEl.hidden = true;
    // Lần trước lỗi mà lần này được → gỡ dải. Chỉ thiếu số "Còn thiếu" → dải "Thử lại" ở điện thoại (bản vẽ 1f); máy tính như cũ (ô hiện "—", không dải).
    baoLoi(unpaid ? null : LOI_SO_LIEU, true);
    byId("dash-date").textContent = `${weekday}, ${dateStr} · ${data.today.length} chuyến đón hôm nay`;
    datHuyHieu("don-hang", data.draftCount); // huy hiệu ô "Đơn hàng" = số đơn chưa xác nhận (quyết định 8 của chủ dự án — cùng số huy hiệu thanh bên)
    renderStats(data, unpaid);
    renderSoDienThoai(data, unpaid);
    renderToday(data, tien);
    renderRevenue(data.revenueWeek);
    if (review !== undefined) renderReview(review);
    // Chỉ hiện khối nội dung SAU KHI dựng xong dữ liệu thật — lúc đang tải/lỗi giữ ẩn (tránh khối rỗng đọng lại cạnh skeleton/banner lỗi).
    byId("dash-grid").hidden = false;
  } catch (err) {
    if (lamMoi) return; // làm mới lặng lẽ: giữ số cũ
    loadingEl.hidden = true;
    byId("dash-date").textContent = `${weekday}, ${dateStr}`;
    // Máy tính giữ câu cũ; điện thoại dùng câu của bản vẽ 1f (nút "Thử lại" ngay cạnh) — hai bản cùng trong DOM, CSS ẩn/hiện.
    baoLoi(err instanceof ApiError ? err.message : h("span", null, h("span", { class: "lbl-full" }, "Không tải được Trang chủ. Thử tải lại trang."), h("span", { class: "lbl-short" }, LOI_SO_LIEU)));
  }
}
void main();
