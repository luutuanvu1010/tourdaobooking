# Sổ thi công — chính sách chiết khấu bốn trục

Kế hoạch: `2026-11-03-chinh-sach-chiet-khau-bon-truc.md`. Quyết định: ADR-0161. Thêm việc vào bảng phải hỏi chủ; phát hiện không chặn phát hành ghi vào mục Nợ.

## Bảng việc

| Việc | Xong khi | Trạng thái |
|---|---|---|
| Task 1 Giới hạn nhập | Bài route và bài thuần xanh | xong 3/11, chờ người kiểm độc lập |
| Task 2 Chặn vượt giá, rào quét | Xanh, đã thấy rào chặn thật | xong 3/11, chờ người kiểm độc lập |
| Task 3 Trần không tính dòng vượt | Xanh, sổ vàng chờ xác nhận | xong 3/11, chờ người kiểm độc lập |
| Task 4 Màn đơn | Xanh | chưa |
| Task 5 Luật thuần bảng nhập | Xanh | chưa |
| Task 6 Bảng nhập và hộp | Thử Chrome ba ô liên tiếp đạt | chưa |
| Task 7 Bỏ lối vai trò, chữ | Xanh | chưa |
| Task 8 Trang giới hạn | Xanh | chưa |
| Task 9 Tài liệu, bộ kiểm dài | Mọi bộ xanh, có ảnh ba khổ | chưa |
| Người kiểm độc lập | Không còn lỗi Cao, Trung | chưa |

## Bằng chứng quan sát chặn thật

