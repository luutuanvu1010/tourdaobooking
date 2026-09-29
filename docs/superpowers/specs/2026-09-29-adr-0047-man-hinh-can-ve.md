# ADR-0047 — các màn cần vẽ trên Claude Design (chặng đưa đón, danh sách hành khách)

- **Ngày:** 2026-09-29.
- **Căn cứ:** ADR-0047 (accepted 2026-09-28: "Chặng thay hẳn ô cũ"); kế hoạch `docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md` mục 7 (Phần B).
- **Cách dùng:**
  - Chủ vẽ từng màn dưới đây trên Claude Design, ở hai cỡ: điện thoại (rộng 390) và máy tính (rộng 1040). Vẽ xong gửi link, rồi làm đúng bản vẽ (tiền lệ trang Đăng nhập, Vận chuyển 1a).
  - Màn nào ghi "dùng khuôn sẵn" thì không cần vẽ, trừ khi chủ muốn.
  - **Phần máy chủ không chờ bản vẽ.** Trong lúc chờ, màn hình hôm nay vẫn chạy y nguyên.
- **Ai thấy gì:**
  - Người lập / sửa đơn (Kinh doanh, Quản trị, Toàn quyền; Đối tác và Thực tập với đơn của mình) nhập đưa đón và danh sách khách khi lập đơn.
  - Sau khi đơn đã xác nhận:
    - **sửa đưa đón**: Kinh doanh (đơn mình lập hoặc đang phụ trách), Quản trị, Toàn quyền. Đối tác, Thực tập, Hướng dẫn viên, Kế toán không;
    - **sửa danh sách khách**: Kinh doanh (đơn mình lập hoặc đang phụ trách), Quản trị, Toàn quyền, Đối tác và Thực tập (đơn mình lập). Hướng dẫn viên, Kế toán không.
  - Kế toán **xem** được danh sách khách, **không** sửa.
  - Hướng dẫn viên **xem** được danh sách khách của đơn mình đang phụ trách, **không** sửa.
  - Tài xế chưa thấy gì ở lượt này (lịch xe là việc của bảng điều phối sau).
- **Ngoài phạm vi các màn này** (chưa có quyết định — đừng vẽ vào):
  - cảnh báo "dưới 6 giờ", nút "Đặt gấp";
  - "chiều về tự tạo theo dịch vụ";
  - lịch xe, xếp xe.
  - Các thứ đó thuộc thiết kế Bảng điều phối, chủ duyệt riêng.

## Màn cần vẽ

1. **Form lập / sửa đơn — phần "Đưa đón" trong từng dịch vụ**
   - Mỗi dịch vụ có một danh sách **chặng**. Mỗi chặng: **Chiều đi** hoặc **Chiều về**, ngày đón (mặc định = ngày đi của tour, sửa được, ví dụ đón sân bay tối hôm trước), giờ đón (được để trống = "chưa chốt giờ"), **nơi đón**, **nơi trả**.
   - Nơi đón / nơi trả: **chọn** từ danh mục (khách sạn, sân bay, ga cáp treo, bến tàu, bến cảng, văn phòng…) **hoặc gõ tự do** (nhà riêng). Nơi đón **bắt buộc**; nơi trả được để trống ("chưa chốt nơi trả").
   - Nút "Thêm chiều về", "Thêm chặng", "Bỏ chặng".
   - Dịch vụ không có đưa đón: hiện gọn "Không đưa đón" + nút "Thêm đưa đón".
   - Đổi ngày đi của tour → các chặng tự dời theo (có dòng nhắc nhỏ).
2. **Form lập / sửa đơn — phần "Hành khách" (cả đơn)**
   - Bảng: họ tên, năm sinh, loại khách (người lớn / trẻ em / người cao tuổi / em bé — tuỳ chọn).
   - Dòng đếm "3/4 khách đã có tên". Cảnh báo khi nhiều tên hơn số khách ("Danh sách có 5 người, đơn có 4 khách").
   - Thiếu tên vẫn lưu được (nhắc nhẹ, không chặn).
   - Thêm dòng, xoá dòng (đơn nháp).
