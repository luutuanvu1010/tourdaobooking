# Đối chiếu hệ thống `tourdao-sales` với hai tài liệu tham chiếu Oracle TCA

- **Ngày:** 2026-09-21   **Loại:** báo cáo rà soát + đề xuất (KHÔNG phải ADR; không đổi mã, không đổi schema)
- **Trạng thái:** NHÁP — chờ chủ dự án duyệt phần "Đề xuất" (mục 6). Quyết định kiến trúc nào rút ra từ đây phải thành ADR mới (CLAUDE.md §6).
- **Tài liệu tham chiếu** (đặt ở `docs/Ref/`, hiện chưa được git theo dõi):
  - `thiet-ke-party-relationship-tca.md` — sơ đồ + DDL mẫu Party/Relationship theo Oracle Trading Community Architecture (gọi tắt **TCA-1**).
  - `Oracle-crm-triet-ly-va-checklist.md` — sáu triết lý, cấu trúc CRM và checklist bốn nhóm (gọi tắt **ORA-2**).
- **Đối tượng rà soát:** nhánh `main` @ `8c16767` (gồm v1.0, chế độ bảo trì, Góp ý), đọc mã và tài liệu tại checkout đó.

## 0. Phương pháp và giới hạn

**Đã làm:** đọc hai tài liệu tham chiếu; đọc `migrations/0003, 0004, 0006, 0007, 0008, 0011, 0012, 0014`, `src/shared/permissions.ts`, `src/shared/audit-actions.ts`, `src/modules/orders/{rules,index}.ts`, `src/modules/parties/{rules,index}.ts`, `docs/ARCHITECTURE.md`, `docs/DATA-DICTIONARY.md`, `docs/adr/ADR-0001, 0003, 0004, 0007`, `scripts/audit-checks.mjs` (danh sách mã kiểm).

**Chưa làm (không khẳng định):**
- Không chạy `npm test`, `typecheck`, e2e; không đụng D1 local hay remote. Mọi nhận định về **schema production** dựa trên tệp migration trong repo; nếu production lệch repo (xem ghi nhớ "lệch production Góp ý vs bảo trì") thì phải kiểm bằng `d1 migrations list --remote`.
- Không đọc hết thân từng route/service; các câu "không có X" nghĩa là **grep/đọc các tệp nêu trên không thấy X**, không phải bằng chứng phủ định tuyệt đối.
- Không đọc `docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md`, ADR-0002/0005/0006/0008/0009 toàn văn (chỉ trích dòng cần).

**Thang kết luận dùng trong báo cáo:**
| Nhãn | Nghĩa |
|---|---|
| **KHỚP** | Hệ thống thực hiện đúng tinh thần tiêu chí, có bằng chứng trong mã/schema |
| **KHỚP MỘT PHẦN** | Có nhưng thiếu một mặt của tiêu chí |
| **LỆCH CÓ CHỦ Ý** | Khác tham chiếu, và đã có ADR/lộ trình nói rõ lý do |
| **THIẾU** | Tiêu chí có giá trị với dự án này, chưa thấy gì trong mã/ADR |
| **KHÔNG ÁP DỤNG** | Tiêu chí thuộc bài toán mà dự án không có |

---

## 1. Đối chiếu TCA-1 — sơ đồ và DDL mẫu

### 1.1 Bảng gốc `parties`

| Cột/ý của tham chiếu | Hiện trạng (`migrations/0011_parties.sql`) | Kết luận |
|---|---|---|
| Một bảng gốc cho mọi cá nhân/tổ chức | `pty_party(id, party_kind, display_name, active, created_*, updated_*)` | **KHỚP** |
| `party_type IN ('PERSON','ORGANIZATION')` | `party_kind … CHECK IN ('PERSON','ORGANIZATION')` (tập đóng, đúng ADR-0003 điều 3) | **KHỚP** |
| Tách thuộc tính theo loại | `pty_person(given/family/middle_name)`, `pty_organization(legal_name, tax_code, address, invoice_email)` — bảng con 1–1 khoá `party_id` | **KHỚP** (chi tiết hơn tham chiếu, vốn nhét chung một bảng) |
| `party_number` — mã định danh toàn hệ thống, `UNIQUE NOT NULL` | Chỉ có `id TEXT` (uuid). **Không có mã người-đọc-được** cho hồ sơ (đơn thì có `order_code`, dạng `TD-YYYYMMDD-NNNN`) | **THIẾU** (mức thấp; xem đề xuất P-9) |
| `tax_identifier` (MST/CCCD) trên bảng gốc | MST nằm ở `pty_organization.tax_code` (10 hoặc 13 số, hoặc `10số-3số`: `CHECK` độ dài 10–14 ở CSDL + regex `^\d{10}(\d{3}|-\d{3})?$` ở `parties/rules.ts`). Cá nhân **không có** CCCD | **KHỚP MỘT PHẦN** — bỏ CCCD là có lợi về dữ liệu cá nhân; MST chỉ kiểm khuôn dạng |
| `status IN ('ACTIVE','INACTIVE','MERGED')` | `active INTEGER 0/1`. Không có trạng thái gộp, không có `merged_into_id` | **LỆCH CÓ CHỦ Ý** — gộp hồ sơ hẹn ở N2 (ADR-0001 mục 8: `pty_party.merged_into_id`) |
| `created_at/updated_at` kiểu timestamp tz | `created_at/updated_at TEXT` ISO UTC, thêm `created_by/updated_by` | **KHỚP** (đúng ADR-0003 điều 6, hơn tham chiếu) |

