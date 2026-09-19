# Nội dung màn hình A2 — form lập đơn & trang đơn

Tài liệu tham chiếu cho mockup. Dữ liệu, trạng thái và lời chữ lấy từ spec `docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md` (§4–§5, §11) và mã đã làm xong ở A1. Mọi lời chữ giữ tiếng Việt đầy đủ dấu; ký hiệu tiền `1.350.000 ₫`.

## 1. Bối cảnh sản phẩm

- App nội bộ của Công ty TNHH Tour Đảo (Nha Trang): nhân viên bán tour lập đơn, xác nhận, rồi gửi bản xác nhận cho khách qua Zalo. **Chủ yếu dùng trên iPhone** (PWA), thỉnh thoảng trên máy tính.
- Một đơn = thông tin khách + **nhiều dịch vụ** + thanh toán. Mỗi dịch vụ có: số khách theo loại, thông tin chuyến (ngày giờ khởi hành, đón, check-in, ghi chú) và các dòng tiền do hệ thống sinh.
- Vai trò: `sales` (nhân viên) và `admin`. Chỉ người lập đơn hoặc admin được sửa/xác nhận/huỷ.
- Vòng đời đơn: **Nháp** → **Đã xác nhận** (hoặc **Đã huỷ**). Nháp sửa tự do. Xác nhận đòi mọi dịch vụ có ngày khởi hành hợp lệ và ≥ 1 khách. Sau xác nhận: dịch vụ, số khách và tiền bị **khoá**; chỉ còn sửa được *thông tin chuyến*.

## 2. Loại khách và cách tính (quyết định nội dung thẻ dịch vụ)

Bốn loại khách, đúng thứ tự và nhãn: **Người lớn**, **Trẻ em**, **Người cao tuổi**, **Em bé**.

- Dịch vụ **tính theo người** (`perPax`): mỗi loại khách *có giá* hiện một bộ đếm −/+; loại không có giá thì không hiện. Mỗi loại có khách sinh một dòng tiền: `Số khách × đơn giá`. Ghi chú loại khách lấy từ bảng giá (vd "Trẻ 5–10 tuổi", "Từ 60 tuổi", "Dưới 5 tuổi, miễn phí") hiện **ngay cạnh ô nhập**.
- Dịch vụ **tính theo nhóm** (`per5Pax`, tổng quát `perNPax`): chỉ **một ô "Số khách"**; giá là giá mỗi lượt tối đa N khách; số lượt = ⌈số khách / N⌉. Ví dụ phao chuối 7 khách → 2 lượt.
- Dịch vụ **nhập tay**: nhân viên tự gõ tên, các dòng tiền (mô tả, chi tiết, số lượng, đơn giá) và số khách (số khách chỉ để vận hành, không nhân với tiền).
- Đơn giá mỗi dòng **sửa được** (thương lượng). Khi khác giá danh mục hiện nhãn **"Khác giá danh mục"** kèm giá danh mục gạch ngang. Đây là cảnh báo, không chặn.
- Tối đa **50 khách** mỗi dịch vụ ("Tối đa 50 khách"), tối đa **20 dịch vụ** và 50 dòng tiền mỗi đơn.

## 3. Thông tin chuyến của MỖI dịch vụ (các trường trong thẻ)

| Trường | Loại | Ghi chú |
|---|---|---|
| Ngày khởi hành | ngày | **Bắt buộc khi xác nhận**; nháp để trống được. Hợp lệ: từ hôm nay đến +365 ngày |
| Giờ khởi hành | giờ HH:MM | tuỳ chọn |
| Giờ đón | giờ HH:MM | tuỳ chọn |
| Điểm đón | 1 dòng, ≤ 200 ký tự | tuỳ chọn; dữ liệu cá nhân |
| Ngày check-in | ngày | để trống = **cùng ngày khởi hành** |
| Giờ check-in | giờ HH:MM | tuỳ chọn |
| Nơi check-in | 1 dòng, ≤ 200 ký tự | tuỳ chọn |
| Ghi chú dịch vụ | nhiều dòng, ≤ 1000 ký tự | tuỳ chọn |

Đón và check-in **có thể có cả hai** trong cùng một dịch vụ.

## 4. Dữ liệu mẫu (dùng đúng các giá trị này trong mockup)

*Giá, ghi chú loại khách và tên người là số liệu minh hoạ, không phải bảng giá hay khách thật.*

**Khách:** Trần Văn Bình · 0901 234 567 · email trống · ghi chú "Đón tại khách sạn, có 1 bé 5 tuổi".

