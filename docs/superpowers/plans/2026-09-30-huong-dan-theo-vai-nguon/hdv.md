# Nguồn đối chiếu — Hướng dẫn viên (src/shared/huong-dan-hdv.ts), bản 1.40

Đối chiếu trên worktree huong-dan-theo-vai, HEAD 3d0d2fe5, chỉ đọc mã. Đường dẫn tương đối gốc repo. Chữ trong app rút từ bản nháp 04-hdv-va-tai-xe.md (phiên soạn 30/9).

## Điểm chưa chắc / nghi lỗi (cho người kiểm và chủ)

1. **ADR-0017 ("HDV xem mọi đơn kể cả tiền") KHÔNG thi công nguyên dạng.** Mã theo ADR-0030 S23-1/S23-5: FIELD chỉ xem đơn đang phụ trách (`order.view`, `money.view`, `contact.view` = assigned — src/shared/permissions.ts:72-75; chú thích :64-65, :203-205; src/shared/start-page.ts:12). Hàng chờ là phần hẹp: không tiền, không SĐT (src/modules/orders/pool.ts:1-8). Hướng dẫn viết theo mã.
2. **Chưa có "Từ chối" (trả đơn).** Không có nút, không có route (grep "Từ chối" trong web/*.ts, src/modules/dispatch/*.ts rỗng). ADR-0030 xếp vào lượt 2 (docs/adr/ADR-0030-…md:42, :50). Hướng dẫn ghi "(chưa có trên bản 1.40)", bảo gọi văn phòng giao cho người khác.
3. **Chưa có "Đã giao / Hoàn thành".** OrderStatus = draft | confirmed | cancelled (src/shared/contracts.ts:129). Chỉ có chip và nhóm "Đã đi tour".
4. **Sửa số khách sau ngày đi vẫn được (nghi lệch ý chủ).** `myJobActions` cho editPax với mọi đơn confirmed kể cả đã qua ngày đi (src/shared/handler-view.ts:86-89); route handler-money-edit không kiểm ngày đi (src/modules/dispatch/index.ts:229-245; tripDeparted chỉ có ở huỷ :211). Cần chủ xác nhận. Hướng dẫn chỉ nói "hỏi văn phòng trước khi sửa".
5. **Ô lý do sửa số khách là chữ tự do, máy chủ KHÔNG chặn SĐT** (src/modules/orders/money-adjustment.ts:86-87 — chỉ đòi không rỗng), trong khi lý do "Khác" khi huỷ thì bị chặn (src/modules/dispatch/rules.ts:79-85). Đây là lỗ #19 / T3d; ADR-0030 S23-9 định sửa, chưa làm. Hướng dẫn chỉ dặn "không gõ số điện thoại" — dựa vào kỷ luật, không phải hàng rào.
6. HDV nhận được cả đơn "Chờ xác nhận" (pool.ts:79 chỉ lọc đã huỷ / đã qua ngày đi) nhưng không sửa / huỷ được tới khi văn phòng xác nhận (handler-view.ts:87; ghi chú trên thẻ web/viec-cua-toi.ts:534).
7. Trang đầu của HDV là "Đơn hàng" (/orders) nhưng thanh tab điện thoại chỉ có "Tôi" (src/shared/start-page.ts:39-45; web/shell.ts:40, :57-66). Chưa kiểm trên máy thật; có thể gây lúng túng.
8. Chưa kiểm: số tiền trên thẻ đổi ngay sau khi sửa số khách (suy từ việc tải lại danh sách — web/viec-cua-toi.ts:573-577).
9. "Của tôi" vừa là mục menu máy tính (web/shell.ts:242) vừa là ngăn chuông (web/thong-bao-ui.ts:257) — cùng chữ, đúng cả hai chỗ.
10. Câu "Đơn này vừa có người khác nhận phụ trách" trong hướng dẫn là trích rút gọn câu thật (src/shared/handler-view.ts:59).
11. Ví dụ (chị Lan, khách sạn đường Trần Phú, 8 khách) là hư cấu; không mã đơn, không số tiền.

## Nguồn theo quy trình

HDV — quyền, menu, trang đầu
- Bảng quyền cột FIELD: src/shared/permissions.ts:72-75 (order.view/money.view/history/contact = assigned), :76-78 (order.create/modify/trip.edit = none), :88-89 (money.edit, cancel = assigned), :91 (dispatch.claim any), :113 (order.pool.view), :122 (party.document.view own); ORDERS_GATE :211; seesOnlyAssignedOrders :226-229.
- Trang đầu → /orders: src/shared/start-page.ts:10-12, :39-45. Trang Đơn hàng: public/orders.html:6; web/orders.ts:85.
- Thanh tab chỉ có "Tôi": web/shell.ts:40, :57-66; menu máy tính "Của tôi", "Góp ý / Báo lỗi", "Trợ giúp": web/shell.ts:239-244.
- Vị trí "Việc của tôi" trên trang Tôi: public/account.html:10-13; web/account.ts:536.
- Đầu khối, ô Chờ nhận / Đơn của tôi: web/viec-cua-toi.ts:361-409.

HDV — Nhận đơn
- Thẻ hàng chờ, nút "Nhận", "Đang nhận…": web/viec-cua-toi.ts:368-381, :424-430, :475-494.
- Phần hẹp không tên/SĐT/tiền, che số nơi đón: src/modules/orders/pool.ts:1-8; lọc: pool.ts:79.
- Câu thua đua: src/shared/handler-view.ts:58-60; chốt Nhận đơn huỷ / qua ngày: src/modules/dispatch/index.ts:41-42, :167.
- Tài khoản lai Đối tác bị ẩn khối: web/viec-cua-toi.ts:360-361, :461-465.

HDV — Đơn của tôi
- Thẻ, nút Gọi, ba ô tiền, ghi chú đơn nháp, "Xem đơn": web/viec-cua-toi.ts:497-538; dòng Khởi hành / Check-in / Ghi chú: :325-332.
- Chip "Chờ xác nhận / Đã xác nhận / Đã đi tour": src/shared/viec-cua-toi.ts:55-58; src/shared/order-status-label.ts (STATUS_LABEL).
- Nhãn ngày: src/shared/viec-cua-toi.ts:17-24; thứ tự + nhóm "Đã đi tour": :64-76, web/viec-cua-toi.ts:549-552.
- Khi nào hiện nút: src/shared/handler-view.ts:86-89.
- Trang đơn chỉ xem, câu cố định: src/shared/order-view.ts:96-104; web/order.ts:346-349.
- Lỗi mạng: web/viec-cua-toi.ts:371, :386.

HDV — Sửa số khách
- Bảng, "Đóng" / "Xác nhận", "Lý do sửa (bắt buộc)", "Cần nhập lý do sửa.": web/viec-cua-toi.ts:127-220; nút nhanh: src/shared/viec-cua-toi.ts:88.
- Máy chủ: src/modules/orders/money-adjustment.ts:86-87; route: src/modules/dispatch/index.ts:229, :243-245 (chỉ đơn đã xác nhận).

HDV — Huỷ đơn
- Ba lý do, "Giữ đơn", "Huỷ đơn", ô "Khác": web/viec-cua-toi.ts:39-43, :223-300; máy chủ: src/modules/dispatch/rules.ts:71-85.
- Chỉ đơn đã xác nhận, chặn sau ngày đi: src/modules/dispatch/index.ts:36-37, :204-211.
- Không hoàn tác: web/viec-cua-toi.ts:260.

HDV — Thông báo
- Loại tin, câu "Có đơn mới …, chưa có người phụ trách", liên kết /account cho HDV: src/shared/thong-bao.ts:22-44, :78-113; ai thấy tin đơn: src/shared/bang-tin.ts:40-45, :117-121.
- Chuông, ngăn "Của tôi" / "Tất cả", "Đã hiểu": web/thong-bao-ui.ts:28-29, :188, :256-257; web/shell.ts:480.
- Thông báo màn hình khoá: web/account.ts:287, :326-328 (Chia sẻ → Thêm vào MH chính), :347 ("Tắt"), :366 ("Bật thông báo trên điện thoại").
- Nhật ký thay đổi: src/shared/changelog.ts 1.40 (từ dòng 16), 1.33 (từ dòng 98).

Kiểm máy: `node --test src/shared/huong-dan.test.ts` — 8/8 đạt (30/9). A2 đối chiếu mọi [[Tên nút]] với chữ giao diện.
