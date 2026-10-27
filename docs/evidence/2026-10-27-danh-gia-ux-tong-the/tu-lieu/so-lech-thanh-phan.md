# Sổ lệch thành phần — Nền tảng Tour Đảo (đánh giá UX tổng thể, Chặng 1)

Ngày lập: 2026-10-27. Người lập: trợ lý đọc mã (chỉ đọc, không sửa kho). Nguồn: worktree `danh-gia-ux-tong-the` (commit `634948dd`), tệp `public/app.css` (3.905 dòng, 2.779 luật CSS, 1.806 tên class khác nhau), 127 tệp `web/*.ts` (không tính bài kiểm), 47 trang `public/*.html`, thư mục `src/shared/` cho từ vựng trạng thái.

Câu hỏi cần trả lời: toàn Nền tảng có dùng **một** ngôn ngữ thiết kế, hay mỗi màn một kiểu? Mọi con số dưới đây đếm lại được bằng các lệnh ở mục 8.

---

## 1. Bảng tổng: mỗi loại thành phần có bao nhiêu kiểu

Cách đếm "kiểu" (họ class): tên class được cắt tới **danh từ thành phần đầu tiên** trong tên (`btn`, `nut`, `card`, `the`, `chip`, `sheet`, `head`, `dau`, `banner`, `loi`, `trong`…). Ví dụ `.vc-btn-soft` thuộc họ `.vc-btn`; `.hdv-card-top` thuộc họ `.hdv-card`. Đếm hai tầng:

- **Thô** = mọi họ có danh từ thành phần trong tên (cận trên — gồm cả phần con như `*-dong`, `*-hang`).
- **Tự vẽ khung** = họ mà luật gốc của nó (bộ chọn trần `.ten`, ngoài `@media`, lấy giá trị khai SAU CÙNG) đặt ít nhất **2** trong 6 thuộc tính khung: nền, viền, bo góc, chiều cao, đệm, bóng. Đây là con số chính: mỗi họ ở tầng này là một "cái trông khác" thật sự được vẽ.
- **Chỉ 1 trang** = trong tầng tự vẽ khung, họ chỉ xuất hiện ở đúng một trang (truy theo cây `import` từ 45 điểm vào của `build:web` + `class="…"` trong HTML).

| Loại thành phần | Họ thô | Họ tự vẽ khung | …trong đó chỉ 1 trang | Ghi chú |
|---|---|---|---|---|
| Nút (bấm hành động) | 44 | 16 | 8 | Chiều cao rất đồng đều: 14/16 họ cao 44px (`--tap-min`) |
| Nút chuyển tab / phân đoạn | 12 | 6 | 4 | 7 cách vẽ tab khác nhau (mục 2.2) |
| Thẻ / khối | 52 | 19 | 9 | 5 kiểu viền-bóng khác nhau cho cùng "thẻ trắng" |
| Bảng / danh sách / dòng | 141 | 12 | 9 | Có khuôn chung `table.items` + `.table-wrap` + `.card-list`, nhưng 8 bảng riêng nữa |
| Huy hiệu / chip trạng thái | 30 | 15 | 7 | ≥ 9 bộ tên màu song song cho cùng 5 cặp màu (mục 5) |
| Ô nhập / công tắc / ô chọn | 39 | 12 | 4 | Ô gõ cao 44 / 48 / 52 px tuỳ khu |
| Bảng trượt / hộp thoại | 13 | 3 | 1 | **Thống nhất nhất**: một khuôn `.sheet*` dùng ở 20 tệp |
| Thông báo / lỗi / trống / cảnh báo | 69 | 16 | 5 | 21 kiểu "trống", 3 kiểu lỗi dưới ô cùng giá trị |
| Đầu trang / tiêu đề vùng | 95 | 8 | 7 | 19 họ đầu trang có tên riêng; cỡ h1 24 hoặc 26 px |
| **Tổng** | **495** | **107** | **54** | 4 họ không trang nào dùng (CSS chết, mục 2.9) |

Đọc bảng: một nửa số kiểu tự vẽ khung (54/107) chỉ sống ở một trang. Nhưng phần lớn chúng **đúc từ cùng token** (mục 3), nên khác nhau chủ yếu ở tên và tổ hợp, ít khi ở con số.

---

## 2. Cùng chức năng, nhiều cách làm (bảng so trực tiếp)

Giá trị đã quy về px từ token (`var()` lồng nhau, `rem × 16`). "Trang" = số trang thật dùng (truy theo `import`).

### 2.1 Nút

| Chức năng | Các class song song | Cao | Bo góc | Cỡ chữ | Nền / viền | Trang |
|---|---|---|---|---|---|---|
| Nút thường (viền) | `.btn` (L591) không khai cao ở luật gốc; tính ra ~46px (dòng 24 + đệm 2×10 + viền 2×1) | 8px | kế thừa 16px | `#fff` **viết cứng**, viền `--c-primary` | mọi trang |
| | `.vc-btn` + `.vc-btn-line` (L2324–2325) | 44px | 8px | 16px | `#ffffff` qua token, viền primary | 25 trang (Vận chuyển, Điều phối, Hoa hồng) |
| | `.xb-nut` (L3369) | 44px (khai `height`) | 8px | 14px | surface, viền xám `--c-border` | 1 (lich-xe-ban) |
| | `.catalog-nut-nhom` (L1428) | 44px | 8px | 16px | surface, viền xám | 1 (order-form) |
| Nút nhạt (nền xanh nhạt) | `.btn-primary` (L594) | như `.btn` | 8px | 16px | `--c-btn-soft-bg` | mọi trang |
| | `.vc-btn-soft` (L2327) | 44px | 8px | 16px | primary-soft + viền | 25 trang |
| | `.pill-btn` (L736) | 44px | 8px (tên "pill" nhưng **không** bo tròn) | 14px | primary-soft, không viền | 11 trang |
| | `.tl-mau-nut` (L3166) | 44px | 999px | 14px | primary-soft + viền xám | khung Trợ lý |
| Nút chữ | `.btn-link` (L607) | 44px | — | — | không nền, gạch chân | mọi trang |
| | `.vc-btn-text` (L2333) | 44px | — | 16px | không nền, không gạch chân | 25 trang |
| Nút nguy hiểm | `.btn-danger` (L606) chữ đỏ viền đỏ; `.vc-btn-danger` (L2332) **nền đỏ chữ trắng**; `.pill-btn-danger`; `.vc-btn-stop` | | | | cùng tên "danger", hai cách tô ngược nhau | |
| Nút nổi / FAB | `.tl-fab` (L3119) | 44px | 999px | 14px | `--c-fab-bg` | mọi trang (Trợ lý) |
| Nút biểu tượng | `.icon-btn` (L2233), `.counter-btn` (L1324), `.vc-step-btn` (L2407) | 44px | 8px / — / 8px | — / 20px / 22px | — / không viền / viền xám | 45 / 4 / 1 trang |
| Nút "Lập đơn mới" | `.sidebar-new` (L1198, 40px, 15px, nền san hô), `.topbar-new` (L1236), `.tab-new` (thanh tab) | 40px | 8px | 15px | `--c-accent` | khung chung |

Kết luận nhỏ: **kích thước** nút gần như một chuẩn (44px, 8px hoặc tròn hẳn). Cái lệch là **hai hệ nút song song** (`.btn*` ở khu bán hàng/quản trị, `.vc-btn*` ở khu Vận chuyển — chú thích L2334 ghi rõ `.vc-btn` cố ý không chuyển màu như `.btn`) cộng khoảng 10 nút riêng một trang. `.btn` vẫn còn `#fff` và `10px 18px` viết cứng (vùng trước mốc PWA, không có máy kiểm).

### 2.2 Nút chuyển tab / phân đoạn — 7 cách vẽ, 3 cách đánh dấu mục đang chọn

| Class | Dòng | Cao | Bo góc | Cỡ chữ | Kiểu chọn | Trang |
|---|---|---|---|---|---|---|
| `.ntf-tab` | 2236 | ~ (đệm 8px) | — | 14px | gạch chân 3px, đánh dấu bằng `aria-selected` | ngăn Thông báo (mọi trang) |
| `.ht-tab` | 937 | 44px | — | kế thừa | gạch chân **2px**, đánh dấu bằng lớp `.is-on` | 1 (feedback) |
| `.xm-tab` | 802 | 44px | (của `.btn`) | — | nút nền primary đặc, đánh dấu bằng `aria-pressed` | 2 (parties, staff) |
| `.dp-tab` trong `.dp-tabs` | 2835 | 40px | 6px trong hộp 8px nền xanh nhạt | 14px | khối nền | 1 (dieu-phoi) |
| `.tx-tab` | 3427 | 44px | 999px | 16px | viên thuốc nền xanh nhạt | 2 (bang-gia-xe, hoa-hong) |
| `.vc-seg` | 2410 | — | 8px viền xám | — | phân đoạn | 1 (xe-sua) |
| `.dash-day` (ba nút ngày ở Trang chủ) | 1773 | 44px | 999px | 14px | nền primary khi chọn | 1 (home) |

(`.tab` ở L1144 là mục thanh tab dưới đáy điện thoại, không phải tab nội dung.)

### 2.3 Huy hiệu / chip trạng thái

