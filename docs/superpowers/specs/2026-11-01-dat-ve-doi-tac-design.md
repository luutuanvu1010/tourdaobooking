# Thiết kế — màn Đặt vé của đối tác; vai, cấp độ đại lý và tài khoản

> **Trạng thái:** chủ dự án duyệt hướng thiết kế ngày 2026-11-02 («Duyệt thiết kế»). Lời duyệt này cho thi công lượt 1 (§4). Các quyết định ở §5 vẫn phải qua ADR do chủ duyệt riêng. Ngày soạn 2026-11-01.
> **Việc lớn** (dữ liệu, quyền, tiền): thi công xong phải có người kiểm độc lập. Lượt 2 có ba quyết định chạm tiền, dữ liệu, quyền nên phải qua ADR do chủ duyệt (trang ghép ở §6, đúng trần 3).
> **Số dự kiến:** ADR-0154 trở đi, migration `0132` trở đi (`claude/ve-dien-tu-thi-cong-ff85a6` đang giữ ADR-0153 và `0131`). Kiểm lại lúc thi công.
> **Xây trên lỗ đang hở:** QĐ-A ghi lần thu nên chạm `TNV-G1`, `TNV-G3`, `TNV-G4` (sổ tiền, mức HIGH; phép xây đang có chỉ cho QR) và `HC-5.19` (chưa diễn tập khôi phục, phép đang có chỉ cho sổ đại lý đợt 2). **Chủ chọn 2026-11-02: vá trước.** QĐ-A chỉ thi công sau khi các mục này đóng (§3). Lượt 1, QĐ-B, QĐ-C không phụ thuộc; người lập kế hoạch vẫn rà lại `docs/quyen-hoan.json`; AI không tự gia hạn.

## 0. Lời chủ (2026-11-01)

