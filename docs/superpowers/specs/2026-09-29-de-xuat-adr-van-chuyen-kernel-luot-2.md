# Đề xuất ADR-00xx (điều phối cấp số) — Vận chuyển, thừa kế Transportation Kernel, lượt duyệt 2: khung bận của xe; giờ lái tối đa (bản nhẹ); số hiệu chuyến bay trên chặng

- **Trạng thái:** **ĐỀ XUẤT — chờ chủ duyệt, sau lượt 1** (`2026-09-29-de-xuat-adr-van-chuyen-kernel-luot-1.md`).
  - AI soạn ở vai người thiết kế (P15); không tự duyệt (N3, Điều 7.2).
  - Người kiểm độc lập bộ đề xuất (đỉnh `9cf9431`): ĐẠT CÓ ĐIỀU KIỆN; phần của tệp này chỉ phải sửa khuôn câu hỏi (đã sửa, chưa kiểm lại).
  - Không đặt tệp ở `docs/adr/`.
- **Ngày:** 2026-09-29.
- **Nguồn:**
  - bản soi `docs/superpowers/specs/2026-09-29-transportation-kernel-va-lo-he-thong.md` (**[SOI]**): B3, B4, B5;
  - lời chủ [HĐ] "Trả lời lần 9" (ý 3 "lịch bận xe + giờ lái tối đa", ý 4 "số hiệu chuyến bay");
  - [REF] `docs/Ref/transportation-kernel-travel-erp.md`:81, :87, :88;
  - ADR-0040 (**[0040]**), ADR-0047 (**[0047]**), ADR-0049 (**[0049]**);
  - đề xuất lượt 2 cũ `docs/superpowers/specs/2026-09-28-de-xuat-adr-van-chuyen-luot-2.md` (**[L2]**, chưa duyệt) D4 "báo bận";
  - thiết kế Bảng điều phối [TK] D9.
- **Loại:**
  - **một chiều:** chủ và tiền tố bảng `vc_unavailability`; tập đối tượng của khung bận (`VEHICLE`, `DRIVER`) trong `CHECK`;
  - **hai chiều:** giá trị chính sách giờ lái; cách xử lý khi vượt; ô số hiệu chuyến bay (cột để trống được); màn hình.
- **Hiến chương áp:** 2.2 (khung bận là thực thể có vòng đời; lý do là dữ liệu), 5.1, 5.2, 5.3, 5.5, 5.6, 5.12.
- **Không xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (kiểm 29/9).
- **Xây trên nền chưa có (5.13):**
  - VK2-A cần bảng `vc_trip` + hàm / trigger chồng giờ LC-03 (ADR-0049, `0042` — chưa viết) → thi công **sau** lát 1.2 của ADR-0049;
  - VK2-B dùng giờ xảy ra của lượt 1 (VK1-A) nếu được duyệt, không thì dùng giờ ghi nhận;
  - VK2-C chỉ cần `ord_transfer_leg` (ADR-0047).
- **Migration:** chỉ thêm; số do điều phối chốt, kiểm mọi nhánh. Không sửa `0034` (đã qua kiểm độc lập).

---

## Tóm tắt cho chủ (lời thường)

1. **Lịch bận của xe:**
   - Quản trị ghi trước "xe 79B-… bảo dưỡng 8:00–17:00 thứ Ba";
   - máy **không cho xếp chuyến** vào khung đó, bảng điều phối hiện dải "bận";
   - trạng thái "bảo dưỡng" hiện có vẫn giữ, dùng khi xe nằm xưởng chưa biết ngày ra.
2. **Giờ lái tối đa (bản nhẹ):**
   - máy cộng giờ các chuyến của một tài xế trong ngày; quá 8 giờ, hoặc một chuyến dài quá 4 giờ, thì **cảnh báo** trên bảng và lúc xếp;
   - bản nhẹ **không chặn**, vì giờ chuyến gồm cả giờ chờ, và con số pháp lý chưa có người chuyên môn kiểm.
3. **Số hiệu chuyến bay:** thêm một ô trên chặng đưa đón (vd VN1553), hiện cho người xếp xe và tài xế. Máy **không** tự tra chuyến bay; tài xế tự xem khi máy bay trễ.
4. **Bạn cần:** trả lời 3 câu ở cuối tệp, rồi bấm duyệt.

---

