# Công tắc «Khách của đối tác trả cho Công ty» và «Trả sau theo dịch vụ»

Trạng thái: **bản soạn 2026-11-06, đã qua một vòng người kiểm độc lập, chờ chủ duyệt.** Quyết định kiến trúc: `docs/adr/ADR-0178-cong-tac-khach-doi-tac-tra-cong-ty-va-tra-sau-theo-dich-vu.md` (proposed). Lệch giữa hai nơi: ADR thắng.

## Lời chủ

Chủ 6/11/2026, nguyên văn: «thêm tùy chọn cho Super Admin để Tắt/mở kênh thu tiền giùm đối tác của công ty chủ quản, tức là các đơn hàng được tạo bởi vai đối tác (bên ngoài) thì chỉ có 1 lựa chọn là người đặt đơn thu tiền, tức khách hàng (lẻ/cuối cùng) thanh toán tiền cho chính đối tác. Khoản thu giùm của công ty chủ quản (Tour đảo) với đối tác sẽ trở thành giá trị 0. Đồng thời, thêm tùy chọn của Super Admin cho phép trả sau/công nợ với một nhóm dịch vụ/dịch vụ cụ thể. Ví dụ: Đơn cho vé tham quan tour đảo không cần trả trước mà vẫn được duyệt (thay vì phải trả trước 100% hoặc đối tác được cấp công nợ/tín dụng)».

Chủ chọn ở hai lượt hộp hỏi cùng ngày (nguyên văn nhãn đã chọn):

| Câu | Chủ chọn |
|---|---|
| Đơn Trả sau nhờ dịch vụ được miễn: trả khi nào, giới hạn ra sao | «Có hạn trả, không hạn mức (Recommended)»: không tính vào hạn mức; trả trong số giờ Toàn quyền đặt cho dịch vụ/nhóm; quá hạn còn nợ thì chặn đơn Trả sau mới và vé chưa mở, giống Trả sau hiện nay |
| Dịch vụ nào được đánh dấu | «Mọi dịch vụ»: kể cả dịch vụ có vé hãng ngoài; máy chỉ hiện cảnh báo, công ty chịu rủi ro mất tiền vé |
| Đơn lập trước lúc tắt công tắc | «Chỉ áp cho đơn lập sau (Recommended)»: máy ghi trạng thái công tắc lên đơn lúc lập |
| Tên công tắc | «Khách của đối tác trả cho Công ty (Recommended)»: Bật = như hôm nay; Tắt = chỉ đối tác thu |
| Ai được nợ theo dịch vụ | «Chỉ đối tác hưởng hoa hồng (Recommended)» |
| Quản trị chuyển dịch vụ vào nhóm đang được đánh dấu | «Có, theo nhóm hiện tại» |
| Tên dấu trên dịch vụ/nhóm | «Trả sau theo dịch vụ (Recommended)» |
| Xây trên ba chỗ đang hở, phát hành khi nào | Chủ sửa trong chat sau hộp hỏi, nguyên văn: «không, câu cuối là cho xây, lên trước diễn tập» |

«Super Admin» trong lời chủ là quyền **Toàn quyền** (`SUPER_ADMIN`) theo bảng từ.

## Hiện trạng (đã đọc mã 6/11, người kiểm đã đối chiếu)

