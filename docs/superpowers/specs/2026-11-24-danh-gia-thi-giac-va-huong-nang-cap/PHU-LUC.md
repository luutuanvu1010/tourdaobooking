# Phụ lục — bằng chứng, số liệu máy đếm, nguyên tắc từ nguồn ngoài (24/11/2026)

> Hồ sơ có ngày, đi kèm `BAO-CAO.md`. Bản được đo: bản chính `277fe8e12` (bản 3.42), máy thử cục bộ, dữ liệu giả, đúng bộ núm Giao diện công ty của bản chạy thật lúc đo. Kịch bản và cách dựng: `docs/evidence/2026-11-24-danh-gia-thi-giac/`. Ảnh, số đo thô, ghi chú tra nguồn nằm ngoài kho ở `~/tourdao-thi-giac-2026-11-24/` (`anh/`, `so-do/`, `so-lieu-may-*.md`, `tra-nguon/`).
> Cách đọc: phần B là số máy đếm; phần C là nhận định của phiên đánh giá (gu của người đánh giá, không phải số đo), mỗi nhận định chỉ vào ảnh hoặc số ở phần B. «Ảnh» ghi tên tệp trong `~/tourdao-thi-giac-2026-11-24/anh/`; trang so sánh gửi chủ dùng đúng các ảnh đó.

## A. Đã đo gì

| Lượt | Phạm vi | Dùng cho |
|---|---|---|
| `hien-tai` | 111 màn × 3 bề rộng (390, 1.280, 1.440) = 333 ô | ảnh màn đầu, ảnh cả trang, số liệu phần B mục 1–10 |
| `do-lai` | 111 màn × 2 bề rộng (390, 1.280) = 222 ô | phần B mục 11–13 (chữ đậm, màu đỏ, khung chung, màu nút theo động từ) |
| `quet-rong` | 8 màn (Trang chủ, Đơn hàng của Bán hàng và Đối tác, Quản lý tài khoản, Điều phối xe, Xe, Sổ công nợ, Thiết lập) × 13 bề rộng từ 360 tới 1.920 = 104 ô | khung chung và màn danh sách ở bề rộng trung gian |
| `trang-thai` | 39 ảnh | đang tải, lọc không ra, mất mạng, không có trang, không có quyền, lỗi biểu mẫu, bảng trượt, menu, chuông, hộp hỏi huỷ đơn, bàn phím (xấp xỉ), tiêu điểm bàn phím, rê chuột |
| `phuong-an-a`, `-b`, `-c` | 9 màn × 3 bề rộng mỗi phương án | ảnh «hiện tại» cạnh «phương án» |

111 màn gồm 87 màn của bảng 20/11 và 24 màn thêm. Cả 65 trang trong `PAGES` đều được mở ít nhất một lần (hai trang tự chuyển: `/danh-muc-giay-to` sang Loại giấy tờ cá nhân, `/home` hiện Trang chủ); đủ 11 bộ quyền và người chưa đăng nhập. Trang chủ của Đối tác, Hướng dẫn viên, Thực tập tự chuyển sang Đơn hàng; của hai loại tài xế sang Cuốc của tôi; của Nhân sự sang Quản lý tài khoản.

Bộ núm lúc đo (GET công khai `/giao-dien.css` của bản chạy thật, khoảng 11:26 ngày 24/11): phông nội dung Noto Sans; chữ thường đậm 500; chữ nhấn, nút, tiêu đề cột, số lớn đều đậm 600. Phông tiêu đề không bị ghi đè nên vẫn là Be Vietnam Pro. Máy thử phát đúng chuỗi đó (so từng ký tự).

Giới hạn: màn vừa tải, chưa bấm gì (trừ 39 ảnh trạng thái); Chrome giả lập, không phải iPhone thật; các màn trống hoặc gần trống của lượt 20/11 (15 màn) vẫn trống vì dùng cùng kho dữ liệu; mọi màn có một dải nhắc vì kho thử có tin quan trọng chưa đọc và tài khoản thử đang trong hạn nhắc bật bảo mật hai lớp; 10 màn dài, thuộc 7 trang, chưa chụp hết phần cuối (Nhật ký thay đổi, Dịch vụ, Máy đang đăng nhập, Nhật ký, Trợ lý, Của tôi, một Chi tiết đơn).

## B. Số liệu máy đếm

Nguồn: `so-lieu-may-hien-tai.md` (mục 1–10) và `so-lieu-may-do-lai.md` (mục 11–13), máy sinh bằng `tong-hop.mjs`. «Phần tử» là phần tử đang hiện trên màn.

**1. Token khai ở gốc: 559.** Màu 111 tên, 43 giá trị. Cỡ chữ 55 tên, 12 cỡ. Độ đậm 7 tên, lúc đo chỉ còn 2 giá trị (500, 600). Bo góc 15 tên, 11 giá trị. Bóng 9. Bề rộng riêng 122 tên, 71 giá trị. Chiều cao 43 tên, 27 giá trị. Khoảng cách 7 bậc (4, 8, 12, 16, 24, 32, 48). Thời lượng chuyển động 3 (180, 300, 700 ms).

**2. Màu thật sự hiện trên màn: 35** (chữ 15, nền 21, viền 17, có màu dùng ở nhiều vai; qua mọi ô). 33 màu trùng giá trị một token; 2 màu không trùng: `#000000` (9 phần tử, 1 màn) và `#efefef` (108 phần tử, 6 màn; là nền mặc định của nút gốc trình duyệt). Thêm nền chuyển màu ở 11 màn. Trên một màn máy tính trung bình có 15,5 màu; nhiều nhất là Trang chủ (20 tới 22).

**3. Cỡ chữ đang hiện: 15** (11,5 · 12 · 13 · 13,5 · 14 · 16 · 17 · 18 · 20 · 21 · 22 · 24 · 26 · 28 · 32). Theo số ký tự: cỡ 16 chiếm 70,6 %, cỡ 14 chiếm 21,1 %, cỡ 12 chiếm 5,8 %, cỡ 18 chiếm 1,5 %; mười một cỡ còn lại cộng lại khoảng 1 %. Trên một màn: trung bình 5,5 cỡ ở điện thoại, 6,4 ở máy tính (nhiều nhất 10). Số cặp «cỡ và độ đậm» khác nhau: 19 ở máy tính, 18 ở điện thoại.

