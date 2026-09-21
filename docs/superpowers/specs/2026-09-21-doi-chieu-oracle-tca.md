# Đối chiếu hệ thống `tourdao-sales` với hai tài liệu tham chiếu Oracle TCA

- **Ngày:** 2026-09-21   **Loại:** báo cáo rà soát + đề xuất (KHÔNG phải ADR; không đổi mã, không đổi schema)
- **Trạng thái:** NHÁP bản 2 (2026-09-21) — đã rà soát lại: sửa nhãn tổng hợp cho khớp thân bài, xếp lại ưu tiên đề xuất kèm lý do dễ hiểu (mục 6), sửa khoá bảng ở P-1, thêm điều kiện cho P-2/P-5, hạ P-3 (MST) xuống hoãn theo ý chủ dự án. Chờ chủ dự án duyệt phần "Đề xuất". Quyết định kiến trúc nào rút ra từ đây phải thành ADR mới (CLAUDE.md §6).
- **Tài liệu tham chiếu** (đặt ở `docs/Ref/` của checkout gốc, **chưa được git theo dõi** — người đọc báo cáo từ git chưa đối chiếu lại được; xem mục 6.5):
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
| 1 | **Không mồ côi**: không tạo bản ghi con khi thiếu `party_id` | Mọi bảng `pty_*`, `dsp_assignment.party_id`, `staff.party_id` có khoá ngoại `NO ACTION`; `audit-invariants` có `R-N1-10` (`PRAGMA foreign_key_check`), `R-N1-2` (hồ sơ PERSON phải có `pty_person`). **Nhưng** `staff.party_id` còn nullable: `R-N1-1` chỉ là `warn-unless-strict` cho tới B5 (`staff_party_required`) — nay dự kiến `0018` vì `0017` đã dùng cho trigger bảo vệ | **KHỚP MỘT PHẦN** — chờ B5 |
| 2 | **Không trùng định danh**: MST của ORGANIZATION kiểm trùng trước khi tạo | **Không có.** `pty_organization.tax_code` không có `UNIQUE`; `parties/rules.ts` không kiểm trùng; tra trùng dựa vào **số điện thoại chuẩn hoá** qua `GET /api/parties/lookup?phone=` (giao diện `web/parties.ts` gọi khi tạo hồ sơ), còn chỉ mục `pty_contact_lookup_ix` **cố ý không duy nhất** (ADR-0001 mục 8: số dùng chung là chuyện thật) | **LỆCH — HOÃN** (xem P-3): ADR-0001 mục 8 quyết cách nhận dạng bằng SĐT, **không** nói gì về MST. Chủ dự án (2026-09-21): hệ thống là CRM lập đơn, MST không phải khoá nhận dạng → không làm bây giờ |
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
- **Thiếu (mức CSDL):** trong `migrations/` chỉ có trigger `orders_confirm_requires_trip` (khi chuyển sang `confirmed` phải đủ chuyến) và trigger đóng băng dịch vụ. **Không có trigger nào chặn** `cancelled→confirmed` hay `confirmed→draft`: điều kiện của `orders_confirm_requires_trip` là `NEW.status='confirmed' AND OLD.status<>'confirmed'`, tức **ở tầng CSDL** đơn đã huỷ vẫn chuyển được về `confirmed` nếu chuyến còn đủ. **Ở tầng mã thì không**: câu xác nhận cứng `WHERE status = 'draft'` (`orders/repository.ts`), câu huỷ có `WHERE status = ?` — không đường mã nào đi ngược. Nguy cơ chỉ đến từ SQL chạy tay trên D1 hoặc mã viết sau (N3 thêm đường sửa đơn sau xác nhận). Luật "không có đường quay lại" chỉ sống ở mã. Tham chiếu ORA-2 triết lý 3 đòi luật này nằm gần dữ liệu. Xem P-2.

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
| Phân quyền Who × Action × Data Scope | **KHỚP MỘT PHẦN** — Who × Action đủ; Data Scope theo tổ chức chưa có (chưa cần, xem P-6) |
| Khách hàng nằm trong lớp Party | **LỆCH CÓ CHỦ Ý** (N2) — lệch lớn nhất |
| Tài khoản giao dịch/công nợ, `party_site` | **KHÔNG ÁP DỤNG** / lệch có chủ ý |
| Luật chuyển trạng thái đơn | **KHỚP MỘT PHẦN** — mã chặn đủ (không đường mã nào đi ngược); CSDL chưa chặn (chỉ lộ khi chạy SQL tay) |
| Kiểm toán: lý do, trước→sau có cấu trúc, chỉ-thêm ở CSDL | **KHỚP MỘT PHẦN**; đã có ADR-0007 điều 2 nhưng chưa thi công |
| Trùng MST | **HOÃN** — chủ dự án (2026-09-21): CRM lập đơn, không xuất hoá đơn, MST không phải khoá nhận dạng |
| Flexfield, AI actor, Lead/Opportunity, `source_ref` | **KHÔNG ÁP DỤNG** hiện nay |

