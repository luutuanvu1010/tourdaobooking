# Nhật ký thi công — Siết nền móng (sau đợt đánh giá 2026-09-22)

> Sổ điều phối (Hiến pháp P19). Bối cảnh: chủ dự án yêu cầu "đánh giá lại những file nền tảng, đảm bảo chúng hoạt động đúng thiết kế, đúng thực hành tốt của Anthropic". Hai người kiểm độc lập, chỉ đọc, thử phá đồng thời: (A) đối chiếu `CLAUDE.md`/`.claude/settings.json`/hook với tài liệu chính thức Anthropic; (B) thử phá kiến trúc, sổ dữ liệu, bản ghim Hiến pháp, hàng rào lệnh cấm bằng mutation. Không có lỗi Critical ở nhóm A; nhóm B tìm ra 3 lỗ hổng Critical (không có bài kiểm nào bắt được).

## Quyết định của chủ dự án (2026-09-22, qua AskUserQuestion)
| # | Câu hỏi | Chủ chọn |
|---|---|---|
| 1 | Phạm vi gói "Siết nền móng" | **Cả gói**: bài kiểm mới vá 3 lỗ hổng, hàng rào Claude, người kiểm độc lập dùng lại được, xoá bản sao CLAUDE.md, sửa 6 chỗ tài liệu lệch |
| 2 | Luật khi AI tự sửa CLAUDE.md/.claude/playbook/ADR | **Hỏi chủ mỗi lần** (permission `ask`, không phải `deny` cứng) |
| 3 | Sửa hook chặn nhầm ca `sed` có dấu huyền/`$()` trong nháy đơn | **Sửa, kèm bài kiểm đỏ→xanh** |

