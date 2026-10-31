# Phiếu chốt kế hoạch — Tình trạng bán của dịch vụ (30/10/2026)

> Đi kèm `DE-XUAT-TINH-TRANG-BAN-DICH-VU-2026-10-30.md`. Chủ trả lời từng ô, hoặc ghi «theo khuyến nghị» cho cả phiếu.

## A. Phần Hòn Tằm — luật đã duyệt 28/10 (ADR-0146), chỉ cần lệnh

| # | Cần chủ | Khuyến nghị | Trả lời |
|---|---|---|---|
| A1 | Lệnh «thi công ADR-0146» | Có | |
| A2 | Chạy hai lệnh đếm chỉ đọc ở mục C, gửi lại kết quả | Chạy trước khi phát hành | |
| A3 | Danh sách vé Hòn Tằm cần chặn và loại đối tác bị chặn (ngoài Lễ tân khách sạn, Tài xế taxi) | Gửi sau cũng được: đây là dữ liệu nhập trên màn hình, không chặn kế hoạch | |

## B. Phần Đóng bán — cần ADR mới (một lượt duyệt riêng, đúng trần 3 điều)

| # | Câu | Phương án | Khuyến nghị | Trả lời |
|---|---|---|---|---|
| B1 | «Hết sau 5 giờ» áp cho | (a) mọi ngày đi · (b) chỉ ngày đi hôm nay · (c) người đóng chọn mỗi lần | (c), mặc định (b) | |
| B2 | Ai được mở lại | (a) Bán hàng, Quản trị, Toàn quyền · (b) Bán hàng chỉ đóng; mở lại do Quản trị, Toàn quyền | (b) | |
| B3 | Văn phòng có được bán vượt khi đang đóng không | (a) Không ai vượt được, muốn bán phải mở lại · (b) Quản trị, Toàn quyền vượt được, phải ghi lý do | (a) | |
| B4 | Đơn đang chờ xác nhận có dịch vụ vừa bị đóng | (a) Không cho bấm «Còn vé» · (b) Chỉ cảnh báo | (a) | |
| B5 | Đối tác thấy dịch vụ đang đóng thế nào | (a) Hiện mờ kèm nhãn «Tạm ngừng» · (b) Ẩn hẳn | (a) | |
| B6 | Báo cho ai khi một dịch vụ bị đóng | (a) Không báo, chỉ hiện trên danh mục · (b) Báo người có nháp hoặc đơn chờ xác nhận chứa dịch vụ đó | (b) | |
| B7 | Lý do khi đóng | (a) Bắt buộc · (b) Tuỳ chọn | (a), vì câu báo cho người đặt cần lý do | |

## C. Hai lệnh đếm chỉ đọc (chủ tự chạy, không ghi gì)

Đứng ở thư mục dự án `tourdaobooking`. Đã thử cú pháp trên cơ sở dữ liệu dựng từ toàn bộ migration trong máy; **chưa chạy trên dữ liệu thật**.

**1. Tài khoản Đối tác chưa sẵn sàng cho luật chặn.** Hai cột cuối nên bằng 0.

```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT COUNT(*) AS tai_khoan_doi_tac, SUM(s.party_id IS NULL) AS chua_gan_ho_so, SUM(s.party_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code WHERE r.party_id = s.party_id AND t.is_partner_label = 1 AND t.active = 1 AND (r.valid_to_date IS NULL OR r.valid_to_date >= date('now', '+7 hours')))) AS ho_so_chua_co_loai FROM staff s WHERE s.active = 1 AND EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = s.id AND p.permission_type_code = 'PARTNER' AND p.valid_to_at IS NULL)"
```

**2. Các loại đối tác hiện có và số hồ sơ mang mỗi loại** (kiểm đã có Lễ tân khách sạn và Tài xế taxi chưa).

```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT t.code, t.name, t.active, COUNT(DISTINCT r.party_id) AS so_ho_so FROM pty_role_type t LEFT JOIN pty_party_role r ON r.role_type_code = t.code AND (r.valid_to_date IS NULL OR r.valid_to_date >= date('now', '+7 hours')) WHERE t.is_partner_label = 1 GROUP BY t.code ORDER BY t.name"
```
