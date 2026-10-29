# Đợt 0 — đưa khung chung vào mã: kế hoạch thi công

> **Trạng thái:** chủ dự án duyệt 28/10 («theo đề xuất, nới trần có lý do»); cách thi công đã chốt: subagent-driven. Biên bản: `docs/superpowers/specs/2026-10-28-dot-0-khung-chung/QUYET-DINH-DUYET-KE-HOACH-2026-10-28.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mọi trang của Island Booking System mang cùng một vỏ mới (thanh trên, thanh tab theo bộ quyền, thanh bên có nhóm gập, dải trên trang, chân dính một kiểu, trang lỗi có vỏ, hộp xác nhận và thông báo ngắn kiểu mới, token mở rộng) mà không vẽ lại thân trang nào.

**Architecture:** Khai báo điều hướng vẫn ở một nơi (`src/shared/muc-giao-dien.ts`, thuần, kiểm bằng node); `web/shell.ts` chỉ vẽ. Phần vỏ mới chia thành ba mô-đun nhỏ nằm trong gói của mọi trang (`web/dai.ts` dải trên trang, phần ẩn thanh tab động trong `shell.ts`, `web/toast.ts` sửa) và hai mô-đun chỉ trang cần mới nhập (`web/trang-thai-he-thong.ts` cho 403/404/thiếu mã/mất mạng, `hoiXacNhan` trong `web/bang-truot.ts`) để gói trang Đơn hàng không phình. CSS: token mới vào `:root`, lớp thành phần v2 là một khối mới cuối `public/app.css`, luật cũ chỉ đổi token.

**Tech Stack:** TypeScript thuần + esbuild (`npm run build:web`), node:test (`npm test`), Cloudflare Worker + Workers Assets (`wrangler` 4.135), service worker tự viết, kịch bản Chrome qua CDP (`docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`).

**Spec:** `docs/superpowers/specs/2026-10-28-dot-0-khung-chung/DAC-TA.md` (bản 3, chủ duyệt 28/10 — biên bản `QUYET-DINH-DUYET-DAC-TA-2026-10-28.md` cùng thư mục). Đọc đặc tả trước; kế hoạch này chỉ ghi quyết định mà người thi công không tự suy được.

## Global Constraints

- Nhánh `dot-0-khung-chung` (tách từ origin/main 1d3c67fd). Làm trong worktree **có sẵn** `.claude/worktrees/dot-0-khung-chung` (nhánh đã checkout ở đó — không `git worktree add` nhánh này lần nữa, git từ chối); chép `.env` từ kho chính; `npm ci` nếu `node_modules` chưa có. **Không gộp vào `main`, không push `main`, không `wrangler deploy`** — gộp và phát hành là việc của chủ sau cổng phát hành đợt 0 (đặc tả mục 12).
- Mỗi task kết thúc với `npm test`, `npm run typecheck` xanh và một commit (tiếng Việt, kết bằng dòng `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`). Task chạm `public/` hay `web/` chạy thêm `npm run build:web`.
- **Trần gói trang Đơn hàng** (`src/goi-trang-nhe.test.ts`, `TRAN_ORDERS = 96_700`; đo 28/10 trên main: **96.678 byte, còn 22 byte**). Mọi mã thêm vào `web/shell.ts`, `web/dai.ts`, `web/toast.ts`, `web/api.ts`, `src/shared/muc-giao-dien.ts` đi vào gói này. Quy tắc: không tự nới trần; task nào làm đỏ bài này thì **dừng**, ghi số byte đo được vào `docs/superpowers/plans/2026-10-28-dot-0-khung-chung-nhat-ky.md` và hỏi chủ qua Main session (đặc tả 10.11). **Chủ đã chốt 28/10 («theo đề xuất, nới trần có lý do», biên bản `QUYET-DINH-DUYET-KE-HOACH-2026-10-28.md` cạnh đặc tả):** sửa hằng `TRAN_ORDERS` đúng một lần ở Task 16 với dòng chú thích nêu số đo và lý do, như tiền lệ ADR-0120/0136.
- Không `innerHTML`; dựng DOM bằng `h()` của `web/dom.ts`; ẩn/hiện bằng `el.hidden`. Chữ tiếng Việt có dấu, không chữ Anh mới, không lộ JSON/mã kỹ thuật ra màn hình.
- CSS: mọi giá trị mới là token ở `:root` (trước dấu mốc `/* ---------- app iPhone (PWA)` dòng ~875); luật mới đặt sau dấu mốc và **chỉ dùng token** (`tests/e2e/pwa.mjs` quét số px/hex; `src/token-giao-dien.test.ts` quét độ đậm). Mốc màn hình chỉ 640 / 900 / 1200 cho luật mới.
- `web/shell.ts` và `web/account.ts` còn phải chạy được trên DOM giả của `scripts/chup-muc-giao-dien.mjs` (không có `MutationObserver`, `getClientRects`, `offsetParent`): mọi API trình duyệt ngoài `createElement/append/dataset/classList/querySelector*` phải bọc `typeof … !== "undefined"`.
- Không chạm `src/shared/permissions.ts`, API, migration, D1 thật, cách tính tiền, `web/order-errors.ts`. Không thêm dependency.
- Hồ sơ có ngày (đặc tả, biên bản, evidence cũ) không sửa; lệch gì ghi vào nhật ký thi công (tệp `…-nhat-ky.md` ở trên, tạo ở Task 1).

## Review Focus

1. **Tài khoản ghép nhiều bộ quyền** (vd `SALES+ACCOUNTING+HR`) có thể sinh 6 mục thanh tab. Luật chốt: `thanhTab()` trả tối đa 5 mục, cắt theo thứ tự khai, "Tôi" luôn giữ cuối. Bài ở Task 4 chạy đủ 1024 tập quyền.
2. **Trang 403/404 vẽ sau khi vỏ đã dựng** nên `aria-current` của tab/thanh bên và ô tìm đã có mặt; `trangThaiToanTrang` phải gỡ chúng, không chỉ đặt `data-trang-thai`. Kịch bản Chrome bước 5 (Task 15) đo thật.
3. **Vòng lặp quan sát thanh dính**: quan sát `body` kể cả thuộc tính `class` rồi tự đổi `body.tabbar-an` sẽ gọi lại chính nó. Quan sát `main` (subtree) + `body` chỉ `childList`; chỉ gọi `datThanhTab` khi giá trị đổi. Task 6 có bài đếm số lần gọi.
4. **Ô gõ theo núm cỡ chữ**: `--fs-field` trỏ `--fs-step-5` là núm "Cỡ chữ nội dung" (tối thiểu 14) — chủ chọn 14 thì iOS tự phóng to khi gõ. Chốt `--fs-field: max(16px, var(--fs-step-5))` (Task 1, có bài).
5. **`/ngoai-mang` không có trong bộ đệm** (cài hụt) thì nhánh mới của service worker phải rơi về 503 chữ như cũ, không ném lỗi. Task 13 có bước kiểm bằng CDP xoá mục cache của chính `/ngoai-mang`.

---

### Task 1: Token mở rộng, ba ĐỔI đã duyệt, luật cũ đổi token, đo gói

**Files:**
- Modify: `public/app.css` (`:root` dòng 26–557; luật `#topbar` ~1134, `#tabbar` ~1143, `.sheet-root` ~1553, `.maint-screen` ~1656, `.toast-vung` ~2199, `.vc-radio-dot` ~2499, `.dp-switch` ~2637, `.dd-switch-o .dp-switch` ~3231; token `--z-ntf` ~195, `--z-tl-khung` ~201)
- Modify: `src/shared/giao-dien.ts` (`KEO_THEO` dòng 46, `MAC_DINH`)
- Create: `src/token-dot-0.test.ts`, `docs/superpowers/plans/2026-10-28-dot-0-khung-chung-nhat-ky.md`
- Test: `src/giao-dien-mac-dinh.test.ts`, `src/token-giao-dien.test.ts`, `src/khung-dang-tai-css.test.ts`, `src/goi-trang-nhe.test.ts`, `src/shared/giao-dien*.test.ts`

**Interfaces:**
- Produces: token `:root` theo bảng dưới; `KEO_THEO["dam-tieu-de"] = ["--fw-bold", "--fw-heavy"]`, không còn `KEO_THEO["dam-nhan"]`; `MAC_DINH["dam-tieu-de"] = "600"`.

- [ ] **Step 1: Tạo nhật ký thi công** `…-nhat-ky.md` với ba mục: "Số đo gói trang Đơn hàng theo task" (ghi dòng đầu: trước Task 1 = 96.678), "Lệch so với đặc tả", "Nợ ghi BACKLOG".

- [ ] **Step 2: Viết bài `src/token-dot-0.test.ts`** đọc `:root` của `public/app.css` theo cách của `src/giao-dien-mac-dinh.test.ts` (bản đồ `tên → giá trị thô`), với ba bảng và ba bài:

```ts
const MOI: Record<string, string> = {
  "--h-control": "44px", "--h-control-lon": "52px",
  "--z-dinh": "10", "--z-tab": "20", "--z-truot": "30", "--z-phu": "40", "--z-tren-cung": "50",
  "--t-nhanh": "150ms", "--t-vua": "200ms", "--bo-control": "var(--radius-sm)", "--w-noi-dung-max": "1280px",
  "--w-ngan-chi-tiet": "360px", "--w-cot-phai": "340px", "--w-thiet-lap-max": "900px", "--w-tim-thanh-tren": "280px", "--w-tim-thanh-tren-min": "160px",
  "--h-tab-gach": "3px", "--w-tab-mo-mep": "32px", "--h-dai-tren": "44px",
  "--c-mat-mang-bg": "var(--c-sand-soft)", "--c-check-border": "var(--c-text-muted)", "--c-switch-off-bg": "var(--c-input-border-hover)", "--c-toast-bg": "var(--c-primary-strong)", "--c-hoan-tac": "var(--c-sand)",
  "--pad-nut": "16px", "--pad-o": "12px", "--pad-chip": "12px", "--pad-tab": "16px", "--pad-huy-hieu-doc": "3px", "--pad-huy-hieu-ngang": "8px", "--pad-huy-hieu-bt": "6px",
  "--pad-the": "16px", "--pad-the-rong": "24px", "--le-trang": "16px", "--le-trang-rong": "32px", "--nhip-khoi": "24px", "--h-o-nhieu-dong": "96px", "--vanh-cach": "2px",
  "--skel-dong": "16px", "--skel-so": "26px", "--skel-vien": "96px", "--vong-trang-thai": "56px",
};
const DOI: Record<string, string> = {
  "--focus-ring": "3px", "--fs-field": "max(16px, var(--fs-step-5))", "--fs-h1": "var(--fs-step-11)", "--fs-h2": "var(--fs-step-7)",
  "--fw-heading": "600", "--fw-bold": "600", "--fw-heavy": "600", "--fw-semibold": "500", "--w-main": "var(--w-noi-dung-max)",
  "--tap-min": "var(--h-control)", "--counter-btn": "var(--h-control)",
  "--h-field": "var(--h-control-lon)", "--h-field-wide": "var(--h-control-lon)", "--search-h": "var(--h-control-lon)", "--h-hdv-btn": "var(--h-control-lon)",
  "--skel-md": "var(--skel-dong)", "--skel-num": "var(--skel-so)", "--skel-pill": "var(--skel-vien)",
  "--z-ntf": "var(--z-phu)", "--z-tl-khung": "var(--z-phu)",
};
const GIU: Record<string, string> = { "--h-hdv-act": "48px", "--row-h": "48px", "--h-dp-tab": "40px", "--m-fast": "180ms", "--m-base": "300ms", "--skel-money-mt": "96px" };
// bài 1: mọi MỚI và ĐỔI đúng giá trị thô; bài 2: GIU nguyên giá trị; bài 3: năm luật dưới đây dùng token z, và sau dấu mốc PWA còn ĐÚNG 16 dòng `z-index: <số>`.
```
Bài 3: `#topbar` chứa `z-index: var(--z-dinh)`, `#tabbar` → `--z-tab`, `.sheet-root` → `--z-truot`, `.toast-vung` → `--z-tren-cung`, `.maint-screen` → `--z-tren-cung`; đếm `/z-index:\s*\d+/g` trên phần sau dấu mốc bằng 16. Bài 4: `.vc-radio-dot` có `var(--c-check-border)`; `.dp-switch` và `.dd-switch-o .dp-switch` có `var(--c-switch-off-bg)`; `.pick-mark` vẫn `var(--c-text-muted)`.

- [ ] **Step 3: Chạy bài, xác nhận đỏ** — `node --test src/token-dot-0.test.ts` → FAIL (token chưa khai).

- [ ] **Step 4: Sửa `public/app.css`** đúng bảng MOI/DOI (thêm MỚI thành một khối có chú thích `/* Đợt 0 khung chung (đặc tả 2026-10-28 mục 4) */` ở cuối `:root`, trước `@media (min-width: 960px)` ~559); thay năm số z-index cứng; đổi token ba luật ô chọn/công tắc. Không đụng 16 số z-index còn lại, không đụng nhóm "Bản sao từ tourdaovn". Thêm chú thích đầu `:root`: `/* mốc màn hình: 640 / 900 / 1200 */`. `--vong-trang-thai` 56 là vòng hình của trang trạng thái (đặc tả 6.1; nguồn bản vẽ, 7c đưa vào bộ).

- [ ] **Step 5: Sửa `src/shared/giao-dien.ts`**: `KEO_THEO = { "dam-tieu-de": ["--fw-bold", "--fw-heavy"], "nen-nut-chinh": [...] }` (bỏ dòng `dam-nhan`, sửa chú thích); `MAC_DINH["dam-tieu-de"] = "600"`. Bài nào trong `src/shared/giao-dien*.test.ts` khoá `dam-nhan` kéo theo thì sửa ca đó (ghi lý do: cổng 1 câu 2, đặc tả mục 4).

- [ ] **Step 6: Chạy** `node --test src/token-dot-0.test.ts src/giao-dien-mac-dinh.test.ts src/token-giao-dien.test.ts src/khung-dang-tai-css.test.ts src/shared/giao-dien*.test.ts` → PASS; `npm run build:web`; `npm run test:e2e -- pwa` → PASS (không số viết cứng mới).

- [ ] **Step 7: Đo gói** `node --test src/goi-trang-nhe.test.ts` → ghi số byte vào nhật ký (task này chỉ đổi CSS/giao-dien.ts nên gói đổi ít; đỏ thì dừng theo Global Constraints).

- [ ] **Step 8: Commit** `git add public/app.css src/shared/giao-dien.ts src/token-dot-0.test.ts src/shared docs/superpowers/plans/2026-10-28-dot-0-khung-chung-nhat-ky.md` — "Đợt 0 (1/16): token mở rộng, ba ĐỔI đã duyệt, luật ô chọn/công tắc đổi token".

---

### Task 2: Ba hình mới `alertCircle`, `minus`, `settings`

**Files:**
- Modify: `web/icons.ts` (`SHAPES`, dòng 5–137)
- Create: `src/icons-dot-0.test.ts`

**Interfaces:**
- Produces: `IconName` có thêm `"alertCircle"`, `"minus"`, `"settings"` (bánh răng — `icons.ts` chưa có hình nào cho Thiết lập); dùng ở Task 4, 5, 9, 10.

- [ ] **Step 1: Bài** đọc text `web/icons.ts`, assert có dòng khớp `/^\s{2}alertCircle: \[/m`, `/^\s{2}minus: \[/m`, `/^\s{2}settings: \[/m`, và sáu tên `history`, `clock`, `check`, `chat`, `lock`, `handset` vẫn có.
- [ ] **Step 2: Chạy → FAIL.**
- [ ] **Step 3: Thêm vào `SHAPES`** (khung 24, nét theo `icon()` sẵn có): `alertCircle: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 8v5M12 16v.01" }]]`, `minus: [["path", { d: "M5 12h14" }]]`, `settings: [["circle", { cx: 12, cy: 12, r: 3 }], ["path", { d: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" }]]`.
- [ ] **Step 4: Chạy → PASS; `npm run typecheck`.**
- [ ] **Step 5: Commit** — "Đợt 0 (2/16): ba hình alertCircle, minus, settings".

---

### Task 3: Lớp thành phần chung v2 (CSS)

**Files:**
- Modify: `public/app.css` (khối mới cuối tệp: `/* ---------- Thành phần chung v2 (đợt 0, đặc tả mục 8) ---------- */`)
- Create: `src/thanh-phan-v2-css.test.ts`

**Interfaces:**
- Produces: các lớp gốc và biến thể đúng bảng đặc tả mục 8: `.nut[data-cap][data-co][data-tong][data-ban]`, `.o[data-loai]` + `.nhan` + `.o-loi`, `.o-tich`, `.o-chon-mot`, `.cong-tac`, `.vien[aria-pressed]`, `.huy-hieu[data-tong]`, `.the[data-bam][data-loi]`, `.dong`, `.bang`, `.tab-phu[data-kieu]`, `.dai[data-tong]`, `.chan-dinh`, `.xuong[data-khuon]`, `.rong`, `.toast[data-tong]`, `.bo-qua`, `.trang-thai[data-loai]` (vỏ 403/404/thiếu mã/mất mạng/lỗi máy chủ của Task 4).

- [ ] **Step 1: Bài** đọc phần sau dấu mốc PWA của `app.css`: (a) mỗi bộ chọn trong danh sách trên xuất hiện ở đầu một luật (`\n<bộ chọn>` hoặc `\n<bộ chọn>[`/`,`); (b) khối từ chú thích `Thành phần chung v2` tới cuối tệp không chứa `#hex`, `rgb(`, số `px`/`rem` (dùng đúng regex của `tests/e2e/pwa.mjs`, trừ `1px`); (c) `.huy-hieu` khai `data-tong` cho đủ năm tông `bien|la|cat|do|xam`; (d) `.dai` dùng `var(--h-dai-tren)`; `.chan-dinh` dùng `var(--h-control-lon)` và `env(safe-area-inset-bottom`; `.bo-qua` có `:focus-visible` và `var(--z-tren-cung)`.
- [ ] **Step 2: Chạy → FAIL.**
- [ ] **Step 3: Viết khối CSS.** Quyết định không có trong đặc tả: `.chan-dinh { position: sticky; bottom: 0 }` (không `fixed`, để Task 6 đo "đang hiện" được bằng `getClientRects`); `.bo-qua` đặt `position: absolute; transform: translateY(-200%)` và về `translateY(0)` khi `:focus-visible`; `.xuong` nhịp dùng `@keyframes skeleton-pulse` có sẵn (~693) và tắt trong `prefers-reduced-motion`; `.trang-thai` một cột căn giữa, vòng hình `--vong-trang-thai`×`--vong-trang-thai` nền `--c-primary-soft`; `.dai` là `display:flex; min-height: var(--h-dai-tren)`, ở ≤ 640 cho `flex-wrap: wrap` (câu dài xuống hai dòng). Màu tông: bien = `--c-primary-soft`/`--c-primary-strong`, la = `--c-green-soft`/`--c-green-text` (sẵn có), cat = `--c-sand-soft`/`--c-sand-text`, do = `--c-danger-soft`/`--c-danger`, xam = `--c-surface-alt`/`--c-text-muted`.
- [ ] **Step 4: Chạy bài → PASS; `npm run build:web`; `npm run test:e2e -- pwa` → PASS.**
- [ ] **Step 5: Commit** — "Đợt 0 (3/16): lớp thành phần chung v2 (CSS, chỉ token)".

---

### Task 4: Trạng thái hệ thống dùng chung; áp cho 403 và thiếu mã

**Files:**
- Create: `src/shared/trang-thai-he-thong-chu.ts` (chữ, thuần), `src/shared/trang-thai-he-thong-chu.test.ts`, `web/trang-thai-he-thong.ts` (DOM), `src/dom-gia.ts` (giả DOM tối thiểu cho bài node — không phải bài), `src/trang-thai-he-thong-web.test.ts`
- Modify: `web/hoa-hong.ts:64`, `web/nguoi-ban.ts:45`, `web/order.ts:1689`, `web/chuyen.ts:1286`, `web/cuoc-chuyen.ts:986`, `web/xe-chi-tiet.ts` (sau dòng 21: chưa có kiểm `id` rỗng), `web/shell.ts` (`tabBar`, `sidebarItem`: không `aria-current` khi `document.body.dataset.trangThai` là `"403"`/`"404"`)

**Interfaces:**
- Produces (thuần): `CAU_403 = "Bạn không có quyền xem trang này."` (nhập lại từ `CAU_KHONG_CO_QUYEN_XEM` của `src/shared/hoa-hong-hien-thi.ts`, không chép), `CAU_404 = "Không có trang này."`, `CAU_404_PHU = "Địa chỉ có thể đã đổi hoặc gõ sai."`, `cauThieuMa(doiTuong: string): string` → `"Thiếu mã <đối tượng>. Mở từ danh sách để xem đúng <đối tượng>."`, `CAU_MAT_MANG_TIEU_DE = "Không có kết nối mạng"`, `CAU_MAT_MANG_CHUA_NAP = "Trang này chưa mở lần nào trên máy nên chưa có dữ liệu để hiện. Kiểm tra Wi-Fi hoặc 4G rồi bấm Thử lại."`, `CAU_MAT_MANG_TU_THU = "Nền tảng tự thử lại khi có mạng."`, `cauLoiMayChu(loi: unknown, hetGio: boolean): string` → thông điệp `ApiError` nếu có, hết giờ → `"Máy chủ không trả lời trong 45 giây."`, còn lại `"Máy chủ không trả lời. Thử lại sau ít phút."`, `NHAN_VE_TRANG_DAU = "Về trang đầu của bạn"`, `NHAN_THU_LAI = "Thử lại"`.
- Produces (DOM): `type LoaiTrangThai = "403" | "404" | "thieu-ma" | "mat-mang-chua-nap" | "loi-may-chu" | "rong" | "dang-tai"`; `interface TuyChonTrangThai { trangDau?: string; doiTuong?: string; trangCha?: { nhan: string; href: string }; cau?: string; nut?: { nhan: string; khiBam: () => void }; khuon?: "danh-sach" | "chi-tiet" | "bieu-mau" | "bang-dieu-khien" | "thiet-lap"; thuLai?: () => void; loi?: unknown; hetGio?: boolean }`; `trangThaiHeThong(loai, o?): HTMLElement` (trả `section.trang-thai[data-loai]`, không chạm DOM khác); `trangThaiToanTrang(loai: "403" | "404" | "thieu-ma" | "mat-mang-chua-nap", o?): HTMLElement` = đặt `document.body.dataset.trangThai = loai`, gỡ mọi `[aria-current]` trong `#tabbar, #sidebar` khi 403/404, gỡ `.topbar-search`, rồi `replaceChildren(main, phầnTử)` (`main` = `document.querySelector("main")`, thêm `tabindex="-1"` và focus).
- Hình: 403 `lock`, 404 `alertCircle`, thieu-ma `alertCircle`, mat-mang `history`, loi-may-chu `alertCircle`, rong `minus`; `dang-tai` = `.xuong[data-khuon]` với `aria-busy="true"`, không chữ.
- Consumes: Task 2 hình; Task 3 CSS `.trang-thai`, `.xuong`, `.rong`, `.nut`.

- [ ] **Step 1: Bài thuần** `src/shared/trang-thai-he-thong-chu.test.ts`: `cauThieuMa("đơn") === "Thiếu mã đơn. Mở từ danh sách để xem đúng đơn."`; `cauLoiMayChu(new ApiError(...)`— dựng bằng lớp thật từ `web/api.ts` nếu nhập được trong node, nếu không thì đối tượng `{ message }` và hàm đọc `message` của `Error`) trả đúng message; `cauLoiMayChu(new TypeError("x"), true)` chứa "45 giây"; mọi hằng không chứa ký tự `{`/`}` và không khớp `/[A-Za-z]{4,}/` ngoài từ Việt không dấu cho phép (`Wi-Fi`, `4G`).
- [ ] **Step 2: Chạy → FAIL; viết `trang-thai-he-thong-chu.ts`; chạy → PASS.**
- [ ] **Step 3: Viết `src/dom-gia.ts`**: `dungDomGia(): void` đặt `globalThis.Node` (lớp `NutGia` có `children: NutGia[]`, `attributes: Map`, `className`, `textContent` (ghép con), `hidden`, `dataset`, `classList` {add, remove, toggle, contains}, `append(...c)`, `replaceChildren(...c)`, `setAttribute/getAttribute/removeAttribute`, `querySelector/querySelectorAll` chỉ cho `#id`, `.lớp`, `thẻ`, `[thuộc-tính]`, `focus()`, `addEventListener/dispatchEvent` tối giản), `globalThis.document` (`createElement`, `createElementNS`, `createTextNode`, `body`, `querySelector*`, `getElementById`), `globalThis.window` (`addEventListener/dispatchEvent/requestAnimationFrame`), `globalThis.sessionStorage` (Map). Chỉ đủ cho `h()`, `icon()`, `replaceChildren()` của `web/dom.ts` chạy.
- [ ] **Step 4: Bài `src/trang-thai-he-thong-web.test.ts`** (gọi `dungDomGia()` trước khi `import()` động `../web/trang-thai-he-thong.ts`): `trangThaiHeThong("rong", { cau: "Chưa có xe nào.", nut: { nhan: "Thêm xe", khiBam } })` → `section` có `data-loai="rong"`, đúng một `button` nhãn "Thêm xe", bấm gọi `khiBam` một lần; `("loi-may-chu", { loi: new TypeError("x"), hetGio: true, thuLai })` → chữ chứa "45 giây", nút "Thử lại"; `("dang-tai", { khuon: "danh-sach" })` → có `[data-khuon="danh-sach"]`, `aria-busy="true"`, `textContent === ""`; `("403", { trangDau: "/cuoc" })` → `a` nhãn "Về trang đầu của bạn" href "/cuoc"; `("thieu-ma", { doiTuong: "đơn", trangCha: { nhan: "Đơn hàng", href: "/orders" } })` → `a` nhãn "Về Đơn hàng".
- [ ] **Step 5: Viết `web/trang-thai-he-thong.ts`** theo Interfaces (một hàm `vo(hinh, tieuDe, cauPhu, nut)` dùng chung cho sáu loại; nút là `button.nut[data-cap=chinh]` hoặc `a.nut` khi có `href`) → bài Step 4 PASS.
- [ ] **Step 6: Áp:** `hoa-hong.ts:64` và `nguoi-ban.ts:45`: khi `err.status === 403` → `trangThaiToanTrang("403", { trangDau: homeRedirect(staff) ?? "/" })` (`homeRedirect` từ `src/shared/start-page.ts`), bỏ `showError` ở nhánh đó. Thiếu mã: `order.ts` → `trangThaiToanTrang("thieu-ma", { doiTuong: "đơn", trangCha: { nhan: "Đơn hàng", href: "/orders" } })`; `chuyen.ts` → `("thieu-ma", { doiTuong: "chuyến", trangCha: { nhan: "Điều phối xe", href: "/dieu-phoi" } })`; `cuoc-chuyen.ts` → `("thieu-ma", { doiTuong: "chuyến", trangCha: { nhan: "Cuốc của tôi", href: "/cuoc" } })`; `xe-chi-tiet.ts`: thêm `if (!id) { trangThaiToanTrang("thieu-ma", { doiTuong: "xe", trangCha: { nhan: "Xe & giấy tờ", href: "/xe" } }); } else …` quanh phần nạp. `href` trang cha lấy từ `TRANG.<khoa>.duong`, không viết tay chuỗi.
- [ ] **Step 7: `web/shell.ts`**: trong `tabBar` và `sidebarItem`, `aria-current` chỉ đặt khi `document.body.dataset.trangThai` không phải `"403"`/`"404"` (trang vẽ sau vỏ vẫn được gỡ bởi `trangThaiToanTrang`, đây là lớp hai).
- [ ] **Step 8: Chạy** `npm test`, `npm run typecheck`, `npm run build:web`; đo gói (shell đổi vài byte) → ghi nhật ký.
- [ ] **Step 9: Commit** — "Đợt 0 (4/16): trạng thái hệ thống dùng chung; 403 ở Hoa hồng/Người bán, thiếu mã ở bốn trang chi tiết".

