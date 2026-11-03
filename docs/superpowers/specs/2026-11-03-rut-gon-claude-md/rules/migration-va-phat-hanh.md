---
paths:
  - "migrations/**"
  - "scripts/release-lib.mjs"
  - "scripts/trien-khai.mjs"
  - "scripts/kiem-phien-ban.mjs"
  - "wrangler.jsonc"
---

<!-- BẢN NHÁP (đề xuất 2026-11-03-rut-gon-claude-md, bước 2): chữ cắt nguyên văn từ mục 10 của CLAUDE.md; chưa có hiệu lực. -->

- `wrangler d1 migrations apply` áp **mọi** migration chưa áp: migration "siết" (B5 `staff_party_required`) không được lọt vào `migrations/` trước lần phát hành 2 (`src/migrations-n1.test.ts` nhận theo TÊN tệp).
- **Số migration**: hiện có **hai** tệp `0016_*` (`0016_feedback`, `0016_maintenance`) — chấp nhận được vì wrangler theo dõi theo TÊN đầy đủ. Số kế tiếp = số lớn nhất trong `migrations/` + 1 (kiểm bằng `ls migrations`). Trước khi đặt số, liệt kê migration của **mọi nhánh/worktree chưa gộp** (`git ls-tree --name-only <nhánh> migrations/`); migration B5 đang chờ số kế tiếp (`docs/HANDOFF-N1.md`).
- **Lỗi Cloudflare 7403** ("account is not valid or is not authorized") ở lời gọi wrangler đầu tiên của `npm run trien-khai`: đã gặp 26/9, 29/9, 1/10, chạy lại là qua. Giả thuyết mạnh (chưa tái hiện): vé OAuth 1 giờ vừa hết hạn. Từ 1/10 `scripts/release-lib.mjs` chạy `wrangler whoami` trước, rồi thử lại cổng chỉ-đọc **một** lần khi gặp 7403. Không tự thử lại bước ghi. Bị hỏi thì chỉ chủ mục "Nếu gặp lỗi Cloudflare 7403" của `docs/QUY-TRINH-PHAT-HANH.md`, không đoán "chưa đăng nhập" (chủ dự án 2026-10-01 yêu cầu đưa vào quy chế phòng ngừa).
