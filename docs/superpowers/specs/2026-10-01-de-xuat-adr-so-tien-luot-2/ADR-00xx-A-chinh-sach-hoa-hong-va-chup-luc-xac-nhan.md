# ADR-00xx-A — Sổ tiền lượt 2 (D4): bảng mức hoa hồng theo vai bên ngoài × nhóm dịch vụ, mức riêng từng đối tác; chụp vào đơn **lúc Xác nhận**

- **Trạng thái:** **proposed** — bản nháp của người soạn (AI, vai lập kế hoạch), 2026-10-01. **Chưa qua người kiểm độc lập.** AI không tự duyệt (Hiến pháp N3, Điều 7.2).
- **Số hiệu:** giữ chỗ `ADR-00xx-A`. Số thật lấy lúc gộp (dự kiến từ 0071; trên các nhánh đã có 0068, 0069, 0070; một phiên khác có thể đang soạn ADR "nơi trả mặc định theo dịch vụ").
- **Ngày:** 2026-10-01.
- **Thuộc gói:** lượt duyệt **2a** (ADR này một mình — **3** quyết định chạm dữ liệu/quyền: (1) bảng mức + ô; (2) **đổi cách suy người hưởng** từ "vai nhóm `EXTERNAL`" sang danh sách được hưởng — đổi hành vi lượt 1 và chỗ hở kiểu F-01; (3) chụp lúc Xác nhận + ô; trang ghép `trang-ghep.md` §0, §2a). **Phát hành chung một bản** với B, C, D, E (xem `README.md` — hạn khoá kỳ của ADR-0026 và L-T1 của ADR-0057).
- **Mốc đo mã:** nhánh `worktree-doi-chieu-phieu-giam-doc` @`8f647226`; `main` @`0c4309cd` (bản 1.50) có cùng các tệp trích dẫn ở đây (không kiểm từng dòng trên `main`).
- **Nguồn — lời chủ đã chốt (áp dụng, không hỏi lại):**
  - ADR-0018 điều 11 + đặc tả mô hình vai §11 (Q17, Q33, Q35): chiết khấu khác nhau theo đối tác và theo dịch vụ, **ô cụ thể nhất thắng (6 mức)**, có hiệu lực theo ngày, tính trên **giá bán lẻ trước khuyến mại**, làm tròn tới đồng theo dòng, chỉ tính ở máy chủ; **Kế toán / Quản trị / Toàn quyền sửa bảng** (`partner.commission.write`) và **sửa mức của một dòng trên một đơn, lý do bắt buộc**; nội bộ có quyền xem tiền thấy chiết khấu, đối tác thấy của mình, khách không bao giờ.
  - Đặc tả Hoàn tất §10: **Q5** mỗi ô một kiểu — % trên giá bán **hoặc** số tiền cố định mỗi khách/vé; **Q4** "đại lý" là tên gọi chung của HDV độc lập, Tài xế taxi, Công ty lữ hành, Lễ tân khách sạn; HDV **nội bộ** không hưởng.
  - Bản tổng hợp §10: **H1** người hưởng = bên đặt; **H5** chụp mức vào đơn **lúc Xác nhận** (và khi thêm dịch vụ); **H7** "mỗi khách" đếm người lớn + trẻ em + người cao tuổi, không đếm em bé, dịch vụ tính theo nhóm thì theo lượt; **H9** mỗi vai bên ngoài tự động là một nhóm, gắn được mức riêng cho từng đối tác.
  - Chủ 1/10 (`2026-10-01-uu-tien-xe-chay-quyet-dinh.md`): **U3** ghi nợ từng đơn, chốt theo tháng; **U4** đối tác xem sổ của mình, không thấy giá vốn, tỷ lệ nội bộ.
- **ADR liên quan:** ADR-0018 (điều 9, 11 — **sửa**), ADR-0024 (điều 1–2: module `pricing`, cạnh `orders → pricing`), ADR-0026 (bảng "Sửa câu", dòng ADR-0018 điều 11 — đã báo trước câu này sẽ được thay ở ADR của D4), ADR-0027 điều 2b (trần giảm giá — xử lý ở ADR-00xx-C), ADR-0058 (nhóm dịch vụ `ctl_group`), ADR-0061 A-14, ADR-0019 (cổng), ADR-0038 (Quản trị vs Toàn quyền).
- **Hiến chương áp dụng (Phần I, đã duyệt):** 2.3 (điều khoản trên vai, không trên tài khoản), 5.1, 5.2 (cấu hình bằng dữ liệu có kiểu, có ngày hiệu lực), 5.3, 5.4 (một hàm tính), 5.5, **5.6 (chụp tại mốc — đổi mốc phải bằng ADR mới ghi rõ câu bị thay)**, **5.7 (giữ đối tượng khi thiếu điều kiện, không lấy 0)**, 5.12, 5.15, 5.17.
- **Xây trên lỗ đang hở:** **không.** `docs/quyen-hoan.json` mục `phat_hien` = `[]` ở cả `main` @`0c4309cd` lẫn `8f647226` (đọc 2026-10-01); mục `thao_tac` không chứa ô nào ADR này dùng.
- **Loại quyết định:** **một chiều** cho phần bản chụp trên đơn (đơn đã chụp không đổi theo bảng mới — đúng ý chủ) và tiền tố bảng `prc_`/`ord_`; **hai chiều** cho các ô quyền và con số trong bảng mức (dữ liệu, đổi bằng dòng mới).

---

## Tóm tắt cho chủ (lời thường)

1. App có **bảng mức hoa hồng** cho đại lý: theo **vai** (Công ty lữ hành, HDV độc lập, Lễ tân khách sạn, Tài xế taxi, Cộng tác viên — câu C3) × **nhóm dịch vụ** (14 nhóm đã có trong app), và **mức riêng cho từng đại lý** khi có thoả thuận. Mỗi ô là **%** trên giá bán lẻ **hoặc** **số tiền mỗi khách**. Mỗi dòng có ngày bắt đầu, ngày kết thúc.
2. Kế toán, Quản trị, Toàn quyền nhập và sửa bảng (đã chốt). Có ô **"thử tra"**: chọn đại lý + dịch vụ → thấy mức và dòng nào thắng.
3. Khi đơn được **Xác nhận**, app **chụp** mức của từng dịch vụ vào đơn. Đổi bảng sau đó **không** đổi đơn đã xác nhận.
4. Không tìm thấy mức nào cho một dịch vụ: đơn **vẫn xác nhận được**, nhưng bị **giữ** ở bước "Đã giao" với lý do "thiếu mức hoa hồng" cho tới khi Kế toán cài mức hoặc ghi mức tay cho dòng đó (câu C2). App **không bao giờ tự lấy 0**.

---

## Bối cảnh (hiện trạng đo trên `8f647226`)

| Nơi | Hiện trạng | Nguồn |
|---|---|---|
| Module `pricing` | Khai trong luật kiến trúc (cạnh `orders → pricing`, `pricing → parties, catalog, audit`; tiền tố `prc_`/`v_prc`), **chưa có thư mục, chưa có bảng** | `src/architecture.test.ts:43-48`, `:174-175` |
| Ô `partner.commission.write` | Có tên trong đặc tả §11, **không có trong `MATRIX`** | `src/shared/permissions.ts` (grep không thấy) |
| Đơn đối tác | Bị chặn "Đã giao" vì chưa có hoa hồng (M1 = A) | `src/modules/billing/rules.ts:179-181` |
| "Loại dịch vụ theo tiền tố mã" (ADR-0018 điều 11) | **Không làm được**: mã dịch vụ không theo tiền tố nhóm (`ZIP`, `ATV`, `SM1`; `TT…`/`TTB…`/`TB…` đè nhau) | ADR-0058 "Bối cảnh" |
| Nhóm dịch vụ | Có từ 1.48: `ctl_group` (14 nhóm), `ctl_service_group` (mỗi dịch vụ đúng một nhóm, có lịch sử) | `migrations/0055_nhom_dich_vu.sql:10-40` |
| Vai bên ngoài | Nhóm `EXTERNAL` gồm 5 vai đối tác **và** `DRIVER_EXTERNAL` (Tài xế đối tác, ADR-0048) | `migrations/0024:12-22`, `0037:6` |
| Trần giảm giá của Đối tác | "tạm bằng 0" tới khi có bảng chiết khấu | ADR-0027 điều 2b |

---

## Quyết định

### Phần A1 — Bảng mức hoa hồng (module `pricing`)

