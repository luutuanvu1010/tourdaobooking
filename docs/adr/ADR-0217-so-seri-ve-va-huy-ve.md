# ADR-0217 — Số sê-ri của vé, tra vé bằng số sê-ri, huỷ vé lẻ và huỷ phần còn lại của lô

- **Trạng thái:** **đề xuất** 2026-11-17, chờ chủ duyệt. Đặc tả ngắn `docs/superpowers/specs/2026-11-17-so-seri-ve-va-huy-ve.md` chủ đã duyệt cùng ngày, nguyên văn *«duyệt theo khuyến nghị, tiếp tục»*, tức là chốt cả ba câu: (1) gõ số sê-ri được làm như quét, kể cả ghi «Đã dùng», nhưng luôn qua một bước xác nhận vàng và nhật ký ghi «nhập tay»; (2) huỷ vé đã giữ cho đơn thì máy tự cấp vé thay; (3) tên trên giao diện là «Số sê-ri». Thi công đi trước trên bản làm việc riêng; **chỉ nhập vào bản chính sau khi ADR này được duyệt**.
- **Ngày:** 2026-11-17   **Loại:** việc lớn (dữ liệu, quyền huỷ).
- **Cửa:** một chiều mềm với dữ liệu (số sê-ri cấp rồi không đổi; vé đã huỷ không sống lại). Hai chiều với hành vi.
- **Số:** 0217, đã soát mọi nhánh chưa gộp ngày 17/11. Migration `0177` (`0174`–`0176` đang ở các nhánh đăng ký tài khoản).
- **Số quyết định chạm quyền/dữ liệu:** 3 (Đ1, Đ2, Đ3), đúng trần `CLAUDE.md` §9. Trang ghép ở cuối.
- **Quan hệ với ADR cũ:**
  - **Sửa** ADR-0175 Đ1 mục 7 (nội dung in trên vé Tour Đảo): thay dòng «Số vé …» kèm 4 ký tự cuối bằng số sê-ri in đủ. Mã bí mật vẫn chỉ nằm trong QR như ADR-0175 Đ1 mục 6.
  - **Nới** ADR-0156 Đ2 mục 3 («Huỷ lô» chỉ cho lô chưa từng cấp): nay huỷ được phần còn lại của lô đã cấp, theo bảng ở Đ3. Lô chưa từng cấp vẫn đi đường cũ (vé mang dấu rút, nhập lại được).
  - **Thêm** vào ADR-0175 Đ3 mục 3: đường gõ số sê-ri ở Quét vé.
  - **Giữ:** ADR-0153 Đ1 mục 5 (mã vé không vào nhật ký, URL, phản hồi lệnh ghi) và mục 6 (vé đã lộ chỉ còn đường VOID); ADR-0175 Đ3 mục 8 (vé đã dùng không huỷ được); ADR-0094 (chống ghi trùng); ADR-0170 Đ3 (đối tác không tự huỷ). Không thêm ô quyền.

## Bối cảnh

Chủ 17/11 yêu cầu quản lý vé theo số sê-ri, cho vai nội bộ kiểm vé đã dùng chưa bằng cách quét hoặc gõ số sê-ri, và huỷ được vé theo lô lẫn từng vé lẻ. Hôm nay vé không có số nào để gọi tên: mã trong QR là bí mật, vé chỉ in 4 ký tự cuối, Quét vé không có ô gõ, «Huỷ lô» chỉ dùng được khi chưa vé nào từng được giữ cho đơn.

## Đ1 — Số sê-ri

