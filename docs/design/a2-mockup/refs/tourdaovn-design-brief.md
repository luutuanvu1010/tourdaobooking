# Design brief — mượn hệ thị giác tourdaovn cho tourdao-sales (app nội bộ, iPhone, tiếng Việt)

Nguồn: [T] tokens.css · [07] 07-DESIGN_TOKENS.md · [DP] DESIGN_PATTERNS.md · [HP] CONSTITUTION.md · [SM] DESIGN_SURFACE_MAP.md · [CI] COMPONENT_INVENTORY.md (chỉ props, không số đo) · [S] `public/app.css` worktree hiện tại (119 dòng, CHƯA có khối PWA) · [PWA] nhánh `worktree-pwa-iphone` (app.css 199 dòng + hai tài liệu PWA). "[đo lại]" = tôi tính khi soạn brief, không có trong tài liệu. `P4 (HP)` khác `P4 (DP)`.

## 1. Triết lý & nguyên tắc

- **P6 (HP):96, N7 (HP):167, L1 (DP):40** — 0 giá trị cứng ngoài `tokens.css`; hai nguồn sẽ lệch ([07]:12, [T]:3).
- **L2 (DP):51** — chỉ 9 bậc spacing `--s1…--s9`, để nhịp đều.
- **L3 (DP):55, [07]:48** — hai accent hai vùng: `--c-accent` (san hô) chỉ cho hành động và nhãn giá, sand chỉ cho nội dung; vì "thấy màu ấm là có hành động thật".
- **[07] §0.1** — primary xanh biển sâu = tin cậy; CTA nổi vì là màu ấm duy nhất trên nền lạnh; nền phục vụ chữ.
- **SPEC-2026-08-14-be-mat-vong-3 §3.3 ([T]:38-42), QĐ-2026-08-25-04** — bệnh là thiếu DIỆN TÍCH màu, không thiếu màu; chữa bằng nền phụ đậm hơn và dải "band" navy để thẻ trắng nổi lên.
- **QĐ-2026-08-06-11 ([T]:58-64)** — một chữ mềm, quen mắt người Việt (Nunito); Be Vietnam Pro làm dự phòng để dấu luôn đúng.
- **QĐ-2026-08-28-02 ([07]:104)** — chữ nền lớn, line-height thoáng, không tracking âm: đọc tiếng Việt có dấu ưu tiên hơn mật độ.
- **DR-002, DR-003 ([07]:39,57-59)** — không họa tiết "đất liền", nền trắng thuần, không gradient phủ trang.
- **[07]:25,177** — không dark mode, không animation tự chạy.
- **P2, N1 (HP):72,144** — bề mặt không đi trước cấu trúc: mỗi màn hình trỏ về dữ liệu nuôi nó ([PWA] spec có bảng ánh xạ).
- **§6.2 (HP):206** — ngưỡng là số kiểm được (AA ≥ 4,5).
- **[07]:179-181** — đổi giá trị token là cửa hai chiều; thêm hệ màu mới là rebrand, chủ dự án duyệt.
- **"Luật 3: giá trước, chữ sau"** ([T]:88-89, [07]:104; nội dung gốc ở 06, không đọc): giá hiện sớm và nổi.

## 2. Token: cái gì có, dùng thế nào

**Màu** (bộ `bien-sau`, mặc định):
- `--c-primary` #0C4A6E: heading, link, viền focus ([07]:33), nền band; chữ trắng trên nó 9,46. `--c-primary-strong` #082F49 (hover, số giá lớn), `--c-primary-soft` #DCEBF6 (nền nhấn nhẹ, ô icon).
- `--c-accent` #C0392B: CTA, nhãn giá; chữ trắng 5,44. `--c-accent-strong` #96271A (hover, chữ nhãn giá), `--c-accent-soft` #FEF2F0 (nền nhãn giá).
- `--c-sand` #F5A623: gạch chân, chấm marker; KHÔNG làm nền CTA (QĐ-2026-08-29-06). Kèm `--c-sand-soft` #FBE3B3, `--c-sand-text` #5a4109, `--c-sand-border` #e9d3a4.
- `--c-sea` #0E7490: tự nhiên/tiện ích/"thành công" ([07]:41); chữ trắng 5,36. `--c-green` là bí danh của nó (thực ra teal).
- Nền: `--c-surface` #FFFFFF, `--c-surface-alt` #EAF2F8 (khối xen kẽ), `--c-card` #FFFFFF. Chữ: `--c-text` #0F172A, `--c-text-muted` #475569, `--c-text-inverse` #F8FAFC. Kẻ: `--c-border` #D3E1EC.
- Band: `--c-band-bg` = `var(--c-primary)`, `--c-band-text` #FFFFFF, `--c-band-muted` #c5dcea.
- Vai không nêu: `--c-green-soft` #DCFCE7, `--c-green-text` #166534, `--c-coral` #E8654E.

