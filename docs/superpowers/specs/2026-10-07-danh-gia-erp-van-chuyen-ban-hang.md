# Đánh giá ERP phân hệ Vận chuyển và Bán hàng theo ba trục vận tải và triết lý Oracle (2026-10-07)

> **Hồ sơ có ngày, đóng băng khi viết xong**, không sửa cho khớp hiện trạng về sau. Có gì mới thì viết bản mới trỏ về bản này.
> **Vai:** kiểm, gồm chỉ đọc mã và chạy thử trên dữ liệu tạm; không thi công, không chạm production.
> **Mã được kiểm:** `main` = HEAD `4d98a205`.
> **Cách làm** gồm ba vòng trợ lý, có điều phối tự kiểm lại các điểm chính:
> - 5 người đọc mã, mỗi người một trục.
> - 4 người chạy tình huống thật trên khung thử toàn ứng dụng (`tests/audit/harness.mjs`, SQLite thật, đồng hồ giả) và chụp màn hình bằng Chrome trên D1 tạm.
> - 6 người kiểm phản biện: mỗi phát hiện bị cố bác bỏ trên mã HEAD và chạy lại bài thử trước khi được giữ.
>
> **Bằng chứng** nằm ở `docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/`:
> - `du-lieu/verify.json`: kết quả cuối. Mã `Cxx` trong bản này trỏ vào đây.
> - `du-lieu/map.json`, `du-lieu/scen.json`: kết quả đọc mã và kết quả chạy thử.
> - `kich-ban/`: bài thử, chạy lại được.
> - `anh/`: ảnh màn hình.
>
> **Thay cho hai bản rà soát 1/10 đã lạc hậu** (`2026-10-01-ra-soat-phan-he-van-chuyen.md`, `2026-10-01-danh-gia-luong-xe-chay.md`). Hai bản đó giữ nguyên, không sửa.
> **Giới hạn:** xem Phần 8 (chưa thử iPhone thật, chưa chạy axe, không biết giá trị chính sách trên production, pháp lý chưa có luật sư).

---

## Phần 1 — Cho chủ dự án (đọc trang này là đủ)

### Kết luận

Phần lõi của phân hệ Vận chuyển được xây đúng tư duy ERP. Nhu cầu đưa đón được suy ra từ đơn hàng, và chuyến xe được tách khỏi nhu cầu. Kết quả tại điểm dừng được ghi theo từng khách. Sức chứa, trùng giờ, giấy tờ xe và bằng lái đều được máy giữ ở hai, ba lớp. Mọi lệnh đều chống bấm trùng.

Hai yêu cầu của bạn được đáp ứng như sau, theo kết quả chạy thật trên dữ liệu tạm:
- **Yêu cầu (1), ghép khách:** làm được bằng tay. Điều phối ghép 10 đơn ở 10 khách sạn vào 2 xe. Tài xế thấy điểm đón, giờ hẹn, số khách và tên khách, rồi bấm "Đã đón / Vắng / Khách đã huỷ" cho từng người cho tới điểm trả cuối.
- **Yêu cầu (2), chuyến riêng:** làm được. Cờ "Xe riêng" chặn ghép khách khác vào cùng xe.

Tuy vậy có bốn chỗ gãy lớn, và một chỗ gãy về quản trị:

1. **Pháp lý.** Kiểu chạy "ghép khách nhiều đơn, lịch chạy định sẵn" trên xe hợp đồng trùng với hành vi mà nghị định cấm và có mức phạt riêng từ 15/8/2026. Chở "C + 2" cũng bị phạt theo từng người vượt. Chi tiết ở mục cảnh báo bên dưới.
2. **Thay đổi sát giờ bị khoá.** Trong 6 giờ trước giờ xe chạy (giá trị gieo sẵn), Bán hàng không tự thêm, bớt hay xếp lại khách được, mà phải nhờ Quản trị hoặc Toàn quyền. Một đơn bị huỷ trong khoảng đó làm cả xe ghép không xuất bến được cho tới khi có Quản trị. Thay đổi trên đơn cũng không tự chảy sang chuyến: chuyến chỉ bị "giữ" và chờ người xử lý tay.
3. **Chưa có tầng lập kế hoạch.** Không có chuyến lên lịch sẵn, không có chuyện máy biết "xe rảnh từ mấy giờ", không có mở chuyến tự động hay bán tự động. Mỗi chuyến phải chọn ngay một xe và một tài xế cụ thể. Xe quay đầu ở cảng còn bị tính như tài xế cần nghỉ 30 phút. "C + 2" thì máy chặn cứng ở đúng số chỗ.
4. **Chưa sửa sai được ngoài hiện trường.** Tài xế bấm nhầm "Khách đã huỷ" hay "Đã đón" thì không ai sửa được. Khách đã bị bấm "Vắng" không xếp sang xe khác được. Khi mất mạng, màn tài xế có thể trắng trơn, mất cả danh sách điểm và số điện thoại.
5. **Quản trị.** Bảy văn bản quyết định đã duyệt còn phần chưa thi công: ADR-0007 và ADR-0014 (văn phòng sửa số khách), ADR-0052 (chuyển khách giữa hai xe, cứu hộ có nơi gặp, tin cho tài xế), ADR-0053 (tài xế đối tác), ADR-0062 (tin khi đơn đổi), ADR-0096 (thứ tự đón trước trả, cửa sổ xuất bến), ADR-0097 (sửa sai có lý do). Trong khi đó phân hệ đã được đóng sổ ngày 5/10. Theo luật dự án, văn bản đã duyệt thắng mã, nên đây là mã còn thiếu chứ không phải tính năng tuỳ chọn.

### Cảnh báo pháp lý (nói một lần — Hiến pháp P18)

Bản hợp nhất Nghị định 158/2024 (số 58/VBHN-BXD, đã gồm phần sửa của NĐ 218/2026, hiệu lực 10/8/2026) có ba quy định liên quan, ở Điều 7:
- Khoản 4 điểm a cấm đơn vị chạy xe hợp đồng xác nhận chỗ cho từng khách, và cấm ấn định lịch trình cố định cho nhiều người thuê khác nhau.
- Khoản 4 điểm b cấm lái xe gom khách ngoài danh sách đính kèm hợp đồng.
- Khoản 3 bắt xe từ 8 chỗ (không kể chỗ lái) phải có hợp đồng thuê cả chuyến.

Nghị định 238/2026 (hiệu lực 15/8/2026) thêm mức phạt 20–24 triệu đồng với tổ chức có đúng các hành vi đó.

Về chở quá số người, NĐ 168/2024 có hai mức phạt và không ghi mức dung sai nào:
- Điều 20 khoản 2 phạt người lái 400–600 nghìn đồng cho mỗi người vượt.
- Điều 32 khoản 5 phạt chủ xe là tổ chức 1,6–2,4 triệu đồng cho mỗi người vượt.

Nền tảng hiện cho ghép khách nhiều đơn lên một xe và không hỏi hợp đồng vận tải nào: công tắc "phải có hợp đồng" bị khoá ở 0. Các câu luật này áp vào mô hình của Tour Đảo ra sao, kể cả khi công ty thuê cả xe của nhà xe, thì **cần luật sư hoặc Sở Xây dựng Khánh Hoà xác nhận**. Bản này chỉ trích văn bản, không kết luận Tour Đảo đang vi phạm. Nguồn: Phụ lục B; chi tiết ở C70 và C71.

### Ba việc cần bạn quyết

1. **Hỏi luật sư trước khi chạy chuyến ghép thật và trước khi xây "lịch chuyến định sẵn"** (khuyến nghị: làm ngay). Một lượt hỏi gồm bốn câu:
   - ghép khách nhiều đơn trên xe hợp đồng;
   - thuê cả xe nhà xe rồi đưa danh sách khách;
   - em bé ngồi lòng có tính chỗ không, tức "+2" là gì;
   - bảng hạng bằng lái.

   Có câu trả lời rồi mới quyết C+2 và việc mở hợp đồng vận tải theo chuyến.
2. **Có mở lại phân hệ Vận chuyển để làm phần đã duyệt mà chưa làm không** (khuyến nghị: có, theo thứ tự sau):
   - sửa màn tài xế bị trắng khi mất mạng (việc nhỏ, không cần văn bản mới);
   - làm ADR-0097 và ADR-0096 (sửa sai có lý do; đón trước trả);
   - làm đường văn phòng sửa số khách (ADR-0007/0014; thiết kế nằm ở đề xuất ADR-0063 đang chờ duyệt).

   Xem Gói A và C1 ở Phần 7.
