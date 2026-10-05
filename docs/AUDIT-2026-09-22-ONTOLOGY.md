# SECOND-PASS ARCHITECTURE AUDIT — tầng Enterprise Ontology / Business Reality (tourdao-sales, 2026-09-22)

> **Vai:** người kiểm độc lập, chỉ đọc mã + chạy thử trên SQLite tạm (`tests/audit/harness.mjs` của vòng 1) qua 5 agent con; không sửa file nào, không đụng D1 thật, không chạy lệnh `--remote`. Nhánh `kiem-toan-ontology`, worktree riêng, tách từ HEAD của nhánh `kiem-toan-kien-truc` (commit `22e77d4`) — **không** trộn commit với vòng kiểm toán 1.
> **Không** phải phiên "kiểm lại" mà `docs/HANDOFF-KIEM-TOAN-2026-09-22.md` §3 yêu cầu (rà lại 4 đặc tả trước khi chốt kế hoạch thi công) — việc đó **CHƯA được làm** ở phiên này. Phiên này làm một việc khác: audit vòng 2, tầng bản thể học doanh nghiệp (ontology), theo yêu cầu riêng của chủ dự án.
> Vòng 1: `docs/AUDIT-2026-09-22-KIEN-TRUC.md` (443/443 test, 18/18 ca thử phá, không P0, 4 P1). Tài liệu này **không lặp lại** nội dung vòng 1 — chỉ trích dẫn khi cần đối chiếu (§21).
> **Ghi chú quy trình:** phiên này chạy nhiều lượt đọc mã độc lập song song (agent con), rồi người điều phối tự kiểm chứng lại các phát hiện quan trọng nhất (không nhận nguyên văn báo cáo của agent con) — xem §0. Ba lượt phân tích độc lập trong phiên đều đi tới cùng kết luận tổng thể (không P0, mô hình Party/Role đã landed thật, khoảng trống chính là tiền/thanh toán) — bản này là bản đầy đủ và có bằng chứng chạy thử (insert thật) nhiều nhất, được giữ làm bản chính thức duy nhất.

---

## 0. Bằng chứng bổ sung (người điều phối tự kiểm lại, không qua agent con)

- `npm test` (gốc worktree `kiem-toan-ontology`, không có thay đổi mã ứng dụng nào trong suốt audit vòng 2): **443/443 xanh** — khớp đúng con số vòng 1 kỳ vọng ở `docs/HANDOFF-KIEM-TOAN-2026-09-22.md` §3.1, xác nhận vòng 2 không vô tình sửa gì.
- `npm run typecheck`: **0 lỗi** (server + `web/` + `web/sw`).
- Tự đọc lại `src/architecture.test.ts:20,53`: `ALLOWED_EDGES.audit = []` và `LEGACY = ["accounts", "audit", "auth", "catalog", "orders"]` — **xác nhận đúng** phát hiện N-01/OL-1/OL-5 (§18, §19): `audit` module nằm trong LEGACY (không đi qua bài kiểm SQL bằng EXPLAIN) trong khi `src/modules/audit/repository.ts:47,79-83` đọc thật 4 view của `staff`/`orders`/`parties`/`locations` mà `ALLOWED_EDGES.audit` khai rỗng — nếu `audit` được đưa vào `STRICT` với khai báo hiện tại, bài kiểm sẽ đỏ ngay. Đây là phát hiện tự kiểm chứng độc lập, không chỉ tin báo cáo agent con.
- `docs/adr/README.md`: ADR-0001 → 0012 đều **accepted**; ADR-0013 **proposed** — khớp trích dẫn trong tài liệu.
- `src/shared/permissions.ts`: xác nhận `payment.receive/refund`, `invoice.request/issue` đã có dòng trong `MATRIX` kèm chú thích "chưa có route dùng" — khớp §10.
- `migrations/0011_parties.sql`: `pty_role_type` có đúng 8 dòng (STAFF/SALES/ACCOUNTANT/GUIDE/BOAT_CAPTAIN/DRIVER/AGENT/CUSTOMER), không có SUPPLIER — khớp N-04/RG-4.

---

## 1. EXECUTIVE FINDINGS

**Câu hỏi trung tâm của vòng 2:** kiến trúc hiện tại có đủ khả năng làm hình chiếu số trung thực, có lịch sử, truy nguyên được, và tiến hoá được của doanh nghiệp thật — hay chỉ là phần mềm thiết kế tốt?

**Kết luận ngắn:** Hệ thống **đã có một lõi ontology thật**, không phải lý thuyết — `ADR-0001` (Party–Role–Relationship, **accepted**, đã thi công ở migration `0011`/`0012`/`0018`) là bằng chứng cụ thể, đã kiểm bằng insert thật (không phải đọc tài liệu suy diễn). Lõi này đúng hướng "Enterprise OS", tên trung tính, không khoá vào Travel. Quấn quanh lõi đó là một **lớp nghiệp vụ Travel khoá cứng có chủ đích** (catalog giá 4 cột theo hạng khách, `order_service` với `depart/pickup/checkin/pax`) — đây không phải lỗi, là đúng kích cỡ cho một công ty ~10 người dùng chưa có lĩnh vực kinh doanh thứ hai.

Hai khoảng trống thật, cả hai đều **đã được chính dự án nhìn thấy trước** (ghi trong ADR, chưa làm vì chưa có nhu cầu — đúng tinh thần "không generalize sớm"):
1. **Tiền là trường vô hướng trên `orders`, không phải sự kiện kinh doanh (Payment) độc lập.** Không biểu diễn được: nhiều lần thu cho một đơn (G), một lần thu cho nhiều đơn (F), nhà cung cấp dịch vụ (H). `ADR-0004` (accepted) + `ADR-0010` điều 2 (accepted) đã định hướng đúng cho N3 (bản chụp theo yêu cầu, không phải bảng địa chỉ nhiều-nhiều) — **chưa thi công**, đúng lúc để thi công là khi có nhu cầu thu tiền nhiều lần thật.
2. **Sự kiện không kèm đổi dữ liệu thì vô hình với hệ thống.** Khách gọi điện xin đổi ngày, nhân viên từ chối — không route, không bảng, không dòng nhật ký nào ghi lại việc đó từng xảy ra (Scenario C, xem §16). Đây là giới hạn thật của mô hình hiện tại (state ghi đè, không phải event log), nhưng **chưa gây hại** vì chưa ai cần câu trả lời "khách đã từng hỏi đổi ngày chưa" — nếu nhu cầu đó xuất hiện (ví dụ để đo tỷ lệ khách muốn đổi lịch), đây sẽ là Reality Gap cần vá.

**Phát hiện mới (không có trong vòng 1), xếp theo mức độ (chi tiết §19):**
- **P2 — Lỗ hổng trong chính cơ chế tự bảo vệ ranh giới module.** `ALLOWED_EDGES` không chỉ kiểm `import` TypeScript (dòng ~82-99) mà còn là nguồn `deps` cho chính bài kiểm SQL bằng EXPLAIN (`src/architecture.test.ts:270`, dùng ở điều kiện `deps.has(owner)` dòng 287/291) — nghĩa là nếu `audit` được đưa vào `STRICT` với đúng khai báo hiện tại (`ALLOWED_EDGES.audit = []`), bài kiểm SQL sẽ LẬP TỨC ĐỎ, vì `audit/repository.ts` đọc 4 view (`v_stf_staff_label`, `v_ord_order_label`, `v_pty_party_label`, `v_loc_location_label`) của các module không nằm trong `deps` rỗng đó. Vậy khai báo `audit: []` **không khớp với phụ thuộc SQL thật** — chỉ không bị phát hiện vì `audit` ở nhóm LEGACY (không `defineSql`), nên chưa bao giờ đi qua bài kiểm SQL đó. `npm test` vẫn xanh dù có sai lệch này.
- **P3 — Nguyên tắc "tác nhân tự động/AI phải có tài khoản riêng" (`ADR-0010` điều 3, accepted) chưa được ép bằng mã hay CSDL nào.** Đây là **policy đúng hướng, đúng lúc còn hoãn** (chưa có tác nhân tự động nào ghi dữ liệu nghiệp vụ ngoài Cron danh mục, không thuộc diện áp dụng) — nhưng phải làm **trước**, không phải **sau**, khi có tích hợp AI đầu tiên, đúng như chính ADR đã tự cảnh báo.
- **P3 — Đổi tên trường/khách/số điện thoại xoá sạch giá trị cũ, kể cả trong nhật ký** (vì luật cấm ghi SĐT/email vào log). Đây là **đánh đổi có chủ đích** (PII vs traceability), không phải sơ suất — ghi rõ trong §17 để không ai "sửa" nhầm.
- **P3 — `updateDraftOrder` (sửa đơn nháp) XOÁ CỨNG thật `order_item`/`order_service` rồi chèn lại** — đối lập bề mặt với luật chung "không xoá cứng", nhưng đúng phạm vi vì hai bảng này bị đóng băng ngay khi đơn hết `draft` (`migrations/0008`), nên không có gì "lịch sử" để mất ở trạng thái nháp. Ghi lại để tránh ai đó coi đây là mẫu chung.

**Không phát hiện nào ở mức có thể làm sai lệch tiền, quyền, hay xoá lịch sử của dữ liệu đã xác nhận.**

---

## 2. REALITY MODEL

Đối chiếu 10 câu hỏi của "Reality Test" (mục III đề bài) với mô hình hiện tại:

| Câu hỏi | Trả lời được bằng dữ liệu? | Bằng chứng |
|---|---|---|
| 1. Thực thể nào tồn tại | Có — `pty_party` (PERSON/ORGANIZATION), `staff`, `loc_location`, `catalog_item` | `migrations/0011`, `0001`, `0010`, `0006` |
| 2. Sự kiện gì đã xảy ra | **Một phần** — chỉ sự kiện kèm đổi dữ liệu (`audit_log.action`); sự kiện không đổi gì (yêu cầu bị từ chối) thì không | §16 Scenario C |
| 3. Khi nào | Có — `created_at`/`valid_from_*` mọi bảng nghiệp vụ, `vnToday()` cho ngày dân sự VN | `docs/ARCHITECTURE.md` "Luật dữ liệu" |
| 4. Ai/cái gì tham gia | Có, qua `staff_id`/`party_id`/FK — trừ Cron (`staff_id NULL` có chủ đích) | ADR-0010 điều 3 |
| 5. Trong vai trò gì | Có — `pty_party_role` (role + location + hiệu lực), đã kiểm bằng insert thật cho phép một Party giữ ≥2 vai cùng lúc | §5 |
| 6. Thay đổi trạng thái gì | Có cho state ghi nhận cuối (đơn, vai, phân công); **không** cho giá trị trung gian bị ghi đè (tên/SĐT khách) | §17 |
| 7. Tại sao | **Yếu** — `audit_log.detail` là chữ tự do, một số route ghi lý do, phần lớn không | §6, §17 |
| 8. Theo quy tắc/policy nào | Có cho bất biến CSDL (trigger); **không** có cho hằng số nghiệp vụ (trần khách, cửa sổ ngày — nằm ở code, không version hoá) | §15 |
| 9. Ai/cái gì ghi nhận | Có — `staff_id` (NULL = hệ thống, có tài liệu); chưa phân biệt "người" và "tác nhân tự động" bằng cơ chế | §14 |
| 10. Tái dựng được sau 1 năm không | **Có điều kiện** — tái dựng được TRẠNG THÁI cuối và CHUỖI hành động đã xảy ra (nhờ `audit_log` chỉ-thêm, ép bằng trigger); **không** tái dựng được GIÁ TRỊ trung gian của các trường bị ghi đè | §6, §17 |

**Kết luận:** hệ thống trả lời tốt "ai/cái gì/khi nào/trong vai gì" (structural reality — tĩnh), yếu hơn ở "tại sao/theo quy tắc nào" (causal reality), và có lỗ thật ở "sự kiện không đổi dữ liệu" (interaction reality). Đây đúng là hình dạng một CRM ghi **trạng thái** tốt, chưa phải một sổ **sự kiện** đầy đủ — khớp với EXECUTIVE VERDICT của vòng 1 ("sổ đơn hàng, chưa phải ERP").

---

## 3. ENTERPRISE ONTOLOGY MAP

Dựng lại từ schema thật (không suy đoán tên gọi lý tưởng — chỉ ghi khái niệm THẬT có trong mã):

```
                         ┌──────────────────────────────────────┐
                         │           pty_party (WHO)             │
                         │  PERSON | ORGANIZATION — 1 hồ sơ/thực │
                         │  thể ngoài đời (ADR-0001)              │
                         └───────┬───────────────┬───────────────┘
                 ┌───────────────┘               └───────────────┐
      pty_party_role (Role, hiệu lực)                 pty_party_relationship (quan hệ 2 party,
      STAFF/SALES/ACCOUNTANT/GUIDE/                    hiệu lực, vd người liên hệ của đại lý)
      BOAT_CAPTAIN/DRIVER/AGENT/CUSTOMER
      + location? (nơi giữ vai)
                 │
      staff.party_id (1:1, staff_party_uq) ── stf_permission (quyền APP:
                 │                              SALES/ACCOUNTING/ADMIN/FIELD —
                 │                              KHÁC role hồ sơ, không bao giờ
                 │                              lẫn làm điều kiện chặn — R-N1-12)
                 │
      orders.booker_party_id (WHO đặt đơn — chỉ PERSON, ORGANIZATION bị 400
                 │             có chủ đích, chờ N2 tiếp) ── pty_contact_point
                 │                                           (SĐT chuẩn hoá, hiệu lực)
      ┌──────────┴───────────────────────────────┐
      │              orders (AGREEMENT)            │            loc_location (WHERE)
      │  draft → confirmed → cancelled (chỉ tiến,  │            văn phòng/bến cảng/…
      │  ép ở CSDL — migrations/0017)              │
      └──────────┬─────────────────────┬──────────┘
                 │                     │
      order_item (VALUE — dòng tiền:   order_service (WHAT + WHEN vận hành:
      qty × unit_price = line_total,   catalog_code, depart_date/time,
      chốt tại thời điểm lập, không    pickup_time/place, checkin_*,
      tính lại từ catalog)             pax_adult/child/senior/infant — số
                 │                     lượng, KHÔNG danh tính khách lẻ)
                 │
      catalog_item (WHAT — sản phẩm: mã, tên, giá theo 4 hạng khách,
      nguồn Google Sheet + catalog_override của admin — KHÔNG có tồn kho)

      dsp_assignment (PROCESS — ai phụ trách đơn: đóng dòng cũ + mở dòng
      mới, giữ lịch sử; KHÔNG có state machine data-driven, 2 trạng thái
      PENDING/DONE chưa dùng)

      audit_log (EVIDENCE — action + target + staff_id + created_at +
      detail chữ tự do; CHỈ-THÊM ép ở CSDL — migrations/0017; KHÔNG có
      cột giá trị-trước, KHÔNG có correlation_id/causation_id)

      mnt_setting (POLICY vận hành — 1 dòng singleton, ghi đè, không
      version hoá) · stf_permission (POLICY quyền, effective-dated)
```

**Không đưa vào map** (không tồn tại, xác nhận bằng grep + đọc migration, không suy đoán): `payment`/`bil_*`/`invoice`/`ledger`, `supplier`, `traveller_party_id`, `correlation_id`/`request_id` (ngoài `client_request_id` cục bộ của module `feedback`), bảng document/attachment.

---

## 4. CURRENT vs TARGET CONCEPTUAL ARCHITECTURE

