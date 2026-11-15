# Phụ lục 05 — Sổ «đã biết, đã quyết»: việc cũ nay ra sao

> Người lập: phiên điều phối, gom từ ba trợ lý (phụ lục 01–04) và tự đối chiếu thêm bằng `git grep`, đọc mã, GET công khai. Mỗi dòng chỉ nói trạng thái hôm nay (7/11/2026, mã `5f641781` = mã đang chạy trên bản thật). Các mục ở đây không tính là phát hiện mới.
> Trạng thái: **CÒN** · **ĐÃ SỬA** · **ĐÃ XỬ LÝ** (bằng cách khác với đề xuất cũ) · **KHÔNG KIỂM** (đợt này không đủ điều kiện hoặc không đủ giờ).

## Đợt rà soát trước launch 17/10 (`docs/superpowers/specs/2026-10-17-ket-qua-ra-soat-truoc-launch.md`)

| Mã | Việc cũ (rút gọn) | Hôm nay | Bằng chứng |
|---|---|---|---|
| ĐK1 | Chế độ bảo trì tự tắt 19/10 | ĐÃ XỬ LÝ — đang tắt | GET công khai `/api/auth/config` 21:57 và khoảng 22:12: `maintenance.on` false |
| ĐK2 | Câu thông báo giao đơn nói «cho người khác phụ trách» với chính người được giao | ĐÃ SỬA | `git grep "người khác phụ trách" src/shared/thong-bao.ts`: không còn; theo sổ lên 2.17 |
| ĐK3, G-1 | Sổ trạng thái triển khai cũ, thiếu điểm khôi phục và cách lùi | ĐÃ XỬ LÝ | mục trạng thái hiện hành của `docs/HANDOFF-N1.md` có commit, Worker, điểm khôi phục Time Travel, điểm quay lại Worker |
| ĐK4 | Dọn hay giữ dữ liệu thử trên bản thật | ĐÃ XỬ LÝ — đã dọn 2/11 (ADR-0158) | theo sổ và `scripts/don-du-lieu-thu/`; dữ liệu thật không kiểm được |
| ĐK5 | Gửi thử Góp ý trên bản thật, xác nhận thư về; ghi người trực | KHÔNG KIỂM | cần đăng nhập bản thật (cấm); xem câu hỏi chủ về người đọc Góp ý và nhật ký |
| ĐK6 | Chọn mức mở | ĐÃ XỬ LÝ — chủ chọn nhân viên trước, Đối tác theo đợt | đề bài đợt này |
| G-2 | Ân hạn hai lớp hết cùng một ngày; dải nhắc bị ô tìm kiếm đè | ĐÃ XỬ LÝ một phần | ân hạn chung đã hết (migration `0101` áp trước 18/10); nay mỗi tài khoản một hạn, nhãn trạng thái ở Quản lý tài khoản (`web/staff.ts`, `nhanHaiLop`); dải nhắc hiện rõ trên máy thử (phụ lục 03). Đưa vào danh sách dữ liệu trước ngày dùng thật |
| T-1 | Hết phiên hoặc mất mạng lúc ghi thì số vừa gõ mất | CÒN | phụ lục 03, G-03 (form lập đơn); mất mạng ở danh sách đơn đã có dải báo và «Thử lại» |
| T-2 | Màn trống cho người mới | CÒN một phần | phụ lục 03, G-06 (e) Đối tác lần đầu thấy «Chưa có đơn nào khớp.», (h) bài Hướng dẫn Đối tác nói sai menu |
| T-3 | Đơn dưới mốc 6 giờ: Bán hàng không có đường đi tiếp | ĐÃ XỬ LÝ | Bán hàng tự «Đặt gấp» kèm lý do (ADR-0107, bản 2.31); ảnh `2-sales-dat-gap-hop-390.png`; còn chữ «Duyệt đặt gấp» gây hiểu là chờ người khác (G-06 c) |
| T-4 | Tài xế bấm «Khách đã huỷ» một chạm là ghi | ĐÃ XỬ LÝ | không hỏi lại từng khách nhưng hiện dòng «Vừa ghi … Sai? Báo văn phòng»; cả điểm thì có hộp hỏi (`src/shared/bang-tham-chieu-viec.ts`, cột `hoiLai`) |
| T-5 | Chữ «Đảo», «Ghi lần thu», «app» | ĐÃ SỬA | ADR-0166; «Ghi lần thu» chỉ còn trong `src/shared/changelog.ts` (lịch sử); máy canh chữ của trợ lý giao diện chỉ thấy «App» ở dòng lịch sử bản 1.5 |
| T-6 | Số điện thoại gõ vào tiêu đề Góp ý nằm vĩnh viễn trong nhật ký | CÒN | `src/modules/feedback/index.ts`, lệnh ghi `feedback_created` lấy 100 ký tự đầu của tiêu đề (trừ nhóm nhạy cảm); không thấy bộ chặn dãy số. Gần phát hiện V-02 (phụ lục 04) |
| T-7 | Tên khách bị cắt ở danh sách điện thoại; nút Trợ lý che nút | KHÔNG KIỂM | |
| T-8 | Ba kịch bản Chrome cũ đỏ | KHÔNG KIỂM | |
| T-9 | Không cảnh báo chủ động khi hỏng ban đêm; không lịch chạy kiểm bất biến hằng ngày | CÒN | phụ lục 04 mục 6: `.github/workflows/` chỉ có `kiem.yml`, Cron của Worker không chạy kiểm bất biến |
| T-10 | Lớp chống ghi trùng đọc cả thân lớn trước khi chặn | KHÔNG KIỂM | |
| T-11 | 18/90 ca sổ vàng tiền chờ Kế toán xác nhận | KHÔNG KIỂM | |
| T-12 | Trợ giúp thiếu hướng dẫn cho vài màn | KHÔNG KIỂM chi tiết | đã có mục Hướng dẫn riêng (bản 2.58); trợ lý giao diện thấy bài Đối tác lệch menu (G-06 h) |
| E-05 | Trang chủ quét cả bảng đơn | CÒN, chưa hại | phụ lục 04: 1–3 ms ở 5.000 đơn |
| E-06 | Đồng bộ Sheet không chặn đổi giá hàng loạt | CÒN, phần hại đã khoanh | phụ lục 04: đơn đã lưu giá ở dòng riêng nên đơn đã xác nhận không đổi giá |
| E-07 | Ảnh mồ côi sau khôi phục D1 | KHÔNG KIỂM | |
| E-08 | Không có thông báo khi triển khai hỏng sau migration | CÒN | phụ lục 04; `0145` chỉ thêm cột nên mã cũ vẫn chạy |

