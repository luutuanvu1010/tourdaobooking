# Đặc tả: mã QR thanh toán (VietQR) trên đơn + mã giao dịch ngân hàng khi Kế toán xác nhận

- **Ngày:** 2026-10-08. **Người soạn:** AI (phiên lập kế hoạch, nhánh `claude/ticket-sales-qr-payment-cf8e18`, mốc `main` @`4d98a205`).
- **Trạng thái:** bản nháp, chờ chủ duyệt. Kèm: ADR nháp `ADR-0103-nhap-qr-thanh-toan-vietqr.md` và trang ghép `trang-ghep.md` cùng thư mục.
- **Loại việc:** việc lớn (tiền, quyền, dữ liệu): sau thi công bắt buộc người kiểm độc lập chỉ đọc (CLAUDE.md §3).
- **Xây trên lỗ đang hở:** **TNV-G4** (HIGH, hạn 2026-10-31, `docs/quyen-hoan.json`). Lỗ này gồm ca KT02 "hai người khai cùng một khoản chuyển khoản, cả hai được xác nhận". QR làm số khoản chuyển khoản tăng mạnh, nên bản này **vá luôn phần lõi Đ6 của ADR-0092** (xem §5). Phần Đ6a và cảnh báo khác đơn vẫn hở sau bản này. Theo luật "dừng dây chuyền", chủ dự án duyệt đặc tả này phải kèm một câu lý do.

## 1. Tóm tắt cho chủ (lời thường)

Người bán (nhân viên kinh doanh, hướng dẫn viên đang phụ trách đơn, cộng tác viên, đại lý) mở đơn và bấm **"QR thanh toán"**. Số tiền mặc định bằng số còn lại của đơn, muốn thu cọc thì gõ số nhỏ hơn. Mã QR hiện ngay trên điện thoại để khách quét. Muốn gửi khách ở xa thì bấm "Lưu ảnh" rồi gửi qua Zalo. Tiền luôn vào **một tài khoản công ty**, và chỉ Toàn quyền nhập hay đổi được tài khoản này.

Khách chuyển xong, người bán bấm **"Khách đã chuyển khoản"**. Nền tảng ghi lần thu như hôm nay: người bán tạm đứng tên giữ hộ khoản đó cho tới khi Kế toán đối chiếu sao kê và bấm xác nhận. Lúc xác nhận, Kế toán gõ **mã giao dịch ngân hàng**. Nền tảng chặn trường hợp cùng một khoản chuyển bị xác nhận hai lần cho cùng đơn. Nền tảng cũng chặn trường hợp tổng các lần thu gắn một mã vượt số tiền thực chuyển. Nền tảng **không** tự đọc tài khoản ngân hàng ở bản này.

## 2. Lời chủ đã chốt (2026-10-08, trong chat; không hỏi lại)

| Câu | Chủ chọn |
|---|---|
| "Chính sách đại lý" nghĩa là gì | **Giá lẻ + hoa hồng** (đúng ADR-0077, không bảng giá net) |
| QR cho đơn nào | **Khách lẻ và khách của CTV/đại lý** (tiền vào tài khoản công ty; hoa hồng tính sau ở sổ tiền lượt 2) |
| Tiền về thì ai xác nhận | **Kế toán bấm xác nhận** (luồng "Công ty thu – chuyển khoản" có sẵn); tự động đọc ngân hàng để lượt sau |
| Hướng dẫn viên nội bộ | **Chỉ hiện QR cho đơn đang phụ trách**, không mở quyền tự lập đơn |
| QR hiện ở đâu | **Trên màn đơn + nút lưu ảnh**; **không** in vào ảnh xác nhận / biên nhận |
| Số tiền QR | **Còn lại, hoặc số nhỏ hơn** (thu cọc); máy chủ chặn số lớn hơn còn lại |
| "Đối soát từng giao dịch" | **Từng đơn rõ ai nợ ai, trả từng đơn hoặc gộp cuối tháng**, đúng ADR-0080 (thuộc kế hoạch sổ tiền lượt 2, không thuộc đặc tả này) |
| Thêm chức năng khác đợt này | **Không**, chỉ QR + đối soát |
| Ra QR cùng "mã giao dịch ngân hàng" hay trước | **Ra cùng một lần** |
| Ai nhập / đổi số tài khoản | **Chỉ Toàn quyền** |
| Thiết kế QR bốn bước | **Đúng, viết đặc tả** |

