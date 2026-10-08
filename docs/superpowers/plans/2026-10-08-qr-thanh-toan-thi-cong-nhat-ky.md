# Sổ thi công — QR thanh toán + Đ6 (kế hoạch 2026-10-08-qr-thanh-toan-ke-hoach.md)

Chủ dự án duyệt kế hoạch 2026-10-08; thi công kiểu "mỗi bước một trợ lý" (mỗi task một người thi công + một người kiểm task, cuối nhánh một người kiểm toàn nhánh và người kiểm độc lập theo CLAUDE.md §3).

Điều kiện phát hành (kiểm LÚC PHÁT HÀNH bằng lệnh chỉ đọc, không kiểm bây giờ): migration 0078–0083 đã có trên production (`wrangler d1 migrations list … --remote`).

| Ngày | Task | Việc / ruling / nợ | Bằng chứng |
|---|---|---|---|
| 2026-10-08 | 0 | Nhánh không thiếu lần lưu nào của main (merge-base = main = 4d98a205) nên không cần đồng bộ. Số migration chốt: 0087, 0088 (lớn nhất trên mọi nhánh: 0086 ở nhánh khác). Số route trên main: 253 → đích 256. | `git log HEAD..main` rỗng; `git ls-tree` mọi nhánh; `grep "assert.equal(actual.length" src/route-access.test.ts` |
| 2026-10-08 | 1 | Hàm thuần VietQR + nội dung chuyển khoản (commit 16573151, 109ddaa2). Bước 5 (đối chiếu trường với tài liệu VietQR/NAPAS gốc): **chưa mở được tài liệu gốc** (QR_Format_T&C_v1.5.2 chỉ thấy qua nguồn thứ cấp). Đối chiếu gián tiếp: mã tái tạo đúng chuỗi ví dụ của README vietnam-qr-pay (10.000đ, CRC 53E6) và napas-qr (AC13); không trường nào lệch. Sổ vàng: 1 chuỗi công khai + 3 tự tính. Kiểm thật còn chờ chủ quét bằng ≥ 2 ứng dụng ngân hàng (Task 13 Bước 8). | task-1-report.md; review Approved |

## Quan sát chặn thật (P16)
| Hàng rào | Đột biến cố ý | Thông báo đỏ | Hoàn nguyên |
|---|---|---|---|
