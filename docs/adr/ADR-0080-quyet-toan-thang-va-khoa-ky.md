# ADR-0080 — Sổ tiền lượt 2: quyết toán theo tháng (một phiếu bù trừ nhiều đơn, hai chiều) và khoá kỳ tháng (module nhỏ `ky-so` dùng chung cho sổ công nợ và chi phí chuyến)

- **Trạng thái:** **accepted** — chủ dự án 2026-10-01 trong chat: trả lời 13 câu *"cả 13 theo khuyến nghị"* (C1–C13 = A, `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md`), rồi duyệt lượt **2d** bằng hộp chọn "Duyệt lượt 2d (Recommended)" (quyết toán tháng + khoá sổ tháng; đại lý xem "Sổ của tôi"; gồm nới ba hàng rào C12). Người kiểm độc lập: ĐẠT vòng 3 (bản nháp). Bản nháp + lịch sử sửa: `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/`.
- **Số hiệu:** 0080 — chốt 2026-10-01 (0073 trợ lý; 0074, 0075 đã có nhánh khác giữ; 0076 nơi trả mặc định; 0077–0081 = A–E của gói sổ tiền lượt 2).
- **Ngày:** 2026-10-01.
- **Thuộc gói:** lượt duyệt **2d** (ADR này — 2 quyết định — cùng ADR-0081 — 1 quyết định; E đọc bảng kê tháng và cờ "tháng đã khoá" của ADR này; `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/trang-ghep.md` §0). Phát hành chung một bản với A, B, C, E.
- **Mốc đo mã:** `8f647226`; `main` @`0c4309cd`.
- **Nguồn — lời chủ đã chốt:**
  - **U3 (1/10):** "Kế toán đối chiếu và **trả/thu gộp nhiều đơn mỗi tháng**, **bù trừ hoa hồng với tiền đại lý đang giữ**; **khoá sổ tháng**".
  - ADR-0026, bổ sung khi duyệt, câu 4 (Hiến chương 5.14): "Ngày phát sinh ngay, **khoá kỳ lượt 2**" — lệch có chủ ý vế khoá kỳ, **hạn: khoá kỳ phải có trong cùng bản phát hành với lượt 2 (D4/D5)**.
  - ADR-0057 **L-T1** (chủ duyệt Q-T8 "Duyệt, cùng hạn sổ công nợ"): dòng chi phí chuyến chưa có khoá kỳ; **khi khoá kỳ có (cùng bản lượt 2), áp cho cả dòng chi phí chuyến**.
  - H4: nộp / trả / hoàn do **Kế toán ghi**, "theo đúng nguyên tắc thận trọng".
- **ADR liên quan:** ADR-0026 (điều 5 — nộp/trả phân bổ theo đơn; bổ sung 5.14), ADR-0025 (điều 7 — "Hoàn thành" kiểm **theo từng đơn**), ADR-0057 (L-T1; Q12 — cạnh `billing ↔ van-chuyen` **còn để ngỏ**; T3), ADR-0040 D1 ("không module nào import `van-chuyen`"), ADR-0002 / ADR-0024 (đồ thị module — **bổ sung**), ADR-0060 (dấu đã nhập phần mềm kế toán — không bị khoá kỳ).
- **Hiến chương áp dụng:** **5.14** (gỡ lệch vế khoá kỳ), 5.1, 5.3, 5.5, 5.12.
- **Xây trên lỗ đang hở:** **không** (`phat_hien = []`, `main` @`0c4309cd`).
- **Loại quyết định:** **một chiều** — kỳ đã khoá không mở lại (5.14); module mới + cạnh mới khó gỡ khi đã có dữ liệu. Ô quyền hai chiều.
- **Nới hàng rào đã duyệt (Điều 9.4) — chủ duyệt ADR này là duyệt việc nới** (diff đề xuất: `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/de-xuat-luat.md` mục 1–3; lời thường cho chủ: câu **C12**):
  - (a) `ALLOWED_EDGES` (`src/architecture.test.ts:33-58`): thêm module `"ky-so": ["audit"]`, thêm `ky-so` vào danh sách của `billing` và `"van-chuyen"`;
  - (b) `TABLE_PREFIX` / `VIEW_PREFIX` (`:174-175`): thêm `ky_` → `ky-so`, `ky` → `ky-so`;
  - (c) `VIEW_CHO_TRIGGER_VC` (`:855-857`): thêm `v_ky_closed_period` (thân trigger `vc_` được đọc thêm một view).
  - **Không** phải nới cho thân trigger `bil_`: luật ADR-0024 điều 5 đã cho đọc view công bố của module được phép phụ thuộc — có cạnh (a) là đủ. Bài "không module nào import `van-chuyen`" (ADR-0040 D1) **giữ nguyên**.