---

### Task 5: Thanh tab theo bộ quyền và trang mục lục Thiết lập

**Files:**
- Modify: `src/shared/muc-giao-dien.ts` (`TRANG` thêm `thietLap` **đặt cuối bảng**; `THANH_TAB` viết lại; `sangTabToi`; `thanhTab`), `src/shared/muc-giao-dien-goi.ts` (`thietLap: "GET /api/catalog/admin"`), `web/shell.ts` (`tabBar`), `src/shared/sw-policy.ts` (`PAGES`, `PRECACHE` thêm `/thiet-lap`, `/js/thiet-lap.js`), `package.json` (`build:web` thêm `web/thiet-lap.ts`), `tests/audit/muc-hien-mo-duoc-khung.mjs` (`DUOC_MA_AN`), `src/muc-giao-dien-hien-trang.json` (chụp lại), `src/muc-giao-dien-menu-moi.test.ts` (nếu bài nào đếm tab)
- Create: `public/thiet-lap.html`, `web/thiet-lap.ts`, `src/thanh-tab-theo-bo-quyen.test.ts`

**Interfaces:**
- Produces: `TRANG.thietLap = { duong: "/thiet-lap", cungSang: [đường của mọi dòng THIẾT LẬP trong THANH_BEN, kể cả "/dieu-kien-xuat-ben"], hien: (s) => can(s, "admin.manage"), moTrang: cùng hàm }`.
- `THANH_TAB` (một thứ tự duy nhất; `chiKhi.that` là vị từ dưới, không hỏi mã quyền thô):

