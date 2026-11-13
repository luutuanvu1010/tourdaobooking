# Danh sách phát hiện — kiểm giao diện toàn diện, bước 0 (13/11/2026)

> **Hồ sơ có ngày, đóng băng khi xong.** Vai: phiên KIỂM (P15), chỉ đo và báo cáo, không sửa mã. Mã đo: `main` = `ab2422468` (bản 2.96).
> Kế hoạch: `docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md` (nhánh `claude/blissful-villani-4d7668`), mục 2–6.
> Báo cáo cho chủ: `BAO-CAO.md` cùng thư mục. Số liệu và kịch bản: `docs/evidence/2026-11-13-kiem-giao-dien/` (README ở đó nói cách dựng máy thử).

**Mức:** *Chặn kho* — kho có thể từ chối, hoặc làm hỏng việc · *Nặng* — thấy ngay, làm người dùng nghi ngờ · *Nhỏ*.
**Ô đo** = một (bộ quyền, trang, khổ). Quét NHIỀU: 2.219 ô trên 212 cặp trang × vai (11 bộ quyền + khách chưa đăng nhập); quét RỖNG: 490 ô. 0 lỗi kịch bản.
**Đo lại một ô:** `do-quet.mjs --bo <BỘ> --trang <đường>` (số đo) hoặc `soi-mot-o.mjs` (một biểu thức) — lệnh đầy đủ ở README bằng chứng.
Phát hiện gom theo **nguyên nhân gốc**, mỗi mã một gốc; số trong ngoặc là số ô / số chỗ máy đếm.

## Chặn kho (5)

| Mã | Tiêu chí | Phát hiện | Bằng chứng / đo lại |
|---|---|---|---|
| K1 | T19 (tờ phương án mục 5.1) | Chưa có trang **chính sách quyền riêng tư** và trang **hỗ trợ** công khai; màn Đăng nhập không có liên kết nào tới hai trang này. | `ls public/*.html` (61 trang, không trang nào là chính sách/hỗ trợ công khai); ảnh `dang-nhap-390.jpg` |
| K2 | T19 (5.4), Apple 4.2 | Người chưa có tài khoản (kể cả người duyệt của kho) gặp ngay ô SĐT + PIN: không một câu nói Nền tảng là gì, dành cho ai, xin tài khoản ở đâu. Chưa có tài khoản thử cho người duyệt. | ảnh `dang-nhap-390.jpg`, `dang-nhap-1280.jpg` |
| K3 | T19 (5.5), T6 | **Tên Nền tảng có ba kiểu**: «Tour Đảo Booking» (màn Đăng nhập), «Island Booking System» (`manifest.webmanifest` name, thanh trên điện thoại, thanh bên máy tính), «Island Booking» (`short_name` và `apple-mobile-web-app-title` = tên dưới biểu tượng iPhone). Kho đòi tên trên kho khớp tên trong ứng dụng — **chưa kiểm số điều luật**, xếp Chặn kho vì «có thể từ chối». | `public/manifest.webmanifest`, `<meta apple-mobile-web-app-title>` trong `public/index.html`; ảnh `dang-nhap-390.jpg` + `don-hang-390.jpg` |
| K4 | T19 (5.5) | Biểu tượng chỉ có 192 và 512 loại `any`, **không có loại «maskable»** (Android cắt tròn sẽ mất mép); tệp khai báo **thiếu `id`**; **không có màn chờ khi mở** (`apple-touch-startup-image`) nên mở từ màn hình chính là màn trắng. | `public/manifest.webmanifest`, `ls public/icons`, `grep apple public/index.html` |
| K5 | T19 (5.3) | Trang Tôi có khối «Yêu cầu xoá dữ liệu» (xoá giấy tờ, ảnh, địa chỉ…) nhưng **chưa có lối «xin xoá tài khoản»** và **chưa có địa chỉ web** cho việc này (Google Play đòi đường dẫn web — chưa kiểm áp cho tài khoản do công ty cấp). Chạm dữ liệu ⇒ cần ADR riêng như tờ phương án đã ghi. | ảnh `doi-tac-toi-390.jpg` |

## Nặng (14)

