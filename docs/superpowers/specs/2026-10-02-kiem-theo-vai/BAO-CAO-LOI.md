Kiểm thử khám phá theo vai · 2/10/2026 · đã qua kiểm độc lập

# Kiểm thử theo vai Tour Đảo

Ba người kiểm đóng vai người dùng thật, mỗi nhóm một bản chạy thử riêng với dữ liệu giả (không đụng Nền tảng thật). Thử trên khổ điện thoại 390 và máy tính 1280. Tổng cộng 159 tình huống. Sau đó 39 lỗi nghiêm trọng và trung bình được một đợt kiểm độc lập đọc lại mã (43 lượt kiểm).

Kết luận

Các cổng quyền chính đều chặn đúng. Kiểm thử tìm được **78 lỗi mới**; sau kiểm độc lập chỉ **1 lỗi nghiêm trọng** (sổ tiền trừ hai lần một khoản chuyển khoản), 26 trung bình, 51 ít nghiêm trọng. Không lỗi nào bị bác bỏ, nhưng **21 lỗi hoá ra một phần hoặc toàn bộ là quyết định đã duyệt hoặc khoảng trống đã biết**: mã đúng với ADR, muốn đổi thì cần chủ quyết.

## Mức người tìm gán và mức sau kiểm

### Người tìm gán

4 nghiêm trọng35 trung bình39 ít nghiêm trọng

### Sau kiểm độc lập

1 nghiêm trọng26 trung bình51 ít nghiêm trọng

### Kết quả kiểm

13 lỗi xác nhận đầy đủ, 26 xác nhận một phần (chỉnh mức, nhãn "mới", tệp:dòng). 39 lỗi ít nghiêm trọng chưa có người kiểm độc lập.

### Bán hàng · Thực tập · Đối tác

47 tình huống

7 trung bình21 thấp

### Kế toán · Quản trị · Toàn quyền · Nhân sự

49 tình huống

1 cao7 trung bình18 thấp

### Hướng dẫn viên · Tài xế · Điều phối

63 tình huống

12 trung bình12 thấp

Số theo nhóm vai là mức sau kiểm. Ngoài ra gặp lại khoảng 22 lỗi đã có trong danh sách khắc phục; chúng không tính vào 78.

## Lỗi nghiêm trọng và ba lỗi sát ngưỡng

Nghiêm trọng · VP-01

### Sổ tiền trừ hai lần một khoản chuyển khoản

Tái hiện độc lập hai lần

Bán hàng khai "khách chuyển khoản về công ty". Trang đơn của Kế toán hiện cùng lúc hai nút cho cùng khoản: "Xác nhận đã nhận" và "Đã nộp về công ty". Nếu bấm "Đã nộp" trước rồi "Xác nhận" sau, khoản đó bị trừ hai lần khỏi sổ của nhân viên bán hàng, sổ ra số âm, bộ kiểm dữ liệu tự động vẫn báo đạt. Máy chủ và cơ sở dữ liệu đều không chặn.

Hai người kiểm chia đôi về mức: một giữ Nghiêm trọng, một cho là Trung bình vì chỉ sai sổ nội bộ và cùng họ với TNV-G4 (đã có hạn 31/10). Đề xuất: sửa ở máy chủ và giao diện, bổ sung vào ADR-0092 (hiện chưa phủ đường "xác nhận sau nộp").

Trung bình, sát ngưỡng · HT-24

### Chuyến đang chạy biến mất khỏi màn tài xế lúc qua 0 giờ

Chuyến xuất bến tối hôm trước, trên xe còn khách. Sang 00:01 màn "Cuốc của tôi" báo "Hôm nay không có cuốc nào". Người tìm gán Nghiêm trọng; cả hai người kiểm hạ xuống Trung bình vì còn đường vòng: mở lại qua tin cũ, hoặc văn phòng bấm thay.

Trung bình, sát ngưỡng · HT-03

### Bấm nhầm "Xuất bến" chuyến ngày khác không gỡ được

Nút bấm một chạm, không hỏi lại; sau đó xe và tài xế bị khoá cho mọi chuyến khác. Đường vòng là "Kết thúc gián đoạn" với lý do không đúng sự thật. Lệnh hoàn tác cần ADR vì đổi luật lõi "chỉ đi tiến".

Trung bình, sát ngưỡng · HT-01

### Điểm trả khách đứng trước điểm đón mà chuyến vẫn "Đạt hết"

Xếp hai đoàn cùng về Bến tàu lên một xe thì máy dựng thứ tự: đón đoàn 1, trả Bến tàu, rồi mới đón đoàn 2. Người kiểm xác nhận lỗi nhưng thấy không chặn hẳn việc chính: máy không cho ghi "Đã trả" khi khách chưa lên xe, tài xế đảo được thứ tự.

## Bốn kiểu vấn đề lặp lại

### Bấm nhầm không sửa được

Đã đón, khách đã huỷ, xuất bến, đã trả đều chốt ngay. Một phần là luật lõi "chỉ đi tiến" đã duyệt, nên sửa cần ADR.

### Tin báo không tới đúng người

Khách huỷ ngoài hiện trường không ai biết; HDV đi kèm không biết giờ và điểm hẹn; Kế toán không có tin về tiền. Phần lớn là khoảng trống thiết kế đã biết.

### Dữ liệu bẩn lọt vào

SĐT sai độ dài, hồ sơ khách trùng khi Thực tập và Đối tác lập đơn, hai đại lý trùng mã số thuế, giá danh mục sai áp ngay. Đa số là việc đã hoãn hoặc đã ghi nhận.

### Chữ và màn hình gây hiểu nhầm

Câu báo sai tình huống, nút "Hỗ trợ" che số tiền và nút "Kết thúc", ngày không có năm, Trang chủ đếm lẫn phạm vi.

## Toàn bộ 78 lỗi, xếp theo thứ tự nên sửa

## Phạm vi

**Đã làm**159 tình huống trên ba bản chạy thử riêng. Mã thử là main @ dfee4a8c, giống bản 1.76 đang chạy, chỉ khác chữ trợ giúp của bản 1.77. Báo cáo markdown đầy đủ (bước tái hiện, bằng chứng tệp:dòng) nằm trong tài liệu dự án.

**Đã kiểm**39 lỗi nghiêm trọng và trung bình được người kiểm độc lập đọc lại mã, không chạy máy chủ. VP-01 còn được chạy lại thật. 39 lỗi ít nghiêm trọng chưa có người kiểm độc lập.

**Chưa kiểm**iPhone thật, Face ID, thông báo đẩy, đồng bộ Google Sheet, trợ lý AI (máy thử không có mạng ra ngoài); tiền xe thuê và tài xế đối tác từ chối (chưa có chức năng).

**Cần bạn quyết**Đưa VP-01 vào sổ dừng dây chuyền hay gộp vào đợt sổ tiền; BH-06, BH-08, BH-09 (quyền); thứ tự sửa bốn lỗi chạm luật lõi chuyến (HT-03, HT-04, HT-01, HT-06).