# Số sê-ri của vé, tra vé bằng số sê-ri, huỷ vé lẻ và huỷ phần còn lại của lô

> Đặc tả ngắn, **chờ chủ duyệt** (2026-11-17). Việc lớn: đổi một điều của ADR-0175 đã duyệt, thêm dữ liệu, thêm quyền huỷ. Duyệt xong mới soạn ADR mới (kèm dòng lịch sử cho ADR-0175 và trang ghép) rồi mới thi công.

## 1. Việc gì, cho ai, vì sao

Chủ 17/11 yêu cầu quản lý vé theo số sê-ri, cho vai nội bộ biết vé đã dùng chưa bằng cách quét **hoặc gõ số sê-ri**, và huỷ được vé theo lô lẫn từng vé lẻ.

Hiện trạng đã đọc trong mã (không phải lỗi, mà là quyết định cũ): vé Tour Đảo chỉ in «Số vé …» kèm 4 ký tự cuối của mã bí mật trong QR (ADR-0175 Đ1 mục 6–7; ADR-0153 Đ1 mục 5 cấm lộ mã). Hệ thống chưa có số nào khác để gọi tên một vé. Màn Quét vé chỉ có camera và chụp ảnh, không có ô gõ. «Huỷ lô» chỉ dùng được khi chưa vé nào của lô từng được giữ cho đơn; không có lệnh huỷ một vé.

## 2. Xong khi (ví dụ nhìn thấy được)

- **Số sê-ri.** Mỗi vé (Tour Đảo và hãng ngoài) có một số sê-ri do máy chủ cấp, dạng `VE_KQMZTRAB` theo Hiến chương 5.26 (8 chữ hoa ngẫu nhiên, không theo thứ tự). Vé Tour Đảo tạo mới in **đủ** số sê-ri dưới QR, kèm dòng tiếng Anh «Serial No.». Mã bí mật vẫn chỉ nằm trong QR.
- **Tra bằng số sê-ri.** Hướng dẫn viên mở Quét vé, gõ `VE_KQMZTRAB` vào ô «Nhập số sê-ri», thấy cùng kết quả như quét: xanh / vàng / đỏ, «Đã dùng lúc 09:12 bởi Lan» nếu đã dùng. Gõ tay thì luôn phải bấm thêm một lần xác nhận vàng «Bạn đang nhập tay, hãy đối chiếu với vé khách đưa» trước khi máy ghi «Đã dùng»; nhật ký ghi «nhập tay». Tài xế công ty gõ thì chỉ xem, như quét.
- **Kho vé.** Mỗi lô có danh sách vé theo số sê-ri và tình trạng (Trong kho / Đã giữ cho đơn / Đã gửi khách / Đã dùng / Đã huỷ), có ô tìm theo số sê-ri.
- **Huỷ vé lẻ.** Kế toán tìm `VE_KQMZTRAB`, bấm «Huỷ vé», ghi lý do, xác nhận. Kết quả theo bảng dưới. Nhật ký ghi số sê-ri, không ghi mã bí mật.
- **Huỷ lô có vé đã dùng.** Lô Tour Đảo 50 vé: 30 trong kho, 15 đã giữ cho 6 đơn (8 vé đã gửi khách), 5 đã dùng. Bấm «Huỷ lô» thì máy báo trước: «Huỷ 45 vé; 5 vé đã dùng giữ nguyên; 6 đơn sẽ được cấp vé thay, 8 vé đã gửi khách phải gửi lại». Xác nhận thì làm đúng như báo.

| Tình trạng vé | Vé Tour Đảo | Vé hãng ngoài |
|---|---|---|
| Trong kho | Huỷ được, vé chết | Huỷ được, gỡ khỏi kho |
| Đã giữ cho đơn, chưa mở | Huỷ được; đơn được cấp vé thay | Huỷ được; đơn được cấp vé thay |
| Đã mở hoặc đã gửi khách, chưa dùng | Huỷ được, quét ra đỏ; đơn được cấp vé thay, người phụ trách đơn được báo gửi lại | **Không** huỷ được (hãng ngoài không thu hồi được vé đã lộ) |
| Đã dùng | **Không**; bỏ lượt quét trước, như ADR-0175 Đ3 | Không áp (máy không biết) |

Ai huỷ: người giữ quyền thao tác lô đó như hiện nay (lô Tour Đảo: Kế toán, Quản lý bán hàng, Quản trị, Toàn quyền; lô hãng ngoài: Bán hàng, Quản trị, Toàn quyền).

## 3. Không làm lần này

Tra vé hãng ngoài theo số S/N in trên vé Vinpearl. Ảnh vé Tour Đảo đã tạo trước bản này không vẽ lại (vé cũ vẫn được cấp số sê-ri trong hệ thống, tra được, nhưng ảnh đã gửi không có số; trên bản thật có vé Tour Đảo nào chưa: **chưa kiểm**). Vé đoàn. Huỷ vé không đụng tiền của đơn.

## 4. Loại việc

- [x] Việc lớn (dữ liệu, quyền) ⇒ có người kiểm độc lập. Cần ADR mới: thêm cột số sê-ri (migration chỉ thêm, gán số cho vé cũ), đổi nội dung in trên vé của ADR-0175 Đ1 mục 7, thêm lệnh huỷ vé lẻ và nới «Huỷ lô».

## 5. Câu hỏi cho chủ

1. **Gõ số sê-ri được làm gì?** Khuyến nghị: được làm như quét (kể cả ghi «Đã dùng»), nhưng luôn qua một bước xác nhận vàng và nhật ký ghi «nhập tay». Lý do: số sê-ri in đủ trên vé nên ai có ảnh vé thì cũng có QR, gõ tay không mở thêm rủi ro; cấm ghi «Đã dùng» bằng gõ tay thì vé nhòe QR không xử lý được tại chỗ. Phương án chặt hơn: gõ tay chỉ xem.
2. **Huỷ vé đã gửi khách thì máy có tự cấp vé thay không?** Khuyến nghị: có, lấy vé khác trong kho cùng dịch vụ, cùng loại khách; hết vé thì đơn thành thiếu vé và báo như hiện nay. Lý do: đơn vẫn đúng số khách, không ai phải nhớ cấp lại. Phương án khác: chỉ báo thiếu, người phụ trách tự cấp.
3. **Tên gọi** (chưa có trong bảng tham chiếu; «Số vé» đã mang nghĩa số lượng nên không dùng). Khuyến nghị **«Số sê-ri»** (đúng chữ chủ dùng). Phương án khác: «Số hiệu vé», «Mã vé» (dễ lẫn với mã QR bí mật).

## 6. Điều AI tự quyết (chủ bác được)

- Số sê-ri theo Hiến chương 5.26 nên **ngẫu nhiên, không theo thứ tự**, tiền tố `VE`. Hệ quả: không đọc ra «từ số … đến số …» như vé giấy, nhưng người ngoài không đoán được số của vé khác. Muốn số theo thứ tự thì phải là ngoại lệ có tên của 5.26, chủ duyệt riêng.
- Số sê-ri không bí mật, nên hiện trên danh sách, nhật ký và phản hồi của máy chủ; mã trong QR vẫn bí mật như cũ.
- Huỷ vé lẻ và huỷ lô bắt buộc lý do (5–300 ký tự), có nhật ký, cùng một lệnh ghi, theo khuôn chống ghi trùng ADR-0094.
- Ô gõ số sê-ri tự đổi chữ thường thành chữ hoa và bỏ khoảng trắng.
