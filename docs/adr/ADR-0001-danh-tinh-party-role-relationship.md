# ADR-0001 — Danh tính theo mô hình Party–Role–Relationship

- **Trạng thái:** **accepted** (chủ dự án duyệt 2026-09-20). Bằng chứng D1 ở mục Bối cảnh chưa được cung cấp khi duyệt: chuyển thành **cổng bắt buộc trước khi áp migration N1 lên remote** (đặc tả N1 §9); thiết kế không đổi dù kết quả thế nào. Sau khi accepted chỉ sửa trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này. **Thay câu bởi [ADR-0098](ADR-0098-tra-trung-ho-so-theo-sdt.md)** (accepted 2026-10-03): mục 8 — khi lập đơn máy chủ tra trùng theo SĐT chuẩn hoá và dùng lại hồ sơ có sẵn (không còn lựa chọn "tạo mới" khi đã có hồ sơ cùng số); Danh bạ chặn tạo hồ sơ mới trùng số, hồ sơ cũ cảnh báo; chỉ mục không duy nhất giữ nguyên.
- **Ngày:** 2026-09-20   **Người phê chuẩn:** chủ dự án (đã duyệt 2026-09-20)
- **Loại quyết định:** **cửa một chiều** (Điều 7.2) — cần phê chuẩn đầy đủ
- **Liên quan:** ADR-0002 (sở hữu dữ liệu), ADR-0003 (chuẩn dữ liệu), ADR-0005 (quyền app), ADR-0006 (phân công)

## Bối cảnh
- Hiện danh tính = bảng `staff` (tài khoản đăng nhập, vai trò đơn trị `sales|admin`). Khách hàng chỉ là bốn trường chữ trên `orders`. Chưa có đại lý, hướng dẫn viên (HDV), lái cano, tài xế, kế toán.
- Yêu cầu của chủ dự án (2026-09-20): một con người cụ thể có **nhiều vai tuỳ nơi** (Nguyễn Tuyên Phong là nhân viên bán hàng ở Văn phòng Trần Phú nhưng là HDV ở Bến cảng Vinpearl); khách hàng và đại lý là **hồ sơ dùng lại**; mỗi booking phải trả lời được bảy câu hỏi hàng ngày (ai đặt; chi tiết; đã trả chưa, thế nào, bao nhiêu, hình thức; có yêu cầu hoá đơn không; ai xử lý — gọi điện, đón tại cảng/khách sạn; khách có hẹn đón không, mấy giờ; tài xế đón mấy giờ).
- **Cửa sổ chi phí thấp — chưa được xác minh.** Lập luận "làm ngay bây giờ" đứng trên giả định *ít hoặc không có đơn thật trên remote D1*. Các tài liệu tự lệch nhau: `HANDOFF-M4.md` ghi remote đã áp `0005`+`0006`, **0 đơn**, Worker **chưa deploy**, `0007` chưa áp; ghi nhớ của chủ dự án lại ghi đã deploy ngày 2026-09-19 kèm `0007`. Phiên rà soát không có quyền `wrangler` remote nên không kiểm được.
  - **Bằng chứng cần có trước khi ADR này chuyển sang accepted (Điều 8.2)** — chủ dự án chạy hai lệnh chỉ-đọc và dán kết quả (kèm ngày giờ) vào mục này:
    `npx wrangler d1 migrations list tourdao-sales-db --remote` và
    `npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS orders FROM orders"`.
  - Nếu kết quả là 0 đơn: dựng danh tính trên dữ liệu rỗng gần như miễn phí (backfill không có gì để chuyển). Nếu đã có đơn thật: **thiết kế không đổi**, chỉ tốn thêm bước backfill hồ sơ từ tên/SĐT khách đang có. Cửa sổ rẻ **hết hạn** ngày đơn thật đầu tiên được lập.