1. Mỗi dòng `vdt_ticket` có cột `serial`, dạng `VE_` + 8 chữ hoa ngẫu nhiên, theo Hiến chương 5.26 (tiền tố `VE` khai ở `TIEN_TO_MA`). Máy chủ cấp, không đổi, duy nhất trong toàn kho (kể cả vé đã huỷ, đã rút). Số **không bí mật**: được hiện trên danh sách, trong nhật ký, URL tra cứu và phản hồi của máy chủ.
2. Sổ cấp số `vdt_serial` (chỉ thêm) giữ mọi số đã cấp. Vé hãng ngoài: máy chủ cấp số lúc chèn vé. Vé Tour Đảo: ảnh vẽ ở trình duyệt nên số phải có trước khi vẽ; lệnh mở lô Tour Đảo (`POST /api/ve/lo`, có `soVeDuKien`) cấp sẵn đúng số đó vào sổ cho lô và trả về; lệnh thêm vé của lô Tour Đảo phải mang một số đã cấp cho chính lô đó, chưa dùng.
3. Vé đã có trước bản này được migration gán số. Ảnh đã vẽ không vẽ lại, nên vé Tour Đảo cũ (nếu có trên bản thật; chưa kiểm) không in số nhưng tra được.
4. Vé Tour Đảo tạo mới in đủ số sê-ri dưới QR, dòng tiếng Anh «Serial No.». Bỏ dòng «Số vé …» 4 ký tự.

## Đ2 — Tra vé bằng số sê-ri

1. Quét vé có thêm ô «Nhập số sê-ri». Máy chủ dùng chung `POST /api/ve/quet`: chuỗi đúng dạng số sê-ri thì tra theo `serial`, ngược lại tra theo mã QR như cũ. Ô gõ đổi chữ thường thành chữ hoa, bỏ khoảng trắng.
2. Mọi kiểm và câu trả về giữ nguyên ADR-0175 Đ3 mục 3–5 (đỏ / vàng / xanh; vé hãng ngoài và số lạ chung một câu đỏ; Tài xế công ty chỉ xem).
3. Gõ tay luôn thêm một cảnh báo vàng «nhập tay» trước khi ghi «Đã dùng», kể cả khi mọi kiểm khác xanh. Lượt quét ghi cờ `nhap_tay = 1` (bất biến như các cột khác của `vdt_scan`); nhật ký ghi «nhập tay» và số sê-ri.

## Đ3 — Huỷ vé lẻ và huỷ phần còn lại của lô

1. Người huỷ là người được thao tác lô đó như hôm nay (`coQuyenLo`): lô Tour Đảo cần `ve.phat-hanh`, lô hãng ngoài cần `ve.kho.manage`. Bắt buộc lý do 5–300 ký tự (không chứa số điện thoại hay mã vé), có nhật ký ghi số sê-ri, một lệnh ghi theo ADR-0094.
2. Kết quả theo tình trạng vé:

| Tình trạng | Vé Tour Đảo | Vé hãng ngoài |
|---|---|---|
| Trong kho | Huỷ, vé VOID | Huỷ, vé VOID |
| Đã giữ cho đơn, chưa mở | Trả suất (lý do `THU_HOI`), vé VOID, cấp vé thay | Như Tour Đảo |
| Đã mở hoặc đã gửi, chưa dùng | Trả suất, vé VOID (quét ra đỏ), cấp vé thay, báo người phụ trách đơn gửi lại | **Không huỷ** (409) |
| Đã dùng (có lượt `DA_TINH` chưa bỏ) | **Không huỷ** (409); bỏ lượt quét trước | Không áp |

3. Vé đã huỷ ghi một lần `voided_at`, `voided_by`, `void_reason`; không về kho, không bật lại (trigger sẵn có của trạng thái VOID).
4. **Cấp vé thay:** sau lệnh huỷ, máy chạy lại đường cấp vé sẵn có cho các đơn bị trả suất (cùng dịch vụ, cùng loại khách, lô đúng nguồn theo ô «Vé do ai phát» hiện tại). Hết vé thì đơn thành thiếu vé và báo như hiện nay.
5. **Huỷ lô:** lô chưa từng cấp đi đường cũ. Lô đã cấp: trước khi xác nhận, màn hình hiện bản xem trước do máy chủ đếm (bao nhiêu vé huỷ được, bao nhiêu giữ nguyên vì đã dùng hoặc là vé hãng ngoài đã mở, bao nhiêu đơn được cấp vé thay, bao nhiêu vé đã gửi khách phải gửi lại); bấm xác nhận thì huỷ mọi vé huỷ được theo bảng trên, lô chuyển VOID nên không cấp thêm vé từ lô này. Vé giữ nguyên vẫn quét được như cũ.

