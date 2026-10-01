# Lệnh vẽ Claude Design — Đưa đón (nơi trả) + Danh sách hành khách + các ô mới (ADR-0047 Phần B, 2026-10-01)

- **Ngày:** 2026-10-01. **Trạng thái:** lệnh vẽ, chờ chủ trả lời 2 câu ở mục 3 rồi dán vào Claude Design. Chưa thi công giao diện.
- **Căn cứ:**
  - quyết định chủ 1/10 `docs/superpowers/specs/2026-10-01-uu-tien-xe-chay-quyet-dinh.md` (U1: chủ vẽ trước; U2: thêm "Số khách đi xe", số hiệu chuyến bay, nơi trả tự điền theo dịch vụ);
  - danh sách màn `docs/superpowers/specs/2026-09-29-adr-0047-man-hinh-can-ve.md`; ADR-0047 (accepted), ADR-0054 D10.1–D10.3 (accepted), ADR-0055 VK2-C (accepted), bản nháp ADR-0065 (proposed — `docs/superpowers/specs/2026-09-30-de-xuat-adr-ra-soat/ADR-0065-so-khach-di-xe.md`);
  - bảng nối màn ↔ API `docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md:1028-1068`;
  - bản vẽ có sẵn mốc 6 giờ / Đặt gấp: `docs/design/van-chuyen-dieu-phoi/project/07 Bieu mau don - chang don.dc.html` (đối chiếu: `docs/design/van-chuyen-dieu-phoi/DOI-CHIEU-2026-09-29.md` mục 5 — "07 không phải bản vẽ biểu mẫu ADR-0047").
- **Thay đổi so với danh sách màn 29/9:** bản 29/9 dặn "đừng vẽ cảnh báo dưới 6 giờ, nút Đặt gấp" — nay hai thứ đó **đã có bản vẽ (07) và đã chạy**, nên lệnh này bảo **giữ nguyên** 07 và ghép khối mới vào cùng biểu mẫu. Thêm màn V12 (form tạo sẵn chặng theo dịch vụ) và V14 (ô "Đưa đón" ở Danh mục) vì ADR-0054 dặn vẽ cùng lúc để khỏi vẽ hai lần.

---

## 1. Cho chủ dự án (đọc trước, 1 phút)

1. **Trả lời 2 câu ở mục 3** trước (mỗi câu chọn A hoặc B). Nếu chọn theo khuyến nghị thì không phải sửa gì trong lệnh.
   - Nếu câu 1 bạn chọn **A**: trong khối lệnh, xoá đoạn nằm giữa hai dòng `### [ĐOẠN TUỲ CHỌN — Số khách đi xe cả đơn] BẮT ĐẦU` và `… KẾT THÚC`.
   - Nếu câu 2 bạn chọn **B**: trong khối lệnh, xoá dòng có chữ `[CHỈ KHI CÂU 2 = A]`.