| Mã | Tiêu chí | Phát hiện | Số đo | Bằng chứng / đo lại |
|---|---|---|---|---|
| N1 | T8, WCAG 1.4.4 | **Khoá phóng to** trên mọi trang: viewport `maximum-scale=1, user-scalable=no` + `touch-action: pan-x pan-y` ở `html`. *Chủ đã quyết 30/9 («khoá chức năng phóng»)* — nhắc lại một lần vì bản công khai sẽ bị đánh giá theo chuẩn trợ năng (P18). | axe `meta-viewport` ở 490/490 ô có chạy axe | `public/app.css` (dòng `html {`), mọi `public/*.html` |
| N2 | T16 | **Chữ không theo cỡ chữ của máy**: mọi cỡ chữ đặt bằng px (`--fs-step-*`), `html` 16px, `-webkit-text-size-adjust:100%` ⇒ đổi cỡ chữ trong Cài đặt iPhone gần như không có tác dụng (cần thử máy thật). Phép xấp xỉ «nhân đôi mọi token cỡ chữ» ở 390: trang tràn ngang, cắt chữ, chồng chữ hàng loạt (thanh tab chồng chữ, tiêu đề chồng số đếm). Phép «phóng 200 %» kiểu WCAG (640 px, tỉ lệ 2): **đạt** (0 tràn, 0 cắt). | chữ×2: tràn ngang 78/212 trang, cắt chữ 188/212, chồng chữ 202/212 | `tong-hop.json` → `T16_chu-x2`; ảnh `chu-x2-don-hang-390.jpg`, `chu-x2-trang-chu-390.jpg` |
| N3 | T13, T3 | **Xoay ngang điện thoại / phóng 200 %: Tạo đơn gần như không dùng được.** Thanh nút dưới cố định cao 137 px = 35 % chiều cao màn 844×390; cộng thanh trên 60 px và băng thông báo, chỗ nhìn nội dung còn rất hẹp. Ở phép 200 % máy đo thấy nút chọn dịch vụ, ô tên/SĐT khách bị thanh nút đè **ngay cả khi đã cuộn nút vào giữa màn**. | 714 lượt nút chọn dịch vụ không chạm được (5 bộ quyền lập đơn); ô tên/SĐT/ghi chú cũng bị đè | ảnh `tao-don-xoay-ngang.jpg`; `soi-mot-o.mjs SALES /order-form 844 390 1 …` |
| N4 | T2, T6 | **Thanh bên máy tính: chữ thương hiệu đè mục đầu tiên.** Khi thanh bên tự cuộn tới mục đang mở, mục trên cùng («Trang chủ») trượt dưới khối thương hiệu, bị cắt nửa hoặc mất hẳn — thấy ở hầu hết trang ≥ 1024. | 310 ô (khổ 1024 / 1180 / 1280 / 1440) | ảnh `thanh-ben-1280.jpg`; `tong-hop.json` → `chongKhoThuong` |
| N5 | T4 | **Vùng chạm nhỏ hơn 44 × 44 ở điện thoại.** Gốc lớn nhất: nút ảnh đại diện ở thanh trên 30 × 30 (có trên mọi trang); ô đánh dấu cao 34; liên kết chữ cao 18–26 («Xem tất cả», «Điền thông tin của tôi», mã chuyến); nút thẻ Điều phối cao 40. | 210/636 ô điện thoại (360/390/430) có ít nhất một chỗ; 512 chỗ; ảnh đại diện 138 ô | `tong-hop.json` → `T4.theoLop` |
| N6 | T6 | **Quá nhiều kiểu nút và cỡ chữ trên một màn.** Nút lưu, nút phụ, nút viền, nút đỏ viền, nút chữ, viên thuốc… cùng xuất hiện. | 196/212 trang có > 3 hình nút (trung bình 6,5; Tạo đơn 17); 176/212 trang có > 5 cỡ chữ (trung bình 6) — đo ở 1280 | `tong-hop.json` → `T6`; ảnh `tao-don-1280.jpg`, `chi-tiet-don-1280.jpg` |
| N7 | T7, HIG iPad | **iPad đứng (820) dùng nguyên bố cục điện thoại kéo giãn**: thanh tab dưới, không thanh bên, một cột rộng 788 px, thẻ và ô gõ dài hết bề ngang. | 727 khối «một đầu» (nội dung ≤ 35 % bề rộng) ở 820; bề rộng nội dung 640–788 | ảnh `*-820.jpg` (mọi họ màn) |
| N8 | T7 | **Máy tính: bề rộng nội dung không theo một lưới**, giãn theo màn: ở 1280 có trang 640 px, có trang 1.184 px (5 mức khác nhau); ở 1440 lên 1.344 px (6 mức). Không có ngưỡng đạt vì lưới chung là việc của Chặng 3 — đây là số đo nền. | 1280: min 640 / trung vị 1.000 / max 1.184; 1440: max 1.344 | `tong-hop.json` → `T7` |
| N9 | T7, lớp 1 | **Băng thông báo cao 3–4 dòng ở đầu mọi màn điện thoại** (tin quan trọng, nhắc bật bảo mật hai lớp): khoảng 110 px ≈ 13 % màn 844; «Tin quan trọng» không có nút đóng ở bản đo. Đẩy nội dung chính xuống ở mọi trang. | thấy ở mọi ảnh 390 của kho NHIỀU (tin) và RỖNG (nhắc hai lớp) | ảnh `trang-chu-390.jpg`, `don-hang-390.jpg`, `rong-don-hang.jpg` |
| N10 | T10 | **Nhảy bố cục khi dữ liệu về.** Mở lạnh: 17/57 trang có CLS ≥ 0,1 (cao nhất Chính sách điều phối 0,88; Tạo đơn 0,69; Dịch vụ 0,56; Vé điện tử 0,47). Mở lại: Dịch vụ 0,49; Vé điện tử 0,45; Quản lý tài khoản 0,30. | ngưỡng 0,1 | `so-lieu/toc-do.json` (do-toc-do.mjs, 4G chậm + CPU 4×) |
| N11 | T12 | Còn **16 hộp hỏi của hệ điều hành** (`confirm`/`alert`) — trong vỏ ứng dụng trông như trang web, chữ nút do máy đặt. Ngưỡng 0. | 16 (trần của bài khoá); nhiều nhất ở Quản lý tài khoản | `node --test src/ratchet-confirm-alert.test.ts` |
| N12 | T5, T15 | **Trang thiếu tiêu đề chính** (`h1`): chi tiết vé Hỗ trợ (mọi vai, 390), chi tiết đơn của Thực tập / Hướng dẫn viên / Đối tác, chuyến của tài xế (`/cuoc-chuyen`), Nhật ký (`/audit`). Bộ đọc màn hình không có mốc đầu trang. | 23 ô | `tong-hop.json` → `T5.khongMotH1` |
| N13 | T8, T15 | Ô chọn ảnh vé ở **Quét vé** không có nhãn (axe mức nghiêm trọng, `#qv-anh`). | 14 ô (mọi vai có Quét vé) | `tong-hop.json` → `T8`; ảnh `quet-ve-390.jpg` |
| N14 | T14 | **Tài xế đối tác — «Lưu khung bận» mờ mà không nói vì sao** (phải chọn một lý do trước). Đã ghi ở đánh giá 27/10, vẫn còn. | hành trình DRIVER_PARTNER dừng ở bước 13 | ảnh `bao-ban-nut-mo-390.jpg`; `so-lieu/hanh-trinh-390.json` |

