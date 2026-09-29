# Bảng điều phối chung của phân hệ Vận chuyển — bản thiết kế

- **Ngày:** 2026-09-29. **Vai:** kiến trúc sư thiết kế (lập kế hoạch). Chỉ soạn tài liệu, không viết mã, không tự duyệt (Hiến pháp N3, P15).
- **Trạng thái:** **BẢN THIẾT KẾ — CHƯA DUYỆT, CHƯA CÓ NGƯỜI KIỂM ĐỘC LẬP.** Trình chủ **từng phần** (Phần 1 → 8). Chưa lấy số ADR, chưa lấy số migration. Mọi tên bảng, tên ô, tên route dưới đây là **tên đề xuất**; kế hoạch thi công chốt tên.
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
- **Bạn cần:** đọc từng phần, trả lời các câu ở Phần 7 (mỗi câu có khuyến nghị), rồi duyệt **ba lượt**, mỗi lượt tối đa 3 quyết định (§6.4).

### 0.1 Điều chủ đã quyết — áp dụng, không hỏi lại

| # | Quyết định | Nguồn | Áp ở |
|---|---|---|---|
| C1 | Xếp xe: Bán hàng + Quản trị + Toàn quyền; Kế toán chỉ xem; HDV, Đối tác không thấy lịch xe | [HĐ] Q1 | §6.1 |
| C2 | Tài xế tự bấm Xuất bến / Đã đón / Khách vắng / Kết thúc; giờ theo máy chủ; văn phòng bấm thay được, ghi ai bấm | [HĐ] Q2 | §2.1 LC-11, §6.1 |
| C3 | Tài xế thấy SĐT người liên hệ **chỉ trong ngày chạy**, chỉ đơn có khách trên chuyến mình | [HĐ] Q3 | §6.3 |
| C4 | Chuyến thật: đón **nhiều khách sạn → nhiều điểm đến**; lịch và điểm đón đổi được **trước và trong lúc chạy** | [HĐ] mục 1, 2 | Phần 1, §5 |
| C5 | Chiều về khai **theo từng dịch vụ trong danh mục** (không đưa đón / một chiều / hai chiều); lập đơn tự tạo đúng số chặng, sửa tay được | [HĐ] mục 3 | D7 (§6.4), Q10 |
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

### 0.2 Bản này đứng ở đâu

