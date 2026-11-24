# Đánh giá thị giác và hướng nâng cấp giao diện Nền tảng — 24/11/2026

> Hồ sơ có ngày. Phiên đánh giá và lập hướng: không sửa mã sản phẩm, không chạm bản chạy thật. Bản được đo: bản chính `277fe8e12` (bản 3.42), trên máy thử có dữ liệu giả và đúng bộ núm Giao diện công ty của bản chạy thật lúc đo (phông Noto Sans, chữ thường đậm 500, chữ nhấn đậm 600).
> Số liệu, bằng chứng từng mặt, nguồn bên ngoài: `PHU-LUC.md`. Đề bài: `DE-BAI.md`. Ảnh: trang so sánh riêng tư gửi kèm trong phiên; «ảnh 1…12» và «màn 1…7» dưới đây là số trên trang đó.

## 1. Kết luận

Phần nền của giao diện tốt hơn cảm giác khi nhìn: 33 trên 35 màu đang hiện lấy từ bộ giá trị chung, không chữ nào thiếu tương phản, không màn nào vỡ ở 13 bề rộng, biểu tượng một họ. Điều làm Nền tảng chưa chỉn chu không nằm ở từng màn mà ở **cách dùng**: quá nhiều thứ cùng được nhấn (hai phần ba số dòng chữ trên một màn điện thoại là chữ đậm; 88 trên 111 màn có từ hai sắc đỏ), bề mặt chồng nhiều lớp, khung chung nói to hơn nội dung, và cùng một việc mang nhiều dáng nút. Tôi đề nghị **phương án B**: giữ màu thương hiệu, bố cục, điều hướng và bộ núm của bạn; đặt bảy nguyên tắc cho cách dùng màu, chữ, bề mặt và mật độ; làm một đợt gốc rồi đi tiếp tám đợt khung gốc đã duyệt, không lập lộ trình mới.

## 2. Giao diện hôm nay đứng ở đâu

| Mặt | Mức | Lý do | Ảnh |
|---|---|---|---|
| Hệ màu | tạm | Giá trị rất kỷ luật, nhưng vai lẫn: đỏ gánh bốn việc, xanh nhạt ba việc, tiền tô ba màu | 1, 3, 4 |
| Chữ | **yếu** | Hai họ phông gần giống nhau; 15 cỡ mà bốn cỡ gánh 99 % chữ; chỉ còn hai độ đậm và phần lớn chữ ở mức đậm; tiền viết 30 kiểu | 1, 2, 6 |
| Khoảng cách, mật độ | tạm | Có thang bảy bậc; chỉ một mức mật độ nên bảng ở màn rộng chỉ thấy 12 dòng | 1 |
| Hình khối, chiều sâu | tạm | Bo góc gọn; nhưng khối vừa viền vừa bóng, nút có bóng màu, có chỗ chuyển màu | 2, 5 |
| Biểu tượng, minh hoạ | tốt | Một họ nét, luôn kèm chữ; không minh hoạ, và không cần thêm | 4 |
| Bố cục, thứ bậc trong trang | tạm | Bốn trang đã vào khung gốc thẳng hàng; phần ruột thì giá trị nào cũng đậm như nhau | 2 |
| Điều hướng theo vai | tạm | Thanh dưới, thanh bên một kiểu; đầu trang bốn kiểu, tên sản phẩm hai kiểu | 4, 7 |
| Thành phần và trạng thái | **yếu** | «Thêm» mang bốn dáng màu; bốn kiểu tab; ô chọn, ô tích kiểu gốc của trình duyệt; bốn kiểu báo «không có gì» | 9, 10, 11, 12 |
| Chuyển động, phản hồi | tốt | Ngắn, kín đáo, có trạng thái rê chuột và vòng tiêu điểm | — |
| Hợp iPhone | tạm | 95,6 % chỗ bấm đủ cỡ ngón tay; khi bàn phím bật, màn Tạo đơn còn rất ít chỗ (phép xấp xỉ) | 8 |
| Hợp máy tính | tạm | Không vỡ ở bề rộng nào; màn rộng chưa được dùng cho việc cần nhiều dòng | 1 |
| Ba giây đầu của đối tác mới | **yếu** | Đăng nhập gọn nhưng không nói đây là gì; vào trong gặp tên khác, dải vàng, nút đỏ trước khi thấy đơn | màn 7, màn 1 |
| Một sản phẩm qua các vai | tạm, nghiêng tốt | Cùng khung, màu, biểu tượng ở mọi vai; ba chỗ nói «giọng» riêng: Trang chủ, Điều phối xe, dải tóm tắt đơn | 2, 4 |