3. **Trang chi tiết đơn — hai khối "Đưa đón" và "Hành khách"**
   - Đưa đón: theo từng dịch vụ, mỗi chặng một dòng: chiều, ngày giờ đón, nơi đón → nơi trả. "Chưa chốt nơi trả" có dấu nhắc cho văn phòng.
   - Hành khách: danh sách tên + năm sinh; dòng đếm; nút "Sửa danh sách" (theo quyền).
   - Đơn nháp: nút sửa dẫn về form đơn.
4. **Sửa đưa đón sau khi đơn đã xác nhận** (bảng trượt, thay hai ô "giờ đón / điểm đón" cũ trong "Sửa thông tin chuyến")
   - Thêm chặng (ví dụ thêm chiều về), sửa ngày / giờ / nơi của một chặng.
   - "Bỏ chặng" phải chọn lý do: "Khách không cần đưa đón nữa", "Nhập nhầm", "Đổi sang chặng khác".
   - Chặng đã bỏ không mất, chỉ ẩn (xem ở lịch sử đơn).
5. **Sửa danh sách hành khách sau khi đơn đã xác nhận** (bảng trượt)
   - Thêm người; sửa tên / năm sinh (máy giữ bản cũ làm lịch sử); "Huỷ người" (nhập nhầm).
   - Câu giải thích ngắn: "Không xoá hẳn; mọi lần sửa đều được lưu lại."
6. **"Việc của tôi" (hướng dẫn viên) — hiện đưa đón của đơn mình phụ trách** *(chỉ vẽ nếu chủ muốn hướng dẫn viên thấy chiều về, nơi trả trên màn này)*
   - Hôm nay màn này hiện giờ đón + điểm đón chiều đi. Muốn hiện thêm chiều về, nơi trả, danh sách khách thì cần mở thêm dữ liệu cho màn này (máy chủ chưa có — sẽ hỏi lại trước khi làm).

## Dùng khuôn sẵn (không cần vẽ, trừ khi chủ muốn)

- **Biên nhận gửi khách (ảnh PNG)** — giữ bố cục hiện tại. Dòng "Đón khách" đổi thành **một dòng mỗi chặng**:
  - `Đón (chiều đi): 06:30 · Khách sạn Sheraton → Bến cảng Vinpearl`
  - `Đón (chiều về): 16:00 · Bến cảng Vinpearl → Khách sạn Sheraton`
  - Ngày đón khác ngày đi thì ghi thêm ngày: `Đón (chiều đi): 22:30 ngày 29/09 · Nhà riêng → Sân bay Cam Ranh`.
  - Chặng chưa chốt giờ thì bỏ phần giờ.
  - **Không** in tên hành khách lên biên nhận (trừ khi chủ vẽ khác).
- **Thẻ đơn trong danh sách, Trang chủ "Chuyến đón hôm nay", hàng chờ nhận của hướng dẫn viên:** giữ như hiện tại — giờ và điểm đón **chiều đi** (câu hỏi Q3 của kế hoạch: mặc định vẫn theo ngày đi của tour).
- **Danh mục Địa điểm:** thêm ba loại "Khách sạn", "Sân bay", "Ga cáp treo" vào ô chọn loại của trang Địa điểm có sẵn. Quản trị tự thêm từng khách sạn, sân bay, ga.

## Nơi vẽ và đoạn yêu cầu dán vào Claude Design

- Vẽ trong dự án Claude Design có sẵn **"Tour Đảo Booking Design System"** (`https://claude.ai/design/p/34f284df-c97a-4672-bb66-d7df03a0d97a`), như bản vẽ Vận chuyển 1a.
- Đoạn yêu cầu (chép nguyên văn):

