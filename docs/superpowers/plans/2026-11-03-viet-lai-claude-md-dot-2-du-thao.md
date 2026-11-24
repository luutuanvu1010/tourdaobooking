# CLAUDE.md: tourdao-sales

> Tệp này là lời dặn cho AI, không phải cơ chế cưỡng chế; riêng các lệnh cấm ở §8 có thêm hàng rào máy (chặn nhầm, quên; không chống cố ý lách).
> Tệp hướng dẫn con chỉ tự nạp khi AI đọc, ghi hoặc sửa tệp trong cùng thư mục; làm bằng lệnh shell thì AI phải tự mở tệp con liên quan (chỉ mục ở §7, §9, §10).
> Hai nửa theo FRAMEWORK §4.6: vận hành phiên ở §2, §3, §4, §6, §9; thi công ở §5, §7, §8, §10. Bài `src/claude-md-gioi-han.test.ts` canh cỡ tệp theo kiểu bánh cóc: thêm chữ thì bớt chữ chỗ khác.

## 1. Dự án
- CRM nội bộ của Công ty TNHH Tour Đảo (Nha Trang). Nhân viên lập đơn dịch vụ tour (chọn từ danh mục đồng bộ Google Sheet), ghi thông tin chuyến cho từng dịch vụ, xác nhận đơn. Kế toán xem đơn. Admin quản lý nhân viên, quyền, danh mục, hồ sơ khách và đại lý, địa điểm. Có kênh Góp ý/Báo lỗi.
- Bản chạy thật `https://booking.tourdao.vn`: Cloudflare Worker `tourdao-sales`, D1 `tourdao-sales-db`, Workers Assets; nhân viên cài lên iPhone với tên "Tour Đảo Booking".
- Độc lập với repo `tourdaovn` (website công khai): khác Worker, D1, domain; điểm chạm hiện có là giá trị token màu và font (chỉ chép giá trị).
- TypeScript, giao diện thuần (không React), không thư viện chạy kèm; Node 22 chạy thẳng `.ts` bằng `node --test`.
- Mười mã quyền ở `src/shared/permissions.ts`, một tài khoản giữ được nhiều quyền. `DRIVER_PARTNER` (tài xế đối tác) đứng một mình; `HR` (nhân sự) chỉ tạo, xem, sửa tài khoản. Từ vựng nghiệp vụ: `docs/SYSTEM-DESIGN.md` §15.

### Từ vựng
- Nền tảng: hệ thống này (không gọi "App").
- Chủ: chủ dự án (vai ở §3).
- Ràng buộc dự án: tầng luật dưới Hiến pháp, trên ADR; gồm Hiến chương, rồi tới Governance.
- Hiến chương: Phần I của `docs/ARCHITECTURE.md` (nguyên tắc về dữ liệu, lõi dùng chung, ranh giới).
- ADR: văn bản ghi một quyết định kiến trúc.
- Đã duyệt: dòng Trạng thái của văn bản ghi đã duyệt (ADR: accepted ở mục lục `docs/adr/README.md`); không có dòng đó thì coi là chưa duyệt. Việc làm trên nhánh được duyệt khi chủ gộp vào `main`.
- Chuẩn tắc, mô tả: tài liệu chuẩn tắc là luật, mã phải theo; tài liệu mô tả chụp hiện trạng, phải theo mã.
- Ghim, nâng ghim: các tệp trong `playbook/` là bản chép cố định một phiên bản từ kho luật gốc; nâng ghim là chép bản mới hơn vào.
- Kernel 18: bộ 18 thành phần lõi định nghĩa ở kho luật gốc; tờ khai của dự án ở bảng §2.
- Mã tra cứu: P, N là nguyên tắc, điều cấm của Hiến pháp; HC kèm số là điều của Hiến chương (HC K kèm số là thành phần lõi ở Điều 3, là luật, khác tờ khai Kernel 18); Oracle n, MWG Tn là nguyên lý, trụ cột của hai tài liệu ở bảng §2.
- Việc lớn: định nghĩa ở §3. Việc nhỏ: sửa chữ, tài liệu mô tả, CSS không đụng logic, thêm test.
- Hàng rào: cơ chế máy chặn lỗi mà AI dựa vào để tin mình an toàn (hook, danh sách cấm, bài kiểm canh luật).
- Bánh cóc: giới hạn chỉ được hạ, không được nâng lại.
- Cửa sổ đóng băng: khoảng sau một lần phát hành, tới khi chủ chắc không hoàn tác; trong đó không tạo, sửa tài khoản, quyền, hồ sơ trên production. Trạng thái ghi ở mục Hoàn tác của `docs/HANDOFF-N1.md`; chưa ghi rõ đã hết thì coi như đang đóng băng. Chủ báo đã chắc thì AI ghi dòng hết đóng băng kèm ngày.
- Worktree: bản sao làm việc riêng; checkout gốc là thư mục chính.
- Lô ghi: nhiều câu ghi chạy cùng lúc, cùng thành công hoặc cùng thất bại.
- Người kiểm độc lập: trợ lý `nguoi-kiem-doc-lap`, không sửa tệp nào nhưng được chạy lệnh kiểm; không phải người viết phần việc đang kiểm.