| Class | Dòng | Cỡ chữ | Đệm | Bo góc | Viền | Trang |
|---|---|---|---|---|---|---|
| `.badge` (+ `badge-draft/confirmed/cancelled/delivered/completed`) | 694–700 | **12.8px** (`--fs-old-badge` = .8rem) | 2px 10px **cứng** | **999px cứng** | không | trạng thái đơn, mọi trang |
| `.chip` (+ `chip-unit/muted/warn`) | 1313–1316 | 12px | 0 8px | `--radius-pill` | chỉ `chip-warn` | 45 trang |
| `.vc-chip` (+ ok/warn/danger/muted) | 2316–2320 | 12px | 2px 10px (`--pad-vc-chip`) | pill | **có** viền 1px | Vận chuyển |
| `.dp-chip-*` (6 tông, đi kèm `.chip`) | 2705–2710 | 12px | (của `.chip`) | pill | — | chuyen, order |
| `.ntf-chip` (+ ok/muted/qt) | 2256–2259 | 12px | 1px 8px | pill | 1px trong suốt | Thông báo |
| `.ntf-badge` (+ cho/nhan/huy/tin) | 2247–2251 | — | — | pill, cao 36px | — | Thông báo |
| `.vc-badge` | 2549 | 12px | 1px 8px | pill | — | 1 (account) |
| `.vc-pill-old` | 2468 | 12px | 0 8px | pill | viền xám | 2 |
| `.svc-chip-gon` | 1347 | 12px | 0 8px | pill | viền cát | 1 (order-form) |
| `.sidebar-item-badge` | 1207 | 12px | 1px 8px | pill | — | thanh bên |
| `.px-qua-han` | 823 | 12.8px | 4px 8px | pill | viền đỏ | 1 (parties) |
| `.cx-nhan-qua-han` | 3842 | 14px | 0 8px | pill | — | 1 (cho-xac-nhan) |
| `.tag-price` | 1318 | 14px | 0 8px | **8px** (không tròn) | — | 2 |
| `.hdv-chip`, `.fb-badge`, `.mfa-badge`, `.pdt-trang-thai`, `.nhan-chip`, `.dp-run-chip`, `.cp-chip-*` | rải rác | (mượn `.chip` hoặc chỉ đổi màu) | | | | mỗi họ 1–2 trang |

Cùng một "viên nhãn nhỏ" có 3 cỡ chữ (12 / 12.8 / 14 px), 4 kiểu đệm (0 8px, 1px 8px, 2px 10px, 4px 8px), có/không viền tuỳ khu.

### 2.4 Thẻ / khối nền trắng

| Kiểu vẽ | Class | Dòng | Bo góc | Viền | Bóng | Trang |
|---|---|---|---|---|---|---|
| A. Vành bằng bóng + bóng mềm | `.card` | 579 | 12px | không (vẽ bằng `--ring-card`) | `--shadow-card` | 24 trang |
| B. Viền 1px + bóng mềm | `.vc-card`, `.order-card`, `.svc` | 2315, 655, 1332 | 12px | `--c-border` | `--shadow-card` | 19 / 2 / form đơn |
| C. Viền 1px, không bóng | `.hdv-card`, `.cx-the`, `.xb-the`, `.cx-bang`, `.hdv-head` | 1072, 3833, 3382, 3823, 1046 | 12px | `--c-border` | không | mỗi họ 1 trang |
| D. Viền 1px, bo 8px | `.xm-the` (viền `--c-input-border` đậm hơn), `.dc-the`, `.hk-the`, `.pdt-dong`, `.dd-trong` | 805, 3686, 3278, 3669, 3203 | 8px | có | không | 1–2 trang |
| E. Lớp phủ nổi | `.maint-card`, `.tl-khung`, `.sheet` | 1657, 3127, 1555 | 18px | — / có / — | bóng to | khung chung |

Ngoài ra hơn 10 họ "thẻ" không tự vẽ khung (`.hh-the`, `.bg-the`, `.bk-the`, `.dp-cuoc-the`, `.dn-the`, `.list-card`, `.summary-card`, `.dash-viec-the`…) — chúng đặt **trên** `.card`/`.vc-card` rồi chỉ đổi đệm (12px 16px thay cho 16px).

### 2.5 Bảng trượt / hộp thoại — điểm sáng

Một khuôn duy nhất `.sheet-root / .sheet / .sheet-head / .sheet-body / .sheet-foot` (L1550–1575; L754 `.price-cell .sheet` là chữ "giá Sheet", trùng tên, không liên quan) được 20 tệp dùng (`bang-truot.ts`, `assignee-picker.ts`, `handler-sheet.ts`, `confirmation-dialog.ts`, `trip-sheet.ts`, `sheet-dua-don.ts`, `hoa-hong-*.ts`…). Các họ `.hdv-sheet`, `.assignee-sheet`, `.dd-sheet`, `.hk-sheet`, `.dp-hist-sheet` chỉ là lớp bổ sung trên khuôn này. Ngoại lệ: ngăn Thông báo `.ntf-panel` (L2226, ngăn phủ riêng), khung Trợ lý `.tl-khung` (cửa sổ nổi kéo được), lớp bảo trì `.maint-card`.

### 2.6 Trạng thái trống — 21 cách

| Class | Dòng | Đệm | Cỡ chữ | Khung | Trang |
|---|---|---|---|---|---|
| `.empty` | 711 | 32px 16px | kế thừa | không | 5 |
| `.vc-empty` (+ `-title`, `-text`, `-ok`) | 2357 | 32px 24px | — | không | 10 |
| `.ntf-empty` | 2260 | 32px 16px | 14px | không | ngăn Thông báo |
| `.hdv-empty` | 1064 | 24px 16px | — | **viền đứt 12px** | 1 |
| `.pick-empty` | 1615 | 24px 12px | — | không | 1 |
| `.assignee-empty` | 1651 | 24px 0 | 16px | không | 1 |
| `.vc-filter-empty` | 2380 | 24px 16px | 15px | không | 1 |
| `.catalog-empty`, `.cp-trong` | 1463, 3492 | 12px | — | không | 1 mỗi họ |
| `.dp-col-empty`, `.dp-stop-empty`, `.vc-empty-line` | 2851, 2773, 2601 | 12px 16px | 14px | không | 1 / 1 / 10 |
| `.ht-trong`, `.xdc-rong` | 976, 3110 | 16px | — | không | 1 / 2 |
| `.hk-trong` | 3270 | 12px 0 | — | không | 2 |
| `.dd-trong` | 3203 | 8px 12px | — | viền 8px | 2 |
| `.svc-empty`, `.dp-reason-empty`, `.dp-cuoc-trong` | 1361, 2668, 3025 | — | 14px | không | 1–2 |
| `.dash-chart-empty`, `.dash-viec-rong` | 1790, — | (riêng Trang chủ) | | | 1 |

Đệm có 9 tổ hợp khác nhau; cỡ chữ 14 / 15 / 16 px hoặc kế thừa.

### 2.7 Lỗi, cảnh báo, dải thông báo

- **Lỗi dưới ô**: `.field-error` (L1393), `.vc-field-error` (L2404), `.err` (L2290) — **cùng hệt giá trị** (14px, đậm 500, `--c-danger-text`) nhưng ba tên; thêm `.xb-loi-o` (L3377) **13px, đậm 400** — lệch duy nhất; `.cx-loi`, `.tx-loi`, `.hk-loi`, `.confirm-error`, `.pick-error-text`, `.vc-gt-error` là tên riêng từng khu.
- **Hộp báo**: `.alert` (L611, lỗi đỏ; `.alert.warn` cát), `.banner` + `banner-danger/warning/info` (L1301, web/banner.ts), `.vc-alert` + 4 tông (L2321, đệm 8px 12px, 14px — nhỏ hơn `.banner` 12px 16px), `.login-alert` (L1693). Ba họ đầu cùng một việc.
- **Hộp cảnh báo cát**: `.svc-warn` (L1395), `.vc-warnbox` (L2522), `.canh-bao-dt` (L3786), `.dp-cuoc-canh-bao` (L3022), `.cx-dai` (L3820, bo **12px** — các họ kia 8px), `.dg-warn`, `.kv-warn`, `.mfa-warn`, `.sheet-warn` — ≥ 9 tên, cùng cặp màu `--c-sand-soft` / `--c-sand-text`, đệm 8px 12px hoặc 12px.
- **Dải ngang khung trang**: `.maint-strip` (L1665, cát), `.mfa-strip` (L3763, đỏ), `.ntf-strip` (L2219, cát) — cùng khuôn 44px / 14px; nhất quán.
- **Thông báo nổi**: `.toast` (L2192) một khuôn duy nhất — nhất quán.

### 2.8 Đầu trang

- **h1 trần** (`h1 { font-size: --fs-h1 }` = 1.5rem = **24px**, L567): 31 trang khai `<h1>` không class trong HTML; 24 trong số đó ra đúng 24px (audit, catalog, staff, orders, so-cong-no…), 6 nằm trong `.vc-page-head` / `.dp-cuoc-head` nên ra 26px, và trang đăng nhập có `.login-col h1` riêng (26 / 32px).
- **Đầu trang có tên riêng** (19 họ): `.vc-page-head` (L2342, h1 **26px** `--fs-vc-h`, 6 trang), `.dp-head` (L2817, h1 24px `--fs-vc-plate`), `.dp-cuoc-head` (L3004, 26px), `.vc-hello` (L2587, 26px, trang tài xế), `.vc-due-top` (L2560, 18px → 26px), `.xb-head` + `.xb-title` (L3365–3366, 24px), `.dp-ct-head` + `.dp-ct-title` (L2743–2744, 26px), `.hdv-head` (L1046, **là một thẻ** có viền, tiêu đề 22px), `.detail-head` (L720, h1 ẩn, thay bằng `.order-summary-band` nền xanh đậm L1532), `.ht-dau`, `.hh-dau`, `.bg-dau`, `.xdc-head`, `.dn-head`, `.xm-chi-tiet-dau`, `.scn-ct-dau`, `.dp-cc-head`, trang chủ `.dash-hero-*`, đăng nhập `.login-col h1` (26 / 32px).
- **Thanh công cụ trên danh sách**: `.toolbar` (L616, 4 trang), `.vc-filters` (Vận chuyển), `.scn-cong-cu` (sổ công nợ), `.ht-loc`, `.dp-loc`, `.hh-loc`, `.tx-loc` — mỗi khu một thanh lọc.
- **Nhãn nhỏ trên tiêu đề (eyebrow)**: `.vc-eyebrow` (12px), `.hdv-eyebrow` (14px), `.xb-eyebrow` (12px).

Tức là tiêu đề trang có **hai cỡ** (24 và 26 px) tuỳ khu, và khoảng 20 cách bố trí đầu trang.

### 2.9 CSS chết (không thấy trong `web/`, `public/*.html`, `src/shared/`)

`.fb-status` (L895, khối trạng thái Góp ý cũ, 4 class), `.dp-tx-ban-ds` (L3546), `.hh-mucta-dau` (L3635), `.hh-tn-kq-khung` (L3859). Đã kiểm cả cách dựng tên động (`` `x-${…}` ``, `"x-" + …`).

---

## 3. Token và giá trị thật

