# SPEC — tourdao-sales (Cổng xác nhận đơn hàng nội bộ)

> Trạng thái: **CHỐT — sẵn sàng thi công ở phiên riêng.** Bốn điểm mơ hồ cấu trúc ở §2.4 (bản gốc) đã được chủ dự án quyết định vào 2026-09-16, xem §2.4 đã cập nhật. Đây là artifact đặc tả (spec), không phải code. Theo P1/P2/N1 của `CONSTITUTION.md` (tourdaovn), bề mặt (giao diện) không được dựng trước khi bản ánh xạ dữ liệu này được duyệt — nay đã đủ điều kiện mở phiên thực thi.
> Phạm vi: dự án **độc lập hoàn toàn** với `tourdaovn` (N4 — không xoá nhoà ranh giới hai dự án độc lập). Không chạm code, D1, hay Sanity của tourdaovn. Điểm chạm duy nhất được tuyên bố: kế thừa **giá trị token thị giác** (màu, font, spacing) để đồng nhất thương hiệu — sao chép giá trị tại một thời điểm, không import runtime, không phụ thuộc build.

---

## 1. Định vị và phạm vi (P1 — trừu tượng trước cụ thể)

**Vì sao tồn tại:** nhân viên bán hàng cần tạo và gửi một bản xác nhận đơn hàng cho khách qua Zalo, nhanh, đúng, đồng nhất thương hiệu, mà không cần biết Photoshop/Canva hay đợi ai đó dựng file cho họ.

**Là gì:** một ứng dụng nội bộ (không phải trang công khai) tại `sales.tourdao.vn`, nơi nhân viên:
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

**`order`** — đơn xác nhận (thực thể trung tâm)
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

**`order_item`** — dòng sản phẩm/dịch vụ trong đơn (1 đơn nhiều dòng)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | TEXT (uuid) | khoá chính |
| order_id | TEXT | FK → order.id |
| description | TEXT | tên dịch vụ, ví dụ "Tour Hòn Mun 1 ngày" |
| detail | TEXT | tuỳ chọn: ngày khởi hành, số khách, ghi chú dòng |
| quantity | INTEGER | mặc định 1 |
| unit_price | INTEGER | đơn giá, VNĐ |
| line_total | INTEGER | = quantity × unit_price, tính server |
| sort_order | INTEGER | thứ tự hiển thị |

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

**`catalog_item` / `catalog_override` / `catalog_sync`** (migration 0006, thay cho ý "không có bảng riêng" ở bản gốc — xem §2.4-6): `catalog_item` là bản sao phần lấy từ Sheet (mã, tên, đơn vị `perPax|perNPax`, giá 4 loại khách, ghi chú khách; `in_sheet=0` khi dịch vụ biến mất khỏi Sheet); `catalog_override` là ghi đè của Admin (giá từng loại khách + ẩn, kèm `base_json` = giá Sheet lúc ghi đè để cảnh báo xung đột); `catalog_sync` là trạng thái lần đồng bộ gần nhất. Bản gốc (đã lỗi thời): **`service_catalog`** — KHÔNG có bảng D1 riêng. Danh mục dịch vụ/tour sống ở một nguồn ngoài (Google Sheet công ty đang dùng làm tham chiếu cho chức năng booking) và được đọc trực tiếp qua Google Sheets API mỗi khi nhân viên mở form tạo đơn — xem §2.5. Cố ý không nhân bản dữ liệu này vào D1 để tránh có hai nguồn sự thật cho cùng một bảng giá (P6/N7): Sheet là nguồn, app chỉ đọc.

**`audit_log`** — nhật ký thay đổi trạng thái đơn (P5 — mọi quyết định để lại dấu vết)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | TEXT (uuid) | |
| order_id | TEXT (nullable) | FK → order.id; NULL khi hành động không thuộc một đơn (migration 0005) |
| staff_id | TEXT | ai thao tác |
| action | TEXT | đơn: `created` \| `updated` \| `confirmed` \| `cancelled` \| `exported_png` \| `exported_pdf`; tài khoản: `staff_created` \| `staff_updated` \| `staff_suspended` \| `staff_reactivated` \| `staff_role_changed` \| `pin_reset` \| `pin_changed` \| `login_unlocked` \| `staff_synced`; dịch vụ: `catalog_synced` \| `catalog_overridden` \| `catalog_override_cleared` \| `catalog_hidden` \| `catalog_unhidden` |
| target_type / target_id | TEXT | đối tượng: `order` \| `staff` \| `catalog` và id/mã tương ứng |
| detail | TEXT (nullable) | mô tả ngắn; **không bao giờ chứa PIN hay bí mật** |
| created_at | TEXT (ISO) | |

