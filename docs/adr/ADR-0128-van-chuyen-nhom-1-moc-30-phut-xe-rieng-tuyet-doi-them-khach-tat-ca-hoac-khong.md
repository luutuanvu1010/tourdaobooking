# ADR-0128 — Vận chuyển, nhóm 1 trong 2 điểm lệch sổ vàng: mốc ra lệnh 30 phút do Quản trị đặt; xe riêng không bao giờ ghép thêm khách lẻ; thêm khách khi xe thiếu chỗ thì giữ nguyên xe

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-17: *"duyệt cả ba theo khuyến nghị"*, hiểu là **Q1 = (a), Q2 = (a), Q3 = (a)** (ba quyết định của bản này, mỗi câu phương án khuyến nghị). Chưa thi công mã; thi công theo kế hoạch riêng, kiểm độc lập sau khi xong. *(Các chữ «proposed», «chờ duyệt» còn lại trong thân là bản đề xuất lúc soạn, giữ nguyên.)*
- **Trạng thái lúc soạn:** proposed — AI soạn, không tự duyệt (Hiến pháp N3, N9). Nguồn: lời chủ trong chat 2026-10-16 khi duyệt sổ vàng vận chuyển (`golden/van-chuyen/dieu-phoi-30-ca.json`, `golden/dieu-phoi/xe-a-b-luot-1.json`); các ca đang chạy ở dạng chờ có tên: B09 (mốc), VC-05, VC-06 (xe riêng), VC-17 (thêm khách).
- **Ngày:** 2026-10-17. **Số:** 0128 (kiểm số ở mọi nhánh: 0127 là số lớn nhất đã dùng).
- **Loại:** việc lớn (quyền, luật thi hành ở máy chủ). Cả ba quyết định **đảo được** (đổi dòng chính sách, đổi mã); không có cửa một chiều về dữ liệu. Cửa một chiều nằm ở ADR-0129 (nhóm 2).
- **Sửa/bổ sung (khi duyệt):** ADR-0049 D2 (con số mốc gieo, ai đặt); ADR-0104 mục 0b (nghĩa của «cam kết»), mục Đ2 (iv) (thêm khách). Không sửa thân ADR cũ; điều bị thay ghi ở bảng cuối.
- **Xây trên lỗ đang hở:** không. Đã rà `docs/quyen-hoan.json`: không mục nào chạm phân hệ Vận chuyển.
- **Tối đa 3 quyết định chạm quyền/dữ liệu một lượt duyệt** (CLAUDE.md §9): bản này có đúng 3 (Q1 chạm quyền, Q2 chạm luật xếp xe, Q3 chạm đồng bộ chuyến theo đơn).

## Q1. Mốc ra lệnh 30 phút, Quản trị đặt được trong cài đặt

**Hôm nay.** Mốc là dòng `vc_dispatch_policy.min_lead_minutes`, gieo **360 phút (6 giờ)**, **một con số cho cả lúc đặt đơn lẫn lúc xếp xe**. Chỉ **Toàn quyền** sửa (ô `settings.ops`); Quản trị bị 403. Dưới mốc: Bán hàng làm qua «Điều chỉnh khẩn cấp» (ô `trip.urgent_adjust`), còn khoảng nghỉ/cam kết ngoài mốc chỉ Quản trị, Toàn quyền phá lệ.

**Lời chủ 2026-10-16.** «Nới điều kiện từ 6 giờ xuống 30 phút, cụ thể hóa bằng tùy chọn trong cài đặt của Quản trị.» Sổ vàng đã ghi mốc **30 phút** (dưới mốc ⇔ còn **ít hơn** 30 phút; còn đúng 30 phút là ngoài mốc).

