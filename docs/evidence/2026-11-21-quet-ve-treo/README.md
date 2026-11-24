# Sửa lỗi treo ở màn Quét vé — bằng chứng (21/11/2026)

Hồ sơ có ngày (đóng băng). Việc 9 của kế hoạch 16 việc ngày 21/11. Chủ báo: «sau khi quét vé đã sử dụng thì Nền tảng bị treo, phải tắt mở lại».

## Kịch bản Chrome

`kich-ban/quet-ve-treo-smoke.mjs`: camera giả của Chrome chiếu liên tục mã QR của một vé thật trên D1 tạm. Ảnh nằm ngoài kho.

- Mã cũ (đặt tạm mã nguồn của `b0e992cb8`): bước 2 ĐỎ, trang đứng ở «Camera đang đọc.» suốt 8 giây sau «Quét tiếp».
- Mã mới: 8/8 bước đạt. Đỏ «Đã dùng» sau 3,2 giây. Mất mạng thì «Không gửi được» sau 3,1 giây. Máy chủ im lặng thì 13,1 giây. Ảnh 4032×3024 đọc trong 0,1 giây.
- Bước 8 chỉ ghi nhận, không sửa. Khi phản hồi mất sau lúc máy chủ đã ghi, trang vẫn tự tải lại (ADR-0094), chờ chủ trả lời câu 2 của kế hoạch.

## Ma trận thử trên iPhone thật (chủ dự án làm, sau khi triển khai)

Máy tính không thử được camera thật của iPhone. Hai cách mở đều phải thử: bản cài ở màn hình chính («Tour Đảo Booking») và một tab Safari mở `booking.tourdao.vn/quet-ve`. Chuẩn bị ba thứ: một vé đã dùng, một vé đã huỷ, và một mã QR lạ (ví dụ mã Wi-Fi).

| # | Làm gì | Mạng | Phải thấy |
|---|---|---|---|
| 1 | Quét vé đã dùng, bấm «Quét tiếp», giữ nguyên vé trước camera | Wi-Fi tốt | Dòng nhắc vàng hiện ngay. Trong khoảng 3–4 giây hiện đỏ «Đã dùng lúc … bởi …». Màn không đứng im. |
| 2 | Như dòng 1 nhưng bấm «Quét lại vé này» ngay khi dòng nhắc hiện | Wi-Fi tốt | Đỏ «Đã dùng» hiện ngay, không chờ 3 giây. |
| 3 | Quét vé đã huỷ | Wi-Fi tốt | Đỏ «Vé đã huỷ». Bấm «Quét tiếp» quét tiếp được. |
| 4 | Quét mã QR lạ | Wi-Fi tốt | Đỏ «không dùng được». Không treo. |
| 5 | Bật chế độ máy bay rồi quét một vé | Không mạng | Trong khoảng 15 giây hiện «Không gửi được» kèm «Thử lại» và «Quét tiếp». Tắt máy bay rồi bấm «Thử lại» thì ra kết quả. |
| 6 | Đứng chỗ sóng yếu (thang máy, góc xa) quét 3–4 vé liền | Mạng yếu | Mỗi vé ra kết quả, hoặc ra «Không gửi được» trong khoảng 15 giây. Không lần nào đứng im quá 15 giây. |
| 7 | Bật camera rồi bấm «Chụp ảnh mã vé», chụp vé | Wi-Fi tốt | Camera trong trang tắt trước, máy ảnh mở được. Chụp xong ra kết quả trong vài giây, hình không đứng. |
| 8 | Đang quét thì có cuộc gọi tới, hoặc kéo Trung tâm điều khiển xuống | Wi-Fi tốt | Trang báo camera tạm dừng hoặc đã dừng. Bấm «Bật camera» là quét lại được. |

Trường hợp còn biết trước (chưa sửa, chờ câu 2): mạng chập chờn đúng lúc máy chủ đã ghi mà phản hồi mất, thì trang báo «Lần bấm trước đã được ghi» rồi tự tải lại. Khi đó camera tắt, phải bấm «Bật camera» lại. Vé vẫn không bị tính hai lần.

## Bổ sung 2026-11-23 — phần (d), không sửa các đoạn trên

Chủ trả lời câu 2: «Đồng ý khuyến nghị việc 9» (ADR-0175, dòng lịch sử 2026-11-23). Màn Quét vé nay tự xử lý «lần trước đã ghi»: báo «Lần quét trước đã được ghi» (màn nền xám, không mang màu phán quyết), cho «Quét tiếp» ngay, trang không tải lại, camera giữ nguyên. Các màn khác vẫn báo rồi tải lại như ADR-0094. Bước 8 của kịch bản thành bước kiểm thật (≤ 3 giây hiện màn, sau 2,5 giây trang chưa tải lại, camera còn chạy), thêm bước 8b («Quét tiếp» ⇒ ≤ 4 giây ra đỏ «đã dùng»). Lần chạy 23/11 trên mã mới: 9/9 bước đạt, màn hiện sau ~1 giây. Phá cố ý 23/11 (P16): tạm bỏ dòng `datKhiDaGhi("/api/ve/quet", …)` ở `web/quet-ve.ts` ⇒ bước 8 đỏ («hết giờ chờ: kết quả DA_GHI») và 8b đỏ (trang đã tự tải lại); trả dòng về ⇒ xanh. Cách làm: lớp gửi lệnh chung có hàm đăng ký `datKhiDaGhi(đường lệnh, …)`, chỉ màn Quét vé gọi, cho đúng `POST /api/ve/quet`; «Bỏ lượt quét» vẫn theo cách cũ. Gói trang Đơn hàng không to thêm (hàm đăng ký bị bỏ khỏi gói khi trang không gọi). Đoạn «Trường hợp còn biết trước» ở trên không còn đúng từ bản có phần (d).