---

## Tóm tắt cho chủ (lời thường)

1. Cuối tháng Kế toán mở **bảng kê từng đại lý**: đơn nào, ai nợ ai, bao nhiêu. Bấm **"Quyết toán"** chọn nhiều đơn một lần: tiền đại lý đang giữ **trừ thẳng** với hoa hồng công ty còn nợ họ; chỉ còn **một số chênh** để chuyển khoản (đại lý trả công ty, hoặc công ty trả đại lý).
2. Vẫn trả/thu **từng đơn** được bất cứ lúc nào (Giám đốc muốn "đại lý trả ngay từng đơn" — không cản; chỉ là cách gộp thêm).
3. Khi đã đối chiếu xong tháng, Kế toán bấm **"Khoá tháng"**. Từ đó **không ai ghi thêm** gì có ngày thuộc tháng đó — kể cả Kế toán. Sai sót phát hiện sau thì ghi **điều chỉnh vào tháng đang mở**, có lý do.
4. Khoá tháng áp cho cả **sổ công nợ** lẫn **chi phí xe thuê theo chuyến** (đã hứa ở phần Vận chuyển).
5. Tháng đã khoá **không mở lại**.

---

## Bối cảnh (hiện trạng đo trên `8f647226`)

| Nơi | Hiện trạng | Nguồn |
|---|---|---|
| Nộp / trả | `ghiQuyetToan`: một bên, **một chiều** mỗi phiếu (`chieu: "nop"` ⇒ dòng công ty → người nộp; `"tra"` ⇒ người nhận → công ty), phân bổ tối đa 100 đơn; không kiểm vượt số còn nợ | `src/modules/billing/service.ts:361-397` |
| Phiếu quyết toán | `bil_posting.order_id` trống được khi nhiều đơn; dòng mang đơn | `migrations/0045:99-101` |
| "Hoàn thành" | trigger `bil_posting_completed_settled` kiểm số dư **theo từng đơn** | `0045:224-236` |
| Ngày phát sinh | `occurred_date` (ngày VN) trên `bil_payment_receipt`, `bil_posting`; **chưa có kỳ** | `0045:84`, `:105` |
| Chi phí chuyến | ADR-0057 T2 (`vc_trip_cost_line`) **chưa có migration** trên `main` | `git ls-tree main migrations/` (1/10) |
| Cạnh `billing ↔ van-chuyen` | **cố ý để ngỏ** (Q12); `bil_debt_line.trip_id` không khoá ngoại | ADR-0057 T3 D2 |

**Vấn đề đồ thị:** nếu bảng khoá kỳ thuộc `billing` (`bil_`), trigger của `van-chuyen` muốn chặn ghi chi phí vào tháng đã khoá phải đọc view `v_bil_…` ⇒ cạnh **`van-chuyen → billing`** ở tầng SQL ⇒ **đặt sẵn đáp án Q12 = (A)**, điều ADR-0057 cố ý tránh. Ngược lại, `billing` đọc `vc_` thì phạm ADR-0040 D1. ⇒ khoá kỳ phải ở **một module thấp hơn cả hai**.

---

## Quyết định

