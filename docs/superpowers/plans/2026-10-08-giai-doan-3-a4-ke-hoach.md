# Kế hoạch thi công A4: tài xế nhà xe đối tác dùng Nền tảng, Từ chối chuyến, Báo bận (ADR-0053 D7.1, D7.2, D7.5, D8, D9)

> **Thông tin chung**
> - **Ngày lập:** 2026-10-08.
> - **Điểm đo mã:** nhánh `claude/van-chuyen-goi-a-c` @ `8e2d189a`. Mọi `tệp:dòng` trong tệp này là của commit đó. Đ1 sẽ làm dời dòng, nên mỗi chỗ đều ghi kèm tên ký hiệu để tìm lại.
> - **Người thi công:** trợ lý AI, trên nhánh mới `a4-tai-xe-doi-tac`, tách từ nhánh chính sau khi Đ1, Đ2 và ADR-0105 đã gộp (§6.3).
> - **Thay cho:** `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-06-tai-xe-doi-tac.md`. Kế hoạch cũ chỉ giữ để tham khảo; phần lỗi thời liệt kê ở §0.4.
> - **Việc lớn:** quyền và dữ liệu cá nhân cho người ngoài là cửa một chiều (ADR-0053:188-193, :210). Vì vậy cuối lượt cần một người kiểm độc lập chỉ đọc, và chủ thử bằng tài khoản tài xế đối tác thật trên iPhone trước khi báo nhà xe.

---

## 0. Phạm vi

### 0.1 Nguồn chuẩn tắc (đã kiểm dòng Trạng thái và mục lục `docs/adr/README.md`)

| Nguồn | Trạng thái | Câu đã bị ADR sau thay hoặc bổ sung |
|---|---|---|
| ADR-0053 (README:57) | accepted 2026-09-30 | `:59` bị ADR-0096 thay: nay có cửa sổ xuất bến LC-20; vế "xuất bến từ ngày chạy" của D7.2 giữ nguyên nghĩa. `:55` và `:69` được ADR-0105 bổ sung (Q-2 a): chuỗi đích "Chỉ đường" của tài xế đối tác chỉ có trong khung D7.2. |
| ADR-0048 D2 (:93-138) | accepted | Câu về ô quyền bị ADR-0053:170 thay. LC-1 (:120) và LC-1b (:121) giữ nguyên. |
| ADR-0052 D4.3, D5b | accepted | `trip.passenger.add` của DRIVER_PARTNER **giữ `none`**. Chủ trả lời 5/10 (a), "chỉ tài xế công ty" (`docs/superpowers/plans/2026-10-05-van-chuyen-dot-5-nhat-ky.md:105-108`; `2026-10-05-adr-0052-a1b-de-xuat-luat.md:17`). Như vậy điều kiện "chỉ mở nếu A-1b đã duyệt" của ADR-0053:46 được trả lời bằng **không mở**. `trip.transfer` thuộc A5. |
| ADR-0104 Đ1 (:95-105) | accepted 2026-10-08 | Không thay câu nào của ADR-0053. Chỉ giao ở `permissions.ts` và tin `khan_cap` (§6.2). |
| ADR-0105 (:24-27, :94) | accepted 2026-10-08 | Khoá `diaChiChiDuong` đi theo cờ khung, `trongKhungXemKhach` khi Đợt 6 mở. |
| Lời chủ 2/10 tối | đã trả lời | "Đồng ý 18 câu theo khuyến nghị" gồm 6.1–6.5 (`2026-10-02-van-chuyen-cau-hoi-ban-ve.md:11`, :54-58). Nội dung khuyến nghị ở `docs/design/van-chuyen-dot-3-7/danh-gia/dot-6.md:59-79` và :83-108. |
| Lời chủ 5/10 về 0.2 (a–c) | đã trả lời | % tính trên giá khách lẻ, đối tác tự thu, tính theo từng chuyến (`2026-10-01-van-chuyen-con-lai-00-lo-trinh.md:174-182`). Với A4 đây chỉ là bối cảnh: A4 **không có số tiền nào**. Đối tác tự thu, nên màn tài xế đối tác không có ô tiền, đúng ADR-0053:71. |

### 0.2 Trong phạm vi

| # | Mục | ADR:dòng | Task |
|---|---|---|---|
| P1 | Cột DRIVER_PARTNER của `trip.view` và `trip.progress` đổi `none` → `assigned`. Mở chỉ bằng ô, không thêm route, không đổi cổng. | 0053:46, :51 | T6 |
| P2 | Ô mới `trip.refuse`: DRIVER_PARTNER = `assigned`, DRIVER = `none`, SUPER_ADMIN = `any`, các cột khác `none`. | :47, :105 | T6 |
| P3 | Ô mới `unavailability.self`: DRIVER_PARTNER = `own`, DRIVER = `none`, SUPER_ADMIN = `any`. | :47, :146 | T6 |
| P4 | Khung thấy khách = sau hạn Từ chối **VÀ** (hôm nay là ngày chạy **HOẶC** chuyến RUNNING đã xuất bến từ ngày chạy). Một hàm duy nhất. | :54-63, ADR-0105:94 | T1, T3 |
| P5 | DTO tài xế đối tác: như tài xế công ty, cộng khung D7.2. Mã đơn và người liên hệ trong khung. Không tiền. | :68-72 | T3, T7 |
| P6 | Tin chuyến tự tới tài xế đối tác. Không có luật mới. | :79 | T6 |
| P7 | Từ chối: dữ liệu, hạn "khoá dính" theo cặp, lô lệnh, bất biến B8.1–B8.5, route. | :83-131 | T2, T7 |
| P8 | Báo bận: bỏ trigger chặn DRIVER, B9.1–B9.4, route của tài xế, văn phòng xem. | :135-160 | T2, T8 |
| P9 | LC-03 xét cả khung bận tài xế khi tạo hoặc sửa chuyến (phần "câu đọc" của C25). | :156, :176 | T4 |
| P10 | 6.1 chỉ ghi tổng khách. 6.2 không có lý do bận ở dữ liệu văn phòng và câu 409. 6.3 thêm ô SĐT văn phòng. 6.4 không làm kéo thả; câu chặn và nhãn "Bận" ở ô chọn tài xế. 6.5 tên "Cuốc của tôi", nút Xuất bến giữ màu. | cau-hoi-ban-ve:54-58 | T4, T5, T8, T9 |
| P11 | Trang đầu và menu của tài xế đối tác (C24: `start-page.ts`). | 0053:200 | T6, T9 |
| P12 | Câu kiểm mới trong audit-invariants. | :201 | T11 |
| P13 | Hướng dẫn tài xế và Trợ giúp. | :209; dot-6:107 | T10 |

### 0.3 Ngoài phạm vi

- **Chia doanh thu taxi:** sổ riêng, (d) hợp đồng/hoá đơn/thuế, và các điểm e–h (`cau-hoi-ban-ve.md:15`).
- **Nhờ đón chéo và tiêu chí 9 của ADR → A5 (BL-VC-D4).** Gồm ô `trip.transfer` và D7.4. Ghi cho A5: khi tạo ô `trip.transfer`, đặt luôn cột DRIVER_PARTNER = `assigned` (0053:46); bài ghim hàng DRIVER_PARTNER khi đó lên 9 ô.
- **`trip.passenger.add` cho tài xế đối tác.**
- **Báo bận cho tài xế công ty; văn phòng ghi hoặc rút thay khung bận tài xế** (Q3 c; 0053:143). Phần "tài xế công ty" của C25 vẫn mở: ghi BACKLOG, cần ADR mới.
- **Kéo chuyến thả vào tài xế** (6.4). **Tách người lớn / trẻ em** (6.1).
- **Đếm hoặc đặt hạn mức số lần Từ chối** (:114). **Gợi ý tài xế thay** (MQ-01).
- **Bỏ tab "Trang chủ" `/tai-xe`:** giữ tab vì đó là chỗ xem giấy tờ (dot-6:102).
- **Pháp lý** của việc đưa danh sách khách cho người ngoài (0053:276): không giải bằng mã, nêu ở §6.
- **Mục changelog:** điều phối thêm một mục cho cả nhánh.

### 0.4 Kế hoạch cũ (06), đo lại tại `8e2d189a`: phần đã lỗi thời