## Nơi làm
Nhánh `siet-nen-mong`, tạo từ `origin/main` @ `da64558` (sau khi PR #9 — N2 lát 1 — đã tự gộp với bộ CLAUDE.md mới). Nền: 443 test xanh, `tsc` 0 lỗi trước khi bắt đầu.

## Ba lỗ hổng Critical cần vá (từ báo cáo người kiểm B)
- **C-1**: 15/18 trigger CSDL không có bài kiểm "còn tồn tại trên schema đầy đủ" (chỉ 3 trigger của `0017` có). Gỡ 15 trigger bằng migration mới, `npm test` vẫn xanh.
- **C-2**: mức `access` của route (`admin/office/staff/public`) không có test đơn vị nào. Đổi `reset-pin` từ admin→staff, `npm test` và `tsc` đều xanh.
- **C-3**: "chỉ module chủ ghi bảng của mình" / SQL tĩnh chỉ ép trong 7 tệp `repository.ts` của module nghiêm; tệp khác trong module nghiêm và cả 5 module LEGACY không bị quét.

## Sổ việc
| Việc | Trạng thái | Người thi công | Người kiểm |
|---|---|---|---|
| Task 1 — bài kiểm vá C-1, C-2, C-3 (chỉ thêm test, không đổi hành vi) | Đang thi công | subagent sonnet | chờ |
| Task 2 — sửa hook chặn nhầm (nháy đơn quanh `$()`/dấu huyền) + 4 ca hồi quy | Đang thi công | subagent sonnet | chờ |
| Task 3 — hàng rào `ask` cho CLAUDE.md/.claude//playbook//ADR, agent kiểm độc lập, xoá bản sao CLAUDE.md, bù luật `deny` lớp 2 | Chờ (điều phối tự làm) | điều phối | chờ |
| Task 4 — sửa 6 chỗ tài liệu lệch (0017/Turnstile, 4 bảng Góp ý thiếu ở SYSTEM-DESIGN, ARCHITECTURE §router, `web/feedback.ts` location.assign→replace, số e2e cũ) | Chờ | điều phối | chờ (gộp vào kiểm toàn nhánh) |
| Kiểm toàn nhánh (opus, chỉ đọc) | Chờ | — | — |

## Ruling (điều phối tự quyết, ghi theo P5)
- **Đã LÙI một bước:** điều phối thêm luật `permissions.ask` cho `.claude/**` ngay trong lúc Task 2 (subagent) còn đang chạy và cần sửa `.claude/hooks/guard-remote-lib.mjs` — rủi ro tự chặn Task 2 giữa chừng nếu `settings.json` nạp lại sống (chưa xác nhận được có nạp sống hay không). Đã hoàn tác NGAY (chỉ giữ lại luật `deny` cho `npm run db:migrate:remote`, không đụng quyền Edit). **Luật `ask` cho tự-sửa-luật dời sang bước CUỐI CÙNG của cả gói** (sau khi Task 1, Task 2 và các vòng kiểm/sửa của chúng xong hẳn), để không còn ai (kể cả điều phối) cần sửa thêm trong `.claude/**` sau đó. Chi phí nếu vẫn sai: không có, vì chưa commit lúc phát hiện.
- Task 3 các phần khác (đã làm, không rủi ro tự chặn vì không đụng Edit-permission): tạo `.claude/agents/nguoi-kiem-doc-lap.md` (Write, không bị luật Edit chi phối); đổi tên ba bản đối chiếu CLAUDE.md trong `docs/superpowers/proposals/2026-09-21-claude-md/` sang tên khác (`ban-doi-chieu-*.md`) để khỏi tự nạp (Anthropic: tệp tên đúng `CLAUDE.md`/`CLAUDE.local.md` trong thư mục con tự nạp khi đọc tệp ở đó); thêm đúng một luật `deny` an toàn (`Bash(npm run db:migrate:remote)` — khớp chính xác, không mơ hồ về local/remote).
- **Không thêm** luật `deny` cho `wrangler d1 *`, `wrangler dev * --remote`, `git merge *` như dự tính ban đầu: cú pháp glob của `permissions.deny` không rõ có hỗ trợ "khớp giữa chuỗi rồi bắt buộc kết thúc đúng hậu tố" khi thứ tự cờ dòng lệnh thay đổi được (`--remote` có thể không nằm cuối); viết sai có thể vừa không bắt được gì (ảo tưởng an toàn) vừa chặn nhầm việc thường ngày (`wrangler d1 … --local`, `git merge` để gộp `main` mới vào nhánh tính năng — chính thao tác nhiều commit trong lịch sử repo này đã làm). Hook (lớp 1) đã chặn đúng các dạng này (Report A: 14/15 ca). Ghi lại làm việc treo, chờ chủ hoặc người kiểm xác nhận cú pháp đúng trước khi thêm.

## Ghi chú kỹ thuật quan trọng (tránh làm lại)
- Đường dẫn `Edit(path)` trong `permissions.ask`/`.deny` **chỉ áp cho công cụ Edit**, không áp cho `Write` (tạo tệp mới) — đã xác nhận bằng tài liệu chính thức Anthropic (`code.claude.com/docs/en/permissions`, dòng 338: "Claude Code checks file permissions against `Edit(path)` and `Read(path)` rules only... If you write a path rule for `Write`... Claude Code accepts the rule but never consults it"). Vậy hàng rào `ask` cho `.claude/`, `playbook/`, `docs/adr/`, ba `CLAUDE.md` chỉ chặn SỬA tệp có sẵn, không chặn TẠO tệp mới trong các thư mục đó qua công cụ Write.
- `Edit(.claude/**)` chỉ khớp đúng `<cwd>/.claude` và bên dưới (không khớp `.claude/` ở nơi khác trong máy) — đúng ý muốn.
- Thứ tự thao tác trong phiên này: làm mọi việc khác trong `.claude/**` trước (agent mới, luật `deny` bù), rồi mới thêm luật `ask` cho tự-sửa-luật **sau cùng**, để tránh rủi ro tự chặn giữa phiên nếu `permissions.json` được nạp lại sống (khác với hook, vốn chỉ nạp lúc mở phiên theo báo cáo A).
