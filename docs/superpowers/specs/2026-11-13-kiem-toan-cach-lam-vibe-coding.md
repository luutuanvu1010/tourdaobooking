# Kiểm toán cách làm dự án bằng AI (vibe coding) — 2026-11-13

Hồ sơ có ngày: viết xong đóng băng. Người làm: phiên AI `claude/vibe-coding-audit-2bdc6e`, chỉ đọc, không sửa mã hay luật.
Đối chiếu: tài liệu chính thức Claude Code (mục "Nguồn" cuối tệp) và thực hành tốt. Mọi số đo dưới đây chạy ngày 13/11 trên worktree này.

## Kết luận

Nền móng an toàn của dự án tốt hơn mức thường gặp (hàng rào chặn lệnh nguy hiểm, người kiểm độc lập, sổ hạn có máy canh). Điểm yếu lớn nhất không nằm ở mã mà ở **tải**: tốc độ sinh thay đổi (608 lần lưu vào bản chính trong 7 ngày) đã vượt xa năng lực kiểm của cả máy lẫn người, và lượng luật/tài liệu AI phải đọc mỗi phiên đã phình đến mức tự cản chính nó. Có một điểm gãy cụ thể cần vá ngay: hàng rào chặn lệnh nguy hiểm chỉ canh công cụ Bash, không canh công cụ chạy lệnh trong Terminal.

## A. Cần xử lý ngay

### A1. Hàng rào lệnh nguy hiểm có một cửa không canh (điểm gãy)
- `.claude/hooks/guard-remote.mjs` thoát ngay nếu `tool_name !== "Bash"`; khối `hooks.PreToolUse` của `.claude/settings.json` chỉ khai matcher `Bash` và `Edit|Write|MultiEdit|NotebookEdit`; `permissions.deny` toàn dạng `Bash(...)`.
- Phiên Claude Code trong ứng dụng desktop có thêm công cụ `mcp__terminal__run_in_terminal` (chạy lệnh trong tab Terminal của chủ). Lệnh `git push`, `wrangler deploy` đi đường này **không qua** guard-remote và không khớp luật deny dạng `Bash(...)`.
- Lớp chuyển tiếp toàn máy `~/.claude/hooks/hook-chuyen-tiep.sh` (matcher `*`) chỉ gọi lại đúng hook kho đã khai, nên không bù được.
- Trạng thái: **thấy từ cấu hình, CHƯA quan sát** (không thử chạy lệnh cấm). Chưa kiểm hộp hỏi quyền có hiện cho công cụ đó không.
- Đề xuất (chủ duyệt, vì sửa `.claude/` là sửa luật — N9): thêm luật deny cho `mcp__terminal__run_in_terminal` (hoặc cho cả `mcp__terminal__*`), hoặc mở rộng matcher và cho guard-remote đọc lệnh của công cụ đó; ghi dòng vào `docs/SO-HANG-RAO.md` sau khi quan sát chặn thật.

### A2. Công việc dở dang có nguy cơ mất
| Worktree / nhánh | Thay đổi chưa lưu | Tuổi |
|---|---|---|
| `claude/adr-0184-thi-cong` | 30 tệp (ảnh bằng chứng ADR-0184, dù ADR-0184 đã lên production 8/11) | 5 ngày |
| `claude/vibrant-keller-5d0659` | 16 tệp (test, `audit-checks.mjs`, bảng tham chiếu) | đang làm |
| `worktree-rut-gon-claude-md` | 3 dự thảo viết lại CLAUDE.md chưa lưu; 5 lần lưu chưa nhập | 10 ngày |
- 19 worktree, 15 nhánh chưa nhập. Dọn worktree mà không nhìn sẽ mất các tệp trên.

### A3. Việc viết lại CLAUDE.md (ADR-0160) đứng 10 ngày
- Vì đứng, bộ luật quá tải (mục B1) vẫn đang có hiệu lực mỗi phiên.

### A4. Kiểu trả lời đang cài ngược luật của chủ
- `.claude/settings.local.json` đặt `outputStyle: "Explanatory"` — kiểu này bắt AI chèn khung "Insight" giải thích kỹ thuật. Luật ưu tiên cao nhất của chủ (`~/.claude/CLAUDE.md` "Cách trả lời tôi") đòi ngắn, đời thường, không nhồi kỹ thuật. Hai chỉ dẫn cùng nạp mỗi phiên, kéo AI về hai hướng.
- Đề xuất: chủ đổi kiểu trả lời về mặc định trong phần cài đặt của ứng dụng.

## B. Hạn chế lớn (cấu trúc)

