# 06 — BINDING MAP (bước 6: khung trang và ánh xạ dữ liệu)

> Template rỗng, chỉ điền trong `project/`. Đây là tiền điều kiện cứng của mọi việc thiết kế: chưa có file này thì cấm vào bước 7 (N1, cổng Design). Mỗi vùng trên mỗi loại trang phải khai rõ nó ăn dữ liệu từ đâu; vùng nào không trỏ được về một field thật là vùng vẽ bừa.

## Với mỗi loại trang, một bảng

### Trang: [tên loại trang, trỏ mẫu URL ở 05]

| Vùng giao diện | Dữ liệu nuôi (entity.field) | Bắt buộc? | Khi rỗng thì hiện gì | Ghi chú |
|---|---|---|---|---|
| Hero | | | | |
| | | | | |

## Quy tắc chung
- Mọi field xuất hiện ở đây phải tồn tại trong 01-CONTENT_MODEL. Cần field mới: quay lại sửa content model trước, không bịa tại đây.
- Trạng thái rỗng và trạng thái lỗi là một phần của bản ánh xạ, không phải việc để Design tự nghĩ.
- Phần tử trang trí thuần (không mang dữ liệu) ghi rõ "decor" để khỏi tranh cãi.

## Điều kiện mở cổng Design
Chủ dự án xác nhận: mọi loại trang trong cây URL đều có bảng ánh xạ, không vùng nào mồ côi dữ liệu.
