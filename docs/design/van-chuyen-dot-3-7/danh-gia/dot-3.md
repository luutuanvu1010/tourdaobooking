# Đánh giá bản vẽ Đợt 3: "Quản lý lịch xe bận.dc.html"

- **Đối chiếu với:** kế hoạch con `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-03-khung-ban-gio-lai.md` (Task 1–10), ADR-0055 (VK2-A, VK2-B), ADR-0053 D9.1–D9.4.
- **Mã đã đọc:** worktree `ghi-quyet-dinh-van-chuyen` = `origin/main` 992f7cbe. Trên main chưa có gì của Đợt 3: chưa có `vc_unavailability`, chưa có route khung bận.
- **Nguồn bản vẽ:** điều phối cấp nguyên văn, vì phiên phụ không có DesignSync. Token lấy ở `../colors.css`.
- **Kiểm chữ trong bản vẽ:** không có câu nào trông như lệnh cho AI. Chỉ có dữ liệu mẫu và chữ giao diện.

---

## 1. Tóm tắt

1. Bản vẽ có **một màn mới**: trang "Lịch xe bận", dạng lưới tuần (cột = 7 ngày, hàng = xe). Màn có 2 trạng thái vẽ: lưới, và lưới kèm form "Thêm lịch bận" mở tại chỗ. Thành phần gồm thẻ khung bận có nút ✕, nút chuyển tuần, chú thích màu.
2. **Khớp kế hoạch khoảng 1/3:**
   - Khớp: ghi khung bận cho xe, chọn xe, có giờ, có lý do, Quản trị gỡ được.
   - Lệch: kế hoạch đặt khối này trong **Chi tiết xe** (Màn A) và dải bận trên **Điều phối xe** (Màn B). Bản vẽ thay Màn A bằng một trang tuần riêng và **không vẽ** Màn B lẫn hai cảnh báo giờ lái.
3. **Lệch chạm dữ liệu/luật:**
   - Dữ liệu mẫu trộn chuyến tour vào khung bận. ADR-0055 đã loại "sổ giữ chỗ riêng", và Q-L2-1 a cấm khung chồng chuyến.
   - Lý do gõ tự do, trong khi ADR quy định lý do từ danh mục `BAN_XE`, không có cột chữ tự do.
   - Form chỉ một ngày, "Cả ngày" = 00:00–23:59. Cách này hở 1 phút và không ghi được khung nhiều ngày.
   - Ai được xem trang mới chưa có ADR nào nói.
4. **Lệch không cần hỏi (ADR đã chốt hoặc làm theo khuôn):**
   - Nút ✕ "xoá thẳng" phải đổi thành **Rút** có hỏi lại và gửi `version`.
   - Nút "Lưu" màu navy đặc lệch luật "màu theo vai" ngày 2/10.
   - Phông Nunito lệch quyết định 30/9 (mọi chữ Be Vietnam Pro).
5. **4 câu hỏi cho chủ** (mục 3). Câu 2 phải chốt **trước khi chạy migration Task 1**. Phần máy chủ còn lại (Task 1–9) làm tiếp được.

---

## 2. Bảng màn / trạng thái → task → route/DTO → lệch → loại

