# Đề xuất ADR-0057 (số tạm — điều phối cấp số thật) — Vận chuyển, tiền xe thuê: bảng giá thuê theo nhà xe (trong Vận chuyển); chi phí chuyến chụp lúc giao cho nhà xe; dòng nợ của sổ công nợ gắn được với chuyến (sửa ADR-0026)

- **Trạng thái:** **ĐỀ XUẤT — chủ xem kỹ, CHƯA duyệt, đổi hai điểm ("Trả lời lần 18", commit `ae6b2fd`); bản này đã sửa theo lần 18, chờ người kiểm độc lập kiểm lại rồi chủ duyệt.** Bốn vòng kiểm trước (tới `e175d35`) xem bản trước lần 18.
  - AI soạn ở vai người thiết kế (P15); không tự duyệt (N3, Điều 7.2). Không đặt ở `docs/adr/`.
  - Thuộc **lượt duyệt B**; trang ghép `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-b-kernel-tien.md`. Trang ghép mục 0 đề nghị trình tệp này **riêng** thành lượt **B1** (vì phần T3 phải duyệt trước Task 3 của sổ tiền lượt 1).
- **Ngày:** 2026-09-30.
- **Gấp:** **T3 (sửa ADR-0026) nên được duyệt TRƯỚC Task 3 (migration B — sổ `billing`) của kế hoạch `docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md`.** Lý do bằng chữ: trong kế hoạch §3.2, `bil_posting.order_id` đã để trống được nhưng `bil_debt_line.order_id` **bắt buộc**. Đổi "bắt buộc" thành "trống được" sau khi bảng có dữ liệu nghĩa là **dựng lại một bảng chỉ-thêm** có trigger và khoá ngoại (ADR-0003 điều 10 tránh tuyệt đối); `CHECK` mới cũng không thêm được bằng `ALTER`. Sổ tiền lượt 1 hôm nay còn chờ ADR-0049 gộp `main` (Task 0), nên còn thời gian.
- **Nguồn:**
  - bản đề xuất tiền cũ `docs/superpowers/specs/2026-09-28-de-xuat-adr-van-chuyen-luot-3.md` (**[CŨ]**) — D1, D2 lấy nội dung từ đây sau khi đối chiếu lại (mục "Đối chiếu nguồn cũ");
  - lời chủ, [HĐ] `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` "Trả lời lần 16" (30/9), nguyên văn nhãn:
    - **Q1 — a "Làm trước"** — "**Đổi so với lời cũ** ('để sau, đi cùng sổ công nợ'): giá + chi phí xe làm trước, không chờ sổ công nợ";
    - **Q2 — a "Trong Vận chuyển"** — "**Cửa một chiều:** bảng giá thuê xe thuộc `van-chuyen` (không phải `pricing`)";
    - **Q3 — a "Theo tuyến thắng"**; **Q4 — a "Lúc giao cho nhà xe"**; **Q5 — a "Chia hai vai"** ("Quản trị + Toàn quyền nhập giá; Kế toán + Toàn quyền sửa tiền chuyến"); **Q6 — a "Cho chạy, hiện 'thiếu giá'"**; **Q9 — a "Chỉ tính theo chuyến"**;
    - **Q7, Q8, Q10 — "Đồng ý cả ba"**: Q7 phí huỷ với nhà xe ghi tay trước, bảng mốc huỷ làm sau; Q8 chi phí xe công ty không thuộc lượt này; Q10 dòng nợ gắn được với chuyến (không chỉ với đơn);
    - "Chưa hỏi / còn lại": **Q11–Q12 (lúc trình sổ công nợ)**;
  - [HĐ] **"Trả lời lần 17"** (30/9): Q-T1 "Theo cỡ xe = số khách", Q-T2 "Sổ tiền trước, duyệt ngay phần nợ gắn chuyến", Q-T3 "Kế toán ghi giá chốt tay" (**nay không còn áp dụng — xem lần 18**), Q-T4 "Lúc văn phòng xếp xe của nhà xe", Q-T5 "Người xếp xe", Q-T6 "Giữ giá đã chụp, Kế toán chỉnh tay", Q-T7 "Có, chỉ xem" (**thay bởi lần 18**), Q-T8 "Duyệt, cùng hạn sổ công nợ";
  - [HĐ] **"Trả lời lần 18"** (30/9) — chủ **chưa duyệt**, đổi hai điểm, nguyên văn: *"3- Chưa có giá thì không được chạy, giá phải có niêm yết hoặc thoả thuận giá trước, đây là nguyên tắc của thị trường, cũng là phù hợp với luật. 5- Quản trị có quyền ngang kế toán"*; ba câu làm rõ: giá thoả thuận trước do **"Quản trị, Kế toán, Toàn quyền"** nhập; "ngang" = **"Hai vai giống hệt"**; xe cứu hộ của nhà xe chưa có giá = **"Vẫn phải nhập giá thoả thuận trước"** (không ngoại lệ, không phá lệ). Lời lần 18 **thay** Q6 a (lần 16), **thay** một phần Q5 a và Q-T7 (lần 17);
    - hai điểm đối chiếu người ghi nêu cuối lần 16 (Q10 × ADR-0026 đã duyệt; Q1 × thứ tự thi công) — xử lý ở T3 và câu Q-T2;
  - lời chủ 28/9 (thiết kế `docs/superpowers/specs/2026-09-27-van-chuyen-design.md` §0.2, §0.13): "giá thuê, chi phí, công nợ nhà xe"; "xe đối tác thuê theo chuyến, giá theo tuyến hoặc loại xe";
  - ADR-0024, ADR-0026 (accepted 29/9, **chưa thi công**), ADR-0040, ADR-0047, ADR-0048, ADR-0049; Hiến chương Phần I 4.2, 4.3, 4.4, 5.3–5.7, 5.14, 5.15, 5.17.
  - Mã đo trên `thi-cong-adr-0049-tiep` @ `1f8b498` (`@49`) và `main` (`@main`).
- **Loại:**
  - **một chiều:** chủ và tiền tố bảng giá thuê (`vc_` — chủ chọn Q2 a); các bảng chỉ-thêm có dữ liệu; mốc chụp (đổi = ADR mới, 5.6); **hình dạng dòng nợ** `bil_debt_line` (T3) một khi Task 3 đã áp.
  - **hai chiều:** ô quyền; danh mục tuyến / cỡ xe, lý do (dữ liệu); thứ tự ưu tiên giá (mã có test — đổi bằng ADR).
- **Hiến chương áp:** 2.1, 2.2, 4.2, 4.3, 4.4, 5.1–5.7, 5.12–5.15, 5.17.
- **Xây trên lỗ đang hở:** `docs/quyen-hoan.json` `phat_hien` = `[]` (kiểm 30/9 ở nhánh này và `@49`). Mục `thao_tac` còn 6 ô hoãn (`payment.receive`, `payment.refund`, `invoice.*` hạn 2026-12-31; `task.progress`, `dispatch.guides.view` hạn 2026-11-30) — T1, T2 **không** dựa vào ô nào trong số đó; T3 chỉ đổi hình dạng bảng của ADR-0026, không mở ô.
- **Xây trên nền chưa gộp / chưa phát hành (5.13):**
  - T2 cần `vc_trip` (`0042 @49`: `vehicle_id NOT NULL` `:21`, `carrier_party_id` chụp lúc xếp `:22`, giờ xảy ra `departed_ms`/`ended_ms`, dấu lô `last_cmd_id` `:14-15`) — **ADR-0049 lượt 1 chưa gộp `main`**; bốn mục luật của nó chủ "Xem từng mục lúc gộp";
  - T1, T2 cần vai nhà xe + view `v_pty_carrier`, `v_pty_owner_company` (`migrations/0038_nha_xe_doi_tac.sql:7-12 @main`) — **đã lên production 1.37**;
  - T3 sửa thiết kế của sổ tiền lượt 1 (ADR-0026 accepted, **chưa thi công** — Task 0 chờ ADR-0049 gộp).
- **Migration:** chỉ thêm, sau các số đã giữ chỗ (`0044`, `0045` cho sổ tiền lượt 1 — T3 **đi trong** migration B của sổ tiền, không phải migration riêng; `0019`, `0029`). T1, T2: số lấy lúc thi công.

---

## Tóm tắt (lời thường)

