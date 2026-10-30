# Quyết định của chủ dự án cho đặc tả Hoa hồng cấp đại lý (2026-10-30)

Hồ sơ có ngày: viết xong là đóng băng, không sửa lại cho khớp hiện trạng. Chủ dự án trả lời bốn câu hỏi trong phiên (AskUserQuestion) ngày 2026-10-30 và chọn cả bốn phương án được khuyến nghị.

1. **«Tắt cấp»: giữ nghĩa như hiện nay.** Tắt cấp chỉ chặn việc xếp thêm nhóm vào cấp đó. Các nhóm đang theo cấp vẫn được chi. Trên màn hình phải đổi nhãn cho rõ và có hộp hỏi lại. Muốn ngừng chi thì dùng «Ngừng áp dụng» cho từng nhóm, có ghi ngày. Cách tính tiền không đổi, nên không cần ADR.
2. **Ô trống trong bảng so sánh các cấp: ghi «—» kèm lời giải thích.** Chỉ hiện mức có thật. Muốn biết một đơn thực tế ra mức nào thì dùng ô «Tra nhanh». Máy trình duyệt không tự suy ra mức, và phía máy chủ không đổi.
3. **Tên gọi: «Cấp đại lý», «Cấp riêng», giữ «Loại đối tác».** «Chính sách hoa hồng» đổi thành «Cấp đại lý». «Chính sách riêng» đổi thành «Cấp riêng». Chữ «nhóm» đã dùng cho nhóm dịch vụ nên giữ «Loại đối tác». Các tên này đổi đồng loạt trên mọi màn hình.
4. **Thứ tự làm: dựng trang ngay trên `main`, không chờ đợt 0b.** Khi mở lại đợt 0b thì gộp trang này vào sau. Đợt 0b vốn đã phải đo lại.
