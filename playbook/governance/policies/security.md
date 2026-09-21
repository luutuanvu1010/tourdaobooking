# SECURITY POLICY (control checklist tối thiểu)

> Control thực dụng để không bị lộ dữ liệu hay chiếm quyền. KHÔNG phải ISO 27001 đầy đủ; nâng cấp chỉ khi có yêu cầu tuân thủ bên thứ ba.

- **Bí mật:** API key, token không nằm trong repo, URL, hay log; dùng kho bí mật của nền tảng; xoay khóa định kỳ.
- **Truy cập:** nguyên tắc ít quyền nhất; bật MFA cho cổng quản trị; rà soát quyền khi người hoặc agent thay đổi.
- **Đầu vào:** prepared statement cho mọi truy vấn; validate đầu vào người dùng; chống injection.
- **Phụ thuộc:** rà soát thư viện bên thứ ba; vá lỗ hổng nghiêm trọng trước khi release.
- **Sao lưu & phục hồi:** sao lưu dữ liệu định kỳ; thử phục hồi ít nhất một lần để biết nó chạy.
- **Sự cố:** theo `ai/workflows/incident-runbook.md`.

> Luật bảo mật cụ thể theo stack nằm ở `04-CONSTRAINTS` của từng dự án.
