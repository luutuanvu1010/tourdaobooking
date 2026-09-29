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
