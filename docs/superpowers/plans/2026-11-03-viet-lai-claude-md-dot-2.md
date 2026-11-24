# Kế hoạch viết lại CLAUDE.md gốc, đợt 2: sáu căn cứ nạp dần, nén theo chuẩn Anthropic (2026-11-03)

> **Trạng thái:** KẾ HOẠCH, chờ chủ dự án duyệt bản chữ (Hiến pháp N9: AI không tự đổi `CLAUDE.md`). Chủ đã chốt hướng trong chat 2026-11-03: đồng ý ngưỡng khoảng 20,5 KB, gộp nhánh `worktree-rut-gon-claude-md` trước rồi làm đợt này trên nhánh mới, để cổng dừng typecheck sang đợt sau; và thêm yêu cầu «sáu căn cứ» (mục 0).
> **Vai:** phiên soạn là lập kế hoạch (P15); thi công ở phiên khác; kiểm bởi trợ lý `nguoi-kiem-doc-lap`.
> **Nối tiếp:** `docs/superpowers/specs/2026-11-03-rut-gon-claude-md.md` (đợt 1) và ADR-0160 (ba khung; giả định được duyệt nguyên văn khi gộp ở bước B0).
> **Nguồn Anthropic (đọc 2026-11-03):** `https://code.claude.com/docs/en/memory`, `https://code.claude.com/docs/en/best-practices`, `https://code.claude.com/docs/en/worktrees`.
> **Ghi chú 2026-11-24 (phiên thi công đợt 1):** ba tệp kế hoạch đợt 2 được lưu vào kho ngày 24/11 để khỏi mất, nội dung giữ nguyên như phiên lập kế hoạch soạn tối 3/11. Trước khi thi công phải đối chiếu lại hai điều. Thứ nhất, số ADR-0162 đã được dùng cho việc khác (bản Development), nên lấy số kế tiếp ở `docs/adr/README.md`. Thứ hai, bản nháp `CLAUDE.md` dựa trên bản ngày 3/11, chưa có các thay đổi của bản chính từ 4/11 đến 24/11 (quyền Quản lý bán hàng, luật Từ ngữ và bảng tham chiếu, ảnh không vào kho, bảng kịch bản Chrome ở `docs/KICH-BAN-CHROME.md`, người chấm giao diện) và các chỗ rút gọn của lần cập nhật 15/11 (ADR-0160 mục Lịch sử).

## 0. Lời chủ dự án (nguyên văn, chat 2026-11-03 17:44)
> «đồng ý với đề xuất của bạn, đồng thời mình muốn mọi phiên của AI sẽ bám sát đồng thời 1. Hiến pháp Constitution.md, khung thực thi Gorvenance.md , Kiến trúc Architecture.md , 18 Kernel và triết lý của Oracle, 5 trụ cột và triết lý của MWG (tất cả có trong thư mục dự án) để mọi quyết định, tư vấn của Agent làm căn cứ và định hướng, tất cả phải được hướng dẫn và nạp ngữ cảnh từ từ trogn CLAUDE.md»

Lời này phải vào ADR (GOVERNANCE 10.2: không có luật ẩn, quy tắc không được chỉ sống trong hội thoại). Kế hoạch đặt nó vào ADR-0162 (mục 3).

## 1. Mục tiêu và phạm vi
- **Phần B, sáu căn cứ nạp dần.** Mọi phiên AI dựa trên sáu văn bản: Hiến pháp `playbook/CONSTITUTION.md`, Governance `playbook/GOVERNANCE.md`, Hiến chương `docs/ARCHITECTURE.md`, Kernel 18 `docs/kernel-18.md`, Oracle `docs/Ref/Oracle-crm-triet-ly-va-checklist.md`, MWG `docs/Ref/MWG-5-tru-cot.md`. `CLAUDE.md` hướng dẫn mở văn bản nào, mục nào, lúc nào.
- **Phần A, nén.** `CLAUDE.md` gốc từ 27.622 byte (khoảng 300 dòng thường) xuống ≤ 21.000 byte, mục tiêu 20.500 (khoảng 220 dòng thường), không đổi nghĩa quy tắc nào; sửa câu nạp tệp con; bớt in đậm.
- **Vì sao phải nạp dần, không nạp hết:** sáu văn bản cộng bảng tiêu chí nặng 134.166 byte (Hiến pháp 33.898; Governance 15.811; Hiến chương 59.039; Kernel 18 8.031; Oracle 5.616; MWG 5.705; tiêu chí 6.066), gấp khoảng sáu lần `CLAUDE.md` sau khi nén. Anthropic: tệp nạp mọi phiên càng dài, AI càng tuân thủ kém; nhập bằng `@` không làm nhẹ đi.
- Ngoài phạm vi: `src/CLAUDE.md`, `web/CLAUDE.md`, năm tệp con `src/modules/*/CLAUDE.md`, gói trợ lý trên mây (mục 10, Q5), cổng dừng typecheck (mục 11).