**`login_attempt`** — bộ đếm chống dò PIN (migration 0005): `id`, `key` (`phone:0xxxxxxxxx` hoặc `ip:<địa chỉ>`), `at` (ms). Cửa sổ trượt 15 phút; 5 lần/SĐT, 30 lần/IP.

### 2.2 Quan hệ
```
staff (1) ──< order (N) ──< order_item (N)
staff (1) ──< audit_log (N) ──> order
company_profile — singleton, không quan hệ FK, đọc bởi mọi order khi render
```

### 2.3 Bất biến dữ liệu (N5 — không được phá ngầm)
- `total`, `remaining_amount`, `line_total` **luôn tính lại ở server** khi ghi, không bao giờ tin giá trị client gửi lên. Vi phạm là lỗ hổng gian lận giá trực tiếp.
- Chuyển trạng thái đơn chỉ theo chiều: `draft → confirmed → cancelled` hoặc `draft → cancelled`. Không cho phép `confirmed → draft` (một đơn đã xác nhận và có thể đã gửi khách thì không được "biến mất" khỏi lịch sử — muốn sửa thì tạo bản ghi mới, đơn cũ chuyển `cancelled` và ghi `audit_log` tham chiếu).
- `order_code` duy nhất toàn hệ thống, sinh tự động, không cho nhân viên tự đặt (tránh trùng/đụng độ khi nhiều người dùng cùng lúc).
- Tiền tệ luôn là số nguyên VNĐ (không dùng float) — nguyên tắc chống sai số cộng dồn.
- `company_profile` chỉ có đúng một dòng `id = "default"`; sửa là UPDATE, không bao giờ INSERT dòng thứ hai (một nguồn sự thật, P6/N7).

### 2.4 Quyết định đã chốt (2026-09-16)

1. **Đăng nhập nhân viên:** xác nhận dùng số điện thoại + PIN 6 số như đề xuất.
2. **Logo công ty:** công ty có logo, sẽ tải lên sau. v1 chạy với wordmark chữ; `company_profile.logo_url` đã có sẵn trường, màn hình cài đặt (admin) cho phép upload ảnh bất kỳ lúc nào sau đó mà không cần đổi schema hay thi công lại.
3. **Đơn giá dịch vụ:** không nhập tay, không có bảng riêng trong D1. Lấy từ **Google Sheet** hiện có (cùng nguồn tham chiếu công ty đang dùng cho chức năng booking) — xem §2.5 để biết cách đọc.
4. **Phạm vi xem đơn:** mọi nhân viên (`sales` lẫn `admin`) xem được đơn của nhau, không giới hạn theo người tạo. Phân quyền `admin` chỉ khác biệt ở việc **sửa** `company_profile` và **quản lý tài khoản** `staff`, không phải phạm vi xem `order`.

5. **Quyền sửa đơn (chốt 2026-09-19):** chỉ **người lập đơn** hoặc `admin` được sửa, xác nhận, huỷ một đơn (server trả 403 với người khác; UI ẩn nút). Điều chỉnh §2.4-4: phạm vi *xem* vẫn mở cho mọi nhân viên, nhưng `admin` còn khác `sales` ở quyền thay đổi đơn của người khác. `admin` có thêm màn hình **nhật ký hệ thống** (`/audit`, `GET /api/audit`) liệt kê mọi bản ghi `audit_log` toàn hệ thống; `sales` không truy cập được. Lịch sử theo từng đơn (trong trang chi tiết) vẫn hiển thị cho mọi nhân viên xem đơn đó.

6. **Đồng bộ Sheet với bảng điều khiển Admin (chốt 2026-09-19, thay đổi §2.5 và mở rộng §2.4-1):**
   - **Dịch vụ & giá:** Sheet (ID `1XPx1g0JVTdevdX35MeCpt6Cc6Dgxdmfer6okEWleD3s`) vẫn là nguồn chính nhưng hệ thống **lưu bản sao trong D1** (bảng `catalog_item`), tự đồng bộ định kỳ và có nút "Đồng bộ ngay". Admin có thể **ghi đè** giá/ẩn một dịch vụ trong app; dòng bị ghi đè không bị lần đồng bộ sau đè mất, chỉ cảnh báo khi Sheet có giá khác. Dòng biến mất khỏi Sheet chỉ bị ẩn. App vẫn **không bao giờ ghi ngược** vào Sheet, và chỉ đọc các cột cần cho đơn (mã, tên, đơn vị, các mức giá + ghi chú khách); **không đọc** `Khoá giá`, `Đường dẫn` (logic booking) và `Ghi chú nội bộ`. Nếu Sheet không truy cập được, vẫn dùng bản sao đã lưu và cho nhập tay như §2.5.
   - **Nhân viên:** Sheet (ID `16K3b1CtqjJqXR_CkfSSdLyK0t6j0pYq_OuskF0VFaw4`, cột Tên người dùng + Số điện thoại) chỉ là nguồn *đề xuất*: Admin bấm "Đồng bộ từ Sheet", xem trước, xác nhận mới tạo tài khoản (PIN ngẫu nhiên hiện một lần). Sheet không bao giờ tự tạo/ngưng tài khoản hay cấp `admin`; D1 là nguồn sự thật.
   - **Thứ tự thi công:** bảng Admin (quản lý tài khoản + chống dò PIN) làm trước M3.

