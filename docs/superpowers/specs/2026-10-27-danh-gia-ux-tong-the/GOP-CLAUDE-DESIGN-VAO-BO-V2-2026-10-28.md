# Gộp gì từ bản xuất Claude Design vào bộ Design System v2 (28/10/2026)

Hồ sơ có ngày. Người soạn: phiên kiểm (island-booking-ux-redesign). Người dùng: phiên "Design System v2" (gộp vào bộ `R7vYe6PdU85WCSYkanWNP5`), Main session (soạn đề bài khung chung 7b). Chủ dự án chỉ cần đọc tóm tắt ở mục 5 của `TO-CONG-2A-HOP-NHAT-2026-10-28.md`.

> **Luật của bảng (Main session chốt 28/10, trong khung cổng 1 và quyết định "kết hợp cả hai" của chủ; đảo được):**
> 1. Mã Claude Design xuất ra là **React (`.jsx`)**. Nền tảng **không có React** và không đổi khuôn trong đợt này (QĐ8, ADR riêng). **Gộp = lấy diện mạo** (giá trị CSS, cấu trúc, trạng thái, khoảng cách) sang HTML tĩnh của bộ; **KHÔNG mang `.jsx` vào mã hay vào bộ.**
> 2. **Tên token giữ như mã/bộ** (`--c-*`, `--fw-*`, `--s*`…); lấy **giá trị** và cách chia ba tầng của Design nếu tốt hơn. Đổi tên ~460 token tiếng Việt: *chưa đề xuất* (mục 10).
> 3. Giá trị gốc so bằng kịch bản, chỉ ghi dòng lệch (mục 2). Ba chỗ Design ghi "từ mã" nhưng sai: toast nền tối → lấy, ghi **ĐỔI**; phông mono cho mã đơn → giữ bộ (E5), Design = "tuỳ chọn, chưa lấy"; `lh-heading` 1,16 → giữ BỎ (A3).
> 4. Lấy bốn MỚI của Design (đệm nút 16, đệm ô 12, ô nhiều dòng 96, nền công tắc tắt đậm hơn) + viền ô tích/ô chọn một dùng `c-text-muted`; ghi phát hiện mới theo mã (mục 7).
> 5. Thành phần Design vẽ mà bộ chưa có → **thêm vào bộ**, đánh dấu "MỚI · diện mạo từ Claude Design, 7b có thể sửa"; sửa README mục 12.
> 6. Chốt thêm sau kết quả kịch bản: **giữ Code** ở ba chỗ Design bỏ (`c-focus-ring`, `shadow-card-hover`, `shadow-btn-solid`); năm tông giữ `history / alertCircle / minus` (E2 đã duyệt), `swap / alert / ban` của Design = không lấy; mốc điện thoại giữ **640**; "thanh tab tới 899" của Design = **phương án B** cho khổ 768 trong 7b (phương án A = thanh bên gọn 56, E3 đã duyệt).
>
> **Kết luận không đổi: một bộ duy nhất `R7vYe6…`.** Bản xuất Claude Design chỉ là đầu vào.

## 1. Nguồn, phiên bản, cách so

| Thứ | Giá trị |
|---|---|
| Bản xuất Claude Design | Desktop, 09:08 28/10/2026, 225 tệp, 2,1 MB; chép vào `docs/evidence/2026-10-28-claude-design-bo-v2/` (trừ `.thumbnail`, `fonts/` — xem `GHI-CHU-NGUON.md`). Design tự ghi đã đọc GitHub `luutuanvu1010/tourdaobooking` main lúc 2026-10-27T23:04Z = main `2847b6c2` (Main session kiểm: đúng kho) |
| Bộ v2 trên Claude | `R7vYe6PdU85WCSYkanWNP5`, bản hiện hành `1793148085-173e`; `tokens.json`, `design-system.json`, README, `bundle.css` **giống bản 5 `1793143219-823e` từng byte** (phiên Design System v2 xác nhận: bản lưu không đổi nội dung, nhiều khả năng do trang tự lưu khi chủ mở) → kết quả 2c vẫn đúng |
| Kịch bản so token | `docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/doi-chieu-claude-design.mjs` (đọc `tokens/*.css`, giải `var()`, so 88 giá trị chép từ mã và so với `tokens.json` bộ) |
| Phiếu sự thật 27 thành phần | `docs/evidence/2026-10-28-claude-design-bo-v2/PHIEU-SU-THAT-THANH-PHAN.md` (trợ lý chỉ đọc trích từ 6 CSS nhóm + 29 prompt + 29 `.jsx`; phiên kiểm đã kiểm xác suất 5 điểm trong CSS gốc: đúng) |
| 20 thành phần của bộ | README từng thành phần (`project/components/*/README.md`, bản 173e) |

**Ba con số:** 27 thành phần Claude Design → **lấy diện mạo Design: 4 · giữ Code (bộ như mã): 17 · mới (bộ chưa có): 6**. Ngoài ra lấy **gói đệm 10 giá trị + ô nhiều dòng 96** (chỗ để dành cho Design) và **toast nền tối** (chỗ để dành thứ hai).

## 2. Token

