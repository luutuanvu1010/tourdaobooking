# Đặc tả: một ngày khởi hành cho cả đơn — ép ở máy chủ và ở "Sửa thông tin chuyến"

- **Nguồn quyết định:** chủ dự án, phiên chat 2026-09-25: *"Cả đơn chỉ có 1 ngày duy nhất"* (ADR-0021), rồi *"giờ đào sâu vào Sửa thông tin chuyến, làm tận cùng"* — tức làm luôn phần ADR-0021 ghi "chưa làm".
- **Loại việc:** việc lớn (luật dữ liệu ở máy chủ) → có người kiểm độc lập, chỉ đọc (CLAUDE.md §3).
- **Không migration, không đổi bảng, không đổi hình dạng API.** Ngày vẫn lưu ở `order_service.depart_date` từng dịch vụ; luật mới chỉ từ chối yêu cầu làm các dịch vụ lệch ngày nhau.

## Luật
1. **Lập / sửa đơn nháp** (`POST /api/orders`, `PUT /api/orders/:id`): mọi dịch vụ phải cùng một giá trị ngày khởi hành. "Chưa có ngày" cũng tính là một giá trị: tất cả trống thì được; một số có ngày, một số trống thì bị từ chối. Lỗi 400: "Mọi dịch vụ trong đơn phải cùng một ngày khởi hành."
2. **Sửa thông tin chuyến** (`PUT /api/orders/:id/trip`, đơn nháp hoặc đã xác nhận; API vẫn nhận gửi một phần dịch vụ):
   - Tính trạng thái SAU khi sửa: dịch vụ có trong yêu cầu lấy ngày mới, dịch vụ vắng giữ ngày đã lưu.
   - Nếu yêu cầu **đổi ngày của ít nhất một dịch vụ**, thì sau khi sửa mọi dịch vụ phải cùng một ngày. Không đạt → 400 với cùng câu lỗi trên.
   - Nếu yêu cầu **không đổi ngày nào** (chỉ giờ, điểm đón, check-in, ghi chú), thì được lưu kể cả khi đơn cũ đang lệch ngày. Lý do: đơn cũ trước 1.11 có thể đã lệch ngày; không được khoá người dùng khỏi việc sửa ghi chú hay giờ đón.
   - Các luật cũ giữ nguyên: đơn đã xác nhận không được xoá ngày; đổi ngày thì ngày mới phải trong khoảng xác nhận.
3. **Bảng "Sửa thông tin chuyến"** (trang đơn):
   - Có **một ô "Ngày khởi hành"** ở đầu bảng; từng dịch vụ không còn ô ngày riêng.
   - Lưu thì gửi ngày đó cho mọi dịch vụ.
   - Đơn cũ lệch ngày: ô để trống, kèm dòng "Các dịch vụ đang khác ngày — chọn một ngày nếu muốn đổi; để trống thì giữ ngày cũ của từng dịch vụ." Để trống mà lưu thì gửi lại ngày cũ của từng dịch vụ (không đổi ngày).
   - Lỗi chặn Lưu chỉ hiện **một lần** cho cả đơn, không lặp theo từng dịch vụ.
4. **Form Tạo/sửa đơn** (đã làm ở ADR-0021): giữ nguyên.

## Giả định (AI tự đặt, ghi lại theo P8)
- G1: "Chưa có ngày" + "có ngày" trong cùng đơn nháp là lệch → từ chối. Form không bao giờ tạo ra trường hợp này.
- G2: Không tự sửa đơn cũ đang lệch ngày trên production (đó là sửa dữ liệu thật, cần chủ quyết riêng). Đếm số đơn lệch: lệnh chỉ-đọc cho chủ ở báo cáo.
- G3: Không thêm bất biến vào `audit-invariants` ở lượt này. Lý do: đơn cũ có thể đang lệch, sẽ làm kiểm tra sau deploy đỏ. Để lại sau khi chủ quyết G2.

## Tiêu chí nghiệm thu (kiểm được)
- A1 (test thuần): `validateOrder` từ chối 2 dịch vụ khác ngày, từ chối "một có ngày, một trống", nhận 2 dịch vụ cùng ngày, nhận 2 dịch vụ cùng trống.
- A2 (test thuần): `validateTripUpdate` từ chối yêu cầu đổi ngày để đơn thành lệch (kể cả gửi một phần); nhận yêu cầu đổi ngày cho mọi dịch vụ về cùng một ngày; nhận yêu cầu chỉ sửa ghi chú trên đơn cũ đang lệch ngày.
- A3 (e2e, API thật): POST đơn 2 dịch vụ khác ngày → 400 đúng câu; PUT /trip đổi ngày một dịch vụ của đơn 2 dịch vụ → 400; đổi cả hai về cùng ngày → 200.
- A4 (Chrome): bảng sửa chuyến có đúng một ô ngày; đổi ngày → lưu → mọi dịch vụ mang ngày mới (đọc lại qua API).
- A5: `npm test` xanh, `npm run typecheck` 0 lỗi, `npm run test:e2e` xanh, các kịch bản Chrome A2 xanh.
- A6: người kiểm độc lập (chỉ đọc) báo ĐẠT.