## 3. Phạm vi

**Trong bản này:** (a) tài khoản nhận tiền của công ty chủ; (b) màn và route QR trên đơn; (c) lối tắt "Khách đã chuyển khoản" vào form ghi lần thu có sẵn; (d) ADR-0092 Đ6 phần lõi (ô mã giao dịch ngân hàng); (e) tìm đơn bằng nội dung chuyển khoản không dấu gạch.

**Không trong bản này:**
- Tự đọc biến động số dư, webhook ngân hàng hay dịch vụ trung gian (SePay, Casso, PayOS…). Việc này cần ADR riêng và phải đi qua hộp thư đi (Hiến chương 5.16).
- QR trên ảnh xác nhận / biên nhận gửi khách.
- QR cho đại lý trả số chênh khi quyết toán. Việc này để lại cho sổ tiền lượt 2.
- Phần cảnh báo "cùng mã ở đơn khác" của Đ6 và toàn bộ Đ6a. Hai phần này theo đặc tả `2026-10-06-bang-luat-trung-dung-chung.md` (còn câu chờ chủ).
- Mọi thứ của sổ tiền lượt 2 (ADR-0077–0081): hoa hồng, bên đặt là đại lý, quyết toán hai chiều, khoá kỳ, sổ của đối tác.

## 4. Hành vi

### 4.1 Tài khoản nhận tiền
- Toàn quyền vào hồ sơ công ty → "Tài khoản nhận tiền". Màn này có ba ô: chọn ngân hàng từ danh sách, số tài khoản (chỉ chữ số), tên chủ tài khoản (chữ in hoa không dấu, đúng như ngân hàng in).
- Mỗi lúc **tối đa một** tài khoản hiện hành cho công ty chủ. Đổi tài khoản thì đóng dòng cũ và mở dòng mới trong cùng một lô ghi, kèm nhật ký (ai, lúc nào, dòng nào). Không ghi đè, không xoá.
- Người khác (kể cả Kế toán, Quản trị) gọi route ghi → 403.
- Đổi công ty chủ (ADR-0043) sang hồ sơ chưa có tài khoản ⇒ QR báo "Công ty chưa cài tài khoản nhận tiền — báo Toàn quyền", **không** lấy tài khoản của công ty cũ.

### 4.2 Nút và màn QR
- Nút **"QR thanh toán"** hiện trên chi tiết đơn khi người xem có `money.view` với đơn đó (cùng phạm vi đơn như hôm nay) **và** còn lại > 0. Còn lại lấy từ hàm duy nhất `conLai` (`billing/rules.ts`), nên đơn huỷ, đơn đã thu đủ và đơn đã "Đã giao" đều không có nút. Đơn nháp **có** nút, giống việc hôm nay ghi được lần thu trước khi xác nhận.
- Bấm nút ⇒ ô số tiền điền sẵn số còn lại. Người bán sửa thành số nhỏ hơn được. Máy chủ trả DTO QR, trình duyệt vẽ mã.
- Dưới mã in: tên công ty, tên ngân hàng, số tài khoản, tên chủ tài khoản, số tiền (định dạng `1.000.000đ`), nội dung chuyển khoản, mã đơn. **Không** in hoa hồng, giá vốn, nợ nội bộ, tên người thu (Hiến chương 4.4).
- Nút **"Lưu ảnh"**: dựng ảnh PNG từ canvas. Trên iPhone, Nền tảng mở bảng chia sẻ nếu máy hỗ trợ, nếu không thì tải về.
- Nút **"Khách đã chuyển khoản"** chỉ hiện khi người xem có `payment.receive` với đơn đó. Bấm vào mở form ghi lần thu có sẵn, điền trước số tiền vừa hiện trên QR, hình thức "Chuyển khoản", người thu "Công ty". Từ đây là luồng hôm nay: người không phải Kế toán khai thì sinh dòng giữ hộ trên người khai, chờ Kế toán xác nhận (ADR-0026 H3, ADR-0092 Đ2b).
- **Nội dung chuyển khoản** = mã đơn bỏ dấu gạch: `TD-20261008-0012` → `TD202610080012`. Chỉ chữ in hoa và số, không dấu cách.

