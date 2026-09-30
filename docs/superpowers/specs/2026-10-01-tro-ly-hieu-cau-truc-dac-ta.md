# Trợ lý Hỗ trợ hiểu cấu trúc app, tự cập nhật: đặc tả đơn giản

> Bản lời thường để chủ dự án đọc và bổ sung ý định (mục 6). Quyết định kỹ thuật nằm ở ADR-0070. Ngày 1/10/2026.

## 1. Để làm gì
Trợ lý trả lời như một kỹ sư hiểu toàn bộ app, không chỉ đọc lại hướng dẫn:
- app có những phần nào;
- các phần nối với nhau ra sao;
- vì sao phải làm bước này trước bước kia;
- vì sao bạn không thấy một nút;
- nút nằm ở đâu trên trang.

Khi giao diện đổi, trợ lý tự biết mà không ai phải cập nhật tay.

## 2. Trợ lý biết thêm gì
1. **Bản đồ các phần của app:** Đơn hàng, Danh mục, Danh bạ, Điều phối xe, Sổ tiền, Thông báo, Bảng tin, Góp ý…, mỗi phần lo việc gì và dựa vào phần nào.
2. **Luồng chính:** lập đơn → xác nhận → người phụ trách → xếp xe → thu tiền → hoàn tất.
3. **Mỗi vai làm được gì, không làm được gì.** Lấy thẳng từ bảng quyền của app, nên luôn đúng.
4. **Bố cục từng trang:** trang có những mục nào, theo thứ tự nào, nút nằm ở mục nào, trang ở nhóm menu nào.

## 3. Tự cập nhật
- Mỗi lần triển khai, máy tự đọc lại giao diện và bảng quyền rồi sinh lại kiến thức cho trợ lý.
- Thêm một phần mới hoặc một quyền mới mà chưa viết tên dễ hiểu cho trợ lý thì bài kiểm báo đỏ, không triển khai được.

## 4. Luật giữ nguyên
- Không gửi mã nguồn, tên bảng, đường dẫn kỹ thuật, máy chủ, bí mật sang OpenAI. Máy chặn khi sinh kiến thức.
- Vẫn từ chối các câu về giá hay tiền của một đơn cụ thể, dữ liệu khách, cách lách quyền.
- Không dùng ảnh chụp màn hình.
- Trần 5 USD/tháng giữ nguyên.

## 5. Cách kiểm
- Hỏi "Vì sao tôi không xác nhận được đơn?": trợ lý giải thích mốc 6 giờ và Đặt gấp, kèm lý do.
- Hỏi "Nút Lưu nháp ở đâu?": trợ lý nói đúng mục và vị trí.
- Hỏi "App dùng cơ sở dữ liệu gì?": trợ lý từ chối.
- Đổi tên một nút rồi build lại: trợ lý dùng tên mới.

## 6. Ý định bổ sung của chủ dự án
- Câu hỏi mẫu muốn trợ lý trả lời tốt:
- Phần nào của app cần giải thích kỹ hơn:
- Khác:
