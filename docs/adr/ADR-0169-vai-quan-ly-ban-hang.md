# ADR-0169 — Vai «Quản lý bán hàng»; công tắc kiểm vé và Ngừng bán về màn Dịch vụ & giá

- **Trạng thái:** **accepted** — chủ dự án duyệt trong chat 2026-11-05. Số 0169: đã soát mọi nhánh, 0168 đang ở nhánh Trả sau, chưa ai dùng 0169.
- **Ngày:** 2026-11-05   **Loại:** **hai chiều** về quyền (đổi ô bằng ADR sau); **một chiều một phần** về dữ liệu (thêm mã quyền, mã vai bằng migration, chỉ thêm).
- **Lời chủ dự án (chat 2026-11-05, AI ghi lại, không tự quyết):**
  - Câu gốc về màn hình: *"vị trí của Dịch vụ cần kiểm vé, có nên chăng là đưa chung vào trong dan sách dịch vụ và giá không, ở đó có luôn toggle bật cần kiểm hoặc không cần kiểm dành cho danh mục vé hoặc vé đơn lẻ ? thay vì 1 trang riêng thế này"*.
  - Câu gốc về vai: *"vậy nên chăng ta sinh ra thêm 1 vai nữa là Quản lý bán hàng ( Sales Manager) , người này sẽ có quyền cao hơn một người bán hàng (vai bán hàng) bình thường để gán cho họ quyền gạt, thiết lập ngừng bán , công tắc \"vé cần xác nhận \" và nhiều quyền khác"*.
  - Duyệt: *"Duyệt 1,2; với 3 thì thêm Admin và giám đốc có quyền gán."* (ba điểm do AI trình, chép ở Đ1–Đ3 dưới đây).
- **Liên quan / sửa:**
  - **ADR-0136 Đ1** (accepted): cờ «cần xác nhận» chỉ Toàn quyền — ADR này **thay một phần**: ô ghi cờ nay gồm Quản lý bán hàng, Quản trị, Toàn quyền. Công tắc tự xác nhận nội bộ giữ `settings.ops`, luật cờ giữ nguyên.
  - **ADR-0071** (accepted): Nhân sự gán vai thường — ADR này thêm một vai Nhân sự không gán được dù vai đó không phải vai «chỉ Toàn quyền».
  - **ADR-0018, ADR-0001 điều 4**: vai chỉ sinh quyền, cổng vẫn là `can()`.

## Bối cảnh

Bản 2.62 đưa cờ «cần kiểm vé» lên một trang riêng chỉ Toàn quyền dùng. Chủ muốn gộp vào Dịch vụ & giá. Mở công tắc cho mọi Bán hàng thì một nhân viên tự tắt được bước kiểm của chính mình; nên chủ chọn thêm một cấp giữa Bán hàng và Quản trị.

## Quyết định

**Đ1. Vai và quyền của vai.** Thêm vai nội bộ «Quản lý bán hàng» (mã vai `SALES_MANAGER`) và mã quyền cùng tên, nhãn «Quản lý bán hàng». Bộ quyền mặc định của vai là `SALES` + `SALES_MANAGER`, nên người giữ vai làm được mọi việc của Bán hàng. Cột mới chỉ có thêm hai ô nghiệp vụ, cộng các ô tự phục vụ như mọi tài khoản nội bộ:
- `catalog.confirm_flag.write`: bật, tắt «cần kiểm vé» theo vé và theo cả nhóm.
- `catalog.hidden.write`: Ngừng bán, Mở bán lại một dịch vụ.

Cả hai ô: Quản lý bán hàng, Quản trị, Toàn quyền `any`; các cột khác `none`. Tài khoản giữ quyền Đối tác không dùng được hai việc này, kể cả tài khoản kiêm (*"Có quyền Đối tác là áp"*). Sửa giá, đồng bộ Sheet, sửa nhóm vẫn ở `admin.manage`. Công tắc «Nhân viên tự kiểm vé đơn mình lập» vẫn `settings.ops`, chỉ Toàn quyền. Vai này không giữ quyền tiền. Chính sách một máy / nhiều máy (ADR-0085) không có dòng riêng cho mã mới: người giữ vai đi theo dòng của Bán hàng.

**Đ2. Bán hàng thường không bị rút quyền.** Năm việc Bán hàng thường đang làm giữ nguyên: luật bán, gắn đặc điểm dịch vụ, kho vé điện tử, đặt gấp, điều phối chuyến. Muốn chuyển việc nào lên Quản lý thì ADR sau.

**Đ3. Ai được gán.** Chỉ Toàn quyền và người giữ Quản trị được gán, gỡ vai và cộng, bớt tay mã quyền này, trên mọi đường ghi quyền (gán vai, tạo tài khoản, đường quyền cũ), kể cả dòng chỉnh tay «ngủ». Nhân sự không gán, không gỡ được; Nhân sự vẫn tạo tài khoản như vai thường rồi người có thẩm quyền nâng lên.