```
ADR-0047 (chặng, hành khách — orders)   ADR-0048 (nhà xe, tài xế đối tác — parties/staff)
            │  đã duyệt, chưa thi công              │  đã duyệt, chưa thi công
            └──────────────┬────────────────────────┘
                           ▼
        BẢN NÀY: Bảng điều phối chung (van-chuyen)
          Lượt duyệt 1: D1 mô hình · D2 luật + chính sách + mốc 6 giờ · D3 quyền + route
          Lượt duyệt 2: D4 chuyển điểm tự xác nhận · D5 thay đổi khi xe đang chạy · D6 thông báo + Bảng tin
          Lượt duyệt 3: D7 chiều về theo dịch vụ · D8 Từ chối chuyến · D9 Báo bận
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
| Mẫu chặng của dịch vụ (không / một / hai chiều) | Chính sách | Sự thật có ngày hiệu lực | `catalog` | chờ Q10 (§6.4 D7) |

### 1.3 Lịch chung là hình chiếu, không phải bảng

**Vì sao không lập bảng "lịch chung":**
- ADR-0006 điều 5 và ADR-0047 A1 (đã duyệt): "hai giờ, hai chỗ, **không chép qua lại**". Một bảng lịch chung sẽ chép giờ hẹn của chặng — hai chỗ cùng một giờ, sẽ lệch (N7, Hiến chương 5.4 tinh thần "một nguồn").
- Lời chủ C7: *"giờ đón trên biểu mẫu đặt tour chính là giờ đón được gán cho lịch chung"* — tức lịch chung **đọc** giờ của biểu mẫu, không có giờ riêng.

**Lịch chung ngày D = ghép lúc đọc:**
1. `orders` cung cấp **hàm đọc hẹp** (khuôn `pool.ts`, Hiến chương 4.4) — đề xuất `lichChungChang(db, tuNgay, denNgay)` (mở rộng A3 của ADR-0047). Trả mỗi chặng **còn hiệu lực** của **đơn đã xác nhận, chưa huỷ**:
   - `legId`, `orderId`, `orderCode`, tên dịch vụ, chiều (`OUT`/`RETURN`), ngày + giờ hẹn, nơi đón / nơi trả (khoá `loc_location` hoặc chữ đã che dãy số), **số người** (qua `soKhachHieuLuc`, hoặc số của riêng chặng nếu Q1 = (a)), **số người đã có tên**, cờ "đặt gấp" + mã lý do (§2.2 CH-01);
   - **không** tiền, ghi chú đơn, người lập, SĐT, họ tên.
   - Hàm **không tự kiểm quyền**; nơi gọi đứng sau `can(trip.view)` (bài kiểm quét nơi gọi — khuôn ADR-0047 A3).
2. `van-chuyen` đọc bảng của chính nó: suất đang mở của các chặng đó, chuyến, điểm dừng, đề nghị chuyển đang chờ.
3. Hàm thuần `dungLichChung(chang[], suat[], chuyen[], chinhSach, bayGio)` (đặt ở `src/shared/`) trả: từng chặng + trạng thái (§2.5) + cảnh báo + "giữ"; từng chuyến + tải hiện tại + lý do giữ.
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
  - đủ cột dấu vết.
- **`vc_trip_driver`** (giữ G1b-1 của lượt 2): `trip_id`, `driver_party_id` (FK `pty_party`), `valid_from_at`, `valid_to_at`, `close_reason` tập đóng (`REASSIGNED`, `TRIP_CANCELLED`, `REFUSED` — mã cuối để sẵn cho D8), `closed_by`, dấu vết. Chỉ mục duy nhất: **một tài xế đang mở mỗi chuyến**.
- Chiều về là **chuyến khác** (một chuyến chạy một lượt; chuyến có thể chở chặng chiều đi của đơn này và chặng chiều về của đơn khác nếu cùng lúc — máy không cấm).

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
| `office_cancel_at`, `office_cancel_by`, `office_cancel_reason_code` | văn phòng **báo huỷ** khi xe đang chạy (C10); đặt một lần khi `WAITING`; **không** đổi `status` |
| `valid_from_at`, `valid_to_at`, `close_reason` | suất **đóng** khi người đó rời chuyến này: `MOVED` (văn phòng dời trước xuất bến), `TRANSFERRED` (chuyển điểm / cứu hộ), `REMOVED` (văn phòng rút trước xuất bến), `TRIP_CANCELLED` |
| `transfer_id` | FK `vc_transfer_request` khi suất được mở hoặc đóng bởi một lần chuyển |
| `added_after_departure` | 0/1 |
| dấu vết | |

- **Mỗi người của một chặng ở đúng một chuyến tại mỗi lúc** (lời chủ, tầng lõi):
  - người đã có tên: chỉ mục duy nhất `(leg_id, passenger_key) WHERE valid_to_at IS NULL AND passenger_key IS NOT NULL`;
  - suất chưa tên: **số suất đang mở của một chặng ≤ số người của chặng** — số người nằm trong JSON của `orders`, trigger không đọc được → **lệch có chủ ý L-D1** (§6.8), lớp bù: máy chủ + câu kiểm định kỳ.
- **Sức chứa đọc thuần dữ liệu `vc_`:** đếm suất đang mở có `status IN ('WAITING','BOARDED')` (khách + người đi kèm) ≤ `vc_vehicle.passenger_capacity` → trigger giữ được (LC-02). Suất vắng, khách huỷ tại điểm, đã xuống **không** chiếm chỗ; suất đã bị văn phòng báo huỷ **vẫn** chiếm chỗ tới khi tài xế ghi kết quả (an toàn: báo huỷ nhầm thì khách vẫn có chỗ).
- **Giao diện không bắt người xếp xe làm việc với từng suất:** kéo một chặng 4 người vào chuyến = máy mở 4 suất (2 có tên, 2 chưa tên) trong một lô. Tách đoàn (6 người, 4 lên xe A, 2 lên xe B) = chọn số người khi thả.
- **Gắn tên vào suất:** khi văn phòng hoặc tài xế nhập tên (ADR-0047 A2, tài xế qua ô `trip.passenger.add`), máy gắn `passenger_key` vào **một suất chưa tên của đúng chặng đó trên đúng chuyến đó**. Khách đổi người (A không đi, B đi thay) = suất của A ghi `NO_SHOW` hoặc đóng, B là suất mới (khuôn 1b A2).
- **Số người của chặng đổi sau khi đã xếp** (văn phòng sửa số khách trên đơn): máy **không tự** mở/đóng suất. Lịch chung hiện "chặng thiếu 1 suất" (tăng) hoặc "thừa 1 suất — gỡ bớt" (giảm) → **giữ** chuyến ở cổng xuất bến tới khi người xếp xe xử lý (Hiến chương 5.7).

### 1.6 Điểm dừng

- **`vc_trip_stop`**: `trip_id`, `seq`, `kind` (`PICKUP`/`DROPOFF`), `location_id` hoặc `place_text` (đúng một), `planned_time` (NULL = theo giờ hẹn, §1.3), `status` tập đóng (`PENDING` → `ARRIVED` → `DONE`; `PENDING` → `SKIPPED` có lý do; `PENDING` → `MOVED` khi cả điểm được chuyển sang xe khác), `arrived_at`, `done_at`, `skip_reason_code`, `added_while_running` (0/1), `updated_at`, dấu vết.
- **Máy dựng điểm dừng từ chặng:** thả chặng vào chuyến → nếu chuyến chưa có điểm đón ở nơi đón của chặng thì thêm; tương tự điểm trả. Hai chặng cùng khách sạn = **một** điểm đón. Đây là **"cụm đón"** — đơn vị mà chủ nói "Alibu", "Mường Thanh".
- **Thứ tự:** máy gợi ý (đón theo giờ hẹn → trả); người xếp xe kéo đổi được trước xuất bến; khi chạy, tài xế đổi được thứ tự các điểm **chưa tới** (kẹt xe — C4). Mỗi lần đổi ghi một sự kiện có thứ tự trước → sau. Thứ tự và giờ xe tới là **thuộc tính kế hoạch**: cập nhật trạng thái + ghi nhật ký cùng lô (Hiến chương 4.1), không cần dòng có hiệu lực.

### 1.7 Sự kiện: `vc_trip_event` nối một-một với `audit_log`

- Mỗi lệnh làm đổi chuyến ghi **một** dòng `audit_log` (ai, hành động, lúc, lý do, chi tiết ngắn không tên) **và** một dòng `vc_trip_event` **cùng id** (khuôn ADR-0007 điều 2, Hiến chương 5.5 "nối một-một với dòng `audit_log` qua khoá chung").
- `vc_trip_event` chỉ giữ **phần có kiểu** mà `audit_log` không có: `trip_id`, `kind` (tập đóng), `stop_id`, `allocation_id`, `transfer_id`, `count` (số người, **không tên**), `request_id` **UNIQUE** (chống bấm lặp, mất sóng), `client_at` (giờ máy tài xế, chỉ tham khảo), `decided_mode` (`NGUOI`/`MAY`).
- Nhờ vậy: không chép "ai, lúc nào" hai nơi; màn "dòng dữ liệu" đọc cột có kiểu, không phân tích chữ nhật ký (ADR-0030 điều 3).
- Chỉ-thêm: trigger cấm `UPDATE`/`DELETE`.

### 1.8 Đề nghị chuyển điểm đón là thực thể có trạng thái

**Vì sao là thực thể, không phải một lệnh "sửa":** việc chuyển gồm **hai người ở hai máy, hai thời điểm** (A đề nghị, B nhận) và có thể phải chờ văn phòng. Trạng thái chờ phải **nằm trong CSDL** để thấy được, không phụ thuộc thông báo có tới hay không (Hiến chương 5.16).

**`vc_transfer_request`:**
- `id`, `from_trip_id`, `to_trip_id`;
- `scope` tập đóng: `STOP` (một **cụm đón chưa tới** của xe A — ví dụ Alibu) · `ONBOARD` (khách **đang trên xe** A, gặp nhau tại một nơi — dùng cho xe hỏng, chờ Q5);
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
 CONFIRMED (MAY)        ESCALATED ── văn phòng duyệt (phá lệ, chờ Q4) ──► CONFIRMED (NGUOI)
                             └────── văn phòng bác / quá hạn ─────────► REJECTED
```

- `decided_mode` (`MAY`/`NGUOI`), `decided_by` (tài khoản ra lệnh cuối: B khi máy tự xác nhận; người văn phòng khi duyệt), `decided_at`, `policy_id` (dòng `vc_dispatch_policy` đã dùng), `override_reason_code` (khi văn phòng phá lệ).
- **`vc_transfer_check`** — bằng chứng "máy xác nhận theo luật X" (Hiến chương 5.6: chụp con số + nguồn quy tắc; 5.2: cột có kiểu, **không JSON**): mỗi dòng = `transfer_id`, `rule_code` (tập đóng: `SUC_CHUA_DICH`, `TRUNG_GIO_DICH`, `KHOANG_NGHI_DICH`, `HANG_BANG_DICH`, `GIAY_TO_DICH`, `KHONG_CHEO`, `DIEM_CHUA_TOI`…), `ket_qua` (`DAT`/`KHONG_DAT`/`CANH_BAO`), `gia_tri` (INTEGER, vd số người sau chuyển), `gioi_han` (INTEGER, vd số chỗ), `policy_row_id`. Chỉ-thêm.
- **Xác nhận = một lô:** đổi trạng thái đề nghị → đóng suất ở A (`TRANSFERRED`) → mở suất ở B (`added_after_departure` nếu B đã chạy) → thêm điểm đón (và điểm trả nếu B chưa có nơi trả của các chặng đó) ở B → điểm của A thành `MOVED` → tăng `version` của **cả hai** chuyến → sự kiện + nhật ký. Tất cả hoặc không gì (Hiến chương 1.2, K8).

### 1.9 Chính sách, danh mục lý do, bản chụp

