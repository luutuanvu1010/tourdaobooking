# ADR-00xx-B — Sổ tiền lượt 2 (D5): điều khoản cung ứng theo dịch vụ (người bán, nhà cung cấp, a% giá vốn), bật vai "Nhà cung cấp", người thu là bên đặt / nhà cung cấp, biên nhận chia phần theo người bán

- **Trạng thái:** **proposed** — bản nháp của người soạn (AI), 2026-10-01; **sửa vòng 1 theo người kiểm độc lập** (ĐẠT CÓ ĐIỀU KIỆN), bản sửa chưa được kiểm lại. AI không tự duyệt (N3, Điều 7.2).
- **Số hiệu:** giữ chỗ `ADR-00xx-B` (số thật chốt lúc gộp).
- **Ngày:** 2026-10-01.
- **Thuộc gói:** lượt duyệt **2b** (ADR này một mình — 2 quyết định chạm dữ liệu/quyền; `trang-ghep.md` §2b). Phát hành chung một bản với A, C, D, E.
- **Mốc đo mã:** `8f647226` (nhánh), `main` @`0c4309cd`.
- **Nguồn — lời chủ đã chốt (áp dụng, không hỏi lại):**
  - Câu gốc 25/9 (đặc tả Hoàn tất §0): "quản lý hình thức của biểu mẫu xác nhận (Cty Tour Đảo bán, Cty Tour Đảo làm đại lý bán) để gắn cho từng loại dịch vụ… Tour Đảo đứng tên người bán trên biên lai với Vé Hòn Tằm, Tour đảo Nha Trang, nhưng chỉ hiện là đối tác với vé tắm bùn i-resort… (02) Tour Đảo mua vé đó của i-resort giá a% × N".
  - Đặc tả Hoàn tất §10: **Q2** mỗi lần ghi tiền chọn người thu + hình thức, gồm "người hưởng (đại lý) và nhà cung cấp (phần còn lại)"; **Q3** máy tự tính quyết toán với nhà cung cấp phần họ thu hộ, **không hiện trên biên nhận**; **Q7** một biên nhận chia phần theo người bán.
  - Bản tổng hợp §2 + §10: "loại biên nhận" là **vai người bán**, suy ra từ hồ sơ người bán; **H5** chụp người bán, a% lúc Xác nhận; **H8 = A** giá vốn tính trên **giá gốc trước giảm**.
  - ADR-0057 X3 (chủ chọn Tiền Q9 a): dịch vụ đưa đón do Tour Đảo điều xe **không** có giá vốn a%; tiền xe là chi phí chuyến. ADR-0057 sửa ADR-0024 điều 1: giá thuê xe thuộc `van-chuyen`, không thuộc `pricing`.
- **ADR liên quan:** ADR-0024 (điều 1 — `pricing` sở hữu điều khoản cung ứng), ADR-0026 (điều 2 — người thu; điều 11 — biên nhận; điều 12 — giới hạn lượt 1), ADR-0057 (X3), ADR-0061 A-14, ADR-0048 (vai `CARRIER` — khác vai mới), ADR-0001 (định danh trước vai), ADR-00xx-A (bảng chụp `ord_service_terms`).
- **Hiến chương áp dụng:** 2.1, 2.3, 4.4 (chứng từ danh sách trắng), 5.1, 5.2, 5.6, 5.7, 5.17.
- **Xây trên lỗ đang hở:** **không** (`phat_hien = []`, `main` @`0c4309cd`, đọc 2026-10-01).
- **Loại quyết định:** **một chiều** (vai mới trong `pty_role_type`, bảng `prc_`, cột chụp); ô quyền hai chiều.

---

## Tóm tắt cho chủ (lời thường)

