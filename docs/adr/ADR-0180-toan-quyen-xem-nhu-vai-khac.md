# ADR-0180 — Toàn quyền «Xem như vai khác»

- **Trạng thái:** **accepted** 2026-11-07 — chủ dự án, nguyên văn: *«Duyệt ADR-0180»* (nút ở khung bước tiếp theo, trả lời câu «Bạn duyệt ADR-0180 để tôi lập kế hoạch thi công chứ?»). Chưa có mã. Số 0180: số lớn nhất thấy trên mọi nhánh là 0179; kiểm lại `ls docs/adr` và các nhánh trước khi nhập.
- **Nguồn:** `docs/superpowers/specs/2026-11-07-xem-nhu-vai-khac-design.md` (lời chủ, tiêu chí nghiệm thu, kết quả vòng kiểm độc lập). Lệch giữa hai nơi: ADR này thắng.
- **Loại:** việc lớn (quyền, nhật ký). **Cửa:** hai chiều (tắt được chức năng; cột và dấu nhật ký thêm vào ở lại).
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 3** (Đ1, Đ2, Đ3).
- **Lời chủ dự án (chat 2026-11-07, AI chép lại):** *«Toàn quyền có thể quyết định chọn cách thức hiển thị theo bất kỳ vai nào trong toàn hệ thống, để trực tiếp xem giao diện của người dùng mà không cần đăng nhập tài khoản với đúng vai đó»*; *«hiển thị và thao tác được, y như thể đang đăng nhập vậy đó»*; chuyển vai ở bảng điều khiển cá nhân; *«một vai mỗi lần»*; dữ liệu tạo ra tính cho tài khoản Toàn quyền, nhật ký ghi kèm «đang đóng vai X». Ba điểm chủ chọn (phương án khuyến nghị): vẫn vào được khi bảo trì; danh sách là mã quyền, không có IT/Toàn quyền; tự hết sau 60 phút không thao tác.
- **Quan hệ với ADR cũ:** **ngoại lệ có điều kiện** của ADR-0014 điều 2 (Toàn quyền `any` ở mọi thao tác): quyền THẬT của tài khoản vẫn là Toàn quyền, chỉ quyền HIỆU LỰC của phiên thu hẹp trong lúc đóng vai. Giữ nguyên ADR-0042/0044 (vai ẩn), ADR-0090 (quyền tiền), ADR-0176.

## Quyết định
**Đ1. Cơ chế đóng vai và quyền hiệu lực.**
1. Chỉ người **thật sự giữ `SUPER_ADMIN`** bật được. Trình duyệt không tự khai vai: vai đang đóng nằm **một cột nullable trên dòng phiên `aut_session`** (migration mới, thêm vào `findLiveSession`), gắn theo từng phiên (đóng ở máy A không ảnh hưởng máy B). Đăng xuất hoặc kết thúc phiên từ xa thì hết đóng vai.
2. Trong lúc đóng vai, bộ quyền hiệu lực của phiên = **đúng bộ quyền của mã quyền được chọn**, **không còn `SUPER_ADMIN`**. Tính ở **một chỗ duy nhất** (nơi `currentStaff` dựng `staff.permissions`); route không tự tính. Danh sách chọn là mã quyền, một mã mỗi lần, **không có `SUPER_ADMIN` và không có vai hồ sơ mang nó (IT)**.
3. Tự hết sau **60 phút không thao tác**, về lại Toàn quyền.
4. Mọi nơi đọc quyền ngoài bộ hiệu lực (đọc thẳng `stf_permission`, `v_stf_toan_quyen`, kiểm `SUPER_ADMIN` ngoài bản đồ quyền, ví dụ `feedback/repository.ts`) phải được rà từng chỗ, ghi rõ theo bộ hiệu lực hay theo quyền thật, kèm bài kiểm quét.
5. Dữ liệu ghi lúc đóng vai gắn `staff_id` của chủ. Khi bộ kích hoạt (trigger) hoặc luật hồ sơ từ chối vì chủ không có hồ sơ đối tác/tài xế, trả câu lỗi tiếng Việt rõ ràng là hành vi đúng.

**Đ2. Nhật ký.** Thêm cột `acting_role` vào `audit_log` (migration mới, số = lớn nhất trên `main` lúc gộp + 1). **Một hàm ghi duy nhất** (`insertStatement` của module audit) tự điền từ bối cảnh yêu cầu hiện hành; cấm handler tự truyền. Chỉ ghi mã vai, **không** SĐT/email/MST. Bài kiểm khoá: mọi đường ghi `audit_log` lúc đóng vai đều có dấu; ngoài đóng vai thì không có. Nhật ký riêng của module khác (nếu có) phải được rà.

**Đ3. Cổng thoát và bảo trì.** Route bật/thoát đóng vai xét quyền **THẬT** (`SUPER_ADMIN` của người đăng nhập), qua kiểm `Origin` cùng site như mọi POST, và đi qua được mọi cổng (access, `ADMIN_GATE`, `ACCOUNTS_GATE`, `OFFICE_GATE`, `ORDERS_GATE`) cùng cổng bảo trì dù vai đang đóng không có quyền, để chủ không bao giờ bị kẹt. Chế độ bảo trì vẫn miễn cho chủ khi đang đóng vai. Chính sách xác thực hai lớp chỉ xét lúc đăng nhập bằng quyền thật; đóng vai không đổi nó.

## Trang ghép (CLAUDE.md §9)
1. **Bảng chạm:** `aut_session` (thêm cột vai đang đóng; chứa phiên của mọi tài khoản, nhưng chỉ phiên Toàn quyền được ghi cột này) và `audit_log` (thêm `acting_role`).
2. **Dòng bản đồ quyền:** không đổi bản đồ; chỉ đổi **đầu vào** của nó (quyền hiệu lực). Bài kiểm ADR-0014 («cột Toàn quyền = `any`») phải đọc bộ quyền THẬT; thêm bài quét **toàn bộ** bản đồ quyền cho mọi mã chọn được.
3. **Cổng:** máy chủ chặn bằng bộ hiệu lực; riêng route bật/thoát và cổng bảo trì xét quyền thật. **Giao diện:** thanh «Đang xem như vai X» + nút Thoát hiện trên mọi trang có khung; mục chọn vai chỉ hiện cho người thật giữ Toàn quyền; menu/nút ẩn–hiện theo quyền hiệu lực (đổi nghĩa chỗ ẩn/hiện, ghi ở đây theo §9).

## Rủi ro đã nói với chủ
- Thao tác lúc đóng vai là **thật trên production** (chủ đã nghe và chấp nhận); nên dùng đơn thử/khách thử.
- Đóng vai Đối tác hay Tài xế có thể thấy dữ liệu trống hoặc bị từ chối ghi vì tài khoản chủ không có hồ sơ đó; đó là hành vi đúng, không phải lỗi.
- Chữ mới trên giao diện (tên mục, thanh báo) chưa có trong `docs/BANG-THAM-CHIEU.md`: khi thi công đưa chủ 2–3 tên để chọn, không tự đặt.

## Hàng rào và nghiệm thu
Hàng rào mới ghi `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật (bỏ điều kiện quyền thật ở route bật thì bài «người không giữ Toàn quyền bị từ chối» phải đỏ). Thi công xong có **người kiểm độc lập chỉ đọc** (Hiến pháp N8): điểm vòng kiểm trước ghi «chưa soi sâu» (trigger `0135`, `0144` cho vai đối tác/tài xế; ADR-0018, 0090, 0176) phải kiểm lại bằng mã thật.
