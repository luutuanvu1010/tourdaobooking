# Task 0a — Cloudflare Email Service có gửi được tới địa chỉ bất kỳ không?

> Hồ sơ có ngày (2026-10-16). Nguồn: tài liệu chính thức Cloudflare đọc ngày này (`developers.cloudflare.com/email-service/` và trang giới hạn `…/platform/limits/`). Chưa thử gửi thật (bước 0b của chủ).

**Kết luận (từ tài liệu, chưa thử thật):** gửi được tới địa chỉ bất kỳ, với điều kiện đã **onboard một tên miền gửi** của tài khoản. Trước khi onboard chỉ gửi được tới địa chỉ đã xác minh trong tài khoản.

| Điều | Tài liệu nói | Hệ quả cho Gói 1 |
|---|---|---|
| Người nhận | Trước onboard: chỉ địa chỉ đích đã xác minh. Sau onboard: "send to any recipient immediately" | Cần onboard tên miền (tên miền nào, DNS ra sao: **chưa đọc** trang cài đặt) — việc của chủ ở Cloudflare |
| Người gửi | "You can only send from your routing domains" | Địa chỉ `FEEDBACK_MAIL_FROM` hiện có phải thuộc tên miền đã onboard |
| Hạn mức | Tài khoản mới bắt đầu với hạn mức ngày "conservative", tăng dần; không công bố con số; có form xin tăng | **Rủi ro cho đợt thí điểm**: ~100 mã/đợt có thể vượt hạn mức đầu. Đợt đầu 5 người thì ổn; xin tăng hạn mức trước đợt 100 |
| Gói | Cần Workers Paid; trạng thái **Beta** | Beta: không cam kết dịch vụ; phương án dự phòng (ứng dụng xác thực + mã dự phòng + Face ID) phải chạy độc lập với email |
| Kích thước | 5 MiB/thư, 50 người nhận/thư | Không ảnh hưởng (thư mã rất nhỏ) |
| Giá | Trang giá trả 404; chỉ biết gửi tới địa chỉ đã xác minh miễn phí | **Chưa biết** giá gửi tới địa chỉ bất kỳ |

**Việc kế (không phải AI):** (1) chủ xem tên miền gửi đã onboard chưa (bảng Cloudflare → Email → Sending); (2) bước 0b: thử gửi một mã tới hộp thư của chính chủ trên bản thử; (3) hỏi/tra giá. Cập nhật dòng mới đề xuất cho `RANG_BUOC_NGOAI.md` mục 2 sau 0b (AI không tự sửa tệp đó).