3. **Nới chuyện khoá sát giờ theo hướng nào** (khuyến nghị: phương án b, dùng a làm cách tạm):
   - (a) Toàn quyền hạ con số mốc ở màn "Chính sách điều phối". Làm được ngay, không cần mã. Đổi lại: con số áp cho cả lúc đặt đơn lẫn lúc xếp xe, và các chuyến đã tạo trước vẫn giữ số phút nghỉ cũ (phát hiện N3).
   - (b) Văn bản mới cho ba việc: lệnh máy "đồng bộ chuyến theo đơn" (tự rút khách khi đơn huỷ hay bớt người, không cần phá lệ vì máy làm theo đơn); tách mốc khoá xếp xe khỏi mốc đặt đơn; nút "Xin phá lệ" gửi tin cho Quản trị.

---

## Phần 2 — Chấm theo ba trục và theo Oracle

| Trục | Làm đúng (có bằng chứng ở Phần 6) | Gãy chính (mã ở Phần 4) | Đánh giá |
|---|---|---|---|
| **Nhu cầu khách hàng** (đơn → chặng đưa đón) | Chặng `ord_transfer_leg` là đơn vị nhu cầu, suy ra từ đơn. Số người tính ở một hàm (`soNguoiChang`). Chặng có danh tính bền, không xoá cứng. Đặt gấp có lý do, có dấu vết. Giờ hẹn đổi sau khi xếp sinh việc "gọi báo khách". | Một nhóm đón ở hai nơi bị nhân đôi nhu cầu (C01). Văn phòng không sửa được số khách sau xác nhận (C02). Thay đổi trên đơn không tự chảy sang chuyến (C03, C06). Tin "đơn đổi" chưa có (C08). Địa chỉ của điểm danh mục không tới tài xế (C09). Danh mục khách sạn trống (C10). Một số điện thoại mỗi đơn (C11). | **Khung đúng, đường thay đổi gãy.** |
| **Năng lực** (xe, tài xế, nhà xe, khung bận) | Sức chứa giữ ba lớp. Trùng giờ xe và tài xế giữ hai lớp. Khung bận xe chặn đúng. Giấy tờ xe, bằng lái, hạng bằng đều được kiểm. Nhà xe và tài xế đối tác là hồ sơ có vai. Cam kết xe riêng là một luật dùng chung. Xe thuê thiếu giá không xuất bến. | C+2 không làm được (C20). Khoảng nghỉ áp cả cho xe quay đầu (C21). Không có lịch chuyến hay "xe rảnh" (C22). Tài xế đối tác không có màn (C24). Không có lịch nghỉ tài xế (C25). Thuê xe gấp khó (C26). | **Chặt về an toàn, thiếu về lập kế hoạch.** |
| **Thực tế vận hành** (xuất bến → từng điểm → kết thúc) | Ghi theo từng khách nên đón một phần được. Khách "Vắng" ra muộn vẫn đón được. Có hai trục giờ. Chống ghi trùng bằng requestId và vé lần gửi. Tên và số liên hệ chỉ mở trong ngày chạy. Có gọi một chạm, kết thúc gián đoạn có lý do, thêm điểm khi xe chạy, báo huỷ. | Bấm nhầm không sửa được (C50). Khách Vắng không xếp xe khác được (C51). Cứu hộ lấy nơi đón gốc (C52). ADR-0096 chưa thi hành (C31). Mất mạng làm trắng màn (C55). Màn dài, không có "điểm kế tiếp" (C54). Không có "Đón tất cả" (C53). | **Đúng nguyên tắc, thiếu đường sửa sai.** |
| **Điều phối** (cầu nối nhu cầu ↔ năng lực) | Bảng ba cột với nhu cầu chưa xếp và dòng thời gian theo xe, có hiện tải. Xếp theo lô, trọn hoặc không. Lý do giữ chỉ rõ ai xử lý. Có tách đoàn. Có chống hai người cùng sửa. | Vùng khoá 6 giờ (C04, C05). Thứ tự điểm theo thứ tự bấm, không theo giờ (C30). Mỗi lần xếp một chặng (C34). Không lọc ca hay khu vực (C35). Giờ hẹn ngoài khung chuyến vẫn xếp được (C32). | **Dùng được cho vài chục đơn mỗi ngày; nặng tay khi đông.** |

**So với Oracle Transportation Management (OTM).** Việc ghép khái niệm dưới đây là so sánh của người đánh giá; Oracle không tự nói như vậy. Các trang Oracle được dẫn đã mở lại được ngày 07/10/2026.

| Khái niệm OTM | Ở Nền tảng | Khớp? |
|---|---|---|
| Order Release (nhu cầu, có khung giờ đón sớm–muộn) | chặng `ord_transfer_leg` | Có, nhưng **không có khung giờ** (C16) |
| Order Movement (chia một order release thành nhiều phần để lập kế hoạch) | không có. Một dịch vụ không chia người ra các chặng đi được (C01) | **Thiếu** |
| Shipment / Stop / Shipment Event | chuyến `vc_trip` / điểm `vc_trip_stop` / sự kiện chỉ-thêm `vc_trip_event`; suất `vc_trip_allocation` | **Khớp tốt** |
| Giờ kế hoạch – ước tính – thật của điểm dừng | có kế hoạch và thật; **không có ước tính (ETA)** | Thiếu một trục (C72) |
| Order modification: sửa order release thì chuyến được sửa theo | đơn đổi thì chuyến bị "giữ"; người phải bấm "Cập nhật điểm/khách theo đơn"; đơn huỷ không tự rút suất | **Lệch** (C03, C06) |
| Resource Schedule (lịch sẵn sàng theo lịch) / Work Assignment (chuỗi chuyến của một nguồn lực) | không có lịch sẵn sàng của tài xế, không có chuỗi chuyến, không có mẫu | **Thiếu** (C22, C25) |
| Driver, Power Unit | tài xế = hồ sơ có vai (kiểu TCA), xe = `vc_vehicle` có giấy tờ | Khớp |
| Hiệu lực theo thời gian, không xoá cứng, một chủ ghi mỗi bảng | tuân thủ, trừ chủ xe sửa đè tại chỗ (C73) và số khách hiện hành nằm trong JSON của sổ tiền (C17, lệch có chủ ý đã duyệt) | Khớp phần lớn |

---

## Phần 3 — Kết quả tình huống chạy thật

Tất cả đều chạy bằng route thật trên khung thử toàn ứng dụng. Bài thử và log nằm ở `kich-ban/`. Các bài đã được người kiểm chạy lại ở HEAD và cho kết quả khớp.