| # | Màn / trạng thái / thành phần (bản vẽ) | Task kế hoạch | Route / DTO cần (hiện có?) | Lệch | Loại |
|---|---|---|---|---|---|
| 1 | **Trang "Lịch xe bận"** — trang riêng, tiêu đề + "28/09 – 04/10/2026 · N lịch bận" | **Không có.** Task 10 đặt khối trong Chi tiết xe (Màn A) | **CHƯA CÓ — route mới đề xuất** `GET /api/van-chuyen/ban-xe?tu=YYYY-MM-DD` (mục 4, sửa S1). Kế hoạch chỉ có `GET /xe/:id/ban` (một xe) và `khungBanXe` trong `GET /lich` (một ngày) | Trang tuần riêng thay cho khối trong Chi tiết xe | BỀ MẶT (bố cục — theo bản vẽ). Ai được xem trang → **Câu 4** |
| 2 | Nút ‹ / "Tuần này" / › | — | tham số `tu` của route mới | Mốc tuần phải tính theo **ngày VN** (`vnToday`, `addDays`), không theo `Date` của trình duyệt (bản vẽ dùng `new Date(2026,9,2)`) | BỀ MẶT + luật hiển thị (Review Focus 1) |
| 3 | Cột "XE": biển số (đậm) + "Xe 16 chỗ" | — | `XeChonDto { id, bienSo, soCho, trangThai }` (có sẵn trong `LichChungResponse.xe`). Route mới trả lại đúng kiểu này | Xe `maintenance` chưa vẽ cách hiện. Xe nhà xe đối tác có/không? | BỀ MẶT. **BẢN VẼ THIẾU** chip "Bảo dưỡng" cho xe trạng thái bảo dưỡng |
| 4 | Ô ngày: nền `#EAF2F8` ở hôm nay; ô trống = xe rảnh | — | — | — | BỀ MẶT |
| 5 | **Thẻ khung bận** (nền vàng nhạt): giờ "06:30–16:00" / "Cả ngày" + lý do | Task 6 (`KhungBanXeDto`), Task 10 (`dongKhungBan`) | `KhungBanXeDto { id, xeId, batDauMs, ketThucMs, lyDo, daRut, daQua, version }` (kế hoạch Task 6 — **chưa có**) | Khung qua nửa đêm / nhiều ngày: bản vẽ không có. Kế hoạch đòi hiện ở **cả** D và D+1 | BỀ MẶT. **BẢN VẼ THIẾU** nhãn "từ 23:00" / "đến 07:00" (theo khuôn, mục 4 S3) |
| 6 | Thẻ mẫu "Tour 4 đảo TD-20261002-0003", "Đón khách sân bay", "Tour Vinpearl" cùng màu khung bận | **Không có.** ADR-0055 "Phương án bị loại": sổ giữ chỗ riêng = hai nguồn | Nếu hiện chuyến: `chuyen[] { id, ma, xeId, batDauMs, ketThucMs, trangThai }` trong route mới (chỉ khi `can(trip.view)`) | Trộn chuyến vào khung bận. `TD-…` là **mã đơn** (module orders), không phải mã chuyến `CX-…` | **CHẠM DỮ LIỆU/LUẬT → Câu 1** |
| 7 | Nút ✕ (aria "Xoá") trên thẻ, bấm là mất ngay | Task 6 route `…/ban/:bid/rut` + `version`; Task 10 "Rút có hỏi xác nhận" | `POST /api/van-chuyen/xe/:id/ban/:bid/rut { version }` (kế hoạch — **chưa có**) | Xoá thẳng ↔ ADR chỉ-thêm, rút một lần, khoá lạc quan. Khung đã qua không rút được (K5) | Giữ biểu tượng ✕ (bề mặt), **đổi hành vi theo ADR** (không hỏi — ADR A1 đã chốt). **BẢN VẼ THIẾU** hộp hỏi rút + 409 |
| 8 | Nút **"Thêm lịch bận"** màu san hô `#C0392B` | Task 10 ("Ghi lịch bận") | — | Chữ "Thêm lịch bận" thay "Ghi lịch bận"; màu san hô (đã có tiền lệ "+ Chuyến mới" dùng `btn-accent`) | BỀ MẶT — theo bản vẽ |
| 9 | **Form mở tại chỗ**: Xe (chọn) · Ngày · Từ · Đến · Lý do (gõ) · Lưu · Đóng | Task 10 `FormKhungBan { tuNgay, tuGio, denNgay, denGio, lyDo }` (chọn lý do) | `POST /api/van-chuyen/xe/:id/ban { batDau:{ngay,gio}, ketThuc:{ngay,gio}, lyDo: <mã> }` (kế hoạch — **chưa có**); danh sách lý do: `KhungBanXeListResponse.lyDo` hoặc route mới trả `lyDo[]` | (a) **một ngày** thay hai ngày → **Câu 3**; (b) **lý do gõ tự do** thay chọn danh mục → **Câu 2**; (c) chọn xe trong form (kế hoạch: đã ở trang một xe) → bề mặt, theo bản vẽ | (a)(b) CHẠM DỮ LIỆU; (c) BỀ MẶT |
| 10 | Nút "Lưu" nền navy đặc, chữ trắng | — | — | Luật 2/10 (`public/app.css` "MÀU THEO VAI"): màn mới lấy nút từ `--c-btn-primary-*` (nền nhạt + chữ navy) | BỀ MẶT — xung đột hai luật của chủ; mặc định đề xuất ở mục 4 S9 |
| 11 | Chú thích "Xe bận · ô trống là xe rảnh" | — | — | Nếu Câu 1 = A thì cần thêm ô chú thích "Chuyến đã xếp" | BỀ MẶT (phụ thuộc Câu 1) |
| 12 | Lỗi khi lưu (trùng chuyến 409 `khung_ban_chong_chuyen`, lỗi ô, 409 `khung_ban_vua_doi_route`, 409 `khung_ban_da_qua`, 409 `khung_ban_chong_chuyen_csdl`) | Task 6, Task 10 (`cauLoiChongChuyen`), lệnh vẽ trạng thái 4 | `KhungBanChongChuyenLoi` (kế hoạch) | Bản vẽ không có | **BẢN VẼ THIẾU** — theo khuôn khung lỗi đỏ `.vc-*`/`--c-danger-*` |
| 13 | Đang tải / trống (chưa có xe) / lỗi tải / 403 | khuôn có sẵn (`xe.html` `#xe-empty`) | — | Bản vẽ không có | **BẢN VẼ THIẾU** — theo khuôn `vc-empty` |
| 14 | Khổ điện thoại 390px | Global Constraints (kịch bản 390 + 1040) | — | Bản vẽ chỉ khổ máy tính; lưới `min-width:860px` cuộn ngang trong thẻ | **BẢN VẼ THIẾU** — giữ cuộn ngang trong thẻ, cột XE dính trái (khuôn `--w-dp-tl-nhan` của dòng thời gian), form xếp 1 cột (auto-fit đã tự làm) |
| 15 | Người không có `vehicle.manage` mở thẳng trang | Task 6 (403) | — | Bản vẽ không có | **BẢN VẼ THIẾU** — theo khuôn trang Xe (chặn + câu tiếng Việt) |
| 16 | **Màn B — dải bận trên "Điều phối xe"** (máy tính: dải gạch chéo trên hàng xe; điện thoại: dòng "Xe bận …" trong thẻ xe) | Task 7 (`khungBanXe` trong `GET /lich`), Task 10 `daiBanTrenLich` | `LichChungResponse.khungBanXe: KhungBanLichDto[]` (kế hoạch — **chưa có**) | **Không vẽ** | **BẢN VẼ THIẾU** — làm theo khuôn (mục 4 S5) |
| 17 | **Hai cảnh báo giờ lái** `GIO_LAI_VUOT`, `CHUYEN_DAI_CAN_NGHI` ở "Cần xử lý" + `canhBaoLenh` sau tạo/sửa chuyến | Task 3, 4, 7 | `CanhBaoLichDto` có sẵn; `canhBaoLenh` (kế hoạch) | **Không vẽ** | **BẢN VẼ THIẾU** — tự vào "Cần xử lý" qua `viecCanXuLy` (khuôn có sẵn, biểu tượng `clock`, tone vàng); thông báo sau lệnh theo khuôn `canhBaoXep` |
| 18 | Hai ô chính sách (giờ lái tối đa, nhắc nghỉ) | Task 5 | `DispatchPolicyDto` thêm 2 khoá (kế hoạch) | Không vẽ — kế hoạch đã nói "ô thêm vào màn có sẵn theo khuôn, không cần vẽ" | Không lệch |

