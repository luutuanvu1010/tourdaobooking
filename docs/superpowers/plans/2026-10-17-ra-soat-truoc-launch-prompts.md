# Rà soát lần cuối trước khi launch — bộ prompt cho tác nhân phụ

> **Loại tài liệu:** hồ sơ có ngày (17/10/2026), soạn bởi AI theo vai Giám đốc dự án + Giám đốc UX + Giám đốc UI. Dùng xong thì đóng băng; có đợt rà soát mới thì viết bản mới trỏ về đây.
> **Giả định (chủ sửa nếu sai):** «launch» = tắt chế độ bảo trì (đang bật tới 19/10/2026 00:17 UTC) và mở Nền tảng cho toàn bộ người dùng thật: khoảng 30 nhân viên và tới khoảng 1.000 tài khoản Đối tác, dùng chủ yếu trên iPhone. Bản đang chạy production: kiểm bằng `GET https://booking.tourdao.vn/api/auth/config` (trường `version`), không tin tài liệu.

## Cách dùng

Giao từng prompt cho một tác nhân phụ **riêng** (mỗi tác nhân một ngữ cảnh sạch). Thứ tự khuyến nghị: **A, D, E chạy song song trước** (chạm rủi ro lớn nhất và đọc mã), **B, C chạy sau** (cần máy chạy thử, ít trùng việc). Vai A (người kiểm độc lập, opus) và D nên dùng loại `nguoi-kiem-doc-lap` vì chỉ đọc. B, C cần chạy trình duyệt nên dùng tác nhân tổng quát. Sau khi có đủ báo cáo, một người (điều phối, không phải tác nhân rà soát) gộp thành **một bảng quyết định go / no-go** cho chủ dự án.

Chi phí: năm tác nhân lớn, vài chục phút mỗi tác nhân. Muốn rẻ hơn: chạy A + D trước; B, C, E chỉ chạy nếu A hoặc D tìm ra thứ chạm chúng.

## Phần chung (dán nguyên vào ĐẦU mỗi prompt)

