# Đợt 2 bảng tham chiếu: đề xuất tên cho 102 việc chờ chọn (bản duyệt sơ bộ, CHƯA CHỐT)

Hồ sơ có ngày (4/11/2026). Chủ chưa chọn tên nào. Không nút, không bảng nào đã bị sửa. Bản nháp từng việc nằm ở thư mục `dot-2-ban-nhap/` (bốn lô, do bốn trợ lý soạn; chỗ trợ lý ghi «chưa chắc» chưa được xác minh hết). Một người kiểm độc lập (chỉ đọc) đã duyệt sơ bộ cả bốn lô và đối chiếu mã thật; phần dưới là kết quả sau khi sửa theo người kiểm.

## Kết quả một dòng
Trong 102 việc, khoảng 70 việc khuyến nghị **giữ nguyên tên đang hiện** (chữ đã khớp bảng chữ dùng chung). Khoảng 32 việc có đề xuất đổi hoặc cần chủ quyết. Đề xuất đổi của hai việc (63 và 84) trong bản nháp bị người kiểm bác, đã được thay ở dưới.

## Ba quyết định để chủ chốt (mỗi cái trả lời «theo khuyến nghị» được)

**1. Hai chỗ bản nháp đề xuất sai, khuyến nghị giữ nguyên.**
- Việc 63 («Từ chối đơn» ở Việc của tôi) bản nháp muốn đổi thành «Trả đơn», nhưng nó là CÙNG MỘT việc với 43 (nút ở Chi tiết đơn) và 183 (hạn mức Từ chối của hướng dẫn viên); bảng đã ghi hai nơi này là một việc. Tên «Từ chối» còn nằm trong ADR-0030, nhật ký, quyền, năm bài Hướng dẫn. **Khuyến nghị: giữ «Từ chối đơn» cả ba nơi.** Nếu muốn «Trả đơn» thì đổi cả ba nơi cùng lúc (tốn nhiều chỗ).
- Việc 84 («Thôi theo cấp này», cả vai trò) bản nháp muốn «Ngừng áp dụng cấp», nhưng cụm này nằm trong danh sách chữ bạn đã loại ngày 30/10 (máy chặn thật). **Khuyến nghị: giữ «Thôi theo cấp này».**

**2. Đổi chính tả «Ngưng» thành «Ngừng» (việc 176 và 235 cùng loại).**
Bảng chữ chung đã chốt «Ngừng». Nhưng chữ «Ngưng» còn ở khoảng 45 dòng giao diện (danh mục địa điểm, giấy tờ, lý do điều phối, nhóm hỗ trợ, đối tác, nhân viên, bảng giá xe) và vài bài Hướng dẫn. Đổi hai việc mà không quét hết thì còn hai cách viết cùng tồn tại. **Khuyến nghị: làm thành MỘT đợt riêng «Ngưng → Ngừng» có danh sách quét đủ**, không làm lẻ.

**3. Các việc đổi tên thật, khuyến nghị đã sửa theo người kiểm.**