1. **Tạo module `pricing`** đúng như ADR-0024 điều 1 (hạng `STRICT` từ ngày đầu; `repository.ts` nghiêm; `index.ts` công bố hàm đọc + hàm thuần). Không đặt số nào lên bảng `catalog_*` (Sheet ghi đè) và không phục vụ qua route danh mục.
2. **Danh sách vai được hưởng** — bảng tra cứu `prc_beneficiary_role` (`role_type_code` khoá ngoại `pty_role_type`, `active`). Gieo **5 mã**: `TRAVEL_AGENCY`, `GUIDE_FREELANCE`, `HOTEL_RECEPTION`, `TAXI_DRIVER`, `COLLABORATOR` (dòng `COLLABORATOR` theo câu C3; chủ chọn "không" thì gieo `active = 0`). **Không** gieo `DRIVER_EXTERNAL`, `CARRIER`, vai nội bộ.
   - Lý do: nhóm `EXTERNAL` hôm nay chứa cả Tài xế đối tác (`0037`). Suy "người hưởng = bên đặt có vai nhóm bên ngoài" như lượt 1 sẽ biến một tài xế đối tác được chọn làm bên đặt thành người hưởng hoa hồng. Đây đúng là khuôn lỗi F-01 (bảng dùng chung nhận thêm loại thực thể) — xem `trang-ghep.md` §1.
3. **Người hưởng của đơn** (H1, ADR-0018 điều 9) = **bên đặt** (`orders.booker_party_id`) khi hồ sơ đó đang mở **ít nhất một** vai trong `prc_beneficiary_role` (đọc qua view công bố của `parties` + bảng của `pricing`). Thay cách suy của lượt 1 ("vai nhóm `EXTERNAL`", ADR-0026 điều 1) **cho mục đích hoa hồng**. Ba trường hợp lạ:
   - Bên đặt mang vai `EXTERNAL` **không** thuộc danh sách (vd Tài xế đối tác) ⇒ đơn bị **giữ** ở "Đã giao", lý do "bên đặt là … — không thuộc danh sách được hưởng; sửa bên đặt hoặc cài mức tay" (5.7 — không đoán là khách lẻ).
   - Bên đặt mang **hai** vai được hưởng khác nhau (vd vừa Lễ tân vừa Cộng tác viên) mà bậc 4–6 cho ra hai mức khác nhau ⇒ dòng đó **thiếu mức (xung đột)**, giữ như điều 8. Bậc 1–3 (mức riêng đối tác) thắng nên không xung đột.
   - Bên đặt là nội bộ, khách lẻ, công ty chủ ⇒ không người hưởng, không hoa hồng (không phải "thiếu mức").
4. **Bảng mức** `prc_commission_rule` (tên đề xuất, chốt ở kế hoạch) — mỗi dòng:
   - **áp cho:** đúng một trong (`target_party_id` — một đối tác cụ thể) hoặc (`target_role_code` — một vai trong `prc_beneficiary_role`) — `CHECK` đúng một;
   - **phạm vi dịch vụ:** `scope` ∈ (`SERVICE` + `catalog_code`) / (`GROUP` + `group_code` của `ctl_group`) / (`ALL`) — `CHECK` khớp cột;
   - **kiểu:** `kind` ∈ `RATE` (`rate_bp` INTEGER phần vạn, 0…10000; 1000 = 10%) / `PER_PAX` (`per_pax_amount` INTEGER VNĐ ≥ 0) — `CHECK` đúng một cột có số (Q5);
   - `valid_from_date` (bắt buộc), `valid_to_date` (trống = còn hiệu lực), `note`, đủ bốn cột WHO.
   - **Không xoá cứng; không sửa số:** trigger chặn `DELETE` và mọi `UPDATE` trừ **đóng hiệu lực** (đặt `valid_to_date` từ trống thành một ngày ≥ `valid_from_date`). Đổi mức = đóng dòng cũ + mở dòng mới (5.2, 5.5).
   - **Không chồng:** trigger chặn hai dòng cùng (áp cho, phạm vi, mã) có khoảng hiệu lực giao nhau (LC-5 của đặc tả mô hình vai). Trigger chỉ đọc bảng `prc_` + view công bố (ADR-0024 điều 5).
   - **Mức 0% / 0 đ là hợp lệ** khi được **ghi rõ** thành một dòng (vd đại lý chỉ đặt hộ, không hưởng). "Không có dòng" khác "dòng 0".
