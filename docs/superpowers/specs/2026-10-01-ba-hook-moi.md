# Ba hook mới: cổng xanh, tệp cấm sửa, không sửa luật bằng dòng lệnh

- **Ngày:** 2026-10-01. **Trạng thái:** đã thi công trên nhánh `worktree-ba-hook-moi`, đã kiểm độc lập (mục 7), chờ chủ dự án duyệt bằng `npm run day-len` (đây là thay đổi LUẬT — `.claude/` — nên chỉ có hiệu lực khi chủ gộp; Hiến pháp N9, Điều 9.4: chỉ siết, không nới).
- **Chủ dự án quyết (2026-10-01, trong phiên):** "Hook là vô cùng quan trọng" → chọn phương án A "làm hook 1–3 trước"; hook 4–6 (nhắc lại sau khi nén ngữ cảnh, kiểm ngay sau mỗi lần sửa tệp, báo tin khi AI chờ) để đợt sau.
- **Nguồn:** tài liệu chính thức của Anthropic — `code.claude.com/docs/en/hooks-guide`, `code.claude.com/docs/en/hooks`, `code.claude.com/docs/en/settings` (tra ngày 2026-10-01). Câu gốc: hook cho "deterministic control: certain actions always happen rather than relying on the LLM to choose to run them".

## 1. Vì sao

Trước hôm nay kho chỉ có MỘT hook (`guard-remote`, chặn lệnh đẩy/triển khai/ghi dữ liệu thật). Ba luật dưới đây của `CLAUDE.md` chỉ dựa vào kỷ luật của AI:

| Luật đã có | Dựa vào | Hở ở đâu |
|---|---|---|
| §4 "Không nói 'xong' khi test/typecheck chưa chạy hoặc đỏ" | AI nhớ chạy | Kho không có CI, không có git hook — không máy nào tự chạy bộ kiểm trước khi AI báo xong |
| §7 không sửa migration đã áp; bí mật chỉ ở `.dev.vars`; §8 không sửa thẳng ở checkout gốc | AI nhớ | Công cụ sửa tệp sửa được cả ba |
| §3 / N9 "Không tự tay đổi luật" — luật `ask` cho `Edit(CLAUDE.md…)` | Chủ được hỏi khi AI dùng công cụ sửa tệp | Sửa cùng tệp bằng `sed -i`, `>`, `cp`, `rm`, `git checkout -- …` thì không ai hỏi |

## 2. Tiêu chí nghiệm thu (hành vi kiểm được — P20)

**Hook 1 — cổng xanh** (`Stop` của phiên chính; trợ lý con CHƯA canh — xem G2):
1. Cây làm việc ở `cwd` giống main (không commit riêng, không thay đổi chưa commit) ⇒ không chạy gì, cho dừng.
2. Khác main ⇒ chạy `npm run typecheck` + bộ kiểm chính (`src/**/*.test.ts` trừ bài đo giờ của hook); xanh ⇒ cho dừng.
3. Đỏ / quá giờ / không chạy được ⇒ giữ AI lại, lý do nêu bước đỏ, tên bài đỏ (tối đa 15 dòng), đường dẫn nhật ký đầy đủ.
4. Lối ra duy nhất khi chưa xanh: câu trả lời cuối có nguyên văn **BỘ KIỂM CHƯA XANH** (không phân biệt hoa thường, khoảng trắng, dạng dấu).
5. Mã không đổi ⇒ không chạy lại (nhớ theo dấu vân của cây); đổi một ký tự ⇒ chạy lại.
6. Không có công tắc tạm; không đọc biến môi trường nào ngoài `CLAUDE_PROJECT_DIR`.

**Hook 2 — tệp cấm sửa** (`PreToolUse` cho `Edit|Write|MultiEdit|NotebookEdit`):
7. `migrations/*.sql` đã có trên `main` hoặc `origin/main` ⇒ chặn; migration mới của nhánh ⇒ cho qua.
8. `.dev.vars`, `.env`, `.env.*` ⇒ chặn; `*.example` ⇒ cho qua.
9. Tệp không-bị-ignore nằm ở checkout gốc ⇒ chặn; cùng tệp trong một worktree ⇒ cho qua.
10. Tệp ngoài kho / của kho khác ⇒ không phán.

