# Đề xuất sửa CLAUDE.md §8: thêm nhật ký thay đổi vào chuỗi deploy (CHỜ CHỦ DUYỆT, N9)

**Hiện tại:** Chỉ deploy từ `main` đã gộp, theo `docs/HANDOFF-N1.md`: cổng chỉ-đọc → điểm khôi phục Time Travel → test + typecheck + e2e xanh → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → ghi trạng thái.

**Đề xuất:** Chỉ deploy từ `main` đã gộp, theo `docs/HANDOFF-N1.md`: cổng chỉ-đọc → **mục nhật ký thay đổi mới + `node scripts/kiem-phien-ban.mjs` ĐẠT** → điểm khôi phục Time Travel → test + typecheck + e2e xanh → migration → `wrangler deploy` ngay → **`kiem-phien-ban.mjs --sau-deploy`** + `audit-invariants --db remote` → ghi trạng thái (kèm số phiên bản).

**Vì sao:** số phiên bản từng đứng ở 1.0 qua 9 lần deploy vì bước tăng số không nằm trong chuỗi deploy. Dòng này đưa bước ghi nhật ký vào đúng chỗ AI đọc trước mỗi lần phát hành. Việc chạy script trước `wrangler deploy` vẫn **dựa vào kỷ luật** (không có hook chặn).