| Chỗ trong kế hoạch cũ | Đo lại | Kết luận |
|---|---|---|
| §0 "Phụ thuộc cứng" (Đợt 2, 3, 4 T2, 5 A-1b) | Đã có đủ:<br>• `vc_unavailability` (0071)<br>• `THIEU_GIA` (`ly-do-giu.ts:62`)<br>• `baoThayDoiChuyen`<br>• `trip.passenger.add` (`permissions.ts:197`) và route `index.ts:1697` | Bỏ bảng này. Phụ thuộc mới là Đ1, Đ2, ADR-0105 (§6). |
| P6-1: `trongNgayChay` ở `dieu-phoi-kiem.ts:420` | Nay ở `:531-533` | Dời dòng |
| P6-3, Task 4: "5 ô mới + 4 cũ = 9", mở `trip.passenger.add` | Chủ trả lời 5/10: DRIVER_PARTNER `none` | **Lỗi thời.** Nay 4 ô mới + 4 ô cũ = **8 ô có tên** (NT-1). |
| Task 3: chèn `REFUSE_DEADLINE_INSERT` ở từng lô (`dieu-phoi.ts:118, :144`) | Đường mở dòng lái nay ở `dieu-phoi.ts:171` (tạo) và `:212` (sửa). Đ1 thêm đổi tài xế khẩn cấp; A5 sẽ thêm cứu hộ. | Đổi sang trigger `AFTER INSERT` (G-A4-3). Cách cũ giữ làm dự phòng. |
| Task 3: "10 chỗ `trongNgayChay` ở `index.ts:1046-1230`" | Nay:<br>• chi tiết `:1477`<br>• chín lệnh tiến độ `:1486-1692`<br>• hanh-khach `:1704`<br>• cộng khoá chỉ đường của ADR-0105 | Dời dòng, thêm chỗ |
| Task 3: `loaiTaiXe(staff)` dựa vào mã quyền | — | Thay bằng vế hạn theo `can(trip.refuse, {assigned})` (G-A4-2) |
| Task 0: biểu thức `julianday('now')` | Tiền lệ `scripts/audit-checks.mjs:51`: `CAST(strftime('%s','now') AS INTEGER)*1000` | Đổi biểu thức (G-A4-4) |
| Task 4: "tệp đề xuất luật" riêng cho chủ duyệt | ADR-0053:49 và :200: chủ duyệt ADR tức là duyệt việc nới (Điều 9.4). 6.3 đã duyệt 2/10. | Bỏ tệp đề xuất luật. Chỉ còn dòng `web/CLAUDE.md` (§1b) |
| "Cần chủ" mục 1 (6.1–6.5) | Chủ trả lời 2/10 tối | Đóng |
| Bài `dieu-phoi-kieu.test` "tám → mười nhóm" | Hiện đã có 10 nhóm | Thành **12** nhóm |
| "Chưa chắc": `refuseLeadMinutes` chưa có ô trên màn | — | Thêm ô trên màn, để Toàn quyền đổi được (0053:93) |
| Trích dẫn dòng:<br>• `contracts.ts:1146` / `:1453`<br>• ADR trích `permissions.ts:106/107/122`<br>• `index.ts:912-1117`<br>• `SO-HANG-RAO:132/:138/:139` | Nay:<br>• `contracts.ts:1191` / `:1550-1600`<br>• `index.ts:1458-1704`<br>• `SO-HANG-RAO:143/:149/:150` | Dời dòng |
| Báo cáo đánh giá:<br>• C24 (`permissions.ts:187, 193`; `start-page.ts:34-35`)<br>• C25 (`0071:56-59`) | Khớp | Giữ |

---

## 1. Điều ADR chưa trả lời

### 1a. Giả định tự áp (bề mặt, đảo ngược được, hoặc chỉ siết). Người kiểm soi từng dòng.

| Mã | Giả định | Loại |
|---|---|---|
| G-A4-1 | Biên nghiêm: thấy khách khi `bayGio > hạn`; Từ chối được khi `bayGio ≤ hạn`. Hai khoảng rời nhau (P6-2 cũ). | siết (Điều 9.4) |
| G-A4-2 | Vế hạn áp khi `can(staff,"trip.refuse",{assigned:true})`: DRIVER_PARTNER, và Toàn quyền nếu chính mình lái (chỉ siết). DRIVER không có vế hạn (0053:64). Thiếu dòng hạn thì coi là **ngoài khung** (đóng mặc định). | siết |
| G-A4-3 | Hạn chèn bằng trigger `AFTER INSERT ON vc_trip_driver` cho mọi cặp, cả tài xế công ty (P6-5 cũ). `lead_minutes` đọc chính sách hiệu lực tại `NEW.valid_from_at`. Phủ được mọi đường xếp: Đ1, A5, và cả đường sau này; cùng lý lẽ "không phụ thuộc lệnh nào nhớ gọi" (0053:91). Dự phòng nếu T0(c) hỏng: câu chèn trong lô. | kỹ thuật |
| G-A4-4 | B8.3 so giờ bằng `CAST(strftime('%s','now') AS INTEGER) * 1000`. Đây là ngoại lệ có tên của ghi chú "không dùng giờ CSDL" ở 0084, căn cứ 0053:122. So mili-giây nên không lệch múi giờ. | kỹ thuật |
| G-A4-5 | `coCuocCuaToi` = **giữ một mã quyền mà ô `trip.view` của chính mã đó đúng bằng `"assigned"`** (đọc `MATRIX`). **Không** dùng `can(…,{assigned:true})`, vì ô `any` của văn phòng cũng trả đúng: Bán hàng sẽ có tab Cuốc (`shell.ts:535`, `trang-chu-o.ts:61`). | bề mặt |
| G-A4-6 | DTO giữ tên khoá `trongNgayChay` (`contracts.ts:1599`) nhưng nghĩa là "trong khung xem khách"; ADR-0105 khoá theo cùng cờ. Đổi tên sẽ làm hỏng PWA cũ. | bề mặt |
| G-A4-7 | `maDon` của suất hiện như với tài xế công ty (mọi lúc), theo tiêu chí 3 của ADR (0053:216-223): chỉ ba khoá `hoTen`, `namSinh`, `lienHe` theo khung. Cách đọc chặt hơn của :70 (mã đơn cũng chỉ trong khung) chỉ là đổi một dòng; ghi ở §6.4. | đọc ADR |
| G-A4-8 | Câu đọc khung tài xế nằm ở tệp mới `khung-ban-tai-xe-repo.ts`, lọc `subject='DRIVER'` tường minh. `khung-ban-repo.ts` giữ chỉ VEHICLE (Review Focus 4; SO-HANG-RAO:385). Lịch chung (`dungLichNgay`, `dieu-phoi-lenh.ts:671-708`, ô `trip.view`) **không** nhận khung tài xế, nên Kế toán không thấy (0053:147). | siết |
| G-A4-9 | 6.2: nhánh DRIVER trong `kiemTaoSuaChuyen` (`dieu-phoi-kiem.ts:139-142`) bỏ `lyDoNhan`; nhánh VEHICLE giữ lý do. Câu chặn: "<Tên> bận từ <giờ ngày> đến <giờ ngày>. Chọn tài xế khác hoặc đổi giờ chuyến." (dot-6:91). | lời chủ 6.2 |
| G-A4-10 | `KHUNG_TAI_XE_TOI_DA_NGAY = 14` (G3-6), đặt cạnh `KHUNG_XE_TOI_DA_NGAY`. Không cho bắt đầu trong quá khứ. Phút tròn. | bề mặt |
| G-A4-11 | Gieo lý do nhóm `TU_CHOI_CHUYEN` (4 dòng, :86) và `BAN_TAI_XE` (3 dòng, :140). Tiền tố mới trong `TIEN_TO` (`chinh-sach-hien-thi.ts:222`) không trùng `"TU_CHOI"` của nhóm `TU_CHOI_NHAN`. | bề mặt |
| G-A4-12 | `office_phone` cho phép NULL, kiểm bằng `src/shared/phone.ts`. Nhật ký `dispatch_policy_changed` chỉ ghi "đổi số điện thoại văn phòng", không ghi chữ số. DTO tài xế chỉ có số khi đã nhập (6.3). | lời chủ 6.3 |
| G-A4-13 | `refuse_lead_minutes` có ô trên màn Chính sách; khoảng 60–2880 (CHECK và `kiemChinhSachMoi`). Chỉ áp cho cặp được xếp lần đầu sau khi đổi (:101). | bề mặt |
| G-A4-14 | Chi tiết chuyến văn phòng: chỉ người có `trip.dispatch` thấy **lý do** Từ chối. Kế toán thấy "Tài xế <tên> đã từ chối lúc …" không kèm lý do. Lý do có thể là "Ốm", theo tinh thần 6.2 và D9.2 (:147). Tin Từ chối không có lý do, không có tên. | siết |
| G-A4-15 | Route `tu-choi` theo thứ tự:<br>(1) `!can(trip.refuse,{assigned:true})` → **403** (DRIVER, Kế toán, Bán hàng);<br>(2) không có chuyến hoặc người gọi không lái: nếu `can(staff,"trip.refuse")` không ngữ cảnh (Toàn quyền) → **403** "Toàn quyền không từ chối thay — đổi người bằng xếp xe" (:105, :224); còn lại → **404**;<br>(3) thân sai → 400;<br>(4) chạy lô. | đọc ADR (ADR thắng khuôn 404 của họ `cuoc-cua-toi*`) |
| G-A4-16 | Tab "Báo bận của tôi" chỉ hiện cho tài khoản `chiTaiXe` và `can(unavailability.self)`; Toàn quyền không có tab (dot-6:101). Tab `/tai-xe` giữ. Biểu tượng: Cuốc → `assign`, Báo bận → `clock`. Nút Xuất bến giữ `btn-accent` (6.5). | bề mặt |
| G-A4-17 | `hanTuChoi` và `thayKhachTu` là `GioVnDto`, máy chủ tính (dot-6:85). `thayKhachTu` trả cho **mọi** tài xế khi đang ngoài khung, nên tài xế công ty cũng thấy dòng "Thấy danh sách khách từ …". | bề mặt |
| G-A4-18 | "Khung của tôi" gồm khung còn hiệu lực và khung đã rút trong 30 ngày; máy chủ trả sẵn `trangThai` `DANG \| SAP \| DA_RUT` (dot-6:88, T9). | bề mặt |
| G-A4-19 | Dải "Tài xế bận" của văn phòng: từ ngày đang xem tới +6 ngày (dot-6:92). DTO gồm `taiXeId`, `tenTaiXe`, `nhaXe[]` (nguồn `taiXeChoDieuPhoi`), giờ; không có lý do. Ô chọn tài xế ở `chuyen-sua` ghi "Bận" bằng cùng route; không thêm route mới. | lời chủ 6.2, 6.4 |
| G-A4-20 | Nhật ký:<br>• `trip_driver_refused`: mã chuyến và mã lý do (:109).<br>• `driver_unavailability_added` / `_withdrawn`: chỉ khoảng giờ, không mã lý do (6.2). | siết |
| G-A4-21 | Câu RAISE của B9.3 mở đầu bằng `lc03_`, để ánh xạ lỗi sẵn có của `lc03_unavailable` (0071) bắt được, kể cả khi đã hoàn tác Worker về mã cũ. | kỹ thuật |
| G-A4-22 | CHECK của B8.4 viết `(close_reason IS 'REFUSED') = (refuse_reason_code IS NOT NULL)`. Nếu dùng `=` thì `close_reason` NULL làm CHECK lọt. Nếu `ADD COLUMN` không nhận CHECK chéo cột (T0 b) thì dùng trigger, như B8.4 đã cho phép. | kỹ thuật |
| G-A4-23 | Gieo hạn cho mọi dòng lái đang mở lúc áp migration: `planned_start_ms − 720 phút` (G3-7, :92). | ADR |
| G-A4-24 | Câu cổng của lô Từ chối mang **đủ** điều kiện: `version`, `PLANNED`, người gọi có dòng lái mở, `?bayGio ≤ deadline_ms`. Các câu sau chỉ chạy khi `last_cmd_id = cmd`. Nếu cổng thắng mà câu đóng dòng lái không chạm dòng nào, sẽ có nhật ký mà không có Từ chối; cách này chặn trường hợp đó. Trigger B8.3 là lớp thứ hai. | kỹ thuật |

