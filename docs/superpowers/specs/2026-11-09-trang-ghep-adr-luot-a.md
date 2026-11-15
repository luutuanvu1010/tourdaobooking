# Trang ghép — ADR lượt A: ADR-0188, ADR-0189, ADR-0190 (đổi bên đặt đơn Trả sau; khoá xem khách chuyến quên Kết thúc; ai ngừng dùng hồ sơ)

> Trạng thái: **đề xuất, chờ chủ duyệt** cùng ba ADR. Bắt buộc theo `CLAUDE.md` §9 vì lượt duyệt có 3 quyết định chạm quyền, dữ liệu, tiền — đúng trần. Hồ sơ có ngày: duyệt xong thì đóng băng. Kế hoạch gốc: `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` Phần V. Dẫn chứng mã đọc trên `main` @`fa3fd859a`.

## (1) Những bảng này chứa loại thực thể nào

Không ADR nào thêm bảng, cột hay migration. Bảng bị đọc hoặc bị ghi qua đường đã có:

| Bảng | Chứa ai, chứa gì | ADR chạm | Điều phải canh |
|---|---|---|---|
| `orders` (cột `booker_party_id`, `payment_term`) | đơn khách lẻ, đơn đại lý / đối tác, đơn Trả sau và Thanh toán ngay | 0188 | chỉ đơn `CREDIT` đã xác nhận, bên đặt đổi thật, mới bị gác; đơn nháp và đơn Thanh toán ngay không đổi |
| `pty_party` | **một hồ sơ có thể là khách, đại lý, đối tác, nhân viên, tài xế, công ty chủ** | 0188 (đọc: bên đặt mới, hồ sơ chính khi gộp), 0190 (ghi cờ `active`) | 0190 chỉ áp hồ sơ **không gắn tài khoản**, không phải công ty chủ — hai luật đó giữ nguyên; vì vậy ô mới áp cả hồ sơ đại lý, hướng dẫn viên / tài xế chưa có tài khoản, không chỉ khách lẻ |
| Bảng hạn mức và phiên bản của `billing` | hạn mức Trả sau từng hồ sơ, dòng phiên bản để chống đua | 0188 (đọc qua `kiemTraSau`, ghi tăng phiên bản qua câu gác) | lô đổi bên đặt có **hai** câu gác (bên cũ, bên mới); `orders` không đọc bảng `bil_` trực tiếp, chỉ qua hàm do gốc lắp ráp tiêm |
| `vc_trip`, hành khách, liên hệ (đọc) | chuyến của xe công ty và xe đối tác | 0189 | không ghi gì; chỉ hàm khung đổi |
| `audit_log` | nhật ký | 0190 (hậu tố «— ngừng dùng» / «— dùng lại») | không ghi SĐT, email, MST |

## (2) Dòng bản đồ quyền chạm vào

Thứ tự cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR (SALES_MANAGER luôn đi kèm SALES).

| Ô | Giá trị | ADR | Ghép |
|---|---|---|---|
| **`party.deactivate` (MỚI)** | `quanTri()`: ADMIN, SUPER_ADMIN | 0190 | dự phòng: dùng `admin.manage` (cùng hai vai) nếu gói trang Đơn hàng vượt trần |
| `party.write` | không đổi (SALES, ACCOUNTING, ADMIN, SUPER_ADMIN) | 0190 | **thu hẹp nghĩa:** không còn gồm đổi cờ «Đang dùng» |
| `party.staff.write`, `company.legal.write` | không đổi | 0190 | luật hồ sơ gắn tài khoản và công ty chủ đứng trước ô mới |
| `orders` cổng route `PUT /api/orders/:id/booker` | không đổi | 0188 | thêm điều kiện nghiệp vụ, không thêm ô |
| `credit.limit.write` | không đổi (`quanTri()`) | 0188 | câu báo nói «nhờ Quản trị hoặc Toàn quyền cấp hạn mức» — khớp ô này |
| `admin.manage` (gộp hồ sơ) | không đổi | 0188 mục 4(a) | thêm điều kiện hạn mức của hồ sơ chính khi hồ sơ phụ có đơn Trả sau |
| `trip.view`, `trip.progress`, `trip.passenger.add`, `trip.refuse` (cột DRIVER, DRIVER_PARTNER) | không đổi | 0189 | **thu hẹp thời gian:** khung xem khách hết từ 00:00 ngày thứ hai sau ngày xuất bến; `trip.passenger.add` (chỉ DRIVER có) cũng hết theo khung; `trip.progress` không bị khung chặn nên vẫn bấm được |