### 2a. Giá trị gốc (kịch bản): Design giữ 85/88, bỏ 3 — giữ Code cả 3

| Giá trị mã | Design | Bộ | Chốt |
|---|---|---|---|
| `c-focus-ring` rgba(8,145,178,.2) — vành mờ quanh ô đang gõ (`ring-field` 3) | Bỏ ("trùng ý với vành 3 px") | Giữ | **Giữ Code**: tín hiệu bàn phím đã chốt |
| `shadow-card-hover` + `lift` — thẻ bấm được khi rê | Bỏ (rê thì đổi nền `c-soft-hover`) | Giữ | **Giữ Code**: trạng thái tương tác, không phải trang trí |
| `shadow-btn-solid` — nút chính đặc | Bỏ ("nút phẳng như Apple/Google") | Giữ | **Giữ Code** (bản 1.70 chủ duyệt) |

Khác biệt nhỏ cùng nhóm: Design dùng bóng "nổi" `bong-2` = giá trị `shadow-float` cũ (bộ đã BỎ cùng nút nổi) cho toast và bảng chọn → bộ dùng `shadow-overlay`, **không lấy**. Design bỏ `saturate(180%)` trong kính thanh tab (giữ `blur(16px)`, thêm `saturate(1.4)` cứng) → giữ `blur-glass` của bộ.

### 2b. Token MỚI hai bên — đồng thuận là mạnh

**Bộ MỚI (19) ↔ Design:** đồng thuận 14 — `h-control` 44 / `h-control-lon` 52 (Design `--h-dieu-khien*`, ghi "từ mã"), `bo-control` 8, `t-nhanh` 150 / `t-vua` 200, `w-noi-dung-max` 1280, `z-dinh … z-tren-cung` 10–50 (Design cùng 5 tên gần giống, cùng giá trị), `c-mat-mang-bg` (Design dải trên trang tông Cát cho mất mạng = cùng màu), `skel-so` 26 / `skel-vien` 96 (Design 7,5em / 96), `ease-out` giữ. Chỉ bộ: `w-sidebar-gon` 56 (Design không có thanh bên gọn), `skel-dong` 16 (Design dòng 12 nhịp 24 → **giữ bộ 16**), ba mốc `moc-*` 640/900/1200 (Design chỉ có 768 và 900 ghi cứng 10 chỗ → **giữ bộ**; xem 2e), phím tắt (Design không nhắc).

**Design MỚI (20 token + 3 ngoài token) ↔ bộ:**

| Design MỚI | Giá trị | Bộ | Chốt |
|---|---|---|---|
| `--nut-pad` | 0 16 (mã `.btn` 10 18) | chưa có | **Lấy** (chốt 4) |
| `--o-pad` | 0 12 (mã `input` đã 10 12 — "MỚI" chỉ ở chỗ bỏ đệm dọc vì cao cố định 44) | chưa có | **Lấy** (chốt 4), ghi đúng nguồn |
| `--o-nhieu-dong-h` | 96 (mã `textarea` 72) | chưa có | **Lấy** (chốt 4) |
| `--cong-tac-tat-bg` | #94a3b8 = `c-input-border-hover` (mã: công tắc là ô gốc trình duyệt) | chưa có | **Lấy** (chốt 4) |
| `--tich-vien` | #475569 = `c-text-muted` cho ô tích + ô chọn một chưa chọn | `c-input-border` | **Lấy** (chốt 4); phát hiện mục 7 |
| `--pad-the` / `--pad-the-rong` | 16 / 24 | đệm thẻ `s4` (README The) | **Lấy** cả hai (chỗ để dành: đệm) — bộ hiện chỉ 16 |
| `--le-trang` / `--le-trang-rong` | 16 / 32 | chưa khai thành token | **Lấy** (lề chung cho mọi trang; mã dùng `s4`/`s6` rời) |
| `--gap-khoi` | 24 | chưa có | **Lấy** (nhịp dọc chung) |
| `--chip-pad`, `--tab-pad` | 0 12, 0 16 | chưa có | **Lấy** |
| `--huy-hieu-pad` + `--huy-hieu-bt` | 3 8 3 6 (cao 24) + 14 | huy hiệu 12/500, biểu tượng 14 | **Lấy** đệm (biểu tượng 14 đã đồng thuận) |
| `--chip-h` | 36 (vùng chạm 44 vô hình; "lấy từ `--h-muc-nho`" — token đó của mã là mục thu gọn Thiết lập, không phải chip) | chip cao `h-control` 44 (cổng 1 một mật độ; "không chip thấp hơn 44") | **Không lấy** |
| `--vanh-cach` | 2 (mã: `outline-offset: var(--focus-ring)` = 2) | — | **Lấy** làm ghi chú: vành 3 px, cách 2 px (mã sau đổi `focus-ring` 3 sẽ thành cách 3 nếu không tách) |
| `--thanh-tab-mo` | 16 | `blur-glass` | Đồng thuận giá trị; giữ tên bộ |
| `--thanh-tab-den` | 56×32 (khai nhưng CSS ghi cứng) | `c-tab-active-bg` viên (từ mã) | Đồng thuận; giữ bộ |
| `--bang-tay-cam` | 36×5 (khai nhưng CSS ghi cứng) | "tay kéo" chưa có số | **Lấy** số 36×5 vào README BangTruot |
| `--cd-xuong` | 1,2 s | "4 × m-base" = 1,2 s | Đồng thuận |
| `--dong-tieu-de` 1,16 | ghi "từ mã" (mã `lh-heading` không dùng ở đâu, app.css dòng 112) | BỎ (A3) | **Giữ BỎ** (chốt 3c) |
| `--phong-so` mono cho mã đơn, biển số | ghi "từ mã" (mã: `font-mono` chỉ cho PIN, dòng 63, 745) | mono chỉ PIN + mã hai lớp (E5) | **Giữ bộ**; Design = "tuỳ chọn, chưa lấy" (chốt 3b) |
| `--c-nen-toi` #082f49 toast | ghi "từ mã" (mã toast nền trắng, dòng 2192) | tạm theo mã, chờ Design (F6) | **Lấy nền tối, ghi ĐỔI** (mục 6) |
| Ngưỡng 768 (bảng trượt → hộp thoại; "+ Tạo đơn" lên thanh trên) | cứng 5 chỗ | `moc-dien-thoai` 640 | **Giữ 640** (chốt 6); 768 ghi làm một dòng khác biệt |
| Khung `.ib-khung` (container query) | — | bộ theo `@media` như mã | Không lấy đợt này (đổi cách đáp ứng là việc mã, ngoài phạm vi) |
| Từ vựng 23 trạng thái | giống hệt bảng HuyHieu của bộ (5 Cát · 4 Biển · 5 Lá · 5 Đỏ · 4 Xám) | có | **Đồng thuận** |