## Bối cảnh

Chủ chọn soạn đề xuất cho ý 3 và ý 4 ([HĐ] lần 9). [ĐC] đã ghi: khung bận của xe "để sau" ([L2]:347), giờ lái tối đa "để sau" (`docs/superpowers/specs/2026-09-27-van-chuyen-design.md:180`), số hiệu chuyến bay "nhu cầu thật chưa chắc".

Ba quyết định chạm dữ liệu — trần của một lượt (`CLAUDE.md` §9). **Không** gộp với lượt 2–4 của [TK] (D4–D10).

**Chủ đã quyết / nguyên tắc đã duyệt, áp dụng không hỏi lại:**
- ADR-0040 D1 ([0040]:41): ô quản lý xe = Quản trị + Toàn quyền → khung bận của **xe** đi theo ô `vehicle.manage`. Áp nguyên tắc, không hỏi.
- ADR-0040 D1: trạng thái xe *đang dùng / bảo dưỡng / ngừng* là tập đóng → **giữ**, không đổi.
- 1b và [TK]: "luật của chuyến không rẽ nhánh theo chủ xe" → giờ lái áp cho tài xế công ty và tài xế nhà xe như nhau.
- ADR-0049 D1: lịch chung là hình chiếu; `lichChungChang` có danh sách trường cố định → thêm trường là **thay câu** (xem dưới).
- ĐP2(iv): mốc 6 giờ kiểm khi sửa **ngày, giờ, nơi** của chặng → số hiệu chuyến bay **không** thuộc danh sách đó, sửa không cần đặt gấp.

---

## Quyết định

### VK2-A. Khung bận của xe (ý 3a; thừa kế [REF] "Reservation" mục đích bảo dưỡng — [REF]:88, :163)

**Bảng mới `vc_unavailability`** (module `van-chuyen`; khuôn [L2] D4, để [TK] D9 dùng **chung**):

| Cột | Kiểu, ràng buộc | Nghĩa |
|---|---|---|
| `id` | TEXT PK | |
| `subject` | `CHECK IN ('VEHICLE','DRIVER')`, tập đóng, **định trọn ngay** | khung bận của xe hay của tài xế |
| `vehicle_id` | FK `vc_vehicle` | khi `VEHICLE` |
| `driver_party_id` | FK `pty_party` (cạnh `van-chuyen → parties` có sẵn) | khi `DRIVER` — **chỉ dùng khi [TK] D9 được duyệt** |
| `start_ms`, `end_ms` | INTEGER; `CHECK end_ms > start_ms` | mốc so sánh (Phần II) |
| `start_at`, `end_at` | TEXT ISO UTC | để hiện |
| `reason_code` | FK `vc_reason` | lý do là **dữ liệu** (Hiến chương 2.2): nhóm mới `BAN_XE`, gieo "Bảo dưỡng", "Đăng kiểm", "Sửa chữa", "Khác" (Quản trị sửa — `admin.manage`, như mọi nhóm của `vc_reason`) |
| `withdrawn_at`, `withdrawn_by` | NULL = còn hiệu lực | rút khung (không xoá) |
| dấu vết, `updated_at` | | khoá lạc quan |

- **Ràng buộc:**
  - `CHECK` đúng một đối tượng theo `subject`;
  - trigger: không `DELETE`;
  - chỉ một kiểu `UPDATE` — rút một lần; không sửa giờ, không đổi đối tượng. Đổi giờ = rút khung cũ + ghi khung mới (khuôn [L2] B4.4).
- **Độ dài tối đa một khung:** khoảng cho phép → ở **mã** (Phần II). Đề xuất 31 ngày cho xe; kế hoạch chốt. Xe nằm xưởng lâu, chưa biết ngày ra → dùng trạng thái "bảo dưỡng".

**Luật** (mở rộng LC-03 — lõi, không ai phá lệ):
- chuyến **chưa huỷ** của xe X không chồng **khung bận còn hiệu lực** của X. Khoảng nửa mở, cùng cách I22 của [KH].
  - **[CSDL]:** trigger trên `vc_trip` (tạo; đổi `vehicle_id`; đổi `planned_start_ms` / `planned_end_ms`) đọc `vc_unavailability` (cùng module);
  - **[Máy chủ]:** `kiemTaoSuaChuyen` nhận khung bận như khoảng chặn — **một** hàm thuần, không viết luật thứ hai (khuôn [L2] G1b-8; bài học "hai luật" Đợt E).