Không ADR nào thêm mã quyền (mã vai), nên không nhân đôi bài «mọi tập con quyền».

## (3) Cổng nào canh cửa nào

| Cửa | Cổng | ADR |
|---|---|---|
| Đổi bên đặt đơn Trả sau đã xác nhận | `congDoiBenDatTraSau` (mang nhãn kiểu `QuaCongDoiBen` — quên gọi thì typecheck đỏ) → `kiemTraSau` của bên mới → hai câu gác phiên bản trong lô | 0188 |
| Gộp hồ sơ có đơn Trả sau | `tinhGop` (tính lại lúc gộp, không tin xem trước) | 0188 mục 4(a) |
| Đổi cờ «Đang dùng» của hồ sơ | `PUT /api/parties/:id`: luật gắn tài khoản (409) → luật công ty chủ (409) → ô mới (403) | 0190 |
| Tên, liên hệ khách trên máy tài xế | `khungCuaNguoiGoi` → `trongKhungXemKhach` (một hàm thuần duy nhất, bài `mot-ham-khung.test.ts`) | 0189 |
| Bổ sung tên khách của tài xế | cùng khung (ngoài khung trả «không có chuyến») | 0189 |

**Chỗ giao diện ẩn/hiện theo quyền bị đổi nghĩa** (không phải cổng; máy chủ vẫn kiểm):

- `web/parties.ts`, ô «Đang dùng» ở form sửa hồ sơ: hôm nay khoá khi hồ sơ gắn tài khoản; nay khoá thêm khi cờ DTO mới nói người xem không đổi được (0190). Danh sách Danh bạ và nhãn «Ngưng» không đổi.
- Màn chuyến của tài xế (`web/cuoc-chuyen.ts`): bốn chỗ đọc cờ `trongNgayChay` (tên khách dưới thẻ điểm, khối «Suất của khách», chỉ đường, khách trước khi cho xe chạy) nay tắt sớm hơn với chuyến quên Kết thúc; thêm dòng nhắc suy từ `RUNNING` + cờ tắt + hôm nay sau ngày chạy (0189).
- Form đổi bên đặt của đơn: không đổi giao diện; câu báo 409 mới hiện ở dải lỗi có sẵn (0188).

## Ghép ba quyết định

- Ba ADR độc lập về mã: 0188 ở `orders` + `billing` (+ `parties` nếu chọn 4(a)), 0189 ở hàm khung `src/shared/` + màn tài xế, 0190 ở `parties` + `permissions.ts`. Chung tệp duy nhất có thể là `src/modules/parties/index.ts` (0188 mục 4(a) và 0190) — khác hàm, một người thi công cả đợt nên không đụng nhau.
- **0188 và 0190 cùng chạm `pty_party`:** hồ sơ bị ngừng dùng có còn là bên đặt mới hợp lệ không? Không đổi luật hôm nay: `resolveBooker` từ chối hồ sơ đã ngưng trước khi tới cổng Trả sau.
- **Trần gói trang Đơn hàng:** chỉ 0190 có thể chạm (một dòng bản đồ quyền); dự phòng `admin.manage`, không xin nới trần ở lượt này. Lượt B có việc xin nới (xem trang ghép lượt B).
- **Xây trên lỗ đang hở:** chỉ 0188, `HC-4.2` — câu duyệt phải kèm «Cho phép, có ghi lý do».
- Cả ba là việc lớn: một người kiểm độc lập chỉ đọc cho cả nhánh thi công Đợt 2.