### 2c. Tầng và tên

Design chia ba tệp `goc.css` (72) / `y-nghia.css` (88) / `thanh-phan.css` (59), tầng dưới chỉ trỏ tầng trên; bộ ghi tầng trong cột công dụng của `tokens.json` ("Gốc ·", "Ý nghĩa ·", "Thành phần ·"). **Cùng cấu trúc, khác cách ghi** → bộ giữ. Chú ý: ngay Design cũng vi phạm luật của mình một chỗ (`.ib-thanh-tren__ten` đọc thẳng `--co-5`/`--co-6` tầng gốc) và khai 3 token không ai đọc (`--thanh-tab-den`, `--bang-tay-cam`, `--bao-xong-tg`), 2 cỡ biểu tượng không ai đọc (`--bt-co`, `--bt-co-lon`); đừng chép nguyên.

## 3. Sổ tay: bảng "Từ mã / MỚI / BỎ" của Design (9 / 15 / 13) so với mục 11 của bộ

| Dòng Design | Bộ | Kết luận |
|---|---|---|
| **Từ mã** 9 nhóm (40 màu, 14 bậc, 7 khoảng, bo 8/12/18/999, 3 bóng, đường cong + 44/52/60 + z, phông, 37 biểu tượng, số đo app.css) | Từ mã | Đồng thuận, trừ "37 biểu tượng" (mục 4) và "3 bóng" (Design mức 2 là `shadow-float` đã BỎ) |
| **MỚI** `vanh-cach`, gói đệm (pad-the, le-trang, gap-khoi, nut/o/chip/tab-pad), huy hiệu 24, tich-vien, cong-tac-tat-bg, o-nhieu-dong 96, thanh-tab-mo/den, tay cầm, cd-xuong, minus, ngưỡng 768, .ib-khung, 23 trạng thái | Xem 2b | 15 dòng: **lấy 10** (vanh-cach, hai dòng đệm, huy hiệu 24, tich-vien, cong-tac-tat-bg, ô nhiều dòng 96, tay cầm, minus, 23 trạng thái); **đồng thuận sẵn 2** (thanh-tab-mo/den, cd-xuong); **không lấy 3** (chip 36, ngưỡng 768, .ib-khung) |
| **BỎ · gộp** bo 6 → 8; bo 14 (ô số liệu) → 12 | bộ BỎ `radius-xs` 6 (→ `bo-control`); bo 14 bộ giữ trong Gốc | Đồng thuận bo 6; **bo 14 → 12: lấy** (ô số liệu là thẻ — bộ The đã ghi "ô số liệu" là biến thể thẻ bo 12; đánh dấu BỎ `radius-lg` 14 ở mục 11, expand–contract) |
| **BỎ** bóng thẻ rê, bóng nút đặc, quầng đầm phá | giữ | **Không lấy** (chốt 6) |
| **BỎ · gộp (đề nghị)** #f1f5f9 rê dòng ≈ #f2f5f9 nền phụ | giữ cả hai (từ mã) | Không lấy đợt này; ghi nhận là gợi ý dọn khi 7c đồng bộ từ mã |
| **BỎ** độ đậm 700/800 không nạp | bộ giữ 700 (`fw-home-stat` 700, núm "Độ đậm" của chủ tới 800) | **Không lấy** (mã đang dùng 700/800) |
| **BỎ** nét biểu tượng 1,8 / 2,2 → 2 | giữ 1,8 (plus/back/check 2,2) | **Không lấy** (vẽ lại 40 hình là việc ngoài phạm vi; tuỳ chọn 7b) |
| **BỎ** 180/300 ms → 150/200; vành 2 → 3 | ĐỔI cùng hướng (`t-nhanh`/`t-vua`, `focus-ring` 3) | Đồng thuận (mạnh) |
| **BỎ** `ls-eyebrow` + tiêu đề nhóm IN HOA; `ls-chip` | bộ giữ hai chỗ in hoa (tiêu đề nhóm thanh bên, tiêu đề nhóm danh sách) và `ls-*` | **Chưa lấy**; là câu hỏi của tờ bổ sung B-NHAN-IN-HOA → đưa vào 7b nhìn thật ở thanh bên 1040 (Design = phương án "không in hoa, không giãn chữ") |
| **BỎ** cỡ rem cũ | ĐỔI về bậc thang | Đồng thuận |
| **BỎ** `userPlus`, `checkCircle`, `filePlus` ("ngoài danh sách 37; trùng ý") | 40 từ mã | **Không lấy**: ba hình đang dùng trong mã; Design sót vì tên camelCase (mục 4) |

