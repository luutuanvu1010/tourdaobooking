# Trang ghép — lượt duyệt B: Kernel lượt 2, Kernel lượt 3, Tiền xe thuê (`CLAUDE.md` §9 "bước ghép khi duyệt")

> **Câu hỏi của trang này (§6) ĐÃ ĐƯỢC CHỦ TRẢ LỜI 2026-09-30 — chọn khuyến nghị ở cả 9 câu.** Nguyên văn: `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`, mục "Trả lời lần 17". Các ADR vẫn chờ chủ duyệt theo lượt (B1 = ADR-0057 trước, vì phần T3 phải duyệt trước Task 3 sổ tiền; B2; B3).

- **Loại:** tài liệu trình duyệt đi kèm ba bản đề xuất; **chưa có người kiểm độc lập**. AI soạn (vai thiết kế), không tự duyệt.
- **Ngày:** 2026-09-30.
- **Ba bản đề xuất** (số ADR là số tạm — điều phối cấp số thật):
  - **ADR-0055** `docs/superpowers/specs/2026-09-30-de-xuat-adr-kernel-luot-2.md` — khung bận của xe (VK2-A), giờ lái tối đa chỉ cảnh báo (VK2-B), số hiệu chuyến bay (VK2-C);
  - **ADR-0056** `docs/superpowers/specs/2026-09-30-de-xuat-adr-kernel-luot-3.md` — cam kết xe riêng / số chỗ tối thiểu (VK3-A), một dòng giấy tờ xe hiện hành mỗi loại (VK3-B);
  - **ADR-0057** `docs/superpowers/specs/2026-09-30-de-xuat-adr-tien-xe-thue.md` — bảng giá thuê (T1), chi phí chuyến (T2), sửa dòng nợ ADR-0026 (T3).
- **Lời chủ làm căn cứ:** "Trả lời lần 16" của `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` (không hỏi lại).
- **Mã đo** trên `thi-cong-adr-0049-tiep` @ `1f8b498` (`@49`) và `main`.

---

**Lượt A và lượt B là hai lượt duyệt riêng.** Lượt A = Bảng điều phối lượt 2–4 (ADR-0052…0054 tạm, người soạn khác, trang ghép riêng). Lượt B = tệp này. Không gộp câu duyệt của hai lượt; điểm chạm chung duy nhất đã thấy là bảng `vc_unavailability` (mục 4.2).

## 0. Trần "tối đa 3 quyết định chạm quyền/dữ liệu mỗi lượt" — đề nghị tách

Có hai cách đếm:

| Cách đếm | Kết quả | Căn cứ |
|---|---|---|
| Mỗi ADR = một quyết định | 3 — đúng trần | tiền lệ lượt 1 Hoàn tất (ADR-0024 + ADR-0025 + ADR-0026 = "đúng 3 quyết định") |
| Mỗi điều chạm dữ liệu/quyền = một quyết định | 8 (VK2-A, B, C; VK3-A, B; T1, T2, T3) | bản nguồn Kernel lượt 2 tự đếm "ba quyết định chạm dữ liệu — trần của một lượt" |

**Khuyến nghị cho điều phối** (theo cách đếm chặt hơn — siết, không nới):
- **B1 = ADR-0057 (tiền xe thuê), trình trước** — 3 quyết định. **Gấp:** T3 phải duyệt trước Task 3 (migration B) của sổ tiền lượt 1. Nếu T1/T2 cần thêm thời gian, có thể trình **riêng T3** trước.
- **B2 = ADR-0055** (3 quyết định).
- **B3 = ADR-0056** (2 quyết định).
- Nếu điều phối/chủ giữ cách đếm theo ADR thì B2 + B3 gộp một lượt được. Mục 1–3 dưới đây chia theo ADR để mỗi lượt đọc riêng được.

---

## 1. Bảng nào chứa những loại thực thể nào (sau cả ba ADR)