### 4.3 Tìm đơn bằng nội dung chuyển khoản
- Gõ `TD202610080012` (có hay không gạch, hoa hay thường) vào ô tìm đơn thì ra đúng đơn `TD-20261008-0012`.

## 5. ADR-0092 Đ6 phần lõi: mã giao dịch ngân hàng (cùng bản phát hành)

Đây là thi công **một điều đã duyệt** (ADR-0092 Đ6, accepted 2026-10-03), không phải quyết định mới. Chỉ có thứ tự phát hành là mới (chủ chọn "ra cùng").
- Kế toán điền mã giao dịch ngân hàng lúc **"Công ty đã nhận"** và lúc **tự ghi** một lần thu chuyển khoản với người thu là Công ty. Mã được chuẩn hoá: bỏ dấu cách, chữ in hoa.
- Ô này **được miễn** luật chặn chuỗi ≥ 8 chữ số. Luật đó vẫn áp cho ghi chú và lý do.
- **Chặn** khi cùng mã đã chuẩn hoá đã gắn vào một lần thu còn hiệu lực **của cùng đơn**.
- **Chặn** khi tổng các lần thu còn hiệu lực gắn cùng một mã vượt **số tiền thực chuyển** do Kế toán nhập theo sao kê (mã nhập lần đầu thì Kế toán nhập luôn số tiền thực chuyển).
- Hai lớp như mọi luật tiền: máy chủ kiểm trước, trigger CSDL là lớp 2 (Hiến chương 5.1).
- **"Còn hiệu lực"** ở mọi luật trên dùng **đúng** vị từ `hieuLuc` của `billing/rules.ts`, tức vị từ mà `conLai` đang dùng: lần thu không phải dòng đảo và chưa bị đảo. Như vậy tổng theo mã và "còn lại" không bao giờ lệch nhau (5.4). Lần thu bị "Thay lần thu" (ADR-0088) đi qua cặp đảo, nên cũng rơi khỏi `hieuLuc`. Kế hoạch phải có bài khoá điều này. Trigger CSDL viết lại cùng vị từ bằng SQL, và có ca so trigger với hàm thuần.
- **Sửa khi Kế toán gõ nhầm** (ADR-0092 Đ6 ghi "điền **hoặc sửa**"): lưu chỉ-thêm, nên sửa = **dòng thay thế** trỏ về dòng cũ. Áp cho cả mã của một lần thu lẫn số thực chuyển của một mã. Chỉ người có `ledger.write` được sửa, lý do bắt buộc, ghi nhật ký. Sau khi thay, hai luật chặn chạy lại; ví dụ hạ số thực chuyển xuống dưới tổng đã gắn thì bị chặn. Dòng thay thế **không sinh dòng nợ, không đổi số dư của ai**, nên không phải "bút toán điều chỉnh" theo HC-4.2. Nếu người kiểm độc lập hoặc chủ xếp nó vào HC-4.2 thì đặc tả này đứng thêm trên HC-4.2.
- **Lối ra khi khai trùng bị chặn:** người bán khai "Khách đã chuyển khoản" hai lần cho cùng một khoản, Kế toán xác nhận lần thứ hai thì bị chặn. Lần khai thừa vẫn để người khai đứng tên giữ hộ. Lối ra là đường có sẵn: trước "Đã giao", Kế toán **đảo lần thu** thừa (dòng giữ hộ đảo theo, ADR-0092 Đ4); sau "Đã giao", Kế toán dùng **"Thay lần thu"** (ADR-0088). Không mở đường mới. Hộp báo chặn nói rõ hai lối này.
- **Câu chờ chủ C1** (§9): mã có **bắt buộc** khi Kế toán xác nhận hoặc ghi chuyển khoản không.

