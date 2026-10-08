# Đặc tả: mã QR thanh toán (VietQR) trên đơn + mã giao dịch ngân hàng khi Kế toán xác nhận

- **Ngày:** 2026-10-08. **Người soạn:** AI (phiên lập kế hoạch, nhánh `claude/ticket-sales-qr-payment-cf8e18`, mốc `main` @`4d98a205`).
- **Trạng thái:** **ĐÃ DUYỆT** — chủ dự án 2026-10-08 (chat, "Duyệt (Recommended)"), cùng ADR-0108 (`docs/adr/ADR-0108-qr-thanh-toan-vietqr.md`, chép từ bản nháp `ADR-00xx-qr-thanh-toan-vietqr.md` cùng thư mục). Người kiểm độc lập vòng 1, 2, 3 đều ĐẠT CÓ ĐIỀU KIỆN; vòng 3 không còn CAO; điều kiện cuối (C4) chủ đã trả lời. Bảng theo dõi ở §12. Đặc tả đã duyệt là chuẩn tắc: sửa sau này bằng bản mới trỏ về bản này. Kèm: ADR nháp `ADR-00xx-qr-thanh-toan-vietqr.md` và trang ghép `trang-ghep.md` cùng thư mục.
- **Loại việc:** việc lớn (tiền, quyền, dữ liệu): sau thi công bắt buộc người kiểm độc lập chỉ đọc (CLAUDE.md §3).
- **Xây trên lỗ đang hở: TNV-G1, TNV-G3, TNV-G4, HC-4.2** (`docs/quyen-hoan.json`, cả bốn mức HIGH, hạn 2026-10-31):
  - **TNV-G1:** nút QR ẩn ở đơn huỷ nhờ `conLai` trả 0, mà đó là phần sửa của G1 (migration 0078–0079).
  - **TNV-G3:** đường sửa nhập nhầm sau "Đã giao" là lệnh "Thay lần thu" (migration 0083); lối gỡ khai trùng sau "Đã giao" là người khai nộp qua quyết toán có sẵn; đ9 phân định trách nhiệm (phần còn chờ của G3) sẽ thêm một lối nữa khi có (§5).
  - **TNV-G4:** QR làm số khoản chuyển khoản tăng mạnh, đụng đúng ca KT02 "hai người khai cùng một khoản". Bản này **thi công luôn phần Đ6** nằm trong `ke_hoach` của G4. Sau bản này, Đ5d, Đ6a và phần cảnh báo khác đơn vẫn còn hở.
  - **HC-4.2:** trần "số tiền thực chuyển" do một Kế toán nhập, không có người thứ hai duyệt; chống cố ý nhập sai thuộc luật hai người của HC-4.2 (§5).
  - **Điều kiện phát hành:** migration 0078–0083 đã có trên production, kiểm bằng lệnh chỉ đọc lúc phát hành (`wrangler d1 migrations list … --remote`), không tin tài liệu. Chủ đã chọn C2 = "Cho phép, có ghi lý do" (2026-10-08). Lý do ghi ở thông điệp commit `17e795da` và trường `xay_tren_cho_phep` của bốn mục trong `docs/quyen-hoan.json`. **Đây là ngoại lệ do chủ quyết, không phải gia hạn**: hạn 31/10 giữ nguyên, còn luật CLAUDE.md §3 chỉ ghi hai đường (vá, hoặc gia hạn có lý do).

## 1. Tóm tắt cho chủ (lời thường)

Người bán (nhân viên kinh doanh, hướng dẫn viên đang phụ trách đơn, cộng tác viên, đại lý) mở đơn và bấm **"QR thanh toán"**. Số tiền mặc định bằng số còn lại của đơn, muốn thu cọc thì gõ số nhỏ hơn. Mã QR hiện ngay trên điện thoại để khách quét. Muốn gửi khách ở xa thì bấm "Lưu ảnh" rồi gửi qua Zalo. Tiền luôn vào **một tài khoản công ty**, và chỉ Toàn quyền nhập hay đổi được tài khoản này.

Khách chuyển xong, người bán bấm **"Khách đã chuyển khoản"**. Nền tảng ghi lần thu như hôm nay: người bán tạm đứng tên giữ hộ khoản đó cho tới khi Kế toán đối chiếu sao kê và bấm xác nhận. Lúc xác nhận, Kế toán gõ **mã giao dịch ngân hàng** và **số tiền thực chuyển**. Nền tảng chặn trường hợp cùng một khoản chuyển bị xác nhận hai lần cho cùng đơn. Nền tảng cũng chặn trường hợp tổng các lần thu gắn một mã vượt số tiền thực chuyển. Nền tảng **không** tự đọc tài khoản ngân hàng ở bản này.

## 2. Lời chủ đã chốt (2026-10-08, trong chat; không hỏi lại)