- Đơn Trả trước của đối tác **xác nhận được khi chưa trả tiền**: cổng xác nhận chung chỉ có điều kiện Trả sau (`src/modules/orders/xac-nhan-chung.ts`). Chỗ bị khoá thật là **vé điện tử**: vé chỉ mở khi tiền đã về công ty (`thuDu`, `moVeDuoc`; ADR-0153 Đ3), và tiền đối tác tự ghi «Tôi thu» chưa nộp về công ty không tính (ADR-0159 Đ2 mục 2). Bước «Xong và đủ tiền» cũng đòi thu đủ.
- Ô «Người thu tiền» khi ghi khoản thu có: Công ty, «Tôi thu», «Khách trả cho đại lý ‹tên›», «Khách trả tại quầy ‹tên›» (`src/shared/ben-kia-hien-thi.ts`). Mọi khoản thu sinh dòng *tiền đang giữ hộ*: ai cầm tiền thì nợ Tour Đảo (ADR-0079 điều 3). Khi Công ty thu tiền khách của đơn đại lý thì tới «Xong và đủ tiền» Công ty nợ đại lý hoa hồng; đây là «khoản thu giùm» trong lời chủ.
- Đơn tài khoản Đối tác lập: ô **bên đặt** chỉ bị ép bằng hồ sơ của chính tài khoản khi hồ sơ đó mang vai được hưởng hoa hồng; nếu không, bên đặt là thứ người lập chọn, có thể là khách lẻ (`benDatChoTaiKhoan`, `src/shared/booker.ts`). «Tôi thu» ghi vai `BOOKER` khi hồ sơ người ghi là bên đặt, ngược lại vai `STAFF` (`src/modules/billing/service.ts`, `docLanThu`).
- Trả sau hôm nay: chỉ bên đặt có hạn mức mới chọn được; `lyDoKhongTraSau` (`src/shared/tra-sau.ts`) kiểm «chưa có hạn mức» **trước** «có đơn quá hạn»; kết quả cổng bắt buộc mang hạn mức (giờ trả, ân hạn lấy từ đó); `noCacBenDat` (`src/modules/billing/tra-sau.ts`) cộng mọi đơn `CREDIT` vào một tổng nợ. ADR-0173 Đ1 mục 2: «không cho vượt hạn mức, không có ngoại lệ theo đơn».

## Việc 1 — Công tắc «Khách của đối tác trả cho Công ty»

**Làm gì.**
1. Một công tắc chung cho cả Nền tảng, mặc định **Bật** (giữ đúng như hôm nay). Chỉ Toàn quyền đổi. Mỗi lần đổi thêm một dòng mới (chỉ thêm, không xoá cứng), có nhật ký.
2. Lúc **lập** đơn, kể cả lúc tạo đơn nháp, nếu người lập là tài khoản giữ quyền Đối tác thì máy ghi trạng thái công tắc lúc đó lên đơn. Ghi một lần; CSDL cấm đổi về sau. Đơn nháp tạo lúc Bật mà gửi, xác nhận sau lúc Tắt vẫn mang dấu Bật. Đơn văn phòng lập (kể cả cho bên đặt là đại lý) không có dấu. Đơn «huỷ để lập lại» (ADR-0089) là đơn mới, chụp lúc lập đơn mới.
3. Đơn mang dấu **Tắt**: người thu của mọi khoản khách trả mới **chỉ được là hồ sơ của tài khoản Đối tác đã lập đơn** («người đặt đơn» trong lời chủ). Không dùng ô bên đặt, vì bên đặt có thể là khách lẻ và có thể bị văn phòng đổi sau xác nhận. Vai ghi sổ giữ như hôm nay: `BOOKER` khi hồ sơ người lập là bên đặt, `STAFF` khi không. Máy chủ từ chối mọi người thu khác: Công ty, nhân viên hay hướng dẫn viên tự thu, quầy nhà cung cấp. Tài khoản chưa gắn hồ sơ thì không ghi được khoản thu nào; câu báo nhờ văn phòng gắn hồ sơ.
4. Giao diện của đơn mang dấu Tắt: tài khoản Đối tác thấy một lựa chọn «Tôi thu». Văn phòng thấy một lựa chọn «Khách trả cho đại lý ‹tên›» khi hồ sơ người lập đúng là bên đặt được hưởng (đường lời khai chờ Kế toán của ADR-0132, có sẵn); không thì văn phòng không có lựa chọn nào, và khối ghi khoản thu nói đối tác tự ghi. Biên nhận gửi khách của đơn đó **không hiện mã QR** vào tài khoản công ty.
5. Đối tác nộp tiền về công ty theo đường đã có («Đã nộp về công ty» do Kế toán ghi), vì đó là tiền đối tác trả công ty, không phải khách trả công ty.

**Từng đường ghi tiền** (người kiểm đã grep mọi chỗ chèn `bil_payment_receipt` ở `src`, `migrations`, `scripts`, `tests` ngày 6/11: không có trigger hay cron nào chèn; người thi công quét lại và có bài quét nơi gọi):