| trang | nhan | bieuTuong | chiKhi |
|---|---|---|---|
| trangChu | Trang chủ | home | — |
| trangTaiXe | Trang chủ | home | — |
| donHang | Đơn hàng | orders | — |
| taiKhoan | Tài khoản | staff | `!can(s, "admin.manage")` |
| taoDon | Tạo đơn | plus | — |
| soCongNo | Sổ công nợ | lock | `!can(s, "order.create")` |
| danhBa | Danh bạ | contact-card | `can(s, "order.create") && !can(s, "admin.manage")` |
| thietLap | Thiết lập | settings (tên có sẵn trong `icons.ts`; thiếu thì vẽ bánh răng) | — |
| cuoc | Cuốc của tôi | assign | `chiTaiXe` (giữ) |
| ban | Báo bận | clock | — (`TRANG.ban.hien` đã hẹp) |
| gopY | Hỗ trợ | chat | `!seesAllOrders(s)` |
| troGiup | Hướng dẫn | help | `!seesAllOrders(s) && !can(s, "order.create") && !chiTaiXe(s)` |
| toi | Tôi | me | — |

  Bỏ dòng `dichVu`. `thanhTab(n)` sau lọc: nếu > 5 mục thì giữ 4 mục đầu + mục `toi`.
- `sangTabToi(duong: string, tabHien: readonly KhoaTrang[]): boolean` (thay tham số `coTabCuoc`): `/account` → true; dòng `TRANG_TOI` không `khongSangTabToi`, có `trang` **không nằm trong `tabHien`**, và `sangTai(trang, duong)`.
- Trang `/thiet-lap`: `public/thiet-lap.html` chép `<head>` từ `public/hoa-hong.html`, `<body data-title="Thiết lập">` (không `data-back`), `<main><h1>Thiết lập</h1><div id="error" class="alert" role="alert" hidden></div><nav id="tl-muc" aria-label="Thiết lập" class="tl-muc"></nav></main>`; `web/thiet-lap.ts`: `staff = await initShell()`; `moTrang("thietLap", staff)` sai → `trangThaiToanTrang("403", …)`; đúng → mỗi mục `thanhBen({ staff }, "/thiet-lap").find(g => g.nhom === "THIẾT LẬP")!.muc` thành `a.dong[href]` (cao `--h-control`), mục `dichVu` gắn thêm số lệch giá qua `trinhBay` (xuất `trinhBay` từ `shell.ts`). CSS `.tl-muc` một cột, `max-width: var(--w-thiet-lap-max)`.