1. **Bảng giá thuê xe** nằm trong phần Vận chuyển: mỗi nhà xe có giá **mỗi chuyến** theo tuyến và/hoặc cỡ xe (số khách), có ngày hiệu lực. Có cả hai thì **giá theo tuyến thắng**. **Quản trị và Kế toán quyền giống hệt** (bạn chọn lần 18): nhập bảng giá, xem chi phí và bảng kê, sửa tiền chuyến có lý do, nhập giá thoả thuận; Toàn quyền như cũ. Bán hàng chọn tuyến khi xếp xe nhưng **không thấy tiền**.
2. **Chi phí từng chuyến** được máy tự "chụp" giá bảng **lúc văn phòng xếp xe của nhà xe**. Đổi nhà xe, đổi xe hay đổi tuyến trước khi xe chạy thì máy tự tính lại (giá thoả thuận đã nhập cũng bị huỷ, phải nhập lại); sau khi xe chạy chỉ sửa bằng điều chỉnh có lý do.
3. **Chưa có giá thì xe KHÔNG được chạy** (bạn chọn lần 18): chuyến xe thuê chỉ xuất bến khi có **giá bảng đã chụp** hoặc **giá thoả thuận trước** cho riêng chuyến (Quản trị / Kế toán / Toàn quyền nhập, có lý do, trước xuất bến). Không ngoại lệ, kể cả xe cứu hộ; không ai phá lệ được. Không bao giờ tính 0 đồng.
4. Chỉ **xe thuê**; chi phí xe công ty không thuộc lượt này. Tiền xe **chưa chia vào đơn**. Phí huỷ với nhà xe Kế toán ghi tay.
5. Kế toán có **bảng kê** "chuyến nào, nhà xe nào, bao nhiêu" để trả tay; việc đưa "nợ nhà xe" vào sổ công nợ làm sau (Q11, Q12 hỏi lúc đó).
6. **Sửa trước sổ công nợ:** dòng nợ trong sổ được phép gắn với **chuyến** (không chỉ với đơn). **Nếu chưa duyệt kịp phần này, phiên sổ tiền lượt 1 phải dừng ở bước tạo bảng nợ (Task 3)** — tạo bảng rồi thì đổi rất tốn.
7. **Chuyến kết thúc giữa chừng** (xe hỏng, tai nạn): máy **giữ giá đã có**; nhà xe tính ít hơn thì Quản trị / Kế toán điều chỉnh tay (bạn đã chọn, Q-T6).
8. **Chi phí chuyến chưa có "khoá kỳ"** (tháng đã chốt vẫn ghi thêm được bằng điều chỉnh) — lệch có chủ ý **L-T1**, cùng hạn với sổ công nợ (bạn đã duyệt ở Q-T8).
9. **Không còn câu hỏi mở.** Bạn chỉ cần duyệt sau khi người kiểm báo đạt bản sửa theo lần 18.

---

## Đối chiếu nguồn cũ ([CŨ] §2, §7) với hiện trạng 30/9

| Mục [CŨ] | Nay | Chứng cứ |
|---|---|---|
| G1–G3 chuyến, giờ kết thúc do máy chủ, bên vận chuyển chụp | **Đã có** | `vc_trip` `0042:18-60 @49`: `carrier_party_id` chụp lúc xếp (trigger `vc_trip_carrier_ins` `:497`), `departed_ms`/`ended_ms` = giờ xảy ra (ADR-0050) |
| G4 mốc "giao cho nhà xe" | Không có bước riêng trong ADR-0049 → **gán vào lô** đặt / đổi `carrier_party_id` (T2 B2) | `0042:508 @49` |
| G5 "loại xe yêu cầu" khi nhà xe tự điều xe | **Không cần**: `vehicle_id NOT NULL` | `0042:21 @49` |
| G6 vai nhà xe `CARRIER` nhóm `OTHER`, không tài khoản | **Đã có** (ADR-0048, production 1.37) | `0038:4 @main` |
| G7 tuyến | Chưa có → T1 tạo danh mục tuyến; `vc_trip` thêm cột tuyến | — |
| G8 `DRIVER_PARTNER` không ô tiền | **Đã có** | cột `DRIVER_PARTNER` = `none` ở `money.view`, `payment.receive`, `payment.refund` (`permissions.ts:73`, `:93-94 @49`); `ledger.*` = `none` theo ADR-0026 bổ sung |
| G9 view theo mã vai, view công ty chủ | **Đã có** `v_pty_carrier`, `v_pty_owner_company`, và đã nằm trong danh sách view trigger `vc_` được đọc | `0038:7-12 @main`; `src/architecture.test.ts:752 @49` |
| **LCY-1, LCY-2** (lệch 5.1 vì thiếu view) | **Bỏ — không còn cơ sở**: đủ hai lớp (T1 B4, T2 C4) | như G9 |
| X1 `pricing` sở hữu điều khoản cung ứng (ADR-0024 điều 1) | Chủ chọn Q2 a → **thay câu** ADR-0024 điều 1 | bảng "Câu ADR bị thay" |
| X2 dòng nợ gắn đơn | Chủ chọn Q10 → **T3** | — |
| X3 tính tiền xe hai lần (chi phí chuyến + giá vốn a% của dịch vụ đưa đón) | Chủ chọn Q9 a (gồm câu "dịch vụ đưa đón **không** có giá vốn riêng khi Tour Đảo tự điều xe") → **ràng buộc cho ADR của D5 (lượt 2 sổ)** | T4 |
| X4 / Q12, X5 / Q11 | **Vẫn để sau** (chủ: "lúc trình sổ công nợ") | T4 |
| X8 ADR-0026 thiếu cột `DRIVER` | **Đã giải**: ADR-0026 "Bổ sung khi duyệt" — `DRIVER`, `DRIVER_PARTNER` = `none` ở sáu ô tiền | `docs/adr/ADR-0026-*.md:13` |
| X9 luật thân trigger | ADR-0024 điều 5 **accepted** | `docs/adr/ADR-0024-*.md:65` |
| "Loại xe" của D1 [CŨ] (danh mục loại khai trên từng xe) | **Xung đột** với Kernel lượt 3 Q-L3-2 a "Số chỗ tối thiểu" → câu **Q-T1** | ADR-0056 tạm VK3-A |

---

## Quyết định

### T1. Bảng giá thuê xe trong Vận chuyển (Q2 a, Q3 a; quyền theo lần 18)

**B1. Dữ liệu** (module `van-chuyen`, tiền tố `vc_`; chính sách có ngày hiệu lực — 2.2, 5.2):
- **Danh mục tuyến** `vc_route` (khuôn `vc_reason`): mã (PK, bất biến), tên ("Nha Trang – sân bay Cam Ranh"), `active`, thứ tự, dấu vết; trigger cấm xoá, cấm đổi mã. Tuyến là **nhãn để tra giá**, không phải lộ trình. **Không** khoá tới `loc_location` ở lượt này (giả định G-T1 — thêm sau bằng `ADD COLUMN` được; tránh dựa vào cạnh `van-chuyen → locations` đang chờ chủ duyệt lúc gộp ADR-0049).
- **Chiều "cỡ xe"** (Q-T1, chủ chọn lần 17 "Theo cỡ xe = số khách"): danh mục cỡ `vc_vehicle_size` theo **khoảng số khách không kể tài xế** (khoảng không chồng nhau, đổi bằng thêm dòng / ngưng dùng), máy tự suy cỡ của xe từ `passenger_capacity` — không khai thêm gì trên xe.
- **Dòng giá thuê** `vc_rental_rate` (chỉ-thêm, khuôn `vc_expiry_policy` / `vc_departure_rule`):
  - `carrier_party_id` (bắt buộc, FK `pty_party` — cạnh `van-chuyen → parties` có sẵn); `route_code` (trống được); chiều cỡ xe (trống được) — **ít nhất một trong hai**;
  - `unit` `CHECK IN ('PER_TRIP')` — tập đóng một giá trị (chủ: "thuê theo chuyến"; thêm theo giờ/km = ADR mới);
  - `amount` `INTEGER` VNĐ `> 0`; `valid_from_date`, `valid_to_date` (ngày dân sự VN); ghi chú ngắn; dấu vết đủ bốn cột.
  - Đổi giá = **đóng dòng cũ + thêm dòng mới** trong một lô.
- **Không** có giá mặc định không theo nhà xe.

