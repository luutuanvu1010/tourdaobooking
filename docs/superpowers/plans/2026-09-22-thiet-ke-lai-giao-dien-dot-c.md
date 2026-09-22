# Thiết kế lại giao diện — Đợt C (Đăng nhập, Tôi, Góp ý) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle 3 trang đơn lẻ cuối cùng trong 11 trang: Đăng nhập (`/login`), Tôi (`/account`), Góp ý (`/feedback`). Rủi ro thấp nhất trong toàn bộ việc thiết kế lại (theo đánh giá ở tài liệu bàn giao), làm sau cùng.

**Architecture:** Không đổi thành phần dùng chung (`web/shell.ts`, `web/maintenance-screen.ts`, `web/dom.ts`). Mỗi trang chỉ đổi cách page-level trình bày + thêm bố cục 2 cột ở máy tính (≥900px) cho 2 trong 3 trang (Tôi, Góp ý) — Đăng nhập thêm cột thương hiệu ở máy tính.

**Tech Stack:** TypeScript thuần, `h()`, CSS token. Không thêm dependency.

**Spec:** `docs/superpowers/specs/2026-09-22-thiet-ke-lai-giao-dien-dot-c.md` (đặc tả con) + `docs/superpowers/specs/2026-09-22-thiet-ke-lai-giao-dien-design.md` §4-§6 (đặc tả gốc, thẩm quyền cao hơn nếu lệch).

## Global Constraints

- Tiếng Việt có dấu đầy đủ; không lộ chữ Anh.
- Không `innerHTML`; mọi DOM dựng bằng `h()`.
- CSS sau mốc PWA: chỉ token, không hex/px cứng (trừ đúng `1px`).
- KHÔNG đổi logic nghiệp vụ: đăng nhập/Turnstile, đổi PIN, bật/tắt bảo trì, "Việc của tôi" (sửa số khách/huỷ đơn của FIELD), tab/lọc/luồng Góp ý — chỉ đổi trình bày. Ngoại lệ DUY NHẤT được phép: đổi điều kiện ẩn/hiện `#list-card` ở trang Góp ý theo khổ màn hình (§2 đặc tả con) — đây là hành vi hiển thị, không phải logic nghiệp vụ/dữ liệu.
- KHÔNG sửa `src/modules/*` (mã server), không đổi API.
- Trước khi viết CSS/DOM: đọc lại đúng cấu trúc THẬT của tệp đang sửa — các đoạn mã mẫu dưới đây dựa trên cách đọc mockup + đọc mã thật lúc lập kế hoạch, nhưng CHƯA phải mã cuối; tên class/id có thể cần khớp lại nếu mã thật đã đổi từ lúc đó.
- Không có kịch bản Chrome sẵn cho `account.ts`/`feedback.ts` (bảng ở `web/CLAUDE.md`) — Task 4 tạo kịch bản mới `dot-c-smoke.mjs` (theo mẫu `docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs`, dùng lại `startEnv()`/`ACCOUNTS`/`ok` từ `docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`, KHÔNG viết lại cơ chế CDP).

## Quyết định trình bày (đã tự quyết, không cần hỏi lại — ghi lại theo P8)

1. **Copy khẩu hiệu cột thương hiệu (Đăng nhập)**: dùng nguyên văn từ mockup ("Lập đơn, chốt chỗ, theo chuyến trong một app." + 3 gạch đầu dòng) — là tài sản thiết kế đã duyệt, không tự viết lại.
2. **Vị trí khối "Việc của tôi" (Tôi)**: đặt CỘT TRÁI, ngay sau thẻ hồ sơ, trước danh sách liên kết — mockup không có khối này (tính năng thêm sau khi vẽ mockup), tự quyết vị trí ít xáo trộn nhất.
3. **Hiện đồng thời danh sách + luồng ở Góp ý (≥900px)**: dùng lại kỹ thuật `wide()` (đọc `matchMedia` runtime) — đã có tiền lệ ở `web/order-form.ts:28` (`const wide = (): boolean => window.matchMedia("(min-width: 960px)").matches;`), Đợt C dùng mốc 900px (mốc chung toàn app, không phải mốc riêng 960px của form đơn).
4. **Bố cục 2 cột trang Tôi**: `grid-template-columns: 1fr 1fr` (2 cột BẰNG NHAU, khác kiểu `1fr var(--w-side)` của trang Chi tiết đơn) — đúng theo mockup, không có cột "phụ" nào ở trang này.
5. **`.narrow` (max-width 420px) hiện đang bọc từng khối** (`#me`, `#links`, `#maintenance`, `#pin-form`): ở ≥900px sẽ BỎ giới hạn này (để khối giãn theo cột grid), giữ nguyên dưới 900px. Không xoá class `.narrow` khỏi HTML (vẫn cần ở khổ hẹp) — chỉ thêm rule ghi đè trong `@media (min-width: 900px)`.

