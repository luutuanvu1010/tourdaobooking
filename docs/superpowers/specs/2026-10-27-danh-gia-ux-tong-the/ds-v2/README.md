Sổ tay thương hiệu và luật dùng cho giao diện **Island Booking System** — nền tảng nội bộ của Công ty TNHH Tour Đảo (Nha Trang): lập đơn dịch vụ tour, xác nhận đơn, điều phối xe, công nợ, hoa hồng đối tác. Từ 29/10/2026 (7c) bộ này là **tấm gương của mã**: `public/app.css` (`:root` và khối «Thành phần chung v2»), `web/icons.ts`, `src/shared/muc-giao-dien.ts`, `public/fonts/`, `public/icons/` trên `main` là nguồn duy nhất; bộ chép lại và máy kiểm độ khớp (mục 12). Vẽ màn mới thì dùng bộ này; muốn đổi một giá trị thì đổi trong mã trước, rồi đồng bộ lại bộ. Hai bộ cũ trên Claude chỉ để tra, không dùng để vẽ.

## 1. Cách dùng bộ này

- **Ba tầng token.** *Gốc* = bảng màu thương hiệu tourdaovn, thang cỡ chữ 14 bậc, khoảng cách `s1`–`s7`, bo `radius-*`, bóng, phông — giá trị không đổi. *Ý nghĩa* = token theo vai (`c-bar-bg`, `c-btn-primary-bg`, `c-focus`, `h-control`, `z-*`, `t-nhanh`) — thành phần và màn chỉ được trỏ vào tầng này. *Thành phần* = số đo riêng khi một thành phần cần giá trị khác ý nghĩa (`shadow-btn-solid`, `c-tile-*`, `c-check-border`, gói đệm `pad-*`). Mỗi token có một dòng công dụng; đọc dòng đó trước khi dùng.
- **Dấu hiệu trong công dụng.** `Đợt 0 · đã vào mã` = token mới của đợt 0 nay đã có trong mã; `Đã đổi ở đợt 0` = giá trị đã đổi trong mã; `Bí danh trong mã` = tên cũ còn dùng, sẽ bỏ ở phát hành 2; `Ngoài mã: <lý do>` = token chỉ có trong bộ (bốn cái, mục 12); `Gốc · tourdaovn` = không được đổi giá trị. Token định bỏ không có mặt trong bộ; mục 11 liệt kê.
- **Không viết cứng.** Màu, cỡ, khoảng cách, bo, bóng, thời lượng trong bản vẽ phải là tên token của bộ này. Thiếu token thì đề xuất token mới trong bảng «Token đã dùng» của bản vẽ (đi vào mã trước, bộ chép sau), không ghi số lẻ.
- **Chỉ giao diện sáng.** Một chủ đề `light`; không có chế độ tối.
- **Chữ mặc định là Be Vietnam Pro**, nhưng chủ có thể đổi sang Nunito, Lexend hay Noto Sans ở màn Giao diện công ty (ADR-0087), nên bố cục phải chịu được cả bốn phông: không canh chữ bằng số pixel của một phông.

## 2. Nội dung chữ