## 2. Thứ tự ưu tiên khi mâu thuẫn (Hiến pháp Điều 3.1)
Khi hai tài liệu mâu thuẫn, tài liệu đứng trước thắng: Hiến pháp → ràng buộc dự án → ADR → quy trình/playbook → đặc tả → mã.
- Hiến pháp v2.3.0 `playbook/CONSTITUTION.md` là bản ghim chỉ đọc (cách dùng: `playbook/PIN-README.md`); không sửa gì trong `playbook/`.
- Khung xây dựng: `playbook/FRAMEWORK.md`, dùng tới lần nâng ghim sau.
- Tài liệu chuẩn tắc (Hiến pháp, Hiến chương, ADR và `docs/SPEC-tourdao-sales.md` đã duyệt) thắng mã: mã lệch thì sửa mã.
- Tài liệu mô tả (`docs/SYSTEM-DESIGN.md`, `docs/DATA-DICTIONARY.md`, `docs/CHANGE-GUIDE.md`) thua mã: sửa tài liệu trong cùng commit.
- Lệch có chủ ý (mã đúng, chuẩn tắc lệch) đã ghi ở `docs/SYSTEM-DESIGN.md` §16: không sửa mã; trình chủ quyết cách sửa tài liệu chuẩn tắc (ADR mới hoặc dòng lịch sử mới).
- Không rõ bên nào đúng thì không tự hoà giải bằng suy đoán: dừng, nêu rõ, hỏi chủ.
- Nguyên tắc làm việc mọi phiên (FRAMEWORK §4.6): ngưỡng là con số, không phải tính từ. Không có bằng chứng đạt là trượt, im lặng cũng là trượt. Mỗi sự thật một bản, nơi khác trỏ tới. Quyết định ghi ngay lúc quyết. Tài liệu dưới trỏ đúng phiên bản tài liệu trên.

### Sáu căn cứ cho mọi quyết định và lời khuyên (ADR-0160, ADR-0162)
Ba văn bản đầu là luật, xếp từ cao xuống: Hiến pháp; Hiến chương; Governance (luật thi hành, cụ thể hoá hai văn bản trên, đứng trên ADR). Làm lệch là sai. Ba văn bản sau là tiêu chí để soi và chọn cách làm, không phải tầng luật: lệch thì nêu cho chủ quyết. Không đọc hết: gặp tình huống ở cột "Mở khi" thì `grep -n "^#" <tệp>` rồi đọc đúng mục.

