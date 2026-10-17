# ADR-0129 — Vận chuyển, nhóm 2 trong 2 điểm lệch sổ vàng: nới luật cứng «không chéo xe–tài xế» (LC-13) và «không vượt số chỗ» (LC-02)

- **Trạng thái:** **proposed — chờ chủ dự án duyệt.** AI soạn, không tự duyệt (Hiến pháp N3, N9). Nguồn: lời chủ trong chat 2026-10-16 khi duyệt 24 bước điều phối lượt 1 (`golden/dieu-phoi/xe-a-b-luot-1.json`): bước **B04** và **B06**, hiện chạy ở dạng chờ có tên.
- **Ngày:** 2026-10-17. **Số:** 0129 (0127 là số lớn nhất đã dùng ở mọi nhánh khi soạn).
- **Loại:** việc lớn (dữ liệu, luật cứng có trigger ở cơ sở dữ liệu). **Tách khỏi ADR-0128 vì hai quyết định này đụng trigger = cửa một chiều về cách dữ liệu được bảo vệ**, và CLAUDE.md §9 giới hạn 3 quyết định chạm dữ liệu mỗi lượt duyệt. Nên duyệt **sau** ADR-0128.
- **Sửa/bổ sung (khi duyệt):** ADR-0048 «Không chéo xe và tài xế» (Q6 = a, câu «nới sau phải bằng ADR mới» — đây chính là ADR đó); ADR-0049 LC-02 và LC-13. Không sửa thân ADR cũ.
- **Xây trên lỗ đang hở:** không có lỗ ghi trong `docs/quyen-hoan.json` ở vùng này. **Nhưng** mục **HC-5.19** (chưa diễn tập khôi phục dữ liệu, đã gia hạn) đứng sau mọi migration đổi trigger: nếu duyệt, lưới an toàn duy nhất khi migration hỏng là điểm khôi phục Time Travel ghi trước khi áp.
- **Tôi nói thẳng trước:** hai điều này khác nhau về bản chất. LC-13 là **quy tắc nội bộ do chủ đặt** (nới được bằng ADR). LC-02 là **giới hạn số người trên xe**, liên quan quy định an toàn giao thông (xem `reference-quy-dinh-van-tai-khach`: tra ngày 2026-09-27, mức tin cậy trung bình, **chưa có người chuyên môn xác nhận**). Tôi không có căn cứ pháp lý để khuyên bỏ giới hạn thứ hai.

## Q4. Tài xế công ty được lái xe của nhà xe thuê (bước B04)

**Hôm nay (LC-13).** Xe của nhà xe X chỉ do tài xế thuộc X lái; tài xế đối tác chỉ lái xe nhà xe mình, không lái xe công ty; tài xế công ty chỉ lái xe công ty. Chặn ở **trigger** (đọc `v_pty_carrier_driver`) lẫn máy chủ (mã `CHEO_XE_TAI_XE`). Ví dụ sổ vàng: xe Minh Phát 45 chỗ giao tài xế công ty → bị chặn.

**Lời chủ 2026-10-16:** «cho phép nếu đủ điều kiện về giấy phép lái xe, có cảnh báo».

**Phương án**
- **(a) Khuyến nghị.** Nới **một chiều đúng ca của chủ**: tài xế công ty được lái xe nhà xe thuê khi **đủ ba điều kiện**: hạng bằng đủ cho số chỗ của xe (bảng `vc_license_capacity`), xe đủ giấy tờ bắt buộc còn hạn, và **chuyến mang cảnh báo «chéo xe–tài xế»** ở chi tiết chuyến, lịch và nhật ký. Chiều ngược (tài xế đối tác lái xe công ty, hoặc xe nhà xe khác) **vẫn chặn**. Được: đúng ca B04, giữ rào ở chiều rủi ro hơn. Mất: trigger LC-13 phải viết lại (migration), thêm một mã cảnh báo.
- **(b)** Nới cả hai chiều. Mất: tài xế đối tác lái xe công ty làm mờ trách nhiệm bảo hiểm và tiền xe thuê.
- **(c)** Giữ nguyên. Mất: B04 vẫn lệch ý chủ.

**Điểm tôi chưa biết, cần chủ trả lời nếu chọn (a):** bảo hiểm trách nhiệm dân sự của xe thuê có bao tài xế không thuộc nhà xe không? Sổ tiền xe thuê (ADR-0057) vẫn chụp giá của nhà xe cho chuyến đó hay chuyển thành giá khác? Tôi giả định giá giữ nguyên (chuyến vẫn dùng xe của nhà xe), cần chủ xác nhận.

