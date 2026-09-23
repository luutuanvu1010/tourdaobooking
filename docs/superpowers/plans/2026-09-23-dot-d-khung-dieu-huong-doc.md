# Đợt D — Khung điều hướng dọc + Trang chủ đúng bản mẫu + đổi trang mặc định — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps dùng checkbox (`- [ ]`).

**Goal:** đưa Trang chủ về đúng bản mẫu `00 Trang chu v2.dc.html`, dựng thanh điều hướng dọc cho máy tính (cả 12 trang), và đổi `/` thành Trang chủ.

**Spec:** `docs/superpowers/specs/2026-09-23-dot-d-khung-dieu-huong-doc.md` (thẩm quyền cao hơn kế hoạch nếu lệch). **ADR:** `docs/adr/ADR-0015-khung-dieu-huong-doc.md` — **trạng thái `proposed`; Task 4 và Task 5 KHÔNG được bắt đầu khi chủ dự án chưa duyệt.**

**Architecture:** Task 1–3 chỉ đụng Trang chủ (`web/home.ts`, `public/home.html`, khối `.dash-*` của `public/app.css`) và API `GET /api/orders/dashboard`. Task 4 đụng `web/shell.ts` — khung dùng chung của **cả 12 trang**. Task 5 đụng tên tệp tĩnh + 11 kịch bản Chrome.

**Tech Stack:** TypeScript thuần, `h()`, CSS token, D1/SQLite. Không thêm dependency.

## Global Constraints

- Tiếng Việt có dấu đầy đủ; không lộ chữ Anh.
- Không `innerHTML`; DOM dựng bằng `h()`.
- CSS sau mốc PWA (`/* ---------- app iPhone (PWA)`) chỉ dùng token; token mới khai ở `:root` nhóm "Riêng của Tour Đảo Booking", TRƯỚC mốc đó.
- KHÔNG đổi bản đồ quyền (`src/shared/permissions.ts`), KHÔNG đổi schema, KHÔNG thêm dependency.
- **Bài học Đợt B:** số tiền dùng **số HIỆN HÀNH sau điều chỉnh** (`getLatestAdjustmentSubtotals()` + `effectiveMoney()`), không tin cột gốc.
- **Bài học Đợt C:** bố cục nhiều cột giữ **DOM phẳng đúng thứ tự đọc điện thoại**, dùng `grid-column` tường minh — KHÔNG lồng div bọc theo thứ tự khác.
- **Bài học Trang chủ (lần này, quan trọng nhất):** khối **NHÌN THẤY ĐƯỢC** trên màn hình **KHÔNG** phải "bề mặt đảo ngược được" theo P8 — **không tự quyết bỏ, phải hỏi chủ dự án**. Nếu trong lúc thi công thấy một khối của mockup khó làm, DỪNG và hỏi, đừng lặng lẽ bỏ.
- **Bài học kiểm:** trước khi báo xong, **mở ảnh kết quả và ảnh mockup đặt cạnh nhau, so bằng mắt từng khối**. Test xanh không thay được việc này — lần trước lỗi "₫ rơi xuống dòng" nằm ngay trong ảnh đã commit mà không ai thấy.
- Mỗi Task: `npm run build:web && npm run typecheck` 0 lỗi, `npm test` xanh, commit riêng.

## Quyết định trình bày (đã tự quyết, ghi lại theo P8)

1. **Giữ nguyên thanh tab điện thoại** — mockup điện thoại không vẽ thanh bên; đổi cả hai bề mặt cùng lúc nhân đôi rủi ro (ADR-0015 điều 2).
2. **Nơi đón đứng TRƯỚC tên dịch vụ** trong dòng chuyến (`KS Havana · Vinpearl 1 ngày`) — đúng mockup điện thoại, và giữ được nguyên tắc "giờ + nơi đón cùng nguồn, tên dịch vụ có thể là dịch vụ khác" mà không gợi ý quan hệ một-một.
3. **Biểu đồ cột dựng bằng `h()` + CSS** (chiều cao theo `%`), không thư viện.
4. **`/home` giữ lại làm trang chuyển hướng** về `/` sau khi đổi tên tệp — rẻ, gỡ được sau vài tuần.
5. **Huy hiệu không có số thật thì không vẽ** — không bịa số cho khớp mockup.