### 1.2 Bảng mối quan hệ và vai trò `party_relationships`

TCA-1 gộp **hai khái niệm** trong một bảng: `relationship_code` vừa là vai trò (`CUSTOMER`, `SUPPLIER`) vừa là quan hệ chủ thể–đối tượng (`object_party_id` nullable). Hệ thống tách hai bảng:

| Khái niệm | Hiện trạng | Bằng chứng |
|---|---|---|
| **Vai trò** của một hồ sơ (khách, đại lý, hướng dẫn viên, tài xế, nhân sự…) | `pty_party_role(party_id, role_type_code, location_id, valid_from_date, valid_to_date)` + bảng tra cứu `pty_role_type` (8 mã gieo sẵn: `STAFF, SALES, ACCOUNTANT, GUIDE, BOAT_CAPTAIN, DRIVER, AGENT, CUSTOMER`) | `0011` dòng 68–100 |
| **Quan hệ** giữa hai hồ sơ | `pty_party_relationship(from_party_id, to_party_id, relationship_type_code, …)` + tra cứu `pty_relationship_type` (chỉ `CONTACT_OF`), `CHECK (from ≠ to)` | `0011` dòng 108–140 |
| Hiệu lực theo ngày | `valid_from_date`, `valid_to_date` có `CHECK` `date()` và `to ≥ from` | cả hai bảng |
| Chống trùng | Chỉ mục duy nhất một phần `WHERE valid_to_date IS NULL` (tối đa một dòng mở) **cộng** trigger chống chồng lấn khoảng đã đóng (`pty_party_role_no_overlap_*`, `pty_relationship_no_overlap_*`) | `0011` |

**Kết luận: KHỚP, và chặt hơn tham chiếu.** TCA-1 chỉ có `UNIQUE (subject, object, code, start_date)` — không chặn hai khoảng chồng nhau. Việc tách vai trò/quan hệ đúng với TCA gốc của Oracle (party *usage* khác party *relationship*), còn TCA-1 đang gộp lại cho gọn.

**Khoảng trống nhỏ:** `pty_role_type` không có `SUPPLIER`/`PARTNER`. Ví dụ tham chiếu ("Công ty A vừa là khách vừa là nhà cung cấp") hiện **chưa biểu diễn được** vì chưa có mã nhà cung cấp. Thêm là một dòng dữ liệu (bảng tra cứu) — không đổi schema — nhưng chỉ nên làm khi có nghiệp vụ mua vào (N4, giá net HDV). Xem P-8.

### 1.3 Bảng tài khoản giao dịch `customer_accounts`

| Thành phần tham chiếu | Hiện trạng | Kết luận |
|---|---|---|
| `credit_limit`, `payment_terms` (công nợ, NET30) | Không có. Đơn tour thu cọc/còn lại theo từng đơn (`orders.deposit_amount`, `remaining_amount`), không có hạn mức công nợ theo khách | **KHÔNG ÁP DỤNG** hiện nay (tour trả trước/trả khi đi); nếu sau này có đại lý công nợ thì thành bài toán N3/N4 |
| `account_number`, `account_name` gắn `party_id` + `relationship_id` | Không có lớp "tài khoản giao dịch". Đơn gắn thẳng người lập (`orders.staff_id`) và chứa tên/SĐT khách nhập trực tiếp | **LỆCH CÓ CHỦ Ý** — đại lý/khách chỉ được trỏ vào đơn ở N2 (`booker_party_id`, `traveller_party_id`, ADR-0001 mục 7) |
| Sổ thu tiền theo mối quan hệ | Ba cột `orders.deposit_amount/deposit_method/remaining_amount`; module `billing` (`bil_*`) là N3 (ADR-0004) | **LỆCH CÓ CHỦ Ý** |

### 1.4 Địa điểm và địa chỉ: `locations` + `party_sites`

| Thành phần tham chiếu | Hiện trạng | Kết luận |
|---|---|---|
| Tách vị trí địa lý khỏi mục đích dùng (`locations` ↔ `party_sites`) | `loc_location` (module `locations`, có `loc_location_type`) là **danh mục nơi dịch vụ** (bến, điểm đón, khu…), không phải địa chỉ hồ sơ. Vai trò hồ sơ trỏ được `pty_party_role.location_id` (ADR-0008); phân công có `dsp_assignment.location_id` + `place_text` | **KHỚP MỘT PHẦN** — tách vị trí khỏi hồ sơ có, nhưng khác nghĩa với TCA |
| `is_bill_to`, `is_ship_to` | Không có. Địa chỉ xuất hoá đơn là **cột chuỗi** `pty_organization.address` + `invoice_email` (một địa chỉ duy nhất/tổ chức); cá nhân không có địa chỉ | **KHỚP MỘT PHẦN / LỆCH CÓ CHỦ Ý** — tour không có "giao hàng"; "bill-to" gộp vào tổ chức. Có thể vướng khi một đại lý có nhiều pháp nhân xuất hoá đơn, nhưng ADR-0004 lưu thông tin xuất theo bản chụp trên từng yêu cầu nên nhu cầu này có thể không xuất hiện (xem P-7) |
| Liên hệ (điện thoại, email) tách khỏi hồ sơ | `pty_contact_point` (`PHONE`/`EMAIL`, `is_primary`, hiệu lực ngày, chỉ mục duy nhất "một liên hệ chính đang mở"), `value_normalized` để tra | **KHỚP**; ORA-2 nhóm 1 cũng đòi tách `Contacts` |

