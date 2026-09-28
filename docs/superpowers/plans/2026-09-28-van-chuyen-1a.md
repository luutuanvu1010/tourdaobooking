# Vận chuyển lượt 1a (ADR-0040) — Kế hoạch thi công

> **Cho người thi công (AI):** BẮT BUỘC dùng superpowers:subagent-driven-development (khuyến nghị) hoặc superpowers:executing-plans để làm theo từng task. Các bước dùng ô `- [ ]` để đánh dấu.
> - Đây là **việc lớn** theo `CLAUDE.md` §3: **dữ liệu** (3 migration, 7 bảng mới), **quyền** (mã quyền app mới, 4 ô mới, cột mới của bản đồ quyền), **dữ liệu cá nhân** (số CCCD, số bằng lái), **luật** (đề xuất nới hàng rào kiến trúc).
> - Người thi công **không tự nghiệm thu**: Task K2 là người kiểm độc lập chỉ đọc.
> - AI **không deploy**: chủ dự án tự chạy `npm run day-len` rồi `npm run trien-khai` (Task K3).
> - Kế hoạch **chia hai phần**. **Phần A** (dữ liệu + máy chủ + quyền + hai màn "khuôn sẵn") làm ngay. **Phần B** (giao diện) **làm khi có bản vẽ** Claude Design của chủ. **Phần A một mình KHÔNG phát hành được** (mục 1.3.5): tài khoản tài xế đăng nhập sẽ rơi vào trang `/tai-xe` chưa có tới khi Phần B xong.

**Mục tiêu:**
- Quản trị và Toàn quyền quản lý **xe** và **giấy tờ xe** trong phân hệ mới "Vận chuyển".
- Giấy tờ của **người** (CCCD, giấy phép lái xe, khám sức khoẻ, tập huấn nghiệp vụ) nằm ở hồ sơ người. Số luôn che. "Xem đủ số" có ô quyền riêng và ghi nhật ký không kèm số.
- Có **một danh sách giấy tờ sắp hết hạn** (xe + tài xế).
- **Tài xế công ty là nhân viên có tài khoản**: vai tài khoản nội bộ mới, quyền app mới `DRIVER`. Lượt 1a tài xế chỉ xem được giấy tờ của chính mình (số che).

**Kiến trúc (một đoạn):**
- **Ba migration chỉ-thêm:**
  - `0031_vai_quyen_tai_xe.sql`: mã quyền `DRIVER`, mã vai `DRIVER_INTERNAL`, ngưng gán mới mã vai hồ sơ cũ `DRIVER`;
  - `0032_giay_to_cua_nguoi.sql`: module `parties`, 3 bảng `pty_*`, 7 trigger;
  - `0033_van_chuyen_xe.sql`: module `van-chuyen`, 4 bảng `vc_*`, 8 trigger.
- **`parties`** thêm các route giấy tờ của người (có che số), route "xem đủ số", danh mục loại giấy tờ và hạng. `parties` công bố **đúng một hàm mới** cho Vận chuyển: `expiringDriverDocuments`. Hàm chỉ trả loại, hạng, hạn, tên hiển thị, **không số**.
- **Module mới `van-chuyen`** (STRICT, bảng `vc_`, view `vc`), phụ thuộc `parties` (hàm công bố `ownerCompany`, `expiringDriverDocuments`) và `audit` (`auditStatement`). Không module nào import nó.
- **Bản đồ quyền:**
  - thêm cột thứ tám `DRIVER` (CUỐI `row()`);
  - thêm 4 ô: `vehicle.manage`, `party.document.write`, `party.document.reveal`, `party.document.view`.
  - Danh mục dùng ô có sẵn `admin.manage`; ngưỡng "sắp hết hạn" dùng ô có sẵn `settings.ops`.
- **Trang đầu:** tài khoản chỉ có `DRIVER` đi thẳng `/tai-xe`, không bao giờ gọi `GET /api/orders/dashboard`.

**Công nghệ:** TypeScript, Cloudflare Worker + D1, `node --test` (Node 22 chạy `.ts` trực tiếp), `node:sqlite` cho test, khung `tests/audit/harness.mjs` (cả ứng dụng thật trên SQLite), e2e `tests/e2e/*`, kịch bản Chrome (CDP).

**Nguồn chuẩn tắc (không được đổi nội dung):**
- `docs/adr/ADR-0040-van-chuyen-luot-1a-xe-giay-to-tai-xe.md`: **accepted** 2026-09-28. Dòng trạng thái ở commit `9ead2e7` ghi thêm: chủ xác nhận ô "xem giấy tờ của chính mình" mở cho **mọi nhân viên**.
- ADR bổ sung: ADR-0002 (thêm module, tiền tố); ADR-0018 (thêm một vai nội bộ, một quyền app); ADR-0019 (cột và ô mới, máy chủ hỏi từ ngày đầu).
- ADR liên quan:
  - ADR-0013 (hồ sơ gắn tài khoản);
  - ADR-0024 điều 6 + ADR-0043 (`ownerCompany`);
  - ADR-0038 điều 6 (Quản trị giữ kinh doanh + nhân sự);
  - ADR-0014 điều 8 + ADR-0019 Q11 (luật cấp bậc).
