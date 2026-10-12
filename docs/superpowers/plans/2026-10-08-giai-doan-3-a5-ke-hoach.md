# Kế hoạch A5 (bản sửa ngày 8/10): chuyển khách giữa hai xe, cứu hộ có nơi gặp, hộp duyệt đề nghị leo thang, danh mục điều kiện chuyển

- **Gốc:** ADR-0052 D4 và D5c; đánh giá ERP mục C51 phần 2 và C52; BACKLOG BL-VC-D4 (`docs/BACKLOG.md:200`).
- **Vì sao làm bây giờ:**
  - Ngày 2/10 chủ hoãn D4 tới khi có khoảng ≥ 15 xe đối tác, hoặc văn phòng xếp hơn khoảng 40 chuyến/ngày (`docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md:169-170`).
  - Chủ tự mở lại D4 ngày 8/10, bỏ qua mốc đó: "Mở lại 8/10 (nhiệm vụ … Giai đoạn 3 mục A5)", `docs/BACKLOG.md:200`.
- **Nơi đo:** nhánh `claude/van-chuyen-goi-a-c`. Bản đầu đo ở `bfc3ed6c`. Nay nhánh ở `9f8f1656`; từ `bfc3ed6c` tới đó chỉ thêm tài liệu (kế hoạch A4/A5, phiếu phản biện, bản chép ADR-0109/0110 lượt 8c), không đổi mã.
- **Đ1 (ADR-0104):** nhánh `adr-0104-d1`, đang ở `45731dea`. Bản đầu ghi `b3e66350`, nay đã cũ.
- **Thứ tự thi công (điều phối đã chốt):**
  1. Đ1 (ADR-0104 Đ1, nhánh `adr-0104-d1` @ `45731dea`, sắp gộp).
  2. Đ2 (đồng bộ chuyến, giữ migration 0089).
  3. ADR-0105 (nút Chỉ đường, giữ 0090) và ADR-0109 (phải thu không âm, không có migration).
  4. G17.
  5. A4 / A5.
- **Số dòng:** mọi số dòng đo trên `9f8f1656`, trừ những chỗ ghi `@adr-0104-d1`. Tệp `src/modules/van-chuyen/index.ts`, `dieu-phoi.ts`, `tin-chuyen.ts` sẽ lệch dòng sau khi Đ1, Đ2 gộp, nên phải đo lại ở T0.
- **Người thi công:** trợ lý AI. Kế hoạch này chỉ đọc mã, không sửa tệp.

---

## Sửa theo phiếu phản biện 2026-10-08

Phiếu: `docs/superpowers/plans/2026-10-08-giai-doan-3-a5-phan-bien.md`. Phiếu có 34 mục, đánh số theo thứ tự trong phiếu:
- **TĐ** — tiền đề sai, 7 mục.
- **LA** — lệch ADR, 8 mục.
- **CH** — câu hỏi cho chủ, 8 mục.
- **TH** — thiếu, 11 mục.

Tôi tự mở lại từng tệp:dòng mà phiếu dẫn. Mục nào phiếu đúng thì đã sửa trong kế hoạch.

| Mục | Phiếu nói | Đã kiểm | Sửa ở đâu |
|---|---|---|---|
| TĐ-1 | Lô xác nhận mở suất ở B trước khi thêm điểm, nên vỡ khoá ngoại và `stop_scope`; `stop_ins` (0076) phải thêm loại sự kiện | Đúng. `dieu-phoi.ts:294-318` (`loDoi` chèn điểm trước); `0042:311-314`; `0076:82-86` | T6, thứ tự lô viết lại theo `loDoi`, có thêm bước sắp lại thứ tự điểm. T2 nêu tên `stop_ins`. NT-A5-28. Chữ ADR-0052 :70 sửa ở ADR mới (mục "Sửa chữ") |
| TĐ-2 | Đường tin CAO-2 chỉ nhận `ALLOCATION_MOVED` kèm `MOC_TOI_THIEU`, nên không dùng lại được | Đúng. `chuyen-repo.ts:821-838@adr-0104-d1`. Còn hai chỗ nữa chặn: `canHoiTheoSuKien` và `tinNguonCho` (`tin-chuyen.ts:40, :113-121@adr-0104-d1`) | G-A5-11; T10 dựng đường tin chuyển khách riêng; NT-A5-17 |
| TĐ-3 | Thêm ô `trip.transfer` riêng (T4) trước route (T7) làm hàng rào 1 đỏ | Đúng. `permission-enforcement.test.ts:71-79`; `permissions.ts` chưa có ô này | T4 gộp với T7a thành một commit; liệt kê mọi bài ghim kéo theo |
| TĐ-4 | G-A5-6 làm ngược lời chủ P4 | Đúng. Lộ trình `:151`, `:192`; Đợt 5 `:525` | G-A5-6 viết lại theo P4; bỏ chỉ mục duy nhất; lô xác nhận có bước tự huỷ; NT-A5-4, NT-A5-5, NT-A5-20 |
| TĐ-5 | G-A5-21 đếm mọi sự kiện liên quan nên rộng quá | Đúng. `0085:63-67` | G-A5-21 thu hẹp còn `TRANSFER_CONFIRMED`; thêm vế loại các `TRANSFER_*` chưa xác nhận trên chính chuyến đích; NT-A5-19 |
| TĐ-6 | Phương án 2 và 3 của Hộp 1 không hợp lệ | Đúng. ADR-0056 `:59`, `:68`; `0042:465-469`; BACKLOG `:200` | Bỏ Hộp 1 ba phương án, thay bằng dạng duyệt / chưa duyệt (mục 1b) |
| TĐ-7 | Công tắc tự đồng ý đọc theo `policy_id` lúc gửi, nên tắt công tắc không có tác dụng | Đúng. `0041:14-36` (bảng chỉ-thêm); ADR-0052 :62, :66, :78 | T2 `_confirm_may` đọc chính sách hiện hành lúc quyết (khuôn `0084:36-38`); dòng kiểm ghi `policy_row_id`; Đ3 của ADR mới; NT-A5-24 |
| LA-1 [CAO] | Chỉ mục duy nhất trái P4 | Như TĐ-4 | Như TĐ-4. Bỏ luôn luật tự đặt "có ONBOARD đang chờ thì không gửi STOP" |
| LA-2 [CAO] | Mở suất bằng `INSERT…SELECT` nhiều dòng trái §10 | Đúng. CLAUDE.md:128; `0042:316`; `chuyen-repo.ts:443-446` | Giữ luật **mỗi suất một câu INSERT** (G-A5-24). Không tạo nới N6. Bỏ NT-A5-26 "lô kích thước hằng", thay bằng NT-A5-26 "đếm câu và đo trần" |
| LA-3 | ADR-0052 :77 và :192 nói khác nhau về chặng đặt gấp | Đúng. Thêm ADR-0049 `:162` ("Xếp chính chặng đã đặt gấp thì qua") và ADR-0104 `:233` | Thành câu hỏi thật Đ6, lượt 8d-2, hộp "Đặt gấp" |
| LA-4 | G-A5-7 siết LC-14 mà không hỏi | Đúng. ADR-0052 :69, :192 | Thành Đ4, lượt 8d-2, hộp "Chỗ siết" |
| LA-5 | G-A5-21 đổi nghĩa "tiến độ" mà không đánh dấu | Đúng. ADR-0097, `0085:63` | Thành Đ5, lượt 8d-2, hộp "Chỗ siết" (đã thu hẹp theo TĐ-5) |
| LA-6 | G-A5-4 đi ngược khuyến nghị Q5 | Đúng. `danh-gia/dot-5.md:120-123` | Giữ `TU_CHOI_NHAN`, ghi rõ "khác khuyến nghị Q5" ở G-A5-4 |
| LA-7 | Tách `transfer_id` cần là quyết định có tên; `closed_transfer_id` đặt một lần nên không vào danh sách bất biến | Đúng. `0085:35-41` (có `opened_cmd_id`, không có `closed_cmd_id`) | Đ3; T2 có trigger riêng cho `closed_transfer_id` |
| LA-8 | Danh mục luật là lời chủ, chỉ cần duyệt văn bản | Đúng. Lộ trình `:169` | Đ1, hộp "Điều kiện" dạng duyệt / chưa duyệt |
| CH-1 [SỬA CHỮ] | Hộp 1 chỉ còn một việc là duyệt văn bản | Đúng | Hộp "Điều kiện" (Đ1 và Đ2) và hộp "Dấu vết" (Đ3). Chữ viết lại: xưng "bạn", tiêu đề ≤ 12 ký tự, chia lượt theo §9 |
| CH-2 [GIỮ] | Mười tình huống mẫu | Đúng. ADR-0052 :233, :274 | Hộp "Tình huống" ở lượt 8d-1, dán đủ 10 tình huống. Xem ghi chú về phán quyết (7) bên dưới |
| CH-3 [GIỮ] | Chặng đặt gấp chuyển sang xe chưa chạy dưới 6 giờ | Đúng | Hộp "Đặt gấp" (Đ6), dùng chữ sửa của phiếu |
| CH-4 [BỎ] | G-A5-1 | Đúng. ADR-0104 :101, :230, :244 | Không hỏi; G-A5-1 giữ |
| CH-5 [BỎ] | G-A5-20 | Đúng. ADR-0053 :46; lời chủ 5/10 (c) | Không hỏi; ghi sổ |
| CH-6 [BỎ] | G-A5-6 | Đúng | Không hỏi; theo P4 |
| CH-7 [BỎ] | Các mục bề mặt | Đúng, trừ G-A5-23 | Không hỏi riêng. Riêng G-A5-23 đưa vào văn bản Đ3: ADR-0052 :210 ghi danh sách việc sinh tin là cửa một chiều. Ghi chi tiết ở dòng "Không theo phiếu" |
| CH-8 [GIỮ] | Trần ba quyết định mỗi lượt | Đúng | Mục 1b "Lượt duyệt 8d đề xuất": hai lượt, mỗi lượt 3 quyết định |
| TH-1 | Phân định chính sách lúc gửi / lúc nhận | Đúng | Như TĐ-7 |
| TH-2 | Luật đơn huỷ là bắt buộc kỹ thuật | Đúng. `0042:465-469` | Đ2 ghi rõ; thêm NT-A5-29 (ca đỏ trước: bỏ luật thì lô vỡ bằng lỗi CSDL) |
| TH-3 | Lô cứu hộ: điểm còn lại của A; nơi gặp ở B mang suất `BOARDED` | Đúng | G-A5-8; T2 thêm ca đỏ chèn thẳng suất `BOARDED`; NT-A5-14 |
| TH-4 | Số dòng ADR ở mục 0.3 sai | Đúng. ADR-0052 :71 là "không chụp lại mốc", :73-76 là MQ-02/03 | Mục 0.3 sửa |
| TH-5 | Thiếu mốc bật lại D4 | Đúng | Phần "Vì sao làm bây giờ" ở đầu tệp |
| TH-6 | Trang ghép: đếm lại; thiếu cột giao diện cho tài xế đối tác, Kế toán, Bán hàng | Đúng. `permissions.ts:187` (Kế toán có `trip.view`) | Mục 5.3 và 5.4 |
| TH-7 | Khung ADR thiếu dòng "xây trên lỗ đang hở" | Đúng. `docs/quyen-hoan.json` có 6 lỗ HIGH | T1 khung ADR; mục 0.5 |
| TH-8 | Hướng dẫn: ai cắt chữ gì | Đúng. BACKLOG `:210` | T15 |
| TH-9 | T4 chạy lại `route-write-guard` | Đúng | T4 + T7a |
| TH-10 | Số migration, số ADR | Đúng. Quét `git for-each-ref` + `git ls-tree` ngày 8/10: chỉ có `0087`, `0088` (nhánh QR); mục lục ghi "kế tiếp 0109" | Mục 0.6; T0 |
| TH-11 | Thiếu lớp CSDL cho "văn phòng không bấm Nhận thay" | Đúng | T2 `_nguoi_nhan` cùng cột `decided_by_party_id`; NT-A5-15. Riêng việc "tài khoản gửi STOP đúng là tài xế A": van-chuyen không có cạnh tới staff (`architecture.test.ts:63`), nên chỉ máy chủ kiểm, ghi "dựa vào máy chủ" |

**Không theo phiếu: CH-7 phần G-A5-23.** Phiếu xếp G-A5-23 vào bề mặt. Kế hoạch vẫn đưa nó vào văn bản duyệt (Đ3), nhưng không hỏi riêng. Lý do: ADR-0052 :210 ghi "danh sách hành động nhật ký và trường `detail` của D6 (chốt trước dòng đầu)" là **một chiều**, và D6.1 :148 chỉ liệt kê "gửi / xác nhận / leo thang / bác / hết hạn". Thêm `trip_transfer_declined` là mở danh sách một chiều. Đọc chặt ở cửa một chiều, việc này cần văn bản duyệt, giống cách ADR-0104 :232 đã làm.

