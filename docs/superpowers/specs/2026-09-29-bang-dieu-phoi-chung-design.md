# Bảng điều phối chung của phân hệ Vận chuyển — bản thiết kế

- **Ngày:** 2026-09-29. **Vai:** kiến trúc sư thiết kế (lập kế hoạch). Chỉ soạn tài liệu, không viết mã, không tự duyệt (Hiến pháp N3, P15).
- **Trạng thái:** **BẢN THIẾT KẾ — CHƯA DUYỆT.** Người kiểm độc lập: CÓ ĐIỀU KIỆN (4 lỗi CAO) → đã sửa, kiểm lại **ĐẠT** (29/9). Chủ đã trả lời ĐP2, ĐP3, ĐP6, ĐP7, ĐP8 (29/9, [HĐ] "Trả lời lần 2") và ĐP2(v) ([HĐ] "Trả lời lần 4") — đã áp. **Chủ đã duyệt lượt 1 (D1–D3) → ADR-0049** ("Duyệt, ghi theo câu 1", 29/9); chờ người kiểm xem bản cuối rồi điều phối chép sang `docs/adr/`. **Lượt duyệt 1 (D1–D3) đã soạn thành đề xuất ADR-0049:** `docs/superpowers/specs/2026-09-29-de-xuat-adr-bang-dieu-phoi-luot-1.md`; màn cần vẽ: `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-luot-1-man-hinh-can-ve.md`. Mọi tên bảng, tên ô, tên route là **tên đề xuất**; kế hoạch thi công chốt tên.
- **Thay thế:** lượt duyệt 2 (B1, B2, B3) của `docs/superpowers/specs/2026-09-28-de-xuat-adr-van-chuyen-1b.md` (chưa duyệt). Những gì B1–B3 đã nghĩ đúng được giữ và ghi rõ ở từng chỗ; chỗ đổi có lý do.
- **Ghép với:** lượt duyệt II (D3 Từ chối, D4 Báo bận, D5 Thông báo) của `docs/superpowers/specs/2026-09-28-de-xuat-adr-van-chuyen-luot-2.md` (chưa duyệt) — xếp vào lượt duyệt 2 và 3 của bản này (§6.4), không soạn lại từ đầu. Lượt 3 (tiền: `…-luot-3.md`) chỉ được để sẵn chỗ gắn.
- **Căn cứ chính:** lời chủ nguyên văn ở `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` (gọi tắt **[HĐ]**, số mục theo tệp đó).
- **Nguồn đã đọc (chỉ đọc):**
  - `CLAUDE.md` §3, §8, §9; `docs/ARCHITECTURE.md` Phần I (1.2, 1.4, 2.1, 2.2, K9, K16, 4.1, 4.4, 5.1–5.17) và Phần II (tầng, luật dữ liệu, nơi đặt mã);
  - ADR-0006, ADR-0022, ADR-0034, ADR-0036, ADR-0040, ADR-0047, ADR-0048 (đọc trọn); ADR-0046 (qua ADR-0036 dòng trạng thái);
  - đề xuất 1b, lượt 2, lượt 3 (2026-09-28); thiết kế `2026-09-27-van-chuyen-design.md` và rà soát `…-ra-soat.md` §6;
  - mã tại nhánh này (gốc `origin/main` `ce831f8` + gộp `adr-van-chuyen-0047-0048`): `src/index.ts`, `src/modules/van-chuyen/index.ts`, `src/modules/bangtin/{index,tram}.ts`, `src/shared/bang-tin.ts`, `src/shared/permissions.ts`, `src/shared/contracts.ts` (`StaffProfile.partyId`), `src/architecture.test.ts` (`ALLOWED_EDGES`, `TABLE_PREFIX`), `migrations/0006_catalog.sql`, `wrangler.jsonc` (Cron `*/15`, Durable Object `BangTin`).
- **Không xây trên lỗ an ninh đang hở:** `docs/quyen-hoan.json` mục `phat_hien` **rỗng** (kiểm 2026-09-29 trên nhánh này). Mục `thao_tac` còn 6 ô hoãn (`task.progress`, `dispatch.guides.view`, `payment.*`, `invoice.*`); bản này **không** dùng ô nào trong đó (không dùng lại `task.progress` — lý do như 1b §3.3).
- **Xây trên nền chưa có (Hiến chương 5.13):** ADR-0047 (chặng, hành khách, `soKhachHieuLuc`, view khoá + cờ, tiền tố `ord_`) và ADR-0048 (nhà xe, `DRIVER_PARTNER`) **đã duyệt nhưng chưa thi công**. Mọi lát của bản này đứng sau lát nền đó (§8).

---

## 0. Đọc nhanh cho chủ (lời thường)

- **Lịch chung không phải một sổ riêng.** Nó là "tấm gương" dựng lại mỗi lần mở, từ giờ đón trên đơn (đúng lời chủ: giờ đón trên biểu mẫu chính là giờ trên lịch chung). Không chép giờ sang chỗ khác nên không bao giờ lệch.
- **Bộ điều phối chung** là một phần của phân hệ Vận chuyển, chạy ngay trong app hiện có. Nó có ba việc: (1) màn hình cho người xếp xe, tài xế, kế toán; (2) một bộ luật viết sẵn, kiểm mọi thay đổi; (3) màn "dòng dữ liệu" cho thấy mỗi chặng đang ở bước nào.
- **Mỗi khách là một "suất" trên đúng một xe tại mỗi thời điểm.** Chuyển khách sang xe khác = đóng suất cũ, mở suất mới, ghi ai làm, lúc nào, vì sao. Không xoá, không ghi đè.
- **Chuyển điểm đón giữa hai xe đang chạy** (ví dụ Alibu sang xe A, Mường Thanh sang xe B): tài xế A đề nghị → tài xế B bấm Nhận → máy kiểm luật → đạt thì **máy tự xác nhận**, ghi rõ "máy xác nhận theo luật nào". Không đạt thì báo lý do và chuyển văn phòng xem.
- **Văn phòng khi xe đang chạy** chỉ **thêm** điểm đón, hoặc **báo huỷ** một điểm (tài xế vẫn tới, ghi "khách đã huỷ").
- **Mốc 6 giờ** áp cả lúc đặt đơn và lúc xếp xe; chặn, có phá lệ kèm lý do. Con số 6 giờ là cài đặt có ngày hiệu lực, đổi được.
- **Máy không bao giờ tự gọi hay nhắn khách.** Đổi giờ thì máy nhắc người phụ trách đơn và tài xế gọi.
- **Bạn cần:** đọc từng phần, trả lời các câu ở Phần 7 (mỗi câu có khuyến nghị), rồi duyệt **bốn lượt**, mỗi lượt tối đa 3 quyết định (§6.4); lượt 4 (chiều về) độc lập, trình lúc nào cũng được.

### 0.1 Điều chủ đã quyết — áp dụng, không hỏi lại

| # | Quyết định | Nguồn | Áp ở |
|---|---|---|---|
| C1 | Xếp xe: Bán hàng + Quản trị + Toàn quyền; Kế toán chỉ xem; HDV, Đối tác không thấy lịch xe | [HĐ] Q1 | §6.1 |
| C2 | Tài xế tự bấm Xuất bến / Đã đón / Khách vắng / Kết thúc; giờ theo máy chủ; văn phòng bấm thay được, ghi ai bấm | [HĐ] Q2 | §2.1 LC-11, §6.1 |
| C3 | Tài xế thấy SĐT người liên hệ **chỉ trong ngày chạy**, chỉ đơn có khách trên chuyến mình | [HĐ] Q3 | §6.3 |
| C4 | Chuyến thật: đón **nhiều khách sạn → nhiều điểm đến**; lịch và điểm đón đổi được **trước và trong lúc chạy** | [HĐ] mục 1, 2 | Phần 1, §5 |
| C5 | Chiều về khai **theo từng dịch vụ trong danh mục** (không đưa đón / một chiều / hai chiều); lập đơn tự tạo đúng số chặng, sửa tay được | [HĐ] mục 3 | D10 (§6.4), ĐP10 |
| C6 | Xếp xe bất cứ lúc nào, tối thiểu 6 giờ trước giờ khởi hành; **chặn, có ngoại lệ** (người có quyền phá lệ kèm lý do); áp **cả hai** lúc đặt và lúc xếp; luật "ghép điều kiện chung" với tour/dịch vụ | [HĐ] mục 4, 5 | §2.2 CH-01, §2.4 |
| C7 | Giờ đón trên biểu mẫu = giờ đón gán cho lịch chung; có **một bộ điều phối chung** xếp xe từ lịch chung | [HĐ] mục 5 | §1.3 |
| C8 | Bộ điều phối vừa là bảng điều khiển, vừa là nơi tính toán logic, vừa trực quan hoá dòng dữ liệu | [HĐ] mục 6 | Phần 3, 4 |
| C9 | Chuyển điểm đón khi xe đang chạy: **văn phòng chỉ thêm điểm đón; tài xế đề nghị với nhau**; B nhận → điều phối **tự xác nhận** | [HĐ] mục 7 | §1.8, §2.3 MQ-02 |
| C10 | Văn phòng bớt/huỷ điểm đón khi xe đang chạy: được, kèm lý do; **mặc định tài xế vẫn hoàn thành điểm đó** | [HĐ] mục 8 | §2.1 LC-15 |
| C11 | **Không** tự báo khách khi đổi giờ; hệ thống ghi giờ mới, nhắc người phụ trách / tài xế gọi | [HĐ] mục 9 | §2.1 LC-17, §2.3 MQ-07 |
| C12 | Ba tầng: lõi cố định / cấu hình có ngày hiệu lực / máy tự quyết theo luật (người quyết cuối, trừ luồng tự xác nhận) | [HĐ] cuối tệp | Phần 2 |
| C13 | Một khái niệm "chặng" cho vận chuyển độc lập và vận chuyển là thành phần | ADR-0047 A1 | §1.2 |
| C14 | Xe và tài xế có hồ sơ riêng; xe là tài sản của công ty **hoặc** nhà xe; không chéo xe–tài xế | ADR-0048 | §2.1 LC-13 |
| C15 | Đủ tên cho số khách đã đặt **lúc xuất bến**; tài xế sửa/bổ sung lúc đón; **phân bổ từng người**; giấy tờ không sửa đè; đủ điều kiện lái xét bằng giấy tờ | rà soát §6 (điều phối ghi, chủ không phản đối) | §1.5, §2.1 |
| C16 | Chặng có ngày + giờ hẹn riêng; chặng thay hẳn hai ô đón cũ | ADR-0047 A1, Q4 | §1.3 |
| C17 | Mốc 6 giờ: lúc xếp tính tới **giờ xuất bến** của chuyến; chặng đã đặt gấp thì lúc xếp **không** ghi lý do lần nữa; trong 6 giờ chỉ khoá "ai đi xe nào", đổi xe, đổi tài xế; **kiểm lại lúc xác nhận đơn** và khi **sửa nơi đón/nơi trả** | ĐP2, "Theo 4 khuyến nghị" (29/9) | CH-01, MQ-10, §2.4 |
| C18 | **Chỉ Quản trị, Toàn quyền** được phá lệ mốc 6 giờ và khoảng nghỉ, ở **cả** lúc đặt lẫn lúc xếp | ĐP3 (29/9) | §2.4, §5.2, §6.1 |
| C19 | Người xếp xe **không** đổi giờ hẹn khách trên đơn người khác; máy nhắc người phụ trách | ĐP6 (29/9) | §5.4 |
| C20 | Hợp đồng vận chuyển để lượt riêng (công tắc khoá ở tắt); mỗi thao tác kiểm và ghi ngay, đụng nhau thì tải lại (PA-1) | ĐP7, ĐP8 (29/9) | CH-04, Phần 3 |
| C21 | Ngày đón của chặng trong khoảng **[ngày đi − 1, ngày đi + 7]**; đơn nháp chỉ giữ **bản cuối** (lưu nháp xoá–chèn lại chặng, hành khách) | [HĐ] "Trả lời lần 3" (29/9) — con số điền cho câu "khoảng cho phép (luật đổi được, ở mã — Phần II)" mà ADR-0047 để cho mã, **không** phải câu ADR bị thay; "đơn nháp chỉ giữ bản cuối" cùng mục | §1.3 |
| C22 | Đơn nháp **lưu được** chặng đã dưới mốc 6 giờ ngay từ lúc gõ (có cảnh báo); chặn ở **Xác nhận** tới khi Quản trị / Toàn quyền đặt gấp | ĐP2(v), chủ trả lời 29/9 ([HĐ] "Trả lời lần 4"): "Cho lưu nháp, chặn ở Xác nhận". Chủ đã được nói rõ cách này lỏng hơn câu "áp cả lúc khách đặt (biểu mẫu)" ngày 28/9 và vẫn chọn | CH-01, §5.2 |

### 0.2 Bản này đứng ở đâu

```
ADR-0047 (chặng, hành khách — orders)   ADR-0048 (nhà xe, tài xế đối tác — parties/staff)
            │  đã duyệt, chưa thi công              │  đã duyệt, chưa thi công
            └──────────────┬────────────────────────┘
                           ▼
        BẢN NÀY: Bảng điều phối chung (van-chuyen)
          Lượt duyệt 1: D1 mô hình · D2 luật + chính sách + mốc 6 giờ · D3 quyền + route
          Lượt duyệt 2: D4 chuyển điểm tự xác nhận · D5 thay đổi khi xe đang chạy · D6 thông báo + Bảng tin
          Lượt duyệt 3: D7 tài xế đối tác trên chuyến · D8 Từ chối chuyến · D9 Báo bận
          Lượt duyệt 4: D10 chiều về theo dịch vụ (độc lập)
                           │
                           ▼
        Lượt 3 cũ (tiền: giá thuê, chi phí, công nợ nhà xe) — chỉ để sẵn chỗ gắn
```

---

## Phần 1 — Mô hình khái niệm (Oracle, Hiến chương 2 và 4)

### 1.1 Chuỗi sáu tầng: từ nhu cầu tới sự kiện

```
 SỰ THẬT (bảng, có chủ)                          HÌNH CHIẾU (dựng lại khi đọc, không lưu)
 ─────────────────────────                       ─────────────────────────────────────────
 [1] NHU CẦU  = chặng đưa đón (orders)  ───────►  [2] LỊCH CHUNG ngày D
     ord_transfer_leg + ord_passenger             = chặng mở của đơn đã xác nhận
     "hẹn khách: ngày, giờ, nơi đón, nơi trả"       + trạng thái xếp (đọc từ [3][4])
            │                                        + cảnh báo, "giữ", mốc 6 giờ
            │ người xếp xe / máy gợi ý                      │
            ▼                                               │
 [3] CHUYẾN (van-chuyen) — kế hoạch + thực thi              │
     vc_trip (xe, giờ dự kiến, trạng thái)                  │
     vc_trip_driver (ai lái, có hiệu lực)                   │
     vc_trip_stop  (điểm dừng, thứ tự, giờ xe tới)          │
     vc_trip_allocation (SUẤT: mỗi người trên đúng          │
        một chuyến tại mỗi lúc, có hiệu lực)                │
            │                                               │
            │ lệnh của tài xế / văn phòng / máy             ▼
            ▼                                   [6] DÒNG DỮ LIỆU: trạng thái từng chặng
 [4] SỰ KIỆN (chỉ-thêm)                            (Chưa xếp → Đã xếp → Xuất bến → Đã đón
     vc_trip_event (nối 1-1 audit_log)              → Đã trả → Xong; nhánh Vắng, Khách huỷ,
     vc_transfer_request + vc_transfer_check        Đang chuyển, Giữ)
     bản chụp xuất bến (vc_trip_departure_check,  [7] BẢNG ĐIỀU KHIỂN, thông báo, Bảng tin
       vc_trip_manifest)
            │
 [5] CHÍNH SÁCH (dòng có ngày hiệu lực) — vc_dispatch_policy, vc_departure_rule,
     vc_license_capacity, vc_reason  → được CHỤP vào quyết định tại mốc (5.6)
```

- Chiều mũi tên là chiều **đọc**. Không hình chiếu nào ghi ngược vào sự thật (Hiến chương 1.4: hình chiếu không bao giờ là nơi tạo ra sự thật).
- "Kế hoạch" (bản xếp) **không** là bảng riêng: nó là trạng thái "đang lên kế hoạch" của chuyến + các suất đang mở (§1.4).

### 1.2 Phân loại từng khái niệm (Hiến chương 2.2)

| Khái niệm | Loại | Sự thật hay hình chiếu | Module chủ | Ở đâu |
|---|---|---|---|---|
| Chặng đưa đón (hẹn với khách) | Thực thể | **Sự thật** "hẹn khách" | `orders` | `ord_transfer_leg` (ADR-0047) |
| Hành khách của đơn | Thực thể nhẹ | **Sự thật** "ai là ai" | `orders` | `ord_passenger` (ADR-0047) |
| Số khách hiệu lực | Luật tính | Hình chiếu (một hàm) | `orders` | `soKhachHieuLuc` (ADR-0047 A3) |
| **Lịch chung** ngày D | — | **Hình chiếu** | `van-chuyen` (dựng) | hàm `lichChung(db, ngay)` + hàm hẹp của `orders` (§1.3) |
| Chuyến | Thực thể có vòng đời | Sự thật kế hoạch + thực thi | `van-chuyen` | `vc_trip` |
| Ai lái chuyến | Vai theo ngữ cảnh (có hiệu lực) | Sự thật | `van-chuyen` | `vc_trip_driver` |
| Điểm dừng | Thực thể con của chuyến | Sự thật kế hoạch + thời điểm thật | `van-chuyen` | `vc_trip_stop` |
| Suất (một người trên một chuyến) | Vai theo ngữ cảnh, có hiệu lực | Sự thật "ai trên xe nào, lúc nào" | `van-chuyen` | `vc_trip_allocation` |
| Sự kiện chuyến (xuất bến, đã đón, vắng…) | Lệnh → sự kiện | Sự thật chỉ-thêm | `van-chuyen` + `audit` | `vc_trip_event` nối 1-1 `audit_log` |
| Đề nghị chuyển điểm đón | Thực thể có vòng đời | Sự thật | `van-chuyen` | `vc_transfer_request` |
| Kết quả kiểm luật của một quyết định | Bản chụp | Sự thật chỉ-thêm (bằng chứng) | `van-chuyen` | `vc_transfer_check`, `vc_trip_departure_check` |
| Mốc tối thiểu, khoảng nghỉ, thời gian chờ nhận, công tắc | Chính sách | Sự thật có ngày hiệu lực | `van-chuyen` | `vc_dispatch_policy` |
| Điều kiện xuất bến; hạng bằng ↔ số khách | Chính sách | như trên | `van-chuyen` | `vc_departure_rule`, `vc_license_capacity` (từ 1b B2) |
| Danh mục lý do (đổi giờ xe, báo huỷ, phá lệ, kết thúc gián đoạn…) | Dữ liệu tra cứu sửa được | Sự thật | `van-chuyen` | `vc_reason` |
| Luật sức chứa, trùng giờ, gợi ý xếp, kiểm chuyển điểm, "giữ" | Luật tính | — | `src/shared/` (dùng chung máy chủ + màn hình) | hàm thuần có test (§3.1) |
| Trạng thái một chặng trên dòng dữ liệu | Luật tính | Hình chiếu | `src/shared/` | `trangThaiChang(...)` (§2.5) |
| Mẫu chặng của dịch vụ (không / một / hai chiều) | Chính sách | Sự thật có ngày hiệu lực | `catalog` | chờ ĐP10 (§6.4 D10) |

### 1.3 Lịch chung là hình chiếu, không phải bảng

**Vì sao không lập bảng "lịch chung":**
- ADR-0006 điều 5 và ADR-0047 A1 (đã duyệt): "hai giờ, hai chỗ, **không chép qua lại**". Một bảng lịch chung sẽ chép giờ hẹn của chặng — hai chỗ cùng một giờ, sẽ lệch (N7, Hiến chương 5.4 tinh thần "một nguồn").
- Lời chủ C7: *"giờ đón trên biểu mẫu đặt tour chính là giờ đón được gán cho lịch chung"* — tức lịch chung **đọc** giờ của biểu mẫu, không có giờ riêng.

**Lịch chung ngày D = ghép lúc đọc:**
1. `orders` cung cấp **hàm đọc hẹp** (khuôn `pool.ts`, Hiến chương 4.4) — đề xuất `lichChungChang(db, tuNgay, denNgay)` (mở rộng A3 của ADR-0047). Trả mỗi chặng **còn hiệu lực** của **đơn đã xác nhận, chưa huỷ**:
   - `legId`, `orderId`, `orderCode`, tên dịch vụ, chiều (`OUT`/`RETURN`), ngày + giờ hẹn, nơi đón / nơi trả (khoá `loc_location` hoặc chữ đã che dãy số), **số người** (qua `soKhachHieuLuc`, hoặc số của riêng chặng nếu ĐP1 = (a)), **số người đã có tên**, cờ "đặt gấp" + mã lý do (§2.2 CH-01);
   - **không** tiền, ghi chú đơn, người lập, SĐT, họ tên.
   - Hàm **không tự kiểm quyền**; nơi gọi đứng sau `can(trip.view)` (bài kiểm quét nơi gọi — khuôn ADR-0047 A3).
2. `van-chuyen` đọc bảng của chính nó: suất đang mở của các chặng đó, chuyến, điểm dừng, đề nghị chuyển đang chờ.
3. Hàm thuần `dungLichChung(chang[], suat[], chuyen[], chinhSach, bayGio)` (đặt ở `src/shared/`) trả: từng chặng + trạng thái (§2.5) + cảnh báo + "giữ"; từng chuyến + tải hiện tại + lý do giữ.
- **Lịch chung ngày D lấy theo ngày đón của chặng**, không theo ngày đi của dịch vụ; ngày đón nằm trong [ngày đi − 1, ngày đi + 7] (C21 — luật của `orders`). Đơn nháp chỉ giữ bản cuối nên id chặng của đơn nháp không bền — thêm một lý do để chỉ xếp chặng của đơn đã xác nhận (LC-09).
- **Số đơn nháp có đưa đón ngày D** hiện thành **một con số** trên đầu màn ("còn 5 đơn nháp có hẹn đón ngày này"), không hiện chi tiết và không xếp được (luật LC-09: chỉ chặng của đơn đã xác nhận). *Giả định bề mặt G-01, đổi được.*
- **Giờ xe tới một điểm** (`vc_trip_stop.planned_time`) để **trống = theo giờ hẹn sớm nhất** của các chặng đón tại điểm đó (tính lúc đọc, không chép). Người xếp xe **ghi đè** được (vd xe tới trước 15 phút) — lúc đó là một giá trị riêng của điểm dừng, đúng "giờ xe tới thực tế" của ADR-0006 điều 5. Giờ hẹn đổi mà điểm dừng đang ghi đè → máy cảnh báo "giờ hẹn vừa đổi, xem lại giờ xe tới" (MQ-07).

### 1.4 Chuyến = kế hoạch + thực thi (một thực thể, không tách "bản xếp")

- **Không** tách bảng "bản xếp" khỏi chuyến. Lý do:
  - Oracle coi kế hoạch và thực thi là **hai giai đoạn của một đối tượng** (thuộc tính dự kiến / thực tế), không phải hai đối tượng;
  - hai bảng thì mọi luật (sức chứa, trùng giờ) phải giữ ở cả hai, và phải có bước "chép kế hoạch sang thực thi" — đúng loại lệch mà "một nguồn" cấm;
  - lịch sử thay đổi kế hoạch đã có ở suất có hiệu lực (§1.5) và sự kiện (§1.7).
- **`vc_trip`** (giữ ý B1 của 1b, đổi tên trạng thái cho dễ đọc):
  - `id`, `code` (mã cho người đọc, dạng `CX-3009-07`; G1b-9 của lượt 2 cần);
  - `vehicle_id` (FK `vc_vehicle`); `carrier_party_id` = **chủ xe chụp lúc xếp xe** (đổi xe thì chụp lại cùng lô; chỗ gắn cho lượt 3 — G1b-3 của lượt 2);
  - `service_date` (ngày dân sự VN của chuyến); `planned_start_ms`, `planned_end_ms` (mốc máy so sánh — Phần II); `CHECK` kết thúc > bắt đầu, chênh ≤ 24 giờ (qua nửa đêm vẫn đúng);
  - `rest_minutes_snapshot` (khoảng nghỉ đang hiệu lực, chụp lúc tạo chuyến — 1b B1), `rest_override_reason_code` (khi người có quyền phá lệ khoảng nghỉ, §2.4);
  - `status` tập đóng `CHECK IN ('PLANNED','RUNNING','ENDED','ENDED_INTERRUPTED','CANCELLED')` — định **trọn** từ đầu để khỏi dựng lại bảng;
  - `departed_at`/`departed_ms`, `ended_at`/`ended_ms` (máy chủ ghi); `cancel_reason_code`, `end_reason_code` (FK `vc_reason`);
  - `version` INTEGER — **khoá lạc quan của cả chuyến** (mọi lệnh đổi kế hoạch hoặc suất của chuyến tăng số này; §3.4);
  - `last_cmd_id` — **dấu lệnh**: id của request vừa thắng câu cổng của lô (§3.3); câu ghi sau trong cùng lô chỉ chạy khi chuyến mang đúng dấu này. Cột kỹ thuật, không hiện cho người dùng;
  - đủ cột dấu vết.
- **`vc_trip_driver`** (giữ G1b-1 của lượt 2): `trip_id`, `driver_party_id` (FK `pty_party`), `valid_from_at`, `valid_to_at`, `close_reason` tập đóng (`REASSIGNED`, `TRIP_CANCELLED`, `REFUSED` — mã cuối để sẵn cho D8), `closed_by`, dấu vết. Chỉ mục duy nhất: **một tài xế đang mở mỗi chuyến**.
- Chiều về là **chuyến khác** (một chuyến chạy một lượt; chuyến có thể chở chặng chiều đi của đơn này và chặng chiều về của đơn khác nếu cùng lúc — máy không cấm, **trừ khi một chặng trên chuyến mang cam kết xe riêng** — ADR-0056 VK3-A; Quản trị phá lệ được kèm lý do).

### 1.5 Suất: mỗi người trên đúng một chuyến tại mỗi lúc, có hiệu lực theo thời gian

**Vấn đề 1b chưa giải:** 1b phân bổ theo `person_key` của `ord_passenger`. Nhưng ADR-0047 A2 cho đơn lưu khi danh sách còn thiếu tên, tới cổng xuất bến mới chặn. Lúc xếp xe (thường hôm trước) nhiều khách **chưa có tên** → không có `person_key` → không phân bổ được → sức chứa tính thiếu.

**Cách giải: suất (seat slot).** `vc_trip_allocation` (giữ tên của 1b để khớp lượt 2, lượt 3):

