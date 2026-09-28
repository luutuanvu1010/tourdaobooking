# Bản vẽ Vận chuyển lượt 1a (Claude Design) — người thi công ĐỌC TRƯỚC

- **Nguồn:** chủ dự án vẽ trên Claude Design, trong dự án có sẵn "Tour Đảo Booking Design System" (`https://claude.ai/design/p/34f284df-c97a-4672-bb66-d7df03a0d97a`). Xuất ra Desktop lúc 2026-09-28 15:57 (VN), điều phối chép vào đây nguyên văn, không sửa.
- **Căn cứ:** ADR-0040 (`docs/adr/ADR-0040-van-chuyen-luot-1a-xe-giay-to-tai-xe.md`), danh sách màn `docs/superpowers/specs/2026-09-28-van-chuyen-1a-man-hinh-can-ve.md`, kế hoạch `docs/superpowers/plans/2026-09-28-van-chuyen-1a.md` (Phần B).
- **Làm đúng bản vẽ** (tiền lệ trang Đăng nhập, Việc của tôi): dựng lại bằng `h()` của `web/`, dùng token ở `public/app.css`. Không chép cấu trúc nội bộ của bản mẫu (`support.js`, `<x-dc>`, `sc-for`… là công cụ vẽ, không phải mã app).

## Đọc theo thứ tự

1. `project/00 Tong quan.dc.html`: chỗ vào phân hệ, **9 quyết định thiết kế**, **bảng token** (dòng "MỚI" phải thêm vào `public/app.css`: `--w-doc-chip` = 148px, `--t-reveal` = 10s), và **6 điểm "đoán"** (xem dưới). Dữ liệu các bảng nằm ở cuối tệp (`decisions`, `tokens`, `guesses`).
2. Các màn:
   - `01 Danh sach xe`;
   - `02 Them sua xe`;
   - `03 Chi tiet xe`;
   - `04 Giay to cua mot nguoi` (mục mới trong hồ sơ ở Danh bạ);
   - `05 Giay to cua toi` (trang Tôi);
   - `06 Sap het han`;
   - `07 Trang dau tai xe`.
   Mỗi màn có cỡ 390 và 1040.
3. Khung dùng chung:
   - `vo-dien-thoai`, `vo-may-tinh`: vỏ app vẽ lại, **giữ vỏ thật của app**, chỉ thêm mục mới;
   - `bang-truot`: bảng trượt / hộp thoại;
   - `form-giay-to`: mẫu nhập giấy tờ, dùng chung cho giấy tờ xe và giấy tờ người.
4. `project/github.md`: bản đối chiếu màn ↔ tệp trong repo do Claude Design ghi.

## Chín quyết định thiết kế (tóm tắt từ `00 Tong quan`)

1. "Vận chuyển" là mục cha trên menu dọc (nhóm QUẢN TRỊ, sau Địa điểm), luôn mở sẵn hai mục con "Xe" và "Sắp hết hạn" (có số đếm). Điện thoại: hai dòng liên kết ở trang Tôi. Không dùng tab ngang.
2. Nút chính ("Thêm xe", "Lưu", "Thêm giấy tờ") dính đáy, rộng hết trên điện thoại; góc phải tiêu đề trên máy tính.
3. Thứ tự giấy tờ: đã hết hạn → sắp hết hạn → còn hạn → không hạn.
4. Lịch sử gia hạn mở ngay dưới dòng ("Lịch sử (N)"); dòng cũ nền xám nhạt, nhãn "Đã thay".
5. "Sửa sai" là bảng riêng, nút Lưu khoá tới khi chọn lý do; có chữ nhắc "giấy mới được cấp thì dùng Gia hạn".
6. "Xem đủ số": hộp xác nhận → số hiện đủ 10 giây, đếm ngược "Tự che sau N giây", nút "Che lại". Mỗi lần mở là một lần xem có ghi nhật ký.
7. "Ngừng dùng xe" là nút viền đỏ riêng, kèm hộp xác nhận "không bị xoá". Xe đã ngừng có nút **"Dùng lại xe"**.
8. Số người được chở dùng bộ đếm −/+, kèm gợi ý "Xe 16 chỗ nhập 15."
9. Trang đầu tài xế: khối "Cuốc xe" giữ chỗ ở trên, giấy tờ ở dưới, để lượt 1b chỉ thay nội dung.

## Sáu điểm "đoán" — đã chốt hoặc cần đối chiếu

1. Vỏ app dựng lại từ ảnh: **dùng vỏ thật** (`web/shell.ts`, lớp `.sidebar-*`, `.sheet-*`). Thanh trạng thái 9:41 và vùng an toàn chỉ để minh hoạ.
2. Menu của tài xế (nhóm "CỦA TÔI": Trang chủ, Của tôi); tài xế không có ô tìm kiếm, không có nút Tạo đơn. Chốt theo ADR-0040: đúng, vì tài xế không vào cổng đơn hàng.
3. Biểu tượng xe tải là biểu tượng MỚI (nét 1.8, cùng bộ `web/icons.ts`). Các biểu tượng khác dùng tệp gốc có sẵn.
4. Số CCCD, số GPLX, số điện thoại trong bản vẽ là **hư cấu**, chỉ để minh hoạ; không đưa vào dữ liệu gieo hay test như dữ liệu thật.
5. Khối tóm tắt ở trang đầu tài xế: **điều phối chốt theo đúng bản vẽ**, tức hiện 2 giấy gần hạn nhất, tô màu theo trạng thái (còn hạn xanh, ≤ 30 ngày cát, hết hạn đỏ). Chủ muốn khác thì đổi.
6. Nút Gia hạn / Sửa sai giống nhau với mọi người có quyền ghi giấy tờ; chỉ nút "Xem đủ số" đổi theo quyền. Khớp ADR-0040: cả hai ô đều của Quản trị + Toàn quyền.

## Điểm phần máy chủ phải đáp ứng (đã báo người thi công Phần A)

- Xe "Ngừng" → "Dùng lại xe" (đang dùng); kiểm lại biển số không trùng lúc dùng lại.
- Số đếm giấy tờ sắp hết hạn cho huy hiệu trên menu.
- Lỗi biển số trùng có mã riêng, để hiện đúng câu "Biển số này đang dùng cho xe khác."
- "Sửa sai" bắt buộc lý do.
- "Xem đủ số" là một lần gọi máy chủ có ghi nhật ký; việc tự che sau 10 giây làm ở giao diện.
