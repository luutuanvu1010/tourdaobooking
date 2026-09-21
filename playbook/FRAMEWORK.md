# Khung xây dựng phần mềm và website với AI cho một người

> Tài liệu này **không** tham gia thứ tự ưu tiên Điều 3 của hiến pháp. Khi mâu thuẫn hiến pháp, hiến pháp thắng và tài liệu này phải sửa. Chi tiết: mục "Áp vào Core" bên dưới.

Phiên bản 1.7 · bản Core 2026-08-22 (chưng cất từ ketoanvn v1.7, 2026-08-18)
Mục đích: trả lời 4 câu hỏi cho toàn hệ thống: cái nào, là gì, làm gì, làm thế nào.

Bản Core 2026-08-22: chưng cất từ ketoanvn v1.7 (commit `e606c03`); đổi tiêu đề và phạm vi sang phần mềm và website; vá ba chỗ còn ghi tám tài liệu thay vì chín; bóc mã quyết định và tên cổng nội bộ, giữ tên dự án nguồn làm nguồn bài học có ngày; quy đổi số Điều sang hiến pháp Core; thêm mục "Áp vào Core". Từ đây hai bản đi đường riêng (`ADR-0027`).

Thay đổi trong 1.7: thêm mục Circuit breaker vào phần 10 — giới hạn Max Turns/Runtime/Retry/Files Changed cho mọi job AI chạy không giám sát (headless, theo lịch, tự động trên PR), vượt thì STOP và LEO THANG, không tự thử lại; mở rộng phán quyết ĐẠT/SỬA/CHẶN của phần 9 thành bốn trạng thái ĐẠT / ĐẠT CÓ ĐIỀU KIỆN / SỬA / LEO THANG, và áp dụng thống nhất cho mọi subagent kiểm soát (spec-reviewer, code-reviewer, qa-tester, security-auditor), không riêng cổng chuyên gia nghiệp vụ miền. Lý do: ngày 2026-08-18, dự án ketoanvn đối chiếu một tài liệu "AI-Native Software Factory Master Blueprint" (soạn bằng ChatGPT, ngoài hệ, do người chủ mang vào) với toàn bộ bộ tài liệu qua nhiều vòng rà — phần lớn nội dung Blueprint trùng lặp và kém sâu hơn bản đang có (hiến pháp, workforce, quality gates, hệ hạng nguồn đều đã có bản tốt hơn), nhưng grep thật trên toàn repo xác nhận đúng hai khoảng trống: (1) giới hạn chạy tự động chỉ tồn tại cục bộ trong một CI workflow (một quyết định ghi ở dự án đó, `--max-turns`/`timeout-minutes`/trần 2 vòng của `claude.yml`), chưa từng là nguyên tắc chung — trong khi Anthropic có khuyến nghị vận hành chính thức về timeout, rate limit, allowed tools và chi phí cho đúng kiểu chạy này; (2) từ vựng phán quyết của các subagent kiểm soát không thống nhất, chỉ cổng chuyên gia nghiệp vụ miền có ĐẠT/SỬA/CHẶN (từ v1.6), và cả ba trạng thái đó không phân biệt được "cần sửa kỹ thuật" (SỬA) với "vượt thẩm quyền subagent, cần người chủ quyết" (LEO THANG, ứng với P8 của hiến pháp). Đề xuất theo Điều 9.1, người chủ phê chuẩn cùng ngày.

Thay đổi trong 1.6: thêm vai "chuyên gia nghiệp vụ miền" vào bộ khởi điểm ở phần 9 — một phiên riêng đóng vai chuyên gia của miền (luật thuế, y tế, tài chính…) thẩm định độ đúng nghiệp vụ thay người chủ không chuyên, chỉ ghi vào thư mục biên bản của nó, phán quyết buộc trỏ căn cứ. Lý do: ngày 2026-08-11, dự án ketoanvn dựng cổng chuyên gia nghiệp vụ miền theo mẫu này và ngay hai lần chạy đầu nó bắt được hai chế định đang chi phối số liệu mẫu mà cả người chủ lẫn các phiên thi công đều không biết (giảm 2% GTGT còn 8%, ngưỡng TSCĐ 30 triệu) — chứng minh chỗ trống nghiệp vụ của người chủ là một loại rủi ro cần cổng riêng, cùng hạng với spec-reviewer. Đề xuất theo Điều 9.1, người chủ phê chuẩn cùng ngày.

Thay đổi trong 1.5: đặt một ngưỡng số cho kích thước CLAUDE.md thay cho cụm "dưới 1 trang" (mục 4.6); tách CLAUDE.md làm hai nửa và đưa nửa thứ nhất lên bước 2 của bootstrap (mục 4.6 và phần 6); đưa cổng subagent soi tài liệu trước chốt 1 vào chính trình tự bootstrap thay vì để nó chỉ nằm trong bảng ở phần 11; và thêm một quy ước hình thức, mọi mục để mở chờ một chốt phải nằm trong đúng một danh sách của tài liệu, không được nằm rải trong đoạn văn; và thêm **quy tắc thứ bậc thứ ba** ở mục 4 — bộ tài liệu là 9 và đóng, công cụ bên ngoài đề xuất một tài liệu thứ 10 thì ánh xạ nội dung về đúng một trong 9 chứ không tạo file mới. Số thứ tự 11 bước giữ nguyên, không đánh số lại, để không làm gãy tham chiếu của các dự án đang chạy. Lý do: ngày 2026-08-10, dự án ketoanvn chạy tới phiên tài liệu thứ mười ba mà vẫn chưa có một hàng rào tự động nào, vì bootstrap xếp CLAUDE.md ở bước 7 và hooks ở bước 8 — cả hai đều nằm sau toàn bộ công việc tài liệu. Hệ quả đo được trong đúng một phiên: hai giả định của cùng một PRD mâu thuẫn nhau suốt bốn phiên bản mà ba vòng rà không bắt được; một mục chờ chốt bị bỏ sót vì nó nằm chìm trong đoạn văn trong khi các mục cùng loại nằm trong danh sách đánh số; và một tài liệu dưới trỏ sai phiên bản tài liệu trên. Cả ba là loại lỗi máy bắt được mà người đọc thì không, và cả ba lọt qua vì tuân thủ đang dựa vào việc phiên AI tự đọc tài liệu rồi tự khai đã đọc — đúng thứ mục 8.2 của hiến pháp cấm. Nguyên nhân gốc: bước 7 gộp hai thứ có điều kiện tiên quyết khác hẳn nhau — luật thi công thì thật sự phải đợi kiến trúc, còn luật vận hành phiên thì chưng cất được từ chính hiến pháp và khung này, tức dùng được ngay từ bước 2.

Thay đổi trong 1.4: thêm tài liệu thứ 9 vào bộ cốt lõi, hồ sơ ràng buộc bên ngoài (mục 4.2 mới; các mục 4.2 tới 4.8 cũ dời thành 4.3 tới 4.9); thêm một bước khảo sát ràng buộc bên ngoài vào trình tự bootstrap ở phần 6, đặt TRƯỚC bước soạn PRD; và bổ sung chiều thời gian cho hạng nguồn ở phụ lục C, theo đó phát biểu về thế giới bên ngoài phải mang ngày kiểm chứng cùng hạn kiểm lại, quá hạn thì tự động hạ xuống [C]. Lý do: ngày 2026-08-09, dự án ketoanvn phát hiện cả ba chế độ kế toán làm nền cho PRD v2.1 và ARCHITECTURE v2.0 đều đã hết hiệu lực hoặc đã bị sửa từ bảy tới mười ba tháng trước — mà ba tài liệu vẫn xanh, không cổng nào bắt được. Nguyên nhân gốc không phải một phiên AI cẩu thả, mà là bộ tài liệu không có chỗ nào phân biệt ràng buộc do mình tự đặt với ràng buộc do bên ngoài áp: loại thứ nhất chỉ đổi khi người chủ đổi ý, loại thứ hai đổi mà không ai báo.
Thay đổi trong 1.3: thay khuyến cáo "hiến pháp dưới 2 trang" ở mục 4.1 bằng một ngưỡng số kiểm được (dưới 5.000 từ, dưới 25 KB). Lý do: khi soạn CONSTITUTION.md v3.0.0 với 21 nguyên tắc và 10 điều cấm, mốc 2 trang tỏ ra không đạt được về mặt số học (2 trang khoảng 900 từ, chia cho 31 điều còn 29 từ mỗi điều, không đủ chỗ cho cả phát biểu lẫn lý do), và bản thân "2 trang" là một tính từ trá hình, vi phạm chính luật "ngưỡng phải là số" mà framework này đặt ra.
Thay đổi trong 1.2: đổi tên khung cho đúng phạm vi (đây là khung xây dựng phần mềm, không phải khung vận hành toàn bộ doanh nghiệp SaaS); thêm mục "Phạm vi của khung" ngay dưới đây.
Thay đổi trong 1.1: thêm phần 8 (nguồn gốc framework và đối chiếu thực tiễn các tập đoàn), phần 9 (Skill và Subagent), phần 10 (Hooks), phần 11 (chuỗi cổng kiểm soát ba tuyến), phụ lục B (bảng thuật ngữ), phụ lục C (phân cấp độ tin cậy [A] [B] [C] và bảng kiểm chứng các phát biểu then chốt).

---

## Phạm vi của khung

Một sản phẩm phần mềm hay website gồm hai lớp. Khung này bao trọn **lớp sản xuất**: từ ý tưởng đến spec, thiết kế, code, test, review, deploy, cùng vận hành kỹ thuật (giám sát, sự cố, bảo trì) và bộ máy quản trị cho toàn bộ việc đó (bộ tài liệu, các vai AI, cổng kiểm soát, vòng học).

Khung này KHÔNG bao gồm **lớp kinh doanh**: tìm khách và marketing, bán hàng và định giá, hỗ trợ khách hàng, thu tiền và tài chính, pháp lý và tuân thủ. Lớp đó thuộc một tài liệu riêng trong tương lai. Điều đáng chú ý: các nguyên lý nền của khung (tài liệu là công ty, tách vai, chốt duyệt, đường ray, vòng học) áp dụng được cho cả lớp kinh doanh, chỉ khác bộ tài liệu và công cụ.

---

## Nếu chỉ nhớ 5 điều

1. **Tài liệu là công ty.** AI không có trí nhớ giữa các phiên, nên tri thức tổ chức phải nằm trong file, không nằm trong đầu ai cả.
2. **Mỗi vai một phiên.** Không để một phiên AI vừa lập kế hoạch, vừa thi công, vừa tự duyệt.
3. **Người giữ 4 chốt.** Duyệt phạm vi, duyệt kế hoạch, nghiệm thu staging, nghiệm thu production. Ngoài 4 chốt, AI tự chạy.
4. **Đường ray trước, tốc độ sau.** Tự động hoá an toàn đến từ ràng buộc máy móc, không đến từ câu lệnh dài.
5. **Lỗi phải biến thành luật.** Mỗi sai lầm được chưng cất thành một dòng trong tài liệu. Đó là cách công ty một người tích luỹ kinh nghiệm của cả trăm người.

---

## Phần 0: Bản chất vấn đề

Một công ty phần mềm trăm người, bóc hết lớp vỏ, chỉ gồm 4 thành phần:

| Thành phần | Trong công ty 100 người | Trong công ty 1 người + AI |
|---|---|---|
| **Ý chí** (quyết định làm gì, chịu trách nhiệm) | Ban giám đốc, hội đồng | Người chủ. Không thay thế được, không nên thay |
| **Năng lực** (biến quyết định thành sản phẩm) | 70 đến 80 kỹ sư, designer, tester | AI: Cowork, Claude Code, Claude Design |
| **Trí nhớ** (tri thức tổ chức, vì sao ngày xưa làm vậy) | Đầu nhân viên, wiki, các cuộc họp | Bộ tài liệu cốt lõi 9 file (phần 4) |
| **Kỷ luật** (đảm bảo đúng, không hỏng, không trôi) | Quy trình, QA, review chéo, quản lý cấp trung | Đường ray máy móc: hooks, CI, review AI, plan mode |

Công thức nền tảng:

> **Công ty = Ý chí × Năng lực × Trí nhớ × Kỷ luật**

Đây là phép nhân, không phải phép cộng: một cột bằng 0 thì cả công ty bằng 0. AI chỉ thay được cột Năng lực. Sai lầm phổ biến nhất của người dùng AI để xây phần mềm là chỉ mua Năng lực mà bỏ trống Trí nhớ và Kỷ luật, kết quả là một AI rất giỏi tạo ra một hệ thống rối mà chính chủ không hiểu sau 3 tháng.

---

## Phần 1: Sáu nguyên lý nền tảng

### Nguyên lý 1: Tài liệu là công ty

Trong công ty người, tri thức nằm trong đầu nhân viên và được truyền qua họp hành. AI không có trí nhớ giữa các phiên, mỗi phiên mới là một "nhân viên mới toanh". Vì vậy tài liệu không phải thứ đi kèm công ty, tài liệu **chính là** công ty.

Hệ quả thực hành:
- Việc gì chưa ghi vào tài liệu coi như chưa tồn tại.
- Mọi phiên AI bắt đầu bằng đọc tài liệu, kết thúc bằng cập nhật tài liệu.
- Muốn thay đổi hành vi của hệ thống, sửa tài liệu trước, không sửa bằng lời dặn miệng trong chat.

### Nguyên lý 2: Tách vai, tách phiên

Doanh nghiệp lớn tách vai (người viết code khác người duyệt code) không phải vì đông người, mà vì kiểm soát chéo. Một phiên AI vừa lập kế hoạch, vừa code, vừa tự duyệt sẽ tự khen bài của mình, giống hệt một lập trình viên tự review code của chính họ.

Hệ quả thực hành:
- Mỗi vai trò một phiên riêng: phiên kế hoạch, phiên thi công, phiên audit.
- Reviewer không bao giờ là phiên đã viết ra code đó.
- Phiên audit chỉ được đọc và báo cáo, không được sửa. Danh sách lỗi chuyển sang phiên thi công xử lý.

### Nguyên lý 3: Người giữ ý chí, AI giữ năng lực

Người chủ giữ đúng 4 quyền, không hơn không kém: **quyết định** (làm gì, không làm gì), **phê duyệt** (kế hoạch trước khi thi công), **nghiệm thu** (kết quả bằng cách tự tay dùng thử), **chịu trách nhiệm** (hậu quả cuối cùng). AI làm toàn bộ phần còn lại.

Hệ quả thực hành:
- Không cố đọc hiểu code. Kiểm soát bằng 3 thứ đọc được: tài liệu (tiếng người), hành vi ứng dụng (bấm thử), lịch sử git (quay lại được).
- Không tự tay sửa code. Muốn sửa thì ra yêu cầu, để AI sửa, giữ cho mọi thay đổi đều qua quy trình.
- Vai của người chủ giống giám đốc dự án xây dựng: không tự xây, nhưng duyệt bản vẽ và nghiệm thu từng hạng mục.

### Nguyên lý 4: Đường ray trước, tốc độ sau

Tự động hoá cao không đến từ việc viết câu lệnh dài và chi tiết hơn. Nó đến từ việc dựng các ràng buộc máy móc để AI tự chạy an toàn bên trong. Có 4 loại đường ray:

| Đường ray | Bản chất | Ví dụ |
|---|---|---|
| Luật đọc đầu phiên | AI tự đọc, không cần nhắc | CLAUDE.md, CONSTITUTION.md |
| Chốt chặn trước thi công | AI phải trình kế hoạch, người duyệt mới được sửa file | Plan mode của Claude Code |
| Trạm kiểm soát máy móc | Chạy như luật vật lý, AI không thể quên hay bỏ qua | Hooks tự chạy lint và test sau mỗi lần sửa file |
| Cổng kiểm soát sau thi công | Mọi thay đổi phải qua cổng trước khi vào bản chính | Pull request + review AI tự động + CI |

Hệ quả thực hành: đầu tư một buổi dựng đường ray (phase 0) tiết kiệm hàng tuần sửa sai về sau.

### Nguyên lý 5: Vòng lặp nhỏ

Context window (bộ nhớ làm việc của một phiên AI) là tài nguyên khan hiếm nhất: nó chứa toàn bộ hội thoại, mọi file AI đọc, mọi kết quả lệnh, và hiệu năng của AI giảm dần khi nó đầy. Phiên càng dài, AI càng dễ quên chỉ dẫn ban đầu và mắc lỗi.

Hệ quả thực hành:
- 1 task = 1 phiên = 1 commit. Không nuôi một phiên dài cả tuần.
- Task được chia ở cỡ 1 đến 3 giờ làm việc, có tiêu chí nghiệm thu bấm thử được.
- Trạng thái công việc lưu trong TASKS.md và git, không lưu trong "trí nhớ" của phiên chat.

### Nguyên lý 6: Nghiệm thu bằng hành vi, không bằng code

Người không chuyên lập trình không đọc được code, nhưng đọc được 3 thứ đáng tin hơn: tài liệu, hành vi của ứng dụng khi tự tay bấm thử, và lịch sử git. "Xong" nghĩa là bấm thử thấy đúng theo tiêu chí đã ghi trong task, không phải AI báo là xong.

Hệ quả thực hành:
- Mỗi task khi tạo ra phải kèm tiêu chí nghiệm thu viết bằng tiếng người ("đăng nhập sai 5 lần thì khoá 15 phút").
- Không tin lời báo cáo, chỉ tin kết quả bấm thử và kết quả test tự động.

---

## Phần 2: Mô hình công ty ảo

Cấu trúc gồm 1 người và 3 khối AI:

```
                 NGƯỜI CHỦ (ý chí)
          quyết định, duyệt, nghiệm thu
                        │
        ┌───────────────┼────────────────┐
        │               │                │
   KHỐI KẾ HOẠCH   KHỐI THI CÔNG    KHỐI KIỂM SOÁT
   (nghĩ trước)    (làm ra)         (soi lại)
        │               │                │
   Cowork          Claude Code      Review AI trên PR
   Claude Design   + subagents      Hooks + test suite
                   + phiên web      Phiên audit riêng
                                    CI + Routines
```

Bảng quy đổi chức danh:

| Chức danh trong công ty 100 người | Trong công ty 1 người + AI | Ghi chú |
|---|---|---|
| Chủ tịch, CEO | Người chủ | Vai duy nhất không thay được |
| Giám đốc sản phẩm và đội PM | Cowork, phiên kế hoạch | Viết PRD, chia task |
| Kiến trúc sư trưởng | Cowork, phiên kiến trúc | Viết ARCHITECTURE, DECISIONS |
| Giám đốc thiết kế và đội design | Claude Design, Artifacts | Prototype bấm thử trước khi code |
| Đội kỹ sư 50 đến 70 người | Claude Code, nhiều phiên song song, subagents | Thi công theo TASKS.md |
| Đội QA | Hooks + test suite + phiên audit định kỳ | Chạy máy móc là chính |
| Senior reviewer | Review AI tự động trên mọi pull request | Con mắt thứ hai, khác phiên với dev |
| Đội DevOps, trực ca | GitHub Actions + Routines chạy theo lịch | Deploy, giám sát, báo cáo sáng |
| Thư ký, wiki, trí nhớ tổ chức | Bộ tài liệu cốt lõi 9 file | Xem phần 4 |

---

## Phần 3: Vòng lặp vận hành chuẩn

Toàn bộ hoạt động của công ty là một vòng lặp duy nhất, lặp cho từng tính năng. Người chỉ xuất hiện ở 4 chốt:

```
        Ý TƯỞNG / YÊU CẦU MỚI
                 │
    [Cowork: cập nhật PRD, chia task vào TASKS.md]
                 │
    ══ CHỐT 1: người duyệt phạm vi ══
                 │
    [Claude Code plan mode: trình kế hoạch kỹ thuật]
                 │
    ══ CHỐT 2: người duyệt kế hoạch ══
                 │
    [Claude Code thi công, subagents nếu việc song song]
    [Hooks tự chạy lint + test sau mỗi lần sửa file]
    [AI tự sửa cho đến khi toàn bộ test pass]
                 │
    [Tạo pull request → review AI tự động chạy]
                 │
    ══ CHỐT 3: người đọc review + bấm thử bản staging ══
                 │
    [Merge → CI tự deploy staging → production]
                 │
    ══ CHỐT 4: người nghiệm thu production ══
                 │
    [Routines giám sát hằng ngày, gửi báo cáo]
                 │
    [Bài học rút ra → cập nhật tài liệu]  ← vòng học, phần 7
                 │
        Ý TƯỞNG TIẾP THEO
```

Nguyên tắc tại chốt: người chỉ làm 1 trong 3 việc: **duyệt**, **yêu cầu sửa** (kèm lý do), hoặc **huỷ**. Không tự tay sửa sản phẩm tại chốt.

Nhịp độ tham khảo: chốt 1 và 2 mất 5 đến 15 phút mỗi lần, chốt 3 và 4 mất 15 đến 30 phút. Tổng thời gian người bỏ ra cho một tính năng cỡ nhỏ khoảng 1 giờ, phần còn lại AI tự chạy.

---

## Phần 4: Bộ tài liệu cốt lõi

Đây là trái tim của hệ thống: 9 file, chia 3 tầng theo tần suất thay đổi. Tầng càng cao càng ít sửa, càng có hiệu lực lớn.

```
Tầng 1 · HIẾN PHÁP (bất biến, dùng chung mọi dự án)
   └── CONSTITUTION.md

Tầng 2 · ĐỊNH HÌNH (viết đầu dự án, ít sửa)
   ├── RANG_BUOC_NGOAI.md   ← đứng TRÊN PRD.md
   ├── PRD.md
   ├── ARCHITECTURE.md
   └── DESIGN.md

Tầng 3 · SỐNG (cập nhật liên tục trong vòng lặp)
   ├── CLAUDE.md
   ├── TASKS.md
   ├── DECISIONS.md
   └── RUNBOOK.md
```

Quy tắc thứ bậc: tài liệu tầng dưới không được mâu thuẫn tầng trên. Khi mâu thuẫn, tầng trên thắng và tầng dưới phải sửa.

Quy tắc thứ bậc thứ hai, thêm ở v1.4: trong tầng 2, `RANG_BUOC_NGOAI.md` đứng trên `PRD.md`. Lý do là bản chất chứ không phải tần suất. Tám tài liệu còn lại ghi những gì mình **chọn**; tài liệu này ghi những gì **đúng dù mình chọn gì**. Một phạm vi không thể ghi đè một điều luật, và một bản vẽ kỹ thuật không thể ghi đè hành vi của một hệ thống mình không sở hữu. Trộn hai loại ràng buộc vào cùng một tài liệu là nguyên nhân trực tiếp của sự cố sinh ra bản v1.4 này: khi một sự thật bên ngoài nằm lẫn giữa các quyết định phạm vi, nó **đọc như một quyết định**, nên không ai nghĩ tới việc kiểm lại nó.

Đối chiếu với hiến pháp: Điều 3 xếp "Ràng buộc cấp dự án" là tầng cao thứ nhì, ngay dưới hiến pháp và trên bản ghi quyết định. Tài liệu này là thứ đứng vào đúng chỗ đó, chỗ mà bộ 8 tài liệu cũ để trống.

