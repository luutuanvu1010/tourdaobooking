# ADR-0221 — Đối tác không nhập nơi đón: ngoại lệ có công tắc của Toàn quyền, văn phòng điền nơi đón lúc «Còn vé»

- **Trạng thái:** **accepted** 2026-11-21 — chủ dự án trong chat, trả lời ba câu của bản đề xuất, nguyên văn: «1- khuyến nghị, 2- mọi tài khoản có quyền đối tác, 3- khuyến ngị». Yêu cầu gốc cùng ngày, nguyên văn: «yêu cầu phải sửa giống hình, nếu như vướng quy định thì biến nó thành ngoại lệ và tùy biến ở trong bảng điều khiển của Super Admin».
- **Ngày:** 2026-11-21.
- **Nguồn:** bản đề xuất `docs/superpowers/specs/2026-11-21-DE-XUAT-ADR-doi-tac-khong-nhap-noi-don.md`; ảnh H2 ở mục H của `docs/superpowers/specs/2026-11-20-danh-gia-lai-giao-dien/PHAT-HIEN.md`.
- **Loại:** việc lớn (dữ liệu lượt đón, cổng xác nhận đơn, một bảng cài đặt mới). **Cửa:** một chiều mềm — bảng công tắc chỉ thêm ở lại; tắt công tắc là về hành vi cũ.
- **Quan hệ với ADR cũ:** **giữ** ADR-0047 (lượt đón trong cơ sở dữ liệu vẫn luôn có nơi đón, không dựng lại bảng), ADR-0134 (chọn Đón thì phải có lượt mở), ADR-0142, ADR-0214 (phí không theo nơi đón). **Thay một phần** ADR-0154 Đ1.1 và mục H2 «phương án nhẹ» của đặc tả `2026-11-20-sua-giao-dien-bon-y-cua-chu.md` (form đối tác không còn ô «Nơi đón» khi công tắc bật). **Bổ sung** ADR-0136 Đ7 (bảng «Còn vé» nhận thêm nơi đón) và điều «chữ tạm» A1 của ADR-0047 (chữ tạm nay sinh ra từ một đường sống).
- **Xây trên lỗ đang hở:** HC-5.19 (có migration mới; khoá cho phép ghi ở `docs/quyen-hoan.json`, tiền lệ ADR-0193).

## Bối cảnh
Chủ muốn đối tác đặt bằng vài thao tác: chọn «Đón» là xong, văn phòng lo phần còn lại. Mỗi lượt đón bắt buộc có nơi đón ở ba lớp (trình duyệt, máy chủ, cơ sở dữ liệu), và trong lúc đơn chờ xác nhận không ai sửa được lượt. Nền tảng đã có một «chữ tạm» hợp lệ cho nơi đón chưa biết (`NOI_DON_CHUA_GHI`, dùng cho dữ liệu cũ) và khuôn công tắc của Toàn quyền ở trang Tôi (ADR-0193).

## Quyết định
1. **Đ1 — Công tắc «Đối tác không nhập nơi đón».** Công tắc mới ở trang Tôi của Toàn quyền, lưu theo khuôn ADR-0193 (bảng chỉ thêm, có nhật ký, ô quyền `settings.ops`). Gieo sẵn **Tắt** (đúng hành vi trước ADR này). Áp cho **mọi tài khoản giữ quyền Đối tác**, kể cả tài khoản lai (chủ chọn câu 2).
2. **Đ2 — Khi bật: form đối tác đúng như hình.** Chọn «Đón» thì chỉ còn hai nút «Đón», «Không đón» và ô ghi chú; không ô nào của lượt hiện ra; đối tác không tự thêm chiều về (chủ chọn câu 3). Máy chủ tự ghi nơi đón của lượt bằng chữ tạm; chỉ tài khoản giữ quyền Đối tác, lúc công tắc bật, mới được lưu lượt không có nơi đón. Luật an toàn: nháp cũ đã có nơi đón, chiều về hay nhiều lượt thì hiện đủ như trước.
3. **Đ3 — Văn phòng điền nơi đón lúc «Còn vé»; đơn không xác nhận được khi còn thiếu.** Bảng «Còn vé» thêm ô «Nơi đón» cho từng lượt đang thiếu. Mọi đường xác nhận đơn trả 409 `pickup_place_required` khi sau lệnh còn lượt mở mang chữ tạm; cổng xét theo dữ liệu nên vẫn đứng khi công tắc bị tắt sau lúc đối tác gửi. Chi tiết đơn hiện «Chưa có nơi đón» thay cho chữ tạm.

## Trang ghép
- **Bảng `ord_transfer_leg` nay chứa:** lượt có nơi đón thật; lượt mang chữ tạm của dữ liệu cũ; **mới:** lượt mang chữ tạm của đơn do tài khoản giữ quyền Đối tác lập, chưa xác nhận.
- **Quyền:** bật, tắt công tắc: `settings.ops` (chỉ Toàn quyền). Điền nơi đón lúc «Còn vé»: `order.confirm.review` (Bán hàng, Quản trị, Toàn quyền) — không thêm ô quyền. `order.trip.edit` của Đối tác vẫn `none`.
- **Cổng:** lập và lưu nháp — máy chủ chỉ nhận lượt thiếu nơi đón từ tài khoản giữ quyền Đối tác khi công tắc bật. Xác nhận đơn (Còn vé, tự xác nhận, đổi trạng thái) — chặn khi còn chữ tạm. Điều phối xe chỉ đọc đơn đã xác nhận nên không nhận lượt thiếu nơi đón. Giao diện: form đối tác ẩn ô theo công tắc; bảng «Còn vé» đánh dấu lượt thiếu nơi đón.

## Hệ quả
- Đối tác báo nơi đón bằng ô ghi chú; người xét điền lúc «Còn vé». Đơn có đón của đối tác vốn đã chờ văn phòng chốt giờ.
- Chiều về do văn phòng thêm sau xác nhận; lượt thêm sau xác nhận không tự sinh phí (ADR-0147 Đ3) — khe có sẵn, ADR này không vá.
- Một migration chỉ thêm bảng công tắc.

## Tiêu chí nghiệm thu
- Công tắc Tắt: hành vi như bản 3.19.
- Công tắc Bật: đối tác chọn «Đón», không gõ gì thêm, gửi được đơn; văn phòng chưa điền nơi đón thì không xác nhận được và thấy câu báo tại lượt; điền rồi thì xác nhận được, biên nhận và Điều phối xe có nơi đón thật.
- Tài khoản không giữ quyền Đối tác gửi lượt thiếu nơi đón: bị từ chối như trước.

## Điều chủ cần biết
- Tên công tắc do chủ chọn (câu 1): «Đối tác không nhập nơi đón».
- Công tắc gieo Tắt: sau khi triển khai chủ phải tự bật thì form đối tác mới đổi.
