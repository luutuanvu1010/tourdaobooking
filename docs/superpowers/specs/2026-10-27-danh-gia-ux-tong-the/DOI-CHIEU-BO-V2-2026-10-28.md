# Đối chiếu bộ "Island Booking System — Design System v2" với đầu vào từ mã (bước 2c, 28/10/2026)

Hồ sơ có ngày. **Bộ được kiểm**: `https://claude.ai/artifact/R7vYe6PdU85WCSYkanWNP5`, phiên bản `1793139375-8732`, do phiên Claude Code `island-booking-design-system-v2` dựng từ main `2847b6c2` (ghi trong `design-system.json`: 27/10 22:15 UTC = 05:15 sáng 28/10 giờ Việt Nam). **Căn cứ**: `DAU-VAO-BO-V2.md` (sửa 28/10: 40 biểu tượng), `HE-THONG-HOP-NHAT.md` (cổng 1), `QUYET-DINH-CONG-1.md`, tờ bổ sung `2026-10-27-danh-gia-ux-bo-sung.md`. **Cách kiểm**: tải 26 tệp chữ của bộ (sổ tay, `tokens.json`, `design-system.json`, 20 trang thành phần, `bundle.css`) về máy; chạy `docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/doi-chieu-bo-v2.mjs` so 88 giá trị đầu vào với 189 token; đếm mục trong 20 trang thành phần bằng `grep`; đọc sổ tay 12 mục. Không sửa bộ (phiên kia giữ quyền ghi). Không chấm bằng mắt bản xem trước (việc của chủ ở cổng 2a).

**Kết quả: 52 dòng kiểm — ĐẠT 35 · LỆCH 7 · THIẾU 3 · TỰ QUYẾT 7 (mục F, phân loại a/b/c).** Giá trị đơn lẻ: 81/88 khớp đúng chữ số; 7 chưa thấy gồm 1 bóng cố ý BỎ có lý do và 6 chỗ thuộc thang cỡ chữ (dòng A2, A3). Không dòng nào trái quyết định của chủ. Bộ **dùng được làm nền** cho cổng 2a. Việc chia ba: **phiên giữ bộ sửa ngay** (A2, A3, B4, E5, F3 phạm vi 17 → 16, F4 `fw-home-stat`, F7 dấu MỚI cho ba mốc); **chủ duyệt một lần ở cổng 2a** (E1–E4, F2 bề rộng 1280 thay 1200, F3 ba độ đậm và vành 3 px, F5 nét biểu tượng); **chờ Claude Design** (F1 đệm bên trong thành phần, F6 diện mạo toast).

## A. Giá trị token (nguồn: `tokens.json`, 189 token, 15 nhóm)