### 3.1 Tổng số
- `:root` (L26–558) khai **470 token**. Theo nhóm (đếm theo tiền tố tên): màu 103, kích thước lẻ khác 110, chiều rộng 92, cỡ chữ 56, chiều cao 35, khoảng cách 17, giãn chữ/dòng 15, bo góc 12, bóng/vành 11, độ đậm 7, chuyển động 6, phông 3, lớp z 3.
- **220 / 470 token (47%) mang tiền tố riêng của một khu**: `dp` 42, `vc` 37, Trang chủ (`home`, `tile`, `skel`, `hero`, `review`, `viec`) 69, `hdv` 12, `sidebar` 11, `xb` 10, `ntf` 8, `tl` 8, `login` 7, `tx` 6, `fb` 3, `ht` 3, `hs` 2, `buoc` 1, `hh` 1. Mỗi đợt thiết kế đẻ không gian token riêng.

### 3.2 Token trùng giá trị (tên khác, số y hệt)

| Nhóm | Số token | Số giá trị khác nhau | Token chỉ là tên trùng | Ví dụ |
|---|---|---|---|---|
| Cỡ chữ | 56 | 18 | **38** | 20px có 6 tên (`--fs-step-9`, `--fs-counter`, `--fs-pin`, `--fs-stat-sm`, `--fs-hdv-h`, `--fs-dp-stat`); 17px có 4 (`--fs-step-6`, `--fs-field`, `--fs-hdv-md`, `--fs-vc-md`) |
| Chiều cao | 43 | 21 | **22** | 52px: `--h-field`, `--h-field-wide`, `--h-hdv-btn`, `--h-dp-stop`, `--search-h`; 56px: 5 tên; 48px: 4 tên (`--counter-field`, `--row-h`, `--h-hdv-act`, `--h-dp-row`); 44px: `--tap-min` = `--counter-btn` |
| Bo góc | 12 | 10 | 2 | 6px: `--radius-xs` = `--radius-dp-tab` = `--radius-dp-khoi` |
| Độ đậm | 7 | 3 | 4 | `--fw-medium/semibold/bold/heavy/heading` đều = **500** (một độ đậm duy nhất, theo núm Giao diện ADR-0087) |
| Khoảng cách | 17 | 14 | 3 | 2px có 3 tên (`--gap-muc-menu`, `--gap-dp-hist`, `--gap-xb-xe`) |

### 3.3 Giá trị thực sự xuất hiện
- **Cỡ chữ (18 giá trị)**: thang 14 bậc 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 32 px — gần như mỗi px một bậc ở 12–20, nhiều bậc lệch lưới 4 (13, 15, 17, 19, 22, 26) — cộng 4 cỡ cũ lẻ còn sống: 12.8 (`--fs-old-badge`, 3 chỗ), 13.6 (`--fs-old-label`, 3 chỗ + nhãn ô toàn cục), 14.4 (`--fs-old-muted`, 1), 17.6 px (`--fs-h2`/`--fs-name`, 9). Trong luật có 52 biểu thức `font-size` khác nhau, **tất cả** là token.
- **Bo góc**: 3, 4, 6, 8, 12, 14, 18, 999 px, 22.37%, `8px 8px 2px 2px`; ngoài token còn `50%` (7 chỗ), `999px` viết cứng (1, ở `.badge`), `var(--s5)` dùng làm bo góc (1). Lệch lưới 4: 3, 6, 14, 18.
- **Chiều cao nút/ô/dòng**: 20, 26, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 76 px; `min-height: var(--tap-min)` (44px) xuất hiện **155 lần** — trục chính rất vững.
- **Khoảng cách**: thang `--s1…--s7` = đúng 4/8/12/16/24/32/48. Lệch thang: 10 token riêng (2, 6, 20, `3px 5px`, `2px 10px`, `2px 8px`, `0 6px`), `calc(var(--s1) / 2)` = 2px dùng 14 lần (10 ở `gap`, 4 ở `padding`). `padding` có 125 tổ hợp khác nhau, `gap` 25, `margin` 56 — nhưng gần hết ghép từ `--s*`.
- **Điểm gãy màn hình**: 11 mốc khác nhau — 641/640 (61 lần), 900/899 (40), 960/959 (5), 1200 (2), 1024, 1400, 720 và một `min-width: 640px` (L589, `.grid.two`) chồng lên `max-width: 640px`.

### 3.4 Giá trị viết cứng ngoài `:root`

| Vùng dòng | hex | px (khác 0/1px, ngoài `@media`) | rem |
|---|---|---|---|
| 1–25 (phông) | 0 | 0 | 0 |
| 559–874 (luật nền, trước mốc PWA) | 3 (`#fff`: nền ô nhập L583, nền `.btn` L591, chữ `.btn-accent` L599) | 18 (`10px 12px` ô nhập, `10px 18px` `.btn`, `2px 10px` + `999px` `.badge`, `72px` textarea, `220px` thanh công cụ, `4px 0`, `4px 6px`, `8px`…) | 5 (`10rem`, `12rem`, `14rem` ×2, `32rem` — bề rộng co giãn) |
| 875–3905 (từ mốc "app iPhone") | **0** | **0** | **0** |

Lưu ý cách đọc: chú thích L875 ghi `tests/e2e/pwa.mjs` kiểm cấm viết cứng từ mốc này tới cuối tệp. Vậy "0 giá trị cứng" là **một máy kiểm đang xanh**, không phải bằng chứng có một ngôn ngữ thiết kế. Sự lệch không nằm ở số viết cứng mà chuyển sang **không gian token riêng từng khu** (mục 3.1–3.2).

---

## 4. Bảng chi tiết từng kiểu (tầng tự vẽ khung + các họ dùng chung đáng so)

Cột: dòng khai luật gốc · số class trong họ · giá trị đã quy về px · số trang thật dùng. **In đậm** = chỉ một trang. Số họ ở mỗi tiêu đề dưới đây = tầng tự vẽ khung của mục 1 CỘNG các họ dùng chung được giữ lại để so (ví dụ `.toolbar`, `.vc-page-head`, `.empty`), nên lớn hơn cột «tự vẽ khung» ở mục 1.

### Nút — 16 họ (tự vẽ khung, cộng các họ dùng chung đáng so)

| Class gốc | Dòng | Số class trong họ | Cao | Bo góc | Cỡ chữ | Nền (token) | Số trang | Trang dùng |
|---|---|---|---|---|---|---|---|---|
| `.btn` | 591 | 7 | — | 8px | — | #fff | 45 | mọi trang (khung chung) |
| `.loc-nut` | 629 | 2 | 44px | 999px | 14px | --c-surface | 3 | order, order-form, orders |
| `.pill-btn` | 736 | 2 | 44px | 8px | 14px | --c-primary-soft | 11 | 11 trang |
| `.scn-loc-nut` | 847 | 1 | 44px | 999px | — | --c-card | 1 | **so-cong-no** (1 trang) |
| `.catalog-nut-nhom` | 1428 | 1 | 44px | 8px | 16px | --c-surface | 1 | **order-form** (1 trang) |
| `.hd-nut` | 2188 | 1 | — | 8px | — | --c-surface-alt | 1 | **help** (1 trang) |
| `.icon-btn` | 2233 | 1 | 44px | 8px | — | none | 45 | mọi trang (khung chung) |
| `.vc-btn` | 2324 | 8 | 44px | 8px | 16px | — | 25 | 25 trang |
| `.vc-step-btn` | 2407 | 1 | 44px | 8px | 22px | --c-surface | 1 | **xe-sua** (1 trang) |
| `.dp-gb-btn` | 3048 | 1 | 44px | — | 12px | — | 1 | **chuyen** (1 trang) |
| `.tl-fab` | 3119 | 1 | 44px | 999px | 14px | --c-fab-bg | 45 | mọi trang (khung chung) |
| `.tl-mau-nut` | 3166 | 1 | 44px | 999px | 14px | --c-primary-soft | 45 | mọi trang (khung chung) |
| `.xb-nut` | 3369 | 4 | 44px | 8px | 14px | --c-surface | 1 | **lich-xe-ban** (1 trang) |
| `.buoc-nut` | 3733 | 1 | 44px | — | 12px | none | 1 | **order-form** (1 trang) |
| `.gap-nut` | 3748 | 1 | 44px | — | — | — | 2 | order, order-form |
| `.hh-loai-nut` | 3863 | 1 | 44px | — | — | transparent | 1 | **hoa-hong** (1 trang) |

### Nút chuyển tab / phân đoạn — 7 họ (tự vẽ khung, cộng các họ dùng chung đáng so)

| Class gốc | Dòng | Số class trong họ | Cao | Bo góc | Cỡ chữ | Nền (token) | Số trang | Trang dùng |
|---|---|---|---|---|---|---|---|---|
| `.ht-tab` | 937 | 1 | 44px | — | — | none | 1 | **feedback** (1 trang) |
| `.tab` | 1144 | 3 | — | — | — | — | 45 | mọi trang (khung chung) |
| `.ntf-tab-n` | 2238 | 3 | — | 999px | 12px | --c-danger | 45 | mọi trang (khung chung) |
| `.vc-seg` | 2410 | 1 | — | 8px | — | — | 1 | **xe-sua** (1 trang) |
| `.dp-tabs` | 2834 | 1 | — | 8px | — | --c-primary-soft | 1 | **dieu-phoi** (1 trang) |
| `.dp-tab` | 2835 | 2 | 40px | 6px | 14px | transparent | 1 | **dieu-phoi** (1 trang) |
| `.tx-tab` | 3427 | 1 | 44px | 999px | 16px | --c-primary-soft | 2 | bang-gia-xe, hoa-hong |

### Thẻ / khối — 19 họ (tự vẽ khung, cộng các họ dùng chung đáng so)

