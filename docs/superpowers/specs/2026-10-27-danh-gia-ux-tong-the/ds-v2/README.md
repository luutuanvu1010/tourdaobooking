Sổ tay thương hiệu và luật dùng cho giao diện **Island Booking System** — nền tảng nội bộ của Công ty TNHH Tour Đảo (Nha Trang): lập đơn dịch vụ tour, xác nhận đơn, điều phối xe, công nợ, hoa hồng đối tác. Bộ này là **nguồn duy nhất để vẽ** mọi màn từ Chặng 2 (27/10/2026): giá trị chép từ mã đang chạy (`public/app.css`, `public/fonts/`, `web/icons.ts`, `public/icons/`), cấu trúc theo đề cương hợp nhất đã duyệt ở cổng 1. Hai bộ cũ trên Claude chỉ để tra, không dùng để vẽ.

## 1. Cách dùng bộ này

- **Ba tầng token.** *Gốc* = bảng màu thương hiệu tourdaovn, thang cỡ chữ 14 bậc, khoảng cách `s1`–`s7`, bo `radius-*`, bóng, phông — giá trị không đổi. *Ý nghĩa* = token theo vai (`c-bar-bg`, `c-btn-primary-bg`, `c-focus`, `h-control`, `z-*`, `t-nhanh`) — thành phần và màn chỉ được trỏ vào tầng này. *Thành phần* = số đo riêng khi một thành phần cần giá trị khác ý nghĩa (`radius-tile`, `shadow-btn-solid`, `c-tile-*`). Mỗi token có một dòng công dụng; đọc dòng đó trước khi dùng.
- **Dấu hiệu trong công dụng.** `MỚI` = chưa có trong mã, đề xuất kèm lý do; `ĐỔI` = có trong mã nhưng đổi giá trị, kèm lý do; `Gốc · tourdaovn` = không được đổi giá trị. Token `BỎ` không có mặt trong bộ; mục 11 liệt kê chúng và lý do.
- **Không viết cứng.** Màu, cỡ, khoảng cách, bo, bóng, thời lượng trong bản vẽ phải là tên token của bộ này. Thiếu token thì đề xuất token `MỚI` trong bảng «Token đã dùng» của bản vẽ, không ghi số lẻ.
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
| Biển | đang diễn ra, thông tin | `c-primary-soft` | `c-primary` | `history` (mũi tên vòng) | Đang xử lý, Đang chạy, Đã xếp, Đã giao |
| Xanh lá | xong, tốt | `c-green-soft` | `c-green-text` | `check` | Đã xác nhận, Hoàn tất, Còn hạn, Đã thu đủ, Vé xong |
| Đỏ | lỗi, huỷ, quá hạn | `c-danger-soft` | `c-danger-text` | `alertCircle` (MỚI) | Đã huỷ, Từ chối, Hết hạn, Quá hạn, Giữ lại |
| Xám | nháp, ngưng, không áp dụng | `c-surface-alt` | `c-text-muted` | `minus` (MỚI) | Nháp, Ngưng dùng, Đã khoá, Không còn trong Sheet |

Luật: không mượn tông Cát cho ý nghĩa khác; «Đã giao – đã thu đủ» là một trạng thái, không ghép hai huy hiệu; mọi tông đều có biểu tượng để không chỉ dựa vào màu. Huy hiệu: chữ `huy-hieu` 12/500, bo `radius-pill`, không viền, nền nhạt chữ đậm (xem thành phần HuyHieu).

## 4. Chữ

- Phông `sans` = Be Vietnam Pro tự lưu (`fonts/be-vietnam-pro-400…800.woff2`, giấy phép OFL), dự phòng system-ui → Segoe UI → Roboto → Noto Sans. `mono` chỉ cho mã PIN. Ba họ tuỳ chọn `nunito`, `lexend`, `noto` chỉ nạp khi chủ chọn ở Giao diện công ty.
- **Mọi cỡ chữ là một bậc của thang 14 bậc** `fs-step-1` (12 px) … `fs-step-14` (32 px). Không có cỡ 11 px; không có cỡ lẻ 12,8 / 13,6 / 14,4 / 17,6 px (ĐỔI: về bậc gần nhất).
- **Vai chữ** dùng hằng ngày: `than` 16/400 · `nhan` 14/500 · `nut` 16/500 · `huy-hieu` 12/500 · `chu-phu` 13/400 · `chu-nho` 12/400 · `tieu-de-trang` 18/600 · `tieu-de-khoi` 16/600 · `tieu-de-lon` 24/600 · `so-lon` 26/600 · `so-lon-hep` 20/600 · `o-go` 16/400 · `eyebrow` 12/600 in hoa · `ma-pin` 20/500 mono.
- **Độ đậm ba mức** (QĐ2 cổng 1): 400 nội dung (`fw-regular`), 500 nhãn và nút (`fw-medium`, `fw-semibold`), 600 tiêu đề và số lớn (`fw-bold`, `fw-heavy`, `fw-heading`). Ba núm «Độ đậm …» ở Giao diện công ty vẫn tinh chỉnh được; «chữ mảnh» chốt ở bản 1.65 (2/10) giữ nguyên là lựa chọn của chủ, bộ này chỉ đổi giá trị mặc định.
- **Ô gõ không dưới 16 px** (`o-go`), kể cả trang Đăng nhập (ĐỔI 17 → 16).
- Tiêu đề trang cắt một dòng bằng «…» là chỗ **duy nhất** được cắt chữ; số tiền và tên khách không bao giờ cắt.

## 5. Khoảng cách, bo góc, bóng

- Khoảng cách chỉ lấy từ `s1` 4 · `s2` 8 · `s3` 12 · `s4` 16 · `s5` 24 · `s6` 32 · `s7` 48. Lề trang điện thoại `s4`, máy tính `s5`; đệm thẻ `s4`; dòng danh sách đệm `s3` × `s4`.
- Bo: nút và ô `bo-control` (= `radius-sm` 8); thẻ, dải, hộp thoại `radius-md` 12; góc trên bảng trượt `radius-lg` 18; viên thuốc `radius-pill` **chỉ** cho huy hiệu, chip, tab viên thuốc, nút tròn «+ Tạo đơn». Bo 6 và 4 của Điều phối BỎ.
- Bóng ba mức: `shadow-card` (thẻ), `shadow-card-hover` (thẻ bấm được khi rê, kèm nhấc `lift`), `shadow-overlay` (bảng trượt, hộp thoại, toast). Nút chính đặc dùng `shadow-btn-solid`, nút san hô `shadow-btn-accent`. Viền thẻ vẽ bằng `ring-card` để không đổi kích thước.

## 6. Chuyển động

- Chỉ khi rê, bấm, mở bảng — không có hiệu ứng lúc tải trang. `t-nhanh` 150 ms cho rê/bấm/đổi màu/toast; `t-vua` 200 ms cho bảng trượt, hộp thoại, mở gập thẻ; `m-base` 300 ms cho chuyển trang (View Transitions giữa tài liệu). Một đường cong `ease-out` cho tất cả. Nút lún `press` 0,97 khi bấm.
- Máy đặt «Giảm chuyển động» thì mọi thời lượng về 0 và bỏ hiệu ứng trượt.
- Vòng quay trong nút chính khi đang gửi: một vòng `m-spin` 700 ms, vành mờ `c-spinner-track`.

## 7. Bố cục, khung và mốc đáp ứng

- **Chỉ ba mốc**: ≤ 640 điện thoại (`moc-dien-thoai`), ≥ 900 máy tính (`moc-may-tinh`), ≥ 1200 rộng (`moc-rong`). 641–899 (iPad dọc) là máy tính thu gọn: thanh bên chỉ biểu tượng `w-sidebar-gon`, thẻ thay bảng. Nội dung tối đa `w-noi-dung-max` 1280 căn giữa ở 1440.
- **Khung chung**: thanh trên cao `bar-h` 60 (trái = quay lại hoặc đường dẫn một cấp; giữa = tiêu đề `tieu-de-trang`; phải = tối đa một hành động chính + chuông + biểu tượng Trợ lý — không còn nút nổi, câu 4 cổng 1); thanh tab điện thoại cao `tabbar-h` 56 + vùng an toàn, 4–5 mục, mục đang chọn có viên `c-tab-active-bg`; thanh bên máy tính rộng `w-sidebar` 248, nền `c-sidebar-bg`, mục đang chọn nền `c-sidebar-active` + vạch `c-indicator` dày `bw-indicator`, tối đa 10 mục hiện sẵn (nhóm gập đếm là một — câu 6).
- **Dải trên trang tối đa một dải**, cao một dòng (`h-control` 44): bảo trì > thông báo quan trọng > nhắc bảo mật hai lớp; nút «Xem» mở bảng trượt đọc đủ; «Đã hiểu» hay đóng thì nhớ theo phiên (câu 8). Không hiện dải nhắc khi đang ở biểu mẫu.
- **Lối «Bỏ qua tới nội dung chính»** là liên kết đầu tiên của mọi trang, chỉ hiện khi nhận tiêu điểm bàn phím (B-BO-QUA-DIEU-HUONG). Nhóm gập ở thanh bên khi mở không được bị khối chân thanh bên che: thanh bên cuộn phần giữa, chân thanh bên dính đáy (B-THIET-LAP-CHE).
- **Hành động chính luôn ở một trong hai chỗ**: góc phải đầu trang (máy tính; danh sách, thiết lập) hoặc chân dính (điện thoại; chi tiết, biểu mẫu). Không đặt nút chính giữa thân; không lặp cùng một nút ở hai nơi.
- **Thứ tự lớp** `z-dinh` 10 (thanh dính) < `z-tab` 20 (thanh tab, thanh bên) < `z-truot` 30 (lớp phủ + bảng trượt) < `z-phu` 40 (ngăn thông báo, gợi ý) < `z-tren-cung` 50 (toast, bảo trì).
- Vùng chạm ≥ `h-control` 44 ở điện thoại; chân dính chừa `safe-area-inset-bottom`; không tràn ngang.
- Máy tính: mọi việc làm được bằng Tab + Enter + Esc; rê chuột chỉ thêm. Phím tắt tối thiểu (MỚI, chờ duyệt): `/` vào ô tìm, `Esc` đóng bảng trượt, `N` tạo mới ở trang danh sách.

