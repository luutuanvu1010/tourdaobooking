# SPEC — tourdao-sales (Cổng xác nhận đơn hàng nội bộ)

> Trạng thái: **CHỐT — sẵn sàng thi công ở phiên riêng.** Bốn điểm mơ hồ cấu trúc ở §2.4 (bản gốc) đã được chủ dự án quyết định vào 2026-09-16, xem §2.4 đã cập nhật. Đây là artifact đặc tả (spec), không phải code. Theo P1/P2/N1 của `CONSTITUTION.md` (tourdaovn), bề mặt (giao diện) không được dựng trước khi bản ánh xạ dữ liệu này được duyệt — nay đã đủ điều kiện mở phiên thực thi.
> Phạm vi: dự án **độc lập hoàn toàn** với `tourdaovn` (N4 — không xoá nhoà ranh giới hai dự án độc lập). Không chạm code, D1, hay Sanity của tourdaovn. Điểm chạm duy nhất được tuyên bố: kế thừa **giá trị token thị giác** (màu, font, spacing) để đồng nhất thương hiệu — sao chép giá trị tại một thời điểm, không import runtime, không phụ thuộc build. Từ 2026-09-19 có thêm một điểm chạm được tuyên bố: **tài sản logo** (ảnh) — chủ dự án chỉ định nguồn, sao chép một lần để dựng icon PWA và logo giao diện, không đọc Sanity lúc chạy (§2.4-7).

---

## 1. Định vị và phạm vi (P1 — trừu tượng trước cụ thể)

**Vì sao tồn tại:** nhân viên bán hàng cần tạo và gửi một bản xác nhận đơn hàng cho khách qua Zalo, nhanh, đúng, đồng nhất thương hiệu, mà không cần biết Photoshop/Canva hay đợi ai đó dựng file cho họ.

**Là gì:** một ứng dụng nội bộ (không phải trang công khai) tại `booking.tourdao.vn` (§3), nơi nhân viên:
1. Đăng nhập.
2. Điền/chọn thông tin khách hàng + sản phẩm dịch vụ + thanh toán.
3. Xem trước bản xác nhận đơn hàng theo mẫu chuẩn công ty.
4. Xuất PNG (gửi Zalo ngay) và/hoặc PDF (lưu trữ, in).
5. Đơn được lưu lại — xem lại, tìm kiếm, nhân viên khác xem được đơn của nhau.

**Không phải là gì (ranh giới cứng, tránh phình phạm vi):**
- Không phải kế toán/hoá đơn điện tử. Không tính thuế, không xuất hoá đơn VAT.
- Không phải hệ thống thanh toán — chỉ **ghi nhận** thông tin thanh toán (đã cọc bao nhiêu, còn lại bao nhiêu, hình thức), không tích hợp cổng thanh toán.
- Không phải CRM chăm sóc khách hàng đầy đủ (không có pipeline, không nhắc lịch chăm sóc) ở phiên bản đầu — chỉ là **sổ đơn hàng + máy in xác nhận**. Có thể mở rộng sau, ghi thành backlog, không làm ở v1.
- Không đồng bộ hai chiều với tourdaovn.com (booking website công khai). Nếu tương lai cần, đó là một quyết định kiến trúc mới, cần ADR riêng, không tự động suy ra từ spec này (N3).

---

## 2. Kiến trúc dữ liệu trước (P2 — bề mặt không đi trước cấu trúc)

### 2.1 Thực thể

**`staff`** — nhân viên bán hàng (người dùng đăng nhập)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | TEXT (uuid) | khoá chính |
| full_name | TEXT | tên hiển thị trên đơn (ví dụ "NV tư vấn: Nguyễn Văn A") |
| phone | TEXT | dùng làm định danh đăng nhập (số điện thoại + mã PIN) |
| pin_hash | TEXT | PIN 6 số, hash bằng scrypt/PBKDF2, không lưu plaintext |
| role | TEXT | `sales` \| `admin` — admin sửa được thông tin công ty, xem toàn bộ đơn |
| active | INTEGER (bool) | khoá tài khoản khi nghỉ việc, không xoá (giữ vết đơn cũ) |
| created_at | TEXT (ISO) | |
| credentials_changed_at | INTEGER (ms, nullable) | thêm ở migration 0005: phiên phát hành trước mốc này bị từ chối (thu hồi phiên khi đổi/đặt lại PIN) |