**Quy tắc thứ bậc thứ ba, thêm ở v1.5: bộ tài liệu là 9, đóng. Không tạo tài liệu thứ 10.**

Khi một công cụ bên ngoài — bộ kỹ năng, khuôn mẫu, quy trình đóng gói sẵn — đề xuất một tài liệu không có trong bộ 9, thì **ánh xạ nội dung của nó về đúng một trong 9**, không tạo file mới. Bảng ánh xạ cho những thứ hay gặp nhất:

| Công cụ ngoài đề xuất | Ánh xạ về |
|---|---|
| Đặc tả sản phẩm, tài liệu thiết kế, bản tuyên ngôn | `PRD.md` — nếu là **cái gì** và **vì sao**; `ARCHITECTURE.md` — nếu là **bằng gì** |
| Đặc tả từng bước, kế hoạch thi công, danh sách việc | `TASKS.md` |
| Bản ghi lựa chọn kỹ thuật, ADR | `DECISIONS.md` |
| Tài liệu quy trình vận hành, checklist xử lý sự cố | `RUNBOOK.md` |

Ba lý do, xếp theo sức nặng:

1. **Danh tính của một thứ chỉ được sống ở một chỗ (P6, N7).** Một tài liệu đặc tả riêng chứa lại tuyên bố sản phẩm là nguồn sự thật thứ hai — và bản thứ hai *sẽ* lệch, không phải *có thể* lệch.
2. **Thứ tự ưu tiên của Điều 3 chỉ định nghĩa cho 9 tài liệu này.** Một file thứ 10 không có chỗ trong trật tự đó, nên khi nó mâu thuẫn với một tài liệu trong bộ, **không có luật nào phân xử**.
3. **Bộ 9 là thứ mọi phiên biết đường mở.** File ngoài bộ thì phiên sau không biết nó tồn tại, và nó thành rác mang hình dạng tài liệu.

Quy tắc này **không cấm** thư mục `docs/` chứa tài liệu tham khảo, tư liệu thu thập, hay bản gốc của bên thứ ba. Nó cấm đúng một thứ: **một tài liệu ngoài bộ 9 mang thẩm quyền** — tức chứa quyết định, phạm vi, hay ràng buộc mà một phiên sau phải tuân theo.

*Sinh ra từ một lần suýt vi phạm, ngày 2026-08-10: một bộ kỹ năng đòi ghi đặc tả thiết kế vào `docs/superpowers/specs/`, và phiên đang chạy đã định làm theo. Người chủ chặn lại bằng đúng một câu hỏi — "cái đó có nằm trong khung không?". Lần đó có người hỏi; lần sau có thể không, nên nó thành luật ở đây.*

### Áp vào Core và các site sinh từ Core

Luật "bộ 9 đóng" áp cho tài liệu của một dự án cụ thể. Thư mục `playbook/` không phải tài liệu dự án — nó là khung dùng chung mà nhiều dự án cùng kế thừa, giống như chính tài liệu này. Tài liệu trong `playbook/` không tham gia trật tự ưu tiên Điều 3 với tư cách thành viên bộ 9; nó cung cấp khuôn mà bộ 9 của từng dự án được sinh ra từ đó. Một dự án copy Core vẫn phải giữ bộ 9 của mình đóng ở con số 9.

**Thứ bậc:** FRAMEWORK.md không tham gia Điều 3 của hiến pháp. Khi một câu trong FRAMEWORK.md mâu thuẫn hiến pháp, hiến pháp thắng và FRAMEWORK.md phải sửa.

**Bảng quy đổi số Điều** (Hiến pháp ketoanvn v3.1.0 → Hiến pháp Core v2.3.0): ketoanvn Điều 2→Core Điều 3 · 3→4 · 4.1→7.2 · 4.2→5 · 4.3→5.8 · 5→5.8 · 6.1→8.1 · 6.2→8.5 · 6.3→8.2 · 6.4→6.2 · 6.5→8.4 · 7→9 · 7.1→9.1 · 7.2→7.1 dòng "Sửa hiến pháp" + 9.3 · 7.3→9.4 · 7.4→9.2 · 7.5→9.3 · 7.6→9.5 · 7.7→9.6; số hiệu P1–P21, N1–N10 **không** đổi.

**Bảng ánh xạ bộ 9 ↔ artifact của Core:**

| Tài liệu trong bộ 9 | Ở Core là | Ghi chú |
|---|---|---|
| CONSTITUTION | `playbook/CONSTITUTION.md` | một bản, Core sở hữu (`ADR-0027`) |
| RANG_BUOC_NGOAI | `RANG_BUOC_NGOAI.md` (gốc repo) | gốc repo, bắt buộc kể cả khi rỗng |
| PRD | `docs/core-specs/00-PROJECT_BRIEF.md` | PR-FAQ 7 mục |
| ARCHITECTURE | `docs/core-specs/02-SAD.md` + `01-CONTENT_MODEL.md` + `05-URL_MAP-and-DB_SCHEMA.md` + `08-SCHEMA_PLAN.md` | bốn file, một vai |
| DESIGN | `docs/core-specs/06-BINDING_MAP.md` + `07-DESIGN_TOKENS.md` + `DESIGN_PATTERNS.md` | |
| CLAUDE | `CLAUDE.md` (gốc) + vệ tinh `.claude/rules/*.md` | hai nửa, dưới 600 từ |
| TASKS | `BACKLOG.md` (cái gì đang mở) + `docs/superpowers/plans/` (kế hoạch đang thi hành) | Core không có `TASKS.md` |
| DECISIONS | `docs/adr/` (quyết định kiến trúc) + `playbook/CHANGELOG.md` (quyết định tầng luật) | Core không có `DECISIONS.md` — quyết định kiến trúc mỗi ADR một file, quyết định tầng luật là dòng CHANGELOG sáu vế |
| RUNBOOK | `SETUP-NEW-SITE.md` (quy trình dựng + deploy) + `DEPLOY-NOTES.md` (nhật ký lỗi thật khi fork) | |

**Bốn chốt ↔ cổng:** Chốt 1 (duyệt phạm vi) = chủ dự án duyệt bước 0–1 của PLAYBOOK; Chốt 2 (duyệt kế hoạch) = QA1; Chốt 3 (bấm thử staging) = QA2 + bấm thử bản preview Cloudflare; Chốt 4 = nghiệm thu production. **Ba khối ↔ vai:** khối kế hoạch = Cowork; khối thi công = Claude Code + subagent thi công; khối kiểm soát = bốn subagent `.claude/agents/` + review AI trên PR + phiên `/rut-kinh-nghiem`. **11 bước bootstrap ↔ `SETUP-NEW-SITE.md`** cho site sinh từ Core, với ghi chú bước nào Core đã làm sẵn (bước 2 nửa A của CLAUDE.md, bước 7 nửa B, bước 8 hooks).

**Cổng chuyên gia nghiệp vụ miền:** Core không dựng sẵn; site nào có miền chuyên sâu thì dựng theo Phần 9, ghi vào CLAUDE.md nửa A của site đó.

**Bốn trạng thái phán quyết:** Phần 9 mục "Bốn trạng thái phán quyết" là **định nghĩa duy nhất** của bốn trạng thái trong Core; `playbook/ai/PROMPT_FACTORY.md` "Cổng ra" chỉ giữ cột *làm gì* cho từng phán quyết.

### 4.1 CONSTITUTION.md (tầng hiến pháp)

- **Là gì:** bộ luật bất biến của toàn hệ thống, đứng trên mọi dự án.
- **Làm gì:** giữ cho mọi phiên AI, mọi dự án, mọi thời điểm hành xử nhất quán theo giá trị của người chủ. Chống "trôi dạt" khi làm việc với AI lâu dài.
- **Trả lời câu hỏi:** điều gì không bao giờ được làm? Giá trị nào không đổi dù dự án nào?
- **Ai viết, ai đọc:** người chủ viết (AI chỉ giúp soạn câu chữ). Mọi phiên AI đọc đầu phiên.
- **Khi nào cập nhật:** hiếm, chỉ khi rút ra bài học lớn, và phải qua nghi thức: ghi số phiên bản, ghi lý do sửa.
- **Làm thế nào:** chưng cất từ sai lầm thực tế đã gặp. Mỗi điều luật phải gắn được với ít nhất một sai lầm cụ thể đã xảy ra, nếu không thì đó là lý thuyết suông.
- **Ngưỡng độ dài:** dưới 5.000 từ, tương đương dưới 25 KB. Ngưỡng phải là số kiểm được chứ không phải tính từ hay đơn vị mơ hồ: "2 trang" không trả lời được trang cỡ nào, cỡ chữ bao nhiêu. Mốc này giữ cho hiến pháp nạp đầu phiên chỉ tốn khoảng 5 đến 6 nghìn token, đủ nhỏ để mọi phiên đọc trọn.
- **Sai thường gặp:** viết dài quá thành ra không phiên nào đọc kỹ; hoặc ngược lại, cắt mất phần lý do của mỗi điều luật. Giữ lý do lại, vì khi gặp tình huống mơ hồ thì chính lý do mới là thứ giúp diễn giải đúng.

### 4.2 RANG_BUOC_NGOAI.md (tầng định hình, đứng trên PRD)

- **Là gì:** hồ sơ những sự thật mà dự án không kiểm soát nhưng phụ thuộc vào: pháp luật, hành vi hệ thống của bên thứ ba, giới hạn và bảng giá của nhà cung cấp, chuẩn bắt buộc của ngành.
- **Làm gì:** giữ đúng một bản cho mỗi sự thật bên ngoài, và làm cho nó **hết hạn được**. Đây là tài liệu duy nhất trong bộ mà nội dung có thể sai đi mà không ai chạm vào nó.
- **Trả lời câu hỏi:** cái gì đúng mà mình không đổi được? Biết nhờ đâu, tin tới mức nào, kiểm lần cuối bao giờ? Nếu nó sai thì cái gì trong hệ sập?
- **Ai viết, ai đọc:** một phiên khảo sát riêng viết ở phase 0, trước khi soạn PRD. Phiên kế hoạch, phiên kiến trúc và phiên audit đọc. Phiên thi công đọc khi task có dấu chạm pháp luật hoặc chạm hệ thống ngoài.
- **Khi nào cập nhật:** khi một dòng tới hạn kiểm lại, khi phát hiện một ràng buộc mới, và bắt buộc rà toàn bộ trước mỗi lần đổi phạm vi.
- **Làm thế nào:** mỗi dòng gồm bảy trường — phát biểu, hạng nguồn, đường dẫn nguồn gốc, ngày hiệu lực, ngày kiểm chứng, hạn kiểm lại, và **cái gì trong hệ sập nếu nó sai**. Trường cuối là trường quan trọng nhất: không có nó thì hồ sơ chỉ là một danh sách tin tức, đọc xong không biết đi sửa chỗ nào. Mọi tài liệu khác **trỏ về đây**, tuyệt đối không chép lại — chép lại là tạo bản thứ hai của cùng một sự thật, vi phạm P6 và N7.
- **Bắt buộc kể cả khi rỗng.** Dự án không có ràng buộc ngoài nào vẫn phải có tài liệu này và ghi rõ đã rà, không có. Hồ sơ rỗng là một lời khai đã kiểm; hồ sơ thiếu là im lặng, mà theo §8.5 của hiến pháp thì im lặng là trượt.
- **Sai thường gặp:** chép nội dung văn bản luật vào đây thay vì chép **phát biểu mà dự án phụ thuộc**. Hồ sơ này không phải bản sao của luật; nó là danh sách những chỗ dự án đang tựa vào bên ngoài. Sai thường gặp thứ hai: ghi xong rồi để đó, không đặt hạn kiểm lại — khi đó tài liệu chỉ dời chỗ cất cái sai, không loại bỏ được nó.

