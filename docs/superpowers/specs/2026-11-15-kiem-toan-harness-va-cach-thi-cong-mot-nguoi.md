# Kiểm toán lại theo khung Harness và cách thi công cho một người — 2026-11-15

Hồ sơ có ngày, viết xong đóng băng. Nối tiếp `2026-11-13-kiem-toan-cach-lam-vibe-coding.md` và thay phần đề xuất của bản đó. Người làm: phiên AI trên nhánh `claude/vibe-coding-audit-2bdc6e`, chỉ đọc, không sửa mã và không sửa tệp luật. Số đo lấy ngày 15/11 trên bản chính `1e715c858`. Kết quả một vòng kiểm độc lập về số liệu ghi ở mục II.10.

## Phần I. Trang cho chủ dự án

### 1. Kết luận

Harness là mọi thứ bao quanh AI khi nó làm việc: những gì nó phải đọc lúc mở phiên, công cụ nó được dùng, lớp chặn của máy, bài kiểm, và cách ghi lại trạng thái. Theo Anthropic, chất lượng việc AI làm phụ thuộc vào bộ khung này nhiều hơn vào lời dặn.

Hiến pháp của dự án đã nói đúng gần hết điều Anthropic khuyên: luật phải có máy cưỡng chế (P16), người làm không tự nghiệm thu (N8), tiêu chí "xong" viết trước khi làm (P20), trạng thái nằm trong tệp (P19). Chỗ lệch nằm ở cách thi hành. Phần chữ (luật, bản ghi quyết định, sổ, ghi chú) lớn nhanh hơn nhiều so với phần máy (lớp chặn, bài kiểm nhanh, máy tự ghi trạng thái). Chủ dự án thì đang gánh ba vai mà một người khó gánh lâu: duyệt giấy tờ, tự gõ lệnh phát hành, tự thử trên iPhone.

Cách làm đúng cho một người là đảo lại: máy giữ luật và tự kiểm, AI tự chạy trọn một việc, chủ chỉ duyệt hai lần cho mỗi việc.

### 2. Việc gấp hôm nay

Kho mã trên GitHub đang để công khai. Chủ đã xác nhận điều này ngày 6/11 để máy kiểm của GitHub chạy miễn phí (ADR-0179). Nhưng điều kiện mà ghi chú của dự án đặt ra từ 19/9, là gỡ dữ liệu nhạy cảm trước khi công khai, chưa được làm:

- Địa chỉ bảng Google Sheet nhân viên nằm trong kho, và hôm nay người lạ không cần đăng nhập vẫn tải được bảng đó. Theo ghi chú của dự án, bảng chứa tên và số điện thoại nhân viên (tôi chỉ kiểm rằng mở được, không tải nội dung). Nền tảng đã thôi đọc bảng này từ 1/10, nên tắt chia sẻ không ảnh hưởng gì.
- Bảng giá dịch vụ cũng mở như vậy. Nền tảng cần nó mở để đồng bộ, nên các cột nội bộ trong bảng giá đang coi như công khai.
- Kho còn công khai sổ ghi ba lỗi bảo mật mức cao đang mở, các báo cáo kiểm toán, và vài dòng có số điện thoại trong tài liệu cũ.

Việc chủ nên làm ngay: mở bảng nhân viên trên Google Sheet, bấm Chia sẻ, đổi "Bất kỳ ai có đường liên kết" thành "Bị hạn chế". Phần còn lại là quyết định 1 ở mục 7.

### 3. Dự án so với tám điều Anthropic khuyên

| Điều Anthropic khuyên | Dự án hôm nay | Nhận xét |
|---|---|---|
| 1. AI phải có phép kiểm tự chạy được, ra đạt hay không đạt | 928 tệp kiểm; máy kiểm GitHub khoảng 10 phút một lượt. Nhưng 17% lượt phải chạy lại, không có kiểm nhanh tại chỗ, không có kiểm tự động trên iPhone | Có nhiều, chưa nhanh, chưa đủ tin |
| 2. Người làm và người kiểm là hai phiên khác nhau | Có người kiểm độc lập. Nhưng nó vẫn sửa được tệp, và bảy đợt kiểm toán sau này vẫn tìm ra lỗi nặng trong mã đã nhập | Có, chưa chặt |
| 3. Điều cấm tuyệt đối phải do máy chặn | Có hai lớp chặn cho đường chạy lệnh thường. Còn hở đường Terminal; bản chính trên GitHub chưa khoá; kho công khai còn dữ liệu nhạy cảm | Tốt ở lõi, hở ở rìa |
| 4. Lượng chữ AI đọc mỗi phiên phải ít | Khoảng 64 KB lúc mở phiên, lên 108 KB khi làm giao diện và máy chủ. Mức khuyên là mỗi tệp luật dưới 200 dòng ngắn | Yếu |
| 5. Trạng thái nằm trong tệp, máy ghi được thì để máy ghi | Sổ trạng thái ghi tay đang chậm: ghi bản 3.0, bản chạy thật là 3.5. Bộ nhớ của AI ghi kho mã "riêng tư" suốt thời gian kho đã công khai | Yếu |
| 6. Bộ khung phải gọn, định kỳ gỡ phần không còn cần | 191 bản ghi quyết định, thêm gần 3 bản mỗi ngày; chưa có nhịp gỡ bớt | Yếu |
| 7. Con người duyệt ý định và kết quả cuối | Chủ duyệt gần 3 bản ghi quyết định mỗi ngày (có ngày 8), và tự gõ lệnh cho khoảng 4 số phiên bản mới mỗi ngày | Lệch nhiều nhất |
| 8. Làm song song thì mỗi việc một bản riêng, có giới hạn | 21 bản làm việc riêng; 7 bản còn phần chưa lưu; 16 nhánh chưa nhập bản chính | Quá tải |

