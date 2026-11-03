# Kết quả kiểm độc lập — Trang chủ vòng 2 (bản 2.53)

Ngày 31/10/2026. Người kiểm: phiên độc lập, chỉ đọc mã sản phẩm. Đối tượng: nhánh `trang-chu-a-vong-2` (mã 4472d755, bằng chứng 3467d155), từ main b1955c75 (2.52). Nhánh kiểm: `kiem-doc-lap-trang-chu-vong-2`. Tự đo, không dùng số của người thi công. Kịch bản tự viết: `kiem-doc-lap-vong-2/do-doc-lap.mjs`, `do-tuong-tac.mjs`; số đo thô cùng thư mục; ảnh ở `kiem-doc-lap-anh/`. Chrome thật (Google Chrome macOS, headless, D1 tạm, không đọc .env). Không chạy axe.

## Kết luận chung: ĐẠT CÓ ĐIỀU KIỆN

Vòng 2 sửa đúng các lỗi chủ chụp: Lối tắt lên trên cùng, hai khối 54 và 7 khoản gọn còn 3 dòng, khoảng trống bên phải hết ở 1920. Không thấy lỗi quyền, tiền, chữ bị cắt hay tràn ngang mới. Có MỘT lỗi mất thông tin cần sửa trước khi đưa lên (S1 dưới đây) và vài điều nên làm.

## Kết luận từng mục

1. Kiểm máy: ĐẠT. `npm test`: 6902 đạt, 0 lỗi, bước 2 (hook giờ) đạt. `npm run typecheck` thoát 0. Gói `public/js/orders.js` 102.459 byte, bằng hệt main (trần 102.554). `node scripts/kiem-phien-ban.mjs`: ĐẠT, 2.53 mới hơn production 2.52. `build:web` không làm bẩn tệp nào đang theo dõi.

2. Đọc diff mã: ĐẠT CÓ ĐIỀU KIỆN.
   - Quyền: không đổi. Hai khối vẫn bị cổng bởi `coKhoiChoDoiChieu` / `coKhoiThuTruoc`. Nút «Bên kia đã nhận» giữ nguyên mã xử lý; tôi bấm thật ở dòng thứ 30 trong khung cuộn: hộp xác nhận hiện đúng chữ, sau xác nhận gửi đúng `POST /api/ledger/counterparty-receipts/rc-29/confirm` thân `{}`, danh sách vẫn mở 54 dòng. Không đụng cách tính tiền; số tiền vẫn hiện. CSS dùng token mới (`--w-ct-*`, `--h-ct-mo`), có bài khoá "không px cứng".
   - Test không bị nới: chỉ đổi 3 chỗ có chủ đích (kỳ vọng phiên bản 2.52→2.53, kỳ vọng `--w-noi-dung-max` 1280→1920, sơ đồ trang). `ds-v2/tokens.json` đổi cùng giá trị 1920px, đúng quy ước "tấm gương của mã". Có thêm 6 bài mới (`trang-chu-vong-2.test.ts`), chỉ đọc tệp nguồn.
   - **S1 (phải sửa) — mất thông tin ở «Cần xem lại».** Dòng bị ẩn không phải bản lặp thật. Dòng «Cần xem lại» về đối chiếu hiện số khoản **quá 3 ngày** (`doiChieuQuaHan`, chữ «N khoản đang đối chiếu quá 3 ngày»), còn dòng «Chờ đối chiếu» ở «Đang chờ bạn» hiện **tổng** (54), không nói quá hạn, tông màu xanh cố định. Tương tự dòng thu trước có phụ đề «đã duyệt quá 7 ngày», «sắp hết hạn», «còn người chưa nộp» bị thay bằng một số tổng. Với kế toán: ở máy tính «Cần xem lại» biến mất hẳn, tín hiệu "40 khoản quá hạn" chỉ còn thấy nếu mở danh sách và dòng quá hạn nằm trong ba dòng đầu (tôi thử ca khoản quá hạn nằm cuối danh sách: ba dòng đầu không có viên «quá 3 ngày», trang không còn chỗ nào báo có khoản quá hạn). Điện thoại vẫn đủ (xemLai=2 với kế toán). Cách sửa gọn: đưa số quá hạn vào dòng phụ của «Đang chờ bạn» (hoặc đặt khoản quá hạn lên đầu danh sách), rồi mới ẩn dòng «Cần xem lại».
   - Cổng ẩn dòng lặp đúng điều kiện (`dash-trung` chỉ gắn khi người xem có khối chi tiết). Vai không có khối vẫn thấy dòng của mình: nhân viên lập đơn và quản trị không có khối thì không bị ẩn gì (đo: không dòng nào bị ẩn sai).

