# Rà soát ngôn ngữ giao diện — lượt 2 (2026-10-18)

- **Loại:** hồ sơ có ngày. Trỏ về `2026-10-18-ra-soat-ngon-ngu-giao-dien.md` §4 (danh sách để lượt 2) và §5 (lỗi logic kèm).
- **Cách hỏi:** ba lần hỏi, mỗi lần tối đa 3 khái niệm, mỗi phương án kèm bản xem trước chữ trên màn hình. Chủ dự án tự bấm chọn cả bảy (không câu nào hết giờ tự chọn).
- **Trạng thái:** chủ đã chọn tên; áp vào giao diện + `src/shared/bang-tu-giao-dien.ts`.

| Khái niệm | Nghĩa | Tên chủ chọn | Phương án khác đã đưa |
|---|---|---|---|
| «Người nhận tiền» / «Người thu» (ô chọn ai cầm tiền khách trả) | một ô, hai tên ở ba hộp | **Người thu tiền** («Người thu tiền đúng» ở hộp sửa) | Người nhận tiền · Người thu |
| «giữ hộ», «Người đang giữ tiền» | CHỈ nghĩa nhân viên cầm tiền của công ty; KHÔNG đụng «Đang giữ đơn» (đơn bị chặn) và nghĩa công ty giữ tiền khách | **chưa nộp về công ty** («Tiền chưa nộp về công ty», «X còn … chưa nộp về công ty») | Đang cầm tiền công ty · giữ nguyên |
| «chặng» | một lần đưa hoặc đón khách của đơn | **lượt đưa đón** (gọi tắt «lượt» khi đã rõ) | Lượt đón · giữ nguyên |
| «mốc» (mốc tối thiểu / mốc ra lệnh) | khoảng thời gian trước giờ đón mà sau đó phải Đặt gấp; CHỈ nghĩa này, không đụng «Đổi mốc nhắc» giấy tờ, «mốc giờ hẹn» | **hạn chốt** («Hạn chốt trước giờ đón», «Sắp tới hạn chốt», «Quá hạn chốt») | Thời gian báo trước · giữ «mốc», chỉ gộp tên |
| «xuất bến» | lúc chuyến xe bắt đầu chạy | **cho xe chạy** («Cho xe chạy», «Điều kiện cho xe chạy», «Thu hồi lệnh cho xe chạy») | Xuất phát · giữ nguyên |
| «vai» | vị trí của người/tổ chức với công ty (khác «quyền») | **vai trò** | Vị trí · giữ nguyên |
| «phiên», «Phiên đăng nhập» | mỗi máy đang đăng nhập vào tài khoản; KHÔNG đụng «phiên bản» | **máy đang đăng nhập** («Đăng xuất máy này») | Lần đăng nhập · giữ nguyên |

Mã nội bộ (tên hàm, `data-action`, đường API, cột CSDL, mã nhật ký) không đổi theo.
