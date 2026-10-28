repo: luutuanvu1010/tourdaobooking
branch: main

## Last sync
date: 2026-10-28T05:07:19Z

### Updated in this project
- Khung chung (thanh trên, thanh tab, thanh bên 5 nhóm) vẽ lại theo bảng mục `src/shared/muc-giao-dien.ts`
- Năm khuôn trang lấy trường và khối từ trang đang chạy (Đơn hàng, Chi tiết đơn, Chuyến mới, Dịch vụ & giá, Trang chủ)
- Ảnh hiện trạng chép từ `docs/evidence/2026-10-27-danh-gia-ux-tong-the/anh/` vào `hien-trang/`

## Screen map
| Màn trong dự án | Tệp trong kho |
|---|---|
| Khung chung.dc.html (bản vẽ K1–K6, T1–T5, bảng token) | src/shared/muc-giao-dien.ts, docs/evidence/2026-10-27-danh-gia-ux-tong-the/ |
| KhungApp.dc.html (thanh trên, thanh tab, thanh bên, dải, lớp phủ) | web/shell.ts, src/shared/muc-giao-dien.ts, web/maintenance-screen.ts, public/login.html, public/app.css |
| ThanDanhSach.dc.html (Đơn hàng) | web/orders.ts, public/app.css |
| ThanChiTiet.dc.html (Chi tiết đơn) | public/order.html, web/order.ts, web/order-services.ts |
| ThanBieuMau.dc.html (Tạo / sửa chuyến) | web/chuyen-sua.ts |
| ThanThietLap.dc.html (Dịch vụ & giá) | public/catalog.html, web/catalog.ts |
| ThanBangDieuKhien.dc.html (Trang chủ) | web/home.ts |
| ib-icon.js (biểu tượng) | web/icons.ts (qua HINH của bộ thiết kế) + alertCircle MỚI |