| Cột | Nghĩa |
|---|---|
| `id` | |
| `trip_id` | FK `vc_trip` |
| `kind` | `CHECK IN ('PASSENGER','CREW')` |
| `leg_id` | FK `ord_transfer_leg`; **bắt buộc** khi `PASSENGER` (cạnh `van-chuyen → orders`) |
| `passenger_key` | FK `ord_passenger(id)` của dòng đầu chuỗi (= `person_key`); **NULL = suất chưa gắn tên**. Chỉ được đặt **một lần** từ NULL (trigger — khuôn "đặt một lần" của `valid_to`) |
| `crew_party_id` | FK `pty_party` (HDV, phụ xe đi kèm) khi `CREW` |
| `board_stop_id`, `alight_stop_id` | FK `vc_trip_stop` (điểm lên, điểm xuống) |
| `status` | tập đóng: `WAITING` (chờ đón) · `BOARDED` (đã lên xe) · `NO_SHOW` (vắng) · `CANCELLED_AT_STOP` (tài xế tới, khách đã huỷ) · `DROPPED` (đã xuống) |
| `office_cancel_at`, `office_cancel_by`, `office_cancel_reason_code` | văn phòng **báo huỷ** khi xe đang chạy (C10); đặt một lần khi `WAITING`; **không** đổi `status`. *Thêm ở lượt duyệt 2 (D5) bằng migration chỉ thêm cột* |
| `valid_from_at`, `valid_to_at`, `close_reason` | suất **đóng** khi người đó rời chuyến này: `MOVED` (văn phòng dời trước xuất bến), `TRANSFERRED` (chuyển điểm / cứu hộ), `REMOVED` (văn phòng rút trước xuất bến), `TRIP_CANCELLED`, `TRIP_INTERRUPTED` (chuyến kết thúc gián đoạn khi người đó chưa tới nơi — chặng quay về "chưa xếp" cho phần còn lại) |
| `transfer_id` | FK `vc_transfer_request` khi suất được mở hoặc đóng bởi một lần chuyển. *Thêm ở lượt duyệt 2 (D4), cùng migration tạo bảng đề nghị* |
| `added_after_departure` | 0/1 |
| dấu vết | |

- **Mỗi người của một chặng ở đúng một chuyến tại mỗi lúc** (lời chủ, tầng lõi):
  - người đã có tên: chỉ mục duy nhất `(leg_id, passenger_key) WHERE valid_to_at IS NULL AND passenger_key IS NOT NULL`;
  - suất chưa tên: **số suất đang mở của một chặng ≤ số người của chặng** — số người nằm trong JSON của `orders`, trigger không đọc được → **lệch có chủ ý L-D1** (§6.8), lớp bù: máy chủ + câu kiểm định kỳ.
- **Sức chứa đọc thuần dữ liệu `vc_`:** đếm suất đang mở có `status IN ('WAITING','BOARDED')` (khách + người đi kèm) ≤ `vc_vehicle.passenger_capacity` → trigger giữ được (LC-02). Suất vắng, khách huỷ tại điểm, đã xuống **không** chiếm chỗ; suất đã bị văn phòng báo huỷ **vẫn** chiếm chỗ tới khi tài xế ghi kết quả (an toàn: báo huỷ nhầm thì khách vẫn có chỗ).
- **Giao diện không bắt người xếp xe làm việc với từng suất:** kéo một chặng 4 người vào chuyến = máy mở 4 suất (2 có tên, 2 chưa tên) trong một lô. Tách đoàn (6 người, 4 lên xe A, 2 lên xe B) = chọn số người khi thả.
- **Gắn tên vào suất:** khi văn phòng hoặc tài xế nhập tên (ADR-0047 A2; tài xế qua ô `trip.passenger.add` — **từ lượt 2**), máy gắn `passenger_key` vào **một suất chưa tên của đúng chặng đó trên đúng chuyến đó**. Khách đổi người (A không đi, B đi thay) = suất của A ghi `NO_SHOW` hoặc đóng, B là suất mới (khuôn 1b A2).
- **Số người của chặng đổi sau khi đã xếp** (văn phòng sửa số khách trên đơn): máy **không tự** mở/đóng suất. Lịch chung hiện "chặng thiếu 1 suất" (tăng) hoặc "thừa 1 suất — gỡ bớt" (giảm) → **giữ** chuyến ở cổng xuất bến tới khi người xếp xe xử lý (Hiến chương 5.7).

### 1.6 Điểm dừng

- **`vc_trip_stop`**: `trip_id`, `seq`, `kind` (`PICKUP`/`DROPOFF`), `location_id` hoặc `place_text` (đúng một), `planned_time` (NULL = theo giờ hẹn, §1.3), `status` tập đóng (`PENDING` → `ARRIVED` → `DONE`; `PENDING` → `SKIPPED` có lý do; `PENDING` → `MOVED` khi cả điểm được chuyển sang xe khác), `arrived_at`, `done_at`, `skip_reason_code`, `updated_at`, dấu vết; `added_while_running` (0/1) thêm ở lượt duyệt 2 (D5). Tập trạng thái (kể cả `MOVED` chỉ dùng từ lượt 2) **định trọn ngay lượt 1** để khỏi dựng lại bảng.
- **Máy dựng điểm dừng từ chặng:** thả chặng vào chuyến → nếu chuyến chưa có điểm đón ở nơi đón của chặng thì thêm; tương tự điểm trả. Hai chặng cùng khách sạn = **một** điểm đón. Đây là **"cụm đón"** — đơn vị mà chủ nói "Alibu", "Mường Thanh".
- **Thứ tự:** máy gợi ý (đón theo giờ hẹn → trả); người xếp xe kéo đổi được trước xuất bến; khi chạy, tài xế đổi được thứ tự các điểm **chưa tới** (kẹt xe — C4). Mỗi lần đổi ghi một sự kiện có thứ tự trước → sau. Thứ tự và giờ xe tới là **thuộc tính kế hoạch**: cập nhật trạng thái + ghi nhật ký cùng lô (Hiến chương 4.1), không cần dòng có hiệu lực.

### 1.7 Sự kiện: `vc_trip_event` nối một-một với `audit_log`

- Mỗi lệnh làm đổi chuyến ghi **một** dòng `audit_log` (ai, hành động, lúc, lý do, chi tiết ngắn không tên) **và** một dòng `vc_trip_event` **cùng id** (khuôn ADR-0007 điều 2, Hiến chương 5.5 "nối một-một với dòng `audit_log` qua khoá chung"). **Không** khoá ngoại tới `audit_log` (đúng khuôn `order_money_adjustment`, migration 0021: `audit_log` đã từng dựng lại theo expand–contract nhiều lần). Hai dòng cùng thắng hoặc cùng thua nhờ **cổng của lô** (§3.3): nhật ký chèn với `changes() > 0` ngay sau câu cổng, sự kiện chèn với điều kiện **dấu lệnh trên `vc_trip`** — `van-chuyen` là module nghiêm nên **không** đọc `audit_log`. Câu kiểm định kỳ (`scripts/audit-checks.mjs`, không phải SQL của module) bắt dòng sự kiện mồ côi.
- `vc_trip_event` chỉ giữ **phần có kiểu** mà `audit_log` không có: `trip_id`, `kind` (tập đóng), `stop_id`, `allocation_id`, `transfer_id`, `count` (số người, **không tên**), `request_id` **UNIQUE** (chống bấm lặp, mất sóng), `client_at` (giờ máy tài xế, chỉ tham khảo), `decided_mode` (`NGUOI`/`MAY`).
- Nhờ vậy: không chép "ai, lúc nào" hai nơi; màn "dòng dữ liệu" đọc cột có kiểu, không phân tích chữ nhật ký (ADR-0030 điều 3).
- Chỉ-thêm: trigger cấm `UPDATE`/`DELETE`.

### 1.8 Đề nghị chuyển điểm đón là thực thể có trạng thái

**Vì sao là thực thể, không phải một lệnh "sửa":** việc chuyển gồm **hai người ở hai máy, hai thời điểm** (A đề nghị, B nhận) và có thể phải chờ văn phòng. Trạng thái chờ phải **nằm trong CSDL** để thấy được, không phụ thuộc thông báo có tới hay không (Hiến chương 5.16).

**`vc_transfer_request`:**
- `id`, `from_trip_id`, `to_trip_id`;
- `scope` tập đóng: `STOP` (một **cụm đón chưa tới** của xe A — ví dụ Alibu) · `ONBOARD` (khách **đang trên xe** A, gặp nhau tại một nơi — dùng cho xe hỏng, chờ ĐP5);
- `from_stop_id` (khi `STOP`); `meet_location_id` / `meet_place_text` (khi `ONBOARD`);
- `pax_count` (số suất bị chuyển, chụp lúc đề nghị — không tên);
- `proposed_by` (hồ sơ tài xế A), `proposed_at`;
- `status` tập đóng, chỉ đi tiến:

```
           A gửi
            │
            ▼
        PENDING ──── A rút ─────────────► WITHDRAWN
            │  └──── B từ chối ──────────► DECLINED
            │  └──── quá thời gian chờ ──► EXPIRED  (đóng khi có lệnh kế tiếp chạm tới; §3.8)
            │  └──── nguồn/đích đổi trạng thái ► VOID (chuyến A kết thúc, điểm đã tới…)
            │
         B bấm Nhận → máy kiểm luật (một lô)
            │
     ┌──────┴────────────────┐
  đạt hết                 không đạt
     │                       │
     ▼                       ▼
 CONFIRMED (MAY)        ESCALATED ── văn phòng duyệt (phá lệ, chờ ĐP4) ──► CONFIRMED (NGUOI)
                             └────── văn phòng bác / quá hạn ─────────► REJECTED
```

- `decided_mode` (`MAY`/`NGUOI`), `decided_by` (tài khoản ra lệnh cuối: B khi máy tự xác nhận; người văn phòng khi duyệt), `decided_at`, `policy_id` (dòng `vc_dispatch_policy` đã dùng), `override_reason_code` (khi văn phòng phá lệ).
- **`vc_transfer_check`** — bằng chứng "máy xác nhận theo luật X" (Hiến chương 5.6: chụp con số + nguồn quy tắc; 5.2: cột có kiểu, **không JSON**): mỗi dòng = `transfer_id`, `rule_code` (tập đóng: `SUC_CHUA_DICH`, `TRUNG_GIO_DICH`, `KHOANG_NGHI_DICH`, `HANG_BANG_DICH`, `GIAY_TO_DICH`, `KHONG_CHEO`, `DIEM_CHUA_TOI`…), `ket_qua` (`DAT`/`KHONG_DAT`/`CANH_BAO`), `gia_tri` (INTEGER, vd số người sau chuyển), `gioi_han` (INTEGER, vd số chỗ), `policy_row_id`. Chỉ-thêm.
- **Xác nhận = một lô:** đổi trạng thái đề nghị → đóng suất ở A (`TRANSFERRED`) → mở suất ở B (`added_after_departure` nếu B đã chạy) → thêm điểm đón (và điểm trả nếu B chưa có nơi trả của các chặng đó) ở B → điểm của A thành `MOVED` → tăng `version` của **cả hai** chuyến → sự kiện + nhật ký. Tất cả hoặc không gì (Hiến chương 1.2, K8).

### 1.9 Chính sách, danh mục lý do, bản chụp

- **`vc_dispatch_policy`** (chỉ-thêm, `valid_from_at` UNIQUE, dòng hiệu lực = mới nhất đã tới; khuôn `vc_expiry_policy` của 1a; chỉ Toàn quyền — `settings.ops`):
  - lượt duyệt 1: `min_lead_minutes` (mốc tối thiểu, gieo **360** = 6 giờ — **một con số cho cả lúc đặt và lúc xếp**, vì chủ nói luật "ghép điều kiện chung"), `warn_lead_minutes` (cảnh báo sát mốc, gieo 120), `rest_minutes` (khoảng nghỉ, gieo 30 — giả định G3 của 1b), `require_manifest` (1), `require_contract` (0, khoá không cho bật tới khi có ADR hợp đồng — ĐP7);
  - lượt duyệt 2 thêm cột (migration chỉ thêm): `accept_wait_minutes` (thời gian chờ B nhận, gieo 10), `auto_confirm_transfer` (0/1, gieo 1 — công tắc an toàn: tắt thì mọi đề nghị B đã nhận đi qua văn phòng);
  - lượt duyệt 3 thêm hạn chót Từ chối (D8).
- **`vc_departure_rule`, `vc_license_capacity`**: giữ nguyên thiết kế B2 của 1b (điều kiện giấy tờ theo cỡ xe; hạng bằng → số khách tối đa không kể lái; Toàn quyền).
- **`vc_reason`** (danh mục sửa được, Quản trị — `admin.manage`; khuôn `loc_location`): `group` tập đóng (`DOI_GIO_XE`, `BAO_HUY_DIEM`, `PHA_LE`, `TU_CHOI_NHAN`, `KET_THUC_GIAN_DOAN`, `HUY_CHUYEN`, `BO_QUA_DIEM`), `code`, `label`, `active`, `sort_order`. Máy chỉ rẽ nhánh theo **nhóm**, không theo từng lý do → lý do là dữ liệu (phép thử 2.2). Mỗi nhóm luôn có một lý do "Khác" kèm ghi chú ngắn (≤ 120 ký tự, máy che dãy từ 8 chữ số).
- **Bản chụp lúc xuất bến:** giữ nguyên `vc_trip_departure_check` + dòng con có kiểu và `vc_trip_manifest` của 1b B2 (lưu khoá trước, chỉ chép giá trị hồ sơ còn sửa tại chỗ được: biển số, số chỗ, hạng, hạn — không tên, không số giấy tờ). Người thêm sau xuất bến (nhận chuyển, văn phòng thêm điểm) là dòng manifest mới gắn cờ `added_after_departure`.

### 1.10 Vì sao KHÔNG sửa đè

| Điều | Cách giữ | Vì sao |
|---|---|---|
| Khách ở xe nào, từ lúc nào tới lúc nào | suất có hiệu lực: rời xe = đóng dòng, sang xe khác = dòng mới | danh sách hành khách theo xe là chứng cứ pháp lý (lưu ≥ 3 năm); tranh chấp "ai trên xe nào lúc tai nạn" phải trả lời được cho **mọi thời điểm** |
| Ai lái chuyến | `vc_trip_driver` có hiệu lực | đổi tài xế, Từ chối (D8) không làm mất "ai từng lái"; tin "bạn bị gỡ" tính theo khoảng (lượt 2 D5) |
| Đề nghị chuyển | thực thể có trạng thái chỉ đi tiến | hai người, hai máy, hai lúc; trạng thái chờ phải thấy được |
| Máy quyết theo luật nào | `vc_transfer_check`, `vc_trip_departure_check` chỉ-thêm, trỏ dòng chính sách | đổi chính sách sau không đổi quyết định cũ (5.6); trả lời được "vì sao máy cho qua" |
| Sự kiện, nhật ký | chỉ-thêm | 4.1, 5.5, 5.12 |
| Thứ tự điểm, giờ xe tới | **cập nhật** + sự kiện trước → sau | thuộc tính kế hoạch, không phải chứng cứ; bắt dòng có hiệu lực ở đây là phức tạp không cần (Hiến chương 4.1 cho phép "trạng thái + nhật ký cùng lô") |

### 1.11 Bảng, view, hàm, cạnh mới

**Bảng mới của `van-chuyen` (`vc_`):** `vc_trip`, `vc_trip_driver`, `vc_trip_stop`, `vc_trip_allocation`, `vc_trip_event`, `vc_transfer_request`, `vc_transfer_check`, `vc_dispatch_policy`, `vc_departure_rule`, `vc_license_capacity`, `vc_reason`, `vc_trip_departure_check` (+ dòng con), `vc_trip_manifest`.

**Thêm vào bảng của `orders` (bổ sung ADR-0047 A1):** trên `ord_transfer_leg` năm cột "đặt gấp" — `short_notice_reason` (mã), `short_notice_note`, `short_notice_by`, `short_notice_at`, `short_notice_lead_minutes` (§2.2 CH-01). Đi bằng **một migration riêng chỉ thêm cột**, số từ 0040 trở đi — **không** chạm migration 0034–0036 của ADR-0047 đang thi công.

**View công bố dùng cho trigger `vc_` (đã có trong ADR-0047):** `v_ord_order_flag`, `v_ord_leg_key`, `v_ord_passenger_key`; của ADR-0048: `v_pty_carrier_driver`. Không view mới mang con số (Phần II quy tắc 4).

**Hàm công bố mới:**

| Module | Hàm | Dùng bởi | Kiểm quyền |
|---|---|---|---|
| `orders` | `lichChungChang(db, tuNgay, denNgay)` | `van-chuyen` (lịch chung) | nơi gọi đứng sau `can(trip.view)` |
| `orders` | `hanhKhachChoChuyen(db, legIds)` (đã có ở ADR-0047 A3) | `van-chuyen` (manifest, DTO tài xế) | nơi gọi đứng sau `can(trip.*)` |
| `orders` | `lienHeChoTaiXe(db, orderIds)` — tên + SĐT người liên hệ | `van-chuyen` (DTO tài xế, C3) | nơi gọi đứng sau `can(trip.view, assigned)` + "trong ngày chạy" |
| `orders` | câu lệnh chưa chạy "thêm/sửa hành khách do tài xế" (`source = 'DRIVER'`) — **lượt 2** | `van-chuyen` | nơi gọi đứng sau `can(trip.passenger.add)` |
| `van-chuyen` | `mocToiThieuHienHanh(db)` → `{ phut, policyId }` | gốc lắp ráp → tiêm cho `orders` | không cần (chính sách công khai trong công ty) |

**Hàm tiêm mới ở gốc lắp ráp (khuôn `isAssigned`, ADR-0007 điều 4(b)):** `ctx.mocToiThieu(env)` cho `orders` — `orders` cần con số 6 giờ lúc lập/sửa chặng nhưng **không được** đọc bảng `vc_` (cạnh `van-chuyen → orders` sắp có; chiều ngược lại là vòng). Lượt duyệt 2 thêm hàm tiêm thông báo (§6.4 D6).

**Cạnh mới trong đồ thị (bổ sung ADR-0002, `ALLOWED_EDGES`):**
- `van-chuyen → orders` (suất trỏ chặng; hàm hẹp; đã báo trước ở 1b và ADR-0047);
- `van-chuyen → locations` (điểm dừng trỏ `loc_location`; nhãn qua `v_loc_location_label`).
- Vẫn **không module nào import `van-chuyen`** (ADR-0040 D1 giữ nguyên): `orders` nhận con số qua hàm tiêm; `thongbao` qua hàm tiêm (lượt duyệt 2).
- Sửa `ALLOWED_EDGES` là **nới hàng rào đã duyệt** (Điều 9.4) → cần chủ duyệt (nằm trong D1).

### 1.12 Bốn máy trạng thái (tập đóng `CHECK`, trigger chỉ đi tiến — khuôn `orders_status_transition`, 0017)

```
CHUYẾN      PLANNED ──xuất bến (qua cổng)──► RUNNING ──kết thúc──► ENDED
               │                                 └──kết thúc gián đoạn (lý do)──► ENDED_INTERRUPTED
               └──huỷ (lý do)──► CANCELLED
            ENDED / ENDED_INTERRUPTED / CANCELLED: cấm sửa, cấm xoá (trigger)

SUẤT        WAITING ──► BOARDED ──► DROPPED
               │  └──► NO_SHOW ──(đón muộn)──► BOARDED     (bước lùi duy nhất, như 1b)
               └──► CANCELLED_AT_STOP                       (tài xế tới, khách đã huỷ)
            Rời chuyến = ĐÓNG dòng (valid_to_at), không đổi status. Chỉ đóng được khi WAITING
            (dời, rút, chuyển điểm) hoặc BOARDED (cứu hộ, chờ ĐP5); kết thúc gián đoạn đóng cả hai.

ĐIỂM DỪNG   PENDING ──► ARRIVED ──► DONE
               ├──► SKIPPED (lý do; chỉ khi mọi suất của điểm đã có kết quả hoặc đã đóng)
            ARRIVED ──► SKIPPED   chỉ trong lô "Kết thúc gián đoạn" (§2.1a)
               └──► MOVED   (cả cụm đón đã chuyển sang xe khác)

ĐỀ NGHỊ     xem §1.8
```

---

## Phần 2 — Bộ luật ba tầng

**Cách đọc.** Mỗi luật có mã. "Kích hoạt" = lúc máy kiểm. "Kết quả" = điều xảy ra khi vi phạm (hoặc khi đạt, với tầng 3). "Thông báo" = ai được báo **từ lượt duyệt 2** (D6); ở lượt duyệt 1, người thao tác thấy ngay trên màn, người khác thấy khi mở lại bảng. Tầng giữ: **[CSDL]** khoá, `CHECK`, trigger chỉ đọc bảng `vc_` hoặc view công bố (5.3) · **[MC]** máy chủ kiểm trước khi ghi, trả lỗi bằng lời · **[ĐK]** câu kiểm định kỳ (`scripts/audit-checks.mjs`).

### 2.1 Tầng 1 — Lõi cố định (đổi bằng ADR; không ai phá lệ, kể cả Toàn quyền)

| Mã | Luật | Kích hoạt | Đầu vào | Kết quả khi vi phạm | Thông báo | Tầng giữ |
|---|---|---|---|---|---|---|
| LC-01 | **Mỗi người của một chặng ở đúng một chuyến tại mỗi lúc** | mở suất (xếp, dời, nhận chuyển, thêm điểm); gắn tên vào suất | suất đang mở của chặng; số người của chặng | chặn (409 "khách này đang ở chuyến CX-…") | — | [CSDL] chỉ mục duy nhất `(leg_id, passenger_key)` cho suất có tên · [MC] số suất mở ≤ số người của chặng (**lệch L-D1**, §6.8) · [ĐK] |
| LC-02 | **Tổng người trên xe ≤ số chỗ, mọi lúc, kể cả sau chuyển điểm** (khách mọi lứa tuổi + người đi kèm; không kể tài xế) | mở suất; vắng → đã lên (đón muộn); đổi xe của chuyến; giảm số chỗ hoặc ngừng xe (route xe của 1a) | suất mở `WAITING`/`BOARDED`; `vc_vehicle.passenger_capacity` | chặn; với đề nghị chuyển → không đạt, leo thang (MQ-02) | người thao tác; đề nghị: A, B, văn phòng | [CSDL] trigger trên `vc_trip_allocation`, `vc_trip.vehicle_id`, `vc_vehicle.passenger_capacity/status` · [MC] câu báo trước bằng lời |
| LC-03 | **Xe và tài xế không chồng giờ**: không hai chuyến chưa huỷ của cùng xe, hay cùng tài xế đang mở, có khoảng `[bắt đầu, kết thúc]` dự kiến chồng nhau; **một chuyến đang chạy mỗi xe và mỗi tài xế** | tạo/sửa giờ chuyến; đổi xe; gán tài xế; xuất bến | `vc_trip`, `vc_trip_driver` | chặn | người thao tác | [CSDL] trigger + chỉ mục duy nhất `(vehicle_id) WHERE status='RUNNING'` · [MC] |
| LC-04 | **Không sửa đè, không xoá**: suất, tài xế của chuyến, sự kiện, đề nghị, kết quả kiểm, bản chụp | mọi lệnh ghi | — | chặn | — | [CSDL] trigger cấm `DELETE`; cấm `UPDATE` cột nội dung (chỉ cho: đóng dòng một lần, gắn tên một lần, đổi trạng thái đi tiến) |
| LC-05 | **Qua cổng mới xuất bến** | bấm Xuất bến (tài xế hoặc văn phòng bấm thay) | kết quả `kiemXuatBen` (1b B2) | chặn, hiện lý do + ai xử lý (MQ-05) | tài xế + văn phòng thấy "giữ" | [CSDL] trigger: `PLANNED → RUNNING` chỉ khi có dòng `vc_trip_departure_check` đạt ghi cùng lô · [MC] |
| LC-06 | **Chuyến đã kết thúc hay đã huỷ không sửa được** (cả điểm dừng, suất của nó). **Không ngoại lệ:** lệnh kết thúc/huỷ đặt câu đổi trạng thái chuyến **cuối lô**, mọi thay đổi điểm/suất đi trước nó (§2.1a) | mọi lệnh ghi vào chuyến đó | `vc_trip.status` | chặn | — | [CSDL] trigger |
| LC-07 | **Trạng thái chỉ đi tiến** (chuyến, suất, điểm dừng, đề nghị — §1.12) | đổi trạng thái | trạng thái cũ, mới | chặn | — | [CSDL] trigger |
| LC-08 | **Tài xế chỉ thấy chuyến mình đang lái** (và đề nghị gửi tới mình) | mọi route tài xế | `vc_trip_driver` mở với `driver_party_id = ctx.staff.partyId` | 404 (không lộ chuyến có tồn tại) | — | [MC] (luật quyền — K4; không phải bất biến dữ liệu) |
| LC-09 | **Chỉ chặng còn hiệu lực của đơn đã xác nhận, chưa huỷ, mới lên xe được** | mở suất | `v_ord_leg_key.is_open`, `v_ord_order_flag` | chặn. Đơn huỷ hay chặng đóng **sau** khi xếp → không xoá suất, chuyến bị **giữ** (MQ-05) | văn phòng (MQ-04) | [CSDL] trigger đọc hai view công bố · [MC] |
| LC-10 | **Người gắn vào suất thuộc đúng đơn của chặng** | gắn tên | `v_ord_passenger_key.order_id` = `v_ord_leg_key.order_id` | chặn | — | [CSDL] trigger · [MC] |
| LC-11 | **Giờ sự kiện do máy chủ ghi; lệnh lặp không ghi hai lần**; văn phòng bấm thay thì ghi người bấm | lệnh tài xế / bấm thay | `request_id` | gửi lặp → trả lại kết quả cũ | — | [CSDL] `UNIQUE(request_id)` · [MC] |
| LC-12 | **Đủ điều kiện lái**: hạng bằng đủ chở số chỗ của xe (bảng hạng đang hiệu lực); giấy tờ xe và tài xế mà điều kiện đòi còn hạn **tới hết chuyến** | gán tài xế; đổi xe; xuất bến | giấy tờ qua hàm công bố của `parties` (không số); `vc_license_capacity`; `vc_departure_rule` | chặn gán; giữ ở cổng | văn phòng (Quản trị lo giấy tờ) | [MC] + bản chụp xuất bến + [ĐK] "chuyến 48 giờ tới có tài xế không đạt" — **lệch L-B2** (giữ nguyên của 1b, §6.8) |
| LC-13 | **Không chéo xe–tài xế**; xe nhà xe chỉ lên chuyến khi chủ xe còn mở vai Nhà xe vào ngày chạy (ADR-0048 B1.4) | gán tài xế; đổi xe | `v_pty_carrier_driver`; chủ xe | chặn | — | [CSDL] trigger đọc view công bố của `parties` · [MC] |
| LC-14 | **Chuyển điểm đón chỉ khi**: chuyến nguồn đang chạy; chuyến đích lên lịch hoặc đang chạy, **cùng ngày**; người gửi là tài xế đang mở của nguồn; người nhận là tài xế đang mở của đích; hai người khác nhau; điểm nguồn **chưa tới** và mọi suất của điểm đang **chờ đón** (phạm vi `ONBOARD` theo ĐP5) | tạo đề nghị; bấm Nhận; xác nhận | `vc_trip`, `vc_trip_driver`, `vc_trip_stop`, `vc_trip_allocation` | chặn (409) hoặc đề nghị thành `VOID` | A | [CSDL] trigger trên `vc_transfer_request` (mọi dữ liệu cùng module) · [MC] |
| LC-15 | **Kế hoạch của chuyến đang chạy bị khoá**, mở dần theo lượt. **Lượt 1:** chuyến `RUNNING` không mở/đóng suất, không thêm điểm, không đổi xe, không đổi tài xế; chỉ còn: trạng thái tiến độ, đổi thứ tự điểm **chưa tới**, gắn tên vào suất. **Lượt 2 nới đúng hai đường:** (i) văn phòng **thêm** điểm/suất và **báo huỷ** (điểm đã báo huỷ vẫn chờ tài xế tới và ghi kết quả — C10); (ii) đóng/mở suất qua **đề nghị chuyển đã `CONFIRMED`** (D4). Văn phòng **không bao giờ** rút hay dời suất của chuyến đang chạy. **Ngoại lệ duy nhất có ngay từ lượt 1** (khuôn LC-05): trong lô "Kết thúc gián đoạn", suất được đóng với `TRIP_INTERRUPTED` — chỉ khi chuyến mang dấu lệnh của chính lô đó và lô đã ghi sự kiện `ENDED_INTERRUPTED` (§2.1a) | mọi lệnh kế hoạch vào chuyến `RUNNING` | trạng thái chuyến; `close_reason`; `transfer_id` | chặn (409 "xe đang chạy: …") | — | [CSDL] trigger (lượt 1: cấm hẳn, trừ ngoại lệ `TRIP_INTERRUPTED` của §2.1a; lượt 2: suất của chuyến `RUNNING` chỉ đóng được với `TRANSFERRED` + `transfer_id` đã `CONFIRMED`, chỉ mở được với `added_after_departure = 1`) · [MC] |
| LC-16 | **Kết thúc thường** chỉ khi mọi suất mở đã có kết quả cuối (`DROPPED`/`NO_SHOW`/`CANCELLED_AT_STOP`) và mọi điểm đã `DONE`/`SKIPPED`/`MOVED`; không thì phải **"Kết thúc gián đoạn"** có lý do. Cả hai: câu đổi trạng thái chuyến là **câu cuối** của lô; với gián đoạn, **trước** câu đó và trong **cùng lô**: suất đang mở `WAITING`/`BOARDED` → đóng `TRIP_INTERRUPTED` (ngoại lệ của LC-15), điểm `PENDING`/`ARRIVED` → `SKIPPED` (§2.1a) | bấm Kết thúc / Kết thúc gián đoạn | suất, điểm | chặn, gợi ý "Kết thúc gián đoạn" | văn phòng khi gián đoạn | [CSDL] trigger ở câu đổi trạng thái: không còn suất mở `WAITING`/`BOARDED`, không còn điểm `PENDING`/`ARRIVED` · [MC] |
| LC-17 | **Máy không bao giờ liên lạc khách** (không gọi, không nhắn, không email tới SĐT/email của khách hay người liên hệ) | — | — | — | — | [MC] **dựa vào kỷ luật** + bài quét mã: không đường gửi nào nhận địa chỉ lấy từ liên hệ của đơn (P16: ghi đúng là kỷ luật tới khi bài quét thấy chặn thật) |
| LC-18 | **Dữ liệu cá nhân**: nhật ký, Bảng tin, thông báo chỉ ghi số người, mã chuyến, mã đơn — không tên, năm sinh, SĐT, số giấy tờ; tên + SĐT chỉ trong DTO tài xế, hạn trong ngày chạy | mọi lệnh ghi; mọi DTO | danh sách trường được phép | — | — | [MC] danh sách trắng + bài quét nhật ký (khuôn `src/giay-to-khong-lo-so.test.ts`) |