**Phương án**
- **(a) Khuyến nghị.** Đổi con số gieo thành 30 (dòng chính sách mới, chỉ-thêm, không sửa dòng cũ) **và** thêm một ô quyền hẹp `dispatch.policy.lead` cho Quản trị + Toàn quyền, chỉ cho sửa **hai con số mốc** (`min_lead_minutes`, `warn_lead_minutes`); các cột còn lại của chính sách (khoảng nghỉ, bắt danh sách khách…) vẫn chỉ Toàn quyền. Được: đúng lời chủ, Quản trị không chạm được các luật an toàn khác. Mất: thêm một ô quyền (nhân đôi bài «tập con quyền»).
- **(b)** Chỉ đổi con số thành 30; Toàn quyền vẫn là người duy nhất đặt. Được: không đổi quyền. Mất: chưa đúng «tùy chọn của Quản trị».
- **(c)** Giữ 6 giờ. Mất: ba ca vàng B09 và nhóm mốc vẫn lệch ý chủ.

**Hệ quả cần chủ biết.** Mốc 30 phút nghĩa là Bán hàng **xác nhận đơn và xếp xe cho chuyến chỉ còn hơn 30 phút** mà không cần ai phá lệ. Mọi chữ «6 giờ» hiện ghi cứng trong giao diện, tài liệu, trợ lý Mai phải đọc từ chính sách (thi công phải quét, có bài canh). Chuyến đã có «khoá dính» theo mốc cũ giữ nguyên nghĩa (đo theo giờ sớm nhất từng có).

**Nghiệm thu (hành vi kiểm được).** B09 chuyển từ chờ sang xanh: bấm lúc còn 31 phút → qua; còn 29 phút → phải xin phép; Quản trị đặt mốc được (200), Bán hàng, Kế toán đặt → 403; Quản trị không sửa được khoảng nghỉ (403).

## Q2. Xe riêng: không ai ghép thêm khách lẻ, kể cả khẩn cấp hay phá lệ

**Hôm nay.** Mã `CAM_KET` gồm **hai** luật nhưng chung một cờ bỏ qua (`camKetPhaLe`): R-XR «xe riêng — mọi chặng của đơn khác vi phạm» và R-CX «chặng đòi nhiều chỗ hơn xe» (`src/shared/cam-ket-xe.ts`). Lời chủ 2026-10-08 («Cho bỏ qua cả hai»): dưới mốc Bán hàng bỏ qua được kèm lý do; ngoài mốc chỉ Quản trị, Toàn quyền (ADR-0104 mục 0b).

**Lời chủ 2026-10-16** (ca VC-05, VC-06): «xe riêng không được xếp thêm, kể cả khẩn cấp»; «xe thuê riêng không bao giờ chấp nhận ghép thêm khách lẻ». **Hai lời chủ ở hai ngày khác nhau; bản này đề xuất lời sau thắng và nói rõ để chủ xác nhận.**

**Phương án**
- **(a) Khuyến nghị.** Tách R-XR khỏi cờ bỏ qua: **không ai** (kể cả Toàn quyền, kể cả khẩn cấp) xếp đơn khác vào chuyến có chặng xe riêng; R-CX (số chỗ tối thiểu) giữ như hôm nay. Được: đúng lời chủ, vẫn giữ linh hoạt cho luật số chỗ. Mất: không còn đường nhanh khi khách xe riêng đồng ý ghép (phải sửa đơn trước; **chưa kiểm** cách sửa hợp lệ, thi công phải kiểm).
- **(b)** Cả hai luật tuyệt đối. Mất: mất cả linh hoạt số chỗ tối thiểu.
- **(c)** Giữ nguyên ADR-0104 mục 0b. Mất: ca VC-05, VC-06 vẫn lệch.

**Hệ quả.** Phải đổi: cờ `camKetPhaLe` và nhãn «Trái cam kết xe riêng / số chỗ tối thiểu», sự kiện mang `CAM_KET`, tin gửi tài xế («trung tính»), kịch bản `tests/e2e/cam-ket-xe.mjs` bước 5, bài CAO-C. Chuyến đã bỏ qua trước ngày áp giữ nguyên (lịch sử không viết lại).

**Nghiệm thu.** VC-05, VC-06 chuyển xanh: dưới mốc, Bán hàng xếp đơn lẻ vào chuyến xe riêng kèm lý do → bị chặn; ngoài mốc, Quản trị và Toàn quyền → bị chặn; xếp đơn lẻ vào chuyến có ghi «số chỗ tối thiểu» vẫn bỏ qua được như cũ.