**Tóm lại:** nền danh tính, hiệu lực thời gian, bất biến trong CSDL và ma trận quyền **tốt và chặt hơn tham chiếu**. Ba nhóm việc thật sự còn thiếu: (1) **khách chưa nằm trong lớp Party** (N2) — việc duy nhất mà chi phí sửa **tăng theo từng đơn**; (2) **vết kiểm toán chưa có lý do/trước→sau có cấu trúc và chưa chỉ-thêm ở CSDL**; (3) **luật chuyển trạng thái đơn chưa được CSDL bảo vệ** — hôm nay không có lỗi (mã chặn đủ), đây là bảo hiểm trước SQL chạy tay và mã tương lai. Còn lại phần lớn là "chưa cần" hoặc đã có ADR.

---

## 6. Đề xuất (bản 2 — xếp lại ưu tiên, kèm lý do)

Mỗi đề xuất được giải thích theo cùng một khung: **vấn đề là gì → nếu không sửa thì hỏng ở đâu → vì sao làm lúc này (hoặc để sau) → tốn bao nhiêu**. Chỗ nào không thật sự cần thì nói thẳng. Mọi đề xuất cần chủ dự án duyệt; đề xuất nào đổi kiến trúc → ADR mới. **Không đề xuất nào được thi công trong báo cáo này.**

### 6.0 Bảng cô đọng

| Ưu tiên | Đề xuất | Một câu: vì sao | Hôm nay có lỗi không? | Chờ lâu thì sao? | Chi phí | Cửa |
|---|---|---|---|---|---|---|
| **1** | **P-4** Gắn hồ sơ khách vào đơn (lát 1 N2) | Không gắn thì không biết "khách này đặt mấy lần, đại lý nào mang nhiều đơn" — giá trị cốt lõi của CRM | Không lỗi, nhưng **mất dữ liệu quan hệ mỗi ngày** | **Đắt dần theo từng đơn** — gộp sau phải đoán từ chữ gõ tay | Thấp ở CSDL (thêm 1 cột); vừa ở giao diện (thêm bước chọn khách) | Lát 1 hai chiều; lát 2 một chiều (ADR) |
| **2** | **P-2** CSDL chặn chuyển trạng thái sai | Bảo hiểm: SQL chạy tay / mã sau này làm "sống lại" đơn đã huỷ | **Không** (mã chặn đủ) | Rủi ro tăng khi N3 thêm đường sửa đơn | Rất thấp (1 trigger) | Hai chiều |
| **2** | **P-5** CSDL chặn sửa/xoá nhật ký | Nhật ký là bằng chứng khi tranh chấp; sửa được lặng lẽ thì mất giá trị | **Không** (mã không sửa/xoá) | Không đắt thêm, nhưng mỗi ngày không có lưới là một ngày không chứng minh được | Rất thấp (2 trigger), gộp chung migration với P-2 | Hai chiều |
| **3** | **P-1** Bảng "trước → sau + lý do" | Chủ dự án đã quyết (ADR-0007): sửa sau xác nhận **bắt buộc** có lý do và trước→sau | Không (chưa có tính năng sửa sau xác nhận) | Không đắt thêm — chỉ cần khi làm N3 | Vừa, làm cùng N3 | Hai chiều (chỉ thêm bảng) |
| 4 | P-6, P-7, P-11 | Ghi rõ vào tài liệu "chưa làm, khi nào mới làm" | — | — | Chỉ sửa tài liệu | — |
| Hoãn | P-3, P-8, P-9, P-10, P-12 | Chưa có nhu cầu thật; làm trước dễ đoán sai thiết kế | — | — | — | — |