**Dịch vụ 1 — từ danh mục, tính theo người:** "Tour 4 đảo Nha Trang" (mã dạng `TD…`). Bảng giá: Người lớn 1.350.000 ₫; Trẻ em 950.000 ₫ ("Trẻ 5–10 tuổi"); Người cao tuổi 1.200.000 ₫ ("Từ 60 tuổi"); Em bé 0 ₫ ("Dưới 5 tuổi, miễn phí"). Trong đơn: 2 người lớn + 1 trẻ em → dòng "Người lớn 2 × 1.350.000 ₫ = 2.700.000 ₫", "Trẻ em 1 × 950.000 ₫ = 950.000 ₫"; cộng 3.650.000 ₫. Chuyến: khởi hành 20/09/2026 07:30; đón 07:00 tại "Khách sạn Sunrise, 12 Trần Phú"; check-in 20/09/2026 (bỏ trống = cùng ngày) 07:15 tại "Cảng Cầu Đá"; ghi chú "Bé dị ứng hải sản".

**Dịch vụ 2 — từ danh mục, tính theo nhóm:** "Phao chuối" (mã `TTB03`), 1.500.000 ₫ mỗi lượt, tối đa 5 khách/lượt. 7 khách → 2 lượt → "Phao chuối 2 lượt × 1.500.000 ₫ = 3.000.000 ₫". Chuyến: khởi hành 20/09/2026, chưa có giờ.

**Dịch vụ 3 — nhập tay:** "Xe đưa đón riêng"; dòng "Xe 7 chỗ 2 chiều" 1 × 800.000 ₫; 3 khách (chỉ vận hành). Chuyến: khởi hành 20/09/2026 06:30.

**Thanh toán:** Tạm tính 7.450.000 ₫ · Giảm giá 0 ₫ · **Tổng 7.450.000 ₫** · Đã cọc 1.000.000 ₫ (Chuyển khoản) · **Còn lại 6.450.000 ₫**.

Mã đơn mẫu: `TD-20260919-0001`. Lập lúc 16:45 19/09/2026 bởi Nguyễn Thị Mai.

## 5. Các màn hình cần thiết kế

### A. Form lập/sửa đơn (`order-form`)
Phần "Khách hàng" (tên*, số điện thoại*, email, ghi chú) → phần **"Dịch vụ"** → phần "Thanh toán" (giảm giá, đã cọc, hình thức cọc: Tiền mặt / Chuyển khoản / Khác, ghi chú thanh toán) → tóm tắt tiền → thanh hành động dính đáy (**"Lưu đơn nháp"**; sửa đơn: "Lưu thay đổi").

Phần "Dịch vụ":
- Ô tìm "Chọn từ danh mục" (gõ tên hoặc mã) → danh sách kết quả (tên, đơn vị tính, giá người lớn). Nút **"+ Dịch vụ nhập tay"**.
- Danh sách **thẻ dịch vụ** (xếp dọc). Mỗi thẻ: tên + chip đơn vị ("theo người" / "theo nhóm 5 khách/lượt" / "nhập tay") + nút xoá; **bộ đếm khách** −/+ theo loại (hoặc một ô "Số khách"); **xem trước dòng tiền** với đơn giá sửa được và nhãn lệch giá; **khối Thông tin chuyến** (thu gọn/mở); tổng tiền của dịch vụ.
- Thẻ nhập tay: tên dịch vụ, số khách (vận hành), các dòng tiền tự nhập (+ Thêm dòng), thông tin chuyến.
- Trạng thái của thẻ (hiện nhãn/cảnh báo trên thẻ):
  - Bình thường.
  - **Đơn giá khác giá danh mục** — nhãn "Khác giá danh mục" + giá danh mục gạch ngang.
  - **Đơn nháp cũ, giá danh mục đã đổi** — nhãn vàng "Giá danh mục đã đổi" (dòng tiền vẫn giữ giá đã lưu).
  - **Đơn nháp cũ, dịch vụ đã ẩn** — nhãn xám "Dịch vụ đã ẩn khỏi danh mục". Vẫn sửa và xác nhận được; đổi số khách hoặc dịch vụ thì phải chọn lại từ danh mục.
  - **Cảnh báo ngày** (vàng, không chặn khi lưu nháp): "Ngày khởi hành đã qua — lưu nháp được, nhưng chưa thể xác nhận." / "Ngày khởi hành quá 365 ngày — lưu nháp được, nhưng chưa thể xác nhận."
  - **Cảnh báo giờ** (vàng nhẹ): "Giờ đón sau giờ khởi hành — kiểm tra lại."
  - **Lỗi nhập** (đỏ): "Tối đa 50 khách." / "Nhập số khách." / "Số lượng trẻ em không hợp lệ."
