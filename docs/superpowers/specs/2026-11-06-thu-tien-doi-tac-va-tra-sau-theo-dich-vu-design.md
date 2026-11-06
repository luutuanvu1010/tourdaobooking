# Công tắc «Khách của đối tác trả cho Công ty» và Trả sau theo dịch vụ

Trạng thái: **bản soạn 2026-11-06, chờ chủ duyệt.** Quyết định kiến trúc: `docs/adr/ADR-0178-cong-tac-khach-doi-tac-tra-cong-ty-va-tra-sau-theo-dich-vu.md` (proposed). Lệch giữa hai nơi: ADR thắng.

## Lời chủ

Chủ 6/11/2026, nguyên văn: «thêm tùy chọn cho Super Admin để Tắt/mở kênh thu tiền giùm đối tác của công ty chủ quản, tức là các đơn hàng được tạo bởi vai đối tác (bên ngoài) thì chỉ có 1 lựa chọn là người đặt đơn thu tiền, tức khách hàng (lẻ/cuối cùng) thanh toán tiền cho chính đối tác. Khoản thu giùm của công ty chủ quản (Tour đảo) với đối tác sẽ trở thành giá trị 0. Đồng thời, thêm tùy chọn của Super Admin cho phép trả sau/công nợ với một nhóm dịch vụ/dịch vụ cụ thể. Ví dụ: Đơn cho vé tham quan tour đảo không cần trả trước mà vẫn được duyệt (thay vì phải trả trước 100% hoặc đối tác được cấp công nợ/tín dụng)».

Chủ chọn ở hộp hỏi cùng ngày (nguyên văn nhãn đã chọn):

| Câu | Chủ chọn |
|---|---|
| Đơn Trả sau nhờ dịch vụ được miễn: trả khi nào, giới hạn ra sao | «Có hạn trả, không hạn mức (Recommended)» — không tính vào hạn mức; trả trong số giờ Toàn quyền đặt cho dịch vụ/nhóm; quá hạn còn nợ thì chặn đơn Trả sau mới và vé chưa mở, giống Trả sau hiện nay |
| Dịch vụ nào được đánh dấu | «Mọi dịch vụ» — kể cả dịch vụ có vé hãng ngoài; máy chỉ hiện cảnh báo, công ty chịu rủi ro mất tiền vé |
| Đơn lập trước lúc tắt công tắc | «Chỉ áp cho đơn lập sau (Recommended)» — máy ghi trạng thái công tắc lên đơn lúc lập |
| Tên công tắc | «Khách của đối tác trả cho Công ty (Recommended)» — Bật = như hôm nay; Tắt = chỉ đối tác thu |

«Super Admin» trong lời chủ là quyền **Toàn quyền** (`SUPER_ADMIN`) theo bảng từ.

## Hiện trạng (đã đọc mã 6/11)

- Đơn Trả trước của đối tác **xác nhận được khi chưa trả tiền** (cổng xác nhận chung chỉ có điều kiện Trả sau). Chỗ bị khoá thật là **vé điện tử**: vé chỉ mở khi tiền đã về công ty (ADR-0153 Đ3, `thuDu`), và tiền đối tác tự ghi «Tôi thu» chưa nộp về công ty không tính (ADR-0159 Đ2 mục 2). Bước «Xong và đủ tiền» cũng đòi thu đủ.
- Ô «Người thu tiền» khi ghi khoản thu có: Công ty, «Tôi thu», «Khách trả cho đại lý ‹tên›», «Khách trả tại quầy ‹tên›» (`src/shared/ben-kia-hien-thi.ts`). Mọi khoản thu sinh dòng *tiền đang giữ hộ*: ai cầm tiền thì nợ Tour Đảo (ADR-0079 điều 3). Khi Công ty thu tiền khách của đơn đại lý, tới «Xong và đủ tiền» Công ty nợ đại lý hoa hồng; đây là «khoản thu giùm» trong lời chủ.
- Trả sau hôm nay: chỉ đối tác có hạn mức mới chọn được; xác nhận bị từ chối khi không có hạn mức, khi vượt hạn mức, hoặc khi có đơn quá hạn còn nợ (ADR-0168 Đ2 mục 3; ADR-0173 Đ1 mục 2 «không cho vượt hạn mức, không có ngoại lệ theo đơn»).

## Việc 1 — Công tắc «Khách của đối tác trả cho Công ty»

