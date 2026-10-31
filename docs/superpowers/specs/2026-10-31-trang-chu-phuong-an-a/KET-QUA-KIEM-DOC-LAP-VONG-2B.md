# Kết quả kiểm độc lập vòng 2B — Trang chủ phương án A (nhánh `trang-chu-a-vong-2`, hai commit 1f6def01 và 3ba0e14e)

Người kiểm độc lập, chỉ đọc mã sản phẩm. Ngày 31/10/2026. Kịch bản đo: `kiem-doc-lap-2b/do-doc-lap-2b.mjs` (Chrome thật, D1 tạm, không đọc .env). Số đo thô: `kiem-doc-lap-2b/so-lieu-*.json`. Ảnh: `kiem-doc-lap-anh-2b/`.

## Kết luận

**ĐẠT CÓ ĐIỀU KIỆN.** S1 đã sửa đúng và test bắt được lỗi; responsive của Trang chủ không vỡ ở 13 khổ và ở khe 600–1300px. Còn một lỗi cũ (có cả ở main) mà chủ dự án đã bắt buộc responsive nên nên sửa trước khi đưa lên: ở tablet và điện thoại nằm ngang (768, 820, 844) thanh tab dưới che 43px cuối trang, dòng cuối của khối «Đang chờ bạn» không kéo ra khỏi thanh tab được.

## 1. Lệnh và kết quả
- `npm test`: 6914 test, 6910 qua, 0 đỏ (4 không tính vào pass/fail). Thoát 0.
- `npm run typecheck`: 0 lỗi.
- Gói `public/js/orders.js` = 102.459 byte, không vượt 102.554.
- `node scripts/kiem-phien-ban.mjs`: ĐẠT (máy 2.53 mới hơn production 2.52).

## 2. Đọc diff mã (1f6def01 + 3ba0e14e)
Đạt từng điểm:
- Ca Kế toán có 40 khoản quá hạn nằm CUỐI danh sách API: Chrome thật cho thấy dòng «Chờ đối chiếu» ghi «40 khoản quá 3 ngày — cần đối chiếu» và cả ba dòng đầu danh sách đều có viên «quá 3 ngày», ở mọi khổ máy tính/tablet.
- Phụ đề thu trước giữ nguyên các tín hiệu (hàm `phuThuTruoc`, test có ca quá 7 ngày / sắp hết hạn / còn người chưa nộp). Trong Chrome chỉ kiểm được «7 đơn còn người chưa nộp tiền» (dữ liệu giả của tôi không có hai tín hiệu kia); hai tín hiệu kia dựa vào test đơn vị.
- Vai không có khối chi tiết (Nhân viên lập đơn, Quản trị thuần): 0 dòng đối chiếu/thu trước, không bị ẩn gì; dash-trung chỉ gắn khi người xem có khối (cùng cổng).
- Điện thoại (360/390/430): vẫn hiện dòng «Cần xem lại» (Kế toán 2 dòng, Chủ 3 dòng), không đổi hành vi.
- Nhãn «quá N ngày» và «quá N ngày — cần đối chiếu» lấy từ hằng số `NGAY_NHAC_DOI_CHIEU_HIEN_THI` / `NGAY_NHAC_DUYET_HIEN_THI`, không còn chữ cứng.
- Sắp xếp quá hạn lên đầu: `Array.prototype.sort` ổn định (ES2019), sắp trên bản sao, không đổi tổng số (54 giữ nguyên), không đụng quyền (cổng `coKhoi…` và `ledger.view` giữ nguyên).
- Không nới test cũ (diff chỉ thêm test).

Thử phá mã (bản sao trong worktree kiểm, đã hoàn nguyên): đảo điều kiện phuDoiChieu, bỏ sắp xếp đối chiếu, nhãn chữ cứng, dòng đối chiếu không dùng `phuDoiChieu`, container query vô hiệu, dash-trung luôn gắn, bỏ sắp xếp thu trước: **cả bảy đều làm test đỏ**. Hai ca **test KHÔNG bắt**: (M4) `web/home.ts` quên truyền `doiChieuQuaHan/thuTruocChiTiet` vào `nguon`; (M5) `quaHanGanNhat` luôn null. Tức là đoạn nối giữa `home.ts` và hàm thuần chỉ được chứng minh bằng Chrome, không bằng test (mức thấp, nên thêm một test khoá dòng nối, vì chính lỗi này là S1 từng lọt).

