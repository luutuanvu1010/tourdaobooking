# ADR-0055 — Vận chuyển, thừa kế Transportation Kernel, lượt 2: khung bận của xe; giờ lái tối đa (chỉ cảnh báo); số hiệu chuyến bay trên chặng

- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-30, hộp hỏi "Bạn có duyệt B2 — ADR-0055 (lịch xe vào xưởng, giờ lái chỉ cảnh báo, số hiệu chuyến bay) không?" → **"Duyệt ADR-0055"**. Câu hỏi của đề xuất đã được chủ trả lời ở sổ hỏi đáp Vận chuyển lần 16 và 17; người kiểm độc lập chỉ-đọc ĐẠT (các vòng lượt B; kiểm nhanh cuối @ `0cae449`). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
  - Soạn từ bản đề xuất `docs/superpowers/specs/2026-09-30-de-xuat-adr-kernel-luot-2.md` (giữ nguyên nội dung từ đây trở xuống; lượt duyệt B2, trang ghép `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-b-kernel-tien.md`).
  - **Ngày duyệt:** 2026-09-30. **Người phê chuẩn:** chủ dự án.
- **Ngày:** 2026-09-30.
- **Nguồn:**
  - bản đề xuất gốc `docs/superpowers/specs/2026-09-29-de-xuat-adr-van-chuyen-kernel-luot-2.md` (**[NG]**) — nội dung kỹ thuật lấy từ đây; tệp này chỉ chốt theo lời chủ và đo lại mã;
  - lời chủ, sổ `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` (**[HĐ]**) "Trả lời lần 16" (30/9), nguyên văn nhãn:
    - **Q-L2-1 — a "Không cho ghi"**: "Lịch xe vào xưởng trùng chuyến đã xếp: không cho ghi, dời chuyến trước";
    - **Q-L2-2 — a "Chỉ cảnh báo"**: "Vượt 8 giờ lái/ngày: chỉ cảnh báo (con số luật **chưa có người chuyên môn kiểm**)";
    - **Q-L2-3 — a "Một ô số hiệu"**: "Số hiệu chuyến bay: một ô, tài xế tự tra";
  - [HĐ] "Trả lời lần 9" (ý 3 "lịch bận xe + giờ lái tối đa", ý 4 "số hiệu chuyến bay"); [HĐ] "Trả lời lần 16" Q7 cũ **a "Trong Vận chuyển"** (lịch bận tài xế ở module `van-chuyen`, cửa một chiều) và Q3 cũ **c "Không, chỉ đối tác"** (chỉ tài xế đối tác có Báo bận);
  - tệp gom câu `docs/superpowers/specs/2026-09-30-van-chuyen-cau-hoi-cho-chu.md` mục 5, mục 10;
  - ADR-0040, ADR-0047, ADR-0049, ADR-0050 (đã duyệt); Hiến chương `docs/ARCHITECTURE.md` Phần I.
  - **Mã hôm nay** đo trên nhánh `thi-cong-adr-0049-tiep` @ `1f8b498` (ký hiệu `@49`), đọc bằng `git show`, không checkout.
- **Loại:**
  - **một chiều:** chủ và tiền tố bảng `vc_unavailability`; tập đối tượng `('VEHICLE','DRIVER')` trong `CHECK` (định trọn một lần); mỗi khung bận đã ghi (chỉ-thêm).
  - **hai chiều:** con số giờ lái (dòng chính sách); cách xử lý khi vượt (mã); ô số hiệu chuyến bay (cột để trống được); danh mục lý do bận (dữ liệu); màn hình.