**Ghi chú về phán quyết điều phối (7).** Không làm theo nguyên văn được. Tệp `golden/dieu-phoi/xe-a-b-luot-1.json` có 24 bước của lượt 1 (B01–B23 và B10B: tạo chuyến, xếp, xuất bến, mốc 6 giờ, vắng, gián đoạn, cứu hộ bằng chuyến mới), **không bước nào là chuyển khách giữa hai xe**. Vì vậy 10 tình huống trong hộp "Tình huống" là các ca chuyển khách:
- dựng trên nền dữ liệu của tệp đó (xe A 15 chỗ, xe B 29 chỗ, Mường Thanh, nhà xe Minh Phát);
- dùng ví dụ của chủ ở thiết kế §5.5 (`docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:766-790`: Mường Thanh / Alibu, 25/29 chỗ, 16/15 chỗ);
- sẽ nằm ở tệp mới `golden/dieu-phoi/xe-a-b-luot-2-chuyen-khach.json`.

Bộ 24 bước lượt 1 vẫn ở trạng thái `cho_xac_nhan`. Nếu điều phối muốn hỏi gộp, thêm một câu xác nhận riêng (không chạm dữ liệu, không tính trần).

**Áp các phán quyết riêng của A5:**
- (1) G-A5-6 theo P4 (lộ trình `:151`, `:192`; Đợt 5 `:525`).
- (2) Đường tin dựng theo ADR-0052 D6.2. Phán quyết trích :156, :159. Trên tệp ở nhánh này, :156 là dòng "xếp / gỡ tài xế"; các dòng chạm chuyển khách là :158 (gửi tới → tài xế đích), :159 (xác nhận / bác / hết hạn → tài xế nguồn và đích), :160 (leo thang → `trip.override`), và :166 (dòng lái mở lúc sự kiện). Kế hoạch dùng :158-:160 và :166.
- (3) Thứ tự lô theo `loDoi` (T6).
- (4) Giữ luật mỗi suất một câu INSERT (G-A5-24).
- (5) Công tắc đọc theo chính sách hiện hành lúc nhận (NT-A5-24).
- (6) Hộp "Đặt gấp".
- (7) Hộp "Tình huống", xem ghi chú ngay trên.
- (8) Mục 1b.

---

## 0. Phạm vi

### 0.1 Trong phạm vi
1. **Nhờ xe khác đón một điểm** (C51 phần 2, ADR-0052 D4, phạm vi `STOP`).
   - Tài xế A đang chạy gửi đề nghị cho một điểm chưa tới; mọi suất của điểm đó phải đang chờ.
   - Xe B nhận được nếu chuyến B `PLANNED` hoặc `RUNNING`, cùng ngày chạy, tài xế khác A.
   - Một điểm được gửi cho nhiều xe cùng lúc (P4).
   - Tài xế B bấm Nhận hoặc Không nhận. Nền tảng kiểm điều kiện rồi tự xác nhận, hoặc đẩy lên văn phòng.
2. **Cứu hộ có nơi gặp** (C52, ADR-0052 D5c, phạm vi `ONBOARD`).
   - Văn phòng được bấm thay việc gửi qua ô `trip.progress`, chỉ cho phạm vi `ONBOARD`.
   - Xe nhận phải là xe đang chạy, nếu lượt 8d-2 duyệt Đ4.
3. **Danh mục điều kiện chuyển** thay `CHECK` cứng (lời chủ 2/10, lộ trình `:169`; BACKLOG `:200`).
4. **Hộp "Đề nghị cần duyệt"** cho người giữ `trip.override`.
5. **Tin báo theo ADR-0052 D6.2**, đi bằng đường tin chuyển khách riêng. Thêm hai cột chính sách. Gieo nhóm lý do `TU_CHOI_NHAN`.

### 0.2 Ngoài phạm vi
- **C51 phần 1** (suất `NO_SHOW` vẫn tính chỗ): việc B7, cần ADR riêng.
- **V4** "Dòng dữ liệu / Nhật ký quyết định": làm bằng kế hoạch riêng, kèm câu hỏi quyền Q6b.
- **Tạo chuyến cứu hộ mới, giá xe cứu hộ của nhà xe** (ADR-0052 :134, ADR-0057 T2): đường lượt 1 giữ nguyên.
- **Không làm:** chia người lớn / trẻ em, số thứ tự đề nghị, km, cron hết hạn (hết hạn tính lười theo MQ-08).
- **C24, C25:** thuộc A4. Ô `trip.transfer` của `DRIVER_PARTNER` xem G-A5-20.

### 0.3 Câu ADR đang hiệu lực (ADR:dòng, đã đối chiếu lại theo TH-4)

**ADR-0052**

| Dòng | Nội dung |
|---|---|
| :55-66 | D4.1: hai bảng mới, cột `vc_trip_allocation.transfer_id`, hai cột chính sách |
| :61 | Đồ thị trạng thái; không có cạnh `ESCALATED → EXPIRED`; đề nghị thành `VOID` khi nguồn hoặc đích đổi |
| :62 | `policy_id` là "dòng đã dùng"; ba cột lý do |
| :64 | `vc_transfer_check`, gồm cả `policy_row_id`; `rule_code CHECK IN (9 mã)` (bị ADR mới thay) |
| :65 | Một cột `transfer_id` (bị ADR mới tách làm hai) |
| :66 | Công tắc an toàn: tắt thì mọi đề nghị B đã nhận thành `ESCALATED` |
| :69 | LC-14 |
| :70 | Liệt kê việc trong lô xác nhận. Thứ tự chữ không chạy được, xem TĐ-1 và mục "Sửa chữ" của ADR mới |
| :71 | Suất mở ở B không chụp lại mốc giờ hẹn |
| :72 | Suất mở ở B giữ trạng thái (`BOARDED` giữ `BOARDED` khi `ONBOARD`) |
| :73-76 | MQ-02/03: tự xác nhận; xe nguồn chỉ bớt người; cảnh báo chuyến kế của B; tự thử lại một lần |
| :77 | Mốc 6 giờ khi chuyển (phần phá lệ bị ADR-0104 :230 thay) |
| :78 | MQ-08: hạn chờ tính từ `policy_id` chụp lúc gửi |
| :79 | MQ-09: tự huỷ trong cùng lô |
| :80-81 | Duyệt thay khi mọi dòng `KHONG_DAT` thuộc tầng `CAU_HINH`, lý do nhóm `PHA_LE`; Bác cũng dùng `trip.override` |
| :84-86 | D4.3 quyền |
| :89-91 | D4.4 danh sách xe nhận và đề nghị gửi tới |
| :128-135 | D5c. :130: văn phòng không gửi `STOP`, không bấm Nhận thay. :132: LC-16 ở Kết thúc gián đoạn |
| :146-149 | D6.1; danh sách hành động sinh tin là một chiều |
| :151-169 | D6.2 người nhận (:158, :159, :160, :166) |
| :190 | Nới bài ghim hàng `DRIVER` thêm `trip.transfer` (chủ đã duyệt) |
| :192 | Câu thay dòng Xếp của ADR-0049 (bị ADR-0104 :233 thay) |
| :210-211 | Cửa một chiều / hai chiều |
| :215-231 | Migration, route, bất biến, hàng rào |
| :233, :274 | Chủ xác nhận bộ ca mẫu A/B trước khi nghiệm thu |
| :243 | Mở suất trước khi đóng cùng người thì vướng UNIQUE LC-01 |
| :248 | Văn phòng bấm Nhận thay thì 403 |

**ADR khác**
- **ADR-0049** `:162`: dòng Xếp, "Xếp chính chặng đã đặt gấp thì qua".
- **ADR-0104** :101, :230, :232, :233, :244; :74 (nhãn nhóm `PHA_LE`); :154 (trần 74 câu chỉ cho phần chuyến của lô Đ2, không phải luật chung).
- **ADR-0053** :46, :50.
- **ADR-0056** `:56-68` (A2: kích hoạt khi "xếp / dời đến"; :68 "mọi lệnh xếp / dời đến / đổi xe").
- **ADR-0051** :149.
- **ADR-0096** Đ1 (LC-19 đón trước trả; `0084:23-30`).
- **ADR-0110** (đã duyệt 8/10, chờ chép vào mục lục): chỉ từ chối lệnh tạo chỗ đảo mới.

### 0.4 Câu đã bị ADR sau thay

| Câu cũ | Thay bởi |
|---|---|
| ADR-0052 :64, :210 (`rule_code CHECK`) | ADR mới, Đ1 |
| ADR-0052 :65 (một cột `transfer_id`) | ADR mới, Đ3 |
| ADR-0052 :77, phần "phá lệ như ADR-0049 D2" | ADR-0104 :230 |
| ADR-0052 :84 (`DRIVER_PARTNER = none`) | ADR-0053 :46 |
| ADR-0052 :192 | ADR-0104 :233 (chặng đặt gấp: Đ6) |
| ADR-0052 :148 | ADR-0104 :232 thêm việc; ADR mới, Đ3 thêm `trip_transfer_*` |
| ADR-0052 :80, chữ "nhóm `PHA_LE`" | Mã giữ; nhãn theo ADR-0104 :74 |
| ADR-0053 D7.2, D7.3 | ADR-0105 |

### 0.5 Hiện trạng đo được
- `close_reason` đã có `TRANSFERRED` (`0042:133`). Điểm đã có `MOVED` (`0042:97`, cạnh `PENDING → MOVED` ở `0042:448`).
- `LENH_DONG_SUAT` (`src/shared/dieu-phoi-kieu.ts:127`) chưa có lệnh `TRANSFERRED`.
- `NHOM_LY_DO` có `TU_CHOI_NHAN`, chưa gieo dòng nào; `NHOM_LY_DO_HIEN` (`chinh-sach-hien-thi.ts:209`) chưa có nhóm này.
- `GET /chuyen/:id/cuu-ho` (`index.ts:1264`) hỏi `trip.dispatch`.
- Trigger LC-15, bản mới nhất:
  - `alloc_ins`, `alloc_close`, `identity`, các trigger cân: ở 0085;
  - `stop_ins`: ở 0076 (`0076:82-86`, danh sách loại sự kiện `STOP_ADDED_RUNNING`, `ALLOCATION_STOP_CHANGED`);
  - `revoke_no_progress`: ở `0085:63-67`.
- Trigger INSERT trên suất: `stop_scope` (`0042:311`), `capacity_ins` (`:319`), `trip_final_ins` (`:427`), `leg_open` (lc09, `:465`), `person_order_ins` (`:470`), `needs_appt` (`0043:79`; chặng đã có mốc nên không vướng), `running_locked_alloc_ins` (0085).
- Bài gác:
  - `thu-tu-lo.test.ts:21` chỉ quét `dieu-phoi.ts`;
  - `hanh-khach-khong-lo-ten.test.ts:172`, `:174` (`TRA_TEN` = 2);
  - `lop-vuot.test.ts` NT-3(b) chỉ quét `src/modules/van-chuyen/` (`@adr-0104-d1`), không quét `src/shared/`.
- Bài ghim quyền phải sửa khi thêm ô:
  - `src/shared/permissions.test.ts` (bảng ADR `:6-87`, hàng DRIVER `:321-349`, hàng DRIVER_PARTNER `:356-380`, hàng HR `:388-407`);
  - `src/modules/orders/xem-don-theo-quyen.test.ts:295` (hàng Đối tác);
  - `src/shared/tro-ly-cau-truc.test.ts:38-39` (mọi ô có tên ở `tro-ly-cau-truc-ten.ts`);
  - `src/route-access.test.ts:440` (đếm route);
  - `src/tai-xe-cong.test.ts`.
- Trần chữ hướng dẫn: Bán hàng 4497/4500, Quản trị 4496/4500 (BL-VC-TRO-GIUP, `BACKLOG:210`).
- `golden/dieu-phoi/xe-a-b-luot-1.json` còn `cho_xac_nhan`.
- Lỗ đang hở (`docs/quyen-hoan.json` mục `phat_hien`): TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-4.2 (hạn 31/10); HC-5.11 (hạn 15/11). A5 **không xây trên lỗ nào**:
  - không đụng tiền (TNV-G*, HC-4.2);
  - không thêm cron; hết hạn đề nghị chạy lười trong lô lệnh của người (HC-5.11);
  - HC-5.19 (chưa diễn tập khôi phục) áp chung cho mọi lần phát hành có migration, không riêng A5. Ghi để người duyệt thấy.

### 0.6 Số migration, số ADR (TH-10)
- **Quét 8/10** (`git for-each-ref` trên refs/heads và refs/remotes + `git ls-tree --name-only <ref> migrations/`):
  - số lớn nhất trên mọi nhánh là `0088` (`claude/ticket-sales-qr-payment-cf8e18`: `0087`, `0088`);
  - `0089` (Đ2) và `0090` (ADR-0105) đã dành trong kế hoạch của hai việc đó, chưa có tệp.
- **Migration A5: số tạm 0092** (giả định A4 gộp trước lấy 0091; A5 gộp trước thì lấy 0091). Chốt khi gộp bằng chính lệnh quét trên. A4 và A5 lấy số sau 0090.
- **Số ADR:** mục lục (`docs/adr/README.md:116`) ghi kế tiếp 0109. ADR-0109 và ADR-0110 (lượt 8c) đã được chủ duyệt 8/10, chờ chép vào mục lục. **Số tạm 0111**, điều phối chốt khi chép.

---

## 1. Điểm chưa trả lời