«chúng ta cần thi công lại phân hệ đặt vé, trong đó giao diện đặt vé của vai đối tác (chức năng Đặt vé): (1) cần có phần thu phần trả trước của khách, gọi là Khách đặt cọc trước, (2) ẩn "Thông tin chuyến", thêm dòng Ghi chú (với Place holder là: Thời gian đón), (3) bỏ Nhãn của field Giảm giá và đổi Place holder thành "Giảm giá cho khách", (4) ẩn phần nhập thông tin của khách (bằng cách thêm tùy chọn cho Super Admin trong bảng điều khiển), 5- QUAN trọng: Chúng ta có các vai người dùng bên ngoài công ty chủ quan là: (Hướng dẫn viên, lễ tân, tài xế, lữ hành) cần độc lập với tài khoản người dùng; độc lập với các cấp độ đại lý (từ đại lý cấp 1 -> đại lý cấp 7). Trong đó vai người dùng có thể dễ dàng được gán với cấp độ đại lý (Chẳng hạn vai Lễ tân có thể được gán mặc định cho cấp độ đại lý là Đại lý cấp 3), vẫn giữ quy tắc riêng để gán một lễ tân nào đó ở cấp khác (ví dụ cấp 2 hoặc cấp 4); Trong phần Hoa hồng đối tác, cần thể hiện rất rõ 2 Tab (Trong đó đổi "Loại đối tác thành Cấp độ đại lý). Trong mục Quản lý tài khoản cũng cần có những bộ lọc để dễ dàng lọc ra danh sách tài khoản theo từng vai, đồng thời có thêm cột để thể hiện và thiết lập nhanh cấp độ đại lý cho tài khoản đối tác»

**Bốn câu chủ trả lời cùng ngày (hộp chọn):**

| Câu | Chủ chọn | Theo khuyến nghị? |
|---|---|---|
| Số cọc ghi nhận lúc nào | Thành khoản thu khi đơn được xác nhận | Có |
| Ghi chú có thay giờ đón không | **Ghi chú thay giờ đón** | Không. Chủ đã nghe hệ quả: văn phòng nhập lại giờ, máy không tự kiểm 6 giờ |
| Công tắc ẩn phần nào | **Ẩn cả danh sách hành khách** | Không. Chủ đã nghe hệ quả: tài xế chưa có tên, có thể vướng quy định vận tải |
| Chia thẻ Hoa hồng | Hai thẻ «Cấp độ đại lý» + «Vai người dùng» | Có |
| Phần cọc chạm vùng sổ tiền còn lỗ (2026-11-02) | **Vá các lỗi sổ tiền trước** | Không. Người soạn khuyến nghị chỉ soạn văn bản, chưa làm mã |
| Công tắc đang bật mà xe thiếu tên khách (2026-11-02) | **Bỏ luật với đơn của đối tác** | Không. Chủ đã nghe hệ quả: có thể vi phạm quy định xe hợp đồng, chưa có luật sư xác nhận |

## 1. Ý định

Người ngoài công ty (lễ tân, tài xế, hướng dẫn viên, lữ hành) đặt vé bằng vài thao tác: chọn dịch vụ, số khách, nơi đón, giảm giá, tiền khách đã cọc, một dòng ghi chú. Văn phòng lo phần còn lại. Phía quản lý nhìn rõ ba thứ tách nhau: **tài khoản** là cách đăng nhập, **vai** là người đó làm gì, **cấp độ đại lý** là mức hoa hồng.

**Không làm:** viết lại từ đầu («thi công lại» ở đây là sửa trên màn Tạo đơn có sẵn, người soạn hiểu vậy vì trên mọi nhánh không có màn tên «Đặt vé»); đổi cách tính hoa hồng; thêm mã quyền; đổi đường cho nhân viên văn phòng.

**Thất bại dù chạy được:** sổ tiền lệch hoặc thành khoản thu mà đơn chưa xác nhận; đơn có đón được xác nhận mà không ai nhập giờ; nhân viên nội bộ mang được vai hưởng hoa hồng; người không có quyền xem tiền thấy cấp đại lý.

## 2. Hiện trạng đã đọc trong mã

- Vai, cấp và cấp riêng **đã tách và đã là dữ liệu**: `pty_role_type` (vai), `prc_rate_tier` (cấp), `prc_role_tier` (vai → cấp theo ngày), `prc_party_tier` (một đối tác → cấp riêng, thắng cấp của vai). Có route đặt, đổi, ngừng cấp riêng (ADR-0138, ADR-0151). Tạo bảy cấp và đặt «Lễ tân → Cấp 3» làm được trên màn hình, không cần mã. **Chưa kiểm** production đã có đủ bảy cấp chưa.
- Chỗ dính thật: năm vai có sẵn nhóm bên ngoài (`TRAVEL_AGENCY`, `GUIDE_FREELANCE`, `HOTEL_RECEPTION`, `TAXI_DRIVER`, `COLLABORATOR`) chỉ gán được qua tài khoản. Route vai ở Danh bạ trả 409 `role_via_account`, nên người chưa có tài khoản và công ty lữ hành không mang được các vai này. Loại tự thêm (nhóm `OTHER`, ADR-0117) đã gắn được cho hồ sơ không tài khoản, nhưng đó là tên khác với năm vai chủ đang nói tới và không sinh quyền khi tạo tài khoản.
- Chuyến bị giữ xuất bến khi thiếu tên khách (`THIEU_TEN`, cờ `require_manifest` gieo bằng 1 ở migration `0041`; **chưa kiểm** giá trị trên production). Văn phòng nhập tên ở đơn, tài xế công ty bổ sung được trên chuyến, tài xế đối tác thì không (`trip.passenger.add`).
- Khoản thu không ghi được trên đơn nháp (ADR-0135 Đ7); đơn «chờ xác nhận» vẫn là nháp (ADR-0136 Đ2); đơn đã có khoản thu không gửi xác nhận được (ADR-0136); ô cọc trên form đã bị thay bằng lần thu, ba cột cọc cũ của `orders` là cột chết (ADR-0026 điều 9).
- Tên và SĐT khách bắt buộc ở máy chủ (`orders/rules.ts`). Nút «Điền thông tin của tôi» đã có.
- Chặng đón cho phép chưa có giờ. Cổng 6 giờ coi chặng không giờ là «không dưới mốc» (`moc-toi-thieu.ts`, lý do `KHONG_GIO`), nên **đơn không giờ sẽ rơi nhánh xác nhận thẳng** của Gửi đơn. Bảng «Còn vé» hôm nay cũng chỉ đổi giờ cho chặng đã có giờ (`xac-nhan-don-ui.ts`).
- Phí đón tính theo **nơi đón** (ADR-0147), nên bỏ ô nơi đón sẽ làm sai tiền.
- «Thông tin chuyến» (giờ khởi hành, khách có mặt, ghi chú dịch vụ) không phải điều kiện xác nhận.

## 3. Ba lượt

- **Lượt 1, không cần ADR** (chỉ giao diện, đảo ngược được): §4.
- **Lượt 2, chờ ADR:** QĐ-B và QĐ-C ở §5. Không phụ thuộc việc vá sổ tiền.
- **Lượt 3, chờ ADR và chờ vá:** QĐ-A. Chỉ trình duyệt sau khi các mục dưới đây đóng.

Ba lượt phát hành riêng. Phần lõi của ba lỗ sổ tiền **đã thi công và đã lên production** (migration `0078`–`0083`, `0088`). Theo `docs/quyen-hoan.json`, phần còn lại để đóng là:

| Mã | Còn lại | Ai làm |
|---|---|---|
| `TNV-G1` | Xác nhận sáu ca sổ vàng; kiểm production theo điều kiện 1 (lần chạy 28/10 không chạy được) | Chủ, Kế toán; AI chuẩn bị |
| `TNV-G3` | Đ9 phân định trách nhiệm (chờ chủ quyết); tin báo người thu cũ và mới | Chủ quyết; AI thi công |
| `TNV-G4` | Đ5d tin báo người bị đổi số dư; Đ6a cảnh báo trùng qua bảng luật chung (chờ chủ) | Chủ quyết; AI thi công |
| `HC-5.19` | Diễn tập khôi phục dữ liệu một lần, lệnh remote do chủ chạy. **Hạn trong tệp là 2026-11-05: quá hạn thì `npm test` đỏ.** Chữ trong mục đó còn ghi hạn nhánh chính 2026-11-30 và đòi chủ chọn một hạn | Chủ |

Mục đích của các dòng trên là cho biết việc còn lại, không thay sổ `docs/quyen-hoan.json`.

## 4. Lượt 1 — giao diện

Chỉ áp cho tài khoản giữ quyền Đối tác (`holdsPartner`), trừ 4.3 và 4.4.

**4.1 Ô Giảm giá.** Bỏ nhãn, gợi ý trong ô là «Giảm giá cho khách». Giữ `aria-label="Giảm giá cho khách"` cho trình đọc màn hình. Luật khoá ô và trần giảm giá không đổi.

**4.2 Ẩn «Thông tin chuyến», thêm dòng Ghi chú.** Trên thẻ dịch vụ: ẩn hẳn khối gập. Thêm một ô một dòng, gợi ý «Thời gian đón», ghi vào **ghi chú dịch vụ đang có** (`trip.note`), không thêm cột. Nháp cũ đã có giờ khởi hành hay giờ có mặt: giữ nguyên giá trị khi lưu, không xoá. Văn phòng thấy ghi chú ở trang đơn như hôm nay. Khoá `checkinDate`, `checkinTime`, `departTime` vẫn gửi đúng như đã nạp.

**4.3 Trang Hoa hồng đối tác: hai thẻ.** «Cấp độ đại lý» (nội dung thẻ «Các cấp đại lý» hôm nay) và «Vai người dùng» (nội dung thẻ «Loại đối tác», rồi một khối «Người có cấp riêng» chính là thẻ «Riêng từng đối tác» chuyển xuống). Không mất nút nào. «Xem dòng ↓» của Tra nhanh trỏ đúng thẻ mới; `docThe` đọc giá trị `doi-tac` cũ trong bộ nhớ tạm thành «Vai người dùng».

**Đổi chữ đồng loạt:** «Loại đối tác» → «Vai người dùng», «Các cấp đại lý» / «Cấp đại lý» → «Cấp độ đại lý» trên mọi chữ người dùng thấy: giao diện, câu báo lỗi máy chủ, hướng dẫn, trợ lý, nhật ký (nhãn hành động), cộng `src/shared/bang-tu-giao-dien.ts`. Việc này rộng: chữ này xuất hiện khoảng 290 dòng trong 49 tệp ngoài bài kiểm, tính cả chú thích mã (chú thích không bắt buộc đổi). Không đổi mã, tên bảng, tên route, tên hàm. Quyết định này **thay** quyết định 3 ngày 30/10 («giữ Loại đối tác»); chủ đã nghe.

*Lệch với chữ của chủ, có lý do:* lời chủ ghi đổi «Loại đối tác» thành «Cấp độ đại lý», nhưng thẻ đó thực chứa các vai. Bản vẽ chủ chọn trong hộp là Cấp độ đại lý + Vai người dùng, nên thiết kế theo bản vẽ.

**4.4 Quản lý tài khoản: bộ lọc theo vai.** Hàng nút lọc trên danh sách: «Tất cả», «Chưa gán vai», mỗi vai đang có một nút kèm số tài khoản (tên từ `tenVai`). Lọc ngay trên trình duyệt từ danh sách đã nạp, cả bảng máy tính lẫn thẻ điện thoại. Nhớ lựa chọn trong phiên. Lọc theo `roles` của tài khoản; loại tự thêm nằm trên hồ sơ, không có trong `roles`, nên chưa lọc được (ghi nợ ở `docs/BACKLOG.md`).

## 5. Ba quyết định (mỗi điều thành một ADR)

### QĐ-A. Khách đặt cọc trước (tiền) — lượt 3, chờ vá sổ tiền (§3)

1. **Nhập:** tài khoản giữ quyền Đối tác có ô «Khách đặt cọc trước» ở khối Thanh toán, số nguyên VNĐ, mặc định trống (= 0). Tóm tắt có thêm hai dòng xem trước: «Khách đặt cọc trước», «Khách còn phải trả». Văn phòng không có ô này; văn phòng vẫn ghi lần thu như hôm nay.
2. **Lưu:** cột mới `orders.declared_deposit` (`INTEGER NOT NULL DEFAULT 0`, `CHECK >= 0`). **Không** dùng lại ba cột cọc cũ. Trong lúc đơn nháp, đây chỉ là **lời khai**: không vào sổ, không tính là khoản thu, không chặn gửi xác nhận (ADR-0135 Đ7 và luật «đã có khoản thu» của ADR-0136 giữ nguyên chữ).
3. **Thành khoản thu:** khi đơn chuyển sang đã xác nhận, **cùng một lô** với xác nhận sinh một lần thu `PREPAID`, số tiền = lời khai, hình thức tiền mặt. **Người thu và người ghi đều là người lập đơn**, vì chính đối tác đã khai số tiền mình cầm. Vai người thu theo đúng nhánh «tôi thu» hôm nay: `BOOKER` nếu người lập là bên đặt được hưởng của đơn, `STAFF` nếu không. Nhờ vậy dòng «tiền đang giữ hộ» sinh **ngay** trên đối tác, không thành lời khai chờ Kế toán, không chặn «Đã giao» (ADR-0132 điều 3, `sinhDongLanThu`), và kết quả giống nhau dù ai bấm xác nhận. Người bấm xác nhận ghi ở nhật ký. Phải qua **cả ba nơi gọi `soanXacNhan`**: Còn vé, nhánh B của Gửi đơn, `POST /api/orders/:id/status` (đường thứ ba chỉ còn cho tài khoản đã thôi giữ quyền Đối tác khi đơn còn nháp); bài kiểm quét nơi gọi, nơi mới chưa khai thì đỏ. `orders` không đọc, không ghi `bil_*`: gốc lắp ráp tiêm hàm dựng câu (ADR-0024 đ4). Hàm không dựng được thì 503 và không xác nhận.
4. **Chặn:** lời khai ≤ tổng sau giảm, kiểm lúc lưu và lúc xác nhận (tổng có thể bị sửa xuống, ADR-0136 Đ8). Quá thì 409 kèm câu tiếng Việt, đơn ở lại nháp. Tài khoản chưa gắn hồ sơ mà khai > 0: 409 «nhờ văn phòng» (khuôn `partner_no_party`).
5. **Đơn không qua xác nhận:** huỷ, hết vé, rút lại: không sinh gì. Số khai ở lại trên đơn chỉ để đọc. Huỷ sau xác nhận: đi luồng thu trước của đơn huỷ có sẵn (ADR-0089).
6. **Hiển thị:** đơn nháp: dòng «Khách đặt cọc trước (chờ xác nhận)». Sau xác nhận: đọc từ sổ như mọi lần thu, không đọc cột. Bản đối tác và biên nhận theo danh sách trắng hiện có. Nhật ký chỉ ghi số tiền và mã đơn. Ca vàng mới ở trạng thái chờ Kế toán, AI không tự đánh dấu.

### QĐ-B. Đối tác không nhập giờ đón; công tắc ẩn thông tin khách

**B1. Giờ đón (áp cho mọi tài khoản giữ quyền Đối tác, không công tắc).**
- Khối Đưa đón của đối tác còn **Đón / Không đón** và **Nơi đón, Nơi trả** (phí đón tính theo nơi); bỏ hàng khung giờ và ô giờ. Giờ gõ vào dòng Ghi chú của §4.2. *(Người soạn hiểu «Ghi chú thay giờ đón» đúng nghĩa chỉ thay giờ. Chủ muốn bỏ cả khối thì đơn nào cũng phải chờ văn phòng và phí đón phải tính lại: báo lại, không tự làm.)*
- **Luật mới ở nhánh Gửi đơn:** người lập giữ quyền Đối tác và đơn có **chiều đi** chọn Đón mà chưa có giờ ⇒ luôn vào **nhánh A** (mở yêu cầu xác nhận). Đây là mở rộng đúng tinh thần ADR-0136 Đ1 «có chặng dưới mốc thì phải qua bước»: chưa có giờ thì chưa biết có dưới mốc hay không. Đơn «Không đón» không đổi nhánh. Chiều về giữ giờ gợi ý theo mẫu dịch vụ như hôm nay (ẩn với đối tác), không tính vào luật này. Đối tác gửi thẳng giờ qua API không phải lỗ: giờ đó vẫn qua cổng 6 giờ như hôm nay.
- **Bảng Còn vé:** hiện ghi chú dịch vụ ngay trên khối giờ. Chiều đi chưa có giờ có ô chọn khung giờ hoặc tự gõ, **bắt buộc**; chiều về hiện để sửa, không bắt buộc. Máy chủ từ chối Còn vé nếu chiều đi còn thiếu giờ (409, câu tiếng Việt). Sau khi có giờ, cổng 6 giờ và Đặt gấp chạy như hôm nay.
- Ghi chú phải có trong dữ liệu người xét đọc được (ADR-0136 Đ6 nới thêm trường này). Người xét không gửi được SĐT trong DTO; ghi chú là chữ tự do, đối tác có thể gõ SĐT vào: chấp nhận, ghi rõ trong ADR.
- Đơn nháp của đối tác không có đường xác nhận nào khác: người khác nhận 404 (ADR-0135 Đ2), người lập nhận 409 (ADR-0136 Đ13.5). Bài kiểm ghim điều này để không có đường vòng quanh luật giờ đón.

**B2. Công tắc «Ẩn thông tin khách khi đối tác đặt vé».**
- **Mặc định TẮT**: phát hành không đổi gì cho tới khi Toàn quyền bật. Chỉ ô `settings.ops`. Đặt ở trang Tôi, cạnh «Dịch vụ nhập tay» (khối `web/nhap-tay-cai-dat.ts`); bảng chính sách chỉ thêm theo khuôn `ord_confirm_policy` / `manualPolicy`; ghi nhật ký.
- **Khi BẬT**, với tài khoản giữ quyền Đối tác: form ẩn khối Khách hàng (tên, SĐT, email, ghi chú khách, nút điền thông tin) và khối Hành khách. Ngày khởi hành giữ nguyên, chỉ ẩn phần còn lại của khối.
- **Máy chủ quyết, không tin trình duyệt:** lập đơn mới khi công tắc BẬT thì bỏ tên, SĐT gửi lên, điền từ tài khoản (`fullName`, `phone`), email và ghi chú khách trống; không nhận khoá `passengers`. Sửa nháp đã có thông tin: giữ giá trị đang lưu. Đổi công tắc không chạm đơn cũ.
- **Miễn luật thiếu tên (chủ quyết 2026-11-02, sau khi nghe hệ quả):** đơn do tài khoản giữ quyền Đối tác lập lúc công tắc BẬT mang dấu `orders.manifest_exempt = 1`, chụp lúc lập; đổi công tắc sau đó không làm đổi dấu của đơn cũ. Chặng của đơn có dấu **không bị giữ** `THIEU_TEN` ở lúc xếp và lúc xuất bến (`lyDoThieuTen`, `kiemXuatBen`), câu nhắc vẫn hiện, không chặn. Mô-đun vận chuyển đọc dấu qua view công bố của `orders`. Mọi đơn khác và cờ `require_manifest` không đổi. Thêm dòng ở bảng sự kiện vận chuyển.
- **Hệ quả:** tên khách trên biên nhận và SĐT liên hệ trên chuyến là của đối tác; danh sách hành khách có thể trống cả khi xe chạy. Quy định xe hợp đồng đòi danh sách hành khách (nguồn tra 27/9, chưa có luật sư xác nhận), ADR ghi rõ đây là rủi ro chủ đã chấp nhận.
- Công tắc chỉ ẩn ở form Đặt vé. Đối tác vẫn bổ sung được tên ở trang đơn của mình như hôm nay (người soạn chọn, để bớt việc cho văn phòng). Thực tập, Bán hàng và mọi tài khoản không giữ quyền Đối tác: không đổi. «Đổi khách», «Sửa danh sách khách» của văn phòng: không đổi.

### QĐ-C. Vai độc lập với tài khoản; cột cấp ở Quản lý tài khoản

**C1. Hồ sơ chưa có tài khoản mang được vai.**
- Route gắn và gỡ vai ở Danh bạ cho phép vai nhóm bên ngoài **khi đồng thời**: vai đang nằm trong danh sách được hưởng còn bật (`prc_beneficiary_role`, đọc qua view), hồ sơ **chưa có tài khoản**, và hồ sơ không phải nội bộ (ADR-0117 đ4). Gồm cả hồ sơ tổ chức. Còn lại vẫn 409 `role_via_account`. Vai không sinh quyền, không tạo đăng nhập.
- Người soạn chọn mở năm vai có sẵn, không bảo chủ tạo loại tự thêm trùng tên: lời chủ nói đúng các vai này, và vai có sẵn sinh được quyền Đối tác khi sau này tạo tài khoản. Loại tự thêm vẫn dùng như hôm nay.
- `DRIVER_EXTERNAL` (Tài xế đối tác) **không** thuộc diện này (ADR-0048). «Tài xế» trong lời chủ người soạn hiểu là `TAXI_DRIVER`. Năm vai có sẵn giữ nguyên, kể cả Cộng tác viên.
- Hồ sơ đã có tài khoản: vẫn đổi vai ở Quản lý tài khoản (giữ luật sinh quyền). Lúc tạo tài khoản cho hồ sơ đang mang vai: luật R26 có sẵn bắt chọn vai đó ⇒ quyền sinh đúng lúc ấy.
- Ai làm: như ADR-0117 đ3 (Quản trị, Toàn quyền ở Danh bạ). Không thêm ô quyền.
- Bổ sung ADR-0018 và ghi chú ở `src/shared/booker.ts`; `R-LC-1` và `R-PRC-*` phải vẫn xanh trên dữ liệu thử có hồ sơ loại này. Có ca e2e: công ty lữ hành không tài khoản, gắn vai, gắn cấp, văn phòng chọn «Qua đối tác», xác nhận đơn, hoa hồng đúng cấp.

**C2. Cột «Cấp độ đại lý» ở Quản lý tài khoản.**
- Chỉ dòng tài khoản giữ quyền Đối tác có giá trị; dòng khác để trống. Công ty lữ hành không tài khoản vẫn đặt cấp ở trang Hoa hồng.
- **Thấy cột** khi có `partner.commission.view`; Hành chính nhân sự không có nên không thấy và không gọi route. **Sửa** khi có `partner.commission.write` (trên trang này là Quản trị, Toàn quyền).
- Chữ trong ô: «Đại lý cấp 3 (theo vai)», «Đại lý cấp 2 (riêng)», «Chưa có cấp», hoặc «Xung đột» (hai vai ra hai cấp, ADR-0117 đ2). Bấm mở bảng: chọn cấp, từ ngày (mặc định hôm nay), hoặc «Về theo vai». Đơn đã xác nhận không đổi hoa hồng (ADR-0077).
- **Ghi:** dùng đúng ba route sẵn có (đặt, đổi, ngừng cấp riêng). **Đọc:** một route mới, chỉ đọc, `GET /api/pricing/cap-hien-hanh?ids=…` (cổng `office`, hỏi `partner.commission.view`, chặn `holdsPartner`, tối đa theo danh sách hồ sơ của trang, một câu truy vấn), trả `{ partyId, cap, nguon: "RIENG" | "THEO_VAI" | "XUNG_DOT" | "CHUA_CO", coMucRieng, ganId, nutDoi, nutNgung }`. Tính ở máy chủ, không tính ở `web/`; có bài đối chiếu với `GET /api/pricing/ho-so/:id/hoa-hong` (`mucRieng`, `vai`, `xungDot`). Cần `partyId` trong dòng tài khoản: `StaffProfile` đã có.
- **Cột nói cấp đang áp, không nói số tiền:** `chonMuc` chọn theo từng dịch vụ và mức riêng có thể thắng cấp. Hồ sơ có mức riêng thì ô thêm nhãn «có mức riêng», trỏ sang trang Hoa hồng.

## 6. Trang ghép (`CLAUDE.md` §9) — ba quyết định, đúng trần 3

| Câu hỏi | Trả lời |
|---|---|
| Lượt duyệt | Lượt 2: QĐ-B, QĐ-C. Lượt 3: QĐ-A, người soạn đọc lại trang này khi trình. |
| Bảng dùng chung nào nhận loại dữ liệu mới? | `pty_party_role`: thêm **vai bên ngoài trên hồ sơ không có tài khoản**, gồm tổ chức (C1). `orders`: thêm dấu miễn danh sách khách (B2) và cột lời khai (A2). `bil_payment_receipt`: thêm lần thu **sinh lúc xác nhận**, người ghi là người lập chứ không phải người bấm (A3). |
| Bản đồ quyền chạm gì? | Không thêm ô, không đổi ô. C1 dùng ô gắn vai có sẵn. A1 sau `holdsPartner`. A3 không hỏi `payment.receive` của người bấm: người ghi là chính đối tác, và ô `payment.receive` own cho thấy họ vốn được ghi đúng khoản này; quyền của người bấm là quyền xác nhận. B2 ô `settings.ops`. C2 hai ô `partner.commission.*`. |
| Cổng nào canh cửa nào, kể cả ẩn hiện giao diện? | Giờ đón: gửi đơn (nhánh A), Còn vé. Lời khai: lưu nháp và xác nhận. Công tắc: lập đơn ở máy chủ; form ẩn theo cùng trường máy chủ trả (`/api/cai-dat/...`). Cột cấp: giao diện theo `can()`, máy chủ kiểm lại ở route đọc và ba route ghi. **Chỗ ẩn hiện đổi nghĩa:** danh sách «Đặt qua đối tác» nay có thêm hồ sơ không tài khoản (đúng ý). Trang Danh bạ nay hiện vai bên ngoài trong ô gắn vai khi hồ sơ chưa có tài khoản. |
| Đọc rồi ghi có canh không? | A3, B1 nằm trong lô xác nhận có khoá lạc quan sẵn. Lời khai đọc lại ngay trong lô (câu điều kiện theo `updated_at`). |

## 7. Lựa chọn của người soạn (bề mặt, chủ bác được)

Áp dụng cho tài khoản giữ quyền Đối tác kể cả tài khoản lai («Có quyền Đối tác là áp»). Công tắc đặt ở trang Tôi vì đó là chỗ các công tắc Toàn quyền đang ở; «Bảng điều khiển» hôm nay chỉ là trang riêng của Trợ lý. Hình thức của lần thu sinh tự động: tiền mặt (đối tác cầm tiền; chuyển khoản vào tài khoản đối tác cũng là đối tác giữ, Kế toán không cần đối chiếu). Tên cột cấp ở bảng là «Cấp độ đại lý». Không tạo sẵn bảy cấp bằng migration, vì mức hoa hồng từng cấp do công ty đặt.

## 8. Tiêu chí nghiệm thu

**Lượt 1:** (a) tài khoản đối tác thấy ô Giảm giá không nhãn, gợi ý đúng chữ; không thấy «Thông tin chuyến»; gõ Ghi chú, lưu, mở lại còn nguyên; văn phòng thấy ghi chú; form văn phòng không đổi (kịch bản Chrome hai vai, hai khổ). (b) Nháp cũ có giờ khởi hành: đối tác lưu lại không mất giá trị. (c) Trang Hoa hồng đúng hai thẻ, mọi nút hôm nay còn dùng được, «Xem dòng ↓» nhảy đúng chỗ. (d) Quét toàn kho không còn chữ «Loại đối tác» trong chuỗi hiển thị (bài kiểm). (e) Lọc đúng theo vai trên cả hai khổ.

**QĐ-A:** (a) nháp có lời khai: không có dòng `bil_*`, gửi xác nhận vẫn được. (b) Cả ba nơi gọi `soanXacNhan`: mỗi đường đúng một lần thu và một dòng giữ hộ trên đối tác, số khớp, không có dấu chờ đối chiếu, «Đã giao» không bị khoản này chặn; bài cố ý bỏ một đường thì đỏ rồi hoàn nguyên (P16). (c) Hết vé, huỷ, rút lại: không có dòng sổ nào. (d) Lời khai > tổng: lưu 409; tổng bị sửa xuống rồi xác nhận: 409, không ghi gì. (e) Gửi trùng (ADR-0094): một lần thu. (f) Nghiệp vụ sau đó (Đã giao, đơn huỷ, sổ đại lý) ra số đúng với ca vàng mới.

**QĐ-B:** (a) đối tác không thấy ô giờ; đơn có chiều đi Đón không giờ luôn vào nhánh A, dù dịch vụ không đánh dấu cần xác nhận. (b) Không đón: nhánh như cũ. (c) Còn vé thiếu giờ chiều đi: máy chủ 409; có giờ dưới 6 giờ: cổng chặn như cũ. (d) Đơn nháp của đối tác không xác nhận được qua đường nào khác (404, 409). (e) Phí đón theo nơi vẫn đúng. (f) Công tắc TẮT: mọi thứ như hôm nay. (g) BẬT: gửi tên giả lên máy chủ vẫn lưu tên tài khoản; khoá `passengers` bị bỏ; Quản trị đổi công tắc 403, Toàn quyền đổi được, có nhật ký. (h) Đơn tạo lúc BẬT: biên nhận và màn tài xế không lỗi khi thiếu hành khách; xếp xe và xuất bến không bị giữ `THIEU_TEN`. Đơn tạo lúc TẮT, và mọi đơn của văn phòng: vẫn bị giữ như hôm nay. Đổi công tắc sau đó không đổi dấu của đơn đã lập; sửa cố ý để dấu đọc theo công tắc hiện hành thì bài đỏ rồi hoàn nguyên (P16).

**QĐ-C:** (a) hồ sơ cá nhân và tổ chức chưa có tài khoản gắn được vai bên ngoài ở Danh bạ; hồ sơ có tài khoản: 409; nhân viên nội bộ: 409; `DRIVER_EXTERNAL`: 409. (b) Không sinh quyền, không đăng nhập được. (c) Gắn vai rồi tạo tài khoản: quyền sinh đúng. (d) Công ty lữ hành đi trọn ca e2e ở C1. (e) Cột cấp: HCNS không thấy và route trả 403; Bán hàng không vào được trang này; Quản trị đặt, đổi, về theo vai được; tài khoản lai Đối tác bị chặn. (f) Giá trị cột khớp `GET /api/pricing/ho-so/:id/hoa-hong` trên bộ ca đối chiếu, hồ sơ có mức riêng hiện đúng nhãn. (g) Đơn đã xác nhận không đổi hoa hồng sau khi đổi cấp.

**Chung:** `npm test`, `npm run typecheck`, `npm run test:e2e`, kịch bản Chrome xanh; người kiểm độc lập đọc lượt 2; `src/CLAUDE.md`, `SYSTEM-DESIGN`, `CHANGE-GUIDE`, `data-dictionary.json`, hướng dẫn Đối tác và Kế toán, `changelog.ts` cập nhật; hàng rào mới có dòng ở `SO-HANG-RAO`.

## 9. Để lại cho người thi công

Tên hàm, tên cột cuối cùng, bố cục CSS, câu chữ báo lỗi (tiếng Việt có dấu, theo `web/CLAUDE.md`), chia task. Ảnh thật hai khổ cho chủ duyệt lượt 1 trước khi nhập. Trần gói trang Đơn hàng còn rất ít byte: đừng nhét thêm mã chung, xin nới nếu phải.