### Phần D1 — Khoá kỳ (Hiến chương 5.14)

1. **Kỳ = tháng dương lịch theo giờ Việt Nam**, suy từ **ngày phát sinh** (`occurred_date`, `YYYY-MM-DD`) của dòng: kỳ = 7 ký tự đầu. Không lưu cột kỳ trên từng dòng (suy được — như ADR-0026 đã nói "thêm sau không mất dữ liệu").
2. **Module mới `ky-so`** (tên đề xuất; tiền tố bảng `ky_`, view `v_ky`; hạng `STRICT`; chỉ phụ thuộc `audit`). Sở hữu **một** bảng `ky_period_close` (chỉ-thêm): `period` (`YYYY-MM`, khoá chính), `closed_at` (UTC), `closed_by`, `note`, đủ bốn cột WHO; trigger chặn `UPDATE`/`DELETE`. View công bố `v_ky_closed_period(period)`.
   - **Cạnh mới:** `billing → ky-so`, `van-chuyen → ky-so`, `ky-so → audit`. **Không** tạo cạnh nào giữa `billing` và `van-chuyen` ⇒ Q12 của ADR-0057 **vẫn để ngỏ**.
   - **Bổ sung đồ thị** ADR-0002 / ADR-0024 điều 2 (thêm một module, ba cạnh) — chủ duyệt ADR này là duyệt việc thêm; `src/architecture.test.ts` (`ALLOWED_EDGES`, `STRICT`, `TABLE_PREFIX`, `VIEW_PREFIX`) và `docs/ARCHITECTURE.md` (tệp luật — AI chỉ **đề xuất** diff, N9).
3. **Hai lớp (5.1):**
   - **CSDL:** trigger `BEFORE INSERT` trên `bil_payment_receipt`, `bil_posting` (module `billing`) và — khi bảng có — trên dòng chi phí chuyến `vc_trip_cost_line` (module `van-chuyen`, ADR-0057 T2): `substr(NEW.occurred_date, 1, 7) IN (SELECT period FROM v_ky_closed_period)` ⇒ `RAISE 'period_closed: …'`. `bil_debt_line` không có ngày riêng — thuộc kỳ của phiếu (`bil_posting.occurred_date`), nên khoá phiếu là khoá dòng. Mỗi trigger chỉ đọc bảng cùng module + view công bố (ADR-0024 điều 5).
   - **Mã:** mọi route ghi tiền kiểm trước và trả 409 tiếng Việt: "Tháng 10/2026 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)".
   - **L-T1 (ADR-0057):** nếu ADR-0057 T2 gộp `main` **trước** lượt 2, migration lượt 2 thêm trigger cho `vc_trip_cost_line`; nếu **sau**, migration của T2 phải có sẵn trigger này (ghi vào kế hoạch T2). Cả hai trường hợp: bản phát hành lượt 2 không lên khi chưa có lớp khoá cho mọi bảng tiền có ngày phát sinh đang tồn tại.
