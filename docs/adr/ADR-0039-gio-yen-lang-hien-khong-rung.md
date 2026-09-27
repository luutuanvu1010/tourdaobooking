# ADR-0039 — Giờ yên lặng: thông báo màn hình khoá vẫn HIỆN, chỉ không rung/không kêu (sửa ADR-0036 điều 4)

- **Trạng thái:** **accepted** — chủ dự án nói trong chat 2026-09-28 (sau khi thử bản 1.25 lúc ~04:30 và không thấy thông báo): *"Mặc dù đang là giờ im lặng nhưng lẽ ra màn hình vẫn phải hiển thị thông báo chứ, không rung thì vẫn phải hiện thông báo"*. AI ghi lại, không tự quyết (tiền lệ ADR-0034, ADR-0036). ADR-0036 đã duyệt nên không sửa nội dung; ADR này thay phần "giờ yên lặng" của ADR-0036 điều 4.
- **Ngày:** 2026-09-28   **Loại:** cửa **hai chiều** (đổi lại chỉ cần một dòng luật).
- **Liên quan:** ADR-0036 điều 4 (giờ yên lặng 22:00–06:00 VN = không gửi, trừ tin quan trọng) — **bị thay** bởi điều 1–2 dưới đây.

## Quyết định

1. **Giờ yên lặng 22:00–06:00 giờ Việt Nam vẫn gửi cú gõ cửa** như ban ngày; service worker vẫn hiện thông báo trên màn hình khoá, nhưng **không rung, không kêu** (`showNotification` với `silent: true`, không `renotify`).
2. **Tin quan trọng** (ADR-0034) giữ như cũ: rung/kêu cả trong giờ yên lặng.
3. Cú gõ cửa vẫn **không mang nội dung** (ADR-0036 điều 3): máy chủ báo "đang giờ yên lặng" qua phản hồi `GET /api/thong-bao/moi-nhat` (tính theo giờ VN ở máy chủ, một nguồn luật `trongGioYenLang`), không qua nội dung push.

## Hệ quả

- **Chưa chắc iPhone tôn trọng `silent`** cho thông báo của app web (chưa có tài liệu Apple khẳng định; AI đã nói với chủ). Nếu không, thông báo ban đêm có thể vẫn kêu nhẹ tuỳ chế độ Tập trung/Không làm phiền của máy — chỉ biết khi thử iPhone thật; ghi kết quả vào kịch bản thử tay.
- Số lần gõ cửa ban đêm tăng (trước đây bỏ); vẫn chỉ tới người có tin ở ngăn "Của tôi".
