# ADR-0036 — Thông báo màn hình khoá (Web Push) cho mọi tài khoản: cú gõ cửa không nội dung, gửi chia lô, giờ yên lặng, tự tắt

- **Trạng thái:** **accepted** — chủ dự án trả lời *"Đồng ý, làm đi"* trong chat 2026-09-27 (tối, sau khi bản 1.22 lên production) cho bản tóm tắt lời thường của ADR này, **kèm một sửa đổi của chủ ở điểm 1**: *"Mọi tài khoản, kể cả đối tác, vì tôi nghĩ rằng thay vì cần cơ chế phát thì tạo cơ chế lắng nghe từ hệ thống cho mỗi tài khoản (kiểu hook)"*; điểm 2–6 chủ trả lời "ok". AI đã nghiên cứu và báo chủ trước khi chủ đồng ý: iPhone không cho PWA tự "lắng nghe" khi đóng (không WebSocket nền, không Background/Periodic Sync, cấm push im lặng) → cách gần nhất là mỗi tài khoản tự đăng ký nhận + máy chủ chỉ báo người liên quan, gửi chia lô. AI ghi lại, không tự quyết (tiền lệ ADR-0034). Soạn ban đầu theo câu trả lời M1–M4, N4 (đặc tả `docs/superpowers/specs/2026-09-27-thong-bao-he-thong-design.md` §2, §9).
- **Ngày:** 2026-09-27   **Loại:** cửa **hai chiều** (tắt được bằng cách gỡ khoá bí mật và nút bật; bảng địa chỉ máy ở lại), có **một bí mật mới** (triển khai — chủ tự đặt).
- **Liên quan:**
  - **ADR-0034** (accepted): nguồn tin và ngăn "Của tôi" — ADR này chỉ thêm một đầu ra.
  - **ADR-0018**: Web Push là "giai đoạn 6"; chủ đưa lên sớm (H4) — AI đã cảnh báo (P18).
  - **ADR-0022**: không sửa; tin về đơn móc vào điểm phát `baoThayDoi` có sẵn ở gốc lắp ráp; chia lô dùng Durable Object `BangTin` đã có.
  - **Hiến chương 5.16**: việc bên ngoài chạy sau giao dịch; chủ xếp đây là việc **được phép lỡ** (N4).

## Bối cảnh

Nhân viên và đối tác cần biết tin mới cả khi app đang đóng. iPhone hỗ trợ khi app đã cài ra màn hình chính (iOS 16.4+), nhưng **bắt buộc** mỗi lần đẩy phải hiện một thông báo, không thì Safari thu hồi quyền. Khi app đóng, iPhone dừng mọi JS của trang lẫn service worker: không có WebSocket nền, Background Fetch, Background Sync hay Periodic Background Sync (WebKit chưa hỗ trợ) — nên không có cách để máy "tự lắng nghe"; chỉ Web Push (máy chủ push của Apple chuyển xuống) đánh thức được app. Một lần gọi Worker chỉ giữ 6 kết nối chờ cùng lúc và `waitUntil` tối đa 30 giây (gói Free thêm trần 50 subrequest) — gửi cho ~1.000 máy trong một lượt không an toàn. Nguồn tra cứu: đặc tả §9.3; báo cáo nghiên cứu trong chat 2026-09-27 (webkit.org/blog/13878, developers.cloudflare.com/workers/platform/limits, developers.cloudflare.com/durable-objects/api/alarms).

## Quyết định

1. **Mọi tài khoản** (nội bộ lẫn Đối tác) bật được, bằng nút trong trang Tài khoản; xin quyền trong cú chạm. Mỗi máy **tự đăng ký nhận** (địa chỉ nhận do trình duyệt cấp), máy chủ chỉ gửi tới người có tin ở ngăn "Của tôi" (điểm 4).
2. **Lưu địa chỉ nhận của máy** trong bảng `ntf_push_sub` (module `thongbao`): tài khoản, địa chỉ, tên máy ngắn, lúc hết hiệu lực + lý do, và đủ 4 cột dấu vết. Không lưu khoá mã hoá của máy; không xoá cứng.
3. **Cú gõ cửa không nội dung**, ký VAPID (ES256, Web Crypto, không thư viện ngoài), khoá bí mật `VAPID_PRIVATE_KEY` do **chủ** đặt bằng `wrangler secret put`. Service worker tự hỏi máy chủ tin mới nhất bằng phiên của máy (`credentials: "same-origin"`); hỏi không được vẫn hiện "Tour Đảo: bạn có thông báo mới".
4. **Chỉ rung cho tin ngăn "Của tôi"** (ADR-0034 điều 4). **Giờ yên lặng 22:00–06:00 giờ Việt Nam**, trừ tin quan trọng.
5. **Gửi sau khi lô ghi thành công, chia lô**: người nhận ít (tin về đơn) gửi thẳng bằng `ctx.waitUntil`; nhiều người nhận (tin thủ công cho nhóm lớn, vd mọi Đối tác) giao cho Durable Object `BangTin` có sẵn gửi từng lô nhỏ (≤ 40 máy mỗi lượt) và tự hẹn lượt kế (alarm) tới khi hết. Không thêm hạ tầng mới (không Queues). Được phép lỡ, không theo dõi gửi lại. 410 → địa chỉ hết hiệu lực; 404 chỉ ghi log.
6. **Tự tắt**: đăng xuất, đổi PIN, đổi quyền/vai, ngưng tài khoản, đổi SĐT → mọi địa chỉ của tài khoản hết hiệu lực (cùng chỗ đang gọi `dongBangTin`); người dùng bật lại.

## Phương án bị loại

- **Máy tự lắng nghe/hỏi định kỳ khi app đóng** (đề xuất ban đầu của chủ): iPhone không cho — không có WebSocket nền, Background/Periodic Sync; push im lặng bị cấm. Giữ tinh thần "mỗi tài khoản tự đăng ký" ở điểm 1.
- **Gửi kèm nội dung đã mã hoá**: nội dung đi qua máy chủ Apple/Google (dù mã hoá), phải tự viết mã hoá RFC 8291; không cần vì service worker tự hỏi được.
- **Rung mọi tin trong hộp**: Quản lý/Kế toán bị rung hàng chục lần mỗi ngày.
- **Cloudflare Queues**: thêm hạ tầng; Durable Object alarm đã có đủ để chia lô ở quy mô ~1.000 máy.
- **Theo dõi và gửi lại**: phức tạp; hộp đã giữ đủ tin.

## Hệ quả

- Phải thử trên iPhone thật: cookie phiên trong service worker của app đã cài chưa có văn bản xác nhận riêng cho iOS (suy từ chuẩn).
- Tin gửi cho nhóm lớn tới máy cuối chậm hơn máy đầu khoảng vài chục giây tới một phút.
- Đối tác phải tự cài app ra màn hình chính và bấm cho phép mới nhận được.
- Service worker mới chỉ tới máy sau khi người dùng mở app một lần; nút bật chỉ hoạt động từ lần mở sau.
- Một bí mật mới cần đặt khi triển khai; thiếu bí mật thì nút bật ẩn và không gửi gì (không lỗi).

## Trang ghép

Đặc tả §12 (dòng `ntf_push_sub`; cửa đăng ký/huỷ máy ở cổng `staff`, chỉ chính mình, mọi tài khoản đang hoạt động). Không đổi ô nào của `MATRIX`.
