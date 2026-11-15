# Rà soát trước ngày dùng thật, lần 2 — 7/11/2026

> Hồ sơ có ngày, viết xong là đóng băng. Lần trước: `docs/superpowers/specs/2026-10-17-ket-qua-ra-soat-truoc-launch.md`.
> Người rà: một phiên AI vai Giám đốc dự án, chỉ đọc mã, cùng bốn trợ lý chỉ đọc. Đây là ý kiến đầu vào; chủ dự án quyết.
> Bản được rà chính là bản đang chạy trên bản thật: lệnh chỉ đọc của Cloudflare lúc 23:02 cho thấy bản triển khai 22:04 (có mã «Xem như vai trò khác») đang chạy 100%, và sổ phát hành ghi bản đó dựng đúng từ mã được rà; số bản vẫn hiện 2.73. Bằng chứng: `phu-luc/` (00 phạm vi và bộ kiểm, 01 tiền, 02 quyền và Đối tác, 03 giao diện, 04 vận hành, 05 sổ việc cũ); ảnh: `docs/evidence/2026-11-07-ra-soat-truoc-launch-lan-2/`.

## Kết luận

Nhân viên bắt đầu nhận đơn thật và thu tiền thật được, với điều kiện làm xong danh sách «dữ liệu phải có trước ngày dùng thật» ở dưới; quan trọng nhất là mọi tài khoản nội bộ còn đăng nhập được (bảo mật hai lớp) và Kế toán nhập Cấp độ đại lý cùng mức hoa hồng trước đơn đại lý đầu tiên. Chỉ có một lỗi chặn, và nó chặn việc mở cho Đối tác chứ không chặn nhân viên: tài khoản Đối tác tạo theo kiểu cũ tự lập đơn thì hoa hồng về 0 mà không ai được báo; soát danh sách tài khoản và gán đúng vai trò là hết. Bộ kiểm của máy đều xanh (kiểm kiểu; 8.315 bài kiểm thường; bộ kiểm toàn luồng 85/85 kịch bản, kèm bốn lần kiểm bất biến trên dữ liệu thử của máy đều đạt; dữ liệu bản thật thì đợt này không được kiểm). Còn khoảng mười việc nên sửa trong tuần đầu; dùng đúng quy trình thì không việc nào làm sai tiền, trừ một đường hiếm ở Trả sau (T-03) hiện chưa dùng tới.

## Chặn ngày dùng thật

| Mã | Chuyện gì | Ai gặp, lúc nào | Bằng chứng | Việc đề xuất | Lớn/nhỏ |
|---|---|---|---|---|---|
| T-01 | Tài khoản Đối tác kiểu cũ chỉ mang quyền Đối tác, hồ sơ không có vai trò đối tác («Công ty lữ hành», «Cộng tác viên»…). Đơn họ tự lập bị coi như khách lẻ: hoa hồng 0, đơn không bị giữ, không ai được báo. | Đối tác kiểu cũ, từ đơn đầu tiên họ tự lập. Tài khoản tạo mới ở màn Quản lý tài khoản không dính; Bán hàng không chọn nhầm được hồ sơ đó làm đại lý. Còn một đường sinh lỗi: Toàn quyền tích «Đối tác» ở khối «Quyền cũ» khi sửa tài khoản chưa gán vai trò. | Phụ lục 01, T-01: ĐÃ XÁC NHẬN, phiên điều phối tự chạy lại. Số tài khoản như vậy trên bản thật: CHƯA KIỂM. | Trước khi mở cho Đối tác và trước đơn đại lý đầu tiên: ở Quản lý tài khoản, tìm dòng «Đối tác (chưa gán vai trò)» và gán vai trò đúng. Lâu dài: máy chủ từ chối đơn của Đối tác chưa mang vai được hưởng. | Soát: nhỏ. Chặn ở máy chủ: lớn, cần chủ duyệt. |

## Sửa trong tuần đầu