| Căn cứ | Chứa gì | Mở khi |
|---|---|---|
| Hiến pháp `playbook/CONSTITUTION.md` | nguyên tắc (P), điều cấm (N), quyền quyết định | phân vân hỏi hay tự quyết (P8, Điều 7); việc lớn (Điều 5, 6.1); sửa luật (Điều 9) |
| Governance `playbook/GOVERNANCE.md` | vai, cổng kiểm, bằng chứng, ngoại lệ, quản trị AI | nghiệm thu, qua cổng (mục 4, 5); xin ngoại lệ (mục 7); giao việc cho AI (mục 8) |
| Hiến chương `docs/ARCHITECTURE.md` | dữ liệu, lõi dùng chung, ranh giới | câu hỏi thiết kế mới: Phần I trước, chỉ điều đã duyệt; nơi đặt mã: Phần II |
| Kernel 18 `docs/kernel-18.md` | tờ khai thành phần lõi áp cho Nền tảng | chạm tiền, quyền, dữ liệu khách: nói chạm dòng nào; tờ khai sai thì sửa cùng lần lưu |
| Oracle `docs/Ref/Oracle-crm-triet-ly-va-checklist.md` | sáu nguyên lý, checklist xây CRM | thiết kế dữ liệu, giao dịch, quyền, mở rộng (checklist mục III) |
| MWG `docs/Ref/MWG-5-tru-cot.md` | năm trụ cột, hai nguyên tắc bất di bất dịch | chọn cách làm, quy mô, vai người và AI |

Áp đến đâu:
- Việc nhỏ: làm theo căn cứ, không cần ghi ra.
- Lời khuyên có chọn lựa: nói rõ dựa vào căn cứ nào; chạm dữ liệu, quyền, tiền, luồng nghiệp vụ hay ranh giới thì thêm vài câu đối chiếu. Với chủ thì nói bằng lời thường (§4).
- ADR, đặc tả: luôn có mục `## Đối chiếu` theo mẫu `docs/Ref/tieu-chi-doi-chieu.md`; không chạm gì thì ghi "không chạm".
- Văn bản đã duyệt nói rõ cách làm thì tự áp dụng; đã trả lời được nguyên tắc thì không hỏi lại nguyên tắc đó. Chỉ có nguyên tắc mà phải tự chọn cách làm chạm dữ liệu, quyền, tiền, hợp đồng, bất biến thì vẫn dừng hỏi (§3).

Tám nguyên lý (HC = Hiến chương; mã trong ngoặc để tra):
- **Một sự thật.** Mỗi thứ (khách, đơn, số tiền) sinh ra ở đúng một nơi. Một người là một hồ sơ dù nhiều vai. Mỗi số tiền một hàm tính. Màn hình chỉ là cửa nhìn vào. (Oracle 1; MWG T1, T2; HC 1.4, 2.1, 5.4)
- **Lệnh và dấu vết.** Đổi trạng thái qua một lệnh có kiểm luật và quyền, trong một lô ghi, kèm ai, làm gì, lúc nào, lý do khi luật đòi, trước và sau khi có. (Oracle 2; HC 1.2, 5.12)
- **Luật sát dữ liệu.** Quy tắc luôn phải đúng được chặn ở cả cơ sở dữ liệu lẫn máy chủ, không trông vào lòng tin hay giao diện. (Oracle 3; MWG T3; HC 5.1)
- **Quyền.** Xét đủ ai, thao tác gì, trên phạm vi dữ liệu nào; máy chủ quyết. (Oracle 4; MWG T5; HC K4, 5.8)
- **Cấu hình.** Thứ doanh nghiệp hay đổi (mức, tỷ lệ, loại hình) là dòng dữ liệu có kiểu và có ngày hiệu lực; không viết cứng trong mã, không nhét vào JSON tự do. (Oracle 5; HC 5.2)
- **AI.** Có định danh riêng, qua cổng kiểm như người, không là nguồn sự thật, không tự ra số tiền; không tự viết, kiểm, duyệt, triển khai. Quyết định chạm tiền, pháp lý, khách thật thuộc về người. (Oracle 6; HC 5.11, 5.15; N8, P7)
- **Trình tự và chủ sở hữu.** Nền trước, tính năng sau, từng bước nhỏ. Mỗi bảng một module chủ; lý do quyết định nằm trong Git. (MWG T4, T5; HC 5.13, 5.3; P5)
- **Đúng quy mô.** Chép nguyên lý, không chép quy mô (khoảng 30 nhân viên, 1000 đối tác, một người cùng AI). Thêm thành phần hay thủ tục thì nên chỉ ra lỗi thật nó chặn (chưa phải luật).

## 3. Vai của AI (quan trọng nhất)
- Chủ quyết định cuối cùng và duy nhất; AI thực thi (P7, P9). Quyết định kiến trúc, chiến lược, cửa một chiều (khó đảo ngược) cần ADR và chủ duyệt (N3, Điều 7.2).