- Hiến chương `docs/ARCHITECTURE.md` Phần I (đã duyệt). Kế hoạch **áp** các điều: 2.1, 2.2, 5.1, 5.2, 5.3, 5.5, 5.12 (siết theo 9.7: nhật ký không số giấy tờ), 5.13. **Không lệch có chủ ý điều nào.**
- Danh sách màn: `docs/superpowers/specs/2026-09-28-van-chuyen-1a-man-hinh-can-ve.md`.
- Tham khảo (không chuẩn tắc): `docs/superpowers/specs/2026-09-27-van-chuyen-design.md`; `docs/superpowers/specs/2026-09-27-van-chuyen-ra-soat.md` (phụ lục A/B/C); đề xuất `docs/superpowers/specs/2026-09-27-de-xuat-adr-0040-van-chuyen-luot-1a.md` (bản ADR thắng nếu lệch).
- **Không xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` rỗng (đo trên `9ead2e7`). Task A0 đo lại.

**Nhánh thi công:**
- Tạo worktree mới từ `main` **sau khi** `main` có ADR-0040 (nhánh `dac-ta-van-chuyen`) và kế hoạch này.
- Nếu chưa gộp thì tạo từ **đỉnh nhánh kế hoạch** (có sẵn cả hai). Tên gợi ý: `thi-cong-van-chuyen-1a`.
- Không thi công trên nhánh kế hoạch.

**Nhật ký thi công:** `docs/superpowers/plans/2026-09-28-van-chuyen-1a-thi-cong-nhat-ky.md` (khung đi kèm).
**Đề xuất sửa luật (chủ duyệt trước khi gộp):** `docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md` (đi kèm; người thi công bổ sung ở Task A22).

**Mốc đo lúc lập kế hoạch:**
- Nhánh kế hoạch `worktree-agent-ac0436b2bbf204613` @ `9ead2e7` = `main` `c276848` (bản 1.34) + ba commit tài liệu của `dac-ta-van-chuyen`. **Mã và migration giống hệt `c276848`.**
- Mọi `tệp:dòng` dưới đây đo trên mốc đó. Task A0 bước 8 đo lại.

---

## 0. Phán quyết của điều phối (Ruling) và một tiền đề phải sửa

Điều phối chuyển kết quả người kiểm độc lập ADR-0040 (ĐẠT CÓ ĐIỀU KIỆN) và câu trả lời của chủ (2026-09-28). Kế hoạch ghi mỗi điểm thành **Ruling của điều phối**; nhật ký thi công chép lại ở mục 4.

| Mã | Nội dung (điều phối) | Kế hoạch áp ở |
|---|---|---|
| **R1** | **Mã vai tài khoản KHÔNG dùng `DRIVER`.** `pty_role_type` đã có `('DRIVER', 'Tài xế', 6)` nhóm OTHER (`migrations/0011_parties.sql:76`), vẫn `active = 1` (0024 chỉ ngưng STAFF/SALES/GUIDE/AGENT — `migrations/0024_vai_quyen_mac_dinh.sql:10-11`). Dùng **`DRIVER_INTERNAL`**, nhãn **"Tài xế công ty"** (khuôn `GUIDE_INTERNAL`). **Ngưng dòng `DRIVER` cũ** (`active = 0`, khuôn 0024:10-11) để máy chặn gán mới thay cho kỷ luật. Trước đó, chủ chạy một truy vấn chỉ-đọc đếm hồ sơ đang giữ vai `DRIVER` trên production. **Mã quyền app `DRIVER`** (bảng `stf_permission_type`) giữ được — tiền lệ `INTERN` | 1.1, Task A2, A4, mục 9 bước 4 |
| **R2** | **Cột `DRIVER` không "tuyệt đối none".** Ngoại lệ: `feedback.submit = any`, `feedback.view = own` (ADR-0038), ô mới "xem giấy tờ của chính mình" (`own`); còn lại `none`. Có bài ghim cả hàng | 1.3, Task A2, A7 |
| **R3** | **Trang đầu riêng cho tài xế.** `homeRedirect` (`src/shared/start-page.ts:16-18`) và `web/home.ts:250-264` hôm nay sẽ gọi `/api/orders/dashboard` (cổng orders) → 403 cho tài khoản chỉ có `DRIVER`. Đưa `DRIVER` tới trang đầu riêng, không gọi dashboard đơn; có test khoá | 1.3.5, Task A3 |
| **R4** | **Route "xem giấy tờ của chính mình"**: cổng `"staff"`; thân route tự chặn Đối tác; chỉ trả giấy tờ của chính người gọi (số che) | 1.3.3, Task A7 |
| **R5** | Chủ trả lời (28/9): ô "xem giấy tờ của chính mình (số che)" mở cho **MỌI NHÂN VIÊN NỘI BỘ** (phương án A). Task liên quan **không** còn "phụ thuộc chủ". ADR-0040 ghi xác nhận ở dòng trạng thái (`9ead2e7`) | 1.3.2, Task A7 |

**Sửa một tiền đề của R1 (đo được, cần điều phối biết).** Câu "`active = 0` để máy chặn gán mới" **chưa đúng với mã hôm nay**:
- `active = 0` chỉ **ẩn** loại vai khỏi ô "Thêm công việc" của Danh bạ (`web/parties.ts:275` lọc `t.active && t.group === "OTHER"`).
- Máy chủ **không** hỏi `active` ở đâu cả, nên gọi thẳng API vẫn gán được:
  - `validateRole` chỉ kiểm khuôn mã (`src/modules/parties/rules.ts:239-249`);
  - `roleTypeGroup` chỉ đọc nhóm (`src/modules/parties/repository.ts:407`, `:434-436`);
  - câu `INSERT_ROLE` không điều kiện (`repository.ts:238-243`);
  - route `POST /api/parties/:id/roles` cũng không hỏi (`src/modules/parties/index.ts:350-405`).
- ⇒ Muốn có "hàng rào máy" thật, **Task A4** thêm lời kiểm ở route:
  - loại vai đang ngưng (`active = 0`) → **409 `role_type_inactive`**;
  - trừ đường đổi công ty chủ (`OWNER_COMPANY`, cũng gieo `active = 0` — Ruling T2 của T2b).
- **Hệ quả phải báo điều phối:** lời kiểm áp cho **mọi** loại vai đã ngưng, tức cả STAFF/SALES/GUIDE/AGENT, không riêng `DRIVER`.
  - Khớp ý đã duyệt của 0024: "ngưng dùng cho gán MỚI".
  - Nhưng nó đổi hành vi một route đang có. Giao diện vốn không cho chọn các loại đó, nên người dùng không thấy khác.
  - Điều phối muốn hẹp lại (chỉ `DRIVER`) thì đổi một điều kiện ở Task A4. Ghi ở mục 14.

---

## 1. Chín điểm đã chốt (mỗi điểm dẫn tệp:dòng)

### 1.1 Tên

**Mã vai và mã quyền:**

| Thứ | Chốt | Nguồn / lý do |
|---|---|---|
| Mã vai tài khoản nội bộ mới (dữ liệu ở `pty_role_type`) | **`DRIVER_INTERNAL`**, tên **"Tài xế công ty"**, nhóm `INTERNAL`, `sort_order` 17, `active` 1 | Ruling R1. Khuôn `GUIDE_INTERNAL` (`migrations/0024:15`). Số 17 đứng sau IT (16, `migrations/0028_vai_it.sql:4`). |
| Định nghĩa vai trong mã | `ROLES.DRIVER_INTERNAL = { name: "Tài xế công ty", group: "INTERNAL", defaults: ["DRIVER"], handles: "never", superAdminOnly: false }` | `src/shared/roles.ts:25-40`. "Vai này không nhận đơn" (ADR-0040 D3) ⇒ `handles: "never"`. Quản trị gán được như "Hướng dẫn viên nội bộ". |
| Vị trí trong `ROLE_CODES` | **Sau `"IT"`**, cuối nhóm nội bộ (`src/shared/roles.ts:7-10`) | Không xê dịch vị trí vai nội bộ nào đang có. Màn Quản lý tài khoản liệt kê theo thứ tự này (`web/role-picker.ts:50-59`). |
| Mã vai hồ sơ cũ `DRIVER` | **Giữ nguyên mã và tên "Tài xế"**, đặt `active = 0` (ngưng gán mới) | Ruling R1. ADR-0040 D3: "không gán mới; giữ để lượt 2 quyết". Dòng vai đang có của các hồ sơ **không đổi**. Nhãn mới "Tài xế công ty" khác chữ nên không còn trùng. |
| Mã quyền app mới | **`DRIVER`**, nhãn **"Tài xế"**, `sort_order` 8 | ADR-0040 D3 ghi đúng mã `DRIVER`; Ruling R1 cho giữ. Lý do ở dưới. |

**Vì sao giữ mã quyền `DRIVER` dù trùng chữ với mã vai hồ sơ cũ:**
- Hai mã nằm ở **hai bảng khác nhau**: `stf_permission_type.code` và `pty_role_type.code`. Mã nguồn tách hai không gian này: `isPermissionCode` và `isRoleCode` không lẫn nhau.
- `DRIVER` cũ nhóm OTHER **không nằm trong `ROLE_CODES`**, nên không bao giờ sinh quyền. `src/roles-schema.test.ts:22-23` khoá điều đó.
- Tiền lệ `INTERN` vừa là mã vai vừa là mã quyền (`docs/CHANGE-GUIDE.md` công thức u).
- Vai trò hồ sơ không bao giờ là điều kiện cho phép (R-N1-12, `src/architecture.test.ts:419`), nên trùng chữ không mở được quyền nào.
- **Bẫy ghi vào đề xuất luật** (mục 5 của tệp đề xuất): đọc chữ `DRIVER` phải xem nó nằm ở bảng nào.

**Bảng và cột:**

| Bảng (module) | Loại ở sổ dữ liệu | Cột (ngoài `created_at` / `created_by` / `updated_at` / `updated_by`) |
|---|---|---|
| `pty_person_document_type` (parties) | `table` (sửa được trong app) | `code` TEXT PK (chữ HOA 2–30), `name` (1–100), `has_expiry` 0/1, `sort_order`, `active` 0/1 |
| `pty_license_class` (parties) | `table` | `code` TEXT PK (chữ HOA 1–20), `name` (1–60), `sort_order`, `active` |
| `pty_person_document` (parties) | `table` | `id`, `party_id` → **`pty_person(party_id)`** (chỉ hồ sơ cá nhân), `document_type_code`, `document_number` (1–40, NULL được trừ CCCD/GPLX), `number_key` (số đã chuẩn hoá: chữ HOA, bỏ khoảng trắng `.` `-` `/`), `license_class_code` (chỉ và bắt buộc với GPLX), `issued_date`, `issued_place` (≤ 200), `expiry_date` (NULL = không hạn), `previous_id` (dòng này gia hạn dòng nào), `voided_at` (huỷ dòng nhập nhầm) |
| `vc_vehicle_document_type` (van-chuyen) | `table` | như `pty_person_document_type` |
| `vc_vehicle` (van-chuyen) | `table` | `id`, `plate_number` + `plate_key` (biển số và bản chuẩn hoá), `chassis_number` + `chassis_key` (số khung), `name` (tên xe), `model_year` (đời xe, NULL được), `passenger_capacity` (số người được chở KHÔNG kể tài xế, 1–100), `owner_party_id` → `pty_party(id)`, `status` ∈ {`active`, `maintenance`, `retired`}, `valid_from_date`, `valid_to_date` |
| `vc_vehicle_document` (van-chuyen) | `table` | `id`, `vehicle_id`, `document_type_code`, `document_number` (NULL được, ≤ 60), `issued_date`, `expiry_date`, `previous_id`, `voided_at` |
| `vc_expiry_policy` (van-chuyen) | `table` (chỉ-thêm) | `id`, `warn_days` (1–365), `valid_from_at` (UTC, duy nhất) |

Khuôn `loc_location` (`migrations/0010_locations.sql:13-25`, ADR-0040 D1 định nghĩa là "dấu vết, `active`, khoá lạc quan, nhật ký cùng lô") áp cho ba bảng danh mục như sau:
- cột dấu vết đủ bốn;
- `active` thay cho xoá;
- sửa có khoá lạc quan `WHERE … AND updated_at = ?`;
- nhật ký cùng lô `db.batch()` với `changes() > 0`.

**Khác `loc_location` một chỗ: khoá chính là `code`** (như `pty_role_type`, `loc_location_type`, `pty_contact_kind`), không có `id` UUID riêng. Lý do:
- `CHECK` của bảng giấy tờ nhắc thẳng mã cố định `'CCCD'`, `'GPLX'` mà không cần truy vấn con (CHECK không được có truy vấn con).
- Dữ liệu gieo đọc được, giống nhau ở mọi môi trường, không cần sinh UUID.
- `src/architecture.test.ts:222-245` chỉ ép "bảng tra cứu khoá `code`" với `kind: "lookup"`. Bảng `kind: "table"` có khoá `code` vẫn qua, miễn có đủ cột dấu vết.

**Mã cố định trong mã nguồn** (đổi bằng ADR, không sửa trong app — Hiến chương 2.2):
- loại giấy tờ người **`CCCD`** (trigger "một người") và **`GPLX`** (cột hạng);
- trạng thái xe `active` / `maintenance` / `retired` (`CHECK` đóng — ADR-0040 D1).
- Hai mã loại cố định **không ngưng được** trong app (Task A10 trả 409 `fixed_type`).

**Ô quyền mới** (`src/shared/permissions.ts`; giá trị ở mục 1.3):
- `vehicle.manage`: quản lý xe, giấy tờ xe, xem danh sách sắp hết hạn;
- `party.document.write`: ghi giấy tờ của người + xem danh sách giấy tờ của người khác, số che;
- `party.document.reveal`: xem đủ số;
- `party.document.view`: xem giấy tờ của chính mình, số che.

**Hành động nhật ký mới** (`src/shared/audit-actions.ts`; nhãn không trùng nhãn khác):

| Mã | Nhãn | Nhóm |
|---|---|---|
| `party_document_added` | Thêm giấy tờ của người | `party` |
| `party_document_renewed` | Gia hạn giấy tờ của người | `party` |
| `party_document_corrected` | Sửa sai giấy tờ của người | `party` |
| `party_document_number_viewed` | Xem đủ số giấy tờ | `party` |
| `party_document_catalog_changed` | Sửa danh mục giấy tờ của người | `party` |
| `vehicle_created` | Thêm xe | **`vehicle`** (nhóm mới "Xe") |
| `vehicle_updated` | Sửa xe | `vehicle` |
| `vehicle_document_added` | Thêm giấy tờ xe | `vehicle` |
| `vehicle_document_renewed` | Gia hạn giấy tờ xe | `vehicle` |
| `vehicle_document_corrected` | Sửa sai giấy tờ xe | `vehicle` |
| `vehicle_document_type_changed` | Sửa danh mục loại giấy tờ xe | `vehicle` |
| `expiry_policy_changed` | Đổi mốc nhắc giấy tờ sắp hết hạn | `vehicle` |

- Nhóm `vehicle` **không có** `LEFT JOIN` nhãn trong `listAll` (`src/modules/audit/repository.ts:85-107`). Lý do: `audit` không được đọc `vc_*` — thêm cạnh `audit → van-chuyen` sẽ thành vòng với `van-chuyen → audit`.
- Vì vậy `detail` luôn mở đầu bằng biển số (`xe 79B-012.34: …`). Biển số là định danh của xe, không phải "số giấy tờ".

**Route mới — 24 route** (đường dẫn theo module chủ, CHANGE-GUIDE công thức b):

| # | Route | `access` | Lời hỏi `can()` trong thân | Task |
|---|---|---|---|---|
| 1 | `GET /api/parties/documents/mine` | `staff` | `party.document.view` `{ ownerId: staff.id }` | A7 |
| 2 | `GET /api/parties/documents/meta` | `office` | `party.document.write` hoặc `admin.manage` | A7 |
| 3 | `GET /api/parties/:id/documents` | `office` | `party.document.write` | A7 |
| 4 | `POST /api/parties/:id/documents` | `office` | `party.document.write` (+ cấp bậc — Q1) | A8 |
| 5 | `POST /api/parties/:id/documents/:did/renew` | `office` | như trên | A8 |
| 6 | `POST /api/parties/:id/documents/:did/correct` | `office` | như trên | A8 |
| 7 | `POST /api/parties/:id/documents/:did/reveal` | `office` | `party.document.reveal` (+ cấp bậc — Q1) | A9 |
| 8 | `POST /api/parties/document-types` | `admin` | `admin.manage` | A10 |
| 9 | `PUT /api/parties/document-types/:code` | `admin` | `admin.manage` | A10 |
| 10 | `POST /api/parties/license-classes` | `admin` | `admin.manage` | A10 |
| 11 | `PUT /api/parties/license-classes/:code` | `admin` | `admin.manage` | A10 |
| 12 | `GET /api/van-chuyen/xe` | `office` | `vehicle.manage` | A13 |
| 13 | `POST /api/van-chuyen/xe` | `office` | `vehicle.manage` | A13 |
| 14 | `GET /api/van-chuyen/xe/:id` | `office` | `vehicle.manage` | A13 |
| 15 | `PUT /api/van-chuyen/xe/:id` | `office` | `vehicle.manage` | A13 |
| 16 | `POST /api/van-chuyen/xe/:id/giay-to` | `office` | `vehicle.manage` | A14 |
| 17 | `POST /api/van-chuyen/xe/:id/giay-to/:did/gia-han` | `office` | `vehicle.manage` | A14 |
| 18 | `POST /api/van-chuyen/xe/:id/giay-to/:did/sua-sai` | `office` | `vehicle.manage` | A14 |
| 19 | `GET /api/van-chuyen/meta` | `office` | `vehicle.manage` hoặc `admin.manage` | A15 |
| 20 | `POST /api/van-chuyen/loai-giay-to-xe` | `admin` | `admin.manage` | A15 |
| 21 | `PUT /api/van-chuyen/loai-giay-to-xe/:code` | `admin` | `admin.manage` | A15 |
| 22 | `POST /api/van-chuyen/nguong-het-han` | `admin` | `settings.ops` | A15 |
| 23 | `GET /api/van-chuyen/sap-het-han` | `office` | `vehicle.manage` | A15 |
| 24 | (trang, không phải route) `/danh-muc-giay-to` | — | giao diện ẩn/hiện theo `admin.manage` | A19 |

(23 route API + 1 trang.)

**Ghi chú về route:**
- **Thứ tự khai khớp đường dẫn:**
  - `/api/parties/documents/mine` và `/api/parties/documents/meta` có đoạn cuối khác `documents`, nên không bị `/api/parties/:id/documents` bắt nhầm.
  - Vẫn **khai hai route đó TRƯỚC** các route `:id` (thói quen của tệp, `index.ts:207`).
- **Đường dẫn:**
  - `parties` dùng chữ Anh như route cũ của nó;
  - `van-chuyen` dùng chữ Việt không dấu như `thong-bao`, `bang-tin`.

### 1.2 Cạnh module — NỚI hàng rào, chờ chủ duyệt

**Chốt:** thêm module `van-chuyen` với cạnh `van-chuyen → parties` và `van-chuyen → audit`. Không thêm cạnh nào khác. Không module nào import `van-chuyen`.
- **`van-chuyen → parties`**, qua `parties/index.ts`:
  - `ownerCompany` (chủ xe = công ty chủ lúc thêm xe — ADR-0040 D1, `src/modules/parties/index.ts:63-68`);
  - hàm mới `expiringDriverDocuments` (danh sách sắp hết hạn — ADR-0040 D1).
- **Khoá ngoại** `vc_vehicle.owner_party_id → pty_party(id)`: cạnh này đi đúng chiều. `src/architecture.test.ts:191-210` chấp nhận khi `ALLOWED_EDGES["van-chuyen"]` có `"parties"`.
- **`van-chuyen → audit`**: `auditStatement`.

**Bốn thay đổi ở `src/architecture.test.ts`:**
- `ALLOWED_EDGES["van-chuyen"] = ["parties", "audit"]` (dòng 19-44) — **nới**;
- `STRICT` thêm `{ module: "van-chuyen", file: "modules/van-chuyen/repository.ts" }` (dòng 47-57) — **siết**;
- `TABLE_PREFIX` thêm `vc_: "van-chuyen"` (dòng 73) — **nới**;
- `VIEW_PREFIX` thêm `vc: "van-chuyen"` (dòng 74) — **nới**. Lượt 1a chưa có view nào, nhưng ADR-0040 D1 chốt tiền tố view `vc`.

Ba thay đổi "nới" làm theo tiền lệ T2b:
- ghi chú thích "NỚI hàng rào đã duyệt (Điều 9.4) — CHỜ CHỦ DUYỆT ở `docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md` trước khi gộp";
- mục 1 của tệp đề xuất luật có diff và cột "nếu chủ không duyệt".

ADR-0040 D1 đã có chữ cạnh và tiền tố, nhưng **sửa test không tự thành được phép** (N9, Điều 9.4 — tiền lệ `docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md` mục 1).

**Chứng minh không tạo vòng** (đồ thị ở `src/architecture.test.ts:19-44`):
1. `parties → {locations, audit}`, `locations → {audit}`, `audit → {}`. Tập tới được từ `parties` = {`locations`, `audit`}. Tập tới được từ `audit` = ∅.
2. `van-chuyen` là nút mới, chỉ có cạnh ra. Không cạnh nào trỏ **vào** nó ⇒ không khép được vòng nào.
3. Thứ tự tô-pô hợp lệ: `audit, locations, parties, …, van-chuyen`.
4. Máy kiểm: test "đồ thị phụ thuộc module không có vòng" (`src/architecture.test.ts:124-134`), chạy ở Task A12, A13.

**Không cần cạnh `van-chuyen → staff`.** Danh sách sắp hết hạn nhận biết "người lái" bằng **vai tài khoản `DRIVER_INTERNAL` đang mở**. Câu tra nằm **trong `parties`**, đúng luật R-N1-12 (chỉ `parties` nhắc bảng vai). Không dựa vào quyền `DRIVER` của module `staff`: `parties` nằm dưới `staff` nên không đọc được `staff`. Đây là **lọc báo cáo**, không phải điều kiện cho phép (mục 14 điểm 3: người kiểm độc lập phán).

### 1.3 Bản đồ quyền

#### 1.3.1 Cột mới `DRIVER` — thêm CUỐI `row()`

`row()` hôm nay có 7 tham số (`src/shared/permissions.ts:28-30`). Thêm tham số thứ tám `DRIVER`, **cuối cùng**, để thứ tự các cột cũ không đổi (ADR-0040 D3; tiền lệ INTERN).

Mọi hàng cũ nhận `"none"` ở cột mới, **trừ hai hàng** (Ruling R2):
- `"feedback.submit"` (dòng 76) → `"any"`;
- `"feedback.view"` (dòng 77) → `"own"`.

#### 1.3.2 Bốn ô mới

Cột theo thứ tự: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER.

| Ô | Giá trị `row(...)` | Nguồn | Máy chủ hỏi ở |
|---|---|---|---|
| `party.document.view` | `own, own, own, own, none, any, own, own` | ADR-0040 D2 + R5 (mọi nhân viên nội bộ; Đối tác không). `SUPER_ADMIN = any` vì bất biến "Toàn quyền any ở MỌI ô" (ADR-0014 điều 2, `src/shared/permissions.test.ts:54-57`) | route 1 |
| `party.document.write` | `none, none, any, none, none, any, none, none` | ADR-0040 D2 "Quản trị + Toàn quyền" | route 3–6 |
| `party.document.reveal` | `none, none, any, none, none, any, none, none` | ADR-0040 D2 | route 7 |
| `vehicle.manage` | `none, none, any, none, none, any, none, none` | ADR-0040 D1 "Quản trị + Toàn quyền (việc kinh doanh, ADR-0038 điều 6)" | route 12–18, 23 |

- **`party.view` / `party.write` không mở giấy tờ** (ADR-0040 trang ghép). Bán hàng, Kế toán vào được Danh bạ nhưng **không** thấy giấy tờ của người khác.
- **Người GHI giấy tờ xem được danh sách giấy tờ (số che) của người khác** (route 3 hỏi `party.document.write`). Người ghi phải thấy cái mình ghi. ADR không có ô "xem giấy tờ người khác" riêng, nên kế hoạch không thêm ô ngoài ADR.
- **Danh mục** (loại giấy tờ xe, loại giấy tờ người, hạng GPLX): ô có sẵn **`admin.manage`** (ADR-0040 D2 "Quản trị sửa"; thiết kế §6).
- **Ngưỡng "sắp hết hạn"**: ô có sẵn **`settings.ops`** (chỉ Toàn quyền, ADR-0040 D1). Cả hai ô đã nằm trong `ADMIN_OPS` của hàng rào 4 (`src/route-write-guard.test.ts:100`), nên **không** thêm ô nào vào `ADMIN_OPS` (thêm = nới).

#### 1.3.3 Hàng `DRIVER` sau cùng (bài ghim cả hàng — Task A2, cập nhật ở A7, A9, A13)

- Mọi ô `none`, **trừ**: `feedback.submit: any`, `feedback.view: own`, `party.document.view: own`.
- **Ghim bằng một bài liệt kê TỪNG ô** (không suy từ MATRIX), như bài ghim hàng Đối tác `src/modules/orders/xem-don-theo-quyen.test.ts:275-288`.
- Thêm ô mới mà quên cột `DRIVER` ⇒ bài đỏ, buộc người thêm quyết định.

#### 1.3.4 Cổng — `DRIVER` không vào cổng nào

- `ADMIN_GATE`, `OFFICE_GATE`, `ORDERS_GATE` (`src/shared/permissions.ts:142-152`) **không đổi**, không có `DRIVER`.
- Bài mới ở `src/shared/cong-quyen.test.ts`: tài khoản chỉ có `DRIVER` ⇒ `passesAdminGate`, `isOffice`, `canAccessOrders` đều `false`.
- Bài cổng toàn tuyến (Task A18): tài khoản chỉ `DRIVER` gọi mọi route `office`/`orders`/`admin` thật ⇒ 403.

**Hệ quả đếm được khi thêm mã thứ tám** (Task A2 sửa trong cùng commit, không phải đổi luật):
- Các bài duyệt "128 tập con quyền" thành **256**: `src/shared/permissions.test.ts:243-255`, `src/shared/handler-view.test.ts:127-141`, `src/shared/bang-tin.test.ts:33-35`.
- **`seesOnlyAssignedOrders`**: ảnh chụp "hôm nay CHỈ tập {FIELD}" (`permissions.test.ts:251`) thành **{FIELD} và {FIELD, DRIVER}**.
  - Tài khoản Hướng dẫn viên kiêm Tài xế vẫn chỉ xem đơn mình phụ trách.
  - Đúng định nghĩa, vì ô `order.view` của `DRIVER` là `none`.
- **`cong-quyen`**: tập "đổi có chủ đích" `DOI_CO_CHU_Y_CANH_CUA_DON` (`cong-quyen.test.ts:50`) thêm `"FIELD+DRIVER"`.
  - Tổ hợp này qua cổng orders **nhờ FIELD** (ADR-0030 S23-5 đã duyệt), `DRIVER` không thêm gì.
  - Danh sách cổng không đổi.

#### 1.3.5 Trang đầu của `DRIVER` (Ruling R3)

`homeRedirect` (`src/shared/start-page.ts:16-18`) thêm nhánh:
- không xem mọi đơn, không qua cổng orders, **có quyền `DRIVER`** ⇒ trả **`"/tai-xe"`** (hằng `TRANG_DAU_TAI_XE`).

Vì sao đủ để **không bao giờ gọi dashboard đơn**:
- `web/home.ts:255-258` gọi `homeRedirect(staff)` rồi `location.replace(redirect)`, `return` **TRƯỚC** lời gọi `taiDashboard(staff)` (dòng 264).
- `web/home.ts` không phải sửa.

Các tổ hợp khác không đổi:
- `DRIVER` + văn phòng → ở lại Trang chủ;
- `DRIVER` + FIELD / Đối tác / Thực tập → `"/orders"` như cũ.
- Bài duyệt đủ 256 tập con ở Task A3 khoá "mọi tập **không có** `DRIVER` cho kết quả y hệt công thức cũ".

Còn một cạnh (đã có với tài khoản Đối tác):
- `web/home.ts:243` **gọi sớm** dashboard khi **bản nhớ khung của máy** nói lần trước máy thuộc người xem mọi đơn.
- Tài xế đăng nhập trên máy dùng chung với văn phòng có thể gây **một** lời gọi 403 bị bỏ qua (chú thích dòng 239-242). Không lộ dữ liệu, không hiện lỗi.

**Trang `/tai-xe` là màn số 7 của danh sách màn — Phần B, chờ bản vẽ.** Vì vậy Phần A một mình không phát hành được.

### 1.4 Che số, "xem đủ số", nhật ký không số

- **Mọi DTO mặc định chỉ có số đã che** `maskedNumber`, hằng khuôn `••••` + 4 ký tự cuối của `number_key`.
  - Số ngắn hơn 8 ký tự thì chỉ `••••`, vì 4 ký tự cuối đã gần là cả số.
  - Áp cho **mọi** loại giấy tờ của người, không riêng CCCD/GPLX. Siết hơn ADR, là giả định G3.
  - Giấy tờ **xe** hiện đủ số, vì không phải dữ liệu cá nhân (ADR-0040 D2 chỉ nói giấy tờ của người). Là giả định G4.
- **Số đầy đủ chỉ rời máy chủ ở MỘT route**: `POST /api/parties/:id/documents/:did/reveal`.
  - Route hỏi `party.document.reveal` + luật cấp bậc (Q1).
  - Ghi dòng nhật ký `party_document_number_viewed` với `detail` = tên loại giấy tờ, **không số**.
  - Ghi nhật ký **trước** rồi mới trả số: ghi lỗi thì không trả số.
  - Là POST (không GET) vì có ghi, và để router chặn gọi chéo trang (`src/shared/router.ts:129`).
- **Nhật ký không chứa số giấy tờ, nơi cấp, tên kèm năm sinh.**
  - Hàm dựng `detail` của giấy tờ **không nhận** tham số số hay nơi cấp: chữ ký hàm chặn ngay từ kiểu.
  - `detail` chỉ gồm tên loại, hạng, ngày cấp/hết hạn, lý do sửa sai. Riêng sửa sai số / nơi cấp thì chỉ ghi "Nhập sai số" / "Nhập sai nơi cấp", không giá trị.
- **Hàng rào đo được** (Task A16, A17):
  1. **Bài toàn tuyến:**
     - chạy MỌI route có `/documents` hoặc `/giay-to` trong đường dẫn (danh sách lấy từ mã thật bằng esbuild, như `src/route-access.test.ts:32-43`) với số và nơi cấp đánh dấu;
     - rồi quét toàn bộ `audit_log` và thân trả về của các route đọc, kể cả `GET /api/audit` của Toàn quyền;
     - số đầy đủ chỉ được xuất hiện trong thân trả về của `reveal`.
  2. **Kiểm dữ liệu `R-PTY-4`** (mức `warn-unless-strict`): `audit_log.detail` không chứa `number_key` nào dài ≥ 8.
     - e2e chạy `--strict` nên đỏ;
     - production chỉ cảnh báo: nhật ký chỉ-thêm, lỡ ghi thì không gỡ được, mà đỏ vĩnh viễn thì chặn mọi lần triển khai sau.

### 1.5 Trigger và bất biến sát dữ liệu (đã thử trên SQLite nháp)

Đã dựng nháp ba migration (mục 6, Task A2/A5/A12) trên schema của mọi `migrations/*.sql` tại `9ead2e7` bằng `node:sqlite`, rồi chạy **51 ca, 51 đạt**. Một bài thử riêng xác nhận 7 bảng mới qua luật "bảng mới" của `src/architecture.test.ts:209-233`:
- đủ cột dấu vết;
- cột WHO không khoá ngoại;
- `NO ACTION`;
- khoá ngoại trỏ khoá chính;
- không trigger tên `staff_`/`stf_`.

**Giới hạn:** nháp chứng minh ngữ nghĩa SQLite, **chưa** chứng minh D1 đọc được tệp. D1 chỉ được chứng minh ở `npm run db:migrate:local` và e2e (Task A5, A12).

| Bất biến | Lớp CSDL | Lớp mã | Ca đã thử (thông báo SQLite) |
|---|---|---|---|
| Một số CCCD thuộc đúng một người (ADR-0040 D2; khuôn `pty_party_role_group_conflict_ins`, `migrations/0024:33-39`) | trigger `pty_person_document_cccd_one_person_ins` + `_upd` (UPDATE OF `number_key`); dòng đã huỷ không tính | route 4–6: 409 `cccd_taken`, câu báo không nhắc số | người khác cùng số → `person_document_cccd_other_person`; chính người đó gia hạn cùng số → qua; sửa sai số thành số người khác → chặn; huỷ dòng nhầm → số rảnh, người đúng nhận được |
| Không sửa đè giấy tờ đã có dòng gia hạn (ADR-0040 D1, D2) | trigger `…_superseded` (có dòng nối tiếp CHƯA huỷ ⇒ cấm UPDATE) | route 5, 6: chỉ dòng hiện hành | sửa đè → `person_document_superseded` / `vehicle_document_superseded` |
| Một dòng chỉ có tối đa MỘT dòng gia hạn còn hiệu lực (không tách nhánh) | chỉ mục `…_next_uq` trên `previous_id` WHERE `previous_id IS NOT NULL AND voided_at IS NULL` | route 5 | gia hạn lần hai → `UNIQUE constraint failed: pty_person_document.previous_id` |
| Dòng gia hạn nối đúng người/xe, đúng loại, dòng trước chưa huỷ | trigger `…_renew_ins` | route 5 | nối sang loại khác / người khác / dòng đã huỷ → `…_renew_mismatch` |
| Không xoá (Hiến chương 5.5) | trigger `…_no_delete` trên `pty_person_document`, `vc_vehicle_document`, `vc_vehicle`; `vc_expiry_policy_no_delete` | R-N1-9 (không câu `DELETE` nào đăng ký — `src/architecture.test.ts:285,293`) | `DELETE` → `…_no_delete` |
| Dòng đã huỷ không sửa được; không đổi chủ (người/xe), loại, dòng trước, mốc tạo | trigger `…_voided`, `…_identity` | route 6 | → `…_voided`, `…_identity` |
| Biển số duy nhất trong xe **chưa ngừng** (ADR-0040 D1: xe bảo dưỡng vẫn giữ biển) | chỉ mục duy nhất một phần `vc_vehicle_plate_open_uq` ON (`plate_key`) WHERE `status <> 'retired'` | route 13, 15: 409 `plate_taken` | trùng → `UNIQUE constraint failed: vc_vehicle.plate_key`; ngừng xe cũ → xe mới dùng lại biển; dùng lại xe cũ khi biển đã có chủ → chặn |
| Số khung duy nhất (định danh bền) | chỉ mục `vc_vehicle_chassis_uq` WHERE `chassis_key IS NOT NULL` | route 13, 15: 409 `chassis_taken`; **bắt buộc ở mã** (Q2) | → `UNIQUE constraint failed: vc_vehicle.chassis_key` |
| Xe ngừng ⇔ có ngày ngừng; trạng thái là tập đóng | `CHECK ((status = 'retired') = (valid_to_date IS NOT NULL))`, `CHECK (status IN (…))` | route 15 tự đặt ngày | thiếu ngày → `CHECK constraint failed` |
| GPLX ⇔ có hạng; CCCD/GPLX phải có số; giấy tờ chỉ cho hồ sơ CÁ NHÂN | `CHECK`; khoá ngoại tới `pty_person(party_id)` | route 4 | → `CHECK` / `FOREIGN KEY` |
| Chính sách ngưỡng chỉ-thêm, có ngày hiệu lực (Hiến chương 5.2) | trigger `vc_expiry_policy_no_update` + `_no_delete`; `valid_from_at` duy nhất | route 22 luôn chèn dòng mới, hiệu lực ngay | sửa / xoá → `expiry_policy_append_only` |

- **Trigger chỉ đọc bảng của chính module mình** (Hiến chương 5.3).
- **Tên trigger bắt đầu bằng `pty_` / `vc_`**, không `staff_` / `stf_`: `src/migrations-n1.test.ts:246` coi các tên đó là trigger siết B5.
- **Mỗi trigger một câu `RAISE`** (khuôn mọi migration hiện có). Không gộp nhiều câu vào một thân trigger, để mỗi hàng rào có một phép đột biến riêng.
- **"Hiện hành"** = chưa huỷ và không có dòng nối tiếp CHƯA huỷ. Huỷ một dòng gia hạn nhập nhầm thì dòng trước **sống lại**: gia hạn lại được, sửa sai được.

### 1.6 Danh mục gieo — bằng migration, không dữ liệu cá nhân

Gieo `created_at` / `updated_at` = `'2026-09-28T00:00:00.000Z'`, người tạo NULL (hệ thống), cùng giá trị ở mọi môi trường (tiền lệ `migrations/0010:28-36`).

**Loại giấy tờ xe** `vc_vehicle_document_type` (ADR-0040 D1, "sửa được trong app"):

| Mã | Tên | `has_expiry` |
|---|---|---|
| `REGISTRATION` | Đăng ký xe | 0 |
| `INSPECTION` | Kiểm định | 1 |
| `TPL_INSURANCE` | Bảo hiểm trách nhiệm dân sự | 1 |
| `CONTRACT_BADGE` | Phù hiệu xe hợp đồng | 1 |
| `TRIP_MONITOR` | Giám sát hành trình | 1 |
| `DRIVER_CAMERA` | Camera người lái | 1 |

**Loại giấy tờ của người** `pty_person_document_type` (ADR-0040 D2):

| Mã | Tên | `has_expiry` |
|---|---|---|
| `CCCD` | Căn cước công dân (CCCD) | 1 |
| `GPLX` | Giấy phép lái xe | 1 |
| `HEALTH_CHECK` | Khám sức khoẻ | 1 |
| `TRANSPORT_TRAINING` | Tập huấn nghiệp vụ vận tải | 1 |

**Hạng GPLX** `pty_license_class` (ADR-0040 D2: "B, D1, D2, D và hạng cũ B2, C, D, E"):
- Mã `B`, `D1`, `D2`, `D`, `B2_OLD`, `C_OLD`, `D_OLD`, `E_OLD`.
- Tên "Hạng B" … "Hạng E (mẫu cũ)".
- Hạng mới `D` và hạng cũ `D` khác nghĩa (không giới hạn / 29 khách — thiết kế §10), nên mã hạng cũ có đuôi `_OLD`.
- **Nghĩa của hạng không ở đây** (ADR-0040 D2: luật của Vận chuyển, lượt 1b).

**Nghĩa của `has_expiry`:**
- `0` ⇒ giấy tờ loại này **không được** có ngày hết hạn;
- `1` ⇒ **được** có. Để trống = "không hạn" (ADR-0040 D1: "rỗng = không hạn"; ví dụ CCCD của người trên 60 tuổi).
- Giấy "có hạn" để trống ngày hết hạn thì **không** lên danh sách sắp hết hạn. Đây là giả định G6.

**Chính sách ngưỡng** `vc_expiry_policy`:
- một dòng `warn_days = 30`, `valid_from_at = '2026-09-01T00:00:00.000Z'` (ADR-0040 D1: mặc định 30 ngày);
- `id` cố định, sinh **một lần** bằng `node -e 'console.log(crypto.randomUUID())'` lúc thi công (tiền lệ 0010).

**Bài quét trong test migration:** tệp không chứa dãy số dài giống SĐT/số giấy tờ, không `@` (luật `migrations/0020:3`, `0024:4` "không gieo SĐT/tên thật").

### 1.7 Số migration và số bản

**Quét mọi nhánh lúc lập kế hoạch (2026-09-28):**
- `git for-each-ref --format='%(refname:short)' refs/heads` ra **40 nhánh local**. `refs/remotes` có `origin/main`, `origin/kiem-toan-doi-tac`, `origin/worktree-hang-rao-quyen`.
- Rồi `git ls-tree --name-only <nhánh> migrations/ | tail -1` cho **từng** nhánh.

| Số lớn nhất ≥ 0019 | Nhánh |
|---|---|
| **0030** (`0030_ho_so_cong_ty_chu.sql`) | `main`, `origin/main`, `dac-ta-van-chuyen`, `worktree-agent-ac0436b2bbf204613` (nhánh kế hoạch này), `worktree-agent-adbf65d3e8d68a3f9` |
| 0028 | `thi-cong-tu-choi-huy-hdv` |
| 0026 | `worktree-agent-aa7d23379c3035075` |
| 0024 | 21 nhánh (`a0-danh-muc-cho-lap-don`, `bang-tin`, `be-mat-tao-don`, `claude/tourdao-sales-audit-62ea81`, `dac-ta-don-tu-do-hdv`, `danh-muc-lap-don`, `gd2-cong-va-bang`, `ghi-trang-thai-1-16`, `ghi-trang-thai-1-18`, `hien-chuong-kien-truc`, `ke-hoach-gd2`, `ke-hoach-tu-choi-huy-hdv`, `mot-ngay-ca-don`, `ra-soat-luat-goc`, `sua-e2e-chot-chan-sheet`, `sua-trang-thai-hien-chuong`, `thong-bao-tuc-thi`, `trang-thai-1-12`, `va-lo-ho-so-1-9`, `worktree-agent-a9441c370e4ac49ff`, `worktree-doi-ten-khai-niem`) |
| 0023 | `dang-nhap-sat-day-cho-gop`, `dot-e-the-don-gon-va-bieu-tuong`, `gop-trang-chu-moi`, `ke-hoach-gd1-adr-0013`, `quyet-dinh-24-9-va-ba-luat`, `sua-huong-dan-truy-van-chi-doc`, `va-lo-ho-so-gd1`, `worktree-hang-rao-quyen` |
| 0022 | `kiem-toan-doi-tac`, `worktree-kiem-tra-giao-dien`, `worktree-trang-chu-moi` |
| 0018 | `canh-bao-don-trung`, `kiem-toan-ontology` |

**Kết luận:**
- Không nhánh nào có `0029` hay `≥ 0031`.
- `0029` **đang giữ** cho Thông báo đính kèm (ADR-0041, `docs/adr/README.md` mục "Số migration đã giữ chỗ"); nhánh thi công của nó chưa tồn tại.
- `0019` giữ cho B5.
- ⇒ Vận chuyển 1a lấy **`0031_vai_quyen_tai_xe.sql`, `0032_giay_to_cua_nguoi.sql`, `0033_van_chuyen_xe.sql`**.
- Tên không chứa `staff_party_required` (`src/migrations-n1.test.ts:235`).
- Test tìm tệp theo **đuôi tên** (CHANGE-GUIDE công thức d), đổi số chỉ phải đổi tên tệp.
- Task A0 bước 4 quét lại. Có nhánh đã lấy số thì lấy số trống kế tiếp, sửa kế hoạch + nhật ký, báo điều phối.

**Số bản nhật ký thay đổi:**
- Production đang **1.34** (`src/shared/changelog.ts:16`).
- **Đặt tạm 1.35**; **chốt số trống kế tiếp LÚC GỘP** (Task K1). Có nhánh khác lên trước thì lấy số sau đó.

### 1.8 Tiêu chí nghiệm thu, việc lớn

- Tiêu chí viết bằng hành vi kiểm được: mục 3.
- **Việc lớn** ⇒ **người kiểm độc lập chỉ-đọc ở cuối** (Task K2, bắt buộc, sau Phần B).
- Kế hoạch khuyến nghị thêm một lần kiểm độc lập **giữa chừng** khi xong Phần A (Task A24): Phần B có thể chờ bản vẽ lâu, không nên dựng giao diện trên một nền dữ liệu/quyền chưa ai kiểm. Điều phối quyết có làm A24 hay không.

### 1.9 Câu hỏi cho chủ

Mục 12. Có **hai** câu vượt khung ADR-0040, đều **không chặn** task nào (có mặc định).

---

## 2. Ràng buộc chung

**Ngôn ngữ và giao diện**
- Giao diện, thông báo lỗi, tài liệu, commit: **tiếng Việt có dấu**. Không lộ mã thô (`DRIVER`, `vc_vehicle`, `retired`) ra người dùng; mã lỗi máy chỉ nằm ở trường `code`.
- Không `innerHTML`; dựng DOM bằng `h()` (`web/CLAUDE.md`).

**Ranh giới module**
- Module chỉ import module khác qua `index.ts`. Chỉ `parties` nhắc tên bảng vai hồ sơ (R-N1-12).
- `src/shared/` không import `src/modules/`.
- SQL của `parties` và `van-chuyen` đi qua `defineSql`, câu tĩnh, tham số `?N`, **chỉ trong `repository.ts`**. Bài EXPLAIN (`src/architecture.test.ts:331`) chỉ nạp tệp ghi ở `STRICT`.
- **Route chỉ khai trong `index.ts`** của module: hàng rào 2 và bài `route-access` chỉ đọc tệp đó (`src/route-write-guard.test.ts` chú thích đầu tệp). Luật thuần được tách tệp riêng trong module.

**Kiểm quyền**
- `if (!can(staff, "<ô>")) return …` viết **thẳng** trong thân handler, trước khi đọc thân yêu cầu (403 trước 400).
- Không thêm tên vào `GUARDS`, không thêm ô vào `ADMIN_OPS` (thêm = nới).
- Ô mới vào bản đồ **cùng commit** với lời hỏi ở route. Tách commit thì hàng rào 1 (`src/permission-enforcement.test.ts:71-79`) đỏ.

**Không viết số, không xoá**
- Không viết số giấy tờ hay SĐT thật vào mã, test, kịch bản, tài liệu. Số thử là số **giả**, ví dụ `079123456789`, `790000000001`.
- Không xoá cứng. Không sửa `docs/quyen-hoan.json`: ô mới được hỏi ngay, không hoãn.

**An toàn**
- Không `git push`, không merge `main`, không `wrangler deploy`, không lệnh `--remote` nào; hook chặn (`CLAUDE.md` §8).

**Cách làm từng task**
- Mỗi hành vi mới: test **đỏ trước, xanh sau**. Chép dòng đỏ vào nhật ký.
- Mỗi hàng rào mới: bước P16 (sửa cố ý → đỏ → hoàn nguyên → xanh) + dòng sổ hàng rào (Task A21).
- `npm run typecheck` không phủ `*.test.ts`, `scripts/`, `tests/`: tự đọc lại tệp test mới trước khi commit.

## 3. Tiêu chí nghiệm thu (viết TRƯỚC khi làm — P20)

1. **Lệnh kiểm chung.**
   - `npm test` xanh; `npm run typecheck` 0 lỗi; `npm run build:web` chạy được.
   - `npm run test:e2e` đủ bộ xanh, gồm `van-chuyen` và đuôi `audit-invariants --strict` có `R-PTY-2..4`, `R-VC-1..2`.
   - Đỏ sẵn có trên `main` (Task A0) ghi riêng.
2. **Tài khoản Tài xế.**
   - Quản trị tạo tài khoản với vai "Tài xế công ty" (`POST /api/staff` `roles: ["DRIVER_INTERNAL"]`) → 201, quyền đúng `["DRIVER"]`.
   - Màn Quản lý tài khoản có ô "Tài xế công ty" ở nhóm Nội bộ (Chrome).
3. **Tài khoản chỉ `DRIVER`:**
   - mọi route `office` / `orders` / `admin` → **403** (bài toàn tuyến);
   - `GET /api/parties/documents/mine` → 200, chỉ giấy tờ của mình, số che;
   - `homeRedirect` → `"/tai-xe"`;
   - không bao giờ có lời gọi `/api/orders/dashboard` sau `initShell` (mã `web/home.ts` không đổi, hằng test khoá `homeRedirect`).
4. **Mã vai cũ `DRIVER`:**
   - `active = 0`, tên và nhóm giữ nguyên, dòng vai đang có không đổi;
   - Quản trị gán qua `POST /api/parties/:id/roles` → **409 `role_type_inactive`**, không ghi, không nhật ký;
   - loại OTHER đang dùng (Lái cano) → 201;
   - đổi công ty chủ (`OWNER_COMPANY`) vẫn như T2b.
5. **Giấy tờ của người.**
   - Bán hàng, Kế toán, Hướng dẫn viên, Đối tác → **403** (đúng mã) ở route 2–7.
   - Quản trị thêm CCCD cho hồ sơ tài xế → 201, thân trả về có `maskedNumber` `••••6789`, **không** có số đầy đủ.
   - Thêm cùng số CCCD cho người khác → **409 `cccd_taken`**, câu báo không có số.
   - Gia hạn không gửi số → dòng mới mang số cũ (đọc bằng SQL), dòng cũ thành lịch sử.
   - Sửa sai dòng cũ → **409**; sửa sai dòng hiện hành "Nhập sai ngày hết hạn" → 200, nhật ký có hai ngày trước→sau.
   - "Nhập nhầm cả dòng" → dòng bị huỷ, không mất.
   - Tài khoản Đối tác gọi route 1 → **403**; mọi tài khoản nội bộ → 200.
6. **Xem đủ số.**
   - Quản trị, Toàn quyền → 200 `{ number }` và đúng **một** dòng nhật ký `party_document_number_viewed`, không chứa số.
   - Bán hàng → 403, không dòng nhật ký.
   - Quản trị xem đủ số / ghi giấy tờ của hồ sơ gắn tài khoản Quản trị khác hay Toàn quyền → **403** (Q1 mặc định).
7. **Xe.**
   - Quản trị thêm xe → 201; chủ xe = hồ sơ công ty chủ lúc thêm (`ownerCompany`).
   - Trùng biển với xe chưa ngừng → 409 `plate_taken`; trùng số khung → 409 `chassis_taken`.
   - Ngừng xe → trạng thái "ngừng" + ngày ngừng = hôm nay; xe mới dùng lại biển được.
   - Bán hàng → 403; tài khoản chỉ FIELD / DRIVER → 403 ở cổng.
8. **Giấy tờ xe:** thêm / gia hạn / sửa sai như mục 5 (không che số, không CCCD).
9. **Danh sách sắp hết hạn:**
   - gộp giấy tờ xe (xe chưa ngừng) và giấy tờ của người đang giữ vai "Tài xế công ty";
   - chỉ dòng hiện hành, hạn ≤ hôm nay + ngưỡng; xếp theo ngày hết hạn;
   - đã hết hạn có `level: "expired"`; **không** có số;
   - giấy tờ của nhân viên không phải tài xế không lên.
10. **Ngưỡng:**
    - Toàn quyền đổi → dòng chính sách mới, danh sách đổi theo;
    - Quản trị → 403;
    - không sửa / xoá được dòng cũ (trigger).
11. **Danh mục:**
    - Quản trị thêm / sửa / ngưng loại giấy tờ xe, loại giấy tờ người, hạng → 201/200; khoá lạc quan 409;
    - ngưng CCCD/GPLX → 409 `fixed_type`;
    - Bán hàng → 403;
    - trang `/danh-muc-giay-to` làm được cả ba (Chrome, ảnh 390 + 1040).
12. **Nhật ký không số (bài toàn tuyến):** sau khi chạy mọi route giấy tờ, `audit_log` và thân mọi route đọc không chứa số đánh dấu, trừ thân trả về của `reveal`.
13. **CSDL:** mọi ca ở bảng mục 1.5 đỏ đúng thông báo trên SQLite thật (test migration) và trên D1 local (`db:migrate:local` + e2e).
14. **Kiến trúc:**
    - `ALLOWED_EDGES["van-chuyen"] = ["parties", "audit"]`, không vòng;
    - `van-chuyen` ở `STRICT`;
    - `parties/index.ts` xuất **đúng một** hàm mới cho module khác (`expiringDriverDocuments` + kiểu của nó);
    - sổ dữ liệu có 7 bảng mới, `npm run dict` khớp.
15. **Bản đồ quyền:**
    - bài ghim hàng `DRIVER` và hàng Đối tác xanh;
    - bảng ADR đủ **36 ô × 8 cột**;
    - hàng rào 1, 2 xanh;
    - `route-access` SNAPSHOT **109** route (86 + 23).
16. **Sổ hàng rào:** mọi dòng mới có ngày thấy chặn thật (P16).
17. **Tài liệu:** tài liệu mô tả khớp mã; tệp đề xuất luật đủ mục; **chủ đã duyệt** trước khi gộp.
18. **Phần B** (khi có bản vẽ): bảy màn đúng bản vẽ ở 390 và 1040; kịch bản Chrome xanh; không `innerHTML`; ô gõ 16px; CSS chỉ token.
19. **Người kiểm độc lập** chỉ-đọc xác nhận 1–18 bằng đọc mã thật và tự chạy lại lệnh.
20. **AI không deploy.** Sau khi chủ chạy `npm run trien-khai`: `audit-invariants --db remote` đạt, `kiem-phien-ban.mjs --sau-deploy` đạt.

## 4. Điểm dễ hỏng mà task chưa tự nhiên phủ (Review Focus)

1. **Lớp CSDL che lỗ ở route.**
   - Nếu route quên hỏi quyền, trigger CCCD / chỉ mục biển số vẫn chặn (409).
   - ⇒ Test quyền đòi **đúng 403**, không "không 2xx"; P16 của route phải đỏ vì 409 ≠ 403.
2. **Số rò qua đường phụ.**
   - Câu báo lỗi 409 (nhắc số), `detail` nhật ký, trường thừa trong DTO (`document_number` quên bỏ khi ánh xạ), `GET /api/audit`.
   - Bài toàn tuyến (A16) quét cả thân lỗi.
3. **Gia hạn mà giao diện không có số đầy đủ.** Route gia hạn **không gửi số** ⇒ máy chủ chép số của dòng trước. Số không bao giờ phải đi ra trình duyệt để gia hạn.
4. **Thứ tự 403 → 404 → 400 → 409.**
   - Hỏi ô trước khi đọc thân (403 không bị 400 che).
   - Hỏi cấp bậc ngay sau khi biết hồ sơ tồn tại.
5. **Hàm công bố thứ hai lén xuất hiện.**
   - `parties/index.ts` chỉ thêm `expiringDriverDocuments` cho module khác.
   - Route giấy tờ khai ngay trong `parties/index.ts` (không cần xuất).
   - Không xuất câu tra "vai đang mở" ra ngoài.
6. **Ô mới quên cột `DRIVER` / Đối tác.** Hai bài ghim hàng đỏ. Sửa **bài ghim** chỉ khi đã quyết giá trị, không chép từ MATRIX.
7. **Bài "128 tập con" sửa thành 256 phải giữ tính "suy từ MATRIX"**, không chép tay kết quả mới.
8. **Lời kiểm "vai đã ngưng"** (A4) phải đứng **sau** `validateRole`, để `tests/e2e/parties.mjs:158` (ngày 30/02 → 400) còn đúng; và **không** đụng đường `OWNER_COMPANY` (`index.ts:369-386`).
9. **Test đang dùng vai đã ngưng để thử gán:**
   - `src/modules/parties/ho-so-co-tai-khoan.test.ts:213,244,284` dùng `DRIVER`;
   - `tests/e2e/parties.mjs:147-156,173` dùng `GUIDE` (đã ngưng từ 0024).
   - Đổi sang `BOAT_CAPTAIN` (Lái cano, OTHER, đang dùng) **trong cùng task A4**. `parties.mjs:170-171` (lọc `role=GUIDE` / `role=DRIVER`) đổi theo cho khớp.
10. **Ngày dân sự.**
    - "Còn N ngày", "hôm nay", ngày ngừng xe tính bằng `vnToday(new Date())` ở máy chủ, không `date('now')`.
    - Ngưỡng hiệu lực so bằng mốc UTC ISO (`valid_from_at <= now`).
11. **Nhánh gộp song song.**
    - Nhánh Thông báo đính kèm (`0029`, chưa có) sẽ sửa `src/shared/contracts.ts`, `docs/data-dictionary.json`, `wrangler.jsonc`.
    - Nhánh nào gộp sau thì gộp tay các khối đó; ghi nhật ký.

## 5. Sơ đồ tệp

| Tệp | Việc | Task |
|---|---|---|
| `src/shared/giay-to.ts` (mới) + `.test.ts` | lý do sửa sai (danh sách đóng), nhãn trạng thái xe, số ngày còn lại, mức hạn, mã loại cố định | A1 |
| `migrations/0031_vai_quyen_tai_xe.sql` (mới), `src/migrations-vai-quyen-tai-xe.test.ts` (mới) | mã quyền `DRIVER`, vai `DRIVER_INTERNAL`, ngưng `DRIVER` cũ | A2 |
| `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/shared/cong-quyen.test.ts`, `src/shared/handler-view.test.ts`, `src/shared/bang-tin.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts` | cột thứ tám, bài ghim, 256 tập con | A2 (+ A7, A9, A13 thêm ô) |
| `src/shared/roles.ts`, `src/shared/roles.test.ts`, `src/migrations-0024.test.ts`, `tests/e2e/parties.mjs`, `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs` | vai mới; kỳ vọng cũ | A2 |
| `src/shared/start-page.ts` + `.test.ts` | trang đầu `/tai-xe` | A3 |
| `src/modules/parties/{index,repository}.ts`, `src/modules/parties/vai-da-ngung.test.ts` (mới), `src/modules/parties/ho-so-co-tai-khoan.test.ts` | vai đã ngưng không gán mới | A4 |
| `migrations/0032_giay_to_cua_nguoi.sql` (mới), `src/migrations-giay-to-cua-nguoi.test.ts` (mới), `docs/data-dictionary.json` → `docs/DATA-DICTIONARY.md` | giấy tờ của người | A5 |
| `src/modules/parties/giay-to.ts` (mới) + `giay-to.test.ts` | luật thuần giấy tờ người (chuẩn hoá, che số, kiểm đầu vào, dựng `detail` không số) | A6 |
| `src/modules/parties/{index,repository}.ts`, `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `src/modules/parties/giay-to-route.test.ts` (mới) | route 1–11, hàm công bố | A7–A11 |
| `migrations/0033_van_chuyen_xe.sql` (mới), `src/migrations-van-chuyen-xe.test.ts` (mới), `src/architecture.test.ts`, `docs/data-dictionary.json` | bảng `vc_*` | A12 |
| `src/modules/van-chuyen/{index,rules,repository}.ts` (mới) + `rules.test.ts`, `xe.test.ts`, `giay-to-xe.test.ts`, `sap-het-han.test.ts` (mới); `src/index.ts`; `src/route-access.test.ts` | module mới, route 12–23 | A13–A15 |
| `src/giay-to-khong-lo-so.test.ts` (mới) | bài toàn tuyến che số + nhật ký không số | A16 |
| `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | `R-PTY-2..4`, `R-VC-1..2` | A17 |
| `src/tai-xe-cong.test.ts` (mới) | bài cổng toàn tuyến của tài xế | A18 |
| `public/danh-muc-giay-to.html`, `web/danh-muc-giay-to.ts` (mới), `package.json` (`build:web`), `src/shared/sw-policy.ts` (`PAGES`, `PRECACHE`), `web/account.ts`, `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/danh-muc-giay-to-smoke.mjs` + README (mới) | màn danh mục "khuôn sẵn" | A19 |
| `tests/e2e/van-chuyen.mjs` (mới), `tests/e2e/run.mjs` (`ALL`), `tests/e2e/README.md` | e2e | A20 |
| `docs/SO-HANG-RAO.md` | dòng mới | A21 |
| `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md` | tài liệu mô tả + đề xuất luật | A22 |
| Phần B: `web/tai-xe.ts`, `web/xe*.ts`, `web/parties.ts`, `web/account.ts`, `web/shell.ts`, `public/*.html`, kịch bản Chrome | giao diện theo bản vẽ | B0–B8 |
| `src/shared/changelog.ts`, `src/shared/app-info.test.ts` | nhật ký thay đổi (số chốt lúc gộp) | K1 |
| `docs/superpowers/plans/2026-09-28-van-chuyen-1a-thi-cong-nhat-ky.md` | nhật ký thi công | mọi task |

---

## 6. Các task — PHẦN A (dữ liệu + máy chủ + quyền; làm ngay)

Thứ tự task là thứ tự phụ thuộc. Mỗi task kết thúc bằng `npm test` xanh và một commit. Ô quyền mới luôn vào **cùng commit** với route đầu tiên hỏi nó.

### Task A0: Điều kiện trước, mốc, soát

- [ ] **Bước 1 — ADR-0040 có trên nhánh thi công.**
  - Chạy `git ls-tree --name-only HEAD docs/adr/ | grep 0040` → có `ADR-0040-van-chuyen-luot-1a-xe-giay-to-tai-xe.md`.
  - Chạy `sed -n 3,5p docs/adr/ADR-0040-van-chuyen-luot-1a-xe-giay-to-tai-xe.md` → có "accepted" và câu chủ trả lời "Mọi nhân viên".
  - Thiếu → **DỪNG**, báo điều phối.
- [ ] **Bước 2 — dừng dây chuyền:** `node -e 'console.log(JSON.stringify(require("./docs/quyen-hoan.json").phat_hien))'` → kỳ vọng `[]`.
  - Có phát hiện HIGH chạm `parties` / quyền / dữ liệu cá nhân → **DỪNG**, hỏi (`CLAUDE.md` §3).
- [ ] **Bước 3 — chưa ai thêm trước:** `grep -n 'DRIVER\|"vehicle.manage"\|"party.document' src/shared/permissions.ts src/shared/roles.ts` → rỗng.
  - Không rỗng → ghi nhật ký, đối chiếu giá trị với mục 1.3, không khai lặp.
- [ ] **Bước 4 — số migration.**
  - `ls migrations/` → số lớn nhất `0030`.
  - Quét lại: `git for-each-ref --format='%(refname:short)' refs/heads refs/remotes`, rồi **từng nhánh** `git ls-tree --name-only <nhánh> migrations/ | tail -1`. Worktree cô lập có thể không cho vòng lặp; chạy từng lệnh.
  - Có nhánh mang `0031`–`0033` → lấy số trống kế tiếp, sửa mọi chỗ trong kế hoạch + nhật ký, báo điều phối.
- [ ] **Bước 5 — mốc test:**
  - `npm ci`, `npm test`, `npm run typecheck`. Ghi số test, số lỗi.
  - Ca đo CPU của `src/claude-guard.test.ts` đỏ vì máy bận → ghi `uptime`, chạy lại riêng tệp đó lúc máy rảnh; không sửa tệp đó.
- [ ] **Bước 6 — mốc e2e (cần mạng):** tắt mọi `wrangler dev` mồ côi, rồi `npm run test:e2e`. Ghi đỏ sẵn có vào nhật ký.
- [ ] **Bước 7 — mốc Chrome trên nhánh gốc.**
  - Chạy `npm run build:web`, rồi các kịch bản (lệnh ở đầu tệp / README cùng thư mục):
    - `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs`;
    - `docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs`;
    - `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs`.
  - Ghi số ✓/✗.
  - **Riêng `vai-smoke.mjs:34`** đang khoá **11** ô vai. Hôm nay `ROLE_CODES` có 12 vai (vai IT, ADR-0044), nên bài có thể đã đỏ sẵn. Ghi con số thật màn hình đang có: Task A2 cộng thêm 1 từ con số đó.
- [ ] **Bước 8 — soát số dòng trích dẫn** của kế hoạch trên đỉnh nhánh thi công (mốc lập kế hoạch `9ead2e7`). Ghi độ lệch vào nhật ký.
- [ ] **Bước 9 — soát khẳng định "đúng số lượng / đúng danh sách"** sẽ lệch.
  - Chạy `grep -rn "128\|PERMISSION_CODES.length\|ROLE_CODES.length\|roleTypes.map\|length, 86\|86 route" src tests docs/evidence/*/kich-ban`.
  - Đã biết:
    - `src/shared/permissions.test.ts:243-255`, `src/shared/handler-view.test.ts:127-141`, `src/shared/bang-tin.test.ts:33-35` (128 tập con);
    - `src/shared/roles.test.ts:11-21` (12 vai);
    - `src/migrations-0024.test.ts:60-63` (`DRIVER` đang dùng);
    - `tests/e2e/parties.mjs:17-20` (danh sách mã vai);
    - `src/route-access.test.ts:191-209` (86 route) + `MODULES` (`:46-60`);
    - bài ghim hàng Đối tác `src/modules/orders/xem-don-theo-quyen.test.ts:275-288`;
    - `ADMIN_NONE_OPS` `src/shared/permissions.test.ts:201-204`;
    - `vai-smoke.mjs:34,114`.
  - Ghi mọi chỗ mới tìm thấy.
- [ ] **Bước 10 — mở nhật ký thi công**: điền mốc, nhánh, Ruling R1–R5 (đã có sẵn trong khung).

---

### Task A1: Luật thuần dùng chung `src/shared/giay-to.ts`

**Tệp:** tạo `src/shared/giay-to.ts`, `src/shared/giay-to.test.ts`.
**Giao diện tạo ra** (thuần, không I/O; dùng ở máy chủ `parties`, `van-chuyen` và giao diện Phần B):

```ts
// Giấy tờ (ADR-0040 D1, D2) — luật thuần dùng chung server ↔ web/. Không I/O, không import module. Không có số giấy tờ nào ở đây.
/** Mã loại giấy tờ CỐ ĐỊNH mà mã nguồn và CHECK/trigger dựa vào (Hiến chương 2.2: đổi bằng ADR, không sửa trong app). */
export const LOAI_CO_DINH = { CCCD: "CCCD", GPLX: "GPLX" } as const;
export type LyDoSuaSai = "SAI_SO" | "SAI_NGAY_CAP" | "SAI_NGAY_HET_HAN" | "SAI_NOI_CAP" | "SAI_HANG" | "NHAP_NHAM_DONG";
export type TruongSua = "number" | "issuedDate" | "expiryDate" | "issuedPlace" | "classCode";
/** Danh sách ĐÓNG lý do sửa sai (ADR-0040 D1: "sửa sai phải có lý do, danh sách đóng"). Mỗi lý do sửa ĐÚNG MỘT trường; NHAP_NHAM_DONG huỷ cả dòng. */
export const LY_DO_SUA_SAI: Readonly<Record<LyDoSuaSai, { nhan: string; truong: TruongSua | null; choXe: boolean }>> = {
  SAI_SO: { nhan: "Nhập sai số", truong: "number", choXe: true },
  SAI_NGAY_CAP: { nhan: "Nhập sai ngày cấp", truong: "issuedDate", choXe: true },
  SAI_NGAY_HET_HAN: { nhan: "Nhập sai ngày hết hạn", truong: "expiryDate", choXe: true },
  SAI_NOI_CAP: { nhan: "Nhập sai nơi cấp", truong: "issuedPlace", choXe: false },
  SAI_HANG: { nhan: "Nhập sai hạng", truong: "classCode", choXe: false },
  NHAP_NHAM_DONG: { nhan: "Nhập nhầm cả dòng (huỷ dòng này)", truong: null, choXe: true },
};
/** Trạng thái xe — tập ĐÓNG, khớp CHECK của migration *_van_chuyen_xe (ADR-0040 D1). */
export const TRANG_THAI_XE = { active: "Đang dùng", maintenance: "Bảo dưỡng", retired: "Ngừng dùng" } as const;
export type TrangThaiXe = keyof typeof TRANG_THAI_XE;
/** Số ngày từ `homNay` tới `hetHan` (ngày dân sự "YYYY-MM-DD", giờ VN); âm = đã quá hạn. */
export function soNgayConLai(hetHan: string, homNay: string): number;
export type MucHan = "khong-han" | "con-han" | "sap-het" | "het-han";
/** null → "khong-han"; < 0 → "het-han"; 0..nguong → "sap-het"; còn lại "con-han". */
export function mucHan(hetHan: string | null, homNay: string, nguongNgay: number): MucHan;
```

- [ ] **Bước 1: Test đỏ** `src/shared/giay-to.test.ts`:
  - `soNgayConLai("2026-10-28", "2026-09-28") === 30`;
  - qua năm `("2027-01-01", "2026-12-31") === 1`;
  - âm `("2026-09-27", "2026-09-28") === -1`;
  - `0` cùng ngày;
  - năm nhuận `("2028-03-01", "2028-02-28") === 2`.
  - `mucHan`:
    - `null` → khong-han;
    - hôm qua → het-han;
    - hôm nay → sap-het;
    - đúng `nguong` ngày → sap-het;
    - `nguong + 1` → con-han.
  - `LY_DO_SUA_SAI`:
    - đúng sáu khoá;
    - nhãn khác nhau, tiếng Việt có dấu, không chữ `_`;
    - `choXe` đúng ở SAI_SO, SAI_NGAY_CAP, SAI_NGAY_HET_HAN, NHAP_NHAM_DONG;
    - trường sửa không trùng nhau (trừ `null`).
  - `Object.keys(TRANG_THAI_XE)` = `["active", "maintenance", "retired"]`. Task A12 đối chiếu thêm với `CHECK` của migration.
- [ ] **Bước 2: Chạy, thấy đỏ:** `node --test src/shared/giay-to.test.ts` → FAIL: không tìm thấy module.
- [ ] **Bước 3: Viết mã.** `soNgayConLai` dùng `Date.UTC` của hai chuỗi ngày (không `new Date(chuỗi)` theo múi giờ máy).
- [ ] **Bước 4: Xanh:** `node --test src/shared/giay-to.test.ts`, rồi `npm test`, `npm run typecheck` (tệp dùng ở `web/` nên `tsc -p web` cũng kiểm).
- [ ] **Bước 5: Commit.** "Luật thuần giấy tờ dùng chung: lý do sửa sai, trạng thái xe, số ngày còn lại (ADR-0040)".

---

### Task A2: Quyền app `DRIVER` và vai "Tài xế công ty" — migration 0031 (Ruling R1, R2)

**Tệp:**
- Tạo: `migrations/0031_vai_quyen_tai_xe.sql`, `src/migrations-vai-quyen-tai-xe.test.ts`.
- Sửa mã: `src/shared/permissions.ts`, `src/shared/roles.ts`.
- Sửa test: `src/shared/permissions.test.ts`, `src/shared/cong-quyen.test.ts`, `src/shared/handler-view.test.ts`, `src/shared/bang-tin.test.ts`, `src/shared/roles.test.ts`, `src/migrations-0024.test.ts`.
- Sửa e2e và Chrome: `tests/e2e/parties.mjs`, `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs`.

- [ ] **Bước 1: Test đỏ (migration)** `src/migrations-vai-quyen-tai-xe.test.ts`. Khuôn `src/migrations-ho-so-cong-ty-chu.test.ts`: tìm tệp theo đuôi `_vai_quyen_tai_xe.sql`, dựng schema bằng `node:sqlite`. Mỗi ca một `test(...)`:
  - (a) Đúng một tệp khớp đuôi. Tên không chứa `staff_party_required`. Tệp không tạo trigger nào (so `sqlite_master` trước/sau).
  - (b) Sau mọi migration, dòng `stf_permission_type` `DRIVER` có:
    - `name` = `PERMISSION_LABEL.DRIVER` = "Tài xế";
    - `active` 1, `sort_order` 8.
  - (c) Dòng `pty_role_type` `DRIVER_INTERNAL` có:
    - `name` "Tài xế công ty" = `ROLES.DRIVER_INTERNAL.name`;
    - `role_group` INTERNAL, `active` 1, `sort_order` 17.
  - (d) Dòng `pty_role_type` `DRIVER` cũ có: `role_group` OTHER, **`active` 0**, `name` **vẫn** "Tài xế".
  - (e) Dòng vai đang có không đổi:
    - dựng schema **tới trước** tệp này;
    - chèn một hồ sơ cá nhân + dòng `pty_party_role` `DRIVER` đang mở;
    - áp tệp;
    - dòng đó vẫn `valid_to_date IS NULL`, `updated_at` không đổi.
  - (f) Văn bản tệp (bỏ chú thích `--`) không có dãy số dài ≥ 8 chữ số, không `@`.
- [ ] **Bước 2: Test đỏ (bản đồ quyền, vai).**
  - `src/shared/permissions.test.ts`:
    - bảng `ADR` (dòng 11-44) thêm cột thứ tám, đúng mục 1.3.1;
    - `ORDER` (dòng 45) thêm `"DRIVER"`;
    - tên test dòng 48 đổi thành "(… × 8 quyền)".
  - **Bài ghim mới** trong cùng tệp:

```ts
// ADR-0040 D3 + Ruling R2 (điều phối 2026-09-28): cột Tài xế (DRIVER) — lượt 1a MỌI ô nghiệp vụ = không. Ngoại lệ có tên: gửi/xem góp ý của mình
// (ADR-0038, như mọi tài khoản) và xem giấy tờ của chính mình (ô thêm ở Task A7). Liệt kê TỪNG ô, không suy từ MATRIX: thêm ô mới mà quên cột
// DRIVER thì đỏ ở đây — buộc người thêm QUYẾT giá trị cho tài xế (khuôn bài ghim hàng Đối tác, src/modules/orders/xem-don-theo-quyen.test.ts).
test("ADR-0040 D3: MỌI ô của Tài xế (DRIVER) — ghim nguyên dòng", () => {
  const DRIVER_ROW: Record<string, Scope> = {
    "order.view": "none", "money.view": "none", "order.history.view": "none", "contact.view": "none", "order.create": "none", "order.modify": "none",
    "order.trip.edit": "none", "task.progress": "none", "order.money.edit": "none", "order.cancel": "none", "dispatch.assign": "none", "dispatch.claim": "none",
    "dispatch.guides.view": "none", "payment.receive": "none", "payment.refund": "none", "invoice.request": "none", "invoice.issue": "none",
    "party.view": "none", "party.write": "none", "party.staff.write": "none", "admin.manage": "none", "admin.manage.superadmin": "none",
    "account.access.manage": "none", "staff.sheet.sync": "none", "audit.view": "none",
    "feedback.submit": "any", "feedback.view": "own", // ngoại lệ có tên (Ruling R2)
    "feedback.triage": "none", "settings.ops": "none", "order.pool.view": "none", "notice.send": "none", "company.legal.write": "none",
  };
  assert.deepEqual(Object.fromEntries((Object.keys(MATRIX) as OperationCode[]).map((op) => [op, MATRIX[op].DRIVER])), DRIVER_ROW);
});
```

  - `seesOnlyAssignedOrders` (dòng 243-255):
    - `count` thành **256**;
    - ảnh chụp dòng 251 thành `["FIELD", "FIELD+DRIVER"].includes(permissions.join("+"))`, chú thích: "Hướng dẫn viên kiêm Tài xế: `order.view` của DRIVER là none nên vẫn chỉ xem đơn mình phụ trách".
  - `src/shared/cong-quyen.test.ts`:
    - `DOI_CO_CHU_Y_CANH_CUA_DON` (dòng 50) thêm `"FIELD+DRIVER"`, chú thích "qua cổng orders nhờ FIELD (ADR-0030 S23-5); DRIVER không thêm gì";
    - sửa chữ "Với 7 mã" → "Với 8 mã … ĐÚNG HAI tổ hợp";
    - **thêm** bài:

```ts
test("ADR-0040 D3: Tài xế (DRIVER) không nằm trong cổng nào — tài khoản chỉ-DRIVER không qua admin/office/orders", () => {
  for (const gate of [ADMIN_GATE, OFFICE_GATE, ORDERS_GATE]) assert.ok(!(gate as readonly string[]).includes("DRIVER"));
  const driver = { id: "d", permissions: ["DRIVER"] as PermissionCode[] };
  assert.equal(passesAdminGate(driver), false);
  assert.equal(isOffice(driver), false);
  assert.equal(canAccessOrders(driver), false);
});
```

  - `src/shared/handler-view.test.ts:130` và `src/shared/bang-tin.test.ts:35`: `128` → `256`; sửa chú thích "128 tập con của 7 mã" → "256 tập con của 8 mã". Kỳ vọng vẫn **suy từ MATRIX**, không chép tay.
  - `src/shared/roles.test.ts:11-21`:
    - đếm thành "13 vai, 8 nội bộ + 5 bên ngoài";
    - `superAdminOnly` giữ `["DIRECTOR", "OPERATIONS_MANAGER", "IT"]`;
    - thêm `assert.deepEqual(defaultPermissions(["DRIVER_INTERNAL"]), ["DRIVER"])`, `ROLES.DRIVER_INTERNAL.handles === "never"`, `isRoleCode("DRIVER") === false` ("mã vai hồ sơ cũ không thuộc mô hình vai tài khoản").
  - `src/migrations-0024.test.ts:60-63`: bỏ `"DRIVER"` khỏi vòng "đang dùng". Thêm khẳng định riêng `by.get("DRIVER")?.active === 0`, chú thích "ngưng gán mới từ migration *_vai_quyen_tai_xe (ADR-0040 D3, Ruling R1) — tệp này dựng tới migration CUỐI".
- [ ] **Bước 3: Chạy, thấy đỏ:** `node --test src/migrations-vai-quyen-tai-xe.test.ts src/shared/permissions.test.ts src/shared/cong-quyen.test.ts src/shared/roles.test.ts src/roles-schema.test.ts src/migrations-0024.test.ts`. Chép dòng đỏ vào nhật ký. Kỳ vọng:
  - migration: tệp chưa có;
  - permissions: "`PERMISSION_CODES` lệch `ORDER`";
  - roles: "13 ≠ 12".
- [ ] **Bước 4: Viết migration** `migrations/0031_vai_quyen_tai_xe.sql`:

```sql
-- Migration 0031 — ADR-0040 D3 (accepted 2026-09-28; Ruling R1 của điều phối): tài xế công ty là NHÂN VIÊN có tài khoản đăng nhập.
-- CHỈ THÊM hai dòng danh mục và ngưng gán mới một mã vai cũ; KHÔNG đổi quyền, vai, hồ sơ của ai. Không gieo SĐT/tên thật ở đây.
-- (1) Quyền app mới DRIVER ("Tài xế", module staff). Lượt 1a mọi ô nghiệp vụ = không — bản đồ ở src/shared/permissions.ts; src/roles-schema.test.ts
--     giữ nhãn ở đây khớp PERMISSION_LABEL.
INSERT INTO stf_permission_type (code, name, description, sort_order) VALUES
  ('DRIVER', 'Tài xế', 'Tài xế công ty (ADR-0040): đăng nhập, trang Tài khoản, nhận thông báo, xem giấy tờ của chính mình (số che); không thấy đơn, tiền, khách, danh mục giá, hồ sơ người khác', 8);