1. Mỗi dịch vụ có **người bán**: Tour Đảo (vé Hòn Tằm, tour đảo…) hoặc một **nhà cung cấp** (vd i-resort). Với dịch vụ nhà cung cấp bán, app biết **Tour Đảo mua lại bằng bao nhiêu %** giá bán lẻ (a%).
2. Nhà cung cấp là một **hồ sơ** trong Danh bạ, mang vai mới **"Nhà cung cấp"** (không có tài khoản đăng nhập).
3. Điều khoản này cũng có ngày hiệu lực và được **chụp vào đơn lúc Xác nhận** như hoa hồng.
4. Khi ghi tiền khách trả, chọn được người thu là **đại lý** (bên đặt) hoặc **quầy nhà cung cấp** — để sổ biết tiền đang nằm ở đâu.
5. Biên nhận gửi khách chia **hai phần** khi đơn có cả dịch vụ Tour Đảo bán và dịch vụ nhà cung cấp bán: "… còn lại thanh toán tại quầy i-resort". **Không bao giờ** hiện a%, giá vốn, hoa hồng.

---

## Bối cảnh (hiện trạng đo trên `8f647226`)

| Nơi | Hiện trạng | Nguồn |
|---|---|---|
| Vai người thu | Bảng tra `bil_collector_role` có `BOOKER` (`active = 1`) và `SUPPLIER` (`active = 0`); **mã** chỉ cho ghi mới `COMPANY`, `STAFF` | `migrations/0045:22-31`; `src/modules/billing/rules.ts:16` |
| "Thu cho ai" | `bil_payment_receipt.collected_for_party_id` luôn là công ty chủ (lượt 1) | `0045:79-81` |
| Ai ghi tên người khác làm người thu | Chỉ Kế toán / Toàn quyền; người khác chỉ ghi **chính mình** hoặc **Công ty** | ADR-0026 điều 2 |
| Vai "Nhà cung cấp" | **Chưa có** trong `pty_role_type` (có `CARRIER` — nhà xe, ADR-0048, nhóm `OTHER`) | `migrations/0038:4` |
| Biên nhận | `ReceiptDto` danh sách trắng, một người bán (Tour Đảo) | `src/shared/contracts.ts:1497-1520` |
| Đơn có phần khách trả tại quầy nhà cung cấp | Không "đã thu = phải thu" được ⇒ không "Đã giao" được tới lượt 2 | ADR-0026 điều 12 gạch 2 |

---

## Quyết định

### Phần B1 — Điều khoản cung ứng + vai Nhà cung cấp

1. **Vai mới `SUPPLIER` ("Nhà cung cấp")** trong `pty_role_type`, nhóm **`OTHER`** (không sinh quyền, không tài khoản — như `CARRIER`). Gán/kết thúc vai qua màn hồ sơ hiện có (`admin.manage` — "vai trò hồ sơ"). Một hồ sơ tổ chức có thể vừa là Nhà cung cấp vừa là Nhà xe; **không** dùng `CARRIER` thay `SUPPLIER` (nhà xe thuộc `van-chuyen`, ADR-0057).
2. **Bảng điều khoản** `prc_supply_term` (module `pricing`, tên đề xuất) — mỗi dòng:
   - phạm vi: `scope` ∈ (`SERVICE` + `catalog_code`) / (`GROUP` + `group_code`) / (`ALL`) — cùng khuôn ADR-00xx-A điều 4;
   - `seller_party_id` (người bán trên biên nhận; **bắt buộc**): hồ sơ công ty chủ **hoặc** một hồ sơ đang mở vai `SUPPLIER`;
   - `supplier_party_id` + `cost_rate_bp` (a%, phần vạn 0…10000): **có** ⇔ người bán ≠ công ty chủ ("Tour Đảo làm đại lý" — mua lại của chính người bán đó); **trống** ⇔ người bán = công ty chủ. (Dạng "Tour Đảo bán nhưng mua đầu vào của nhà cung cấp" **không** làm ở lượt này — xem "Ngoài phạm vi".)
   - `valid_from_date`, `valid_to_date`, ghi chú, bốn cột WHO; không xoá; chỉ đóng hiệu lực; không chồng (cùng khuôn A).
   - Trigger: người bán ≠ công ty chủ phải đang mở vai `SUPPLIER` lúc thêm dòng (đọc view công bố **mới** `v_pty_open_role` của ADR-00xx-A — `v_pty_open_role_group` chỉ có nhóm, mà `SUPPLIER` thuộc nhóm `OTHER` nên view cũ lọc mất; cạnh `pricing → parties` đã có).
