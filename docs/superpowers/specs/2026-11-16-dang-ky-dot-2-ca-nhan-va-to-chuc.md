# Đăng ký đối tác đợt 2: vai khớp hệ thống, cá nhân kèm tổ chức, thao tác theo tư cách

> Đặc tả ngắn, hồ sơ có ngày 16/11/2026, CHỜ CHỦ DUYỆT. Nối tiếp đợt 1 (ADR-0206…0210, đã lên production bản 3.11, công tắc đang tắt).

## 1. Việc gì, cho ai, vì sao
Người ngoài đăng ký làm đối tác hôm nay chỉ chọn được bốn vai ghi cứng trong mã và chỉ khai được hồ sơ cá nhân. Chủ muốn: danh sách «Vai người dùng xin đăng ký» lấy thẳng từ danh sách vai của hệ thống (thêm vai mới thì biểu mẫu tự có); biểu mẫu chỉ hỏi đúng những gì cơ sở dữ liệu lưu; một phiếu khai được cả cá nhân (bắt buộc) lẫn tổ chức (tuỳ chọn); sau khi được duyệt, người đó chọn thao tác với tư cách cá nhân hay tổ chức; mỗi tổ chức có tài khoản quản lý riêng, giao được quyền quản lý cho một tài khoản cá nhân.

## 2. Xong khi (ví dụ nhìn thấy được)
- Toàn quyền mở khối «Nhận đăng ký mới»: danh sách ô chọn vai gồm mọi vai đối tác đang bật của hệ thống. Kế toán thêm một loại đối tác mới ở trang Hoa hồng ⇒ tải lại khối, loại đó hiện ra để chọn, không cần sửa mã.
- Người đăng ký trên iPhone: điền phần «Thông tin của bạn» (bắt buộc), gạt «Tôi đăng ký cho cả tổ chức» thì hiện thêm phần tổ chức: tên pháp lý, mã số thuế, địa chỉ, email nhận hoá đơn, ảnh giấy đăng ký kinh doanh. Không gạt thì phiếu gửi như đợt 1.
- Quản trị xác minh thấy hai nhóm mục (cá nhân, tổ chức), kết luận từng mục. Nhân sự duyệt một lần ⇒ có hồ sơ cá nhân, hồ sơ tổ chức, tài khoản cá nhân, tài khoản quản lý của tổ chức, và dòng «người này quản lý tổ chức này».
- Người được duyệt đăng nhập, thấy ô «Đang thao tác với tư cách: [tên mình] / [tên tổ chức]». Chọn tổ chức rồi lập đơn ⇒ bên đặt là tổ chức, hoa hồng và công nợ tính cho tổ chức. Chọn cá nhân ⇒ tính cho cá nhân.
- Bài kiểm máy: mỗi trường của biểu mẫu có đúng một cột lưu, và mỗi cột «người dùng khai» của hồ sơ có đúng một trường; lệch thì `npm test` đỏ.
- Quyền: chỉ Toàn quyền chọn vai được mở; Quản trị xác minh; Nhân sự duyệt (như đợt 1). Người quản lý tổ chức chỉ thấy đơn và công nợ của tổ chức mình.

## 3. Không làm lần này
- Đăng ký bằng Google, Apple (đợt 4). Màn tệp của Toàn quyền (đợt 3).
- Xuất hoá đơn VAT. Chỉ thu thông tin để sau này xuất.
- Người đã có tài khoản xin thêm tổ chức (làm sau, cùng đợt «tự nộp giấy tờ»).
- Một tổ chức nhiều người quản lý cùng lúc, phân quyền chi tiết trong tổ chức.

## 4. Loại việc
- [x] Việc lớn (dữ liệu, quyền, tiền, tài khoản) ⇒ có người kiểm độc lập, kèm trang ghép.
- Cần ADR: có, hai quyết định. (a) Mở loại phiếu «tổ chức» và vai đăng ký là dữ liệu (nối ADR-0206 Đ11, ADR-0117). (b) «Thao tác theo tư cách» và «người quản lý tổ chức»: sửa ADR-0018 điều 9 (chủ từng chọn «công ty lữ hành dùng một tài khoản chung»), chạm cách tính bên đặt, hoa hồng, công nợ.

## 5. Câu hỏi cho chủ
1. **«Khớp mọi vai của hệ thống» có gồm vai nội bộ không?** Hệ thống có 10 vai nội bộ (Giám đốc, Kế toán, Nhân sự…) và 6 vai bên ngoài, cộng các loại đối tác do Kế toán thêm. Khuyến nghị: chỉ vai bên ngoài và loại đối tác thêm sau; vai nội bộ không bao giờ tự đăng ký được, vì người lạ xin vai Kế toán hay Giám đốc là rủi ro quyền, và nhân viên vẫn do Nhân sự tạo tài khoản.
2. **Tài khoản quản lý của tổ chức có số điện thoại và PIN đăng nhập riêng không?** Khuyến nghị: không. Tài khoản tổ chức tồn tại để gắn đơn, công nợ, cấp đại lý; người vào thao tác là tài khoản cá nhân được giao quyền quản lý (người đăng ký là người quản lý đầu tiên). Lý do: PIN dùng chung thì không biết ai bấm, người nghỉ việc vẫn giữ PIN (nhược điểm đã ghi ở ADR-0018). Các công ty lữ hành đang dùng tài khoản chung giữ nguyên, không bị đổi.
3. **Ai được đổi người quản lý của một tổ chức?** Khuyến nghị: Quản trị và Toàn quyền, có nhật ký; người quản lý hiện tại không tự chuyển cho người khác được. Lý do: tránh chiếm tổ chức khi một tài khoản cá nhân bị lộ.

## 6. Điều AI tự quyết (chủ bác được)
- Vai «Công ty lữ hành» chỉ chọn được khi phiếu có phần tổ chức; vai tài xế đối tác giữ luật riêng (không kèm quyền khác).
- Email người đăng ký hôm nay chỉ dùng để gửi mã, chưa ghi vào hồ sơ; đợt này ghi thành liên hệ «Email» của hồ sơ cá nhân cho khớp «hỏi gì lưu nấy». (Chưa kiểm hết các trường khác; bước kế hoạch sẽ lập bảng đối chiếu từng trường.)
- Làm thành hai lượt: lượt A (vai là dữ liệu, bảng đối chiếu trường, phiếu có phần tổ chức), lượt B (thao tác theo tư cách, người quản lý tổ chức). Lượt A dùng được ngay cả khi lượt B chưa xong.
- Chính sách riêng tư nháp phải thêm phần dữ liệu tổ chức trước khi đăng.