-- (2) Vai tài khoản nội bộ mới "Tài xế công ty" (module parties) — khuôn GUIDE_INTERNAL (0024). Bộ quyền mặc định (DRIVER) nằm ở src/shared/roles.ts.
INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES ('DRIVER_INTERNAL', 'Tài xế công ty', 17, 'INTERNAL');
-- (3) Mã vai hồ sơ cũ DRIVER ("Tài xế", nhóm OTHER, 0011) không dùng cho tài xế công ty; ADR-0040 D3: "không gán mới", lượt 2 quyết. Ngưng như 0024 đã
--     làm với mã cũ mơ hồ; dòng vai đang có của các hồ sơ giữ nguyên. Máy chủ từ chối gán mới loại vai đã ngưng (route Danh bạ, Task A4).
UPDATE pty_role_type SET active = 0 WHERE code = 'DRIVER';
```

- [ ] **Bước 5: Viết mã.**
  - `src/shared/permissions.ts`:
    - `PERMISSION_CODES` thêm `"DRIVER"` **cuối** (dòng 5);
    - `PERMISSION_LABEL` thêm `DRIVER: "Tài xế", // ADR-0040 D3`;
    - `row()` (dòng 28-30) thêm tham số `DRIVER: Scope` cuối;
    - **mọi** hàng `MATRIX` thêm đối số cuối `"none"`, trừ `feedback.submit` → `"any"` và `feedback.view` → `"own"`;
    - chú thích đầu `MATRIX` thêm một câu "ADR-0040 D3: cột DRIVER — lượt 1a mọi ô nghiệp vụ none (Ruling R2)".
    - `tsc` bắt mọi hàng thiếu đối số.
  - `src/shared/roles.ts`: `ROLE_CODES` thêm `"DRIVER_INTERNAL"` ngay **sau `"IT"`**; `ROLES.DRIVER_INTERNAL` như mục 1.1, chú thích "ADR-0040 D3: tài xế là nhân viên; không nhận đơn".
