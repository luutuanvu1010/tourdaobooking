# Kế hoạch thi công A4: tài xế nhà xe đối tác dùng Nền tảng, Từ chối chuyến, Báo bận (ADR-0053 D7.1, D7.2, D7.5, D8, D9)

> **Thông tin chung**
> - **Ngày lập:** 2026-10-08. **Bản sửa:** 2026-10-08, theo phiếu phản biện `docs/superpowers/plans/2026-10-08-giai-doan-3-a4-phan-bien.md`.
> - **Điểm đo mã:** nhánh `claude/van-chuyen-goi-a-c` @ `8e2d189a`. Từ đó tới `9f8f1656` mã nguồn không đổi, các commit sau chỉ thêm tài liệu (`git diff --stat 8e2d189a..9f8f1656`). Mọi `tệp:dòng` trong tệp này là của điểm đo đó. Đ1, Đ2 và ADR-0105 sẽ làm dời dòng, nên mỗi chỗ đều ghi kèm tên ký hiệu để tìm lại.
> - **Người thi công:** trợ lý AI, trên nhánh mới `a4-tai-xe-doi-tac`.
>   - Tách từ **`claude/van-chuyen-goi-a-c`**, không tách từ `main`. Lý do: `main` thiếu 121 commit và thiếu migration 0084–0086.
>   - Chỉ tách **sau khi** Đ1, Đ2, ADR-0105, ADR-0109 và G17 đã gộp vào nhánh đó (§6.3).
> - **Thay cho:** `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-06-tai-xe-doi-tac.md`. Kế hoạch cũ chỉ giữ để tham khảo; phần lỗi thời ở §0.4.
> - **Việc lớn:** quyền và dữ liệu cá nhân cho người ngoài là cửa một chiều (ADR-0053:188-193, :210). Vì vậy cuối lượt phải có:
>   - một người kiểm độc lập chỉ đọc;
>   - các mục báo chủ ở T13;
>   - chủ thử bằng tài khoản tài xế đối tác thật trên iPhone trước khi báo nhà xe.

---

## Sửa theo phiếu phản biện 2026-10-08

Với từng mục, tôi đã mở lại `tệp:dòng` trong cây làm việc (`9f8f1656`) trước khi áp.

### Tiền đề sai

| # | Mục phiếu | Kiểm lại | Đã sửa ở |
|---|---|---|---|
| TĐ-1 | Thứ tự thêm ô `trip.refuse`, `unavailability.self` | **Phiếu đúng.**<br>• `src/shared/permissions.ts:214`: `OperationCode = keyof typeof MATRIX`.<br>• `src/permission-enforcement.test.ts:46-56, :68-76`: mỗi ô phải có một dòng `can(` + `"<ô>"` trong `src/modules/**`. | §3.0 (bảng ô theo commit), T3, T6, T8; §0.2 P2, P3 |
| TĐ-2 | "Gửi lại cùng requestId → 200" mâu thuẫn với thứ tự 404 | **Phiếu đúng.**<br>• `chuyen-repo.ts:47`: `driver_party_id` chỉ lấy từ dòng lái mở.<br>• `index.ts:126`: `dangLai`.<br>• `dieu-phoi-route.ts:178-194`: không so người bấm.<br>• Thêm: `chuyen-repo.ts:70-73` (`EVENT_BY_REQUEST`) không chọn `created_by`, dù `EVENT_INSERT` `:361-363` có ghi cột này. | G-A4-15 (thứ tự mới), G-A4-25 (phân loại 409), T7, NT-4 |
| TĐ-3 | Bom hẹn giờ của B8.3 khi chạy với đồng hồ giả | **Phiếu đúng.**<br>• `tests/audit/dieu-phoi-khung.mjs:21-33`: `NGAY`, `NOW_GIA`, `batDongHo`.<br>• `migrations/0084_…:14`.<br>• Chỉnh nhỏ: `0030:63` có trigger dùng `'now'` để **ghi** `updated_at`, nhưng không trigger nào **so sánh** với giờ CSDL. Kết luận của phiếu giữ nguyên. | §2 "Luật đồng hồ", T0(a), T7, NT-4, NT-6 |
| TĐ-4 | `can()` không ngữ cảnh làm nút và tab không bao giờ hiện | **Phiếu đúng.**<br>• `permissions.ts:248-258`.<br>• Bản vẽ `danh-gia/dot-6.md` mục 9 và 12 sai cùng kiểu. | G-A4-16, T9, §5.3 |
| TĐ-5 | Danh sách bài đỏ còn thiếu | **Phiếu đúng.** Đã mở từng chỗ:<br>• `cuoc-cua-toi.test.ts:30, :49`<br>• `permissions.test.ts:92-96, :175-183, :433-438`<br>• `migrations-khung-ban.test.ts:107-110`<br>• `audit-invariants.test.ts:2133`<br>• `tai-xe-cong.test.ts:85-107`<br>• `tai-xe-dto.test.ts:13, :15-17`<br>• `lan-gui-location.test.ts:25` | §3.1, T2, T3, T6, T7, T8, §4 |
| TĐ-6 | Rủi ro "lệnh tiến độ lộ tên khách" | **Phiếu đúng phần tên:** `index.ts:1499-1510` truyền `[]` và `null` vào phản hồi, nên rủi ro "lộ tên" bị bỏ. Phần "chín chỗ không đổi gì về an toàn" thì không theo (xem mục "Không theo phiếu"). | §6.1, NT-3, T1 |
| TĐ-7 | "Đ2 đổi giờ chuyến nên hạn tự hạ" | **Phiếu đúng.** ADR-0104 Đ2 (`:121-186`) không có `planned_start`. | §6.2 |

### Lệch ADR

| # | Mục | Kiểm lại | Đã sửa ở |
|---|---|---|---|
| L-1 [CAO] | `suat[].maDon` của tài xế đối tác hiện mọi lúc | **Phiếu đúng.** ADR-0053:30, :70, :171 và `docs/adr/README.md:57` đều đặt mã đơn trong khung D7.2. Đây là cửa một chiều nên đọc chặt. | G-A4-7 (viết lại), P5, T3, NT-3, §4 (tách `KHOA_SUAT`); bỏ khỏi §6.4 |
| L-2 | `trip.passenger.add` của DRIVER_PARTNER giữ `none`, lệch chữ ADR-0053:46 | **Phiếu đúng.** `docs/SYSTEM-DESIGN.md` §16 (`:1262` trở đi) chưa có dòng nào cho lệch này. | T11 (dòng §16 "lệch có chủ ý"), NT-1 |
| L-3 | `trip.transfer` và D7.4 chuyển sang A5 | **Phiếu đúng.** Tiêu chí 1 và 9 của ADR-0053 chưa đạt khi A4 ra. | §0.3, T11 (§16), T13 |
| L-4 | DTO thêm 5 khoá nhưng chưa khai nới có tên | **Phiếu đúng.** `tai-xe-dto.test.ts:13` (`KHOA_GOC`) và `:17` (`CAM_KHOA` bắt `sdt(?!LienHe)\w*`). | G-A4-17, T3, §3.1, §4, NT-10 |
| L-5 | Toàn quyền khi tự lái có vế hạn | **Phiếu đúng** (ADR-0053:64). Lệch theo chiều siết. | G-A4-2 (ghi rõ lệch) |

### Câu hỏi cho chủ

| Mục phiếu | Đánh giá của phiếu | Áp |
|---|---|---|
| "Hạn từ chối" | SỬA CHỮ | §1b: câu dự phòng, dùng chữ sửa của phiếu. **Chỉ hỏi nếu T0(a) thất bại trên D1 local.** |
| "Không có câu bắt buộc" | BỎ (tự áp) | Giữ. Điều kiện của phiếu (sửa G-A4-7) đã làm. |
| G-A4-7 mã đơn ngoài khung | BỎ (ADR đã trả lời) | Bỏ khỏi §6.4; áp chữ ADR. |
| Pháp lý; thử iPhone | GIỮ | Thành **mục báo chủ** trong báo cáo cuối (T13), không phải hộp hỏi; dùng chữ sửa của phiếu. Thêm việc trước phát hành: điều phối soạn lệnh đếm chỉ-đọc, chủ chạy (T13, §6.3). |
| `trip.passenger.add` | BỎ | Ghi lệch ở §16 (T11). |
| 6.1–6.5, tab Báo bận của Toàn quyền | BỎ | Không hỏi. |
| G-A4-10, -13, -14, -18, -19 | BỎ (tự áp) | Giữ. G-A4-10 sửa theo lưu ý của phiếu: cho bắt đầu từ đầu phút hiện tại. |
| Chia doanh thu taxi | BỎ | Chỉ nhắc ở báo cáo cuối (T13). |

### Thiếu

| # | Mục phiếu | Đã sửa ở |
|---|---|---|
| TH-1 | Thứ tự commit ô quyền | §3.0 |
| TH-2 | Các bài đỏ chưa liệt kê | §3.1 |
| TH-3 | Bom hẹn giờ | §2 "Luật đồng hồ", T7 |
| TH-4 | Cổng thua phải đọc lại để trả đúng 409; tiền tố RAISE chưa có ánh xạ | G-A4-25; T2 (tiền tố); T7 (`rules.ts`, bài đua sát hạn) |
| TH-5 | `traLenhLap` không so người bấm | G-A4-15, T7: câu đọc riêng trong `han-tu-choi-repo.ts`; không sửa hàm dùng chung |
| TH-6 | Hàng rào H7 và H2 | • T8: `kemLocation(…, "/ban")`.<br>• T7, T8: số cứng `lan-gui-phu-route.test.ts:55` (156 → 159), `route-access.test.ts:382` (213 → 218), `lenh-lap-quet.test.ts:68` (31 → 32).<br>• Phần `route-write-guard`: không theo (xem dưới). |
| TH-7 | `NHAN_NHOM_LY_DO`; câu "only_decrease" mâu thuẫn NT-5 | • T2: `NHOM_LY_DO`, `NHAN_NHOM_LY_DO`, `TIEN_TO` dời vào **cùng commit migration**, vì `dieu-phoi-kieu.test.ts:27-29` đòi nhóm của mọi dòng `vc_reason` có trong `NHOM_LY_DO`, và hai `Record<NhomLyDo,…>` (`dieu-phoi-kieu.ts:16`, `chinh-sach-hien-thi.ts:222`) làm typecheck đỏ nếu thiếu.<br>• T2 mục 2: viết lại "only_decrease". |
| TH-8 | Chưa kiểm trên D1 local | T0(a)(b)(c) chạy trên `wrangler d1 … --local`; đây là cổng dừng. |
| TH-9 | Vận hành: chuyến xe thuê vướng `THIEU_GIA`; đếm tài khoản trên production; tài khoản thử ngoài cửa sổ đóng băng (`docs/HANDOFF-N1.md:389, :475`) | §6.1, §6.3, T13 |
| TH-10 | Dòng §16; hai chỗ giao diện đọc cờ; nhãn Bảng tin `dieu-xe` | T11; §5.3; NT-7 |
| TH-11 | Sổ dừng dây chuyền: nói thẳng về đường ghi tiền | §4 cuối |
| TH-12 | Nhánh gốc và số migration | Đầu tệp; §6.3 (lệnh quét và kết quả) |
| TH-13 | Hướng dẫn: đơn vị đo, trần, chữ cho văn phòng | T10, NT-15, T13 |
| TH-14 | Câu sai về Đ2; đối chiếu lại số dòng | §6.2 |

### Không theo phiếu

- **Không theo phiếu: Tiền đề sai mục 6, phần "chín chỗ chỉ cần cờ boolean … không đổi gì về an toàn"** — vì cờ khung trong phản hồi chín lệnh tiến độ quyết ba thứ:
  - `suat[].maDon` của tài xế đối tác, sau khi sửa L-1. Hôm nay `src/modules/van-chuyen/tai-xe-dto.ts:69` phát `maDon` mọi lúc, và mọi lệnh tiến độ gọi `cuocChiTiet(…, trongNgay)` (`src/modules/van-chuyen/index.ts:1504-1510`).
  - Khoá chỉ đường `diaChiChiDuong` (ADR-0105:94: "cùng chỗ với `hoTen`").
  - Hai chỗ giao diện đọc cờ: `web/cuoc-chuyen.ts:448,455` và `src/shared/xe-dang-chay-man.ts:140-144`.

  Vì vậy T1 vẫn thay cả chín chỗ bằng hàm khung. Chỉ bỏ câu rủi ro "lộ tên".
- **Không theo phiếu: Thiếu mục 6, phần "cập nhật đếm H2 ở `route-write-guard.test.ts`"** — vì tệp đó không có số đếm route. Luật (1c) ở `src/route-write-guard.test.ts:339-343` chỉ đòi thân route cổng `staff` hỏi `can()` và dùng kết quả; các route mới đều thoả. Số cứng thật nằm ở `src/lan-gui-phu-route.test.ts:55` (156), `src/route-access.test.ts:382` (213) và `src/modules/van-chuyen/lenh-lap-quet.test.ts:68` (31), đã đưa vào T7 và T8.

### Phát hiện thêm khi mở lại mã (phiếu không nêu)

1. **`/ban*` không mang `requestId` trong thân.**
   - `lenh-lap-quet.test.ts:56-58` coi mọi route ghi có chữ `requestId` mà không đi qua `traLenhLap` là lỗi.
   - Khuôn khung bận xe `POST …/xe/:id/ban` (`index.ts:585-600`) không có `requestId`; việc chống ghi trùng do lớp vé H2 lo.
   - ADR-0053 D9 không đòi `requestId`.
   - Sửa ở G-A4-28, T8.