| Class gốc | Dòng | Số class trong họ | Cao | Bo góc | Cỡ chữ | Nền (token) | Số trang | Trang dùng |
|---|---|---|---|---|---|---|---|---|
| `.card` | 579 | 3 | — | 12px | — | --c-bg | 24 | 24 trang |
| `.order-card` | 655 | 6 | — | 12px | — | --c-surface | 2 | giao-dien, orders |
| `.xm-the` | 805 | 2 | 44px | 8px | — | --c-surface | 2 | parties, staff |
| `.hdv-tile` | 1051 | 3 | 44px | 12px | 16px | — | 1 | **account** (1 trang) |
| `.hdv-card` | 1072 | 2 | — | 12px | — | --c-surface | 1 | **account** (1 trang) |
| `.catalog-khung` | 1441 | 1 | — | 8px | — | --c-surface | 1 | **order-form** (1 trang) |
| `.maint-card` | 1657 | 1 | — | 18px | — | --c-surface | 45 | mọi trang (khung chung) |
| `.dash-o-hop` | 1815 | 14 | 52px | 14px | — | --c-primary-soft | 1 | **home** (1 trang) |
| `.ntf-panel-head` | 2231 | 3 | — | — | — | --c-band-bg | 45 | mọi trang (khung chung) |
| `.vc-card` | 2315 | 2 | — | 12px | — | --c-surface | 19 | 19 trang |
| `.dp-panel` | 2672 | 3 | — | — | — | --c-surface-alt | 4 | dieu-kien-xuat-ben, ly-do-dieu-phoi, order, order-form |
| `.dg-panel` | 2694 | 2 | — | 8px | — | --c-surface-alt | 2 | order, order-form |
| `.dp-khoi` | 2887 | 6 | — | 6px | — | — | 1 | **dieu-phoi** (1 trang) |
| `.xdc-the` | 3103 | 2 | 44px | — | — | — | 1 | **xe-dang-chay** (1 trang) |
| `.tl-khung` | 3127 | 1 | var(--tl-h) | 18px | — | --c-surface | 45 | mọi trang (khung chung) |
| `.hk-the` | 3278 | 4 | — | 8px | — | — | 2 | order, order-form |
| `.xb-the` | 3382 | 1 | — | 12px | — | --c-surface | 1 | **lich-xe-ban** (1 trang) |
| `.dc-the` | 3686 | 1 | — | 8px | — | — | 1 | **dieu-chinh-cong-no** (1 trang) |
| `.cx-the` | 3833 | 4 | — | 12px | — | --c-surface | 1 | **cho-xac-nhan** (1 trang) |

### Bảng / danh sách / dòng — 12 họ (tự vẽ khung, cộng các họ dùng chung đáng so)

| Class gốc | Dòng | Số class trong họ | Cao | Bo góc | Cỡ chữ | Nền (token) | Số trang | Trang dùng |
|---|---|---|---|---|---|---|---|---|
| `.skeleton-row` | 691 | 1 | 76px | 12px | — | --c-surface | 1 | **orders** (1 trang) |
| `.px-anh-hang` | 826 | 1 | 44px | — | — | — | 1 | **parties** (1 trang) |
| `.sidebar-item` | 1201 | 6 | 40px | 8px | 14px | — | 45 | mọi trang (khung chung) |
| `.catalog-hang-mui` | 1434 | 4 | 44px | 8px | 18px | --c-surface | 1 | **order-form** (1 trang) |
| `.vc-due-row` | 2570 | 1 | 72px | — | — | — | 1 | **giay-to-sap-het-han** (1 trang) |
| `.tl-cd-ban-dong` | 3175 | 1 | — | 8px | — | --c-surface-alt | 1 | **tro-ly-cai-dat** (1 trang) |
| `.dd-goi-y-ds` | 3240 | 1 | — | 8px | — | --c-surface | 2 | order, order-form |
| `.dd-goi-y-dong` | 3242 | 1 | 44px | — | 16px | — | 2 | order, order-form |
| `.tx-dm-dong` | 3461 | 1 | 44px | — | — | — | 1 | **bang-gia-xe** (1 trang) |
| `.cp-ds` | 3479 | 1 | — | 8px | — | — | 1 | **chuyen** (1 trang) |
| `.pdt-dong` | 3669 | 2 | — | 8px | — | --c-surface | 1 | **order** (1 trang) |
| `.cx-bang` | 3823 | 1 | — | 12px | — | --c-surface | 1 | **order** (1 trang) |

### Huy hiệu / chip trạng thái — 17 họ (tự vẽ khung, cộng các họ dùng chung đáng so)

| Class gốc | Dòng | Số class trong họ | Cao | Bo góc | Cỡ chữ | Nền (token) | Số trang | Trang dùng |
|---|---|---|---|---|---|---|---|---|
| `.loc-chip-muc` | 622 | 3 | 44px | 999px | 14px | --c-primary-soft | 1 | **orders** (1 trang) |
| `.badge` | 694 | 7 | — | 999px | 12.8px | — | 45 | mọi trang (khung chung) |
| `.fb-status` | 895 | 4 | — | 12px | — | --c-surface | 0 | **không trang nào (CSS chết)** |
| `.ht-chip` | 992 | 1 | 44px | 999px | 14px | --c-surface | 1 | **feedback** (1 trang) |
| `.hdv-chip` | 1078 | 3 | — | — | — | — | 2 | account, order-form |
| `.chip` | 1313 | 6 | — | 999px | 12px | — | 45 | mọi trang (khung chung) |
| `.tag-price` | 1318 | 1 | — | 8px | 14px | --c-accent-soft | 2 | order, order-form |
| `.svc-chip-gon` | 1347 | 1 | — | 999px | 12px | --c-sand-soft | 1 | **order-form** (1 trang) |
| `.confirm-status` | 1582 | 1 | 44px | — | — | — | 1 | **order** (1 trang) |
| `.ntf-badge` | 2247 | 6 | 36px | 999px | — | --c-primary-soft | 45 | mọi trang (khung chung) |
| `.ntf-chip` | 2256 | 4 | — | 999px | 12px | — | 45 | mọi trang (khung chung) |
| `.vc-chip` | 2316 | 5 | — | 999px | 12px | — | 22 | 22 trang |
| `.vc-pill-old` | 2468 | 1 | — | 999px | 12px | --c-surface | 2 | parties, xe-chi-tiet |
| `.vc-badge` | 2549 | 1 | — | 999px | 12px | --c-sand | 1 | **account** (1 trang) |
| `.dp-chip-danger` | 2705 | 6 | — | — | — | --c-danger-soft | 2 | chuyen, order |
| `.dp-leg-pill` | 2833 | 1 | 44px | 999px | 14px | — | 1 | **dieu-phoi** (1 trang) |
| `.cp-chip-vien` | 3486 | 2 | — | — | — | --c-surface | 1 | **chuyen** (1 trang) |

### Ô nhập / công tắc / ô chọn — 12 họ (tự vẽ khung, cộng các họ dùng chung đáng so)

| Class gốc | Dòng | Số class trong họ | Cao | Bo góc | Cỡ chữ | Nền (token) | Số trang | Trang dùng |
|---|---|---|---|---|---|---|---|---|
| `.sidebar-group-toggle` | 1211 | 1 | 36px | 8px | 14px | none | 45 | mọi trang (khung chung) |
| `.counter` | 1322 | 3 | — | 8px | — | --c-surface | 4 | account, chuyen, order, order-form |
| `.price-field` | 1328 | 1 | 44px | — | 16px | — | 1 | **order-form** (1 trang) |
| `.catalog-tim-xoa` | 1423 | 3 | 44px | 8px | — | none | 1 | **order-form** (1 trang) |
| `.assignee-search` | 1639 | 1 | 44px | 12px | 16px | — | 1 | **order-form** (1 trang) |
| `.login-pin-toggle` | 1706 | 1 | 44px | 6px | 14px | transparent | 1 | **login** (1 trang) |
| `.vc-input` | 2401 | 1 | 52px | 8px | 17px | --c-surface | 24 | 24 trang |
| `.vc-radio-dot` | 2491 | 1 | 20px | 999px | — | — | 22 | 22 trang |
| `.dp-toggle` | 2623 | 4 | 56px | — | — | — | 2 | chinh-sach-dieu-phoi, feedback |
| `.dp-switch` | 2629 | 2 | 26px | 999px | — | --c-border | 4 | chinh-sach-dieu-phoi, feedback, order, order-form |
| `.dd-switch-khung` | 3221 | 3 | 44px | 8px | — | --c-surface | 2 | order, order-form |
| `.dd-radio` | 3255 | 5 | 48px | 8px | 16px | --c-surface | 2 | order, order-form |

### Bảng trượt / hộp thoại — 3 họ (tự vẽ khung, cộng các họ dùng chung đáng so)

| Class gốc | Dòng | Số class trong họ | Cao | Bo góc | Cỡ chữ | Nền (token) | Số trang | Trang dùng |
|---|---|---|---|---|---|---|---|---|
| `.px-hop` | 821 | 1 | — | 8px | — | — | 1 | **parties** (1 trang) |
| `.sheet` | 1555 | 13 | — | 18px 18px 0 0 | — | --c-surface | 45 | mọi trang (khung chung) |
| `.dp-sheet-sum` | 2712 | 6 | — | 8px | — | --c-surface-alt | 11 | 11 trang |

### Thông báo / lỗi / trống / cảnh báo — 21 họ (tự vẽ khung, cộng các họ dùng chung đáng so)

| Class gốc | Dòng | Số class trong họ | Cao | Bo góc | Cỡ chữ | Nền (token) | Số trang | Trang dùng |
|---|---|---|---|---|---|---|---|---|
| `.alert` | 611 | 1 | — | 8px | — | --c-danger-soft | 45 | mọi trang (khung chung) |
| `.empty` | 711 | 1 | — | — | — | — | 5 | 5 trang |
| `.ht-tra-loi` | 1025 | 1 | — | — | — | --c-surface-alt | 1 | **feedback** (1 trang) |
| `.hdv-empty` | 1064 | 1 | — | 12px | — | --c-surface | 1 | **account** (1 trang) |
| `.banner` | 1301 | 8 | — | 8px | — | — | 45 | mọi trang (khung chung) |
| `.svc-warn` | 1395 | 1 | — | 8px | 14px | --c-sand-soft | 1 | **order-form** (1 trang) |
| `.hint` | 1396 | 1 | — | — | 14px | — | 27 | 27 trang |
| `.maint-strip` | 1665 | 1 | 44px | — | 14px | --c-sand-soft | 45 | mọi trang (khung chung) |
| `.login-alert` | 1693 | 1 | — | 8px | 14px | — | 1 | **login** (1 trang) |
| `.toast` | 2192 | 3 | 44px | 12px | 14px | --c-surface | 45 | mọi trang (khung chung) |
| `.ntf-strip` | 2219 | 3 | — | — | — | --c-sand-soft | 45 | mọi trang (khung chung) |
| `.err` | 2290 | 1 | — | — | 14px | — | 45 | mọi trang (khung chung) |
| `.vc-alert` | 2321 | 5 | — | 8px | 14px | — | 22 | 22 trang |
| `.vc-empty` | 2357 | 5 | — | — | — | — | 10 | 10 trang |
| `.vc-hint` | 2405 | 1 | — | — | 14px | — | 22 | 22 trang |
| `.vc-warnbox` | 2522 | 1 | — | 8px | — | --c-sand-soft | 22 | 22 trang |
| `.dp-cuoc-canh-bao` | 3022 | 1 | — | 8px | 14px | --c-sand-soft | 1 | **cuoc** (1 trang) |
| `.tl-tin-loi` | 3146 | 1 | — | — | — | --c-danger-soft | 45 | mọi trang (khung chung) |
| `.dd-trong` | 3203 | 1 | — | 8px | — | — | 2 | order, order-form |
| `.mfa-strip` | 3763 | 1 | 44px | — | 14px | --c-danger-soft | 45 | mọi trang (khung chung) |
| `.canh-bao-dt` | 3786 | 3 | — | 8px | — | --c-sand-soft | 2 | order, order-form |