---

## Task 1: Trang chủ — nội dung và khổ điện thoại đúng mockup (trong khung hiện tại)

Rủi ro thấp nhất, thấy kết quả ngay, không phụ thuộc ADR.

**Files:** Modify `public/home.html`, `web/home.ts`, `public/app.css`

- [ ] **Step 1: Đọc lại mockup + ảnh.** Mở `docs/design/mockup-by-ClaudeDesign/00 Trang chu v2.dc.html` (phần máy tính dòng ~40–270, phần điện thoại dòng ~275–340) và ảnh `docs/evidence/2026-09-23-trang-chu-moi/anh/trang-chu-may-tinh.png`, `trang-chu-dien-thoai.png`. Liệt kê ra giấy từng khác biệt trước khi sửa.

- [ ] **Step 2: Bỏ phần thừa so với mockup** — trong `public/home.html`: bỏ `<h1>Trang chủ</h1>`, bỏ nhãn `#dash-stats-label` ("Số liệu toàn công ty"), bỏ `· toàn công ty` ở tiêu đề "Chuyến đón hôm nay". *(Nhãn phạm vi được thêm ở đợt trước để chống hiểu nhầm; mockup không có. Nếu bạn thấy bỏ hẳn là mất thông tin quan trọng → DỪNG, hỏi chủ, đừng tự quyết giữ.)*

- [ ] **Step 3: Chip bảo trì sang phải cùng dòng chào** — `.dash-hello { display:flex; align-items:baseline; gap:var(--s3); flex-wrap:wrap; }` thêm `#dash-maint { margin-left:auto; }`.

- [ ] **Step 4: Thêm "Xem tất cả"** vào đầu mục "Chuyến đón hôm nay", dẫn `/` (đổi thành `/orders` ở Task 5):
```ts
h("a", { class: "dash-today-all", href: "/" }, "Xem tất cả")
```
CSS: `.dash-today-head { display:flex; align-items:center; gap:var(--s2); } .dash-today-all { margin-left:auto; font-size:var(--fs-label); font-weight:600; }`
Ở ≤639px đổi chữ thành "Tất cả" (mockup) — dùng hai `<span>` ẩn/hiện theo `@media`, không đổi DOM bằng JS.

- [ ] **Step 5: Khổ điện thoại — lưới 2×2 gộp doanh thu.** Đây là **sửa lỗi lệch đặc tả**, không phải yêu cầu mới (đặc tả `…-trang-chu-moi-design.md` §3 đã bắt).
  - Đưa khối doanh thu thành **ô thứ tư trong lưới số liệu** ở ≤639px: giữ DOM phẳng, dùng `grid-column`/`order` trong `@media` — KHÔNG lồng div mới (bài học Đợt C).
  - Nhãn rút gọn ở ≤639px: "CÒN THIẾU" / "ĐƠN NHÁP" / "CHƯA PHỤ TRÁCH" / "DOANH THU CỦA TÔI" — dùng `<span class="lbl-full">` + `<span class="lbl-short">` ẩn/hiện bằng CSS.
  - Dòng phụ rút gọn: "3 đơn" / "Cần gán" / "Tuần này · 11 đơn".

- [ ] **Step 6: Tiền rút gọn ở khổ điện thoại** — thêm hàm thuần vào `web/format.ts` (có test cạnh):
```ts
/** Tiền rút gọn cho khổ hẹp: 8.780.000 → "8,78tr", 900.000 → "900k", 0 → "0". Không làm tròn lên. */
export function vndShort(n: number): string { /* … */ }
```
Test phải phủ: 0, <1000, 900.000 → "900k", 8.780.000 → "8,78tr", 24.150.000 → "24,15tr", số âm.

- [ ] **Step 7: Dòng chuyến — nơi đón TRƯỚC tên dịch vụ** (`KS Havana · Vinpearl 1 ngày`), giữ chú thích trong mã giải thích vì sao hai thứ này không phải cùng một dịch vụ.

- [ ] **Step 8: Build + kiểm kiểu + test.** `npm run build:web && npm run typecheck`; `npm test`.

