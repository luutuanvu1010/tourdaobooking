# Trang chủ mới (Dashboard) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang thứ 12 và cuối cùng của việc thiết kế lại giao diện — `/home`, tổng quan cho nhân viên văn phòng: 3 ô số liệu, danh sách "chuyến đón hôm nay", doanh thu tuần của người đăng nhập. KHÔNG đổi route `/` hay bất kỳ trang/API nào đã có.

**Architecture:** Dùng khung hiện có (`initShell()`, `#topbar`, tab bar) — KHÔNG dựng thanh điều hướng bên dọc mới (xem đặc tả §2 — giả định lớn nhất, đã tự quyết theo hướng an toàn, DỪNG hỏi chủ nếu người lập kế hoạch/thi công thấy có tín hiệu chủ thật sự muốn thanh bên). Route API mới gộp 1 endpoint `GET /api/orders/dashboard` trong module `orders` có sẵn — không tạo module mới, không đổi route cũ.

**Tech Stack:** TypeScript thuần, `h()`, CSS token, D1/SQLite. Không thêm dependency.

**Spec:** `docs/superpowers/specs/2026-09-23-trang-chu-moi-design.md` (đặc tả, thẩm quyền cao hơn nếu lệch) + `docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md` (quyết định chủ dự án).

## Global Constraints

- Tiếng Việt có dấu đầy đủ; không lộ chữ Anh.
- Không `innerHTML`; mọi DOM dựng bằng `h()`.
- CSS chỉ token có sẵn trong `public/app.css`, không hex/px cứng (trừ đúng `1px`).
- KHÔNG đổi `GET /api/orders`, KHÔNG đổi `web/orders.ts`/`public/index.html`, KHÔNG đổi `web/shell.ts` ngoài thêm đúng 1 mục điều hướng "Trang chủ".
- `orders` module KHÔNG import `src/modules/dispatch` — đếm "chưa có người phụ trách" CHỈ qua view `v_dsp_order_handler`.
- Số tiền hiển thị (còn thiếu, doanh thu) PHẢI dùng số HIỆN HÀNH sau điều chỉnh (giống cách `listOrders()` đã sửa ở Đợt B — bài học merge: đơn có điều chỉnh số khách sau xác nhận thì `total`/`remaining_amount` gốc trên bảng `orders` có thể lệch với số hiện hành). Tái dùng `getLatestAdjustmentSubtotals()`/`effectiveMoney()` đã có sẵn trong `src/modules/orders/repository.ts` (từ `./money-adjustment`), KHÔNG viết lại logic tính tiền.
- Trước khi viết SQL/DOM: đọc lại đúng cấu trúc THẬT của tệp đang sửa — mã mẫu dưới đây dựa trên đọc mã lúc lập kế hoạch (2026-09-23), CHƯA phải mã cuối; tên cột/hàm có thể cần khớp lại nếu mã thật đã đổi.
- Trang mới → kịch bản Chrome mới (Task 3), khai `PAGES` (`src/shared/sw-policy.ts`), thêm vào script `build:web` (`package.json`), `npm run test:e2e -- pwa`.

## Quyết định trình bày (đã tự quyết, không cần hỏi lại — ghi lại theo P8)