## Quyết định
1. Mọi bên có tên — cá nhân hoặc tổ chức — là **một Hồ sơ** (`pty_party`); mỗi thực thể ngoài đời chỉ có một hồ sơ, dù đóng nhiều vai.
2. **Vai trò là thực thể thật**: `pty_party_role(hồ sơ, loại vai trò, địa điểm?, valid_from_date, valid_to_date)` ghi "hồ sơ X giữ vai Y (tại nơi Z, trong khoảng ngày T)". Loại vai trò là bảng tra cứu `pty_role_type` (nhân sự, đại lý, hướng dẫn viên, tài xế, lái cano, kế toán, …; thêm loại = thêm dòng).
3. **Quan hệ** giữa hai hồ sơ là thực thể `pty_party_relationship` (vd người liên hệ của một đại lý là tổ chức), có loại quan hệ tra cứu và hiệu lực từ–đến.
4. **Hoà giải với "vai chỉ là nhãn khi gán, không giới hạn người được chọn"** (chủ dự án, 2026-09-20): mỗi phân công lưu `hồ sơ + loại vai trò + địa điểm + giờ` bằng **khoá ngoại tới danh mục** (truy vấn được: "ai là HDV ở Bến cảng Vinpearl hôm nay"). **Máy chủ và giao diện không dùng vai trò làm cổng chặn việc chọn người.** Vai trò được ghi và truy vấn; *không* là điều kiện cho phép chọn ai. (Vai trò được phép là *dữ liệu đầu vào của quy tắc giá* — vd giá net theo nhóm HDV ở N4 — vì đó là tính giá, không phải chặn người; quy tắc giá cụ thể do ADR của N4 quyết.)
5. **Tài khoản đăng nhập vẫn là `staff`**: `staff` trỏ hồ sơ bằng `staff.party_id` (bắt buộc), tức `staff` phụ thuộc `parties`.
   - **Số điện thoại đăng nhập (`staff.phone`) là tên định danh xác thực của tài khoản, không phải số liên hệ.** Số liên hệ của hồ sơ chỉ nằm ở `pty_contact_point`. Hai sự thật khác nhau và có thể khác giá trị (dữ liệu thật: số đăng nhập của Nguyễn Tuyên Phong là hotline công ty `0845 256 256`, chủ dự án xác nhận đúng — sao chép nó thành "số liên hệ cá nhân" sẽ hiển thị sai).
   - Để không thành hai nguồn lệch nhau âm thầm (P6): migration **không** sao chép `staff.phone` sang hồ sơ; giao diện **không bao giờ** hiển thị số đăng nhập như số liên hệ; nếu người dùng muốn dùng cùng số, đó là một thao tác tạo dòng liên hệ **độc lập** (sao chép theo yêu cầu, không đồng bộ).
6. **Khách hàng và đại lý không có tài khoản** ở giai đoạn này (chủ dự án, 2026-09-20). Một danh bạ chung: hồ sơ của nhân sự, khách, đại lý cùng một bảng.
7. **Các bên trên một booking** (thuộc `orders`, đặc tả N2): `booker_party_id` — người đặt, cá nhân **hoặc tổ chức** (đại lý); `traveller_party_id` — khách đi tour / liên hệ chính (rỗng = trùng người đặt). **Khách lẻ trong đoàn không phải hồ sơ**: số khách vẫn là số lượng theo loại (A1). Với người đặt là đại lý (tổ chức), người liên hệ của đại lý suy ra qua `pty_party_relationship`, không lưu lặp trên đơn.
8. **Nhận dạng hồ sơ (khách/đại lý "dùng lại"):** số điện thoại **chuẩn hoá** (dùng lại `src/modules/staff/phone.ts`) là khoá tra khi lập đơn. `pty_contact_point(kind = 'PHONE', value_normalized)` có chỉ mục **không duy nhất** (một số dùng chung là chuyện thật: gia đình, hotline). Khi lập đơn, giao diện **bắt buộc** hiện danh sách hồ sơ trùng số để người dùng chọn "dùng hồ sơ có sẵn" hay "tạo mới"; không tự tạo hồ sơ thứ hai âm thầm. **Gộp hồ sơ** là thao tác của quyền Quản trị, thiết kế ở N2 (`pty_party.merged_into_id`, không xoá cứng — ADR-0003 điều 8); không gộp thì mọi đơn N2 sẽ sinh một hồ sơ mới và việc gộp về sau là viết lại `booker_party_id`/`traveller_party_id` trên dữ liệu thật.

