# Bảng điều khiển trợ lý Hỗ trợ (chỉ Toàn quyền) — đặc tả đơn giản

> Bản lời thường cho chủ dự án đọc và bổ sung ý định (mục 7). Quyết định kỹ thuật: ADR-0069. Ngày 30/9/2026.

## 1. Để làm gì
Một trang riêng cho tài khoản Toàn quyền để điều khiển trợ lý AI: xem key, bật tắt theo vai, sửa lời dặn, thêm ngữ cảnh, xem lịch sử hỏi đáp và chi phí.

## 2. Trang có những phần gì
1. **Tình trạng:** công tắc bật / tắt toàn bộ; key đã đặt chưa (4 ký tự cuối) + nút "Thử key"; chi phí tháng này / trần 5 USD; số câu hôm nay.
2. **Ai được dùng:** 9 công tắc theo vai (Bán hàng, Kế toán, Quản trị, Hướng dẫn viên, Đối tác, Thực tập, Tài xế, Tài xế đối tác, Toàn quyền); trần câu mỗi người mỗi ngày.
3. **Lời dặn:** câu chào, giọng trả lời, lời dặn thêm, câu hỏi mẫu. Có "Lịch sử bản" và "Quay lại bản này".
4. **Ngữ cảnh bổ sung:** thêm đoạn (tiêu đề + nội dung), bật / tắt từng đoạn. Ví dụ: "Giờ làm việc văn phòng", "Quy trình khi khách huỷ sát giờ".
5. **Lịch sử hỏi đáp:** danh sách câu hỏi (đã che số điện thoại, email) + câu trả lời + ai hỏi + lúc nào; lọc theo ngày, người, vai; tìm chữ.

## 3. Luật giữ nguyên
- Đổi key vẫn làm trên Cloudflare (không nhập key trong app).
- Trợ lý luôn từ chối bí mật, mã nguồn, tiền, thông tin khách — lời dặn tuỳ chỉnh không bỏ được luật này.
- Chữ tuỳ chỉnh không được chứa số điện thoại, email, số tiền (máy chặn khi lưu).
- Không xoá lịch sử; chỉ Toàn quyền xem.

## 4. Người dùng thấy gì khác
- Vai bị tắt: không thấy nút Hỗ trợ.
- Khung Hỗ trợ có dòng: "Câu hỏi được lưu để cải thiện trợ lý — đừng gõ thông tin khách".
- Câu chào và câu hỏi mẫu theo lời dặn Toàn quyền đặt.

## 5. Chưa làm
- Xuất lịch sử ra tệp.
- Đánh giá câu trả lời (thích / không thích).

## 6. Cách kiểm
Toàn quyền mở trang, tắt vai Đối tác → tài khoản Đối tác không thấy nút; sửa câu chào → khung hiện câu mới; hỏi một câu → lịch sử có dòng đã che số.

## 7. Ý định bổ sung của chủ dự án
- Câu chào:
- Giọng trả lời:
- Câu hỏi mẫu:
- Ngữ cảnh muốn thêm ngay:
- Khác:
