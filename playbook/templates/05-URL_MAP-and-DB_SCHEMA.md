# 05 — URL MAP và DB SCHEMA (bước 5: cấu trúc IA và schema)

> Template rỗng, chỉ điền trong `project/`. Cây địa chỉ và xương dữ liệu phải chốt trước khi nghĩ tới khung trang (P1, P3). Cowork soạn, chủ dự án duyệt.

## 1. Cây URL

| Mẫu URL | Loại trang | Entity nguồn | Ghi chú (canonical, redirect) |
|---|---|---|---|
| / | trang chủ | | |

Quy ước bắt buộc khai rõ:
- Quy tắc slug (nguồn sinh slug duy nhất, cấm sửa tay hai nơi).
- Prefix theo loại nội dung và theo ngôn ngữ (nếu đa ngôn ngữ: cấm trộn ngôn ngữ trong một cây, hreflang hai chiều).
- Trang nào index, trang nào noindex.

## 2. Schema dữ liệu

Với mỗi entity (phải khớp 01-CONTENT_MODEL, không định nghĩa lại):

| Field | Kiểu lưu trữ | Ràng buộc / index | Map sang structured data (schema.org) |
|---|---|---|---|
| | | | |

## 3. Quan hệ và toàn vẹn
Khóa tham chiếu nào, xóa cha thì con ra sao, bất biến nào kiểm bằng script (trỏ mã R trong 04-CONSTRAINTS).

## 4. Di trú
Mọi thay đổi schema từ đây trở đi đi qua migration có đánh số; migration phá hủy dữ liệu là cửa một chiều, cần ADR.
