# Bản vẽ hai màn sổ công nợ — lượt 1 và yêu cầu chỉnh (2026-10-25)

> Hồ sơ có ngày. Bản vẽ lượt 1 do Claude Design làm theo prompt `docs/superpowers/specs/2026-10-25-prompt-claude-design-hai-man-so.md`; chép nguyên từ thư mục chủ gửi (bỏ phông trùng `public/fonts`).
> **Chủ chốt 25/10 (chat, «ok»):** Sổ công nợ dùng **1a** (danh sách + ngăn chi tiết bên phải); Sổ của tôi dùng **1c** (bảng kê theo tháng, mở đơn ra phép tính). Căn cứ: phân tích UX/ERP của một trợ lý độc lập (chỉ đọc mã bản vẽ, không nhìn hình) và khuyến nghị của Claude Design.
> Điểm trợ lý nêu nhưng KHÔNG coi là lỗi: hoa hồng + giá bán lẻ cùng hiện (ADR-0081 cho phép cả hai trường và đã ghi đối tác tự tính ngược được tỷ lệ); đơn huỷ còn số dư (ADR-0081 điều 5 — chỉ thêm nhãn).

## Tin nhắn gửi Claude Design (dán nguyên khối)

```
Chủ đã chọn 1a cho "Sổ công nợ" và 1c cho "Sổ của tôi". Bỏ 1b và 1d. Xin chỉnh lượt 2 như sau, giữ nguyên mọi thứ khác (khung trang, màu, cỡ chữ, ba khổ, bốn trạng thái).

SỔ CÔNG NỢ (1a)
1. Dòng chân "Cộng các đơn = Số dư" phải là PHÉP TÍNH THẬT, không phải hai lần cùng một số: "Đang giữ: a + b = X · Công ty nợ: c + d = Y · X − Y = Số dư của bên". Vẽ thêm một trạng thái hiếm "Lệch 10.000 ₫ — báo Kế toán trưởng" (viền cảnh báo) để biết khi tổng đơn không khớp số dư.
2. Danh sách đơn của một bên: tách HAI NHÓM có tổng phụ — "Bên này đang giữ" và "Công ty nợ bên này" — thay vì trộn trong một cột. Đơn đã huỷ có nhãn "Đã huỷ — cọc còn giữ" ngay ở dòng đó.
3. Danh sách bên dài (vài trăm bên): thêm sắp xếp (Số tiền lớn nhất / Tên A→Z / Nhiều đơn nhất) và nút "Xem thêm 50 bên" ở cuối; vẽ trạng thái "đang tìm" và "không tìm thấy bên nào". Danh sách đơn của một bên cũng có "Xem thêm" khi quá 30 đơn.
4. Chỉ giữ MỘT ô tìm trên màn này (tìm theo tên bên). Ô tìm chung ở thanh trên giữ như các trang khác nhưng đừng đặt sát ô tìm của danh sách.
5. Hai ô cảnh báo "khoản chờ xác nhận" và "chưa rõ người thu": trên iPhone gộp thành MỘT dòng mỏng có thể bấm (ví dụ "3 khoản chờ xác nhận · 1 chưa rõ người thu ›"); máy tính giữ như cũ.

SỔ CỦA TÔI (1c)
1. Dữ liệu mẫu có một tháng ĐẦU KỲ KHÁC 0: tháng 9 cuối kỳ 1.200.000 → tháng 10 đầu kỳ 1.200.000. Thể hiện rõ cuối kỳ tháng trước = đầu kỳ tháng sau.
2. Ngoài hai mũi tên, bấm vào tên tháng thì mở danh sách chọn tháng/năm để nhảy nhanh.
3. Dưới khối "Cách tính" thêm một câu giải nghĩa thường ngày, ví dụ: "Bạn đã thu của khách 3.000.000, cộng phần giảm giá bạn tự chịu 250.000, trừ hoa hồng 500.000 của bạn ⇒ bạn còn giữ 2.750.000 của Tour Đảo." Nhãn "Giảm giá bạn chịu" và "Đã quyết toán" có nút (i) nhỏ giải thích một câu. Khoản "chờ Kế toán xác nhận" ghi đúng ở dòng của nó.
4. Số tổng đầu trang là số tới HÔM NAY; khi đang xem tháng cũ, thêm dòng nối nhỏ: "Tháng 9 kết thúc ở 1.200.000 ₫ · tính tới hôm nay: 1.840.000 ₫". Tháng đã khoá ghi "Đã khoá ngày 05/10".
5. Không thêm bất kỳ con số nào khác ngoài danh sách đã có (không %, không giá vốn, không nhà cung cấp, không nợ bên khác, không tên người thu).

Cho mỗi màn một khung "có dữ liệu" ở iPhone và máy tính sau khi chỉnh, kèm các trạng thái mới. Kiểm thêm: tên bên dài 40 ký tự và số tiền 1.250.000.000 ₫ không vỡ dòng ở iPhone 375.
```

## Còn chờ
- Lượt 2 của Claude Design (chủ gửi tin trên rồi lưu lại vào đây hoặc thư mục mới cùng ngày).
- Dựng màn **Sổ công nợ** (P1 của kế hoạch `docs/superpowers/plans/2026-10-24-so-cong-no-doi-tac-ke-hoach.md`) sau khi có lượt 2. Phần máy chủ (route chi tiết theo bên, nếu cần) làm được trước.

## Lượt 2 (nhận 2026-10-25 08:31)
Chép `So Cong No v2.dc.html` (= 2a), `So Cua Toi v2.dc.html` (= 2b) và bảng trình bày mới (đè bảng lượt 1; bảng mới vẫn chứa phần lượt 1). Đối chiếu mã bản vẽ với mười điểm yêu cầu (AI đọc mã, chưa nhìn hình): dòng chân Sổ công nợ nay cộng thật từ danh sách đơn và có trạng thái «Lệch … — báo Kế toán trưởng»; hai nhóm «Bên này đang giữ» / «Công ty nợ bên này»; «Đã huỷ — cọc còn giữ»; sắp xếp, «Xem thêm 50 bên», «Xem thêm» đơn; một ô tìm; iPhone gộp cảnh báo. Sổ của tôi: tháng 9 cuối kỳ 1.200.000 = tháng 10 đầu kỳ; bảng chọn tháng; «Đã khoá ngày 05/10»; câu giải nghĩa; nút (i); dòng nối «tính tới hôm nay»; không thấy %, giá vốn, nhà cung cấp. Có khung kiểm tên 40 ký tự và 1.250.000.000 ₫. **Bản dùng để dựng: 2a và 2b.**