### 4.3 PRD.md (tầng định hình)

- **Là gì:** bản tuyên bố sản phẩm (Product Requirements Document).
- **Làm gì:** là "hợp đồng" giữa ý chí của người chủ và mọi phiên AI. Mọi tranh cãi về phạm vi đều tra về đây.
- **Trả lời câu hỏi:** làm cái gì? Cho ai? Tại sao họ trả tiền? Thế nào là thành công? Và quan trọng nhất: cái gì KHÔNG làm?
- **Ai viết, ai đọc:** Cowork phỏng vấn người chủ rồi soạn, người chủ duyệt từng dòng. Phiên kế hoạch và phiên audit đọc.
- **Khi nào cập nhật:** khi thay đổi phạm vi, và bắt buộc sửa PRD trước khi sửa code. Không bao giờ "nhờ thêm nhanh cái này" mà bỏ qua PRD.
- **Làm thế nào:** kể ý tưởng bằng tiếng người, yêu cầu AI hỏi ngược 10 câu làm rõ trước khi viết, rồi mới cho soạn.
- **Sai thường gặp:** thiếu mục "không làm" (non-goals), khiến dự án phình vô hạn.

### 4.4 ARCHITECTURE.md (tầng định hình)

- **Là gì:** bản vẽ kỹ thuật tổng thể.
- **Làm gì:** giữ cho mọi phiên thi công xây trên cùng một bộ khung, không mỗi phiên chọn một kiểu.
- **Trả lời câu hỏi:** dùng stack gì? Dữ liệu tổ chức ra sao? Hệ thống chia mấy tầng? Cái gì làm phase 1, cái gì để sau?
- **Ai viết, ai đọc:** Cowork viết trong phiên kiến trúc. Người chủ duyệt bằng một mẹo: yêu cầu AI giải thích lại toàn bộ cho người không chuyên, chỗ nào nghe không hiểu là chỗ đó chưa đủ rõ hoặc đang phức tạp hoá.
- **Khi nào cập nhật:** khi có quyết định kiến trúc mới, và mỗi lần sửa phải kèm một mục trong DECISIONS.md.
- **Làm thế nào:** ưu tiên stack quen thuộc đã dùng qua thay vì stack mới lạ, vì AI thi công ổn định hơn trên nền phổ biến và người chủ nghiệm thu dễ hơn trên nền đã hiểu.
- **Sai thường gặp:** thiết kế cho 1 triệu người dùng khi chưa có người dùng nào. Kiến trúc tốt là kiến trúc đủ cho 12 tháng tới.

### 4.5 DESIGN.md (tầng định hình)

- **Là gì:** hồ sơ giao diện và luồng người dùng.
- **Làm gì:** chốt cái người dùng nhìn thấy trước khi tốn công code. Đổi ý ở prototype tốn 5 phút, đổi ý sau khi code tốn cả ngày.
- **Trả lời câu hỏi:** người dùng thấy màn hình gì? Bấm gì? Đi luồng nào từ lúc vào đến lúc đạt mục đích?
- **Ai viết, ai đọc:** Claude Design hoặc Artifacts tạo prototype bấm thử được, người chủ bấm thử và sửa bằng lời cho đến khi ưng, rồi chốt lại thành file kèm mô tả từng màn hình. Phiên thi công đọc.
- **Khi nào cập nhật:** trước khi code bất kỳ màn hình mới nào.
- **Làm thế nào:** làm 3 đến 5 màn hình lõi trước, không vẽ cả trăm màn hình. Màn hình phụ để AI tự suy ra theo phong cách đã chốt.
- **Sai thường gặp:** bỏ qua bước này và để AI "tự vẽ trong lúc code", kết quả là giao diện mỗi trang một kiểu.

### 4.6 CLAUDE.md (tầng sống)

- **Là gì:** bản nội quy dành riêng cho AI, được Claude Code tự đọc đầu mỗi phiên mà không cần nhắc. **Đây là tài liệu duy nhất trong bộ 9 có tính tự động** — tám tài liệu kia chỉ có hiệu lực khi một phiên chịu mở chúng ra đọc.
- **Hai nửa, hai thời điểm ra đời (tách ở v1.5).** Gộp chúng làm một là lỗi của mọi bản trước v1.5, vì hai nửa có điều kiện tiên quyết khác hẳn nhau:

| Nửa | Nội dung | Chưng cất từ | Ra đời ở |
|---|---|---|---|
| **A. Luật vận hành phiên** | Thứ tự ưu tiên khi tài liệu mâu thuẫn · ngưỡng phải là số không phải tính từ · im lặng là trượt · một sự thật một bản · ghi DECISIONS ngay lúc quyết · tài liệu dưới phải trỏ đúng phiên bản tài liệu trên · phải đọc gì trước khi sửa gì | CONSTITUTION + chính khung này | **Bước 2** |
| **B. Luật thi công** | Quy ước code · lệnh build, test, deploy · điều cấm kỹ thuật · bẫy đã mắc | CONSTITUTION + ARCHITECTURE | **Bước 7** |

- **Vì sao nửa A không được đợi bước 7.** Toàn bộ công việc tài liệu — hồ sơ ràng buộc, PRD, kiến trúc, sổ giao việc, nhật ký quyết định — diễn ra **trước** bước 7. Để nửa A ở bước 7 là để phần rủi ro nhất của dự án chạy không hàng rào, rồi dựng hàng rào lúc phần đó đã xong. Nửa A không cần biết gì về kiến trúc, nên không có lý do kỹ thuật nào bắt nó phải đợi.
- **Làm gì:** biến quy ước và bài học thành luật tự động, để phiên mới không lặp lại lỗi của phiên cũ.
- **Trả lời câu hỏi:** phiên này phải đọc gì trước khi làm gì? Khi hai tài liệu cãi nhau thì cái nào thắng? Quy ước code là gì? Lệnh build, test, deploy chạy thế nào? Điều gì cấm?
- **Ai viết, ai đọc:** nửa A chưng cất ở bước 2, nửa B bổ sung ở bước 7. Chỉ Claude Code đọc.
- **Khi nào cập nhật:** mỗi khi AI mắc một lỗi lặp lại lần thứ hai, lỗi đó phải được biến thành một dòng luật ở đây.
- **Làm thế nào:** giữ **dưới 600 từ và dưới 4 KB** cho cả hai nửa cộng lại, vì file này chiếm chỗ trong bộ nhớ làm việc của **mọi** phiên. *Đặt số ở v1.5, thay cho "dưới 1 trang":* mốc cũ là **một tính từ trá hình**, đúng loại mà v1.3 đã phải sửa cho CONSTITUTION.md — và lần đó không ai sửa cho file này. Con số dẫn từ chính số học của v1.3 (2 trang ≈ 900 từ, nên 1 trang ≈ 450 từ), nới lên 600 vì nửa A phải chở thêm bảng thứ tự ưu tiên tài liệu mà bản gốc không lường. Vượt ngưỡng thì đẩy chi tiết sang file khác và nạp bằng dòng import, không phải cắt luật. Chi tiết dài đưa sang file khác và nạp bằng cú pháp import: viết @đường-dẫn-file trên dòng thường, không đặt trong dấu backtick hay khối code vì khi đó import mất hiệu lực. Đây cũng là cách nối CONSTITUTION.md vào mỗi phiên (kiểm chứng ở phụ lục C).
- **Sai thường gặp:** chép nguyên cả ARCHITECTURE vào. CLAUDE.md là nội quy treo tường, không phải bộ hồ sơ.

### 4.7 TASKS.md (tầng sống)

- **Là gì:** sổ giao việc của toàn công ty.
- **Làm gì:** là hàng đợi công việc và bảng tiến độ, thay cho họp giao ban.
- **Trả lời câu hỏi:** việc gì làm tiếp theo? Việc gì xong? Việc gì đang bị chặn và vì sao?
- **Ai viết, ai đọc:** Cowork chia task từ PRD. Claude Code nhận việc từ đây và đánh dấu tiến độ. Người chủ nhìn vào đây để biết trạng thái dự án trong 30 giây.
- **Khi nào cập nhật:** liên tục, là file sống động nhất hệ thống.
- **Làm thế nào:** mỗi task gồm 3 phần: mô tả, tiêu chí nghiệm thu bấm thử được, trạng thái. Task cỡ 1 phiên làm xong.
- **Sai thường gặp:** task to kiểu "làm module quản lý nhân sự". Task đúng cỡ là "màn hình danh sách nhân viên có tìm kiếm theo tên, nghiệm thu: gõ 'an' ra đúng người tên An".

### 4.8 DECISIONS.md (tầng sống)

- **Là gì:** nhật ký quyết định, phiên bản rút gọn của ADR (Architecture Decision Record) trong doanh nghiệp.
- **Làm gì:** chống việc phiên AI mới, không biết lịch sử, "cãi lại" quyết định cũ và tự ý đổi hướng. Đây là trí nhớ về chữ "tại sao" của công ty.
- **Trả lời câu hỏi:** tại sao ngày đó chọn phương án này mà không phải phương án kia?
- **Ai viết, ai đọc:** bất kỳ phiên nào khi ra một quyết định đáng nhớ đều ghi vào. Phiên kiến trúc và phiên audit đọc.
- **Khi nào cập nhật:** ngay lúc quyết định, không để sau.
- **Làm thế nào:** mỗi mục đúng 3 dòng: bối cảnh, quyết định, lý do. Có ngày tháng.
- **Sai thường gặp:** không ghi, rồi 2 tháng sau một phiên AI "tối ưu hoá" lại đúng chỗ đã cố tình làm vậy vì một lý do quan trọng.

### 4.9 RUNBOOK.md (tầng sống)

- **Là gì:** sổ tay vận hành và xử lý sự cố.
- **Làm gì:** biến vận hành từ "nhớ mang máng" thành quy trình tra cứu được, kể cả lúc 2 giờ sáng hệ thống sập.
- **Trả lời câu hỏi:** deploy thế nào? Hệ thống hỏng thì kiểm tra gì trước, gõ lệnh gì? Xem sức khoẻ hệ thống ở đâu?
- **Ai viết, ai đọc:** Claude Code viết sau khi thiết lập xong deploy. Người chủ và mọi phiên xử lý sự cố đọc.
- **Khi nào cập nhật:** sau mỗi sự cố, bắt buộc có mục rút kinh nghiệm 5 dòng (chuyện gì xảy ra, vì sao, đã sửa gì, làm gì để không tái diễn).
- **Làm thế nào:** viết ở dạng "nếu thấy X thì làm Y", người không chuyên đọc là làm theo được.
- **Sai thường gặp:** không có file này, mỗi lần sự cố lại hỏi AI từ đầu và mỗi lần được chỉ một kiểu.

---

## Phần 5: Bản đồ công cụ AI

Chức năng nào của "công ty" chạy bằng công cụ nào, và khi nào dùng:

| Chức năng | Công cụ | Khi nào dùng |
|---|---|---|
| Nghiên cứu, viết PRD, chia task | Cowork (kèm web search) | Đầu dự án và đầu mỗi tính năng lớn |
| Prototype giao diện | Claude Design, Artifacts | Trước khi code màn hình mới |
| Thi công chính | Claude Code (desktop hoặc terminal) + plan mode | Mọi task trong TASKS.md |
| Thi công song song | Subagents (một agent trưởng điều phối nhiều agent con), phiên Claude Code trên web | Khi có nhiều task độc lập nhau |
| Giao việc qua đêm | Claude Code trên web, app mobile | Giao tối, sáng nghiệm thu |
| Kiểm tra máy móc | Hooks (tự chạy lint, test sau mỗi lần sửa file) | Cấu hình 1 lần ở phase 0, chạy mãi mãi |
| Review độc lập | Review AI tự động trên pull request (GitHub Code Review) | Mọi pull request, không ngoại lệ |
| Audit định kỳ | Phiên Cowork hoặc Claude Code mới, chỉ đọc và báo cáo | Sau mỗi 3 đến 5 task |
| Deploy tự động | GitHub Actions (CI/CD) | Cấu hình 1 lần, chạy khi merge |
| Giám sát, báo cáo định kỳ | Routines (chạy theo lịch trên hạ tầng Anthropic, máy tắt vẫn chạy) | Báo cáo sáng, audit dependency hằng tuần |
| Phân tích log, việc vặt | CLI: pipe log hoặc dữ liệu vào Claude Code | Khi cần soi nhanh một vấn đề vận hành |
| Xử lý phát sinh khi vắng mặt | Mention @Claude trong Slack kèm mô tả lỗi, nhận về pull request | Khi đang di chuyển, đi công tác |

Nguồn tra sâu: toàn bộ mục lục tài liệu Claude Code tại code.claude.com/docs/llms.txt và trang best practices tại code.claude.com/docs/en/best-practices.

---

## Phần 6: Khởi động một dự án mới (bootstrap)

Trình tự chuẩn cho bất kỳ ứng dụng nào, phase 0 gói trong 1 buổi:

1. Tạo repo git trống. Đây là "trụ sở công ty".
2. Chép CONSTITUTION.md (dùng chung) vào repo, **và ngay tại đây viết nửa A của CLAUDE.md — luật vận hành phiên** (mục 4.6). Nguyên liệu đã đủ: hiến pháp vừa chép vào, cộng chính khung này. Nối hiến pháp vào mọi phiên bằng dòng import `@CONSTITUTION.md`. **Thêm ở v1.5, và đây là bước rẻ nhất trong 11 bước:** không có nó thì toàn bộ công việc tài liệu từ bước 3 tới bước 6 chạy mà không hàng rào nào, chỉ dựa vào việc mỗi phiên tự đọc rồi tự khai đã đọc.
3. Phiên khảo sát ràng buộc bên ngoài: liệt kê mọi thứ dự án sẽ phụ thuộc mà không kiểm soát được — luật, hệ thống nhà nước, API bên thứ ba, giới hạn nhà cung cấp — rồi đối chiếu nguồn gốc từng cái và soạn RANG_BUOC_NGOAI.md. Bước này đứng TRƯỚC PRD, vì PRD tuyên bố phạm vi, mà phạm vi không được phép mâu thuẫn một ràng buộc mình không đổi được. Dự án rà xong thấy không có ràng buộc ngoài nào thì vẫn lập tài liệu và ghi rõ điều đó.
4. Phiên Cowork số 1: kể ý tưởng, để AI hỏi ngược 10 câu, soạn PRD.md. **Trước khi trình Chốt 1, chạy subagent spec-reviewer trên chính PRD** (thêm ở v1.5 — bảng ở phần 11 đã kê cổng này từ v1.1, nhưng nó không nằm trong trình tự nên thực tế không ai chạy). Subagent bắt đầu trống, không thấy hội thoại, nên nó đọc tài liệu như một người lạ — đó là điều kiện để bắt được loại lỗi mà người đã viết ra tài liệu không bắt được. **Ba thứ nó phải soi, ngoài danh sách ở phần 11:** (a) **hai mục của cùng tài liệu có mâu thuẫn nhau không** — mục A hứa không làm X trong khi tiêu chí nghiệm thu của mục B đòi X; (b) mọi ngưỡng có phải là số kiểm được không; (c) mọi tham chiếu tới tài liệu khác có trỏ đúng phiên bản hiện hành không. Chốt 1: duyệt.

   **Quy ước hình thức bắt buộc, thêm ở v1.5: mọi mục để mở chờ một chốt phải nằm trong đúng MỘT danh sách của tài liệu**, có tiêu đề riêng, đánh số. Không được để một mục chờ chốt nằm chìm trong đoạn văn ở một mục khác. Lý do rất cụ thể: một vòng chốt luôn đọc theo danh sách, nên mục nằm ngoài danh sách thì **không thể** được chốt, và nó sẽ trôi qua hết phiên bản này tới phiên bản khác trong khi tài liệu vẫn ghi "chờ chốt". Quy ước này biến việc kiểm từ *đọc hết tài liệu* thành *grep một tiêu đề*.
5. Phiên Cowork số 2 (phiên mới): từ PRD, soạn ARCHITECTURE.md và TASKS.md đợt đầu. Duyệt bằng cách bắt giải thích cho người không chuyên.
6. Claude Design: prototype 3 đến 5 màn hình lõi, bấm thử, chốt DESIGN.md.
7. **Bổ sung nửa B của CLAUDE.md — luật thi công**, chưng cất từ CONSTITUTION + ARCHITECTURE (mục 4.6). Nửa A đã có từ bước 2; bước này **thêm vào chứ không viết lại**. Cả file giữ dưới 1 trang, chi tiết dài đẩy sang file khác và nạp bằng dòng import.
8. Cài đặt đường ray: hooks (lint, test tự động), GitHub Actions (deploy staging), bật review AI trên pull request, và một kiểm tra tự động đọc RANG_BUOC_NGOAI.md để chặn khi có dòng quá hạn kiểm lại.
9. Chạy vòng lặp phần 3 cho task số 1, đi hết 4 chốt một lượt để làm quen nhịp.
10. Sau 3 đến 5 task: phiên audit đầu tiên, đối chiếu code với PRD và ARCHITECTURE.
11. Khi deploy được bản staging đầu tiên: nhờ Claude Code viết RUNBOOK.md, đặt Routine báo cáo sáng.

Kể từ đây công ty đã "vào guồng": mọi việc mới chỉ là chạy lại vòng lặp phần 3.

---

## Phần 7: Vòng học, cách công ty một người tích luỹ kinh nghiệm

Công ty trăm người tích luỹ kinh nghiệm qua con người ở lại lâu năm. Công ty một người tích luỹ kinh nghiệm bằng cách **chưng cất mọi bài học vào tài liệu**, theo 3 mức:

| Mức bài học | Ví dụ | Chưng cất vào |
|---|---|---|
| Lỗi kỹ thuật lặp lại | AI hai lần quên chạy migration trước khi test | Thêm 1 dòng luật vào CLAUDE.md |
| Quyết định quan trọng | Chọn thư viện A thay vì B vì lý do X | Thêm 3 dòng vào DECISIONS.md |
| Bài học nguyên tắc (mất tiền, mất nhiều thời gian) | Nhận ra không bao giờ được deploy thẳng production | Thêm 1 điều vào CONSTITUTION.md, tăng phiên bản |

Nghi thức duy trì: mỗi tuần 30 phút "họp rút kinh nghiệm" với một phiên AI mới: cho nó đọc git log và TASKS.md tuần qua, yêu cầu đề xuất các cập nhật tài liệu theo 3 mức trên, người chủ duyệt.

Đây là điểm ăn tiền của cả mô hình: sau 6 đến 12 tháng, bộ tài liệu trở thành một "đội ngũ senior bất tử": không nghỉ việc, không quên, không mang tri thức đi nơi khác, và mọi phiên AI mới lập tức thừa hưởng toàn bộ. Công ty không thông minh lên bằng cách tuyển người, mà bằng cách nâng cấp tài liệu.

---

## Phần 8: Nguồn gốc của framework và đối chiếu thực tiễn tập đoàn

Nói thẳng về xuất xứ: framework này là một bản chưng cất, không sao chép nguyên khối từ một chuẩn nào. Nhưng từng thành phần đều bắt nguồn từ các mô hình đã được kiểm chứng hàng chục năm trong doanh nghiệp lớn, và toàn bộ cấu trúc tài liệu trùng khớp với trào lưu Spec-Driven Development (SDD) đang được chuẩn hoá trong ngành (GitHub Spec Kit, Amazon Kiro). Mức độ tin cậy của từng phát biểu được phân hạng trong phụ lục C.

| Thành phần trong framework | Mô hình gốc | Ai dùng ngoài đời, dùng thế nào |
|---|---|---|
| Tài liệu là công ty (nguyên lý 1) | Văn hoá document-first | Amazon cấm trình chiếu slide trong họp lãnh đạo, thay bằng bản ghi 6 trang đọc im lặng đầu họp; sản phẩm mới bắt đầu bằng PR/FAQ, tức viết thông cáo báo chí trước khi làm sản phẩm. Google yêu cầu design doc được review trước khi code các hệ thống lớn |
| PRD và spec | Quản trị sản phẩm hiện đại | Chuẩn nghề product manager tại Google, Meta, Microsoft |
| 4 chốt người duyệt (phần 3) | Stage-Gate (Robert Cooper), phase-gate | NASA chia vòng đời dự án theo các Key Decision Point: phải qua các kỳ review lớn như PDR (duyệt thiết kế sơ bộ) và CDR (duyệt thiết kế chi tiết) mới được cấp nguồn lực đi tiếp. Boeing và ngành hàng không dùng phase-gate tương tự cho các chương trình máy bay. Stage-Gate gốc được P&G, 3M dùng cho phát triển sản phẩm mới |
| Tách vai, reviewer độc lập (nguyên lý 2) | Segregation of Duties, nguyên tắc 4 mắt | Ngân hàng áp dụng maker-checker: người tạo lệnh chuyển tiền khác người duyệt lệnh. NASA có hẳn chương trình IV&V: một cơ sở độc lập chuyên kiểm chứng phần mềm bay, tách hoàn toàn khỏi đội phát triển |
| Ba khối và chuỗi cổng (phần 2 và 11) | Three Lines of Defense | Chuẩn quản trị rủi ro của IIA, áp dụng bắt buộc hoặc phổ biến trong ngân hàng và bảo hiểm toàn cầu |
| DECISIONS.md | Architecture Decision Records (Michael Nygard, 2011) | Thực hành phổ biến tại AWS, Spotify, được ThoughtWorks khuyến nghị áp dụng rộng |
| RUNBOOK và rút kinh nghiệm sau sự cố | Google SRE | Sách Site Reliability Engineering: runbook cho đội trực ca, blameless post-mortem (mổ xẻ sự cố tìm nguyên nhân hệ thống, không đổ lỗi cá nhân) |
| Đường ray máy móc, hooks, CI (nguyên lý 4) | Policy as code, quality gate | Google bắt mọi thay đổi code chạy qua presubmit check tự động trước khi con người review. Microsoft, sau bản ghi nhớ Trustworthy Computing của Bill Gates năm 2002, đưa quy trình SDL với các cổng bảo mật bắt buộc vào phát triển phần mềm |
| Vòng lặp nhỏ (nguyên lý 5) | Agile, Scrum, kanban | Chuẩn toàn ngành phần mềm; kanban có gốc từ dây chuyền Toyota |
| Truy vết yêu cầu tới test, regression test trước khi fix | Requirements traceability | Chuẩn DO-178C cho phần mềm bay dân dụng (Boeing, Airbus phải tuân thủ): mọi yêu cầu phải truy vết được tới test chứng minh nó. NASA có châm ngôn "test as you fly, fly as you test" |
| Vòng học (phần 7) | PDCA (Deming), kaizen | Hệ thống sản xuất Toyota: cải tiến liên tục từ bài học hiện trường |
| CONSTITUTION.md | Hiến pháp dự án trong SDD | GitHub Spec Kit dùng file constitution.md làm bộ nguyên tắc bất biến, agent đọc trước mỗi task. Anthropic huấn luyện Claude theo phương pháp Constitutional AI, cũng dựa trên một bản nguyên tắc gốc |

