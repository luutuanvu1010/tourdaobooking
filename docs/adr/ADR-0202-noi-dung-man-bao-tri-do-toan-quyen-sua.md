# ADR-0202 — Nội dung màn bảo trì do Toàn quyền tự sửa, không gắn cứng trong mã

- **Trạng thái:** **accepted** 2026-11-13 — chủ dự án, nguyên văn: *«Duyệt cả hai»* (nút ở khung bước tiếp theo, trả lời câu «Bạn duyệt văn bản quyết định ADR-0202 và cho nới trần trang Đơn hàng thêm 1 KB chứ?»). Yêu cầu gốc trong chat, nguyên văn: *«ủa tại sao bạn thi công phiên này mà không giống trong mockup vậy, không được code cứng số điện thoại hay các thông tin như thế, sửa ngay»*.
- **Loại:** việc lớn (dữ liệu: thêm một cột; hợp đồng: thân 503 và ba phản hồi có thêm trường). **Cửa:** hai chiều. Cột mới cho phép NULL, nên bỏ tính năng chỉ cần thôi đọc cột.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 1** (Đ1, kèm Đ2 là hệ quả hợp đồng).
- **Xây trên lỗi an toàn chưa sửa:** không.
- **Quan hệ với ADR cũ:** giữ nguyên ADR-0071 điều 3 (bảo trì chặn mọi tài khoản không giữ Toàn quyền). Giữ ADR-0038 (`maintenance_changed` là thao tác im lặng): dòng nhật ký mới dùng lại đúng mã này. Không đổi ai được bật/tắt.

## Bối cảnh

Bản mẫu của chủ (thư mục «Bao Tri Mockup», 13/11/2026) có ba phần. Phần 2a là màn bảo trì mới. Phần 2c là khung «Nội dung màn bảo trì» ở trang Tôi, nơi chủ tự sửa chữ, số điện thoại hỗ trợ, Zalo, website, lời cảm ơn và năm công tắc ẩn/hiện, có xem trước trực tiếp. Lần phát hành 2.98 chỉ làm 2a, còn số điện thoại 0989929373, Zalo và website vẫn viết cứng trong `src/shared/maintenance.ts`. Chủ không chấp nhận cách đó.

Người bị chặn gặp 503 ở mọi API, nên không đọc được hồ sơ công ty. Vì vậy nội dung phải đi kèm ngay trong thân 503.

## Đ1 — Lưu nội dung màn bảo trì trên máy chủ

1. Thêm cột `mnt_setting.content_json` (TEXT, cho phép NULL; migration 0162). Cột chứa JSON gồm 12 ô: tiêu đề, lời nhắn chính, nội dung bảo trì, SĐT hỗ trợ, liên kết Zalo, website, lời cảm ơn, và năm công tắc. NULL nghĩa là chủ chưa lưu lần nào, khi đó dùng nội dung mặc định.
2. Nội dung mặc định lấy đúng giá trị trong bản mẫu 2c, riêng «Nội dung bảo trì» để trống (`MAINTENANCE_CONTENT_DEFAULT`). Mặc định chỉ dùng trong hai trường hợp: chủ chưa lưu, hoặc chủ bấm «Về mặc định».
3. Đường ghi là `PUT /api/maintenance/content`, chỉ ô `settings.ops` (Toàn quyền), giống bật/tắt. Lưu nội dung không bật hay tắt bảo trì. Phần ghi và dòng nhật ký chạy trong một `db.batch`.
4. Máy chủ kiểm bằng luật thuần `checkMaintenanceContent`:
   - Bắt buộc có tiêu đề, lời nhắn và SĐT đúng 10 số bắt đầu bằng 0 (dấu cách, dấu chấm được bỏ).
   - Zalo, nếu có, phải là `https://zalo.me/…`. Website, nếu có, phải bắt đầu bằng `https://`. Hai giá trị này thành đường dẫn trên trang công khai, nên `javascript:` và `http:` bị chặn.
   - Mỗi ô chữ có độ dài tối đa.
   Khi đọc, máy chủ kiểm lại (`contentFromStored`). Nội dung hỏng hoặc bị sửa tay sai sẽ được thay bằng mặc định.
5. Nhật ký ghi `maintenance_changed` với nội dung «Sửa nội dung màn bảo trì: <tên các ô đã đổi>». Dòng nhật ký chỉ ghi tên ô, không chép giá trị (SĐT là dữ liệu N2, theo CLAUDE.md §7).

## Đ2 — Hợp đồng

1. Thân 503 `maintenance` có thêm `content`. Câu `message` dùng SĐT đã lưu.
2. `GET /api/auth/config` (công khai) và `/api/auth/me` có `maintenance.content` **chỉ khi đang bật**. SĐT hỗ trợ vốn đã công khai với người bị chặn qua câu 503. Danh sách SĐT được phép cũ (`allowed_phones`) vẫn không bao giờ lộ.
3. `GET`/`PUT /api/maintenance` luôn có `content`.
4. **Bổ sung 13/11/2026** (chủ dự án, nguyên văn *«Có, nối luôn»*, trả lời câu «Nối dòng «Hỗ trợ kỹ thuật» ở trang đăng nhập với số hỗ trợ bạn lưu nhé?»): `GET /api/auth/config` **luôn** có `supportPhone` (SĐT hỗ trợ đã lưu, kể cả khi bảo trì tắt). Dòng «Hỗ trợ kỹ thuật» dưới nút Đăng nhập dùng số này; chữ tĩnh trong `login.html` chỉ là dự phòng khi chưa tải xong, bằng SĐT mặc định (bài `src/chan-trang-dang-nhap.test.ts`). Đây là số công khai, không phải hotline hay liên hệ của hồ sơ công ty (ADR-0024 6.2 giữ nguyên).
5. Màn bảo trì, dòng báo ở trang đăng nhập và câu «Nhân viên đang thấy» ở trang Tôi đều dựng từ nội dung đã lưu. Bản xem trước ở trang Tôi dùng chính hàm dựng thẻ của màn thật (`dungTheBaoTri`).

## Hệ quả, giới hạn

- Gói giao diện mọi trang nặng thêm khoảng 1 KB. Trần gói trang Đơn hàng phải nới, và việc này cần chủ duyệt riêng (`src/goi-trang-nhe.test.ts`).
- Người đang bị chặn vẫn thấy nội dung cũ cho tới lần mở kế tiếp, vì lớp phủ không tự tải lại nội dung khi chủ sửa giữa chừng.
- Ở máy tính, bản xem trước nằm dưới khung sửa chứ không nằm cột bên như bản mẫu, vì mục bảo trì của trang Tôi là một cột hẹp. Ở điện thoại, xem trước mở bằng nút «Xem trước màn bảo trì», đúng như bản mẫu.
- Nút «Khôi phục mặc định» của bản mẫu đổi thành «Về mặc định». Lý do là «Khôi phục mặc định» đã là tên của một việc ghi khác (màn Giao diện), và theo ADR-0167 mỗi tên chỉ có một nghĩa. «Về mặc định» có sẵn trong bảng chữ dùng chung, đúng nghĩa «điền lại giá trị đặt sẵn». Nút này chỉ điền lại các ô, phải bấm «Lưu nội dung» mới ghi.
- Bằng chứng: `docs/evidence/2026-11-13-man-bao-tri-2a/` (ảnh `2c-*`), bài `src/modules/maintenance/noi-dung.test.ts`, `src/shared/maintenance.test.ts`, kịch bản e2e `tests/e2e/maintenance.mjs` (đoạn 9b), kịch bản Chrome `v1-bao-tri.mjs` (21 bước).