### 1b. Câu hỏi cho chủ

**Không có câu bắt buộc.** Mọi điều chạm quyền hoặc dữ liệu đều đã có trong ADR-0053, ADR-0105, lời chủ 2/10 (6.1–6.5) và 5/10.

**Một câu có điều kiện**, chỉ hỏi nếu T0(a) chứng minh CSDL không so được giờ hiện tại trong trigger. ADR-0053:126 bắt quay lại chủ trong trường hợp đó.

> **Tiêu đề:** Hạn từ chối
> **Câu:** "Cơ sở dữ liệu không tự kiểm được 'đã quá hạn từ chối' như quyết định đã duyệt (cần hai lớp chặn). Bạn chọn cách nào?"
> 1. **Mở xem chuyến trước, Từ chối sau (Recommended)**
>    - Được: tài xế nhà xe xem chuyến, bấm các bước chạy và báo bận ngay; mọi luật vẫn chặn hai lớp.
>    - Mất: tài xế nhà xe chưa tự từ chối trong app; muốn trả chuyến phải gọi văn phòng đổi người, cho tới khi có cách khác.
> 2. **Chỉ máy chủ kiểm hạn**
>    - Được: có nút Từ chối ngay.
>    - Mất: nếu phần mềm máy chủ sai, không còn lớp thứ hai chặn việc từ chối sau khi tài xế đã thấy tên khách.

**Đề xuất sửa luật, không phải quyết định dữ liệu hay quyền.** Điều phối gom vào lần trình kế: thêm vào bảng kịch bản Chrome của `web/CLAUDE.md` dòng `web/ban.ts` → `ban-smoke.mjs`. Khi chưa duyệt, kịch bản vẫn chạy và vẫn ghi bằng chứng.

---

## 2. Tiêu chí nghiệm thu (viết trước task; mỗi NT có bài máy)

- **NT-1 Ghim hàng DRIVER_PARTNER.**
  - Đúng 8 ô có tên: `trip.view` assigned, `trip.progress` assigned, `trip.refuse` assigned, `unavailability.self` own, cộng 4 ô cũ `feedback.submit`, `feedback.view`, `party.document.view`, `assistant.ask` (đo lại giá trị lúc thi công). Mọi ô khác `none`, kể cả `trip.passenger.add`, `trip.urgent_adjust` (Đ1), `trip.dispatch`, `trip.override`, `trip.call_ack`.
  - Cột DRIVER của `trip.refuse` và `unavailability.self` = `none`.
  - Sửa một ô thì bài đỏ.
  - Đối chiếu với tiêu chí 1 của ADR ("9 ô"): thiếu `trip.passenger.add` (chủ 5/10) và `trip.transfer` (A5), thêm `assistant.ask` có sau ADR. Lên 9 khi A5 tạo `trip.transfer`.
- **NT-2 IDOR.** Tài xế đối tác A gọi trên chuyến của B (mở, Từ chối, xem khách, rút khung của B) → 404; đổi id trên đường dẫn không lộ gì.
- **NT-3 Khung xem khách.**
  - Chạy đủ các ca ở 0053:217-222 với tài xế đối tác và tài xế công ty.
  - Kiểm ở **GET chi tiết VÀ ở phản hồi của cả chín lệnh tiến độ**. Ca bắt buộc: chuyến 14:00 có hạn 02:00, tài xế đối tác bấm Xuất bến lúc 00:05 → phản hồi lệnh **không có** `hoTen`, `namSinh`, `lienHe`, và không có chuỗi đích chỉ đường (ADR-0105).
  - Mọi lúc: không có khoá tiền, không có khoá NL/TE (6.1).
- **NT-4 Từ chối.**
  - Trước hạn → 200: dòng lái `REFUSED`, có lý do, người đóng = người gọi; đúng một dòng nhật ký.
  - Lý do thiếu, ngoài danh sách hoặc đã ngưng → 400.
  - Sau hạn → 409 `refuse_deadline_passed`. Chuyến đã xuất bến, kết thúc hoặc huỷ → 409.
  - Tài xế công ty → 403. Toàn quyền không lái → 403. Tài xế đối tác trên chuyến người khác → 404.
  - Từ chối song song với văn phòng đổi tài xế → đúng một bên thắng, bên kia 409 `stale`, đúng một dòng nhật ký.
  - Giao lại cho xe của nhà xe khác → giá đảo và chụp lại theo lô ADR-0057 có sẵn. Chỉ đổi tài xế, giữ cùng nhà xe và cùng xe → giá giữ.
  - Cùng `requestId` của chính người gọi → 200 như lần đầu.