2. Mở dự án Claude Design có sẵn **"Tour Đảo Booking Design System"** (`https://claude.ai/design/p/34f284df-c97a-4672-bb66-d7df03a0d97a`) — cùng chỗ đã vẽ Vận chuyển và màn 07.
3. Chép **nguyên khối lệnh** ở mục 2 (phần nằm giữa hai dòng ```` ``` ````) và dán vào ô chat của Claude Design.
4. Cần vẽ **7 màn**, mỗi màn hai cỡ (điện thoại và máy tính):
   1. Form lập đơn — phần "Đưa đón" của từng dịch vụ (có nơi trả gợi ý, số hiệu chuyến bay, số người chiều về);
   2. Form lập đơn — phần "Hành khách" của cả đơn;
   3. Trang chi tiết đơn — hai khối "Đưa đón" và "Hành khách";
   4. Bảng trượt "Sửa đưa đón" (đơn đã xác nhận);
   5. Bảng trượt "Sửa danh sách hành khách" (đơn đã xác nhận);
   6. Form lập đơn — chọn dịch vụ "hai chiều" thì hiện sẵn chiều đi + chiều về;
   7. Màn Danh mục — ô "Đưa đón" của một dịch vụ (Quản trị cài).
5. Vẽ xong, **gửi link bản vẽ cho AI**. AI đối chiếu từng ô với máy chủ rồi mới làm giao diện.

---

## 2. Khối lệnh dán vào Claude Design

```
Dùng hệ thiết kế của dự án này (màu, chữ, khoảng cách, các thành phần Card, Button, Chip, Badge, Field, Sheet, Sidebar, TabBar, Banner). Vẽ phần "Đưa đón" và "Hành khách" của đơn hàng cho app nội bộ Island Booking System (tên trên iPhone: "Island Booking").

## BỐI CẢNH
- Công ty TNHH Tour Đảo, Nha Trang. Nhân viên lập đơn dịch vụ du lịch (vé cáp treo, tour đảo, đưa đón sân bay…), xác nhận đơn, rồi văn phòng xếp xe đưa đón khách.
- Để xe chạy được, mỗi đơn cần: (1) lịch đưa đón từng dịch vụ — chiều đi, chiều về, ngày giờ đón, nơi đón, NƠI TRẢ; (2) danh sách hành khách — họ tên + năm sinh từng người (luật vận tải khách bắt buộc).
- Người dùng: Bán hàng, Quản trị, Toàn quyền (văn phòng); Đối tác (đại lý, lễ tân khách sạn) và Thực tập sinh lập đơn của chính mình; Hướng dẫn viên và Kế toán chỉ xem.
- App cài lên iPhone như app thật, cũng dùng trên máy tính. Toàn bộ chữ tiếng Việt có dấu.

## LUẬT CỐ ĐỊNH (bắt buộc)
1. Giữ bảng màu, phông Be Vietnam Pro, cỡ chữ, khoảng cách, bo góc đang có của hệ thiết kế. Không thêm màu mới.
2. Mỗi màn vẽ HAI cỡ: điện thoại rộng 390px (có thanh tab dưới đáy) và máy tính rộng 1040px (có thanh bên trái).
3. Chữ trong ô nhập cỡ 16px trở lên (app đang dùng 17px) để iPhone không tự phóng to. Vùng bấm ≥ 44×44px.
4. Không hiện bất kỳ mã kỹ thuật nào: không "OUT", "RETURN", "NULL", mã lý do, mã cột. Chỉ chữ thường: "Chiều đi", "Chiều về", "Chưa chốt".
5. GIỮ NGUYÊN màn "07 Biểu mẫu đơn — chặng đón" đã vẽ trong dự án này: dải cảnh báo dưới mốc 6 giờ cuối thẻ dịch vụ, nút "Đặt gấp" / "Duyệt đặt gấp" (chỉ Quản trị), nút "Xác nhận đơn" bị khoá với câu "Cần Quản trị duyệt đặt gấp", nhãn "Đặt gấp — lý do — người duyệt". Không đổi bố cục, chữ, màu của các phần đó. Khối mới ghép vào CÙNG thẻ dịch vụ, đặt sao cho dải cảnh báo 6 giờ vẫn nằm cuối thẻ như 07.
6. Địa chỉ nhà riêng của khách (nơi gõ tự do) là dữ liệu cá nhân: chỉ hiện trong trang đơn, không đưa lên thẻ danh sách đơn hay chỗ nhiều người xem chung.

## DỮ LIỆU MẪU (dùng đúng các tên này, toàn bộ là hư cấu)
- Đơn 1: dịch vụ "Vé cáp treo Vinpearl", ngày đi 30/09, 4 khách (3 người lớn, 1 trẻ em). Đón 07:30 tại Khách sạn Mường Thanh Luxury Nha Trang → trả tại Ga cáp treo Vinpearl. Chiều về 16:30 Ga cáp treo Vinpearl → Khách sạn Mường Thanh Luxury Nha Trang, chỉ 2 người về.
- Đơn 2: dịch vụ "Tour 4 đảo", ngày đi 30/09, đón 08:00 tại Khách sạn Sheraton Nha Trang → trả tại Cảng Cầu Đá.
- Đơn 3: dịch vụ "Đưa đón sân bay", đón 22:30 ngày 29/09 tại "Nhà riêng — 12 đường Số 5, phường Ví Dụ" (địa chỉ gõ tự do, hư cấu) → trả tại Sân bay Cam Ranh, số hiệu chuyến bay VN1553.
- Danh mục điểm (chọn được): Khách sạn Mường Thanh Luxury Nha Trang · khách sạn; Khách sạn Sheraton Nha Trang · khách sạn; Sân bay Cam Ranh · sân bay; Ga cáp treo Vinpearl · ga cáp treo; Cảng Cầu Đá · bến cảng; Bến cảng Vinpearl · bến cảng; Văn phòng Tour Đảo · văn phòng.
- Hành khách: Nguyễn Văn An (1985, người lớn), Trần Thị Bình (1988, người lớn), Nguyễn Minh Khôi (2015, trẻ em), Lê Thị Hồng (1952, người cao tuổi).
- Người dùng mẫu: Lê Thị Trang (Bán hàng), Phạm Thu Hoa (Quản trị), Đỗ Minh Châu (Kế toán), "Khách sạn Biển Xanh" (Đối tác). Không dùng số điện thoại dạng thật.

## MÀN 1 — Form lập / sửa đơn: phần "Đưa đón" trong từng thẻ dịch vụ
Mục đích: người lập ghi lịch đưa đón cho từng dịch vụ.
- Mỗi dịch vụ có danh sách CHẶNG. Mỗi chặng một khối nhỏ gồm:
  - nhãn "Chiều đi" hoặc "Chiều về" (chip), số thứ tự "Chặng 1";
  - Ngày đón (mặc định = ngày đi của đơn, sửa được; ví dụ đón sân bay 22:30 tối hôm trước);
  - Giờ đón (được để trống → hiện chữ mờ "Chưa chốt giờ");
  - Nơi đón (bắt buộc): ô chọn từ danh mục điểm, có lựa chọn cuối "Gõ tự do…" (nhà riêng);
  - Nơi trả: ô chọn như nơi đón, có lựa chọn "Chưa chốt". Khi dịch vụ có nơi trả gợi ý, ô đã điền sẵn giá trị (ví dụ "Ga cáp treo Vinpearl" cho "Vé cáp treo Vinpearl", "Cảng Cầu Đá" cho "Tour 4 đảo") kèm nhãn nhỏ "gợi ý theo dịch vụ" ngay dưới ô; người lập sửa được, sửa rồi thì nhãn nhỏ biến mất.
  - Số hiệu chuyến bay: ô CHỈ HIỆN khi nơi đón hoặc nơi trả là một điểm loại "sân bay" chọn từ danh mục (vd Sân bay Cam Ranh). Gõ tự do chữ "sân bay" thì không hiện. Ô ngắn, chữ tự viết hoa, gợi ý mờ "VD: VN1553"; được để trống; chú thích nhỏ "Tài xế tự tra giờ bay".
  - Chỉ ở chặng "Chiều về": ô số "Số người chiều về" (mặc định trống = về đủ số khách của dịch vụ; ghi 1 đến số khách của dịch vụ). Chú thích nhỏ "Để trống nếu cả đoàn cùng về".
  - Nút "Bỏ chặng".
- Dưới danh sách chặng: nút "+ Thêm chiều về", "+ Thêm chặng".
- Dịch vụ không có đưa đón: hiện gọn một dòng "Không đưa đón" + nút "+ Thêm đưa đón".
- Đổi ngày đi của đơn → các chặng tự dời theo; hiện dòng nhắc nhỏ "Đã dời ngày đón của 2 chặng theo ngày đi mới".
Trạng thái phải vẽ:
  a) trống (dịch vụ mới chọn, "Không đưa đón");
  b) đang nhập (Đơn 1 đủ chiều đi + chiều về 2 người, máy tính 1040);
  c) lỗi: chặng chưa có nơi đón → viền đỏ + câu "Chặng 1: chưa có nơi đón."; số người chiều về lớn hơn số khách → "Số người chiều về không được quá 4.";
  d) Đơn 3 (sân bay, nơi đón gõ tự do, có ô số hiệu chuyến bay), điện thoại 390.
