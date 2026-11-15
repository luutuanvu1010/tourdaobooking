# Trang ghép — ADR lượt B: ADR-0191, ADR-0192, ADR-0193 (PIN đầu tài khoản xem mọi khách; giữ chữ đã gõ khi hết phiên; công tắc bắt buộc giờ đón đơn đối tác)

> Trạng thái: **đề xuất, chờ chủ duyệt** cùng ba ADR. Bắt buộc theo `CLAUDE.md` §9 vì lượt duyệt có 3 quyết định chạm quyền, dữ liệu — đúng trần. Hồ sơ có ngày: duyệt xong thì đóng băng. Kế hoạch gốc: `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` Phần VIII. Dẫn chứng mã đọc trên `main` @`fa3fd859a`. Nên duyệt **sau** lượt A (không phụ thuộc mã, chỉ để mỗi lần duyệt tối đa 3 quyết định).

## (1) Những bảng / kho này chứa loại thực thể nào

| Bảng / kho | Chứa ai, chứa gì | ADR | Điều phải canh |
|---|---|---|---|
| `staff`, `stf_permission`, vai tài khoản | nhân viên nội bộ, Đối tác, Tài xế đối tác, tài khoản Nhân sự | 0191 | không cột mới: PIN ngẫu nhiên không ai biết ghi vào `pin_hash` như hôm nay; chỉ phản hồi đổi |
| **Bảng chính sách mới của `orders`** (chỉ thêm, khuôn `ord_partner_customer_policy`) | một loại dòng: trạng thái công tắc Bật/Tắt theo thời gian | 0193 | migration mới; dòng gieo Bật; chỉ `orders` ghi |
| `ord_confirm_request` (cờ «cần chốt giờ») | yêu cầu xác nhận của đơn nhánh A (Đối tác, dịch vụ cần xét) | 0193 | cờ chụp lúc gửi theo công tắc; không cột mới |
| `ord_transfer_leg` (đọc) | chặng đưa đón của mọi đơn | 0193 câu (ii) | chặng có Đón chưa giờ mà ngày đón đã vào hạn chốt thì đơn không xác nhận được tới khi có giờ (điều mới, không đổi nghĩa `kiemMocDat`) |
| **`sessionStorage` của trình duyệt** (không phải bảng) | bản chụp form đơn: **tên, SĐT khách, dịch vụ, hành khách** — dữ liệu cá nhân | 0192 | ngoại lệ có tên duy nhất của ADR-0035 Đ3; gắn mã nhân viên, 30 phút, khôi phục một lần; xoá khi người khác đăng nhập |
| `audit_log` | nhật ký | 0191 (hậu tố tạo tài khoản), 0193 (đổi công tắc) | không ghi PIN, SĐT |

## (2) Dòng bản đồ quyền chạm vào

Thứ tự cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR (SALES_MANAGER luôn đi kèm SALES).

| Ô | Giá trị | ADR | Ghép |
|---|---|---|---|
| `account.create` | không đổi (HR, SUPER_ADMIN) | 0191 | **thu hẹp kết quả:** HR tạo tài khoản có mã xem mọi khách (thực tế: vai Bán hàng) thì không nhận PIN |
| `account.edit` | không đổi (ADMIN, SUPER_ADMIN, HR) | 0191 mục 3(a) | **thu hẹp:** HR không gán thêm vai làm tài khoản có mã xem mọi khách |
| `contact.view` | không đổi | 0191 | **nguồn của tập «xem mọi khách»** (các cột `any`: SALES, ACCOUNTING, ADMIN, SUPER_ADMIN) — đổi ô này là đổi tập |
| `account.access.manage` + `admin.manage` (đặt lại PIN) | không đổi (ADMIN, SUPER_ADMIN) | 0191 | đường cấp PIN đầu, không thêm route |
| `settings.ops` | không đổi (SUPER_ADMIN) | 0193 | thêm một route công tắc hỏi ô này |
| `order.leg.short_notice` (Đặt gấp) | không đổi | 0193 câu (ii) | không đổi luật Đặt gấp; chặng chưa giờ trong hạn chốt phải điền giờ trước |
| — | — | 0192 | không ô nào: chỉ mã giao diện, máy chủ không đổi |