4. **Luật khoá:**
   - Ô mới `ledger.period.close` (Kế toán, Toàn quyền — U3 "Kế toán khoá"). Route `POST /api/ledger/ky/:period/khoa` đặt ở **module `billing`** (cổng `office`) — vì điều kiện "tháng đầu tiên" cần đọc bảng `bil_`; route gọi **câu chưa chạy** `khoaKyStatement` do `ky-so/index.ts` công bố (ADR-0002 quy tắc 3), cùng lô với nhật ký `ledger_period_closed`; lý do/ghi chú tuỳ chọn.
   - **Ở mã (route của `billing`):** chỉ khoá **tháng đã qua** (`period` < tháng hiện tại theo `vnToday()`); tháng **đầu tiên** được khoá phải ≤ tháng của dòng sổ `bil_` sớm nhất (không để sót tháng có dòng ở trước). Dòng chi phí chuyến (`vc_`) không vào điều kiện này — `billing` không đọc `vc_` (ADR-0040 D1); kế hoạch ghi rủi ro "tháng có chi phí chuyến nhưng không có dòng sổ".
   - **Ở CSDL (trigger của `ky-so`, chỉ đọc `ky_period_close`):** khoá **liền kề** — bảng rỗng thì tháng nào cũng được (tháng đầu); bảng có dòng thì `NEW.period` phải đúng **tháng ngay sau** tháng lớn nhất đã khoá; khoá trùng bị khoá chính chặn. Trigger **không** đọc `bil_`/`vc_` (giữ `ky-so` chỉ phụ thuộc `audit` — Hiến chương 5.3, bài thân trigger `src/architecture.test.ts:930-1000`).
   - **Không mở lại** (5.14: "kỳ đã khoá thì không ghi thêm vào kỳ đó"). Muốn có đường mở lại = ADR mới do chủ duyệt.
   - **Trước khi khoá**, màn khoá hiện **bảng kiểm** (không chặn, Kế toán quyết): khoản "Công ty thu – CK" chờ xác nhận có ngày trong tháng; lần thu "chưa rõ người thu"; đơn "Đã giao" thiếu dòng giá vốn (R-BIL-2 cảnh báo); số dư từng bên cuối tháng.
5. **Sau khoá:** sai sót ghi **phiếu điều chỉnh / đảo** (ADR-0026 điều 8) với **ngày phát sinh trong tháng đang mở** + lý do bắt buộc + trỏ phiếu gốc (khi đảo). Dòng đảo của một dòng thuộc tháng đã khoá **được phép** (dòng đảo mang ngày mới, không phải ngày của dòng gốc).
6. **Ngày phát sinh mặc định** vẫn là `vnToday()` (ADR-0026) — luôn thuộc tháng đang mở, nên HDV / Bán hàng / Đối tác **không bao giờ** gặp lỗi khoá kỳ ở luồng thường; chỉ Kế toán khi tự chọn ngày lùi.
7. **Không khoá:** đơn hàng, dòng điều chỉnh số khách (`order_money_adjustment` — không phải sổ), dấu "đã nhập phần mềm kế toán" (ADR-0060), bảng mức / điều khoản (có ngày hiệu lực riêng).

### Phần D2 — Quyết toán tháng: một phiếu bù trừ nhiều đơn, hai chiều

8. **Mở rộng route quyết toán** (`POST /api/ledger/settlements`, ô `ledger.write` — Kế toán, Toàn quyền, **không đổi ô**) thêm kiểu **`bu_tru`**: một bên (đại lý / CTV / lễ tân / nhà cung cấp / nhân viên), **nhiều đơn**, mỗi đơn một **số có dấu**: dương = bên đó trả/được trừ phần họ nợ công ty trên đơn đó; âm = công ty trả/được trừ phần công ty nợ họ trên đơn đó.
   - Mỗi đơn sinh **một dòng** `SETTLEMENT` đúng chiều (bên → công ty nợ giảm: dòng công ty → bên; công ty → bên nợ giảm: dòng bên → công ty) — **phân bổ theo đơn** như ADR-0026 điều 5, vì "Hoàn thành" kiểm **từng đơn** (ADR-0025 điều 7).
   - **Không vượt:** số của mỗi đơn ≤ số dư hiện tại của cặp (bên, công ty) trên đơn đó theo đúng chiều (kiểm ở mã; kiểm định kỳ `R-BIL-13`). Lượt 1 chưa kiểm vượt ở `nop`/`tra` — áp chung từ lượt 2.
   - Màn hiện **"Tiền thực chuyển: X ₫ (đại lý → công ty)"** hoặc "(công ty → đại lý)" = tổng có dấu; **số này không lưu** (suy từ dòng — 5.4). Hình thức chuyển và số chứng từ ngân hàng ghi ở `reason`/ghi chú của phiếu (đối soát ngân hàng ngoài phạm vi — ADR-0004).
   - Ngày phát sinh phiếu = ngày tiền thực chuyển (thuộc tháng đang mở).