- [ ] **Step 1: Bài `src/thanh-tab-theo-bo-quyen.test.ts`** — mười bộ (`holder` theo cách của `muc-giao-dien-menu-moi.test.ts`): `TQ ["SUPER_ADMIN"]`, `QT ["ADMIN"]`, `KT ["ACCOUNTING"]`, `BH ["SALES"]`, `TT ["INTERN"]`, `ĐT ["PARTNER"]`, `HDV ["FIELD"]`, `NS ["HR"]`, `TX ["DRIVER"]`, `TXĐT ["DRIVER_PARTNER"]`; `assert.deepEqual(thanhTab({ staff }).map(t => t.nhan), …)`:

```ts
TQ, QT: ["Trang chủ", "Đơn hàng", "Tạo đơn", "Thiết lập", "Tôi"]
KT:     ["Trang chủ", "Đơn hàng", "Sổ công nợ", "Tôi"]
BH:     ["Trang chủ", "Đơn hàng", "Tạo đơn", "Danh bạ", "Tôi"]
TT, ĐT: ["Đơn hàng", "Tạo đơn", "Hỗ trợ", "Tôi"]
HDV:    ["Đơn hàng", "Hỗ trợ", "Hướng dẫn", "Tôi"]
NS:     ["Tài khoản", "Hỗ trợ", "Hướng dẫn", "Tôi"]
TX:     ["Trang chủ", "Cuốc của tôi", "Hỗ trợ", "Tôi"]   // href đầu = "/tai-xe"
TXĐT:   ["Trang chủ", "Cuốc của tôi", "Báo bận", "Hỗ trợ", "Tôi"]
```
  Thêm: với 1024 tập con của `PERMISSION_CODES`: `≤ 5` mục, mục cuối luôn "Tôi", "Tạo đơn" (nếu có) ở vị trí 3 khi 5 mục / 2 khi 4 mục; `["SALES","ACCOUNTING","HR"]` → 5 mục, cuối "Tôi". `sangTabToi("/so-cong-no", ["trangChu","donHang","soCongNo","toi"]) === false`; `sangTabToi("/so-cong-no", ["trangChu","donHang","taoDon","danhBa","toi"]) === true`; `sangTabToi("/staff", ["trangChu","donHang","taoDon","thietLap","toi"]) === false` (vì `thietLap` cungSang `/staff` sáng tab Thiết lập, không sáng Tôi — kiểm `sangTai("thietLap", "/staff") === true`).

- [ ] **Step 2: Chạy → FAIL.**
- [ ] **Step 3: Sửa `muc-giao-dien.ts`, `muc-giao-dien-goi.ts`, `shell.ts tabBar`** (`tabHien = tabs.map(t => t.trang)`; lớp `tab tab-new` khi `trang === "taoDon"`).
- [ ] **Step 4: Tạo trang `/thiet-lap`** (HTML, TS, `PAGES`/`PRECACHE`, `build:web`), CSS `.tl-muc`.
- [ ] **Step 5: `DUOC_MA_AN`** thêm năm dòng `noi: ["thanh-tab"]`: `taiKhoan` khi `can(account.view) && can(admin.manage)` (lý do: Quản trị/Toàn quyền vào qua mục Thiết lập); `soCongNo` khi `ledger.view && order.create` (Toàn quyền vào qua thanh bên/Tôi); `danhBa` khi `isOffice && (!order.create || admin.manage)`; `gopY` khi `seesAllOrders` (vào qua Tôi, chân thanh bên); `troGiup` khi `seesAllOrders || order.create || chiTaiXe` (vào qua Tôi, chân thanh bên). Dòng cũ về tab `dichVu`/`cuoc` nào không còn khớp thì sửa theo thông báo của bài.
- [ ] **Step 6: Chụp lại ảnh hiện trạng** `node scripts/chup-muc-giao-dien.mjs --ghi src/muc-giao-dien-hien-trang.json` rồi `git diff --stat` + đọc diff: chỉ chuỗi thanh tab đổi đúng bảng trên và thêm "Thiết lập"; mục nào "thấy thêm" ngoài bảng → dừng, ghi nhật ký.
- [ ] **Step 7: Chạy** `npm test` (đủ: `thanh-tab-theo-bo-quyen`, `muc-hien-mo-duoc-{1,2,3}`, `muc-giao-dien-hien-trang`, `muc-giao-dien-goi`, `muc-giao-dien-gom`, `sw-policy`), `npm run typecheck`, `npm run build:web`; đo gói → nhật ký.
- [ ] **Step 8: Commit** — "Đợt 0 (5/16): thanh tab theo bộ quyền (một thứ tự khai, tối đa 5), trang mục lục Thiết lập".

---

### Task 6: Chân dính một kiểu và ẩn thanh tab động

**Files:**
- Modify: `web/shell.ts` (hàm mới `theoDoiThanhDinh`, gọi cuối `addNav` khi `tabbar !== "off"`), `public/app.css` (khối chung cho thanh dính; `body.tabbar-an`), `public/chuyen-sua.html`, `public/xe-sua.html`, `public/giao-dien.html` (`data-tabbar="off"`), `web/dieu-phoi.ts:201` (`.dp-nhieu` thêm lớp `thanh-hanh-dong-cuoi`), `scripts/sinh-so-do-trang.mjs:95` (regex thêm `chan-dinh`)
- Create: `src/thanh-dinh-day.test.ts`
- Test: `src/thanh-hanh-dong-cuoi.test.ts` (sẵn có)

**Interfaces:**
- Produces (thuần, trong `src/shared/thanh-dinh-day.ts`): `BO_CHON_THANH_DINH = ".thanh-hanh-dong-cuoi:not(.dp-run-end)"`; `coThanhDinhHien(ds: Iterable<{ getClientRects?: () => ArrayLike<unknown>; closest: (s: string) => Element | null }>): boolean` = có phần tử không nằm trong `.sheet-root` và `getClientRects().length > 0` (thiếu `getClientRects` → false).
- Produces (shell): `theoDoiThanhDinh(): void` — nếu `typeof MutationObserver === "undefined"` thì thoát; hàm `capNhat()` tính `coThanhDinhHien(document.querySelectorAll(BO_CHON_THANH_DINH))`, chỉ gọi `datThanhTab(!co)` khi giá trị đổi, và đặt `document.body.style.setProperty("--day-dinh", "<px>")` = chiều cao thật của thanh dính đang hiện hoặc của `#tabbar` khi hiện (Task 10 dùng cho toast); gọi `capNhat()` một lần rồi quan sát `main` `{ subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "class", "style"] }` và `document.body` `{ childList: true }`; gộp nhiều biến động trong một `requestAnimationFrame`.
- `.chan-dinh` của Task 3 phải mang thêm lớp `thanh-hanh-dong-cuoi` khi dùng (bài sẵn có `src/thanh-hanh-dong-cuoi.test.ts` ép mọi thanh dính mang lớp chung).

- [ ] **Step 1: Bài `src/thanh-dinh-day.test.ts`**: `coThanhDinhHien([])` false; phần tử giả `{ getClientRects: () => [1], closest: () => null }` → true; nằm trong sheet (`closest` trả object) → false; không có `getClientRects` → false; `BO_CHON_THANH_DINH` loại `.dp-run-end`. Bài thứ hai: đọc text `web/shell.ts`, assert có `typeof MutationObserver` và không quan sát thuộc tính của `body` (không có chuỗi `attributeFilter` trong lời gọi `observe(document.body`).
- [ ] **Step 2: Chạy → FAIL.** Viết `src/shared/thanh-dinh-day.ts`, `theoDoiThanhDinh` trong shell → PASS.
- [ ] **Step 3: HTML/CSS:** ba trang thêm `data-tabbar="off"`; `.dp-nhieu` thêm lớp chung; CSS sau dấu mốc: `.form-actions, .vc-bottom-bar, .vc-form-actions, .chan-dinh { background: var(--c-surface); border-top: 1px solid var(--c-border); padding-bottom: calc(var(--s3) + env(safe-area-inset-bottom)); z-index: var(--z-dinh) }`, nút trong đó `min-height: var(--h-control-lon)`; `body.tabbar-an .vc-bottom-bar { bottom: 0 }` (hiện là `bottom: calc(var(--tabbar-h) + …)` — thanh tab ẩn thì không chừa chỗ nữa). Giữ tên lớp cũ, không đổi DOM trang.
- [ ] **Step 4: `sinh-so-do-trang.mjs`** regex `form-actions|vc-bottom-bar` → `form-actions|vc-bottom-bar|chan-dinh`; `node scripts/sinh-so-do-trang.mjs` (tệp sinh có đổi thì commit cùng).
- [ ] **Step 5: Chạy** `npm test`, `npm run typecheck`, `npm run build:web`; `node scripts/chup-muc-giao-dien.mjs --so-sanh HEAD` chạy không lỗi (DOM giả không có `MutationObserver`); đo gói → nhật ký.
- [ ] **Step 6: Commit** — "Đợt 0 (6/16): chân dính một kiểu; thanh tab tự ẩn khi có thanh dính đang hiện".

---

### Task 7: Thanh bên: bỏ Tạo đơn, nhóm gập Điều phối, phần giữa cuộn, lối Bỏ qua

