# Vận chuyển Đợt 3–7 — câu hỏi chờ chủ sau bản vẽ (cập nhật 2026-10-02 chiều)

Nguồn: đánh giá đối chiếu 5 bản vẽ (`docs/design/van-chuyen-dot-3-7/`) với kế hoạch con + ADR; lời chủ chat 2/10 (lộ trình mẹ `2026-10-01-van-chuyen-con-lai-00-lo-trinh.md`, các mục "Lời chủ 2026-10-02").

**Cách trả lời nhanh:** "đồng ý hết khuyến nghị" — hoặc ghi số câu muốn khác. Kế hoạch con đã viết theo khuyến nghị, chỗ nào đổi thì sửa nhỏ.

🔒 = phải chốt trước khi tạo bảng dữ liệu (đổi sau rất tốn). 💰 = tiền (AI không tự chọn).

## ĐÃ TRẢ LỜI tối 2/10 (chủ, chat — có trợ lý phân tích `danh-gia/tra-loi-cau-hoi.md`, `danh-gia/so-vang.md`)

- **"Đồng ý 18 câu theo khuyến nghị"**: 0.1, 3.1–3.4, 4.1, 4.2, 4.4, 4.5, 4.8, 5.3, 6.1–6.5, 7.1, 7.2 (3.2 không thêm ô gara / tiền sửa).
- **5.2c đổi** (theo trợ lý phân tích): câu "Xe hỏng? Bấm Kết thúc gián đoạn — văn phòng nhận tin ngay và xếp xe cứu hộ" (kế hoạch 05).
- **Tiền** → ghi thành [ADR-0095](../../adr/ADR-0095-tien-xe-thue-gia-du-tuyen-co-va-ngay-dao.md): A2 (dời ngày theo yêu cầu khách ⇒ tính giá ngày mới); dòng đảo vào kỳ dòng gốc; giá bắt buộc đủ tuyến + cỡ xe; C1 phí huỷ ghi ngày huỷ; V7 phụ thu chờ ghi theo ngày chạy; V10 lý do "Xe hỏng giữa đường"; V11 giá mới không áp chuyến đã chụp; D1 đổi tuyến ⇒ thoả thuận hết hiệu lực; 4.3 có hiện số; 4.6 Kế toán ký sổ vàng; 4.7 có ghi phí huỷ cho nhà xe cũ; V13 ok.
- **5.2b**: *"Không phân biệt giờ hành chính hay ngoài giờ hành chính, mọi người đều có thể làm việc của mình theo đúng quy định"* ⇒ giữ: ô giá thoả thuận cứu hộ chỉ Quản trị / Kế toán / Toàn quyền; không làm cơ chế trực riêng.
- **Còn mở:** 0.2 (chia doanh thu taxi — phải xong TRƯỚC Đợt 6; thêm điểm e–h: taxi qua cổng "thiếu giá" thế nào, % có đảo câu ADR-0057 "không giá vốn a%" không, taxi chở một đơn hay ghép, taxi có thu tiền mặt không).

## Đã chốt chiều 2/10 (không hỏi lại)

- Thu gọn Đợt 5: làm D5 (văn phòng thêm điểm / báo huỷ), D5b (tài xế bổ sung tên), D5c đơn giản (văn phòng tạo chuyến cứu hộ). **Hoãn tới mốc** (≈ ≥ 15 xe đối tác hoặc > 40 chuyến/ngày): D4 (tài xế nhờ xe khác, hộp duyệt, bảng kiểm luật), V4. ⇒ câu cũ 5.1, 5.2a, 5.2d, 5.4, 5.5, 5.6a, 5.6b, 5.7 **không hỏi nữa** (để lúc làm phần hoãn).
- Hợp tác xã: văn phòng giao chuyến **+** tài xế rảnh tự nhận chuyến (ADR mới khi tới mốc).
- Toạ độ điểm đón / trả: chủ muốn "trường linh động"; Hiến chương 5.2 cấm flexfield ⇒ chủ trả lời "ok" sau khi AI đề xuất **cách A: bảng phụ có kiểu** (vĩ độ, kinh độ, nguồn; không bắt buộc) — AI hiểu "ok" = chọn A (xem câu 0.1 để xác nhận).

## Câu chung

- **0.1** 🔒 Toạ độ = **bảng phụ có kiểu** (A). Xác nhận? (Khác: B sửa Hiến chương 5.2; C chưa làm.) Cần soạn ADR nhỏ trước migration.
- **0.2** 💰 Chia doanh thu với taxi đối tác — **ĐÃ TRẢ LỜI 5/10 (a–c; d hoá đơn/thuế còn mở) — xem lộ trình "Lời chủ 5/10".** **Khuyến nghị cũ:** làm sau bằng ADR riêng, sổ riêng (không chen bảng chi phí xe thuê). Trước ADR cần chủ chốt: (a) % trên giá bán chặng hay sau phí; (b) ai thu tiền khách; (c) trả theo chuyến hay theo kỳ; (d) hợp đồng / hoá đơn / thuế (hỏi Kế toán).