| # | Hạng mục | Kết quả | Ghi chú |
|---|---|---|---|
| A1 | 40 mã màu ở `DAU-VAO` mục 2 | **ĐẠT** | 40/40 đúng hex, đúng tên (`c-primary` #0c4a6e … `c-tile-all-bg` #eef2f6); 19 token ghi "Gốc · tourdaovn" |
| A2 | Thang cỡ chữ 14 bậc `fs-step-1…14` | **THIẾU** | Sổ tay mục 4 nói "mọi cỡ chữ là một bậc của thang 14 bậc" nhưng `tokens.json` không khai 14 bậc; nhóm `type.groups` chỉ có 14 *vai chữ* dùng 8 bậc (12, 13, 14, 16, 18, 20, 24, 26). Sáu bậc 15, 17, 19, 22, 28, 32 không có vai nào. Cần thêm thang vào token hoặc sửa sổ tay |
| A3 | Chiều cao dòng tiêu đề `lh-heading` 1,16 (từ mã) | **LỆCH** | Vai `tieu-de-trang` dùng 1,3; nội dung 1,5. Đổi không ghi "ĐỔI" + lý do như luật của chính bộ |
| A4 | Khoảng cách `s1…s7` 4/8/12/16/24/32/48 | **ĐẠT** | 7/7, mỗi token có công dụng |
| A5 | Bo góc 6/8/12/14/18/999 | **ĐẠT** | `radius-xs` 6 BỎ đúng đề cương (chỉ còn ở ô chọn `vc-radio-on`); `bo-control` 8 MỚI = `radius-sm` |
| A6 | 5 bóng | **ĐẠT** | 4/5 đúng chuỗi; `shadow-float` BỎ có lý do (Trợ lý lên thanh trên, câu 4 cổng 1) |
| A7 | Chuyển động `ease-out` cubic-bezier(.22,1,.36,1), 150 ms, 200 ms | **ĐẠT** | Giữ đường cong từ mã thay vì đường cong mới của đề cương, có ghi lý do — hợp `DAU-VAO` mục 3 |
| A8 | `m-fast` 180 ms, `m-base` 300 ms, `m-spin` 700 ms (từ mã) | **ĐẠT** | Có đủ trong `tokens.json`, ghi "Gốc · tourdaovn, giữ nguyên" (bản đầu của bảng này ghi thiếu, đã sửa sau khi kiểm lại) |
| A9 | Chiều cao 44 / 52 / 60 | **ĐẠT** | `h-control`, `h-control-lon` MỚI thay 9 token; `bar-h` 60 |
| A10 | Lớp xếp 10/20/30/40/50 | **ĐẠT** | `z-dinh … z-tren-cung` MỚI, mỗi lớp ghi gì nằm ở đó |
| A11 | `w-noi-dung-max` 1280 | **ĐẠT** | MỚI, thay `w-main` 1200 và mốc 1400 Trang chủ |
| A12 | Độ đậm 400 / 500 / 600 (QĐ2 cổng 1) | **ĐẠT** | `fw-regular` 400; `fw-medium`, `fw-semibold` 500; `fw-bold`, `fw-heavy`, `fw-heading` 600 ghi "ĐỔI 500 → 600"; ghi chú ba núm Giao diện công ty và "chữ mảnh 1.65" đúng |
| A13 | 17 token MỚI | **ĐẠT** | Đều có lý do; khớp bảng MỚI của đề cương mục 7 (thêm `w-sidebar-gon` 56 từ mục 4). Chờ chủ duyệt ở cổng 2a như sổ tay ghi |
| A14 | 4 token ĐỔI | **ĐẠT** | `focus-ring` 2 → 3 px (đề cương mục 3); ba độ đậm (QĐ2) |
| A15 | Mỗi token một dòng công dụng | **ĐẠT** | 189/189 có dòng |
| A16 | Phông Be Vietnam Pro 400–800 + Nunito, Lexend, Noto Sans 400–700 | **ĐẠT** | 17 tệp woff2 đúng tên trong `project/fonts/`; dự phòng đúng chuỗi |
| A17 | Biểu tượng | **ĐẠT** | 40 chép từ `web/icons.ts` (đếm lại mã: đúng 40, `DAU-VAO` bản đầu ghi 37 là sai, đã sửa) + 2 MỚI `alertCircle`, `minus` có lý do |
| A18 | Logo | **ĐẠT** | 4 tệp PNG đúng tên; luật không vẽ lại, không đổi màu |

## B. Thành phần (nguồn: 20 thư mục `project/components/*`, sổ tay mục 10, 12)

| # | Hạng mục | Kết quả | Ghi chú |
|---|---|---|---|
| B1 | Thành phần bắt buộc (`DAU-VAO` mục 8) có trang mô tả + xem trước | **ĐẠT** | 20 thư mục: Nut, ONhap, OChon (tích, chọn một, công tắc), ONgay, BoDem, Chip, HuyHieu, The, Bang, DongDanhSach, BangTruot, HopThoai (hộp xác nhận), ThongBao (dải + toast), DaiTren, Tab, TaiThem (phân trang), TimLoc, ThanhDinh (đầu trang + chân dính), KhungXuong, TrangThaiRong |
| B2 | Thanh trên, thanh tab dưới, thanh bên | **THIẾU** | Có khai ở mục 12 "chưa đưa vào bộ, vẽ ở đề bài khung chung 7b"; luật của chúng đã có ở sổ tay mục 7 (60 / 56 / 248, tối đa 10 mục) |
| B3 | Trang mất mạng, trang 403/404 | **THIẾU** | Có khai như B2; `DaiTren` đã có tông `mat-mang` với `c-mat-mang-bg` MỚI |
| B4 | Mỗi trang thành phần có 4 mục: khi nào dùng, trạng thái, người dùng truyền gì, đừng | **LỆCH** | 15/20 đủ bốn tiêu đề. `DaiTren`, `HuyHieu`, `ThongBao` thay "Khi nào dùng / Trạng thái" bằng "Tông / Năm tông / Luật" (nội dung vẫn đủ); `ThanhDinh` thiếu "Khi nào dùng"; `TrangThaiRong` thiếu "Trạng thái". Chỉ lệch tên mục |
| B5 | Từ vựng 5 tông trạng thái: một chữ + một tông + một biểu tượng + một hình | **ĐẠT** | `HuyHieu` 12/500, bo 999, không viền, nền nhạt chữ đậm; thêm tông `gia` cho nhãn giá (xem E1) |
| B6 | Thang nút ba cấp, tối đa một nút chính mỗi vùng, bo 8, cao 44/52 | **ĐẠT** | Sổ tay mục 10 + `Nut` |
| B7 | Nhãn luôn nằm trên ô, không nhãn nổi, "(tuỳ chọn)" sau nhãn, không dấu * | **ĐẠT** | Sổ tay mục 2; mục 12 ghi ô nhãn nổi Tạo đơn không nhân rộng |
| B8 | Nút tắt xám phẳng kèm một dòng vì sao tắt | **ĐẠT** | Sổ tay mục 2, 10; `BoDem`, `HopThoai` áp đúng |
| B9 | Một mật độ (phụ A cổng 1) | **ĐẠT** | `Bang` hàng 44, không có núm gọn/thoáng |

## C. Quyết định cổng 1 (`QUYET-DINH-CONG-1.md`)

| # | Quyết định | Kết quả | Chỗ thấy |
|---|---|---|---|
| C1 | QĐ1 cấu trúc ba tầng theo đề cương | **ĐẠT** | Sổ tay mục 1; token ghi tầng "Gốc / Ý nghĩa" trong công dụng |
| C2 | QĐ2 ba mức đậm | **ĐẠT** | A12 |
| C3 | Câu 4 không nút nổi, Trợ lý lên thanh trên | **ĐẠT** | `c-fab-*`, `shadow-float`, `z-tl-fab` BỎ; mục 7 |
| C4 | Câu 6 đếm nhóm gập là một, trần 10 mục hiện sẵn | **ĐẠT** | Mục 7 |
| C5 | Câu 7 tiền ghi đủ mọi khổ | **ĐẠT** | Mục 2 |
| C6 | Câu 8 dải trên tối đa một, thu gọn, nhớ theo phiên, "Đã hiểu" cho thông báo quan trọng | **ĐẠT** | `DaiTren`, mục 7 |
| C7 | Câu 12 tổng hoa hồng Đối tác KHÔNG đưa vào bộ | **ĐẠT** | Không thấy trong sổ tay hay thành phần |

QĐ3 (khung tải), câu 9, 10, 11, phụ B không thuộc phạm vi bộ.

## D. Năm điểm của tờ bổ sung (mã B-…)

| # | Điểm | Kết quả | Chỗ thấy |
|---|---|---|---|
| D1 | B-BO-QUA-DIEU-HUONG lối "Bỏ qua tới nội dung chính" | **ĐẠT** | Mục 7 |
| D2 | B-THIET-LAP-CHE chân thanh bên không che nhóm mở | **ĐẠT** | Mục 7 (thanh bên cuộn phần giữa, chân dính đáy) |
| D3 | B-NHAN-IN-HOA in hoa chỉ ở hai chỗ | **ĐẠT** | Mục 2; `DongDanhSach` tiêu đề nhóm |
| D4 | B-TEN-NUT-XAC-NHAN một việc một tên | **ĐẠT** | Mục 2 |
| D5 | B-TONG-HOA-HONG-DOI-TAC không đưa vào | **ĐẠT** | C7 |

## E. Điểm lệch cần chốt (chủ hoặc phiên điều phối; mỗi dòng có đề xuất)

| # | Lệch | Kết quả | Đề xuất |
|---|---|---|---|
| E1 | San hô: sổ tay mục 3 cho "nút tròn + Tạo đơn ở **thanh tab**" và "**nhãn giá**" (huy hiệu tông `gia` nền `c-accent-soft`); đề cương mục 6 và đề bài số 0 ghi "+ Tạo đơn ở thanh trên", không nói nhãn giá | **LỆCH** | Theo mã hiện có (nút + nằm ở thanh tab, `c-tab-new-bg`): sửa chữ đề cương "thanh trên" → "thanh tab"; nhãn giá tông san hô nhạt không phải hành động, chấp nhận và ghi vào từ vựng. Cần chủ gật vì chạm quyết định A2 |
| E2 | Biểu tượng tông: Biển `history` (đề bài gợi `swap`), Đỏ `alertCircle` MỚI (gợi `alert`), Xám `minus` MỚI (gợi `ban`) | **LỆCH** | Theo bộ: `history` đúng nghĩa "mũi tên vòng", `alertCircle` tròn hợp huy hiệu, `minus` rõ hơn `ban`. Hai hình MỚI phải vào `web/icons.ts` ở đợt 0 |
| E3 | Mốc 641–899: thanh bên thu gọn 56 px chỉ biểu tượng (`w-sidebar-gon` MỚI) — hành vi iPad dọc chưa có ở đề bài | **LỆCH** | Giữ; kiểm bằng mắt ở đề bài khung chung (7b) với khổ 768 trước khi thi công |
| E4 | Phím tắt `/`, `Esc`, `N` (sổ tay mục 7, "MỚI, chờ duyệt") | **LỆCH** | Chủ quyết. Đề xuất: `/` và `Esc` ở đợt 0; `N` để sau vì dễ bấm nhầm khi đang gõ |
| E5 | `mono` "chỉ cho mã PIN" (đề bài số 0: mã đơn, số kỹ thuật) | **LỆCH** (nhỏ) | Phiên giữ bộ chọn một và ghi; đề xuất: mono cho mã PIN và mã giao dịch, mã đơn dùng `sans` chữ số đều cột |
| E6 | Tiêu đề trang 18/600 (đề bài số 0 ghi 20–24) | **ĐẠT theo mã** | Bộ đúng (`fs-title` = bậc 7 = 18); đề bài số 0 sai, đã sửa 28/10 |

## F. Bảy điểm phiên dựng bộ tự khai là "đoán hoặc tự quyết" (chuyển qua phiên điều phối 28/10)

Phân loại: **(a)** chép sai hoặc sót so với mã → phiên giữ bộ sửa ngay; **(b)** tự quyết hợp lý, có gốc ở đề cương hoặc quyết định cổng 1 → ghi nhận, chủ duyệt một lần ở cổng 2a, kèm "mất gì"; **(c)** diện mạo → gác lại chờ bảng gộp với Claude Design. Đã kiểm lại trong `public/app.css` (khối `:root`, dòng 26–558, main 2847b6c2).

| # | Điểm tự khai | Kiểm trong mã | Loại | Mất gì / đề xuất |
|---|---|---|---|---|
| F1 | Tên lớp trong `bundle.css` (`.nut`, `.o-nhap`, `.huy-hieu`, `data-cap`, `data-tong`…) và đệm bên trong thành phần là đề xuất, không chép từ mã | Đúng: mã chưa có lớp dùng chung (64 họ tên lớp theo trang) | **(b)** tên lớp · **(c)** đệm, bố cục bên trong | Tên lớp là hợp đồng cho đặc tả đợt 0, chủ không cần quyết; đệm/bố cục bên trong chờ tấm vẽ Claude Design rồi gộp |
| F2 | Token MỚI tự chọn: `h-control` 44/52, `z-*` 10–50, `bo-control` 8, `t-nhanh` 150 / `t-vua` 200, `w-noi-dung-max` 1280, `w-sidebar-gon` 56, `skel-dong` 16 / `skel-so` 26 / `skel-vien` 96, `c-mat-mang-bg` = `c-sand-soft` | 44 = `tap-min`, 52 = `h-field`, 8 = `radius-sm`, 16/26/96 = `skel-md`/`skel-num`/`skel-pill` đều có trong mã (chỉ đổi tên); `z` 10–50, 150/200, 56 là số mới theo đề cương mục 7; **mã có `w-main` 1200**, bộ bỏ và thay 1280 | **(b)** | Chủ cần thấy ở 1280: màn ≥ 1440 nội dung rộng thêm 80 px so với hôm nay và Trang chủ bỏ mốc 1400 riêng → bảng nhiều cột hơn nhưng dòng chữ dài hơn; đảo được bằng đổi một số. Các token còn lại không đổi thứ người dùng thấy |
| F3 | ĐỔI: ba độ đậm 500 → 600; `focus-ring` 2 → 3 px; ô gõ Đăng nhập 17 → 16; cỡ chữ lẻ về bậc thang | Mã: `focus-ring` 2 px (dòng 79); **`--fs-field` = bậc 6 = 17 px dùng ở 8 chỗ** (ô tìm, ô chọn Điều phối, thêm hành khách…), không chỉ Đăng nhập → bộ chép thiếu phạm vi | **(a)** phạm vi 17 → 16 · **(b)** phần còn lại | Sửa mô tả: ĐỔI áp cho 8 chỗ dùng `fs-field`. Mất gì: 500 → 600 mất "chữ mảnh" chủ chọn ở 1.65 (chủ đã chốt QĐ2, biết điều này); vành 3 px dày hơn, có thể chạm viền ô kế bên trong lưới chật; chữ trong ô nhỏ đi 1 px, vẫn ≥ 16 nên iPhone không phóng |
| F4 | Giá trị đã khai triển: `grad-*` ghi hex; `fs-ui` dạng `max()` và `fw-home-stat` dạng `calc()` ghi giá trị đã tính | 4 dải màu đúng với mã (`grad-brand` #0c4a6e → #155e75; `grad-brand-v` #0e7490 → #0c4a6e; `grad-summary` = `grad-brand`; `grad-gloss` đúng rgba); `fs-ui` = bậc 5 = 16 đúng; **`fw-home-stat` không có trong `tokens.json`** (mã: `min(heavy + 100, 800)` → với heavy 600 là 700) | **(a)** `fw-home-stat` · **(b)** phần còn lại | Thêm `fw-home-stat` 700 (hoặc ghi BỎ kèm lý do); sổ tay mục 12 đang nói đã ghi giá trị tính sẵn nhưng không thấy |
| F5 | 40 SVG sinh từ `SHAPES` của `web/icons.ts` bằng regex + eval; nét #0f172a thay `currentColor`; `alertCircle`, `minus` MỚI do phiên đó vẽ; tài liệu cũ ghi 24/37 | Mã đúng 40 khoá (kể cả `userPlus`, `checkCircle`, `filePlus`); số 37 là lỗi đếm của phiên này, 24 là lỗi đề bài gốc — cả hai đã sửa 28/10. Hình sinh tự động chưa ai soi bằng mắt từng cái | **(b)** nét và 2 hình MỚI · **(a)** số đếm (bên phiên này, đã sửa) | Chủ lướt bảng 42 biểu tượng ở cổng 2a (một lần nhìn); hai hình MỚI vào `web/icons.ts` ở đợt 0 |
| F6 | Toast nền `c-primary-strong`, nút Hoàn tác màu cát, toast nằm trên bảng trượt; giữ `ease-out` có sẵn | Mã: toast nền trắng `c-surface`, viền trái 4 px `c-primary`, chữ `c-text`, bóng `shadow-overlay` (dòng 2192) → bộ tự đổi diện mạo | **(c)** diện mạo toast · **(b)** lớp xếp và `ease-out` | Tạm giữ toast theo mã trong bộ; diện mạo chờ Claude Design rồi gộp. Toast trên bảng trượt (`z-tren-cung`) hợp lý |
| F7 | Tờ tóm tắt ghi "MỚI 19 token"; đếm dấu MỚI trong `tokens.json` ra 16 + 3 mốc không đánh dấu | Máy đếm 28/10: 16 token có chữ MỚI trong công dụng + 3 `moc-*` (chữ MỚI chỉ ở ghi chú nhóm) = 19 → tờ tóm tắt đúng | **(a)** nhỏ | Đánh dấu MỚI vào từng mốc để máy đếm ra 19 |

## G. Việc tiếp theo

1. Phiên giữ bộ (`island-booking-design-system-v2`) sửa A2, A3, B4, E5, F3 (phạm vi 17 → 16), F4 (`fw-home-stat`), F7 (lệch nhỏ, không cần chủ).
2. Phiên điều phối đưa E1–E4 và ba điểm "mất gì" F2 (1280 thay 1200), F3 (600 và vành 3 px, ô gõ 16), F5 (lướt 42 biểu tượng) vào tờ cổng 2a cho chủ chốt cùng ba quyết định đã có ở `TOM-TAT-CONG-2A.md`.
3. Khi Claude Design trả tấm vẽ (đề bài số 0): đối chiếu diện mạo thành phần với bộ này, lập bảng "gộp gì vào bộ v2" (việc 2 của phiên điều phối giao).