## Task 1: Đăng nhập — thêm cột thương hiệu ở máy tính

**Files:**
- Modify: `public/login.html`, `web/login.ts` (nếu cần thêm phần tử), `public/app.css`

**Interfaces:** Không đổi interface nào — chỉ thêm DOM/CSS trình bày. Form/Turnstile/banner bảo trì giữ nguyên id (`login-form`, `error`, `phone`, `pin`, `turnstile-widget`, `turnstile-retry`, `submit`, `maintenance-banner`, `maintenance-text`, `release`, `company`) — KHÔNG đổi các id này (mã `web/login.ts` dùng `byId()` tra theo đúng id).

- [x] **Step 1: Đọc lại `public/login.html` + `web/login.ts` thật, xác nhận cấu trúc hiện có** (đã đọc lúc lập kế hoạch — xem lại mục 2 đặc tả con). Xác nhận `<main class="login">` bọc trực tiếp: logo, h1, banner bảo trì, form, footer.

- [x] **Step 2: Thêm CSS cột thương hiệu vào `public/app.css`, SAU dấu mốc `/* ---------- app iPhone (PWA)` (dòng 203)** — mọi rule mới đặt sau mốc này bắt buộc chỉ dùng token, không hex/px/rem cứng (trừ đúng `1px`), theo đúng luật đã áp dụng cho `.order-summary-band`/`.order-layout` của Đợt B. Đặt cạnh khối đó (cuối tệp):

```css
@media (min-width: 900px) {
  body.login-page main.login { display: grid; grid-template-columns: 1fr 1fr; align-items: stretch; max-width: var(--w-login-wide); margin: 6vh auto 0; gap: 0; padding: 0; background: var(--c-on-dark); border-radius: var(--radius-lg); box-shadow: var(--shadow-overlay); overflow: hidden; }
  .login-brand { display: flex; flex-direction: column; justify-content: space-between; gap: var(--s6); padding: var(--s7); color: var(--c-on-dark); background: linear-gradient(160deg, var(--c-primary), var(--c-primary-strong)); }
  .login-brand-head { display: flex; align-items: center; gap: var(--s3); }
  .login-brand-tagline { font-family: var(--font-display); font-weight: 800; font-size: var(--fs-hero); line-height: 1.25; }
  .login-brand-points { display: flex; flex-direction: column; gap: var(--s3); font-size: var(--fs-ui); line-height: 1.6; opacity: .9; }
  .login-brand-foot { font-size: var(--fs-label); opacity: .8; }
  .login-form-col { display: flex; flex-direction: column; justify-content: center; padding: var(--s7); }
  .login-form-col .card { box-shadow: none; padding: 0; margin: 0; }
}
```

**Token đối chiếu thật (đã kiểm lúc lập kế hoạch):** `--s3/--s6/--s7`, `--shadow-overlay`, `--c-on-dark`, `--radius-lg`, `--font-display`, `--fs-label`, `--fs-ui` (16px) đều CÓ SẴN trong `:root`. HAI token KHÔNG có sẵn, cần thêm mới vào nhóm "Riêng của Tour Đảo Booking" (đúng luật `web/CLAUDE.md` — kích thước mới không có token gần đúng thì tự thêm, không cần hỏi chủ vì không phải màu/chữ thương hiệu):
- `--fs-hero` — cỡ chữ khẩu hiệu (mockup 40px, không có token nào gần — `--fs-counter` chỉ 20px). Đề xuất `28px` (lớn hơn `--fs-counter` rõ rệt nhưng không quá khổ ở cột 1/2 màn hình máy tính, tự cân chỉnh lúc thi công nếu nhìn lệch).
- `--w-login-wide` — bề rộng khối 2 cột ở máy tính (mockup 1280px cho khung demo, nhưng nội dung thật content tối đa 1200px theo `--w-main` đã chốt — đề xuất dùng lại `calc(var(--w-main) - var(--s4))` hoặc một hằng số riêng `1100px`, tự quyết lúc thi công, không vượt `--w-main`).
Thêm 2 token này vào đúng nhóm "Riêng của Tour Đảo Booking" ở đầu `app.css` (cạnh `--w-narrow`/`--logo-login`), không đặt lẫn nhóm token sao chép từ tourdaovn.

