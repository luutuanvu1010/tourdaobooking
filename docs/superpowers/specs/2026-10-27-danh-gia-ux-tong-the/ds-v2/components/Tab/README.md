Tab phụ trong trang `.tab-phu` (`role="tablist"`, mục `role="tab"` + `aria-selected`), hai kiểu: `data-kieu="gach"` — gạch chân `h-tab-gach` 3 px `c-primary` dưới mục đang chọn; `data-kieu="vien"` — viên cuộn ngang, mờ hai mép `w-tab-mo-mep` 32.

**Trong mã:** khối «Thành phần chung v2» của `public/app.css`. (Lớp `.tab` trong mã là mục của thanh tab dưới `#tabbar`, không phải thành phần này.)

## Khi nào dùng
Gạch chân: chia phần trong một trang chi tiết (Thông tin · Dịch vụ · Thanh toán). Viên: danh sách ngắn cuộn ngang ở điện thoại (tháng, nhóm).

## Trạng thái
Đang chọn · bình thường · tiêu điểm vành `c-focus`. Mục cao `h-control` 44, đệm `pad-tab` (viên: `pad-chip`).

## Đừng
Không dùng tab phụ thay điều hướng chính (đó là thanh tab dưới / thanh bên).