## 3. Bảy nguyên nhân gốc và bảy nguyên tắc đáp lại

476 phát hiện của lượt 20/11 và điều nhìn thấy hôm nay gom về bảy gốc. Mỗi nguyên tắc có một phép máy đếm được (phụ lục phần D).

| # | Nguyên nhân gốc | Số đo | Nguyên tắc |
|---|---|---|---|
| 1 | Nhấn tràn lan | 68 % dòng chữ ở điện thoại là chữ đậm | Trong một dòng chỉ một thứ đậm; trong một khối chỉ một con số nổi |
| 2 | Một màu, nhiều nghĩa | 88/111 màn có từ hai sắc đỏ | Mỗi màu một việc; tiền viết màu mực; san hô chỉ cho một hành động chốt mỗi màn |
| 3 | Bề mặt chồng lớp | 13 kiểu bóng; nút «Tạo đơn» có bóng đỏ ở 73 màn | Phẳng trước, nổi khi thật sự nổi: khối viền mảnh, chỉ lớp nổi có bóng; hai bậc bo góc |
| 4 | Chữ không có hệ | 15 cỡ, 2 họ phông, tiền 30 kiểu | Sáu cỡ chữ, một họ phông, tiền viết một kiểu (đủ số, số đều cột) |
| 5 | Khung chung nói to hơn nội dung | Khung chung chiếm 20 % màn điện thoại, tới 34 % ở Trang chủ | Dải nhắc một dòng nền trắng; thanh trên mang tên trang; khung chung không quá một phần tư màn |
| 6 | Một mật độ cho hai loại việc | Bảng Đơn hàng: 12 dòng ở màn 1.440 | Hai mức: «thoáng» cho điện thoại và đối tác, «gọn» cho bảng ở máy tính có chuột |
| 7 | Thành phần chưa đóng dáng | «Thêm»: 16 nút xanh nhạt, 9 biển đậm, 5 trắng, 3 san hô | Một màn một nút đặc; một việc một dáng; rỗng, tải, lỗi, không quyền dùng chung một khuôn |

## 4. Ba phương án (ảnh thật ở 390 và 1.280: màn 1 tới 7)

| | A — Dọn nhiễu | B — Làm mới trên khung gốc | C — Đổi tông |
|---|---|---|---|
| Đổi tầng nào | Chỉ giá trị (khoảng 20 giá trị chung) | Giá trị và dáng thành phần; không đổi bố cục, điều hướng | Như B, thêm tông nền ấm, bỏ màu ngọc |
| Được gì | Phẳng, một họ phông, sáu cỡ chữ; mọi trang đổi cùng lúc | Đáp cả bảy gốc; chữ đậm còn một phần ba; bảng thêm hai dòng mỗi màn | Cảm giác gần ngành du lịch hơn; mở đường cho chủ đề tối, chủ đề theo tổ chức |
| Mất gì | Không chạm gốc 1, 2, 5, 6, 7 | Phải duyệt lại ảnh bốn màn mẫu khung gốc | Lệch tông trang web công ty; là quyết định thương hiệu, bằng chứng không buộc |
| Công sức | Một việc nhỏ | Một đợt gốc cỡ đợt bốn màn mẫu, sau đó không thêm đợt | Nhỏ về mã, lớn về quyết định |
| Đụng quyết định cũ | «Thị giác 1.70» ngày 2/10 (bóng, độ bóng, chuyển màu) | Như A, thêm: san hô không còn cho số tiền; dải nhắc đổi hình; thang đo khung gốc thêm hai số của mức «gọn» | Như B, thêm: nền xám xanh và màu ngọc của «Thị giác 1.70» |