- [x] **Step 3: Thêm cột thương hiệu vào `public/login.html`**, bọc nội dung hiện có (logo/h1/banner/form/footer) vào `<div class="login-form-col">`, thêm `<div class="login-brand">` TRƯỚC nó (chỉ hiện ở ≥900px qua CSS, không cần `hidden` — ẩn bằng `display: none` mặc định dưới 900px nếu cần, hoặc để nguyên vì ở <900px `main.login` không phải grid nên cột thương hiệu sẽ tự xếp phía trên form — TỰ QUYẾT khi thi công: nếu cột thương hiệu hiện ra ở điện thoại làm xấu bố cục, thêm `@media (max-width: 899px) { .login-brand { display: none; } }`):

```html
<main class="login">
  <div class="login-brand">
    <div class="login-brand-head"><img src="/icons/icon-192.png" alt="" width="40" height="40"><span>Tour Đảo Booking</span></div>
    <div class="login-brand-tagline">Lập đơn, chốt chỗ, theo chuyến trong một app.</div>
    <div class="login-brand-points">
      <div>Đơn hàng hiện đủ giờ đón, khách, tiền còn lại.</div>
      <div>Ảnh xác nhận gửi khách qua Zalo ngay từ đơn.</div>
      <div>Cài lên iPhone như một app, dùng được ngoài hiện trường.</div>
    </div>
    <div class="login-brand-foot">Công ty TNHH Tour Đảo · Nha Trang, Khánh Hoà</div>
  </div>
  <div class="login-form-col">
    <!-- nội dung hiện có: logo, h1, banner bảo trì, form, footer -->
  </div>
</main>
```

Tên/địa chỉ công ty trong `.login-brand-foot`: dùng ĐÚNG chữ tĩnh của mockup (không gọi thêm API) — khối `#company` ở footer hiện có đã tự lấy dữ liệu thật từ `GET /api/company`, không trùng lặp việc.

- [x] **Step 4: Build + kiểm kiểu.** `npm run build:web && npm run typecheck` — 0 lỗi.

- [x] **Step 5: Chạy `v1-dang-nhap.mjs`** (`docs/evidence/2026-09-21-v1-0/kich-ban/`, cần mạng, ~9 phút) — 15 bước thoát mã 0. Sửa CSS/DOM nếu bố cục mới làm hỏng bước nào (đặc biệt vị trí banner bảo trì, widget Turnstile).

- [x] **Step 6: `npm test`.**

- [x] **Step 7: Commit.**

```bash
git add public/login.html web/login.ts public/app.css
git commit -m "Đợt C: thêm cột thương hiệu cho trang Đăng nhập ở máy tính"
```

## Task 2: Tôi — bố cục 2 cột ở máy tính

**Files:**
- Modify: `public/account.html`, `web/account.ts` (nếu cần đổi thứ tự/wrap), `public/app.css`

**Interfaces:** Không đổi interface. Giữ nguyên mọi id (`me`, `myjobs`, `links`, `maintenance`, `maintenance-heading`, `pin-form`, `error`, `ok`, `current`, `new`, `confirm`) — `web/account.ts` tra bằng `byId()`.

- [x] **Step 1: Đọc lại `public/account.html` thật**, xác nhận thứ tự section: `#me` → `#myjobs` → `#links` → `#maintenance` → `#pin-form` (tất cả con trực tiếp của `<main>`).

- [x] **Step 2: Bọc 2 cột trong `public/account.html`** — cột trái: `#me`, `#myjobs`, `#links`, `#pin-form`; cột phải: `#maintenance`. Bọc bằng 2 `<div>`:

```html
<main>
  <h1>Tôi</h1>
  <div id="error" class="alert" role="alert" hidden></div>
  <div id="ok" class="alert ok" hidden>...</div>
  <div class="account-layout">
    <div class="account-main">
      <section id="me" class="card"></section>
      <section id="myjobs" hidden></section>
      <section id="links" class="card list-card"></section>
      <form id="pin-form" class="card" autocomplete="off">...</form>
    </div>
    <div class="account-side">
      <section id="maintenance" class="card" aria-labelledby="maintenance-heading" hidden></section>
    </div>
  </div>
</main>
```

(Bỏ class `narrow` khỏi 4 section trên — thay bằng rule CSS ở Step 3 để chỉ hẹp dưới 900px, KHÔNG hẹp mãi.)