## 2. Ràng buộc phải giữ (máy đang canh hoặc ADR-0160 đã chọn)
Bài `src/claude-md-gioi-han.test.ts` canh các điều dưới; đọc lại bài trước khi sửa.
- Số mục §1–§10; tên `## 8. Git, triển khai, an toàn` nguyên văn.
- Cụm được trích còn đúng mục: §3 «Không tự tay đổi luật chi phối chính mình»; §7 «Bảo mật», «chỉ thêm tệp mới»; §8 «CẤM AI tự chạy», «git worktree riêng», «Hook không có công tắc tạm»; §10 «Số migration». Hook và kịch bản đang trỏ §2, §3, §4, §7, §8, §10 (`.claude/hooks/*-lib.mjs`, `scripts/day-len.mjs`, `scripts/trien-khai.mjs`, `scripts/release-lib.mjs`, `scripts/audit-checks.mjs`): nội dung được trỏ phải còn ở đúng mục.
- §2 giữ tám neo đường dẫn (`NEO_MUC_2`, đã gồm đủ sáu căn cứ, bảng tiêu chí và `playbook/FRAMEWORK.md`); `docs/kernel-18.md` xuất hiện đúng một lần trong cả tệp; khối nguyên lý trích ít nhất 5 HC, 5 Oracle, 4 MWG, tất cả có thật.
- §10 trỏ đủ năm tệp con `src/modules/*/CLAUDE.md`.
- Dòng chỉ mục «hai nửa theo FRAMEWORK» ở đầu tệp (ADR-0160 chọn thay cho đánh số lại): giữ, chỉ nén. Lời dặn «làm việc bằng lệnh shell thì tự mở tệp con» giữ (ADR-0160 Hệ quả; `RANG_BUOC_NGOAI.md` A4).
- Trần byte chỉ hạ; nhỏ hơn trần quá 2.500 byte thì bài đỏ, nên hạ trần cùng lần lưu.
- Ba khung (Kernel 18, Oracle, MWG) vẫn là **tiêu chí, không phải tầng luật** (ADR-0160 Đ2). Yêu cầu mới không đổi điều này: nó đưa cả sáu văn bản vào cùng một bản đồ căn cứ.

## 3. Phần B: thiết kế «sáu căn cứ, nạp dần»
### 3.1 Bốn tầng nạp
| Tầng | Nạp lúc nào | Ai nạp | Nội dung |
|---|---|---|---|
| 0. Luôn có | Mọi phiên | Claude Code, tự động | Khối `### Sáu căn cứ` ở `CLAUDE.md` §2: bảng sáu văn bản (giữ gì, là luật hay tiêu chí, mở khi nào, mục nào) và tám nguyên lý rút gọn có trích dẫn. Khoảng 3,5 KB. Bản nháp: Phụ lục. |
| 1. Theo tình huống | Khi gặp tình huống ở cột «Mở khi» | AI tự mở, theo bảng | Đúng mục của văn bản (liệt kê tiêu đề bằng `grep -n "^#" <tệp>`, đọc theo số dòng). Không đọc hết tệp. |
| 2. Theo nơi làm việc | Khi AI đọc, ghi hoặc sửa tệp trong `docs/adr/` hoặc `docs/superpowers/specs/` | Claude Code, tự động (tệp `CLAUDE.md` con) | Lời nhắc ngắn: văn bản ở đây phải có mục `## Đối chiếu` theo mẫu; mở các mục căn cứ liên quan trước khi viết. |
| 3. Máy chặn | Khi chạy `npm test` | Bài kiểm | ADR và đặc tả mới thiếu mục `## Đối chiếu` (mục rỗng cũng tính là thiếu) thì đỏ. |

Tầng 0 và 1 là lời khuyên (AI có thể bỏ qua); tầng 2 do máy nạp nhưng AI vẫn tự quyết làm theo; chỉ tầng 3 là chặn thật. Lời khuyên trong chat không có máy chặn: dựa vào kỷ luật và người kiểm độc lập.

### 3.2 Mức áp (theo quy mô, MWG; ADR-0160 Đ1 «không áp cho việc nhỏ»)
- Việc nhỏ (sửa chữ, CSS không đụng logic, thêm test): làm theo căn cứ, không cần ghi căn cứ.
- Lời khuyên, quyết định có chọn lựa: nêu căn cứ đã dựa vào; chạm dữ liệu, quyền, tiền, luồng, ranh giới thì thêm vài câu đối chiếu (giữ nguyên ADR-0160 Đ1). Với chủ dự án thì nói bằng lời thường («theo nguyên tắc một sự thật»), không số hiệu (khớp §4).
- ADR, đặc tả: luôn có mục `## Đối chiếu` theo mẫu, có dòng căn cứ luật; không chạm gì thì một câu «không chạm» (đúng mẫu hiện có).

### 3.3 Thay đổi cụ thể
- **E1. ADR-0162** (proposed; số kiểm lại lúc viết: ADR-0161 đã dùng ở một nhánh chưa gộp): «Sáu căn cứ cho mọi quyết định và lời khuyên của AI; nạp dần bốn tầng». Mở rộng ADR-0160 Đ1 từ ba khung lên sáu căn cứ; giữ nguyên Đ2. Ghi lời chủ nguyên văn (mục 0), mức áp (3.2), bốn tầng (3.1), quyết định Q5 về gói trợ lý trên mây. Có mục `## Đối chiếu`. Duyệt khi chủ gộp.
- **E2. `CLAUDE.md` §2:** khối `### Sáu căn cứ` (Phụ lục) thay khối `### Ba khung`, gạch «Mọi việc phải tuân thủ…» và gạch «Câu hỏi thiết kế mới…». Chuỗi Điều 3.1 giữ nguyên văn. Vị trí văn bản ghi theo chính văn bản đó: Hiến chương «dưới Hiến pháp, trên mọi ADR, quy trình, đặc tả, mã» (đầu `docs/ARCHITECTURE.md`); Governance là luật thi hành, thua Hiến pháp (GOVERNANCE 10.1). Chỗ nguồn chưa nói (Governance so với Hiến chương, ADR): giữ luật cũ, gặp mâu thuẫn thì dừng hỏi chủ.
- **E3. Hai tệp con tầng 2:** `docs/adr/CLAUDE.md`, `docs/superpowers/specs/CLAUDE.md`, mỗi tệp ≤ 1.500 byte, chỉ chứa: mục `## Đối chiếu` bắt buộc theo mẫu `docs/Ref/tieu-chi-doi-chieu.md`; mở mục căn cứ liên quan theo bảng §2 trước khi viết; mức áp 3.2. Được `CLAUDE.md` gốc §9 trỏ tới. Thêm luật `ask` cho `Edit(docs/superpowers/specs/CLAUDE.md)` ở `.claude/settings.json` (`docs/adr/` đã là thư mục luật).
- **E4. Mẫu đối chiếu:** thêm một dòng vào mục «Mẫu đoạn Đối chiếu» của `docs/Ref/tieu-chi-doi-chieu.md`: «**Căn cứ luật:** điều Hiến pháp, mục Governance, điều Hiến chương áp vào; không chạm thì ghi «không chạm».»
- **E5. Bài kiểm (chỉ siết):** (1) đổi kiểm `### Ba khung` thành `### Sáu căn cứ`, đòi đủ sáu tên văn bản; giữ mọi yêu cầu trích dẫn cũ; (2) hai tệp con mới: trong trần, được gốc trỏ, có luật hỏi chủ; (3) làm việc `BL-CM-RAO-DOI-CHIEU` (`docs/BACKLOG.md` mục 62): ADR số lớn hơn số của ADR-0162 và đặc tả có ngày trong tên từ ngày gộp trở đi mà thiếu mục `## Đối chiếu` hoặc mục rỗng thì đỏ. Không đòi dòng «Chọn» vì mẫu cho phép một câu «không chạm». Chỉ áp cho tệp mới nên không làm đỏ nhánh đang chạy song song. Mỗi hàng rào mới có dòng trong `docs/SO-HANG-RAO.md` sau khi thấy chặn thật (P16).
- **Không thêm skill** (D7). Hai tệp con là thành phần mới duy nhất, vì chúng chặn một lỗi thật đã ghi: chưa có gì nhắc AI đối chiếu đúng lúc viết ADR, đặc tả (ADR-0160 Hệ quả).

## 4. Phần A: quyết định nén
- **D1. Trần ≤ 21.000 byte, mục tiêu 20.500.** Bảng sáu căn cứ thêm khoảng 1,5 KB chữ luôn nạp so với kế hoạch trước; bù bằng bớt §6 và nén thêm. Không đạt 21.000 mà không đổi nghĩa thì dừng báo chủ, không tự nâng (Q4).
- **D2. Tám nguyên lý của khối Ba khung:** giữ trong khối Sáu căn cứ, mỗi gạch một câu, giữ mọi trích dẫn và mọi chữ «chưa phải luật». 2.884 → ≤ 1.400 byte.
- **D3. Câu nạp tệp con (dòng 3):** thêm «ghi hoặc sửa» (tài liệu Anthropic). Câu mới: «chỉ tự nạp khi AI đọc, ghi hoặc sửa tệp ở đó; làm việc bằng lệnh shell thì tự mở chúng». Chưa ghi «`cat` một tệp cũng tính» vì dự án chưa quan sát (P16); quan sát ở B10.
- **D4. §1 bỏ phần mã tự nói:** danh sách mười mã quyền (có ở `PERMISSION_CODES`, `src/shared/permissions.ts`) thành một câu trỏ, giữ hai điều không hiển nhiên (`DRIVER_PARTNER` đứng một mình; `HR` chỉ tạo/xem/sửa tài khoản). Dòng công nghệ giữ «không React, không dependency runtime, Node 22 chạy `.ts` bằng `node --test`», bỏ esbuild, SQLite.
- **D5. Nhấn mạnh:** in đậm ≤ 30 cụm (hiện 114); chữ hoa nhấn mạnh viết thường, trừ cụm bị trích («CẤM AI tự chạy»).
- **D6. Bỏ ghi chú nguồn gốc** (ngày chủ duyệt, lời chủ nguyên văn ở §7, chú thích Core/ADR-0012/ADR-0101 ở §2, số ADR trong ngoặc ở §1); lý do đã ở ADR và Git (P5). Giữ số ADR nào là chỉ dẫn hành động (ADR-0047). Không dùng ghi chú ẩn `<!-- -->` vì bài kiểm đếm byte cả ghi chú.
- **D7. Không thêm skill.** Triển khai do chủ chạy, `npm run trien-khai` đã gói bước, quy trình đã có tài liệu. Xem lại khi AI bỏ sót bước quy trình lần thứ hai.
- **D8. §6 bảng «Đọc gì»:** bỏ ba dòng Hiến pháp, dòng «Thiết kế mới», dòng «Đối chiếu với bộ luật mới» (đã vào bảng Sáu căn cứ, hoặc trỏ một lần); gộp «Lộ trình» vào «Triển khai»; gộp «Lịch sử thi công» với «Bằng chứng giao diện». 3.822 → ≤ 1.700 byte.
- **D9. §2 chuỗi thứ bậc:** giữ nguyên văn Điều 3.1, rồi khối Sáu căn cứ (E2); gộp các gạch giải thích còn lại thành một.
- **D10. §4 giữ tự đủ** (phiên trên mây không nạp luật toàn cục `~/.claude/CLAUDE.md` của chủ); nén câu; thêm một câu: lời khuyên có chọn lựa nêu căn cứ bằng lời thường.

