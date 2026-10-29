Nút `.nut` một lớp gốc, biến thể bằng thuộc tính: `data-cap="chinh|phu|loi"`, `data-co="lon"`, `data-tong="san-ho|nguy-hiem"`; cao `h-control` 44 (lớn `h-control-lon` 52), đệm `pad-nut`, bo `bo-control`, chữ `fs-ui` 16 / `fw-semibold`.

**Trong mã:** khối «Thành phần chung v2» của `public/app.css`; dùng ở khung, trạng thái hệ thống (`web/trang-thai-he-thong.ts`), dải (`web/dai.ts`), hai trang mới. Lớp cũ `.btn*` còn ở các trang chưa chuyển (Chặng 3).

## Khi nào dùng
- `chinh` — một việc chính của màn (Lưu chuyến, Thử lại). Tối đa một nút chính mỗi vùng.
- `phu` — việc kèm (Quay lại, Xem, Lọc), nền `c-btn-soft-bg`.
- `loi` — lối chữ trong bảng, thẻ (Mở, Xem chi tiết).
- `data-tong="san-ho"` — hành động chốt (Xác nhận đơn, Tạo đơn); `data-tong="nguy-hiem"` — chỉ trong hộp xác nhận một chiều.
- `data-co="lon"` — nút chính ở chân dính và bảng trượt điện thoại.

## Trạng thái
Rê chuột (chỉ khi `hover: hover`) · tiêu điểm vành `focus-ring` 3 px `c-focus` cách `vanh-cach` 2 · tắt `[disabled]` kèm `data-ly-do` (lý do vì sao tắt) · đang gửi `data-ban="true"`; cả hai mờ 50 %.

## Người dùng truyền gì
Nhãn là động từ của việc («Lưu chuyến», không «OK»); biểu tượng 20 trước chữ khi cần (`icon(name, 20)`).

## Đừng
Không hai nút chính cạnh nhau; không dùng `nguy-hiem` ngoài hộp xác nhận.

## Lệch đã biết (nợ trong mã, chưa sửa)
`<a class="nut">` bị gạch chân vì `.nut` chưa có `text-decoration: none` (thấy ở trang 404/403/lỗi máy chủ) — BACKLOG `B-NUT-LIEN-KET-GACH-CHAN`.
