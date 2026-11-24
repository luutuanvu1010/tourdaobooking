# ĐỀ XUẤT ADR-0221 (số tạm) — Đối tác không nhập nơi đón: ngoại lệ có công tắc của Toàn quyền

> Ngày 21/11/2026. Trạng thái: **đề xuất, chờ chủ duyệt**; chưa có mã. Nguồn: lời chủ 21/11, nguyên văn «yêu cầu phải sửa giống hình, nếu như vướng quy định thì biến nó thành ngoại lệ và tùy biến ở trong bảng điều khiển của Super Admin» (hình = ảnh H2, mục H của `2026-11-20-danh-gia-lai-giao-dien/PHAT-HIEN.md`). Chủ duyệt thì bản này thành `docs/adr/ADR-0221-…md`.

- **Loại:** việc lớn (dữ liệu lượt đón, cổng xác nhận đơn, một bảng cài đặt mới). **Cửa:** một chiều mềm: bảng công tắc chỉ thêm ở lại; tắt công tắc là về hành vi cũ.
- **Quan hệ với ADR cũ:** **giữ** ADR-0047 (lượt đón trong cơ sở dữ liệu vẫn luôn có nơi đón; không dựng lại bảng), ADR-0134 (chọn Đón thì phải có lượt), ADR-0142, ADR-0214 (phí không theo nơi đón). **Thay một phần** ADR-0154 Đ1.1 và mục H2 «phương án nhẹ» của đặc tả 20/11 (form đối tác không còn ô «Nơi đón» khi công tắc bật). **Bổ sung** ADR-0136 Đ7 (bảng «Còn vé» nhận thêm nơi đón) và điều «chữ tạm» A1 của ADR-0047 (chữ tạm nay sinh ra từ một đường sống).
- **Xây trên lỗ đang hở:** HC-5.19 (có migration mới; cần khoá cho phép trong `docs/quyen-hoan.json`, tiền lệ ADR-0193).

## Bối cảnh
Chủ muốn đối tác đặt bằng vài thao tác: chọn «Đón» là xong, văn phòng lo phần còn lại. Hôm nay mỗi lượt đón bắt buộc có nơi đón ở ba lớp (trình duyệt, máy chủ, cơ sở dữ liệu), và trong lúc đơn chờ xác nhận không ai sửa được lượt. Nền tảng đã có sẵn một «chữ tạm» hợp lệ cho nơi đón chưa biết («(chưa ghi nơi đón)», dùng cho dữ liệu cũ), và đã có khuôn công tắc của Toàn quyền ở trang Tôi (ADR-0193: bắt buộc giờ đón).

## Quyết định (ba điều)
1. **Đ1 — Công tắc «Đối tác không nhập nơi đón».** Một công tắc mới ở trang Tôi của Toàn quyền, cạnh các công tắc đưa đón đang có; lưu theo khuôn ADR-0193 (bảng chỉ thêm, có nhật ký). Gieo sẵn **Tắt** (đúng hành vi hôm nay); chủ tự bật. Áp cho mọi tài khoản giữ quyền Đối tác, cùng phạm vi với form gọn.
2. **Đ2 — Khi bật: form đối tác đúng như hình.** Chọn «Đón» thì chỉ còn hai nút «Đón», «Không đón» và ô ghi chú; không ô nào của lượt hiện ra. Máy chủ tự ghi lượt chiều đi với chữ tạm ở nơi đón; chỉ tài khoản thuộc ngoại lệ, lúc công tắc bật, mới được lưu lượt như vậy. Luật an toàn giữ nguyên: nháp cũ đã có nơi đón, chiều về hay nhiều lượt thì hiện đủ.
3. **Đ3 — Văn phòng điền nơi đón lúc «Còn vé», và đơn không xác nhận được khi còn thiếu.** Bảng «Còn vé» thêm ô «Nơi đón» cho từng lượt, cạnh ô giờ đón. Mọi đường xác nhận đơn bị chặn khi còn lượt mở mang chữ tạm (cổng xét theo dữ liệu, nên vẫn đứng nếu công tắc bị tắt sau khi đối tác đã gửi). Nhờ cổng này, lượt chưa có nơi đón không bao giờ tới Điều phối xe, biên nhận hay tài xế. Chi tiết đơn hiện «Chưa có nơi đón» thay cho chữ tạm.

## Trang ghép
- **Bảng lượt đón nay chứa:** lượt có nơi đón thật (như cũ); lượt mang chữ tạm của dữ liệu cũ (như cũ); **mới:** lượt mang chữ tạm của đơn đối tác chưa xác nhận.
- **Quyền:** bật, tắt công tắc: chỉ Toàn quyền (ô cài đặt vận hành đang có). Điền nơi đón lúc «Còn vé»: người xét đơn (Bán hàng, Quản trị, Toàn quyền), không thêm quyền mới. Đối tác vẫn không sửa được lượt sau khi gửi.
- **Cổng nào canh cửa nào:** lưu nháp và gửi đơn: máy chủ chỉ nhận lượt thiếu nơi đón từ tài khoản Đối tác khi công tắc bật. Xác nhận đơn (Còn vé, tự xác nhận, đổi trạng thái): chặn khi còn chữ tạm. Điều phối xe: chỉ đọc đơn đã xác nhận, nên không nhận lượt thiếu nơi đón. Giao diện: form đối tác ẩn ô theo công tắc; bảng «Còn vé» đánh dấu lượt thiếu nơi đón.

## Hệ quả
- Đối tác muốn báo nơi đón thì gõ vào ô ghi chú; người xét đọc ghi chú (hoặc gọi đối tác) rồi điền lúc «Còn vé». Đơn có đón của đối tác vốn đã luôn chờ văn phòng chốt giờ, nên không thêm bước chờ mới.
- Đối tác chỉ gửi được đúng một lượt chiều đi. Chiều về do văn phòng thêm sau xác nhận; lượt thêm sau xác nhận hôm nay **không tự sinh phí** (ADR-0147 Đ3), muốn thu thêm phải điều chỉnh công nợ. Đây là khe có sẵn, đề xuất này không vá.
- Khối lượng: khoảng 30 tệp, một migration chỉ thêm bảng (số tạm 0181), một mã lỗi và vài nhãn mới phải qua bảng tham chiếu. Ước vài ngày, có người kiểm độc lập và kịch bản Chrome.

## Tiêu chí nghiệm thu
- Công tắc Tắt: mọi thứ như bản 3.19.
- Công tắc Bật: đối tác chọn «Đón», không gõ gì thêm, gửi được đơn; văn phòng mở «Còn vé», chưa điền nơi đón thì không xác nhận được và thấy câu báo ngay tại lượt; điền rồi thì xác nhận được, biên nhận và Điều phối xe có nơi đón thật.
- Tài khoản không phải Đối tác gửi lượt thiếu nơi đón: bị từ chối như hôm nay.

## Điều chủ cần quyết (mỗi câu có khuyến nghị)
1. **Tên công tắc:** «Đối tác không nhập nơi đón» (khuyến nghị) hay «Văn phòng điền nơi đón cho đơn đối tác».
2. **Phạm vi:** mọi tài khoản giữ quyền Đối tác, kể cả tài khoản vừa Bán hàng vừa Đối tác (khuyến nghị, cùng phạm vi form gọn) hay chỉ Đối tác thuần.
3. **Chiều về:** chấp nhận đối tác không tự thêm chiều về, văn phòng thêm sau (khuyến nghị, đúng hình) hay giữ lại một nút «Thêm chiều về».