Quyền:
  - Bán hàng, Quản trị, Toàn quyền: sửa mọi ô.
  - Đối tác, Thực tập (đơn của mình): sửa được ngày, giờ, nơi đón, nơi trả, số hiệu chuyến bay; ô "Số người chiều về" CHỈ XEM (hiện số đang có hoặc "Cả đoàn"), kèm câu nhỏ "Văn phòng điều chỉnh số người về". Vẽ một bản 390 cho Đối tác để thấy khác biệt.

## MÀN 2 — Form lập / sửa đơn: phần "Hành khách" của cả đơn
Mục đích: ghi họ tên + năm sinh từng người đi.
- Một khối riêng dưới các thẻ dịch vụ, tiêu đề "Hành khách".
- Dòng đếm nổi bật đầu khối: "3/4 khách đã có tên".
- Bảng (máy tính) / danh sách thẻ (điện thoại): Họ tên, Năm sinh, Loại khách (Người lớn / Trẻ em / Người cao tuổi / Em bé — tuỳ chọn), nút xoá dòng.
- Mỗi dòng phải có ĐỦ họ tên và năm sinh. Đơn được lưu khi danh sách còn thiếu người (ít dòng hơn số khách) — chỉ nhắc nhẹ màu vàng "Còn 1 khách chưa có tên — cần đủ trước khi xe chạy", không chặn.
- Nút "+ Thêm hành khách".
Trạng thái phải vẽ:
  a) trống: "Chưa có hành khách nào" + nút thêm, dòng đếm "0/4 khách đã có tên";
  b) đang nhập 3/4 (nhắc vàng như trên);
  c) lỗi dòng: có tên nhưng thiếu năm sinh → "Dòng 3: năm sinh là bắt buộc."; năm sinh sai → "Dòng 3: năm sinh phải từ 1906 đến 2026.";
  d) cảnh báo vàng khi nhiều người hơn số khách: "Danh sách có 5 người, đơn có 4 khách" (vẫn lưu được).