**B2. Luật "dòng nào thắng"** — hàm thuần duy nhất (tên đề xuất `chonDongGiaThue`) ở `src/shared/` hoặc `van-chuyen/rules.ts`, có test. Trong các dòng **đang hiệu lực vào ngày chạy của chuyến** (`vc_trip.service_date`) của **đúng nhà xe**: (1) khớp cả tuyến **và** cỡ xe; (2) khớp tuyến, cỡ trống; (3) khớp cỡ, tuyến trống (**Q3 a: tuyến thắng cỡ**). Không có dòng → **"không có giá bảng"** (T2: cần giá thoả thuận trước, nếu không chuyến bị **giữ**, không lấy 0).

**B3. Quyền** (bốn ô thao tác mới — **không** phải mã quyền mới, nên không nhân đôi bài "tập con quyền", không đụng `EXTERNAL_PERMISSIONS`/LC-1). Cột theo thứ tự `permissions.ts:5 @49`:

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SUPER | INTERN | DRIVER | DRIVER_PARTNER |
|---|---|---|---|---|---|---|---|---|---|
| `transport.rate.view` — xem bảng giá | none | any | any | none | none | any | none | none | none |
| `transport.rate.manage` — thêm/đóng giá; sửa danh mục tuyến, cỡ xe | none | **any** | any | none | none | any | none | none | none |

- **ADMIN = ACCOUNTING ở mọi ô `transport.*`** (lần 18 "Hai vai giống hệt"). Thay Q5 a lần 16 ("Quản trị + Toàn quyền nhập giá; Kế toán + Toàn quyền sửa tiền chuyến") và Q-T7 lần 17 ("Có, chỉ xem").

- Danh sách **tên** tuyến / cỡ xe (không giá) đọc được bởi ai có `trip.dispatch` hoặc `transport.rate.view` — người xếp xe cần chọn tuyến (T2 B1). `FIELD` không bao giờ đọc bảng giá (ADR-0019 điều 3).

**B4. Bất biến hai lớp (5.1):**

| Luật | CSDL | Máy chủ |
|---|---|---|
| Tiền nguyên dương; có tuyến hoặc cỡ | `CHECK` | kiểm trước, lỗi tiếng Việt |
| Không chồng hiệu lực cùng khoá (nhà xe, tuyến, cỡ) | trigger chèn (khuôn `pty_party_role_overlap`, `0011:97-104`); so khoá có thể trống bằng `IS` (không dùng `=` — `NULL = NULL` không đúng), khoảng ngày mở bằng `COALESCE(valid_to_date, '9999-12-31')` | kiểm trước, mã lỗi riêng |
| Chỉ-thêm: không đổi tiền/khoá; `valid_to_date` đặt **một lần**; không xoá | trigger `BEFORE UPDATE` + cấm `DELETE` | không có đường sửa tiền |
| **Nhà xe đang mở vai `CARRIER`** (thay LCY-1) | trigger `BEFORE INSERT` đọc `v_pty_carrier` (view công bố, đã được phép cho trigger `vc_`) | kiểm qua hàm công bố của `parties` (có sẵn `nhaXeDangHopTac`, `src/modules/parties/index.ts:103 @49`) |

- **Chỉ áp lúc THÊM dòng giá.** View chỉ lọc `valid_to_date IS NULL` — trạng thái **hiện tại**, không theo ngày (`0038:10-11`): **đóng** dòng giá của nhà xe đã thôi vai phải luôn làm được. **Người kiểm soi.**
- Kiểm định kỳ `R-VC-RATE-1` (`warn`): dòng giá đang hiệu lực của hồ sơ không còn vai `CARRIER`.

**B5. Route** (cổng `office`, `can()` đầu thân, 403 trước 400): `GET /api/van-chuyen/bang-gia?nha-xe=&ngay=` (`rate.view`); `POST /api/van-chuyen/bang-gia` (thêm; tuỳ chọn "thay dòng X") và `POST /api/van-chuyen/bang-gia/:id/ket-thuc` (`rate.manage`); `GET|POST|PUT /api/van-chuyen/tuyen`, `/co-xe` (ghi `rate.manage`; đọc tên như B3). Tên chốt ở kế hoạch.

**B6. Hạch toán:** không bút toán — bảng giá là chính sách, chưa phát sinh tiền.

### T2. Chi phí chuyến: chụp lúc giao cho nhà xe, chỉ-thêm, **thiếu giá thì không xuất bến** (Q4 a, Q7, Q8, Q9 a; lần 17; **lần 18 thay Q6 a**)

**C1. Phạm vi:** chỉ chuyến có `carrier_party_id` là **xe của nhà xe** — hồ sơ đang mở vai `CARRIER` **và** không phải công ty chủ, cùng tiêu chí với C8 (lúc chụp). Xe công ty: không có dòng chi phí (Q8). Chuyến gom nhiều đơn: **không** chia vào đơn (Q9 a).

**C2. Cột tuyến trên chuyến:** `vc_trip` thêm `route_code` (FK `vc_route`, trống được) bằng `ADD COLUMN`. Ai chọn: câu **Q-T5** (khuyến nghị người xếp xe — `trip.dispatch`). Trigger mới: chỉ đổi được khi chuyến `PLANNED` (sau đó `vc_trip_final_frozen` `0042:412` đã khoá chuyến kết thúc/huỷ; `vc_trip_identity` `:281` không liệt kê cột này nên phải có trigger riêng cho giai đoạn đang chạy).

**C3. Dòng chi phí chuyến** `vc_trip_cost_line` (chỉ-thêm — 5.5; chụp — 5.6):
- `trip_id` (FK `vc_trip`), `carrier_party_id` (FK `pty_party`);
- `kind` `CHECK IN ('SNAPSHOT','AGREED','ADJUSTMENT','REVERSAL')` — **`AGREED` = giá thoả thuận trước** cho riêng chuyến (lần 18); `amount INTEGER` **có dấu** — `CHECK`: `SNAPSHOT > 0`, `AGREED > 0`, `ADJUSTMENT ≠ 0`; `REVERSAL` là **dòng đảo đối dấu đúng dòng gốc** (`amount = −gốc`), dấu do **trigger so với dòng gốc**, **không** ghim bằng `CHECK` theo `kind` (đảo một điều chỉnh âm thì dòng đảo dương);
- *Khác có chủ ý với sổ ADR-0026:* ở sổ, dòng đảo là **số dương, đổi chỗ hai bên nợ/được nợ**; ở chi phí chuyến (một phía — Tour Đảo chịu), dòng đảo là **số có dấu ngược**. Hai kiểu không trộn; đưa vào sổ (D3) đi qua `tongChiPhiChuyen`;
- **nguồn quy tắc** (5.6): `rate_id` (FK `vc_rental_rate`, bắt buộc với `SNAPSHOT`, trống với mọi loại khác — `CHECK`) + bản sao tuyến, cỡ xe, số khách của xe lúc chụp, đơn giá. `AGREED` không có nguồn quy tắc: nó **là** thoả thuận (không phải chính sách áp vào) — không lệch 5.6; nguồn ghi ở lý do + ghi chú ("thoả thuận với nhà xe X ngày …") và nhật ký;
- `reason_code` (FK `vc_reason`, nhóm mới `CHI_PHI_XE`: phụ thu chờ thêm giờ, phí cầu đường / bến bãi, **phí huỷ muộn** (Q7), nhập sai, **giá thoả thuận trước** (cho `AGREED`), và mã hệ thống "đổi nhà xe / xe / tuyến trước xuất bến") — bắt buộc với `AGREED`, `ADJUSTMENT`, `REVERSAL`; ghi chú ngắn;
- `reverses_id` (UNIQUE, trỏ chính bảng);
- **hai trục thời gian (5.14):** `occurred_date` (ngày VN) = `vc_trip.service_date` cho `SNAPSHOT`, `AGREED` và đảo tự động; Kế toán chọn được cho `ADJUSTMENT` (mặc định `vnToday()` — khuôn bổ sung 5.14 của ADR-0026); tách khỏi `created_at` (UTC);
- `cmd_id` (dấu lô) + đủ bốn cột dấu vết.

