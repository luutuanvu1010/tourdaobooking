# Trang ghép — lượt duyệt 8d (2026-10-08)

> **Hồ sơ có ngày 2026-10-08, vai soạn.** Bắt buộc theo `CLAUDE.md` §9 ("bước ghép khi duyệt"): lượt có nhiều quyết định chạm dữ liệu và bất biến, và bảng suất `vc_trip_allocation` nhận thêm một loại đường ghi mới (chuyển khách giữa hai chuyến). Trang này ghép **cả hai lượt** của ADR-0111 (đề xuất) — `01-de-xuat-adr-0111-chuyen-khach-giua-xe.md` — mỗi dòng ghi thuộc lượt **8d-1** (Đ1, Đ2, Đ3), **8d-2** (Đ4, Đ5, Đ6), hay **đã duyệt** (ADR-0052, 30/9). Khuôn: kế hoạch A5 §5, đối chiếu lại với mã.
>
> **Mốc đo:** `claude/van-chuyen-goi-a-c` @ `046fb6b5` (đầu nhánh lúc soạn, đã gộp ADR-0104 Đ1). Năm tệp đổi so với `d4a4bdee` (nơi nhánh người soạn dựng) — `src/modules/van-chuyen/index.ts`, `src/shared/permissions.ts`, `src/shared/tin-chuyen.ts`, `web/chuyen.ts`, `src/modules/van-chuyen/lop-vuot.test.ts` — đọc bằng `git show 046fb6b5:<tệp>`; các tệp khác như nhau ở hai mốc.

## Cho chủ dự án

Ghép sáu quyết định của hai lượt lại, tôi không thấy ai được thêm quyền: ô "chuyển khách" của tài xế đã được bạn duyệt ngày 30/9, và lượt này không đổi giá trị ô nào. Thứ thay đổi là đường ghi dữ liệu: khách trên một xe nay có thể chuyển sang xe khác giữa chừng, nên bảng ghi "khách nào ngồi xe nào" có thêm một loại thay đổi. Có ba điều bạn nên biết:
1. **Một khách có thể được chuyển nhiều lần.** Vì vậy mỗi khách ghi riêng "chuyển vào theo lần nhờ nào" và "chuyển ra theo lần nhờ nào" (lượt 8d-1).
2. **Văn phòng không chuyển khách thay tài xế.** Văn phòng chỉ được gửi thay đề nghị cứu hộ khi xe hỏng; tài xế xe nhận vẫn phải tự bấm Nhận, và Nền tảng kiểm điều này ở cả tầng dữ liệu (lượt 8d-1).
3. **Hai nút gần tên nhau trên màn chuyến của văn phòng.** Hôm nay đã có nút "Cứu hộ" mở hộp "Kết thúc gián đoạn". Nút mới "Chuyển khách sang xe cứu hộ" là việc khác; hai nút cần chữ và vị trí đủ khác để không bấm nhầm (việc giao diện, sẽ đưa ảnh cho bạn xem trước).

---

## 1. Đếm quyết định (trần 3 mỗi lượt — `CLAUDE.md` §9)

| Lượt | Quyết định | Chạm | Hộp hỏi |
|---|---|---|---|
| 8d-1 | Đ1 — danh mục điều kiện chuyển `vc_transfer_rule` | dữ liệu (bảng mới, một chiều) | "Điều kiện" |
| 8d-1 | Đ2 — hai điều kiện bắt buộc `CAM_KET_DICH`, `CHANG_KHACH_HIEU_LUC` | dữ liệu, bất biến; ghi khoá cam kết chuyến đích | "Điều kiện" |
| 8d-1 | Đ3 — dấu vết (cột suất, cột đề nghị), nghĩa công tắc, nhật ký, tin "không nhận" | dữ liệu (một chiều), người nhận tin | "Dấu vết" |
| 8d-1 | (không tính trần) xác nhận mười tình huống mẫu | chặn nghiệm thu, không chặn thi công | "Tình huống" |
| 8d-2 | Đ4 — cứu hộ `ONBOARD` chỉ sang xe đang chạy | bất biến (LC-14), siết | "Chỗ siết" |
| 8d-2 | Đ5 — thu hồi xuất bến sau khi chuyển khách | bất biến (`revoke_no_progress`), siết + đổi nghĩa "tiến độ" | "Chỗ siết" |
| 8d-2 | Đ6 — chặng đặt gấp sang xe chưa chạy dưới mốc | bất biến (mốc 6 giờ) | "Đặt gấp" |

