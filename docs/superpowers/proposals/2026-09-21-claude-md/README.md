# Đề xuất bộ CLAUDE.md mới (chưa có hiệu lực)

> **Trạng thái: ĐỀ XUẤT, chờ chủ dự án duyệt.** `CLAUDE.md` chi phối chính AI viết ra nó, nên theo Hiến pháp v2.3.0 **N9** AI chỉ đề xuất, không tự cài. Ba tệp ở đây **chưa** thay `CLAUDE.md` đang dùng. Soạn trên nền `main` @ `8c16767` (đã có module Góp ý). Căn cứ: tài liệu chính thức Anthropic (`code.claude.com/docs`: `memory`, `best-practices`, `large-codebases` — nhắm dưới 200 dòng mỗi tệp, không đặt thông tin hay đổi, tệp theo thư mục cho luật cục bộ, `CLAUDE.md` chỉ là lời khuyên nên điều cần chặn chắc dùng hook), `CLAUDE.md` của tourdaovn (thứ tự ưu tiên, điểm dừng cứng, hợp đồng báo cáo), bản cũ của repo, quyết định của chủ trong phiên 2026-09-21, và hai lượt kiểm độc lập (người kiểm chỉ đọc).

## Cách cài (chỉ sau khi chủ duyệt)
```
cp docs/superpowers/proposals/2026-09-21-claude-md/CLAUDE.md CLAUDE.md
cp docs/superpowers/proposals/2026-09-21-claude-md/src/CLAUDE.md src/CLAUDE.md
cp docs/superpowers/proposals/2026-09-21-claude-md/web/CLAUDE.md web/CLAUDE.md
```
**Cảnh báo:** bản gốc soạn trên `main` tại `8c16767`; nếu `main` đã đổi tiếp thì đối chiếu `git diff 8c16767 main -- CLAUDE.md` trước khi `cp`, kẻo xoá phần mới của `main`. Sau khi cài: mở lại phiên để nạp; kiểm đường dẫn nhắc tới còn đúng.

## Số đo (lúc soạn)
Gốc 92 dòng (~15,7 KB), `src/` 33 dòng, `web/` 28 dòng. Bản cũ: 105 dòng nhưng ~18 KB vì mỗi dòng rất dài. Mục tiêu của chủ: gốc ≤ 200 dòng.

## Điều MỚI so với bản cũ — chủ duyệt từng điều
1. **§3 Vai của AI**: mỗi phiên một vai (P15), không tự nghiệm thu (N8), việc lớn cần subagent kiểm độc lập chỉ đọc (định nghĩa "việc lớn" theo ngưỡng chủ chọn), AI chỉ đề xuất luật chi phối mình (N9), cơ chế kiểm phải quan sát chặn thật một lần (P16), nghiệm thu đặt trước (P20), mơ hồ theo P8, cảnh báo một lần theo P18.
2. **§4 Giao tiếp**: ngắn gọn, kết luận trước, lời thường, **không bịa**, nêu rõ điều chưa kiểm (chủ nêu trong phiên).
3. **§2** chia tài liệu **chuẩn tắc** thắng mã / **mô tả** thua mã (quyết định #15 của chủ). **Kèm một điều khoản do người soạn thêm sau khi người kiểm chỉ ra mâu thuẫn:** "lệch có chủ ý" đã ghi ở `SYSTEM-DESIGN` §16 (mã đúng, tài liệu chuẩn tắc lệch) thì không sửa mã mà trình chủ ra ADR/lịch sử mới. **Cần chủ xác nhận.**
4. **§8** hàng rào máy (hook + `permissions.deny`; **không có công tắc tạm**, nên chủ ra lệnh thì AI đưa nguyên lệnh cho chủ chạy bằng `!`); "không khẳng định production từ tài liệu"; "**chỉ deploy từ `main` đã gộp**" — **do người soạn đề xuất**, chủ cần xác nhận.
5. **§7** ghi một **vi phạm sống đã biết** của luật nhật ký (`staff_updated` ghi SĐT, câu 4(b) chờ chủ) để AI không tự sửa hay lặp lại.
6. **§10** số migration hiện có hai `0016_*` (chấp nhận, kế tiếp `0017`) và "liệt kê mọi nhánh chưa gộp trước khi đặt số"; `typecheck` không phủ test/script.
7. Tách luật theo thư mục: `src/CLAUDE.md`, `web/CLAUDE.md`; **giữ 4 dòng "Giao diện" ở gốc** vì tệp thư mục con chỉ nạp khi đọc tệp ở đó (Anthropic), còn sửa `public/`, `package.json` bằng lệnh shell thì không kích hoạt.
8. **Hook mở rộng** (đề xuất mới, siết AI): chặn thêm `wrangler dev --remote` (Worker chạy trên D1 thật), chạy kịch bản trỏ vào production bằng `E2E_BASE_URL=…`, và merge "gián tiếp" (`cd`/`-C`/`checkout` rồi `merge`).

## Điều BỎ khỏi bản cũ và nơi nó sống
| Bản cũ | Nay |
|---|---|
| §9 Hiện trạng (deploy, Worker id, số test, Turnstile, việc mở) | **Bỏ** (hay đổi; đã lệch nhau giữa các phiên). Trỏ `docs/HANDOFF-N1.md` + kiểm bằng lệnh |
| §4 Bản đồ mã | Rút còn cấu trúc `src/` ở `src/CLAUDE.md`; phần còn lại đọc từ cây thư mục |
| §3 đoạn kịch bản Chrome (dài) | Bảng ở `web/CLAUDE.md` (thêm hàng Góp ý) |
| §8 bẫy Turnstile/widget/bảo trì dài | Gốc §10 (cô đọng, đã khôi phục "chỉ chủ dùng được" + điều kiện bật, `turnstile_failed`, `login()/session()`) + `web/CLAUDE.md`; chi tiết ở `docs/CHANGE-GUIDE.md` công thức l, q |
| Số test cụ thể, "e2e 14 kịch bản", mốc/commit | Bỏ (đếm lại bằng lệnh) |

## Chưa làm / hạn chế
- Chưa cài; chưa đo được mức tuân thủ thực tế của AI với bản mới.
- Con trỏ Hiến pháp còn "bản chép chờ duyệt" — cập nhật khi `playbook/` được ghim (task T8 của đặc tả).
- Hook đã kiểm bằng 290 ca do người kiểm độc lập soạn (`src/claude-guard.cases.json`): 0 lọt trong nhóm quên/nhầm, 0 chặn nhầm heredoc/thông điệp; **còn ~24 kiểu cố ý lách** (nháy quanh `push`, biến `$g`, `| bash`, `node -e`, `gh api …/merge`, `git branch -f main`…) được chấp nhận. **Chưa quan sát hook chặn trong một phiên Claude Code thật** (cấu hình `.claude/settings.json` tạo giữa phiên; hai phiên thử đều không thấy nó chạy) — theo P16 chưa được coi là "đang hoạt động".
- Phiên bắt đầu ở checkout gốc của `main` sẽ **không có** hook cho tới khi nhánh này được gộp (`main` chưa theo dõi `.claude/`).