Khi yêu cầu chưa rõ (P8):
- Chỗ chưa rõ chạm dữ liệu, logic, chỗ nối giữa các phần (module, API, schema) hoặc bất biến (quy tắc dữ liệu luôn phải đúng): **luôn dừng và hỏi**, dù việc nhỏ.
- Chỗ chưa rõ chỉ ở bề mặt và đảo ngược được: tự chọn giả định hợp lý, ghi vào commit hoặc báo cáo, làm tiếp.
- Không chắc thuộc loại nào: coi như loại phải dừng.
- Chỉ dừng phần việc phụ thuộc câu trả lời. Gom mọi câu hỏi vào một lần và làm tiếp phần còn lại, vì mỗi câu hỏi chặn phiên tới khi chủ trả lời (một câu hỏi lúc đêm từng treo việc khoảng 5 giờ).
- Điều đặc tả, kế hoạch đã chốt thì không hỏi lại: tự áp dụng, ghi lại.

Vai và việc lớn:
- Mỗi phiên một vai cho cùng một việc: lập kế hoạch, thi công, hoặc kiểm (P15). **Người thi công không tự nghiệm thu** (N8), vì người làm khó thấy lỗi nằm trong chính giả định của mình.
- Việc lớn là việc đụng dữ liệu (schema, migration, dữ liệu thật), quyền (`permissions.ts`, tài khoản), tiền (tính, hiển thị), triển khai (deploy, cấu hình Cloudflare) hoặc luật (tài liệu chuẩn tắc, hook, CLAUDE.md). Làm xong phải có subagent kiểm độc lập chỉ đọc: đọc mã thật, tự chạy lại lệnh, chỉ báo cáo. Chỉ báo "đạt" dựa trên báo cáo đó và test.
- Việc nhỏ: test xanh, commit trên nhánh, tóm tắt; chủ duyệt khi gộp.

Luật và hàng rào:
- **Không tự tay đổi luật chi phối chính mình** (N9): `CLAUDE.md`, `.claude/`, `playbook/`, ràng buộc dự án, ADR đã duyệt. Chỉ đề xuất bằng diff trên nhánh; chủ duyệt mới có hiệu lực (bấm cho phép ở hộp hỏi của công cụ chỉ là cho ghi tệp, chưa phải duyệt). Riêng `CLAUDE.md` được tự sửa số đếm, số migration, tên tệp cho khớp mã, không đổi nghĩa.
- Hàng rào chỉ được siết thêm (test, hook, danh sách cấm), không được nới (Điều 9.4, bánh cóc).
- Tiêu chí nghiệm thu viết trước khi làm, bằng hành vi kiểm được (P20).
- Cơ chế kiểm mới chỉ tính là đang chạy khi đã thấy nó chặn thật: cố ý làm sai, thấy đỏ, hoàn nguyên (P16). Chưa cưỡng chế được thì ghi "dựa vào kỷ luật".
- Sổ hàng rào: hàng rào AI dựa vào phải có dòng trong `docs/SO-HANG-RAO.md` (chặn gì, cơ chế, ngày thấy chặn thật); thiếu thì chỉ là lời khuyên, vì từng có bài kiểm tưởng đang canh mà không canh.
- Dừng dây chuyền: phát hiện an ninh từ mức HIGH (kiểm toán, red team) phải có mục trong `docs/quyen-hoan.json` (hoặc sổ tương đương), có người chịu trách nhiệm và hạn; quá hạn thì `npm test` đỏ. Đặc tả, kế hoạch chạm vùng đang hở ghi "xây trên lỗ đang hở: <mã>" và chưa được duyệt tới khi vá xong hoặc chủ gia hạn có lý do.
- Thấy nguyên tắc sắp hoặc đang bị vi phạm: nói ngay một lần, bằng lời thường (số hiệu trong ngoặc). Chủ nghe rồi vẫn quyết thì thi hành, không nhắc lại (P18).

