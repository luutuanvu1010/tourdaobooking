# ADR-0036 — Thông báo màn hình khoá (Web Push) cho tài khoản nội bộ: cú gõ cửa không nội dung, giờ yên lặng, tự tắt

- **Trạng thái:** **proposed** — AI soạn 2026-09-27 theo câu trả lời M1–M4, N4 của chủ trong chat cùng ngày (đặc tả `docs/superpowers/specs/2026-09-27-thong-bao-he-thong-design.md` §2, §9). **Lượt duyệt thứ hai** — chỉ duyệt sau ADR-0034; chưa thi công.
- **Ngày:** 2026-09-27   **Loại:** cửa **hai chiều** (tắt được bằng cách gỡ khoá bí mật và nút bật; bảng địa chỉ máy ở lại), có **một bí mật mới** (triển khai — chủ tự đặt).
- **Liên quan:**
  - **ADR-0034** (proposed): nguồn tin và ngăn "Của tôi" — ADR này chỉ thêm một đầu ra.
  - **ADR-0018**: Web Push là "giai đoạn 6"; chủ đưa lên sớm (H4) — AI đã cảnh báo (P18).
  - **ADR-0022**: không sửa; tin về đơn móc vào điểm phát `baoThayDoi` có sẵn ở gốc lắp ráp.
  - **Hiến chương 5.16**: việc bên ngoài chạy sau giao dịch; chủ xếp đây là việc **được phép lỡ** (N4).

## Bối cảnh

Nhân viên cần biết tin mới cả khi app đang đóng. iPhone hỗ trợ khi app đã cài ra màn hình chính (iOS 16.4+), nhưng **bắt buộc** mỗi lần đẩy phải hiện một thông báo, không thì Safari thu hồi quyền. Gửi cho ~1.000 máy Đối tác trong một lượt vượt khả năng một lượt xử lý của Worker (30 giây, 6 kết nối) — cần hàng đợi. Nguồn tra cứu: đặc tả §9.3.

## Quyết định

1. **Chỉ tài khoản nội bộ** (có ít nhất một quyền khác `PARTNER` — gồm Thực tập, chủ chọn 2026-09-27) bật được, bằng nút trong trang Tài khoản; xin quyền trong cú chạm.
2. **Lưu địa chỉ nhận của máy** trong bảng `ntf_push_sub` (module `thongbao`): tài khoản, địa chỉ, tên máy ngắn, lúc hết hiệu lực + lý do, và đủ 4 cột dấu vết. Không lưu khoá mã hoá của máy; không xoá cứng.
3. **Cú gõ cửa không nội dung**, ký VAPID (ES256, Web Crypto, không thư viện ngoài), khoá bí mật `VAPID_PRIVATE_KEY` do **chủ** đặt bằng `wrangler secret put`. Service worker tự hỏi máy chủ tin mới nhất bằng phiên của máy; hỏi không được vẫn hiện "Tour Đảo: bạn có thông báo mới".
4. **Chỉ rung cho tin ngăn "Của tôi"** (ADR-0034 điều 4). **Giờ yên lặng 22:00–06:00 giờ Việt Nam**, trừ tin quan trọng.
5. **Gửi sau khi lô ghi thành công**, bằng `ctx.waitUntil`; được phép lỡ, không theo dõi gửi lại. 410 → địa chỉ hết hiệu lực; 404 chỉ ghi log.
6. **Tự tắt**: đăng xuất, đổi PIN, đổi quyền/vai, ngưng tài khoản, đổi SĐT → mọi địa chỉ của tài khoản hết hiệu lực (cùng chỗ đang gọi `dongBangTin`); người dùng bật lại.

## Phương án bị loại

- **Gửi kèm nội dung đã mã hoá**: nội dung đi qua máy chủ Apple/Google (dù mã hoá), phải tự viết mã hoá RFC 8291; không cần vì service worker tự hỏi được.
- **Rung mọi tin trong hộp**: Quản lý/Kế toán bị rung hàng chục lần mỗi ngày.
- **Bật cho Đối tác ngay**: cần Cloudflare Queues (hạ tầng mới) — đợt sau.
- **Theo dõi và gửi lại**: phức tạp; hộp đã giữ đủ tin.

## Hệ quả

- Phải thử trên iPhone thật: cookie phiên trong service worker của app đã cài chưa có văn bản xác nhận.
- Service worker mới chỉ tới máy sau khi nhân viên mở app một lần; nút bật chỉ hoạt động từ lần mở sau.
- Một bí mật mới cần đặt khi triển khai; thiếu bí mật thì nút bật ẩn và không gửi gì (không lỗi).

## Trang ghép

Đặc tả §12 (dòng `ntf_push_sub`; cửa đăng ký/huỷ máy ở cổng `staff`, chỉ chính mình, chỉ tài khoản nội bộ). Không đổi ô nào của `MATRIX`.