| # | Tình huống | Kết quả | Quan sát chính | Mã quyết định |
|---|---|---|---|---|
| S1 | 10 đơn ở 10 khách sạn, xe 16 chỗ: xếp 15, 16, 17, 18 suất | PASS tới 16 / **GAP** ở 17–18 | 16 thì được (200). 17 và 18 bị 409 `vuot_so_cho` với Bán hàng, Quản trị có phá lệ, Toàn quyền có phá lệ; chèn thẳng bằng SQL cũng bị trigger `lc02_capacity` chặn. Em bé tính 1 chỗ. Xe 4 và 7 chỗ theo cùng luật. | `src/shared/dieu-phoi-kiem.ts:299`, `migrations/0042_chuyen_xe.sql:323`, `src/shared/so-nguoi-chang.ts:7` |
| S1b | Ghép 10 đơn vào 2 chuyến | PASS (thao tác nhiều) | Một lệnh xếp nhận nhiều chặng (API), nhưng giao diện chỉ xếp một chặng mỗi lần. Thứ tự điểm theo thứ tự bấm, không theo giờ hẹn (Mường Thanh 07:40 đứng trước Sheraton 07:00). Đưa điểm trả lên đầu bằng API vẫn xuất bến được. "KS Havana" và "Khách sạn Havana" thành hai điểm. | `src/modules/van-chuyen/dieu-phoi-route.ts:128`, `web/dieu-phoi.ts:470` |
| S2 | Sau khi xếp: thêm, bớt khách; đổi nơi đón; huỷ đơn; thêm đơn mới | **GAP** | Thêm khách: Bán hàng và Quản trị 403, chỉ HDV phụ trách hoặc Toàn quyền làm được; chuyến bị giữ `THIEU_SUAT`. Huỷ đơn: suất vẫn `WAITING`, chuyến giữ `DON_DA_HUY` tới khi có người rút tay. Đổi nơi đón: có lệnh "Cập nhật điểm theo đơn" (PASS). | `src/modules/dispatch/index.ts:256-257`, `src/shared/dieu-phoi-kiem.ts:405` |
| S3 | Xe quay đầu: A 06:30–07:30, B cùng xe lúc 07:45 | **GAP** | 07:30–07:59 bị 409 `chua_du_nghi`, kể cả khi đổi tài xế. 08:00 thì được. Quản trị phá lệ được. A về thật 07:10 thì tài xế xuất bến B lúc 07:40 được. Không có cơ chế mở chuyến khi xe rảnh: cron duy nhất là đồng bộ Sheet. | `src/shared/dieu-phoi-kiem.ts:117-129`, `wrangler.jsonc:16` |
| S3b | Khung bận xe (xưởng) | PASS | Chuyến chồng khung bận bị 409; phá lệ cũng không qua. | — |
| S4 | Chuyến ghép 4 điểm, tài xế chạy trọn | PASS về dữ liệu / GAP về sửa sai | Màn tài xế trong ngày chạy có tên điểm, giờ hẹn, số khách, tên và năm sinh, liên hệ của đơn. Đón 3/4 ở một điểm ghi đúng. Khách huỷ, vắng cả nhóm, đã trả, kết thúc: đều được. Bấm nhầm "Khách đã huỷ" thì 409 với mọi vai. | `src/modules/van-chuyen/dieu-phoi.ts:553-555` |
| S4b | Khi xe chạy: đổi thứ tự, thêm điểm, báo huỷ, chuyển xe, cứu hộ | **GAP** | Tài xế đưa được điểm trả lên đầu. Thêm điểm cần Quản trị phá lệ (trừ chặng đặt gấp). Không chuyển được khách đang chờ sang xe khác. Cứu hộ xếp khách đã lên xe hỏng với điểm đón là khách sạn gốc. | `src/modules/van-chuyen/dieu-phoi-lenh.ts:53-55, 259` |
| S5 | Chuyến riêng (xe riêng, tối thiểu 15 chỗ) | PASS | Ghép đơn khác vào xe riêng: 409 `can_pha_le_cam_ket`. Xe 7 chỗ bị chặn lúc xếp, nhưng lúc tạo chuyến thì không. | — |
| S5b | Chiều về ít người hơn chiều đi | **GAP** | Máy tự gắn tên theo mã ngẫu nhiên, nên có thể sai người về. Chặng đón 15:00 xếp được vào chuyến 07:50–09:00 và xuất bến được. | `src/shared/dieu-phoi-kiem.ts:191, 204-205` |
| S6 | 06:00 nhận đơn đón 07:00; 45 phút trước giờ chạy thêm hoặc bớt khách | **GAP / BLOCKER** | Xác nhận: 409 `short_notice_required`; Bán hàng không đặt gấp được (403). Xếp hay rút trong vùng khoá: 409 `can_pha_le`. Huỷ đơn đã xếp lúc 06:00 thì xe 06:45 không xuất bến được (409) cho tới khi Quản trị rút kèm phá lệ. | `src/shared/moc-toi-thieu.ts:65`, `src/shared/permissions.ts:83, 189` |
| S7 | Bấm trùng / mất mạng | PASS | Cùng requestId: 200/200, ghi một sự kiện. Khác requestId: 409. Version cũ: 409 `stale`. | `src/modules/van-chuyen/dieu-phoi-route.ts:108-114` |
| S8 | Nhà xe đối tác | **GAP** | Tài xế đối tác 403 ở mọi route của mình; văn phòng phải bấm thay. Xe thuê thiếu giá không xuất bến (PASS). | `src/shared/permissions.ts:187, 193` |
| S9 | Trùng giờ xe, trùng giờ tài xế | PASS | Bị chặn ở máy chủ lẫn trigger. | — |
| S10 | Văn phòng bấm thay, khai "xảy ra lúc" | PASS | Hai trục giờ đúng; giờ ngoài khoảng bị 409. | — |
| S11 | Tin cho tài xế khi chuyến hay đơn đổi | **GAP** | Có tin khi tạo chuyến, sửa giờ, đổi tài xế, huỷ chuyến, thêm điểm khi chạy. Không có tin khi xếp, rút hay dời khách, khi đơn bị huỷ, hay khi giờ hoặc nơi đón đổi. | `src/shared/tin-chuyen.ts:8-12` |

---

## Phần 4 — Phát hiện chi tiết (đã qua kiểm phản biện)

Cách ghi: **mức** · tình trạng luật. Tình trạng luật có bốn loại:
- *lỗi mã*;
- *đúng ADR đã duyệt nhưng gãy nghiệp vụ*;
- *ADR đã duyệt chưa thi công*;
- *chưa có quyết định*.

Đề xuất trái một ADR đã duyệt thì ghi rõ "cần ADR mới, chủ duyệt". Bằng chứng đầy đủ và bài thử của từng mã nằm ở `du-lieu/verify.json`.

### 4.1 Mức chặn (BLOCKER)

**C70 — Ghép khách nhiều đơn trên xe hợp đồng: câu pháp lý treo từ 27/9.** BLOCKER theo nghĩa "chặn việc chạy chuyến ghép thật tới khi có ý kiến pháp lý". Đây không phải lỗi mã.
- **Văn bản:** bản hợp nhất NĐ 158/2024, Điều 7 khoản 3 và khoản 4 điểm a, b (Phụ lục B).
- **Máy hôm nay:** ghép khách nhiều đơn không giới hạn. Không có thực thể hợp đồng vận tải. `require_contract` bị khoá ở 0 (`migrations/0041_chinh_sach_dieu_phoi.sql:20`). Chỉ chặng bật "xe riêng" mới không bị ghép. Repo tự ghi "chưa có người chuyên môn kiểm" (`docs/adr/ADR-0056-van-chuyen-kernel-luot-3.md:24`).
- **Phát hiện thêm N1:** NĐ 238/2026 (hiệu lực 15/8/2026) thêm điểm d khoản 8 Điều 26 NĐ 168: phạt tổ chức 20–24 triệu đồng khi xe hợp đồng xác nhận chỗ từng khách ngoài hợp đồng, hoặc ấn định lịch trình cố định cho nhiều người thuê. Repo chưa nhắc tới nghị định này (`grep "238/2026" docs/` rỗng). Repo còn ghi "Sở GTVT", trong khi NĐ 218/2026 đã đổi thành Sở Xây dựng.
- **Giải pháp:** ngoài mã trước, là hỏi luật sư. Sau khi có kết luận mới làm phần mã:
  - ADR mới trong `van-chuyen` thêm hợp đồng vận tải theo chuyến (ví dụ `vc_transport_contract`: bên thuê là hồ sơ `pty_party`, danh sách đính kèm là bản chốt khách `vc_trip_manifest` đã có, lưu ít nhất 3 năm);
  - migration mới bỏ khoá `require_contract = 0`;
  - điều kiện `HOP_DONG` đã có sẵn ở `kiemXuatBen` (`src/shared/dieu-phoi-kiem.ts:363`).
- **Lưu ý:** không xây "lịch chuyến định sẵn cho xe hợp đồng" trước khi có ý kiến pháp lý (liên quan C22). Cũng không được coi xe dưới 8 chỗ là đã thoát, vì điểm a khoản 4 không có ngưỡng số chỗ.

**C03 — Huỷ đơn trong vùng khoá làm cả xe ghép không xuất bến được.** BLOCKER cho ca huỷ đơn trong mốc · đúng ADR-0049 LC-09, D2, ĐP3 nhưng gãy nghiệp vụ.
- **Hiện tượng:** huỷ đơn không tự rút suất; chuyến giữ `DON_DA_HUY`. Trong mốc, mọi đường gỡ không cần Quản trị đều bị từ chối, gồm: Bán hàng rút khách, "Cập nhật khách theo đơn" (bỏ qua đơn đã huỷ), khôi phục đơn, huỷ chuyến, xuất bến kèm phá lệ. Chỉ còn hai đường: Quản trị hoặc Toàn quyền rút kèm phá lệ, hoặc Toàn quyền hạ mốc.
- **Bằng chứng:** `src/shared/moc-toi-thieu.ts:65` (7 lệnh bị khoá theo mốc), `src/modules/van-chuyen/dieu-phoi-lenh.ts:613`, `kich-ban/kiem-V1/c03-duong-vong.test.mjs`.
- **Thủ tục tránh kẹt** (đã chạy tới khi kết thúc chuyến): chưa huỷ đơn trên Nền tảng cho tới khi xe xuất bến; văn phòng bấm "Báo huỷ"; sau đó mới huỷ đơn. Phần "bớt khách" nhẹ hơn, vì có đường bỏ tên rồi "Cập nhật khách theo đơn" (N2).
- **Giải pháp** (cần ADR mới, chủ duyệt): lệnh máy "đồng bộ chuyến theo đơn" trong `van-chuyen`, theo khuôn `lenhCapNhatKhach`, với mã lệnh nằm ngoài `LENH_KHOA_THEO_MOC`.
  - Lệnh đóng các suất của đơn huỷ, của chặng đã đóng, và suất thừa; có nhật ký và tin cho tài xế.
  - Lệnh được gọi ngay sau lô huỷ đơn qua hàm tiêm ở gốc lắp ráp, vì `orders` không được import `van-chuyen`.

