# ADR-0002 — Modular Monolith: ranh giới và quyền sở hữu dữ liệu

- **Trạng thái:** proposed (bản 3, sau hai lượt rà soát độc lập 2026-09-20)
- **Ngày:** 2026-09-20   **Người phê chuẩn:** chủ dự án (chờ duyệt)
- **Loại quyết định:** **cửa một chiều** — tiền tố tên bảng và quyền sở hữu khó đổi sau khi có dữ liệu (quy tắc hiện hành: không đổi tên bảng đã có)
- **Liên quan:** ADR-0001, ADR-0003; `docs/ARCHITECTURE.md` mục *Các tầng và chiều phụ thuộc* (**năm** quy tắc hiện hành, đánh số 1–5 — ADR này **giữ nguyên cả năm và chỉ siết thêm**, Điều 9.7)

## Bối cảnh
Có sáu thư mục module (`accounts`, `audit`, `auth`, `catalog`, `orders`, `staff`); `src/index.ts` đăng ký **năm** module có route (`staff` là năng lực nền, không có route riêng). Import giữa module chỉ đi qua `index.ts` và không vòng (kiểm ngày 2026-09-20 bằng `grep -n 'from "\.\./' src/modules/*/*.ts | grep -v test | grep -v shared`). Cần thêm bốn miền mới (hồ sơ, địa điểm, điều hành, thu tiền–hoá đơn) mà không phá ranh giới: **sửa một module không buộc sửa module khác, không phải đập đi làm lại**.

## Quyết định
Năm quy tắc của `ARCHITECTURE.md` (giữ nguyên): **(1)** module chỉ import `index.ts` của module khác; **(2)** kiểm quyền không phải phụ thuộc; **(3)** chỉ module chủ ghi bảng của mình, ghi xuyên module bằng câu lệnh D1 chưa chạy do `index.ts` của module chủ cung cấp, gộp vào một `db.batch()`; **(4)** đọc xuyên module chỉ để lấy nhãn hiển thị; **(5)** `src/shared/` không import `src/modules/`. Thêm tám điều siết chặt:

1. **Sổ đăng ký, máy đọc được:** mỗi bảng và view có đúng một module chủ, khai ở `docs/data-dictionary.json` (nguồn sự thật; `docs/DATA-DICTIONARY.md` được **sinh** từ đó — P6): tên, module chủ, khoá ngoại đi ra, cột của view công bố, bất biến, cách kiểm bằng máy. Bảng/view không có trong sổ là vi phạm.
2. **Bảng mới có tiền tố module** (mô phỏng schema Oracle; D1 không có schema): `pty_` hồ sơ, `loc_` địa điểm, `dsp_` điều hành, `bil_` thu tiền–hoá đơn, `stf_` bảng mới của module staff. Bảng cũ **giữ tên** (`staff`, `orders`, `order_item`, `order_service`, `audit_log`, `catalog_*`, `login_attempt`, `company_profile`) và được ghi vào sổ; đó là nợ đặt tên có chủ đích.
3. **JOIN xuyên module chỉ qua view công bố** `v_<tiền tố>_<tên>` của module chủ (quy tắc 4, siết thêm: không JOIN thẳng bảng gốc). View công bố: **chỉ-đọc**; **cấm trigger `INSTEAD OF`** (nếu không module khác ghi thẳng qua view, lách quy tắc 3); **chỉ chứa khoá + nhãn hiển thị + cờ trạng thái tối thiểu**; danh sách cột của mỗi view nằm trong sổ và đổi cột là đổi hợp đồng (phải ghi). Cột của view **được** dùng trong `WHERE`/`ORDER BY` (tìm theo tên), không chỉ `SELECT`. Giữ view phẳng: ưu tiên cột `display_name` do module chủ duy trì hơn là JOIN nhiều bảng trong view (D1 tính tiền theo `rows_read`).
4. **Câu bảo vệ (guard) tham chiếu bảng module khác** do `index.ts` của module chủ cung cấp dạng chuỗi SQL công khai (vd `audit.wonGuardSql()`), module dùng không tự viết tên bảng đó.
5. **Khoá ngoại xuyên module** chỉ trỏ tới **khoá chính** của module chủ và chỉ theo chiều phụ thuộc bên dưới. Hành động khi xoá mặc định `NO ACTION`; `RESTRICT` chỉ dùng cho bảng cha chắc chắn không bao giờ phải dựng lại (SQLite kiểm `RESTRICT` ngay, không hoãn được, nên nó khoá luôn lối `defer_foreign_keys` khi dựng lại bảng cha — `staff`, `orders` **không** dùng `RESTRICT`); chặn xoá ở tầng ứng dụng. `CASCADE` bị cấm cho bảng mới.
6. **Ngoại lệ đã tuyên bố — cột WHO/khoá ngoại có sẵn tới `staff`/`orders`:** `audit_log.staff_id`, `audit_log.order_id`, `catalog_override.updated_by`, `company_profile.updated_by` (đã có từ `0002`/`0006`/`0007`) giữ nguyên khoá ngoại (gỡ đi phải dựng lại bảng đang chạy); sổ ghi chúng là **"cạnh toàn vẹn, không phải cạnh phụ thuộc mã"**. Đổi lại `audit` là **sink**: cấm import module khác và cấm JOIN bảng gốc của module khác — nhãn của nó lấy qua view công bố. Bảng **mới** theo ADR-0003 điều 6 có cột WHO `TEXT NULL` không khoá ngoại.
7. **Số liệu dẫn xuất xuyên module** (vd "đã trả" = tổng phiếu thu) được **tính**, không lưu bản sao ngoài module chủ; nếu buộc phải lưu thì chỉ qua câu lệnh do module chủ cung cấp (quy tắc 3). Chi tiết ở đặc tả N3.
8. **Kiểm bằng máy (Điều 8.2, 8.5 — mặc định từ chối)** bằng `src/architecture.test.ts` trong `npm test`, phạm vi thực tế:
   - (a) **import chỉ qua `index.ts`**: quét các dòng `import` (cú pháp tĩnh, đều đặn), loại `*.test.ts` và `scripts/`;
   - (c) **hướng khoá ngoại** và (d) **mọi bảng/view có trong sổ**: đọc từ CSDL đã di trú bằng `PRAGMA table_list` / `PRAGMA foreign_key_list` (dựng schema từ `migrations/*.sql` bằng `node:sqlite` như `orders/migration.test.ts` đã làm) rồi so với sổ — kiểm ngữ nghĩa, không phải quét chuỗi;
   - quét `migrations/*.sql`: cấm `INSTEAD OF`; cấm `ON DELETE CASCADE` trên bảng mới; bảng mới phải có đủ cột kiểm toán (ADR-0003);
   - (b) **mỗi câu SQL chỉ chạm bảng của module mình** làm **theo giai đoạn**: bắt buộc cho module mới ngay từ đầu (SQL phải lấy ra được bằng cách mỗi `repository.ts` đăng ký câu lệnh — **chỉ bắt buộc với câu ghi và câu có `JOIN`**, câu đọc một bảng của chính module thì không (P11); `table: string` động ở `orders/repository.ts` đổi thành union literal); với module hiện có, các điểm chạm liệt kê ở mục Hệ quả nằm trong **danh sách ngoại lệ có hạn** cho tới khi được chuyển sang view/guard công bố.