**Dữ liệu mẫu:** biển số "79A-123.45", "Bảo dưỡng định kỳ"… là dữ liệu giả, không phải dữ liệu thật. Không có tên hay SĐT khách.

---

## 3. Câu hỏi cho chủ (lời thường)

**Câu 1. Chuyến tour ("Tour 4 đảo…", "Đón khách sân bay") xuất hiện trong lịch bận để làm gì?**
- **Khuyến nghị (A):** trang tuần **tự hiện các chuyến đã xếp** (lấy từ lịch điều phối). Chuyến có màu khác khung bận, chỉ xem, bấm mở Chi tiết chuyến. Chuyến ghi **mã chuyến CX-… + giờ**, không mã đơn TD-…, không tên khách. "Lịch bận" chỉ dùng cho việc của xe: bảo dưỡng, đăng kiểm, sửa chữa.
- **Lý do:**
  - Chuyến đã có sẵn trong máy. Bắt người dùng gõ lại là hai nguồn, dễ lệch. ADR-0055 đã loại cách "sổ giữ chỗ riêng".
  - Máy **không cho** ghi lịch bận chồng lên chuyến đã xếp (bạn chọn Q-L2-1 "Không cho ghi"). Nếu gõ "Tour…" vào đúng giờ chuyến thì máy sẽ từ chối.
  - Mã đơn TD-… thuộc phần Đơn hàng. Kéo nó sang trang Xe là mở thêm đường lộ dữ liệu đơn.