## Đợt 3 — Lịch xe bận (trang lịch tuần)

- **3.1** Lưới tuần hiện cả chuyến đã xếp — ô riêng, chỉ mã CX-… + giờ, không mã đơn / tên khách; chuyến KHÔNG lưu vào lịch bận (ADR-0055). **Khuyến nghị: có.**
- **3.2** 🔒 Lý do bận chọn từ danh mục (Bảo dưỡng, Đăng kiểm, Sửa chữa, Khác), không gõ tự do. **Khuyến nghị: danh mục.**
- **3.3** Thêm ô "Đến ngày" (xe vào xưởng nhiều ngày; "Cả ngày" không hở 1 phút). **Khuyến nghị: thêm.**
- **3.4** Ai mở trang: **khuyến nghị: Quản trị + Toàn quyền.**

## Đợt 4 — Tiền xe thuê (máy chủ đã xong, chờ giao diện)

- **4.1** Nút "Tải bảng kê" — **khuyến nghị: chưa làm lượt này.**
- **4.2** Cột "Điều chỉnh" ở bảng kê = số tiền (máy chủ tính). **Khuyến nghị: theo bản vẽ.**
- **4.3** 💰 Gợi ý "Bảng giá vừa có giá 450.000 ₫…" (trường mới, chỉ trong phản hồi chi phí chuyến). **Khuyến nghị: làm.**
- **4.4** Bán hàng KHÔNG thấy dải "chưa có giá" (vẫn thấy lý do giữ, không số). **Khuyến nghị: không thấy.**
- **4.5** Nền thanh bên toàn app = màu nền trang (#eaf2f8) + viền phải (lời chủ). **Khuyến nghị: làm** (production chưa có ghi đè nền thanh bên — đã kiểm).
- **4.6** 💰 **Bạn hoặc Kế toán xác nhận 19 ca sổ vàng** `golden/van-chuyen-chi-phi.json` (V1–V14b) — việc của người.
- **4.7** 💰 Chuyến đã đổi từ xe nhà xe sang xe công ty (chưa huỷ): ghi phí cho nhà xe cũ? **Khuyến nghị: chặn** (chuyến đã huỷ vẫn ghi phí huỷ).
- **4.8** Thêm dòng trạng thái ADR-0057 "dời ngày chạy thì tính lại giá" trỏ lời chủ 1/10. **Khuyến nghị: thêm** (sửa ADR cần bạn bấm cho phép).

## Đợt 5 — Xe đang chạy (phần còn làm)

- **5.2b** 💰 Cứu hộ: danh sách chỉ xe có tài xế dùng app; xe nhà xe đi "Tạo chuyến cứu hộ" của văn phòng; ô giá thoả thuận chỉ Quản trị / Kế toán / Toàn quyền. **Khuyến nghị: như trên.**
- **5.2c** Câu "Văn phòng sẽ được báo ngay" → "Tài xế xe được chọn sẽ nhận tin; nếu không ai nhận, bấm Kết thúc gián đoạn để văn phòng xếp xe khác." **Khuyến nghị: đổi câu** (không thêm người nhận tin).
- **5.3** Tài xế thấy giờ đón + tổng khách, không tách người lớn / trẻ em. **Khuyến nghị: như trên.**

## Đợt 6 — Tài xế đối tác (taxi / nhà xe)

- **6.1** Chỉ tổng số khách. **Khuyến nghị: có.**
- **6.2** Dải "Tài xế bận" bỏ hẳn lý do (màn + dữ liệu + câu 409). **Khuyến nghị: bỏ.**
- **6.3** 🔒 Thêm ô "Số điện thoại văn phòng" vào Chính sách điều phối (cột mới). **Khuyến nghị: thêm.**
- **6.4** Không làm kéo thả; câu chặn ở ô chọn tài xế. **Khuyến nghị: có.**
- **6.5** Tên mục "Cuốc của tôi"; nút Xuất bến giữ màu hiện tại. **Khuyến nghị: có.**

## Đợt 7 — Xe riêng / số chỗ tối thiểu

- **7.1** Chỉ chen hai ô vào form đưa đón có sẵn (không làm lại form). **Khuyến nghị: có.**
- **7.2** Ai xem chặng trên trang đơn thấy nhãn "Xe riêng / ≥ N chỗ"; tài xế không nhận. **Khuyến nghị: có.**

## Câu không chặn (để biết)

- Tài khoản lai Đối tác + vai văn phòng nhận tín hiệu "chuyến vừa đổi" (chỉ mã chuyến). Muốn loại ⇒ ADR. **Khuyến nghị: giữ.**
- Hệ thống thật đang bật bảo trì tới 05/10 — không do phiên Vận chuyển; chủ kiểm có chủ ý không.

Chi tiết từng câu (lý do, hệ quả nếu chọn khác) + bảng lệch từng màn: `docs/design/van-chuyen-dot-3-7/danh-gia/dot-N.md` (mã câu trong đó là mã cũ trước khi gom — Đợt 5 câu Q1–Q7 ứng với 5.1–5.7 ở đây).