### Bài học xương máu: vì sao các cổng tồn tại

Ba sự cố kinh điển của ngành, mỗi cái giải thích lý do tồn tại của một thành phần trong framework:

- **Ariane 5 (1996):** tái sử dụng phần mềm của Ariane 4 mà không kiểm lại các giả định trong bối cảnh mới, tên lửa tự huỷ sau khoảng 37 giây bay. Bài học: quyết định cũ phải có hồ sơ bối cảnh, đó là lý do tồn tại của DECISIONS.md.
- **Knight Capital (2012):** deploy phần mềm giao dịch thiếu 1 trong 8 máy chủ, một lá cờ cấu hình cũ bị tái sử dụng, công ty mất khoảng 440 triệu USD trong 45 phút. Bài học: deploy phải là quy trình máy móc qua CI và RUNBOOK, không phải thao tác tay theo trí nhớ.
- **Therac-25 (thập niên 1980):** máy xạ trị bỏ khoá an toàn phần cứng và đặt trọn niềm tin vào phần mềm, lỗi phần mềm gây quá liều phóng xạ chết người. Bài học: không bao giờ tin một lớp phòng thủ duy nhất, đó là lý do có nhiều tuyến kiểm soát chồng lên nhau.

---

## Phần 9: Skill và Subagent, bố trí và cách tạo

### Phân biệt

| | Skill | Subagent |
|---|---|---|
| Bản chất | Bí kíp, quy trình đóng gói, nạp vào phiên hiện tại khi cần | Nhân sự chuyên trách, có context window riêng, bắt đầu trống, không thấy hội thoại chính |
| Ví von | SOP treo tường | Nhân viên có bàn làm việc riêng |
| Dùng khi | Cần cách làm nhất quán, lặp lại | Cần con mắt độc lập, quyền hạn riêng, hoặc việc chạy song song |

Mẹo phân loại nhanh: nếu đang viết "AI phải luôn luôn..." hoặc "không bao giờ được..." thì đó là việc của hook (luật máy móc). Nếu viết "khi làm X thì ưu tiên Y" thì đó là skill. Nếu cần "một người khác kiểm tra lại" thì đó là subagent.

### Bộ khởi điểm cho một dự án SaaS

| Loại | Tên | Nhiệm vụ | Quyền |
|---|---|---|---|
| Subagent | spec-reviewer | Soi PRD và spec tìm chỗ mơ hồ, thiếu non-goals, tiêu chí không kiểm được | Chỉ đọc |
| Phiên riêng | chuyên gia nghiệp vụ miền | Cho dự án có miền chuyên sâu mà người chủ không tự thẩm định được (luật thuế, y tế, tài chính…). Chạy ở phiên riêng (nguyên tắc mỗi vai một phiên), phán quyết theo bốn trạng thái chuẩn bên dưới, buộc trỏ căn cứ; kinh nghiệm cá nhân mang nhãn riêng và không được là căn cứ duy nhất của một phán quyết SỬA hay LEO THANG. Tiền lệ: cổng chuyên gia nghiệp vụ miền ở một dự án kế toán, 2026-08-11 | Chỉ ghi vào thư mục biên bản của nó |
| Subagent | code-reviewer | Đối chiếu diff với CLAUDE.md và ARCHITECTURE.md | Chỉ đọc |
| Subagent | qa-tester | Chạy test và báo cáo | Chỉ sửa file test |
| Subagent | security-auditor | Soi auth, phân quyền, secrets | Chỉ đọc |
| Skill | viet-spec | Cách viết spec theo template của hệ thống | |
| Skill | stack-conventions | Quy ước của stack đang dùng | |
| Skill | db-migrations | Quy trình migration database an toàn | |
| Skill | release | Quy trình deploy theo RUNBOOK | |
| Skill | domain-knowledge | Tri thức nghiệp vụ của lĩnh vực (ví dụ luật lao động cho HRM) | |

### Bốn trạng thái phán quyết, dùng chung cho mọi subagent kiểm soát

Từ v1.7, không riêng cổng chuyên gia nghiệp vụ miền: spec-reviewer, code-reviewer, qa-tester, security-auditor và mọi subagent "chỉ đọc, báo cáo" khác đều phán quyết bằng đúng bốn trạng thái này, không tự bịa cách nói riêng.

| Trạng thái | Nghĩa | Ai xử lý tiếp |
|---|---|---|
| **ĐẠT** | Không có vấn đề đáng ghi | Đi tiếp |
| **ĐẠT CÓ ĐIỀU KIỆN** | Đạt, nhưng có điều kiện cụ thể phải làm trước khi hợp nhất | Phiên thi công thực hiện điều kiện, không cần soi lại từ đầu |
| **SỬA** | Chưa đạt, lỗi nằm trong thẩm quyền kỹ thuật của phiên thi công | Phiên thi công sửa, soi lại |
| **LEO THANG** | Vượt thẩm quyền của subagent — mơ hồ cấu trúc, đụng bất biến, hoặc rủi ro cao theo P8 của hiến pháp | Người chủ quyết, không tự chọn thay |

Phân biệt SỬA và LEO THANG là ranh giới quan trọng nhất: SỬA vẫn nằm trong việc AI tự làm tiếp được, LEO THANG thì không — im lặng gộp hai trạng thái này lại đúng loại lỗi khiến một subagent "tự quyết luôn cho nhanh" đúng chỗ lẽ ra phải dừng.

### Tạo đúng chuẩn

Subagent:
- Là file Markdown có YAML frontmatter (name, description, tools, model), đặt trong `.claude/agents/` của dự án hoặc `~/.claude/agents/` để dùng chung mọi dự án. Tạo bằng lệnh `/agents` hoặc viết tay.
- Trường quan trọng nhất là **description**, vì Claude dựa vào đó để quyết định khi nào giao việc cho subagent nào.
- Mỗi agent một việc. Giới hạn tools chặt: reviewer chỉ được đọc, không được sửa.
- Subagent khởi đầu với context trống, nên mọi thứ nó cần biết phải nằm trong tài liệu của repo hoặc trong lời giao việc.

Skill:
- Là thư mục chứa file SKILL.md, frontmatter gồm name và description. Description phải chứa các từ khoá kích hoạt để AI biết khi nào cần nạp.
- Thân file giữ ngắn, chi tiết dài tách sang file phụ trong cùng thư mục và trỏ tới.

Quy tắc vàng cho người không chuyên: đừng viết tay, bảo Claude tự tạo theo docs chính thức rồi mình duyệt. Và quy tắc sinh skill: điều gì phải giải thích cho AI đến lần thứ ba thì đóng gói thành skill.

---

## Phần 10: Hooks, bộ đường ray tối thiểu

Nguyên lý: hooks là lệnh chạy tự động tại các mốc trong vòng đời làm việc của AI, và khác với chỉ dẫn trong CLAUDE.md (lời khuyên AI có thể quên), hooks chạy mọi lần như luật vật lý, bất kể AI hành xử ra sao.

Cơ chế then chốt: hook trả về **exit code 2** mới là chặn, và thông báo lỗi được đưa ngược lại cho AI đọc để tự sửa. Bẫy phổ biến nhất: exit code 1 KHÔNG chặn gì cả, hệ thống coi đó là lỗi không chặn và vẫn đi tiếp.

Bộ 5 hooks tối thiểu, khai báo trong `.claude/settings.json` của dự án (hoặc `~/.claude/settings.json` cho mọi dự án):

| # | Sự kiện | Việc | Vì sao bắt buộc |
|---|---|---|---|
| 1 | PostToolUse (Edit hoặc Write) | Tự format và typecheck sau mỗi lần AI sửa file | Chất lượng đều tay, không cần nhắc |
| 2 | PreToolUse (Bash) | Chặn lệnh phá hoại: xoá đệ quy, force push, deploy thẳng production | An toàn tuyệt đối kể cả khi AI "quên" |
| 3 | PreToolUse (Read, Edit, Write) | Chặn đọc và sửa file chứa secrets (.env) | Bảo vệ mật khẩu và khoá API |
| 4 | PreToolUse (Edit, Write) | Chặn sửa file quản trị: CONSTITUTION.md, migration đã chạy | AI không được tự sửa luật của chính nó |
| 5 | Stop | Chạy test suite khi AI định kết thúc; test đỏ thì chặn (exit 2) buộc làm tiếp | Biến "định nghĩa hoàn thành" thành luật cứng |

Lời khuyên chống quá đà: vài hook luôn luôn chạy có giá trị hơn 30 trang khuyên bảo mà AI có thể không theo. Chỉ đưa vào hook những điều bất khả xâm phạm, phần còn lại để trong CLAUDE.md và skill.

### Circuit breaker cho phiên chạy không giám sát

5 hook trên giả định có một phiên tương tác, người chủ đang ngồi cạnh. Khi một job AI chạy mà không có ai ngồi cạnh — headless, chạy theo lịch, hoặc tự động kích hoạt trên PR — phải khai trước ít nhất bốn giới hạn, không phải tuỳ chọn. Anthropic có khuyến nghị vận hành chính thức về kiểm soát timeout, rate limit, allowed tools và chi phí đúng cho kiểu chạy này.

| Giới hạn | Cơ chế ví dụ | Vượt thì |
|---|---|---|
| Max Turns | `--max-turns` | STOP |
| Max Runtime | `timeout-minutes` | STOP |
| Max Retry / vòng tự sửa | trần số vòng, đếm bằng nhãn hoặc biến đếm | STOP, LEO THANG |
| Max Files Changed / phạm vi sửa | `permissions.deny` chặn thư mục nhạy cảm | STOP, LEO THANG |

Vượt bất kỳ giới hạn nào: dừng job ngay, không âm thầm thử lại vòng kế tiếp, và LEO THANG (xem Phần 9) cho người chủ quyết — job tự nó không được tự gia hạn giới hạn của chính nó. Tiền lệ đã kiểm chứng bằng 5 PR test thật ở dự án ketoanvn (`claude-code-action`, 2026-08-18).

---

## Phần 11: Chuỗi cổng kiểm soát ba tuyến

Câu hỏi thường gặp: có thể đặt một AI giám sát toàn bộ quá trình theo thời gian thực không? Câu trả lời: không có và không nên có. Kiểm soát kiểu enterprise là một **chuỗi cổng**, mỗi cổng một kiểm soát viên độc lập, xếp theo mô hình Three Lines of Defense:

- **Tuyến 1** gắn ngay trong công việc, chạy máy móc: hooks, test suite, plan mode.
- **Tuyến 2** là con mắt AI độc lập: các subagent kiểm soát và review AI trên pull request.
- **Tuyến 3** là kiểm toán định kỳ: phiên audit riêng và họp rút kinh nghiệm.