**Làm gì.**
1. Một công tắc chung cho cả Nền tảng, mặc định **Bật** (giữ đúng như hôm nay). Chỉ Toàn quyền đổi. Mỗi lần đổi thêm một dòng mới (chỉ thêm, không xoá cứng), có nhật ký.
2. Lúc **lập** một đơn (kể cả đơn nháp), nếu người lập là tài khoản giữ quyền Đối tác thì máy ghi trạng thái công tắc lúc đó lên đơn. Ghi một lần, không đổi về sau. Đơn văn phòng lập (kể cả cho bên đặt là đại lý) không bị ảnh hưởng.
3. Đơn mang dấu **Tắt** thì người thu tiền của mọi khoản thu mới **chỉ được là bên đặt của đơn** (tức chính đối tác). Máy chủ từ chối mọi người thu khác: Công ty, nhân viên hay hướng dẫn viên tự thu, quầy nhà cung cấp.
4. Trên giao diện, ô «Người thu tiền» của đơn đó chỉ còn một lựa chọn: tài khoản Đối tác thấy «Tôi thu»; văn phòng thấy «Khách trả cho đại lý ‹tên›». Biên nhận gửi khách của đơn đó **không hiện mã QR** vào tài khoản công ty.
5. Đối tác nộp tiền về công ty theo đường đã có («Đã nộp về công ty» do Kế toán ghi), vì đó là tiền đối tác trả công ty, không phải khách trả công ty.

**Phải đúng ở mọi đường ghi khoản thu**, không chỉ màn hình. Các đường đã thấy khi đọc mã 6/11 (người thi công phải quét lại, có bài kiểm quét nơi gọi):
- `POST /api/orders/:id/payments` (Ghi khoản thu);
- `POST /api/ledger/receipt-replacements` (Sửa khoản thu đã ghi, Ghi bù khoản thu): khoản thay thế cũng chỉ được người thu là bên đặt;
- các route cọc `…/coc/*` có chèn khoản thu (chuyển cọc giữa đơn);
- `POST /api/ledger/phan-dinh/:id/huy` («Ghi khoản thu đòi được» ghi người thu là Công ty);
- khoản thu tự sinh từ «Khách đặt cọc trước» lúc xác nhận (ADR-0159 Đ1 mục 3: vai `BOOKER`, hoặc `STAFF` khi người lập không phải bên đặt được hưởng);
- mã QR trên biên nhận (module `receipt`).

**Kết quả cần thấy.** Với mọi đơn mang dấu Tắt: tổng các khoản thu còn hiệu lực có người thu khác bên đặt **bằng 0**. Đây là con số «khoản thu giùm = 0» của chủ, và phải có máy canh (xem tiêu chí 1.6).

**Hệ quả chủ cần biết (đã nói trong hộp hỏi một phần).**
- Đơn Trả trước của đối tác mang dấu Tắt: vé chỉ mở sau khi đối tác đã nộp tiền về công ty và Kế toán ghi nhận, vì «Tôi thu» không mở vé. Muốn mở vé trước thì dùng Việc 2 hoặc hạn mức Trả sau.
- Khách tới cảng mà chưa trả đối tác thì hướng dẫn viên **không ghi thu được** trên Nền tảng cho đơn đó.
- Bật lại công tắc không đổi dấu của đơn đã lập lúc Tắt.

## Việc 2 — Trả sau theo dịch vụ