- [ ] **Bước 6: Xanh:** chạy lại các tệp ở bước 3, cùng `node --test src/shared/handler-view.test.ts src/shared/bang-tin.test.ts src/shared/start-page.test.ts src/modules/dispatch/rules.test.ts src/shared/assignee-pick.test.ts` → xanh.
  - `dispatch/rules.test.ts:87-92` phải **tự** xanh, vì `DRIVER` không đủ điều kiện làm người phụ trách. Đỏ ở đây là lỗi.
  - Rồi `npm test`, `npm run typecheck`.
- [ ] **Bước 7: E2E.**
  - `tests/e2e/parties.mjs:17-20`: thêm `"DRIVER_INTERNAL"` vào danh sách đã sắp. Thêm hai khẳng định:
    - `DRIVER_INTERNAL` = `{ code, name: "Tài xế công ty", group: "INTERNAL", active: true }`;
    - `DRIVER.active === false`.
  - Chạy `npm run db:migrate:local`, rồi `npm run test:e2e -- parties roles permissions admin`.
- [ ] **Bước 8: Chrome** (`web/CLAUDE.md`: tệp thuần dùng ở giao diện → chạy lại kịch bản).
  - Chạy `npm run build:web`.
  - `vai-smoke.mjs:34`: con số mốc ở Task A0 **+ 1**.
  - `vai-smoke.mjs:114`: `ACCOUNT_ROLE_NAMES` thêm "Tài xế công ty".
  - Thêm khẳng định "nhóm Nội bộ có ô 'Tài xế công ty'".
  - Chạy `vai-smoke.mjs` và `dot-a-smoke.mjs` → xanh (so mốc Task A0).