### B1. Ngữ cảnh mỗi phiên quá nặng
| Nạp lúc mở phiên | Kích thước |
|---|---|
| `CLAUDE.md` của dự án | 31 KB |
| `MEMORY.md` (bộ nhớ tự động) | 23,8 KB, 156 dòng |
| `~/.claude/CLAUDE.md` + `Projects/CLAUDE.md` | ~7 KB |
| `web/CLAUDE.md` (khi đọc tệp `web/`) | 34 KB |
| `src/CLAUDE.md` (khi đọc tệp `src/`) | 10 KB |
- Tổng 60–100 KB chữ tiếng Việt có dấu trước khi làm việc (ước lượng vài chục nghìn token; chưa đo chính xác). Tài liệu chính thức: mỗi CLAUDE.md nên dưới 200 dòng, "tệp dài tốn ngữ cảnh và giảm mức tuân thủ"; chỉ ghi điều AI không tự tìm ra được. `CLAUDE.md` gốc chỉ 132 dòng nhưng mỗi dòng trung bình ~240 byte — đạt chỉ tiêu dòng bằng cách nhồi dòng, không đạt tinh thần.
- Dự án **không có skill riêng** dù `docs/CHANGE-GUIDE.md` (1.538 dòng công thức) đúng là loại nội dung skill sinh ra để nạp theo nhu cầu.

### B2. Bộ nhớ đang bị dùng làm sổ trạng thái
- Phần lớn dòng `MEMORY.md` là "ĐÃ LÊN PRODUCTION bản X", "chờ day-len", "chưa thử iPhone". Đây là trạng thái đổi liên tục, trái chính `CLAUDE.md` §8 ("đừng khẳng định trạng thái production từ… bộ nhớ") và P19 (trạng thái sống trong tài liệu). Ít nhất một mục đã cũ: "Ba hook mới" còn tả cổng xanh đã gỡ 19/10.
- Hệ quả: AI mở phiên với một bức tranh production có thể sai, và tin nó.
- **Sắp chạm trần**: tài liệu chính thức nói chỉ 200 dòng hoặc 25 KB đầu của `MEMORY.md` được nạp, phần sau bị bỏ im lặng. Tệp đang 23.790 byte — còn khoảng 1–2 KB. Mục mới nhất nằm cuối tệp nên sẽ là mục bị mất trước, mà không ai được báo.

### B3. Năng lực kiểm không theo kịp tốc độ thay đổi
- 608 lần lưu vào `main` trong 7 ngày; 188 ADR, 259 kế hoạch, 256 đặc tả trong ~2,5 tháng; 914 tệp kiểm.
- Cổng xanh lúc AI dừng đã gỡ 19/10 vì bộ kiểm quá 12 phút ⇒ "không nói xong khi đỏ" nay dựa vào kỷ luật (`docs/SO-HANG-RAO.md` dòng cổng xanh).
- Người duyệt duy nhất là chủ, không phải lập trình viên. Nhiều lời duyệt được AI "hiểu theo câu duyệt mẫu" (ví dụ `docs/quyen-hoan.json`, mục ADR-0193, ADR-0197: "Chủ không gõ lại câu mẫu; người chép (AI) hiểu lời duyệt…"). Đây là chỗ AI tự diễn giải sự đồng ý của chủ cho quyết định chạm tiền/dữ liệu.

### B4. Rủi ro dữ liệu đã được chấp nhận nhiều lần
- Diễn tập khôi phục dữ liệu (mục HIGH trong `docs/quyen-hoan.json`) chưa làm lần nào; hạn đã dời 31/10 → 30/11 → 31/12; ít nhất bốn lần phát hành có điều kiện "sau diễn tập" được cho lên trước (ADR-0159, 0172, 0178, 0193). Chủ đã quyết có ghi lý do, nên đây không phải lỗi quy trình — nhưng là rủi ro lớn nhất đang mở về dữ liệu thật.

### B5. Người kiểm độc lập chỉ "chỉ đọc" bằng lời dặn
- `.claude/agents/nguoi-kiem-doc-lap.md` có công cụ `Bash` và chạy chung worktree với người thi công; "không sửa" chỉ nằm trong lời dặn. Tài liệu chính thức cho phép giới hạn công cụ của subagent; muốn chỉ đọc thật thì phải bỏ Bash hoặc cho chạy trên bản sao riêng.

### B6. Tài liệu "sống" phình trái luật vòng đời của chủ
- `docs/SO-HANG-RAO.md` 1,4 MB (mỗi dòng bảng dài hàng nghìn chữ, chứa cả lịch sử); `docs/SYSTEM-DESIGN.md` 896 KB; `docs/HANDOFF-N1.md` 1.871 dòng; mục sổ hạn trong `quyen-hoan.json` dài hàng trang vì cộng dồn lịch sử gia hạn. Luật chủ chốt 5/10: tài liệu sống chỉ vài tệp, ngắn, không chép lịch sử.