## 6. Dữ liệu (chi tiết cột chốt ở kế hoạch; migration chỉ thêm)

| Thứ | Module | Loại (Hiến chương 2.2) | Ghi chú |
|---|---|---|---|
| Bảng tra cứu ngân hàng (mã, BIN 6 số, tên ngắn, tên đầy đủ, `active`) | `parties` | dữ liệu tra cứu | gieo từ danh sách BIN chính thức của NAPAS, kế hoạch phải đối chiếu từng BIN |
| Bảng tài khoản nhận tiền (hồ sơ, ngân hàng, số TK, tên chủ TK, `valid_from/to`, WHO) | `parties` | chính sách có hiệu lực (5.2) | chỉ một dòng mở mỗi hồ sơ; trigger: hồ sơ phải đang mở vai `OWNER_COMPANY` lúc thêm; view công bố tài khoản hiện hành cho module khác đọc |
| Liên kết lần thu ↔ mã giao dịch ngân hàng + số tiền thực chuyển theo mã | `billing` | thực thể chỉ-thêm | dạng cột hay bảng nối do kế hoạch chọn; lần thu cũ không đổi |

Không thêm cột vào `orders`, `bil_payment_receipt` gốc chỉ nhận cột mới nếu kế hoạch chọn cách đó (expand, không sửa dữ liệu cũ). Cập nhật `docs/data-dictionary.json` + `npm run dict`.

## 7. Kỹ thuật

- **Payload VietQR dựng ở máy chủ** bằng một hàm thuần (`src/shared/`, không import module). Payload theo chuẩn EMVCo QR của NAPAS: mã tổ chức VietQR, BIN, số tài khoản, dịch vụ chuyển tới tài khoản, tiền tệ 704, số tiền, quốc gia VN, nội dung, CRC-16. Kế hoạch phải đối chiếu **từng trường với tài liệu VietQR chính thức** (không theo trí nhớ) và có **sổ vàng**: bộ đầu vào cố định → chuỗi payload kỳ vọng, kèm ít nhất một chuỗi lấy từ nguồn công khai đã biết đúng.
- **Trình duyệt chỉ vẽ ma trận QR** từ chuỗi payload máy chủ trả. Vẽ bằng `<canvas>`, không `innerHTML`. Bộ vẽ ma trận là **câu chờ chủ C3** (§9), vì đây sẽ là mã của bên thứ ba **đầu tiên** chạy trên máy người dùng: dự án đang ghi "không có dependency runtime". Lựa chọn trong kế hoạch đăng nhập hai lớp 2026-10-01 Task 7 chỉ là quyết định bề mặt trong một kế hoạch chưa thi công, chưa được chủ duyệt.
  - (a) Chép nguyên tệp `qrcode-generator` (Kazuhiko Arase, giấy phép MIT) vào `web/vendor/qrcode.js`. Giữ dòng giấy phép, đọc hết trước khi chép (không gọi mạng, không `eval`), không thêm vào `package.json`.
  - (b) Tự viết bộ mã hoá QR trong `src/shared/` (chế độ byte, mức sửa lỗi M, phiên bản đủ cho payload VietQR), kèm sổ vàng so với ma trận chuẩn.