**Chữ:** `--font-display` "Be Vietnam Pro","Nunito",system-ui (h1–h4; 700, chữ hiển thị 800). `--font-ui` "Nunito","Be Vietnam Pro",system-ui (thân 500; nhãn, nút, badge 600). `--fw-500…900`, 900 bị kẹp về 800 (DR-031). Cỡ px: `--fs-badge` 11 · `--fs-xs` 12 · `--fs-label` 14 · `--fs-sm` 15 · `--fs-nav` 18 · `--fs-base` 19 · `--fs-h5` 20 · `--fs-card-title` 21 · `--fs-h4` 26 · `--fs-h3`/`--fs-section` 32 · `--fs-h2` 40 · `--fs-h1` 42 · `--fs-hero` 46 · `--fs-display` 60.
**Spacing:** `--s1…--s9` = 4/8/12/16/24/32/48/64/96px; giữa section `--s7`/`--s8`, padding trong `--s4`…`--s6` ([DP]:53).
**Radius:** `--radius-sm` 8 · `--radius-md` 12 · `--radius-lg` 18 · `--radius-pill` 999.
**Shadow:** `--shadow-card` `0 1px 3px rgba(15,23,42,0.08)`; `--shadow-raised`; `--shadow-lg`; `--shadow-overlay` `0 12px 32px rgba(15,23,42,0.16)`.
**Motion:** `--m-fast` 180ms, `--m-base` 300ms, `--m-ease` ease ([T]:160-162; [07] khác, §7).
**Layout:** `--container` 1200, `--container-padding` 24, `--bp-sm/md/lg/xl` 640/768/1024/1280, `--header-h` 68, `--sticky-bar-h` 56.
**Bộ giao diện:** `:root` = `bien-sau`; `:root[data-theme='cat-bien'|'ngoc-lam']` chỉ đè bốn màu gốc (surface, primary, accent, text) và ba nền phụ (surface-alt, primary-soft, border); chữ, spacing, radius, shadow giữ nguyên; mọi bộ phải qua AA ([07]:61-95, [T]:197-235).

## 3. Quy tắc chữ tiếng Việt

- `--lh-body` 1,68; `--lh-heading` 1,16 (h4 1,15, [T]:297); `--lh-display` 1,22 chỉ cho chữ rất lớn, CẤM cho heading thường ([T]:122-125).
- `letter-spacing: 0` mọi nơi, trừ nhãn CHỮ HOA: `--ls-eyebrow` 0,08em bắt buộc đi kèm `--lh-eyebrow` 1,5, nếu không dấu bị dòng trên cắt. Tracking âm bị cấm vì ép dấu vào thân chữ bên ([T]:126-130).
- Tối thiểu: thân chính 19px ([07]:104); UI chính 15px ([07]:107); nhãn/chip 14px; badge 12px ([07]:109) hay 11px ([T]:80), không dùng cho đoạn văn.
- Root `font-size: 100%`, tôn trọng cỡ chữ người dùng ([T]:244-248). Font cần subset `vietnamese`; Be Vietnam Pro chỉ tự lưu trữ 700/800 ([T]:76). Không font mono ([07]:25). Cột chữ tối đa 70ch.
- KHÔNG: tracking âm; `--lh-display` cho heading nhỏ; chữ hoa không giãn; rơi thẳng về `system-ui` bỏ qua Be Vietnam Pro.

## 4. Thành phần cho app nội bộ dạng form

