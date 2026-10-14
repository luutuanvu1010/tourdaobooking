# Nhật ký thi công: menu máy tính theo việc (15/10/2026)

## Task 1 — Hướng dẫn viên thấy mục Đơn hàng (ADR-0017)

- Bước 5 (kiểm route thật): trang `/orders` của hướng dẫn viên chỉ gọi `GET /api/orders`, nên chỉ hiện đơn mình phụ trách. Đơn tự do (`GET /api/orders/pool`) chỉ nằm ở khối "Đơn chờ nhận" trang Của tôi (`web/viec-cua-toi.ts`).
- Quyết định của người điều phối 15/10 (hướng 1): mục Đơn hàng của FIELD = đơn mình phụ trách; đơn tự do ở Của tôi › Đơn chờ nhận. KHÔNG thêm khối nào vào `/orders`.
- Sửa: `TRANG.donHang.hien` = `canAccessOrders` (thay cả biểu thức `coMucDonHang(...)` vì cổng "orders" là tập cha của nó — 1024 tập quyền xanh; viết `|| canAccessOrders(s)` làm gói trang Đơn hàng vượt trần 96000 byte đúng 1 byte, bài `goi-trang-nhe` đỏ, nên rút gọn thay vì nới trần); khung tạm (`tam`) giữ nguyên (thiếu cờ FIELD một nhịp, ADR-0035).
- Bài phải sửa: `tests/audit/muc-hien-mo-duoc-khung.mjs` bỏ dòng DUOC_MA_AN "HDV chỉ-FIELD không thấy mục Đơn hàng" (dòng "chờ chủ" nay đã được chủ quyết, giữ nguyên dòng thanh-tren). Không nới bài bảo vệ quyền nào.
- Ảnh chụp `src/muc-giao-dien-hien-trang.json` chụp lại: ngoài mục Đơn hàng cho tập có FIELD, còn thêm mục "Điều chỉnh công nợ" (ADR-0115, commit 8d9e6cbc) vì ảnh cũ đã lỗi thời so với mã; trường `nguon` thành "cây làm việc".