**4. Độ đậm đang hiện: 2** (500 và 600). **Phông: 2** (Noto Sans 94 % số phần tử chữ, Be Vietnam Pro ở tiêu đề và tên sản phẩm, có mặt trên cả 111 màn). Giãn dòng 1,5 cho 87 % số ký tự. Tiêu đề trang ở điện thoại: cỡ 24 trên 90 màn, cỡ 26 trên 15 màn.

**5. Cách viết số tiền: 30 kiểu** (tổ hợp cỡ, độ đậm, màu, kiểu số, căn lề). Màu của số tiền gồm mực `#0f172a`, san hô đậm `#96271a`, san hô `#c0392b`, đỏ `#b01235`, lá `#166534`, vàng `#fcd34d`, biển `#0c4a6e`, xám. Có cả số đều cột lẫn số tỉ lệ.

**6. Hình khối.** Bo góc 8 kiểu; ba kiểu chính là tròn hẳn, 8 và 12 (cộng lại hơn 98 % số phần tử có bo góc); còn 18, 14, 6, 4, 3 ở vài màn. Viền gần như chỉ 1 điểm. Bóng 13 kiểu: bóng mềm hai lớp của thẻ ở 897 và 621 phần tử (62 và 35 màn); bóng màu san hô dưới nút «Tạo đơn» ở 73 màn; bóng màu biển dưới nút đặc ở 34 màn.

**7. Khoảng cách.** 17,4 % số giá trị đệm, lề, khe đang hiện nằm ngoài thang bảy bậc (các số hay gặp: 6, 3, 2, 10, 42, 18). Bốn trang đã chuyển khung gốc: 12,5 % ngoài thang; trang chưa chuyển: 17,9 %.

**8. Thành phần.** Dáng phần tử bấm kiểu nút trong vùng nội dung: 92 (phép đếm tính cả dòng bấm được, nên chỉ đọc là dấu hiệu; lượt 21/11 đếm riêng nút ra 60 dáng). Dáng thẻ 39, dáng ô nhập 15 (chiều cao 44 tới 72), dáng huy hiệu 38. Nút nền đặc đậm trong vùng nội dung ở máy tính: 53 màn không có nút nào, 44 màn một nút, 10 màn hai nút, 4 màn từ ba nút; màu nền của chúng: biển đậm 62 nút, san hô 17, đỏ 1.

**9. Biểu tượng.** Một họ biểu tượng nét; độ dày nét 1,8 chiếm phần lớn (cỡ 14 tới 28), nét 2,2 và 2,4 ở vài cỡ; 21 tổ hợp cỡ và nét. Không có ảnh minh hoạ. Không dùng emoji làm biểu tượng (chỉ ký hiệu ✈ ở 2 màn).

**10. Tương phản và vùng chạm.** Không phần tử chữ nào dưới ngưỡng 4,5:1 (chữ lớn 3:1) trên 333 ô. Vùng chạm nhỏ hơn 44 điểm ở điện thoại: 192 trên 4.397 phần tử bấm được (4,4 %), ở 26 màn; chủ yếu là liên kết nằm trong câu chữ, ô tích và ô chọn gốc của trình duyệt, ba tab của Điều phối xe (cao 40).

**11. Chữ đậm.** Trung vị trên một màn: 68 % số phần tử chữ ở điện thoại và 59 % ở máy tính là chữ đậm 600. 97 trên 111 màn điện thoại có từ một nửa số phần tử chữ là chữ đậm.

**12. Màu đỏ.** Bốn sắc đỏ cùng được dùng: san hô `#c0392b`, san hô đậm `#96271a`, đỏ nguy hiểm `#b01235`, đỏ chữ `#8e0e2b`. Trên màn điện thoại: 88 trên 111 màn có từ hai sắc đỏ cùng lúc (64 màn hai sắc, 23 màn ba sắc, 1 màn cả bốn).

**13. Khung chung và nút.** Ở điện thoại, thanh trên + dải nhắc + thanh dưới + thanh dính đáy chiếm trung vị 172 điểm trên khung nhìn 844 (20 %); dải nhắc cao 53 (hai dòng), thanh trên 60, thanh dưới 59. 11 màn vượt 25 %: Trang chủ của Quản lý bán hàng 34 % (đầu trang cao 178), Tạo đơn 30 % (thanh dính đáy 137). Cùng một động từ trên nút đang mang nhiều dáng màu (máy tính, vùng nội dung): «Thêm …» có nền xanh nhạt 16 nút, biển đậm 9, trắng 5, san hô 3; «Lưu …» biển đậm 12, ba dáng khác mỗi dáng 1; «Sửa …» lối chữ 121, nền xanh nhạt 11, trắng 2.

**14. Bề rộng trung gian.** 8 màn × 13 bề rộng: không màn nào tràn ngang, không đoạn chữ nào bị bóp. Từ 600 tới 899 Nền tảng dùng bố cục điện thoại kéo giãn; từ 900 có thanh bên; bảng Đơn hàng thành bảng khi vùng nội dung đủ rộng. Lỗi vỡ cột 1.100 tới 1.199 của lượt 21/11 không còn.

**15. Phương án so với hiện tại** (9 màn, trung vị hoặc trung bình):

| | Hiện tại | A | B | C |
|---|---|---|---|---|
| Phần tử chữ ở mức đậm, điện thoại | 60 % | 60 % | 33 % | 33 % |
| Phần tử chữ ở mức đậm, máy tính | 62 % | 62 % | 39 % | 39 % |
| Số cỡ chữ trên một màn (điện thoại / máy tính) | 5,8 / 6,6 | 4,9 / 5,0 | 4,9 / 5,0 | 4,9 / 5,0 |
| Số họ phông | 2 | 1 | 1 | 1 |
| Số sắc đỏ trên một màn điện thoại | 2,4 | 2,4 | 2,0 | 2,0 |
| Số dòng bảng Đơn hàng thấy được ở 1.440 × 900 | 12 | 12 | 14 | 14 |

## C. Bằng chứng từng mặt

Mức: tốt, tạm, yếu. Ảnh ở `anh/hien-tai/` trừ khi ghi khác.