3. **Một dòng `ALL` gieo sẵn: "mọi dịch vụ — người bán: Tour Đảo"**, **ngày bắt đầu lùi về trước đơn đầu tiên** (ngày tạo đơn sớm nhất trên CSDL lúc migration chạy, hoặc một mốc cố định sớm hơn — chốt ở kế hoạch), để việc chụp bù đơn đã xác nhận trước ngày phát hành (ADR-00xx-C điều 7b) tìm được dòng có hiệu lực ở **ngày xác nhận** của đơn. Đây là **dữ liệu ghi rõ**, không phải đoán (5.7): tới nay mọi dịch vụ đều do Tour Đảo đứng tên bán trên biên nhận. Kế toán thêm dòng `SERVICE` cho dịch vụ nhà cung cấp bán (vd vé tắm bùn i-resort, a = 80%). Ô cụ thể nhất thắng: `SERVICE` > `GROUP` > `ALL`.
4. **Ràng buộc X3 (ADR-0057, đã chốt):** dịch vụ thuộc nhóm đưa đón do Tour Đảo điều xe **không** được có `supplier_party_id`/`cost_rate_bp`. Cách nhận biết "dịch vụ đưa đón" chốt ở kế hoạch (dịch vụ có mẫu chặng `vc_leg_template` của ADR-0054 hoặc nhóm "Đưa đón"); lớp CSDL: trigger trên `prc_supply_term` từ chối dòng có a% cho mã thuộc tập đó (đọc view công bố của `catalog` / `van-chuyen` — **nếu** cần đọc `van-chuyen` thì là cạnh mới `pricing → van-chuyen`, trái ADR-0040 D1 "không module nào import `van-chuyen`" ⇒ dùng nhóm dịch vụ của `catalog`; chốt ở kế hoạch, không mở cạnh mới).
5. **Chụp lúc Xác nhận** — cùng lô, cùng bảng `ord_service_terms` của ADR-00xx-A, thêm cột: `seller_party_id`, `supplier_party_id`, `cost_rate_bp`, `supply_term_id` (nguồn), `supply_status` ∈ `SET` / `MISSING`. Không khớp dòng nào (dòng `ALL` bị đóng; dịch vụ **nhập tay** — ADR-0061 A-14) ⇒ `MISSING` ⇒ giữ ở "Đã giao" tới khi Kế toán ghi tay người bán (và a% nếu có) cho dòng đó (ô `order.terms.override` của A).
   - **Dịch vụ nhập tay:** **không** khớp dòng `ALL` (A-14: "không có nguồn giá vốn ⇒ giữ, không bao giờ lấy 0"). Hệ quả: đơn **khách lẻ** có dịch vụ nhập tay cũng phải chờ Kế toán bấm "dòng này Tour Đảo bán" trước "Đã giao" — xem "Điều chưa chắc".
6. **Giá vốn của một dòng** = làm tròn tới đồng của (`cost_rate_bp` × **thành tiền dòng hiện hành trước giảm giá**) / 10000 (H8 = A). Hàm thuần duy nhất `giaVonDong` (`pricing/rules.ts`), đi qua `phanThuongMaiCuaDon` của `orders` (A điều 10).

### Phần B2 — Người thu là bên đặt / nhà cung cấp; biên nhận chia phần