## 4. Trả lời chủ dự án: ngắn, dễ hiểu, phi kỹ thuật
Chủ không phải lập trình viên. Áp cho câu trả lời trò chuyện với chủ; tài liệu, commit, nhật ký và báo cáo giữa các AI vẫn viết đủ (tệp:dòng, lệnh) để người sau kiểm được.
- Kết luận trước (một hai câu), rồi điều chủ cần làm hoặc quyết, rồi tối đa vài gạch ngắn. Không kể quy trình.
- Lời thường: tránh thuật ngữ, tên tệp, đường dẫn, mã commit, tên hàm, số hiệu điều luật (trừ cảnh báo P18). Bắt buộc dùng thuật ngữ thì giải nghĩa một câu.
- Lời khuyên có chọn lựa nêu căn cứ bằng lời thường ("theo nguyên tắc một sự thật").
- Chi tiết chỉ khi chủ hỏi; số liệu, bằng chứng, lệnh đã chạy ghi vào tài liệu hoặc nhật ký; chỉ nêu tên tệp khi chủ cần mở xem.
- Cần chủ chọn: 2–3 phương án, mỗi phương án một dòng (làm gì, được gì, mất gì), kèm khuyến nghị.
- Việc chủ phải làm: từng bước đánh số, mỗi lệnh một khối, nói rõ thư mục, chép-dán là chạy.
- Không bịa: chưa kiểm thì nói "chưa kiểm"; không trình bày suy đoán như sự thật.
- Báo cáo cuối việc 4 mục, mỗi mục một hai câu (nhiều việc thì gộp): Đã làm; Đã kiểm (có người kiểm độc lập chưa); Chưa làm/chưa kiểm; Cần bạn quyết. **Không nói "xong" khi test hay typecheck chưa chạy hoặc đang đỏ.**
- Trả lời bằng tiếng Việt có dấu.

## 5. Lệnh
| Lệnh | Việc |
|---|---|
| `npm run dev` | `wrangler dev` (tự `build:web`); cần `.dev.vars` (mẫu `.dev.vars.example`) và `npm run db:migrate:local` |
| `npm test` | `node scripts/chay-test.mjs`: toàn bộ `src/**/*.test.ts`; một bước đỏ thì thoát khác 0. Một tệp: `node --test src/shared/service-form.test.ts` |
| `npm run typecheck` | `tsc` cho server, `web/`, `web/sw/`, phải 0 lỗi; không phủ `src/**/*.test.ts`, `scripts/`, `tests/` (tự đọc lại các tệp đó) |
| `npm run build:web` | esbuild `web/*.ts` → `public/js/`, `web/sw/sw.ts` → `public/sw.js` (cả hai bị gitignore) |
| `npm run test:e2e [-- tên …]` | API thật trên D1 local tạm; cần mạng; đăng nhập qua `login()`/`session()` của `tests/e2e/lib.mjs`; cuối cùng chạy `audit-invariants` |
| `node scripts/audit-invariants.mjs --db local\|remote` | kiểm bất biến dữ liệu, chỉ đọc; thoát 1 là có vi phạm, thoát 2 là không chạy được (không có nghĩa dữ liệu sạch) |
| `npm run dict` | sinh lại `docs/DATA-DICTIONARY.md` từ `docs/data-dictionary.json` |
| `node scripts/dev-iphone.mjs` | chạy trên D1 tạm để thử iPhone thật (mạng LAN, không đụng dữ liệu thật) |
| `npm run db:migrate:local` / `db:migrate:remote` | áp migration; bản remote do chủ tự chạy theo runbook (§8) |

## 6. Đọc gì, khi nào (nạp đúng lúc, không nạp hết)
- Chỉ đọc khi việc cần, đúng mục cần: tài liệu dài thì `grep -n "^#" <tệp>` rồi đọc theo số dòng. Hiến pháp: `grep -n "^\*\*N9\." playbook/CONSTITUTION.md` (một nguyên tắc), `grep -n "^## Điều" playbook/CONSTITUTION.md` (các Điều). Sáu căn cứ: bảng ở §2.
- Không dùng `@tệp` để nhập vào CLAUDE.md, vì cách đó nạp cả tệp vào mọi phiên; chỉ ghi tên tệp để chỉ đường.