## Lý do
- Trả lời được bảy câu hỏi bằng truy vấn khoá ngoại, không phân tích chữ tự do (tiêu chí kiểm được, Điều 6.2). Nếu phân công lưu vai trò là chữ tự do thì "ai là HDV ở cảng này" không truy vấn được — loại lỗi buộc làm lại toàn bộ sau này.
- "Một con người, nhiều vai tuỳ ngữ cảnh" đúng là Party/Role/Relationship của Oracle TCA và Universal Data Model; vai trò tách khỏi danh tính nên thêm vai mới không đụng bảng danh tính.
- Giữ `staff` làm bảng tài khoản cô lập rủi ro khỏi phần đăng nhập, PIN, chống dò đã được rà soát (P10).
- Tách số đăng nhập khỏi số liên hệ giống Oracle (`FND_USER` khác `HZ_CONTACT_POINTS`) và tránh hiển thị sai số hotline chung.

## Phương án bị loại
- **B — gộp `staff` vào hồ sơ** (một bảng, cột đăng nhập nullable): sạch nhất nhưng đụng toàn bộ xác thực, nhật ký và khoá ngoại; rủi ro cao nhất trên phần nhạy cảm nhất.
- **C — bảng riêng cho khách và đại lý**: hai đến ba danh bạ trùng lặp; một người nhiều vai thành nhiều hồ sơ; trái quyết định "danh bạ chung".
- **Vai trò chỉ là cột chữ/enum trên phân công**: không truy vấn được theo vai và nơi.
- **Vai trò làm cổng chọn người**: chủ dự án đã chọn "không giới hạn".
- **`staff.phone` làm nguồn duy nhất, hồ sơ đọc qua view của `staff`**: buộc `parties` đọc `staff` trong khi `staff` đã phụ thuộc `parties` (vòng), và hiển thị hotline chung như số cá nhân.
- **Đồng bộ hai chiều `staff.phone` ↔ `pty_contact_point`**: thêm cơ chế đồng bộ cho hai sự thật vốn khác nhau.
- **Mỗi khách trong đoàn là một hồ sơ / bảng nối `order_traveller`**: A1 đã chốt khách theo số lượng theo loại (tối đa 50/dịch vụ, không tên); thêm bảng nối là đắt và chưa ai cần.

## Hệ quả
- Migration N1: tạo hồ sơ cho mỗi `staff`, đặt `staff.party_id` (xem ADR-0005 về thứ tự và cơ chế). Migration N2: bốn trường khách chữ trên `orders` thành `booker_party_id` / `traveller_party_id`.
- Duy trì `pty_party_role` là việc của người có quyền Quản trị (màn hình quản lý hồ sơ, N1).
- Nợ có chủ đích: `pty_party_relationship` tạo ở N1 dù đại lý mới dùng từ N2 (nhu cầu đã biết).
- **Điều kiện chấp nhận (Điều 6.2), theo đợt sở hữu câu hỏi:** đặc tả của mỗi đợt phải ghi **truy vấn cụ thể** (bảng, phép nối) cho các câu hỏi thuộc đợt đó — câu 1, 2, 6 ở N2 (cùng cờ "có hẹn đón", ADR-0006); câu 5, 7 ở N2 với `dispatch`; câu 3, 4 ở N3 với `billing` — và N1 phải ghi truy vấn "ai giữ vai HDV ở Bến cảng Vinpearl" (`pty_party_role` ⋈ `pty_role_type` ⋈ `loc_location`, so `valid_*_date` với `vnToday()`; đây là câu "ai được ghi nhận giữ vai", khác câu "ai trực hôm nay" của ADR-0006). Truy vấn nào cần phân tích chữ hoặc lặp phía ứng dụng trên các dòng không liên quan thì mô hình sai và sửa **trước khi** viết mã.