7. **Bật hai vai người thu** cho ghi mới: `BOOKER` (bên đặt — người hưởng) và `SUPPLIER` (quầy nhà cung cấp). Mỗi lần thu vẫn sinh dòng *tiền đang giữ hộ*: **người thu nợ Tour Đảo** đúng số đó (ADR-0026 điều 4 — **không đổi luật**; "đại lý/nhà cung cấp thu hộ" chính là dòng này).
   - `BOOKER`: người thu = bên đặt của đơn (máy chủ kiểm); chỉ ghi được trên đơn **có người hưởng**.
   - `SUPPLIER`: người thu = **nhà cung cấp của một dòng "làm đại lý" trên chính đơn đó** (bản chụp hiện hành); số ≤ phần thành tiền các dòng của nhà cung cấp đó còn chưa thu.
8. **Ai được ghi tên người khác làm người thu** — ADR-0026 điều 2 chỉ cho Kế toán/Toàn quyền. **Mở hẹp** (câu C6 — chủ quyết):
   - tài khoản **Đối tác** ghi được người thu = **chính hồ sơ của mình** (là `BOOKER`) trên đơn mình — đúng khuôn "ghi chính mình" của điều 2, chỉ đổi nhãn vai (`payment.receive` PARTNER `own` đã có);
   - **khuyến nghị C6 (A) — "nợ ở người khai tới khi Kế toán xác nhận", song song H3:** người có `payment.receive` trên đơn (HDV đang phụ trách, Bán hàng của mình, Quản trị…) khai được "khách đã trả cho **bên đặt (đại lý) của đơn**" hoặc "khách trả tại quầy **nhà cung cấp của một dòng làm đại lý** trên đơn" (giới hạn điều 7). Lần thu ghi người thu như khai (để tính "đã thu = phải thu" — đơn "Đã giao" được ngay), **nhưng dòng giữ hộ nằm trên NGƯỜI KHAI** (người khai nợ công ty số đó) cho tới khi Kế toán bấm **"Bên kia đã xác nhận"** (phiếu loại mới `COUNTERPARTY_CONFIRMED` = dòng đảo của dòng trên người khai + dòng giữ hộ trên đại lý / nhà cung cấp). Kế toán đảo cả lần thu nếu bên kia không nhận. Đúng khuôn "Công ty thu – CK do HDV khai" (H3, chủ đã chọn): khoản làm **giảm số người khai phải thu** chỉ có hiệu lực khi Kế toán xác nhận. Rủi ro còn lại: HDV mang nợ treo vài ngày tới khi Kế toán đối chiếu (màn "Bạn đang giữ" hiện rõ "chờ Kế toán xác nhận").
   - (B) cho khai, **nợ ghi ngay trên bên kia**, chỉ kèm cờ "chờ đối chiếu". Nhanh cho HDV, nhưng **HDV khai sai "khách đã trả đại lý" là qua được cổng "Đã giao"** và nợ treo ở đại lý / nhà cung cấp — người khai không chịu gì.
   - (C) giữ như ADR-0026 điều 2: chỉ Kế toán ghi. Đơn có phần khách trả cho đại lý / tại quầy **không "Đã giao" được** tới khi Kế toán vào ghi.
   - (D) không ghi tiền tại quầy nhà cung cấp; coi phần đó ngoài "phải thu" của HDV — đổi ADR-0025 điều 3d (đã duyệt).