| Mã | Chuyện gì (ai gặp) | Bằng chứng | Việc đề xuất · cỡ |
|---|---|---|---|
| T-02 | Đơn đại lý xác nhận lúc chưa có mức hoa hồng bị giữ ở «Khách đã trả đủ»; nhập mức sau không sửa đơn cũ, phải ghi tay từng dòng. Tiền không sai, chỉ tắc. | 01, T-02 | Nhập mức trước (danh sách dưới); câu báo nói rõ · nhỏ |
| T-03 | Đơn Trả sau đã thu đủ đổi được bên đặt sang đối tác chưa có hạn mức, rồi đảo khoản thu làm đối tác đó mang nợ (hiếm) | 01, T-03 | Đòi bên mới có hạn mức · vừa, chạm tiền |
| G-03 | Hết phiên giữa lúc lập đơn: về trang đăng nhập không lời giải thích, chữ đã gõ mất (mục cũ T-1) | 03, G-03 | Giữ nháp trên máy, báo «đăng nhập lại để tiếp tục» · vừa |
| G-02, G-04 – G-06 | Quên chọn Đón/Không đón thì đơn bị lưu nháp và chuyển trang; Quản lý bán hàng trên iPhone không tới được «Dịch vụ & giá», ở đó công tắc không có chữ và «Ngừng bán» không hỏi lại; tám chỗ chữ khó hiểu (ví dụ «Duyệt đặt gấp», «2,8tr ₫») | 03 | Sửa theo phụ lục 03 · nhỏ |
| Q-05 | Chuyến quên bấm «Kết thúc» thì tài xế còn thấy tên, năm sinh, SĐT liên hệ của khách nhiều ngày (mục cũ E-1) | 02, Q-05 | Hạn cuối hết ngày hôm sau hoặc tự kết thúc · vừa |
| Q-07 | Công tắc thu tiền Đối tác ở Tắt (theo sổ, hiện đang Bật): câu báo vé khoá chỉ sai việc phải làm | 02, Q-07 | Đổi câu · nhỏ |
| V-01 | Lỗi máy chủ bảo «báo kèm mã này» nhưng không hiện mã | 04, V-01 | Ghép mã vào câu · nhỏ |
| R3d | Bán hàng ngưng được hồ sơ khách dùng chung, đơn nháp của đồng nghiệp báo lỗi; nhật ký không ghi | 02, Q-04 | Chủ quyết ai được ngưng · vừa |

Để sau: Q-01–Q-03, Q-08, G-07, G-08, G-10, G-11, V-02, V-03 (phụ lục 02–04, kèm khuyến nghị).

## Dữ liệu phải có trước ngày dùng thật

1. **Mọi tài khoản nội bộ đăng nhập được.** Chủ hoặc Quản trị xem nhãn hai lớp ở Quản lý tài khoản. Theo sổ phát hành, ân hạn chung đã hết từ cuối tháng 10, nên ai chưa bật và quá hạn thì đã bị chặn đăng nhập; bấm «Tắt bảo mật hai lớp» để mở 24 giờ cho họ tự bật. Khoá cấu hình hai lớp gần như chắc đã có (lệnh triển khai tự dừng khi thiếu, hai lần triển khai hôm nay đều qua — SUY LUẬN), nhưng nên có một người bật thử trọn vòng trên iPhone.
2. **Tài khoản Đối tác đều có vai trò đối tác** (chủ soát, T-01). Thiếu: hoa hồng 0 mà không ai biết.
3. **Cấp độ đại lý, gán cấp, mức hoa hồng** (Kế toán), trước đơn đại lý đầu tiên. Thiếu: đơn bị giữ, ghi tay (T-02); trang Hoa hồng có khung vàng báo vai trò thiếu mức.
4. **Hồ sơ công ty chủ** đủ tên, MST, địa chỉ, liên hệ «Hotline» (Toàn quyền). Thiếu: biên nhận báo «Chưa có thông tin công ty». Trang công khai lúc 22:54 cho thấy đã có tên và MST; Hotline chưa kiểm.
5. **Tài khoản ngân hàng nhận tiền** (Kế toán hoặc Toàn quyền). Thiếu: không hiện mã QR, có câu báo.
6. **Chính sách điều phối (mốc 6 giờ)**. Thiếu: đơn có đưa đón không lập, không xác nhận được, có câu báo.
7. **Xe đủ kiểm định và bảo hiểm** (Quản trị). Thiếu: xe bị chặn ở bước cho xe chạy; theo sổ phát hành, lần kiểm bất biến bản thật của chủ lúc 19:38 nêu bảy xe như vậy. Quyết định cho xe thiếu giấy tờ vẫn chạy (ADR-0184) chưa có mã.
8. **Hạn mức Trả sau** chỉ cần khi gỡ lời cấm; chưa có thì đơn Trả sau bị chặn có câu.