### 1.5 Ba quy tắc bất biến của TCA-1

| # | Quy tắc tham chiếu | Hiện trạng | Kết luận |
|---|---|---|---|
| 1 | **Không mồ côi**: không tạo bản ghi con khi thiếu `party_id` | Mọi bảng `pty_*`, `dsp_assignment.party_id`, `staff.party_id` có khoá ngoại `NO ACTION`; `audit-invariants` có `R-N1-10` (`PRAGMA foreign_key_check`), `R-N1-2` (hồ sơ PERSON phải có `pty_person`). **Nhưng** `staff.party_id` còn nullable: `R-N1-1` chỉ là `warn-unless-strict` cho tới B5 (`staff_party_required`, số `0017`) | **KHỚP MỘT PHẦN** — chờ B5 |
| 2 | **Không trùng định danh**: MST của ORGANIZATION kiểm trùng trước khi tạo | **Không có.** `pty_organization.tax_code` không có `UNIQUE`; `parties/rules.ts` không kiểm trùng; tra trùng dựa vào **số điện thoại chuẩn hoá** qua `GET /api/parties/lookup?phone=` (giao diện `web/parties.ts` gọi khi tạo hồ sơ), còn chỉ mục `pty_contact_lookup_ix` **cố ý không duy nhất** (ADR-0001 mục 8: số dùng chung là chuyện thật) | **LỆCH — CẦN QUYẾT** (xem P-3): ADR-0001 mục 8 quyết cách nhận dạng bằng SĐT, nhưng **không** nói gì về MST; đây là khoảng trống, không phải quyết định đã chốt |
| 3 | **Hiệu lực theo thời gian** | `valid_from/to_date` (ngày dân sự VN) và `valid_from/to_at` (UTC) trên vai trò, quan hệ, liên hệ, quyền app (`stf_permission`), phân công (`dsp_assignment`); không xoá cứng (ADR-0003 điều 8) | **KHỚP** |

### 1.6 Ví dụ minh hoạ (Công ty A vừa là khách vừa là nhà cung cấp)

- Phần "một `party` duy nhất, nhiều vai trò": **làm được** (`pty_party_role` nhiều dòng cho cùng `party_id`, đã kiểm bằng chỉ mục "một dòng mở trên mỗi (hồ sơ, vai trò, nơi)").
- Phần "khi mua hàng trỏ về `customer_accounts`, khi bán trỏ về sổ Mua hàng": **chưa làm được**, vì đơn chưa trỏ hồ sơ khách (N2) và không có nghiệp vụ mua vào (N4).
- Hệ quả thực tế hôm nay: **cùng một khách đặt hai đơn = hai bộ tên/SĐT chép tay trong `orders`**, "dữ liệu tên, MST, địa chỉ đồng bộ 100%" chưa xảy ra cho khách. Nó đã xảy ra cho **nhân sự** (mọi `staff` có hồ sơ PERSON, `v_stf_staff_label`).

---

## 2. Đối chiếu ORA-2 mục I — sáu triết lý

### Triết lý 1 — Mô hình hoá định danh trước vai trò — **KHỚP MỘT PHẦN**
- **Có:** hồ sơ gốc + vai trò/quan hệ có hiệu lực (mục 1.1–1.2). "Quyền app" (`SALES/ACCOUNTING/ADMIN/FIELD`) **không** phải vai trò hồ sơ và bị cấm dùng làm điều kiện lẫn nhau (ghi ở đầu `permissions.ts`, ADR-0005, mã luật `R-N1-12` theo tệp đó) — tách đúng "định danh ≠ quyền".
- **Thiếu:** thực thể quan trọng nhất của CRM, **khách hàng**, chưa nằm trong lớp Party (đơn còn `customer_name/phone/email` — `migrations/0003_orders.sql` dòng 7–9). Đây là lệch lớn nhất, đã có lộ trình N2.

### Triết lý 2 — Chuyển trạng thái hợp lệ là đơn vị hành vi — **KHỚP MỘT PHẦN**
- **Có (mức ứng dụng):** `orders/rules.ts` khai `TRANSITIONS` (`draft→confirmed|cancelled`, `confirmed→cancelled`, `cancelled→∅`) và `canTransition`; route `POST /api/orders/:id/status` kiểm `canTransition` rồi mới ghi, câu ghi có điều kiện `WHERE status = ?` (chống đua) và ghi nhật ký cùng batch. Phân công có lệnh riêng (`dispatch.assign`, `dispatch.claim`). Ticket Góp ý có luật chuyển ở `src/shared/feedback-catalog.ts`. Giao diện chỉ phát lệnh, không sửa cột trạng thái.
- **Thiếu (mức CSDL):** trong `migrations/` chỉ có trigger `orders_confirm_requires_trip` (khi chuyển sang `confirmed` phải đủ chuyến) và trigger đóng băng dịch vụ. **Không có trigger nào chặn** `cancelled→confirmed` hay `confirmed→draft`: điều kiện của `orders_confirm_requires_trip` là `NEW.status='confirmed' AND OLD.status<>'confirmed'`, tức đơn **đã huỷ** vẫn chuyển được về `confirmed` nếu chuyến còn đủ. Luật "không có đường quay lại" chỉ sống ở `canTransition` (mã). Tham chiếu ORA-2 triết lý 3 đòi luật này nằm gần dữ liệu. Xem P-2.