**Chỗ khác 1b, có lý do:**
- 1b đặt **khoảng nghỉ** trong trigger (L2). Bản này để trigger chỉ giữ **chồng giờ thật** (lõi), còn **khoảng nghỉ** là luật cấu hình ở máy chủ (CH-02), vì chủ xếp "khoảng nghỉ" vào tầng cấu hình và cho **phá lệ** luật cấu hình kèm lý do. Trigger không biết "đã có người phá lệ" nếu không thêm đường vòng; giữ lõi ở CSDL, cấu hình ở máy chủ là rạch ròi hơn. Đây là **nới** so với 1b (chưa duyệt), không nới luật nào đã duyệt.
- 1b phân bổ theo `person_key` (không chỗ cho khách chưa tên). Bản này dùng **suất** (§1.5).
- 1b có trạng thái suất `TRANSFERRED`. Bản này **đóng dòng** thay cho trạng thái đó — một cách nói cho "rời xe", không hai (tinh thần ADR-0006 điều 2: "một cách duy nhất để không còn hiệu lực").

### 2.1a Thứ tự lô khi kết thúc hay huỷ chuyến (LC-06, LC-15, LC-16 cùng đúng)

Ba luật gặp nhau ở lệnh kết thúc gián đoạn: LC-06 cấm sửa suất/điểm **sau** khi chuyến đã kết thúc; LC-15 cấm đóng suất của chuyến **đang chạy**; LC-16 đòi không còn suất/điểm treo **lúc** đổi trạng thái. Nếu không có ngoại lệ thì không thứ tự nào ghi được. Cách gỡ theo đúng khuôn LC-05 ("chỉ khi có dòng đạt ghi **cùng lô**"): **ngoại lệ chỉ đúng bên trong lô của chính lệnh kết thúc gián đoạn**, nhận ra bằng dấu lệnh (§3.3).

**Lô "Kết thúc gián đoạn" của chuyến T** (tài xế bấm, hoặc văn phòng bấm thay), thứ tự cố định:

| # | Câu | Luật được kiểm ở câu này |
|---|---|---|
| 1 | **Cổng:** `UPDATE vc_trip SET version = version + 1, last_cmd_id = :cmd WHERE id = :T AND status = 'RUNNING'` | — (chuyến vẫn `RUNNING`) |
| 2 | Nhật ký `trip_ended_interrupted`, điều kiện `changes() > 0` | — |
| 3 | `INSERT vc_trip_event (id = :cmd, kind = 'ENDED_INTERRUPTED', trip_id = :T, …)` có dấu lệnh | — |
| 4 | `UPDATE vc_trip_allocation SET valid_to_at = :at, close_reason = 'TRIP_INTERRUPTED' WHERE trip_id = :T AND valid_to_at IS NULL AND status IN ('WAITING','BOARDED')` có dấu lệnh | **LC-15** (chuyến đang chạy): trigger chỉ cho đóng khi `NEW.close_reason = 'TRIP_INTERRUPTED'` **và** `EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id WHERE t.id = NEW.trip_id AND t.status = 'RUNNING' AND e.kind = 'ENDED_INTERRUPTED')`. Dòng sự kiện đó chỉ có khi câu 1 của **lô này** thắng; lô khác sau này sẽ đặt dấu lệnh khác, nên ngoại lệ không dùng lại được. **LC-06** chưa chặn (chuyến chưa kết thúc) |
| 5 | `UPDATE vc_trip_stop SET status = 'SKIPPED', skip_reason_code = :lyDo WHERE trip_id = :T AND status IN ('PENDING','ARRIVED')` có dấu lệnh | luật điểm: `SKIPPED` chỉ khi mọi suất của điểm đã có kết quả **hoặc đã đóng** — đúng sau câu 4. `ARRIVED → SKIPPED` chỉ cho phép khi có cùng sự kiện `ENDED_INTERRUPTED` như câu 4 |
| 6 | **Cuối lô:** `UPDATE vc_trip SET status = 'ENDED_INTERRUPTED', ended_at = :at, ended_ms = :ms, end_reason_code = :lyDo WHERE id = :T AND status = 'RUNNING' AND last_cmd_id = :cmd` | **LC-16**: trigger đòi không còn suất mở `WAITING`/`BOARDED` và không còn điểm `PENDING`/`ARRIVED` — đúng sau câu 4–5. Từ đây **LC-06** khoá mọi thay đổi |

- **Kết thúc thường:** câu 1 → 2 → 3 (`kind = 'ENDED'`) → câu đổi trạng thái sang `ENDED` cuối lô. Không đóng suất nào (mọi suất đã có kết quả cuối); LC-16 kiểm ở câu cuối.
- **Huỷ chuyến `PLANNED`:** câu 1 (điều kiện `status = 'PLANNED'`) → 2 → 3 (`kind = 'CANCELLED'`) → đóng suất đang mở với `TRIP_CANCELLED` (chuyến chưa chạy nên LC-15 không áp) → đổi trạng thái sang `CANCELLED` cuối lô. Đảo thứ tự thì LC-06 chặn câu đóng suất.
- **Quy tắc chung:** trong mọi lô, câu đổi trạng thái chuyến sang trạng thái cuối (`ENDED`, `ENDED_INTERRUPTED`, `CANCELLED`) là **câu cuối cùng**. Bài kiểm thứ tự lô (§3.3, lát 1.5) khẳng định điều này.

### 2.2 Tầng 2 — Cấu hình (dòng có ngày hiệu lực, 5.2; đổi không cần sửa mã)

| Mã | Cấu hình | Giá trị gieo | Bảng | Ai sửa | Kích hoạt, chụp ở đâu (5.6) | Kết quả khi vi phạm | Thông báo (từ lượt 2) |
|---|---|---|---|---|---|---|---|
| CH-01 | **Mốc tối thiểu** trước giờ khởi hành — **một con số cho cả lúc đặt và lúc xếp** (chủ: luật "ghép điều kiện chung") | 360 phút | `vc_dispatch_policy.min_lead_minutes` | Toàn quyền (`settings.ops`) | **Lúc đặt** (C17, C18, C22): lưu **nháp** chặng dưới mốc vẫn được (có cảnh báo — ĐP2(v)); **xác nhận đơn**, và **sửa ngày, giờ, nơi đón, nơi trả** của chặng đơn đã xác nhận, khi giờ hẹn < bây giờ + mốc → chặn, **trừ khi** chặng mang "đặt gấp" do **Quản trị / Toàn quyền** ghi; đặt gấp chụp **số phút đã dùng** vào `short_notice_lead_minutes` (không trỏ khoá chính sách — `orders` không được trỏ bảng `vc_`). **Lúc xếp** (C17): lệnh đổi "ai đi xe nào", đổi xe, đổi tài xế của chuyến có **giờ xuất bến dự kiến** < bây giờ + mốc → chặn; chặng đã đặt gấp thì xếp **chính chặng đó** không phải phá lệ lần nữa; phá lệ (Quản trị / Toàn quyền) thì sự kiện `PHA_LE` ghi `policy_id` | chặn (409 bằng lời); hộp "Đặt gấp" / "Phá lệ" **chỉ hiện cho Quản trị, Toàn quyền** (C18); người khác thấy "Cần Quản trị duyệt" | chặng đặt gấp: người điều xe |
| CH-02 | **Khoảng nghỉ** tối thiểu giữa hai chuyến của cùng xe / cùng tài xế | 30 phút | `vc_dispatch_policy.rest_minutes` | Toàn quyền | tạo/sửa chuyến, gán tài xế; chụp vào `vc_trip.rest_minutes_snapshot`; xuất bến kiểm lại từ giờ **kết thúc thật** của chuyến trước (1b L2b) | chặn; chỉ Quản trị, Toàn quyền phá lệ được (C18) | — |
| CH-03 | **Cảnh báo sát mốc**: còn bao lâu nữa tới mốc thì chặng chưa xếp chuyển màu cảnh báo | 120 phút | `vc_dispatch_policy.warn_lead_minutes` | Toàn quyền | mỗi lần dựng lịch chung (MQ-04) | chỉ hiển thị | — (đẩy điện thoại theo giờ là việc sau, §3.8) |
| CH-04 | **Điều kiện xuất bến**: đủ danh sách; hợp đồng (khoá tắt tới khi có ADR riêng — C20); giấy tờ bắt buộc theo cỡ xe | như 1b B2 | `vc_dispatch_policy.require_*`, `vc_departure_rule` | Toàn quyền | bấm Xuất bến; chụp vào `vc_trip_departure_check` | chuyến bị **giữ** (MQ-05); không ai phá lệ | tài xế, văn phòng thấy lý do giữ trên màn |
| CH-05 | **Hạng bằng → số khách tối đa** (không kể lái) | B 8; D1 16; D2 29; D không giới hạn; B2 cũ 8; C cũ 8; D cũ 29; E cũ không giới hạn (bảng tra 27/9, **chưa có người chuyên môn kiểm**) | `vc_license_capacity` | Toàn quyền | gán tài xế, đổi xe, xuất bến; chụp như CH-04 | chặn gán; giữ ở cổng; không ai phá lệ | — |
| CH-06 | **Danh mục lý do** (đổi giờ xe, báo huỷ điểm, phá lệ, từ chối nhận chuyển, kết thúc gián đoạn, huỷ chuyến, bỏ qua điểm) | vài lý do mỗi nhóm + "Khác" | `vc_reason` | Quản trị (`admin.manage`) | mọi lệnh đòi lý do; mã lý do lưu trên dòng dùng nó | thiếu lý do hoặc lý do đã ngưng → 400 | — |
| CH-07 | **Thời gian chờ B nhận** đề nghị chuyển | 10 phút | `vc_dispatch_policy.accept_wait_minutes` (lượt duyệt 2) | Toàn quyền | tính lúc đọc (§3.8); chụp `policy_id` vào đề nghị | quá giờ → đề nghị hết hạn (MQ-08) | A thấy trên màn |
| CH-08 | **Công tắc tự xác nhận** chuyển điểm | bật | `vc_dispatch_policy.auto_confirm_transfer` (lượt duyệt 2) | Toàn quyền | lúc B bấm Nhận; chụp `policy_id` vào đề nghị | tắt → mọi đề nghị B đã nhận thành `ESCALATED` | người điều xe (cần xử lý) |
| CH-09 | **Mẫu chặng theo dịch vụ**: không đưa đón / một chiều / hai chiều (+ giờ đón gợi ý chiều về, tuỳ chọn) | trống = không đưa đón | chờ ĐP10 (bảng của `catalog` hoặc cột Sheet) (lượt duyệt 4) | Quản trị (nếu trong app) | lập đơn: tự tạo chặng; người lập sửa tay được (C5) | không chặn (chỉ là mặc định) | — |

**Mốc 6 giờ không phải bất biến dữ liệu, không phải lệch 5.1.** Luật "giờ hẹn phải cách bây giờ ít nhất 6 giờ" phụ thuộc **giờ hiện tại**: một chặng hợp lệ hôm qua sẽ "vi phạm" hôm nay chỉ vì thời gian trôi. Nó là **khoảng cho phép**, mà Phần II ("Luật dữ liệu": khoảng cho phép là luật đổi được nên nằm ở mã) đã đặt ở máy chủ. Lớp CSDL chỉ giữ phần bất biến của nó: có cột "đặt gấp" thì phải có mã lý do (`CHECK`).

**Lý do "đặt gấp" là hằng trong mã, không phải dòng `vc_reason`.** `orders` không được trỏ hay đọc bảng `vc_` (cạnh `van-chuyen → orders` sắp có; chiều ngược lại là vòng). Danh sách lý do đặt gấp vì vậy là hằng dùng chung ở `src/shared/` (khuôn `CANCEL_REASONS`, ADR-0030 điều 2), đổi bằng mã. *Giả định G-02, chủ bác thì cần một bảng lý do của `orders`.*

### 2.3 Tầng 3 — Máy tự quyết theo luật (người quyết cuối, trừ luồng tự xác nhận chủ đã chọn)

Mọi việc ở tầng này là **mã tất định có test** (Hiến chương 5.15), không phải AI. Máy chỉ **quyết định** ở MQ-02 (chủ chọn), MQ-06, MQ-08, MQ-09 (hệ quả tất yếu trong cùng lô của một lệnh người đã ra). Còn lại là **đề xuất**, **cảnh báo** hoặc **giữ**.

| Mã | Việc | Kích hoạt | Đầu vào | Kết quả | Loại | Thông báo (từ lượt duyệt 2) |
|---|---|---|---|---|---|---|
| MQ-01 | **Gợi ý xếp xe** | người xếp xe mở ngày D hoặc bấm "Gợi ý"; tài xế Từ chối (D8) | chặng chưa xếp, chuyến đang lên kế hoạch, xe rảnh, tài xế đủ điều kiện, chính sách | danh sách gợi ý "chặng → chuyến có sẵn" hoặc "mở chuyến mới với xe X, tài xế Y"; mỗi gợi ý kèm lý do. Cách gom: **cùng nơi trả + giờ hẹn gần nhau** (máy không biết đường đi — G-05). **Không ghi gì.** Người bấm "Áp dụng" = một lệnh xếp bình thường, qua đủ luật | đề xuất — **thi công ở lát 2.5**, sau lượt 1 (thiết kế giữ nguyên) | — |
| MQ-02 | **Tự xác nhận chuyển điểm đón** | tài xế B bấm Nhận | hai chuyến, suất, điểm, chính sách, giấy tờ | mọi luật đạt **và** công tắc CH-08 bật → `CONFIRMED`, `decided_mode = MAY`, đổi suất trong cùng lô. Có luật không đạt → `ESCALATED` kèm danh sách luật | **quyết định** / leo thang | xác nhận: A, B, người điều xe (tin thường); leo thang: người điều xe (cần xử lý) + A, B |
| MQ-03 | **Kiểm lại cả hai xe khi chuyển** (bộ luật MQ-02 chạy) | như MQ-02 | — | ghi từng dòng `vc_transfer_check`: `SUC_CHUA_DICH` (LC-02 xe B sau chuyển), `TRUNG_GIO_DICH` (LC-03), `KHOANG_NGHI_DICH` (CH-02 với chuyến kế của B), `HANG_BANG_DICH` + `GIAY_TO_DICH` (LC-12; xe B không đổi nên thường đạt), `DIEM_CHUA_TOI` (LC-14), `KHONG_CHEO` (LC-13). Xe A chỉ bớt người nên không cần kiểm sức chứa; vẫn ghi dòng `SUC_CHUA_NGUON` để bằng chứng đủ. **Chuyến sau của B có thể trễ:** máy **không biết thời gian đi đường** nên chỉ ghi `CANH_BAO` khi B có chuyến kế trong vòng 2 × khoảng nghỉ | quyết định (phần của MQ-02) | như MQ-02 |
| MQ-04 | **Cảnh báo trên bảng** | mỗi lần dựng lịch chung (đọc) | lịch chung, chính sách, bây giờ | chặng **sát mốc** / **quá mốc** chưa xếp; thiếu/thừa suất; giờ hẹn đổi sau khi xếp; đơn huỷ hay chặng đóng sau khi xếp; giấy tờ hết hạn trước khi chuyến kết thúc; thiếu tên trước xuất bến; đề nghị chờ quá hạn; chuyến chưa có tài xế; **đơn nháp có chặng dưới mốc chờ Quản trị duyệt đặt gấp** (hiện cho Quản trị, Toàn quyền) | cảnh báo | lượt duyệt 2: chỉ các cảnh báo **sinh từ một sự kiện đã ghi** (§3.5); cảnh báo **theo giờ** (sát mốc, quá mốc) chỉ hiện trên bảng — đẩy lên điện thoại là việc sau (§3.8) |
| MQ-05 | **Giữ chuyến** (Hiến chương 5.7) | mỗi lần đọc chuyến; bấm Xuất bến | `kiemXuatBen` (1b B2) + thiếu/thừa suất + đơn huỷ + chặng đóng + chưa có tài xế | chuyến ở `PLANNED`, hiện **lý do + ai xử lý** (văn phòng / Quản trị / Toàn quyền); không lưu cột "giữ" — tính lại mỗi lần đọc (G7 của 1b); kiểu `LyDoGiu` ở `src/shared/` | giữ | tài xế thấy "chưa đủ điều kiện xuất bến: …" |
| MQ-06 | **Tự thêm điểm vào xe nhận** | xác nhận chuyển (MQ-02) | nơi đón/nơi trả của các chặng được chuyển; điểm hiện có của B | thêm điểm đón (sau điểm đón chưa tới cuối cùng, trước điểm trả đầu tiên) và điểm trả nếu B chưa có nơi đó; B đổi thứ tự được sau | quyết định (cùng lô) | B (trong phản hồi) |
| MQ-07 | **Nhắc gọi khách khi giờ hẹn đổi** (không tự báo khách — C11) | `orders` ghi sự kiện sửa chặng (`order_leg_updated`, ADR-0047) cho chặng đang có suất mở | chặng, suất, chuyến | nhắc: "Giờ hẹn đón ĐH-… đổi 07:00 → 06:30 — gọi báo khách"; nếu điểm dừng đang ghi đè giờ xe tới → cảnh báo "xem lại giờ xe" | cảnh báo | người phụ trách đơn + tài xế đang lái chuyến có suất của chặng đó |
| MQ-08 | **Đề nghị quá thời gian chờ** | đọc đề nghị `PENDING` quá CH-07 | `proposed_at`, CH-07, bây giờ | hiện "đã hết giờ chờ"; lệnh kế tiếp chạm đề nghị (A rút, A gửi đề nghị mới, B bấm Nhận muộn, văn phòng mở) **đóng** nó thành `EXPIRED` trong lô của lệnh đó | quyết định (cùng lô lệnh sau) | A thấy trên màn: "B chưa nhận — gửi xe khác hoặc gọi văn phòng" |
| MQ-09 | **Tự huỷ đề nghị không còn hợp lệ** | lệnh làm đổi nguồn/đích: A bấm "đã tới" điểm đó, A hoặc B kết thúc chuyến, văn phòng báo huỷ điểm đó | đề nghị `PENDING`/`ESCALATED` liên quan | đề nghị thành `VOID` trong **cùng lô** của lệnh đó | quyết định (cùng lô) | A, B |
| MQ-10 | **Khoá theo mốc khi xếp** | lệnh đổi "ai đi xe nào", đổi xe, đổi tài xế của một chuyến (C17; CH-01) | giờ xuất bến dự kiến, bây giờ, CH-01, cờ đặt gấp của chặng | chặn; hộp "Phá lệ" chỉ cho Quản trị, Toàn quyền (C18); xếp chính chặng đã đặt gấp thì qua | chặn | — |

### 2.4 Phá lệ: luật nào, ai, ghi gì

| Luật | Phá lệ được? | Ai | Ghi gì |
|---|---|---|---|
| LC-01 … LC-18 (lõi) | **Không** — kể cả Toàn quyền. Đổi = ADR mới | — | — |
| CH-01 lúc đặt | Có | ô mới `order.leg.short_notice` — **chỉ Quản trị, Toàn quyền** (C18) | cột `short_notice_*` trên chặng (mã lý do, ghi chú ngắn, người, lúc, số phút đã dùng) + nhật ký `order_leg_short_notice` |
| CH-01 lúc xếp; CH-02 | Có | ô mới `trip.override` — **chỉ Quản trị, Toàn quyền** (C18) | sự kiện `PHA_LE` (mã luật, mã lý do, `policy_id`) + nhật ký; với CH-02: `vc_trip.rest_override_reason_code` |
| CH-04, CH-05 (điều kiện xuất bến, hạng bằng) | **Không** (chủ, 27/9: "chuyến sai điều kiện thì không cho xuất bến") | — | — |
| Đề nghị chuyển bị leo thang (MQ-02) | Chỉ khi luật **không đạt là luật cấu hình** (CH-02); luật lõi không đạt thì chỉ có thể bác | ô `trip.override` (Quản trị, Toàn quyền) nếu ĐP4 = (a) | đề nghị `CONFIRMED`, `decided_mode = NGUOI`, `override_reason_code` |

- **Luồng thay đổi khi xe đang chạy có kiểm CH-01 không?** Chủ đã cho phép rõ các thay đổi "trong lúc chạy", nên **chuyển điểm giữa hai xe không kiểm CH-01**. Văn phòng thêm một chặng **chưa từng xếp** vào xe đang chạy **có** kiểm CH-01 cho chính chặng đó (chặng chưa xếp tới sát giờ là chặng bị sót, phải có người chịu và ghi lý do), **trừ khi** chặng đã mang cờ "đặt gấp" từ lúc đặt (C17: không phá lệ lần nữa).

### 2.5 Dòng dữ liệu: trạng thái của một chặng (hình chiếu)

Một hàm thuần `trangThaiChang(chang, suat[], chuyen[], deNghi[], chinhSach, bayGio)` ở `src/shared/` — **một nguồn** cho bảng điều phối, màn tài xế, màn "dòng dữ liệu". Không lưu cột trạng thái chặng nào.

```
 ĐƠN NHÁP ─xác nhận─► CHƯA XẾP ──xếp đủ suất──► ĐÃ XẾP ──xe xuất bến──► CHỜ ĐÓN ──► ĐÃ ĐÓN n/N ──► ĐÃ TRẢ ──► XONG
 (chỉ đếm)            │  ├ sát mốc (vàng)          │  ├ giữ: lý do (đỏ)        │  ├ vắng k người
                      │  ├ quá mốc (đỏ)            │  └ xếp một phần           │  ├ khách đã huỷ (văn phòng báo)
                      │  └ đặt gấp (nhãn)          │                           │  └ đang chuyển → xe B (đề nghị chờ)
                      │                            │                           │
                      └── chặng đóng / đơn huỷ ────┴── còn suất mở → GIỮ ──────┴── xe gián đoạn → CHƯA XẾP lại (phần chưa đi)
```

- Mỗi bước có **mốc thời gian** và **người hay máy** gây ra (đọc từ `vc_trip_event` + `audit_log` cùng id), để màn "dòng dữ liệu" (§4.3) vẽ **hành trình của một chặng**, ví dụ: "Đặt 18:02 (Lan) → Xếp CX-3009-07 lúc 21:15 (Hùng) → Chuyển sang CX-3009-04 lúc 07:12 (**máy xác nhận theo luật SUC_CHUA_DICH, KHOANG_NGHI_DICH — bản chính sách #3**) → Đã đón 4/4 lúc 07:31 → Đã trả 08:05".

---

## Phần 3 — Bộ máy điều phối ("worker/module" trong lời chủ)

### 3.1 Chạy ở đâu

- **Cùng Worker `tourdao-sales`, trong module `van-chuyen`.** Không lập Worker Cloudflare mới, không lập module mới. "Worker/module" trong lời chủ ứng với **một bộ phận của phân hệ Vận chuyển**, không phải một máy chủ riêng. Lý do:
  - luật sức chứa phải ở **cạnh bảng xe**: Phần II quy tắc 4 cấm view công bố mang con số (chỉ khoá + nhãn + cờ), nên trigger sức chứa không thể nằm ở module khác đọc `vc_vehicle`;
  - mọi bảng của bộ máy là `vc_`, một chủ (5.3);
  - một lần triển khai, một CSDL, một phiên đăng nhập.
- **Nơi đặt mã** (Phần II "Nơi đặt code"):
  - **luật thuần** dùng chung máy chủ + màn hình ở `src/shared/` (tên đề xuất): `dieu-phoi-lich-chung.ts` (`dungLichChung`), `dieu-phoi-trang-thai.ts` (`trangThaiChang`), `dieu-phoi-kiem.ts` (`kiemXep`, `kiemChuyen`, `kiemXuatBen`), `dieu-phoi-goi-y.ts` (MQ-01), `ly-do-giu.ts` (`LyDoGiu` — chỗ sống duy nhất của khái niệm "giữ", K9); đổi giờ VN ↔ mili-giây mở rộng `src/shared/vn-date.ts` (ADR-0047 A1 đã giao);
  - **điều phối nhiều bước có I/O** ở `src/modules/van-chuyen/dieu-phoi.ts` (đọc trạng thái → gọi luật thuần → dựng câu ghi);
  - **SQL** ở `src/modules/van-chuyen/repository.ts` qua `defineSql` (module nghiêm, bài `EXPLAIN`);
  - **route** ở `src/modules/van-chuyen/index.ts`.