- **Không đổi CSP** (`public/_headers`): không ảnh hay lời gọi tới tên miền ngoài. `img-src data: blob:` đã đủ cho ảnh lưu.
- **Route** (tên chốt ở kế hoạch):
  - `GET /api/orders/:id/qr-thanh-toan?soTien=` đọc, hỏi `can(money.view)` theo phạm vi đơn. Đặt ở module `receipt` (hạng không bảng, đã đọc `orders`/`billing`/`parties` cho biên nhận) nếu luật kiến trúc cho phép, kế hoạch kiểm `src/architecture.test.ts`.
  - Đọc / ghi tài khoản nhận tiền hỏi `can(company.legal.write)`.
- **Số tiền:** không gửi `soTien` ⇒ bằng còn lại; `soTien` nguyên dương ≤ còn lại ⇒ dùng; khác ⇒ 400 lời tiếng Việt; còn lại = 0 ⇒ 409 "Đơn không còn tiền cần thu"; chưa cài tài khoản ⇒ 409 "Công ty chưa cài tài khoản nhận tiền — báo Toàn quyền".
- Màn mới hoặc sửa màn đơn theo `web/CLAUDE.md` (dựng bằng `h()`, token CSS, ô gõ 16px); có kịch bản Chrome cho màn đơn có QR và màn cài tài khoản.

## 8. Tiêu chí nghiệm thu (viết trước khi làm)

1. Chưa cài tài khoản ⇒ màn đơn bấm QR thấy câu "Công ty chưa cài tài khoản nhận tiền — báo Toàn quyền", không có mã.
2. Toàn quyền cài tài khoản ⇒ có đúng một dòng hiện hành + một dòng nhật ký. Đổi lần hai ⇒ dòng cũ có `valid_to`, dòng mới mở, cùng một lô. Kế toán / Quản trị / Bán hàng gọi route ghi ⇒ 403.
3. Phạm vi xem QR khớp `money.view`: HDV với đơn đang phụ trách ⇒ 200, với đơn khác ⇒ bị từ chối như route đơn hôm nay. Cộng tác viên / đại lý / thực tập với đơn mình lập ⇒ 200, đơn người khác ⇒ bị từ chối. Tài xế ⇒ bị từ chối.
4. Số tiền: đơn 1.000.000đ đã thu 300.000đ ⇒ mặc định 700.000đ; gửi 200.000 ⇒ 200.000; gửi 700.001 ⇒ 400; gửi 0 / số lẻ / chữ ⇒ 400; đơn huỷ hoặc đã thu đủ ⇒ 409.
5. Sổ vàng payload: mọi ca khớp từng ký tự, CRC đúng; nội dung chỉ `[A-Z0-9]`.
6. **Chủ dự án quét thử bằng ít nhất hai ứng dụng ngân hàng khác nhau** trên mã thật: thấy đúng ngân hàng, tên chủ tài khoản, số tiền, nội dung. AI không tự xác nhận mục này.
7. "Khách đã chuyển khoản" ⇒ form ghi lần thu điền sẵn đúng số tiền, hình thức, người thu. Ghi xong ⇒ dòng giữ hộ trên người khai (hành vi cũ không đổi). Người không có `payment.receive` với đơn ⇒ không thấy nút.
8. Đ6: Kế toán xác nhận với mã đã dùng cho cùng đơn ⇒ chặn; tổng theo mã vượt số thực chuyển ⇒ chặn (cả máy chủ lẫn trigger, mỗi lớp có bài đỏ trước xanh sau); ô mã nhận chuỗi 12 chữ số, còn ghi chú vẫn chặn chuỗi ≥ 8 chữ số.
9. Tìm `td202610080012` ⇒ ra đơn `TD-20261008-0012`.
10. Ảnh lưu không chứa chữ "hoa hồng", "giá vốn", tên người thu (bài kiểm danh sách trường như `bien-nhan.test.ts`). Kịch bản Chrome không thấy request nào ra tên miền ngoài khi mở QR.
11. `npm test`, `npm run typecheck`, `npm run test:e2e` xanh; `audit-invariants` không lỗi mới; người kiểm độc lập ĐẠT.

## 9. Câu chờ chủ (hỏi một lần, kèm khuyến nghị)