**Khoảng trống:** tourdaovn không có ngôn ngữ form ([07]:25 "site tĩnh không form"). Không nêu: input/select/textarea (gần nhất [07]:146 "input tìm kiếm nếu có" → `--radius-sm`), alert info/warn/error/success, stepper/counter ([DP] P13 chỉ ghi chú "date select + guest qty", không CSS), bảng dữ liệu (chỉ "viền bảng = `--c-border`"), số đo EmptyState ([CI]:188, chỉ props). Phần app đã tự bịa: xem §6.

Đã đặc tả:
- **Nút chính (P8 (DP))**: nền `--c-accent`, chữ `--c-text-inverse`, hover `--c-accent-strong` + `translateY(-1px)`; padding `--s3 --s5`, `--radius-pill`, `--fw-600`, `--fs-base`; disabled `opacity:.5; pointer-events:none`; `width:100%` cho thanh dính di động. CẤM sand trên nút.
- **Nút phụ `.btn-outline`**: nền trong, viền 1px `--c-border`, chữ `--c-text`, hover viền + chữ `--c-primary`. Không có nút danger.
- **Thẻ (P3, P5 (DP))**: `--c-card`, viền 1px `--c-border`, `--radius-lg`, padding `--s4`, `--shadow-card`; hover `translateY(-2px)` + `--shadow-raised`. Meta-row: padding `--s3 --s4`, `--radius-md`, `--fs-sm`.
- **Badge (P4 (DP))**: `--radius-pill`, padding `--s1 --s3`, `--fs-badge`, `--fw-600`; default `--c-primary-soft`/`--c-primary`, sand `--c-sand-soft`/`--c-sand-text`, past `--c-surface-alt`/`--c-text-muted`.
- **Nhãn giá**: nền `--c-accent-soft`, chữ `--c-accent-strong`, `--radius-sm`, dạng "từ X, cập nhật [ngày]" ([07]:37-38,146). Số giá lớn (P13 (DP)): `--font-display`, `--fw-900` (thực tế 800), `--c-primary-strong`, đơn vị "/ khách" nhỏ cạnh bên.
- **Callout (P9 (DP))**: nền sand-paper, viền `--c-sand-border`, `--radius-lg`, padding `--s4 --s5`, `--fs-sm`, lh 1,6; biến thể trung tính `--c-primary-soft`. `--c-sand-paper` không tồn tại (§7).
- **Thanh dính đáy (P14 (DP))**: `position:fixed; bottom:0; z-index:40`, `--c-card`, `border-top` 1px `--c-border`, padding `--s3 --s4`, gap `--s3`; giá trái, nút phải. Thanh dính trên `--sticky-bar-h` 56px cố định (DR-033).

## 5. Truy cập & khoảng chạm

- **tourdaovn:** chữ thường ≥ 4,5:1 ([07]:29,85). `bien-sau` ([07]:91): chữ/nền 17,85 · chữ mờ/nền 7,58 · trắng/primary 9,46 · trắng/accent 5,44; chữ/chữ mờ trên `--c-surface-alt` 15,77 / 6,70 ([07]:83). `check:theme` thoát 1 nếu rớt. Lighthouse mobile ≥ 90, LCP ≤ 2500ms, CLS ≤ 0,1 ([07]:18).
- **Không nêu (tourdaovn):** ngưỡng 3:1 cho chữ lớn/UI; bề rộng, offset vòng focus (chỉ viền focus = `--c-primary`, [07]:33); vùng chạm tối thiểu.
- **Reduced motion:** animation/transition về 0ms, `scroll-behavior: auto` ([T]:316-328).
- **tourdao-sales (quyết định của app, không phải luật tourdaovn):** `--tap-min` 44px, `--bar-h` 52, `--tabbar-h` 56, `--row-h` 48, `--tab-icon` 36, `--fs-tab` 12; `.btn` min-height 44px ở ≤640px; nút "‹" 44×44; `env(safe-area-inset-*)` cho thanh trên và đáy; form lập đơn ẩn thanh tab, nút Lưu dính đáy có nền và `border-top` ([PWA] app.css:15-30,154-195; spec:70). `h1` ẩn khỏi mắt nhưng còn cho trình đọc. Axe 0 lỗi critical/serious ([PWA] spec:77). Chưa kiểm trên iPhone thật: bàn phím có che nút dính đáy không (PWA-IPHONE.md:34).
- **[đo lại]:** `--c-muted` #5b6b78 của [S] là 5,50 trên trắng, 4,86 trên `--c-alt` (nền trang của [S]); `--c-accent` trên `--c-alt` 4,81, sát ngưỡng.