### 6.1 Ưu tiên 1 — P-4. Gắn hồ sơ khách vào đơn (lát 1 của N2) — **cần thiết nhất**

- **Vấn đề:** mỗi đơn chép tay tên/SĐT khách (`orders.customer_*`). Lớp hồ sơ đã có sẵn (hồ sơ gốc, vai trò `CUSTOMER`, `AGENT`) nhưng đơn chưa trỏ vào (mục 1.6).
- **Nếu không sửa:**
  - Không trả lời được các câu cơ bản của CRM: *khách này đã đặt mấy lần? đại lý nào mang về nhiều đơn nhất? khách quen gọi lại là ai?*
  - **Chi phí sửa tăng theo từng đơn.** Gộp về sau phải đoán "đơn nào cùng một người" từ chữ gõ tay (`0905 123 456` / `0905123456`, "Anh Tuấn" / "Tuấn Nguyễn"). Đoán sai là gắn đơn của người này cho người khác; việc gộp ghi đè dữ liệu thật, **không hoàn tác được** — ADR-0001 mục 8 tự thừa nhận điều này.
- **Vì sao làm bây giờ:** đây là việc **duy nhất** trong danh sách mà chờ càng lâu càng đắt.
- **Cách làm:** hai lát.
  - **Lát 1:** `ALTER TABLE orders ADD COLUMN booker_party_id` (nullable, khoá ngoại `pty_party`) + giao diện "tìm khách theo SĐT → chọn hoặc tạo mới" (ADR-0001 mục 8 bắt buộc hiện danh sách trùng số); **giữ** `customer_*` làm bản chụp lúc đặt. Không dựng lại bảng (ADR-0003 điều 10), gỡ được.
  - **Lát 2 (sau):** backfill đơn cũ, gộp hồ sơ, siết bắt buộc — cửa một chiều, cần ADR.
- **Chi phí thật** nằm ở giao diện: nhân viên thêm một bước khi lập đơn → nên hỏi ý nhân viên bán hàng.
- **Cần chủ dự án duyệt** vì đổi thứ tự lộ trình N2 (N2 hiện gồm cả gộp hồ sơ, người đặt, nhiệm vụ đón/lái cano).

### 6.2 Ưu tiên 2 — P-2. CSDL chặn chuyển trạng thái sai — **nên làm, là bảo hiểm, không phải sửa lỗi**

- **Vấn đề:** luật "nháp → xác nhận → huỷ, không quay lại" chỉ nằm trong mã. CSDL cho phép đơn đã huỷ quay về "đã xác nhận".
- **Nói thẳng: hôm nay không có lỗi.** Câu xác nhận cứng `WHERE status = 'draft'`, câu huỷ có `WHERE status = ?` → từ ứng dụng không đi ngược được.
- **Vì sao vẫn cần:**
  - **SQL chạy tay có thật trong dự án này**: đường thoát khẩn của chế độ bảo trì là SQL gõ tay trên D1 thật; sửa dữ liệu bằng `wrangler d1 execute` sẽ xảy ra. Gõ nhầm một `UPDATE` là đơn đã huỷ "sống lại".
  - **N3 sẽ thêm đường sửa đơn sau xác nhận** → thêm chỗ cho lỗi lọt.
  - **Hậu quả cụ thể:** đơn huỷ sống lại → hướng dẫn viên/tài xế thấy việc, đi đón khách đã huỷ; doanh thu cộng sai.