**Nghiệm thu.** B04 chuyển xanh: tài xế công ty bằng D2 + xe 45 chỗ nhà xe đủ giấy tờ → cho qua **kèm** cảnh báo; bằng D1 → chặn `HANG_BANG_KHONG_DU` như cũ; xe thiếu bảo hiểm → giữ; tài xế đối tác + xe công ty → vẫn chặn (cả trigger lẫn máy chủ); chèn tay bằng SQL tổ hợp chiều bị cấm → trigger vẫn RAISE.

## Q5. Xếp quá số chỗ của xe (bước B06)

**Hôm nay (LC-02).** Tổng suất `WAITING` + `BOARDED` ≤ số chỗ của xe, mọi lúc. Trigger ở suất, ở đổi xe, ở giảm số chỗ/ngừng xe; câu báo bằng lời ở máy chủ. Ví dụ: xe 15 chỗ đã xếp 12, xếp thêm 4 (thành 16) → bị chặn `VUOT_SO_CHO`.

**Lời chủ 2026-10-16:** «cho qua nhưng cảnh báo».

**Phương án**
- **(a) Khuyến nghị: giữ chặn.** Lý do: đây là giới hạn người ngồi trên xe, không phải quy tắc quản lý; cho vượt, kể cả có cảnh báo, làm văn phòng có thể ra lệnh chở quá số người mà hệ thống đã ghi nhận là biết. Nếu chủ muốn có đường thoát cho tình huống thật (ví dụ em bé dưới 2 tuổi không chiếm ghế), làm bằng quy tắc đếm người (nhỏ, hỏi riêng), không bằng bỏ giới hạn.
- **(b)** Cho vượt có điều kiện hẹp: chỉ nhóm tuổi do chủ chỉ định không tính vào số chỗ (trigger đếm lại theo nhóm tuổi). Được: giải quyết nhu cầu thật mà vẫn giữ trần. Mất: thêm khái niệm «người không chiếm ghế» vào cả sổ khách lẫn đơn; cần quy định tuổi do người chuyên môn xác nhận.
- **(c)** Cho vượt mọi trường hợp kèm cảnh báo (đúng lời chủ). Được: đúng ý. Mất: gỡ trigger LC-02 (cửa một chiều: chuyến đã vượt không còn chỗ để đưa về lại hợp lệ), rủi ro pháp lý do chủ chịu; **cần người chuyên môn xác nhận trước khi duyệt**.

Tôi **không chọn (c) thay chủ**: nếu chủ vẫn muốn (c) thì ghi rõ «chủ chịu trách nhiệm, đã được nói về rủi ro» (Hiến pháp P18).

**Nghiệm thu.** (a): B06 đổi đáp án vàng thành «chặn» (chủ xác nhận lại). (b): thêm ca vàng đếm người theo nhóm tuổi, chủ xác nhận từng ca. (c): B06 xanh, cảnh báo «vượt số chỗ» hiện ở chi tiết chuyến, lịch, nhật ký.

## Trang ghép (CLAUDE.md §9)

| Hỏi | Trả lời |
|---|---|
| Bảng/dữ liệu nào bị chạm? | `vc_trip_driver` (trigger LC-13, Q4), `vc_trip_allocation` (trigger LC-02 và đổi xe, Q5), `vc_license_capacity` (dùng lại, không đổi), `vc_trip_event` (mã cảnh báo mới). Cần một migration viết lại trigger mỗi quyết định được duyệt. |
| Dòng bản đồ quyền? | Không đổi ô nào. Tài xế đối tác (`DRIVER_PARTNER`, ADR-0053) vẫn không thấy chuyến ngoài nhà xe mình; tài xế công ty (`DRIVER`) bắt đầu thấy chuyến trên xe nhà xe nếu (a). |
| Cổng nào canh cửa nào? | Cơ sở dữ liệu (trigger) **và** máy chủ (`kiemTaoSuaChuyen`, `kiemXep`); **giao diện** đổi nghĩa: danh sách tài xế được chọn khi lập chuyến (hiện lọc theo nhà xe) và hộp «Phá lệ» không được hiện cho LC-02 nếu chọn (a). |

## Bảng «Sửa câu»

| Câu cũ | Câu mới (khi duyệt) |
|---|---|
| ADR-0048: «Tài xế công ty chỉ lái xe công ty.» | (a): «Tài xế công ty lái được xe nhà xe thuê khi đủ hạng bằng, đủ giấy tờ, kèm cảnh báo.» |
| ADR-0049 LC-02: «Tổng suất ≤ số chỗ của xe, mọi lúc» | (a): giữ; (b): thêm ngoại lệ nhóm tuổi; (c): «vượt số chỗ được kèm cảnh báo» |

## Việc chủ cần làm

Trả lời **Q4** (a/b/c) và **Q5** (a/b/c), kèm hai điểm tôi chưa biết ở Q4 nếu chọn (a). Khuyến nghị: **Q4 (a)**, **Q5 (a)**. Chưa duyệt thì B04, B06 giữ dạng chờ có tên, `npm test` không đỏ.
