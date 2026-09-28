# Vận chuyển lượt 1a — các màn cần vẽ trên Claude Design

- **Ngày:** 2026-09-28. **Căn cứ:** ADR-0040 (chủ duyệt 28/9, "Về giao diện, vẽ trên Claude Design").
- **Cách dùng:** chủ vẽ từng màn dưới đây trên Claude Design, ở hai cỡ: điện thoại (rộng 390) và máy tính (rộng 1040). Vẽ xong gửi link, rồi làm đúng bản vẽ (tiền lệ trang Đăng nhập). Màn nào ghi "dùng khuôn sẵn" thì không cần vẽ, trừ khi chủ muốn.
- **Ai thấy gì:**
  - Quản trị và Super Admin thấy mục **"Vận chuyển"** trên menu.
  - Tài xế chỉ thấy Trang chủ và Tài khoản.
  - Các vai khác không thấy Vận chuyển.

## Màn cần vẽ

1. **Danh sách xe**
   - Mỗi xe: biển số, tên/đời xe, số người được chở, trạng thái (đang dùng / bảo dưỡng / ngừng).
   - Có dấu cảnh báo khi xe có giấy tờ sắp hết hạn hoặc đã hết hạn.
   - Lọc theo trạng thái. Nút "Thêm xe".
2. **Thêm / sửa xe**
   - Ô: biển số, số khung, tên/đời xe, số người được chở không kể tài xế (gợi ý nhỏ: "xe 16 chỗ nhập 15"), trạng thái.
   - Nút Lưu. Nút "Ngừng dùng": xe không bị xoá, chỉ chuyển sang "ngừng".
3. **Chi tiết một xe, kèm giấy tờ xe**
   - Danh sách giấy tờ theo loại: loại, số, ngày cấp, ngày hết hạn, còn bao nhiêu ngày.
   - Nút "Gia hạn": thêm một dòng mới, giữ dòng cũ làm lịch sử.
   - Nút "Sửa sai": chọn lý do từ danh sách.
   - Xem lịch sử các lần gia hạn.
4. **Giấy tờ của một người** (trong hồ sơ người ở Danh bạ)
   - CCCD, giấy phép lái xe (có hạng), khám sức khoẻ, tập huấn nghiệp vụ.
   - Số luôn che, ví dụ `••••1234`.
   - Nút "Xem đủ số" chỉ hiện với người có quyền, có câu xác nhận vì mỗi lần xem đều ghi nhật ký.
   - Thêm / gia hạn / sửa sai như giấy tờ xe.
5. **"Giấy tờ của tôi"** (nhân viên, tài xế tự xem)
   - Danh sách giấy tờ của chính mình, số che, hạn còn bao nhiêu ngày.
6. **Giấy tờ sắp hết hạn**
   - Gộp giấy tờ của xe và của tài xế, xếp theo ngày hết hạn gần nhất.
   - Mốc mặc định 30 ngày; giấy đã hết hạn tô đỏ.
   - Bấm một dòng thì mở xe hoặc hồ sơ người tương ứng.
7. **Trang đầu của tài xế** (lượt 1a)
   - Lời chào + "Giấy tờ của tôi" (tóm tắt hạn).
   - Một chỗ trống ghi "Cuốc xe của bạn sẽ hiện ở đây" (lượt 1b mới có cuốc xe).

## Dùng khuôn sẵn (không cần vẽ, trừ khi chủ muốn)

- Danh mục "loại giấy tờ xe", "loại giấy tờ của người", "hạng giấy phép lái xe": theo khuôn màn Danh mục / Địa điểm hiện có.
- Tạo tài khoản tài xế: màn Quản lý tài khoản hiện có, chỉ thêm vai "Tài xế" vào danh sách vai.

## Lưu ý khi vẽ

- Giữ bảng màu, cỡ chữ, khoảng cách của app hiện tại (token ở đầu `public/app.css`). Ô gõ cỡ chữ 16px để iPhone không phóng to.
- Mọi chữ tiếng Việt có dấu, không lộ mã kỹ thuật (ví dụ không hiện "DRIVER", "vc_vehicle").