### 4.2 Mức cao (HIGH)

**C01 — Một nhóm đón ở hai nơi bị nhân đôi nhu cầu.** Đúng ADR-0054 D10.3 nhưng gãy nghiệp vụ; cần ADR mới.
- **Hiện tượng:** mỗi chặng chiều đi đòi đủ số khách của cả dịch vụ; chỉ chiều về được ghi số riêng (`src/shared/so-nguoi-chang.ts:15-18`, CHECK ở `migrations/0058_…:11-12`). Chạy thật với đơn 5 khách ở hai khách sạn, có hai cách xếp và cả hai đều sai:
  - xếp đúng 3 + 2 thì chuyến bị giữ `THIEU_SUAT`;
  - muốn xe chạy thì xếp 5 + 5 (5 người chiếm 10 ghế, máy cho), hoặc dồn 5 vào khách sạn A (danh sách tài xế sai điểm).

  Bài thử: `kich-ban/kiem-V1/c01-hai-diem-don.test.mjs`.
- **Theo Oracle:** đây là khái niệm Order Movement, tức chia một nhu cầu thành nhiều phần để lập kế hoạch.
- **Giải pháp:**
  - Ngay, không đổi luật: `kiemXep` cảnh báo khi tổng suất các chặng đi của một dịch vụ vượt số khách.
  - Cần ADR: cho số người riêng ở mọi chiều (migration expand–contract thay CHECK của 0058). Phương án sâu hơn là bảng nối `ord_leg_passenger` để tài xế thấy đúng tên ở từng điểm.

**C02 — Văn phòng không sửa được số khách sau xác nhận.** ADR đã duyệt chưa thi công (ADR-0007 điều 1, ADR-0014 điều 6).
- **Hiện tượng:** chỉ HDV đang phụ trách và Toàn quyền làm được (`src/modules/dispatch/index.ts:256-257`). Bán hàng và Quản trị nhận 403; trang đơn không có nút. Chính hướng dẫn trong Nền tảng ghi việc này "đang chờ làm" (`src/shared/huong-dan-ban-hang.ts:146`).
- **Giải pháp:** duyệt thiết kế ở ADR-0063 D1 (đang chờ). Sau đó thêm route văn phòng `POST /api/orders/:id/money-edit` trong `orders`, dùng lại `planMoneyEdit` và `order_money_adjustment` (chỉ thêm). Việc này chạm tiền nên là việc lớn: cần kế hoạch và người kiểm độc lập.

**C04 — Vùng khoá trước giờ xuất bến đẩy việc thường ngày lên Quản trị.** Đúng ADR-0049 D2/ĐP3 và ADR-0052 D5.1 nhưng gãy nghiệp vụ.
- **Hiện tượng:** 7 lệnh bị khoá trong mốc (giá trị gieo 360 phút): xếp, rút, dời ra, dời vào, đổi xe, đổi tài xế, huỷ chuyến còn khách. Phá lệ chỉ Quản trị hoặc Toàn quyền (`src/shared/permissions.ts:189`). Không có nút "Xin phá lệ", không có tin báo cho Quản trị (grep rỗng). Xe đang chạy luôn bị coi là trong mốc (`src/shared/dieu-phoi-kiem.ts:277`).
- **Không bị khoá:** đổi thứ tự, đổi giờ xe tới, "Cập nhật điểm/khách theo đơn".
- **Con số mốc:** chỉ Toàn quyền đổi được, trong khoảng 1–2880 phút, áp cho cả lúc đặt đơn lẫn lúc xếp xe.
- **Giải pháp** (cần ADR mới):
  - (i) tách cột mốc khoá xếp xe trong `vc_dispatch_policy`;
  - (ii) duyệt ADR-0091 (đang đề xuất), cân nhắc mở thêm lệnh rút;
  - (iii) nút "Xin phá lệ" trong hộp 409, gửi tin qua `thongbao` tới người có `trip.override`.

**C05 — Đơn sát giờ không xác nhận được nếu vắng Quản trị/Toàn quyền.** Đúng ADR-0049 D2 nhưng gãy nghiệp vụ.
- **Hiện tượng:** "Đặt gấp" chỉ hai vai này (`src/shared/permissions.ts:83`). Nếu để trống giờ đón thì xác nhận được, nhưng sau đó không điền được giờ và không xếp được, nên vẫn kẹt (`kich-ban/kiem-V1/c05-de-trong-gio.test.mjs`). Quản trị không nhận tin "chờ duyệt đặt gấp".
- **Giải pháp:** duyệt ADR-0091, hoặc hạ mốc; thêm tin "Đặt gấp chờ duyệt" (cần ADR).

**C08 — Tin báo khi đơn đổi và tin cho tài xế còn thiếu.** Gồm ba phần:
- (1) Tin "đơn đổi" cho người lập và người phụ trách (ADR-0062): đã duyệt chưa thi công. `grep v_aud_order_change` rỗng.
- (2) Tin cho tài xế khi giờ hẹn chặng đổi sau khi đã xếp (ADR-0052 MQ-07): đã duyệt chưa thi công.
- (3) Tin cho tài xế khi xếp, rút hay dời khách trên chuyến chưa chạy, hoặc khi đơn bị huỷ: nằm ngoài danh sách đóng của ADR-0052 D6.1. Phần này cần ADR mới.

Bằng chứng: `src/shared/tin-chuyen.ts:8-12`. Bài thử S11 và S11b. Bảng tin (màn đang mở) thì vẫn được gọi sau mọi lệnh.

**C20 — "Xe chở tối đa C + 2" không làm được.** Đúng ADR-0049 LC-02 (luật lõi, không ai phá lệ) và lời chủ chốt 27/9: "số chỗ tính mọi người trên xe".
- **Hiện tượng:** máy chặn ở ba lớp: lúc xếp, trigger trong cơ sở dữ liệu, cổng xuất bến. Danh sách phá lệ `MA_LUAT_PHA_LE` chỉ có mốc, khoảng nghỉ, cam kết (`src/shared/dieu-phoi-kieu.ts:85`). Hướng dẫn viên đi kèm cũng chiếm chỗ. Số chỗ khai trong hồ sơ là "không kể tài xế" (`migrations/0033_van_chuyen_xe.sql:27`).
- **Giải pháp:** **không nới trong mã** trước khi có ý kiến luật sư (C71). Nếu "+2" là em bé ngồi lòng và luật cho phép, đi đường ADR-0065 (đang đề xuất, đã móc sẵn ở `soNguoiChang`), chỉ sửa một chỗ đếm. Không sửa `passenger_capacity`, vì cột này còn dùng cho hạng bằng, giá thuê và bản chốt lúc xuất bến.

**C22 — Không có tầng lập kế hoạch.** Chưa có quyết định. Riêng "chuyến = một xe + một tài xế" là đúng ADR-0049.
- **Hiện tượng:** không có chuyến mẫu, chuyến lặp, mở chuyến tự động hay bán tự động, gợi ý xe rảnh hay gợi ý chuyến hợp. Cron duy nhất đồng bộ Sheet (`wrangler.jsonc:16`, `src/index.ts:204-206`). Tạo chuyến bắt buộc có xe và tài xế (`src/modules/van-chuyen/dieu-phoi-than.ts:40-41`). Người điều phối chỉ có hình ảnh để tự nhìn (dòng thời gian theo xe, lưới lịch xe bận).
- **Theo Oracle:** OTM có Resource Schedule, tức lịch sẵn sàng làm khuôn sinh ra các phiên làm việc, và Work Assignment, tức chuỗi chuyến của một nguồn lực.
- **Giải pháp** (ADR mới, làm từng bậc, người vẫn bấm duyệt):
  1. luật thuần "xe rảnh từ" ở `src/shared`, đưa vào `/api/van-chuyen/lich`, chỉ hiển thị;
  2. gợi ý chuyến còn chỗ và hợp giờ khi xếp, dùng lại `kiemXep`;
  3. `vc_trip_template` và lệnh "sinh chuyến từ mẫu", **chỉ sau khi có ý kiến pháp lý (C70)**.