2. **Trigger hạn `AFTER INSERT` cần số phút dự phòng.**
   - Dòng chính sách gốc `0041:32` hiệu lực từ 2026-09-01.
   - Bài thử có thể chèn dòng lái với giờ sớm hơn (`laiTho`, `audit-invariants.test.ts:1193-1194`).
   - Khi không dòng chính sách nào khớp thì phải dùng 720. Sửa ở G-A4-27, T2.
3. **Tin chuyến tới tài xế không mang mã đơn** (`src/shared/tin-chuyen.ts:84-98`). Giữ nguyên. NT-14 thêm vế canh, để tin `trip_order_synced` của Đ2 cũng không mang mã đơn.
4. **Quỹ chữ hướng dẫn đo theo đúng đơn vị của bài.** Bài tính phút làm tròn lên, 150 chữ một phút (`src/shared/huong-dan.ts:113`):

   | Nhóm | Số chữ | Trần (theo phút) |
   |---|---|---|
   | Phần chung | 1349 | 1350 (9 phút) |
   | Bán hàng | 3142 | 3150 (21 phút) |
   | Quản trị | 3130 | 3150 |
   | Tài xế | 1034 | 3150 |

   Sửa ở T10, NT-15.
5. **Vế hạn đang gắn với ô `trip.refuse`.** Sau này nếu đóng ô Từ chối của tài xế đối tác, vế hạn mất theo và khung xem khách **rộng ra**. Ghi ở §6.1 và chú thích cạnh ô (T6).

---

## 0. Phạm vi

### 0.1 Nguồn chuẩn tắc (đã kiểm dòng Trạng thái và mục lục `docs/adr/README.md`)

| Nguồn | Trạng thái | Câu đã bị ADR sau thay hoặc bổ sung |
|---|---|---|
| ADR-0053 (README:57) | accepted 2026-09-30 | • `:59` bị ADR-0096 thay: nay có cửa sổ xuất bến LC-20; vế "xuất bến từ ngày chạy" của D7.2 giữ nguyên nghĩa.<br>• `:55` và `:69` được ADR-0105 bổ sung (Q-2 a): chuỗi đích "Chỉ đường" của tài xế đối tác chỉ có trong khung D7.2.<br>• **Mã đơn** của tài xế đối tác chỉ có trong khung D7.2 (`:30`, `:70`, `:171`). |
| ADR-0048 D2 (:93-138) | accepted | Câu về ô quyền bị ADR-0053:170 thay. LC-1 (:120) và LC-1b (:121) giữ nguyên. |
| ADR-0052 D4.3, D5b | accepted | `trip.passenger.add` của DRIVER_PARTNER **giữ `none`**, theo lời chủ 5/10 (a) "chỉ tài xế công ty" (`2026-10-05-van-chuyen-dot-5-nhat-ky.md:105-108`). Điều này **lệch chữ ADR-0053:46** ("chỉ mở nếu A-1b đã duyệt"; A-1b đã duyệt), là lệch có chủ ý, ghi ở SYSTEM-DESIGN §16 (T11). `trip.transfer` thuộc A5. |
| ADR-0104 Đ1 (:95-105) | accepted 2026-10-08; nhánh `adr-0104-d1` @ `45731dea`, sắp gộp | Không thay câu nào của ADR-0053. Chỉ giao ở `permissions.ts` và tin `khan_cap` (§6.2). |
| ADR-0105 (:24-27, :94) | accepted 2026-10-08 | Khoá `diaChiChiDuong` đi theo cờ khung `trongKhungXemKhach`, cùng chỗ với `hoTen`. |
| Lời chủ 2/10 tối | đã trả lời | "Đồng ý 18 câu theo khuyến nghị", gồm 6.1–6.5 (`2026-10-02-van-chuyen-cau-hoi-ban-ve.md:11`, :54-58). Nội dung ở `danh-gia/dot-6.md:59-79` và :83-108; riêng điều kiện hiện nút ở mục 9 và 12 được sửa theo G-A4-16. |
| Lời chủ 5/10 về 0.2 (a–c) | đã trả lời | Chỉ là bối cảnh: A4 **không có số tiền nào**. Đối tác tự thu, nên màn tài xế đối tác không có ô tiền (ADR-0053:71). |

### 0.2 Trong phạm vi

| # | Mục | ADR:dòng | Task |
|---|---|---|---|
| P1 | Cột DRIVER_PARTNER của `trip.view` và `trip.progress`: `none` → `assigned`. Mở chỉ bằng ô, không thêm route, không đổi cổng. | 0053:46, :51 | T6 |
| P2 | Ô mới `trip.refuse`: **tạo ở T3** với DRIVER_PARTNER = `none`, SUPER_ADMIN = `any`, mọi cột khác `none`; **lật DRIVER_PARTNER → `assigned` ở T6**. Tạo cùng commit với chỗ máy chủ hỏi đầu tiên (§3.0). | :47, :105 | T3, T6 |
| P3 | Ô mới `unavailability.self`: DRIVER_PARTNER = `own`, DRIVER = `none`, SUPER_ADMIN = `any`. **Tạo ở T8**, cùng commit với route `/ban*`. | :47, :146 | T8 |
| P4 | Khung thấy khách = sau hạn Từ chối **VÀ** (hôm nay là ngày chạy **HOẶC** chuyến RUNNING đã xuất bến từ ngày chạy). Chỉ một hàm. | :54-63, ADR-0105:94 | T1, T3 |
| P5 | DTO tài xế đối tác: như tài xế công ty cộng khung D7.2. **Mã đơn, họ tên, năm sinh, người liên hệ chỉ có trong khung**; ngoài khung các khoá đó vắng mặt. Không tiền. | :30, :68-72, :171 | T3, T7 |
| P6 | Tin chuyến tự tới tài xế đối tác. Không có luật mới. | :79 | T6 |
| P7 | Từ chối: dữ liệu; hạn "khoá dính" theo cặp; lô lệnh; bất biến B8.1–B8.5; route. | :83-131 | T2, T7 |
| P8 | Báo bận: bỏ trigger chặn DRIVER; B9.1–B9.4; route của tài xế; văn phòng xem. | :135-160 | T2, T8 |
| P9 | LC-03 xét cả khung bận tài xế khi tạo hoặc sửa chuyến (phần "câu đọc" của C25). | :156, :176 | T4 |
| P10 | Lời chủ 6.1–6.5:<br>• 6.1: chỉ ghi tổng khách.<br>• 6.2: không có lý do bận ở dữ liệu văn phòng và câu 409.<br>• 6.3: thêm ô SĐT văn phòng.<br>• 6.4: không làm kéo thả; có câu chặn và nhãn "Bận" ở ô chọn tài xế.<br>• 6.5: tên "Cuốc của tôi"; nút Xuất bến giữ màu. | cau-hoi-ban-ve:54-58 | T4, T5, T8, T9 |
| P11 | Trang đầu và menu của tài xế đối tác (C24: `start-page.ts`). | 0053:200 | T6, T9 |
| P12 | Câu kiểm mới trong audit-invariants. | :201 | T11 |
| P13 | Hướng dẫn tài xế và Trợ giúp. | :209; dot-6:107 | T10 |

### 0.3 Ngoài phạm vi

- **Chia doanh thu taxi:** sổ riêng, (d) hợp đồng/hoá đơn/thuế, và các điểm e–h (`cau-hoi-ban-ve.md:15`). Chỉ nhắc ở báo cáo cuối.
- **Nhờ đón chéo → A5 (BL-VC-D4).** Gồm ô `trip.transfer` và D7.4.
  - Khi A4 ra, **tiêu chí 1 ("9 ô") và tiêu chí 9 của ADR-0053 chưa đạt**. Ghi ở SYSTEM-DESIGN §16 (T11) và báo cáo cuối (T13).
  - Ghi cho A5: khi tạo ô `trip.transfer`, đặt luôn cột DRIVER_PARTNER = `assigned` (0053:46), và nâng bài ghim lên 9 ô **trong cùng commit tạo ô**.
- **`trip.passenger.add` cho tài xế đối tác** (lời chủ 5/10; lệch có chủ ý, ghi §16).
- **Báo bận cho tài xế công ty; văn phòng ghi hoặc rút thay khung bận** (Q3 c; 0053:143). Phần "tài xế công ty" của C25 vẫn mở: ghi BACKLOG, cần ADR mới.
- **Kéo chuyến thả vào tài xế** (6.4). **Tách người lớn / trẻ em** (6.1).
- **Đếm hoặc đặt hạn mức số lần Từ chối** (:114). **Gợi ý tài xế thay** (MQ-01).
- **Bỏ tab "Trang chủ" `/tai-xe`:** giữ, vì đó là chỗ xem giấy tờ (dot-6:102).
- **Pháp lý** của việc đưa danh sách khách cho người ngoài (0053:271-276): không giải bằng mã; là mục báo chủ ở T13.
- **Mục changelog:** điều phối thêm một mục cho cả nhánh.
- **Hướng dẫn cho văn phòng** (dải "Tài xế bận", nhãn "Bận", tin "đã từ chối"): không thêm chữ, vì Bán hàng và Quản trị đã chạm trần (T10). Chấp nhận và nêu ở báo cáo.

### 0.4 Kế hoạch cũ (06), đo lại tại `8e2d189a`: phần đã lỗi thời

| Chỗ trong kế hoạch cũ | Đo lại | Kết luận |
|---|---|---|
| §0 "Phụ thuộc cứng" (Đợt 2, 3, 4 T2, 5 A-1b) | Đã có đủ:<br>• `vc_unavailability` (0071)<br>• `THIEU_GIA` (`ly-do-giu.ts:62`)<br>• `baoThayDoiChuyen`<br>• `trip.passenger.add` (`permissions.ts:197`) và route `index.ts:1697` | Bỏ bảng này. Phụ thuộc mới: Đ1, Đ2, ADR-0105, ADR-0109, G17 (§6.3). |
| P6-1: `trongNgayChay` ở `dieu-phoi-kiem.ts:420` | Nay ở `:531-533` | Dời dòng |
| P6-3, Task 4: "5 ô mới + 4 cũ = 9", mở `trip.passenger.add` | Chủ trả lời 5/10: DRIVER_PARTNER `none` | **Lỗi thời.** Nay 4 ô mở + 4 ô cũ = **8 ô có tên** (NT-1). |
| Task 3: chèn `REFUSE_DEADLINE_INSERT` ở từng lô (`dieu-phoi.ts:118, :144`) | Đường mở dòng lái nay ở `dieu-phoi.ts:171` (tạo) và `:212` (sửa). Đ1 thêm đổi tài xế khẩn cấp; A5 sẽ thêm cứu hộ. | Đổi sang trigger `AFTER INSERT` (G-A4-3). Cách cũ giữ làm dự phòng. |
| Task 3: "10 chỗ `trongNgayChay` ở `index.ts:1046-1230`" | Nay 11 chỗ:<br>• chi tiết `:1477`<br>• chín lệnh tiến độ `:1504-1688`<br>• hanh-khach `:1704`<br>• cộng khoá chỉ đường của ADR-0105 | Dời dòng, thêm chỗ |
| Task 3: `loaiTaiXe(staff)` dựa vào mã quyền | — | Thay bằng vế hạn theo `can(trip.refuse, {assigned:true})` (G-A4-2) |
| Task 0: biểu thức `julianday('now')` | Tiền lệ `scripts/audit-checks.mjs:51`: `CAST(strftime('%s','now') AS INTEGER)*1000` | Đổi biểu thức (G-A4-4) |
| Task 4: "tệp đề xuất luật" riêng cho chủ duyệt | ADR-0053:49 và :200: chủ duyệt ADR tức là duyệt việc nới (Điều 9.4). 6.3 đã duyệt 2/10. | Bỏ tệp đề xuất luật. Chỉ còn dòng `web/CLAUDE.md` (§1b) |
| "Cần chủ" mục 1 (6.1–6.5) | Chủ trả lời 2/10 tối | Đóng |
| Bài `dieu-phoi-kieu.test` "tám → mười nhóm" | Hiện đã có 10 nhóm | Thành **12** nhóm, ở **T2** |
| "Chưa chắc": `refuseLeadMinutes` chưa có ô trên màn | — | Thêm ô trên màn để Toàn quyền đổi được (0053:93) |
| Trích dẫn dòng:<br>• `contracts.ts:1146` / `:1453`<br>• ADR trích `permissions.ts:106/107/122`<br>• `index.ts:912-1117`<br>• `SO-HANG-RAO:132/:138/:139` | Nay:<br>• `contracts.ts:1191` / `:1550-1600`<br>• `index.ts:1458-1704`<br>• `SO-HANG-RAO:143/:149/:150` | Dời dòng |
| Báo cáo đánh giá:<br>• C24 (`permissions.ts:187, 193`; `start-page.ts:34-35`)<br>• C25 (`0071:56-59`) | Khớp | Giữ |

---

## 1. Điều ADR chưa trả lời

### 1a. Giả định tự áp (bề mặt, đảo ngược được, hoặc chỉ siết). Người kiểm soi từng dòng.