Ngoài bảng: phép kiểm mạnh nhất là người dùng thật. Theo hồ sơ rà soát 7/11, nhân viên chưa dùng hằng ngày; hôm nay bản chạy thật đang bật chế độ bảo trì tới 13:34 ngày 16/11. Tôi chưa kiểm được hiện đã có ai dùng thật chưa. Nếu chưa, việc đáng làm sớm là cho một nhóm nhỏ dùng thật, vì không bài kiểm nào thay được.

### 4. Cách thi công đề xuất: mỗi việc hai lần duyệt

Mỗi việc đi qua sáu bước. Chủ chỉ có mặt ở bước 1 và bước 4.

1. **Chốt phiếu việc (chủ duyệt lần 1).** Chủ nói muốn gì bằng lời thường. AI đọc mã và luật trước, hỏi một lần tối đa ba câu, rồi viết phiếu một trang: mục tiêu, "xong khi" viết bằng ví dụ nhìn thấy được (bấm gì, thấy gì; việc có tiền thì ví dụ bằng con số), và loại việc (nhỏ hay lớn).
2. **AI tự làm trọn việc** trong bản làm việc riêng, ở một phiên mới chỉ đọc phiếu. Nó viết bài kiểm từ các ví dụ trong phiếu trước, rồi viết mã tới khi máy báo đạt. Không hỏi giữa chừng, trừ khi lộ ra một quyết định mới về tiền, quyền hay dữ liệu.
3. **Máy kiểm.** Lúc AI định báo xong, máy tự chạy kiểm nhanh và không cho dừng nếu còn đỏ. Trước khi nhập bản chính, máy kiểm của GitHub chạy đủ bộ. Việc lớn có thêm một phiên kiểm độc lập, chạy trên bản sao riêng, chỉ so kết quả với các ví dụ trong phiếu.
4. **Xem kết quả (chủ duyệt lần 2).** AI trình một trang: ảnh thật trên điện thoại và máy tính, hoặc đường dẫn bản thử để chủ bấm trên iPhone; máy đã kiểm gì; điều gì chưa kiểm. Chủ trả lời "phát hành" hoặc "sửa".
5. **Phát hành theo chuyến.** Mặc định mỗi ngày một chuyến, gom các việc chủ đã gật; việc gấp vẫn đi riêng được. Chủ gõ một lệnh như hiện nay, máy tự ghi trạng thái sau khi lên.
6. **Đóng việc.** Bản làm việc riêng được dọn ngay. Việc mở quá bảy ngày phải có quyết định làm tiếp hay bỏ.

Ba giới hạn giữ cho một người kham nổi:

- Tối đa ba việc mở cùng lúc: một việc lớn và hai việc nhỏ. Con số này là đề xuất của tôi; Anthropic không đưa con số.
- Bản ghi quyết định (ADR) chỉ viết cho quyết định khó quay lại hoặc đổi kiến trúc, đúng như luật hiện hành của dự án. Quyết định của một tính năng nằm ngay trong phiếu việc.
- Luật "không được sai" phải thành lớp chặn của máy hoặc bài kiểm. Luật chỉ là thói quen thì viết ngắn hoặc bỏ. Mỗi tháng một buổi gỡ bớt, và mỗi lần đổi đời AI thì thử lại xem luật nào còn cần.

### 5. Ba hướng đã cân nhắc

- **A. Chỉ đóng chỗ hở.** Làm Bước 1 ở mục 6 rồi dừng. Ít xáo trộn nhất, nhưng tải lên chủ không giảm và phần chữ tiếp tục phình.
- **B. Đổi vòng làm việc, đi ba bước (khuyến nghị).** Giữ nguyên Hiến pháp và mọi điều cấm; chỉ đổi cách thi hành theo mục 4. Bước sau chỉ mở khi bước trước xong.
- **C. Viết lại cả bộ luật theo khung Harness.** Tốn công nhất, dễ thành một đợt giấy tờ mới, và ngược lời chốt ngày 5/10 của chủ là giữ lõi, bỏ thủ tục. Tôi không khuyến nghị.

