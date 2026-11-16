# Phí đưa đón do nhân viên chọn trên đơn — đặc tả ngắn

- **Ngày:** 2026-11-16. **Trạng thái:** đề xuất, chờ chủ duyệt. **Loại:** việc lớn (tiền); cần ADR mới thay một phần ADR-0147 và ADR-0203.
- **Lời chủ (16/11, chat):** «nơi đón gõ tay là 1 trường tùy chọn, vì thế không nên lấy nó làm căn cứ để xác định phí vận chuyển, mà nên đặt phí vận chuyển bằng 1 danh sách chọn trước: 5000đ, 10000đ, 15000đ, 20000đ, 30000đ, 50000đ 100000đ, và số khác». Hỏi lại chọn ở đâu, chủ chọn «Nhân viên chọn trên đơn», sau khi được báo cách này trái ADR-0147 (máy tính, nhân viên không sửa số) và Hiến chương 5.4 (P18, đã nói một lần).
- **Hiện trạng:** Đợt C đã lên production (3.9–3.10): máy tính phí theo khu vực, cấp đại lý, dịch vụ; **chưa bật** (chưa có «ngày bắt đầu áp»), nên chưa khách nào bị tính phí.

## 1. Việc gì, cho ai, vì sao
Nhân viên lập đơn chọn phí đưa đón cho từng lượt đón từ một danh sách số tiền có sẵn, thay vì máy tự tra bảng phí theo khu vực. Chủ muốn vậy vì nơi đón nhiều khi là chữ gõ tay, không đủ tin để máy dựa vào mà định giá; người lập đơn biết chỗ đón thật nên chọn sát hơn.

## 2. Xong khi
- Nhân viên Bán hàng mở đơn nháp có lượt đón, mỗi lượt đón có ô «Phí đưa đón» với các lựa chọn: Miễn phí, 5.000, 10.000, 15.000, 20.000, 30.000, 50.000, 100.000 đ, Số khác. Chọn 30.000 đ cho chiều đi của dịch vụ 2 người lớn + 1 em bé ⇒ đơn có dòng «Phí đưa đón — chiều đi: 30.000 đ × 2 khách = 60.000 đ», tổng đơn tăng 60.000 đ.
- Chọn «Số khác», gõ 70.000 ⇒ dòng 70.000 đ × số khách. Gõ 6.000.000 ⇒ bị từ chối «Mức phí tối đa 5.000.000 đ.».
- Lượt đón chưa chọn phí ⇒ bấm Xác nhận bị chặn, câu báo «Chọn phí đưa đón cho lượt đón chiều đi của dịch vụ …». Máy không tự lấy 0 đồng.
- Đơn đã xác nhận: phí không đổi khi sửa chặng; sửa số khách thì tính lại theo số tiền mỗi khách đã chọn (như Đợt C).
- Đại lý cấp 3, đơn trả sau, tour 1.200.000 đ, hoa hồng 120.000 đ, phí đón chọn 30.000 đ × 2 = 60.000 đ ⇒ đại lý nợ công ty 1.140.000 đ; hoa hồng vẫn 120.000 đ. Biên nhận in phí ở phần của Tour Đảo; chọn Miễn phí thì in «Miễn phí».
- Nhật ký đơn ghi ai chọn mức nào cho lượt đón nào.

## 3. Không làm lần này
- Không xoá bảng phí theo khu vực và màn «Phí đưa đón» của Quản trị: để nguyên, không bật (đảo ngược được). Gỡ màn đó là việc sau, chủ quyết.
- Không gợi ý số tiền theo khu vực; không phí riêng theo cấp đại lý hay dịch vụ.
- Không cho sửa phí sau xác nhận ngoài đường sửa số khách hiện có.

## 4. Loại việc
- [x] Việc lớn (tiền, dữ liệu) ⇒ có người kiểm độc lập.
- Cần ADR: **có** — đổi «máy tính phí, nhân viên không sửa số» (ADR-0147 Đ2–Đ3, ADR-0203 ĐB1–ĐB2) thành «nhân viên chọn trong danh sách». Giữ nguyên từ Đợt C: dòng phí riêng, chụp lúc xác nhận, không hoa hồng, cộng công nợ đại lý, biên nhận, giảm giá không trừ vào phí, trần 5.000.000 đ.

## 5. Câu hỏi cho chủ (ba câu, mỗi câu có khuyến nghị)
1. **Ai được chọn phí?** Khuyến nghị: nhân viên văn phòng lập/sửa đơn nháp (Bán hàng, Quản lý bán hàng, Quản trị, Toàn quyền). Đơn do Đối tác gửi: Đối tác **không** chọn; văn phòng chọn lúc xác nhận. Lý do: đối tác tự chọn phí thấp cho đơn của mình là xung đột lợi ích.
2. **Số tiền tính theo mỗi khách hay cả lượt đón?** Khuyến nghị: đi chung tính **mỗi khách** (không đếm em bé), xe riêng tính **cả chuyến** — đúng cách Đợt C và sổ vàng đang tính. Lý do: các mức 5.000–100.000 đ trông là giá mỗi người; xe riêng chọn «Số khác» cho cả chuyến.
3. **Danh sách có thêm «Miễn phí» (0 đ) ở đầu không?** Khuyến nghị: có, và lượt đón **bắt buộc** chọn một mục trước khi xác nhận. Lý do: Hiến chương 5.7 — miễn phí phải là lựa chọn rõ, không được hiểu «quên chọn» là 0 đồng.

## 6. Điều AI tự quyết (chủ bác được)
- Danh sách số tiền là dữ liệu cấu hình một chỗ trong mã (đổi danh sách = sửa một hằng số + phát hành), chưa làm màn cho Quản trị tự sửa.
- Đổi số khách hay thêm lượt đón trên đơn nháp không tự xoá mức đã chọn; xoá lượt đón thì mức của nó mất theo.
- Bỏ yêu cầu «mỗi khu vực phải có mức chung trước khi bật». **Giữ «ngày bắt đầu áp» làm công tắc**: trước ngày đó ô chọn phí không hiện và đơn xác nhận như hôm nay; nhờ vậy phát hành xong không làm kẹt đơn ngay, chủ chọn ngày bật khi nhân viên đã được dặn.
- Sổ vàng `golden/phi-dua-don.json` viết lại theo luật mới (ca chọn mức, số khác, vượt trần, chưa chọn, đối tác gửi, công nợ, biên nhận) để chủ xác nhận trước khi viết mã.