### 1a. Việc mặt ngoài, đảo được: tự áp, ghi sổ dưới mã G-A5-x

- **G-A5-1. Ô duyệt và bác** chỉ là `trip.override` (ADR-0104 :101, :230, :244); `trip.urgent_adjust` không áp. Bài kiểm ở T8. THẤP-15 của Đ1 chưa đọc nội dung (phiếu kiểm nằm ở nhánh `adr-0104-d1`), đọc ở T0.
- **G-A5-2. Cách tính mốc 6 giờ.**
  - Dùng `gioXetMocXep` (`src/shared/moc-toi-thieu.ts` của Đ1).
  - Xe đích `RUNNING` thì ghi `DAT` (ADR-0052 :77).
  - Xe đích `PLANNED` trong mốc, chặng **không** đặt gấp: `MOC_TOI_THIEU = KHONG_DAT`, tầng `CAU_HINH`.
  - Chặng đặt gấp: chờ chủ trả lời Đ6 (lượt 8d-2). Trước khi có câu trả lời, `kiemChuyen` nhận cờ "đặt gấp có miễn không" làm tham số, không mã cứng.
- **G-A5-3. Không bật nhãn vượt luật trên lịch.** Sự kiện chuyển khách không mang `override_rule_code`.
- **G-A5-4. Lý do Bác dùng nhóm `TU_CHOI_NHAN`.** **Khác khuyến nghị Q5** của đánh giá Đợt 5 (`danh-gia/dot-5.md:120-123`: dùng chung `PHA_LE`, thêm "Không đủ điều kiện chuyển"). Đảo lại chỉ là một hằng trong mã. Lý do Duyệt dùng `PHA_LE` (ADR :80).
- **G-A5-5. Gieo `TU_CHOI_NHAN` 4 dòng** đúng chữ bản vẽ (`dot-5.md:41`): "Xe đã đầy chỗ", "Không kịp giờ", "Đang xử lý sự cố", "Lý do khác". Dùng `INSERT OR IGNORE`; thêm vào `NHOM_LY_DO_HIEN`; lý do nhúng vào DTO.
- **G-A5-6. Nhiều đề nghị chờ cùng điểm (P4, lời chủ).**
  - Nguồn:
    - lộ trình `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md:192`: *"Đợt 5 (P4): một điểm có nhiều đề nghị chuyển đang chờ, một cái được nhận ⇒ các cái khác tự huỷ trong cùng lô. Khuyến nghị: đồng ý."*;
    - `:151`: *"Lượt II câu 4 (chủ: "Đồng ý") ⇒ Đợt 5 P4 chốt"*;
    - `2026-10-01-van-chuyen-con-lai-05-xe-dang-chay.md:525`.
  - **Không có chỉ mục duy nhất nào** trên đề nghị đang chờ.
  - Lô xác nhận tự huỷ (`VOID`) cùng lô:
    - xác nhận `STOP`: mọi đề nghị `PENDING`/`ESCALATED` khác cùng `from_stop_id`, và mọi `ONBOARD` đang chờ của A (tập khách của A đã đổi; MQ-09 "nguồn đổi", ADR :61);
    - xác nhận `ONBOARD`: mọi đề nghị đang chờ khác của A.
  - Bỏ luật tự đặt "có `ONBOARD` đang chờ thì không gửi `STOP`": không có trong ADR hay lời chủ.
- **G-A5-7.** Thành quyết định Đ4 (lượt 8d-2).
- **G-A5-8. Cứu hộ** ([TK] §5.9, ADR-0052 :72, :132).
  - Ở B:
    - suất `BOARDED` mở tại điểm "nơi gặp" mới (`PICKUP`, `PENDING`, `added_while_running = 1`), giữ `BOARDED`;
    - suất `WAITING` giữ nơi đón gốc, ghép điểm có sẵn của B theo `khoaNoi` hoặc thêm điểm mới;
    - điểm trả ghép theo `khoaNoi` hoặc thêm mới;
    - điểm chưa tới sắp lại để đón đứng trước trả (`sapDonTruocTra`).
  - Ở A:
    - điểm còn lại giữ `PENDING`/`ARRIVED` (không `MOVED` khi `ONBOARD`);
    - A hoặc văn phòng bấm Kết thúc gián đoạn; lô đó bỏ qua điểm còn lại (`ARRIVED → SKIPPED` chỉ trong lô này, `0042:444`);
    - LC-16 (`0042:557-563`) qua vì không còn suất mở.
  - Tài xế B đổi thứ tự nơi gặp bằng nút ↑ ↓ có sẵn.
- **G-A5-9. Chữ nơi gặp:** qua `maskLongDigits` trước khi lưu, tối đa 200 ký tự; không vào nhật ký, không vào tin.
- **G-A5-10. Không thêm route trả tên khách.** `TRA_TEN` giữ 2, hẹp hơn ADR :228.
- **G-A5-11. Sự kiện và nhật ký đặt ở chuyến đích** (`trip_id` = đích, `related_trip_id` = nguồn, giống `loDoi`).
  - Tin cho tài xế nguồn đi bằng **đường tin chuyển khách riêng** (T10), không dùng đường điều chỉnh khẩn cấp của Đ1.
  - Đường đó (`chuyen-repo.ts:821-838`, `tin-chuyen.ts:40`, `:113-121` @adr-0104-d1) chỉ nhận `ALLOCATION_MOVED` mang `MOC_TOI_THIEU`.
- **G-A5-12. Khoá phiên bản.** Lệnh vòng đời chỉ đặt dấu lệnh. Xác nhận và duyệt kiểm `version` cả A và B, tự thử lại một lần (ADR :76). T0 kiểm trigger nào gắn `version` với `last_cmd_id`.
- **G-A5-13. Tự huỷ (MQ-09)** trong lô của: Đã tới / Bỏ qua điểm nguồn; Kết thúc hoặc Kết thúc gián đoạn của A hay B; Báo huỷ điểm đó; Huỷ chuyến đích; `CORRECTION` đụng suất của điểm; Thu hồi xuất bến của A hay B.
  - Cộng thêm tự huỷ theo P4 trong lô xác nhận (G-A5-6).
  - `VOID` không sinh sự kiện, không tin; vết ở `closed_cmd_id`.
- **G-A5-14. Thứ tự trong lô** theo T6:
  - dòng kiểm ghi trước câu đổi trạng thái;
  - thêm điểm và sắp lại điểm ở B trước khi mở suất (TĐ-1).
  - Chữ ADR-0052 :70 được ghi lại ở mục "Sửa chữ" của ADR mới. Lô là một khối nên không đổi kết quả, không tính là quyết định.
- **G-A5-15. Duyệt kiểm lại** trên dữ liệu đọc mới. Có `LOI` thì trả 409 `luat_loi_khong_duyet`.
- **G-A5-16. Nhận khi đã quá hạn:** trả 200 `{ketQua:"HET_HAN"}`, lô ghi `EXPIRED` cùng sự kiện, có tin.
- **G-A5-17.** Theo đánh giá Đợt 5 (Q2-Q6a).
- **G-A5-18.** Menu và huy hiệu chỉ cho `trip.override`; người có `trip.view` xem chỉ-đọc trong chi tiết chuyến (Q7).
- **G-A5-19.** Đề nghị leo thang: không hết hạn, không rút được; chữ "Văn phòng sẽ được báo".
- **G-A5-20. Tài xế đối tác.**
  - Danh sách xe nhận chỉ có tài xế công ty cho tới khi A4 gộp.
  - Nhánh gộp sau đặt ô `DRIVER_PARTNER` của `trip.transfer` = `assigned` (ADR-0053 :46).
  - Không có mã quyền mới, nên `EXTERNAL_PERMISSIONS` và LC-1 không đổi.
- **G-A5-21.** Thành quyết định Đ5 (lượt 8d-2), đã thu hẹp theo TĐ-5.
- **G-A5-22. So mã lệnh** theo cả mã đề nghị (BL-VC-MA-LENH (1)).
- **G-A5-23.** Đưa vào Đ3 (xem dòng "Không theo phiếu").
- **G-A5-24. Mỗi suất một câu INSERT** (CLAUDE.md:128; `0042:316`; `chuyen-repo.ts:443-446`).
  - Mở suất ở B: mỗi suất một câu, khuôn `ALLOC_DIEU_CHINH_INSERT` (`chuyen-repo.ts:544`): `INSERT … SELECT` chép từ **đúng một** suất nguồn; `board_stop_id` / `alight_stop_id` gắn vào điểm của B, không chép từ A.
  - Đóng suất ở A: theo `loDoi`, mỗi cặp đóng rồi mở (LC-01, ADR :243). Nếu T0 đo thấy sát trần thì được đổi riêng phần đóng thành một câu `UPDATE` tập hợp (tiền lệ `ALLOCS_CLOSE_ALL`, `chuyen-repo.ts:463`; luật §10 chỉ nói INSERT). Phần mở vẫn mỗi suất một câu.
  - Không tạo nới N6.
- **G-A5-25. Tên loại sự kiện:** `TRANSFER_SENT`, `_WITHDRAWN`, `_DECLINED`, `_EXPIRED`, `_ESCALATED`, `_CONFIRMED`, `_REJECTED`.

### 1b. Lượt duyệt 8d đề xuất

Một ADR mới (số tạm 0111, "Danh mục điều kiện chuyển khách và dấu vết chuyển khách"), duyệt trong **hai lượt**, mỗi lượt 3 quyết định chạm dữ liệu, quyền hay bất biến, theo trần CLAUDE.md §9. Theo khuôn ADR-0052 :7 (một ADR, hai lượt A-1 và A-1b, cùng trang ghép). Trang ghép chung ở mục 5, mỗi dòng ghi lượt.

**Danh mục quyết định ADR mới mang**

| Mã | Quyết định | Loại | Lượt |
|---|---|---|---|
| Đ1 | Bảng danh mục `vc_transfer_rule` thay `rule_code CHECK` (ADR-0052 :64, :210). Dòng kiểm phải khớp tầng của danh mục. 11 dòng gieo. Không xoá; tắt bằng `active = 0`. Lời chủ 2/10 | Dữ liệu, một chiều | 8d-1 |
| Đ2 | Hai điều kiện thêm, đều bắt buộc theo luật đã duyệt: `CAM_KET_DICH` (tầng `CAU_HINH`; ADR-0056 A2 `:59`, `:68`; Quản trị duyệt thì ghi khoá cam kết của B theo A3) và `CHANG_KHACH_HIEU_LUC` (tầng `LOI`; không có luật này thì trigger `lc09_leg`, `0042:465-469`, làm lô vỡ bằng lỗi CSDL) | Dữ liệu, bất biến | 8d-1 |
| Đ3 | Dấu vết và tin, chi tiết dưới bảng | Dữ liệu, một chiều | 8d-1 |
| Đ4 | Cứu hộ `ONBOARD` chỉ tới xe đích `RUNNING`. Siết LC-14 (ADR-0052 :69, :192 cho cả `PLANNED`) | Bất biến, siết | 8d-2 |
| Đ5 | Chuyến nguồn có sự kiện `TRANSFER_CONFIRMED` (liên quan tới nó) sau lần xuất bến cuối thì không thu hồi xuất bến được. Trên chuyến đích, các `TRANSFER_*` chưa xác nhận **không** tính là tiến độ. Dựng lại `vc_trip_revoke_no_progress` và `lenhThuHoiXuatBen` | Bất biến, siết | 8d-2 |
| Đ6 | Chặng đặt gấp chuyển sang xe `PLANNED` trong mốc: chờ Quản trị, hay qua như dòng Xếp. Nêu thẳng xung đột ADR-0052 :77 với :192, ADR-0049 :162, ADR-0104 :233 | Bất biến (mốc 6 giờ, không tắt được) | 8d-2 |

**Chi tiết Đ3 (dấu vết và tin):**
- (a) Tách cột suất: `transfer_id` (đề nghị đã mở suất; bất biến từ lúc chèn) và `closed_transfer_id` (đề nghị đã đóng suất; đặt một lần cùng câu đóng). Thay ADR :65; bất biến ADR :221 đếm theo hai cột.
- (b) Cột thêm của bảng đề nghị: `request_id`, `decided_cmd_id`, `closed_cmd_id`, `decided_by_party_id` (để kiểm ở tầng CSDL "chỉ tài xế đích bấm Nhận / Không nhận", ADR :130, :248).
- (c) Chính sách:
  - hạn chờ theo `policy_id` chụp lúc gửi (ADR :78);
  - công tắc tự đồng ý theo dòng chính sách hiện hành **lúc quyết** (ADR :66);
  - dòng kiểm ghi `policy_row_id` (ADR :64) là dòng đã dùng.
  - Nêu thẳng ADR :62 ("dòng đã dùng") và :78 ("chụp lúc gửi") tự mâu thuẫn.
- (d) Bảy tên việc nhật ký `trip_transfer_*`. Trường `detail` chỉ gồm mã chuyến, phạm vi, số khách, mã luật không đạt. Sáu việc sinh tin; thêm `trip_transfer_declined` → tài xế nguồn. Không tin cho `withdrawn` và `void`. Đây là mở danh sách một chiều D6.1 (ADR :148, :210).