### 3.2 Ba phương án kỹ thuật

| | **PA-1 (khuyến nghị): lệnh đồng bộ trong route + luật thuần + CSDL chặn cuối** | PA-2: một Durable Object "điều phối" cho mỗi ngày | PA-3: hàng đợi sự kiện + bộ xử lý nền |
|---|---|---|---|
| Cách chạy | Mỗi thao tác là một yêu cầu: đọc trạng thái → hàm thuần xét → một `db.batch` có điều kiện `version` → trigger chặn cuối → sau lô: báo Bảng tin + đẩy thông báo | Mọi lệnh của ngày D đi qua một Durable Object tên theo ngày; nó giữ bản trong bộ nhớ, xét luật, ghi D1, phát cho màn hình | Route chỉ ghi "lệnh chờ"; bộ xử lý nền (Cloudflare Queues) xét luật, ghi kết quả; màn hình chờ kết quả |
| Chống chạy đua | D1 chạy các lô **lần lượt** trên một CSDL (SQLite một người ghi — theo tài liệu Cloudflare; **phải kiểm bằng bài chạy đua**, §8) → trigger luôn thấy trạng thái đã chốt; `version` chặn "quyết trên dữ liệu cũ" | tuyệt đối (một luồng) | theo thứ tự hàng đợi; vẫn cần trigger |
| "Tính lại" khi có sự kiện | Không có gì lưu sẵn để tính lại: lịch chung, cảnh báo, "giữ" dựng lại mỗi lần đọc | DO phải tự đồng bộ bộ nhớ với D1 (đơn hàng đổi ở `orders` không đi qua DO) | như PA-1 + độ trễ hàng đợi |
| Tài xế B bấm Nhận | biết kết quả **ngay** trong phản hồi | biết ngay | **không** biết ngay; cần kênh báo lại |
| Hạ tầng thêm | **không** (Bảng tin `BangTin` đã có; Cron đã có) | thêm một lớp Durable Object (migration `v2` trong `wrangler.jsonc`) | thêm Queues (ADR-0036 đã loại Queues vì cùng lý do) |
| Chi phí Cloudflare (ước tính, chưa đo) | vài nghìn dòng D1 đọc mỗi lần mở bảng; rất nhỏ so với hạn mức gói Workers Paid đang dùng | thêm yêu cầu + thời gian chạy DO; nhỏ nhưng khác 0 | thêm phí Queues theo thao tác; nhỏ |
| Độ phức tạp | **thấp**: toàn bộ luật test bằng `node --test`; vỏ route như mọi route hiện có | cao: hai nơi giữ trạng thái (bộ nhớ DO, D1) có thể lệch; chuyến qua nửa đêm hay chuyển giữa hai ngày chạm hai DO; vỏ DO không chạy dưới `node --test` (như `tram.ts`) | cao: lệnh thất bại phải báo ngược; bộ xử lý nền ghi dữ liệu = **tác nhân tự động** theo Hiến chương 5.11 → cần tài khoản riêng |
| Cửa | **hai chiều**: luật thuần dùng lại nguyên nếu sau này chuyển PA-2 | **một chiều mềm**: thêm lớp DO làm Cloudflare **chặn `wrangler rollback`** về mọi bản trước đó (đã ghi ở `wrangler.jsonc` cho lớp `BangTin`) | hai chiều nhưng tốn |
| Khi nào nên đổi | — | chỉ khi đo thấy nhiều lỗi "vừa có thay đổi" (409) làm người dùng khó chịu | không |

**Khuyến nghị PA-1.** Ở quy mô Tour Đảo (vài chục xe, vài trăm chặng mỗi ngày), một CSDL chạy lô lần lượt cộng khoá lạc quan là đủ; mọi luật nằm ở hàm thuần có test; không thêm hạ tầng. Câu hỏi ĐP8 hỏi chủ bằng lời thường.

### 3.3 Khuôn một lệnh (PA-1)

```
 Lệnh (route; cổng; can() TRƯỚC mọi truy vấn)
   │
   ▼
 Đọc  ─ chuyến + version, suất, điểm, đề nghị, chính sách hiệu lực (vc_)
      ─ hàm hẹp của orders (chặng, số người, tên — chỉ trường được phép)
      ─ hàm công bố của parties (giấy tờ, không số; nhà xe – tài xế)
   │
   ▼
 Xét (hàm thuần, tất định) ──► CHO_QUA | CHAN(lyDo[]) | CAN_PHA_LE(lyDo[]) | LEO_THANG(lyDo[])
   │                                  │ 409 + lý do bằng lời    │ hộp "Phá lệ" (ô trip.override)
   ▼
 Một lô ghi (db.batch — tất cả hoặc không gì, K8). THỨ TỰ CÂU LÀ HỢP ĐỒNG
 (cùng khuôn wonGuard của orders/repository.ts: cổng → nhật ký changes() > 0 → câu ghi chính có điều kiện):
   1. CỔNG — MỘT câu quyết định lô thắng hay thua, và ĐÓNG DẤU LỆNH lên chuyến:
        UPDATE vc_trip SET version = version + 1, last_cmd_id = :cmd, updated_at = :at
         WHERE id = :T AND version = :v [AND điều kiện trạng thái của lệnh]
      (lệnh chạm hai chuyến: "cổng đôi" bên dưới)
   2. NHẬT KÝ — auditStatement({ id: :cmd, … }, "changes() > 0") ĐỨNG NGAY SAU câu cổng
      (changes() chỉ thấy câu ngay trước nó)
   3. CÂU GHI CHÍNH — mỗi câu của van-chuyen (defineSql) mang điều kiện đọc CHÍNH bảng vc_:
        … AND EXISTS (SELECT 1 FROM vc_trip WHERE id = :T AND last_cmd_id = :cmd)
      gồm vc_trip_event (id = :cmd), vc_transfer_check, suất, điểm…;
      câu đổi trạng thái chuyến (kết thúc, huỷ) luôn ĐỨNG CUỐI (§2.1a)
   4. trigger CSDL chặn cuối (LC-01 … LC-16) chạy ở từng câu
   │
   ├─ câu cổng chạm 0 dòng → mọi câu sau không chạy → đọc lại, trả đúng lỗi:
   │    409 "vừa có thay đổi" / "đề nghị đã hết giờ" / "không còn hợp lệ"
   ▼
 Sau lô (Hiến chương 5.10, 5.16 — bắn-và-quên, lỗi không làm hỏng lô):
   ctx.baoThayDoiChuyen → Bảng tin (màn đang mở tải lại) + gõ cửa điện thoại (từ lượt duyệt 2)
```

- **Vì sao "dấu lệnh" `vc_trip.last_cmd_id`, không phải `EXISTS(audit_log)`:** `van-chuyen` là module **nghiêm** (STRICT): SQL của nó chỉ được đọc bảng của chính nó hoặc view công bố (Phần II quy tắc 4 và mục "Ranh giới SQL của module nghiêm"); đọc thẳng `audit_log` chỉ là **ngoại lệ có hạn của `orders`** (LEGACY — "`wonGuard` của `orders` đọc `audit_log` (tới N2)"). Dấu lệnh là cột của chính `vc_trip`, mang **id riêng của request** (cùng vai trò `AuditInput.id` trong `wonGuard`): bên thua không bao giờ lọt qua, kể cả khi hai request đọc cùng một `version`. (So `version = v + 1` thì **không** được: bên thắng đã đặt `v + 1`, nên câu sau của bên thua cũng thấy đúng.) Cách này **đơn giản hơn** phương án còn lại — đưa một view `v_aud_*` vào lượt 1 — vì không thêm view, không thêm cạnh đọc `van-chuyen → audit` ở tầng SQL, không thêm quyết định nào; hàng rào `EXPLAIN` sẵn có tự kiểm được.
- **Vì sao không chỉ nối `changes() > 0` như `dispatch`:** lô của điều phối có nhiều câu, trong đó có câu hợp lệ mà chạm 0 dòng (vd "thêm điểm trả nếu xe chưa có"); `changes()` chỉ thấy câu **ngay trước**, nên chuỗi sẽ gãy giữa chừng. `changes() > 0` chỉ dùng ở hai chỗ: câu nhật ký đứng ngay sau câu cổng (vì `auditStatement` nhận điều kiện là chữ SQL cố định, không nhận tham số) và câu cổng của lệnh tiến độ (dưới).
- **Cổng đôi — lệnh chạm hai chuyến** (xác nhận chuyển điểm A → B; cứu hộ). Gộp hai khoá lạc quan thành **một** cổng:
  1. `UPDATE vc_trip SET version = version + 1, last_cmd_id = :cmd … WHERE id = :A AND version = :vA AND EXISTS (SELECT 1 FROM vc_trip WHERE id = :B AND version = :vB)`
  2. `UPDATE vc_trip SET version = version + 1, last_cmd_id = :cmd … WHERE id = :B AND version = :vB AND EXISTS (SELECT 1 FROM vc_trip WHERE id = :A AND last_cmd_id = :cmd)`
  3. nhật ký `changes() > 0` ngay sau câu 2;
  4. mọi câu sau mang `EXISTS (SELECT 1 FROM vc_trip WHERE id = :B AND last_cmd_id = :cmd)`.
  - Lô là một giao dịch, không lệnh nào chen giữa câu 1 và câu 2. Vì vậy câu 1 thắng ⇔ cả hai `version` còn đúng ⇔ câu 2 thắng: **cả hai chuyến cùng được đóng dấu hoặc không chuyến nào**, không có chuyến bị tăng `version` lẻ. Dấu trên B là **cổng duy nhất** cho mọi câu sau (B chỉ mang dấu khi A đã mang).
  - Tổng quát n chuyến: câu cổng đầu kiểm `version` của mọi chuyến; câu cổng thứ i đòi dấu của câu thứ i − 1; câu nhật ký và mọi câu sau dựa vào dấu của câu cổng cuối.
- **Lệnh tiến độ của tài xế** (đã tới, đã đón, vắng, khách đã huỷ, đã trả): câu **đầu** là câu chuyển trạng thái của chính suất/điểm (`… WHERE id = ? AND status = 'WAITING'`); câu cổng đứng **ngay sau**: `UPDATE vc_trip SET version = version + 1, last_cmd_id = :cmd WHERE id = :T AND status = 'RUNNING' AND changes() > 0`; rồi nhật ký `changes() > 0`; rồi sự kiện có dấu. Không kiểm `version` (lệnh không dựa vào kế hoạch) nhưng **có tăng** — để quyết định kế hoạch đang dựa trên dữ liệu cũ bị phát hiện.
- **Lệnh kế hoạch** (xếp, dời, rút, đổi xe, đổi tài xế, đổi thứ tự, thêm điểm, báo huỷ, gửi/nhận/duyệt đề nghị) kiểm và tăng `version` ở câu cổng. **Tạo chuyến mới:** câu cổng là chính câu `INSERT INTO vc_trip (…, last_cmd_id) VALUES (…, :cmd)`.
- **Tự thử lại một lần** cho lệnh mà máy xét được hoàn toàn (B bấm Nhận): câu cổng thua → đọc lại, xét lại, ghi lại một lần với `version` mới; vẫn thua → trả kết quả xét mới (có thể là leo thang). Tài xế không phải bấm lại vì một thay đổi không liên quan.
- **Hàng rào (lát 1.5):** bài kiểm dựng danh sách câu của từng lệnh rồi khẳng định: câu cổng đứng đầu (hoặc thứ hai với lệnh tiến độ), câu nhật ký ngay sau với `changes() > 0`, mọi câu sau có dấu lệnh, câu đổi trạng thái chuyến đứng cuối. Đảo một câu → đỏ.

### 3.4 Chống chạy đua — các ca đã nghĩ tới

| Hai việc cùng lúc | Cái chặn | Kết quả |
|---|---|---|
| Hai người văn phòng cùng sửa một chuyến | `version` | người sau: 409 "Chuyến vừa được người khác sửa, tải lại" |
| Văn phòng thêm điểm vào xe B đúng lúc B bấm Nhận | `version` của B + tự thử lại một lần | nếu vẫn đủ chỗ → máy xác nhận; không → leo thang |
| Hai đề nghị cùng đổ khách vào B, cộng lại vượt chỗ | trigger LC-02 (lô chạy lần lượt) + `version` | đề nghị sau không đạt → leo thang |
| A bấm "đã tới Alibu" đúng lúc B bấm Nhận điểm Alibu | `version` của A (cả hai lô tăng) | lô "đã tới" thắng trước → trong cùng lô đề nghị thành `VOID` (MQ-09); lô Nhận thua → B thấy "đề nghị không còn hợp lệ" |
| Tài xế bấm "Đã đón" hai lần vì mất sóng | `request_id` UNIQUE | lần sau trả lại kết quả lần đầu |
| Văn phòng đổi tài xế của xe A đúng lúc A gửi đề nghị | `version` của A + điều kiện "người gửi đang lái A" trong câu ghi | lô sau: 409 |
| Đơn bị huỷ ở `orders` đúng lúc văn phòng xếp chặng của đơn đó | trigger LC-09 đọc `v_ord_order_flag` **trong** lô xếp | huỷ trước → lô xếp ABORT; xếp trước → chuyến bị **giữ** tới khi gỡ |

### 3.5 Tính lại khi có sự kiện

Không có bảng "kết quả tính sẵn" nào, nên "tính lại" = **báo cho màn hình liên quan tải lại** + (từ lượt duyệt 2) **báo đúng người**.

| Sự kiện | Nguồn | Máy làm trong lô | Màn nào tải lại (Bảng tin) | Ai nhận thông báo (lượt duyệt 2, D6) |
|---|---|---|---|---|
| Đơn có chặng được xác nhận | `orders` | — | bảng điều phối (tin đơn **đã có**, nhãn `tat-ca`: người có `order.view = any` gồm đúng Bán hàng, Kế toán, Quản trị, Toàn quyền) | chặng **đặt gấp**: người điều xe |
| Giờ hẹn / nơi đón của chặng đổi | `orders` (`order_leg_updated`) | — | như trên | MQ-07: người phụ trách đơn + tài xế đang chở chặng |
| Số khách đổi | `orders` | — | như trên | người điều xe (nếu chặng đã xếp) |
| Đơn huỷ / chặng đóng | `orders` | — | như trên | người điều xe + tài xế đang chở chặng |
| Xếp, dời, rút, đổi xe, đổi tài xế, huỷ chuyến | `van-chuyen` | tăng `version` | bảng điều phối (nhãn mới `dieu-xe`) + màn của tài xế liên quan (`nguoi:<id>`) | tài xế được xếp / bị gỡ / chuyến đổi giờ / chuyến huỷ (lượt 2 D5) |
| A gửi đề nghị chuyển | `van-chuyen` | — | màn của B | **B** (cần bấm Nhận) |
| B nhận → máy xác nhận / leo thang | `van-chuyen` | đổi suất, thêm điểm (MQ-06) | bảng điều phối + màn A, B | xác nhận: A, B (+ người điều xe, tin thường) · leo thang: người điều xe (cần xử lý) |
| Văn phòng thêm điểm / báo huỷ khi xe đang chạy | `van-chuyen` | — | màn tài xế | tài xế của chuyến |
| Xe hỏng (kết thúc gián đoạn) | `van-chuyen` | các điểm chờ → bỏ qua | bảng điều phối | người điều xe |
| Tài xế Từ chối chuyến (D8) | `van-chuyen` | đóng dòng lái | bảng điều phối | người điều xe |

- Tài xế **không** có `order.view` nên **không bao giờ** nhận tin đơn của Bảng tin hiện có — không lộ gì mới (đúng ADR-0022 điều 3).

### 3.6 Đề xuất hay quyết định (nguyên tắc)

- Máy chỉ **quyết định** khi (a) chủ đã chọn rõ (MQ-02: B nhận → tự xác nhận), hoặc (b) là **hệ quả tất yếu trong cùng lô** của một lệnh người vừa ra (MQ-06 thêm điểm cho xe nhận; MQ-08, MQ-09 đóng đề nghị hết giờ / hết hợp lệ).
- Còn lại máy **đề xuất** (MQ-01), **cảnh báo** (MQ-04, MQ-07) hoặc **giữ** (MQ-05, MQ-10). Người quyết cuối (C12).

### 3.7 Nhật ký cho mọi quyết định tự động

- `audit_log.staff_id` = **người ra lệnh cuối** (tài xế B khi máy tự xác nhận). `action` = `trip_transfer_confirmed`; `detail` ví dụ: *"CX-3009-07 → CX-3009-04: 4 khách, 1 điểm đón. Máy xác nhận theo luật SUC_CHUA_DICH (12/16), TRUNG_GIO_DICH, KHOANG_NGHI_DICH, DIEM_CHUA_TOI — chính sách #3"*. Không tên, không SĐT.
- `vc_trip_event.decided_mode = 'MAY'` (cột có kiểu, để lọc "mọi việc máy tự quyết hôm nay" mà không phân tích chữ).
- `vc_transfer_check`: mỗi luật một dòng có kiểu (§1.8), trỏ dòng chính sách đã dùng (5.6).
- **Vì sao không cần "tài khoản máy" (Hiến chương 5.11):** máy không tự hành động; phần "tự xác nhận" là bước **kiểm luật bên trong lệnh Nhận của B** (Hiến chương 1.2: lệnh → kiểm luật → một lô). Người ra lệnh là B. Nếu sau này máy **tự** làm việc không có lệnh người (vd tự xếp xe theo lịch), đó là tác nhân tự động → cần tài khoản riêng và ADR riêng. Bản này **không** có việc nào như vậy.
- **Không phải AI** (5.15): mọi luật là mã tất định, có test và bộ ca mẫu điều phối (§8).

### 3.8 Cron và việc theo giờ

- Cron hiện có (`*/15`, đồng bộ danh mục) **không** ghi dữ liệu Vận chuyển. Bản này không cho Cron ghi (5.11).
- Việc phụ thuộc giờ **tính lúc đọc**: sát mốc, quá mốc (MQ-04); đề nghị hết giờ chờ (MQ-08 — trạng thái trên màn là "hết giờ", dòng CSDL đóng thành `EXPIRED` trong lô của lệnh kế tiếp chạm tới nó).
- **Không làm ở bốn lượt duyệt này, ghi `docs/BACKLOG.md` khi duyệt:** Cron chỉ-đọc quét "chặng sắp quá mốc chưa xếp" rồi gõ cửa điện thoại người điều xe. Đây là **nguồn thông báo mới không sinh từ nhật ký** (ADR-0034 điều 1 chỉ có hình chiếu nhật ký) nên cần ADR riêng. Tới lúc đó, cảnh báo theo giờ chỉ hiện trên bảng điều phối.

---

## Phần 4 — Bảng điều khiển (màn hình)

Khung chữ dưới đây chỉ để **nói nội dung và bố cục thô**. Giao diện thật chủ vẽ trên Claude Design rồi làm đúng bản vẽ (tiền lệ ADR-0040). Ký hiệu: `[!]` cảnh báo vàng, `[X]` đỏ/giữ, `[<>]` đang chuyển, `[G]` đặt gấp, `[M]` máy quyết.

### 4.1 Màn "Điều phối xe" ngày D — cho người xếp xe (Bán hàng, Quản trị, Toàn quyền)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ĐIỀU PHỐI XE     ◄ Thứ Tư 30/09 ►     [Gợi ý xếp]  [+ Chuyến mới]        Mốc tối thiểu: 6 giờ    │
│ 42 chặng · 34 đã xếp · 6 chưa xếp (2 sát mốc, 1 quá mốc) · 11 chuyến · 4 cần xử lý · 5 đơn nháp  │
├──────────────────────────┬────────────────────────────────────────────────────┬─────────────────┤
│ CHƯA XẾP (6)             │ DÒNG THỜI GIAN THEO XE    05   06   07   08   09   │ CẦN XỬ LÝ (4)   │
│                          │                                                    │                 │
│ 06:30 Sheraton → Cảng VP │ 79B-123.45 · 15 chỗ · Hùng                         │ [X] CX-07 giữ:  │
│  ĐH-1024 · 4 người       │   ▐▀▀▀ CX-07  12/15 ▀▀▀▌          ▐ CX-11 ▌        │   thiếu 2 tên   │
│  [!] còn 1 giờ 40 tới mốc│    Sher  Amia  MThanh ► CảngVP ► BTDL              │   (văn phòng)   │
│                          │                                                    │                 │
│ 07:00 Alibu → Bến TDL    │ 79B-678.90 · 29 chỗ · Tuấn                         │ [<>] Đề nghị    │
│  ĐH-1031 · 2 người  [G]  │        ▐▀▀▀▀▀ CX-04  22/29 ▀▀▀▀▀▌                  │   CX-07 → CX-04 │
│  [X] quá mốc             │         InterC  ABSq  Alibu ► BTDL                 │   chờ duyệt:    │
│                          │                                                    │   khoảng nghỉ   │
│ 08:15 AB Square → S.bay  │ 79B-111.22 · 7 chỗ  · (chưa có tài xế)             │                 │
│  ĐH-1040 · 3 người       │                                                    │ [!] ĐH-1019 đổi │
│                          │ NHÀ XE MINH PHÁT                                   │   giờ hẹn 07:00 │
│ … kéo thả vào một chuyến │ 79B-555.66 · 45 chỗ · Long                         │   → 06:30: gọi  │
│    hoặc bấm "Gợi ý"      │   ▐▀▀ CX-09  30/45 ▀▀▌                             │   báo khách     │
└──────────────────────────┴────────────────────────────────────────────────────┴─────────────────┘
```

- **Cột trái "Chưa xếp":** chặng của đơn đã xác nhận chưa đủ suất; sắp theo giờ hẹn; nhãn sát mốc / quá mốc / đặt gấp / thiếu tên; kéo vào một khối chuyến (hỏi số người nếu tách đoàn).
- **Giữa "Dòng thời gian theo xe":** mỗi xe một hàng (nhóm theo chủ xe: công ty trước, rồi từng nhà xe); mỗi chuyến một khối từ giờ bắt đầu tới giờ kết thúc dự kiến, ghi mã, tải "12/15", dãy điểm đón ► điểm trả; màu theo trạng thái (lên kế hoạch / đang chạy / xong / giữ). Vạch dọc "bây giờ" và vạch "mốc tối thiểu" (bây giờ + 6 giờ): khối nằm **trái** vạch mốc thì mọi thay đổi cần phá lệ.
- **Cột phải "Cần xử lý":** chuyến bị giữ (lý do + ai xử lý), đề nghị chuyển leo thang, nhắc gọi khách, chặng quá mốc, chuyến chưa có tài xế.
- **Thao tác:** tạo chuyến (xe, tài xế, giờ), kéo chặng vào/ra (trước xuất bến), đổi thứ tự điểm, ghi đè giờ xe tới, đổi xe/tài xế, huỷ chuyến (lý do), **xuất bến bấm thay** (hiện danh sách điều kiện), phá lệ (lý do), duyệt/bác đề nghị leo thang, **khi xe đang chạy**: lượt 1 không có thao tác kế hoạch nào (chỉ bấm tiến độ thay tài xế); từ lượt 2 có đúng hai nút "Thêm điểm đón" và "Báo huỷ điểm" (LC-15).
- **Nút "Gợi ý xếp"** chỉ có từ lát 2.5 (MQ-01); lượt 1 người xếp xe tự chọn.
- **Trong 6 giờ trước giờ xuất bến** (C17, C18): Bán hàng thấy khối chuyến bị khoá phần "ai đi xe nào", đổi xe, đổi tài xế, kèm dòng "Cần Quản trị phá lệ"; vẫn đổi được thứ tự điểm, giờ xe tới (có ghi). Quản trị, Toàn quyền thấy nút "Phá lệ" (chọn lý do). Cột "Cần xử lý" của Quản trị có mục **"Đơn nháp chờ duyệt đặt gấp"**.
- **Trên điện thoại** (người xếp xe hay dùng iPhone): ba cột thành ba thẻ trượt "Chưa xếp / Xe / Cần xử lý"; dòng thời gian thành danh sách chuyến theo giờ.

### 4.2 Chi tiết một chuyến (bấm vào khối chuyến)

```
┌ CX-3009-07 · 79B-123.45 (15 chỗ) · Tài xế Hùng · 05:50–08:30 · ĐANG CHẠY (xuất bến 05:52) ┐
│ ĐIỂM DỪNG                               GIỜ HẸN  XE TỚI   SUẤT   TRẠNG THÁI                 │
│ 1 Đón  Sheraton                         06:00    05:58    4      Xong · 4 đã lên             │
│ 2 Đón  Amiana                           06:15    —        3      Đã tới                      │
│ 3 Đón  Alibu (nhận từ CX-04 lúc 06:20 [M])06:30  —        2      Chờ                         │
│ 4 Trả  Cảng Vinpearl                     —       —        7      Chờ                         │
│ 5 Trả  Bến Tàu Du lịch                   —       —        2      Chờ                         │
│ Tải hiện tại: 9/15 · (từ lượt 2) [Thêm điểm đón] [Báo huỷ điểm]                              │
├ ĐIỀU KIỆN XUẤT BẾN (bản chụp 05:52): xe · tài xế · GPLX D2 còn hạn · đủ 9/9 tên · đạt      ┤
├ NHẬT KÝ: 05:52 Xuất bến (Hùng) · 06:20 Nhận điểm Alibu từ CX-04 — máy xác nhận theo luật … ┤
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Màn "Dòng dữ liệu" — trực quan hoá luồng của Vận chuyển

*Thi công ở lát 2.4 (sau lượt 1; thiết kế giữ nguyên). Lượt 1 chỉ có trạng thái từng chặng trên màn V1 — cùng hàm `trangThaiChang`.*

Ba cách nhìn, cùng đọc **một** hàm `trangThaiChang` (§2.5):

```
(a) PHỄU NGÀY 30/09 — mỗi cột là một bước, số là số chặng; bấm một cột để lọc
 Đơn nháp  Chưa xếp   Đã xếp    Xe đã chạy  Đã đón    Đã trả    Xong
   5    ►    6     ►   20    ►     9     ►    4    ►    2    ►   1
          (2 sát mốc) (1 giữ)  (1 đang chuyển)(1 vắng)

(b) HÀNH TRÌNH MỘT CHẶNG — ĐH-1031 · Alibu → Bến TDL · 2 người
 29/09 18:02  Đặt (Lan) — đặt gấp: "Khách đặt sát giờ"
 29/09 21:15  Xếp vào CX-3009-04 (Hùng)
 30/09 05:40  CX-04 xuất bến — đủ 2/2 tên
 30/09 06:18  Tài xế Tuấn đề nghị chuyển điểm Alibu sang CX-07
 30/09 06:20  Tài xế Hùng nhận — MÁY XÁC NHẬN theo luật SUC_CHUA_DICH (9/15), KHOANG_NGHI_DICH… (#3)
 30/09 06:33  Đã đón 2/2 (Hùng)          30/09 07:05  Đã trả Bến TDL

(c) NHẬT KÝ QUYẾT ĐỊNH CỦA MÁY — mọi việc decided_mode = MÁY trong ngày, lọc theo luật
```

- Màn này **chỉ đọc**; ai xem được bảng điều phối thì xem được màn này (không thêm ô).

