# Kết quả rà soát lần cuối trước launch (17/10/2026)

> **Loại tài liệu:** hồ sơ có ngày, đóng băng khi viết xong. Có đợt rà soát mới thì viết bản mới trỏ về đây. Bộ prompt đã giao: `docs/superpowers/plans/2026-10-17-ra-soat-truoc-launch-prompts.md`. Rà ở bản production 2.16 (commit `0780d014`, mã không đổi tới `275c9faf`).
> **Cách rà:** năm tác nhân độc lập chạy đồng thời (A dự án, B UX, C UI, D bảo mật, E vận hành), chỉ đọc, chạy thử trên dữ liệu tạm, không chạm production. Báo cáo gốc nằm trong phiên làm việc; bảng dưới đây là bản gộp. Mức «ĐÃ XÁC NHẬN» nghĩa là người rà tự thấy bằng chứng; «SUY LUẬN» là chưa thấy trực tiếp.

## Kết luận

Về kỹ thuật, Nền tảng mở được: bộ kiểm xanh, không còn thay đổi dữ liệu nào chờ áp trên production, vai Bảo mật không tìm ra lỗ nào chặn launch (mọi cửa đọc đều kiểm quyền trên chính tài nguyên). **Nhưng chưa nên mở hôm nay** vì một nhóm việc chuẩn bị chưa xong (đa số là việc của chủ), cộng một câu thông báo sai có thể làm hướng dẫn viên tưởng mình không phải đi đón khách.

## Hai phát hiện được hai vai độc lập cùng thấy

| Mã gộp | Nội dung | Nguồn |
|---|---|---|
| G-1 | Sổ trạng thái triển khai (`docs/HANDOFF-N1.md`) còn ghi bản 2.11 và «CHƯA phát hành» cho các lát đã lên; không có điểm khôi phục, không có cách lùi từ 2.16; runbook lát xoá dữ liệu (0108) không có đoạn Hoàn tác | A-01, A-04, E-01 |
| G-2 | Ân hạn bảo mật hai lớp 14 ngày hết khoảng 30/10: tài khoản nội bộ chưa bật lớp hai bị khoá đăng nhập PIN cùng một ngày. Dải nhắc «Còn 14 ngày để bật bảo mật hai lớp» trên Trang chủ điện thoại lại bị ô tìm kiếm đè mất (C-02), nên người dùng có thể không thấy lời nhắc | A-05, E-02, C-02 |

## Điều kiện trước khi mở (chặn launch)

| # | Việc | Ai làm | Nguồn |
|---|---|---|---|
| 1 | Chế độ bảo trì **tự tắt 07:17 sáng 19/10 (giờ VN)**; nếu chưa muốn mở thì gia hạn trước giờ đó | Chủ | A-02 |
| 2 | Sửa câu thông báo giao đơn: người được giao đang đọc «… giao đơn … cho **người khác** phụ trách» (`src/shared/thong-bao.ts`, loại «giao») | AI, chủ duyệt | B-01 |
| 3 | Ghi mục trạng thái 2.16: bản lùi (2.11), điểm khôi phục dữ liệu, hoàn tác 0108; sửa các dòng «CHƯA phát hành» | AI (cần khối tóm tắt cuối của `trien-khai`) | A-01, E-01 |
| 4 | Quyết dọn hay giữ dữ liệu thử trên production (sổ tiền, nhật ký chỉ thêm, không xoá được), và có điểm khôi phục trước khi nạp dữ liệu thật | Chủ | A-03 |
| 5 | Gửi thử một Góp ý trên production, xác nhận thư về; ghi tên người trực và giờ trực | Chủ | A-07 |
| 6 | Chọn mức mở: 30 nhân viên trước, Đối tác (~1.000) theo đợt sau (tài khoản chỉ tạo từng cái; lớp hai bắt buộc cho Đối tác chưa có mã) | Chủ | A-09 |

## Sửa trong tuần đầu sau launch

