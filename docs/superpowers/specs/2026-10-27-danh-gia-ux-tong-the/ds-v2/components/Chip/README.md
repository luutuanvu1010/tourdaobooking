Chip `.vien` là lựa chọn **bấm được**: cao `h-control` 44, đệm `pad-chip`, bo `radius-pill`, chữ `fs-label` 14; đang chọn `aria-pressed="true"` nền `c-primary-soft`, chữ `c-primary-strong`, viền `c-primary`.

**Trong mã:** khối «Thành phần chung v2» của `public/app.css` (tên lớp `.vien`, không phải `.chip`). Bảy họ chip cũ giữ tới Chặng 3.

## Khi nào dùng
Hàng nhóm dịch vụ «Tất cả · Tour · Vé Hòn Tằm…», viên ngày «Hôm nay · Ngày mai», chip đang lọc dưới ô tìm (xem TimLoc). Hàng dài cuộn ngang thì dùng Tab kiểu viên (`.tab-phu[data-kieu=vien]`, có mờ mép).

## Trạng thái
Bình thường · đang chọn (`aria-pressed`) · tiêu điểm vành `c-focus`.

## Người dùng truyền gì
Nhãn 1–3 từ; chip xoá lọc cần `aria-label` («Bỏ lọc Chờ xác nhận»).

## Đừng
Không dùng chip để hiện trạng thái (đó là HuyHieu).