| Câu | Chủ chọn |
|---|---|
| "Chính sách đại lý" nghĩa là gì | **Giá lẻ + hoa hồng** (đúng ADR-0077, không bảng giá net) |
| QR cho đơn nào | **Khách lẻ và khách của CTV/đại lý** (tiền vào tài khoản công ty; hoa hồng tính sau ở sổ tiền lượt 2) |
| Tiền về thì ai xác nhận | **Kế toán bấm xác nhận** (luồng "Công ty thu – chuyển khoản" có sẵn); tự động đọc ngân hàng để lượt sau |
| Hướng dẫn viên nội bộ | **Chỉ hiện QR cho đơn đang phụ trách**, không mở quyền tự lập đơn |
| QR hiện ở đâu | **Trên màn đơn + nút lưu ảnh**; **không** in vào ảnh xác nhận / biên nhận |
| Số tiền QR | **Còn lại, hoặc số nhỏ hơn** (thu cọc); máy chủ chặn số lớn hơn còn lại |
| "Đối soát từng giao dịch" | **Từng đơn rõ ai nợ ai, trả từng đơn hoặc gộp cuối tháng**, đúng ADR-0080 |
| Thêm chức năng khác đợt này | **Không**, chỉ QR + đối soát |
| Ra QR cùng "mã giao dịch ngân hàng" hay trước | **Ra cùng một lần** |
| Ai nhập / đổi số tài khoản | **Chỉ Toàn quyền** |
| Thiết kế QR bốn bước | **Đúng, viết đặc tả** |

## 3. Phạm vi

**Trong bản này:** (a) tài khoản nhận tiền của công ty chủ; (b) màn và route QR trên đơn; (c) lối tắt "Khách đã chuyển khoản" vào form ghi lần thu có sẵn; (d) ADR-0092 Đ6 (ô mã giao dịch ngân hàng, hai luật chặn, đường sửa); (e) tìm đơn bằng nội dung chuyển khoản không dấu gạch.

**Không trong bản này:**
- **Đối soát đại lý.** Phần này là thi công sổ tiền lượt 2 (ADR-0077–0081), làm theo kế hoạch riêng, ngay sau bản này (§11). Đây là cách chia việc, không bỏ việc.
- Tự đọc biến động số dư, webhook ngân hàng hay dịch vụ trung gian (SePay, Casso, PayOS…). Việc này cần ADR riêng và phải đi qua hộp thư đi (Hiến chương 5.16).
- QR trên ảnh xác nhận / biên nhận gửi khách.
- QR để đại lý trả số chênh khi quyết toán. Việc này để lại cho sổ tiền lượt 2.
- Phần cảnh báo "cùng mã ở đơn khác" của Đ6, Đ6a và Đ5d. Ba phần này theo đặc tả `2026-10-06-bang-luat-trung-dung-chung.md` và `2026-10-06-tin-bao-so-tien.md` (còn câu chờ chủ).

## 4. Hành vi

### 4.1 Tài khoản nhận tiền
- Toàn quyền vào hồ sơ công ty → "Tài khoản nhận tiền". Màn này có ba ô: chọn ngân hàng từ danh sách, số tài khoản (chỉ chữ số), tên chủ tài khoản (chữ in hoa không dấu, đúng như ngân hàng in).
- Mỗi lúc **tối đa một** tài khoản hiện hành cho công ty chủ. Đổi tài khoản thì đóng dòng cũ và mở dòng mới trong cùng một lô ghi, kèm nhật ký. Không ghi đè, không xoá.
- Nhật ký ghi ai, lúc nào, mã dòng. **Không chép số tài khoản vào nhật ký** (Hiến chương 5.12, CLAUDE.md §7); lịch sử số nằm trong chính bảng tài khoản.
- Người khác (kể cả Kế toán, Quản trị) gọi route ghi → 403.
- Đổi công ty chủ (ADR-0043) sang hồ sơ chưa có tài khoản ⇒ QR trả 409 "Công ty chưa cài tài khoản nhận tiền — báo người phụ trách hệ thống" cho tới khi Toàn quyền nhập. **Không** lấy tài khoản của công ty cũ. Chấp nhận khoảng trống này (an toàn hơn), không thêm vào điều kiện `owner_company_incomplete`. Đổi đi rồi đổi lại về hồ sơ cũ thì tài khoản còn mở của hồ sơ đó được dùng lại; màn đổi công ty chủ nhắc Toàn quyền kiểm lại tài khoản nhận tiền.
- Số tài khoản **không** nạp vào kho tri thức của Trợ lý Mai hay vào hướng dẫn.

### 4.2 Nút và màn QR
- Nút **"QR thanh toán"** hiện trên chi tiết đơn khi **đủ cả** các điều kiện sau:
  - người xem qua được `order.view` với đơn đó (như route biên nhận hôm nay);
  - có `money.view` với đơn đó;
  - đơn **chưa "Đã giao"**;
  - còn lại > 0 theo hàm duy nhất `conLai`.
- Vì vậy đơn huỷ (còn lại 0), đơn đã thu đủ và đơn đã giao đều không có nút. Đơn nháp **có** nút, giống việc hôm nay ghi được lần thu trước khi xác nhận.
- Bấm nút ⇒ ô số tiền điền sẵn số còn lại. Người bán sửa thành số nhỏ hơn được. Máy chủ trả DTO QR, trình duyệt vẽ mã.
- Dưới mã in: tên công ty, tên ngân hàng, số tài khoản, tên chủ tài khoản, số tiền (định dạng `1.000.000đ`), nội dung chuyển khoản, mã đơn. **Không** in hoa hồng, giá vốn, nợ nội bộ, tên người thu (Hiến chương 4.4).
- Nút **"Lưu ảnh"**: dựng ảnh PNG từ canvas. Trên iPhone, Nền tảng mở bảng chia sẻ nếu máy hỗ trợ, nếu không thì tải về.
- Nút **"Khách đã chuyển khoản"** chỉ hiện khi người xem có `payment.receive` với đơn đó và `coTheGhiThu`. Bấm vào mở form ghi lần thu có sẵn, điền trước số tiền vừa hiện trên QR, hình thức "Chuyển khoản", người thu "Công ty". **Không** điền nội dung chuyển khoản vào ghi chú, vì ghi chú chặn chuỗi ≥ 8 chữ số. Từ đây là luồng hôm nay: người không phải Kế toán khai thì sinh dòng giữ hộ trên người khai, chờ Kế toán xác nhận (ADR-0026 H3, ADR-0092 Đ2b).
- **Nội dung chuyển khoản** = mã đơn bỏ dấu gạch: `TD-20261008-0012` → `TD202610080012`. Chỉ chữ in hoa và số, không dấu cách.