Mỗi lượt đúng 3 quyết định chạm dữ liệu / bất biến. Không quyết định nào chạm tiền hay đổi giá trị ô quyền.

---

## 2. Bảng bị chạm và loại thực thể chứa trong đó

| Bảng / cột (module chủ) | Chứa loại nào | Ai ghi (sau ADR) | Xoá | Ai đọc | Lượt |
|---|---|---|---|---|---|
| `vc_transfer_rule` (van-chuyen, **mới**) | 11 điều kiện chuyển: 8 tầng `LOI` (luật lõi), 3 tầng `CAU_HINH` (Quản trị duyệt vượt được) | chỉ migration; không route nào | không; tắt bằng `active = 0` | `kiemChuyen`, nhãn hộp duyệt | 8d-1 (Đ1, Đ2) |
| `vc_transfer_request` (van-chuyen, **mới**) | đề nghị `STOP` (một điểm chưa tới; tài xế nguồn gửi) và `ONBOARD` (cứu hộ: mọi suất mở của xe hỏng; tài xế nguồn gửi **hoặc văn phòng gửi thay**). Trước A4: nguồn và đích đều là chuyến có **tài xế công ty** (G-A5-20; tài xế đối tác có `trip.transfer = none`; xe nhà xe + tài xế công ty bị LC-13 chặn) | gửi, rút, không nhận, nhận, duyệt, bác, hết hạn lười, tự huỷ (`VOID`) | không | tài xế nguồn / đích (của mình); văn phòng có `trip.view` (chỉ đọc); người có `trip.override` (hộp duyệt) | 8d-1 (Đ3 — bốn cột thêm, `_nguoi_nhan`); vế `ONBOARD → RUNNING` của LC-14: 8d-2 (Đ4); bảng: đã duyệt (`ADR-0052:56-63`) |
| `vc_transfer_check` (van-chuyen, **mới**) | bằng chứng từng điều kiện của mỗi lần nhận / duyệt, kèm `policy_row_id` (dòng chính sách hiện hành lúc quyết) | lô nhận, lô duyệt | không, chỉ thêm | hộp duyệt, bất biến R-VC-28/29 | đã duyệt (`:64`); khoá ngoại danh mục: 8d-1 (Đ1); nghĩa `policy_row_id`: 8d-1 (Đ3) |
| `vc_trip_allocation` (van-chuyen, `migrations/0042_chuyen_xe.sql:121`) — cột mới `transfer_id`, `closed_transfer_id` | suất `PASSENGER` (khách của chặng thuộc **mọi loại đơn**: khách lẻ Bán hàng lập, đơn của Đối tác / đại lý, đơn Thực tập lập; có tên hoặc chưa tên) và suất `CREW` (người đi kèm, `0042:124`, `:141`) | lô xác nhận / duyệt: đóng suất nguồn `TRANSFERRED`, mở suất đích (mỗi suất một câu `INSERT`) | không (đóng bằng `valid_to_at`) | lịch, màn tài xế, danh sách hành khách, R-VC-26/27 | 8d-1 (Đ3 — tách hai cột); đường ghi: đã duyệt (`ADR-0052:70`, `:109-110`) |
| `vc_trip_stop` (`0042:87`) | điểm đón / trả; **chữ tự do có thể là nhà riêng khách**; điểm "nơi gặp" mới (chữ đã che hoặc địa điểm danh mục) | lô xác nhận: thêm điểm ở đích (`added_while_running` khi đích đang chạy), điểm nguồn `MOVED` (chỉ `STOP`), sắp lại điểm chưa tới ở đích | không | lịch, tài xế | đã duyệt (`:70`, D5c); thứ tự trong lô: sửa chữ (tệp 01) |
| `vc_trip_manifest` (`0042:229`) | dòng danh sách hành khách thêm ở đích khi đích đã xuất bến | lô xác nhận / duyệt | không | danh sách hành khách | đã duyệt (`:70`) |
| `vc_trip.commitment_override_key`, `commitment_override_reason_code` (`migrations/0077_cam_ket_chang.sql:10-13`) | khoá cam kết (xe riêng / số chỗ tối thiểu) của **chuyến đích** | lô duyệt khi `CAM_KET_DICH` không đạt | không (xoá về trống khi hết vi phạm — ADR-0056 `:70`) | cổng xuất bến, R-VC-25 | 8d-1 (Đ2) |
| `vc_dispatch_policy` (`migrations/0041_chinh_sach_dieu_phoi.sql:14`) — cột mới `accept_wait_minutes`, `auto_confirm_transfer` | chính sách điều phối (dòng có ngày hiệu lực, chỉ thêm) | route chính sách (`settings.ops`) | không (`0041:33-36`) | `kiemChuyen`, trigger `_confirm_may` | cột: đã duyệt (`:66`); **nghĩa "hạn chờ lúc gửi / công tắc lúc nhận"**: 8d-1 (Đ3) |
| `vc_reason` nhóm `TU_CHOI_NHAN` (`0041:108`) | 4 lý do "Không nhận" / "Bác" (gieo) | gieo; Quản trị sửa nhãn (`admin.manage`) | không, tắt | tài xế đích, hộp duyệt | nhóm: đã duyệt (`:62`); dùng cho Bác: tự áp G-A5-4 |
| `vc_trip_event` (`0042:153`) | 7 loại `TRANSFER_*`, đặt ở **chuyến đích**, `related_trip_id` = nguồn | mỗi lệnh một sự kiện (trừ tự huỷ) | không | lịch, đường tin, trigger LC-15, `revoke_no_progress` | 8d-1 (Đ3); cách tính trong thu hồi xuất bến: 8d-2 (Đ5) |
| `audit_log` (audit) qua view `v_aud_trip_event` (`migrations/0070_tin_chuyen.sql:4`) | 7 việc `trip_transfer_*`; `detail` chỉ mã chuyến, phạm vi, số khách, mã luật không đạt | mỗi lệnh một dòng | không | Nhật ký, hộp thông báo (`thongbao`) | 8d-1 (Đ3) |