Không ADR nào thêm mã quyền hay ô quyền mới.

## (3) Cổng nào canh cửa nào

| Cửa | Cổng | ADR |
|---|---|---|
| Tạo tài khoản (hai đường) | `POST /api/staff`: `account.create` → LC-4 / ADR-0090 → luật mới «không trả PIN» | 0191 |
| Gán vai sau khi tạo | `PUT /api/staff/:id/roles`: `account.edit` → `mayManage` → luật mới «HR không thêm mã xem mọi khách» | 0191 |
| Cấp PIN đầu | `POST /api/staff/:id/reset-pin` (có sẵn) | 0191 |
| Đổi công tắc | route mới của `orders`: `settings.ops` + `Origin` + nhật ký | 0193 |
| Nhánh Gửi đơn, cờ cần chốt giờ | `canChotGioCuaNguoiLap` (một luật cho route Gửi đơn và khối xác nhận của chi tiết đơn) — cả hai nơi nhận giá trị công tắc | 0193 |
| Còn vé | từ chối chỉ khi yêu cầu mang cờ (không đổi) | 0193 |
| Cổng xác nhận | hàm thuần mới ở `moc-toi-thieu.ts` + cùng luật trong SQL `ORDER_CONFIRM` (bài khoá hai phía): chặng Đón chưa giờ đã vào hạn chốt ⇒ 409 | 0193 câu (ii) |
| Bản chụp form | chỉ trình duyệt: ghi trong `goLogin` (hoặc sự kiện rời trang), đọc ở form, dọn ở `initShell` mọi trang | 0192 |

**Chỗ giao diện ẩn/hiện theo quyền bị đổi nghĩa** (không phải cổng; máy chủ vẫn kiểm):

- Màn Quản lý tài khoản của Nhân sự: hộp «PIN của tài khoản mới» không còn hiện với tài khoản Bán hàng, thay bằng câu nhờ Quản trị (0191). Hộp gán vai của Nhân sự vẫn liệt kê vai Bán hàng; máy chủ từ chối nếu chọn 3(a).
- Trang Tôi của Toàn quyền: thêm nút công tắc cạnh «Ẩn thông tin khách», hiện theo `can(settings.ops)` (0193).
- Bảng Còn vé: khi Tắt, ô giờ chặng đầu thôi là bắt buộc (0193).
- Form đơn: điền lại chữ sau khi đăng nhập lại (0192).

## Ghép ba quyết định

- **0192 và 0191 cùng đụng «đăng nhập»:** 0191 làm tài khoản mới chưa đăng nhập được tới khi Quản trị cấp PIN; 0192 chỉ chạy khi một phiên đang có bị hết — không giao nhau.
- **0192 và 0193 cùng đụng form đơn của Đối tác:** bản chụp lấy giá trị ô như đang có; công tắc không đổi ô nào trên form Đối tác (Đối tác vốn không có ô giờ từ ADR-0154 Đ1.1). Không giao nhau.
- **Trần gói trang Đơn hàng (`web/orders.ts`):** chỉ 0192 có thể chạm (móc ở `web/api.ts`); xin nới tối đa 100 byte nếu cách 0 byte không được. Cộng với lượt A (0190 dùng `admin.manage` nếu vượt) và Đợt 1, Đợt 3 cùng tranh chỗ: người thi công đo một lần trên `main` mới nhất trước khi chọn.
- **Xây trên lỗ đang hở:** chỉ 0193, `HC-5.19` (migration bảng mới, theo tiền lệ ADR-0178) — kế hoạch Phần III ghi lượt B «không xây trên lỗ đang hở»; trang này sửa lại điều đó. Câu duyệt cần «Cho phép, có ghi lý do» cho 0193.
- Cả ba là việc lớn: một người kiểm độc lập chỉ đọc cho cả nhánh thi công Đợt 5.
