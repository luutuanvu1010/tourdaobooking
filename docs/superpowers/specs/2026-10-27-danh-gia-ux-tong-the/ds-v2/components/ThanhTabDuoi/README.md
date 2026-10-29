Thanh tab dưới `#tabbar` cho khổ ≤ 899 (gồm iPad dọc — cổng 2b chọn B): 4–5 mục theo bộ quyền, mục `.tab` = biểu tượng trong `.tab-icon` + nhãn 12; mục đang mở `aria-current="page"` có viên `c-tab-active-bg` quanh biểu tượng, chữ `c-tab-active-text` / `fw-heavy`; «Tạo đơn» `.tab-new` là vòng tròn san hô `c-tab-new-bg`.

**Trong mã:** `web/shell.ts` `tabBar`; danh sách và điều kiện ở `THANH_TAB` (`src/shared/muc-giao-dien.ts`). Ẩn khi chân dính đang hiện (`body.tabbar-dinh`) hoặc khi trang tự ẩn (`datThanhTab(false)` → `body.tabbar-an`). Bản xem trước vẽ lại bằng lớp riêng của bộ.

## Theo bộ quyền
Toàn quyền, Quản trị: Trang chủ · Đơn hàng · **Tạo đơn** · Thiết lập (`settings`) · Tôi. Kế toán: Trang chủ · Đơn hàng · Sổ công nợ · Tôi. Bán hàng: Trang chủ · Đơn hàng · **Tạo đơn** · Danh bạ · Tôi. Thực tập, Đối tác: Đơn hàng · **Tạo đơn** · Hỗ trợ · Tôi. Hướng dẫn viên: Đơn hàng · Hỗ trợ · Hướng dẫn · Tôi. Nhân sự: Tài khoản · Hỗ trợ · Hướng dẫn · Tôi. Tài xế công ty: Trang chủ · Cuốc của tôi · Hỗ trợ · Tôi. Tài xế đối tác: thêm Báo bận.

## Đừng
Trang không thuộc mục nào (403, 404…) thì không sáng mục nào, không mượn «Tôi».