| Mã | Giả định | Loại |
|---|---|---|
| G-A4-1 | Biên nghiêm: thấy khách khi `bayGio > hạn`; Từ chối được khi `bayGio ≤ hạn`. Hai khoảng rời nhau. | siết (Điều 9.4) |
| G-A4-2 | **Vế hạn** (của khung xem khách và của mã đơn) áp khi `can(staff,"trip.refuse",{assigned:true})`. Gồm:<br>• DRIVER_PARTNER;<br>• Toàn quyền khi chính mình lái, kể cả tài khoản Toàn quyền + DRIVER.<br>Điểm cuối **lệch chữ ADR-0053:64** ("tài xế công ty … không có vế hạn") theo chiều siết: những tài khoản đó thấy khách và mã đơn muộn hơn tài xế công ty thường.<br>DRIVER (chỉ DRIVER) không có vế hạn. Thiếu dòng hạn thì coi là **ngoài khung** (đóng mặc định). | siết |
| G-A4-3 | Hạn được chèn bằng trigger `AFTER INSERT ON vc_trip_driver` cho mọi cặp, cả tài xế công ty. `lead_minutes` đọc chính sách hiệu lực tại `NEW.valid_from_at` (dự phòng: G-A4-27). Trigger phủ mọi đường xếp: Đ1, A5, và cả đường sau này (0053:91). Nếu T0(c) hỏng thì dùng câu chèn trong lô. | kỹ thuật |
| G-A4-4 | B8.3 so giờ bằng `CAST(strftime('%s','now') AS INTEGER) * 1000`. Đây là ngoại lệ có tên của ghi chú "không dùng giờ CSDL" ở 0084:14, căn cứ 0053:122. Biểu thức làm tròn xuống giây, nên lỏng hơn cổng máy chủ tối đa 1 giây; lớp máy chủ là lớp chính. | kỹ thuật |
| G-A4-5 | `coCuocCuaToi` = **giữ một mã quyền mà ô `trip.view` của mã đó đúng bằng `"assigned"`** (đọc `MATRIX`). **Không** dùng `can(…,{assigned:true})`, vì ô `any` của văn phòng cũng trả đúng: Bán hàng sẽ có tab Cuốc (`shell.ts:535`, `trang-chu-o.ts:61`). | bề mặt |
| G-A4-6 | DTO giữ tên khoá `trongNgayChay` (`contracts.ts:1599`) nhưng nghĩa là "trong khung xem khách". Đổi tên sẽ làm hỏng PWA cũ. Có hai chỗ giao diện đọc khoá này (§5.3). | bề mặt |
| G-A4-7 | **`suat[].maDon` theo khung với người gọi có vế hạn (G-A4-2):**<br>• ngoài khung, khoá **vắng mặt** (không phải `null`): contract `maDon?: string \| null`;<br>• tài xế công ty giữ mọi lúc (ADR-0049 D3; ADR-0053:69).<br>Căn cứ ADR-0053:30, :70, :171; README:57. | đọc ADR (chặt; cửa một chiều) |
| G-A4-8 | Câu đọc khung tài xế nằm ở tệp mới `khung-ban-tai-xe-repo.ts`, lọc `subject='DRIVER'` tường minh. `khung-ban-repo.ts` giữ chỉ VEHICLE (SO-HANG-RAO:385). Lịch chung (`dungLichNgay`, `dieu-phoi-lenh.ts:671-708`, ô `trip.view`) **không** nhận khung tài xế, nên Kế toán không thấy (0053:147). | siết |
| G-A4-9 | 6.2: nhánh DRIVER trong `kiemTaoSuaChuyen` (`dieu-phoi-kiem.ts:139-142`) bỏ `lyDoNhan`; nhánh VEHICLE giữ lý do. Câu chặn: "<Tên> bận từ <giờ ngày> đến <giờ ngày>. Chọn tài xế khác hoặc đổi giờ chuyến." (dot-6:91). | lời chủ 6.2 |
| G-A4-10 | `KHUNG_TAI_XE_TOI_DA_NGAY = 14` (G3-6), đặt cạnh `KHUNG_XE_TOI_DA_NGAY` (`khung-ban.ts:18`). Bắt đầu phải **≥ đầu phút hiện tại** (bây giờ làm tròn xuống phút), để chọn "bây giờ" trên `datetime-local` không bị 400 vì chênh vài giây. Khung xe vẫn cho bắt đầu trong quá khứ (`khung-ban.ts:21`). Phút tròn. | bề mặt |
| G-A4-11 | Gieo 4 lý do nhóm `TU_CHOI_CHUYEN` (:86) và 3 lý do nhóm `BAN_TAI_XE` (:140).<br>• Tiền tố mã mới trong `TIEN_TO` (`chinh-sach-hien-thi.ts:222`) không bắt đầu bằng `"TU_CHOI"` của nhóm `TU_CHOI_NHAN`, cũng không bằng `"BAN_XE"`.<br>• Thêm nhóm ở **T2**, cùng migration gieo. | bề mặt |
| G-A4-12 | `office_phone` cho phép NULL, kiểm bằng `src/shared/phone.ts`. Nhật ký `dispatch_policy_changed` chỉ ghi "đổi số điện thoại văn phòng", không ghi chữ số. DTO tài xế chỉ có số khi đã nhập (6.3). | lời chủ 6.3 |
| G-A4-13 | `refuse_lead_minutes` có ô trên màn Chính sách; khoảng 60–2880 (CHECK và `kiemChinhSachMoi`). Chỉ áp cho cặp được xếp lần đầu sau khi đổi (:101). | bề mặt |
| G-A4-14 | Chi tiết chuyến văn phòng: chỉ người có `trip.dispatch` thấy **lý do** Từ chối. Kế toán thấy "Tài xế <tên> đã từ chối lúc …", không kèm lý do. Tin Từ chối không có lý do, không có tên. | siết |
| G-A4-15 | **Route `tu-choi` theo thứ tự** (sửa theo TĐ-2):<br>(1) `!can(staff,"trip.refuse",{assigned:true})` → **403** (DRIVER, Kế toán, Bán hàng, Quản trị).<br>(2) `nen = docNen(id)`. Đọc thân lỏng: chỉ lấy `requestId` nếu hợp khuôn; bước này không trả 400.<br>(3) **Lệnh lặp của chính mình:** có `requestId`, và câu đọc mới `SU_KIEN_TU_CHOI_THEO_YEU_CAU` (G-A4-29) trả dòng `kind='DRIVER_REFUSED'`, `trip_id = id`, `created_by = staff.id` → **200** `{daTuChoi:true}`. Không ghi, không gọi `baoThayDoiChuyen`.<br>(4) `!nen \|\| !dangLai(nen, staff)`: nếu `can(staff,"trip.refuse")` không ngữ cảnh đúng (Toàn quyền) → **403** "Toàn quyền không từ chối thay — đổi người bằng xếp xe" (:105, :224); còn lại → **404**.<br>(5) Thân sai → **400**.<br>(6) `const lap = await traLenhLap(env.DB, requestId, { tripId, loai: ["DRIVER_REFUSED"] }); if (lap instanceof Response) return lap;` (khuôn bắt buộc, `lenh-lap-quet.test.ts:64`). Nếu `lap` là một dòng (sự kiện Từ chối của **người khác** cùng mã) → **409 `request_id_reused`**, không 200. Như vậy không lộ việc người khác đã Từ chối.<br>(7) Chạy lô. Cổng thua thì đọc lại và phân loại (G-A4-25). | đọc ADR (ADR thắng khuôn 404 của họ `cuoc-cua-toi*`) |
| G-A4-16 | **Điều kiện hiện ở giao diện** (sửa theo TĐ-4):<br>• Nút "Từ chối chuyến" hiện **chỉ theo cờ máy chủ `tuChoiDuoc`**. Máy chủ tính cờ này = `can(staff,"trip.refuse",{assigned:true})` && đang lái && `PLANNED` && `bayGio ≤ hạn`.<br>• Tab và mục "Báo bận của tôi" hiện khi `chiTaiXe && can(staff,"unavailability.self",{ownerId: staff.id})`. Toàn quyền không có tab (dot-6:101).<br>• Không dùng `can()` không ngữ cảnh cho hai ô này: ô `assigned`/`own` khi không có ngữ cảnh luôn sai (`permissions.ts:248-258`).<br>• Tab `/tai-xe` giữ. Biểu tượng: Cuốc → `assign`, Báo bận → `clock`. Nút Xuất bến giữ `btn-accent` (6.5). | bề mặt |
| G-A4-17 | **DTO tài xế** (`tai-xe-dto.ts`, `contracts.ts`), nới có tên từng khoá (§3.1):<br>• `tuChoiDuoc: boolean`, **mọi tài xế**; DRIVER luôn `false`. Căn cứ D8.6.<br>• `hanTuChoi?: GioVnDto`, chỉ khi có vế hạn. Căn cứ D8.6.<br>• `thayKhachTu?: GioVnDto`, **mọi tài xế** khi ngoài khung, nên tài xế công ty cũng thấy dòng "Thấy danh sách khách từ …". Căn cứ dot-6 mục 1 và 9.<br>• `lyDoTuChoi?: {code,nhan}[]`, chỉ khi `tuChoiDuoc`. Căn cứ dot-6 mục 2.<br>• `sdtVanPhong?: string`, khi đã nhập. Căn cứ lời chủ 6.3.<br>Không đổi tên `sdtVanPhong` để né bài `CAM_KHOA`; thay vào đó **nới có tên** regex và miễn có tên ở NT-10. | bề mặt + lời chủ |
| G-A4-18 | "Khung của tôi" gồm khung còn hiệu lực và khung đã rút trong 30 ngày. Máy chủ trả sẵn `trangThai` `DANG \| SAP \| DA_RUT` (dot-6:88). | bề mặt |
| G-A4-19 | Dải "Tài xế bận" của văn phòng: từ ngày đang xem tới +6 ngày (dot-6:92). DTO gồm `taiXeId`, `tenTaiXe`, `nhaXe[]` (nguồn `taiXeChoDieuPhoi`) và giờ; không có lý do. Ô chọn tài xế ở `chuyen-sua` ghi "Bận" dùng cùng route; không thêm route. | lời chủ 6.2, 6.4 |
| G-A4-20 | Nhật ký:<br>• `trip_driver_refused`: mã chuyến và mã lý do (:109).<br>• `driver_unavailability_added` / `_withdrawn`: chỉ khoảng giờ, không mã lý do (6.2). | siết |
| G-A4-21 | Câu RAISE của B9.3 mở đầu bằng `lc03_`, nên ánh xạ sẵn có `lc0[1-9]` (`rules.ts:164`) bắt được, kể cả khi Worker đã hoàn tác về mã cũ. | kỹ thuật |
| G-A4-22 | CHECK của B8.4 viết `(close_reason IS 'REFUSED') = (refuse_reason_code IS NOT NULL)`. Nếu dùng `=` thì `close_reason` NULL làm CHECK lọt. Nếu `ADD COLUMN` không nhận CHECK chéo cột (T0 b) thì dùng trigger, như B8.4 cho phép. | kỹ thuật |
| G-A4-23 | Gieo hạn cho mọi dòng lái đang mở lúc áp migration: `planned_start_ms − 720 phút` (G3-7, :92). | ADR |
| G-A4-24 | Câu cổng của lô Từ chối mang **đủ** điều kiện: `version`, `PLANNED`, người gọi có dòng lái mở, `?bayGio ≤ deadline_ms`. Các câu sau chỉ chạy khi `last_cmd_id = cmd`. Trigger B8.3 là lớp thứ hai. | kỹ thuật |
| G-A4-25 | **Cổng thua thì đọc lại và trả đúng 409** (D8.4 bước 3). Xét theo thứ tự:<br>(a) chuyến không còn `PLANNED` → 409 `trip_not_planned` "Chuyến đã xuất bến, kết thúc hoặc bị huỷ";<br>(b) người gọi không còn dòng lái mở → 409 `stale`;<br>(c) `bayGio > deadline_ms` → 409 `refuse_deadline_passed` "Đã quá hạn từ chối, hãy gọi văn phòng để đổi người";<br>(d) còn lại (version) → 409 `stale`.<br>**Tiền tố RAISE mới:** `tc82_` (B8.2), `tc83_` (B8.3), `tc84_` (B8.4), `rd_` (hạn chỉ giảm, cấm xoá). Đã đo: không regex nào ở `rules.ts:158-164` khớp các tiền tố này.<br>Ánh xạ trong `loiRangBuocChuyen`:<br>• `tc83_` → 409 `refuse_deadline_passed`;<br>• `tc82_\|tc84_\|rd_` → 409 `trip_rule`.<br>Thiếu ánh xạ thì đua sát hạn (đồng hồ Worker và D1 lệch nhau) thành 500. | kỹ thuật |
| G-A4-26 | Đồng hồ của bài thử: §2 "Luật đồng hồ". | kỹ thuật |
| G-A4-27 | Trigger hạn: `lead_minutes = COALESCE((chính sách có valid_from_at ≤ NEW.valid_from_at, mới nhất), 720)`. Không bao giờ bỏ qua cặp, không bao giờ lỗi NOT NULL. 720 là số gieo của ADR (:93). | kỹ thuật |
| G-A4-28 | `/ban*` **không** có `requestId` trong thân. Theo khuôn `POST …/xe/:id/ban` (`index.ts:585-600`); chống ghi trùng ở lớp vé (H2). Như vậy không cần mục ngoại lệ ở `lenh-lap-quet.test.ts:44`. | kỹ thuật |
| G-A4-29 | Câu đọc `SU_KIEN_TU_CHOI_THEO_YEU_CAU` (`defineSql` trong `han-tu-choi-repo.ts`): `SELECT trip_id, kind, created_by FROM vc_trip_event WHERE request_id = ?1`. **Không** sửa `traLenhLap`, `khopLenhLap`, `EVENT_BY_REQUEST`, vì khoảng 26 route dùng chung. | kỹ thuật |

### 1b. Câu hỏi cho chủ

**Không có câu bắt buộc.** Mọi điều chạm quyền hoặc dữ liệu đều đã có trong ADR-0053, ADR-0105, lời chủ 2/10 (6.1–6.5) và lời chủ 5/10. G-A4-7 đã áp theo chữ ADR.

