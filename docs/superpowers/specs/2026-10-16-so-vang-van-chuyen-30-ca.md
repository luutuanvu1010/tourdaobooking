# Sổ vàng vận chuyển: 30 ca mới để chủ duyệt

Ngày 2026-10-16. Hồ sơ có ngày. Thay bản đề xuất 22 ca cùng ngày (`2026-10-16-so-vang-van-chuyen-ca-moi-de-xuat.md`); bản kia giữ nguyên làm vết. Phần 24 bước lượt 1 đọc ở `2026-10-16-so-vang-dieu-phoi-luot-1-ban-doc.md`.

**Chưa có ca nào vào `golden/`.** Bạn đọc, sửa chữ hoặc số nào chưa đúng ý, rồi nói «duyệt». Chỉ sau đó tôi mới chép sang tệp JSON và viết bài chạy.

## Cách đọc mỗi ca

Mỗi ca có năm phần:
1. **Bối cảnh**: chuyện gì đang xảy ra, ai làm.
2. **Dữ liệu**: số liệu cụ thể (giờ, số chỗ, số khách).
3. **Câu hỏi**: hệ thống phải trả lời thế nào.
4. **Đáp án**: kết quả mong đợi, kèm phép tính nếu có.
5. **Cơ sở**: đáp án lấy từ đâu và đã kiểm đến mức nào.

Ba mức kiểm ở dòng **Cơ sở**:
- **[Máy 16/10]**: tôi đã chạy luật thuần của Nền tảng với đúng số liệu ghi ở ca, kết quả khớp đáp án.
- **[E2E]**: kịch bản chạy thử trên máy chủ thật (D1 tạm) đã xanh sáng 16/10 khi triển khai; đáp án khớp điều kịch bản kiểm.
- **[ADR]**: đáp án theo chữ của bạn trong quyết định đã duyệt; hiện chưa có bài máy chạy ca này. Khi viết bài mà mã làm khác, tôi báo bạn, không sửa đáp án cho khớp mã.

## Thông số dùng chung (chính sách đang áp)

| Thông số | Giá trị | Công thức dùng trong ca |
|---|---|---|
| Mốc ra lệnh | 360 phút (6 giờ) | «dưới mốc» ⇔ (giờ xét − bây giờ) **<** 360 phút. Còn đúng 360 là ngoài mốc |
| Nghỉ giữa hai chuyến cùng xe | 30 phút | nghỉ = giờ xuất bến chuyến sau − giờ kết thúc thật chuyến trước; thiếu nếu < 30 |
| Cửa sổ xuất bến | 720 phút (12 giờ) | được xuất bến từ (giờ khởi hành − 720 phút) |
| Giờ lái tối đa mỗi ngày | 480 phút (8 giờ) | tổng thời lượng các chuyến của tài xế trong ngày; vượt nếu **>** 480 |
| Chuyến dài cần nghỉ | 240 phút (4 giờ) | nhắc nếu thời lượng một chuyến **>** 240 |
| Hạn từ chối của tài xế đối tác | 720 phút (12 giờ) trước giờ khởi hành | mặc định theo migration 0092 |

Hạng bằng: B chở tới 8 khách, D1 tới 16, D2 tới 29, D không giới hạn.

Hai số «giờ lái 8 giờ» và «nghỉ liên tục 4 giờ» là mặc định của hệ thống, chưa có văn bản nào của bạn chốt riêng. Khi bạn duyệt ca 24 đến 28 tức là bạn chấp nhận hai số này làm đáp án vàng. Muốn số khác thì sửa ngay ở các ca đó.

**Nhân vật dùng chung:** xe A 15 chỗ, xe B 29 chỗ, xe Minh Phát (nhà xe) 45 chỗ; tài xế A có bằng D1; chuyến mẫu CX-3009-07 xuất bến 05:50 ngày 30/09.

---

## NHÓM 1. Mốc 6 giờ và điều chỉnh khẩn cấp (8 ca)

### Ca 1. Dưới mốc, Bán hàng đổi xe

**Bối cảnh:** Chuyến CX-3009-07 xuất bến 05:50 ngày 30/09. Lúc 03:00 sáng cùng ngày, khách đổi kế hoạch, Bán hàng muốn đổi xe cho chuyến.

