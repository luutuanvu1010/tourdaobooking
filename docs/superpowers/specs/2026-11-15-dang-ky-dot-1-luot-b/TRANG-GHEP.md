# Trang ghép — đợt 1 lượt B đăng ký: ADR-0209, ADR-0210

> **Đề xuất, chờ chủ duyệt** cùng hai ADR. Bắt buộc theo `CLAUDE.md` §9 (hai quyết định chạm quyền, dữ liệu, tiền). Hồ sơ có ngày. Cột quyền: SALES · ACCOUNTING · ADMIN · FIELD · PARTNER · SUPER_ADMIN · INTERN · DRIVER · DRIVER_PARTNER · HR · SALES_MANAGER. Tên giữ chỗ.

## (1) Bảng chứa gì

| Bảng / view | Hôm nay | ADR | Đổi gì | Điều phải canh |
|---|---|---|---|---|
| `prc_party_tier` (cấp riêng) | cấp riêng do Kế toán, Quản trị, Toàn quyền gán cho từng đối tác | 0209 | thêm **nguồn**: lô duyệt phiếu đăng ký ghi một dòng | câu đứng sau câu mở vai trò; không ghi đè cấp riêng đang có |
| **chính sách cấp mặc định (mới, `pricing`)** | — | 0209 | mỗi loại đối tác một cấp hoặc «không đặt», có ngày hiệu lực, chỉ thêm | chỉ `pricing` ghi; cấp phải đang bật lúc đặt |
| `pty_verification` | kết quả xác minh từng mục | 0210 | không đổi bảng; nay được **đọc** để tính dấu | — |
| **mục bắt buộc để xác minh (mới, `parties`)** | — | 0210 | danh sách mục theo loại hồ sơ; phiếu đăng ký đọc qua view | một danh sách, một nơi (thay cụm tương ứng ở ADR-0206 Đ3) |
| **view trạng thái xác minh (mới, `parties`)** | — | 0210 | khoá hồ sơ + một trong ba trạng thái | không dữ liệu cá nhân; không luật đơn, tiền, đăng nhập nào đọc |

## (2) Dòng bản đồ quyền

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SUPER | INTERN | DRIVER | DRV_P | HR | SM | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **(mới)** đặt cấp mặc định | none | none | any | none | none | any | none | none | none | none | any | khuôn `quanLyBanHang()`; ô đầu tiên của Quản lý bán hàng chạm điều khoản thương mại |
| **(mới)** đặt mục bắt buộc xác minh | none | none | none | none | none | any | none | none | none | none | none | khuôn `chiToanQuyen()` |
| `partner.commission.write` (đã có) | none | any | any | none | none | any | none | none | none | none | none | **không đổi**; Kế toán vẫn đổi cấp riêng từng đối tác |
| `account.view` (đã có) | none | none | any | none | none | any | none | none | none | any | none | nay thấy thêm dấu xác minh |
| `party.view` (đã có) | any | any | any | none | none | any | none | none | none | none | none | nay thấy thêm dấu xác minh |

## (3) Cổng nào canh cửa nào, và chỗ giao diện đổi

- Đặt cấp mặc định: route cổng `office`, thân hỏi ô mới. Quản lý bán hàng qua cổng `office` nhờ quyền Bán hàng đi kèm (ADR-0169).
- Xem dấu: theo đúng cổng và ô của ba màn (Tôi, Quản lý tài khoản, Danh bạ); không route mới để đọc dấu riêng.
- **Giao diện đổi nghĩa:** màn hẹp của Quản lý bán hàng có thêm lối vào khối cấp mặc định; danh sách tài khoản và Danh bạ có thêm một cột dấu.

## (4) Ghép

- Cả hai đứng trên lô duyệt của ADR-0207: 0209 thêm một câu, 0210 cần lô ghi kết luận đạt cho mọi mục bắt buộc.
- 0210 thay cụm «danh sách mục bắt buộc theo loại phiếu» ở ADR-0206 Đ3 cho phần mục xác minh.
- Đợt 2 (tổ chức) đặt mục bắt buộc cho tổ chức và cấp mặc định gắn hồ sơ công ty. Đợt 5 cho tài khoản cũ tự nộp giấy tờ để đổi dấu.
- Lỗ đang hở: HC-5.19 (cả hai ADR ghi, kèm lý do).