- **NT-5 Khoá dính.** Đủ các ca ở 0053:225. Thêm: dời chuyến muộn hơn → 200, không lỗi trigger, hạn không đổi; SQL `UPDATE vc_refuse_deadline` tăng hoặc giữ nguyên `deadline_ms` → RAISE.
- **NT-6 Lớp CSDL Từ chối.** Chèn thẳng SQL, giờ gieo tương đối với **giờ thật**:
  - `REFUSED` với người đóng ≠ tài xế → RAISE;
  - `REFUSED` khi chuyến RUNNING → RAISE;
  - `REFUSED` sau hạn → RAISE;
  - có `refuse_reason_code` mà không `REFUSED` → RAISE;
  - mở lại dòng đã đóng → RAISE;
  - `DELETE` dòng hạn → RAISE.
- **NT-7 Sau Từ chối.**
  - Chuyến bị giữ ở `CHUA_CO_TAI_XE`.
  - Tin `tu_choi` tới người có `trip.dispatch` (Bán hàng, Quản trị, Toàn quyền); không tới Kế toán, không tới tài xế khác.
  - Tài xế mở lại chuyến → 404.
  - Văn phòng thấy "đã từ chối lúc …"; lý do chỉ hiện với người có `trip.dispatch`.
- **NT-8 Báo bận.**
  - Khung chồng chuyến đang được xếp → 409 `khung_ban_chong_chuyen_tai_xe`, kèm `chuyen:{id,ma,gio}[]` của chính người gọi; ghi thẳng SQL → RAISE.
  - Văn phòng xếp tài xế vào khung bận → 409 `TRUNG_GIO_TAI_XE`, câu không lý do; SQL → RAISE (chèn dòng lái, và dời giờ chuyến).
  - Sửa giờ hoặc xoá khung → RAISE.
  - Xem hoặc rút khung của người khác → 404.
  - Tài xế công ty ghi khung → 403. Kế toán gọi `ban-tai-xe` → 403.
  - Quá 14 ngày, bắt đầu trong quá khứ, kết thúc ≤ bắt đầu → 400.
  - Rút lần hai → 409.
  - DTO `ban-tai-xe` không có khoá lý do.
- **NT-9** (tiêu chí 9 của ADR, nhờ đón chéo) **hoãn sang A5**; ghi rõ ở báo cáo.
- **NT-10 Không lộ.** Mọi route mới và DTO tài xế đối tác, với dữ liệu mẫu có tên, năm sinh, SĐT, số bằng lái: nhật ký, tin, Bảng tin không chứa các dữ liệu đó; không có dãy ≥ 8 chữ số. Bỏ UUID trước khi quét (khuôn `8e2d189a`).
- **NT-11 Cổng.**
  - Tài khoản chỉ có DRIVER_PARTNER gọi `/api/orders`, `/api/orders/dashboard`, `/api/parties`, `/api/catalog`, `/api/van-chuyen/lich`, `/api/van-chuyen/xe`, `/api/van-chuyen/ban-tai-xe` → 403.
  - `GET /cuoc-cua-toi` → 200, chỉ chuyến của mình.
  - `POST …/hanh-khach` → 403 (`trip.passenger.add` none).
- **NT-12 Trang đầu và menu.**
  - `homeRedirect(DRIVER_PARTNER)` = `/cuoc`.
  - `coCuocCuaToi`: SALES, ACCOUNTING, ADMIN, SUPER_ADMIN → false; DRIVER+SALES → true.
  - Tab Báo bận chỉ hiện với tài khoản chỉ có DRIVER_PARTNER.
- **NT-13 Chính sách (6.3, D8.1).** Toàn quyền lưu `refuse_lead_minutes` và SĐT văn phòng. Nhật ký không có chữ số SĐT. DTO tài xế có `sdtVanPhong` khi đã nhập; chưa nhập thì không có khoá và màn ẩn nút "Gọi văn phòng".
- **NT-14 Tin D7.5.** Tài xế đối tác đang lái nhận `xep_lai`, `doi_chuyen`, `huy_chuyen`, `khan_cap` (Đ1) của chuyến mình. Bảng tin chỉ gắn `nguoi:<id>`, không bao giờ `tat-ca` hay `dieu-xe`.
- **NT-15 Hướng dẫn.** CHUNG + nhóm tài xế ≤ 30 phút. Mọi `[[nút]]` có nguyên chuỗi trong mã giao diện. Số chữ của Bán hàng và Quản trị không tăng.
- **NT-16 Lệnh kiểm.** Tất cả đều xanh:
  - `npm test`
  - `npm run typecheck` (0 lỗi)
  - `npm run build:web`
  - `npm run test:e2e`
  - `node scripts/audit-invariants.mjs --db local` (thoát 0 khi sạch, 1 khi gieo lỗi)
  - kịch bản Chrome 390 px và 1040 px

---

## 3. Task (mỗi task là commit nhỏ, đỏ trước xanh sau)

### T0. Thử khả thi (cổng dừng; không có mã sản phẩm, chỉ ghi kết quả vào nhật ký thi công)

1. **(a)** Viết trigger thử so `CAST(strftime('%s','now') AS INTEGER)*1000` với một cột `deadline_ms` gieo theo giờ thật ±10 phút. Chạy trên `node:sqlite` và trên `wrangler d1 … --local`.
   - **Thất bại thì DỪNG**, trình câu "Hạn từ chối" (§1b).
   - Ghi nhận: `mock.timers` chỉ giả `Date` của JS; SQLite vẫn dùng giờ thật. Bài route (đồng hồ giả, NOW_GIA = 2027-03-11) không bao giờ thấy lớp CSDL chặn, nên bài B8.3 phải chèn SQL trực tiếp.
2. **(b)** `ALTER TABLE … ADD COLUMN` có CHECK chéo cột (G-A4-22), chạy trên cả hai nền.
3. **(c)** Trigger `AFTER INSERT` ghi sang bảng khác bên trong một `db.batch` trên D1 local.
4. **(d)** `grep` toàn `src/`, `scripts/` và `architecture.test.ts` tìm luật cấm `'now'` hay cấm trigger ghi dữ liệu. Có luật thì ghi ngoại lệ có tên, căn cứ 0053:91 và :122.
5. **(e)** `docs/quyen-hoan.json`: không mã nào bị A4 xây lên (§4, cuối).

### T1. Hàm khung thuần và một chỗ gọi (đỏ đầu tiên; cửa một chiều)

- **Bài đỏ:**
  - `src/shared/khung-xem-khach.test.ts`, bảng ca 0053:217-222.
  - Bài quét `src/modules/van-chuyen/mot-ham-khung.test.ts`: ngoài hàm mới, không nơi nào gọi `trongNgayChay(` hay so `ngayChay === homNay` trong `src/modules/**` và `web/**`.
  - Câu đỏ mong đợi: `trongKhungXemKhach is not a function`, và "index.ts còn 11 chỗ gọi trongNgayChay".
- **Sửa** `src/shared/dieu-phoi-kiem.ts:531-533`. Thêm:
  ```ts
  trongKhungXemKhach(chuyen, hanTuChoiMs: number|null|undefined, bayGioMs): boolean
  mocMoKhung(chuyen, hanTuChoiMs): number
  ```
  - `undefined` = không có vế hạn (DRIVER); `null` = thiếu dòng hạn → `false` (G-A4-2).
  - Biên nghiêm `>` (G-A4-1).
  - `trongNgayChay` thành hàm nội bộ, chỉ được gọi từ hàm mới.
- **Chỗ gọi:** thêm hàm `khungCuaNguoiGoi(db, nen, staff, bayGioMs)` trong `index.ts`, cạnh `dangLai` (`:126`). Thay mọi `trongNgayChay(…)` ở:
  - `:1477` (chi tiết);
  - chín lệnh `:1486-1692`;
  - `:1704` (hanh-khach);
  - chỗ gọi khoá chỉ đường của ADR-0105 (đã gộp trước).
  - Ở T1, `hanTuChoiMs` luôn `undefined`, nên **không đổi hành vi** của DRIVER.
- **Bài** `cuoc-cua-toi.test.ts` (`:30`, `:49`) giữ xanh.