### 6. Ba bước đưa vào dùng (nếu chọn B)

Thời gian là ước lượng. Mỗi bước khi tới lượt có một trang riêng và tối đa ba quyết định.

- **Bước 1, đóng chỗ hở và giảm tải (một đến hai ngày).** Lớp chặn phủ cả đường Terminal. Khoá bản chính trên GitHub. Sửa đoạn mô tả môi trường trong cài đặt máy của chủ. Người kiểm độc lập chạy trên bản sao riêng. Dọn 21 bản làm việc riêng; bảy bản còn phần chưa lưu thì chủ quyết từng bản. *Xong khi:* thử lệnh cấm qua Terminal thì bị chặn; đẩy thẳng vào bản chính một lần lưu chưa kiểm thì GitHub từ chối; còn không quá ba bản làm việc riêng.
- **Bước 2, máy kiểm nhanh và đáng tin (khoảng một tuần).** Cổng kiểm nhẹ lúc AI dừng. Bài kiểm chạy nhanh hơn. Xử lý bài đỏ giả. Tờ tình hình do máy sinh mỗi lần mở phiên. Thử màn hình trên trình giả lập iPhone. *Xong khi:* AI không báo xong được khi kiểm nhanh còn đỏ; tỉ lệ lượt kiểm phải chạy lại dưới 2% (đang 17%); mở phiên là thấy đúng số bản đang chạy thật mà không ai phải ghi tay.
- **Bước 3, vòng hai lần duyệt (một đến hai tuần).** Mẫu phiếu việc và trang kết quả. Hoàn tất bản Development để chủ thử trước khi phát hành (tên miền dev.tourdao.vn hôm nay chưa trả lời). Rút gọn CLAUDE.md; chuyển công thức sửa nhanh và quy trình phát hành thành gói hướng dẫn mở khi cần. Luật về ADR, ba việc mở, phát hành theo chuyến. *Xong khi:* ba việc liên tiếp đi trọn vòng mà chủ chỉ duyệt hai lần mỗi việc.

### 7. Ba quyết định cần chủ

1. **Kho mã: chuyển riêng tư hay giữ công khai?** Chuyển riêng tư thì kín ngay, nhưng máy kiểm GitHub chỉ còn khoảng 40 lượt miễn phí mỗi tháng (theo ADR-0179), trong khi tám ngày qua đã chạy 60 lượt; gom phát hành theo chuyến sẽ kéo số lượt xuống gần mức đó. Giữ công khai thì phải gỡ địa chỉ bảng, số điện thoại khỏi kho và lịch sử, và đưa sổ lỗi bảo mật đang mở ra ngoài kho. Khuyến nghị: chuyển riêng tư. Giá gói trả tiền của GitHub tôi chưa kiểm.
2. **Chọn hướng A, B hay C.** Khuyến nghị B.
3. **Cho làm Bước 1 ngay.** Bước này sửa hai tệp luật của dự án (cấu hình lớp chặn, tệp người kiểm độc lập), nên cần chủ gật trước. Hai việc trong đó phải do chủ tự bấm: khoá bản chính trong cài đặt GitHub và dán đoạn mô tả môi trường vào cài đặt máy; tôi soạn sẵn từng bước.

## Phần II. Bằng chứng (cho AI và người kiểm sau)

### II.1 Số đo ngày 15/11