- **Hiến chương áp:** 2.2 (khung bận là thực thể có vòng đời; lý do là dữ liệu), 5.1, 5.2, 5.3, 5.5, 5.6, 5.12, 5.13.
- **Xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (kiểm 30/9 ở nhánh này và ở `@49`). Mục `thao_tac` còn 6 ô hoãn, không ô nào thuộc Vận chuyển.
- **Xây trên nền chưa gộp / chưa phát hành (5.13):**
  - toàn bộ lõi chuyến ADR-0049 lượt 1 + ADR-0050 (`migrations/0040`–`0043` @49) **chưa gộp `main`, chưa lên production**; bốn mục luật của ADR-0049 chủ chọn "Xem từng mục lúc gộp" ([HĐ] lần 16, 1.1) — trong đó **mục 1** (cạnh `van-chuyen → orders, locations`) là nền của VK2-C phía lịch chung;
  - `ord_transfer_leg` (`0034` @49) chưa áp remote theo kiểm của điều phối ở lần 15 (không phải kiểm của người soạn);
  - ⇒ VK2-A, VK2-B thi công **sau** khi ADR-0049 lượt 1 gộp `main`; VK2-C sau khi `0034` và mục 1 luật ADR-0049 được duyệt.
- **Migration:** chỉ thêm, **sau các số đã giữ chỗ** (kế hoạch sổ tiền Task 0 giữ `0044`, `0045`; `0019` giữ cho B5; `0029` giữ cho ADR-0041). Số lấy lúc thi công, kiểm mọi nhánh chưa gộp. Không sửa `0034`, `0042`.

---

## Tóm tắt (lời thường)

1. **Lịch xe vào xưởng:** Quản trị ghi trước "xe 79B-… bảo dưỡng 8:00–17:00 thứ Ba". Máy **không cho xếp chuyến** vào giờ đó; nếu xe **đã có chuyến** trong giờ đó thì **không cho ghi lịch**, phải dời chuyến trước (bạn chọn).
2. Trạng thái "bảo dưỡng" hiện có vẫn giữ, dùng khi xe nằm xưởng chưa biết ngày ra.
3. **Giờ lái tối đa:** máy cộng giờ các chuyến của một tài xế trong ngày; quá 8 giờ thì **chỉ cảnh báo** trên bảng và lúc xếp — không chặn (bạn chọn; con số luật chưa có người chuyên môn kiểm). Một chuyến dài quá 4 giờ thì **nhắc** "nhớ cho tài xế nghỉ" (bạn chọn Q-K1 "Có, 4 giờ, chỉ nhắc"); Toàn quyền đổi con số được.
4. **Số hiệu chuyến bay:** thêm **một ô** trên chặng đưa đón (vd VN1553); người xếp xe và tài xế thấy; máy không tự tra, tài xế tự tra.
5. Không thêm ô quyền mới.
6. **Bạn cần:** bấm duyệt lượt B2 (không còn câu hỏi mở).

---

## Quyết định

### VK2-A. Khung bận của xe (Q-L2-1 = a)

**A1. Bảng mới `vc_unavailability`** (module `van-chuyen`; nguyên thiết kế [NG] VK2-A):

| Cột | Kiểu, ràng buộc |
|---|---|
| `id` | TEXT PK |
| `subject` | `CHECK IN ('VEHICLE','DRIVER')` — **định trọn ngay**; `DRIVER` dành cho lượt 3 Bảng điều phối (chủ đã chọn Q7 cũ a "Trong Vận chuyển", Q3 cũ c "chỉ đối tác") |
| `vehicle_id` | FK `vc_vehicle`, khi `VEHICLE` |
| `driver_party_id` | FK `pty_party` (cạnh `van-chuyen → parties` có sẵn), khi `DRIVER` — **lượt này không mở ghi** |
| `start_ms`, `end_ms`, `start_at`, `end_at` | `CHECK end_ms > start_ms` |
| `reason_code` | FK `vc_reason`; nhóm mới `BAN_XE` gieo "Bảo dưỡng", "Đăng kiểm", "Sửa chữa", "Khác" |
| `withdrawn_at`, `withdrawn_by` | NULL = còn hiệu lực |
| dấu vết đủ bốn cột | |

- `CHECK` đúng một đối tượng theo `subject`; trigger cấm `DELETE`; chỉ một kiểu `UPDATE` (rút một lần). Đổi giờ = rút + ghi khung mới.
- **Trigger chặn mở ghi `DRIVER`** (`BEFORE INSERT … WHEN NEW.subject = 'DRIVER'` → `RAISE`) cho tới ADR lượt 3 Bảng điều phối; lượt đó bỏ trigger bằng migration mới. Lý do: định trọn `CHECK` mà không mở cửa ghi trước khi có luật quyền của tài xế.
- Độ dài tối đa một khung: 31 ngày, ở **mã** (khoảng cho phép — Phần II).