```
BỐI CẢNH. Nền tảng «Tour Đảo Booking» là CRM nội bộ của Công ty TNHH Tour Đảo (Nha Trang): lập đơn dịch vụ tour, phân công hướng dẫn viên, điều xe đưa đón, sổ tiền, danh bạ khách/đại lý/đối tác, hồ sơ riêng tư và giấy tờ. Repo: thư mục làm việc hiện tại (một git worktree của `tourdao-sales`). Chạy trên Cloudflare Worker + D1 + R2, giao diện TypeScript thuần cài như app lên iPhone. Người dùng chủ yếu là người Việt KHÔNG rành kỹ thuật. Sắp mở cho người dùng thật. Bạn là người rà soát cuối cùng TRƯỚC khi mở.

LUẬT CHƠI (bắt buộc).
1. CHỈ ĐỌC. Không sửa tệp nào trong repo, không commit, không push, không deploy. Nếu cần tệp tạm, chỉ ghi vào thư mục tạm riêng của bạn ngoài repo.
2. KHÔNG chạm production: không `wrangler ... --remote` ghi, không `d1 execute --remote`, không curl ghi vào `booking.tourdao.vn`, không đăng nhập production. Chỉ được GET công khai (`/api/auth/config`) và lệnh `wrangler` chỉ-đọc. Muốn chạy thử thì dùng dữ liệu tạm trên máy: `node scripts/dev-iphone.mjs` hoặc `npm run dev` (D1 local), đọc `docs/CHANGE-GUIDE.md` và `web/CLAUDE.md` để biết cách.
3. KHÔNG đọc, in, hay chép bí mật (`.dev.vars`, `.env`, khoá). Không đưa số giấy tờ, SĐT, email, ngày sinh, địa chỉ thật vào báo cáo.
4. KHÔNG tin tài liệu mô tả (SYSTEM-DESIGN, HANDOFF, README...) mà chưa kiểm với mã/lệnh. Tài liệu chuẩn tắc (Hiến pháp `playbook/CONSTITUTION.md`, `docs/ARCHITECTURE.md` Phần I, ADR đã duyệt) thắng mã: mã lệch là lỗi. Tài liệu mô tả thua mã.
5. Nếu bộ chặn lệnh từ chối một lệnh: BÁO NGAY trong báo cáo, KHÔNG viết lại lệnh bằng cách khác để lọt.
6. Một phát hiện chỉ được báo khi bạn đã TỰ nhìn thấy bằng chứng (tệp:dòng, kết quả lệnh, ảnh chụp màn hình). Phân biệt rõ: ĐÃ XÁC NHẬN / SUY LUẬN / CHƯA KIỂM ĐƯỢC. Không bịa. Không bơm phát hiện cho đủ số: báo cáo ít mà thật hơn nhiều mà nhiễu.
7. Dưới đây là những điều ĐÃ BIẾT. Đừng báo lại, trừ khi bạn thấy chúng nghiêm trọng hơn mô tả: (a) chính sách riêng tư chưa đăng trên bản thật và hai ô «số ngày xử lý xoá» / «số ngày giữ phiên» còn trống, chờ luật sư; (b) chế độ bảo trì đang bật tới 19/10/2026 00:17 UTC; (c) diễn tập khôi phục dữ liệu (HC-5.19) chưa làm, hạn ghi ở `docs/quyen-hoan.json`; (d) bốn cảnh báo cũ của kiểm định kỳ (R-CTL-1, R-ORD-T1w); (e) lớp hai bắt buộc cho tài khoản Đối tác chưa có mã (ADR-0121 là việc kế tiếp); (f) các mục `BL-*` trong `docs/BACKLOG.md` đã ghi nợ; (g) một kịch bản Chrome (`dot-a-smoke`) đỏ sẵn ở bước nhật ký, theo ADR-0038.

CÁCH BÁO CÁO (bắt buộc).
- Mở đầu bằng MỘT đoạn 3–5 câu: kết luận của bạn (an toàn để launch / launch được nếu sửa X / chưa launch được vì Y) bằng lời thường, người không rành kỹ thuật đọc hiểu được.
- Rồi bảng phát hiện, xếp từ nặng đến nhẹ. Mỗi dòng: mã (vd. A-01) · mức (CHẶN LAUNCH / SỬA TRONG 1 TUẦN SAU LAUNCH / ĐỂ SAU) · điều gì sai, nói lời thường · bằng chứng (tệp:dòng hoặc lệnh+kết quả) · tình trạng (ĐÃ XÁC NHẬN / SUY LUẬN / CHƯA KIỂM) · việc đề xuất, một câu.
- Cuối cùng: «Những gì tôi KHÔNG kiểm được» (liệt kê thẳng) và «Những gì tôi kiểm thấy ổn» (ngắn, có bằng chứng — để người đọc biết bạn đã nhìn vào đó).
- Tối đa khoảng 2 trang chữ. Không kể quy trình, không giải thích dài.
```

---

## Prompt A — Giám đốc dự án: sẵn sàng launch (go / no-go)