### 4.4 Màn tài xế (điện thoại)

```
┌ CUỐC CỦA TÔI ───────────────┐  ┌ CX-3009-04 · ĐANG CHẠY ─────────┐  ┌ CHUYỂN ĐIỂM ĐÓN ────────────┐
│ Hôm nay 30/09               │  │ 1 InterContinental 06:00  Xong  │  │ Điểm: Alibu (2 khách)       │
│ ▸ CX-04 05:40–08:10         │  │ 2 AB Square 06:15   [Đã tới]    │  │ Chuyển sang xe:             │
│   79B-678.90 · 22 khách     │  │    Lan N. (1990) [Đã đón][Vắng] │  │  ○ CX-07 Hùng · còn 6 chỗ   │
│   ĐANG CHẠY                 │  │    Minh T. (1985) …             │  │    đang tới Amiana          │
│ ▸ CX-12 14:00–16:00         │  │    SĐT liên hệ: 09xx…         │  │  ○ CX-09 Long · còn 15 chỗ  │
│   Chưa đủ điều kiện:        │  │ 3 Alibu 06:30  [Chuyển xe khác] │  │ [Gửi đề nghị]               │
│   thiếu 2 tên (văn phòng)   │  │ 4 Trả Bến TDL                   │  │ Chờ Hùng nhận… còn 8 phút   │
│ Ngày mai 01/10              │  │ Văn phòng: đã báo huỷ điểm 3 —  │  └─────────────────────────────┘
│ ▸ CX-02 06:00–09:00         │  │   vẫn tới, ghi "khách đã huỷ"   │  ┌ ĐỀ NGHỊ GỬI TỚI TÔI ────────┐
│ [Đề nghị gửi tới tôi (1)]   │  │ [Kết thúc chuyến]               │  │ Tuấn (CX-04) nhờ đón Alibu, │
└─────────────────────────────┘  └─────────────────────────────────┘  │ 2 khách → Bến TDL.          │
                                                                        │ Sau khi nhận: 11/15 chỗ.    │
                                                                        │ [Nhận]  [Không nhận: lý do] │
                                                                        └─────────────────────────────┘
```

- **Tên + năm sinh + SĐT người liên hệ** chỉ hiện **trong ngày chạy** (C3); ngày khác chỉ thấy số người.
- Danh sách "chuyển sang xe" hiện những gì về xe khác: **chờ ĐP9**. Khung trên là phương án khuyến nghị (biển số không cần, chỉ mã chuyến, tên tài xế, số chỗ còn, điểm sắp tới; **không** tên khách của xe khác).
- Nút "Nhận" hiện **trước** số chỗ sau khi nhận (máy tính sẵn, cùng hàm thuần với máy chủ).

### 4.5 Kế toán — chỉ xem

- Cùng màn 4.1, 4.2, 4.3, **không** có nút thao tác. Không thêm ô: Kế toán có `trip.view = any`, không có `trip.dispatch`.

### 4.6 Biểu mẫu đơn — phần chặng và mốc 6 giờ

```
 Dịch vụ: Vé cáp treo Vinpearl  (danh mục: hai chiều)  → máy tạo sẵn 2 chặng, sửa được
 ┌ Chiều đi ─ ngày 30/09 ─ giờ đón [06:30] ─ nơi đón [Sheraton ▾] ─ nơi trả [Ga cáp treo ▾] ┐
 │ [!] Giờ đón cách bây giờ 4 giờ 10 phút — dưới mốc 6 giờ.                                    │
 │     Quản trị / Toàn quyền: [Đặt gấp — chọn lý do ▾] [ghi chú ngắn]                            │
 │     Bán hàng, Thực tập, Đối tác: [Lưu nháp] được — nút Xác nhận khoá: "Cần Quản trị duyệt"  │
 └────────────────────────────────────────────────────────────────────────────────────────────┘
 ┌ Chiều về ─ ngày 30/09 ─ giờ đón [16:00] ─ nơi đón [Ga cáp treo] ─ nơi trả [Sheraton] ─ [Bỏ chặng] ┐
```

### 4.7 Cấu hình

- **Chính sách điều phối** (Toàn quyền): mốc tối thiểu, khoảng nghỉ, cảnh báo sát mốc, (lượt 2) thời gian chờ nhận, công tắc tự xác nhận; mỗi lần lưu = một dòng mới có ngày hiệu lực; hiện lịch sử các bản.
- **Điều kiện xuất bến, bảng hạng bằng** (Toàn quyền): như 1b B2.
- **Danh mục lý do** (Quản trị): theo nhóm.
- **Mẫu chặng theo dịch vụ** (lượt 4, chờ ĐP10).

### 4.8 Danh sách màn cần vẽ trên Claude Design

| # | Màn | Ai dùng | Trạng thái cần vẽ | Lượt |
|---|---|---|---|---|
| V1 | Điều phối xe ngày D (máy tính + điện thoại) | Bán hàng, Quản trị, Toàn quyền; Kế toán (chỉ xem) | trống; có chặng chưa xếp; sát mốc; quá mốc; chuyến bị giữ; đang chạy; kéo thả; hộp phá lệ | 1 |
| V2 | Chi tiết chuyến | như V1 | lên kế hoạch; đang chạy; đã xong; gián đoạn; bản chụp xuất bến | 1 |
| V3 | Tạo / sửa chuyến (xe, tài xế, giờ; lý do khi huỷ) | người xếp xe | xe không đủ hạng; trùng giờ; dưới mốc | 1 |
| V4 | Dòng dữ liệu: phễu, hành trình một chặng, nhật ký máy | như V1 | — | sau lượt 1 — lát 2.4 |
| V5 | Cuốc của tôi (tài xế) | Tài xế công ty (lượt 1); tài xế đối tác chỉ từ lượt 3 nếu ĐP12 cho mở (D7) | hôm nay / ngày mai; chưa đủ điều kiện xuất bến | 1 |
| V6 | Chuyến đang chạy (tài xế): điểm, khách, nút Đã tới / Đã đón / Vắng / Khách đã huỷ / Đã trả / Kết thúc / Kết thúc gián đoạn; bổ sung tên (từ lượt 2) | tài xế; văn phòng bấm thay | điểm được văn phòng báo huỷ; điểm mới thêm; mất mạng (bấm lại) | 1 |
| V7 | Xuất bến: danh sách điều kiện đạt / chưa đạt | tài xế; văn phòng | đạt; bị giữ với lý do | 1 |
| V8 | Gửi đề nghị chuyển điểm; chờ nhận (đếm ngược) | tài xế A | chọn điểm, chọn xe; hết giờ chờ | 2 |
| V9 | Đề nghị gửi tới tôi: Nhận / Không nhận | tài xế B | đạt → đã xác nhận; không đạt → đã chuyển văn phòng | 2 |
| V10 | Hộp đề nghị leo thang (văn phòng duyệt / bác) | người có ô `trip.override` | luật cấu hình không đạt (duyệt được); luật lõi không đạt (chỉ bác) | 2 |
| V11 | Thêm điểm đón vào xe đang chạy; báo huỷ điểm | người xếp xe | chặng đặt gấp; dưới mốc cần lý do | 2 |
| V12 | Biểu mẫu đơn: phần chặng (tự tạo theo dịch vụ), cảnh báo mốc, đặt gấp | người lập đơn | trong mốc; dưới mốc có quyền / không quyền | 1 (mốc) · 4 (tự tạo chặng) |
| V13 | Cấu hình chính sách điều phối; danh mục lý do | Toàn quyền; Quản trị | lịch sử các bản | 1 |
| V14 | Mẫu chặng theo dịch vụ (nếu ĐP10 = trong app) | Quản trị | — | 4 |
| V15 | Từ chối chuyến; báo bận (lượt 2 cũ D3, D4) | tài xế | — | 3 |

- **Không có bản đồ** ở bốn lượt này (*giả định G-05*): bản đồ cần dịch vụ ngoài (dữ liệu điểm đón ra bên thứ ba, thêm khoá bí mật, thêm chi phí). Máy vì thế **không biết thời gian đi đường**; gợi ý và cảnh báo trễ chuyến chỉ dựa vào giờ hẹn và giờ dự kiến người nhập.

---

## Phần 5 — Luồng từng tình huống

Mỗi bảng: **Ai** làm gì · **Máy** làm gì · **Ghi** gì (một lô trừ khi nói khác). Ví dụ lấy từ lời chủ ([HĐ] mục 2): xe A (CX-07, 15 chỗ, tài xế Hùng) đón Sheraton → Amiana → Mường Thanh rồi trả Cảng Vinpearl và Bến Tàu Du lịch; xe B (CX-04, 29 chỗ, tài xế Tuấn) đón InterContinental → AB Square → Alibu.

### 5.1 Đặt mới (đủ sớm)

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Lan lập đơn "Vé cáp treo Vinpearl", 4 khách, ngày mai | tra mẫu chặng của dịch vụ (lượt 4; trước đó Lan tự thêm chặng) → tạo sẵn chiều đi + chiều về | — |
| 2 | Lan nhập giờ đón 06:30, nơi đón Sheraton, tên 2/4 khách | kiểm mốc: còn 15 giờ ≥ 6 giờ → qua | đơn nháp + chặng + 2 hành khách (ADR-0047) |
| 3 | Lan xác nhận đơn | — | `confirmed`; tin đơn hiện có tới `tat-ca` |
| 4 | — | bảng điều phối của người đang mở tải lại: chặng hiện ở "Chưa xếp", nhãn "thiếu 2 tên" | — |

### 5.2 Đặt gấp (dưới 6 giờ) — Bán hàng nhờ Quản trị (C18)

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Lan (Bán hàng) lập đơn lúc 02:20 cho giờ đón 06:30 | mốc: còn 4 giờ 10 < 6 giờ → cảnh báo "Dưới mốc 6 giờ — cần Quản trị duyệt đặt gấp" | — |
| 2 | Lan lưu nháp | lưu được, có cảnh báo (C22 — ĐP2(v); nháp chưa xếp được — LC-09) | đơn nháp + chặng (bản cuối) |
| 3 | Lan bấm Xác nhận | kiểm lại mốc **trong** câu xác nhận (C17): chặng dưới mốc, chưa đặt gấp → **chặn** 409 "Cần Quản trị duyệt đặt gấp" | — |
| 4 | Lan gọi Quản trị (lượt 1 chưa có tin tự động); Quản trị thấy đơn ở mục "Đơn nháp chờ duyệt đặt gấp" trên bảng điều phối (MQ-04) | — | — |
| 5 | Quản trị (hoặc Toàn quyền) mở đơn, bấm "Đặt gấp", chọn lý do "Khách đặt sát giờ" | ô `order.leg.short_notice` (chỉ Quản trị, Toàn quyền); kiểm mã lý do | chặng mang `short_notice_*` (lý do, người, lúc, số phút đã dùng 360) + nhật ký `order_leg_short_notice` |
| 6 | Lan (hoặc Quản trị) xác nhận | mốc: chặng đã đặt gấp → qua | tin đơn; (lượt 2) tin "đặt gấp" tới người điều xe |
| 7 | Người xếp xe (kể cả Bán hàng) xếp chặng vào chuyến xuất bến 05:50 | chuyến đã trong 6 giờ, nhưng **chính chặng này** đã đặt gấp → qua, không ghi lý do lần nữa (C17). Dời **khách khác** trong chuyến đó vẫn cần Quản trị phá lệ | suất |

- Thực tập, Đối tác: như Bán hàng (lưu nháp được, không xác nhận được dưới mốc; nhờ văn phòng).
- Sửa ngày, giờ, nơi đón, nơi trả của **đơn đã xác nhận** khi đã dưới mốc: chỉ Quản trị, Toàn quyền, kèm lý do (C17, C18).

### 5.3 Xếp xe (tối hôm trước)

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Hùng (Bán hàng) mở Điều phối ngày 30/09 | dựng lịch chung (§1.3); MQ-04 cảnh báo | — |
| 2 | *(từ lát 2.5)* Hùng bấm "Gợi ý xếp"; trước đó Hùng tự chọn xe cho từng cụm đón | MQ-01: gom chặng cùng nơi trả, giờ gần nhau; đề xuất CX-07 cho Sheraton, Amiana, Mường Thanh | không ghi |
| 3 | Hùng tạo CX-07 (79B-123.45, tài xế Hùng-tài-xế, 05:50–08:30) | LC-03 trùng giờ; CH-02 khoảng nghỉ; LC-12 hạng bằng đủ chở 15; LC-13 không chéo | `vc_trip` (`PLANNED`, `version` 1, chụp chủ xe, chụp khoảng nghỉ) + `vc_trip_driver` + sự kiện |
| 4 | Hùng kéo 3 chặng vào CX-07 | mở suất (có tên và chưa tên); dựng điểm dừng; LC-01, LC-02, LC-09 | suất + điểm + sự kiện; `version` 2 |
| 5 | — | MQ-05: CX-07 bị **giữ** "thiếu 2 tên — văn phòng" | không ghi (tính lúc đọc) |
| 6 | Lan bổ sung 2 tên trên đơn | gắn tên vào 2 suất chưa tên của đúng chặng (LC-10) | dòng `ord_passenger` + `passenger_key` đặt một lần |
| 7 | — | CX-07 hết giữ | — |

### 5.4 Đổi giờ trước khi chạy

**(a) Khách xin đổi giờ hẹn** (07:00 → 06:30):

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Người phụ trách đơn sửa chặng (ô `order.trip.edit`) | mốc: giờ mới còn ≥ 6 giờ? không thì **chỉ Quản trị, Toàn quyền** sửa được, kèm lý do đặt gấp (C17, C18) | chặng đổi giờ + nhật ký `order_leg_updated` (trước → sau) |
| 2 | — | MQ-07: chặng đang có suất trên CX-07 → nhắc "gọi báo khách" (người phụ trách đơn đã tự đổi nên chính họ là người gọi) + tài xế CX-07 thấy giờ mới; điểm dừng không ghi đè giờ → giờ xe tới tự theo giờ mới | không ghi gì ở `vc_` |
| 3 | Người xếp xe xem lại thứ tự điểm nếu cần | LC-03, CH-01 (nếu chuyến đã trong 6 giờ → phá lệ) | sự kiện đổi thứ tự |

**(b) Người xếp xe muốn xe tới sớm hơn** mà không đổi giờ hẹn khách: ghi đè `vc_trip_stop.planned_time` (lý do nhóm `DOI_GIO_XE`) — không đụng `orders`.

**(c) Người xếp xe (Bán hàng) muốn đổi giờ hẹn của đơn người khác:** hôm nay ô `order.trip.edit` của Bán hàng là `ownOrAssigned` — **không** sửa được. Máy nhắc người phụ trách đơn. **Chủ chọn (ĐP6, 29/9): giữ như vậy** — không mở quyền.

### 5.5 Tài xế A đề nghị chuyển điểm cho tài xế B (xe đang chạy) — từ lượt duyệt 2

Tình huống của chủ: kẹt xe, A (CX-07) không kịp Mường Thanh; B (CX-04) gần Mường Thanh; đồng thời B không kịp Alibu, A gần Alibu.

**Đạt luật:**

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | A chọn điểm "Mường Thanh (3 khách)", chọn CX-04, bấm Gửi | LC-14: A đang lái CX-07 đang chạy; điểm chưa tới; mọi suất đang chờ; CX-04 cùng ngày, đang chạy; B đang lái | `vc_transfer_request` `PENDING` (`pax_count` 3) + sự kiện `TRANSFER_PROPOSED`; tăng `version` CX-07 |
| 2 | — | (lượt 2) tin tới B: "Hùng nhờ đón Mường Thanh, 3 khách → Cảng Vinpearl" | — |
| 3 | B mở đề nghị | máy tính trước: "sau khi nhận: 25/29 chỗ" | — |
| 4 | B bấm Nhận | MQ-02/03: `SUC_CHUA_DICH` 25 ≤ 29 đạt; `TRUNG_GIO_DICH` đạt; `KHOANG_NGHI_DICH` đạt; `DIEM_CHUA_TOI` đạt; công tắc bật → **xác nhận** | một lô: đề nghị `CONFIRMED` (`decided_mode = MAY`, `decided_by` = B, `policy_id`) + 7 dòng `vc_transfer_check` + đóng 3 suất CX-07 (`TRANSFERRED`) + mở 3 suất CX-04 (`added_after_departure = 1`) + điểm Mường Thanh ở CX-07 → `MOVED` + thêm điểm đón Mường Thanh và điểm trả Cảng Vinpearl ở CX-04 (MQ-06) + dòng manifest mới cho CX-04 + tăng `version` hai chuyến + nhật ký "máy xác nhận theo luật …" |
| 5 | — | Bảng tin: bảng điều phối, màn A, màn B tải lại; (lượt 2) tin tới A, B, người điều xe | — |
| 6 | Song song, B gửi đề nghị điểm Alibu sang CX-07; A nhận | như trên | như trên |

**Không đạt luật** (ví dụ CX-07 chỉ còn 1 chỗ mà Alibu có 2 khách):

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 4' | A bấm Nhận | `SUC_CHUA_DICH` 16 > 15 → không đạt (luật lõi) | đề nghị `ESCALATED` + các dòng kiểm (có dòng `KHONG_DAT`) + nhật ký; **không** đổi suất |
| 5' | — | A, B thấy: "Không nhận được: xe CX-07 sẽ vượt chỗ (16/15). Đã báo văn phòng." (lượt 2) tin cần xử lý tới người điều xe | — |
| 6' | Văn phòng xem | luật lõi không đạt → **chỉ bác được**; gợi ý: xe khác (MQ-01), hoặc thêm điểm Alibu vào xe thứ ba (văn phòng được thêm) | bác: `REJECTED` + lý do |
| 6'' | (nếu luật không đạt là khoảng nghỉ — luật cấu hình) | văn phòng có ô `trip.override` duyệt kèm lý do (ĐP4) | `CONFIRMED`, `decided_mode = NGUOI`, `override_reason_code`, cùng lô đổi suất như bước 4 |

**B không nhận / không trả lời:** B bấm "Không nhận" (lý do nhóm `TU_CHOI_NHAN`) → `DECLINED`; hoặc quá 10 phút → màn A hiện "hết giờ chờ" (MQ-08); A gửi xe khác hoặc gọi văn phòng.

### 5.6 Văn phòng thêm điểm đón vào xe đang chạy — từ lượt duyệt 2

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Khách đặt gấp lúc 06:05 (có "đặt gấp" từ lúc đặt) | — | chặng mới |
| 2 | Hùng (văn phòng) kéo chặng vào CX-04 đang chạy ("Thêm điểm đón") | LC-15: văn phòng **được thêm**; LC-02 sức chứa; LC-09; CH-01: chặng đã mang đặt gấp → qua, không phá lệ lần nữa (C17); chặng chưa đặt gấp → chỉ Quản trị, Toàn quyền phá lệ (C18) | suất mới `added_after_departure = 1`, điểm mới `added_while_running = 1`, dòng manifest mới, sự kiện, `version` |
| 3 | — | (lượt 2) tin tới tài xế CX-04: "Văn phòng thêm điểm đón AB Square 06:40, 2 khách" | — |
| 4 | Tài xế đón, bổ sung tên nếu thiếu (ô `trip.passenger.add`) | LC-10 | hành khách `source = 'DRIVER'` + gắn tên vào suất |

### 5.7 Văn phòng báo huỷ điểm đón (tài xế vẫn tới) — từ lượt duyệt 2

*Ở lượt 1:* khách huỷ thì người phụ trách huỷ đơn / đóng chặng ở màn đơn; chuyến đang chạy vẫn giữ suất (LC-15), tài xế vẫn tới và bấm "Khách đã huỷ"; bảng điều phối hiện "chặng đã đóng" cạnh điểm đó.

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Khách gọi huỷ lúc 06:10; Hùng bấm "Báo huỷ điểm" Amiana trên CX-07 đang chạy, chọn lý do | LC-15: không đóng suất, không bỏ điểm; MQ-09: đề nghị chuyển nào đang chờ cho điểm này → `VOID` | `office_cancel_*` trên các suất của điểm + sự kiện + nhật ký; suất **vẫn chiếm chỗ** |
| 2 | — | (lượt 2) tin tới tài xế: "Văn phòng báo khách ở Amiana đã huỷ. Vẫn tới điểm, ghi kết quả." | — |
| 3 | Tài xế tới Amiana, bấm "Khách đã huỷ" (hoặc "Đã đón" nếu khách vẫn ra — báo huỷ nhầm) | LC-07 | suất → `CANCELLED_AT_STOP` (hết chiếm chỗ) hoặc `BOARDED`; điểm → `DONE` |
| 4 | Việc tiền của đơn (hoàn, phí huỷ) | **không** ở Vận chuyển | người phụ trách đơn xử lý ở màn đơn (đường huỷ/sửa đơn hiện có) |

### 5.8 Khách vắng

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Tài xế tới Sheraton (Đã tới), chờ | — | điểm `ARRIVED`, sự kiện (giờ máy chủ) |
| 2 | 1 trong 4 khách không ra; tài xế bấm "Vắng" cho người đó | LC-07 | suất → `NO_SHOW` (hết chiếm chỗ); sự kiện `count` 1, không tên |
| 3 | Khách chạy ra muộn trước khi xe rời | `NO_SHOW → BOARDED` (bước lùi duy nhất), LC-02 kiểm lại | suất → `BOARDED` |
| 4 | Xe rời điểm | — | điểm `DONE` |
| 5 | — | (lượt 2) tin tới người phụ trách đơn: "ĐH-1024: 1 khách vắng ở điểm đón" (không tên) | — |

### 5.9 Xe hỏng giữa đường

*Ở lượt 1 (chưa có đề nghị chuyển):* tài xế A (hoặc văn phòng bấm thay) bấm "Kết thúc gián đoạn", lý do "Xe hỏng" → điểm chờ bỏ qua, suất đang mở đóng với `TRIP_INTERRUPTED`, các chặng quay về cột "Chưa xếp" → văn phòng **tạo chuyến cứu hộ mới** (xe C, điểm đón đầu tiên là nơi gặp — chữ tự do) và xếp các chặng đó vào (Quản trị hoặc Toàn quyền phá lệ mốc 6 giờ kèm lý do "Sự cố vận hành" — C18). Không đụng chuyến đang chạy nào, đúng câu "văn phòng chỉ thêm".

*Từ lượt 2:* cách làm **phụ thuộc ĐP5** (ai chuyển khách sang xe cứu hộ **đang chạy**). Phương án khuyến nghị:

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Tài xế A báo văn phòng (gọi điện); A (hoặc văn phòng bấm thay) mở "Chuyển khách đang trên xe" chọn xe cứu hộ C, nơi gặp (chữ) | LC-14 phạm vi `ONBOARD`: mọi suất `BOARDED` + `WAITING` của A | `vc_transfer_request` `scope = ONBOARD` `PENDING` |
| 2 | Tài xế C bấm Nhận | MQ-02/03 như 5.5 (sức chứa C, trùng giờ C) | `CONFIRMED` (`MAY`): đóng suất ở A (`TRANSFERRED`), mở ở C (giữ trạng thái đã lên/chờ đón), thêm điểm "Nơi gặp" (đón) + các điểm trả/đón còn lại vào C |
| 3 | A bấm "Kết thúc gián đoạn", lý do "Xe hỏng" | LC-16: còn điểm chưa xong → phải là gián đoạn; các điểm còn chờ → `SKIPPED` | chuyến A `ENDED_INTERRUPTED` + sự kiện |
| 4 | Không xe nào đủ chỗ | văn phòng thêm điểm "Nơi gặp" vào **nhiều** xe (được thêm), mỗi xe nhận một phần khách qua đề nghị riêng | nhiều đề nghị |
| 5 | — | (lượt 2) tin tới người điều xe (gián đoạn), tài xế C | — |

- Xe A: Quản trị đổi trạng thái xe sang "bảo dưỡng" ở màn xe (1a) — chuyến tương lai của xe A bị **giữ** (LC-05 không đạt: xe không "đang dùng").

### 5.10 Chiều về

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Lập đơn dịch vụ khai "hai chiều" | tạo chặng `RETURN`: nơi đón = nơi trả chiều đi (ga cáp treo), nơi trả = nơi đón chiều đi (Sheraton), giờ gợi ý theo mẫu (nếu có) hoặc trống | chặng `RETURN` (ADR-0047) |
| 2 | Giờ về chưa chốt (`pickup_time` NULL) | lịch chung hiện "chưa chốt giờ"; **không xếp được** tới khi có giờ (xếp cần giờ để kiểm trùng) | — |
| 3 | 2 khách ở lại đảo (về ít người hơn) | **chờ ĐP1**: (a) văn phòng ghi số người của riêng chặng về | cột mới trên chặng (bổ sung ADR-0047) |
| 4 | Xếp chiều về | như 5.3; chuyến chiều về là chuyến khác, có thể gom chiều về của nhiều đơn | như 5.3 |

### 5.11 Tài xế đối tác từ chối (ghép lượt 2)

Hai việc khác nhau, dễ lẫn:

| Việc | Khi nào | Luồng |
|---|---|---|
| **Không nhận đề nghị chuyển điểm** | trong lúc chạy, B là tài xế đối tác (chỉ từ lượt 3, khi D7 mở app cho tài xế đối tác) | như 5.5: B bấm "Không nhận" + lý do → `DECLINED`. Không ảnh hưởng chuyến của B. Áp cho mọi tài xế (không cần Q3 của lượt 2) |
| **Từ chối chuyến được xếp** (lượt 2 D3 → D8 của bản này) | trước hạn chót Từ chối (Q2 cũ của lượt 2) | tài xế bấm Từ chối + lý do → đóng dòng `vc_trip_driver` với `close_reason = REFUSED` (cột đã định sẵn ở D1) → chuyến **không có tài xế** → **giữ** (MQ-05: "chưa có tài xế — văn phòng") → MQ-01 gợi ý tài xế thay → (lượt 2) tin tới người điều xe. Quá hạn chót: gọi văn phòng |

- D8 dùng lại **nguyên** khuôn lượt 2 D3 (một lô, lý do tập đóng, chốt "đang lái", 404 cho chuyến không phải của mình), chỉ đổi tên bảng cho khớp D1.

---

## Phần 6 — Quyền, trang ghép, cửa một chiều, chia lượt duyệt