1. **Hệ màu — tạm.** Giá trị rất kỷ luật (B2: 33 trên 35 màu là token), đây là điểm mạnh hiếm có. Yếu ở vai: màu đỏ gánh bốn việc (nút chốt «Tạo đơn», «Kiểm vé», «Thêm giá»; số tiền còn phải thu; lỗi, huỷ, quá hạn; huy hiệu đếm của chuông), xem B12 và ảnh `023-SALES_MANAGER-cho-xac-nhan-1280-dau.jpg`, `001-SALES-trang-chu-390-dau.jpg`. Xanh nhạt `#dcebf6` cũng gánh ba việc: mục đang chọn, nút phụ, dải thông tin. Số 0 ₫ tô màu lá, số còn thu tô đỏ nâu, nên bảng Đơn hàng có một cột toàn màu (`016-SALES-orders-1440-dau.jpg`). Nhắc bật bảo mật hai lớp (một lời mời) dùng đúng màu hồng của lỗi.
2. **Chữ — yếu.** Hai họ phông không chân gần giống nhau đứng cạnh nhau (tiêu đề Be Vietnam Pro, nội dung Noto Sans): ảnh cắt `trang/anh/g-hai-phong.jpg`. 15 cỡ chữ, trong đó mười một cỡ chỉ gánh khoảng 1 % số ký tự (B3). Chỉ còn hai độ đậm cách nhau một bậc, và hai phần ba số dòng chữ ở mức đậm (B11): tên, ngày, số tiền, giá trị, nhãn nút, huy hiệu cùng đậm nên không thứ nào dẫn mắt (`018-SALES-order-1280-dau.jpg`). Tiền viết 30 kiểu (B5), danh sách viết gọn «450k», «2,86tr» còn chỗ khác viết đủ số. Điểm tốt: giãn dòng 1,5 hợp chữ Việt có dấu hai tầng; ô gõ 16; không cỡ nào dưới 11,5.
3. **Khoảng cách và mật độ — tạm.** Thang bảy bậc có thật và các trang đã chuyển khung gốc lệch ít hơn (B7). Chỉ có một mức mật độ cho mọi người: bảng Đơn hàng ở màn 1.440 × 900 chỉ thấy 12 dòng (dòng cao 52, chữ 16), thưa với kế toán; còn ở điện thoại khung chung và dải nhắc lấy 20 tới 34 % màn (B13).
4. **Hình khối và chiều sâu — tạm.** Bo góc gọn (ba bậc chính). Chiều sâu thì thừa: khối vừa có nền khác trang, vừa viền, vừa bóng hai lớp; nút đặc có bóng cùng màu; ô chức năng Trang chủ có lớp bóng loáng; dải tóm tắt đơn chuyển màu (`trang/anh/g-be-mat.jpg`, `018-SALES-order-1280-dau.jpg`). Lớp nổi thật (bảng trượt, hộp thoại, thông báo) dùng bóng đúng chỗ (`anh/trang-thai/bang-truot-loc-don-390.jpg`).
5. **Biểu tượng và minh hoạ — tốt về biểu tượng.** Một họ nét, một độ dày, luôn kèm chữ (B9). Không có minh hoạ: trạng thái rỗng là một dòng chữ trong thẻ trắng (`anh/trang-thai/loc-khong-ra-390.jpg`). Đây là lựa chọn chấp nhận được cho công cụ làm việc; chỗ thiếu là một khuôn chung cho trạng thái, không phải hình vẽ.
6. **Bố cục và thứ bậc trong khuôn — tạm.** Bốn trang đã chuyển khung gốc thẳng hàng, đúng chỗ nút. Phần ruột chưa có thứ bậc: trang chi tiết dùng lối «nhãn mờ, giá trị đậm» cho mọi dòng nên giá trị nào cũng nổi như nhau (`018-SALES-order-1280-dau.jpg`); nhiều trang thiết lập mở đầu bằng một đoạn chữ dài (`053-ADMIN-phi-don-390-dau.jpg`).
7. **Điều hướng theo vai — tạm.** Thanh dưới và thanh bên một kiểu ở mọi vai, mục đang chọn rõ. Đầu trang có bốn kiểu (lời chào, tên sản phẩm, tên trang, mũi tên lùi); màn Đơn hàng ở điện thoại để tên sản phẩm trên thanh và tên trang ở dưới, còn Danh bạ để tên trang trên thanh. Tên sản phẩm hai kiểu: Đăng nhập ghi «Tour Đảo Booking», bên trong ghi «Island Booking System» (đã ghi từ 13/11). Đối tác ở máy tính có một thanh bên rộng 248 chỉ chứa một mục (`008-PARTNER-orders-1280-dau.jpg`). Tài khoản nhiều quyền: Thiết lập của Quản trị có 18 mục trong một danh sách phẳng (đã ghi từ 13/11).
8. **Thành phần và trạng thái — yếu.** Cùng việc «Thêm» mang bốn dáng màu (B13, ảnh ghép `trang/anh/g-nut-them.jpg`). Bốn kiểu tab và bộ chọn (viên đặc, gạch chân, hộp hai nửa, viên viền). Ô chọn, ô tích, ô ngày là kiểu gốc của trình duyệt đứng cạnh ô nhãn nổi tự vẽ (`trang/anh/g-o-goc.jpg`); B2 thấy cả nền nút gốc `#efefef`. «Không có gì để hiện» có bốn kiểu: thẻ hồng cho không có quyền và không tìm thấy, khung viền biển cho không có trang, khối giữa màn cho mất mạng, một dòng chữ cho lọc không ra (`trang/anh/g-trang-thai.jpg`). Đang tải: Trang chủ có khung xương, Đơn hàng là thẻ trắng trống, Chi tiết đơn trống hẳn (`trang/anh/g-dang-tai.jpg`). Menu tài khoản là một ô viền đậm chỉ có «Đăng xuất», đè lên dải nhắc.
9. **Chuyển động và phản hồi — tốt.** Hai thời lượng 150 và 180 ms, có trạng thái rê chuột ở dòng bảng và vòng tiêu điểm rõ khi dùng bàn phím (`anh/trang-thai/di-chuot-dong-1280.jpg`, `tieu-diem-ban-phim-1280.jpg`). Không có hiệu ứng trang trí. Thiếu: khung xương đều giữa các màn (mục 8).
10. **Hợp iPhone — tạm.** 95,6 % phần tử bấm được đạt 44 điểm (B10). Bảng trượt mở từ đáy, nút xếp đúng thứ tự. Điểm yếu: khi bàn phím bật ở Tạo đơn, thanh dính đáy chiếm khoảng 270 trên 508 điểm còn lại (phép xấp xỉ, `anh/trang-thai/ban-phim-tao-don-390.jpg`); hộp hỏi huỷ đơn không phải lớp nổi mà nằm cuối trang; Nền tảng khoá phóng to (đã ghi 13/11, chủ đã quyết giữ).
11. **Hợp máy tính — tạm.** Không vỡ ở 13 bề rộng (B14). Màn rộng chưa được dùng cho việc cần nhiều dòng: bảng thưa, biểu mẫu là một cột hẹp bên trái để trống nửa màn (`038-ADMIN-xe-sua-1280-dau.jpg`). iPad đứng dùng bố cục điện thoại kéo giãn (đã ghi 13/11).
12. **Ấn tượng ba giây đầu của đối tác mới — yếu.** Đăng nhập gọn, có tên pháp nhân và mã số thuế, nhưng không một câu nói đây là gì và dành cho ai (`083-KHACH-login-390-dau.jpg`). Qua cửa thì gặp tên sản phẩm khác, một dải vàng và một nút tròn đỏ trước khi thấy đơn của mình (`008-PARTNER-orders-390-dau.jpg`). Biểu mẫu đăng ký ở trạng thái mở chưa chụp được (mục I).
13. **Một sản phẩm qua các vai — tạm, nghiêng tốt.** Khung chung, màu, biểu tượng giống nhau ở mọi vai, nên nhìn là cùng một sản phẩm. Ba «phương ngữ» lệch: Trang chủ (nhiều màu, bo 18, bóng loáng), Điều phối xe (chữ HOA nhỏ, lưới dày), Chi tiết đơn (dải tóm tắt tối, chuyển màu). Hai cái đầu là ngoại lệ có tên của khung gốc.