| Bảng | Module | Hôm nay chứa | Sau lượt B | ADR |
|---|---|---|---|---|
| `vc_unavailability` **(mới)** | `van-chuyen` | — | khung bận — **hai loại đối tượng** định trọn trong `CHECK`: của **xe** (mở ghi) và của **tài xế** (trigger chặn ghi tới lượt 3 Bảng điều phối; chủ đã chọn Q7 cũ a "Trong Vận chuyển", Q3 cũ c "chỉ đối tác") | 0055 |
| `vc_dispatch_policy` | `van-chuyen` | chính sách điều phối có ngày hiệu lực (`0041:14 @49`) | + 2 con số giờ lái | 0055 |
| `vc_reason` | `van-chuyen` | lý do theo nhóm (`0041:108 @49`) | + nhóm `BAN_XE` (0055), `CHI_PHI_XE` (0057) — dòng mới, **không thêm loại** | 0055, 0057 |
| `vc_trip` | `van-chuyen` | chuyến; xe công ty và xe nhà xe **chung bảng**; `carrier_party_id` chụp lúc xếp (`0042:18-60 @49`) | + `commitment_override_reason_code`, `commitment_override_key` (0056), + `route_code`, **`rented`** (cờ xe thuê chụp lúc xếp) (0057); + trigger chặn chèn chuyến `status <> 'PLANNED'` (siết, 0057); + trigger chồng khung bận (0055) | 0055–0057 |
| `vc_vehicle` | `van-chuyen` | xe công ty + xe nhà xe | phụ thuộc **Q-T1**: (a) không đổi cột — cỡ xe suy từ `passenger_capacity`; (b) thêm cột loại xe + danh mục loại xe | 0057 |
| `vc_vehicle_document` | `van-chuyen` | giấy tờ xe (chuỗi gia hạn) | + trigger "một dòng hiện hành mỗi loại" | 0056 |
| `vc_route` **(mới)** | `van-chuyen` | — | **nhãn tuyến** để tra giá (không phải lộ trình) | 0057 |
| danh mục cỡ xe **(mới, nếu Q-T1 a)** | `van-chuyen` | — | khoảng số khách không kể tài xế | 0057 |
| `vc_rental_rate` **(mới)** | `van-chuyen` | — | **chính sách tiền (giá vốn)** theo nhà xe — loại dữ liệu tiền **đầu tiên** trong module `van-chuyen` | 0057 |
| `vc_trip_cost_line` **(mới)** | `van-chuyen` | — | **tiền đã chụp (giá vốn)** của chuyến xe thuê | 0057 |
| `ord_transfer_leg` | `orders` | chặng đưa đón — **không mang tiền** (ADR-0047 A1) | + `flight_code` (0055); + `exclusive_vehicle`, `min_vehicle_seats` (0056) — **lời hứa về xe**, vẫn không mang tiền; không thêm loại dòng | 0055, 0056 |
| `bil_debt_line` (**chưa có**, ADR-0026) | `billing` | *(dự kiến)* nợ theo **đơn** | **đúng một nguồn** (đơn hoặc chuyến — `CHECK`); `trip_id` là cột dự trữ; lượt 1 mọi dòng vẫn có đơn (trigger) — **bảng dùng chung sẽ nhận một loại dữ liệu mới không gắn đơn** ở D3 (bài học F-01) | 0057 T3 |
| `audit_log` | `audit` | mọi hành động | hành động mới: khung bận, giá thuê, chi phí; `order_leg_updated` thêm trường | cả ba |

## 2. Từng dòng bản đồ quyền chạm các bảng này — áp cho loại nào

Cột theo `src/shared/permissions.ts:5 @49`. **(mới)** = ô thao tác mới (không phải mã quyền mới → không đụng `EXTERNAL_PERMISSIONS`, LC-1, không nhân đôi bài tập con quyền).