### 6.1 Ô quyền (cột theo `PERMISSION_CODES`; `DRIVER_PARTNER` là cột thứ 9 của ADR-0048)

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SA | INTERN | DRIVER | DRIVER_PARTNER | Lượt | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `trip.view` **(mới)** — xem lịch chung, chuyến, dòng dữ liệu | any | any | any | none | none | any | none | assigned | none (lượt 3 nếu ĐP12 cho mở — D7) | 1 | C1. `assigned` = đang có dòng lái mở trên chuyến (tính trong `van-chuyen` từ `vc_trip_driver`, **không** nới `can(assigned)` của `HANDLE`) |
| `trip.dispatch` **(mới)** — tạo/sửa/huỷ chuyến, xếp/dời/rút suất, đổi xe/tài xế **khi chuyến chưa chạy**; từ lượt 2 thêm: **thêm điểm** và **báo huỷ** khi xe đang chạy | any | none | any | none | none | any | none | none | none | 1 | C1; giới hạn "khi đang chạy" là luật LC-15 (lượt 1 khoá hẳn, lượt 2 nới đúng hai đường), không phải ô riêng |
| `trip.progress` **(mới)** — xuất bến, đã tới, đã đón, vắng, khách đã huỷ, đã trả, kết thúc (thường/gián đoạn), đổi thứ tự điểm chưa tới | any | none | any | none | none | any | none | assigned | none (lượt 3 nếu ĐP12 cho mở — D7) | 1 | C2: văn phòng bấm thay, ghi người bấm |
| `trip.passenger.add` **(mới)** — bổ sung/sửa tên khách tại chỗ (ghi `ord_passenger`, `source = 'DRIVER'`, bằng câu lệnh do `orders` cấp) | none | none | any | none | none | any | none | assigned | none (lượt 3 nếu ĐP12 cho mở — D7) | 2 | C15. **Bán hàng = none** (khác 1b): Bán hàng nhập tên qua màn đơn bằng ô `order.passenger.write` (ADR-0047) — không mở đường vòng ghi tên vào đơn **người khác**. Đánh đổi này hỏi chủ ở **ĐP13** |
| `trip.override` **(mới)** — phá lệ mốc tối thiểu lúc xếp (CH-01), khoảng nghỉ (CH-02); duyệt đề nghị leo thang | none | none | any | none | none | any | none | none | none | 1 | C18 (ĐP3: **chỉ Quản trị, Toàn quyền**); duyệt leo thang theo ĐP4 |
| `order.leg.short_notice` **(mới)** — đặt gấp dưới mốc tối thiểu | none | none | any | none | none | any | none | none | none | 1 | ô của `orders`; C18 (ĐP3: **chỉ Quản trị, Toàn quyền**) — Bán hàng, Thực tập, Đối tác lưu nháp được nhưng nhờ Quản trị đặt gấp |
| `trip.transfer` **(mới)** — gửi, rút, nhận, không nhận đề nghị chuyển điểm | none | none | none | none | none | any | none | assigned | none (lượt 3 nếu ĐP12 cho mở — D7) | 2 | route chốt thêm "người gửi đang lái chuyến nguồn / người nhận đang lái chuyến đích" — áp cả Toàn quyền (khuôn ADR-0030 điều 1); ngoại lệ bấm thay chỉ theo ĐP5. Tài xế đối tác ↔ tài xế công ty: ĐP11 (lượt 3) |
| `trip.refuse`, `unavailability.self` | theo lượt 2 D3, D4 | | | | | | | | | 3 | D8, D9 |
| `settings.ops` (có sẵn) | — | — | — | — | — | any | — | — | — | 1 | chính sách điều phối, điều kiện xuất bến, bảng hạng |
| `admin.manage` (có sẵn) | — | — | any | — | — | any | — | — | — | 1 | danh mục lý do `vc_reason` |

- **`SUPER_ADMIN = any` ở mọi ô** (ADR-0014 điều 2) — kể cả ô mới.
- **Nới hàng rào đã ghim (Điều 9.4), cần chủ duyệt từng ô:** bài ghim cả hàng `DRIVER` (ADR-0040) đổi từ "mọi ô nghiệp vụ none" sang "đúng các ô `trip.view`, `trip.progress` (lượt 1), `trip.passenger.add` và `trip.transfer` (lượt 2) là `assigned`"; bài ghim cả hàng `DRIVER_PARTNER` (ADR-0048) **giữ nguyên** ở lượt 1–2 (mọi ô `trip.*` = `none`), chỉ đổi ở lượt 3 nếu chủ trả lời ĐP12 cho mở. Mỗi bài ghim mới có dòng ở `docs/SO-HANG-RAO.md` kèm ngày thấy chặn thật.
- **Tài xế đối tác (người ngoài công ty) KHÔNG được mở ở lượt 1–2.** Cho tài khoản ngoài công ty (`DRIVER_PARTNER`) xem chuyến và **tên, năm sinh, SĐT khách** là quyết định **dữ liệu cá nhân + quyền, một chiều** (đã xem thì không rút lại được) — tách thành quyết định riêng **D7 (lượt 3)**, hỏi chủ bằng **ĐP12**, **không** tự áp khuyến nghị. Tới lúc đó chuyến của xe nhà xe vẫn xếp và chạy được: văn phòng bấm thay tiến độ (C2) và gọi tài xế đối tác. (Người kiểm độc lập 29/9 chỉ ra bản trước dán nhãn sai điều này là "giả định bề mặt".)

### 6.2 Cổng

| Cửa | Cổng (ADR-0019) | Ô trong thân route (hỏi trước mọi truy vấn) |
|---|---|---|
| Bảng điều phối, chi tiết chuyến, dòng dữ liệu, xếp xe, phá lệ, duyệt leo thang | `office` (SALES, ACCOUNTING, ADMIN, SUPER_ADMIN) | `trip.view` / `trip.dispatch` / `trip.progress` / `trip.override` |
| Chính sách điều phối, điều kiện xuất bến, bảng hạng | `office` | `settings.ops` |
| Danh mục lý do | `admin` | `admin.manage` |
| Màn tài xế: cuốc của tôi, chuyến đang chạy, bấm tiến độ, bổ sung tên, đề nghị chuyển | `staff` | `trip.*` với `assigned`; chuyến không phải của mình → **404** |
| Chặng, đặt gấp | `orders` (có sẵn) | `order.modify` / `order.trip.edit` + `order.leg.short_notice` |
| Bảng tin (lượt 2) | `staff` (có sẵn, `GET /api/bang-tin`) | nhãn tính ở máy chủ: `dieu-xe` khi `can(trip.view)` không ngữ cảnh |

- `DRIVER`, `DRIVER_PARTNER` vẫn **không** vào `office`, `orders`, `admin` (bài `src/shared/cong-quyen.test.ts` giữ nguyên, thêm khẳng định cho `DRIVER_PARTNER` như ADR-0048).
- Không lập cổng mới (tránh sửa ADR-0019 điều 1).

### 6.3 Danh sách trường được phép cho tài xế (Hiến chương 4.4; khuôn `pool.ts` — dựng mới từng khoá)

- **Áp cho tài xế công ty (`DRIVER`) từ lượt 1.** Tài xế đối tác chỉ khi D7 được duyệt; khi đó mốc thấy tên/SĐT theo ĐP12 và câu Q1 cũ của lượt 2.

- **Được:** mã chuyến, biển số, số chỗ, giờ dự kiến, trạng thái; điểm dừng (tên nơi; chữ tự do che dãy từ 8 chữ số), giờ hẹn, giờ xe tới; mã đơn, số người mỗi điểm; **trong ngày chạy**: họ tên + năm sinh từng khách của chuyến, tên + SĐT người liên hệ của đơn có khách trên chuyến (C3); trạng thái từng suất; lời nhắn văn phòng (báo huỷ, thêm điểm); điều kiện xuất bến còn thiếu (chỉ tên điều kiện).
- **Không bao giờ:** tiền (kể cả giá thuê ở lượt 3), dịch vụ khác của đơn, ghi chú đơn, người lập, người phụ trách, số giấy tờ.
- **"Trong ngày chạy"** = ngày dân sự VN hôm nay bằng `service_date` của chuyến, **hoặc** chuyến đang chạy (chuyến qua nửa đêm). Ngoài khoảng đó các khoá tên, năm sinh, SĐT **vắng mặt** (không phải chuỗi rỗng). *Giả định G-04.*
- **Danh sách xe khác khi chọn nơi chuyển (ĐP9):** khuyến nghị chỉ mã chuyến, tên tài xế, số chỗ còn, điểm sắp tới — **không** khách của xe khác.

### 6.4 Chia lượt duyệt (mỗi lượt ≤ 3 quyết định chạm quyền/dữ liệu — `CLAUDE.md` §9)

| Lượt | Quyết định | Nội dung | Chạm | Câu hỏi đi kèm |
|---|---|---|---|---|
| **1** | **D1** Mô hình chuyến và lịch chung | `vc_trip`, `vc_trip_driver`, `vc_trip_stop`, `vc_trip_allocation` (suất), `vc_trip_event` (nối 1-1 `audit_log`); lịch chung là hình chiếu; hàm hẹp mới của `orders` (`lichChungChang`, `lienHeChoTaiXe`); cạnh `van-chuyen → orders, locations`; máy trạng thái **định trọn** (kể cả giá trị dùng ở D5, D8); thay ADR-0006 điều 2/4/5/7 cho xe đường bộ; LC-01…LC-04, LC-06, LC-07, LC-09…LC-11, LC-13, LC-16, LC-18; **LC-15 dạng khoá hẳn** (chuyến đang chạy không đổi kế hoạch) | dữ liệu | — |
| | **D2** Luật, chính sách, cổng xuất bến, mốc tối thiểu | `vc_dispatch_policy` (cột lượt 1), `vc_departure_rule`, `vc_license_capacity`, `vc_reason`, bản chụp xuất bến; "giữ" (`LyDoGiu`); CH-01 ở **cả** lúc đặt (cột `short_notice_*` trên `ord_transfer_leg` — bổ sung ADR-0047 A1; hàm tiêm `ctx.mocToiThieu`) và lúc xếp; CH-02 … CH-06; LC-05, LC-12 | dữ liệu + hợp đồng giữa các phần | ĐP2, ĐP7 — **đã trả lời** |
| | **D3** Quyền và route | ô `trip.view`, `trip.dispatch`, `trip.progress`, `trip.override`, `order.leg.short_notice`; cột `DRIVER` (tài xế công ty) — **không** mở `DRIVER_PARTNER`; DTO danh sách trắng; route văn phòng + tài xế; nới bài ghim hàng `DRIVER`; LC-08 | quyền | ĐP3, ĐP6, ĐP8 — **đã trả lời** |
| **2** | **D4** Chuyển điểm đón giữa hai xe + máy tự xác nhận | `vc_transfer_request`, `vc_transfer_check`; cột `accept_wait_minutes`, `auto_confirm_transfer`; ô `trip.transfer`; LC-14; MQ-02, 03, 06, 08, 09; leo thang + phá lệ | dữ liệu + quyền | ĐP4, ĐP9 |
| | **D5** Thay đổi khi xe đang chạy | **nới** LC-15 đúng hai đường: văn phòng thêm + báo huỷ (đường chuyển qua đề nghị thuộc D4); cột `office_cancel_*` trên suất; điểm `added_while_running`; cứu hộ xe hỏng (phạm vi `ONBOARD` của đề nghị); **tài xế tự bổ sung, sửa tên khách tại chỗ** — ô `trip.passenger.add` + câu ghi hành khách do `orders` cấp (`source = 'DRIVER'`) | dữ liệu + quyền | ĐP5, ĐP13 |
| | **D6** Thông báo + Bảng tin cho Vận chuyển (gộp lượt 2 D5) | loại sự kiện `chuyen` trên Bảng tin, nhãn `dieu-xe`; tin chuyến là hình chiếu `audit_log` (view `v_aud_trip_event`); tin MQ-07 từ `order_leg_updated`; hai hàm tiêm `baoThayDoiChuyen`, `chuyenLienQuan` (không thêm cạnh module); người nhận theo §3.5 | quyền đọc (ai thấy tin nào) | — (câu Q1 cũ của lượt 2 không thuộc đây) |
| **3** | **D7** Tài xế đối tác trên chuyến | mở cột `DRIVER_PARTNER` ở `trip.view`, `trip.progress`, `trip.passenger.add`, `trip.transfer` (phạm vi `assigned`) — **chỉ nếu** chủ trả lời ĐP12 cho mở; DTO cho tài xế đối tác (mốc thấy tên, SĐT theo ĐP12 + Q1 cũ của lượt 2); chuyển điểm giữa xe công ty và xe nhà xe (ĐP11); nới bài ghim hàng `DRIVER_PARTNER` (ADR-0048) | quyền + dữ liệu cá nhân (**một chiều**) | ĐP11, ĐP12, Q1 cũ của lượt 2 |
| | **D8** Từ chối chuyến (lượt 2 D3) | `close_reason = REFUSED` (đã định ở D1) + mã lý do; hạn chót Từ chối (cột mới của `vc_dispatch_policy`); ô `trip.refuse` | dữ liệu + quyền | Q1, Q2, Q3 cũ của lượt 2 |
| | **D9** Báo bận (lượt 2 D4) | `vc_unavailability`; LC-03 mở rộng "khung bận"; ô `unavailability.self` | dữ liệu + quyền | Q3, Q7 cũ của lượt 2 |
| **4** | **D10** Chiều về theo dịch vụ | mẫu chặng theo dịch vụ (CH-09); lập đơn tự tạo chặng; số người riêng của chặng (nếu ĐP1 = a). **Độc lập**: chỉ cần ADR-0047, trình lúc nào cũng được, không phải chờ lượt 3 | dữ liệu (`catalog`, `orders`) | ĐP1, ĐP10 |

**Kiểm "không lượt nào dựa vào quyết định ở lượt sau":**

| Lượt | Cần gì | Có ở lượt ≤ nó? |
|---|---|---|
| 1 | chặng, hành khách, `soKhachHieuLuc`, view khoá + cờ (ADR-0047); `DRIVER_PARTNER`, `v_pty_carrier_driver` (ADR-0048) | có (ADR đã duyệt) |
| 1 | dữ liệu phá lệ mốc 6 giờ cho cổng xếp xe | có — D2 cùng lượt |
| 1 | luật cho chuyến đang chạy (văn phòng làm được gì) | có — D1 mang LC-15 **dạng khoá hẳn**; lượt 2 (D4, D5) **nới** đúng hai đường. Siết trước, nới sau là chiều an toàn; lượt 2 nới một hàng rào của lượt 1 nên chủ duyệt lượt 2 là duyệt luôn việc nới đó (Điều 9.4) |
| 1 | thông báo cho tài xế khi được xếp | **không cần**: lượt 1 tài xế mở app mới thấy; bảng điều phối tải lại bằng tin đơn **đã có** khi đơn đổi, và tải lại tay khi người khác sửa chuyến. Chấp nhận được cho tới lượt 2 |
| 2 | D4 cần báo B có đề nghị | có — D6 cùng lượt |
| 2 | D5 cứu hộ dùng đề nghị `ONBOARD` | có — D4 cùng lượt |
| 3 | D8 cần mã `REFUSED` (D1), gợi ý thay (MQ-01, lát 2.5), tin tới người điều xe (D6) | có |
| 3 | D9 cần hàm chồng giờ (LC-03, D1) | có |
| 3 | D7 cần ô chuyến + DTO (D3), chuyển điểm (D4), thông báo (D6) | có |
| 1–2 | tài xế đối tác dùng app cho chuyến | **không cần**: chuyến của xe nhà xe vẫn xếp và chạy; văn phòng bấm thay tiến độ (C2) và gọi tài xế đối tác |
| 1–3 | số người riêng của chặng về (ĐP1, D10) | **không cần**: tới lúc đó số người chặng = số khách hiệu lực; ai không về xe thì tài xế ghi "vắng" |
| 1 | gợi ý xếp (MQ-01), màn "Dòng dữ liệu" (V4), tài xế tự bổ sung tên | **không cần** (thu gọn lượt 1): người xếp xe tự chọn; trạng thái chặng hiện trên V1; tên do văn phòng nhập ở màn đơn trước xuất bến |

### 6.5 Trang ghép (`CLAUDE.md` §9)

#### 6.5.1 Lượt duyệt 1 (D1 + D2 + D3)

**(1) Bảng nào chứa loại thực thể nào**

| Bảng | Loại thực thể |
|---|---|
| `vc_trip` | chuyến (một lượt chạy của một xe) — một loại; kế hoạch + thực thi; chuyến của xe công ty và xe nhà xe **chung một bảng**, luật không rẽ nhánh theo chủ xe |
| `vc_trip_driver` | ai lái chuyến, có hiệu lực — tài xế công ty hoặc tài xế đối tác (hồ sơ người). Tài xế đối tác được xếp lái nhưng **chưa** dùng app cho chuyến tới khi D7 được duyệt |
| `vc_trip_stop` | điểm dừng (đón / trả) |
| `vc_trip_allocation` | **hai loại dòng**: suất hành khách (trỏ chặng + người, tên gắn sau được) **và** suất người đi kèm (trỏ hồ sơ: HDV, phụ xe); `CHECK` đúng một loại |
| `vc_trip_event` | sự kiện chuyến có kiểu, nối 1-1 `audit_log`; chỉ số người, không tên |
| `vc_dispatch_policy`, `vc_departure_rule`, `vc_license_capacity` | chính sách có ngày hiệu lực |
| `vc_reason` | danh mục lý do (dữ liệu tra cứu sửa được) |
| `vc_trip_departure_check` (+ dòng con), `vc_trip_manifest` | bản chụp lúc xuất bến; chỉ-thêm; lưu ≥ 3 năm; manifest trỏ **dòng** `ord_passenger` đã dùng, không chép tên |
| `ord_transfer_leg` (ADR-0047) | + cột "đặt gấp" (không thêm loại dòng) |
| `audit_log` | + hành động `trip_*`, `order_leg_short_notice`; không tên, năm sinh, SĐT, số giấy tờ |

**(2) Dòng bản đồ quyền nào chạm bảng nào, áp cho loại nào**

| Ô | Chạm | Áp cho |
|---|---|---|
| `trip.view` | đọc mọi bảng `vc_trip*`, lịch chung (qua hàm hẹp của `orders`) | văn phòng: mọi chuyến; tài xế: chuyến mình lái (DTO hẹp) |
| `trip.dispatch` | `vc_trip`, `vc_trip_driver`, `vc_trip_stop`, `vc_trip_allocation` (cả hai loại dòng), `vc_trip_event` | mọi chuyến **chưa chạy**; chuyến đang chạy: không thao tác kế hoạch nào (LC-15 lượt 1) |
| `trip.progress` | trạng thái chuyến, điểm, suất; `vc_trip_event`; **ghi** bản chụp xuất bến | tài xế: chuyến mình; văn phòng: mọi chuyến (bấm thay) |
| `trip.override` | ghi sự kiện `PHA_LE`, `vc_trip.rest_override_reason_code` | mọi chuyến |
| `order.leg.short_notice` | cột "đặt gấp" của `ord_transfer_leg` | đơn trong phạm vi `order.modify` của người đó |
| `settings.ops` | ba bảng chính sách | — |
| `admin.manage` | `vc_reason` | — |
| `vehicle.manage` (1a) | **không đổi**, không mở chuyến | — |
| `contact.view`, `order.passenger.write` (ADR-0047) | **không đổi**; tài xế không đi qua hai ô này — SĐT và tên trong DTO tài xế là **ngoại lệ có tên** dưới `trip.view` + "trong ngày chạy" | — |

**(3) Cổng nào canh cửa nào:** bảng §6.2. **Cổng dữ liệu (CSDL):** LC-01 (chỉ mục), LC-02, LC-03, LC-04, LC-05, LC-06, LC-07, LC-09, LC-10, LC-11, LC-13, LC-15 (dạng khoá hẳn), LC-16; trigger chỉ-thêm của bản chụp. **Cổng pháp lý:** `kiemXuatBen` (một hàm, máy chủ + màn hình). **Hợp đồng giữa các phần:** ba hàm hẹp của `orders` (không tự kiểm quyền — bài kiểm "nơi gọi đứng sau `can()`"), hàm tiêm `ctx.mocToiThieu`.

#### 6.5.2 Lượt duyệt 2 (D4 + D5 + D6)

| Hỏi | Trả lời |
|---|---|
| **(1) Bảng nào chứa loại nào** | `vc_transfer_request`: đề nghị chuyển, **hai loại phạm vi** — `STOP` (cụm đón chưa tới) và `ONBOARD` (khách đang trên xe, cứu hộ); `CHECK` đúng trường theo phạm vi. `vc_transfer_check`: kết quả từng luật của một lần xét, chỉ-thêm. `vc_trip_allocation`: + cột "văn phòng báo huỷ" (không thêm loại dòng). `vc_trip_stop`: + cờ "thêm khi đang chạy". `vc_dispatch_policy`: + hai cột. `ord_passenger` (ADR-0047): + dòng `source = 'DRIVER'` (cùng thực thể, khác người nhập). `audit_log`: + `trip_transfer_*`, `trip_stop_added_running`, `trip_office_cancel`; view mới `v_aud_trip_event` (chỉ khoá: id, chuyến, người làm, hành động, lúc). `ntf_*`: **không** thêm dòng (tin là hình chiếu). |
| **(2) Ô nào chạm bảng nào, áp cho loại nào** | `trip.transfer` → `vc_transfer_request` (tạo, rút, nhận, không nhận) — tài xế của chuyến nguồn / đích; khi xác nhận ghi thêm `vc_trip_allocation`, `vc_trip_stop`, `vc_trip_manifest` (hệ quả của lệnh Nhận). `trip.override` → duyệt đề nghị `ESCALATED` (chỉ khi luật không đạt là luật cấu hình). `trip.dispatch` → thêm điểm, báo huỷ ở chuyến đang chạy. `trip.passenger.add` → `ord_passenger` (qua câu do `orders` cấp) + gắn tên vào suất — chỉ đơn có chặng trên chuyến mình lái, chỉ trong ngày chạy. `settings.ops` → hai cột chính sách mới. Hộp thông báo: người nhận tính theo **quyền hiện có** + **dòng lái có hiệu lực lúc sự kiện** (khuôn lượt 2 D5). |
| **(3) Cổng nào canh cửa nào** | Route đề nghị ở cổng `staff` (tài xế) + `office` (văn phòng duyệt). Bảng tin: `staff`, nhãn `dieu-xe` chỉ khi `can(trip.view)` không ngữ cảnh (tức `any`). **CSDL:** LC-14, LC-15, LC-02 (sức chứa sau chuyển). Không thêm cạnh module: `thongbao` nhận dữ liệu chuyến qua hàm tiêm từ gốc lắp ráp. |

#### 6.5.3 Lượt duyệt 3 (D7 + D8 + D9)

| Hỏi | Trả lời |
|---|---|
| **(1) Bảng nào chứa loại nào** | D7 **không thêm bảng**; các bảng `vc_trip*`, `vc_transfer_request` và `ord_passenger` (dòng `source = 'DRIVER'`, qua câu do `orders` cấp) nhận thêm **một loại người đọc/ghi: tài khoản ngoài công ty** (`DRIVER_PARTNER`), chỉ trên chuyến người đó đang lái. `vc_trip_driver`: dùng mã `REFUSED` + cột mã lý do Từ chối (D8). `vc_dispatch_policy`: + hạn chót Từ chối. `vc_unavailability`: khung bận của tài xế (D9). |
| **(2) Ô nào chạm bảng nào** | `trip.view`, `trip.progress`, `trip.passenger.add`, `trip.transfer` — cột `DRIVER_PARTNER` = `assigned` (chuyến mình đang lái), theo ĐP12. `trip.refuse` → đóng dòng lái của chính mình. `unavailability.self` → khung bận của chính mình. `trip.dispatch` → thêm nghĩa "xem khung bận của mọi tài xế". Mọi ô tiền, đơn, hồ sơ của `DRIVER_PARTNER` vẫn `none` (bài ghim cả hàng). |
| **(3) Cổng nào canh cửa nào** | Cổng `staff` + chốt "đang lái"; chuyến không phải của mình → 404. `DRIVER_PARTNER` vẫn không vào `office`, `orders`, `admin`. DTO: khoá tên, năm sinh, SĐT vắng mặt ngoài khung ĐP12. CSDL: trigger dòng lái chỉ đi tiến, trigger khung bận không chồng chuyến đã nhận (khuôn lượt 2 cũ B3.x, B4.x). |

#### 6.5.4 Lượt duyệt 4 (D10)

| Hỏi | Trả lời |
|---|---|
| **(1) Bảng nào chứa loại nào** | Mẫu chặng theo dịch vụ: bảng mới của `catalog` (tiền tố mới, bổ sung ADR-0002) **hoặc** cột Sheet — theo ĐP10. `ord_transfer_leg`: + cột số người riêng (nếu ĐP1 = a). |
| **(2) Ô nào chạm bảng nào** | Mẫu chặng: Quản trị (`admin.manage`) nếu trong app. Số người riêng của chặng: `order.modify` (nháp), `order.trip.edit` (sau xác nhận) — cùng loại dữ liệu với chặng, không đổi nghĩa ô. |
| **(3) Cổng nào canh cửa nào** | Mẫu chặng: cổng `admin`. Chặng: cổng `orders` (có sẵn). |

### 6.6 Câu của ADR đã duyệt bị đụng (nguyên văn → mới)

Tệp ADR cũ **không** sửa; ADR mới của từng lượt ghi các dòng này; `docs/adr/README.md` do điều phối cập nhật.