Quyền: ai lập / sửa được đơn thì nhập được danh sách (Bán hàng, Quản trị, Toàn quyền, Đối tác và Thực tập với đơn của mình).

### [ĐOẠN TUỲ CHỌN — Số khách đi xe cả đơn] BẮT ĐẦU
- Ngay trên khối "Hành khách" (hoặc đầu form, chỗ ngày đi): một ô số "Số khách đi xe" cho CẢ ĐƠN. Máy điền sẵn số khách đông nhất trong các dịch vụ (ví dụ "Vé cáp treo Vinpearl" 4 người + "Thuê mô tô" 2 người → điền 4) kèm nhãn nhỏ "gợi ý — sửa nếu khác". Người bán sửa được (ví dụ 4 vé nhưng chỉ 2 người đi xe).
- Ô này KHÁC nút "Sửa số khách dịch vụ" (số khách tính tiền) — đặt nhãn rõ để không lẫn; không hiện tiền cạnh ô này.
- Dòng đếm hành khách dùng số này làm mẫu số: "3/4 khách đã có tên".
- Quyền: chỉ Bán hàng (đơn mình / đang phụ trách), Quản trị, Toàn quyền sửa; Đối tác, Thực tập thấy số gợi ý, chỉ xem.
- Trang chi tiết đơn (màn 3): dải đầu trang hiện "4 khách đi xe" thay cho số cộng dồn mọi dịch vụ.
### [ĐOẠN TUỲ CHỌN — Số khách đi xe cả đơn] KẾT THÚC

## MÀN 3 — Trang chi tiết đơn: khối "Đưa đón" và khối "Hành khách"
- Khối "Đưa đón": theo từng dịch vụ; mỗi chặng một dòng: chip chiều · ngày giờ đón · nơi đón → nơi trả; số hiệu chuyến bay nếu có ("✈ VN1553"); chiều về ít người hơn thì thêm "2 người về".
  - "Chưa chốt nơi trả" hiện chữ vàng + dấu nhắc, câu nhỏ "Cần nơi trả trước khi xếp xe" (văn phòng thấy).
  - "Chưa chốt giờ" tương tự.
  - Nút "Sửa đưa đón" (chỉ người có quyền, xem dưới) → mở màn 4.
- Khối "Hành khách": danh sách Họ tên · năm sinh · loại khách; dòng đếm "3/4 khách đã có tên"; nút "Sửa danh sách" → mở màn 5.
- Đơn nháp: nút sửa dẫn về form đơn (màn 1, 2), không mở bảng trượt.
- Giữ nguyên khối Đặt gấp dưới dịch vụ như màn 07.
Quyền (vẽ ba bản 390: Bán hàng, Kế toán, Hướng dẫn viên):
  - Bán hàng (đơn mình / đang phụ trách), Quản trị, Toàn quyền: thấy cả "Sửa đưa đón" và "Sửa danh sách".
  - Đối tác, Thực tập (đơn mình): chỉ "Sửa danh sách"; không có "Sửa đưa đón" sau khi đơn đã xác nhận.
  - Kế toán: xem đủ, không có nút sửa nào.
  - Hướng dẫn viên: xem danh sách khách và đưa đón của đơn mình phụ trách, không có nút sửa.

## MÀN 4 — Bảng trượt "Sửa đưa đón" (đơn đã xác nhận)
- Thay hai ô cũ "giờ đón / điểm đón" trong "Sửa thông tin chuyến".
- Liệt kê chặng như màn 1: sửa ngày, giờ, nơi đón, nơi trả, số hiệu chuyến bay, số người chiều về; nút "+ Thêm chiều về", "+ Thêm chặng".
- "Bỏ chặng" bắt chọn lý do (bắt buộc, chọn một): "Khách không cần đưa đón nữa", "Nhập nhầm", "Đổi sang chặng khác". Câu nhỏ: "Chặng đã bỏ không mất — xem trong lịch sử đơn."
- Nút "Lưu" / "Huỷ". Lỗi khi người khác vừa sửa: Banner "Đơn vừa được người khác cập nhật — tải lại để xem bản mới."
- Đổi ngày / giờ / nơi của chặng dưới mốc 6 giờ: giữ đúng hành vi đặt gấp của màn 07 (không vẽ lại).
- Chỉ Bán hàng (đơn mình / đang phụ trách), Quản trị, Toàn quyền mở được.

