# Sửa sau rà soát trước ngày dùng thật lần 2, cộng bảy yêu cầu mới: Kế hoạch điều phối và thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Trạng thái:** Phần VIII, IX viết chi tiết 2026-11-10, CHỦ DUYỆT cùng ngày, nguyên văn: «Duyệt, mở thi công» (nút ở khung bước tiếp theo, trả lời «Duyệt kế hoạch và mở thi công Đợt 5A, 5B cùng việc soạn ADR Đợt 6?»). Câu 1 của Phần VIII CHỦ ĐÃ TRẢ LỜI 2026-11-11 (chat): trước «không, dời diễn tập qua ngày 25 tháng 11 năm 2026», rồi nói rõ, nguyên văn: «không, nhập nhánh chính luôn, vì diễn tập sẽ dời vào 25 tháng 11» — phương án (b): 5B nhập và phát hành TRƯỚC buổi diễn tập khôi phục (nay hẹn 25/11); lời cho phép ghi ở khoá `xay_tren_cho_phep_adr_0193`, `docs/quyen-hoan.json`. Câu (ii) chủ chưa trả lời riêng: xét mọi lượt còn mở. Chủ nói khác thì sửa. **ADR lượt C (ADR-0196, ADR-0197) CHỦ DUYỆT 2026-11-11** (chat), nguyên văn «duyệt,», hiểu theo câu duyệt mẫu ở trang trình lượt C: (a) chỉ Đối tác ghi «Công ty, chuyển khoản» mới bắt buộc ảnh; (b) tên ô «Khách đặt cọc cho đối tác»; (c) phương án (c1). Khoá `xay_tren_cho_phep_adr_0196` (HC-5.19, **6A chỉ phát hành sau diễn tập khôi phục 25/11**) và `_0197` (TNV-G1, **6B phát hành ngay khi xong**). Vì hai điều kiện phát hành khác nhau, 6A và 6B là hai nhánh riêng; 6A thi công được nhưng giữ chờ như 5B trước đây (migration của nó không vào `main` trước diễn tập). CHỦ ĐÃ DUYỆT 2026-11-09, nguyên văn: «Duyệt, mở thi công toàn bộ , lần lượt từng đợt cho tới khi hoàn thành». Cách hiểu ghi lại (chủ sửa được bằng một câu): Phần I điều 1 duyệt; điều 3 theo khuyến nghị (Q-05 làm khoá xem trước, tự kết thúc tách sau); phiếu chữ Phụ lục B dùng phương án (1) ở mọi mục cho tới khi chủ nói khác; điều 2 (người kiểm buổi sáng) chưa có tên — vẫn chờ chủ. Duyệt kế hoạch KHÔNG thay cho duyệt từng ADR lượt A, B, C (mỗi ADR vẫn trình chủ). Soạn 2026-11-08, phiên lập kế hoạch — phiên này không thi công, P15. Đây là **kế hoạch điều phối**: Đợt 1 có việc chi tiết tới từng bước; Đợt 3 có việc chi tiết nhưng chữ chờ chủ chọn; các đợt cần ADR chỉ ghi phạm vi, điều kiện và chỗ phải kiểm, phần việc chi tiết viết **sau khi** ADR được duyệt (`CLAUDE.md` §9).

**Goal:** Đưa các việc tuần đầu của báo cáo rà soát 7/11 và bảy yêu cầu mới của chủ (8/11) lên production theo từng đợt nhỏ, mỗi đợt có kiểm độc lập và kiểm sau triển khai, và không để sổ quyền hoãn làm `npm test` đỏ từ 0 giờ 1/12.

**Architecture:** Bảy đợt. Đợt 0 là việc chủ tự làm trên màn hình (hai trong bảy yêu cầu mới đã có sẵn chức năng). Đợt 1 sửa nhỏ không cần ADR, chữ đã có hoặc chủ đã chọn. Đợt 3 sửa chữ do chủ chọn ở phiếu Phụ lục B. Đợt 2, 5, 6 mỗi đợt một lượt duyệt ADR (tối đa 3 quyết định chạm quyền, dữ liệu, tiền, kèm trang ghép). Đợt 4 là đường găng 30/11 của sổ quyền hoãn và chạy song song từ đầu. Mỗi đợt một nhánh, một lần `day-len`, một lần `trien-khai`.

**Tech Stack:** TypeScript, Cloudflare Workers + D1 (SQLite) + R2, giao diện thuần dựng bằng `h()`, esbuild, `node --test`, bộ thử toàn luồng `tests/e2e`, kịch bản Chrome ở `docs/evidence/*/kich-ban/`.

**Spec:**
- Báo cáo rà soát (hồ sơ có ngày, đóng băng, không sửa): `docs/superpowers/specs/2026-11-07-ra-soat-truoc-launch-lan-2/README.md` và `phu-luc/00`–`05`.
- Bảy yêu cầu mới và mọi câu trả lời của chủ dùng ở đây: chép nguyên văn ở **Phụ lục A**.
- Hiện trạng từng mục đã được dò lại trên mã ngày 8/11 (HEAD `85f704777`, chứa `main` `fa3fd859a`) bằng năm trợ lý chỉ đọc; tệp:dòng trong kế hoạch lấy từ các lần dò đó và có thể lệch vài dòng khi `main` đổi — người thi công tìm theo tên hàm.

## Global Constraints

- Mọi chữ người dùng thấy, commit, tài liệu: tiếng Việt có dấu; gọi hệ thống là «Nền tảng». Tên nút, tên khái niệm tra `docs/BANG-THAM-CHIEU.md` (ADR-0167); tên chưa có thì đưa chủ 2–3 tên, không tự đặt; chữ nút lệch bảng là `npm test` đỏ; tệp bảng (`src/shared/bang-tham-chieu*.ts`) chỉ sửa bằng công cụ sửa tệp, rồi `npm run tham-chieu`.
- Mỗi câu báo là một hằng ở đúng một nơi; bài kiểm khẳng định MÃ lỗi, chỉ bài của chính hằng mới so nguyên câu (để chủ đổi chữ không làm đỏ bài khác).
- Tiền là `INTEGER` VNĐ, chỉ tính ở máy chủ; không tin số tiền từ trình duyệt. Không xoá cứng. Migration chỉ thêm tệp mới; số migration và số ADR lấy **lúc làm** (số lớn nhất trên `main` + 1 sau khi liệt kê mọi nhánh, worktree chưa gộp); hôm soạn: migration tới `0150`, ADR tới `0187`.
- Số phiên bản ghi «số kế tiếp lúc nhập» (hôm soạn: production `2.79`; `main` có mục `2.80` «Có vé» chưa triển khai).
- Nhật ký không ghi SĐT, email, MST, số tài khoản ngân hàng. Ảnh biên lai không vào nhật ký, không vào DTO mặc định.
- Kiến trúc: phân hệ chỉ import phân hệ khác qua `index.ts`; chỉ phân hệ chủ ghi bảng của mình; `orders` không import `van-chuyen`/`dispatch`.
- Giao diện: không `innerHTML` (dựng bằng `h()`), giá trị CSS vào token, ô gõ 16px. **Trần gói trang Đơn hàng không nới** (`src/goi-trang-nhe.test.ts`, hôm dò còn dư 68 byte): mỗi chữ có dấu trong gói tốn khoảng 6 byte, nên ưu tiên phương án 0 byte; vượt thì dừng, hỏi chủ.
- Sửa hành vi: bài kiểm đỏ trước, xanh sau. Chạm API hoặc migration: chạy e2e. Sửa giao diện: chạy lại kịch bản Chrome của màn đó, ảnh thật khổ 390 và 1280 (hoặc 1040 khi kịch bản dùng khổ đó).
- Việc lớn (dữ liệu, quyền, tiền, kể cả hiển thị tiền, triển khai, luật): một người kiểm độc lập chỉ đọc cho cả nhánh; người thi công không tự nghiệm thu.
- Đổi điều người dùng thấy: mỗi việc có câu «Người dùng sẽ thấy» ở Phần II; chủ đồng ý trước khi giao thi công.
- AI không chạy `git push`, không nhập vào `main`, không `wrangler deploy`/`rollback`/`secret`, không áp migration hay ghi lên D1 bản thật, không tạo kho R2. Chủ chạy `npm run day-len` và `npm run trien-khai`; AI chuẩn bị, kiểm, rồi đưa nguyên lệnh một lần.
- Không sửa ADR, đặc tả đã duyệt, `CLAUDE.md`, `playbook/`: chỉ đề xuất, chủ duyệt (N9). ADR mới hoặc «Sửa đổi» của ADR cũ đi qua lượt duyệt.
- Kế hoạch chạm vùng có lỗi đang mở trong `docs/quyen-hoan.json` phải ghi «xây trên lỗ đang hở: <mã>» và không được duyệt trước khi lỗi đóng hoặc chủ cho phép có ghi lý do (khoá `xay_tren_cho_phep_adr_xxxx` theo khuôn ADR-0178).

## Review Focus

1. **Đổi chữ «Trả trước» nhầm nghĩa.** Chỉ đổi nghĩa «hình thức thanh toán của Đối tác» (`NHAN_HINH_THUC`, radio ở `public/order-form.html`, các câu nhắc). Chữ «Trả trước» của giai đoạn thu trong danh sách khoản thu (`GIAI_DOAN`, `src/modules/billing/service.ts`) và «Khách hàng đã trả trước» của biên nhận là khái niệm khác, giữ nguyên. Task 1.8 có bài khoá cả hai phía.
2. **Gửi đơn của Đối tác bị chặn ở trình duyệt nhưng nhân viên thì không.** Luật Đón/Không đón (ADR-0134) chỉ chặn ở cửa gửi, xác nhận; «Lưu đơn (chưa xác nhận)» của nhân viên phải vẫn lưu được khi chưa chọn, và dịch vụ thuộc nhóm tắt đưa đón không bị đòi chọn. Task 1.2 có bài cho cả hai.
3. **Nút «Điền thông tin đối tác» lộ số cho người không được xem.** Chỉ hiện khi đã chọn «Qua đối tác» VÀ người dùng thuộc văn phòng có ô `party.view` (tài khoản Thực tập không thấy). Đối tác chưa có số thì báo, không điền rỗng. Task 1.6.
4. **Hết phiên rồi đăng nhập người khác trên cùng máy.** Bất cứ cách giữ chữ đã gõ nào (Đợt 5) cũng phải xoá bản nháp khi người đăng nhập khác người cũ; câu báo «phiên đã hết» (Đợt 3) không được hiện cho người chưa từng đăng nhập trên máy đó.
5. **Câu khoá vé «Tiền khách ở tay bạn» nói sai người cầm tiền.** Trên đơn mà khoản cọc do người khác cầm, số «chờ nộp» có thể gộp cả tiền không ở tay người xem. Task 3.2 dò ca này trước; nếu câu sai thì dùng câu dự phòng ở Phụ lục B.

---

## Phần I — Trang cho chủ

**Kết luận.** Mọi lỗi trong báo cáo rà soát vẫn còn trên mã hiện tại, nhưng không lỗi nào làm sai tiền khi dùng đúng quy trình. Kế hoạch chia thành bảy đợt nhỏ: hai đợt đầu (Đợt 0, Đợt 1) không cần bạn duyệt văn bản nào, chỉ cần bạn đồng ý danh sách «người dùng sẽ thấy». Ba đợt có ADR, mỗi đợt bạn duyệt một lần, tối đa ba quyết định. Việc gấp nhất là bốn mục trong sổ hoãn hạn 30/11: nếu chưa xong hoặc chưa gia hạn, từ 0 giờ 1/12 mọi lần nhập và triển khai đều bị máy chặn.

**Hai yêu cầu mới bạn làm được ngay, không cần sửa mã** (đăng nhập tài khoản Toàn quyền):
1. Hạn chốt 6 giờ → 1 giờ: màn «Chính sách điều phối», ô «Hạn chốt trước giờ đón (phút)», gõ 60 rồi lưu. Cùng màn có hai ô nên xem lại: «Cảnh báo sắp tới hạn chốt» (phút) và «Hạn từ chối chuyến» (tính bằng **giờ**, từ 1 đến 48 — đừng gõ 60 vào ô này).
2. Ẩn phần nhập khách ở đơn của Đối tác: trang «Tôi», bấm «Bật ẩn thông tin khách». Công tắc có từ bản 2.57; nó ẩn cả khung Khách hàng (tên, số) lẫn Hành khách, máy tự điền thông tin của chính Đối tác, xe vẫn chạy được, và chỉ áp cho tài khoản chỉ mang quyền Đối tác. Muốn chỉ ẩn phần Hành khách thì phải làm công tắc mới (ghi ở BACKLOG nếu bạn cần).

**Ba điều cần bạn quyết bây giờ:**
1. **Duyệt kế hoạch và danh sách Đợt 1** (cột «Người dùng sẽ thấy» các dòng 1.1–1.9 ở Phần II). Khuyến nghị: duyệt.
2. **Ai kiểm buổi sáng tuần đầu** (quyết định 2 của báo cáo): đọc Góp ý, xem lỗi, chạy kiểm dữ liệu theo Phần XII. Màn Góp ý chỉ tài khoản Toàn quyền mở được, nên người này là bạn hoặc người giữ quyền Toàn quyền. Khuyến nghị: bạn giao một người, AI đã soạn sẵn các bước.
3. **Chuyến quên bấm «Kết thúc».** Lượt trước bạn chọn «khoá xem và tự kết thúc». Khi dò mã, máy chỉ tự đóng chuyến được bằng lệnh «Kết thúc gián đoạn», lệnh này ghi mọi khách chưa xong thành «chuyến bị gián đoạn», tức ghi sai kết quả khách. Khuyến nghị: làm phần khoá xem trước (từ hết ngày hôm sau, tài xế không còn thấy tên khách nhưng vẫn bấm xong chuyến được, cộng một dòng nhắc), tách phần tự kết thúc thành quyết định sau.

**Sau đó, theo lịch:** phiếu chọn chữ Đợt 3 (Phụ lục B, mỗi câu có sẵn phương án khuyến nghị); lượt duyệt ADR A khoảng 12/11; lượt B khoảng 14/11; quyết định bốn mục hạn 30/11 khoảng 20/11; lượt C sau khi lỗi «đơn huỷ còn giữ tiền» đóng hoặc bạn cho phép xây tiếp.

## Phần II — Bảng việc

Trạng thái hôm soạn: mọi dòng «chờ duyệt kế hoạch», trừ dòng ghi khác.

| # | Việc | Người dùng sẽ thấy | Xong khi | Đợt | Trạng thái |
|---|---|---|---|---|---|
| 0.1 | Triển khai bản «Có vé» đang nằm trên `main` | Như mục nhật ký thay đổi của bản đó | GET `/api/auth/config` ra số phiên bản của bản «Có vé» | 0 | chờ chủ (phiên riêng của bản đó) |
| 0.2 | Đổi hạn chốt 360 → 60 phút | Đơn có đưa đón được xác nhận tới 1 giờ trước giờ đón mà không cần Đặt gấp | Màn Chính sách điều phối hiện 60 | 0 | chờ chủ |
| 0.3 | Bật «Ẩn thông tin khách» (nếu muốn) | Đối tác lập đơn không phải nhập tên, số khách | Trang Tôi hiện nút «Tắt ẩn thông tin khách» | 0 | chờ chủ |
| 0.4 | Chạy bốn câu kiểm dữ liệu (Phần XI) | — | Đủ tám dòng có tình trạng | 0 | chờ chủ |
| 1.1 | V-01: câu lỗi hệ thống hiện mã | Khi Nền tảng báo lỗi hệ thống, câu báo có kèm mã lỗi để chụp gửi Quản trị | Bài router đỏ → xanh | 1 | chờ duyệt |
| 1.2 | G-02: chặn Gửi đơn khi chưa chọn Đón/Không đón | Đối tác bấm Gửi đơn mà chưa chọn thì đơn chưa lưu, dải đỏ nói dịch vụ nào thiếu và màn nhảy tới hai nút đang viền đỏ; trang đơn nháp ghi «Chưa chọn đón» thay vì «Không đưa đón» | Bài thuần + kịch bản Đối tác lập đơn xanh | 1 | chờ duyệt |
| 1.3 | G-04: Quản lý bán hàng tới được «Dịch vụ & giá» trên iPhone | Trang chủ điện thoại của Quản lý bán hàng có ô «Dịch vụ & giá»; hai ô «Hỗ trợ», «Nhật ký thay đổi» chuyển vào «Tất cả» (vẫn có ở trang Tôi) | Bài «mọi ô chạm được trên điện thoại» đỏ → xanh | 1 | chờ duyệt |
| 1.4 | G-06(h): hướng dẫn nói đúng menu | Các bài hướng dẫn khớp đúng thanh tab, menu đang thấy | Bài khớp menu mới xanh | 1 | chờ duyệt |
| 1.5 | N7a: ẩn ô ghi chú khi dịch vụ không đưa đón | Dịch vụ không có đưa đón thì Đối tác không còn dòng «Ghi chú — Thời gian đón» (chữ đã gõ trước đó vẫn giữ) | Bài nối dây xanh, ảnh hai loại dịch vụ | 1 | chờ duyệt |
| 1.6 | N5: nút «Điền thông tin đối tác» | Nhân viên văn phòng chọn «Qua đối tác» xong có nút điền sẵn tên và số của đối tác vào khung Khách hàng | Bài luật hiện nút xanh | 1 | chờ duyệt |
| 1.7 | N4: Nhập lô vé dùng khung chọn dịch vụ của Tạo đơn | Trang Nhập lô vé chọn dịch vụ bằng ô tìm và hàng nút nhóm giống Tạo đơn, thay cho hộp thả xuống dài | Kịch bản vé QR sửa xong vẫn xanh | 1 | chờ duyệt |
| 1.8 | Đổi chữ «Trả trước» thành «Thanh toán ngay» | Ở ô chọn cách thanh toán khi lập đơn cho đối tác có hạn mức, chữ «Trả trước» thành «Thanh toán ngay» | Bài chữ + bảng tham chiếu xanh | 1 | chờ duyệt |
| 1.9 | Sửa ba kịch bản Chrome đã đỏ sẵn | — (chỉ bộ kiểm) | Ba kịch bản chạy xanh | 1 | chờ duyệt |
| 3.1 | T-02: câu giữ đơn khi thiếu mức hoa hồng | Kế toán được bảo đúng việc: ghi mức tay cho dòng đó, không đi cài mức (cài mức mới không gỡ được đơn đã xác nhận) | Bài thuần đỏ → xanh, 9 chỗ ghim đổi cùng lần | 3 | chờ chọn chữ |
| 3.2 | Q-07: câu khoá vé cho Đối tác | Đối tác đang cầm tiền khách được bảo nộp về Công ty để mở vé, thay vì câu «Công ty chưa xác nhận» | Bài vé đỏ → xanh, kịch bản Đối tác xem vé xanh | 3 | chờ chọn chữ |
| 3.3 | G-05: màn hẹp «Dịch vụ & giá» | Cạnh công tắc có chữ «Cần kiểm vé» và dòng nói vé theo nhóm, đặt riêng hay mặc định; nhóm gập có mũi tên và số vé; bấm Ngừng bán được hỏi lại (hoặc có Hoàn tác); người lập đơn gặp dịch vụ đã ngừng bán được bảo chọn dịch vụ khác | Bài thuần + hai kịch bản danh mục xanh | 3 | chờ chọn chữ |
| 3.4 | G-06(a)(b)(c)(e)(f): năm chỗ chữ khó hiểu | Mỗi câu nói rõ việc đang chờ, nút nào chưa bấm được, tên nút đúng việc | Bài chữ xanh | 3 | chờ chọn chữ |
| 3.5 | G-06(d): cách viết tiền rút gọn «2,8tr ₫» | Trang chủ viết tiền cùng kiểu với các trang khác | Bài tiền + kịch bản Trang chủ xanh; người kiểm độc lập ĐẠT | 3 | chờ chọn |
| 3.6 | G-03(a): câu báo khi hết phiên | Hết phiên giữa chừng thì trang đăng nhập nói phiên đã hết | Bài thuần + kịch bản phiên xanh | 3 | chờ chọn chữ |
| 2.1 | T-03: đổi bên đặt của đơn Trả sau | Đơn trả sau đã xác nhận chỉ đổi được sang đối tác có hạn mức còn hiệu lực, có câu nói rõ | ADR duyệt; bài T3-a…f xanh; người kiểm ĐẠT | 2 | chờ ADR lượt A; xây trên lỗ đang hở: HC-4.2 |
| 2.2 | Q-05: khoá xem khách của chuyến quên kết thúc | Từ hết ngày hôm sau ngày xe chạy, tài xế không còn thấy tên, năm sinh, số liên hệ của khách; vẫn bấm xong chuyến được; có dòng nhắc bấm Kết thúc | ADR duyệt; bài khung xem xanh; người kiểm ĐẠT | 2 | chờ ADR lượt A |
| 2.3 | R3d: ai được ngừng dùng hồ sơ khách | Chỉ Quản trị, Toàn quyền ngừng dùng hoặc dùng lại hồ sơ; nhật ký ghi rõ | ADR duyệt; bài ngừng hồ sơ xanh; người kiểm ĐẠT | 2 | chờ ADR lượt A |
| 4.1 | TNV-G1: đóng lỗi đơn huỷ còn giữ tiền | Như kế hoạch đóng TNV-G1 đã có | Mục rời khỏi sổ, hoặc chủ gia hạn có lý do | 4 | chờ chủ xác nhận sổ vàng |
| 4.2 | HC-4.2: bút toán điều chỉnh cần người thứ hai | Tuỳ phương án chủ chọn | Mục rời khỏi sổ, hoặc chủ gia hạn có lý do | 4 | chờ quyết |
| 4.3 | Hai ô quyền chưa có route | — | Bỏ khỏi bảng quyền hoặc gia hạn | 4 | chờ quyết |
| 5.1 | Q-06: Nhân sự tạo tài khoản xem được khách | Tài khoản mới xem được đơn và số khách do Nhân sự tạo thì PIN đầu do Quản trị cấp | ADR duyệt; người kiểm ĐẠT | 5 | chờ ADR lượt B |
| 5.2 | G-03(b): giữ chữ đã gõ khi hết phiên | Đăng nhập lại xong về đúng form, chữ đã gõ còn nguyên | ADR duyệt; người kiểm ĐẠT | 5 | chờ ADR lượt B |
| 5.3 | N2: công tắc giờ đón cho Đối tác | Đối tác gửi đơn có đón mà chưa ghi giờ vẫn gửi được, đơn nhắc vàng «chưa chốt giờ»; xe chưa xếp được cho tới khi văn phòng điền giờ | ADR duyệt; người kiểm ĐẠT | 5 | chờ ADR lượt B |
| 6.1 | N1: biên lai bắt buộc khi Đối tác báo đã chuyển khoản | Đối tác báo đã chuyển khoản cho Công ty thì phải kèm ảnh biên lai; Kế toán mở ảnh ngay tại dòng khoản thu rồi mới xác nhận như trước | ADR duyệt; người kiểm ĐẠT | 6 | chờ ADR lượt C; xây trên lỗ đang hở: HC-5.19 |
| 6.2 | N6: «Khách hàng đặt cọc cho đối tác» luôn có | Ô cọc luôn có khi Đối tác lập đơn, kể cả đơn trả sau, và số cọc không làm giảm số Đối tác còn nợ Công ty | ADR duyệt; người kiểm ĐẠT | 6 | chờ ADR lượt C; xây trên lỗ đang hở: TNV-G1 |
| 6.3 | N3: cài đặt mặc định Trả sau hay Thanh toán ngay | Khi lập đơn cho đối tác có hạn mức, ô cách thanh toán chọn sẵn theo cài đặt của Toàn quyền | ADR duyệt | 6 | **gác** tới khi chủ gỡ lời cấm Trả sau (quyết định 3) |

