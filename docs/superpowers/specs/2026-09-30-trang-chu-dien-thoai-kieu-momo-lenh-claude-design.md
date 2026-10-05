# Trang chủ trên điện thoại kiểu MoMo — lệnh cho Claude Design

- **Ngày:** 2026-09-30.
- **Việc:** thiết kế lại Trang chủ (`/`) **chỉ ở khổ điện thoại** (< 900px), theo bố cục và phong cách ứng dụng MoMo trên điện thoại, dùng hệ thống thiết kế sẵn có của Island Booking System.
- **Cách dùng:** chủ dán nguyên phần "LỆNH" dưới đây vào Claude Design, vẽ ở rộng 390px. Vẽ xong gửi link, phiên thi công làm đúng bản vẽ (tiền lệ trang Đăng nhập 1.7, Vận chuyển 1a).
- **Chủ đã chốt (30/9, bốn câu hỏi, cả bốn chọn phương án khuyến nghị):**
  1. Lưới biểu tượng vuông chứa **mọi chức năng người đó được dùng**, theo đúng quyền hiện có; menu ở tab "Tôi" giữ nguyên.
  2. Thanh tìm kiếm **tìm đơn** (mã đơn, tên khách, SĐT), mở trang Đơn hàng đã lọc — giống ô tìm ở bản máy tính.
  3. **Giữ** các khối số liệu (Còn thiếu tiền, Chờ xác nhận, Chưa phụ trách, Doanh thu của tôi, Chuyến đón 3 ngày, Cần xem lại), xếp **dưới** lưới.
  4. Đầu trang dùng **xanh biển của app** (thay hồng MoMo); san hô chỉ cho hành động chốt.
  - Và từ lời giao việc: **giữ nguyên thanh tab dưới cùng**.
- **Giả định bề mặt (đảo ngược được, chủ sửa trên bản vẽ nếu muốn):**
  - G1. Lưới hiện tối đa 8 ô (2 hàng × 4); người có hơn 8 chức năng thì ô thứ 8 là "Tất cả", mở bảng trượt liệt kê mọi chức năng theo nhóm (kiểu "Tất cả dịch vụ" của MoMo).
  - G2. Chỉ mượn **bố cục và cảm giác** của MoMo (đầu trang màu, ô tìm nổi, lưới icon vuông bo góc, thẻ trắng xếp chồng); không dùng logo, màu hồng, hình minh hoạ hay chữ của MoMo.
- **Ngoài phạm vi:** bản máy tính (thanh bên giữ nguyên); Trang chủ tài xế (`/tai-xe`); tài khoản chỉ Đối tác / chỉ Hướng dẫn viên (không vào Trang chủ); không đổi quyền ai thấy gì; không thêm số liệu mới cần máy chủ.

---

## LỆNH (dán vào Claude Design)

Thiết kế lại màn **Trang chủ** của app nội bộ "Island Booking System" (công ty du lịch Tour Đảo, Nha Trang — nhân viên lập và theo dõi đơn tour) **cho điện thoại, rộng 390px**, cài lên iPhone như app (PWA, có tai thỏ và vạch vuốt ở đáy). Toàn bộ chữ tiếng Việt có dấu.

### 1. Phong cách
Lấy bố cục và cảm giác của **trang chủ ứng dụng MoMo trên điện thoại**: dải đầu trang có màu, ô tìm kiếm nổi lên, lưới biểu tượng vuông bo góc 4 cột có nhãn hai dòng dưới mỗi ô, các thẻ trắng bo góc xếp chồng bên dưới trên nền xám xanh nhạt, bóng rất nhẹ. **Không** dùng màu hồng, logo, hình minh hoạ hay chữ của MoMo — dùng đúng hệ thống thiết kế dưới đây.