### T2. Migration `0091_tai_xe_doi_tac_tu_choi_bao_ban.sql` (số trống kế tiếp lúc thi công)

**Bài đỏ** `src/migrations-tu-choi-ban.test.ts` (khuôn `src/migrations-tai-xe-doi-tac.test.ts`), chèn SQL trực tiếp, giờ gieo tương đối giờ thật:
- NT-5 phần SQL, NT-6, NT-8 phần SQL;
- gieo hạn cho dòng lái đang mở;
- seed lý do;
- bỏ `vc_unavailability_driver_closed`.

Câu đỏ mong đợi: `no such table: vc_refuse_deadline`.

**Chú thích đầu tệp (bắt buộc):**
- ADR, mục đích.
- "CHỈ THÊM".
- Trigger chỉ đọc bảng `vc_` (Hiến chương 5.3).
- Ngoại lệ "giờ CSDL" của B8.3 (0053:122).
- **HOÀN TÁC:** D1 không có Down. Hoàn tác bằng migration mới: `DROP TRIGGER` mọi trigger tạo ở 0091, `CREATE TRIGGER vc_unavailability_driver_closed` lại y nguyên 0071:56-58. Không DROP bảng hay cột (cột thừa vô hại). Đóng ô quyền bằng mã.
- **Cửa một chiều, không thu hồi được:** dữ liệu khách đã hiện cho tài xế đối tác, dòng REFUSED, dòng hạn.
- Khôi phục toàn bộ CSDL bằng Time Travel chỉ dùng khi có thảm hoạ, không nằm trong đường hoàn tác thường.

**Nội dung:**
1. **Cột mới trên `vc_trip_driver`:**
   - `refuse_reason_code TEXT REFERENCES vc_reason(code)`, CHECK theo G-A4-22;
   - `closed_by_party_id TEXT REFERENCES pty_party(id)`.
2. **Bảng mới `vc_refuse_deadline`:**
   - cột: `trip_id`, `driver_party_id`, `deadline_ms INTEGER NOT NULL`, `lead_minutes INTEGER NOT NULL`, WHO;
   - `PRIMARY KEY (trip_id, driver_party_id)`;
   - trigger: `no_delete`; `only_decrease` (RAISE trừ khi `NEW.deadline_ms < OLD.deadline_ms`; chỉ cho đổi `updated_*`).
3. **Trigger hạn:**
   - `AFTER INSERT ON vc_trip_driver WHEN NEW.valid_to_at IS NULL`: `INSERT … SELECT … WHERE NOT EXISTS` lấy `lead_minutes` từ chính sách có `valid_from_at ≤ NEW.valid_from_at`;
   - `AFTER UPDATE OF planned_start_ms ON vc_trip`: đúng câu 0053:91, kèm `updated_at`/`updated_by` lấy từ NEW;
   - gieo hạn cho dòng lái đang mở (720 phút).
4. **Trigger trên dòng lái:**
   - B8.2: `BEFORE UPDATE ON vc_trip_driver WHEN NEW.close_reason='REFUSED' AND NEW.closed_by_party_id IS NOT OLD.driver_party_id`;
   - B8.3: chuyến khác PLANNED, hoặc không có dòng hạn còn ≥ giờ hiện tại (G-A4-4);
   - nhóm lý do Từ chối phải là `TU_CHOI_CHUYEN`.
5. **Cột chính sách:**
   - `refuse_lead_minutes INTEGER NOT NULL DEFAULT 720 CHECK (BETWEEN 60 AND 2880)`;
   - `office_phone TEXT` có CHECK độ dài;
   - đây là lệch I43, ghi như 0071.
6. `DROP TRIGGER vc_unavailability_driver_closed;`
7. **Trigger báo bận:**
   - B9.2: `BEFORE INSERT ON vc_unavailability WHEN NEW.subject='DRIVER'`, chặn khi có dòng lái mở của người đó trên chuyến PLANNED/RUNNING chồng giờ. RAISE `unavailability_overlaps_driver_trip`.
   - B9.3: `BEFORE INSERT ON vc_trip_driver` và `BEFORE UPDATE OF planned_start_ms, planned_end_ms ON vc_trip`, chặn khi tài xế có khung DRIVER còn hiệu lực chồng giờ. RAISE `lc03_driver_unavailable: …` (G-A4-21).
   - Thứ tự lô sửa chuyến (`dieu-phoi.ts:210` đóng dòng lái cũ trước `:212` mở dòng mới) bảo đảm tài xế cũ không chặn tài xế mới.
8. **Seed `vc_reason`:** 4 dòng `TU_CHOI_CHUYEN`, 3 dòng `BAN_TAI_XE`.

**Sau đó:**
- `docs/data-dictionary.json`: bảng mới, 4 cột mới, mô tả `vc_unavailability` nay mở DRIVER. Chạy `npm run dict`.
- `npm run db:migrate:local`.

### T3. Đọc hạn và nối vào khung (chưa đổi quyền, nên chưa đổi hành vi với ai)

- **Tệp mới** `src/modules/van-chuyen/han-tu-choi-repo.ts` (`defineSql`, EXPLAIN):
  - `HAN_CUA_CAP(trip, party)`;
  - `TU_CHOI_CUA_CHUYEN(trip)`: dòng REFUSED, nhãn lý do.
- `khungCuaNguoiGoi` đọc hạn khi `can(staff,"trip.refuse",{assigned:true})`.
- `tai-xe-dto.ts:37-81` nhận thêm:
  - `hanTuChoi?: GioVnDto`, `tuChoiDuoc: boolean`, `thayKhachTu?: GioVnDto`;
  - `lyDoTuChoi?: {code,nhan}[]` (chỉ khi `tuChoiDuoc`);
  - `sdtVanPhong?: string`.
- `contracts.ts:1550-1600` thêm các khoá trên (`GioVnDto` ở `:1191`).
- **Bài đỏ:**
  - `tai-xe-dto.test.ts` (`:15` CAM thêm khoá NL/TE và khoá tiền), gọi DTO trực tiếp với hạn;
  - `cuoc-cua-toi.test.ts`: tài xế công ty không đổi.

### T4. LC-03 xét khung tài xế (C25, "câu đọc")

- **Tệp mới** `src/modules/van-chuyen/khung-ban-tai-xe-repo.ts` (`subject='DRIVER'` tường minh):
  - `khungTaiXeTrongKhoang(party, tu, den)`: không đọc nhãn lý do;
  - `khungCuaToi(party)`;
  - `khungTaiXeVanPhong(tu, den)`.
- **Nối vào:**
  - tạo chuyến `index.ts:1146` (cạnh `khungBan`);
  - `lenhSuaChuyen` ở `dieu-phoi-lenh.ts:125` (cạnh `khungBanXeTrongKhoang`; Đ1 đã sửa hàm này, đo lại).
- `KhungBanVao.lyDoNhan` (`dieu-phoi-kieu.ts:276`) thành `string | null`. `dieu-phoi-kiem.ts:139-142` theo G-A4-9.
- **Bài đỏ** (route, khung gieo bằng SQL): Bán hàng tạo hoặc sửa chuyến với tài xế có khung → 409 `TRUNG_GIO_TAI_XE`, chi tiết không có "Ốm".
- Thêm bài canh `dieu-phoi-doc.test.ts` (`:43-47`): `khungBanVao` của lịch chung vẫn chỉ VEHICLE.

### T5. Chính sách: `refuse_lead_minutes`, SĐT văn phòng

- **Sửa:**
  - `repository.ts:250` (`COT_CHINH_SACH`), `:258` (`INSERT_DISPATCH_POLICY`), `:277-284` (bind);
  - `chinh-sach.ts` (`kiemChinhSachMoi`; Đ1 đã thêm hằng, đo lại);
  - `chiTietChinhSach` (G-A4-12);
  - `index.ts:682` (`truoc`);
  - form `/chinh-sach-dieu-phoi` (`chinh-sach-hien-thi.ts` `docFormChinhSach`, `web/chinh-sach-dieu-phoi.ts`) **trong cùng commit**, vì form gửi thân cố định.
- **Bài đỏ:**
  - "câu chèn liệt kê đủ cột" (`chinh-sach.test.ts`);
  - 2881 → 400;
  - nhật ký không có chữ số SĐT.

### T6. Mở ô quyền, trang đầu, tin (commit "mở"; T1 và T3 phải đứng trước)