- **Cách làm:** trigger `orders_status_transition` `BEFORE UPDATE OF status ON orders`, chặn mọi cặp ngoài `{draft→confirmed, draft→cancelled, confirmed→cancelled}` **và cho phép `NEW.status = OLD.status`** (bắt buộc: `UPDATE OF status` vẫn chạy khi cột có trong `SET` dù giá trị không đổi). `RAISE(ABORT,'invalid_transition: …')`. Test đỏ→xanh trên schema đầy đủ (mẫu `src/modules/orders/migration.test.ts`).
- **Số migration:** B5 cũng dự kiến `0017` — đánh số theo `docs/HANDOFF-N1.md` tại thời điểm làm.
- **Chi phí:** vài dòng, gỡ được. Rủi ro: chặn nhầm một đường mã ngầm → e2e phải bắt.

### 6.3 Ưu tiên 2 — P-5. CSDL chặn sửa/xoá nhật ký — **nên làm, gộp chung migration với P-2**

- **Vấn đề:** `audit_log` là thứ duy nhất trả lời *"ai huỷ đơn này, ai sửa giá, lúc nào"*. Hiện nó chỉ-thêm nhờ **mã kỷ luật** (grep `src/scripts/tests` không có `UPDATE/DELETE audit_log`), không nhờ CSDL.
- **Nếu không sửa:** khi tranh chấp (khách nói đã huỷ, nhân viên nói chưa), nhật ký là bằng chứng. Nhật ký sửa được lặng lẽ thì **mất giá trị bằng chứng** — kể cả khi chưa ai sửa, vì không chứng minh được là chưa ai sửa.
- **Cách làm:** hai trigger `BEFORE UPDATE` / `BEFORE DELETE` trên `audit_log` → `RAISE(ABORT,'audit_append_only')`, kèm test trong `src/architecture.test.ts` kiểm hai trigger còn tồn tại.
- **Giới hạn cần biết:**
  - Trigger **chặn tai nạn, không chặn người cố ý** (người quản trị D1 vẫn gỡ được trigger).
  - Dựng lại bảng `audit_log` (đã từng làm ở `0005`) thì trigger **mất theo bảng** → test "trigger còn tồn tại" bắt được.
  - Nếu luật buộc xoá dữ liệu cá nhân thì cần đường riêng có ghi; nhật ký hiện không được ghi SĐT/email/MST nên khả năng vướng thấp — vẫn cần chủ dự án xác nhận.
- **Chi phí:** rất thấp; đi cùng P-2 thì chỉ một lần triển khai.

### 6.4 Ưu tiên 3 — P-1. Bảng "trước → sau + lý do" — **cần, nhưng đúng lúc là N3**

- **Vấn đề:** sửa đơn hiện chỉ để lại chuỗi `detail` tự do; máy không truy vấn được "trước bao nhiêu, sau bao nhiêu, vì sao" (mục 4.2 dòng 2.3).
- **Vì sao cần:** ADR-0007 điều 2 đã quyết — sau xác nhận vẫn cho sửa số khách/dịch vụ/tiền nhưng **bắt buộc lý do + bản ghi trước→sau chỉ-thêm**, `audit_log` làm mục lục. Không có bảng này thì tính năng đó không được phép làm.
- **Vì sao không làm sớm hơn:** hiện đơn đã xác nhận bị khoá hoàn toàn; chưa có "sửa sau xác nhận" thì chưa có gì để ghi. Làm trước = bảng rỗng không ai dùng.
- **Thiết kế (sửa so với bản 1):** bảng chỉ-thêm `ord_change` (module `orders`) với **khoá `(audit_id, field)`**, cột `audit_id` (= `audit_log.id`), `field`, `before_value`, `after_value`, `reason`. Bản 1 để khoá = `audit_log.id` là **sai**: một lần sửa thường đổi nhiều trường cùng lúc (đổi số người lớn kéo theo tổng tiền, số còn lại) — khoá đơn chỉ ghi được một trường, các trường khác mất. Trường nhạy cảm (SĐT/email/MST) che hoặc chỉ ghi "đã đổi" (CLAUDE.md §5).
- **Cách kiểm:** `audit-invariants` thêm `R-ORD-n` "mọi sửa sau xác nhận có ít nhất một dòng `ord_change` với `reason` không rỗng".
- **Chi phí:** vừa; nằm trong ADR của N3 như ADR-0007 đã hứa.