| Đường | Ở đơn mang dấu Tắt |
|---|---|
| Ghi khoản thu trước «Xong và đủ tiền» (`POST /api/orders/:id/payments`, `service.ts` → `RECEIPT_BEFORE_DELIVERED`) | Chặn người thu khác hồ sơ người lập |
| Khoản thu kèm bước «Xong và đủ tiền» (`POST /api/orders/:id/delivered`, `RECEIPT_AT_DELIVERY`) | Chặn như trên |
| Khoản thu tự sinh từ «Khách đặt cọc trước» lúc xác nhận (`dat-coc.ts`, `RECEIPT_ON_CONFIRM`) | Người thu luôn là người lập (ADR-0159 Đ1 mục 3) nên hợp lệ; vẫn gọi cùng hàm kiểm **trước** lô, sai thì 409 và đơn không xác nhận, không bao giờ âm thầm bỏ khoản cọc |
| Sửa khoản thu đã ghi, Ghi bù khoản thu (`POST /api/ledger/receipt-replacements`, `thay-lan-thu.ts`), kể cả «Ghi khoản thu đòi được» của phân định (`phan-dinh.ts`, đi qua cùng lô Thay lần thu, người thu Công ty) | Khoản thay thế chặn như trên; «Ghi khoản thu đòi được» vì vậy bị chặn ở đơn Tắt, Kế toán xử lý bằng đường khác |
| Chuyển cọc sang đơn khác (`…/coc/chuyen`, nửa «thu» ở đơn nhận) | Đơn nhận mang dấu Tắt: chỉ qua khi người đang giữ cọc là hồ sơ người lập đơn nhận; không thì 409 có câu rõ. Có chủ ý |
| Đảo khoản thu (`service.ts`, chép người thu của dòng gốc) | Miễn: không tạo người thu mới |
| Khoản hoàn cho khách (`/api/ledger/refunds`), hoàn sau phân định, chi hoàn cọc (`…/coc/chi`) | Miễn: đây là tiền ra, không phải công ty thu tiền khách |
| Mã QR (`GET /api/orders/:id/qr-thanh-toan` ở module `receipt`, và chỗ hiện QR ở `web/`) | Đường đọc, không phải đường ghi: trả «không có QR» cho đơn Tắt; giao diện không hiện |

**Kết quả cần thấy.** Với mọi đơn mang dấu Tắt: tổng các khoản khách trả còn hiệu lực có người thu khác hồ sơ người lập **bằng 0**. Đây là con số «khoản thu giùm = 0» của chủ, và có máy canh (tiêu chí 6).

**Hệ quả chủ cần biết.**
- Đơn Trả trước của đối tác mang dấu Tắt: vé chỉ mở sau khi đối tác đã nộp tiền về công ty và Kế toán ghi nhận, vì «Tôi thu» không mở vé. Muốn mở vé trước thì dùng Việc 2 hoặc hạn mức Trả sau.
- Khách tới cảng mà chưa trả đối tác thì hướng dẫn viên **không ghi thu được** trên Nền tảng cho đơn đó.
- Bật lại công tắc không đổi dấu của đơn đã lập lúc Tắt.

## Việc 2 — «Trả sau theo dịch vụ»