**Dữ liệu:**
- Còn lại: 05:50 − 03:00 = 170 phút
- So với mốc: 170 < 360, nên chuyến **dưới mốc**
- Người làm: Bán hàng

**Câu hỏi:** Bán hàng đổi xe được không, và cần gì?

**Đáp án:**
1. Lần gửi đầu, chưa nêu lý do: **bị chặn**, máy hỏi lý do nghiệp vụ.
2. Chọn lý do rồi gửi lại: **được**.
3. Chuyến mang nhãn «điều chỉnh khẩn cấp» ở chi tiết và ở lịch; có một dòng nhật ký ghi ai, lý do gì, lúc nào.

**Cơ sở:** [E2E] kịch bản `dieu-chinh-khan-cap` bước (1); ADR-0104 Đ1.

### Ca 2. Ngoài mốc, Bán hàng đổi xe

**Bối cảnh:** Cũng chuyến CX-3009-07, nhưng lúc 21:00 ngày 29/09 (hôm trước). Bán hàng muốn đổi xe.

**Dữ liệu:**
- Còn lại: 21:00 → 05:50 hôm sau = 530 phút
- 530 ≥ 360, nên chuyến **ngoài mốc**

**Câu hỏi:** Bán hàng có tự đổi xe bằng đường khẩn cấp được không?

**Đáp án:**
1. Bán hàng **không** được, kể cả khi gửi kèm lý do (bị từ chối quyền).
2. Quản trị làm được; chuyến **không** mang nhãn khẩn cấp (vì không sát giờ).

**Cơ sở:** [E2E] `dieu-chinh-khan-cap` bước (2); ADR-0104 Đ1 mục 0b («chỉ khi chuyến còn dưới 6 giờ»).

### Ca 3. Đúng biên 360 phút

**Bối cảnh:** Bán hàng xếp một chặng thường (2 người) vào chuyến xuất bến 05:50 ngày 30/09. Ba thời điểm bấm khác nhau một phút.

**Dữ liệu:**
- Bấm lúc 23:49 ngày 29/09: còn 361 phút
- Bấm lúc 23:50: còn đúng 360 phút
- Bấm lúc 23:51: còn 359 phút

**Câu hỏi:** Lúc nào cần phá lệ?

**Đáp án:**
1. 23:49 (361 phút): cho qua.
2. 23:50 (360 phút): cho qua, vì «dưới mốc» là **nhỏ hơn** 360, đúng 360 chưa tính.
3. 23:51 (359 phút): cần xin phép (mã `MOC_TOI_THIEU`).

**Cơ sở:** [Máy 16/10] chạy `kiemXep` đúng ba số liệu này.

### Ca 4. Một lệnh vừa dời giờ vừa vượt khoảng nghỉ

**Bối cảnh:** Xe A có chuyến 1 kết thúc thật lúc 07:50. Chuyến 2 dự kiến xuất bến 12:00, tức còn hơn 6 giờ khi Bán hàng mở màn hình lúc 04:00 sáng. Trong **cùng một lệnh sửa chuyến**, Bán hàng dời chuyến 2 lên 08:10.

**Dữ liệu:**
- Chuyến 2 trước lệnh: 12:00 − 04:00 = 480 phút (ngoài mốc)
- Chuyến 2 sau lệnh: 08:10 − 04:00 = 250 phút (dưới mốc)
- Nghỉ giữa hai chuyến: 08:10 − 07:50 = 20 phút (< 30, thiếu)

**Câu hỏi:** Bán hàng làm được không?

**Đáp án:**
1. Giờ xét mốc của lệnh sửa = nhỏ nhất của (giờ cũ, giờ mới, giờ sớm nhất từng có) = 08:10.
2. 250 < 360, nên lệnh này tính là **sát giờ**.
3. Bán hàng **làm được**, kèm lý do; chuyến mang nhãn khẩn cấp.

**Cơ sở:** [ADR] ADR-0104 Đ1 mục 0, «ca một lệnh, chốt cách (a)». Chưa có bài máy chạy riêng ca này.