Cách đọc lời chủ: *"Admin và giám đốc"* = người giữ quyền `ADMIN`. Vai Giám đốc có mặc định `ADMIN` (ADR-0072), nên được; vai Điều hành chung cũng mặc định `ADMIN` nên cũng được. Bản đồ quyền không phân biệt Giám đốc với Quản trị, và ADR này không tạo phân biệt đó.

**Đ4. Màn hình.** Gỡ trang riêng `/dich-vu-kiem-ve`. Ở Dịch vụ & giá:
- Quản trị, Toàn quyền thấy đủ màn cũ, thêm công tắc «Cần kiểm vé» ở dòng vé và dòng nhóm, lựa chọn lọc «Cần kiểm vé».
- Toàn quyền thấy thêm công tắc tự kiểm vé.
- Quản lý bán hàng thấy màn hẹp: tên vé theo nhóm, ô tìm, công tắc kiểm vé theo vé và cả nhóm, nút Ngừng bán / Mở bán lại. Không có giá ghi đè, đồng bộ, sửa nhóm.
- Bán hàng thường không có mục này.

**Đ5. Máy chủ.** Tuyến cờ `/api/cai-dat/xac-nhan-don` chuyển sang cổng `office`, thân hỏi ô theo từng việc: thân có `tuXacNhanNoiBo` hỏi `settings.ops`, thân cờ hỏi `catalog.confirm_flag.write`. Thêm hai tuyến hẹp cho Quản lý bán hàng: `GET /api/catalog/quan-ly-ban` (mã, tên, nhóm, đã ngừng bán; không giá, không dữ liệu nhà cung cấp) và `PUT /api/catalog/:code/ngung-ban`. `PATCH /api/catalog/:code` giữ `admin.manage`.

## Trang ghép (CLAUDE.md §9)

**Bảng chạm tới:** `stf_permission_type` thêm một mã; bảng vai thêm một mã; `ord_service_confirm_flag` và `catalog_override` không đổi cấu trúc, chỉ thêm người ghi được.

| Dòng bản đồ quyền | Áp cho | Cổng máy chủ | Chỗ giao diện ẩn/hiện |
|---|---|---|---|
| `catalog.confirm_flag.write` | Vé và nhóm trong danh mục | `office` + ô + không giữ Đối tác | Công tắc ở `/catalog`; mục Dịch vụ & giá ở bảng mục |
| `catalog.hidden.write` | Một dịch vụ | `PUT …/ngung-ban`: `office` + ô + không giữ Đối tác; `PATCH /api/catalog/:code` vẫn `admin` | Nút Ngừng bán / Mở bán lại ở `/catalog` |
| `settings.ops` | Công tắc tự kiểm vé | Thân `tuXacNhanNoiBo` | Công tắc đầu `/catalog`, chỉ Toàn quyền |
| `admin.manage` | Giá, Sheet, nhóm | Giữ nguyên | Các khối đó không vẽ ở màn hẹp |
| Gán vai, mã quyền | Tài khoản nội bộ | `account.edit` + `roleAssignmentProblem`, `highPermissionProblem`; `account.create` + hai hàm đó | `web/role-picker.ts` khoá ô với người không có `admin.manage` |

**Cổng không đổi nghĩa:** mã mới cố ý KHÔNG vào `OFFICE_GATE`, vì `isOffice` còn mở Danh bạ, tin đơn và trang đầu. Người giữ vai qua cổng nhờ mã `SALES` đi kèm. Tài khoản bị bớt tay `SALES` thì không qua cổng và không dùng được hai việc mới (`dungManHepDichVu`).

**Rủi ro đã nói với chủ:** người giữ vai tắt được bước kiểm của vé; có nhật ký, không ngăn. Bớt được rủi ro cũ là mọi Bán hàng đều làm được.

## Điều kiện nghiệm thu

1. Nhân sự gán vai, cộng tay mã quyền, tạo tài khoản mang vai hay gỡ vai đều nhận 403; Quản trị, Giám đốc, Toàn quyền làm được.
2. Bán hàng thường nhận 403 ở hai ô mới; Quản lý bán hàng đổi được cờ và Ngừng bán, nhưng nhận 403 khi gửi `tuXacNhanNoiBo`, khi gọi `PATCH /api/catalog/:code` và `GET /api/catalog/admin`.
3. Tài khoản giữ Đối tác nhận 403 ở hai tuyến hẹp và tuyến cờ.
4. `GET /api/catalog/quan-ly-ban` không có khoá giá.
5. Ảnh chụp mọi tập quyền: mọi tập cũ giữ nguyên, chỉ thêm các tập có mã mới.