**A2. Luật lõi** (mở rộng LC-03 — không ai phá lệ):
- (i) Chuyến **chưa huỷ** của xe X không chồng **khung bận còn hiệu lực** của X (nửa mở).
  - **[CSDL]** trigger **mới** `BEFORE INSERT ON vc_trip` và `BEFORE UPDATE OF planned_start_ms, planned_end_ms, vehicle_id ON vc_trip` đọc `vc_unavailability` (cùng module). Không sửa hai trigger `vc_trip_overlap_ins/upd` (`0042:352-372 @49`); mỗi trigger mới một câu `RAISE`, mã `lc03_unavailable`.
  - **[Máy chủ]** `kiemTaoSuaChuyen` (`src/shared/dieu-phoi-kiem.ts:90 @49`) nhận khung bận như khoảng chặn — **một** hàm, không viết luật thứ hai.
- (ii) **Q-L2-1 = a:** **không ghi** khung bận chồng lên chuyến **chưa huỷ, chưa kết thúc** của xe đó.
  - **[CSDL]** trigger `BEFORE INSERT ON vc_unavailability WHEN NEW.subject = 'VEHICLE' AND EXISTS (…)` đọc `vc_trip` (cùng module; chuyến `status IN ('PLANNED','RUNNING')`), `RAISE` mã `unavailability_overlaps_trip`.
  - **[Máy chủ]** trả 409 "Xe đang có chuyến <mã> lúc <giờ> — dời hoặc đổi xe chuyến đó trước", kèm danh sách chuyến vướng (mã chuyến + giờ, không tên khách).

**A3. Một nguồn cho mỗi câu hỏi:** "xe bây giờ có dùng được không" = `vc_vehicle.status` (`0033` — giữ nguyên tập đóng `active/maintenance/retired`); "xe bận khoảng giờ nào" = `vc_unavailability`. Máy **không** tự đổi `status` theo khung, **không** lưu cờ "đang bận" — suy ra lúc đọc.

**A4. Quyền** (không ô mới):
- ghi, rút khung bận của xe: `vehicle.manage` (Quản trị, Toàn quyền — `src/shared/permissions.ts:131 @49`);
- xem: `trip.view` (lịch chung) và `vehicle.manage` (màn Xe); tài xế công ty có `trip.view = assigned` **không** thấy khung bận của xe (DTO tài xế không có khoá này).

**A5. Route** (tên đề xuất; kế hoạch chốt; cổng `office`, thân hỏi `can(vehicle.manage)` trước mọi truy vấn): `GET|POST /api/van-chuyen/xe/:id/ban`, `POST /api/van-chuyen/xe/:id/ban/:bid/rut`; `GET /api/van-chuyen/lich` trả thêm khung bận của xe trong ngày.

**A6. Nhật ký:** `vehicle_unavailability_added` / `_withdrawn`; `detail` = biển số + khung giờ + mã lý do; không dữ liệu cá nhân.

### VK2-B. Giờ lái tối đa — chỉ cảnh báo (Q-L2-2 = a)

**B1. Chính sách** — hai con số mới của `vc_dispatch_policy` (Toàn quyền, `settings.ops`):

| Con số | Gieo | Khoảng |
|---|---|---|
| `duty_day_max_minutes` — tổng thời lượng chuyến của một tài xế trong một ngày chạy | 480 | 60–1440 |
| `trip_no_break_max_minutes` — chuyến dài hơn → nhắc nghỉ giữa chuyến | 240 | 30–720 |

- Cột `trip_no_break_max_minutes` và cảnh báo `CHUYEN_DAI_CAN_NGHI` **làm** — chủ chọn Q-K1 (a) "Có, 4 giờ, chỉ nhắc" (lần 17).