## Phương án đã loại

- **In đủ mã bí mật làm số sê-ri.** Mã sẽ vào danh sách, nhật ký; trái ADR-0153 Đ1 mục 5.
- **Số theo thứ tự (0001, 0002…).** Trái Hiến chương 5.26 và đoán được số của vé khác. Muốn vậy phải duyệt ngoại lệ riêng.
- **Trình duyệt tự sinh số sê-ri.** Trái 5.26 «máy chủ cấp». Sổ cấp số trước giải quyết được việc vẽ ảnh ở trình duyệt.
- **Gõ tay chỉ được xem.** Vé nhòe QR không xử lý được tại chỗ, trong khi ai có ảnh vé thì cũng có QR. Chủ chọn cho ghi «Đã dùng» kèm xác nhận.
- **Huỷ vé đã gửi chỉ báo thiếu, không cấp thay.** Chủ chọn cấp thay.

## Hệ quả

- Số sê-ri thành khoá tra cứu chung của vé trong Nền tảng; nhật ký mới ghi số sê-ri thay cho «số cuối».
- Huỷ vé đã gửi khách làm khách cầm vé chết: văn phòng phải gửi lại vé thay. Đây là chủ ý.
- Không đổi tiền, số khách, trạng thái đơn.

## Từ ngữ

«Số sê-ri» (chủ chọn 17/11). «Huỷ vé», «Nhập số sê-ri» và chữ xác nhận «nhập tay» do người thi công đặt theo khuôn chữ có sẵn, ghi vào bảng tham chiếu ở trạng thái chờ chủ chọn.

## Trang ghép (`CLAUDE.md` §9)

**1. Bảng chứa loại thực thể nào.** `vdt_ticket` như cũ (vé hãng ngoài, vé Tour Đảo), thêm số sê-ri và dấu huỷ. `vdt_serial` mới: chỉ số sê-ri đã cấp, của cả hai loại vé. `vdt_scan` thêm cờ nhập tay. `vdt_allocation` dùng lý do `THU_HOI` sẵn có.

**2. Bản đồ quyền.** Không thêm ô. `ve.phat-hanh` (lô Tour Đảo) và `ve.kho.manage` (lô hãng ngoài) nay gồm cả huỷ vé lẻ và huỷ lô đã cấp. `ve.quet.tinh` / `ve.quet.xem` gồm cả gõ số sê-ri.

**3. Cổng nào canh cửa nào.**

| Cửa | Cổng máy chủ | Giao diện đổi nghĩa |
|---|---|---|
| Huỷ vé lẻ, huỷ lô đã cấp | `coQuyenLo` theo nguồn của lô; chặn vé đã dùng, vé hãng ngoài đã mở | Kho vé: danh sách vé của lô, ô tìm số sê-ri, nút «Huỷ vé»; «Huỷ lô» hiện cả với lô đã cấp |
| Xem danh sách số sê-ri của lô, tìm vé theo số sê-ri | `coQuyenLo` theo nguồn của lô, **không** mở rộng «chỉ xem số lượng»: Bán hàng (có `ve.kho.manage` và `ve.quet.tinh`, không có `ve.phat-hanh`) thấy số lượng lô Tour Đảo nhưng không thấy số sê-ri của nó, vì có số sê-ri cả lô là gõ được «Đã dùng» cho vé chưa từng cầm (kiểm độc lập 17/11, M1) | Kho vé: nút «Xem vé» chỉ hiện ở lô người xem thao tác được |
| Gõ số sê-ri | `ve.quet.tinh` hoặc `ve.quet.xem` (như quét) | Quét vé: ô «Nhập số sê-ri» |
| Cấp số cho lô Tour Đảo | `coQuyenLo` (như mở lô) | Tạo vé: in số sê-ri lên ảnh |
| Trả suất, cấp vé thay | Đường trả vé và cấp vé sẵn có, chạy trong module vé | Khối vé trên đơn: vé thay hiện như vé mới cấp, chưa gửi |