Giọng chữ và luật thị giác khác (readme Design) so với bộ: đồng thuận ở nhãn trên ô, "(tuỳ chọn)" không dấu `*`, "Đã …" cho báo xong, tiền "1.080.000 ₫" mọi khổ, không emoji, không nút nổi, không nhãn nổi, không chế độ tối, tắt = xám phẳng kèm lý do. Khác: Design **cấm gradient** (bộ giữ `grad-*` cho viên ngày Trang chủ và dải tóm tắt đơn — từ mã, **giữ bộ**); Design **cấm in hoa cả dòng** (xem trên); Design "thẻ không viền" (bộ `ring-card` 1 px mờ — giữ bộ); Design "rê thẻ đổi nền" (giữ bộ).

## 4. Biểu tượng

| | Design | Bộ | Chốt |
|---|---|---|---|
| Số hình | 38 = 37 "từ mã" + `minus` | 42 = 40 từ mã + `alertCircle` + `minus` | Giữ bộ |
| Sót | `checkCircle`, `filePlus`, `userPlus` (tên camelCase trong `web/icons.ts`; Design còn đề nghị BỎ) | có | Bộ đã có từ mã, không ảnh hưởng |
| Năm tông | `clock` / `swap` / `check` / `alert` / `ban` (0 hình mới) | `clock` / `history` / `check` / `alertCircle` / `minus` (2 hình mới) | **Giữ bộ** (E2 đã duyệt); Design = không lấy (`ban` mang nghĩa "cấm", lệch với Nháp) |
| `minus` | `M5 12h14` (nửa `plus`) | MỚI cùng ý | Đồng thuận |
| Nét | 2 cho cả bộ | 1,8 (3 hình 2,2) | Giữ bộ |
| Cỡ | 14 / 16 / 18 / 20 / 24 truyền số (18 cho nút phụ nhỏ: xoá ô tìm, mũi gập, đóng toast) | 24 / 20 / 14 | Ghi 18 là tuỳ chọn cho 7b; bộ không thêm token |

## 5. Từng thành phần (27 của Design ↔ 20 của bộ)

Cột "Kết luận": **Lấy Design** = diện mạo nhìn thấy đổi theo Design · **Giữ Code** = bộ giữ như mã, chỉ lấy đệm/cách dùng aria nếu có · **Mới** = bộ chưa có, thêm từ Design, "7b có thể sửa".