- **Tiếng Việt có dấu** ở mọi chỗ người dùng thấy. Không lộ mã, không chữ Anh ngoài tên riêng («Island Booking System», «Harbour», «Vinwonders»).
- **Một khái niệm, một từ** (`docs/SYSTEM-DESIGN.md` §15). Một việc chỉ mang một tên trên suốt đường đi: nút «Lưu, chờ xác nhận» dẫn tới hộp «Xác nhận đơn để gửi khách» rồi huy hiệu «Chờ xác nhận» là ba tên cho một việc — không lặp lại (B-TEN-NUT-XAC-NHAN).
- **Nhãn viết thường**, viết hoa chữ đầu: «Chưa xếp», «Các bên đang giữ». **In hoa chỉ ở** tiêu đề nhóm thanh bên (`eyebrow`: VẬN CHUYỂN, TIỀN, THIẾT LẬP) và tiêu đề mục nhỏ trong danh sách dài (★ HAY DÙNG). Ô số liệu, huy hiệu, nút không in hoa (B-NHAN-IN-HOA).
- **Tiền ghi đủ, một cách:** «1.080.000 ₫» ở mọi khổ màn hình, dấu chấm ngăn nghìn, dấu cách trước ₫; không «1,08tr», không «410k». Thẻ 390 không đủ chỗ thì số xuống dòng riêng, không cắt «…» (câu 7 cổng 1). Trong bảng, số canh phải, dùng chữ số đều cột.
- **Ngày** dd/mm/yyyy; **giờ** 07:30. **Số khách** «2 NL · 1 TE» chỉ trong dòng gập, kèm chú thích một lần ở đầu danh sách; ở chi tiết ghi đủ «2 người lớn, 1 trẻ em».
- **Tên khách không cắt** dưới 20 ký tự ở 390: huy hiệu xuống dòng hai, không chiếm chỗ dòng tên.
- **Nhãn ô luôn thấy, nằm trên ô** (câu 5 cổng 1). «(tuỳ chọn)» ghi sau nhãn; không dùng dấu `*` cho bắt buộc.
- **Câu lỗi** nói chuyện gì xảy ra và làm gì tiếp: «Chưa chọn lý do. Chọn một lý do để lưu.» Nút tắt phải kèm một dòng vì sao tắt.
- **Nút là động từ**: «Lưu», «Xác nhận đơn», «Tải thêm 50», «Về trang đầu». Không emoji, không dấu chấm cuối nhãn nút.
- **Chữ hệ thống** («Đang ngoài mạng — dữ liệu lần xem gần nhất», «Không có quyền xem trang này», «Không tìm thấy trang») dùng cùng một câu ở mọi trang.

## 3. Màu

Bảng màu theo hình ảnh đảo: **biển đậm** `c-primary` (khung, nút chính), **ngọc** `c-lagoon-*` (đang chọn, tiêu điểm, nhóm Vận chuyển), **san hô** `c-accent` (hành động chốt), **cát** `c-sand-*` (nhắc nhở), nền xám xanh trung tính `c-surface-alt` để thẻ trắng `c-surface` nổi lên (Thị giác 1.70, chủ duyệt 2/10/2026).

- Chữ nội dung `c-text` trên `c-surface` và `c-surface-alt`; chữ phụ `c-text-muted`. Cả hai ≥ 6,8:1.
- **San hô chỉ cho hành động chốt**: «Xác nhận đơn để gửi khách», nút tròn «+ Tạo đơn» ở thanh tab, nhãn giá. Lỗi và xoá dùng `c-danger-*`, không dùng san hô.
- **Nút chính** nền `c-btn-primary-bg` chữ `c-btn-primary-text`; **nút phụ** nền `c-surface` viền `c-primary` chữ `c-primary`; **lối nhỏ** chữ `c-primary` không nền. Nền nhạt `c-btn-soft-bg` chỉ còn cho **mục đang chọn** (`c-selected-*`) và huy hiệu tông Biển.
- **Tiêu điểm**: vành `focus-ring` (3 px) màu `c-focus` quanh mọi thứ bấm được khi dùng bàn phím; ô đang gõ viền `c-focus` + vành nhạt `c-focus-ring`.
- **Viền**: thẻ `c-border` (hoặc `ring-card`), ô nhập `c-input-border` đậm hơn một bậc, rê chuột `c-input-border-hover`.
- **Màu theo vai** (`c-bar-bg`, `c-on-bar`, `c-sidebar-*`, `c-btn-primary-*`, `c-tab-*`) là thứ màn Giao diện công ty đổi được: bản vẽ trỏ vào tên vai, không trỏ thẳng `c-primary`.
- **Ảnh biên nhận gửi khách** giữ `c-receipt-*` cũ, không theo núm Giao diện.

### Năm tông trạng thái (một chữ + một tông + một biểu tượng + một hình)