**Làm gì.**
1. Toàn quyền đánh dấu «Trả sau theo dịch vụ» cho **một nhóm dịch vụ** hoặc **một dịch vụ**, kèm thời hạn trả (giờ) và ân hạn (giờ), cùng khuôn số giờ của Trả sau (ADR-0172 Đ3). Bảng chỉ thêm, có hiệu lực theo thời gian, có nhật ký. Mặc định không dịch vụ nào được đánh dấu, nên tính năng không đổi gì cho tới khi Toàn quyền bật.
2. Một dịch vụ có dấu khi có dòng của chính nó, hoặc **nhóm hiện tại** của nó có dòng (chủ chọn «theo nhóm hiện tại»: Quản trị chuyển dịch vụ vào nhóm đang có dấu thì dịch vụ đó có dấu theo). Số giờ lấy của dòng dịch vụ nếu có, không thì của dòng nhóm. Dịch vụ nhập tay (không có mã danh mục, ADR-0061) không bao giờ có dấu.
3. Đánh dấu được **mọi dịch vụ**. Dịch vụ có vé hãng ngoài thì màn đánh dấu hiện cảnh báo rằng vé đã gửi khách không lấy lại được.
4. Một đơn **đủ điều kiện** khi: bên đặt là hồ sơ đang mang loại đối tác được hưởng hoa hồng (cùng nhóm được cấp hạn mức ở ADR-0168 Đ1 mục 2; khách lẻ và hồ sơ nội bộ không được), và **mọi** dịch vụ của đơn đều có dấu. Đơn đủ điều kiện thì ô «Trả sau» hiện ra dù bên đặt không có hạn mức; người lập vẫn tự chọn, mặc định Trả trước.
5. Xác nhận đơn Trả sau đủ điều kiện: **không** kiểm hạn mức, **không** tính vào nợ dùng hạn mức. Vẫn từ chối (mã `co_don_qua_han`, cùng câu hiện có) khi bên đặt có đơn Trả sau **bất kỳ loại nào** đã hết ân hạn còn nợ; phép kiểm quá hạn phải chạy độc lập với việc có hạn mức hay không. Vẫn đi qua câu gác phiên bản của ADR-0168 Đ2 mục 4. Hạn trả = giờ xác nhận + thời hạn trả **nhỏ nhất** trong các dịch vụ của đơn; ân hạn cũng lấy số nhỏ nhất. Loại Trả sau và hai mốc giờ chụp lúc xác nhận; đổi dấu về sau (kể cả Quản trị đổi nhóm) không đổi đơn đã xác nhận.
6. Sau khi xác nhận, đơn này đi đúng luật Trả sau hiện có: mở vé trước khi trả (ADR-0168 Đ3 mục 1), quá hạn thì chặn vé chưa mở và đơn Trả sau mới (ADR-0173 Đ2 mục 3), tin nhắc trước hạn 6 giờ và lúc quá hạn (Đ3 mục 2), hoa hồng sau khi thu đủ (Đ3 mục 1), Quản trị/Toàn quyền nới hạn được (Đ1 mục 3), không ngừng được hồ sơ còn nợ (Đ3 mục 5), không huỷ được khi đã mở vé còn nợ (ADR-0168 Đ3 mục 3; nếu ADR-0175 được duyệt thì vé Tour Đảo không tính vào luật này, theo ADR-0175 Đ2 mục 6), cách tính nợ trước và sau «Xong và đủ tiền» (ADR-0168 Đ2 mục 2, ADR-0177 nếu được duyệt).
7. Sửa đơn sau xác nhận: mọi thay đổi làm đơn có một dịch vụ **không** có dấu (thêm dịch vụ, đổi mã dịch vụ, thêm dòng nhập tay) thì máy từ chối; dòng mới hoặc mã mới kiểm theo dấu hiện tại, dòng cũ giữ nguyên. Sửa tăng tiền mà vẫn toàn dịch vụ có dấu thì không qua cổng hạn mức.
8. Hiển thị nợ: màn của đối tác và màn Kế toán tách hai con số, «Đang nợ theo hạn mức» và «Đang nợ Trả sau theo dịch vụ». «Còn được dùng» chỉ tính từ số thứ nhất. Cổng ngừng hồ sơ còn nợ tính cả hai.

**Chỗ này thay luật cũ.** Sửa ADR-0173 Đ1 mục 2 (đơn Trả sau theo dịch vụ đứng ngoài hạn mức), ADR-0168 Đ1 mục 4 («không có dòng hiệu lực thì đối tác chỉ trả trước») và Đ2 mục 3 (xác nhận bị từ chối khi không có hạn mức). Đó là lý do cần ADR-0178.

**Ghi chú cho người thi công.** Cổng hiện tại cần đổi thân hàm, không chỉ thêm nhánh: kết quả cổng phải mang được số giờ từ bảng dấu khi không có hạn mức (đổi kiểu hợp đồng giữa `orders` và `billing` qua `ctx` ở `src/shared/router.ts`, được duyệt cùng ADR-0178); `orders` cần một cột chụp loại Trả sau, công bố qua view `v_ord_don_tra_sau` để `billing` tách hai tổng nợ; cột mới vào danh sách cột bị khoá sau «Xong và đủ tiền» (trigger khoá phải liệt kê mọi cột của `orders`, bài `src/migrations-orders-da-giao.test.ts`).

