# Bản ghi quyết định kiến trúc (ADR)

Theo Hiến pháp: P5 (mọi quyết định để lại dấu vết), N3 (không quyết định kiến trúc nếu không có bản ghi do chủ dự án duyệt), Điều 7.2 (khai cửa một chiều hay hai chiều). Mỗi quyết định một tệp, đánh số tăng dần; **không sửa ADR đã accepted** — chỉ thay bằng ADR mới trỏ về ADR cũ. Mẫu: `playbook/templates/03-ADR-0001-template.md` (bản chép chỉ-đọc của Core, xem ADR-0012; ở đó ADR nằm ở `project/adr/`, dự án này đặt ở `docs/adr/`).

| ADR | Quyết định | Cửa | Trạng thái |
|---|---|---|---|
| [0001](ADR-0001-danh-tinh-party-role-relationship.md) | Danh tính theo mô hình Party–Role–Relationship (hồ sơ, vai trò, quan hệ; `staff` trỏ hồ sơ; số đăng nhập ≠ số liên hệ; luật nhận dạng hồ sơ) | một chiều | **accepted** |
| [0002](ADR-0002-modular-monolith-ranh-gioi-va-so-huu-du-lieu.md) | Modular Monolith: năm quy tắc giữ nguyên + tám điều siết; sở hữu bảng, tiền tố, view công bố, sổ máy đọc được, bài kiểm máy | một chiều | **accepted** |
| [0003](ADR-0003-chuan-mo-hinh-du-lieu-oracle-er.md) | Chuẩn mô hình dữ liệu (Oracle/ER): 3NF, bảng tra cứu khoá mã, cột WHO không khoá ngoại, hiệu lực, expand–contract, trình tự dựng lại bảng đã kiểm | một chiều | **accepted** |
| [0004](ADR-0004-mo-rong-pham-vi-thu-tien-hoa-don.md) | Mở rộng phạm vi: sổ thu tiền, kế toán, yêu cầu hoá đơn (sửa SPEC §1) | hai chiều (phạm vi) | **accepted** |
| [0005](ADR-0005-quyen-app-da-tri.md) | Quyền app đa trị (`stf_permission`), **không dựng lại `staff`** (thêm cột + trigger, `role` thành cột chết) | một chiều | **accepted** |
| [0006](ADR-0006-phan-cong-va-gio-dieu-xe.md) | Phân công: hạt của `dsp_assignment`, lịch sử người phụ trách, tách giờ hẹn khách và giờ điều xe, tiền đề id dịch vụ bền | một chiều | **accepted** |
| [0007](ADR-0007-ban-do-quyen-thao-tac-va-sua-sau-xac-nhan.md) | Bản đồ quyền → thao tác, nơi thi hành "của mình/được giao", sửa sau xác nhận (thay một phần Q9 của A1) | một chiều | **accepted** (gồm dòng ◆) |
| [0008](ADR-0008-bo-sung-canh-parties-locations.md) | Bổ sung cạnh phụ thuộc `parties → locations` (`pty_party_role.location_id → loc_location.id`, `NO ACTION`); bổ sung đồ thị ADR-0002, không thay thế | một chiều | **accepted** |
| [0009](ADR-0009-nguoi-phu-trach-duoc-sua-don.md) | Người phụ trách được sửa đơn: đổi ba ô `SALES` của `MATRIX` (`order.modify`, `order.history.view`, `dispatch.assign`: `own` → `ownOrAssigned`), thêm thao tác `dispatch.claim`; sửa một phần điều 1 của ADR-0007, giữ cơ chế tiêm `ctx.assigned` (điều 4(b)) | hai chiều | **accepted** (yêu cầu trực tiếp của chủ dự án 2026-09-21) |
| [0010](ADR-0010-nguong-mo-rong-sau-doi-chieu-oracle.md) | Ngưỡng mở rộng sau đối chiếu Oracle TCA: phạm vi theo nơi, hoá đơn là bản chụp, tác nhân tự động | hai chiều | **accepted** (chủ dự án duyệt 2026-09-21) |
| [0011](ADR-0011-khach-tren-don-ngoai-le-quyen.md) | Khách trên đơn (N2 lát 1): route lập/sửa đơn tạo hồ sơ cá nhân mới + vai `CUSTOMER` cùng batch; đổi người đặt của đơn đã xác nhận như thông tin vận hành (`order.trip.edit`, nhật ký bằng tên); hai ngoại lệ hẹp của ADR-0007 | hai chiều | **accepted** (quyết định của chủ dự án 2026-09-21) |
| [0012](ADR-0012-neo-hien-phap-ban-chep-chi-doc-va-lop-2.md) | Neo Hiến pháp bằng bản chép chỉ-đọc từ Core (v2.3.0) vào `playbook/`, kèm băm và bài kiểm; không viết Hiến pháp mới; tầng ràng buộc dự án (Lớp 2) chỉ siết thêm | hai chiều (tệp); nghĩa vụ đã duyệt là bánh cóc (9.4) | **accepted** (chủ dự án chuyển 2026-09-22) |
| [0013](ADR-0013-ho-so-nhan-vien-chi-quan-tri-sua.md) | Hồ sơ gắn tài khoản nhân viên chỉ quản trị viên sửa (thao tác mới `party.staff.write`, tiêm `ctx.partyHasAccount`); `staff.active` là nguồn "đang hoạt động", `pty_party.active` ghi theo | hai chiều | **proposed** (chờ chủ dự án duyệt) |
| [0014](ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md) | Mã quyền mới `PARTNER`/`SUPER_ADMIN`; phạm vi "của mình" thực thi ở máy chủ cho liệt kê/tra cứu (thay ADR-0010 điều 1); `FIELD` đang được giao sửa được số khách/dịch vụ/tiền sau xác nhận qua dòng điều chỉnh chỉ-thêm (sửa một phần ADR-0007, mở rộng ADR-0009) | hỗn hợp (một chiều cho phần tiền) | **proposed** (chờ chủ dự án duyệt) |

Thứ tự tài liệu (Điều 3.1): Hiến pháp → ràng buộc dự án → **ADR** → quy trình/playbook → đặc tả từng bước → mã. Đặc tả mô hình dữ liệu N1 (`docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md`) viết sau khi ADR-0001…0007 được duyệt và **đã được chủ dự án duyệt cùng ADR-0008 (2026-09-20)**.

**Cổng bắt buộc trước khi áp migration N1 lên remote:** hai lệnh chỉ-đọc trên remote D1 (xem mục Bối cảnh của ADR-0001) do chủ dự án chạy. **Bằng chứng chỉ cần nếu sau này muốn gỡ cột `staff.role` (ADR-0005):** D1 hỗ trợ `PRAGMA defer_foreign_keys` và bọc một tệp migration trong một giao dịch.
