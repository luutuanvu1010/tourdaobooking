# ADR-0041 — Đính kèm ảnh/tệp trong tin thông báo của Toàn quyền, lưu ở kho R2 của Cloudflare

- **Trạng thái:** **accepted** — chủ dự án yêu cầu trong chat 2026-09-28: *"thêm trường gửi ảnh/đính kèm ảnh và/hoặc tệp PDF, doc, docx, txt, md trong phần Tạo Thông Báo của Super Admin"*; AI trình hai phương án (A: kho R2 của Cloudflare, chỉ người nhận tải được, thu hồi tin thì tệp khoá theo; B: chỉ dán đường dẫn) kèm giới hạn đề xuất (5 tệp/tin, 10MB/tệp; ảnh JPG/PNG/HEIC, PDF, DOC, DOCX, TXT, MD; ảnh xem trước, tệp khác nút tải về; màn hình khoá chỉ hiện tiêu đề) — chủ trả lời *"a"*, không sửa giới hạn. AI ghi lại, không tự quyết.
- **Ngày:** 2026-09-28   **Loại:** cửa **một chiều** về hạ tầng (thêm kho R2 + bảng mới), hai chiều về giao diện.
- **Liên quan:** ADR-0034 (tin thủ công, nhóm nhận, thu hồi, `notice.send` chỉ SUPER_ADMIN), ADR-0036/0039 (màn hình khoá — không đổi: không mang nội dung/tệp).

## Quyết định

1. **Kho:** một bucket R2 (`tourdao-sales-tep`, binding `TEP`) do **chủ** tạo bằng một lệnh; module `thongbao` sở hữu khoá `ntf/<noticeId>/<tepId>`. Siêu dữ liệu ở bảng mới `ntf_attachment` (module `thongbao`): tin, tên tệp gốc, loại, dung lượng, thứ tự, 4 cột dấu vết. Không lưu nội dung tệp trong D1.
2. **Gửi:** chỉ ô `notice.send` (SUPER_ADMIN). Gửi tin kèm tệp trong **một** yêu cầu; tối đa **5 tệp**, mỗi tệp **≤ 10MB**; loại chấp nhận **theo nội dung thật của tệp** (chữ ký đầu tệp), không tin tên/đuôi/loại trình duyệt khai: JPG, PNG, HEIC, PDF, DOC, DOCX, TXT, MD. Tệp đặt lên R2 trước; ghi D1 lỗi thì gỡ các tệp vừa đặt (tệp mồ côi không có dữ liệu nghiệp vụ — ngoại lệ có ghi của luật "không xoá cứng").
3. **Tải:** chỉ người thấy được tin đó trong hộp (cùng luật `nhanThayTinThuCong`, tin chưa thu hồi) và người gửi (màn "Gửi thông báo"). Tin **thu hồi** → tệp không tải được nữa (vẫn nằm trong kho, không xoá). Trả tệp với `Content-Disposition` (ảnh xem tại chỗ, còn lại tải về), `X-Content-Type-Options: nosniff`, không cache công khai; không bao giờ phục vụ HTML/SVG.
4. **Hiển thị:** ảnh hiện xem trước trong hộp đọc tin; tệp khác hiện tên + dung lượng + nút tải. Thông báo màn hình khoá không đổi (không tệp).

## Phương án bị loại

- **Chỉ dán đường dẫn:** ai có đường dẫn cũng mở; thu hồi không khoá tệp; không xem trước.
- **Lưu tệp trong D1:** trần ~1MB/dòng, không hợp tệp 10MB.

## Hệ quả

- Việc của chủ khi triển khai: tạo bucket R2 một lần (lệnh AI đưa sẵn) **trước** khi triển khai mã có binding `TEP`.
- Chi phí: miễn phí tới 10GB lưu trữ; vượt thì tính theo giá R2.
- Tệp của tin đã thu hồi vẫn chiếm chỗ (không xoá cứng); dọn là việc riêng nếu cần.