### Đầu trang / tiêu đề vùng — 19 họ (tự vẽ khung, cộng các họ dùng chung đáng so)

| Class gốc | Dòng | Số class trong họ | Cao | Bo góc | Cỡ chữ | Nền (token) | Số trang | Trang dùng |
|---|---|---|---|---|---|---|---|---|
| `.toolbar` | 616 | 1 | — | — | — | — | 4 | audit, catalog, orders, sessions |
| `.detail-head` | 720 | 1 | — | — | — | — | 1 | **order** (1 trang) |
| `.ht-dau` | 934 | 1 | — | — | — | — | 1 | **feedback** (1 trang) |
| `.hdv-head` | 1046 | 1 | — | 12px | — | --c-surface | 1 | **account** (1 trang) |
| `.catalog-dau` | 1443 | 1 | — | — | 14px | --c-surface-alt | 1 | **order-form** (1 trang) |
| `.dash-chart-bar` | 1787 | 2 | — | 8px 8px 0 0 | — | --c-primary-soft | 1 | **home** (1 trang) |
| `.ntf-bar` | 2297 | 1 | 4px | 8px | — | --c-surface-alt | 1 | **gui-thong-bao** (1 trang) |
| `.vc-page-head` | 2342 | 1 | — | — | — | — | 6 | 6 trang |
| `.vc-bottom-bar` | 2350 | 1 | — | — | — | --c-surface-alt | 45 | mọi trang (khung chung) |
| `.dp-head` | 2817 | 2 | — | — | — | — | 2 | dieu-phoi, ly-do-dieu-phoi |
| `.dp-cuoc-head` | 3004 | 1 | — | — | — | — | 2 | ban, cuoc |
| `.xdc-head` | 3101 | 1 | — | — | — | — | 2 | de-nghi, xe-dang-chay |
| `.dn-head` | 3114 | 1 | — | — | — | — | 1 | **de-nghi** (1 trang) |
| `.xb-head` | 3365 | 1 | — | — | — | — | 1 | **lich-xe-ban** (1 trang) |
| `.xb-dau-xe` | 3384 | 2 | — | — | — | --c-surface | 1 | **lich-xe-ban** (1 trang) |
| `.bg-dau` | 3420 | 1 | — | — | — | — | 1 | **bang-gia-xe** (1 trang) |
| `.bk-nhom-dau` | 3499 | 1 | — | — | — | --c-band-bg | 1 | **bang-ke-xe** (1 trang) |
| `.dp-cc-xong-tieu-de` | 3558 | 1 | 44px | — | — | — | 1 | **cuoc-chuyen** (1 trang) |
| `.hh-dau` | 3844 | 1 | — | — | — | — | 1 | **hoa-hong** (1 trang) |


---

## 5. Từ vựng trạng thái (chữ và màu)

Nguồn chuẩn có sẵn: `src/shared/order-status-label.ts` (`STATUS_LABEL`: draft "Chờ xác nhận", confirmed "Đã xác nhận", cancelled "Đã huỷ"; `trangThaiHienThi` thêm "Đã giao – đã thu đủ", "Hoàn thành") và `src/shared/dieu-phoi-kieu.ts` (`NHAN_TRANG_THAI_CHUYEN`: "Đã lên kế hoạch", "Đang chạy", "Đã kết thúc", "Kết thúc gián đoạn", "Đã huỷ"). Chính tả "huỷ" thống nhất (0 chỗ "hủy" trong `web/` và `src/shared/`).

| Trạng thái | Chữ ở nguồn chuẩn | Chữ khác đang hiện | Class màu đi kèm (theo trang) | Lệch |
|---|---|---|---|---|
| Đơn chưa xác nhận (draft) | "Chờ xác nhận" | "Đơn nháp", "Nháp của bạn, chưa xác nhận" (`web/home.ts:723`, ô số Trang chủ) — ADR-0030 đã bỏ chữ "Nháp" | `.badge-draft` (danh sách/chi tiết đơn), `.chip.hdv-chip.chip-warn` (Việc của tôi), `.ntf-badge-cho` (Thông báo), `.cx-dai` (dải Chờ xác nhận) — đều cát | chữ lệch ở Trang chủ; 4 tên class cho một màu |
| Đơn đã xác nhận | "Đã xác nhận" | — | `.badge-confirmed`, `.hdv-chip-ok`, `.ntf-badge-nhan`, `.ntf-chip-ok` — xanh lá | 4 tên class |
| Đơn đã huỷ | "Đã huỷ" | "Đã huỷ — cọc còn giữ" (`so-cong-no-hien-thi.ts:9`, có chủ đích) | `.badge-cancelled` = **xám** | ngăn Thông báo tô loại tin "huỷ" (đơn bị huỷ) bằng `.ntf-badge-huy` = **đỏ**. Ngoài ra **chuyến** đã huỷ (thực thể khác) trên bảng kê xe thuê cũng ghi "Đã huỷ" nhưng `tone: "danger"` = **đỏ** (`tien-xe-hien-thi.ts:89`) → cùng chữ, hai màu tuỳ màn |
| Đơn đã giao / hoàn thành | "Đã giao – đã thu đủ" / "Hoàn thành" | "Hoàn tất" chỉ còn trong chú thích changelog | `.badge-delivered`, `.badge-completed` | thống nhất |
| Chuyến PLANNED | "Đã lên kế hoạch" (khối xe trên trang đơn) | "Lên kế hoạch" (chú thích Điều phối, `dieu-phoi.ts:349`), "Chưa chạy" (bảng kê, `tien-xe-hien-thi.ts:87`) | `.dp-khoi.is-plan` (dòng thời gian), `.dp-chip-unit` (bảng kê) | 3 chữ cho một trạng thái |
| Chuyến RUNNING | "Đang chạy" | — | `navy` ở Xe đang chạy (`xe-dang-chay.ts:43`) và bảng kê; `unit` (xanh nhạt) ở Cuốc của tôi (`tien-do-man.ts:272`); `.dp-khoi.is-run` | cùng chữ, hai tông |
| Chuyến ENDED | "Đã kết thúc" | "Xong" (chú thích Điều phối), "Đã phát sinh" (bảng kê), "Kết thúc" (dòng mốc `chuyen.ts:152`, `cuoc-chuyen.ts:564`) | `.dp-khoi.is-done`, `.dp-chip-ok` | 4 chữ |
| Chuyến bị giữ | (không có trong tập trạng thái) | "Bị giữ" (Điều phối + Cuốc) | `.dp-khoi.is-held`, `tone: danger` | thống nhất |
| Quá hạn | (không có nguồn chung) | "Quá hạn" ở chờ xác nhận, phiếu xoá dữ liệu, Trang chủ | `.cx-nhan-qua-han` (14px, không viền), `.px-qua-han` (12.8px, có viền), `.dash-cho-dt-qua-han`, `.cx-dai-qua-han` | 4 class, 2 cỡ |
| Giấy tờ xe | `NHAN_TRANG_THAI_XE` + `TONE_TRANG_THAI_XE` (`giay-to-hien-thi.ts`) | "Sắp hết hạn", "Hết hạn" | `.vc-chip-*`, `.vc-tone-*`, `.vc-alert-*` | thống nhất trong khu Vận chuyển, nhưng tên tông riêng |
| Yêu cầu điều chỉnh công nợ | `NHAN_TRANG_THAI` + `LOP_TRANG_THAI` (`dieu-chinh-hien-thi.ts`): "Chờ duyệt", "Đã duyệt", "Bị từ chối", "Đã rút", "Hết hạn" | — | **mượn lớp của đơn**: `badge badge-draft` (Chờ duyệt, cát), `badge-confirmed` (Đã duyệt, xanh lá), `badge-cancelled` (Bị từ chối, xám), `badge` trơn không màu (Đã rút, Hết hạn) | một nguồn chữ, nhưng tên lớp mang nghĩa trạng thái đơn ("draft" = Chờ duyệt); "Hết hạn" ở đây không màu, trong khi "Quá hạn" ở chỗ khác là viên đỏ |
| Số dư một bên (Sổ công nợ) | `cauSoDu` (`so-cong-no-hien-thi.ts`): "Đang giữ …", "Công ty nợ …", "Không còn số dư"; ô lọc cùng chữ (`NHAN_LOC`) | đơn đã huỷ còn cọc: "Đã huỷ — cọc còn giữ" | chữ màu, không viên: `.scn-giu` (xanh primary), `.scn-no` (chữ cát), `.scn-huy` (chữ đỏ) | thống nhất trong màn; nhưng màu cát ở đây nghĩa là "công ty nợ", ở đơn nghĩa là "chờ xác nhận" |
| Tháng đã khoá sổ | — | tên tháng | `badge badge-confirmed` (xanh lá) ở `web/khoa-thang.ts:194` | lại mượn lớp trạng thái đơn |