### 2.5 Nguồn danh mục dịch vụ — Google Sheet (điểm chạm ngoài duy nhất)

> **Cập nhật 2026-09-19:** đoạn dưới là bản gốc "đọc trực tiếp, không cache". Quyết định §2.4-6 thay bằng bản sao trong D1 + ghi đè có chủ đích; các ràng buộc "chỉ đọc", "chỉ cột cần thiết" và "không chặn lập đơn khi Sheet lỗi" vẫn giữ nguyên.

- **Nguồn sự thật cho bảng giá/tour:** Google Sheet do công ty vận hành, cùng sheet dùng làm tham chiếu cho chức năng booking hiện có (không phải sheet mới). App tourdao-sales chỉ **đọc**, không bao giờ ghi ngược vào Sheet — tránh xung đột với quy trình cập nhật giá hiện tại của công ty.
- **Cách đọc:** app gọi Google Sheets API (đọc công khai bằng API key hoặc đọc riêng tư bằng service account, tuỳ quyền chia sẻ của Sheet — chốt cụ thể ở đầu phiên thực thi) **mỗi lần nhân viên mở form tạo đơn**, không cache dài hạn trong D1. Nhân viên luôn thấy giá mới nhất mà không cần ai bấm nút đồng bộ.
- **Ràng buộc theo N4 (ranh giới dự án):** app chỉ đọc đúng những cột cần cho `order_item` (tên dịch vụ, đơn giá, có thể có ghi chú/khởi hành) — không đọc hay ghi bất kỳ cột nào phục vụ logic booking khác trên cùng Sheet, để không vô tình tạo phụ thuộc hai chiều giữa hai hệ thống độc lập.
- **Xử lý khi Sheet không truy cập được:** vì đơn giá là bắt buộc để lập đơn, nếu gọi API lỗi (mất mạng, Sheet đổi quyền, quá hạn mức), app hiển thị cảnh báo rõ ràng và cho phép nhân viên **nhập tay tạm thời** dòng dịch vụ đó (không chặn hẳn việc lập đơn) — `order_item.description`/`unit_price` vẫn nhận giá trị tự do, catalog chỉ là một cách điền nhanh, không phải ràng buộc cứng ở tầng dữ liệu.
- **Việc cần làm trước khi code chạm phần này:** xác nhận ID/link Sheet cụ thể, tên các cột, và cấp quyền đọc (chia sẻ Sheet với service account email, hoặc bật "Anyone with link – viewer" nếu chấp nhận đọc công khai).

---

## 3. Kiến trúc hạ tầng

- **Nền tảng:** Cloudflare Workers (đồng nhất với tourdaovn — cùng nhà cung cấp, cùng thao tác vận hành, nhưng **project/account resource riêng**, không dùng chung Worker hay D1 với tourdaovn).
- **Ngôn ngữ:** TypeScript cho toàn bộ Worker logic (routing, API, tính toán server-side ở §2.3).
- **Giao diện: KHÔNG dùng React / SPA framework.** HTML + CSS thuần + TypeScript vanilla (biên dịch bằng esbuild/Vite ở chế độ multi-page, không bundle framework runtime). Lý do gắn trực tiếp vào ngưỡng hiệu năng ngay dưới đây: một SPA framework buộc tải/parse/hydrate runtime trước khi form dùng được, chi phí đó không đáng với quy mô v1 (4-5 màn hình: đăng nhập, tạo đơn, danh sách đơn, xem chi tiết, cài đặt). Đúng tinh thần P11 CONSTITUTION — đơn giản dễ bảo trì hơn thông minh phức tạp. Nếu app phình to sau này (nhiều panel tương tác phức tạp), đổi sang framework là quyết định kiến trúc mới, cần ADR riêng, không tự động áp vào v1.
- **Lưu trữ:** Cloudflare D1 (SQLite), database riêng — ví dụ `tourdao-sales-db`.
- **Static assets:** HTML/CSS/JS build tối giản, phục vụ qua Workers Assets.
- **Xuất PNG/PDF:** render phía client bằng canvas/HTML-to-image (ví dụ `html-to-image` hoặc `satori`+`resvg` phía server nếu cần chất lượng cao và nhất quán font trên mọi thiết bị — quyết định kỹ thuật cụ thể để lại cho giai đoạn thực thi, không phải cửa một chiều).
- **Domain:** `sales.tourdao.vn` — bản ghi DNS CNAME/A trỏ sang Worker qua Cloudflare, tách biệt route với `tourdaovn.com`.
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
- [ ] Xác nhận danh sách nhân viên ban đầu (tên + SĐT) để khởi tạo tài khoản `staff`, hoặc xác nhận sẽ tự tạo qua màn hình admin.
- [ ] Cung cấp link/ID Google Sheet danh mục dịch vụ + xác nhận tên cột + cấp quyền đọc (service account hoặc link công khai) — xem §2.5.
- [ ] Phê chuẩn bản ghi quyết định kiến trúc (ADR ngắn) cho: chọn D1 (không phải KV/R2) làm nguồn sự thật cho `order`, đọc Google Sheet trực tiếp (không cache) làm nguồn giá, và cơ chế PNG/PDF phía client vs server.