9. **"Thu cho ai"** (`collected_for_party_id`) = **người bán** của phần tiền (ADR-0026 điều 2 đã dành sẵn cho lượt 2): người thu `SUPPLIER` ⇒ thu cho nhà cung cấp đó; người thu khác ⇒ mặc định thu cho Tour Đảo; người ghi chọn được phần nhà cung cấp khi khách trả trước cả phần đó. Cột này **chỉ** dùng để chia "đã trả / còn lại" trên biên nhận; sổ nợ dùng **người thu** (điều 7). `R-BIL-*` lượt 1 "luôn là công ty chủ" (NT-S9) đổi thành "là công ty chủ hoặc người bán của một dòng trên đơn".
10. **Biên nhận chia phần theo người bán** (Q7; ADR-0026 điều 11 đã dành sẵn): `ReceiptDto` thêm mảng `phan[]`, mỗi phần: tên người bán (Tour Đảo hiện "người bán"; nhà cung cấp hiện "người bán", Tour Đảo hiện "đối tác đặt vé"), các dịch vụ của phần, tổng phần, đã trả, còn lại, và câu "thanh toán tại quầy <người bán>" cho phần nhà cung cấp. **Danh sách trắng giữ nguyên:** không a%, giá vốn, hoa hồng, tên người thu, hình thức thu. Bài số lạ `480.017` (`src/modules/receipt/bien-nhan.test.ts`) mở rộng: gieo vào `cost_rate_bp`, giá vốn, hoa hồng.

### Bảng quyền (9 quyền app)

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SUPER | INTERN | DRIVER | DRV_P | Route |
|---|---|---|---|---|---|---|---|---|---|---|
| `supply.terms.view` (mới — người bán, nhà cung cấp, **a%**, giá vốn trên đơn) | none | any | any | none | none | any | none | none | none | `GET /api/pricing/cung-ung`; khối giá vốn trong `GET /api/orders/:id/thuong-mai` |
| `supply.terms.write` (mới — thêm/đóng dòng điều khoản) | none | any | any | none | none | any | none | none | none | `POST /api/pricing/cung-ung`, `…/:id/dong` |
| `payment.receive` (có sẵn — **không đổi ô**) | own | any | any | assigned | own | any | own | none | none | `POST /api/orders/:id/payments` thêm vai `BOOKER`/`SUPPLIER` theo điều 7–8 |

- a% và giá vốn là số **nội bộ nhất** (U4: đối tác không thấy; ADR-0024: không lộ qua route danh mục). `SALES` = `none`: **giả định của AI**; Bán hàng chỉ cần biết "ai là người bán" để báo khách — tên người bán đi qua `order.terms.view` (A), không cần a%.
- `supply.terms.write` = Kế toán, Quản trị, Toàn quyền: **khuyến nghị**, chưa có lời chủ ⇒ câu **C5**.
- Bài khoá giá trị: `supply.terms.view` ⊆ `order.terms.view` ⊆ `money.view`; cột `PARTNER`, `FIELD`, `INTERN`, `DRIVER`, `DRIVER_PARTNER` = `none` ở `supply.terms.*` (bài ghim).

### Dữ liệu (cùng migration với A; số chốt lúc gộp)

| Bảng | Module | Đổi |
|---|---|---|
| `pty_role_type` | `parties` | + dòng `SUPPLIER` (nhóm `OTHER`) |
| `prc_supply_term` (+ view công bố) | `pricing` | mới; gieo dòng `ALL` → công ty chủ |
| `ord_service_terms` | `orders` | + cột cung ứng (điều 5) |
| `bil_collector_role` | `billing` | `SUPPLIER.active` 0 → 1 (`UPDATE` một dòng tra cứu — bảng tra cứu không chỉ-thêm). `BOOKER` **đã** `active = 1` từ `0045:26`; chỉ mã (`COLLECTOR_ROLES_GHI_MOI`, `rules.ts:16`) đang chặn ghi mới |
| `bil_posting_kind` | `billing` | + `COUNTERPARTY_CONFIRMED` ("Bên kia đã xác nhận") nếu C6 = A |
| `bil_payment_receipt` | `billing` | không cột mới (C6 = A suy "chờ xác nhận" từ dòng giữ hộ còn nằm trên người khai — như H3 lượt 1); C6 = B cần cột cờ `needs_counterparty_check` |

### Bất biến

