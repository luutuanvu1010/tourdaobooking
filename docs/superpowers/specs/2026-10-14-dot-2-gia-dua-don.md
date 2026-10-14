# Đợt 2: giá đưa đón, bật/tắt đưa đón theo nhóm, điểm chọn nhanh (đặc tả đề xuất, 2026-10-14, bản 2)

> Hồ sơ có ngày. **Đề xuất, chờ chủ duyệt; chưa sửa mã, chưa có ADR, chưa có kế hoạch thi công.** Bản 2 thay bản 1 cùng ngày sau khi chủ trả lời tám câu hỏi (§2). Căn cứ: bảng việc `2026-10-13-bang-viec-truoc-su-dung.md` §5 và các yêu cầu 1, 6, 9. Chỗ đọc mã dưới đây là đọc ở `main` ngày 14/10.

## 0. Chủ đã chốt hướng (14/10, "ok theo khuyến nghị")

Ba quyết định ở §1 đều chọn **phương án A**: điểm tự gõ tính theo mức "ngoài vùng" và thiếu mức thì không cho xác nhận; phụ thu không tính hoa hồng đại lý (Kế toán nên đọc trước khi ra ADR lượt 2); lượt 1 là bật/tắt đưa đón theo nhóm cùng điểm chọn nhanh, lượt 2 là lớp giá. Văn bản ADR-0118 và kế hoạch lượt 1 đã soạn ở `2026-10-14-dot-2-luot-1-dua-don-theo-nhom-va-diem-nhanh/` và `docs/superpowers/plans/2026-10-14-dot-2-luot-1-ke-hoach.md`, **chờ chủ duyệt văn bản ADR** trước khi thi công.

## 1. Tóm tắt cho chủ (lời thường)

**Ý định của chủ:** thiết kế giá đưa đón cho phân hệ vận chuyển sao cho sau này sửa giá (mức tiền, thêm vùng, giá theo giờ hoặc mùa, giá theo đối tượng, cách tính khác) **không phải làm lại phần lõi**.

**Cách tách tôi đề xuất, ba lớp:**
- **Lõi vận chuyển** (chặng, chuyến, xe, tài xế, suất khách) **không biết gì về giá**. Chặng vẫn không mang tiền, nên luật gốc ADR-0047 giữ nguyên, không phải sửa.
- **Lớp chính sách giá đưa đón** là phần mới và là nơi duy nhất biết về tiền đưa đón. Nó gồm bảng quy tắc do Quản trị đặt (dữ liệu) và một bộ tính thuần: nhận "chặng này, bao nhiêu khách, ngày nào, ai đặt", trả ra các dòng tiền kèm lời giải thích vì sao ra số đó. Đặt trong module định giá đã có cho hoa hồng, dùng cùng cách "chụp lại lúc xác nhận".
- **Đơn** chỉ nhận các dòng tiền đó, lưu cùng bản chụp, và không tự tính gì thêm.

Đổi mức hay thêm vùng là **sửa dữ liệu**. Thêm một kiểu quy tắc hay điều kiện mới là **thêm một bộ tính nhỏ vào danh sách đăng ký** của lớp giữa. Cả hai đều không đụng lõi vận chuyển hay đơn.

**Còn ba điều cần chủ quyết** (khuyến nghị đứng đầu; không câu nào được tự áp vì chạm tiền hoặc dữ liệu):
1. **Nơi đón do nhân viên tự gõ chữ thì tính sao.** (A) tính theo mức "ngoài vùng" Quản trị đặt, chưa đặt thì **không cho xác nhận** đơn có chặng như vậy; (B) coi như không phụ thu; (C) bắt chọn vùng bằng tay.
2. **Phụ thu có tính hoa hồng đại lý không.** (A) không tính hoa hồng, không có giá vốn; (B) tính như dịch vụ. Nên để Kế toán đọc trước khi chốt.
3. **Lượt đầu làm tới đâu.** (A) lượt 1 = bật/tắt đưa đón theo nhóm + điểm chọn nhanh (không tiền); lượt 2 = lớp giá với **phụ thu theo người, giá xe riêng theo chuyến, giảm tay có lý do, quy tắc giảm tự động**, và bộ điều kiện đủ rộng để thêm giờ, mùa, đối tượng sau mà không đổi bảng; (B) làm cả vào một lượt.