### Ca 5. Dưới mốc, chuyến xe riêng, Bán hàng xếp thêm

**Bối cảnh:** Đoàn A đặt **xe riêng** (cam kết chỉ chở đoàn mình). Chuyến sát giờ, còn 170 phút. Bán hàng xếp thêm một đơn lẻ của khách khác vào xe đó.

**Dữ liệu:**
- Còn lại: 170 phút (dưới mốc)
- Xếp thêm: đơn thường 2 khách, vào chuyến xe riêng

**Câu hỏi:** Có được không?

**Đáp án:**
1. Không kèm điều chỉnh khẩn cấp: **bị chặn**, máy báo lớp khẩn cấp.
2. Kèm điều chỉnh khẩn cấp và lý do: **được**; cột «trái cam kết xe riêng» được ghi.

**Cơ sở:** [E2E] `cam-ket-xe` bước (5); ADR-0104 Đ1 mục 0b.

### Ca 6. Ngoài mốc, xe riêng, Quản trị xếp thêm

**Bối cảnh:** Như ca 5 nhưng chuyến còn hơn 6 giờ, người xếp là Quản trị, chuyến đã có tài xế.

**Dữ liệu:**
- Còn lại: 530 phút (ngoài mốc)
- Quản trị gửi kèm cờ «phá lệ cam kết»

**Câu hỏi:** Ai biết, ai không biết chuyện này?

**Đáp án:**
1. Quản trị xếp được; sự kiện mang mã `CAM_KET`.
2. Tài xế đang lái nhận **đúng một tin**, câu trung tính (không chữ «khẩn cấp», không «6 giờ»).
3. Người làm (Quản trị) và Bán hàng **không** nhận tin; có gõ cửa tới tài xế.

**Cơ sở:** [E2E] `dieu-chinh-khan-cap` / ca CAO-C, kịch bản `tin-chuyen`.

### Ca 7. Người không có quyền không bấm được

**Bối cảnh:** Chuyến dưới mốc. Một Kế toán thử bấm «Điều chỉnh khẩn cấp» đổi xe.

**Dữ liệu:**
- Quyền điều chỉnh khẩn cấp: chỉ Bán hàng, Quản trị, Toàn quyền
- Người làm: Kế toán

**Câu hỏi:** Kết quả?

**Đáp án:**
1. **Từ chối** (không đủ quyền).
2. Không ghi thay đổi nào, không có dòng nhật ký điều chỉnh.

**Cơ sở:** [E2E] `dieu-chinh-khan-cap` bước (1) ghi «Kế toán 403 không ghi».

### Ca 8. Dấu «Đặt gấp» không làm chuyến hết «dưới mốc»

**Bối cảnh:** Quản trị đã bấm «Đặt gấp» cho một chặng. Chuyến chứa chặng đó vẫn còn 170 phút tới giờ xuất bến, và Bán hàng muốn đổi tài xế cho cả chuyến.

**Dữ liệu:**
- Chặng có dấu «Đặt gấp»
- Chuyến còn 170 phút (< 360)

**Câu hỏi:** Dấu đặt gấp có miễn luật mốc cho việc đổi tài xế không?

**Đáp án:**
1. **Không.** Dấu đặt gấp chỉ miễn luật mốc cho lệnh **xếp** và **dời đến** của chính chặng đó.
2. Đổi tài xế vẫn là lệnh dưới mốc: Bán hàng cần điều chỉnh khẩn cấp kèm lý do.

**Cơ sở:** [ADR] ADR-0104 Đ1 mục 0 («dấu đặt gấp không làm chuyến thôi dưới mốc»). Phần xếp được đặt gấp miễn mốc đã có ở sổ lượt 1 (B10).

---

## NHÓM 2. Sức chứa, hạng bằng, giấy tờ xe (5 ca)

### Ca 9. Xếp vừa khít số chỗ

**Bối cảnh:** Xe A 15 chỗ đã có 12 người. Văn phòng xếp thêm chặng Amiana 3 người (lúc 20:00 hôm trước, ngoài mốc).

**Dữ liệu:** 12 + 3 = 15; số chỗ 15.

**Câu hỏi:** Có được không?