5. **"Loại dịch vụ" = nhóm dịch vụ của ADR-0058**, không phải tiền tố mã (không làm được — bảng Bối cảnh). `pricing → catalog` (cạnh đã có) đọc nhóm hiện hành của một mã qua view công bố của `catalog` (tên chốt ở kế hoạch; hôm nay `catalog` là `LEGACY`, view mới đặt theo khuôn "nửa nghiêm"). Dịch vụ ở "Chưa phân loại" chỉ khớp bậc `SERVICE` hoặc `ALL`. Quản trị đổi nhóm của một dịch vụ ⇒ chỉ ảnh hưởng đơn **xác nhận sau** đó (đơn cũ đã chụp).
6. **Chọn mức — ô cụ thể nhất thắng** (6 bậc, đúng đặc tả §11), chỉ xét dòng **đang hiệu lực ở ngày chụp** (`vnToday()` lúc Xác nhận): (1) đối tác + dịch vụ, (2) đối tác + nhóm, (3) đối tác + mọi dịch vụ, (4) vai + dịch vụ, (5) vai + nhóm, (6) vai + mọi dịch vụ. Hàm thuần **duy nhất** `chonMuc` trong `pricing/rules.ts` (5.4), có test bảng ca.
7. **Dịch vụ nhập tay** (không mã danh mục, ADR-0061) **không khớp dòng mức nào, kể cả dòng "mọi dịch vụ"**: theo ADR-0061 A-14 dòng nhập tay **không có nguồn** ⇒ trên đơn có người hưởng luôn `MISSING`, giữ ở "Đã giao" tới khi Kế toán ghi mức tay cho dòng đó. (Đối tác không tạo được dòng nhập tay — ADR-0061; trường hợp này chỉ xảy ra khi nội bộ thêm dòng nhập tay vào đơn có người hưởng.)

### Phần A2 — Chụp vào đơn lúc Xác nhận (module `orders`)

8. **Mốc chụp = lúc Xác nhận** (H5). **Đây là sửa câu của ADR-0018 điều 11 đã duyệt** ("chụp theo từng dòng dịch vụ lúc **gửi đơn**") — chủ duyệt ADR này là duyệt việc thay câu đó (Hiến chương 5.6). Bảng "Sửa câu" dưới đây.
   - Lô ghi Xác nhận (`POST /api/orders/:id/status` → `confirmed`, module `orders`) chèn **một bản chụp mỗi dòng dịch vụ** của đơn vào bảng mới `ord_service_terms` (module `orders`, tệp "nửa nghiêm" như `chang-hanh-khach-repo.ts`) **trong cùng `db.batch()`** — không có lúc "đã xác nhận mà chưa chụp".
   - Mỗi bản chụp: `order_id`, `order_service_id`, `beneficiary_party_id` (trống = không người hưởng), `commission_status` ∈ `NONE` (không người hưởng) / `SET` / `MISSING`, `commission_kind`, `commission_rate_bp` **hoặc** `commission_per_pax`, `commission_rule_id` (nguồn — dòng nào của bảng thắng; Kế toán tra lại), `source` ∈ `AUTO` / `MANUAL`, `reason` (bắt buộc khi `MANUAL`), `supersedes_id` (dòng chụp bị thay; `UNIQUE`), `captured_date` (ngày dân sự VN), đủ bốn cột WHO. Các cột phần cung ứng (người bán, nhà cung cấp, a%) **do ADR-00xx-B thêm vào cùng bảng, cùng migration**.
   - **Chỉ-thêm:** trigger chặn `UPDATE`/`DELETE`. Bản chụp **hiện hành** của một dòng = dòng không bị dòng nào `supersedes_id` trỏ tới. `CHECK`/trigger: mỗi `order_service_id` tối đa một bản hiện hành.
   - Trigger khoá sau "Đã giao" (khuôn `0044`): chặn chèn bản chụp mới cho đơn đã "Đã giao" (đọc cột `delivered_at` của chính `orders` — cùng module).
9. **Khi nào chụp lại** (dòng mới thay dòng cũ, cùng lô với thao tác gây ra, có nhật ký):
   - **thêm dịch vụ** sau xác nhận (nếu có đường đó — ADR-0063 còn proposed): chụp dòng mới;
   - **đổi bên đặt** của đơn đã xác nhận (ADR-0011): chụp lại **mọi** dòng theo bên đặt mới, theo bảng ở **ngày đổi** (người hưởng đổi thì hoa hồng phải theo người mới);
   - **Kế toán / Quản trị / Toàn quyền ghi mức tay** cho một dòng (ô `order.terms.override`, lý do bắt buộc, `source = MANUAL`): dùng để thả đơn "thiếu mức" hoặc sửa sai trước "Đã giao". Sau "Đã giao" không chụp lại được — sai sót sửa bằng phiếu điều chỉnh trong sổ (ADR-0025 điều 10).
   - **Không** chụp lại khi: đổi số khách / sửa tiền qua dòng điều chỉnh (ADR-0014 điều 6), đổi giờ, đổi người phụ trách. Số khách mới áp lên **mức đã chụp** (điều 10).