| # | Design | ↔ Bộ | Kết luận | Lấy gì · vì sao · khác biệt cần biết |
|---|---|---|---|---|
| 00 | Biểu tượng (`BieuTuong`, 38) | trang Icons (42) | Giữ Code | Mục 4. `--bt-co` khai mà JSX không đọc (`co ?? 20`). |
| 01 | Nút 3 cấp × 2 cỡ (+ san hô, phụ nguy hiểm, đỏ đặc, chỉ hình 44) | `Nut` | Giữ Code | Đồng thuận: 44/52, bo 8, 16/500, biểu tượng 20, tắt xám phẳng + lý do, vòng quay 16/2/700. **Lấy** `pad 0 16`; cách aria: tắt = `aria-disabled` (vẫn nhận tiêu điểm) + `aria-describedby` → dòng lý do; đang gửi `aria-busy`. **Không lấy** nút phẳng (giữ `shadow-btn-solid`). |
| 02 | Tab (một kiểu: rãnh nền phụ, mục chọn nền trắng + bóng — "segmented") | `Tab` (gạch chân máy tính + viên thuốc điện thoại, như mã) | Giữ Code | Design thêm kiểu thứ ba khác mã → **không lấy**. **Lấy** `pad 0 16`, đếm trong tab 12/18. Design không có phím ← →; bộ có. |
| 03 | Ô nhập 8 kiểu (chữ, số, tiền ₫, SĐT, ngày, giờ, chọn, nhiều dòng) + `ghiTien()` | `ONhap` + `ONgay` | Giữ Code | Đồng thuận: nhãn trên 14/500, cách ô 6, 44/52, bo 8, 16/400, lỗi dưới ô + `alert` 16, "(tuỳ chọn)". **Lấy** `pad 0 12`, nhiều dòng 96, lỗi = viền đỏ + `inset 1px` (đậm 2 không nhảy). **Không lấy**: ngày/giờ `type="text"` (bộ `ONgay` dùng `type=date/time`); Design không có kiểu PIN/mật khẩu. Ô tắt dùng `disabled` thật (không nhận tiêu điểm) — khác Nút. |
| 04 | Ô tích 22 · ô chọn một 20 · công tắc 44×26 (vẽ riêng, input gốc ẩn) | `OChon` (bọc input gốc, `accent-color`) | **Lấy Design** | Viền chưa chọn `c-text-muted` (2 px), công tắc tắt nền `c-input-border-hover`, núm trắng bóng, bật `c-primary`, 200 ms; dòng 44, nhãn phải, mô tả 14, lỗi thụt theo ô. **Sửa khi gộp**: ô tích bo **8** (`bo-control`) — Design ghi cứng 6 trái readme của chính nó. |
| 05 | Bộ đếm − / + (44 / 48 / 20·600, `minus`/`plus`) | `BoDem` | Giữ Code | Đồng thuận toàn bộ (cùng `counter.ts`). **Lấy** aria: `role=group` + `aria-labelledby`, `<output aria-live>`, "Bớt một / Thêm một <nhãn>", nút biên `aria-disabled`. |
| 06 | Chip 36 cao (+ vùng chạm 44 vô hình), chọn = `check` 16 + nền biển nhạt | `Chip` 44, pill, 14/500 | Giữ Code | **Không lấy** 36 (cổng 1 một mật độ). **Lấy** `pad 0 12`; dấu `check` khi chọn (không chỉ dựa màu) = tuỳ chọn 7b. |
| 07 | Huy hiệu 5 tông, 12/500, 14 biểu tượng, cao 24 | `HuyHieu` | Giữ Code | Đồng thuận (kể cả 23 trạng thái). **Lấy** đệm 3 8 3 6 → cao 24. Tông biểu tượng giữ bộ. |
| 08 | Thẻ: bo 12, bóng nhẹ, không viền, rê đổi nền, bấm `scale .99`, mũi `next` | `The` | Giữ Code | **Lấy** đệm 16 / 24 (≥ 900), gap 12 / 16, tiêu đề 16 → 18 ở ≥ 900 (tuỳ chọn). **Không lấy** bỏ `ring-card`, bỏ hover nổi. `dangTai` của Design chỉ đặt `aria-busy`, không chèn khung xương — bộ đúng hơn. |
| 09 | Dòng danh sách 44, 12×16, kẻ dưới, chấm chưa đọc 8 + nền `#f4f9fd` | `DongDanhSach` | Giữ Code | Đồng thuận. Design không có tiêu đề nhóm in hoa (mục 3). |
| 10 | Bảng ≥ 900 (th dính 44, số phải, hành động cuối, nút 36) · < 900 thẻ ba dòng cùng thành phần | `Bang` (+ `DongDanhSach` ≤ 899) | Giữ Code | Đồng thuận gần hết (nút trong bảng 36 cả hai). **Lấy** đệm td 8×12, cột đầu 16, ô rỗng 32×16. Design `th` 14/500 nền phụ; bộ 13/600 không nền → giữ bộ. Design không có chọn hàng / ngăn chi tiết; bộ có. |
| 11 | Cụm tìm (nhãn + kính + ✕ + vòng quay) + chip lọc + sắp xếp `select` lối nhỏ; không nút "Lọc" | `TimLoc` (ô tìm + nút Lọc có đếm + chip dưới + bảng trượt lọc) | Giữ Code | Bộ theo mẫu Đơn hàng hiện tại (đề cương mục 3). **Lấy** chi tiết: ✕ 44×44 trong ô, dòng kết quả `aria-live`, ô tìm ≥ 900 rộng 420 (bộ `w-search` 280 ở thanh trên — hai chỗ khác nhau, giữ cả hai). Sắp xếp dạng `select` lối nhỏ = tuỳ chọn 7b. |
| 12 | Bảng trượt < 768 / hộp thoại 520 ≥ 768; màn .45; bo 18; tay cầm 36×5; chân 52 → 44; Esc + màn đóng | `BangTruot` | Giữ Code | Đồng thuận trừ ngưỡng (**giữ 640**). **Lấy** tay cầm 36×5, đệm đầu 12 8 8 16 / thân 8 16 16 / chân 12 16 (≥ 640: 24), hoạt ảnh hộp thoại hiện dần + 8 px + `.98`. **Không lấy**: Design không bẫy tiêu điểm, không trả tiêu điểm về nút mở (bộ yêu cầu). |
| 13 | Hộp xác nhận: vòng `alert` 44 tông Đỏ + câu hậu quả 14/500 đỏ + "Không, quay lại" rồi đỏ đặc | `HopThoai` | **Lấy Design** | Vòng biểu tượng + câu hậu quả tông Đỏ làm hộp một chiều **khác hẳn** bảng trượt thường (bộ chỉ "một câu hậu quả"). Giữ của bộ: tiêu điểm mặc định ở nút phụ, lỗi = dải đầu thân, ô lý do tuỳ chọn. |
| 14 | Dải thông báo 3 tông (biển/cát/đỏ), đệm 12 16, bo 12, biểu tượng 20, tiêu đề 16/600 + nội dung 14, nút lối nhỏ, nút đóng | `ThongBao` (dải: `loi`/`canh-bao`/`thong-tin`/`xong`) | Giữ Code | Bộ 4 tông (`xong` tại chỗ cần ở lại màn) → giữ. **Lấy** đệm/bố cục và `role=alert` cho đỏ, `status` còn lại. |
| 15 | Báo xong: nền tối #082f49, chữ #f8fafc, `check` lá nhạt, "Hoàn tác" biển nhạt, 360, min 52, đáy trên thanh tab + safe-area, 3 s, dừng đếm khi rê/tiêu điểm | `ThongBao` (toast tạm theo mã: trắng, vạch trái biển) | **Lấy Design** | Chỗ để dành thứ hai (F6). Ghi **ĐỔI so với mã** kèm lý do: nổi rõ trên nền trắng của Nền tảng, tách khỏi thẻ và dải. Giữ của bộ: `z-tren-cung` 50 (toast trên bảng trượt; Design 40), bóng `shadow-overlay`, một toast một lúc, `role=status`. **Lấy** "dừng đếm 3 s khi rê hoặc có tiêu điểm". |
| 16 | Dải trên trang: 44 thu gọn, cắt "…", nút gập chevron mở chi tiết tại chỗ, `relative` z 10, 3 tông | `DaiTren` (4 tông `bao-tri`/`quan-trong`/`nhac`/`mat-mang`, "Xem" mở BangTruot, "Đã hiểu" bắt bấm, bảo trì dính) | Giữ Code | Câu 8 cổng 1 đã chốt cách của bộ. **Lấy** đệm 0 4 0 16 (≥ 640: 32), ruột tối đa 1280 giữa. |
| 17 | Đầu trang **tách khỏi thanh trên**: `h1` 20 / 24 (≥ 900), phụ 14, lối lùi, huy hiệu trong `h1`, hành động phải | `ThanhDinh` (tiêu đề 18/600 **nằm trên thanh trên** 60, như mã) | **Mới** (đầu vào 7b) | Hai cách bố trí tiêu đề trang: A = bộ/mã (tiêu đề trên thanh), B = Design (thanh trên = tên hệ thống + logo; tiêu đề 20/24 ở đầu thân). Thêm vào bộ dưới tên `DauTrang`, đánh dấu "MỚI · từ Claude Design, 7b chọn A/B nhìn thật ở 390/1040". |
| 18 | Thanh dính đáy: sticky z 10, kẻ trên, đệm 12 16 + safe-area, tóm tắt tiền 14 trái, nút phụ + chính 52; ≥ 768 thành hàng, nút 44 | `ThanhDinh` (chân dính) | Giữ Code | Đồng thuận. **Lấy** đệm 12 16, `max-width` 1280 giữa. Bộ: bóng `shadow-overlay` (Design chỉ kẻ trên) — giữ bộ. |
| 19 | Thanh trên: 60, logo 30, tên hệ thống 16/17, "Tạo đơn" san hô ≥ 768, Trợ lý · chuông (số 18, vòng 2 px) · tài khoản (44 tròn), vỏ `--vo-*` | chưa có (để 7b) | **Mới** | Thêm `ThanhTren` "MỚI · diện mạo từ Claude Design, 7b có thể sửa", gộp theo tên bộ (`c-bar-bg`/`c-on-bar`/`c-bar-border`, `bar-h`, `logo-bar` 30 — đều từ mã, đồng thuận). Điện thoại: "+ Tạo đơn" ở thanh tab (E1), ≥ 640/768: lên thanh trên — Design và E1 không mâu thuẫn. Tên hệ thống đọc token gốc `--co-5/6` → bộ dùng `fs-step-5/6`. Rê nút `color-mix` → bộ `c-icon-hover-on-bar`. |
| 20 | Thanh tab dưới: 56 + safe-area, kính .86 + blur 16, viên 56×32 nền biển nhạt, nhãn 12/500, đếm đỏ 18 | chưa có (để 7b) | **Mới** | Thêm `ThanhTabDuoi` MỚI. Đồng thuận với mã (`tabbar-h`, `c-tabbar-glass`, `c-tab-active-bg`). **Thiếu ở Design**: nút tròn san hô "+ Tạo đơn" giữa thanh (mã có, E1 duyệt) → bộ vẽ thêm từ mã (`c-tab-new-bg`, `shadow-tab-new`). Khoảng 768–899: Design dùng thanh tab (phương án B), bộ thanh bên gọn 56 (A). |
| 21 | Thanh bên 248: nhóm gập 36 (tên viết thường), mục 40, vạch 3 `c-indicator`, chọn nền biển nhạt, đếm tông Cát, chân Của tôi · Hỗ trợ · Hướng dẫn + người (chữ tắt 32) | chưa có (để 7b) | **Mới** | Thêm `ThanhBen` MỚI. Đồng thuận với mã (`w-sidebar` 248, mục 40, vạch 3, `c-sidebar-*`). Khác mã: tên nhóm **viết thường, không giãn chữ** (mã in hoa `ls-eyebrow`) → ghi phương án cho B-NHAN-IN-HOA ở 7b; đếm tông Cát → giữ `c-sidebar-badge` biển nhạt của mã; rê mục nền trắng (vì nền thanh là nền phụ) = đồng thuận `c-sidebar-hover`. Thanh bên gọn 56 (E3) Design không vẽ → 7b vẽ. |
| 22 | Khung xương: dòng 12 (nhịp 24), số 26 + 7,5em, viên 24×96, nhấp nháy 1,2 s | `KhungXuong` (`skel-dong` 16, `skel-so` 26, `skel-vien` 96) | Giữ Code | Đồng thuận trừ dòng 12 vs 16 → giữ 16. `role=status` + `prefers-reduced-motion` đồng thuận. |
| 23 | Trạng thái rỗng: vòng 56 nền phụ + biểu tượng 24, câu 16/500, phụ 14 ≤ 36ch, một nút, đệm 32 16 | `TrangThaiRong` (biểu tượng 48 nét 1,5, tiêu đề 18/600, câu 14, `w-narrow` 420) | **Lấy Design** | Bố cục bên trong là chỗ để dành: vòng tròn nền phụ 56 + biểu tượng 24 gọn hơn hình 48 trần; câu 16/500 + phụ 14. Giữ của bộ: ba biến thể (chưa có / không khớp / lỗi trang), một nút, `w-narrow`. |
| 24 | Phân trang: `tai-them` ("Đang hiện x / n", nút phụ ≤ 360, "Đã hiện hết") **và** `so-trang` (số trang 1…n, 44) | `TaiThem` ("Tải thêm 50" duy nhất; "Đừng: số trang 1 2 3") | Giữ Code | Kiểu `so-trang` **không lấy** (bộ đã chốt một cách phân trang). Kiểu `tai-them` đồng thuận; **lấy** dòng đếm `aria-live` và "Đã hiện hết n". |
| 25 | Trang mất mạng: khuôn `.ib-trang-bao` 440, vòng 64 tông Cát `history`, tiêu đề 20 / 24, câu cố định, nút chính `swap` "Thử lại"; ≥ 768 đệm trên 96 | chưa có (để 7b; bộ: mất mạng = `DaiTren` + nội dung cũ, chỉ khi chưa có bản nào mới ra trang) | **Mới** | Thêm `TrangMatMang` MỚI; luật dùng theo bộ (chỉ khi chưa có bản lưu). |
| 26 | Trang 403 / 404 cùng khuôn: vòng 64 nền phụ, `lock` / `search`, câu cố định, nút chính "Về Trang chủ" + lối nhỏ ("Nhờ cấp quyền" / "Báo địa chỉ sai"), dòng nhỏ "Mã 404 · /đường-dẫn" | `TrangThaiRong` biến thể lỗi trang (vỏ đầy đủ, **một** nút "Về trang đầu") | **Mới** | Thêm `TrangLoi` MỚI (trang đầy đủ dựng từ biến thể rỗng). **Không lấy** nút lối nhỏ thứ hai (bộ: một nút) và chữ "Nhờ cấp quyền"/"Báo địa chỉ sai" (hành động chưa có luồng). Dòng mã lỗi nhỏ 14: lấy (câu 10 cổng 1 cần e2e địa chỉ lạ). |