### 4.3 Tìm đơn bằng nội dung chuyển khoản
- Gõ `TD202610080012` (có hay không gạch, hoa hay thường) vào ô tìm đơn thì ra đúng đơn `TD-20261008-0012`.

## 5. ADR-0092 Đ6: mã giao dịch ngân hàng (cùng bản phát hành)

Phần lõi là thi công **một điều đã duyệt** (ADR-0092 Đ6, accepted 2026-10-03). Ba chi tiết dưới đây **thêm vào hoặc bớt khỏi chữ của Đ6** và được ghi rõ để chủ duyệt cùng đặc tả này:

| # | Thay đổi so với chữ Đ6 | Lý do |
|---|---|---|
| T1 | Đòi mã ở **mọi đường** làm một lần thu "chuyển khoản – Công ty thu" thành "công ty đã nhận", không chỉ lúc "Công ty đã nhận" (danh sách đường ở dưới) | không có thì khoản do Kế toán / Toàn quyền ghi thẳng lọt khỏi chặn trùng |
| T2 | **Số tiền thực chuyển** lưu trên từng dòng nối lần thu ↔ mã; mọi dòng còn hiệu lực của cùng mã phải ghi **cùng một số** | Đ6 đòi "tổng ≤ số thực chuyển (Kế toán nhập theo sao kê)", cần chỗ lưu; lưu trên dòng nối thì không cần bảng riêng và không cần đường sửa riêng |
| T4 | Tách phần **cảnh báo khác đơn** của Đ6 sang đặc tả 2026-10-06 | đúng như đặc tả đó đề xuất; chặn cứng "tổng ≤ số thực chuyển" đã đủ ngăn mất tiền kiểu KT02 |

(Bản vòng 2 có thêm T3 là "đường sửa mã / số thực chuyển bằng dòng thay thế". Người kiểm vòng 2 chỉ ra đường này bị lách: tự đổi sang mã mới để đặt trần tuỳ ý, hoặc nhờ người khác hạ một đồng rồi tự nâng lại. Nó còn làm lượt duyệt vượt trần 3. Vì vậy **T3 đã bỏ**, xem mục "Sửa khi nhập nhầm" dưới đây.)

**Đường ghi phải đòi mã (T1, C1).** Chỉ áp cho lần thu hình thức **chuyển khoản**, người thu **Công ty**; Công ty thu bằng tiền mặt không áp.
1. Kế toán / Toàn quyền bấm **"Công ty đã nhận"** cho khoản do người khác khai.
2. Kế toán / Toàn quyền **tự ghi** lần thu (`POST /api/orders/:id/payments`, nhánh Kế toán: không sinh dòng giữ hộ), và **Toàn quyền** ghi lần thu kèm lúc bấm **"Đã giao"** (`POST /api/orders/:id/delivered`, ô `order.handover` + `payment.receive`; Kế toán thuần không bấm được Đã giao). Quản trị hay hướng dẫn viên ghi kèm Đã giao thì sinh dòng giữ hộ như khai thường, mã đến ở đường 1.
3. Lần thu mới trong lô **"Thay lần thu"** (ADR-0088).

Khoản do người không phải Kế toán khai (dòng giữ hộ) **chưa** cần mã. Mã đến lúc Kế toán xác nhận (đường 1).

