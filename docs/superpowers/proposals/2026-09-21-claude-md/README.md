# Bộ CLAUDE.md mới (đề xuất; cài trên nhánh `cai-claude-md`, có hiệu lực khi chủ merge)

> **Cập nhật 2026-09-22 (theo yêu cầu của chủ):** đã sửa bản đề xuất rồi cài lên nhánh `cai-claude-md`. Thêm: (a) §6 chỉ đường **nạp ngữ cảnh đúng lúc** (Hiến pháp, kiến trúc, hệ thống thiết kế; không nạp hết, không nhập `@`); (b) §4 **trả lời ngắn, dễ hiểu, phi kỹ thuật**; (c) `web/CLAUDE.md` có mục "Hệ thống thiết kế"; (d) sửa dòng trỏ Hiến pháp (đã ghim ở `playbook/`, ADR-0012 accepted). Ba tệp ở đây giữ làm **bản gốc để đối chiếu**; bản dùng thật là `CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md` ở gốc và thư mục con. **Chỉ có hiệu lực khi chủ merge nhánh (N9: AI không tự có hiệu lực cho luật chi phối chính mình).**
>
> **Trạng thái trước đó: ĐỀ XUẤT, chờ chủ dự án duyệt.** `CLAUDE.md` chi phối chính AI viết ra nó, nên theo Hiến pháp v2.3.0 **N9** AI chỉ đề xuất, không tự cài. Soạn trên nền `main` @ `8c16767` (đã có module Góp ý). Căn cứ: tài liệu chính thức Anthropic (`code.claude.com/docs`: `memory`, `best-practices`, `large-codebases` — nhắm dưới 200 dòng mỗi tệp, không đặt thông tin hay đổi, tệp theo thư mục cho luật cục bộ, `CLAUDE.md` chỉ là lời khuyên nên điều cần chặn chắc dùng hook), `CLAUDE.md` của tourdaovn (thứ tự ưu tiên, điểm dừng cứng, hợp đồng báo cáo), bản cũ của repo, quyết định của chủ trong phiên 2026-09-21, và hai lượt kiểm độc lập (người kiểm chỉ đọc).

## Cách cài (nhánh `cai-claude-md` đã làm; ghi lại để tái hiện)
```
cp docs/superpowers/proposals/2026-09-21-claude-md/CLAUDE.md CLAUDE.md
cp docs/superpowers/proposals/2026-09-21-claude-md/src/CLAUDE.md src/CLAUDE.md
cp docs/superpowers/proposals/2026-09-21-claude-md/web/CLAUDE.md web/CLAUDE.md
```
**Cảnh báo:** bản gốc soạn trên `main` tại `8c16767`; nếu `main` đã đổi tiếp thì đối chiếu `git diff 8c16767 main -- CLAUDE.md` trước khi `cp`, kẻo xoá phần mới của `main`. Sau khi cài: mở lại phiên để nạp; kiểm đường dẫn nhắc tới còn đúng.
**Đối chiếu ngày 2026-09-22 (`main` @ `f01fa5c`):** `git diff 8c16767 main -- CLAUDE.md` chỉ đổi hai thứ: số test (403 → 408) và số migration (`0017` đã có, kế tiếp `0018`). Bản đề xuất không còn ghi số migration kế tiếp (chỉ ghi cách tính) và không ghi số test. Nếu `main` đi tiếp sau ngày này, đối chiếu lại bằng đúng lệnh trên.

## Số đo
Sau sửa 2026-09-22: gốc 113 dòng, `src/` 33 dòng, `web/` 37 dòng (đều dưới 200). Lúc soạn đầu: gốc 92 dòng (~15,7 KB), `src/` 33, `web/` 28. Bản cũ trên `main`: 110 dòng, 20,5 KB vì mỗi dòng rất dài. Mục tiêu của chủ: gốc ≤ 200 dòng.