**Đếm:** Lấy Design 4 (04, 13, 15, 23) · Giữ Code 17 (00–03, 05–12, 14, 16, 18, 22, 24) · Mới 6 (17, 19, 20, 21, 25, 26). *So với danh sách 7 Main session nêu: bỏ `phan-trang` (↔ `TaiThem`, bộ đã có) và `bieu-tuong` (↔ trang Icons), thêm `dau-trang` (Design tách tiêu đề trang khỏi thanh trên — bộ chưa có cách này).*

## 6. Hai chỗ đã để dành cho Claude Design

**(a) Đệm và bố cục bên trong** → lấy **gói đệm 10 giá trị** của Design, ghi "MỚI · từ Claude Design", tên theo kiểu bộ (phiên dựng bộ chốt tên cuối): đệm nút `0 16` · đệm ô `0 12` · đệm chip `0 12` · đệm tab `0 16` · đệm huy hiệu `3 8 3 6` · đệm thẻ `16` / `24` (≥ 900) · lề trang `16` / `32` · nhịp giữa khối `24`; cộng một chiều cao: ô nhiều dòng tối thiểu `96` (chốt 4). Kèm số của Design cho bố cục bên trong đã liệt kê ở mục 5 (tay cầm 36×5, đệm bảng trượt, đệm dải, td 8×12, vòng 56/64/44).