### B7. Kho git nặng
- `docs/evidence/` có 4.294 tệp, 721 MB, nằm trong git; gói git 1,0 GB. Mỗi worktree (19 cái) giữ một bản đầy đủ; mỗi việc của `kiem.yml` trên GitHub tải lại toàn bộ.

## C. Nhỏ
- `.claude/hooks/cong-xanh*.mjs` vẫn nằm trong kho dù không còn được gọi.
- `settings.local.json` cho phép `Edit(docs/adr/**)` không hỏi (chủ bỏ hộp hỏi 9/11), trong khi `CLAUDE.md` §8 vẫn viết tệp `docs/adr/` "chỉ sửa bằng công cụ sửa tệp để chủ được hỏi" — chữ luật lệch cấu hình.
- Hai móc nội bộ của guard-remote có nợ chậm với lệnh dị dạng (đã ghi trong sổ hàng rào, chờ chủ).

## Điều làm tốt (giữ nguyên)
Hàng rào hai lớp chặn lệnh ghi production, không có công tắc tạm; tách vai thi công/kiểm; sổ hạn làm `npm test` đỏ khi quá hạn; luật "quan sát chặn thật một lần" (P16) — đúng tinh thần tài liệu chính thức: hook là cưỡng chế, CLAUDE.md chỉ là lời khuyên.

## Ba quyết định đề xuất cho chủ
1. Vá cửa Terminal ở A1 (một luật deny trong `.claude/settings.json`, chủ duyệt, rồi quan sát chặn thật).
2. Đổi kiểu trả lời về mặc định (A4) và cho phép dọn `MEMORY.md` thành chỉ còn sở thích/cách làm, bỏ dòng trạng thái (B2) — gấp vì sắp chạm trần 25 KB.
3. Mở lại việc rút gọn CLAUDE.md (A3), kèm chuyển công thức của `CHANGE-GUIDE.md` thành skill nạp theo nhu cầu (B1).

## Lệnh đã chạy (để kiểm lại)
- `wc -c CLAUDE.md src/CLAUDE.md web/CLAUDE.md ~/.claude/CLAUDE.md`; `wc -lc <memory>/MEMORY.md`
- `cat .claude/settings.json .claude/settings.local.json`; `sed -n 1,40p .claude/hooks/guard-remote.mjs` (dòng `tool_name !== "Bash"`)
- `sed -n 55,100p ~/.claude/settings.json`; `head -40 ~/.claude/hooks/hook-chuyen-tiep.sh`
- `git log --since=2026-11-06 --oneline main | wc -l` → 608
- `git ls-files docs/evidence | wc -l` → 4294; `du` → 721M; `git count-objects -vH` → size-pack 1.00 GiB
- `git worktree list` + `git status --porcelain` từng worktree; `git branch --no-merged main | wc -l` → 15
- `grep -n 2026-11-30 docs/quyen-hoan.json` (mọi hạn 30/11 đã dời sang 31/12 hoặc 30/6/2027)

## Nguồn (tài liệu chính thức)
Tra qua trợ lý `claude-code-guide` ngày 13/11 (chưa tự đọc lại từng trang):
- Hook: https://code.claude.com/docs/en/hooks.md — matcher `Bash` là tên chính xác, không bắt công cụ MCP; muốn bắt cả máy chủ MCP dùng `mcp__terminal__.*`. Stop hook bị Claude Code bỏ qua sau 8 lần chặn liên tiếp.
- Quyền: https://code.claude.com/docs/en/permissions.md — công cụ MCP đặt tên `mcp__<máy chủ>__<công cụ>`; luật `Bash(...)` chỉ so chữ lệnh của công cụ Bash và "không phải ranh giới an ninh" (có thể lách bằng `git -C . push`, `sh -c`…). Việc luật Bash không phủ công cụ MCP là suy luận, tài liệu không nói thẳng.
- Bộ nhớ: https://code.claude.com/docs/en/memory.md — nạp 200 dòng / 25 KB đầu `MEMORY.md`; CLAUDE.md nên dưới 200 dòng; quy trình nhiều bước nên thành skill.
- Thực hành tốt: https://code.claude.com/docs/en/best-practices.md — "cho AI một phép kiểm để chạy" là đòn bẩy chính; hook là cưỡng chế, CLAUDE.md "đúng phần lớn thời gian, không phải mọi lần"; quy trình nhóm đặt vào skill; người rà chỉ nên có `Read, Grep, Glob`.
- Subagent: https://code.claude.com/docs/en/sub-agents.md — `tools` là danh sách cho phép, giới hạn do Claude Code cưỡng chế.
