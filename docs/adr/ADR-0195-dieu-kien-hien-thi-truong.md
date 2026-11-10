# ADR-0195 — Điều kiện hiển thị: ẩn hoặc bắt buộc một trường chỉ khi đơn (hoặc dịch vụ) thoả điều kiện khai sẵn

- **Trạng thái:** **proposed** 2026-11-10 — AI soạn theo yêu cầu của chủ dự án trong chat 10/11 (chủ chọn «khuyến nghị» cho việc mở ADR này). Chưa duyệt, chưa thi công. Cần chủ duyệt, và người kiểm độc lập đọc trước khi duyệt.
- **Loại:** việc lớn (dữ liệu, hợp đồng giữa bảng, máy chủ và giao diện). **Cửa:** hai chiều. Mở rộng ADR-0194 (đợt 1, đã duyệt và đã nhập `main`).
- **Câu chủ hỏi:** «Nếu muốn ẩn trường mà có điều kiện thì thế nào, chẳng hạn ẩn Ghi chú trong đơn Không đón, được tạo bởi Đối tác?»

## Vì sao cần
Đợt 1 của ADR-0194 chỉ khoá theo ba thứ: màn × trường × mã quyền. «Do Đối tác tạo» làm được (Đối tác là một quyền). «Không đón» thì chưa: đó là lựa chọn của **từng dịch vụ** (`pickupChoice = KHONG_DON`, ADR-0134), mà danh mục đợt 1 chỉ có trường cấp đơn.

## Đề xuất

**Đ1. Điều kiện là danh sách khai sẵn trong mã, không cho gõ tự do.** Mỗi điều kiện có mã, tên tiếng Việt (tra `docs/BANG-THAM-CHIEU.md`), và một hàm thuần ở `src/shared/` trả đúng/sai từ dữ liệu của đơn hoặc dịch vụ. Khởi đầu chỉ hai điều kiện: `DICH_VU_KHONG_DON` (dịch vụ có lựa chọn đón là «Không đón») và `DICH_VU_CO_DON`. «Người tạo là Đối tác» không cần điều kiện riêng vì đã có mã quyền.

**Đ2. Cột điều kiện trong bảng chính sách, theo cách mở rộng–thu hẹp.** Thêm cột `dieu_kien` (có thể trống = luôn áp, đúng như đợt 1) vào dòng chính sách bằng migration mới; khoá thành màn × trường × quyền × điều kiện. Dòng cũ không đổi nghĩa. Dòng chính sách vẫn chỉ-thêm.

**Đ3. Nới danh mục sang trường cấp dịch vụ.** Thêm màn con «Dịch vụ trong đơn» cho vài trường phụ của thẻ dịch vụ (ghi chú dịch vụ và tương tự), đánh dấu rõ ẩn được hay không. Trường nào luật nền cần (giờ đón khi có đón, điểm đón, số khách, tiền) giữ «không được ẩn». Chốt danh sách trường cụ thể trước khi thi công, không đoán.

**Đ4. Máy chủ tự kiểm điều kiện.** Khi nhận đơn, máy chủ tự tính điều kiện từ dữ liệu gửi lên rồi mới bỏ khoá trường ẩn; không tin cờ từ trình duyệt. Hai điều kiện cùng khớp thì **ẩn thắng chỉ khi mọi dòng khớp đều ẩn** (cùng nguyên tắc nhiều quyền của ADR-0194). Giao diện tính lại điều kiện ngay khi người dùng đổi lựa chọn đón và ẩn/hiện ô theo đó.

**Đ5. Một dịch vụ đổi lựa chọn đón không làm mất dữ liệu đã gõ.** Ô bị ẩn vì điều kiện mới thì giao diện giữ giá trị trong bộ nhớ trang nhưng máy chủ bỏ khi lưu; chủ quyết có chấp nhận cách này không (xem câu hỏi 2).

## Ranh giới giữ nguyên từ ADR-0194
Chính sách chỉ nới hoặc thu phần hiển thị, không nới luật nền. Danh sách cho phép, mặc định không cho ẩn. Chỉ Toàn quyền chỉnh. Nhật ký chỉ ghi mã. Bảng rỗng hoặc lỗi tải cấu hình thì hiện đầy đủ.

## Ba điều chủ quyết khi duyệt (khuyến nghị đứng đầu)
1. **Chỉ hai điều kiện khởi đầu** (`DICH_VU_KHONG_DON`, `DICH_VU_CO_DON`); thêm điều kiện sau bằng ADR nhỏ riêng.
2. **Ô bị ẩn vì đổi lựa chọn: máy chủ bỏ giá trị khi lưu, giao diện không hỏi lại.** Phương án khác: hỏi xác nhận khi đổi lựa chọn mà ô đã có chữ.
3. **Danh sách trường cấp dịch vụ ẩn được:** AI đề xuất trước khi thi công (chỉ ghi chú dịch vụ), chủ chốt, không mở rộng sang trường khác trong đợt này.

## Trang ghép (CLAUDE.md §9)
Bảng chính sách nay chứa: dòng chính sách theo màn × trường × quyền × điều kiện (không chứa dữ liệu khách). Chạm: bản đồ quyền (không đổi, vẫn `settings.ops` để ghi), giao diện ẩn/hiện ở thẻ dịch vụ, máy chủ bỏ khoá trường ẩn ở lập và sửa đơn. Rủi ro: ẩn nhầm trường luật nền cần → danh sách cho phép + khôi phục mặc định + bài kiểm danh mục ↔ `contracts.ts` mở rộng cho trường dịch vụ.

## Kiểm
Chưa có người kiểm độc lập (cần trước khi chủ duyệt). Hàng rào mới (nếu duyệt) ghi `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.