**Không tính là quyết định, chỉ ghi trong văn bản để chủ thấy:**
- Thứ tự câu trong lô (sửa chữ ADR :70) và dòng kiểm trước đổi trạng thái (G-A5-14).
- Tự huỷ theo P4 (lời chủ đã có) và tự huỷ chéo phạm vi (MQ-09).
- Nới N1: chủ đã duyệt ở ADR-0052 :190.
- Nới N2 (ngoại lệ NT-3(b) cho hai route duyệt / bác): nằm trong lời duyệt ADR-0104 :101, :244, theo tiền lệ G12 (sổ thi công `:29`).
- Nới N3 (R-VC-16 bỏ qua suất `BOARDED` ở nơi gặp): nằm trong lời duyệt ADR-0052 :72 và D5c, tiền lệ G12.
- Không có N6: giữ luật mỗi suất một câu.

**Lượt 8d-1** (Đ1, Đ2, Đ3, kèm một câu xác nhận không tính trần): chặn migration (T2).

> **Hộp "Điều kiện"** (Đ1, Đ2 — duyệt văn bản)
>
> Khi tài xế nhờ xe khác đón khách, Nền tảng tự kiểm một danh sách điều kiện: xe nhận còn chỗ không, có trùng giờ không, có vướng mốc 6 giờ không, giấy tờ xe còn hạn không, tài xế đủ hạng bằng không. Ngày 2/10 bạn dặn danh sách này phải để dạng "thêm một dòng là thêm một điều kiện", không khoá cứng. Văn bản quyết định cũ lại khoá cứng 9 điều kiện, nên cần văn bản mới thay đúng chỗ đó. Văn bản mới thêm hai điều kiện mà các quyết định bạn đã duyệt bắt buộc phải có:
> - khách đã đặt xe riêng hoặc số chỗ tối thiểu thì việc chuyển phải qua Quản trị duyệt kèm lý do, như khi xếp xe thường;
> - khách thuộc đơn đã huỷ thì không chuyển được, vì Nền tảng vốn không cho đưa khách của đơn đã huỷ lên xe khác.
>
> Bạn duyệt văn bản này không?
> 1. **Duyệt (Recommended).** Được: đúng lời bạn dặn ngày 2/10; sau này thêm điều kiện chỉ cần thêm một dòng; khách xe riêng không bị chuyển sang xe chung mà không ai xem. Mất: một số lần nhờ xe phải chờ Quản trị duyệt.
> 2. **Chưa duyệt.** Được: bạn có thêm thời gian xem lại. Mất: chưa làm được phần nhờ xe khác đón; tài xế vẫn gọi văn phòng như hôm nay.

> **Hộp "Dấu vết"** (Đ3 — duyệt văn bản)
>
> Mỗi lần chuyển khách, Nền tảng ghi lại để sau này tra được và để báo đúng người:
> - mỗi khách ghi rõ được chuyển vào theo đề nghị nào và chuyển ra theo đề nghị nào (một khách có thể được chuyển vào rồi lại chuyển ra);
> - ghi người bấm Nhận, và chỉ chấp nhận khi đó đúng là tài xế xe nhận (văn phòng không bấm Nhận thay);
> - thời gian chờ tính theo cài đặt lúc gửi; công tắc "tự đồng ý" tính theo cài đặt lúc tài xế bấm Nhận, để khi bạn tắt công tắc thì cả các đề nghị đang chờ cũng phải qua Quản trị (văn bản cũ có hai câu nói khác nhau ở chỗ này);
> - khi tài xế xe nhận bấm "Không nhận", tài xế nhờ được báo ngay.
>
> Những gì đã ghi thì không xoá được, nên cách ghi phải duyệt trước khi làm.
> 1. **Duyệt (Recommended).** Được: tra lại được mọi lần chuyển; tắt công tắc có hiệu lực ngay; tài xế nhờ biết sớm khi bị từ chối. Mất: cách ghi cố định từ lần ghi đầu, muốn đổi sau phải làm thêm.
> 2. **Chưa duyệt.** Được: bạn xem lại cách ghi trước. Mất: chưa bắt đầu được phần dữ liệu của việc nhờ xe.

> **Hộp "Tình huống"** (xác nhận theo yêu cầu của văn bản ngày 30/9; chặn nghiệm thu, không chặn việc làm)
>
> Trước khi nghiệm thu phần chuyển khách, văn bản ngày 30/9 yêu cầu bạn xác nhận các tình huống mẫu. Dưới đây là 10 tình huống, dùng ví dụ xe A / xe B của bạn:
> 1. Kẹt xe, xe A không kịp đón Mường Thanh (3 khách). Xe B đang chạy gần đó, nhận xong còn 25/29 chỗ, không trùng giờ. Tài xế A nhờ, tài xế B bấm Nhận: Nền tảng tự đồng ý, 3 khách sang xe B, tài xế A được báo.
> 2. Như tình huống 1 nhưng xe B chưa xuất bến và chỉ còn dưới 6 giờ tới giờ chạy (khách không đặt gấp): tài xế B bấm Nhận xong, việc chuyển chờ Quản trị duyệt kèm lý do. Duyệt thì khách sang xe B; bác thì khách ở lại xe A.
> 3. Xe A chỉ còn 1 chỗ mà điểm Alibu của xe B có 2 khách. Tài xế B nhờ, tài xế A bấm Nhận: Nền tảng không cho vì sẽ vượt chỗ (16/15), báo Quản trị; Quản trị chỉ được bác, không được duyệt cho qua.
> 4. Tài xế B bấm "Không nhận" và chọn lý do (ví dụ "Không kịp giờ"), hoặc để quá 10 phút không trả lời: đề nghị đóng lại, tài xế A được báo và nhờ xe khác hoặc gọi văn phòng.
> 5. Tài xế A nhờ cùng lúc xe B và xe C đón Mường Thanh. Tài xế B bấm Nhận trước: đề nghị gửi xe C tự huỷ; tài xế C thấy "đã huỷ" khi mở màn hình.
> 6. Xe A tới Mường Thanh (hoặc kết thúc chuyến) trước khi xe B trả lời: đề nghị tự huỷ, không ai phải làm gì.
> 7. Xe A hỏng giữa đường, 5 khách đã lên xe, 3 khách còn chờ ở điểm sau. Tài xế A chọn xe cứu hộ C đang chạy và ghi nơi gặp; tài xế C bấm Nhận: 5 khách lên xe C ở nơi gặp, 3 khách được xe C đón ở điểm cũ; sau đó tài xế A bấm Kết thúc gián đoạn.
> 8. Như tình huống 7 nhưng tài xế A gọi văn phòng, nhân viên văn phòng gửi thay đề nghị cứu hộ. Tài xế C vẫn phải tự bấm Nhận; văn phòng không bấm Nhận thay được.
> 9. Khách đã đặt xe riêng (hoặc đặt số chỗ tối thiểu) bị nhờ chuyển sang xe khác: việc chuyển chờ Quản trị duyệt kèm lý do, không tự đồng ý.
> 10. Ví dụ của bạn: xe A không kịp Mường Thanh còn xe B ở gần; đồng thời xe B không kịp Alibu còn xe A ở gần. Hai tài xế nhờ chéo nhau; mỗi lần nhờ được xét riêng như tình huống 1, hoặc như tình huống 3 nếu thiếu chỗ.
>
> Kết quả Nền tảng đưa ra ở mỗi tình huống có đúng ý bạn không?
> 1. **Đúng hết (Recommended).** Được: làm xong là nghiệm thu được ngay. Mất: không có.
> 2. **Có tình huống cần sửa (ghi số tình huống).** Được: sát thực tế hơn. Mất: chưa nghiệm thu được cho tới khi sửa xong.

**Lượt 8d-2** (Đ4, Đ5, Đ6). Gửi ngay sau khi chủ trả lời 8d-1, như A-1 rồi A-1b ngày 30/9.

> **Hộp "Chỗ siết"** (Đ4, Đ5 — duyệt văn bản)
>
> Văn bản mới có hai chỗ chặt hơn văn bản cũ:
> - Xe cứu hộ nhận khách đang ngồi trên xe hỏng phải là xe đang chạy. Xe cứu hộ chưa xuất bến thì đi đường cũ: tài xế bấm Kết thúc gián đoạn, văn phòng xếp khách lên xe khác.
> - Xe nào đã chuyển khách đi thì không còn dùng "thu hồi xuất bến" được (lệnh dùng khi bấm xuất bến nhầm), vì xe đó rõ ràng đã chạy thật. Xe nhận khách vốn đã bị chặn như vậy. Đề nghị bị từ chối hay hết hạn thì không tính.
>
> Bạn duyệt hai chỗ này không?
> 1. **Duyệt (Recommended).** Được: không có cảnh khách đã ngồi trên xe mà lại nằm trong một chuyến chưa xuất bến; không xoá được dấu xuất bến của chuyến đã thật sự chở khách. Mất: cứu hộ bằng xe chưa chạy vẫn phải qua văn phòng như hôm nay.
> 2. **Chưa duyệt.** Được: giữ đúng văn bản cũ, xe chưa chạy cũng nhận cứu hộ được. Mất: phải làm thêm nhiều phần cho khách đã lên xe nằm trên chuyến chưa xuất bến, xong chậm hơn; xe đã chuyển khách vẫn thu hồi xuất bến được.

> **Hộp "Đặt gấp"** (Đ6 — câu hỏi thật)
>
> Khách đã được đánh dấu đặt gấp mà bị nhờ chuyển sang xe chưa chạy, cách giờ xuất bến dưới 6 giờ. Hai văn bản cũ nói khác nhau ở chỗ này: một chỗ ghi "chờ Quản trị duyệt", một chỗ dẫn về luật xếp xe thường, mà luật đó cho khách đặt gấp đi qua.
> 1. **Vẫn chờ Quản trị duyệt (Recommended).** Được: an toàn, giữ đúng mốc 6 giờ, luôn có người xem lại. Mất: khách đặt gấp có thể chờ thêm vài phút.
> 2. **Cho qua luôn như khi xếp xe thường.** Được: nhanh hơn. Mất: không ai xem lại việc chuyển sát giờ.

**Thi công được trước khi duyệt** (không phụ thuộc quyết định nào của 8d; CLAUDE.md §3 "giao chạy nền phần việc không phụ thuộc"):

| Việc | Vì sao không phụ thuộc |
|---|---|
| T0 đo lại; T1 bản thảo ADR, trang ghép, tệp tình huống | Tài liệu |
| T3a hàm thuần: `hetHanDeNghi`, `chuanNoiGap`, `datChoOnboard`, `quyetDinhSauKiem`, `duocDuyetThay`; `kiemChuyen` cho 9 luật của ADR-0052 :64 (danh sách luật, tầng và cờ đặt gấp **tiêm vào**, không đọc bảng); bài liệt kê khoá `XeNhanDto`, `DeNghiDto` | ADR-0052 :61, :73-80, D4.4, [TK] §5.9 đã duyệt |
| T4 + T7a: ô `trip.transfer` + `GET /cuoc-cua-toi/:id/xe-nhan` phạm vi `STOP`, cùng một commit | Ô và nới N1 đã duyệt (ADR-0052 :84, :190); route chỉ đọc bảng có sẵn. Lọc `ONBOARD` chờ Đ4 |
| T10a: hàm người nhận cho gửi / xác nhận / bác / hết hạn / leo thang + bài mọi tập con quyền; câu SQL đường tin nguồn (đọc `vc_trip_event`), sau khi Đ1 gộp | ADR-0052 D6.2 đã duyệt. Nhánh `declined` chờ Đ3 |
| Chữ giao diện thuần (`xe-dang-chay-man.ts`), nháp chữ hướng dẫn | Bề mặt |

**Sau 8d-1:** T2 phần bảng, cột, danh mục, chính sách, LC-15; T3b; T5-T7b; T10b; T11-T12.
**Sau 8d-2:** bổ sung vào cùng tệp migration (chưa lên `main` nên sửa được; D1 local đã áp bản trước thì xoá D1 local, như ghi chú ở đầu `0041`):
- vế Đ4 của `_lc14`;
- `revoke_no_progress` (Đ5);
- cờ đặt gấp của `kiemChuyen` (Đ6).

Sau đó làm T8, T9, T13-T18. Chủ chọn "Chưa duyệt" ở hộp "Điều kiện" thì dừng mọi phần sau T4/T7a.

---

## 2. Tiêu chí nghiệm thu (viết trước việc)