| Việc | Hiện | Khuyến nghị |
|---|---|---|
| 4 | Tải ảnh PNG | Bỏ chữ PNG (chữ kỹ thuật); gồm cả câu báo nhắc «Tải ảnh PNG» |
| 5 | Xem biên nhận | Đổi theo tên hộp «Ảnh gửi khách» (chữ «biên nhận» còn ở vài câu báo, Hướng dẫn); chủ có thể giữ nếu nhân viên đã quen |
| 7 | Sửa danh sách | Gọi theo «Hành khách» để khỏi lẫn «Sửa số khách dịch vụ» |
| 55 | Xác nhận ngay (Trang chủ) | «Xem …» vì nút chỉ mở danh sách, chưa ghi gì |
| 57 | Huỷ người · Xoá | «Bỏ khỏi danh sách» (một việc hai lối vào cùng tên) |
| 121 | Lưu chuyến (trang Chuyến mới) | «Tạo chuyến» cho khớp lối vào khác; sửa chuyến thì vẫn «Lưu chuyến» |
| 209 | Cập nhật giờ dự kiến | GIỮ «Đổi giờ dự kiến» theo nhãn ô trên màn (bản nháp đề xuất sai) |
| 241 | Sửa giá (thẻ dịch vụ của đơn) | «Sửa giá đơn này», và cân nhắc đổi nút ở Dịch vụ & giá thành «Ghi đè giá» |
| 245 | Lưu bản mới | «Lưu thành bản mới» (chữ chuẩn của trang nhiều bản) |
| 261 | Gộp… | «Gộp hồ sơ» (nút chốt) |
| 269 | Lưu tài khoản / Đổi tài khoản | «… tài khoản nhận tiền» để khỏi trùng tài khoản đăng nhập |
| 276 | Chuyển | «Chuyển nhóm» |
| 290 | Về góc | «Đặt lại khung» (đặt lại cả vị trí và cỡ, không chỉ vị trí) |
| 294 | Thử key | Bỏ chữ Anh; «Thử khoá» hoặc «Thử kết nối» (chữ «khoá» trùng Khoá tháng) |
| 296 | Khôi phục mặc định | «Điền lời nhắc mặc định» (nút chỉ điền vào ô, chưa lưu) |
| 297 | Quay lại bản này | «Dùng bản này» (nút này LƯU ngay cho cả công ty) |

## Chưa quyết được, cần chủ cho ý (người kiểm bác khuyến nghị của bản nháp)
- Việc 10 («Ghi chi hoàn»): tên đề xuất «Ghi đã hoàn cho khách» chỉ khác «Ghi hoàn cho khách» (khách trả dư) đúng một chữ, nghĩa lại khác hẳn. Cần một bộ ba tên khác rõ giữa: khách trả dư, công ty đã trả tay cho khách đơn huỷ, và «Ghi đã hoàn ngoài hệ thống».
- Việc 52: không dùng «Xác nhận đặt gấp» (đụng «Xác nhận đơn»); nếu bỏ «Duyệt» thì «Ghi đặt gấp».
- Việc 164 và nhóm 56, 57, 164 (cách gọi «huỷ/bỏ một dòng ghi sai»): đang có ba họ tên (Huỷ dòng, Bỏ lượt, Bỏ khỏi danh sách); cần chọn một họ.
- Việc 239: KHÔNG đổi «ẩn» thành «ngừng bán» trong hộp đồng bộ Sheet; hai thứ khác nhau trong mã.
- Việc 228 («Ẩn danh hoá»): là chữ pháp lý của ADR-0126, giữ trừ khi chủ chịu đổi nhiều tiêu đề và hộp.
- Việc 144 («Không nhận»): lệch chữ chung «Từ chối», giữ nếu chủ chấp nhận lệch có chủ ý vì bấm một chạm trên điện thoại.

## Còn lại: giữ nguyên
Khoảng 70 việc, phần lớn vì chữ đã khớp «Chữ dùng chung» hoặc tên khái niệm chuẩn. Danh sách từng việc ở bốn lô.

## Chưa kiểm
Chưa chạy `npm test`, chưa chạy bài khớp tên nút với Hướng dẫn, chưa mở giao diện thật. Người kiểm chưa mở hết 19 việc (98, 107, 109, 113, 127, 142, 213, 223, 224, 230, 232, 250, 257, 258, 269, 276, 281, 284, 292). Các việc nhỏ khác (4/5 biên nhận, 38 chữ «nháp» còn sót ở hộp hỏi, 149 «Báo huỷ», 70 nhật ký «Giao N vé qua Zalo») phải quét chữ cũ đủ trước khi sửa.

## Khi chủ chốt
Mỗi lô sửa một lần: nút, câu báo, hộp hỏi, Hướng dẫn, nhật ký và bảng cùng lần lưu, rồi `npm run tham-chieu` và `npm test`. Việc nào ảnh hưởng nhật ký hoặc quyền thì cần người kiểm độc lập.