## Phần III — Các lượt quyết định và lượt duyệt ADR

| Lượt | Khi nào | Nội dung | Ghi chú |
|---|---|---|---|
| Lượt 1 | 8/11 — xong | T-03, Q-05, R3d, Q-07, ba câu về yêu cầu mới | Phụ lục A |
| Duyệt kế hoạch | ngay | Ba điều ở Phần I | Mở Đợt 0, Đợt 1, Đợt 4 |
| Phiếu chữ | cùng lúc hoặc ngay sau | Phụ lục B | Mở Đợt 3; chữ của Đợt 3 không chạm quyền, dữ liệu |
| ADR lượt A | khoảng 12/11 | T-03, Q-05 (khoá xem), R3d + trang ghép | T-03: **xây trên lỗ đang hở: HC-4.2** — câu duyệt phải kèm «Cho phép, có ghi lý do» (lý do: chỉ siết, không thêm đường ghi sổ) |
| ADR lượt B | khoảng 14/11 | Q-06, G-03(b), N2 + trang ghép | Không xây trên lỗ đang hở |
| Bốn mục 30/11 | khoảng 20/11 | TNV-G1, HC-4.2, `task.progress`, `dispatch.guides.view`: đóng hay gia hạn | Hạn chót cứng, xem Phần XIII |
| ADR lượt C | sau khi TNV-G1 đóng, hoặc sớm hơn nếu chủ cho phép | N1, N6 (+ N3 khi gỡ lời cấm Trả sau) + trang ghép | N6: **xây trên lỗ đang hở: TNV-G1**; N1: migration mới khi chưa diễn tập khôi phục (**HC-5.19**) |
| Quyết định 3 | khi chủ muốn mở Trả sau | Gỡ lời cấm hạn mức Trả sau | Điều kiện trước: T-03 (Đợt 2) đã lên; Kế toán có hướng dẫn nợ sau «Khách đã trả đủ»; thử với một đối tác, hạn mức nhỏ |

## Phần IV — Đợt 1: sửa nhỏ, không cần ADR

Một phiên thi công làm lần lượt Task 1.1–1.9 trên một nhánh. Không task nào là việc lớn; vẫn cần một người soát cuối đợt (một trợ lý đọc diff) vì đợt chạm nhiều màn. Giữa chừng chỉ chạy `node --test <tệp>` và `npm run typecheck`; `npm test`, `npm run test:e2e`, kịch bản Chrome mỗi thứ một lần ở Task 1.10.

### Task 1.1: V-01 — câu lỗi hệ thống hiện mã

**Files:**
- Modify: `src/shared/router.ts` (câu 500 «…báo quản trị viên kèm mã này.», quanh dòng 788)
- Test: `src/shared/router.test.ts`

**Interfaces:**
- Produces: `cauLoiHeThong(ma: string): string` trong `src/shared/trang-thai-he-thong-chu.ts`, trả «Có lỗi hệ thống. Thử lại sau; nếu còn lỗi, báo quản trị viên kèm mã ‹ma›.» (biến thể 1: chỉ thay «mã này» bằng mã thật — không cần chủ chọn).

- [ ] **Step 1:** Viết bài: route ném lỗi, request có header `cf-ray: 8c2f1a3b4d5e6f7a-SIN` → 500, `error.message` chứa `8c2f1a3b4d5e6f7a-SIN`, `error.requestId` bằng đúng mã đó; ca không có `cf-ray` → câu chứa đúng UUID ở `requestId`; dòng `console.error` «unhandled» mang cùng mã (`mock.method(console, "error")`).
- [ ] **Step 2:** `node --test src/shared/router.test.ts` → ĐỎ ở khẳng định «message chứa mã».
- [ ] **Step 3:** Thêm `cauLoiHeThong`, dùng ở `router.ts`. Không đưa `e.message` gốc vào câu (có thể chứa chữ của CSDL).
- [ ] **Step 4:** Chạy lại → XANH.
- [ ] **Step 5:** Commit «Câu lỗi hệ thống hiện mã lỗi (V-01)».

### Task 1.2: G-02 — chặn Gửi đơn khi chưa chọn Đón/Không đón

**Files:**
- Modify: `src/shared/cong-chon-don.ts`, `web/order-form.ts` (`validate()`), `web/khoi-dua-don.ts` (nhóm nút Đón/Không đón, `showIssues`), `web/order.ts` (`khoiDuaDonDon`), `src/shared/dong-gap-the.ts`
- Test: `src/shared/cong-chon-don.test.ts`, `src/shared/dong-gap-the.test.ts`
- Kịch bản: `docs/evidence/2026-09-26-mo-danh-muc-doi-tac/kich-ban/doi-tac-lap-don-smoke.mjs`

**Interfaces:**
- Produces: `dichVuThieuChonDon(ds: { choPhep: boolean; pickupChoice: "PICKUP" | "NO_PICKUP" | null; soChang: number }[]): number[]` — chỉ số các dịch vụ thiếu, sau khi cho từng dịch vụ qua `chonDonTheoNhom` (`src/shared/chon-nhanh.ts`) rồi `thieuChonDon` (đúng phép `collect()` dùng khi gửi). Kiểu `pickupChoice` lấy đúng kiểu trong `src/shared/contracts.ts`.
- Produces: `nhanDuaDonTrangDon(d: { status: string; pickupChoice: … | null; soChang: number }): string` trong `dong-gap-the.ts` — nháp + null → `CHIP_CHUA_CHON_DON`; còn lại «Không đưa đón».

- [ ] **Step 1:** Bài `cong-chon-don.test.ts`: dịch vụ thuộc nhóm tắt đưa đón không bị chặn; `pickupChoice` null bị chặn; chọn Đón mà không có chặng bị chặn. Bài `dong-gap-the.test.ts`: ba ca (nháp + null → «Chưa chọn đón»; đã chọn Không đón → «Không đưa đón»; đơn đã xác nhận có null → «Không đưa đón»).
- [ ] **Step 2:** Chạy hai tệp → ĐỎ (hàm chưa có).
- [ ] **Step 3:** Viết hai hàm. Trong `validate()` thêm cờ `guiDon = !editId && guiDonKhiLuu && !datGap` (cùng điều kiện với nhánh gửi); mỗi dịch vụ thiếu thêm dòng `cauThieuChonDon(i)` («Dịch vụ thứ N chưa chọn Đón hay Không đón.» — nguyên văn ADR-0134 Đ2, không cần chủ chọn) vào dải «Chưa lưu được — kiểm tra lại:» và đẩy nhóm nút `.dd-chon-don` của thẻ đó vào danh sách ô lỗi để tiêu điểm tới đó. Nhóm nút có `aria-invalid="true"` + dòng lỗi nối `aria-describedby`, viền lỗi dùng token. `khoiDuaDonDon` gọi `nhanDuaDonTrangDon`. Nhân viên («Lưu đơn (chưa xác nhận)») không bị chặn.
- [ ] **Step 4:** Chạy hai tệp → XANH; `npm run typecheck` 0 lỗi; đo trần gói bằng `node --test src/goi-trang-nhe.test.ts`.
- [ ] **Step 5:** Sửa kịch bản Đối tác lập đơn: bước 2c và bước 3 bấm `[data-action="chon-khong-don"]` trước `#save`; thêm bước mới «bỏ trống → Gửi đơn → vẫn ở /order-form, có dải đỏ, tiêu điểm ở nhóm nút».
- [ ] **Step 6:** Commit «Chặn Gửi đơn khi chưa chọn Đón/Không đón (G-02)».

### Task 1.3: G-04 — Quản lý bán hàng tới được «Dịch vụ & giá» trên điện thoại

**Files:**
- Modify: `src/shared/trang-chu-o.ts` (thay danh sách tĩnh `KHOA_CO_TAB` ở chỗ lọc lưới)
- Test: `src/shared/trang-chu-o.test.ts`
- Kịch bản: `docs/evidence/2026-11-05-quan-ly-ban-hang/kich-ban/ql-ban-hang-smoke.mjs` (bước 2)

**Interfaces:**
- Produces: `khoaCoTab(who: Pick<Staff, "permissions">): ReadonlySet<string>` — giữ những khoá trong `KHOA_CO_TAB` mà người này THẬT có lối vào trên thanh tab: tab của chính trang đó, hoặc tab «Thiết lập» khi trang nằm trong nhóm THIẾT LẬP của `THANH_BEN`. Dùng `thanhTab` / `THANH_BEN` đã export từ `src/shared/muc-giao-dien.ts`. Không đổi quyền, không đổi `muc-giao-dien.ts`. Kiểu `who` lấy theo chữ ký đang dùng trong `trang-chu-o.ts`.

- [ ] **Step 1:** Bài bất biến mới: với mọi tập con của 11 mã quyền, mọi ô của bảng trượt chạm được trên điện thoại (qua tab, lưới, «Tất cả» hoặc trang Thiết lập). Ghim lưới SALES + SALES_MANAGER = Danh bạ | Điều phối xe | Dịch vụ & giá | Tất cả. Đổi bài «mọi tổ hợp quyền» đang dùng `KHOA_CO_TAB` sang `khoaCoTab(who)`.
- [ ] **Step 2:** Chạy → ĐỎ ở 8 tập quyền (đều có SALES_MANAGER, không có `admin.manage`).
- [ ] **Step 3:** Viết `khoaCoTab`, sửa chú thích giả định «có ô thì có tab». Các ghim SALES / ACCOUNTING / ADMIN cũ giữ nguyên.
- [ ] **Step 4:** Chạy → XANH.
- [ ] **Step 5:** Sửa kịch bản bước 2 (đang đạt giả vì kiểm `a[href="/catalog"]` trong thanh bên bị ẩn): khổ 390 mở «/» rồi `coLoiVao(q, "/catalog")` (hàm ở `docs/evidence/2026-10-30-luat-ban-dac-diem/kich-ban/lb-chung.mjs`); khổ 1040 mở nhóm THIẾT LẬP rồi `coLoiVao`. Không kiểm ở /account.
- [ ] **Step 6:** Commit «Quản lý bán hàng có ô Dịch vụ & giá trên điện thoại (G-04)».

### Task 1.4: G-06(h) — hướng dẫn nói đúng menu

**Files:**
- Modify: `src/shared/huong-dan-doi-tac.ts`, `huong-dan-ban-hang.ts`, `huong-dan-ke-toan.ts`, `huong-dan-hdv.ts`, `huong-dan-tai-xe.ts`, `huong-dan-nhan-su.ts`, `huong-dan-quan-tri.ts`, `huong-dan-quan-ly-ban-hang.ts` (các dòng «Thanh tab… / Tab ở đáy…», «Chân menu…», «Đầu menu…»)
- Test: `src/shared/huong-dan-menu.test.ts` (mới), `src/shared/huong-dan.test.ts`

**Interfaces:**
- Consumes: `thanhTab`, `thanhBen`, `THANH_TREN` từ `src/shared/muc-giao-dien.ts`.

- [ ] **Step 1:** Bài mới: với bộ quyền đại diện của mỗi nhóm hướng dẫn, các tên trong [[…]] của dòng thanh tab và dòng chân menu phải trùng (đúng thứ tự) với nhãn `thanhTab(who)` / chân `thanhBen(who)`; nút «Tạo đơn» không được ghi ở «Đầu menu» (nó ở `THANH_TREN`).
- [ ] **Step 2:** Chạy → ĐỎ ở các nhóm đã dò (Đối tác 3 mục thay vì 4; chân menu ghi «Hướng dẫn» thay vì «Nhật ký thay đổi»…).
- [ ] **Step 3:** Sửa chữ từng dòng bằng tên mục có sẵn. Dòng G-04 của hướng dẫn Quản lý bán hàng đúng sau Task 1.3. Dòng «khung đỏ» của hướng dẫn Đối tác đúng sau Task 1.2.
- [ ] **Step 4:** Chạy hai bài → XANH; nếu máy canh bài hướng dẫn đòi xem lại thì `npm run huong-dan:xem-lai -- <bài>`.
- [ ] **Step 5:** Commit «Hướng dẫn khớp đúng thanh tab và menu (G-06h)».

### Task 1.5: N7a — ẩn ô ghi chú khi dịch vụ không đưa đón

**Files:**
- Modify: `web/service-card.ts` (dòng ghi chú gọn của Đối tác, chỗ đặt `duaDon.root.hidden`)
- Test: `src/form-dat-ve-noi-day.test.ts`

- [ ] **Step 1:** Thêm khẳng định nối dây: dòng ghi chú gọn (`NHAN_GHI_CHU_DOI_TAC`) bị đặt `hidden` theo đúng điều kiện `o.duaDon.coDuaDon?.() === false`, ở cả hai chỗ cập nhật khối Đưa đón (lúc dựng và lúc đổi dịch vụ).
- [ ] **Step 2:** Chạy → ĐỎ.
- [ ] **Step 3:** `dongGhiChuGon.hidden = o.duaDon.coDuaDon?.() === false` ở hai chỗ. Không xoá giá trị đã gõ (máy chủ không bắt ô này; dữ liệu cũ vẫn gửi lên nguyên). Dịch vụ nhập tay luôn có đưa đón nên ô vẫn hiện.
- [ ] **Step 4:** Chạy → XANH. Chạy `docs/evidence/2026-11-02-dat-ve-luot-1/kich-ban/chup-anh.mjs` và `docs/evidence/2026-09-26-mo-danh-muc-doi-tac/kich-ban/doi-tac-lap-don-smoke.mjs` với một dịch vụ có đưa đón và một không có.
- [ ] **Step 5:** Commit «Ẩn ô ghi chú gọn của Đối tác khi dịch vụ không đưa đón (N7a)».

### Task 1.6: N5 — nút «Điền thông tin đối tác»

**Files:**
- Modify: `public/order-form.html` (cạnh `#use-mine` trong `.khach-dau`), `web/order-form.ts`, `src/shared/phan-doi-tac-hien-thi.ts`, `src/shared/huong-dan-ban-hang.ts` (thêm một câu cạnh dòng «Điền thông tin của tôi»), `src/shared/bang-tham-chieu-*.ts` (mục cho cả «Điền thông tin của tôi» và «Điền thông tin đối tác»)
- Test: `src/shared/phan-doi-tac-hien-thi.test.ts`, `src/ben-dat-doi-tac-noi-day-giao-dien.test.ts`

**Interfaces:**
- Produces: `hienNutDienDoiTac(who: Staff, daChonBenDat: { partyId: string } | null): boolean` = `daChonBenDat !== null && isOffice(who) && can(who, "party.view")`.
- Consumes: `GET /api/parties/:id` (cổng office + ô `party.view`, trả `primaryPhone`); không đổi máy chủ, route, quyền.

