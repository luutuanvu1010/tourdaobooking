# Thiết kế lại giao diện — Bước 2 Đợt B (Chi tiết đơn + Lập đơn) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle 2 trang phức tạp nhất app: "Chi tiết đơn" (`/order`, đổi CẤU TRÚC — thêm dải tóm tắt + bố cục 2 cột, chủ dự án đã duyệt) và "Lập đơn" (`/order-form`, giữ nguyên cơ chế 2 cột sẵn có, chỉ đổi cách trình bày + dời nút hành động vào cột phải).

**Architecture:** KHÔNG đổi các thành phần dùng chung bên dưới (`service-card.ts`, `counter.ts`, `money-input.ts`, `trip-sheet.ts`, `trip-fields.ts`, `order-services.ts`, `confirmation-dialog.ts`, `handler-sheet.ts`, `booker-picker.ts`, `booker-sheet.ts`) — chỉ đổi CÁCH page-level lắp ráp/trình bày chúng. `order.ts` thêm 1 hàm dựng "dải tóm tắt" mới + bọc nội dung hiện có vào lưới 2 cột CSS. `order-form.ts` dời 2 nút hành động từ thanh ngang cuối form vào cột phải, thêm số tiền vào thanh dính đáy điện thoại.

**Tech Stack:** TypeScript thuần, `h()`, CSS token. Không thêm dependency.

**Spec:** `docs/superpowers/specs/2026-09-22-thiet-ke-lai-giao-dien-design.md` §7-§8. Chủ dự án đã duyệt riêng: làm đúng bản thiết kế mới cho Chi tiết đơn (kể cả đổi cấu trúc bố cục, không chỉ đổi màu).

## Global Constraints

- Tiếng Việt có dấu đầy đủ; không lộ chữ Anh.
- Không `innerHTML`; mọi DOM dựng bằng `h()`.
- CSS sau mốc PWA: chỉ token, không hex/px cứng (trừ đúng `1px`).
- KHÔNG đổi logic nghiệp vụ: `orderActions()`, khoá form sau xác nhận, validate, luồng lưu/API — chỉ đổi trình bày.
- KHÔNG sửa `src/modules/orders/*` (mã server) — nếu phát sinh nhu cầu đổi API, DỪNG lại hỏi chủ (theo `src/architecture.test.ts`: module `orders` còn ở nhóm LEGACY, "chuyển STRICT khi được chạm ở N2" — việc thuần giao diện này không kích hoạt điều kiện đó, nhưng nếu Task nào phát hiện cần sửa server thì đó là dấu hiệu đang lấn phạm vi, phải dừng).
- Sửa `order.ts`/`order-form.ts`/`trip-sheet.ts` → chạy đủ CẢ BA kịch bản `a2-smoke-order.mjs`, `a2-smoke-form.mjs`, `a2-smoke-sheet.mjs` (`docs/evidence/2026-09-20-a2/kich-ban/`) + `v1-nguoi-phu-trach.mjs` (đụng khối người phụ trách).

## Quyết định trình bày (đã tự quyết, không cần hỏi lại — ghi lại theo P8)

Mockup dùng token riêng của nó (`--c-band-muted`, `--shadow-lg`...) không có trong `app.css` thật, và có 2 chỗ TỰ MÂU THUẪN NỘI BỘ giữa khung desktop/mobile của chính mockup — đã tự quyết theo hướng AN TOÀN (khớp quy ước đã có trong app hiện tại, không bịa token mới):

1. **Chữ mờ trên nền `--c-primary`** (nhãn "MÃ ĐƠN", "ĐÓN"...): dùng `opacity: .72` trên chữ trắng, đúng quy ước đã có sẵn (`.brand span { opacity: .8 }` ở `#topbar`) — KHÔNG bịa token `--c-band-muted`.
2. **Badge trạng thái trong dải tóm tắt**: mockup desktop dùng cặp màu "cát" (sand) riêng, nhưng CHÍNH mockup mobile (cùng tệp, badge y hệt) lại dùng `--c-primary-soft`/`--c-primary` — hai bản trong cùng 1 tệp không khớp nhau. Quyết: dùng ĐÚNG class badge đã có sẵn trong app (`badge-draft`/`badge-confirmed`/`badge-cancelled`, đã có cách phối màu đúng cho từng trạng thái, kể cả tương phản trên nền tối cần kiểm) — không tạo bảng màu badge riêng cho dải tóm tắt.
3. **Số "Còn lại" trong dải tóm tắt**: mockup dùng màu cát (`--c-sand`) ở đây nhưng dùng màu san hô (`--c-accent`) ở khối Thanh toán CÙNG TRANG — không nhất quán. Quyết: dùng `--c-sand` (không phải `--c-accent`) CHỈ RIÊNG bên trong dải tóm tắt nền `--c-primary` (san hô #c0392b trên xanh biển sâu #0c4a6e tương phản kém hơn cát #f5a623) — nơi khác trên trang (khối Thanh toán, thẻ trên di động) vẫn dùng đúng quy ước `.money-due`/`.money-ok` đã có từ Bước 1. Ghi rõ: đây là NGOẠI LỆ có chủ đích cho đúng 1 vị trí (nền tối), không áp dụng nơi khác.
4. **3 cờ hiển thị của mockup Lập đơn** (`allowManual`, `showLimits`, `openTrip`): đều là hành vi ĐÃ CÓ SẴN trong `order-form.ts` thật (nút "+ Dịch vụ nhập tay" luôn hiện, số đếm giới hạn luôn hiện, khối Thông tin chuyến trong `service-card.ts` dùng `<details>` — mặc định mở hay đóng tuỳ mã hiện tại, không đổi). KHÔNG cần làm gì thêm cho 3 cờ này — chỉ là cách mockup mô phỏng trạng thái, không phải yêu cầu đổi hành vi.
5. **Nút Lưu/Quay lại dời vào cột phải** (Lập đơn): đây là thay đổi CSS/DOM nhỏ (di chuyển vị trí phần tử `.form-actions` trong cây DOM, không đổi hành vi submit) — không cần hỏi.

## Task 1: Dải tóm tắt + bố cục 2 cột cho trang Chi tiết đơn

**Files:**
- Modify: `web/order.ts`, `public/app.css`

**Interfaces:**
- Produces: hàm `summaryBand(order, trip): HTMLElement` mới trong `web/order.ts`.
- Consumes: `order.status`, `order.customerName`, `order.customerPhone`, `order.total/depositAmount/remainingAmount`, thông tin chuyến của DỊCH VỤ ĐẦU TIÊN (`order.services[0]`, giống quy ước "dịch vụ đầu quyết định trip" đã dùng ở Bước 1 cho trang Đơn hàng — áp dụng lại đúng quy ước đó ở đây cho nhất quán), `PAX_ORDER`/`paxCounts()` đã có ở `web/format.ts` (Bước 1) để tính số khách TỔNG các dịch vụ.

- [x] **Step 1: Thêm CSS dải tóm tắt + lưới 2 cột**

Thêm vào `public/app.css`, cạnh khối CSS trang đơn hiện có (tìm bằng nội dung, ví dụ gần `.lock-note`):

```css
.order-summary-band { background: var(--c-primary); border-radius: var(--radius-md); padding: var(--s5) var(--s6); display: flex; align-items: center; gap: var(--s7); color: #fff; }
.order-summary-band .label { font-size: var(--fs-badge); font-weight: 700; letter-spacing: .08em; opacity: .72; }
.order-summary-band .value { font-family: var(--font-display); font-weight: 700; font-size: var(--fs-title); color: #fff; }
.order-summary-band .value.due { color: var(--c-sand); }
.order-summary-band .sub { font-size: var(--fs-label); opacity: .72; }
.order-summary-band .sep { width: 1px; height: 64px; background: rgba(255,255,255,.18); }
.order-summary-band .grid4 { display: grid; grid-template-columns: repeat(4, auto); gap: var(--s5) var(--s6); flex: 1; }
.order-layout { display: grid; grid-template-columns: 1fr 340px; gap: var(--s5); align-items: start; }
.order-layout .side { position: sticky; top: var(--s4); }
@media (max-width: 899px) {
  .order-layout { display: block; }
  .order-summary-band { flex-direction: column; align-items: stretch; gap: var(--s3); padding: var(--s4); }
  .order-summary-band .sep { display: none; }
  .order-summary-band .grid4 { grid-template-columns: 1fr 1fr; }
}
```

(Mốc 900px nhất quán với mốc bảng→thẻ Đợt A — trang này không có bảng, nhưng dùng lại đúng mốc chuyển 1-cột đã thống nhất cho toàn app, tránh thêm mốc thứ ba.)

- [x] **Step 2: Thêm hàm `summaryBand()` trong `web/order.ts`**

Thêm hàm mới, TRƯỚC hàm `render()`:

```ts
function summaryBand(order: Order): HTMLElement {
  const firstSvc = order.services[0];
  const when = firstSvc?.departDate ? `${dayMonth(firstSvc.departDate)}${firstSvc.pickupTime ? ` · ${firstSvc.pickupTime}` : ""}` : "Chưa có ngày đón";
  const pax = paxCounts(
    order.services.reduce<PaxCounts>(
      (sum, s) => ({ adult: sum.adult + s.pax.adult, child: sum.child + s.pax.child, senior: sum.senior + s.pax.senior, infant: sum.infant + s.pax.infant }),
      { adult: 0, child: 0, senior: 0, infant: 0 },
    ),
  );
  const firstName = order.services[0]?.name ?? "—";
  const stat = (label: string, value: string, sub?: string, due = false) =>
    h("div", null, h("div", { class: "label" }, label), h("div", { class: due ? "value due" : "value" }, value), sub && h("div", { class: "sub" }, sub));
  return h(
    "div",
    { class: "order-summary-band" },
    h("div", null, h("div", { class: "label" }, "MÃ ĐƠN"), h("div", { class: "value" }, order.orderCode), h("span", { class: `badge badge-${order.status}` }, STATUS_LABEL[order.status])),
    h("div", { class: "sep" }),
    h(
      "div",
      { class: "grid4" },
      stat("ĐÓN", when, firstSvc?.pickupPlace ?? undefined),
      stat("KHÁCH", order.customerName, order.customerPhone),
      stat("SỐ KHÁCH", pax || "—", firstName),
      stat("CÒN LẠI", vnd(order.remainingAmount), `Tổng ${vnd(order.total)} · đã cọc ${vnd(order.depositAmount)}`, order.remainingAmount > 0),
    ),
  );
}
```

*Ghi chú cho người thi công:* kiểu `Order`/`OrderServiceDto` thật có thể đặt tên trường khác chút so với đoạn mã trên (đây là suy đoán từ đọc `render()` hiện có, CHƯA đối chiếu type chính xác — bước đầu tiên khi cài đặt là đọc lại đúng interface `OrderDetailDto`/`OrderServiceDto` ở `src/shared/contracts.ts` qua `./api`, sửa tên trường cho khớp thật, đặc biệt `pickupPlace`/`departDate`/`pickupTime` nằm ở `TripInfoDto` — kiểm xem đó là field cấp `service` hay cần gọi hàm phụ). Import `dayMonth`, `paxCounts` từ `./format` (đã có sẵn từ Bước 1), `type PaxCounts` từ `./api` hoặc `../src/shared/order-lines` (kiểm đường nào đã dùng sẵn trong tệp).

- [x] **Step 3: Nối `summaryBand()` vào `render()` + bọc lưới 2 cột**

Trong hàm `render()`, thêm `summaryBand(order)` vào đầu danh sách children (ngay sau header mã đơn/badge hiện có, hoặc thay thế header đó nếu trùng lặp thông tin — TỰ QUYẾT khi đọc lại `render()` thật, tránh hiện trùng mã đơn 2 lần). Bọc phần thân còn lại (Người phụ trách → Khách hàng → Dịch vụ → Lịch sử) vào `h("div", { class: "order-layout" }, h("div", null, ...cácKhốiHiệnCó), h("div", { class: "side" }, khốiThanhToán))` — tách khối Thanh toán ra khỏi luồng chính, đặt vào `div.side`.

- [x] **Step 4: Build + kiểm kiểu**

Run: `npm run build:web && npm run typecheck`
Expected: 0 lỗi — sửa tên trường nếu Step 2 đoán sai kiểu.

- [x] **Step 5: Chạy đủ kịch bản Chrome**

Run 4 kịch bản (mẫu lệnh như Bước 1 Task 5 Step 8, `AXE_JS`/`CHROME_BIN`): `a2-smoke-order.mjs`, `a2-smoke-form.mjs`, `a2-smoke-sheet.mjs` (`docs/evidence/2026-09-20-a2/kich-ban/`), `v1-nguoi-phu-trach.mjs` (`docs/evidence/2026-09-21-v1-0/kich-ban/`).
Expected: cả 4 thoát mã 0. Sửa CSS/DOM nếu bố cục mới làm hỏng vị trí "Phụ trách: <tên>" mà kịch bản kiểm — không sửa kịch bản.

- [x] **Step 6: `npm test && npm run test:e2e -- pwa`**

Expected: xanh.

- [x] **Step 7: Commit**

```bash
git add web/order.ts public/app.css
git commit -m "Bước 2 Đợt B: thêm dải tóm tắt + bố cục 2 cột cho trang Chi tiết đơn"
```

## Task 2: Restyle trang Lập đơn — dời nút hành động vào cột phải

**Files:**
- Modify: `public/order-form.html`, `web/order-form.ts`, `public/app.css`

**Interfaces:**
- Không đổi interface nào — chỉ di chuyển vị trí DOM của `.form-actions` và thêm hiển thị số tiền vào thanh dính đáy.

- [x] **Step 1: Di chuyển `.form-actions` vào `.form-side` (nếu chưa đúng vị trí)**

Đọc `public/order-form.html` thật: nếu `.form-actions` (nút Lưu + Quay lại) đã là con của `.form-side` (cùng cấp với `.summary-card`), KHÔNG cần sửa HTML — chỉ cần CSS đổi từ thanh ngang thành 2 nút xếp dọc full-width ở khổ ≥900px. Nếu `.form-actions` đang là con TRỰC TIẾP của `<form>` (ngoài `.form-side`), di chuyển thẻ trong HTML vào bên trong `.form-side`, ngay sau `.summary-card`.

- [x] **Step 2: CSS — 2 nút xếp dọc ở máy tính, giữ nguyên thanh dính đáy ở điện thoại**

Tìm khối `@media (min-width: 960px)` hiện có (đã xác nhận: `.form-side .form-actions { position: static; padding: 0; background: none; border-top: 0; }` — CSS này đã sẵn sàng cho việc xếp dọc một phần). Thêm vào CÙNG khối:

```css
.form-side .form-actions { flex-direction: column; gap: var(--s3); }
.form-side .form-actions .btn { width: 100%; }
```

(Xác nhận `.form-actions` mặc định `display:flex` theo chiều ngang — nếu đúng vậy, `flex-direction: column` xếp 2 nút thành cột. Nếu `.form-actions` không phải flex container, tự điều chỉnh cho đúng ý mockup: 2 nút full-width xếp dọc.)

- [x] **Step 3: Thêm số tiền vào thanh dính đáy điện thoại**

Trong `public/order-form.html`, tìm phần tử tổng tiền hiện có trong `.summary-card` (Tổng cộng/Còn lại). Tìm khối `@media (max-width: 640px)` của `.form-actions` (đã biết: nền/viền trên/ẩn nút Quay lại). Thêm 2 dòng số tiền vào TRƯỚC nút Lưu trong `.form-actions`, dùng `web/order-form.ts` để đồng bộ giá trị (tái dùng biến tổng/còn lại đã tính trong `recompute()` — KHÔNG tính lại, chỉ hiển thị thêm ở một nơi khác):

```ts
// Trong recompute(), sau khi tính xong `total`/`remainingAmount` (đọc tên biến thật trong hàm), thêm:
const mobileTotal = document.getElementById("mobile-total");
const mobileDue = document.getElementById("mobile-due");
if (mobileTotal) mobileTotal.textContent = vnd(total);
if (mobileDue) mobileDue.textContent = vnd(remainingAmount);
```

Thêm 2 phần tử `<span id="mobile-total"></span>`/`<span id="mobile-due"></span>` vào đúng vị trí trong `.form-actions` ở `order-form.html`, có nhãn "Tổng cộng"/"Còn lại" cạnh (dùng `<div class="mobile-actions-summary">` bọc, ẨN Ở MÁY TÍNH bằng CSS `@media (min-width: 900px) { .mobile-actions-summary { display: none } }` vì cột phải desktop đã có card Tóm tắt riêng).

*Lưu ý:* đây là chi tiết cần đọc đúng tên biến thật trong `recompute()` (brief đoán tên `total`/`remainingAmount`, có thể lệch — người thi công tự đối chiếu mã thật trước khi cài).

- [x] **Step 4: Build + kiểm kiểu**

Run: `npm run build:web && npm run typecheck`

- [x] **Step 5: Chạy đủ kịch bản Chrome (giống Task 1 Step 5)**

Run 4 kịch bản: `a2-smoke-order.mjs`, `a2-smoke-form.mjs`, `a2-smoke-sheet.mjs`, `v1-nguoi-phu-trach.mjs`.
Expected: thoát mã 0 — đặc biệt xác nhận `wide()`/cuộn-tới-lỗi (đặc thù `order-form.ts` đã ghi trong recon) vẫn hoạt động đúng sau khi di chuyển `.form-actions`.

- [x] **Step 6: `npm test && npm run test:e2e -- pwa`**

- [x] **Step 7: Commit**

```bash
git add public/order-form.html web/order-form.ts public/app.css
git commit -m "Bước 2 Đợt B: dời nút Lưu/Quay lại vào cột phải, thêm số tiền vào thanh dính đáy điện thoại"
```

---

## Sau khi Task 2 xong (bắt buộc theo CLAUDE.md §3)

Việc lớn (đụng cấu trúc bố cục 2 trang quan trọng nhất app). Dispatch subagent kiểm độc lập cho TỪNG Task như các đợt trước, rồi một lượt kiểm toàn cục cho cả Đợt B trước khi báo "đạt" với chủ dự án. Đặc biệt kiểm: `wide()` trong `order-form.ts` (đọc `matchMedia` lúc runtime) có còn đúng sau khi đổi bố cục không; dải tóm tắt có đọc đúng dữ liệu khi đơn CHƯA có dịch vụ nào (đơn nháp) không lỗi.