**Một câu dự phòng, có điều kiện.** Chỉ hỏi **nếu T0(a) thất bại trên D1 local**, tức trigger không so được giờ hiện tại. ADR-0053:126 bắt quay lại chủ trong trường hợp đó. Nếu T0(a) thành công thì không hỏi.

> **Tiêu đề:** Hạn từ chối
> **Câu:** "Tài xế nhà xe chỉ được bấm 'Từ chối chuyến' trước một giờ hạn (mặc định 12 tiếng trước giờ chạy). Để chắc không ai từ chối sau hạn, Nền tảng cần một chốt kiểm thứ hai ngay chỗ lưu dữ liệu, nhưng thử nghiệm cho thấy chốt này chưa làm được. Bạn chọn cách nào?"
> 1. **Chưa có nút Từ chối (Recommended)**: tài xế nhà xe xem chuyến, bấm các bước chạy và báo bận ngay, nhưng chưa có nút Từ chối; muốn trả chuyến thì gọi văn phòng đổi người.
>    - Được: tài xế nhà xe dùng Nền tảng ngay; mọi chốt kiểm vẫn đủ hai lớp.
>    - Mất: tài xế nhà xe chưa tự trả chuyến trên điện thoại; mỗi lần trả chuyến phải gọi văn phòng.
> 2. **Có nút Từ chối, một chốt kiểm**: có nút Từ chối ngay, chỉ một chốt kiểm ở máy chủ.
>    - Được: tài xế nhà xe tự trả chuyến ngay trên điện thoại.
>    - Mất: nếu máy chủ lỗi thì có thể có người từ chối sau khi đã thấy tên khách.

*Cho người thi công, nếu chủ chọn 1:*
- Giữ ô `trip.refuse` của DRIVER_PARTNER = `assigned`, để vế hạn của khung (G-A4-2) vẫn áp. Bỏ ô này thì tài xế đối tác thấy khách từ 00:00 ngày chạy.
- Không làm T7 (route, lô, nút). Giữ bảng hạn, trigger hạn, B8.2 và B8.4.

**Đề xuất sửa luật (không phải quyết định dữ liệu hay quyền).** Điều phối gom vào lần trình kế: thêm vào bảng kịch bản Chrome của `web/CLAUDE.md` dòng `web/ban.ts` → `ban-smoke.mjs`. Khi chưa duyệt, kịch bản vẫn chạy và vẫn ghi bằng chứng.

---

## 2. Tiêu chí nghiệm thu (viết trước task; mỗi NT có bài máy)

**Luật đồng hồ của bài thử (G-A4-26; sửa bom hẹn giờ của TĐ-3).**
- Bài nào chạm đường Từ chối **thành công** thì bật `batDongHo(Date.now())`, gieo chuyến bằng tham số `ngay` của `chuyenSan` (`tests/audit/dieu-phoi-khung.mjs:160-164`) với ngày VN thật hôm nay +N, và chỉ tiến đồng hồ giả.
  - Áp cho: `tu-choi.test.ts`, mẫu `loTuChoi` ở `thu-tu-lo.test.ts`, dòng `tu-choi` ở `lenh-lap-quet`, e2e.
  - Lý do: SQLite và D1 vẫn dùng giờ thật; với `NOW_GIA` = 2027-03-11, bài sẽ đỏ vĩnh viễn từ khoảng 10/3/2027.
- **Ngoại lệ có tên:** bài đua sát hạn (NT-4) cố ý đặt đồng hồ giả **sau** giờ thật để cổng máy chủ cho qua mà B8.3 chặn.
- Bài chỉ chạm khung xem khách (không Từ chối) vẫn dùng `NOW_GIA` được, vì không trigger nào khác so giờ CSDL.
- Bài SQL chèn thẳng (NT-5, NT-6, NT-8): gieo giờ tương đối với giờ thật.
- **Bài canh:** quét `src/modules/van-chuyen/*.test.ts`. Tệp nào gọi route `tu-choi` mà gọi `batDongHo()` không tham số thì đỏ.

**Tiêu chí:**

- **NT-1 Ghim hàng DRIVER_PARTNER.**
  - Sau T6: đúng **7** ô có tên (`trip.view` assigned, `trip.progress` assigned, `trip.refuse` assigned, cộng 4 ô cũ).
  - Sau T8: đúng **8** ô (thêm `unavailability.self` own).
  - 4 ô cũ, đã đo: `feedback.submit` any, `feedback.view` own, `party.document.view` own, `assistant.ask` any.
  - Mọi ô khác `none`, kể cả `trip.passenger.add`, `trip.urgent_adjust` (Đ1), `trip.dispatch`, `trip.override`, `trip.call_ack`.
  - Cột DRIVER của `trip.refuse` và `unavailability.self` = `none`. Sửa một ô thì bài đỏ.
  - Đối chiếu tiêu chí 1 của ADR ("9 ô"): thiếu `trip.passenger.add` (chủ 5/10, §16) và `trip.transfer` (A5, §16); thêm `assistant.ask`, ô có sau ADR. Lên 9 khi A5 tạo `trip.transfer`.
- **NT-2 IDOR.** Tài xế đối tác A thao tác trên chuyến hoặc khung của B → **404**: mở chuyến, Từ chối, xem khách, rút khung. Đổi id trên đường dẫn không lộ gì.
- **NT-3 Khung xem khách.**
  - Chạy đủ các ca ở 0053:217-222 cho tài xế đối tác và tài xế công ty, ở **GET chi tiết và phản hồi của cả chín lệnh tiến độ**.
  - Tài xế đối tác ngoài khung:
    - không có khoá `hoTen`, `namSinh`, `lienHe`, **`suat[].maDon`**, chuỗi đích chỉ đường (ADR-0105);
    - **toàn văn phản hồi** không chứa mã đơn nào của dữ liệu mẫu. Đã đo: `loiNhan` ở `ly-do-giu.ts` là chuỗi tĩnh.
  - Tài xế đối tác trong khung: có `maDon`.
  - Ca bắt buộc cho phản hồi lệnh: chuyến 14:00, hạn 02:00, tài xế đối tác bấm Xuất bến lúc 00:05 → phản hồi lệnh **không có `maDon`** và không có chuỗi đích chỉ đường. Họ tên không bao giờ có trong phản hồi lệnh (`index.ts:1509`); vế đó giữ làm bài canh.
  - Tài xế công ty: `maDon` có mọi lúc (không đổi).
  - Mọi lúc: không khoá tiền, không khoá NL/TE (6.1).
- **NT-4 Từ chối.**
  - Trước hạn → 200: dòng lái `REFUSED`, có lý do, người đóng = người gọi; đúng một dòng nhật ký.
  - Lý do thiếu, ngoài danh sách hoặc đã ngưng → 400.
  - Sau hạn → 409 `refuse_deadline_passed`. Chuyến đã xuất bến, kết thúc hoặc huỷ → 409 `trip_not_planned`.
  - Tài xế công ty → 403. Toàn quyền không lái → 403. Tài xế đối tác trên chuyến của người khác → 404.
  - Từ chối song song với văn phòng đổi tài xế → đúng một bên thắng; bên kia 409 `stale`; đúng một dòng nhật ký.
  - **Đua sát hạn** (đồng hồ giả = hạn − 1 giây, giờ thật > hạn) → 409 `refuse_deadline_passed`, **không 500**.
  - Giao lại cho xe của nhà xe khác → giá đảo và chụp lại theo lô ADR-0057 có sẵn. Chỉ đổi tài xế, cùng nhà xe và cùng xe → giá giữ.
  - **Lệnh lặp:**
    - cùng `requestId` của chính người gọi sau khi đã Từ chối → 200 `{daTuChoi:true}`, không thêm nhật ký, không gửi tin;
    - tài xế khác (kể cả người mới được xếp vào chuyến) dùng lại `requestId` đó → 409 `request_id_reused` hoặc 404, **không 200**;
    - cùng `requestId` cho chuyến khác → 404.
- **NT-5 Khoá dính.** Đủ các ca ở 0053:225. Thêm:
  - dời chuyến muộn hơn → 200, không lỗi trigger, hạn không đổi;
  - SQL `UPDATE vc_refuse_deadline` mà `deadline_ms` không giảm → RAISE `rd_`;
  - sửa `trip_id`, `driver_party_id` hoặc `lead_minutes` → RAISE `rd_`;
  - `DELETE` → RAISE `rd_`.
- **NT-6 Lớp CSDL Từ chối.** Chèn thẳng SQL, giờ gieo tương đối với **giờ thật**:
  - `REFUSED` với người đóng ≠ tài xế → RAISE `tc82_`;
  - `REFUSED` khi chuyến RUNNING → RAISE `tc83_`;
  - `REFUSED` sau hạn → RAISE `tc83_`;
  - có `refuse_reason_code` mà không `REFUSED` → RAISE (CHECK hoặc `tc84_`);
  - nhóm lý do khác `TU_CHOI_CHUYEN` → RAISE `tc84_`;
  - mở lại dòng đã đóng → RAISE (LC-04).
- **NT-7 Sau Từ chối.**
  - Chuyến bị giữ ở `CHUA_CO_TAI_XE`.
  - Tin hộp thông báo `tu_choi` tới người có `trip.dispatch` (Bán hàng, Quản trị, Toàn quyền); không tới Kế toán, không tới tài xế khác.
  - Nhãn Bảng tin `dieu-xe` (chỉ id và loại sự kiện) vẫn tới mọi người có `trip.view` any, gồm Kế toán (`src/shared/bang-tin.ts:60`; ADR-0052 D6.4). Đây là hành vi đã duyệt, bài ghi rõ.
  - Tài xế mở lại chuyến → 404.
  - Văn phòng thấy "đã từ chối lúc …"; lý do chỉ hiện với người có `trip.dispatch`.
- **NT-8 Báo bận.**
  - Khung chồng chuyến đang được xếp → 409 `khung_ban_chong_chuyen_tai_xe`, kèm `chuyen:{id,ma,gio}[]` của chính người gọi. Ghi thẳng SQL → RAISE.
  - Văn phòng xếp tài xế vào khung bận → 409 `TRUNG_GIO_TAI_XE`, câu không lý do. SQL → RAISE (chèn dòng lái, và dời giờ chuyến).
  - Sửa giờ hoặc xoá khung → RAISE.
  - Xem hoặc rút khung của người khác → 404.
  - Tài xế công ty ghi khung → 403. Kế toán gọi `ban-tai-xe` → 403.
  - Quá 14 ngày, bắt đầu trước đầu phút hiện tại, kết thúc ≤ bắt đầu → 400.
  - Rút lần hai → 409.
  - `POST /ban` → 201 có `Location: /ban` (H7).
  - DTO `ban-tai-xe` không có khoá lý do. Thân `/ban*` không có `requestId` (G-A4-28).
- **NT-9** (tiêu chí 9 của ADR, nhờ đón chéo) **hoãn sang A5**. Ghi ở §16 và báo cáo.
- **NT-10 Không lộ.**
  - Áp cho mọi route mới và DTO tài xế đối tác, với dữ liệu mẫu có tên, năm sinh, SĐT, số bằng lái: nhật ký, tin và Bảng tin không chứa các dữ liệu đó; không có dãy ≥ 8 chữ số.
  - Bỏ UUID trước khi quét (khuôn `8e2d189a`).
  - **Miễn có tên:** giá trị `sdtVanPhong` trong DTO tài xế. Bài khẳng định giá trị đó **đúng bằng** `office_phone` của chính sách và không bằng SĐT của bất kỳ người nào khác trong dữ liệu mẫu.
- **NT-11 Cổng.**
  - Tài khoản chỉ có DRIVER_PARTNER gọi các route sau → 403: `/api/orders`, `/api/orders/dashboard`, `/api/parties`, `/api/catalog`, `/api/van-chuyen/lich`, `/api/van-chuyen/xe`, `/api/van-chuyen/ban-tai-xe`.
  - `GET /cuoc-cua-toi` → 200, chỉ chuyến của mình.
  - `POST …/hanh-khach` → 403 (`trip.passenger.add` none).
- **NT-12 Trang đầu và menu.**
  - `homeRedirect(DRIVER_PARTNER)` = `/cuoc`.
  - `coCuocCuaToi`: SALES, ACCOUNTING, ADMIN, SUPER_ADMIN → false; DRIVER+SALES → true.
  - Tab Báo bận theo G-A4-16: hiện với tài khoản chỉ có DRIVER_PARTNER; không hiện với SUPER_ADMIN và DRIVER.
- **NT-13 Chính sách (6.3, D8.1).**
  - Toàn quyền lưu được `refuse_lead_minutes` và SĐT văn phòng.
  - Nhật ký không có chữ số SĐT.
  - DTO tài xế có `sdtVanPhong` khi đã nhập. Chưa nhập thì không có khoá, và màn ẩn nút "Gọi văn phòng".
- **NT-14 Tin D7.5.**
  - Tài xế đối tác đang lái nhận `xep_lai`, `doi_chuyen`, `huy_chuyen`, `khan_cap` (Đ1) và tin `trip_order_synced` (Đ2) của chuyến mình.
  - Câu tin không có mã đơn.
  - Bảng tin chỉ gắn `nguoi:<id>`, không bao giờ `tat-ca` hay `dieu-xe`.
- **NT-15 Hướng dẫn.** Đo bằng `phutDoc` (`huong-dan.ts:113`, phút làm tròn lên):
  - Phần chung + nhóm tài xế ≤ 30 phút.
  - **Không thêm chữ nào** vào Phần chung (1349/1350), Bán hàng (3142/3150), Quản trị (3130/3150). Đo lại sau Đ1.
  - Mọi `[[nút]]` có nguyên chuỗi trong mã giao diện.