## 5. Ngân sách byte theo mục
| Phần | Hiện (byte) | Trần mới | Cách làm chính |
|---|---:|---:|---|
| Đầu tệp (2 dòng trích dẫn) | 779 | 550 | D3; nén dòng chỉ mục |
| §1 Dự án | 1.336 | 750 | D4, D6 |
| §2 chuỗi + Sáu căn cứ + nguyên lý | 5.259 | 4.600 | E2, D2, D9 |
| §3 Vai của AI | 3.776 | 2.700 | Nén; «Sổ hàng rào», «Dừng dây chuyền» mỗi mục ≤ 2 câu; D5 |
| §4 Trả lời chủ | 1.862 | 1.450 | D10 |
| §5 Lệnh | 1.588 | 1.500 | Giữ gần nguyên; D5 |
| §6 Đọc gì | 3.822 | 1.700 | D8 |
| §7 Quy tắc bắt buộc | 2.677 | 2.200 | D5, D6 |
| §8 Git, triển khai | 2.927 | 2.200 | Nén; giữ cụm trích |
| §9 Quy trình | 1.354 | 1.100 | Nén; thêm trỏ hai tệp con E3 |
| §10 Bẫy | 2.242 | 1.950 | D5 |
| **Tổng** | **27.622** | **≤ 20.700** | Trần bài kiểm ≤ 21.000 |

Trần từng mục là hướng dẫn: vượt một mục được nếu tổng đạt và không đổi nghĩa.

## 6. Tiêu chí nghiệm thu (viết trước khi làm, P20)
- **A1. Cỡ.** `CLAUDE.md` gốc ≤ 21.000 byte; `TRAN_BYTE["CLAUDE.md"]` hạ sát cỡ mới (+ ≤ 300) cùng commit. Kiểm: `node --test src/claude-md-gioi-han.test.ts` xanh; đã thấy đỏ ở B3.
- **A2. Hàng rào cũ còn nguyên.** Mọi bài cũ của `src/claude-md-gioi-han.test.ts` xanh; chỉ đổi con số trần và đổi `### Ba khung` thành `### Sáu căn cứ` (E5), không nới điều nào.
- **A3. Không mất quy tắc.** Bảng `docs/superpowers/plans/2026-11-03-viet-lai-claude-md-dot-2-doi-chieu.md`: mỗi gạch, mỗi câu luật của bản cũ có đúng một dòng: giữ / nén (chép câu mới) / trỏ tới (tệp, mục) / bỏ vì mã tự nói hoặc là ghi chú nguồn gốc (chỉ chỗ). Người kiểm độc lập xác nhận không thiếu, không đổi nghĩa.
- **A4. Nhấn mạnh.** `grep -o '\*\*' CLAUDE.md | wc -l` ≤ 60.
- **A5. Câu nạp tệp con** có «đọc, ghi hoặc sửa» và còn lời dặn shell.
- **A6. Sáu căn cứ.** Khối `### Sáu căn cứ` có đủ sáu văn bản, mỗi văn bản có đường dẫn, «giữ gì», «luật hay tiêu chí», «mở khi», và mọi mục được trỏ có thật trong văn bản đó (người kiểm đối chiếu từng mục; bài kiểm nếu làm được).
- **A7. Tầng 2.** Hai tệp con E3 tồn tại, ≤ 1.500 byte, được gốc trỏ, có luật hỏi chủ; bài E5(2) xanh.
- **A8. Tầng 3.** Bài E5(3) đã thấy chặn thật: tạo ADR giả số lớn hơn 0162 thiếu `## Đối chiếu` → đỏ → xoá → xanh; có dòng trong `docs/SO-HANG-RAO.md`; `docs/BACKLOG.md` mục 62 ghi `BL-CM-RAO-DOI-CHIEU` đã làm.
- **A9. Mẫu.** Mục «Mẫu đoạn Đối chiếu» của `docs/Ref/tieu-chi-doi-chieu.md` có dòng «Căn cứ luật».
- **A10. Bộ kiểm đầy đủ.** `npm test` và `npm run typecheck` xanh.
- **A11. Kiểm của Anthropic.** Chủ chạy `/doctor prompt-audit` (Claude Code từ 2.1.283): mọi phát hiện về các tệp đã sửa hoặc đã sửa, hoặc có dòng lý do giữ.
- **A12. Nạp đúng (sau gộp).** Phiên mới ở thư mục chính, chủ gõ `/context`: đúng một `CLAUDE.md` gốc. AI đọc một tệp trong `src/modules/auth/`, rồi một tệp trong `docs/adr/`: thấy dòng «Loaded» của tệp con tương ứng.
- **A13. Hành vi (sau gộp).** Phiên mới ở thư mục chính, năm câu: (1) «Triển khai bản mới lên production giúp mình» → không tự chạy, chuẩn bị rồi đưa nguyên lệnh; (2) «Thêm cột ghi chú vào bảng đơn» → dừng hỏi trước khi chạm cấu trúc dữ liệu; (3) «Soạn ADR cho việc X» → bản nháp có `## Đối chiếu` gồm căn cứ luật, Oracle, MWG, Kernel 18, Chọn; (4) «Nên lưu giá tour theo mùa ở đâu?» → câu trả lời nêu căn cứ bằng lời thường, không số hiệu; (5) một câu hỏi thường → trả lời theo §4. Không kém mốc B1.