> Dùng hệ thiết kế của dự án này: màu, chữ, và các thành phần Card, Button, Chip, Badge, Field, Sheet, Sidebar, TabBar, Banner. Vẽ phần "Đưa đón" và "Hành khách" của đơn hàng cho app Tour Đảo Booking. Mỗi màn vẽ hai cỡ: điện thoại rộng 390 (có TabBar) và máy tính rộng 1040 (có Sidebar). Chữ tiếng Việt có dấu; không hiện mã kỹ thuật; ô nhập cỡ chữ 16px. Dữ liệu mẫu: tour "Vé cáp treo Vinpearl" ngày 30/09, 4 khách; đơn "Đưa đón sân bay" đón 22:30 ngày 29/09 cho chuyến bay 00:40; khách sạn Sheraton Nha Trang, Bến cảng Vinpearl, Sân bay Cam Ranh, Ga cáp treo Vinpearl; hành khách mẫu Nguyễn Văn An (1985), Trần Thị Bình (1988), Nguyễn Minh Khôi (2015).
> 1. Form lập đơn — phần "Đưa đón" trong mỗi dịch vụ: danh sách chặng, mỗi chặng có nhãn "Chiều đi" hoặc "Chiều về", ngày đón (mặc định bằng ngày đi, sửa được), giờ đón (được để trống), nơi đón (chọn từ danh mục khách sạn / sân bay / ga cáp treo / bến, hoặc gõ tự do), nơi trả (được để trống: "chưa chốt"); nút "Thêm chiều về", "Thêm chặng", "Bỏ chặng"; dịch vụ không có đưa đón hiện gọn "Không đưa đón" + nút "Thêm đưa đón"; dòng nhắc nhỏ khi đổi ngày đi thì các chặng dời theo.
> 2. Form lập đơn — phần "Hành khách" của cả đơn: bảng họ tên, năm sinh, loại khách (tuỳ chọn); dòng đếm "3/4 khách đã có tên"; cảnh báo vàng khi danh sách nhiều người hơn số khách; thêm dòng, xoá dòng; thiếu tên vẫn lưu được.
> 3. Trang chi tiết đơn: khối "Đưa đón" (theo từng dịch vụ, mỗi chặng một dòng: chiều, ngày giờ đón, nơi đón → nơi trả; "chưa chốt nơi trả" có dấu nhắc) và khối "Hành khách" (tên + năm sinh, dòng đếm, nút "Sửa danh sách").
> 4. Bảng trượt "Sửa đưa đón" cho đơn đã xác nhận: thêm chặng, sửa ngày / giờ / nơi; "Bỏ chặng" bắt chọn lý do ("Khách không cần đưa đón nữa", "Nhập nhầm", "Đổi sang chặng khác"); chặng đã bỏ không mất, chỉ ẩn.
> 5. Bảng trượt "Sửa danh sách hành khách" cho đơn đã xác nhận: thêm người, sửa tên / năm sinh (giữ bản cũ làm lịch sử), "Huỷ người" (nhập nhầm); câu giải thích "Không xoá hẳn; mọi lần sửa đều được lưu lại."

## Lưu ý khi vẽ

- Giữ bảng màu, cỡ chữ, khoảng cách của app hiện tại (token ở đầu `public/app.css`). Ô gõ cỡ chữ 16px để iPhone không phóng to.
- Mọi chữ tiếng Việt có dấu, không lộ mã kỹ thuật: không hiện "OUT", "RETURN", "ord_transfer_leg", mã lý do.
- Nơi gõ tự do có thể là **địa chỉ nhà riêng của khách** (dữ liệu cá nhân): đừng đưa vào chỗ nhiều người xem chung ngoài trang đơn.
- Không vẽ cảnh báo "dưới 6 giờ", nút "Đặt gấp", lịch xe — các thứ đó chờ thiết kế Bảng điều phối được duyệt.