- [ ] **Step 1:** Bài thuần: SALES / ADMIN / SUPER_ADMIN + đã chọn đối tác → true; chưa chọn → false; INTERN → false; tài khoản giữ quyền Đối tác → false.
- [ ] **Step 2:** Chạy → ĐỎ.
- [ ] **Step 3:** Viết hàm; nút `#use-partner` chữ «Điền thông tin đối tác» (tên chủ đã viết 8/11). Bấm → `api(\`/api/parties/${partyId}\`)` → điền tên và `primaryPhone` vào hai ô, bắn sự kiện `input`; đối tác chưa có số → báo nhẹ «Đối tác này chưa có số điện thoại.» và không xoá ô. Nhãn ô số giữ nguyên (chủ có thể đổi sau ở phiếu chữ).
- [ ] **Step 4:** Chạy bài thuần và bài nối dây (giữ khẳng định cũ về `#use-mine`) → XANH; `npm run tham-chieu`; `npm run build:web` để sinh lại `src/shared/so-do-trang.ts`.
- [ ] **Step 5:** Commit «Nút Điền thông tin đối tác khi lập đơn qua đối tác (N5)».

### Task 1.7: N4 — Nhập lô vé dùng khung chọn dịch vụ của Tạo đơn

**Files:**
- Modify: `web/catalog-picker.ts`, `src/shared/loc-danh-muc.ts` (nếu luật chọn-một là thuần), `web/ve-kho.ts` (`dungForm`, nơi dựng `#vk-dich-vu`), `public/ve-kho.html` (chỉ nếu cần chỗ gắn)
- Test: bài thuần cạnh `loc-danh-muc.ts`
- Kịch bản: `docs/evidence/2026-11-02-ve-qr-tran-lo/kich-ban/ve-qr-smoke.mjs` (đang chọn bằng `#vk-dich-vu option` — sẽ gãy, phải sửa)

**Interfaces:**
- Produces: tuỳ chọn mới của `createCatalogPicker`: `{ cheDo?: "them" | "chon-mot"; khongYeuCauGia?: boolean; khoaNho?: string }`. `cheDo: "chon-mot"`: chạm dòng là chọn (thu dòng lại, có nút «Đổi»), không hiện «✓ đã thêm»; `khongYeuCauGia`: dòng không có giá người lớn vẫn chọn được, không hiện cột giá; `khoaNho` mặc định giữ khoá cũ của Tạo đơn, trang vé dùng khoá riêng (không nhớ nhóm chéo hai trang).

- [ ] **Step 1:** Bài thuần cho luật chọn-một và «không yêu cầu giá» (dòng hợp lệ, dòng bị loại).
- [ ] **Step 2:** Chạy → ĐỎ.
- [ ] **Step 3:** Thêm tuỳ chọn; `ve-kho.ts` thay `<select id="vk-dich-vu">` bằng khung chọn trong `.lb-truong`, giữ `<select id="vk-nhom">` (loại khách). Thân `POST /api/ve/lo` không đổi. Chỉ dùng bộ lọc Tạo đơn đang có (tìm chữ, nút nhóm, ★ Hay dùng); không thêm lọc mới.
- [ ] **Step 4:** Chạy → XANH; `npm run build:web`; kiểm `src/goi-trang-nhe.test.ts` không đổi (trang Đơn hàng không import khung chọn).
- [ ] **Step 5:** Sửa kịch bản vé QR chọn dịch vụ bằng khung mới.
- [ ] **Step 6:** Commit «Nhập lô vé chọn dịch vụ bằng khung của Tạo đơn (N4)».

### Task 1.8: Đổi chữ «Trả trước» thành «Thanh toán ngay»

**Files:**
- Modify: `src/shared/tra-sau.ts` (`NHAN_HINH_THUC.PREPAID`, câu «Hãy chọn trả trước»), `public/order-form.html` (radio đang ghi chữ cứng), `web/order-form.ts` (radio lấy chữ từ hằng), `src/shared/han-muc-tra-sau-hien-thi.ts` (`nhanHinhThucDon`, `CAU_VE_TRA_TRUOC`), `src/modules/orders/tra-sau-cong.ts` (`CAU_TRA_SAU_KHONG_COC`), `src/shared/bang-tham-chieu-khai-niem.ts` (mục «Chưa cấp»; mục mới «Thanh toán ngay», mục «Trả sau» nếu chưa có), `src/shared/huong-dan-bai-noi-dung.ts` (bài «Cấp hạn mức trả sau» nếu nhắc)
- Test: `src/shared/tra-sau.test.ts`, `src/shared/han-muc-tra-sau-hien-thi.test.ts`, bài mới khoá radio dùng hằng
- Kịch bản: `docs/evidence/2026-11-05-tra-sau/kich-ban/tra-sau-smoke.mjs` (dòng so «chuyển về Trả trước»)

- [ ] **Step 1:** Sửa kỳ vọng trong hai bài sang «Thanh toán ngay»; thêm bài: radio PREPAID của `order-form.html` không chứa chữ cứng mà nhận từ `NHAN_HINH_THUC`; thêm bài khoá phía ngược lại: `GIAI_DOAN.PREPAID` của billing vẫn là «Trả trước» và câu biên nhận «Khách hàng đã trả trước» không đổi.
- [ ] **Step 2:** Chạy → ĐỎ.
- [ ] **Step 3:** Đổi chữ ở các chỗ trên. Mục bảng tham chiếu «Thanh toán ngay»: trạng thái đã chốt, ngày 2026-11-08, ghi chủ chọn (Phụ lục A), «chủ đã loại: Trả trước», ghi chú «khác giai đoạn thu «Trả trước» của danh sách khoản thu». Không sửa nhật ký thay đổi cũ.
- [ ] **Step 4:** `npm run tham-chieu`; chạy các bài → XANH; sửa dòng so chữ của kịch bản Trả sau.
- [ ] **Step 5:** Commit «Đổi chữ Trả trước thành Thanh toán ngay ở hình thức thanh toán của đối tác».

### Task 1.9: Sửa ba kịch bản Chrome đã đỏ sẵn

**Files:**
- Modify: `docs/evidence/2026-09-21-v1-0/kich-ban/v1-xac-nhan-png.mjs` và hai bản `v1-nguoi-phu-trach.mjs` (ở `2026-09-21-v1-0` và `2026-10-30-danh-gia-khung-giao-dien`) — đang tìm nút «Xem biên nhận» không còn trong `web/`; `docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/chon-hdv-lap-don-smoke.mjs` — ghim «Lưu đơn (chưa xác nhận)» cho tài khoản Đối tác, nay là «Gửi đơn».

- [ ] **Step 1:** Tra tên nút hiện hành trong `docs/BANG-THAM-CHIEU.md` và `git log -S` để biết đợt đổi tên; ghi một dòng chú thích đầu mỗi kịch bản nói đổi theo đợt nào.
- [ ] **Step 2:** Đổi chữ tìm nút; không đổi điều kiện kiểm nào.
- [ ] **Step 3:** Chạy từng kịch bản → xanh.
- [ ] **Step 4:** Commit «Kịch bản Chrome: đổi chữ nút theo các đợt đổi tên».

(Bài tự quét chữ nút trong kịch bản Chrome là khả thi nhưng là hàng rào mới: chỉ làm khi chủ đồng ý, dạng cảnh báo trước. Ghi vào BACKLOG, không thuộc Đợt 1.)

### Task 1.10: Kiểm cuối Đợt 1 và giao chủ

- [ ] `npm test` thoát 0; `npm run typecheck` 0 lỗi; `npm run test:e2e` (Task 1.6, 1.7 chạm đường API đang có).
- [ ] Kịch bản Chrome của mọi màn bị đổi, ảnh 390 và 1280: `doi-tac-lap-don-smoke.mjs`, ba `a2-smoke-*.mjs`, `xac-nhan-smoke.mjs`, `ql-ban-hang-smoke.mjs`, bản 2026-10-29 của `trang-chu-smoke.mjs`, `quyen-thieu-quan-tri-smoke.mjs`, `dot-0-smoke.mjs`, `huong-dan-smoke.mjs`, `chup-anh.mjs`, `ve-qr-smoke.mjs`, `tra-sau-smoke.mjs`, và ba kịch bản của Task 1.9.
- [ ] Một trợ lý đọc diff cả nhánh (không phải việc lớn; người soát chỉ báo).
- [ ] Mục nhật ký thay đổi; đưa chủ lệnh nhập (Phần X bước 6) rồi `npm run trien-khai`.

## Phần V — Đợt 2: ADR lượt A (T-03, Q-05, R3d)

Một phiên soạn ba ADR + một trang ghép (bảng nào chứa gì, ô quyền nào đổi, cổng nào canh — kể cả chỗ giao diện ẩn/hiện theo quyền). Chủ duyệt xong mới viết phần việc chi tiết vào cuối tệp này. Cả đợt là việc lớn: một người kiểm độc lập cho cả nhánh.

**2.1 T-03 — đổi bên đặt của đơn Trả sau.** Sửa ADR-0168 Đ2 mục 6. Cổng `congDoiBenDatTraSau` (`src/modules/orders/tra-sau-cong.ts`) đòi thêm: bên mới không được null (409 `tra_sau_thieu_ben_dat`), bên mới có hạn mức hiệu lực và không có đơn quá hạn (gọi `kiemTraSau` với `soTienDon: 0`, `loai: "doi_ben"`; null → 503), gác phiên bản hạn mức của bên mới bằng `kq.version` (không dùng phiên bản bên cũ) ở cuối lô. Câu riêng cho `doi_ben` (câu cũ «Hãy chọn trả trước» là việc không làm được vì hình thức đã khoá). ADR phải chọn: chặn cả cửa gộp hồ sơ (dời đơn trả sau đã thu đủ sang hồ sơ không có hạn mức) hay ghi rõ là ngoài phạm vi; ngưng tài khoản / bỏ quyền Đối tác chỉ ghi lại, không sửa. **Xây trên lỗ đang hở: HC-4.2** (bài dò ngày 8/11 cho thấy «Huỷ khoản thu» vẫn do một người làm và ghi ngay; ADR-0115 điều 3 chỉ phủ lệnh điều chỉnh và điều chỉnh chi phí chuyến, không nhắc «Huỷ khoản thu» — người soạn ADR đọc lại trước khi viết); lý do xin phép: chỉ siết, không thêm đường ghi sổ. Bài: sửa hai bài cũ trong `src/tra-sau-duong-ghi.test.ts`, thêm T3-a…T3-f (không hạn mức, null, quá hạn, có hạn mức tăng đúng một phiên bản, đua phiên bản, đơn nháp và đơn thanh toán ngay không bị gác). Câu cho chủ chọn: Phụ lục B mục B-8.

**2.2 Q-05 — khoá xem khách của chuyến quên kết thúc.** Sửa ADR-0053 D7.2. Vế «đang chạy» của `trongNgayChay` (`src/shared/dieu-phoi-kiem.ts`) chỉ đúng tới hết ngày (giờ Việt Nam) kế sau ngày xuất bến; không Cron, không migration, không đổi route hay DTO; văn phòng không đổi; sau hạn tài xế vẫn bấm đón, vắng, trả, Kết thúc. Thêm dòng nhắc trên màn tài xế khi chuyến đang chạy mà đã qua khung xem. Bài: TC-18 của `dieu-phoi-kiem.test.ts` (xuất bến D lúc 12:35: D, D+1 đúng; D+2, D+9 sai; xuất bến D+1 00:30 đúng tới hết D+2; xuất bến tối D−1 chỉ D đúng), `khung-xem-khach.test.ts`, bài route bằng `tests/audit/dieu-phoi-khung.mjs`, thêm ca vào `src/hanh-khach-khong-lo-ten.test.ts` cho DRIVER và DRIVER_PARTNER; kịch bản `cuoc-smoke.mjs`, `tai-xe-thay-khach-smoke.mjs`. Phần tự kết thúc: quyết định riêng sau (Phần I điều 3).

**2.3 R3d — ai được ngừng dùng hồ sơ khách.** Sửa ADR-0007 (dòng Bán hàng, Kế toán, Quản trị tạo/sửa hồ sơ). Ô quyền mới `party.deactivate` = Quản trị, Toàn quyền; PUT hồ sơ (`src/modules/parties/index.ts`) trả 403 khi cờ «Đang dùng» đổi mà thiếu ô; nhật ký thêm «— ngừng dùng» / «— dùng lại»; DTO có cờ cho giao diện khoá công tắc. Không migration. Thêm mã thao tác không nhân đôi các bài «mọi tập con quyền»; nếu trần gói vượt thì dùng ô `admin.manage` có sẵn. Bài: `src/modules/parties/ngung-ho-so.test.ts` mới, đảo ca redteam R3d thành bài hồi quy, bảng quyền. Hai phát hiện phụ (xác nhận nháp có bên đặt đã ngưng vẫn qua; đơn mới cùng SĐT tạo hồ sơ trùng) ghi BACKLOG, không thuộc đợt này.

## Phần VI — Đợt 3: chữ do chủ chọn

Không cần ADR, trừ dòng 3.5 là việc lớn vì là hiển thị tiền. Chữ lấy theo phiếu Phụ lục B (hết giờ chọn thì dùng phương án khuyến nghị đã đánh dấu). Trần gói Đơn hàng: phiếu đã ưu tiên phương án 0 byte; G-03(a) +35 byte, còn dư.

### Task 3.1: T-02 — câu giữ đơn khi thiếu mức hoa hồng

**Files:** `src/modules/billing/rules.ts` (`lyDoGiuThuongMai`, nhánh thiếu mức không chụp bù được), `src/shared/phan-doi-tac-hien-thi.ts` (`canhBaoThieuMuc`), `src/shared/so-dai-ly-nhan.ts`, `web/phan-doi-tac.ts`, `src/shared/contracts.ts` (chú thích trường `thieu`). Test: `src/shared/phan-doi-tac-hien-thi.test.ts`; 9 chỗ ghim câu cũ: `src/chup-bu.test.ts`, `src/da-giao-khe-hoa-hong.test.ts`, `src/da-giao-thuong-mai.test.ts`, `src/modules/billing/rules.test.ts`, `src/modules/billing/lo-ghi.test.ts`.

**Interfaces:** `canhBaoThieuMuc(thieu: string | null, daChup = false): string | null`; khi `daChup` dùng hằng mới `CAU_THIEU_MUC_DA_CHUP`; `web/phan-doi-tac.ts` truyền `daChup = !dto.duKien && !dto.chuaChup`. Không đổi `CAU_THIEU_MUC` (vẫn đúng cho «Thử tra»), không đổi điều kiện chụp bù hay luật giữ đơn.

- [ ] Bài đỏ: `canhBaoThieuMuc("Chưa có mức cho dịch vụ này", true)` không chứa «cần cài mức»; ca `daChup = false` giữ nguyên → chạy ĐỎ → viết → XANH → đổi 9 chỗ ghim cùng lần → bài route theo khuôn `da-giao-khe-hoa-hong` (cài mức phủ ngày xác nhận → Chụp bù 409 → «Khách đã trả đủ» 409, câu có vế «không gỡ được») → kịch bản `docs/evidence/2026-10-08-so-dai-ly-dot-1/kich-ban/so-dai-ly-smoke.mjs` → commit.

### Task 3.2: Q-07 — câu khoá vé cho Đối tác

**Files:** `src/shared/ve-cau-khoa.ts` (mới), `src/modules/ve-dien-tu/index.ts` (hằng `CHUA_THU_DU`, GET `/api/ve/don` thêm cờ), `web/ve-don.ts` (bỏ bản chép tay câu, dùng hàm chung), `src/modules/billing/dat-coc.ts` (`tienDonVe` thêm `daHuy`), kiểu ở `src/shared/router.ts`. Test: `src/modules/ve-dien-tu/doi-tac-mo-ve.test.ts`, bài thuần cạnh tệp mới. Chữ trích lại: `src/shared/huong-dan-doi-tac.ts`, `src/shared/bang-tham-chieu-viec.ts`.

**Interfaces:** `cauKhoaVe(d: { traSauQuaHan: boolean; nguoiXemLaDoiTac: boolean; choDoiTacNop: boolean; nguoiLapCamTien: boolean }): string`. `nguoiLapCamTien` = người xem giữ quyền Đối tác, là người lập đơn, `tien.choNop > 0`, đơn chưa huỷ. Không đụng `thuDu`, `moVeDuoc`, `daThu`.

- [ ] **Bước dò trước khi viết:** dựng ca đơn công tắc Bật, khoản cọc do người khác cầm (khoản khai cọc ở đơn mà người lập không giữ tiền); xem `choNop` có gộp số đó không. Nếu có: câu chủ đã chọn có thể sai → dùng câu dự phòng B-2 ở Phụ lục B và báo chủ một lần.
- [ ] Bài đỏ (ca Tắt + «Tôi thu» ra câu mới ở cả 403 lẫn cờ GET; Bật + «Tôi thu» ra câu mới; Bật + «Công ty thu» câu cũ; đơn huỷ không ra câu mới; tài khoản lai xem đơn không phải mình lập không ra câu mới) → viết → XANH → sửa bước `${kho}-1` của `docs/evidence/2026-11-05-doi-tac-xem-ve/kich-ban/doi-tac-ve-smoke.mjs` → `npm run huong-dan:xem-lai -- viec/kho-ve` → `npm run tham-chieu` → commit.
- [ ] ADR-0170 Đ2 mục 5 đặt câu này: soạn **đề xuất** một dòng «Sửa đổi» cho chủ duyệt cùng phiếu chữ (không tự sửa ADR đã duyệt).

### Task 3.3: G-05 — màn hẹp «Dịch vụ & giá»

**Files:** `web/catalog-kiem-ve.ts` (`veManHep`, `congTac`, `doiBan`), `web/catalog.ts` (dùng chung hàm nhãn nguồn; Ngừng bán ở màn đủ), `src/shared/dich-vu-kiem-ve.ts` (`nhanNguonKiemVe`, câu đếm), `public/app.css` (`.kv-dau`: mũi tên theo khuôn `.trip > summary`, chỉ token), `src/modules/orders/service-rules.ts` (câu 400 dịch vụ không còn bán), `src/shared/order-errors.ts` (dòng trình duyệt), `src/shared/service-form.ts` (câu cùng họ), `src/shared/bang-tham-chieu-viec.ts` (dòng «Ngừng bán»). Test: `src/shared/dich-vu-kiem-ve.test.ts`, `src/shared/order-errors.test.ts`, `src/bang-tham-chieu.test.ts`. Kịch bản: `ql-ban-hang-smoke.mjs` bước 4, `danh-muc-nhom-smoke.mjs` (nếu chọn hỏi lại), `dot-a-smoke.mjs`.

- [ ] Công tắc có chữ nhìn thấy «Cần kiểm vé» + chữ nguồn, dùng `aria-labelledby`, giữ `data-action="kiem-ve"` và vùng bấm 44px. Thay «Chưa đặt» theo B-4. Nhóm có mũi tên, mở sẵn khi màn chỉ có một nhóm, câu đếm có tổng số vé. Ngừng bán theo B-5 cho cả hai màn (hỏi lại bằng `hoiXacNhan`, câu không hứa quá: đơn nháp đã lưu vẫn giữ dịch vụ). Câu 400 giữ tiền tố «Dịch vụ N:» (`serviceIndexOf` đọc nó), đúng cho cả ca xoá khỏi Sheet lẫn ca ngừng bán (B-6). Mỗi ý: bài đỏ → xanh → kịch bản → commit riêng.

