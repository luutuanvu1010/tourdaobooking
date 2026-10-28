# Trang ghép — ADR-0118 (CLAUDE.md §9)

Lượt duyệt này có **một** ADR với ba quyết định chạm dữ liệu (Đ1 cột nhóm, Đ2 view công bố, Đ4 cột địa điểm) — trong trần 3. Đ3 là luật máy chủ, Đ5 giao diện, Đ6 không đổi quyền.

| Hỏi | Trả lời |
|---|---|
| Bảng này chứa những loại thực thể nào | `ctl_group`: nhóm dịch vụ, nhận thêm cờ đưa đón. `loc_location`: địa điểm mọi loại (văn phòng, quầy vé, bến, cảng, khách sạn, sân bay, ga cáp treo), nhận thêm thứ tự chọn nhanh. Không bảng dùng chung nào nhận loại dữ liệu mới. |
| Dòng bản đồ quyền nào chạm bảng này | Chỉ `admin.manage` (Quản trị, Toàn quyền) cho ghi cờ nhóm và cờ điểm; không dòng mới, không đổi nghĩa dòng cũ. Đọc: mọi tài khoản đăng nhập, như hôm nay. |
| Cổng nào canh cửa nào | **Máy chủ** (`orders`) chặn ghi/xác nhận chặng cho dịch vụ thuộc nhóm tắt. **Máy chủ** (`catalog`, `locations`) chặn ghi cờ khi không có `admin.manage`. **Giao diện** ẩn khối đưa đón và hiện nút chọn nhanh chỉ để tiện, **không phải cổng**; Đối tác và Thực tập thấy cùng kết quả vì cờ là dữ liệu, không theo vai. |
| Chỗ giao diện ẩn/hiện theo quyền bị đổi nghĩa | Không có. Khối đưa đón vốn ẩn/hiện theo dịch vụ có chặng; thêm điều kiện "nhóm cho đưa đón" không phụ thuộc vai. |