| Tông | Ý nghĩa | Nền | Chữ và biểu tượng | Biểu tượng | Trạng thái dùng |
|---|---|---|---|---|---|
| Cát | chờ, cần làm, cảnh báo nhẹ | `c-sand-soft` | `c-sand-text` | `clock` | Chờ xác nhận, Chưa xếp, Sắp hết hạn, Chưa ai nhận, Vé mới |
| Biển | đang diễn ra, thông tin | `c-primary-soft` | `c-primary-strong` | `history` (mũi tên vòng) | Đang xử lý, Đang chạy, Đã xếp, Đã giao |
| Xanh lá | xong, tốt | `c-green-soft` | `c-green-text` | `check` | Đã xác nhận, Hoàn tất, Còn hạn, Đã thu đủ, Vé xong |
| Đỏ | lỗi, huỷ, quá hạn | `c-danger-soft` | `c-danger` | `alertCircle` (đợt 0) | Đã huỷ, Từ chối, Hết hạn, Quá hạn, Giữ lại |
| Xám | nháp, ngưng, không áp dụng | `c-surface-alt` | `c-text-muted` | `minus` (đợt 0) | Nháp, Ngưng dùng, Đã khoá, Không còn trong Sheet |

Luật: không mượn tông Cát cho ý nghĩa khác; «Đã giao – đã thu đủ» là một trạng thái, không ghép hai huy hiệu; mọi tông đều có biểu tượng để không chỉ dựa vào màu. Huy hiệu (`.huy-hieu[data-tong]` của mã): chữ `fs-badge` 12 / `fw-semibold`, bo `radius-pill`, không viền, nền nhạt chữ đậm (xem thành phần HuyHieu).

## 4. Chữ

- Phông `sans` = Be Vietnam Pro tự lưu (`fonts/be-vietnam-pro-400…800.woff2`, giấy phép OFL), dự phòng system-ui → Segoe UI → Roboto → Noto Sans. `mono` chỉ cho **mã PIN và mã bảo mật hai lớp** (khoá cài đặt, mã khôi phục — đúng như mã: `.pin`, `.mfa-key code`, `.mfa-codes code`, `.mfa-code`). Mã đơn, biển số, số tiền dùng `sans` với chữ số đều cột (`font-variant-numeric: tabular-nums`), không dùng `mono`. Ba họ tuỳ chọn `nunito`, `lexend`, `noto` chỉ nạp khi chủ chọn ở Giao diện công ty.
- **Mọi cỡ chữ là một bậc của thang 14 bậc** `fs-step-1` (12 px) … `fs-step-14` (32 px), khai ở họ token «co-chu». Vai chữ dưới đây chỉ dùng 8 bậc (12, 13, 14, 16, 18, 20, 24, 26); sáu bậc 15, 17, 19, 22, 28, 32 còn dùng ở các màn riêng và giữ trong thang để đợt 0 trỏ bậc thay số lẻ. Không có cỡ 11 px; không có cỡ lẻ 12,8 / 13,6 / 14,4 / 17,6 px (định đưa về bậc gần nhất; mã còn `fs-old-*`, `fs-pin` — mục 11).
- **Vai chữ** dùng hằng ngày: `than` 16/400 · `nhan` 14/500 · `nut` 16/500 · `huy-hieu` 12/500 · `chu-phu` 13/400 · `chu-nho` 12/400 · `tieu-de-trang` 18/600 · `tieu-de-khoi` 16/600 · `tieu-de-lon` 24/600 · `so-lon` 26/600 · `so-lon-hep` 20/600 · `o-go` 16/400 · `eyebrow` 12/600 in hoa · `ma-pin` 20/500 mono.
- **Chiều cao dòng** đặt theo vai, không theo một token chung: nội dung 1,5; `tieu-de-khoi` 1,4; `tieu-de-trang` 1,3; `tieu-de-lon` 1,25; `so-lon`, `so-lon-hep` 1,2; `huy-hieu` 1,35. Token `lh-heading` 1,16 của mã **BỎ**: app.css tự ghi chú «KHÔNG dùng ở đâu» (grep = 0); giá trị theo vai ở trên là lựa chọn của bộ, chờ tấm vẽ Claude Design xác nhận.
- **Độ đậm ba mức** (QĐ2 cổng 1): 400 nội dung (`fw-regular`), 500 nhãn và nút (`fw-medium`, `fw-semibold`), 600 tiêu đề và số lớn (`fw-bold`, `fw-heavy`, `fw-heading`). Ba núm «Độ đậm …» ở Giao diện công ty vẫn tinh chỉnh được; «chữ mảnh» chốt ở bản 1.65 (2/10) giữ nguyên là lựa chọn của chủ, bộ này chỉ đổi giá trị mặc định.
- **Ô gõ không dưới 16 px** (`o-go`). Đã đổi ở đợt 0: token `fs-field` (trước = bậc 6, 17 px) nay 16 px ở **cả 8 chỗ dùng**: ô tìm `.scn-tim input`, ô chọn `.scn-xep select` (Điều phối), thêm hành khách `.ht-nhom-them-nguoi input/select`, ô lọc `.ht-loc input[type=search]`, ô trả lời `.ht-tra-loi textarea` (Hỗ trợ), Đăng nhập `.login-field input`, `.vc-input` (Vận chuyển), ô ghi chú `.tx-o textarea` — để mọi ô gõ cùng một cỡ.
- **Độ đậm số lớn Trang chủ** `fw-home-stat` = fw-heavy + 100 (tối đa 800) → 700 sau QĐ2; đi theo núm, không ghi số.
- Tiêu đề trang cắt một dòng bằng «…» là chỗ **duy nhất** được cắt chữ; số tiền và tên khách không bao giờ cắt.