| Hạng mục | Số đo | Cách đo |
|---|---|---|
| Chữ nạp lúc mở phiên | `CLAUDE.md` 31.262 byte (132 dòng) + mục lục bộ nhớ 25.038 byte + `~/.claude/CLAUDE.md` 5.701 + `Projects/CLAUDE.md` 1.635 ≈ 64 KB. Thêm `web/CLAUDE.md` 34.370 và `src/CLAUDE.md` 10.431 khi AI đọc tệp ở hai thư mục đó ≈ 108 KB | `wc -c`, `git show main:<tệp> \| wc -lc` |
| `.claude/` trên bản chính | 1 trợ lý kiểm, 7 tệp lớp chặn (2 tệp cổng xanh không còn được gọi), `settings.json`. Không có skill, không có luật gắn đường dẫn. Không đổi so với 13/11 | `git ls-tree -r --name-only main .claude`, `git diff --stat HEAD main -- .claude CLAUDE.md src/CLAUDE.md web/CLAUDE.md` |
| Bộ nhớ của AI | 196 tệp (137 ghi chú dự án, 30 ghi chú cách làm, 27 tra cứu); mục lục 162 dòng, 20.976 ký tự trước khi rút gọn | `ls`, `wc` |
| Bản làm việc riêng | 21 (kể cả thư mục gốc); 7 bản còn phần chưa lưu; 16 nhánh chưa nhập bản chính | `git worktree list`, `git status --porcelain` từng bản, `git branch --no-merged main` |
| Phiên làm việc | 131 bản ghi phiên; 50 bản có hoạt động từ 8/11 | `find ~/.claude/projects -maxdepth 2 -path '*tourdao-sales*' -name '*.jsonl'` |
| Lần lưu trên bản chính | 2.173 từ 15/10; trung vị 71 mỗi ngày, cao nhất 167; 1.087 trong 14 ngày | trợ lý đo bằng `git log main --since=…` |
| Bản ghi quyết định | 191 tệp; 84 tệp thêm trong 30 ngày, cao nhất 8 trong một ngày; 91 trong 184 dòng mục lục tự ghi "hai chiều" (quay lại được) | `git ls-tree`, `awk` trên `docs/adr/README.md` |
| Số phiên bản | 52 mục nhật ký trong 12 ngày có phát hành (2–15/11). Bản chạy thật 3.5, đang bảo trì tới `2026-11-16T06:34Z`. Đầu `docs/HANDOFF-N1.md` trên bản chính ghi 3.0 | `src/shared/changelog.ts`, GET `https://booking.tourdao.vn/api/auth/config` |
| Bộ kiểm | 928 tệp `*.test.ts`; mã kiểm 160.267 dòng, mã thường 132.551 dòng (`src/`, `web/`) | trợ lý đo bằng `git ls-tree`, `wc -l` |
| Máy kiểm GitHub | 60 lượt gần nhất (7–14/11): trung vị 9,7 phút; 3 lượt đỏ; 10 lượt có `attempt` > 1 | `gh run list --workflow kiem.yml -L 60 --json …` |
| Kiểm tại máy | kiểm kiểu 6 giây; bài kiểm thư mục `billing` 221 giây (37 tệp, 411 bài); một tệp có cơ sở dữ liệu thử 13,6 giây cho 6 bài; một tệp không có 0,2 giây | `time npm run typecheck`, `time node --test …` |
| Tệp nhiều phiên cùng sửa (14 ngày) | `docs/SO-HANG-RAO.md` 117 lần; `docs/SYSTEM-DESIGN.md` 83; `src/shared/changelog.ts` 79; `docs/BANG-THAM-CHIEU.md` 74; `docs/adr/README.md` 69; `docs/CHANGE-GUIDE.md` 66; `docs/HANDOFF-N1.md` 65 | `git log main --since="14 days ago" --name-only --format=` |
| Sổ sống | `docs/SO-HANG-RAO.md` 1.479.274 byte, 31 dòng còn chữ "chưa quan sát"; sổ việc để sau 71 mục, khoảng 5 mục đã đóng; sổ hạn 26 mục, 3 mục `HIGH` | `wc -c`, `grep -c` |
| Kho mã | `visibility: PUBLIC`; `docs/evidence` 4.411 tệp; gói git 1,0 GiB (đo 13/11) | `gh repo view --json visibility`, `git count-objects -vH` |

### II.2 Đối chiếu chi tiết

Ký hiệu nguồn [S…] ở mục II.9. Mọi ý của Anthropic dưới đây là lời tóm lại, không phải trích nguyên văn.

**1. Phép kiểm AI tự chạy được** [S1, S13]. Anthropic: cho AI một thứ chạy được và trả về đạt hay không đạt thì nó tự đi tiếp được; không có thì con người thành bộ kiểm. Bộ kiểm phải gần như không sai, đầu ra ngắn, có tập con chạy nhanh, chi tiết ghi ra tệp. Dự án: nhiều bài kiểm và có máy kiểm GitHub (ADR-0179). Lệch: (a) cổng kiểm lúc AI dừng đã gỡ 19/10 vì chạy cả bộ quá 12 phút, trong khi kiểm kiểu chỉ mất 6 giây; (b) không có cơ chế tự chọn bài theo tệp đã đổi, chỉ có bảng tra tay ở `docs/CHANGE-GUIDE.md` mục 3; (c) 10 trong 60 lượt GitHub phải chạy lại; 249 tệp kiểm dùng giờ thật hoặc số ngẫu nhiên, 16 tệp dùng đồng hồ giả; bộ nhớ có ít nhất mười ghi chú về bài đỏ giả và trục trặc khi nhập, phát hành; (d) `npm test` ở máy in nguyên đầu ra, không có khối tóm tắt bài đỏ (trên GitHub thì có); (e) kịch bản Chrome chạy tay, không nằm trong máy kiểm; không có kiểm tự động trên iPhone hay Safari, 11 dòng mục lục bộ nhớ còn ghi "chưa thử iPhone"; (f) 350 tệp kiểm đọc tệp nguồn như văn bản, loại bài này khoá câu chữ và cấu trúc, dễ đỏ khi đổi chữ mà hành vi không đổi.