### 2. Hệ thống thiết kế (bắt buộc dùng, không tự thêm màu)
- Màu: xanh biển chính `#0c4a6e`, xanh đậm `#082f49`, xanh nhạt `#dcebf6`; san hô `#c0392b` (CHỈ cho hành động chốt như "Tạo đơn", và nhãn giá tiền); cát `#f5a623` / nền cát `#fbe3b3` / chữ cát `#5a4109` (nhắc nhở); nguy hiểm `#b01235` / nền `#fde9ee` (lỗi, tiền còn thiếu); xanh lá nền `#dcfce7` chữ `#166534` (đã xác nhận). Nền trang `#eaf2f8`, thẻ `#ffffff`, viền `#d3e1ec`, chữ `#0f172a`, chữ phụ `#475569`, chữ trên nền màu `#ffffff`.
- Phông: **Be Vietnam Pro** 400/500/600/700/800. Thang cỡ chữ chỉ dùng các bậc 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 32px; nội dung 16px, nhãn 14px, huy hiệu 12px; không chữ nhỏ hơn 12px. Ô gõ (ô tìm) chữ 16px.
- Khoảng cách: 4, 8, 12, 16, 24, 32, 48px. Bo góc: 8, 12, 18px, viên thuốc 999px. Bóng thẻ `0 1px 3px rgba(15,23,42,.08)`.
- Vùng chạm tối thiểu 44×44px. Biểu tượng dạng nét (outline) đồng bộ, không emoji.

### 3. Giữ nguyên thanh tab dưới cùng
Thanh tab cao 56px + vùng an toàn, nền trắng, viền trên mảnh, biểu tượng 36px + nhãn 12px. Vẽ đúng như hiện có, tab "Trang chủ" đang sáng:
- Nhân viên lập đơn: **Trang chủ · Đơn hàng · Tạo đơn (nút nổi bật san hô) · Tôi**.
- Quản trị: **Trang chủ · Đơn hàng · Tạo đơn · Dịch vụ · Tài khoản · Tôi**.
- Kế toán: **Trang chủ · Đơn hàng · Tôi**.
Tab "Tôi" có thể mang chấm đỏ nhỏ "có bản mới". Không đổi thanh này.

### 4. Bố cục từ trên xuống
1. **Dải đầu trang xanh biển** (`#0c4a6e`, có thể chuyển nhẹ sang `#082f49`), kéo lên cả vùng tai thỏ:
   - Trái: ảnh đại diện tròn (chữ cái đầu) + "Xin chào," / tên nhân viên (đậm, trắng) + ngày hôm nay nhỏ ("Thứ Tư, 30/09").
   - Phải: nút chuông thông báo (có viên số đỏ = số tin chưa đọc), nút trợ giúp "?".
   - Khi đang bảo trì: một viên thuốc cát nhỏ "Đang ở chế độ bảo trì" dưới lời chào.
2. **Ô tìm kiếm** trắng, bo tròn, nổi lên ranh giới dải xanh / nền (một nửa đè lên dải xanh như MoMo): biểu tượng kính lúp + chữ mờ "Tìm mã đơn, tên khách, SĐT…". Bấm vào → sang trang Đơn hàng với từ khoá.
3. **Thẻ lưới chức năng** (thẻ trắng, bo 18px): lưới **4 cột**, mỗi ô là một **ô vuông bo góc 12–14px nền xanh nhạt `#dcebf6`, biểu tượng xanh biển ở giữa**, nhãn tối đa hai dòng bên dưới (14px, căn giữa). Có huy hiệu số góc trên phải khi cần. Tối đa **8 ô** (2 hàng); nếu người đó có hơn 8 chức năng thì ô thứ 8 là **"Tất cả"** (biểu tượng lưới 4 chấm) mở bảng trượt từ dưới lên liệt kê mọi chức năng theo nhóm.
   - Ô "Tạo đơn" là ô duy nhất nền san hô nhạt `#fef2f0` biểu tượng san hô (hành động chốt).
4. **Khối số liệu nhanh** (kiểu thẻ "số dư" của MoMo): 4 ô, gợi ý một thẻ trắng chia lưới 2×2 (Claude Design được đề xuất dải cuộn ngang nếu đẹp hơn). Mỗi ô: nhãn nhỏ có biểu tượng, số lớn đậm, dòng phụ nhỏ; bấm → Đơn hàng.
   - "Còn thiếu" — số tiền (ví dụ "12,5tr ₫", màu nguy hiểm) — "8 đơn".
   - "Doanh thu của tôi" — ví dụ "48,2tr ₫" — "Tuần này · 15 đơn" (không có biểu đồ ở điện thoại).
   - "Chờ xác nhận" — "3" — "Cần xác nhận đơn".
   - "Chưa phụ trách" — "2" — "Chờ người nhận".