## D. Bảy nguyên nhân gốc và bảy nguyên tắc

Mỗi nguyên tắc có một phép kiểm máy đếm được, để hai người thiết kế áp ra cùng kết quả.

| # | Nguyên nhân gốc ở tầng ngôn ngữ thị giác | Bằng chứng | Nguyên tắc đáp lại | Phép kiểm |
|---|---|---|---|---|
| 1 | **Nhấn tràn lan.** Hầu hết chữ đều ở mức đậm nên không còn mức đậm | B11, C2, C6 | **Trong một dòng chỉ một thứ đậm; trong một khối chỉ một con số nổi.** Tên hoặc mã là thứ đậm của dòng; ngày, số khách, điện thoại, giá trị thường là chữ thường; nhãn là chữ mờ. Thứ bậc dựa cả vào cỡ và màu mực, mờ, để vẫn đứng được khi chủ chỉnh núm độ đậm | phần tử chữ ở mức đậm trên một màn không quá 40 % |
| 2 | **Một màu, nhiều nghĩa.** Đỏ bốn việc, xanh nhạt ba việc, tiền tô theo ba màu | B12, B5, C1 | **Mỗi màu một việc.** Mực: chữ. Biển đậm: thứ bấm được và nút chính. Xanh nhạt: đang chọn. San hô: một hành động chốt đơn của màn. Đỏ: nguy hiểm, quá hạn, lỗi. Cát: nhắc. Lá: đã xong. Tiền viết màu mực. Trạng thái luôn có chữ và dấu chấm, không chỉ màu. «Không có quyền» là thông tin, không dùng màu lỗi | số tiền không mang màu đỏ, san hô, lá; mỗi màn tối đa một nút san hô |
| 3 | **Bề mặt chồng lớp.** Nền khác màu, viền, bóng cùng lúc; bóng màu; chuyển màu | B6, C4 | **Phẳng trước, nổi khi thật sự nổi.** Ba tầng: nền trang; khối trắng viền mảnh, không bóng; lớp nổi (bảng trượt, menu, hộp thoại, thanh dính) có bóng. Hai bậc bo góc: 8 cho thứ bấm và gõ, 12 cho khối; tròn chỉ cho huy hiệu và ảnh đại diện | khối trong vùng nội dung không có bóng; không quá 3 kiểu bo góc |
| 4 | **Chữ không có hệ.** Hai họ phông gần giống nhau; 15 cỡ mà bốn cỡ gánh 99 %; tiền 30 kiểu | B3, B4, B5, C2 | **Sáu cỡ chữ, một họ phông, tiền viết một kiểu.** 12 chú thích; 14 chữ phụ và bảng gọn; 16 thân; 18 tiêu đề khối; 24 tiêu đề trang; 32 số lớn ở Trang chủ. Giãn dòng 1,5 cho thân. Một họ phông cho cả tiêu đề lẫn nội dung, trừ khi chủ chủ động chọn một cặp khác hẳn nhau. Tiền: đủ số, số đều cột, căn phải trong bảng | không quá 6 cỡ chữ trên toàn Nền tảng (trừ ngoại lệ có tên); mọi số tiền dùng số đều cột |
| 5 | **Khung chung nói to hơn nội dung.** Dải nhắc tô nền kín là mảng màu lớn nhất phía trên mọi màn; đầu trang bốn kiểu; tên sản phẩm hai kiểu | B13, C7, C12 | **Khung chung nói nhỏ hơn nội dung.** Thanh trên của trang trong luôn mang tên trang; tên sản phẩm chỉ ở Đăng nhập, thanh bên và Trang chủ. Dải nhắc một dòng, nền trắng, một vạch màu nói mức độ, tối đa một dải. Ở điện thoại khung chung không quá một phần tư màn; khi bàn phím bật, thanh dính đáy thu về một dòng | chiều cao khung chung trên khung nhìn 844 không quá 211; dải nhắc không quá 44 |
| 6 | **Một mật độ cho hai loại việc.** Bảng của văn phòng thưa, điện thoại thì chật vì khung | C3, B15 | **Hai mức mật độ, một bộ thành phần.** «Thoáng» là mặc định cho mọi màn điện thoại và mọi màn của đối tác: dòng 52, vùng chạm từ 44, chữ 16. «Gọn» chỉ cho bảng ở máy tính có chuột: dòng 44, chữ 14; chỉ giảm chiều dọc và một bậc chữ, không đổi cỡ nút, không dưới 12. Mức đi theo khuôn và thiết bị, không phải công tắc của từng người | mức gọn chỉ bật khi có chuột và bề rộng từ 900; vùng chạm ở điện thoại không giảm |
| 7 | **Thành phần chưa đóng dáng.** Cùng một việc nhiều dáng nút; bốn kiểu tab; ô gốc của trình duyệt; bốn kiểu trạng thái | B8, B13, C8 | **Một màn một nút đặc; một việc một dáng.** Mỗi màn một nút nền đặc cho việc chính; nút lặp theo dòng luôn là cấp phụ. Cùng một động từ thì cùng một cấp nút ở mọi màn. Một dáng ô chọn, ô tích, tab. Rỗng, đang tải, lỗi, không quyền dùng chung một khuôn có một lối đi tiếp | nút nền đặc trong vùng nội dung không quá 1 (2 khi có thanh dính); một động từ không quá một dáng màu |