**Luật:**
- **Chuẩn hoá mã:** chỉ giữ chữ và số (bỏ dấu cách, `-`, `.`, `/`), đổi chữ in hoa. Độ dài sau chuẩn hoá 4–40 ký tự. Ô mã **được miễn** luật chặn chuỗi ≥ 8 chữ số; luật đó vẫn áp cho ghi chú và lý do.
- **Chặn trùng cùng đơn:** cùng mã đã chuẩn hoá đã gắn vào một lần thu còn hiệu lực của cùng đơn ⇒ chặn.
- **Chặn số thực chuyển lệch:** mã đã có dòng nối còn hiệu lực ghi số thực chuyển A, lần nhập mới ghi số khác A ⇒ chặn, câu báo nêu A. Giao diện điền sẵn A khi Kế toán gõ một mã đã biết.
- **Chặn vượt số thực chuyển:** tổng các lần thu còn hiệu lực gắn cùng mã (mọi đơn) > A ⇒ chặn.
- **"Còn hiệu lực"** = đúng vị từ `hieuLuc` của `billing/rules.ts`, tức vị từ `conLai` đang dùng: không phải dòng đảo và chưa bị đảo. Dòng nối của lần thu đã bị đảo **tự rơi khỏi** mọi phép kiểm. Như vậy tổng theo mã và "còn lại" không bao giờ lệch nhau (5.4). Trigger CSDL viết lại cùng vị từ bằng SQL, có ca so trigger với hàm thuần.
- **Trong lô "Thay lần thu"** (lô chạy: ghi lần thu mới → ghi dòng đảo của lần thu cũ → phiếu): dòng nối mã của lần thu mới được chèn **sau** bước ghi dòng đảo. Lúc đó lần thu cũ đã rơi khỏi `hieuLuc`, nên trigger dùng vị từ thường là đủ, không cần dấu riêng của lô. **Máy chủ** kiểm trước lô, khi lần thu cũ còn hiệu lực: nó phải **loại các lần thu trong danh sách cần thay** (`cu`) khi kiểm trùng, lệch và tổng. Kế toán nhập mã cho **từng** lần thu mới là chuyển khoản – Công ty thu. Giao diện điền sẵn mã cũ khi thay một-đổi-một; máy chủ không tự chép.
- **Sửa khi nhập nhầm** (mã hoặc số thực chuyển): **không có đường sửa riêng**, dùng đường sửa sai sổ tiền đã có. Trước "Đã giao": Kế toán **đảo lần thu** rồi ghi lại đúng. Sau "Đã giao": **"Thay lần thu"**. Cả hai đều là lệnh sổ đã có kiểm soát (ô `ledger.write`, nhật ký). Dòng nối của lần thu bị đảo rơi khỏi kiểm, nên số thực chuyển của mã được nhập lại đúng nếu không còn lần thu nào khác giữ mã đó. Lưu ý: trần A **không** chống được việc một Kế toán cố ý nhập sai ngay lần đầu. Nó chống khai trùng và gõ nhầm giữa các lần nhập. Chống cố ý thuộc luật hai người của HC-4.2 khi được vá.
- **Lối ra khi khai trùng bị chặn.** Ví dụ: người bán khai "Khách đã chuyển khoản" hai lần cho cùng một khoản, Kế toán xác nhận lần thứ hai thì bị chặn. Lần khai thừa vẫn để người khai đứng tên giữ hộ. Đó đúng là sự thật trên sổ: người đó đã khai một khoản tiền không về tài khoản.
  - **Trước "Đã giao":** Kế toán **đảo lần thu** thừa, dòng giữ hộ đảo theo (ADR-0092 Đ4).
  - **Sau "Đã giao":** lệnh "Thay lần thu" **không** dùng được, vì mã từ chối thay khoản còn chờ xác nhận (`thay-lan-thu.ts`, lỗi `ck_cho_xac_nhan`). Khoản thừa là **nợ của người khai**. Lối ra là đường có sẵn: người khai **nộp** khoản đó, Kế toán ghi bằng lệnh quyết toán một chiều có sẵn. Khi đ9 phân định trách nhiệm (ADR-0088, nằm trong phần còn chờ của TNV-G3) được thi công thì thêm lối ra đó. Tới lúc khoản đó được tất toán, đơn ở "Đã giao", chưa "Hoàn thành" được (trigger có sẵn).
  - Hộp báo chặn nói rõ lối ra theo từng trường hợp.
- **Ai thấy mã và số thực chuyển:** chỉ người có `ledger.write` (Kế toán, Toàn quyền). Người khác chỉ thấy "đã xác nhận".
- **Nhật ký** của gắn mã ghi mã dòng, **không** chép mã giao dịch hay số tài khoản.
- **Hai lớp:** mọi luật chặn có ở máy chủ và ở trigger trên dòng nối (Hiến chương 5.1). Riêng điều "**bắt buộc** có mã" (C1): máy chủ kiểm ở cả ba đường. Lớp CSDL: đường 1 và 3 có phiếu cuối lô (`COMPANY_RECEIVED`, `REPLACEMENT`) để gắn trigger theo khuôn `bil_posting` của migration 0083; **đường 2 (Kế toán tự ghi trước Đã giao) chỉ có lần thu + nhật ký, không có phiếu**, nên ghi thẳng là **"chỉ máy chủ"** và khai ở bảng thi hành (dựa vào kỷ luật ở lớp CSDL).
- Thêm luật vào `scripts/audit-invariants.mjs` (mỗi mã: các dòng còn hiệu lực cùng số thực chuyển, tổng ≤ số đó). Thêm dòng vào `docs/SO-HANG-RAO.md` sau khi quan sát chặn thật.
- **C1** (§9): mã bắt buộc từ mốc cắt cứng lưu trong CSDL lúc phát hành.

## 6. Dữ liệu (tên đề xuất; kế hoạch chốt cột; migration chỉ thêm, số từ lớn nhất trên mọi nhánh + 1 — nhánh `a3-tin-don-doi` đã có `0086`)

| Bảng | Module | Loại (Hiến chương 2.2) | Ghi chú |
|---|---|---|---|
| `pty_bank` | `parties` | dữ liệu tra cứu | mã, BIN 6 số, tên ngắn, tên đầy đủ, `active`; gieo từ danh sách BIN chính thức của NAPAS, kế hoạch đối chiếu từng BIN |
| `pty_bank_account` | `parties` | chính sách có hiệu lực (5.2) | hồ sơ, ngân hàng, số TK, tên chủ TK, `valid_from/to`, WHO; một dòng mở mỗi hồ sơ (chỉ mục duy nhất có điều kiện); trigger: hồ sơ phải đang mở vai `OWNER_COMPANY` lúc thêm |
| `bil_receipt_bank_txn` | `billing` | thực thể chỉ-thêm (bảng nối) | `receipt_id` **duy nhất** (một lần thu tối đa một mã), mã đã chuẩn hoá, số thực chuyển, WHO; không cột sửa, không dòng thay thế; lần thu cũ **không đổi**; mốc cắt C1 ở một dòng cấu hình chỉ-thêm của `billing` |