**`order`** — đơn xác nhận (thực thể trung tâm). Bảng D1 tên `orders` (`ORDER` là từ khoá SQL).
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | TEXT (uuid) | khoá chính |
| order_code | TEXT | mã đơn hiển thị, ví dụ `TD-20260916-0001`, sinh tự động, duy nhất |
| staff_id | TEXT | FK → staff.id (người lập đơn) |
| status | TEXT | `draft` \| `confirmed` \| `cancelled` — bất biến trạng thái ở §2.3 |
| customer_name | TEXT | bắt buộc |
| customer_phone | TEXT | bắt buộc |
| customer_email | TEXT | tuỳ chọn |
| customer_note | TEXT | tuỳ chọn (yêu cầu đặc biệt) |
| subtotal | INTEGER | tổng tiền dịch vụ, đơn vị VNĐ (số nguyên, không phẩy động — tránh sai số) |
| discount | INTEGER | giảm giá, mặc định 0 |
| total | INTEGER | = subtotal − discount, tính ở tầng server, không nhận từ client (toàn vẹn dữ liệu, P10) |
| deposit_amount | INTEGER | đã cọc |
| deposit_method | TEXT | `cash` \| `bank_transfer` \| `other` |
| remaining_amount | INTEGER | = total − deposit_amount, tính ở server |
| payment_note | TEXT | tuỳ chọn, ví dụ số tài khoản đã chuyển |
| created_at | TEXT (ISO) | |
| updated_at | TEXT (ISO) | |
| confirmed_at | TEXT (ISO, nullable) | thời điểm chuyển sang `confirmed` |

**`order_service`** — một dịch vụ trong đơn (migration 0008; spec `docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md`): số khách theo loại + thông tin chuyến. Tiền ở `order_item`.
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | TEXT (uuid) | khoá chính; đơn cũ được chuyển thành dịch vụ nhập tay dùng lại id của dòng tiền |
| order_id | TEXT | FK → orders.id, `ON DELETE CASCADE` |
| sort_order | INTEGER | thứ tự của dịch vụ trong đơn |
| catalog_code | TEXT (nullable) | mã dịch vụ nguồn; NULL = nhập tay. Không FK |
| name / unit | TEXT | tên và chuỗi đơn vị của Sheet (`perPax`, `per5Pax`…) chụp lúc lập đơn; `unit = 'manual'` = nhập tay |
| pax_adult / pax_child / pax_senior / pax_infant | INTEGER | số khách theo loại, ≥ 0; tổng ≤ 50 kiểm ở code (`MAX_GUESTS_PER_SERVICE`). Dịch vụ chỉ một loại giá (giá chung/theo nhóm): số khách nằm ở `pax_adult` |
| depart_date | TEXT (nullable) | `YYYY-MM-DD`, giờ Việt Nam, `CHECK` đúng lịch. Bắt buộc khi xác nhận (§2.3) |
| depart_time / pickup_time / checkin_time | TEXT (nullable) | `HH:MM` 00:00–23:59 (`CHECK`) |
| pickup_place / checkin_place | TEXT (nullable) | ≤ 200 ký tự, đã bỏ ký tự điều khiển — dữ liệu cá nhân, không ghi vào nhật ký |
| checkin_date | TEXT (nullable) | NULL = cùng ngày khởi hành |
| note | TEXT (nullable) | ghi chú riêng của dịch vụ, ≤ 1000 ký tự |

**`order_item`** — dòng sản phẩm/dịch vụ trong đơn (1 đơn nhiều dòng)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | TEXT (uuid) | khoá chính |
| order_id | TEXT | FK → order.id |
| catalog_code | TEXT (nullable) | mã dịch vụ nguồn khi dòng sinh từ danh mục (chọn nhanh); NULL = nhập tay. Không FK — nhập tay luôn chạy được (migration 0007) |
| description | TEXT | tên dịch vụ, ví dụ "Tour Hòn Mun 1 ngày" |
| detail | TEXT | tuỳ chọn: ghi chú loại khách (sinh từ danh mục) hoặc ghi chú dòng nhập tay — ngày khởi hành và số khách nằm ở `order_service` |
| quantity | INTEGER | mặc định 1 |
| unit_price | INTEGER | đơn giá, VNĐ |
| line_total | INTEGER | = quantity × unit_price, tính server |
| sort_order | INTEGER | thứ tự hiển thị |
| service_id | TEXT (nullable ở schema) | FK → order_service.id; dòng tiền thuộc một dịch vụ (trigger bảo đảm cùng đơn); mã luôn ghi, NULL chỉ còn ở schema vì `ADD COLUMN` của SQLite không thêm được NOT NULL |
| catalog_price | INTEGER (nullable) | giá danh mục hiệu lực lúc lập dòng; NULL = nhập tay. Lệch giá = `unit_price ≠ catalog_price` |
| pax_code | TEXT (nullable) | loại khách của dòng: `adult` \| `child` \| `senior` \| `infant`; NULL = nhập tay |

**`company_profile`** — thông tin doanh nghiệp hiển thị trên mẫu (singleton, đúng 1 dòng — P6: một nguồn sự thật)
| Trường | Kiểu | Giá trị khởi tạo |
|---|---|---|
| id | TEXT | cố định `"default"` |
| company_name | TEXT | "CÔNG TY TNHH TOUR ĐẢO" |
| tax_code | TEXT | "4201969169" |
| address | TEXT | "19 Đường B2, Khu đô thị Vĩnh Điềm Trung, Phường Tây Nha Trang, Tỉnh Khánh Hoà" |
| hotline | TEXT | "0845 256 256" |
| zalo_number | TEXT | tuỳ chọn, mặc định = hotline nếu chưa có số Zalo riêng |
| email | TEXT | tuỳ chọn, để trống chờ nhập |
| logo_url | TEXT | v1: để trống, app chạy với wordmark chữ. Có trường sẵn để admin upload ảnh logo sau qua màn hình cài đặt, không cần đổi schema (xem §2.4-2) |
| updated_at | TEXT (ISO) | |
| updated_by | TEXT | FK → staff.id |