**C24 — Tài xế nhà xe đối tác không dùng được Nền tảng.** ADR-0053 D7.1, D8, D9 đã duyệt chưa thi công (BL-VC-D6 đang tạm gác).
- **Hiện tượng:** 403 ở danh sách, chi tiết và xuất bến (`src/shared/permissions.ts:187, 193`; `src/shared/start-page.ts:34-35`). Văn phòng phải bấm thay mọi bước. Ảnh: `anh/g10-tai-xe-doi-tac-cuoc-dien-thoai.png`.
- **Giải pháp:** thi công Đợt 6 theo ADR-0053; phần quyền đã được duyệt. Chạm quyền nên cần người kiểm độc lập và trang ghép.

**C31 — ADR-0096 (đón trước trả, cửa sổ xuất bến, giờ hẹn) chỉ mới là cảnh báo.** ADR đã duyệt 3/10, chưa thi công.
- **Hiện tượng:** điểm trả đứng trước điểm đón vẫn xuất bến được (gọi thẳng API). Tài xế dùng ↑/↓ đưa điểm trả lên đầu được. Bấm "Đã tới" ở điểm trả khi chưa đón ai vẫn được. Xuất bến sớm 31 giờ được. Khách hẹn 12:00 trên chuyến 12:30 vẫn xuất bến được.
- **Lưu ý quy trình (N4):** ADR-0096 tự ghi "chủ chưa đọc chữ Đ3" và bản sửa chưa được kiểm lại. Nên xin chủ xác nhận trước khi thi công.
- **Giải pháp:** đợt V3-A. Thêm 3 mã giữ vào `kiemXuatBen`. Migration thêm `departure_window_minutes` và trigger cạnh PLANNED→RUNNING. Các lệnh đổi thứ tự và "Đã tới" từ chối khi vi phạm. Thêm dòng ở `docs/SO-HANG-RAO.md`.

**C50 — Bấm nhầm kết quả khách không sửa được.** ADR-0097 đã duyệt 3/10, chưa thi công (V3-B).
- **Hiện tượng:** "Khách đã huỷ", "Đã đón", "Đã trả" một khi đã ghi thì không đổi được, kể cả Quản trị (`src/modules/van-chuyen/dieu-phoi.ts:553-555`). Màn tài xế ghi "Sai? Báo văn phòng" nhưng văn phòng cũng không có nút. "Khách đã huỷ" là một chạm, không có hộp xác nhận. Ảnh: `anh/g10-diem-2-vang-huy-don-dien-thoai.png`.
- **Giải pháp:** thi công V3-B trong `van-chuyen`, gồm sự kiện `CORRECTION`, route điều chỉnh và route thu hồi xuất bến. Trong lúc chờ, thêm hộp xác nhận cho "Khách đã huỷ".

**C51 — Khách "Vắng" không xếp sang xe khác được; khách đang chờ không chuyển được giữa hai xe khi một xe đang chạy.**
- **Hiện tượng:** suất `NO_SHOW` vẫn mở và vẫn được đếm, nên xếp lại sang xe 2 bị chặn với lý do "quá số khách của chặng". Chặn cả khi Quản trị phá lệ và cả khi xe 1 đã kết thúc. Bằng chứng: `src/shared/dieu-phoi-kiem.ts:286-287`, `src/modules/van-chuyen/dieu-phoi-lenh.ts:53-55`.
- **Tình trạng và giải pháp:**
  - Phần 1 chưa có quyết định. Cần ADR mới cho lệnh "Mở lại để xếp", cùng khuôn ADR-0097.
  - Phần 2 là ADR-0052 D4 đã duyệt nhưng chủ hoãn (BL-VC-D4). Chỉ cần chủ mở lại.

### 4.3 Mức vừa (MEDIUM)