- **Đọc xuyên module:** `receipt` là hạng không bảng (`src/architecture.test.ts`), nên nó **không đọc view**. Nó gọi hàm công bố trong `parties/index.ts` (tài khoản hiện hành của công ty chủ) và `billing/index.ts` (`soTienBienNhan` cho còn lại). Cạnh `receipt → orders/billing/parties` đã được phép.
- Không thêm cột vào `orders` hay `bil_payment_receipt`. Cập nhật `docs/data-dictionary.json` + `npm run dict`.

## 7. Kỹ thuật

- **Payload VietQR dựng ở máy chủ** bằng một hàm thuần (`src/shared/`, không import module). Payload theo chuẩn EMVCo QR của NAPAS: mã tổ chức VietQR, BIN, số tài khoản, dịch vụ chuyển tới tài khoản, tiền tệ 704, số tiền, quốc gia VN, nội dung, CRC-16. Kế hoạch phải đối chiếu **từng trường với tài liệu VietQR chính thức** (không theo trí nhớ) và có **sổ vàng**: bộ đầu vào cố định → chuỗi payload kỳ vọng, kèm ít nhất một chuỗi lấy từ nguồn công khai đã biết đúng.
- **Trình duyệt chỉ vẽ ma trận QR** từ chuỗi payload máy chủ trả, bằng `<canvas>`, không `innerHTML`. Bộ vẽ ma trận là **câu C3** (§9, chủ đã chọn (a)), vì đây sẽ là mã của bên thứ ba **đầu tiên** chạy trên máy người dùng, trong khi dự án đang ghi "không có dependency runtime". Lựa chọn trong kế hoạch đăng nhập hai lớp 2026-10-01 Task 7 chỉ là quyết định bề mặt trong một kế hoạch chưa thi công, chưa được chủ duyệt.
  - (a) Chép nguyên tệp `qrcode-generator` (Kazuhiko Arase, giấy phép MIT) vào `web/vendor/qrcode.js`. Giữ dòng giấy phép, đọc hết trước khi chép (không gọi mạng, không `eval`, không `innerHTML`), không thêm vào `package.json`. Thêm bài kiểm quét tệp này không có `innerHTML` / `eval` / `fetch`, vì hiện chưa bài nào quét `.js` trong `web/` cho các chữ đó.
  - (b) Tự viết bộ mã hoá QR trong `src/shared/` (chế độ byte, mức sửa lỗi M, phiên bản đủ cho payload VietQR), kèm sổ vàng so với ma trận chuẩn.
- **Không đổi CSP** (`public/_headers`) và **không gọi mạng ra ngoài**: `img-src data: blob:` đã đủ cho ảnh lưu. Service worker không đệm `/api/*` (`sw-policy.ts` danh sách cho phép, `cache-control: no-store`), nên số tiền QR không thể là số cũ do đệm.
- **Route** (tên chốt ở kế hoạch):
  - `GET /api/orders/:id/qr-thanh-toan?soTien=` ở module `receipt`, **cổng `orders`** của router (như `GET /api/orders/:id/receipt`; cổng `office` sẽ chặn hướng dẫn viên, cộng tác viên, thực tập). Thân hỏi **`order.view` trước** (chỉ-HDV không phụ trách nhận 404 như biên nhận, không dò được đơn tồn tại), **rồi `money.view`** theo phạm vi đơn, rồi mới đọc tài khoản và tiền.
  - Đọc / ghi tài khoản nhận tiền hỏi `can(company.legal.write)`.
  - Route mới thêm vào snapshot `src/route-access.test.ts`.
- **Số tiền:** không gửi `soTien` ⇒ bằng còn lại; `soTien` nguyên dương ≤ còn lại ⇒ dùng; khác ⇒ 400 lời tiếng Việt; đơn đã "Đã giao" ⇒ 409 "Đơn đã giao — không thu thêm"; còn lại = 0 ⇒ 409 "Đơn không còn tiền cần thu"; chưa cài tài khoản ⇒ 409 "Công ty chưa cài tài khoản nhận tiền — báo người phụ trách hệ thống".
- **Ô `company.legal.write` mở rộng nghĩa** (nay gồm cả tài khoản nhận tiền): cập nhật nhãn `src/shared/tro-ly-cau-truc-ten.ts` và `docs/SYSTEM-DESIGN.md`.
- Màn mới hoặc sửa màn đơn theo `web/CLAUDE.md` (dựng bằng `h()`, token CSS, ô gõ 16px); có kịch bản Chrome cho màn đơn có QR và màn cài tài khoản.

## 8. Tiêu chí nghiệm thu (viết trước khi làm)

