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
7. **Trang đầu của tài xế** (vai "Tài xế công ty"; lượt 1a)
   - Lời chào + "Giấy tờ của tôi" (tóm tắt hạn).
   - Một chỗ trống ghi "Cuốc xe của bạn sẽ hiện ở đây" (lượt 1b mới có cuốc xe).

## Dùng khuôn sẵn (không cần vẽ, trừ khi chủ muốn)

- Danh mục "loại giấy tờ xe", "loại giấy tờ của người", "hạng giấy phép lái xe": theo khuôn màn Danh mục / Địa điểm hiện có.
- Tạo tài khoản tài xế: màn Quản lý tài khoản hiện có, chỉ thêm vai "Tài xế" vào danh sách vai.

## Nơi vẽ và đoạn yêu cầu dán vào Claude Design

- Vẽ trong dự án Claude Design có sẵn **"Tour Đảo Booking Design System"** (`https://claude.ai/design/p/34f284df-c97a-4672-bb66-d7df03a0d97a`). Dự án này đã có màu, chữ, 15 thành phần và mẫu màn (chủ chọn 28/9; không chạy đồng bộ mới vì app không viết bằng React).
- Đoạn yêu cầu (chép nguyên văn):

> Dùng hệ thiết kế của dự án này: màu, chữ, và các thành phần Card, Button, Chip, Badge, Field, Sheet, Sidebar, TabBar, Banner. Vẽ phân hệ "Vận chuyển" cho app Tour Đảo Booking. Mỗi màn vẽ hai cỡ: điện thoại rộng 390 (có TabBar) và máy tính rộng 1040 (có Sidebar, thêm mục "Vận chuyển"). Chữ tiếng Việt có dấu; không hiện mã kỹ thuật; ô nhập cỡ chữ 16px. Dữ liệu mẫu thực tế: xe 16 chỗ biển 79B-012.34, xe 7 chỗ biển 79A-345.67, tài xế Nguyễn Văn An.
> 1. Danh sách xe: mỗi xe hiện biển số, tên/đời xe, số người được chở, trạng thái (Đang dùng / Bảo dưỡng / Ngừng), dấu cảnh báo khi có giấy tờ sắp hết hạn hoặc đã hết hạn; lọc theo trạng thái; nút "Thêm xe".
> 2. Thêm / sửa xe: biển số, số khung, tên/đời xe, "Số người được chở (không kể tài xế)" với gợi ý "xe 16 chỗ nhập 15", trạng thái; nút Lưu và nút "Ngừng dùng" (không xoá).
> 3. Chi tiết một xe: danh sách giấy tờ xe (Đăng ký, Kiểm định, Bảo hiểm TNDS, Phù hiệu xe hợp đồng, Giám sát hành trình, Camera người lái) với số, ngày cấp, ngày hết hạn, "còn N ngày"; nút "Gia hạn" (thêm dòng mới, giữ dòng cũ làm lịch sử), nút "Sửa sai" (chọn lý do); xem lịch sử gia hạn.
> 4. Giấy tờ của một người (một mục trong hồ sơ người ở Danh bạ): CCCD, Giấy phép lái xe (có hạng, ví dụ D2), Khám sức khoẻ, Tập huấn nghiệp vụ. Số luôn che dạng ••••1234; nút "Xem đủ số" có câu xác nhận "Việc xem sẽ được ghi nhật ký"; thêm / gia hạn / sửa sai.
> 5. "Giấy tờ của tôi": nhân viên, tài xế tự xem giấy tờ của mình, số che, "còn N ngày".
> 6. "Giấy tờ sắp hết hạn": gộp giấy tờ xe và tài xế, xếp theo ngày hết hạn gần nhất, mốc 30 ngày; giấy đã hết hạn tô đỏ; bấm một dòng mở xe hoặc hồ sơ người.
> 7. Trang đầu của tài xế: lời chào, tóm tắt "Giấy tờ của tôi", và một khung trống ghi "Cuốc xe của bạn sẽ hiện ở đây".

## Lưu ý khi vẽ

- Giữ bảng màu, cỡ chữ, khoảng cách của app hiện tại (token ở đầu `public/app.css`). Ô gõ cỡ chữ 16px để iPhone không phóng to.
- Mọi chữ tiếng Việt có dấu, không lộ mã kỹ thuật (ví dụ không hiện "DRIVER", "vc_vehicle").