Ghi chú về nguyên nhân 7: phần cấu trúc (một thế hệ thành phần, gỡ lớp cũ) đã thuộc ADR-0222 Đ4. Điều hồ sơ này thêm là chốt **dáng** của thế hệ đó và luật dùng (cấp nào cho việc nào).

## E. Ba phương án

Lớp kiểu xem trước ở `docs/evidence/2026-11-24-danh-gia-thi-giac/kich-ban/lop-kieu/`. Cả ba giữ: màu thương hiệu, phông và độ đậm chủ đang đặt bằng núm, bố cục, điều hướng, chữ trên nút và nhãn.

**A — «Dọn nhiễu».** Chỉ đổi giá trị của khoảng 20 token ở gốc, không sửa trang nào: bỏ bóng thẻ và bóng màu dưới nút (khối tách bằng một viền mảnh); bỏ lớp bóng loáng và chuyển màu; hai bậc bo góc; phông tiêu đề dùng luôn phông nội dung; gộp thang chữ về sáu bậc. Được: mọi trang đổi cùng lúc, rủi ro thấp, hoàn tác bằng một lần sửa tệp kiểu. Không giải quyết: màu nhiều nghĩa, chữ đậm tràn lan, dải nhắc, nút nhiều dáng, mật độ (B15 cho thấy tỉ lệ chữ đậm và số sắc đỏ không đổi). Công: một việc nhỏ, một lượt ảnh.

**B — «Làm mới trên khung gốc»** (khuyến nghị). Gồm A, cộng: bảng vai màu (tiền màu mực, san hô một lần mỗi màn, nút phụ nền trắng viền mảnh để xanh nhạt chỉ còn nghĩa «đang chọn»); mỗi dòng một thứ đậm; huy hiệu trạng thái một dáng có chấm; dải nhắc một dòng nền trắng; thanh trên và thanh dưới không bóng, không mờ kính; ảnh đại diện màu trung tính; mức «gọn» cho bảng ở máy tính. Đổi ở hai tầng: giá trị và diện mạo thành phần; không đổi bố cục khuôn trang, không đổi điều hướng. Được: đáp cả bảy nguyên nhân gốc; chữ đậm giảm từ khoảng 60 % xuống 33 tới 39 %; bảng thêm hai dòng mỗi màn. Mất: phải duyệt lại ảnh của bốn màn mẫu khung gốc; ảnh trong Hướng dẫn và kịch bản bấm thử phải cập nhật (vốn đã nằm trong từng đợt khung gốc). Công: một đợt gốc cỡ đợt bốn màn mẫu, sau đó không thêm đợt nào (mục F).

**C — «Đổi tông».** Gồm B, cộng đổi tông nền và viền từ xám xanh sang trung tính ấm, nền «đang chọn» sang cát rất nhạt, bỏ màu ngọc ở vòng tiêu điểm và vạch chỉ báo. Chỉ đổi giá trị (14 token) trên nền B. Được: cảm giác gần ngành du lịch và hiếu khách hơn, ít giống công cụ quản trị; cùng cơ chế này cho ra chủ đề tối và chủ đề theo tổ chức. Mất: lệch tông với trang web công ty; là quyết định thương hiệu chứ bằng chứng không buộc phải làm. Công về mã nhỏ, công về quyết định lớn. Không khuyến nghị làm lúc này; nên để thành một «chủ đề» chọn được ở đợt 4 của ADR-0194 sau khi B xong.

**Quyết định đã duyệt mà từng phương án đụng tới:**

| Quyết định | A | B | C |
|---|---|---|---|
| Đặc tả «Thị giác 1.70» (chủ duyệt 2/10, hướng «Năng động»): thẻ có bóng mềm hai lớp; nút chính và nút san hô có bóng; ô chức năng Trang chủ có độ bóng; dải tóm tắt đơn chuyển màu | đổi lại | đổi lại | đổi lại |
| «Thị giác 1.70»: thanh tab điện thoại mờ kính | giữ | đổi (nền đặc) | đổi |
| «Thị giác 1.70»: nền trang xám xanh rất nhạt; thêm màu nhấn xanh ngọc | giữ | nhích nhẹ nền (`#f2f5f9` sang `#f4f6f8`), giữ ngọc | đổi cả hai |
| Chú thích token san hô trong tệp kiểu: san hô cho hành động chốt **và nhãn giá** | giữ | tiền không còn san hô | như B |
| Dải nhắc (13/11: «Tin quan trọng» không có nút đóng là thiết kế đã chốt) | giữ | giữ hành vi, đổi hình (một dòng, nền trắng) | như B |
| ADR-0222 Đ1 (thang đo đóng) | giữ | thêm hai số của mức «gọn» vào thang (dòng 44, đầu bảng 36); số do chủ duyệt bằng ảnh như Đ8 | như B |
| ADR-0222, ảnh đã duyệt của bốn màn mẫu | lệch nhẹ (bóng) | lệch: cần duyệt lại ảnh bốn màn | như B |
| ADR-0087 (bộ núm): danh sách núm và giá trị chủ đang đặt | giữ | giữ; nguyên tắc 1 làm thứ bậc không phụ thuộc núm độ đậm | giữ; mặc định của ba núm màu nền, viền, chữ đổi |
| ADR-0167 (bảng tên nút, nhãn) | giữ | giữ; riêng nhãn viết HOA ở dải tóm tắt đơn («SỐ KHÁCH», «CÒN LẠI») nếu đổi sang viết thường thì phải tra bảng tham chiếu lúc thi công | như B |
| Bản vẽ Trang chủ đã duyệt | giữ hình, mất độ bóng của ô | giữ hình; Trang chủ máy tính vẫn có hai nút san hô («Tạo đơn» và «Xem đơn chờ xác nhận»), lệch nguyên tắc 2, cần chủ chọn giữ hay đổi | như B |
| Lưới bề rộng ba mức 15/11; bảy khuôn trang; điều hướng (ADR-0015) | giữ | giữ | giữ |
| Quyết định 27/10 (cổng 1): độ đậm ba mức 400, 500, 600. Nay chủ đang đặt 500 và 600 bằng núm | không đụng | không đụng | không đụng |

## F. Hướng chảy xuống thế nào, máy canh, lộ trình