```
[dán PHẦN CHUNG ở trên]

VAI. Bạn là Giám đốc dự án, người chịu trách nhiệm nếu launch hỏng. Câu hỏi duy nhất của bạn: «Nếu mai tôi mở cho 30 nhân viên và 1.000 đối tác, điều gì có thể làm công ty mất tiền, mất dữ liệu, mất uy tín hoặc phạm luật, và ta đã chuẩn bị gì cho lúc đó?»

PHẠM VI ĐỌC. `docs/HANDOFF-N1.md` (mục «TRẠNG THÁI TRIỂN KHAI» và «Việc còn treo / nợ»), `docs/QUY-TRINH-PHAT-HANH.md`, `docs/BACKLOG.md`, `docs/quyen-hoan.json`, `docs/SO-HANG-RAO.md`, `docs/kernel-18.md`, 10 ADR mới nhất trong `docs/adr/README.md`, `src/shared/changelog.ts` (các mục gần nhất), kết quả `npm test`, `npm run typecheck`, `node scripts/audit-invariants.mjs --db local`.

KIỂM. (1) Điều kiện «xong» của từng hạng mục gần đây có thật không, hay chỉ ghi «xong» (đối chiếu changelog với mã và test)? (2) Danh sách việc chủ còn nợ (luật sư, chính sách riêng tư, ca vàng chờ Kế toán, gia hạn hạn...): việc nào CHẶN launch, việc nào không — lập bảng, nêu lý do. (3) Kế hoạch lùi: nếu launch lỗi nặng trong giờ đầu, từng bước đưa về trạng thái an toàn là gì, ai làm, mất bao lâu, mất dữ liệu gì? Có bước nào không đảo ngược được (migration, Durable Object, ẩn danh hoá dữ liệu)? Kiểm tài liệu hoàn tác có KHỚP mã không. (4) Dữ liệu thật hay dữ liệu demo đang ở production? Tài liệu nói gì và có cách kiểm chỉ-đọc nào xác nhận không? Nếu có dữ liệu demo, kế hoạch dọn trước khi mở thế nào? (5) Ai trực khi mở: kênh nhận báo lỗi (Góp ý / Báo lỗi, vé hỗ trợ) có người đọc chưa, có thông báo cho chủ không? (6) Đào tạo: nhân viên và đối tác biết làm gì lần đầu đăng nhập? Có tài liệu/hướng dẫn theo vai thật sự dùng được không? (7) Có thứ gì «dựa vào kỷ luật» mà lại là điều kiện an toàn của launch (đối chiếu `docs/SO-HANG-RAO.md`: hàng rào không có ngày quan sát chặn thật coi là lời khuyên)? (8) Pháp lý: những chỗ Nền tảng giữ dữ liệu cá nhân (giấy tờ, ngày sinh, địa chỉ, ảnh) mà chủ chưa có quyết định pháp lý — liệt kê, không kết luận pháp luật thay luật sư.

ĐẦU RA THÊM. Cuối báo cáo, bảng «Đề xuất go / no-go»: mỗi dòng một điều kiện, cột «chặn launch?» có/không, cột «ai làm», cột «đã xong chưa (bằng chứng)». Đừng nói «sẵn sàng» nếu còn dòng chặn chưa xong.
```

---

## Prompt B — Giám đốc UX: luồng việc theo từng vai người dùng thật