### Triết lý 3 — Đưa bất biến gần nơi lưu trữ — **KHỚP** (điểm mạnh của dự án)
- Tiền: trigger `order_item_money_*`, `orders_money_*` (`0007`) giữ `line_total = quantity × unit_price`, `total = subtotal − discount`, `remaining = total − deposit`, không âm.
- Đóng băng: `order_service_frozen_*`; xác nhận đủ chuyến: `orders_confirm_requires_trip`; `order_service_confirmed_keeps_date`.
- Hồ sơ/phân công: chỉ mục duy nhất một phần + trigger chồng lấn (`0011`), `dsp_assignment_handler_open_uq` (tối đa một người phụ trách mở/đơn), `CHECK` hạt đơn/dịch vụ (`0014`).
- Lưới ngoài CSDL: `audit-invariants` (`R-N1-*`, `R-DSP-*`), `src/architecture.test.ts` ép ranh giới module/khoá ngoại/view công bố.
- Điểm yếu đã biết và đã ghi: `order_item`/`order_service` còn `ON DELETE CASCADE` (ADR-0003 điều 4, "nợ đã ghi"; an toàn vì không có đường xoá đơn); `dsp_assignment` cố ý không có trigger chồng lấn khoảng đã đóng (lệch ADR-0003 điều 7, có lưới thay `R-DSP-3`). Cả hai đều là **lệch có chủ ý, có ghi**.

### Triết lý 4 — Phân quyền đa chiều Who × Action × Data Scope — **KHỚP MỘT PHẦN**
- **Có:** `MATRIX` ở `src/shared/permissions.ts` — 4 quyền app × 21 thao tác × 5 phạm vi (`none/own/assigned/ownOrAssigned/any`); `can()` là hàm thuần dùng chung server + web, mặc định từ chối; ADR-0007 điều 3 ép "máy chủ kiểm, giao diện chỉ ẩn/hiện" và "không xem tiền" là bất biến mọi bề mặt; route khai `access` (`public/staff/office/admin`).
- **Chưa có:** phạm vi theo **đơn vị vận hành / chi nhánh / khu vực / pháp nhân**. Dữ liệu để làm đã có (`pty_party_role.location_id`, `loc_location`), nhưng `Scope` chỉ gồm sở hữu/phân công/tất cả. Với một công ty một cơ sở tại Nha Trang thì **chưa cấp bách** — đánh giá **KHÔNG ÁP DỤNG hiện nay**, cần xem lại khi mở chi nhánh hoặc thêm đại lý xem đơn của chính họ (P-6).

### Triết lý 5 — Cấu hình hơn là tuỳ biến (flexfield, upgrade-safe) — **KHỚP MỘT PHẦN**
- **Có:** danh mục dịch vụ đồng bộ từ Google Sheet + ghi đè có kiểm soát (`catalog_override`, cột `prices_json`, `base_json`); tập giá trị mở là **bảng tra cứu** (`pty_role_type`, `dsp_task_kind`, `stf_permission_type`, `loc_location_type`, `fbk_kind`…) — thêm giá trị = thêm dòng; hành động nhật ký là một tệp nguồn (`audit-actions.ts`); migration expand–contract.
- **Không có:** "thuộc tính mở rộng có kiểu theo namespace" gắn vào hồ sơ/đơn (ORA-2 nhóm 4). Các cột `*_json` hiện có là dữ liệu kỹ thuật của danh mục/Góp ý, không phải làn mở rộng cho nghiệp vụ. Nhu cầu chưa xuất hiện (mọi thuộc tính hiện có đều đã được mô hình hoá thành cột). Xem P-10.

### Triết lý 6 — AI là Actor, không phải nguồn sự thật — **KHÔNG ÁP DỤNG hiện nay / chưa có quy tắc**
- Hệ thống hiện **không có tác nhân AI ghi dữ liệu**. Mọi ghi đi qua route có phiên nhân viên. Không có định danh AI riêng trong `staff`/`audit_log`.
- Không tìm thấy điều khoản về AI trong `docs/ARCHITECTURE.md` hay ADR-0001…0009 (đã grep `AI`, `agent`, `source_ref`, `flexfield`, `extension` trong `docs/SYSTEM-DESIGN.md` và `docs/adr/`: không có kết quả liên quan). Nếu sau này thêm trợ lý AI thì cần quy tắc **trước** khi tích hợp (P-11). Lưu ý: chính phiên làm việc của Claude Code trên repo này là một "actor", nhưng đi qua git/PR và quy trình CLAUDE.md §6, không qua API nghiệp vụ.

---

## 3. Đối chiếu ORA-2 mục II — cấu trúc CRM theo TCA (bốn lớp)