- [ ] **Bước 9: P16** (mỗi lần: sửa cố ý → thấy đỏ, chép nguyên văn → hoàn nguyên → xanh):
  - (a) Đổi ô `order.view` của `DRIVER` thành `"own"` → bài ghim hàng `DRIVER` đỏ.
  - (b) Thêm `"DRIVER"` vào `OFFICE_GATE` → bài "không nằm trong cổng nào" và bài khoá danh sách cổng đỏ.
  - (c) Bỏ câu `UPDATE pty_role_type SET active = 0 …` → ca (d) của test migration đỏ.
- [ ] **Bước 10: Commit.** "Quyền app Tài xế (DRIVER) và vai Tài xế công ty; ngưng gán mới vai hồ sơ Tài xế cũ (ADR-0040 D3, Ruling R1, R2)". Thân:
  - cột mới thêm cuối bản đồ, mọi ô nghiệp vụ none trừ góp ý;
  - mã quyền DRIVER khác bảng với mã vai hồ sơ cũ;
  - 128 → 256 tập con vì thêm mã thứ tám.

---

### Task A3: Trang đầu của tài xế — `homeRedirect` → `/tai-xe` (Ruling R3)

**Tệp:** `src/shared/start-page.ts`, `src/shared/start-page.test.ts`.

- [ ] **Bước 1: Test đỏ** (thêm vào `start-page.test.ts`):

```ts
import { TRANG_DAU_TAI_XE } from "./start-page.ts";
import { PERMISSION_CODES, canAccessOrders, seesAllOrders } from "./permissions.ts";

test("homeRedirect: chỉ Tài xế (DRIVER) → trang đầu riêng /tai-xe — không bao giờ ở lại Trang chủ gọi dashboard đơn (ADR-0040 D3, Ruling R3)", () => {
  assert.equal(TRANG_DAU_TAI_XE, "/tai-xe");
  assert.equal(homeRedirect(who("DRIVER")), "/tai-xe");
  for (const office of ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(homeRedirect(who("DRIVER", office)), null, `DRIVER+${office}`);
  for (const p of ["FIELD", "PARTNER", "INTERN"] as const) assert.equal(homeRedirect(who(p, "DRIVER")), "/orders", `${p}+DRIVER`);
});

test("homeRedirect: 256 tập con quyền — tập KHÔNG có DRIVER cho đúng kết quả cũ; /tai-xe chỉ khi có DRIVER và không xem đơn nào", () => {
  const cu = (w: { id: string; permissions: PermissionCode[] }) => (!seesAllOrders(w) && canAccessOrders(w) ? "/orders" : null); // công thức trước ADR-0040, chép nguyên
  let n = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++, n++) {
    const w = who(...PERMISSION_CODES.filter((_, i) => mask & (1 << i)));
    const coTaiXe = w.permissions.includes("DRIVER");
    const kyVong = !coTaiXe || seesAllOrders(w) || canAccessOrders(w) ? cu(w) : "/tai-xe";
    assert.equal(homeRedirect(w), kyVong, w.permissions.join("+") || "(không quyền)");
  }
  assert.equal(n, 256);
});
```

- [ ] **Bước 2: Chạy, thấy đỏ:** `node --test src/shared/start-page.test.ts` → FAIL: `TRANG_DAU_TAI_XE` chưa có / `null ≠ "/tai-xe"`.
- [ ] **Bước 3: Mã** `src/shared/start-page.ts`:
  - sửa chú thích đầu tệp, thêm đoạn ADR-0040 D3;
  - `import { canAccessOrders, hasPermission, seesAllOrders, type PermissionHolder } from "./permissions.ts";`

```ts
/** Trang đầu của tài khoản chỉ có phần Tài xế (ADR-0040 D3, Ruling R3). Trang là màn số 7 của danh sách màn — dựng ở Phần B theo bản vẽ. */
export const TRANG_DAU_TAI_XE = "/tai-xe";

export function homeRedirect(who: PermissionHolder): string | null {
  if (seesAllOrders(who)) return null;
  if (canAccessOrders(who)) return "/orders";
  // ADR-0040 D3: tài xế không qua cổng orders → Trang chủ sẽ gọi GET /api/orders/dashboard và nhận 403. web/home.ts gọi hàm này và
  // location.replace TRƯỚC khi tải dashboard (web/home.ts:255-258), nên tài khoản chỉ-DRIVER không bao giờ gọi route đó.
  if (hasPermission(who, "DRIVER")) return TRANG_DAU_TAI_XE;
  return null;
}
```

- [ ] **Bước 4: Xanh:** `node --test src/shared/start-page.test.ts`, rồi `npm test`, `npm run typecheck`.
- [ ] **Bước 5: Chrome hồi quy:** `npm run build:web`, rồi `trang-chu-smoke.mjs` (`web/CLAUDE.md` hàng `web/home.ts`) → xanh như mốc A0. Không đổi hành vi tài khoản văn phòng / Đối tác.
- [ ] **Bước 6: P16:** bỏ dòng `if (hasPermission(who, "DRIVER")) …` → hai bài bước 1 đỏ → hoàn nguyên. Chép nguyên văn.
- [ ] **Bước 7: Commit.** "Trang đầu riêng cho tài xế: /tai-xe, không gọi dashboard đơn (ADR-0040 D3, Ruling R3)". Thân: trang /tai-xe dựng ở Phần B theo bản vẽ; Phần A một mình không phát hành.

---

### Task A4: Loại vai đã ngưng không gán mới được — hàng rào máy (sửa tiền đề R1, mục 0)

**Tệp:**
- Sửa: `src/modules/parties/repository.ts` (dòng 407, 434-436), `src/modules/parties/index.ts` (dòng 365-388), `src/modules/parties/ho-so-co-tai-khoan.test.ts` (dòng 213, 244, 284), `tests/e2e/parties.mjs` (dòng 146-185).
- Tạo: `src/modules/parties/vai-da-ngung.test.ts`.

- [ ] **Bước 1: Test đỏ** `src/modules/parties/vai-da-ngung.test.ts`. Khung `world()`/`seedStaff()` như `src/modules/parties/cong-ty-chu.test.ts:13-20`; tạo một hồ sơ cá nhân **không** tài khoản bằng `POST /api/parties` (Quản trị).
  - Quản trị `POST /api/parties/<hồ sơ>/roles` với từng mã `DRIVER`, `STAFF`, `SALES`, `GUIDE`, `AGENT`:
    - kỳ vọng **409**, `error.code` `role_type_inactive`;
    - câu báo tiếng Việt có chữ "ngưng dùng";
    - không thêm dòng `pty_party_role`, không thêm dòng `audit_log`.
  - `{ roleTypeCode: "BOAT_CAPTAIN" }` (Lái cano, OTHER, đang dùng) → **201**.
  - `{ roleTypeCode: "DRIVER", validFrom: "2026-02-30" }` → **400** (kiểm thân đứng trước).
  - `{ roleTypeCode: "KHONG_CO" }` → **400** như cũ (khoá ngoại).
  - Bán hàng → 403 như cũ.
  - Đường đổi công ty chủ (`OWNER_COMPANY`, cũng `active = 0`) **không** bị chặn: `src/modules/parties/cong-ty-chu.test.ts` chạy lại phải xanh nguyên.
- [ ] **Bước 2: Chạy, thấy đỏ:** `node --test src/modules/parties/vai-da-ngung.test.ts` → FAIL: 201 ≠ 409. Ghi dòng đỏ.
- [ ] **Bước 3: Mã.**
  - `repository.ts`: thay `ROLE_TYPE_GROUP` bằng `ROLE_TYPE_OF = defineSql("parties", "role_type_of", "SELECT role_group, active FROM pty_role_type WHERE code = ?1")`. Thay `roleTypeGroup` bằng `roleTypeOf(db, code): Promise<{ group: string; active: boolean } | null>`. Chỉ `index.ts:365` gọi hàm cũ.
  - `index.ts`, route thêm vai:

```ts
const loai = await roleTypeOf(env.DB, parsed.value.roleTypeCode);
if (isAccountGroup(loai?.group ?? null)) return ACCOUNT_ROLE();
// … (dòng 366-369 giữ nguyên: now/at/doiCongTyChu)
// ADR-0040 D3 + Ruling R1: loại vai đang ngưng (active = 0) KHÔNG gán mới được — trước đây chỉ bị ẩn ở giao diện (web/parties.ts:275).
// Ngoại lệ: đổi công ty chủ (OWNER_COMPANY gieo active = 0 để ô "Thêm công việc" chung không liệt kê — Ruling T2 của T2b; đường riêng ở dưới).
// Mã lạ (loai = null) đi tiếp như cũ: câu chèn vấp khoá ngoại → 400.
if (!doiCongTyChu && loai !== null && !loai.active) return ROLE_TYPE_INACTIVE();
```

  - Hằng `const ROLE_TYPE_INACTIVE = () => error(409, "role_type_inactive", "Loại công việc này đã ngưng dùng nên không gán mới được. Chọn loại khác trong danh sách.");`.
- [ ] **Bước 4: Sửa test cũ đang gán loại vai đã ngưng** (Review Focus 9):
  - `ho-so-co-tai-khoan.test.ts:213`: `DRIVER` → `BOAT_CAPTAIN`, kèm hai chỗ `find((r) => r.roleTypeCode === "DRIVER")` ở dòng 244, 284.
  - `tests/e2e/parties.mjs` khối "vai trò theo nơi" (dòng 146-185):
    - `GUIDE` → `BOAT_CAPTAIN`;
    - `roleCodes` kỳ vọng `["BOAT_CAPTAIN"]`;
    - truy vấn `role=GUIDE` → `role=BOAT_CAPTAIN`;
    - giữ nguyên ý từng khẳng định.
  - Dòng 158 (ngày 30/02 với `DRIVER`) giữ nguyên: vẫn 400.