- **Ghi khung bận chồng chuyến đã xếp:** theo câu hỏi **Q-L2-1**. Khuyến nghị (a): chặn, dời chuyến trước — khuôn [L2] B4.2 cho tài xế; trigger `BEFORE INSERT` trên `vc_unavailability` đọc `vc_trip` chưa kết thúc, chưa huỷ.

**Quan hệ với trạng thái "bảo dưỡng" — một nguồn cho mỗi câu hỏi:**

| Câu hỏi | Nguồn duy nhất | Ai đọc |
|---|---|---|
| "Xe này **bây giờ** có dùng được không" (đang nằm xưởng, chưa biết ngày ra) | `vc_vehicle.status = 'maintenance'` (có sẵn, [0040] D1) | cổng xuất bến (giữ — đã có, [KH]:762); lịch chung |
| "Xe này **bận trong khoảng giờ nào**" (lịch xưởng đặt trước) | `vc_unavailability` | LC-03 lúc xếp / đổi xe / đổi giờ; lịch chung (dải "bận") |

- Máy **không** tự đổi `status` theo khung, và **không** lưu cờ "đang bận". Rảnh / bận là **suy ra lúc đọc** — đúng anti-pattern 2 của [REF]:331.

**Quyền:** không ô mới.

| Việc | Ô | Ai |
|---|---|---|
| Ghi, rút khung bận của **xe** | `vehicle.manage` | Quản trị, Toàn quyền — theo [0040]:41, áp nguyên tắc |
| Xem khung bận của xe | `trip.view` (trên lịch chung) và `vehicle.manage` (màn Xe) | Bán hàng, Kế toán, Quản trị, Toàn quyền |
| Tài xế | không thấy khung bận của xe | — |

**Route** (tên đề xuất; kế hoạch chốt; cổng `office`, thân hỏi `can(vehicle.manage)` trước mọi truy vấn — khuôn route `/api/van-chuyen/xe/*` hiện có):
- `GET /api/van-chuyen/xe/:id/ban`;
- `POST /api/van-chuyen/xe/:id/ban`;
- `POST /api/van-chuyen/xe/:id/ban/:bid/rut`.
- `GET /api/van-chuyen/lich` (ADR-0049) trả thêm khung bận của các xe trong ngày.

**Nhật ký:** `vehicle_unavailability_added` / `_withdrawn`; `detail` = biển số + khung giờ + mã lý do. Không có dữ liệu cá nhân.

**Thứ tự với [TK] D9 (báo bận tài xế):**
- lượt nào duyệt trước thì **tạo bảng** với `subject` định trọn cả hai giá trị;
- lượt sau chỉ **mở** phần của mình: ô `unavailability.self`, route tài xế, lý do nhóm `BAN_TAI_XE`.
- D9 vẫn tự quyết các câu Q3, Q7 cũ của [L2]. Đề nghị D9 dùng `vc_reason` thay cho `CHECK` liệt kê lý do như [L2] D4, cho khớp — là **đề nghị**, D9 quyết.

### VK2-B. Giờ lái tối đa — bản nhẹ, tính lúc đọc (ý 3b; thừa kế [REF] "Duty Period" — [REF]:87)

**Chính sách** — thêm cột vào `vc_dispatch_policy` (chỉ thêm cột, có `DEFAULT` cho dòng cũ; Toàn quyền đổi — `settings.ops`):

| Cột | Nghĩa | Gieo |
|---|---|---|
| `duty_day_max_minutes` | tổng thời lượng chuyến của một tài xế trong một ngày chạy | 480 (8 giờ) |
| `trip_no_break_max_minutes` | một chuyến dài hơn mức này → nhắc nghỉ giữa chuyến | 240 (4 giờ) |

- `CHECK` khoảng: 60–1440 và 30–720.
- **Pháp lý (theo [TRA], chưa có người chuyên môn kiểm):** lái liên tục ≤ 4 giờ, nghỉ ≥ 15 phút; ≤ 8 giờ / ngày, ≤ 48 giờ / tuần theo Bộ luật Lao động; trần 10 giờ / ngày của luật cũ bỏ từ 1/7/2026.
  - Trần tuần **để sau** (bản nhẹ).

