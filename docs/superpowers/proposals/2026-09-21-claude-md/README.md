# Đề xuất bộ CLAUDE.md mới (chưa có hiệu lực)

> **Trạng thái: ĐỀ XUẤT, chờ chủ dự án duyệt.** `CLAUDE.md` chi phối chính AI viết ra nó, nên theo Hiến pháp v2.3.0 **N9** AI chỉ đề xuất, không tự cài. Ba tệp ở đây **chưa** thay `CLAUDE.md` đang dùng. Căn cứ: tài liệu chính thức Anthropic (`code.claude.com/docs`: `memory`, `best-practices`, `large-codebases` — nhắm dưới 200 dòng mỗi tệp, không đặt thông tin hay đổi, dùng tệp theo thư mục cho luật cục bộ, `CLAUDE.md` chỉ là lời khuyên nên điều cần chặn chắc dùng hook), `CLAUDE.md` của tourdaovn (thứ tự ưu tiên, điểm dừng cứng, hợp đồng báo cáo), bản cũ của repo này, và các quyết định của chủ trong phiên 2026-09-21.

## Cách cài (chỉ sau khi chủ duyệt)
```
cp docs/superpowers/proposals/2026-09-21-claude-md/CLAUDE.md CLAUDE.md
cp docs/superpowers/proposals/2026-09-21-claude-md/src/CLAUDE.md src/CLAUDE.md
cp docs/superpowers/proposals/2026-09-21-claude-md/web/CLAUDE.md web/CLAUDE.md
```
Rồi: cập nhật `docs/adr/README.md` nếu cần, ghi một dòng "Lịch sử thay đổi" (P5), và mở lại phiên để nạp. Kiểm đường dẫn nhắc tới còn đúng (mỗi tệp `.md` này nhắc tệp/lệnh có thật tại thời điểm soạn).

## Số đo (lúc soạn)
Gốc 89 dòng (~13 KB), `src/` 33 dòng, `web/` 27 dòng; bản cũ: 105 dòng nhưng ~18 KB vì mỗi dòng rất dài. Mục tiêu của chủ: gốc ≤ 200 dòng.

## Điều MỚI so với bản cũ — chủ duyệt từng điều
1. **§3 Vai của AI**: mỗi phiên một vai (P15), không tự nghiệm thu (N8), việc lớn cần subagent kiểm độc lập chỉ đọc (ngưỡng "việc lớn" do chủ chọn), AI chỉ đề xuất luật chi phối mình (N9), cơ chế kiểm phải quan sát chặn thật một lần (P16), nghiệm thu đặt trước (P20).
2. **§4 Giao tiếp**: ngắn gọn, kết luận trước, lời thường, **không bịa**, nêu rõ điều chưa kiểm (chủ nêu trong phiên).
3. **§2** chia tài liệu **chuẩn tắc** thắng mã / **mô tả** thua mã (quyết định #15 của chủ; bản cũ nói "mã thắng" cho mọi tài liệu).
4. **§8** hàng rào máy (hook + `permissions.deny`), "không khẳng định trạng thái production từ tài liệu", "**chỉ deploy từ `main` đã gộp**" — **điều này do người soạn đề xuất** sau vụ hai nhánh cùng deploy 0016; chủ cần xác nhận.
5. **§10** "trước khi đặt số migration, liệt kê migration của mọi nhánh chưa gộp" (bài học vụ `0016_feedback` / `0016_maintenance`); ghi rõ `typecheck` không phủ test/script.
6. Tách luật theo thư mục: `src/CLAUDE.md`, `web/CLAUDE.md` (tự nạp khi đọc tệp ở đó).

## Điều BỎ khỏi bản cũ và nơi nó sống
| Bản cũ | Nay |
|---|---|
| §9 Hiện trạng (deploy, Worker id, số test, Turnstile, việc mở) | **Bỏ** (thông tin hay đổi; đã lệch nhau giữa các phiên). Trỏ `docs/HANDOFF-N1.md` + kiểm bằng lệnh |
| §4 Bản đồ mã (`migrations/`, `scripts/`, `tests/`, `docs/`) | Rút còn cấu trúc `src/` ở `src/CLAUDE.md`; phần còn lại đọc từ cây thư mục |
| §3 đoạn kịch bản Chrome (dài) | Bảng ở `web/CLAUDE.md` |
| §5 Kiến trúc/dữ liệu/giao diện chi tiết | Cô đọng ở gốc §7; chi tiết ở `src/CLAUDE.md` và `web/CLAUDE.md` |
| §8 bẫy Turnstile dài, widget | Gốc §10 (một dòng) + `web/CLAUDE.md`; chi tiết vẫn ở `docs/CHANGE-GUIDE.md` công thức l |
| Số test cụ thể, "e2e 14 kịch bản", mốc/commit | Bỏ (đếm lại bằng lệnh) |

## Chưa làm / hạn chế
- Chưa cài; chưa đo được mức tuân thủ thực tế của AI với bản mới (chỉ quan sát qua các phiên sau).
- Con trỏ tới Hiến pháp còn "bản chép chờ duyệt" — cập nhật khi `playbook/` được ghim (task T8 của đặc tả).
- Hook chặn mới kiểm bằng `node --test src/claude-guard.test.ts`; **chưa quan sát nó chặn trong một phiên Claude Code thật** (cấu hình `.claude/settings.json` mới tạo giữa phiên; cần mở `/hooks` hoặc khởi động lại) — theo P16 chưa được coi là "đang hoạt động".