- [ ] **Bước 5: Xanh:** `node --test src/modules/parties/vai-da-ngung.test.ts src/modules/parties/ho-so-co-tai-khoan.test.ts src/modules/parties/cong-ty-chu.test.ts src/architecture.test.ts src/route-write-guard.test.ts` → xanh. Rồi `npm test`, `npm run typecheck`, `npm run test:e2e -- parties company`.
- [ ] **Bước 6: P16:** bỏ dòng `if (!doiCongTyChu && loai !== null && !loai.active) …` → ca `DRIVER` đỏ (201 ≠ 409) → hoàn nguyên. Chép nguyên văn.
- [ ] **Bước 7: Commit.** "Danh bạ: loại công việc đã ngưng không gán mới được (ADR-0040 D3, Ruling R1)". Thân:
  - trước đây `active = 0` chỉ ẩn ở giao diện;
  - áp cho mọi loại đã ngưng, trừ đường đổi công ty chủ;
  - test cũ đổi sang Lái cano.

---

### Task A5: Migration 0032 — giấy tờ của người (ADR-0040 D2)

**Tệp:**
- Tạo: `migrations/0032_giay_to_cua_nguoi.sql`, `src/migrations-giay-to-cua-nguoi.test.ts`.
- Sửa: `docs/data-dictionary.json` → `npm run dict` (`docs/DATA-DICTIONARY.md`).

- [ ] **Bước 1: Test đỏ** `src/migrations-giay-to-cua-nguoi.test.ts`. Tìm tệp theo đuôi `_giay_to_cua_nguoi.sql`. Dựng schema đủ (`all()`) và schema tới trước tệp (`before()`) như `src/migrations-ho-so-cong-ty-chu.test.ts`. Hàm `ins(...)` chèn một dòng giấy tờ; `number_key` tính bằng `chuanHoaSo` sẽ có ở Task A6 — ở đây viết tay `upper()` + bỏ khoảng trắng/`.`/`-`/`/`. Mỗi ca một `test(...)`; thông báo đỏ kỳ vọng ghi trong ngoặc:
  - (a) **Tệp:**
    - đúng một tệp khớp đuôi;
    - tên không B5;
    - mọi trigger mới tên bắt đầu `pty_person_document_`, không `staff_`/`stf_`;
    - văn bản (bỏ chú thích `--`, bỏ chuỗi ngày/giờ `'2026-…'`) không có dãy ≥ 8 chữ số, không `@`.
  - (b) **Dữ liệu gieo:**
    - `pty_person_document_type` đúng 4 mã, tên, `has_expiry` như mục 1.6;
    - `pty_license_class` đúng 8 mã theo thứ tự `sort_order`;
    - mọi dòng `active` 1, `created_by` NULL.
  - (c) **Khoá ngoại / CHECK:**
    - giấy tờ cho hồ sơ **tổ chức** → `FOREIGN KEY`;
    - GPLX thiếu hạng → `CHECK`;
    - CCCD có hạng → `CHECK`;
    - CCCD/GPLX thiếu số → `CHECK`;
    - hết hạn trước ngày cấp → `CHECK`;
    - `previous_id = id` → `CHECK`.
  - (d) **CCCD một người:**
    - người khác cùng số → `person_document_cccd_other_person`;
    - cùng người gia hạn cùng số → qua;
    - sửa sai số thành số của người khác (UPDATE `number_key`) → `person_document_cccd_other_person`;
    - huỷ dòng (và dòng trước của nó) → người khác nhận số đó được.
  - (e) **Không sửa đè:** UPDATE dòng đã có dòng gia hạn chưa huỷ → `person_document_superseded`.
  - (f) **Dòng đã huỷ:** UPDATE → `person_document_voided`.
  - (g) **Định danh:** đổi `party_id` / `document_type_code` / `previous_id` / `created_at` → `person_document_identity`.
  - (h) **Không xoá:** `DELETE` → `person_document_no_delete`.
  - (i) **Gia hạn:**
    - nối sang người khác, loại khác, dòng đã huỷ → `person_document_renew_mismatch`;
    - gia hạn lần hai cùng dòng trước → `UNIQUE constraint failed: pty_person_document.previous_id`;
    - huỷ dòng gia hạn nhầm → dòng trước sửa được và gia hạn lại được.
  - (j) **Sổ dữ liệu:** `docs/data-dictionary.json` có ba bảng, module `parties`, `kind: "table"`. Bài `src/architecture.test.ts` sẽ đỏ nếu thiếu.
- [ ] **Bước 2: Chạy, thấy đỏ:** `node --test src/migrations-giay-to-cua-nguoi.test.ts` → FAIL: tệp chưa có.
- [ ] **Bước 3: Viết migration** `migrations/0032_giay_to_cua_nguoi.sql`. Nội dung đã thử trên SQLite nháp (mục 1.5):

```sql
-- Migration 0032 — ADR-0040 D2 (accepted 2026-09-28): giấy tờ của NGƯỜI ở hồ sơ người (module parties). CHỈ THÊM. Không gieo dữ liệu cá nhân nào.
-- Ba bảng: danh mục loại giấy tờ của người + danh mục hạng giấy phép lái xe (Quản trị sửa trong app — khuôn loc_location: dấu vết, active, khoá lạc quan
-- updated_at, nhật ký cùng lô; khoá chính là mã) và giấy tờ của người.
-- Gia hạn = THÊM dòng mới trỏ previous_id về dòng cũ (không sửa đè); sửa sai = sửa DÒNG HIỆN HÀNH có lý do (danh sách đóng ở src/shared/giay-to.ts);
-- nhập nhầm cả dòng = đặt voided_at (không xoá). "Hiện hành" = chưa huỷ và không có dòng nối tiếp CHƯA huỷ.
-- Mã loại 'CCCD' và 'GPLX' là mã CỐ ĐỊNH (CHECK/trigger dưới đây và mã nguồn dựa vào chúng; đổi bằng ADR). Trigger chỉ đọc bảng của chính module
-- (Hiến chương 5.3); tên bắt đầu pty_ (không staff_/stf_ — src/migrations-n1.test.ts coi đó là trigger siết B5).

CREATE TABLE pty_person_document_type (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 30),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  has_expiry  INTEGER NOT NULL DEFAULT 1 CHECK (has_expiry IN (0, 1)),    -- 0: loại này không có ngày hết hạn; 1: có (để trống = không hạn)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
INSERT INTO pty_person_document_type (code, name, has_expiry, sort_order, created_at, updated_at) VALUES
  ('CCCD', 'Căn cước công dân (CCCD)', 1, 1, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('GPLX', 'Giấy phép lái xe', 1, 2, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('HEALTH_CHECK', 'Khám sức khoẻ', 1, 3, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('TRANSPORT_TRAINING', 'Tập huấn nghiệp vụ vận tải', 1, 4, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z');

-- Hạng giấy phép lái xe (ADR-0040 D2). Nghĩa của hạng (chở tối đa bao nhiêu khách) là luật của Vận chuyển, lượt 1b — KHÔNG ở đây.
-- Hạng cũ mang đuôi _OLD: hạng D mới và hạng D cũ khác nghĩa.
CREATE TABLE pty_license_class (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 1 AND 20),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
INSERT INTO pty_license_class (code, name, sort_order, created_at, updated_at) VALUES
  ('B', 'Hạng B', 1, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('D1', 'Hạng D1', 2, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('D2', 'Hạng D2', 3, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('D', 'Hạng D', 4, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('B2_OLD', 'Hạng B2 (mẫu cũ)', 5, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('C_OLD', 'Hạng C (mẫu cũ)', 6, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('D_OLD', 'Hạng D (mẫu cũ)', 7, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('E_OLD', 'Hạng E (mẫu cũ)', 8, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z');

-- Giấy tờ của người. Chỉ hồ sơ CÁ NHÂN (khoá ngoại tới pty_person). number_key = số đã chuẩn hoá (chữ HOA, bỏ khoảng trắng . - /) do máy chủ tính
-- (src/modules/parties/giay-to.ts). Số và nơi cấp là dữ liệu cá nhân: KHÔNG BAO GIỜ vào nhật ký, Bảng tin, thông báo (ADR-0040 D2).
CREATE TABLE pty_person_document (
  id                  TEXT PRIMARY KEY,
  party_id            TEXT NOT NULL REFERENCES pty_person(party_id),
  document_type_code  TEXT NOT NULL REFERENCES pty_person_document_type(code),
  document_number     TEXT CHECK (document_number IS NULL OR length(trim(document_number)) BETWEEN 1 AND 40),
  number_key          TEXT CHECK (number_key IS NULL OR (number_key = upper(number_key) AND length(number_key) BETWEEN 1 AND 40)),
  license_class_code  TEXT REFERENCES pty_license_class(code),
  issued_date         TEXT CHECK (issued_date IS NULL OR date(issued_date) = issued_date),
  issued_place        TEXT CHECK (issued_place IS NULL OR length(trim(issued_place)) BETWEEN 1 AND 200),
  expiry_date         TEXT CHECK (expiry_date IS NULL OR date(expiry_date) = expiry_date),     -- NULL = không hạn
  previous_id         TEXT REFERENCES pty_person_document(id),                                  -- dòng này GIA HẠN dòng nào
  voided_at           TEXT,                                                                      -- huỷ dòng nhập nhầm (không xoá)
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  CHECK ((document_number IS NULL) = (number_key IS NULL)),
  CHECK (document_number IS NOT NULL OR document_type_code NOT IN ('CCCD', 'GPLX')),
  CHECK ((document_type_code = 'GPLX') = (license_class_code IS NOT NULL)),                     -- hạng chỉ và bắt buộc với GPLX
  CHECK (expiry_date IS NULL OR issued_date IS NULL OR expiry_date >= issued_date),
  CHECK (previous_id IS NULL OR previous_id <> id)
);
CREATE INDEX pty_person_document_party_ix ON pty_person_document(party_id);
CREATE INDEX pty_person_document_number_ix ON pty_person_document(document_type_code, number_key);
-- Một dòng có tối đa MỘT dòng gia hạn còn hiệu lực (không tách nhánh). Dòng gia hạn nhập nhầm bị huỷ thì dòng trước gia hạn lại được.
CREATE UNIQUE INDEX pty_person_document_next_uq ON pty_person_document(previous_id) WHERE previous_id IS NOT NULL AND voided_at IS NULL;

-- Không xoá (Hiến chương 5.5): nhập nhầm thì huỷ dòng.
CREATE TRIGGER pty_person_document_no_delete BEFORE DELETE ON pty_person_document
BEGIN SELECT RAISE(ABORT, 'person_document_no_delete: giấy tờ không xoá — nhập nhầm thì huỷ dòng'); END;
-- Không sửa đè giấy tờ đã có dòng gia hạn (ADR-0040 D1, D2).
CREATE TRIGGER pty_person_document_superseded BEFORE UPDATE ON pty_person_document
WHEN EXISTS (SELECT 1 FROM pty_person_document n WHERE n.previous_id = OLD.id AND n.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'person_document_superseded: giấy tờ đã có dòng gia hạn — không sửa đè'); END;
-- Dòng đã huỷ không sửa được (kể cả bỏ huỷ).
CREATE TRIGGER pty_person_document_voided BEFORE UPDATE ON pty_person_document
WHEN OLD.voided_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'person_document_voided: dòng đã huỷ — không sửa'); END;
-- Không chuyển giấy tờ sang người khác, không đổi loại, không đổi dòng trước, không đổi mốc tạo.
CREATE TRIGGER pty_person_document_identity BEFORE UPDATE ON pty_person_document
WHEN NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.document_type_code IS NOT OLD.document_type_code
  OR NEW.previous_id IS NOT OLD.previous_id OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'person_document_identity: không đổi người, loại, dòng trước, mốc tạo'); END;
-- Gia hạn nối đúng người, đúng loại, dòng trước chưa huỷ.
CREATE TRIGGER pty_person_document_renew_ins BEFORE INSERT ON pty_person_document
WHEN NEW.previous_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM pty_person_document p
  WHERE p.id = NEW.previous_id AND p.party_id = NEW.party_id AND p.document_type_code = NEW.document_type_code AND p.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'person_document_renew_mismatch: dòng gia hạn phải nối dòng chưa huỷ của cùng người, cùng loại'); END;
-- Một số CCCD thuộc đúng MỘT người (ADR-0040 D2; khuôn pty_party_role_group_conflict_ins của 0024). So party_id KHÁC nhau — không UNIQUE(loại, số)
-- phẳng, vì CCCD giữ số qua các lần cấp của CHÍNH người đó. Dòng đã huỷ không tính (nhập nhầm người thì huỷ rồi nhập lại cho đúng người).
CREATE TRIGGER pty_person_document_cccd_one_person_ins BEFORE INSERT ON pty_person_document
WHEN NEW.document_type_code = 'CCCD' AND NEW.voided_at IS NULL AND EXISTS (
  SELECT 1 FROM pty_person_document o
  WHERE o.document_type_code = 'CCCD' AND o.number_key = NEW.number_key AND o.party_id <> NEW.party_id AND o.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'person_document_cccd_other_person: số CCCD này đã thuộc một hồ sơ khác'); END;
CREATE TRIGGER pty_person_document_cccd_one_person_upd BEFORE UPDATE OF number_key ON pty_person_document
WHEN NEW.document_type_code = 'CCCD' AND NEW.voided_at IS NULL AND EXISTS (
  SELECT 1 FROM pty_person_document o
  WHERE o.id <> NEW.id AND o.document_type_code = 'CCCD' AND o.number_key = NEW.number_key AND o.party_id <> NEW.party_id AND o.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'person_document_cccd_other_person: số CCCD này đã thuộc một hồ sơ khác'); END;
```

- [ ] **Bước 4: Sổ dữ liệu.**
  - `docs/data-dictionary.json` thêm ba mục `{ "name": "pty_person_document_type" | "pty_license_class" | "pty_person_document", "module": "parties", "kind": "table" }`.
  - Chạy `npm run dict`.
- [ ] **Bước 5: Xanh:** `node --test src/migrations-giay-to-cua-nguoi.test.ts src/architecture.test.ts` → xanh. Rồi `npm test`.
- [ ] **Bước 6: D1 đọc được tệp.** Chạy `npm run db:migrate:local` → áp `0031`, `0032` không lỗi. Chép đầu ra vào nhật ký. Đây là lần đầu D1 (không phải `node:sqlite`) đọc các trigger này.
- [ ] **Bước 7: P16** — tạm xoá **từng** khối rồi chạy `node --test src/migrations-giay-to-cua-nguoi.test.ts` → đúng ca tương ứng đỏ → hoàn nguyên. Chép nguyên văn mỗi dòng đỏ:
  - `_cccd_one_person_ins` → (d) ca 1;
  - `_cccd_one_person_upd` → (d) ca 3;
  - `_superseded` → (e);
  - `_voided` → (f);
  - `_identity` → (g);
  - `_no_delete` → (h);
  - `_renew_ins` → (i) ca 1;
  - chỉ mục `_next_uq` → (i) ca 2;
  - `CHECK` GPLX ⇔ hạng → (c).
- [ ] **Bước 8: Commit.** "Migration 0032: giấy tờ của người, danh mục loại giấy tờ và hạng giấy phép lái xe (ADR-0040 D2)". Thân:
  - CCCD một người bằng trigger;
  - gia hạn là dòng mới, không sửa đè, không xoá;
  - đã thấy từng trigger chặn thật.

---

### Task A6: Luật thuần giấy tờ của người — `src/modules/parties/giay-to.ts`

**Tệp:** tạo `src/modules/parties/giay-to.ts`, `src/modules/parties/giay-to.test.ts`. Tệp thuần, import bằng đuôi `.ts`, **không** SQL (`src/CLAUDE.md`: SQL chỉ ở `repository.ts`).

**Giao diện tạo ra:**

```ts
import type { Result } from "./rules.ts";
/** Số đã chuẩn hoá để so trùng (CCCD) và che: NFC, chữ HOA, bỏ khoảng trắng . - / */
export function chuanHoaSo(so: string): string;
/** "••••" + 4 ký tự cuối khi số chuẩn hoá dài ≥ 8; ngắn hơn → "••••" (4 ký tự cuối gần là cả số). null → null. */
export function cheSo(numberKey: string | null): string | null;
export interface DanhMucGiayTo { loai: ReadonlyMap<string, { hasExpiry: boolean; active: boolean }>; hang: ReadonlyMap<string, { active: boolean }>; homNay: string }
export interface GiayToNhap { typeCode: string; number: string | null; numberKey: string | null; classCode: string | null; issuedDate: string | null; issuedPlace: string | null; expiryDate: string | null }
export function kiemThemGiayTo(body: Record<string, unknown> | null, dm: DanhMucGiayTo): Result<GiayToNhap>;
/** Gia hạn: KHÔNG gửi số (null/thiếu) ⇒ CHÉP số của dòng trước — số đầy đủ không bao giờ phải ra trình duyệt để gia hạn (Review Focus 3). */
export function kiemGiaHan(body: Record<string, unknown> | null, truoc: { typeCode: string; number: string | null; classCode: string | null }, dm: DanhMucGiayTo): Result<GiayToNhap>;
export type SuaSai = { lyDo: LyDoSuaSai; huy: true; expectedUpdatedAt: string } | { lyDo: LyDoSuaSai; huy: false; truong: TruongSua; giaTri: string | null; expectedUpdatedAt: string };
export function kiemSuaSai(body: Record<string, unknown> | null, hienHanh: GiayToNhap, dm: DanhMucGiayTo): Result<SuaSai>;
/** detail nhật ký — chữ ký hàm KHÔNG nhận số hay nơi cấp (ADR-0040 D2: nhật ký không bao giờ chứa số giấy tờ, chữ tự do của giấy tờ). */
export function chiTietNhatKy(v: { loai: string; hang?: string | null; hetHan?: string | null; giaHan?: boolean; lyDo?: string; truoc?: string | null; sau?: string | null }): string;
```

**Luật kiểm** (mỗi luật một câu báo tiếng Việt):
- **Loại:** phải có trong danh mục và đang dùng.
- **Số:**
  - `CCCD` sau chuẩn hoá đúng **12 chữ số**;
  - `GPLX`: 5–20 ký tự `[0-9A-Z]`;
  - loại khác: không bắt buộc, có thì 1–40 ký tự `[0-9A-Z]`.
- **Hạng:** bắt buộc với GPLX, phải đang dùng; loại khác **không** được có.
- **Ngày cấp:** `YYYY-MM-DD` hợp lệ, ≤ hôm nay.
- **Ngày hết hạn:** hợp lệ, ≥ ngày cấp. Loại `has_expiry = 0` thì không được có.
- **Nơi cấp:** cắt khoảng trắng, 1–200 ký tự.
- **Sửa sai:**
  - lý do phải thuộc `LY_DO_SUA_SAI`; `SAI_NOI_CAP` / `SAI_HANG` chỉ hợp với trường có ở giấy tờ đó;
  - giá trị mới phải **khác** giá trị hiện hành và qua đúng luật của trường;
  - `expectedUpdatedAt` bắt buộc;
  - `NHAP_NHAM_DONG` không nhận giá trị.

- [ ] **Bước 1: Test đỏ** `src/modules/parties/giay-to.test.ts`. Bảng ca, dùng số **giả**:
  - `chuanHoaSo("079 123.456-789")` = `"079123456789"`;
  - `cheSo("079123456789")` = `"••••6789"`; `cheSo("AB12")` = `"••••"`; `cheSo(null)` = `null`;
  - mỗi luật kiểm ở trên có một ca đỏ và một ca xanh;
  - gia hạn không gửi số → `number` = số dòng trước;
  - sửa sai sai lý do, hai trường cùng lúc, giá trị không đổi → từ chối;
  - `chiTietNhatKy` cho đủ sáu lý do → kết quả không chứa `079123456789` hay `123456789` (số không được truyền vào), chỉ có ngày dạng `YYYY-MM-DD`.