- **Cách thêm cột — kế hoạch chọn một, người kiểm soi:**
  - (1) **sửa tại chỗ `0041`** nếu lúc thi công `0041` **chưa áp remote** (tiền lệ ADR-0050 VK1-A sửa tại chỗ `0041`); giữ khuôn "KHÔNG DEFAULT, mỗi dòng là bản đầy đủ" (chú thích `0041:23-24 @49`, kế hoạch I43);
  - (2) nếu đã áp remote: migration mới `ADD COLUMN … NOT NULL DEFAULT 480 / 240 CHECK (…)` — **lệch khuôn I43 có ghi** (dòng mới chèn quên cột thì được điền mặc định thay vì bị chặn); bù bằng bài kiểm "câu chèn chính sách ở máy chủ liệt kê đủ cột".
  - (Bản [NG] ghi "có DEFAULT" mà chưa biết khuôn I43 — sửa ở đây.)

**B2. Luật thuần** `gioLaiTaiXe(taiXe, chuyen[], ngayChay, chinhSach)` ở `src/shared/` (một nguồn cho màn hình + máy chủ):
- tổng thời lượng các chuyến **chưa huỷ** mà tài xế là người lái, `service_date` = ngày chạy (chuyến qua nửa đêm tính cho ngày chạy của nó — `vc_trip.service_date` = ngày VN của giờ bắt đầu dự kiến, `0042:45 @49`);
- thời lượng: đã kết thúc = `ended_ms − departed_ms` (**giờ xảy ra** — ADR-0050 VK1-A đã duyệt, `0042:10 @49`); đang chạy = bây giờ − `departed_ms`; chưa chạy = `planned_end_ms − planned_start_ms`;
- người lái: chuyến đã chạy → dòng lái mở lúc xuất bến (LC-15 cấm đổi khi đang chạy); chưa chạy → dòng lái đang mở;
- áp cho **mọi** tài xế (công ty và nhà xe) — luật chuyến không rẽ nhánh theo chủ xe (ADR-0049 trang ghép, `vc_trip`).

**B3. Khi vượt — chỉ cảnh báo:** thêm hai loại vào `LOAI_CANH_BAO_LICH` (`src/shared/dieu-phoi-lich-chung.ts:44 @49`) — `GIO_LAI_VUOT`, `CHUYEN_DAI_CAN_NGHI` (nhãn ở `NHAN_CANH_BAO_LICH`, cùng tệp) — và vào kết quả kiểm tạo / sửa chuyến, gán tài xế. **Không** vào `kiemXuatBen`, **không** vào `MA_LUAT_PHA_LE`, không chặn, không ô mới, không cột trên chuyến.

**B4. Việc kèm (ngoài app):** hỏi người chuyên môn (luật sư / Sở GTVT) con số giờ lái (8 giờ/ngày, 4 giờ liên tục) trước khi đổi sang chặn. Con số là dòng chính sách, Toàn quyền đổi được không cần ADR.

### VK2-C. Số hiệu chuyến bay trên chặng (Q-L2-3 = a)

**C1. Dữ liệu** — migration mới, chỉ `ADD COLUMN` vào `ord_transfer_leg` (module `orders`): `flight_code TEXT NULL CHECK (flight_code IS NULL OR (flight_code = upper(flight_code) AND length(flight_code) BETWEEN 3 AND 8))`. Máy chủ chuẩn hoá (bỏ khoảng trắng, chữ hoa), khớp khuôn `^[A-Z0-9]{2}[0-9]{1,4}[A-Z]?$` ở **mã**.
- Giao diện: ô hiện khi nơi đón **hoặc** nơi trả là điểm loại `AIRPORT` (`0034:38 @49`); máy chủ không ép (đổi nơi sau vẫn giữ giá trị).