1. Chưa cài tài khoản ⇒ màn đơn bấm QR thấy câu "Công ty chưa cài tài khoản nhận tiền — báo người phụ trách hệ thống", không có mã.
2. Toàn quyền cài tài khoản ⇒ có đúng một dòng hiện hành + một dòng nhật ký **không chứa số tài khoản**. Đổi lần hai ⇒ dòng cũ có `valid_to`, dòng mới mở, cùng một lô. Kế toán / Quản trị / Bán hàng gọi route ghi ⇒ 403.
3. Phạm vi xem QR, đi **cổng `orders`**:
   - hướng dẫn viên với đơn đang phụ trách ⇒ 200; với đơn khác ⇒ 404 (như biên nhận);
   - cộng tác viên / đại lý / thực tập với đơn mình lập ⇒ 200; với đơn người khác ⇒ bị từ chối như route đơn;
   - tài xế ⇒ bị từ chối ở cổng.
4. Số tiền, ví dụ đơn 1.000.000đ đã thu 300.000đ:
   - mặc định ⇒ 700.000đ;
   - gửi 200.000 ⇒ 200.000; gửi 700.001 ⇒ 400; gửi 0, số lẻ hoặc chữ ⇒ 400;
   - đơn huỷ hoặc đã thu đủ ⇒ 409; đơn **đã "Đã giao" mà còn lại > 0** (đơn lệch cũ) ⇒ 409 và **không** có nút.
5. Sổ vàng payload: mọi ca khớp từng ký tự, CRC đúng; nội dung chỉ `[A-Z0-9]`.
6. **Chủ dự án quét thử bằng ít nhất hai ứng dụng ngân hàng khác nhau** trên mã thật: thấy đúng ngân hàng, tên chủ tài khoản, số tiền, nội dung. AI không tự xác nhận mục này.
7. "Khách đã chuyển khoản" ⇒ form ghi lần thu điền sẵn đúng số tiền, hình thức, người thu, ghi chú để trống. Ghi xong ⇒ dòng giữ hộ trên người khai (hành vi cũ không đổi). Người không có `payment.receive` với đơn ⇒ không thấy nút.
8. Đ6, mỗi luật có bài đỏ trước xanh sau ở **cả máy chủ lẫn trigger**:
   - trùng mã cùng đơn ⇒ chặn; số thực chuyển khác số đã ghi cho mã ⇒ chặn; tổng theo mã vượt số thực chuyển ⇒ chặn;
   - "Thay lần thu" một lần thu có mã, lần thu mới nhập lại **cùng** mã ⇒ **không** bị chặn (dòng nối chèn sau dòng đảo);
   - đảo lần thu có mã rồi ghi lại với số thực chuyển khác ⇒ được khi không còn lần thu nào khác giữ mã đó;
   - ba đường ghi (Công ty đã nhận; Kế toán / Toàn quyền tự ghi, Toàn quyền ghi kèm Đã giao; Thay lần thu) thiếu mã sau mốc cắt ⇒ 400; Quản trị ghi kèm Đã giao ⇒ dòng giữ hộ, không đòi mã; Công ty thu bằng tiền mặt ⇒ không đòi mã;
   - khai trùng bị chặn sau "Đã giao" ⇒ khoản thừa nằm ở người khai; người khai nộp (quyết toán) xong thì đơn Hoàn thành được;
   - ô mã nhận chuỗi 12 chữ số, còn ghi chú / lý do vẫn chặn chuỗi ≥ 8 chữ số;
   - người không có `ledger.write` không thấy mã và số thực chuyển trong DTO;
   - nhật ký không chứa mã giao dịch.
9. Tìm `td202610080012` ⇒ ra đơn `TD-20261008-0012`.
10. Ảnh lưu không chứa chữ "hoa hồng", "giá vốn", tên người thu (bài kiểm danh sách trường như `bien-nhan.test.ts`). Kịch bản Chrome không thấy request nào ra tên miền ngoài khi mở QR.
11. `npm test`, `npm run typecheck`, `npm run test:e2e` xanh; `audit-invariants` có luật tổng-theo-mã và không lỗi mới; dòng mới ở `docs/SO-HANG-RAO.md` có ngày quan sát chặn thật; người kiểm độc lập ĐẠT.

## 9. Câu hỏi chủ — ĐÃ TRẢ LỜI 2026-10-08 (chat, cả ba theo khuyến nghị)

| Câu | Chủ chọn | Đã thi hành ở |
|---|---|---|
| C1 | "Bắt buộc từ ngày phát hành" | §5 luật; kế hoạch thêm mốc cắt cứng trong CSDL |
| C2 | "Cho phép, có ghi lý do" | trường `xay_tren_cho_phep` ở bốn mục TNV-G1, G3, G4, HC-4.2 của `docs/quyen-hoan.json` (hạn giữ nguyên 31/10) |
| C3 | "Chép bộ vẽ miễn phí" | §7 phương án (a) |

**C4 — ĐÃ TRẢ LỜI 2026-10-08: "Chấp nhận, sửa sau (Recommended)".** Ca kẹt "mã dùng chung nhiều đơn đã giao, số thực chuyển nhập sai" (§10 "Hạn chế đã biết"). Khuyến nghị: **chấp nhận là hạn chế đã biết**; lối ra tạm là người phụ trách hệ thống sửa bằng SQL theo sổ tay, có nhật ký; đường sửa trong Nền tảng làm cùng việc vá HC-4.2. Phương án khác: làm đường sửa ngay, thêm một quyết định nên phải tách lượt duyệt, chậm hơn.

Nội dung câu hỏi gốc (giữ để đối chiếu):

