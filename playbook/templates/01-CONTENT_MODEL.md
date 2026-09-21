# 01 — CONTENT MODEL (bước 1: phạm vi và mô hình nội dung)

> Template rỗng, chỉ điền trong `project/`. Đây là nguồn sự thật duy nhất cho mọi entity và field của dự án: không entity hay field nào được tồn tại trong code mà không có ở đây trước (P4, P6). Cowork soạn, chủ dự án duyệt.

## 1. Danh mục entity

| Entity | Mô tả một dòng | Số lượng dự kiến | Nguồn sự thật của dữ liệu |
|---|---|---|---|
| | | | |

## 2. Field theo entity

Với mỗi entity, một bảng:

| Field | Kiểu | Bắt buộc? | Bất biến / quy tắc | Ai cung cấp |
|---|---|---|---|---|
| | | | | |

## 3. Quan hệ giữa entity
Sơ đồ hoặc bảng: entity A quan hệ gì với entity B, một chiều hay hai chiều, qua field nào.

## 4. Bất biến dữ liệu (nháp cho 04-CONSTRAINTS)
Liệt kê các quy tắc không bao giờ được phá, kèm cách kiểm bằng máy (bằng chứng E1).

## 5. Quy tắc thêm/sửa
Thêm entity hoặc field mới = sửa file này trước, ghi quyết định, rồi mới chạm code. Đổi entity là quyết định cửa một chiều, cần ADR.