- **Nếu chọn khác (B — cho ghi tour thành lịch bận gõ tay):**
  - Cần ADR mới, đảo Q-L2-1.
  - Lịch bận và chuyến thật sẽ lệch nhau khi chuyến dời hoặc huỷ.
  - Máy không biết tour nào là thật để chặn xếp trùng.

**Câu 2. Lý do bận: gõ tự do hay chọn trong danh sách?**
- **Khuyến nghị:** ô "Lý do" thành **ô chọn** 4 lý do (Bảo dưỡng, Đăng kiểm, Sửa chữa, Khác). Ô giữ đúng vị trí và cỡ trong bản vẽ. Quản trị sửa được tên lý do ở màn Lý do điều phối có sẵn.
- **Lý do:**
  - ADR-0055 (bạn đã duyệt) ghi lý do là danh mục.
  - Kế hoạch cố ý không có cột chữ tự do, để không ai gõ tên hay SĐT khách vào nhật ký xe.
  - Nếu chọn A ở Câu 1 thì gợi ý "đã có tour…" trong ô không còn cần.
- **Nếu chọn khác (thêm ô ghi chú tự do, ví dụ "Gara Minh Phát, thay lốp"):**
  - Phải thêm một cột dữ liệu mới, cần ADR bổ sung.
  - **Phải quyết trước khi chạy migration Task 1.** Quyết sau thì tốn thêm một migration.
  - Phải che dãy số và không đưa vào nhật ký.

**Câu 3. Form chỉ có một ngày + giờ từ/đến. Xe nằm xưởng nhiều ngày, hoặc bận qua đêm, thì ghi thế nào?**
- **Khuyến nghị:**
  - Thêm một ô **"Đến ngày"** cạnh ô "Ngày", mặc định bằng ngày bắt đầu, nên người chỉ ghi một ngày không phải làm gì thêm.
  - Khung bận "Cả ngày" lưu là **00:00 hôm đó → 00:00 hôm sau**.
  - Khung nhiều ngày hiện trên mọi ô ngày nó phủ.
- **Lý do:**
  - Bản vẽ ghi "Cả ngày" = 00:00–23:59. Máy so giờ kiểu "đến trước 23:59", nên còn hở 1 phút: chuyến 23:59 vẫn xếp được.
  - Xe vào xưởng 3 ngày sẽ phải ghi 3 lần, rút 3 lần.
  - ADR cho phép khung tới 31 ngày.
- **Nếu chọn khác (giữ đúng một ngày như bản vẽ):**
  - Máy tự hiểu "Đến 23:59" là hết ngày và lưu thành 24:00 (một quy ước ngầm phải ghi rõ).
  - Khung nhiều ngày phải ghi nhiều lần.
  - Bận qua đêm (23:00 → 07:00) phải tách hai dòng.

**Câu 4. Ai được mở trang "Lịch xe bận"?**
- **Khuyến nghị:** chỉ **Quản trị và Toàn quyền** (người quản lý xe). Bán hàng và Kế toán vẫn thấy xe bận ngay trên "Điều phối xe" (dải bận), đúng ADR-0055 A4.
- **Lý do:**
  - Trang có nút thêm và rút, mà chỉ người quản lý xe được làm.
  - Một trang chỉ-xem riêng cho Bán hàng là thêm một chỗ phải giữ quyền đúng.
- **Nếu chọn khác (cho Bán hàng, Kế toán xem chỉ-đọc):**
  - Route phải mở cho ô "xem chuyến", ẩn nút theo quyền.
  - Thêm một dòng kiểm quyền.
  - Kế toán thấy được lịch xe cả tuần, hiện nay chỉ thấy theo ngày.

> **Tự quyết, không hỏi** (bề mặt, hoặc ADR đã chốt — ghi để chủ xem):
> - ✕ = **Rút** (có hỏi lại), không xoá, theo ADR.
> - Nút "Thêm lịch bận" màu san hô theo bản vẽ.
> - Nút "Lưu" dùng màu nút chính theo vai (2/10).
> - Phông Be Vietnam Pro (30/9).
> - Màn B và cảnh báo giờ lái làm theo khuôn có sẵn, không chờ vẽ.
> - Bỏ khối trong Chi tiết xe, thay bằng mục "Lịch xe bận" ở thanh bên.