| ADR | Nguyên văn | Mới | Lượt |
|---|---|---|---|
| ADR-0006 điều 4 | "**Nhiệm vụ** = dòng phạm vi `order_service_id`; một dịch vụ có nhiều nhiệm vụ đang mở (vd tài xế đón ở khách sạn, HDV đón ở cảng, lái cano)." | "… (vd HDV đón ở cảng, lái cano). **Việc đưa đón bằng xe đường bộ là Chuyến của phân hệ Vận chuyển**, không phải nhiệm vụ của Phân công." | 1 |
| ADR-0006 điều 2 | "`task_kind_code` (… `PICKUP` đón, `DROPOFF` tiễn, `BOAT` lái cano, …)" | giữ nguyên danh sách; thêm: "`PICKUP`/`DROPOFF` của Phân công chỉ dùng cho **người** đón/tiễn không lái xe (vd HDV đón ở cảng); xe đường bộ dùng Chuyến." — **khác 1b** (1b đề xuất ngưng hẳn hai mã; ngưng thì mất chỗ ghi "HDV đón ở cảng" mà điều 4 còn giữ) | 1 |
| ADR-0006 điều 5, vế thứ hai | "*giờ và nơi điều xe/đón thực tế* = `dsp_assignment.scheduled_time` / `location_id` / `place_text` của nhiệm vụ `PICKUP` … câu 'tài xế đón mấy giờ' đọc từ nhiệm vụ `PICKUP` của dịch vụ đó." | "… = giờ xe tới của điểm dừng `vc_trip_stop.planned_time` (trống = theo giờ hẹn của chặng) … câu 'tài xế đón mấy giờ' đọc từ điểm dừng của chuyến có suất của chặng đó." (Vế thứ nhất đã đổi ở ADR-0047.) | 1 |
| ADR-0006 điều 7, vế "đã đón" | "Tiến độ **của từng nhiệm vụ** (đã gọi, đã đón) nằm ở `dsp_assignment.status_code`/`done_at`" | "… Với xe đường bộ, 'đã đón' = suất `vc_trip_allocation.status = 'BOARDED'` (một nguồn)." | 1 |
| ADR-0040 D1 (phụ thuộc) | "Phụ thuộc `parties` (hàm công bố) và `audit` (`auditStatement`). Không module nào import `van-chuyen`." | "Phụ thuộc `parties`, `audit`, **`orders`** (suất trỏ chặng; hàm hẹp), **`locations`** (điểm dừng). Không module nào import `van-chuyen`." — sửa `ALLOWED_EDGES` là nới hàng rào (Điều 9.4) | 1 |
| ADR-0040 D3 | "**Lượt 1b:** mở ô 'xem cuốc xe của mình'. Trang đầu của tài xế hiện các cuốc được giao." | "… mở `trip.view`, `trip.progress` (phạm vi `assigned`); lượt duyệt 2 mở `trip.passenger.add`, `trip.transfer` (`assigned`)." — nới bài ghim hàng `DRIVER` | 1, 2 |
| ADR-0048 D2 (ô quyền) | "Ô xem chuyến, Từ chối, Báo bận: thuộc ADR-0047 và lượt duyệt II; tới lúc đó vẫn `none`." | "Ô xem chuyến, tiến độ, bổ sung tên, chuyển điểm = `assigned` **chỉ khi** chủ trả lời ĐP12 cho mở (lượt duyệt 3 của bản thiết kế điều phối, D7); Từ chối, Báo bận ở lượt duyệt 3 (D8, D9). Tới lúc đó vẫn `none`." — nới bài ghim hàng `DRIVER_PARTNER` | 3 |
| ADR-0047 A1 (bảng cột) | bảng cột của `ord_transfer_leg` (không có cột đặt gấp) | thêm `short_notice_reason`, `short_notice_note`, `short_notice_by`, `short_notice_at`, `short_notice_lead_minutes`; `CHECK`: có lý do thì có người + lúc | 1 |
| ADR-0047 A1 | "**Số người của riêng chặng** (`pax_override`, chiều về ít người hơn): **chờ lượt 2** (Q6)." | theo ĐP1 của bản này (lượt duyệt 4, D10) | 4 |
| ADR-0047 A2 | "Giá trị `DRIVER` định sẵn để khỏi dựng lại bảng; **chỉ dùng khi ADR lượt 2 mở đường ghi cho tài xế**" | "… mở bằng ô `trip.passenger.add` (lượt duyệt 2 của bản thiết kế điều phối, D5)." | 2 |
| ADR-0047 A3 | "Hàm trả liên hệ (SĐT) cho tài xế: **chờ lượt 2** (Q3)." | "`lienHeChoTaiXe(db, orderIds)` — chỉ gọi sau `can(trip.view, assigned)` và chỉ trong ngày chạy (chủ trả lời [HĐ] Q3, 2026-09-28/29)." | 1 |
| ADR-0022 điều 3 | "**Nhóm nhận suy từ ô `order.view` hiện hành** …" | bổ sung: "Sự kiện **chuyến** (loại `chuyen`) có nhóm nhận riêng: `dieu-xe` (có `trip.view = any`) + `nguoi:<tài khoản tài xế liên quan>`; không bao giờ gắn `tat-ca`." | 2 |
| ADR-0022 điều 4 | "**Sự kiện chỉ gồm** mã/đơn, loại thay đổi, thời điểm." | bổ sung: "Sự kiện chuyến chỉ gồm mã chuyến, loại thay đổi, thời điểm." | 2 |
| ADR-0034 điều 1 | "Tin về đơn là hình chiếu của `audit_log` … Nguồn: các hành động `created`, …" | bổ sung nguồn thứ hai: sự kiện chuyến (view `v_aud_trip_event`) và `order_leg_updated`, `order_leg_short_notice` (nhắc gọi khách, đặt gấp) — như lượt 2 D5 | 2 |
| ADR-0007 điều 4(b) | khuôn hàm tiêm từ gốc lắp ráp | thêm `ctx.mocToiThieu` (lượt 1), `baoThayDoiChuyen`, `chuyenLienQuan` (lượt 2) | 1, 2 |
| ADR-0019 | bản đồ ô | thêm các ô §6.1; không đổi danh sách cổng | 1, 2, 3 |
| ADR-0019 điều 1 (bảng cổng, dòng `staff`) | "`staff` | mọi tài khoản đang hoạt động | việc tự phục vụ của chính người gọi (điều 4)" | "… việc tự phục vụ của chính người gọi (điều 4) **và route nghiệp vụ theo vai trên chính đối tượng** của người không qua cổng nào khác (tài xế: chuyến mình đang lái) — canh bằng `can()` trong thân route, trước mọi truy vấn." Danh sách mã của cổng **không đổi** | 1 |
| ADR-0019 điều 4 | "**Tự phục vụ là ngoại lệ vĩnh viễn** … các route đọc của chính mình ở cổng `staff` … tự khoanh phạm vi bằng **danh tính trong phiên**" | thêm: "Route **nghiệp vụ** ở cổng `staff` — đầu tiên `GET /api/parties/documents/mine` (ADR-0040), nay các route tài xế `/api/van-chuyen/cuoc-cua-toi*` — **không** thuộc ngoại lệ tự phục vụ: chúng hỏi ô của `MATRIX` bằng `can()` (phạm vi `assigned`/`own`) trong thân route như điều 2, và từ chối khi sai." | 1 |
| ADR-0019 điều 6 | "Hàng rào 2 mở rộng từ 'mọi đường **ghi**' sang 'mọi route (đọc lẫn ghi) sau cổng `office`, `orders`, `admin`'" | "… và **mọi route nghiệp vụ ở cổng `staff`** không thuộc danh sách ngoại lệ tự phục vụ." — **siết** thêm hàng rào (Điều 9.4 cho phép), không nới | 1 |

### 6.7 Cửa một chiều / hai chiều

- **Một chiều:**
  - tiền tố và chủ sở hữu các bảng `vc_trip*`, `vc_transfer_*`;
  - các **tập đóng** (trạng thái chuyến, suất, điểm, đề nghị; `kind`; `scope`; `rule_code`; `close_reason`) — đổi `CHECK` trong SQLite = dựng lại bảng, nên **định trọn ngay từ lượt 1**, kể cả giá trị chỉ dùng ở lượt sau;
  - bản chụp xuất bến, manifest, `vc_transfer_check`, sự kiện, nhật ký — chỉ-thêm, chứng cứ, lưu ≥ 3 năm;
  - dữ liệu cá nhân trong manifest (dòng `ord_passenger` đã trỏ) và mỗi lần tài xế đã xem tên/SĐT (không rút lại được);
  - **mở tên, năm sinh, SĐT khách cho tài khoản ngoài công ty** (`DRIVER_PARTNER`) — vì vậy tách riêng D7 (lượt 3), hỏi ĐP12;
  - **danh sách trường của `detail` nhật ký** — phải chốt trước khi ghi dòng đầu (lượt 2 D5).
- **Hai chiều:** ô quyền; giá trị chính sách (thêm dòng mới); danh mục lý do; luật thuần (đổi cùng test); gợi ý xếp; màn hình; hàm tiêm; phương án kỹ thuật PA-1 (chuyển PA-2 sau vẫn dùng lại luật).
- **Tránh một chiều không cần:** không thêm lớp Durable Object (PA-2) — lớp mới làm Cloudflare chặn `wrangler rollback`.

### 6.8 Lệch có chủ ý khỏi Hiến chương 5.1 (khuôn ADR-0029; chỉ hợp lệ khi chủ duyệt)

| Mã | Phạm vi | Vì sao chỉ ở mã | Lớp bù | Điều kiện gỡ |
|---|---|---|---|---|
| **L-D1** (mới) | "số suất đang mở của một chặng ≤ số người của chặng" | số người sau sửa nằm trong JSON của `orders` (`after_json`); trigger `vc_` không đọc được | máy chủ lúc mở suất; **giữ** ở cổng xuất bến; [ĐK] "chặng có suất mở vượt số người" | số khách hiệu lực thành cột có kiểu (kế hoạch dọn nền T1 / ADR sổ công nợ) — cùng điều kiện với L-A1 |
| **L-B1** (từ 1b) | "đủ tên cho số người của chặng lúc xuất bến" | như trên | `kiemXuatBen`; trigger đòi có dòng kiểm đạt cùng lô; [ĐK] "chuyến đã xuất bến mà manifest ít hơn số người" | như trên |
| **L-B2** (từ 1b) | hạng và hạn GPLX, giấy tờ xe còn hạn tới hết chuyến | Phần II quy tắc 4 cấm view mang hạng/hạn; ADR-0040 D1 đã chọn hàm công bố | máy chủ lúc gán + lúc xuất bến; bản chụp; [ĐK] "chuyến 48 giờ tới / đang chạy có tài xế không đạt" | view cờ `v_pty_driver_eligible` nếu chủ nới quy tắc 4 — **không** đề xuất ở đây |
| L-A1 | (đã duyệt ở ADR-0047) | — | — | — |

- **Không phải lệch:** mốc tối thiểu (khoảng cho phép theo giờ hiện tại — §2.2); khoảng nghỉ (luật cấu hình phá lệ được, không phải "luật phải luôn đúng").
- **Có lớp CSDL đủ:** LC-01 (người có tên), LC-02, LC-03, LC-04, LC-05, LC-06, LC-07, LC-09, LC-10, LC-11, LC-13, LC-14, LC-15, LC-16.

---

## Phần 7 — Câu hỏi cho chủ (lời thường; mỗi câu có khuyến nghị)

Chỉ gồm điều chủ **chưa** trả lời. Không hỏi lại: ai xếp xe, tài xế tự bấm, SĐT trong ngày chạy, luồng "B nhận → máy tự xác nhận", văn phòng báo huỷ thì tài xế vẫn tới, không tự báo khách, chiều về khai theo dịch vụ, và ba câu đã vào ADR-0048. Câu nào chủ trả "theo khuyến nghị" thì áp nguyên khuyến nghị.

**Nhãn câu hỏi của bản này là `ĐP1` … `ĐP13`** (ĐP = điều phối) — cố ý khác nhãn `Q1`, `Q2`… của các tệp trước (đã có câu trả lời mang nhãn đó), để câu trả lời kiểu "ĐP3 theo khuyến nghị" không bị áp nhầm chỗ.

**Câu nào cần trả lời trước lượt duyệt nào:**

| Lượt duyệt | Câu |
|---|---|
| 1 | **Đã trả lời hết (29/9):** ĐP2 (i)–(iv) theo 4 khuyến nghị, ĐP2(v) lưu nháp được, chặn ở Xác nhận; ĐP3 chỉ Quản trị, Toàn quyền; ĐP6 không; ĐP7, ĐP8 đồng ý. Lượt 1 đã duyệt → ADR-0049 |
| 2 | ĐP4, ĐP5, ĐP9, ĐP13 |
| 3 | ĐP11, ĐP12 + bốn câu còn treo của lượt 2 cũ (cuối phần này) |
| 4 | ĐP1, ĐP10 |

### Về Phần 1 (mô hình)

**ĐP1. Chiều về có thể ít người hơn chiều đi không?** (ví dụ 2 khách ở lại đảo). *(lượt 4)*
- (a) **Có.** Văn phòng sửa được số người của riêng chặng về, không vượt số khách của đơn. Được: xe về không giữ chỗ trống cho người không đi; danh sách đúng. Mất: thêm một ô trên chặng.
- (b) **Không.** Chặng về luôn đủ người; ai không về thì tài xế bấm "vắng". Được: gọn. Mất: xe về giữ chỗ cho người không đi; tài xế phải chờ ở điểm đón.
- **Khuyến nghị: (a).**

### Về Phần 2 (luật)

**ĐP2. Mốc 6 giờ tính tới lúc nào?** *(lượt 1)*
> **Chủ đã trả lời 29/9:** "Theo 4 khuyến nghị" — (i) giờ xuất bến; (ii) không phá lệ lần nữa; (iii) chỉ khoá "ai đi xe nào", đổi xe, đổi tài xế; (iv) kiểm lại lúc xác nhận và khi sửa nơi đón/trả. Đã áp (C17).
- (i) Lúc **xếp xe**, 6 giờ tính tới:
  - (a) **giờ xe xuất bến** của chuyến (xe thường chạy trước giờ đón khách đầu tiên). Được: đúng chữ "giờ khởi hành" bạn dùng; cả chuyến khoá cùng lúc. Mất: khoá sớm hơn một chút.
  - (b) **giờ đón của từng chặng**. Được: linh hoạt hơn một ít. Mất: một chuyến có chặng đã khoá, chặng chưa khoá — khó hiểu trên màn.
  - **Khuyến nghị: (a).** (Lúc **đặt**, 6 giờ luôn tính tới giờ đón hẹn trên biểu mẫu — không cần hỏi.)
- (ii) Một chặng đã **"đặt gấp" có lý do lúc đặt**, lúc xếp xe có phải phá lệ **lần nữa** không?
  - (a) **Không** — một lần ghi lý do dùng cho cả chặng đó. Được: không hỏi lý do hai lần cho cùng một việc. Mất: người xếp xe không phải ký thêm.
  - (b) **Có** — người xếp xe ghi lý do riêng. Được: hai người cùng chịu. Mất: chậm lúc gấp.
  - **Khuyến nghị: (a).**
- (iii) Trong 6 giờ trước giờ khởi hành, **việc nào** bị khoá (phải phá lệ)?
  - (a) **Chỉ việc "ai đi xe nào"**: xếp, dời, rút khách; đổi xe; đổi tài xế. Còn đổi thứ tự điểm, chỉnh giờ xe tới thì vẫn làm được, có ghi nhật ký. Được: đúng nghĩa "xếp xe tối thiểu 6 giờ trước"; không bắt ký lý do cho việc chỉnh nhỏ. Mất: kế hoạch vẫn nhúc nhích được tới sát giờ.
  - (b) **Mọi thay đổi kế hoạch** của chuyến. Được: chặt nhất. Mất: chỉnh 5 phút giờ xe tới cũng phải phá lệ.
  - **Khuyến nghị: (a).**
- (iv) Hai chỗ còn hở của mốc 6 giờ **lúc đặt**:
  - **Lúc xác nhận đơn.** Đơn nháp lưu lúc còn đủ 6 giờ, nhưng lúc bấm Xác nhận chỉ còn 4 giờ. (a) **Kiểm lại lúc xác nhận** — dưới mốc thì phải "đặt gấp" có lý do (giống cách app hôm nay kiểm lại ngày khởi hành ngay trong lúc xác nhận đơn). Được: không lách được mốc bằng cách lưu nháp sớm. Mất: thêm một lần hỏi lý do. (b) Không kiểm lại. Được: nhanh. Mất: có đường lách.
  - **Sửa nơi đón, nơi trả** (không đổi giờ) của một chặng đã hợp lệ khi đã vào trong 6 giờ. (a) **Cũng phải "đặt gấp" có lý do** — với xe, đổi nơi làm xáo lịch như đổi giờ. (b) Không cần; máy chỉ nhắc người xếp xe và tài xế (như khi đổi giờ hẹn). Được: ít vướng. Mất: xe có thể phải đổi lộ trình sát giờ mà không ai ghi lý do.
  - **Khuyến nghị: (a) cho cả hai.**
- (v) *(hỏi thêm sau kiểm nhanh ADR-0049)* Đơn có giờ hẹn **đã** dưới mốc ngay từ lúc gõ: bấm Lưu nháp thì máy làm gì? "Cho lưu nháp, chặn ở Xác nhận" / "Chặn ngay từ lúc lưu".
  > **Chủ đã trả lời 29/9** ([HĐ] "Trả lời lần 4"): **"Cho lưu nháp, chặn ở Xác nhận"** — chủ đã được nói rõ cách này lỏng hơn câu "áp cả lúc khách đặt (biểu mẫu)" ngày 28/9 và vẫn chọn. Đã áp (C22).

**ĐP3. Ai được phá lệ mốc 6 giờ (và khoảng nghỉ giữa hai chuyến)?** *(lượt 1)*
> **Chủ đã trả lời 29/9:** "Chỉ Quản trị, Toàn quyền" — cả lúc đặt lẫn lúc xếp (chặt hơn khuyến nghị). Đã áp (C18).
- (a) **Lúc đặt:** người lập đơn trong công ty (Bán hàng với đơn mình lập hoặc phụ trách, Quản trị, Toàn quyền). **Lúc xếp:** người xếp xe (Bán hàng, Quản trị, Toàn quyền). Thực tập và Đối tác không được — gọi văn phòng. Được: không chặn bán hàng lúc khuya; mọi lần phá lệ có tên, lý do, và đếm được trên màn "dòng dữ liệu". Mất: luật chỉ mạnh bằng kỷ luật của người bán.
- (b) **Chỉ Quản trị và Toàn quyền**, cả hai lúc. Được: chặt nhất. Mất: đơn sát giờ ban đêm phải chờ Quản trị.
- (c) Lúc đặt như (a); lúc xếp chỉ Quản trị và Toàn quyền. Được: người bán vẫn nhận khách; kế hoạch xe do người cấp trên chịu. Mất: Bán hàng xếp xe buổi sáng sớm phải gọi Quản trị.
- **Khuyến nghị: (a).**

**ĐP4. Tài xế B đã bấm Nhận nhưng máy thấy không đạt — văn phòng có được duyệt thay không?** *(lượt 2)* Chỗ ngồi, trùng giờ, bằng lái là luật lõi: **không ai** duyệt thay được. Câu này chỉ hỏi về luật cài đặt được (khoảng nghỉ giữa hai chuyến).
- (a) **Có.** Quản trị hoặc Toàn quyền (người được phá lệ theo ĐP3) duyệt kèm lý do; nhật ký ghi "người duyệt", không phải "máy". Được: không mắc kẹt vì một con số cài đặt. Mất: thêm một việc cho văn phòng.
- (b) **Không.** Không đạt là dừng; văn phòng thêm điểm đó vào xe khác. Được: đơn giản. Mất: có khi phải huy động thêm xe chỉ vì thiếu vài phút nghỉ.
- **Khuyến nghị: (a).**

**ĐP5. Xe hỏng giữa đường, khách đang trên xe: ai chuyển khách sang xe cứu hộ?** *(lượt 2)* Bạn đã nói khi xe chạy "văn phòng chỉ thêm điểm đón".
- (a) **Như chuyển điểm đón:** tài xế xe hỏng gửi đề nghị "chuyển khách đang trên xe" sang xe cứu hộ, tài xế cứu hộ Nhận, máy tự xác nhận nếu đủ chỗ. **Văn phòng bấm thay được** cho tài xế xe hỏng (như đã cho bấm thay Xuất bến, Đã đón), có ghi người bấm. Được: một luồng cho mọi việc chuyển; vẫn có kiểm chỗ. Mất: văn phòng có thêm một nút.
- (b) **Văn phòng làm hết:** thêm điểm "nơi gặp" vào xe cứu hộ, kết thúc chuyến xe hỏng; máy tự chuyển khách. Được: nhanh khi tài xế đang bận xử lý sự cố. Mất: văn phòng làm được việc "chuyển" — khác câu "chỉ thêm" của bạn.
- (c) **Chỉ tài xế**, văn phòng không bấm thay. Được: đúng nhất với câu "chỉ thêm". Mất: tài xế xe hỏng không bấm được thì kẹt.
- **Khuyến nghị: (a).**

**ĐP6. Người xếp xe (Bán hàng) có được đổi giờ hẹn với khách trên đơn của người khác không?** *(lượt 1)* Hôm nay Bán hàng chỉ sửa được thông tin chuyến của đơn mình lập hoặc mình phụ trách.
> **Chủ đã trả lời 29/9:** "Không, nhắc người phụ trách". Đã áp (C19).
- (a) **Không.** Người xếp xe chỉ đổi **giờ xe tới**; muốn đổi **giờ hẹn khách** thì máy nhắc người phụ trách đơn gọi khách rồi sửa. Được: giữ "đơn của ai người đó lo"; người gọi khách là người đã hứa với khách. Mất: thêm một bước khi gấp.
- (b) **Có** — mở cho người xếp xe sửa giờ hẹn của mọi đơn. Được: nhanh. Mất: người phụ trách đơn có thể không biết khách đã được hẹn giờ mới.
- **Khuyến nghị: (a).**

**ĐP7. "Hợp đồng vận chuyển" của chuyến (luật đòi với xe hợp đồng) làm lúc nào?**
> **Chủ đã trả lời 29/9:** đồng ý (a) — để lượt riêng, công tắc khoá ở tắt. Đã áp (C20).
- (a) **Chưa làm ở bốn lượt này.** Công tắc "phải có hợp đồng" khoá ở tắt tới khi có một lượt riêng làm hợp đồng (số, bên thuê, điểm được phép). Được: gọn. Mất: tạm thời máy chưa kiểm hợp đồng.
- (b) **Làm luôn bản đơn giản** (số hợp đồng, bên thuê, ngày). Được: có sớm. Mất: thêm một quyết định dữ liệu, phải thêm một lượt duyệt.
- **Khuyến nghị: (a).** Việc "ghép khách nhiều đơn vào một xe hợp đồng" **chưa có người chuyên môn pháp lý kiểm** — nên hỏi người chuyên môn trước khi làm (b).

### Về Phần 3 (bộ máy)

**ĐP8. Khi nhiều người cùng thao tác (văn phòng xếp xe, tài xế bấm nút), máy xử lý theo cách nào?** *(lượt 1)*
> **Chủ đã trả lời 29/9:** đồng ý (a) — PA-1. Đã áp (C20).
- (a) **Mỗi thao tác được kiểm luật và ghi ngay trong một lần.** Hai người đụng nhau thì người sau thấy "vừa có thay đổi, tải lại"; riêng lúc tài xế bấm Nhận, máy tự thử lại một lần. Được: không thêm thành phần nào, không thêm tiền; mọi luật kiểm được bằng máy. Mất: thỉnh thoảng có người phải tải lại.
- (b) **Một "trạm điều phối" riêng cho mỗi ngày**, xếp hàng mọi thao tác. Được: không bao giờ đụng nhau. Mất: thêm một thành phần mà **sau khi bật, Cloudflare không cho quay về bản cũ bằng một lệnh**; hai nơi giữ dữ liệu dễ lệch; phức tạp hơn nhiều.
- (c) **Hàng đợi xử lý nền.** Được: chịu tải lớn. Mất: tài xế bấm Nhận xong phải chờ mới biết kết quả; thêm hạ tầng. Không phù hợp.
- **Khuyến nghị: (a).**

### Về Phần 4 (màn hình)

**ĐP9. Khi tài xế A chọn xe để nhờ đón, A thấy gì về các xe khác đang chạy cùng ngày?** *(lượt 2)*
- (a) Mã chuyến, **tên tài xế, số chỗ còn trống, điểm sắp tới** — không thấy khách của xe khác. Được: A chọn đúng xe, ít bị từ chối. Mất: tài xế thấy lịch chạy của đồng nghiệp trong ngày.
- (b) Chỉ chọn **tên tài xế**; máy tự tìm chuyến của người đó; A không thấy số chỗ. Được: kín hơn. Mất: A gửi mù, bị từ chối nhiều hơn.
- (c) Thấy như văn phòng (cả điểm dừng của xe khác). Được: đủ thông tin. Mất: lộ nhiều nhất.
- **Khuyến nghị: (a).**

### Về Phần 6 (quyền, dữ liệu)

**ĐP10. Cài "dịch vụ này đưa đón mấy chiều" ở đâu?** *(lượt 4)*
- (a) **Trong app**, ở màn Danh mục (Quản trị sửa, có lịch sử, có ngày hiệu lực) — giống cách app đã cho ghi đè giá riêng mà không đụng Sheet. Được: Sheet giữ đúng vai bảng giá; đổi có dấu vết ai đổi. Mất: sửa ở hai nơi (giá ở Sheet, đưa đón ở app).
- (b) **Thêm một cột trong Google Sheet bảng giá**, đồng bộ 15 phút một lần như giá. Được: sửa một chỗ quen tay. Mất: ai đó sửa nhầm Sheet là đổi luôn cách lập đơn, và app không biết ai đổi.
- **Khuyến nghị: (a).**

**ĐP11. Tài xế xe công ty và tài xế nhà xe đối tác có được nhờ nhau đón điểm không?** *(lượt 3 — chỉ có nghĩa nếu ĐP12 cho tài xế đối tác dùng app)*
- (a) **Được, như nhau.** Luật chỗ ngồi, giờ giống nhau; tiền thuê nhà xe tính theo chuyến nên không đổi. Được: linh hoạt nhất khi kẹt xe. Mất: khi làm phần tiền (lượt 3 cũ), có thể nhà xe đòi tính thêm cho khách nhận giữa đường — lúc đó thêm điều kiện.
- (b) **Chỉ giữa xe cùng chủ** (công ty với công ty; trong cùng một nhà xe). Được: tiền và trách nhiệm rõ. Mất: kém linh hoạt.
- **Khuyến nghị: (a).**

**ĐP12. Có cho tài xế nhà xe đối tác (người ngoài công ty) dùng app cho chuyến không — thấy chuyến mình lái, bấm các nút tiến độ, và thấy tên, năm sinh, số điện thoại của khách?** *(lượt 3)* Đây là dữ liệu cá nhân của khách đưa cho người ngoài công ty; **đã xem thì không rút lại được**. Tới khi bạn trả lời, tài xế đối tác chưa dùng app cho chuyến; văn phòng bấm thay và gọi họ.
- (a) **Có, cùng luật với tài xế công ty:** chỉ chuyến mình lái; tên, năm sinh, số điện thoại chỉ trong ngày chạy (mốc sớm nhất trả lời cùng câu Q1 cũ của lượt 2, ví dụ "từ lúc hết hạn Từ chối"). Được: tài xế đối tác tự đón khách, nhờ xe khác đón được; văn phòng không phải gọi từng xe. Mất: người ngoài công ty có số khách trong ngày chạy.
- (b) **Có, nhưng không có số điện thoại khách:** thấy chuyến, bấm tiến độ, thấy tên + năm sinh; cần gọi khách thì gọi văn phòng. Được: kín hơn. Mất: văn phòng phải trực máy lúc đón.
- (c) **Không:** tài xế đối tác không dùng app cho chuyến; văn phòng bấm thay mọi nút và gọi tài xế. Được: kín nhất. Mất: văn phòng làm thay toàn bộ; xe nhà xe không tham gia chuyển điểm giữa xe.
- **Khuyến nghị: (a)** — nhưng **chưa áp**; chỉ áp khi bạn trả lời.

**ĐP13. Người xếp xe (Bán hàng) có được bổ sung tên khách ngay trên màn chuyến, cho cả đơn của người khác không?** *(lượt 2)* Hôm nay Bán hàng chỉ nhập tên khách cho đơn mình lập hoặc mình phụ trách, ở màn đơn. Tài xế thì bổ sung được tại chỗ (từ lượt 2); Quản trị, Toàn quyền nhập được mọi đơn.
- (a) **Không.** Bán hàng nhập tên ở màn đơn như hôm nay; đơn của người khác thì nhắn người phụ trách. Được: giữ "đơn của ai người đó lo"; không mở đường vòng ghi tên khách vào đơn người khác. Mất: sát giờ xuất bến mà đơn người khác thiếu tên thì người xếp xe phải chờ người phụ trách, Quản trị, hoặc tài xế bổ sung lúc đón.
- (b) **Có** — Bán hàng bổ sung tên cho mọi khách trên chuyến, ngay trên màn chuyến. Được: nhanh lúc gấp. Mất: người phụ trách đơn có thể không biết tên khách vừa bị sửa; mở rộng quyền ghi dữ liệu cá nhân.
- **Khuyến nghị: (a).** (Cùng loại với ĐP6.)

### Bốn câu còn treo của lượt 2 cũ (hỏi trước lượt duyệt 3; nguyên văn và phương án ở `docs/superpowers/specs/2026-09-28-de-xuat-adr-van-chuyen-luot-2.md` §6)