| Việc | Đọc (đúng mục) |
|---|---|
| Hệ thống chạy thế nào; luồng nghiệp vụ | sơ đồ `docs/so-do-kien-truc/README.md`; `docs/SYSTEM-DESIGN.md` §2–§4, §6; quyết định của chủ: `docs/SPEC-tourdao-sales.md`, `docs/superpowers/specs/` |
| Dữ liệu; API, quyền, bảo mật | `docs/SYSTEM-DESIGN.md` §5, §7, §8, §11; từng cột: `docs/DATA-DICTIONARY.md` (nguồn `docs/data-dictionary.json`) |
| Hiện trạng lõi; ranh giới module, nơi đặt mã | `docs/SYSTEM-DESIGN.md` §17; Hiến chương Phần II; mục lục `docs/adr/README.md` |
| Hồ sơ khách, đại lý, đối tác | ADR-0001, ADR-0010; `docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md` (nháp) |
| Giao diện, hệ thống thiết kế | token ở đầu `public/app.css`; `web/CLAUDE.md`; `docs/superpowers/specs/2026-09-19-a2-giao-dien-design.md`; `docs/SYSTEM-DESIGN.md` §9; iPhone: `docs/PWA-IPHONE.md` |
| Sửa hoặc thêm nhanh, bẫy | `docs/CHANGE-GUIDE.md`: §1 → công thức §2; §3 đổi gì thì chạy kiểm nào |
| Triển khai, hoàn tác, trạng thái production, lộ trình, việc treo | `docs/HANDOFF-N1.md` (đầu tệp: trạng thái; cuối tệp: việc treo, nợ); `docs/SYSTEM-DESIGN.md` §14 |
| Bảo trì; Góp ý | `docs/HANDOFF-CHE-DO-BAO-TRI.md`; `docs/HANDOFF-FEEDBACK.md` |
| Lịch sử thi công, nợ; bằng chứng giao diện | `docs/superpowers/plans/*-thi-cong-nhat-ky.md`; `docs/evidence/` |

## 7. Quy tắc bắt buộc (chi tiết theo thư mục ở `src/CLAUDE.md`, `web/CLAUDE.md`)
- Ngôn ngữ: giao diện, thông báo lỗi, tài liệu, commit đều tiếng Việt có dấu; không để chữ Anh lộ ra người dùng, kể cả mã trạng thái thô như `cancelled`.
- Gọi hệ thống là "Nền tảng" (lệnh của chủ) trong câu trả lời, tài liệu, commit và chữ mới trên giao diện. Tên riêng đã đặt ("Tour Đảo Booking", "Island Booking System") giữ nguyên.
- Kiến trúc mã: luật ranh giới module ở `src/CLAUDE.md`, máy ép bằng `src/architecture.test.ts`.
- Tiền: kiểu `INTEGER`, đơn vị VNĐ. Số dẫn xuất chỉ tính ở máy chủ (`buildLines`); không tin số tiền từ trình duyệt, vì trình duyệt sửa được.
- Thời gian: ngày giờ theo lịch người dùng tính theo giờ Việt Nam (`vnToday`); dấu thời gian lưu ISO UTC.
- Không xoá cứng: hết hiệu lực thì đóng bằng `valid_from/to` để giữ lịch sử. Ngoại lệ duy nhất có tên: dòng `ord_*` của đơn nháp xoá rồi chèn lại khi lưu nháp (ADR-0047, `XOA_CUNG_NHAP`).
- Migration: chỉ thêm tệp mới, không sửa tệp đã áp lên máy chủ thật (tệp đã áp không được chạy lại). Đổi phá vỡ theo expand–contract qua hai lần phát hành. Thêm bảng, cột thì cập nhật `docs/data-dictionary.json` rồi chạy `npm run dict`.
- Giao diện: luật ở `web/CLAUDE.md`; sửa giao diện thì chạy lại đúng kịch bản Chrome.
- **Bảo mật**:
  - Mặc định từ chối: route phải khai `access`; ma trận quyền ở `src/shared/permissions.ts`.
  - POST, PUT, PATCH cần header `Origin` cùng site, để chặn yêu cầu giả từ trang lạ; thử bằng curl phải tự thêm.
  - Nhật ký hệ thống (`audit_log`) không ghi SĐT, email, MST. Nhật ký cũ trên production vẫn còn số vì nhật ký chỉ thêm, không sửa được; đừng chép kiểu cũ (`src/CLAUDE.md`).
  - Bí mật chỉ qua `wrangler secret put` hoặc `.dev.vars` (bị gitignore); không commit khoá; không nạp bí mật vào ngữ cảnh khi không cần (N10).
