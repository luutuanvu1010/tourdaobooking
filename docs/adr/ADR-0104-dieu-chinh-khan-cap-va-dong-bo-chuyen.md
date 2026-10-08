# ADR-0104 — Điều chỉnh khẩn cấp sát giờ và Đồng bộ chuyến theo đơn

- **Trạng thái:** **accepted** 2026-10-08 — chủ dự án trả lời lượt duyệt 8a qua câu hỏi chọn phương án; nhãn đã chọn nguyên văn: Đ1 **"Duyệt, Bán hàng cũng được"**, tức **Q-1 = b** (khác khuyến nghị); Đ2 **"Duyệt, máy tự thêm ghế khi còn chỗ (Recommended)"**, tức **Q-2 = a**, kèm việc nới đúng một chỗ của bài kiểm thứ tự ghi (phần ghi của đơn được đứng đầu lô). Ghi ở sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`, mục "Lượt duyệt 8a" (nhánh `claude/van-chuyen-goi-a-c` @ `4fd27fe1`). Hai điểm bổ sung chủ xác nhận cùng ngày 2026-10-08 qua câu hỏi chọn phương án, ghi ở sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`, dòng "Câu hỏi thêm 8/10" (nhánh `claude/van-chuyen-goi-a-c` @ `ea474b4d`): cam kết **"Cho bỏ qua cả hai (Recommended)"** — dưới mốc, Bán hàng bỏ qua được cả cam kết xe riêng lẫn số chỗ tối thiểu (mã `CAM_KET`, không tách), mỗi lần đều phải chọn lý do; sát giờ **"Chỉ khi chuyến còn dưới 6 giờ (Recommended)"** — chuyến còn hơn 6 giờ mới chạy thì bỏ qua khoảng nghỉ và cam kết vẫn chỉ Quản trị, Toàn quyền làm được, và vẫn gọi là "Phá lệ" (Đ1 mục 0b, mục 2); riêng lệnh sửa chuyến dời giờ vào trong 6 giờ thì "dưới mốc" xét theo giờ sớm nhất của cả lệnh — chủ xác nhận 2026-10-08 qua câu hỏi chọn phương án, nhãn nguyên văn **"Cho qua, tính là sát giờ (Recommended)"** (sổ thi công, mục "Lượt duyệt 8a") (Đ1 mục 0). Thân văn bản trình duyệt (tệp 02) viết theo Q-1 a; bản này viết lại mọi chỗ theo Q-1 b. AI soạn bản chép, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. **Bổ sung bởi [ADR-0107](ADR-0107-ban-hang-dat-gap-sat-gio.md)** (accepted 2026-10-08): phần đặt gấp phía đơn mà Đ1 mục 7 để cho "ADR-0107 (số tạm)" nay đã duyệt với số chính thức; nhãn chặng "Điều chỉnh khẩn cấp" (trang đơn, thẻ chặng trên lịch chung) là dấu đặt gấp (cột `short_notice_*`), khác nguồn với nhãn chuyến của Đ1 mục 5. **Sửa câu bởi [ADR-0111](ADR-0111-chuyen-khach-giua-xe.md)** (accepted 2026-10-08, lượt 8d-1 hộp `Nới bài kiểm`, chủ chọn "Đồng ý nới (Recommended)" — chỗ nới N2): bài kiểm 3 (`:277`) có một ngoại lệ có tên — đúng hai dòng `can(staff, "trip.override")` của hai route duyệt / bác đề nghị chuyển khách leo thang (ô đã giữ ở `:101`, `:244`), không dòng nào mang `"trip.urgent_adjust"`; thêm hay mất một dòng là bài đỏ; nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0111 (dòng ★).
- **Ngày:** 2026-10-08.
- **Văn bản trình duyệt:** `docs/superpowers/specs/2026-10-08-luot-duyet-van-chuyen/02-de-xuat-adr-dieu-chinh-khan-cap-va-dong-bo-chuyen.md`; trang ghép `docs/superpowers/specs/2026-10-08-luot-duyet-van-chuyen/00-trang-ghep.md` (hai hồ sơ có ngày, đóng băng; chỗ đổi nghĩa do Q-1 b ghi ở Đ1 mục 9 của bản này).
- **Thay:** đề xuất ADR-0091 ("Bán hàng phá lệ mốc 6 giờ, nhãn 'Ngoại lệ 6 giờ'", `docs/superpowers/specs/2026-10-02-luot-duyet-3-pin-tam-va-ngoai-le-6-gio.md`, chưa từng được duyệt) **ở phần xếp xe**. Phần đặt gấp phía đơn chuyển sang ADR-0107 (số tạm, lượt 8b). ADR-0093 trong cùng tệp đó không bị đụng.
- **Sửa:** ADR-0049, ADR-0050, ADR-0052, ADR-0056, ADR-0007 điều 4(b) — từng câu ở mục "Câu ADR bị thay".
- **Mốc đo mã:** `tệp:dòng` đo trên `claude/van-chuyen-goi-a-c` @ `809918d5` (như văn bản trình duyệt), trừ chỗ ghi `@4fd27fe1`.
- **Xây trên lỗ đang hở:** không. HC-5.11 (tác vụ tự động không định danh): Đ2 chạy trong lô lệnh của người và ghi `staff_id` người đó (mục "Sổ dừng dây chuyền").
- **Cửa:** xem mục "Cửa một chiều / hai chiều".
- **Thi công:** sau khi A1 gộp, vì cả hai cùng sửa `src/modules/van-chuyen/dieu-phoi*` (sổ thi công, mục "Lượt duyệt 8a").

## Lời chủ dự án