10. **Số tiền hoa hồng không chụp — mức mới chụp.** Hoa hồng của một dòng = hàm thuần **duy nhất** `hoaHongDong` (`pricing/rules.ts`), gọi lúc cần số (màn đơn, trần giảm giá, phiếu "Đã giao"):
    - `RATE`: làm tròn tới đồng của (`rate_bp` × **thành tiền dòng hiện hành trước giảm giá cấp đơn**) / 10000 (đặc tả §11; "hiện hành" = sau điều chỉnh số khách — như ADR-0017 điều 5). Cách làm tròn (nửa lên) là **giả định của AI**, sổ vàng xác nhận.
    - `PER_PAX`: `per_pax_amount` × **số khách tính hoa hồng hiện hành** của dòng = người lớn + trẻ em + người cao tuổi, **không** em bé; dịch vụ tính theo nhóm/lượt → đếm theo lượt (H7).
    - `orders/index.ts` công bố **một** hàm `phanThuongMaiCuaDon(db, orderId)` trả từng dòng: thành tiền trước giảm, bản chụp hiện hành, hoa hồng (đã tính bằng hàm của `pricing`), cờ thiếu. `billing` lấy số **chỉ** qua hàm này (cạnh `billing → orders` đã có) — **không** thêm cạnh `billing → pricing`.
11. **Ai thấy phần thương mại của đơn** — route đọc riêng của `orders` (vd `GET /api/orders/:id/thuong-mai`, tên chốt ở kế hoạch), **không** nhét vào `OrderDetailDto` (ADR-0026 điều 11):
    - người có `order.terms.view` thấy người hưởng, mức (tỷ lệ hoặc số mỗi khách), số hoa hồng từng dòng, tổng, cờ "thiếu mức" + lý do + ai xử lý (5.7);
    - Đối tác (`own`) chỉ thấy phần của **đơn mình**, qua **DTO danh sách trắng riêng**: tên dịch vụ, thành tiền trước giảm, **số tiền** hoa hồng của mình từng dòng, tổng, cờ "đang chờ Công ty cài mức". **Không** tỷ lệ / số mỗi khách (cùng luật với ADR-00xx-E điều 3 — U4 "không thấy tỷ lệ nội bộ"; giả định bề mặt, đảo được ở cả hai nơi cùng lúc), **không** `commission_rule_id`, nguồn bản chụp, người hưởng của đơn khác, a%, giá vốn, người bán là nhà cung cấp kèm a%. **a% và giá vốn không bao giờ** đi qua route này với ai thiếu ô `supply.terms.view` (ADR-00xx-B);
    - "Đơn mình" của Đối tác ở route này = đơn **mình lập** (ô `order.view` / `order.terms.view` `own` = người lập). Đơn **nhân viên lập** với bên đặt là đối tác đó: đối tác **không** mở được đơn / route này, nhưng **thấy trên sổ** của mình (ADR-00xx-E điều 1 — `own` của sổ = hồ sơ bên đặt). Hai nghĩa "của mình" khác nhau là **có chủ ý** — ghi ở `trang-ghep.md` §2;
    - biên nhận (`ReceiptDto`) **không bao giờ** có hoa hồng/tỷ lệ (ADR-0026 điều 11 — giữ).
12. **Nhật ký (5.12):** `prc_commission_rule_added`, `_closed`; `order_terms_captured` (lúc xác nhận — một dòng cho cả đơn), `order_terms_recaptured` (đổi bên đặt), `order_terms_manual` (mức tay — kèm lý do). Không SĐT; số tiền chỉ ở nhật ký mức tay (trước → sau của **mức**, không phải tiền khách).

### Bảng quyền (9 quyền app — thứ tự `SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER`)