**Hook 3 — không sửa luật bằng dòng lệnh** (trong móc Bash `guard-remote`):
11. Lệnh ghi/xoá/ghi đè `CLAUDE.md` (mọi tầng), `.claude/settings*.json`, `.claude/hooks/`, `.claude/agents/`, `playbook/`, `docs/adr/` ⇒ chặn, lý do trỏ về công cụ sửa tệp.
12. Đọc, `git add`, `git commit`, chép RA ngoài, dọn `.claude/worktrees/…`, tệp cùng tên ở ngoài kho ⇒ cho qua.
13. Mọi lệnh cấm cũ của `guard-remote` vẫn bị chặn; kho ca 295 lệnh không bị chặn nhầm (trừ đúng một ca `sed -i … CLAUDE.md`, vốn là đường vòng).

**Chung:**
14. Mỗi hàng rào có bài kiểm tự động, đã được quan sát chặn thật (đột biến → đỏ → hoàn nguyên) và có dòng trong `docs/SO-HANG-RAO.md`.
15. `npm run typecheck` 0 lỗi; bộ kiểm chính xanh.

## 3. Giả định đã tự đưa (chủ xem lại; đều đảo ngược được bằng một lần sửa tệp)

| # | Giả định | Lý do | Cách đổi |
|---|---|---|---|
| G1 | "Đã áp remote" được siết thành "đã có trên main" | Móc không hỏi được production (không mạng, không bí mật); siết thì được, nới thì không | Đổi điều kiện ở `guard-tep-lib.mjs` |
| G2 | Cổng xanh CHỈ canh phiên chính (`Stop`); trợ lý con (`SubagentStop`) chưa canh | Bản đầu có canh trợ lý thi công; người kiểm độc lập (I-1) chỉ ra theo tài liệu chính thức: trợ lý con nộp báo cáo qua `SubagentHandback`, móc `SubagentStop` không đọc được báo cáo ⇒ câu khai không tới cổng, trợ lý bị giữ vô ích tới 8 vòng. Không thử thật được trước khi gộp nên gỡ; bài kiểm ghim "không khai `SubagentStop`" | Giải I-1 (đọc báo cáo từ móc `PreToolUse` của `SubagentHandback`) rồi khai lại ở `.claude/settings.json` |
| G3 | Cổng xanh KHÔNG chạy bài đo giờ của hook, e2e, bước sinh kho trợ lý | Bài đo giờ đỏ giả khi máy bận (đã thấy 1/10: 2011 ms khi tải máy 59); e2e cần mạng và chậm | Sửa `chayBoKiem` |
| G4 | Sửa luật bằng dòng lệnh thì CHẶN hẳn (không hỏi) | Dồn mọi thay đổi luật về MỘT cửa đã có người hỏi (công cụ sửa tệp), không mở cửa hỏi thứ hai | Đổi `deny` thành `ask` ở `guard-remote.mjs` |
| G5 | Ở checkout gốc, tệp bị gitignore vẫn sửa được | Không phải mã của kho (bản dựng, cấu hình cục bộ) | Bỏ ngoại lệ ở `guard-tep-lib.mjs` |

## 4. Điều chủ dự án sẽ thấy khác đi

- Mỗi lần AI kết thúc một lượt **có sửa mã**: chậm thêm chừng 1 phút (đo 1/10: 51 giây cho 263 tệp bài kiểm, máy đang bận). Lượt hỏi đáp không sửa gì: không chậm.
- Câu trả lời của AI có thể xuất hiện dòng **BỘ KIỂM CHƯA XANH** kèm tên bài đỏ — nghĩa là việc CHƯA xong, đừng `day-len`.
- Chép ADR đã duyệt vào `docs/adr/`, sửa `CLAUDE.md`… luôn hiện hộp hỏi quyền (trước đây chép bằng dòng lệnh thì không hỏi).
- AI không còn sửa được tệp nào ở thư mục gốc của kho; phải vào bản làm việc riêng trước.

## 5. Giới hạn — điều các hook này KHÔNG làm (ghi thẳng, P16)

- Cả ba **chặn quên/nhầm, không chống cố ý lách** (như `guard-remote`).
- Cổng xanh chỉ nhìn cây ở `cwd` của PHIÊN CHÍNH: phiên điều phối đứng ở checkout gốc còn trợ lý con sửa ở worktree khác ⇒ không thấy; trợ lý con không có cổng (G2). Phiên mở ở thư mục cha của kho ⇒ cổng không chạy (lớp chuyển tiếp cấp máy không biết phiên thuộc kho nào). Claude Code tự gỡ cổng sau 8 lần giữ liên tiếp. Hai phiên cùng dừng trong một worktree ⇒ hai lượt kiểm chạy chồng, có thể đỏ giả.
- Hook 2 chỉ canh công cụ sửa tệp; cùng việc đó bằng dòng lệnh thì không thấy. Một lớp (P21 chưa đạt).
- Hook 3 không thấy: đường dẫn trong biến, `xargs`, `node -e`/`python -c`, `awk -i inplace`, `cp -t <thư mục>`, `find . -name CLAUDE.md -delete`, `git apply`/`am`/`stash`/`reset --hard`, `git checkout .`/`git restore .`, lệnh dài quá 200 000 ký tự hoặc quá 2000 đoạn, worktree đặt ngoài thư mục gốc kho.
- Hook chỉ có hiệu lực với phiên mở **sau** khi nhánh lên main (Claude Code nạp hook lúc mở phiên, từ checkout gốc).