**Làm gì.**
1. Toàn quyền đánh dấu «cho Trả sau không cần hạn mức» cho **một nhóm dịch vụ** hoặc **một dịch vụ**, kèm thời hạn trả (giờ) và ân hạn (giờ), cùng khuôn số giờ của Trả sau (ADR-0172 Đ3). Bảng chỉ thêm, có hiệu lực theo thời gian, có nhật ký. Mặc định không dịch vụ nào được đánh dấu, nên tính năng không đổi gì cho tới khi Toàn quyền bật.
2. Một dịch vụ được miễn nếu có dòng của chính nó, hoặc nhóm hiện hành của nó có dòng. Số giờ lấy của dòng dịch vụ nếu có, không thì của dòng nhóm.
3. Đánh dấu được **mọi dịch vụ**. Dịch vụ có vé hãng ngoài thì màn đánh dấu hiện cảnh báo rằng vé đã gửi khách không lấy lại được (chủ chọn «Mọi dịch vụ»).
4. Một đơn **đủ điều kiện** khi: bên đặt là hồ sơ đối tác (cùng điều kiện bên đặt của Trả sau hôm nay), và **mọi** dịch vụ của đơn đều được miễn. Đơn đủ điều kiện thì ô «Trả sau» hiện ra dù bên đặt không có hạn mức; người lập vẫn tự chọn, mặc định Trả trước.
5. Xác nhận đơn Trả sau đủ điều kiện: **không** kiểm hạn mức và **không** tính vào nợ dùng hạn mức của đối tác. Vẫn từ chối khi đối tác có đơn Trả sau (bất kỳ loại nào) đã hết ân hạn còn nợ. Hạn trả = giờ xác nhận + thời hạn trả; khi các dịch vụ có số giờ khác nhau thì lấy số **nhỏ nhất**. Loại Trả sau và hai mốc giờ được chụp lúc xác nhận; đổi cài đặt về sau không đổi đơn đã xác nhận.
6. Sau khi xác nhận, đơn này đi đúng luật Trả sau hiện có: mở vé trước khi trả (ADR-0168 Đ3 mục 1), quá hạn thì chặn vé chưa mở và đơn Trả sau mới (ADR-0173 Đ2 mục 3), tin nhắc trước hạn 6 giờ và lúc quá hạn (Đ3 mục 2), hoa hồng sau khi thu đủ (Đ3 mục 1), Quản trị/Toàn quyền nới hạn được (Đ1 mục 3), đối tác xem nợ của mình (Đ3 mục 3), không ngừng được hồ sơ còn nợ (Đ3 mục 5), không huỷ được khi đã mở vé còn nợ (ADR-0168 Đ3 mục 3), cách tính nợ trước và sau «Xong và đủ tiền» (ADR-0168 Đ2 mục 2, ADR-0177 nếu được duyệt).
7. Sửa đơn sau xác nhận: thêm dịch vụ **không** được miễn vào đơn Trả sau theo dịch vụ thì máy từ chối (đơn phải luôn «mọi dịch vụ đều được miễn»). Sửa tăng tiền mà vẫn toàn dịch vụ được miễn thì không qua cổng hạn mức.

**Chỗ này thay luật cũ.** ADR-0173 Đ1 mục 2 («không cho vượt hạn mức, không có ngoại lệ theo đơn») được sửa: đơn Trả sau theo dịch vụ đứng ngoài hạn mức. Đó là lý do cần ADR-0178.

## Hai việc ghép lại (đọc kỹ)

Đơn đối tác tự lập lúc công tắc Tắt, toàn dịch vụ được miễn, chọn Trả sau: đối tác cầm **toàn bộ** tiền khách, vé mở ngay, nợ **không có trần**, chỉ có hạn trả. Đây là ca rủi ro lớn nhất của cả hai việc. Lớp chặn duy nhất là: quá hạn còn nợ thì đối tác không đặt thêm đơn Trả sau, và vé chưa mở bị giữ. Không có cách lấy lại vé hãng ngoài đã gửi.

## Quyết định của người soạn (chủ sửa được)

- Công tắc là **một** cho cả Nền tảng, không theo từng đối tác hay từng cấp: lời chủ nói «tắt/mở kênh» của công ty. Muốn theo từng đối tác là việc sau.
- Đơn **văn phòng lập** cho bên đặt là đại lý: công tắc không áp, theo đúng lời chủ «đơn được tạo bởi vai đối tác».
- Quầy nhà cung cấp cũng bị chặn ở đơn mang dấu Tắt, vì chủ nói «chỉ có 1 lựa chọn».
- Đơn «huỷ để lập lại» (ADR-0089) là đơn mới: chụp công tắc lúc lập đơn mới.
- Việc 2 áp cả cho đơn văn phòng lập cho bên đặt là đối tác, giống Trả sau hôm nay; nợ thuộc bên đặt.
- Đơn có dịch vụ được miễn lẫn dịch vụ thường: không đủ điều kiện; muốn Trả sau thì dùng hạn mức như hôm nay.
- Màn cài đặt: công tắc ở màn Cấp độ đại lý, cạnh khối «Cài đặt Trả sau»; dấu miễn ở màn Dịch vụ, cạnh ô «Có vé». Đây là bề mặt, người thi công đổi được nếu chật.

## Phụ thuộc và thứ tự