| Mã | Phát hiện (đã sửa câu theo kiểm phản biện) | Tình trạng luật | Giải pháp gắn kiến trúc |
|---|---|---|---|
| C06 | HDV sửa số khách sát giờ không bị mốc chặn, nhưng chuyến bị giữ ngay. HDV không xem được chuyến và không được cảnh báo. | chưa có quyết định | Gộp vào lệnh "đồng bộ chuyến theo đơn" (C03), hoặc cho `handler-money-edit` cảnh báo theo mốc. Cần ADR. |
| C09 | Điểm khách sạn chọn từ danh mục chỉ truyền tên; địa chỉ Quản trị đã khai không tới tài xế. View `v_loc_location_label` không có cột địa chỉ (`migrations/0010_locations.sql:39-40`). Không có nút chỉ đường (grep `maps\|geo:` rỗng). Chữ tự do thì tới nguyên văn. | chưa có quyết định; BL-VC-TOA-DO | ADR nhỏ cho `locations`: view công bố mới có địa chỉ, thêm khoá vào DTO tài xế (`tai-xe-dto.ts`), nút "Chỉ đường" ở `web/cuoc-chuyen.ts`. Việc gửi chữ tự do cho dịch vụ bản đồ bên ngoài thì chủ quyết về riêng tư. |
| C10 | Chỉ Quản trị thêm được điểm, và danh mục chưa có khách sạn nào. Khoá nơi chỉ bỏ khác biệt hoa/thường và khoảng trắng, nên "KS Havana" ≠ "Khách sạn Havana". Ô chọn không có ô tìm. Dòng nhắc "Chỉ hiện trong trang đơn." là **sai** (`web/khoi-dua-don.ts:237`): chữ này hiện cho điều phối và tài xế. | đúng ADR-0007, ADR-0050 VK1-B; dòng nhắc là lỗi chữ | Nhập danh mục khách sạn thật. Ô tìm theo khuôn `catalog-picker`. Sửa dòng nhắc (bề mặt). Không đổi cách chuẩn hoá khoá nơi (cửa một chiều). |
| C11 | Một số liên hệ mỗi đơn, là số người đặt; nút "Sử dụng thông tin của tôi" có thể điền số người bán. Máy chủ gửi số từ trước xuất bến (trong ngày chạy), nhưng màn "Xuất bến" không vẽ (`web/cuoc-chuyen.ts:402-410`; BL-TEN-TRUOC-XB chờ chủ). | đúng ADR-0049 D3; phần màn là lựa chọn bản 1.39 | Chủ quyết BL-TEN-TRUOC-XB (rẻ, chỉ đụng giao diện). Thêm "người liên hệ tại điểm đón" trên chặng cần ADR. |
| C12 | Cờ "Xe riêng" không làm đổi tiền. Đối tác và Thực tập bật được rồi tự xác nhận. Có đơn vị giá theo nhóm `perNPax` nhưng không nối với cờ. Không có lệnh "tạo chuyến riêng cho đơn này". | đúng ADR-0056; lệnh tạo chuyến riêng chưa có quyết định | Cảnh báo lúc xác nhận khi bật xe riêng mà không có dòng giá theo nhóm (`src/shared/canh-bao-xac-nhan.ts`). Không gắn tiền vào chặng. |
| C14 | Bảng "Sửa đưa đón" gửi lệnh rời rạc. Bỏ chặng không xét mốc còn thêm chặng thì có, nên đơn đã xác nhận có thể còn 0 chặng (đã chạy thử). | khoảng trống | Route "thay chặng" gộp trong một `db.batch` ở `orders`, xét mốc cho cả lệnh. |
| C15 | "Khách đã huỷ tại điểm" không đẩy tin cho ai. HDV, Đối tác hay Thực tập phụ trách đơn không nhận cả tin "khách vắng". | đúng ADR-0052 D6.1, D6.2 | Ma trận sự kiện theo vai (đợt V5), thêm `trip_passenger_cancelled_at_stop`. Cần chủ duyệt. |
| C21 | Khoảng nghỉ 30 phút áp cho cùng xe **hoặc** cùng tài xế, nên xe quay đầu ở cảng bị đòi nghỉ kể cả khi đổi tài xế. Quản trị hoặc Toàn quyền phá lệ được. Hạ con số thì mất luôn hàng rào nghỉ của tài xế. | đúng ADR-0049 (CH-02) nhưng gãy nghiệp vụ | ADR mới: tách "nghỉ tài xế" và "quay đầu xe" thành hai cột trong `vc_dispatch_policy`; sửa một hàm ở `kiemTaoSuaChuyen` và `kiemXuatBen`. |
| C25 | Không ghi được lịch nghỉ hay bận của tài xế. Trigger chặn (`migrations/0071_…:56-59`), và lệnh tạo chuyến chỉ đọc khung bận của xe. | ADR-0053 D9 chưa thi công; tài xế công ty chưa có quyết định | Bỏ trigger bằng migration mới, gieo nhóm lý do, thêm route; **sửa cả câu đọc** `khungBanXeTrongKhoang`. |
| C26 | Thuê xe gấp: phải nhập đủ hồ sơ xe (bắt buộc số khung) và có tài xế đủ bằng ngay lúc tạo. | đúng ADR-0049 | ADR mới: chuyến đặt theo cỡ xe hoặc nhà xe, gán xe và tài xế sau; cổng xuất bến vẫn bắt buộc. |
| C28 | Chiều về ít người hơn: máy tự gắn tên theo mã ngẫu nhiên, có thể sai người; giao diện không gửi `personKeys` dù API nhận. | chưa có quyết định (ruling R-P3) | Ô chọn người ở hộp xếp (giao diện). Đổi R-P3 ở cả lúc xếp lẫn lúc xuất bến thì cần chủ quyết. |
| C30 | Điểm mới luôn vào cuối danh sách đón, không theo giờ hẹn, không cảnh báo. Chuyến chưa chạy không có nút đổi thứ tự (API có). | ADR-0096 Đ1.3(b) chưa thi công; sắp theo giờ chưa có quyết định | Nút ↑/↓ cho chuyến PLANNED ở `web/chuyen.ts`, có kiểm LC-19. |
| C32 | Chặng 15:00 xếp được vào chuyến 07:50–09:00; hộp chọn liệt kê cả chuyến đầy. | ADR-0096 Đ3.5 (chỉ cảnh báo) | Sắp và làm mờ trong `chuyenXepDuoc`; trả cảnh báo ngay trong phản hồi xếp. |
| C33 | Nhiều đoàn cùng nơi khác giờ thành một điểm, chỉ hiện giờ sớm nhất; tài xế không biết đoàn sau hẹn muộn hơn. | đúng ADR-0049 dòng 76 | Trả giờ hẹn của chặng trong suất và hiện dưới điểm (không đổi dữ liệu). |
| C34 | Giao diện xếp một chặng mỗi lần, dù API nhận tới 50. Tạo chuyến phải rời bảng. | chưa có quyết định (giao diện) | Chọn nhiều thẻ, một `POST /phan-bo`; tạo chuyến bằng bảng trượt. |
| C52 | Cứu hộ: khách đã lên xe hỏng được xếp lại với điểm đón là khách sạn gốc và giờ hẹn cũ. | ADR-0052 D5c chưa thi công (BL-VC-D4) | Mở lại BL-VC-D4 (nơi gặp `meet_place_text`). |
| C53 | Không có "Đón tất cả"; đoàn 10 khách mất 10 chạm và khoảng 20 lượt mạng. | chưa có quyết định | Nút "Đã đón N khách" có xác nhận, gửi lần lượt các lệnh có sẵn. |
| C54 | Màn đang chạy là danh sách mọi điểm (~3,3 màn); không có "điểm kế tiếp"; giờ hẹn 12px; "Kết thúc chuyến" không dính đáy. | đúng bản vẽ 05 đã duyệt | Khối "Điểm kế tiếp", thu gọn điểm xong, nút chính dính đáy, giờ hẹn ≥ 16px (token mới). Chủ duyệt bằng ảnh. |
| C55 | Lần tải nền bị lỗi mạng làm **ẩn cả trang chuyến** (mất điểm, số điện thoại, nút "Bấm lại"); chỗ ẩn này vốn chỉ dành cho 403/404 (`web/cuoc-chuyen.ts:494-500`). Không có hàng đợi ngoại tuyến (có chủ ý). | **lỗi mã** | Chỉ ẩn khi `ApiError` 403/404; giữ dữ liệu trong bộ nhớ trang kèm dải "dữ liệu lúc HH:MM". Thêm bước Chrome. |
| C57 | Cả đoàn vắng thì màn bật "Kết thúc chuyến" nhưng máy chủ từ chối; lối ra là ghi "đã tới điểm trả" dù xe có thể không đi. | nút sáng sai là lỗi mã; phần còn lại đúng LC-16 | Một hàm thuần chung cho màn và máy chủ; tự bỏ qua điểm trả không còn khách thì cần ADR. |
| C60 | Kịch bản Chrome màn tài xế `cuoc-smoke.mjs` đang đỏ (kịch bản cũ, cộng lỗi C55), nên màn tài xế không có lưới kiểm xanh. | lỗi kịch bản kiểm | Sửa ba chỗ trong kịch bản rồi sửa C55. |

### 4.4 Mức thấp (LOW) — ghi lại, không chặn

C07: nhập tên nhiều hơn số khách thì chuyến không biết. C13: Đối tác và HDV không sửa được đưa đón (đúng ADR); nên có luồng "yêu cầu đổi". C16: chặng không có khung giờ đón. C17: số khách hiện hành nằm trong JSON của sổ tiền (lệch có chủ ý ADR-0047 L-A1). C23: chuyến kế không tự chỉnh, không có cảnh báo "đang trễ". C27: xe "Bảo dưỡng" vẫn tạo chuyến được (có chủ ý). C35, C36, C37: lọc theo ca/khu vực; nghe tin đơn đổi; tổng "khách chưa xếp / ghế trống". C38: đổi thứ tự không có khoá phiên bản. C56: chạm đúp báo lỗi đỏ. C58: không cảnh báo khi xuất bến sớm nhiều giờ. C59: giờ khi mất sóng, bấm thay không khai giờ, không có đồng hồ chờ "Vắng". C61: nút "Hỗ trợ" đè nội dung; thứ tự khách ngẫu nhiên. C72: không có giờ ước tính (ETA). C73: chủ xe sửa đè tại chỗ.

Phát hiện thêm trong lúc kiểm:
- **N2:** bỏ tên rồi "Cập nhật khách theo đơn" gỡ được ghế thừa trong mốc mà không cần phá lệ; đây là hai luật khác nhau cho cùng một việc.
- **N3:** số phút nghỉ chụp lúc tạo chuyến không được chụp lại khi dời giờ; lỗi mã nhỏ, gây kẹt nếu Toàn quyền hạ khoảng nghỉ.
- **N5:** ADR-0014 nói HDV báo đổi giờ "qua `task.progress`, đã có", nhưng ô này chưa có route nào.

---

## Phần 5 — Giao diện so với thực hành tốt (ERP và ứng dụng tài xế kiểu Grab)

