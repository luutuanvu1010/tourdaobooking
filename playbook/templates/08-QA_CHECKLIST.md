# 08 — QA CHECKLIST (bước 8: thực thi có cổng)

> Template rỗng, chỉ điền trong `project/`. Hai cổng, mỗi mục kiểm phải khai hạng bằng chứng đòi hỏi (E1 máy kiểm, E2 máy sinh người kiểm, E3 người khai có đối chứng — GOVERNANCE mục 5). E3 đơn độc không bao giờ đủ; bất biến dữ liệu bắt buộc E1. Vai QA chạy checklist, chủ dự án chốt cổng. Sau mỗi sự cố, thêm một mục kiểm để không lặp lại (ARTIFACT_OWNERSHIP).

## Cổng QA1 — trước khi Code chạy

| # | Mục kiểm | Hạng bằng chứng | Đạt/Trượt | Bằng chứng |
|---|---|---|---|---|
| 1 | Prompt tham chiếu đúng artifact (spec, constraints, binding map, schema) | E3 | | |
| 2 | Nhắc đủ ràng buộc liên quan từ 04-CONSTRAINTS | E3 | | |
| 3 | Tiêu chí done phát biểu rõ, đo được | E3 | | |
| 4 | Phạm vi không vượt spec đã duyệt | E3 | | |

## Cổng QA2 — trước khi merge / release

| # | Mục kiểm | Hạng bằng chứng | Đạt/Trượt | Bằng chứng |
|---|---|---|---|---|
| 1 | Khớp spec và không vi phạm điều cấm nào | E2 | | |
| 2 | Mọi bất biến dữ liệu (mã R trong 04) | E1 | | |
| 3 | Structured data / schema hợp lệ qua validator | E1 | | |
| 4 | Ngưỡng hiệu năng đạt số đã chốt | E1 | | |
| 5 | Responsive theo breakpoint, đúng token, không hardcode | E2 | | |
| 6 | SEO/GEO: meta, canonical, mở đầu tự đứng được | E2 | | |
| 7 | Accessibility đạt mức đã chốt | E1 | | |
| 8 | Tài liệu cập nhật cùng nhịp, không nợ ẩn | E3 | | |

## Quy tắc
Mặc định từ chối: mục nào không có bằng chứng là trượt, im lặng là trượt. Trượt một mục là cổng đóng, sửa xong chạy lại toàn bộ.