| Ô | Bảng / loại chạm | SALES | ACC | ADMIN | FIELD | PARTNER | SUPER | INTERN | DRIVER | DRIVER_PARTNER | ADR |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `vehicle.manage` (`:131`) | `vc_unavailability` **chỉ `subject = 'VEHICLE'`**; `vc_vehicle_document` (luật mới) | none | none | any | none | none | any | none | none | none | 0055, 0056 |
| `trip.view` (`:136`) | đọc khung bận xe (lịch chung), nhãn cam kết, số hiệu chuyến bay; **không** chi phí | any | any | any | none | none | any | none | assigned (DTO hẹp: số hiệu có, khung bận xe không) | none (lượt 3 BĐP mở, ĐP12 a) | 0055, 0056 |
| `trip.dispatch` (`:137`) | xếp / đổi xe / đổi giờ — bị LC-03 khung bận, R-XR, R-CX chặn; **chọn tuyến** (`vc_trip.route_code`) → gây chụp chi phí nhưng không thấy số; đọc **tên** tuyến / cỡ xe | any | none | any | none | none | any | none | none | none | 0055–0057 |
| `trip.override` (`:138`) | phá lệ cam kết; `vc_trip.commitment_override_reason_code` | none | none | any | none | none | any | none | none | none | 0056 |
| `settings.ops` (`:109`) | 2 con số giờ lái | none | none | none | none | none | any | none | none | none | 0055 |
| `admin.manage` (`:100`) | `vc_reason` nhóm `BAN_XE`, `CHI_PHI_XE` | none | none | any | none | none | any | none | none | none | 0055, 0057 |
| `order.modify` (`:77`) — nháp, `PUT /api/orders/:id` | `ord_transfer_leg` 3 cột mới | ownOrAssigned | none | any | none | **own** | any | **own** | none | none | 0055, 0056 |
| `order.trip.edit` (`:78`) — sau xác nhận, route chặng | `ord_transfer_leg` 3 cột mới | ownOrAssigned | none | any | none | none | any | none | none | none | 0055, 0056 |
| `transport.rate.view` **(mới)** | `vc_rental_rate`, danh mục | none | any | any | none | none | any | none | none | none | 0057 |
| `transport.rate.manage` **(mới)** | `vc_rental_rate`, `vc_route`, cỡ xe (ghi) | none | **any** | any | none | none | any | none | none | none | 0057 |
| `transport.cost.view` **(mới)** | `vc_trip_cost_line`, bảng kê | none | any | any | none | none | any | none | none | none | 0057 |
| `transport.cost.adjust` **(mới)** | `vc_trip_cost_line` (điều chỉnh, đảo, chụp lại, **giá thoả thuận trước `AGREED`**) | none | any | **any** | none | none | any | none | none | none | 0057 |
| `ledger.view` (ADR-0026, chưa có) | `bil_debt_line` — **kể cả dòng nguồn chuyến** khi D3 mở | own | any | own | own | none | any | own | none | none | 0057 T3 |
| `ledger.write` (ADR-0026, chưa có) | chốt, trả nhà xe (D3) | none | any | none | none | none | any | none | none | none | 0057 T3 |
| `money.view` (`:73`) | tiền **đơn** — **không** áp cho chi phí chuyến | — | — | — | — | — | — | — | — | — | — |

Ghi chú áp loại:
- `ledger.view` = `own` của SALES/ADMIN/FIELD/INTERN **không** lộ dòng nguồn chuyến, vì bên nợ của nợ nhà xe là **công ty chủ**, không phải hồ sơ nhân viên — D3 phải có test khẳng định "Sổ của tôi" không trả dòng loại đó.
- `order.modify` = `own` của `PARTNER`, `INTERN`: đối tác / thực tập ghi được số hiệu chuyến bay, "xe riêng", số chỗ tối thiểu **trên nháp của mình** — cùng quyền như giờ, nơi đón hôm nay; không đổi nghĩa ô.
- `FIELD` có `money.view = assigned` nhưng **không** thấy giá thuê / chi phí chuyến ở bất kỳ DTO nào (bài số lạ của ADR-0057).
- Hai cột `DRIVER`, `DRIVER_PARTNER`: mọi ô mới = `none`; bài ghim cả hàng phải vẫn xanh.
- **`ADMIN` = `ACCOUNTING` ở cả bốn ô `transport.*`** (chủ lần 18 "Hai vai giống hệt"; thay Q5 a lần 16 và Q-T7 lần 17); `SUPER_ADMIN` như cũ; `SALES` chọn tuyến qua `trip.dispatch` nhưng không ô tiền nào.

## 3. Cổng nào canh cửa nào