| Lớp | Hiện trạng | Kết luận |
|---|---|---|
| **Party** (Person/Organization) | `pty_party` + `pty_person` + `pty_organization` | **KHỚP** |
| **Relationship & Usage** | `pty_party_role` (usage), `pty_party_relationship` (quan hệ), có hiệu lực | **KHỚP** |
| **Customer Account & Site** | Không có tài khoản giao dịch; "site" chỉ là `loc_location` cho dịch vụ | **LỆCH CÓ CHỦ Ý / KHÔNG ÁP DỤNG** (mục 1.3–1.4) |
| **Interaction & Event History** (Lead, Opportunity, Sales Event bất biến) | Không có Lead/Opportunity — hệ thống là công cụ lập **đơn**, không phải CRM bán hàng đầy đủ. Lịch sử sự kiện là `audit_log` (chỉ-thêm theo mã, mục 4.2 dòng 2.3) | **KHÔNG ÁP DỤNG** cho Lead/Opportunity; **KHỚP MỘT PHẦN** cho lịch sử đơn |

Ghi chú định vị: CLAUDE.md §1 định nghĩa dự án là "CRM nội bộ" nhưng phạm vi hiện tại là lập/xác nhận đơn dịch vụ tour. Nếu chủ dự án muốn CRM đúng nghĩa (theo dõi khách tiềm năng, chăm sóc, lịch sử tương tác) thì lớp bốn của TCA là **một hạng mục mới**, không phải nợ.

---

## 4. Đối chiếu ORA-2 mục III — checklist (9 mục)

### 4.1 Nhóm 1 — Mô hình dữ liệu và bản thể học

| # | Mục checklist | Hiện trạng | Kết luận |
|---|---|---|---|
| 1.1 | **Mô hình hoá `Party` gốc**, không tạo bảng `Customers`/`Suppliers` riêng trùng master data | Không có bảng khách/đại lý riêng (ADR-0001 loại phương án C). Nhưng khách trên đơn vẫn là chuỗi chép tay → **trùng dữ liệu xảy ra ở `orders`** | **KHỚP MỘT PHẦN** (cấu trúc đúng; dữ liệu khách chưa dùng nó) |
| 1.2 | Tách Account, Site/Location, Contacts thành lớp thuộc tính của quan hệ | Contacts tách (`pty_contact_point`); Location tách (`loc_location`); Account không có (mục 1.3) | **KHỚP MỘT PHẦN** |
| 1.3 | Master data dùng chung (sản phẩm, đơn vị tính, tiền tệ) xuyên CRM–ERP | Danh mục dịch vụ một nguồn (Sheet → `catalog_item`, `getEffectiveServices` là **một** nguồn "giá hiệu lực" — ARCHITECTURE điều 1); tiền chỉ VNĐ `INTEGER`; `unit` giữ nguyên chuỗi của Sheet (`perPax`, `per5Pax`…) không có bảng đơn vị tính. Không có ERP nên phần "sang ERP" không áp dụng | **KHỚP** cho sản phẩm/tiền; **KHỚP MỘT PHẦN** cho đơn vị tính (chuỗi tự do từ Sheet) |

### 4.2 Nhóm 2 — Giao dịch và luồng xử lý

| # | Mục checklist | Hiện trạng | Kết luận |
|---|---|---|---|
| 2.1 | Thiết kế Command & Event; đổi trạng thái qua lệnh có kiểm tra, không update trực tiếp cột | Có lệnh và kiểm hợp lệ ở mã (triết lý 2). Không có bus sự kiện/outbox — không cần cho quy mô này | **KHỚP MỘT PHẦN** (lệnh có; ràng buộc ở CSDL còn thiếu — P-2) |
| 2.2 | Bảo vệ bất biến bằng constraint ở CSDL | Triết lý 3 | **KHỚP** |
| 2.3 | **Vết kiểm toán từ ngày đầu:** ai (người/AI), làm gì, khi nào, **lý do**, dữ liệu **trước/sau** cho mọi giao dịch quan trọng | Xem "Chi tiết 2.3" ngay dưới bảng | **KHỚP MỘT PHẦN — khoảng trống lớn nhất** |

