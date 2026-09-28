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

<!-- TIEP-THEO: phần 6 trở đi -->