9. **Bảng kê tháng** (route đọc của `billing`, ô `ledger.view any`): theo **một bên** × **một tháng**: số dư đầu kỳ, từng dòng phát sinh trong tháng (đơn, loại, số), số dư cuối kỳ, cờ "tháng đã khoá". Cũng là nguồn của màn đối tác (ADR-0081 — chỉ phần của chính họ).
10. **Không gộp nợ nhà xe** vào lượt này (câu C7, khuyến nghị tách): dòng nguồn chuyến vẫn bị trigger `bil_debt_line_trip_not_yet` chặn; chỉ **khoá kỳ** áp cho chi phí chuyến (L-T1).

### Bảng quyền (9 quyền app)

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SUPER | INTERN | DRIVER | DRV_P | Route |
|---|---|---|---|---|---|---|---|---|---|---|
| `ledger.period.close` (**mới**) | none | any | none | none | none | any | none | none | none | `POST /api/ledger/ky/:period/khoa` (module `billing`) |
| `ledger.write` (có sẵn, không đổi) | none | any | none | none | none | any | none | none | none | `POST /api/ledger/settlements` (thêm `bu_tru`) |
| `ledger.view` (có sẵn, **không đổi** — PARTNER vẫn `none`; Đối tác đọc qua ô riêng của ADR-0081) | own | any | own | own | none | any | own | none | none | bảng kê tháng (`any`); `GET /api/ledger/ky` (danh sách tháng đã khoá — `any`) |

- `ADMIN` = `none` ở `ledger.period.close`: theo H4/U3 "Kế toán"; cùng khuôn `ledger.write`, `order.complete` (Quản trị không). Đổi một ô là hai chiều.

### Dữ liệu (cùng migration lượt 2; số chốt lúc gộp)

| Bảng / view | Module | Ghi chú |
|---|---|---|
| `ky_period_close` + `v_ky_closed_period` | `ky-so` (mới) | chỉ-thêm; khoá chính `period` |
| trigger `*_period_closed` | `billing` (2 bảng); `van-chuyen` (khi `vc_trip_cost_line` có) | điều 3 |
| không cột mới | `billing` | `bu_tru` chỉ là cách sinh dòng `SETTLEMENT` |

### Bất biến

- `R-KY-1` (error): không dòng `bil_payment_receipt` / `bil_posting` (và `vc_trip_cost_line` khi có) nào có tháng phát sinh đã khoá mà `created_at` > `closed_at` của tháng đó.
- `R-KY-2` (error): các tháng đã khoá liền nhau từ tháng đầu tiên (không "lỗ").
- `R-BIL-13` (warn): không đơn nào có số dư một cặp (bên, công ty) **đổi dấu** do dòng `SETTLEMENT` (quyết toán vượt).

---

## Ví dụ bằng số

**Ví dụ D-1 — bù trừ ba đơn, đại lý trả chênh lệch.** Đại lý A, tháng 10/2026 (số dư theo ADR-0079):

| Đơn | Diễn giải | Số dư |
|---|---|---|
| TD-1001 | Ví dụ C-1: đại lý giữ cọc 3.000.000, giảm 250.000, hoa hồng 500.000 | A nợ TĐ **2.750.000** |
| TD-1002 | Vé Hòn Tằm 1.000.000, mức 12% (bậc 1), khách CK thẳng công ty | TĐ nợ A **120.000** |
| TD-1003 | Ví dụ A-1 (6.000.000, hoa hồng 790.000), HDV thu đủ 6.000.000 tại cảng | TĐ nợ A **790.000** (HDV nợ TĐ 6.000.000 — nộp riêng) |