**C4. Mốc chụp (Q4 a "Lúc giao cho nhà xe"):**
- ADR-0049 không có bước "giao" riêng ⇒ mốc = **lô lệnh đặt `carrier_party_id` là một nhà xe** (tạo chuyến bằng xe nhà xe; đổi xe sang xe nhà xe). Câu chụp đi **trong cùng lô**, mang điều kiện dấu lô `EXISTS (… vc_trip.last_cmd_id = <dấu lô>)` (`0042:14-15 @49`) để bên thua không để lại dòng lẻ.
- "Giao cho nhà xe" = **lúc văn phòng xếp xe của nhà xe** — không chờ ai bấm "Nhận". Lượt 3 Bảng điều phối có Nhận/Từ chối của tài xế đối tác: có dời mốc hay không là câu **Q-T4** (khuyến nghị giữ lúc xếp; Từ chối → giao lại → đảo + chụp lại).
- **Trước xuất bến**, lệnh đổi nhà xe / đổi xe (kể cả khi tài xế đối tác Từ chối và chuyến được giao lại — ADR-0053 tạm) / đổi tuyến ⇒ máy **tự đảo** nguồn giá cũ (`SNAPSHOT` **hoặc `AGREED`**) và chụp lại giá bảng trong cùng lô (lý do hệ thống). Nguồn cũ là `AGREED` thì giá thoả thuận **không** tự chuyển sang nhà xe/tuyến mới — không có giá bảng thì chuyến thành "thiếu giá" (bị giữ) tới khi nhập lại.
- Nếu lần chụp lại **không được phép** vì nhà xe của chuyến đã thôi hợp tác (đổi tuyến trên chuyến của nhà xe cũ), **cả lệnh bị từ chối** — không để lại trạng thái "đã đảo, chưa chụp": 409 `carrier_inactive` "Nhà xe này đã thôi hợp tác nên máy không tính lại giá được. Hãy chọn xe của nhà xe khác, hoặc giữ tuyến cũ." (Đổi **sang** xe nhà xe khác vẫn làm được: đảo dòng cũ không kiểm vai, chụp mới kiểm vai nhà xe mới.)
- **Từ lúc xuất bến:** nguồn giá (`SNAPSHOT` / `AGREED`) **không đảo được** (trigger: đảo nguồn giá chỉ khi chuyến `PLANNED`); sai thì chỉ `ADJUSTMENT` có lý do. Vì vậy mọi chuyến xe thuê đã xuất bến **luôn còn đúng một nguồn giá**. Đổi hồ sơ xe (số chỗ) sau khi chụp không đổi chi phí.
- **Huỷ chuyến trước xuất bến** ⇒ lô huỷ **đảo MỌI dòng còn hiệu lực** (`SNAPSHOT` / `AGREED` và mọi `ADJUSTMENT` chưa đảo) ⇒ tổng = 0; phí huỷ nếu có = `ADJUSTMENT` Kế toán ghi tay **sau** đó (Q7).
- **Lô đổi nhà xe / xe / tuyến trước xuất bến** cũng đảo **mọi** dòng còn hiệu lực rồi mới chụp `SNAPSHOT` mới (xem C8 "thứ tự đảo"). Mất: giá thoả thuận và điều chỉnh đã ghi trước xuất bến bị đảo theo, phải ghi lại nếu còn đúng — lô trả danh sách điều chỉnh đã đảo, bảng kê hiện "điều chỉnh bị đảo do đổi chuyến".
- **Chống dòng chen giữa (lô huỷ / lô đổi):** máy chủ đọc danh sách dòng còn hiệu lực trước lô; mọi câu đảo trong lô mang điều kiện dấu lô **và** điều kiện "số dòng chi phí **không phải `REVERSAL`** của chuyến vẫn bằng N đã đọc" (phiên bản chi phí — đếm trừ dòng đảo, vì chính các câu đảo trước trong lô chèn thêm dòng `REVERSAL`; `SNAPSHOT` mới ở cuối lô đổi đứng sau mọi câu đảo và có điều kiện dấu lô riêng). Bài kiểm đỏ-xanh bắt buộc: một lô đảo nhiều dòng **qua** khi không ai chen; **thua** khi có một điều chỉnh chen giữa. Có điều chỉnh chen vào giữa lúc đọc và lúc ghi ⇒ **lô thua cả lô** (409, thử lại), không bao giờ để lại điều chỉnh chưa đảo trên chuyến đã huỷ. Kiểm định kỳ `R-VC-COST-4`: chuyến huỷ có tổng chi phí = tổng các dòng phí huỷ ghi sau lúc huỷ (tức = 0 nếu không có phí huỷ). "Dòng phí huỷ" = dòng `ADJUSTMENT` có mã lý do phí huỷ (Q7) **và** thời điểm ghi sau mốc huỷ chuyến.
- Chi phí "đã phát sinh" khi chuyến `ENDED` hoặc `ENDED_INTERRUPTED`. Với chuyến gián đoạn: giá đã có giữ nguyên, Quản trị / Kế toán điều chỉnh tay nếu nhà xe tính ít hơn (chủ chọn Q-T6 lần 17); có ca sổ vàng.

**C5. Thiếu giá ⇒ giữ, không xuất bến (5.7; lần 18 — thay Q6 a):**
- **Nguồn giá** của chuyến xe thuê = một dòng `SNAPSHOT` hoặc `AGREED` chưa đảo. Không có ⇒ **"thiếu giá"** — chỉ có thể xảy ra khi chuyến còn `PLANNED`.
- **Giá thoả thuận trước (`AGREED`)**: Quản trị, Kế toán, Toàn quyền nhập qua ô `transport.cost.adjust` (lần 18); số dương, lý do bắt buộc, ghi chú thoả thuận; **chỉ khi chuyến `PLANNED`**; nhà xe phải đang mở vai `CARRIER`, không phải công ty chủ (cùng trigger với `SNAPSHOT`). Có giá bảng rồi thì không nhập `AGREED` được (một nguồn giá) — muốn dùng giá khác giá bảng: đảo `SNAPSHOT` (lý do) rồi nhập `AGREED`, trước xuất bến.
- **"Chụp lại"** (Quản trị / Kế toán / Toàn quyền): chỉ khi chuyến `PLANNED` — lấy giá bảng vừa nhập; là **ngoại lệ có chủ ý** của mốc Q4 (mốc là lúc xếp), có nhật ký.
- **Cổng xuất bến — hai lớp, không ai phá lệ** (xe cứu hộ cũng vậy — lần 18):
  - **[Máy chủ]** `kiemXuatBen` (`src/shared/dieu-phoi-kiem.ts:252 @49`) nhận thêm "nguồn giá" của chuyến và trả mã giữ mới **`THIEU_GIA`** trong `MA_GIU` (`src/shared/ly-do-giu.ts:18 @49`), lời nhắn "Chuyến xe thuê chưa có giá — Quản trị hoặc Kế toán nhập giá bảng hoặc giá thoả thuận", `aiXuLy: "QUAN_TRI"` (tập đóng `AI_XU_LY` hôm nay chỉ có Văn phòng / Quản trị / Toàn quyền — **không** thêm "Kế toán"; lời nhắn nói rõ Kế toán cũng làm được; giả định G-T5). **Không** thêm vào `MA_LUAT_PHA_LE` — hợp khuôn: bài ghim `dieu-phoi-kieu.test.ts:74-80 @49` đòi *mỗi mã phá lệ là mã giữ*, không đòi chiều ngược; `MA_GIU` đã có nhiều mã giữ không phá lệ được (`THIEU_TEN`, `GPLX_HET_HAN`…).
  - **[CSDL]** trigger mới `BEFORE UPDATE OF status ON vc_trip WHEN NEW.status = 'RUNNING' AND OLD.status = 'PLANNED' AND NOT EXISTS (SELECT 1 FROM v_pty_owner_company o WHERE o.party_id = NEW.carrier_party_id) AND NOT EXISTS (<dòng SNAPSHOT/AGREED chưa đảo của NEW.id>)` → `RAISE(ABORT, 'thieu_gia: …')`. Chỉ đọc `vc_trip_cost_line` (cùng module) và `v_pty_owner_company` (đã trong `VIEW_CHO_TRIGGER_VC`) — **kiểm được ở CSDL**, khuôn `vc_trip_running_requires_check` (`0042:396 @49`).
  - "Xe thuê" ở trigger = chủ xe **không phải công ty chủ hiện tại** (đóng an toàn): sau khi đổi công ty chủ (ADR-0043), xe của công ty chủ cũ cũng bị đòi giá — **người kiểm soi**.