**C2. Ai ghi** — đúng ô của route chặng hiện có (đo `src/modules/orders/index.ts @49`):
- đơn nháp: chặng đi trong `PUT /api/orders/:id` (`:548`, hỏi `order.modify` `:553`) — `SALES` ownOrAssigned, `ADMIN` any, **`PARTNER` own**, `SUPER_ADMIN` any, **`INTERN` own** (`permissions.ts:77`);
- sau xác nhận: `POST /api/orders/:id/legs` (`:633`→`:638`), `PUT /api/orders/:id/legs/:legId` (`:657`→`:663`) hỏi `order.trip.edit` — `SALES` ownOrAssigned, `ADMIN`, `SUPER_ADMIN` (`permissions.ts:78`).
- ⇒ Đối tác và Thực tập **ghi được số hiệu trên đơn nháp của mình** — cùng quyền như giờ, nơi đón hôm nay; không đổi nghĩa ô.
- Sửa số hiệu **không** kiểm mốc 6 giờ (ĐP2(iv) chỉ nói ngày, giờ, nơi — ADR-0049 D2 bảng "Mốc tối thiểu").

**C3. Ai đọc:**
- form / chi tiết đơn: ai xem được chặng;
- `lichChungChang` (`src/modules/orders/index.ts:268 @49`) thêm khoá `soHieuChuyenBay`;
- DTO tài xế: thêm vào mục điểm dừng / chặng, **có mọi lúc** như giờ, nơi hẹn (giả định G-C1 — số hiệu không kèm tên không chỉ ra một người). Áp cho `DRIVER`; và cho `DRIVER_PARTNER` khi lượt 3 Bảng điều phối mở (chủ ĐP12 a "như tài xế công ty");
- biên nhận gửi khách: **không** thêm (Hiến chương 4.4).
- Nhật ký `order_leg_updated` ghi trước→sau **giá trị** số hiệu (giả định G-C2).

**C4. Không làm:** tra chuyến bay qua dịch vụ ngoài; neo giờ đón vào giờ hạ cánh; cảnh báo máy bay trễ.

---

## Câu ADR bị thay (nguyên văn → mới)

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0049 D1, LC-03 (`docs/adr/ADR-0049-*.md:125`) | "Xe và tài xế không chồng giờ; mỗi xe, mỗi tài xế chỉ một chuyến đang chạy" | "… ; **chuyến chưa huỷ của một xe không chồng khung bận còn hiệu lực của xe đó, và không ghi được khung bận chồng chuyến chưa huỷ, chưa kết thúc** (ADR-0055 VK2-A)." |
| ADR-0049 D2, bảng `vc_dispatch_policy` (`:142-150`) | năm cột (+ `proxy_backdate_max_minutes` của ADR-0050) | thêm `duty_day_max_minutes` (480), `trip_no_break_max_minutes` (240) |
| ADR-0049 D1, `lichChungChang` (`:72`) | "Chỉ gồm: khoá, mã đơn, …, số người, số người đã có tên, cờ đặt gấp." | "… cờ đặt gấp, **số hiệu chuyến bay** (ADR-0055 VK2-C)." |
| ADR-0049 D3, trường cho tài xế (`:232-234`) | "**Được:** … điểm dừng (tên nơi; chữ tự do che dãy số), giờ hẹn, giờ xe tới;" | "… giờ hẹn, giờ xe tới, **số hiệu chuyến bay của chặng**;" |
| ADR-0047 A1, bảng cột `ord_transfer_leg` | (không có số hiệu) | thêm `flight_code` (TEXT NULL, chữ hoa, 3–8 ký tự) |
| ADR-0040 D1 (trạng thái xe) | "*đang dùng / bảo dưỡng / ngừng*, tập đóng `CHECK`" | **không đổi**; ghi thêm: "bảo dưỡng" = nằm xưởng chưa biết ngày ra; khung có giờ ở `vc_unavailability` |

## Lệch có chủ ý khỏi Hiến chương

- **Không có** với các luật lõi (VK2-A hai lớp; VK2-B chỉ là cảnh báo đọc, không phải bất biến).
- **Lệch khuôn kế hoạch (không phải Hiến chương)** chỉ khi chọn đường (2) ở B1 — ghi ở kế hoạch, không cần chủ duyệt riêng.

## Cửa một chiều / hai chiều