---

## 4. Danh sách sửa kế hoạch con (để người code theo bản vẽ)

**S1 — Route mới (Task 6, thêm bước):** `GET /api/van-chuyen/ban-xe?tu=YYYY-MM-DD`
- Cổng `office`. **`can(vehicle.manage)` đầu thân**, 403 trước 400. Vắng `tu` = thứ Hai của tuần hiện tại theo ngày VN. Sai khuôn → 400.
- Khoảng `[vnLocalToMs(tu,"00:00"), vnLocalToMs(addDays(tu,7),"00:00"))`.
- Trả `LichXeBanResponse { tu, den, xe: XeChonDto[], khung: KhungBanXeDto[], chuyen: ChuyenXeBanDto[], lyDo: {code,label}[] }`:
  - `khung`: chưa rút, giao khoảng — câu `khung_ban_xe_trong_khoang` có sẵn trong kế hoạch, đã lọc `subject='VEHICLE'`.
  - `chuyen`: chỉ khi Câu 1 = A **và** `can(trip.view)`. Dùng `tripsTouching`, bỏ `CANCELLED`. `ChuyenXeBanDto { id, ma, xeId, batDauMs, ketThucMs, trangThai }`, danh sách trắng: **không** mã đơn, tên khách, tài xế.
- Tên route theo khuôn `ban-tai-xe` của Đợt 6.
- Thêm vào `src/route-access.test.ts`: Bán hàng / Kế toán / Tài xế → 403.
- Bài khoá khoá DTO (danh sách trắng như Task 7 Step 1).
- Ca e2e trong `tests/e2e/khung-ban-xe.mjs`: khung 23:00 CN → 07:00 T2 có ở tuần trước và tuần sau.

**S2 — Task 10, thay Màn A:**
- Bỏ khối "Lịch xe bận" trong `web/xe-chi-tiet.ts`.
- Tạo trang mới `public/lich-xe-ban.html` + `web/lich-xe-ban.ts` theo **công thức c** của `docs/CHANGE-GUIDE.md`: `PAGES` trong `src/shared/sw-policy.ts`, `build:web` trong `package.json`, `initShell()`.
- Thêm mục con thanh bên "Lịch xe bận" dưới Vận chuyển (ô `vehicle.manage`, sau "Xe") trong `web/shell.ts`, và dòng cùng tên ở nhóm VẬN CHUYỂN của `web/account.ts`.
- Sửa số đếm của `trang-chu-smoke.mjs`: Quản trị **17 → 18** mục (`:541`, `:557`, `:873`), `/audit` 20 → 21.
- Có thể thêm liên kết "Xem lịch bận" ở Chi tiết xe nếu chủ muốn (bản vẽ không có — không làm).

**S3 — Task 10, hàm thuần (thêm vào `src/shared/khung-ban-hien-thi.ts`):**
- `luoiTuanXeBan(v: LichXeBanResponse, bayGioMs): { ngay: {k, thu, nhan, homNay}[]; hang: { xeId, bienSo, soChoNhan, trangThaiNhan|null, o: { muc: MucO[] }[] }[]; soLichBan }`.
- `MucO = { loai: "BAN"|"CHUYEN"; gio: "Cả ngày"|"06:30–16:00"|"từ 23:00"|"đến 07:00"|"Cả ngày (tiếp)"; nhan; rutDuoc; id; version }`.
- Ngày theo VN. Khung phủ nhiều ngày được cắt theo từng ô. "Cả ngày" khi phủ trọn `[00:00, 24:00)`.
- `rutDuoc = !daRut && ketThucMs > bayGioMs`.
- `soLichBan` = số khung (không đếm chuyến) giao tuần, khớp dòng "N lịch bận".
- Test bắt buộc:
  - khung 23:00 D → 07:00 D+1 ra "từ 23:00" ở D và "đến 07:00" ở D+1;
  - tuần chứa ngày đổi múi không áp dụng (VN không có giờ mùa hè), nhưng phải test máy chạy múi UTC (`TZ=UTC node --test`);
  - khung đã qua → `rutDuoc:false`.
