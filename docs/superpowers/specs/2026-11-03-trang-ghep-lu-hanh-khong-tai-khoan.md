# Trang ghép: công ty lữ hành chưa có tài khoản (ADR-0155 Đ1, C3, C4, C6)

Theo `CLAUDE.md` §9. Hồ sơ có ngày 2026-11-03. Trang ghép `2026-11-02-trang-ghep-dat-ve-luot-2.md` giữ nguyên; trang này viết lại phần hồ sơ không tài khoản, vì sau ngày đó đã có phân định trách nhiệm, Khách đặt cọc trước (bản 2.58) và chính sách chiết khấu (ADR-0161).

**Đếm:** ba quyết định, đúng trần: Đ1 kèm C6; C3; C4. **Điều kiện trình:** đóng `TNV-G3`, `TNV-G4` trước, theo lời chủ 2026-11-02 «vá xong mới làm, nên tóm tắt trước để hiểu».

**Căn cứ:** người kiểm độc lập 3/11 chạy trên khung thử với mọi migration tới `0137`. Route Đ1 chưa có nên vai được chèn bằng SQL.

## 1. Bảng nhận loại dữ liệu mới

| Bảng | Thêm | Ghi chú |
|---|---|---|
| `pty_party_role` | Năm vai bên ngoài trên hồ sơ chưa có tài khoản, gồm cả tổ chức | Năm vai có `is_partner_label = 0`, nên trigger và view của loại tự thêm không canh chúng |
| `prc_party_tier`, `prc_commission_rule` | Cấp riêng, mức riêng của các hồ sơ này | Đã chạy: gắn 201, «Thử tra» ra đúng bậc |
| Bản chụp hoa hồng, `bil_debt_line` | Bên hưởng không đăng nhập | Đã chạy tới Đã giao, trả hoa hồng, Hoàn thành, biên nhận |
| `bil_attribution` | Không mở loại mới | Nhà xe, nhà cung cấp không tài khoản đã là bên chịu hợp lệ |
| Khoản cọc ADR-0159 | Không áp | Ô cọc chỉ cho tài khoản Đối tác; văn phòng ghi đường thu thường |

## 2. Dòng bản đồ quyền chạm các bảng này

Không thêm ô, giá trị ô không đổi; việc mỗi ô mở ra thì đổi ở hai dòng đầu.

| Ô | Áp cho | Ghi chú |
|---|---|---|
| `admin.manage` | Gắn và gỡ năm vai ở Danh bạ | Quản trị, Toàn quyền. Không sinh quyền vì không có tài khoản |
| Tra số của Hành chính nhân sự (`GET /api/staff/ho-so-khop`, ADR-0071 đ3b) | Thấy id, tên, vai của hồ sơ loại này | Câu C4. Đã chạy: hôm nay đã thấy nếu hồ sơ có vai, không cần mã mới |
| `partner.commission.view`, `.write` | Đọc và đặt cấp, mức cho hồ sơ này | Không giả định có tài khoản. Hành chính nhân sự không có `view` |
| `attribution.decide`, `ledger.write` | Chọn hồ sơ này làm bên chịu, ghi sổ | Không đổi |

## 3. Cổng nào canh cửa nào, kể cả chỗ giao diện ẩn hiện đổi nghĩa

- **Gắn vai:** chỉ lớp route (`src/modules/parties/index.ts`, chỗ gọi `isAccountGroup`). Chưa có tài khoản, không gắn nơi, không ngày tương lai, không ngày kết thúc, không phải nội bộ: mỗi chốt là mã mới, cần dòng sổ và một lần quan sát chặn. CSDL chỉ đỡ `pty_party_role_group_conflict` và `party_role_overlap`. Không cần migration.
- **Kiểm định kỳ:** `R-LC-1` không thấy hồ sơ không tài khoản; `R-PRC-6` và `nhanDoiTac` của gộp phải mở rộng sang năm vai.
- **Tiền:** trần giảm giá, luật bán (409 `sales_blocked`), rào `not_deliverable` ở Đã giao đều đã chạy và đạt với hồ sơ này.
- **Tạo tài khoản sau:** cá nhân chọn đúng vai thì 201, quyền sinh đúng lúc, cấp riêng còn; tổ chức 409 như hôm nay.
- **Ẩn hiện đổi nghĩa:**
  - danh sách «Đặt qua đối tác» thêm hồ sơ không tài khoản, đúng ý;
  - Danh bạ hiện năm vai trong ô gắn vai khi hồ sơ chưa có tài khoản, ô «Nơi làm» ẩn;
  - màn phân định thêm một dòng cho bên chịu không có tài khoản (mục 4);
  - câu `merge_source_account_role` hôm nay trỏ sang Quản lý tài khoản, là ngõ cụt với hồ sơ này; phải nói đúng màn;
  - công tắc «Ẩn thông tin khách» không áp vì đơn do văn phòng lập.

## 4. Điều khác với đề xuất ngày 2/11

- **C3, hiện trạng rộng hơn:** đơn nháp của tổ chức đã thôi vai không đổi bên đặt được (400), nhưng bấm Xác nhận thẳng thì 200, hoa hồng `NONE`, không ai được báo; cá nhân cũng vậy. Phương án «chấp nhận mất lặng lẽ» vì thế áp cho cả tổ chức. Khuyến nghị chặn gỡ càng có lý do.
- **C3 và gộp:** gộp hồ sơ trùng đòi gỡ vai; nếu chặn gỡ khi còn nháp hoặc cấp riêng thì lối ra là xử lý nháp, kết thúc cấp riêng trước. Câu báo phải nêu rõ.
- **Phân định:** bên chịu không có tài khoản không nhận tin, không thấy hạn 3 ngày làm việc, không có đường phản hồi. Nợ vẫn ghi, không tự bù trừ, không kẹt dữ liệu. Đã chạy: 0 tin. Màn phân định phải nói điều này với người phân định.
- **Đặt cấp muộn:** đơn đã chụp `MISSING` không tự gỡ khi đặt cấp sau; Kế toán ghi mức tay như ADR-0077. Đã chạy.
- **Đã cũ:** dòng Trạng thái «Chưa có mã»; đoạn «Phần còn lại của hai lỗ» dưới C5. Đ2 đã lên 2.57; đ9, tin người thu, Đ6a đã lên 2.58; Đ5d sửa theo `2026-11-03` và lên ở bản kế tiếp.

## Chưa kiểm

E2e, kịch bản Chrome, iPhone. Cuộc gọi route Đ1 vì chưa có route. Lệnh gộp thật. Ca đua tạo tài khoản `DRIVER_EXTERNAL` trong lúc Danh bạ thêm vai. Production: hồ sơ mang vai cũ `STAFF`, loại tự thêm trùng tên, đủ bảy cấp chưa. Các dòng trên thành bài kiểm khi thi công (tiêu chí ở ADR-0155).