**Ghép ra một chỗ chưa có chữ (cho điều phối, không phải hộp hỏi):** `ADR-0052:129` ghi cứu hộ chuyển "mọi suất mở `WAITING` + `BOARDED` của A". Bảng suất chứa cả suất `CREW` (người đi kèm, ví dụ hướng dẫn viên). Đọc theo chữ thì cứu hộ chuyển cả người đi kèm, và sức chứa xe đích (LC-02 tính cả người đi kèm, `0042:317`) phải tính họ; kế hoạch A5 và mười tình huống chưa có ca người đi kèm. Người thi công cần thêm ca này (khuyến nghị: theo đúng chữ `:129`, chuyển cả suất `CREW`; nếu điều phối thấy cần đọc khác thì đó là câu hỏi dữ liệu, phải hỏi chủ).

---

## 3. Dòng bản đồ quyền chạm các bảng trên

Thứ tự giá trị: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR (`src/shared/permissions.ts`).

| Ô | Giá trị | Đổi | Áp cho loại nào | Lượt |
|---|---|---|---|---|
| `trip.transfer` (**mới**, chưa có trong `permissions.ts`) | none, none, none, none, none, any, none, assigned, none, none | thêm ô đúng giá trị `ADR-0052:84`; ghim hàng DRIVER thêm ô (N1, `:190`) | gửi / rút / nhận / không nhận đề nghị `STOP` và `ONBOARD`; route chốt thêm "đang lái chuyến nguồn / đích", **áp cả Toàn quyền** | đã duyệt 30/9; Đ3 (8d-1) thêm lớp CSDL `_nguoi_nhan` |
| `trip.override` `:189` | none, none, any, none, none, any, none, none, none, none | không | duyệt / bác đề nghị leo thang mọi loại (STOP, ONBOARD); thêm hệ quả: duyệt có `CAM_KET_DICH` không đạt thì ghi khoá cam kết chuyến đích | nghĩa duyệt / bác: đã duyệt (`:85`); khoá cam kết: 8d-1 (Đ2); chặng đặt gấp: 8d-2 (Đ6) |
| `trip.urgent_adjust` `:193` (ADR-0104 Đ1) | any, none, any, none, none, any, none, none, none, none | không | **không áp** cho đề nghị chuyển khách (ADR-0104 `:230`); bài `lop-vuot.test.ts` NT-3(b) nới đúng hai dòng `trip.override` của route duyệt / bác (N2) | N2 duyệt cùng ADR-0111 |
| `trip.progress` `:197` | any, none, any, none, none, any, none, assigned, none, none | không | văn phòng (Bán hàng, Quản trị, Toàn quyền) gửi thay đề nghị **chỉ `ONBOARD`** (`ADR-0052:130`); Kế toán không | đã duyệt; xe đích phải đang chạy: 8d-2 (Đ4) |
| `trip.view` `:187` | any, any, any, none, none, any, none, assigned, none, none | không | xem danh sách đề nghị chỉ-đọc trong Chi tiết chuyến (kể cả Kế toán) — gồm chữ nơi gặp đã che, bảng kiểm `kiem[]` | đã duyệt (`ADR-0052:219`); G-A5-18 |
| `trip.dispatch` `:188` | any, none, any, none, none, any, none, none, none, none | không | **không** dùng cho chuyển khách; giữ cho route xem cứu hộ hiện có (`GET …/chuyen/:id/cuu-ho`) và khối "Việc của văn phòng" | — |
| `settings.ops` `:150` | none, none, none, none, none, any, none, none, none, none | không | hai cột chính sách (`accept_wait_minutes`, `auto_confirm_transfer`) | cột: đã duyệt (`:86`); nghĩa công tắc: 8d-1 (Đ3) |
| `admin.manage` `:134` | none, none, any, none, none, any, none, none, none, none | không | sửa nhãn lý do nhóm `TU_CHOI_NHAN` | — |