### 6.5 Ưu tiên 4 — chỉ ghi tài liệu, không mã

- **P-6. Phạm vi dữ liệu theo tổ chức:** ghi vào ADR-0007/`SYSTEM-DESIGN.md` §8 rằng chỉ mở rộng `Scope` thêm `location` khi (i) có chi nhánh/điểm bán thứ hai, hoặc (ii) đại lý được xem đơn của chính họ. Dữ liệu nền (`pty_party_role.location_id`) đã sẵn.
- **P-7. Không làm `party_site`:** ADR-0004 đã dự kiến lưu thông tin xuất hoá đơn là **bản chụp trên từng yêu cầu** → tránh được nhu cầu nhiều địa chỉ xuất/tổ chức. Chỉ cần ghi điều này vào ADR N3.
- **P-11. Quy tắc cho tác nhân AI:** một dòng trong ADR-0007/ARCHITECTURE: "mọi tác nhân tự động gọi qua API có phiên, có tài khoản `staff` riêng quyền tối thiểu, ghi `audit_log.staff_id` của chính nó; không ghi thẳng D1". Làm khi bắt đầu tích hợp AI.
- **Tài liệu tham chiếu ngoài git:** hai tệp `docs/Ref/*.md` chỉ có ở checkout gốc; người đọc báo cáo từ git không kiểm lại được. Đề nghị commit chúng cùng báo cáo **sau khi** chủ dự án xem nội dung không có gì nhạy cảm (repo riêng tư nhưng đã chứa dữ liệu thật).

### 6.6 Hoãn — chưa có nhu cầu thật

Nguyên tắc: chưa có nhu cầu thật thì làm trước dễ đoán sai thiết kế và phải bảo trì thứ không ai dùng.

| Đề xuất | Khi nào mới cần |
|---|---|
| **P-3.** Trùng MST | Chủ dự án (2026-09-21): hệ thống là CRM lập đơn, không xuất hoá đơn → MST không phải khoá nhận dạng. Xem lại nếu N3 xuất hoá đơn theo hồ sơ tổ chức |
| **P-8.** `SUPPLIER`/`PARTNER` trong `pty_role_type` | Khi có nghiệp vụ mua vào (N4, giá net HDV) — một dòng dữ liệu |
| **P-9.** Mã khách dễ đọc (`KH-000123`) | Khi nhân viên thật sự cần đọc/nhắn mã khách |
| **P-10.** Thuộc tính mở rộng tuỳ ý (flexfield) | Khi có thuộc tính cụ thể mà cột hiện có không chứa được |
| **P-12.** Khách tiềm năng, cơ hội, lịch sử chăm sóc | Khi chủ dự án muốn mở rộng thành CRM chăm sóc khách — hạng mục mới có đặc tả riêng |

### 6.7 Thứ tự đề nghị

1. **Chủ dự án quyết:** P-4 (tách N2 làm hai lát, làm lát 1 trước).
2. **Một migration kế tiếp** (phối hợp số với B5): P-2 + P-5.
3. **Cùng N3:** P-1 (khoá `(audit_id, field)`), ghi P-7 vào ADR N3.
4. **Ghi tài liệu:** P-6, P-11; commit tài liệu tham chiếu sau khi xem nội dung.
5. **Hoãn:** P-3, P-8, P-9, P-10, P-12.

### 6.8 Điều cần kiểm thêm trước khi ra quyết định
- `node scripts/audit-invariants.mjs --db remote` (chỉ đọc; theo CLAUDE.md §6 chỉ chạy khi chủ dự án cho phép) để biết dữ liệu production sạch tới đâu trước P-2/P-5.
- Truy vấn chỉ-đọc: đếm số SĐT khách lặp lại trong `orders` — đo quy mô việc gộp của P-4 hôm nay.
- Xác nhận với chủ dự án: có yêu cầu xoá dữ liệu cá nhân nào cản P-5 không.