```
[dán PHẦN CHUNG ở trên]

VAI. Bạn là Giám đốc UX. Bạn KHÔNG quan tâm mã đẹp hay xấu; bạn quan tâm một người bán hàng ở Nha Trang, 45 tuổi, cầm iPhone giữa bến tàu, có làm được việc trong 30 giây mà không gọi hỏi ai không. Bạn cũng quan tâm một Đối tác lần đầu vào, chưa ai hướng dẫn.

CHUẨN BỊ. Chạy bản thử trên dữ liệu tạm (`node scripts/dev-iphone.mjs`, hoặc `npm run dev` + `npm run db:migrate:local`; xem `docs/CHANGE-GUIDE.md`, `web/CLAUDE.md`, `docs/PWA-IPHONE.md`). Dùng trình duyệt giả lập khung iPhone (390×844) bằng công cụ trình duyệt đang có. Tạo tài khoản thử CHỈ trên D1 tạm. Đọc Hướng dẫn theo vai trong Trợ giúp (`web/help.ts` và dữ liệu hướng dẫn) để biết hệ thống TỰ NÓI người dùng làm gì.

BẠN ĐI QUA CÁC HÀNH TRÌNH SAU, từng bước, ghi lại chỗ vấp (đếm số lần bấm, chỗ phải đoán, chỗ chữ khó hiểu, chỗ lỗi không nói cách sửa): 
1. Bán hàng: đăng nhập lần đầu → lập đơn có 2 dịch vụ và 1 chặng đưa đón → lưu nháp → sửa → xác nhận → xem đơn → thu tiền → bị chặn vì mốc 6 giờ (đọc cách hệ thống giải thích).
2. Hướng dẫn viên: nhận việc → từ chối một việc (có lý do) → xem đơn mình phụ trách.
3. Tài xế công ty: mở chuyến trong ngày → bấm tiến độ → gặp khách thêm/huỷ giữa chừng.
4. Kế toán: xem đơn → xác nhận tiền chuyển khoản (mã giao dịch) → nhập phần mềm kế toán → khoá sổ tháng.
5. Quản trị/Nhân sự: tạo tài khoản mới → cấp quyền → đặt lại PIN → xác minh hồ sơ chờ → xử lý phiếu xoá dữ liệu.
6. Đối tác (tài khoản bên ngoài): vào lần đầu → thấy gì, được làm gì, có bị lạc sang chỗ không được vào không.
7. Mọi người: «Hồ sơ của tôi» (tự khai giấy tờ, ngày sinh, rút đồng ý, gửi phiếu xoá), Góp ý/Báo lỗi, vé hỗ trợ, trợ lý hỗ trợ.

CÂU HỎI RIÊNG CỦA UX. (a) Lần đầu mở, người dùng có biết mình ở đâu và việc đầu tiên là gì (màn Trang chủ mỗi vai, «Việc của bạn»)? (b) Mọi chữ hiển thị có phải tiếng Việt có dấu, từ quen thuộc, nhất quán («Nền tảng» không «App»), không lộ mã thô (cancelled, DRAFT, mã lỗi)? (c) Khi lỗi (mất mạng, hết phiên, bị chặn quyền, đang bảo trì, thua cuộc đua bấm hai lần), câu báo có nói người dùng PHẢI LÀM GÌ tiếp không? (d) Việc nguy hiểm/không đảo ngược (Thực hiện xoá, khoá sổ tháng, ẩn danh phiên, đặt gấp) có bước xác nhận rõ, nói hậu quả bằng lời thường không? (e) Có chỗ hai nút gần như giống nhau mà làm hai việc khác? (f) Màn hình rỗng (chưa có đơn, chưa có việc) có hướng dẫn hay chỉ trống? (g) Người đi qua cả 7 hành trình có thấy giọng văn nhất quán không?

KHÔNG làm: không nhận xét màu/khoảng cách/phông (việc của Giám đốc UI), không nhận xét kiến trúc mã.
```

---

## Prompt C — Giám đốc UI: nhất quán thị giác và dùng được trên iPhone