- **`vc_dispatch_policy`** (chỉ-thêm, `valid_from_at` UNIQUE, dòng hiệu lực = mới nhất đã tới; khuôn `vc_expiry_policy` của 1a; chỉ Toàn quyền — `settings.ops`):
  - lượt duyệt 1: `min_lead_minutes` (mốc tối thiểu, gieo **360** = 6 giờ — **một con số cho cả lúc đặt và lúc xếp**, vì chủ nói luật "ghép điều kiện chung"), `rest_minutes` (khoảng nghỉ, gieo 30 — giả định G3 của 1b), `require_manifest` (1), `require_contract` (0, khoá không cho bật tới khi có ADR hợp đồng — 1b Q5);
  - lượt duyệt 2 thêm cột (migration chỉ thêm): `accept_wait_minutes` (thời gian chờ B nhận, gieo 10), `auto_confirm_transfer` (0/1, gieo 1 — công tắc an toàn: tắt thì mọi đề nghị B đã nhận đi qua văn phòng).
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

**Thêm vào bảng của `orders` (bổ sung ADR-0047 A1, bảng chưa dựng nên rẻ):** trên `ord_transfer_leg` bốn cột "đặt gấp" — `short_notice_reason` (mã), `short_notice_note`, `short_notice_by`, `short_notice_at` (§2.2 CH-01).

**View công bố dùng cho trigger `vc_` (đã có trong ADR-0047):** `v_ord_order_flag`, `v_ord_leg_key`, `v_ord_passenger_key`; của ADR-0048: `v_pty_carrier_driver`. Không view mới mang con số (Phần II quy tắc 4).

**Hàm công bố mới:**

| Module | Hàm | Dùng bởi | Kiểm quyền |
|---|---|---|---|
| `orders` | `lichChungChang(db, tuNgay, denNgay)` | `van-chuyen` (lịch chung) | nơi gọi đứng sau `can(trip.view)` |
| `orders` | `hanhKhachChoChuyen(db, legIds)` (đã có ở ADR-0047 A3) | `van-chuyen` (manifest, DTO tài xế) | nơi gọi đứng sau `can(trip.*)` |
| `orders` | `lienHeChoTaiXe(db, orderIds)` — tên + SĐT người liên hệ | `van-chuyen` (DTO tài xế, C3) | nơi gọi đứng sau `can(trip.view, assigned)` + "trong ngày chạy" |
| `orders` | câu lệnh chưa chạy "thêm/sửa hành khách do tài xế" (`source = 'DRIVER'`) | `van-chuyen` | nơi gọi đứng sau `can(trip.passenger.add)` |
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
            (dời, rút, chuyển điểm) hoặc BOARDED (cứu hộ, chờ Q5).

ĐIỂM DỪNG   PENDING ──► ARRIVED ──► DONE
               ├──► SKIPPED (lý do; chỉ khi mọi suất của điểm đã có kết quả hoặc đã đóng)
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
| LC-06 | **Chuyến đã kết thúc hay đã huỷ không sửa được** (cả điểm dừng, suất của nó) | mọi lệnh ghi vào chuyến đó | `vc_trip.status` | chặn | — | [CSDL] trigger |
| LC-07 | **Trạng thái chỉ đi tiến** (chuyến, suất, điểm dừng, đề nghị — §1.12) | đổi trạng thái | trạng thái cũ, mới | chặn | — | [CSDL] trigger |
| LC-08 | **Tài xế chỉ thấy chuyến mình đang lái** (và đề nghị gửi tới mình) | mọi route tài xế | `vc_trip_driver` mở với `driver_party_id = ctx.staff.partyId` | 404 (không lộ chuyến có tồn tại) | — | [MC] (luật quyền — K4; không phải bất biến dữ liệu) |
| LC-09 | **Chỉ chặng còn hiệu lực của đơn đã xác nhận, chưa huỷ, mới lên xe được** | mở suất | `v_ord_leg_key.is_open`, `v_ord_order_flag` | chặn. Đơn huỷ hay chặng đóng **sau** khi xếp → không xoá suất, chuyến bị **giữ** (MQ-05) | văn phòng (MQ-04) | [CSDL] trigger đọc hai view công bố · [MC] |
| LC-10 | **Người gắn vào suất thuộc đúng đơn của chặng** | gắn tên | `v_ord_passenger_key.order_id` = `v_ord_leg_key.order_id` | chặn | — | [CSDL] trigger · [MC] |
| LC-11 | **Giờ sự kiện do máy chủ ghi; lệnh lặp không ghi hai lần**; văn phòng bấm thay thì ghi người bấm | lệnh tài xế / bấm thay | `request_id` | gửi lặp → trả lại kết quả cũ | — | [CSDL] `UNIQUE(request_id)` · [MC] |
| LC-12 | **Đủ điều kiện lái**: hạng bằng đủ chở số chỗ của xe (bảng hạng đang hiệu lực); giấy tờ xe và tài xế mà điều kiện đòi còn hạn **tới hết chuyến** | gán tài xế; đổi xe; xuất bến | giấy tờ qua hàm công bố của `parties` (không số); `vc_license_capacity`; `vc_departure_rule` | chặn gán; giữ ở cổng | văn phòng (Quản trị lo giấy tờ) | [MC] + bản chụp xuất bến + [ĐK] "chuyến 48 giờ tới có tài xế không đạt" — **lệch L-B2** (giữ nguyên của 1b, §6.8) |
| LC-13 | **Không chéo xe–tài xế**; xe nhà xe chỉ lên chuyến khi chủ xe còn mở vai Nhà xe vào ngày chạy (ADR-0048 B1.4) | gán tài xế; đổi xe | `v_pty_carrier_driver`; chủ xe | chặn | — | [CSDL] trigger đọc view công bố của `parties` · [MC] |
| LC-14 | **Chuyển điểm đón chỉ khi**: chuyến nguồn đang chạy; chuyến đích lên lịch hoặc đang chạy, **cùng ngày**; người gửi là tài xế đang mở của nguồn; người nhận là tài xế đang mở của đích; hai người khác nhau; điểm nguồn **chưa tới** và mọi suất của điểm đang **chờ đón** (phạm vi `ONBOARD` theo Q5) | tạo đề nghị; bấm Nhận; xác nhận | `vc_trip`, `vc_trip_driver`, `vc_trip_stop`, `vc_trip_allocation` | chặn (409) hoặc đề nghị thành `VOID` | A | [CSDL] trigger trên `vc_transfer_request` (mọi dữ liệu cùng module) · [MC] |
| LC-15 | **Văn phòng, khi xe đang chạy, chỉ thêm và báo huỷ**: không rút, không dời suất của chuyến đang chạy; điểm đã báo huỷ vẫn chờ tài xế tới và ghi kết quả (C10) | lệnh văn phòng vào chuyến `RUNNING` | trạng thái chuyến; `close_reason` | chặn (409 "xe đang chạy: văn phòng chỉ thêm điểm hoặc báo huỷ") | — | [CSDL] trigger: suất của chuyến `RUNNING` chỉ đóng được với `TRANSFERRED` + `transfer_id` đã `CONFIRMED` · [MC] |
| LC-16 | **Kết thúc thường** chỉ khi mọi suất mở đã có kết quả cuối (`DROPPED`/`NO_SHOW`/`CANCELLED_AT_STOP`) và mọi điểm đã `DONE`/`SKIPPED`/`MOVED`; không thì phải "Kết thúc gián đoạn" có lý do | bấm Kết thúc | suất, điểm | chặn, gợi ý "Kết thúc gián đoạn" | văn phòng khi gián đoạn | [CSDL] trigger · [MC] |
| LC-17 | **Máy không bao giờ liên lạc khách** (không gọi, không nhắn, không email tới SĐT/email của khách hay người liên hệ) | — | — | — | — | [MC] **dựa vào kỷ luật** + bài quét mã: không đường gửi nào nhận địa chỉ lấy từ liên hệ của đơn (P16: ghi đúng là kỷ luật tới khi bài quét thấy chặn thật) |
| LC-18 | **Dữ liệu cá nhân**: nhật ký, Bảng tin, thông báo chỉ ghi số người, mã chuyến, mã đơn — không tên, năm sinh, SĐT, số giấy tờ; tên + SĐT chỉ trong DTO tài xế, hạn trong ngày chạy | mọi lệnh ghi; mọi DTO | danh sách trường được phép | — | — | [MC] danh sách trắng + bài quét nhật ký (khuôn `src/giay-to-khong-lo-so.test.ts`) |