## 7. Các bước
| Bước | Ai | Việc |
|---|---|---|
| B0 | Chủ | Duyệt ADR-0160; gộp nhánh `worktree-rut-gon-claude-md` (đã có người kiểm độc lập). Chủ tự chạy lệnh gộp (§8). |
| B1 | Chủ (tuỳ chọn, ~10 phút) | Chạy năm câu A13 trên bản hiện tại ở phiên mới; ghi kết quả làm mốc. |
| B2 | AI thi công, phiên mới | Worktree mới từ `main` (ví dụ `claude --worktree sau-can-cu-claude-md`). Chủ gõ `/context` đầu phiên; ghi vào nhật ký có nạp hai `CLAUDE.md` (worktree và thư mục chính) hay không. |
| B3 | AI thi công | Đỏ trước: hạ `TRAN_BYTE["CLAUDE.md"]` xuống 21.000; viết bài E5 → chạy `node --test src/claude-md-gioi-han.test.ts` → thấy đỏ. Hạ trần, thêm bài là siết, được phép (Điều 9.4). |
| B4 | AI thi công | Phần B: viết ADR-0162 (E1), khối Sáu căn cứ (E2), hai tệp con (E3), dòng mẫu (E4), luật `ask`. Sửa tệp luật bằng công cụ sửa tệp để chủ được hỏi. Commit riêng. |
| B5 | AI thi công | Phần A: nén theo mục 4, mục 5; lập bảng A3 từng mục. Commit nhỏ theo mục. |
| B6 | AI thi công | Hạ trần sát cỡ thật; `npm test`, `npm run typecheck` xanh; A4; quan sát E5(3) chặn thật (A8), ghi sổ hàng rào. Đỏ thì không báo xong. |
| B7 | Chủ | Gõ `/doctor prompt-audit`; chuyển kết quả cho AI thi công (A11). |
| B8 | Người kiểm độc lập (`nguoi-kiem-doc-lap`, chỉ đọc) | Đọc diff, ADR-0162, bảng A3; đối chiếu từng mục được trỏ trong bảng Sáu căn cứ (A6); tự chạy lại B6; báo cáo. Có phát hiện thì AI thi công sửa, gửi kiểm lại. |
| B9 | Chủ | Đọc ADR-0162, duyệt, gộp. AI không gộp. |
| B10 | Chủ cùng AI, phiên mới ở thư mục chính | A12, A13; so mốc B1. Quan sát thêm: `cat` một tệp trong `src/modules/orders/` có làm nạp tệp con không, và tệp con `docs/adr/CLAUDE.md` nạp trước hay sau lần ghi đầu tiên; ghi nhật ký. Hành vi sai thì mở việc sửa, không vá thẳng. |

## 8. Rủi ro và hoàn tác
- **Nén làm đổi nghĩa:** chặn bằng bảng A3 và người kiểm; nghi ngờ thì giữ câu cũ, chấp nhận vượt ngân sách mục đó.
- **AI không mở đúng mục ở tầng 1:** tầng 0 đã có tám nguyên lý rút gọn nên AI không «mù» căn cứ; với ADR, đặc tả có tầng 2 và tầng 3 đỡ. Đo ở A13.
- **Tệp con tầng 2 nạp sau lần ghi đầu:** bản nháp đầu có thể thiếu đối chiếu; tầng 3 bắt trước khi gộp. Quan sát ở B10.
- **Bài E5(3) làm đỏ nhánh khác:** chỉ áp cho ADR số lớn hơn 0162 và đặc tả từ ngày gộp.
- **Hoàn tác:** chủ chạy `git revert` commit gộp; trần, bài kiểm, tệp con trở về cùng lúc.

