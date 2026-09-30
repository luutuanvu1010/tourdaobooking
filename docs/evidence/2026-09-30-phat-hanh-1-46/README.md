# Bằng chứng nhánh phát hành 1.46 (gộp ADR-0059, 0060, 0061, 0067)

Chạy 2026-09-30 trên nhánh `phat-hanh-1-46` (sau khi gộp đủ sáu nhánh), từ gốc worktree, `CHROME_BIN=…/chrome-wrap.sh`, `AXE_JS` = axe-core, `OUT` = thư mục này
(chỉ `nhap-tay`, `dot-c`, `help` đọc `OUT`; các kịch bản khác ghi vào thư mục cũ của chúng — không tệp theo dõi nào bị đổi).

| Lệnh | Kết quả |
|---|---|
| `npm test` | 2107/2107 + bài đo giờ 1/1, thoát 0 |
| `npm run typecheck` | 0 lỗi |
| `npm run build:web` | thoát 0 |
| `npm run test:e2e` (đủ bộ) | 35/35 kịch bản xanh, `audit-invariants --strict` trên D1 tạm: đạt, 7 cảnh báo |
| `npm run db:migrate:local` | áp tới `0052_chinh_sach_nhap_tay` |
| `audit-invariants --db local` | thoát 1: R-N1-5 (D1 local của worktree trống, 0 tài khoản) — không do bản gộp |
| xe-tren-don-smoke | 4 ✓ 1 ✗: bước 4 chỉ đỏ ở axe `color-contrast` serious tại `.sidebar-head > .brand > .brand-name > span` (thanh bên máy tính) |
| nhap-ke-toan-smoke, nhap-tay-smoke, loc-don-smoke, a2-smoke-form/order/sheet, help-smoke | OK |
| dot-c-smoke | đỏ ở axe `color-contrast` (Tôi máy tính) — **đỏ sẵn trên origin/main 7ba20349** (bản sao `git archive`, cùng lỗi) |