**Chỗ khác 1b, có lý do:**
- 1b đặt **khoảng nghỉ** trong trigger (L2). Bản này để trigger chỉ giữ **chồng giờ thật** (lõi), còn **khoảng nghỉ** là luật cấu hình ở máy chủ (CH-02), vì chủ xếp "khoảng nghỉ" vào tầng cấu hình và cho **phá lệ** luật cấu hình kèm lý do. Trigger không biết "đã có người phá lệ" nếu không thêm đường vòng; giữ lõi ở CSDL, cấu hình ở máy chủ là rạch ròi hơn. Đây là **nới** so với 1b (chưa duyệt), không nới luật nào đã duyệt.
- 1b phân bổ theo `person_key` (không chỗ cho khách chưa tên). Bản này dùng **suất** (§1.5).
- 1b có trạng thái suất `TRANSFERRED`. Bản này **đóng dòng** thay cho trạng thái đó — một cách nói cho "rời xe", không hai (tinh thần ADR-0006 điều 2: "một cách duy nhất để không còn hiệu lực").

### 2.2 Tầng 2 — Cấu hình (dòng có ngày hiệu lực, 5.2; đổi không cần sửa mã)

| Mã | Cấu hình | Giá trị gieo | Bảng | Ai sửa | Áp lúc nào, chụp ở đâu (5.6) |
|---|---|---|---|---|---|
| CH-01 | **Mốc tối thiểu** trước giờ khởi hành — **một con số cho cả lúc đặt và lúc xếp** (chủ: luật "ghép điều kiện chung") | 360 phút | `vc_dispatch_policy.min_lead_minutes` | Toàn quyền (`settings.ops`) | **Lúc đặt:** lập hoặc sửa chặng có giờ hẹn < bây giờ + mốc → chặn; phá lệ = ghi `short_notice_*` trên chặng, chụp **số phút đã dùng** vào `short_notice_lead_minutes` (không trỏ khoá chính sách — `orders` không được trỏ bảng `vc_`). **Lúc xếp:** mọi lệnh đổi kế hoạch của một chuyến mà mốc tham chiếu (Q2) < bây giờ + mốc → chặn; phá lệ kèm lý do nhóm `PHA_LE`, sự kiện ghi `policy_id` |
| CH-02 | **Khoảng nghỉ** tối thiểu giữa hai chuyến của cùng xe / cùng tài xế | 30 phút | `vc_dispatch_policy.rest_minutes` | Toàn quyền | tạo/sửa chuyến, gán tài xế; chụp vào `vc_trip.rest_minutes_snapshot`; xuất bến kiểm lại từ giờ **kết thúc thật** của chuyến trước (1b L2b) |
| CH-03 | **Cảnh báo sát mốc**: còn bao lâu nữa tới mốc thì chặng chưa xếp chuyển màu cảnh báo | 120 phút | `vc_dispatch_policy.warn_lead_minutes` | Toàn quyền | chỉ hiển thị (MQ-04) |
| CH-04 | **Điều kiện xuất bến**: đủ danh sách; hợp đồng (khoá tắt tới khi có ADR, Q7); giấy tờ bắt buộc theo cỡ xe | như 1b B2 | `vc_dispatch_policy.require_*`, `vc_departure_rule` | Toàn quyền | chụp vào `vc_trip_departure_check` lúc xuất bến |
| CH-05 | **Hạng bằng → số khách tối đa** (không kể lái) | B 8; D1 16; D2 29; D không giới hạn; B2 cũ 8; C cũ 8; D cũ 29; E cũ không giới hạn (bảng tra 27/9, **chưa có người chuyên môn kiểm**) | `vc_license_capacity` | Toàn quyền | gán tài xế, xuất bến; chụp như CH-04 |
| CH-06 | **Danh mục lý do** (đổi giờ xe, báo huỷ điểm, phá lệ, từ chối nhận chuyển, kết thúc gián đoạn, huỷ chuyến, bỏ qua điểm) | vài lý do mỗi nhóm + "Khác" | `vc_reason` | Quản trị (`admin.manage`) | mã lý do lưu trên dòng dùng nó |
| CH-07 | **Thời gian chờ B nhận** đề nghị chuyển | 10 phút | `vc_dispatch_policy.accept_wait_minutes` (lượt duyệt 2) | Toàn quyền | tính lúc đọc (§3.8) |
| CH-08 | **Công tắc tự xác nhận** chuyển điểm | bật | `vc_dispatch_policy.auto_confirm_transfer` (lượt duyệt 2) | Toàn quyền | tắt → mọi đề nghị B đã nhận thành `ESCALATED`; chụp `policy_id` vào đề nghị |
| CH-09 | **Mẫu chặng theo dịch vụ**: không đưa đón / một chiều / hai chiều (+ giờ đón gợi ý chiều về, tuỳ chọn) | trống = không đưa đón | chờ Q10 (bảng của `catalog` hoặc cột Sheet) (lượt duyệt 3) | Quản trị (nếu trong app) | lập đơn tự tạo chặng; người lập sửa tay được (C5) |

**Mốc 6 giờ không phải bất biến dữ liệu, không phải lệch 5.1.** Luật "giờ hẹn phải cách bây giờ ít nhất 6 giờ" phụ thuộc **giờ hiện tại**: một chặng hợp lệ hôm qua sẽ "vi phạm" hôm nay chỉ vì thời gian trôi. Nó là **khoảng cho phép**, mà Phần II ("Luật dữ liệu": khoảng cho phép là luật đổi được nên nằm ở mã) đã đặt ở máy chủ. Lớp CSDL chỉ giữ phần bất biến của nó: có cột "đặt gấp" thì phải có mã lý do (`CHECK`).

**Lý do "đặt gấp" là hằng trong mã, không phải dòng `vc_reason`.** `orders` không được trỏ hay đọc bảng `vc_` (cạnh `van-chuyen → orders` sắp có; chiều ngược lại là vòng). Danh sách lý do đặt gấp vì vậy là hằng dùng chung ở `src/shared/` (khuôn `CANCEL_REASONS`, ADR-0030 điều 2), đổi bằng mã. *Giả định G-02, chủ bác thì cần một bảng lý do của `orders`.*