- Nhãn "thiếu giá" là **lý do giữ**, hiện cho người xem chuyến (kể cả Bán hàng) như mọi lý do giữ, **không kèm số tiền** (giả định G-T4 sửa theo).
- **Bỏ `GIA_GHI_TAY`** (Q-T3 lần 17 "Kế toán ghi giá chốt tay"): đây là **hệ quả của lời chủ lần 18, không phải người soạn tự quyết** — chuyến xe thuê không thể xuất bến khi thiếu giá, và bảng chi phí chưa phát hành nên không có chuyến cũ nào đã chạy thiếu giá. Trường hợp "nhà xe thôi hợp tác khi chuyến còn thiếu giá" nay xảy ra **trước xuất bến**: chuyến bị giữ; văn phòng đổi sang xe nhà xe khác (hoặc huỷ chuyến). Lời chủ Q-T3 được ghi là "không còn áp dụng", không bị lờ đi.

**C6. Một nguồn tính (5.4):** một hàm `tongChiPhiChuyen(dong[])` — mọi đường (màn chuyến, bảng kê, sau này đưa vào sổ) đi qua nó; `chonDongGiaThue` là hàm tra giá riêng. Hàng rào kiểu `buildlines-guard`: phép cộng tiền chi phí ở chỗ khác → đỏ.

**C7. Quyền** (hai ô thao tác mới):

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SUPER | INTERN | DRIVER | DRIVER_PARTNER |
|---|---|---|---|---|---|---|---|---|---|
| `transport.cost.view` — chi phí chuyến, bảng kê | none | any | any | none | none | any | none | none | none |
| `transport.cost.adjust` — điều chỉnh, đảo, chụp lại, **nhập giá thoả thuận** | none | any | **any** | none | none | any | none | none | none |

- Quản trị = Kế toán ở cả hai ô (lần 18 "Hai vai giống hệt"); nhập giá thoả thuận **dùng lại** `transport.cost.adjust`, không thêm ô.
- Chi phí chuyến là **giá vốn**: không bao giờ vào DTO của `orders` (kể cả với `FIELD` có `money.view = assigned`), DTO tài xế (ADR-0049 D3 "Không bao giờ: tiền" — không đổi), DTO lịch chung / chi tiết chuyến mà `SALES` xem qua `trip.view`, biên nhận (4.4). Chỉ đi qua route riêng hỏi `transport.cost.*`.
- `SALES` xếp xe / chọn tuyến **gây ra** một lần chụp nhưng không thấy số: phản hồi lệnh xếp không mang tiền.

**C8. Bất biến hai lớp:**

| Luật | CSDL | Máy chủ |
|---|---|---|
| Chỉ-thêm | trigger cấm `UPDATE`/`DELETE` | không có đường sửa |
| Dấu của `SNAPSHOT` (> 0), `AGREED` (> 0), `ADJUSTMENT` (≠ 0); lý do bắt buộc (trừ `SNAPSHOT`) | `CHECK` theo `kind` | kiểm trước |
| Dòng đảo đối dấu đúng dòng gốc, cùng chuyến, mỗi gốc đảo một lần | trigger chèn so dòng gốc + `UNIQUE (reverses_id)` | — |
| Mỗi chuyến tối đa **một nguồn giá** còn hiệu lực (`SNAPSHOT` chưa đảo hoặc `AGREED` chưa đảo) | **một** trigger chèn đếm chung cả hai (bảng `vc_`) | kiểm trong lô |
| `AGREED` chỉ khi chuyến `PLANNED`; đảo nguồn giá chỉ khi chuyến `PLANNED` | trigger chèn đọc `vc_trip.status` | kiểm trước |
| **Chuyến xe thuê chỉ xuất bến khi có nguồn giá** (lần 18) | trigger `thieu_gia` trên `vc_trip` (C5) | `kiemXuatBen` → `THIEU_GIA` |
| Tổng chi phí chuyến ≥ 0 — **sau MỌI dòng**, không miễn dòng nào | trigger `BEFORE INSERT` (tổng hiện có + dòng mới ≥ 0), canh cả `ADJUSTMENT`, `REVERSAL` người ghi lẫn đảo hệ thống | `tongChiPhiChuyen` + kiểm trước; 409 bằng lời |
| **`SNAPSHOT` / `AGREED` chỉ cho chuyến có `carrier_party_id` = dòng, đang mở vai `CARRIER`, không phải công ty chủ** (thay LCY-2) | trigger `BEFORE INSERT … WHEN NEW.kind IN ('SNAPSHOT','AGREED')` đọc `vc_trip`, `v_pty_carrier`, `v_pty_owner_company` | kiểm qua hàm công bố của `parties` |
| `SNAPSHOT` / đảo tự động cùng lô với lệnh chuyến | điều kiện dấu lô trong câu ghi | — |

- **Thứ tự đảo trong lô huỷ / lô đổi** (theo chốt của điều phối sau kiểm lần 2 — SQLite kiểm trigger **từng dòng**, không kiểm được "cuối lô"): lô đảo **các dòng âm trước** (đảo `ADJUSTMENT` âm ⇒ dòng dương, tổng tăng), **rồi các dòng dương** (`SNAPSHOT`, `ADJUSTMENT` dương ⇒ tổng giảm dần về đúng 0). Vì kết thúc = 0 và phần sau chỉ giảm, tổng **không bao giờ âm giữa lô** ⇒ trigger canh mọi dòng mà không cần miễn. Lô đổi chụp `SNAPSHOT` mới **sau** cùng (luật "một `SNAPSHOT` chưa đảo" thoả vì dòng cũ đã đảo).
- Hệ quả: Kế toán **tự** đảo `SNAPSHOT` khi còn `ADJUSTMENT` âm, hoặc đảo một điều chỉnh dương làm tổng âm ⇒ **409** "Tổng chi phí chuyến sẽ âm — đảo điều chỉnh giảm trước" và CSDL `RAISE` — bất biến tiền giữ hai lớp (5.1).
- Luật vai **chỉ áp cho `SNAPSHOT`, `AGREED`**: đảo / điều chỉnh cho chuyến của nhà xe đã thôi vai, hoặc sau khi đổi công ty chủ (ADR-0043), phải luôn làm được. **Người kiểm soi.**
- `audit-invariants` (lưới thứ hai): `R-VC-COST-1` chuyến xe thuê chưa huỷ có ≤ 1 **nguồn giá** còn hiệu lực (`SNAPSHOT` hoặc `AGREED` chưa đảo); liệt kê chuyến `PLANNED` "thiếu giá" (mức thông tin); `R-VC-COST-5` **chuyến xe thuê đã xuất bến (đang chạy / đã kết thúc) mà không có nguồn giá còn hiệu lực = VI PHẠM (`fail`)**; `R-VC-COST-2` đảo khớp gốc; `R-VC-COST-3` không chuyến nào của công ty chủ có dòng chi phí.

**C9. Route:** chụp / đảo tự động **không** có route riêng — nằm trong lô của lệnh chuyến (ADR-0049) qua câu lệnh chưa chạy của cùng module; `GET /api/van-chuyen/chuyen/:id/chi-phi` (`cost.view`); `POST …/chi-phi/dieu-chinh` (`cost.adjust`, lý do, khoá lạc quan); `POST …/chi-phi/chup-lai` và `POST …/chi-phi/gia-thoa-thuan` (`cost.adjust`; chỉ chuyến `PLANNED` — C5); `GET /api/van-chuyen/chi-phi?tu=&den=&nha-xe=&trang-thai=` — **bảng kê** (hình chiếu đọc, không phải sổ). Khoá chống ghi chồng của "chụp lại" / "điều chỉnh" sau khi chuyến đã kết thúc (không đổi được `vc_trip.last_cmd_id` vì `vc_trip_final_frozen`) — **kế hoạch chốt, người kiểm soi**.

**C10. Nhật ký (5.12):** mỗi lần chụp / đảo / điều chỉnh / thêm-đóng giá → một dòng `audit_log` cùng lô: mã chuyến, id nhà xe, số tiền trước→sau, mã lý do; không tên/SĐT khách.

**C11. Hạch toán (khái niệm):** chưa ghi sổ. Chi phí chuyến đã kết thúc là **chi phí dịch vụ mua ngoài** Tour Đảo đã chịu, chưa vào sổ công nợ; bảng kê cho Kế toán thấy "đang có bao nhiêu phải trả nhà xe chưa vào sổ".