**2. Người làm khác người kiểm** [S1, S5, S12]. Anthropic: tách người làm khỏi người chấm là đòn bẩy mạnh; người kiểm nên là phiên mới chưa thấy lập luận của người làm; người kiểm bị yêu cầu "tìm lỗi" thì lần nào cũng tìm ra gì đó, nên phải giao đề rõ và bỏ soi câu chữ; trợ lý chỉ đọc thật thì không có công cụ Bash. Dự án: `.claude/agents/nguoi-kiem-doc-lap.md` có `tools: Read, Glob, Grep, Bash`, chạy chung cây làm việc với người thi công. Lệch: "không sửa" chỉ là lời dặn; đề bài kiểm thiên về đọc mã và chạy lại lệnh, chưa buộc so với ví dụ "xong khi" (xem II.4).

**3. Điều cấm do máy chặn** [S1, S4, S14, S15]. Anthropic: điều "không bao giờ" phải nằm ở luật cấm, lớp chặn, hộp cát; CLAUDE.md chỉ là ngữ cảnh. Luật cấm dạng mẫu lệnh Bash không phải ranh giới an ninh. Chế độ tự động giảm hộp hỏi nhưng không bảo đảm an toàn. Nên có luật bảo vệ nhánh chính. Dự án: xem II.3.

**4. Ít chữ mỗi phiên** [S1, S2, S10, S17, S18]. Anthropic: mỗi dòng CLAUDE.md lấy một phần chú ý ở mọi việc; đích dưới 200 dòng; chỉ ghi điều AI không tự tìm ra khi đọc kho; mô tả kiến trúc và cách bố trí tệp là thứ nay bỏ được; quy trình nhiều bước nên thành skill (chỉ tên và mô tả nằm trong ngữ cảnh cho tới khi dùng); luật theo vùng mã nên gắn đường dẫn; bộ nhớ tốn chỗ và trôi dần khỏi thực tế. Dự án: `CLAUDE.md` 132 dòng nhưng trung bình khoảng 237 byte một dòng; mục 1, 5, 6, 10 phần lớn là mô tả và bẫy theo từng tính năng; không có skill nào; `docs/CHANGE-GUIDE.md` (công thức) là ứng viên rõ nhất để tách. Mục lục bộ nhớ: 47 dòng mang trạng thái "đã lên bản…", 15 dòng mang trạng thái chờ.

**5. Trạng thái trong tệp, máy ghi** [S11, S13, S17]. Anthropic: phiên mới bắt đầu bằng việc đọc tệp tiến độ và lịch sử git; ghi chú chung dùng để phối hợp; bộ nhớ lệch dần khi môi trường đổi. Dự án: có nhiều sổ, nhưng đều ghi tay và là điểm tụ mọi phiên cùng sửa (II.1). Lệch quan sát được hôm nay: đầu `docs/HANDOFF-N1.md` ghi 3.0 trong khi bản chạy thật là 3.5; ghi chú bộ nhớ về kho mã ghi "PRIVATE" (đã sửa 15/11); hai phiên cùng lấy số mục 71 trong `docs/BACKLOG.md` trong hai ngày. Lớp chặn `SessionStart` có thể đưa tối đa 10.000 ký tự do máy sinh vào đầu phiên [S3].

**6. Bộ khung gọn, định kỳ gỡ** [S1, S9, S12]. Anthropic: mỗi phần của bộ khung là một giả định về điều AI chưa tự làm được; giả định cũ đi khi đời AI mới ra, nên phải thử lại và gỡ phần hết tác dụng; bắt đầu bằng cách đơn giản nhất. Dự án: chủ đã nêu đúng vấn đề này ngày 5/10 và chọn phương án gọn; sau đó vẫn thêm 84 bản ghi quyết định trong 30 ngày. ADR-0160 đang chờ sẽ thêm ba khung nữa vào CLAUDE.md. Plugin superpowers chèn một khối "bắt buộc gọi skill" vào mọi phiên và kéo AI về phía hỏi từng câu, ngược các ghi chú của chủ về gom câu hỏi; nên thử lại có còn cần không.

**7. Con người duyệt ý định và kết quả** [S1, S9, S16]. Anthropic: con người có mặt ở các điểm dừng; duyệt kết quả cuối; xem xét ý định của thay đổi thay vì đọc từng dòng; theo dõi vài lượt đầu của thứ mới trước khi để chạy không người trông. Dự án: người duyệt duy nhất không phải lập trình viên, nhưng vật được duyệt phần lớn là văn bản kỹ thuật. Một số lời duyệt do AI tự diễn giải theo câu mẫu (`docs/quyen-hoan.json`, các dòng `xay_tren_cho_phep_adr_0193`, `…_0197`). Bản Development để chủ thử trước khi phát hành chưa chạy, nên bản chạy thật đang là nơi thử.