- **`permissions.ts`:**
  - `:187` và `:193`: cột 9 → `"assigned"`;
  - thêm `"trip.refuse": row("none","none","none","none","none","any","none","none","assigned","none")`;
  - thêm `"unavailability.self": row("none","none","none","none","none","any","none","none","own","none")`;
  - chú thích `:68-69`;
  - `EXTERNAL_PERMISSIONS` (`:30`), LC-1, LC-1b **không đổi**, vì không thêm mã quyền.
- **`tro-ly-cau-truc-ten.ts`** (`TEN_THAO_TAC`), lời thường không chứa mã:
  - "từ chối chuyến": tài xế nhà xe trả lại chuyến được xếp, trước hạn, kèm lý do;
  - "báo bận của tôi": tài xế nhà xe ghi khoảng giờ không nhận chuyến.
  - Thiếu mục này thì `build:web` và `npm test` đều đỏ. Chạy `node scripts/sinh-so-do-trang.mjs`.
- **`start-page.ts:34-35`:** đổi `coCuocCuaToi` theo G-A4-5.
- **Bài nới có tên** (căn cứ 0053:49 và :200 cho Điều 9.4; D7.5 :79 cho tin):
  - `permissions.test.ts`: hàng DRIVER_PARTNER (~`:373`), DRIVER (~`:338`), HR (~`:401`) thêm hai ô `none`;
  - `start-page.test.ts:59`, `:61`, `:68-73`;
  - `src/tai-xe-cong.test.ts` BANG_STAFF `:92`, `:98`, `:104`;
  - `tests/e2e/tai-xe-cuoc.mjs:76-81` (còn 403 ở `hanh-khach`);
  - `tests/e2e/tai-xe-doi-tac.mjs:36`;
  - `tin-chuyen.test.ts:37-39`, `:73-86`, `:119`, `:155`, `:189` → tài xế đối tác đang lái **nhận** tin;
  - `thongbao/tin-chuyen-hop.test.ts:26`;
  - bài "chỉ DRIVER_PARTNER không nhận" của Đ1 (`src/tin-khan-cap.test.ts`), Đ2 và G17, nếu có;
  - `bang-tin.test.ts:50-51`, `:74` giữ nguyên (chỉ `nguoi:<id>`).
- `cong-quyen.test.ts` giữ: DRIVER_PARTNER không thuộc office, orders, admin.
- `thongbao/index.ts:98` không đổi mã; giờ tài xế đối tác qua được.

### T7. Từ chối chuyến

- **Route** `POST /api/van-chuyen/cuoc-cua-toi/:id/tu-choi` (cổng `staff`), thân `{lyDo, requestId}`. Thứ tự theo G-A4-15. Lệnh lặp do `traLenhLap(loai ["DRIVER_REFUSED"])` xử lý; nếu hàm chưa so người bấm thì thêm so `actor` (bài đỏ: người khác dùng lại `requestId` → 404). Gọi `baoThayDoiChuyen` sau lô (bài quét `bao-thay-doi-chuyen.test.ts:41` tự bắt). Phản hồi 200 `{daTuChoi:true}`, không có dữ liệu chuyến.
- **Lô `loTuChoi` trong `dieu-phoi.ts`** (thứ tự như `thu-tu-lo.test.ts`):
  1. cổng (G-A4-24);
  2. nhật ký `trip_driver_refused`;
  3. sự kiện `DRIVER_REFUSED`;
  4. đóng dòng lái: `REFUSED`, `refuse_reason_code`, `closed_by_party_id` = `staff.partyId`, `closed_by` = `staff.id`.
- **Thêm vào:**
  - `LOAI_SU_KIEN_CHUYEN` (nối sau phần tử của Đ2);
  - `NHOM_LY_DO` thêm `TU_CHOI_CHUYEN`, `BAN_TAI_XE`, thành 12 nhóm; sửa `dieu-phoi-kieu.test`;
  - `TIEN_TO` (`chinh-sach-hien-thi.ts:222`);
  - `audit-actions.ts` (cạnh `:148`);
  - `lenh-lap-quet.test.ts` BANG;
  - `route-access.test.ts` (số route).
- **Tin:**
  - `tin-chuyen.ts` thêm `HANH_DONG_TIN_CHUYEN`;
  - `loaiCho` (`:55-70`) thêm nhánh sau `if (!can(n,"trip.view"))`: `trip_driver_refused && can(n,"trip.dispatch") → "tu_choi"`. Câu "Tài xế đã từ chối <mô tả chuyến> — cần xếp người khác", liên kết `/chuyen?id=`, ngăn "Của tôi" (theo khuôn `gian_doan`). Không tên, không lý do.
  - Bảng tin `nhanSuKienChuyen`: `dieu-xe` (D6.4).
- **Văn phòng:** DTO chi tiết chuyến (`dieu-phoi-dto.ts`, `dieu-phoi-route.ts`) thêm `tuChoi: {tenTaiXe, luc, lyDo?}[]` (G-A4-14).
- **Bài đỏ:**
  - `src/modules/van-chuyen/tu-choi.test.ts` cho NT-4, NT-7 (giá: đổi xe sang nhà xe khác qua lô sửa có sẵn);
  - `tin-chuyen.test.ts` cho tin `tu_choi`;
  - `thu-tu-lo.test.ts` thêm mẫu `loTuChoi`.

### T8. Báo bận

- **Route** (cổng `staff`, `can(unavailability.self,{ownerId: staff.id})`, luôn dùng `staff.partyId`):
  - `GET /api/van-chuyen/ban/cua-toi` → `{khung: KhungBanCuaToiDto[], lyDo: {code,nhan}[]}`;
  - `POST /api/van-chuyen/ban` với `{batDau, ketThuc, lyDo, requestId}`;
  - `POST /api/van-chuyen/ban/:id/rut` với `{version, requestId}`: khung của người khác → 404.
- **Route văn phòng:** `GET /api/van-chuyen/ban-tai-xe?tu=&den=` (cổng `office`, `can(trip.dispatch)`) → `KhungBanTaiXeDto` (G-A4-19).
- **Kiểm thân:** mở rộng `kiemKhungBanMoi` của `khung-ban.ts` theo `subject` (một hàm, hai hằng).
- `loiRangBuocKhungBan` thêm `unavailability_overlaps_driver_trip` → 409 `khung_ban_chong_chuyen_tai_xe`, đọc lại chuyến của chính người gọi; trường hợp CSDL chặn sau khi máy chủ đã cho qua → `…_csdl` (dot-6 T8).
- Nhật ký theo G-A4-20. Không gửi tin (D9.4). Thêm vào `audit-actions.ts` (cạnh `:107-108`), `contracts.ts` (cạnh `:1206-1220`), `route-access`, `lenh-lap-quet`.
- **Bài đỏ:** `src/modules/van-chuyen/bao-ban-tai-xe.test.ts` cho NT-8.

### T9. Giao diện

- **`web/cuoc-chuyen.ts`** (giữ khung `veXuatBen`; dot-6:93-99):
  - dải hạn;
  - nút "Từ chối chuyến": hiện khi `tuChoiDuoc && can(trip.refuse)`;
  - tấm Từ chối (`moBangTruot` + `nhomChon`, "Xác nhận từ chối" `vc-btn-danger`);
  - dải quá hạn và nút "Gọi văn phòng" (ẩn khi chưa có SĐT);
  - thẻ "Thấy danh sách khách từ …";
  - ánh xạ lỗi: 409 `stale` → dải A5; quá hạn → trạng thái A3.
- **Trang mới `/ban`:**
  - `public/ban.html`, `web/ban.ts` (dải hỏi lại ngay trong trang, `datetime-local` cỡ 16px);
  - thêm `/ban` vào danh sách esbuild của `build:web` và vào `PAGES` (`sw-policy.ts:16` và `:25`).
