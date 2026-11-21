# Đặc tả ngắn — làm chữ trên Nền tảng nhẹ hơn (phương án 1 «Nhẹ vừa»)

> Ngày 21/11/2026. Trạng thái: **chủ chưa nói chọn phương án nào.** Làm theo thẻ việc của phiên điều phối: áp phương án khuyến nghị, chủ bác được; chủ duyệt bằng cách xem ảnh rồi tự chạy lệnh nhập. Nguồn: sáu tờ ảnh so sánh ba cột (hiện tại, «Nhẹ vừa», «Nhẹ rõ») gửi chủ sáng 21/11, để ngoài kho. Luật khung gốc (ADR-0222 Đ1) để ngỏ phần chữ cho đúng việc này. Bản này **thay hàng «Độ đậm»** ở mục 4 của đặc tả đợt 0 (`2026-10-28-dot-0-khung-chung/DAC-TA.md`); bản cũ là hồ sơ có ngày, giữ nguyên không sửa.

## 1. Việc gì, cho ai, vì sao
Chủ dự án thấy chữ trên Nền tảng nặng, khó đọc. Đo sáng 21/11 cho thấy nút, tên và tiêu đề cột đậm ngang tiêu đề (cùng 600), nên trang không còn thứ bậc. Việc này hạ nút, tên, tiêu đề cột xuống 500, giữ tiêu đề 600, và tách hai núm độ đậm ở màn Giao diện công ty để chủ chỉnh riêng tiêu đề và nút mà không cần sửa mã.

**Hiện trạng đã đổi sau lúc đo.** Kiểm lại 21/11 lúc 14:15 bằng cách đọc tệp công khai `/giao-dien.css` của bản chạy thật: chủ đã tự chỉnh thêm ở màn Giao diện công ty. Nay đang lưu bảy núm: chữ chính đen tuyền, cỡ tiêu đề trang 20, cỡ tiêu đề mục 16, phông tiêu đề Lexend, phông nội dung Nunito, «Độ đậm tiêu đề» 400 (núm này đang kéo cả nút và số lớn về 400), «Độ đậm chữ nhấn» 400. Cỡ nội dung 17 và cỡ nhãn 16 đo lúc sáng đã được chủ bỏ. Vì vậy việc này phải không làm xô lệch những gì chủ đang đặt.

## 2. Xong khi (ví dụ nhìn thấy được)
- **Mặc định (chưa chỉnh núm nào), trên bản thử:** nút kiểu cũ (ví dụ «Áp dụng cho mọi người»), tên khách trên thẻ đơn và tiêu đề cột của bảng kiểu cũ đậm 500 (trước 600); tiêu đề trang, tiêu đề mục vẫn 600; số lớn ở thẻ số liệu Trang chủ đậm 600 (trước 700); ô gõ vẫn 16px.
- **Hai núm độc lập:** Toàn quyền mở Giao diện công ty, đổi «Độ đậm tiêu đề» sang 400 thì tiêu đề nhạt đi, nút «Lưu» ở khung xem trước không đổi. Đổi «Độ đậm chữ nhấn (nút, tên, số tiền)» sang 600 thì nút, tên, số tiền đậm lên, tiêu đề không đổi.
- **Với đúng bộ chủ đang lưu trên bản chạy thật (bảy núm ở mục 1):** sau khi triển khai, tiêu đề, nút, tên, số tiền vẫn đậm 400 như chủ đang thấy. Chỉ hai thứ đổi: số lớn ở Trang chủ từ 500 lên 600, và nét chữ trên máy Mac mảnh hơn một chút.
- `npm test` và `npm run typecheck` xanh; có ảnh trước và sau ở khổ 390 và 1280 cho Trang chủ, Tạo đơn, Chi tiết đơn, Đơn hàng.

## 3. Không làm lần này
Không đổi phông mặc định Be Vietnam Pro, không tách tệp phông. Không đổi cỡ chữ mặc định. Không ghi gì lên bản chạy thật: màu chữ, cỡ chữ, phông là núm của chủ, chủ tự bấm (báo cáo kèm từng bước). Không chạm phần khung gốc trong tệp kiểu. Không xuất bản lại bộ thiết kế v2 trên Claude (việc sau).

## 4. Loại việc
- [x] Việc nhỏ: giá trị kiểu chữ và cách nối núm; không chạm dữ liệu, quyền, tiền. Trợ lý đánh giá giao diện chấm ảnh trước khi gửi chủ.
- Không cần ADR: đổi lại được bằng một lần sửa.

## 5. Câu hỏi cho chủ
Không có câu nào chặn việc. Một điều chủ quyết khi xem ảnh, sau khi triển khai: (a) giữ nguyên bộ chủ đang tự đặt (Nunito, Lexend, mọi chữ đậm 400); (b) giữ phông của chủ, chỉ đưa hai ô độ đậm về mặc định (tiêu đề 600, nút và tên 500); (c) bấm về đúng phương án 1. Cả ba lối đều có ảnh. Lối (b) chỉ làm được sau khi hai núm đã tách.

## 6. Điều AI tự quyết (chủ bác được)
- Làm phương án 1 vì là phương án khuyến nghị. Chủ nhắn «phương án 2» thì đổi: tiêu đề và số lớn xuống 500, cỡ tiêu đề trang 24, cỡ tiêu đề mục 20.
- Mức đậm của nút, tên, số tiền giao cho núm «Độ đậm chữ nhấn (nút, tên, số tiền)», đúng như đặc tả gốc của màn này ngày 2/10 (`2026-10-02-giao-dien-cong-ty-design.md`); núm «Độ đậm tiêu đề» chỉ còn đổi tiêu đề. Không bỏ hẳn núm của nút vì hai lý do: chủ vẫn chỉnh được nút mà không cần sửa mã, và bộ chủ đang lưu (hai núm đều 400) cho ra đúng hình như hiện tại.
- Số lớn Trang chủ ghi thẳng 600, không tính từ mức khác.
- Thêm `-webkit-font-smoothing: antialiased` cho toàn trang: nét chữ mảnh hơn trên máy Mac; iPhone và Windows không đổi.
- Sửa có chủ đích hai chỗ đang khoá giá trị cũ: bài `src/token-dot-0.test.ts` và bản chụp bộ thiết kế v2 (`2026-10-27-danh-gia-ux-tong-the/ds-v2/`).
