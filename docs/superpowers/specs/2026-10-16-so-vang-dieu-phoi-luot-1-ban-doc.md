# Sổ vàng điều phối xe, lượt 1: bản đọc để chủ xác nhận

Ngày 2026-10-16. Hồ sơ có ngày, viết xong là đóng băng. Nguồn: `golden/dieu-phoi/xe-a-b-luot-1.json` (24 bước). Tôi đã chạy lại bài `src/dieu-phoi-ca-mau.test.ts` trên mã hiện tại: 28/28 xanh, nghĩa là mã đang làm đúng như đáp án ghi trong tệp. Việc của bạn là đọc từng bước và xem đáp án đó có đúng ý bạn không.

**Bối cảnh chung.** Xe A 15 chỗ (công ty), xe B 29 chỗ (công ty), xe Minh Phát 45 chỗ (nhà xe thuê). Chuyến CX-3009-07 chạy sáng 30/09, xuất bến 05:50, đón ba khách sạn rồi trả. Luật gốc: phải ra lệnh trước giờ xuất bến ít nhất 6 giờ thì Bán hàng làm được, sát hơn thì cần Quản trị mở. Nghỉ giữa hai chuyến của một xe tối thiểu 30 phút.

**Cách xác nhận.** Bạn trả lời một trong ba cách: «Đúng hết», «Đúng hết trừ bước X, Y» (kèm điều bạn muốn khác), hoặc «Chưa». Chỉ khi bạn nói đúng hết thì tôi mới đổi trạng thái tệp sang đã xác nhận, ghi tên và ngày.

## A. Lập chuyến: đúng người, đúng xe (4 bước)
- **B01** Tối 29/09, Bán hàng lập chuyến xe A 15 chỗ với tài xế có bằng D1 (lái được xe tới 16 khách). Kết quả: cho qua.
- **B02** Lập chuyến xe B 29 chỗ cho tài xế chỉ có bằng D1. Kết quả: chặn, vì bằng không đủ hạng.
- **B03** Đổi sang tài xế bằng D2 (tới 29 khách). Kết quả: cho qua.
- **B04** Xe 45 chỗ của nhà xe Minh Phát mà giao tài xế công ty. Kết quả: chặn, vì xe nhà xe phải do tài xế của nhà xe lái.

## B. Xếp khách vào chuyến (2 bước)
- **B05** Xếp ba khách sạn (4 + 3 + 5 = 12 người) vào xe 15 chỗ. Kết quả: cho qua, còn thừa 3 chỗ.
- **B06** Xếp thêm 4 người, thành 16 trên 15 chỗ. Kết quả: chặn, vì vượt số chỗ.

## C. Xuất bến: giữ lại khi thiếu tên (2 bước)
- **B07** 05:45 bấm Xuất bến, trong khi còn thiếu tên 2 khách ở Sheraton và 5 khách ở Mường Thanh. Kết quả: giữ lại, văn phòng xử lý.
- **B08** Văn phòng nhập đủ tên. Kết quả: Xuất bến đạt, máy tự gắn 7 tên vào chỗ ngồi.

## D. Luật 6 giờ khi xếp thêm (4 bước)
- **B09** 02:00 sáng, còn 3 giờ 50 phút tới giờ xuất bến, Bán hàng xếp một chặng thường vào chuyến. Kết quả: cần người có quyền phá lệ.
- **B10** Cùng lúc đó, nhưng chặng đã được Quản trị bấm «Đặt gấp» từ trước. Kết quả: cho qua, không phải xin phá lệ lần nữa.
- **B10B** 02:40 Bán hàng dời giờ xuất bến từ 05:50 ra 12:00, rồi xếp chặng thường. Kết quả: vẫn cần phá lệ, vì chuyến đã từng lọt vùng 6 giờ thì khoá giữ nguyên, dời giờ không gỡ được. (Chủ đã trả lời ý này ở lần 9.)
- **B16** Chuyến cứu hộ xuất bến 07:30, xếp chặng thường (5 người) vào lúc 07:12. Kết quả: cần phá lệ, lý do ghi «Sự cố vận hành».

## E. Trạng thái chặng khi xe đang chạy (2 bước)
- **B11** Sheraton có 4 khách, 3 người lên xe, 1 người vắng. Kết quả: chặng ghi «Đã đón», 3 người, gắn nhãn «vắng».
- **B12** Người vắng chạy ra kịp, lên xe. Kết quả: «Đã đón» 4/4, hết nhãn vắng. Đây là bước lùi duy nhất cho phép (vắng thành đã lên).

## F. Xe hỏng giữa đường và chuyến cứu hộ (3 bước)
- **B13** Xe A hỏng khi vừa tới Amiana: 4 khách đã lên, 8 người còn chờ, còn 4 điểm chưa tới. Kết quả: không kết thúc thường được, hệ thống gợi ý «Kết thúc gián đoạn».
- **B14** Sau khi kết thúc gián đoạn, chặng Mường Thanh quay về «Chưa xếp» và gắn nhãn quá mốc (giờ hẹn 06:30, bây giờ 07:10).
- **B15** 07:10 văn phòng lập chuyến cứu hộ (xe và tài xế của Minh Phát, 07:30 tới 09:00). Kết quả: cho qua, lập chuyến cứu hộ không cần phá lệ.

## G. Đổi nơi đón sau khi đã xếp (2 bước)
- **B17** Sau khi xếp, khách đơn ĐH-1001 đổi nơi đón từ Sheraton sang Amiana (so theo khoá nơi, không so chữ). 05:48 bấm Xuất bến. Kết quả: giữ lại vì «nơi đón đã đổi», văn phòng xử lý.
- **B18** Văn phòng bấm «Cập nhật điểm theo đơn». Kết quả: Xuất bến đạt, 7 tên còn thiếu vẫn được gắn.

## H. Giờ xảy ra thật và khoảng nghỉ (5 bước)
- **B19** Tài xế gọi báo «đón xong lúc 06:16», văn phòng bấm lúc 06:30 và khai 06:16. Kết quả: được, giờ xảy ra là 06:16, giờ ghi nhận là 06:30.
- **B20** Văn phòng khai «đã đón» lúc 05:40, trước cả giờ xe xuất bến. Kết quả: từ chối, sai thứ tự.
- **B21** Chuyến trước kết thúc thật 07:50. Chuyến sau cùng xe, văn phòng khai xuất bến 08:10 (nghỉ 20 phút). Kết quả: giữ lại, vì nghỉ thiếu 30 phút, Quản trị xử lý.
- **B22** Như B21 nhưng khai 08:20 (nghỉ đủ 30 phút). Kết quả: đạt.
- **B23** Xe 45 chỗ nhà xe có Kiểm định nhưng chưa nhập Bảo hiểm trách nhiệm dân sự. Kết quả: giữ lại vì «xe thiếu giấy tờ bắt buộc», Quản trị xử lý.

## Hai điều tôi nhắc để bạn không bị bất ngờ
1. Các bước nhóm D chỉ nói «cần người có quyền phá lệ», còn ai được phá lệ và bằng cách nào thì đã đổi sau ADR-0104: Bán hàng nay có thêm đường «điều chỉnh khẩn cấp» kèm lý do (đã có e2e chạy xanh). Tệp lượt 1 không mô tả đường này, nên nó sẽ nằm trong phần ca mới.
2. B10 và B10B dùng chữ «Đặt gấp» và «khoá dính». Nếu hai chữ này không còn quen với bạn, bạn cho biết chữ bạn muốn dùng, tôi sửa chữ trong tệp (đáp án không đổi).