### Task 3.4: G-06(a)(b)(c)(e)(f) — năm chỗ chữ

| Ý | Chỗ sửa | Bài phải sửa | Chữ |
|---|---|---|---|
| (a) | `src/shared/xac-nhan-hien-thi.ts` (`NHAN_VI`) | `xac-nhan-hien-thi.test.ts`; kịch bản `xac-nhan-smoke.mjs` | B-9 |
| (b) | `src/modules/billing/rules.ts` (câu «Chưa tới ngày đi…») | `src/modules/billing/rules.test.ts` | B-10 (khuyến nghị chỉ viết lại câu, giữ tiền tố «Đang giữ đơn») |
| (c) | `web/dat-gap-ui.ts` (nút và chữ chờ), các hướng dẫn và dòng bảng tham chiếu nhắc nút | `bang-tham-chieu.test.ts`, `huong-dan.test.ts`; ba kịch bản đặt gấp bấm theo `data-action` nên chỉ đổi tên bước | B-11 (dòng đang chờ chủ chọn sẵn trong bảng tham chiếu) |
| (e) | `public/orders.html` (câu danh sách trống) | `goi-trang-nhe.test.ts` | B-12 (khuyến nghị phương án 0 byte) |
| (f) | `src/shared/hien-thi-ma.ts` (`nhanDauVet`) | `hien-thi-ma.test.ts`; kịch bản `hoa-hong-smoke.mjs` | B-13 — câu cũ chép từ đặc tả đã duyệt 31/10: soạn dòng «Sửa đổi» cho chủ duyệt cùng phiếu |

(g) mã `MT_…` kèm «Chép mã»: không sửa — đúng Hiến chương 5.26.

### Task 3.5: G-06(d) — tiền rút gọn «2,8tr ₫» (việc lớn: hiển thị tiền)

Khuyến nghị D2 (B-14): chỉ ô số Trang chủ viết số đủ «2.800.000 ₫» (lời gọi ở `web/home.ts`), không đổi `vndShort`; đo chữ có xuống dòng ở khổ 390 không. Bài: `src/shared/money.test.ts` giữ nguyên; kịch bản bản 2026-10-29 `trang-chu-smoke.mjs` (đang ghim «12,34tr ₫») sửa. Nếu chủ chọn D1 (đổi `vndShort` thành «2,8 triệu ₫»): đổi luôn thẻ danh sách Đơn hàng và «Việc của bạn», sửa `viec-cua-ban.test.ts`, `hoa-hong-mot-nguon.test.ts`, `tro-ly-loc-tien.test.ts`, gói +9 byte. Người kiểm độc lập sau khi làm.

### Task 3.6: G-03(a) — câu báo khi hết phiên

**Files:** `web/api.ts` (`ghiNhoLyDoDangXuat`: lý do null mà máy có bản nhớ khung thì ghi chuỗi rỗng thay vì xoá, kiểm TRƯỚC `xoaKhungNho()`), `src/shared/session-ended.ts` (hàm câu dự phòng), `web/login.ts` (hiện câu khi khoá có mà rỗng). Test: `src/shared/session-ended.test.ts`, bài thuần «khi nào ghi dấu» (có / không có bản nhớ khung), `src/goi-trang-nhe.test.ts` (+35 byte). Kịch bản: `docs/evidence/2026-10-01-dang-nhap-a/kich-ban/phien.mjs` thêm ca xoá cookie → /login có câu; `v1-dang-nhap.mjs`, `dot-c-smoke.mjs`. Chữ: B-7. Người chưa từng đăng nhập trên máy mở liên kết sâu thì không có câu.

### Task 3.7: Kiểm cuối Đợt 3

Như Task 1.10, cộng người kiểm độc lập cho Task 3.5.

## Phần VII — Đợt 4: đường găng 30/11

Chạy song song từ ngày duyệt kế hoạch; mục tiêu là chủ quyết xong khoảng 20/11, sửa xong và lên production trước 30/11.

**4.1 TNV-G1 (đơn huỷ còn tiền đã thu).** Phần còn lại nằm trên nhánh `claude/nostalgic-aryabhata-066936` (chưa gộp, có migration riêng — phải soát lại số migration so với `main` hiện tại vì `main` đã tới `0150`). Còn chờ theo sổ: chủ (và Kế toán) xác nhận sáu ca sổ vàng; gộp nhánh với `main` mới; chạy lại tám tình huống G1 trên D1 tạm; triển khai; kiểm bản thật theo điều kiện 1 của kế hoạch đóng TNV-G1. Việc của AI: một phiên đưa nhánh đó lên `main` mới, chạy lại kiểm, soạn trang hỏi sáu ca bằng lời thường. Không đóng được trước 30/11 thì chủ gia hạn có ghi lý do (diff vào `docs/quyen-hoan.json` do chủ ra lệnh).

**4.2 HC-4.2 (bút toán điều chỉnh cần người thứ hai).** Bài dò 8/11 cho thấy chưa đóng hẳn: «Huỷ khoản thu» vẫn một người làm, ghi ngay (ADR-0115 điều 3). Hai phương án cho chủ: (a) đặc tả ngắn + ADR thêm bước duyệt hai người cho «Huỷ khoản thu» theo khuôn hoàn cọc — việc lớn, khó kịp 30/11; (b) người kiểm độc lập liệt kê phần còn hở, chủ gia hạn có lý do, làm (a) sau. Khuyến nghị: (b) trước 30/11, (a) thành ADR lượt riêng tháng 12.

**4.3 Hai ô quyền chưa có route (`task.progress`, `dispatch.guides.view`).** Khuyến nghị: bỏ khỏi bảng quyền (`src/shared/permissions.ts`) cùng các bài ghim, vì chưa có route nào dùng; là việc quyền nên cần người kiểm độc lập. Nếu chủ muốn giữ cho tính năng sau thì gia hạn có lý do.

**4.4 Diễn tập khôi phục (HC-5.19, hạn 31/12).** Chủ đã dời sang 30/11; không thuộc đường găng 1/12 nhưng nhiều quyết định cũ đặt điều kiện «chỉ phát hành sau diễn tập».

## Phần VIII — Đợt 5: ADR lượt B (Q-06, G-03(b), N2)

**Chi tiết thi công viết 2026-11-10** sau khi ADR-0191, ADR-0192, ADR-0193 được duyệt (9/11). Chủ duyệt 10/11 (xem dòng Trạng thái đầu tệp). Ba đoạn 5.1–5.3 dưới đây là phạm vi đã duyệt, giữ nguyên; phần chi tiết theo sau. Người thi công đọc ADR của việc mình trước khi làm.

Đợt 5 tách hai nhánh: **5A** (ADR-0191, ADR-0192, không migration, phát hành được ngay) và **5B** (ADR-0193, có migration, chờ chủ chọn phát hành trước hay sau diễn tập). Lý do tách: `npm run trien-khai` áp mọi migration chưa áp, nên migration của 5B một khi đã vào `main` sẽ đi theo bất kỳ lần triển khai nào.


**5.1 Q-06.** Sửa ADR-0071 điều 1f. Tài khoản có mã «xem mọi khách» (rút từ bảng quyền như ADR-0090: hôm nay là các mã có `contact.view = any`) do người không giữ `admin.manage` tạo thì máy chủ không trả PIN đầu; Quản trị hoặc Toàn quyền bấm «Đặt lại PIN» rồi giao tận tay. Không migration. Bài: sửa `src/modules/accounts/hanh-chinh-nhan-su.test.ts`; Nhân sự tạo tài xế vẫn nhận PIN. Việc lớn (quyền tài khoản).

**5.2 G-03(b).** Ngoại lệ có tên với ADR-0035 Đ3. Khuyến nghị: `sessionStorage`, chỉ ghi lúc mất phiên (móc trong `goLogin` của `web/api.ts`), khoá gắn mã nhân viên, khôi phục một lần khi đúng người, không quá 30 phút và đơn chưa bị sửa ở nơi khác; xoá khi khôi phục, khi lưu, khi đăng xuất, khi bảo trì; `initShell` xoá khoá của người khác hoặc quá hạn; không đặt việc xoá vào `xoaKhungNho`. Với Đối tác, nếu đơn đã tạo xong mà lời gọi gửi mới hết phiên thì bản chụp ghi mã đơn và chuyển tới trang đơn, không mở lại form (tránh đơn trùng). Chưa kiểm: iPhone tắt hẳn ứng dụng có làm mất bản chụp không. Trần gói: sự kiện hết phiên +38 byte, cộng G-03(a) là vượt 5 byte — ADR chọn cách móc 0 byte hoặc chủ duyệt nới trần.

**5.3 N2 — công tắc giờ đón cho Đối tác.** Sửa ADR-0154 Đ1.2, Đ1.3. Với nhân viên văn phòng giờ đón vốn không bắt buộc; chỉ đơn Đối tác bị bắt (luật `canChotGioCuaNguoiLap`, cờ chụp ở yêu cầu kiểm vé). Công tắc nằm ở `orders` (bảng chỉ-thêm theo khuôn bảng công tắc ẩn khách, mặc định Bật = hành vi hôm nay, ô `settings.ops`, nút trên trang Tôi cạnh «Ẩn thông tin khách»). Hai câu cho chủ, khuyến nghị an toàn: (i) khi Tắt, đơn Đối tác vẫn qua văn phòng xét nhưng không bị chặn vì thiếu giờ; (ii) đơn mà ngày đón đã nằm trong hạn chốt và chưa có giờ thì không xác nhận thẳng (coi như dưới hạn chốt — đóng luôn lỗ có sẵn ADR-0154 Đ1.7). Điều phối không đổi: chặng chưa giờ vẫn không xếp được xe, đã có nhắc vàng `CHUA_CO_GIO` và bộ lọc «Chưa chốt giờ». Đường lách «xác nhận khi chưa giờ rồi điền giờ sát giờ chạy» đã bị chặn ở sáu cửa (`duoiMocKhiSua`), không cần vá thêm. Luật kiểm `R-ORD-17w` sẽ báo liên tục khi Tắt: sửa trong cùng đợt.

### Ràng buộc riêng của Đợt 5 và Đợt 6 (cộng thêm Global Constraints ở đầu tệp)

- Mọi ràng buộc ở mục «Global Constraints» và Phần X của kế hoạch mẹ áp nguyên vẹn (ngôn ngữ, bảng tham chiếu ADR-0167, tiền chỉ tính ở máy chủ, không xoá cứng, kiến trúc phân hệ, `h()`, ô gõ 16px, AI không push / không nhập `main` / không triển khai / không tạo kho R2).
- Số migration, số ADR, số phiên bản lấy **lúc làm**: số lớn nhất trên `main` + 1 sau khi liệt kê mọi nhánh chưa gộp (`git ls-tree --name-only <nhánh> migrations/ docs/adr/`). Hôm soạn: migration lớn nhất `0156`, ADR lớn nhất `0195`, production `2.89`.
- Trần gói trang Đơn hàng `TRAN_ORDERS` trong `src/goi-trang-nhe.test.ts` (hôm soạn `111_168`). ADR-0192 cho nới **tối đa 100 byte, đúng số đo**, chỉ khi cách 0 byte không làm được; việc khác không được nới.
- Câu báo là hằng ở đúng một nơi; bài kiểm khẳng định MÃ lỗi, chỉ bài của chính hằng mới so nguyên câu.
- Chữ mới trên giao diện: tra `docs/BANG-THAM-CHIEU.md`; chưa có thì thêm vào tệp bảng (`src/shared/bang-tham-chieu*.ts`, chỉ sửa bằng công cụ sửa tệp) với đúng chữ ADR đã duyệt, rồi `npm run tham-chieu`.
- Việc lớn (cả bốn nhánh đều là việc lớn): cuối nhánh giao `nguoi-kiem-doc-lap` đọc cả nhánh; chỉ báo chủ «đạt» theo báo cáo đó cộng kết quả kiểm.
- Lời duyệt, khoá «Cho phép, có ghi lý do» và dòng «Sửa đổi» của ADR cũ chỉ ghi khi chủ đã nói; tệp ADR, `docs/quyen-hoan.json` sửa bằng công cụ sửa tệp.

### Câu hỏi chủ (gom một lần, không chặn việc khác)

Hai câu dưới chỉ chặn **nhánh 5B**. Nhánh 5A và việc soạn ADR lượt C (6.0) làm ngay, không chờ.

1. **Công tắc giờ đón (ADR-0193) lên Nền tảng lúc nào?** ADR này cần một bảng mới trong cơ sở dữ liệu, mà Nền tảng chưa từng thử dựng lại dữ liệu từ bản sao lưu (diễn tập khôi phục, hẹn 30/11).
   - (a) **Khuyến nghị:** đợi sau buổi diễn tập. Mã làm xong trước, để sẵn trên bản sửa riêng 5B, chưa nhập vào bản chính.
   - (b) Lên ngay cùng Đợt 5. Bảng mới chỉ thêm, mặc định giữ đúng hành vi hôm nay.
   Hết giờ không trả lời thì theo (a).
2. **Đơn sát ngày đón mà chưa có giờ: xét lượt nào?** Câu (ii) của ADR-0193 chặn xác nhận khi lượt đón chưa có giờ mà ngày đón đã vào hạn chốt. Chữ ADR («chặng có Đón mà chưa có giờ», «mọi đơn có đón mà chưa có giờ») đọc sát là mọi lượt, nhưng chưa nói rõ chiều về.
   - (a) **Khuyến nghị (an toàn, đúng chữ ADR):** xét **mọi lượt còn mở**, kể cả chiều về. Chặt hơn: đơn có chiều về chưa biết giờ mà ngày về đã vào hạn chốt thì phải điền giờ trước.
   - (b) Chỉ xét lượt đầu của mỗi dịch vụ, cùng cách đếm với luật «cần chốt giờ» đang chạy. Nhẹ cho văn phòng hơn, nhưng thu hẹp chỗ hở mà ADR định đóng.
   Hết giờ không trả lời thì theo (a).

### Review Focus

1. Hai người dùng chung một iPhone: người A hết phiên giữa lúc lập đơn, người B đăng nhập. B không được thấy chữ của A, và kho trình duyệt không còn bản chụp của A. Bài nằm ở Task 5A.2 (luật dọn) và Task 5A.4 (kịch bản Chrome).
2. Đối tác bấm Gửi đơn đúng lúc phiên hết: lời gọi lưu đã thành công, lời gọi gửi nhận 401. Đăng nhập lại phải về trang đơn đã tạo, không mở lại form, không sinh đơn trùng. Bài ở Task 5A.3.
3. Nhân sự làm lách luật: tạo tài khoản Tài xế (nhận PIN), sau đó gán thêm vai Bán hàng. Máy phải trả 403, vai giữ nguyên. Bài ở Task 5A.1.
4. Toàn quyền tắt công tắc giờ đón trong lúc một yêu cầu xác nhận đang chờ. Cờ «cần chốt giờ» đã chụp lúc Gửi đơn phải giữ nguyên, bảng Còn vé vẫn đòi giờ cho yêu cầu đó. Bài ở Task 5B.2.
5. Đối tác chọn «Công ty thu, chuyển khoản» mà không kèm ảnh, hoặc kèm tệp sai loại / quá 10 MB. Máy chủ phải từ chối và không ghi khoản thu. Nếu ghi CSDL hỏng sau khi tệp đã lên kho, tệp mồ côi phải vào hàng chờ xoá. Bài ở Task 6A.2.


### Đợt 5A: PIN đầu (ADR-0191) và giữ chữ khi hết phiên (ADR-0192)

Một nhánh `claude/dot-5a-…` cắt từ `main` mới nhất. Không migration. Hai việc không chạm cùng tệp nên có thể giao hai trợ lý song song trong cùng nhánh, miễn là commit riêng.

#### Task 5A.1: Nhân sự tạo tài khoản xem mọi khách thì không nhận PIN; không gán thêm vai xem mọi khách

**Files:**
- Create: `src/shared/xem-moi-khach.ts` (hàm thuần), `src/shared/xem-moi-khach.test.ts`
- Modify: `src/modules/accounts/index.ts` (hai chỗ trả `{ staff, pin }` của `POST /api/staff`, quanh hai dòng `satisfies StaffWithPinResponse`; route `PUT /api/staff/:id/roles`; dòng nhật ký tạo tài khoản), `src/shared/contracts.ts` (`StaffWithPinResponse`), `src/shared/roles.ts` (`roleAssignmentProblem`, chỉ khi đặt luật chặn ở đó), giao diện màn Quản lý tài khoản (tệp `web/` đang đọc phản hồi tạo tài khoản, tìm bằng `grep -rn "StaffWithPinResponse\|\.pin\b" web/`)
- Test: `src/modules/accounts/hanh-chinh-nhan-su.test.ts` (sửa), `src/shared/xem-moi-khach.test.ts`

**Interfaces:**
- Produces: `export function maXemMoiKhach(matrix = MATRIX): PermissionCode[]` trả các mã có `matrix["contact.view"][ma] === "any"`; `export function coXemMoiKhach(perms: readonly PermissionCode[], matrix = MATRIX): boolean`.
- Produces: kiểu mới `TaoTaiKhoanResponse = { staff: StaffAccountDto; pin: string | null; choQuanTriCapPin: boolean }` chỉ cho `POST /api/staff`. `StaffWithPinResponse` giữ `pin: string` cho route đặt lại PIN và các chỗ đang đọc nó (`web/staff.ts` hàm hiện PIN `showSecrets`, `web/sessions.ts`). Cách hiểu ghi lại: ADR-0191 mục 4 nói «đổi `StaffWithPinResponse`». Tách kiểu giữ đúng nghĩa của mục đó (phản hồi tạo tài khoản có thể không mang PIN) mà không làm hỏng đường đặt lại PIN.
- Produces: hằng câu `CAU_CHO_QUAN_TRI_CAP_PIN` (hộp sau khi tạo) và `CAU_VAI_XEM_KHACH_NHO_QUAN_TRI` (403 khi gán vai), mỗi hằng một nơi, chữ đúng như ADR-0191 mục 3(a) và mục 5.

- [ ] **Bước 1: Viết bài đỏ.** Tạo `xem-moi-khach.test.ts`:
  - hôm nay `maXemMoiKhach()` gồm đúng `SALES, ACCOUNTING, ADMIN, SUPER_ADMIN`, không có `FIELD`, `PARTNER`, `HR`;
  - bản sao bảng có thêm một mã giả `contact.view = "any"` thì tập có mã đó.

  Sửa `hanh-chinh-nhan-su.test.ts`, mỗi ca một bài:
  - Nhân sự tạo theo vai `SALES_STAFF` ⇒ 201, `pin === null`, `choQuanTriCapPin === true`; đăng nhập tài khoản đó bằng vài PIN thử (`000000`, `123456`) đều 401;
  - Nhân sự tạo theo đường quyền `["SALES"]` ⇒ như trên;
  - Nhân sự tạo `SALES_MANAGER` ⇒ 403 như hôm nay;
  - Nhân sự tạo tài xế công ty ⇒ 201, `pin` là chuỗi 6 số, `choQuanTriCapPin === false`;
  - Toàn quyền tạo `SALES_STAFF` ⇒ có PIN;
  - Quản trị gọi `POST /api/staff/:id/reset-pin` cho tài khoản `pin: null` ⇒ đăng nhập bằng PIN mới được;
  - Nhân sự gọi `PUT /api/staff/:id/roles` thêm `SALES_STAFF` cho tài khoản tài xế ⇒ 403, vai trong CSDL không đổi;
  - Quản trị gán cùng vai ⇒ 200;
  - Nhân sự bỏ bớt vai, hoặc gán vai không xem khách ⇒ 200;
  - nhật ký tạo tài khoản rơi vào mục 1 có hậu tố «— chờ Quản trị cấp PIN» và không chứa số điện thoại.