**`catalog_item` / `catalog_override` / `catalog_sync`** (migration 0006, quyết định §2.4-6): `catalog_item` là **bản sao** phần lấy từ Google Sheet dịch vụ (mã, tên, đơn vị `perPax` \| `perNPax`, giá 4 loại khách, ghi chú khách; `in_sheet = 0` khi dịch vụ biến mất khỏi Sheet — chỉ ẩn, không xoá); `catalog_override` là ghi đè có chủ đích của Admin (giá từng loại khách + ẩn, kèm `base_json` = giá Sheet lúc ghi đè để cảnh báo xung đột); `catalog_sync` là trạng thái lần đồng bộ gần nhất (đúng một dòng). Sheet vẫn là nguồn chính của giá gốc, app không bao giờ ghi ngược — xem §2.5.

**`audit_log`** — nhật ký mọi thao tác quan trọng (P5 — mọi quyết định để lại dấu vết). Chỉ ghi thêm, không sửa/xoá.
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | TEXT (uuid) | |
| order_id | TEXT (nullable) | FK → order.id; NULL khi hành động không thuộc một đơn |
| staff_id | TEXT (nullable) | ai thao tác; NULL = hệ thống tự động (Cron đồng bộ Sheet) |
| action | TEXT | danh sách hợp lệ có **một nguồn duy nhất** ở `src/shared/audit-actions.ts` (mã + nhãn + nhóm: đơn hàng, tài khoản, dịch vụ); SQL không còn `CHECK` liệt kê từ migration 0007 — thêm hành động mới không cần migration |
| target_type / target_id | TEXT | đối tượng: `order` \| `staff` \| `catalog` (kiểm ở code) và id/mã tương ứng |
| detail | TEXT (nullable) | mô tả ngắn; **không bao giờ chứa PIN hay bí mật** |
| created_at | TEXT (ISO) | |

**`login_attempt`** — bộ đếm chống dò PIN (migration 0005): `id`, `key` (`phone:0xxxxxxxxx` hoặc `ip:<địa chỉ>`), `at` (ms). Cửa sổ trượt 15 phút; 5 lần/SĐT, 30 lần/IP.

**Quy ước thời gian:** `TEXT` ISO-8601 UTC cho mọi dấu thời gian người đọc; `INTEGER` mili-giây chỉ cho mốc máy so sánh số học (`staff.credentials_changed_at` so với thời điểm phát hành phiên, `login_attempt.at`).

### 2.2 Quan hệ
```
staff (1) ──< order (N) ──< order_service (N) ──< order_item (N) ··· catalog_item (catalog_code, không FK)
staff (1) ──< audit_log (N) ──> order          (staff_id NULL = hệ thống)
catalog_item (1) ──o catalog_override (0..1)   catalog_sync — singleton trạng thái đồng bộ
company_profile — singleton, không quan hệ FK, đọc bởi mọi order khi render
```

`order_item.order_id` vẫn còn (đơn → dòng tiền); trigger `order_item_service_scope_*` bảo đảm `service_id` thuộc cùng đơn.

### 2.3 Bất biến dữ liệu (N5 — không được phá ngầm)
- `total`, `remaining_amount`, `line_total` **luôn tính lại ở server** khi ghi, không bao giờ tin giá trị client gửi lên. Vi phạm là lỗ hổng gian lận giá trực tiếp. Lưới thứ hai trong SQL (migration 0007): TRIGGER từ chối mọi INSERT/UPDATE có `line_total ≠ quantity × unit_price`, `total ≠ subtotal − discount`, `remaining_amount ≠ total − deposit_amount`, số âm, hoặc có cọc mà thiếu hình thức cọc.
- Chuyển trạng thái đơn chỉ theo chiều: `draft → confirmed → cancelled` hoặc `draft → cancelled`. Không cho phép `confirmed → draft` (một đơn đã xác nhận và có thể đã gửi khách thì không được "biến mất" khỏi lịch sử — muốn sửa thì tạo bản ghi mới, đơn cũ chuyển `cancelled` và ghi `audit_log` tham chiếu).
- `order_code` duy nhất toàn hệ thống, sinh tự động, không cho nhân viên tự đặt (tránh trùng/đụng độ khi nhiều người dùng cùng lúc).
- **Xác nhận đòi đủ chuyến (migration 0008):** đơn chỉ chuyển `draft → confirmed` khi có ít nhất một dịch vụ và MỌI dịch vụ có `depart_date` trong khoảng [hôm nay, +365 ngày] (giờ Việt Nam) và ≥ 1 khách. Điều kiện nằm trong chính câu `UPDATE` xác nhận (không đọc-rồi-ghi ở route) và có trigger `orders_confirm_requires_trip` làm lưới thứ hai cho phần không đổi của điều kiện (có dịch vụ, có ngày, ≥ 1 khách) — khoảng [hôm nay, +365 ngày] chỉ nằm ở câu `UPDATE`; xác nhận thất bại không ghi nhật ký. Nháp lưu được khi thiếu ngày.
- **Sau khi xác nhận:** dịch vụ và số khách **khoá ở SQL** (trigger `order_service_frozen_*`); tiền **khoá ở tầng ứng dụng** — `PUT /api/orders/:id` chỉ ghi được đơn nháp (điều kiện `status = 'draft'` nằm trong câu `UPDATE`; trigger 0007 chỉ kiểm số học, không chặn sửa tiền); chỉ **trường vận hành** (ngày giờ khởi hành, đón, check-in, ghi chú dịch vụ) sửa được qua `PUT /api/orders/:id/trip`, có nhật ký `trip_updated`. Ngày khởi hành không được xoá, và nếu ĐỔI thì ngày mới phải trong khoảng cho phép. Muốn đổi khách/dịch vụ/tiền thì huỷ và lập đơn mới.
- Tiền tệ luôn là số nguyên VNĐ (không dùng float) — nguyên tắc chống sai số cộng dồn.
- `company_profile` chỉ có đúng một dòng `id = "default"`; sửa là UPDATE, không bao giờ INSERT dòng thứ hai (một nguồn sự thật, P6/N7).