- [x] **Step 3: Thêm CSS vào `public/app.css`** (cạnh khối `.narrow` dòng ~205):

```css
.account-layout { display: block; }
.account-main, .account-side { max-width: var(--w-narrow); }
@media (min-width: 900px) {
  .account-layout { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s5); align-items: start; }
  .account-main, .account-side { max-width: none; }
}
```

- [x] **Step 4: Build + kiểm kiểu.** `npm run build:web && npm run typecheck` — 0 lỗi.

- [x] **Step 5: Chạy `v1-bao-tri.mjs`** (`docs/evidence/2026-09-21-v1-0/kich-ban/`, không cần mạng ngoài) — kiểm phần bảo trì (banner, khối xác nhận 2 bước) vẫn đúng sau khi đổi vị trí `#maintenance` sang cột phải. Chưa đủ cho phần hồ sơ/PIN/liên kết/Việc của tôi — Task 4 (`dot-c-smoke.mjs`) phủ thêm phần này.

- [x] **Step 6: `npm test`.**

- [x] **Step 7: Commit.**

```bash
git add public/account.html web/account.ts public/app.css
git commit -m "Đợt C: bố cục 2 cột cho trang Tôi ở máy tính"
```

## Task 3: Góp ý — bố cục 2 cột + hiện đồng thời danh sách/luồng ở máy tính

**Files:**
- Modify: `public/feedback.html`, `web/feedback.ts`, `public/app.css`

**Interfaces:** Không đổi interface API. Thêm 1 hàm `wide()` cục bộ trong `web/feedback.ts` (mẫu ở `web/order-form.ts:28`, mốc 900px thay vì 960px). Giữ nguyên id (`new-card`, `list-card`, `thread`, `tabs`, `summary`, `list`, `error`).

- [x] **Step 1: Đọc lại `web/feedback.ts` thật**, xác nhận `loadThread()` đang đặt `byId("list-card").hidden = true` (dòng ~131) và không có chỗ nào phục hồi `hidden = false` khi rời luồng (điều hướng bằng `location` reload lại trang, không phải SPA).

- [x] **Step 2: Sửa `loadThread()` trong `web/feedback.ts`** — chỉ ẩn `list-card` khi KHÔNG đủ rộng:

```ts
const wide = (): boolean => window.matchMedia("(min-width: 900px)").matches;
// trong loadThread(id):
byId("list-card").hidden = !wide();
```

Và trong nhánh không có `id` (đầu tệp, dòng ~179-184): đảm bảo `list-card.hidden` được đặt lại `false` khi vào lại danh sách (thường đã đúng vì mặc định HTML không có `hidden`, nhưng nếu người dùng điều hướng qua lại trong cùng phiên SPA thì kiểm kỹ — trang này KHÔNG phải SPA, mỗi lần đổi `id`/không có `id` là load trang mới, nên trạng thái `hidden` luôn khởi tạo lại từ HTML gốc; xác nhận điều này đúng khi đọc lại mã, không tự đoán).

- [x] **Step 3: Bọc 2 cột trong `public/feedback.html`**:

```html
<main>
  <h1>Góp ý / Báo lỗi</h1>
  <p class="muted">...</p>
  <div id="error" class="alert" role="alert" hidden></div>
  <section id="new-card" class="card" hidden>...</section>
  <div class="feedback-layout">
    <section id="list-card" class="card">...</section>
    <section id="thread" class="card" hidden></section>
  </div>
</main>
```

- [x] **Step 4: Thêm CSS vào `public/app.css`, SAU dấu mốc PWA (dòng 203)** — chỉ dùng token có sẵn (`--s5`), không cần thêm token mới:

```css
.feedback-layout { display: block; }
@media (min-width: 900px) {
  .feedback-layout { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s5); align-items: start; }
}
```

- [x] **Step 5: Build + kiểm kiểu.** `npm run build:web && npm run typecheck` — 0 lỗi.

- [x] **Step 6: Chạy `v1-bao-tri.mjs`** (phủ khung chung `shell.ts`/`app.css` — không phủ riêng luồng góp ý). Task 4 (`dot-c-smoke.mjs`) phủ hành vi mới (hiện đồng thời ở ≥900px, ẩn ở <900px).

- [x] **Step 7: `npm test`.**

- [x] **Step 8: Commit.**

```bash
git add public/feedback.html web/feedback.ts public/app.css
git commit -m "Đợt C: bố cục 2 cột cho trang Góp ý, hiện đồng thời danh sách+luồng ở máy tính"
```