Tôi đã tự giả định hai điểm, đảo ngược được, chủ sửa nếu không đúng: **mã khuyến mại chỉ chừa chỗ** (gắn với điểm thưởng và voucher của Đợt 4, vì chủ vừa chọn cả "mã khuyến mại" lẫn "chỉ chừa chỗ"), và **giảm tay** làm bằng một cơ chế "điều chỉnh có lý do" duy nhất.

## 2. Đã chốt qua hỏi đáp ngày 14/10 (lời chủ, không hỏi lại)

| Câu | Chủ chọn |
|---|---|
| Loại tiền trong "giá đưa đón" | Phụ thu theo người; giá xe riêng theo chuyến; giảm giá / khuyến mại đưa đón. Không gom giá thuê xe trả nhà xe vào đây |
| Sẽ đổi trong 6–12 tháng | Mức tiền và vùng; giá theo giờ hoặc mùa; giá theo đối tượng; cách tính khác hẳn |
| Ai đặt giá, đơn cũ ra sao | Quản trị đặt, có hiệu lực từ ngày; đơn đã xác nhận không đổi |
| Thu và chi | Tách hẳn, không nối; lãi lỗ chuyến để báo cáo làm sau |
| Giá xe riêng | Bảng do Quản trị đặt, máy chủ tính; nhân viên chỉ chọn Xe riêng |
| Giảm giá | Quy tắc tự động theo điều kiện; mã khuyến mại (chừa chỗ); giảm tay có lý do |
| Nhiều quy tắc cùng khớp | Cụ thể nhất thắng, có dòng giải thích và nút Thử tra |
| Bán hàng sửa giá trên đơn | Không; chỉ Quản trị / Toàn quyền điều chỉnh, có lý do |

---

## 3. Phụ lục cho người thi công (đọc khi đã duyệt)

### 3.1 Hiện trạng đã kiểm trong mã
- **Chặng không mang tiền**: `migrations/0034_chang_dua_don.sql` (bảng `ord_transfer_leg`, ADR-0047); có cột `exclusive_vehicle` và `min_vehicle_seats` (migration 0077) hiện **chỉ là cam kết, chưa có giá**; nơi đón/trả là điểm danh mục (`loc_location`) hoặc chữ tự do.
- **Dòng tiền dịch vụ chỉ sinh ở một hàm**: `buildLines` (`src/shared/order-lines.ts`), canh bởi `buildlines-guard.test.ts`, `thanh-tien-mot-ham.test.ts`, `hoa-hong-mot-nguon.test.ts`. Dòng đưa đón là một **nguồn dòng tiền mới**: cập nhật cả ba bài có chủ đích.
- **Phía chi đã có riêng**: `vc_rental_rate`, `vc_route`, `vc_trip_cost_line` (chi phí thuê xe). Giữ nguyên, **không nối** với lớp giá thu khách.
- **Module định giá đã có** (`src/modules/pricing`, bảng `prc_*`, bản chụp thương mại lúc xác nhận, ngăn bậc ưu tiên "cụ thể nhất thắng" và nút Thử tra của hoa hồng, ADR-0077). Người soạn ADR phải đọc lại khuôn này và tái dùng thay vì dựng song song.
- **Chưa có khái niệm vùng.** Nhóm dịch vụ: `ctl_group`, `ctl_service_group` (migration 0055). Địa điểm: `loc_location`, `loc_location_type` (migration 0010, 0034, 0091); chưa có cờ chọn nhanh.

