# Gắn loại đối tác với mức hoa hồng cho linh hoạt (bản 3, 13/10/2026)

- **Người soạn:** AI, vai phân tích và soạn đề xuất (không viết mã). **Trạng thái:** văn bản ADR đề xuất (`de-xuat-adr.md`, số do bạn cấp, kế tiếp hiện là 0117) **chưa duyệt**. Người kiểm độc lập đã đọc bản 2 và kết luận cần sửa; bản 3 này sửa theo đó, chưa ai đọc lại.
- **Loại việc:** việc lớn (dữ liệu, tiền, quyền); mỗi lần phát hành xong phải có người kiểm độc lập chỉ đọc.

## Trả lời thẳng

Phần lớn các quyết định về tiền, dữ liệu và quyền bạn đã chọn trong chat hôm nay (bảng dưới), nên văn bản ADR chủ yếu ghi lại chúng. Nhưng còn **hai điều bạn chưa chọn**: cách nhận ra «hồ sơ nhân viên nội bộ» với những hồ sơ nhân viên cũ chỉ mang vai `STAFF`/`SALES` cũ, và việc làm lại một bảng tiền ở lần 2. Lời duyệt vì thế tách đôi: duyệt văn bản và lần 1 trước; lần 2 là quyết định riêng, trình sau.

## Ví dụ mở đầu

Kế toán thêm loại «Nhân viên spa» trên màn hình rồi gắn nó với mức TA1. Quản trị gắn loại này cho hồ sơ một công ty; công ty đặt đơn thì lúc xác nhận hệ thống tra mức TA1 của loại, lấy dòng của dịch vụ (hoặc nhóm dịch vụ) và chép số hoa hồng vào đơn. Đơn đã xác nhận trước đó giữ con số cũ, dù sau này Kế toán đổi mức của loại hay sửa số trong TA1; chỉ đơn xác nhận sau mới theo số mới. Loại này không bao giờ có quyền đăng nhập, và không gắn được cho hồ sơ nhân viên nội bộ. Nếu một hồ sơ mang hai loại mà hai loại cho hai mức khác nhau **cho cùng một dịch vụ hay nhóm**, đơn bị giữ vì thiếu mức, không tự lấy 0; còn nếu một mức riêng cho đúng dịch vụ và mức kia chỉ cho cả nhóm thì mức cụ thể hơn thắng.

## Các điều bạn đã chọn, và hai điều chưa chọn

Quy định của dự án cho tối đa 3 quyết định chạm dữ liệu/quyền mỗi lượt duyệt; lượt 1 có 4 dòng nên vượt mức. Vì vậy văn bản trình như **bản ghi các lựa chọn đã chốt, có ngày**, không hỏi lại.

| # | Lựa chọn | Lượt |
|---|---|---|
| 1 | Loại đối tác là dữ liệu do Kế toán thêm trên màn hình, không phải mã | 1 |
| 2 | Mức TA1/TA2/TA3 là bộ hoa hồng có tên, dùng chung nhiều loại | 1 |
| 3 | Một đối tác mang nhiều loại; mâu thuẫn cùng bậc thì đơn bị giữ | 1 |
| 4 | Dùng ô quyền sửa hoa hồng hiện có; Quản trị gắn loại ở Danh bạ; không ô quyền mới | 1 |
| 5 | Nhân viên nội bộ không mang loại hưởng hoa hồng; chặn cả hai chiều, máy chủ và CSDL | 2 |
| 6 | Khe «Đã giao» vá riêng và ngay, không chờ lần 1, không vào sổ hoãn | 2 |
| 7 | Giữ thứ tự chọn mức hiện tại và cảnh báo Kế toán khi gắn TA | 2 |
| 8 | **CHƯA CHỌN:** thế nào là «hồ sơ nội bộ» với hồ sơ chỉ có vai `STAFF`/`SALES` cũ | lượt này |
| 9 | **CHƯA CHỌN:** ngoại lệ dựng lại bảng `prc_commission_rule` ở lần 2 (không đảo ngược về dữ liệu) | trình sau lần 1 |