### 2.3 Tầng 3 — Máy tự quyết theo luật (người quyết cuối, trừ luồng tự xác nhận chủ đã chọn)

Mọi việc ở tầng này là **mã tất định có test** (Hiến chương 5.15), không phải AI. Máy chỉ **quyết định** ở MQ-02 (chủ chọn), MQ-06, MQ-08, MQ-09 (hệ quả tất yếu trong cùng lô của một lệnh người đã ra). Còn lại là **đề xuất**, **cảnh báo** hoặc **giữ**.

| Mã | Việc | Kích hoạt | Đầu vào | Kết quả | Loại | Thông báo (từ lượt duyệt 2) |
|---|---|---|---|---|---|---|
| MQ-01 | **Gợi ý xếp xe** | người xếp xe mở ngày D hoặc bấm "Gợi ý"; tài xế Từ chối (D8) | chặng chưa xếp, chuyến đang lên kế hoạch, xe rảnh, tài xế đủ điều kiện, chính sách | danh sách gợi ý "chặng → chuyến có sẵn" hoặc "mở chuyến mới với xe X, tài xế Y"; mỗi gợi ý kèm lý do. Cách gom: **cùng nơi trả + giờ hẹn gần nhau** (máy không biết đường đi — G-05). **Không ghi gì.** Người bấm "Áp dụng" = một lệnh xếp bình thường, qua đủ luật | đề xuất | — |
| MQ-02 | **Tự xác nhận chuyển điểm đón** | tài xế B bấm Nhận | hai chuyến, suất, điểm, chính sách, giấy tờ | mọi luật đạt **và** công tắc CH-08 bật → `CONFIRMED`, `decided_mode = MAY`, đổi suất trong cùng lô. Có luật không đạt → `ESCALATED` kèm danh sách luật | **quyết định** / leo thang | xác nhận: A, B, người điều xe (tin thường); leo thang: người điều xe (cần xử lý) + A, B |
| MQ-03 | **Kiểm lại cả hai xe khi chuyển** (bộ luật MQ-02 chạy) | như MQ-02 | — | ghi từng dòng `vc_transfer_check`: `SUC_CHUA_DICH` (LC-02 xe B sau chuyển), `TRUNG_GIO_DICH` (LC-03), `KHOANG_NGHI_DICH` (CH-02 với chuyến kế của B), `HANG_BANG_DICH` + `GIAY_TO_DICH` (LC-12; xe B không đổi nên thường đạt), `DIEM_CHUA_TOI` (LC-14), `KHONG_CHEO` (LC-13). Xe A chỉ bớt người nên không cần kiểm sức chứa; vẫn ghi dòng `SUC_CHUA_NGUON` để bằng chứng đủ. **Chuyến sau của B có thể trễ:** máy **không biết thời gian đi đường** nên chỉ ghi `CANH_BAO` khi B có chuyến kế trong vòng 2 × khoảng nghỉ | quyết định (phần của MQ-02) | như MQ-02 |
| MQ-04 | **Cảnh báo trên bảng** | mỗi lần dựng lịch chung (đọc) | lịch chung, chính sách, bây giờ | chặng **sát mốc** / **quá mốc** chưa xếp; thiếu/thừa suất; giờ hẹn đổi sau khi xếp; đơn huỷ hay chặng đóng sau khi xếp; giấy tờ hết hạn trước khi chuyến kết thúc; thiếu tên trước xuất bến; đề nghị chờ quá hạn; chuyến chưa có tài xế | cảnh báo | lượt duyệt 2: chỉ các cảnh báo **sinh từ một sự kiện đã ghi** (§3.5); cảnh báo **theo giờ** (sát mốc, quá mốc) chỉ hiện trên bảng — đẩy lên điện thoại là việc sau (§3.8) |
| MQ-05 | **Giữ chuyến** (Hiến chương 5.7) | mỗi lần đọc chuyến; bấm Xuất bến | `kiemXuatBen` (1b B2) + thiếu/thừa suất + đơn huỷ + chặng đóng + chưa có tài xế | chuyến ở `PLANNED`, hiện **lý do + ai xử lý** (văn phòng / Quản trị / Toàn quyền); không lưu cột "giữ" — tính lại mỗi lần đọc (G7 của 1b); kiểu `LyDoGiu` ở `src/shared/` | giữ | tài xế thấy "chưa đủ điều kiện xuất bến: …" |
| MQ-06 | **Tự thêm điểm vào xe nhận** | xác nhận chuyển (MQ-02) | nơi đón/nơi trả của các chặng được chuyển; điểm hiện có của B | thêm điểm đón (sau điểm đón chưa tới cuối cùng, trước điểm trả đầu tiên) và điểm trả nếu B chưa có nơi đó; B đổi thứ tự được sau | quyết định (cùng lô) | B (trong phản hồi) |
| MQ-07 | **Nhắc gọi khách khi giờ hẹn đổi** (không tự báo khách — C11) | `orders` ghi sự kiện sửa chặng (`order_leg_updated`, ADR-0047) cho chặng đang có suất mở | chặng, suất, chuyến | nhắc: "Giờ hẹn đón ĐH-… đổi 07:00 → 06:30 — gọi báo khách"; nếu điểm dừng đang ghi đè giờ xe tới → cảnh báo "xem lại giờ xe" | cảnh báo | người phụ trách đơn + tài xế đang lái chuyến có suất của chặng đó |
| MQ-08 | **Đề nghị quá thời gian chờ** | đọc đề nghị `PENDING` quá CH-07 | `proposed_at`, CH-07, bây giờ | hiện "đã hết giờ chờ"; lệnh kế tiếp chạm đề nghị (A rút, A gửi đề nghị mới, B bấm Nhận muộn, văn phòng mở) **đóng** nó thành `EXPIRED` trong lô của lệnh đó | quyết định (cùng lô lệnh sau) | A thấy trên màn: "B chưa nhận — gửi xe khác hoặc gọi văn phòng" |
| MQ-09 | **Tự huỷ đề nghị không còn hợp lệ** | lệnh làm đổi nguồn/đích: A bấm "đã tới" điểm đó, A hoặc B kết thúc chuyến, văn phòng báo huỷ điểm đó | đề nghị `PENDING`/`ESCALATED` liên quan | đề nghị thành `VOID` trong **cùng lô** của lệnh đó | quyết định (cùng lô) | A, B |
| MQ-10 | **Khoá theo mốc khi xếp** | mọi lệnh đổi kế hoạch của một chuyến (CH-01) | mốc tham chiếu (Q2), bây giờ, CH-01 | chặn, mở hộp "Phá lệ" cho người có ô `trip.override` (Q3) | chặn | — |

### 2.4 Phá lệ: luật nào, ai, ghi gì

