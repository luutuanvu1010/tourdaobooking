# Đề xuất sửa CLAUDE.md §8: thêm nhật ký thay đổi vào chuỗi deploy (CHỜ CHỦ DUYỆT, N9)

AI không tự sửa `CLAUDE.md` (luật chi phối chính AI — CLAUDE.md §3, Hiến pháp N9). Tệp này chỉ là đề xuất; chủ duyệt thì áp nguyên văn (hoặc bảo AI áp trong một phiên có lệnh rõ).

**Hiện tại** (chép NGUYÊN VĂN câu ở `CLAUDE.md` §8, gạch "Đừng khẳng định trạng thái production…", sau khi nhánh đã gộp `main` 554009a):

> Chỉ deploy từ `main` đã gộp, theo `docs/HANDOFF-N1.md`: cổng chỉ-đọc → điểm khôi phục Time Travel → test + typecheck + e2e xanh → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → ghi trạng thái. `CI=1` để wrangler không hỏi.

## Liên quan tới đề xuất của `main` về hai lệnh `day-len` / `trien-khai`

`main` đã có một đề xuất khác cho CÙNG câu này: `docs/superpowers/plans/2026-09-23-lenh-day-de-xuat-claude-md.md` (mục 2, khối thứ hai) — đổi chuỗi thành "chủ gõ `npm run day-len` rồi `npm run trien-khai`, lệnh này làm cổng chỉ-đọc → … → in khối trạng thái để ghi". Hai đề xuất sửa cùng một câu, nên dưới đây viết cả hai trường hợp để không mâu thuẫn:

**Đề xuất A — nếu chủ ĐÃ duyệt đề xuất `day-len`/`trien-khai`** (áp đề xuất đó trước, rồi áp khối này lên câu mới):

```diff
-Chỉ deploy từ `main` đã gộp **và đã đẩy**, theo `docs/HANDOFF-N1.md`: chủ gõ `npm run day-len` (đẩy) rồi `npm run trien-khai`, lệnh này làm cổng chỉ-đọc → test + typecheck + build → e2e đủ bộ (đỏ thì nêu kịch bản và hỏi chủ) → điểm khôi phục Time Travel → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → in khối trạng thái để ghi. Hai lệnh chỉ chạy trong ứng dụng Terminal của macOS (TTY thật).
+Chỉ deploy từ `main` đã gộp **và đã đẩy**, theo `docs/HANDOFF-N1.md`: **trước khi gộp, AI thêm mục nhật ký thay đổi mới (bước A.0)**; chủ gõ `npm run day-len` (đẩy) rồi `npm run trien-khai`, lệnh này làm cổng chỉ-đọc → **cổng số phiên bản** → test + typecheck + build → e2e đủ bộ (đỏ thì nêu kịch bản và hỏi chủ) → điểm khôi phục Time Travel → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → **cổng số phiên bản sau deploy** → in khối trạng thái để ghi (kèm số phiên bản). Hai lệnh chỉ chạy trong ứng dụng Terminal của macOS (TTY thật).
```

**Đề xuất B — nếu chủ CHƯA duyệt đề xuất kia** (sửa thẳng câu "Hiện tại" ở trên):

```diff
-Chỉ deploy từ `main` đã gộp, theo `docs/HANDOFF-N1.md`: cổng chỉ-đọc → điểm khôi phục Time Travel → test + typecheck + e2e xanh → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → ghi trạng thái. `CI=1` để wrangler không hỏi.
+Chỉ deploy từ `main` đã gộp, theo `docs/HANDOFF-N1.md`: **mục nhật ký thay đổi mới (bước A.0)** → cổng chỉ-đọc → **`kiem-phien-ban.mjs` ĐẠT** → điểm khôi phục Time Travel → test + typecheck + e2e xanh → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → **`kiem-phien-ban.mjs --sau-deploy`** → ghi trạng thái (kèm số phiên bản). Từ 2026-09-23 mọi bước sau A.0 do `npm run trien-khai` làm, kể cả hai cổng phiên bản. `CI=1` để wrangler không hỏi.
```

**Vì sao:** số phiên bản từng đứng ở 1.0 qua 9 lần deploy vì bước tăng số không nằm trong chuỗi deploy. Dòng này đưa bước ghi nhật ký vào đúng chỗ AI đọc trước mỗi lần phát hành. Hai cổng phiên bản nay do `npm run trien-khai` tự chạy (xem dưới); chỉ việc **thêm mục nhật ký** (A.0) và việc **dùng `trien-khai` thay vì deploy tay** vẫn dựa vào kỷ luật.

## Câu hỏi "có nối `kiem-phien-ban.mjs` vào `trien-khai` không?" — ĐÃ TRẢ LỜI: CÓ (chủ quyết 2026-09-23)

Chủ chọn "Gắn lệnh kiểm phiên bản vào trien-khai". Đã làm trên nhánh này (`scripts/release-lib.mjs`, hàm `trienKhai`; test `src/release-lib.test.ts`): cổng trước chạy ngay sau bước đọc `migrations list` và trước `npm test` (1 = hỏi, chỉ đúng `c` mới đi tiếp; 2 = dừng); cổng sau chạy sau `audit-invariants`, hỏng thì chờ rồi thử lại một lần, kết quả vào khối tóm tắt; lệnh thoát 0 chỉ khi kiểm dữ liệu và cổng sau cùng ĐẠT. Chi tiết: phụ lục cuối `docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md`, bảng bước ở `docs/HANDOFF-N1.md`. Hai khối đề xuất ở trên đã rút gọn cho khớp; `CLAUDE.md` vẫn chưa sửa (chờ chủ duyệt đề xuất này).

Lưu ý riêng lần đầu: lần phát hành đầu tiên mang trang Trợ giúp PHẢI là 1.4 — cổng không bắt được nếu quên, vì production trước đó chưa báo số (coi là 1.0).