## Q3. Thêm khách mà xe không đủ chỗ cho cả phần tăng: giữ nguyên xe, đơn vẫn lưu

**Hôm nay.** ADR-0104 Đ2 (Q-2 = a): đơn tăng khách thì máy tự thêm ghế «khi còn chỗ… Không đủ chỗ thì giữ xe và báo người xếp xe». Mã diễn giải **«còn bao nhiêu chỗ thì mở bấy nhiêu»**: xe 15 chỗ đã giữ 14, đơn tăng 4 → 6 (cần 2) thì máy tự thêm **1** ghế, giữ thiếu 1 (đã quan sát bằng bài chạy thật 2026-10-16: 5 ghế mở thay vì 4).

**Lời chủ 2026-10-16** (ca VC-17): «đơn vẫn lưu (tăng lên 6), xe giữ nguyên, báo người xếp xe».

**Phương án**
- **(a) Khuyến nghị.** Tất cả hoặc không: đủ chỗ cho **cả** phần tăng thì thêm đủ; không đủ thì **không thêm ghế nào**, đơn vẫn lưu, giữ lý do «thiếu suất» để người xếp xe xử lý. Được: không có chuyến nửa vời (3 người ngồi, 1 người chờ tin). Mất: ca đơn tăng 2 mà xe còn 1 chỗ thì người xếp xe phải làm cả hai.
- **(b)** Giữ hôm nay (mở phần còn chỗ). Mất: VC-17 vẫn lệch ý chủ.

**Hệ quả.** Sửa một chỗ của `dong-bo-don` (chỉ máy chủ, không migration); bài NT-5 «xe hết chỗ (LC-02)» ở `src/modules/van-chuyen/dong-bo-chuyen-route.test.ts` đổi kỳ vọng.

**Nghiệm thu.** VC-17 chuyển xanh: đơn lưu 6, số ghế mở vẫn 4; lý do giữ «thiếu suất» hiện cho người xếp xe.

## Trang ghép (CLAUDE.md §9)

| Hỏi | Trả lời |
|---|---|
| Bảng/dữ liệu nào bị chạm? | `vc_dispatch_policy` (thêm dòng, Q1); `vc_trip_event` (nghĩa cờ `CAM_KET`, Q2); không bảng mới, không migration cấu trúc. Q1 thêm một mã quyền thao tác (không thêm mã quyền người dùng). |
| Dòng bản đồ quyền? | Q1: ô mới `dispatch.policy.lead` (Quản trị, Toàn quyền); `settings.ops` giữ. Q2: `trip.urgent_adjust`, `trip.override` mất khả năng bỏ qua R-XR. Q3: không đổi. |
| Cổng nào canh cửa nào? | Máy chủ: route sửa chính sách, các route xếp/dời/sửa chuyến. **Giao diện ẩn/hiện** đổi nghĩa: nút «Điều chỉnh khẩn cấp và lưu» và «Phá lệ và lưu» không được hiện cho luật xe riêng (`web/dieu-phoi-ui.ts`, `web/chuyen-sua.ts`); màn cài đặt thêm ô mốc cho Quản trị. |

## Bảng «Sửa câu»

| Câu cũ | Câu mới (khi duyệt) |
|---|---|
| ADR-0049 D2: «mốc 360, Toàn quyền sửa» | «mốc gieo 30; Quản trị và Toàn quyền sửa hai con số mốc; các cột khác chỉ Toàn quyền» |
| ADR-0104 mục 0b: «cam kết = xe riêng và số chỗ tối thiểu, bỏ qua cả hai» | «cam kết xe riêng không bỏ qua được; số chỗ tối thiểu bỏ qua được như cũ» |
| ADR-0104 Đ2 (iv): «không đủ chỗ thì giữ xe» (mã mở phần còn chỗ) | «không đủ chỗ cho cả phần tăng thì không thêm ghế nào» |

## Việc chủ cần làm

Trả lời ba câu **Q1, Q2, Q3** (chọn a/b/c). Khuyến nghị: **(a) cả ba**. Chưa duyệt thì sổ vàng giữ nguyên ba nhóm ca ở dạng chờ có tên, không ảnh hưởng `npm test`.