**Khuyến nghị: B.** A đẹp lên nhưng không chạm tới điều làm mắt mỏi (so ảnh A với ảnh hiện tại ở màn 1 gần như không thấy khác). C nên để sau B, làm thành một «chủ đề» chọn được. Bảng đủ các quyết định bị đụng ở phụ lục phần E.

## 5. Vì sao B đi qua được mọi trang, mọi quyền

- **Tự chảy xuống** (làm một lần ở đợt gốc): giá trị chung, khung chung (thanh trên, dải nhắc, thanh dưới, thanh bên), các thành phần dùng chung, luật viết tiền, mức «gọn» của khuôn Danh sách.
- **Theo họ màn** (đi cùng tám đợt khung gốc đã duyệt 21/11, thứ tự giữ nguyên): bỏ chữ đậm thừa trong ruột trang, đưa nút về đúng cấp, thay ô chọn và ô tích gốc, đưa các trạng thái về khuôn chung.
- **Máy canh:** bài kiểm không cho thêm màu, cỡ chữ, kiểu bóng ngoài bảng; bốn phép đo thêm vào lệnh đo trên trang thật đã chạy mỗi lượt kiểm; bảy nguyên tắc vào tiêu chí của trợ lý đánh giá giao diện.

## 6. Apple, Anthropic, Oracle Redwood

Ba nguồn bổ sung nhau: Redwood trả lời bố cục trang làm việc, mật độ và bảng dày ở máy tính; Apple trả lời điện thoại, vùng chạm, bảng trượt và điều kiện lên kho; Anthropic cho kỷ luật bề mặt và chữ (ít bậc, phẳng, một màu nhấn). Chỗ kéo ngược: sự thoáng của Apple và Anthropic va với bảng dày của kế toán, tôi giải bằng hai mức mật độ thay vì chọn một bên; «một màu nhấn» va với năm màu của hướng «Năng động» bạn duyệt 2/10, phương án B giữ đủ năm màu nhưng cho mỗi màu một việc. Không dùng phông, biểu tượng, màu nhận diện hay hiệu ứng kính của hai hãng. Chỗ bề mặt dễ bị xét duyệt kho chê: ô gốc của trình duyệt (lộ «trang web bọc lại»), màn mở đầu không lời giới thiệu, tên sản phẩm chưa thống nhất, khoá phóng to.

## 7. Chưa kiểm

iPhone và iPad thật; tốc độ; chủ đề tối; biểu mẫu Đăng ký ở trạng thái mở, màn Tổ chức và thành viên (kho thử không dựng được); 15 màn trống; mọi thứ sau khi bấm ngoài 39 ảnh trạng thái; tần suất dải nhắc trên bản chạy thật; diện mạo phần làm việc của các cổng đối tác du lịch (đều sau đăng nhập). Ba phương án mới chụp trên 9 màn. Phần «mức» và «gốc» là nhận định của người đánh giá, không phải số đo.

## 8. Cần bạn quyết

1. **Chọn hướng: A, B hay C.** Khuyến nghị: B.
2. **Đồng ý đổi lại một phần đặc tả «Thị giác 1.70» (2/10) bằng một ADR mới:** bỏ bóng thẻ, bóng màu dưới nút, độ bóng và chuyển màu; số tiền viết màu mực thay vì san hô. Khuyến nghị: đồng ý (cần cho cả A lẫn B).
3. **Đồng ý hai mức mật độ** («thoáng» mặc định, «gọn» cho bảng ở máy tính có chuột), hai con số của mức gọn duyệt bằng ảnh. Khuyến nghị: đồng ý.

## 9. Độ tin

(Điền sau khi người kiểm độc lập soát.)