- Không thêm mã quyền ⇒ `EXTERNAL_PERMISSIONS` (`permissions.ts:30`) và trigger LC-1 không đổi (`ADR-0053:50`).
- `DRIVER_PARTNER` của `trip.transfer` thành `assigned` khi A4 gộp (`ADR-0053:46`, N4) — không thuộc lượt 8d.
- **Tài khoản nhiều quyền** (ví dụ vừa `DRIVER` vừa `ADMIN`): có thể gửi đề nghị rồi tự duyệt đề nghị leo thang của chính mình. Không có chữ nào cấm; ghi để người kiểm xét (tệp 01, "Điểm cho người kiểm" (2)).

---

## 4. Cổng nào canh cửa nào

### 4.1 Máy chủ và CSDL

Route mới chưa có trong mã; tên theo `ADR-0052:218-219` và kế hoạch A5 §5.3.

| Cửa | Lớp | Ô `can()` | Gác thêm ở route | Cổng lô | Trigger CSDL | Lượt |
|---|---|---|---|---|---|---|
| `GET …/cuoc-cua-toi/:id/xe-nhan` (mới) | `staff` | `trip.transfer`, `{ assigned }`, trước mọi truy vấn | đang lái chuyến nguồn, không thì 404 (kể cả Toàn quyền); `ONBOARD` chỉ liệt kê chuyến `RUNNING` | — | — | ô: đã duyệt; lọc `ONBOARD`: 8d-2 (Đ4) |
| `POST …/cuoc-cua-toi/:id/de-nghi` (mới) | `staff` | `trip.transfer` | đang lái chuyến nguồn (**chỉ máy chủ** — van-chuyen không có cạnh tới `staff`, `src/architecture.test.ts:63`) | cổng nguồn, cổng đích | `_lc14` (vế `ONBOARD → RUNNING`: Đ4) | đã duyệt; Đ4 8d-2 |
| `POST …/de-nghi/:rid/rut` (mới) | `staff` | `trip.transfer` | là tài xế nguồn; chỉ `PENDING` (`ESCALATED` → 409) | cổng nguồn | `_status_forward` | đã duyệt |
| `POST …/de-nghi/:rid/nhan`, `/khong-nhan` (mới) | `staff` | `trip.transfer` | là tài xế đích đang mở, không thì 404 | cổng nguồn + đích; hết hạn lười | `_nguoi_nhan` (Đ3), `_confirm_may` (đọc công tắc hiện hành — Đ3), `_escalate_has_evidence`, LC-15 nhánh `TRANSFER_CONFIRMED`, LC-01/02/04/09/10, khoá ngoại + tầng danh mục (Đ1) | 8d-1 |
| `GET …/de-nghi-gui-toi` (mới) | `staff` | `trip.transfer` | là tài xế đích | — | — | đã duyệt |
| `POST …/chuyen/:id/cuu-ho` (mới) | `office` | `trip.progress` | chỉ `ONBOARD` (gửi `STOP` → 403, `ADR-0052:248`); chuyến nguồn `RUNNING` | như gửi | `_lc14` | đã duyệt; Đ4 8d-2 |
| `GET …/chuyen/:id/cuu-ho` (**có sẵn**, `src/modules/van-chuyen/index.ts:1268`) | `office` | `trip.dispatch` | chỉ chuyến **đã Kết thúc gián đoạn** (409 `chua_gian_doan`); danh sách chặng cần xếp lại + xe cùng ngày (đường lượt 1) | — | — | không đổi |
| `GET …/chuyen/:id/cuu-ho/xe-nhan` (mới) | `office` | `trip.progress` | chuyến nguồn `RUNNING`; chỉ xe đích `RUNNING` (Đ4) | — | — | 8d-2 |
| `GET …/de-nghi?ngay=` (mới) | `office` | `trip.view` | — | — | — | đã duyệt |
| `POST …/de-nghi/:rid/duyet`, `/bac` (mới) | `office` | `trip.override` (hai dòng nới N2) | `ESCALATED`; duyệt chạy lại kiểm, có `LOI` → 409 `luat_loi_khong_duyet`; lý do bắt buộc (`PHA_LE` khi duyệt, `TU_CHOI_NHAN` khi bác) | cổng nguồn + đích | `_confirm_core` (không có `KHONG_DAT` + `LOI` — tệp 01 "Điểm cho người kiểm" (1)), LC-15; khoá cam kết (Đ2) | 8d-1 (Đ2); 8d-2 (Đ6) |
| Lệnh tiến độ có sẵn: Đã tới, Bỏ qua điểm, Kết thúc, Kết thúc gián đoạn, Báo huỷ điểm, Huỷ chuyến, Điều chỉnh (`CORRECTION`), Thu hồi xuất bến | như hôm nay | như hôm nay | — | thêm câu tự huỷ đề nghị liên quan (MQ-09) | `revoke_no_progress` dựng lại (Đ5) | MQ-09: đã duyệt; Đ5: 8d-2 |
| Chính sách điều phối | `office` | `settings.ops` | `kiemChinhSachMoi` | — | `CHECK` cột | đã duyệt |