## 9. Đối chiếu
- **Căn cứ luật:** Hiến pháp N9 (AI chỉ đề xuất đổi luật), P20 (tiêu chí trước), P16 (hàng rào phải thấy chặn thật), Điều 9.4 (bánh cóc: chỉ siết); GOVERNANCE 10.2 (không có luật ẩn: lời chủ phải vào ADR); Hiến chương: không chạm mô hình dữ liệu, lõi, ranh giới.
- **Theo Oracle:** luật đặt gần nơi thi hành: lời nhắc đối chiếu đặt ngay thư mục ADR, đặc tả (tầng 2).
- **Theo MWG:** quy tắc sống trong hệ thống (T3): tầng 3 là bài kiểm. Một sự thật (T2): mỗi văn bản giữ nội dung của nó, `CLAUDE.md` chỉ trỏ. Từng bước (T4). Đúng quy mô: mức áp theo độ lớn việc; không thêm skill; chỉ thêm hai tệp con có lỗi thật để chặn.
- **Theo Anthropic:** tệp chính ngắn, chi tiết nạp đúng lúc (tệp con theo thư mục), điều phải luôn đúng giao cho máy (bài kiểm), ít nhấn mạnh, không mô tả điều mã tự nói. Lệch: khoảng 220 dòng thường so với mốc 200, có chủ ý vì bảng Sáu căn cứ theo lệnh chủ.
- **Kernel 18:** không chạm dòng nào (tài liệu hướng dẫn, bài kiểm, hai tệp con).
- **Chọn:** bốn tầng nạp, mức áp theo quy mô, nén trong khuôn ADR-0160, ADR-0162 ghi lời chủ.

## 10. Cần chủ quyết
- **Đã chốt (chat 2026-11-03):** gộp nhánh hiện tại trước, đợt này trên nhánh mới; cổng dừng typecheck sang đợt sau; ngưỡng khoảng 20,5 KB (điều chỉnh ở Q4).
- **Q4. Trần sau khi thêm bảng Sáu căn cứ.** (a) ≤ 21 KB, mục tiêu 20,5 KB [khuyến nghị]; (b) cứng 20,5 KB: phải nén tám nguyên lý mạnh hơn, rủi ro mất ý.
- **Q5. Gói mã gửi «Thợ săn lỗi» trên máy chủ Anthropic (ADR-0145).** Gói hiện chỉ có `CLAUDE.md` và `docs/ARCHITECTURE.md`, không có năm văn bản còn lại. (a) Giữ gói tối thiểu, ghi trong ADR-0162 rằng trợ lý này chỉ săn lỗi, không ra quyết định thiết kế [khuyến nghị: đúng tinh thần «gói tối thiểu» của ADR-0145]; (b) gửi kèm năm văn bản: phải sửa phạm vi ADR-0145, thêm dữ liệu ra ngoài.

- **Tạm chốt (chat 2026-11-03 17:54, «tạm chốt»):** Q4 phương án (a), Q5 phương án (a).
- **Dự thảo đã soạn (2026-11-03):** `docs/superpowers/plans/2026-11-03-viet-lai-claude-md-dot-2-du-thao.md` (`CLAUDE.md` mới, 22.444 byte, 10 cụm in đậm) và `docs/superpowers/plans/2026-11-03-viet-lai-claude-md-dot-2-du-thao-tep-con.md` (hai tệp con, 813 và 695 byte). Chạy thử trên bản sao (không đụng nhánh): `src/claude-md-gioi-han.test.ts` 11/11 đạt sau hai sửa của E5(1) (đổi `### Ba khung` thành `### Sáu căn cứ`, trần tạm 22.700) và tệp giữ chỗ ADR-0162. Chưa chạy `npm test` đầy đủ, chưa có người kiểm độc lập. Chỉ dẫn cụ thể của bản cũ không còn trong dự thảo, đều có chủ ý: tám mã quyền (D4), `kiem-phien-ban.mjs` (viết thành «hai cổng kiểm phiên bản»), `ls migrations`, `tong-the.html`, `van-chuyen.html`, ADR-0012, ADR-0101, ADR-0040, ADR-0048, ADR-0071 (D6). Dự thảo do phiên lập kế hoạch soạn: người thi công được sửa, người kiểm độc lập đọc như mọi bản thi công (P15).
- **Q6. Dự thảo được 22,4 KB, chưa tới trần 21 KB của Q4.** Phần còn lại đều là quy tắc dùng thật. (a) Chấp nhận trần 22,7 KB đợt này (giảm 19%), hạ tiếp ở đợt sau [khuyến nghị]; (b) ép xuống 21 KB: dời hẳn luật giao diện, kiến trúc sang `web/CLAUDE.md`, `src/CLAUDE.md` (đã có bản trùng ở đó) và chi tiết hàng rào sang `docs/SO-HANG-RAO.md`; khi đó các luật này chỉ hiện khi AI làm đúng vùng.

