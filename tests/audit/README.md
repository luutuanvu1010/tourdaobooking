# tests/audit — bộ thử phá của kiểm toán kiến trúc 2026-09-22

Bằng chứng thực nghiệm cho `docs/AUDIT-2026-09-22-KIEN-TRUC.md`. **Không phải bộ test hồi quy** và cố ý không nằm trong `npm test`.

- `harness.mjs` — nạp **cả ứng dụng** (`src/index.ts`: router + mọi module) bằng esbuild, chạy trên D1 giả = SQLite thật (`node:sqlite`) với schema dựng từ `migrations/*.sql`; đăng nhập bằng cookie ký thật (`createSessionToken`). Không mạng, không Turnstile (thiếu khoá = tắt), không đụng D1 local/remote.
- `cloudflare-workers-gia.mjs` — lớp `DurableObject` giả, `harness.mjs` trỏ `"cloudflare:workers"` về đây (plugin esbuild) để gói được `src/index.ts` (export lớp trạm Bảng tin `BangTin`, ADR-0022) dưới Node; khung thử không có binding `BANG_TIN` nên trạm không bao giờ chạy.
- `query-plan.test.mjs` — in kế hoạch truy vấn (EXPLAIN QUERY PLAN) của các câu nóng.
- `redteam.test.mjs` — 17 ca, mỗi ca ghi nhãn:
  - **PASS**: hệ thống giữ được bất biến.
  - **FINDING**: test khẳng định hành vi **yếu** hiện tại. Khi sửa phát hiện đó, test sẽ **đỏ** — lúc ấy chuyển nó thành test hồi quy thật (`src/**` hoặc `tests/e2e/`) với khẳng định đảo ngược, rồi xoá ca ở đây.
- `doi-tac.test.mjs` — 6 ca (P1–P6) cho kịch bản đối tác ngoài đăng nhập (~1000 tài khoản), bằng chứng của `docs/AUDIT-2026-09-22-DOI-TAC.md`. Cùng quy ước PASS/FINDING.

Chạy (từ gốc repo, cần `esbuild` — dùng `node_modules` của bản checkout gốc):

```
node --test "tests/audit/*.test.mjs"
```

Giới hạn của D1 giả: `batch()` chạy tuần tự trong MỘT giao dịch SQLite như D1; `changes()` theo ngữ nghĩa SQLite. Hành vi riêng của D1 thật (giới hạn truy vấn, độ trễ, lỗi mạng) không được mô phỏng — ca tranh chấp HTTP thật vẫn ở `tests/e2e/`.
