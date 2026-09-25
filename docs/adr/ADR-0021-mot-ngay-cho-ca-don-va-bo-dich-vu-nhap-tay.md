# ADR-0021 — Một ngày khởi hành cho cả đơn; ẩn "Dịch vụ nhập tay" ở form Tạo đơn

- **Trạng thái:** **accepted** — chủ dự án quyết trực tiếp trong phiên chat 2026-09-25 (câu 2 và 3 sau bản 1.11): *"Cả đơn chỉ có 1 ngày duy nhất"*, *"Ẩn trong mọi trường hợp"*. AI ghi lại, không tự quyết.
- **Ngày:** 2026-09-25   **Loại:** cửa hai chiều (chỉ giao diện; không migration, không đổi API).

## Quyết định
1. **Một ngày cho cả đơn.** Form Tạo/sửa đơn có một ô "Chọn ngày" ở đầu; thẻ dịch vụ **không còn** ô ngày khởi hành riêng. Mọi dịch vụ của đơn mang cùng ngày đó. Đơn cũ mà các dịch vụ khác ngày: form để trống ô và không cho lưu tới khi chọn một ngày.
2. **Ẩn nút "+ Dịch vụ nhập tay" trong mọi trường hợp** (kể cả khi danh mục trống/không tải được). Dịch vụ nhập tay đã lưu trên đơn cũ vẫn hiện và sửa được.

## Sửa gì của quyết định cũ
- Đặc tả A1/A2 (`docs/superpowers/specs/2026-09-19-a2-giao-dien-design.md` §5.1): "thông tin chuyến theo từng dịch vụ" — nay **ngày khởi hành** là của cả đơn; các ô chuyến khác (giờ, điểm đón, check-in, ghi chú) vẫn theo từng dịch vụ.
- Lối dự phòng "danh mục trống → thêm dịch vụ nhập tay" bị bỏ: danh mục trống thì báo quản trị viên.

## Chưa làm (việc sau, cần chủ duyệt nếu làm)
- Dữ liệu vẫn lưu ngày **theo từng dịch vụ**; máy chủ **chưa** chặn đơn có hai ngày khác nhau (API cũ, bảng "Sửa thông tin chuyến" của đơn đã xác nhận vẫn sửa ngày riêng từng dịch vụ). Ép ở máy chủ = đổi luật dữ liệu, cần ADR/đặc tả riêng.
- Máy chủ vẫn nhận dịch vụ nhập tay (chỉ giao diện ẩn nút).
