# Biên bản chủ dự án duyệt kế hoạch thi công đợt 0 khung chung — 2026-10-28

> Hồ sơ có ngày. Viết xong là đóng băng; có gì mới thì viết bản mới trỏ về bản này.

## Lời chủ dự án (nguyên văn, tối muộn 28/10/2026, trong Main session 8418e052)

> theo đề xuất, nới trần có lý do

Trả lời cho trang *Duyệt kế hoạch đợt 0* (artifact `PoGQh87aaRhgmNDXmWksMx`), hai câu hỏi đặt ra sau khi viết kế hoạch
`docs/superpowers/plans/2026-10-28-dot-0-khung-chung.md` (commit 5fe92206).

## Ba quyết định

1. **Trần gói trang Đơn hàng** (`src/goi-trang-nhe.test.ts`, `TRAN_ORDERS = 96_700`; đo 28/10 trên main 1d3c67fd:
   `web/orders.ts` = 96.678 byte, còn 22 byte): **nới đúng một lần**, ở Task 16 của kế hoạch, bằng số đo thật sau
   Task 15 cộng 100 byte, kèm chú thích nêu số đo và lý do (tiền lệ ADR-0120, ADR-0136). Trước Task 16, bài này đỏ
   thì ghi số đo vào nhật ký thi công và đi tiếp, không sửa trần. Phần chặn nhật ký thay đổi lọt vào gói giữ nguyên.
2. **Cách thi công:** `superpowers:subagent-driven-development` trong một phiên Code riêng — mỗi task một subagent
   thi công, một subagent kiểm ngay, cuối cùng kiểm cả nhánh.
3. **Chỗ làm:** nhánh `dot-0-khung-chung` (đã có kế hoạch + hai biên bản), worktree có sẵn
   `.claude/worktrees/dot-0-khung-chung`. Không gộp `main`, không push `main`, không `wrangler deploy`; gộp và phát
   hành là việc của chủ sau cổng phát hành đợt 0 (đặc tả mục 12: chủ xem bản local + tờ so sánh trước/sau).

## Kế tiếp

Phiên Code riêng thi công 16 việc → báo Main session (nhánh, số commit, số đo gói cuối, mục lệch) → QA2 độc lập viết
`SO-SANH-TRUOC-SAU.md` → cổng phát hành đợt 0 → chủ `npm run day-len -- dot-0-khung-chung` → `npm run trien-khai`.