**Đường tin** (`src/shared/tin-chuyen.ts`): tin chuyển khách đi đường riêng; đường điều chỉnh khẩn cấp hiện có chỉ nhận sự kiện mang `MOC_TOI_THIEU` (`canHoiTheoSuKien` `:40`, `tinNguonCho` `:113`). Người nhận: tệp 01, Đ3 (d). `thongbao` không import `van-chuyen` (`src/architecture.test.ts`). Lượt 8d-1 (`declined`), còn lại đã duyệt.

### 4.2 Giao diện — chỗ ẩn / hiện theo quyền bị đổi nghĩa

| Chỗ (hôm nay) | Điều kiện hiện hôm nay | Sau ADR-0111 | Lượt |
|---|---|---|---|
| Khối "Việc của văn phòng" trên chuyến đang chạy, `web/chuyen.ts:706-721` | ô `trip.dispatch`; nút **"Cứu hộ"** (`:712`) hiện thêm khi có `trip.progress`, mở hộp **Kết thúc gián đoạn** bấm thay | thêm nút gửi đề nghị cứu hộ (`trip.progress`). **Đổi nghĩa:** chữ "Cứu hộ" hôm nay là "kết thúc gián đoạn"; nút mới phải mang chữ khác ("Chuyển khách sang xe cứu hộ"), và cần xét có giữ chữ "Cứu hộ" cho nút cũ không. Mọi người có `trip.progress` văn phòng (Bán hàng, Quản trị, Toàn quyền) cũng có `trip.dispatch`, nên điều kiện khối không đổi người thấy | đã duyệt (D5c); chỉ xe đang chạy: 8d-2 |
| Khối "Cứu hộ" trên chuyến đã Kết thúc gián đoạn, `web/chuyen.ts:727` | ô `trip.dispatch` (`GET …/cuu-ho`) | không đổi (đường lượt 1) | — |
| Trang Chi tiết chuyến, `web/chuyen.ts:1150` | ô `trip.view` | thêm danh sách đề nghị chỉ-đọc: Bán hàng, Kế toán, Quản trị, Toàn quyền thấy chữ nơi gặp (đã che) và bảng kiểm; **không** nút Duyệt / Bác cho Bán hàng, Kế toán | đã duyệt (G-A5-18) |
| Menu "Điều phối xe" / "Xe đang chạy", `web/shell.ts:28`, `:32`, `:250` | ô `trip.view` | thêm mục **"Đề nghị cần duyệt"** + huy hiệu số: **chỉ** `trip.override` (Quản trị, Toàn quyền) | đã duyệt (G-A5-18); nút Duyệt tắt khi có `LOI`: đã duyệt (`:80`) |
| Màn tài xế "Cuốc của tôi", câu dưới nút Kết thúc gián đoạn `web/cuoc-chuyen.ts:379` | luôn hiện: *"Xe hỏng? Bấm Kết thúc gián đoạn — văn phòng nhận tin ngay và xếp xe cứu hộ"* | **đổi nghĩa**: nay tài xế có đường riêng "Chuyển khách sang xe khác" (khi có xe đang chạy nhận được); câu phải nói cả hai đường (kế hoạch T15) | đã duyệt; Đ4 8d-2 |
| Màn tài xế: nút "Nhờ xe khác đón" ở điểm chưa tới, ngăn "Đề nghị gửi tới" (mới, `web/cuoc-chuyen.ts`) | — | hiện khi `can(staff, "trip.transfer", { assigned: true })` | đã duyệt |
| Tài xế đối tác (`DRIVER_PARTNER`) | — | trước A4: không thấy nút nào (ô `none`; gọi route → 403); sau A4: như tài xế công ty trên chuyến mình lái (N4) | ngoài 8d |