**C12. Sổ vàng (5.17):** tệp `golden/van-chuyen-chi-phi.json` (tên đề xuất) — ba bậc giá + không có giá + ranh ngày hiệu lực; chụp, đổi nhà xe/tuyến trước xuất bến, huỷ, điều chỉnh, đảo, **giá thoả thuận trước (`AGREED`)**, **đổi tuyến khi nguồn là `AGREED` → thiếu giá**, **lô huỷ/đổi đảo âm trước – dương sau** (có điều chỉnh âm và dương) — mọi ca `cho_xac_nhan` tới khi **chủ hoặc Kế toán** xác nhận; thêm vào `FILES` của `src/so-vang.test.ts:13 @main`. Mã tiền chỉ được nhận khi qua 100% ca **đã xác nhận**. **5.15:** chỉ mã tất định tính; AI không đặt số.

### T3. Dòng nợ của sổ công nợ gắn được với chuyến — sửa ADR-0026 (Q10 "Đồng ý")

**D1. Hình dạng `bil_debt_line`** (kế hoạch sổ tiền §3.2, migration B):
- `order_id` **trống được** (vẫn khoá ngoại `NO ACTION` tới `orders`);
- thêm `trip_id TEXT NULL` — **không khoá ngoại, không khai `logicalRefs`** ở lượt này; sổ dữ liệu (`docs/data-dictionary.json`) ghi rõ đây là **cột dự trữ** cho nợ nhà xe (ADR-0057 T3), lượt 1 luôn trống;
- **`CHECK ((order_id IS NULL) <> (trip_id IS NULL))` — đúng một nguồn**, đặt **ngay trong migration B** của sổ tiền. Lý do: bất biến của dòng tiền được khoá bằng khai báo (ADR-0003 điều 3; Hiến chương 5.1), và `CHECK` **không thêm được bằng `ALTER` về sau** — để tới D3 thì phải dựng lại bảng chỉ-thêm;
- `CHECK (trip_id IS NULL OR (order_service_id IS NULL AND receipt_id IS NULL))`;
- trigger lượt 1 `bil_debt_line_trip_not_yet` (`BEFORE INSERT … WHEN NEW.trip_id IS NOT NULL` → `RAISE`) — chặn dòng chỉ-có-chuyến, nên **lượt 1 mọi dòng vẫn có đơn**; ADR phần "nợ nhà xe vào sổ" (D3 cũ) **chỉ bỏ trigger này** bằng migration mới, không đổi `CHECK`.
- Loại dòng *chi phí vận chuyển*, loại phiếu *chốt chi phí vận chuyển* **chưa thêm** (bảng tra cứu, tập mở — thêm ở D3).

**D2. Vì sao không có khoá ngoại `trip_id → vc_trip`:**
- Khoá ngoại đó là phụ thuộc tầng SQL `billing → van-chuyen`. Bài `src/architecture.test.ts:259-277 @49` đòi cạnh trong `ALLOWED_EDGES` (bị bài siết `:735` "KHÔNG module nào import van-chuyen" chặn) hoặc khai `integrityEdges`.
- Dù khai cách nào, nó **đặt sẵn đáp án Q12 = (B)** (`billing → van-chuyen`); nếu chủ chọn Q12 = (A) (`van-chuyen → billing`) thì thành **vòng ở tầng SQL** — trái 5.3.
- Chủ đã hoãn Q12 ⇒ lượt này giữ hình dạng **trung lập**: cột có sẵn, chưa ai ghi; toàn vẹn "trỏ chuyến có thật" và view số dư theo chuyến chốt ở D3 theo Q12.

**D3. Không đổi ở sổ tiền lượt 1:** luật sinh dòng (ADR-0026 điều 4), ô quyền (điều 10), "Sổ của tôi" (điều 7), bất biến `R-BIL-*` lượt 1 (mọi dòng có đơn). `v_bil_party_balance (party_id, counterparty_id, order_id, balance)` (kế hoạch §3.2) giữ nguyên; **cách view thể hiện dòng theo chuyến chốt ở D3**. Test migration B thêm: dòng chỉ có `trip_id` → trigger chặn; dòng có cả hai **hoặc không có nguồn nào** → `CHECK` chặn.

### T4. Để sau — nói rõ cái gì thuộc ADR này, cái gì chưa

| Mục ở [CŨ] | Thuộc ADR này? | Ghi chú |
|---|---|---|
| D1 bảng giá | **Có** — T1 | |
| D2 chi phí chuyến | **Có** — T2 | |
| D3 nợ nhà xe vào sổ, trả nhà xe, trả dư | **Không** — ADR sau | cần sổ tiền lượt 1 đã thi công |
| Q10 sửa ADR-0026 | **Có** — T3 | trước Task 3 |
| Q11 trả dư cho nhà xe (áp tinh thần 5.9) | **Không** | chủ: "lúc trình sổ công nợ" |
| Q12 mốc ghi nợ (kết thúc chuyến / Kế toán chốt) — quyết cạnh `billing ↔ van-chuyen` | **Không** | cửa một chiều; T3 giữ trung lập |
| LCY-1, LCY-2 | **Bỏ** | view đã có (bảng đối chiếu) |
| Q6 a "Cho chạy, hiện 'thiếu giá'"; Q-T3 "giá ghi tay" | **Thay** bởi lần 18 | chặn xuất bến; `AGREED` trước xuất bến; bỏ `GIA_GHI_TAY` |
| Sửa ADR-0040 D1 "Không module nào import `van-chuyen`" | **Không** — T1/T2/T3 không cần cạnh mới | chỉ đổi nếu Q12 = (B) |
| Sửa ADR-0004 phạm vi | **Một phần** — thêm "ghi nhận giá thuê và chi phí xe thuê" (T1/T2) | "phải trả nhà xe trong sổ" ở D3 |
| Ràng buộc X3 cho D5 (lượt 2 sổ) | **Có** — ghi thành câu ràng buộc | dịch vụ đưa đón do Tour Đảo điều xe không có giá vốn a% |
| Dấu "đã chốt vào sổ" của chi phí | **Không** — D3 | phải là bảng/dòng riêng của `vc_`, **không** là cột trên `vc_trip` (`vc_trip_final_frozen` cấm sửa chuyến đã kết thúc) |
| Phân bổ chi phí vào đơn / lãi từng đơn; chi phí xe công ty; giá theo giờ/km; nhà xe tự xem sổ | **Không** | Q8, Q9 |

---

## Sửa câu nào của ADR-0026 (accepted 29/9 — chỉ đổi bằng ADR mới trỏ về nó)

| Chỗ | Nguyên văn | Sau ADR-0057 |
|---|---|---|
| Điều 3, dòng "Mỗi dòng" (`docs/adr/ADR-0026-*.md:63`) | "… **loại** (…) — đơn, dòng dịch vụ (nếu có), lần thu (nếu có)." | "… **loại** (…) — **nguồn: đơn hoặc chuyến xe, không bao giờ cả hai**; dòng dịch vụ và lần thu (nếu có) chỉ khi nguồn là đơn. **đúng một nguồn** (`CHECK`); **lượt 1 mọi dòng có đơn** (trigger giữ); dòng nguồn chuyến chỉ mở khi ADR 'nợ nhà xe vào sổ' được duyệt (ADR-0057 T3)." |
| Điều 5 (`:72`) | "… ngược chiều, **phân bổ theo đơn** (Kế toán chọn đơn; một lần nộp nhiều đơn = nhiều dòng trong một phiếu)." | "… ngược chiều, **phân bổ theo đơn — hoặc theo chuyến khi trả nhà xe (từ ADR 'nợ nhà xe vào sổ')** (…)." |
| Kế hoạch sổ tiền §3.2, hàng `bil_debt_line` (tài liệu kế hoạch, không phải ADR) | "`order_id`, `order_service_id` NULL, `receipt_id` NULL, …" | "`order_id` **NULL**, **`trip_id` NULL (không khoá ngoại, cột dự trữ)**, …; `CHECK ((order_id IS NULL) <> (trip_id IS NULL))`; trigger `bil_debt_line_trip_not_yet`" — người lập kế hoạch sổ tiền sửa **sau khi chủ duyệt** |