- `FormKhungBan` sửa theo Câu 3:
  - nếu chủ chọn khuyến nghị: `{ xeId, ngay, denNgay, tuGio, denGio, lyDo }`;
  - nếu chọn một ngày: `{ xeId, ngay, tuGio, denGio, lyDo }`, với `denGio = "23:59"` → lưu 24:00, ghi chú quy ước.
- `docFormKhungBan` báo lỗi theo ô.

**S4 — Task 10, hành vi ✕:**
- `aria-label="Rút lịch bận <lý do> <giờ>"`. Chỉ hiện khi `rutDuoc` và `can(vehicle.manage)`.
- Bấm mở hộp hỏi theo khuôn `confirmation-dialog`/`bang-truot`, câu như lệnh vẽ trạng thái 5: "Rút lịch bận Bảo dưỡng 08:00–17:00 03/10? Xe sẽ xếp chuyến được trong giờ này."
- Gửi `{ version }`.
- 409 `khung_ban_vua_doi_route` → toast + tải lại tuần.
- Thẻ chuyến (loại `CHUYEN`) không có ✕. Bấm thẻ chuyến → `/chuyen?id=`.

**S5 — Task 10, Màn B không chờ vẽ (đổi câu "Dừng phần DOM tới khi có bản vẽ"):**
- Dải bận trên dòng thời gian máy tính dùng **cùng màu nền "Xe bận"** của trang tuần (token mới `--c-xe-ban-bg`) + nhãn lý do.
- Điện thoại: dòng "Xe bận 08:00–17:00 · Bảo dưỡng" trong thẻ xe, biểu tượng có sẵn trong `web/icons.ts`.
- Hai cảnh báo giờ lái: không cần DOM mới (`viecCanXuLy` + `ICON_CANH_BAO` Task 4).
- Bỏ phần Màn B khỏi LỆNH VẼ.

**S6 — Task 1, lý do:**
- Nếu Câu 2 = khuyến nghị: giữ nguyên (không cột ghi chú, K12).
- Nếu chủ muốn ghi chú: **dừng Task 1**, soạn ADR bổ sung trước.

**S7 — Task 6, `kiemKhungBanMoi`:** theo Câu 3. Thân `{ batDau:{ngay,gio}, ketThuc:{ngay,gio} }` giữ nguyên (đã nhận được nhiều ngày). Nếu chủ chọn một-ngày thì giao diện tự đổi `23:59` thành `{ngay+1, "00:00"}` trước khi gửi. Máy chủ không đổi.

**S8 — Task 10, chữ:**
- "Ghi lịch bận" → **"Thêm lịch bận"**; "Huỷ" (form) → **"Đóng"**.
- Tiêu đề trang "Lịch xe bận".
- Chú thích "Xe bận · ô trống là xe rảnh" (+ "Chuyến đã xếp" nếu Câu 1 = A).
- Lệnh vẽ trạng thái 1–5 của Màn A không dùng nữa. Chỉ giữ câu 409 trùng chuyến và câu hỏi rút làm chữ mẫu.

**S9 — Màu nút:**
- "Thêm lịch bận" → `.btn-accent` (theo bản vẽ, tiền lệ "+ Chuyến mới").
- "Lưu" → `.btn-primary` (`--c-btn-primary-*`, luật "màu theo vai" 2/10). **Khác bản vẽ:** nền nhạt + chữ navy thay vì nền navy đặc + chữ trắng. Nếu chủ muốn đúng bản vẽ thì phải thêm vai màu "nút chốt đặc" vào nhóm MÀU THEO VAI (hỏi khi duyệt ảnh, không chặn).
- "‹", "›", "Tuần này", "Đóng" → `.btn` viền (`--c-border`, nền `--c-surface`, chữ `--c-primary`).

**S10 — Kịch bản Chrome mới:** `lich-xe-ban-smoke.mjs`, khổ 1040 + 390, thứ tự Kế toán (403) → Quản trị. Thêm hàng vào bảng của `web/CLAUDE.md`.

---

## 5. Ánh xạ token (bản vẽ → `public/app.css`)