- **C1. Mã giao dịch ngân hàng có bắt buộc không?** Khuyến nghị: **bắt buộc** khi Kế toán bấm "Công ty đã nhận" và khi Kế toán tự ghi lần thu chuyển khoản. Áp với lần thu **ghi sau mốc cắt cứng** lưu trong CSDL lúc phát hành (khuôn `bil_audit_cutoff` của migration 0083). Lần thu cũ trước mốc không bị đòi bổ sung. Lý do: để trống được thì chặn trùng không có tác dụng.
- **C2. Đặc tả đứng trên bốn lỗ đang mở (TNV-G1, G3, G4, HC-4.2).** Luật "dừng dây chuyền" chỉ có hai đường:
  - **(a)** Chờ vá xong cả bốn (hạn 31/10) rồi mới duyệt.
  - **(b)** Chủ gia hạn có ghi lý do vào `docs/quyen-hoan.json`.
  - Khuyến nghị **(b)**, lý do đề xuất: "Đặc tả QR chỉ dùng phần đã thi công của G1/G3/G4 (migration 0078–0083), phát hành sau khi các migration này lên production, và tự làm Đ6 trong kế hoạch vá G4; phần còn lại của bốn lỗ giữ hạn cũ."
- **C3. Bộ vẽ ma trận QR** (§7). Khuyến nghị **(a) chép tệp MIT**: thư viện dùng rất rộng, ít rủi ro sai hơn tự viết. Đổi lại là một tệp mã ngoài trong kho, cần người kiểm đọc hết. (b) tự viết thì không có mã ngoài, nhưng thêm vài trăm dòng mã tự làm, dễ sai ở phần sửa lỗi.

## 10. Giả định đã tự đặt (đảo được; ghi để chủ xem)

- **Đối soát đại lý làm sau QR** (§3, §11). Lời chủ "chỉ QR + đối soát" được thi hành bằng hai bản phát hành liên tiếp, không bỏ phần nào.
- **Nút QR dùng ô `money.view`** (sau `order.view`), đúng câu đã trình chủ ("ai đang xem được tiền của đơn đó"). **Nút "Khách đã chuyển khoản" dùng `payment.receive`.** Hai ô này khác nhau ở Bán hàng: xem tiền mọi đơn nhưng chỉ ghi lần thu đơn mình lập, cho tới khi ADR-0099 được thi công. Vì vậy nhân viên kinh doanh mở được QR cho đơn người khác nhưng không bấm được "Khách đã chuyển khoản" ở đơn đó.
- **Tên chủ tài khoản** do Toàn quyền gõ, Nền tảng không tra ngân hàng để kiểm.
- **Hạn chế đã biết — mã dùng chung nhiều đơn đã giao (câu C4):** một lần chuyển trả cho hai đơn trở lên, cả hai đã "Đã giao", và số thực chuyển bị nhập sai ngay từ đầu. Khi đó không lệnh nào trong Nền tảng sửa được: đảo lẻ bị chặn sau Đã giao, còn "Thay lần thu" chỉ trong một đơn nên dòng nối mới luôn lệch với dòng của đơn kia. Lối ra tạm thời là người phụ trách hệ thống sửa bằng SQL theo sổ tay, có nhật ký, tới khi HC-4.2 có luật hai người và đường sửa riêng. Ca này hiếm, vì QR mỗi đơn một mã, nên chỉ xảy ra khi khách tự gộp hai đơn vào một lần chuyển. Thêm route hay luật mới để gỡ ngay thì lượt duyệt thành 4 quyết định.
- **Bỏ đường sửa riêng (T3 của vòng 2)** cho mã và số thực chuyển; sửa đi qua đảo lần thu / Thay lần thu có sẵn. Hoàn tác: thêm đường sửa riêng ở lượt sau, khi HC-4.2 đã có luật hai người.
- **Danh sách ngân hàng** gieo các ngân hàng phổ biến. Thêm ngân hàng = thêm dòng bằng migration mới, không sửa mã.
- **Tin báo khi đổi tài khoản nhận tiền** (cho Kế toán) chưa có ở bản này: hộp thông báo chưa có loại tin từ sổ tiền. Đề xuất ghi vào `docs/superpowers/specs/2026-10-06-tin-bao-so-tien.md` như một loại tin cần có. Trong lúc chờ, nhật ký và lịch sử dòng là dấu vết.

## 11. Phụ thuộc và thứ tự với việc khác

- **Sổ tiền lượt 2** (đối soát đại lý, ADR-0077–0081) làm **sau** bản này, theo kế hoạch riêng, phát hành một bản theo README lượt 2. Đơn của CTV có khách trả qua QR trước lượt 2: tiền đã vào sổ là "Công ty thu". Hoa hồng được chụp bù khi lượt 2 chạy (ADR-0079 "đơn cũ Kế toán chụp bù"). Kế hoạch lượt 2 cũng đứng trên TNV-G1/G3/G4, HC-4.2 nếu chúng còn mở lúc đó.
- **Số ADR:** dùng số tạm `00xx`. Nhánh `a1-luat-loi-chuyen` (lượt Vận chuyển, cùng ngày) đã giữ 0103 và 0104 làm số tạm. Số chính thức chốt khi chép vào `docs/adr/` theo thứ tự chủ duyệt.
- **Số migration** chốt lúc lập kế hoạch theo luật "lớn nhất + 1, rà mọi nhánh chưa gộp" (nhánh `a3-tin-don-doi` đã có `0086`).
- **Khi phát hành:** cập nhật phần "CÒN CHỜ" của TNV-G4 trong `docs/quyen-hoan.json` (bỏ Đ6, giữ Đ5d, Đ6a, cảnh báo khác đơn).