## Câu ADR khác bị thay (nguyên văn → mới)

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0024 điều 1, `pricing` (`:44`) | "Sở hữu **chính sách có hiệu lực theo ngày**: nhóm đối tác, loại dịch vụ, quy tắc chiết khấu/hoa hồng, điều khoản cung ứng (người bán, nhà cung cấp, a%)." | "… điều khoản cung ứng (người bán, nhà cung cấp, a%) — **trừ giá thuê xe theo chuyến của nhà xe, thuộc `van-chuyen` (ADR-0057 T1; chủ chọn Tiền Q2 a)**. **Ràng buộc cho D5:** dòng dịch vụ đưa đón mà chuyến do Tour Đảo điều (xe công ty hoặc xe thuê) **không** mang giá vốn a%; tiền xe là chi phí chuyến (Tiền Q9 a)." |
| ADR-0004 "Được làm (ghi nhận)" (`:13`; đã được ADR-0026 mở phần công nợ) | "(a) sổ thu tiền …; (b) yêu cầu xuất hoá đơn …; (c) vai Kế toán …" | thêm "**(d) giá thuê xe theo chuyến của nhà xe và chi phí xe thuê theo chuyến (giá vốn), không gồm chi phí xe của công ty** (ADR-0057)". "Vẫn KHÔNG làm" giữ như ADR-0026 đã sửa |
| ADR-0049 D1, bảng `vc_trip` (`:82`) | "`code`, `vehicle_id`, `carrier_party_id` (chủ xe chụp lúc xếp), …" | thêm `route_code` (tuyến, trống được, đổi được khi `PLANNED`) |
| ADR-0049 D2, cổng xuất bến (`docs/adr/ADR-0049-*.md:173-179`) | danh sách kiểm (sàn cứng; điều kiện giấy tờ; đủ tên; …; nghỉ đủ) | thêm: "**chuyến xe thuê có nguồn giá** (giá bảng đã chụp hoặc giá thoả thuận trước) — không ai phá lệ (ADR-0057, chủ lần 18)" |
| ADR-0049 D3 danh sách trường tài xế — "Không bao giờ: tiền, …" | — | **không đổi** (nhắc để người kiểm đối chiếu) |
| ADR-0047 A1 "chặng không mang tiền" | — | **không đổi** — chi phí gắn chuyến, không gắn chặng |
| ADR-0040 thiết kế kèm §6 "Để sau: danh mục loại xe" | loại xe để sau | theo Q-T1: (a) → "không làm danh mục loại xe; giá dùng cỡ xe suy từ số chỗ"; (b) → "làm ở ADR-0057" |

## Lệch có chủ ý khỏi Hiến chương (chỉ hợp lệ khi chủ duyệt — khuôn ADR-0029)

| Mã | Điều | Lệch | Vì sao | Hạn / điều kiện gỡ |
|---|---|---|---|---|
| **L-T1** | 5.14 vế "khoá kỳ" | Dòng chi phí chuyến có ngày phát sinh ngay, **chưa có kỳ / khoá kỳ** | Kỳ suy được từ ngày phát sinh, thêm sau không mất dữ liệu; cùng lý do chủ đã duyệt cho sổ (ADR-0026 bổ sung 5.14) | Cùng hạn với lệch khoá kỳ của ADR-0026: **khoá kỳ có trong cùng bản phát hành với lượt 2 sổ**; khi đó áp cho cả dòng chi phí chuyến |

LCY-1, LCY-2 của [CŨ]: **không còn** (đủ hai lớp).

## Cửa một chiều / hai chiều

- **Một chiều:** bảng giá ở `vc_` (Q2 a); `vc_rental_rate`, `vc_trip_cost_line` chỉ-thêm; mốc chụp; hình dạng `bil_debt_line` sau Task 3.
- **Hai chiều:** bốn ô quyền; danh mục tuyến / cỡ xe; lý do; thứ tự ưu tiên giá (mã + test); trigger `bil_debt_line_trip_not_yet` (bỏ bằng migration mới).

## Hệ quả

- **Việc lớn** (dữ liệu + tiền + quyền) ⇒ người kiểm độc lập chỉ-đọc cho từng lát; T3 đi cùng người kiểm của sổ tiền Task 3.
- **Lát:** T3 (trong migration B sổ tiền) → T1 (bảng giá, không cần chuyến) → T2 (sau khi ADR-0049 lượt 1 gộp `main`). Vì bài "mỗi ô được máy chủ hỏi" và kế hoạch sổ tiền cấm mục hoãn tạm: `transport.rate.*` vào `MATRIX` **cùng bản phát hành T1**, `transport.cost.*` **chỉ vào ở bản phát hành T2**.
- **Khi chủ duyệt:** điều phối thêm chỉ dẫn vào dòng Trạng thái của ADR-0026 ("điều 3, điều 5 bị sửa bởi ADR-0057 T3") và ADR-0024 ("điều 1 bị sửa bởi ADR-0057") — tiền lệ dòng Trạng thái ADR-0024 trỏ ADR-0043; người lập kế hoạch sổ tiền sửa §3.2 **trước** khi Task 3 bắt đầu. **Tới lúc T3 được quyết, phiên sổ tiền giữ Task 3.**
- **Tác động chéo (lần 18):**
  - **ADR-0052 tạm (xe cứu hộ):** chuyến cứu hộ bằng xe nhà xe phải có giá bảng hoặc giá thoả thuận **trước** xuất bến — không ngoại lệ, không phá lệ; quy trình cứu hộ cần bước nhập giá thoả thuận (hoặc dùng xe công ty).
  - **ADR-0053 tạm (Nhận / Từ chối):** Từ chối → giao lại → lô đổi đảo nguồn giá cũ, chụp lại giá bảng; giá thoả thuận cũ phải nhập lại.
  - **ADR-0049 D2:** chuyến xe thuê xếp sát giờ mà chưa có giá bị giữ `THIEU_GIA` tới khi Quản trị / Kế toán nhập giá — không có đường phá lệ như mốc 6 giờ.
- **Hàng rào mới** (mỗi cái một dòng `docs/SO-HANG-RAO.md` + ngày thấy chặn thật, P16):
  1. **bài số lạ**: gieo `480.017` vào một dòng giá và một dòng chi phí; gọi **mọi** route GET mà `SALES`, `FIELD`, `PARTNER`, `INTERN`, `DRIVER`, `DRIVER_PARTNER` vào được (chi tiết đơn, hàng chờ, biên nhận, việc của tôi, **lịch chung, chi tiết chuyến**, cuốc xe tài xế) → không thấy `480017`; phải thấy đỏ một lần khi thêm tạm trường chi phí vào DTO lịch chung;
  2. bài ghim hàng `DRIVER`, `DRIVER_PARTNER` vẫn xanh; bốn ô mới = `none` ở hai cột đó; bài ghim **ADMIN = ACCOUNTING** ở bốn ô `transport.*` (lần 18);
  3. bài "mỗi ô được máy chủ hỏi" — không mục hoãn mới trong `docs/quyen-hoan.json`;
  4. trigger chồng giá; trigger chỉ-thêm (giá, chi phí); trigger vai `CARRIER` lúc thêm giá; trigger `SNAPSHOT` đúng nhà xe / không công ty chủ; **một** trigger "mỗi chuyến tối đa một nguồn giá còn hiệu lực" (đếm chung `SNAPSHOT` + `AGREED` chưa đảo); trigger `AGREED` / đảo nguồn giá chỉ khi `PLANNED`; **trigger `thieu_gia` chặn xuất bến chuyến xe thuê không có nguồn giá** (đỏ một lần: bỏ trigger → câu `UPDATE status='RUNNING'` tay qua được); bài `kiemXuatBen` trả `THIEU_GIA`; trigger tổng ≥ 0 **canh mọi dòng** (mỗi ca đỏ một lần: Kế toán đảo `SNAPSHOT` khi còn điều chỉnh âm; đảo điều chỉnh dương làm tổng âm);
  5. hàng rào một nguồn tính (`tongChiPhiChuyen`);
  6. bài thân trigger `vc_*` (`architecture.test.ts:768 @49`) vẫn xanh — trigger mới chỉ đọc `vc_` + view đã liệt kê;
  7. (T3) test migration B: dòng nợ chỉ có `trip_id` → trigger chặn; cả hai nguồn hoặc không nguồn → `CHECK` chặn;
  8. sổ vàng C12.
- **Tài liệu:** `docs/data-dictionary.json` + `npm run dict`; `docs/SYSTEM-DESIGN.md`; `docs/CHANGE-GUIDE.md`; nhật ký thay đổi lời thường.

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)