**Bộ tên màu song song**: ít nhất 9 bộ class tô cùng khoảng 5 cặp màu (cát = chờ/cảnh báo, xanh lá = được, đỏ = huỷ/lỗi, xanh nhạt = đơn vị/đang, xám = phụ): `badge-*` (theo mã trạng thái), `chip-*` (unit/muted/warn — không có `chip-ok`), `dp-chip-*` (6: danger/warn/unit/muted/ok/navy), `vc-chip-*` (4), `vc-alert-*` (4), `vc-tone-*`, `ntf-chip-*` (ok/muted/qt), `ntf-badge-*` (cho/nhan/huy/tin), `hdv-chip-*` (ok/muted), cộng bổ ngữ `is-ok/is-warn/is-danger/is-navy/is-sand`. Lệnh grep ở 8.6 đếm được 91 tên class kết thúc bằng hậu tố tông/trạng thái.

---

## 6. Vùng CSS theo đợt thiết kế

Tệp có 39 đoạn mở bằng `/* ----------` sau `:root`; **28** đoạn nhắc đợt / bản vẽ / ngày / bản số trong chú thích (152 dòng chú thích sau L558 có từ khoá loại này). Các đoạn chính định nghĩa lại nút, thẻ hoặc đầu trang của riêng mình:

| Dòng | Đợt / bản vẽ (theo chú thích) | Nút riêng | Thẻ / khối riêng | Đầu trang riêng | Tab / chip riêng |
|---|---|---|---|---|---|
| 559–788 | Luật nền (1.70 "Thị giác", Đợt E thẻ đơn) | `.btn*`, `.pill-btn`, `.loc-nut` | `.card`, `.order-card` | `.toolbar`, `.detail-head` | `.badge-*`, `.loc-chip` |
| 875–1182 | "app iPhone (PWA)"; Góp ý (ảnh phác 30/9), Hỗ trợ PR 3, "Việc của tôi – HDV v2" (bản thiết kế) | `.ht-nut-*` | `.hdv-card`, `.hdv-tile`, `.xm-the` | `.hdv-head`, `.ht-dau` | `.ht-tab`, `.ht-chip`, `.hdv-chip`, `.fb-status` (chết) |
| 1183–1293 | Đợt D Task 4 (thanh bên, ADR-0015) | `.sidebar-new`, `.topbar-new` | — | `.sidebar-head` | `.sidebar-item-badge` |
| 1294–1515 | A2 form + "thiết kế lại 18/10/2026" + "Tạo đơn" Việc 8 | `.catalog-nut-nhom`, `.mobile-sum-nut`, thang nút ba cấp riêng form Tạo đơn (L1495) | `.svc`, `.catalog-khung` | `.catalog-dau` | `.chip*`, `.tag-price`, `.svc-chip-gon` |
| 1530–1549 | Bước 2 Đợt B (dải tóm tắt) | — | `.order-summary-band` | (thay h1) | — |
| 1681–1750 | "Đăng nhập.dc.html" (Claude Design 24/9, "tuân thủ 100%") | `.login-submit`, `.login-passkey-btn` | `.login-col` | `.login-col h1` 26/32px | — |
| 1751–2205 | Trang chủ mới; điện thoại "Trang chu dien thoai.dc.html" (30/9); máy tính "Trang chu Quan tri.dc.html" (2/10, 1.73) | `.dash-hero-nut`, `.dash-viec-nut`, `.dash-loi-nut` | `.dash-o-hop` (ô 52px bo 14px), `.dash-viec-the`, `.dash-tc` | `.dash-hero-*`, `.dash-today-head`, `.dash-review-head` | `.dash-day` |
| 2310–2614 | Vận chuyển lượt 1a — "bản vẽ Claude Design docs/design/van-chuyen-1a/" (28/9) | `.vc-btn` + 6 biến thể, `.vc-step-btn` | `.vc-card`, `.vc-xe-card` | `.vc-page-head` (h1 26px), `.vc-hello`, `.vc-due-top` | `.vc-chip-*`, `.vc-seg`, `.vc-badge` |
| 2615–3117 | Bảng điều phối lượt 1 (V12, V13, B1–B3, bản vẽ docs/design/van-chuyen-dieu-phoi/) + Đợt 5 | `.dp-run-btn`, `.dp-gb-btn`, `.dp-khach-btn`, `.dp-cxl-btn`, `.dp-viec-vp-nut` | `.dp-panel`, `.dg-panel`, `.dp-khoi`, `.dp-cuoc-the`, `.xdc-the` | `.dp-head`, `.dp-ct-head`, `.dp-cuoc-head`, `.dp-cc-head`, `.xdc-head`, `.dn-head` | `.dp-tabs`/`.dp-tab`, `.dp-chip-*`, `.dp-leg-pill` |
| 3118–3197 | Trợ lý Hỗ trợ (ADR-0066/0069) | `.tl-fab`, `.tl-mau-nut` | `.tl-khung` | `.tl-dau` | — |
| 3198–3361 | Đưa đón / hành khách (bản vẽ 2026-10-01 M1–M7) | `.dd-nut`, `.dd-bo-nut` | `.hk-the`, `.dd-card`, `.hk-card` | — | `.dd-chip-dong`, `.dd-radio` |
| 3362–3412 | Lịch xe bận (bản vẽ 2/10, Vận chuyển Đợt 3) | `.xb-nut` (4 biến thể) | `.xb-the` | `.xb-head`, `.xb-title` 24px, `.xb-eyebrow` | `.nhan-chip` |
| 3418–3529 | Tiền xe thuê (bản vẽ Đợt 4 G1/G2/G4) | `.tx-nut-dong`, `.tx-form-nut`, `.cp-nut` | `.bg-the`, `.bk-the`, `.cp-khoi` | `.bg-dau`, `.bk-nhom-dau` | `.tx-tabs`/`.tx-tab`, `.cp-chip-*` |
| 3549–3698 | C2 tài xế đang chạy, gói C3 (đánh giá ERP 7/10), sổ đại lý đợt 1 | `.dc-nut`, `.dc-kq-nut`, `.pdt-nut` | `.dc-the`, `.pdt-dong` | — | `.pdt-trang-thai` |
| 3720–3761 | Tạo đơn bốn bước (14/10) | `.buoc-nut`, `.gap-nut` | — | `.buoc-thanh` | — |
| 3762–3818 | Bảo mật hai lớp, cảnh báo đối tác, hạn mức Từ chối | `.hm-nut` | `.hm-card` | `.hm-title` (17.6px) | `.mfa-badge` |
| 3819–3906 | Xác nhận đơn (ADR-0136) + "Hoa hồng thiết kế lại (PR 2)" | `.hh-tn-nut`, `.hh-loai-nut` | `.cx-the`, `.cx-bang`, `.hh-the` | `.hh-dau`, `.cx-tieu-de` | `.cx-nhan-*` |

Mẫu lặp: **mỗi đợt có bản vẽ riêng thì có nút + thẻ + đầu trang riêng**, dù đều đúc từ token chung. Ba đợt tự dựng hẳn hệ thành phần (Vận chuyển `vc-*`, Điều phối `dp-*`, Trang chủ `dash-*`); các đợt sau (Lịch xe bận, Tiền xe thuê, Hoa hồng) ghi "chỉ token" nhưng vẫn đặt tên nút/thẻ/đầu trang mới.

---

## 7. Kết luận

1. Giả thuyết "không cùng một ngôn ngữ" **đúng ở tầng thành phần**: 107 kiểu tự vẽ khung cho 9 loại thành phần, 54 kiểu (50%) chỉ sống ở một trang; có 7 cách vẽ tab, 5 cách vẽ thẻ trắng, 21 cách vẽ "trống", ≥ 9 tên cho hộp cảnh báo cát, ≥ 9 bộ tên màu trạng thái, khoảng 20 cách bố trí đầu trang với tiêu đề 24 hoặc 26 px.
2. Giả thuyết **sai ở tầng con số**: sau mốc L875 không còn một giá trị cứng nào; 155 chỗ dùng chung `--tap-min` 44px, 14/16 họ nút cao đúng 44px, khoảng cách bám thang 4/8/12/16/24/32/48, mọi `font-size` đều là token, cả Nền tảng chỉ một độ đậm (500). Màu cũng chung: các bộ class trạng thái tô cùng ~5 cặp màu.
3. Gốc của sự lệch là **mỗi đợt thiết kế đẻ tên mới**: 220/470 token (47%) mang tiền tố riêng một khu, 38/56 token cỡ chữ và 22/43 token chiều cao chỉ là tên khác của cùng một số. Máy kiểm `pwa.mjs` chặn viết cứng nhưng không chặn đặt tên trùng nghĩa, nên lệch chuyển từ "số" sang "tên".
4. Có **hai hệ nút song song** (`.btn*` khu bán hàng/quản trị, `.vc-btn*` khu Vận chuyển/Điều phối/Hoa hồng) với nghĩa "danger" ngược nhau (chữ đỏ viền đỏ so với nền đỏ chữ trắng); vùng luật nền 559–874 còn 26 giá trị cứng (`.btn` `#fff` + `10px 18px`, `.badge` `999px` + 12.8px) vì nằm trước mốc máy kiểm.
5. Điểm **đã thống nhất** nên giữ làm khuôn: bảng trượt `.sheet*` (20 tệp), thông báo nổi `.toast`, dải khung trang `*-strip`, bảng ≥ 900px / thẻ ở điện thoại `.table-wrap` + `.card-list` (13 / 24 trang).
6. Từ vựng trạng thái **gần thống nhất cho đơn, lệch cho chuyến, mượn tên ở công nợ**: đơn có một nguồn chữ (chỉ Trang chủ còn "Đơn nháp"), nhưng "huỷ" xám ở đơn và đỏ ở Thông báo/bảng kê chuyến; chuyến có 3 chữ cho "kế hoạch", 4 chữ cho "đã kết thúc" và hai tông cho "Đang chạy"; công nợ và khoá tháng dùng lại lớp `badge-draft/confirmed/cancelled` của đơn cho nghĩa khác, và màu cát vừa là "chờ" vừa là "công ty nợ".
7. Còn 4 họ CSS chết và 11 mốc điểm gãy màn hình (2 cặp chính 640/641, 899/900 cộng 7 mốc lẻ).

---

## 8. Cách đếm lại (lệnh đã dùng)

Kịch bản Python ở `/Users/tuanbao/.claude/jobs/a45f9ae5/tmp/scr/` (chạy bằng `python3 -I`, chỉ đọc kho). Đặt `R=/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/danh-gia-ux-tong-the` và `S=/Users/tuanbao/.claude/jobs/a45f9ae5/tmp/scr`.

