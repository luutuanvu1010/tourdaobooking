# Báo cáo kết quả: chữ nhẹ hơn (phương án 1 «Nhẹ vừa»)

> Ngày 2026-11-21. Đặc tả: `2026-11-21-chu-nhe-hon.md` (cùng thư mục). Soạn theo `MAU-BAO-CAO-KET-QUA.md`. Chủ trả lời «phát hành» hoặc «sửa: …».

## 1. Kết quả
Mặc định của Nền tảng nay nhẹ hơn: nút kiểu cũ, tên khách và tiêu đề cột đậm 500 (trước 600), tiêu đề giữ 600, số lớn ở Trang chủ 600 (trước 700). Ở màn Giao diện công ty, ô «Độ đậm tiêu đề» chỉ còn đổi tiêu đề; ô «Độ đậm chữ nhấn (nút, tên, số tiền)» đổi nút, tên và số tiền. Với bộ chủ đang lưu trên bản chạy thật (hai ô độ đậm đều 400), triển khai xong màn hình gần như không đổi: chỉ số lớn ở Trang chủ từ 500 lên 600 và nét chữ trên máy Mac mảnh hơn.

## 2. Xem tận mắt
Tám tờ ảnh bốn cột (Trang chủ, Đơn hàng, Tạo đơn, Chi tiết đơn, mỗi màn ở khổ 390 và 1280), gửi chủ trong phiên; ảnh không vào kho. Bốn cột: bản đang chạy hôm nay; sau triển khai chưa bấm gì; giữ phông của chủ và đưa hai ô độ đậm về mặc định; phương án 1.

## 3. Máy đã kiểm
| Ví dụ «xong khi» | Cách kiểm | Kết quả |
|---|---|---|
| Mặc định: nút, tên, tiêu đề cột 500; tiêu đề 600; số lớn Trang chủ 600; ô gõ 16px | Đo độ đậm thật trên trang ở bản thử, bốn màn hai khổ, trước và sau; bài `src/token-giao-dien.test.ts` | đạt |
| Hai ô độ đậm độc lập | Đổi từng ô trên màn Giao diện công ty ở bản thử rồi đo tiêu đề và nút. Trước khi sửa, nút chạy theo ô tiêu đề (400, rồi 700). Sau khi sửa, nút đứng yên ở 500 khi đổi ô tiêu đề, và đổi theo ô chữ nhấn. Bài `src/shared/giao-dien.test.ts` | đạt |
| Bộ chủ đang lưu không đổi hình | Đặt đúng bảy núm vào bản thử (tệp `/giao-dien.css` của bản thử trùng từng ký tự với bản chạy thật), đo trước và sau: mọi mức 400 giữ nguyên; số lớn Trang chủ 500 lên 600. Bài canh «bộ đang lưu lúc tách núm» đã thấy đỏ thật với cách sửa chỉ gỡ dây kéo | đạt |
| Màn Giao diện công ty vẫn chạy đúng | Kịch bản Chrome `giao-dien-smoke.mjs` (11 bước, khổ 1040 và 390) trên bản thử | đạt |
| Bốn màn mẫu của khung gốc không vỡ bố cục vì đổi chữ | Lệnh đo khung gốc `node scripts/giao-dien/do-khung-ci.mjs` trên nhánh này: bốn màn, mỗi màn 79 bề rộng, 316 ô, 0 ô không đạt | đạt |
| `npm test`, `npm run typecheck` | Chạy đủ một lần sau khi sửa xong: 10.127 bài, 0 đỏ (4 bài đánh dấu làm sau, có từ trước); bài đo giờ đạt; kiểm kiểu 0 lỗi | đạt |

Trợ lý đánh giá giao diện (độc lập với người thi công) chấm bốn màn: việc hạ độ đậm không gây phát hiện mới; thứ bậc, con số chính và tương phản giữ đạt; 16 cặp ảnh trước và sau không xô lệch bố cục. Mục nặng duy nhất nó nêu có từ trước: «Tổng cộng» và «Còn lại» cùng tô đỏ ở Chi tiết đơn. Với bộ chủ đang đặt (mọi chữ đậm 400) nó ghi nhận thứ bậc và con số chính yếu hơn mặc định.

Việc nhỏ nên không có người kiểm độc lập soát mã.

## 4. Chưa kiểm
- iPhone thật và máy Windows thật. Việc làm mịn nét chỉ có tác dụng trên máy Mac; điều này theo tài liệu trình duyệt, chưa thử máy thật.
- Tương phản khi mọi chữ đậm 400 (bộ chủ đang đặt) chưa đo bằng máy.
- Kiểm thử đầu-cuối chưa chạy ở máy; lệnh nhập chạy đủ bộ trên GitHub trước khi đẩy.
- Nếu trước khi triển khai chủ đổi hai ô độ đậm cho KHÁC nhau thì hình sau triển khai sẽ đổi: nút, tên đi theo ô «chữ nhấn», không theo ô «tiêu đề» như bây giờ.
- Bộ thiết kế v2 trên Claude chưa xuất bản lại; bản chụp trong kho đã sửa theo mã.
- Ảnh mốc của khung gốc (ADR-0222) chưa chụp lại. Độ đậm và độ mịn nét đổi làm lệch phép so ảnh với ảnh chủ đã duyệt (công cụ `docs/evidence/2026-11-21-khung-goc-thi-cong/kich-ban/so-anh.py`); ai làm tiếp khung gốc phải chụp lại ảnh mốc rồi mới so. Các phiên khung gốc đã được lưu trữ ngày 21/11 nên chưa ai nhận việc này.

## 5. Phát hành
- Cần triển khai lên bản chạy thật (đổi tệp kiểu và mã). Không có migration. Nhật ký thay đổi: mục số tạm 3.23.
- Lệnh chủ chạy trong ứng dụng Terminal, lần lượt: `cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales && npm run day-len -- claude/sweet-grothendieck-122c41`, xong thì `cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales && npm run trien-khai`.
- Sau khi triển khai, nếu muốn đổi hình thì bấm ở màn Giao diện công ty theo một trong ba lối ở mục 5 của đặc tả.