- **`web/shell.ts`** (`:74`, `:76`, `:290-291`, `:535`): tab và mục "Báo bận của tôi" theo G-A4-16. Kiểm bản nhớ khung (ADR-0035) có đủ cờ.
- **`web/tai-xe.ts:21-22`:** bỏ câu "Cuốc xe của bạn sẽ hiện ở đây".
- **`web/dieu-phoi.ts`:** dải "Tài xế bận", chỉ khi `can(trip.dispatch)`, ẩn khi rỗng.
- **`web/chuyen-sua.ts`:** nhãn "Bận" ở ô chọn tài xế và câu chặn C4.
- **Kịch bản Chrome** (`docs/evidence/2026-09-29-adr-0049/kich-ban/`), 390 px và 1040 px, theo thứ tự Tài xế đối tác → Bán hàng → Kế toán:
  - sửa `tai-xe-doi-tac-smoke`, `cuoc-smoke`, `tai-xe-trang-dau`, `dieu-phoi-smoke`, `chuyen-sua-smoke`, `chinh-sach-dieu-phoi-smoke`;
  - tạo mới `ban-smoke.mjs`.

### T10. Hướng dẫn

- **`src/shared/huong-dan-tai-xe.ts`:**
  - viết lại `:12-13`, câu menu `:22`, và mục "Tài xế nhà xe đối tác" `:75-82`: cuốc của tôi, hạn Từ chối, Báo bận, Gọi văn phòng, "thấy tên khách từ …";
  - `[[Từ chối chuyến]]`, `[[Xác nhận từ chối]]`, `[[Báo bận của tôi]]`, `[[Lưu khung bận]]`, `[[Rút khung bận]]`, `[[Gọi văn phòng]]` phải có nguyên chuỗi trong mã giao diện;
  - quỹ: CHUNG + nhóm tài xế ≤ 30 phút (`huong-dan.test.ts:76-77`).
- **Bán hàng và Quản trị: không thêm chữ.** Hai nhóm đang ở 4497/4500 và 4496/4500 chữ; đo lại sau Đ1.

### T11. Bất biến và tài liệu

- **`scripts/audit-checks.mjs`**, số `R-VC-*` kế tiếp lúc thi công:
  - dòng `REFUSED` có người đóng ≠ tài xế;
  - `REFUSED` sau giờ xuất bến thật;
  - khung DRIVER còn hiệu lực chồng chuyến chưa huỷ đang xếp cho người đó;
  - dòng lái mở mà thiếu dòng hạn;
  - mức warn: chuyến trong 48 giờ tới chưa có tài xế.
- Bài ở `src/audit-invariants.test.ts`.
- **Tài liệu:**
  - `docs/SYSTEM-DESIGN.md` (van-chuyen: tài xế đối tác, khung, Từ chối, Báo bận);
  - `docs/CHANGE-GUIDE.md` công thức y (0053:209);
  - `docs/BACKLOG.md`: BL-VC-D6 ghi phần A4 xong, chia doanh thu vẫn hoãn; thêm dòng mới cho C25 phần tài xế công ty, và cho taxi qua cổng THIEU_GIA (e–h);
  - các dòng `docs/SO-HANG-RAO.md` ở §4.

### T12. E2E

- Tạo `tests/e2e/tu-choi-bao-ban.mjs` (đăng ký trong `run.mjs`): NT-4, NT-7, NT-8, NT-11, NT-14 trên D1 local.
- Sửa `tai-xe-cuoc.mjs` và `tai-xe-doi-tac.mjs` (T6).

### T13. Kiểm cuối

- Chạy toàn bộ NT-16.
- Người kiểm độc lập chỉ đọc theo ba góc: quyền, dữ liệu khách, lớp CSDL.
- Báo cáo cho chủ ghi rõ:
  - điều chưa chắc (§6.4);
  - NT-9 hoãn sang A5;
  - lời nhắc chủ thử bằng tài khoản tài xế đối tác thật trên iPhone.

---

## 4. Hàng rào (mỗi rào phải thấy chặn thật: sửa cố ý → đỏ → hoàn nguyên; ghi ngày vào `docs/SO-HANG-RAO.md`)

| Hàng rào | Sửa cố ý để thấy đỏ | Dòng SO-HANG-RAO |
|---|---|---|
| Ghim hàng DRIVER_PARTNER 8 ô; cột DRIVER của hai ô mới = none | Đặt DRIVER_PARTNER `trip.dispatch="assigned"` | **Nới có tên** `:143` (ADR-0053:49, Điều 9.4) |
| `homeRedirect` / `coCuocCuaToi` theo MATRIX | Đổi sang `can(…,{assigned:true})` → SALES có Cuốc | **Nới** `:149` (0053:200) |
| Bảng route tài xế (`tai-xe-cong.test.ts`) | Thêm DRIVER_PARTNER vào `OFFICE_GATE` | **Nới** `:150`, `:158` |
| Khung xem khách (GET và chín lệnh) | Đổi "và" thành "hoặc" trong `trongKhungXemKhach`; đổi `>` thành `>=` | mới |
| Một hàm khung (bài quét) | Thêm `trongNgayChay(` vào một route | mới (thay vai trò `:215`) |
| B8.2, B8.3, B8.4, hạn chỉ giảm, không xoá hạn | Bỏ từng trigger trên CSDL thử → bài SQL đỏ | mới; ghi ngoại lệ "giờ CSDL" |
| B9.2, B9.3 | Bỏ trigger trên CSDL thử | mới; **nới có tên** `:376` (bỏ `driver_closed`: 0053:137) |
| Lịch chung chỉ VEHICLE; Kế toán 403 ở `ban-tai-xe`; DTO văn phòng không lý do bận | Cho `khungBanVao` đọc DRIVER; thêm `lyDo` vào DTO | `:381`, `:385` giữ, thêm vế 6.2 |
| Tin `tu_choi` chỉ tới `trip.dispatch` | Đổi điều kiện thành `can(n,"trip.view")` | mới |
| Tài xế đối tác nhận tin chuyến của mình | (bài D7.5) | **Nới có tên** `:345` (0053:79) |
| Không lộ (`hanh-khach-khong-lo-ten.test.ts`): regex `:172` thêm `ban\|ban-tai-xe`, ca DRIVER_PARTNER trong/ngoài khung, bỏ UUID trước khi quét `\d{8,}` (`:636`); `giay-to-khong-lo-so.test.ts` thêm route mới | Đưa `hoTen` vào phản hồi lệnh xuất bến | `:239`, `:248` (siết thêm) |
| Nhật ký chính sách không chứa chữ số SĐT | Ghi `office_phone` thô | mới |
| `tu-choi` trả 403/404 theo G-A4-15 | Bỏ nhánh Toàn quyền → 404 | mới |

Nới có tên: chỉ những dòng ghi "Nới" ở trên. Căn cứ duy nhất là ADR-0053 đã duyệt (Điều 9.4). Không nới thêm gì khác.

**Sổ dừng dây chuyền `docs/quyen-hoan.json`.** A4 không xây trên lỗ đang hở nào:
- TNV-G1, TNV-G3, TNV-G4: sổ tiền đơn.
- HC-4.2: người duyệt bút toán điều chỉnh tiền.
- HC-5.11: định danh của Cron.
- HC-5.19: diễn tập khôi phục. Đường hoàn tác của A4 là migration mới cộng Worker cũ, không dựa vào Time Travel.
- Mục hoãn `task.progress`, `dispatch.guides.view`, `invoice.*`: A4 không thêm.

Vì vậy không gắn nhãn "xây trên lỗ đang hở".

---

## 5. Trang ghép

### 5.1 Bảng ↔ loại thực thể

| Bảng | Chứa | Đổi ở A4 |
|---|---|---|
| `vc_unavailability` | khung bận **VEHICLE** (có từ 0071) và **DRIVER** (mở mới), phân biệt bằng `subject` | bỏ trigger chặn DRIVER; thêm B9.2, B9.3 |
| `vc_trip_driver` | dòng lái của tài xế công ty và tài xế đối tác trong **cùng bảng**; loại không phân bằng cột mà bằng quyền của tài khoản gắn hồ sơ | thêm `refuse_reason_code`, `closed_by_party_id`; `REFUSED` chỉ do chính tài xế đóng (B8.2) |
| `vc_refuse_deadline` | **mọi** cặp (tài xế, chuyến), cả công ty lẫn đối tác | mới; chỉ được đọc khi người gọi có `trip.refuse` |
| `vc_reason` | thêm nhóm `TU_CHOI_CHUYEN`, `BAN_TAI_XE` | seed |
| `vc_dispatch_policy` | thêm `refuse_lead_minutes`, `office_phone` | cột mới |
| `audit_log` | `trip_driver_refused`, `driver_unavailability_added`, `driver_unavailability_withdrawn` | không có tên, SĐT, lý do bận |
| tin chuyến | loại `tu_choi` | mới |