| Mã | Tiêu chí |
|---|---|
| NT-A5-1 | **Danh mục điều kiện.** `vc_transfer_rule` có 11 dòng gieo. Dòng kiểm mang mã ngoài danh mục, tầng khác danh mục, hoặc luật `active = 0` đều bị chặn ở CSDL. Không đổi được `code`/`tier`, không xoá. Không route nào ghi danh mục. `TANG_LUAT` khớp dòng gieo |
| NT-A5-2 | **Danh sách xe nhận** có đúng khoá `tripId, maChuyen, tenTaiXe, choTrong, diemSapToi`. Chỉ chuyến cùng ngày, `PLANNED`/`RUNNING`, có tài xế mở khác người gửi; `ONBOARD` chỉ `RUNNING` (Đ4). Trước A4 chỉ tài xế công ty. Không khách, biển số, SĐT, mã đơn |
| NT-A5-3 | **Gửi `STOP`** trả 200; đề nghị `PENDING`, `pax_count` đúng; 1 sự kiện `TRANSFER_SENT` ở B (`related` = A); 1 dòng nhật ký; tài xế B nhận tin, A không |
| NT-A5-4 | **Gửi bị chặn** (409 có mã, không ghi gì): điểm không `PENDING`; có suất không `WAITING`; A không `RUNNING`; B khác ngày; cùng tài xế; B không có tài xế mở. Người gọi không lái A thì 404, kể cả Toàn quyền. Gửi cùng điểm cho xe thứ hai khi đã có đề nghị chờ thì **được** (P4) |
| NT-A5-5 | **Đóng lười khi gửi lại.** Đề nghị `PENDING` quá hạn mà A gửi lại thì lô đóng nó thành `EXPIRED` trước khi thêm đề nghị mới (MQ-08) |
| NT-A5-6 | **Nhận, tự xác nhận.** `CONFIRMED`, `decided_mode = 'MAY'`. Suất A đóng `TRANSFERRED` có `closed_transfer_id`. Suất B mở có `transfer_id`, giữ trạng thái. Điểm đón / trả ở B được tạo hoặc ghép theo `khoaNoi` **trước** khi mở suất; điểm chưa tới ở B sắp lại để không có suất bị đảo (`suatTraTruocDon` rỗng). Điểm A `MOVED`. Có manifest nếu B đã xuất bến. Đề nghị chờ khác cùng điểm thành `VOID`. 1 sự kiện. Tin tới A |
| NT-A5-7 | **Nhận, leo thang** khi có `KHONG_DAT` bất kỳ hoặc công tắc hiện hành đang tắt: `ESCALATED`, suất không đổi, tin tới `trip.override`. Có `LOI` thì hộp duyệt chỉ cho Bác |
| NT-A5-8 | **Không nhận:** lý do `TU_CHOI_NHAN` bắt buộc; `DECLINED`; tin tới A (Đ3) |
| NT-A5-9 | **Rút:** chỉ khi `PENDING`, chỉ tài xế A; `ESCALATED` thì 409 `da_leo_thang` |
| NT-A5-10 | **Nhận muộn** trả 200 `HET_HAN`, ghi `EXPIRED`, có tin. `ESCALATED → EXPIRED` bị trigger chặn |
| NT-A5-11 | **Duyệt:** chỉ `trip.override`; lý do `PHA_LE`; chạy lại kiểm; có `LOI` thì 409 và không ghi; được thì `NGUOI`. `CAM_KET_DICH` không đạt thì ghi khoá cam kết B (ADR-0056 A3). SQL `UPDATE` thẳng khi có `LOI` → `RAISE` |
| NT-A5-12 | **Bác:** `trip.override`, lý do bắt buộc, `REJECTED`, tin tới A và B. Bán hàng gọi duyệt / bác → 403 |
| NT-A5-13 | **MQ-09:** mỗi lệnh ở G-A5-13 làm đề nghị liên quan `VOID` cùng lô, có `closed_cmd_id`, không thêm sự kiện. Tự huỷ chéo phạm vi theo G-A5-6 |
| NT-A5-14 | **Cứu hộ `ONBOARD`.** Đúng một trong hai: nơi gặp từ địa điểm, hoặc chữ đã che. Suất `BOARDED` sang B tại điểm nơi gặp `PENDING`, vẫn `BOARDED`; suất `WAITING` ở nơi đón gốc. A bấm Kết thúc gián đoạn được ngay (LC-16 qua; điểm còn lại `SKIPPED`). Tài xế B làm Đã tới / rời điểm nơi gặp được |
| NT-A5-15 | **Văn phòng bấm thay:** `POST /chuyen/:id/cuu-ho` chỉ nhận `ONBOARD` (gửi `STOP` → 400); `proposed_by_staff_id` là người bấm; văn phòng không có route Nhận; cùng hàm xử lý với route tài xế. **Lớp CSDL:** SQL tay đặt `PENDING → CONFIRMED/ESCALATED/DECLINED` với `decided_by_party_id` không phải tài xế đang lái chuyến đích → `RAISE`; `decided_mode = 'NGUOI'` từ `PENDING` → `RAISE` |
| NT-A5-16 | **Không lộ tên (LC-18):** DTO, danh sách, tin, nhật ký không có tên, năm sinh, SĐT, số giấy tờ. Chữ nơi gặp (đã che) chỉ ở DTO đề nghị |
| NT-A5-17 | **Tin:** đúng D6.2 cộng Đ3. Tài xế nguồn nhận tin xác nhận / bác / hết hạn / không nhận qua **đường tin chuyển khách**; gỡ nhánh nguồn thì đỏ. Trả 409 thì không có tin. `VOID`, `WITHDRAWN` không có tin. Người bấm không tự nhận tin |
| NT-A5-18 | **LC-15:** đóng hoặc mở suất, thêm điểm trên chuyến `RUNNING` bằng đường chuyển mà đề nghị chưa `CONFIRMED` bởi chính dấu lệnh → `RAISE`; gỡ nhánh mới thì câu đi qua |
| NT-A5-19 | **Thu hồi xuất bến (Đ5).** Chuyến nguồn có `TRANSFER_CONFIRMED` (`related` = nó) sau `DEPARTED` cuối → chặn ở CSDL và máy chủ. Đề nghị gửi rồi bị từ chối / hết hạn / rút / bác **không** chặn, ở cả nguồn lẫn đích |
| NT-A5-20 | **Chạy đua:** Nhận đúng lúc A rút; Nhận đúng lúc A bấm Đã tới; văn phòng thêm điểm vào B đúng lúc B nhận (thử lại một lần); hai đề nghị khác điểm làm B vượt chỗ (cái sau leo thang); **B và C cùng bấm Nhận một điểm:** một bên thắng, bên kia thử lại một lần rồi nhận 409 `da_huy` |
| NT-A5-21 | **Mã lệnh dùng lại:** cùng `request_id` và cùng đề nghị → kết quả cũ; khác đề nghị → 409 |
| NT-A5-22 | **Quyền:** ma trận như 5.2; `EXTERNAL_PERMISSIONS`, LC-1 không đổi; ghim `trip.transfer`: SALES, ADMIN = `none`; mọi bài ghim ở 0.5 xanh |
| NT-A5-23 | **Bất biến:** R-VC-26..30 xanh trên dữ liệu e2e, đỏ trên dữ liệu gieo hỏng; R-VC-16 không báo giả cho nơi gặp |
| NT-A5-24 | **Chính sách:** hai cột có mặc định (10 phút, bật); chỉ Toàn quyền sửa. **Tắt công tắc** (thêm dòng chính sách mới) **khi đã có đề nghị `PENDING` gửi lúc công tắc bật**: B bấm Nhận → `ESCALATED`; SQL tay `PENDING → CONFIRMED` (`MAY`) → `RAISE`. Hạn chờ của đề nghị đó vẫn theo dòng lúc gửi. Dòng kiểm ghi `policy_row_id` = dòng hiện hành lúc quyết |
| NT-A5-25 | **Đ2:** sau khi chuyển, máy đồng bộ không nhắc nhầm; chặng có suất mở ở chuyến khác vẫn là "đã xếp" |
| NT-A5-26 | **Đếm câu và đo trần.** Bài đếm số câu lô xác nhận = K + 2N (+N khi B đã xuất bến) + R (R = số điểm sắp lại), với N = số suất. Mỗi suất đúng một câu `INSERT` mở suất. Đo trên D1 local với N = 16 (xe công ty lớn nhất) và N = 45 (xe 45 chỗ của bộ mẫu); ghi kết quả. Trần thật trên D1 production: **chưa kiểm** |
| NT-A5-27 | **Hướng dẫn:** cập nhật đúng; bài A4 của `huong-dan.test.ts` xanh; trần Bán hàng, Quản trị ≤ 4500 |
| NT-A5-28 | **Thứ tự lô ở B:** bài thứ tự lô kiểm "thêm điểm → sắp lại → (đóng A, mở B) theo cặp". Bài CSDL: mở suất trỏ điểm B chưa chèn → `RAISE lc04_stop_scope` |
| NT-A5-29 | **Đơn huỷ sau khi xếp:** `CHANG_KHACH_HIEU_LUC = KHONG_DAT` tầng `LOI` → `ESCALATED`, chỉ Bác. Ca đỏ trước: gỡ luật khỏi `kiemChuyen` thì lô vỡ bằng lỗi CSDL `lc09_leg` (409 `trip_rule`), không phải đề nghị leo thang có mã |

---

## 3. Lát thi công (commit nhỏ, đỏ trước)

Mỗi commit: viết bài → thấy đỏ đúng thông báo → sửa → xanh. Chạy `npm test` và `npm run typecheck`. Tệp test không được typecheck phủ, nên phải tự đọc lại.

**T0. Đo lại, không commit.** Làm sau khi Đ1, Đ2, ADR-0105, ADR-0109, G17 đã gộp.
- **Số migration:** `git for-each-ref --format='%(refname:short)' refs/heads refs/remotes`, rồi với từng ref chạy `git ls-tree --name-only <ref> migrations/`. Số tạm 0092; chốt khi gộp. Số ADR: số tạm 0111.
- **Số dòng:** `index.ts`, `dieu-phoi.ts`, `tin-chuyen.ts`, `chuyen-repo.ts`, `thongbao/*`.
- **Mã Đ1:** `lop-vuot.test.ts`; `CHUYEN_CHO_TIN`, `LAI_CHO_TIN`, `KHAN_CAP_CHO_TIN`, `canHoiTheoSuKien`, `tinNguonCho`, `loaiCho`, `dungDongChuyen`; `gioXetMocXep`; nội dung THẤP-15.
- **Mã Đ2:** view `v_ord_leg_commit` (G10); ngoại lệ ở `thu-tu-lo.test.ts`; trần câu `:154`.
- **Trigger:** `vc_trip_event_after_departure`, `vc_trip_departed_after_plan` với `TRANSFER_*` trên chuyến `PLANNED`; trigger nào gắn `version` với `last_cmd_id`; Bỏ qua điểm nơi gặp khi điểm mang suất `BOARDED`.
- **Đo trần `db.batch` trên D1 local** (`wrangler dev`) với N = 16 và N = 45. Không qua thì dừng và báo điều phối, không tự đổi luật INSERT.
- **Hướng dẫn:** số chữ, số phút sau Đ1.
- **`docs/quyen-hoan.json`:** đối chiếu sáu lỗ ở 0.5.
- **ADR-0110:** đã vào mục lục chưa.

**T1. Bản thảo ADR, trang ghép, tệp tình huống.** Chỉ tài liệu, ở `docs/superpowers/specs/<ngày>-luot-duyet-8d/`.
- Khung ADR theo khuôn ADR-0052:
  - Nguồn: lời chủ 2/10 `:169`; P4 `:151`, `:192`; mở lại 8/10 `BACKLOG:200`.
  - Dòng "**Xây trên lỗ đang hở:** không" kèm ghi chú sáu lỗ ở 0.5 (khuôn ADR-0052 :18).
  - Đ1–Đ6.
  - Mục "Sửa chữ" (ADR :70; :62 với :78).
  - Mục "Câu ADR bị thay".
  - Mục cửa một chiều / hai chiều.
  - Mục "Hàng rào nới": N1, N2, N3, kèm căn cứ.
- Trang ghép như mục 5.
- Tệp `golden/dieu-phoi/xe-a-b-luot-2-chuyen-khach.json` gồm 10 tình huống, `"trang_thai": "cho_xac_nhan"`.
- Điều phối gửi lượt 8d-1, rồi 8d-2.
- Sau khi duyệt:
  - chép ADR vào `docs/adr/` (chủ duyệt nên được sửa tệp luật);
  - thêm dòng mục lục;
  - thêm câu trỏ ở dòng 3 của ADR-0052;
  - ghi nguyên văn nhãn chủ chọn vào sổ.

**T2. Migration `0092_chuyen_khach_giua_xe.sql` (số tạm) và bài `chuyen-khach-csdl.test.ts`.** Viết sau 8d-1; vế Đ4, Đ5 thêm sau 8d-2.
- **Bài viết trước:**
  - khuôn `dieu-chinh-csdl.test.ts`: dựng schema từ mọi migration bằng `node:sqlite`; biến môi trường `CHUYEN_KHACH_SQL` cho bản đột biến;
  - ca: NT-A5-1, -15 (lớp CSDL), -18, -19, -24, -28, -29 (phần CSDL); đồ thị trạng thái; LC-14 (cả vế Đ4); `confirm_core`; `confirm_may`; `escalate_has_evidence`; `_nguoi_nhan`; tầng dòng kiểm khớp danh mục; chặn xoá, chặn sửa;
  - **ca chèn thẳng suất `BOARDED`** vào chuyến `RUNNING` tại điểm `PENDING` dưới sự kiện `TRANSFER_CONFIRMED` (đi qua) và không có sự kiện đó (`RAISE lc15`);
  - mỗi ca có vế "bỏ trigger thì câu đi qua".
- **Đỏ mong đợi:** `Error: no such table: vc_transfer_rule`.
- **Đầu tệp, khối `-- HOÀN TÁC (D1 không có Down):`**
  - `DROP TRIGGER` cho từng trigger mới;
  - dựng lại `alloc_ins`, `alloc_close`, `identity`, `revoke_no_progress` theo thân 0085 (`:74-98`, `:99-115`, `:35-41`, `:63-67`) và `stop_ins` theo `0076:82-86`;
  - hai bảng mới chỉ xoá khi rỗng;
  - cột thêm để nguyên.
- **`vc_transfer_rule`:**
  - cột `code` (khoá chính), `label`, `tier CHECK IN ('LOI','CAU_HINH')`, `sort_order`, `active CHECK IN (0,1)`, `created_at`;
  - trigger chặn xoá; `code`, `tier` bất biến;
  - gieo 11 dòng:
    - `CAU_HINH`: `KHOANG_NGHI_DICH`, `MOC_TOI_THIEU`, `CAM_KET_DICH`;
    - `LOI`: `SUC_CHUA_DICH`, `SUC_CHUA_NGUON`, `TRUNG_GIO_DICH`, `HANG_BANG_DICH`, `GIAY_TO_DICH`, `KHONG_CHEO`, `DIEM_CHUA_TOI`, `CHANG_KHACH_HIEU_LUC`.
- **`vc_transfer_request`:**
  - cột theo ADR :55-63, cộng `request_id`, `decided_cmd_id`, `closed_cmd_id`, `decided_by_party_id` (Đ3);
  - `policy_id NOT NULL` là dòng lúc gửi;
  - CHECK trên `scope`, `status`, `decided_mode`, và CHECK theo phạm vi;
  - khoá ngoại tới `vc_reason`, `vc_dispatch_policy`;
  - **không có chỉ mục duy nhất trên đề nghị đang chờ** (P4).
  - Trigger:
    - `_no_delete`, `_identity`, `_status_forward` (đúng đồ thị :61), `_decided_once`;
    - `_lc14`: LC-14; vế Đ4: `ONBOARD` thì đích `RUNNING`;
    - `_confirm_core`: `ESCALATED → CONFIRMED` đòi `NGUOI`, `override_reason_code`, không có `KHONG_DAT`+`LOI` của `decided_cmd_id`;
    - `_confirm_may`: `PENDING → CONFIRMED` đòi `MAY`, không có `KHONG_DAT` của `decided_cmd_id`, và `(SELECT p.auto_confirm_transfer FROM vc_dispatch_policy p WHERE p.valid_from_at <= NEW.decided_at ORDER BY p.valid_from_at DESC LIMIT 1) = 1` (khuôn `0084:36-38`, không đọc `policy_id`);
    - `_escalate_has_evidence`: `PENDING → ESCALATED` đòi có dòng `KHONG_DAT` của `decided_cmd_id`, hoặc dòng chính sách hiện hành tắt công tắc;
    - `_nguoi_nhan`: `PENDING → {CONFIRMED, ESCALATED, DECLINED}` đòi `decided_by_party_id` thuộc `vc_trip_driver` mở của `to_trip_id`; `decided_mode = 'MAY'` chỉ từ `PENDING`, `'NGUOI'` chỉ từ `ESCALATED`, còn lại NULL.
  - "Tài khoản gửi `STOP` là tài xế A": chỉ máy chủ kiểm (không có cạnh van-chuyen → staff, `architecture.test.ts:63`), ghi "dựa vào máy chủ" ở `SO-HANG-RAO`.
- **`vc_transfer_check`:**
  - `rule_code REFERENCES vc_transfer_rule(code)`; `cmd_id`; `policy_row_id NOT NULL REFERENCES vc_dispatch_policy(id)`;
  - `UNIQUE(transfer_id, cmd_id, rule_code)`;
  - trigger chặn sửa / xoá; tầng khớp danh mục; luật `active = 1`;
  - `gia_tri`, `gioi_han` chỉ số hoặc ngày `yyyymmdd`.
- **`vc_trip_allocation`:**
  - thêm `transfer_id`, `closed_transfer_id`;
  - dựng lại `_identity` (thêm `transfer_id` vào danh sách bất biến);
  - trigger mới `_transfer_close`: `closed_transfer_id` chỉ đặt trong câu đóng (`OLD.valid_to_at IS NULL AND NEW.valid_to_at IS NOT NULL`); `close_reason = 'TRANSFERRED'` ⇔ `closed_transfer_id` có giá trị; chèn suất mới thì `closed_transfer_id` NULL.
- **`vc_dispatch_policy`:** thêm `accept_wait_minutes` (DEFAULT 10, 1–120) và `auto_confirm_transfer` (DEFAULT 1, CHECK 0/1).
- **LC-15 dựng lại:**
  - `alloc_ins`: nhánh sự kiện `TRANSFER_CONFIRMED`, `NEW.transfer_id` trỏ đề nghị `CONFIRMED` có `decided_cmd_id = last_cmd_id` và `to_trip_id = NEW.trip_id`; `STOP` ⇒ `NEW.status = 'WAITING'`; `ONBOARD` ⇒ `IN ('WAITING','BOARDED')`; `added_after_departure = 1`.
  - `alloc_close`: nhánh `TRANSFERRED` có `closed_transfer_id`, `from_trip_id = NEW.trip_id`.
  - `stop_ins`: thêm `'TRANSFER_CONFIRMED'` vào danh sách loại (`0076:84`).
  - Cân đóng = mở trên hai chuyến: không có trigger chốt theo dòng. R-VC-26 là lưới; ghi "phát hiện, không chặn".
- **`revoke_no_progress` (Đ5), điều kiện chặn là có một trong hai:**
  - sự kiện trên chính chuyến, loại không thuộc `DEPARTED`, `DEPARTURE_REVOKED`, `TRANSFER_SENT`, `TRANSFER_WITHDRAWN`, `TRANSFER_DECLINED`, `TRANSFER_EXPIRED`, `TRANSFER_ESCALATED`, `TRANSFER_REJECTED`;
  - sự kiện `related_trip_id = NEW.id AND kind = 'TRANSFER_CONFIRMED'`;
  - cả hai vế đều so `rowid` lớn hơn `DEPARTED` cuối của `NEW.id`.
- **Gieo** `TU_CHOI_NHAN`, 4 dòng.
- **Sửa ở:** tệp migration; `docs/data-dictionary.json` rồi `npm run dict`.

**T3. Hàm thuần `src/shared/chuyen-khach.ts`.**
- **T3a, trước duyệt:** các hàm ở bảng mục 1b.
- **T3b, sau duyệt:** đủ 11 luật; cờ đặt gấp theo Đ6; `TANG_LUAT` khớp tệp `.sql`.
- **Ca phải có:**
  - `CHANG_KHACH_HIEU_LUC` đọc cờ huỷ của đơn;
  - `CAM_KET_DICH` gọi `kiemCamKet` (ADR-0056 A2);
  - đích `RUNNING` thì `MOC_TOI_THIEU = DAT`.
- **Đỏ mong đợi:** `ERR_MODULE_NOT_FOUND … chuyen-khach.ts`.
- **Sửa ở:** `dieu-phoi-kieu.ts:37`, `:51`, `:127`; `NHAN_LUAT_CHUYEN`.

**T4 + T7a. Ô `trip.transfer` và route đầu tiên, MỘT commit** (TĐ-3, TH-9; làm được trước duyệt).
- **Bài viết trước:**
  - `permissions.test.ts`: bảng ADR thêm hàng; hàng DRIVER `assigned` (N1); hàng DRIVER_PARTNER `none`; hàng HR `none`; bài mới SALES, ADMIN = `none`;
  - `xem-don-theo-quyen.test.ts:295`: `none`;
  - `tro-ly-cau-truc.test.ts` (tên ô);
  - `route-access.test.ts` (route mới, đếm `:440`);
  - `tai-xe-cong.test.ts` (DRIVER 404 khi không lái; DRIVER_PARTNER 403);
  - `chuyen-khach-route.test.ts` phần NT-A5-2 (`STOP`).
- **Đỏ mong đợi:** `MATRIX và ADR phải có cùng danh sách thao tác`.
- **Sửa ở:**
  - `permissions.ts` (sau `:197`): `row("none","none","none","none","none","any","none","assigned","none","none")`;
  - `tro-ly-cau-truc-ten.ts`: tên và mô tả;
  - `index.ts`: route `GET /cuoc-cua-toi/:id/xe-nhan` với `can(staff,"trip.transfer",{assigned})` trước mọi truy vấn;
  - `cuu-ho.ts`: tách phần lọc.
- **Cuối commit chạy:** `npm test`, kể cả `permission-enforcement.test.ts` và `route-write-guard.test.ts`.
- Phương án dự phòng nếu phải tách commit: khai hoãn có hạn ở `docs/quyen-hoan.json` mục `thao_tac`, đủ `ma`, `ly_do`, `ke_hoach`, `han`, `nguoi_chiu_trach_nhiem`; gỡ mục ngay ở commit route. Khuyến nghị không dùng.

**T5. SQL trong `chuyen-repo.ts`** (`defineSql`, bài EXPLAIN).
- **Cổng:** `TRIP_GATE_CHAY_HOAC_CHO`; `TRIP_GATE_DOI_CHAY` (khuôn `TRIP_GATE_DOI` `:347`).
- **Đề nghị:** `TRANSFER_INSERT`, `TRANSFER_SET_STATUS`, `TRANSFER_EXPIRE_LAZY`, `TRANSFERS_VOID_CUNG_DIEM` (P4), `TRANSFERS_VOID_BY_STOP`, `TRANSFERS_VOID_BY_TRIP`.
- **Dòng kiểm:** `TRANSFER_CHECK_INSERT`.
- **Suất, mỗi suất một câu:**
  - `ALLOC_CLOSE_TRANSFER` (khuôn `ALLOC_CLOSE` `:455`, thêm `closed_transfer_id`);
  - `ALLOC_OPEN_TRANSFER` (khuôn `ALLOC_DIEU_CHINH_INSERT` `:544`: chép từ **một** suất nguồn, gắn điểm B, giữ trạng thái, `transfer_id`). Không dùng `ALLOC_INSERT` `:447` vì câu đó cứng `'WAITING'`.
- **Điểm:** `STOP_ADD_TRANSFER` (khuôn `chenDiem`), `STOP_SET_MOVED`; sắp lại dùng `doiThuTuDiem` có sẵn.
- **Manifest:** `MANIFEST_THEM_SAU` (`:520`).
- **Đọc:** `XE_NHAN_LIST`, `DE_NGHI_BY_ID`, `DE_NGHI_GUI_TOI`, `DE_NGHI_THEO_NGAY`.
- **Đỏ mong đợi:** bài EXPLAIN báo thiếu câu.

**T6. Hàm lô `dieu-phoi-chuyen-khach.ts`.**
- **Bài viết trước:**
  - siết `thu-tu-lo.test.ts:21` quét thêm tệp mới;
  - mẫu `MAU` cho `loGuiDeNghi`, `loDongDeNghi`, `loNhanDeNghi`, `loDuyetDeNghi`, `loBacDeNghi`;
  - bài `chuyen-khach-lo.test.ts`: NT-A5-26 (đếm N câu mở suất), NT-A5-28 (thứ tự).
- **Đỏ mong đợi:** `loGuiDeNghi: hàm dựng lô không có mẫu`.
- **Thứ tự lô xác nhận** (theo `loDoi`, `dieu-phoi.ts:294-318`):
  1. cổng A (`TRIP_GATE_DANG_CHAY_VERSION` `:501`);
  2. cổng B (`TRIP_GATE_DOI_CHAY`);
  3. nhật ký `changes() > 0`;
  4. sự kiện `TRANSFER_CONFIRMED`, đúng `requestId`; phải đứng trước mọi câu mà trigger đọc loại sự kiện;
  5. các dòng kiểm (`policy_row_id` = dòng hiện hành);
  6. đề nghị → `CONFIRMED`;
  7. thêm điểm ở B (`chenDiem`: nơi gặp / điểm đón; điểm trả khi B chưa có nơi đó);
  8. sắp lại điểm chưa tới ở B (`sapDonTruocTra` → `doiThuTuDiem`, khuôn `doiThuTuDich`);
  9. với từng suất: đóng suất A, rồi mở suất B;
  10. điểm A → `MOVED` (chỉ `STOP`);
  11. manifest ở B (mỗi suất một dòng, khi B đã xuất bến);
  12. tự huỷ theo G-A5-6;
  13. khoá cam kết B (khi duyệt có `CAM_KET_DICH` không đạt; `cauCamKet`);
  14. câu trạng thái cuối, nếu có.
- Mọi câu sau nhật ký mang lính gác dấu lệnh, gác theo chuyến **B** (luật 3 của `thu-tu-lo`).
- Cập nhật `ma-lenh-dung-lai.test.ts`.

**T7b. Các route tài xế còn lại** (cổng `staff`).
- **Route:** `POST /cuoc-cua-toi/:id/de-nghi`; `POST /de-nghi/:rid/rut`, `/nhan`, `/khong-nhan`; `GET /de-nghi-gui-toi`. Lọc `ONBOARD` ở `xe-nhan` theo Đ4.
- **Bài:** NT-A5-3..10, 14, 20, 21, 29 (phần route).
- **Đỏ mong đợi:** `404 !== 200`.
- **Bài kéo theo:** `permission-enforcement`, `route-write-guard`, `orders-cong-bo`.