## Kiểm toán trước sử dụng 13/10 (`docs/superpowers/specs/2026-10-13-kiem-toan-truoc-su-dung/`)

| Mã | Việc cũ | Hôm nay | Bằng chứng |
|---|---|---|---|
| D-1 | Đối tác đọc được lý do nội bộ trong lịch sử đơn | ĐÃ SỬA | phụ lục 02 phần 1 mục 5; `src/lich-su-don-doi-tac.test.ts` |
| D-2 | Nhân sự tạo được tài khoản Bán hàng, tài khoản đó xem SĐT khách | CÒN, chờ chủ | phụ lục 02 phần 2, Q-06 (chạy lại trên khung thử) |
| D-3 | Gõ sai PIN 5 lần khoá cả người chủ SĐT 15 phút | CÒN | phụ lục 02 phần 2; bản thật có Turnstile hay không: không kiểm |
| E-1 | Chuyến quên «Kết thúc»: tài xế còn thấy khách nhiều ngày | CÒN | phụ lục 02 phần 2, Q-05 (đồng hồ giả, 9 ngày sau vẫn thấy) |
| E-2 | Tài xế đối tác thấy chuyến công ty | KHÔNG TÁI HIỆN | phụ lục 02 phần 2 |
| B-1 | Mốc giờ, ngày đi lạ | ĐÃ SỬA phần lớn | phụ lục 02 phần 2; còn: đơn nháp lưu được ngày đi vô lý (xác nhận bị chặn) |
| B-2 | Bấm đúp ghi khoản thu khi thiếu mã chống trùng | CÒN một phần, có chủ ý | ADR-0094 giai đoạn 1 cho qua khi thiếu mã (`src/shared/router.ts`); có lớp chặn trùng nghiệp vụ 409 `co_the_trung` (phụ lục 01) |
| C-1 | Mức hoa hồng lớn hơn giá | ĐÃ XỬ LÝ | ADR-0161 Đ4–Đ5 (phụ lục 01) |
| C-2 | Trần điều chỉnh không cộng dồn | KHÔNG KIỂM | |

## Mục khác chủ đã biết

| Mục | Hôm nay | Bằng chứng |
|---|---|---|
| BACKLOG §15 câu 11: Bán hàng đặt giá 0 hay 1 đồng, giảm 100% rồi xác nhận được | CÒN, «chưa có trong kế hoạch» | phụ lục 01 mục 5 (chạy lại, tổng 0 hoặc 2 đồng, xác nhận 200) |
| ADR-0094 giai đoạn 2 (từ chối lệnh ghi thiếu mã chống trùng) | chưa lên lịch | phụ lục 02 phần 1, câu hỏi 3 của trợ lý |
| HC-5.19 diễn tập khôi phục | chưa làm, chủ đã quyết phát hành trước; hạn sổ 31/12 | `docs/quyen-hoan.json` |
| HC-5.11 (HIGH): Cron đồng bộ danh mục không có định danh riêng | CÒN; hạn sổ 15/11 | `docs/quyen-hoan.json`; ngày đỏ ở mục «việc theo lịch» của README |
| TNV-G1 (đơn huỷ còn tiền đã thu), HC-4.2 (duyệt hai người bút toán điều chỉnh) | CÒN; hạn sổ 30/11 | `docs/quyen-hoan.json` |
| Ba cảnh báo kiểm bất biến R-ORD-9, R-CTL-1, R-VC-14 | CÒN (theo sổ: lần kiểm bản thật 22:04 «mọi bất biến đạt, ba cảnh báo») | `docs/HANDOFF-N1.md` mục trạng thái; R-VC-14 là xe thiếu giấy tờ, ADR-0184 chưa có mã nên xe đó vẫn bị chặn xuất bến |
| ADR-0184 cho xe thiếu giấy tờ vẫn xuất bến | đã duyệt 7/11, CHƯA có mã | dòng Trạng thái của ADR (phụ lục 00 mục 5) |
| TRUNG-1, TRUNG-2 (báo cáo kiểm 7/11) | ĐÃ SỬA ở mã | phụ lục 01 mục 5 (trigger `0146`, bài `sau-da-giao.test.ts` xanh) |
| ADR-0180: nhật ký bảng riêng không mang dấu vai khi Toàn quyền đóng vai | việc chủ còn chờ (sổ thi công 7/11) | phụ lục 02 phần 2 mục 4 |
| Hộp xác nhận của trình duyệt (`confirm()`) | CÒN, trong BACKLOG | phụ lục 03, G-07 |