| Bản vẽ | Dùng ở | Token app | Ghi chú |
|---|---|---|---|
| `#EAF2F8` | nền trang, nền cột hôm nay | `--c-surface-alt` (`--surface-page`) | khớp |
| `#0F172A` | chữ thường | `--c-text` | khớp |
| `#0C4A6E` | tiêu đề, biển số, chữ nút viền | `--c-primary` (chữ nút → `--c-btn-primary-text` / `--c-selected-text` theo vai) | khớp giá trị |
| `#0C4A6E` (nền nút "Lưu") | nút lưu | `--c-btn-primary-bg` | **khác giá trị** — S9 |
| `#082F49` | link hover | `--c-primary-strong` | khớp |
| `#D3E1EC` | mọi viền | `--c-border` | khớp |
| `#fff` | thẻ, ô | `--c-surface` / `--c-card` | khớp |
| `#475569` | chữ phụ, nhãn cột | `--c-text-muted` | khớp |
| `#C0392B` | nút "Thêm lịch bận" | `--c-accent` (`.btn-accent`) | khớp |
| `#fff` trên nút san hô | | `--c-on-dark` | khớp |
| **`#FEF3C7`** | nền thẻ "Xe bận", ô chú thích | **không có.** Gần nhất `--c-sand-soft` `#fbe3b3` (đậm hơn) | **Token MỚI** `--c-xe-ban-bg: #fef3c7` ở nhóm "Riêng", ghi "theo bản vẽ Quản lý lịch xe bận (tiền lệ Đăng nhập: bản vẽ = duyệt màu)". Dùng chung cho dải bận Màn B |
| **`#334155`** | dòng lý do trong thẻ | **không có** | Dùng `--c-text` (không thêm màu chữ mới — khác biệt nhỏ) |
| `'Nunito'` | chữ nội dung | `--font` (Be Vietnam Pro) | lệch có chủ đích: quyết định 30/9 |
| `'Be Vietnam Pro'` | tiêu đề | `--font-display` | khớp |
| độ đậm 800 / 700 / 600 | | `--fw-heavy` / `--fw-bold` / `--fw-semibold` | đều = 500 theo ADR-0087. Không viết số |
| 24px (h1) | | `--fs-step-11` | máy tính các trang Vận chuyển dùng `--fs-vc-h` (26) — theo bản vẽ: 24 |
| 20px (‹ ›) | | `--fs-step-9` | |
| 16px (nút, ô gõ, ngày) | | `--fs-ui` / `--fs-step-5` | ô gõ ≥16px |
| 15px (biển số) | | `--fs-step-4` (`--fs-vc-sm`) | |
| 14px (dòng phụ, nhãn ô) | | `--fs-label` (`--fs-step-3`) | |
| 13px (chữ trong thẻ, "Xe 16 chỗ") | | `--fs-step-2` | |
| 12px (THỨ 2…, XE) | | `--fs-badge` (`--fs-step-1`) | |
| `letter-spacing:.08em` | | `--ls-eyebrow` | khớp |
| 24px (padding trang) | | `--s5` | |
| 16px | | `--s4` | |
| 12px | | `--s3` | |
| 8px | | `--s2` | |
| 4px (gap nhãn–ô) | | `--s1` | |
| **6px** (gap thẻ trong ô; padding dọc thẻ) | | **không có token chung** (`--gap-vc-label` 6px là nghĩa khác) | MỚI `--gap-xb-the: 6px` |
| **2px** (gap biển số–số chỗ) | | không có | MỚI `--gap-xb-xe: 2px` |
| **20px** (padding ngang nút "Thêm lịch bận") | | không có (`--login-side` nghĩa khác) | MỚI `--pad-xb-btn: 20px` |
| 8px radius | | `--radius-sm` | |
| 12px radius | | `--radius-md` | |
| **4px** radius (ô chú thích) | | không có (`--radius-dp-lg` = 3px) | MỚI `--radius-xb-lg: 4px` hoặc dùng `--radius-dp-lg` (lệch 1px — chọn MỚI để đúng bản vẽ) |
| 44px (nút, ô) | | `--tap-min` | |
| 1200px (bề rộng tối đa) | | `--w-main` | khớp |
| **150px** (cột XE) | | không có (`--w-dp-tl-nhan` 96) | MỚI `--w-xb-xe: 150px` |
| **860px** (lưới tối thiểu) | | không có | MỚI `--w-xb-luoi: 860px` |
| **72px** (ô tối thiểu cao) | | không có token cùng nghĩa (`--h-vc-due` là dòng sắp hết hạn) | MỚI `--h-xb-o: 72px` |
| **160px** (cột form tối thiểu) | | không có (`--w-gd-o` nghĩa khác) | MỚI `--w-xb-o: 160px` |
| **24px** (nút ✕) | | không có | MỚI `--xb-x: 24px` (vùng chạm nhỏ hơn 44 — theo bản vẽ; nếu kịch bản axe báo, mở rộng vùng chạm bằng `::after` mà không đổi hình) |
| **14px** (ô chú thích) | | không có (`--dp-lg-o` 12px) | MỚI `--xb-lg-o: 14px` |