**T8. Route văn phòng** (cổng `office`).
- **Route:** `POST /chuyen/:id/cuu-ho` (`trip.progress`, `ONBOARD`); `GET /chuyen/:id/cuu-ho/xe-nhan`; `GET /de-nghi?ngay=` (`trip.view`, trả `kiem[]`); `POST /de-nghi/:rid/duyet`, `/bac`.
- **Bài:**
  - cặp `tien-do-mot-luat.test.ts`;
  - NT-A5-11, -12, -15;
  - ngoại lệ N2 trong `lop-vuot.test.ts` NT-3(b): đúng 2 dòng `can(staff, "trip.override")` thuộc route duyệt / bác, đếm đúng, không có `"trip.urgent_adjust"`.
- **Đỏ mong đợi:** `chuỗi ô vượt luật ngoài biểu thức đổi lớp: [ 'index.ts:NNNN', 'index.ts:MMMM' ]`.

**T9. Móc MQ-09.**
- **Bài:** `MAU` của `thu-tu-lo` có câu `TRANSFERS_VOID_*` sau `SU_KIEN` cho mỗi lệnh ở G-A5-13; NT-A5-13.
- **Đỏ mong đợi:** `loDaToi: thiếu câu TRANSFERS_VOID_BY_STOP`.
- **Sửa ở:** `dieu-phoi.ts` (`loDaToi`, `loBoQua`, `loKetThuc`, `loKetThucGianDoan`, `loBaoHuy`, `loHuyChuyen`, thu hồi xuất bến), `dieu-phoi-dieu-chinh.ts`. Đo lại tên hàm và số dòng sau Đ1, Đ2.

**T10. Đường tin chuyển khách** (TĐ-2; ADR-0052 D6.2 :158-:160, :166). Không dùng lại đường điều chỉnh khẩn cấp của Đ1.
- **Bài viết trước** (`tin-chuyen.test.ts`; hàm người nhận chạy với mọi tập con quyền, khuôn ADR-0052 :229):
  - `trip_transfer_sent`: tài xế đích;
  - `_confirmed`, `_rejected`, `_expired`: tài xế nguồn và tài xế đích, trừ người bấm;
  - `_declined` (Đ3): tài xế nguồn;
  - `_escalated`: người có `trip.override`;
  - không tin cho `withdrawn`, `void`;
  - tài xế nguồn **nhận** tin dù sự kiện không mang `MOC_TOI_THIEU`.
  - Khung thử `thongbao` (hộp thông báo) chứng minh tài xế nguồn thấy tin.
  - `architecture.test.ts`: không cạnh `thongbao → van-chuyen`.
- **Đỏ mong đợi:** `laHanhDongTinChuyen('trip_transfer_sent') false`.
- **Sửa ở** (số dòng `@adr-0104-d1`, đo lại ở T0):
  - `chuyen-repo.ts`:
    - câu mới `CHUYEN_NGUON_CHUYEN_KHACH` (`related_trip_id` của sự kiện `TRANSFER_*` trong `?2`), nối `OR … IN (…)` vào `CHUYEN_CHO_TIN` và `LAI_CHO_TIN` (`:825-830`);
    - câu mới `CHUYEN_KHACH_CHO_TIN` (id sự kiện → chuyến nguồn), khuôn `KHAN_CAP_CHO_TIN` `:836-838` nhưng không lọc `override_rule_code`;
    - `chuyenChoTinTheoId` trả khoá mới `chuyenKhachNguon`.
  - `tin-chuyen.ts`:
    - thêm 6 hành động vào `HANH_DONG_TIN_CHUYEN` (`:13-23`), thuộc nhóm thường (CAO-3);
    - `canHoiTheoSuKien` (`:40`) nhận `trip_transfer_*`;
    - `ChuyenChoTin`, `DongChuyen` thêm `chuyenKhachNguon`;
    - hàm mới `tinChuyenKhachCho` (không đòi `khanCap`);
    - `loaiCho` (`:85-102`) thêm nhánh tài xế đích và nhánh `trip.override` cho leo thang (tệp ở `src/shared/`, nằm ngoài phạm vi quét của NT-3(b));
    - thêm câu vào bảng `CAU`.
  - `dungDongChuyen` / `thongbao` (`index.ts:48`, `:62`): ghép chuyến nguồn.
  - `src/index.ts:107-126`: không đổi (Bảng tin đã truyền cả `relatedTripId`).
- **T10a làm trước duyệt** (5 sự kiện của D6.2). **T10b** thêm `declined` sau 8d-1.

**T11. Nhật ký và bất biến.**
- **Bài:** `src/audit-invariants.test.ts`, ca gieo hỏng cho:
  - R-VC-26: đề nghị `CONFIRMED` mà số suất có `closed_transfer_id = r` ≠ số suất có `transfer_id = r`;
  - R-VC-27: suất `TRANSFERRED` thiếu `closed_transfer_id`, hoặc trỏ đề nghị chưa `CONFIRMED`;
  - R-VC-28: `CONFIRMED` + `NGUOI` mà có `LOI`;
  - R-VC-29: tầng dòng kiểm lệch danh mục;
  - R-VC-30: đề nghị đang chờ mà điểm hoặc chuyến nguồn đã đổi.
  - Mã R-VC-26..30 do điều phối cấp.
- **Đỏ mong đợi:** `R-VC-26 không có trong danh sách kiểm`.
- **Sửa ở:**
  - `scripts/audit-checks.mjs` (gần `:861`); R-VC-16 `:670`: N3;
  - `audit-actions.ts:115-157`: 7 nhãn;
  - `giay-to-khong-lo-so.test.ts` phủ `gia_tri` của `GIAY_TO_DICH`;
  - N5 nếu R-VC-17 báo giả.

**T12. Chính sách và lý do.**
- **Bài:** `chinh-sach.test.ts:113` (đủ cột), `kiemChinhSachMoi`, `NHOM_LY_DO_HIEN`.
- **Đỏ mong đợi:** `deepEqual` thiếu `accept_wait_minutes`.
- **Sửa ở:** `src/index.ts:677-706`, `chinh-sach-hien-thi.ts:209`, `web/chinh-sach-dieu-phoi.ts`, `web/ly-do-dieu-phoi.ts`.

**T13. Giao diện tài xế** (`web/cuoc-chuyen.ts`).
- Nút "Nhờ xe khác đón" ở điểm `PENDING`.
- Thẻ trạng thái kèm đếm giờ tính lúc đọc.
- "Chuyển khách sang xe khác" ở khối sự cố (`:379`).
- Ngăn "Đề nghị gửi tới".
- Chữ để ở `xe-dang-chay-man.ts`.
- Bản vẽ: `Điều phối xe đang chạy.dc.html` (V8, V9, V10, CH.1).

**T14. Giao diện văn phòng.**
- `web/chuyen.ts` (`:275`, `:551`, `:709`): nút cứu hộ khi `RUNNING` và có `trip.progress`; danh sách đề nghị chỉ-đọc cho người có `trip.view`.
- Trang mới `web/de-nghi.ts` và `public/de-nghi.html`; menu chỉ cho `trip.override`; nút Duyệt tắt khi có `LOI`.
- `web/dieu-phoi-ui.ts`: nhãn sự kiện.
- Khai `PAGES` và `build:web`.

**T15. Hướng dẫn** (TH-8).
- **Bài:** `huong-dan.test.ts:76` (A4) và bài trần chữ; `nutCuaNhom`.
- **Tài xế** (`huong-dan-tai-xe.ts:61`, còn chỗ 7 phút): viết lại câu "Văn phòng nhận tin ngay và xếp xe cứu hộ…"; thêm "Nhờ xe khác đón", "Nhận / Không nhận".
- **Quản trị:** thay một câu trong mục "Phá lệ khi điều xe" (`huong-dan-quan-tri.ts:148-153`, Đ1 đã sửa mục này nên đo lại) bằng câu trỏ tới [[Đề nghị cần duyệt]]. **Bán hàng:** thêm câu "Chuyển khách sang xe cứu hộ".
- Thiếu chỗ thì người thi công cắt câu ít dùng nhất trong cùng mục. Đây là bề mặt, tự áp. **Ghi đúng nguyên câu đã cắt vào `docs/BACKLOG.md` BL-VC-TRO-GIUP trong cùng commit.**
- Đếm lại `ceil(chữ/150)` và trần 4500.

**T16. Tài liệu.**
- `docs/SYSTEM-DESIGN.md` (mục vận chuyển); data dictionary; CHANGELOG (một mục).
- Sổ thi công: G-A5-x, N1–N5, lời chủ, lượt 8d.
- `BACKLOG:200`: đóng phần D4, giữ V4.
- `docs/SO-HANG-RAO.md`: các dòng ở mục 4, kèm dòng "dựa vào máy chủ" cho người gửi `STOP`.
- Chỉ đề xuất thêm dòng vào bảng Chrome của `web/CLAUDE.md`, không tự sửa.

**T17. Kịch bản Chrome.**
- `docs/evidence/<ngày>-goi-a5/kich-ban/de-nghi-smoke.mjs`: A gửi; B nhận; leo thang; Quản trị duyệt; Bán hàng không thấy menu; Kế toán thấy danh sách chỉ-đọc.
- Cập nhật `docs/evidence/2026-09-29-adr-0049/kich-ban/cuu-ho-smoke.mjs`.

**T18. e2e.** `tests/e2e/chuyen-khach.mjs`, đăng ký trong `run.mjs`:
- 10 tình huống;
- chạy đua NT-A5-20;
- mã lệnh dùng lại;
- tắt công tắc khi có đề nghị chờ (NT-A5-24);
- sau cùng chạy `audit-checks`.

**T19. Kiểm độc lập một vòng.** Ba góc: quyền và lộ tên; lô và CSDL; lời chủ và ADR. Sửa theo phiếu.

---

## 4. Hàng rào: thấy chặn thật (sửa cố ý → đỏ → hoàn nguyên) và nới có tên

Mỗi dòng có một dòng tương ứng ở `docs/SO-HANG-RAO.md`, ghi ngày, phép đột biến, thông báo đỏ.

| Hàng rào | Phép đột biến | Bài phải đỏ |
|---|---|---|
| Khoá ngoại mã luật vào danh mục | Bỏ `REFERENCES` | csdl "mã luật lạ bị chặn" |
| Tầng dòng kiểm khớp danh mục | Bỏ trigger | csdl "tầng lệch bị chặn" |
| Đồ thị trạng thái | Cho `ESCALATED → EXPIRED` | csdl, NT-A5-10 |
| LC-14 (cả vế Đ4) | Bỏ "hai tài xế khác nhau"; bỏ "`ONBOARD` → `RUNNING`" | csdl, NT-A5-4 |
| `confirm_core` | Bỏ "không có `LOI`" | csdl, NT-A5-11 |
| `confirm_may` đọc chính sách hiện hành | Đọc theo `policy_id` lúc gửi | csdl "tắt công tắc khi có đề nghị chờ", NT-A5-24 |
| `_nguoi_nhan` | Bỏ trigger | csdl NT-A5-15 |
| Nhánh LC-15 (`alloc_ins`, `alloc_close`, `stop_ins`) | Bỏ `r.status='CONFIRMED'`; bỏ `TRANSFER_CONFIRMED` khỏi `stop_ins` | csdl, NT-A5-18 |
| `revoke_no_progress` (Đ5) | Đếm mọi `TRANSFER_*` | csdl "đề nghị bị từ chối không chặn thu hồi" |
| Thứ tự lô B | Mở suất trước thêm điểm | `chuyen-khach-lo.test.ts`, csdl `lc04_stop_scope` |
| Mỗi suất một câu INSERT | Gộp mở suất thành một `INSERT…SELECT` nhiều dòng | `chuyen-khach-lo.test.ts` (đếm N) |
| Tự huỷ P4 | Bỏ câu `TRANSFERS_VOID_CUNG_DIEM` | route NT-A5-6, NT-A5-20 |
| `thu-tu-lo` quét tệp mới (siết) | Đặt câu đổi trạng thái trước cổng | TC-32 |
| Đường tin chuyển khách | Bỏ nhánh nguồn | `tin-chuyen.test.ts` |
| Ghim quyền | SALES của `trip.transfer` = `any` | `permissions.test.ts` |
| NT-3(b) ngoại lệ đúng 2 dòng | Thêm dòng `"trip.override"` thứ ba | `lop-vuot.test.ts` |
| Regex `hanh-khach-khong-lo-ten` (siết) | Thêm `tenKhach` vào `DeNghiDto` | `:172` |
| Liệt kê khoá DTO | Thêm `bienSo` vào `XeNhanDto` | `chuyen-khach.test.ts` |
| `tien-do-mot-luat` | Route văn phòng gọi hàm khác | bài cặp |
| `ma-lenh-dung-lai` | Bỏ `traLenhLap` ở `/nhan` | đếm |
| `permission-enforcement` | Đặt truy vấn trước `can(` | bài quét |
| `giay-to-khong-lo-so` | Ghi số giấy tờ vào `gia_tri` | bài quét |
| R-VC-26..30 | Gieo dữ liệu hỏng | `audit-invariants.test.ts` |
| A4 hướng dẫn | Thêm chữ vào Bán hàng | `huong-dan.test.ts:76` |
| Người gửi `STOP` là tài xế A | (không có lớp CSDL) | Ghi "dựa vào máy chủ"; bài route NT-A5-4 |