### Đồ thị phụ thuộc mục tiêu (`A → B` = A phụ thuộc B; chỉ đi xuống, không vòng)
- **Đáy** (không phụ thuộc module nào): `parties`, `locations`, `audit` (sink), `shared`.
- `staff` → `parties` (khoá ngoại `staff.party_id`); `auth` → `staff`.
- `catalog` → `parties` (**cạnh dự kiến ở N4**: quy tắc giá theo loại vai trò).
- `orders` → `staff`, `parties`, `locations`, `catalog`.
- `dispatch` → `orders`, `parties`, `locations`; `billing` → `orders`, `parties`, `locations`.
- `accounts` (module lắp ráp route) → `staff`, `auth`, `audit`; không sở hữu bảng.
- `company` (M5, chưa có) → chỉ qua cột WHO `updated_by` (ngoại lệ điều 6); `catalog_override.updated_by → staff` cũng là ngoại lệ điều 6, không phải cạnh phụ thuộc mã.
- Mọi module ghi được vào `audit` qua `auditStatement` (câu lệnh), không phải phụ thuộc mã ngược.

### Bảng sở hữu (một chủ duy nhất)
| Module chủ | Bảng hiện có | Bảng mới đã quyết | Bảng dự kiến ở đợt sau (giữ chỗ; chi tiết ở ADR/đặc tả của đợt đó) |
|---|---|---|---|
| `parties` (mới) | — | `pty_party`, `pty_person`, `pty_organization`, `pty_contact_point`, `pty_role_type`, `pty_party_role`, `pty_relationship_type`, `pty_party_relationship` | — |
| `locations` (mới) | — | `loc_location`, `loc_location_type` | — |
| `staff` | `staff` | `stf_permission_type`, `stf_permission` (ADR-0005) | — |
| `auth` | `login_attempt` | — | — |
| `audit` | `audit_log` | — | — |
| `catalog` | `catalog_item`, `catalog_override`, `catalog_sync` | — | quy tắc giá theo loại vai trò (N4) |
| `orders` | `orders`, `order_item`, `order_service` | — | cột `booker_party_id`, `traveller_party_id`, `sales_location_id` (N2); bản ghi sửa sau xác nhận (N3, ADR-0007) |
| `dispatch` (mới, N2) | — | `dsp_assignment` và các bảng tra cứu đi kèm (ADR-0006) | `dsp_call_log`, `dsp_service_progress` |
| `billing` (mới, N3) | — | — | `bil_payment_method`, `bil_payment_receipt`, `bil_invoice_request` |
| `company` (chưa có, M5) | `company_profile` | — | — |