| Luật | Phá lệ được? | Ai | Ghi gì |
|---|---|---|---|
| LC-01 … LC-18 (lõi) | **Không** — kể cả Toàn quyền. Đổi = ADR mới | — | — |
| CH-01 lúc đặt | Có | ô mới `order.leg.short_notice` (**chờ Q3**) | cột `short_notice_*` trên chặng (mã lý do, ghi chú ngắn, người, lúc, số phút đã dùng) + nhật ký `order_leg_short_notice` |
| CH-01 lúc xếp; CH-02 | Có | ô mới `trip.override` (**chờ Q3**) | sự kiện `PHA_LE` (mã luật, mã lý do, `policy_id`) + nhật ký; với CH-02: `vc_trip.rest_override_reason_code` |
| CH-04, CH-05 (điều kiện xuất bến, hạng bằng) | **Không** (chủ, 27/9: "chuyến sai điều kiện thì không cho xuất bến") | — | — |
| Đề nghị chuyển bị leo thang (MQ-02) | Chỉ khi luật **không đạt là luật cấu hình** (CH-02); luật lõi không đạt thì chỉ có thể bác | ô `trip.override` (**chờ Q4**) | đề nghị `CONFIRMED`, `decided_mode = NGUOI`, `override_reason_code` |

- **Luồng thay đổi khi xe đang chạy có kiểm CH-01 không?** Chủ đã cho phép rõ các thay đổi "trong lúc chạy", nên **chuyển điểm giữa hai xe không kiểm CH-01**. Văn phòng thêm một chặng **chưa từng xếp** vào xe đang chạy **có** kiểm CH-01 cho chính chặng đó (chặng chưa xếp tới sát giờ là chặng bị sót, phải có người chịu và ghi lý do), **trừ khi** chặng đã mang cờ "đặt gấp" từ lúc đặt — chờ Q2(ii).

### 2.5 Dòng dữ liệu: trạng thái của một chặng (hình chiếu)

Một hàm thuần `trangThaiChang(chang, suat[], chuyen[], deNghi[], chinhSach, bayGio)` ở `src/shared/` — **một nguồn** cho bảng điều phối, màn tài xế, màn "dòng dữ liệu". Không lưu cột trạng thái chặng nào.

```
 ĐƠN NHÁP ─xác nhận─► CHƯA XẾP ──xếp đủ suất──► ĐÃ XẾP ──xe xuất bến──► CHỜ ĐÓN ──► ĐÃ ĐÓN n/N ──► ĐÃ TRẢ ──► XONG
 (chỉ đếm)            │  ├ sát mốc (vàng)          │  ├ giữ: lý do (đỏ)        │  ├ vắng k người
                      │  ├ quá mốc (đỏ)            │  └ xếp một phần           │  ├ khách đã huỷ (văn phòng báo)
                      │  └ đặt gấp (nhãn)          │                           │  └ đang chuyển → xe B (đề nghị chờ)
                      │                            │                           │
                      └── chặng đóng / đơn huỷ ────┴── còn suất mở → GIỮ ──────┴── xe gián đoạn → XONG (gián đoạn)
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

**Khuyến nghị PA-1.** Ở quy mô Tour Đảo (vài chục xe, vài trăm chặng mỗi ngày), một CSDL chạy lô lần lượt cộng khoá lạc quan là đủ; mọi luật nằm ở hàm thuần có test; không thêm hạ tầng. Câu hỏi Q8 hỏi chủ bằng lời thường.

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
 Một lô ghi (db.batch — tất cả hoặc không gì, K8)
   1. UPDATE vc_trip SET version = version + 1 WHERE id = ? AND version = ?   (mỗi chuyến bị chạm)
   2. các câu ghi chính, mỗi câu mang EXISTS(audit_log id của chính lệnh này)  (Phần II "batch sau UPDATE điều kiện")
   3. audit_log + vc_trip_event CÙNG id; vc_transfer_check nếu có
   4. trigger CSDL chặn cuối (LC-01 … LC-16)
   │
   ├─ changes() = 0 ở câu 1 → đọc lại, trả đúng lỗi: 409 "vừa có thay đổi" / "đề nghị đã hết giờ" / "không còn hợp lệ"
   │
   ▼
 Sau lô (Hiến chương 5.10, 5.16 — bắn-và-quên, lỗi không làm hỏng lô):
   ctx.baoThayDoiChuyen → Bảng tin (màn đang mở tải lại) + gõ cửa điện thoại (từ lượt duyệt 2)
```

- **Lệnh kế hoạch** (xếp, dời, rút, đổi xe, đổi tài xế, đổi thứ tự, thêm điểm, báo huỷ, gửi/nhận/duyệt đề nghị) **kiểm và tăng** `version`.
- **Lệnh tiến độ của tài xế** (đã tới, đã đón, vắng, khách đã huỷ, đã trả) **không kiểm** `version` (lệnh không dựa vào kế hoạch, chỉ dựa vào trạng thái của chính suất/điểm, đã có trong điều kiện câu ghi) nhưng **có tăng** `version` — để một quyết định kế hoạch đang dựa trên dữ liệu cũ bị phát hiện.
- **Tự thử lại một lần** cho lệnh mà máy xét được hoàn toàn (B bấm Nhận): gặp `version` cũ → đọc lại, xét lại, ghi lại một lần; vẫn thua → trả kết quả xét mới (có thể là leo thang). Tài xế không phải bấm lại vì một thay đổi không liên quan.

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
- **Không làm ở ba lượt duyệt này, ghi `docs/BACKLOG.md` khi duyệt:** Cron chỉ-đọc quét "chặng sắp quá mốc chưa xếp" rồi gõ cửa điện thoại người điều xe. Đây là **nguồn thông báo mới không sinh từ nhật ký** (ADR-0034 điều 1 chỉ có hình chiếu nhật ký) nên cần ADR riêng. Tới lúc đó, cảnh báo theo giờ chỉ hiện trên bảng điều phối.

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
- **Thao tác:** tạo chuyến (xe, tài xế, giờ), kéo chặng vào/ra (trước xuất bến), đổi thứ tự điểm, ghi đè giờ xe tới, đổi xe/tài xế, huỷ chuyến (lý do), **xuất bến bấm thay** (hiện danh sách điều kiện), phá lệ (lý do), duyệt/bác đề nghị leo thang, **khi xe đang chạy chỉ có "Thêm điểm đón" và "Báo huỷ điểm"**.
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
│ Tải hiện tại: 9/15 · [Thêm điểm đón] [Báo huỷ điểm]                                          │
├ ĐIỀU KIỆN XUẤT BẾN (bản chụp 05:52): xe · tài xế · GPLX D2 còn hạn · đủ 9/9 tên · đạt      ┤
├ NHẬT KÝ: 05:52 Xuất bến (Hùng) · 06:20 Nhận điểm Alibu từ CX-04 — máy xác nhận theo luật … ┤
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Màn "Dòng dữ liệu" — trực quan hoá luồng của Vận chuyển

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
│ ▸ CX-12 14:00–16:00         │  │    ☎ Người liên hệ: 09xx…      │  │  ○ CX-09 Long · còn 15 chỗ  │
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
- Danh sách "chuyển sang xe" hiện những gì về xe khác: **chờ Q9**. Khung trên là phương án khuyến nghị (biển số không cần, chỉ mã chuyến, tên tài xế, số chỗ còn, điểm sắp tới; **không** tên khách của xe khác).
- Nút "Nhận" hiện **trước** số chỗ sau khi nhận (máy tính sẵn, cùng hàm thuần với máy chủ).