## Nhỏ (9)

| Mã | Tiêu chí | Phát hiện | Số đo / bằng chứng |
|---|---|---|---|
| S1 | T8 | Tương phản chữ không đạt AA ở nhãn trang Gửi thông báo. | axe `color-contrast` 2 ô |
| S2 | T9, lớp 3 | Mã thô tiếng Anh hiện cho người dùng ở Địa điểm (`VP_TRAN_PHU`…), Loại giấy tờ người (`HEALTH_CHECK`, `C_OLD`…), Loại giấy tờ xe (`TPL_INSURANCE`…); chữ «Admin» trong Nhật ký thay đổi (Trợ giúp). | `tong-hop.json` → `T9.chuAnh`; ảnh `ma-tho-dia-diem-390.jpg` |
| S3 | T2 | Cắt chữ phụ bằng dấu «…»: địa chỉ đón ở danh sách đơn (78 chỗ), tên tài xế ở dòng thời gian Điều phối (32), tiêu đề thanh trên ở 360 (15). **Thông tin chính (tên khách, mã đơn, số tiền, số khách): 0 chỗ** ⇒ T2 đạt. | `tong-hop.json` → `T2` |
| S4 | lớp 3 | Số tiền hai kiểu viết: «Còn thu 1,43tr đ» ở danh sách đơn điện thoại, «1.430.000 đ» ở máy tính và chi tiết đơn. | ảnh `don-hang-390.jpg` so `don-hang-1280.jpg` |
| S5 | T9 | Trạng thái rỗng Đơn hàng chỉ một dòng chữ, không lối đi tiếp (không dùng khối trạng thái chung); khối «không quyền», «không có trang», «thiếu mã đơn» có viền xanh đậm như đang được chọn. | ảnh `rong-don-hang.jpg`, `rong-khong-quyen.jpg`, `rong-khong-trang.jpg` |
| S6 | T3, T2 | Điều phối (1024–1180): số giờ trên trục bị chữ cảnh báo («Xe trùng giờ…», «CHUYẾN BỊ GIỮ») đè; nhãn dính của dòng thời gian đè nút khối chuyến. | T3 5 ô ở 1024; chồng chữ ở `/dieu-phoi` |
| S7 | lớp 1 | Trang Thiết lập trên máy tính là một danh sách dài ~20 dòng, không nhóm, không mô tả, nửa phải trống. | ảnh `thiet-lap-1280.jpg` |
| S8 | lớp 2 | Quản lý tài khoản trên điện thoại dài khoảng 7 màn cho 13 tài khoản (mỗi thẻ 4 nút, hai hàng). | ảnh cả trang 390 cao 5.927 px (ngoài kho) |
| S9 | T9 | Màn ngoài mạng: thanh tab đổi số mục (4 thay 5), thanh trên chỉ còn chữ viết tắt tên. | ảnh `rong-ngoai-mang.jpg` |