| Giai đoạn | Kiểm soát viên | Cơ chế | Tuyến |
|---|---|---|---|
| Viết SPEC | Subagent spec-reviewer soi trước chốt 1; nếu dùng Spec Kit thì thêm lệnh analyze rà mâu thuẫn và lỗ hổng (chỉ đọc). **Từ v1.5 cổng này nằm trong trình tự bootstrap ở bước 4**, không còn chỉ nằm trong bảng này — vì một cổng chỉ được kê trong bảng thì thực tế không ai chạy | Cổng trước khi duyệt phạm vi | 2 |
| Mọi phiên, từ phiên đầu tiên | **CLAUDE.md nửa A** tự nạp vào mọi phiên kèm `@CONSTITUTION.md` (thêm ở v1.5) | Tầng duy nhất có hiệu lực mà không cần ai nhớ mở tài liệu ra | 1 |
| SOP | Đóng gói thành skill (dạng khuyên) hoặc hook (dạng cấm) | Luật hoá quy trình | 1 |
| Coding | Hooks 1 đến 5 chạy theo thời gian thực; plan mode chặn trước thi công | Máy móc | 1 |
| Review | Subagent code-reviewer (tại chỗ) và review AI trên pull request (độc lập, khác context) | Hai con mắt khác nhau | 2 |
| Bug | Luật trong CLAUDE.md: mỗi bug phải có regression test tái hiện được lỗi trước khi fix; qa-tester xác nhận | Chống lỗi cũ quay lại | 1 và 2 |
| Fix | Stop hook chặn kết thúc khi test đỏ; sau fix ghi 5 dòng vào RUNBOOK | Định nghĩa hoàn thành cứng | 1 |
| Toàn cục | Phiên audit định kỳ đối chiếu code với PRD và ARCHITECTURE; họp rút kinh nghiệm tuần cập nhật luật | Kiểm soát viên của các kiểm soát viên | 3 |

Người chủ đứng trên cả ba tuyến ở vai người phê duyệt cuối cùng tại 4 chốt.

---
## Phụ lục A: khung xương của 9 tài liệu

Dùng làm điểm khởi đầu, để AI điền chi tiết theo từng dự án.

### CONSTITUTION.md

```markdown
# Hiến pháp, phiên bản X.Y
## Giá trị bất biến
1. ...
## Điều cấm tuyệt đối
1. ...
## Nghi thức sửa hiến pháp
Chỉ sửa khi có bài học lớn, ghi lý do và tăng phiên bản.
```

### RANG_BUOC_NGOAI.md

```markdown
# Hồ sơ ràng buộc bên ngoài: [tên dự án]
## Quy ước
Hạng nguồn [A] [B] [C]. Hạn kiểm lại: [số tháng] cho pháp luật,
[số tháng] cho hệ thống bên thứ ba. Quá hạn thì tự hạ xuống [C].
## [Nhóm ràng buộc, ví dụ: Pháp luật]
| # | Phát biểu | Hạng | Nguồn gốc | Hiệu lực | Kiểm ngày | Cái gì sập nếu sai |
## Nhật ký kiểm chứng
| Ngày | Ai | Làm gì | Kết quả |
```

### PRD.md

```markdown
# PRD: [tên sản phẩm]
## Bài toán và người dùng
Ai đang khổ vì điều gì, hiện họ giải quyết bằng cách nào.
## Giải pháp
Sản phẩm làm gì, khác gì cách hiện tại.
## Tiêu chí thành công
Đo bằng con số gì, sau bao lâu.
## Phạm vi phase 1
Danh sách tính năng, gọn nhất có thể.
## KHÔNG làm (non-goals)
Liệt kê rõ để chống phình dự án.
```

### ARCHITECTURE.md

```markdown
# Kiến trúc: [tên sản phẩm]
## Stack
Frontend, backend, database, hạ tầng, lý do chọn (1 dòng mỗi thứ).
## Mô hình dữ liệu
Các bảng chính và quan hệ, mô tả bằng lời trước, chi tiết sau.
## Phân tầng và ranh giới
Cái gì phase 1, cái gì cố tình để sau.
```

### DESIGN.md

```markdown
# Thiết kế: [tên sản phẩm]
## Nguyên tắc giao diện
Phong cách, màu, ngôn ngữ hiển thị.
## Các màn hình lõi
Mỗi màn hình: tên, mục đích, thành phần chính, hành động chính.
## Luồng người dùng chính
Từ lúc vào đến lúc đạt mục đích, từng bước.
```

### CLAUDE.md

```markdown
# Nội quy
@CONSTITUTION.md

## Nửa A — luật vận hành phiên (viết ở bước 2)
### Đọc trước khi làm
Phiên loại nào phải mở tài liệu nào trước khi được sửa gì.
### Khi tài liệu cãi nhau
Thứ tự ưu tiên, 1 dòng.
### Luật viết tài liệu
Ngưỡng là số không phải tính từ · im lặng là trượt · một sự thật một bản ·
ghi DECISIONS ngay lúc quyết · sửa nội dung thì phải thêm dòng nhật ký phiên bản ·
tài liệu dưới phải trỏ đúng phiên bản tài liệu trên · mục chờ chốt nằm trong 1 danh sách.

## Nửa B — luật thi công (bổ sung ở bước 7)
### Stack và lệnh
Lệnh cài đặt, chạy dev, test, deploy.
### Quy ước
Đặt tên, cấu trúc thư mục, phong cách code.
### Điều cấm
Các luật rút từ lỗi đã gặp, mỗi luật 1 dòng.
```

### TASKS.md

```markdown
# Sổ giao việc
## Đang làm
- [ ] T012: [mô tả]. Nghiệm thu: [tiêu chí bấm thử được]
## Hàng đợi
- [ ] T013: ...
## Đã xong
- [x] T011: ... (commit abc123)
## Bị chặn
- T009: chờ [lý do]
```

### DECISIONS.md

```markdown
# Nhật ký quyết định
## 2026-08-07: [tiêu đề quyết định]
Bối cảnh: ...
Quyết định: ...
Lý do: ...
```

### RUNBOOK.md

```markdown
# Sổ tay vận hành
## Deploy
Từng bước, kèm lệnh.
## Khi hệ thống lỗi
Nếu thấy [triệu chứng] thì kiểm tra [đâu] rồi làm [gì].
## Giám sát
Xem sức khoẻ hệ thống ở đâu, con số nào là bình thường.
## Nhật ký sự cố
Mỗi sự cố 5 dòng: chuyện gì, vì sao, sửa gì, phòng ngừa gì.
```
---

## Phụ lục B: bảng thuật ngữ

Mục đích: thống nhất ngữ nghĩa để người và AI nói cùng một thứ tiếng. Quy ước chung: viết hoa hay viết thường (SPEC hay spec) không làm đổi nghĩa thuật ngữ, chỉ là kiểu chữ.

### B1. Nhóm mã nguồn và Git

- **repo (repository):** kho chứa toàn bộ mã nguồn và lịch sử thay đổi của một dự án. Trong framework này, repo là "trụ sở" của công ty ảo.
- **commit:** một bản chụp có ghi chú của dự án tại một thời điểm, đơn vị nhỏ nhất của lịch sử. Dùng khi: chốt xong một task; sai thì quay về commit trước đó.
- **diff:** bản so sánh "trước và sau" của một thay đổi, chỉ hiển thị dòng bị thêm (dấu +) và dòng bị xoá (dấu -), phần không đổi được ẩn đi. Dùng khi: review công việc của AI, đọc pull request, trả lời câu "phiên vừa rồi AI đã đụng vào những gì". Với người không chuyên, diff là công cụ kiểm soát quan trọng nhất vì nó ngắn và đọc được.
- **branch (nhánh):** bản sao song song của mã nguồn để làm một tính năng mà không đụng bản chính. Xong thì gộp lại (merge).
- **merge:** gộp thay đổi từ một nhánh vào bản chính.
- **pull request (PR):** lời đề nghị "xin gộp thay đổi của tôi vào bản chính", kèm diff để người hoặc AI khác review trước khi cho vào. Đây là cổng kiểm soát tự nhiên của mọi thay đổi.
- **git log:** dòng thời gian các commit, tức sổ nhật ký thi công của công ty.
- **migration:** kịch bản thay đổi cấu trúc database, chạy theo thứ tự và chỉ chạy một lần. Luật an toàn: migration đã chạy trên production thì không sửa lại, chỉ viết migration mới.

### B2. Nhóm tài liệu và quy trình

- **spec (specification, đặc tả):** tài liệu mô tả một tính năng phải làm gì và vì sao, chưa nói cách code. Trong framework này: spec là đặc tả cấp tính năng, PRD là đặc tả cấp sản phẩm.
- **PRD (Product Requirements Document):** tài liệu trả lời làm gì, cho ai, vì sao, thành công đo thế nào, và không làm gì. Làm gì: là hợp đồng giữa ý chí của người chủ và mọi phiên AI, nơi phân xử mọi tranh cãi về phạm vi. Là chuẩn nghề product manager tại các hãng lớn.
- **SDD (Spec-Driven Development):** phương pháp coi đặc tả bằng ngôn ngữ tự nhiên là nguồn sự thật chính để AI sinh code, thay cho lối "code là vua". Quy trình: constitution, specify, plan, tasks, implement. Hiện thực hoá bởi GitHub Spec Kit và Amazon Kiro.
- **ADR (Architecture Decision Record):** bản ghi một quyết định kiến trúc gồm bối cảnh, quyết định, lý do. DECISIONS.md của framework là ADR rút gọn.
- **SOP (Standard Operating Procedure):** quy trình thao tác chuẩn, các bước cố định cho việc lặp lại. Trong thế giới Claude, SOP được đóng gói thành skill.
- **non-goals:** danh mục những thứ cố tình không làm, ghi trong PRD. Là hàng rào chống phình dự án.
- **backlog:** hàng đợi các việc chưa làm, xếp theo ưu tiên.
- **sprint:** chu kỳ làm việc ngắn cố định (thường 1 đến 2 tuần) trong Scrum. Framework này rút gọn còn nhịp "1 task 1 phiên".
- **stage-gate (chốt):** điểm dừng bắt buộc trong quy trình, người có thẩm quyền duyệt mới được đi tiếp.
- **tiêu chí nghiệm thu (acceptance criteria):** điều kiện đo được, bấm thử được để tuyên bố một task hoàn thành, viết bằng tiếng người.
- **Definition of Done:** định nghĩa "xong" chung cho mọi task (ví dụ: test pass, đã format, đã cập nhật tài liệu). Trong framework này được cứng hoá bằng Stop hook.
- **post-mortem:** bản mổ xẻ sau sự cố để tìm nguyên nhân hệ thống, không đổ lỗi cá nhân. Văn hoá Google SRE.
- **runbook:** sổ tay vận hành dạng "nếu thấy X thì làm Y", dùng được cả lúc khẩn cấp.
- **PDCA / kaizen:** vòng Plan, Do, Check, Act của Deming và tinh thần cải tiến liên tục của Toyota. Là gốc của "vòng học" trong framework.
- **Three Lines of Defense:** mô hình 3 tuyến kiểm soát rủi ro: tuyến 1 gắn trong công việc, tuyến 2 giám sát độc lập, tuyến 3 kiểm toán định kỳ.
- **nguyên tắc 4 mắt (four-eyes, maker-checker):** người làm khác người duyệt. Gốc từ ngân hàng và kiểm toán.

### B3. Nhóm kỹ thuật hệ thống

- **stack:** bộ công nghệ dựng nên sản phẩm: ngôn ngữ, framework, database, hạ tầng.
- **frontend / backend:** phần người dùng nhìn thấy và bấm trên trình duyệt / phần xử lý phía máy chủ (logic, dữ liệu, bảo mật).
- **database:** nơi lưu dữ liệu có cấu trúc của ứng dụng.
- **API:** cổng giao tiếp chuẩn hoá giữa các phần mềm. Frontend nói chuyện với backend qua API.
- **môi trường dev / staging / production:** xưởng thử của người làm / bản chạy thử giống thật để nghiệm thu / bản thật khách đang dùng. Luật: không lên production khi chưa qua staging.
- **build:** quá trình biến mã nguồn thành bản chạy được.
- **deploy:** đưa bản build lên một môi trường để chạy.
- **rollback:** quay về phiên bản trước khi bản mới gây lỗi.
- **CI/CD:** dây chuyền tự động: mỗi thay đổi được tự build, tự test (CI) và tự deploy (CD). Trong framework chạy bằng GitHub Actions.
- **pipeline:** chuỗi bước tự động nối tiếp nhau trong CI/CD.
- **lint (linter):** máy soát lỗi phong cách và lỗi ngớ ngẩn trong code.
- **typecheck:** máy kiểm tra kiểu dữ liệu khớp nhau trước khi chạy, bắt lỗi sớm.
- **unit test / integration test / regression test:** test một hàm nhỏ / test nhiều phần ghép với nhau / test chống lỗi cũ quay lại. **Test suite** là toàn bộ các test của dự án.
- **secrets / .env:** mật khẩu, khoá API và file chứa chúng. Không bao giờ đưa vào repo, không cho AI đọc (chặn bằng hook).
- **log:** nhật ký hệ thống tự ghi khi chạy. Nơi đầu tiên nhìn vào khi có sự cố.