## 12. Theo dõi góp ý người kiểm độc lập

### Vòng 3 (2026-10-08) — sửa ở bản vòng 4

Kết luận vòng 3: ĐẠT CÓ ĐIỀU KIỆN, **không CAO**. Người kiểm dựng kịch bản bằng `tests/audit/harness.mjs` (tệp thử ngoài kho) và xác nhận:
- nộp qua quyết toán tất toán được khoản chờ xác nhận trên đơn đã giao, sau đó Hoàn thành được;
- đảo lần thu đã xác nhận chạy trước Đã giao; "Thay lần thu" khoản đã xác nhận chạy sau Đã giao;
- thứ tự lô Thay cho phép chèn dòng nối sau dòng đảo.

| Mục | Sửa ở |
|---|---|
| TRUNG-1 kẹt mã dùng chung nhiều đơn đã giao | §10 "Hạn chế đã biết"; câu C4 cho chủ |
| THẤP-2 ai ghi kèm Đã giao | §5 đường 2 (chỉ Toàn quyền không giữ hộ; Kế toán 403), §8.8; trang ghép §3 thêm hàng route Đã giao |
| THẤP-3 lớp CSDL đường 2 | §5 "Hai lớp": đường 2 chỉ máy chủ |
| THẤP-4 chữ cũ | đầu tệp (G3), §7 (C3), ADR dòng lỗ đang hở và đ3(c) |
| THẤP-5 máy chủ khi Thay | §5: máy chủ loại lần thu trong `cu` |
| THẤP-6 cách đếm | trang ghép §0 ghi "3 nhóm" |


### Vòng 2 (2026-10-08) — sửa ở bản vòng 3

| Mục | Sửa ở |
|---|---|
| CAO-1 lối ra sau Đã giao bằng Thay lần thu không chạy (`ck_cho_xac_nhan`) | §5 "Lối ra khi khai trùng bị chặn": sau Đã giao = người khai nộp (quyết toán có sẵn) hoặc đ9; bỏ lời hứa Thay; §8.8 |
| TRUNG-2 loại trừ "cùng lô" không làm được | §5: dòng nối chèn **sau** dòng đảo, dùng `hieuLuc` thường; máy chủ không tự chép mã; nhập mã cho từng lần thu mới |
| TRUNG-3 "nâng do người khác" bị lách | bỏ T3; §5 "Sửa khi nhập nhầm" nói đúng phạm vi chống được; §10 |
| TRUNG-4 "dòng hiện hành" chưa rõ | bỏ `bil_bank_txn`; số thực chuyển nằm trên dòng nối, `receipt_id` duy nhất, các dòng cùng mã phải cùng số (§5, §6) |
| TRUNG-5 đường ghi hở, C1 mơ hồ | §5 danh sách ba đường (gồm kèm Đã giao và Thay), chỉ chuyển khoản – Công ty thu; lớp CSDL của "bắt buộc" khai thật |
| TRUNG-6 C2 không phải gia hạn | đầu tệp: ghi là ngoại lệ do chủ quyết, lý do ở commit + json |
| TRUNG-7 trần 3 | bỏ T3 ⇒ quyết định 3 chỉ còn Đ6 + T1, T2, T4 + C1 (trang ghép §0) |
| THẤP | câu báo dùng "người phụ trách hệ thống" (§4.1, §7, §8.1); chuẩn hoá mã bỏ `-./` và độ dài 4–40 (§5); ADR không còn ghi "Đ6 giữ nguyên"; đổi công ty chủ qua lại (§4.1); migration từ sau `0086` (§6, §11); cập nhật "CÒN CHỜ" của G4 khi phát hành (§11) |

### Vòng 1 (2026-10-08) — sửa ở bản vòng 2

| Mục | Sửa ở |
|---|---|
| CAO-1 cổng route QR | §7 Route (cổng `orders`, `order.view` trước `money.view`), §8.3 |
| CAO-2 khai lỗ đang hở thiếu | đầu tệp (G1, G3, G4, HC-4.2 + điều kiện phát hành), §9 C2 |
| TRUNG-3 đơn đã giao | §4.2, §7 Số tiền, §8.4 |
| TRUNG-4 Thay lần thu tự chặn | §5 "Trong lô Thay lần thu", §8.8 |
| TRUNG-5 nói quá "không phải quyết định mới" | §5 bảng T1–T4 |
| TRUNG-6 HC-4.2 | §5 Sửa (nâng cần người khác, khai đứng sát HC-4.2) |
| TRUNG-7 chuỗi số, nhật ký | §4.1, §4.2, §5 Nhật ký, §8.2, §8.8 |
| TRUNG-8 số ADR trùng số tạm | §11, đổi tên tệp ADR sang `00xx` |
| TRUNG-9 hoãn đối soát | §3, §10 |
| THẤP | bảng nối (§6), kiến trúc `receipt` không đọc view (§6), snapshot route + sổ hàng rào + audit-invariants (§7, §8.11), nhãn `company.legal.write` (§7), ai thấy mã (§5), tin báo đổi tài khoản (§10), mốc cắt C1 (§9), đổi công ty chủ (§4.1), trích 5.16 (ADR) |