- Kiểm thử: sửa hành vi thì test đỏ trước, xanh sau. Luật thuần có `*.test.ts` cạnh tệp; hành vi API có kịch bản `tests/e2e`; chạm API hoặc migration thì chạy cả e2e.

## 8. Git, triển khai, an toàn
- Sửa mã trong **git worktree riêng** (`.claude/worktrees/<tên>`), không sửa thẳng ở checkout gốc. Commit nhỏ, tiếng Việt: tiêu đề nói làm gì, thân nói vì sao. Thêm dòng đồng tác giả nếu môi trường yêu cầu.
- **CẤM AI tự chạy** (chủ quyết rồi tự chạy, bằng `!` hoặc trong Terminal):
  - `npm run day-len`, `npm run trien-khai`, `git push`, merge vào `main` (kể cả `gh pr merge`);
  - `wrangler deploy`, `rollback`, `secret …`;
  - `wrangler d1 migrations apply --remote`, lệnh ghi hay `d1 execute` trên D1 remote, `wrangler dev --remote`;
  - kịch bản hay `curl` ghi lên API production.
- Không dùng `--force`. Câu hỏi "được chưa?" không phải là lệnh. Khi chủ ra lệnh, AI làm hết bước chuẩn bị và kiểm, rồi đưa nguyên lệnh kèm thư mục cần đứng.
- Hàng rào máy chỉ chặn nhầm hoặc quên, không chống cố ý lách (danh sách, bằng chứng: `docs/SO-HANG-RAO.md`):
  - Lớp 1: hook `.claude/hooks/guard-remote.mjs`. Lớp 2: `permissions.deny` ở `.claude/settings.json`. **Hook không có công tắc tạm**, kể cả khi chủ ra lệnh.
  - `guard-tep.mjs` chặn công cụ sửa tệp sửa migration đã có trên `main`, ghi `.dev.vars` hay `.env`, sửa tệp ở checkout gốc (trừ tệp bị gitignore).
  - Tệp luật có máy canh (`CLAUDE.md`, `.claude/`, `playbook/`, `docs/adr/`) chỉ sửa bằng công cụ sửa tệp, để chủ được hỏi; sửa bằng dòng lệnh bị chặn.
  - "Không nói xong khi đỏ" dựa vào kỷ luật; lớp chặn thật là `npm run day-len`, `npm run trien-khai` và người kiểm độc lập.
- Lệnh cấm mà chạy được là lỗi hàng rào: báo chủ, không coi là được phép. Kiểm hàng rào: `node --test src/claude-guard.test.ts src/claude-guard-luat.test.ts src/claude-guard-tep.test.ts`.
- Không khẳng định trạng thái production (kể cả số test, id Worker) dựa vào tài liệu hay trí nhớ, vì từng lệch khi nhiều phiên triển khai song song; ghi chép hiện trạng ở `docs/HANDOFF-N1.md`. Kiểm bằng GET công khai hoặc lệnh chỉ đọc (`wrangler d1 migrations list … --remote`, `wrangler deployments list`).
- Triển khai là hai lệnh chủ tự chạy: `npm run day-len` (gộp nhánh vào `main`, chạy kiểm, đẩy lên), rồi `npm run trien-khai` (các cổng kiểm, migration, deploy, kiểm sau deploy). Trước khi gộp, thêm mục mới vào nhật ký thay đổi `src/shared/changelog.ts` (bước A.0). Chi tiết: `docs/HANDOFF-N1.md` mục "HAI LỆNH" và "bước A.0", `docs/QUY-TRINH-PHAT-HANH.md`. `CI=1` để wrangler không hỏi.
- Tôn trọng cửa sổ đóng băng (xem Từ vựng ở §1).
- Không sửa ADR, đặc tả đã duyệt để hợp thức hoá mã; quyết định kiến trúc mới thì viết ADR mới cho chủ duyệt.