1. Ba bậc giá + "không có giá" + ranh ngày (ngày chạy = `valid_from_date`, = `valid_to_date`) — test thuần của `chonDongGiaThue`.
2. Hai dòng giá cùng khoá chồng ngày → route 409 **và** `INSERT` tay bị trigger chặn. Thêm giá cho hồ sơ không mở vai `CARRIER` → chặn hai lớp; **đóng** giá của nhà xe đã thôi vai → được.
3. Tạo chuyến bằng xe nhà xe có giá → đúng một `SNAPSHOT` trong cùng lô; làm hỏng lệnh tạo chuyến → không còn dòng lẻ. Đổi tuyến trước xuất bến → một `REVERSAL` + một `SNAPSHOT` mới. Thêm giá mới cùng ngày sau khi chụp → chi phí **không đổi**.
4. Xe nhà xe không có giá → không dòng `amount = 0`; bấm xuất bến → **giữ** `THIEU_GIA` (máy chủ) **và** `UPDATE status='RUNNING'` tay bị trigger chặn; **kể cả chuyến cứu hộ**; Quản trị gửi phá lệ → không có đường phá lệ. Quản trị thêm giá rồi Kế toán "chụp lại" → có `SNAPSHOT`, xuất bến được. Hoặc Kế toán / Quản trị nhập giá thoả thuận → xuất bến được.
4b. Nhập giá thoả thuận khi đã có `SNAPSHOT` chưa đảo → chặn (một nguồn giá); nhập khi chuyến đã xuất bến → chặn; đảo `SNAPSHOT`/`AGREED` sau xuất bến → chặn. Đổi tuyến trước xuất bến khi nguồn là `AGREED` và tuyến mới không có giá bảng → `AGREED` bị đảo, chuyến thành thiếu giá (bị giữ).
4c. `R-VC-COST-5`: chèn tay một chuyến `RUNNING` không nguồn giá (tắt trigger trong DB thử) → `audit-invariants` thoát 1.
5. Huỷ chuyến trước xuất bến → đảo cùng lô, tổng = 0; **chuyến còn `ADJUSTMENT` âm lúc huỷ → vẫn tổng = 0**, không lỗi giữa lô; Kế toán ghi "phí huỷ muộn" → tổng = số đó.
5b. Kế toán đảo `SNAPSHOT` khi còn `ADJUSTMENT` âm → 409 **và** `INSERT` tay bị trigger chặn. Đổi tuyến trước xuất bến trên chuyến có `SNAPSHOT` + `ADJUSTMENT` âm → lô qua, cuối lô chỉ còn `SNAPSHOT` mới.
6. Chuyến xe công ty → không có dòng chi phí (hai lớp + `R-VC-COST-3`).
7. `ADMIN` điều chỉnh tiền chuyến, nhập giá thoả thuận, nhập bảng giá → **được** (như `ACCOUNTING`); `SALES` gọi `GET …/chi-phi`, bảng giá, giá thoả thuận → 403; `SALES` chọn tuyến khi xếp → được, phản hồi không mang tiền.
8. Mọi dòng chi phí có `occurred_date` (ngày VN, `date(x) = x`) và `created_at` UTC; chuyến qua nửa đêm lấy ngày chạy.
9. Bài số lạ (Hệ quả 1) xanh; `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e`, `audit-invariants --db local` xanh.
10. (T3) Migration B: `bil_debt_line` nhận dòng có đơn như ADR-0026; dòng chỉ có `trip_id` bị trigger chặn; dòng có cả hai hoặc không nguồn nào bị `CHECK` chặn; `R-BIL-*` lượt 1 không đổi kết quả.
11. Đổi tuyến trên chuyến mà nhà xe đã thôi hợp tác → 409 `carrier_inactive` (câu tiếng Việt), không còn dòng đảo lẻ. Đảo một `ADJUSTMENT` âm → dòng đảo dương, được.
12. (Bỏ — ca "giá ghi tay" của Q-T3 không còn, xem C5.)

## Phương án bị loại

- Bảng giá ở `pricing` (Q2 b) — chủ chọn (a).
- Chờ sổ công nợ mới làm giá/chi phí (Q1 b) — chủ đổi sang "Làm trước".
- "Sổ nợ nhà xe" riêng trong Vận chuyển — hai sổ, trái 4.3.
- Khoá ngoại `bil_debt_line.trip_id → vc_trip` ngay bây giờ — đặt sẵn Q12 (D2).
- Để nguyên `bil_debt_line.order_id` bắt buộc, sửa sau — dựng lại bảng chỉ-thêm.
- Ghi 0 khi thiếu giá.
- Cho chạy khi thiếu giá, hiện "thiếu giá" (Q6 a lần 16) — **chủ thay ở lần 18**.
- Phá lệ "thiếu giá" cho xe cứu hộ — chủ: "Vẫn phải nhập giá thoả thuận trước".
- "Giá ghi tay" sau chuyến (`GIA_GHI_TAY`, Q-T3 lần 17) — không còn cần (C5).
- Chia chi phí vào từng đơn ngay (Q9 b).
- Giữ LCY-1, LCY-2 — không còn cơ sở.

## Giả định đã tự đặt (bề mặt, đảo ngược được)

- G-T1: tuyến chưa có điểm đầu/cuối (`loc_location`) ở lượt này — **khác [CŨ] D1** (bản cũ có điểm đầu/cuối tuỳ chọn); lý do: không dựa vào cạnh `van-chuyen → locations` đang chờ chủ duyệt lúc gộp ADR-0049; thêm sau bằng `ADD COLUMN` được. Người kiểm xem có coi là bề mặt không.
- G-T2: tên bảng, cột, ô, route, mã lý do — kế hoạch chốt.
- G-T4: nhãn "thiếu giá" là lý do giữ, hiện cho người xem chuyến, **không kèm số**.
- G-T5: `aiXuLy` của `THIEU_GIA` = Quản trị (tập đóng `AI_XU_LY` không thêm Kế toán); lời nhắn ghi "Quản trị hoặc Kế toán".

## Câu hỏi đã trả lời (lời chủ — không hỏi lại)

| Mã | Chủ chọn | Lần | Ghi chú |
|---|---|---|---|
| Q-T1 | "Theo cỡ xe = số khách" | 17 | T1 B1 |
| Q-T2 | "Sổ tiền trước, duyệt ngay phần nợ gắn chuyến" | 17 | Gấp — T3 trước Task 3 |
| Q-T3 | "Kế toán ghi giá chốt tay" | 17 | **Không còn áp dụng** — hệ quả lần 18 (C5) |
| Q-T4 | "Lúc văn phòng xếp xe của nhà xe" | 17 | C4 |
| Q-T5 | "Người xếp xe" | 17 | C2 |
| Q-T6 | "Giữ giá đã chụp, Kế toán chỉnh tay" | 17 | nay Quản trị cũng chỉnh được (lần 18) |
| Q-T7 | "Có, chỉ xem" | 17 | **Thay** bởi lần 18: Quản trị = Kế toán ở mọi ô |
| Q-T8 | "Duyệt, cùng hạn sổ công nợ" | 17 | L-T1 |
| Lần 18 — điểm 3 | "Chưa có giá thì không được chạy…" | 18 | **Thay Q6 a** — C5 |
| Lần 18 — điểm 5 | "Quản trị có quyền ngang kế toán" → "Hai vai giống hệt" | 18 | **Thay một phần Q5 a** — B3, C7 |
| Lần 18 — ai nhập giá thoả thuận | "Quản trị, Kế toán, Toàn quyền" | 18 | `transport.cost.adjust` |
| Lần 18 — xe cứu hộ chưa có giá | "Vẫn phải nhập giá thoả thuận trước" | 18 | không ngoại lệ, không phá lệ |

**Câu còn mở cho chủ: không có.** Câu duyệt: "Duyệt ADR-0057 (tiền xe thuê, bản sửa theo lần 18) theo các lựa chọn trên?" — sau khi người kiểm báo đạt.

## Chưa kiểm

- Chưa chạy test (vai lập kế hoạch). Dòng mã `@49` đo trên `1f8b498`; đo lại sau khi ADR-0049 gộp `main`.
- Chưa kiểm `EXPLAIN` thấy thân trigger mới đọc đúng view (bài `:768` hiện quét chữ trong thân trigger — thoả nếu chỉ nhắc `vc_` và view đã liệt kê).
- `parties/index.ts:103 @49` có `nhaXeDangHopTac(db)` (danh sách nhà xe đang hợp tác); chưa kiểm có hàm hỏi **một** hồ sơ hay phải thêm — kế hoạch chốt.
- Trạng thái remote của `0034`, `0040`–`0043`: theo kiểm của điều phối ở lần 15, người soạn không tự chạy lệnh.
- Bản nguồn tiền cũ và tệp này **chưa có người kiểm độc lập**.