**Nới có tên (Điều 9.4).**

| Mã | Chỗ nới | Căn cứ |
|---|---|---|
| N1 | Ghim hàng DRIVER thêm `trip.transfer: assigned` | ADR-0052 :190 (chủ đã duyệt) |
| N2 | `lop-vuot.test.ts` NT-3(b): ngoại lệ đúng 2 route duyệt / bác | Trong lời duyệt ADR-0104 :101, :244; tiền lệ G12; ghi ở mục "Hàng rào nới" của ADR mới |
| N3 | R-VC-16 bỏ qua suất `BOARDED` của `ONBOARD` tại nơi gặp | Trong lời duyệt ADR-0052 :72, D5c; tiền lệ G12; ghi ở ADR mới |
| N4 (có điều kiện) | Ghim hàng DRIVER_PARTNER: `trip.transfer` = `assigned` khi A4 đã gộp | ADR-0053 :46 |
| N5 (có điều kiện) | R-VC-17, nếu đo thấy báo giả | ADR-0052 :71; ADR-0051:149 |

**Siết bài kiểm** (không cần duyệt): regex `:172`, phạm vi quét `thu-tu-lo`, bài đếm câu INSERT. **Siết luật nghiệp vụ** Đ4, Đ5 đi qua lượt 8d-2. `TRA_TEN` giữ 2.

---

## 5. Trang ghép chung của lượt 8d (kèm cả 8d-1 và 8d-2)

### 5.1 Bảng × loại thực thể

| Bảng / cột | Thực thể | Ghi bởi lệnh | Xoá | Ai đọc | Lượt |
|---|---|---|---|---|---|
| `vc_transfer_rule` (mới) | Danh mục điều kiện | Chỉ migration | Không; tắt bằng `active = 0` | `kiemChuyen`, nhãn giao diện | 8d-1 (Đ1, Đ2) |
| `vc_transfer_request` (mới) | Đề nghị `STOP` / `ONBOARD` | Gửi, rút, không nhận, nhận, duyệt, bác, hết hạn lười, `VOID` | Không | Tài xế A, B (của mình); văn phòng có `trip.view` | 8d-1 (Đ3); vế `_lc14` ở 8d-2 (Đ4) |
| `vc_transfer_check` (mới) | Bằng chứng điều kiện, kèm `policy_row_id` | Nhận, duyệt | Không, chỉ thêm | Hộp duyệt, bất biến | 8d-1 |
| `vc_trip_allocation.transfer_id`, `.closed_transfer_id` | Suất chuyển vào / ra | Xác nhận, duyệt | Không | R-VC-26/27 | 8d-1 (Đ3) |
| `vc_trip_stop` | Điểm mới ở B (nơi gặp, đón, trả); điểm A `MOVED` | Xác nhận, duyệt | Không | Lịch, tài xế | Đã duyệt (ADR-0052 :70) |
| `vc_trip_manifest` | Dòng thêm ở B | Xác nhận, duyệt (B đã xuất bến) | Không | Manifest | Đã duyệt |
| `vc_trip.commitment_override_*` | Khoá cam kết B | Duyệt khi `CAM_KET_DICH` không đạt | Không | R-VC-25 | 8d-1 (Đ2) |
| `vc_dispatch_policy` (2 cột) | Thời gian chờ, công tắc | Route chính sách (`settings.ops`) | Theo dòng | `kiemChuyen`, trigger `_confirm_may` | Đã duyệt; nghĩa công tắc ở 8d-1 (Đ3) |
| `vc_reason` nhóm `TU_CHOI_NHAN` | Lý do Không nhận / Bác | Gieo; Quản trị sửa | Tắt | Tài xế B, hộp duyệt | Đã duyệt (:62) |
| `vc_trip_event` (7 loại mới) | Sự kiện ở chuyến đích | Mỗi lệnh một sự kiện | Không | Lịch, tin, `revoke_no_progress` | 8d-1 (Đ3); 8d-2 (Đ5) |
| `audit_log` (`trip_transfer_*`) | Nhật ký, `order_id` NULL | Mỗi lệnh một dòng | Không | Nhật ký, hộp thông báo | 8d-1 (Đ3) |

### 5.2 Bản đồ quyền

Thứ tự cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR.

| Ô | Giá trị | Nghĩa trong A5 |
|---|---|---|
| `trip.transfer` (mới, đã duyệt ở ADR-0052 :84) | none, none, none, none, none, any, none, assigned, none (thành assigned khi A4 gộp), none | Gửi, rút, nhận, không nhận; route kiểm "đang lái", áp cả Toàn quyền |
| `trip.override` | none, none, any, none, none, any, … | Thêm nghĩa duyệt / bác |
| `trip.urgent_adjust` (Đ1) | — | Không áp cho A5 |
| `trip.progress` | any, none, any, …, assigned | Văn phòng gửi thay `ONBOARD` |
| `trip.view` | any, any, any, none, none, any, none, assigned, none, none | Xem danh sách đề nghị chỉ-đọc |
| `settings.ops`, `admin.manage` | không đổi | Chính sách; lý do |

`EXTERNAL_PERMISSIONS` và LC-1 không đổi (ADR-0053 :50). Không có quyết định quyền mới trong 8d.

### 5.3 Cổng nào gác cửa nào

| Cửa | Lớp | Ô `can()` | Gác thêm ở route | Cổng lô | Trigger CSDL |
|---|---|---|---|---|---|
| `GET /cuoc-cua-toi/:id/xe-nhan` | `staff` | `trip.transfer` assigned | Đang lái A, không thì 404 | — | — |
| `POST /cuoc-cua-toi/:id/de-nghi` | `staff` | `trip.transfer` | Đang lái A (dựa vào máy chủ cho `STOP`) | Cổng A, cổng B | `_lc14` |
| `POST /de-nghi/:rid/rut` | `staff` | `trip.transfer` | Là tài xế A của đề nghị | Cổng A | `_status_forward` |
| `POST /de-nghi/:rid/nhan`, `/khong-nhan` | `staff` | `trip.transfer` | Là tài xế B đang mở | Cổng A + B | `_nguoi_nhan`, `_confirm_may`, `_escalate_has_evidence`, LC-15, LC-01/02/04/09/10 |
| `GET /de-nghi-gui-toi` | `staff` | `trip.transfer` | Là tài xế B | — | — |
| `POST /chuyen/:id/cuu-ho` | `office` | `trip.progress` | Chỉ `ONBOARD` | Như gửi | `_lc14` |
| `GET /chuyen/:id/cuu-ho/xe-nhan` | `office` | `trip.progress` | — | — | — |
| `GET /de-nghi?ngay=` | `office` | `trip.view` | — | — | — |
| `POST /de-nghi/:rid/duyet`, `/bac` | `office` | `trip.override` (N2) | `ESCALATED`; duyệt chạy lại kiểm | Cổng A + B | `_confirm_core`, LC-15 |
| Chính sách | `office` | `settings.ops` | `kiemChinhSachMoi` | — | CHECK cột |

### 5.4 Giao diện ẩn / hiện theo quyền (TH-6)

| Người dùng | Thấy | Không thấy |
|---|---|---|
| Tài xế công ty (`DRIVER`) | Nút "Nhờ xe khác đón" ở điểm chưa tới; "Chuyển khách sang xe khác" ở khối sự cố; ngăn "Đề nghị gửi tới" | Hộp duyệt |
| Tài xế đối tác, trước A4 | Không gì (`trip.transfer = none` nên `can()` sai, nút ẩn; gọi route thì 403) | Mọi nút chuyển khách |
| Tài xế đối tác, sau A4 (N4) | Như tài xế công ty, trên chuyến mình lái | — |
| Bán hàng | Nút "Chuyển khách sang xe cứu hộ" (`trip.progress`) khi chuyến `RUNNING`; danh sách đề nghị chỉ-đọc trong chi tiết chuyến (`trip.view`), gồm chữ nơi gặp đã che và bảng `kiem[]` | Menu "Đề nghị cần duyệt", nút Duyệt / Bác |
| Kế toán | Danh sách đề nghị chỉ-đọc trong chi tiết chuyến (`trip.view = any`), gồm nơi gặp đã che | Nút cứu hộ (`trip.progress = none`), menu duyệt |
| Quản trị, Toàn quyền | Mọi thứ trên, cộng menu + huy hiệu "Đề nghị cần duyệt", nút Duyệt (tắt khi có `LOI`) / Bác | — |

---

## 6. Rủi ro, chồng lấn, thứ tự phát hành, điểm còn bất định

### Chồng lấn

| Nhánh | Chỗ đụng A5 |
|---|---|
| **Đ1** (`adr-0104-d1` @ `45731dea`) | `dieu-phoi.ts`, `index.ts`, `tin-chuyen.ts` (đường tin: A5 thêm đường riêng, không sửa nhánh điều chỉnh khẩn cấp), `chuyen-repo.ts:821-869` (A5 nối thêm vào `CHUYEN_CHO_TIN` / `LAI_CHO_TIN`), `moc-toi-thieu.ts`, `huong-dan-*.ts`, `lop-vuot.test.ts`. A5 đi sau |
| **Đ2** (0089) | Máy đồng bộ; ngoại lệ thứ tự lô; view `v_ord_leg_commit`. NT-A5-25. A5 đi sau |
| **ADR-0105** (0090) | `trongKhungXemKhach` cho tài xế đối tác sau khi xác nhận |
| **ADR-0109** | Không migration, không tệp chung |
| **ADR-0110** (đã duyệt, chờ chép mục lục) | Luật thứ tự điểm: chỉ chặn lệnh tạo chỗ đảo mới. A5 sắp lại điểm chưa tới ở B bằng `sapDonTruocTra`, nên không tạo chỗ đảo mới; bài NT-A5-6 kiểm `suatTraTruocDon` rỗng |
| **G17** | `updateTrip` / tin MQ-07; không tệp chung trực tiếp với A5 ngoài `tin-chuyen.ts` (đo lại ở T0) |
| **A4** (song song) | Ô DRIVER_PARTNER, lọc `CONG_TY`, `permissions.test.ts`; nhánh gộp sau làm N4 |
| **QR** (0087/0088) | Chỉ ảnh hưởng số migration |

### Thứ tự phát hành
Đ1 → Đ2 (0089) → ADR-0105 (0090) và ADR-0109 (không migration) → G17 → A4 / A5 (số sau 0090, tạm 0091 / 0092; chốt khi gộp bằng quét `git for-each-ref` + `git ls-tree`). Mỗi nhánh một mục CHANGELOG.

### Rủi ro
- **Leo thang nhiều.** Xe B thường chưa chạy và dưới 6 giờ, nên phần lớn đề nghị `STOP` chờ Quản trị (lời chủ Q-L2-B a). Hộp duyệt phải nhanh.
- **Tài xế B chưa dùng Nền tảng:** đề nghị hết hạn sau 10 phút; dự phòng bằng đường lượt 1.
- **`VOID` không có tin:** tài xế B biết khi mở lại màn hình, hoặc nhận 409 `da_huy`.
- **Lô lớn:** số câu = K + 2N (+N) + R; xe 16 chỗ khoảng 75–80 câu, trên mức 74 của lô lớn nhất đang có. Trần `db.batch` trên D1 production **chưa kiểm**; T0 đo trên D1 local.
- **Cứu hộ có một khách của đơn đã huỷ sau khi xếp:** `CHANG_KHACH_HIEU_LUC` (tầng `LOI`) chặn cả đề nghị `ONBOARD`, nên chỉ Bác được. Lúc đó dùng đường lượt 1. Ghi rõ trong ADR mới (Đ2) để chủ thấy.
- **Nơi gặp ở cuối danh sách điểm của B:** tài xế B tự đổi thứ tự bằng nút ↑ ↓.

### Điểm còn bất định (ghi sổ, kiểm ở T0)
- `KHOANG_NGHI_DICH` thực tế chỉ ra `CANH_BAO`; `TRUNG_GIO_DICH`, `HANG_BANG_DICH` gần như luôn `DAT`. Ghi trong ADR mới.
- `vc_trip_departed_after_plan`, `vc_trip_event_after_departure` gặp `TRANSFER_*` trên chuyến `PLANNED`.
- Trigger gắn `version` với `last_cmd_id` (G-A5-12).
- Bỏ qua điểm nơi gặp khi điểm mang suất `BOARDED`.
- Trần `db.batch` D1.
- Bộ 24 bước lượt 1 (`xe-a-b-luot-1.json`) vẫn chờ chủ xác nhận; điều phối quyết có hỏi gộp không.
- Nội dung THẤP-15 của Đ1.

### Critical Files for Implementation
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/docs/adr/ADR-0052-dieu-phoi-luot-2-chuyen-diem-va-xe-dang-chay.md
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/migrations/0085_dieu_chinh_chuyen.sql
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/modules/van-chuyen/dieu-phoi.ts
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/modules/van-chuyen/chuyen-repo.ts
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/shared/tin-chuyen.ts