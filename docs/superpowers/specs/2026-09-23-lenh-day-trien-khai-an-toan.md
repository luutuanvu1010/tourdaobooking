# Đặc tả: hai lệnh "đẩy an toàn" và "triển khai an toàn"

- **Ngày:** 2026-09-23.
- **Chủ dự án đã chọn:** "làm 1 + 2, chờ lệnh mới rồi đẩy".
- **Mục đích:** biến các bước đẩy lên GitHub và triển khai lên Cloudflare (`docs/HANDOFF-N1.md`) thành hai lệnh. Mỗi lệnh tự kiểm và tự **dừng** khi có gì sai, để không bỏ sót bước và không lỗi do quên. Lỗi nguy hiểm nhất cần chặn là **deploy mã cần migration mới mà migration chưa áp**, ví dụ quên áp `0023` thì trang quản lý nhân viên hỏng.
- **Không đổi luật:**
  - AI vẫn **không** tự đẩy, gộp vào `main`, hay triển khai (CLAUDE.md §8). Hai lệnh này do **chủ gõ**.
  - Hàng rào chỉ được **siết** thêm (Hiến pháp Điều 9.4), không được nới.

## Lệnh 1: `npm run day-len -- <tên-nhánh>` (tên nhánh tuỳ chọn)

Chủ chạy ở thư mục gốc repo (checkout `main`). Các bước chạy theo thứ tự; bước nào hỏng thì in lý do bằng tiếng Việt, thoát khác 0 và **không đẩy**:

1. Phải chạy trong terminal thật (TTY). Không phải TTY, ví dụ AI gọi qua công cụ, thì từ chối.
2. Nhánh hiện tại phải là `main`, và cây làm việc phải sạch (`git status --porcelain` rỗng).
3. `git fetch origin`. `origin/main` phải là tổ tiên của `main` cục bộ. Nếu không, tức là có người đẩy thứ khác lên, thì dừng và hướng dẫn.
4. Nếu có `<tên-nhánh>`: `main` phải là tổ tiên của nhánh đó, rồi chạy `git merge --ff-only <nhánh>`. Không bao giờ tạo merge commit tự động, không bao giờ `--force`.
5. Chạy `npm test` rồi `npm run typecheck`. Đỏ thì dừng. Nếu đã gộp ở bước 4, in lệnh để chủ quay `main` về chỗ cũ, **không tự làm**.
6. In bảng tóm tắt những gì sắp đẩy:
   - số commit và danh sách ngắn `origin/main..main`;
   - **migration mới** so với `origin/main` (tệp trong `migrations/` có ở `main` mà chưa có ở `origin/main`);
   - dòng cảnh báo: "Lần triển khai tới PHẢI áp các migration này trước; dùng `npm run trien-khai`".
7. Hỏi "Đẩy lên GitHub? (c/k)". Chỉ trả lời đúng `c` mới đẩy.
8. `git push origin main`. Đẩy xong, in lại `git log -1 origin/main` để chứng minh GitHub đã khớp.

## Lệnh 2: `npm run trien-khai`

Chủ chạy ở checkout `main`. Lệnh làm theo runbook ở `docs/HANDOFF-N1.md`; bước nào hỏng thì dừng, thoát khác 0:

1. Kiểm TTY, `main`, cây sạch. Thêm: `main` phải **đúng bằng** `origin/main` sau khi `git fetch`, tức là chỉ triển khai mã đã đẩy lên GitHub.
2. **Cổng chỉ đọc:** `CI=1 wrangler d1 migrations list tourdao-sales-db --remote` để biết migration nào chưa áp. Lệnh này không được ghi gì.
3. Chạy `npm test`, `npm run typecheck`, `npm run build:web`. Đỏ thì dừng.
4. Nếu có migration chưa áp:
   - in danh sách migration đó;
   - lấy và in **điểm khôi phục Time Travel** (lệnh chỉ đọc `wrangler d1 time-travel info tourdao-sales-db`), cùng lệnh khôi phục để chủ giữ lại;
   - hỏi "Áp N migration này lên production? (c/k)";
   - nếu `c`: chạy `CI=1 wrangler d1 migrations apply tourdao-sales-db --remote`. Lỗi thì dừng và **không deploy**.