- **Một chiều:** bảng `vc_unavailability` (chủ, tiền tố); `CHECK` tập đối tượng; mỗi khung đã ghi.
- **Hai chiều:** con số giờ lái; "chỉ cảnh báo" (đổi sang chặn = ADR mới, dùng khuôn `MA_LUAT_PHA_LE` có sẵn); cột số hiệu; trigger chặn `DRIVER` (bỏ bằng migration mới); lý do bận.

## Hệ quả

- **Việc lớn** (bảng mới + luật lõi LC-03 + cột trên bảng của `orders`) ⇒ người kiểm độc lập chỉ-đọc cuối lượt thi công.
- **Hàng rào mới**, mỗi cái một dòng `docs/SO-HANG-RAO.md` + ngày thấy chặn thật (P16):
  1. trigger chuyến chồng khung bận (tạo / đổi xe / đổi giờ → `RAISE`; bỏ trigger → ca đỏ);
  2. trigger khung bận chồng chuyến (Q-L2-1);
  3. trigger chặn ghi `DRIVER`;
  4. trigger chỉ-thêm của khung (rút một lần); `CHECK` đúng một đối tượng;
  5. bài "một hàm chồng giờ" (máy chủ và màn hình gọi cùng hàm);
  6. bài `gioLaiTaiXe` (qua nửa đêm, đang chạy, đã kết thúc dùng giờ xảy ra);
  7. `CHECK` khuôn số hiệu;
  8. bài liệt kê khoá DTO tài xế có số hiệu, không thêm khoá tên (mở rộng bài ADR-0049);
  9. bài thân trigger `vc_*` (`src/architecture.test.ts:752`, `:768 @49`) vẫn xanh — trigger mới chỉ đọc bảng `vc_`;
  10. câu kiểm định kỳ `warn` "chuyến chưa huỷ, **chưa kết thúc** chồng khung bận còn hiệu lực của xe" (lưới thứ hai; chuyến đã kết thúc là lịch sử, không báo).
- **Tài liệu:** `docs/data-dictionary.json` + `npm run dict`; `docs/SYSTEM-DESIGN.md`; `docs/CHANGE-GUIDE.md`.
- **Thứ tự:** chủ duyệt → kế hoạch → VK2-B (luật thuần) + VK2-C sau khi ADR-0049 lượt 1 gộp `main` → VK2-A → chủ vẽ màn (khung bận ở màn Xe, dải bận trên lịch chung, ô số hiệu) → giao diện → người kiểm độc lập → phát hành.

## Tiêu chí nghiệm thu (kiểm được; đỏ trước, xanh sau)

1. Ghi khung bận 8:00–17:00 cho xe đã có chuyến 9:00 chưa huỷ → route 409 (liệt kê chuyến) **và** câu `INSERT` chạy tay bị trigger chặn; chuyến đó huỷ rồi → ghi được.
2. Tạo chuyến / đổi xe / dời giờ vào khung bận còn hiệu lực → chặn ở máy chủ và CSDL; khung đã rút → không chặn.
3. `UPDATE` giờ hay đối tượng của khung, `DELETE` khung, rút lần hai → trigger chặn. Ghi khung `DRIVER` → chặn.
4. Tài xế lái 3 chuyến tổng 8 giờ 10 phút cùng ngày chạy → lịch chung có `GIO_LAI_VUOT`; `kiemXuatBen` **không** đổi kết quả (chỉ cảnh báo). Chuyến qua nửa đêm tính cho ngày bắt đầu.
5. Nhập "vn 1553" → lưu `VN1553`; nhập "V" → 400; `INSERT` tay `vn1553` → `CHECK` chặn. Sửa số hiệu trong 6 giờ trước giờ đón → không cần đặt gấp.
6. DTO tài xế có số hiệu mọi lúc; biên nhận không có.
7. `PARTNER` sửa số hiệu trên nháp của mình → được; trên nháp người khác → 403.
8. `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e`, `audit-invariants --db local` xanh.

## Phương án bị loại