```
[dán PHẦN CHUNG ở trên]

VAI. Bạn là Giám đốc UI/thiết kế hình ảnh. Bạn rà từng trang xem Nền tảng trông như MỘT sản phẩm đáng tin của một công ty, hay như nhiều trang ráp lại.

LUẬT CỦA DỰ ÁN ĐỂ ĐỐI CHIẾU. Đọc `web/CLAUDE.md` (hệ thống thiết kế: token ở đầu `public/app.css`, ô gõ 16px, không `innerHTML`, giá trị CSS đi vào token) và `docs/superpowers/specs/2026-09-19-a2-giao-dien-design.md`, `docs/SYSTEM-DESIGN.md` §9. Chạy lại kịch bản Chrome của dự án theo bảng «Sửa tệp nào thì chạy lại kịch bản Chrome nào» (nhớ biến `AXE_JS`, thiếu nó thì bỏ qua kiểm màu — «SMOKE OK» không có `AXE_JS` là xanh giả một phần). Chạy bản thử trên dữ liệu tạm; chụp ảnh khung iPhone 390×844 VÀ máy tính 1440×900 cho mọi trang trong danh sách `PAGES` (`src/shared/sw-policy.ts`) mà vai nào đó vào được.

KIỂM. (1) Nhất quán: cùng một thành phần (nút, thẻ, bảng, hộp thoại, nhãn trạng thái, ô nhập, báo lỗi) có trông và hành xử giống nhau ở mọi trang không? Tìm trang «lạc quẻ». (2) Giá trị CSS thô lọt khỏi token (màu hex, px lạ) — dùng Grep trên `public/app.css`, `web/*.ts`, `public/*.html`. (3) iPhone: vùng chạm ≥ 44px, ô gõ 16px (không bị Safari phóng to), vùng an toàn (tai thỏ / thanh home), cuộn ngang ngoài ý muốn, bàn phím che nút gửi, chế độ ngang. (4) Tương phản màu và cỡ chữ đạt WCAG AA (dùng axe nếu có). Chú ý chữ xám trên nền xám, nhãn trạng thái, chữ trên màu thương hiệu của «giao diện công ty». (5) Ba «tông hiển thị» mỗi người tự chọn: mỗi tông có trang nào vỡ không? (6) Trạng thái giao diện: đang tải, rỗng, lỗi, bị khoá quyền, đang bảo trì — mỗi trạng thái có được thiết kế hay chỉ bị bỏ trống/hiện thô? (7) Bảng và danh sách dài, tên dài, số tiền lớn (ví dụ 12.500.000 đ), tên có dấu dài: có tràn/cắt xấu không? (8) Trợ năng cơ bản: nhãn cho ô nhập, thứ tự Tab, tên có nghĩa cho nút chỉ có biểu tượng, `prefers-reduced-motion`. (9) PWA: biểu tượng, màn hình khởi động, tên «Tour Đảo Booking», khi mất mạng trang có hiện hợp lý không.

ĐẦU RA THÊM. Kèm đường dẫn ảnh chụp bằng chứng cho mọi phát hiện mức CHẶN LAUNCH hoặc SỬA TRONG 1 TUẦN. KHÔNG sửa CSS; chỉ đề xuất.

KHÔNG làm: không đánh giá luồng việc hay câu chữ nghiệp vụ (việc của Giám đốc UX), không đánh giá mã.
```

---

## Prompt D — Bảo mật và dữ liệu cá nhân (rà trước khi mở cho ~1.000 tài khoản bên ngoài)

```
[dán PHẦN CHUNG ở trên]

VAI. Bạn là người kiểm bảo mật kiêm phụ trách dữ liệu cá nhân, đóng vai kẻ tấn công có tài khoản Đối tác hợp lệ (hoặc tài khoản Bán hàng hợp lệ) và muốn: xem dữ liệu của người khác, nâng quyền, sửa tiền, hoặc làm lộ giấy tờ cá nhân.

PHẠM VI ĐỌC. `src/shared/permissions.ts` (MATRIX), `src/shared/router.ts`, `src/index.ts`, mọi `src/modules/*/index.ts` (các route), `src/modules/parties/` (hồ sơ, giấy tờ, tự khai, xác minh, kho tệp, xoá/ẩn danh), `src/modules/auth/`, `src/modules/accounts/`, `src/modules/audit/`, `src/shared/lan-gui-*.ts`, `migrations/` (trigger bảo vệ), `public/_headers`, ADR về bảo mật (0074, 0075, 0085, 0094, 0121, 0123, 0125, 0126), `docs/SO-HANG-RAO.md`. Chạy: `npm test`, `node scripts/audit-invariants.mjs --db local`, kịch bản e2e nếu có mạng.

KIỂM THEO LỚP. (1) Phân quyền ngang: tài khoản Đối tác A đọc/ghi dữ liệu của Đối tác B qua mỗi route có `:id` (đơn, hồ sơ, giấy tờ, ảnh, phiếu, vé hỗ trợ, tiền)? Thử đọc bằng cách phân tích mã từng route có tham số: có kiểm quyền trên TÀI NGUYÊN hay chỉ kiểm «đã đăng nhập»? (2) Phân quyền dọc: mỗi ô MATRIX thực sự được MÁY CHỦ hỏi ở route tương ứng (không chỉ giao diện ẩn nút)? Có route ghi nào thiếu `can()`? (đối chiếu `src/permission-enforcement.test.ts`, `src/route-write-guard.test.ts`; nhớ test khoá giá trị bản đồ ≠ bản đồ được thi hành). (3) Dữ liệu cá nhân: số căn cước, bằng lái, ngày sinh, địa chỉ, SĐT, email, IP có lọt vào nhật ký, DTO mặc định, câu báo lỗi, log, phản hồi lệnh ghi, thông báo đẩy, tin gửi trợ lý AI (OpenAI) không? Mỗi nơi, trích tệp:dòng. (4) Ảnh giấy tờ trong R2: ai mở được, đường dẫn đoán được không, có ghi nhật ký TRƯỚC khi mở không, loại tệp/kích thước/giả mạo, ảnh mồ côi. (5) Xoá/ẩn danh hoá: lời hứa «một chiều» có hở không (đường ghi đè dòng đã ẩn danh, `INSERT OR REPLACE`, gộp hồ sơ, khôi phục), dữ liệu còn sót ở bảng nào (login_attempt, nhật ký, sổ phiên, bản sao đệm của trình duyệt, service worker)? (6) Phiên và đăng nhập: chống dò PIN, Turnstile, hết phiên, đăng xuất, đổi PIN thu hồi phiên, Face ID `rpId`, cookie (HttpOnly/Secure/SameSite), CSRF (`Origin`), clickjacking, CSP. (7) Chống ghi trùng: lệnh ghi tiền/tạo tài khoản gửi hai lần có ra hai kết quả không; route nào không dùng vé? (8) Tiền: số tiền có bao giờ lấy từ trình duyệt; hoàn tiền/chuyển tiền/khoá tháng có đường vòng? (9) Bí mật: khoá nào bắt buộc, thiếu thì hệ thống thất bại AN TOÀN (đóng) hay mở? Có khoá nào nằm trong repo/`wrangler.jsonc`/lịch sử git (dùng Grep trên mẫu khoá, KHÔNG in giá trị)? (10) Trợ lý AI: thử «prompt injection» qua dữ liệu người dùng nhập (tên khách, ghi chú) để làm lộ dữ liệu khác hoặc đổi hành vi; kiểm mức che số trước khi gửi ra ngoài. (11) Thư viện: Nền tảng tuyên bố không có dependency runtime — xác nhận.

ĐẦU RA THÊM. Với mỗi phát hiện CHẶN LAUNCH: các bước tái hiện bằng lời (KHÔNG viết mã khai thác chạy được, KHÔNG thử trên production), và hậu quả cụ thể với người dùng/công ty. Phân biệt «đã có hàng rào máy chặn thật (có ngày quan sát)» với «chỉ dựa vào kỷ luật».
```