## 6. Không mang nguyên sang app nội bộ

- **DROP** hero, `--hero-*`, `--fs-hero`, `--fs-display`, `--lh-display`, WaveDivider — của trang quảng bá; app dùng thanh navy trên + thanh tab.
- **DROP** ảnh thật "mang màu", `--card-img-h`, Gallery, MapView — không có ảnh; diện tích màu đến từ band navy và `--c-surface-alt`.
- **DROP** footer band `--c-footer-*`; timeline, TOC, author box, date block, source chip, stats band, breadcrumb, FAQ (mẫu bài viết); gạch chân sand 28×3 (`--underline-*`); card hover `--card-lift` (cảm ứng); `data-theme` do Sanity chọn, i18n — app một bộ `bien-sau`, chỉ tiếng Việt.
- **ADAPT** `--container` 1200, editorial 800, lưới 2 cột + sidebar 380px — iPhone một cột; [S] dùng `main` max 960px.
- **ADAPT** thân 19px, card-title 21, heading 32–42, `--lh-body` 1,68 — 19 là TRẦN thang ([T]:92) và sàn nội dung chính ([07]:104), chỉnh cho đọc bài dài; form dày dữ liệu cần nhỏ hơn ([S] đang 16px/1,5). Cỡ do chủ dự án duyệt (Điều 7.1 (HP)). Ngoài nguồn: iOS Safari tự phóng to khi ô nhập < 16px.
- **ADAPT** nút pill + hover — [07]:24,146 nói nút 8px, P8 (DP) nói pill; [S] dùng 8px. Không có hover trên iPhone: cần trạng thái `:active` (không nêu).
- **ADAPT** accent chỉ CTA + nhãn giá — app cần nháp/xác nhận/huỷ, lỗi/cảnh báo/thành công; chưa có token semantic ([07]:25 "thêm khi cần qua cửa hai chiều"). Đừng tái dùng accent cho hành động phá huỷ khi chưa quyết ([S]:47 đang làm vậy).
- **ADAPT** P7 (DP) fact-strip → dòng khoá–giá trị (như `.kv` của [S]); `--header-h` 68 và `--sticky-bar-h` 56 → `--bar-h` 52 + safe-area, `--tabbar-h` 56.