### 4.5 Kế toán — chỉ xem

- Cùng màn 4.1, 4.2, 4.3, **không** có nút thao tác. Không thêm ô: Kế toán có `trip.view = any`, không có `trip.dispatch`.

### 4.6 Biểu mẫu đơn — phần chặng và mốc 6 giờ

```
 Dịch vụ: Vé cáp treo Vinpearl  (danh mục: hai chiều)  → máy tạo sẵn 2 chặng, sửa được
 ┌ Chiều đi ─ ngày 30/09 ─ giờ đón [06:30] ─ nơi đón [Sheraton ▾] ─ nơi trả [Ga cáp treo ▾] ┐
 │ [!] Giờ đón cách bây giờ 4 giờ 10 phút — dưới mốc 6 giờ.                                    │
 │     Người có quyền: [Đặt gấp — chọn lý do ▾] [ghi chú ngắn]    Người khác: gọi văn phòng    │
 └────────────────────────────────────────────────────────────────────────────────────────────┘
 ┌ Chiều về ─ ngày 30/09 ─ giờ đón [16:00] ─ nơi đón [Ga cáp treo] ─ nơi trả [Sheraton] ─ [Bỏ chặng] ┐
```

### 4.7 Cấu hình

- **Chính sách điều phối** (Toàn quyền): mốc tối thiểu, khoảng nghỉ, cảnh báo sát mốc, (lượt 2) thời gian chờ nhận, công tắc tự xác nhận; mỗi lần lưu = một dòng mới có ngày hiệu lực; hiện lịch sử các bản.
- **Điều kiện xuất bến, bảng hạng bằng** (Toàn quyền): như 1b B2.
- **Danh mục lý do** (Quản trị): theo nhóm.
- **Mẫu chặng theo dịch vụ** (lượt 3, chờ Q10).

### 4.8 Danh sách màn cần vẽ trên Claude Design

| # | Màn | Ai dùng | Trạng thái cần vẽ | Lượt |
|---|---|---|---|---|
| V1 | Điều phối xe ngày D (máy tính + điện thoại) | Bán hàng, Quản trị, Toàn quyền; Kế toán (chỉ xem) | trống; có chặng chưa xếp; sát mốc; quá mốc; chuyến bị giữ; đang chạy; kéo thả; hộp phá lệ | 1 |
| V2 | Chi tiết chuyến | như V1 | lên kế hoạch; đang chạy; đã xong; gián đoạn; bản chụp xuất bến | 1 |
| V3 | Tạo / sửa chuyến (xe, tài xế, giờ; lý do khi huỷ) | người xếp xe | xe không đủ hạng; trùng giờ; dưới mốc | 1 |
| V4 | Dòng dữ liệu: phễu, hành trình một chặng, nhật ký máy | như V1 | — | 1 (phễu, hành trình); 2 (nhật ký máy) |
| V5 | Cuốc của tôi (tài xế) | Tài xế công ty, (lượt 1) Tài xế đối tác | hôm nay / ngày mai; chưa đủ điều kiện xuất bến | 1 |
| V6 | Chuyến đang chạy (tài xế): điểm, khách, nút Đã tới / Đã đón / Vắng / Khách đã huỷ / Đã trả / Kết thúc / Kết thúc gián đoạn; bổ sung tên | tài xế; văn phòng bấm thay | điểm được văn phòng báo huỷ; điểm mới thêm; mất mạng (bấm lại) | 1 |
| V7 | Xuất bến: danh sách điều kiện đạt / chưa đạt | tài xế; văn phòng | đạt; bị giữ với lý do | 1 |
| V8 | Gửi đề nghị chuyển điểm; chờ nhận (đếm ngược) | tài xế A | chọn điểm, chọn xe; hết giờ chờ | 2 |
| V9 | Đề nghị gửi tới tôi: Nhận / Không nhận | tài xế B | đạt → đã xác nhận; không đạt → đã chuyển văn phòng | 2 |
| V10 | Hộp đề nghị leo thang (văn phòng duyệt / bác) | người có ô `trip.override` | luật cấu hình không đạt (duyệt được); luật lõi không đạt (chỉ bác) | 2 |
| V11 | Thêm điểm đón vào xe đang chạy; báo huỷ điểm | người xếp xe | chặng đặt gấp; dưới mốc cần lý do | 2 |
| V12 | Biểu mẫu đơn: phần chặng (tự tạo theo dịch vụ), cảnh báo mốc, đặt gấp | người lập đơn | trong mốc; dưới mốc có quyền / không quyền | 1 (mốc) · 3 (tự tạo chặng) |
| V13 | Cấu hình chính sách điều phối; danh mục lý do | Toàn quyền; Quản trị | lịch sử các bản | 1 |
| V14 | Mẫu chặng theo dịch vụ (nếu Q10 = trong app) | Quản trị | — | 3 |
| V15 | Từ chối chuyến; báo bận (lượt 2 cũ D3, D4) | tài xế | — | 3 |

- **Không có bản đồ** ở ba lượt này (*giả định G-05*): bản đồ cần dịch vụ ngoài (dữ liệu điểm đón ra bên thứ ba, thêm khoá bí mật, thêm chi phí). Máy vì thế **không biết thời gian đi đường**; gợi ý và cảnh báo trễ chuyến chỉ dựa vào giờ hẹn và giờ dự kiến người nhập.

---

## Phần 5 — Luồng từng tình huống

Mỗi bảng: **Ai** làm gì · **Máy** làm gì · **Ghi** gì (một lô trừ khi nói khác). Ví dụ lấy từ lời chủ ([HĐ] mục 2): xe A (CX-07, 15 chỗ, tài xế Hùng) đón Sheraton → Amiana → Mường Thanh rồi trả Cảng Vinpearl và Bến Tàu Du lịch; xe B (CX-04, 29 chỗ, tài xế Tuấn) đón InterContinental → AB Square → Alibu.

### 5.1 Đặt mới (đủ sớm)

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Lan lập đơn "Vé cáp treo Vinpearl", 4 khách, ngày mai | tra mẫu chặng của dịch vụ (lượt 3; trước đó Lan tự thêm chặng) → tạo sẵn chiều đi + chiều về | — |
| 2 | Lan nhập giờ đón 06:30, nơi đón Sheraton, tên 2/4 khách | kiểm mốc: còn 15 giờ ≥ 6 giờ → qua | đơn nháp + chặng + 2 hành khách (ADR-0047) |
| 3 | Lan xác nhận đơn | — | `confirmed`; tin đơn hiện có tới `tat-ca` |
| 4 | — | bảng điều phối của người đang mở tải lại: chặng hiện ở "Chưa xếp", nhãn "thiếu 2 tên" | — |

