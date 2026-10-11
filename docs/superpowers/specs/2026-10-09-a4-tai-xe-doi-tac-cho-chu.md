# A4 Tài xế đối tác dùng Nền tảng: điều chủ cần biết và cần làm

> Hồ sơ có ngày, viết 2026-10-12, đóng băng sau khi chủ đọc. Nhánh `a4-tai-xe-doi-tac`, chưa gộp, chưa có người kiểm độc lập nghiệm thu lại. Viết bằng lời thường theo yêu cầu của điều phối; số liệu kỹ thuật nằm ở nhật ký thi công A4.

## 1. Việc pháp lý: tài xế nhà xe ngoài công ty thấy gì về khách

Sau A4, một tài xế của nhà xe đối tác (không phải nhân viên công ty) đăng nhập được Nền tảng và thấy các chuyến mình được xếp lái. Điều họ thấy chia ba loại.

**Chỉ khi đã qua hạn Từ chối và đã đến ngày chạy** (mặc định hạn là 12 giờ trước giờ chạy): họ tên và năm sinh từng khách, tên và số điện thoại người liên hệ của đơn, mã đơn, và địa chỉ từng điểm đón / trả để bấm "Chỉ đường". Tài xế công ty thì thấy những thứ này từ 00:00 ngày chạy, không có hạn.

**Mọi lúc, kể cả trước hạn:** mã chuyến, biển số xe, giờ chạy, tên điểm đón / trả (đây là chữ gõ tay nên có thể chứa tên người nếu nhân viên gõ vào), số khách, số hiệu chuyến bay, tên hướng dẫn viên đi kèm, và số điện thoại văn phòng (khi chính sách điều phối đã nhập số).

**Không bao giờ:** tiền, giá, giấy tờ đầy đủ của người, khách hoặc mã đơn của xe khác. Họ cũng không bổ sung được tên khách (ô này vẫn đóng cho tài xế đối tác theo lời chủ ngày 5/10).

Quyết định ngày 30/9 vẫn ghi việc đưa danh sách tên khách cho tài xế nhà xe ngoài là "chưa ai kiểm" về mặt pháp lý, và A4 không làm thay điều đó. Đề nghị bạn làm hai việc trước khi báo cho nhà xe dùng: nhờ người hiểu luật xem việc này có ổn không (đặc biệt về dữ liệu cá nhân của khách), và tự thử bằng một tài khoản tài xế nhà xe thật trên iPhone. Chưa ai thử trên iPhone thật.

## 2. Sau A4, tài xế đối tác có nhận tin giờ hẹn và tin chuyến không?

Có. Ô `trip.view` của quyền Tài xế đối tác đã chuyển sang "chuyến mình đang lái", nên họ nhận tin "được xếp lái", "không còn lái" và "văn phòng đổi giờ đón" đúng như tài xế công ty. Câu tin không có mã đơn và không có tên khách. Văn phòng nhận tin khi tài xế từ chối chuyến.

## 3. Hai lệnh đếm chỉ đọc cho bạn chạy

Quyền mới có hiệu lực ngay lúc triển khai, nên tài xế đối tác nào đã có chuyến sẽ thấy dữ liệu theo quy tắc ở mục 1 ngay. Hai lệnh dưới đây chỉ đếm, không sửa gì. Chạy ở thư mục dự án chính, mỗi lệnh một lần.

Lệnh 1 đếm tài khoản Tài xế đối tác đang hoạt động:

```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS tai_khoan FROM staff s JOIN stf_permission p ON p.staff_id = s.id WHERE s.active = 1 AND p.permission_type_code = 'DRIVER_PARTNER' AND p.valid_to_at IS NULL"
```

Lệnh 2 đếm số dòng lái đang mở của các tài xế đó trên chuyến chưa kết thúc, và trong đó bao nhiêu dòng đã quá hạn Từ chối (những người này sẽ thấy tên khách ngay khi triển khai):

```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS dong_lai_mo, coalesce(sum(CASE WHEN h.deadline_ms < CAST(strftime('%s','now') AS INTEGER) * 1000 THEN 1 ELSE 0 END), 0) AS da_qua_han FROM vc_trip_driver d JOIN vc_trip t ON t.id = d.trip_id JOIN staff s ON s.party_id = d.driver_party_id JOIN stf_permission p ON p.staff_id = s.id AND p.permission_type_code = 'DRIVER_PARTNER' AND p.valid_to_at IS NULL LEFT JOIN vc_refuse_deadline h ON h.trip_id = d.trip_id AND h.driver_party_id = d.driver_party_id WHERE s.active = 1 AND d.valid_to_at IS NULL AND t.status IN ('PLANNED', 'RUNNING')"
```

Nếu `--command` lỗi đăng nhập, đừng dùng `--file` (cổng nhập tệp không nhận đăng nhập kiểu này); báo lại để soạn cách khác. Cả hai lệnh đã chạy thử đúng cú pháp trên dữ liệu thử cục bộ (kết quả 0). Chưa chạy trên production vì AI không được chạy lệnh remote.

Nếu lệnh 1 ra 0, chưa có tài khoản nào, và mục 1 chỉ cần giải quyết trước khi tạo tài khoản đầu tiên.

## 4. Hai điều khác nên biết

Mọi chuyến của tài xế nhà xe là xe thuê, nên khi bấm Xuất bến vẫn vướng điều kiện "thiếu giá": văn phòng phải nhập giá xe thuê trước. Chưa làm trong A4: nhờ đón chéo giữa tài xế (gói A5), báo bận cho tài xế công ty, chia doanh thu taxi (đã ghi vào `docs/BACKLOG.md`). Trợ giúp dành cho văn phòng chưa có chữ về dải "Tài xế bận", nhãn "Bận" và tin "đã từ chối".