**Luật thuần** `gioLaiTaiXe(taiXe, chuyen[], ngayChay, chinhSach)` ở `src/shared/` (một nguồn cho màn hình + máy chủ):
- tổng thời lượng các chuyến **chưa huỷ** mà tài xế là người lái, có **ngày chạy** = `ngayChay` (chuyến qua nửa đêm tính cho ngày chạy của nó).
- **Thời lượng một chuyến:**
  - đã kết thúc: giờ xảy ra kết thúc − giờ xảy ra xuất bến (VK1-A; nếu VK1-A bị bác thì giờ ghi nhận);
  - đang chạy: bây giờ − giờ xuất bến;
  - chưa chạy: kết thúc dự kiến − bắt đầu dự kiến.
- "Người lái": chuyến đã chạy → dòng lái mở lúc xuất bến (LC-15 cấm đổi tài xế khi đang chạy nên là một người); chuyến chưa chạy → dòng lái đang mở.
- Chuyến có thời lượng > `trip_no_break_max_minutes` → nhắc "chuyến dài, nhớ cho tài xế nghỉ giữa chuyến".
- **Áp cho mọi tài xế trên chuyến** (công ty và nhà xe) — an toàn khách không phụ thuộc chủ xe.

**Khi vượt** — theo câu hỏi **Q-L2-2**. Khuyến nghị (a) **chỉ cảnh báo**:
- hiện ở lịch chung (loại cảnh báo mới trên `LOAI_CANH_BAO_LICH`) và trong kết quả kiểm tạo / sửa chuyến, gán tài xế;
- **không** vào `kiemXuatBen`, không chặn.
- Vì sao:
  - thời lượng chuyến gồm cả giờ chờ ở điểm → cao hơn giờ lái thật;
  - máy không biết tài xế nghỉ giữa chuyến;
  - con số pháp lý chưa được kiểm.
  - Chặn trên số gần đúng sẽ bắt Quản trị phá lệ hằng ngày.
- Nếu chủ chọn (b) "như khoảng nghỉ": thêm mã `GIO_LAI` vào `MA_LUAT_PHA_LE` (`src/shared/dieu-phoi-kieu.ts:54@fd78247`), ô `trip.override` có sẵn, sự kiện phá lệ ghi `policy_id`.

**Không bảng mới, không cột trên chuyến, không ô mới** (với (a)).

### VK2-C. Số hiệu chuyến bay trên chặng (ý 4; bản gọn của [REF] "Time Window neo sự kiện ngoài" — [REF]:81)

**Dữ liệu** — thêm cột vào `ord_transfer_leg` (module `orders`; migration riêng chỉ `ADD COLUMN`, không sửa `0034`):

| Cột | Kiểu, ràng buộc | Nghĩa |
|---|---|---|
| `flight_code` | TEXT NULL; `CHECK (flight_code IS NULL OR (flight_code = upper(flight_code) AND length(flight_code) BETWEEN 3 AND 8))` | số hiệu chuyến bay của khách ở đầu sân bay của chặng (vd `VN1553`) |

- **Máy chủ chuẩn hoá:** bỏ khoảng trắng, chữ hoa ("vn 1553" → "VN1553"), khớp khuôn `^[A-Z0-9]{2}[0-9]{1,4}[A-Z]?$`. Khuôn cụ thể là luật ở **mã** (Phần II); `CHECK` chỉ giữ phần bất biến.
- **Giao diện:** ô hiện khi nơi đón **hoặc** nơi trả của chặng là điểm loại `AIRPORT` ([0047] A1). Máy chủ không ép điều kiện này (đổi nơi sau thì ô cũ vẫn giữ, không mất dữ liệu).

**Quyền:** như mọi trường vận hành của chặng — `order.modify` (nháp), `order.trip.edit` (sau xác nhận). Không ô mới; không đổi nghĩa ô (cùng loại dữ liệu). Sửa số hiệu **không** kiểm mốc 6 giờ (ĐP2(iv) chỉ nói ngày, giờ, nơi).

**Ai đọc:**
- form / chi tiết đơn: ai xem được chặng;
- `lichChungChang` thêm khoá `soHieuChuyenBay` → **thay câu** danh sách trường của ADR-0049 D1;
- DTO tài xế: thêm vào mục điểm dừng / chặng, **cùng quy tắc với giờ, nơi hẹn** (có mọi lúc) → thay câu danh sách "Được" của ADR-0049 D3.
  - Số hiệu không kèm tên không chỉ ra một người; không thuộc danh sách cấm của Hiến chương 5.12.
  - *Giả định G-C1, người kiểm soi.*
