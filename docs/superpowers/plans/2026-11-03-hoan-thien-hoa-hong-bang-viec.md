# Hoàn thiện phân hệ hoa hồng — bảng việc

Chủ dự án 3/11/2026, nguyên văn: «để diễn tập sau, giờ là lúc cần hoàn thiện phân hệ hoa hồng»; chốt thứ tự dưới đây: «Chốt, gồm dời hạn». Thêm việc vào bảng phải hỏi chủ. Phát hiện không chặn phát hành ghi vào mục Nợ. Mỗi việc lớn có đặc tả và người kiểm độc lập riêng.

| # | Việc | Xong khi | Trạng thái |
|---|---|---|---|
| 1 | Công ty lữ hành chưa có tài khoản hưởng theo cấp (ADR-0155 Đ1, câu C3, C4, C6). Điều kiện trước: đóng `TNV-G3`, `TNV-G4` | Công ty không tài khoản gắn vai trò, gắn cấp, văn phòng chọn «Qua đối tác», xác nhận đơn, hoa hồng đúng cấp, Đã giao ghi sổ đúng; đạt tiêu chí nghiệm thu của ADR-0155 | Điều kiện trước đã đóng 4/11. Trang ghép: `docs/superpowers/specs/2026-11-03-trang-ghep-lu-hanh-khong-tai-khoan.md`; **xong**: bản 2.60 lên production 4/11 14:04 (`c7ba67e7`), chủ duyệt «Duyệt cả ba», người kiểm độc lập đạt. Chưa thử trên iPhone; chưa có công ty thật gắn vai |
| 2 | Nhập mức bằng tệp bảng tính hai chiều, nhận cả giá đại lý (`BL-CK-NHAP-TEP`, ADR-0148 Đ2, Đ3). Gộp Việc 4 theo lời chủ 4/11, nguyên văn: «Gộp vào Việc 2» | Kế toán xuất bảng điền sẵn dịch vụ, giá bán lẻ và mức hiện có; sửa rồi tải lên, xem trước chỉ các ô đổi; dòng sai bị từ chối theo đúng cổng `kiemSoMucMoi`; mức kỳ mới có ngày bắt đầu riêng; Kế toán đã xác nhận ca mẫu giá đại lý; giá đại lý cao hơn giá bán lẻ vào «thiếu mức»; hoa hồng không âm; Sheet bảng giá không dùng làm nguồn | chưa; chờ bảng giá đại lý hoặc 3–5 ca mẫu của Kế toán |
| 3 | Trả tiền theo tháng (ADR-0080 phần D2, ADR-0081): gộp nhiều đơn vào một phiếu, bảng kê tháng, đối tác tự xem sổ | Ca sổ vàng qua; khoá tháng vẫn đúng; đối tác chỉ thấy phần của mình | chưa; đọc nhanh, chưa kiểm kỹ phần đã có |
| 4 | Đã gộp vào Việc 2 (chủ 4/11) | Theo Việc 2 | gộp |
| 5 | Dọn chỗ nhỏ: chữ «/khách» còn sót với dịch vụ theo lượt, `BL-SDL-TAY-BI-DE`, `BL-SDL2-CHUP-BU-TRAN`, `BL-SDL2-DON-LAI` | Mỗi mục có bài đỏ trước, xanh sau | chưa |
| 6 | Màn «Cấp độ đại lý»: gán cấp TA nhanh cho mọi đối tác, không vào trang Hoa hồng. Chủ 4/11, nguyên văn: «Làm màn gom». Đặc tả: `docs/superpowers/specs/2026-11-04-man-cap-dai-ly.md` | Đạt chín tiêu chí của đặc tả; lên production | đã thi công, người kiểm độc lập đạt; chờ nhập, chờ triển khai |

## Ngoài bảng

`BL-CK-DIEU-KIEN` (cần quyết định mới), `BL-CK-BANG-DONG-BO`, `BL-CK-BANG-QUYEN`, `BL-DAI-LY-TO-CHUC` giữ ở `docs/BACKLOG.md`.

## Việc của chủ và Kế toán

- Diễn tập khôi phục `HC-5.19`: hạn 2026-11-30.
- Kế toán gửi bảng giá đại lý đang dùng, hoặc 3–5 ca mẫu, để chốt mẫu tệp và xác nhận cách tính.
- Kế toán nhập mức thật, nên làm sau Việc 2, chưa nhập tay trước đó. Năm vai trò đang thiếu mức.
- Xác nhận ca sổ vàng SV-TG-01…03.
- Thử bảng nhập trên iPhone thật.

## Đã đóng

`TNV-G3`, `TNV-G4` xoá khỏi `docs/quyen-hoan.json` ngày 2026-11-04, sau bản 2.59 (`aa4086f6`). Người kiểm độc lập đọc lại từng điều của ADR-0088, ADR-0092, ADR-0116, ADR-0115 điều 5: hai mục đóng được, không có điều còn hở mức Cao hay Trung (669 bài xanh, phá thử 7 chỗ). Chưa kiểm được: dữ liệu thật, người dùng thật (đang bảo trì). Lý do, kế hoạch và lịch sử gia hạn còn nguyên ở bản `aa4086f6` của sổ; các phép xây tiếp chép nguyên văn sang `HC-5.19`. Chủ 4/11 về tin số dư cho đối tác, nguyên văn: «Giữ tin báo».

## Nợ

