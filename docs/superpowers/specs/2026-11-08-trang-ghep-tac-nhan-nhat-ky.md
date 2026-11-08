# Trang ghép — ADR-0186 (tác nhân tự động trong bảng nhật ký dùng chung)

> **Trạng thái:** đề xuất 2026-11-08, đi cùng lượt duyệt ADR-0186 (2 quyết định, dưới trần 3). Bắt buộc theo `CLAUDE.md` §9 vì bảng dùng chung `audit_log` nhận thêm một loại người làm mới. Hồ sơ có ngày.

## (1) Bảng `audit_log` chứa những loại người làm nào

| Loại dòng | Nhận ra bằng | Có từ |
|---|---|---|
| Người thao tác | `staff_id` có mã tài khoản, `agent_code` rỗng | từ đầu |
| **Tác nhân tự động (mới)** | `agent_code` có mã tác nhân (hôm nay chỉ `DONG_BO_DANH_MUC`), `staff_id` rỗng | bản có migration `0148` |
| Không rõ người làm | cả hai rỗng: dòng cũ trước bản này (chỉ-thêm, không sửa được) và hai Cron còn nợ (nhắc hạn trả sau, ADR-0186 Đ7) | lịch sử |

Một dòng không bao giờ có cả `staff_id` lẫn `agent_code`: máy chủ từ chối dựng câu ghi như vậy. Đợt này chưa có trigger ở cơ sở dữ liệu (ADR-0186 Đ8).

## (2) Dòng bản đồ quyền chạm vào

| Ô | Giá trị | Ghép |
|---|---|---|
| **`catalog.sync` (mới)** | người: `quanTri()` — Quản trị, Toàn quyền `any`, cột khác `none`; tác nhân `DONG_BO_DANH_MUC`: có | bằng đúng tập người qua `admin.manage` hôm nay, nên không ai thêm hay mất quyền |
| `admin.manage` | không đổi | route «Đồng bộ ngay» vẫn hỏi ô này trước; tác nhân không giữ |
| `O_GHI_TIEN` (bốn ô ghi tiền) | không đổi | bài kiểm chặn mọi tác nhân giữ ô ghi tiền (Hiến chương 5.15) |
| Mọi ô khác | không đổi | `can(tác nhân, ô)` luôn sai; tác nhân không giữ mã quyền nào nên mọi cổng router (`admin`, `office`, `orders`, `accounts`) đều từ chối nó |

**Đổi nghĩa ngầm:** `can()` nhận thêm người phát lệnh là tác nhân. Không route nào dựng được tác nhân từ dữ liệu của trình duyệt: chỉ mã Cron và đồng bộ lần đầu dùng nó (bài kiểm canh chỗ dùng).

## (3) Cổng nào canh cửa nào

| Cửa | Cổng | Ghi chú |
|---|---|---|
| Nút «Đồng bộ ngay» trên màn Danh mục | chỉ hiện với Quản trị, Toàn quyền | chỉ để gọn, **không phải cổng**; không đổi |
| Route `POST /api/catalog/sync` | cổng router `admin` + `can(admin.manage)` + `Origin` cùng site, rồi hàm lệnh hỏi `can(staff, catalog.sync)` | nhật ký ghi mã người |
| Cron 15 phút | hàm lệnh hỏi `can(DONG_BO_DANH_MUC, catalog.sync)` | bị từ chối: ghi lỗi vào `catalog_sync`, không ghi danh mục, không ném |
| Đồng bộ lần đầu | quyền đọc danh mục của người đang mở trang (đã có) rồi hàm lệnh chạy dưới tác nhân | không dùng quyền của người đọc để ghi |
| Đọc: màn Nhật ký `GET /api/audit` | `audit.view` (chỉ Toàn quyền) | dòng tác nhân vẫn hiện «Hệ thống (tự động)»; không lộ mã tác nhân |
| Đọc: lịch sử đơn (`listByOrder`), lịch sử của Đối tác (`lich-su-doi-tac` bỏ tên người làm), lọc thao tác im lặng (theo `staff_id` Toàn quyền), các view `v_aud_*` | không đổi | `catalog_synced` không gắn đơn nên không vào lịch sử đơn; view chỉ chọn cột đích danh, cột mới không lọt |
| Giao diện | — | không có chữ mới, không nút mới, không ẩn/hiện nào đổi nghĩa |
