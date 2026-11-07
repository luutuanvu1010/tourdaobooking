# Xem như vai khác (Toàn quyền đóng vai) — đặc tả thiết kế

- **Trạng thái:** bản đề xuất, **chờ chủ dự án duyệt**. Chưa có mã. Cần ADR mới (số kế tiếp = lớn nhất trong `docs/adr` và mọi nhánh + 1; kiểm trước khi đặt, hiện `ls docs/adr` thấy tới 0178).
- **Ngày:** 2026-11-07. **Loại:** việc lớn (chạm **quyền**, nhật ký). Thi công xong phải có người kiểm độc lập chỉ đọc (CLAUDE.md §3).
- **Lời chủ (chat 2026-11-07):** tài khoản Toàn quyền chọn xem Nền tảng theo bất kỳ vai nào, **hiển thị và thao tác được như đang đăng nhập đúng vai đó**; chức năng đặt trong bảng điều khiển cá nhân; **một vai mỗi lần**; dữ liệu tạo ra tính cho tài khoản Toàn quyền, nhật ký ghi kèm "đang đóng vai X". Chủ đã chốt toàn bộ mô tả này.

## Mục đích
Chủ kiểm tra giao diện và trải nghiệm của từng vai mà không phải đăng nhập tài khoản khác.

## Làm gì
1. Bảng điều khiển cá nhân của người **thật sự giữ Toàn quyền** có mục "Xem như vai khác": danh sách các vai của Nền tảng, chọn **đúng một**, và nút thoát.
2. Máy chủ **ghi nhớ vai đang đóng ở phía máy chủ** (gắn với phiên đăng nhập), không tin trình duyệt tự khai.
3. Trong lúc đóng vai, **bộ quyền hiệu lực** của phiên = bộ quyền của vai đó, **không còn Toàn quyền** (Toàn quyền hôm nay là `any` ở mọi thao tác, nên bắt buộc phải bỏ nó khỏi phiên, nếu không bạn không thấy được điều vai kia bị cấm). Mọi kiểm quyền (route, ô quyền, giao diện ẩn/hiện, `GET /api/me`) đọc bộ quyền hiệu lực.
4. Mọi trang có **thanh cố định** "Đang xem như vai X" kèm nút **Thoát**. Đăng xuất, hết phiên, hoặc bấm Thoát thì trở về Toàn quyền.
5. Dữ liệu ghi trong lúc đóng vai thuộc **tài khoản Toàn quyền của chủ** (không phải một nhân viên khác). Mỗi dòng nhật ký ghi trong lúc đóng vai kèm dấu "đang đóng vai X" (mã vai, không ghi SĐT/email/MST — luật nhật ký §7).
6. Việc vai đó vốn bị cấm (đổi quyền người khác, xem tiền chỉ Toàn quyền…) thì bị chặn y như họ.

## Không làm (non-goals / anti-goals)
- **Không** đóng vai một tài khoản cụ thể và không xem dữ liệu "của người đó" (vai là bộ quyền, không phải con người; "đơn của tôi" khi đóng vai là đơn của chính chủ, có thể trống).
- **Không** chọn nhiều vai cùng lúc (xem người kiêm nhiệm: làm sau nếu chủ cần).
- **Không** để người không giữ Toàn quyền bật được; **không** để việc đóng vai nâng quyền của ai khác.
- Thất bại nếu: đóng vai mà máy chủ vẫn cho làm việc ngoài quyền của vai; hoặc nhật ký không phân biệt được việc làm lúc đóng vai.

## Ràng buộc
- Vai ẩn: người không giữ Toàn quyền không thấy chức năng này, không thấy chữ "Toàn quyền" lộ ra (ADR-0042/0044).
- Nhãn tiếng Việt có dấu, tra `docs/BANG-THAM-CHIEU.md`; chữ mới (tên mục, thanh báo) đưa chủ chọn nếu bảng chưa có.
- Hàng rào mới ghi vào `docs/SO-HANG-RAO.md` và phải quan sát chặn thật một lần (sửa cố ý → đỏ → hoàn nguyên).
- Dựa trên lớp tự phục vụ hiện có của bảng điều khiển cá nhân; không phát sinh phụ thuộc mới.

## Tiêu chí nghiệm thu (hành vi kiểm được)
1. Người không giữ Toàn quyền gọi route bật đóng vai: bị từ chối.
2. Toàn quyền bật vai Kế toán: gọi một route chỉ Toàn quyền hoặc chỉ Bán hàng: 403, gọi route của Kế toán: được.
3. `GET /api/me` trong lúc đóng vai trả đúng bộ quyền của vai đã chọn và cho biết đang đóng vai; thoát thì trả lại Toàn quyền.
4. Một thao tác ghi trong lúc đóng vai để lại nhật ký có dấu vai; ngoài đóng vai thì không có dấu.
5. Hết phiên/đăng xuất thì không còn vai đang đóng.
6. Ma trận 11 vai: mỗi vai được chọn ra đúng bộ quyền của nó (kể cả vai đứng một mình như `DRIVER_PARTNER`); không có đường nào cho tổ hợp bị cấm.

