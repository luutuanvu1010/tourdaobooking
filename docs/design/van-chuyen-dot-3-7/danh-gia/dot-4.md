# Đánh giá bản vẽ Đợt 4: Tiền xe thuê (`Chi phí xe thuê.dc.html`)

Ngày 2026-10-02. Người đánh giá chỉ đọc kho mã, không sửa tệp nào trong kho.
- Kho đọc: worktree `ghi-quyet-dinh-van-chuyen` (origin/main mới nhất, e577ba13).
- Đã đối chiếu với:
  - kế hoạch con `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-04-tien-xe-thue.md` (gồm Task 3, 4, 10, 11, mục "Giao diện", "Lệnh vẽ" và Task G);
  - ADR-0057 (T1 B1–B5, T2 C1–C10);
  - mã `web/shell.ts`, `web/chuyen.ts`, `web/account.ts`, `public/app.css`, `src/shared/giao-dien.ts`, `src/shared/permissions.ts`, `src/shared/sw-policy.ts`.

## 1. Tóm tắt

1. Bản vẽ có **3 màn**, mỗi màn vẽ ở 1040px và 390px:
   - 1a Bảng giá thuê xe (G1), gồm 3 tab và 6 bảng;
   - 1b khối "Chi phí chuyến" trong Chi tiết chuyến (G2), gồm 3 trạng thái ở máy tính và 3 ở điện thoại;
   - 1c Bảng kê chi phí xe thuê (G4).

   Màn G3 (ô chọn tuyến) không có trong bản vẽ. Kế hoạch đã nói G3 không cần vẽ.

   **Lưu ý về nguồn:** tôi đánh giá trên **bản chép cấu trúc của điều phối**: khung trang ghi dạng mô tả, chữ và dữ liệu ghi nguyên văn. Tôi không có tệp gốc. Vì vậy chi tiết điểm ảnh và bố cục 390px là thông tin gián tiếp, chưa kiểm bằng mắt.
2. **Khớp kế hoạch khoảng 80%.** Cả ba màn, phần lớn nút, câu lỗi và luật quyền đều trùng lệnh vẽ. Lệch chính nằm ở:
   - **số tiền bản vẽ tự cộng ở trình duyệt**: tổng cộng toàn bảng, cột "Điều chỉnh" là số tiền, dòng gợi ý "Bảng giá vừa có giá 450.000 ₫";
   - nút **"Tải bảng kê"**, không có trong ADR lẫn kế hoạch;
   - form thêm tuyến và cỡ xe **không có ô mã**, trong khi route của kế hoạch đòi mã.
3. **Lời chủ về thanh bên trái (việc BỀ MẶT, làm toàn app):**
   - Trong bản vẽ, đó là thanh điều hướng `nav`. Hệ thiết kế mặc định cho nó màu xanh đậm; bản vẽ dùng lớp `.sb-gray` đè sang `#EEF2F6`.
   - Trong app, nó tương ứng `#sidebar` do `web/shell.ts` dựng, chỉ hiện ở khổ ≥ 641px. App **đã nền trắng** (`--c-sidebar-bg: var(--c-surface)`, `public/app.css:320`), không còn xanh đậm.
   - Việc cần làm: `--c-sidebar-bg: var(--c-surface-alt)`, tức đúng màu nền trang `#eaf2f8` mà `body` dùng (`app.css:442`); thêm viền phải; sửa `CHA`/`MAC_DINH` ở `src/shared/giao-dien.ts`. Chi tiết ở §4.1.
4. **4 câu hỏi cho chủ**, đều về TIỀN, DỮ LIỆU hoặc QUYỀN: Q1 nút "Tải bảng kê", Q2 cột "Điều chỉnh" là số tiền hay số lần, Q3 gợi ý giá bảng có số tiền, Q4 Bán hàng có thấy dải cảnh báo thiếu giá không. Ngoài ra có **13 mục sửa kế hoạch** (§4) và **12 trạng thái bản vẽ thiếu** (trong bảng §2).
5. **Tiền:**
   - Mọi số tiền trên ba màn phải do máy chủ trả, web chỉ định dạng bằng `vnd()` (`web/format.ts:10`). Bản vẽ dùng `num()`/`reduce` để cộng tổng nhóm và tổng cộng; app thật **không được** làm vậy.
   - Ai thấy số: chỉ người có `transport.rate.view` / `transport.cost.view`, tức Kế toán, Quản trị và Toàn quyền. Bán hàng, HDV, tài xế, Đối tác, Thực tập và Nhân sự không thấy số nào.

## 2. Bảng màn / trạng thái → task → route/DTO → lệch → loại

Ký hiệu loại: **BM** = bề mặt, làm đúng bản vẽ. **DL/Q/T** = chạm dữ liệu, quyền hoặc tiền, phải hỏi chủ hoặc sửa kế hoạch. **THIẾU** = bản vẽ thiếu trạng thái, làm theo khuôn có sẵn. Máy chủ của T1 và T2 **chưa thi công**: mọi route dưới đây là route kế hoạch hứa cấp, chưa route nào có trên `main`.

### 2.0 Khung chung (thanh bên, thanh trên)