3. Chrome thật: ĐẠT. Chữ bị cắt 0, tràn ngang 0, chữ bị che 0 ở mọi ca (trừ vài hiện tượng có sẵn, xem dưới). Số đo (Chủ · Toàn quyền, 54/7/1 góp ý, 0 đơn đi):
   - Lối tắt luôn ở đỉnh 255px ở 4 khổ máy tính (main: 1934px, tức cuối trang). Trang cao 1256px ở 1440 (main 2128px). Hai cột chênh nhau 0 (không còn khoảng trống dưới cột trái). Trống bên phải 24px ở mọi khổ (main ở 1920: 416px).
   - «Xem tất cả (54)» mở ra 54 dòng trong khung cuộn 320px, khối cao 382px, nút đổi «Thu gọn», `aria-expanded=true`; «Xem tất cả (7)» tương tự; mở lại sau làm mới vẫn giữ.
   - 10 đơn đi tên/địa chỉ rất dài: đạt, không cắt; nhưng hai khối đối chiếu bị đẩy xuống y=2014 (dưới danh sách đơn đi 1470px), chỉ còn đường cuộn từ «Đang chờ bạn».
   - Dải việc gấp bật: đạt, Lối tắt vẫn trên cùng.
   - Ít dữ liệu (0 đối chiếu, 0 thu trước): đạt, không khối rỗng (0 khối rỗng), Trang chủ chỉ còn lời chào, Lối tắt, «Đơn đi» một dòng, Doanh thu (cao 900 = vừa màn).
   - Bốn vai (Chủ, Quản trị, Kế toán, Nhân viên lập đơn) × 5 khổ (1366×650, 1440×900, 1920×1080, 1100×800, 390): 0 cắt, 0 tràn. Kế toán chỉ thấy hai dòng đối chiếu/thu trước; Quản trị và Nhân viên không thấy hai khối (đúng cổng).
   - Điện thoại 390: hai khối 3 dòng, không tràn; trang cao 2004px (main 2959px).
   - Điểm yếu nhỏ: ở 1440 khối rộng khoảng 720px (<54rem) nên mỗi dòng đối chiếu cao 2–3 hàng chữ, chưa thẳng cột; chỉ từ 1920 mới một dòng thẳng cột. Chấp nhận được.

4. Khung chung (30 trang × 1536/1920/2560, trước/sau): ĐẠT CÓ ĐIỀU KIỆN. 90 lượt: không tràn ngang, không thêm chữ cắt/che nào (tổng cắt 84, che 69 trước = sau; đều có sẵn). Bề rộng nội dung 1280 → 1288 (1536) / 1672 (1920) / 1920 (2560); hết dải trống ở 1920. Ngoại lệ không đổi: Lập đơn (1120), Giao diện (1280, đúng ý), Thiết lập (tự giới hạn 900, vẫn trống phải 756px ở 1920), Công nợ (tự không giới hạn, 2312 ở 2560). Xem ảnh ở 2560 (Đơn hàng, Chi tiết đơn, Hoa hồng, Gửi thông báo, Thiết lập, Danh bạ): trang không vỡ, nhưng xấu đi nhẹ khi giãn: bảng Đơn hàng giãn cột xa nhau, một đơn nằm lọt thỏm; Chi tiết đơn thẻ trái rất rộng, nhãn–giá trị cách xa; Hoa hồng có đoạn cảnh báo dài ~190 ký tự một dòng. Không trang nào hỏng; đây là chi phí của việc nâng trần, chủ cần biết.

5. Nhận định về 5 điểm xin xác nhận:
   - Nâng trần 1920 toàn ứng dụng: chấp nhận được, đúng mục tiêu (hết dải trống ở 1920, 2560 còn trống 408px). Rủi ro duy nhất: dòng chữ dài và bảng thưa ở 2560 như trên; nếu chủ ngại thì trần 1600 là nước đi giữa (chưa đo). Ghi rõ trong nhật ký thay đổi đã có.
   - «Xem tất cả» mở tại chỗ: tốt hơn trang riêng cho 54 khoản, nút từng dòng dùng được, trạng thái nhớ qua làm mới. Nên giữ.
   - Ẩn dòng lặp chỉ máy tính: ĐỒNG Ý về nguyên tắc nhưng chỉ sau khi sửa S1, vì dòng bị ẩn mang thêm tín hiệu quá hạn.
   - Nhãn «quá 3 ngày» cố định: khớp `NGAY_NHAC_DOI_CHIEU_HIEN_THI`; chưa thấy chỗ lệch; chấp nhận, nhưng nếu hằng số đổi thì nhãn phải đổi theo (nên lấy từ hằng số, chưa kiểm mã dựng nhãn).
   - Hai hàng chữ ở 1440 ca ít dữ liệu: không còn thấy ở ca ít dữ liệu (một dòng «Không có đơn nào đi hôm nay»); hai hàng chữ chỉ ở dòng đối chiếu khi khối hẹp (mục 3). Chấp nhận.

## Việc phải sửa trước khi đưa lên

1. S1: giữ tín hiệu «quá 3 ngày» (và phụ đề thu trước) trên máy tính khi ẩn dòng «Cần xem lại». Thêm bài kiểm cho ca kế toán có khoản quá hạn ở cuối danh sách.
2. Nên (không chặn): đặt khoản quá hạn lên đầu danh sách đối chiếu; chủ quyết có giữ 1920 hay hạ trần.

## Phạm vi chưa kiểm

Không chạy axe. Bấm «Bên kia đã nhận» chỉ thử với phản hồi giả của trình duyệt (không có sổ cái thật trong kho đo), nên chưa chứng minh phía máy chủ; mã máy chủ không đổi trong diff. Ảnh chụp chỉ Chủ ở các ca; vai khác kiểm bằng số đo. Chưa kiểm thật trên iPhone.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