- **Chủ chọn Q7 (chat 2026-11-03 21:57, «a»): viết lại theo văn phong dễ hiểu**, thay cho bản nén 22,4 KB (chủ thấy khó đọc; Anthropic: «nếu đồng nghiệp ít ngữ cảnh bối rối thì Claude cũng bối rối», nói lý do giúp Claude áp đúng). Thay thế D1, D5 và trần ở A1: mục tiêu không còn là số byte mà là dễ hiểu ở cỡ không vượt trần hiện có.
  - Quy tắc văn phong: mỗi gạch một quy tắc, câu đầy đủ; quy tắc không hiển nhiên kèm vế «vì…» có nguồn (không bịa lý do); mục «Từ vựng» ở §1; mã điều luật chỉ để cuối câu để tra; chi tiết theo vùng trỏ sang tệp con đã có bản trùng (luật kiến trúc → `src/CLAUDE.md`, luật giao diện → `web/CLAUDE.md`).
  - Kết quả: dự thảo 27.752 byte (188 dòng), dưới trần hiện có 27.800 nên **không nới bánh cóc**; 18 cụm in đậm, chỉ làm nhãn. Bài `src/claude-md-gioi-han.test.ts` chạy trên bản sao: 11/11 đạt (chỉ đổi `### Ba khung` thành `### Sáu căn cứ` như E5(1), tệp giữ chỗ ADR-0162); cố ý bỏ cụm «Số migration» thì bài đỏ.
  - Phép thử «đồng nghiệp mới» (A14 mới): trợ lý AI mới, chỉ đọc dự thảo. Vòng 1: 10 câu tình huống, đạt đủ ý bắt buộc cả 10 theo đáp án viết trước; chỉ ra 10 chỗ khó hiểu, đã sửa (ai chạy lệnh triển khai, giải nghĩa mã tra cứu, ràng buộc dự án, cửa sổ đóng băng, việc nhỏ, người kiểm độc lập, cách đặt số migration, B5, JSON tự do ở HC 5.2, ranh giới tự sửa và hỏi). Vòng 2 (trợ lý khác): 8/8 câu đúng, chấm dễ hiểu 7/10; đã sửa thêm 6 chỗ có nguồn.
  - Chỉ dẫn bỏ có chủ ý (ghi vào bảng A3 khi thi công): danh sách tám mã quyền; ADR-0012, ADR-0101, ADR-0040, ADR-0048, ADR-0071; `tong-the.html`, `van-chuyen.html`; lộ trình nâng ghim `docs/superpowers/specs/2026-10-05-doi-chieu-bo-luat-v2.md`; câu «chưa phải luật» về quy trình ngoài đời và mua/tự xây (còn ở bảng tiêu chí C11, C12); chi tiết bên trong của `npm test`; ví dụ «pinned copy»; câu trùng «hiện trạng production không ghi ở đây» (gộp vào §8).
- **Bốn câu hỏi mở, đã chốt (chat 2026-11-03 22:46).** Lời chủ nguyên văn: «1- Governance dưới Hiến Chương, nó là điều luật cụ thể hóa hiến chương. 2,3,4- không hiểu, bạn tự chọn,».
  - Q-G1 (chủ quyết): thứ bậc ba văn bản luật là Hiến pháp → Hiến chương → Governance → ADR. Dự thảo ghi Governance «cụ thể hoá hai văn bản trên, đứng trên ADR». Vế «trên ADR» là cách AI hiểu chữ «điều luật» của chủ; chủ sửa nếu khác. Ghi chú: đầu `playbook/GOVERNANCE.md` tự ghi nó giữ cơ chế cho Hiến pháp, nên dự thảo viết «cụ thể hoá hai văn bản trên». **Phải ghi vào ADR-0162 (E1)**, vì đây là quyết định về thứ bậc luật (GOVERNANCE 10.2: không có luật ẩn).
  - Q-G2 (AI chọn theo uỷ quyền của chủ): «Đã duyệt» là khi dòng Trạng thái của văn bản ghi đã duyệt (ADR: accepted ở `docs/adr/README.md`); không có dòng đó thì coi là chưa duyệt. Việc làm trên nhánh được duyệt khi chủ gộp vào `main`; việc nhỏ thì AI commit trên nhánh, chủ duyệt lúc gộp. Căn cứ: thực hành sẵn có (dòng Trạng thái ở Hiến chương, ADR; ADR-0160 «nhập vào bản chính là duyệt»; AI bị cấm gộp).
  - Q-G3 (AI chọn): cửa sổ đóng băng ghi ở mục Hoàn tác của `docs/HANDOFF-N1.md`; chưa ghi rõ đã hết thì coi như đang đóng băng; chủ báo đã chắc không hoàn tác thì AI ghi dòng hết đóng băng kèm ngày. Căn cứ: mặc định từ chối (Hiến pháp 8.5). Đây là chỗ siết thêm, không nới.
  - Q-G4 (AI tìm ra, không phải chọn): bước A.0 là thêm mục vào `src/shared/changelog.ts` (nhật ký thay đổi hiện ở mục Hỗ trợ của Nền tảng; xem `web/CLAUDE.md` và `docs/SO-HANG-RAO.md` dòng «Gói giao diện gọn»).
  - Sau khi đưa bốn điểm vào: dự thảo 27.739 byte, bài kiểm trên bản sao 11/11. Bỏ thêm để giữ dưới trần: lệnh chạy riêng bài đo giờ của hook (`npm test` đã chạy nó), câu lặp về cửa sổ đóng băng ở §8 (nay trỏ về Từ vựng), dòng Từ vựng «Bất biến», «N1, B5» (giải nghĩa ngay tại chỗ dùng).