### 2.4 Quyết định đã chốt (2026-09-16)

1. **Đăng nhập nhân viên:** xác nhận dùng số điện thoại + PIN 6 số như đề xuất.
2. **Logo công ty:** công ty có logo, sẽ tải lên sau. v1 chạy với wordmark chữ; `company_profile.logo_url` đã có sẵn trường, màn hình cài đặt (admin) cho phép upload ảnh bất kỳ lúc nào sau đó mà không cần đổi schema hay thi công lại.
3. **Đơn giá dịch vụ:** lấy từ **Google Sheet** hiện có (cùng nguồn tham chiếu công ty đang dùng cho chức năng booking) — xem §2.5. *(Phần "không có bảng riêng trong D1" của bản 2026-09-16 đã được §2.4-6 thay bằng bản sao trong D1.)*
4. **Phạm vi xem đơn:** mọi nhân viên (`sales` lẫn `admin`) xem được đơn của nhau, không giới hạn theo người tạo. Phân quyền `admin` chỉ khác biệt ở việc **sửa** `company_profile` và **quản lý tài khoản** `staff`, không phải phạm vi xem `order`.

5. **Quyền sửa đơn (chốt 2026-09-19):** chỉ **người lập đơn** hoặc `admin` được sửa, xác nhận, huỷ một đơn (server trả 403 với người khác; UI ẩn nút). Điều chỉnh §2.4-4: phạm vi *xem* vẫn mở cho mọi nhân viên, nhưng `admin` còn khác `sales` ở quyền thay đổi đơn của người khác. `admin` có thêm màn hình **nhật ký hệ thống** (`/audit`, `GET /api/audit`) liệt kê mọi bản ghi `audit_log` toàn hệ thống; `sales` không truy cập được. Lịch sử theo từng đơn (trong trang chi tiết) vẫn hiển thị cho mọi nhân viên xem đơn đó.

6. **Đồng bộ Sheet với bảng điều khiển Admin (chốt 2026-09-19, thay đổi §2.5 và mở rộng §2.4-1):**
   - **Dịch vụ & giá:** Sheet (ID `1XPx1g0JVTdevdX35MeCpt6Cc6Dgxdmfer6okEWleD3s`) vẫn là nguồn chính nhưng hệ thống **lưu bản sao trong D1** (bảng `catalog_item`), tự đồng bộ định kỳ và có nút "Đồng bộ ngay". Admin có thể **ghi đè** giá/ẩn một dịch vụ trong app; dòng bị ghi đè không bị lần đồng bộ sau đè mất, chỉ cảnh báo khi Sheet có giá khác. Dòng biến mất khỏi Sheet chỉ bị ẩn. App vẫn **không bao giờ ghi ngược** vào Sheet, và chỉ đọc các cột cần cho đơn (mã, tên, đơn vị, các mức giá + ghi chú khách); **không đọc** `Khoá giá`, `Đường dẫn` (logic booking) và `Ghi chú nội bộ`. Nếu Sheet không truy cập được, vẫn dùng bản sao đã lưu và cho nhập tay như §2.5.
   - **Nhân viên:** Sheet (ID `16K3b1CtqjJqXR_CkfSSdLyK0t6j0pYq_OuskF0VFaw4`, cột Tên người dùng + Số điện thoại) chỉ là nguồn *đề xuất*: Admin bấm "Đồng bộ từ Sheet", xem trước, xác nhận mới tạo tài khoản (PIN ngẫu nhiên hiện một lần). Sheet không bao giờ tự tạo/ngưng tài khoản hay cấp `admin`; D1 là nguồn sự thật.
   - **Thứ tự thi công:** bảng Admin (quản lý tài khoản + chống dò PIN) làm trước M3.