| Mã | Nội dung | Nguồn |
|---|---|---|
| T-1 | Hết phiên / mất mạng lúc ghi khoản thu: số vừa gõ mất, không có câu «chưa ghi được, làm lại» (khoảng 30 chỗ dùng câu cụt «Không kết nối được máy chủ.») | B-02, B-03 |
| T-2 | Màn trống cho người mới: hướng dẫn viên thấy «Chưa có đơn nào khớp» khi đang có đơn chờ nhận ở trang Tôi; Đối tác lần đầu không biết làm gì; Trợ giúp nói sai «thanh dưới đáy chỉ có một nút» | B-04, B-05 |
| T-3 | Đơn dưới mốc 6 giờ: Bán hàng không có nút gửi đề nghị, Quản trị không nhận tin | B-06 |
| T-4 | Tài xế: «Khách đã huỷ» chạm một lần là ghi, không hỏi lại, không hoàn tác | B-07 |
| T-5 | Chữ: nút «Đảo», «Ghi lần thu» (BACKLOG mục 25); hộp lỗi form đơn không tự mất; Trợ giúp dùng «app» ~100 lần | B-08, B-09, B-12 |
| T-6 | Tiêu đề phiếu Góp ý không chặn dãy số: số điện thoại gõ vào sẽ nằm vĩnh viễn trong nhật ký (nhật ký chỉ thêm, lệnh xoá dữ liệu không chạm) | D-01 |
| T-7 | Giao diện điện thoại: tên khách bị cắt còn vài chữ ở danh sách đơn; nút nổi «Trợ lý» che nút «Ngừng dùng xe» | C-01, C-03 |
| T-8 | Ba kịch bản Chrome đỏ vì viết theo bản cũ (`a2-evidence`, `trang-chu-smoke`, `v1-bao-tri`); `v1-bao-tri` là kịch bản của việc tắt bảo trì ngày launch | C-04 |
| T-9 | Không có cảnh báo chủ động khi Nền tảng hỏng lúc nửa đêm; không có lịch chạy `audit-invariants` hằng ngày | E-03 |
| T-10 | Lớp chống ghi trùng đọc cả thân request (tới ~13 MB base64 khi tải ảnh) trước khi route chặn quá 10 MB; hai lần tải đồng thời có thể chạm trần bộ nhớ 128 MB của Worker (chưa đo trên Worker thật) | E-04 |
| T-11 | 18/90 ca sổ vàng tiền chờ Kế toán xác nhận (6 ca huỷ đơn có thu trước, 10 ca sửa số khách, 2 ca hoàn tất); Kế toán soát tay trong lúc chờ | A-06 |
| T-12 | Trợ giúp chưa có hướng dẫn cho «Hồ sơ của tôi», phiếu, hàng chờ xác minh | A-08 |

## Để sau

C-05 (nhật ký tràn ngang ở điện thoại), C-06 (màu/kiểu nút chưa thống nhất), C-07 (vùng chạm dưới 44px ở màn quản trị), C-08 (chữ xám khó đọc ở Gửi thông báo), C-09 (giá trị CSS thô ở style nội dòng), C-10 (hai tên thương hiệu; chưa có ảnh khởi động iPhone); B-10 đến B-15 (hướng dẫn viên không có nút từ chối, một trạng thái nhiều tên, giọng văn, lỗi hiện xa ô, trang 404 thô, nút «Tắt hai lớp» hiện thừa); D-02 đến D-05 (không trần số máy nhận thông báo, khoá tạm tài khoản bằng 5 lần sai PIN, PIN 6 số, một `test.todo`); E-05 đến E-08 (trần ~50.000 đơn mở ở Trang chủ, đồng bộ Sheet không chặn đổi giá hàng loạt, ảnh R2 mồ côi sau khôi phục D1, thông báo khi deploy lỗi sau migration); A-10 (lệch nhỏ ở tài liệu sống).

## Những thứ cả năm vai đều KHÔNG kiểm được

Dữ liệu production (thật hay thử, ngày ân hạn thật, ai đã bật lớp hai), bí mật trên Cloudflare đã đặt đủ chưa, gói Cloudflare và thời hạn Time Travel thật, iPhone thật, trợ lý AI trả lời thật, thông báo đẩy, kịch bản e2e (tránh chạy chồng), hành vi D1 thật của lệnh xoá (huỷ lô, thứ tự trigger) và lịch sử git tìm khoá bí mật lộ (bộ chặn từ chối lệnh).

## Điểm cần xét về cách rà

Người rà báo đã bị bộ chặn từ chối một số lệnh và đều làm lại bằng lệnh đơn giản hơn theo gợi ý của bộ chặn, không lách; vai D không chạy được lệnh xem header production. Không có lệnh cấm nào của dự án bị chạm.