**8. Song song có giới hạn** [S1, S7, S13]. Anthropic: mỗi phiên một bản riêng để không giẫm nhau; chạy nhiều phiên thì tốn gấp bội; lưu trữ phiên có thể làm mất phần chưa lưu. Dự án: II.1. Các bản còn phần chưa lưu: `claude/adr-0184-thi-cong` (30 tệp, 7 ngày), `claude/financial-data-security-audit-1f92e7` (10, đang làm), `claude/pickup-fee-pricing-plan-6eae32` (4, đang làm), `worktree-rut-gon-claude-md` (3, 12 ngày), `claude/luot-a-gop-y-69dd26` (2, 3 tuần), `claude/tour-account-qr-scan-setup-533817` (1, 4 tuần), `claude/account-signup-approval-flow-ee612c` (1).

### II.3 Lớp chặn: bốn chỗ hở và hai chỗ cấu hình ngược luật

1. **Đường Terminal.** `.claude/settings.json` chỉ khai lớp chặn cho `Bash` và `Edit|Write|MultiEdit|NotebookEdit`; mọi luật cấm đều dạng `Bash(...)`. Theo tài liệu [S3, S4], tên `Bash` so khớp chính xác và không phủ công cụ MCP. Thử khô 15/11: đưa cho `.claude/hooks/guard-remote.mjs` một đầu vào giả có `tool_name: "Bash"` và lệnh `git push origin main` thì trả `deny`; cùng lệnh với `tool_name: "mcp__terminal__run_in_terminal"` thì không in gì và thoát 0. Mô tả của chính công cụ Terminal nói lệnh chạy trong shell đăng nhập của chủ, ngoài hộp cát, và ở chế độ tự động thì do bộ xét duyệt tự động quyết. **Chưa quan sát** Claude Code thật có chặn hay không, vì tôi không thử chạy lệnh cấm.
2. **Bản chính trên GitHub chưa khoá.** `gh api repos/luutuanvu1010/tourdaobooking/branches/main/protection` trả 404 "Branch not protected"; `…/rulesets` trả `[]`. Luật "chỉ nhận lần lưu đã xanh" hiện chỉ nằm trong `scripts/day-len.mjs`. `npm run trien-khai` vẫn đòi lượt kiểm xanh của đúng lần lưu, nên hậu quả lớn nhất là bản chính nhận lần lưu chưa kiểm, không phải bản chạy thật. **Chưa thử** luật bảo vệ nhánh có hợp với luồng đẩy lên `cho-kiem/<mã>` rồi mới đẩy `main` không.
3. **Mô tả môi trường của bộ xét duyệt tự động viết cho dự án khác và đã cũ.** `~/.claude/settings.json`, khoá `autoMode.environment` (35 dòng): khối đầu tả dự án `ketoanvn` và ghi mọi kho dưới tài khoản GitHub này là nơi đẩy tin cậy, đều riêng tư; khối sau tả `tourdao-sales` là chưa có kho từ xa và chưa triển khai. Theo [S4], bộ xét duyệt chỉ đọc khoá này ở cài đặt cấp người dùng. Đây là tệp của chủ; AI chỉ soạn nội dung thay thế.
4. **Kho công khai còn dữ liệu nhạy cảm.** `gh repo view … --json visibility` → `PUBLIC`; mở không đăng nhập trả 200. Mã bảng nhân viên: 1 tệp trên bản chính (`docs/SPEC-tourdao-sales.md`) và 2 lần lưu trong lịch sử. Mã bảng giá: `wrangler.jsonc` (`SERVICES_SHEET_ID`) và 6 tệp khác. Yêu cầu chỉ lấy tiêu đề tới đường xuất CSV của cả hai bảng trả 200, loại `text/csv`, từ máy chủ `…googleusercontent.com`; mã bảng bịa để đối chứng trả 404. `docs/HANDOFF-M2.md` có 1 dòng và `docs/HANDOFF-M4.md` có 2 dòng dạng số điện thoại. Ghi chú bộ nhớ 19/9 nói đó là số đăng nhập thật của quản trị. Số điện thoại là tên đăng nhập của Nền tảng, nên các lớp sau nó (PIN, khoá khi dò, Turnstile, hai lớp) là thứ đang che.

Hai chỗ cấu hình ngược luật của chủ:

- `~/.claude/settings.json` có `"AskUserQuestion"` trong `permissions.deny`, trong khi `~/.claude/CLAUDE.md` có cả mục "Câu hỏi bị hết giờ" tả cách dùng công cụ đó và `askUserQuestionTimeout` vẫn đặt 60 giây. Công cụ hỏi bị cấm thì mục luật kia không chạy được; AI chỉ còn hỏi bằng lời ở cuối lượt.
- `settings.local.json` (thư mục gốc và các bản làm việc riêng) đặt `outputStyle: "Explanatory"`, ngược mục "Cách trả lời tôi" (đã nêu 13/11, chưa đổi).