| Lớp (mục L đề bài) | Hiện có | Đúng/đủ cho quy mô hiện tại? |
|---|---|---|
| REALITY | Doanh nghiệp thật ngoài `tourdao-sales` (điện thoại, Zalo, gặp mặt) | — |
| BUSINESS EVENTS | Một phần — chỉ sự kiện kèm đổi dữ liệu | Đủ (§2) |
| ENTERPRISE ONTOLOGY | `pty_party`/`role`/`relationship` (ADR-0001) | **Đúng, đã landed** |
| DOMAIN MODEL | `orders`/`order_item`/`order_service`/`catalog_item`/`dsp_assignment` | Đúng cho Travel, khoá cứng vào Travel (§8) |
| BUSINESS RULES/POLICY | Trigger CSDL (bất biến) + hằng số code (policy đổi được, chưa version hoá) | Đủ, xem §15 |
| WORKFLOW/APPLICATION | 2 bản hard-code song song (trigger + `rules.ts`) cho state machine 3 trạng thái | Đủ — KHÔNG cần engine (§11) |
| TRANSACTIONS | `db.batch()` D1, điều kiện thắng trong câu SQL | Đúng, vòng 1 đã xác nhận (KEEP #2) |
| PROJECTIONS | View công bố `v_<tiền tố>_*` (chỉ đọc, chỉ khoá+nhãn) | Đúng hướng "one reality, nhiều projection" — nhưng mới có 1 projection thật (đọc/nhãn), CHƯA có projection tài chính vì chưa có Payment |
| API | Router chung + `permissions.ts` một nơi | Đúng (vòng 1 §8: PASS) |
| EXPERIENCES | Web PWA duy nhất; chưa có Mobile riêng/Reports/AI | Đủ cho quy mô |

**Kết luận:** không cần đổi hình dạng các lớp — chỉ cần LẤP ĐÚNG CHỖ TRỐNG khi nhu cầu xuất hiện (Payment ở lớp Domain/Transactions, Event-không-đổi-dữ-liệu ở lớp Business Events), không cần thêm lớp mới nào.

---

## 5. PARTY / IDENTITY / ROLE ANALYSIS

**Xác nhận bằng insert thật (không suy đoán):**
- Một Party giữ đồng thời 2 vai khác mã (vd `CUSTOMER` + `AGENT`) trên cùng party_id: **cho phép**, đã insert thành công. Trùng vai cùng mã, cùng "nơi", cả hai còn mở: **bị chặn** (trigger `pty_party_role_no_overlap_ins`).
- Nhân viên dùng hồ sơ của chính mình làm `booker_party_id` (vừa là nhân viên vừa là khách): **cho phép tự nhiên**, không có gì chặn ở tầng nào (không phải bug — hệ quả tất yếu của "danh bạ chung", đúng ADR-0001 điều 6; chưa có quyết định nào của chủ dự án về việc có nên hạn chế hay không — nếu cần kiểm soát xung đột lợi ích thì đây là một quyết định nghiệp vụ, không phải lỗi kiến trúc).
- `traveller_party_id` (khách đi tour, tách khỏi người đặt) **chưa tồn tại trong CSDL** — grep xác nhận 0 kết quả toàn repo. `ADR-0001` điều 7 đã dự tính đủ cả `booker_party_id` và `traveller_party_id`; N2-lát-1 (đã lên production) cố ý chỉ làm `booker_party_id`. Đơn qua đại lý (tổ chức làm booker) bị máy chủ **từ chối** (400) có chủ đích, chờ lát N2 sau.
- Danh mục vai (`pty_role_type`): `STAFF, SALES, ACCOUNTANT, GUIDE, BOAT_CAPTAIN, DRIVER, AGENT, CUSTOMER` — **không có `SUPPLIER`**. `AGENT` (đại lý bán hộ) không cùng nghĩa với "nhà cung cấp dịch vụ" (ví dụ công ty cho thuê xe). Đây là Reality Gap nhỏ, rẻ để vá (thêm một dòng lookup) khi Scenario H (§16) thành nhu cầu thật.
- **Giới hạn effective-dating:** chỉ phần GÁN VAI (`pty_party_role.valid_from/to_date`) và QUAN HỆ (`pty_party_relationship`) có hiệu lực thời gian thật, chống chồng lấn bằng trigger. THUỘC TÍNH của Party (`display_name`, `pty_person.given_name/family_name`, `pty_organization.legal_name/tax_code`) bị **ghi đè tại chỗ** — chỉ còn `updated_at/updated_by` (ai/khi sửa lần cuối), không có giá trị trước đó. Ví dụ thực tế: MST của một đại lý bị gõ sai rồi sửa lại — hệ thống không biết MST sai đã từng là gì.

**Đánh giá theo ADR-0001:** mô hình đúng nguyên lý Party–Role–Relationship kiểu Oracle TCA (đã tự đối chiếu ở `docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md` — không lặp lại ở đây). Điểm yếu nhất không phải mô hình mà là RANH GIỚI QUYỀN quanh nó: hồ sơ nhân viên (`STAFF` role holder) và hồ sơ khách nằm CHUNG một bảng `pty_party`, cùng một ô quyền `party.write` (`any` cho SALES/ACCOUNTING/ADMIN) — đây chính là F-01 của vòng 1, và ADR-0013 (proposed) đề xuất đúng hướng sửa (tách quyền theo NGỮ CẢNH: hồ sơ có gắn tài khoản hay không), khớp với nguyên lý "Role ≠ Identity, nhưng authorization phải biết ngữ cảnh".

---

## 6. EVENT & HISTORICAL TRUTH ANALYSIS

**`audit_log`** (schema cuối, `migrations/0007`): `id, order_id, staff_id, action, target_type, target_id, detail, created_at`. **Không có cột giá trị-trước.** 37 action code, 7 nhóm (`src/shared/audit-actions.ts` — đã đếm lại trực tiếp: order 9, staff 10, party 6, location 2, system 1, catalog 5, feedback 4 = 37). Trigger `audit_log_no_update`/`audit_log_no_delete` (`migrations/0017`) ép chỉ-thêm **ở tầng CSDL**, kể cả SQL chạy tay — đây là bất biến thật, đã kiểm.

**UPDATE có audit kèm hay không (theo bảng):**
| Bảng | UPDATE có audit? | Ghi chú |
|---|---|---|
| `orders` (update/confirm/cancel/trip/booker) | **Có**, cùng batch | `orders/repository.ts` |
| `pty_party`/`pty_person`/`pty_organization`/mọi bảng `pty_*` ghi qua `parties/index.ts` | **Có**, cùng batch | |
| `staff` (phone/active), `stf_permission` | **Có**, cùng batch (`patchStaffStatements`) | |
| `dsp_assignment` (đổi người phụ trách) | **Có**, cùng batch | |
| **`staff.last_login_at`** (đăng nhập thành công) | **KHÔNG** | Cố ý — "chỉ ghi thời điểm, không ghi SĐT/PIN vào đâu" |

**Không phải mọi UPDATE có audit đều cho thấy giá trị cũ.** Ba mức độ, đều CHỦ Ý, không phải một mẫu chung:
1. **Đầy đủ trước→sau** (ngày/giờ chuyến — `describeTripChange`, `service-rules.ts`): sửa nhầm ngày khởi hành rồi sửa lại → CẢ giá trị sai đã từng có VÀ việc sửa lại đều đọc được từ `audit_log.detail` (dạng câu tiếng Việt, không phải cột có cấu trúc).
2. **Chỉ tên trường, không giá trị** (đổi tên/SĐT khách — `changeBooker`): luật cấm ghi SĐT/email vào log (đã có từ trước, sửa 2026-09-21 sau khi phát hiện `staff_updated` từng lộ SĐT) — nên sửa nhầm SĐT rồi sửa lại: **không có vết giá trị nào**, kể cả trong log.
3. **Xoá cứng thật** (`updateDraftOrder`: `DELETE FROM order_item`/`order_service` rồi chèn lại toàn bộ khi sửa đơn nháp): giá trị dòng dịch vụ/tiền cũ biến mất khỏi MỌI nơi (kể cả không có mô tả trong `detail`, trừ phần lệch giá danh mục). Phạm vi: chỉ áp dụng khi đơn còn `draft` (hai bảng này bị đóng băng cứng ngay khi xác nhận — `migrations/0008`), nên "lịch sử" bị mất chỉ là các bản nháp trung gian, không phải dữ liệu đã xác nhận.

**`correlation_id`/`causation_id`/`request_id`: không tồn tại** (xác nhận qua grep toàn repo). Chỉ có `client_request_id` — khoá chống gửi trùng cục bộ của module `feedback`, không phải cơ chế truy vết chuỗi sự kiện chung.

**`dsp_assignment` (ai phụ trách đơn) là ví dụ TỐT nhất trong hệ thống về giữ lịch sử:** đổi người phụ trách = đóng dòng cũ (`valid_to_at`) + mở dòng mới, trong CÙNG một `db.batch()` — không có nơi nào UPDATE đè `party_id`. Nên trả lời được "ai từng phụ trách đơn này, từ khi nào tới khi nào" đầy đủ.

---

## 7. CAUSALITY & TRACEABILITY ANALYSIS

- **"Ai làm" (actor):** trả lời được cho mọi hành động qua `staff_id` (trừ Cron = NULL có tài liệu). **PASS.**
- **"Tại sao" (reason/policy):** yếu — `audit_log.detail` là văn bản tự do do từng route TỰ CHỌN có ghi lý do hay không, không có trường `reason_code`/`policy_id` chuẩn hoá nào. Không trả lời được "quy tắc nào đã áp dụng lúc đó" ngoài suy luận từ action code.
- **Causation chain** (§XV, ví dụ "khách yêu cầu huỷ → duyệt → huỷ đơn → hoàn tiền → điều chỉnh kế toán"): CHỈ tái dựng được đoạn có tồn tại — hiện tại chỉ có `cancelled` (một dòng, không kèm lý do/trạng thái trước). Không có `payment`/`refund`/`accounting` để nối tiếp chuỗi vì các thực thể đó **chưa tồn tại** (không phải audit trail thiếu — nguyên nhân gốc là domain chưa có).
- **Không có `correlation_id`** nên không nối được các dòng `audit_log` phát sinh từ CÙNG một request/batch bằng khoá tường minh; phải suy luận bằng `order_id` + khoảng thời gian gần nhau — chấp nhận được ở quy mô hiện tại (~10 người dùng, vài đơn/ngày), sẽ khó đọc hơn khi khối lượng tăng.
- **Traceability ngược** (Experience → Projection → Transaction → Event → Actor → Cause → Reality): làm được tới "Actor" (ai bấm nút); dừng ở "Cause" vì không có trường lý do chuẩn hoá.

**Reality Trace — ba luồng nghiệp vụ THẬT (mã đang chạy, không phải luồng lý tưởng hoá):**

**(a) Lập đơn nháp → xác nhận → xuất ảnh xác nhận**
| Bước | Actor | Command | Event | Entity | State Change | Policy | Document | Projection | Audit |
|---|---|---|---|---|---|---|---|---|---|
| 1. Tạo đơn | nhân viên (`ctx.staff`) | `POST /api/orders` | — | `orders`, `order_item`, `order_service` | (mới) → `draft` | `order.create` (any cho SALES/ADMIN); `MAX_SERVICES/LINES/AMOUNT_VND` (code) | không | `v_ord_order_label` | `created`, `detail`=lệch giá danh mục nếu có |
| 2. Xác nhận | nhân viên (ownOrAssigned)/ADMIN | `POST /api/orders/:id/status` | trigger `orders_status_transition` + `orders_confirm_requires_trip` | `orders.status`, `order_item`/`order_service` (đóng băng — `order_service_frozen_*`) | `draft`→`confirmed` | `order.modify` | không | `v_ord_order_label` | `confirmed`, không `detail` |
| 3. Xuất ảnh xác nhận | nhân viên, trình duyệt | (client-side, canvas) | — | không đổi gì trong DB | không | không riêng | **ảnh PNG sinh ra nhưng KHÔNG LƯU** (không hash, không server) | không | `exported_png`/`exported_pdf` (action đã khai ở `audit-actions.ts`) — **nếu route thật sự ghi dòng này, đây là điểm mỏng: biết "đã xuất" nhưng không biết đã xuất NỘI DUNG gì nếu tranh chấp về sau (RG-7, §16)** |

**(b) Đặt/đổi người phụ trách đơn**
| Bước | Actor | Command | Event | Entity | State Change | Policy | Document | Projection | Audit |
|---|---|---|---|---|---|---|---|---|---|
| 1. Mở dòng phụ trách đầu tiên | hệ thống (tiêm qua `ctx.defaultHandlerStatement` khi tạo đơn) | (ngầm trong bước tạo đơn) | `INSERT_HANDLER_AFTER_CLOSE` | `dsp_assignment` (dòng mới, `valid_to_at` NULL) | (không có) → có người phụ trách | mặc định = người tạo đơn | không | `v_dsp_order_handler` | theo mẫu `handlerChangeStatements` |
| 2. Đổi người phụ trách | nhân viên (ownOrAssigned)/ADMIN | `dispatch.assign` | `CLOSE_HANDLER` + `INSERT_HANDLER_AFTER_CLOSE` (cùng batch) | `dsp_assignment` (đóng dòng cũ, mở dòng mới) | A (mở) → A (đóng) + B (mở) | `dispatch.assign` | không | `v_dsp_order_handler` | `order_handler_changed`, `detail`="từ X sang Y" (**có trước→sau dạng chữ**) |

**(c) Gửi Góp ý → tiếp nhận → trả lời**
| Bước | Actor | Command | Event | Entity | State Change | Policy | Document | Projection | Audit |
|---|---|---|---|---|---|---|---|---|---|
| 1. Gửi | bất kỳ tài khoản (`feedback.submit`: any) | `POST /api/feedback` (+`client_request_id`) | `INSERT … SELECT … WHERE đếm < trần` (chống trùng MỘT câu) | `fbk_ticket`, `fbk_message` | (mới) → mở | chống spam theo đếm trong khung giờ | không đính kèm file | — | `feedback_created` |
| 2. Tiếp nhận | ADMIN (`feedback.triage`) | đổi trạng thái/người xử lý | UPDATE `fbk_ticket` | `fbk_ticket` | mở → đang xử lý (ví dụ) | chuyển trạng thái ở `shared/feedback-catalog.ts` (chỉ mã, không CSDL) | ghi chú nội bộ (ẩn người gửi) | — | `feedback_status_changed`/`feedback_assigned` |
| 3. Trả lời | ADMIN/người xử lý | gửi tin nhắn | INSERT `fbk_message` | `fbk_message` | — | `feedback.view`: own cho người gửi | không | — | `feedback_replied` |

Ba luồng cho thấy: (a) và (b) là "sự kiện kèm đổi dữ liệu" — traceable tốt; (c) có vòng đời hai chiều rõ ràng nhưng KHÔNG liên kết được với `orders` (bảng `fbk_ticket` không có `order_id`) — đúng thiết kế (kênh góp ý CHUNG với hệ thống, không phải kênh yêu cầu của khách trên MỘT đơn cụ thể). Cột "Document" trống ở cả ba luồng — khớp với §10 (không có document/attachment store nào trong toàn hệ thống).

**Kết luận:** causality hiện tại đủ cho vận hành nội bộ (~10 người dùng, chủ dự án là người duyệt cuối, mọi ngữ cảnh còn nhớ được bằng người), nhưng sẽ là điểm nghẽn đầu tiên khi có kế toán/thu tiền thật (N3) — vì lúc đó "tại sao tiền bị hoàn" phải trả lời được bằng dữ liệu, không phải bằng hỏi lại nhân viên. Đây đúng là lý do audit-1 xếp F-02 (idempotency) và F-03 (lưới tiền) ưu tiên trước N3 — audit vòng 2 bổ sung: **N3 cũng cần một trường `reason`/`policy_ref` tối thiểu trên bảng `bil_*` tương lai**, không cần làm ngay.

---

## 8. TRAVEL DOMAIN ANALYSIS

Tên kiểu dữ liệu thật (không phải tên lý tưởng hoá): `OrderDto/OrderRow` (chung), `ServiceRow/CatalogServiceDto/EffectiveService/ValidService/StoredService` (đặc thù), `ValidTrip/TripInfoDto/TripUpdate` (đặc thù), `OrderItemDto/ValidItem/StoredItem` (chung — tên `Item`, không phải `Product`/`Offering`).

| Khái niệm | Thuộc Kernel (trung tính) | Thuộc Travel Domain (khoá cứng) |
|---|---|---|
| `pty_party`/`role`/`relationship`, `staff`/`auth`, `permissions.ts`, `audit_log`, `loc_location` | ✅ | |
| `orders` header (customer info, money scalar, status 3 trạng thái) | ✅ | |
| `order_item` (qty × unit_price = line_total) | ✅ (tầng tiền, trung tính) | |
| `catalog_item` (giá `price_adult/child/senior/infant`) | | ✅ — mô hình giá theo HẠNG KHÁCH, không phải giá SKU/tồn kho |
| `order_service` (`depart_date/time`, `pickup_*`, `checkin_*`, `pax_*`) | | ✅ — thuần khái niệm chuyến đi |
| `dsp_assignment` (người phụ trách đơn) | Gần trung tính (assignment nói chung), nhưng field name (`HANDLE` task kind) hiện chỉ có 1 loại việc | |

**Không có lớp "Offering"/"Product" đứng trên `Service`** để tách phần TIỀN/SỐ LƯỢNG (dùng lại được) khỏi phần KHÁI NIỆM SẢN PHẨM (đặc thù ngành). Đây không phải lỗi hiện tại (chưa ai cần bán gì khác), nhưng là điểm sẽ phải làm đầu tiên nếu có lĩnh vực kinh doanh thứ hai (§9).

---

## 9. NON-TRAVEL STRESS TEST

Giả định: công ty bán thêm sản phẩm vật lý (SKU, tồn kho).

**Dùng lại gần như nguyên xi:** `pty_party`/`role`/`relationship`, `staff`/`auth`, `permissions.ts` (đổi `Scope`/`MATRIX` là việc thêm hàng, không sửa cơ chế), `audit_log` (thêm action code mới, không sửa schema), `orders` header + `order_item` (qty×price→line_total, khoá lạc quan `updated_at`+`wonGuard`), cách sinh `order_code`.

**Phải viết lại hoàn toàn:** `catalog_item` (không có cột tồn kho ở BẤT KỲ bảng nào trong toàn schema — phải dựng mới từ đầu, không sửa được), `order_service` (100% khái niệm chuyến đi, không có gì tái dùng), `order_item.pax_code`.

**Kết luận:** không có gì trong Kernel bị "nhiễm Travel" tới mức cản trở lĩnh vực thứ hai. Chi phí thêm lĩnh vực mới = viết lại tầng sản phẩm/vận hành (dự kiến, chấp nhận được) + KHÔNG phải sửa danh tính/quyền/audit/tiền (điều quan trọng nhất, đã kiểm chứng). Đây là kết quả **PASS** cho Kernel Test (§XXI) — không cần hành động gì bây giờ.

---

## 10. ACCOUNTING PROJECTION ANALYSIS

- **`accounts` (module) ≠ kế toán.** Đây là module quản lý TÀI KHOẢN ĐĂNG NHẬP (nhân viên, PIN) — dễ nhầm tên với "kế toán tài chính". "Kế toán" trong hệ thống là quyền app `ACCOUNTING` (`permissions.ts`), một khái niệm khác hẳn. Rủi ro thấp (không gây lỗi, chỉ gây nhầm khi đọc mã) — ghi vào §18 Ontology Leak, không cần sửa ngay.
- **Quyền `ACCOUNTING` hiện tại chỉ xem đơn thô** (`order.view/money.view: any`) — KHÔNG có báo cáo tài chính/ledger nào. Các ô `payment.receive/refund`, `invoice.request/issue` **đã có sẵn trong `MATRIX`** (comment trong mã: "có mặt để khoá bản đồ", chưa có route dùng) — đây là một ví dụ TỐT của "chuẩn bị hình dạng trước, chưa xây tính năng" (khác với xây thừa) — nên GIỮ.
- **Không có bảng `payment`/`bil_*`/`invoice`/`ledger`.** Tiền tố `bil_` đã dành sẵn (`architecture.test.ts`, `src/CLAUDE.md`) nhưng chưa dùng. `ADR-0004` (accepted) định hướng N3 = "sổ thu tiền từng lần" (không phải hệ thống thanh toán/kế toán đầy đủ) + vai Kế toán; `ADR-0010` điều 2 (accepted) chốt: thông tin xuất hoá đơn là BẢN CHỤP theo từng yêu cầu, không làm bảng `party_site` kiểu Oracle TCA — đúng hướng, tránh over-engineering.
- **Giá đã CHỐT đúng cách:** `order_item.unit_price/line_total/catalog_price` lưu cứng tại thời điểm lập dòng, có trigger bất biến `line_total = qty × unit_price`, KHÔNG đọc lại giá catalog khi hiển thị đơn cũ. → Scenario E (nhà cung cấp đổi giá sau khi khách xác nhận) **biểu diễn đúng, không mất thông tin.**
- **Business Event → Economic Interpretation → Accounting Event → Journal → Ledger** (chuỗi lý tưởng của §XVIII): hiện dừng ở bước đầu (Business Event = tạo/xác nhận/huỷ đơn). Không có "Economic Interpretation" tách biệt — tiền chỉ là field trực tiếp trên đơn, chưa có khái niệm "recognition" nào. **Đây đúng lúc chưa cần làm** — chưa có kế toán tài chính thật, chỉ có sổ thu tiền dự kiến (N3, chưa thi công).
- **Document as evidence:** ảnh xác nhận PNG dựng HOÀN TOÀN ở trình duyệt (canvas), không lưu vết ở máy chủ (không file, không hash, không bảng). Không có R2 binding, không bảng attachment/document nào trong toàn hệ thống. Nếu về sau cần "bằng chứng đã gửi xác nhận cho khách" (tranh chấp, kiểm toán) thì đây là Reality Gap — hiện KHÔNG có nhu cầu nào được ghi lại đòi hỏi điều này.

---

## 11. WORKFLOW & POLICY ANALYSIS

- **Không có workflow engine, và ĐÚNG là không cần.** State machine đơn (3 trạng thái, 2 cạnh chuyển) tồn tại ở **hai bản hard-code song song**: trigger `orders_status_transition` (CSDL) + hàm `canTransition()` (`orders/rules.ts`, TypeScript) — đúng nguyên tắc "≥2 lớp độc lập" (P21) đã dùng nhất quán trong dự án, không phải trùng lặp vô ích.
- **`dsp_assignment`** có 2 trạng thái `PENDING/DONE` khai sẵn nhưng CHƯA DÙNG — chuẩn bị hình dạng trước, giống mẫu `payment.*`/`invoice.*` ở §10.
- **Hard invariant thật** (CHECK/trigger không đổi theo nghiệp vụ): trạng thái đơn chỉ tiến, các đẳng thức tiền theo DÒNG (`line_total=qty×price`, `total=subtotal-discount`, `remaining=total-deposit`), khuôn dạng ngày/giờ, `audit_log` chỉ-thêm, chống chồng lấn hiệu lực vai trò/quan hệ.
- **Policy bị khoá cứng vào DDL** (đổi được về nguyên tắc, nhưng nằm trong CHECK thay vì bảng tra cứu/code): `orders.status` và `deposit_method` dùng `CHECK IN (...)` — **chính dự án ở giai đoạn sau đã coi cách này là sai chỗ** (`src/CLAUDE.md`: "danh sách giá trị mở kiểm ở code, không CHECK liệt kê"; `audit_log.action`/`target_type` đã được "giải phóng" khỏi CHECK từ `migrations/0007`) — nhưng `orders.status`/`deposit_method` thì CHƯA. Rủi ro thấp (thêm giá trị mới cho hai cột này hiếm khi xảy ra, và với `status` việc CHECK cứng còn là một lớp bảo vệ có ích cho một bất biến thật), nhưng đáng ghi lại vì là điểm KHÔNG nhất quán với luật hiện hành của chính dự án.
- **Hằng số nghiệp vụ nằm ở code, không version hoá:** `MAX_SERVICES=20`, `MAX_LINES_PER_ORDER=50`, `MAX_DAYS_AHEAD=365`, `MAX_GUESTS_PER_SERVICE=50`, `MAX_AMOUNT_VND=100 tỷ` — hardcode TypeScript, đổi = sửa mã + deploy. Đây là **chủ ý đã ghi lại** (comment trong migration: "trần khách nằm ở code" vì "luật đổi được"), đúng mức cho hiện tại (không ai cần đổi trần theo mùa/theo khách hàng). Nếu về sau cần cấu hình theo thời điểm (ví dụ trần khách khác nhau dịp Tết), đây là chỗ sẽ cần chuyển sang bảng cấu hình có `effective_from/to`.
- **`mnt_setting` (bảo trì) là policy thật nhưng KHÔNG effective-dated:** 1 dòng singleton, ghi đè tại chỗ; lịch sử bật/tắt chỉ còn dưới dạng `audit_log` action `maintenance_changed` (chữ tự do). `allowed_phones` không sửa được qua API (chỉ SQL tay) — đúng vì đây là "van an toàn" hiếm khi đổi, không phải một cấu hình vận hành thường xuyên.
- **Turnstile bật/tắt theo biến môi trường** (deployment config, không phải policy nghiệp vụ) — đúng chỗ.

---

## 12. API / INTEGRATION ANALYSIS

(Không lặp lại §8 SECURITY REVIEW của vòng 1 — PASS cho CSRF/IDOR/injection/XSS. Phần này chỉ nhìn ontology của tích hợp.)

- **API-first thật:** mọi ghi dữ liệu nghiệp vụ đi qua router chung + `ctx.staff` đã xác thực + `permissions.ts` — không có đường nào cho UI ghi thẳng DB, không có logic nghiệp vụ nào sống trong `web/`.
- **Tích hợp ngoài hiện có:** Google Sheet (CSV công khai, đọc qua Cron mỗi 15'), Cloudflare Turnstile (đăng nhập), Cloudflare Email (báo admin khi có Góp ý). Cả ba đều MỘT CHIỀU (đọc hoặc gửi, không có webhook nhận vào).
- **Không có mẫu outbox/inbox, retry có cấu trúc, hay idempotency key tổng quát cho tích hợp** — đúng, vì chưa có tích hợp hai chiều nào cần nó. `client_request_id` (module `feedback`) là ví dụ ĐÚNG mẫu idempotency-key khi cần, nhưng mới áp dụng cục bộ cho một loại thao tác — audit-1 (F-02) đã đề xuất đưa mẫu này lên tầng chung.
- **Không cần xây integration framework tổng quát bây giờ** — chỉ có 3 tích hợp, cả 3 đơn giản, không có bằng chứng cần trừu tượng hoá thêm.

---

## 13. ENTERPRISE SAAS ANALYSIS — SCORECARD

Không tạo điểm số trang trí — mỗi dòng có bằng chứng hoặc tham chiếu vòng 1.

| Năng lực | Đánh giá | Bằng chứng |
|---|---|---|
| Identity | PARTIAL | Party/Role landed (ADR-0001, §5); ranh giới quyền quanh hồ sơ nhân viên còn hở (F-01, vòng 1) |
| Ontology (kernel/domain) | PARTIAL | Kernel trung tính thật (§9 PASS); domain Travel khoá cứng có chủ đích, chưa có lớp Offering (§8) |
| Auditability | PARTIAL | Chỉ-thêm + action log thật (§6); không có giá trị-trước, không correlation_id |
| Workflow | READY (đúng cỡ) | 2 bản hard-code cho state machine 3 trạng thái — KHÔNG cần engine (§11) |
| Policy | PARTIAL | Bất biến CSDL vững; hằng số nghiệp vụ chưa version hoá, `mnt_setting` chưa effective-dated (§11) |
| API | READY | Vòng 1 §8 PASS toàn bộ hạng mục bảo mật liên quan |
| Integration | MISSING nhưng KHÔNG cần xây thêm | Chỉ 3 tích hợp một chiều đơn giản (§12) — over-engineering nếu xây framework bây giờ |
| Security | READY (có điều kiện) | Vòng 1 §8: PASS trừ F-01/F-06 |
| Observability | MISSING | Vòng 1 F-09/§10: log console JSON, không metrics/tracing — đúng cỡ hiện tại |
| Operations | PARTIAL | Vòng 1 F-04: DR chưa chứng minh |
| Data Integrity | READY (có điều kiện) | Vòng 1: 2 lớp bất biến thật; F-03 (lưới tiền) còn hở |
| Extensibility (Travel) | READY | §8: tầng generic đủ vững |
| Non-Travel Extensibility | PARTIAL (đúng kỳ vọng) | §9: Kernel PASS, tầng sản phẩm/vận hành phải viết lại — bình thường, không phải lỗi |
| Actor / AI extension point | PARTIAL | ADR-0010 điều 3 đúng hướng, CHƯA enforce bằng mã (§14) |

**Không có dòng nào OVER-ENGINEERED** — đây là điểm đáng chú ý: ở quy mô 10 người dùng, dự án không xây thừa bất kỳ năng lực enterprise nào (không multi-tenant, không BPM, không event store, không policy engine tổng quát) — đúng tinh thần Anti-Bloat Test (§XLVII).

---

## 14. ACTOR & FUTURE AI EXTENSION POINT

- **Mọi ghi dữ liệu nghiệp vụ đòi `ctx.staff` đã xác thực**, trừ 2 route public không ghi dữ liệu nghiệp vụ (login/logout). **Không có đường máy-tới-máy** ghi dữ liệu nghiệp vụ hiện nay.
- **Tác nhân hệ thống duy nhất:** Cron đồng bộ danh mục — ghi `catalog_item` + `audit_log` với `staff_id = NULL`, có tài liệu hoá rõ ràng, KHÔNG thuộc diện "ghi thay người dùng" (đồng bộ dữ liệu bên ngoài, không phải nghiệp vụ do người vận hành nhập) — đúng phân loại theo ADR-0010.
- **`ADR-0010` điều 3 (accepted)** đã chốt nguyên tắc đúng cho tác nhân tự động/AI tương lai: phải có tài khoản `staff` riêng, đi qua API có phiên, `audit_log.staff_id` = chính tài khoản đó, không có đường ghi thẳng D1. **Xác nhận: đây CHỈ LÀ CAM KẾT TRONG ADR, CHƯA CÓ CƠ CHẾ MÃ/CSDL nào ép nó** — `audit_log.staff_id` không NOT NULL, không có cờ nào phân biệt "tài khoản người" khỏi "tài khoản tác nhân tự động", không có loại `access` route riêng cho service-account. Đây là **policy đúng, đang hoãn đúng lúc** (chưa có tác nhân nào cần áp dụng) — KHÔNG phải lỗi hiện tại, nhưng phải trở thành việc làm ĐẦU TIÊN (không phải vá sau) khi bắt đầu thiết kế tích hợp AI/tác nhân tự động đầu tiên, đúng như chính ADR đã tự ghi.
- Hai câu hỏi ADR-0010 tự bỏ ngỏ (chưa có lời giải): (i) đăng nhập đòi Turnstile ở trình duyệt — tác nhân tự động chưa có đường đăng nhập không qua Turnstile; (ii) chế độ bảo trì chặn theo `allowed_phones` — chưa quyết tác nhân tự động có bị chặn cùng cách hay cần cơ chế riêng. **Cả hai nên được chốt trong ĐẶC TẢ TÍCH HỢP ĐẦU TIÊN**, không phải bây giờ (chưa có tích hợp nào để chốt cho).

**READ / PROPOSE / EXECUTE / APPROVE (§XXX):** hiện hệ thống chỉ có 2 mức thật (không xác thực = không làm gì; xác thực + đủ quyền = EXECUTE ngay). Chưa có khái niệm "AI đề xuất, người duyệt" — **đúng, vì chưa có AI actor nào trong sản phẩm**. Khi thiết kế tích hợp AI đầu tiên, ma trận `permissions.ts` (đã có `Scope`/`MATRIX` một nơi) là chỗ tự nhiên để thêm một `Scope` mới (ví dụ `"proposeOnly"`) — không cần đổi kiến trúc, chỉ cần thêm giá trị enum khi có nhu cầu thật.

---

## 15. HARD INVARIANTS vs CONFIGURABLE POLICIES

| Quy tắc | Loại | Lớp ép | Version hoá? | Effective-dated? | Lý do |
|---|---|---|---|---|---|
| Trạng thái đơn chỉ tiến | Hard invariant | CSDL (trigger) + code (2 lớp) | — (bất biến) | — | Không bao giờ đổi theo nghiệp vụ |
| `line_total=qty×price`, `total=subtotal-discount`, `remaining=total-deposit` | Hard invariant | CSDL (trigger) | — | — | Đẳng thức số học, không đổi |
| `subtotal = Σ line_total` | **THIẾU** (chỉ ở code, F-03 vòng 1) | Code (`buildLines`) | — | — | Nên là hard invariant, hiện chưa ép ở CSDL |
| `audit_log` chỉ-thêm | Hard invariant | CSDL (trigger) | — | — | Toàn vẹn lịch sử |
| Chống chồng lấn hiệu lực vai trò/quan hệ | Hard invariant | CSDL (trigger) | — | Có (bản thân là cơ chế effective-dating) | Đảm bảo "một vai, một nơi, một khoảng thời gian" |
| `orders.status` giá trị hợp lệ | Policy đóng khung sai chỗ | CSDL (CHECK liệt kê) | Không | Không | Nên chuyển sang code như `audit_log.action` đã làm — rủi ro thấp, chưa cấp bách |
| `deposit_method` giá trị hợp lệ | Policy đóng khung sai chỗ | CSDL (CHECK liệt kê) | Không | Không | Tương tự |
| `party_kind IN (PERSON, ORGANIZATION)` | Hard invariant (chủ ý, ADR-0003 điều 3) | CSDL (CHECK) | — | — | Tập ĐÓNG có chủ đích, không phải sơ suất |
| Trần khách/dịch vụ/ngày (`MAX_*`) | Policy | Code (hằng số) | Không | Không | Đúng mức hiện tại; sẽ cần version hoá nếu có nhu cầu đổi theo mùa/khách hàng |
| `mnt_setting` (bảo trì) | Policy | Code + 1 dòng CSDL | Không | Không | Đúng mức (van hiếm khi đổi) |
| `ADR-0010` điều 3 (tác nhân tự động phải có tài khoản riêng) | Nên là hard invariant | **Chưa có lớp ép nào** | — | — | Đúng lúc hoãn — chưa có tác nhân nào cần áp dụng |
| Party attribute (tên, MST...) — giá trị mới nhất thắng | Ngầm định | CSDL (UPDATE ghi đè) | Không | Không | Không phải bug — chưa có nhu cầu lịch sử giá trị Party |
| **Authorization** — mặc định từ chối (route lạ/ô không khai = không được) | Hard invariant | Router + `permissions.ts` (code) | — | — | Điều 8.5 — không bao giờ đổi |
| **Authorization** — ai làm được thao tác gì (`MATRIX` trong `permissions.ts`) | Policy (đổi được — ADR-0007) | Code (TypeScript, một nơi duy nhất) | Không (đổi = sửa mã + deploy) | Không | Đúng mức hiện tại; không có nhu cầu đổi quyền theo thời điểm |
| **Authorization** — quyền của MỘT tài khoản (`stf_permission`) | Policy | CSDL (bảng, không CHECK) | Không | **Có** (`valid_from/to_at`) | Ai được cấp quyền gì, từ khi nào — effective-dated đúng cách |
| **Đánh số** (`order_code` theo ngày dân sự VN) | Hard invariant (khuôn dạng) | Code + CHECK khuôn dạng | — | — | Đơn giản, không cần bảng sequence riêng ở quy mô này |
| **Hoa hồng** (commission, vd giá net theo nhóm HDV) | **Không tồn tại** | — | — | — | `ADR-0001` điều 4 chỉ NHẮC khả năng này cho N4 (giá theo vai trò), chưa thiết kế — đúng lúc chưa làm |
| **Chính sách huỷ đơn** (huỷ trước/sau cọc, lý do, đơn thay thế) | **Không tồn tại** (huỷ chỉ là 1 trạng thái, không phân biệt) | — | — | — | Đã ghi ở vòng 1 (Domain Model Review); SPEC §2.3 đã dự kiến nhưng chưa thi công |
| **Thanh toán** (payment) | **Không tồn tại** (scalar `deposit_amount` trên `orders`) | — | — | — | §10; N3 (ADR-0004) chưa thi công |
| **Hoàn tiền** (refund) | **Không tồn tại** (chỉ có ô quyền `payment.refund` đã khoá sẵn trong `MATRIX`, chưa có route) | — | — | — | Chuẩn bị hình dạng trước, đúng cách — §10 |
| **Thuế** (VAT/thuế suất) | **Không tồn tại** | — | — | — | Không có cột %/số tiền thuế nào trong toàn schema |
| **Kế toán** (ledger, bút toán) | **Không tồn tại** | — | — | — | Quyền `ACCOUNTING` hiện chỉ xem đơn thô, không có sổ cái — §10 |
| **Phê duyệt** (approval workflow nhiều bước) | **Không tồn tại** — chỉ có "xác nhận đơn" (1 bước, không phải chuỗi duyệt) | — | — | — | Đúng mức: chưa có quy trình nào cần ≥2 người duyệt tuần tự |

---

## 16. REALITY GAP REPORT

| # | Tình huống thực (Reality) | Biểu diễn hiện tại | Thông tin mất | Hệ quả nghiệp vụ | Nguyên nhân kiến trúc | Đề xuất (chỉ khi có nhu cầu thật) |
|---|---|---|---|---|---|---|
| RG-1 | Khách gọi xin đổi ngày, bị từ chối (Scenario C) | Không có gì | Toàn bộ sự kiện | Không đo được nhu cầu đổi lịch của khách | State-ghi-đè, không có event log cho tương tác không đổi dữ liệu | DEFER — chỉ làm khi có nhu cầu đo/báo cáo |
| RG-2 | Một đơn được thu tiền nhiều lần (Scenario G) | 1 scalar `deposit_amount` | Từng lần thu riêng biệt | Không đối soát được "đã thu bao nhiêu lần, lần nào" | Chưa có entity Payment | ADR-0004/N3 đã định hướng — làm khi có nhu cầu thu nhiều lần thật |
| RG-3 | Một payment trả nhiều đơn (Scenario F) | Không thể | Toàn bộ | Không xử lý được khách trả gộp | Như trên | Như trên |
| RG-4 | Dịch vụ từ nhiều nhà cung cấp (Scenario H) | Không có cột nào | Nhà cung cấp | Không đối soát công nợ nhà cung cấp | Không có role/entity Supplier | DEFER — thêm 1 dòng lookup `pty_role_type` khi cần |
| RG-5 | Khách đi tour khác người đặt, có danh tính riêng (Scenario I, phần "traveler là hồ sơ") | Chỉ có số lượng theo hạng, không danh tính | Danh tính khách lẻ | Không gửi thông tin riêng cho từng khách | A1 đã chốt "khách lẻ không phải hồ sơ" — quyết định có chủ đích | Không phải gap — là quyết định đã duyệt |
| RG-6 | MST/tên tổ chức bị gõ sai rồi sửa lại | Ghi đè, chỉ còn `updated_at/by` | Giá trị sai đã từng có | Không tra được "trước đây ghi gì" nếu có tranh chấp | Party attribute không effective-dated | DEFER — chưa có tranh chấp nào đòi hỏi |
| RG-7 | Cần bằng chứng đã gửi ảnh xác nhận cho khách | Ảnh chỉ tồn tại tạm trong trình duyệt | Toàn bộ | Không có bằng chứng khi tranh chấp | Không có document/attachment/R2 | DEFER — chưa có tranh chấp nào |

---

## 17. TRUTH LOSS REPORT

| # | Nơi mất | Loại mất | Chủ ý hay sơ suất | Bằng chứng |
|---|---|---|---|---|
| TL-1 | Tên/SĐT khách bị sửa | Giá trị cũ, cả trong dữ liệu lẫn nhật ký | **Chủ ý** (luật cấm ghi PII vào log) | `changeBooker`, `src/CLAUDE.md` §7 |
| TL-2 | Dòng dịch vụ/tiền của đơn NHÁP bị sửa | Giá trị cũ (xoá cứng thật) | Chủ ý, phạm vi giới hạn (chỉ nháp, đóng băng ngay khi xác nhận) | `updateDraftOrder`, `migrations/0008` |
| TL-3 | Đăng nhập thành công | Toàn bộ sự kiện (không audit) | Chủ ý (tránh phình log, không phải PII) | `staff/index.ts` |
| TL-4 | Yêu cầu bị từ chối không đổi dữ liệu (Scenario C) | Toàn bộ sự kiện | **Chưa từng được quyết định** — không phải chủ ý, là giới hạn cấu trúc chưa ai nêu ra | §16 RG-1 |
| TL-5 | Thuộc tính Party (tên/MST tổ chức) bị sửa | Giá trị cũ | Chưa từng được quyết định (party_role effective-dated nhưng party attribute thì không) | §5 |
| TL-6 | Lý do nghiệp vụ ("tại sao") của phần lớn hành động | Structured reason | Chưa từng được quyết định — `detail` là chữ tự do tuỳ route | §6, §7 |

**Phân biệt quan trọng:** TL-1, TL-2, TL-3 là đánh đổi ĐÃ CÓ NGƯỜI QUYẾT (ghi trong luật/ADR) — không cần hỏi lại chủ dự án. TL-4, TL-5, TL-6 là giới hạn CHƯA TỪNG ĐƯỢC ĐẶT RA — không phải lỗi, nhưng nếu chủ dự án có nhu cầu thật liên quan tới chúng, đây là nơi cần quyết định (không tự suy đoán mà sửa).

---

## 18. ONTOLOGY LEAK REPORT

| # | Loại rò rỉ | Vị trí | Mức độ | Ghi chú |
|---|---|---|---|---|
| OL-1 | Cạnh phụ thuộc SQL thật không khớp đồ thị khai báo | `src/modules/audit/repository.ts` đọc 4 view của staff/orders/parties/locations qua SQL, nhưng `ALLOWED_EDGES.audit = []` trong `src/architecture.test.ts`. Chứng minh: `ALLOWED_EDGES` là nguồn `deps` của chính bài kiểm SQL (dòng 270/287/291) — nếu `audit` được đưa vào `STRICT` với khai báo hiện tại, bài kiểm SQL sẽ đỏ ngay | **P2** | Không sai luật đọc dữ liệu (đọc qua view công bố, đúng cách), nhưng khai báo cạnh phụ thuộc SAI SO VỚI THỰC TẾ và không bài kiểm máy nào phát hiện được vì `audit` là LEGACY (không `defineSql`, chưa từng đi qua bài kiểm SQL) — lỗ hổng trong chính cơ chế tự bảo vệ |
| OL-2 | Tên module gây hiểu nhầm domain | `accounts` (quản lý tài khoản đăng nhập) dễ nhầm với "kế toán tài chính"; "kế toán" thật là quyền `ACCOUNTING` | P3 | Không gây lỗi hành vi, chỉ gây nhầm khi đọc mã |
| OL-3 | Khái niệm Travel lẫn vào tầng lẽ ra chung | `catalog_item` giá 4 cột theo hạng khách (`price_adult/child/senior/infant`) thay vì mô hình giá/SKU chung | P3 (chấp nhận được — chưa có sản phẩm khác) | §8, §9 |
| OL-4 | Thiếu lớp trừu tượng giữa tiền/số lượng (chung) và khái niệm sản phẩm (đặc thù) | Không có type `Product`/`Offering` — `Item` (chung) và `Service` (đặc thù) không tách rời bằng một interface chung | P3 (chỉ cần khi có domain thứ 2) | §8 |
| OL-5 | Cơ chế EXPLAIN chỉ phủ 7/12 module | `src/architecture.test.ts` — 5 module LEGACY (gồm `orders`, `catalog` — hai module trung tâm) ngoài vùng phủ | P2 (đã ghi ở vòng 1 dưới dạng F-05 cho riêng `orders`; OL-1 mở rộng phát hiện sang `audit`) | Không phải finding mới hoàn toàn — làm rõ thêm phạm vi thật của F-05 |

---

## 19. ARCHITECTURE FINDINGS P0–P3 (vòng 2, không lặp F-01..F-13 của vòng 1)

- **P0:** không có.
- **P1:** không có (không tìm thấy sai lệch tiền/quyền/mất lịch sử dữ liệu đã xác nhận).
- **P2 (mới):**
  - **N-01** — `ALLOWED_EDGES.audit = []` không khớp phụ thuộc SQL thật (`audit` đọc 4 view của `staff/orders/parties/locations`); đã chứng minh bằng chính cơ chế của bài kiểm (`deps` ở dòng 270 dùng cho cả kiểm SQL, không chỉ kiểm `import`) — nếu chạy qua bài kiểm SQL, khai báo hiện tại sẽ đỏ. Không bị bắt vì `audit` ở LEGACY (OL-1, OL-5). *Đề xuất khi chạm tới `audit`:* khai đúng cạnh `audit: [staff, orders, parties, locations]` hoặc đưa `audit` vào `STRICT`.
- **P3 (mới):**
  - **N-02** — `ADR-0010` điều 3 (tác nhân tự động/AI) chưa có cơ chế ép — đúng lúc hoãn, nhưng phải là việc ĐẦU TIÊN khi thiết kế tích hợp tự động đầu tiên (§14).
  - **N-03** — `orders.status`/`deposit_method` dùng `CHECK IN (...)` thay vì kiểm ở code — không nhất quán với luật hiện hành của chính dự án (§11, §15). Rủi ro thấp.
  - **N-04** — Thiếu vai `SUPPLIER` trong `pty_role_type` — chỉ cần khi Scenario H (nhà cung cấp) thành nhu cầu thật (§5, RG-4).
  - **N-05** — `accounts` (tên module) dễ nhầm với kế toán tài chính — chỉ gây nhầm khi đọc mã, không phải bug hành vi (OL-2).

---

## 20. ADR RECOMMENDATIONS

Chỉ đề xuất ADR khi có quyết định kiến trúc thật cần chủ dự án duyệt — không đề xuất ADR cho việc tầm thường (Điều 6 CLAUDE.md, mục LVIII đề bài).

1. **Không đề xuất ADR mới cho Party/Event/Accounting Projection/Actor Model** — cả bốn đã có ADR đúng hướng (`ADR-0001`, `ADR-0004`, `ADR-0010`), chỉ chưa thi công phần cần thi công, đúng lúc hoãn phần cần hoãn. Đề xuất ADR mới lúc này sẽ là "suy đoán thiết kế không có ca dùng thật" — đúng loại quyết định mà `ADR-0010` đã từ chối làm sớm.
2. **Có thể cân nhắc (không cấp bách, đưa vào backlog LATER, không cần chủ dự án quyết ngay):** một dòng bổ sung nhỏ vào `docs/ARCHITECTURE.md` (không phải ADR — vì không đổi quyết định, chỉ ghi rõ một ranh giới đã có): "`audit_log.detail` là văn bản tự do, KHÔNG phải nguồn sự thật có cấu trúc cho giá trị-trước; nơi cần trước→sau có cấu trúc phải tự thêm cột, không dựa vào `detail`" — để tránh ai đó về sau đọc `detail` bằng regex và coi là nguồn dữ liệu.
3. **Khi (không phải nếu) bắt đầu thiết kế tích hợp AI/tác nhân tự động đầu tiên:** đặc tả đó BẮT BUỘC phải hiện thực hoá `ADR-0010` điều 3 bằng cơ chế thật (không chỉ tài liệu) — đây không phải ADR mới, là điều kiện thi công của một ADR đã accepted.
4. **Bổ sung một câu vào đặc tả thi công ADR-0013 (chưa cần ADR riêng):** đặc tả hiện tại (`docs/superpowers/specs/2026-09-22-ho-so-nhan-vien-chi-quan-tri-sua.md`) tách quyền sửa hồ sơ theo "có gắn tài khoản hay không" — nhưng §5 của audit này xác nhận bằng insert thật rằng một Party có thể ĐỒNG THỜI giữ tài khoản (`staff.party_id`) VÀ đóng vai khách (`booker_party_id` của một đơn khác), không có gì chặn. Đặc tả ADR-0013 chưa nói rõ: khi một hồ sơ như vậy được sửa, thao tác nào áp dụng — `party.staff.write` (chỉ ADMIN) hay `party.write` (SALES/ACCOUNTING/ADMIN)? Cần một câu quyết định rõ trước khi thi công, không suy đoán.
5. **Ghi lại một "ngưỡng" theo văn phong `ADR-0010` (cửa hai chiều, không đổi gì ngay):** khi công ty bán thêm một lĩnh vực có bản chất khác Travel (không có ngày khởi hành/điểm đón/check-in), tách `order_service` thành bảng chi tiết theo domain (giữ `order_service` cho Travel, thêm bảng mới cho domain khác, dựng lớp `Product`/`Offering` đứng giữa nếu cần — OL-4), giữ `orders`/`order_item` làm khung chung. **Không làm trước khi có domain thứ hai thật.**

---

## 21. AUDIT-1 REMEDIATION RECONCILIATION

| Finding vòng 1 | Vòng 2 xác nhận lại bằng mã thật | Kết luận |
|---|---|---|
| F-01 (hồ sơ nhân viên bị sửa bởi mọi người) | Đúng, xác nhận qua §5: ranh giới quyền quanh Party dùng chung không phân biệt "có tài khoản hay không" | **KEEP** — audit-2 củng cố thêm góc nhìn: đây là hệ quả tất yếu của mô hình Party dùng chung (đúng), lỗi nằm ở QUYỀN quanh nó, không nằm ở mô hình dữ liệu |
| F-02 (ghi không idempotent) | Đúng, xác nhận qua §7: không có `correlation_id`, không phân biệt Command/Event | **KEEP**, không đổi ưu tiên |
| F-03 (lưới tiền có lỗ) | Đúng, xác nhận trực tiếp bằng cách đọc nguyên văn trigger `orders_money_*`/`order_item_money_*` — không có trigger nào so `subtotal` với `Σ line_total` | **KEEP**, không đổi |
| F-04 (DR chưa chứng minh) | Ngoài phạm vi ontology, không xét lại | **KEEP**, không đổi |
| F-05 (`orders` ngoài ranh giới SQL nghiêm) | Mở rộng: `audit` cũng có cạnh phụ thuộc SQL thật không khai báo (OL-1/N-01) — cùng loại lỗ hổng, phạm vi rộng hơn F-05 đã ghi | **KEEP + MỞ RỘNG** phạm vi ghi nhận |
| F-06..F-13 | Ngoài phạm vi ontology (session/phiên, cờ hoạt động, DR, tìm kiếm, PII repo, contract nợ) | **KEEP**, không xét lại |
| **Không có finding nào của vòng 1 bị vòng 2 làm mất căn cứ** (không có phát hiện nào của audit-2 cho thấy audit-1 sai) | | |

**Bốn đặc tả đang chờ chủ dự án** (`docs/superpowers/specs/2026-09-22-*`): audit-2 **không đổi giả định nền** của cả bốn (chống gửi trùng, khoá tiền đơn đã xác nhận, hồ sơ nhân viên chỉ quản trị sửa, diễn tập khôi phục) — tất cả vẫn khớp với mô hình ontology vừa xác nhận. Việc "kiểm lại" 4 đặc tả đó theo yêu cầu ở `docs/HANDOFF-KIEM-TOAN-2026-09-22.md` §3 **vẫn CHƯA được làm** — cần một phiên riêng.

---

## 22. REVISED REMEDIATION PLAN

Audit vòng 2 **không đổi thứ tự NOW/NEXT/LATER/NEVER** của vòng 1 (`docs/AUDIT-2026-09-22-KIEN-TRUC.md` §21). Bổ sung 3 dòng:

- **NOW:** không thêm gì (3 việc NOW của vòng 1 đã đủ, không có gì ở tầng ontology cấp bách hơn).
- **NEXT (trước N3 thu tiền/hoá đơn):** thêm — khi thiết kế bảng `bil_*`, cấy `currency` NGAY (đã ghi ở vòng 1, RISK LATER — vòng 2 xác nhận đây đúng là chỗ rẻ nhất để làm sớm) VÀ một cột `reason`/`policy_ref` tối thiểu (mới, §7) để không lặp lại tình trạng "lý do" chỉ nằm trong chữ tự do.
- **LATER:** thêm N-01 (khai đúng `ALLOWED_EDGES.audit`), N-03 (`orders.status`/`deposit_method` chuyển CHECK sang code) — cả hai rẻ, không khẩn.
- **NEVER/DEFER (giữ nguyên tinh thần vòng 1, bổ sung 4 mục ontology-specific):** Payment/Invoice/Ledger đầy đủ trước khi N3 có nhu cầu thật; vai `SUPPLIER`; bitemporal cho thuộc tính Party; document/attachment + hash trước khi có tranh chấp thật; event log cho tương tác-không-đổi-dữ-liệu (Scenario C) trước khi có nhu cầu đo đạc thật; cơ chế enforce ADR-0010 điều 3 trước khi có tác nhân tự động đầu tiên (đây là "trước", không phải "never" — đã nêu rõ ở §14/§20).

---

## 23. TARGET ARCHITECTURE

Không đổi hình dạng đã có — Kernel hiện tại (Party/Role/Relationship, `staff`/`auth`, `permissions.ts`, `audit_log`, `loc_location`, `orders` header + `order_item`) **đã đúng cỡ và đúng hướng cho 10 năm tới**, với đúng 3 khoảng trống cần lấp KHI có nhu cầu thật (không phải bây giờ):
1. Payment/Invoice như entity riêng (N3, đã có ADR định hướng) + `currency`.
2. Cơ chế enforce actor-model cho tác nhân tự động (trước tích hợp AI đầu tiên, đã có ADR định hướng).
3. Sửa 2 lỗ hổng nhỏ trong chính cơ chế tự bảo vệ kiến trúc (N-01, N-03).

**Không cần thêm lớp/tầng mới nào** (không event store, không CQRS, không workflow engine, không policy-config engine tổng quát, không graph DB, không multi-tenant) — xem §25.

---

## 24. MIGRATION STRATEGY

Không có gì trong audit vòng 2 đòi hỏi một chiến lược migration khác với nguyên tắc đã có (`docs/ARCHITECTURE.md`: chỉ thêm file mới, expand–contract cho thay đổi phá vỡ). Ba việc cụ thể nếu/khi được chủ dự án quyết định làm:
- `bil_*` (N3): migration mới hoàn toàn, không đụng bảng cũ — rủi ro thấp, module mới.
- `pty_role_type` thêm dòng `SUPPLIER`: một `INSERT` vào bảng tra cứu, không phải migration cấu trúc.
- Sửa `ALLOWED_EDGES.audit`: đổi hằng số TypeScript trong `architecture.test.ts`, không đụng migration nào.

Không có mục nào trong audit vòng 2 cần expand-contract hai lần phát hành.

---

## 25. WHAT NOT TO BUILD

Xác nhận lại và MỞ RỘNG danh sách "NEVER" của vòng 1 (`§21`), từ góc nhìn ontology — không xây các mục sau **ở quy mô hiện tại**:

- **Event Sourcing / CQRS toàn hệ thống** — mẫu "điều kiện thắng trong câu SQL + nhật ký khi `changes()>0`" đang đúng cho D1; state-table + audit-log chỉ-thêm đã đủ cho quy mô này (§XI đề bài: Event ≠ Event Sourcing).
- **Workflow/BPM engine** — 3 trạng thái, 2 cạnh chuyển, đủ với 2 bản hard-code (§11).
- **Policy-as-data engine tổng quát** — số lượng policy cần đổi runtime hiện = 1 (`mnt_setting`), không đủ để đầu tư một engine.
- **Bitemporal architecture toàn hệ thống** — chỉ role assignment cần effective-dating (đã có); party attribute chưa cần.
- **Graph database** — mọi truy vấn "ai giữ vai gì ở đâu" hiện trả lời được bằng JOIN quan hệ thường (ADR-0001 đã chứng minh bằng truy vấn cụ thể).
- **Multi-tenant / multi-organization đầy đủ** — một công ty, một điểm bán; `ADR-0010` điều 1 đã chốt ngưỡng khi nào cần (chi nhánh thứ hai HOẶC đại lý đăng nhập).
- **Payment gateway / sổ cái kế toán tự xây** — chưa có nhu cầu thu tiền online hay báo cáo tài chính chuẩn kế toán; N3 chỉ là "sổ thu tiền từng lần", không phải kế toán đầy đủ.
- **Document/attachment store (R2 + hash) tổng quát** — chưa có nhu cầu bằng chứng pháp lý nào được ghi lại.
- **`Product`/`Offering` abstraction layer tách khỏi `Service`** — chỉ cần khi có lĩnh vực kinh doanh thứ hai thật (§9 đã chứng minh Kernel không bị khoá, nên việc này an toàn để hoãn).
- **AI Agent framework / approval workflow cho AI** — chưa có AI actor nào trong sản phẩm; `permissions.ts` đã có chỗ để thêm khi cần (§14).

---

## 26. FINAL FIVE ANSWERS

**1. Hệ thống đang mô hình hoá doanh nghiệp hay chủ yếu mô hình hoá phần mềm?**
Mô hình hoá DOANH NGHIỆP, có bằng chứng cụ thể: Party–Role–Relationship đã landed và kiểm chứng bằng insert thật (không phải thiết kế trên giấy — §5); giá được CHỐT đúng thời điểm kinh doanh (§10, Scenario E pass); phân công giữ lịch sử thật (§6). Điểm còn nghiêng về "phần mềm" (chưa tới "doanh nghiệp"): tiền là trường trên bản ghi thay vì sự kiện kinh doanh độc lập (§10); tương tác không đổi dữ liệu thì vô hình (§16, Scenario C) — cả hai đều là giới hạn ĐÃ BIẾT, chưa gây hại vì chưa có nhu cầu thật đòi hỏi chúng.

**2. Kiến trúc có ghi nhận được sự kiện quan trọng mà không mất identity/context/causality/history không?**
**Có điều kiện.** Với sự kiện KÈM đổi dữ liệu (đổi vai trò, đổi người phụ trách, đổi ngày chuyến): CÓ — giữ identity (`staff_id`/`party_id`), context (action+target), history (chỉ-thêm ép ở CSDL), causality yếu (không có `reason` chuẩn hoá, §7). Với sự kiện KHÔNG đổi dữ liệu: KHÔNG ghi được gì (§16 RG-1) — giới hạn thật của mô hình state-ghi-đè, không phải lỗi vì chưa ai cần trả lời câu đó.

**3. Travel là Domain chạy trên Business Platform, hay Platform thực chất là Travel ERP đổi tên?**
**Cả hai đúng, ở hai tầng khác nhau.** Tầng danh tính/quyền/audit/thời gian/tiền-vô-hướng (`parties`, `staff`/`auth`, `permissions.ts`, `audit_log`, valid_from/to, tiền INTEGER) là Platform THẬT — đã kiểm chứng bằng Non-Travel Stress Test (§9, PASS, không cần sửa gì để bán sản phẩm khác). Tầng sản phẩm/vận hành (`catalog_item` giá theo hạng khách, `order_service` với depart/pickup/checkin) là Travel THẬT — khoá cứng có chủ đích, sẽ phải viết lại hoàn toàn cho lĩnh vực khác. Không phải "ERP Travel đổi tên Platform" — là Platform thật có một Domain Travel cắm vào đúng cách, chỉ thiếu lớp Offering trừu tượng đứng giữa (chưa cần, vì chưa có Domain thứ hai).

**4. Nếu mai có lĩnh vực kinh doanh khác — giữ gì, đổi gì?**
GIỮ nguyên xi: `parties` (toàn bộ), `staff`/`auth`, `permissions.ts`, `audit` (module, sau khi vá N-01), `locations`, `orders` header + `order_item`. VIẾT LẠI hoàn toàn: `catalog_item`, `order_service`, `pax_*`. Không có bảng/module nào ở giữa (vừa giữ vừa sửa một phần) ngoài `dsp_assignment` (giữ cơ chế, có thể cần thêm loại `task_kind` khác `HANDLE`).

**5. Kernel nhỏ nhất cần tồn tại để hệ thống phát triển 10 năm không tự khoá mình?**
Đã tồn tại đúng cỡ: Party–Role–Relationship có hiệu lực thời gian, `audit_log` chỉ-thêm mở rộng được bằng action code mới (không cần đổi schema), ma trận quyền một nơi mặc định từ chối, tiền `INTEGER` tính ở server. **Một khoảng trống rẻ-bây-giờ-đắt-sau đã xác định:** thiếu cột `currency` — nên thêm ngay khi tạo bất kỳ bảng tiền mới nào (kể cả `bil_*`), dù hiện chưa cần đa tiền tệ (đã ghi ở vòng 1 RISK LATER, vòng 2 xác nhận và nâng thành khuyến nghị hành động cụ thể). Không cần thêm gì khác vào Kernel bây giờ — mọi mở rộng còn lại (Payment, Supplier, Document, Actor enforcement) đều mở rộng được bằng bảng/dòng mới, không đòi sửa Kernel.

---

*Tài liệu này không sửa mã, không đổi quyết định nào đã duyệt. Mọi đề xuất chạm dữ liệu/quyền/tiền/luật vẫn cần ADR hoặc chủ dự án duyệt theo CLAUDE.md §3. Bằng chứng: 5 báo cáo agent con (đọc mã trực tiếp + 2 lượt insert thật trên SQLite tạm qua `tests/audit/harness.mjs`, không đụng D1 thật) + đọc trực tiếp `docs/adr/*`, `docs/ARCHITECTURE.md`, `src/shared/permissions.ts`, `docs/AUDIT-2026-09-22-KIEN-TRUC.md`, `docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md` của người điều phối. Hai agent con độc lập đã chạy lại `npm test` (443/443 xanh) và `npm run typecheck` (thoát mã 0) trong lúc kiểm toán — vòng 2 không sửa mã nào, cây vẫn sạch trong suốt quá trình.*