## 5. Khoảng cách, bo góc, bóng

- Khoảng cách chỉ lấy từ `s1` 4 · `s2` 8 · `s3` 12 · `s4` 16 · `s5` 24 · `s6` 32 · `s7` 48. **Gói đệm** (đợt 0 · đã vào mã, từ Claude Design, họ token «dem»): nút `pad-nut` 16 · ô `pad-o` 12 · chip `pad-chip` 12 · tab `pad-tab` 16 · huy hiệu `pad-huy-hieu-*` 3 / 8 / 6 (cao 24) · thẻ `pad-the` 16, `pad-the-rong` 24 (≥ 900) · lề trang `le-trang` 16, `le-trang-rong` 32 (≥ 900) · nhịp giữa khối `nhip-khoi` 24 · ô nhiều dòng tối thiểu `h-o-nhieu-dong` 96. Dòng danh sách đệm `s3` × `s4`.
- Bo: nút và ô `bo-control` (= `radius-sm` 8); thẻ, ô số liệu, dải, hộp thoại `radius-md` 12 (bo 14 `radius-tile` của ô số liệu định bỏ, mã còn); góc trên bảng trượt `radius-lg` 18; viên thuốc `radius-pill` **chỉ** cho huy hiệu, chip, tab viên thuốc, nút tròn «+ Tạo đơn». Bo 6 và 4 của Điều phối định bỏ (mã còn).
- Bóng ba mức: `shadow-card` (thẻ), `shadow-card-hover` (thẻ bấm được khi rê, kèm nhấc `lift`), `shadow-overlay` (bảng trượt, hộp thoại, toast). Nút chính đặc dùng `shadow-btn-solid`, nút san hô `shadow-btn-accent`. Viền thẻ vẽ bằng `ring-card` để không đổi kích thước.

## 6. Chuyển động

- Chỉ khi rê, bấm, mở bảng — không có hiệu ứng lúc tải trang. `t-nhanh` 150 ms cho rê/bấm/đổi màu/toast; `t-vua` 200 ms cho bảng trượt, hộp thoại, mở gập thẻ; `m-base` 300 ms cho chuyển trang (View Transitions giữa tài liệu). Một đường cong `ease-out` cho tất cả. Nút lún `press` 0,97 khi bấm.
- Máy đặt «Giảm chuyển động» thì mọi thời lượng về 0 và bỏ hiệu ứng trượt.
- Vòng quay trong nút chính khi đang gửi: một vòng `m-spin` 700 ms, vành mờ `c-spinner-track`.

## 7. Bố cục, khung và mốc đáp ứng