Về mục 8: người kiểm gắn được nhãn đối tác lên hồ sơ chỉ có vai `STAFF` hoặc `SALES` cũ, và công cụ tạo nhân viên vẫn tạo hồ sơ kiểu đó, nên «chặn theo vai nội bộ» chưa đủ. Tôi đề xuất coi là nội bộ nếu hồ sơ có vai nội bộ, hoặc vai cũ `STAFF`/`SALES`, hoặc tài khoản mang ít nhất một quyền nội bộ. Tài khoản Đối tác **không** tính: một lễ tân khách sạn có tài khoản Đối tác vẫn được mang nhãn, đó là ca chính của yêu cầu. Hai vai cũ `GUIDE`/`AGENT` mơ hồ nội bộ hay độc lập nên mặc định không tính (bạn nói nếu muốn khác); phương án phụ là chuyển hết vai `STAFF`/`SALES` cũ sang vai nội bộ đúng bằng một lần dọn dữ liệu (sạch hơn nhưng phải quyết từng người và sửa dữ liệu thật). Tôi chưa biết production có bao nhiêu hồ sơ như vậy; ADR kèm một lệnh đếm chỉ-đọc (loại trừ tài khoản Đối tác) để bạn tự chạy.

## Hai lần phát hành

- **Lần 1 (chỉ thêm):** màn thêm/tắt loại đối tác; hồ sơ tổ chức mang được loại; hàng rào nội bộ (mục 5 và 8), kể cả khi gộp hồ sơ trùng; giữ rào «Đã giao» và thêm ca kiểm cho loại mới. Làm **sau** khi phiên vá khe «Đã giao» vào bản chính.
- **Lần 2 (làm lại một bảng tiền):** mức TA dùng chung. Người kiểm đã thử làm lại bảng trên máy thử (không phải D1 thật): thêm cột là không đủ, và trình tự có sẵn của ADR-0003 phải gỡ rồi tạo lại một số trigger. Bước đầu tiên là phép thử có quyền dừng.

## Điều tôi chưa chắc

Gộp hồ sơ trùng có thể gây hai chuyện: hồ sơ chính mang hai loại, và lời báo «dữ liệu vừa thay đổi» sai nghĩa khi gộp bị trigger mới chặn; ADR có bài kiểm cho cả hai. Con số của ca vàng là ví dụ của tôi, chưa ai xác nhận. Dữ liệu production coi là dữ liệu thử (lời bạn 8/10, ghi trong sổ nhớ của phiên, chưa có trong repo), chưa kiểm lại. Dòng `BL-SDL-TO-CHUC` trong sổ việc hoãn ghi «chọn để sau 9/10», cũ hơn quyết định hôm nay; cần cập nhật khi nhập nhánh.

## Giải nghĩa vài từ

- **Chỗ hở «Đã giao»:** đơn qua được bước «Đã giao» mà không có hoa hồng, vì bên đặt đã bị đổi vai sau khi xác nhận.
- **Điểm khôi phục Time Travel:** bản chụp cơ sở dữ liệu D1 để quay lại nếu làm lại bảng bị lỗi.
- **Bản chụp:** lúc xác nhận đơn, số hoa hồng được chép sang bảng riêng; đơn dùng số đã chép.
- **Chỉ-thêm:** bảng chỉ thêm hoặc đóng dòng, không sửa, không xoá.
- **Bảng quy tắc hoa hồng:** nơi lưu từng dòng «ai hưởng, dịch vụ nào, bao nhiêu».
- **Ô quyền:** một ô trong bảng phân quyền, ví dụ «sửa hoa hồng đối tác».
- **Sổ hoãn:** danh sách lỗ bảo mật mức cao đã biết, có người chịu trách nhiệm và hạn.
- **Proposed / accepted:** ADR «đề xuất» chưa có hiệu lực; «đã duyệt» mới có.
- **Nhóm OTHER / EXTERNAL:** OTHER là loại hồ sơ không có quyền đăng nhập; EXTERNAL là vai đối tác có đăng nhập.
- **Sổ đại lý đợt 2:** phần tiếp theo của sổ hoa hồng; tôi hỏi bạn trước khi làm.

## Cần bạn quyết

1. Chọn luật «hồ sơ nội bộ» (mục 8): **mặc định đề xuất** hay dọn dữ liệu trước.
2. **Duyệt văn bản ADR + lần 1** không? (Lần 2 và ngoại lệ dựng lại bảng, mục 9, bạn quyết riêng sau.)

Chi tiết kỹ thuật ở `phu-luc/`; lệch nhau thì `de-xuat-adr.md` thắng.