## Phần để người thi công quyết (đánh dấu là lựa chọn của AI, chủ chưa duyệt chi tiết)
- Nơi lưu vai đang đóng: đề xuất **một cột trên dòng phiên** (cần migration mới, chỉ thêm tệp; kiểm lại bảng phiên thật trước khi chốt). Phương án thay thế: trong chữ ký cookie phiên. Chọn một, ghi lý do trong ADR.
- Cách `currentStaff` tính bộ quyền hiệu lực: một chỗ duy nhất ở gốc lắp ráp, route không tự tính.
- Vị trí dấu "đang đóng vai" trong nhật ký (cột mới hay trong phần chi tiết), phải có test khoá.

## Sửa sau vòng kiểm độc lập 2026-11-07 (người kiểm chỉ đọc; AI đã nhận các điểm dưới, không cần chủ quyết)
1. **Nơi lưu vai: chốt một cột nullable trên dòng phiên** (`aut_session`, migration mới, thêm vào `findLiveSession`). Bỏ phương án cookie (khó thu hồi; cột cho phép đăng xuất từ xa kết thúc đóng vai). Vai gắn theo **từng phiên**: đóng ở máy A không ảnh hưởng máy B.
2. **Nhật ký:** `audit_log` chưa có cột phiên/vai và ~44 tệp gọi ghi nhật ký. Chốt: thêm cột `acting_role` (migration mới) do **một hàm ghi duy nhất** (`insertStatement` của module audit) tự điền từ bối cảnh yêu cầu hiện hành; **cấm** truyền tay từng handler. Test khoá: mọi đường ghi `audit_log` lúc đóng vai đều có dấu. Nhật ký các bảng khác (bil_*, thongbao, ve-dien-tu…) phải rà xem có bảng nhật ký riêng không.
3. **Rà mọi nơi đọc quyền ngoài bộ quyền hiệu lực** (đọc thẳng `stf_permission`, `v_stf_toan_quyen`, kiểm `SUPER_ADMIN` ngoài MATRIX; ví dụ `feedback/repository.ts` đọc view theo staff.id). Mỗi chỗ phải ghi vào ADR: theo bộ hiệu lực hay theo quyền thật, kèm test "đóng vai X thì không đường nào cho đi lọt như Toàn quyền".
4. **Route bật/thoát đóng vai xét quyền THẬT** (người đăng nhập giữ `SUPER_ADMIN`) và phải đi qua mọi cổng (access, ADMIN_GATE, ACCOUNTS_GATE, OFFICE_GATE, ORDERS_GATE) và cổng bảo trì dù vai đang đóng không có quyền, để chủ không bao giờ bị kẹt.
5. **Danh sách chọn** không có "Toàn quyền". Test ma trận quét **toàn bộ** bản đồ quyền cho mọi vai chọn được, không chỉ ví dụ. Test ADR-0014 (cột Toàn quyền = `any`) phải đọc bộ quyền THẬT; ADR mới ghi đây là ngoại lệ có điều kiện của ADR-0014 điều 2.
6. **Tiêu chí thêm:** route bật/thoát qua kiểm `Origin` cùng site; đóng vai không đổi chính sách MFA (chỉ xét lúc đăng nhập, đọc quyền thật); thanh "Đang xem như vai X" hiện trên mọi trang có khung; hàng rào ghi `docs/SO-HANG-RAO.md` kèm cách chứng minh chặn thật (bỏ điều kiện quyền thật ở route bật thì bài 1 phải đỏ).
7. **Ghi bằng vai Đối tác/Tài xế:** lệnh ghi lúc đóng các vai này gắn `staff_id` của chủ; trigger so khớp hồ sơ theo `party_id` (0135, 0144) có thể từ chối hoặc ghi sai khi chủ không có hồ sơ đó. Người thi công kiểm từng trigger; từ chối rõ ràng bằng câu tiếng Việt là hành vi đúng.

## Ba điểm chủ đã chọn (2026-11-07, trả lời qua hộp hỏi; cả ba đều là phương án khuyến nghị)
- (a) Đang đóng vai vẫn vào được khi bảo trì (để thoát vai); mục Góp ý/kỹ thuật theo vai đang đóng.
- (b) Danh sách chọn là **mã quyền**, không có IT và Toàn quyền.
- (c) Đóng vai **tự hết sau 60 phút không thao tác**, tự về Toàn quyền.

## Điều chưa chắc, cần chủ biết
- Thao tác thật trên production trong lúc đóng vai là có hiệu lực thật (chủ đã nghe và chấp nhận). Nên đóng vai khi cần xem; việc tạo đơn thử nên dùng đơn nháp/khách thử.
- Tab của vai đối tác/tài xế dựa vào hồ sơ gắn với tài khoản; có thể thiếu dữ liệu khi chủ không có hồ sơ đó. Hiển thị trống là hành vi đúng, không phải lỗi.