- Biên nhận gửi khách: **không** thêm (Hiến chương 4.4 — danh sách trắng không đổi).
- **Nhật ký:** `order_leg_updated` ghi trước→sau **giá trị** số hiệu (như biển số). *Giả định G-C2, người kiểm soi.*

**Không làm:** tra chuyến bay qua dịch vụ ngoài; neo giờ đón vào giờ hạ cánh; cảnh báo máy bay trễ. Tài xế tự tra.

---

## Câu ADR bị thay (nguyên văn → mới)

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0049 D1, LC-03 ([0049]:125) | "Xe và tài xế không chồng giờ; mỗi xe, mỗi tài xế chỉ một chuyến đang chạy" | "… ; **chuyến chưa huỷ của một xe không chồng khung bận còn hiệu lực của xe đó** (ADR-00xx VK2-A)." Lớp CSDL thêm trigger đọc `vc_unavailability` |
| ADR-0049 D2, bảng `vc_dispatch_policy` ([0049]:142-150) | năm cột (+ cột kẹp của lượt 1 nếu duyệt) | thêm `duty_day_max_minutes` (480), `trip_no_break_max_minutes` (240) |
| ADR-0049 D1, `lichChungChang` ([0049]:72) | "Chỉ gồm: khoá, mã đơn, tên dịch vụ, chiều, ngày giờ hẹn, nơi đón/trả …, số người, số người đã có tên, cờ đặt gấp." | "… cờ đặt gấp, **số hiệu chuyến bay** (ADR-00xx VK2-C)." |
| ADR-0049 D3, danh sách trường cho tài xế ([0049]:232-234) | "**Được:** … điểm dừng (tên nơi; chữ tự do che dãy số), giờ hẹn, giờ xe tới;" | "… giờ hẹn, giờ xe tới, **số hiệu chuyến bay của chặng**;" |
| ADR-0047 A1, bảng cột `ord_transfer_leg` ([0047]:58-60) | (không có số hiệu chuyến bay) | thêm `flight_code` (TEXT NULL, chữ hoa, 3–8 ký tự) |
| ADR-0040 D1 (trạng thái xe) | "trạng thái: *đang dùng / bảo dưỡng / ngừng*, tập đóng `CHECK`" | **không đổi**; ADR mới ghi rõ: "bảo dưỡng" = nằm xưởng chưa biết ngày ra; khung có giờ ở `vc_unavailability` |

---

## Trang ghép (`CLAUDE.md` §9)

**(1) Bảng nào chứa loại thực thể nào**

| Bảng | Loại | Ghi chú |
|---|---|---|
| `vc_unavailability` (**mới**) | khung bận — **hai loại đối tượng** định trọn trong `CHECK`: của **xe** và của **tài xế** | lượt này chỉ mở ghi cho **xe**; dòng của tài xế chờ [TK] D9 |
| `vc_reason` | lý do | + nhóm `BAN_XE` (dòng mới, không thêm loại) |
| `vc_dispatch_policy` | chính sách có ngày hiệu lực | + 2 cột |
| `vc_trip` | chuyến | không đổi cột; thêm trigger LC-03 đọc khung bận |
| `ord_transfer_leg` | chặng | + cột `flight_code`; không thêm loại dòng |
| `audit_log` | nhật ký | + `vehicle_unavailability_*`; `order_leg_updated` có thêm trường |

**(2) Dòng bản đồ quyền nào chạm bảng nào, áp cho loại nào** — **không ô mới**:

| Ô (có sẵn) | Chạm | Áp cho |
|---|---|---|
| `vehicle.manage` | ghi, rút `vc_unavailability` | **chỉ dòng `subject = 'VEHICLE'`** — Quản trị, Toàn quyền |
| `trip.view` | đọc khung bận của xe (lịch chung) | Bán hàng, Kế toán, Quản trị, Toàn quyền; tài xế **không** |
| `trip.dispatch` | không ghi khung; bị LC-03 chặn khi xếp vào khung | — |
| `settings.ops` | 2 cột chính sách mới | Toàn quyền |
| `admin.manage` | `vc_reason` nhóm `BAN_XE` | Quản trị, Toàn quyền |
| `order.modify`, `order.trip.edit` | `ord_transfer_leg.flight_code` | như mọi trường vận hành của chặng; không đổi nghĩa ô |
| `trip.override` | chỉ nếu Q-L2-2 = (b): phá lệ giờ lái | Quản trị, Toàn quyền |

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng | Ô trong thân | Lớp CSDL |
|---|---|---|---|
| Khung bận của xe | `office` | `vehicle.manage` | `CHECK` đúng một đối tượng; chỉ-thêm (rút một lần); trigger chồng chuyến (Q-L2-1) |
| Xếp / đổi xe / đổi giờ chuyến | `office` | `trip.dispatch` | trigger LC-03 mở rộng |
| Chính sách giờ lái | `admin` / `office` | `settings.ops` | chỉ-thêm (có sẵn) |
| Số hiệu chuyến bay | `orders` | `order.modify` / `order.trip.edit` | `CHECK` khuôn |
| Hợp đồng giữa các phần | — | `lichChungChang` thêm một khoá; vẫn không tự kiểm quyền (bài `CONG_BO` có sẵn) | — |

---

## Cửa một chiều / hai chiều

- **Một chiều:**
  - bảng `vc_unavailability` (chủ, tiền tố);
  - `CHECK` tập đối tượng `('VEHICLE','DRIVER')` — định trọn để D9 khỏi dựng lại bảng;
  - mỗi khung đã ghi (chỉ-thêm).
- **Hai chiều:**
  - con số giờ lái (dòng chính sách mới);
  - cách xử lý khi vượt (mã);
  - ô số hiệu chuyến bay (cột để trống được; ngừng ghi được);
  - lý do bận (dữ liệu).

## Hệ quả

- **Việc lớn** (bảng mới + luật lõi LC-03) ⇒ **người kiểm độc lập** cuối lượt.
- **Hàng rào mới**, mỗi cái một dòng `docs/SO-HANG-RAO.md` + ngày thấy chặn thật:
  - trigger LC-03 khung bận (tạo chuyến / đổi xe / đổi giờ chồng khung → `RAISE`; bỏ trigger → ca đỏ);
  - trigger chỉ-thêm của khung;
  - `CHECK` đúng một đối tượng;
  - bài "một hàm chồng giờ" (máy chủ và màn hình gọi cùng hàm);
  - bài `gioLaiTaiXe` (ca qua nửa đêm, ca đang chạy, ca đã kết thúc dùng giờ xảy ra);
  - `CHECK` khuôn số hiệu;
  - bài liệt kê khoá DTO tài xế có số hiệu, không có tên ngoài ngày chạy (mở rộng bài của ADR-0049);
  - câu kiểm định kỳ `warn` "chuyến chưa huỷ chồng khung bận của xe" (lưới thứ hai).
- **Tài liệu:** `docs/data-dictionary.json` + `npm run dict`; `docs/SYSTEM-DESIGN.md`; `docs/CHANGE-GUIDE.md`.
- **Thứ tự:**
  1. chủ duyệt;
  2. kế hoạch thi công;
  3. VK2-C (độc lập) và VK2-B (luật thuần) làm được ngay sau lát 1.3 của ADR-0049;
  4. VK2-A sau `0042`;
  5. chủ vẽ màn (khung bận ở màn Xe + dải bận trên lịch chung; ô số hiệu ở form đơn) trên Claude Design;
  6. giao diện;
  7. người kiểm độc lập;
  8. phát hành.

## Phương án bị loại

- **Sổ giữ chỗ riêng cho mọi chuyến** (`Reservation` đầy đủ của [REF]:158): chép giờ chuyến sang bảng thứ hai, trái "một nguồn" ([ĐC] "Không nên theo" 3). Khung bận chỉ chứa những gì **không phải** chuyến.
- **Bỏ trạng thái "bảo dưỡng", chỉ dùng khung bận:** đổi tập đóng của ADR-0040 cần ADR và dựng lại bảng; xe nằm xưởng chưa biết ngày ra không có "giờ kết thúc".
- **Tự đổi `status` theo khung bận:** hai nguồn cho một câu hỏi.
- **Ghi giờ lái thật theo từng lần cầm lái** (GPS, thiết bị giám sát hành trình): cần thiết bị hoặc dịch vụ ngoài; không hợp quy mô ([ĐC] "Không nên theo" 4).
- **Neo giờ đón vào giờ hạ cánh, tự tra chuyến bay:** gọi dịch vụ ngoài, phụ thuộc nhà cung cấp; chủ chỉ chọn "số hiệu chuyến bay".