Tình trạng thật của các mục trên bản thật: CHƯA KIỂM, trừ một phần mục 4.

## Sổ «đã biết, đã quyết» (phụ lục 05)

Trong khoảng bốn mươi mục cũ, đã xong phần lớn điều kiện chặn của đợt 17/10 (bảo trì đang tắt; dọn dữ liệu thử ngày 2/11 theo sổ). Còn nguyên: hết phiên mất chữ, không cảnh báo khi Nền tảng hỏng ban đêm và không lịch kiểm bất biến hằng ngày, số điện thoại gõ vào tiêu đề Góp ý nằm vĩnh viễn trong nhật ký, Nhân sự tạo được tài khoản Bán hàng (chờ chủ), Bán hàng đặt giá 0 đồng vẫn xác nhận được (BACKLOG), diễn tập khôi phục chưa làm (chủ đã quyết phát hành trước).

## Việc theo lịch

- **00:00 ngày 16/11:** bộ kiểm thường tự đỏ vì HC-5.11 (tác vụ tự động đồng bộ danh mục chưa có định danh riêng, hạn 15/11); khi đỏ, lệnh nhập bản chính và lệnh triển khai đều dừng, kể cả bản sửa gấp. Khuyến nghị: chủ quyết trước 14/11, giao sửa hoặc gia hạn có lý do.
- **00:00 ngày 1/12:** đỏ thêm vì bốn mục hạn 30/11 (đơn huỷ còn tiền đã thu, duyệt hai người bút toán điều chỉnh, hai quyền đang hoãn).
- **1/1/2027:** đỏ vì diễn tập khôi phục và hai quyền hoá đơn (hạn 31/12).

## Chưa kiểm được và vì sao

Dữ liệu thật (cấm đăng nhập bản thật); iPhone thật (chỉ giả lập khổ màn); nhật ký lỗi, khoá bí mật, thư Góp ý của Cloudflare (không được chạy lệnh đọc); hai lệnh ghi đua nhau trên cơ sở dữ liệu thật (môi trường thử chạy từng lệnh một); thời hạn giữ điểm khôi phục; hai lớp trọn vòng, Face ID, bảo trì, Biên nhận mẫu HD-02-DT, vé và công nợ nhìn từ Đối tác, Trợ lý AI trả lời thật.

## Câu cần chủ quyết

1. **Làm T-01 thế nào?** (a) *Khuyến nghị:* soát và gán vai trò ngay, đồng thời cho AI soạn ADR chặn ở máy chủ trước khi mở Đối tác hàng loạt. (b) Chỉ soát, chưa chặn: rẻ hơn nhưng đường «Quyền cũ» vẫn sinh lỗi lại được.
2. **Ai đọc Góp ý, nhật ký lỗi và chạy kiểm bất biến bản thật mỗi sáng tuần đầu?** (a) *Khuyến nghị:* chủ giao một người; AI soạn sẵn lệnh chỉ đọc. (b) Dựng lịch tự chạy: việc mới, cần thêm thời gian.
3. **Gỡ lời cấm Trả sau khi nào?** (a) *Khuyến nghị:* giữ trong ngày đầu; sửa T-03, viết hướng dẫn Kế toán về cách tính nợ sau «Khách đã trả đủ», rồi gỡ cho một đại lý thử, hạn mức nhỏ. (b) Gỡ ngay cho mọi đại lý.

Ghi chú: Toàn quyền «Xem như vai trò» Đối tác rồi lập đơn là đơn thật (đúng ADR-0180), khi thử nên dùng khách thử. Thời gian: phiên điều phối 21:56 tới khoảng 23:00, bốn trợ lý song song khoảng 1,5 giờ máy; tổng khoảng 2,5 giờ máy, dưới ngân sách 3–5 giờ.
