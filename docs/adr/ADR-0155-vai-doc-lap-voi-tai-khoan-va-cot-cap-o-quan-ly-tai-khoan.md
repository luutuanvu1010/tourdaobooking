# ADR-0155 — Vai bên ngoài trên hồ sơ chưa có tài khoản; cột «Cấp độ đại lý» ở Quản lý tài khoản

- **Trạng thái:** Đề xuất (2026-11-02), chờ chủ dự án duyệt. Chưa có mã.
- **Nguồn:** đặc tả `docs/superpowers/specs/2026-11-01-dat-ve-doi-tac-design.md` §5 QĐ-C, §8 (chủ duyệt thiết kế 2026-11-02, nguyên văn «Duyệt thiết kế»). Trang ghép lượt duyệt: `docs/superpowers/specs/2026-11-02-trang-ghep-dat-ve-luot-2.md`.
- **Số:** 0155 kiểm còn trống 2026-11-02 trên `main` và mọi nhánh trong máy. Không cần migration, kiểm lại lúc thi công.
- **Loại:** việc lớn (dữ liệu, quyền). **Chạm tiền ở mức đọc** (cột cho biết cấp đang áp, không nói số tiền; ghi cấp dùng ba route sẵn có). **Cửa:** hai chiều. Vai đã gắn gỡ được; không thêm cột, không thêm ô quyền.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 2** (ADR-0154, ADR-0155), trần là 3.
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json`, kiểm 2026-11-02; xem ADR-0154).
- **Quan hệ với ADR cũ:** **bổ sung** ADR-0018 (vai bên ngoài nay có thể nằm trên hồ sơ chưa có tài khoản; vai vẫn không sinh quyền khi chưa có tài khoản). **Giữ** ADR-0117 đ3, đ4 (ai gắn; nội bộ không mang), ADR-0048 (`DRIVER_EXTERNAL`), ADR-0077 (đơn đã xác nhận không đổi hoa hồng), ADR-0151 (đổi cấp riêng một lô), luật R26 lúc tạo tài khoản.

## Bối cảnh

Chủ 2026-11-01: các vai bên ngoài (hướng dẫn viên, lễ tân, tài xế, lữ hành) «cần độc lập với tài khoản người dùng; độc lập với các cấp độ đại lý», và Quản lý tài khoản cần «có thêm cột để thể hiện và thiết lập nhanh cấp độ đại lý».

Việc tách vai với cấp đã có từ ADR-0117: vai có cấp mặc định, từng người có cấp riêng. Chưa độc lập ở hai chỗ. Một, route gắn vai ở Danh bạ trả 409 `role_via_account` với mọi vai nhóm bên ngoài, nên một công ty lữ hành chưa có tài khoản không mang vai được và không có cấp theo vai. Hai, muốn xem hay đổi cấp một đối tác phải sang trang Hoa hồng.

## Quyết định

**Đ1. Hồ sơ chưa có tài khoản mang được vai bên ngoài.**

1. Route gắn và gỡ vai ở Danh bạ cho phép vai nhóm bên ngoài **khi đồng thời**: vai đang nằm trong danh sách được hưởng còn bật (`prc_beneficiary_role`, đọc qua view); hồ sơ **chưa có tài khoản**; hồ sơ không phải nội bộ (ADR-0117 đ4). Gồm cả hồ sơ tổ chức. Còn lại vẫn 409 `role_via_account`.
2. Vai không sinh quyền, không tạo đăng nhập. Hồ sơ đã có tài khoản vẫn đổi vai ở Quản lý tài khoản. Lúc tạo tài khoản cho hồ sơ đang mang vai, luật R26 có sẵn bắt chọn vai đó nên quyền sinh đúng lúc ấy.
3. Mở đúng năm vai có sẵn. `DRIVER_EXTERNAL` (Tài xế đối tác) **không** thuộc diện này (ADR-0048); «tài xế» trong lời chủ hiểu là `TAXI_DRIVER`.
4. Ai làm: như ADR-0117 đ3 (Quản trị, Toàn quyền ở Danh bạ). Không thêm ô quyền.
5. `R-LC-1` và `R-PRC-*` phải vẫn xanh trên dữ liệu thử có hồ sơ loại này. Có ca e2e: công ty lữ hành không tài khoản, gắn vai, gắn cấp, văn phòng chọn «Qua đối tác», xác nhận đơn, hoa hồng đúng cấp.

**Đ2. Cột «Cấp độ đại lý» ở Quản lý tài khoản.**

1. Chỉ dòng tài khoản giữ quyền Đối tác có giá trị. Công ty lữ hành không tài khoản vẫn đặt cấp ở trang Hoa hồng.
2. **Thấy cột** khi có `partner.commission.view`: Hành chính nhân sự không có nên không thấy và không gọi route. **Sửa** khi có `partner.commission.write`: trên trang này là Quản trị, Toàn quyền.
3. Chữ trong ô: «Đại lý cấp 3 (theo vai)», «Đại lý cấp 2 (riêng)», «Chưa có cấp», «Xung đột» (hai vai ra hai cấp, ADR-0117 đ2). Bấm mở bảng: chọn cấp, từ ngày (mặc định hôm nay), hoặc «Về theo vai». Hồ sơ có mức riêng thì ô thêm nhãn «có mức riêng», trỏ sang trang Hoa hồng, vì cột nói cấp đang áp chứ không nói số tiền.
4. **Ghi:** dùng đúng ba route sẵn có (đặt, đổi, ngừng cấp riêng). **Đọc:** một route mới chỉ đọc `GET /api/pricing/cap-hien-hanh?ids=…`, cổng `office`, hỏi `partner.commission.view`, chặn `holdsPartner`, tối đa theo danh sách hồ sơ của trang, một câu truy vấn. Tính ở máy chủ, có bài đối chiếu với `GET /api/pricing/ho-so/:id/hoa-hong`.

## Hệ quả

- Danh sách «Đặt qua đối tác» có thêm hồ sơ không tài khoản, đúng ý. Trang Danh bạ hiện vai bên ngoài trong ô gắn vai khi hồ sơ chưa có tài khoản.
- Không tạo sẵn bảy cấp: mức hoa hồng từng cấp do công ty đặt ở trang Hoa hồng.
- Lọc theo vai ở Quản lý tài khoản (lượt 1) vẫn chỉ thấy tài khoản, không thấy hồ sơ chưa có tài khoản.

## Tiêu chí nghiệm thu

Đặc tả §8 mục QĐ-C (a) tới (g) và phần Chung. Thi công xong phải có người kiểm độc lập.