## MÀN 5 — Bảng trượt "Sửa danh sách hành khách" (đơn đã xác nhận)
- Câu giải thích ở đầu: "Không xoá hẳn; mọi lần sửa đều được lưu lại."
- Mỗi người một dòng: sửa tên / năm sinh / loại khách (máy giữ bản cũ làm lịch sử); nút "Huỷ người".
- "Huỷ người" = xoá người nhập nhầm: hiện hộp xác nhận "Huỷ Trần Thị Bình khỏi danh sách? (dùng khi nhập nhầm)" — KHÔNG có ô chọn lý do.
- Nút "+ Thêm hành khách". Dòng đếm cập nhật ngay "4/4 khách đã có tên".
- Lỗi dòng như màn 2; lỗi người khác vừa sửa như màn 4.
- Ai mở được: Bán hàng (đơn mình / đang phụ trách), Quản trị, Toàn quyền, Đối tác và Thực tập (đơn mình lập).

## MÀN 6 — Form lập đơn: dịch vụ "hai chiều" tạo sẵn chặng
- Người lập chọn dịch vụ "Vé cáp treo Vinpearl" (Danh mục đặt là hai chiều, giờ về gợi ý 16:30) → thẻ dịch vụ hiện SẴN hai chặng:
  - Chiều đi: ngày = ngày đi, giờ trống, nơi đón trống (người lập chọn), nơi trả = "Ga cáp treo Vinpearl" (nhãn "gợi ý theo dịch vụ");
  - Chiều về: nơi đón = nơi trả của chiều đi, nơi trả = nơi đón của chiều đi (tự đảo khi người lập chọn nơi đón chiều đi), giờ 16:30 (nhãn "gợi ý theo dịch vụ").
- Dòng nhỏ đầu khối: "Đã tạo sẵn chiều đi và chiều về theo dịch vụ — sửa hoặc bỏ nếu khác."
- Dịch vụ "một chiều" → chỉ chặng đi; "không đưa đón" → như màn 1 trạng thái a.
- Người lập bỏ chặng về rồi lưu thì máy KHÔNG tự tạo lại.

## MÀN 7 — Danh mục: ô "Đưa đón" của một dịch vụ (chỉ Quản trị, Toàn quyền)
- Màn Danh mục hiện là DANH SÁCH dịch vụ; mỗi dòng có nút "Sửa giá" mở khung sửa giá ngay dưới danh sách (không có trang chi tiết riêng). Thêm cạnh "Sửa giá" một nút "Đưa đón" mở khung (máy tính) / bảng trượt (điện thoại) cho dịch vụ đó; mỗi dòng danh sách hiện chip nhỏ chế độ hiện tại ("Hai chiều"). Khung "Đưa đón" gồm
  - chọn một: "Không đưa đón" / "Một chiều" / "Hai chiều";
  - "Giờ về gợi ý" (chỉ hiện khi Hai chiều, được để trống);
  - "Nơi trả gợi ý" (chọn từ danh mục điểm, được để trống) [CHỈ KHI CÂU 2 = A];
  - nút "Lưu bản mới"; câu nhỏ "Áp dụng cho đơn lập từ bây giờ; đơn đã có không đổi."
- Bảng "Lịch sử" bên dưới: mỗi lần đổi một dòng — lúc, người đổi, cũ → mới (ví dụ "Một chiều → Hai chiều, giờ về 16:30").
- Bán hàng, Kế toán, Đối tác không thấy khối này.

## KHÔNG VẼ
- Lại màn 07 (mốc 6 giờ, Đặt gấp) — giữ nguyên, chỉ ghép.
- Bảng điều phối xe, xếp xe, chuyến, màn tài xế.
- Biên nhận gửi khách (ảnh), thẻ đơn trong danh sách, Trang chủ — dùng khuôn sẵn.
- "Việc của tôi" của hướng dẫn viên (chưa quyết hiện thêm chiều về / danh sách khách ở đó).
- Tra giờ bay tự động, cảnh báo máy bay trễ.
- Tiền: không thêm số tiền nào vào các khối đưa đón, hành khách, số người về.