- [ ] **Bước 2: Đỏ:** `node --test src/modules/parties/giay-to.test.ts`.
- [ ] **Bước 3: Mã.** Import `LY_DO_SUA_SAI`, `LOAI_CO_DINH` từ `../../shared/giay-to.ts`; `isISODate` từ `../../shared/vn-date.ts`.
- [ ] **Bước 4: Xanh:** tệp trên, rồi `npm test`, `npm run typecheck`.
- [ ] **Bước 5: Commit.** "Luật thuần giấy tờ của người: chuẩn hoá và che số, kiểm thêm/gia hạn/sửa sai, nhật ký không số (ADR-0040 D2)".

---

### Task A7: Route đọc giấy tờ + ô `party.document.view`, `party.document.write` (Ruling R4, R5)

**Tệp:**
- Sửa mã: `src/modules/parties/repository.ts`, `src/modules/parties/index.ts`, `src/shared/contracts.ts`, `src/shared/permissions.ts`.
- Sửa test: `src/shared/permissions.test.ts` (bảng `ADR`, bài ghim `DRIVER`, `ADMIN_NONE_OPS`), `src/modules/orders/xem-don-theo-quyen.test.ts:275-288` (bài ghim Đối tác), `src/route-access.test.ts` (SNAPSHOT +3).
- Tạo test: `src/modules/parties/giay-to-route.test.ts`.

**DTO** (`src/shared/contracts.ts`, cạnh các DTO hồ sơ):

```ts
// ---- Giấy tờ của người (ADR-0040 D2) — số LUÔN che ở mọi DTO dưới đây; số đầy đủ chỉ có ở PersonDocumentRevealResponse. ----
export interface PersonDocumentDto {
  id: string; typeCode: string; typeName: string; classCode: string | null; className: string | null;
  maskedNumber: string | null;           // "••••6789"
  issuedDate: string | null; issuedPlace: string | null; expiryDate: string | null;
  daysLeft: number | null;               // null = không hạn; âm = đã quá hạn (giờ VN)
  previousId: string | null;
  current: boolean;                      // chưa huỷ và không có dòng gia hạn còn hiệu lực
  voided: boolean;
  updatedAt: string;                     // khoá lạc quan của sửa sai
}
export interface PersonDocumentListResponse { documents: PersonDocumentDto[] }
export interface PersonDocumentRevealResponse { number: string }
export interface DocumentTypeDto { code: string; name: string; hasExpiry: boolean; sortOrder: number; active: boolean; updatedAt: string }
export interface LicenseClassDto { code: string; name: string; sortOrder: number; active: boolean; updatedAt: string }
export interface PersonDocumentMetaResponse { types: DocumentTypeDto[]; classes: LicenseClassDto[] }
```

- [ ] **Bước 1: Test đỏ (bảng quyền).**
  - Bảng `ADR` thêm hai dòng đúng mục 1.3.2.
  - Bài ghim `DRIVER` thêm `"party.document.view": "own", "party.document.write": "none"`.
  - Bài ghim Đối tác thêm `"party.document.view": "none", "party.document.write": "none"`, chú thích "ADR-0040 D2: Đối tác không có giấy tờ trong app".
  - `ADMIN_NONE_OPS` thêm `"party.document.view"`, chú thích: "ô `own` của Quản trị — xem giấy tờ người khác qua `party.document.write`". Đếm lại số trong chú thích dòng 193.
- [ ] **Bước 2: Test đỏ (cả ứng dụng)** `src/modules/parties/giay-to-route.test.ts`.
  - Khung: `world()`; `seedStaff` cho các tài khoản `SALES`, `ACCOUNTING`, `ADMIN`, `SUPER_ADMIN`, `FIELD`, `PARTNER`, `DRIVER`.
  - Giấy tờ gieo bằng SQL trên `w.sqlite` (route ghi có ở Task A8) cho hồ sơ `pty-<id tài xế>`: một CCCD số giả `079123456789`, một GPLX hạng D2.
  - Ca:
    - **Route 1 `GET /api/parties/documents/mine`:**
      - tài xế → 200, đúng hai giấy tờ của mình, `maskedNumber` `••••6789`;
      - Bán hàng → 200 `[]`;
      - **Đối tác → 403** đúng mã (R4);
      - tài khoản có `party_id` NULL (chèn thẳng `staff` như `migrations-0024.test.ts:20-28`) → 200 `[]`.
    - **Route 3 `GET /api/parties/:id/documents`:**
      - Bán hàng, Kế toán → **403** đúng mã;
      - Hướng dẫn viên, tài xế → 403 ở cổng `office`;
      - Quản trị, Toàn quyền → 200 có cả dòng lịch sử (`current: false`);
      - id lạ → 404;
      - hồ sơ tổ chức → 200 `[]`.
    - **Route 2 `GET /api/parties/documents/meta`:** Quản trị → 200, 4 loại + 8 hạng; Bán hàng → 403.
    - **Không rò số:** mọi thân trả về ở trên **không** chứa `079123456789`, `123456789`, khoá `document_number` / `number_key`.
- [ ] **Bước 3: Đỏ:** `node --test src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/modules/parties/giay-to-route.test.ts`.
- [ ] **Bước 4: Mã.**
  - `permissions.ts` thêm hai hàng (mục 1.3.2), mỗi hàng một chú thích dẫn ADR-0040 D2 / R5.
  - `repository.ts` (module nghiêm, `defineSql`, câu tĩnh):
    - `LIST_PERSON_DOCS` theo `party_id`: nối loại + hạng; tính `current` bằng `voided_at IS NULL AND NOT EXISTS (SELECT 1 FROM pty_person_document n WHERE n.previous_id = d.id AND n.voided_at IS NULL)`; sắp theo loại rồi `created_at`;
    - `LIST_DOC_TYPES`, `LIST_LICENSE_CLASSES`.
  - `index.ts`:
    - **khai route 1, 2 TRƯỚC** `GET /api/parties/:id` (thói quen dòng 207);
    - hàm ánh xạ `toPersonDocDto(r, today)` dùng `cheSo(r.number_key)` và **không** chép `document_number` / `number_key` ra DTO.
    - Khung route:

```ts
route("GET", "/api/parties/documents/mine", "staff", async ({ env, staff }) => {
  // Ruling R4 + R5 (chủ 28/9: mọi nhân viên nội bộ): cổng "staff"; ô own chặn Đối tác; CHỈ giấy tờ của chính người gọi; số che.
  if (!can(staff, "party.document.view", { ownerId: staff.id })) return DOC_FORBIDDEN();
  if (!staff.partyId) return json({ documents: [] } satisfies PersonDocumentListResponse);
  const today = vnToday(new Date());
  return json({ documents: (await listPersonDocuments(env.DB, staff.partyId)).map((r) => toPersonDocDto(r, today)) } satisfies PersonDocumentListResponse);
}),
route("GET", "/api/parties/:id/documents", "office", async ({ env, params, staff }) => {
  // ADR-0040 D2: party.view KHÔNG mở giấy tờ; người ghi giấy tờ (Quản trị, Toàn quyền) xem danh sách (số che) của người khác.
  if (!can(staff, "party.document.write")) return DOC_FORBIDDEN();
  // … id → findParty → 404; ORGANIZATION → { documents: [] }
}),
```

  - `DOC_FORBIDDEN = () => error(403, "forbidden", "Tài khoản này không xem hay sửa được giấy tờ của người khác.")`.
  - `src/route-access.test.ts`: SNAPSHOT thêm ba dòng (1 `staff`, 2 `office`); sửa con số 86 → 89 và dòng chú thích lịch sử.
- [ ] **Bước 5: Xanh:**
  - `node --test src/modules/parties/giay-to-route.test.ts src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/permission-enforcement.test.ts src/route-write-guard.test.ts src/route-access.test.ts src/architecture.test.ts`.
  - Hàng rào 1 thấy hai ô được hỏi; hàng rào 2 thấy route `office` có `can(` được dùng.
  - Rồi `npm test`, `npm run typecheck`.
- [ ] **Bước 6: P16:**
  - (a) Thay `!can(staff, "party.document.view", { ownerId: staff.id })` bằng `false` → ca Đối tác đỏ (200 ≠ 403).
  - (b) Thay `!can(staff, "party.document.write")` ở route 3 bằng `false` → ca Bán hàng đỏ.
  - (c) Cho `toPersonDocDto` trả `maskedNumber: r.document_number` → ca "không rò số" đỏ.
  - Hoàn nguyên sau mỗi lần; chép nguyên văn.
- [ ] **Bước 7: Commit.** "Giấy tờ của người: xem của chính mình (mọi nhân viên) và danh sách cho người ghi, số luôn che (ADR-0040 D2, Ruling R4, R5)".

---

### Task A8: Route ghi giấy tờ của người — thêm, gia hạn, sửa sai (kể cả huỷ dòng nhập nhầm)

**Tệp:** `src/modules/parties/{repository,index}.ts`, `src/shared/audit-actions.ts` (ba hành động), `src/modules/parties/giay-to-route.test.ts`, `src/route-access.test.ts` (+3 → 92).

- [ ] **Bước 1: Test đỏ** (thêm vào `giay-to-route.test.ts`). Số giả; đếm `audit_log` trước/sau mỗi ca.
  - **Quyền:**
    - Bán hàng, Kế toán × route 4, 5, 6 → **403** đúng mã, không ghi, không dòng nhật ký;
    - tài xế, Hướng dẫn viên → 403 ở cổng.
  - **Thêm:**
    - Quản trị thêm CCCD cho hồ sơ tài xế → **201**; thân là danh sách mới, số che;
    - nhật ký `party_document_added` có `detail` = "Căn cước công dân (CCCD), hết hạn 2030-01-01", không chứa số.
  - **CCCD trùng:**
    - thêm cùng số cho hồ sơ khác → **409 `cccd_taken`**;
    - câu báo không có chữ số nào của số đó;
    - không dòng mới.
  - **Đầu vào sai:**
    - CCCD 11 số → 400;
    - GPLX thiếu hạng → 400;
    - Khám sức khoẻ kèm hạng → 400;
    - loại lạ → 400;
    - loại `has_expiry = 0` (tạo bằng SQL trong test) kèm ngày hết hạn → 400.
  - **Gia hạn:**
    - Gia hạn GPLX **không gửi số** → 201. SQL xác nhận dòng mới có `number_key` bằng dòng cũ. Dòng cũ `current: false`. Nhật ký `party_document_renewed`.
    - Gia hạn dòng cũ lần nữa → **409 `document_not_current`** (lớp route).
  - **Sửa sai:**
    - sửa dòng cũ → **409 `document_not_current`**;
    - dòng hiện hành "Nhập sai ngày hết hạn" → 200; nhật ký `party_document_corrected` có "Nhập sai ngày hết hạn (2030-01-01 → 2031-01-01)";
    - "Nhập sai số" → 200; nhật ký chỉ "Nhập sai số", không chữ số của số cũ lẫn số mới;
    - "Nhập sai số" thành số CCCD của người khác → **409 `cccd_taken`**;
    - `expectedUpdatedAt` cũ → **409 `stale`**;
    - "Nhập nhầm cả dòng" → 200: dòng `voided: true`, vẫn còn trong danh sách, số của dòng đó rảnh cho người khác.
  - **Cấp bậc (Q1, mặc định áp):**
    - Quản trị ghi giấy tờ cho hồ sơ gắn tài khoản Toàn quyền → **403**;
    - Toàn quyền ghi cho chính mình → 201;
    - Quản trị ghi cho hồ sơ không tài khoản → 201.
- [ ] **Bước 2: Đỏ.**
- [ ] **Bước 3: Mã.**
  - **SQL** (`repository.ts`):
    - `FIND_PERSON_DOC` (dòng + cờ hiện hành);
    - `INSERT_PERSON_DOC` (cả `previous_id`);
    - `UPDATE_PERSON_DOC` — một câu tĩnh đặt đủ `document_number, number_key, license_class_code, issued_date, issued_place, expiry_date, updated_at, updated_by` với `WHERE id = ?1 AND party_id = ?2 AND updated_at = ?3`;
    - `VOID_PERSON_DOC` (`SET voided_at, updated_at, updated_by` cùng khoá lạc quan).
  - **Route** (`index.ts`), thứ tự:
    1. `can(staff, "party.document.write")` → 403;
    2. hồ sơ tồn tại → 404;
    3. cấp bậc `acc = await ctx.partyAccount(id); if (acc.linked && !acc.manageable) return DOC_FORBIDDEN();` (Q1);
    4. đọc thân → 400;
    5. điều kiện dòng hiện hành → 409 `document_not_current`;
    6. `db.batch([câu ghi, auditStatement(… "changes() > 0")])`;
    7. `changes = 0` → 409 `stale`.
  - **Ánh xạ lỗi CSDL** `docProblem(e)`:
    - `person_document_cccd_other_person` → 409 `cccd_taken` "Số CCCD này đã có ở một hồ sơ khác. Kiểm tra lại số hoặc hồ sơ.";
    - `person_document_superseded` / `_voided` / `_renew_mismatch` / `UNIQUE constraint failed: pty_person_document.previous_id` → **409 `document_changed`** — mã **khác** lớp route, để P16 của lớp route đỏ được;
    - `FOREIGN KEY` → 400;
    - lạ → ném lên (500).
  - **`audit-actions.ts`:** `party_document_added`, `party_document_renewed`, `party_document_corrected` (nhãn mục 1.1).
  - `detail` dựng bằng `chiTietNhatKy` (Task A6) — không truyền số.
- [ ] **Bước 4: Xanh:**
  - `node --test src/modules/parties/giay-to-route.test.ts src/shared/audit-actions.test.ts src/route-write-guard.test.ts src/route-access.test.ts`;
  - rồi `npm test`, `npm run typecheck`.
- [ ] **Bước 5: P16:**
  - (a) Bỏ lời hỏi `party.document.write` ở route 4 → ca Bán hàng đỏ (201 ≠ 403).
  - (b) Bỏ lời kiểm cấp bậc → ca Quản trị/Toàn quyền đỏ.
  - (c) Bỏ lời kiểm "dòng hiện hành" ở route 6 → ca "sửa dòng cũ" đỏ (`document_changed` ≠ `document_not_current`). Trigger vẫn chặn — đúng hai lớp.
  - (d) Truyền `document_number` vào `detail` → ca nhật ký đỏ.
  - Chép nguyên văn.
- [ ] **Bước 6: Commit.** "Giấy tờ của người: thêm, gia hạn (dòng mới), sửa sai có lý do, huỷ dòng nhập nhầm; nhật ký không số (ADR-0040 D2)".

---

### Task A9: "Xem đủ số" — ô `party.document.reveal`

**Tệp:**
- Sửa mã: `src/modules/parties/{repository,index}.ts`, `src/shared/permissions.ts`, `src/shared/audit-actions.ts`.
- Sửa test: `src/shared/permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts`, `src/modules/parties/giay-to-route.test.ts`, `src/route-access.test.ts` (+1 → 93).

- [ ] **Bước 1: Test đỏ.**
  - **Bảng quyền:**
    - thêm dòng `party.document.reveal` vào bảng `ADR`;
    - bài ghim `DRIVER` và bài ghim Đối tác thêm `"party.document.reveal": "none"`.
  - **Route** `giay-to-route.test.ts`:
    - Bán hàng → **403**, không dòng nhật ký nào mới.
    - Quản trị → **200** `{ number: "079123456789" }` và **đúng một** dòng `party_document_number_viewed`:
      - `target_id` = id hồ sơ;
      - `detail` = "Căn cước công dân (CCCD)";
      - không chữ số của số.
    - Toàn quyền → 200.
    - `:did` thuộc hồ sơ khác → 404.
    - Quản trị trên hồ sơ gắn tài khoản Toàn quyền → **403** (Q1).
    - **Ghi nhật ký lỗi thì không trả số:**
      - trong test, `w.sqlite.exec("ALTER TABLE audit_log RENAME TO audit_log_tam")`;
      - gọi → 500, thân không có số;
      - đổi tên lại.
- [ ] **Bước 2: Đỏ.**
- [ ] **Bước 3: Mã.**
  - `MATRIX` thêm `"party.document.reveal": row("none", "none", "any", "none", "none", "any", "none", "none")`.
  - `FIND_PERSON_DOC_NUMBER` (id + `party_id`).
  - Route 7:
    1. `if (!can(staff, "party.document.reveal")) return …`;
    2. 404 hồ sơ;
    3. cấp bậc;
    4. đọc dòng (404);
    5. `await env.DB.batch([auditStatement(env.DB, { staffId, action: "party_document_number_viewed", at, targetType: "party", targetId: id, detail: typeName })])`;
    6. **rồi mới** `return json({ number } satisfies PersonDocumentRevealResponse)`.
  - Nhãn nhật ký mục 1.1.
- [ ] **Bước 4: Xanh:**
  - `node --test src/modules/parties/giay-to-route.test.ts src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/permission-enforcement.test.ts src/route-access.test.ts`;
  - rồi `npm test`, `npm run typecheck`.
- [ ] **Bước 5: P16:**
  - (a) Bỏ lời hỏi ô → ca Bán hàng đỏ.
  - (b) Đảo thứ tự (trả số trước khi ghi nhật ký, hoặc bắt lỗi nhật ký rồi vẫn trả) → ca "nhật ký lỗi" đỏ.
  - (c) Bỏ lời kiểm cấp bậc → ca Quản trị/Toàn quyền đỏ.
- [ ] **Bước 6: Commit.** "Xem đủ số giấy tờ: ô riêng, mỗi lần xem ghi nhật ký không kèm số (ADR-0040 D2)".

---

### Task A10: Danh mục loại giấy tờ của người và hạng GPLX (ô `admin.manage`)

**Tệp:** `src/modules/parties/{repository,index,giay-to}.ts`, `src/shared/contracts.ts`, `src/shared/audit-actions.ts` (`party_document_catalog_changed`), `src/modules/parties/giay-to-route.test.ts`, `src/route-access.test.ts` (+4 → 97).

- [ ] **Bước 1: Test đỏ.**
  - **Quyền:** Bán hàng → 403 ở cổng `admin`.
  - **Thêm:**
    - Quản trị `POST /api/parties/document-types` `{ code: "THE_HDV", name: "Thẻ hướng dẫn viên", hasExpiry: true, sortOrder: 5 }` → **201**;
    - mã trùng → **409 `code_taken`**;
    - mã sai khuôn → 400.
  - **Sửa:**
    - `PUT …/THE_HDV` với `expectedUpdatedAt` → 200;
    - mốc cũ → **409 `stale`**.
  - **Ngưng:**
    - `active: false` với `CCCD` hoặc `GPLX` → **409 `fixed_type`** "Loại giấy tờ này hệ thống cần dùng, không ngưng được.";
    - ngưng `HEALTH_CHECK` → 200, rồi thêm giấy tờ loại đó → 400 (Task A8).
  - **Hạng:** tương tự cho `license-classes`; ngưng một hạng → thêm GPLX hạng đó → 400.
  - **Nhật ký:** mỗi lần ghi có một dòng `party_document_catalog_changed`, `detail` = "loại giấy tờ: <mã> — <tên>" hoặc "hạng: <mã> — <tên>".
- [ ] **Bước 2: Đỏ.**
- [ ] **Bước 3: Mã.**
  - Khuôn `src/modules/locations/index.ts:36-71`: `access: "admin"` + `if (!can(staff, "admin.manage")) return …` ngay đầu thân (hàng rào 4 đòi ô viết thẳng).
  - Mã không sửa được sau khi tạo: khoá chính, câu UPDATE không đặt `code`.
  - `fixed_type` dựa `LOAI_CO_DINH`.
  - `UNIQUE`/`PRIMARY KEY` → 409 `code_taken`.