- **NT-16 Lệnh kiểm.** Tất cả xanh:
  - `npm test`
  - `npm run typecheck` (0 lỗi)
  - `npm run build:web`
  - `npm run test:e2e`
  - `node scripts/audit-invariants.mjs --db local` (thoát 0 khi sạch, 1 khi gieo lỗi)
  - kịch bản Chrome 390 px và 1040 px

---

## 3. Task (mỗi task là commit nhỏ, đỏ trước xanh sau; mọi commit đều xanh toàn bộ `npm test`)

### 3.0 Ô quyền theo commit

Quy tắc: thêm ô và **chỗ máy chủ hỏi ô đó** trong **cùng commit**. Hàng rào 1 (`src/permission-enforcement.test.ts:68-76`) đếm mọi dòng trong `src/modules/**` có `can(` và chuỗi `"<ô>"`; một dòng như vậy trong `khungCuaNguoiGoi` là đủ. ADR-0053 Hệ quả cũng đòi "sửa trong cùng commit với ô". Không cần mục hoãn ở `docs/quyen-hoan.json`.

| Commit | Ô | Giá trị | Chỗ máy chủ hỏi, cùng commit | Bài và tệp đổi, cùng commit |
|---|---|---|---|---|
| T3 | thêm `trip.refuse` | DRIVER_PARTNER `none`, SUPER_ADMIN `any`, còn lại `none` | `khungCuaNguoiGoi` (`index.ts`): `can(staff, "trip.refuse", { assigned: true })` | • `permissions.test.ts`: bảng `ADR` thêm hàng (bài `:92-96`, `:175-183` đọc bảng này); ghim DRIVER, DRIVER_PARTNER, HR thêm ô `none`.<br>• `tro-ly-cau-truc-ten.ts` `TEN_THAO_TAC` "từ chối chuyến".<br>• `node scripts/sinh-so-do-trang.mjs`. |
| T6 | `trip.view`, `trip.progress`, `trip.refuse` | DRIVER_PARTNER → `assigned` | đã có (route tài xế; `khungCuaNguoiGoi`) | Ghim DRIVER_PARTNER **7 ô** và các bài ở §3.1 hàng T6. `trip.refuse` lật **cùng lúc** với `trip.view`, để vế hạn áp ngay từ lúc tài xế đối tác thấy chuyến. |
| T8 | thêm `unavailability.self` | DRIVER_PARTNER `own`, SUPER_ADMIN `any`, còn lại `none` | route `/ban*`: `can(staff, "unavailability.self", { ownerId: staff.id })` | Bảng `ADR` thêm hàng; ghim DRIVER_PARTNER **8 ô**; DRIVER và HR `none`; `TEN_THAO_TAC` "báo bận của tôi"; `sinh-so-do-trang`. |

`EXTERNAL_PERMISSIONS` (`permissions.ts:30`), LC-1 và LC-1b **không đổi**, vì không thêm mã quyền.

### 3.1 Bài đổi có tên theo commit (phiếu đã tái hiện; tôi đã mở lại từng dòng)

| Commit | Bài | Đổi | Loại / căn cứ |
|---|---|---|---|
| T2 | `src/migrations-khung-ban.test.ts:107-110` (TC-K3 khẳng định `/unavailability_driver_closed/`) | Thay bằng: khung DRIVER không chồng chuyến → chèn được; chồng chuyến đang xếp → `/unavailability_overlaps_driver_trip/` | Nới có tên; 0053:137 (bỏ trigger); SO-HANG-RAO `:376` |
| T2 | `src/audit-invariants.test.ts:2133` (`DROP TRIGGER vc_unavailability_driver_closed`) | Bỏ dòng DROP; khung DRIVER chèn thẳng như cũ | Cơ học |
| T2 | `src/shared/dieu-phoi-kieu.test.ts` (đếm nhóm; `:27-29` nhóm của dòng gieo) | 10 → 12 nhóm | Cơ học |
| T3 | `src/shared/permissions.test.ts` bảng `ADR` và ba hàng ghim | Thêm `trip.refuse` | Cơ học (ô mới `none` ở mọi cột tài xế) |
| T3 | `src/modules/van-chuyen/tai-xe-dto.test.ts:13` `KHOA_GOC` | • DRIVER: + `tuChoiDuoc`; + `thayKhachTu` khi ngoài khung.<br>• DRIVER_PARTNER: thêm `hanTuChoi`, `lyDoTuChoi` (khi `tuChoiDuoc`), `sdtVanPhong` (khi có). | Nới có tên; D8.6, dot-6 mục 1, 2, 9, lời chủ 6.3 (G-A4-17) |
| T3 | `tai-xe-dto.test.ts:11` `KHOA_SUAT` | Tách theo loại tài xế: DRIVER giữ `maDon` mọi lúc; người có vế hạn mất `maDon` ngoài khung | **Siết**; ADR-0053:30, :70, :171 |
| T3 | `tai-xe-dto.test.ts:17` `CAM_KHOA` | `sdt(?!LienHe)` → `sdt(?!LienHe\|VanPhong)` | Nới có tên; lời chủ 6.3; kèm bài NT-10 giá trị = `office_phone` |
| T6 | `permissions.test.ts`: ghim DRIVER_PARTNER (~`:373`); bài TC-35 `:433-438` (danh sách giữ `trip.progress` thêm `DRIVER_PARTNER`) | 7 ô; TC-35 | Nới có tên; 0053:49, :200 (Điều 9.4); SO-HANG-RAO `:143` |
| T6 | `src/modules/van-chuyen/cuoc-cua-toi.test.ts:30` (`GET /cuoc-cua-toi` DRIVER_PARTNER → 403) và `:49` (`/:id` → 403) | `:30` → 200 rỗng; `:49` → 404 (chuyến không lái) | Nới có tên; 0053:46 |
| T6 | `src/tai-xe-cong.test.ts:92`, `:98`, `:104` (BANG_STAFF cột DRIVER_PARTNER) | `GET /cuoc-cua-toi` 200; `/:id` và chín lệnh 404; `hanh-khach` **giữ 403** | Nới có tên; SO-HANG-RAO `:150`, `:158` |
| T6 | `start-page.test.ts:59`, `:61`, `:68-73` | `homeRedirect` → `/cuoc` | Nới có tên; SO-HANG-RAO `:149`; 0053:200 |
| T6 | `tests/e2e/tai-xe-cuoc.mjs:76-81` (còn 403 ở `hanh-khach`); `tests/e2e/tai-xe-doi-tac.mjs:36` | Như trên | Nới có tên |
| T6 | `tin-chuyen.test.ts:37-39`, `:73-86`, `:119`, `:155`, `:189`; `thongbao/tin-chuyen-hop.test.ts:26`; bài "chỉ DRIVER_PARTNER không nhận" của Đ1 (`src/tin-khan-cap.test.ts`), Đ2 và G17 nếu có | Tài xế đối tác đang lái **nhận** tin | Nới có tên; D7.5 (0053:79); SO-HANG-RAO `:345` |
| T7 | `src/tai-xe-cong.test.ts` BANG_STAFF | Thêm dòng `POST …/cuoc-cua-toi/:id/tu-choi`: DRIVER 403 (ô none), DRIVER_PARTNER 404 (chuyến lạ) | Cơ học (bài đòi mỗi route `staff` một dòng, `:117-119`) |
| T7 | `src/route-access.test.ts:382` (213); `src/lan-gui-phu-route.test.ts:55` (156); `src/modules/van-chuyen/lenh-lap-quet.test.ts:68` (31) và `BANG` | +1; +1; +1 (dòng `tu-choi`, loại `DRIVER_REFUSED`, giữ "quét", đồng hồ theo §2) | Cơ học |
| T7 | `thu-tu-lo.test.ts` | Mẫu `loTuChoi` | Thêm |
| T8 | `src/tai-xe-cong.test.ts` BANG_STAFF | Ba dòng:<br>• `GET /ban/cua-toi`: DRIVER 403, DRIVER_PARTNER 200<br>• `POST /ban`: DRIVER 403, DRIVER_PARTNER 400 (thân rỗng)<br>• `POST /ban/:id/rut`: DRIVER 403, DRIVER_PARTNER 404 (khung lạ) | Cơ học |
| T8 | `route-access.test.ts:382`; `lan-gui-phu-route.test.ts:55` | +4 (gồm `ban-tai-xe` cổng office); +2 | Cơ học |
| T8 | `src/lan-gui-location.test.ts:25` (H7) | `POST /ban` trả 201 với `kemLocation(…, "/ban")`; `/ban` hợp `KET_QUA_RE` (`lan-gui-luat.ts:50`) | Giữ hàng rào |
| T8 | `permissions.test.ts` bảng `ADR` và ghim | Thêm `unavailability.self`; DRIVER_PARTNER 8 ô | Nới có tên; 0053:49 |

Xanh khi lật hai ô (phiếu đã chạy): `bo-sung-ten`, `tin-chuyen-hop`, `dieu-phoi-man`, `thong-bao`, `thong-bao-doi`, `bang-tin`, `start-page` (phần không ghim trang đầu). Chạy lại ở T12: e2e `khung-ban-xe.mjs:144`.

### T0. Thử khả thi (cổng dừng; không có mã sản phẩm, chỉ ghi kết quả vào nhật ký thi công)

1. **(a)** Viết trigger thử so `CAST(strftime('%s','now') AS INTEGER)*1000` với một cột `deadline_ms` gieo theo giờ thật ±10 phút. Chạy trên `node:sqlite` và trên `wrangler d1 … --local`.
   - **Thất bại trên D1 local thì DỪNG** và trình câu dự phòng "Hạn từ chối" (§1b).
   - Phiếu đã chạy được trên `node:sqlite`; D1 local chưa thử.
   - Ghi nhận: `mock.timers` chỉ giả `Date` của JS; SQLite vẫn dùng giờ thật. Từ đó có §2 "Luật đồng hồ".
2. **(b)** `ALTER TABLE … ADD COLUMN … REFERENCES … CHECK` chéo cột (G-A4-22), với `PRAGMA foreign_keys=ON`, chạy trên cả hai nền. `node:sqlite`: phiếu đã thấy chạy và chặn đúng.
3. **(c)** Trigger `AFTER INSERT` ghi sang bảng khác bên trong một `db.batch` trên D1 local.
4. **(d)** `grep` toàn `src/`, `scripts/` và `architecture.test.ts` tìm luật cấm `'now'` hay cấm trigger ghi dữ liệu. Có luật thì ghi ngoại lệ có tên, căn cứ 0053:91 và :122.
5. **(e)** `docs/quyen-hoan.json`: đã đo 6 mục `phat_hien` (TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-5.11, HC-4.2). A4 không xây trên mục nào (§4 cuối).

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
  - `trongNgayChay` thành hàm nội bộ, chỉ hàm mới được gọi.
- **Chỗ gọi:** thêm `khungCuaNguoiGoi(db, nen, staff, bayGioMs)` trong `index.ts`, cạnh `dangLai` (`:126`). Thay mọi `trongNgayChay(…)` ở:
  - `:1477` (chi tiết);
  - chín lệnh `:1504-1688`, vì cờ ở đây quyết `maDon` (sau T3) và khoá chỉ đường;
  - `:1704` (hanh-khach);
  - chỗ gọi khoá chỉ đường của ADR-0105 (đã gộp trước).
  - Ở T1, `hanTuChoiMs` luôn `undefined`, nên **không đổi hành vi** với ai.
- **Bài** `cuoc-cua-toi.test.ts` (`:30`, `:49`) giữ xanh **ở T1**; đổi ở T6 (§3.1).

### T2. Migration `0091_tai_xe_doi_tac_tu_choi_bao_ban.sql` (số tạm; chốt khi gộp, §6.3)

**Bài đỏ** `src/migrations-tu-choi-ban.test.ts` (khuôn `src/migrations-tai-xe-doi-tac.test.ts`), chèn SQL trực tiếp, giờ gieo tương đối giờ thật:
- NT-5 phần SQL, NT-6, NT-8 phần SQL;
- gieo hạn cho dòng lái đang mở;
- trigger hạn với dòng lái có `valid_from_at` sớm hơn mọi dòng chính sách → `lead_minutes = 720` (G-A4-27);
- seed lý do;
- bỏ `vc_unavailability_driver_closed`.

Câu đỏ mong đợi: `no such table: vc_refuse_deadline`.

**Chú thích đầu tệp (bắt buộc):**
- ADR và mục đích.
- "CHỈ THÊM".
- Trigger chỉ đọc bảng `vc_` (Hiến chương 5.3).
- Ngoại lệ "giờ CSDL" của B8.3 (0053:122), là trigger đầu tiên so giờ CSDL; bài thử theo §2 "Luật đồng hồ".
- Tiền tố RAISE `tc82_`, `tc83_`, `tc84_`, `rd_`, `lc03_driver_unavailable`, `unavailability_overlaps_driver_trip` (G-A4-21, G-A4-25).
- **HOÀN TÁC:** D1 không có Down. Hoàn tác bằng migration mới:
  - `DROP TRIGGER` mọi trigger tạo ở migration này;
  - `CREATE TRIGGER vc_unavailability_driver_closed` lại y nguyên `0071:56-58`;
  - không DROP bảng hay cột (cột thừa vô hại);
  - đóng ô quyền bằng mã.
- **Cửa một chiều, không thu hồi được:** dữ liệu khách đã hiện cho tài xế đối tác, dòng REFUSED, dòng hạn.
- Khôi phục toàn bộ CSDL bằng Time Travel chỉ dùng khi có thảm hoạ, không nằm trong đường hoàn tác thường.