## Tiêu chí đạt (không có phát hiện)

T1 không cuộn ngang: **0** ô ở mọi khổ 360–1440 (2.219 ô). T2 thông tin chính: 0 chỗ cắt. T11 mở lại: nội dung xong trung vị 0,42 s, chậm nhất 0,9 s
(ngưỡng ≤ 1 s); mở lạnh (4G chậm, CPU 4×) trung vị 1,6 s, chậm nhất 2,5 s (Chi tiết đơn). T15 phần máy: **0** nút / ô / liên kết không tên trên 490 ô
(cây trợ năng của Chrome). Tab ở 1280: 0 ô có chỗ dừng không thấy viền. T17 chữ nút: bài khoá bảng tham chiếu xanh (25 bài); nhãn và câu báo chưa có
máy canh (bảng còn 123 dòng «chờ chọn»).

## T14 hành trình (10 vai, 390; thêm 1280 cho Bán hàng, Kế toán, Quản trị)

Tới đích: Bán hàng, Thực tập, Nhân sự, Toàn quyền (tạo tài khoản), Quản trị (mở được biểu mẫu chuyến mới — nay là bảng trượt, kịch bản cũ chờ trang riêng),
Hướng dẫn viên (mở được đơn) ⇒ **6/10**. Không tới đích: Tài xế đối tác — **lỗi thật N14**; Đối tác — kịch bản thiếu bước mới «Đón / Không đón» (màn
hình báo lỗi rõ, không phải lỗi giao diện); Kế toán — kịch bản cũ mở Đơn chờ xác nhận, nay Kế toán không có trang này (đúng quyền); Tài xế công ty —
chuyến đã ở bước «Đã tới» do dữ liệu gieo. Ba kịch bản cần cập nhật trước lần đo sau; không chạy lại cho «đẹp số».

## T18 mười nguyên tắc Nielsen (đánh giá của AI trên ảnh, không phải số đo máy)

| Họ màn | Điểm /10 | Lý do chính |
|---|---|---|
| Lập đơn | 7 | Bước rõ, báo lỗi đúng chỗ; nhưng 17 kiểu nút, thanh dưới che khi xoay ngang (N3, N6) |
| Đơn hàng + chi tiết | 7 | Danh sách dễ quét; chi tiết có bốn nút bốn kiểu, tiền hai cách viết (S4) |
| Tài xế, chuyến | 7 | Việc kế tiếp rõ; cảnh báo dùng chữ nội bộ «(văn phòng lo)»; nút mờ không giải thích (N14) |
| Điều phối xe | 6 | Rất dày; chữ đè trục giờ (S6); khó dùng ở điện thoại |
| Tiền (Sổ công nợ, Hoa hồng) | 7 | Số liệu đối chiếu rõ; khối giải thích dài ở đầu Hoa hồng |
| Quản trị, Thiết lập | 6 | Thiết lập là danh sách phẳng (S7); trang tài khoản dài (S8); mã thô (S2) |
| Màn của đối tác bên ngoài | 7 | Gọn, đúng việc; thiếu lối hoa hồng dễ thấy |
| Đăng nhập, trạng thái | 6 | Trạng thái lỗi nhất quán; Đăng nhập không tự giới thiệu, không liên kết chính sách (K1, K2) |

⇒ **T18 không đạt**: ba họ dưới 7.

## Tiêu chí chưa kiểm

T13 (vùng an toàn, thanh trạng thái, bàn phím ảo che nút lưu) và phần tay của T15 (VoiceOver, TalkBack): cần iPhone của chủ; Android, iPad thật: chưa có máy.
Trạng thái ÍT (giữa rỗng và nhiều) không đo riêng lần này — đo RỖNG và NHIỀU. Lớp 8 phần «ảnh biên nhận gửi khách» và hộp thoại / bảng trượt chỉ thấy
qua hành trình, chưa quét riêng.