- **Q1 cũ** — tài xế đối tác thấy tên khách, năm sinh, SĐT từ lúc nào (bản này tạm áp "trong ngày chạy" như tài xế công ty; câu này chỉ có thể **siết** thêm).
- **Q2 cũ** — tài xế được Từ chối chuyến tới lúc nào.
- **Q3 cũ** — tài xế công ty có được Từ chối, Báo bận như tài xế đối tác không.
- **Q7 cũ** — lịch bận của tài xế lưu ở đâu.

---

## Phần 8 — Chia lát thi công và tiêu chí nghiệm thu

**Mọi lát:** test **đỏ trước, xanh sau**; `npm test` + `npm run typecheck` (0 lỗi); lát chạm API hoặc migration chạy thêm `npm run test:e2e` và `node scripts/audit-invariants.mjs --db local` (thoát 0); mỗi hàng rào mới có dòng `docs/SO-HANG-RAO.md` kèm **ngày quan sát chặn thật** (sửa cố ý → đỏ → hoàn nguyên); bảng mới vào `docs/data-dictionary.json` + `npm run dict`; số migration lấy lúc thi công sau khi liệt kê migration của **mọi nhánh và worktree chưa gộp** (`CLAUDE.md` §10). Mỗi lượt là **việc lớn** (dữ liệu + quyền + dữ liệu cá nhân) ⇒ **người kiểm độc lập chỉ đọc** ở cuối lượt.

**Nền phải có trước (đã duyệt, chưa thi công — không phải việc mới của bản này):**
- **N0** ADR-0047: tiền tố `ord_`, `soKhachHieuLuc`, `ord_transfer_leg`, `ord_passenger`, ba view khoá + cờ, hàm `hanhKhachChoChuyen`.
- **N1** ADR-0048 lát 1: quyền `DRIVER_PARTNER`, `v_pty_carrier_driver`, chủ xe là nhà xe.

### 8.1 Các lát

| Lát | Nội dung | Phụ thuộc | Chạy song song với |
|---|---|---|---|
| **1.1** | Chính sách + danh mục: `vc_dispatch_policy` (cột lượt 1), `vc_departure_rule`, `vc_license_capacity`, `vc_reason`; route `settings.ops` / `admin.manage`; hàm công bố "giấy tờ hiện hành của một tài xế" ở `parties` (không số) | duyệt lượt 1 | N0, N1, 1.3, 1.4 |
| **1.2** | Lõi dữ liệu chuyến: `vc_trip`, `vc_trip_driver`, `vc_trip_stop`, `vc_trip_allocation`, `vc_trip_event`, bản chụp xuất bến; mọi trigger lõi của lượt 1; tập đóng định trọn | N0, N1, 1.1 | 1.3, 1.4 |
| **1.3** | Luật thuần ở `src/shared/`: `dungLichChung`, `trangThaiChang`, `kiemXep`, `kiemXuatBen`, `LyDoGiu`, đổi giờ VN ↔ mili-giây; **bộ ca mẫu điều phối** (tệp dữ liệu vào + kết quả mong đợi, lấy ví dụ xe A/B của chủ) | duyệt lượt 1 (chỉ cần kiểu dữ liệu) | 1.1, 1.2, 1.4, N0 |
| **1.4** | Phía `orders`: hàm hẹp `lichChungChang`, `lienHeChoTaiXe`; cột đặt gấp + ô `order.leg.short_notice`; hàm tiêm `ctx.mocToiThieu` ở gốc lắp ráp | N0 | 1.1, 1.2, 1.3 |
| **1.5** | Route văn phòng: lịch chung ngày D, tạo/sửa/huỷ chuyến, xếp/dời/rút suất, đổi thứ tự, ghi đè giờ xe tới, phá lệ, xuất bến bấm thay; nhật ký cùng lô | 1.2, 1.3, 1.4 | 1.6 |
| **1.6** | Ô quyền lượt 1 trong `MATRIX` + bài ghim hàng `DRIVER` mới (hàng `DRIVER_PARTNER` giữ ghim của ADR-0048); route tài xế; DTO danh sách trắng + "trong ngày chạy"; `request_id` | 1.2, 1.3, 1.4 | 1.5 |
| **1.7** | Câu kiểm định kỳ (L-D1, L-B1, L-B2, "chặng quá mốc chưa xếp", "chuyến 48 giờ tới không đạt"); sổ hàng rào; `SYSTEM-DESIGN.md`, `CHANGE-GUIDE.md` | 1.5, 1.6 | — |
| **1.8** | Giao diện V1–V3, V5–V7, V12 (mốc), V13 theo bản vẽ Claude Design | bản vẽ + 1.5, 1.6 (phần biểu mẫu đơn: sau 1.4) | — |
| **2.1** | Đề nghị chuyển: `vc_transfer_request`, `vc_transfer_check`, hai cột chính sách, trigger LC-14, `kiemChuyen`, route, ô `trip.transfer`, tự thử lại một lần | xong lượt 1 + duyệt lượt 2 | 2.2 (trừ phần cứu hộ), 2.3 |
| **2.2** | Thay đổi khi xe đang chạy: cột báo huỷ, trigger LC-15, route thêm điểm / báo huỷ; ô `trip.passenger.add` + câu ghi hành khách của tài xế (phía `orders`); cứu hộ theo ĐP5 (dùng đề nghị `ONBOARD` của 2.1) | xong lượt 1 | 2.1, 2.3 |
| **2.3** | Thông báo + Bảng tin: loại sự kiện `chuyen`, nhãn `dieu-xe`, `v_aud_trip_event`, hai hàm tiêm, một hàm thuần lọc người nhận, gõ cửa điện thoại | xong lượt 1 | 2.1, 2.2 (chốt tên hành động nhật ký trước) |
| **2.4** | Giao diện V4 (dòng dữ liệu: phễu, hành trình một chặng, nhật ký máy), V8–V11 | bản vẽ + 2.1–2.3 | — |
| **2.5** | Gợi ý xếp xe (MQ-01): hàm thuần + nút "Gợi ý xếp" trên V1; không ghi gì, không cần quyết định mới | xong lượt 1 | 2.1–2.4 |
| **3.1** | Tài xế đối tác trên chuyến (D7): cột `DRIVER_PARTNER` ở các ô `trip.*`, DTO theo ĐP12, bài ghim hàng `DRIVER_PARTNER` mới | xong lượt 2 + duyệt lượt 3 (ĐP12) | 3.2, 3.3 |
| **3.2** | Từ chối chuyến (D8, khuôn lượt 2 lát 3) | xong lượt 2 + duyệt lượt 3 | 3.1, 3.3 |
| **3.3** | Báo bận (D9, khuôn lượt 2 lát 4) | như 3.2 | 3.1, 3.2 |
| **3.4** | Giao diện V15; màn tài xế cho tài xế đối tác (nếu khác V5–V9) | bản vẽ + 3.1–3.3 | — |
| **4.1** | Chiều về theo dịch vụ (ĐP10) + số người riêng của chặng (ĐP1) | duyệt lượt 4 + N0 | **mọi lát** (không đụng `vc_`) |
| **4.2** | Giao diện V12 (tự tạo chặng), V14 | bản vẽ + 4.1 | — |

- **Đường găng:** N0 → 1.2 → 1.5 / 1.6 → 1.7 → 1.8 → (lượt 2) 2.1 → 2.4.
- **Song song nhiều nhất:** đầu lượt 1 chạy cùng lúc N0, N1, 1.1, 1.3 (và 1.4 ngay khi N0 xong).
- **Phát hành đề xuất:** P1 = N0 + N1 + lượt 1 phần máy chủ (không giao diện: an toàn, chưa ai dùng); P2 = giao diện lượt 1; P3 = lượt 2; P4 = lượt 3; P5 = lượt 4 (độc lập — có thể sớm hơn).

### 8.2 Tiêu chí nghiệm thu kiểm bằng máy

**Lát 1.1**
- Test SQL (`node:sqlite`): `UPDATE`/`DELETE` dòng chính sách → `RAISE`.
- Route: Quản trị `POST` chính sách → 403; Toàn quyền → 201; ngày hiệu lực lùi → 400. Quản trị `POST` lý do → 201; Bán hàng → 403.
- Hàm `parties` mới: test liệt kê khoá trả về, **không** có `number`, `numberKey`, `issuedPlace`.

**Lát 1.2** (mỗi ý một test SQL, sửa cố ý → đỏ → hoàn nguyên, ghi sổ hàng rào)
- mở suất thứ (số chỗ + 1) ở `WAITING` → `RAISE`; `NO_SHOW → BOARDED` làm vượt chỗ → `RAISE`; giảm `passenger_capacity` của xe dưới số suất đang mở của chuyến chưa xong → `RAISE`;
- hai suất mở cùng `(leg_id, passenger_key)` → UNIQUE; đặt `passenger_key` lần hai → `RAISE`;
- mở suất cho chặng của đơn nháp, đơn đã huỷ, chặng đã đóng → `RAISE`; gắn người của đơn khác → `RAISE`;
- hai chuyến chưa huỷ cùng xe chồng giờ → `RAISE`; cùng tài xế chồng giờ → `RAISE`; hai chuyến `RUNNING` cùng xe → UNIQUE;
- `PLANNED → RUNNING` không có dòng kiểm đạt cùng lô → `RAISE`; `ENDED → PLANNED` → `RAISE`; sửa điểm/suất của chuyến `ENDED` → `RAISE`; `DELETE` mọi bảng `vc_trip*` → `RAISE`;
- "Kết thúc" thường khi còn suất `WAITING` → `RAISE`;
- **Kết thúc gián đoạn đúng thứ tự §2.1a** (cổng → nhật ký → sự kiện `ENDED_INTERRUPTED` → đóng suất `TRIP_INTERRUPTED` → điểm `SKIPPED` → đổi trạng thái chuyến cuối lô) → **được**; sau đó mọi sửa điểm/suất của chuyến → `RAISE` (LC-06);
- **Đảo thứ tự** — đổi trạng thái chuyến sang `ENDED_INTERRUPTED` khi còn suất `WAITING`/`BOARDED` mở hoặc điểm `PENDING`/`ARRIVED` → `RAISE` (LC-16); đóng suất `TRIP_INTERRUPTED` khi **không** có sự kiện `ENDED_INTERRUPTED` mang đúng dấu lệnh hiện hành của chuyến → `RAISE` (LC-15); đóng suất `TRIP_INTERRUPTED` bằng một lô **khác** sau khi lô gián đoạn đã xong (dấu lệnh đã đổi hoặc chuyến đã kết thúc) → `RAISE`;
- huỷ chuyến `PLANNED` đúng thứ tự (đóng suất `TRIP_CANCELLED` trước, đổi trạng thái cuối) → được; đảo thứ tự → `RAISE` (LC-06);
- `request_id` trùng → UNIQUE; lô có câu cổng thua → **không** có dòng `audit_log`, `vc_trip_event` hay câu ghi chính nào của lô đó; hai lô cùng đọc một `version` → đúng một chuyến mang dấu lệnh của lô thắng; câu kiểm định kỳ "sự kiện mồ côi" (sự kiện không có `audit_log` cùng id) thoát 1 trên dữ liệu gieo lỗi;
- tài xế đối tác với xe công ty → `RAISE` (LC-13);
- chuyến `RUNNING`: mở suất, đóng suất, thêm điểm, đổi xe, đổi tài xế → `RAISE` (LC-15 lượt 1); đổi thứ tự điểm `PENDING`, đổi trạng thái tiến độ, gắn tên vào suất → được.

**Lát 1.3**
- Bảng ca `trangThaiChang`: mỗi trạng thái §2.5 có ít nhất một ca; ca ranh giới đúng mốc 360 phút (359 → dưới mốc, 360 → đạt).
- `kiemXep`, `kiemXuatBen`: bảng ca (thiếu tên, GPLX hết hạn trước giờ kết thúc, hạng B với xe 15 chỗ, chính sách rỗng, đơn đã huỷ, thiếu suất, thừa suất, chưa có tài xế) → đúng mã lý do và đúng "ai xử lý".
- Giờ: 22:30 giờ VN ngày D → đúng mili-giây; chuyến 23:00 → 01:00 hợp lệ; > 24 giờ → lỗi; ca 00:00–07:00 VN.
- **Bộ ca mẫu điều phối**: ví dụ xe A/B của chủ (Alibu ↔ Mường Thanh) → mỗi bước ra đúng quyết định và đúng danh sách luật. Chủ xác nhận đáp án trước khi lát 2.1 được nhận.

**Lát 1.4**
- `lichChungChang`: test liệt kê khoá — không có khoá tiền, ghi chú, người lập, SĐT, họ tên; chỉ chặng mở của đơn đã xác nhận, chưa huỷ.
- Mốc lúc đặt (C17, C18): Bán hàng lưu nháp chặng dưới mốc → 200 kèm cảnh báo; Bán hàng xác nhận → 409 `short_notice_required`; Bán hàng gọi route đặt gấp → 403; Quản trị đặt gấp thiếu lý do → 400; có lý do → 200, đủ cột `short_notice_*` (kể cả số phút đã dùng); sau đó xác nhận → 200. Thực tập, Đối tác như Bán hàng. Nhật ký không chứa tên, năm sinh.
- ĐP2(iv) (đã chọn): điều kiện mốc nằm **trong** câu xác nhận (khuôn `confirmWindow` của `orders/repository.ts`); Bán hàng sửa nơi đón của chặng đơn đã xác nhận khi dưới mốc → 409; Quản trị sửa kèm lý do → 200.
- Test hợp đồng: route lập/sửa chặng gọi `ctx.mocToiThieu` đúng một lần; thiếu hàm tiêm (khung thử) → **chặn** (không đoán con số).
- Bài quét: mọi nơi gọi `lichChungChang`, `lienHeChoTaiXe` đều đứng sau `can(trip.*)` trong cùng hàm route (lát 2.2 thêm câu ghi hành khách của tài xế vào cùng bài quét).

**Lát 1.5**
- e2e `van-chuyen-dieu-phoi`: tạo chuyến → xếp 3 chặng → bị giữ "thiếu 2 tên" → nhập tên → xuất bến 200, có dòng `vc_trip_departure_check` và `vc_trip_manifest`.
- Hai người sửa cùng `version` → đúng một 409 "vừa có thay đổi".
- Kế toán `POST` xếp xe → 403.
- Trong 6 giờ trước giờ xuất bến (C17): Bán hàng dời khách, đổi xe, đổi tài xế → 409; Bán hàng gọi route phá lệ → 403; Quản trị phá lệ → 200 + sự kiện `PHA_LE` có `policy_id`; Bán hàng đổi thứ tự điểm, chỉnh giờ xe tới → 200 (có sự kiện); Bán hàng xếp **chặng đã đặt gấp** vào chuyến đó → 200, không cần phá lệ.
- **Bài chạy đua** (kiểm giả định "D1 chạy lô lần lượt"): 10 yêu cầu song song xếp vào một chuyến còn 3 chỗ → đúng 3 thành công, số suất mở không bao giờ vượt số chỗ. Đỏ trước bằng cách tạm tắt trigger sức chứa.

**Lát 1.6**
- `src/shared/permissions.test.ts`: ghim hàng `DRIVER` — đúng hai ô `assigned` của lượt 1 (`trip.view`, `trip.progress`), các ô cũ theo ADR-0040, còn lại `none`; hàng `DRIVER_PARTNER` **giữ nguyên** ghim của ADR-0048 (mọi ô `trip.*` = `none`). Sửa một ô → đỏ.
- e2e: tài khoản chỉ-`DRIVER_PARTNER` gọi mọi route tài xế → 403.
- `src/shared/cong-quyen.test.ts`: `DRIVER`, `DRIVER_PARTNER` ∉ cổng `office`, `orders`, `admin`.
- `src/route-write-guard.test.ts` (hàng rào 2, siết theo ADR-0019 điều 6 mới): mọi route tài xế ở cổng `staff` hỏi `can(trip.*)` trong thân route; thêm cố ý một route tài xế không hỏi `can()` → đỏ; route tự phục vụ `/api/account/*` vẫn là ngoại lệ.
- e2e tài xế: mở chuyến của tài xế khác → **404**; `Đã đón` gửi hai lần cùng `request_id` → một sự kiện.
- DTO: test liệt kê khoá — ngoài ngày chạy, khoá tên, năm sinh, SĐT **vắng mặt**; trong ngày chạy có; mọi lúc không có khoá tiền.

**Lát 1.7**
- `node scripts/audit-invariants.mjs --db local` trên dữ liệu gieo lỗi cố ý (suất vượt số người, manifest thiếu tên, tài xế hết hạn bằng) → thoát 1, đúng mã; dữ liệu sạch → thoát 0.

**Lát 1.8** — kịch bản Chrome từng màn (khuôn `web/CLAUDE.md`), ảnh ở `docs/evidence/`; tài khoản chỉ-`DRIVER` không thấy mục văn phòng; Kế toán không thấy nút thao tác.

**Lát 2.1**
- e2e đạt: `CONFIRMED`, `decided_mode = 'MAY'`, đủ dòng `vc_transfer_check`, suất đã đóng ở A và mở ở B, điểm A → `MOVED`, B có điểm đón + điểm trả mới, `version` hai chuyến cùng tăng, nhật ký có mã luật và **không** tên.
- Không đạt (vượt chỗ) → `ESCALATED`, **không** suất nào đổi. Công tắc tắt → `ESCALATED`.
- Điểm đã tới → 409 / `VOID`; người gửi không lái chuyến nguồn → 404; B nhận sau hết giờ chờ → `EXPIRED`.
- Chạy đua: văn phòng thêm điểm vào B đúng lúc B nhận → tự thử lại một lần, kết quả đúng theo dữ liệu mới.
- SQL: `CONFIRMED → PENDING` → `RAISE`; xác nhận mà suất vượt chỗ → `RAISE`.

**Lát 2.2**
- Sau migration nới LC-15: văn phòng **thêm** suất vào chuyến `RUNNING` (`added_after_departure = 1`) → được; văn phòng **đóng** suất của chuyến `RUNNING` (không qua đề nghị `CONFIRMED`) → `RAISE` ở CSDL **và** 409 ở route; đổi xe / đổi tài xế chuyến `RUNNING` → vẫn `RAISE`.
- Báo huỷ: suất vẫn chiếm chỗ; tài xế ghi "Khách đã huỷ" → hết chiếm chỗ.
- Tài xế thêm tên cho đơn không có trên chuyến mình → 404; tên thêm có `source = 'DRIVER'`; bài quét "nơi gọi câu ghi hành khách của tài xế đứng sau `can(trip.passenger.add)`"; hàng `DRIVER` nay có thêm `trip.passenger.add`, `trip.transfer` = `assigned` (sửa bài ghim có chủ đích).
- Cứu hộ theo ĐP5: ca đủ chỗ, ca không đủ chỗ (chia hai xe).

**Lát 2.3**
- Hàm thuần lọc người nhận, chạy với **mọi tập con quyền** (khuôn NT-3): tin xếp chuyến chỉ tới tài xế được xếp; tài xế bị gỡ thấy tin gỡ nhưng không thấy tin sau khi bị gỡ; tin leo thang tới mọi người có `trip.dispatch = any`; tin chuyến **không bao giờ** gắn `tat-ca`; tài khoản chỉ-`DRIVER_PARTNER` không nhận `noi-bo`.
- Bảng tin: nhãn `dieu-xe` chỉ khi `can(trip.view)` không ngữ cảnh.
- `src/architecture.test.ts` không thêm cạnh `thongbao → van-chuyen`; route gọi `baoThayDoiChuyen` đúng một lần **sau** lô thành công, không gọi khi 409.
- Bài quét nhật ký (khuôn `src/giay-to-khong-lo-so.test.ts`): chạy mọi route mới với dữ liệu mẫu có tên, năm sinh, SĐT → `audit_log.detail` không chứa chúng, không có dãy ≥ 8 chữ số.

**Lát 3.1** (D7, nếu ĐP12 cho mở) — ghim hàng `DRIVER_PARTNER` mới; DTO: khoá tên, năm sinh, SĐT vắng mặt ngoài khung ĐP12 + Q1 cũ; IDOR → 404; không bao giờ có khoá tiền.

**Lát 3.2–3.3** — theo tiêu chí 13–19 của lượt 2 cũ (§10) cho Từ chối, Báo bận.

**Lát 4.1** — chiều về: dịch vụ "hai chiều" → lập đơn có đúng 2 chặng, "không đưa đón" → 0 chặng, người lập bỏ/thêm tay được.

---

## Phần 9 — Tự rà

### 9.1 Giả định đã tự đặt (bề mặt, đảo ngược được — người kiểm nên soi)

| Mã | Giả định | Ở |
|---|---|---|
| G-01 | Lịch chung chỉ đếm đơn nháp có đưa đón (một con số), không hiện chi tiết | §1.3 |
| G-02 | Lý do "đặt gấp" là hằng trong mã (vì `orders` không đọc được `vc_reason`) | §2.2 |
| G-03 | *(đã bỏ)* — không phải giả định bề mặt; thành quyết định D7 (lượt 3) và câu ĐP12 (người kiểm độc lập 29/9) | §6.1 |
| G-04 | "Trong ngày chạy" = hôm nay là ngày của chuyến, hoặc chuyến đang chạy | §6.3 |
| G-05 | Không bản đồ; máy không biết thời gian đi đường | §4.8, MQ-03 |
| G-06 | Văn phòng **không** miễn cho tài xế tới điểm đã báo huỷ (đọc chặt chữ "mặc định"); thêm công tắc "không cần tới" sau nếu chủ muốn | LC-15, §5.7 |
| G-07 | Chuyển điểm chỉ trong cùng ngày; xe nhận đang lên kế hoạch hoặc đang chạy | LC-14 |
| G-08 | Sức chứa tính tổng suất chờ đón + đã lên của cả chuyến (người đã xuống thì thôi) — an toàn hơn tính theo từng đoạn đường; chuyến trả rồi đón thêm quá đông phải tách chuyến (như 1b G4) | LC-02 |
| G-09 | Mã chuyến dạng `CX-<ngày tháng>-<số>`; khoảng nghỉ gieo 30 phút; chờ nhận 10 phút; cảnh báo sát mốc 120 phút | §1.4, §2.2 |
| G-10 | Quy mô ước lượng: ≤ 300 chặng, ≤ 50 chuyến mỗi ngày (**chưa kiểm** số thật) | §3.2 |

### 9.2 Chỗ mâu thuẫn tiềm ẩn đã thấy

1. **"Văn phòng chỉ thêm điểm đón"** so với **văn phòng duyệt đề nghị leo thang** (ĐP4) và **cứu hộ xe hỏng** (ĐP5): cả hai là văn phòng tác động tới việc chuyển khách. Không tự hoà — đã thành câu hỏi.
2. **Mốc 6 giờ "áp cả hai lúc"** so với **chủ cho đổi trong lúc chạy**: bản này hiểu luồng chuyển điểm giữa hai xe **không** kiểm mốc (§2.4); văn phòng thêm chặng chưa từng xếp thì **có** kiểm. Nếu chủ muốn khác, đổi một dòng luật.
3. **Giờ hẹn khách vs giờ xe tới** (ADR-0006 điều 5, ADR-0047) vs **"giờ trên biểu mẫu = giờ lịch chung"** (C7): hoà bằng "giờ xe tới để trống = theo giờ hẹn" (§1.3). Không chép.
4. **1b đề xuất ngưng `PICKUP`/`DROPOFF` của Phân công**; bản này **không** ngưng vì ADR-0006 điều 4 còn "HDV đón ở cảng". Người kiểm nên soi.
5. **ADR-0048** ghi tài xế đối tác "không thấy đơn hàng"; DTO tài xế có **mã đơn** (để gọi văn phòng hỏi). Hiểu "đơn hàng" = màn đơn và dữ liệu đơn; mã đơn là nhãn. Nếu chủ hiểu chặt hơn, bỏ mã đơn khỏi DTO của cột `DRIVER_PARTNER` (chỉ áp khi D7 được duyệt).

### 9.3 Chỗ đụng Hiến chương (đã đối chiếu từng điều)

| Điều | Cách áp |
|---|---|
| 1.2 Lệnh → kiểm luật → một lô | mọi thao tác, kể cả "máy tự xác nhận" (bên trong lệnh Nhận của B) |
| 1.4 Không đi tắt | lịch chung, trạng thái chặng, dòng dữ liệu, thông báo là hình chiếu; không nơi nào ghi ngược |
| 2.1 Bên trước vai | tài xế, người đi kèm là hồ sơ; không bảng tài xế riêng |
| 2.2 Bốn loại | bảng §1.2 |
| 4.1 Trạng thái + nhật ký cùng lô | `vc_trip_event` nối 1-1 `audit_log` |
| 4.4 Danh sách trường được phép | hàm hẹp của `orders`, DTO tài xế |
| 5.1 Hai lớp | §2.1 cột "Tầng giữ"; lệch có chủ ý L-D1 (mới), L-B1, L-B2 (§6.8) |
| 5.2 Cấu hình có kiểu, ngày hiệu lực, không JSON | `vc_dispatch_policy`, `vc_transfer_check`, bản chụp |
| 5.3 Ranh giới | trigger chỉ đọc `vc_` + view công bố; hàm tiêm thay cho cạnh ngược; không module nào import `van-chuyen` |
| 5.5 Chỉ-thêm, không xoá | §1.10 |
| 5.6 Chụp tại mốc | mốc chụp: lúc xuất bến (điều kiện), lúc máy xét đề nghị (luật chuyển), lúc đặt gấp (số phút), lúc tạo chuyến (khoảng nghỉ), lúc xếp xe (chủ xe) |
| 5.7 Giữ | MQ-05, `LyDoGiu` một chỗ |
| 5.8 Bước gắn vai trên đối tượng | "tài xế đang lái chuyến này" gửi/nhận đề nghị, bấm tiến độ |
| 5.10, 5.16 | thông báo sau lô, được thất lạc; trạng thái chờ (đề nghị, giữ) nằm trong CSDL nên thấy được dù tin lạc |
| 5.11 | không có tác nhân tự động ghi; Cron không ghi |
| 5.12 | không tên, năm sinh, SĐT, số giấy tờ trong nhật ký, Bảng tin, thông báo |
| 5.13 | xây trên ADR-0047, ADR-0048 chưa thi công — ghi ở đầu tệp và §8 |
| 5.15 | máy tự quyết là mã tất định có test + bộ ca mẫu |

### 9.4 Chưa kiểm

- D1 chạy các lô lần lượt: **theo tài liệu Cloudflare, chưa kiểm** — lát 1.5 có bài chạy đua.
- Chi phí Cloudflare: ước tính, **chưa đo**.
- Quy mô thật (số chặng, số chuyến mỗi ngày), số tài xế: **chưa kiểm**.
- Trạng thái production, migration chưa commit ở worktree khác, số ADR kế tiếp trên mọi nhánh: **chưa kiểm** (số ADR và số migration lấy lúc chủ duyệt / lúc thi công).
- Pháp lý: ghép khách nhiều đơn vào một xe hợp đồng (NĐ 158/2024), bảng hạng bằng: **chưa có người chuyên môn kiểm**.
- Bản thiết kế **chưa có người kiểm độc lập**. Vì chạm dữ liệu, quyền, dữ liệu cá nhân và luật (hàng rào ghim), phải có người kiểm chỉ đọc trước khi trình chủ duyệt lượt 1 (`CLAUDE.md` §3).
- Không chạy `npm test` (chỉ soạn tài liệu, không đổi mã).