### 3.2 Hợp đồng giữa các lớp (đề xuất)
- **Đầu vào** (DTO phẳng, không đối tượng của module khác): chặng (chiều, điểm đón/trả đã quy ra vùng hoặc "không rõ vùng", giờ đón, cờ xe riêng, số chỗ tối thiểu), số khách tính tiền (`payingGuests`), ngày chạy, nhóm của dịch vụ, loại người đặt (khách lẻ, đại lý, loại đối tác), mã khuyến mại nếu có.
- **Đầu ra**: danh sách `{ loai, moTa, soLuong, donGia, soTien, quyTacId, giaiThich }`, mọi số nguyên VNĐ, tính **ở máy chủ**; hàm thuần dùng chung với form xem trước (một công thức, hàng rào F-03).
- **Quy tắc là dữ liệu**: một bảng quy tắc (loại: `THEO_NGUOI`, `THEO_CHUYEN`, `GIAM`; số tiền hoặc tỷ lệ; hiệu lực từ–đến; không xoá cứng) và một bảng điều kiện dạng dòng (khoá, giá trị) với **danh sách khoá do mã công bố** (vùng, chiều, số khách tối thiểu, nhóm dịch vụ trước; ngày/mùa, khung giờ, loại người đặt sau). Thêm khoá mới không cần migration; khoá lạ bị từ chối ở tầng ứng dụng. Giá phải đánh đổi: ràng buộc CSDL yếu hơn cột riêng, bù bằng bài kiểm danh sách khoá và hàng rào quét.
- **Đăng ký bộ tính**: mỗi `loai` quy tắc và mỗi khoá điều kiện là một hàm nhỏ trong một danh sách đăng ký duy nhất; hàng rào kiến trúc: `van-chuyen` không import `pricing` và ngược lại; `orders` chỉ gọi qua `index.ts` của `pricing`.
- **Chụp lúc xác nhận**: dòng đưa đón và quy tắc đã dùng được chụp cùng lô xác nhận (khuôn bản chụp thương mại); đơn nháp hiện "dự kiến"; đơn đã xác nhận không đổi khi bảng giá đổi. Đổi chặng sau xác nhận đi qua lệnh thay chặng hiện có (một lô) và chụp lại dòng cùng lô.
- **Điều chỉnh có lý do**: một cơ chế duy nhất cho "giảm tay" và sửa mức trên đơn; lưu **cả số máy tính và số điều chỉnh**, bắt buộc lý do, nhật ký không ghi tên hay SĐT khách. Người làm: Quản trị, Toàn quyền. Bán hàng, Đối tác, Thực tập: 403.
- **Vùng của chặng**: chặng đi lấy **nơi đón**, chặng về lấy **nơi trả** (đầu khách sạn). Giả định người soạn, chủ xác nhận khi duyệt ADR. Nhóm đã tắt đưa đón (2B) thì không có chặng nên không có tiền.

### 3.3 Hai phần không tiền
- **2B bật/tắt đưa đón theo nhóm**: cờ trên `ctl_group` (mặc định bật). Nhóm tắt: form ẩn khối đưa đón; máy chủ **từ chối** thêm/sửa chặng cho dịch vụ nhóm đó (lưu nháp, xác nhận, sửa chuyến, thay chặng); đơn đã có chặng giữ nguyên. "Chưa phân loại" luôn cho phép. Đổi cờ ghi nhật ký theo khuôn gán nhóm.
- **2C điểm chọn nhanh**: cờ và thứ tự trên `loc_location`; Quản trị đặt ở màn Địa điểm; form hiện hàng nút ở Nơi trả và ô Khách có mặt tại. Gieo cho Cảng Vinpearl và Bến tàu du lịch Nha Trang nếu đã có trong danh mục (kiểm lúc thi công).

### 3.4 Trang ghép (CLAUDE.md §9)
| Hỏi | Trả lời |
|---|---|
| Bảng dùng chung nhận thêm loại gì | `order_item` nhận thêm **dòng đưa đón** (phụ thu, xe riêng, giảm); không phải dịch vụ danh mục |
| Dòng bản đồ quyền nào chạm | Ghi bảng quy tắc, vùng, điều chỉnh có lý do: Quản trị, Toàn quyền (dùng ô có sẵn hoặc ô mới do ADR quyết; thêm ô nhân đôi bài tập con quyền). Ghi cờ nhóm và cờ điểm: ô `admin.manage` |
| Cổng nào canh cửa nào | Máy chủ tính tiền và chặn chặng cho nhóm tắt; giao diện chỉ ẩn/hiện khối và hiện nút chọn nhanh, **không phải cổng**; Đối tác và Thực tập không sửa được dòng này (ADR-0100) |