- Việc 2 viết trên mã Trả sau (`src/shared/tra-sau.ts`, `src/modules/orders/tra-sau-cong.ts`, `src/modules/billing/tra-sau*.ts`). Đang có phiên khác làm cùng chỗ: `claude/festive-payne-7371a2` (ADR-0177, proposed). Thi công Việc 2 sau khi nhánh đó nhập hoặc bị bỏ.
- Cảnh báo «vé hãng ngoài» ở Việc 2 mục 3 cần biết dịch vụ có vé và vé do ai phát: ADR-0174 (đã duyệt, đang thi công trên `claude/interesting-hodgkin-cde2fd`) và ADR-0175 (proposed). Chưa có thì cảnh báo nói chung «dịch vụ này có thể có vé hãng ngoài».
- Việc 1 không phụ thuộc Việc 2; làm trước được.
- **Xây trên lỗ đang hở:** `TNV-G1` (đơn huỷ còn tiền), `HC-5.19` (chưa diễn tập khôi phục), `HC-4.2` (bút toán điều chỉnh chưa có người duyệt riêng). Cả hai việc chạm khoản thu và nợ. Theo `CLAUDE.md` §3, bản này **chưa được duyệt** nếu chủ không cho phép rõ. Người soạn đề nghị phương án an toàn: cho xây, **chỉ phát hành sau diễn tập khôi phục `HC-5.19`** (như ADR-0168). Tiền lệ khác: ADR-0172 cho Trả sau lên trước diễn tập; chủ chọn khi duyệt. Dòng `xay_tren_cho_phep` ở `docs/quyen-hoan.json` do chủ duyệt bằng diff.

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)

**Việc 1**
1. Chưa từng đổi công tắc: đơn đối tác lập ghi được khoản thu với mọi người thu như hôm nay (bài giữ hành vi cũ).
2. Toàn quyền tắt được; Quản trị, Kế toán, Bán hàng, Đối tác gọi route đổi công tắc thì 403. Mỗi lần đổi có một dòng nhật ký.
3. Tắt rồi: đơn tài khoản Đối tác lập **sau** đó mang dấu Tắt; đơn lập **trước** đó và đơn văn phòng lập giữ như cũ. Dấu không đổi được bằng mọi đường ghi (có lớp CSDL chặn).
4. Đơn mang dấu Tắt: từng đường ghi khoản thu ở danh sách trên gửi người thu Công ty, nhân viên, quầy nhà cung cấp thì bị từ chối kèm câu tiếng Việt; người thu là bên đặt thì qua. Có bài quét mọi nơi chèn `bil_payment_receipt`, thêm đường mới mà quên cổng thì đỏ.
5. Đơn mang dấu Tắt: ô người thu chỉ một lựa chọn (kịch bản Chrome cho tài khoản Đối tác và văn phòng); biên nhận không có QR.
6. `scripts/audit-invariants.mjs` có mã bất biến mới: không đơn mang dấu Tắt nào có khoản thu còn hiệu lực với người thu khác bên đặt. Thử phá (chèn thẳng một khoản Công ty thu) → đỏ → hoàn nguyên. Ghi dòng ở `docs/SO-HANG-RAO.md`.

**Việc 2**
7. Toàn quyền đánh dấu được nhóm và dịch vụ; người khác 403. Số giờ ngoài khoảng cho phép thì 400. Dịch vụ có vé hãng ngoài hiện cảnh báo, không chặn.
8. Đối tác **không** có hạn mức, đơn toàn dịch vụ được miễn: thấy ô Trả sau, xác nhận được, vé mở trước khi trả, hạn trả đúng số giờ nhỏ nhất.
9. Cùng đối tác, đơn có một dịch vụ không được miễn: không thấy ô Trả sau (nếu không có hạn mức); gửi thẳng `CREDIT` lên máy chủ thì 409.
10. Đối tác có hạn mức 10.000.000 ₫ đang nợ đủ 10.000.000 ₫: đơn Trả sau theo dịch vụ vẫn xác nhận được; nợ của đơn đó không làm giảm «còn được dùng».
11. Đơn Trả sau theo dịch vụ hết ân hạn còn nợ: đơn Trả sau mới (cả hai loại) của đối tác đó bị từ chối, vé chưa mở bị giữ, đơn Trả trước vẫn xác nhận được.
12. Đổi hoặc gỡ dấu miễn sau khi xác nhận: hạn trả và loại Trả sau của đơn đã xác nhận không đổi.
13. Thêm dịch vụ không được miễn vào đơn Trả sau theo dịch vụ đã xác nhận: 409.
14. Hai lệnh xác nhận cùng lúc của cùng đối tác vẫn đúng luật phiên bản của ADR-0168 Đ2 mục 4 (bài sẵn có không đỏ).