7. **App iPhone (PWA) "Tour Đảo Booking" (chốt 2026-09-19; chủ dự án chọn hướng PWA và duyệt mockup):** giao diện web là PWA cài được từ Safari ("Thêm vào Màn hình chính"), không App Store: `manifest` + icon + service worker (khung stale-while-revalidate, **`/api/*` không bao giờ qua cache**, mã phiên bản cache do build chèn) + giao diện điện thoại ≤640px (thanh tab dưới đáy, nút quay lại). **Không thêm dữ liệu, bảng hay API.** Icon dựng từ logo do chủ dự án chỉ định (điểm chạm tài sản, xem đầu spec); logo hiện ở đầu trang và trang đăng nhập là **tạm** cho tới khi có `company_profile.logo_url` (M5, §2.4-2). Tên hiển thị "Tour Đảo Booking" và tên miền `booking.tourdao.vn` (thay trang `fastbooking`; **đã deploy lên tên miền này 2026-09-19**, xem §3) do chủ dự án chốt 2026-09-19. Thiết kế, phương án bị loại, ánh xạ màn hình–dữ liệu: `docs/superpowers/specs/2026-09-19-iphone-pwa-design.md`; vận hành và danh sách kiểm trên iPhone thật: `docs/PWA-IPHONE.md`; rà soát theo Hiến pháp tourdaovn: `docs/AUDIT-PWA-IPHONE.md`.

### 2.5 Nguồn danh mục dịch vụ — Google Sheet (điểm chạm ngoài duy nhất)

- **Nguồn:** Google Sheet dịch vụ công ty đang vận hành (cùng sheet tham chiếu cho booking website, ID ở `vars.SERVICES_SHEET_ID` trong `wrangler.jsonc`), chia sẻ "Bất kỳ ai có đường liên kết – Người xem", đọc dạng CSV. App chỉ **đọc**, không bao giờ ghi ngược.
- **Bản sao trong D1 (§2.4-6):** đồng bộ về `catalog_item` mỗi 15 phút (Cron), khi Admin bấm "Đồng bộ ngay", và một lần ngay lần đầu có người mở danh mục (chỉ một request giành được quyền đồng bộ lần đầu). Admin ghi đè giá/ẩn dịch vụ ở `catalog_override`; đồng bộ không bao giờ đè ghi đè, chỉ cảnh báo khi Sheet đổi giá sau lúc ghi đè. Dịch vụ biến mất khỏi Sheet chỉ bị ẩn. Chốt chặn: lần đồng bộ sẽ ẩn quá nửa dịch vụ bị từ chối (Admin có thể ép).
- **Chỉ đọc cột cần cho đơn** (N4): mã, tên, đơn vị, giá 4 loại khách, ghi chú khách. **Không đọc** `Khoá giá`, `Đường dẫn` (logic booking) và `Ghi chú nội bộ`.
- **Không chặn lập đơn khi Sheet lỗi:** dùng bản sao đã lưu + cảnh báo; `order_item.description`/`unit_price` vẫn nhận giá trị tự do (nhập tay). `order_item` luôn lưu giá đã chốt lúc lập đơn, kèm `catalog_code` nếu dòng sinh từ danh mục.
- **Sheet nhân viên** (`vars.STAFF_SHEET_ID`) chỉ là nguồn đề xuất tạo tài khoản ở bảng Admin (xem trước → xác nhận), không cấp quyền, không tự ngưng ai.

---

## 3. Kiến trúc hạ tầng