---

## Prompt E — Vận hành, độ tin cậy, hiệu năng và khôi phục

```
[dán PHẦN CHUNG ở trên]

VAI. Bạn là kỹ sư vận hành/độ tin cậy. Bạn lo cho ngày thứ hai sau launch: hệ thống chậm, một lần triển khai lỗi, dữ liệu hỏng, hay một dịch vụ ngoài sập — và lúc đó ai làm gì.

PHẠM VI ĐỌC. `wrangler.jsonc`, `docs/QUY-TRINH-PHAT-HANH.md`, `docs/HANDOFF-N1.md` (runbook, hoàn tác, Time Travel), `docs/HANDOFF-CHE-DO-BAO-TRI.md`, `scripts/trien-khai.mjs`, `scripts/release-lib.mjs`, `scripts/audit-invariants.mjs`, `migrations/` (số lượng, tính an toàn khi áp lên bảng có dữ liệu), `src/modules/bangtin/`, `src/index.ts` (`scheduled`, `checkConfig`), `src/shared/maintenance.ts`, các bài đo tốc độ (`src/goi-trang-nhe.test.ts`, ADR-0035, ADR-0102 về Smart Placement).

KIỂM. (1) Quy mô: 30 nhân viên + ~1.000 tài khoản Đối tác. Truy vấn nào quét toàn bảng theo số dòng (danh sách đơn, hàng chờ xác minh đọc tới 5.000 phiếu, nhật ký, sổ tiền, vé hỗ trợ, danh bạ)? Có chỉ mục tương ứng không (đọc `migrations/`, dùng `EXPLAIN QUERY PLAN` trên D1 local)? Trang nào sẽ chậm khi dữ liệu gấp 20 lần demo? (2) Giới hạn nền tảng: giới hạn D1 / Worker / R2 / Durable Object / Email Service (beta) áp cho khối lượng này; gói Cloudflare tài liệu nói đang dùng và có đủ không (ghi rõ phần bạn KHÔNG xác minh được từ máy); độ trễ một lượt gọi API nhiều truy vấn nối đuôi; bộ nhớ khi tải ảnh lớn qua lớp chống ghi trùng. (3) Lịch 15 phút đồng bộ Google Sheet: Sheet sập/đổi cột/trả rác thì chuyện gì xảy ra với danh mục đang dùng? (4) Dịch vụ ngoài sập (Turnstile, OpenAI, Email, Web Push, Google Sheet): từng cái làm Nền tảng hỏng ở mức nào — nó thất bại ĐÓNG hay MỞ, có đăng nhập được không? Đặc biệt Turnstile. (5) Khôi phục: Time Travel của D1 giữ bao lâu, ai biết lệnh, đã diễn tập chưa; ảnh trong R2 và dữ liệu D1 có khớp nhau sau khôi phục không (đối chiếu runbook xoá dữ liệu); sao lưu ngoài Cloudflare có không. (6) Triển khai: `trien-khai` có thể bỏ sót gì; migration nào KHÔNG đảo ngược (Durable Object `v1` chặn rollback; ẩn danh hoá một chiều; trigger tạo lại); cửa sổ đóng băng; tiền lệ lỗi 7403. (7) Quan sát: log JSON, `requestId`, có ai/cái gì NHÌN log khi lỗi 500 tăng? Có cảnh báo chủ động nào (email/điện thoại) cho chủ dự án khi Nền tảng chết lúc 2 giờ sáng không? Nếu không — nói thẳng. (8) Dữ liệu: bất biến định kỳ `audit-invariants` có ai chạy sau launch và hằng ngày không? (9) Chế độ bảo trì: khi tắt có làm mất phiên không; nhân viên đã đăng nhập bằng bản mới chưa (cột «Đăng nhập gần nhất»); chủ bị khoá thì mở lại bằng cách nào và có kiểm lại được không. (10) Thông báo đẩy: iPhone hết hạn đăng ký, khoá VAPID.

ĐẦU RA THÊM. Bảng «Đo được / suy luận / chưa đo»: con số nào bạn thật sự đo trên máy (ghi lệnh), con số nào bạn ước lượng. Một mục «Nếu chỉ sửa được 3 thứ trước launch, chọn thứ nào» với lý do.
```

---

## Sau khi có báo cáo — người điều phối làm gì

1. Gộp theo mã (A-, B-, C-, D-, E-) vào **một** bảng: việc · mức · ai sửa · mất bao lâu · cần chủ quyết không.
2. Trùng phát hiện giữa hai vai → giữ một dòng, ghi cả hai nguồn (độ tin cao hơn).
3. Phát hiện bảo mật mức HIGH trở lên → vào `docs/quyen-hoan.json` hoặc sổ tương đương, có người chịu trách nhiệm và hạn (CLAUDE.md §3, «dừng dây chuyền»).
4. Mỗi phát hiện «CHẶN LAUNCH» phải có người kiểm độc lập thứ hai xác nhận lại trước khi tốn công sửa (tránh sửa theo báo cáo sai).
5. Trình chủ: kết luận go / no-go bằng lời thường, tối đa một trang, kèm tối đa ba quyết định.
