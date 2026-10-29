Trang lỗi dùng khuôn `.trang-thai[data-loai]`: vòng hình 56 + câu tiêu đề + câu phụ (nếu có) + một nút. `403` (hình `lock`), `404` (`alertCircle`), `thieu-ma`, `loi-may-chu` (`alertCircle`, vòng tông đỏ `c-danger-soft`).

**Trong mã:** `trangThaiHeThong` / `trangThaiToanTrang` ở `web/trang-thai-he-thong.ts`; chữ ở `src/shared/trang-thai-he-thong-chu.ts`. 403/404 không sáng mục nào ở thanh tab / thanh bên và bỏ ô tìm của thanh trên.

## Câu (nguồn duy nhất trong mã)
404 «Không có trang này.» + «Địa chỉ có thể đã đổi hoặc gõ sai.» · 403 «Bạn không có quyền xem trang này.» · thiếu mã «Thiếu mã … Mở từ danh sách để xem đúng …» · lỗi máy chủ: thông điệp của máy chủ, hết giờ «Máy chủ không trả lời trong 45 giây.». Nút: «Về trang đầu của bạn» hoặc «Thử lại».

## Lệch đã biết
Nút là `<a class="nut">` nên đang bị gạch chân (BACKLOG `B-NUT-LIEN-KET-GACH-CHAN`).