**Tự chảy xuống mọi trang, mọi quyền** (làm một lần ở đợt gốc): giá trị token ở gốc (bóng, bo góc, thang chữ, phông tiêu đề, nền, viền); khung chung (thanh trên, dải nhắc, thanh dưới, thanh bên, ảnh đại diện); các thành phần dùng chung đã có (`.nut`, `.o`, `.huy-hieu`, `.badge`, `.btn`, `.card`, khối và dòng của khung gốc); luật tiền (`.money-due`, `.money-ok`); mức «gọn» cho khuôn Danh sách.

**Phải làm theo họ màn** (đi cùng từng đợt khung gốc, vì phải sửa ruột trang): bỏ chữ đậm ở giá trị thường; đưa nút «Thêm», «Sửa», «Lưu» về đúng cấp; thay ô chọn, ô tích gốc; đưa trạng thái rỗng, lỗi, không quyền về khuôn chung; viết tiền đủ số ở danh sách.

**Máy canh** (để giao diện không trôi lại; mỗi hàng rào chỉ tính là có sau khi đã thấy nó đỏ thật một lần và ghi sổ hàng rào):
1. Bài kiểm trong bộ kiểm chung, theo khuôn trần chỉ được giảm của ADR-0222 Đ7a: số token màu, số cỡ chữ, số kiểu bo góc, số kiểu bóng không được tăng; thêm một màu hay một cỡ chữ ngoài bảng là đỏ.
2. Thêm bốn phép đo của `do-thi-giac.js` vào lệnh đo trên trang thật (`npm run do-khung`, đã chạy trong lượt kiểm GitHub): tỉ lệ chữ đậm, số nút nền đặc trong vùng nội dung, màu của số tiền, bóng trên khối. Ngưỡng ở cột «Phép kiểm» của phần D.
3. Thêm bảy nguyên tắc vào tiêu chí của trợ lý đánh giá giao diện (đề xuất sửa `docs/TIEU-CHI-GIAO-DIEN.md`, chủ duyệt).

**Lộ trình, vá vào kế hoạch tám đợt đã duyệt 21/11** (`docs/superpowers/plans/2026-11-21-chuyen-toan-bo-man-sang-khung-goc.md`; thứ tự A, B, C, D3, D1, D2, E, F giữ nguyên):

| Bước | Việc | Chủ duyệt gì |
|---|---|---|
| Đợt gốc (mới, trước đợt A) | ADR ngôn ngữ thị giác (bảy nguyên tắc, bảng vai màu, sáu cỡ chữ, ba tầng bề mặt, hai mức mật độ); đổi token gốc, khung chung, thành phần dùng chung; dựng máy canh 1 và 2; chụp lại bốn màn mẫu | ADR; ảnh trước và sau của bốn màn mẫu và hai màn của đối tác |
| Đợt A tới F (đã có) | Như kế hoạch 21/11. Ảnh đề xuất của mỗi đợt vẽ theo ngôn ngữ mới; tiêu chí nghiệm thu của đợt thêm các phép kiểm ở phần D | như cũ, không thêm lượt duyệt |
| Sau đợt F | Chủ đề tối và chủ đề theo tổ chức, nếu chủ muốn, qua đợt 4 của ADR-0194 | quyết định riêng |

Một ghi chú không phải quyết định: màn của đối tác nằm ở đợt A (Tạo đơn), E (Của tôi, Tổ chức, Đăng ký, Hỗ trợ) và F (Đăng nhập). Đợt gốc đã làm êm khung chung và danh sách đơn của đối tác; nếu chủ muốn đối tác thấy trọn vẹn sớm hơn thì có thể đưa E lên ngay sau A, nhưng đó là đổi thứ tự chủ đã duyệt 21/11.

**Kiến trúc bộ giá trị.** Đề cương 27/10 (chủ duyệt cả gói) đã chọn ba tầng: giá trị gốc, giá trị theo nghĩa, token thành phần. Số đo hôm nay cho thấy tầng theo nghĩa đã chạy tốt về màu (33 trên 35 màu trên màn là token) nhưng tầng gốc còn lẫn số đo riêng của từng màn (122 token bề rộng, 43 token chiều cao; ADR-0222 Đ1 và Đ7 đang hạ dần). Vì màu trên màn gần như đều đi qua token, chủ đề tối hay chủ đề theo tổ chức chỉ là một bộ giá trị khác cho tầng theo nghĩa; phương án C chính là một phép thử: 14 token đổi là cả chín màn đổi tông, không sửa thành phần nào. Chỗ phải dọn trước khi làm chủ đề tối: màu viết cứng còn sót (nền `#fff` của `.btn`, nền nút gốc `#efefef`, 11 màn có nền chuyển màu).

## G. Nguyên tắc rút từ nguồn ngoài

Tra ngày 24/11/2026 bằng cách tải trang. Ghi chú đầy đủ, kèm câu trích ngắn và trang không tải được, ở `~/tourdao-thi-giac-2026-11-24/tra-nguon/` (ba tệp, 133 dòng). Dưới đây là các nguyên tắc hồ sơ này dùng, viết lại bằng lời của phiên đánh giá. Cột «Hợp?» là nhận định cho một công cụ làm việc hằng ngày của người Việt trên điện thoại.

**Apple, Human Interface Guidelines** (`https://developer.apple.com/design/human-interface-guidelines/` + tên trang)

