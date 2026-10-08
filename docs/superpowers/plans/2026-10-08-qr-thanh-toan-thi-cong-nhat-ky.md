# Sổ thi công — QR thanh toán + Đ6 (kế hoạch 2026-10-08-qr-thanh-toan-ke-hoach.md)

Chủ dự án duyệt kế hoạch 2026-10-08; thi công kiểu "mỗi bước một trợ lý" (mỗi task một người thi công + một người kiểm task, cuối nhánh một người kiểm toàn nhánh và người kiểm độc lập theo CLAUDE.md §3).

Điều kiện phát hành (kiểm LÚC PHÁT HÀNH bằng lệnh chỉ đọc, không kiểm bây giờ): migration 0078–0083 đã có trên production (`wrangler d1 migrations list … --remote`).

| Ngày | Task | Việc / ruling / nợ | Bằng chứng |
|---|---|---|---|
| 2026-10-08 | 0 | Nhánh không thiếu lần lưu nào của main (merge-base = main = 4d98a205) nên không cần đồng bộ. Số migration chốt: 0087, 0088 (lớn nhất trên mọi nhánh: 0086 ở nhánh khác). Số route trên main: 253 → đích 256. | `git log HEAD..main` rỗng; `git ls-tree` mọi nhánh; `grep "assert.equal(actual.length" src/route-access.test.ts` |
| 2026-10-08 | 1 | Hàm thuần VietQR + nội dung chuyển khoản (commit 16573151, 109ddaa2). Bước 5 (đối chiếu trường với tài liệu VietQR/NAPAS gốc): **chưa mở được tài liệu gốc** (QR_Format_T&C_v1.5.2 chỉ thấy qua nguồn thứ cấp). Đối chiếu gián tiếp: mã tái tạo đúng chuỗi ví dụ của README vietnam-qr-pay (10.000đ, CRC 53E6) và napas-qr (AC13); không trường nào lệch. Sổ vàng: 1 chuỗi công khai + 3 tự tính. Kiểm thật còn chờ chủ quét bằng ≥ 2 ứng dụng ngân hàng (Task 13 Bước 8). | task-1-report.md; review Approved |
| 2026-10-08 | 3 | Migration 0087 (`pty_bank` 30 ngân hàng + `pty_bank_account` + 3 trigger). Đối chiếu BIN với danh sách công khai `https://api.vietqr.io/v2/banks` ngày 2026-10-08: **cả 30 dòng khớp mã, BIN 6 số và tên ngắn**, không BIN nào lệch (JSON viết sáu tên dài — VCB, VIB, MSB, SEAB, VCCB, PVCB — ở dạng Unicode tổ hợp rời, khác dạng dựng sẵn của tệp migration; chữ y hệt, chỉ khác cách mã hoá). Đây là danh sách công khai của VietQR.io, **không phải** văn bản NAPAS; kiểm thật vẫn là chủ quét QR bằng ≥ 2 ứng dụng ngân hàng. | task-3-report.md; `node --test src/migrations-tai-khoan-nhan-tien.test.ts` 4/4 |

## Quan sát chặn thật (P16)
| Hàng rào | Đột biến cố ý | Thông báo đỏ | Hoàn nguyên |
|---|---|---|---|
| Trigger `pty_bank_account_owner_only` (migration 0087): chỉ hồ sơ đang là công ty chủ có tài khoản nhận tiền | Tạm xoá trigger khỏi `migrations/0087_pty_tai_khoan_nhan_tien.sql` (2026-10-08) | `node --test src/migrations-tai-khoan-nhan-tien.test.ts`: bài (a) đỏ — «Missing expected exception.» (chèn tài khoản cho hồ sơ không phải công ty chủ lọt qua); ba bài còn lại vẫn xanh | Khôi phục tệp từ bản sao; chạy lại 4/4 xanh |