## BÀN GIAO
- Mỗi màn: bản 390 và 1040 đặt cạnh nhau, tên khung có số màn + vai (ví dụ "M3 · 390 · Kế toán").
- Liệt kê mọi câu chữ trên màn (nhãn, nút, câu lỗi, câu nhắc) thành một danh sách cuối dự án để đối chiếu.
- Nếu cần kích thước / màu ngoài hệ thiết kế, ghi rõ giá trị và lý do.
```

---

## 3. Câu cần chủ chốt trước khi vẽ

**Câu 1. Ô "Số khách đi xe" bạn chọn hôm nay là ô nào?**
Hai văn bản đang dùng hai nghĩa khác nhau:
- Quyết định 1/10 ghi "Số khách đi xe (`pax_override`, ADR-0054)". Nhưng ô của ADR-0054 (đã duyệt) thực ra là **"số người chiều về"**: chỉ có ở chặng **về**, từ 1 tới số khách của dịch vụ, để trống = cả đoàn về.
- Tên "Số khách đi xe" là ô của **ADR-0065** (bản nháp, **chưa duyệt**; câu 7 và câu 8 của nó còn chờ bạn): một con số cho **cả đơn**, gợi ý bằng số khách đông nhất các dịch vụ.
- Người được sửa thì hai bên **giống nhau** (Bán hàng đơn mình / đang phụ trách, Quản trị, Toàn quyền; Đối tác, Thực tập chỉ xem). Khác nhau là **phạm vi** (chặng về hay cả đơn) và **đã duyệt hay chưa**.

Phương án:
- **A:** chỉ vẽ "Số người chiều về" trên chặng về (đã duyệt, làm được ngay). Ô cả đơn để sau khi ADR-0065 được duyệt — lúc đó vẽ thêm một lần.
- **B (khuyến nghị):** vẽ luôn cả hai: "Số người chiều về" (làm ngay) + "Số khách đi xe" cả đơn (chỉ thi công **sau khi** bạn duyệt ADR-0065 và trả lời câu 7, 8). Được: vẽ một lần, đúng lời bạn 30/9 "Bán hàng nhập một ô riêng". Mất: phần ô cả đơn nằm chờ trên bản vẽ.

*Khối lệnh ở mục 2 đang viết theo B. Chọn A thì xoá đoạn "ĐOẠN TUỲ CHỌN".*

**Câu 2. "Nơi trả tự điền theo dịch vụ" lấy gợi ý từ đâu?** (Chưa có ADR — câu này vào ADR mới; bản vẽ form giống nhau ở cả hai cách, chỉ màn 7 khác.)
- **A (khuyến nghị):** Quản trị cài **"Nơi trả gợi ý"** cho từng dịch vụ ở màn Danh mục (cùng chỗ với ô "Đưa đón một chiều / hai chiều" đã duyệt), có lịch sử. Được: đúng chữ "theo dịch vụ"; mọi đơn của dịch vụ đó được gợi ý giống nhau. Mất: cần thêm một cột dữ liệu + ADR.
- **B:** lấy từ ô "nơi tập trung / check-in" mà người lập đã gõ trên chính dịch vụ của đơn (ô này đã có). Được: không thêm dữ liệu. Mất: người lập phải gõ trước thì mới có gợi ý — không phải "tự điền".

*Khối lệnh đang viết theo A. Chọn B thì xoá dòng có `[CHỈ KHI CÂU 2 = A]`.*

**Đã kiểm, không cần hỏi (chỉ ghi để chủ biết):**
- Bản giao việc nói "đơn đã xác nhận chỉ được thêm dòng / huỷ người có lý do". Máy chủ hôm nay (ADR-0047 A2): sau xác nhận được **thêm, sửa (giữ bản cũ), huỷ**; "huỷ người" **không có ô lý do** — nghĩa cố định là "nhập nhầm". Ba lý do có sẵn chỉ dành cho **bỏ chặng**. Lệnh vẽ theo đúng máy chủ. Muốn có lý do khi huỷ người thì cần ADR mới.
- Số hiệu chuyến bay: Đối tác, Thực tập **ghi được** trên đơn nháp của mình (ADR-0055 C2), khác với ô số người về (chỉ văn phòng).

---

## 4. Đối chiếu cho người thi công (mỗi ô → cột / API)

Đo trên nhánh `worktree-doi-chieu-phieu-giam-doc` @ `8f647226` (hơn `main` 4 commit: 3 commit tài liệu + 1 commit gộp main 1.49). Số migration mới: **dự kiến 0056** — kiểm `ls migrations` và `git ls-tree --name-only <nhánh> migrations/` của mọi nhánh/worktree chưa gộp lúc đặt tệp (CLAUDE.md §10).

### 4.1 Màn 1, 4, 6 — chặng đưa đón

| Ô trên màn | Cột / trường | API (tệp:dòng) | Trạng thái |
|---|---|---|---|
| Chiều đi / Chiều về | `ord_transfer_leg.direction` (`OUT`/`RETURN`); nhãn `CHIEU_LABEL` `src/shared/chang-dua-don.ts:15` | đơn nháp: thân `POST /api/orders` `src/modules/orders/index.ts:602`, `PUT /api/orders/:id` `:660` (khoá `services[].legs`, `LegInput` `src/shared/contracts.ts:321`); đã xác nhận: `POST /api/orders/:id/legs` `index.ts:751` | có |
| Ngày đón, giờ đón | `pickup_date`, `pickup_time` (NULL = chưa chốt giờ); khoảng ngày `khoangNgayDon` `chang-dua-don.ts:57` (sớm 1, muộn 7 ngày) | như trên; sửa sau xác nhận `PUT /api/orders/:id/legs/:legId` `index.ts:776` (`LegEditInput` `contracts.ts:332`) | có |
| Nơi đón (chọn / gõ tự do) | `pickup_location_id` / `pickup_place` (đúng một) | danh mục điểm `GET /api/locations` `src/modules/locations/index.ts:31` (cổng `staff`, mọi tài khoản; `LocationDto.locationTypeCode` `contracts.ts:647`) | có |
| Nơi trả (chọn / gõ tự do / "Chưa chốt") | `dropoff_location_id` / `dropoff_place` (tối đa một); DTO `dropoffLabel` `contracts.ts:345` (null = chưa chốt) | như nơi đón | có |
| Nhãn "gợi ý theo dịch vụ" + giá trị tự điền nơi trả | **chưa có cột** (`vc_leg_template` của ADR-0054 không có nơi trả) | **chưa có — thuộc kế hoạch máy chủ 2026-10-01**; cần ADR mới (câu 2); câu 2 = A ⇒ cần migration mới | chưa có |
| Số hiệu chuyến bay | `ord_transfer_leg.flight_code` (ADR-0055 C1: TEXT NULL, chữ hoa, 3–8 ký tự; khuôn mã ở máy chủ). Ô hiện khi nơi đón/trả có `locationTypeCode = 'AIRPORT'` (`migrations/0034_chang_dua_don.sql:37`) — giao diện quyết, máy chủ không ép | `LegInput`/`LegDto` **chưa có trường** (`contracts.ts:321-350`); **chưa có — thuộc kế hoạch máy chủ 2026-10-01**; **cần migration mới** | chưa có |
| Số người chiều về | `ord_transfer_leg.pax_override` (ADR-0054 D10.3: `CHECK ≥ 1 AND direction = 'RETURN'`; ≤ số khách dịch vụ — L-R1 ở mã); quyền `order.trip.edit` `src/shared/permissions.ts:78`, kể cả đơn nháp (đường mới) | chỉ có chú thích `src/modules/orders/index.ts:189`; **chưa có — thuộc kế hoạch máy chủ 2026-10-01**; **cần migration mới** + hàm `soNguoiChang` | chưa có |
| Bỏ chặng + 3 lý do | `closed_at`, `close_reason_code`; `LY_DO_DONG_CHANG` `chang-dua-don.ts:19-23` | `POST /api/orders/:id/legs/:legId/close` `index.ts:802` | có |
| Đổi ngày đi → dời chặng | hàm `doiNgayChang` `chang-dua-don.ts:205` (test `chang-dua-don.test.ts`) | chạy ở trình duyệt, gửi kèm thân lưu nháp | có (hàm) |
| Khối đặt gấp (giữ 07) | `short_notice_*` | `POST /api/orders/:id/legs/:legId/short-notice` `index.ts:823`; giao diện có sẵn `web/order-form.ts:398-401`, `web/order.ts:102-163` | có — không đụng |
| Màn 6: tạo sẵn chặng theo dịch vụ | `vc_leg_template` (`mode`, `return_time_hint`) — ADR-0054 D10.1; hàm `changMacDinh` D10.2 | route đọc `GET /api/van-chuyen/mau-chang` (tên đề xuất ADR-0054); grep `vc_leg_template|mau-chang` trong `src/`, `migrations/` = 0 kết quả ⇒ **chưa có — thuộc kế hoạch máy chủ 2026-10-01**; **cần migration mới** | chưa có |
| Màn 7: ô "Đưa đón" ở Danh mục + lịch sử | `vc_leg_template` (chỉ-thêm, có lịch sử) | `GET/POST /api/van-chuyen/mau-chang/:code` (cổng `admin`, `admin.manage` `permissions.ts:123`) — **chưa có — thuộc kế hoạch máy chủ 2026-10-01**; "Nơi trả gợi ý" thêm cột nếu câu 2 = A | chưa có |
| Quyền khối chặng | nháp: `order.create` `permissions.ts:76` / `order.modify` `:77`; sau xác nhận: `order.trip.edit` `:78` | — | có |

### 4.2 Màn 2, 3, 5 — hành khách

| Ô trên màn | Cột / trường | API (tệp:dòng) | Trạng thái |
|---|---|---|---|
| Họ tên, năm sinh, loại khách | `ord_passenger.full_name`, `birth_year` (**bắt buộc** — `src/shared/hanh-khach.ts:40`, `:43`; tuổi tối đa `TUOI_TOI_DA = 120` `:15`), `pax_code` (NULL được; nhãn `PAX_LABEL` `src/shared/order-lines.ts:7`) | nháp: thân `POST/PUT /api/orders` khoá `passengers` (`index.ts:605`, `:669`; vắng khoá = giữ danh sách `:94-95`); `PassengerInput` `contracts.ts:360` | có |
| Dòng đếm "3/4 khách đã có tên" | `PassengerListResponse.soNguoiCoTen` / `soKhachDoan` (`contracts.ts:377-383`; dựng ở `src/modules/orders/service.ts:208`) | `GET /api/orders/:id/passengers` `index.ts:853` | có. Nếu ADR-0065 được duyệt: mẫu số đổi sang `soKhachDiXe` (chưa có) |
| Cảnh báo "Danh sách có 5 người, đơn có 4 khách" | `vuotSoKhach` (`contracts.ts:381`) | như trên | có |
| Thiếu tên vẫn lưu | luật ADR-0047 A2 (chặn chỉ ở cổng xuất bến: `THIEU_TEN` `src/shared/dieu-phoi-kiem.ts:351`) | — | có |
| Sau xác nhận: thêm / sửa / huỷ người | chỉ-thêm: dòng mới trỏ `previous_id`, cùng `person_key`; huỷ = `voided_at` | `POST /api/orders/:id/passengers` `index.ts:866`, thân `PassengerChangeInput { expectedUpdatedAt, them, sua, huy }` `contracts.ts:385-390` | có. **Không có lý do huỷ người** (`huy: string[]`) — muốn có cần ADR mới |
| Nút "Sửa danh sách" / quyền xem | `order.passenger.write` `permissions.ts:86`; xem: `contact.view` `:75` (HDV `assigned`, Kế toán `any`) | — | có |
| Ô "Số khách đi xe" cả đơn (đoạn tuỳ chọn) | `orders.ride_pax` (ADR-0065 nháp: NULL = theo gợi ý; ≥ 1) | **chưa có — thuộc kế hoạch máy chủ 2026-10-01, chỉ sau khi ADR-0065 được duyệt + câu 7, 8 trả lời**; cần migration mới (kèm tạo lại trigger `orders_delivered_lock` của `migrations/0044_orders_da_giao.sql`) | chưa có, chưa duyệt |

- Lưu ý ADR-0065 D2: nếu được duyệt, thẻ đơn trong danh sách (`web/order-card.ts:155` "Số khách") cũng phải đổi sang cùng số "khách đi xe" — lệnh vẽ này để thẻ đơn theo khuôn sẵn (mục KHÔNG VẼ); việc đó chỉ phát sinh khi ADR-0065 được duyệt.

### 4.3 Màn 3 — nhắc văn phòng

| Ô | Nguồn | Trạng thái |
|---|---|---|
| "Chưa chốt nơi trả" / "Cần nơi trả trước khi xếp xe" | `LegDto.dropoffLabel = null`; chuyến bị giữ `CHUA_CO_NOI_TRA` `src/shared/dieu-phoi-kiem.ts:326` | có |
| Chi tiết đơn có `legs` | `GET /api/orders/:id` `index.ts:636`; `LegDto` `contracts.ts:335` | có |

### 4.4 Ghi chú cho người thi công
- Màn 1–5 làm theo bảng nối B0–B7 của `docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md:1041-1068`; bản vẽ cần dữ liệu API chưa có → **dừng, hỏi điều phối** (luật của kế hoạch, `:1039`).
- Các ô "chưa có" ở trên **không** dựng giao diện trước khi máy chủ có trường (không tự thêm trường vào hợp đồng API).
- "Việc của tôi" (màn 6 cũ của danh sách 29/9) không nằm trong lệnh vẽ này.
