# Nguồn đối chiếu — Hướng dẫn vai Kế toán (bản 1.40)

Nội dung hiển thị: `src/shared/huong-dan-ke-toan.ts` (HD_KE_TOAN). Đối chiếu trên worktree huong-dan-theo-vai, gốc main 3d0d2fe5. Số dòng kiểm bằng `grep -n` ngày 2026-09-30. Tệp này chỉ dành cho người soạn và người kiểm, không hiển thị cho người dùng.

## Tệp:dòng theo từng mục

- Bản đồ quyền cột ACCOUNTING: src/shared/permissions.ts:72-78 (order.view/money.view/history/contact any; order.create/modify/trip.edit none), :81 short_notice none, :85 short_notice.view any, :88 order.money.edit any (nhưng route duy nhất chặn — src/modules/dispatch/index.ts:230-239), :90-91 assign/claim none, :93-96 payment.*/invoice.* any nhưng KHÔNG route nào dùng (grep chỉ khớp permissions.ts; permissions.ts:59-60 ghi "chưa có route"), :97-98 party.view/write any, :136-138 trip.view any, trip.dispatch/override none, :142 trip.progress none.
- Cổng: OFFICE_GATE permissions.ts:206 (có ACCOUNTING → Danh bạ), ORDERS_GATE :211.
- Menu máy tính (mục "Menu của bạn"): web/shell.ts:197 (Trang chủ), :199 (Đơn hàng + huy hiệu đơn chưa xác nhận), :200 (Tạo đơn chỉ khi order.create), :201 (Danh bạ khi isOffice), :216-221 (Vận chuyển › Điều phối xe khi trip.view — src/shared/dieu-phoi-man.ts:26-28), :242-244 (Của tôi, Góp ý / Báo lỗi, Trợ giúp); :470-474 cờ admin/seesAll/office/canCreate.
- Menu điện thoại: web/shell.ts:46-67 (tabsFor: Trang chủ, Đơn hàng, Tạo đơn nếu canCreate, Tôi). Ô tìm thanh trên: web/shell.ts:431 (placeholder "Tìm mã đơn, tên khách, SĐT…").
- Trang Tôi: web/account.ts:43 (Danh bạ), :52-53 (Góp ý / Báo lỗi, Trợ giúp), :72 (VẬN CHUYỂN), :76 (Điều phối xe).
- Trang chủ: web/home.ts:79-81 (ba ô Còn thiếu tiền / Đơn chờ xác nhận / Chưa có người phụ trách), :38 ("Chưa có đơn nào tuần này"); public/index.html:18 (Doanh thu của tôi), :23 (Chuyến đón hôm nay); phạm vi "của tôi" = staff_id người xem: src/modules/orders/repository.ts:533-537 (chú thích) và câu SQL :659 `staff_id = ?1`; "Còn thiếu tiền" toàn công ty ~:610-627.
- Tìm và lọc đơn: public/orders.html:8 (ô tìm), :10 (Mọi trạng thái/Chờ xác nhận/Đã xác nhận/Đã huỷ), :18 (Tải thêm); web/orders.ts:27-31 (chỉ q + status), :198 (nút + Tạo đơn ẩn khi không order.create); src/modules/orders/index.ts:458-489 (GET /api/orders: không có tham số ngày).
- Xem tiền của một đơn: web/order.ts:247-257 (MÃ ĐƠN, ĐÓN, KHÁCH, SỐ KHÁCH, CÒN LẠI), :275-276 (dòng lập bởi, dòng khoá), :306-312 (khối Thanh toán), :328-338 (Lịch sử + detail), :349 (câu không quyền — src/shared/order-view.ts:103), orderActions src/shared/order-view.ts:107-113; canModify từ máy chủ src/modules/orders/index.ts:545.
- Biên nhận: web/order.ts:363 (Xem biên nhận); web/confirmation-dialog.ts:155 (Tải ảnh PNG), :160 (tiêu đề Xác nhận đơn để gửi khách), :218 (Chia sẻ), :200 (Thử lại).
- Điều phối xe: public/dieu-phoi.html (nút ‹ ›, + Chuyến mới ẩn); web/dieu-phoi.ts:8 (Kế toán chỉ xem), :43 (cờ trip.dispatch), :122 (ba thẻ Chưa xếp / Xe / Cần xử lý), :304 (dải "Chỉ xem — Kế toán không xếp xe, không phá lệ."); web/chuyen.ts:31-34 (không nút tiến độ cho Kế toán). Chưa dùng cho chuyến thật: src/shared/changelog.ts:46.
- Danh bạ: public/parties.html:16 (Tìm, + Hồ sơ mới — không gắn điều kiện quyền, web/parties.ts:541); party.write any cho ACCOUNTING permissions.ts:98; hồ sơ gắn tài khoản chỉ Quản trị permissions.ts:99.
- Sổ tiền / thu tiền / hoá đơn: không có route (grep payment.receive|refund|invoice.* chỉ khớp permissions.ts); migrations tới 0043, không có bảng sổ tiền; changelog 1.39/1.40 (src/shared/changelog.ts:15-35) không nhắc sổ tiền. Không có xuất tệp cho đơn (csv chỉ ở catalog/staff sheet).
- Quên PIN / Face ID: web/account.ts:167 ("Quên PIN? Đặt PIN mới bằng Face ID"), :256-263. Thông báo điện thoại: web/account.ts:287.
- Chuông: src/shared/thong-bao.ts:34-41 (các loại tin đơn: lập, chờ nhận, nhận, giao, xác nhận, huỷ).

## Điểm chưa chắc / nghi lỗi

- **Danh bạ:** theo bảng quyền Kế toán thêm/sửa được hồ sơ không gắn tài khoản; nút "+ Hồ sơ mới" không ẩn theo quyền. Chưa kiểm từng nút bằng tài khoản Kế toán thật.
- **Chuông thông báo:** chưa kiểm chi tiết Kế toán nhận những loại tin nào (bộ lọc người nhận ở src/shared/thong-bao.ts). Hướng dẫn chỉ nói chung.
- **Điều phối xe chưa dùng thật:** lấy từ nhật ký thay đổi 1.38; chưa kiểm hiện trạng vận hành.
- **Ô order.money.edit = any cho ACCOUNTING** nhưng route duy nhất (`POST /api/orders/:id/handler-money-edit`) cố ý từ chối Kế toán (dispatch/index.ts:234-239). Hướng dẫn ghi "không sửa được tiền sau xác nhận". Có route sửa tiền cho Kế toán thì phải sửa hướng dẫn.
- **Sổ tiền (thu/hoàn/hoá đơn):** đã duyệt thiết kế, chưa có route/bảng trên 1.40 — ghi "(chưa có trên bản 1.40)". Khi sổ tiền lên production, viết lại mục "Tình huống hay gặp" và "Điều bạn không làm được".
- **Ô tìm kiếm:** không dùng [[...]] cho chữ gợi ý vì hai nơi khác nhau ("Tìm mã đơn, tên khách, SĐT…" ở thanh trên, "Tìm mã đơn, tên, SĐT…" ở trang Đơn hàng).
- **Mũi tên đổi ngày ở Điều phối xe** là ký tự ‹ › (aria-label "Ngày trước"/"Ngày sau"); hướng dẫn tả bằng lời, không đóng ngoặc.
