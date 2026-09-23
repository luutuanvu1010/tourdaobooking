# Đề xuất sửa CLAUDE.md §8: thêm nhật ký thay đổi vào chuỗi deploy (CHỜ CHỦ DUYỆT, N9)

AI không tự sửa `CLAUDE.md` (luật chi phối chính AI — CLAUDE.md §3, Hiến pháp N9). Tệp này chỉ là đề xuất; chủ duyệt thì áp nguyên văn (hoặc bảo AI áp trong một phiên có lệnh rõ).

**Hiện tại** (chép NGUYÊN VĂN câu ở `CLAUDE.md` §8, gạch "Đừng khẳng định trạng thái production…", sau khi nhánh đã gộp `main` 554009a):

> Chỉ deploy từ `main` đã gộp, theo `docs/HANDOFF-N1.md`: cổng chỉ-đọc → điểm khôi phục Time Travel → test + typecheck + e2e xanh → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → ghi trạng thái. `CI=1` để wrangler không hỏi.

## Liên quan tới đề xuất của `main` về hai lệnh `day-len` / `trien-khai`

`main` đã có một đề xuất khác cho CÙNG câu này: `docs/superpowers/plans/2026-09-23-lenh-day-de-xuat-claude-md.md` (mục 2, khối thứ hai) — đổi chuỗi thành "chủ gõ `npm run day-len` rồi `npm run trien-khai`, lệnh này làm cổng chỉ-đọc → … → in khối trạng thái để ghi". Hai đề xuất sửa cùng một câu, nên dưới đây viết cả hai trường hợp để không mâu thuẫn:

**Đề xuất A — nếu chủ ĐÃ duyệt đề xuất `day-len`/`trien-khai`** (áp đề xuất đó trước, rồi áp khối này lên câu mới):

```diff
-Chỉ deploy từ `main` đã gộp **và đã đẩy**, theo `docs/HANDOFF-N1.md`: chủ gõ `npm run day-len` (đẩy) rồi `npm run trien-khai`, lệnh này làm cổng chỉ-đọc → test + typecheck + build → e2e đủ bộ (đỏ thì nêu kịch bản và hỏi chủ) → điểm khôi phục Time Travel → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → in khối trạng thái để ghi. Hai lệnh chỉ chạy trong ứng dụng Terminal của macOS (TTY thật).
+Chỉ deploy từ `main` đã gộp **và đã đẩy**, theo `docs/HANDOFF-N1.md`: **trước khi gộp, AI thêm mục nhật ký thay đổi mới (bước A.0) và `node scripts/kiem-phien-ban.mjs` phải ĐẠT**; chủ gõ `npm run day-len` (đẩy) rồi `npm run trien-khai`, lệnh này làm cổng chỉ-đọc → test + typecheck + build → e2e đủ bộ (đỏ thì nêu kịch bản và hỏi chủ) → điểm khôi phục Time Travel → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → in khối trạng thái để ghi; **sau đó chạy `node scripts/kiem-phien-ban.mjs --sau-deploy` (phải ĐẠT) và ghi số phiên bản vào trạng thái**. Hai lệnh chỉ chạy trong ứng dụng Terminal của macOS (TTY thật).
```

**Đề xuất B — nếu chủ CHƯA duyệt đề xuất kia** (sửa thẳng câu "Hiện tại" ở trên):

```diff
-Chỉ deploy từ `main` đã gộp, theo `docs/HANDOFF-N1.md`: cổng chỉ-đọc → điểm khôi phục Time Travel → test + typecheck + e2e xanh → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → ghi trạng thái. `CI=1` để wrangler không hỏi.
+Chỉ deploy từ `main` đã gộp, theo `docs/HANDOFF-N1.md`: **mục nhật ký thay đổi mới + `node scripts/kiem-phien-ban.mjs` ĐẠT (bước A.0)** → cổng chỉ-đọc → điểm khôi phục Time Travel → test + typecheck + e2e xanh → migration → `wrangler deploy` ngay → **`kiem-phien-ban.mjs --sau-deploy`** + `audit-invariants --db remote` → ghi trạng thái (kèm số phiên bản). Từ 2026-09-23 phần giữa chuỗi do `npm run trien-khai` làm, nhưng lệnh đó CHƯA chạy `kiem-phien-ban.mjs`: hai lần chạy cổng phiên bản vẫn làm tay. `CI=1` để wrangler không hỏi.
```

**Vì sao:** số phiên bản từng đứng ở 1.0 qua 9 lần deploy vì bước tăng số không nằm trong chuỗi deploy. Dòng này đưa bước ghi nhật ký vào đúng chỗ AI đọc trước mỗi lần phát hành. Việc chạy `kiem-phien-ban.mjs` trước và sau deploy vẫn **dựa vào kỷ luật**: không có hook chặn, và `npm run trien-khai` hiện không gọi nó (xem câu hỏi dưới).

## Câu hỏi cho chủ: có nối `kiem-phien-ban.mjs` vào `trien-khai` không?

Hiện `npm run trien-khai` (`scripts/release-lib.mjs`, hàm `trienKhai`) KHÔNG chạy `scripts/kiem-phien-ban.mjs`; bước A.0 ở `docs/HANDOFF-N1.md` bảo chạy tay trước và sau lệnh đó. Hai lựa chọn:

1. **Nối vào** (khuyến nghị): `trien-khai` chạy `kiem-phien-ban.mjs` trước câu hỏi áp/deploy (thoát khác 0 thì dừng) và `--sau-deploy` sau bước deploy, in kết quả vào khối tóm tắt. Được: không quên được nữa. Mất: phải sửa `release-lib.mjs` + test so khớp danh sách lệnh (việc lớn: chạm triển khai, cần người kiểm độc lập); một lần sửa riêng sau khi gộp nhánh này.
2. **Giữ tay như hiện nay**: không sửa công cụ; dựa vào kỷ luật và bước A.0 trong runbook.

Lưu ý riêng lần đầu: lần phát hành đầu tiên mang trang Trợ giúp PHẢI là 1.4 — cổng không bắt được nếu quên, vì production trước đó chưa báo số (coi là 1.0).
