# Trang ghép — ADR-0186 (tác nhân tự động trong bảng nhật ký dùng chung; Quản lý bán hàng được đồng bộ)

> **Trạng thái:** **ĐÃ DUYỆT 2026-11-08** cùng ADR-0186 (chủ dự án, hộp hỏi: «Duyệt ADR-0186»; lượt duyệt 2 quyết định, dưới trần 3). Bắt buộc theo `CLAUDE.md` §9 vì bảng dùng chung `audit_log` nhận thêm một loại người làm mới, và một chỗ ẩn/hiện trên giao diện đổi nghĩa. Hồ sơ có ngày.

## (1) Bảng `audit_log` chứa những loại người làm nào

| Loại dòng | Nhận ra bằng | Có từ |
|---|---|---|
| Người thao tác | `staff_id` có mã tài khoản, `agent_code` rỗng | từ đầu |
| **Tác nhân tự động (mới)** | `agent_code` = `DONG_BO_DANH_MUC`, `NHAC_HAN_TRA_SAU` hoặc `DON_ANH_VE`; `staff_id` rỗng | bản có migration `0148` |
| Không rõ người làm | cả hai rỗng | chỉ các dòng cũ trước bản này (chỉ-thêm, không sửa được) |

Một dòng không bao giờ có cả hai: máy chủ từ chối dựng câu ghi như vậy. Đợt này chưa có trigger ở cơ sở dữ liệu (ADR-0186 Đ8).

## (2) Dòng bản đồ quyền chạm vào

Thứ tự cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR, SALES_MANAGER.

| Ô | Người | Tác nhân | Ghép |
|---|---|---|---|
| **`catalog.sync` (mới)** | `quanLyBanHang()`: ADMIN, SUPER_ADMIN, SALES_MANAGER `any` | `DONG_BO_DANH_MUC` | **quyền người đổi:** Quản lý bán hàng thêm việc đồng bộ (lời chủ); hôm nay chỉ Quản trị, Toàn quyền qua `admin.manage` |
| **`credit.due.remind` (mới)** | `chiToanQuyen()` trên bảng, không có route cho người | `NHAC_HAN_TRA_SAU` | Toàn quyền có ô vì ADR-0014 điều 2; Trợ lý không kể ô này là việc người làm được |
| **`ve.kho.purge` (mới)** | `chiToanQuyen()` trên bảng, không có route cho người | `DON_ANH_VE` | như trên; hẹp hơn `ve.kho.manage` |
| `admin.manage` | không đổi | không | route đồng bộ thôi hỏi ô này; các route danh mục khác giữ nguyên |
| `O_GHI_TIEN` (bốn ô ghi tiền) | không đổi | không | bài kiểm chặn mọi tác nhân giữ ô ghi tiền (Hiến chương 5.15) |

**Đổi nghĩa ngầm:** `can()` nhận thêm người phát lệnh là tác nhân. Tác nhân không giữ mã quyền nào nên mọi cổng router (`admin`, `office`, `orders`, `accounts`) đều từ chối nó; không route nào dựng được tác nhân từ dữ liệu trình duyệt (bài kiểm canh ba chỗ dùng).

## (3) Cổng nào canh cửa nào

| Cửa | Cổng | Ghi chú |
|---|---|---|
| Nút «Đồng bộ ngay từ Google Sheet», màn đầy đủ | hiện với người giữ `admin.manage` (như hôm nay) | không phải cổng |
| **Nút đó ở màn hẹp (mới)** | hiện khi màn hẹp hiện (`dungManHepDichVu`) và người xem có `catalog.sync` | **chỗ ẩn/hiện đổi nghĩa:** ADR-0169 Đ4 ghi màn hẹp không đồng bộ; không phải cổng |
| Route `POST /api/catalog/sync` | cổng router `office` (trước: `admin`) + `Origin` cùng site + `can(staff, catalog.sync)` trong thân và trong hàm lệnh | Bán hàng thường, Kế toán qua cổng `office` nhưng bị 403 ở `can()`; nhật ký ghi mã người |
| Cron: đồng bộ | hàm lệnh hỏi `can(DONG_BO_DANH_MUC, catalog.sync)` | bị từ chối: ghi lỗi vào `catalog_sync`, không ghi danh mục |
| Đồng bộ lần đầu | quyền đọc danh mục của người mở trang (đã có), rồi hàm lệnh chạy dưới tác nhân | không dùng quyền của người đọc để ghi |
| Cron: nhắc hạn trả sau | hàm nhắc hỏi `can(NHAC_HAN_TRA_SAU, credit.due.remind)` | tin nhắc đi theo các view `v_aud_*` như hôm nay; view chọn cột đích danh, cột mới không lọt |
| Cron: dọn ảnh vé | hàm dọn hỏi `can(DON_ANH_VE, ve.kho.purge)` | đường xoá ảnh ngay khi tải lên hỏng nằm trong lệnh của người (đã có cổng), không đổi |
| Đọc: màn Nhật ký `GET /api/audit` | `audit.view` (chỉ Toàn quyền) | dòng tác nhân hiện «Hệ thống (tự động)»; dòng mới của dọn ảnh hiện với nhãn chủ chọn; không lộ mã tác nhân |
| Đọc: lịch sử đơn, lịch sử của Đối tác (bỏ tên người làm), lọc thao tác im lặng (theo `staff_id` Toàn quyền) | không đổi | dòng nhắc hạn đã ghi rỗng người làm từ trước, nay thêm mã tác nhân ở cột không ai đọc ra trình duyệt |