**Chi tiết 2.3 (đã đọc thân mã, sửa lại nhận định sơ bộ trước đó):**
- **Ai:** `audit_log.staff_id` (NULL = hệ thống). Cột WHO `created_by/updated_by` trên mọi bảng mới (ADR-0003 điều 6). **Khớp**; "người hay AI" chưa phân biệt (không có AI).
- **Làm gì:** `action` nguồn duy nhất `audit-actions.ts` — 36 hành động, 7 nhóm (đơn, tài khoản, dịch vụ, hồ sơ, địa điểm, góp ý, hệ thống). **Khớp.**
- **Khi nào:** `created_at` ISO UTC. **Khớp.**
- **Trước → sau:** **không có cột cấu trúc.** `detail` là chuỗi tự do. *Có* ghi trước→sau bằng văn bản cho **sửa thông tin chuyến** (`describeTripUpdates`/`describeTripChange` so `stored` với `updates`, nối bằng ` | `) và tóm tắt lệch giá (`summarizeDeviations`). *Không có* trước→sau cho: sửa đơn nháp (`updated` chỉ ghi tóm tắt lệch giá), sửa hồ sơ (`party_updated` ghi mỗi loại hồ sơ, ví dụ `detail: \`${KIND_LABEL[...]}\``), đổi liên hệ, đổi quyền. Đây là chuỗi để người đọc, **không truy vấn/đối chiếu bằng máy được**.
- **Lý do:** `audit_log` **không có cột lý do**; không tìm thấy trường "lý do" ở route nào của `orders`. ADR-0007 điều 2 **đã quyết** rằng khi sửa số khách/dịch vụ/tiền sau xác nhận thì "(a) lý do bắt buộc, (b) bản ghi trước→sau chỉ-thêm (module `orders` sở hữu; chi tiết ở ADR của N3)", với `audit_log` giữ vai mục lục, nối nội dung bằng `audit_log.id`. → **thiết kế đúng hướng của ORA-2 đã có và đã duyệt, nhưng chưa thi công (thuộc N3)**.
- **Chỉ-thêm ở CSDL:** không có trigger chặn `UPDATE/DELETE` trên `audit_log` (grep `migrations/`: chỉ thấy các lần dựng lại bảng ở `0005/0006/0007`). Không tìm thấy mã `UPDATE audit_log`/`DELETE FROM audit_log` trong `src/`, `scripts/`, `tests/` → chỉ-thêm **do mã kỷ luật**, không do CSDL. ADR-0003 điều 8 nói "bảng chỉ-thêm không sửa, không xoá" là **quy ước**; hiện không có lưới máy cho `audit_log`.
- **Ngoại lệ đã ghi:** `audit_log.target_id` đa hình, cố ý không khoá ngoại (ADR-0003 điều 3, Điều 8.3).
- **Ràng buộc "không ghi dữ liệu cá nhân":** CLAUDE.md §5 cấm ghi SĐT/email/MST vào nhật ký; điều này **xung đột nhẹ** với "trước→sau đầy đủ" của ORA-2 — phải giải bằng cách ghi trước/sau **theo trường không nhạy cảm** hoặc băm/che (P-1).

### 4.3 Nhóm 3 — Phân quyền và quản trị

| # | Mục | Hiện trạng | Kết luận |
|---|---|---|---|
| 3.1 | Who × Action × Data Scope (phòng ban, chi nhánh, đội, lãnh thổ) | Triết lý 4 | **KHỚP MỘT PHẦN** (Scope theo sở hữu/phân công, chưa theo tổ chức) |
| 3.2 | Ranh giới an toàn cho AI Agent: định danh riêng, gọi qua API/Command có kiểm quyền | Chưa có AI; API đã kiểm quyền mặc định từ chối, nên khi có AI có nền tốt | **KHÔNG ÁP DỤNG hiện nay** |

### 4.4 Nhóm 4 — Mở rộng và tích hợp

| # | Mục | Hiện trạng | Kết luận |
|---|---|---|---|
| 4.1 | Làn mở rộng có kiểu theo namespace (Custom Attributes/JSON Schema), không sửa lõi | Không có (triết lý 5). Cột `*_json` có (`catalog_override.prices_json/base_json`, `catalog_sync.problems_json`, `fbk_ticket.context` có `json_valid` + giới hạn 2000 ký tự) nhưng là dữ liệu nội bộ từng module | **THIẾU** (chưa có nhu cầu) |
| 4.2 | Liên kết hai chiều `source_ref` giữa Opportunity ↔ Order ↔ Invoice | Không có Opportunity/Invoice. Đơn ↔ phân công có (`dsp_assignment.order_id/order_service_id`), đơn ↔ nhật ký có (`audit_log.order_id`). Chưa có liên kết đơn ↔ hoá đơn/phiếu thu (N3) | **KHÔNG ÁP DỤNG** đến khi có `bil_*`; cần thiết kế khi làm N3 |

---

## 5. Tổng hợp

Không đếm tỷ lệ phần trăm: ranh giới giữa "khớp một phần" và "lệch có chủ ý" là phán đoán từng mục (xem cột lý do). Bức tranh chung:

| Mặt | Kết luận |
|---|---|
| Danh tính (Party, Person/Organization, liên hệ) | **KHỚP** |
| Vai trò và quan hệ có hiệu lực theo thời gian | **KHỚP**, chặt hơn tham chiếu |
| Bất biến đặt ở CSDL (tiền, đóng băng, một-dòng-mở, chồng lấn) | **KHỚP** |
| Phân quyền Who × Action | **KHỚP**; Data Scope theo tổ chức chưa có (chưa cần) |
| Khách hàng nằm trong lớp Party | **LỆCH CÓ CHỦ Ý** (N2) — lệch lớn nhất |
| Tài khoản giao dịch/công nợ, `party_site` | **KHÔNG ÁP DỤNG** / lệch có chủ ý |
| Luật chuyển trạng thái đơn ở CSDL | **THIẾU** (chỉ ở mã) |
| Kiểm toán: lý do, trước→sau có cấu trúc, chỉ-thêm ở CSDL | **KHỚP MỘT PHẦN**; đã có ADR-0007 điều 2 nhưng chưa thi công |
| Trùng MST | **CHƯA QUYẾT** |
| Flexfield, AI actor, Lead/Opportunity, `source_ref` | **KHÔNG ÁP DỤNG** hiện nay |