**Đáp án:** **Cho qua**, vì 15 ≤ 15. (Xếp 4 người, thành 16 > 15, bị chặn `VUOT_SO_CHO`; đó là bước B06 của lượt 1.)

**Cơ sở:** [Máy 16/10] `kiemXep`: 15/15 cho qua; 16/15 chặn `VUOT_SO_CHO`.

### Ca 10. Tài xế bằng D1, xe 16 chỗ

**Bối cảnh:** Văn phòng tạo chuyến với xe 16 chỗ cho tài xế có bằng D1.

**Dữ liệu:** D1 chở tối đa 16 khách; xe 16 chỗ.

**Câu hỏi:** Có được không?

**Đáp án:** **Cho qua**, vì 16 ≤ 16.

**Cơ sở:** [Máy 16/10] `kiemTaoSuaChuyen`.

### Ca 11. Tài xế bằng D1, xe 17 chỗ

**Bối cảnh:** Như ca 10, nhưng xe 17 chỗ.

**Dữ liệu:** D1 chở tối đa 16; xe 17 chỗ.

**Câu hỏi:** Có được không?

**Đáp án:** **Chặn**, vì 17 > 16 (mã `HANG_BANG_KHONG_DU`).

**Cơ sở:** [Máy 16/10] `kiemTaoSuaChuyen`.

### Ca 12. Kiểm định xe hết hạn từ hôm trước

**Bối cảnh:** Chuyến chạy ngày 30/09. Giấy kiểm định xe A hết hạn ngày 29/09. Tài xế bấm Xuất bến.

**Dữ liệu:**
- Hạn kiểm định: 29/09
- Ngày chạy: 30/09
- 29/09 < 30/09, nghĩa là đã quá hạn một ngày

**Câu hỏi:** Xuất bến được không?

**Đáp án:** **Bị giữ**, lý do «xe thiếu giấy tờ bắt buộc» (mã `DIEU_KIEN_GIAY_TO_XE`), Quản trị xử lý.

**Cơ sở:** [Máy 16/10] `kiemXuatBen`.

### Ca 13. Kiểm định hết hạn đúng ngày chạy

**Bối cảnh:** Như ca 12, nhưng giấy hết hạn **đúng ngày 30/09**.

**Dữ liệu:** Hạn 30/09; ngày chạy 30/09.

**Câu hỏi:** Xuất bến được không?

**Đáp án:** **Đạt.** Giấy còn hiệu lực hết ngày hạn; chỉ từ 01/10 mới coi là hết.

**Cơ sở:** [Máy 16/10] `kiemXuatBen` (hạn 30/09 hoặc 01/10 đều đạt, hạn 29/09 bị giữ).

---

## NHÓM 3. Đồng bộ chuyến theo đơn và số người của chặng (5 ca)

Luật chung (ADR-0104 Đ2, bạn chọn «máy tự thêm ghế khi còn chỗ»): khi Bán hàng đổi khách trên **đơn**, máy tự chỉnh ghế trên **chuyến** trong cùng một lần ghi, không phải xin phá lệ mốc.

### Ca 14. Bớt khách sát giờ

**Bối cảnh:** Đơn ĐH-1001 có 4 khách ở Sheraton, đã xếp xe A. Lúc 04:30 ngày 30/09 (sát giờ 05:50), 2 khách báo không đi. Bán hàng bớt đơn từ 4 xuống 2.

**Dữ liệu:**
- Số khách: 4 → 2
- Còn 80 phút tới xuất bến (dưới mốc)

**Câu hỏi:** Ghế trên chuyến có tự giải phóng không, có vướng khoá mốc không?

**Đáp án:**
1. Máy tự **trả 2 ghế** (4 − 2 = 2 ghế bỏ).
2. **Không** vướng khoá giờ.
3. Số chỗ đã xếp của xe A giảm đúng 2.

**Cơ sở:** [ADR] ADR-0104 Đ2 (lời chủ Q-2). Kịch bản `dong-bo-chuyen` đã kiểm cơ chế tương tự (đổi khách, tăng khách, huỷ đơn) nhưng chưa có ca «bớt» riêng, nên ca này chưa có bài máy.