- **Task 1, 3/11 (giới hạn nhập chặn thật ở máy chủ):** tạm bỏ lời gọi `kiemSoMucMoi` ở route `POST /api/pricing/hoa-hong/:id/doi` ⇒ `node --test src/modules/pricing/gioi-han-nhap.test.ts` đỏ hai bài (ca «51% và 123.456 đ trả 400…» và ca «hạ trần dưới dòng đã có…»: Đổi sang 51% hay 123.456 đ không còn bị từ chối, thân phản hồi không có `error`). Hoàn nguyên lời gọi ⇒ 10/10 xanh. Dòng cho `docs/SO-HANG-RAO.md` ở Task 9: «giới hạn nhập mức hoa hồng», cơ chế `kiemSoMucMoi` + bài `gioi-han-nhap.test.ts`, quan sát 2026-11-03.
- **Task 2, 3/11 (rào quét mọi đường ghi mức chặn thật):** tạm bỏ lời gọi `kiemSoMucMoi` ở route `POST /api/pricing/hoa-hong/:id/doi` ⇒ `node --test src/modules/pricing/ghi-muc-qua-cong.test.ts` đỏ với câu «index.ts: route POST /api/pricing/hoa-hong/:id/doi gọi câu ghi mức mà không gọi kiemSoMucMoi(». Hoàn nguyên ⇒ xanh (2/2; bài thứ hai là bài tự thử khuôn quét: khúc thiếu cổng, hàm trợ giúp thiếu cổng, chú thích và định nghĩa hàm không đánh lừa được). Dòng cho `docs/SO-HANG-RAO.md` ở Task 9: «mọi route ghi mức của pricing gọi cổng kiemSoMucMoi», cơ chế bài quét `ghi-muc-qua-cong.test.ts`, quan sát 2026-11-03.
- **Task 2, 3/11 (cổng vượt giá bán chặn thật, trước khi viết mã):** thêm bài vào `gioi-han-nhap.test.ts` rồi chạy trước khi sửa `kiemSoMucMoi` ⇒ đỏ 4/22 (bài 500.000 đ cho vé 300.000 đ, bài «Mọi khách như nhau»/«Riêng từng loại», bài dịch vụ tính theo lượt, bài giá giảm sau đó); sau khi thêm vế `mucVuotGiaBan` ⇒ 22/22 xanh.
- **Task 3, 3/11 (trần không tính dòng vượt chặn thật):** viết bài đỏ trước (5 bài đỏ đúng lý do: ca SV-TG-02, SV-TG-03 và ca đổi bên đặt vẫn nhận theo luật cũ; hai bài luật thuần thiếu hàm). Sau khi cài: tạm cho `hoaHongTinhTran` trả số gốc (`d.hoaHong ?? 0`) ⇒ `node --test src/modules/orders/tran-giam-gia-don.test.ts src/modules/orders/thuong-mai.test.ts src/kiem-dinh-ky-so-dai-ly.test.ts` đỏ 7/53 (ca R-ORD-DC1 mới, bài `tongHoaHongDon` «tinh0», hai bài luật thuần, SV-TG-02, SV-TG-03, ca đổi bên đặt). Hoàn nguyên ⇒ 53/53 xanh. Một hàm duy nhất quyết dòng nào vào trần cho cả ba cổng máy chủ (nháp / xác nhận / đổi bên đặt) lẫn kiểm định kỳ R-ORD-DC1.

## Giả định đã tự chọn

- **Task 1 — thứ tự kiểm của `POST /api/pricing/gioi-han-nhap`:** thân sai ⇒ 400; `tuLuc` khác mốc dòng mới nhất ⇒ 409 `stale`; rồi mới xét «số giống số đang hiệu lực ⇒ 200, không ghi». Hộp gửi `tuLuc` cũ kèm số đang hiệu lực vẫn nhận 409 (an toàn hơn: buộc tải lại).
- **Task 1 — bảng giới hạn rỗng (không xảy ra sau migration 0137):** route đọc và cổng `kiemSoMucMoi` trả 503 `chua_co_gioi_han` (đóng kín, không đoán con số).
- **Task 1 — nhật ký:** `prc_entry_limit_changed` ghi `target_type = 'ledger'`, không `target_id`; `detail` «trần 50% → 60% · bước 1.000đ → 1.000đ». Xếp vào hai danh sách ẨN của lịch sử đơn (`lich-su-doi-tac.ts`, `lich-su-noi-bo.ts`) như mọi `prc_*`: loại dòng mới mặc định ẩn, Toàn quyền đọc ở trang Nhật ký (typecheck bắt buộc phải xếp loại).
- **Task 1 — trigger bảng giới hạn:** tên lỗi `prc_policy_append_only` (không dùng `prc_append_only` vì `loiBang` đã đổi chữ này thành «dòng vừa được người khác ngừng»).
- **Task 2 — dịch vụ nào bị bỏ qua khi so vượt giá:** `kiemSoMucMoi` chỉ so khi dịch vụ còn `visible` (còn trong Sheet và không bị ẩn). Dịch vụ đã rời Sheet hoặc bị ẩn: bỏ qua, nhập được (không còn giá bán hiện hành). `EffectiveService` không tách «rời Sheet» khỏi «bị ẩn», nên bị ẩn cũng bỏ qua — chấp nhận, vì dịch vụ ẩn không bán. Dịch vụ không còn trong danh mục: bỏ qua. Bài `dịch vụ tính theo lượt…` gieo số CAO hơn giá lưu (500.000 đ so 300.000 đ) để phân biệt được hai luật.
- **Task 2 — phạm vi và loại bị so:** Đổi và Sửa lấy phạm vi và mã dịch vụ từ DÒNG CŨ (`row`), không từ thân. Chỉ phạm vi một dịch vụ và kiểu số tiền được so; phần trăm, nhóm, tất cả bỏ qua. Dịch vụ tính theo lượt chỉ so số người lớn với giá mỗi lượt, bỏ qua số theo loại.
- **Task 1 — `noiGioiHanNhap(w)`** (khung thử) chèn dòng mới với mốc = mốc lớn nhất hiện có + 1 ms, nên vẫn là dòng mới nhất khi bài mock đồng hồ về quá khứ. `bien-nhan.test.ts` nhận thêm tuỳ chọn `noiGioiHan` ở hàm `dung` (chỉ bài «Task 8 số lạ» bật).

- **Task 3 — một hàm quyết «dòng vượt» cho cả tổng và cờ `coDongVuot`:** `tinhCacDong` tính hoa hồng từng dòng MỘT lần; `tongHoaHongDon(…, "tinh0")` cộng `hoaHongTinhTran` và `coDongVuotDon` dùng `dongVuotThanhTien` trên cùng kết quả dòng, nên số trần và câu báo không thể lệch nhau. Chế độ `"null"` (cảnh báo sau Xác nhận, `canhBaoGiamGia`) giữ số gốc đúng như kế hoạch; không thêm chế độ thứ ba, không sửa `scripts/audit-thuong-mai.mjs` (nó gọi `"tinh0"` nên tự theo luật mới).
- **Task 3 — `cauDoiBenDatVuotHoaHong` và `coDongVuot`:** tham số `coDongVuot` bắt buộc (không tuỳ chọn) để chỗ gọi không quên; chỗ gọi duy nhất là `PUT /api/orders/:id/booker`.
- **Task 3 — ca «bằng thành tiền vẫn tính»** có thêm một dịch vụ tour mức riêng 15% để tổng không bằng cả thành tiền đơn (giảm bằng đúng 100% thành tiền sẽ làm đơn còn 0 ₫); trần 900.000 đ = 600.000 (vé, bằng thành tiền) + 300.000 (tour).
- **Task 3 — ca Thực tập / Đối tác không hưởng trên đơn có dòng vượt:** kiểm bằng route thật (Thực tập 403 câu Thực tập; Đối tác bị văn phòng gắn đại lý khác 403 câu Đối tác, câu không lộ chữ «vượt giá bán» hay số).
- **Task 3 — hộp nhập (`web/order-form.ts`):** trần hiện dưới ô giảm giá tính từ `dong` của phản hồi `GET …/thuong-mai` bằng `tongTinhTran` (còn dòng thiếu mức ⇒ null ⇒ không đoán số, như trước) và `dong.some(dongVuotThanhTien)`. Chưa thử trên Chrome (việc của Task 9).
## Nợ

- **Task 1 → Task 9, kịch bản e2e (không chạy giữa chừng, cần mạng):** mọi tỷ lệ trong `tests/e2e/{muc-ta,loai-doi-tac,so-dai-ly,so-dai-ly-dot-2,sua-muc,nhap-tay-va-gia-doi-tac}.mjs` ≤ 20% và mọi số tiền chia hết 1.000 nên không chạm giới hạn gieo. Hai dòng cần xem giá khi Task 2 chặn vượt giá đã kiểm bằng cách đọc kịch bản: `so-dai-ly-dot-2.mjs:110` (dịch vụ `ZSD2I`, giá 300.000 đ, mức 50.000 đ/khách) và `sua-muc.mjs:52` (dịch vụ `ZE1`, giá 100.000 đ người lớn và 50.000 đ trẻ em, mức 50.000 đ/khách «mọi khách») — đều trong giá, chưa chạy e2e thật.
- **Task 3 → Task 4, cảnh báo sau Xác nhận vẫn theo số gốc:** `canhBaoGiamGia` ở chi tiết đơn (chế độ `"null"` của `tongHoaHongDon`) và `chenhGiamGiaSauGhiTay` cố ý cộng hoa hồng GỐC (kế hoạch giữ số gốc, chú thích đã nói rõ). Hệ quả: đơn đã xác nhận có dòng vượt, giảm giá lớn hơn trần mới nhưng nhỏ hơn tổng gốc ⇒ trang đơn không cảnh báo, dù kiểm định kỳ R-ORD-DC1 (theo trần mới) báo. Màn đơn là việc của Task 4; chưa quyết có cần đổi cảnh báo này hay không — hỏi chủ nếu Task 4 chạm tới.
- **Task 3 → Task 9, chưa chạy:** kịch bản e2e (cần mạng), kịch bản Chrome trang lập/sửa đơn (câu trần mới dưới ô giảm giá), `npm test` toàn bộ. Giữa chừng chỉ chạy nhóm bài liên quan (964 bài, 0 đỏ) và `npm run typecheck`.
- **Task 3, sổ vàng `golden/tran-giam-gia-dong-vuot.json`:** SV-TG-01…03 `cho_xac_nhan`, số do AI soạn; đáp án chưa ai xác nhận. Đổi sang `da_xac_nhan` là việc của chủ hoặc Kế toán.
- **Task 3 → CHỦ QUYẾT trước khi triển khai, ảnh hưởng của R-ORD-DC1 lên đơn ĐÃ xác nhận từ trước:** kiểm định kỳ `R-ORD-DC1` (mức `fail`, mọi đơn xác nhận sau mốc 0112) nay dùng trần mới nên có thể báo vi phạm với đơn đã xác nhận dưới luật cũ. Đơn như vậy có thể đã tồn tại vì cổng vượt giá bán của Task 2 chỉ so dòng phạm vi MỘT dịch vụ; mức «tất cả» hoặc «nhóm» kiểu 500.000 đ/khách vẫn tạo dòng vượt thành tiền, và trước Task 2 không có kiểm nào. Đơn nào có giảm giá nằm giữa trần mới và tổng hoa hồng gốc sẽ hiện là vi phạm, và không tự hết (giảm giá bị khoá sau Xác nhận; kiểm định đọc bản chụp TỰ ĐỘNG gần nhất nên ghi tay của Kế toán không gỡ được). Chỗ đầu tiên người ta thấy là bước `audit-invariants --db remote` trong `npm run trien-khai`. Không tự thêm mốc mới và không sửa kịch bản kiểm định (đó là quyết định về bất biến và tiền, và cấm đụng production). Đề nghị: chủ chạy `node scripts/audit-invariants.mjs --db remote` (chỉ đọc) TRƯỚC khi triển khai để xem có đơn nào, hoặc quyết mốc mới cho riêng luật trần mới.
- **Task 3 → Task 9, tài liệu mô tả cần sửa:** `docs/SYSTEM-DESIGN.md` dòng «Trần giảm giá theo hoa hồng (ADR-0079 điều 8, 9)» ghi «giảm giá ≤ tổng hoa hồng của đơn (dòng thiếu mức tính 0)» — nay còn thêm «và dòng có hoa hồng vượt thành tiền của dòng» (ADR-0161 Đ5); xem thêm đoạn Sổ đại lý của `docs/CHANGE-GUIDE.md`. Task 9 sửa, không sửa ở đây.