**Quan hệ với ADR-0175** (vé Tour Đảo, proposed). Theo bảng Đ2 của ADR-0175, vé Tour Đảo của đơn đối tác vẫn chỉ mở khi thu đủ hoặc Trả sau trong hạn. Vậy Việc 2 vẫn cần cho ví dụ của chủ, và không sinh nguồn mở vé thứ hai: đơn Trả sau theo dịch vụ đi qua đúng nhánh Trả sau sẵn có của `moVeDuoc`.

## Hai việc ghép lại (đọc kỹ)

Đơn đối tác tự lập lúc công tắc Tắt, toàn dịch vụ có dấu, chọn Trả sau: đối tác cầm **toàn bộ** tiền khách, vé mở ngay, nợ **không có trần**, chỉ có hạn trả. Đây là ca rủi ro lớn nhất của cả hai việc. Lớp chặn duy nhất là: quá hạn còn nợ thì đối tác không đặt thêm đơn Trả sau, và vé chưa mở bị giữ. Vé hãng ngoài đã gửi không lấy lại được. Thêm nữa, vì chủ chọn «theo nhóm hiện tại», Quản trị chuyển một dịch vụ vào nhóm có dấu là mở được ca này cho dịch vụ đó.

## Quyết định của người soạn (chủ sửa được)

- Công tắc là **một** cho cả Nền tảng, không theo từng đối tác hay từng cấp: lời chủ nói «tắt/mở kênh» của công ty. Muốn theo từng đối tác là việc sau.
- Đơn **văn phòng lập** cho bên đặt là đại lý: công tắc không áp, theo đúng lời chủ «đơn được tạo bởi vai đối tác».
- «Người đặt đơn» là hồ sơ của tài khoản Đối tác đã lập đơn, không phải ô bên đặt (lý do ở Việc 1 mục 3).
- Quầy nhà cung cấp cũng bị chặn ở đơn mang dấu Tắt, vì chủ nói «chỉ có 1 lựa chọn».
- Khoản hoàn cho khách, đảo khoản thu, chi hoàn cọc được miễn; «Ghi khoản thu đòi được» và chuyển cọc từ người khác vào đơn Tắt bị chặn (bảng ở Việc 1).
- Việc 2 áp cả cho đơn văn phòng lập cho bên đặt là đối tác được hưởng, giống Trả sau hôm nay; nợ thuộc bên đặt.
- Đơn có dịch vụ có dấu lẫn dịch vụ thường: không đủ điều kiện; muốn Trả sau thì dùng hạn mức như hôm nay.
- Số giờ khi đơn có nhiều dịch vụ: lấy số nhỏ nhất (chặt hơn).
- Màn cài đặt: công tắc ở màn Cấp độ đại lý, cạnh khối «Cài đặt Trả sau»; dấu ở màn Dịch vụ, cạnh ô «Có vé». Đây là bề mặt, người thi công đổi được nếu chật.

## Phụ thuộc và thứ tự

- Việc 1 không phụ thuộc Việc 2; làm trước được.
- Việc 2 viết trên mã Trả sau (`src/shared/tra-sau.ts`, `src/modules/orders/tra-sau-cong.ts`, `src/modules/billing/tra-sau*.ts`). Phiên khác đang sửa cùng chỗ: `claude/festive-payne-7371a2` (ADR-0177, proposed). Thi công Việc 2 sau khi nhánh đó nhập hoặc bị bỏ.
- Cảnh báo «vé hãng ngoài» ở Việc 2 mục 3 cần biết dịch vụ có vé và vé do ai phát: ADR-0174 (đã duyệt, đang thi công trên `claude/interesting-hodgkin-cde2fd`) và ADR-0175 (proposed). Chưa có thì cảnh báo nói chung «dịch vụ này có thể có vé hãng ngoài».
- Số migration: các nhánh chưa nhập đã dùng tới `0142`, `0143`; người thi công soát lại theo `CLAUDE.md` §10.
- **Xây trên lỗ đang hở:** `TNV-G1` (đơn huỷ còn tiền), `HC-5.19` (chưa diễn tập khôi phục), `HC-4.2` (bút toán điều chỉnh chưa có người duyệt riêng). Chủ cho xây và cho **lên trước diễn tập** (lời chủ ở bảng trên), giống ADR-0172. Lời này có hiệu lực khi chủ duyệt ADR-0178; lúc đó dòng `xay_tren_cho_phep` ở `docs/quyen-hoan.json` được thêm và chủ duyệt bằng diff.

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)