### Ca 15. Huỷ cả đơn

**Bối cảnh:** Như ca 14 nhưng Bán hàng **huỷ cả đơn** ĐH-1001.

**Dữ liệu:** 4 ghế đang giữ trên chuyến.

**Câu hỏi:** Ghế xử lý ra sao?

**Đáp án:**
1. Máy tự **đóng cả 4 ghế** (lý do «gỡ khỏi chuyến») cùng một lô với lệnh huỷ đơn; không còn lý do giữ «đơn đã huỷ».
2. Nhật ký máy ghi không có tên khách.
3. Nếu chuyến **đang chạy** thì máy **không đổi ghế nào**; hệ thống chỉ nhắc «Báo huỷ» để tài xế biết, chuyến không đổi phiên bản.
4. Nếu đơn thua tranh chấp (có người sửa trước) thì không ghế nào bị đóng (ADR).

**Cơ sở:** [E2E] `dong-bo-chuyen` (3), (4), (5); ý 4 theo [ADR] ADR-0104 Đ2 mục 2.

### Ca 16. Thêm khách, xe còn chỗ

**Bối cảnh:** Xe A 15 chỗ đang có 12 người. Đơn ĐH-1001 tăng từ 4 lên 6 khách.

**Dữ liệu:**
- Cần thêm: 6 − 4 = 2 ghế
- Chỗ còn: 15 − 12 = 3
- 2 ≤ 3

**Câu hỏi:** Máy có tự thêm ghế không?

**Đáp án:** Máy **tự thêm đúng 2 ghế**, trên đúng xe đó, cùng điểm đón. Không thêm nhiều hơn số vừa tăng.

**Cơ sở:** [E2E] `dong-bo-chuyen` (2): Hướng dẫn viên tăng đơn 2 → 3 thì máy mở thêm đúng 1 suất (ca này dùng số 4 → 6, cùng cơ chế); ADR-0104 Đ2 (lời chủ Q-2 = a).

### Ca 17. Thêm khách, xe hết chỗ

**Bối cảnh:** Như ca 16, nhưng xe A đang có 14 người.

**Dữ liệu:**
- Cần thêm: 2 ghế
- Chỗ còn: 15 − 14 = 1
- 2 > 1

**Câu hỏi:** Máy xử lý ra sao?

**Đáp án:**
1. Máy **không tự thêm**, giữ nguyên xe cũ.
2. Báo người xếp xe để xử lý (xếp thêm xe hay đổi xe).

Chưa đối chiếu: lệnh tăng khách trên đơn có bị chặn hay vẫn lưu khi xe hết chỗ. ADR chỉ nói «giữ xe và báo người xếp xe». Bạn cho biết ý bạn, tôi ghi vào đáp án.

**Cơ sở:** [ADR] ADR-0104 Đ2 («không đủ chỗ thì giữ xe và báo người xếp xe»). Chưa có bài máy.

### Ca 18. Xếp nhiều suất hơn số người của chặng

**Bối cảnh:** Chặng Amiana của đơn ĐH-1002 chỉ có **2 người**. Văn phòng xếp chặng này vào xe A (đang 12/15, lúc 20:00 hôm trước) nhưng nhập nhầm **3 suất**.

**Dữ liệu:**
- Số người của chặng: 2
- Số suất xếp mới: 3
- Chỗ xe: 12 + 3 = 15 ≤ 15 (xe vẫn đủ chỗ)

**Câu hỏi:** Có được không?

**Đáp án:** **Chặn**, vì 3 > 2 (mã `VUOT_SO_NGUOI_CHANG`). Xe còn chỗ nhưng không được xếp nhiều hơn số người của chặng.

**Cơ sở:** [Máy 16/10] `kiemXep`.

---

## NHÓM 4. Tài xế đối tác từ chối và báo bận (5 ca)

### Ca 19. Tài xế đối tác từ chối trong hạn

**Bối cảnh:** Chuyến CX-3009-12 xuất bến 07:30 ngày 30/09, giao cho tài xế đối tác của nhà xe Minh Phát. Lúc 18:00 ngày 29/09, tài xế bấm «Từ chối» và chọn một lý do trong danh sách.