## 6. Chưa làm (đợt sau, cần chủ quyết)

- Hook 4–6 của bản đề xuất (nhắc lại việc đang làm sau khi nén ngữ cảnh; kiểm ngay sau mỗi lần sửa tệp; báo tin khi AI chờ chủ).
- Cổng xanh cho trợ lý con thi công (G2 — phải giải I-1 trước).
- Lớp thứ hai độc lập cho hook 2 (P21).
- Cổng xanh cho phiên điều phối (theo dõi worktree mà phiên đã đụng, thay vì chỉ `cwd`).
- Câu trong `CLAUDE.md` §8 nhắc ba hàng rào mới: có trong nhánh ở một commit RIÊNG (đề xuất — chủ duyệt mới có hiệu lực).

## 7. Kiểm độc lập (2026-10-01, trợ lý `nguoi-kiem-doc-lap`, chỉ đọc) — ĐẠT CÓ ĐIỀU KIỆN, đã xử lý

Người kiểm tự chạy lại: typecheck 0 lỗi; 33/33 bài hàng rào; bộ kiểm chính 2451/2451; 97 ca chặn + 125 ca cho qua của hook 3, 31 ca đường dẫn của hook 2; móc cổng thật trên worktree (62 giây xanh, lần hai 1 giây). Không thấy chặn nhầm việc thường ngày, không thấy nới luật, không thấy báo xanh sai. Bài đo giờ của `guard-remote` đỏ trên CẢ `main` (1911 ms) lẫn nhánh (1935 ms) vì máy quá tải — không do thay đổi này.

| Phát hiện | Xử lý |
|---|---|
| I-1 Trợ lý con dùng `SubagentHandback`: câu khai không tới được cổng | Gỡ cổng khỏi `SubagentStop` (G2), móc chỉ nhận `Stop`; câu trả lời rỗng coi như không đọc được; bài kiểm ghim cả ba |
| I-2 Vế `origin/main` của luật migration không có bài canh | Thêm ca "migration chỉ có trên origin/main"; đột biến bỏ vế đó nay đỏ |
| T-1 Hai lượt kiểm chạy chồng trong một worktree | Ghi vào Giới hạn (hết trợ lý con thì chỉ còn ca hai phiên chính chung worktree) |
| T-2 Tài liệu bảo ghi `.dev.vars` trong khi công cụ sửa tệp bị chặn | Thêm chỉ dẫn ở `docs/CHANGE-GUIDE.md` công thức r |
| T-3 Cổng trợ lý con không chạy khi phiên mở ở thư mục cha | Hết áp dụng (đã gỡ cổng trợ lý con) |
| L-1 Sáu dạng lọt chưa khai | Khai đủ ở Giới hạn (đặc tả, sổ hàng rào, chú thích đầu tệp) |
| L-2 `perl -MList::Util … CLAUDE.md` (chỉ đọc) bị chặn nhầm | Sửa: cờ `-M`/`-m`/`-I` không tính là sửa tại chỗ; có ca cho-qua và ca chặn |
| L-3 Câu ở `CLAUDE.md` §8 thiếu ngoại lệ tệp bị gitignore | Sửa câu |

Sau khi sửa: 33/33 bài hàng rào; 19/19 đột biến đều đỏ rồi hoàn nguyên xanh (`docs/evidence/2026-10-01-ba-hook-moi/dot-bien.log`). Người kiểm KHÔNG kiểm được: hành vi thật của Claude Code khi nạp các móc này từ `settings.json` (cần một phiên mới sau khi gộp) và bài đo giờ lúc máy rảnh.

## 8. Tệp

`.claude/hooks/cong-xanh.mjs`, `cong-xanh-lib.mjs`, `guard-tep.mjs`, `guard-tep-lib.mjs`, `guard-luat-lib.mjs`; sửa `guard-remote.mjs`, `guard-remote-lib.mjs` (xuất `candidates`), `.claude/settings.json`. Bài kiểm: `src/claude-cong-xanh.test.ts`, `src/claude-guard-tep.test.ts`, `src/claude-guard-luat.test.ts`. Bằng chứng: `docs/evidence/2026-10-01-ba-hook-moi/`.