**Việc 1**
1. Chưa từng đổi công tắc: đơn đối tác lập ghi được khoản thu với mọi người thu như hôm nay (bài giữ hành vi cũ).
2. Toàn quyền tắt được; Quản trị, Kế toán, Bán hàng, Đối tác gọi route đổi công tắc thì 403. Mỗi lần đổi có một dòng nhật ký.
3. Tắt rồi: đơn tài khoản Đối tác lập **sau** đó mang dấu Tắt; đơn lập **trước** đó (kể cả nháp gửi sau) và đơn văn phòng lập giữ như cũ. Dấu không đổi được bằng mọi đường ghi (có lớp CSDL chặn).
4. Đơn mang dấu Tắt: mỗi đường «chặn» ở bảng Việc 1 gửi người thu Công ty, nhân viên khác, quầy nhà cung cấp thì bị từ chối kèm câu tiếng Việt; người thu là hồ sơ người lập thì qua, cả khi bên đặt là khách lẻ và cả sau khi văn phòng đổi bên đặt. Các đường «miễn» vẫn chạy. Có bài quét mọi nơi chèn `bil_payment_receipt`: thêm đường mới mà không phân loại thì đỏ.
5. Đơn mang dấu Tắt có khai cọc mà lô xác nhận thấy người thu không hợp lệ: 409, đơn vẫn chưa xác nhận, không mất khoản cọc.
6. `scripts/audit-invariants.mjs` có mã bất biến mới: không đơn mang dấu Tắt nào có khoản khách trả còn hiệu lực với người thu khác hồ sơ người lập. Thử phá (chèn thẳng một khoản Công ty thu) → đỏ → hoàn nguyên. Ghi dòng ở `docs/SO-HANG-RAO.md`.
7. Đơn mang dấu Tắt: ô người thu đúng một lựa chọn (kịch bản Chrome cho tài khoản Đối tác và văn phòng); biên nhận không có QR.

**Việc 2**
8. Toàn quyền đánh dấu được nhóm và dịch vụ; người khác 403. Số giờ ngoài khoảng cho phép thì 400. Dịch vụ có vé hãng ngoài hiện cảnh báo, không chặn.
9. Đối tác được hưởng **không** có hạn mức, đơn toàn dịch vụ có dấu: thấy ô Trả sau, xác nhận được, vé mở trước khi trả, hạn trả đúng số giờ nhỏ nhất.
10. Bên đặt là khách lẻ hoặc hồ sơ nội bộ, đơn toàn dịch vụ có dấu: không thấy ô Trả sau; gửi thẳng `CREDIT` lên máy chủ thì 409.
11. Đơn có một dịch vụ không có dấu hoặc một dòng nhập tay: không thấy ô Trả sau (nếu không có hạn mức); gửi thẳng `CREDIT` thì 409.
12. Đối tác có hạn mức 10.000.000 ₫ đang nợ đủ 10.000.000 ₫: đơn Trả sau theo dịch vụ vẫn xác nhận được; «còn được dùng» không đổi; màn nợ hiện hai con số riêng.
13. Đối tác không hạn mức có đơn Trả sau theo dịch vụ hết ân hạn còn nợ: đơn Trả sau mới bị từ chối với `co_don_qua_han` (không phải «chưa có hạn mức»); đối tác có hạn mức cũng bị chặn đơn Trả sau theo hạn mức; vé chưa mở bị giữ; đơn Trả trước vẫn xác nhận được.
14. Đổi hoặc gỡ dấu, hoặc Quản trị chuyển dịch vụ ra khỏi nhóm có dấu, sau khi xác nhận: hạn trả và loại Trả sau của đơn đã xác nhận không đổi.
15. Quản trị chuyển dịch vụ vào nhóm có dấu: đơn mới chỉ có dịch vụ đó đủ điều kiện ngay (đúng lựa chọn của chủ), có nhật ký đổi nhóm sẵn có.
16. Thêm dịch vụ không có dấu, đổi mã sang dịch vụ không có dấu, hoặc thêm dòng nhập tay vào đơn Trả sau theo dịch vụ đã xác nhận: 409.
17. Hai lệnh xác nhận cùng lúc của cùng đối tác vẫn đúng luật phiên bản của ADR-0168 Đ2 mục 4 (bài sẵn có không đỏ).