**Dữ liệu:**
- Hạn từ chối: 07:30 − 720 phút = 19:30 ngày 29/09
- Bây giờ: 18:00 < 19:30, còn trong hạn

**Câu hỏi:** Chuyện gì xảy ra, ai nhận tin?

**Đáp án:**
1. Lệnh được chấp nhận; có **một** dòng nhật ký, không ghi tên khách.
2. Chuyến về trạng thái **chưa có tài xế**.
3. Quản trị và Toàn quyền nhận tin «đã từ chối, cần xếp người khác» (không tên tài xế, không lý do).
4. Kế toán và tài xế khác **không** nhận tin.
5. Bấm lại cùng lệnh: vẫn 200, không ghi thêm.

**Cơ sở:** [E2E] `tu-choi-bao-ban` NT-4, NT-7. Con số 19:30 là mặc định 12 giờ theo migration 0092.

### Ca 20. Tài xế đối tác từ chối quá hạn

**Bối cảnh:** Như ca 19, nhưng tài xế bấm lúc 20:00 ngày 29/09.

**Dữ liệu:** Hạn 19:30; bây giờ 20:00, quá 30 phút.

**Câu hỏi:** Kết quả?

**Đáp án:** **Bị từ chối** (`refuse_deadline_passed`). Chuyến vẫn do tài xế đó giữ; tài xế phải gọi văn phòng.

**Cơ sở:** [E2E] `tu-choi-bao-ban` NT-4 («quá hạn 409»).

### Ca 21. Báo bận chồng chuyến của chính mình

**Bối cảnh:** Tài xế đối tác có chuyến CX-3009-12 từ 07:30 đến 09:00 ngày 30/09. Anh báo bận khung 08:00 đến 10:00 cùng ngày.

**Dữ liệu:** Khung bận 08:00–10:00 chồng với chuyến 07:30–09:00 (chồng 60 phút, từ 08:00 đến 09:00).

**Câu hỏi:** Kết quả?

**Đáp án:** **Chặn**, báo rõ chuyến đang chồng (mã chuyến, giờ). Không tạo khung bận.

**Cơ sở:** [E2E] `tu-choi-bao-ban` NT-8, `khung-ban-xe`.

### Ca 22. Văn phòng xếp tài xế vào khung bận

**Bối cảnh:** Tài xế báo bận 13:00–17:00 ngày 30/09 (không có chuyến). Văn phòng muốn xếp anh vào chuyến 14:00–16:00.

**Dữ liệu:** 14:00–16:00 nằm trọn trong 13:00–17:00.

**Câu hỏi:** Văn phòng xếp được không, và câu thông báo nói gì?

**Đáp án:**
1. **Chặn.**
2. Câu báo cho văn phòng **không nêu lý do bận** của tài xế (chỉ nói tài xế bận khung đó).
3. Chèn tay bằng SQL cũng bị cơ sở dữ liệu chặn.

**Cơ sở:** [E2E] `tu-choi-bao-ban` NT-8.

### Ca 23. Rút khung bận rồi xếp lại

**Bối cảnh:** Sau ca 22, tài xế rút khung bận 13:00–17:00. Văn phòng xếp lại.

**Dữ liệu:** Khung bận đã rút; chuyến 14:00–16:00.

**Câu hỏi:** Xếp được không?

**Đáp án:**
1. Rút khung: **thành công** (một lần; rút lần hai thì báo đã rút).
2. Xếp: **được.**

**Cơ sở:** [E2E] `tu-choi-bao-ban` NT-8 («sau rút xếp được»).

---

## NHÓM 5. Giờ lái và nghỉ (5 ca)

Công thức: **tổng giờ lái trong ngày** = cộng thời lượng các chuyến của tài xế bắt đầu trong ngày đó, **không tính chuyến đã huỷ**. Thời lượng một chuyến chưa chạy = giờ kết thúc dự kiến − giờ bắt đầu.

### Ca 24. Ba chuyến, tổng 9 giờ

**Bối cảnh:** Ngày 30/09 tài xế A đã có chuyến 05:00 đến 09:00 và chuyến 10:00 đến 13:00. Văn phòng thêm chuyến thứ ba 14:00 đến 16:00.