### B4. Nhóm Claude và AI

- **token:** đơn vị chữ mà model đọc và viết (khoảng 3/4 một từ tiếng Anh). Mọi giới hạn và chi phí tính bằng token.
- **context window:** bộ nhớ làm việc của một phiên, chứa toàn bộ hội thoại và mọi file đã đọc. Đầy thì AI giảm minh mẫn. Là tài nguyên khan hiếm nhất của cả mô hình.
- **phiên (session):** một cuộc làm việc liên tục với AI, có context riêng. Đóng phiên là "nhân viên" đó biến mất, chỉ còn lại những gì đã ghi ra file.
- **prompt:** yêu cầu hoặc chỉ dẫn gửi cho AI.
- **plan mode:** chế độ của Claude Code trong đó AI chỉ được trình kế hoạch, chưa được sửa file, chờ người duyệt.
- **hook:** lệnh tự chạy tại các mốc vòng đời làm việc của AI (trước khi dùng công cụ, sau khi sửa file, khi định dừng). Chạy máy móc, AI không bỏ qua được.
- **matcher:** bộ lọc trong khai báo hook, quy định công cụ nào thì kích hoạt hook đó (ví dụ chỉ Bash, chỉ Edit và Write).
- **exit code:** con số một chương trình trả về khi kết thúc. Với hook: 0 là cho qua, 2 là chặn và đưa thông báo ngược lại cho AI, còn 1 KHÔNG chặn (bẫy phổ biến).
- **skill:** gói bí kíp gồm thư mục chứa SKILL.md, được nạp vào phiên khi việc liên quan.
- **subagent:** nhân sự AI chuyên trách với context window riêng, quyền công cụ riêng, chỉ dẫn riêng.
- **agent (agentic):** AI biết tự hành động nhiều bước bằng công cụ (đọc file, chạy lệnh, sửa code) thay vì chỉ trả lời chữ.
- **MCP (Model Context Protocol):** chuẩn mở để cắm AI vào công cụ bên ngoài như Drive, Slack, database.
- **Routine:** tác vụ chạy theo lịch trên hạ tầng của Anthropic, máy của người dùng tắt vẫn chạy.
- **CLAUDE.md:** file nội quy thi công mà Claude Code tự đọc đầu mỗi phiên.
- **@import:** cú pháp trong CLAUDE.md để nạp thêm file khác bằng cách viết @đường-dẫn-file. Lưu ý: không có hiệu lực nếu đặt trong dấu backtick hoặc khối code; lồng tối đa 5 cấp; file được nạp ngay lúc khởi động phiên nên không tiết kiệm context. Xem kiểm chứng ở phụ lục C.
- **YAML frontmatter:** khối khai báo (name, description...) nằm giữa hai dòng --- ở đầu file cấu hình skill và subagent.
- **model (Haiku, Sonnet, Opus):** các cỡ model: nhanh và rẻ, cân bằng, sâu và đắt. Subagent có thể được gán model rẻ cho việc đơn giản để tiết kiệm chi phí.

---

## Phụ lục C: phân cấp độ tin cậy và kiểm chứng phát biểu

### Quy ước 3 hạng nguồn

Mọi phát biểu trong bộ tài liệu này (và các tài liệu con sau này) được gắn một trong ba hạng:

- **[A] Tài liệu chính thức:** có trong docs của nhà cung cấp (Anthropic, GitHub...), kiểm chứng được bằng đường link. Độ tin cậy cao nhất, nhưng có thể thay đổi theo phiên bản sản phẩm, cần tra lại định kỳ.
- **[B] Thực hành ngành đã kiểm chứng:** mô hình, chuẩn, sách được ngành công nhận rộng rãi (Google SRE, Stage-Gate, ADR, DO-178C, IIA). Ổn định theo thời gian.
- **[C] Chưng cất riêng của framework:** đề xuất tổng hợp cho bối cảnh 1 người + AI, chưa có "chuẩn ngành" bảo chứng. Phải được kiểm nghiệm bằng thực tế, sau đó nâng hạng (ghi lại thành quy tắc đã chứng minh) hoặc loại bỏ.

Nghi thức: từ v1.1, mọi phát biểu mới thêm vào hệ thống tài liệu phải gắn hạng. Hạng [C] được rà lại trong họp rút kinh nghiệm tuần.

### Chiều thời gian của hạng nguồn (thêm ở v1.4)

Ba hạng ở trên là **nhãn tĩnh**, và đó là một lỗ hổng: một phát biểu đúng vào lúc được kiểm vẫn thành sai sau đó, mà nhãn không tự đổi. Nên từ v1.4:

- **Phát biểu về thế giới bên ngoài** — tức phát biểu mà tính đúng của nó **không do dự án quyết định**: pháp luật, hành vi hệ thống bên thứ ba, giới hạn và bảng giá nhà cung cấp — bắt buộc mang **ngày kiểm chứng** và **hạn kiểm lại**.
- **Quá hạn thì tự động hạ xuống [C]**, và mọi task phụ thuộc nó bị chặn cho tới khi kiểm lại. Đây là áp §8.5 (mặc định từ chối) cho tri thức thay vì cho mã: không có bằng chứng còn đúng thì coi như chưa đúng.
- **Con số cụ thể của hạn thuộc cấp dự án**, theo §6.2 của hiến pháp; khung chỉ bắt buộc phải có một con số. Khuyến nghị mặc định: 6 tháng cho dòng chạm pháp luật, 3 tháng cho dòng chạm hệ thống bên thứ ba.
- **Phát biểu về chính mình** — mã của mình, quyết định của mình — không cần hạn, vì kiểm lại chỉ là đọc lại repo. Nhưng chúng cũng mục theo cách riêng, và thứ chống mục cho chúng là test và CI, không phải hạn kiểm lại.

### Tài liệu nghiên cứu do tác nhân sinh ra (thêm ở v1.4)

Một báo cáo do AI soạn là hạng **[C]** cho tới khi **từng phát biểu then chốt** trong đó được đối chiếu nguồn gốc — **kể cả khi báo cáo có trích dẫn đầy đủ**. Trích dẫn chứng minh tác giả đã đọc một cái gì đó; nó không chứng minh kết luận đúng, không chứng minh nguồn còn hiệu lực, và không chứng minh những gì bị bỏ sót.

Bằng chứng thực nghiệm, dự án ketoanvn ngày 2026-08-09: một báo cáo nghiên cứu 12 hạng mục với 44 trích dẫn, khi đối chiếu lại thì đúng hai điểm lớn, **đọc quá một điểm** (gán cho một điều luật một yêu cầu mà văn bản không có), và **bỏ sót hai điểm còn lớn hơn những gì nó nêu**. Cái nguy hiểm không phải chỗ nó sai — chỗ sai thì tra ra. Cái nguy hiểm là chỗ nó **im lặng**, vì một báo cáo đầy trích dẫn tạo cảm giác đã phủ hết.

### Bảng kiểm chứng các phát biểu then chốt

| Phát biểu | Hạng | Nguồn và ghi chú |
|---|---|---|
| CLAUDE.md được Claude Code tự đọc vào đầu mỗi phiên | [A] | code.claude.com/docs/en/memory |
| Viết dòng @CONSTITUTION.md trong CLAUDE.md thì file hiến pháp được tự nạp theo mỗi phiên | [A] | docs chính thức về memory: CLAUDE.md nạp file khác bằng cú pháp @đường-dẫn, cho phép đường dẫn tương đối và tuyệt đối, lồng tối đa 5 cấp. Hai lưu ý làm cho phát biểu "đúng có điều kiện": (1) viết trong dấu backtick hoặc khối code thì KHÔNG được nạp; (2) file nạp vào ngay lúc khởi động nên không tiết kiệm context, chỉ giúp tổ chức gọn |
| Hooks chạy máy móc mọi lần; exit code 2 chặn và đưa lỗi lại cho AI; exit code 1 không chặn | [A] | code.claude.com/docs/en/hooks |
| Stop hook exit 2 buộc AI tiếp tục làm việc thay vì kết thúc | [A] | code.claude.com/docs/en/hooks |
| Subagent có context window riêng, bắt đầu trống; trường description quyết định việc giao task; tạo bằng /agents hoặc file YAML frontmatter trong .claude/agents/ | [A] | code.claude.com/docs/en/sub-agents |
| Skill là thư mục chứa SKILL.md với frontmatter name và description | [A] | code.claude.com/docs/en/skills |
| Routine chạy theo lịch trên hạ tầng Anthropic, máy người dùng tắt vẫn chạy | [A] | code.claude.com/docs/en/routines |
| Context window đầy làm hiệu năng AI suy giảm, là ràng buộc số một | [A] | code.claude.com/docs/en/best-practices |
| Spec Kit gồm constitution.md, spec.md, plan.md, tasks.md và các lệnh /speckit.constitution, specify, plan, tasks, implement, analyze; chạy trong Claude Code | [A] | github.com/github/spec-kit |
| Stage-Gate, ADR, SRE runbook và post-mortem, Three Lines of Defense, PDCA, maker-checker, DO-178C là các mô hình enterprise có thật và được dùng như mô tả ở phần 8 | [B] | Sách và chuẩn công khai của từng mô hình |
| Bộ 9 tài liệu chia 3 tầng | [C] | Từng tài liệu (PRD, ADR, runbook...) là [B]; cách gộp thành đúng bộ 9 và 3 tầng là chưng cất riêng |
| Công thức Công ty = Ý chí × Năng lực × Trí nhớ × Kỷ luật | [C] | Chưng cất riêng, dùng làm khung tư duy, không phải định luật |
| Đúng 4 chốt người duyệt | [B]+[C] | Cơ chế chốt là Stage-Gate [B]; con số 4 là lựa chọn thiết kế của framework [C] |
| 1 task = 1 phiên = 1 commit | [C] | Suy ra từ ràng buộc context window [A]; là quy tắc thực hành, không phải luật của công cụ |
| Điều gì giải thích đến lần thứ ba thì đóng thành skill | [C] | Kinh nghiệm cộng đồng, hợp lý nhưng chưa phải chuẩn |
| Ràng buộc bên ngoài phải tách khỏi ràng buộc tự đặt, thành một tài liệu riêng đứng trên PRD | [C] | Chưng cất từ sự cố ketoanvn 2026-08-09. Chỗ đứng thì có bảo chứng: Điều 3 hiến pháp đã xếp "Ràng buộc cấp dự án" trên "Bản ghi quyết định" |
| Hạng nguồn về thế giới bên ngoài phải có hạn kiểm lại, quá hạn tự hạ xuống [C] | [C] | Cùng nguồn. Tương tự cơ chế hết hạn chứng chỉ và cơ chế rà soát định kỳ trong kiểm toán, nhưng cách áp vào bộ tài liệu là chưng cất riêng |
| 6 tháng cho pháp luật, 3 tháng cho hệ thống bên thứ ba | [C] | Con số khuyến nghị, chưa có dữ liệu thực nghiệm. Phải chỉnh lại sau vài chu kỳ |