| Nguyên tắc | Trang | Hợp? |
|---|---|---|
| Chữ mặc định trên iPhone 17 điểm, tối thiểu 11; cho phóng chữ ít nhất 200 % | `typography`, `accessibility` | Hợp. Nền tảng đang 16 và 12, đạt mức tối thiểu; khoá phóng to là điểm lệch |
| Tránh nét chữ mảnh; ít loại phông | `typography` | Hợp, và giải thích vì sao chủ chọn 500 thay 400 |
| Một màu không mang hai nghĩa; không chỉ dùng màu để phân biệt trạng thái | `color` | Hợp. Gốc của nguyên tắc 2 |
| Tương phản 4,5:1 cho chữ thường, 3:1 cho chữ lớn hoặc đậm | `accessibility`, `dark-mode` | Hợp, đang đạt (B10) |
| Vùng chạm 44 × 44 điểm, tối thiểu 28 | `buttons`, `accessibility` | Hợp, đang đạt 95,6 % |
| Mỗi màn một hai nút nổi bật; phân biệt nút ưu tiên bằng kiểu, không bằng cỡ; nút phá huỷ không là nút chính | `buttons` | Hợp. Gốc của nguyên tắc 7 |
| Thanh tab: ít mục, tránh mục «Thêm», không ẩn hay làm mờ mục, nhãn ngắn. Trang hiện hành không nêu «tối đa năm mục» cho iPhone | `tab-bars` | Hợp. Thanh dưới hiện có 3 tới 5 mục |
| Hiệu ứng kính (Liquid Glass) chỉ cho lớp điều khiển, không cho lớp nội dung; tô màu thật ít | `materials`, `color` | Chỉ học phần «nội dung phẳng, lớp điều khiển mới nổi». Không chép hiệu ứng kính: PWA không dựng được đúng, và nó là diện mạo của Apple |
| Đặt thứ quan trọng nhất ở trên, phía đầu dòng; nhóm bằng khoảng trắng; tôn trọng vùng an toàn | `layout` | Hợp |
| Bảng trượt ngắn gọn, mỗi lần một bảng, luồng dài dùng màn riêng | `sheets` | Hợp. Hộp hỏi huỷ đơn nằm trong trang là điểm lệch |
| Hiện ngay khung giữ chỗ, màn trống bị hiểu là hỏng | `loading` | Hợp. Chi tiết đơn đang trống khi tải |
| Màn khởi động không phải chỗ quảng bá; hướng dẫn làm quen ngắn, bỏ qua được | `launching`, `onboarding` | Hợp một nửa: với đối tác chưa được đào tạo, màn Đăng nhập nên có một câu nói đây là gì |
| Nhãn nằm ngoài ô vì chữ gợi ý biến mất khi gõ | `text-fields` | Hợp. Ô nhãn nổi của Tạo đơn giữ được nhãn, chấp nhận được |
| Hộp cảnh báo dùng thưa, tối đa ba nút, có «Huỷ» khi có hành động phá huỷ | `alerts` | Hợp |
| Bảng nhiều cột (sắp xếp, kéo cột, tô xen kẽ) chỉ được mô tả cho macOS | `lists-and-tables` | Đây là chỗ Apple không trả lời nhu cầu bảng dày trên máy tính của văn phòng; phải lấy từ nguồn khác |

**App Store Review Guidelines** (`https://developer.apple.com/app-store/review/guidelines/`): 2.1(a) cần tài khoản thử và hệ thống phía sau bật sẵn; 4.2 đòi vượt mức «trang web đóng gói lại»; 5.1.1(v) đòi xoá tài khoản ngay trong ứng dụng khi ứng dụng cho tạo tài khoản. **Chỗ dễ bị xét duyệt chê, nhìn từ bề mặt:** (1) ô chọn, ô tích, ô ngày kiểu gốc của trình duyệt và nền nút gốc làm lộ «đây là trang web bọc lại»; (2) màn mở đầu là ô số điện thoại và mã PIN, không lời giới thiệu; (3) tên ba kiểu; (4) khoá phóng to và chữ không theo cỡ chữ của máy; (5) chưa có chủ đề tối (Apple đòi xem tốt ở cả hai chế độ với ứng dụng gốc; với PWA bọc lại thì chưa kiểm cách họ chấm). Năm điểm chặn kho của lượt 13/11 (K1 tới K5) vẫn là danh sách chính; hồ sơ này không kiểm lại chúng.

**Anthropic** (điều họ công bố: `https://claude.com/docs/connectors/building/mcp-apps/design-guidelines`; kho `anthropics/skills`, tệp `skills/brand-guidelines/SKILL.md` và `skills/frontend-design/SKILL.md`; điều quan sát: tệp kiểu công khai của `anthropic.com` và `claude.com`)

| Nguyên tắc | Hợp? |
|---|---|
| Thang chữ ba bậc (tiêu đề, thân, chú thích) và hai độ đậm; thân 12 tới 20 | Hợp. Gốc của nguyên tắc 4; Nền tảng cần sáu bậc vì có số lớn và bảng |
| Tập bo góc có hạn (4 tới 12 và tròn hẳn), viền rất mảnh, bóng chỉ vài nấc rất nhạt | Hợp. Gốc của nguyên tắc 3 |
| Nền trung tính, một màu nhấn chính, màu khác ở vai phụ | Hợp về nguyên tắc; không lấy màu của họ. Phương án C thử nền ấm bằng màu của Tour Đảo |
| Dùng một họ phông, hoặc hai họ khác hẳn nhau | Hợp. Hôm nay là hai họ gần giống nhau |
| Viền, đường kẻ, nhãn phải mang thông tin; tránh các thẻ bo góc giống hệt nhau cùng bóng mềm, nhãn viết HOA rải rác | Hợp. Đúng điều C4 thấy |
| Khung xương cùng cấu trúc với nội dung thay cho vòng quay | Hợp |
| Chuyển động thưa, có mục đích, tôn trọng chế độ giảm chuyển động | Hợp, đang đạt |
| Thẻ nhúng tối đa bốn năm mục dữ liệu, không cuộn lồng | **Không hợp** cho màn làm việc: chính trang nói điều này dành cho thẻ trong hội thoại |
| Mọi màn hỗ trợ cả sáng và tối | Hợp về lâu dài; hôm nay Nền tảng chỉ có sáng |

**Hệ thống thiết kế cho nền tảng kinh doanh**