## Câu hỏi cho chủ (lời thường — trả lời một lần cho cả ba)

Khuôn `CLAUDE.md` §4: khuyến nghị đứng đầu; mỗi phương án một dòng "làm gì — Được: … Mất: …".

**Q-L2-1 — Quản trị ghi lịch đưa xe vào xưởng thứ Ba 8:00–17:00, nhưng xe đã được xếp một chuyến lúc 9:00 thứ Ba. Máy làm gì?**
- **(a) Khuyến nghị — không cho ghi lịch xưởng, báo "xe đang có chuyến lúc 9:00, dời chuyến trước"** — Được: không bao giờ có chuyến rơi vào giờ xe nằm xưởng. Mất: phải dời chuyến trước rồi mới ghi được lịch.
- **(b) Cho ghi, chuyến 9:00 bị giữ đỏ tới khi người xếp đổi xe** — Được: ghi lịch nhanh. Mất: không ai đổi xe thì sáng thứ Ba chuyến kẹt.

**Q-L2-2 — Cộng giờ các chuyến trong ngày, một tài xế vượt 8 giờ (hoặc một chuyến dài quá 4 giờ). Máy làm gì?**
- **(a) Khuyến nghị — chỉ cảnh báo trên bảng và lúc xếp, không chặn** — Được: không vướng việc; người xếp thấy để điều chỉnh. Mất: ai lờ đi thì tài xế vẫn chạy quá giờ. (Giờ chuyến gồm cả giờ chờ, và con số luật chưa có người chuyên môn kiểm, nên chặn dễ chặn nhầm.)
- **(b) Chặn như khoảng nghỉ; Quản trị / Toàn quyền cho phép kèm lý do** — Được: vượt giờ luôn có người chịu trách nhiệm. Mất: Quản trị có thể phải duyệt gần như mỗi ngày vì giờ tính dư.
- **(c) Chặn hẳn, không ai cho phép được** — Được: chặt nhất. Mất: chặn nhầm cả chuyến có nhiều giờ chờ.

**Q-L2-3 — Ghi số hiệu chuyến bay (vd VN1553) cho khách đón / tiễn sân bay tới mức nào?**
- **(a) Khuyến nghị — chỉ một ô số hiệu; người xếp xe và tài xế thấy, tài xế tự tra khi máy bay trễ** — Được: làm nhanh, đủ dùng. Mất: máy không tự biết máy bay trễ.
- **(b) Thêm ô "giờ hạ cánh dự kiến" để máy nhắc khi giờ đón quá sát** — Được: bớt đón hụt. Mất: mỗi đơn thêm một ô phải nhập.
- **(c) Để sau** — Được: không tốn công lúc này. Mất: tài xế vẫn phải hỏi văn phòng số chuyến bay.

## Giả định đã tự đặt (bề mặt, đảo ngược được)

- **G-A1:** khung bận của xe tối đa 31 ngày (mã).
- **G-A2:** tên bảng `vc_unavailability` theo [L2]; tên route, hành động nhật ký — kế hoạch chốt.
- **G-B1:** 480 / 240 phút gieo; Toàn quyền đổi.
- **G-C1:** số hiệu chuyến bay hiện cho tài xế mọi lúc (như giờ, nơi hẹn).
- **G-C2:** nhật ký ghi giá trị số hiệu.

## Chưa kiểm

- Pháp lý giờ lái: theo [TRA], **chưa có người chuyên môn kiểm**.
- Nhu cầu thật: xe có lịch xưởng đặt trước bao nhiêu lần / tháng; tỉ lệ đưa đón sân bay.
- `ALTER TABLE ADD COLUMN … NOT NULL DEFAULT … CHECK` trên D1 cho `vc_dispatch_policy`: thử trên `node:sqlite` và D1 local (bài học R-P4).
- Người kiểm độc lập đã xem bản `9cf9431`; bản sửa khuôn câu hỏi chưa được kiểm lại.
