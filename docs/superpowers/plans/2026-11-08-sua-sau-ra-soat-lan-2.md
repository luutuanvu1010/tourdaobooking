# Sửa sau rà soát trước ngày dùng thật lần 2, cộng bảy yêu cầu mới: Kế hoạch điều phối và thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Trạng thái:** đề xuất, chờ chủ duyệt (soạn 2026-11-08, phiên lập kế hoạch — phiên này không thi công, P15). Đây là **kế hoạch điều phối**: Đợt 1 có việc chi tiết tới từng bước; Đợt 3 có việc chi tiết nhưng chữ chờ chủ chọn; các đợt cần ADR chỉ ghi phạm vi, điều kiện và chỗ phải kiểm, phần việc chi tiết viết **sau khi** ADR được duyệt (`CLAUDE.md` §9).

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

**5.1 Q-06.** Sửa ADR-0071 điều 1f. Tài khoản có mã «xem mọi khách» (rút từ bảng quyền như ADR-0090: hôm nay là các mã có `contact.view = any`) do người không giữ `admin.manage` tạo thì máy chủ không trả PIN đầu; Quản trị hoặc Toàn quyền bấm «Đặt lại PIN» rồi giao tận tay. Không migration. Bài: sửa `src/modules/accounts/hanh-chinh-nhan-su.test.ts`; Nhân sự tạo tài xế vẫn nhận PIN. Việc lớn (quyền tài khoản).

**5.2 G-03(b).** Ngoại lệ có tên với ADR-0035 Đ3. Khuyến nghị: `sessionStorage`, chỉ ghi lúc mất phiên (móc trong `goLogin` của `web/api.ts`), khoá gắn mã nhân viên, khôi phục một lần khi đúng người, không quá 30 phút và đơn chưa bị sửa ở nơi khác; xoá khi khôi phục, khi lưu, khi đăng xuất, khi bảo trì; `initShell` xoá khoá của người khác hoặc quá hạn; không đặt việc xoá vào `xoaKhungNho`. Với Đối tác, nếu đơn đã tạo xong mà lời gọi gửi mới hết phiên thì bản chụp ghi mã đơn và chuyển tới trang đơn, không mở lại form (tránh đơn trùng). Chưa kiểm: iPhone tắt hẳn ứng dụng có làm mất bản chụp không. Trần gói: sự kiện hết phiên +38 byte, cộng G-03(a) là vượt 5 byte — ADR chọn cách móc 0 byte hoặc chủ duyệt nới trần.

**5.3 N2 — công tắc giờ đón cho Đối tác.** Sửa ADR-0154 Đ1.2, Đ1.3. Với nhân viên văn phòng giờ đón vốn không bắt buộc; chỉ đơn Đối tác bị bắt (luật `canChotGioCuaNguoiLap`, cờ chụp ở yêu cầu kiểm vé). Công tắc nằm ở `orders` (bảng chỉ-thêm theo khuôn bảng công tắc ẩn khách, mặc định Bật = hành vi hôm nay, ô `settings.ops`, nút trên trang Tôi cạnh «Ẩn thông tin khách»). Hai câu cho chủ, khuyến nghị an toàn: (i) khi Tắt, đơn Đối tác vẫn qua văn phòng xét nhưng không bị chặn vì thiếu giờ; (ii) đơn mà ngày đón đã nằm trong hạn chốt và chưa có giờ thì không xác nhận thẳng (coi như dưới hạn chốt — đóng luôn lỗ có sẵn ADR-0154 Đ1.7). Điều phối không đổi: chặng chưa giờ vẫn không xếp được xe, đã có nhắc vàng `CHUA_CO_GIO` và bộ lọc «Chưa chốt giờ». Đường lách «xác nhận khi chưa giờ rồi điền giờ sát giờ chạy» đã bị chặn ở sáu cửa (`duoiMocKhiSua`), không cần vá thêm. Luật kiểm `R-ORD-17w` sẽ báo liên tục khi Tắt: sửa trong cùng đợt.

## Phần IX — Đợt 6: ADR lượt C (biên lai, đặt cọc, mặc định thanh toán)

**6.1 N1 — biên lai bắt buộc.** Nền tảng đã có bước Đối tác báo chuyển khoản: form «Ghi khoản thu» chọn người thu «Công ty» + Chuyển khoản tạo phiếu thu kèm dấu «đang đối chiếu», chưa tính là tiền đã về công ty. Biên lai bắt buộc ở đúng bước này (khuyến nghị: chỉ khi Đối tác tự báo Công ty thu bằng chuyển khoản; tiền mặt hay «Tôi thu» không đòi); Kế toán xem ảnh tại dòng khoản thu cạnh nút «Xác nhận đã nhận»; cách ghi nhận tiền không đổi. Theo khuôn tệp kèm ADR-0144: bảng chỉ-thêm mới, kho R2 riêng (chủ tạo bằng một lệnh; cổng kiểm kho của `trien-khai` phải biết kho mới), khoá ngẫu nhiên, không lưu tên gốc, giới hạn loại và cỡ, ảnh thu nhỏ trên máy, tải qua Worker có nhật ký trước, ô quyền xem mới (Kế toán, Toàn quyền, chính Đối tác ghi phiếu). Ảnh HEIC, PDF không xoá được thông tin ẩn — ADR nói thẳng. Hạn lưu: khuyến nghị cùng thời hạn sổ tiền, Toàn quyền gỡ ảnh gửi nhầm bằng một lệnh có nhật ký. Migration mới khi chưa diễn tập khôi phục: **xây trên lỗ đang hở: HC-5.19**; chạm gián tiếp TNV-G1 nếu đơn bị huỷ sau đó.

**6.2 N6 — «Khách hàng đặt cọc cho đối tác».** Tính năng hiện tên «Khách đặt cọc trước» (ADR-0159), ẩn khi chọn Trả sau và máy chủ chặn (409 `tra_sau_khong_nhan_coc`). ADR-0183 (chưa duyệt) đã đề xuất tên khác («Khách đặt cọc cho đại lý») và mở cọc cho Trả sau: phải sửa ADR-0183 theo tên chủ chọn, không để hai tên. Không cần migration: đổi chữ hiển thị (KHÔNG đổi chuỗi ghi chú «Khách đặt cọc trước» đang làm dấu nhận diện trong CSDL), bỏ ẩn và bỏ chặn theo Trả sau, thêm câu «cọc ở tay Đối tác, không làm giảm nợ với Công ty». Câu cho chủ (khuyến nghị an toàn): chặn huỷ đơn trả sau còn cọc chưa nộp tới khi Kế toán xử lý; biên nhận giữ «Khách đã trả trước» ở lượt này. **Xây trên lỗ đang hở: TNV-G1** (đơn huỷ có cọc đi luồng cọc đơn huỷ). Tổ hợp Trả sau × cọc × huỷ chưa từng chạy: bài mới bắt buộc.

**6.3 N3 — mặc định Trả sau hay Thanh toán ngay.** Gác cho tới khi chủ gỡ lời cấm Trả sau (lời cấm là luật vận hành ở `docs/HANDOFF-N1.md`, không có công tắc trong mã; khi chưa có đối tác nào có hạn mức thì cài đặt không có tác dụng). Thiết kế đã dò: bảng chỉ-thêm theo khuôn công tắc kênh thu, thẻ trên màn Cấp độ đại lý, mặc định chỉ áp ở trình duyệt cho đơn mới, máy chủ vẫn mặc định thanh toán ngay khi thiếu khoá.

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