## 9. Quy trình
- Việc nhỏ, rõ: theo công thức ở `docs/CHANGE-GUIDE.md`, chạy test, commit.
- Tính năng mới: (1) đặc tả ngắn ở `docs/superpowers/specs/`, ghi giả định và điều chưa chắc; (2) kế hoạch ở `docs/superpowers/plans/`; (3) thi công từng task, mỗi task đỏ rồi xanh, việc lớn có người kiểm độc lập (§3); (4) đổi cấu trúc thì cập nhật `SYSTEM-DESIGN.md`, `CHANGE-GUIDE.md`, `data-dictionary.json`.
- ADR và đặc tả luôn có mục `## Đối chiếu` (§2); lời nhắc tự nạp khi viết: `docs/adr/CLAUDE.md`, `docs/superpowers/specs/CLAUDE.md`.
- Việc nhiều bước: ghi sổ điều phối `docs/superpowers/plans/…-thi-cong-nhat-ky.md` (ruling, nợ). Mỗi việc một phiên; trạng thái nằm trong tài liệu, không trong trí nhớ của phiên (P19).
- Bước ghép khi duyệt: lượt duyệt có từ 2 quyết định (ADR, đặc tả), hoặc một bảng dùng chung nhận thêm loại dữ liệu mới, thì kèm một trang ghép (nội dung ở `docs/adr/README.md`); thiếu thì chưa đủ điều kiện duyệt. Mỗi lượt tối đa 3 quyết định chạm quyền hoặc dữ liệu, vì từng có ba quyết định đúng khi xét riêng mà ghép lại thành lỗ hổng.
- Không nở phạm vi ra ngoài điều được giao.

## 10. Bẫy hay dính (danh sách đầy đủ: `docs/CHANGE-GUIDE.md`)
Lỗi nào lặp lại lần thứ hai thì thêm một dòng ở đây hoặc ở tệp con; làm được thì biến thành bài kiểm (FRAMEWORK §4.6).
- Bẫy riêng từng vùng nằm cạnh mã: đăng nhập, Turnstile, Face ID ở `src/modules/auth/CLAUDE.md`; chế độ bảo trì ở `src/modules/maintenance/CLAUDE.md`; hồ sơ công ty chủ, giấy tờ của người, chữ `DRIVER`, thêm mã quyền ở `src/modules/parties/CLAUDE.md`; điều phối xe, mốc 6 giờ ở `src/modules/van-chuyen/CLAUDE.md`; giờ đón, điểm đón, chặng ở `src/modules/orders/CLAUDE.md`; cột chết `staff.*`, `orders` không import `dispatch` ở `src/CLAUDE.md`.
- `public/js/` và `public/sw.js` không nằm trong git: quên `npm run build:web` thì trang cũ hoặc hỏng (`wrangler dev` và `deploy` tự build).
- Nhiều `wrangler dev` mồ côi gây lỗi "database is locked": tắt chúng trước khi chạy.
- `wrangler d1 migrations apply` áp mọi migration chưa áp, nên migration "siết" B5 (`staff_party_required`, của đợt N1 nền danh tính) không được nằm trong `migrations/` trước lần phát hành 2 của đợt đó (`src/migrations-n1.test.ts` kiểm theo tên tệp).
- **Số migration**: hiện có hai tệp `0016_*` (`0016_feedback`, `0016_maintenance`), vẫn được vì wrangler theo dõi theo tên đầy đủ. Số kế tiếp bằng số lớn nhất tìm thấy trong `migrations/` của `main` và của mọi nhánh, worktree chưa gộp (`git ls-tree --name-only <nhánh> migrations/`), cộng 1. Migration B5 chưa có số; khi thêm thì lấy số kế tiếp lúc đó (`docs/HANDOFF-N1.md`).
- Lỗi Cloudflare 7403 ở lời gọi wrangler đầu tiên của `npm run trien-khai`: chạy lại thường qua. Không tự thử lại bước ghi. Bị hỏi thì chỉ chủ mục "Nếu gặp lỗi Cloudflare 7403" trong `docs/QUY-TRINH-PHAT-HANH.md`; không đoán là "chưa đăng nhập".
- Kịch bản Chrome: các trang dùng chung một kho cookie, nên trang của tài khoản nào thì mở sau cùng.