8.1 Tách luật CSS (2.779 luật) và tên class (1.806):
```
python3 -I $S/parse.py $R/public/app.css $S/rules.json
python3 -I $S/classes.py $S/rules.json $S/cls.json
```
8.2 Token (470) và nhóm (token trùng giá trị: `syn.py` ở 8.4, vì cần `an.json`):
```
python3 -I $S/tokens.py $R/public/app.css
```
8.3 Bản đồ tệp → trang (45 điểm vào của `build:web`, theo `import`):
```
python3 -I $S/pages.py $R $S/pages.json
```
8.4 Họ thành phần, tầng tự vẽ khung, trang dùng, CSS chết (bảng mục 1, mục 4):
```
python3 -I $S/analyze.py $R $S/rules.json $S/pages.json $S/an.json
python3 -I $S/syn.py $S/an.json          # token trùng giá trị (mục 3.2), modul-tiền-tố đếm bằng regex trên an.json['tok']
python3 -I $S/show2.py $S/an.json button,tab,badge,sheet
python3 -I $S/gen_detail.py $S/an.json $S/detail.md
python3 -I $S/q.py $S/an.json $S/rules.json $S/pages.json btn,vc-btn,badge,chip,vc-chip,card,vc-card   # so từng class
```
8.5 Giá trị cứng theo vùng và các giá trị `font-size` / `border-radius` / `height` / `gap` / `padding` / `margin` thực dùng:
```
python3 -I $S/values.py $R/public/app.css $S/rules.json
awk 'NR>558' $R/public/app.css | sed 's#/\*[^*]*\*/##g' | grep -noE ":[^;{}]*#[0-9a-fA-F]{3,8}\b"
grep -oE "@media[^{]*" $R/public/app.css | grep -oE "(min|max)-width: *[0-9]+px" | sed 's/ //g' | sort | uniq -c
grep -o "min-height: var(--tap-min)" $R/public/app.css | wc -l     # 155
```
8.6 Vùng theo đợt và từ vựng trạng thái:
```
python3 -I $S/regions.py $R/public/app.css $S/an.json
grep -oE "\.[a-z][a-z0-9-]*-(ok|warn|warning|danger|muted|navy|unit|info|draft|confirmed|cancelled|delivered|completed|cho|nhan|huy|sand|accent)\b" $R/public/app.css | sort -u | wc -l
grep -rn --exclude="*.test.ts" -E '"[^"]*(Nháp|Đã xác nhận|Hoàn tất|Hoàn thành|Đã huỷ)[^"]*"' $R/web $R/src/shared
grep -rl --exclude="*.test.ts" "hủy" $R/web $R/src/shared | wc -l      # 0 = chính tả "huỷ" thống nhất
grep -rnE "fb-status|dp-tx-ban-ds|hh-mucta-dau|tn-kq-khung" $R/web $R/public/*.html $R/src/shared   # rỗng = CSS chết
```

**Giới hạn đã biết của cách đếm** (không làm đổi kết luận): (a) phân loại theo danh từ trong tên nên vài họ lệch loại (`.ht-chip` là nút lọc nhưng xếp vào chip; `.tab` là thanh tab đáy); (b) "trang dùng" truy theo `import` tĩnh nên một module nạp từ khung chung (`shell.ts`, `tro-ly.ts`) tính là "mọi trang" — ví dụ `.vc-bottom-bar` thật chỉ ở 7 trang, `tro-ly.ts` chỉ nhắc tên nó; (c) thuộc tính lấy từ luật bộ chọn trần ngoài `@media`, nên họ chỉ được tô trong ngữ cảnh (`.login-actions .login-submit`) hiện "—"; (d) chưa chạy trình duyệt để đo kích thước hiển thị thật — mọi số là số khai trong CSS.

---

## Phụ lục B — toàn bộ họ class thô theo loại (tên gốc · dòng khai đầu)

**Nút (44):** `.btn`·591, `.login-submit`·597, `.loc-nut`·629, `.pill-btn`·736, `.nhom-nut`·765, `.chon-nut`·779, `.scn-loc-nut`·847, `.ht-loc-nut`·964, `.ht-nut-chi-tiet`·1002, `.catalog-nut-nhom`·1428, `.mobile-sum-nut`·1476, `.login-passkey-btn`·1718, `.dash-hero-nut`·1809, `.dash-viec-nut`·2132, `.hd-nut`·2188, `.icon-btn`·2233, `.vc-btn`·2324, `.vc-step-btn`·2407, `.dp-cxl-btn`·2928, `.dp-run-btn`·2975, `.dp-khach-nut`·2987, `.dp-khach-btn`·2988, `.dp-gb-btn`·3048, `.dp-khach-nhom-nut`·3061, `.dp-khach-nhom-btn`·3062, `.dp-viec-vp-nut`·3075, `.tl-fab`·3119, `.tl-mau-nut`·3166, `.dd-bo-nut`·3207, `.dd-nut`·3227, `.gd-xem-nut`·3359, `.xb-nut`·3369, `.tx-nut-dong`·3437, `.tx-form-nut`·3454, `.cp-nut`·3493, `.co-nut-ho-tro`·3567, `.pdt-nut`·3679, `.dc-nut`·3690, `.dc-kq-nut`·3697, `.buoc-nut`·3733, `.gap-nut`·3748, `.hm-nut`·3809, `.hh-tn-nut`·3853, `.hh-loai-nut`·3863

**Nút chuyển tab / phân đoạn (12):** `.xm-tabs`·801, `.xm-tab`·802, `.ht-tabs`·936, `.ht-tab`·937, `.tab`·1144, `.ntf-tabs`·2235, `.ntf-tab-n`·2238, `.vc-seg`·2410, `.dp-tabs`·2834, `.dp-tab`·2835, `.tx-tabs`·3426, `.tx-tab`·3427

**Thẻ / khối (52):** `.card`·579, `.order-card`·655, `.kt-khoi`·705, `.qr-khung`·706, `.the-dau`·782, `.xm-the`·805, `.scn-khung`·840, `.hdv-tile`·1051, `.hdv-card`·1072, `.svc-the`·1353, `.catalog-khung`·1441, `.summary-card`·1489, `.owner-card`·1620, `.maint-card`·1657, `.dash-o-hop`·1815, `.dash-xuong-viec-the`·1987, `.dash-viec-the`·2122, `.ntf-panel-head`·2231, `.vc-card`·2315, `.vc-xe-card`·2372, `.dm-khoi`·2604, `.dp-panel`·2672, `.dg-panel`·2694, `.dp-card-head`·2721, `.dp-tl-card`·2862, `.dp-khoi`·2887, `.dp-cuoc-the`·3012, `.dp-khach-nhom-the`·3052, `.dp-khach-cho-the`·3078, `.xdc-the`·3103, `.dn-the`·3113, `.tl-khung`·3127, `.dd-hau-to-khung`·3224, `.dd-khung`·3233, `.hk-the`·3278, `.hk-card`·3283, `.dd-card`·3294, `.xb-the`·3382, `.bg-the`·3440, `.cp-khoi`·3469, `.bk-the`·3520, `.bb-khung`·3539, `.dp-cc-khoi`·3551, `.ky-khoi`·3602, `.dc-the`·3686, `.o-noi-khung`·3701, `.dd-chang-khung`·3751, `.login-mfa-card`·3781, `.hm-card`·3793, `.cx-the`·3833, `.hh-the`·3847, `.hh-tn-kq-khung`·3859

**Bảng / danh sách / dòng (141):** `.loc-dv-ds`·632, `.skeleton-list`·690, `.skeleton-row`·691, `.qr-dong`·708, `.table-wrap`·723, `.items`·724, `.pay-list`·738, `.cb-list`·739, `.nhom-ds`·758, `.nhom-dong`·759, `.nhom-sua-hang`·785, `.hs-dong`·790, `.xm-ds`·804, `.xm-hang-nut`·812, `.px-anh-ds`·825, `.px-anh-hang`·826, `.scn-ds`·849, `.scn-don-ds`·849, `.passkey-list`·889, `.passkey-row`·890, `.fb-tin-ds`·920, `.ht-nhom-dong`·948, `.ht-nhom-ngung-ds`·949, `.ht-bang-nhom`·953, `.ht-dong`·967, `.ht-buoc-dong`·1011, `.ht-luong-ds`·1018, `.ht-che-do-hang`·1029, `.list-card`·1040, `.row-link`·1041, `.hdv-pool-list`·1065, `.hdv-mine-list`·1065, `.hdv-pax-row`·1112, `.sidebar-group-items`·1196, `.sidebar-item`·1201, `.catalog-list`·1296, `.svc-list`·1331, `.guest-row`·1356, `.line`·1363, `.mline`·1370, `.dong-tien`·1385, `.svc-sua-gia-hang`·1390, `.catalog-hang-mui`·1434, `.catalog-row`·1447, `.mobile-sum-line`·1477, `.order-row-handler`·1594, `.pick-list`·1603, `.assignee-list`·1641, `.login-label-row`·1698, `.dash-today-row`·1776, `.dash-review-row`·1797, `.dash-hero-dong`·1809, `.dash-xuong-dong`·1878, `.dash-xuong-mt-dong`·1984, `.dash-tc-dong`·2109, `.dash-viec-hang`·2124, `.release-items`·2171, `.hd-ds`·2185, `.ntf-list-slot`·2240, `.ntf-item`·2242, `.ntf-sent-list`·2291, `.ntf-sent-item`·2292, `.vc-row-between`·2323, `.vc-list`·2371, `.vc-table`·2381, `.vc-xe-row`·2384, `.vc-doc-line`·2462, `.vc-hist-row`·2467, `.vc-dt-row`·2471, `.vc-dt-item`·2472, `.vc-no-row`·2508, `.vc-pt-row`·2514, `.vc-pt-item`·2515, `.vc-reveal-line`·2523, `.vc-due-list`·2569, `.vc-due-row`·2570, `.dp-hist-row`·2645, `.dp-xn-ds`·2716, `.dp-ct-line`·2762, `.dp-tl-hang`·2875, `.dp-chon-line`·2909, `.dp-run-list`·2954, `.dp-khach-dong`·2979, `.dp-cuoc-dong`·3017, `.dp-cc-di-kem-dong`·3029, `.dp-gb-dong`·3049, `.dp-cuu-ho-dong`·3097, `.xdc-list`·3102, `.xdc-dong`·3107, `.dn-ds-leo`·3116, `.tl-dong`·3138, `.tl-ds`·3142, `.tl-cd-hang`·3170, `.tl-cd-ds`·3171, `.tl-cd-ban-dong`·3175, `.phien-bang`·3195, `.dd-goi-y-ds`·3240, `.dd-goi-y-dong`·3242, `.hk-hang`·3274, `.hk-ds`·3277, `.dd-dong`·3288, `.dd-ten-dong`·3313, `.dd-che-do-ds`·3317, `.dd-hanh-dong`·3329, `.dd-bang-ls`·3334, `.dd-ds-ls`·3339, `.gd-dong`·3350, `.dp-ban-ds`·3409, `.dp-ban-dong`·3410, `.tx-bang`·3429, `.tx-hang-dau`·3430, `.bg-hang`·3431, `.bg-bang`·3446, `.tx-dm-dong`·3461, `.cp-ds`·3479, `.cp-dong`·3480, `.bk-hang`·3506, `.bk-bang`·3529, `.bb-hanh-dong`·3537, `.bb-ds`·3538, `.dp-tx-ban-ds`·3546, `.dp-cc-xong-ds`·3559, `.dp-cc-xong-dong`·3560, `.dp-leg-hang`·3578, `.dp-xep-ds`·3597, `.ky-dong`·3604, `.hh-mucta-dong-rieng`·3639, `.dqdt-hang`·3646, `.dqdt-dong`·3662, `.pdt-ds`·3668, `.pdt-dong`·3669, `.dc-ds`·3685, `.buoc-ds`·3730, `.hm-list`·3800, `.hm-row`·3801, `.hm-hanh-dong`·3808, `.cx-bang`·3823, `.cx-hang-nut`·3828, `.cx-ds-nut`·3829, `.hh-bang`·3860, `.hh-tl-dong`·3898

