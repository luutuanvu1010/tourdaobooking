# Bảng việc trước khi đưa Nền tảng vào sử dụng (2026-10-13)

> Hồ sơ có ngày, lập từ 12 yêu cầu chủ dự án nêu ngày 13/10 cùng lượt kiểm toán cuối (`2026-10-13-prompt-kiem-toan-truoc-su-dung.md`). Trạng thái từng việc ghi ở cột cuối; thêm việc mới phải hỏi chủ. Mỗi việc kiến trúc có đặc tả + ADR riêng, mỗi việc một phiên.

## 1. Phân loại 12 yêu cầu

| # | Yêu cầu của chủ | Loại | Chạm gì | Đợt |
|---|---|---|---|---|
| 1 | Chính sách giá cho đưa đón (phụ thu 20.000 / 30.000, giảm giá) | Kiến trúc | tiền, danh mục, `buildLines` | Đợt 2 |
| 2 | Đăng ký tài khoản cho HDV / cộng tác viên / lữ hành, thu thông tin tối thiểu, giới thiệu (affiliate), điểm thưởng / voucher, trang Affiliate | Kiến trúc, lớn nhất | quyền, dữ liệu cá nhân, tiền, bề mặt công khai | Đợt 4 |
| 3 | Tạo đơn trên điện thoại: bỏ "Lọc sẵn có", Nhóm dịch vụ lên trên ô gõ, dạng nút chọn | Giao diện | chỉ `web/`, CSS | Đợt 1 |
| 4 | Ẩn nhãn, dùng chữ mờ trong ô ở Tạo đơn | Giao diện (có ràng buộc kỹ thuật, xem §3) | `web/`, CSS | Đợt 1 |
| 5 | Toàn quyền chọn nhóm dịch vụ nào hiện cho vai nào | Kiến trúc | quyền, danh mục, máy chủ phải chặn đặt | Đợt 3 |
| 6 | Bật/tắt đưa đón theo nhóm dịch vụ | Kiến trúc nhỏ | danh mục, kiểm ở máy chủ | Đợt 2 (cùng #1) |
| 7 | Bấm vào ô gõ là hiện cả danh sách dịch vụ | Giao diện | `web/catalog-picker.ts` | Đợt 1 |
| 8 | Dấu sao lên đầu dòng tên dịch vụ; tối ưu thị giác | Giao diện | `web/`, CSS | Đợt 1 |
| 9 | Bỏ ô "Ngày đón" (lấy ngày đơn); nơi trả chọn nhanh Cảng Vinpearl / Bến tàu du lịch; admin thêm điểm | Giao diện + luật nhỏ | `web/khoi-dua-don.ts`; điểm chọn nhanh = cờ trên danh mục địa điểm (có sẵn mô-đun `locations`) | Đợt 1 (phần ô) + Đợt 2 (cờ điểm chọn nhanh) |
| 10 | Thông tin chuyến: giờ khởi hành / ngày, giờ, nơi check-in có lệch cấu trúc? | Tra cứu | — | Trả lời ở §2; đưa vào prompt kiểm toán vùng B |
| 11 | Giải thích nút "Đặt qua đối tác" | Câu hỏi | — | Trả lời ở §2 |
| 12 | Đánh giá giao diện và luồng như chuyên gia UX | Đánh giá | — | Đợt 1 mở đầu bằng bản đánh giá có ảnh thật |

## 2. Trả lời hai câu hỏi (căn cứ mã thật)

**#10 — Thông tin chuyến.** Mỗi dịch vụ trong đơn có bốn ô: giờ khởi hành, ngày check-in, giờ check-in, nơi check-in (bảng `order_service`, từ migration `0008`; ngày khởi hành chọn một lần cho cả đơn theo ADR-0021). Ý nghĩa gốc (đặc tả 5.1/5.3): "check-in" là lúc và nơi khách phải có mặt trước giờ tàu chạy (ví dụ có mặt ở bến 7:45, tàu chạy 8:30); ngày check-in để trống nghĩa là cùng ngày khởi hành. Về dữ liệu, chúng có liên quan và không sai. Cái lệch là **về khái niệm sau ADR-0047**: từ khi có chặng đưa đón, "nơi trả của chặng đi" và "nơi check-in" thường là cùng một chỗ (bến tàu), và "giờ đón" với "giờ check-in" đè nhau về nghĩa, nên người dùng phải nhập hai lần cho một sự việc. Khuyến nghị: không đổi bảng; đổi chữ thành "Giờ tập trung / Điểm tập trung", ẩn nhóm check-in khi đơn đã có chặng đưa đón (lấy nơi trả của chặng đi làm điểm tập trung), và đưa vào prompt kiểm toán vùng B câu hỏi "ba mốc giờ của một buổi sáng có chỗ nào mâu thuẫn mà máy không chặn" (giờ đón sau giờ khởi hành, check-in sau khởi hành).

**#11 — "Đặt qua đối tác".** Nút này là của sổ đại lý đợt 1 (ADR-0077, bản 1.87): văn phòng ghi rằng đơn được bán qua một đại lý hoặc cộng tác viên, để lúc xác nhận máy chụp mức hoa hồng và sau này tính phần đối tác. Nó tách khỏi hai ô tên và số điện thoại khách vì ô tra theo số điện thoại điền tên **khách đi tour**, không dùng để chọn đại lý được. Nút chỉ hiện cho người nội bộ được lập đơn; tài khoản đối tác không thấy nút vì máy chủ tự gắn họ làm bên đặt. Cần thiết vì không có nó thì không có căn cứ trả hoa hồng. Hai điểm chưa hợp lý: (a) đợt 1 mới tìm được đại lý là **cá nhân**, công ty lữ hành chưa chọn được (giới hạn ghi ở `SYSTEM-DESIGN` §17), yêu cầu #2 sẽ giải quyết chính chỗ này; (b) trên điện thoại nó là một nút rời thêm vào màn đã dài; nên gom vào khối "Khách" thành một lựa chọn "Khách tự đặt / Đặt qua đại lý".

## 3. Ràng buộc kỹ thuật cho đợt giao diện (để không hứa sai)

- Ô ngày (`type="date"`) trên iPhone **không hiện chữ mờ** tự đặt; máy luôn hiện `dd/mm/yyyy`. Muốn ẩn nhãn "Ngày khởi hành" thì phải dùng nhãn nổi (chữ nhỏ nằm trong khung ô) hoặc nút chọn ngày tự vẽ. Khuyến nghị nhãn nổi, áp chung mọi ô.
- Ẩn nhãn vẫn phải giữ nhãn cho máy đọc màn hình (`aria-label`), và kịch bản Chrome kiểm màu, cỡ chữ 16px của ô.
- Nhóm dịch vụ dạng nút chọn: dữ liệu nhóm đã có (ADR-0058); chỉ đổi cách vẽ.
- Hiện cả danh sách khi bấm vào ô: danh mục hiện có vài chục dòng, cuộn được; nếu về sau quá dài thì cắt theo nhóm đang chọn.

## 4. Thứ tự các đợt và điều kiện sang đợt sau

| Đợt | Gồm | Vì sao đứng đây | Sang đợt sau khi |
|---|---|---|---|
| 0 | Kiểm toán cuối (prompt riêng, chạy **song song** với đợt 1 vì chỉ đọc) | Phải biết lỗ Critical/High trước khi thêm luật tiền và quyền mới | Báo cáo kiểm có kết luận; lỗi Critical/High vá xong hoặc ghi sổ hoãn |
| 1 | #12 đánh giá UX bằng ảnh thật hai cỡ màn → đặc tả "Tạo đơn trên điện thoại" gồm #3, #4, #7, #8, #9 (phần ô), gom "Đặt qua đối tác" vào khối Khách, đổi chữ nhóm check-in | Không chạm dữ liệu, quyền, tiền; làm được ngay; người dùng thật hưởng sớm nhất | Kịch bản Chrome xanh, ảnh trước/sau chủ duyệt, lên production |
| 2 | ADR giá đưa đón (#1) + bật/tắt đưa đón theo nhóm (#6) + cờ "điểm chọn nhanh" trên danh mục địa điểm (#9) | Cùng chạm danh mục và `buildLines`; là tiền nên cần kiểm độc lập và ca vàng Kế toán | Ca vàng Kế toán xác nhận; kiểm độc lập đạt |
| 3 | ADR nhóm dịch vụ theo vai (#5): bảng "nhóm × quyền" do Toàn quyền đặt, máy chủ chặn đặt chứ không chỉ ẩn | Là quyền; cần trang ghép (CLAUDE.md §9) | Bài kiểm "mỗi ô được máy chủ hỏi" phủ bảng mới |
| 4 | Đăng ký tài khoản + giới thiệu + điểm thưởng / voucher + trang Affiliate (#2) | Lớn nhất: mở bề mặt công khai, thu dữ liệu cá nhân theo luật, thêm một loại "tiền" mới (điểm, voucher); nên tách 2–3 ADR và làm **sau** khi Nền tảng đã chạy ổn với nhân viên thật | Chủ duyệt từng ADR; có người kiểm độc lập |

## 5. Quyết định của chủ (2026-10-13)

1. **Thứ tự bốn đợt** như §4; đợt 0 (kiểm toán) và đợt 1 (giao diện tạo đơn) chạy song song. — Chủ đồng ý.
2. **Giá đưa đón (#1):** phụ thu tính **theo người, theo chặng, theo vùng** do Quản trị đặt trong danh mục; giảm giá là chính sách riêng. — Chủ chọn.
3. **Đăng ký (#2):** mở **cả hai cửa**: qua đường link giới thiệu **và** cổng đăng ký công khai. — Chủ chọn (AI đã khuyến nghị chỉ link + duyệt; chủ quyết rộng hơn). Hệ quả phải ghi vào ADR: cần chống thư rác (Turnstile đã có ở đăng nhập), tài khoản mới ở trạng thái **chờ duyệt** không có quyền nào cho tới khi Quản trị / Nhân sự duyệt, và người giới thiệu chỉ được điểm khi tài khoản được duyệt.

## 6. Trạng thái

| Việc | Trạng thái |
|---|---|
| Prompt kiểm toán | Đã soạn, đã bổ sung câu #10 ở vùng B |
| Bảng việc này | Chủ đã chốt §5 ngày 13/10 |
| Đợt 1–4 | Chưa bắt đầu |