- Nhiệm vụ gốc (2026-10-08): *"Cơ chế điều chỉnh khẩn cấp sát giờ: KHÔNG dùng khái niệm 'Xin phá lệ'. Áp dụng phân quyền vai trò (Role-based): Cho phép Điều phối viên (Dispatcher) và Quản trị thực hiện điều động/rút khách sát giờ qua chức năng 'Điều chỉnh khẩn cấp' (bắt buộc chọn/nhập lý do nghiệp vụ và tự động ghi nhật ký audit_log). Xây dựng lệnh máy tự động 'Đồng bộ chuyến theo đơn' (lenhCapNhatKhach) để tự giải phóng/mở lại suất khi Bán hàng hủy/bớt khách trên đơn mà không bị vướng mốc khóa."*
- Chat 2026-10-08: *"Bán hàng và Quản trị"* (ai được Điều chỉnh khẩn cấp). Nền tảng không có vai "Điều phối viên"; người giữ ô xếp xe `trip.dispatch` là Bán hàng, Quản trị, Toàn quyền (`src/shared/permissions.ts:188`).
- 2026-10-02 (câu 5, lượt 3): *"cho phép (nhưng phải có nhãn hoặc ký hiệu riêng để nhận biết đây là ngoại lệ được cho phép và/hoặc đáng chú ý, không phải đơn bình thường)"*.
- Lượt duyệt 8a (2026-10-08), câu hỏi Q-1 nguyên văn: *"Ngoài việc với khách, Bán hàng có được Điều chỉnh khẩn cấp các việc sau sát giờ không: đổi xe, đổi tài xế, huỷ chuyến còn khách, bỏ qua khoảng nghỉ giữa hai chuyến, bỏ qua cam kết xe riêng?"* — chủ chọn **"Duyệt, Bán hàng cũng được"**.
- Câu hỏi Q-2 nguyên văn: *"Khi đơn thêm khách, máy có tự thêm ghế trên cùng xe nếu xe còn chỗ không?"*, phương án (a): *"chỉ thêm đúng số khách vừa thêm trên đơn, trên đúng xe đó, cùng điểm đón, khi xe còn chỗ và không phạm cam kết xe riêng. Không đủ chỗ thì giữ xe và báo người xếp xe."* — chủ chọn **"Duyệt, máy tự thêm ghế khi còn chỗ (Recommended)"**.
- 2026-10-08, hai câu bổ sung của lượt 8a, nhãn đã chọn nguyên văn, ghi ở sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`, dòng "Câu hỏi thêm 8/10" (nhánh `claude/van-chuyen-goi-a-c` @ `ea474b4d`) (người soạn không có nguyên văn câu hỏi; nội dung phương án theo điều phối chuyển lại):
  - cam kết: **"Cho bỏ qua cả hai (Recommended)"** — dưới mốc, Bán hàng bỏ qua được cả cam kết xe riêng lẫn số chỗ tối thiểu (mã `CAM_KET`, không tách), mỗi lần đều phải chọn lý do;
  - sát giờ: **"Chỉ khi chuyến còn dưới 6 giờ (Recommended)"** — khi chuyến còn hơn 6 giờ mới chạy, bỏ qua khoảng nghỉ và cam kết vẫn chỉ Quản trị, Toàn quyền làm được (`trip.override`), và vẫn gọi là "Phá lệ". Ngoại lệ: lệnh sửa chuyến dời giờ vào trong 6 giờ thì tính là sát giờ ngay trong lệnh đó — "Cho qua, tính là sát giờ (Recommended)" (Đ1 mục 0).
- **Nguồn phân tích:** `docs/superpowers/specs/2026-10-07-danh-gia-erp-van-chuyen-ban-hang.md`: C03, C04, C05, C06, N2 và Gói B (B1, B2).

## Bối cảnh mã (đo @ `809918d5`)

| Điểm | Hiện trạng | Nguồn |
|---|---|---|
| Bảy lệnh khoá theo mốc | `XEP, RUT, DOI_DI, DOI_DEN, DOI_XE, DOI_TAI_XE, HUY_CO_KHACH` | `src/shared/moc-toi-thieu.ts:65`; lệnh không khoá `DOI_DIEM_THEO_CHANG`, `DOI_KHACH_THEO_DON` `:56-62` |
| Dấu đặt gấp miễn mốc lúc xếp | chỉ `XEP`, `DOI_DEN` | `moc-toi-thieu.ts:67, :104` |
| Luật được phá lệ | `MOC_TOI_THIEU`, `KHOANG_NGHI`, `CAM_KET` | `src/shared/dieu-phoi-kieu.ts:85` |
| Một ô canh cả ba luật | các route hỏi `(phaLe ‖ nghiPhaLe ‖ camKetPhaLe) && !can(trip.override)` | `src/modules/van-chuyen/index.ts:1124, 1197, 1230, 1277, 1325, 1348, 1373` |
| Ô | `trip.dispatch` SALES/ADMIN/SA `any`; `trip.override` ADMIN/SA `any` | `src/shared/permissions.ts:188, 189` |
| Xe đang chạy luôn trong mốc | — | `src/shared/dieu-phoi-kiem.ts:277` |
| Phá lệ được lưu | `vc_trip_event.override_rule_code`, `override_reason_code` | `migrations/0042_chuyen_xe.sql:164-165, :175` |
| Lý do phá lệ | nhóm `PHA_LE` của `vc_reason` (dữ liệu, Quản trị sửa — `admin.manage`); gieo "Sự cố vận hành", "Đơn đặt gấp", "Khác" | `migrations/0041_chinh_sach_dieu_phoi.sql:119-122` |
| Lệnh "Cập nhật khách theo đơn" | chỉ chuyến `PLANNED`; chỉ suất mang khoá người không còn trong đơn; **bỏ qua** đơn huỷ / chặng đóng; không đóng suất thừa chưa tên | `src/modules/van-chuyen/dieu-phoi-lenh.ts:602-654` (bỏ qua ở `:619`); `src/shared/dieu-phoi-kiem.ts:174, :179, :198` |
| Lô của lệnh đó | cổng → nhật ký → **một** sự kiện → đóng / mở suất → bỏ điểm → cam kết | `src/modules/van-chuyen/dieu-phoi.ts:465-477`; sự kiện lấy id = mã lệnh (`:78-82`) |
| Giữ khi đơn huỷ / thiếu / thừa suất | `DON_DA_HUY`, `THIEU_SUAT`, `THUA_SUAT` | `dieu-phoi-kiem.ts:405, :424, :425` |
| Tin chuyến cho tài xế | danh sách đóng, **không** có xếp / rút / dời khách; có `trip_allocation_office_cancelled` | `src/shared/tin-chuyen.ts:8-12` |
| Mã đóng suất | `CHECK` tập đóng 7 giá trị | `migrations/0042_chuyen_xe.sql:133` |
| Báo huỷ trên xe đang chạy | trigger chỉ cho đặt cờ `office_cancel_*` khi lệnh cuối của chuyến là sự kiện `ALLOCATION_OFFICE_CANCELLED` của **đúng suất đó** | `migrations/0076_xe_dang_chay.sql:46-54`; bài `src/modules/van-chuyen/xe-dang-chay-csdl.test.ts:297` ("lô không phải báo huỷ" bị chặn) |
| Cổng thắng của lệnh đơn | `wonGuard` = `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`; thua thì mọi câu sau lặng lẽ không chạy | `src/modules/orders/repository.ts:769, :944` |
| Bài thứ tự lô | câu cổng đứng đầu; ngoại lệ có tên `GHI_NGOAI` cho câu do module khác cấp | `src/modules/van-chuyen/thu-tu-lo.test.ts:3-13` |
| Hàm tiêm từ gốc lắp ráp | `isAssigned`, `mocToiThieu`, `baoThayDoiChuyen` | `src/index.ts:64, :104, :158-159` |
| Không module nào import `van-chuyen` | — | `src/architecture.test.ts:58-63` |

## Quyết định

### Đ1. Điều chỉnh khẩn cấp (Q-1 = b)

0. **"Chuyến dưới mốc" — mỗi lệnh đúng một định nghĩa, là phép xét mốc lệnh đó đang dùng cho luật khoá.** Máy chủ tính một lần mỗi request, theo mốc của chính sách hiện hành:
   - xếp, rút, dời, thêm khách khi xe chạy, huỷ chuyến: `gioXetMocXep(chuyen) − bây giờ < mốc` (phép tính của `kiemMocXep`, khoá dính theo giờ sớm nhất từng có — `src/shared/moc-toi-thieu.ts:91`, `:110-118` @`4fd27fe1`); lệnh dời xét chuyến đích, nơi khoảng nghỉ và cam kết được kiểm; xe đang chạy luôn dưới mốc (`src/shared/dieu-phoi-kiem.ts:277` @`4fd27fe1`);
   - sửa chuyến `PUT /chuyen/:id`: giờ xét = `min(giờ cũ, giờ mới, giờ sớm nhất từng có)`, đúng như luật khoá đổi xe / đổi tài xế (`src/shared/dieu-phoi-kiem.ts:145-148` @`4fd27fe1`);
   - tạo chuyến: giờ bắt đầu của chuyến mới (lệnh tạo không có luật khoá mốc, cùng chú thích `:145`).
   - Dấu đặt gấp của chặng **không** làm chuyến thôi dưới mốc: dấu chỉ miễn luật mốc của `XEP`, `DOI_DEN` (`moc-toi-thieu.ts:78-79`, `:116` @`4fd27fe1`; bảng bối cảnh đo @`809918d5` ghi `:67, :104`), không đổi thời điểm.
   - **Rào mềm, nói thẳng:** dời giờ một mình không bị khoá mốc (`dieu-phoi-kiem.ts:145-146`). Vì vậy Bán hàng có thể dời giờ một chuyến vào trong 6 giờ trước (lệnh trước, hoặc ngay trong cùng lệnh sửa), rồi vượt khoảng nghỉ với lớp khẩn cấp. Đây là hệ quả của luật lấy giờ xét `min(cũ, mới, sớm nhất)` cho lệnh sửa chuyến (phiếu kiểm bản chép, mục I-3: một lệnh một định nghĩa), **không** phải của lời chủ. Lớp bù: lý do bắt buộc, nhật ký ghi người và lý do; bài kiểm 1 ghim ca này để ai đổi phải đổi có chủ ý.
   - **Ca một lệnh — chốt cách (a), giữ I-3:** chuyến đang còn hơn 6 giờ, Bán hàng trong **cùng** lệnh sửa vừa dời giờ vào trong 6 giờ vừa vượt khoảng nghỉ → lớp khẩn cấp, Bán hàng làm được. Lời chủ "Chỉ khi chuyến còn dưới 6 giờ" được hiểu là trạng thái của chuyến **trong** lệnh đó: sau lệnh, chuyến thật sự nằm dưới mốc. Cách (b) bị loại — riêng lớp quyền của khoảng nghỉ, cam kết ở lệnh sửa chuyến xét theo giờ trước khi sửa (`min(cũ, sớm nhất)`): (b) chỉ chặn ca một lệnh, còn ca hai lệnh (dời giờ trước, vượt khoảng nghỉ sau) vẫn qua, nên tạo cảm giác có rào mà không thêm rào thật, lại làm lệnh sửa có hai định nghĩa. Điều phối đề xuất (a) (lý do như trên); chủ xác nhận 2026-10-08 qua câu hỏi chọn phương án, nhãn nguyên văn **"Cho qua, tính là sát giờ (Recommended)"** (sổ thi công, mục "Lượt duyệt 8a").
0b. **"Cam kết" trong ADR này = cam kết xe riêng và số chỗ tối thiểu (mã `CAM_KET`, không tách)** — chủ xác nhận 2026-10-08, **"Cho bỏ qua cả hai (Recommended)"**; mỗi lần bỏ qua đều phải chọn lý do. Mã gồm cả R-XR (`src/shared/cam-ket-xe.ts:66`) lẫn R-CX (`:72`), chung một cờ `camKetPhaLe`, nhãn "Trái cam kết xe riêng / số chỗ tối thiểu" (`src/shared/ly-do-giu.ts:63`; cả hai tệp @`4fd27fe1`).
1. **Ô mới `trip.urgent_adjust`** (nhãn giao diện "Điều chỉnh khẩn cấp"):
   - SALES `any`, ADMIN `any`, SUPER_ADMIN `any`; mọi cột khác `none`.
   - Phạm vi: vượt mốc ở **mọi** lệnh bị khoá; vượt khoảng nghỉ và cam kết (mục 0b) **khi chuyến dưới mốc** (mục 0).
   - Bài ghim: ô này không rộng hơn `trip.dispatch` ở mọi cột (khuôn bài ghim của `trip.call_ack`, `permissions.ts:198-201`).
   - Không thêm mã quyền, nên `EXTERNAL_PERMISSIONS` và trigger LC-1 không đổi.
   - Thi công phải sửa hai bài sẵn có: `src/shared/permissions.test.ts:95` (bảng ADR trong bài có hàng ô mới) và `src/shared/tro-ly-cau-truc.test.ts:38-39` (mọi ô có tên trong `TEN_THAO_TAC` của `src/shared/tro-ly-cau-truc-ten.ts`). Đây là thêm hàng, không phải nới.
2. **Hàm thuần xếp lớp** (đặt ở `src/shared/moc-toi-thieu.ts`; trả `"KHAN_CAP"` hoặc `"QUAN_TRI"`, không trả tên ô):
   - `lopVuotMoc(lenh)`: cả bảy lệnh bị khoá `XEP`, `RUT`, `DOI_DI`, `DOI_DEN`, `DOI_XE`, `DOI_TAI_XE`, `HUY_CO_KHACH` (`moc-toi-thieu.ts:77` @`4fd27fe1`) và lệnh thêm khách khi xe chạy (xét mốc như `XEP`, `dieu-phoi-kiem.ts:279` @`4fd27fe1`) → `"KHAN_CAP"`. Dưới Q-1 b hàm luôn trả `"KHAN_CAP"`. Hàm vẫn giữ để có **một** chỗ quyết (bài kiểm 3) và để còn tách lớp sau (ví dụ chủ muốn trả một lệnh về Quản trị) mà không sửa bảy route.
   - `lopVuotNghiCamKet(duoiMoc)` (tên đề xuất): chuyến dưới mốc → `"KHAN_CAP"`; ngoài mốc → `"QUAN_TRI"`. Đây là lời chủ 2026-10-08, **"Chỉ khi chuyến còn dưới 6 giờ (Recommended)"**; lớp `QUAN_TRI` vẫn mang chữ "Phá lệ".
   - Route đổi lớp thành ô bằng tên viết **tường minh**: `lop === "KHAN_CAP" ? can(staff, "trip.urgent_adjust") : can(staff, "trip.override")`, vì hàng rào "mỗi ô phải được máy chủ hỏi" chỉ đếm chuỗi ô viết thẳng (`src/permission-enforcement.test.ts:14`).
   - **Bảy chỗ hỏi ô** (`src/modules/van-chuyen/index.ts` @`4fd27fe1`): `:1124` tạo chuyến (khoảng nghỉ); `:1197` sửa chuyến `PUT /chuyen/:id` — đổi xe, tài xế, giờ (mốc, khoảng nghỉ, cam kết); `:1230` xếp (mốc, cam kết); `:1277` thêm khách khi xe chạy (mốc, cam kết); `:1325` rút (mốc); `:1348` dời (mốc, cam kết); `:1374` huỷ chuyến (mốc). Mỗi chỗ: cờ mốc hỏi theo `lopVuotMoc` (tức `trip.urgent_adjust`); cờ khoảng nghỉ, cam kết hỏi theo `lopVuotNghiCamKet`.
   - `PUT /chuyen/:id` dưới mốc hỏi `trip.urgent_adjust` (văn bản trình duyệt viết theo Q-1 a là `trip.override`).
   - **409 và hộp xác nhận:** `loiKiem` (`src/modules/van-chuyen/dieu-phoi-route.ts:84-97` @`4fd27fe1`) nhận cờ dưới mốc; `canQuyen` (`:96`, hôm nay `= can(trip.override)`) đổi thành "người gọi có đủ ô cho **mọi** luật đang thiếu, theo lớp"; phản hồi 409 kèm lớp (`KHAN_CAP` / `QUAN_TRI`) để hộp xác nhận chọn đúng chữ.
3. **Lý do bắt buộc:**
   - Dùng nhóm `PHA_LE` của `vc_reason`. Mã nhóm giữ nguyên (`0041:133-137` cấm đổi mã). Nhãn nhóm trên giao diện (`src/shared/dieu-phoi-kieu.ts:19`) đổi thành "Điều chỉnh khẩn cấp, phá lệ", vì cùng một danh mục dùng cho cả hai.
   - Danh sách lý do là dữ liệu. Gợi ý cho Quản trị thêm: "Khách đổi kế hoạch sát giờ", "Gộp hoặc tách xe sát giờ".
   - "Khác" không kèm ô chữ (BL-GHI-CHU-CHUYEN, `docs/BACKLOG.md:186`).
4. **Lưu và nhật ký:**
   - Lưu ở cột sẵn có `override_rule_code`, `override_reason_code` của sự kiện (`0042:164-165`); không thêm cột.
   - Nhật ký dùng hành động hiện có của từng lệnh. Đuôi `detail` (`phaLeNhatKy`, `dieu-phoi-route.ts:225-226` @`4fd27fe1`) ghi "điều chỉnh khẩn cấp" cho lô lớp `KHAN_CAP` (mọi luật bị vượt khi chuyến dưới mốc), giữ "phá lệ" cho lô lớp `QUAN_TRI`; cộng số phút còn lại tới giờ xuất bến. Lớp quyết lúc ghi, nên nhật ký luôn đúng.
   - Chỉ mã chuyến, mã đơn, số khách, nhãn lý do (LC-18).
5. **Nhãn trên lịch chung và chi tiết chuyến văn phòng; chữ "Phá lệ" còn dùng ở đâu:**
   - **"Điều chỉnh khẩn cấp"** tính lúc đọc từ **mọi** sự kiện mang `override_rule_code = 'MOC_TOI_THIEU'`, mọi loại — kể cả `UPDATED` (đổi xe, đổi tài xế) và `CANCELLED` (huỷ chuyến còn khách). Văn bản trình duyệt (Q-1 a) chỉ dán nhãn cho sự kiện lệnh khách; Q-1 b đảo điều đó.
   - **"Phá lệ: <lý do>"** (cách hiện hôm nay, `src/shared/dieu-phoi-man.ts:335`) chỉ còn cho sự kiện vượt khoảng nghỉ hoặc cam kết **mà không vượt mốc**. Sự kiện đó có thể do Quản trị, Toàn quyền làm khi chuyến ngoài mốc, nhưng cũng có thể do người giữ `trip.urgent_adjust` làm khi chuyến dưới mốc (bốn ca dưới đây). Vì vậy chữ "Phá lệ" trên lịch **không** cho biết ai làm hay chuyến có dưới mốc không; muốn biết thì xem nhật ký.
   - Trả lời thẳng: dưới Q-1 b, chữ "Phá lệ" chỉ còn ở (i) nhãn chuyến nói trên; (ii) hộp xác nhận và nút khi lớp `QUAN_TRI`; (iii) đuôi nhật ký lớp `QUAN_TRI`; (iv) nhãn nhóm lý do "Điều chỉnh khẩn cấp, phá lệ". Hộp xác nhận, nút và nhật ký của mọi lệnh dưới mốc mang chữ "Điều chỉnh khẩn cấp"; nhãn trên lịch thì lệch ở bốn ca dưới đây.
   - **Chỗ lệch đã biết, không xử lý ở lượt này:** một sự kiện chỉ lưu **một** `override_rule_code`, theo thứ tự `MOC_TOI_THIEU` > `KHOANG_NGHI` > `CAM_KET` (chú thích C6, `src/modules/van-chuyen/dieu-phoi-lenh.ts:41-45`; `:155`, `:171`), và không lưu "dưới mốc hay không". Bốn ca dưới mốc mà không vượt mốc, nên nhãn trên lịch hiện "Phá lệ" dù người làm có thể là Bán hàng (lớp `KHAN_CAP`):
     1. tạo chuyến mới trong mốc kèm vượt khoảng nghỉ;
     2. xếp chặng đã đặt gấp kèm vượt cam kết;
     3. sửa chuyến **chỉ đổi giờ** kèm vượt khoảng nghỉ;
     4. sửa chuyến **chỉ gửi `camKetPhaLe`** (ví dụ sau khi đơn bật "xe riêng").
     Ca 3 và 4 thường gặp. Muốn nhãn đúng tuyệt đối phải lưu lớp vào sự kiện (cột mới, migration); để sau nếu chủ cần.
   - Trang đơn **không** hiện nhãn ở lượt này (`orders` phải đọc qua một view công bố mới của `van-chuyen`); để sau nếu chủ cần.
   - **Không** vào DTO tài xế (danh sách trắng `src/modules/van-chuyen/tai-xe-dto.ts`).
   - Không tin cho Quản trị, không ô đếm trên Trang chủ (khác ADR-0091 đ6–đ7).
6. **Tin cho tài xế:**
   - Lệnh khách lớp `KHAN_CAP` (xếp, rút, dời) trên chuyến đã có dòng lái mở → tin tới tài xế đang lái (không tên, không SĐT). Cờ dấu cấp qua `ctx.chuyenChoTin` từ cột `override_rule_code` và loại sự kiện; `thongbao` không đọc `detail`. Thêm vào `HANH_DONG_TIN_CHUYEN` (`src/shared/tin-chuyen.ts:8-12`), kèm điều kiện có dấu.
   - Đổi xe, đổi tài xế, huỷ chuyến **đã** có tin qua `trip_edited`, `trip_cancelled` (cùng danh sách); thêm khách khi xe chạy đã có `trip_stop_added_running`. Không thêm tin trùng.
7. **Phía đơn (đặt gấp): không thuộc ADR này** — ADR-0107 (số tạm), lượt 8b.
8. **Không đổi:**
   - luật lõi LC-01…LC-21 (không ai vượt, kể cả Toàn quyền — `docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md:119`), đặc biệt LC-02 sức chứa;
   - con số `min_lead_minutes`; Toàn quyền `any` mọi ô (ADR-0014 điều 2);
   - duyệt / bác đề nghị leo thang của ADR-0052 (`:80-85`) vẫn hỏi `trip.override`.
9. **Chỗ giao diện đổi nghĩa** (lấy theo trang ghép `00-trang-ghep.md` mục 4, đo @`809918d5`; dòng có dấu ★ là chỗ trang ghép viết theo Q-1 a, nay đổi):
   - **Ẩn/hiện:**
     - ★ `canQuyen` → hộp xác nhận (`web/dieu-phoi-ui.ts:57-62`, dòng "Cần Quản trị phá lệ." `:62`): mở khi người gọi đủ ô theo lớp. Bán hàng, chuyến dưới mốc → mở cho mọi luật đang thiếu; chuyến ngoài mốc mà thiếu khoảng nghỉ / cam kết → không mở.
     - Chi tiết chuyến `web/chuyen.ts:44-45` (`coPhaLe`), dùng ở `:121`, `:685`, `:763`, `:772`: nút và dải khoá theo ô của lớp.
     - Thêm khách khi xe chạy `web/chuyen.ts:657-660` (`KHOA_THEM_DIEM`): Bán hàng thêm được, dòng khoá bỏ.
     - Bảng điều phối `web/dieu-phoi.ts:47` (`co.phaLe`), dùng ở `:438`: theo ô của lớp.
     - Dòng khoá màn điều phối `src/shared/dieu-phoi-man.ts:118, :138, :212`: theo lớp.
     - ★ Sửa chuyến `web/chuyen-sua.ts:181`, nút `:294` "Phá lệ và lưu": nay **đổi**. Chuyến dưới mốc → Bán hàng thấy, chữ "Điều chỉnh khẩn cấp và lưu"; ngoài mốc mà vượt khoảng nghỉ / cam kết → chỉ Quản trị, Toàn quyền, chữ giữ "Phá lệ và lưu".
   - **Chỉ đổi chữ:**
     - Hộp xác nhận `web/dieu-phoi-ui.ts:120, :126, :127`: theo lớp 409 trả về — `KHAN_CAP` "Điều chỉnh khẩn cấp", `QUAN_TRI` "Phá lệ".
     - Nút `web/chuyen.ts:739, :896, :928`; `web/dieu-phoi.ts:503`: "Điều chỉnh khẩn cấp và …" khi chuyến dưới mốc.
     - ★ Nút `web/chuyen.ts:966` "Phá lệ và huỷ" (huỷ chuyến còn khách): nay **đổi** thành "Điều chỉnh khẩn cấp và huỷ", Bán hàng thấy. Lệnh huỷ chỉ cần vượt luật mốc, nên luôn thuộc lớp khẩn cấp.
     - Nhãn nhóm lý do `src/shared/dieu-phoi-kieu.ts:19`: "Phá lệ" → "Điều chỉnh khẩn cấp, phá lệ".
     - ★ `src/shared/ly-do-giu.ts:58-59`: `MOC_TOI_THIEU` → "người xếp xe điều chỉnh khẩn cấp"; `KHOANG_NGHI` (`:59`) và `CAM_KET` (`:63`) → `aiXuLy` theo mốc (chuyến dưới mốc: người xếp xe; ngoài mốc: Quản trị).
     - Hướng dẫn `src/shared/huong-dan-ban-hang.ts:124, :126, :142`: viết lại cùng lần phát hành, có cả đổi xe, đổi tài xế, huỷ chuyến sát giờ.
     - ★ Tên ô cho trợ lý Mai `src/shared/tro-ly-cau-truc-ten.ts:124-125`: thêm `trip.urgent_adjust` "vượt mốc mọi lệnh bị khoá; khoảng nghỉ, cam kết khi chuyến dưới mốc"; `trip.override` còn "khoảng nghỉ, cam kết khi chuyến ngoài mốc; duyệt đề nghị leo thang".
     - ★ Nhãn "Điều chỉnh khẩn cấp" trên lịch / chi tiết chuyến: dán cả lên đổi xe, đổi tài xế, huỷ chuyến còn khách dưới mốc (Đ1 mục 5); không vào DTO tài xế.
     - Phản hồi lệnh đơn và màn "Xe đang chạy": câu nhắc cố định "văn phòng bấm Báo huỷ" (Đ2 mục 7), không đổi so với văn bản trình duyệt.

### Đ2. Đồng bộ chuyến theo đơn (Q-2 = a)

1. **Nơi chạy — câu chưa chạy, CÙNG một lô với lệnh đơn** (Hiến chương 1.2 "một lô ghi nguyên khối" `docs/ARCHITECTURE.md:25`; 5.3 "câu lệnh chưa chạy do module chủ cấp" `:95`):
   - Hàm dựng lô thuần mới trong `src/modules/van-chuyen/dieu-phoi.ts` (tên đề xuất `loDongBoChuyen(db, { cauDon, khuc })`; tên bắt đầu `lo…` và được xuất để bài thứ tự lô tự quét thấy) **nhận danh sách câu đơn đã soạn** (`cauDon`, chưa chạy) cùng kế hoạch từng khúc chuyến, và **trả danh sách đầy đủ chưa chạy** `[câu đơn…, khúc chuyến 1…, khúc chuyến 2…]`. `van-chuyen` chỉ **nối** câu đơn đã soạn sẵn vào đầu, không tự soạn hay chạy câu nào trên bảng `ord_*` hay `audit_log`.
   - `sau` = trạng thái đơn **sau** lệnh, do route đơn lấy từ bản kế hoạch của chính nó: đơn huỷ hay không, chặng nào đóng, số người và khoá người theo chặng. `tangTheoChang` = số người lệnh này tăng ở từng chặng; vắng = không tăng.
   - Gốc lắp ráp tiêm `ctx.dongBoChuyen(env, actor, { orderId, auditIdDon, bayGioMs, sau, tangTheoChang, cauDon })` theo khuôn `mocToiThieu` (`src/index.ts:158-159`): hàm này đọc chuyến, lập kế hoạch từng khúc, gọi `loDongBoChuyen`, trả danh sách đầy đủ; điểm gọi ở `orders` (hoặc `dispatch`) chạy **một** `db.batch` trên danh sách đó. `orders` và `dispatch` không import `van-chuyen`. Chọn chiều này (`van-chuyen` nhận câu đơn, không phải `orders` nhận câu chuyến rồi nối sau) để bài thứ tự lô thử được ca "khúc chuyến đứng trước câu đơn → đỏ" (mục 3).
   - **Tiền lệ** gộp câu của hai module vào cùng `db.batch`, theo chiều ngược: tạo đơn nối câu "người phụ trách" của `dispatch` vào sau (`src/modules/orders/index.ts:730-734`; `src/modules/dispatch/service.ts:42-45`).
2. **Điều kiện "cổng đơn đã thắng" — ĐÃ CHỌN phương án (a): view công bố hẹp của `audit`.**
   - Các route sửa đơn **thua lặng lẽ**: câu cổng đơn không khớp thì nhật ký không chèn, mọi câu sau mang `wonGuard` không chạy (`src/modules/orders/repository.ts:769, :944`). Câu chuyến vì vậy phải hỏi đúng dấu đó, nếu không đơn thua mà ghế vẫn bị đóng.
   - **View mới `v_aud_order_cmd`** (tên đề xuất; module `audit`): `SELECT id, order_id, action FROM audit_log WHERE order_id IS NOT NULL AND action IN ('cancelled', 'order_cancelled_by_field', 'order_money_adjusted', 'order_money_adjusted_by_field', 'order_passenger_changed', 'order_leg_updated', 'order_leg_closed')`. Chỉ khoá và nhãn, không `detail`, không người, không giờ.
   - Câu cổng mỗi chuyến: `UPDATE vc_trip SET version = version + 1, last_cmd_id = :cmd WHERE id = :T AND version = :v AND status = 'PLANNED' AND EXISTS (SELECT 1 FROM v_aud_order_cmd WHERE id = :auditIdDon AND order_id = :orderId)`. Điều kiện `order_id` chặn trường hợp truyền nhầm mã nhật ký của đơn khác.
   - **Vì sao tạo view mới, không mở rộng `v_aud_order_event`:**
     - `v_aud_order_event` (`migrations/0025_thong_bao.sql:52-56`) là danh sách cho phép của hộp thông báo (`src/shared/audit-actions.ts:42`); thêm hành động vào đó sẽ sinh tin mới cho người dùng;
     - nó còn mang `staff_id`, `created_at` mà `van-chuyen` không cần.
   - **Không dùng `v_aud_order_change`** (gói A3, nhánh `a3-tin-don-doi`): view đó có `detail` và chỉ `thongbao` được đọc.
   - Phiếu người kiểm ghi: đọc `v_aud_order_event` từ `van-chuyen` thì bài kiến trúc xanh (45/45), đọc thẳng `audit_log` thì đỏ. Người soạn **chưa tự chạy** thử nghiệm đó.
   - **Mỗi điểm gọi phải lộ mã nhật ký của câu cổng đơn** để truyền vào `auditIdDon`. `cancelOrder` hôm nay chưa truyền mã nhật ký rõ: `auditStatement` ở `src/modules/orders/repository.ts:1040` không có `id`. Vì vậy hàm này (và `cancelOrderByHandler` mà `dispatch` gọi, `src/modules/dispatch/index.ts:233`) phải sửa, để sinh `auditId` trước và **trả danh sách câu đơn đã soạn (chưa chạy)** thay vì tự chạy `db.batch`; điểm gọi đưa danh sách đó qua `ctx.dongBoChuyen` rồi chạy một `db.batch` trên danh sách trả về. Các hàm ghi của năm điểm gọi còn lại: người lập kế hoạch kiểm từng hàm.
3. **Thứ tự lô chung:**
   - câu ghi đơn (cổng đơn đứng đầu như hôm nay, không đổi);
   - với mỗi chuyến bị chạm, **một mã lệnh VÀ một `request_id` mới, độc lập** — sự kiện lấy id = mã lệnh và ghi `l.requestId` vào `vc_trip_event.request_id` (`dieu-phoi.ts:78-82`), cột này `UNIQUE` (`migrations/0042_chuyen_xe.sql:161`), nên dùng lại một mã cho hai chuyến thì cả lô hỏng: câu cổng chuyến ở mục 2 → nhật ký `changes() > 0` → **một** sự kiện → các câu suất / bỏ điểm / cam kết mang `EXISTS (… last_cmd_id = :cmd)` (ADR-0049 `:98-108`).
   - Luật C38 của bài thứ tự lô (nhánh `claude/van-chuyen-goi-a-c`, `src/modules/van-chuyen/thu-tu-lo.test.ts:229-231, :256` ở nhánh đó: mỗi lô đúng một câu chèn `vc_trip_event`, câu đó mang nhãn `suKien` và đúng `requestId` của lệnh) tính **riêng cho từng khúc chuyến**: mỗi khúc đúng một câu chèn sự kiện, mang `requestId` của khúc đó.
   - Bài `src/modules/van-chuyen/thu-tu-lo.test.ts` hôm nay đòi câu cổng đứng đầu lô (luật 1, `:4`). Lô chung cần một **ngoại lệ có tên** kiểu `GHI_NGOAI` (`:12-13`): phần đầu là câu của `orders`, sau đó từng khúc chuyến phải tự đúng bốn luật. Đây là **nới hàng rào** (Hiến pháp Điều 9.4), nên nằm trong câu duyệt.
   - **Vì sao một hàm nối cả câu đơn lẫn các khúc chuyến, thay vì hàm lô riêng cho từng chuyến (khỏi phải nới):** câu cổng chuyến hỏi `v_aud_order_cmd`, nên chỉ đúng khi câu nhật ký của đơn đứng **trước** nó trong lô. Nếu `orders` tự ghép các khúc chuyến do từng hàm riêng trả về, không bài nào thấy lô ghép, và một lần ghép sai thứ tự (khúc chuyến đứng trước câu đơn) làm cổng chuyến luôn thua trong im lặng, tức máy không bao giờ đồng bộ mà không ai biết. Một hàm `lo…` trong `dieu-phoi.ts` nhận câu đơn làm đầu vào thì bài thứ tự lô kiểm được cả lô ghép: câu đơn đứng đầu, rồi từng khúc chuyến đủ bốn luật.
4. **Điểm gọi** — `await` trong request, không `waitUntil`, không hàng đợi (ĐP8, ADR-0049 `:364`):
   - `orders`: `POST /api/orders/:id/status` (huỷ, `src/modules/orders/index.ts:1018`), `POST …/legs/:legId/close` (`:909`), `PUT …/legs/:legId` (`:891`), `POST …/passengers` (`:973`; một route cho thêm, sửa, huỷ dòng khách), route văn phòng sửa số khách của ADR-0063 D1;
   - **C14** `POST /api/orders/:id/legs/:legId/replace` (nhánh `c14-thay-chang`, `src/modules/orders/index.ts:935` ở nhánh đó; lô ghi `order_leg_closed` có `auditId` rồi `order_leg_added`, `src/modules/orders/repository.ts:1355-1361` ở nhánh đó);
   - `dispatch`: `handler-cancel` (`src/modules/dispatch/index.ts:218`), `handler-money-edit` (`:247`).
   - Không cần hook (đã đối chiếu mọi khai báo route ghi của hai module): `POST /api/orders` (`:705`), `PUT /api/orders/:id` (`:766`, chỉ đơn nháp), `PUT …/trip` (`:823`), `POST …/legs` (`:866`, chặng mới chưa có suất), `short-notice` (`:930`), `booker` (`:994`), `cancel-reason` (`:1085`), `PUT …/handler` (`dispatch :157`). Đổi giờ / nơi vẫn theo VK1-B (giữ + nút).
   - Route tài xế ghi tên khách (`src/modules/van-chuyen/index.ts:1691`) nằm trong `van-chuyen`: lệnh này có tự gắn suất hay phải gọi luật đồng bộ thì **chưa kiểm**.
   - Bài tĩnh mới: mọi route trong danh sách trên phải gọi hook (khuôn `src/bang-tin-guard.test.ts`).
5. **Phạm vi và trần:**
   - Chỉ các chuyến có suất mở của chặng thuộc **đúng đơn đó**.
   - Lệnh mới `DONG_BO_THEO_DON` có trong `LENH_XEP`, **ngoài** `LENH_KHOA_THEO_MOC` (khuôn `DOI_KHACH_THEO_DON`, `moc-toi-thieu.ts:60-61`). **Không** miễn luật lõi (LC-01, 02, 09, 10, 15).
   - **Trần: phần chuyến của một lô tối đa 74 câu** (bằng lô lớn nhất đang có, `updateDraftOrder`, `docs/SYSTEM-DESIGN.md:1154`). Trần **chỉ tính phần chuyến**; tổng lô = phần đơn của route + phần chuyến. Hàm tính trước khi nối; vượt thì trả lại đúng danh sách câu đơn, **không nối khúc chuyến nào**, phản hồi lệnh đơn báo "chuyến cần cập nhật tay", chuyến giữ như hôm nay. Đếm câu ở mục "Đếm câu" bên dưới.
6. **Luật trên chuyến `PLANNED`.** Một hàm thuần ở `src/shared/`, mở rộng `suatKhachDaDoi` / `moLaiSauDoiKhach`, dùng chung cho máy và cho nút tay:
   - (i) Đơn huỷ, chặng đóng, đơn không còn xác nhận → đóng mọi suất mở của chặng trên chuyến, mã `REMOVED`.
   - (ii) Khoá người không còn trong đơn → đóng `PASSENGER_CHANGED` rồi mở lại theo `moLaiSauDoiKhach` (như lệnh hôm nay).
   - (iii) Suất mở của chặng (đếm trên mọi chuyến, như `kiemXep`) nhiều hơn số người → đóng phần thừa **trên chuyến này**: suất chưa tên trước (theo thứ tự mã suất). Nếu còn thừa mà mọi suất còn lại mang tên người vẫn trong đơn → **không đoán**, giữ `THUA_SUAT`. Chặng có suất mở trên hơn một chuyến → không đoán, giữ.
   - (iv) **Q-2 = a (chủ chọn 8/10): chỉ khi lệnh đơn này vừa tăng người ở chặng đó** (kể cả HDV qua `handler-money-edit`): chặng chỉ nằm trên đúng chuyến này → mở thêm **tối đa số người vừa tăng** (`tangTheoChang`), không lấp phần thiếu có sẵn từ trước. Suất mới cùng điểm lên/xuống của suất hiện có, gắn khoá rảnh (`khoaNguoiRanh`, `dieu-phoi-kiem.ts:188`). Điều kiện: LC-02 còn chỗ và `kiemCamKet` không vi phạm; không đạt thì giữ `THIEU_SUAT`. Chặng đã có mốc giờ hẹn `XEP` từ lần xếp đầu nên **không chụp lại** (bẫy "tái mốc", `migrations/0043_nhac_goi_bao.sql:5`); trigger `vc_trip_allocation_needs_appt` (`:79-81`) là lưới.
   - Điểm hết khách → `SKIPPED` mã `BO_QUA_KHONG_CON_KHACH`; cam kết xe riêng xét lại sau giảm (`camKetSauGiam`). Cả hai theo khuôn `lenhCapNhatKhach`.
7. **Chuyến `RUNNING`: máy không ghi gì vào chuyến.**
   - Lý do: trigger `0076:46-54` chỉ cho đặt cờ báo huỷ khi lệnh cuối của chuyến là sự kiện `ALLOCATION_OFFICE_CANCELLED` của đúng suất đó (bài `xe-dang-chay-csdl.test.ts:297`). Lô đồng bộ mang sự kiện khác nên không đặt được cờ, và mỗi lệnh báo huỷ chỉ phủ một suất.
   - Máy chỉ nhắc, không ghi:
     - phản hồi của lệnh đơn kèm câu **cố định** "Đơn có khách trên xe đang chạy — văn phòng bấm Báo huỷ", không kèm dữ liệu chuyến nào (không mã chuyến, biển số, tài xế); Đối tác, Thực tập, HDV sửa đơn cũng thấy đúng câu này;
     - màn "Xe đang chạy" hiện dòng nhắc tính lúc đọc, cùng nguồn trạng thái đơn mà lý do giữ `DON_DA_HUY` đang dùng (`dieu-phoi-kiem.ts:405`).
   - Tài xế nhận tin khi văn phòng bấm "Báo huỷ", như hôm nay (`trip_allocation_office_cancelled` đã có trong `tin-chuyen.ts:8-12`). ADR-0052 D5.2 không đổi.
8. **Chuyến đã kết thúc hoặc huỷ:** không làm gì (LC-06).
9. **Người ghi và nhật ký:**
   - `created_by` của sự kiện và `staff_id` của nhật ký = **người vừa sửa đơn**.
   - Hành động nhật ký mới (tên đề xuất `trip_order_synced`, nhãn "Máy cập nhật chuyến theo đơn") và loại sự kiện mới `ALLOCATION_ORDER_SYNCED` (danh sách mở, `0042:157`).
   - `detail`: mã chuyến, mã đơn, số ghế trả / thêm, nguyên nhân dạng nhãn cố định (đơn huỷ / bớt khách / đổi người / bỏ chặng). Không tên, không SĐT (LC-18).
10. **Tin:** hành động mới vào `HANH_DONG_TIN_CHUYEN` khi chuyến có dòng lái mở; Bảng tin như mọi lệnh chuyến (`baoThayDoiChuyen`, `src/index.ts:104`).
11. **Nút tay "Cập nhật khách theo đơn"** (`POST …/cap-nhat-khach`, `src/modules/van-chuyen/index.ts:1423`):
    - Dùng **cùng** hàm thuần, nên bấm tay gỡ được cả `DON_DA_HUY`, `CHANG_DA_DONG`, `THUA_SUAT` (hôm nay bỏ qua, `dieu-phoi-lenh.ts:619`). Ô `trip.dispatch` giữ nguyên; lô riêng của từng chuyến như hôm nay, không chịu trần 74.
    - Cách này gỡ **N2**: "đổi theo đơn → miễn mốc; đổi theo ý người (rút một khách vẫn còn trong đơn) → Điều chỉnh khẩn cấp".
12. **Thua đua:**
    - chuyến thua câu cổng (đổi `version` hay trạng thái) → phần chuyến không ghi, chuyến giữ như hôm nay, lệnh đơn vẫn thành công;
    - đơn thua cổng → không câu nào ghi (câu chuyến hỏi `v_aud_order_cmd`);
    - không thử lại tự động. Trigger lõi chặn → cả lô hỏng, lệnh đơn trả 409; vì cổng chuyến đã kèm trạng thái, ca này chỉ xảy ra khi mã có lỗi.
13. **Ngoại lệ có tên (quyền ghép):** người không có `trip.dispatch` vẫn làm máy ghi suất trên chuyến, gồm HDV (`handler-cancel`, `handler-money-edit`), Đối tác và Thực tập (huỷ đơn, sửa khách của mình). Giới hạn:
    - chỉ suất `PASSENGER` của chặng thuộc đúng đơn họ vừa sửa; không đụng suất `CREW`;
    - chỉ đóng, hoặc (Q-2 a, chủ chọn) mở trong giới hạn số người lệnh vừa tăng và số chỗ của xe;
    - không bao giờ đổi xe, tài xế hay giờ;
    - không trả dữ liệu chuyến về cho người gọi.

### Đếm câu

- Mỗi chuyến bị chạm: 3 câu đầu (cổng, nhật ký, sự kiện) + 1 câu mỗi suất đóng + 1 câu mỗi suất mở + 1 câu mỗi điểm bỏ qua + tối đa 1 câu cam kết (`dieu-phoi.ts:100-101`).
- Đơn thường (1 dịch vụ, chặng đi và về, 10 khách, mỗi chặng một xe), huỷ đơn: 2 × (3 + 10 + 2 + 1) = **32** câu chuyến + khoảng 3 câu đơn.
- Đơn 30 khách cùng dạng: 2 × (3 + 30 + 2 + 1) = **72**, vừa dưới trần.
- Đoàn 45 khách cùng dạng: 2 × (3 + 45 + 2 + 1) = **102**, vượt trần: máy chỉ báo, người xếp xe bấm nút tay cho từng xe (mỗi lô 51 câu).
- **Tệ nhất theo hằng số, nếu không có trần:**
  - 20 dịch vụ (`src/shared/trip-rules.ts:6`) × 10 chặng mỗi dịch vụ (`src/shared/chang-dua-don.ts:50`) = 200 chặng;
  - mỗi chặng tối đa 50 suất (`src/shared/order-lines.ts:16`) → tới 10 000 câu đóng suất cộng 4 câu mỗi chuyến;
  - so với 74 câu của lô lớn nhất hôm nay (`docs/SYSTEM-DESIGN.md:1154-1158`), nên trần là bắt buộc.
- Phần đơn của route `passengers` có thể dài; tổng tệ nhất của lô = phần đơn + 74. Giới hạn số câu mỗi lần gọi D1 theo gói hiện hành: **chưa kiểm** (người thi công đối chiếu trang giới hạn của Cloudflare).

## Hệ quả và rủi ro

- **Giờ lái của tài xế (rủi ro pháp lý, đã nói với chủ một lần — Hiến pháp P18; không nhắc lại):** theo ghi nhớ tra cứu ngày 2026-09-27 (Luật Trật tự, an toàn giao thông đường bộ 2024, do trợ lý tra web, **chưa có luật sư xác nhận**), tài xế lái liên tục không quá 4 giờ và nghỉ ít nhất 15 phút giữa hai lần lái. Nền tảng **không chặn** theo giờ lái của luật: ADR-0055 chỉ **cảnh báo** (tổng giờ chuyến trong ngày 480 phút, chuyến dài hơn 240 phút nhắc nghỉ; con số chưa có người chuyên môn kiểm, ADR-0055 B4). Khoảng nghỉ giữa hai chuyến (`rest_minutes`, mặc định 30, ADR-0049 `:148`) là luật nội bộ, không phải giờ lái theo luật. Từ ADR này, khi chuyến dưới mốc Bán hàng cũng bỏ qua được khoảng nghỉ, nên người chịu trách nhiệm giữ quy định giờ lái gồm cả Bán hàng.
- **Quyền rộng hơn sát giờ:** Bán hàng đổi được xe, tài xế, huỷ chuyến còn khách trong 6 giờ trước giờ chạy, cho mọi chuyến. Lớp bù: lý do bắt buộc, nhật ký ghi người và lý do, nhãn "Điều chỉnh khẩn cấp" trên lịch, tài xế nhận tin; luật lõi (sức chứa, xe đang chạy…) không ai vượt.
- **Quyền ghép (Đ2 mục 13):** người không có `trip.dispatch` (HDV, Đối tác, Thực tập) vẫn làm máy ghi suất của đúng đơn họ sửa. Có tên, có giới hạn, có bài kiểm.
- **Lô ghi dài hơn:** lệnh sửa đơn có chuyến đã xếp thêm tối đa 74 câu phần chuyến; vượt thì không đồng bộ, chuyến giữ như hôm nay.
- **Migration:** Đ1 không cần; Đ2 một view (mục "Migration").
- **Tài liệu mô tả:** `docs/SYSTEM-DESIGN.md` (§6, §7, bảng view), `docs/CHANGE-GUIDE.md`, `docs/data-dictionary.json` + `npm run dict`, hướng dẫn Bán hàng, nhật ký thay đổi lời thường.
- **Việc lớn** (dữ liệu + quyền): kế hoạch riêng, mỗi task đỏ → xanh, người kiểm độc lập chỉ-đọc.

## Câu ADR bị thay (nguyên văn → mới; không sửa thân ADR cũ)

- **Câu chung:** mọi câu cùng nghĩa ("cần Quản trị phá lệ" mốc / khoảng nghỉ / cam kết) trong ADR-0049, ADR-0052, ADR-0056 đọc theo ADR-0104 Đ1, kể cả câu không liệt kê dưới đây.
- **Cột "Nguyên văn"** chép bản gốc của ADR cũ, chưa tính các lần sửa trước (ADR-0049 `:162` đã bị ADR-0052 `:192` sửa; `:200` đã bị ADR-0052 `:189` và ADR-0056 `:99` sửa). **Cột "Mới"** đã gộp đủ các lần sửa đó.
- Dòng có dấu ★ là thêm so với văn bản trình duyệt (tệp 02), vì Q-1 b buộc phải sửa; thiếu thì các ADR đã duyệt mâu thuẫn nhau.
- Dòng trỏ ở dòng Trạng thái của từng ADR cũ: `dong-tro-adr-cu.md` cùng thư mục.

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ★ ADR-0049 `:3` (dòng Trạng thái, phần "Bổ sung bởi ADR-0056") | "(Quản trị/Toàn quyền phá lệ, ô `trip.override`)" | "(chuyến dưới mốc: Bán hàng, Quản trị, Toàn quyền — `trip.urgent_adjust`; ngoài mốc: Quản trị, Toàn quyền — `trip.override`; ADR-0104 Đ1)". Ghi bằng dòng trỏ, vì đây là dòng Trạng thái. |
| ADR-0049 `:29` (tóm tắt, ý 4) | "Trong 6 giờ, chỉ khoá "ai đi xe nào", đổi xe, đổi tài xế. **Chỉ Quản trị, Toàn quyền phá lệ**, kèm lý do." | "… Bán hàng, Quản trị, Toàn quyền **điều chỉnh khẩn cấp** mọi lệnh bị khoá trong mốc (xếp, rút, dời, thêm khách khi xe chạy, đổi xe, đổi tài xế, huỷ chuyến còn khách), kèm lý do (ADR-0104 Đ1)." |
| ★ ADR-0049 `:48` (ĐP3) | "ĐP3: chỉ Quản trị, Toàn quyền phá lệ;" | "ĐP3: chủ đảo 2026-10-08 — Bán hàng, Quản trị, Toàn quyền điều chỉnh khẩn cấp mọi lệnh bị khoá trong mốc; khoảng nghỉ, cam kết: dưới mốc như trên, ngoài mốc chỉ Quản trị, Toàn quyền (ADR-0104 Đ1);" |
| ADR-0049 `:129` (LC-09) | "Đơn huỷ sau khi xếp → **giữ**" | "Đơn huỷ sau khi xếp → máy rút suất trên chuyến chưa chạy trong cùng lô huỷ đơn (ADR-0104 Đ2); xe đang chạy: nhắc văn phòng Báo huỷ; máy chưa làm được thì **giữ**" |
| ADR-0049 `:162` (dòng **Xếp**, cột "Ai phá lệ") | "**chỉ Quản trị, Toàn quyền** (ô mới `trip.override`), kèm lý do nhóm `PHA_LE`" | "Bán hàng, Quản trị, Toàn quyền (ô `trip.urgent_adjust`), kèm lý do nhóm `PHA_LE`, cho mọi lệnh bị khoá. Chuyển khách qua đề nghị giữa hai chuyến theo ADR-0052 `:192` (đích đang chạy: không kiểm mốc; đích chưa chạy trong mốc: leo thang, Quản trị / Toàn quyền duyệt). Lệnh máy 'Đồng bộ chuyến theo đơn' không khoá theo mốc (ADR-0104)." |
| ★ ADR-0049 `:171` (Khoảng nghỉ) | "Chỉ Quản trị, Toàn quyền phá lệ, ghi vào `rest_override_reason_code`." | "Chuyến dưới mốc lúc bấm: Bán hàng, Quản trị, Toàn quyền (ô `trip.urgent_adjust`); ngoài mốc: chỉ Quản trị, Toàn quyền (`trip.override`); ghi vào `rest_override_reason_code` (ADR-0104 Đ1)." |
| ADR-0049 `:200` (bảng ô) | "`trip.override` — phá lệ mốc lúc xếp, khoảng nghỉ" | "`trip.override` — vượt khoảng nghỉ và cam kết xe riêng / số chỗ tối thiểu khi chuyến ngoài mốc; duyệt / bác đề nghị leo thang (ADR-0052 `:189`)"; thêm dòng "`trip.urgent_adjust` — vượt mốc mọi lệnh bị khoá; vượt khoảng nghỉ, cam kết khi chuyến dưới mốc: SALES `any`, ADMIN `any`, SUPER_ADMIN `any`, còn lại `none`" |
| ★ ADR-0049 `:302` (bảng ô ↔ dữ liệu) | "\| `trip.override` \| sự kiện `PHA_LE`; `vc_trip.rest_override_reason_code` \| chỉ Quản trị, Toàn quyền \|" | giữ dòng, thêm "(ngoài mốc)"; thêm dòng "\| `trip.urgent_adjust` \| sự kiện mang `override_rule_code`; `vc_trip.rest_override_reason_code`, cột phá lệ cam kết khi chuyến dưới mốc \| Bán hàng, Quản trị, Toàn quyền \|" |
| ★ ADR-0049 `:313` (bảng cổng) | "\| Bảng điều phối, chi tiết chuyến, xếp xe, phá lệ, xuất bến bấm thay \| `office` \| `trip.view` / `trip.dispatch` / `trip.progress` / `trip.override` \| …" | "\| Bảng điều phối, chi tiết chuyến, xếp xe, điều chỉnh khẩn cấp, phá lệ, xuất bến bấm thay \| `office` \| `trip.view` / `trip.dispatch` / `trip.progress` / `trip.urgent_adjust` / `trip.override` \| …" |
| ADR-0049 `:365` (phương án bị loại) | "**Bán hàng tự phá lệ mốc 6 giờ:** chủ chọn chỉ Quản trị, Toàn quyền (ĐP3)." | "Chủ đảo ngày 2026-10-08 (*"Bán hàng và Quản trị"*; lượt 8a Q-1 b) cho mọi lệnh bị khoá; phạm vi ở ADR-0104 Đ1." |
| ADR-0050 `:219-221` | "**Vì sao không để máy tự dời khi đơn đổi:** … một việc chạy nền tự sửa chuyến là **tác nhân tự động** (Hiến chương 5.11, K1): cần tài khoản riêng + ADR riêng" | "Đổi **nơi** vẫn giữ chuyến + nút (VK1-B). Huỷ đơn, bớt / thêm khách, đổi người, bỏ chặng: máy đồng bộ **trong cùng lô lệnh sửa đơn của người**, ghi tên người đó, không chạy nền (ADR-0104 Đ2) — không phải tác nhân tự động theo 5.11." |
| ADR-0050 `:361` | "**Máy tự dời suất khi đơn đổi:** xem VK1-B." | "… trừ ADR-0104 Đ2." |
| ★ ADR-0052 `:29` (tóm tắt, ý 4) | "**thêm điểm đón** (khách không "đặt gấp" cần Quản trị phá lệ)" | "**thêm điểm đón** (khách không "đặt gấp" cần điều chỉnh khẩn cấp — Bán hàng, Quản trị, Toàn quyền; ADR-0104 Đ1)" |
| ★ ADR-0052 `:77` (mốc 6 giờ khi chuyển) | "Xe đích `PLANNED` mà đã trong mốc → đề nghị `ESCALATED` (…), Quản trị / Toàn quyền phá lệ kèm lý do như ADR-0049 D2." | "… Quản trị / Toàn quyền duyệt đề nghị leo thang kèm lý do (`trip.override`, không đổi — giữ hiện trạng, chỉ siết). Điều chỉnh khẩn cấp của ADR-0104 **không** áp cho đề nghị chuyển khách giữa hai chuyến; văn phòng muốn tự dời khách thì dùng lệnh dời (ADR-0104 Đ1)." |
| ADR-0052 `:98` (D5.1, mốc) | "mọi chặng khác … → **chỉ Quản trị, Toàn quyền phá lệ** (`trip.override`) kèm lý do" | "→ Bán hàng, Quản trị, Toàn quyền **điều chỉnh khẩn cấp** (`trip.urgent_adjust`) kèm lý do" |
| ADR-0052 `:148` (D6.1, danh sách hành động sinh tin — một chiều) | (danh sách đóng) | "+ đồng bộ chuyến theo đơn; + xếp / rút / dời khách lớp điều chỉnh khẩn cấp — chỉ chuyến có tài xế" (đổi xe, đổi tài xế, huỷ chuyến, thêm khách khi xe chạy đã có trong danh sách) |
| ★ ADR-0052 `:192` (câu thay dòng **Xếp** của ADR-0049) | "… Đích chưa chạy trong mốc: như dòng này (leo thang, Quản trị / Toàn quyền phá lệ). Văn phòng thêm khách vào xe đang chạy (D5.1) **vẫn** theo dòng này." | "… Đích chưa chạy trong mốc: leo thang, Quản trị / Toàn quyền duyệt (`trip.override`, không đổi). Văn phòng thêm khách vào xe đang chạy (D5.1) theo dòng này, tức điều chỉnh khẩn cấp của Bán hàng, Quản trị, Toàn quyền (ADR-0104 Đ1)." |
| ★ ADR-0052 `:246` (bài 7) | "chặng không đặt gấp …, Bán hàng → 409 "cần Quản trị"; Bán hàng gọi phá lệ → 403; Quản trị phá lệ có lý do → 200 + sự kiện `PHA_LE`" | "chặng không đặt gấp …, Bán hàng không gửi lý do → 409 (lớp `KHAN_CAP`); Bán hàng hoặc Quản trị gửi điều chỉnh khẩn cấp có lý do → 200 + sự kiện mang `override_rule_code = 'MOC_TOI_THIEU'` (ADR-0104 Đ1)" |
| ★ ADR-0056 `:53` (mốc 6 giờ) | "xếp lại trong 6 giờ vẫn cần Quản trị phá lệ mốc (luật có sẵn)." | "xếp lại trong 6 giờ cần điều chỉnh khẩn cấp (Bán hàng, Quản trị, Toàn quyền — ADR-0104 Đ1)." |
| ★ ADR-0056 `:62-63` (cam kết) | "lệnh xếp / đổi xe trả 409 "cần Quản trị phá lệ cam kết"; … Quản trị / Toàn quyền gửi phá lệ, lý do nhóm `PHA_LE` (ô `trip.override` có sẵn …)" | "chuyến dưới mốc: Bán hàng, Quản trị, Toàn quyền gửi điều chỉnh khẩn cấp (ô `trip.urgent_adjust`); ngoài mốc: Quản trị, Toàn quyền phá lệ (`trip.override`); lý do nhóm `PHA_LE` (ADR-0104 Đ1)" |
| ★ ADR-0056 `:68` (vi phạm mới sau phá lệ) | "… ⇒ lệnh trả 409 / cổng **giữ**, cần Quản trị phá lệ lại;" | "… ⇒ lệnh trả 409 / cổng **giữ**, cần vượt lại theo ADR-0104 Đ1 (chuyến dưới mốc: Bán hàng, Quản trị, Toàn quyền; ngoài mốc: Quản trị, Toàn quyền);" |
| ★ ADR-0056 `:119` (bài kiểm) | "`SALES` gửi phá lệ cam kết → 403;" | "`SALES` gửi phá lệ cam kết khi chuyến ngoài mốc → 403; khi chuyến dưới mốc → 200 (ADR-0104 Đ1);" |
| ★ ADR-0056 `:134` (bài kiểm) | "`SALES` gửi phá lệ → 403." | "`SALES` gửi phá lệ cam kết khi chuyến ngoài mốc → 403; dưới mốc → 200 (ADR-0104 Đ1)." |
| ADR-0007 điều 4(b) (`:37`) | khuôn hàm tiêm | "+ `ctx.dongBoChuyen` (nhận câu đơn đã soạn, trả lô đầy đủ chưa chạy)" |
| Sổ hỏi đáp Vận chuyển lần 16, R-P29 (không phải ADR) | "Giữ xe + nút cập nhật" | máy đồng bộ trước; nút giữ làm đường tay |
| Đề xuất ADR-0091 (chưa duyệt) | toàn văn | bỏ phần xếp xe; phần đặt gấp chuyển sang ADR-0107 (số tạm, lượt 8b); giữ ý "nhãn riêng" của lời chủ 2/10 |

**Không đổi:** ADR-0049 `:339` (bài ghim `trip.override` chỉ Quản trị + Toàn quyền — giá trị ô giữ nguyên); ADR-0052 D5.2 (báo huỷ trên xe đang chạy); ADR-0052 `:80-85` và `:189` (duyệt / bác đề nghị leo thang vẫn `trip.override`).

## Cửa một chiều / hai chiều

- **Một chiều (nhẹ):**
  - tên hành động nhật ký, loại sự kiện mới và các trường `detail` (chốt trước dòng đầu);
  - phần thêm vào danh sách tin chuyến (ADR-0052 D6.1 tự ghi danh sách này là một chiều);
  - view công bố `v_aud_order_cmd` là hợp đồng giữa `audit` và `van-chuyen` (gỡ phải theo expand–contract);
  - mỗi suất máy đã đóng (chỉ-thêm, lịch sử giữ nguyên).
- **Hai chiều:** ô mới và các ô đổi (gỡ bằng một commit); tập lệnh mỗi lớp; luật thuần; danh mục lý do (dữ liệu); hàm tiêm; trần 74; chữ giao diện.
- **Tránh một chiều nặng:** **không** thêm giá trị `close_reason`, vì đổi `CHECK` ở `0042:133` nghĩa là phải dựng lại bảng `vc_trip_allocation` (ADR-0049 `:325-326`).

## Migration

- Đ1: không cần. Ô nằm ở mã; lý do là dữ liệu Quản trị tự thêm.
- Đ2: **một migration chỉ `CREATE VIEW v_aud_order_cmd`** (khuôn view chỉ-khoá của `migrations/0070_tin_chuyen.sql:1-6`, `0075`).
  - Cập nhật `docs/data-dictionary.json` (mục view, chủ sở hữu `audit`; view đã được liệt kê ở đó, ví dụ `:591`) rồi `npm run dict`; bảng view ở `docs/SYSTEM-DESIGN.md:258`.
  - Số = số lớn nhất trong `migrations/` + 1 lúc thi công (hôm nay lớn nhất `0083`); quét mọi nhánh chưa gộp, nhất là `a3-tin-don-doi` (đang tạo `v_aud_order_change`).
- Không còn migration thêm mã lý do (bỏ cùng nhánh xe đang chạy, phiếu kiểm độc lập vòng 1, C1).

## Bài kiểm / hàng rào

Mỗi rào phải quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên, có dòng `docs/SO-HANG-RAO.md` kèm ngày.

1. **Quyền:**
   - Bán hàng xếp / rút / dời / thêm khi chạy trong mốc kèm lý do → 200; thiếu lý do → 400.
   - Bán hàng đổi xe, đổi tài xế trong mốc kèm lý do → 200; Bán hàng huỷ chuyến còn khách trong mốc → 200 (Q-1 b).
   - Bán hàng bỏ qua khoảng nghỉ hoặc cam kết khi chuyến dưới mốc → 200; ngoài mốc → 403 (lời chủ "Chỉ khi chuyến còn dưới 6 giờ"); Quản trị bỏ qua khoảng nghỉ ngoài mốc → 200.
   - 409 trả đúng lớp: thiếu luật nào khi chuyến dưới mốc → lớp `KHAN_CAP`; chỉ thiếu khoảng nghỉ / cam kết khi chuyến ngoài mốc → lớp `QUAN_TRI`, và `canQuyen` của Bán hàng = sai.
   - Chặng mang dấu đặt gấp không làm chuyến thôi "dưới mốc": xếp chặng đặt gấp vào chuyến dưới mốc mà vượt cam kết → Bán hàng 200.
   - Rào mềm (Đ1 mục 0): Bán hàng sửa một chuyến đang ngoài mốc, chỉ dời giờ vào trong 6 giờ, kèm vượt khoảng nghỉ trong cùng lệnh → 200 (giờ xét `min(cũ, mới, sớm nhất)`; cách (a) ở Đ1 mục 0, chủ xác nhận 2026-10-08 "Cho qua, tính là sát giờ (Recommended)").
   - Kế toán → 403; Quản trị → 200 mọi lệnh.
2. **LC-02:** Bán hàng điều chỉnh khẩn cấp xếp vượt số chỗ → 409, và SQL tay bị trigger `lc02_capacity` chặn.
3. **Một chỗ xếp lớp:** bài quét — mọi chỗ hỏi ô cho ba luật (mốc, khoảng nghỉ, cam kết) đều đi qua `lopVuotMoc` / `lopVuotNghiCamKet`; ở bảy chỗ hỏi ô, cả `trip.urgent_adjust` lẫn `trip.override` có lời gọi `can(` viết tường minh.
4. **Nhãn:**
   - đổi xe trong mốc (Bán hàng hay Quản trị) → chuyến mang nhãn "Điều chỉnh khẩn cấp";
   - Quản trị bỏ qua khoảng nghỉ ngoài mốc → nhãn "Phá lệ", không mang nhãn khẩn cấp;
   - bốn ca lệch ở Đ1 mục 5 (tạo chuyến trong mốc + khoảng nghỉ; chặng đặt gấp + cam kết; sửa chuyến chỉ đổi giờ + khoảng nghỉ; sửa chuyến chỉ gửi `camKetPhaLe`), mỗi ca do Bán hàng làm dưới mốc → 200 và nhãn "Phá lệ". Bài ghim chỗ lệch đã biết, để ai sửa thì phải sửa có chủ ý.
5. **Đồng bộ:**
   - Huỷ đơn trong mốc (chuyến `PLANNED`) → suất đóng `REMOVED` trong cùng lô, chuyến hết `DON_DA_HUY`, nhật ký mang `staff_id` người huỷ, tài xế nhận tin.
   - HDV huỷ qua `handler-cancel` → như trên, và HDV gọi route xếp vẫn 403.
   - Chuyến `RUNNING` → không suất, không cờ nào đổi; phản hồi có câu nhắc Báo huỷ.
   - Bớt khách khi có suất chưa tên → đóng suất chưa tên; mọi suất mang tên người còn trong đơn → giữ `THUA_SUAT`; chặng trên hai chuyến → giữ.
   - Đơn huỷ có chặng trên **hai** chuyến `PLANNED` → cả hai chuyến đóng suất trong **một** lô (mỗi chuyến mã lệnh và `request_id` riêng).
   - Thua cổng chuyến → chuyến giữ, lệnh đơn 200; thua cổng đơn → không suất nào đổi.
   - Bài ghép: mọi `auditId` mà các điểm gọi truyền vào hook đều là nhật ký của một hành động nằm trong danh sách của `v_aud_order_cmd`; thêm điểm gọi mới với hành động ngoài danh sách → đỏ.
   - Vượt trần 74 → không câu chuyến nào, phản hồi báo cập nhật tay.
6. **Bài tĩnh điểm gọi hook:** bỏ một lời gọi → đỏ.
7. **Bài thứ tự lô:**
   - ngoại lệ có tên cho lô chung; một hàm khác dùng nhãn đó → đỏ;
   - trong lô chung, một khúc chuyến đứng trước câu nhật ký của đơn → đỏ;
   - trong lô chung, một khúc chuyến thiếu câu cổng ở đầu khúc, hoặc sai bất kỳ luật nào trong bốn luật thứ tự → đỏ;
   - C38 theo khúc: một khúc chuyến không có, hoặc có hai câu chèn `vc_trip_event`, hay câu đó mang `requestId` của khúc khác → đỏ.
8. **View:** `van-chuyen` đọc `v_aud_order_cmd` → bài kiến trúc xanh; đọc thẳng `audit_log` → đỏ.
9. **LC-18:** bài quét nhật ký hiện có phủ hành động mới.
10. **Bộ kiểm chung:** `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`.

## Phương án bị loại

- **Đổi ô `trip.override` của Bán hàng thành `any`:** mở luôn khoảng nghỉ và cam kết **ngoài** mốc (câu Q-1 chỉ hỏi việc sát giờ), và mở cả việc duyệt / bác đề nghị leo thang của ADR-0052 (`docs/adr/ADR-0052-dieu-phoi-luot-2-chuyen-diem-va-xe-dang-chay.md:80-85`), vốn cùng ô này.
- **Q-1 a (đổi xe, đổi tài xế, huỷ chuyến còn khách vẫn chỉ Quản trị, Toàn quyền):** khuyến nghị của văn bản trình duyệt; chủ chọn b ngày 2026-10-08.
- **Mở khoảng nghỉ, cam kết cho Bán hàng cả ngoài mốc:** chủ chọn **"Chỉ khi chuyến còn dưới 6 giờ (Recommended)"** ngày 2026-10-08. Muốn mở thì cần ADR mới.
- **Lưu lớp "dưới mốc" vào sự kiện để nhãn chuyến đúng tuyệt đối:** cần cột mới (migration); bốn ca lệch ở Đ1 mục 5 (ca 3, 4 — sửa chuyến chỉ đổi giờ, chỉ `camKetPhaLe` — thường gặp); nhãn lịch lệch nhưng hộp xác nhận và nhật ký ghi đúng; để sau nếu chủ cần.
- **Nút "Xin phá lệ" và tin cho Quản trị** (báo cáo ERP C04 (iii), ADR-0091 đ7): chủ bác khái niệm này ngày 8/10.
- **Đồng bộ chạy nền, Cron hay hàng đợi:** là tác nhân tự động không định danh, tức xây trên lỗ đang hở HC-5.11; trái ĐP8 (ADR-0049 `:364`).
- **Hai lô (ghi đơn xong rồi mới ghi chuyến):** lệch Hiến chương 1.2 và ngược tiền lệ gộp lô của tạo đơn.
- **Đặt cờ báo huỷ trên xe đang chạy trong lô đồng bộ:** trigger `0076:46-54` không cho (phiếu kiểm độc lập vòng 1, C1).
- **Cổng đơn đã thắng, phương án (b) — `orders` cấp sẵn biểu thức điều kiện:** biểu thức vẫn là `EXISTS (… audit_log …)` nằm trong câu của `van-chuyen`, tức module nghiêm đọc thẳng bảng của module khác; phiếu người kiểm ghi cách đọc thẳng `audit_log` làm bài kiến trúc đỏ.
- **Phương án (c) — cổng đơn ở các route đổi sang làm hỏng lô khi thua:** đổi cách xử lý tranh chấp của tám route đang chạy (hôm nay thua lặng lẽ rồi trả 409 riêng như `HANDLER_RACED`), phạm vi rộng hơn nhiều so với một view.
- **Gác bằng mốc đơn** (phương án thêm của người soạn, không phải (d) của phiếu kiểm) — dùng dấu thời gian mới của đơn (`orders.updated_at = :at` mà lô đơn vừa ghi, đọc qua một view `v_ord_*`): **chưa thử**; còn phải chứng minh dấu đó duy nhất cho mỗi lệnh, và phải lộ thêm cột giờ của đơn ra view.
- **Mã đóng mới cho đồng bộ:** phải dựng lại bảng (xem Cửa một chiều).
- **Hạ con số mốc cho cả hệ thống:** áp cả lúc đặt đơn, cộng lỗi N3 (báo cáo ERP Gói 0 mục 3).

## Sổ dừng dây chuyền (`docs/quyen-hoan.json`)

- **HC-5.11** (HIGH, hạn 2026-11-15, tác vụ tự động không định danh): **không xây trên lỗ này**, với điều kiện Đ2 chạy trong lô lệnh của người và ghi `staff_id` người đó (bài kiểm 5). Nếu sau này chuyển sang chạy nền thì phải ghi "xây trên lỗ đang hở: HC-5.11" và dừng chờ chủ.
- Các mục HIGH khác (TNV-G1, G3, G4, HC-5.19, HC-4.2) thuộc sổ tiền và sao lưu; Đ1 và Đ2 không ghi bảng `bil_*`.
- Ô hoãn `thao_tac` (`task.progress`, `dispatch.guides.view`, `invoice.*`) không được dùng.

## Chưa kiểm

- Số lần phá lệ thật trên production, ai xếp xe ban đêm, giá trị mốc thật.
- Lệnh huỷ đơn chậm thêm bao nhiêu; giới hạn số câu mỗi lần gọi D1 theo gói hiện hành.
- Thử nghiệm "đọc `v_aud_*` từ `van-chuyen` thì xanh" là của người kiểm; người soạn chưa tự chạy.
- Năm điểm gọi ngoài `cancelOrder` và C14 đã lộ mã nhật ký của cổng đơn hay chưa; mỗi route có sẵn trạng thái `sau` hay phải đọc thêm (người soạn chỉ đọc phần đầu route huỷ đơn và route khách).
- Route tài xế ghi tên khách có cần luật đồng bộ hay không.
- Nguồn đọc trạng thái đơn cho dòng nhắc trên màn "Xe đang chạy" (dự kiến cùng nguồn với `DON_DA_HUY`, chưa lần tới hàm đọc).
- Bảng tin và tin điện thoại tới máy thật; tranh chấp đồng thời thật trên D1.
- Thân ADR-0096, ADR-0097 (đón trước trả, cửa sổ xuất bến, sự kiện `CORRECTION`) chưa đối chiếu với Đ2.
- Dòng giao diện ở Đ1 mục 9 lấy theo trang ghép (đo @`809918d5`); chưa đo lại @`4fd27fe1`. Số dòng bảy chỗ hỏi ô đã đo lại @`4fd27fe1`.
- Bốn ca lệch nhãn ở Đ1 mục 5: chưa đếm trên production xảy ra bao nhiêu.
- Ca dời giờ trong lệnh sửa (Đ1 mục 0, bài kiểm 1): chủ xác nhận 2026-10-08 qua câu hỏi chọn phương án, nhãn nguyên văn **"Cho qua, tính là sát giờ (Recommended)"** (sổ thi công, mục "Lượt duyệt 8a"). Không còn là điểm chờ.
- ADR-0052 `:77`: bản chép giữ đề nghị chuyển khách leo thang ở `trip.override` (không mở cho Bán hàng) — **giữ hiện trạng, chỉ siết**; chủ chưa được hỏi riêng câu này.