Ngày 05/11 Kế toán ghi một phiếu `bu_tru` cho A: TD-1001 **+2.750.000** (dòng TĐ → A), TD-1002 **−120.000** (dòng A → TĐ), TD-1003 **−790.000** (dòng A → TĐ). Tiền thực chuyển = 2.750.000 − 120.000 − 790.000 = **1.840.000 ₫ (A → công ty)**. Sau phiếu: số dư A trên cả ba đơn = 0 ⇒ TD-1001 "Hoàn thành" được khi HDV Nam đã nộp 1.750.000; TD-1003 khi HDV đã nộp 6.000.000.

**Ví dụ D-2 — bù trừ, công ty trả chênh lệch.** CTV Lan, tháng 10: TD-1004 khách CK công ty 2.000.000, mức 15% ⇒ TĐ nợ Lan 300.000; TD-1005 HDV thu 1.000.000, 15% ⇒ TĐ nợ Lan 150.000; TD-1006 Lan giữ cọc 300.000 trên đơn 1.000.000 (15%), HDV thu 700.000 ⇒ Lan nợ TĐ 150.000. Phiếu `bu_tru`: −300.000, −150.000, +150.000 ⇒ **công ty chuyển Lan 300.000**.

**Ví dụ D-3 — khoá tháng rồi phát hiện sai.** Ngày 06/11 Kế toán khoá tháng 10 (bảng kiểm sạch). Ngày 08/11 phát hiện TD-1002 lẽ ra 10% (100.000) chứ không 12% (120.000) — đơn đã "Đã giao" (khoá). Kế toán ghi phiếu **điều chỉnh** ngày **08/11**, lý do "mức Hòn Tằm của A là 10% theo hợp đồng", dòng **A → TĐ 20.000** loại *hoa hồng*. Nếu chọn ngày 31/10 ⇒ máy từ chối "Tháng 10/2026 đã khoá sổ". Bảng kê tháng 11 của A: **đầu kỳ 1.840.000** (A nợ — số cuối tháng 10, vì phiếu bù trừ ghi ngày 05/11), phát sinh −1.840.000 (bù trừ 05/11) + 20.000 (điều chỉnh 08/11) ⇒ **cuối kỳ: A nợ 20.000**, trả trong lần quyết toán tháng 11.

**Ví dụ D-4 — tiền thật về trước khi khoá nhưng ghi trễ.** HDV Nam nộp 1.750.000 ngày 31/10, Kế toán quên ghi, khoá tháng 10 ngày 06/11, ghi ngày 07/11 ⇒ phải để ngày phát sinh **07/11** (ghi chú "nộp thực tế 31/10"). Bài học vận hành ⇒ bảng kiểm trước khi khoá (điều 4) có dòng "người đang giữ tiền công ty cuối tháng" để Kế toán đối chiếu trước khi bấm.

---

## Sửa câu nào của quyết định đã duyệt

| Nguồn | Câu hiện hành | Sau ADR này |
|---|---|---|
| ADR-0026 bổ sung khi duyệt, 5.14 | "**Lệch có chủ ý: Hiến chương điều 5.14, vế 'khoá kỳ'** — chưa có kỳ/khoá kỳ ở lượt 1… Hạn: khoá kỳ phải có trong cùng bản phát hành với lượt 2" | Lệch **gỡ** khi bản lượt 2 lên. |
| ADR-0057 bảng lệch, **L-T1** | "…chưa có kỳ / khoá kỳ… Cùng hạn với lệch khoá kỳ của ADR-0026" | Gỡ cùng lúc; trigger chi phí chuyến đọc `v_ky_closed_period` (module `ky-so`), **không** đọc `billing`. |
| ADR-0026 điều 5 | "Mỗi việc là một phiếu với dòng *quyết toán*… ngược chiều, phân bổ theo đơn" | "…thêm kiểu **bù trừ hai chiều** nhiều đơn một phiếu (một bên); mỗi đơn một dòng đúng chiều; không vượt số dư." |
| ADR-0002 / ADR-0024 điều 2, đồ thị | (không có `ky-so`) | + `ky-so` (→ `audit`); `billing → ky-so`; `van-chuyen → ky-so`. |
| Bảng thi hành Hiến chương, dòng 5.14 | "**chưa có**" | (mô tả — sửa khi thi công, chủ duyệt diff tệp luật) trigger khoá kỳ + `R-KY-1`. |