| Cửa | Cổng | Ô trong thân route | Lớp CSDL | ADR |
|---|---|---|---|---|
| Ghi / rút khung bận của xe | `office` | `vehicle.manage` | `CHECK` đúng một đối tượng; chỉ-thêm (rút một lần); không chồng chuyến chưa huỷ, chưa kết thúc (Q-L2-1 a); chặn `DRIVER` | 0055 |
| Xếp / đổi xe / đổi giờ chuyến | `office` | `trip.dispatch` | LC-03 hiện có + trigger chồng khung bận | 0055 |
| Chính sách giờ lái | `office` / `admin` | `settings.ops` | chỉ-thêm (có sẵn) | 0055 |
| Cảnh báo giờ lái | — (đọc) | `trip.view` | — (chỉ cảnh báo) | 0055 |
| Số hiệu chuyến bay, cam kết xe riêng / số chỗ | `orders` | `order.modify` (nháp) / `order.trip.edit` | `CHECK` khuôn / miền | 0055, 0056 |
| Phá lệ cam kết | `office` | `trip.override` | — (luật cấu hình: máy chủ + kiểm định kỳ) | 0056 |
| Cổng xuất bến | — | `kiemXuatBen` + `kiemCamKet` (một hàm) + nguồn giá (`THIEU_GIA`, không phá lệ) | LC-05 (có sẵn) + trigger `thieu_gia` (chuyến `rented = 1` không nguồn giá → không `RUNNING`; chỉ đọc bảng `vc_`, không view) | 0056, 0057 |
| Thêm giấy tờ xe | `office` | `vehicle.manage` | trigger một dòng hiện hành | 0056 |
| Bảng giá thuê, tuyến, cỡ xe | `office` | `transport.rate.view` / `.manage` (đọc tên: + `trip.dispatch`) | chồng hiệu lực; chỉ-thêm; vai `CARRIER` lúc thêm (`v_pty_carrier`) | 0057 |
| Chụp / đảo chi phí tự động | `office` (trong lô lệnh chuyến) | ô của lệnh chuyến (`trip.dispatch`) | dấu lô `last_cmd_id`; một nguồn giá chưa đảo; `SNAPSHOT` / `AGREED` chỉ cho nhà xe ≠ công ty chủ (`v_pty_carrier`, `v_pty_owner_company`) | 0057 |
| Điều chỉnh / đảo / chụp lại / **giá thoả thuận trước** / bảng kê chi phí | `office` | `transport.cost.adjust` / `.view` (Quản trị = Kế toán) | chỉ-thêm; đảo khớp gốc; **tổng ≥ 0 sau mọi dòng** (lô huỷ/đổi đảo dòng âm trước, dòng dương sau); một nguồn giá còn hiệu lực (`SNAPSHOT` hoặc `AGREED`, một trigger); `AGREED` > 0 và chỉ khi `PLANNED`; đảo nguồn giá chỉ khi `PLANNED` hoặc `CANCELLED` với dấu lô của chính lô huỷ; `rented` khớp phân loại lúc xếp/đổi xe (`v_pty_carrier`, `v_pty_owner_company`); lô huỷ/đổi mang dấu lô + phiên bản chi phí (dòng chen giữa ⇒ lô thua); chuyến huỷ tổng = 0 (`R-VC-COST-4`); chuyến đã xuất bến không nguồn giá = vi phạm (`R-VC-COST-5`, `fail`) | 0057 |
| Dòng nợ nguồn chuyến | `billing` (D3) | `ledger.write` | lượt 1: trigger `bil_debt_line_trip_not_yet`; `CHECK` đúng một nguồn | 0057 T3 |
| Hợp đồng giữa các phần | — | `lichChungChang` +3 khoá, `hanhKhachChoChuyen` +2 khoá; không tự kiểm quyền (bài `src/orders-cong-bo.test.ts`) | — | 0055, 0056 |
| DTO tài xế | cổng tài xế (ADR-0049 D3) | `trip.view` assigned | danh sách trắng: + số hiệu; **không** tiền, **không** khung bận | 0055, 0057 |

## 4. Hệ quả chéo

### 4.1 Giữa ba ADR