- Banner khi lưu gặp lỗi 409 giá đổi (`catalog_changed`): "Giá danh mục vừa đổi. Đã cập nhật giá mới — bạn xem lại rồi lưu." kèm danh sách thay đổi: `Tour 4 đảo Nha Trang · Người lớn: 1.350.000 → 1.400.000 ₫`. Đơn giá đã thương lượng được giữ.
- Banner khi đơn bị người khác sửa (`stale`): "Đơn vừa được người khác sửa. Hãy tải lại để xem bản mới." + nút **"Tải lại đơn"**.
- Banner khi trang cũ (`client_outdated`): "Trang đã cũ. Hãy tải lại trang."

### B. Trang đơn (`order`)
- Đầu trang: mã đơn, huy hiệu trạng thái (Nháp vàng / Đã xác nhận xanh lá / Đã huỷ đỏ), "Lập 16:45 19/09/2026 bởi Nguyễn Thị Mai".
- Nút theo trạng thái: **Nháp** → "Sửa", "Xác nhận đơn", "Huỷ đơn". **Đã xác nhận** → "Sửa thông tin chuyến", "Huỷ đơn". **Đã huỷ** → không có nút.
- Khối **Khách hàng**; rồi **mỗi dịch vụ một khối** (tên, chip đơn vị, số khách theo loại, ngày giờ khởi hành, đón, check-in, ghi chú, các dòng tiền `SL × đơn giá = thành tiền`, nhãn "Khác giá danh mục", và với đơn nháp: "Giá danh mục đã đổi"/"Dịch vụ đã ẩn khỏi danh mục"); khối **Thanh toán** (tạm tính, giảm giá, tổng, đã cọc, còn lại); khối **Lịch sử** (nhật ký: tạo, sửa, xác nhận, huỷ, "sửa thông tin chuyến").
- Khi bấm "Xác nhận đơn" mà thiếu thông tin (`incomplete_trip`): banner đỏ **"Chưa đủ thông tin chuyến để xác nhận đơn."** kèm danh sách theo dịch vụ, mỗi dòng nêu lý do: `Tour 4 đảo Nha Trang — chưa có ngày khởi hành` · `… — ngày khởi hành đã qua` · `… — ngày khởi hành quá xa (trên 365 ngày)` · `… — chưa có khách`. Mỗi dòng có liên kết "Sửa" đến đúng dịch vụ.
- Đơn **đã xác nhận**: dòng nhắc "Đơn đã xác nhận: dịch vụ, số khách và tiền đã khoá. Chỉ sửa được thông tin chuyến." Bấm "Sửa thông tin chuyến" mở **bảng sửa** (bottom sheet trên điện thoại): mỗi dịch vụ một nhóm trường (ngày khởi hành — không được xoá, giờ khởi hành, giờ đón, điểm đón, ngày/giờ/nơi check-in, ghi chú), nút "Lưu thông tin chuyến". Lưu ý hiển thị: "Bản xác nhận đã gửi khách trước đó có thể lỗi thời — cần gửi lại." Số khách và tiền hiện chỉ đọc (biểu tượng khoá).

### C. (Tuỳ chọn) Bản máy tính ≥ 960px của Form lập đơn
Hai cột: cột trái là form và các thẻ dịch vụ; cột phải **tóm tắt tiền dính** (sticky) kèm nút Lưu.

## 6. Ràng buộc kỹ thuật ảnh hưởng thiết kế

- iPhone 390 × 844, trong vỏ PWA đã duyệt: thanh đầu navy `--c-primary` (có nút "‹" và tiêu đề), safe-area trên/dưới, **thanh tab dưới đáy (Đơn hàng / Đơn mới / Tôi)** ở các trang; **ở form lập đơn thanh tab ẩn** và nút "Lưu đơn nháp" dính đáy. Khoảng chạm tối thiểu **44 px**.
- Dữ liệu tiền là số nguyên VNĐ, định dạng `1.350.000 ₫`, canh phải, không xuống dòng.
- Dịch vụ/khách/đơn giá/ghi chú có thể **dài**: thẻ phải chịu được tên dịch vụ 2 dòng, ghi chú nhiều dòng, số tiền 8–9 chữ số.
- Một bộ đếm −/+ phải bấm được bằng ngón cái, có trạng thái 0 (nút − vô hiệu).
- Không dùng hình minh hoạ/hero/ảnh trang trí; đây là công cụ làm việc, ưu tiên mật độ thông tin và tốc độ nhập.