- `R-BIL-5` (I5 — **bật từ lượt 2**, error cho đơn "Đã giao" sau mốc phát hành; warn cho đơn trước mốc): mỗi dòng dịch vụ của đơn đã "Đã giao" có bản chụp hiện hành với người bán.
- `R-PRC-3`: dòng `prc_supply_term` có a% ⇔ người bán ≠ công ty chủ; người bán ≠ công ty chủ ⇒ hồ sơ có vai `SUPPLIER` (đang mở lúc thêm).
- `R-PRC-4`: không dòng nào có a% cho dịch vụ đưa đón (X3).
- `R-BIL-12`: lần thu vai `SUPPLIER` có người thu = nhà cung cấp của một dòng trên đơn; `collected_for` ∈ {công ty chủ, người bán các dòng của đơn}.

---

## Ví dụ bằng số (ca sổ vàng có sẵn `golden/hoan-tat-cong-no.json`, đang `cho_xac_nhan`)

**Ví dụ B-1 — SV-HT-03 (lễ tân thu trước).** Vé tắm bùn i-resort: người bán i-resort, a = 80%. 2 vé × 300.000 = **600.000**; giá vốn = 80% × 600.000 = **480.000**. Lễ tân Hương (bên đặt) thu trước 200.000 (người thu `BOOKER`) ⇒ dòng giữ hộ: Hương nợ Tour Đảo 200.000. Khách trả 400.000 tại quầy i-resort (người thu `SUPPLIER`, thu cho i-resort; HDV khai) ⇒ trước khi Kế toán xác nhận: **HDV** nợ Tour Đảo 400.000 (C6 = A); sau "Bên kia đã xác nhận": i-resort nợ Tour Đảo 400.000, HDV về 0. Số dư cuối dưới đây là **sau** xác nhận. Lúc "Đã giao" (ADR-00xx-C): Tour Đảo nợ i-resort giá vốn 480.000; Tour Đảo nợ Hương hoa hồng 100.000. Số dư: **Hương nợ 100.000**; **Tour Đảo nợ i-resort 80.000**; Tour Đảo giữ 20.000 = 600.000 − 480.000 − 100.000 ✓ (khớp đáp án SV-HT-03).

**Ví dụ B-2 — SV-HT-05 (khách trả đủ tại quầy).** Như B-1, không ai thu trước; i-resort thu 600.000 ⇒ i-resort nợ Tour Đảo 600.000 − 480.000 = **120.000**; Tour Đảo nợ Hương 100.000; Tour Đảo giữ 20.000 ✓.

**Ví dụ B-3 — giảm giá trên dòng nhà cung cấp (H8 = A).** Khách lẻ, vé i-resort 300.000, Tour Đảo giảm 30.000 ⇒ khách trả 270.000; giá vốn vẫn 80% × **300.000** = 240.000 (trước giảm). Tour Đảo giữ 270.000 − 240.000 = 30.000.

**Ví dụ B-4 — biên nhận đơn trộn.** Đơn: vé Hòn Tằm 1.000.000 (Tour Đảo bán) + vé i-resort 600.000 (i-resort bán). Khách chuyển khoản trước 500.000 cho công ty (thu cho Tour Đảo). Biên nhận: *Phần 1 — người bán Công ty TNHH Tour Đảo: 1.000.000; đã trả 500.000; còn lại 500.000.* *Phần 2 — người bán i-resort (Tour Đảo là đối tác đặt vé): 600.000; còn lại 600.000 thanh toán tại quầy i-resort.* Không có 480.000, 80%, hay hoa hồng.

---

## Sửa câu nào của quyết định đã duyệt

