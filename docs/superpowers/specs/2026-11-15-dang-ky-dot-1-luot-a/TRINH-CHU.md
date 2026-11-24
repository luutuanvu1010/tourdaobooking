# Trình chủ — đăng ký đối tác, đợt 1, lượt duyệt A (15/11/2026)

Hồ sơ có ngày; viết xong là đóng băng. **Chủ đã duyệt ngày 15/11 bằng nút trả lời «Duyệt theo câu mẫu»** (câu mẫu ở cuối trang). Phần dưới giữ nguyên như lúc trình. Bộ văn bản đã qua một lượt soát độc lập (chỉ đọc); người soát tìm ra bốn lỗ thiết kế nặng, tôi đã sửa cả bốn (mục cuối). Chữ và con số đề xuất nằm ở `PHU-LUC.md`.

Luật dự án cho tối đa ba quyết định mỗi lần duyệt, nên đợt 1 chia hai lượt. Lượt A gồm ba quyết định dưới đây; lượt B (cấp độ đại lý mặc định, dấu xác minh) trình sau.

## Quyết định 1 — Phiếu đăng ký và lối vào riêng

- Màn Đăng nhập có thêm lối vào đăng ký, **luôn hiện**, kể cả khi đang đóng đăng ký (vì người có phiếu dở vẫn cần vào lại).
- Người đăng ký nhập email, nhận mã 6 số qua thư, điền phiếu trên điện thoại. Họ **không có tài khoản** lúc chờ và chỉ mở được đúng phiếu của mình. Gửi phiếu không sinh hồ sơ ở Danh bạ, không sinh tài khoản.
- Đợt 1 chỉ nhận cá nhân: hướng dẫn viên độc lập, lễ tân khách sạn, tài xế taxi, cộng tác viên. Công ty lữ hành đăng ký ở đợt 2.
- Toàn quyền có công tắc mở, đóng đăng ký, lúc phát hành để đóng.

## Quyết định 2 — Ai xác minh, ai duyệt, người mới đặt PIN thế nào

- **Quản trị xác minh:** xem từng mục, mở ảnh, **thấy đủ số căn cước** của người chưa là đối tác (mỗi lần mở có nhật ký), gọi số điện thoại, soát Danh bạ để không sinh hồ sơ trùng.
- **Nhân sự duyệt mở tài khoản:** thấy họ tên, số điện thoại, loại đối tác; không thấy ảnh hay số giấy tờ. Nhân sự có thể duyệt vào một hồ sơ có sẵn mà mình **không được xem** ở Danh bạ (hồ sơ do Quản trị chọn).
- Người duyệt phải khác người xác minh. Toàn quyền làm được cả hai bước, khi đó phiếu mang dấu để xem lại.
- Bấm duyệt thì Nền tảng sinh hồ sơ và tài khoản trong một lần ghi. **Tài khoản để tắt** cho tới khi chính người đó tự đặt PIN: không ai đăng nhập được, và không ai trong công ty đặt lại PIN hộ được.
- Người được duyệt nhập một mã email mới, tự đặt PIN, rồi đăng nhập ở màn Đăng nhập như mọi người. Phiếu cần bổ sung hay bị từ chối thì họ thấy lý do.

## Quyết định 3 — Ảnh giấy tờ của phiếu, và việc máy tự dọn

- Ảnh được thu nhỏ trên máy người đăng ký rồi mới gửi, nằm trong kho ảnh hồ sơ đang có. Người đăng ký không xem lại được ảnh đã gửi.
- Duyệt thì ảnh thành ảnh của hồ sơ đối tác. Từ chối hoặc rút thì ảnh bị xoá ngay trong cùng lần bấm. Phiếu bỏ dở quá hạn thì **máy tự xoá**, không cần ai bấm.
- Ba mươi ngày sau, máy ẩn danh phần chữ của phiếu không được duyệt.

Kèm theo: hai luật chung của ba quyết định («người chưa được duyệt không có phiên của Nền tảng», «phiếu trước, tài khoản sau») đề xuất thành một điều mới của Hiến chương (`DE-XUAT-HIEN-CHUONG.md`). Tôi không tự sửa Hiến chương.

## Bốn điều bạn cho phép khi duyệt

1. **Làm khi chưa diễn tập khôi phục dữ liệu** (đang hẹn 25/11). Lý do: chỉ thêm bảng mới; phiếu không sinh hồ sơ hay tài khoản trước khi duyệt; công tắc để đóng.
2. **Bảy đường lệnh của người đăng ký không đi qua lớp chống bấm trùng chung** (lớp đó chỉ chạy cho người có tài khoản). Từng lệnh tự chặn lần bấm thứ hai.
3. **Máy tự xoá dữ liệu cá nhân mà không có người bấm.** Lần đầu; chỉ cho phiếu chưa bao giờ thành hồ sơ.
4. **Nhân sự duyệt vào hồ sơ mình không xem được.** Đây là ngoại lệ của luật bạn duyệt ngày 1/10 (Nhân sự chỉ dùng hồ sơ mình được thấy).

## Điều nên biết

- Làm xong vẫn chưa mở được: bản chính thức chưa đăng chính sách riêng tư (chờ luật sư), mà chưa có chính sách thì không ai gửi được phiếu.
- Chưa ai thử gửi thư thật trên bản chính thức. Phải thử trước khi lập kế hoạch thi công; thư không tới thì đổi cách làm.
- Đưa phần đăng ký lên hai kho ứng dụng cần lối xin xoá tài khoản trong ứng dụng trước (đang chờ, cùng lý do diễn tập).
- Mỗi phiếu cần hai người. Số điện thoại không xác nhận bằng mã được; Nền tảng chỉ ghi lại rằng Quản trị nói đã gọi.

## Lượt soát đã sửa gì

1. Tài khoản vừa duyệt **đăng nhập được ngay** bằng PIN máy sinh, và Quản trị đặt lại PIN hộ được. Nay tài khoản để tắt tới khi tự đặt PIN, và đặt lại PIN hộ bị chặn.
2. Bấm duyệt đúng lúc phiếu vừa bị từ chối **vẫn sinh tài khoản**. Nay có một bước chốt làm cả lần ghi thất bại.
3. Email bị ẩn danh lúc duyệt nên người được duyệt **không vào lại để đặt PIN được**. Nay email giữ tới lúc kích hoạt.
4. Luật «người đã tạo tài khoản không tự xác minh tài khoản đó» **không nhận ra** lệnh duyệt. Nay nhật ký trỏ đúng tài khoản.

## Câu duyệt mẫu (chép nguyên, hoặc sửa)

> Duyệt ADR-0206, ADR-0207, ADR-0208 và điều Hiến chương mới; chữ và con số theo khuyến nghị. Cho phép bốn điều: xây trên lỗi HC-5.19 vì chỉ thêm bảng mới và công tắc để đóng; miễn lớp chống bấm trùng cho bảy đường của người đăng ký; máy tự xoá dữ liệu của phiếu không được duyệt; Nhân sự duyệt vào hồ sơ có sẵn do Quản trị chọn.

---
Tệp: `docs/adr/ADR-0206-…`, `ADR-0207-…`, `ADR-0208-…`; cùng thư mục: `DE-XUAT-HIEN-CHUONG.md`, `TRANG-GHEP.md`, `PHU-LUC.md`.