**Files:**
- Modify: `src/shared/muc-giao-dien.ts` (`ChoThanhBen.nhomGap`, `MucThanhBen.nhomGap`, bỏ dòng `noiBat`, hàm mới `gomNhomGap`, `demMucHienSan`), `web/shell.ts` (`sidebarGroup` → dùng `nutGap` chung cho THIẾT LẬP và nhóm gập; bỏ `nutMoi`/`.sidebar-new`; `initShell` chèn `a.bo-qua`), `public/app.css` (`.sidebar-groups` mặt nạ mờ mép, `.sidebar-foot` dính, bỏ luật `.sidebar-new*`, chấm nhóm đóng), `src/muc-giao-dien-menu-moi.test.ts` (bỏ lọc `noiBat`; "trần 10" đếm bằng `demMucHienSan`), `src/muc-giao-dien-hien-trang.json` (chụp lại), `tests/audit/muc-hien-mo-duoc-khung.mjs` (nếu bài rào kể `noiBat`)
- Create: `src/nhom-gap-thanh-ben.test.ts`

**Interfaces:**
- `ChoThanhBen.nhomGap?: { readonly ma: string; readonly nhan: string }` — đặt trên hai dòng `dieuPhoi` và `deNghi`: `{ ma: "dieu-phoi", nhan: "Điều phối" }`. `MucThanhBen.nhomGap` chép theo.
- `type KhoiThanhBen = MucThanhBen | { readonly nhomGap: { ma: string; nhan: string }; readonly muc: MucThanhBen[] }`; `gomNhomGap(muc: readonly MucThanhBen[]): KhoiThanhBen[]` — gom các mục **liền nhau** cùng `nhomGap.ma`; nhóm chỉ có 1 mục trả mục phẳng. `demMucHienSan(nhomHien: ReturnType<typeof thanhBen>): number` = tổng khối của mọi nhóm trừ CHÂN MENU, THIẾT LẬP đếm 1 khi có mục.
- shell: `nutGap(id: string, nhan: string, rows: HTMLElement[], moSan: boolean, dangChua: boolean, dem?: HTMLElement): HTMLElement` dựng `button.sidebar-group-toggle[aria-expanded][aria-controls=id]` + `div.sidebar-group-items#id[hidden]`; `dangChua` (nhóm đóng chứa trang đang mở) → thêm `span.sidebar-cham` (chấm Biển) vào nút. THIẾT LẬP dùng chính hàm này (giữ `thietLapMoSan` và số lệch giá); nhóm gập `moSan = rows nào sangTaiMuc`.
- `a.bo-qua[href="#noi-dung-chinh"]` "Bỏ qua tới nội dung chính" là phần tử đầu tiên của `body`; `initShell` đặt `main.id ||= "noi-dung-chinh"` và `tabindex="-1"`.

- [ ] **Step 1: Bài `src/nhom-gap-thanh-ben.test.ts`**: Toàn quyền (`["ADMIN","SUPER_ADMIN"]`) `thanhBen(…, "/")` sau `gomNhomGap` từng nhóm → nhãn khối theo thứ tự: `["Trang chủ","Đơn hàng","Danh bạ"]`, `["Điều phối","Xe đang chạy","Xe & giấy tờ","Giá & chi phí"]`, `["Điều chỉnh công nợ","Sổ công nợ & khoá sổ"]`; khối "Điều phối" có `muc` nhãn `["Điều phối xe","Đề nghị chuyển khách"]`; `demMucHienSan === 10`. Kế toán: nhóm VẬN CHUYỂN sau gom là `["Điều phối xe"]` phẳng (không có khối `nhomGap`). Không dòng nào còn `noiBat`. Mọi tập quyền: `demMucHienSan ≤ 10`.
- [ ] **Step 2: Chạy → FAIL.** Sửa `muc-giao-dien.ts` → PASS.
- [ ] **Step 3: `shell.ts`**: `sidebarGroup` dùng `gomNhomGap` + `nutGap`; bỏ `noiBat`; `initShell` chèn `.bo-qua`. CSS: `.sidebar-groups { mask-image: linear-gradient(to bottom, #000 calc(100% - var(--w-tab-mo-mep)), transparent) }` — mặt nạ dùng `#000`/`transparent` là màu kỹ thuật không phải màu giao diện, nhưng quét PWA cấm hex: dùng `currentColor`/`transparent` thay `#000`; `.sidebar-foot { position: sticky; bottom: 0; background: var(--c-sidebar-bg) }`; xoá `.sidebar-new`, `.sidebar-new[aria-current]`, phần `.sidebar-new:focus-visible` khỏi danh sách; `.sidebar-cham` chấm `--dot-size` màu `--c-primary`.
- [ ] **Step 4: Chụp lại ảnh** (`--ghi`), đọc diff: thanh bên mất "Tạo đơn" ở mọi tập có `order.create`, không mục nào "thấy thêm".
- [ ] **Step 5: Chạy** `npm test`, `typecheck`, `build:web`; `--so-sanh HEAD` không lỗi; đo gói → nhật ký.
- [ ] **Step 6: Commit** — "Đợt 0 (7/16): thanh bên bỏ Tạo đơn, nhóm gập Điều phối, phần giữa cuộn, lối Bỏ qua".

---

### Task 8: Thanh trên một kiểu và Trợ lý lên thanh trên

**Files:**
- Modify: `web/shell.ts` (`initShell`: đường dẫn một cấp; thứ tự nút phải), `src/shared/muc-giao-dien.ts` (`trangChaCua`), `web/tro-ly.ts` (`ganTroLy` dựng nút trong `#topbar`; xoá `nangTheoThanhDay`, `#tl-fab`, `--tl-nang`), `public/app.css` (`.bar-title` 18/600 một dòng; `.bar-duong`; `.bar-tro-ly`; `.topbar-search` rộng `--w-tim-thanh-tren` co tới `--w-tim-thanh-tren-min`; xoá `.tl-fab*`, `--z-tl-fab`, `--tl-nang-0`; bỏ `@media (min-width: 1400px)` của Trang chủ)
- Create: `src/trang-cha-cua.test.ts`
- Test: `src/thanh-hanh-dong-cuoi.test.ts` (nếu nó nhắc `nangTheoThanhDay` thì sửa ca).

**Interfaces:**
- `trangChaCua(duong: string): { nhan: string; href: string } | null` (thuần): khoá `k` đầu tiên theo thứ tự `TRANG` có `cungSang` chứa `duong` → `{ nhan: nhanTheoDuong(TRANG[k].duong) ?? nhãn dòng TRANG_TOI của k ?? "", href: TRANG[k].duong }`; không có → null.
- shell: ở mọi khổ dựng `span.bar-title`; khi `trangChaCua(path)` có và trang không phải cấp một của người xem (không mục tab/thanh bên nào `sangTai(trang, path)` với `trang === k` của chính nó — tức `path !== TRANG[k].duong`) → chèn `a.bar-duong[href]` "Trang cha ›" trước tiêu đề (CSS chỉ hiện ≥ 900). Thứ tự phần tử phải: `.topbar-search` → `.topbar-new` → chuông (`ganThongBao` như nay) → `button.bar-tro-ly#tl-nut` (Task này chuyển `ganTroLy` sang gắn vào `#topbar`, dùng `icon("chat")`, `aria-haspopup="dialog"`, nhãn "Trợ lý"; khung `#tl-khung` giữ nguyên, `--z-phu`).

- [ ] **Step 1: Bài `src/trang-cha-cua.test.ts`**: `trangChaCua("/order")` → `{ nhan: "Đơn hàng", href: "/orders" }`; `"/xe-sua"` → `{ nhan: "Xe & giấy tờ", href: "/xe" }`; `"/dieu-kien-xuat-ben"` → `{ nhan: "Chính sách điều phối", href: "/chinh-sach-dieu-phoi" }` (khoá `chinhSachDieuPhoi` đứng trước `thietLap`); `"/staff"` → `{ nhan: "Thiết lập", href: "/thiet-lap" }`; `"/orders"` → null.
- [ ] **Step 2: Chạy → FAIL; viết hàm → PASS.**
- [ ] **Step 3: shell + tro-ly + CSS** theo Interfaces. Xoá mã nâng nút và token/luật `.tl-fab`. `.bar-title { font-size: var(--fs-step-7); font-weight: var(--fw-heading); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0 }` ở ≥ 900.
- [ ] **Step 4: Chạy** `npm test`, `typecheck`, `build:web`; `grep -rn "tl-fab\|tl-nang" web public/app.css` → 0 dòng; đo gói (xoá mã nâng nút phải làm gói nhỏ đi) → nhật ký.
- [ ] **Step 5: Commit** — "Đợt 0 (8/16): thanh trên một kiểu (tiêu đề 18/600, đường dẫn một cấp, thứ tự nút phải), Trợ lý lên thanh trên".

---

### Task 9: Dải trên trang một chủ sở hữu; bảo trì đổi vỏ; Trang chủ bỏ viên

**Files:**
- Create: `src/shared/dai-chu.ts`, `src/shared/dai-chu.test.ts`, `web/dai.ts`
- Modify: `web/shell.ts` (`stripsEl`/`setMaintenanceStrip`/`setMfaStrip`/`ganDaiNhacHaiLop` → gọi `dai.ts`), `web/thong-bao-ui.ts` (`strips()` dòng 42 và `.ntf-strip` ~172–190 → `datDai("thong-bao", …)`), `web/home.ts` (xoá dòng ~633 `.dash-dai-bao-tri` và ~699 `.dash-hero-bao-tri`), `public/app.css` (xoá `.maint-strip`, `.mfa-strip`, `.ntf-strip*`, hai luật `body.trang-chu .maint-strip` ~1853/~1955, sửa ~1865 `:not(.maint-strip)` → `.dai`; `.dash-dai-bao-tri`, `.dash-hero-bao-tri`), `web/maintenance-screen.ts` (~25–45 chữ; biểu tượng `history`), `public/login.html:11` (`class="dai login-alert" data-tong="bien"`), `web/login.ts:147` (chèn `icon("history")`), sáu tệp HTML thêm `data-khuon="bieu-mau"` vào `<body>`: `order-form`, `chuyen-sua`, `xe-sua`, `dieu-chinh-cong-no`, `chup-bu`, `ban`
- Test: `docs/evidence/2026-09-21-v1-0/kich-ban/v1-bao-tri.mjs` (đổi bộ chọn `.maint-strip` → `.dai[data-loai="bao-tri"]` — kịch bản là hồ sơ có ngày: **chép** sang `docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/v1-bao-tri.mjs` rồi sửa bản chép; Task 15 chạy).