- [ ] **Bước 2: Chạy, thấy đỏ.** Lệnh: `node --test src/shared/xem-moi-khach.test.ts src/modules/accounts/hanh-chinh-nhan-su.test.ts`. Kết quả mong đợi: các ca mới FAIL.
- [ ] **Bước 3: Viết mã.**
  - Hàm thuần đặt ở `src/shared/xem-moi-khach.ts`.
  - Ở hai đường tạo tài khoản: khi người tạo không giữ `admin.manage` và `coXemMoiKhach(quyền hiệu lực của tài khoản mới)`, máy chủ vẫn sinh PIN ngẫu nhiên và ghi như cũ, nhưng phản hồi `pin: null, choQuanTriCapPin: true`.
  - Quyền hiệu lực tính bằng `effectivePermissions`; không suy từ tên vai.
  - Chặn gán vai: so quyền hiệu lực trước và sau; chặn khi trước không có mã xem mọi khách mà sau có, và người gọi không giữ `admin.manage`. Luật đặt **ở route `PUT /api/staff/:id/roles`**, không đặt trong `roleAssignmentProblem`. Lý do: `POST /api/staff` cũng gọi hàm đó với `currentRoles: []`, nên đặt luật ở đó sẽ chặn Nhân sự tạo tài khoản Bán hàng, trái ADR-0191 mục 1.
  - Không thêm route, không thêm ô quyền.
- [ ] **Bước 4: Giao diện.** Phản hồi `pin === null` thì thay hộp «PIN của tài khoản mới» bằng `CAU_CHO_QUAN_TRI_CAP_PIN`. Hộp gán vai của Quản trị thêm một dòng nhắc theo ADR-0191 mục 3, «Rủi ro còn lại». Chữ chưa có trong bảng tham chiếu thì thêm vào bảng.
- [ ] **Bước 5: Chạy lại, thấy xanh.** Chạy lệnh ở bước 2 rồi `npm run typecheck`. Kết quả mong đợi: PASS và 0 lỗi.
- [ ] **Bước 6: Sổ hàng rào.** Đề xuất (chủ duyệt mới ghi) một dòng ở `docs/SO-HANG-RAO.md` cho bài canh tập «xem mọi khách» rút từ bảng quyền, kèm ngày quan sát chặn thật: sửa cố ý thì đỏ, rồi hoàn nguyên.
- [ ] **Bước 7: Commit.** Tiêu đề: «ADR-0191: tài khoản xem mọi khách do Nhân sự tạo thì PIN đầu do Quản trị cấp».

#### Task 5A.2: Luật thuần của bản chụp form đơn

**Files:**
- Create: `src/shared/nhap-tam-don.ts`, `src/shared/nhap-tam-don.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const TIEN_TO_NHAP_TAM = "td-nhap-don:";                     // khoá = tiền tố + mã nhân viên (ADR-0192 mục 3)
  export const khoaNhapTam = (staffId: string): string => TIEN_TO_NHAP_TAM + staffId;
  export const HAN_NHAP_TAM_MS = 30 * 60 * 1000;
  export type BanChup =
    | { loai: "form"; staffId: string; at: number; orderId: string | null; updatedAt: string | null; o: Record<string, unknown> }
    | { loai: "da-tao"; staffId: string; at: number; orderId: string };
  export function docBanChup(raw: string | null): BanChup | null;            // JSON hỏng / thiếu trường ⇒ null
  export function quyetKhoiPhuc(b: BanChup | null, staffId: string, bayGio: number, orderIdTrang: string | null, updatedAtMayChu: string | null):
    { lam: "dien"; o: Record<string, unknown> } | { lam: "chuyen"; orderId: string } | { lam: "bo" };
  export function nenXoaKhiMoTrang(b: BanChup | null, staffId: string, bayGio: number): boolean;
  ```
  `orderIdTrang` là đơn form đang mở (null = form lập đơn mới). Bản chụp `form` chỉ điền khi `b.orderId === orderIdTrang`, để bản chụp của đơn A không điền vào form đơn B. Khoá theo đúng chữ ADR-0192 mục 3. Bản chụp vẫn mang `staffId` ở trong giá trị để `quyetKhoiPhuc` so lại. `initShell` duyệt mọi khoá có tiền tố `TIEN_TO_NHAP_TAM` và xoá khoá nào `nenXoaKhiMoTrang` trả true.

- [ ] **Bước 1: Viết bài đỏ.**
  - `quyetKhoiPhuc`:
    - cùng người, 29 phút, đơn mới (`orderId null`) ⇒ `dien`;
    - đúng 30 phút ⇒ `bo` (quá hạn tính từ ≥ 30 phút);
    - khác người ⇒ `bo`;
    - đang sửa đơn, `updatedAt` khớp ⇒ `dien`; lệch ⇒ `bo`;
    - bản chụp của đơn A, form đang mở đơn B ⇒ `bo`; bản chụp đơn mới, form đang sửa đơn A ⇒ `bo`;
    - `loai: "da-tao"` cùng người trong hạn ⇒ `chuyen` với đúng `orderId`;
    - `null` ⇒ `bo`.
  - `nenXoaKhiMoTrang`: khác người ⇒ true; quá hạn ⇒ true; cùng người trong hạn ⇒ false.
  - `docBanChup('{')` ⇒ null; thiếu `staffId` ⇒ null.
- [ ] **Bước 2: Chạy, thấy đỏ.** Lệnh: `node --test src/shared/nhap-tam-don.test.ts`. Kết quả mong đợi: FAIL, vì tệp chưa có.
- [ ] **Bước 3: Viết hàm thuần cho bài xanh.** Tệp này không đụng `sessionStorage`.
- [ ] **Bước 4: Chạy lại, thấy xanh.** Lệnh như bước 2. Kết quả mong đợi: PASS.
- [ ] **Bước 5: Commit.** Tiêu đề: «ADR-0192: luật thuần của bản chụp form đơn khi hết phiên».

#### Task 5A.3: Móc chụp, khôi phục, dọn vào trang

**Files:**
- Modify: `web/order-form.ts` (chụp, khôi phục, xoá khi lưu thành công, biến mã đơn vừa tạo), `web/shell.ts` (`initShell` dọn; `logout` xoá), `web/maintenance-screen.ts` (xoá khi màn bảo trì chặn)
- Không sửa: `web/api.ts` (`goLogin`) và `web/khung-nho.ts` (`xoaKhungNho`), trừ khi phải dùng phương án (b) ở bước 1
- Test: `src/shared/nhap-tam-don-noi-day.test.ts` (bài đọc mã nguồn, theo kiểu các bài `*-noi-day.test.ts` có sẵn)

**Interfaces:**
- Consumes: mọi thứ Task 5A.2 tạo ra; `SESSION_ENDED_KEY` từ `src/shared/session-ended.ts`.

- [ ] **Bước 1: Chọn cách móc, đo trần gói trước.** `goLogin` hôm nay ghi `SESSION_ENDED_KEY` vào `sessionStorage` (khi lời gọi `/api/auth/session-ended` thành công) **trước** `location.replace`. Trang form tự nghe `pagehide`: nếu lúc đó `sessionStorage.getItem(SESSION_ENDED_KEY) !== null` thì ghi bản chụp. Phần **móc** này không thêm byte nào vào `web/api.ts`.
  - Nhưng phần **dọn** (ADR mục 5: `initShell`, `logout`) nằm ở `web/shell.ts`, mà gói trang Đơn hàng (`web/orders.ts`) import `./shell`. Vì vậy gói Đơn hàng vẫn tăng; tiền lệ ở chú thích `src/goi-trang-nhe.test.ts` là 138 byte cho một lần thêm vào shell. Phần dọn phải viết gọn nhất có thể (một vòng duyệt khoá theo tiền tố, so `staffId` và giờ ngay trong vòng), rồi `npm run build:web` và đo **tổng** số byte gói Đơn hàng tăng thêm.
  - Tổng ≤ 100 byte: nới `TRAN_ORDERS` đúng số đo theo ADR-0192 mục 7(b), ghi lý do ở chú thích trần và ở commit.
  - Tổng > 100 byte: dừng, báo người điều phối để hỏi chủ. Phương án sẽ đưa chủ: dời phần dọn sang trang đăng nhập (`web/login.ts`, không thuộc gói Đơn hàng). Lúc đăng nhập thành công, xoá mọi khoá của người khác hoặc quá hạn. Cách này lệch chữ ADR mục 5 nên cần chủ đồng ý.
  - Hạn chế của cách này: lời gọi `session-ended` hỏng (mất mạng) thì không chụp. Hậu quả chỉ là không khôi phục được, không lộ gì. Ghi điều này vào nhật ký thi công.
  - Nếu `pagehide` không chạy trước `replace` trên Safari thì móc trong `goLogin`. Byte của phần móc cộng vào tổng ở trên, cùng trần 100 byte.
- [ ] **Bước 2: Viết bài đọc mã đỏ.**
  - `xoaKhungNho` không chứa `TIEN_TO_NHAP_TAM`;
  - `goLogin` vẫn gọi `xoaKhungNho`;
  - `logout` và `maintenance-screen.ts` xoá mọi khoá có `TIEN_TO_NHAP_TAM`;
  - `initShell` gọi `nenXoaKhiMoTrang`;
  - `order-form.ts` gọi `quyetKhoiPhuc` và xoá khoá sau khi lưu thành công;
  - không tệp `web/` nào ghi khoá `TIEN_TO_NHAP_TAM` vào `localStorage`.
- [ ] **Bước 3: Chạy, thấy đỏ.** Lệnh: `node --test src/shared/nhap-tam-don-noi-day.test.ts`. Kết quả mong đợi: FAIL.
- [ ] **Bước 4: Viết mã.**
  - Bản chụp lấy giá trị các ô bằng chính hàm dựng thân lưu nháp của form; không tự liệt kê ô lại.
  - Khôi phục dùng chính đường nạp đơn vào form có sẵn.
  - Đối tác: ngay sau khi lời gọi lưu thành công và trước lời gọi gửi, gán biến trang `donVuaTao = id`. Gửi xong (thành công, hoặc hỏng vì lý do khác 401 và đã rẽ sang nhánh «gửi hỏng») thì gán lại `null`. Trong `pagehide`, nếu `donVuaTao !== null` thì ghi `{ loai: "da-tao", … }`, không ghi giá trị ô.
  - Khi khôi phục ra `chuyen`, điều hướng tới trang đơn như nhánh «gửi hỏng» có sẵn.
  - Mọi lời gọi `sessionStorage` bọc `try/catch`. Bị chặn thì bỏ qua, không bao giờ cản việc đăng nhập.
- [ ] **Bước 5: Chạy lại, thấy xanh.** Lệnh: `node --test src/shared/nhap-tam-don-noi-day.test.ts src/goi-trang-nhe.test.ts && npm run typecheck`. Kết quả mong đợi: PASS và 0 lỗi; trần gói nới đúng số đo (≤ 100 byte) hoặc giữ nguyên.
- [ ] **Bước 6: Commit.** Tiêu đề: «ADR-0192: giữ chữ đã gõ ở form đơn khi hết phiên (sessionStorage, 30 phút, một lần)».

#### Task 5A.4: Kiểm cuối nhánh 5A và giao chủ

- [ ] Kịch bản Chrome mới ở `docs/evidence/2026-11-10-dot-5a/kich-ban/`, ảnh 390 và 1280:
  1. Nhân sự tạo tài khoản Bán hàng, màn báo nhờ Quản trị cấp PIN.
  2. Quản trị bấm «Đặt lại PIN».
  3. Gõ form đơn, xoá cookie phiên bằng CDP, bấm lưu, đăng nhập lại cùng người: chữ còn.
  4. Đăng nhập người khác: form trống, `sessionStorage` không còn khoá.
  5. Đối tác gửi đơn, phiên hết đúng ở bước gửi: về trang đơn, danh sách đơn không có đơn trùng.
- [ ] `npm test` (thoát 0), `npm run typecheck` (0 lỗi), `npm run test:e2e` (vì chạm API tạo tài khoản).
- [ ] Mục nhật ký thay đổi trong `src/shared/changelog.ts`, số bản kế tiếp lúc nhập, lời thường. Ví dụ: «Nhân sự tạo tài khoản bán hàng thì Quản trị cấp PIN đầu», «Hết hạn đăng nhập giữa lúc lập đơn: đăng nhập lại là chữ đã gõ còn nguyên».
- [ ] Giao `nguoi-kiem-doc-lap` đọc cả nhánh. Chỉ báo «đạt» khi người kiểm ĐẠT.
- [ ] Khi đạt, chủ được đề xuất ghi dòng Trạng thái cho ADR-0071 (trỏ ADR-0191) và ADR-0035 (trỏ ADR-0192); chủ duyệt rồi mới ghi. Đưa chủ lệnh nhập có rào ở Phần X mục 6 của kế hoạch mẹ.
- [ ] Ghi vào nhật ký thi công: iPhone tắt hẳn Nền tảng có làm mất `sessionStorage` không. Thử trên iPhone thật nếu chủ thử được; chưa thử thì ghi «chưa kiểm».

### Đợt 5B: công tắc giờ đón cho đơn Đối tác (ADR-0193)

Nhánh riêng `claude/dot-5b-…`. Làm mã ngay; **không đưa lệnh nhập** cho tới khi chủ trả lời câu hỏi 1. Câu (ii) làm theo câu trả lời của câu hỏi 2; hết giờ thì theo (a): mọi lượt còn mở.

#### Task 5B.1: Bảng chính sách và route công tắc

**Files:**
- Create: `migrations/<số kế tiếp>_cong_tac_gio_don_doi_tac.sql`, `src/modules/orders/gio-don-cai-dat.ts` (đọc / ghi dòng hiện hành), `src/migrations-cong-tac-gio-don.test.ts`, `src/modules/orders/gio-don-cai-dat-route.test.ts`
- Modify: `src/modules/orders/index.ts` (GET và POST `/api/cai-dat/bat-buoc-gio-don`, cạnh khối `/api/cai-dat/an-thong-tin-khach`), `docs/data-dictionary.json` + `npm run dict`, `src/architecture.test.ts` (nếu bảng mới cần khai chủ), `web/account.ts` + tệp web mới `web/gio-don-cai-dat.ts` (nút cạnh «Ẩn thông tin khách»)

**Interfaces:**
- Produces: bảng `ord_pickup_time_policy` (tên đề xuất, theo khuôn `ord_partner_customer_policy` ở `migrations/0133_chot_gio_va_an_thong_tin_khach.sql`): `id`, `required INTEGER NOT NULL CHECK (required IN (0,1))`, `valid_from_at`, `created_at`, `created_by`, `updated_at`, `updated_by` (đủ cột như khuôn `0133`); trigger chặn UPDATE và DELETE; một dòng gieo `required = 1`.
- Produces: `export async function docBatBuocGioDon(db: D1Database, luc?: string): Promise<boolean>` (dòng mới nhất có `valid_from_at <= luc`; không có dòng thì `true`); `export function lenhGhiBatBuocGioDon(db, { bat, at, by }): D1PreparedStatement[]` (dòng mới + nhật ký, một lô).

- [ ] **Bước 1: Viết bài đỏ.**
  - Migration: bảng có, dòng gieo `required = 1`, UPDATE và DELETE bị trigger chặn.
  - Route:
    - Quản trị POST ⇒ 403;
    - Bán hàng POST ⇒ 403;
    - Toàn quyền POST `{ bat: false }` ⇒ 200, có một dòng nhật ký, GET trả `bat: false`;
    - gửi đúng trạng thái đang có ⇒ 200, không ghi gì;
    - thiếu `Origin` ⇒ 403;
    - thua mốc ⇒ 409 `stale`.

  Bộ bài theo `src/modules/orders/an-khach-route.test.ts`.
- [ ] **Bước 2: Chạy, thấy đỏ.**
- [ ] **Bước 3: Viết mã.**
  - Migration mới, đặt số sau khi liệt kê mọi nhánh.
  - Hàm đọc / ghi; route theo khuôn ẩn khách (cổng `orders` cho GET, cổng admin + ô `settings.ops` cho POST).
  - Nút trên trang Tôi chỉ hiện khi `can(staff, "settings.ops")`. Tên nút theo ADR-0193 mục 7, phương án (1): «Tắt bắt buộc giờ đón» / «Bật bắt buộc giờ đón», nhãn «Bắt buộc giờ đón cho đơn đối tác»; thêm vào bảng tham chiếu.
  - Tệp web mới thì khai ở script `build:web` và `PAGES` nếu là trang (đây chỉ là mảnh của trang Tôi nên thường không cần).
- [ ] **Bước 4: Chạy lại, thấy xanh; chạy `npm run typecheck`.**
- [ ] **Bước 5: Commit.** Tiêu đề: «ADR-0193: bảng chính sách và nút công tắc bắt buộc giờ đón (mặc định Bật)».

#### Task 5B.2: Công tắc vào luật nhánh xác nhận, câu (i)

**Files:**
- Modify: `src/modules/orders/xac-nhan-chung.ts` (`canChotGioCuaNguoiLap` và chỗ gọi trong khối xác nhận của chi tiết đơn), `src/modules/orders/xac-nhan-route.ts` (route `POST /api/orders/:id/gui-xac-nhan`, chỗ gọi `canChotGioCuaNguoiLap`), nơi dựng khối xác nhận của chi tiết đơn (đọc công tắc trước, truyền vào)
- Test: `src/modules/orders/gui-don-chot-gio.test.ts`, `src/modules/orders/con-ve-chot-gio.test.ts` (sửa hoặc thêm ca), bài thuần mới cạnh `xac-nhan-chung`

**Interfaces:**
- Consumes: `docBatBuocGioDon` (Task 5B.1).
- Giữ nguyên `canChotGioCuaNguoiLap(nguoiLap, services)`. Hôm nay hàm này là nguồn **duy nhất** đưa đơn Đối tác chưa giờ vào nhánh A (`xac-nhan-route.ts`: `if (canXN.can || canChot)`; `xac-nhan-chung.ts`: khối `canXN` của chi tiết đơn). Đổi tên ý nghĩa thành «đi nhánh A vì thiếu giờ», **không** phụ thuộc công tắc.
- Produces: `export const coChotGio = (diNhanhAViThieuGio: boolean, batBuoc: boolean): boolean => diNhanhAViThieuGio && batBuoc`. Giá trị này đi vào `canChotGio` của `moYeuCau` (cờ `pickup_time_required`) và quyết định có thêm `"CHOT_GIO"` vào `vi` hay không. Không được thêm tham số công tắc vào `canChotGioCuaNguoiLap`: làm vậy thì Tắt sẽ đẩy đơn sang nhánh B (tự xác nhận), tức phương án khác của câu (i), không phải phương án đã duyệt.