**(b) Toast** → nền tối (mục 5, dòng 15): ghi **ĐỔI** so với mã ở README ThongBao và mục 11 (không ghi "từ mã"), lý do "nổi rõ trên nền trắng, tách khỏi thẻ/dải; cả bộ v1 lẫn Claude Design cùng chọn". Bỏ câu "diện mạo cuối chờ tấm vẽ Claude Design" ở README ThongBao và F6.

## 7. Phát hiện mới theo mã (ghi vào đặc tả đợt 0 khi lập — chưa có sổ việc đợt 0 riêng)

| Mã | Phạm vi | Phát hiện | Nặng |
|---|---|---|---|
| **B-VIEN-O-CHON-TUONG-PHAN** | Hệ thống · ô chọn một và ô nhập · cả hai khổ | Design nêu "viền ô tích #c9d4e0 chỉ 1,5:1". Tra mã: **ô tích** `.vc-check` là `<input>` gốc với `accent-color` — viền do trình duyệt vẽ, **đạt**; **vòng chọn một** `.vc-radio-dot` viền `bw-vc` 2 px màu `c-border` #e1e7ef (app.css dòng 2491) ≈ **1,25:1** trên nền trắng — dưới 3:1 của WCAG 1.4.11 cho điều khiển, **tệ hơn** con số Design nêu; **ô nhập** viền `c-input-border` #c9d4e0 = 1,5:1 (dòng 520, 583) — ranh giới ô là dấu hiệu duy nhất nhận ra ô gõ, cũng dưới 3:1 nhưng có nhãn trên ô và nền trắng tách khỏi nền phụ → ghi là **câu hỏi**, chưa chốt. Sửa đợt 0: viền chưa chọn của ô tích/ô chọn một = `c-text-muted` #475569 (7,6:1) theo chốt 4; viền ô nhập để 7b/đợt Biểu mẫu nhìn thật. | Vừa |