---

## 5. Hàng rào nới trong lượt (chi tiết ở tệp 01)

| Mã | Nới | Căn cứ | Lượt |
|---|---|---|---|
| N1 | ghim hàng DRIVER thêm `trip.transfer: assigned` | `ADR-0052:190` (đã duyệt 30/9) | đã duyệt |
| N2 | `lop-vuot.test.ts:45` NT-3(b): ngoại lệ đúng hai dòng `"trip.override"` của route duyệt / bác | ADR-0104 `:101`, `:244`; duyệt ADR-0111 là duyệt nới | 8d-1 (đi cùng văn bản; không hộp riêng) |
| N3 | R-VC-16 (`scripts/audit-checks.mjs:670`, mức cảnh báo) bỏ qua suất `BOARDED` ở nơi gặp | `ADR-0052:72`, `:129`; duyệt ADR-0111 là duyệt nới | 8d-1 (đi cùng văn bản; không hộp riêng) |

---

## 6. Chưa kiểm

- Chữ cuối của nút mới và nút "Cứu hộ" cũ trên màn văn phòng (chờ ảnh thật).
- Cứu hộ có người đi kèm (`CREW`) — mục 2, đoạn "Ghép ra một chỗ chưa có chữ".
- Route mới chưa có; cột "Lượt" của các route tính theo quyết định nó phụ thuộc, chưa thử bằng máy.
- Trang này chưa có người kiểm độc lập.