- **Ba mốc như mã**: ≤ 640 điện thoại (`moc-dien-thoai`; hộp thoại giữa màn từ 641), ≥ 900 máy tính (`moc-may-tinh`; mã viết 899/900), ≥ 1200 rộng (`moc-rong`). 641–899 (iPad dọc) **giữ bố cục điện thoại** với thanh tab dưới (cổng 2b chọn B); `w-sidebar-gon` chưa dùng. Nội dung tối đa `w-noi-dung-max` 1280 căn giữa. Luật cũ ở 720/960/1024/1400 còn trong mã, dọn ở Chặng 3.
- **Khung chung**: thanh trên cao `bar-h` 60, tiêu đề trang nằm trên thanh (cổng 2b chọn A; trái = logo hoặc quay lại / «Trang cha ›»; giữa = tiêu đề `tieu-de-trang`; phải = ô Tìm đơn ≥ 900 + tối đa một nút chính + chuông + Trợ lý — không còn nút nổi); thanh tab điện thoại cao `tabbar-h` 56 + vùng an toàn, 4–5 mục, mục đang chọn có viên `c-tab-active-bg`; thanh bên máy tính rộng `w-sidebar` 248, nền `c-sidebar-bg`, mục đang chọn nền `c-sidebar-active` + vạch `c-indicator` dày `bw-indicator`, tối đa 10 mục hiện sẵn (nhóm gập đếm là một — câu 6).
- **Dải trên trang tối đa một dải** `.dai`, cao `h-dai-tren` 44: bảo trì › ngoài mạng › thông báo quan trọng › nhắc bảo mật hai lớp (`src/shared/dai-chu.ts`); nút «Xem» mở bảng trượt đọc đủ; «Đã hiểu» hay đóng thì nhớ theo phiên. Không hiện dải nhắc ở trang biểu mẫu.
- **Lối «Bỏ qua tới nội dung chính»** là liên kết đầu tiên của mọi trang, chỉ hiện khi nhận tiêu điểm bàn phím (B-BO-QUA-DIEU-HUONG). Nhóm gập ở thanh bên khi mở không được bị khối chân thanh bên che: thanh bên cuộn phần giữa, chân thanh bên dính đáy (B-THIET-LAP-CHE).
- **Hành động chính luôn ở một trong hai chỗ**: góc phải đầu trang (máy tính; danh sách, thiết lập) hoặc chân dính (điện thoại; chi tiết, biểu mẫu). Không đặt nút chính giữa thân; không lặp cùng một nút ở hai nơi.
- **Thứ tự lớp** `z-dinh` 10 (thanh dính) < `z-tab` 20 (thanh tab, thanh bên) < `z-truot` 30 (lớp phủ + bảng trượt) < `z-phu` 40 (ngăn thông báo, gợi ý) < `z-tren-cung` 50 (toast, bảo trì).
- Vùng chạm ≥ `h-control` 44 ở điện thoại; chân dính chừa `safe-area-inset-bottom`; không tràn ngang.
- Máy tính: mọi việc làm được bằng Tab + Enter + Esc; rê chuột chỉ thêm. Phím tắt: `Esc` đóng bảng trượt (có trong mã). `/` vào ô tìm đã duyệt ở cổng 2a nhưng **chưa có trong mã** (29/10); `N` để sau.

## 8. Năm khuôn trang

Mọi trang xếp vào đúng một khuôn (`KIEM-KE.md` mục A của đợt 27/10): **Danh sách** (tiêu đề + một nút «+ Tạo …»; thanh tìm + Lọc; thẻ ≤ 899 / bảng ≥ 900, 50 dòng + «Tải thêm»), **Chi tiết** (quay lại + mã + huy hiệu; dải hành động tối đa 1 chính + 2 phụ; khối tóm tắt → nội dung → lịch sử; chân dính khi có việc tiếp theo; hai cột ≥ 900), **Biểu mẫu** (nhóm trường có tiêu đề; nhãn luôn thấy; lỗi dưới ô kèm cách sửa; một nút chính ở chân dính; hai cột ≥ 900), **Bảng điều khiển** (lưới ô số liệu bấm được → việc hôm nay → lối tắt; hai cột ≥ 1200), **Thiết lập** (một cột tối đa 900; danh sách thẻ hoặc nhóm công tắc; «Lưu» ở chân nếu là trang công tắc). Mỗi khuôn bắt buộc có trạng thái rỗng, ít, nhiều, đang tải (khung xương cùng lưới), lỗi, mất mạng, không quyền.

## 9. Biểu tượng

