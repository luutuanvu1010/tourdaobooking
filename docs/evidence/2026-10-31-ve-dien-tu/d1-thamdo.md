# Thăm dò D1 cho giữ chỗ vé (Task 3, Step 0) — 31/10/2026

**Kết luận: ĐẠT, không phải dừng.** D1 (bản chạy cục bộ của `wrangler`, động cơ workerd — cùng SQLite với production) chạy được ba thứ mà thiết kế giữ chỗ vé cần:
(a) `UPDATE … WHERE id IN (SELECT … ORDER BY … LIMIT <biểu thức có truy vấn con>)` kèm `changes()` đúng;
(b) `INSERT … SELECT … ROW_NUMBER() OVER (ORDER BY …) + MAX(slot_no)` gán vị trí tăng dần, vé hết hạn sớm nhận vị trí nhỏ;
(c) chạy lại lần hai không đổi dòng nào (`changes() = 0`), và trả vé: vé đã `revealed_at` thành `VOID`, vé chưa lộ về `AVAILABLE`.

Kết quả quan sát (lệnh dưới, kho 3 vé, cần 2): lần 1 đổi **2** vé và ghi **2** phân bổ; lần 2 đổi **0**; sau huỷ đơn có vé đã lộ: `t1 AVAILABLE`, `t2 VOID` (t2 hết hạn sớm nhất nên nhận vị trí 1 và là vé đã lộ), `t3 AVAILABLE`.

Chạy lại (chỉ cục bộ, không đụng remote; thư mục lưu tạm đặt tuỳ ý):

```bash
cd <thư mục gốc của repo>
CI=1 npx wrangler d1 execute tourdao-sales-db --local --persist-to /tmp/vdt-d1 --file docs/evidence/2026-10-31-ve-dien-tu/d1-thamdo.sql
```

Bài `src/modules/ve-dien-tu/d1-thamdo.test.ts` chạy lại đúng tệp SQL này trên `node:sqlite` để canh sự lệch giữa hai động cơ khi nâng phiên bản.
Giới hạn: `wrangler d1 execute --file` chạy từng câu một chứ không phải `db.batch`; tính nguyên tử của lô là bảo đảm của D1 (một giao dịch), không tự chứng minh ở đây. Bài thật trên máy chủ (e2e) ở Task 10.