1. **"Số chỗ" một nghĩa:** `min_vehicle_seats` (0056) và chiều cỡ xe của giá thuê (0057 Q-T1 a) cùng so với `vc_vehicle.passenger_capacity` — **không kể tài xế** (`0033:26`). Nếu chủ chọn Q-T1 (b) thì có hai khái niệm "loại xe" và "số chỗ" song song — người kiểm soi.
2. **Đổi xe kéo theo chụp lại chi phí:** mọi lệnh đổi xe trước xuất bến — dù vì khung bận (0055), vì cam kết số chỗ (0056) hay vì tài xế đối tác Từ chối — đều tự đảo + chụp lại chi phí trong cùng lô (0057 C4). Câu chụp mang điều kiện dấu lô.
3. **Hai cột mới trên `vc_trip`** (0056, 0057) đều `ADD COLUMN`, độc lập; cả hai bị `vc_trip_final_frozen` (`0042:412`) khoá sau khi chuyến kết thúc/huỷ; `route_code` thêm trigger riêng khoá khi đang chạy.
4. **`lichChungChang`** nhận 3 khoá từ hai ADR (số hiệu; xe riêng; số chỗ) — một danh sách trường, sửa một lần nếu thi công cùng đợt; bài liệt kê khoá cập nhật một lần.
5. **`vc_reason`** nhận hai nhóm (`BAN_XE`, `CHI_PHI_XE`); mã hệ thống của chụp lại do máy ghi — không để Quản trị ngưng dùng (kế hoạch chốt).
6. **`MA_LUAT_PHA_LE`** (`src/shared/dieu-phoi-kieu.ts:74 @49`) thêm `CAM_KET` (0056); 0055 **không** thêm `GIO_LAI` (chỉ cảnh báo); 0057 thêm mã giữ **`THIEU_GIA`** vào `MA_GIU` nhưng **không** vào `MA_LUAT_PHA_LE` (chủ lần 18: không phá lệ, kể cả xe cứu hộ) — hợp bài ghim (mỗi mã phá lệ là mã giữ; không đòi chiều ngược).

### 4.2 Với ADR đã duyệt