## Điều MỚI so với bản cũ — chủ duyệt từng điều
1. **§3 Vai của AI**: mỗi phiên một vai (P15), không tự nghiệm thu (N8), việc lớn cần subagent kiểm độc lập chỉ đọc (định nghĩa "việc lớn" theo ngưỡng chủ chọn), AI chỉ đề xuất luật chi phối mình (N9), cơ chế kiểm phải quan sát chặn thật một lần (P16), nghiệm thu đặt trước (P20), mơ hồ theo P8, cảnh báo một lần theo P18.
2. **§4 Giao tiếp**: ngắn gọn, kết luận trước, lời thường, **không bịa**, nêu rõ điều chưa kiểm (chủ nêu trong phiên).
3. **§2** chia tài liệu **chuẩn tắc** thắng mã / **mô tả** thua mã (quyết định #15 của chủ). **Kèm một điều khoản do người soạn thêm sau khi người kiểm chỉ ra mâu thuẫn:** "lệch có chủ ý" đã ghi ở `SYSTEM-DESIGN` §16 (mã đúng, tài liệu chuẩn tắc lệch) thì không sửa mã mà trình chủ ra ADR/lịch sử mới. **Cần chủ xác nhận.**
4. **§8** hàng rào máy (hook + `permissions.deny`; **không có công tắc tạm**, nên chủ ra lệnh thì AI đưa nguyên lệnh cho chủ chạy bằng `!`); "không khẳng định production từ tài liệu"; "**chỉ deploy từ `main` đã gộp**" — **do người soạn đề xuất**, chủ cần xác nhận.
5. **§7** ghi việc `staff_updated` từng ghi SĐT vào nhật ký (chủ chốt sửa 2026-09-21, **đã sửa**) và nhật ký cũ còn số, để AI không lặp lại kiểu cũ.
6. **§10** số migration hiện có hai `0016_*` (chấp nhận); số kế tiếp = số lớn nhất + 1 (không ghi cứng số), "liệt kê mọi nhánh chưa gộp trước khi đặt số"; `typecheck` không phủ test/script.
7. Tách luật theo thư mục: `src/CLAUDE.md`, `web/CLAUDE.md`; **giữ một gạch "Giao diện" ở gốc** vì tệp thư mục con chỉ nạp khi đọc tệp ở đó (Anthropic), còn sửa `public/`, `package.json` bằng lệnh shell thì không kích hoạt.
8. **Hook mở rộng** (đề xuất mới, siết AI): chặn thêm `wrangler dev --remote` (Worker chạy trên D1 thật), chạy kịch bản trỏ vào production bằng `E2E_BASE_URL=…`, và merge "gián tiếp" (`cd`/`-C`/`checkout` rồi `merge`).
9. **§6 nạp ngữ cảnh đúng lúc** (chủ yêu cầu 2026-09-22): bảng "việc → đọc đúng mục" trỏ tới Hiến pháp (`playbook/CONSTITUTION.md`), kiến trúc (`docs/SYSTEM-DESIGN.md`, `docs/ARCHITECTURE.md`, ADR), hệ thống thiết kế (token `public/app.css`, `web/CLAUDE.md`, đặc tả A2); dặn đọc theo tiêu đề rồi đúng mục, **không dùng `@tệp`** (tài liệu Anthropic: `@` nạp cả tệp ngay khi mở phiên; CLAUDE.md thư mục con thì chỉ nạp khi đọc tệp ở đó).
10. **§4 trả lời chủ ngắn, dễ hiểu, phi kỹ thuật** (chủ yêu cầu 2026-09-22): kết luận trước, lời thường, không tên tệp/mã commit/số điều luật trong chat, chi tiết chỉ khi chủ hỏi, phương án ngắn khi cần chủ chọn, báo cáo cuối việc 4 mục có nhãn; tài liệu/commit/nhật ký vẫn viết đủ. **Điều khoản mới, chủ xác nhận khi merge.**
11. `web/CLAUDE.md` thêm mục **"Hệ thống thiết kế"**: token có ba nhóm (bản sao `tourdaovn` không đổi; MỚI cho app nội bộ; "Riêng của Tour Đảo Booking" thêm kích thước mới vào đây); màu/chữ thương hiệu mới hoặc đổi nhóm đầu thì hỏi chủ (**điều khoản do người soạn thêm, chủ xác nhận**).

## Điều BỎ khỏi bản cũ và nơi nó sống
| Bản cũ | Nay |
|---|---|
| §9 Hiện trạng (deploy, Worker id, số test, Turnstile, việc mở) | **Bỏ** (hay đổi; đã lệch nhau giữa các phiên). Trỏ `docs/HANDOFF-N1.md` + kiểm bằng lệnh |
| §4 Bản đồ mã | Rút còn cấu trúc `src/` ở `src/CLAUDE.md`; phần còn lại đọc từ cây thư mục |
| §3 đoạn kịch bản Chrome (dài) | Bảng ở `web/CLAUDE.md` (thêm hàng Góp ý) |
| §8 bẫy Turnstile/widget/bảo trì dài | Gốc §10 (cô đọng, đã khôi phục "chỉ chủ dùng được" + điều kiện bật, `turnstile_failed`, `login()/session()`) + `web/CLAUDE.md`; chi tiết ở `docs/CHANGE-GUIDE.md` công thức l, q |
| Số test cụ thể, "e2e 14 kịch bản", mốc/commit | Bỏ (đếm lại bằng lệnh) |

## Chưa làm / hạn chế
- Đã cài trên nhánh `cai-claude-md`, chỉ có hiệu lực khi chủ merge. Chưa đo được mức tuân thủ thực tế của AI với bản mới (cần quan sát ở phiên mới sau khi merge).
- Con trỏ Hiến pháp đã cập nhật (2026-09-22): trỏ `playbook/CONSTITUTION.md`, ADR-0012 accepted.
- Hook đã kiểm bằng 290 ca do người kiểm độc lập soạn (`src/claude-guard.cases.json`): 0 lọt trong nhóm quên/nhầm, 0 chặn nhầm heredoc/thông điệp; **còn ~24 kiểu cố ý lách** (nháy quanh `push`, biến `$g`, `| bash`, `node -e`, `gh api …/merge`, `git branch -f main`…) được chấp nhận. **Chưa quan sát hook chặn trong một phiên Claude Code thật** (cấu hình `.claude/settings.json` tạo giữa phiên; hai phiên thử đều không thấy nó chạy) — theo P16 chưa được coi là "đang hoạt động".
- Hook đã có ở `main` từ PR #7; muốn thấy hook chặn thật phải mở phiên MỚI ở checkout gốc (cách thử vô hại: mở `/hooks`, rồi bảo AI chạy một lệnh push kèm `--dry-run` tới `origin main`; phải thấy thông báo "Bị chặn: git push…").