| Nguồn | Câu hiện hành | Sau ADR này |
|---|---|---|
| ADR-0026 điều 2, "Ai được ghi tên ai làm người thu" | "người không phải Kế toán/Toàn quyền chỉ ghi được **chính mình** hoặc **Công ty** làm người thu" | "…chính mình (với Đối tác: vai bên đặt), Công ty, **hoặc bên đặt / nhà cung cấp của một dòng làm đại lý trên chính đơn đó** — khi đó dòng giữ hộ nằm trên **người khai** tới khi Kế toán xác nhận (câu C6 = A)" |
| ADR-0026 điều 4 gạch 2 (H3) | "Người thu = Công ty, do người không phải Kế toán khai ⇒ dòng giữ hộ trên người khai…" | mở rộng cùng khuôn cho người thu = bên đặt / nhà cung cấp do người khác khai (C6 = A) |
| ADR-0026 điều 2, "thu cho ai" | "lượt 1 luôn là hồ sơ Tour Đảo" | "người bán của phần tiền (Tour Đảo hoặc nhà cung cấp của dòng)" |
| ADR-0026 điều 12 gạch 2 | "Vai người thu *Nhà cung cấp* chưa dùng được…" | Hết hiệu lực khi ADR này lên. |
| Đặc tả mô hình vai §16 "Ngoài phạm vi: vai nhà cung cấp" | ngoài phạm vi | Trong phạm vi (đã báo ở đặc tả Hoàn tất §1 "chủ đang đảo"). |

## Ngoài phạm vi (ghi rõ để không lọt)

- "Tour Đảo bán nhưng mua đầu vào của nhà cung cấp" (giá vốn trên dịch vụ Tour Đảo đứng tên bán) — chưa có lời chủ; thêm sau bằng ADR (cột đã đủ chỗ, chỉ đổi `CHECK`).
- Nhà cung cấp tự xem sổ; nhà cung cấp có tài khoản.
- Giá vốn cố định theo vé (không theo %): chủ chỉ nói a% — thêm kiểu sau nếu cần.
- Giá thuê xe / chi phí chuyến (ADR-0057 — `van-chuyen`).

## Hệ quả

- **Mã:** `pricing` (bảng + route điều khoản + `giaVonDong`); `orders` (cột chụp, khối giá vốn chỉ cho `supply.terms.view`); `billing` (bật vai người thu, kiểm điều 7–8, `collected_for`); `receipt` (`phan[]`); `parties` (vai mới); `web/` màn "Điều khoản nhà cung cấp" (chờ bản vẽ) + chọn người thu.
- **Việc lớn:** người kiểm độc lập chỉ-đọc.

## Tiêu chí nghiệm thu

1. Ví dụ B-1…B-4 thành test; khớp từng đồng; SV-HT-03, 05 chạy trên mã sổ.
2. Trigger: dòng điều khoản người bán ≠ công ty mà hồ sơ không có vai `SUPPLIER` ⇒ chặn; a% khi người bán = công ty ⇒ chặn; a% cho dịch vụ đưa đón ⇒ chặn.
3. Lần thu `SUPPLIER` với hồ sơ không phải nhà cung cấp của đơn ⇒ 400; vượt phần của nhà cung cấp ⇒ 400; `BOOKER` trên đơn không người hưởng ⇒ 400.
4. Biên nhận đơn trộn có hai phần; bài số lạ không thấy a%/giá vốn/hoa hồng (thấy đỏ một lần khi thêm tạm `giaVon` vào `ReceiptDto`).
5. Đối tác, HDV, Thực tập, Tài xế gọi `GET /api/pricing/cung-ung` ⇒ 403.

## Điều chưa chắc

- Dịch vụ nhập tay trên đơn **khách lẻ** bị giữ "thiếu người bán" (điều 5) — đúng chữ A-14 nhưng thêm một bước cho Kế toán so với lượt 1. Nếu chủ muốn dòng nhập tay mặc định "Tour Đảo bán" thì phải sửa A-14 (ADR khác) — **không** tự đổi.
- Cách nhận biết "dịch vụ đưa đón" cho X3 (điều 4) chốt ở kế hoạch, không mở cạnh mới vào `van-chuyen`.