### 5.2 Đặt gấp (dưới 6 giờ)

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Lan lập đơn lúc 02:20 cho giờ đón 06:30 | mốc: còn 4 giờ 10 < 6 giờ → **chặn**, hiện hộp "Đặt gấp" nếu Lan có ô `order.leg.short_notice` (Q3) | — |
| 2a | Lan có quyền: chọn lý do "Khách đặt sát giờ" | kiểm mã lý do trong danh sách | chặng mang `short_notice_*` (lý do, người, lúc, số phút đã dùng 360) + nhật ký `order_leg_short_notice` |
| 2b | Lan không có quyền (vd Thực tập, Đối tác) | không lưu được chặng dưới mốc; hướng dẫn "gọi văn phòng" | — |
| 3 | Xác nhận đơn | — | tin đơn; (lượt 2) tin "đặt gấp" tới người điều xe |
| 4 | Người xếp xe xếp chặng vào một chuyến xuất bến 05:50 | mốc lúc xếp (Q2): chuyến đã trong 6 giờ → cần phá lệ, **trừ khi** Q2(ii) = "một lần phá lệ lúc đặt dùng luôn lúc xếp" | suất + sự kiện `PHA_LE` (nếu cần) |

### 5.3 Xếp xe (tối hôm trước)

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Hùng (Bán hàng) mở Điều phối ngày 30/09 | dựng lịch chung (§1.3); MQ-04 cảnh báo | — |
| 2 | Hùng bấm "Gợi ý xếp" | MQ-01: gom chặng cùng nơi trả, giờ gần nhau; đề xuất CX-07 cho Sheraton, Amiana, Mường Thanh | không ghi |
| 3 | Hùng tạo CX-07 (79B-123.45, tài xế Hùng-tài-xế, 05:50–08:30) | LC-03 trùng giờ; CH-02 khoảng nghỉ; LC-12 hạng bằng đủ chở 15; LC-13 không chéo | `vc_trip` (`PLANNED`, `version` 1, chụp chủ xe, chụp khoảng nghỉ) + `vc_trip_driver` + sự kiện |
| 4 | Hùng kéo 3 chặng vào CX-07 | mở suất (có tên và chưa tên); dựng điểm dừng; LC-01, LC-02, LC-09 | suất + điểm + sự kiện; `version` 2 |
| 5 | — | MQ-05: CX-07 bị **giữ** "thiếu 2 tên — văn phòng" | không ghi (tính lúc đọc) |
| 6 | Lan bổ sung 2 tên trên đơn | gắn tên vào 2 suất chưa tên của đúng chặng (LC-10) | dòng `ord_passenger` + `passenger_key` đặt một lần |
| 7 | — | CX-07 hết giữ | — |

### 5.4 Đổi giờ trước khi chạy

**(a) Khách xin đổi giờ hẹn** (07:00 → 06:30):

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Người phụ trách đơn sửa chặng (ô `order.trip.edit`) | mốc: giờ mới còn ≥ 6 giờ? không thì cần đặt gấp (như 5.2) | chặng đổi giờ + nhật ký `order_leg_updated` (trước → sau) |
| 2 | — | MQ-07: chặng đang có suất trên CX-07 → nhắc "gọi báo khách" (người phụ trách đơn đã tự đổi nên chính họ là người gọi) + tài xế CX-07 thấy giờ mới; điểm dừng không ghi đè giờ → giờ xe tới tự theo giờ mới | không ghi gì ở `vc_` |
| 3 | Người xếp xe xem lại thứ tự điểm nếu cần | LC-03, CH-01 (nếu chuyến đã trong 6 giờ → phá lệ) | sự kiện đổi thứ tự |

**(b) Người xếp xe muốn xe tới sớm hơn** mà không đổi giờ hẹn khách: ghi đè `vc_trip_stop.planned_time` (lý do nhóm `DOI_GIO_XE`) — không đụng `orders`.

**(c) Người xếp xe (Bán hàng) muốn đổi giờ hẹn của đơn người khác:** hôm nay ô `order.trip.edit` của Bán hàng là `ownOrAssigned` — **không** sửa được. Máy nhắc người phụ trách đơn. Mở quyền này hay không: **Q6**.

### 5.5 Tài xế A đề nghị chuyển điểm cho tài xế B (xe đang chạy)

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
| 6'' | (nếu luật không đạt là khoảng nghỉ — luật cấu hình) | văn phòng có ô `trip.override` duyệt kèm lý do (Q4) | `CONFIRMED`, `decided_mode = NGUOI`, `override_reason_code`, cùng lô đổi suất như bước 4 |

**B không nhận / không trả lời:** B bấm "Không nhận" (lý do nhóm `TU_CHOI_NHAN`) → `DECLINED`; hoặc quá 10 phút → màn A hiện "hết giờ chờ" (MQ-08); A gửi xe khác hoặc gọi văn phòng.

### 5.6 Văn phòng thêm điểm đón vào xe đang chạy

| Bước | Ai | Máy | Ghi |
|---|---|---|---|
| 1 | Khách đặt gấp lúc 06:05 (có "đặt gấp" từ lúc đặt) | — | chặng mới |
| 2 | Hùng (văn phòng) kéo chặng vào CX-04 đang chạy ("Thêm điểm đón") | LC-15: văn phòng **được thêm**; LC-02 sức chứa; LC-09; CH-01: chặng đã mang đặt gấp → theo Q2(ii) | suất mới `added_after_departure = 1`, điểm mới `added_while_running = 1`, dòng manifest mới, sự kiện, `version` |
| 3 | — | (lượt 2) tin tới tài xế CX-04: "Văn phòng thêm điểm đón AB Square 06:40, 2 khách" | — |
| 4 | Tài xế đón, bổ sung tên nếu thiếu (ô `trip.passenger.add`) | LC-10 | hành khách `source = 'DRIVER'` + gắn tên vào suất |

### 5.7 Văn phòng báo huỷ điểm đón (tài xế vẫn tới)

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

Cách làm **phụ thuộc Q5** (ai chuyển khách sang xe cứu hộ). Phương án khuyến nghị:

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
| 3 | 2 khách ở lại đảo (về ít người hơn) | **chờ Q1**: (a) văn phòng ghi số người của riêng chặng về | cột mới trên chặng (bổ sung ADR-0047) |
| 4 | Xếp chiều về | như 5.3; chuyến chiều về là chuyến khác, có thể gom chiều về của nhiều đơn | như 5.3 |

### 5.11 Tài xế đối tác từ chối (ghép lượt 2)

Hai việc khác nhau, dễ lẫn:

| Việc | Khi nào | Luồng |
|---|---|---|
| **Không nhận đề nghị chuyển điểm** | trong lúc chạy, B là tài xế đối tác | như 5.5: B bấm "Không nhận" + lý do → `DECLINED`. Không ảnh hưởng chuyến của B. Áp cho mọi tài xế (không cần Q3 của lượt 2) |
| **Từ chối chuyến được xếp** (lượt 2 D3 → D8 của bản này) | trước hạn chót Từ chối (lượt 2 Q2) | tài xế bấm Từ chối + lý do → đóng dòng `vc_trip_driver` với `close_reason = REFUSED` (cột đã định sẵn ở D1) → chuyến **không có tài xế** → **giữ** (MQ-05: "chưa có tài xế — văn phòng") → MQ-01 gợi ý tài xế thay → (lượt 2) tin tới người điều xe. Quá hạn chót: gọi văn phòng |

- D8 dùng lại **nguyên** khuôn lượt 2 D3 (một lô, lý do tập đóng, chốt "đang lái", 404 cho chuyến không phải của mình), chỉ đổi tên bảng cho khớp D1.
