# Màn bảo trì mới — phương án 2a (13/11/2026)

Bản mẫu: thư mục «Bao Tri Mockup» của chủ dự án (Claude Design, tệp `Man bao tri.dc.html`, phương án 2a). Ảnh chụp bằng kịch bản
`docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/v1-bao-tri.mjs` (D1 tạm, Turnstile tắt, có `AXE_JS`): 18/18 bước ✓, axe 0 vi phạm ở lớp phủ.

- `390-dang-bao-tri.png`, `1040-dang-bao-tri.png`: đang đếm ngược (ảnh khung nhìn — lớp phủ cố định nên ảnh cả trang dài lộ trang bên dưới).
- `390-da-mo-lai.png`: chủ tắt / hết giờ → «Đã mở lại», ẩn đồng hồ và nút gọi / Zalo, nút chính đổi thành «Tải lại trang».

Giả định (ghi để chủ duyệt): chọn 2a (mặc định của bản mẫu), chưa làm 2c (chủ tự sửa nội dung — cần lưu dữ liệu mới); bỏ khối «Nội dung bảo trì» vì
chưa có nguồn; liên kết Zalo `https://zalo.me/0989929373` và website `https://tourdao.vn` lấy từ bản mẫu, cố định trong `src/shared/maintenance.ts`.
Câu 503 của máy chủ và dải bảo trì ở trang đăng nhập giữ nguyên câu cũ.

## Bổ sung cùng ngày: phần 2c — chủ tự sửa nội dung (ADR-0202)

Chủ dự án không chấp nhận số điện thoại / Zalo / website gắn cứng. Nay nội dung lưu ở `mnt_setting.content_json` (migration 0162), sửa ở trang Tôi › Chế độ bảo trì ›
«Nội dung màn bảo trì», có xem trước bằng chính hàm dựng thẻ của màn thật. Giả định «bỏ khối Nội dung bảo trì» và «liên hệ cố định» ở trên KHÔNG còn đúng. Kịch bản Chrome 21/21 ✓, có `AXE_JS`.

- `2c-390-sua-noi-dung.png`, `2c-1040-sua-noi-dung.png`: khung sửa (7 ô, 5 công tắc) và bản xem trước sau khi gõ tiêu đề, nội dung bảo trì, SĐT, Zalo mới và tắt «Thẻ website».
- `2c-390-nhan-vien-thay-noi-dung-moi.png`: nhân viên bị chặn thấy đúng nội dung đã lưu (tiêu đề mới, khối Nội dung bảo trì, «Gọi 0905 123 456», không có thẻ website).