**Interfaces:**
- Thuần (`src/shared/dai-chu.ts`): `type LoaiDai = "bao-tri" | "ngoai-mang" | "thong-bao" | "bao-mat"`; `UU_TIEN: readonly LoaiDai[] = ["bao-tri", "ngoai-mang", "thong-bao", "bao-mat"]`; `chonDai(coMat: ReadonlySet<LoaiDai> | readonly LoaiDai[]): LoaiDai | null`; `TONG_DAI: Record<LoaiDai, { tong: "bien" | "cat" | "do"; hinh: "history" | "clock" | "alertCircle" }>` = bao-tri bien/history, ngoai-mang cat/clock, thong-bao cat/clock, bao-mat do/alertCircle; `CAU_NGOAI_MANG = "Đang ngoài mạng — dữ liệu lần xem gần nhất"`; `cauBaoTri(gioDuKien: string | null): string` → `"Đang bảo trì, dự kiến xong HH:MM"` / `"Đang bảo trì"`; `KHOA_DAI_BAO_MAT_DA_DONG = "dai-bao-mat-da-dong"`.
- DOM (`web/dai.ts`): `stripsEl(): HTMLElement` (chuyển từ shell, giữ hành vi tạo lười sau `#topbar`); `datDai(loai: LoaiDai, noiDung: { cau: string; nut?: { nhan: string; href: string } | { nhan: string; khiBam: () => void }; dongDuoc?: boolean } | null): void` — giữ sổ `Map<LoaiDai, noiDung>`, vẽ lại `#strips` chỉ với `chonDai(...)`: `div.dai[data-tong][data-loai]` = `icon` + `span.dai-cau` + nút (`a.nut[data-cap=phu]` hoặc `button`) + (nếu `dongDuoc`) `button.dai-dong[aria-label="Đóng"]` → xoá mục khỏi sổ, với `bao-mat` ghi `sessionStorage[KHOA_DAI_BAO_MAT_DA_DONG] = "1"` (bọc try). `body[data-khuon="bieu-mau"]` → `datDai("bao-mat", …)` bị bỏ qua. `ganNgoaiMang(): void` — nghe `window` sự kiện `"ngoai-mang"` (Task 13 phát) → `datDai("ngoai-mang", { cau: CAU_NGOAI_MANG, nut: { nhan: "Thử lại", khiBam: () => location.reload() } })`; nghe `"online"` → `datDai("ngoai-mang", null)` và phát `window.dispatchEvent(new Event("co-mang"))`. `thanNgoaiMang(thuLai: () => void): HTMLElement` — khối nhỏ `section.trang-thai[data-loai="mat-mang-chua-nap"]` dùng chữ của Task 4 (shell dùng ở Task 13; không nhập `trang-thai-he-thong.ts` để gói Đơn hàng không phình).
- shell: `setMaintenanceStrip(on)` → `datDai("bao-tri", on ? { cau: cauBaoTri(giờ từ `me.maintenance.endsAt` nếu có), nut: { nhan: "Xem", href: TRANG.toi.duong } } : null)` (chữ ký cũ giữ: `account.ts:750` gọi); `setMfaStrip(text)` → `datDai("bao-mat", text ? { cau: text, nut: { nhan: "Bật ngay", href: TRANG.toi.duong + "#mfa" }, dongDuoc: true } : null)`; `ganDaiNhacHaiLop` bỏ qua khi `sessionStorage` có khoá đã đóng.
- `thong-bao-ui.ts`: dải tin quan trọng → `datDai("thong-bao", { cau: <b + span ghép bằng " — ">, nut: { nhan: "Xem", khiBam: <hàm mở ngăn thông báo đang gắn cho nút cũ> } })`; "Đã hiểu" vẫn ở trong ngăn (ADR-0034 điều 8), không đổi.
- maintenance-screen: tiêu đề giữ "Đang bảo trì"; đoạn `renderMaintenanceMessage` giữ cơ chế, câu đầu "Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là " + đồng hồ; câu phụ mới `p.maint-phu`: "Khi hệ thống mở lại, tải lại trang để tiếp tục; phần chưa lưu trên trang này sẽ mất."; biểu tượng `history` thay `alert`.

- [ ] **Step 1: Bài `src/shared/dai-chu.test.ts`**: `chonDai([])` null; `chonDai(["bao-mat","thong-bao"])` "thong-bao"; `chonDai(["ngoai-mang","bao-tri"])` "bao-tri"; `chonDai(["bao-mat","ngoai-mang"])` "ngoai-mang"; `UU_TIEN` đúng bốn phần tử theo thứ tự; `cauBaoTri("09:30") === "Đang bảo trì, dự kiến xong 09:30"`; `cauBaoTri(null) === "Đang bảo trì"`; `TONG_DAI["bao-mat"].hinh === "alertCircle"`.
- [ ] **Step 2: Chạy → FAIL; viết `dai-chu.ts` → PASS.**
- [ ] **Step 3: `web/dai.ts`, shell, thong-bao-ui, home, maintenance-screen, login, HTML, CSS** theo Interfaces. Chép `v1-bao-tri.mjs` sang thư mục evidence mới và đổi bộ chọn.
- [ ] **Step 4: Chạy** `npm test`, `typecheck`, `build:web`; `grep -rn "maint-strip\|mfa-strip\|ntf-strip\|dash-dai-bao-tri\|dash-hero-bao-tri" web public src` → chỉ còn trong hồ sơ có ngày (không trong `web/`, `public/`, `src/`); `--so-sanh HEAD` không lỗi; đo gói → nhật ký.
- [ ] **Step 5: Commit** — "Đợt 0 (9/16): dải trên trang một chủ sở hữu (bảo trì › ngoài mạng › thông báo › bảo mật), bảo trì đổi vỏ, Trang chủ bỏ viên".

---

### Task 10: Thông báo ngắn kiểu mới

**Files:**
- Modify: `web/toast.ts`, `public/app.css` (`.toast-vung` ~2199: `bottom: calc(var(--day-dinh, var(--tabbar-h)) + env(safe-area-inset-bottom) + var(--s3))`; `body.has-sidebar .toast-vung { left: var(--w-sidebar); right: 0; align-items: center }`; **giữ** `body:has(.buoc-thanh) .toast-vung` ~2212; `.toast` dùng `--c-toast-bg`, `--w-toast`, `--radius-md`, `--shadow-overlay`; `.toast-hoan-tac` màu `--c-hoan-tac`)
- Create: `src/toast-web.test.ts` (dùng `dungDomGia()` của `src/dom-gia.ts` từ Task 4 + `mock.timers` của node:test; `import()` động `../web/toast.ts` sau khi dựng DOM giả)

**Interfaces:**
- `hienBaoNgan(cau: string, o: { tong?: "la" | "do" | "bien" | "cat"; hoanTac?: { nhan?: string; khiBam: () => void } } = {}): void`; `TU_AN_NGAN_MS = 3000`, `TU_AN_HOAN_TAC_MS = 5000`, `TU_AN_MS = 6000` (Bảng tin, giữ) — xuất ba hằng. Phần tử: `div.toast[data-tong]` = `icon(tong === "do" ? "alertCircle" : "check", 18)` + `span.toast-cau` + (`button.toast-hoan-tac` khi có) + `button.toast-dong[aria-label="Đóng"]`; có `hoanTac` thì `pointer-events: auto` (lớp `toast-bam-duoc`). Trần 3 cái và `ganThongBao` giữ.
- Consumes: `--day-dinh` do Task 6 đặt.

- [ ] **Step 1: Bài `src/toast-web.test.ts`** với `mock.timers` của node:test: `hienBaoNgan("Đã lưu")` → phần tử `.toast[data-tong="la"]` có trong `.toast-vung`; sau 2.999 ms còn, sau 3.000 ms mất; `hienBaoNgan("x", { hoanTac: { khiBam } })` → còn ở 4.999 ms, bấm `.toast-hoan-tac` gọi `khiBam` một lần; `hienThongBao` vẫn 6.000 ms.
- [ ] **Step 2: Chạy → FAIL; sửa `toast.ts` → PASS.**
- [ ] **Step 3: CSS** theo Files. `npm run build:web`; `npm run test:e2e -- pwa`.
- [ ] **Step 4: Chạy `npm test`, đo gói → nhật ký. Commit** — "Đợt 0 (10/16): thông báo ngắn nền tối, 3 giây, Hoàn tác, không đè chân dính".

---

### Task 11: Hộp xác nhận một chiều `hoiXacNhan`, áp năm chỗ, hàng rào không tăng

**Files:**
- Modify: `web/bang-truot.ts` (`moBangTruot` thêm tuỳ chọn `vaiTro?: "dialog" | "alertdialog"`, `khongNutDong?: true`; hàm mới `hoiXacNhan`), `web/home.ts:335` (confirm) và `:340` (alert), `web/tro-ly-cai-dat.ts:222`, `web/dieu-kien-xuat-ben.ts:82`, `web/account.ts:233`, `public/app.css` (`.sheet-foot-xac-nhan`: điện thoại xếp dọc — nút giữ dưới cùng, nút nguy hiểm trên; ≥ 641 hai đầu; `.sheet-canh-bao` vòng tông Đỏ)
- Create: `src/ratchet-confirm-alert.test.ts`

**Interfaces:**
- `hoiXacNhan(o: { tieuDe: string; hauQua: string; nhanNguyHiem: string; nhanGiu?: string; opener?: HTMLElement | null }): Promise<boolean>` — dựng trên `moBangTruot({ vaiTro: "alertdialog", khongNutDong: true, body: [vòng cảnh báo `icon("alertCircle", 24)`, `p` hauQua], foot: [nút giữ `button.btn`, nút nguy hiểm `button.btn.btn-danger`], footClass: "sheet-foot-xac-nhan" })`; `nhanGiu` mặc định "Giữ nguyên"; Esc/chạm nền/nút giữ → `false`; nút nguy hiểm → `true`; `moBangTruot` trả null (đang mở bảng khác) → `false`.
- Ghi chú lệch đặc tả: đặc tả 7.1 kể "account.ts (bật/tắt bảo trì)" nhưng chỗ đó đã là xác nhận trong trang (dòng 716); chọn `account.ts:233` (Gỡ Face ID mọi máy) làm chỗ mẫu thứ năm — ghi vào nhật ký.