## 8. Năm khuôn trang

Mọi trang xếp vào đúng một khuôn (`KIEM-KE.md` mục A của đợt 27/10): **Danh sách** (tiêu đề + một nút «+ Tạo …»; thanh tìm + Lọc; thẻ ≤ 899 / bảng ≥ 900, 50 dòng + «Tải thêm»), **Chi tiết** (quay lại + mã + huy hiệu; dải hành động tối đa 1 chính + 2 phụ; khối tóm tắt → nội dung → lịch sử; chân dính khi có việc tiếp theo; hai cột ≥ 900), **Biểu mẫu** (nhóm trường có tiêu đề; nhãn luôn thấy; lỗi dưới ô kèm cách sửa; một nút chính ở chân dính; hai cột ≥ 900), **Bảng điều khiển** (lưới ô số liệu bấm được → việc hôm nay → lối tắt; hai cột ≥ 1200), **Thiết lập** (một cột tối đa 900; danh sách thẻ hoặc nhóm công tắc; «Lưu» ở chân nếu là trang công tắc). Mỗi khuôn bắt buộc có trạng thái rỗng, ít, nhiều, đang tải (khung xương cùng lưới), lỗi, mất mạng, không quyền.

## 9. Biểu tượng

- **42 biểu tượng nét** ở `assets/Icons/`: 40 chép đúng từ `web/icons.ts` + 2 MỚI cho tông trạng thái (`alertCircle`, `minus`). Lưới 24 × 24, nét 1,8 (riêng `plus`, `back`, `check` nét 2,2), đầu nét tròn, không tô đặc. Trong mã biểu tượng lấy màu `currentColor`; tệp SVG trong bộ ghi nét `c-text` (#0f172a) vì trang bộ hiện qua `<img>`.
- Cỡ: 24 khi đứng một mình hay trong thanh tab/thanh bên; `icon-md` 20 khi đứng trước chữ trong nút, huy hiệu dùng 14.
- Không Lucide, không phông biểu tượng, không emoji. Cần hình mới thì vẽ cùng luật (lưới 24, nét 1,8) và ghi MỚI trong bản vẽ.
- Logo: `assets/Logos/logo-96.png` cho thanh bên / thanh trên (`logo-bar` 30), `icon-192.png` / `icon-512.png` / `apple-touch-icon.png` cho PWA (bo `radius-icon`). Không vẽ lại, không đổi màu logo.

## 10. Thành phần

Mỗi thành phần một tên lớp gốc + biến thể bằng thuộc tính (`data-cap`, `data-co`, `data-tong`), thay cho tiền tố theo trang. `components/bundle.css` là bản dựng tham chiếu của lớp thành phần (chỉ để xem trước và làm hợp đồng tên lớp; thi công đợt 0 đưa vào `public/app.css` theo expand–contract). Thang nút ba cấp: **Chính** (nền `c-btn-primary-bg`, tối đa một mỗi vùng; san hô chỉ cho hành động chốt; cao `h-control`, `h-control-lon` ở chân dính), **Phụ** (nền trắng viền `c-primary`; biến thể nguy hiểm viền và chữ `c-danger`), **Lối nhỏ** (chữ `c-primary` 500, gạch chân khi rê). Mọi nút bo `bo-control`, chữ `nut` 16/500, biểu tượng `icon-md` trước chữ; nút tắt xám phẳng kèm một dòng lý do, không mờ bằng opacity.

Danh sách: Nut · ONhap · OChon (ô chọn, ô tích, ô chọn một, công tắc) · ONgay · BoDem · Chip · HuyHieu · The · Bang · DongDanhSach · BangTruot · HopThoai (gồm hộp xác nhận hành động một chiều) · ThongBao (dải lỗi/cảnh báo/thông tin + toast) · DaiTren · Tab · TaiThem · TimLoc · ThanhDinh (đầu trang + chân dính) · KhungXuong · TrangThaiRong. README của từng thành phần nói khi nào dùng, trạng thái, biến thể, người dùng truyền gì vào.

## 11. Thay đổi so với mã (27/10/2026)

**MỚI** (chưa vào mã, chờ chủ duyệt ở cổng 2a): `h-control` 44, `h-control-lon` 52 (thay 9 token cùng họ) · `z-dinh`…`z-tren-cung` (thay 13 z-index rời) · `bo-control` 8 · `t-nhanh` 150, `t-vua` 200 · `w-noi-dung-max` 1280 · `w-sidebar-gon` 56 · `c-mat-mang-bg` · `skel-dong`/`skel-so`/`skel-vien` (thay 14 token khung xương) · `moc-dien-thoai`/`moc-may-tinh`/`moc-rong` (ba mốc) · hai biểu tượng `alertCircle`, `minus` · phím tắt `/`, `Esc`, `N`.

**ĐỔI**: `fw-bold`, `fw-heavy`, `fw-heading` 500 → 600 (QĐ2) · `focus-ring` 2 → 3 px · cỡ chữ lẻ (`fs-h1` 1,5 rem, `fs-h2` 1,1 rem, `fs-old-*`, `fs-pin`) về bậc thang · ô gõ Đăng nhập 17 → 16 px · đường cong: giữ `ease-out` đã có thay vì thêm đường cong mới như đề cương.

**BỎ** (thi công theo expand–contract: phát hành 1 thêm tên mới + giữ bí danh, phát hành 2 bỏ bí danh): 92 bí danh trỏ token khác (`c-bg`, `c-alt`, `c-line`, `c-muted`, `c-card`, 42 `fs-<vai>` → dùng thẳng bậc) · 126 số đo riêng một màn `--w-*`/`--h-*` (Vận chuyển, Điều phối, Trang chủ, Tạo đơn, Lịch xe bận, Hoa hồng…) → luật bố cục trong CSS thành phần · `c-fab-*`, `shadow-float`, `z-tl-fab` (Trợ lý lên thanh trên) · 9 token chiều cao điều khiển (`tap-min`, `counter-btn`, `h-field`, `h-field-wide`, `h-hdv-btn`, `h-hdv-act`, `search-h`, `row-h`, `h-dp-tab`) → `h-control`/`h-control-lon` · `radius-xs` 6, `radius-dp-tab`, `radius-dp-khoi`, `radius-xb-lg`, `radius-dp-lg` → `bo-control` · 14 `skel-*` → 3 · `fs-stat`, `lh-28`, `lh-32` (không dùng) · `ls-vc-no` → `ls-chip` · 28 lớp CSS nghi chết (kiểm bằng trình duyệt rồi bỏ). Danh sách đủ: `SO-LECH-TU-MA.md` của đợt 27/10.

## 12. Không đồng bộ

- Bộ dựng **bằng tay từ mã** (đường «chỉ đọc» của quy trình from-code, vì Nền tảng không có thư viện thành phần: giao diện là HTML + TypeScript thuần, DOM dựng bằng `h()`). Bản xem trước là HTML tĩnh dùng `tokens.css` + `bundle.css`, không chạy mã của Nền tảng. Sau thi công đợt 0, bộ chuyển sang đồng bộ từ `public/app.css` bằng `/design-sync` (7c); từ đó mã là nguồn duy nhất.
- Chưa đưa vào bộ: thanh trên, thanh tab, thanh bên, trang 403/404/mất mạng/bảo trì, năm khuôn trang đầy đủ (vẽ ở đề bài khung chung, 7b); ô nhãn nổi của Tạo đơn (không nhân rộng, đổi về nhãn trên ô ở đợt Biểu mẫu); 126 số đo riêng một màn; dải màu `grad-*` ghi giá trị đã khai triển; `fs-ui` dạng `max(16px, …)` và `fw-home-stat` dạng `calc()` ghi giá trị đã tính.
- Số đo khung xương `h-order-skeleton` 76 và `h-the-viec-xuong` 272 là của hai màn cụ thể, không vào bộ.