| Nguồn | Nguyên tắc | Đường dẫn | Hợp? |
|---|---|---|---|
| Atlassian | Bốn mặt nền (lõm, mặc định, nổi, phủ); mặt nổi và phủ mới có bóng; tránh nhiều tầng nổi | `https://atlassian.design/foundations/elevation` | Hợp. Gốc của nguyên tắc 3 |
| Atlassian | Vai của màu tách khỏi giá trị; màu nhấn không có nghĩa cố định thì không dùng cho trạng thái | `https://atlassian.design/foundations/color` | Hợp |
| Atlassian | Kiểu chữ sản phẩm: tiêu đề đậm, thân thường; thân 16, 14, 12 | `https://atlassian.design/foundations/typography` | Hợp |
| Atlassian, Carbon, Polaris | Một nút chính cho một trang (Atlassian), một lần mỗi màn (Carbon), một cho mỗi khối và không dùng trong bảng (Polaris) | `https://atlassian.design/components/button/usage`; `https://carbondesignsystem.com/components/button/usage/`; `https://shopify.dev/docs/apps/design/layout` | Hợp. Ba hệ lệch nhau về phạm vi; hồ sơ này chọn «một mỗi màn, không lặp theo dòng» |
| Carbon | Bảng có năm chiều cao dòng (24, 32, 40 mặc định, 48, 64); đầu bảng cùng cỡ với dòng | `https://carbondesignsystem.com/components/data-table/usage/` | Hợp cho máy tính; 24 và 32 không hợp cho màn chạm |
| Carbon | Chuyển động «làm việc» nhanh và kín đáo, khác chuyển động «biểu cảm»; thang thời lượng 70 tới 700 ms | `https://carbondesignsystem.com/elements/motion/overview/` | Hợp, đang đạt |
| Carbon | Trạng thái rỗng có ba loại, luôn có một lối đi tiếp | `https://carbondesignsystem.com/patterns/empty-states-pattern/` | Hợp |
| Polaris | Không trộn hai mật độ trên cùng một trang; trạng thái rỗng tách «chưa có dữ liệu» với «lọc không ra» | `https://shopify.dev/docs/apps/design/layout`; `https://shopify.dev/docs/api/app-home/patterns/compositions/empty-state` | Hợp |
| Oracle Redwood (qua tài liệu JET) | Hai trục tách nhau: tỉ lệ (lớn, vừa, nhỏ; nhỏ chỉ cho máy tính) và mật độ (thường, gọn; gọn chỉ giảm chiều dọc, không đổi cỡ chữ) | `https://docs.oracle.com/en/middleware/developer-tools/jet/19/reference-api/ScaleAndDensity.html` | Hợp. Gốc của nguyên tắc 6; hồ sơ này cho mức gọn giảm thêm một bậc chữ ở bảng |
| Salesforce Lightning | Mật độ hai mức do người dùng chọn | chỉ thấy qua kết quả tìm kiếm, trang gốc trả 403 | Không theo: 30 nhân viên và hàng trăm đối tác không nên phải chọn mật độ |

**Cổng đối tác ngành du lịch.** Phần làm việc của Klook, GetYourGuide, Booking.com đều nằm sau đăng nhập; phiên này chỉ đọc được trang công khai nên không có ảnh màn làm việc nào để so. Điều đọc được: trang mời đăng ký của GetYourGuide đánh số ba bước và nói thẳng mô hình phí (`https://getyourguide.supply/`); Booking.com coi ứng dụng điện thoại Pulse là bản cho việc nhanh, bổ sung cho bản đầy đủ trên máy tính (`https://www.booking.com/Pulse`); Klook chia lối vào theo loại đối tác ngay từ đầu (`https://www.klook.com/en-US/partner/`). Rút được hai điều: điện thoại là nơi làm việc nhanh, và màn mời đăng ký nên nói rõ các bước và tiền. So sánh diện mạo phần làm việc: **chưa kiểm**.

**Kiến trúc bộ giá trị.** Ba tầng (giá trị gốc, giá trị theo nghĩa, token thành phần) được Material Web (`https://material-web.dev/theming/material-theming/`), Adobe Spectrum (`https://spectrum.adobe.com/page/design-tokens/`) và Brad Frost (`https://bradfrost.com/blog/post/the-many-faces-of-themeable-design-systems/`) cùng mô tả; Spectrum khuyên giữ token riêng thành phần ở mức tối thiểu và có vòng đời ngừng dùng rồi mới gỡ (`https://opensource.adobe.com/spectrum-design-data/spec/evolution`). Đặc tả Design Tokens của nhóm cộng đồng W3C vẫn là bản nháp (`https://www.designtokens.org/TR/drafts/format/`), nên không lấy làm chuẩn bắt buộc. Vùng chạm tối thiểu theo WCAG 2.2 là 24 điểm (`https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html`), thấp hơn mức 44 Nền tảng đang giữ.

**Ba nguồn tham chiếu: bổ sung và kéo ngược.** Redwood (tham chiếu chủ chốt 13/11) trả lời phần Apple và Anthropic bỏ trống: bố cục trang làm việc, mật độ, bảng dày ở máy tính. Apple trả lời phần Redwood không nói: điện thoại, vùng chạm, bảng trượt, thanh dưới, điều kiện lên kho. Anthropic bổ sung kỷ luật bề mặt và chữ: ít bậc, phẳng, một màu nhấn. Chỗ kéo ngược: (1) sự thoáng của Apple và Anthropic va với bảng dày của kế toán và điều phối; hồ sơ này giải bằng hai mức mật độ, thoáng cho chạm và gọn cho chuột, thay vì chọn một bên; (2) Apple đòi bớt cột khi chữ phóng lớn, còn bảng văn phòng muốn giữ cột: chưa giải, vì Nền tảng đang khoá phóng to; (3) «một màu nhấn» của Anthropic va với năm màu của hướng «Năng động» chủ duyệt 2/10: phương án B giữ đủ năm màu nhưng cho mỗi màu một việc, phương án C mới bớt màu; (4) Redwood dùng minh hoạ nhiều, Apple và Anthropic dùng rất ít: hồ sơ này theo hướng ít.

## H. Điều chưa kiểm và giả định

Chưa kiểm: iPhone và iPad thật (vùng tai thỏ, bàn phím thật, cỡ chữ của máy, VoiceOver); tốc độ; chủ đề tối; biểu mẫu Đăng ký ở trạng thái mở (kho thử không có chính sách riêng tư đang hiệu lực nên Nền tảng không cho mở đăng ký); màn Hồ sơ tổ chức, thành viên và mã mời (tài khoản thử không phải người quản lý tổ chức); màn hoa hồng của đối tác (đối tác không có trang riêng; tiền của đối tác chỉ thấy trong Chi tiết đơn); 15 màn trống hoặc gần trống; phần cuối của 10 màn dài; mọi thứ sau khi bấm ngoài 39 ảnh trạng thái; tần suất dải nhắc trên bản chạy thật; diện mạo phần làm việc của ba cổng đối tác du lịch; các trang tài liệu không tải được (trang thanh điều hướng của Apple, phần lớn Polaris cũ, trang Redwood gốc, trang Lightning).

Giả định: (1) bộ núm đọc lúc 11:26 ngày 24/11 là thứ người dùng thấy; chủ đổi núm thì ảnh «hiện tại» đổi theo. (2) Ngưỡng ở cột «Phép kiểm» phần D do phiên này đặt từ số đo của phương án B, chưa ai thử trên đủ 111 màn. (3) Lớp kiểu xem trước viết luật theo từng màn cho nhanh; con số «công sức» ở phần E là ước lượng của phiên đánh giá, chưa có người thi công xác nhận. (4) Ba phương án chỉ chụp trên 9 màn; màn khác có thể lộ chỗ lớp kiểu chưa tính tới.

## I. Kết quả kiểm độc lập

(Điền sau khi người kiểm độc lập soát.)