- [ ] **Bước 1: Viết bài đỏ (bảng ca).**
  - Bật hoặc Tắt × đơn có Đón mà lượt đầu chưa giờ / đã có giờ / Không đón × người lập là Đối tác / văn phòng.
  - Kết quả cần đúng:
    - Bật: Đối tác, chưa giờ ⇒ nhánh A, cờ = 1;
    - Tắt: Đối tác, chưa giờ ⇒ **vẫn nhánh A**, cờ = 0, Còn vé không 409 `pickup_time_required`;
    - văn phòng: không đổi.
  - Chụp tại mốc: Gửi đơn khi Bật, Toàn quyền tắt, Còn vé vẫn 409 vì cờ đã chụp.
  - Tắt: chi tiết đơn không hiện lý do `CHOT_GIO`.
- [ ] **Bước 2: Chạy, thấy đỏ.**
- [ ] **Bước 3: Viết mã.**
  - Ở route Gửi đơn: điều kiện vào nhánh A vẫn là `canXN.can || canChot`, giữ nguyên. Đọc công tắc **một lần mỗi request**, tính `coChotGio(canChot, batBuoc)`, rồi dùng nó cho `canChotGio` của `moYeuCau` và cho việc thêm `"CHOT_GIO"` vào `vi`.
  - Ở khối xác nhận của chi tiết đơn (`xac-nhan-chung.ts`): `canXN` vẫn dùng `canChotGioCuaNguoiLap` (quyết định nút «Gửi đơn» hay «Xác nhận»). Lý do hiển thị cho yêu cầu đang mở lấy từ cờ đã chụp, qua `viCuaYeuCau`; `tinhCanXacNhan` không bao giờ trả `CHOT_GIO`. Vì vậy chỗ này **không cần đọc công tắc**.
  - Cách hiểu ghi lại (lệch chữ ADR-0193 mục 1 «cả hai nơi phải nhận giá trị công tắc»): chỉ route Gửi đơn đọc công tắc. Hai nơi vẫn «nói cùng một điều», vì nhánh A không phụ thuộc công tắc và lý do lấy từ cờ đã chụp. Người kiểm cuối nhánh xác nhận lại điều này; ghi vào trang báo chủ.
  - Kiểm `moYeuCau` nhận `vi` rỗng (Tắt, dịch vụ không cần xác nhận, chỉ vào nhánh A vì thiếu giờ). Khi `vi` rỗng, dòng nhật ký hôm nay thành «Gửi kiểm vé · » (cụm lý do trống, `xac-nhan-route.ts` chỗ dựng chi tiết nhật ký): sửa để không còn dấu «·» thừa, và thêm bài cho ca này. Nếu `moYeuCau` từ chối `vi` rỗng thì dừng và báo người điều phối, đừng tự thêm lý do mới.
- [ ] **Bước 4: Chạy lại, thấy xanh; chạy `npm run typecheck`.**
- [ ] **Bước 5: Commit.** Tiêu đề: «ADR-0193 câu (i): Tắt công tắc thì đơn Đối tác chưa giờ vẫn qua văn phòng nhưng không bị chặn vì thiếu giờ».

#### Task 5B.3: Câu (ii): chặn xác nhận khi lượt đón chưa giờ đã vào hạn chốt

**Files:**
- Modify: `src/shared/moc-toi-thieu.ts` (hàm thuần mới; **không** đổi `kiemMocDat`, `duoiMocKhiSua`), `src/modules/orders/chang-hanh-khach-repo.ts` (câu `ORDER_CONFIRM` thêm một vế `NOT EXISTS` dùng lại ngưỡng `?5` đã có; không thêm tham số), `src/modules/orders/xac-nhan-route.ts` (kiểm trước lô ở cửa Còn vé), `src/modules/orders/repository.ts` (chỗ gọi `orderConfirm`), nơi dịch kết quả lô xác nhận ra câu báo (`dichLoiXacNhan` / `chanDoanXacNhan` ở `xac-nhan-chung.ts`)
- Test: `src/shared/moc-toi-thieu.test.ts` (thêm ca), bài khoá hai phía hàm thuần ↔ SQL (theo cặp `kiemMocDat` / SQL có sẵn), bài route của các cửa xác nhận

**Interfaces:**
- Produces: `export function changChuaGioVaoHanChot(chang: { pickupDate: string | null; pickupTime: string | null }, bayGioMs: number, phut: number): boolean`. Đầu vào thêm `departDate: string | null` (ngày đi của dịch vụ). Ngày dùng để xét là `pickupDate ?? departDate`, cùng luật với câu `legFillDateOnConfirm` chạy trong lô xác nhận (điền ngày đón trống bằng ngày đi trước khi `ORDER_CONFIRM` chạy). Kết quả là true khi `pickupTime === null && ngay !== null && \`${ngay} 00:00\` < nguongMocVn(bayGioMs, phut)`. Hàm thuần so **cùng một chuỗi** với SQL, để hai phía không lệch nhau dù `nguongMocVn` làm tròn lên phút. Cách hiểu ghi lại: ADR viết «bây giờ ≥ 00:00 ngày đón − hạn chốt». Quy ước «<» có sẵn của cổng hạn chốt chỉ khác ADR đúng ở khoảnh khắc 23:00:00.000 (lúc đó chưa chặn, một mili giây sau thì chặn).
- Produces: hằng câu `CAU_CHUA_GIO_SAT_NGAY` = «Lượt đón ngày ‹ngày› chưa có giờ mà đã sát giờ đón — điền giờ đón trước khi xác nhận.»; mã lỗi `chua_gio_sat_ngay` (409).
- Lượt bị xét: theo câu hỏi 2.
  - (a) mặc định: mọi lượt còn mở (`closed_at IS NULL`) của đơn.
  - (b): chỉ lượt đầu mỗi dịch vụ. Trong SQL dùng đúng thứ tự `ORDER BY (direction <> 'OUT'), (pickup_date IS NULL), pickup_date, (pickup_time IS NULL), pickup_time, id LIMIT 1` như luật kiểm `R-ORD-17w` ở `scripts/audit-checks.mjs`, lọc `closed_at IS NULL`; trong mã dùng `changDauCuaDichVu`.

- [ ] **Bước 1: Viết bài đỏ, với hạn chốt 60 phút, ngày đón 2026-11-12, giờ VN:**
  - 11/11 lúc 22:00 ⇒ false (xác nhận được);
  - 11/11 lúc 22:59:00 ⇒ false;
  - 11/11 lúc 22:59:30 ⇒ false;
  - 11/11 lúc 23:00:00.000 ⇒ false (quy ước «<», ghi trong chú thích hàm);
  - 11/11 lúc 23:00:01 ⇒ true;
  - 11/11 lúc 23:30 ⇒ true;
  - 12/11 lúc 08:00 ⇒ true;
  - lượt có giờ ⇒ false;
  - lượt không có ngày, dịch vụ đi 12/11, lúc 11/11 23:30 ⇒ true (lấy ngày đi); lượt và dịch vụ đều không có ngày ⇒ false.

  Thêm các bài sau:
  - Bài khoá: `kiemMocDat` với lượt chưa giờ vẫn trả `KHONG_GIO`.
  - Bài khoá hai phía: cùng bộ ca chạy qua hàm thuần và qua câu `ORDER_CONFIRM` trên D1 tạm cho cùng kết quả.
  - Bài route: cửa `/status` và cửa Còn vé đều trả 409 `chua_gio_sat_ngay`, đơn giữ `draft`. Điền giờ rồi xác nhận lại thì đi cổng hạn chốt như thường.
  - Theo câu hỏi 2: với (a), lượt chiều về chưa giờ trong hạn chốt cũng chặn; với (b), không chặn. Lượt đã đóng (`closed_at` có giá trị) không bao giờ chặn.
  - Bài khoá hai phía phải có cả các ca có giây ở trên.
- [ ] **Bước 2: Chạy, thấy đỏ.**
- [ ] **Bước 3: Viết mã.**
  - **Kiểm trước khi dựng lô, ở mọi cửa xác nhận.** Ruling R6 (chú thích ở `xac-nhan-route.ts`, cửa Còn vé): `db.batch` không hoàn tác khi `ORDER_CONFIRM` đổi 0 dòng. Các câu đổi ngày, đổi giờ, điền ngày chạy trước nó vẫn ghi. Vì vậy mỗi cửa (`/status`, nhánh B của Gửi đơn, Còn vé) phải chạy hàm thuần trên **trạng thái sau lệnh**: ngày đi mới, giờ đón mới người xét vừa điền, ngày đón trống thay bằng ngày đi. Có lượt chạm luật thì trả 409 `chua_gio_sat_ngay` **trước** khi dựng lô, giống cách đoạn R6 đang kiểm `confirmGaps`.
  - Vế SQL mới là lớp chặn cuối, giống hệt hàm thuần: so `pickup_date || ' 00:00' < ?5` (ngưỡng `nguongMocVn` đã truyền cho cổng hạn chốt). Câu `legFillDateOnConfirm` đứng trước trong lô nên SQL thấy ngày đã điền; hàm thuần dùng `pickupDate ?? departDate` nên hai phía cùng kết quả.
  - Lô xác nhận không đổi dòng nào (bị đua) thì `chanDoanXacNhan` phân biệt lý do bằng hàm thuần, để báo đúng câu.
- [ ] **Bước 4: Chạy lại, thấy xanh; chạy `npm run typecheck`.**
- [ ] **Bước 5: Commit.** Tiêu đề: «ADR-0193 câu (ii): lượt đón chưa giờ đã vào hạn chốt thì phải điền giờ trước khi xác nhận».

#### Task 5B.4: Sửa luật kiểm R-ORD-17w

**Files:**
- Modify: `scripts/audit-checks.mjs` (khối `R-ORD-17w`), `src/audit-invariants.test.ts` (bài canh `R-ORD-17w`)

- [ ] **Bước 1: Viết bài đỏ.** Đơn Đối tác xác nhận khi công tắc **Tắt**, lượt đầu chưa giờ ⇒ không đếm. Cùng đơn ấy xác nhận khi **Bật** ⇒ vẫn đếm. Các ca cũ giữ nguyên.
- [ ] **Bước 2: Chạy, thấy đỏ.** Lệnh: `node --test src/audit-invariants.test.ts`.
- [ ] **Bước 3: Sửa câu SQL.** Không đếm khi dòng chính sách hiệu lực tại `o.confirmed_at` (dòng mới nhất có `valid_from_at <= o.confirmed_at`) có `required = 0`. Không có dòng nào (đơn xác nhận trước ngày gieo) thì coi là Bật, vẫn đếm như hôm nay, khớp `docBatBuocGioDon`. Thêm ca bài cho đơn xác nhận trước ngày gieo. Giữ mức `warn`.
- [ ] **Bước 4: Chạy lại, thấy xanh.**
- [ ] **Bước 5: Commit.** Tiêu đề: «R-ORD-17w chỉ đếm đơn xác nhận khi công tắc giờ đón Bật (ADR-0193 mục 6)».

#### Task 5B.5: Kiểm cuối nhánh 5B, giữ chờ chủ

- [ ] Kịch bản Chrome, ảnh 390 và 1280:
  - Toàn quyền tắt công tắc ở trang Tôi;
  - Đối tác gửi đơn có đón chưa giờ;
  - văn phòng bấm Còn vé mà không phải điền giờ;
  - trang đơn hiện nhắc vàng «Chưa chốt giờ»;
  - đơn đón hôm nay chưa giờ bị chặn với câu (ii).
- [ ] `npm test`, `npm run typecheck`, `npm run test:e2e` (chạm migration và API).
- [ ] Mục nhật ký thay đổi, số bản kế tiếp lúc nhập.
- [ ] `nguoi-kiem-doc-lap` đọc cả nhánh.
- [ ] Đề xuất cho chủ, chưa ghi: dòng Trạng thái ADR-0154 trỏ về ADR-0193; điền phần «Điều kiện» của khoá `xay_tren_cho_phep_adr_0193` trong `docs/quyen-hoan.json` theo câu trả lời câu hỏi 1.
- [ ] **Chỉ đưa lệnh nhập khi chủ đã chọn (b), hoặc khi buổi diễn tập khôi phục đã xong theo (a).** Trước đó, nhánh nằm yên và được gộp `main` mới khi cần.

## Phần IX — Đợt 6: ADR lượt C (biên lai, đặt cọc, mặc định thanh toán)

### Phạm vi (đã duyệt 9/11)


**6.1 N1 — biên lai bắt buộc.** Nền tảng đã có bước Đối tác báo chuyển khoản: form «Ghi khoản thu» chọn người thu «Công ty» + Chuyển khoản tạo phiếu thu kèm dấu «đang đối chiếu», chưa tính là tiền đã về công ty. Biên lai bắt buộc ở đúng bước này (khuyến nghị: chỉ khi Đối tác tự báo Công ty thu bằng chuyển khoản; tiền mặt hay «Tôi thu» không đòi); Kế toán xem ảnh tại dòng khoản thu cạnh nút «Xác nhận đã nhận»; cách ghi nhận tiền không đổi. Theo khuôn tệp kèm ADR-0144: bảng chỉ-thêm mới, kho R2 riêng (chủ tạo bằng một lệnh; cổng kiểm kho của `trien-khai` phải biết kho mới), khoá ngẫu nhiên, không lưu tên gốc, giới hạn loại và cỡ, ảnh thu nhỏ trên máy, tải qua Worker có nhật ký trước, ô quyền xem mới (Kế toán, Toàn quyền, chính Đối tác ghi phiếu). Ảnh HEIC, PDF không xoá được thông tin ẩn — ADR nói thẳng. Hạn lưu: khuyến nghị cùng thời hạn sổ tiền, Toàn quyền gỡ ảnh gửi nhầm bằng một lệnh có nhật ký. Migration mới khi chưa diễn tập khôi phục: **xây trên lỗ đang hở: HC-5.19**; chạm gián tiếp TNV-G1 nếu đơn bị huỷ sau đó.

**6.2 N6 — «Khách hàng đặt cọc cho đối tác».** Tính năng hiện tên «Khách đặt cọc trước» (ADR-0159), ẩn khi chọn Trả sau và máy chủ chặn (409 `tra_sau_khong_nhan_coc`). ADR-0183 (chưa duyệt) đã đề xuất tên khác («Khách đặt cọc cho đại lý») và mở cọc cho Trả sau: phải sửa ADR-0183 theo tên chủ chọn, không để hai tên. Không cần migration: đổi chữ hiển thị (KHÔNG đổi chuỗi ghi chú «Khách đặt cọc trước» đang làm dấu nhận diện trong CSDL), bỏ ẩn và bỏ chặn theo Trả sau, thêm câu «cọc ở tay Đối tác, không làm giảm nợ với Công ty». Câu cho chủ (khuyến nghị an toàn): chặn huỷ đơn trả sau còn cọc chưa nộp tới khi Kế toán xử lý; biên nhận giữ «Khách đã trả trước» ở lượt này. **Xây trên lỗ đang hở: TNV-G1** (đơn huỷ có cọc đi luồng cọc đơn huỷ). Tổ hợp Trả sau × cọc × huỷ chưa từng chạy: bài mới bắt buộc.

**6.3 N3 — mặc định Trả sau hay Thanh toán ngay.** Gác cho tới khi chủ gỡ lời cấm Trả sau (lời cấm là luật vận hành ở `docs/HANDOFF-N1.md`, không có công tắc trong mã; khi chưa có đối tác nào có hạn mức thì cài đặt không có tác dụng). Thiết kế đã dò: bảng chỉ-thêm theo khuôn công tắc kênh thu, thẻ trên màn Cấp độ đại lý, mặc định chỉ áp ở trình duyệt cho đơn mới, máy chủ vẫn mặc định thanh toán ngay khi thiếu khoá.

### Chi tiết thi công (viết 2026-11-10; các việc 6A, 6B chỉ giao sau khi ADR lượt C được duyệt)


#### Task 6.0: Soạn ADR lượt C và trình chủ (phiên soạn, không thi công)

**Files:**
- Create: `docs/adr/ADR-<số>-bien-lai-chuyen-khoan-bat-buoc.md` (N1), `docs/adr/ADR-<số+1>-o-coc-cua-khach-cho-don-tra-sau.md` (N6), `docs/superpowers/specs/2026-11-xx-trang-ghep-adr-luot-c.md`, `docs/superpowers/specs/2026-11-xx-trinh-chu-adr-luot-c.md`

Hôm soạn số ADR kế tiếp là 0196. Hai ADR là hai quyết định chạm tiền hoặc dữ liệu, dưới trần 3 của một lượt duyệt. N3 (mặc định cách thanh toán) **không** vào lượt này: gác tới khi chủ gỡ lời cấm Trả sau.

- [ ] **Bước 1: Đọc lại hiện trạng trên `main`.**
  - Cho N1: `POST /api/orders/:id/payments` ở `src/modules/billing/index.ts`; dấu `DECLARED` ở `src/modules/billing/service.ts`; khuôn tệp `src/shared/tep-dinh-kem.ts` (base64 trong thân JSON, `TOI_DA_BYTE` 10 MB, loại jpg / png / heic / pdf, `taoKhoaNgauNhien`), `src/modules/ve-dien-tu/kho-tep.ts`, hàng chờ xoá tệp của `feedback`; cổng kho 1e ở `scripts/release-lib.mjs` (`NHAN_KHO`, `HAU_QUA_THIEU_KHO`).
  - Cho N6: `src/modules/orders/tra-sau-cong.ts` (409 `tra_sau_khong_nhan_coc`); chỗ ẩn ô cọc khi Trả sau ở `web/order-form.ts`; `src/shared/dat-coc-truoc.ts`; luồng cọc khi huỷ (ADR-0089); ADR-0183 Đ2.
- [ ] **Bước 2: Soạn ADR N1 theo khuyến nghị của Phần IX kế hoạch mẹ.** Các điểm cần có:
  - Bắt buộc ảnh chỉ khi tài khoản Đối tác (không giữ quyền Kế toán) ghi khoản thu với người thu «Công ty» và cách «Chuyển khoản». Thiếu ảnh thì 400 `bien_lai_required`, không ghi gì.
  - Bảng chỉ-thêm `bil_receipt_proof` thuộc `billing`; kho R2 mới binding `BIEN_LAI`, tên `tourdao-sales-bien-lai`; tiền tố khoá `bln`; không lưu tên tệp gốc.
  - Ô quyền mới `payment.proof.view`: Kế toán, Toàn quyền, và chính Đối tác ghi phiếu.
  - Route xem tải qua Worker, ghi nhật ký **trước**.
  - Hạn lưu: cùng hạn sổ tiền; Toàn quyền gỡ ảnh gửi nhầm bằng lệnh có nhật ký và có lý do.
  - Nói thẳng: HEIC và PDF không xoá được thông tin ẩn.
  - **Xây trên lỗ đang hở: HC-5.19** (migration khi chưa diễn tập), kèm khoá xin phép theo khuôn ADR-0193.