**Nội dung:**
1. **Cột mới trên `vc_trip_driver`:**
   - `refuse_reason_code TEXT REFERENCES vc_reason(code)`, CHECK theo G-A4-22;
   - `closed_by_party_id TEXT REFERENCES pty_party(id)`.
2. **Bảng mới `vc_refuse_deadline`:**
   - cột: `trip_id`, `driver_party_id`, `deadline_ms INTEGER NOT NULL`, `lead_minutes INTEGER NOT NULL`, WHO;
   - `PRIMARY KEY (trip_id, driver_party_id)`;
   - trigger `rd_no_delete`: mọi `DELETE` → RAISE `rd_`;
   - trigger `rd_only_decrease` (`BEFORE UPDATE`): RAISE `rd_` khi **không** thoả `NEW.deadline_ms < OLD.deadline_ms`, **hoặc** khi đổi `trip_id`, `driver_party_id`, `lead_minutes`. Câu cũ "chỉ cho đổi `updated_*`" bị bỏ, vì mâu thuẫn NT-5.
3. **Trigger hạn:**
   - `AFTER INSERT ON vc_trip_driver WHEN NEW.valid_to_at IS NULL`: `INSERT … SELECT … WHERE NOT EXISTS`, với `lead_minutes` theo G-A4-27;
   - `AFTER UPDATE OF planned_start_ms ON vc_trip`: đúng câu 0053:91, kèm `updated_at`/`updated_by` lấy từ NEW;
   - gieo hạn cho dòng lái đang mở (720 phút).
4. **Trigger trên dòng lái:**
   - B8.2: `BEFORE UPDATE ON vc_trip_driver WHEN NEW.close_reason='REFUSED' AND NEW.closed_by_party_id IS NOT OLD.driver_party_id` → `tc82_`;
   - B8.3: chuyến khác PLANNED, hoặc không có dòng hạn còn ≥ giờ hiện tại (G-A4-4) → `tc83_`;
   - B8.4: nhóm lý do Từ chối phải là `TU_CHOI_CHUYEN` → `tc84_`.
5. **Cột chính sách:**
   - `refuse_lead_minutes INTEGER NOT NULL DEFAULT 720 CHECK (BETWEEN 60 AND 2880)`;
   - `office_phone TEXT` có CHECK độ dài;
   - đây là lệch I43, ghi như 0071.
6. `DROP TRIGGER vc_unavailability_driver_closed;`
7. **Trigger báo bận:**
   - B9.2: `BEFORE INSERT ON vc_unavailability WHEN NEW.subject='DRIVER'`; chặn khi người đó có dòng lái mở trên chuyến PLANNED hoặc RUNNING chồng giờ → `unavailability_overlaps_driver_trip`.
   - B9.3: `BEFORE INSERT ON vc_trip_driver` và `BEFORE UPDATE OF planned_start_ms, planned_end_ms ON vc_trip`; chặn khi tài xế có khung DRIVER còn hiệu lực (`withdrawn_at IS NULL`, **không so giờ CSDL**) chồng giờ → `lc03_driver_unavailable: …`.
   - Thứ tự lô sửa chuyến (`dieu-phoi.ts:210` đóng dòng lái cũ trước, `:212` mở dòng mới sau) bảo đảm tài xế cũ không chặn tài xế mới.
8. **Seed `vc_reason`:** 4 dòng `TU_CHOI_CHUYEN`, 3 dòng `BAN_TAI_XE`.

**Cùng commit (mã):**
- `src/shared/dieu-phoi-kieu.ts:14` `NHOM_LY_DO` thêm `TU_CHOI_CHUYEN`, `BAN_TAI_XE`; `:16` `NHAN_NHOM_LY_DO` thêm nhãn "Tài xế từ chối chuyến", "Tài xế báo bận";
- `chinh-sach-hien-thi.ts:222` `TIEN_TO` (G-A4-11);
- `loiRangBuocKhungBan` (`khung-ban.ts:42-47`) thêm `unavailability_overlaps_driver_trip` → 409 `khung_ban_chong_chuyen_tai_xe_csdl`;
- `loiRangBuocChuyen` (`rules.ts`) thêm ánh xạ `tc8x_`, `rd_` (G-A4-25).
- Lý do: `dieu-phoi-kieu.test.ts:27-29` và typecheck của hai `Record<NhomLyDo,…>` sẽ đỏ nếu thiếu. Câu đọc của màn chính sách tự hiện nhóm có dòng hay không thì đo lúc thi công (`chinh-sach-hien-thi.ts:218`).

**Sau đó:**
- `docs/data-dictionary.json`: bảng mới, 4 cột mới, mô tả `vc_unavailability` nay mở DRIVER. Chạy `npm run dict`.
- `npm run db:migrate:local`.
- Bài đổi T2 ở §3.1.

### T3. Đọc hạn, mã đơn theo khung, tạo ô `trip.refuse` (DRIVER_PARTNER vẫn `none`)

- **Tệp mới** `src/modules/van-chuyen/han-tu-choi-repo.ts` (`defineSql`, EXPLAIN):
  - `HAN_CUA_CAP(trip, party)`;
  - `TU_CHOI_CUA_CHUYEN(trip)`: dòng REFUSED, nhãn lý do;
  - `SU_KIEN_TU_CHOI_THEO_YEU_CAU(requestId)` (G-A4-29).
- **`permissions.ts`:** thêm `"trip.refuse": row("none","none","none","none","none","any","none","none","none","none")`, theo §3.0 hàng T3.
- **`khungCuaNguoiGoi`** đọc hạn khi `can(staff, "trip.refuse", { assigned: true })`. Đây là chỗ máy chủ hỏi đầu tiên của ô.
- **Đổi hành vi ở T3**, chỉ siết: tài khoản Toàn quyền đang lái có vế hạn (G-A4-2). DRIVER và văn phòng không đổi. DRIVER_PARTNER chưa vào được route.
- **`tai-xe-dto.ts:37-81`** nhận thêm:
  - các khoá ở G-A4-17;
  - cờ `coVeHan`, để `suat[].maDon` vắng mặt khi `coVeHan && !trongKhung` (G-A4-7).
- **`contracts.ts:1550-1600`:** thêm các khoá trên (`GioVnDto` ở `:1191`); đổi `maDon` của suất tài xế thành `maDon?: string | null`. Giao diện `web/cuoc-chuyen.ts:291` đã lọc theo `s.maDon`, nên khoá vắng an toàn.
- **Bài đỏ:**
  - `tai-xe-dto.test.ts` gọi DTO trực tiếp với hạn và vế hạn (ca `maDon` vắng hoặc có);
  - `cuoc-cua-toi.test.ts`: tài xế công ty không đổi;
  - bài đổi T3 ở §3.1.

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
  - `trip.refuse` cột 9 → `"assigned"`;
  - chú thích `:68-69`;
  - chú thích cạnh `trip.refuse`: ô này cũng bật vế hạn của khung xem khách. Đóng ô cho DRIVER_PARTNER thì khung rộng ra; ADR nào đóng ô này phải xét lại khung (§6.1).
- **`tro-ly-cau-truc-ten.ts`:** sửa mô tả `trip.view`, `trip.progress` có nhắc tài xế đối tác, nếu mô tả hiện ghi "chỉ tài xế công ty".
- **`start-page.ts:34-35`:** `coCuocCuaToi` theo G-A4-5.
- **Bài đổi có tên:** §3.1 hàng T6.
- `cong-quyen.test.ts` giữ: DRIVER_PARTNER không thuộc office, orders, admin.
- `thongbao/index.ts:98` không đổi mã; giờ tài xế đối tác qua được.
- `bang-tin.test.ts:50-51`, `:74` giữ nguyên: DRIVER_PARTNER `can(trip.view)` không ngữ cảnh là `false`, nên không có nhãn `dieu-xe`.

### T7. Từ chối chuyến

- **Route** `POST /api/van-chuyen/cuoc-cua-toi/:id/tu-choi` (cổng `staff`), thân `{lyDo, requestId}`.
  - Thứ tự đúng G-A4-15.
  - Gọi `baoThayDoiChuyen` chỉ sau lô thành công; bài quét `bao-thay-doi-chuyen.test.ts:41` tự bắt.
  - Phản hồi 200 `{daTuChoi:true}`, không có dữ liệu chuyến.
  - Cổng thua → G-A4-25.
- **Lô `loTuChoi` trong `dieu-phoi.ts`** (thứ tự như `thu-tu-lo.test.ts`):
  1. cổng (G-A4-24);
  2. nhật ký `trip_driver_refused`;
  3. sự kiện `DRIVER_REFUSED` (`EVENT_INSERT` ghi `created_by = staff.id`);
  4. đóng dòng lái: `REFUSED`, `refuse_reason_code`, `closed_by_party_id = staff.partyId`, `closed_by = staff.id`.
- **Thêm vào:**
  - `LOAI_SU_KIEN_CHUYEN` (nối sau phần tử của Đ2);
  - `audit-actions.ts` (cạnh `:148`);
  - các số và bảng ở §3.1 hàng T7.
- **Tin:**
  - `tin-chuyen.ts` thêm vào `HANH_DONG_TIN_CHUYEN`.
  - `loaiCho` (`:55-70`): thêm nhánh sau `if (!can(n,"trip.view"))`: `trip_driver_refused && can(n,"trip.dispatch") → "tu_choi"`.
  - Câu: "Tài xế đã từ chối <mô tả chuyến> — cần xếp người khác"; liên kết `/chuyen?id=`.
  - Ngăn "Của tôi" (D8.4 bước 5), theo khuôn `gian_doan`. Không tên, không lý do, không mã đơn.
  - Bảng tin `nhanSuKienChuyen`: `dieu-xe` (D6.4).
- **Văn phòng:** DTO chi tiết chuyến (`dieu-phoi-dto.ts`, `dieu-phoi-route.ts`) thêm `tuChoi: {tenTaiXe, luc, lyDo?}[]` (G-A4-14).
- **Bài đỏ:**
  - `src/modules/van-chuyen/tu-choi.test.ts` cho NT-4 và NT-7. Theo §2 "Luật đồng hồ": `batDongHo(Date.now())`, `chuyenSan(w, { ngay: <hôm nay thật + 1> })`. Phần giá: đổi xe sang nhà xe khác qua lô sửa có sẵn.
  - Bài đua sát hạn (ngoại lệ có tên của luật đồng hồ) → 409, không 500.
  - Bài lệnh lặp: của chính mình → 200; người khác → 409 hoặc 404.
  - `tin-chuyen.test.ts` cho tin `tu_choi`.
  - `thu-tu-lo.test.ts` thêm mẫu `loTuChoi`.
  - Bài canh luật đồng hồ (§2).

### T8. Báo bận (tạo ô `unavailability.self` cùng commit)

- **`permissions.ts`:** thêm `"unavailability.self": row("none","none","none","none","none","any","none","none","own","none")`; `TEN_THAO_TAC` theo §3.0 hàng T8.
- **Route** (cổng `staff`, `can(staff, "unavailability.self", { ownerId: staff.id })`, luôn dùng `staff.partyId`; thứ tự 403 → 404 → 400):
  - `GET /api/van-chuyen/ban/cua-toi` → `{khung: KhungBanCuaToiDto[], lyDo: {code,nhan}[]}`;
  - `POST /api/van-chuyen/ban` với `{batDau, ketThuc, lyDo}` (G-A4-28), trả 201 với `kemLocation(…, "/ban")`;
  - `POST /api/van-chuyen/ban/:id/rut` với `{version}`; khung của người khác → 404.
- **Route văn phòng:** `GET /api/van-chuyen/ban-tai-xe?tu=&den=` (cổng `office`, `can(staff,"trip.dispatch")`) → `KhungBanTaiXeDto` (G-A4-19).
- **Kiểm thân:** mở rộng `kiemKhungBanMoi` (`khung-ban.ts:22-32`) theo `subject`: một hàm, hai hằng, chữ lý do đúng theo loại; với tài xế thì có vế "bắt đầu ≥ đầu phút hiện tại" (G-A4-10).
- `loiRangBuocKhungBan`: route đọc lại chuyến của chính người gọi cho thân 409 `khung_ban_chong_chuyen_tai_xe`. Trường hợp CSDL chặn sau khi máy chủ đã cho qua → `…_csdl` (đã thêm ở T2).
- Nhật ký theo G-A4-20. Không gửi tin (D9.4). Thêm vào `audit-actions.ts` (cạnh `:107-108`), `contracts.ts` (cạnh `:1206-1220`), và §3.1 hàng T8.
- **Bài đỏ:** `src/modules/van-chuyen/bao-ban-tai-xe.test.ts` cho NT-8.

### T9. Giao diện

- **`web/cuoc-chuyen.ts`** (giữ khung `veXuatBen`; dot-6:93-99):
  - dải hạn;
  - nút "Từ chối chuyến": hiện **chỉ khi `tuChoiDuoc`** (G-A4-16);
  - tấm Từ chối (`moBangTruot` + `nhomChon`, "Xác nhận từ chối" `vc-btn-danger`);
  - dải quá hạn và nút "Gọi văn phòng" (ẩn khi chưa có SĐT);
  - thẻ "Thấy danh sách khách từ …";
  - ánh xạ lỗi: 409 `stale` → dải A5; 409 `refuse_deadline_passed` → trạng thái A3; 409 `trip_not_planned` → đọc lại chi tiết;
  - chỗ đọc cờ `trongNgayChay` (`:448`, `:455`) giữ nguyên, nay mang nghĩa "trong khung" (G-A4-6).