- [ ] **Step 1: Bài ratchet** `src/ratchet-confirm-alert.test.ts`: với mọi `web/*.ts`, đếm `/\b(?:confirm|alert)\(/g` trên các dòng **không** bắt đầu bằng `//` sau khi cắt khoảng trắng và không nằm sau `//` trong dòng; `assert.ok(tong <= TRAN, …)` với `const TRAN = 16;` (đo 28/10: 21 chỗ mã thật; đợt 0 bỏ 5). Bài phải in danh sách tệp:dòng khi đỏ.
- [ ] **Step 2: Chạy → FAIL (21 > 16).**
- [ ] **Step 3: Viết `hoiXacNhan`; thay năm chỗ**: `home.ts:335` → `if (!(await hoiXacNhan({ tieuDe: "Xác nhận bên nhận đã nhận tiền", hauQua: <chuỗi confirm cũ>, nhanNguyHiem: "Xác nhận đã nhận", opener: nut }))) return;`; `home.ts:340` alert → `hienBaoNgan(<chuỗi cũ>, { tong: "do" })`; `tro-ly-cai-dat.ts:222` → `hoiXacNhan({ tieuDe: "Thay bằng bản mặc định?", hauQua: <chuỗi cũ>, nhanNguyHiem: "Thay", nhanGiu: "Giữ chỗ đang sửa" })`; `dieu-kien-xuat-ben.ts:82` → `hoiXacNhan({ tieuDe: `Đóng điều kiện “${nhan}”`, hauQua: <phần sau dấu ? của chuỗi cũ>, nhanNguyHiem: "Đóng điều kiện" })`; `account.ts:233` → `hoiXacNhan({ tieuDe: "Gỡ Face ID trên mọi máy", hauQua: <chuỗi cũ>, nhanNguyHiem: "Gỡ Face ID" })`. Hàm bao quanh thành `async` nếu chưa.
- [ ] **Step 4: Chạy ratchet → PASS (16). Quan sát chặn thật:** thêm tạm một dòng `confirm("x");` vào `web/home.ts` → chạy → FAIL kèm `home.ts:<dòng>` → hoàn nguyên → PASS. Ghi ngày + thông báo đỏ vào nhật ký (Task 14 chép sang `docs/SO-HANG-RAO.md`).
- [ ] **Step 5: `npm test`, `typecheck`, `build:web`; đo gói — `web/orders.ts` CÓ nhập `bang-truot` (dòng 5) nên `hoiXacNhan` vào gói Đơn hàng (+ vài trăm byte) → nhật ký. Commit** — "Đợt 0 (11/16): hộp xác nhận một chiều hoiXacNhan ở năm chỗ mẫu; hàng rào confirm/alert không tăng (16)".

---

### Task 12: Trang 404 có vỏ qua Workers Assets

**Files:**
- Modify: `wrangler.jsonc:29` (`"not_found_handling": "404-page"` trong `assets`), `src/shared/sw-policy.ts` (`PAGES` + `/404`; `PRECACHE` + `/404`, `/js/khong-co-trang.js`), `package.json` (`build:web` + `web/khong-co-trang.ts`), `tests/e2e/pwa.mjs` (hai assert cuối)
- Create: `public/404.html` (`<head>` như `hoa-hong.html`, `<title>Không có trang — Island Booking System</title>`, `<body data-title="Không có trang"><header id="topbar"></header><main></main><script type="module" src="/js/khong-co-trang.js"></script>`), `web/khong-co-trang.ts`

**Interfaces:**
- `web/khong-co-trang.ts`: `const staff = await initShell(); trangThaiToanTrang("404", { trangDau: homeRedirect(staff) ?? "/" });` (chưa đăng nhập: `initShell` tự đưa về `/login` như mọi trang).
- Không thêm dòng `TRANG` (không có lối vào).

- [ ] **Step 1: e2e** thêm vào cuối `tests/e2e/pwa.mjs`: `GET /khong-co-trang-nay` → `status 404`, `content-type` khớp `/^text\/html/`, thân chứa `data-title="Không có trang"`; `GET /api/khong-co` → `404` và `content-type` khớp `/json/`.
- [ ] **Step 2: Chạy `npm run test:e2e -- pwa` → FAIL (hiện trả gì thì ghi lại).**
- [ ] **Step 3: Thêm trang, cấu hình, danh sách.** `npm run build:web`.
- [ ] **Step 4: `npm run test:e2e -- pwa` → PASS; `npm test` (`sw-policy.test.ts` khớp `public/*.html`).**
- [ ] **Step 5: Commit** — "Đợt 0 (12/16): trang 404 có vỏ; Workers Assets trả 404.html cho địa chỉ lạ ngoài /api".

---

### Task 13: Mất mạng: trang `/ngoai-mang`, service worker, dải ngoài mạng, nhánh mở trang của shell

**Files:**
- Create: `public/ngoai-mang.html` (như 404.html, `data-title="Ngoài mạng"`, script `/js/ngoai-mang.js`), `web/ngoai-mang.ts`
- Modify: `web/sw/sw.ts:111` (nhánh `refresh.catch`), `src/shared/sw-policy.ts` (`PAGES` + `/ngoai-mang`; `PRECACHE` + `/ngoai-mang`, `/js/ngoai-mang.js`), `package.json` (`build:web`), `web/api.ts` (chỗ bắt lỗi mạng của `fetch`: trước khi ném lại, `window.dispatchEvent(new Event("ngoai-mang"))` khi `err instanceof TypeError` hoặc hết giờ), `web/shell.ts:469–475` (nhánh mất mạng: bỏ `KHUNG_MAT_MANG` và `showError`; dùng `thanNgoaiMang` + `datDai("ngoai-mang", …)`; nếu không có bản nhớ khung thì không dựng điều hướng), `web/shell.ts` `initShell` gọi `ganNgoaiMang()` một lần

**Interfaces:**
- `web/ngoai-mang.ts`: vẽ thân **trước** khi gọi `initShell` (hàm đó treo khi mất mạng): `replaceChildren(main, trangThaiHeThong("mat-mang-chua-nap", { thuLai: () => location.reload() }))`; `window.addEventListener("online", () => location.reload(), { once: true })`; rồi `void initShell()`.
- `sw.ts`: `return refresh.catch(async () => { if (event.request.mode === "navigate") { const fb = await cache.match(cacheKey(self.location.origin + "/ngoai-mang")); if (fb) return fb; } return new Response("Không có kết nối mạng.", { status: 503, … }); })`. Không đổi `install`, `isCacheable`, `routeFor`.
- `KHUNG_MAT_MANG` giữ xuất (bài ảnh chụp và kịch bản `--so-sanh` đọc); shell không dùng nữa — ghi chú ngay trên hằng.

- [ ] **Step 1: Bài** trong `src/shared/sw-policy.test.ts` tự bắt `PAGES`/`PRECACHE`; bài mới nhỏ `src/sw-ngoai-mang.test.ts`: đọc text `web/sw/sw.ts`, assert có `request.mode === "navigate"` và `"/ngoai-mang"` trong nhánh `catch`, và `install` vẫn `allSettled`.
- [ ] **Step 2: Chạy → FAIL; sửa `sw.ts`, thêm trang/danh sách → PASS.**
- [ ] **Step 3: `api.ts`, `shell.ts`, `dai.ts ganNgoaiMang`** theo Interfaces.
- [ ] **Step 4: Kiểm tay bằng CDP** (kịch bản chính thức ở Task 15): `node scripts/dev-iphone.mjs` → mở `http://localhost:8787/orders` bằng Chrome, đợi service worker cài; `CacheStorage.requestCacheNames` + `deleteEntry` mục `/xe`; `Network.emulateNetworkConditions offline`; điều hướng `/xe` → thấy `[data-loai="mat-mang-chua-nap"]` + nút "Thử lại". Xoá thêm mục `/ngoai-mang` rồi điều hướng `/xe` → 503 chữ (không lỗi script). Ghi kết quả vào nhật ký.
- [ ] **Step 5: `npm test`, `typecheck`, `build:web`, `npm run test:e2e -- pwa`; đo gói (api.ts + dai.ts + shell) → nhật ký. Commit** — "Đợt 0 (13/16): mất mạng — trang /ngoai-mang khi hết bộ đệm, dải ngoài mạng giữ nội dung đã vẽ, bỏ khung bốn tab".

---

### Task 14: Hạt giống tài khoản thử, ADR ngắn, sổ hàng rào, sổ nợ, hướng dẫn web, nhật ký thay đổi

**Files:**
- Modify: `scripts/dev-iphone.mjs:26–29` (thêm `{ name: "Toàn quyền Thử", phone: "0900000003", pin: pin(), permissions: ["SUPER_ADMIN"] }`, `{ "Kế toán Thử", "0900000004", ["ACCOUNTING"] }`, `{ "Hướng dẫn viên Thử", "0900000005", ["FIELD"] }`, `{ "Tài xế Thử", "0900000006", ["DRIVER"] }`, `{ "Tài xế đối tác Thử", "0900000007", ["DRIVER_PARTNER"] }`), `docs/SO-HANG-RAO.md` (ba dòng mới: ratchet confirm/alert — ngày + đột biến + thông báo từ Task 11; bài thanh tab theo bộ quyền; bài nhóm gập; mỗi dòng cần một lần quan sát chặn thật: đổi một nhãn trong `THANH_TAB` → đỏ → hoàn nguyên), `docs/BACKLOG.md` (một mục "Nợ đợt 0 khung chung" liệt kê: 8 bảng trượt tự dựng, xác nhận trong trang, 16 `confirm()/alert()` còn lại, ≈20 câu "Đã lưu" tại chỗ, tiêu đề lặp, 16 z-index cứng, 10 skel + 3 chiều cao khác giá trị, bỏ bí danh ở phát hành 2, luật cũ ở mốc 960/1024/720, lớp nghi chết), `web/CLAUDE.md` (mục "Thành phần chung v2" trỏ đặc tả mục 8; dòng 21 "thêm điều hướng ở `web/shell.ts`" → "khai ở `src/shared/muc-giao-dien.ts`"; bảng kịch bản thêm dòng đợt 0), `docs/adr/README.md` (một dòng), `src/shared/changelog.ts` (mục mới ở đầu theo công thức "Ghi nhật ký thay đổi" của `docs/CHANGE-GUIDE.md`; số phiên bản = số hiện tại + 1; ngày = để ngày thi công, kịch bản phát hành của chủ sẽ đối chiếu), ghi chú một dòng vào `docs/adr/ADR-0084*.md` (chỉ thêm dòng "Ghi chú 2026-10-29: vị trí nút Trợ lý đổi lên thanh trên theo cổng 1 câu 4 — không đổi quyết định", **nếu** dòng trạng thái của ADR-0084 không cấm; cấm thì ghi vào ADR mới dưới đây)
- Create: `docs/adr/ADR-<số>-service-worker-tra-trang-ngoai-mang-khi-het-bo-dem.md` — số = số lớn nhất trên mọi nhánh + 1 (`for b in $(git branch --format='%(refname:short)'); do git ls-tree --name-only $b docs/adr/ | grep -o 'ADR-01[4-9][0-9]'; done | sort -u` — 0142 nhánh khác, 0143 main ⇒ thường là 0144); trạng thái **proposed**, cửa hai chiều, nội dung: điều hướng hết bộ đệm → `/ngoai-mang` thay 503 chữ; không đổi điều 1–2 của ADR-0035; chủ duyệt cùng cổng phát hành đợt 0.