## Task 4: Kịch bản Chrome mới `dot-c-smoke.mjs`

**Files:**
- Add: `docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/kich-ban/dot-c-smoke.mjs`

**Mục đích:** `account.ts`/`feedback.ts` chưa có kịch bản riêng (bảng `web/CLAUDE.md`); Task 1-3 chỉ chạy được `v1-dang-nhap.mjs`/`v1-bao-tri.mjs` (phủ phần bảo trì/đăng nhập, KHÔNG phủ bố cục 2 cột mới). Kịch bản này lấp khoảng đó.

- [x] **Step 1: Copy mẫu từ `docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs`** — dùng lại `startEnv()`/`ACCOUNTS`/`ok` từ `docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs` (KHÔNG viết lại cơ chế CDP), 2 khổ `DESK = {width:1040,...}` / `MOB = {width:390,...}`.

- [x] **Step 2: Viết kịch bản kiểm 3 trang:**
  - **Đăng nhập** (`/login`, không cần đăng nhập trước): khổ DESK → `.login-brand` hiển thị (`display !== "none"`), `.login-form-col` chứa form; khổ MOB → `.login-brand` ẩn HOẶC nằm trên form (tự quyết theo Task 1 Step 3 đã làm), form vẫn dùng được (input `#phone`/`#pin` có mặt).
  - **Tôi** (`/account`, đăng nhập bằng `ACCOUNTS.admin` để có đủ mọi khối kể cả bảo trì): khổ DESK → `.account-layout` là `display: grid` (đọc `getComputedStyle`), `#maintenance` nằm bên trong `.account-side`; khổ MOB → `.account-layout` là `display: block`, mọi khối xếp dọc, không tràn ngang.
  - **Góp ý** (`/feedback`, đăng nhập bằng `ACCOUNTS.admin` để thấy tab "Hàng đợi"; tạo trước 1 yêu cầu qua `POST /api/feedback` để có `id` mở luồng): mở `/feedback?id=<id>` ở khổ DESK → CẢ `#list-card` VÀ `#thread` đều `hidden === false`/`display !== "none"` (đọc thuộc tính `hidden` hoặc `getComputedStyle`); cùng URL ở khổ MOB → `#list-card` phải ẩn (`hidden === true`), chỉ `#thread` hiện. Đây là bằng chứng THẬT cho hành vi mới ở Task 3 Step 2 — không được bỏ qua.
  - Mỗi trang × mỗi khổ: chạy axe (`AXE`), assert 0 vi phạm nghiêm trọng (theo đúng ngưỡng các kịch bản trước đã dùng — đọc `dot-a-smoke.mjs` để lấy đúng cách gọi/ngưỡng).
  - Ghi ảnh vào `docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/anh/*.png` (3 trang × 2 khổ = 6 ảnh tối thiểu, thêm ảnh Góp ý mở luồng nếu muốn).

- [x] **Step 3: Chạy kịch bản**, xác nhận thoát mã 0. Sửa Task 1-3 nếu kịch bản phát hiện sai lệch — không sửa kịch bản để né lỗi thật.

- [x] **Step 4: Commit.**

```bash
git add docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/
git commit -m "Đợt C: thêm kịch bản Chrome dot-c-smoke.mjs phủ 3 trang Đăng nhập/Tôi/Góp ý"
```

---

## Sau khi Task 4 xong (bắt buộc theo CLAUDE.md §3)

Việc lớn (đụng giao diện 3 trang). Dispatch subagent kiểm độc lập cho TỪNG Task như các đợt trước, rồi một lượt kiểm toàn cục cho cả Đợt C trước khi báo "đạt" với chủ dự án. Đặc biệt kiểm:
- Widget Turnstile ở Đăng nhập vẫn dựng đúng vị trí, không bị cột thương hiệu che/đẩy lệch ở khổ hẹp giáp ranh 900px.
- Trang Tôi: tài khoản KHÔNG phải ADMIN (không thấy khối bảo trì) — cột phải trống hẳn hay có gì khác hiện lên thế chỗ (tự quyết lúc thi công nếu chưa tính tới: có thể để cột phải trống, không bắt buộc điền gì).
- Trang Góp ý: tài khoản thường (không phải admin, không thấy tab "Hàng đợi") vẫn xem được `?id=` của chính mình đúng bố cục 2 cột.
- Không trang nào trong 3 trang bị vỡ ở khổ giáp ranh 899px/900px (biên chính xác của mốc).