**Tóm lại:** nền danh tính, hiệu lực thời gian, bất biến trong CSDL và ma trận quyền **tốt và chặt hơn tham chiếu**. Ba nhóm việc thật sự còn thiếu: (1) **khách chưa nằm trong lớp Party** (N2), (2) **vết kiểm toán chưa có lý do/trước→sau có cấu trúc và chưa chỉ-thêm ở CSDL**, (3) **luật chuyển trạng thái đơn chưa được CSDL bảo vệ**. Còn lại phần lớn là "chưa cần" hoặc đã có ADR.

---

## 6. Đề xuất

Nguyên tắc xếp hạng: ưu tiên việc (a) đóng nợ **rẻ** ngay bây giờ vì làm muộn là **cửa một chiều** (đơn thật đã nằm trong D1), (b) không phá nguyên tắc CLAUDE.md (chỉ thêm migration, expand–contract, không sửa ADR đã duyệt). Mọi đề xuất cần chủ dự án duyệt; đề xuất nào đổi kiến trúc → ADR mới. **Không đề xuất nào được thi công trong báo cáo này.**

### Nhóm A — Nên làm (giá trị cao, rủi ro thấp)

**P-1. Vết kiểm toán "lý do + trước→sau" có cấu trúc** *(thuộc N3, kéo nhẹ một phần về sớm)*
- Vấn đề: mục 4.2 dòng 2.3. ADR-0007 điều 2 đã quyết hướng; thiếu là thi công.
- Đề xuất: khi làm N3, làm **cùng đợt** một bảng chỉ-thêm `ord_change` (module `orders`, `id` = `audit_log.id`; cột `field`, `before_value`, `after_value`, `reason`) đúng mô hình "audit_log = mục lục, bản ghi trước→sau = nội dung". Trường nhạy cảm (SĐT/email/MST) **che** hoặc chỉ ghi "đã đổi" (giữ CLAUDE.md §5).
- Cách kiểm: `audit-invariants` thêm `R-ORD-n` "mọi sửa sau xác nhận có dòng `ord_change` với `reason` không rỗng".
- Cửa: thêm bảng = cửa hai chiều (chỉ thêm). ADR-0007 **đã duyệt** nên chỉ cần ADR của N3 như đã hứa.

**P-2. Đưa luật chuyển trạng thái đơn xuống CSDL (trigger, chỉ thêm)**
- Vấn đề: mục 2, triết lý 2 — `cancelled→confirmed`, `confirmed→draft` không bị trigger nào chặn.
- Đề xuất: migration mới (số `0017` hoặc kế tiếp; **lưu ý B5 cũng dự kiến `0017`** — đánh số theo `docs/HANDOFF-N1.md` tại thời điểm làm) thêm `orders_status_transition` `BEFORE UPDATE OF status` chặn mọi cặp ngoài `{draft→confirmed, draft→cancelled, confirmed→cancelled}` bằng `RAISE(ABORT,'invalid_transition: …')`. Kiểm bằng test đỏ→xanh trên schema đầy đủ (mẫu `src/modules/orders/migration.test.ts`).
- Trước khi làm: chạy `audit-invariants`/truy vấn chỉ-đọc xem dữ liệu thật có đơn nào đang ở trạng thái mà trigger sẽ coi là bất thường không (trigger `BEFORE UPDATE` không kiểm dòng cũ, nhưng nên biết).
- Cửa: thêm trigger = hai chiều (gỡ được). Rủi ro: chặn một đường mã ngầm nào đó → e2e phải bắt.

**P-3. Chốt chính sách trùng MST (quyết định của chủ dự án)**
- Vấn đề: mục 1.5 #2. TCA-1 đòi kiểm trùng; ADR-0001 mục 8 cố ý không ép duy nhất SĐT nhưng **im lặng về MST**.
- Phương án (chọn một):
  - **(a) Cảnh báo mềm** (khuyến nghị): khi tạo/sửa tổ chức, `GET /api/parties/lookup?taxCode=` báo "đã có hồ sơ dùng MST này" giống cơ chế SĐT; cho tạo tiếp có xác nhận. Không đổi schema.
  - **(b) Duy nhất cứng:** chỉ mục `UNIQUE` một phần trên `pty_organization(tax_code) WHERE tax_code IS NOT NULL` (dữ liệu cũ phải sạch trước — cần kiểm chỉ-đọc). Chặt nhưng một pháp nhân có nhiều chi nhánh dùng chung MST 10 số + hậu tố sẽ vướng (mã 13 số `10-3 số` là khác nhau, nhưng 10 số gốc thì trùng).
  - **(c) Giữ nguyên** và ghi vào ADR-0001 là quyết định có chủ ý.
- Lý do khuyến nghị (a): khớp tinh thần ADR-0001 mục 8 ("không tự tạo hồ sơ thứ hai âm thầm") mà không chặn trường hợp thật.

**P-4. Đưa "người đặt/khách" vào đơn sớm — làm N2 phần tối thiểu**
- Vấn đề: mục 1.6 — mỗi đơn mới nhân thêm bản sao tên/SĐT khách; càng để lâu, việc gộp về sau (`booker_party_id`) càng phải viết lại nhiều dữ liệu (ADR-0001 mục 8 tự nhận điều này).
- Đề xuất: tách N2 thành hai lát: **lát 1** thêm `orders.booker_party_id` (nullable, khoá ngoại `pty_party`) + giao diện "tìm/tạo hồ sơ theo SĐT" **và** giữ `customer_*` làm bản chụp lúc đặt (expand); **lát 2** (sau) mới backfill/gộp/siết. Lát 1 chỉ là `ALTER TABLE … ADD COLUMN` (không dựng lại bảng — ADR-0003 điều 10).
- Cửa: lát 1 hai chiều; lát 2 cần ADR (cửa một chiều). Cần chủ duyệt thứ tự, vì N2 hiện gồm cả gộp hồ sơ, người đặt, nhiệm vụ đón/lái cano.