### 3.5 Tiêu chí nghiệm thu (viết trước khi làm)
1. Đơn 4 khách, chặng đi ở điểm thuộc vùng mức 20.000: tổng tăng 80.000, một dòng riêng; gửi số tiền khác từ trình duyệt vẫn ra 80.000. Em bé không tính.
2. Xe riêng: dòng tính theo chuyến từ bảng (không theo người), nhân viên không nhập được giá.
3. Điểm tự gõ không rõ vùng: đúng theo quyết định 1.
4. Đổi bảng mức sau xác nhận: đơn cũ giữ nguyên; đơn nháp mới theo mức mới. Đổi chỉ bằng **dữ liệu**, test chứng minh không sửa mã.
5. Hai quy tắc cùng khớp: quy tắc cụ thể nhất thắng, dòng giải thích nêu đúng quy tắc; Thử tra trả cùng số với đơn thật.
6. **Test ranh giới**: thêm một loại điều kiện giả trong bài kiểm (đăng ký thêm một bộ tính) mà `orders` và `van-chuyen` không phải sửa dòng nào; `van-chuyen` không import `pricing` (hàng rào kiến trúc đỏ khi cố ý lách, quan sát một lần, ghi `docs/SO-HANG-RAO.md`).
7. Quyền: Bán hàng, Đối tác, Thực tập ghi bảng quy tắc hoặc điều chỉnh: 403; Quản trị, Toàn quyền: được, có nhật ký; điều chỉnh thiếu lý do: 400.
8. Sổ vàng `golden/gia-dua-don.json`, ca chờ Kế toán (`test.todo`): khoảng mười ca gồm một vùng, hai chặng, em bé, điểm tự gõ, xe riêng, hai quy tắc chồng nhau, giảm tay, đổi mức, đại lý có hoa hồng.

### 3.6 Chia thi công (mỗi việc một phiên, người thi công khác người kiểm)
- **Lượt 1** (2B + 2C): một migration cờ, ADR nhỏ, test đỏ trước, người kiểm độc lập (chạm dữ liệu), kịch bản Chrome cho form.
- **Lượt 2** (lớp giá): ADR riêng, migration bảng quy tắc và điều kiện, sổ vàng cho Kế toán đọc **trước khi viết mã** (khuôn tờ 25 ca), người kiểm độc lập, `npm run trien-khai` do chủ chạy. Mỗi lượt duyệt tối đa ba quyết định chạm quyền/dữ liệu.

### 3.7 Điều chưa kiểm và rủi ro
- **Xây trên lỗ đang hở:** không có mã nào trong `docs/quyen-hoan.json` nằm trên đường mã của đặc tả này, nhưng lượt 2 chạm dòng tiền của đơn nên người thi công **phải đọc lại sổ hoãn** (TNV-G1, G3, G4, HC-4.2 đang mở, hạn 31/10) lúc bắt đầu và ghi kết luận vào nhật ký thi công; năm mục hạn 31/10 làm `npm test` đỏ mọi nhánh từ 1/11.
- Chưa đọc lại chi tiết cách chọn bậc và chụp của hoa hồng (ADR-0077); mục "tái dùng khuôn" ở §3.1 là giả định cần người soạn ADR xác nhận.
- Số migration và số ADR kế tiếp phải kiểm lại lúc thi công (`main` đã có migration 0095; các nhánh chưa gộp có thể giữ số).
- Chưa hỏi Kế toán về hoa hồng trên phụ thu; chưa xem dữ liệu thật để biết bao nhiêu nơi đón đang là chữ tự gõ (cần một câu đếm chỉ-đọc trước khi chủ chọn ở quyết định 1).
- Mức 20.000 / 30.000 là ví dụ chủ nêu, **không phải** hằng số trong mã.