Ảnh chụp bằng Chrome headless khổ 390 (điện thoại, giả lập cảm ứng) và 1040 (máy tính), trên D1 tạm. **Chưa thử iPhone thật, chưa chạy axe.** Kết quả các kịch bản có sẵn:
- `dieu-phoi-smoke` 11/11, `chuyen-smoke` 9/9 và `chuyen-sua-smoke` 13/13 đều xanh;
- `cuoc-smoke` đỏ (C60);
- kịch bản mới `ghep-10-don` (10 đơn ở 10 khách sạn) 17/17 xanh.

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| (a) Mỗi điểm: nơi đón, số khách, giờ hẹn, SĐT | Một phần: có, nhưng thiếu địa chỉ của điểm danh mục, và SĐT chỉ hiện sau Xuất bến | `anh/g10-xuat-ben-khung-dien-thoai.png`, `anh/g10-dang-chay-khung-dau-dien-thoai.png` |
| (b) Gọi một chạm | **Đạt**: liên kết `tel:` ở mọi điểm đón, vùng chạm 44px | `web/cuoc-chuyen.ts:280-284` |
| (c) Chỉ đường một chạm | **Không có** | grep `maps\|geo:` rỗng |
| (d) Nút chính ≥ 44pt, vùng ngón cái, dính đáy | Một phần: "Xuất bến" 52px dính đáy; khi chạy thì nút nằm trong từng thẻ, "Kết thúc" ở cuối trang | `anh/g10-dang-chay-ca-trang-dien-thoai.png` |
| (e) Một màn, một việc kế tiếp | **Không**: danh sách dài ~3,3 màn | như trên |
| (f) Xác nhận trước thao tác không đảo ngược | Một phần: có cho Xuất bến, Đã trả, Kết thúc; **không có cho "Khách đã huỷ"** (không đảo được) | `anh/g10-diem-2-vang-huy-don-dien-thoai.png` |
| (g) Báo trạng thái mạng | Một phần: có dải "Chưa gửi được — Bấm lại" cùng requestId, nhưng có ca **trắng trang** | `anh/g10-mat-mang-dien-thoai.png`, `anh/g10-mat-mang-bam-lai-lan-1-dien-thoai.png` |
| (h) Chữ đủ lớn khi lái | Một phần: tên nơi 17px, tên khách 16px; **giờ hẹn 12px mờ** | `public/app.css:2593` |
| (i) Tài xế đối tác có màn | **Không** | `anh/g10-tai-xe-doi-tac-cuoc-dien-thoai.png` |
| (j) Nhu cầu chưa xếp so với chỗ trống | Đạt: thẻ chặng đặt cạnh dòng thời gian có "tải x/15"; cột hẹp, chỉ thấy 3/10 chặng một khung | `anh/g10-dieu-phoi-chua-xep-khung-may-tinh.png` |
| (k) Cảnh báo quá tải / trùng giờ | Một phần: trùng giờ báo ngay; chuyến 15/15 vẫn chọn được, chỉ bị từ chối sau khi bấm | `anh/b3-tao-chuyen-ba-loi-may-tinh.png`, `anh/g10-hop-xep-vuot-cho-may-tinh.png` |
| (l) Kéo thả, thao tác hàng loạt | Một phần: có kéo thả, không chọn nhiều | `web/dieu-phoi.ts:470` |
| (m) Lọc ngày / ca / khu vực | **Chỉ theo ngày** | `web/dieu-phoi.ts:43` |
| (n) Điều phối trên điện thoại | Một phần: dùng được, nhưng phần đầu chiếm nửa màn, chỉ thấy ~1,5 chặng | `anh/g10-dieu-phoi-chua-xep-dien-thoai.png` |
| (o) Biểu mẫu nhập điểm đón | Một phần: ô chọn tĩnh, không tìm; chữ tự do không gợi ý; dòng nhắc sai | `anh/g10-bieu-mau-dua-don-dien-thoai.png`, `anh/g10-bieu-mau-dia-chi-tu-do-dien-thoai.png` |

**Nhận xét tư duy giao diện.** Màn tài xế được vẽ như một màn ERP thu nhỏ, tức danh sách đầy đủ để kiểm soát. Ứng dụng tài xế kiểu Grab thì được vẽ cho người đang lái: một thẻ "việc kế tiếp", một nút lớn ở đáy, chỉ đường và gọi ngay trên thẻ đó, còn mọi thứ khác thu gọn. Dữ liệu cần cho cách vẽ này đã có sẵn trong DTO (`buocDiem`, thứ tự, trạng thái). Vì vậy đổi cách vẽ là việc bề mặt ở `web/cuoc-chuyen.ts`, không đổi máy chủ (C53, C54).

---

## Phần 6 — Điểm làm đúng (để công bằng, đều đã kiểm)

- **Nhu cầu tách khỏi chuyến**, đúng tinh thần Order Release ↔ Shipment. `orders` không import `van-chuyen`, `van-chuyen` không ghi bảng `ord_*`, đọc xuyên module qua view công bố (`src/architecture.test.ts`).
- **Ghi theo từng khách:** đón một phần được; khách "Vắng" ra muộn vẫn bấm "Đã đón" được; điểm tự xong khi hết người (`src/modules/van-chuyen/dieu-phoi.ts:553-555`).
- **Luật an toàn chặt, nhiều lớp:**
  - sức chứa: ba lớp;
  - trùng giờ xe và tài xế: hai lớp, có bài chạy đua;
  - khung bận xe;
  - giấy tờ, bằng lái, hạng bằng;
  - xe thuê thiếu giá không xuất bến;
  - cam kết xe riêng: một luật cho mọi đường xếp.
- **Chống ghi trùng:** `requestId` duy nhất cộng lớp vé chung ADR-0094 (danh sách miễn trừ rỗng). Bấm lại khi mất mạng dùng cùng mã (S7).
- **Hai trục giờ** (ghi nhận và xảy ra) khi văn phòng bấm thay, kẹp khoảng hợp lệ (S10).
- **Riêng tư:** tên, năm sinh và liên hệ chỉ mở trong ngày chạy (`src/shared/dieu-phoi-kiem.ts:480-482`). Nhật ký và phản hồi lệnh không kèm tên hay SĐT.
- **Danh tính kiểu TCA** cho tài xế, nhà xe, chủ xe. **Không xoá cứng**, sự kiện chỉ-thêm, chính sách có hiệu lực theo thời gian.
- **Bán hàng:** tiền chỉ tính ở máy chủ (`buildLines`) và bị trigger khoá sau xác nhận (0081). Đổi số khách là dòng điều chỉnh chỉ-thêm. Đặt gấp có lý do, có dấu vết.

---

## Phần 7 — Lộ trình giải pháp gắn kiến trúc

Lộ trình Vận chuyển đã khoá ngày 5/10. Mọi gói dưới đây chỉ chạy khi chủ mở lại theo CLAUDE.md §9. Việc đụng dữ liệu, quyền, tiền phải có người kiểm độc lập.

**Gói 0 — Việc của chủ, ngoài mã (ngay)**
1. Hỏi luật sư hoặc Sở Xây dựng Khánh Hoà, một lượt gồm: C70, N1 (NĐ 238), C71 (C+2, em bé), hạng bằng.
2. Ghi thủ tục tránh kẹt "chưa huỷ đơn tới khi xe chạy, rồi Báo huỷ" vào hướng dẫn Bán hàng (C03).
3. Nếu cần nới sát giờ ngay thì Toàn quyền hạ `min_lead_minutes`, nhưng phải biết hai tác dụng phụ: áp cả lúc đặt đơn, và lỗi N3.

**Gói A — Thi công phần ADR đã duyệt** (không cần ADR mới; cần kế hoạch và người kiểm)
| Việc | ADR | Module, chỗ chạm | Phát hiện |
|---|---|---|---|
| A1 Sửa sai có lý do, thu hồi xuất bến; đón trước trả, cửa sổ xuất bến, nút thứ tự cho chuyến kế hoạch | 0097, 0096 (xác nhận chữ Đ3 trước) | `van-chuyen`: `dieu-phoi-tien-do.ts`, `dieu-phoi-kiem.ts`, migration mới, `web/chuyen.ts` | C50, C31, C30, C58 |
| A2 Văn phòng sửa số khách sau xác nhận | 0007, 0014 (thiết kế ADR-0063) | `orders`: route `money-edit`, `order_money_adjustment`, `web/order.ts` | C02, C07 |
| A3 Tin "đơn đổi"; tin giờ hẹn đổi cho tài xế | 0062, 0052 MQ-07 | `thongbao`: view `v_aud_order_change`, hàm tiêm `chuyenChoTin` | C08 (1, 2) |
| A4 Tài xế đối tác dùng Nền tảng; báo bận | 0053 D7.1, D8, D9 | `permissions.ts`, `start-page.ts`, migration bỏ trigger, câu đọc khung bận tài xế | C24, C25 |
| A5 Chuyển khách giữa hai xe; cứu hộ có nơi gặp | 0052 D4, D5c | `van-chuyen`: `vc_transfer_request` | C51 (2), C52 |