1. **Không dựng thanh bên dọc** — dùng khung `#topbar`/tab bar hiện có (đặc tả §2). Nội dung mockup (dòng chào, 3 ô số liệu, 2 khối chính) lấy nguyên, bỏ phần sidebar/topbar riêng của mockup.
2. **Bỏ biểu đồ cột 7 ngày** của "Doanh thu của tôi" — chỉ hiện số tổng + số đơn (quyết định chủ #4).
3. **Bỏ khối "Cần xem lại"** hoàn toàn ở đợt này — chưa có nguồn dữ liệu tổng hợp sẵn (đặc tả §3.5, §8).
4. **Bỏ dòng phụ "N đón trong 24h"** của ô "Đơn nháp chưa xác nhận" — chỉ hiện số lượng (đặc tả §7).
5. **Ô số liệu bấm vào dẫn `/`** (trang Đơn hàng, không lọc) — trang Đơn hàng chưa hỗ trợ lọc "còn thiếu tiền"/"chưa phụ trách", không đổi API trang đó để thêm bộ lọc (ngoài phạm vi).
6. **Tuần doanh thu**: thứ Hai → Chủ nhật theo giờ Việt Nam (`vnToday()`), tính theo `orders.created_at` (đơn CONFIRMED do chính người đăng nhập lập, `staff_id` = người lập — đúng chú thích của mockup "theo createdBy").
7. **Gộp 1 API** `GET /api/orders/dashboard` thay vì nhiều route nhỏ — giảm số lần gọi từ client.

## Task 1: API `GET /api/orders/dashboard` + hàm `getDashboard()` + test

**Files:**
- Modify: `src/modules/orders/repository.ts`, `src/modules/orders/index.ts`, `src/shared/contracts.ts`
- Test: `src/modules/orders/repository.test.ts` (hoặc tệp `*.test.ts` cạnh, đọc lại tên tệp test thật đang có cho module `orders`)

**Interfaces:**
- Thêm `DashboardResponse` vào `src/shared/contracts.ts`:
```ts
export interface DashboardResponse {
  today: OrderSummaryDto[];
  unpaid: { total: number; count: number; earliestDate: string | null };
  draftCount: number;
  unassignedCount: number;
  revenueWeek: { total: number; count: number; from: string; to: string };
}
```
- Route mới: `GET /api/orders/dashboard`, `access: "office"` (chỉ SALES/ACCOUNTING/ADMIN/SUPER_ADMIN — đọc `src/shared/permissions.ts`/`isOffice()` để xác nhận đúng hàm kiểm tra đã dùng ở route khác `access: "office"`).

- [ ] **Step 1: Đọc lại thật kỹ trước khi viết SQL** — `src/modules/orders/repository.ts` (đặc biệt `ORDER_SELECT`, `toDto()`, `listOrders()`, `getLatestAdjustmentSubtotals()`, `effectiveMoney()` từ `./money-adjustment`, `summarizeServices()`), `src/shared/vn-date.ts` (`vnToday()`, có hàm tính "đầu tuần"/"cuối tuần" chưa — nếu chưa có, tự viết hàm thuần mới trong `vn-date.ts` hoặc cạnh, có test), `migrations/0014_dispatch.sql` (`v_dsp_order_handler`).

- [ ] **Step 2: Viết hàm `getDashboard()` trong `src/modules/orders/repository.ts`** (mã mẫu, tự sửa tên cột/biến cho khớp thật):

```ts
export interface DashboardData {
  today: OrderRow[]; // hoặc mảng đã toDto — tự quyết theo đúng cách listOrders() đang làm (toDto rồi map)
  unpaid: { total: number; count: number; earliestDate: string | null };
  draftCount: number;
  unassignedCount: number;
  revenueWeek: { total: number; count: number };
}

export async function getDashboard(db: D1Database, staffId: string, today: string, weekFrom: string, weekTo: string): Promise<DashboardData> {
  // 1) "Chuyến đón hôm nay": đơn confirmed, dịch vụ có depart_date sớm nhất (trong các dịch vụ CÓ ngày) = today.
  const { results: todayRows } = await db
    .prepare(
      `${ORDER_SELECT}
       JOIN order_service os ON os.order_id = o.id
       WHERE o.status = 'confirmed'
         AND os.depart_date = ?1
         AND os.id = (
           SELECT id FROM order_service os2
           WHERE os2.order_id = o.id AND os2.depart_date IS NOT NULL
           ORDER BY os2.depart_date, os2.pickup_time, os2.sort_order
           LIMIT 1
         )
       ORDER BY os.pickup_time, os.sort_order`,
    )
    .bind(today)
    .all<OrderRow & { pickup_time: string | null; pickup_place: string | null }>();
  // Áp số tiền HIỆN HÀNH giống listOrders() (bài học Đợt B): tính lại total/remainingAmount qua getLatestAdjustmentSubtotals + effectiveMoney trước khi trả về `today`.

  // 2) "Còn thiếu tiền": confirmed, remaining_amount gốc > 0 — CHÚ Ý: remaining_amount gốc có thể lệch số hiện hành nếu có điều chỉnh,
  //    nên phải áp effectiveMoney cho TỪNG đơn rồi mới lọc >0 và tính tổng — không lọc thẳng trên cột remaining_amount gốc.
  //    Cách làm: lấy toàn bộ đơn confirmed (id, subtotal, discount, deposit_amount, remaining_amount gốc) + earliest depart_date, áp effectiveMoney từng đơn (giống vòng lặp trong listOrders()), rồi lọc/tổng hợp trong JS — KHÔNG cố nhồi hết vào 1 câu SQL.

  // 3) draftCount: SELECT COUNT(*) FROM orders WHERE status = 'draft'.

  // 4) unassignedCount: SELECT COUNT(*) FROM orders o WHERE o.status = 'confirmed'
  //    AND NOT EXISTS (SELECT 1 FROM v_dsp_order_handler h WHERE h.order_id = o.id).

  // 5) revenueWeek: SELECT COUNT(*), SUM(total gốc HAY hiện hành?) FROM orders WHERE status='confirmed' AND staff_id=?
  //    AND created_at >= weekFrom_iso AND created_at < weekTo_iso_exclusive (đổi weekFrom/weekTo ngày dân sự VN sang mốc ISO UTC đúng quy ước dự án — đọc cách order.ts/service.ts đang đổi ngày VN sang ISO UTC, dùng lại đúng cách đó, không tự chế).
  //    Doanh thu tuần cũng nên áp effective money nếu đơn trong tuần có điều chỉnh — tự quyết mức độ chính xác cần thiết, ghi rõ trong code comment nếu bỏ qua để đơn giản (P8, bề mặt).

  throw new Error("viết đầy đủ — đây là khung, không phải mã chạy được");
}
```

*Lưu ý cho người thi công:* đoạn "còn thiếu tiền" và "doanh thu tuần" đều cần ÁP DỤNG effective money từng đơn (không tin thẳng cột `remaining_amount`/`total` gốc trên bảng `orders`) — đây là điểm dễ lặp lại đúng bug đã gặp ở Đợt B (main từng phải sửa `listOrders()` vì lý do y hệt). Đọc kỹ cách `listOrders()` hiện tại (sau khi đã gộp bản sửa Đợt B) làm việc này, copy đúng kỹ thuật, đừng viết lại từ đầu.

- [ ] **Step 3: Thêm route trong `src/modules/orders/index.ts`**:
```ts
route("GET", "/api/orders/dashboard", "office", async ({ env, staff }) => {
  const today = vnToday(new Date());
  const { from, to } = /* hàm tính đầu/cuối tuần VN, viết mới nếu chưa có, đặt ở vn-date.ts */;
  const data = await getDashboard(env.DB, staff.id, today, from, to);
  return json(data satisfies DashboardResponse);
}),
```
Đối chiếu `access: "office"` có đúng kiểu `Ctx<A>` cho phép đọc `staff` không (route access khác `"public"` luôn có `staff` — đã xác nhận ở `router.ts:18`).

- [ ] **Step 4: Test thuần** — thêm test cho hàm tính tuần (nếu viết mới trong `vn-date.ts`, test cạnh `vn-date.test.ts`) và test cho `getDashboard()` (D1 tạm trong bộ nhớ, giống các test khác của module `orders` — đọc `src/modules/orders/repository.test.ts` nếu có, hoặc mẫu test D1 ở module khác). Ca cần phủ: đơn không có dịch vụ nào có ngày đón (không rơi vào "hôm nay"); đơn có nhiều dịch vụ, ngày sớm nhất đúng ngày hôm nay nhưng có dịch vụ khác ngày khác (vẫn tính); đơn draft có ngày đón hôm nay (KHÔNG xuất hiện trong `today`, vì lọc `status='confirmed'`); đơn confirmed đã có điều chỉnh tiền (số hiện hành đúng, không phải số gốc); đơn confirmed không ai phụ trách (đếm đúng) vs có người phụ trách (không đếm).

- [ ] **Step 5: Build + kiểm kiểu.** `npm run build:web && npm run typecheck` — 0 lỗi.

- [ ] **Step 6: `npm test`.**

- [ ] **Step 7: Commit.**
```bash
git add src/modules/orders/repository.ts src/modules/orders/index.ts src/shared/contracts.ts src/shared/vn-date.ts src/modules/orders/repository.test.ts src/shared/vn-date.test.ts
git commit -m "Trang chủ mới: thêm API GET /api/orders/dashboard"
```

## Task 2: Trang `/home` — giao diện

**Files:**
- Add: `public/home.html`, `web/home.ts`
- Modify: `web/shell.ts` (thêm mục điều hướng "Trang chủ"), `web/icons.ts` (thêm 5 icon), `public/app.css`, `src/shared/sw-policy.ts` (`PAGES`), `package.json` (script `build:web`)

**Interfaces:** Gọi `GET /api/orders/dashboard` (Task 1) qua `api<Api.DashboardResponse>("/api/orders/dashboard")` — thêm kiểu `DashboardResponse` vào `web/api.ts` nếu tệp đó định nghĩa lại DTO riêng cho client (đọc lại `web/api.ts` để biết quy ước tái dùng `src/shared/contracts.ts` hay tự định nghĩa lại).

- [ ] **Step 1: Thêm 5 icon vào `web/icons.ts`** — copy đúng `path`/`circle`/`rect` từ mockup (`home`, `contact-card`, `pin`, `history`, `chat`), theo đúng khuôn `SHAPES` đã có.

- [ ] **Step 2: Thêm mục "Trang chủ" vào `web/shell.ts`** — cả `nav` (thanh trên, `office && h("a", { href: "/home" }, "Trang chủ")`, đặt TRƯỚC mục "Đơn hàng") và `tabsFor()` (tab bar điện thoại, mục mới `{ href: "/home", label: "Trang chủ", icon: "home", active: (p) => p === "/home" }`, đặt đầu mảng `officeTabs` trước "Đơn hàng" — đọc lại đúng vị trí biến `officeTabs` trong hàm thật). KHÔNG đổi gì khác trong `shell.ts`.

- [ ] **Step 3: Tạo `public/home.html`** (copy khuôn `<head>` từ `public/index.html`, đổi tiêu đề "Trang chủ — Tour Đảo Booking"):
```html
<!doctype html>
<html lang="vi"><head>...(giống index.html, đổi title)...</head>
<body>
<header id="topbar"></header>
<main>
  <div class="dash-hello">
    <span id="dash-name" class="dash-name"></span>
    <span id="dash-date" class="dash-date"></span>
    <span id="dash-maint" class="badge badge-draft" hidden>Đang ở chế độ bảo trì</span>
  </div>
  <div id="dash-stats" class="dash-stats"></div>
  <div class="dash-layout">
    <section id="dash-today" class="card dash-today">
      <div class="dash-today-head"><span>Chuyến đón hôm nay</span><span id="dash-today-count" class="badge badge-confirmed"></span></div>
      <div id="dash-today-list"></div>
      <p id="dash-today-empty" class="empty" hidden>Không có chuyến nào hôm nay.</p>
    </section>
    <section id="dash-revenue" class="card">
      <div class="dash-revenue-head"><span>Doanh thu của tôi</span><span id="dash-revenue-range" class="muted"></span></div>
      <div id="dash-revenue-total" class="dash-revenue-total"></div>
    </section>
  </div>
  <div id="error" class="alert" role="alert" hidden></div>
</main>
<script type="module" src="/js/home.js"></script>
</body></html>
```
(Bọc `#dash-today` + `#dash-revenue` là 2 con TRỰC TIẾP, PHẲNG của `.dash-layout` — đúng bài học Đợt C, dùng `grid-column` ở CSS, không lồng thêm div.)

- [ ] **Step 4: Tạo `web/home.ts`** — gọi `initShell()`, gọi API, dựng DOM bằng `h()`:
```ts
import { api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { dayMonth, paxCounts, vnd } from "./format";
import { initShell, showError } from "./shell";

async function main(): Promise<void> {
  const staff = await initShell();
  byId("dash-name").textContent = `Chào ${staff.fullName.split(" ").pop()}`;
  // dash-date: thứ/ngày hôm nay + "N chuyến đón hôm nay" — điền sau khi có dữ liệu.
  try {
    const data = await api<Api.DashboardResponse>("/api/orders/dashboard");
    byId("dash-date").textContent = `${data.today.length} chuyến đón hôm nay`;
    renderStats(data);
    renderToday(data.today);
    renderRevenue(data.revenueWeek);
  } catch (err) {
    showError(byId("error"), "Không tải được Trang chủ. Thử tải lại trang.");
  }
}
void main();
```
(Viết đầy đủ `renderStats`/`renderToday`/`renderRevenue` — dựng 3 ô số liệu dạng `<a>` (link tới `/`), danh sách chuyến (giờ đón, tên khách+số khách qua `paxCounts()`, SĐT bấm gọi giống `web/orders.ts` dòng ~40, tên dịch vụ+nơi đón, số tiền còn lại/đã trả đủ dùng `.money-due`/`.money-ok`), khối doanh thu (số tổng qua `vnd()` + khoảng ngày). Đọc lại `web/orders.ts` `row()` để bắt chước đúng cách dựng thẻ đơn nếu muốn tái dùng cấu trúc tương tự cho từng dòng "chuyến đón hôm nay".)

- [ ] **Step 5: CSS trong `public/app.css`** (sau mốc PWA, chỉ token):
```css
.dash-hello { display: flex; align-items: baseline; gap: var(--s3); flex-wrap: wrap; }
.dash-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s3); margin: var(--s4) 0; }
.dash-layout { display: block; }
@media (min-width: 900px) {
  .dash-layout { display: grid; grid-template-columns: 1.35fr 1fr; gap: var(--s5); align-items: start; }
}
@media (max-width: 639px) {
  .dash-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```
(Tự bổ sung rule cho `.dash-today-head`/từng dòng chuyến/`.dash-revenue-total`... đối chiếu token thật, không hex/px cứng.)

- [ ] **Step 6: Khai `PAGES`** (`src/shared/sw-policy.ts`, thêm `"/home"`) và thêm `web/home.ts` vào script `build:web` trong `package.json` (danh sách `esbuild web/login.ts web/orders.ts ...`).

- [ ] **Step 7: Build + kiểm kiểu.** `npm run build:web && npm run typecheck` — 0 lỗi.

- [ ] **Step 8: `npm test && npm run test:e2e -- pwa`.**

- [ ] **Step 9: Commit.**
```bash
git add public/home.html web/home.ts web/shell.ts web/icons.ts public/app.css src/shared/sw-policy.ts package.json
git commit -m "Trang chủ mới: dựng trang /home (số liệu, chuyến đón hôm nay, doanh thu)"
```

## Task 3: Kịch bản Chrome + kiểm toàn cục

**Files:**
- Add: `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs`

- [ ] **Step 1: Viết kịch bản** (theo mẫu `dot-c-smoke.mjs`, dùng lại `startEnv()`/`ACCOUNTS`/`ok` từ `a2-cdp.mjs`) — kiểm: đăng nhập `ACCOUNTS.admin` (hoặc SALES), tạo trước ít nhất 1 đơn confirmed có dịch vụ ngày đón = hôm nay (qua API) để "Chuyến đón hôm nay" có dữ liệu thật; mở `/home` ở khổ 1040 và 390: 3 ô số liệu hiện đúng số, danh sách chuyến hiện đúng dòng vừa tạo, doanh thu tuần hiện số > 0 nếu đơn vừa tạo cùng tuần; kiểm `.dash-layout` là `grid` ở ≥900px, `block` ở <900px, thứ tự DOM `#dash-today` trước `#dash-revenue` không đổi ở cả 2 khổ; axe 0 vi phạm cả 2 khổ.

- [ ] **Step 2: Chạy kịch bản**, xác nhận thoát mã 0. Sửa Task 1/2 nếu phát hiện sai lệch thật.

- [ ] **Step 3: Commit.**
```bash
git add docs/evidence/2026-09-23-trang-chu-moi/
git commit -m "Trang chủ mới: thêm kịch bản Chrome trang-chu-smoke.mjs"
```

---

## Sau khi Task 3 xong (bắt buộc theo CLAUDE.md §3)

Việc lớn (API mới + đọc xuyên module `dispatch` qua view + trang mới). Dispatch subagent kiểm độc lập cho TỪNG Task, rồi một lượt kiểm toàn cục trước khi báo "đạt" với chủ dự án. Đặc biệt kiểm:
- Số tiền "còn thiếu"/"doanh thu" có dùng ĐÚNG số hiện hành sau điều chỉnh không (test bằng 1 đơn đã có điều chỉnh số khách sau xác nhận — đúng kịch bản bug đã gặp thật ở Đợt B).
- "Chuyến đón hôm nay" không lộ đơn `draft`, không lộ đơn có ngày đón khác hôm nay dù đơn đó có MỘT dịch vụ khác trùng hôm nay nhưng dịch vụ sớm nhất không phải hôm nay (đọc kỹ điều kiện SQL Step 2 Task 1 — đây là điểm dễ sai).
- "Chưa có người phụ trách" không đếm nhầm đơn draft.
- Route `/home` đúng quyền `office`, PARTNER/FIELD không thấy mục điều hướng và bị 403 nếu cố gọi thẳng API.
- Bài học Đợt C: thứ tự DOM trên điện thoại của `.dash-layout` không bị đảo.