- **Trang mới `/ban`:**
  - `public/ban.html`, `web/ban.ts` (dải hỏi lại ngay trong trang; `datetime-local` cỡ 16px; mặc định bắt đầu = phút hiện tại);
  - thêm `/ban` vào danh sách esbuild của `build:web` và vào `PAGES` (`sw-policy.ts:16` và `:25`).
- **`web/shell.ts`** (`:74`, `:76`, `:290-291`, `:535`): tab và mục "Báo bận của tôi" theo G-A4-16. Kiểm bản nhớ khung (ADR-0035) có đủ cờ.
- **`web/tai-xe.ts:21-22`:** bỏ câu "Cuốc xe của bạn sẽ hiện ở đây".
- **`web/dieu-phoi.ts`:** dải "Tài xế bận", chỉ khi `can(staff,"trip.dispatch")` (ô `any` của văn phòng; không ngữ cảnh là đúng ở đây), ẩn khi rỗng.
- **`web/chuyen-sua.ts`:** nhãn "Bận" ở ô chọn tài xế và câu chặn C4.
- **Kịch bản Chrome** (`docs/evidence/2026-09-29-adr-0049/kich-ban/`), 390 px và 1040 px, theo thứ tự Tài xế đối tác → Bán hàng → Kế toán:
  - sửa `tai-xe-doi-tac-smoke`, `cuoc-smoke`, `tai-xe-trang-dau`, `dieu-phoi-smoke`, `chuyen-sua-smoke`, `chinh-sach-dieu-phoi-smoke`;
  - tạo mới `ban-smoke.mjs`.

### T10. Hướng dẫn

- **`src/shared/huong-dan-tai-xe.ts`:**
  - viết lại `:12-13`, câu menu `:22`, và mục "Tài xế nhà xe đối tác" `:75-82`: cuốc của tôi, hạn Từ chối, Báo bận, Gọi văn phòng, "thấy tên khách và mã đơn từ …";
  - các nhãn `[[Từ chối chuyến]]`, `[[Xác nhận từ chối]]`, `[[Báo bận của tôi]]`, `[[Lưu khung bận]]`, `[[Rút khung bận]]`, `[[Gọi văn phòng]]` phải có nguyên chuỗi trong mã giao diện;
  - quỹ: nhóm tài xế 1034 chữ, trần 3150 (Phần chung 9 phút + nhóm ≤ 30, `huong-dan.test.ts:76-77`).
- **Phần chung, Bán hàng, Quản trị: không thêm chữ.**
  - Đo theo đơn vị của bài (`phutDoc`, làm tròn lên): Phần chung 1349/1350, Bán hàng 3142/3150, Quản trị 3130/3150. Thêm 1 chữ vào Phần chung là đỏ mọi nhóm. Đo lại sau Đ1.
  - Số "4497/4500" của bản đầu là sai đơn vị, đã bỏ.
  - Dải "Tài xế bận", nhãn "Bận", tin "tài xế đã từ chối" của văn phòng không có chữ trong Trợ giúp. **Chấp nhận**, vì chữ trên màn tự giải thích; nêu ở báo cáo cuối (T13), không thành câu hỏi.

### T11. Bất biến và tài liệu

- **`scripts/audit-checks.mjs`**, số `R-VC-*` kế tiếp lúc thi công:
  - dòng `REFUSED` có người đóng ≠ tài xế;
  - `REFUSED` sau giờ xuất bến thật;
  - khung DRIVER còn hiệu lực chồng chuyến chưa huỷ đang xếp cho người đó;
  - dòng lái mở mà thiếu dòng hạn;
  - mức warn: chuyến trong 48 giờ tới chưa có tài xế.
- Bài ở `src/audit-invariants.test.ts`.
- **Tài liệu:**
  - `docs/SYSTEM-DESIGN.md` (van-chuyen): tài xế đối tác, khung (mã đơn trong khung), Từ chối, Báo bận.
  - **`docs/SYSTEM-DESIGN.md` §16, ba dòng lệch có chủ ý** (CLAUDE.md §2):
    1. ADR-0053:46 ghi "`trip.passenger.add` … chỉ mở nếu A-1b đã duyệt" (A-1b đã duyệt), nhưng mã giữ DRIVER_PARTNER `none` theo lời chủ 5/10 (a) "chỉ tài xế công ty" (`2026-10-05-van-chuyen-dot-5-nhat-ky.md:105-108`; `src/tai-xe-cong.test.ts:104`). Hướng thu hẹp.
    2. ADR-0053 D7.1, D7.4, tiêu chí 9: ô `trip.transfer` và nhờ đón chéo chưa có, chờ A5; tiêu chí 9 chưa đạt.
    3. ADR-0053 tiêu chí 1 "9 ô": mã có 8 ô (thiếu hai ô trên, thêm `assistant.ask`).

    Cả ba trình chủ để ra dòng lịch sử hoặc ADR mới; không sửa ADR.
  - `docs/CHANGE-GUIDE.md` công thức y (0053:209).
  - `docs/BACKLOG.md`: BL-VC-D6 ghi phần A4 xong, chia doanh thu vẫn hoãn; thêm dòng mới cho C25 phần tài xế công ty, và cho taxi qua cổng THIEU_GIA (e–h).
  - Các dòng `docs/SO-HANG-RAO.md` ở §4.

### T12. E2E

- Tạo `tests/e2e/tu-choi-bao-ban.mjs` (đăng ký trong `run.mjs`): NT-4, NT-7, NT-8, NT-11, NT-14 trên D1 local. Giờ chuyến gieo tương đối giờ thật.
- Sửa `tai-xe-cuoc.mjs` và `tai-xe-doi-tac.mjs` (T6).
- Chạy lại `khung-ban-xe.mjs` (`:144`).

### T13. Kiểm cuối và báo cáo cho chủ

- Chạy toàn bộ NT-16.
- Người kiểm độc lập chỉ đọc theo ba góc: quyền, dữ liệu khách (gồm mã đơn), lớp CSDL.
- **Việc trước phát hành:** điều phối soạn một lệnh đếm **chỉ đọc** số tài khoản tài xế đối tác đang hoạt động trên production. Lệnh chỉ dùng `SELECT COUNT`; tên bảng đo lúc soạn. **Chủ chạy** lệnh này. Kết quả ghi vào báo cáo.
- **Mục báo chủ** trong báo cáo cuối. Đây không phải hộp hỏi; viết lời thường, xưng "bạn":
  1. **Pháp lý:** "Trước khi báo cho nhà xe dùng, bạn nên cho một người hiểu luật xem việc đưa danh sách tên khách cho tài xế nhà xe ngoài công ty có ổn không. Quyết định bạn duyệt ngày 30/9 vẫn ghi chỗ này là 'chưa ai kiểm'. Ngoài ra, bạn tự thử bằng một tài khoản tài xế nhà xe thật trên iPhone, rồi mới báo nhà xe."
  2. **Số tài khoản:** "Quyền mới có hiệu lực ngay khi bản này lên. Hiện có <N> tài khoản tài xế nhà xe đang hoạt động (số bạn đếm bằng lệnh chỉ đọc)."
  3. **Giá chuyến xe thuê:** "Mọi chuyến tài xế nhà xe lái là xe thuê. Chuyến chưa có giá thì nút Xuất bến bị khoá tới khi Quản trị hoặc Kế toán nhập giá."
  4. **Tài khoản thử:** "Bạn tạo tài khoản thử sau khi qua thời gian chờ chắc chắn không quay về bản cũ, không tạo trong lúc đó."
  5. **Chưa làm:** nhờ đón chéo giữa xe công ty và xe nhà xe để đợt sau; tài xế công ty chưa có Báo bận; chia doanh thu taxi vẫn hoãn.
  6. **Hướng dẫn văn phòng:** "Dải 'Tài xế bận', nhãn 'Bận' và tin 'tài xế đã từ chối' chưa có chữ trong Trợ giúp, vì phần Trợ giúp của Bán hàng và Quản trị đã đầy (30 phút đọc). Muốn thêm thì cần nới mức này, là việc riêng."
- Báo cáo ghi thêm cho điều phối:
  - điều chưa chắc (§6.4);
  - NT-9 hoãn sang A5;
  - ba dòng §16.

---

## 4. Hàng rào (mỗi rào phải thấy chặn thật: sửa cố ý → đỏ → hoàn nguyên; ghi ngày vào `docs/SO-HANG-RAO.md`)

| Hàng rào | Sửa cố ý để thấy đỏ | Dòng SO-HANG-RAO |
|---|---|---|
| Ghim hàng DRIVER_PARTNER (7 ô ở T6, 8 ô ở T8); cột DRIVER của hai ô mới = none | Đặt DRIVER_PARTNER `trip.dispatch="assigned"` | **Nới có tên** `:143` (ADR-0053:49, Điều 9.4) |
| `homeRedirect` / `coCuocCuaToi` theo MATRIX | Đổi sang `can(…,{assigned:true})` → SALES có Cuốc | **Nới** `:149` (0053:200) |
| Bảng route tài xế (`tai-xe-cong.test.ts`) | Thêm DRIVER_PARTNER vào `OFFICE_GATE` | **Nới** `:150`, `:158` |
| Khung xem khách (GET, chín lệnh, `maDon`, chỉ đường) | Đổi "và" thành "hoặc" trong `trongKhungXemKhach`; đổi `>` thành `>=`; bỏ điều kiện khung của `maDon` | mới (siết `maDon`) |
| Một hàm khung (bài quét) | Thêm `trongNgayChay(` vào một route | mới (thay vai trò `:215`) |
| B8.2, B8.3, B8.4, hạn chỉ giảm, khoá cột hạn, không xoá hạn | Bỏ từng trigger trên CSDL thử → bài SQL đỏ | mới; ghi ngoại lệ "giờ CSDL" |
| Ánh xạ RAISE `tc8x_`, `rd_` | Bỏ dòng ánh xạ → bài đua sát hạn trả 500 → đỏ | mới |
| Lệnh lặp Từ chối chỉ của chính người bấm | Bỏ so `created_by` → bài "người khác dùng lại requestId" đỏ | mới |
| Luật đồng hồ bài Từ chối | Gọi `batDongHo()` không tham số trong `tu-choi.test.ts` → bài canh đỏ | mới |
| B9.2, B9.3 | Bỏ trigger trên CSDL thử | mới; **nới có tên** `:376` (bỏ `driver_closed`: 0053:137) |
| Lịch chung chỉ VEHICLE; Kế toán 403 ở `ban-tai-xe`; DTO văn phòng không lý do bận | Cho `khungBanVao` đọc DRIVER; thêm `lyDo` vào DTO | `:381`, `:385` giữ, thêm vế 6.2 |
| Tin `tu_choi` chỉ tới `trip.dispatch` | Đổi điều kiện thành `can(n,"trip.view")` | mới |
| Tài xế đối tác nhận tin chuyến của mình; câu tin không mã đơn | (bài D7.5) | **Nới có tên** `:345` (0053:79) |
| Không lộ (`hanh-khach-khong-lo-ten.test.ts`): regex `:172` thêm `ban\|ban-tai-xe`; ca DRIVER_PARTNER trong và ngoài khung; bỏ UUID trước khi quét `\d{8,}` (`:636`); miễn có tên `sdtVanPhong`; `giay-to-khong-lo-so.test.ts` thêm route mới | Đưa `maDon` vào phản hồi lệnh xuất bến ngoài khung | `:239`, `:248` (siết thêm) |
| Khoá DTO tài xế (`tai-xe-dto.test.ts` `KHOA_GOC`, `KHOA_SUAT`, `CAM_KHOA`) | Thêm khoá `sdtNguoiLap` vào DTO | **Nới có tên** (G-A4-17; §3.1) |
| H7 `Location` cho `POST /ban`; H2 đếm route ghi | Bỏ `kemLocation` | giữ |
| Nhật ký chính sách không chứa chữ số SĐT | Ghi `office_phone` thô | mới |
| `tu-choi` trả 403/404 theo G-A4-15 | Bỏ nhánh Toàn quyền → 404 | mới |

**Nới có tên:** chỉ những dòng ghi "Nới" ở trên và các dòng loại "Nới có tên" ở §3.1. Căn cứ: ADR-0053 đã duyệt (Điều 9.4), ADR-0053 D8.6, lời chủ 6.3 và bản vẽ dot-6 đã duyệt 2/10. Không nới thêm gì khác. Dòng "Cơ học" ở §3.1 là đếm hoặc bảng tham chiếu, không đổi luật.

**Sổ dừng dây chuyền `docs/quyen-hoan.json`.** A4 không xây trên lỗ đang hở nào:
- TNV-G1, TNV-G3, TNV-G4: sổ tiền đơn; A4 không chạm.
- **HC-4.2** (bút toán điều chỉnh chưa có người duyệt khác người tạo): **A4 không thêm đường ghi tiền mới, chỉ dùng lô ADR-0057 sẵn có** khi văn phòng giao lại chuyến cho xe hoặc nhà xe khác (đảo và chụp giá tự động). Không có bút toán điều chỉnh nào do A4 tạo.
- HC-5.11: định danh của Cron; A4 không có Cron.
- HC-5.19: diễn tập khôi phục. Đường hoàn tác của A4 là migration mới cộng Worker cũ, không dựa vào Time Travel.
- Mục hoãn `task.progress`, `dispatch.guides.view`, `invoice.*`: A4 không thêm. A4 cũng không thêm mục hoãn ô nào (§3.0).

Vì vậy không gắn nhãn "xây trên lỗ đang hở".

---

## 5. Trang ghép

### 5.1 Bảng ↔ loại thực thể