- [ ] **Step 9: Chạy kịch bản Chrome + SO ẢNH BẰNG MẮT.** Chạy `trang-chu-smoke.mjs`, rồi **mở ảnh kết quả cạnh ảnh mockup**, xác nhận từng khối. Ghi vào báo cáo: khối nào đã khớp, khối nào còn khác (Task sau xử lý).

- [ ] **Step 10: Commit.**
```bash
git add public/home.html web/home.ts public/app.css web/format.ts web/format.test.ts
git commit -m "Đợt D Task 1: Trang chủ đúng mockup phần nội dung và khổ điện thoại"
```

---

## Task 2: Biểu đồ cột 7 ngày (đụng API — cần kiểm độc lập)

**Files:** Modify `src/modules/orders/repository.ts`, `src/shared/contracts.ts`, `src/modules/orders/dashboard.test.ts`, `web/home.ts`, `public/app.css`

- [ ] **Step 1: Thêm `daily` vào `DashboardResponse`:**
```ts
revenueWeek: { total: number; count: number; from: string; to: string; daily: { date: string; total: number }[] };
```
`daily` đúng 7 phần tử T2→CN, ngày không đơn thì `total: 0` (không bỏ trống — biểu đồ cần đủ 7 cột).

- [ ] **Step 2: Tính `daily` trong `getDashboard()`** — nhóm theo ngày trên CÙNG tập đơn đang dùng cho `revenueWeek.total`, **áp `effectiveMoney` từng đơn trước khi cộng** (bài học Đợt B). Đọc lại mã hiện tại, tái dùng, không viết lại logic tiền.

- [ ] **Step 3: Test ĐỎ TRƯỚC** trong `dashboard.test.ts`: đơn ở 2 ngày khác nhau trong tuần → `daily` có đúng 7 phần tử, đúng ngày, đúng số; đơn có điều chỉnh tiền → `daily` dùng số hiện hành; tuần không có đơn → 7 phần tử `total: 0`.

- [ ] **Step 4: Vẽ biểu đồ trong `web/home.ts`** — 7 cột, chiều cao `%` theo `max(daily)`, cột cao nhất tô `--c-primary`, còn lại `--c-primary-soft`; nhãn T2…CN dưới. Nếu mọi ngày đều 0 → hiện dòng "Chưa có đơn nào tuần này", không vẽ 7 cột rỗng.

- [ ] **Step 5: Build + typecheck + test + kịch bản Chrome + SO ẢNH.**

- [ ] **Step 6: Commit.**
```bash
git add src/modules/orders/repository.ts src/shared/contracts.ts src/modules/orders/dashboard.test.ts web/home.ts public/app.css
git commit -m "Đợt D Task 2: biểu đồ doanh thu 7 ngày trên Trang chủ"
```

---

## Task 3: Khối "Cần xem lại"

**PHỤ THUỘC:** cần chủ dự án trả lời §7 mục 2 và 4 của đặc tả (dữ liệu Sheet đổi giá chỉ admin gọi được; mã yêu cầu góp ý chưa có trong API badge). **Không bắt đầu khi chưa có câu trả lời** — nếu chủ chọn "bỏ", xoá Task này khỏi kế hoạch và ghi ruling.

**Files:** tuỳ câu trả lời — nhiều khả năng `src/modules/orders/repository.ts` (thêm số đếm vào dashboard) hoặc `web/home.ts` (gọi thêm `/api/catalog/admin` khi là admin).

- [ ] **Step 1:** Đọc câu trả lời của chủ, ghi ruling vào đầu Task này trước khi viết mã.
- [ ] **Step 2:** Dựng khối theo mockup: mỗi dòng có icon cảnh báo (`--c-sand` cho Sheet, `--c-accent` cho góp ý), tiêu đề đậm, dòng phụ nhạt.
- [ ] **Step 3:** Trạng thái rỗng: không có gì cần xem lại → **ẩn cả khối**, không hiện thẻ trống (bài học Đợt C: khối rỗng nhìn như hỏng).
- [ ] **Step 4:** Build + typecheck + test + kịch bản + SO ẢNH. Commit.

---