5. Hỏi "Triển khai Worker lên production? (c/k)". Nếu vừa áp migration ở bước 4 thì câu hỏi phải nói rõ "PHẢI deploy ngay". Nếu chủ trả lời `k` sau khi đã áp migration: in cảnh báo đỏ kèm lệnh để tự chạy lại, rồi thoát khác 0.
6. `CI=1 wrangler deploy`.
7. `node scripts/audit-invariants.mjs --db remote`, báo ĐẠT hoặc KHÔNG ĐẠT. Thoát 2 nghĩa là không chạy được, **không phải** dữ liệu sạch.
8. In một khối tóm tắt để chủ dán vào `docs/HANDOFF-N1.md` (mục TRẠNG THÁI TRIỂN KHAI): ngày giờ, commit, migration đã áp, id phiên bản Worker nếu lấy được, kết quả kiểm dữ liệu.

Không đụng bí mật (`wrangler secret`), không rollback tự động.

## Hàng rào: siết, không nới

- Hook `.claude/hooks/guard-remote-lib.mjs` **chặn AI** chạy các lệnh sau, dưới mọi dạng mà hook đang nhận diện:
  - `npm run day-len`, `npm run trien-khai`;
  - `node scripts/day-len.mjs`, `node scripts/trien-khai.mjs`.
- Thêm các mục `deny` tương ứng vào `.claude/settings.json`.
- Có test trong `src/claude-guard.test.ts`, và **quan sát được nó chặn thật một lần**: sửa cố ý → đỏ → hoàn nguyên (P16).
- Cả hai kịch bản cũng tự từ chối khi không có TTY. Đây là lớp thứ hai.

## Cách viết

- Logic thuần tách ra `scripts/release-lib.mjs`: các hàm nhận một "bộ chạy lệnh" giả lập được, và một hàm hỏi đáp.
- `scripts/day-len.mjs` và `scripts/trien-khai.mjs` chỉ là vỏ mỏng.
- Test ở `src/release-lib.test.ts` (được `npm test` chạy) với bộ chạy lệnh giả.
- Mọi chữ in ra là tiếng Việt có dấu. Không dependency mới.

## Tiêu chí nghiệm thu (mỗi dòng có test)

1. Lệnh `day-len` từ chối, và **không** gọi `git push`, trong từng trường hợp: không có TTY; không ở `main`; cây bẩn; `origin/main` không phải tổ tiên; nhánh không tiến thẳng được; test đỏ; typecheck đỏ; chủ trả lời khác `c`.
2. Lệnh `day-len`: khi mọi thứ đạt và chủ trả lời `c`, gọi đúng `git merge --ff-only <nhánh>` rồi `git push origin main`, không có `--force`. Bảng tóm tắt liệt kê đúng migration mới.
3. Lệnh `trien-khai` từ chối trước khi deploy trong từng trường hợp: không có TTY; không ở `main`; cây bẩn; `main` khác `origin/main`; test, typecheck hoặc build đỏ; áp migration lỗi.
4. Lệnh `trien-khai`:
   - còn migration chưa áp mà chủ trả lời `k` thì **không** deploy;
   - trả lời `c` thì thứ tự gọi đúng là: áp migration → deploy → kiểm dữ liệu.
5. Lệnh `trien-khai`: không còn migration chưa áp thì bỏ qua bước áp, vẫn hỏi deploy, rồi kiểm dữ liệu.
6. Hook chặn AI chạy 4 dạng lệnh ở mục "Hàng rào". Test đỏ trước, xanh sau.
7. Chạy thật `node scripts/day-len.mjs` ngoài TTY (AI được chạy dạng này để thử, vì nó phải tự từ chối): thoát khác 0, in lý do, không gọi git nào ngoài lệnh đọc. **Lưu ý:** mục 6 sẽ chặn AI chạy dạng này sau khi thêm hàng rào, nên thử mục 7 TRƯỚC khi thêm hàng rào.

## Tài liệu

- `docs/HANDOFF-N1.md`:
  - runbook triển khai chỉ còn trỏ tới `npm run trien-khai`, giữ bảng giải thích từng bước;
  - phần đẩy trỏ tới `npm run day-len`;
  - runbook Face ID nói rõ lệnh sẽ tự chặn nếu 0023 chưa áp.
- `docs/CHANGE-GUIDE.md`: thêm một công thức.
- **CLAUDE.md** §5 (bảng lệnh) và §8: chỉ **đề xuất**, ở tệp `docs/superpowers/plans/2026-09-23-lenh-day-de-xuat-claude-md.md`. Chủ duyệt rồi mới áp.

## Giả định (bề mặt, đổi được)

- Tên lệnh là `day-len` và `trien-khai`.
- Câu hỏi nhận `c`/`k`.
- Chỉ đẩy nhánh `main`.