- [ ] **Bước 3: Soạn ADR N6.** ADR-0183 còn `proposed`, nên sửa thẳng Đ2 của nó cho khớp (một tên, một luật), không cần dòng «Sửa đổi»; nếu ADR-0183 được duyệt trước thì mới chuyển sang dòng «Sửa đổi». ADR N6 có:
  - Tên ô do chủ chọn một. Lời yêu cầu 8/11 viết «Khách hàng đặt cọc cho đối tác», còn ADR-0183 viết «Khách đặt cọc cho đại lý». Bảng từ chỉ cho một tên, nên đưa 2–3 tên, khuyến nghị theo từ bảng tham chiếu đang dùng cho bên đặt.
  - Bỏ ẩn ô và bỏ chặn 409 khi Trả sau.
  - Câu «cọc ở tay Đối tác, không làm giảm nợ với Công ty».
  - **Không đổi** chuỗi ghi chú «Khách đặt cọc trước» trong `billing/coc-repo.ts`: chuỗi đó là dấu nhận diện lưu trong CSDL.
  - Câu cho chủ về huỷ đơn Trả sau còn cọc. Phải nói rõ «cọc chưa nộp» là trạng thái dữ liệu nào (khoản cọc ghi lúc xác nhận theo ADR-0159, chưa có khoản nộp về Công ty), và «Kế toán xử lý» là lệnh nào. Lưu ý: luồng hoàn cọc ADR-0089 (`/coc/duyet`, `/coc/chi`) chỉ chạy trên đơn **đã huỷ**, nên «chặn huỷ tới khi Kế toán xử lý» sẽ bế tắc nếu không có lệnh xử lý trên đơn chưa huỷ. Người soạn dò mã, đưa 2–3 phương án khả thi, khuyến nghị phương án an toàn mà không bế tắc. Biên nhận giữ «Khách đã trả trước».
  - **Xây trên lỗ đang hở: TNV-G1** (hạn 31/12), kèm khoá xin phép.
- [ ] **Bước 4: Trang ghép theo `CLAUDE.md` §9.** Gồm:
  - bảng `bil_payment_receipt` / `bil_receipt_recon` / `bil_receipt_proof` / `orders.declared_deposit` chứa loại thực thể nào;
  - từng dòng bản đồ quyền chạm các bảng đó;
  - cổng nào canh cửa nào, kể cả chỗ giao diện ẩn hoặc hiện ô cọc, nút xem ảnh.
- [ ] **Bước 5: Người kiểm độc lập kiểm một vòng hai ADR và trang ghép.** Chỉ sửa lỗi sai sự thật.
- [ ] **Bước 6: Trình chủ bằng một trang lời thường**, tối đa ba câu chọn, mỗi câu có khuyến nghị đặt đầu:
  1. biên lai bắt buộc khi nào;
  2. tên ô cọc;
  3. chặn huỷ đơn Trả sau còn cọc.

  Câu duyệt mẫu ghi kèm «Cho phép, có ghi lý do» cho HC-5.19 và TNV-G1, và điều kiện phát hành trước hay sau diễn tập.
- [ ] **Bước 7: Commit trên nhánh, đưa chủ lệnh nhập (chỉ tài liệu, không cần triển khai).**

#### Task 6A.1–6A.4: Biên lai bắt buộc (sau khi ADR N1 được duyệt)

Nhánh `claude/dot-6a-…`. Viết theo khuyến nghị; chủ chọn khác ở bước 6 của Task 6.0 thì sửa trước khi giao.

**6A.1 Bảng, kho, cổng triển khai.**
- Theo đúng khuôn kho tệp có sẵn (ADR-0144, `src/modules/feedback/kho-tep.ts`; khuôn gốc `src/modules/parties/kho-tep.ts`): **ghi D1 trước, R2 sau**. Lỗi kho không ném; dòng ở lại trạng thái «tải dở dang» hoặc «chờ xoá» để thấy được và chạy lại.
- Migration `bil_receipt_proof`: `id`, `receipt_id` (khoá ngoại tới `bil_payment_receipt`), rồi **chép đúng bộ cột và ràng buộc của `fbk_attachment` ở migration `0124`**: `storage_key` (CHECK mẫu `bln/` + 32 ký tự hex, như `fbk/`), `content_kind`, `byte_size`, `content_hash`, `created_at`, `created_by`, `updated_at`, `updated_by`, `stored_at` (rỗng = tải dở dang), `purged_at`, `purge_reason`, `r2_deleted_at` (có `purged_at` mà rỗng cột này = chờ xoá), cùng các CHECK nối `purged_at` / `purge_reason` / `content_hash`. Người gỡ ảnh ghi ở nhật ký và `updated_by`, như khuôn. Không có cột tên tệp gốc. Trigger chặn DELETE và chỉ cho UPDATE các cột trạng thái tệp, theo khuôn `fbk_attachment`.
- `wrangler.jsonc` thêm `{ "binding": "BIEN_LAI", "bucket_name": "tourdao-sales-bien-lai" }`. `NHAN_KHO.BIEN_LAI = "kho biên lai chuyển khoản"`, `HAU_QUA_THIEU_KHO.BIEN_LAI = "ảnh biên lai không gửi hay mở được"`.
- `taoKhoaNgauNhien` nhận thêm tiền tố `"bln"`. Khai binding `BIEN_LAI: R2Bucket` trong kiểu `Env` (`npm run types` hoặc khai tay như ba kho cũ).
- `data-dictionary.json` + `npm run dict`.
- Bài:
  - migration (trigger);
  - bài kho trong `scripts/` có sẵn cho cổng 1e (thiếu kho `BIEN_LAI` thì cổng dừng);
  - bài kiến trúc: chỉ `billing` ghi bảng mới;
  - bài «chỉ `billing` chạm kho `BIEN_LAI`» theo `src/kho-tep-ho-tro.test.ts`;
  - luật kiểm mới `R-BIL-<số>` ở `scripts/audit-checks.mjs` theo `R-FBK-1` (dòng tải dở dang hoặc chờ xoá quá hạn), có bài canh ở `src/audit-invariants.test.ts`.

**6A.2 Ghi khoản thu kèm ảnh.**
- `POST /api/orders/:id/payments` nhận thêm `bienLai` (base64). Giới hạn cỡ thân yêu cầu theo khuôn `POST /api/feedback`; kiểm tệp bằng `kiemTepCuaTin` / `nhanLoaiTep` của `src/shared/tep-dinh-kem.ts`.
- Luật bắt buộc: hàm thuần `canBienLai(...)` ở `src/shared/`. Điều kiện «khoản tự báo, chờ đối chiếu» phải **dùng chung** với điều kiện đang quyết định ghi dấu `DECLARED` ở `src/modules/billing/service.ts`: tách điều kiện đó ra hàm thuần, rồi dùng ở cả hai chỗ, không viết điều kiện thứ hai. Phạm vi ai bị đòi ảnh (chỉ Đối tác, hay mọi khoản mang dấu `DECLARED`, kể cả bên đặt và quầy nhà cung cấp) theo ADR N1 đã duyệt.
- Thứ tự xử lý: kiểm tệp; một `db.batch` gồm phiếu thu, dấu `DECLARED`, dòng `bil_receipt_proof` (`stored_at` rỗng), nhật ký (không có ảnh, không có số tài khoản); sau đó đặt đối tượng R2 rồi đánh `stored_at`. Đặt R2 hỏng thì dòng ở lại «tải dở dang»: Kế toán thấy phiếu có ghi chú «ảnh chưa tải xong». Có route xem và chạy lại hàng chờ, theo `GET /api/feedback/tep-cho-xoa` và `POST /api/feedback/tep-cho-xoa/chay-lai`.
- Bài:
  - thiếu ảnh ⇒ 400 `bien_lai_required`, không có phiếu;
  - sai loại ⇒ 415 với `CAU_SAI_LOAI`;
  - quá cỡ ⇒ 413 (mã lỗi đúng như `kiemTepCuaTin`);
  - tiền mặt hoặc «Tôi thu» không cần ảnh;
  - Kế toán ghi không cần ảnh;
  - đặt R2 giả lỗi ⇒ phiếu thu vẫn ghi, dòng ảnh ở «tải dở dang», luật kiểm mới đếm được, chạy lại thì xong;
  - DTO mặc định của khoản thu không chứa khoá R2.

**6A.3 Xem và gỡ ảnh.**
- Ô `payment.proof.view` trong `MATRIX`; cột Đối tác là `own`, nghĩa là phiếu do chính mình ghi.
- `GET /api/orders/:id/payments/:receiptId/bien-lai`: ghi nhật ký trước rồi mới trả tệp; thêm ca vào `src/giay-to-khong-lo-so.test.ts` nếu bài đó phủ route tệp.
- `POST …/bien-lai/go`: chỉ Toàn quyền, bắt buộc lý do, có nhật ký; ghi `purged_at` + `purge_reason` = `GO_TEP` trong lô D1, rồi xoá đối tượng R2 và đánh `r2_deleted_at` (hỏng thì ở lại «chờ xoá»).
- Bài:
  - Bán hàng 403;
  - Đối tác khác 403;
  - Đối tác chính chủ 200;
  - Kế toán 200;
  - nhật ký có trước phản hồi;
  - gỡ hai lần ⇒ 409.

**6A.4 Giao diện và kiểm cuối.**
- Form «Ghi khoản thu» (`web/order.ts`): chọn «Công ty» + «Chuyển khoản» thì hiện ô chọn ảnh (bắt buộc). Ảnh thu nhỏ trên máy trước khi gửi theo khuôn `web/ho-tro-tep.ts`.
- Dòng khoản thu của Kế toán có nút «Xem biên lai» cạnh «Xác nhận đã nhận».
- Kiểm gói Đơn hàng: tệp `web/order.ts` là gói trang chi tiết, không phải `web/orders.ts`; vẫn chạy `src/goi-trang-nhe.test.ts`.
- Kịch bản Chrome `docs/evidence/2026-10-08-qr-thanh-toan/kich-ban/qr-smoke.mjs` sửa theo; thêm ca biên lai; ảnh 390 và 1280.
- `npm test`, `npm run typecheck`, `npm run test:e2e`, `nguoi-kiem-doc-lap`.
- Trước khi triển khai: đưa chủ lệnh tạo kho, chạy ở thư mục `tourdao-sales`. Lệnh có thể hỏi sửa cấu hình, trả lời «n».

  ```bash
  npx wrangler r2 bucket create tourdao-sales-bien-lai
  ```

  Phát hành theo điều kiện chủ ghi ở khoá HC-5.19.

#### Task 6B.1–6B.3: Ô cọc của khách cho đơn Trả sau (sau khi ADR N6 được duyệt)

Nhánh `claude/dot-6b-…`, không migration. Tên ô viết `‹TÊN Ô›` dưới đây, thay bằng tên chủ chọn.

**6B.1 Máy chủ.**
- Bỏ chặn 409 `tra_sau_khong_nhan_coc` ở `src/modules/orders/tra-sau-cong.ts`.
- Luật huỷ đơn Trả sau còn cọc: làm **đúng phương án chủ chọn ở ADR N6** (Task 6.0 bước 3). Bước này không được giao khi ADR chưa nói rõ trạng thái «cọc chưa nộp» và lệnh xử lý.
- Bài đỏ trước, tổ hợp chưa từng chạy:
  - Trả sau × có cọc × xác nhận: khoản cọc ghi như ADR-0159, công nợ với Công ty không giảm;
  - Trả sau × có cọc × huỷ: theo phương án ADR N6, kèm bài chứng minh không bế tắc (sau lệnh xử lý thì huỷ được, hoặc huỷ xong luồng ADR-0089 chạy được);
  - Thanh toán ngay × có cọc: không đổi.
- Bài nằm ở `src/tra-sau-xac-nhan.test.ts`, `src/tra-sau-duong-ghi.test.ts`, `src/modules/billing/dat-coc-route.test.ts`, và e2e `tests/e2e/dat-coc.mjs`.

**6B.2 Chữ và giao diện.**
- Đổi chữ hiển thị «Khách đặt cọc trước» thành `‹TÊN Ô›` ở mọi chỗ người dùng thấy: `src/shared/dat-coc-truoc.ts` (hằng `NHAN_DAT_COC`, `NHAN_DAT_COC_CHO`), `src/modules/billing/dat-coc.ts`, `public/order-form.html`, `web/order-form.ts`, `web/order.ts`, `src/shared/huong-dan-doi-tac.ts`, `xac-nhan-chung.ts`, bảng tham chiếu. Trước khi sửa, chạy `grep -rn "đặt cọc trước" src web public` để không sót.
- **Không đổi** hằng ghi chú `GHI_CHU_KHOAN_LOI_KHAI` trong `src/modules/billing/coc-repo.ts` (dấu nhận diện lưu trong CSDL). Thêm bài khoá chuỗi đó không đổi.
- Bỏ ẩn ô khi chọn Trả sau. Thêm câu «cọc ở tay Đối tác, không làm giảm nợ với Công ty» (chữ theo ADR).
- ADR-0183 đã được sửa ở Task 6.0; không sửa thêm ở đây.

**6B.3 Kiểm cuối.**
- Kịch bản Chrome `docs/evidence/2026-11-02-dat-coc/kich-ban/dat-coc-smoke.mjs` và `docs/evidence/2026-11-05-tra-sau/kich-ban/tra-sau-smoke.mjs`, ảnh 390 và 1280.
- `npm test`, `npm run typecheck`, `npm run test:e2e`, `nguoi-kiem-doc-lap` (việc tiền).
- Mục nhật ký thay đổi; lệnh nhập có rào.

#### Việc 6.3 — N3: gác

Không giao. Mở lại khi chủ gỡ lời cấm cấp hạn mức Trả sau thật (luật vận hành ở `docs/HANDOFF-N1.md`). Thiết kế đã dò nằm ở Phần IX mục 6.3 của kế hoạch mẹ.

### Thứ tự giao và nhập

1. **Ngay:** nhánh 5A (thi công) và Task 6.0 (soạn ADR lượt C) chạy song song, vì không chạm cùng tệp. Nhánh 5B thi công song song với 5A, nhưng **không chạm** `web/order-form.ts` hay `web/shell.ts`.
2. Nhập 5A, rồi triển khai một lần.
3. Chủ trả lời câu hỏi 1 (hoặc buổi diễn tập xong) ⇒ gộp `main` mới vào 5B, đánh lại số bản, chạy lại bộ kiểm, nhập, triển khai.
4. ADR lượt C được duyệt ⇒ 6A và 6B thi công song song. Hai nhánh cùng chạm `web/order.ts`, nên 6B cắt nhánh sau khi 6A đã nhập, hoặc gộp lại trước khi nhập. Mỗi nhánh nhập riêng; nhánh nhập sau gộp `main` và đánh lại số bản.
5. Hạn sổ: HC-5.19 và TNV-G1 hạn 31/12; HC-4.2 hạn 30/11, chủ hẹn quyết khoảng 20/11. Nếu HC-4.2 chưa xử lý trước 0 giờ 1/12 thì `npm test` đỏ, mọi lệnh nhập và triển khai dừng. Đợt 5, 6 nên nhập trước mốc đó.


## Phần X — Kiểm, xác thực, triển khai (áp cho mọi đợt)

Mỗi đợt đi đúng một vòng dưới đây. Quy trình đầy đủ của chủ nằm ở `docs/QUY-TRINH-PHAT-HANH.md` (chín bước); phần này chỉ ghi điều riêng của kế hoạch.

1. **Chỗ làm.** Mỗi đợt một nhánh trong worktree riêng (`.claude/worktrees/<tên>`), cắt từ `main` mới nhất. Trước khi đặt số migration, ADR: liệt kê mọi nhánh, worktree chưa gộp (`git ls-tree --name-only <nhánh> migrations/` và `docs/adr/`).
2. **Trong lúc làm.** Chỉ chạy `node --test <tệp liên quan>` và `npm run typecheck`. Không chạy hai máy chủ thử cùng lúc (gây «database is locked»).
3. **Cuối đợt, mỗi thứ chạy một lần:** `npm test` (thoát 0); `npm run typecheck` (0 lỗi; lệnh này không phủ `src/**/*.test.ts`, `scripts/`, `tests/` nên tự đọc lại các tệp đó); `npm run test:e2e` khi đợt chạm API hoặc migration (cần mạng, tắt `wrangler dev` mồ côi trước); kịch bản Chrome của mọi màn bị đổi, có ảnh 390 và 1280 (cần biến `AXE_JS`, thiếu thì bước kiểm màu bị bỏ qua).
4. **Kiểm độc lập.** Đợt có việc lớn: giao `nguoi-kiem-doc-lap` đọc mã thật của cả nhánh, tự chạy lại lệnh, báo ĐẠT hoặc KHÔNG ĐẠT kèm tệp:dòng. Chỉ báo chủ «đạt» dựa trên báo cáo đó cộng kết quả kiểm. Người kiểm của đợt trước không chặn việc soạn đợt sau.
5. **Mục nhật ký thay đổi** (`src/shared/changelog.ts`, bước A.0) viết trên nhánh, số phiên bản là số kế tiếp lúc nhập, chữ theo bảng tham chiếu.
6. **Chủ nhập vào bản chính** bằng lệnh có rào dưới đây (thay `<NHÁNH>`; đứng ở thư mục gốc `tourdao-sales`). Lệnh tự từ chối khi còn một lệnh nhập hay lệnh triển khai khác đang chạy, hoặc khi bản chính vừa có thay đổi mà nhánh chưa gộp:

   ```bash
   cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales && if pgrep -f 'scripts/day-le[n].mjs' > /dev/null; then echo "CHƯA CHẠY: còn một lệnh nhập khác đang chạy hoặc đang chờ bạn gõ c. Trả lời lệnh đó trước."; elif pgrep -f 'scripts/trien-kha[i].mjs' > /dev/null; then echo "CHƯA CHẠY: lệnh triển khai đang chạy. Chờ nó xong rồi chạy lại khối này."; elif git fetch origin && [ "$(git rev-parse main)" = "$(git rev-parse origin/main)" ] && git merge-base --is-ancestor main <NHÁNH>; then npm run day-len -- <NHÁNH>; else echo "CHƯA CHẠY: bản chính vừa có thay đổi mới. Báo AI gộp lại rồi chạy lại khối này."; fi
   ```

   GitHub kiểm đủ bộ khoảng 6 phút rồi lệnh hỏi «Đẩy lên GitHub? (c/k)». Đỏ cùng một chỗ hai lần thì gõ `d` và báo AI tìm lỗi thật, không chạy lại lần thứ ba.
7. **Chủ triển khai** bằng `npm run trien-khai` (đứng ở thư mục gốc, sau khi `main` máy trùng GitHub). Lệnh làm mọi bước sau A.0: cổng chỉ đọc, kiểm phiên bản, điểm khôi phục, bộ kiểm, migration, `wrangler deploy`, kiểm bất biến bản thật, kiểm phiên bản sau triển khai. Gặp lỗi Cloudflare 7403 ở lời gọi đầu: xem mục «Nếu gặp lỗi Cloudflare 7403» của `docs/QUY-TRINH-PHAT-HANH.md`. Đợt 6 có kho R2 mới: chủ tạo kho trước khi triển khai (AI đưa lệnh; lệnh tạo kho có thể đòi sửa cấu hình — trả lời «n»).
8. **Sau triển khai.** Mở `https://booking.tourdao.vn/api/auth/config` thấy đúng số phiên bản; chủ thử trên iPhone các màn ghi ở cột «Người dùng sẽ thấy» của đợt; AI ghi trạng thái vào `docs/HANDOFF-N1.md` (mục TRẠNG THÁI TRIỂN KHAI) và nhật ký thi công của đợt.

## Phần XI — Kiểm dữ liệu bản thật trước ngày dùng thật