| Ô (mới) | SALES | ACC | ADMIN | FIELD | PARTNER | SUPER | INTERN | DRIVER | DRV_P | Route hỏi ô (cùng bản phát hành) |
|---|---|---|---|---|---|---|---|---|---|---|
| `partner.commission.view` (xem bảng mức, thử tra) | any | any | any | none | none | any | none | none | none | `GET /api/pricing/hoa-hong`, `GET /api/pricing/thu-tra` |
| `partner.commission.write` (thêm / đóng dòng mức) — **đã chốt** đặc tả §11 | none | any | any | none | none | any | none | none | none | `POST /api/pricing/hoa-hong`, `POST /api/pricing/hoa-hong/:id/dong` |
| `order.terms.view` (phần thương mại của đơn) | any | any | any | assigned | own | any | own | none | none | `GET /api/orders/:id/thuong-mai` |
| `order.terms.override` (ghi mức tay một dòng, lý do) — **đã chốt** đặc tả §11 | none | any | any | none | none | any | none | none | none | `POST /api/orders/:id/thuong-mai/:serviceId` |

- `order.terms.view` = đúng hàng `money.view` hôm nay (Q35: ai xem được tiền đơn thì thấy chiết khấu; HDV đơn mình phụ trách — ADR-0030 S23-5). **Bài khoá giá trị mới:** `order.terms.view` ⊆ `money.view` ở mọi cột.
- `SALES` xem bảng mức (`partner.commission.view = any`): **giả định bề mặt của AI** — Bán hàng báo giá cho đại lý cần biết mức; đổi một ô là hai chiều.
- Mọi ô phải có route hỏi nó **trong cùng bản phát hành** (bài "mỗi ô được máy chủ hỏi"); không thêm mục hoãn vào `docs/quyen-hoan.json`.
- Không đổi ô nào hiện có.

### Dữ liệu (một migration, chỉ thêm; số từ `0057`, chốt lúc gộp)

| Bảng / view | Module | Ghi chú |
|---|---|---|
| `prc_beneficiary_role` | `pricing` | tra cứu, khoá mã; gieo 5 dòng (điều 2) |
| `prc_commission_rule` | `pricing` | điều 4; tiền `INTEGER` VNĐ, tỷ lệ phần vạn `INTEGER`; `valid_from/to`; trigger không chồng, không xoá, chỉ đóng |
| `v_prc_commission_rule` (view công bố) | `pricing` | chỉ cột cần cho `chonMuc` (không ghi chú) |
| `ord_service_terms` | `orders` | điều 8 (phần hoa hồng); chỉ-thêm; khoá sau Đã giao |
| `v_ord_terms_missing` (view công bố) | `orders` | đơn nào còn dòng hiện hành `MISSING` — `billing` đọc trong trigger "Đã giao" (ADR-00xx-C) |
| view nhóm hiện hành của dịch vụ | `catalog` | điều 5; tên chốt ở kế hoạch |

Mục mới ở `docs/data-dictionary.json` + `npm run dict`. `src/architecture.test.ts`: thêm `pricing` vào `STRICT`; bảng `ord_service_terms` vào danh sách tệp nửa nghiêm của `orders`.

### Bất biến cho `scripts/audit-invariants.mjs`

- `R-PRC-1` (error): không hai dòng `prc_commission_rule` cùng (áp cho, phạm vi, mã) có hiệu lực giao nhau.
- `R-PRC-2` (error): mọi `target_role_code` thuộc `prc_beneficiary_role` đang bật.
- `R-ORD-T1` (error, chỉ đơn **xác nhận sau mốc phát hành**): mỗi dòng dịch vụ của đơn `confirmed` có **đúng một** bản chụp hiện hành. Đơn xác nhận trước mốc **chưa "Đã giao"**: đơn **không người hưởng và không dòng nhập tay** được **chụp bù tự động lúc phát hành** (ADR-00xx-C điều 7b — tất định: người bán lấy từ dòng điều khoản ghi rõ, hoa hồng `NONE`); phần còn lại (đơn có người hưởng, dòng nhập tay) mức `warn` + danh sách cho Kế toán (câu C4) — để `audit-invariants --db remote` của runbook không đỏ ngay sau triển khai.
- `R-ORD-T2` (error): bản chụp `MANUAL` luôn có `reason`; `commission_status = SET` luôn có đúng một trong `rate_bp` / `per_pax`.

---

## Ví dụ bằng số (thành ca sổ vàng `golden/so-cong-no-luot-2.json`, `cho_xac_nhan` tới khi chủ/Kế toán xác nhận — 5.17)

**Ví dụ A-1 — chọn mức nhiều dòng (đặc tả §11, đã duyệt).** Bảng: "Công ty lữ hành · mọi dịch vụ · 10%"; "Công ty lữ hành · nhóm Du thuyền · 15%"; "Đại lý A (Công ty lữ hành) · vé Hòn Tằm · 12%". Đơn của đại lý A, xác nhận 10/10/2026:

| Dòng | Thành tiền (trước giảm) | Bậc thắng | Mức | Hoa hồng | Đại lý phải trả Tour Đảo |
|---|---|---|---|---|---|
| Vé Hòn Tằm | 2.000.000 | 1. đối tác + dịch vụ | 12% | 240.000 | 1.760.000 |
| Du thuyền | 3.000.000 | 5. vai + nhóm | 15% | 450.000 | 2.550.000 |
| Tour đảo | 1.000.000 | 6. vai + mọi dịch vụ | 10% | 100.000 | 900.000 |
| **Cộng** | **6.000.000** | | | **790.000** | **5.210.000** ✓ (khớp đặc tả) |

**Ví dụ A-2 — mức mỗi khách + HDV sửa số khách sau xác nhận.** Lễ tân Hương đặt vé tắm bùn i-resort, mức "Lễ tân khách sạn · vé tắm bùn · 50.000 đ/khách". Lúc xác nhận: 2 người lớn + 1 trẻ em + 1 em bé ⇒ đếm 3 ⇒ hoa hồng **150.000**. Tại bến HDV sửa thành 3 người lớn + 1 trẻ em + 1 em bé (dòng điều chỉnh) ⇒ đếm 4 ⇒ lúc "Đã giao" hoa hồng **200.000** (mức chụp 50.000 giữ nguyên, số khách là số hiện hành).

**Ví dụ A-3 — đổi bảng sau xác nhận.** Đơn xác nhận 10/10 chụp 10% (bậc 6). Ngày 15/10 Kế toán đóng dòng 10% (đến 14/10) và mở dòng 12% (từ 15/10). Đơn 10/10 "Đã giao" ngày 20/10 vẫn tính **10%**; đơn xác nhận 16/10 tính 12%.

**Ví dụ A-4 — thiếu mức.** Bảng chỉ có dòng cho Công ty lữ hành. CTV Lan đặt vé Hòn Tằm 1.000.000, xác nhận 10/10 ⇒ bản chụp `MISSING` (C3 = có, nhưng chưa có dòng cho vai CTV). HDV bấm "Đã giao" ⇒ bị giữ: "Thiếu mức hoa hồng cho vé Hòn Tằm (Cộng tác viên) — Kế toán cài mức hoặc ghi mức tay". Kế toán ghi tay 15% cho dòng đó (lý do "thoả thuận miệng với CTV Lan, chờ cài bảng") ⇒ thả; hoa hồng 150.000.

---

## Sửa câu nào của quyết định đã duyệt (nguyên văn → mới)

| Nguồn | Câu hiện hành | Sau ADR này |
|---|---|---|
| **ADR-0018 điều 11** | "…bảng cấu hình có nhóm đối tác, loại dịch vụ (**theo tiền tố mã danh mục**)…; **chụp theo từng dòng dịch vụ lúc gửi đơn**…" | "…nhóm đối tác = **vai bên ngoài trong danh sách được hưởng** (H9); loại dịch vụ = **nhóm dịch vụ của ADR-0058**; **chụp theo từng dòng dịch vụ lúc Xác nhận** (và khi thêm dịch vụ, đổi bên đặt)…" (H5; Hiến chương 5.6) |
| Đặc tả mô hình vai §11 "Chọn tỷ lệ" | "Không khớp ô nào → **0%** và đơn hiện cảnh báo 'chưa có chiết khấu' cho Kế toán." | "Không khớp ô nào → dòng **thiếu mức**; đơn xác nhận được nhưng **giữ ở 'Đã giao'** tới khi có mức (Hiến chương 5.7, ADR-0061 A-14). Mức 0% chỉ khi có dòng ghi rõ 0%." (cách xử lý cụ thể: câu C2) |
| Đặc tả mô hình vai §11 "Chụp tỷ lệ vào đơn" | "Đơn đối tác lập: mọi dòng chụp lúc 'Gửi đơn hàng'…; Đơn nội bộ lập cho đối tác: chụp lúc chọn đối tác làm bên đặt…" | Một mốc cho mọi đơn: **lúc Xác nhận**; đổi bên đặt sau xác nhận ⇒ chụp lại. Trước Xác nhận màn đơn chỉ hiện **số dự kiến** (tính theo bảng hôm nay, không lưu). |
| Đặc tả mô hình vai §11 "Loại dịch vụ" | "mỗi dịch vụ thuộc một loại, ánh xạ theo tiền tố mã danh mục (sửa được); mã không khớp → 'Khác'" | Thay bằng nhóm của ADR-0058; dịch vụ "Chưa phân loại" chỉ khớp bậc dịch vụ hoặc mọi dịch vụ. |
| ADR-0026 điều 1 (cách suy người hưởng) | "**Người hưởng** suy ra: bên đặt của đơn có vai nhóm `EXTERNAL` đang mở" | "…bên đặt đang mở một vai thuộc **danh sách được hưởng** (`prc_beneficiary_role`); vai `EXTERNAL` ngoài danh sách ⇒ giữ đơn (điều 3)." |