**Dữ liệu:**
- Chuyến 1: 9:00 − 5:00 = 240 phút
- Chuyến 2: 13:00 − 10:00 = 180 phút
- Chuyến 3: 16:00 − 14:00 = 120 phút
- Tổng: 240 + 180 + 120 = **540 phút** (9 giờ)
- Giới hạn: 480 phút

**Câu hỏi:** Tạo chuyến thứ ba được không?

**Đáp án:**
1. **Tạo được** (đây là nhắc, không chặn).
2. Có dòng nhắc «Tài xế lái quá giờ tối đa trong ngày» (540 > 480), gắn vào cả ba chuyến.
3. Dòng nhắc hiện lúc tạo và ở chi tiết chuyến.

**Cơ sở:** [Máy 16/10] `canhBaoGioLai`: ba chuyến đều nhận cảnh báo `GIO_LAI_VUOT`, tổng 540. [E2E] `khung-ban-xe` (8).

### Ca 25. Đúng biên 480 phút và 481 phút

**Bối cảnh:** Hai tình huống của cùng một tài xế, cùng ngày.

**Dữ liệu:**
- Tình huống 1: chuyến 05:00–09:00 (240) + chuyến 10:00–14:00 (240) = **480** phút
- Tình huống 2: chuyến thứ hai kéo dài tới 14:01, thành 241 phút, tổng = 240 + 241 = **481** phút

**Câu hỏi:** Tình huống nào bị nhắc?

**Đáp án:**
1. Tình huống 1 (480): **không nhắc**, vì chỉ nhắc khi **lớn hơn** 480.
2. Tình huống 2 (481): **nhắc** «lái quá giờ tối đa» trên cả hai chuyến.
3. Tình huống 2 còn nhắc thêm «chuyến dài» cho chuyến 241 phút (241 > 240).

**Cơ sở:** [Máy 16/10] `canhBaoGioLai`.

### Ca 26. Một chuyến dài 4 giờ 30

**Bối cảnh:** Tài xế A chỉ có một chuyến duy nhất 05:00 đến 09:30.

**Dữ liệu:** Thời lượng 270 phút; ngưỡng nghỉ liên tục 240 phút; tổng ngày 270 ≤ 480.

**Câu hỏi:** Có nhắc gì không?

**Đáp án:**
1. Nhắc «Chuyến dài, nhớ cho tài xế nghỉ giữa chuyến» (270 > 240).
2. **Không** nhắc quá giờ ngày (270 ≤ 480).

**Cơ sở:** [Máy 16/10] `canhBaoGioLai`: chỉ `CHUYEN_DAI_CAN_NGHI`, 270 phút.

### Ca 27. Chuyến đúng 4 giờ

**Bối cảnh:** Chuyến 05:00 đến 09:00.

**Dữ liệu:** 240 phút; ngưỡng 240.

**Câu hỏi:** Có nhắc không?

**Đáp án:** **Không nhắc**, vì chỉ nhắc khi **lớn hơn** 240.

**Cơ sở:** [Máy 16/10] `canhBaoGioLai` trả rỗng.

### Ca 28. Chuyến đã huỷ không tính giờ lái

**Bối cảnh:** Tài xế A có chuyến 05:00–09:00 (đang kế hoạch) và chuyến 10:00–14:01 đã bị **huỷ**.

**Dữ liệu:**
- Chuyến 1: 240 phút
- Chuyến đã huỷ: bỏ qua
- Tổng: **240** phút (nếu tính nhầm cả chuyến huỷ sẽ thành 481)

**Câu hỏi:** Có nhắc quá giờ không?

**Đáp án:** **Không nhắc.** Tổng 240 ≤ 480; chuyến huỷ không cộng vào.

**Cơ sở:** [Máy 16/10] `canhBaoGioLai` trả rỗng, tổng 240.

---

## NHÓM 6. Xuất bến sớm, cửa sổ, huỷ chuyến (2 ca)

### Ca 29. Cửa sổ xuất bến 12 giờ

**Bối cảnh:** Chuyến khởi hành 08:00 ngày 30/09. Tài xế bấm Xuất bến vào buổi tối hôm trước ở ba thời điểm khác nhau.

