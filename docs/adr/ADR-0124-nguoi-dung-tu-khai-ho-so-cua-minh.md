# ADR-0124 — Người dùng tự khai hồ sơ của mình (trả lời câu bỏ ngỏ của ADR-0013)

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-16: *"duyệt cả ba"* (lượt 4; văn bản đề xuất: `docs/superpowers/specs/2026-10-16-ho-so-rieng-tu-va-2fa/DE-XUAT-ADR.md`, mục ADR-H3; "H3" là số giữ chỗ, nay là 0124).
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Chưa có người kiểm độc lập đọc văn bản; người kiểm đọc sau khi thi công.
- **Ngày:** 2026-10-16.
- **Loại:** việc lớn (quyền, dữ liệu). Cần người kiểm độc lập sau khi thi công; trang ghép: `TRANG-GHEP.md` cùng thư mục đề xuất.
- **Quan hệ với ADR cũ:** trả lời câu bỏ ngỏ ở mục "Phương án bị loại" của ADR-0013 ("Cho nhân viên tự sửa hồ sơ của chính mình: chủ chưa yêu cầu… Để chủ quyết riêng nếu cần"). **Không thay câu nào của ADR-0013**: luật "không tự sửa" giữ nguyên; ADR này chỉ mở một đường khác. Ô quyền cho Đối tác và Tài xế đối tác là **nới** so với hôm nay (Ruling R4 của `party.document.view`), ghi rõ ở Hệ quả.
- **Xây trên lỗ đang hở:** không có.
- **Hiến chương áp:** K4, 4.4 (DTO đối tác theo danh sách cho phép, tiền lệ vá D-1), 5.8, 5.21, 5.23.

## Bối cảnh
Chủ đã yêu cầu thu thập thông tin hồ sơ (chính chủ khai, có xác minh). ADR-0013 từng loại phương án cho người dùng tự sửa hồ sơ.

## Quyết định
1. **Không mở quyền sửa thẳng.** Thêm **phiếu tự khai** `pty_self_submission`: giá trị khai không ghi đè giá trị hiện hành, không lên nhãn hay chứng từ cho tới khi được xác minh (Hiến chương 5.23).
2. Chấp nhận phiếu là **một lô** do `parties` ghi (người xác minh chấp nhận nguyên văn hoặc từ chối, theo ADR-0125).
3. Chưa đồng ý chính sách riêng tư phiên bản hiện hành (ADR-0126) thì **không gửi được phiếu** (Hiến chương 5.21).
4. Bốn ô quyền mới: `party.self.view`, `party.self.submit`, `party.erasure.request` (cho mọi quyền; phạm vi `own` theo `staff.party_id` của phiên) và `party.attachment.view` (chỉ Toàn quyền).
5. Phạm vi thực tế của `party.document.write` rộng ra (giấy tờ của đối tác cá nhân tự khai): ghi rõ ở Hệ quả.
6. DTO trả cho Đối tác và Tài xế đối tác theo **danh sách cho phép** (tiền lệ vá D-1): chỉ các trường của chính họ.

## Hệ quả
Đối tác và Tài xế đối tác nay xem và gửi hồ sơ của chính mình: **nới có chủ ý**. Dữ liệu tự khai chưa xác minh không bao giờ xuất hiện trên nhãn, hoá đơn, đơn; phải qua xác minh.

## Tiêu chí nghiệm thu (P20)
- Bài đỏ trước, xanh sau: gửi phiếu thành công không đổi giá trị hiện hành; chỉ sau chấp nhận mới đổi.
- Người chưa đồng ý chính sách hiện hành gửi phiếu bị từ chối bằng câu tiếng Việt.
- Người dùng chỉ xem và gửi phiếu của chính mình (`own`); xem hay gửi thay người khác thì 403/404.
- Đối tác không thấy trường ngoài danh sách cho phép (bài DTO).
- Bản đồ quyền và ảnh chụp bảng quyền cập nhật cùng commit; `permissions.test.ts` và sổ hàng rào có dòng.