## 3. Chrome thật, Trang chủ
Khổ: 360x740, 390x844 (chỉ vai nặng), 430x932, 844x390, 768x1024, 820x1180, 1024x768, 1180x820, 1280x720, 1366x768, 1536x864, 1920x1080, 2560x1440. Ca: ít dữ liệu (Chủ, Kế toán); nặng 54 đối chiếu/40 quá hạn ở cuối/7 thu trước/0 đơn đi/1 góp ý (Chủ, Quản trị, Kế toán, Nhân viên); 10 đơn đi tên dài (Chủ, Nhân viên); dải việc gấp (Chủ, Quản trị). Tổng 130 lượt.
- Chữ định danh bị cắt: 0. Tràn ngang: 0. Chồng lấn khối: 0. Khối rỗng: 0.
- Lối tắt luôn nằm trên cùng (ngay dưới lời chào) ở màn tablet trở lên; số ô: Chủ 8, Kế toán 7, Nhân viên 5.
- Thanh tab dưới: **LỖI (có sẵn trên main, đo cùng 43px)**. Ở 768x1024, 820x1180, 844x390 (bố cục có thanh tab và một cột), cuộn hết trang mà đáy khối «Đang chờ bạn» vẫn nằm 43px dưới mép trên thanh tab, dòng «Thu trước đơn huỷ» bị che (ảnh `cuoi-keToan-768x1024.jpg`, `cuoi-keToan-844x390.jpg`). Ở điện thoại 360/430 chừa thừa 13px, ổn. Đây là lỗi khoảng đệm đáy khi bố cục máy tính gặp thanh tab; không phải do hai commit này nhưng nằm đúng yêu cầu «thanh tab không che nội dung cuối».
- Vùng bấm nhỏ hơn 40px: có 6 phần tử mỗi lượt ở mọi khổ (nút liên kết chữ như «Xem tất cả», «Bên kia đã nhận»); chưa phân loại chi tiết từng cái, ghi là điều cần xem lại cho cảm ứng (xem số liệu thô, trường `bamNho`).
- Dò «che» còn 53 cảnh báo: sidebar bị cắt ở khung cao ≤768 (có sẵn trên main, cùng số trên trang khác), và vài dòng chờ chui dưới thanh trên cố định khi cuộn (không phải lỗi).
- Axe: không có sẵn, không chạy.

## Quét khe 600–1300px, bước 20px (36 khổ)
Không khổ nào tràn, chồng lấn, cắt chữ hay khối rỗng. Lối tắt: dưới 660 là ẩn (bố cục điện thoại), 660–720 hai hàng 4+4, 740–880 một hàng 8, 900–1000 hai hàng 4+4, từ 1020 một hàng 8. Không có hàng lẻ «5+3». Hai cột bắt đầu ở 1100. Hai khối chi tiết luôn xếp dọc (không cạnh nhau) ở mọi khổ.

## Nhận định bằng mắt (ảnh)
Đã xem 360, 768, 1024(số đo), 1180, 1366, 1920, 2560 và ca 10 đơn dài. Lối tắt ở trên cùng, hai khối đối chiếu gọn ba dòng, không rối. Ba điều thẩm mỹ để chủ cân nhắc: (a) ở 2560x1440 còn khoảng trống phải ~400px (do trần 1920 đã chốt) và trống dưới nội dung; thẻ «Doanh thu của tôi» bị kéo dài với phần trắng lớn bên dưới; (b) ở tablet dọc 768/820 thẻ «Đang chờ bạn» (nơi có tín hiệu quá hạn) nằm tận cuối, sau hai khối chi tiết, phải cuộn hơn một màn mới thấy; (c) ở 768 «Cần xem lại» của Quản trị vẫn hiện (vì chưa phải ca trùng).

## 4. Trang khác (so với main b1955c75)
10 trang (Đơn hàng, Chi tiết đơn, Công nợ, Hoa hồng, Tôi, Điều phối, Nhật ký, Thiết lập, Lập đơn, Danh bạ) × 768, 1024, 1366, 1920: tràn ngang 0, số «cắt/che/tràn» **bằng main từng ô**, không xấu hơn. Khác biệt duy nhất đúng ý: ở 1920 nội dung rộng 1672 thay vì 1280 (trần 1920); trang Lập đơn giữ trần riêng 1120. Chưa kiểm được: các trang còn lại (30 trang) của khung chung ở khổ nhỏ; chỉ kiểm 10 trang.

## Việc phải sửa trước khi đưa lên
1. Chừa đáy thanh tab dưới ở khổ tablet/ngang bố cục máy tính (768, 820, 844): hiện che 43px (lỗi cũ, cần sửa vì chủ bắt buộc responsive).
2. (Nên) thêm test khoá dây nối `home.ts` → `nguon` (M4/M5 hiện lọt).
3. (Nên) rà các nút/liên kết chữ dưới 40px trên cảm ứng.

## Chưa kiểm được
iPhone/iPad thật (chỉ giả lập khung nhìn Chrome, không có safe-area thật hay font iOS); axe; hai tín hiệu thu trước «quá 7 ngày/sắp hết hạn» trong Chrome (chỉ qua test đơn vị); trang ngoài 10 trang đã nêu.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
