# 02 — SAD, System Architecture Document (bước 2: kiến trúc hệ thống)

> Template rỗng, chỉ điền trong `project/`. Viết theo C4, đi từ to xuống nhỏ. Đây là design doc làm cơ sở review trước khi chốt bằng ADR (DECISION_PROCESS). Cowork soạn, chủ dự án phê chuẩn.

## 1. Bối cảnh (C1 — Context)
Hệ thống nói chuyện với ai: người dùng nào, hệ ngoài nào (booking, CDN, API bên thứ ba, AI engine). Một sơ đồ hoặc một bảng.

## 2. Container (C2)
Các khối chạy độc lập: web, CMS, database, worker, pipeline. Với mỗi khối: công nghệ, trách nhiệm, dữ liệu nó sở hữu.

## 3. Thành phần chính (C3)
Bên trong mỗi container: module nào, ranh giới gì. Chỉ vẽ tới mức đủ ra quyết định, không vẽ cho đẹp.

## 4. Dòng dữ liệu
Dữ liệu sinh ở đâu, chảy qua đâu, ai là nguồn sự thật cho mỗi loại (P6). Đánh dấu rõ các dòng một chiều.

## 5. Ràng buộc kiến trúc
Những điều kiến trúc này cấm hoặc bắt buộc (nháp cho 04-CONSTRAINTS). Ví dụ: render tĩnh trước, không gọi API ngoài lúc runtime ở trang X.

## 6. Quyết định mở
Các lựa chọn chưa chốt, mỗi cái sẽ thành một ADR ở bước 3. Ghi rõ cửa một chiều hay hai chiều.