**Gói B — Cần ADR mới, chủ duyệt** (mỗi lượt tối đa 3 quyết định chạm quyền hoặc dữ liệu, kèm trang ghép)
| Việc | Module, chỗ chạm | Phát hiện |
|---|---|---|
| B1 Lệnh máy "đồng bộ chuyến theo đơn" (rút khi huỷ hay bớt, mở suất khi tăng nếu còn chỗ), miễn khoá vì máy làm theo đơn | `van-chuyen` (mở rộng `lenhCapNhatKhach`), hàm tiêm ở gốc lắp ráp | C03, C06, N2 |
| B2 Tách mốc khoá xếp xe khỏi mốc đặt đơn; nút "Xin phá lệ"; hoặc duyệt ADR-0091 | `vc_dispatch_policy` (cột mới), `thongbao` | C04, C05 |
| B3 Một nhóm, nhiều điểm đón (số người riêng mọi chiều, hoặc `ord_leg_passenger`) | `orders`, `src/shared/so-nguoi-chang.ts` | C01, C28 |
| B4 Tách "nghỉ tài xế" và "quay đầu xe" | `vc_dispatch_policy`, `kiemTaoSuaChuyen`, `kiemXuatBen` | C21, N3 |
| B5 Tầng lập kế hoạch: "xe rảnh từ" → gợi ý chuyến → mẫu chuyến (bậc 3 chỉ sau ý kiến pháp lý) | `src/shared` luật thuần, `/api/van-chuyen/lich`, `vc_trip_template` | C22, C23 |
| B6 Địa chỉ, toạ độ, chỉ đường; người liên hệ tại điểm đón | `locations` (view công bố mới), `ord_transfer_leg`, DTO tài xế | C09, C10, C11 |
| B7 Mở lại khách Vắng để xếp xe khác | `van-chuyen`, khuôn ADR-0097 | C51 (1) |
| B8 Tin cho tài xế khi xếp, rút hay dời khách và khi đơn huỷ; tin "khách huỷ tại điểm" cho bên bán | `src/shared/tin-chuyen.ts`, ma trận V5 | C08 (3), C15 |
| B9 Hợp đồng vận tải theo chuyến (sau ý kiến luật sư) | `vc_transport_contract`, bỏ khoá `require_contract` | C70 |
| B10 Chuyến đặt theo cỡ xe hoặc nhà xe; lịch nghỉ tài xế công ty | `vc_trip`, `vc_unavailability` | C26, C25 |

**Gói C — Sửa giao diện hoặc lỗi mã nhỏ** (không cần ADR; test xanh, chủ duyệt bằng ảnh thật)
- **C1 (làm trước):** màn tài xế không ẩn trang khi lỗi mạng (C55). Sửa kịch bản `cuoc-smoke.mjs` (C60).
- **C2:** màn tài xế "Điểm kế tiếp" và nút dính đáy; giờ hẹn 16px; "Đã đón N khách" có xác nhận; khoá nút khi đang gửi; nút Kết thúc khớp máy chủ; đồng hồ chờ "Vắng"; ẩn nút Hỗ trợ (C53, C54, C56, C57, C59, C61).
- **C3:** bảng điều phối — chọn nhiều chặng; tạo chuyến bằng bảng trượt; lọc ca, chiều, nơi trả; tổng "khách chưa xếp / ghế trống"; tô màu theo tải; nghe tin `don-thay-doi`; hộp chọn chuyến ưu tiên chuyến hợp; giờ hẹn từng đoàn ở điểm gộp; ô chọn người cho chặng về (C28, C32–C37).
- **C4:** biểu mẫu — sửa dòng nhắc sai, ô tìm điểm (C10); cảnh báo lúc xác nhận khi bật xe riêng (C12).
- **C5:** lỗi mã nhỏ — chụp lại số phút nghỉ khi sửa chuyến (N3); cảnh báo khi tạo chuyến cho xe Bảo dưỡng (C27); `eventByRequest` so cả chuyến và loại lệnh (C38); thứ tự suất (C61); route "thay chặng" gộp (C14).

---

## Phần 8 — Giới hạn và điều chưa kiểm

- **Chưa thử iPhone thật.** Ảnh 390 là Chrome headless. Màn trắng khi mất mạng dựa trên giả lập offline của CDP, cơ chế đã khẳng định bằng mã; tần suất trên điện thoại thật chưa kiểm. **Chưa chạy axe**, vì máy không có `AXE_JS`.
- **Không chạm production**, nên không biết:
  - giá trị chính sách thật (mốc, khoảng nghỉ có thể khác giá trị gieo 360 và 30 phút);
  - số khách sạn đã có trong danh mục;
  - xe thật có phù hiệu xe hợp đồng hay không;
  - đơn đối tác thường ghi số điện thoại của ai.
- **Bảng tin và Web Push tới máy thật** chưa kiểm, vì khung thử không có binding. **Tranh chấp đồng thời thật trên D1** chưa kiểm.
- **Pháp lý:** chỉ trích văn bản gốc từ chinhphu.vn. Chưa đọc Luật Đường bộ 2024 và Luật Trật tự, an toàn giao thông 2024 về cách tính trẻ em. **Chưa có luật sư.**
- **Số thao tác ước tính:** "34–44 thao tác cho 10 đơn vào 2 chuyến" là ước tính, chưa đo bằng tay.
- **Kịch bản chưa chạy lại:** `rut-doi-smoke`, `cap-nhat-khach-smoke`, `goi-bao-smoke`, `dat-gap-smoke` và các kịch bản Đợt 5.

---

## Phụ lục A — Cách chạy lại

Từ gốc repo, không cần mạng. Khung thử dùng `node_modules` của repo.

```bash
node --test docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/kich-ban/sc-ghep/*.test.mjs
node --test docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/kich-ban/sc-nangluc/*.test.mjs
node --test docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/kich-ban/sc-vanhanh/*.test.mjs
node --test docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/kich-ban/kiem-V*/*.test.mjs
```

Kịch bản Chrome, chạy sau `npm run build:web`: `CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/kich-ban/ui/ghep-10-don.mjs`

Các bài ghi lại hành vi quan sát được, chứ không khẳng định hành vi "đúng". Khi một phát hiện được sửa, bài tương ứng sẽ đổi kết quả; lúc đó chuyển nó thành bài hồi quy thật trong `src/` hoặc `tests/e2e/`.

## Phụ lục B — Nguồn ngoài (mở được ngày 07/10/2026)

Văn bản pháp luật (bản PDF trên datafiles.chinhphu.vn):
- Văn bản hợp nhất 58/VBHN-BXD (NĐ 158/2024, đã gồm phần sửa của NĐ 218/2026), Điều 7: <https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/7/58-vbhn-bxd.signed.pdf>
- NĐ 168/2024, Điều 20 khoản 2, Điều 26 khoản 8, Điều 32 khoản 5: <https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/01/168-nd-cp.signed.pdf>
- NĐ 238/2026 (sửa NĐ 168; hiệu lực 15/8/2026), Điều 7 khoản 1, Điều 9 khoản 1 và 2, Điều 20: <https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/7/238-ndcp.signed.pdf>

Oracle Transportation Management (docs.oracle.com):
- Order Release: <https://docs.oracle.com/en/cloud/saas/transportation/26b/otmol/planning/order_manager/or_edit.htm>
- Order Movement: <https://docs.oracle.com/en/cloud/saas/transportation/26b/otmol/planning/order_manager/order_movement/order_movement.htm>
- Chuyến nhiều điểm từ nhiều order release: <https://docs.oracle.com/en/cloud/saas/transportation/26c/otmol/planning/order_manager/order_rel_actions/build_multistop_ship.htm>
- Điểm dừng, giờ kế hoạch – ước tính – thật: <https://docs.oracle.com/en/cloud/saas/transportation/26c/otmol/planning/shipment_manager/multi_create_shipments/shipment_stop_dtail.htm>
- Sự kiện chuyến: <https://docs.oracle.com/en/cloud/saas/transportation/26c/otmol/execution/25_shipment_status/shipment_event.htm>
- Sửa order release thì chuyến được sửa theo: <https://docs.oracle.com/en/cloud/saas/transportation/26c/otmol/planning/order_manager/order_management/order_modification_workflow.htm>
- Resource Schedule: <https://docs.oracle.com/en/cloud/saas/transportation/26c/otmol/asset_mgt/resource/resource_schedule.htm>
- Work Assignment: <https://docs.oracle.com/en/cloud/saas/transportation/26c/otmol/asset_mgt/resource/work_assignment.htm>
- Driver: <https://docs.oracle.com/en/cloud/saas/transportation/25c/otmol/asset_mgt/driver/driver_manager.htm>
- Power Unit: <https://docs.oracle.com/en/cloud/saas/transportation/25c/otmol/asset_mgt/power_unit_mgr.htm>
- Ứng dụng di động: <https://docs.oracle.com/en/cloud/saas/transportation/26b/otmol/configuration/about_the_mobile_app.htm>

Phần TCA (danh tính người – vai – quan hệ) đối chiếu theo tài liệu của chính repo (`docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md`), không kiểm lại với Oracle trong lượt này.