## Phương án bị loại

- **Bảng khoá kỳ thuộc `billing`** — trigger chi phí chuyến phải đọc `billing` ⇒ đặt sẵn Q12 (ADR-0057 cố ý để ngỏ).
- **Mỗi module tự giữ bảng khoá kỳ riêng** — hai nguồn sự thật cho "tháng 10 đã khoá chưa" (5.4 tinh thần một nguồn).
- **Cho Toàn quyền mở lại kỳ** — trái 5.14; muốn có phải ADR mới.
- **Lưu "tiền thực chuyển" thành cột trên phiếu** — số thứ hai cho cùng một giá trị (suy được từ dòng).
- **Một dòng "bù trừ" gộp nhiều đơn** — "Hoàn thành" kiểm theo đơn; mất phân bổ.

## Hệ quả

- **Mã:** `src/modules/ky-so/` mới (repository nghiêm, **câu chưa chạy** `khoaKyStatement` + hàm đọc danh sách tháng; không route); `billing` (route khoá tháng + danh sách tháng, trigger, kiểm 409, kiểu `bu_tru`, bảng kê tháng, bảng kiểm trước khoá); `van-chuyen` (trigger khi T2 có); `src/architecture.test.ts`; `src/shared/permissions.ts` (1 ô — việc lớn); `web/` màn "Quyết toán" + "Khoá tháng" (chờ bản vẽ của chủ — nợ N-4).
- **Tệp luật** (`docs/ARCHITECTURE.md` danh sách module, bảng thi hành 5.14; `CLAUDE.md` §7 nếu cần): AI chỉ đề xuất diff (N9).
- **Việc lớn** (dữ liệu + tiền + quyền + luật kiến trúc): người kiểm độc lập chỉ-đọc.

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)

1. D-1…D-4 thành test; khớp từng đồng; sau D-1, "Hoàn thành" từng đơn thành công khi người giữ tiền đã nộp.
2. Khoá tháng 10 ⇒ chèn tay (SQL) lần thu / phiếu ngày 2026-10-xx ⇒ trigger chặn (thấy chặn thật một lần); route ⇒ 409 tiếng Việt.
3. Khoá tháng hiện tại / tương lai ⇒ 400 (mã); tháng đầu sau dòng sổ sớm nhất ⇒ 409 (mã); khoá tháng 12 khi tháng lớn nhất đã khoá là 10 ⇒ trigger `ky-so` chặn (SQL chạy tay cũng chặn); khoá lần hai ⇒ khoá chính chặn; `UPDATE`/`DELETE` `ky_period_close` ⇒ chặn. Bài thân trigger: trigger `ky-so` không nhắc bảng nào ngoài `ky_` (thấy đỏ một lần khi cài tạm trigger đọc `bil_posting`).
4. `bu_tru` vượt số dư một đơn ⇒ 400; Quản trị / Bán hàng gọi ⇒ 403; Đối tác ⇒ 403.
5. Bài kiến trúc: `ky-so` không import module nào ngoài `audit`; không có cạnh `billing ↔ van-chuyen`; thân trigger khoá kỳ chỉ đọc bảng cùng module + `v_ky_closed_period` — thấy đỏ một lần khi cài tạm trigger `vc_` đọc `v_bil_*`.
6. `audit-invariants`: chèn dòng vào tháng đã khoá bằng cách tắt trigger trên bản sao ⇒ `R-KY-1` thoát 1.

## Điều chưa chắc

- Tên module `ky-so` và route — bề mặt, chốt ở kế hoạch.
- "Khoá theo thứ tự" (điều 4) là đề xuất của AI cho 5.14 (Hiến chương không nói thứ tự); đảo được bằng một trigger.
- Câu **C7** (nợ nhà xe gộp hay tách).