- [ ] **Bước 4: Xanh:** `node --test src/modules/parties/giay-to-route.test.ts src/route-write-guard.test.ts src/route-access.test.ts`, rồi `npm test`, `npm run typecheck`.
- [ ] **Bước 5: P16:**
  - (a) Bỏ dòng `if (!can(staff, "admin.manage")) …` ở một route → luật (4) của `src/route-write-guard.test.ts` đỏ. Cổng `admin` chỉ cho Quản trị / Toàn quyền, vốn đều có ô này, nên hành vi không đỏ được — hàng rào tĩnh là lớp duy nhất đo được.
  - (b) Bỏ lời kiểm `fixed_type` → ca CCCD đỏ.
- [ ] **Bước 6: Commit.** "Danh mục loại giấy tờ của người và hạng giấy phép lái xe sửa được trong app (ADR-0040 D2)".

---

### Task A11: Hàm công bố `expiringDriverDocuments` (cho Vận chuyển)

**Tệp:**
- Sửa: `src/modules/parties/repository.ts`, `src/modules/parties/index.ts`.
- Tạo: `src/modules/parties/giay-to-sap-het-han.test.ts` (mức repository, dùng `openDb()` + `fakeD1()` của `tests/audit/harness.mjs`).

**Giao diện tạo ra** (ở `parties/index.ts` — hàm DUY NHẤT mới xuất ra cho module khác):

```ts
/** Giấy tờ sắp hết / đã hết hạn của TÀI XẾ (ADR-0040 D1): hồ sơ đang dùng, đang mở vai tài khoản "Tài xế công ty" (lọc BÁO CÁO trong parties — vai hồ sơ
 *  không bao giờ là điều kiện cho phép, R-N1-12), chỉ dòng hiện hành có ngày hết hạn ≤ `until`. KHÔNG trả số, nơi cấp, id giấy tờ. */
export interface ExpiringPersonDocument { partyId: string; displayName: string; typeName: string; className: string | null; expiryDate: string }
export async function expiringDriverDocuments(db: D1Database, v: { today: string; until: string }): Promise<ExpiringPersonDocument[]>;
```

- [ ] **Bước 1: Test đỏ.** Gieo trên `openDb()`:
  - (a) tài xế A (vai `DRIVER_INTERNAL` đang mở): CCCD hết hạn sau 10 ngày, GPLX đã hết hạn 3 ngày;
  - (b) Hướng dẫn viên B (`GUIDE_INTERNAL`): CCCD hết hạn sau 5 ngày;
  - (c) tài xế C đã kết thúc vai hôm qua;
  - (d) tài xế D hồ sơ `active = 0`;
  - (e) A có một dòng đã gia hạn (cũ) và một dòng đã huỷ, đều hết hạn trong khoảng;
  - (f) A có Khám sức khoẻ không hạn;
  - (g) A có Tập huấn hết hạn sau 60 ngày.
  - Gọi hàm repository với `until = today + 30`. Kỳ vọng:
    - **đúng hai dòng của A** (CCCD, GPLX), xếp theo `expiryDate`;
    - không có B, C, D, dòng cũ, dòng huỷ, dòng không hạn, dòng 60 ngày;
    - `Object.keys` mỗi dòng đúng `["partyId", "displayName", "typeName", "className", "expiryDate"]`.
  - Ngoài ra kiểm câu SQL không chọn cột `document_number` / `number_key` / `issued_place`: đọc `registeredSql()` tên `parties.expiring_driver_documents`.
- [ ] **Bước 2: Đỏ.**
- [ ] **Bước 3: Mã.**
  - `EXPIRING_DRIVER_DOCS = defineSql("parties", "expiring_driver_documents", …)`, tham số `?1` = mã vai (hằng `DRIVER_INTERNAL` lấy từ `ROLE_CODES` của `src/shared/roles.ts`, không viết chuỗi rời), `?2` = hôm nay, `?3` = `until`.
  - Điều kiện vai đang mở: `r.valid_to_date IS NULL OR r.valid_to_date >= ?2`.
  - Hàm `index.ts` ánh xạ sang `ExpiringPersonDocument`.
  - Thêm **đúng** hai tên vào phần xuất của `index.ts`: hàm + kiểu.
- [ ] **Bước 4: Xanh:** tệp trên + `node --test src/architecture.test.ts` (R-N1-12: câu tra nằm trong `parties`), rồi `npm test`.
- [ ] **Bước 5: P16:**
  - (a) Bỏ điều kiện vai → ca B đỏ.
  - (b) Thêm `d.document_number` vào SELECT → ca khoá cột đỏ.
- [ ] **Bước 6: Commit.** "Hàm công bố giấy tờ sắp hết hạn của tài xế — không trả số (ADR-0040 D1)".

---

### Task A12: Migration 0033 — bảng `vc_*`; sổ dữ liệu; bản đồ kiến trúc (NỚI — chờ chủ duyệt)

**Tệp:**
- Tạo: `migrations/0033_van_chuyen_xe.sql`, `src/migrations-van-chuyen-xe.test.ts`.
- Sửa: `docs/data-dictionary.json` (+ `"van-chuyen"` ở `modules`, + 4 bảng) → `npm run dict`; `src/architecture.test.ts` (`ALLOWED_EDGES`, `TABLE_PREFIX`, `VIEW_PREFIX`).

- [ ] **Bước 1: Test đỏ** `src/migrations-van-chuyen-xe.test.ts` (tìm tệp theo đuôi `_van_chuyen_xe.sql`):
  - (a) **Tệp:**
    - đúng một tệp;
    - trigger tên bắt đầu `vc_`;
    - văn bản không dãy ≥ 8 chữ số (bỏ chú thích, bỏ chuỗi ngày/giờ, bỏ UUID), không `@`.
  - (b) **Dữ liệu gieo:**
    - 6 loại giấy tờ xe đúng mục 1.6;
    - `vc_expiry_policy` đúng một dòng 30 ngày.
  - (c) **`CHECK` trạng thái** = `Object.keys(TRANG_THAI_XE)`: chèn thử từng giá trị → qua; `'broken'` → `CHECK`.
  - (d) **Biển số:**
    - trùng biển với xe chưa ngừng (kể cả khác cách viết "79B 01234") → `UNIQUE constraint failed: vc_vehicle.plate_key`;
    - ngừng xe cũ (kèm ngày) → xe mới dùng lại biển;
    - dùng lại xe cũ khi biển đã có chủ → chặn.
  - (e) **Số khung:** trùng → `UNIQUE constraint failed: vc_vehicle.chassis_key`.
  - (f) **Ngừng / số người:**
    - ngừng thiếu ngày → `CHECK`;
    - `passenger_capacity` 0 → `CHECK`.
  - (g) **Chủ xe:** không tồn tại → `FOREIGN KEY`.
  - (h) **Không xoá:**
    - xoá xe → `vehicle_no_delete`;
    - xoá giấy tờ xe → `vehicle_document_no_delete`.
  - (i) **Giấy tờ xe:**
    - sửa đè dòng đã gia hạn → `vehicle_document_superseded`;
    - sửa dòng huỷ → `vehicle_document_voided`;
    - đổi xe của giấy tờ → `vehicle_document_identity`;
    - gia hạn nối sang xe khác → `vehicle_document_renew_mismatch`;
    - gia hạn lần hai → `UNIQUE constraint failed: vc_vehicle_document.previous_id`.
  - (j) **Chính sách:**
    - sửa / xoá dòng → `expiry_policy_append_only`;
    - chèn dòng mới → dòng hiệu lực (`valid_from_at <= now` mới nhất) đổi theo.
  - (k) **Sổ dữ liệu:** bốn bảng, module `van-chuyen`, `kind: "table"`.
- [ ] **Bước 2: Đỏ.**
- [ ] **Bước 3: Viết migration** `migrations/0033_van_chuyen_xe.sql`. Nội dung đã thử trên SQLite nháp; `<ID_NGUONG_MAC_DINH>` là UUID sinh **một lần** bằng `node -e 'console.log(crypto.randomUUID())'`:

```sql
-- Migration 0033 — ADR-0040 D1 (accepted 2026-09-28): phân hệ Vận chuyển, lượt 1a — module van-chuyen (tiền tố vc_). CHỈ THÊM.
-- Xe (thực thể có vòng đời), giấy tờ xe (do bên ngoài cấp; gia hạn = dòng mới, không sửa đè), danh mục loại giấy tờ xe (Quản trị sửa trong app — khuôn
-- loc_location: dấu vết, active, khoá lạc quan, nhật ký cùng lô; khoá chính là mã), chính sách ngưỡng "sắp hết hạn" (dòng có ngày hiệu lực, CHỈ THÊM —
-- Hiến chương 5.2; chỉ Toàn quyền đổi, ô settings.ops). Trigger chỉ đọc bảng vc_ (Hiến chương 5.3). Không có dữ liệu cá nhân nào ở đây.

CREATE TABLE vc_vehicle_document_type (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 30),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  has_expiry  INTEGER NOT NULL DEFAULT 1 CHECK (has_expiry IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
-- Giá trị mặc định: dữ liệu tra ngày 27/9 (thiết kế §10), sửa được trong app.
INSERT INTO vc_vehicle_document_type (code, name, has_expiry, sort_order, created_at, updated_at) VALUES
  ('REGISTRATION', 'Đăng ký xe', 0, 1, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('INSPECTION', 'Kiểm định', 1, 2, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('TPL_INSURANCE', 'Bảo hiểm trách nhiệm dân sự', 1, 3, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('CONTRACT_BADGE', 'Phù hiệu xe hợp đồng', 1, 4, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('TRIP_MONITOR', 'Giám sát hành trình', 1, 5, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'),
  ('DRIVER_CAMERA', 'Camera người lái', 1, 6, '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z');

-- Xe. Biển số: duy nhất trong các xe CHƯA NGỪNG (xe bảo dưỡng vẫn giữ biển); số khung: định danh bền (máy chủ bắt buộc — câu hỏi Q2; cột để NULL được
-- để đổi luật không phải dựng lại bảng). passenger_capacity = số người được chở KHÔNG kể tài xế (giấy cũ ghi 16 chỗ thì nhập 15). Chủ xe = khoá tới
-- hồ sơ (lượt 1a: hồ sơ công ty chủ lúc thêm xe; đổi công ty chủ sau này KHÔNG tự đổi chủ xe — ADR-0040 D1). Trạng thái: tập ĐÓNG (đổi bằng ADR).
CREATE TABLE vc_vehicle (
  id                  TEXT PRIMARY KEY,
  plate_number        TEXT NOT NULL CHECK (length(trim(plate_number)) BETWEEN 4 AND 20),
  plate_key           TEXT NOT NULL CHECK (plate_key = upper(plate_key) AND length(plate_key) BETWEEN 4 AND 20),
  chassis_number      TEXT CHECK (chassis_number IS NULL OR length(trim(chassis_number)) BETWEEN 5 AND 30),
  chassis_key         TEXT CHECK (chassis_key IS NULL OR (chassis_key = upper(chassis_key) AND length(chassis_key) BETWEEN 5 AND 30)),
  name                TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  model_year          INTEGER CHECK (model_year IS NULL OR model_year BETWEEN 1950 AND 2100),
  passenger_capacity  INTEGER NOT NULL CHECK (passenger_capacity BETWEEN 1 AND 100),
  owner_party_id      TEXT NOT NULL REFERENCES pty_party(id),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  valid_from_date     TEXT NOT NULL CHECK (date(valid_from_date) = valid_from_date),
  valid_to_date       TEXT CHECK (valid_to_date IS NULL OR (date(valid_to_date) = valid_to_date AND valid_to_date >= valid_from_date)),
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  CHECK ((chassis_number IS NULL) = (chassis_key IS NULL)),
  CHECK ((status = 'retired') = (valid_to_date IS NOT NULL))
);
CREATE UNIQUE INDEX vc_vehicle_plate_open_uq ON vc_vehicle(plate_key) WHERE status <> 'retired';
CREATE UNIQUE INDEX vc_vehicle_chassis_uq ON vc_vehicle(chassis_key) WHERE chassis_key IS NOT NULL;
CREATE INDEX vc_vehicle_owner_ix ON vc_vehicle(owner_party_id);
CREATE TRIGGER vc_vehicle_no_delete BEFORE DELETE ON vc_vehicle
BEGIN SELECT RAISE(ABORT, 'vehicle_no_delete: xe không xoá — chuyển sang Ngừng dùng'); END;

-- Giấy tờ xe. Số không che (không phải dữ liệu cá nhân — ADR-0040 D2 chỉ nói giấy tờ của người). Cùng khuôn gia hạn / huỷ dòng như giấy tờ của người.
CREATE TABLE vc_vehicle_document (
  id                  TEXT PRIMARY KEY,
  vehicle_id          TEXT NOT NULL REFERENCES vc_vehicle(id),
  document_type_code  TEXT NOT NULL REFERENCES vc_vehicle_document_type(code),
  document_number     TEXT CHECK (document_number IS NULL OR length(trim(document_number)) BETWEEN 1 AND 60),
  issued_date         TEXT CHECK (issued_date IS NULL OR date(issued_date) = issued_date),
  expiry_date         TEXT CHECK (expiry_date IS NULL OR date(expiry_date) = expiry_date),
  previous_id         TEXT REFERENCES vc_vehicle_document(id),
  voided_at           TEXT,
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  CHECK (expiry_date IS NULL OR issued_date IS NULL OR expiry_date >= issued_date),
  CHECK (previous_id IS NULL OR previous_id <> id)
);
CREATE INDEX vc_vehicle_document_vehicle_ix ON vc_vehicle_document(vehicle_id);
CREATE UNIQUE INDEX vc_vehicle_document_next_uq ON vc_vehicle_document(previous_id) WHERE previous_id IS NOT NULL AND voided_at IS NULL;
CREATE TRIGGER vc_vehicle_document_no_delete BEFORE DELETE ON vc_vehicle_document
BEGIN SELECT RAISE(ABORT, 'vehicle_document_no_delete: giấy tờ xe không xoá — nhập nhầm thì huỷ dòng'); END;
CREATE TRIGGER vc_vehicle_document_superseded BEFORE UPDATE ON vc_vehicle_document
WHEN EXISTS (SELECT 1 FROM vc_vehicle_document n WHERE n.previous_id = OLD.id AND n.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'vehicle_document_superseded: giấy tờ đã có dòng gia hạn — không sửa đè'); END;
CREATE TRIGGER vc_vehicle_document_voided BEFORE UPDATE ON vc_vehicle_document
WHEN OLD.voided_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'vehicle_document_voided: dòng đã huỷ — không sửa'); END;
CREATE TRIGGER vc_vehicle_document_identity BEFORE UPDATE ON vc_vehicle_document
WHEN NEW.id IS NOT OLD.id OR NEW.vehicle_id IS NOT OLD.vehicle_id OR NEW.document_type_code IS NOT OLD.document_type_code
  OR NEW.previous_id IS NOT OLD.previous_id OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'vehicle_document_identity: không đổi xe, loại, dòng trước, mốc tạo'); END;
CREATE TRIGGER vc_vehicle_document_renew_ins BEFORE INSERT ON vc_vehicle_document
WHEN NEW.previous_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM vc_vehicle_document p
  WHERE p.id = NEW.previous_id AND p.vehicle_id = NEW.vehicle_id AND p.document_type_code = NEW.document_type_code AND p.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'vehicle_document_renew_mismatch: dòng gia hạn phải nối dòng chưa huỷ của cùng xe, cùng loại'); END;

-- Ngưỡng "sắp hết hạn" (số ngày) — chính sách có ngày hiệu lực (ADR-0040 D1; Hiến chương 5.2). Dòng hiệu lực = valid_from_at mới nhất ≤ bây giờ.
-- CHỈ THÊM: đổi = chèn dòng mới (máy chủ đặt valid_from_at = bây giờ, không lùi); không sửa, không xoá.
CREATE TABLE vc_expiry_policy (
  id             TEXT PRIMARY KEY,
  warn_days      INTEGER NOT NULL CHECK (warn_days BETWEEN 1 AND 365),
  valid_from_at  TEXT NOT NULL UNIQUE,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT
);
INSERT INTO vc_expiry_policy (id, warn_days, valid_from_at, created_at, updated_at) VALUES
  ('<ID_NGUONG_MAC_DINH>', 30, '2026-09-01T00:00:00.000Z', '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z');
CREATE TRIGGER vc_expiry_policy_no_update BEFORE UPDATE ON vc_expiry_policy
BEGIN SELECT RAISE(ABORT, 'expiry_policy_append_only: chính sách chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER vc_expiry_policy_no_delete BEFORE DELETE ON vc_expiry_policy
BEGIN SELECT RAISE(ABORT, 'expiry_policy_append_only: chính sách không xoá'); END;
```

- [ ] **Bước 4: Sổ dữ liệu và bản đồ kiến trúc.**
  - `docs/data-dictionary.json`:
    - `modules` thêm `"van-chuyen"`;
    - `tables` thêm `vc_vehicle`, `vc_vehicle_document`, `vc_vehicle_document_type`, `vc_expiry_policy` (module `van-chuyen`, `kind: "table"`);
    - chạy `npm run dict`.
  - `src/architecture.test.ts` — ba chỗ **nới**, mỗi chỗ chú thích "ADR-0040 D1 … NỚI hàng rào đã duyệt (Điều 9.4) — CHỜ CHỦ DUYỆT ở `docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md` trước khi gộp":
    - `ALLOWED_EDGES` thêm `"van-chuyen": ["parties", "audit"]`, chú thích: "ownerCompany (chủ xe), expiringDriverDocuments (danh sách sắp hết hạn), khoá ngoại vc_vehicle.owner_party_id; auditStatement; không module nào import van-chuyen";
    - `TABLE_PREFIX` thêm `vc_: "van-chuyen"`;
    - `VIEW_PREFIX` thêm `vc: "van-chuyen"`.
  - `STRICT` thêm ở Task A13, khi `repository.ts` có thật.
- [ ] **Bước 5: Xanh:** `node --test src/migrations-van-chuyen-xe.test.ts src/architecture.test.ts` → xanh (khoá ngoại xuyên module đúng chiều nhờ cạnh mới; tiền tố đúng module). Rồi `npm test`.
- [ ] **Bước 6: D1:** `npm run db:migrate:local` → áp `0033` không lỗi. Chép đầu ra.
- [ ] **Bước 7: P16** — tạm xoá từng khối → đúng ca đỏ → hoàn nguyên; chép nguyên văn:
  - `vc_vehicle_plate_open_uq` → (d);
  - `vc_vehicle_chassis_uq` → (e);
  - `CHECK` ngừng ⇔ ngày → (f);
  - `vc_vehicle_no_delete` → (h);
  - bốn trigger giấy tờ xe + `_next_uq` → (i);
  - hai trigger chính sách → (j);
  - bỏ `"parties"` khỏi `ALLOWED_EDGES["van-chuyen"]` → bài khoá ngoại xuyên module của `src/architecture.test.ts` đỏ ("cạnh van-chuyen → parties chưa được phép").
- [ ] **Bước 8: Commit.** "Migration 0033: xe, giấy tờ xe, danh mục, ngưỡng sắp hết hạn (ADR-0040 D1); tiền tố vc_ và cạnh van-chuyen chờ chủ duyệt". Thân: ba chỗ nới ghi ở tệp đề xuất luật mục 1.

---

<!-- TIEP-THEO: Task A13 trở đi -->