### II.4 Lỗi lọt qua bảy đợt kiểm toán (22/9 đến 7/11)

Trợ lý đọc bảy ghi chú bộ nhớ về các đợt kiểm toán, không đọc lại từng báo cáo gốc, nên số lần là ước lượng. Sáu kiểu nguyên nhân gốc:

| Kiểu | Ví dụ | Lớp đáng lẽ bắt |
|---|---|---|
| Bài kiểm khoá giá trị, không kiểm việc thi hành | 13 trong 25 ô quyền không được máy chủ hỏi (24/9) | bài kiểm |
| Nhiều quyết định đúng riêng lẻ ghép lại thành sai | F-01 (ba ADR về bảng hồ sơ), T-01 (đối tác thiếu vai trò, 7/11) | đặc tả |
| Thiếu chống ghi trùng | F-02 (gửi lặp ghi trùng khoản thu) | đặc tả, bài kiểm |
| Luật tiền lệch giữa ADR và mã | đơn huỷ còn cọc, sổ âm, đối tác đặt giá tay | đặc tả, người kiểm |
| Lộ thông tin giữa các vai | đối tác đọc lý do nội bộ qua lịch sử đơn (13/10) | người kiểm |
| Sổ trạng thái lệch thực tế | sổ ghi 1.6 khi bản chạy thật là 1.8; hôm nay 3.0 so với 3.5 | máy |

Điểm chung: phần lớn do kiểm toán tìm ra sau khi mã đã nhập. Bốn kiểu đầu là loại mà ví dụ "xong khi" viết bằng hành vi và con số, đặt trước khi làm, bắt được sớm hơn (dự án đã có khuôn này ở các tệp sổ vàng `golden/`).

### II.5 Cấu hình Claude Code nên thêm (mỗi loại một hai mục)

- **Lớp chặn.** (1) `SessionStart`: kịch bản in tờ tình hình do máy sinh (số bản chạy thật lấy bằng GET công khai, lần lưu của bản chính, việc đang mở và tuổi, điều đang chờ chủ), thay các dòng trạng thái trong bộ nhớ và phần đầu `docs/HANDOFF-N1.md`. (2) `Stop`: cổng kiểm nhẹ gồm `npm run typecheck` và bài kiểm của thư mục có tệp đổi, có trần thời gian, có kiểm `stop_hook_active`. Kèm sửa cho mục II.3.1: mở rộng tên so khớp thành `Bash|mcp__terminal__.*` và bỏ dòng thoát sớm khi tên công cụ khác `Bash`, hoặc thêm luật cấm `mcp__terminal__run_in_terminal`.
- **Skill (gói hướng dẫn mở khi cần).** (1) `phat-hanh`, chỉ chủ gọi (`disable-model-invocation: true`): quy trình nhập bản chính, triển khai và các trục trặc đã biết; rời khỏi CLAUDE.md và bộ nhớ, không tốn ngữ cảnh khi không dùng. (2) `phieu-viec`: hỏi tối đa ba câu, viết phiếu một trang, rồi trang kết quả. Về sau: tách công thức của `docs/CHANGE-GUIDE.md` thành gói theo `paths`.
- **Trợ lý.** `nguoi-kiem-doc-lap`: thêm `isolation: worktree` để chạy trên bản sao riêng; đề bài so với ví dụ trong phiếu, bỏ soi câu chữ. Cần thử: bản sao phải dựng từ đúng lần lưu của người thi công (cài đặt máy đang đặt `worktree.baseRef: "fresh"`).
- **Kết nối MCP.** Không thêm. Chrome và trình giả lập iPhone đã có sẵn trong ứng dụng; thêm kết nối Cloudflare sẽ mở thêm một đường ghi vào bản chạy thật.
- **Plugin.** Không thêm.
- **Lệnh tự đo**, chạy trong `claude` ở Terminal: `/usage`, `/context all`, `/doctor prompt-audit` [S1, S2].
- **Bài kiểm nhanh hơn.** Giả thuyết cần đo: phần lớn thời gian của bài có cơ sở dữ liệu là áp 149 migration cho từng bài; dựng một bản mẫu rồi sao chép có thể giảm mạnh. Mới đo một tệp.

### II.6 Đính chính bản 13/11