## Task 4: Thanh điều hướng dọc (VIỆC LỚN NHẤT — chờ ADR-0015 accepted)

**CHẶN:** không bắt đầu khi `docs/adr/ADR-0015-khung-dieu-huong-doc.md` còn `proposed`.

**Files:** Modify `web/shell.ts`, `public/app.css`, `web/icons.ts`; đọc (không sửa) 12 tệp HTML để xác nhận không trang nào giả định `#topbar` có `nav.topnav`.

**Interfaces:** `initShell()` giữ nguyên chữ ký và giá trị trả về — 12 trang gọi nó, không được đổi.

- [ ] **Step 1: Thêm 4 icon còn thiếu** vào `web/icons.ts` (`contact-card`, `pin`, `history`, `chat`) — copy đúng `path`/`circle`/`rect` từ mockup dòng ~56–100, theo khuôn `SHAPES` đã có.

- [ ] **Step 2: Token mới** ở `:root` nhóm "Riêng của Tour Đảo Booking":
```css
--w-sidebar: 236px;  /* thanh điều hướng dọc ở máy tính (ADR-0015) */
```

- [ ] **Step 3: Dựng thanh bên trong `web/shell.ts`** — hàm mới `sidebar(admin, office, canCreate, path, staff)` trả `<nav id="sidebar">`. Cấu trúc: đầu (logo + tên app) → 3 nhóm → chân (avatar + tên + vai).
```ts
interface NavItem { href: string; label: string; icon: IconName; badge?: () => Promise<number>; active: (p: string) => boolean }
interface NavGroup { title: string; items: NavItem[] }
```
Mục nào hiện cho ai: giữ ĐÚNG luật hiện có (`office`, `admin`, `canCreate`). **Nhóm rỗng thì ẩn cả tiêu đề nhóm.**
Huy hiệu: chỉ gắn khi có nguồn thật (Góp ý đã có `feedbackBadge()`); mục nào chưa có số → không vẽ (Quyết định trình bày #5).
Avatar: chữ cái đầu của `staff.fullName` (dùng lại quy ước lấy tên ở `web/home.ts` nếu đã có).

- [ ] **Step 4: `#topbar` thành thanh công việc** — bỏ `nav.topnav`, còn: breadcrumb tên trang (`data-title`), ô tìm kiếm (Enter → `/?q=…`, Task 5 đổi sang `/orders?q=…`), nút "Lập đơn mới" (chỉ khi `canCreate`).

- [ ] **Step 5: CSS bố cục** (sau mốc PWA, chỉ token):
```css
@media (min-width: 900px) {
  body.has-sidebar { display: grid; grid-template-columns: var(--w-sidebar) minmax(0, 1fr); min-height: 100vh; }
  #sidebar { grid-row: 1 / -1; background: var(--c-primary-strong); display: flex; flex-direction: column; }
  body.has-sidebar #topbar { grid-column: 2; }
  body.has-sidebar main { grid-column: 2; max-width: none; }
}
@media (max-width: 899px) { #sidebar { display: none; } }
```
**Giữ DOM phẳng**: `#sidebar`, `#topbar`, `main` là ba con trực tiếp của `body`; ở <900px `#sidebar` ẩn, hai cái kia xếp dọc như cũ — thứ tự đọc điện thoại KHÔNG đổi (bài học Đợt C).

- [ ] **Step 6: Kiểm 12 trang** — mở từng trang ở 1040px và 390px, không tràn ngang, nội dung không bị thanh bên che. Ghi bảng kết quả vào báo cáo.

- [ ] **Step 7: Chạy LẠI TOÀN BỘ kịch bản Chrome** (7 bộ: `a2-smoke-*` ×3, `v1-*` ×4 — tra bảng `web/CLAUDE.md`), tất cả phải thoát mã 0.

- [ ] **Step 8: SO ẢNH BẰNG MẮT** với mockup. Commit.
```bash
git add web/shell.ts public/app.css web/icons.ts
git commit -m "Đợt D Task 4: thanh điều hướng dọc ở máy tính (ADR-0015)"
```

---

## Task 5: Đổi trang mặc định (chờ ADR-0015 accepted)

**Thứ tự bắt buộc: sửa kịch bản TRƯỚC, đổi tên tệp SAU** — để phân biệt "kịch bản hỏng do đổi địa chỉ" với "trang thật hỏng".

**Files:** `public/index.html` ↔ `public/home.html` (đổi tên), `web/shell.ts`, `web/home.ts`, `src/shared/sw-policy.ts`, `package.json`, 11 kịch bản Chrome.

- [ ] **Step 1: Sửa 11 kịch bản Chrome** mở `/` để vào Đơn hàng → `/orders` (danh sách đầy đủ ở đặc tả §4 mục 4). Chạy từng bộ, xác nhận **vẫn đỏ** (vì `/orders` chưa tồn tại) — đó là bằng chứng kịch bản thật sự kiểm địa chỉ.

- [ ] **Step 2: Đổi tên tệp** — `git mv public/index.html public/orders.html`, `git mv public/home.html public/index.html`. Tạo `public/home.html` mới chỉ chứa chuyển hướng về `/`.

- [ ] **Step 3: Sửa `src/shared/sw-policy.ts`** — `PAGES` thêm `/orders`; `PRECACHE` thêm `/js/home.js`.

- [ ] **Step 4: Sửa mọi liên kết** — `web/shell.ts` (`href="/"` trỏ Đơn hàng → `/orders`, hàm `active`), `web/home.ts` (3 ô số liệu + "Xem tất cả"), ô tìm kiếm ở `#topbar`.

- [ ] **Step 5: Kiểm `package.json`** — script `build:web` dựng `web/orders.ts` → `public/js/orders.js`: **không đổi** (tên tệp TS không đổi, chỉ tệp HTML đổi).

- [ ] **Step 6: Chạy lại 11 kịch bản** — nay phải XANH. Chạy `npm run test:e2e -- pwa` (đối chiếu `PAGES` với tệp HTML thật).

- [ ] **Step 7: Kiểm tay 3 địa chỉ:** `/` ra Trang chủ, `/orders` ra Đơn hàng, `/home` chuyển về `/`. Commit.
```bash
git add -A
git commit -m "Đợt D Task 5: Trang chủ thành trang mặc định, Đơn hàng dời sang /orders"
```

---

## Task 6: Kịch bản Chrome cập nhật + bằng chứng

- [ ] **Step 1:** Cập nhật `trang-chu-smoke.mjs`: thêm bước kiểm thanh bên (hiện ở 1040, ẩn ở 390), kiểm lưới 2×2 điện thoại đủ 4 ô, kiểm biểu đồ 7 cột, kiểm "Cần xem lại" (nếu làm Task 3).
- [ ] **Step 2:** Chụp lại ảnh bằng chứng ở cả 2 khổ, cập nhật `docs/evidence/2026-09-23-trang-chu-moi/README.md`.
- [ ] **Step 3: P16 — chứng minh kịch bản bắt lỗi thật:** cố ý phá một thứ (ví dụ ẩn thanh bên ở 1040) → đỏ đúng chỗ → hoàn nguyên → xanh. Dán nguyên văn thông báo lỗi vào README.
- [ ] **Step 4:** Commit.

---

## Sau khi Task 6 xong (bắt buộc theo CLAUDE.md §3)

Việc lớn (đụng API + khung dùng chung 12 trang + PWA). Dispatch subagent kiểm độc lập cho TỪNG Task, rồi một lượt kiểm gộp toàn cục. Đặc biệt kiểm:
- **So ảnh kết quả với ảnh mockup bằng mắt, từng khối** — đây là điều lượt trước bỏ sót và là nguyên nhân phải làm lại.
- Thanh bên: mục nào hiện cho ai có đúng bản đồ quyền không (SALES không thấy nhóm Quản trị; FIELD/PARTNER không thấy gì ngoài Tôi).
- 12 trang không trang nào vỡ ở 1040px và 390px, không tràn ngang.
- `/` , `/orders`, `/home` đúng đích; 11 kịch bản Chrome xanh.
- Tiền trong biểu đồ dùng số hiện hành sau điều chỉnh.
- Huy hiệu số đếm: có số thật hoặc không vẽ — không có số giả.