`company_profile` là **ngoại lệ có hạn** của quy tắc "một chủ": migration `0002` đã ghi `-- Module: company` nhưng module chưa tồn tại; sổ ghi chủ dự kiến là `company` (M5).

### Cách mỗi nhu cầu xuyên module thuộc quy tắc nào
| Nhu cầu | Quy tắc |
|---|---|
| `orders` hiện tên người lập, tên người đặt / khách đi tour | (4) view công bố `v_stf_staff_label`, `v_pty_party_label` |
| `orders` lưu `booker_party_id` | khoá ngoại tới `pty_party.id` (điều 5) |
| `dispatch` gắn nhiệm vụ với đơn/dịch vụ; `billing` gắn phiếu thu với đơn | khoá ngoại tới khoá chính của `orders` / `order_service` (điều 5) |
| `billing` cần tổng tiền của đơn để tính "còn lại" | (1) hàm công khai của `orders`; kết quả tính, không sao chép (điều 7) |
| `orders` cần giá hiệu lực, cờ hiện của dịch vụ | (1) `getEffectiveServices` của `catalog` (đã có) |
| `orders` cần biết một câu ghi có "thắng" hay không (`wonGuard`) | điều 4: `audit.wonGuardSql()` |
| Mọi module ghi nhật ký | (3) `auditStatement` |
| `orders` cần biết người dùng "đang được giao" đơn (chỉ để cho sửa thông tin vận hành) | hàm do `dispatch` cung cấp, **tiêm qua `ctx` ở gốc lắp ráp** như `ctx.staff` (quy tắc 2 mở rộng); `orders` không import `dispatch`, không có SQL đọc bảng `dsp_*` (ADR-0007 điều 4) |

## Lý do
- Ranh giới hiện có đã chạy và được audit; mở rộng theo đúng năm quy tắc đó giữ chi phí đổi thay thấp và không tạo cơ chế thứ hai (P11, P6).
- View công bố là "giao diện" ở tầng dữ liệu: đổi cấu trúc bảng bên trong module chỉ cần giữ nguyên view. Nó còn che cột nhạy cảm (`pin_hash`) khỏi module khác — lợi ích an ninh thật.
- Tiền tố + sổ máy đọc được + bài kiểm máy làm ranh giới **kiểm được** thay vì chỉ là quy ước (Điều 8.2).

## Phương án bị loại
- **Mỗi module một CSDL D1 riêng:** mất giao dịch nguyên tử của `db.batch()` (A1 dựa vào đó cho `wonGuard` và xác nhận có điều kiện), mất khoá ngoại.
- **Cho JOIN thẳng bảng module khác (quy tắc 4 cũ):** đổi cấu trúc một module làm vỡ module khác.
- **Một tệp/bảng phẳng, không ranh giới:** không sửa được từng phần.
- **Microservices:** vượt quy mô, mất giao dịch, tăng vận hành (P11).
- **Bỏ khoá ngoại của `audit_log`:** phải dựng lại một bảng đang bị ghi liên tục; ngoại lệ tuyên bố (điều 6) rẻ và an toàn hơn.
- **Quét chuỗi SQL bằng regex để kiểm ranh giới:** dương tính giả (tên bảng trong chú thích, hằng chuỗi) và âm tính giả (SQL ghép, tên bảng động) — bị thay bằng kiểm ngữ nghĩa ở điều 8.

## Hệ quả
- **Điều kiện chấp nhận:** việc đầu tiên của N1 là tạo `docs/data-dictionary.json` với **đủ 10 bảng hiện có** (và các view), rồi bài kiểm `architecture.test.ts` xanh. Không có bước này thì ADR vi phạm chính nó ngay ngày đầu.
- **Các điểm chạm xuyên module hiện có** (kiểm kê đầy đủ, đưa vào danh sách ngoại lệ có hạn của điều 8(b)): `orders/repository.ts` — `JOIN staff` (`ORDER_SELECT`) và `wonGuard` đọc `audit_log`; `audit/repository.ts` — ba `JOIN staff` (một ở `listByOrder`, hai ở `listAll`, trong đó một nối theo `target_id` **đa hình** không có khoá ngoại), một `JOIN orders`, và tìm theo tên (`s.full_name LIKE`, `t.full_name LIKE`) dùng cột trong `WHERE`. Cách xử lý: view `v_stf_staff_label`, `v_ord_order_label`, hàm `audit.wonGuardSql()` — vài dòng mỗi chỗ, làm khi module đó được chạm ở N1/N2.
- Mỗi bảng/view mới tốn một dòng trong sổ và một tiền tố; thêm module = thêm một dòng vào `src/index.ts` như hiện nay.
- Nợ có chủ đích: bảng cũ không có tiền tố; có thể đổi bằng expand–contract ở một ADR sau nếu chủ dự án muốn — hiện không kế hoạch.
- `ARCHITECTURE.md` cập nhật khi ADR được duyệt: danh sách module, sổ sở hữu, quy tắc 4 siết chặt.