- Bản 13/11 ghi mục lục bộ nhớ "còn khoảng 1–2 KB" tới trần. Con số đó đo bằng byte. Claude Code đo bằng ký tự: ngày 15/11 nó báo tệp ở 20,6 KB trên trần đọc 24,4 KB và yêu cầu rút xuống dưới 17,1 KB. Tôi đã rút gọn cơ học: cắt phần mô tả của 83 dòng dài, rồi chuyển mười mục tính năng đã xong từ tháng 10 sang tệp mục lục cũ `lich-su-tinh-nang-cu.md` như lần dọn trước đã làm; không xoá ghi chú nào. Mục lục còn 156 dòng, khoảng 16,7 nghìn ký tự. Máy còn nhắc rút xuống dưới 140 dòng; muốn vậy phải bỏ các dòng trạng thái, việc đó chờ chủ.
- Bản 13/11 không biết kho mã đang công khai và không kiểm luật bảo vệ nhánh trên GitHub.
- Mục A1 bản 13/11 ("mới thấy từ cấu hình") nay có thêm thử khô và xác nhận từ tài liệu; vẫn chưa quan sát trên Claude Code thật.

### II.7 Điều chưa kiểm

- Claude Code thật có chặn `git push` hay `wrangler deploy` gõ qua công cụ Terminal không.
- Luật bảo vệ nhánh trên GitHub có hợp với luồng `day-len` không; giá các gói GitHub.
- 4.411 tệp trong `docs/evidence` có ảnh nào chứa dữ liệu người thật không; 294 tệp tài liệu có chuỗi dạng số điện thoại, chưa phân biệt số thật với số thử.
- Nội dung hai bảng Google Sheet (cố ý không tải).
- Hiện đã có nhân viên dùng Nền tảng hằng ngày chưa.
- Số token thật của phần chữ nạp mỗi phiên (mới đo byte).
- Phân loại ADR theo nội dung (mới đếm cột "cửa" trong mục lục).
- Nguyên nhân từng lượt GitHub phải chạy lại.
- Tài liệu chính thức được tra qua trợ lý; công cụ đọc trang có tóm tắt và cắt bớt trang dài. Các bài đăng sau tháng 6/2026 [S16, S17] tôi không tự đọc lại.
- Không chạy `npm test` đủ bộ và e2e trong lượt này (không sửa mã).

### II.8 Lệnh đã chạy (để kiểm lại)

- `git fetch -q origin; git log --oneline HEAD..main | wc -l; git rev-list --count main..origin/main`
- `for f in CLAUDE.md src/CLAUDE.md web/CLAUDE.md; do git show main:$f | wc -lc; done`; `wc -lc <thư mục bộ nhớ>/MEMORY.md`
- `git worktree list`; với từng bản: `git -C <bản> status --porcelain | wc -l`, `git -C <bản> rev-list --count main..HEAD`
- `node --test src/claude-guard.test.ts src/claude-guard-luat.test.ts src/claude-guard-tep.test.ts` → 34 đạt, 0 đỏ
- `CLAUDE_PROJECT_DIR=$PWD node .claude/hooks/guard-remote.mjs < <tệp JSON giả>` (hai đầu vào ở II.3.1)
- `gh repo view luutuanvu1010/tourdaobooking --json visibility,isPrivate`; `gh api repos/luutuanvu1010/tourdaobooking/branches/main/protection`; `gh api …/rulesets`
- `curl -s -o /dev/null -I -L -w "%{http_code}|%{content_type}" "https://docs.google.com/spreadsheets/d/<mã>/export?format=csv"` (chỉ lấy tiêu đề)
- `git grep -I -l "spreadsheets/d/" main -- .`; `git log --all --oneline -S"<mã bảng>" | wc -l`
- `curl -s https://booking.tourdao.vn/api/auth/config`; `curl … https://dev.tourdao.vn/api/auth/config` (không phân giải được tên miền)
- `git show main:docs/adr/README.md | awk -F'|' …` (đếm cột "cửa"); `git show main:docs/quyen-hoan.json | grep -c '"muc_do": *"HIGH"'`
- Đọc cấu trúc `~/.claude/settings.json` bằng `node -e` (không in giá trị `env`)

### II.9 Nguồn (tra ngày 15/11 qua hai trợ lý)

Tài liệu Claude Code, `https://code.claude.com/docs/en/…`: [S1] `best-practices`; [S2] `memory`; [S3] `hooks`, `hooks-guide`; [S4] `permissions`, `permission-modes`; [S5] `sub-agents`; [S6] `skills`; [S7] `worktrees`; [S8] `sandboxing`; [S18] `features-overview`.

Bài kỹ thuật của Anthropic, `https://www.anthropic.com/…`: [S9] `engineering/building-effective-agents` (19/12/2024); [S10] `engineering/effective-context-engineering-for-ai-agents` (29/9/2025); [S11] `engineering/effective-harnesses-for-long-running-agents` (26/11/2025); [S12] `engineering/harness-design-long-running-apps` (24/3/2026); [S13] `engineering/building-c-compiler` (5/2/2026); [S14] `research/claude-code-auto-mode` (25/3/2026); [S15] `research/how-we-contain-claude` (25/5/2026); [S16] `research/redesigning-source-control` (13/10/2026); [S17] `research/components-of-agent-memory` (6/11/2026).

### II.10 Kết quả kiểm độc lập

(điền sau vòng kiểm)