| ADR | Chạm gì | Ở đâu |
|---|---|---|
| **ADR-0024** | điều 1: giá thuê xe ra khỏi `pricing` (Q2 a) + ràng buộc X3 cho D5; điều 5 (trigger chỉ đọc bảng cùng module / view công bố): mọi trigger mới chỉ đọc `vc_` + view đã liệt kê (`architecture.test.ts:752 @49`); đồ thị: **không** thêm cạnh (T3 giữ trung lập Q12) | 0057 |
| **ADR-0025** | khoá đơn sau "Đã giao" — kế hoạch sổ tiền Q1 "Khoá cả hai" (`ord_transfer_leg`, `ord_passenger`): **ba cột mới trên `ord_transfer_leg` phải nằm trong khoá** (nếu trigger khoá liệt kê cột thì bài canh cột phải nhận cột mới) | 0055, 0056 |
| **ADR-0026** | điều 3, điều 5 thay câu (T3); kế hoạch §3.2 sửa `bil_debt_line`; **phải duyệt trước Task 3**; `R-BIL-*` lượt 1 không đổi | 0057 |
| **ADR-0040** | D1 giấy tờ xe: + "một dòng hiện hành mỗi loại" (0056); trạng thái xe không đổi (0055); "Không module nào import `van-chuyen`" **không đổi** (0057 không cần cạnh); §6 "danh mục loại xe để sau" → theo Q-T1 | 0055–0057 |
| **ADR-0047** | A1 cột `ord_transfer_leg` (+3 cột); A3 `hanhKhachChoChuyen` (+2 khoá); "chặng không mang tiền" giữ | 0055, 0056 |
| **ADR-0048** | vai `CARRIER`, view `v_pty_carrier`, `v_pty_owner_company` (`0038:7-11`) là nền cho hai lớp của 0057 (gỡ LCY-1, LCY-2). Lưu ý: view phản ánh **hiện tại** → trigger vai chỉ áp lúc **thêm** giá / `SNAPSHOT` | 0057 |
| **ADR-0049** | LC-03 (+ khung bận), `vc_dispatch_policy` (+2), `lichChungChang`, DTO tài xế (+ số hiệu), cổng xuất bến (+ cam kết), `trip.override` (+ cam kết), `vc_trip` (+ cột phá lệ cam kết, `route_code`, `rented`; + trigger chặn chèn chuyến không `PLANNED`); cổng xuất bến (+ nguồn giá, không phá lệ). **Chưa gộp `main`**; bốn mục luật "Xem từng mục lúc gộp" (lần 16) — mục 1 (cạnh `van-chuyen → orders, locations`) là nền của mọi khoá mới trên lịch chung; 0057 cố ý **không** dựa vào `locations` (G-T1) | cả ba |
| **ADR-0050** | VK1-A giờ xảy ra — nền của giờ lái (0055 VK2-B); VK1-C giấy tờ xe lúc xuất bến — 0056 VK3-B chặn tái phát chuỗi song song (K-01 = `R-VC-11` đã trên `main`) | 0055, 0056 |
| Đề xuất song song **ADR-0053 tạm** (`docs/superpowers/specs/2026-09-30-de-xuat-adr-dieu-phoi-luot-3.md`, Báo bận tài xế đối tác) | **Cùng bảng `vc_unavailability`**, cùng thiết kế (`subject` định trọn hai giá trị). Lượt nào thi công trước thì **tạo bảng**; nếu 0055 trước thì kèm trigger chặn ghi `DRIVER`, 0053 bỏ trigger đó khi mở; nếu 0053 trước thì 0055 chỉ mở phần xe. Luật "không ghi khung chồng chuyến" của hai bên cùng hướng (0053 B9.2 ↔ 0055 Q-L2-1 a) — kế hoạch nên dùng **một** hàm kiểm | 0055 |
| Đề xuất song song **ADR-0052 tạm** (xe cứu hộ, lượt 2 Bảng điều phối) | Chuyến cứu hộ bằng xe **nhà xe** phải có nguồn giá **trước** xuất bến (giá bảng hoặc giá thoả thuận) — chủ lần 18 "Vẫn phải nhập giá thoả thuận trước", không ngoại lệ. Quy trình cứu hộ của 0052 phải có bước "Quản trị / Kế toán nhập giá thoả thuận" hoặc dùng xe công ty | 0057 |
| Đề xuất song song **ADR-0053 tạm** (Nhận / Từ chối của tài xế đối tác) | Từ chối → giao lại (đổi xe / nhà xe) → lô đổi **đảo nguồn giá cũ** (`SNAPSHOT` hoặc `AGREED`) và chụp lại giá bảng; nguồn cũ là giá thoả thuận thì phải **nhập lại** (không tự chuyển); không có giá ⇒ chuyến bị giữ `THIEU_GIA` | 0057 |
| **ADR-0049 D2** (mốc 6 giờ, cổng xuất bến) | Cổng xuất bến thêm điều kiện nguồn giá; chuyến xe thuê xếp **sát giờ** mà bảng giá chưa có có thể bị giữ tới khi Quản trị / Kế toán nhập giá thoả thuận — cần người có ô `transport.cost.adjust` trực; không có đường phá lệ | 0057 |
| Lời chủ lần 16, lượt 3 Bảng điều phối (chưa ADR) | Q7 cũ a / Q3 cũ c → `vc_unavailability` loại `DRIVER` dùng cho tài xế đối tác; ĐP12 a → DTO số hiệu áp cả `DRIVER_PARTNER`; Q2 cũ a (Từ chối tới 12 giờ trước) → giao lại chuyến kéo theo chụp lại chi phí | 0055, 0057 |

### 4.3 Với sổ tiền lượt 1 (ADR-0024/0025/0026, kế hoạch 29/9)

- **Thứ tự thi công** là câu Q-T2 của 0057 (khuyến nghị: sổ tiền lượt 1 trước; T3 duyệt ngay).
- **Số migration:** sổ tiền giữ `0044`, `0045` (kế hoạch Task 0); T3 đi **trong** migration B; mọi migration khác của lượt B lấy số sau đó, kiểm mọi nhánh chưa gộp.
- **Hai phiên cùng sửa `src/shared/permissions.ts`** (sổ tiền thêm `order.handover`, `order.complete`, `ledger.*`; 0057 thêm `transport.*`) — xếp tuần tự để bài ghim 9 cột không xung đột.

## 5. Điểm người kiểm độc lập nên xem kỹ