---

## 6. Lộ trình module (P3 — không nhảy cóc qua tầng)

Chia thi công thành các module tuần tự, mỗi module merge xong mới mở module sau. Mỗi module có một artifact kiểm tra được cụ thể, không chỉ lời khẳng định "đã xong" (Điều 8.2 CONSTITUTION).

| # | Module | Nội dung | Artifact kiểm tra |
|---|---|---|---|
| M1 | Khung + dữ liệu + đăng nhập | Khởi tạo Wrangler project, tạo D1 `tourdao-sales-db`, migration cho toàn bộ §2.1, API đăng nhập SĐT+PIN (§2.4-1) + session | Đăng nhập bằng 1 tài khoản thật, session giữ được qua reload |
| M2 | CRUD đơn hàng (nhập tay) | Form tạo đơn, `order`/`order_item`, tính `total`/`remaining_amount` ở server theo §2.3, danh sách đơn, xem chi tiết. Chưa đụng Google Sheet, chưa xuất file | Tạo 1 đơn thật qua UI, số liệu đúng bất biến §2.3, mọi nhân viên xem được đơn của nhau (§2.4-4) |
| M3 ✅ (2026-09-19) | Tích hợp Google Sheet | Đọc API theo §2.5, hiển thị chọn nhanh dịch vụ trong form tạo đơn, có lối nhập tay dự phòng khi Sheet lỗi | Tạo đơn bằng dịch vụ lấy từ Sheet thật; tắt mạng giả lập lỗi Sheet vẫn tạo đơn được bằng nhập tay |
| M4 | Mẫu xác nhận + xuất PNG/PDF | Áp token §4, render mẫu từ `order` đã lưu, xuất PNG (ưu tiên Zalo) và PDF (A4) | Xuất 1 đơn thật ra cả PNG và PDF, đối chiếu đúng ngưỡng hiệu năng §3 (<3s) |
| M5 | Cài đặt + triển khai | Màn hình sửa `company_profile` (kể cả upload logo), quản lý tài khoản `staff`, gắn domain `sales.tourdao.vn` | Truy cập được domain thật, đổi thử 1 trường company_profile và thấy phản ánh trên mẫu xuất |

**Quy tắc khi mở mỗi module ở phiên Code:** giao đúng phạm vi một module, không để tác nhân thực thi tự ý làm thêm module sau "cho tiện" (đúng P3 — mỗi tầng làm xong mới sang tầng kế, không nhảy cóc rồi quay lại lấp).

---

## 7. Phân loại quyết định (Điều 7 CONSTITUTION)

| Quyết định | Loại cửa | Ghi chú |
|---|---|---|
| Chọn Cloudflare Workers + D1 thay vì Google Apps Script | Một chiều (chi phí đổi sau cao) | Đã chốt trong hội thoại — cần 1 dòng ADR khi bắt đầu thực thi |
| Schema `order`/`order_item`/`company_profile` | Một chiều (đổi schema sau khi có dữ liệu thật thì tốn kém) | Đây chính là spec này — cần phê chuẩn trước khi code |
| Đọc danh mục dịch vụ trực tiếp từ Google Sheet (không cache trong D1) | Hai chiều (đổi sang cache/D1 sau này không phá dữ liệu `order` đã lưu, vì `order_item` luôn lưu giá trị đã chốt tại thời điểm lập đơn) | Đã chốt 2026-09-16 — cần xác nhận link Sheet + quyền đọc trước khi code chạm phần này |
| Màu sắc/token cụ thể trong CSS | Hai chiều | Thực thi tự quyết trong khuôn khổ token đã khai ở §4 |

---

*Tài liệu này là artifact đặc tả (P12). Khi được duyệt, phiên thực thi kế tiếp đọc đúng tài liệu này (không đoán lại), và mọi sai lệch giữa spec và code phải được đồng bộ về theo P4.*