Mỗi hàng rào mới có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.

## Trang ghép (`CLAUDE.md` §9)

**(1) Bảng nào nhận thêm loại dữ liệu gì**

| Bảng | Thêm |
|---|---|
| bảng cài đặt mới của `billing` (công tắc) | trạng thái công tắc theo thời gian, chỉ thêm |
| bảng cài đặt mới của `billing` (miễn trả trước) | dòng theo nhóm hoặc theo dịch vụ, số giờ trả và ân hạn, theo thời gian, chỉ thêm |
| `orders` | dấu công tắc chụp lúc lập (chỉ đơn tài khoản Đối tác lập), loại Trả sau (theo hạn mức / theo dịch vụ) chụp lúc xác nhận |
| `bil_payment_receipt` | không thêm cột; thêm điều kiện chặn người thu với đơn mang dấu Tắt |

**(2) Dòng bản đồ quyền chạm các bảng này**

| Ô quyền | Ai | Áp cho |
|---|---|---|
| ô mới: đổi công tắc | chỉ Toàn quyền | bảng công tắc |
| ô mới: đánh dấu miễn trả trước | chỉ Toàn quyền | bảng miễn trả trước |
| xem hai cài đặt | Toàn quyền, Kế toán, Quản trị (đề xuất; chủ sửa được) | hai bảng mới |
| `credit.due.extend` (có sẵn) | Quản trị, Toàn quyền | thêm đơn Trả sau theo dịch vụ |
| `credit.own.view` (có sẵn) | Đối tác (của mình) | thêm đơn Trả sau theo dịch vụ, có nhãn phân biệt |
| ô ghi khoản thu (có sẵn) | như hôm nay | bị siết thêm ở đơn mang dấu Tắt |
| ô đổi nhóm dịch vụ (có sẵn, ADR-0058 Đ3) | Quản trị | **đổi nghĩa**: chuyển dịch vụ vào nhóm đang miễn là cho dịch vụ đó Trả sau không cần hạn mức — xem câu hỏi ở cuối |

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng máy chủ | Chỗ giao diện ẩn/hiện bị đổi nghĩa |
|---|---|---|
| Ghi khoản thu ở đơn mang dấu Tắt | một hàm của `billing` gọi ở mọi đường chèn khoản thu + lớp CSDL | ô «Người thu tiền» (`luaChonNguoiThu`) chỉ còn một dòng; QR biên nhận ẩn |
| Chọn Trả sau không có hạn mức | cổng Trả sau lúc lưu và lúc xác nhận nhận thêm nhánh «đủ điều kiện theo dịch vụ» | khối Trả sau ở form đơn hiện cả khi bên đặt không có hạn mức |
| Tính «còn được dùng» của hạn mức | bỏ đơn Trả sau theo dịch vụ khỏi tổng nợ | ô «còn được dùng» của đối tác và văn phòng |
| Mở vé | cổng `moVeDuoc` hiện có (không đổi luật, chỉ thêm loại đơn vào) | khối Vé điện tử |

## Câu còn mở cho chủ (gom một lần sau khi người kiểm đọc)

1. **Quản trị đổi nhóm dịch vụ.** Nếu một nhóm đang miễn trả trước, Quản trị chuyển một dịch vụ vào nhóm đó là gián tiếp cho dịch vụ đó Trả sau không hạn mức, dù chủ nói chỉ Toàn quyền quyết. Khuyến nghị: miễn theo nhóm chỉ áp cho dịch vụ đã nằm trong nhóm **lúc Toàn quyền đánh dấu**; dịch vụ chuyển vào sau phải được Toàn quyền đánh dấu riêng.
2. **Tên cho dấu miễn ở Việc 2** (chưa có trong bảng từ): «Trả sau không cần hạn mức», «Trả sau theo dịch vụ», hoặc «Miễn trả trước». Khuyến nghị: «Trả sau theo dịch vụ», vì người dùng đã quen chữ «Trả sau».