Không nhập CSS `_ds` vào app. Mọi luật mới viết trong khối `.xb-*` sau dấu mốc PWA, chỉ dùng token (quét `tests/e2e/pwa.mjs`).

---

## 6. Tệp mã sẽ bị chạm (để điều phối biết đụng nhau)

**Tạo mới:**
- `public/lich-xe-ban.html`, `web/lich-xe-ban.ts`.
- `docs/evidence/<ngày>-dot-3/kich-ban/lich-xe-ban-smoke.mjs`.
- `src/shared/khung-ban-hien-thi.ts` (+ test) — đã có trong kế hoạch, nay thêm `luoiTuanXeBan`.

**Sửa:**

| Tệp | Việc Đợt 3 | Đụng đợt khác |
|---|---|---|
| `src/shared/contracts.ts` | `KhungBanXeDto`, `KhungBanLichDto`, **`LichXeBanResponse`, `ChuyenXeBanDto`** (mới), 2 khoá chính sách, `canhBaoLenh` | mọi đợt — gộp tay |
| `src/modules/van-chuyen/index.ts` | 3 route khung bận + **`GET /ban-xe`** + nối tạo/sửa chuyến + chính sách | Đợt 2, 4, 5, 6, 7 |
| `src/modules/van-chuyen/khung-ban-repo.ts` (mới) | thêm câu đọc khoảng tuần (dùng lại `khung_ban_xe_trong_khoang`) | **Đợt 6** dùng chung bảng `vc_unavailability` — Đợt 6 phải chờ Đợt 3 gộp |
| `src/modules/van-chuyen/chuyen-repo.ts` | dùng `tripsTouching` (không sửa) | — |
| `src/route-access.test.ts` | dòng `ban-xe` | Đợt 6 (`ban*`, `ban-tai-xe`) |
| `public/app.css` | ~11 token mới nhóm "Riêng" + khối `.xb-*`; dải bận trong khối `.dp-*` | mọi đợt có giao diện |
| `web/shell.ts` | mục con "Lịch xe bận" | **Đợt 6** (trang `/ban` của tài xế đối tác) |
| `web/account.ts` | dòng "Lịch xe bận" nhóm VẬN CHUYỂN | **Đợt 1** |
| `src/shared/sw-policy.ts`, `package.json` (`build:web`) | khai trang mới | Đợt 4 (`bang-gia-xe`, `bang-ke-xe`), Đợt 6 (`ban`) |
| `web/dieu-phoi.ts` | dải bận (Màn B) | **Đợt 2, 5, 7** |
| `src/shared/dieu-phoi-man.ts`, `dieu-phoi-lich-chung.ts`, `dieu-phoi-kiem.ts` | cảnh báo giờ lái, `khungBan` | Đợt 5, 7 |
| `web/chinh-sach-dieu-phoi.ts`, `src/shared/chinh-sach-hien-thi.ts` | 2 ô mới (Task 5) | — |
| `web/xe-chi-tiet.ts` | **không còn sửa** (bỏ Màn A) — nếu chủ muốn liên kết thì một dòng | gỡ được đụng độ với **Đợt 1** |
| `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs` | số mục thanh bên Quản trị 17 → 18 | bất kỳ đợt nào thêm mục thanh bên (Đợt 4, 6) — số đếm phải cộng dồn lúc gộp |
| `web/CLAUDE.md` | hàng bảng kịch bản Chrome | — |
| `migrations/<NNNN>_khung_ban_gio_lai.sql` | (Task 1) — chờ Câu 2 | số migration phải lấy sau mọi nhánh (L2) |

---

## Chưa kiểm

- Chưa dựng thử trang hay chạy test nào. Đây là đánh giá đọc mã và kế hoạch, không thi công.
- Chưa so ảnh: bản vẽ chỉ có mã HTML, không có ảnh khổ 390.
- Chưa đo chính xác số dòng trong `trang-chu-smoke.mjs` (lấy theo `web/CLAUDE.md`).