Mỗi hàng rào mới có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.

## Trang ghép (`CLAUDE.md` §9)

**(1) Bảng nào nhận thêm loại dữ liệu gì**

| Bảng | Thêm |
|---|---|
| bảng cài đặt mới của `billing` (công tắc) | trạng thái công tắc theo thời gian, chỉ thêm |
| bảng cài đặt mới của `billing` (Trả sau theo dịch vụ) | dòng theo nhóm hoặc theo dịch vụ, số giờ trả và ân hạn, theo thời gian, chỉ thêm |
| `orders` | dấu công tắc chụp lúc lập (chỉ đơn tài khoản Đối tác lập, không đổi được); loại Trả sau (theo hạn mức / theo dịch vụ) chụp lúc xác nhận, khoá sau «Xong và đủ tiền» |
| `bil_payment_receipt` | không thêm cột; thêm điều kiện người thu với đơn mang dấu Tắt |

**(2) Dòng bản đồ quyền chạm các bảng này**

| Ô quyền | Ai | Áp cho |
|---|---|---|
| ô mới: đổi công tắc | chỉ Toàn quyền | bảng công tắc |
| ô mới: đánh dấu Trả sau theo dịch vụ | chỉ Toàn quyền | bảng dấu |
| xem hai cài đặt | Toàn quyền, Kế toán, Quản trị (đề xuất của người soạn) | hai bảng mới |
| `credit.due.extend` (có sẵn) | Quản trị, Toàn quyền | thêm đơn Trả sau theo dịch vụ |
| `credit.own.view` (có sẵn) | Đối tác (của mình) | thêm đơn Trả sau theo dịch vụ, số tách riêng |
| ô ghi khoản thu (có sẵn) | như hôm nay | bị siết thêm ở đơn mang dấu Tắt |
| `admin.manage` gán nhóm dịch vụ (có sẵn, ADR-0058 Đ3) | Quản trị | **đổi nghĩa** (chủ đã chọn): chuyển dịch vụ vào nhóm có dấu là cho dịch vụ đó Trả sau không cần hạn mức |

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng máy chủ | Chỗ giao diện ẩn/hiện bị đổi nghĩa |
|---|---|---|
| Ghi khoản thu ở đơn mang dấu Tắt | một hàm của `billing` gọi ở mọi đường «chặn» + lớp CSDL | ô «Người thu tiền» (`luaChonNguoiThu`) chỉ còn một dòng hoặc không dòng nào; QR biên nhận ẩn |
| Chọn Trả sau không có hạn mức | cổng Trả sau lúc lưu và lúc xác nhận nhận thêm nhánh «đủ điều kiện theo dịch vụ»; kiểm quá hạn độc lập với hạn mức | khối Trả sau ở form đơn hiện cả khi bên đặt không có hạn mức |
| Tính «còn được dùng» | bỏ đơn Trả sau theo dịch vụ khỏi tổng nợ dùng hạn mức | màn nợ của đối tác và Kế toán hiện hai con số |
| Mở vé | `moVeDuoc` hiện có, không đổi luật | khối Vé điện tử |
| Gán nhóm dịch vụ | `admin.manage` hiện có | màn nhóm dịch vụ: nên báo khi nhóm đích có dấu Trả sau theo dịch vụ |