- **Tin khác tới Tài xế đối tác còn kèm mã đơn** (mức trung bình, người kiểm 3/11, chỉ đọc mã): các tin `attribution_*`, `ledger_receipt_collector_changed` đã có từ bản 2.58. ADR-0053 D7 và ADR-0048 D2 chỉ cho họ thấy mã đơn trong khung thấy khách. Hướng xử lý: câu không mã đơn như tin số dư. Chưa thấy trường hợp thật; đơn không mở được (403).
- **Huỷ khoản thu, huỷ dòng sổ không gửi tin** cho bên bị đổi số dư: ADR-0092 Đ5 chỉ liệt kê điều chỉnh tăng, giảm nợ nên không phải lỗi. Có cần tin không là câu của chủ, khi làm Việc 3.
- **Tin số dư cũ hiện lại:** tin phát từ 2/11 tới lúc lên 2.59, còn trong 30 ngày, sẽ hiện chưa đọc cho Đối tác và Tài xế đối tác. Đúng với ADR, chỉ là tới muộn. Chưa kiểm số trên production.
- **Từ kết luận kiểm 4/11, mức Thấp, không chặn:** đơn đã Hoàn thành, Kế toán đảo dòng «Nộp» thì có người giữ tiền trở lại mà chưa luật kiểm định kỳ nào báo (đúng ADR-0092 Đ2b, tiền không mất); bên bị đổi số dư là tổ chức không tài khoản không nhận tin, liên quan Việc 1; đảo, nộp, hoàn trực tiếp đổi số dư mà không có tin, câu của chủ khi làm Việc 3.
- **Từ Việc 1 (thi công 4/11), mức Thấp, không chặn:** (1) chặn gỡ vai cuối (C3) chỉ áp cho năm vai trên hồ sơ chưa có tài khoản; loại tự thêm và đường gỡ ở Quản lý tài khoản giữ nguyên, nên hoa hồng vẫn có thể mất lặng lẽ ở hai đường đó. (2) Tạo tài khoản cá nhân cùng vai sau khi gỡ vai trong ngày vẫn nhận câu sai «vừa được người khác sửa» (ADR-0155 «Để lại cho người thi công»), chưa sửa. (3) Cấp riêng hay mức riêng kết thúc đúng hôm nay vẫn tính là còn hiệu lực (như `R-PRC-5`); nếu đã có đơn chụp hôm nay thì chỉ kết thúc sớm nhất được đến hôm nay, nên phải đợi sang ngày mai mới gỡ được vai cuối. (4) Câu chặn gỡ không nêu mã đơn nháp chưa gửi (ADR-0135 Đ1); nêu số đơn theo tên người lập, và mã cho đơn đang chờ xác nhận.
- **Từ Task 3, 4 của Việc 1 (4/11), mức Thấp, không chặn:** (1) `tests/e2e/so-dai-ly-dot-2.mjs` còn chú thích cũ «vai cho hồ sơ tổ chức chỉ gieo được bằng SQL»; vẫn chạy đúng vì gieo trực tiếp, chưa đổi sang route.
- **Từ kết luận kiểm lượt sửa Việc 1 (4/11), mức Thấp, không chặn:** bài ghim tên nút «Kết thúc» đọc cả tệp nên vẫn xanh nếu nút ở bảng vai đổi tên; câu chặn gỡ chưa nói cấp hoặc mức riêng kết thúc đúng hôm nay vẫn tính là còn hiệu lực; chốt quyền `PARTNER` khi tạo tài khoản cá nhân (Đ1.7) có bài canh nhưng phép phá thử chưa cô lập riêng được.
- **Từ kết luận kiểm lượt cuối Việc 1 (4/11), mức Thấp, không chặn:** bài ghim `hienLoi` ở Danh bạ có ngoại lệ chữ «n» nên một chỗ gọi `showError` trần có thể lọt; lỗi của hộp gộp nay cuộn cả trang nền, chưa nhìn trên màn; dòng cảnh báo trên phiếu phân định chưa nhìn trên màn, chỉ có bài kiểm mã. Ảnh màn Danh bạ chạy thật: `docs/evidence/2026-11-04-lu-hanh-khong-tai-khoan/`.
- **Kịch bản `xoa-an-danh` đỏ một lần trong lần triển khai 2.60:** chủ chọn đi tiếp; chạy lại ba lần đều xanh, chưa rõ nguyên nhân vì dòng lỗi đã trôi. Nếu đỏ lại phải đọc lỗi ngay; bộ chạy e2e nên ghi đầu ra ra tệp.

## Quyết định của chủ trong lúc thi công

- **Màn Cấp độ đại lý, 4/11, giả định của người soạn đã báo chủ:** chỉ Kế toán, Quản trị, Toàn quyền mở; Bán hàng không mở dù có ô xem hoa hồng đối tác, vì màn gom tên đối tác với cấp của họ. Đảo ngược được.

- **Việc 1, 4/11, đơn nháp chặn gỡ vai.** Được hỏi: khi còn đơn nháp người khác giữ, Nền tảng giúp Quản trị bằng cách nêu tên người lập hay để Quản trị huỷ thay; chủ trả lời, nguyên văn: «Nêu tên người lập». Hệ quả cần ghi: đây là ngoại lệ hẹp của ADR-0135 Đ1 (nháp chỉ người lập thấy). Người giữ `admin.manage` khi gỡ vai cuối thấy tên người lập và số nháp của họ đứng tên hồ sơ đó; nội dung và mã nháp chưa gửi vẫn kín, các đường đọc và ghi nháp vẫn 404. Chưa ghi vào ADR-0135 hay ADR-0155 vì ADR đã duyệt chỉ chủ sửa.