- **C1. Mã giao dịch ngân hàng có bắt buộc không?** Khuyến nghị: **bắt buộc** khi Kế toán bấm "Công ty đã nhận" và khi Kế toán tự ghi lần thu chuyển khoản, kể từ ngày phát hành. Lý do: để trống được thì chặn trùng không có tác dụng. Khoản cũ đã xác nhận trước ngày phát hành không bị đòi bổ sung.
- **C2. Đặc tả đứng trên lỗ đang mở TNV-G4.** Luật "dừng dây chuyền" chỉ có hai đường. **(a)** Vá xong lỗ rồi mới duyệt: làm luôn Đ6a và phần cảnh báo khác đơn (đặc tả 2026-10-06, còn một câu chờ chủ) trước hoặc cùng bản này. **(b)** Chủ **gia hạn** TNV-G4 kèm lý do ghi vào `docs/quyen-hoan.json`. Khuyến nghị **(b)**, lý do đề xuất: "bản QR tự thi công phần Đ6 lõi nằm trong chính kế hoạch vá TNV-G4; phần còn lại (Đ6a, cảnh báo khác đơn) làm theo đặc tả 2026-10-06", hạn mới do chủ chọn. Bản này thực hiện một phần mục `ke_hoach` của TNV-G4 ("ô mã giao dịch ngân hàng").
- **C3. Bộ vẽ ma trận QR** (§7). Khuyến nghị **(a) chép tệp MIT**: thư viện dùng rất rộng, ít rủi ro sai hơn tự viết. Đổi lại là một tệp mã ngoài trong kho, cần người kiểm đọc hết. (b) tự viết thì không có mã ngoài, nhưng thêm vài trăm dòng mã tự làm, dễ sai ở phần sửa lỗi.

## 10. Giả định đã tự đặt (bề mặt, đảo được; ghi để chủ xem)

- Phần cảnh báo "cùng mã ở đơn khác" của Đ6 tách sang đặc tả 2026-10-06 (bảng luật trùng dùng chung), đúng như đặc tả đó đã đề xuất tách. Chặn cứng "tổng theo mã ≤ số thực chuyển" đã đủ ngăn mất tiền kiểu KT02. Hoàn tác: gộp lại vào bản này nếu chủ muốn.
- Nút QR dùng ô `money.view`, đúng câu đã trình chủ ("ai đang xem được tiền của đơn đó"). Nút "Khách đã chuyển khoản" dùng `payment.receive`. Hai ô này khác nhau ở Bán hàng: xem tiền mọi đơn nhưng chỉ ghi lần thu đơn mình lập, cho tới khi ADR-0099 được thi công. Vì vậy nhân viên kinh doanh mở được QR cho đơn người khác nhưng không bấm được "Khách đã chuyển khoản" ở đơn đó.
- Tên chủ tài khoản do Toàn quyền gõ, Nền tảng không tra ngân hàng để kiểm.
- Danh sách ngân hàng gieo các ngân hàng phổ biến. Thêm ngân hàng = thêm dòng dữ liệu bằng migration mới, không sửa mã.

## 11. Phụ thuộc và thứ tự với việc khác

- Sổ tiền lượt 2 (đối soát đại lý, ADR-0077–0081) làm **sau** bản này, theo kế hoạch riêng, phát hành một bản theo README lượt 2. Đơn của CTV có khách trả qua QR trước lượt 2: tiền đã vào sổ là "Công ty thu". Hoa hồng được chụp bù khi lượt 2 chạy (ADR-0079 "đơn cũ Kế toán chụp bù").
- Kế hoạch lượt 2 sẽ đứng trên các lỗ TNV-G1/G3/G4 và HC-4.2 (điều chỉnh sổ cần người duyệt khác người tạo) nếu chúng còn mở lúc đó.
- Số ADR: 0103 (lớn nhất hiện có trên mọi nhánh là 0102). Số migration chốt lúc lập kế hoạch theo luật "lớn nhất + 1, rà mọi nhánh chưa gộp".