**[S] lệch tourdaovn (facts):**
- `--c-text` #1b2a35 ([S]:8) vs #0F172A ([T]:26); `--c-muted` #5b6b78 ([S]:9) vs `--c-text-muted` #475569 ([T]:27); `--c-line` #d3dee7 ([S]:10) vs `--c-border` #D3E1EC ([T]:29). Tên vai đổi: `--c-bg`/`--c-alt`/`--c-line`/`--c-muted`.
- Một `--font` ([S]:14) thay cặp display/ui; "Be Vietnam Pro" gõ cứng ở `h1, h2` ([S]:19); `public/` không có `@font-face` nên iPhone hiện dùng `system-ui` ([S]:1-2: font thuộc M4).
- Nền trang `--c-alt` #EAF2F8 với thẻ trắng ([S]:18); tourdaovn nền `--c-surface` trắng ([T]:264). Thân 16px/1,5 vs 19px/1,68; h1 1,5rem, h2 1,1rem ([S]:20), không line-height heading (vs 1,16).
- Không sao chép: primary/accent `-strong`/`-soft`, sand, sea, `--c-text-inverse` (dùng `#fff`), `--s7…--s9`, `--radius-lg/-pill`, shadow, motion, cỡ chữ, `--fw-*`.
- Cứng: bảng alert/badge ([S]:52-53,67-70,97: #7a1f16 #fdecea #f3b9b2 #6b4a00 #fff6df #f0d48a #0b5d2e #d6f3e0 #a9dfbd #fff1c9), `999px`, rem lẻ .8/.85/.9/1.1/1.25, `min-width:720px` ([S]:78, ngoài thang 640/768/1024/1280), `.pin` `letter-spacing:.15em` + `ui-monospace` + line-height 1 ([S]:99; trái [T]:129, [07]:25).
- Focus: input outline 2px `--c-primary` ([S]:38) khớp [07]:33; nhưng `.catalog-list button:focus` `outline:none`, chỉ đổi nền sang `--c-alt` ([S]:111), cách trắng 1,132 ([07]:40).
- Nút `font-weight` 700 (vs 600), padding 10px 18px ([S]:43). `.badge` 2px 10px ([S]:67) khớp `--badge-py/px` ([T]:105-106), không khớp P4 (DP).

## 7. Mâu thuẫn / điểm mơ hồ

1. **Motion:** [07]:173-175 (150ms / 250ms / `cubic-bezier(0.2,0,0,1)`) vs [T]:160-162 (180ms / 300ms / `ease`).
2. **`shadow.raised`:** [07]:153 `0 4px 12px rgba(15,23,42,0.10)` vs [T]:146 hai lớp `rgba(0,91,150,.15)`; `--shadow-lg` không có trong [07].
3. **Chú thích cũ [T]:41** ghi `--c-surface-alt #F8FAFC`; khai báo [T]:24 là #EAF2F8 và [07]:40 khớp khai báo. Chú thích là bên lỗi thời.
4. **Vai chữ:** [07]:101-102 cả hai vai Nunito đứng đầu vs [T]:71 `--font-display` Be Vietnam Pro trước; [SM]:121-124 ghi DR-050/051, cố ý để mở. [SM]:126-133 (DR-052): file 800 của Be Vietnam Pro chưa khai `@font-face` (chữ 800 có thể bị đậm giả) trong khi [T]:76-78 nói cấp 800 tự lưu trữ.
5. **Thang cỡ:** [07]:105 khai 8 bậc, [T] nhiều hơn ([SM]:122 đếm 14); `--fs-badge` 11px ([T]:80) vs 12px ([07]:109).
6. **[DP] cũ:** :61 "Plus Jakarta Sans" (đã gỡ, [07]:126); :57 gọi accent là "Cam" (thực tế san hô #C0392B); :20 nhắc `DESIGN.md` chưa từng tồn tại ([T]:10, DR-008); :31 container padding 16px vs `--container-padding` 24px ([T]:153).
7. **Sand trên nút:** [07]:42 "cát giữ vai … nút trên nền đậm" vs [DP]:57,463 "Không sand trên nút". [07]:42 nêu `--c-text-inverse` trên sand 3,28:1; [đo lại] #F8FAFC/#F5A623 = 1,94 (3,28 là chữ trắng trên `--c-coral`); kết luận không đạt AA không đổi.
8. **Bán kính, thẻ, badge:** [07] §3 chỉ sm/md/pill, §0.3 "card 12px, nút 8px"; [T]:141 thêm `--radius-lg` 18 và [DP] dùng cho thẻ, nút pill ([DP]:435). `--card-lift` -3px ([T]:107) vs -2px ([DP]:184); `--badge-py/px` 2/10 ([T]:105-106) vs `--s1 --s3` ([DP]:226); tracking chữ hoa 0,08em ([T]:126) vs 0,06em ([DP]:591), 0,05em ([DP]:850).
9. **Token không khai:** `--c-sand-paper` ([DP]:481), `--fs-display-sm` ([DP]:688) không có trong `src/`; `--measure` ([DP]:842) chỉ dùng kèm dự phòng `var(--measure, 70ch)`. P9, P13 (DP) không tái tạo được nguyên văn; P14 (DP):732 còn gõ cứng `box-shadow`, trái L1.
10. **Semantic status:** [07]:25 "không token semantic success/error" vs `--c-green-soft/-text` ([T]:33-34) và [07]:41 gán "thành công" cho `--c-sea`. [07]:25 ("thêm khi cần qua cửa hai chiều") vs [07]:181 ("thêm hệ màu mới là rebrand"): chưa rõ token trạng thái thuộc loại nào.
11. **Khác:** [07]:158 nói mobile-first `min-width`, [T]:308-314 và [DP] viết `max-width`; `--fw-900` ở [DP]:582,689 dù [07]:103 nói vô tác dụng.