### 5.2 Dòng bản đồ quyền ↔ loại thực thể

| Ô | Cột | Áp cho |
|---|---|---|
| `trip.view` | SALES, ACCOUNTING, ADMIN, SUPER_ADMIN `any`; DRIVER, **DRIVER_PARTNER** `assigned` | chuyến và DTO tài xế. `assigned` = có dòng lái mở theo `partyId`; khách chỉ hiện trong khung D7.2 |
| `trip.progress` | như trên, trừ ACCOUNTING `none` | chín lệnh tiến độ |
| `trip.refuse` (mới) | DRIVER_PARTNER `assigned`; SUPER_ADMIN `any` (route vẫn đòi đang lái) | đóng dòng lái `REFUSED`; bật vế hạn của khung |
| `unavailability.self` (mới) | DRIVER_PARTNER `own`; SUPER_ADMIN `any` | khung DRIVER của hồ sơ người gọi |
| `trip.dispatch` | SALES, ADMIN, SUPER_ADMIN | đọc khung DRIVER (`ban-tai-xe`), nhận tin `tu_choi`, thấy lý do Từ chối |
| `trip.view` any mà không có dispatch | ACCOUNTING | chỉ khung VEHICLE trên lịch; thấy "đã từ chối" không lý do |
| `trip.passenger.add` | DRIVER `assigned`; DRIVER_PARTNER **none** | không đổi |
| `settings.ops` | SUPER_ADMIN | `refuse_lead_minutes`, SĐT văn phòng |
| `admin.manage` | ADMIN, SUPER_ADMIN | dòng `vc_reason` của hai nhóm mới |

### 5.3 Cổng ↔ cửa (gồm cả ẩn/hiện ở giao diện)

| Cổng | Cửa | Giao diện |
|---|---|---|
| `staff` | `cuoc-cua-toi*`, `…/tu-choi`, `/ban*`, `/tai-xe` | tab Cuốc (`coCuocCuaToi`); tab Báo bận (`chiTaiXe && can(unavailability.self)`); nút Từ chối (`tuChoiDuoc && can(trip.refuse)`); nút Gọi văn phòng (có `sdtVanPhong`) |
| `office` | `ban-tai-xe` (`trip.dispatch`), chi tiết chuyến, chính sách (`settings.ops`) | dải "Tài xế bận" và nhãn "Bận" chỉ khi `can(trip.dispatch)` |
| `orders`, `admin`, `accounts` | DRIVER_PARTNER **không bao giờ** (`ADMIN_GATE :275`, `OFFICE_GATE :286`, `ORDERS_GATE :291`; LC-1b) | không có mục |
| CSDL | B8.2–B8.4, hạn chỉ giảm, B9.2–B9.4, LC-1/LC-1b | — |

Giao diện chỉ ẩn hoặc hiện; máy chủ luôn kiểm lại.

---

## 6. Rủi ro, chỗ giao, thứ tự phát hành, điều chưa chắc

### 6.1 Rủi ro

- **Cửa một chiều.** Lỗi khung trong phản hồi lệnh tiến độ sẽ lộ tên khách cho người ngoài. Giảm rủi ro bằng: T1 đi đầu, NT-3 kiểm cả lệnh, người kiểm độc lập.
- **Taxi đối tác vướng cổng `THIEU_GIA`** (`ly-do-giu.ts:62`) khi chuyến chưa có giá. Điểm e chưa trả lời: A4 không giải; trước khi báo taxi dùng thì phải có ADR sổ chia doanh thu.
- **Pháp lý chưa kiểm** (0053:276). Số tài xế đối tác thật và nhà xe nào dùng chưa biết.
- **Hoàn tác:**
  - Worker cũ chạy trên CSDL đã có 0091 vẫn an toàn: mã cũ không ghi REFUSED hay khung DRIVER; trigger hạn chỉ thêm dòng; B9.3 có tiền tố `lc03_`.
  - Cần bỏ trigger thì dùng migration mới (§T2).

### 6.2 Chỗ giao

- **Đ1** (diff `1eb7de36..df99a773`, nhánh `adr-0104-d1`, gộp trước):
  - `permissions.ts`: thêm `trip.urgent_adjust`, DRIVER_PARTNER `none`;
  - `permissions.test.ts`: ghim DRIVER, DRIVER_PARTNER, HR;
  - `tin-chuyen.ts`: `khan_cap` nằm trong nhánh tài xế, nên sau A4 tài xế đối tác cũng nhận; đúng D7.5; nới các bài "không nhận" của Đ1;
  - `dieu-phoi-lenh.ts` `lenhSuaChuyen` (T4), `dieu-phoi-kiem.ts`, `chinh-sach.ts`, `chuyen-repo.ts`, `contracts.ts`, `thongbao/index.ts`, `huong-dan-ban-hang.ts`, `huong-dan-quan-tri.ts`.
  - Đổi tài xế hoặc giờ khẩn cấp: hạn tự đúng nhờ trigger.
  - ADR-0104:101 (duyệt đề nghị leo thang) thuộc A5.
- **Đ2** (0089): `trip_order_synced` cũng tới tài xế đối tác (D7.5). Đồng bộ đổi giờ chuyến thì trigger tự hạ hạn. Chung tệp `dieu-phoi-kieu.ts`, `thu-tu-lo.test.ts`, `tin-chuyen.ts`: A4 nối sau phần tử của Đ2.
- **ADR-0105** (0090, gộp trước A4):
  - khoá `diaChiChiDuong` trong `tai-xe-dto.ts` đi theo cờ khung; T1 chuyển chỗ gọi của ADR-0105 sang hàm khung;
  - NT-3 kiểm chuỗi đích;
  - chung `web/cuoc-chuyen.ts`.
- **ADR-0109** (phải thu không âm; chủ duyệt 8/10 qua lượt 8c, chưa chép vào `docs/adr/`): chỉ chạm orders/sổ tiền, không chung tệp mã. Có thể giành số migration; xung đột chỉ là chữ ở `SYSTEM-DESIGN` / data-dictionary.
- **G17** (báo tài xế khi `PUT /trip`): sau A4 tài xế đối tác cũng nhận; nếu có bài ghim thì nới theo D7.5.
- **A5:**
  - ô `trip.transfer` đặt cột DRIVER_PARTNER = `assigned`, ghim lên 9;
  - dòng lái do cứu hộ tạo tự có hạn;
  - chung `cuoc-chuyen.ts`, `shell.ts` (thanh tab: Trang chủ · Cuốc · Đề nghị · Báo bận · Tôi), `permissions.ts`;
  - A5 cũng có thể chọn số 0091.

### 6.3 Thứ tự phát hành

1. Đ1 gộp.
2. Đ2.
3. ADR-0105 (ADR-0109 song song nếu không chung tệp).
4. G17.
5. **A4.**
6. A5.

A4 là một lần phát hành: migration chỉ thêm; bỏ `driver_closed` an toàn vì mã cũ không có đường ghi DRIVER. Không cần tách hai lần (expand–contract). Số migration lấy số trống kế tiếp **lúc thi công**, sau khi liệt kê mọi nhánh: hôm nay 0087–0088 thuộc VietQR, 0089 thuộc Đ2, 0090 thuộc ADR-0105, nên dự kiến **0091**. Bên gộp sau tự đổi tên tệp (README, luật 1.46).

### 6.4 Điều chưa chắc

- Kết quả T0 (a) đến (d).
- Tên thật của cờ và hàm sau khi Đ1, Đ2, ADR-0105 gộp; dòng sẽ dời.
- Giá trị ô `assistant.ask` của DRIVER_PARTNER (đếm 4 ô cũ).
- Ngăn tin của `tu_choi`.
- Quỹ chữ hướng dẫn sau Đ1.
- Cách đọc G-A4-7 (mã đơn ngoài khung): theo tiêu chí 3; nếu người kiểm đọc :70 chặt hơn thì chỉ đổi một dòng DTO.
- `traLenhLap` có so người bấm không.

---

### Critical Files for Implementation
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/modules/van-chuyen/index.ts
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/shared/permissions.ts
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/shared/dieu-phoi-kiem.ts
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/modules/van-chuyen/tai-xe-dto.ts
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/migrations/0071_khung_ban_gio_lai.sql (mẫu cho migration mới 0091; số lấy lúc thi công)