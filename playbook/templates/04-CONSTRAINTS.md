# 04 — CONSTRAINTS (bước 4: luật hệ thống bất biến)

> Template rỗng, chỉ điền trong `project/`. Đây là N5 cụ thể hóa cho dự án: các quy tắc không bao giờ được phá, viết sao cho máy kiểm được. Mỗi ràng buộc thiếu cách kiểm là ràng buộc rỗng (Điều 8.2). Cowork soạn, chủ dự án duyệt; vi phạm bất kỳ dòng nào ở đây là lý do hợp lệ để chặn release.

## 1. Bất biến dữ liệu

| Mã | Bất biến | Cách kiểm (E1, máy chạy được) | Cổng áp dụng |
|---|---|---|---|
| R1 | | script/validator nào, fail thế nào | QA2 |

## 2. Điều cấm theo stack
Những điều stack này cấm tuyệt đối (ví dụ: không hardcode giá trị giao diện ngoài nguồn token, không gọi ghi vào hệ ngoài từ tầng render).

## 3. Ngưỡng chất lượng dạng số (Điều 6.2)
- Hiệu năng: ...
- Accessibility: ...
- Cấu trúc dữ liệu / structured data: ...

## 4. Ràng buộc bảo mật
Kế thừa `playbook/governance/policies/security.md`; ghi ở đây phần cụ thể hóa cho stack và phần siết thêm.

## 5. Quy tắc sửa file này
Thêm ràng buộc: được tự do (siết thêm). Nới hoặc xóa ràng buộc: cần chủ dự án phê chuẩn kèm lý do ghi vào DECISIONS, vì nới là mở rủi ro (nguyên tắc bánh cóc).