**Dữ liệu (cửa sổ 720 phút, tức được xuất bến từ 20:00 ngày 29/09):**
- Lúc 20:10: sớm hơn giờ khởi hành 710 phút
- Lúc 20:00: sớm đúng 720 phút
- Lúc 19:59: sớm 721 phút

**Câu hỏi:** Lúc nào được?

**Đáp án:**
1. 20:10: **đạt.**
2. 20:00: **đạt** (đúng biên, tính là được).
3. 19:59: **bị giữ** `NGOAI_CUA_SO_XUAT_BEN`, văn phòng xử lý (xe thật sự chạy sớm thì văn phòng sửa giờ chuyến). Chuyến vẫn ở trạng thái kế hoạch.
4. Chuyến chạy cách đó 3 ngày thì bấm xuất bến luôn bị giữ như ca (3).
5. Kể cả khi xuất bến sớm trong cửa sổ, tài xế **vẫn chưa** thấy tên và số liên hệ khách (chỉ thấy trong ngày chạy).

**Cơ sở:** [Máy 16/10] `kiemXuatBen` ở ba mốc 20:10, 20:00, 19:59 (kết quả: đạt, đạt, giữ); [E2E] `tai-xe-cuoc` LC-20 và Q-L3-B cho ý 4 và 5.

### Ca 30. Huỷ chuyến còn khách, sát giờ

**Bối cảnh:** Lúc 04:00 ngày 30/09 (còn 110 phút), chuyến CX-3009-07 còn 12 khách. Bán hàng huỷ chuyến vì xe hỏng đột xuất.

**Dữ liệu:**
- Còn lại: 05:50 − 04:00 = 110 phút (dưới mốc)
- Huỷ chuyến còn khách thuộc nhóm lệnh bị khoá mốc

**Câu hỏi:** Ai làm được, ai nhận tin?

**Đáp án:**
1. Bán hàng huỷ được bằng **điều chỉnh khẩn cấp kèm lý do**; thiếu lý do thì bị chặn.
2. Tài xế **đang lái** nhận tin «chuyến đã bị huỷ».
3. Tài xế đã bị đổi ra trước đó **không** nhận.
4. Khung Bảng tin tới tài xế đang lái và Kế toán (nhóm điều xe); Tài xế đối tác không nhận.
5. Tin không có tên khách, không số điện thoại.

**Cơ sở:** [E2E] `tin-chuyen` (huỷ: chỉ tài xế đang lái nhận; Bảng tin tới đúng nhóm; không lộ); ADR-0104 Đ1 (huỷ chuyến còn khách là lệnh bị khoá mốc). Số phận các chặng sau khi huỷ chưa đối chiếu ADR, nên không đưa vào đáp án.

---

## Tóm tắt mức kiểm của 30 ca

| Mức | Ca | Số ca |
|---|---|---|
| [Máy 16/10] luật thuần chạy khớp | 3, 9, 10, 11, 12, 13, 18, 25, 26, 27, 28, 29 | 12 |
| [E2E] kịch bản thật đã xanh | 1, 2, 5, 6, 7, 15, 16, 19, 20, 21, 22, 23, 24, 30 | 14 |
| [ADR] theo chữ của bạn, chưa có bài máy | 4, 8, 14, 17 | 4 |

12 + 14 + 4 = 30. Ca 29 có thêm hai ý kiểm bằng E2E; ca 24 vừa có [Máy] vừa có [E2E] (xếp vào [E2E]); ca 15 có ý 4 theo [ADR].

## Việc tiếp theo sau khi bạn duyệt

1. Tôi chép 30 ca sang `golden/van-chuyen/` (đặt riêng thư mục, tránh bài lượt 1 đọc nhầm), trạng thái đã xác nhận kèm tên bạn và ngày.
2. Viết bài chạy: 12 ca máy chạy ngay bằng luật thuần; ca [E2E] trỏ về kịch bản e2e tương ứng; 4 ca [ADR] ghi `todo` có tên cho tới khi có hàm để chạy.
3. Đưa người kiểm độc lập chạy lại.