| Bảng | Chứa | Đổi ở A4 |
|---|---|---|
| `vc_unavailability` | Khung bận **VEHICLE** (có từ 0071) và **DRIVER** (mở mới), phân biệt bằng `subject` | Bỏ trigger chặn DRIVER; thêm B9.2, B9.3 |
| `vc_trip_driver` | Dòng lái của tài xế công ty và tài xế đối tác trong **cùng bảng**. Loại tài xế không phân bằng cột mà bằng quyền của tài khoản gắn hồ sơ | Thêm `refuse_reason_code`, `closed_by_party_id`; `REFUSED` chỉ do chính tài xế đóng (B8.2) |
| `vc_refuse_deadline` | **Mọi** cặp (tài xế, chuyến), cả công ty lẫn đối tác | Mới; chỉ được đọc khi người gọi có `trip.refuse` với `{assigned:true}` |
| `vc_trip_event` | Thêm loại `DRIVER_REFUSED`; `created_by` dùng để so lệnh lặp | Câu đọc riêng (G-A4-29) |
| `vc_reason` | Thêm nhóm `TU_CHOI_CHUYEN`, `BAN_TAI_XE` | Seed |
| `vc_dispatch_policy` | Thêm `refuse_lead_minutes`, `office_phone` | Cột mới |
| `audit_log` | `trip_driver_refused`, `driver_unavailability_added`, `driver_unavailability_withdrawn` | Không có tên, SĐT, lý do bận |
| Tin chuyến | Loại `tu_choi` | Mới |

### 5.2 Dòng bản đồ quyền ↔ loại thực thể

| Ô | Cột | Áp cho |
|---|---|---|
| `trip.view` | SALES, ACCOUNTING, ADMIN, SUPER_ADMIN `any`; DRIVER, **DRIVER_PARTNER** `assigned` | Chuyến và DTO tài xế. `assigned` = có dòng lái mở theo `partyId`. Với người có vế hạn, khách **và mã đơn** chỉ hiện trong khung D7.2 |
| `trip.progress` | Như trên, trừ ACCOUNTING `none` | Chín lệnh tiến độ |
| `trip.refuse` (mới) | Tạo ở T3: DRIVER_PARTNER `none`. Từ T6: DRIVER_PARTNER `assigned`. SUPER_ADMIN `any` (route vẫn đòi đang lái) | Đóng dòng lái `REFUSED`; **bật vế hạn của khung và mã đơn** |
| `unavailability.self` (mới, T8) | DRIVER_PARTNER `own`; SUPER_ADMIN `any` | Khung DRIVER của hồ sơ người gọi |
| `trip.dispatch` | SALES, ADMIN, SUPER_ADMIN | Đọc khung DRIVER (`ban-tai-xe`), nhận tin `tu_choi`, thấy lý do Từ chối |
| `trip.view` any mà không có `trip.dispatch` | ACCOUNTING | Chỉ khung VEHICLE trên lịch; thấy "đã từ chối" không lý do; nhận nhãn Bảng tin `dieu-xe` (chỉ id và loại) |
| `trip.passenger.add` | DRIVER `assigned`; DRIVER_PARTNER **none** (lệch có chủ ý, §16) | Không đổi |
| `settings.ops` | SUPER_ADMIN | `refuse_lead_minutes`, SĐT văn phòng |
| `admin.manage` | ADMIN, SUPER_ADMIN | Dòng `vc_reason` của hai nhóm mới |

### 5.3 Cổng ↔ cửa (gồm cả ẩn/hiện ở giao diện)

| Cổng | Cửa | Giao diện |
|---|---|---|
| `staff` | `cuoc-cua-toi*`, `…/tu-choi`, `/ban*`, `/tai-xe` | • Tab Cuốc theo `coCuocCuaToi` (G-A4-5).<br>• Tab Báo bận khi `chiTaiXe && can(staff,"unavailability.self",{ownerId: staff.id})`.<br>• Nút Từ chối chỉ theo cờ máy chủ `tuChoiDuoc`.<br>• Nút Gọi văn phòng khi có `sdtVanPhong`.<br>• Cờ `trongNgayChay` (nghĩa: trong khung) được đọc ở `web/cuoc-chuyen.ts:448,455` (dòng điều kiện bổ sung tên) và `src/shared/xe-dang-chay-man.ts:140-144` (khối "Suất của khách"). Cả hai còn đòi `coBoSungTen` (ô `trip.passenger.add`), nên với tài xế đối tác không hiện gì mới. |
| `office` | `ban-tai-xe` (`trip.dispatch`), chi tiết chuyến, chính sách (`settings.ops`) | Dải "Tài xế bận" và nhãn "Bận" chỉ khi `can(staff,"trip.dispatch")` |
| `orders`, `admin`, `accounts` | DRIVER_PARTNER **không bao giờ** vào (`ADMIN_GATE :275`, `OFFICE_GATE :286`, `ORDERS_GATE :291`; LC-1b) | Không có mục |
| CSDL | B8.2–B8.4, hạn chỉ giảm, B9.2–B9.4, LC-1/LC-1b | — |

Giao diện chỉ ẩn hoặc hiện; máy chủ luôn kiểm lại.

---

## 6. Rủi ro, chỗ giao, thứ tự phát hành, điều chưa chắc

### 6.1 Rủi ro

- **Cửa một chiều: mã đơn và tên khách cho người ngoài.** Chỗ khung thật sự quyết lộ dữ liệu:
  - tên và liên hệ: GET chi tiết (`index.ts:1477-1482`);
  - `maDon` và chuỗi đích chỉ đường: GET chi tiết **và** phản hồi chín lệnh tiến độ.

  Phản hồi lệnh không bao giờ có tên (`index.ts:1509`). Giảm rủi ro bằng: T1 đi đầu, NT-3 kiểm toàn văn phản hồi, người kiểm độc lập.
- **Vế hạn gắn với ô `trip.refuse`.** Nếu sau này đóng ô Từ chối của tài xế đối tác, vế hạn mất và khung **rộng ra** (thấy khách từ 00:00 ngày chạy). Chú thích cạnh ô (T6) nói rõ; mọi ADR đóng ô này phải xét lại khung.
- **Mọi chuyến của tài xế đối tác là xe thuê**, nên vướng cổng `THIEU_GIA` (`ly-do-giu.ts:62`): Xuất bến bị chặn tới khi Quản trị hoặc Kế toán có giá (giá bảng tuyến + cỡ, hoặc giá thoả thuận). Taxi đối tác còn vướng thêm điểm e chưa trả lời: trước khi báo taxi dùng phải có ADR sổ chia doanh thu. Báo chủ ở T13.
- **Pháp lý chưa kiểm** (0053:271-276). Số tài xế đối tác thật và nhà xe nào dùng chưa biết; đếm chỉ-đọc trước phát hành (T13).
- **Bài thử phụ thuộc giờ thật** (B8.3): theo §2 "Luật đồng hồ"; có bài canh.
- **Hoàn tác:**
  - Worker cũ chạy trên CSDL đã có migration A4 vẫn an toàn: mã cũ không ghi REFUSED hay khung DRIVER; trigger hạn chỉ thêm dòng; B9.3 có tiền tố `lc03_`.
  - Cần bỏ trigger thì dùng migration mới (T2).
  - Tài khoản thử tạo ngoài cửa sổ đóng băng (`docs/HANDOFF-N1.md:389, :475`).

### 6.2 Chỗ giao

- **Đ1** (nhánh `adr-0104-d1` @ `45731dea`, chưa gộp, hơn `claude/van-chuyen-goi-a-c` 12 commit; không có migration):
  - `permissions.ts`: thêm `trip.urgent_adjust`, DRIVER_PARTNER `none`;
  - `permissions.test.ts`: ghim DRIVER, DRIVER_PARTNER, HR;
  - `tin-chuyen.ts`: `khan_cap` nằm trong nhánh tài xế, nên sau A4 tài xế đối tác cũng nhận; đúng D7.5; nới các bài "không nhận" của Đ1;
  - `dieu-phoi-lenh.ts` `lenhSuaChuyen` (T4), `dieu-phoi-kiem.ts`, `chinh-sach.ts`, `chuyen-repo.ts`, `contracts.ts`, `thongbao/index.ts`, `huong-dan-ban-hang.ts`, `huong-dan-quan-tri.ts` (đo lại quỹ chữ);
  - đổi tài xế hoặc giờ khẩn cấp: hạn tự đúng nhờ trigger;
  - ADR-0104:101 (duyệt đề nghị leo thang) thuộc A5.
- **Đ2** (migration 0089):
  - `trip_order_synced` cũng tới tài xế đối tác (D7.5), câu tin không có mã đơn (NT-14);
  - Đ2 **không** đổi `planned_start_ms` của chuyến (ADR-0104 Đ2 `:121-186`). Trigger hạn vẫn đúng với mọi đường đổi giờ khác (sửa chuyến, Đ1);
  - chung tệp `dieu-phoi-kieu.ts`, `thu-tu-lo.test.ts`, `tin-chuyen.ts`: A4 nối sau phần tử của Đ2.
- **ADR-0105** (migration 0090, gộp trước A4):
  - khoá `diaChiChiDuong` trong `tai-xe-dto.ts` đi theo cờ khung; T1 chuyển chỗ gọi của ADR-0105 sang hàm khung;
  - NT-3 kiểm chuỗi đích ở GET và phản hồi lệnh;
  - chung `web/cuoc-chuyen.ts`.
- **ADR-0109** (phải thu không âm; **không có migration**): chỉ chạm orders và sổ tiền, không chung tệp mã. Xung đột nếu có chỉ là chữ ở `SYSTEM-DESIGN` / data-dictionary.
- **G17** (báo tài xế khi `PUT /trip`): sau A4 tài xế đối tác cũng nhận; nếu có bài ghim thì nới theo D7.5. Câu tin không có mã đơn.
- **A5:**
  - ô `trip.transfer`: cột DRIVER_PARTNER = `assigned`, ghim lên 9 ô trong cùng commit tạo ô;
  - dòng lái do cứu hộ tạo tự có hạn (trigger);
  - chung `cuoc-chuyen.ts`, `shell.ts` (thanh tab: Trang chủ · Cuốc · Đề nghị · Báo bận · Tôi), `permissions.ts`, `tai-xe-cong.test.ts`, `lenh-lap-quet.test.ts`;
  - số migration tạm 0092 (§6.3).
- **Đối chiếu dòng:** phiếu đã khớp các `tệp:dòng` của bản đầu (`permissions.ts:187,193,197`; `index.ts:1477-1704`, 11 chỗ; `dieu-phoi.ts:171,210,212`; `dieu-phoi-kiem.ts:139`; `ly-do-giu.ts:62`; `SO-HANG-RAO:143,149,150,376,381,385`). Đo lại sau khi Đ1, Đ2, ADR-0105, G17 gộp.

### 6.3 Thứ tự phát hành (điều phối đã chốt)

1. Đ1 gộp (`adr-0104-d1` @ `45731dea`).
2. Đ2 (giữ 0089).
3. ADR-0105 (giữ 0090) và ADR-0109 (không có migration).
4. G17.
5. **A4** và A5.

A4 là một lần phát hành: migration chỉ thêm; bỏ `driver_closed` an toàn vì mã cũ không có đường ghi DRIVER. Không cần tách hai lần (expand–contract). **Trước phát hành:** chủ chạy lệnh đếm chỉ-đọc (T13).

**Số migration:** A4 tạm **0091**, A5 tạm **0092**; chốt khi gộp.
- Lệnh quét, chạy lại trước khi gộp:
  ```
  for r in $(git for-each-ref --format='%(refname)' refs/heads refs/remotes); do
    git ls-tree --name-only "$r" migrations/ | sed -n 's#migrations/\([0-9]\{4\}\)_.*#\1#p' | sort | tail -1 | sed "s#\$# $r#"
  done | sort -r
  ```
- Kết quả 2026-10-08:
  - lớn nhất có tệp là `0088` (`claude/ticket-sales-qr-payment-cf8e18`, VietQR);
  - `0086` ở `claude/van-chuyen-goi-a-c`, `adr-0104-d1` và các nhánh A;
  - `main` và `origin/main` dừng ở `0083`;
  - 0089 (Đ2) và 0090 (ADR-0105) mới là số dự kiến, chưa có tệp.
- Bên gộp sau tự đổi tên tệp (README, luật 1.46).

### 6.4 Điều chưa chắc

- Kết quả T0 (a) đến (d); riêng (a) trên D1 local quyết có hỏi câu dự phòng hay không.
- Tên thật của cờ và hàm sau khi Đ1, Đ2, ADR-0105 gộp; dòng sẽ dời.
- Quỹ chữ hướng dẫn sau Đ1 (Phần chung còn 1 chữ).
- Câu đọc của màn chính sách có tự hiện nhóm lý do mới không (`chinh-sach-hien-thi.ts:218`).
- Số đếm route sau khi Đ1, Đ2, ADR-0105, G17 thêm route (`route-access` 213, H2 156, `lenh-lap-quet` 31 là số hôm nay).

Đã đóng so với bản đầu:
- Ô `assistant.ask` = `any` ở mọi cột, đã đo.
- Ngăn tin `tu_choi` là "Của tôi", theo D8.4 bước 5.
- `traLenhLap` không so người bấm: đã xác nhận, giải bằng G-A4-15 và G-A4-29.
- Cách đọc mã đơn: theo chữ ADR (G-A4-7).

---

### Critical Files for Implementation
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/modules/van-chuyen/index.ts
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/shared/permissions.ts
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/modules/van-chuyen/tai-xe-dto.ts
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/shared/dieu-phoi-kiem.ts
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/migrations/0071_khung_ban_gio_lai.sql (mẫu cho migration mới, số tạm 0091; chốt khi gộp)