| Thành phần bản vẽ | Tương ứng app | Lệch | Loại |
|---|---|---|---|
| Thanh bên trái `nav`, nền `#EEF2F6`, viền phải `#D3E1EC` (lớp `.sb-gray`) + **lời chủ** | `#sidebar` (`web/shell.ts`), CSS ở `app.css:918`, nền `--c-sidebar-bg` = trắng | Nền phải theo **màu nền toàn trang** `--c-surface-alt`; app chưa có viền phải | **BM**, làm toàn app (§4.1) |
| Chữ mục `#475569`, mục đang chọn `#DCE4EC`, chữ đầu và mục chọn `#0C4A6E`, viền `#D3E1EC` | `--c-sidebar-item` = `--c-text-muted` (#475569); `--c-sidebar-active` = `--c-primary-soft` (#dcebf6); `--c-sidebar-text-on` = `--c-primary`; `--c-sidebar-border` = `--c-border` | Ba trên bốn token đã khớp. Riêng nền mục đang chọn khác nhẹ (`#DCE4EC` ≈ `--c-primary-soft`), giữ token app | BM, không đổi |
| Nhóm "Bán hàng" (Trang chủ, Đơn hàng); nhóm "Quản trị" (Chuyến xe, Bảng giá thuê xe, Bảng kê chi phí xe), có biểu tượng | Menu có sẵn: QUẢN TRỊ › mục cha "Vận chuyển" › mục con (không biểu tượng), `web/shell.ts:241-260`. "Chuyến xe" của bản vẽ = **"Điều phối xe"** đã có | **Không vẽ menu mới.** Thêm 2 mục con "Bảng giá thuê xe" (`can(transport.rate.view)`) và "Bảng kê chi phí xe" (`can(transport.cost.view)`) **ngay sau "Điều phối xe"**, giữ đúng thứ tự bản vẽ | BM |
| Thanh trên "Quản trị › Bảng giá thuê xe" | Thanh trên của app chỉ hiện `data-title` của trang (`web/shell.ts:362`), không có tiền tố nhóm | Giữ khuôn app: `data-title="Bảng giá thuê xe"` / `"Bảng kê chi phí xe thuê"`. Không dựng lại thanh trên của bản vẽ | BM, theo khung app |
| Phông Nunito ở `body` và ô nhập của bản vẽ; tiêu đề Be Vietnam Pro, độ đậm 800/700/600 | App dùng Be Vietnam Pro toàn bộ (`--font`, `--font-display`); độ đậm qua `--fw-*`, hiện cùng 500 | Theo token app (ánh xạ ở §5) | BM |

### 2.1 Màn 1a: Bảng giá thuê xe (G1, trang mới `/bang-gia-xe`)

| Thành phần / trạng thái | Task kế hoạch | Route / DTO cần (chưa có) | Lệch | Loại |
|---|---|---|---|---|
| h1 "Bảng giá thuê xe" + phụ đề "Giá thuê mỗi chuyến của từng nhà xe đối tác."; nút accent "Thêm giá" (ẩn ở tab Tuyến/Cỡ xe) | G1 | — | Nút hiện khi `can(transport.rate.manage)` | BM |
| Ô "Nhà xe" ▾ | G1, Task 4 | `GET /api/van-chuyen/bang-gia` trả `nhaXe: {partyId, ten}[]` | Bản vẽ (điện thoại) có lựa chọn **"Nhà xe Hoàng Long (đã thôi hợp tác)"**. Danh sách của kế hoạch lấy từ `nhaXeDangHopTac` nên **thiếu nhà xe đã thôi mà còn giá đang mở**, và việc "kết thúc giá của nhà xe đã thôi" (ADR B4 bắt buộc làm được) không có lối trên màn | **DL**, sửa kế hoạch §4 mục 4 |
| Ô "Giá đang áp ngày" (02/10/2026) | Task 4 (`?ngay=`) | như trên | Bản vẽ vẫn liệt kê dòng **Đã kết thúc** và **Sắp áp** ở ngày đó, tức `ngay` chỉ để gắn nhãn trạng thái, **không** lọc. Kế hoạch chưa nói rõ | DL, sửa kế hoạch §4 mục 5 |
| Ghi chú "Có cả giá theo tuyến và giá theo cỡ xe thì giá theo tuyến được dùng." | lệnh vẽ 1 | — | khớp | BM |
| 3 tab viên thuốc "Giá thuê / Tuyến / Cỡ xe" (tab chọn nền `--c-primary` chữ trắng) | G1 | — | App đã chuyển "đang chọn" sang token vai `--c-selected-*` (nền nhạt). Xem §5 | BM |
| Bảng máy tính 6 cột: TUYẾN (+ ghi chú), CỠ XE, SỐ TIỀN / CHUYẾN (accent-strong), HIỆU LỰC "01/07/2026 – đang áp", TRẠNG THÁI (chip Đang áp/Sắp áp/Đã kết thúc), "Đổi giá" "Kết thúc" (ẩn khi Đã kết thúc); tuyến trống "Mọi tuyến", cỡ trống "Mọi cỡ xe" (chữ mờ) | G1, Task 4 | `BangGiaDto { id, tuyen: {ma,ten}\|null, coXe: {ma,nhan}\|null, soTien, tuNgay, denNgay, ghiChu, trangThai }` | Kế hoạch chưa có trường `trangThai` (DANG_AP/SAP_AP/DA_KET_THUC theo `ngay`). Nên để máy chủ tính, web không so ngày | DL nhẹ, sửa kế hoạch §4 mục 5 |
| Điện thoại: thẻ + nút viên "Đổi giá" và viên đỏ "Kết thúc" | G1 | — | — | BM |
| Form "Đổi giá — <tuyến>": Tuyến ▾, Cỡ xe ▾, Số tiền *, Từ ngày *, Đến ngày, Ghi chú; gợi ý "Dòng cũ sẽ kết thúc ngày 30/09/2026, dòng mới bắt đầu ngày 01/10/2026…"; lỗi "Nhà xe đã có giá cùng tuyến, cùng cỡ trong khoảng ngày này"; nút "Lưu giá mới". Máy tính là thẻ nội tuyến; điện thoại là tấm đáy + `--c-scrim` | Task 4 (`thayDongId`) | `POST /api/van-chuyen/bang-gia` | Tuyến/Cỡ vẽ như ô chọn **đổi được**, nhưng kế hoạch đòi dòng thay "cùng khoá" ⇒ phải **khoá** (chỉ đọc) hai ô này khi Đổi giá. Câu lỗi khớp `gia_chong` | BM (khoá ô) |
| Form "Thêm giá", lỗi "Nhà xe này đã thôi hợp tác — không thể thêm giá mới" | Task 4 (`nha_xe_khong_hop_tac`) | như trên | Câu của kế hoạch là "Chỉ thêm giá cho nhà xe đang hợp tác" ⇒ **đổi câu theo bản vẽ** | BM |
| Trống: "Nhà xe này chưa có giá" + "Thêm giá theo tuyến hoặc theo cỡ xe để chuyến xe thuê tự lấy giá bảng." + nút "Thêm giá" | lệnh vẽ 1 | — | khớp | BM |
| Tab Tuyến: tiêu đề + gợi ý "Thêm, đổi tên hoặc ngưng dùng. Tuyến ngưng dùng vẫn giữ trong giá cũ."; dòng: tên + chip Đang dùng/Ngưng dùng + "Đổi tên" + "Ngưng dùng"/"Dùng lại"; chân: ô **"Tên tuyến mới"** + "Thêm" | Task 4 | `GET/POST/PUT /api/van-chuyen/tuyen` | Kế hoạch đòi thân `{ ma, ten }` (mã viết hoa 2–30) nhưng bản vẽ **không có ô mã** ⇒ máy chủ tự sinh mã | DL, sửa kế hoạch §4 mục 6 |
| Tab Cỡ xe: gợi ý "Nhập khoảng số khách, không kể tài xế."; ô **"Từ (khách)", "Đến (khách)"**; nhãn hiện "4–7 khách", "45 khách" | Task 4 | `…/co-xe` | Kế hoạch đòi `{ ma, nhan, tuSoKhach, denSoKhach }`; bản vẽ không có ô mã lẫn ô nhãn ⇒ máy chủ sinh mã + nhãn mặc định "a–b khách" ("a khách" khi a = b). "Đổi tên" vẫn đổi nhãn được (`PUT nhan`) | DL, sửa kế hoạch §4 mục 6 |
| **THIẾU:** hộp "Kết thúc" giá (route đòi `denNgay`) | Task 4 | `POST …/:id/ket-thuc { denNgay }` | Bản vẽ chỉ có nút. Làm theo khuôn tấm đáy / thẻ nội tuyến của form Đổi giá: một ô "Đến ngày", mặc định hôm nay | THIẾU |
| **THIẾU:** cảnh báo "cỡ này còn N dòng giá đang áp" khi ngưng dùng cỡ xe (Điều chưa chắc của kế hoạch) | — | cần số đếm từ máy chủ | Làm bằng câu xác nhận trước khi ngưng | THIẾU |
| **THIẾU:** đang tải, lỗi tải, 409 `co_xe_chong`, lỗi 400 thân sai, mở thẳng trang khi không có quyền (Bán hàng) | Task 4 | — | Dùng khuôn các trang danh mục `.vc-*` (vd `web/loai-giay-to-xe.ts`) | THIẾU |

### 2.2 Màn 1b: khối "Chi phí chuyến" trong Chi tiết chuyến (G2, `web/chuyen.ts`)

| Thành phần / trạng thái | Task kế hoạch | Route / DTO cần | Lệch | Loại |
|---|---|---|---|---|
| Đầu trang: mã chuyến + chip trạng thái; thẻ 4 ô NGÀY CHẠY / BIỂN SỐ / ĐÓN / KHÁCH; khung gạch đứt "Các khối hiện có … giữ nguyên, nằm trước khối này." | G2 | — | Đây là **chỗ giữ**, không dựng lại. Đầu trang thật là `dp-ct-head` (`web/chuyen.ts:74`). Khối chi phí đặt **sau các khối hiện có**: cuối cột chính `dp-ct-main` (`chuyen.ts:206`); điện thoại nằm cuối trang | BM |
| Dải cảnh báo "Chuyến xe thuê chưa có giá — chưa được xuất bến" + "Nhập giá thoả thuận với nhà xe, hoặc bổ sung giá vào Bảng giá thuê xe rồi lấy lại giá bảng." + nút "Nhập giá thoả thuận" | G2; lý do giữ `THIEU_GIA` (Task 8) | `GET …/chuyen/:id/chi-phi` (nguonGia null + trangThai PLANNED + thue) | Kế hoạch: lý do giữ hiện cho **mọi người xem chuyến** (kể cả Bán hàng), không kèm số, qua thẻ "Điều kiện xuất bến" có sẵn. Dải của bản vẽ có nút ghi tiền ⇒ xem **Q4** | **Q**, câu Q4 |
| Khối trắng, đầu "Chi phí chuyến" + chip "Chỉ Kế toán · Quản trị" | G2 | — | Cả khối chỉ dựng và chỉ gọi route khi `can(staff,"transport.cost.view")` (Bán hàng không gọi, không thấy 403) | BM (ẩn theo `can`) |
| 409: dải đỏ "Chi phí chuyến vừa thay đổi — tải lại rồi thử lại." + "Tải lại" | Task 10 (`chi_phi_vua_doi`) | — | khớp | BM |
| Lưới tóm tắt NHÀ XE / TUYẾN / NGUỒN GIÁ (chip) / TỔNG CHI PHÍ (24px accent-strong; chưa có giá = "—") | G2, Task 10 | `ChiPhiChuyenDto.{nhaXe, tuyen, nguonGia, tong}` | `tong` **do máy chủ trả** (`tongChiPhiChuyen`); web chỉ `vnd()`. "—" khi `nguonGia = null` **và** `tong = 0` | BM / T (đã đúng kế hoạch) |
| Danh sách dòng: chip loại (Giá bảng = xanh lá; Điều chỉnh = xanh nhạt; Đảo = xám; Điều chỉnh **phí huỷ** = đỏ), chip "đã đảo", chip "đảo do đổi chuyến"; số "+ 450.000 ₫"/"− 400.000 ₫" (âm đỏ); dòng bị đảo mờ 0,55 + gạch ngang; lý do, ghi chú, "người · lúc"; nút liên kết "Đảo dòng" | G2, Task 10 | `dong[]: {id, loai, soTien, lyDo, ghiChu, ngay, daDao, daoDoDoiChuyen, nguoi, luc}` | (a) Màu chip phụ thuộc **mã lý do** (`CPX_HUY_MUON`) ⇒ `lyDo` phải gồm `{ma, nhan}`. (b) Nút "Đảo dòng" hiện theo luật (nguồn giá chỉ khi PLANNED; không đảo REVERSAL; không đảo dòng đã đảo) ⇒ máy chủ trả **`daoDuoc: boolean`**, web không tự suy luật. (c) Bản vẽ ghi "Hệ thống" ở dòng chụp/đảo tự động ⇒ DTO trả `tuDong: true` (người thật vẫn ở nhật ký) | DL, sửa kế hoạch §4 mục 7 |
| Lý do dòng đảo tự động "Đảo do đổi xe", "Đảo do huỷ chuyến" | TC-6 | — | TC-6 đặt nhãn "Đổi nhà xe / xe / tuyến trước xuất bến". Một mã phủ cả xe / nhà xe / tuyến nên **không** ghi được "đổi xe" cố định ⇒ nhãn đề xuất **"Đảo do đổi chuyến (xe, nhà xe hoặc tuyến)"** và **"Đảo do huỷ chuyến"** | BM, sửa TC-6 |
| Không dòng: "Chưa có dòng chi phí nào." | G2 | — | khớp | BM |
| Trạng thái "chưa có giá": nút "Nhập giá thoả thuận" (chính) + "Lấy lại giá bảng"; gợi ý **"Bảng giá vừa có giá 450.000 ₫ cho tuyến này — bấm 'Lấy lại giá bảng' để dùng."** | Task 10 (`chup-lai`) | DTO kế hoạch **không có** số giá bảng khớp | Số tiền mới, phải do máy chủ tính bằng `chonDongGiaThue` ⇒ **Q3** | **T**, câu Q3 |
| Form "Nhập giá thoả thuận": Số tiền (₫) *, Ghi chú thoả thuận * (ô nhiều dòng), "Lưu giá thoả thuận" | Task 10 (`gia-thoa-thuan`) | — | khớp | BM |
| Form "Điều chỉnh chi phí": Số tiền (+ hoặc −) *, Lý do * ▾, Ngày phát sinh * "(hôm nay)", Ghi chú; lỗi **"Tổng chi phí chuyến sẽ âm — đảo điều chỉnh giảm trước"** khi điều chỉnh −700.000; "Lưu điều chỉnh" | Task 10 (`dieu-chinh`) | — | Kế hoạch chỉ gắn `tong_am` cho route `dao` (V9). Bản vẽ cho thấy route `dieu-chinh` cũng phải đổi lỗi CSDL tổng âm sang 409 câu này. Ô Lý do **không** liệt kê "Giá thoả thuận trước" (chỉ cho AGREED) | DL, sửa kế hoạch §4 mục 8 |
| Hàng nút cuối "Điều chỉnh" + gợi ý "Điều chỉnh cộng hoặc trừ vào tổng; ghi sai thì 'Đảo dòng'." / "Chuyến đã huỷ vẫn ghi được phí huỷ." | G2 | — | Nút theo `can(transport.cost.adjust)` + trạng thái chuyến; trạng thái nên lấy từ DTO | BM |
| Trạng thái 3: chuyến **Đã huỷ** có phí huỷ (5 dòng: giá bảng cũ đã đảo do đổi xe, đảo, giá bảng mới đã đảo, đảo do huỷ, phí huỷ 135.000; tổng 135.000) | Task 9, 10 (V8/V8b) | — | khớp luật ADR C4 | BM |
| **THIẾU:** hộp xác nhận "Đảo dòng" (route đòi `lyDo` + `ghiChu`) | Task 10 | `POST …/chi-phi/dao` | Theo khuôn form Điều chỉnh (ô Lý do + Ghi chú); lỗi `tong_am` hiện trong hộp | THIẾU |
| **THIẾU:** dòng loại **"Giá thoả thuận"** (AGREED) và chip nguồn "Giá thoả thuận" | Task 10 | — | Chip cùng khuôn "Giá bảng" (đề xuất tông `soon`) | THIẾU |
| **THIẾU:** chuyến **xe công ty** (`rented = 0`, không dòng) và ca V13 (đổi sang xe công ty, mọi dòng đã đảo, tổng 0) | — | DTO `thue` | Đề xuất: không dòng và không thuê thì ẩn khối; có dòng thì hiện dòng, không nút giá | THIẾU |
| **THIẾU:** form G2 bản 390px (bản vẽ chỉ vẽ 3 trạng thái điện thoại, không vẽ form); đang tải; lỗi tải | — | — | Dùng tấm đáy như form Đổi giá của 1a | THIẾU |

### 2.3 Màn 1c: Bảng kê chi phí xe thuê (G4, trang mới `/bang-ke-xe`)

| Thành phần / trạng thái | Task kế hoạch | Route / DTO cần | Lệch | Loại |
|---|---|---|---|---|
| h1 "Bảng kê chi phí xe thuê" + phụ đề "Chuyến nào, nhà xe nào, bao nhiêu — để trả tay cho nhà xe." | G4 | — | Menu "Bảng kê chi phí xe", tiêu đề "…xe thuê" (theo bản vẽ) | BM |
| Thẻ lọc: Từ ngày, Đến ngày, Nhà xe ▾, Trạng thái ▾ + chú thích "Lọc theo ngày chạy, tối đa khoảng 3 tháng. Trạng thái: Đã phát sinh (đã chạy xong) · Chưa chạy · Đang chạy · Đã huỷ · Chưa có giá." | Task 10 | `GET /api/van-chuyen/chi-phi?tu=&den=&nha-xe=&trang-thai=` | khớp TC-14 (92 ngày) | BM |
| Dòng tóm tắt "6 chuyến · 2 nhà xe · 1 chuyến chưa có giá" | G4 | **chưa có** | Số đếm và phân loại "chưa có giá" là luật ⇒ máy chủ trả `soChuyen`, `soNhaXe`, `soThieuGia` | DL, sửa kế hoạch §4 mục 9 |
| Nút **"Tải bảng kê"** | — (không có trong ADR/kế hoạch) | **chưa có** | Xuất dữ liệu tiền ra tệp ⇒ **Q1** | **DL/T**, câu Q1 |
| Đầu nhóm nhà xe: tên + "N chuyến"; "TỔNG NHÓM" + số (accent-strong) | Task 10 (`tongBangKe` theo nhà xe) | `nhom[]: {nhaXe, soChuyen, tongNhom}` | Tổng nhóm **máy chủ trả**; bản vẽ tự cộng | T (đúng kế hoạch, nhắc web không cộng) |
| Lưới máy tính 5 cột: MÃ CHUYẾN · NGÀY CHẠY / BIỂN SỐ · TUYẾN / TRẠNG THÁI · NGUỒN GIÁ / **ĐIỀU CHỈNH** / SỐ TIỀN; dòng bấm mở Chi tiết chuyến | Task 10, G4 | dòng: `{tripId, ma, ngayChay, bienSo, tuyen, trangThai, nguonGia, tong, soDieuChinh, soDieuChinhBiDao}` | (a) Cột ĐIỀU CHỈNH là **số tiền** ("+ 150.000 ₫", "—"; âm đỏ), còn kế hoạch chỉ có **số lần** ⇒ **Q2**. (b) "x điều chỉnh bị đảo do đổi chuyến" khớp `soDieuChinhBiDao`. (c) Chip trạng thái "Chưa có giá" thay trạng thái chuyến ⇒ máy chủ trả **nhóm trạng thái bảng kê** (`DA_PHAT_SINH`/`CHUA_CHAY`/`DANG_CHAY`/`DA_HUY`/`THIEU_GIA`) cho từng dòng | **T**, câu Q2; DL, §4 mục 9 |
| Dòng "Chưa có giá": nền `--c-sand-soft`, ô số = chữ "Chưa có giá" (`--c-sand-text`) | lệnh vẽ 3 | — | khớp | BM |
| Điện thoại: thẻ dọc, mã + số tiền cùng hàng; "ngày · biển số · tuyến"; chip; dòng điều chỉnh | G4 | — | — | BM |
| Khối cuối "TỔNG CỘNG" + "Chuyến chưa có giá chưa được tính." + số (24px, `--c-sand`) trên nền `--c-primary` | lệnh vẽ 3 | **`tongCong` chưa có trong DTO** | Bản vẽ tự cộng các nhóm ⇒ máy chủ trả `tongCong` (qua `tongBangKe`/`tongChiPhiChuyen`). Màu nền đậm xem §5 | **T**, sửa kế hoạch §4 mục 9 |
| **THIẾU:** trống (không chuyến trong khoảng), đang tải, lỗi tải, lỗi khoảng > 92 ngày, mở thẳng trang khi không có quyền | Task 10 | — | Khuôn trống / lỗi của `web/dieu-phoi.ts` | THIẾU |

### 2.4 G3: ô chọn tuyến ở Tạo / sửa chuyến

Không có trong bản vẽ, đúng như kế hoạch nói "không cần vẽ". Làm theo khuôn ô chọn xe của `web/chuyen-sua.ts`; trống = "Chưa chọn tuyến"; route `GET /api/van-chuyen/tuyen` (chỉ tên). **THIẾU (đã biết).**

## 3. Câu hỏi cho chủ

**Q1. Nút "Tải bảng kê" (bản vẽ có, ADR và kế hoạch chưa có).**
- **Khuyến nghị (A): lượt này chưa làm nút.** Kế toán xem bảng kê trên màn; tải tệp làm ở lượt sau, cùng lúc đưa nợ nhà xe vào sổ công nợ (ADR-0057 T4/Q11–Q12).
- Lý do: tệp tải về chứa toàn bộ số tiền trả nhà xe, rời khỏi app. Ai được tải, tải định dạng gì (Excel/CSV), có ghi nhật ký không, đều là quyết định về dữ liệu và tiền chưa có trong ADR.
- (B) Làm ngay: tệp CSV do **máy chủ** dựng, cùng quyền `transport.cost.view`, mỗi lần tải ghi một dòng nhật ký. Hệ quả: thêm một route và một luật nhật ký mới, cần ghi thành ADR nhỏ; lát T2 giao diện dài thêm.

**Q2. Cột "Điều chỉnh" ở bảng kê: hiện số TIỀN điều chỉnh hay SỐ LẦN điều chỉnh?**
- **Khuyến nghị (A): hiện số tiền như bản vẽ ("+ 150.000 ₫").** Máy chủ tính bằng một hàm mới trong `src/modules/van-chuyen/tien-xe.ts` (cộng các điều chỉnh chưa đảo), có ca sổ vàng.
- Lý do: Kế toán trả tay cho nhà xe cần biết phần tiền chênh so với giá gốc; số lần không giúp đối chiếu hoá đơn.
- (B) Theo kế hoạch: chỉ hiện "2 điều chỉnh". Hệ quả: không thêm trường tiền nào, nhưng màn lệch bản vẽ và Kế toán phải mở từng chuyến để xem số.
- Chọn (A) thì hàng rào "một nguồn tính" (Task 11 bước 2 ý 3) phải cho thêm tên hàm này; bài số lạ phủ cả trường mới.

**Q3. Gợi ý "Bảng giá vừa có giá 450.000 ₫ cho tuyến này" trên khối Chi phí chuyến.**
- **Khuyến nghị (A): làm.** Trường mới `giaBangCoThe` (số tiền hoặc trống) **chỉ** nằm trong phản hồi chi phí chuyến (`transport.cost.view`), do máy chủ tra bằng `chonDongGiaThue`. Nút "Lấy lại giá bảng" chỉ hiện khi trường này có giá trị.
- Lý do: Kế toán biết trước sẽ lấy giá bao nhiêu, tránh bấm nhầm. Nút cũng chỉ hiện khi có giá để lấy, đúng lệnh vẽ ("khi chưa có giá và bảng giá vừa có").
- (B) Bỏ con số, chỉ hiện nút "Lấy lại giá bảng" luôn (bấm mà không có giá thì nhận lỗi 409). Hệ quả: không thêm trường tiền, nhưng lệch bản vẽ và có lần bấm thừa.
- Chọn (A) thì bài số lạ `480017` thêm ca: đặt giá bảng 480017, gọi Chi tiết chuyến **bằng Bán hàng**, không được thấy số này.

**Q4. Dải cảnh báo "Chuyến xe thuê chưa có giá — chưa được xuất bến": Bán hàng có thấy không?**
- **Khuyến nghị (A): Bán hàng KHÔNG thấy dải này.** Họ vẫn thấy lý do giữ "Chuyến xe thuê chưa có giá" trong thẻ "Điều kiện xuất bến" có sẵn, không số tiền, như ADR C5 đã duyệt. Dải và nút "Nhập giá thoả thuận" chỉ hiện cho người có `transport.cost.view` / `transport.cost.adjust`.
- Lý do: lời trong dải bảo người xem "nhập giá thoả thuận…", nhưng Bán hàng không làm được việc đó. Thẻ điều kiện đã cho họ biết vì sao xe chưa chạy được.
- (B) Bán hàng cũng thấy dải, nhưng không có nút, lời đổi thành "Quản trị hoặc Kế toán nhập giá bảng hoặc giá thoả thuận". Hệ quả: thêm một biến thể lời; Bán hàng thấy cùng một tin ở hai chỗ.

(Mục màu nền đậm của bản vẽ, ví dụ khối Tổng cộng và tab đang chọn, là **BỀ MẶT**, không hỏi; cách xử lý ở §5.)

## 4. Sửa kế hoạch con (để người code theo bản vẽ, không theo chữ kế hoạch cũ)

1. **Thanh bên (lời chủ, toàn app, khổ ≥ 641px), thêm vào G1 hoặc làm riêng trước:**
   - `public/app.css:320`: `--c-sidebar-bg: var(--c-surface-alt)`. Đây là đúng màu nền trang (`body` dùng `--c-alt` → `--c-surface-alt` = #eaf2f8). Không dùng `#EEF2F6` của bản vẽ, vì không phải token.
   - `#sidebar` (`app.css:918`): thêm `border-right: 1px solid var(--c-sidebar-border)`, theo bản vẽ (`border-right:1px solid #D3E1EC`). Thiếu viền thì thanh bên nhoà vào trang.
   - `src/shared/giao-dien.ts`: `CHA["nen-thanh-ben"]` đổi `"nen-the"` → `"nen-trang"`; `MAC_DINH["nen-thanh-ben"]` đổi `"#ffffff"` → `"#eaf2f8"`. `src/giao-dien-mac-dinh.test.ts` đỏ nếu không khớp.
   - Chạy `src/token-giao-dien.test.ts`: tương phản của `--c-sidebar-item`, `-title`, `-text-on` trên nền mới dự kiến vẫn đạt (#475569 và #0c4a6e trên #eaf2f8).
   - Nền mục đang chọn `--c-primary-soft` (#dcebf6) trên #eaf2f8 sẽ **rất nhạt**. Bản vẽ cũng nhạt tương tự (#DCE4EC trên #EEF2F6), và mục chọn vẫn có chữ đậm màu chính, nên giữ nguyên.
   - Kịch bản Chrome: `giao-dien-smoke.mjs`, `dot-c-smoke.mjs`, `trang-chu-smoke.mjs` (ảnh). Thêm mục nhật ký phiên bản.
   - **Cần kiểm trước:** nếu production đã có ghi đè "Nền thanh bên" ở màn Giao diện công ty (ADR-0087), giá trị mặc định mới sẽ không hiện. Mở `/api/giao-dien.css` để xem.
2. **Menu (G1, G4):**
   - Thêm 2 mục con dưới "Vận chuyển", ngay sau "Điều phối xe" (`web/shell.ts:250`): "Bảng giá thuê xe" `/bang-gia-xe` (`can(transport.rate.view)`), "Bảng kê chi phí xe" `/bang-ke-xe` (`can(transport.cost.view)`).
   - Thêm 2 dòng cùng tên ở nhóm VẬN CHUYỂN của `web/account.ts` (lối vào ở điện thoại), và thêm hai đường dẫn vào danh sách làm sáng tab "Tôi" (`web/shell.ts:71`).
   - Sửa đếm mục thanh bên của `trang-chu-smoke.mjs`: Quản trị 17 → 19, trang `/audit` 20 → 22; Kế toán thêm 2. Sửa cả `quyen-thieu-quan-tri-smoke.mjs` và thứ tự mục của `xe-smoke.mjs`.
3. **Trang mới**: `/bang-gia-xe`, `/bang-ke-xe` vào `PAGES` + danh sách js (`src/shared/sw-policy.ts:16,25,30`) + script `build:web`; `data-title` theo §2.0.
4. **`GET /api/van-chuyen/bang-gia` (Task 4):**
   - `nhaXe` phải gồm **nhà xe đang hợp tác** và **nhà xe đã thôi mà còn dòng giá chưa kết thúc**, mỗi mục có `dangHopTac: boolean`. Màn ghi "(đã thôi hợp tác)" và ẩn "Thêm giá" / "Đổi giá" với nhà xe đó, chỉ cho "Kết thúc".
   - Không có mục này thì luật ADR B4 "đóng giá của nhà xe đã thôi luôn làm được" không có lối trên màn.
5. **`BangGiaDto` (Task 4):**
   - Thêm `trangThai: "DANG_AP" | "SAP_AP" | "DA_KET_THUC"` do máy chủ tính theo `ngay`.
   - GET trả **mọi dòng** của nhà xe; `ngay` chỉ để gắn nhãn, không lọc. Ghi rõ điều này vào Interfaces.
6. **Tuyến, cỡ xe (Task 4):**
   - `POST /tuyen` nhận `{ ten }`, máy chủ **tự sinh mã** (mã bất biến, không hiện ra màn).
   - `POST /co-xe` nhận `{ tuSoKhach, denSoKhach }`, máy chủ sinh mã và nhãn mặc định "a–b khách" ("a khách" khi bằng nhau).
   - `PUT` giữ như kế hoạch (`ten`/`nhan`, `dangDung`). Sửa thân test ca đầu của Task 4 (đang gửi `ma`).
7. **`ChiPhiChuyenDto.dong[]` (Task 10):**
   - Thêm `daoDuoc: boolean` (máy chủ áp luật đảo), `tuDong: boolean` (dòng chụp/đảo do lệnh chuyến, màn ghi "Hệ thống").
   - Đổi `lyDo` thành `{ ma, nhan } | null`.
   - Thêm cấp chuyến `coTheNhapThoaThuan`, `coTheChupLai` (hoặc để web suy từ `trangThai` + `thue` + `nguonGia`; khuyến nghị máy chủ trả, cho đúng luật "giao diện không tự suy luật").
   - Nếu chủ chọn Q3 = A: thêm `giaBangCoThe: number | null`.
8. **Route `POST …/chi-phi/dieu-chinh` (Task 10):** đổi lỗi CSDL tổng âm sang 409 `tong_am`, câu "Tổng chi phí chuyến sẽ âm — đảo điều chỉnh giảm trước" (bản vẽ hiện lỗi này ở form Điều chỉnh). Thêm ca test: điều chỉnh −700.000 trên tổng 600.000.
9. **Bảng kê (Task 10):**
   - DTO thêm `tongCong`, `soChuyen`, `soNhaXe`, `soThieuGia`; mỗi nhóm `soChuyen`, `tongNhom` (= `tongBangKe`); mỗi dòng `nhomTrangThai` (`DA_PHAT_SINH`/`CHUA_CHAY`/`DANG_CHAY`/`DA_HUY`/`THIEU_GIA`).
   - Nếu chủ chọn Q2 = A: thêm `tongDieuChinh` cho mỗi dòng, hàm mới ở `tien-xe.ts`, nới hàng rào Task 11 bước 2 ý 3, thêm ca sổ vàng.
   - Web **không** cộng, không đếm.
10. **TC-6 (nhãn lý do hệ thống):** `CPX_DOI_CHUYEN` → "Đảo do đổi chuyến (xe, nhà xe hoặc tuyến)"; `CPX_HUY_CHUYEN` → "Đảo do huỷ chuyến".
11. **Câu lỗi `nha_xe_khong_hop_tac`** (Task 4): đổi theo bản vẽ, "Nhà xe này đã thôi hợp tác — không thể thêm giá mới".
12. **Task G1:** form "Đổi giá" khoá ô Tuyến, Cỡ xe (chỉ đọc); thêm hộp "Kết thúc" (ô Đến ngày). **Task G2:** thêm hộp "Đảo dòng" (Lý do + Ghi chú); khối chỉ dựng khi `can(transport.cost.view)`; đặt cuối cột chính `dp-ct-main`.
13. **Bài số lạ (Task 11 bước 1):** thêm hai route trang mới vào danh sách quét tự động (đã tự vào nếu quét `route("GET"…)`). Nếu Q3 = A, thêm ca "giá bảng 480017 không lộ ở `/api/van-chuyen/chuyen/:id` khi gọi bằng Bán hàng".

## 5. Bảng ánh xạ token (bản vẽ `_ds` → `public/app.css`)

Không nhập CSS `_ds` vào app. Các trang mới viết sau dấu mốc PWA nên **chỉ dùng token**, không hex/px.

| Bản vẽ dùng | Giá trị `_ds` | Token app | Ghi chú |
|---|---|---|---|
| `--c-primary` (tiêu đề, chữ đậm, `#0C4A6E`) | #0c4a6e | `--c-primary` | Cùng giá trị. Với nền thanh/nút/mảng đậm, dùng **token vai** (`--c-btn-primary-*`, `--c-selected-*`, `--c-band-*`), không trỏ thẳng `--c-primary` (luật `app.css:314`) |
| `--c-primary-soft` (đầu nhóm bảng kê, chip "Chỉ Kế toán · Quản trị", tab chưa chọn) | #dcebf6 | `--c-primary-soft` (đầu nhóm: `--c-band-bg` / `--c-on-band`) | |
| `--c-soft-hover` (nền form nội tuyến, chân tab Tuyến/Cỡ) | #f0f7fc | `--c-soft-hover` | |
| `--c-accent` (nút "Thêm giá" biến thể accent) | #c0392b | `--c-accent` | Làm theo bản vẽ (accent dành cho hành động chốt và nhãn giá) |
| `--c-accent-strong` (số tiền, tổng nhóm, tổng chi phí) | #96271a | `--money-due` của `_ds` không có trong app ⇒ dùng `--c-accent-strong` | |
| `--c-sand`, `--c-sand-soft`, `--c-sand-text` (dòng chưa có giá, chip đảo do đổi chuyến, chip cảnh báo) | như app | `--c-sand`, `--c-sand-soft`, `--c-sand-text`; chip: `.vc-chip-warn` | |
| `--c-green-soft` / `--c-green-text` (chip Đang áp, Giá bảng, Đã phát sinh) | như app | `.vc-chip-ok` (`--c-green-*`) | |
| `--c-danger`, `--c-danger-soft`, `--c-danger-text` (số âm, chip Đã huỷ / phí huỷ, dải lỗi) | như app | `--c-danger`; chip `.vc-chip-danger`; dải `.banner.banner-danger` | |
| Dải cảnh báo tone warning | — | `.banner.banner-warning` + `.banner-title` + `.banner-actions` | Khuôn có sẵn (`app.css:952-959`) |
| `--c-border`, `#D3E1EC` | #d3e1ec | `--c-border` / `--c-sidebar-border` | |
| `--c-text`, `--c-text-muted`, `#475569` | | `--c-text`, `--c-text-muted` | |
| `#334155` (tuyến, ghi chú) | — | **không có tương đương** ⇒ dùng `--c-text` | Không thêm màu mới |
| `#E6EDF3` (chip Đã kết thúc / Đảo / xám) | — | **không có tương đương** ⇒ `.vc-chip-muted` (`--c-surface-alt` + `--c-text-muted`) | |
| `#EEF2F6` (nền thanh bên `.sb-gray`) | — | `--c-surface-alt` (#eaf2f8), theo lời chủ "màu nền toàn trang" | §4.1 |
| `#DCE4EC` (mục thanh bên đang chọn, huy hiệu) | — | `--c-sidebar-active`, `--c-sidebar-badge` (= `--c-primary-soft`) | |
| `--c-on-dark` đè `#0C4A6E` (chữ đầu thanh, mục chọn) | | `--c-sidebar-text-on` | |
| `--c-placeholder` (ô trống "Để trống nếu đang áp") | #94a3b8 | `--c-placeholder` | |
| `--c-scrim` (nền mờ tấm đáy) | rgba(15,23,42,.45) | `--c-scrim` | |
| Bóng tấm đáy "overlay" | | `--shadow-overlay` | |
| `#fff` (nền thẻ, ô nhập) | | `--c-surface` (`--c-card`) | |
| `body{background:#dfe8ef}` | — | không dùng: đây là nền khung xem của bản vẽ, không phải nền app | |
| Tab viên thuốc **đang chọn** nền `--c-primary` chữ trắng | | **Không có token vai đậm** ⇒ dùng `--c-selected-bg` / `--c-selected-text` (nền nhạt, chữ màu chính) như mọi nút lọc đang chọn của app | BM. Lệch màu có chủ đích theo hướng sáng của app (bản 1.65 + lời chủ về thanh bên). Nếu chủ muốn đúng màu đậm: thêm token vai mới ở nhóm "MÀU THEO VAI" |
| Nút DS `primary` ("Nhập giá thoả thuận", "Lưu…", "Thêm") | | `.btn.btn-primary` (`--c-btn-primary-*`) | |
| Khối "TỔNG CỘNG" nền `--c-primary`, chữ trắng, số `--c-sand` | | **Không có token vai đậm tương đương.** Đề xuất `--c-band-bg` / `--c-on-band` (nền nhạt, chữ màu chính) + số `--c-accent-strong` (vàng cát trên nền nhạt không đọc được) | BM, cùng lý do như tab |
| Bo 12px / 8px / 18px (tấm đáy) | | `--radius-md` / `--radius-sm` / `--radius-lg` | |
| Ô cao 44px, chữ 16px | | `--tap-min` (44px), `--fs-step-5` (16px, chống zoom iOS) | |
| Độ đậm 800 / 700 / 600 | | `--fw-heavy` / `--fw-bold` / `--fw-semibold` | Hiện cùng 500 theo chủ |
| Cỡ chữ 22px h1, 11px nhãn cột (giãn chữ .08em), 13–14px phụ, 24px số tổng | | `--fs-h1`, `--fs-badge` + `--ls-eyebrow`, `--fs-label`, `--fs-stat-*` hoặc thang `--fs-step-*` | Lưới cột 140/130/120/110/150/96px: **không có token** ⇒ thêm `--w-bk-*` / `--w-bg-*` vào nhóm "Riêng của Tour Đảo Booking" |
| Phông Nunito | | `--font` (Be Vietnam Pro) | |

## 6. Tệp mã sẽ bị chạm (để điều phối thấy chỗ đụng giữa các đợt)

**Giao diện (lát T2 giao diện, G1–G4 + thanh bên):**
- Mới: `web/bang-gia-xe.ts`, `public/bang-gia-xe.html`, `web/bang-ke-xe.ts`, `public/bang-ke-xe.html`.
- Sửa:
  - `web/chuyen.ts` (khối Chi phí chuyến). **Đụng** Đợt 2 và Đợt 5 nếu các đợt đó sửa Chi tiết chuyến.
  - `web/chuyen-sua.ts` (ô tuyến, G3). **Đụng** các đợt sửa form chuyến.
  - `web/shell.ts` (2 mục con, danh sách tab "Tôi"). **Đụng** mọi đợt thêm mục menu.
  - `web/account.ts` (nhóm VẬN CHUYỂN).
  - `public/app.css`: token `--c-sidebar-bg`, viền `#sidebar`, khối CSS mới cho 3 màn, token bề rộng cột mới. **Đụng nhiều nhất**; khối `:root` và thanh bên là chỗ đợt nào cũng có thể chạm.
  - `src/shared/giao-dien.ts` (`CHA`, `MAC_DINH`).
  - `src/shared/sw-policy.ts` (`PAGES`, js), `package.json` (`build:web`).
  - Nếu Q4 = A: có thể chạm `src/shared/ly-do-giu.ts` / `dieu-phoi-man.ts` (lời nhắn `THIEU_GIA` hiện cho Bán hàng).
  - `src/shared/changelog.ts` + `src/shared/app-info.test.ts`.
- Test / kịch bản: `src/giao-dien-mac-dinh.test.ts`, `src/token-giao-dien.test.ts`, `src/shared/sw-policy.test.ts`, `src/giao-dien-hoi-bang-quyen.test.ts`; kịch bản Chrome mới cho 3 màn; sửa `trang-chu-smoke.mjs`, `quyen-thieu-quan-tri-smoke.mjs`, `xe-smoke.mjs`, `giao-dien-smoke.mjs`, `dot-c-smoke.mjs`, `chuyen-smoke.mjs`, `chuyen-sua-smoke.mjs`; ghi thêm dòng vào bảng "Sửa tệp nào thì chạy lại kịch bản nào" của `web/CLAUDE.md`.

**Máy chủ (đã có trong kế hoạch, thêm các trường ở §4):**
- `src/shared/contracts.ts` (kiểu `BangGiaDto`, `ChiPhiChuyenDto`, bảng kê). **Đụng** mọi đợt thêm DTO.
- `src/shared/permissions.ts` (+ test ghim, `xem-don-theo-quyen.test.ts`, `src/shared/tro-ly-cau-truc-ten.ts`). **Đụng** các đợt thêm ô quyền.
- `src/modules/van-chuyen/index.ts`, `tien-xe*.ts` (mới), `dieu-phoi*.ts`, `chuyen-repo.ts`, `rules.ts`. **Đụng** Đợt 2, 5, 6 (cùng tệp điều phối).
- `src/shared/ly-do-giu.ts`, `dieu-phoi-kieu.ts`, `dieu-phoi-kiem.ts`.
- `migrations/<N>_vc_bang_gia_thue.sql`, `<N+1>_vc_chi_phi_chuyen.sql` (số lấy lúc thi công, theo L2).
- `scripts/audit-checks.mjs`, `golden/van-chuyen-chi-phi.json`, `src/tien-xe-so-la.test.ts`, `src/tien-xe-mot-nguon.test.ts`, `tests/e2e/tien-xe-thue.mjs`, `tests/e2e/run.mjs`.

**Ghi chú về nội dung bản vẽ:** bản chép của điều phối không có câu nào trông như lệnh cho người đánh giá. Dòng `// LƯU Ý: bản vẽ tự CỘNG tổng…` là chú thích của điều phối, tôi đã dùng như dữ kiện.