- [ ] **Step 1: Hạt giống**: `node scripts/dev-iphone.mjs` in đủ 7 tài khoản rồi `Ctrl+C`.
- [ ] **Step 2: ADR + README + SO-HANG-RAO (ba lần quan sát chặn thật) + BACKLOG + web/CLAUDE.md + changelog**; `node --test src/shared/changelog.test.ts` → PASS.
- [ ] **Step 3: `npm test`; commit** — "Đợt 0 (14/16): hạt giống thử 7 bộ quyền; ADR-<số> trả /ngoai-mang; sổ hàng rào, sổ nợ, hướng dẫn web, nhật ký thay đổi".

---

### Task 15: Kịch bản Chrome đợt 0, kịch bản mất mạng, chạy lại kịch bản cũ, axe

**Files:**
- Create: `docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/dot-0-smoke.mjs`, `…/mat-mang-smoke.mjs`, `…/README.md` (cách chạy, biến môi trường `AXE_JS`, `CHROME_BIN`, `OUT`)
- Dùng lại: `docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs` (`startEnv`, `ACCOUNTS`, `ok`, `sleep`), bản chép `v1-bao-tri.mjs` (Task 9), các kịch bản ở đặc tả mục 11 (`quyen-thieu-quan-tri-smoke`, `trang-chu-smoke`, `xe-smoke`, `xe-chi-tiet-smoke`, `giay-to-nguoi-smoke`, `a2-smoke-*`, `v1-nguoi-phu-trach`, `v1-xac-nhan-png`, `v1-dang-nhap`, `dot-c-smoke`, `ho-tro-smoke`, `help-smoke`, `tai-xe-trang-dau-smoke`, `cuoc-smoke`)

**`dot-0-smoke.mjs` — mỗi bước một `assert`, đo bằng `getComputedStyle`/`getClientRects`, chụp ảnh vào `OUT/anh`:**
1. 390, Bán hàng, `/orders`: `#tabbar a span:last-child` → `["Trang chủ","Đơn hàng","Tạo đơn","Danh bạ","Tôi"]`; nút thứ 3 có lớp `tab-new`.
2. 390, Kế toán, `/so-cong-no`: `#tabbar` `display !== "none"`, 4 mục, đúng một `[aria-current]` là "Sổ công nợ".
3. 390, Quản trị, `/xe` sau khi dữ liệu về: `.vc-bottom-bar` `getClientRects().length > 0` ⇒ `#tabbar` `display === "none"`; `/order?id=` (rỗng) ⇒ `[data-loai="thieu-ma"]` và `[aria-current]` là "Đơn hàng".
4. 1040, Toàn quyền, `/`: nhãn mục hiện sẵn của `#sidebar` (khối, nhóm gập đếm 1) = 10 đúng danh sách Task 7; `button[aria-controls="nhom-dieu-phoi"]` mở ra 2 mục; không có `.sidebar-new`; bấm Tab lần đầu ⇒ `document.activeElement.classList.contains("bo-qua")`, Enter ⇒ `activeElement` là `main`.
5. 1040, Bán hàng, `/audit`: `body[data-trang-thai="403"]`, không `[aria-current]` trong `#sidebar`/`#tabbar`, không `.topbar-search`, có `a.nut` "Về trang đầu của bạn" href `/`.
6. 1040, Bán hàng, `/orders`: thứ tự con của `#topbar` chứa `.topbar-search` trước `.topbar-new` trước chuông trước `#tl-nut`; không `.tl-fab`; `.bar-title` `overflow === "hidden"`; `/order?id=<đơn thật>` ⇒ có `a.bar-duong` "Đơn hàng".
7. `GET /khong-co-trang-nay` (fetch trong trang) ⇒ 404 + `text/html`; điều hướng tới đó khi đã đăng nhập ⇒ `[data-loai="404"]`.
8. Toàn quyền bật bảo trì (API như `v1-bao-tri`): Trang chủ 390 có `.dai[data-loai="bao-tri"]`, không `.dash-dai-bao-tri`/`.dash-hero-bao-tri`; tắt bảo trì.
9. 390 và 1040, axe (`AXE_JS`) trên `/orders`, `/thiet-lap` (Toàn quyền), `/audit` (403): không `violations` mức `critical`/`serious`.
10. Hộp xác nhận: 390, Toàn quyền, `/dieu-kien-xuat-ben` (có điều kiện đang mở trong hạt giống của `a2-cdp`, nếu không thì tạo qua API) bấm "Đóng" ⇒ `[role="alertdialog"]` có `.btn-danger`, Esc đóng không gọi API (đếm request `/dong` = 0).
11. Thông báo ngắn: 390, Bán hàng, `/order-form` thêm một dịch vụ ⇒ `.toast[data-tong="la"]` xuất hiện; `getBoundingClientRect().bottom` của nó nhỏ hơn `top` của thanh dính/`#tabbar` đang hiện; sau 3,5 s không còn.
12. `/thiet-lap`, 390, Quản trị: `[aria-current]` duy nhất là "Thiết lập"; có ≥ 10 `a.dong`; Bán hàng mở `/thiet-lap` ⇒ `body[data-trang-thai="403"]`.

**`mat-mang-smoke.mjs`** (cần service worker: `startEnv` của a2 chạy trên `localhost` nên có): đăng nhập Bán hàng, mở `/orders`, chờ `navigator.serviceWorker.ready`; `CacheStorage.deleteEntry` mục `<origin>/xe`; `Network.emulateNetworkConditions {offline:true}`; điều hướng `/xe` ⇒ `[data-loai="mat-mang-chua-nap"]`; quay về online, mở `/orders`, offline lại, bấm nút làm mới của trang (hoặc gọi `fetch("/api/orders")` từ trang) ⇒ `.dai[data-loai="ngoai-mang"]` hiện và `main` vẫn còn danh sách; online ⇒ dải mất.

- [ ] **Step 1: Viết hai kịch bản; chạy** `AXE_JS=… CHROME_BIN=… node docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/dot-0-smoke.mjs` → mọi bước `✓`; `mat-mang-smoke.mjs` → `✓`.
- [ ] **Step 2: Chạy lại kịch bản cũ** theo danh sách; kịch bản nào đỏ vì vỏ đổi (đếm mục thanh bên, bộ chọn `.maint-strip`, `.tl-fab`, nhãn tab): **chép** sang thư mục evidence mới rồi sửa bản chép (hồ sơ có ngày không sửa), ghi tên vào `README.md` của thư mục mới và vào bảng kịch bản của `web/CLAUDE.md`.
- [ ] **Step 3: Commit** — "Đợt 0 (15/16): kịch bản Chrome dot-0-smoke (10 bước), mat-mang-smoke; kịch bản cũ chép và sửa theo vỏ mới".

---

### Task 16: Số đo trước/sau, bản local cho QA2 và cổng phát hành

**Files:**
- Create: `docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/` chép `may-chu.mjs`, `gieo-du-lieu.mjs`, `do-trang.mjs`, `do-toc-do.mjs`, `tong-hop.mjs`, `ma-tran-quyen.mjs`, `du-lieu-gieo-nhieu.json`, `tai-khoan.json` từ `docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/` (không sửa bản gốc); `…/so-lieu/` (kết quả); `docs/superpowers/plans/2026-10-28-dot-0-khung-chung-nhat-ky.md` (hoàn tất)
- Modify (chỉ khi chủ đã chốt nới trần ở cổng duyệt kế hoạch): `src/goi-trang-nhe.test.ts` `TRAN_ORDERS` = số đo thật sau Task 15 + 100, kèm chú thích "Nới … → … (đợt 0 khung chung, 2026-10-29): mã vỏ chung (dải, ẩn thanh tab động, thanh tab theo bộ quyền) vào gói mọi trang; không nhật ký thay đổi, không mã nghiệp vụ".

- [ ] **Step 1: Đo** như Chặng 1: `node …/may-chu.mjs` (cổng 8795) → `gieo-du-lieu.mjs` → `do-trang.mjs --nhan nhieu` (47 trang × 10 bộ × 390 + 1040) → `do-toc-do.mjs` (cùng điều kiện 27/10: 4G chậm, CPU 4×) → `tong-hop.mjs`; kết quả vào `so-lieu/`, ảnh vào `~/tourdao-ux-dot-0/anh/`. Đối chiếu đặc tả 10.16: FCP lạnh, "khung xong" không xấu hơn 5 %; CLS ≤ 0,1 ở `/thiet-lap`, `/404`; chuyển trang ≤ 101 ms. Xấu hơn → ghi nhật ký, không tự sửa gì thêm ngoài phạm vi.
- [ ] **Step 2: Tổng kiểm** `npm test`, `npm run typecheck`, `npm run build:web`, `npm run test:e2e -- pwa`, hai kịch bản Chrome của Task 15; `git status` sạch; nhật ký thi công có đủ: số đo gói theo task, lệch so với đặc tả, nợ.
- [ ] **Step 3: Bản local cho chủ**: `node scripts/dev-iphone.mjs` chạy được, in 7 tài khoản; ghi vào nhật ký đường dẫn + 10 việc thử (đặc tả 12.1, `LO-TRINH.md` mục 4).
- [ ] **Step 4: Commit** — "Đợt 0 (16/16): số đo trước/sau, bản local sẵn sàng cho QA2 và cổng phát hành". Báo Main session: nhánh, số commit, số đo gói cuối, mục lệch — để mở QA2 (phiên kiểm độc lập lập `SO-SANH-TRUOC-SAU.md`, đặc tả 12.2). **Không gộp, không phát hành.**
