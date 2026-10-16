# ADR-0123 — Kho tệp hồ sơ trên R2

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-16: *"duyệt lượt 3"* (văn bản đề xuất: `docs/superpowers/specs/2026-10-16-ho-so-rieng-tu-va-2fa/DE-XUAT-ADR.md`, mục ADR-H2; "H2" là số giữ chỗ, nay là 0123).
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Chưa có người kiểm độc lập đọc văn bản; người kiểm đọc sau khi thi công.
- **Ngày:** 2026-10-16.
- **Loại:** việc lớn (dữ liệu, triển khai: có thêm kho tệp mới ở Cloudflare). Cần người kiểm độc lập sau khi thi công; cần trang ghép (`TRANG-GHEP.md` cùng thư mục đề xuất).
- **Quan hệ với ADR cũ:** bổ sung ADR-0041 (dùng lại khuôn kiểm tệp; không sửa ADR-0041, không dùng kho `TEP` của nó) và ADR-0068 Đ1 bước 4 (gộp hồ sơ, xem điều 8).
- **Xây trên lỗ đang hở:** không có.
- **Hiến chương áp:** 5.3, 5.12, 5.16, 5.22, 5.24.

## Quyết định
1. Dùng **một kho R2 riêng** cho tệp hồ sơ (binding `HO_SO`), tách khỏi kho `TEP` của ADR-0041. Khoá tên ngẫu nhiên, không mang nghĩa.
2. Chỉ nhận JPG, PNG, HEIC, PDF, tối đa 10 MB, kiểm theo chữ ký thật của tệp; không nhận HTML, SVG.
3. Tải xuống chỉ qua Worker sau khi `can()` cho phép; **nhật ký ghi trước**; trả với `Cache-Control: no-store` và `X-Content-Type-Options: nosniff`; không có đường dẫn ký sẵn. Service worker không lưu đệm.
4. Hai bảng chỉ-thêm: `pty_attachment` (tệp) và `pty_attachment_link` (nối tệp với dòng giấy tờ).
5. Gộp hồ sơ (ADR-0068 Đ1 bước 4) thêm dòng nối cho ảnh sang dòng giấy tờ mới của hồ sơ giữ lại.
6. Xoá tệp khỏi R2 chạy **sau** lô ghi D1, theo Hiến chương 5.16: trạng thái "chờ xoá" lưu trong CSDL, thấy được và chạy lại được nếu lỗi.
7. Ảnh bị xoá khi phiếu yêu cầu xoá được thực hiện, hoặc khi hết lý do giữ theo Hiến chương 5.25 (người có quyền bấm xoá, máy không tự ghi). Đây là ngoại lệ có tên 5.24.
8. Dữ liệu ảnh không vào nhật ký, DTO mặc định hay câu báo lỗi.

## Việc của chủ
Tạo kho R2 bằng **một lệnh** trước khi triển khai mã có binding `HO_SO`. Tôi sẽ đưa nguyên lệnh và thư mục đứng lúc đó; AI không tự chạy lệnh Cloudflare ghi.

## Tiêu chí nghiệm thu (P20)
- Bài đỏ trước, xanh sau, cho từng đường tải lên và tải xuống.
- Tệp sai chữ ký, quá 10 MB, hoặc SVG/HTML bị từ chối bằng câu tiếng Việt.
- Tải xuống: không có nhật ký thì không trả tệp; phản hồi có `no-store` và `nosniff`; người không có quyền nhận 403.
- Service worker không lưu đệm đường tải xuống (có test trong `sw-policy`).
- Gộp hồ sơ giữ ảnh gắn đúng dòng giấy tờ mới; xoá R2 lỗi thì còn dòng "chờ xoá" để chạy lại.
