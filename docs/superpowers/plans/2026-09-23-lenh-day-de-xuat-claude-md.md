# Đề xuất sửa CLAUDE.md cho hai lệnh `day-len` / `trien-khai` (CHỜ CHỦ DUYỆT, CHƯA ÁP)

- **Ngày:** 2026-09-23. **Nguồn:** đặc tả `docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md`, mục "Tài liệu".
- **Vì sao chỉ là đề xuất:** `CLAUDE.md` là luật chi phối chính AI; AI không tự sửa nghĩa quy tắc (CLAUDE.md §3, Hiến pháp N9). Chủ duyệt thì áp nguyên hai khối dưới đây (hoặc bảo AI áp trong một phiên có lệnh rõ).
- **Không nới gì:** hai thay đổi chỉ thêm một dòng bảng lệnh và nói rõ hai lệnh mới thuộc nhóm AI BỊ CẤM chạy. Hàng rào máy (hook + `permissions.deny`) đã được siết trên nhánh `worktree-lenh-day-an-toan`.

## 1. §5 Lệnh — thêm một dòng vào cuối bảng

```diff
 | `npm run db:migrate:local` / `db:migrate:remote` | áp migration; **remote do chủ tự chạy, theo runbook (§8)** |
+| `npm run day-len [-- <nhánh>]` / `npm run trien-khai` | **chỉ chủ tự gõ trong ứng dụng Terminal của macOS** (cần TTY thật; không qua `!` trong phiên AI; AI bị hook chặn; ngoài TTY lệnh tự từ chối): đẩy `main` an toàn / triển khai theo runbook (cổng chỉ-đọc → test + typecheck + build → e2e đủ bộ (đỏ thì hỏi) → Time Travel → áp migration → deploy → audit). Bảng từng bước: `docs/HANDOFF-N1.md` |
```

## 2. §8 Git, triển khai, an toàn — hai chỗ

Gạch đầu dòng "CẤM AI tự chạy": thêm hai lệnh mới vào danh sách.

```diff
-- **CẤM AI tự chạy** (chủ quyết rồi tự chạy, bằng `!` hoặc trong Terminal): `git push`, merge vào `main` (kể cả `gh pr merge`), `wrangler deploy`/`rollback`/`secret …`, `wrangler d1 migrations apply --remote`, ghi hoặc `d1 execute` trên D1 remote, `wrangler dev --remote`, kịch bản hay `curl` ghi lên API production. Không `--force`. Hỏi "được chưa?" không phải là lệnh. Chủ ra lệnh thì AI làm hết bước chuẩn bị và kiểm, rồi đưa **nguyên lệnh** (kèm thư mục cần đứng).
+- **CẤM AI tự chạy** (chủ quyết rồi tự chạy, bằng `!` hoặc trong Terminal; riêng `day-len`/`trien-khai`: CHỈ trong ứng dụng Terminal): `git push`, merge vào `main` (kể cả `gh pr merge`), `wrangler deploy`/`rollback`/`secret …`, `wrangler d1 migrations apply --remote`, ghi hoặc `d1 execute` trên D1 remote, `wrangler dev --remote`, kịch bản hay `curl` ghi lên API production, **`npm run day-len`, `npm run trien-khai`** (và `node scripts/day-len.mjs`/`trien-khai.mjs`). Không `--force`. Hỏi "được chưa?" không phải là lệnh. Chủ ra lệnh thì AI làm hết bước chuẩn bị và kiểm, rồi đưa **nguyên lệnh** (kèm thư mục cần đứng).
```

Gạch đầu dòng "Đừng khẳng định trạng thái production…": trỏ trình tự deploy tới lệnh mới (giữ nguyên trình tự, chỉ nói lệnh nào làm nó).

```diff
-- **Đừng khẳng định trạng thái production từ tài liệu hay bộ nhớ** (…): kiểm bằng GET công khai hoặc lệnh chỉ đọc (`wrangler d1 migrations list … --remote`, `wrangler deployments list`). Chỉ deploy từ `main` đã gộp, theo `docs/HANDOFF-N1.md`: cổng chỉ-đọc → điểm khôi phục Time Travel → test + typecheck + e2e xanh → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → ghi trạng thái. `CI=1` để wrangler không hỏi.
+- **Đừng khẳng định trạng thái production từ tài liệu hay bộ nhớ** (…): kiểm bằng GET công khai hoặc lệnh chỉ đọc (`wrangler d1 migrations list … --remote`, `wrangler deployments list`). Chỉ deploy từ `main` đã gộp **và đã đẩy**, theo `docs/HANDOFF-N1.md`: chủ gõ `npm run day-len` (đẩy) rồi `npm run trien-khai`, lệnh này làm cổng chỉ-đọc → test + typecheck + build → e2e đủ bộ (đỏ thì nêu kịch bản và hỏi chủ) → điểm khôi phục Time Travel → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → in khối trạng thái để ghi. Hai lệnh chỉ chạy trong ứng dụng Terminal của macOS (TTY thật).
```

(Dấu `…` trong khối trên là phần chữ giữ nguyên của câu gốc, không đổi.)

## 3. Ghi chú

- Quyết định của điều phối (sửa vòng 1): hai lệnh chạy **chỉ trong ứng dụng Terminal của macOS**, không qua `! …` trong phiên Claude Code (có TTY hay không ở đó: chưa kiểm, nên không dựa vào). Lời chặn của hook cho hai lệnh này đã nói đúng như vậy.