**Không đổi:** ADR-0018 điều 9 (người hưởng = bên đặt), Q35 (ai thấy), LC-7 (phiếu gửi khách không có chiết khấu), ADR-0026 điều 11.

## Phương án bị loại

- **Giữ "loại dịch vụ theo tiền tố mã"** — không làm được với mã hiện có (ADR-0058).
- **Chụp số tiền hoa hồng (không chỉ mức) lúc xác nhận** — sai khi HDV sửa số khách sau xác nhận (đặc tả §11: "giữ tỷ lệ đã chụp, áp lên thành tiền mới").
- **Cột chụp trên `order_service`** (bản tổng hợp §3 gợi ý) — `order_service` bị khoá thành phần sau xác nhận (`0008`) và lưu nháp xoá–chèn lại; bảng chụp chỉ-thêm riêng giữ được lịch sử chụp lại.
- **Không khớp → 0%** — trái 5.7 và A-14.
- **Thêm cạnh `billing → pricing`** — hai nơi gọi hàm tính; `orders` công bố một hàm là đủ (5.4).

## Hệ quả

- **Mã:** `src/modules/pricing/` mới (repository nghiêm, `rules.ts` với `chonMuc`, `hoaHongDong`, route bảng mức + thử tra); `src/modules/orders/` (chụp trong lô Xác nhận, chụp lại khi đổi bên đặt, route phần thương mại, hàm `phanThuongMaiCuaDon`); `src/shared/permissions.ts` (4 ô — việc lớn: quyền); `web/` màn "Hoa hồng đối tác" (cần bản vẽ của chủ — tiền lệ N-4) và khối "Phần đối tác" trên trang đơn.
- **Việc lớn** (dữ liệu + tiền + quyền): người kiểm độc lập chỉ-đọc sau thi công.
- **Bảng tin:** route ghi mức tay dưới `/api/orders/*` báo `baoThayDoi` loại "tiền" (chỉ làm mới màn hình, không gõ cửa điện thoại — ADR-0045); hàng rào Bảng tin phủ route mới.

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)

1. `chonMuc`: bảng ca đủ 6 bậc + ranh ngày (= `valid_from`, = `valid_to`) + mức 0% ghi rõ + không khớp → `MISSING` + hai vai được hưởng xung đột → `MISSING`.
2. Ví dụ A-1…A-4 thành test; khớp từng đồng.
3. Xác nhận đơn có người hưởng ⇒ mọi dòng có bản chụp trong **cùng lô** (cố ý làm hỏng câu chụp ⇒ đơn không thành `confirmed`).
4. Trigger: sửa số / xoá dòng mức ⇒ chặn; chèn dòng chồng hiệu lực ⇒ chặn; sửa / xoá bản chụp ⇒ chặn; chụp mới cho đơn đã "Đã giao" ⇒ chặn. Mỗi trigger thấy chặn thật một lần (P16).
5. Quyền: bài ghim 512 tập quyền cho 4 ô; `PARTNER` gọi phần thương mại đơn người khác ⇒ 404/403; `DRIVER`, `DRIVER_PARTNER` ⇒ 403 mọi route mới; khoá giá trị `order.terms.view` ⊆ `money.view`.
6. Bài **số lạ**: gieo `480.017` làm mức của đối tác B; tài khoản Đối tác A gọi mọi route nó vào được ⇒ không thấy.

## Xung đột / điều chưa chắc (trình chủ, không tự hoà giải)

- **Câu C2** (thiếu mức: giữ ở "Đã giao" hay chặn từ Xác nhận), **C3** (Cộng tác viên có hưởng không), **C4** (đơn đã xác nhận trước khi lượt 2 lên) — `cau-hoi-chu.md`.
- `SALES` xem bảng mức: giả định bề mặt (trên).