- **Nền tảng:** Cloudflare Workers (đồng nhất với tourdaovn — cùng nhà cung cấp, cùng thao tác vận hành, nhưng **project/account resource riêng**, không dùng chung Worker hay D1 với tourdaovn).
- **Ngôn ngữ:** TypeScript cho toàn bộ Worker logic (routing, API, tính toán server-side ở §2.3).
- **Giao diện: KHÔNG dùng React / SPA framework.** HTML + CSS thuần + TypeScript vanilla (biên dịch bằng esbuild/Vite ở chế độ multi-page, không bundle framework runtime). Lý do gắn trực tiếp vào ngưỡng hiệu năng ngay dưới đây: một SPA framework buộc tải/parse/hydrate runtime trước khi form dùng được, chi phí đó không đáng với quy mô v1 (4-5 màn hình: đăng nhập, tạo đơn, danh sách đơn, xem chi tiết, cài đặt). Đúng tinh thần P11 CONSTITUTION — đơn giản dễ bảo trì hơn thông minh phức tạp. Nếu app phình to sau này (nhiều panel tương tác phức tạp), đổi sang framework là quyết định kiến trúc mới, cần ADR riêng, không tự động áp vào v1.
- **Lưu trữ:** Cloudflare D1 (SQLite), database riêng — ví dụ `tourdao-sales-db`.
- **Static assets:** HTML/CSS/JS build tối giản, phục vụ qua Workers Assets, kèm `manifest`, icon và service worker `sw.js` (PWA, §2.4-7).
- **Xuất PNG/PDF:** render phía client bằng canvas/HTML-to-image (ví dụ `html-to-image` hoặc `satori`+`resvg` phía server nếu cần chất lượng cao và nhất quán font trên mọi thiết bị — quyết định kỹ thuật cụ thể để lại cho giai đoạn thực thi, không phải cửa một chiều).
- **Domain:** `booking.tourdao.vn` (chủ dự án chốt 2026-09-19, thay `sales.tourdao.vn` của bản đầu; §2.4-7) — bản ghi DNS CNAME/A trỏ sang Worker qua Cloudflare, tách biệt route với `tourdaovn.com`. **Địa chỉ này hiện đang phục vụ dự án `fastbooking`** (trang "Đặt Vé Nhanh Tại Quầy"; backend của nó dùng `FRONTEND_URL = https://booking.tourdao.vn` làm nguồn CORS). **Chủ dự án chốt dừng `fastbooking` và tự gỡ nó khỏi Cloudflare** (Worker/Pages, bản ghi DNS của `booking.tourdao.vn` và `api.booking.tourdao.vn`). `wrangler.jsonc` khai `routes` custom domain. Thứ tự cắt: (1) chủ dự án gỡ `fastbooking`; (2) gộp nhánh và deploy; (3) xác nhận theo mục "Sau khi deploy" của `docs/PWA-IPHONE.md`; (4) mới cho nhân viên cài app. **Tình trạng 2026-09-19: bước (2) và (3) đã làm** (PR #1 gộp vào `main`, deploy bản `0b13b279`; kiểm trên `booking.tourdao.vn`: `/manifest.webmanifest` trả `application/manifest+json`, `/sw.js` 200 `no-store`, 17/17 tệp khung cache được, `/api/*` trả 401 JSON `no-store`, service worker cài với cache `td-shell-20260919201756` gồm 14 mục và không có mục nào của `/api`); **bước (4) chưa làm**. Hệ quả có thật: khi khai `routes` mà không khai `workers_dev`, wrangler tắt địa chỉ `tourdao-sales.l-u-tu-n-v.workers.dev` (nay trả 404); chọn cố ý để tắt, muốn bật lại thì thêm `"workers_dev": true` vào `wrangler.jsonc`. **Chưa quan sát** việc trình duyệt nhận service worker mới ở lần deploy thứ hai trên Workers Assets thật.
- **Bí mật (secrets):** `wrangler secret put` cho khoá ký session đăng nhập — không hardcode.
- **Ngưỡng hiệu năng tối thiểu (P11/6.2 — ngưỡng phải đo được):**
  - Tải trang lần đầu trên di động (4G): dưới 2 giây tới có thể thao tác được (TTI).
  - Xuất PNG/PDF: dưới 3 giây từ lúc bấm nút tới có file.
  - Không phụ thuộc thư viện JS nặng (tránh framework SPA lớn) — ưu tiên vanilla/nhẹ để đạt ngưỡng trên.

---

## 4. Bề mặt và Design System — kế thừa để đồng nhất thương hiệu

> Theo P2, phần này chỉ được thực thi (viết CSS thật) sau khi §2 (kiến trúc dữ liệu) được duyệt. Ở đây chỉ **khai token kế thừa**, không phải bản dựng giao diện.

Token màu/chữ/khoảng cách sao chép giá trị (không import runtime) từ `tourdaovn/src/styles/tokens.css`, bộ mặc định "biển sâu":

- **Màu chính:** `--c-primary: #0C4A6E` (xanh biển đậm), `--c-accent: #C0392B` (san hô — dùng cho nút CTA "Xuất PNG" / "Xác nhận đơn").
- **Nền:** trắng thuần `#FFFFFF`, khối xen kẽ `#EAF2F8`.
- **Chữ:** `--font-display: "Be Vietnam Pro"` cho tiêu đề, `--font-ui: "Nunito"` cho nội dung — cả hai đã có sẵn font-face tự lưu trữ trong tourdaovn, cần copy file font sang project mới (không link CDN ngoài để tránh phụ thuộc mạng khi xuất ảnh).
- **Bo góc:** `--radius-md: 12px` cho card, `--radius-sm: 8px` cho input/button.
- **Khoảng cách:** thang `--s1..--s9` (4px → 96px) giữ nguyên.

**Lý do sao chép thay vì dùng chung:** N4 cấm xoá nhoà ranh giới hai dự án độc lập — nếu tourdaovn đổi theme (họ có cơ chế chọn theme `cat-bien`/`ngoc-lam`), sales app không được tự động đổi theo mà không qua quyết định riêng. Sao chép giá trị tại một mốc thời gian, ghi rõ ngày lấy token, là ranh giới đúng.

**Mẫu xác nhận đơn hàng (khung nội dung, không phải bố cục pixel):**
1. Header: logo/wordmark + tên công ty + MST + địa chỉ + hotline (từ `company_profile`).
2. Mã đơn + ngày lập + tên nhân viên phụ trách.
3. Khối "Thông tin khách hàng": tên, SĐT, email (nếu có), ghi chú.
4. Bảng dịch vụ: mô tả, chi tiết, số lượng, đơn giá, thành tiền.
5. Khối tổng kết: tạm tính, giảm giá, tổng cộng, đã cọc, còn lại — tổng cộng và còn lại nổi bật bằng `--c-accent`.
6. Footer: lời cảm ơn ngắn + hotline/Zalo liên hệ lại.

Định dạng khổ xuất: PNG tỉ lệ dọc phù hợp xem trên điện thoại trong Zalo (ví dụ khổ 720×~1280 trở lên tuỳ độ dài đơn), PDF khổ A4 chuẩn để in.

---

## 5. Việc còn thiếu để có thể thực thi (checklist trước khi mở phiên code)

- [x] Chốt §2.4 (đăng nhập, logo, danh mục dịch vụ, phạm vi xem đơn) — 2026-09-16.
- [ ] Cung cấp file logo khi có (không chặn thực thi v1 — wordmark chữ chạy trước, logo lắp vào sau qua màn hình cài đặt).
- [ ] Xác nhận tên Cloudflare account/zone hiện có quyền tạo Worker + D1 + DNS cho `tourdao.vn`.
- [x] Danh sách nhân viên ban đầu: Google Sheet nhân viên, nạp qua bảng Admin (2026-09-19).
- [x] Google Sheet danh mục dịch vụ: ID, tên cột, quyền đọc công khai — xem §2.5 (2026-09-19).
- [ ] Phê chuẩn bản ghi quyết định kiến trúc (ADR ngắn) cho: chọn D1 (không phải KV/R2) làm nguồn sự thật cho `order`, bản sao danh mục trong D1 (§2.4-6), và cơ chế PNG/PDF phía client vs server — viết ở đầu M4.

---

## 6. Lộ trình module (P3 — không nhảy cóc qua tầng)

Chia thi công thành các module tuần tự, mỗi module merge xong mới mở module sau. Mỗi module có một artifact kiểm tra được cụ thể, không chỉ lời khẳng định "đã xong" (Điều 8.2 CONSTITUTION).

| # | Module | Nội dung | Artifact kiểm tra |
|---|---|---|---|
| M1 ✅ | Khung + dữ liệu + đăng nhập | Khởi tạo Wrangler project, tạo D1 `tourdao-sales-db`, migration cho toàn bộ §2.1, API đăng nhập SĐT+PIN (§2.4-1) + session | Đăng nhập bằng 1 tài khoản thật, session giữ được qua reload |
| M2 ✅ (2026-09-19) | CRUD đơn hàng (nhập tay) | Form tạo đơn, `order`/`order_item`, tính `total`/`remaining_amount` ở server theo §2.3, danh sách đơn, xem chi tiết. Chưa đụng Google Sheet, chưa xuất file | Tạo 1 đơn thật qua UI, số liệu đúng bất biến §2.3, mọi nhân viên xem được đơn của nhau (§2.4-4) |
| M3 ✅ (2026-09-19) | Tích hợp Google Sheet | Bản sao Sheet trong D1 theo §2.5, hiển thị chọn nhanh dịch vụ trong form tạo đơn, có lối nhập tay dự phòng khi Sheet lỗi | Tạo đơn bằng dịch vụ lấy từ Sheet thật; tắt mạng giả lập lỗi Sheet vẫn tạo đơn được bằng nhập tay |
| M4 | Mẫu xác nhận + xuất PNG/PDF | Áp token §4, render mẫu từ `order` đã lưu, xuất PNG (ưu tiên Zalo) và PDF (A4) | Xuất 1 đơn thật ra cả PNG và PDF, đối chiếu đúng ngưỡng hiệu năng §3 (<3s) |
| M5 | Cài đặt + triển khai | Màn hình sửa `company_profile` (kể cả upload logo), gắn domain `booking.tourdao.vn` (§3: đang thuộc `fastbooking`). (Quản lý tài khoản `staff` đã làm sớm, trước M3 — §2.4-6) | Truy cập được domain thật, đổi thử 1 trường company_profile và thấy phản ánh trên mẫu xuất |
| PWA ✅ (2026-09-19, đã gộp `main` qua PR #1 và deploy) | App iPhone (PWA), ngoài M1–M5 | Chủ dự án yêu cầu làm xen giữa M3 và M4 (§2.4-7): manifest, icon, service worker, giao diện điện thoại ≤640px. Không đụng dữ liệu | typecheck, 58 test, e2e 6/6, axe 0 lỗi critical/serious, đo thời gian mở màn hình trên 4G giả lập (`docs/evidence/2026-09-19-pwa/`); chủ dự án đã thử trên iPhone thật (2026-09-19, nhận xét "nhìn ổn"; chưa có kết quả từng mục, xem `docs/PWA-IPHONE.md`) |

**Quy tắc khi mở mỗi module ở phiên Code:** giao đúng phạm vi một module, không để tác nhân thực thi tự ý làm thêm module sau "cho tiện" (đúng P3 — mỗi tầng làm xong mới sang tầng kế, không nhảy cóc rồi quay lại lấp).

---

## 7. Phân loại quyết định (Điều 7 CONSTITUTION)

| Quyết định | Loại cửa | Ghi chú |
|---|---|---|
| Chọn Cloudflare Workers + D1 thay vì Google Apps Script | Một chiều (chi phí đổi sau cao) | Đã chốt trong hội thoại — cần 1 dòng ADR khi bắt đầu thực thi |
| Schema `order`/`order_item`/`company_profile` | Một chiều (đổi schema sau khi có dữ liệu thật thì tốn kém) | Đây chính là spec này — cần phê chuẩn trước khi code |
| Schema `order_service` (thông tin chuyến theo dịch vụ, migration 0008) | Một chiều (đổi schema sau khi có dữ liệu thật thì tốn kém) | Chủ dự án duyệt 2026-09-19 (spec thông tin chuyến, Q6). Phương án bị loại: thêm cột chuyến vào `order_item` (chép lặp, dễ lệch); bỏ `order_item` (viết lại chốt chặn tiền, xuất file, trang đơn) |
| Danh mục dịch vụ: bản sao Google Sheet trong D1 + ghi đè Admin (thay cho "đọc trực tiếp") | Hai chiều (không phá dữ liệu `order` đã lưu, vì `order_item` luôn lưu giá đã chốt) | Đã chốt 2026-09-19 (§2.4-6) |
| Màu sắc/token cụ thể trong CSS | Hai chiều | Thực thi tự quyết trong khuôn khổ token đã khai ở §4 |
| Làm app iPhone bằng PWA (Thêm vào Màn hình chính), không Capacitor/SwiftUI | Hai chiều (gỡ manifest và service worker là về web thường; service worker đã cài trên máy tự gỡ nhờ cách tắt khẩn cấp ở `docs/PWA-IPHONE.md`) | Đã chốt 2026-09-19 (§2.4-7); phương án bị loại ở spec PWA, Q1 |
| Service worker: khung stale-while-revalidate, `/api/*` không qua cache, mã cache do build chèn | Hai chiều | Đã chốt 2026-09-19 (§2.4-7) |
| Tên hiển thị "Tour Đảo Booking" (nhãn dưới icon "Tour Đảo") | Hai chiều (5 chỗ, một commit) | **Chủ dự án chốt 2026-09-19** |
| Tên miền `booking.tourdao.vn` cho app này, thay trang `fastbooking` hiện có (thay cho `sales.tourdao.vn`) | Hai chiều nếu giữ nguyên `fastbooking` để khôi phục; thay một sản phẩm đang chạy nên cần kế hoạch cắt | **Chủ dự án chốt 2026-09-19: dừng `fastbooking`, tự gỡ khỏi Cloudflare, dùng tên miền cho app này.** `wrangler.jsonc` khai `routes` custom domain và đã deploy (2026-09-19); AI không xoá gì trên Cloudflare. Xoá `fastbooking` là một chiều về vận hành (chỉ dựng lại được từ thư mục `fastbooking/` trên máy). Chi tiết: §3 |

---

*Tài liệu này là artifact đặc tả (P12). Khi được duyệt, phiên thực thi kế tiếp đọc đúng tài liệu này (không đoán lại), và mọi sai lệch giữa spec và code phải được đồng bộ về theo P4.*

---

## Lịch sử thay đổi

- **2026-09-16** — Bản chốt đầu tiên (§2.4-1…4).
- **2026-09-19** — §2.4-5 quyền sửa đơn; §2.4-6 đồng bộ Sheet có bảng Admin (migration 0005, 0006); M1–M3 xong.
- **2026-09-19 (rà soát kiến trúc)** — Migration 0007: `audit_log` bỏ `CHECK` liệt kê (danh sách ở `src/shared/audit-actions.ts`), `order_item.catalog_code`, TRIGGER bất biến tiền. Hợp nhất §2.1/§2.2/§2.5/§5/§6/§7 về đúng hiện trạng. Kiến trúc mã: `docs/ARCHITECTURE.md`; phát hiện + kế hoạch: `docs/AUDIT-FINDINGS.md`, `docs/REFACTOR-PLAN.md`.
- **2026-09-19 (thông tin chuyến đi, A1)** — Migration 0008: bảng `order_service` (số khách theo loại + thông tin chuyến theo dịch vụ), `order_item.service_id/catalog_price/pax_code`, trigger khoá sau xác nhận và chốt chặn xác nhận đủ chuyến; đơn cũ được backfill thành dịch vụ nhập tay (A1). Spec: `docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md`; kế hoạch: `docs/superpowers/plans/2026-09-19-thong-tin-chuyen-di-a1.md`. Chưa áp remote.
- **2026-09-19 (App iPhone PWA)** — §2.4-7 (quyết định), §3 (static assets kèm manifest/icon/service worker), §6 (dòng PWA), §7 (ba dòng, tên chờ duyệt), đầu spec (điểm chạm tài sản logo). Không đổi §2 (dữ liệu). Thiết kế: `docs/superpowers/specs/2026-09-19-iphone-pwa-design.md`; rà soát theo Hiến pháp tourdaovn: `docs/AUDIT-PWA-IPHONE.md`.