### Nhóm B — Nên làm khi chạm tới (chi phí thấp, gắn với việc đang có)

**P-5. Bảo vệ `audit_log` chỉ-thêm ở CSDL**
- Thêm hai trigger `BEFORE UPDATE`/`BEFORE DELETE` trên `audit_log` `RAISE(ABORT,'audit_append_only')`. Điều kiện: không có mã nào (kể cả migration/script bảo trì) cần sửa/xoá; đã grep không thấy trong `src/scripts/tests`, nhưng cần xác nhận với quy trình dọn dữ liệu (nếu có yêu cầu xoá dữ liệu cá nhân theo luật thì cần đường riêng có ghi). Đi kèm bài kiểm trong `src/architecture.test.ts`.
- Cửa: hai chiều (gỡ trigger).

**P-6. Ghi nhận rõ "phạm vi dữ liệu theo tổ chức" là chưa làm, kèm ngưỡng kích hoạt**
- Không đổi mã. Thêm đoạn vào ADR-0007/`SYSTEM-DESIGN.md` §8: chỉ mở rộng `Scope` thêm `location` khi (i) có chi nhánh/điểm bán thứ hai, hoặc (ii) đại lý được xem đơn của chính họ. Dữ liệu nền (`pty_party_role.location_id`) đã sẵn.

**P-7. `party_site` cho địa chỉ xuất hoá đơn — hoãn tới N3**
- Hiện `pty_organization.address` + `invoice_email` là một bộ. Khi làm `bil_*`/yêu cầu hoá đơn (ADR-0004 đã dự kiến "tên đơn vị, MST, địa chỉ, email nhận" **trên yêu cầu xuất**, tức lưu bản chụp theo từng yêu cầu), quyết định đó **đã tránh** được nhu cầu `party_site`. → Đề xuất: **không làm `party_site`**; chỉ ghi vào ADR N3 rằng thông tin xuất hoá đơn là bản chụp theo yêu cầu.

**P-8. `SUPPLIER`/`PARTNER` trong `pty_role_type`** — chỉ khi có nghiệp vụ mua vào (N4, giá net HDV). Một dòng dữ liệu trong migration, không cần schema mới.

### Nhóm C — Chỉ ghi nhận, không làm bây giờ

**P-9. `party_number` mã người-đọc-được** (ví dụ `KH-000123`): hữu ích khi nhân viên đọc/nhắn mã khách; chưa có nhu cầu. Nếu làm thì sinh trong câu `INSERT` (như `order_code`), `UNIQUE`, chỉ thêm cột.

**P-10. Làn mở rộng có kiểu (flexfield):** chờ nhu cầu thật; khi làm, bảng `..._attr(namespace, key, value_json)` có kiểm ở mã theo tệp khai báo `src/shared/`, tránh `ALTER` lõi. **Không** làm phòng xa (nguyên tắc P6/P11 của dự án).

**P-11. Quy tắc cho tác nhân AI** (`ORA-2` triết lý 6): chưa có AI ghi dữ liệu → chỉ cần **một dòng trong ADR-0007/ARCHITECTURE**: "mọi tác nhân tự động gọi qua API có phiên, có tài khoản `staff` riêng với quyền tối thiểu, ghi `audit_log.staff_id` của chính nó; không có đường ghi thẳng D1". Làm khi bắt đầu kế hoạch tích hợp AI.

**P-12. Lead/Opportunity/Interaction (lớp 4 TCA):** ngoài phạm vi "công cụ lập đơn". Chỉ mở ra nếu chủ dự án muốn mở rộng thành CRM theo dõi khách tiềm năng — lúc đó là hạng mục mới có đặc tả riêng, `source_ref` hai chiều đơn ↔ cơ hội được thiết kế cùng (gắn với N3 cho hoá đơn).

### Thứ tự đề nghị

1. **Quyết định của chủ dự án:** P-3 (MST), P-4 (tách N2 làm hai lát), P-1 (làm `ord_change` cùng N3).
2. **Làm cùng đợt migration kế tiếp** (cần một số `0017` duy nhất — phải phối hợp với B5): P-2, P-5.
3. **Ghi tài liệu, không mã:** P-6, P-7, P-11.
4. **Hoãn, ghi nhận:** P-8, P-9, P-10, P-12.

### Điều cần kiểm thêm trước khi ra quyết định
- Chạy `node scripts/audit-invariants.mjs --db remote` (chỉ đọc) để biết dữ liệu production hiện tại sạch tới đâu trước P-2/P-5 (theo `CLAUDE.md` §6 chỉ chạy khi chủ dự án cho phép nếu đụng remote).
- Truy vấn chỉ-đọc: đếm số `tax_code` trùng trong `pty_organization` và số SĐT trùng trong `pty_contact_point` (đo mức độ vấn đề của P-3).
- Xác nhận với chủ dự án: có bắt buộc/khuyến khích luật xoá dữ liệu cá nhân nào cản P-5 không.