5. **Thẻ "Chuyến đón"**: tiêu đề + huy hiệu xanh lá số chuyến + liên kết "Tất cả" bên phải; ba nút chuyển ngày dạng viên thuốc **Hôm nay · Ngày mai · Ngày kia**; danh sách dòng: giờ đón đậm bên trái (06:30), tên khách + dịch vụ, điểm đón nhỏ, bên phải số tiền còn lại (hoặc "Đủ tiền" xanh lá). Trống: "Không có chuyến nào hôm nay."
6. **Thẻ "Cần xem lại"** (chỉ Quản trị/Toàn quyền thấy, ẩn hẳn khi không có gì): mỗi dòng một biểu tượng cảnh báo màu cát hoặc đỏ + tiêu đề đậm + dòng phụ, mũi tên ›. Ví dụ "Danh mục lệch với Google Sheet — 2 dịch vụ", "3 góp ý chưa xử lý".
7. Khoảng đệm cuối để nội dung không bị thanh tab che.

### 5. Danh sách chức năng cho lưới (chỉ hiện ô người đó được dùng; thứ tự ưu tiên từ trên xuống)
| Ô | Ai thấy | Huy hiệu |
|---|---|---|
| Tạo đơn | người lập được đơn | — |
| Đơn hàng | mọi người vào được Trang chủ | số đơn chưa xác nhận |
| Danh bạ | nhân viên văn phòng | — |
| Điều phối xe | người điều phối | — |
| Xe | người quản lý xe | — |
| Giấy tờ sắp hết hạn | người quản lý xe | số giấy tờ sắp hết hạn (màu cát) |
| Dịch vụ & giá | Quản trị | số dịch vụ lệch Sheet (màu cát) |
| Quản lý tài khoản | Quản trị | — |
| Địa điểm | Quản trị | — |
| Cuốc của tôi | tài xế kiêm văn phòng | — |
| Góp ý / Báo lỗi | mọi người | số góp ý mới (san hô) |
| Trợ giúp | mọi người | chấm "có bản mới" |
| Loại giấy tờ người, Loại giấy tờ xe, Chính sách điều phối, Lý do điều phối, Nhật ký, Gửi thông báo | Quản trị / Toàn quyền | — (thường nằm trong "Tất cả") |

### 6. Cần vẽ các bản (rộng 390px)
1. **Nhân viên kinh doanh** (5 ô: Tạo đơn, Đơn hàng, Danh bạ, Góp ý / Báo lỗi, Trợ giúp), có 4 chuyến hôm nay, không có thẻ "Cần xem lại".
2. **Quản trị** (hơn 8 chức năng → ô "Tất cả"), có thẻ "Cần xem lại", thanh tab 6 mục.
3. **Bảng trượt "Tất cả chức năng"** của Quản trị: nhóm "Bán hàng", "Quản lý", "Vận chuyển", "Của tôi"; cùng kiểu ô vuông 4 cột.
4. **Kế toán** (không có ô Tạo đơn), thanh tab 3 mục.
5. **Đang tải**: khung xương xám nhạt cho dải số liệu và thẻ Chuyến đón (lời chào, ô tìm và lưới hiện ngay).
6. **Lỗi tải số liệu**: thanh báo lỗi đỏ nhạt dưới lưới, ô "Còn thiếu" hiện "—" "Chưa tải được số".
7. **Đang bảo trì** (viên thuốc cát ở đầu trang).

### 7. Ràng buộc
- Không đổi bản máy tính; chỉ màn điện thoại.
- Không thêm số liệu mới ngoài những gì liệt kê ở mục 4.
- Chữ tiếng Việt dài phải xuống dòng đẹp, không cắt dấu (ví dụ "Giấy tờ sắp hết hạn", "Quản lý tài khoản" trong ô 4 cột ở 390px).
- Độ tương phản chữ đạt tối thiểu 4,5:1.