- Sổ giữ chỗ riêng cho mọi chuyến (chép giờ chuyến sang bảng thứ hai) — hai nguồn.
- Bỏ trạng thái "bảo dưỡng" — đổi tập đóng của ADR-0040, dựng lại bảng.
- Tự đổi `status` theo khung bận — hai nguồn.
- Q-L2-1 (b) cho ghi, chuyến bị giữ đỏ; Q-L2-2 (b)/(c) chặn; Q-L2-3 (b)/(c) — chủ đã chọn (a).
- Ghi giờ lái thật theo thiết bị giám sát hành trình — cần thiết bị/dịch vụ ngoài.

## Giả định đã tự đặt (bề mặt, đảo ngược được)

- G-A1: khung tối đa 31 ngày (mã). G-A2: tên bảng, route, hành động nhật ký, mã câu báo — kế hoạch chốt.
- G-A3: trigger chặn ghi `DRIVER` tới lượt 3 (siết, đảo được bằng migration).
- G-B1: 480 phút gieo (theo lời chủ "vượt 8 giờ"). 240 phút: **chủ chọn** Q-K1 (a) lần 17 (con số theo tra cứu 27/9, chưa có người chuyên môn kiểm). G-B2: tên hai loại cảnh báo.
- G-C1: số hiệu hiện cho tài xế mọi lúc. G-C2: nhật ký ghi giá trị số hiệu.

## Câu hỏi đã trả lời (lời chủ — không hỏi lại)

| Mã | Chủ chọn (nguyên văn nhãn) | Lần |
|---|---|---|
| Q-L2-1 | a — "Không cho ghi" (khung bận chồng chuyến đã xếp) | 16 |
| Q-L2-2 | a — "Chỉ cảnh báo" (vượt 8 giờ lái/ngày) | 16 |
| Q-L2-3 | a — "Một ô số hiệu" | 16 |
| Q-K1 | a — "Có, 4 giờ, chỉ nhắc" | 17 |

**Câu còn mở cho chủ: không có.** Việc ngoài app (không chặn duyệt): hỏi người chuyên môn con số giờ lái trước khi đổi sang chặn.

## Hệ quả của ADR-0057 (đã duyệt) lên tệp này

- **Khung bận của xe × chuyến xe thuê:** độc lập. Chuyến xe thuê bị giữ `THIEU_GIA` vẫn là chuyến chưa huỷ, chưa kết thúc ⇒ vẫn chặn ghi khung bận chồng lên nó (Q-L2-1 a). Đổi xe để tránh khung bận ⇒ lô đổi xe của ADR-0057 tự đảo nguồn giá cũ và chụp lại (C4 của ADR-0057); đổi sang xe công ty ⇒ cờ `rented` về 0.
- **Cột trên `vc_trip`:** tệp này **không** thêm cột vào `vc_trip` (chỉ thêm trigger chồng khung bận); `rented`, `route_code` của ADR-0057 không liên quan.
- **Trigger chặn chèn chuyến không `PLANNED`** (ADR-0057): fixture test của khung bận phải chèn chuyến `PLANNED` rồi `UPDATE` (cùng danh sách fixture ADR-0057 đã nêu).
- **Giờ lái, số hiệu chuyến bay:** không.
- **Mã phá lệ:** tệp này không thêm mã nào vào `MA_LUAT_PHA_LE` / `MA_GIU` (chỉ hai loại cảnh báo) — không đụng bài ghim.

## Chưa kiểm

- Pháp lý giờ lái: chưa có người chuyên môn kiểm.
- Trạng thái remote của `0034`, `0041`: theo kiểm của điều phối ở lần 15, người soạn **không** tự chạy lệnh chỉ-đọc.
- `ALTER TABLE ADD COLUMN … NOT NULL DEFAULT … CHECK` trên D1 (đường (2) của B1): chưa thử trên `node:sqlite` và D1 local.
- Dòng mã `@49` đo trên `1f8b498`; phải đo lại sau khi ADR-0049 gộp `main`.
- Người kiểm độc lập (lượt B, nhiều vòng) báo **ĐẠT** cho tệp này; chưa chạy test (vai lập kế hoạch).