1. Hình dạng T3 có thật sự trung lập với Q12 không (không khoá ngoại, không view, không cạnh); trigger `bil_debt_line_trip_not_yet` bỏ được sạch ở D3.
2. Trigger vai `CARRIER` / công ty chủ **chỉ** ở lúc thêm giá và `SNAPSHOT` — không chặn đóng giá, đảo, điều chỉnh (view không theo ngày; ADR-0043 đổi công ty chủ).
3. Khoá chống ghi chồng của "chụp lại" / "điều chỉnh" sau khi chuyến kết thúc (không dùng được `last_cmd_id`).
4. Cách nhận biết "vi phạm cam kết mới" sau phá lệ (0056).
5. `vc_dispatch_policy`: sửa tại chỗ `0041` hay `ADD COLUMN … DEFAULT` (khuôn I43).
6. Cách đếm trần §9 (mục 0).
7. Danh sách route GET cho bài số lạ có đủ lịch chung và chi tiết chuyến (Bán hàng có `trip.view`).
8. (Sau kiểm lần 1) `CHECK` "đúng một nguồn" của `bil_debt_line` trong migration B; trigger `bil_debt_line_trip_not_yet` chỉ chặn dòng chỉ-có-chuyến.
9. "Tổng ≥ 0" canh mọi dòng; lô huỷ / đổi đảo **mọi** dòng còn hiệu lực theo thứ tự âm trước, dương sau (0057 C4, C8) — kiểm tổng không âm giữa lô trên D1 thật.
10. Cách nhận biết "vi phạm cam kết mới sau phá lệ" (0056 A3): khoá tập vi phạm `commitment_override_key` (id xe + từng chặng vi phạm: id, loại, cờ xe riêng, số chỗ tối thiểu); cổng xuất bến chạy lại `kiemCamKet`, khoá khác ⇒ phá lệ lại (kể cả đổi sang xe nhỏ hơn, tăng số chỗ, vi phạm do sửa đơn); hết vi phạm ⇒ xoá hai cột phá lệ.

## 6. Câu hỏi cho chủ của lượt B — ĐÃ TRẢ LỜI (lần 17, lần 18)

**Câu còn mở cho chủ: không có.** Chỉ còn các câu duyệt (sau khi người kiểm báo đạt bản sửa theo lần 18).

| Mã | Chủ chọn (nguyên văn nhãn) | Lần | Áp vào |
|---|---|---|---|
| Q-K1 | "Có, 4 giờ, chỉ nhắc" | 17 | ADR-0055 VK2-B |
| Q-T1 | "Theo cỡ xe = số khách" | 17 | ADR-0057 T1 |
| Q-T2 | "Sổ tiền trước, duyệt ngay phần nợ gắn chuyến" | 17 | T3 duyệt trước Task 3 sổ tiền |
| Q-T3 | "Kế toán ghi giá chốt tay" | 17 | **không còn áp dụng** — hệ quả lần 18 (chuyến không chạy được khi thiếu giá) |
| Q-T4 | "Lúc văn phòng xếp xe của nhà xe" | 17 | C4 |
| Q-T5 | "Người xếp xe" | 17 | C2 |
| Q-T6 | "Giữ giá đã chụp, Kế toán chỉnh tay" | 17 | C4 (nay Quản trị cũng chỉnh được) |
| Q-T7 | "Có, chỉ xem" | 17 | **thay** bởi lần 18 |
| Q-T8 | "Duyệt, cùng hạn sổ công nợ" | 17 | L-T1 |
| Lần 18, điểm 3 | "Chưa có giá thì không được chạy, giá phải có niêm yết hoặc thoả thuận giá trước…" | 18 | **thay Q6 a** — cổng xuất bến `THIEU_GIA` hai lớp, giá thoả thuận `AGREED` |
| Lần 18, điểm 5 | "Quản trị có quyền ngang kế toán" → "Hai vai giống hệt" | 18 | ADMIN = ACCOUNTING ở bốn ô `transport.*` |
| Lần 18 | Giá thoả thuận do "Quản trị, Kế toán, Toàn quyền" nhập | 18 | `transport.cost.adjust` |
| Lần 18 | Xe cứu hộ chưa có giá: "Vẫn phải nhập giá thoả thuận trước" | 18 | không ngoại lệ, không phá lệ |

**Việc của chủ ngoài app (Kernel lượt 3):** hỏi người chuyên môn về ghép khách nhiều đơn trên xe hợp đồng trước khi chạy chuyến ghép thật.

**Câu duyệt:** B1 — "Duyệt ADR-0057 (tiền xe thuê, bản sửa theo lần 18, gồm sửa ADR-0026 và lệch L-T1)?"; B2 — ADR-0055; B3 — ADR-0056.