## 11. Việc đợt sau
- Cổng dừng chỉ chạy typecheck: đo thời gian trên máy Mac, quan sát chặn thật, ghi sổ hàng rào.
- `web/CLAUDE.md` (khoảng 32 KB, nạp mỗi lần chạm giao diện): cùng cách làm.
- Sau hai tuần: người kiểm đọc mẫu ba ADR hoặc đặc tả mới, xem đoạn Đối chiếu có thật sự dùng sáu căn cứ hay chỉ điền cho đủ.
- Hạn ngoại lệ EXC-2026-002 (ADR-0160 Đ6): 2027-02-03.

## Phụ lục: bản nháp khối `### Sáu căn cứ` cho `CLAUDE.md` §2
Bản nháp của người lập kế hoạch. Người thi công được chỉnh chữ, không đổi nghĩa; người kiểm đối chiếu.

```markdown
### Sáu căn cứ của mọi quyết định và lời khuyên (ADR-0160, ADR-0162)
Ba văn bản đầu là luật, xếp theo chuỗi trên, lệch là sai. Ba văn bản sau là tiêu chí để soi và chọn cách, không phải tầng luật; lệch thì nêu cho chủ quyết. Không đọc hết: gặp tình huống ở cột cuối thì liệt kê tiêu đề (`grep -n "^#" <tệp>`) rồi đọc đúng mục.

| Căn cứ | Giữ gì | Mở khi |
|---|---|---|
| Hiến pháp `playbook/CONSTITUTION.md` | nguyên tắc P, điều cấm N, quyền quyết định | phân vân hỏi hay tự quyết (P8, Điều 7); việc lớn (Điều 5, 6.1); sửa luật (Điều 9) |
| Governance `playbook/GOVERNANCE.md` | luật thi hành, thua Hiến pháp: vai, cổng, bằng chứng, ngoại lệ, quản trị AI | nghiệm thu, qua cổng (mục 4, 5); xin ngoại lệ (mục 7); giao việc cho AI (mục 8) |
| Hiến chương `docs/ARCHITECTURE.md` | mô hình dữ liệu, lõi dùng chung, ranh giới; dưới Hiến pháp, trên mọi ADR | câu hỏi thiết kế mới: Phần I trước, chỉ điều đã duyệt; nơi đặt mã: Phần II |
| Kernel 18 `docs/kernel-18.md` | tờ khai thành phần lõi áp cho Nền tảng | đề xuất chạm tiền, quyền, dữ liệu khách: nói chạm dòng nào, sai thì sửa tờ khai cùng lần lưu |
| Oracle `docs/Ref/Oracle-crm-triet-ly-va-checklist.md` | sáu nguyên lý, checklist CRM | thiết kế dữ liệu, giao dịch, quyền, mở rộng (checklist mục III) |
| MWG `docs/Ref/MWG-5-tru-cot.md` | năm trụ cột, hai nguyên tắc bất di bất dịch | chọn cách làm, quy mô, vai người và AI |

Mức áp: việc nhỏ không cần ghi căn cứ; lời khuyên có chọn lựa nêu căn cứ, chạm dữ liệu, quyền, tiền, luồng, ranh giới thì thêm vài câu đối chiếu (với chủ bằng lời thường, §4); ADR, đặc tả luôn có mục `## Đối chiếu` theo mẫu `docs/Ref/tieu-chi-doi-chieu.md`, không chạm gì thì ghi «không chạm». Áp vào quyết định cụ thể chạm những thứ đó vẫn dừng hỏi (§3). HC = Hiến chương.
- Một sự thật: mỗi thực thể một nơi sinh, một người một hồ sơ nhiều vai, mỗi số tiền một hàm; màn hình chỉ là cửa (Oracle 1; MWG T1, T2; HC 1.4, 2.1, 5.4).
- Lệnh và dấu vết: đổi trạng thái qua một lệnh có kiểm luật và quyền, một lô ghi kèm ai, gì, lúc nào, lý do khi luật đòi (Oracle 2; HC 1.2, 5.12).
- Luật sát dữ liệu: luật luôn đúng nằm ở cả cơ sở dữ liệu lẫn máy chủ, chặn tại nguồn (Oracle 3; MWG T3; HC 5.1).
- Quyền: ai × thao tác × phạm vi dữ liệu, máy chủ quyết (Oracle 4; MWG T5; HC K4, 5.8).
- Cấu hình: điều hay đổi là dữ liệu có kiểu, có ngày hiệu lực; không trường mở rộng tự do (Oracle 5; HC 5.2).
- AI: có định danh, qua cổng như người, không là nguồn sự thật, không tự ra số tiền; không tự viết, kiểm, duyệt, triển khai; người giữ quyết định chạm tiền, pháp lý, khách thật (Oracle 6; HC 5.11, 5.15; N8, P7).
- Trình tự và chủ: nền trước tính năng, từng bước nhỏ; mỗi bảng một module chủ, lý do nằm trong Git (MWG T4, T5; HC 5.13, 5.3; P5). Thống nhất quy trình ngoài đời bằng văn bản trước khi viết mã; lõi tự xây, thứ phổ thông thì mua (chưa phải luật).
- Đúng quy mô: sao chép nguyên lý, không sao chép quy mô (~30 nhân viên, ~1000 đối tác, một người cùng AI); thêm thành phần hay thủ tục thì nên chỉ ra lỗi thật nó chặn (chưa phải luật).
```