Tám điều kiện dữ liệu của báo cáo rà soát (mục «Dữ liệu phải có trước ngày dùng thật»). Chủ chạy các câu chỉ đọc dưới đây ở thư mục gốc `tourdao-sales`; AI không được chạy lệnh đọc bản thật. Mỗi câu đã chạy thử trên một bản sao CSDL tạm dựng từ migration thật.

| # | Điều kiện | Cách kiểm | Tình trạng hôm soạn |
|---|---|---|---|
| 1 | Mọi tài khoản nội bộ đăng nhập được (bảo mật hai lớp) | Câu 1; dòng `qua_han_dang_bi_chan` là người đang bị chặn đăng nhập, Quản trị bấm «Tắt bảo mật hai lớp» cho họ (mở 24 giờ) | chưa kiểm |
| 2 | Tài khoản Đối tác đều có vai trò đối tác | Chủ đã chạy câu soát, kết quả rỗng | đạt (8/11) |
| 3 | Cấp độ đại lý, gán cấp, mức hoa hồng | Câu 2; `cap_do_dang_bat` và `muc_hoa_hong_con_hieu_luc` phải lớn hơn 0, và ít nhất một trong hai cột gán cấp (`dai_ly_gan_cap_rieng`, `vai_gan_cap`) lớn hơn 0, trước đơn đại lý đầu tiên (Kế toán xác nhận đường gán cấp nào đang dùng) | chưa kiểm |
| 4 | Hồ sơ công ty chủ đủ tên, MST, địa chỉ, «Hotline» | Câu 3 cột `hotline_cong_ty_chu` ≥ 1; tên và MST đã thấy trên trang công khai | một phần |
| 5 | Tài khoản ngân hàng nhận tiền | Câu 3 cột `tai_khoan_ngan_hang_cong_ty_chu` ≥ 1 | chưa kiểm |
| 6 | Chính sách điều phối có bản đang hiệu lực | Câu 3 cột `so_ban_chinh_sach_dieu_phoi` ≥ 1 | chưa kiểm |
| 7 | Xe đủ kiểm định và bảo hiểm | Kiểm bất biến bản thật (bước 7 của Phần X tự chạy); từ bản 2.77 có lối cho xe thiếu giấy tờ vẫn chạy (ADR-0184), nên câu «chưa có mã» của báo cáo đã cũ | chưa kiểm lại |
| 8 | Hạn mức Trả sau | Câu 3 cột `han_muc_tra_sau_con_hieu_luc`; chỉ cần khi gỡ lời cấm Trả sau (quyết định 3) | chưa cần |

Câu 1 — bảo mật hai lớp:

```bash
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT CASE WHEN MAX(COALESCE(s.mfa_grace_until,''), COALESCE(s.mfa_enroll_until,'')) < strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN 'qua_han_dang_bi_chan' ELSE 'con_han_phai_bat_som' END AS tinh_trang, COUNT(*) AS so_tai_khoan FROM staff s WHERE s.active = 1 AND EXISTS (SELECT 1 FROM v_stf_quyen_mo q WHERE q.staff_id = s.id AND q.permission_code NOT IN ('PARTNER','DRIVER_PARTNER')) AND NOT EXISTS (SELECT 1 FROM aut_mfa_factor f WHERE f.staff_id = s.id AND f.valid_to_at IS NULL) GROUP BY 1;"
```

Câu 2 — cấp độ và hoa hồng:

```bash
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT (SELECT COUNT(*) FROM prc_rate_tier WHERE active = 1) AS cap_do_dang_bat, (SELECT COUNT(*) FROM prc_party_tier WHERE voided_at IS NULL AND (valid_to_date IS NULL OR valid_to_date >= date('now','+7 hours'))) AS dai_ly_gan_cap_rieng, (SELECT COUNT(*) FROM prc_role_tier WHERE voided_at IS NULL AND (valid_to_date IS NULL OR valid_to_date >= date('now','+7 hours'))) AS vai_gan_cap, (SELECT COUNT(*) FROM prc_commission_rule WHERE voided_at IS NULL AND (valid_to_date IS NULL OR valid_to_date >= date('now','+7 hours'))) AS muc_hoa_hong_con_hieu_luc;"
```

Câu 3 — công ty chủ, ngân hàng, chính sách điều phối, hạn mức:

```bash
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT (SELECT COUNT(*) FROM pty_contact_point c JOIN v_pty_open_role r ON r.party_id = c.party_id AND r.role_type_code = 'OWNER_COMPANY' WHERE c.label = 'Hotline' AND c.valid_to_date IS NULL) AS hotline_cong_ty_chu, (SELECT COUNT(*) FROM pty_bank_account b JOIN v_pty_open_role r ON r.party_id = b.party_id AND r.role_type_code = 'OWNER_COMPANY' WHERE b.valid_to IS NULL) AS tai_khoan_ngan_hang_cong_ty_chu, (SELECT COUNT(*) FROM vc_dispatch_policy) AS so_ban_chinh_sach_dieu_phoi, (SELECT COUNT(*) FROM bil_credit_limit WHERE valid_to_date IS NULL OR valid_to_date >= date('now','+7 hours')) AS han_muc_tra_sau_con_hieu_luc;"
```

Câu 4 — tác nhân tự động có ghi tên trong nhật ký (ADR-0186 Đ8; chạy sau khi tác vụ đồng bộ danh mục đã chạy ít nhất một lần kể từ 18:28 ngày 8/11). Dòng `THIEU_NGUOI_LAM` là dòng ghi không có người cũng không có tác nhân:

```bash
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT CASE WHEN staff_id IS NOT NULL THEN 'nguoi' WHEN agent_code IS NOT NULL THEN agent_code ELSE 'THIEU_NGUOI_LAM' END AS ai_lam, action, COUNT(*) AS so_dong FROM audit_log WHERE created_at >= '2026-11-08T11:28:00.000Z' GROUP BY 1, 2 ORDER BY 1, 2;"
```

Không dùng `--file` cho các câu này (lỗi xác thực đã gặp); mỗi câu là một lệnh `--command`.

## Phần XII — Kiểm buổi sáng tuần đầu

Người làm việc này do chủ chọn (Phần I điều 2). Màn Góp ý chỉ tài khoản Toàn quyền xem được (ADR-0038). Mỗi sáng, trước giờ nhận đơn:

1. Mở màn Góp ý / Báo lỗi, đọc mục mới từ hôm qua.
2. Ở thư mục gốc `tourdao-sales`, chạy kiểm bất biến bản thật (chỉ đọc). Thoát 0 là sạch; thoát 1 là có vi phạm (chụp đầu ra gửi AI); thoát 2 là **không chạy được**, không phải dữ liệu sạch.

   ```bash
   node scripts/audit-invariants.mjs --db remote
   ```

3. Mở trang tổng quan Worker `tourdao-sales` trên Cloudflare, xem số lỗi của 24 giờ qua; số tăng đột ngột thì chụp gửi AI. Từ bản có Task 1.1, câu lỗi trên màn có kèm mã: người dùng chụp màn là đủ để tra.
4. Mở `https://booking.tourdao.vn/api/auth/config`, thấy đúng số phiên bản đang chạy.

## Phần XIII — Hạn chót

| Lúc | Chuyện gì xảy ra | Cần làm trước |
|---|---|---|
| 0 giờ 1/12 | `npm test` đỏ vì bốn mục hạn 30/11 của `docs/quyen-hoan.json`: TNV-G1, HC-4.2, `task.progress`, `dispatch.guides.view`. Khi đỏ, `day-len` và `trien-khai` đều dừng, kể cả bản sửa gấp. | Đợt 4; chủ quyết từng mục khoảng 20/11: đóng, hoặc gia hạn có ghi lý do. |
| 0 giờ 1/1/2027 | Đỏ vì HC-5.19 (diễn tập khôi phục) và hai ô quyền hoá đơn `invoice.request`, `invoice.issue` (hạn 31/12). | Diễn tập (chủ dời sang 30/11); hai ô hoá đơn: thi hành hoặc gia hạn. |

Mục HC-5.11 (hạn 15/11 trong báo cáo) đã đóng ở bản 2.79 và không còn trong sổ.

## Phần XIV — Ngoài phạm vi

- Các mục «để sau» của báo cáo: Q-01–Q-03, Q-08, G-07, G-08, G-10, G-11, V-02, V-03 (phụ lục 02–04 có khuyến nghị).
- Ghi BACKLOG, không làm ở đây: xác nhận nháp có bên đặt đã ngưng vẫn qua; đơn mới cùng SĐT sau khi ngưng hồ sơ tạo hồ sơ trùng; bài tự quét chữ nút trong kịch bản Chrome (hàng rào mới, cần chủ đồng ý); công tắc chỉ ẩn Hành khách (nếu chủ cần); `web/catalog-kiem-ve.ts` còn dùng `confirm()`; dòng bảng tham chiếu nói Quản lý bán hàng «không đồng bộ Sheet» đã cũ so với ADR-0186; phần tự kết thúc chuyến (Q-05 phương án a).
- Vé Tour Đảo (ADR-0175) có kế hoạch riêng. ADR-0182 (Trả sau theo giá đại lý) chưa duyệt, không thuộc kế hoạch này; ADR-0183 chỉ được chạm ở mục đặt cọc (6.2).
- Gỡ lời cấm cấp hạn mức Trả sau thật: quyết định 3; kế hoạch chỉ lo điều kiện trước.

## Phần XV — Cách thi công

- Phiên này chỉ lập kế hoạch (P15); không thi công, không tự nghiệm thu.
- Mỗi đợt một phiên mới đọc tệp này, dùng superpowers:subagent-driven-development; trợ lý thi công tối thiểu tầm trung; việc lớn có `nguoi-kiem-doc-lap`.
- Thứ tự giao: (1) phiên Đợt 1 ngay khi chủ duyệt; (2) phiên soạn ADR lượt A và lượt B cùng lúc (tệp ADR là tệp luật, chỉ sửa bằng công cụ sửa tệp để chủ được hỏi); (3) phiên Đợt 4 (đưa nhánh TNV-G1 lên `main` mới, người kiểm HC-4.2, bỏ hai ô quyền); (4) phiên Đợt 3 khi có phiếu chữ; (5) phiên thi công Đợt 2, Đợt 5 sau khi ADR được duyệt; (6) Đợt 6 sau cùng. Khoảng 7 lần giao.
- Hai phiên thi công không sửa cùng tệp cùng lúc: Đợt 1 và Đợt 3 cùng chạm `web/order-form.ts`, `src/shared/huong-dan-*.ts` — Đợt 3 cắt nhánh sau khi Đợt 1 đã nhập `main`.
- Chủ chạy `day-len` và `trien-khai` theo Phần X; mỗi lần một lệnh.

## Phụ lục A — Lời chủ nguyên văn

**Yêu cầu 8/11** (chép nguyên văn, kể cả lỗi gõ):

> à thêm cơ chế để khi đại lý thực hiện quét mã QR thanh toán, sẽ có chức năng đính kèm ảnh/file biên lai hoặc ảnh mành ình để làm bằng chứng công việc nha. Đồng thời, (1) Nới điều kiện về việc bắt buộc lượt đưa đón phải có giờ đóng cụ thể, hãy biến đấy là 1 tùy chọn có thể thực hiện việc thiết lập trong bảng điều khiển của Super Admin, (2) Thiết lập tùy chọn trong Super Admin cho phương thức thanh toán mặc định với Đối tác được cấp hạn mức trả sau thành -> Mặc định là Trả sau hoặc Thanh toán luôn (đổi trả trước thành thanh toán ngay) , (3) Áp dụng bộ lọc của trang Tạo đơn mới, áp dụng cho tính năng Nhập lô vé (mục đích là để đồng bộ thị giác và tăng hiệu suất làm việc, tránh nhầm lẫn) (4) Khi vai nội bộ tạo đơn giùm đối tác thì hãy làm luôn việc là truy xuất trong cơ sở dữ liệu để tìm ra số điện thoại của đối tác để dùng cho chức năng "Điền thông tin đối tác"vào ngay ô thông tin khách hàng (để tăng tốc độ đặt đơn trong trường hợp đặt vé cho chính đối tác . (5) Luôn có chức năng Đặt cọc trên hóa đơn được tạo bởi đối tác (gửi cho khách lẻ) và đổi tên thành Khách hàng đặt cọc cho đối tác (Dù đối tác chọn thanh toán công nợ cho Công ty chủ quản là Trả ngay hoặc Trả sau ) (6) : Ẩn Ghi chú Thời gian đón với dịch vụ không có hỗ trợ đưa đón, Ẩn phần điền thông tin hành khách  đối với hóa đơn bán lẻ được tạo bởi vai đối tác

Cách hiểu ghi lại: «Super Admin» = vai Toàn quyền; «giờ đóng» = giờ đón; «ảnh mành ình» = ảnh màn hình; tên chữ mới lấy theo phần trong ngoặc: «Thanh toán ngay».

**Ba câu trả lời 8/11** (hộp hỏi):
- Giờ đón: «Đổi luôn mốc 6 giờ thành 1 giờ (biến thành tuỳ chọn trong Dashboard của Super Admin) . Đơn được phép tiếp tục kể cả khi không có giờ đón (có báo lỗi vàng)»
- Hành khách: «Ẩn/Bật trong bảng điều khiển Super Admin, cho phép đơn tiếp tục. Sau này có thể kích hoạt lại trong bảng điều khiển sau»
- Biên lai QR: «Bắt buộc đính kèm»

**Lượt 1 ngày 8/11** (phương án chủ chọn trong hộp hỏi): T-03 «Soạn ADR chặn»; Q-05 «ADR khoá + tự kết thúc»; R3d «ADR: Quản trị ngưng»; Q-07 «"Nộp về Công ty"», tức câu «Tiền khách ở tay bạn. Hãy nộp về Công ty để mở vé.»

## Phụ lục B — Phiếu chọn chữ (Đợt 3, câu của ADR lượt A)

Mỗi mục: phương án (1) là khuyến nghị. Chủ trả lời một dòng, ví dụ «B-1: 1, B-5: 2, còn lại theo khuyến nghị». Hết giờ thì dùng khuyến nghị (mọi mục ở đây là chữ, đảo ngược được).

- **B-1 (T-02, câu giữ đơn):** (1) «Thiếu mức hoa hồng / người bán cho ‹dịch vụ› — cài mức mới không gỡ được đơn đã xác nhận; Kế toán ghi mức tay cho dòng này.» (2) «… Đơn đã chụp mức lúc xác nhận nên cài thêm mức ở bảng không có tác dụng — Kế toán ghi mức tay cho dòng này.» (3) «… — Kế toán ghi mức tay cho dòng này (mức cài sau chỉ áp cho đơn xác nhận sau).»
- **B-2 (Q-07, câu khoá vé):** (1) câu chủ đã chọn «Tiền khách ở tay bạn. Hãy nộp về Công ty để mở vé.» — dùng nếu bước dò của Task 3.2 không thấy ca sai; (2) câu dự phòng «Vé mở sau khi Công ty ghi nhận bạn đã nộp tiền.»
- **B-3 (V-01):** không cần chọn (chỉ thay «mã này» bằng mã thật).
- **B-4 (G-05, thay «Chưa đặt»):** (1) «Mặc định: không cần kiểm» (2) «Chưa đặt — mặc định không kiểm» (3) «Mặc định».
- **B-5 (G-05, Ngừng bán):** (1) hỏi lại trước khi ngừng: tiêu đề «Ngừng bán ‹tên›?», câu «Người lập đơn không chọn được dịch vụ này nữa, có hiệu lực ngay cho cả công ty. Đơn đã lập không đổi.», hai nút «Ngừng bán» / «Không ngừng»; mở bán lại không hỏi. (2) làm ngay, kèm nút Hoàn tác.
- **B-6 (G-05, câu khi dịch vụ đã ngừng bán):** (1) «Dịch vụ N: dịch vụ ‹mã› đã ngừng bán hoặc không còn trong danh mục — hãy chọn dịch vụ khác.» (2) tách hai câu «…đã ngừng bán — hãy chọn dịch vụ khác.» / «…không còn trong danh mục — hãy chọn dịch vụ khác.» (3) như (1) nhưng dùng tên dịch vụ.
- **B-7 (G-03a, trang đăng nhập):** (1) «Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục.» (2) «Phiên đăng nhập đã hết hạn — đăng nhập lại để tiếp tục.» (3) «Bạn đã bị đăng xuất vì phiên hết hạn. Đăng nhập lại để làm tiếp.»
- **B-8 (T-03, ADR lượt A):** (1) ba câu: «Đơn trả sau đã xác nhận chỉ đổi được sang bên đặt có hạn mức trả sau còn hiệu lực. Nhờ Quản trị hoặc Toàn quyền cấp hạn mức cho bên mới, hoặc giữ bên đặt cũ.» / «Bên đặt mới còn đơn trả sau quá hạn chưa thanh toán nên chưa nhận thêm đơn trả sau.» / «Đơn trả sau đã xác nhận phải có bên đặt là đối tác có hạn mức trả sau — không đổi sang khách lẻ được.» (2) chủ sửa chữ.
- **B-9 (G-06a):** (1) «Có dịch vụ cần kiểm vé, chờ người kiểm vé báo còn vé.» (2) «Có dịch vụ cần người kiểm vé báo còn vé.» (3) «Có vé cần kiểm trước khi xác nhận.»
- **B-10 (G-06b):** (1) giữ «Đang giữ đơn», viết lại câu: «Chưa tới ngày đi (‹ngày›). Từ ngày đi trở đi mới bấm được «Xác nhận khách đã trả đủ».» (2) đổi tiền tố theo nút: «Chưa bấm được «Xác nhận khách đã trả đủ»: …» (3) «Nút «…» đang mờ vì: …»
- **B-11 (G-06c, nút «Duyệt đặt gấp»):** (1) «Ghi đặt gấp» (một tên cho cả ba nơi; chữ chờ «Đang ghi…») (2) «Đặt gấp lượt này» (3) form dùng «Lưu và đặt gấp», nơi khác «Ghi đặt gấp».
- **B-12 (G-06e, danh sách đơn trống):** (1) một câu chung «Chưa có đơn nào ở đây.» (0 byte; khi đang lọc đã có nút «Xoá lọc») (2) hai câu, câu khi chưa lọc «Chưa có đơn nào. Đơn bạn lập hoặc được giao sẽ hiện ở đây.» (vượt trần gói 12 byte, cần duyệt nới trần).
- **B-13 (G-06f):** (1) «Tạo trước 31/10/2026 — không rõ người tạo» (2) «Không rõ ai tạo (tạo trước 31/10/2026)» (3) «Tạo trước 31/10/2026, lúc đó chưa ghi người tạo». Kèm duyệt dòng «Sửa đổi» cho đặc tả 31/10.
- **B-14 (G-06d, tiền ở Trang chủ):** (1) ô số Trang chủ viết số đủ «2.800.000 ₫» (2) đổi mọi chỗ rút gọn thành «2,8 triệu ₫» (3) giữ rút gọn, thêm số đủ ở dòng phụ.
- **B-15 (Q-05, dòng nhắc tài xế, ADR lượt A):** (1) «Chuyến chưa bấm Kết thúc — tên khách đã ẩn. Bấm Kết thúc khi xong hoặc báo văn phòng.» (2) «Đã qua ngày chạy mà chuyến vẫn đang chạy: bấm Kết thúc.»