**Huy hiệu / chip trạng thái (30):** `.loc-chip-muc`·622, `.badge`·694, `.fb-status`·895, `.fb-badge`·914, `.ht-chips`·991, `.ht-chip`·992, `.hdv-chip`·1078, `.chip`·1313, `.tag-price`·1318, `.svc-chips`·1337, `.svc-gon-chips`·1346, `.svc-chip-gon`·1347, `.confirm-status`·1582, `.pick-status`·1615, `.ntf-badge`·2247, `.ntf-chip`·2256, `.vc-chip`·2316, `.vc-pill-old`·2468, `.vc-badge`·2549, `.dp-chips`·2636, `.dp-chip-danger`·2705, `.dp-leg-pill`·2833, `.dp-chon-tag`·2908, `.dp-run-chip`·3070, `.dd-chip-dong`·3312, `.nhan-chip`·3406, `.cp-chips`·3485, `.cp-chip-vien`·3486, `.pdt-trang-thai`·3666, `.mfa-badge`·3777

**Ô nhập / công tắc / ô chọn (39):** `.check`·750, `.hs-check`·793, `.scn-tim`·842, `.is-truong`·958, `.ht-switch`·1031, `.hdv-date`·1075, `.sidebar-group-toggle`·1211, `.counter`·1322, `.price-field`·1328, `.field-error`·1393, `.catalog-tim-xoa`·1423, `.assignee-search`·1639, `.login-field`·1696, `.login-pin-toggle`·1706, `.dash-tim`·1809, `.ntf-field`·2275, `.vc-hist-toggle`·2339, `.vc-field`·2399, `.vc-input`·2401, `.vc-stepper`·2406, `.vc-check`·2485, `.vc-radio-dot`·2491, `.vc-hello-date`·2588, `.dp-toggles`·2622, `.dp-toggle`·2623, `.dp-switch`·2629, `.dp-field-head`·2676, `.dp-date`·2819, `.dp-radio-text`·2929, `.dp-khai-gio-field`·3001, `.dp-cuoc-date`·3006, `.tl-cd-loc-tim`·3184, `.dd-switch-khung`·3221, `.dd-radio`·3255, `.xb-truong`·3374, `.hh-radio`·3616, `.hh-truong-nhan`·3617, `.hh-tim-ket-qua`·3619, `.cx-truong`·3826

**Bảng trượt / hộp thoại (13):** `.px-hop`·821, `.ht-hop-nut`·1016, `.hdv-sheet`·1107, `.sheet`·1555, `.assignee-sheet`·1634, `.ntf-dialog-actions`·2264, `.vc-sheet-text`·2424, `.dp-hist-sheet`·2650, `.dg-sheet-slot`·2697, `.dp-sheet-sum`·2712, `.hk-sheet`·3308, `.dd-sheet`·3343, `.hh-hop-khoi`·3895

**Thông báo / lỗi / trống / cảnh báo (69):** `.alert`·611, `.warn`·612, `.empty`·711, `.scn-canh-bao`·839, `.ht-trong`·976, `.ht-tra-loi`·1025, `.hdv-empty`·1064, `.banner`·1301, `.svc-co-loi`·1354, `.svc-empty`·1361, `.svc-warn`·1395, `.hint`·1396, `.catalog-empty`·1463, `.kv-warn`·1520, `.confirm-hint`·1581, `.confirm-error`·1585, `.pick-hint`·1602, `.pick-empty`·1615, `.pick-error-text`·1616, `.assignee-empty`·1651, `.maint-strip`·1665, `.login-alert`·1693, `.login-hint`·1721, `.dash-chart-empty`·1790, `.dash-loi-ico`·1809, `.dash-dai-loi`·1959, `.is-loi`·2129, `.dash-viec-rong`·2133, `.toast`·2192, `.ntf-strip`·2219, `.ntf-empty`·2260, `.err`·2290, `.vc-alert`·2321, `.vc-empty`·2357, `.vc-filter-empty`·2380, `.vc-tone-warn`·2390, `.vc-hint`·2405, `.vc-gt-error`·2506, `.vc-warnbox`·2522, `.is-empty`·2532, `.dp-reason-empty`·2668, `.dg-warn-sub`·2693, `.dp-banner-ok`·2711, `.dp-kv-strip`·2763, `.dp-stop-empty`·2773, `.dp-col-empty`·2851, `.is-warn`·2922, `.dp-cuoc-canh-bao`·3022, `.dp-cuoc-trong`·3025, `.xdc-nhac`·3109, `.xdc-rong`·3110, `.tl-tin-loi`·3146, `.tl-cd-loi`·3163, `.dd-trong`·3203, `.hk-trong`·3270, `.hk-loi`·3275, `.dd-nhac`·3293, `.hk-nhac-don`·3297, `.gd-loi`·3355, `.xb-loi-o`·3377, `.xb-form-loi`·3380, `.tx-o-rong`·3452, `.tx-loi`·3455, `.cp-trong`·3492, `.dp-xep-nhac`·3596, `.mfa-strip`·3763, `.mfa-warn`·3772, `.canh-bao-dt`·3786, `.cx-loi`·3830

**Đầu trang / tiêu đề vùng (95):** `.toolbar`·616, `.detail-head`·720, `.chon-bar`·773, `.xm-chi-tiet-dau`·810, `.scn-ct-dau`·858, `.scn-nhom-dau`·861, `.fb-tin-dau`·925, `.ht-dau`·934, `.ht-tieu-de`·970, `.hdv-head`·1046, `.hdv-titles`·1047, `.hdv-eyebrow`·1048, `.hdv-title`·1049, `.hdv-sec-head`·1059, `.bar-back`·1127, `.sidebar-head`·1187, `.sidebar-group-title`·1195, `.topbar-search`·1236, `.svc-head`·1334, `.svc-title`·1335, `.svc-tieu-de`·1340, `.trip-title`·1404, `.catalog-dau`·1443, `.catalog-ten-dau`·1457, `.owner-head`·1621, `.owner-title`·1622, `.assignee-head`·1635, `.assignee-title`·1637, `.maint-title`·1659, `.dash-today-head`·1769, `.dash-chart-bar`·1787, `.dash-review-head`·1795, `.dash-review-heading`·1796, `.dash-review-title`·1803, `.dash-xg-tieu-de`·1885, `.dash-today-title`·1907, `.dash-viec-dau`·2118, `.dash-viec-tieu-de`·2119, `.hd-tieu-de`·2184, `.ntf-bar`·2297, `.vc-page-head`·2342, `.vc-head-btn`·2345, `.vc-bottom-bar`·2350, `.vc-crumb-pre`·2353, `.vc-xe-head`·2435, `.vc-docs-title`·2453, `.vc-doc-title`·2461, `.vc-dt-head`·2470, `.vc-gt-head`·2501, `.vc-pt-head`·2513, `.vc-mydocs-head`·2534, `.vc-eyebrow`·2546, `.vc-txdocs-head`·2595, `.dp-hist-head`·2643, `.dp-hist-title`·2644, `.dp-ly-do-head`·2657, `.dp-group-head`·2661, `.dp-group-title`·2662, `.dp-ct-head`·2743, `.dp-ct-title`·2744, `.dp-head`·2817, `.dp-chon-head`·2906, `.dp-cxl-tieu-de`·2924, `.dp-run-head`·2958, `.dp-cuoc-head`·3004, `.dp-cuoc-day-head`·3010, `.dp-cuoc-day-title`·3011, `.dp-cc-head`·3026, `.xdc-head`·3101, `.dn-head`·3114, `.tl-dau`·3132, `.tl-tieu-de`·3134, `.tl-cd-tieu-de`·3178, `.dd-chang-dau`·3205, `.dg-chang-dau`·3205, `.hk-dau-cot`·3273, `.xb-head`·3365, `.xb-title`·3366, `.xb-dau-xe`·3384, `.xb-eyebrow`·3389, `.bg-dau`·3420, `.tx-form-title`·3449, `.tx-dm-dau`·3460, `.cp-title`·3471, `.bk-nhom-dau`·3499, `.dp-cc-xong-tieu-de`·3558, `.dp-vua-ghi-dau`·3563, `.hh-mucta-dau`·3635, `.khach-dau`·3654, `.dc-dau`·3688, `.hm-title`·3794, `.cx-tieu-de`·3824, `.hh-dau`·3844, `.hh-m-dau`·3875, `.hh-tl-cs-dau`·3901
