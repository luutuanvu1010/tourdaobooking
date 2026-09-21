# DATA GOVERNANCE POLICY (control checklist tối thiểu)

- **Phân loại dữ liệu:** công khai / nội bộ / cá nhân của khách. Đối xử khác nhau theo loại.
- **Thu thập:** chỉ thu tối thiểu cần thiết; khai báo rõ mục đích.
- **Lưu trữ & retention:** đặt thời hạn lưu rõ ràng; xóa đúng hạn.
- **Log:** không chứa dữ liệu cá nhân nhạy cảm.
- **Lineage:** với output AI có hậu quả (tier T2 trở lên), ghi nguồn dữ liệu đã dùng.
- **Quyền của khách:** có cách để khách yêu cầu xem hoặc xóa dữ liệu của họ.
- **Bất biến dữ liệu:** tuyên bố ở `04-CONSTRAINTS` (ví dụ ref_id là slug thuần) và kiểm bằng script.