## 8. Lưu ý chất lượng bản xuất (để phiên dựng bộ không chép nhầm)

1. Ba token khai nhưng không CSS/JSX nào đọc (`--thanh-tab-den`, `--bang-tay-cam`, `--bao-xong-tg`), giá trị ghi cứng; `--bt-co`/`--bt-co-lon` cũng không được đọc.
2. Ô tích bo 6 cứng, trái readme ("ô tích bo 8") và bảng BỎ ("6 → 8").
3. Tên hệ thống trên thanh trên đọc thẳng token gốc `--co-5/6`.
4. Ngưỡng 768 / 900 ghi cứng 10 chỗ, không token; 74 bộ chọn có giá trị cứng (gap 2–12, vòng 44/56/64, logo 30, chữ tắt 32…).
5. Thẻ `dangTai` không chèn khung xương (chỉ `aria-busy`); bảng trượt không bẫy tiêu điểm; ngày/giờ là `type="text"`.
6. Readme ghi "37 biểu tượng từ mã" — mã có 40; và đề nghị BỎ 3 hình đang dùng.
7. Hai hành động mới chưa có luồng ("Nhờ cấp quyền", "Báo địa chỉ sai").

## 9. Việc cho phiên "Design System v2" khi gộp (checklist)

- [ ] `tokens.json`: thêm 10 đệm + ô nhiều dòng 96 (mục 6a) + `c-check-border` = {c-text-muted} + `c-switch-off-bg` = {c-input-border-hover}, mỗi dòng "MỚI · từ Claude Design"; ghi chú `focus-ring` 3 / cách 2.
- [ ] README mục 11: thêm các MỚI trên; ĐỔI thêm "toast nền tối (từ mã trắng vạch trái) — lý do"; BỎ thêm `radius-lg` 14 → 12; phím tắt bỏ `N` ("để sau", cổng 2a); mục 7 bỏ `N`.
- [ ] README mục 12: bỏ "thanh trên, thanh tab, thanh bên, trang 403/404/mất mạng" khỏi "chưa đưa vào bộ" (giữ "bảo trì, năm khuôn trang"); ghi "6 thành phần MỚI · diện mạo từ Claude Design, 7b có thể sửa".
- [ ] Thành phần sửa: `OChon` (04), `HopThoai` (13), `ThongBao` toast (15), `TrangThaiRong` (23); sửa câu "chờ tấm vẽ Claude Design" ở ThongBao.
- [ ] Thành phần thêm (6): `DauTrang`, `ThanhTren`, `ThanhTabDuoi` (+ nút tròn san hô giữa thanh theo E1), `ThanhBen` (+ ghi chú gọn 56 chờ 7b), `TrangMatMang`, `TrangLoi` — README + `preview.html` HTML tĩnh, **không** `.jsx`.
- [ ] `bundle.css`: thêm lớp cho 6 thành phần mới và đệm; giữ tên lớp của bộ (`.nut`, `.o-nhap`…), không `.ib-*`.
- [ ] Xuất bản, báo mã phiên bản mới; phiên kiểm chạy lại `doi-chieu-bo-v2.mjs` (88 giá trị) trên bản mới trước khi gộp nhánh.

## 10. Chưa đề xuất

Đổi tên ~460 token trong `public/app.css` sang tiếng Việt như Design (`--mau-bien`, `--c-nen`, `--co-1…14`, `--kc-*`): là quyết định riêng, nhiều rủi ro ở đợt 0 (đổi tên hàng loạt trong 3.600 dòng CSS + `web/`), **không hỏi chủ đợt này**. Nếu muốn, làm sau 7c khi mã là nguồn duy nhất, có kịch bản đổi tên và kiểm hình.