- **43 biểu tượng nét** ở `assets/Icons/`, chép đúng `SHAPES` của `web/icons.ts` (gồm `alertCircle`, `minus` cho tông trạng thái và `settings` cho tab Thiết lập, thêm ở đợt 0). Lưới 24 × 24, nét 1,8 (riêng `plus`, `back`, `check` nét 2,2), đầu nét tròn, không tô đặc. Trong mã biểu tượng lấy màu `currentColor`; tệp SVG trong bộ ghi nét `c-text` (#0f172a) vì trang bộ hiện qua `<img>`.
- Cỡ: 24 khi đứng một mình hay trong thanh tab/thanh bên; `icon-md` 20 khi đứng trước chữ trong nút, huy hiệu dùng 14.
- Không Lucide, không phông biểu tượng, không emoji. Cần hình mới thì vẽ cùng luật (lưới 24, nét 1,8), thêm vào `web/icons.ts` trước, bộ chép sau.
- Logo: `assets/Logos/logo-96.png` cho thanh bên / thanh trên (`logo-bar` 30), `icon-192.png` / `icon-512.png` / `apple-touch-icon.png` cho PWA (bo `radius-icon`). Không vẽ lại, không đổi màu logo.

## 10. Thành phần

Mỗi thành phần một tên lớp gốc + biến thể bằng thuộc tính (`data-cap`, `data-co`, `data-tong`, `data-loai`), thay cho tiền tố theo trang. `components/bundle.css` có ba phần: phần **chép nguyên từ `public/app.css`** (khối «Thành phần chung v2» tới cuối tệp, khối bảng trượt `.sheet*`, `@keyframes skeleton-pulse`) — đây là lớp thật của mã; phần **lớp xem trước** của bộ (ba khung vẽ lại theo giá trị mã); phần **đề xuất chưa có trong mã**. Bộ không định nghĩa lại lớp nào mà mã đã có.

Thang nút: `.nut[data-cap=chinh]` (nền `c-btn-primary-bg`, tối đa một mỗi vùng; `data-tong=san-ho` cho hành động chốt), `[data-cap=phu]` (nền `c-btn-soft-bg`), `[data-cap=loi]` (chữ `c-primary`, nền trong); cao `h-control` 44 (`data-co=lon` 52), bo `bo-control`, chữ 16/`fw-semibold`; tắt và đang gửi mờ 50 %.

Danh sách (26), theo lớp thật:
- **Lớp có trong mã:** Nut `.nut` · ONhap `.o` + `.nhan` · ONgay `.o[data-loai=ngay|gio]` · OChon `.o-tich`, `.o-chon-mot`, `.cong-tac` · Chip `.vien` · HuyHieu `.huy-hieu` · The `.the` · Bang `.bang` · DongDanhSach `.dong` · Tab `.tab-phu` · DaiTren `.dai` · ThanhDinh `.chan-dinh` · KhungXuong `.xuong` · TrangThaiRong, TrangLoi, TrangMatMang `.trang-thai[data-loai]` · ThongBao `.toast[data-tong]` · BangTruot, HopThoai `.sheet*`.
- **Khung vẽ lại theo mã** (CSS thật gắn `#id`): ThanhTren `#topbar` · ThanhTabDuoi `#tabbar` · ThanhBen `#sidebar`.
- **Đề xuất chưa có trong mã:** BoDem · TaiThem · TimLoc (vỏ) · phần trong thẻ và trong dòng.
- **Không dùng:** DauTrang (đầu trang tách — cổng 2b chọn A).

## 11. Còn lệch giữa bộ và mã (29/10/2026)

Những điều bộ v2 bản 8 ghi «MỚI»/«ĐỔI» mà đợt 0 đã làm nay **không còn là lệch**: `h-control`/`h-control-lon`, năm bậc `z-*`, `bo-control`, `t-nhanh`/`t-vua`, `w-noi-dung-max` (và `w-main` → 1280), gói đệm 14 token, `skel-dong`/`skel-so`/`skel-vien`, `c-check-border`, `c-switch-off-bg`, `c-mat-mang-bg`, `c-toast-bg` (toast nền tối), `focus-ring` 3, `fw-bold`/`fw-heavy`/`fw-heading` 600, `fs-field` 16, `fs-h1`/`fs-h2` về bậc thang, biểu tượng `alertCircle`, `minus`, `settings`.

Còn lệch, có chủ đích:
- **Định bỏ nhưng mã chưa bỏ** (phát hành 2, LO-TRINH bước 12): 92 bí danh, 126 số đo riêng một màn, 9 token chiều cao cũ (nay phần lớn là bí danh của `h-control`/`h-control-lon`; `h-hdv-act`, `row-h` 48 và `h-dp-tab` 40 khác giá trị, giữ), `c-fab-*`, `w-home-side-lg`, `w-trip-time-mt-lg`, `radius-tile` 14, `fs-stat`, `lh-heading`, 10 `skel-*` khác giá trị, cỡ chữ lẻ `fs-old-*`, `fs-pin`. Bộ không chứa chúng (trừ tám bí danh khối đợt 0 còn dùng: `fs-ui`, `fs-field`, `fs-label`, `fs-badge`, `fs-title`, `lh-16`, `tap-min`, `c-muted`). `z-tl-fab` và `tl-nang-0` đã bỏ hẳn trong mã.
- **Bộ đề xuất, mã chưa có:** phím `/`; huy hiệu tông `gia` và số đếm `huy-hieu-so`; BoDem, TaiThem, vỏ TimLoc, thông báo trong trang `.thong-bao`, phần trong thẻ / trong dòng; trạng thái rê chuột và đang chọn của `.dong`.
- **Mã còn dùng lớp cũ trong khung mới** (nợ ở BACKLOG, Chặng 3): nút của hộp xác nhận `hoiXacNhan` là `.btn`/`.btn-danger`; nút đóng bảng trượt là `.btn.btn-link.sheet-close`; `<a class="nut">` bị gạch chân.
- **Không dùng:** `w-sidebar-gon` (cổng 2b chọn B), DauTrang (cổng 2b chọn A).

## 12. Đồng bộ từ mã

- **Nguồn:** kho `luutuanvu1010/tourdaobooking`, `main@25f127d1` (đợt 0 khung chung, bản 2.47), chụp 29/10/2026. `public/app.css` `:root` → `tokens.json`; khối «Thành phần chung v2», khối `.sheet*` → phần chép nguyên của `components/bundle.css`; `web/icons.ts` → `assets/Icons/`; `web/shell.ts`, `web/dai.ts`, `web/trang-thai-he-thong.ts`, `web/toast.ts`, `web/bang-truot.ts`, `src/shared/muc-giao-dien.ts` → README và bản xem trước của các thành phần khung.
- **Luật khớp:** mỗi token của bộ là biến `--<tên>` của `:root` cùng giá trị thật (đã giải `var()`, rem → px). Bốn token **ngoài mã** có lý do: `moc-dien-thoai`, `moc-may-tinh`, `moc-rong` (CSS không nhận biến trong `@media`, chỉ là tài liệu) và `w-sidebar-gon` (chưa dùng). Mọi biến mà `bundle.css` và bản xem trước dùng phải là token của bộ (trừ `--font-*` do trang sinh).
- **Máy kiểm:** `node scripts/so-bo-v2-voi-ma.mjs` trong kho (chạy trong `npm test` qua `src/bo-v2-khop-ma.test.ts`) so bản chụp `docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/ds-v2/` với mã; mục tiêu 0 lệch không lý do.
- **Làm lại khi mã đổi:** (1) sửa mã; (2) `node scripts/sinh-bundle-bo-v2.mjs` chép lại phần chép nguyên của bundle; (3) sửa `tokens.json` của bản chụp tới khi `node scripts/so-bo-v2-voi-ma.mjs` báo 0 lệch; (4) chỉnh README / bản xem trước thành phần nếu cấu trúc khung đổi; (5) xuất bản bộ lên Claude từ bản chụp (đọc bản sống trước, chỉ gửi tệp đổi, chỉ mục `design-system.json` gửi cuối); (6) ghi một tờ có ngày. Công cụ `/design-sync` chỉ dành cho dự án Claude Design, không áp cho bộ này.
- Bản xem trước là HTML tĩnh dùng `tokens.css` + `bundle.css`, không chạy mã của Nền tảng; ba khung (thanh trên, thanh tab, thanh bên) vẽ lại bằng lớp riêng của bộ vì CSS thật gắn `#id` và lớp của `body`.
- Không đưa vào bộ: trang bảo trì (`web/maintenance-screen.ts`), năm khuôn trang đầy đủ (Chặng 3), ô nhãn nổi của Tạo đơn, số đo riêng một màn, `h-order-skeleton`, `h-the-viec-xuong`; dải màu `grad-*` ghi giá trị đã khai triển.
