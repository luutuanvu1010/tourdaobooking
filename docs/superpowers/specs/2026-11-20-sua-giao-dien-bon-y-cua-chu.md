# Đặc tả ngắn — sửa giao diện theo bốn ý của chủ (H1–H4)

> Ngày 20/11/2026. Trạng thái: **chờ chủ duyệt ảnh đề xuất**; chưa sửa mã sản phẩm. Nguồn: mục H của `2026-11-20-danh-gia-lai-giao-dien/PHAT-HIEN.md` (bốn ảnh chủ khoanh đỏ, ba câu chủ trả lời). Ảnh «hiện tại / đề xuất» để ngoài kho (`~/tourdao-sua-giao-dien-2026-11-20/gui-chu/`), chụp trên máy thử, dữ liệu giả.

> **Chủ duyệt 20/11/2026, nguyên văn «duyệt»** sau khi xem chín ảnh và ba câu hỏi ở mục 5, tức chọn cả ba khuyến nghị: (1) H2 làm **phương án nhẹ** (đối tác còn «Đón / Không đón», một ô «Nơi đón», ghi chú); (2) «Nhập khoản thu» áp cho **mọi vai**; (3) nút thứ hai viết đủ «Thanh toán đơn này cho công ty Tour Đảo», nút gập tên «Cách tính giảm giá và đặt cọc». H2 phương án nhẹ ẩn ô «Nơi trả» và «Thêm chiều về» khỏi form đối tác: **chủ đổi một phần ADR-0154 Đ1.1 ở mức giao diện**; luật máy chủ, dữ liệu không đổi. Luật an toàn của phương án nhẹ: chỉ thu gọn khi dịch vụ có đúng một lượt chiều đi, cùng ngày đi, không có chi tiết xe riêng; nháp cũ có nhiều lượt hay chiều về thì hiện đủ như trước để không giấu dữ liệu đang có.

> **Lệch so với lời duyệt, ghi lúc thi công 20/11:** nút gập ở H1 mang tên thứ hai đã nêu ở câu 3, «Giải thích giảm giá, đặt cọc», không phải «Cách tính giảm giá và đặt cọc»: chữ «Cách tính» đã bị chủ loại khỏi giao diện từ trước (bảng từ `src/shared/bang-tu-giao-dien.ts`, ADR-0130), bài canh từ ngữ báo đỏ. Nhãn nhật ký của việc ghi thu cũng đổi thành «Nhập khoản thu» cho một việc một tên. Một ngoại lệ của việc gập: đối tác không được hưởng hoa hồng thì ô giảm giá bị khoá, và câu «Chỉ giảm được trên đơn bạn hưởng hoa hồng.» là lý do khoá nên vẫn hiện ngay dưới ô, không gập.

## 1. Việc gì, cho ai, vì sao
Đối tác lập đơn và xem đơn còn thấy nhiều thứ họ không cần, và nút tiền nằm xa con số nó xử lý. Văn phòng xem kho vé thì danh sách dài không lọc được. Chủ đã chỉ bốn chỗ sửa trên ảnh bản chạy thật.

## 2. Xong khi
- **H1** — Đối tác mở Tạo đơn (máy tính 1280 và điện thoại 390): không còn chữ tiêu đề «Thanh toán»; không còn khối «Người phụ trách»; đối tác được bật Trả sau thấy khối «Hình thức thanh toán» ngay trên nút «Gửi đơn» (điện thoại: cuối trang, ngay trước thanh nút gửi); ba câu giải thích dưới ô giảm giá và đặt cọc nằm sau một nút gập, bấm thì hiện đủ ba câu như cũ. Lưu bị từ chối vì giảm giá hay đặt cọc thì nút gập tự mở. Bán hàng, Thực tập, Quản trị mở Tạo đơn: không đổi gì.
- **H2** — **DỪNG, chưa làm** (xem mục 5 câu 1).
- **H3** — Đối tác mở đơn đã xác nhận 740.000 ₫, chưa thu: nút «Nhập khoản thu» nằm ngay dưới dòng «Còn lại 740.000 ₫»; nút «Thanh toán đơn này cho cty Tour Đảo» nằm cuối khối «Hoa hồng của bạn», dưới «Tổng giá đại lý 651.200 ₫». Bấm hai nút mở đúng form và phiếu như trước, mọi số tiền không đổi. Đơn không có khối «Hoa hồng của bạn» thì nút thứ hai ở lại khối Thanh toán. Màn rộng 900–1179: trang đơn xếp một cột, số tiền và số điện thoại không còn vỡ giữa chừng («740.0 / 00 ₫»).
- **H4** — Người quản kho mở Kho vé: trên danh sách «Số vé còn» có ô «Tìm theo tên sản phẩm» và bốn nút «Tất cả», «Hết vé», «Còn 1 đến 5», «Còn trên 5» (kèm số dòng); gõ hoặc bấm là danh sách lọc ngay, không tải lại.
- `npm test`, `npm run typecheck` xanh; bảng tham chiếu khớp tên nút mới.

## 3. Không làm lần này
Không đổi quyền, dữ liệu, số tiền, hợp đồng API. Không đổi khối «Người phụ trách» ở trang Chi tiết đơn. Không đổi ba tên họ hàng «Ghi khoản thu này», «Ghi khoản thu đòi được», «Ghi khoản thu và huỷ phần này».

## 4. Loại việc
- [x] Việc lớn (chạm chỗ hiển thị tiền) ⇒ có người kiểm độc lập và trợ lý đánh giá giao diện chấm lại.
- H1, H3, H4 không cần ADR. H2 cần ADR nếu chủ giữ ý ẩn hẳn.

## 5. Câu hỏi cho chủ
1. **H2 làm theo hướng nào?** Đã tra mã: lượt đón **bắt buộc có nơi đón** ở cả ba lớp (trình duyệt báo «Lượt 1: chưa có nơi đón», máy chủ trả lỗi lúc lưu, cơ sở dữ liệu có ràng buộc từ ADR-0047); văn phòng chỉ sửa được nơi đón **sau khi** xác nhận đơn; ADR-0154 Đ1.1 đã duyệt «khối Đưa đón của đối tác còn Nơi đón, Nơi trả». Phí đưa đón đúng là không phụ thuộc nơi đón (ADR-0214), nhưng phụ thuộc số lượt. Ba hướng:
   - **(Khuyến nghị) Phương án nhẹ, làm ngay, không đổi luật:** đối tác chỉ còn «Đón / Không đón», **một ô «Nơi đón»** và ô ghi chú; ẩn Nơi trả, «Đón khác ngày», «Thêm chi tiết», «Thêm chiều về», «Thêm lượt», «Bỏ lượt». Lý do: xe vẫn cần biết đón ở đâu, và chỉ đối tác biết.
   - Ẩn hẳn như ảnh của chủ: phải đổi luật dữ liệu (cho nơi đón trống), thêm chỗ để văn phòng điền nơi đón lúc «Còn vé», sửa Vận chuyển và biên nhận cho trường hợp chưa có nơi đón ⇒ cần ADR mới thay một phần ADR-0047 và ADR-0154 Đ1.1; là việc riêng, vài ngày.
   - Giữ nguyên như hiện tại.
2. **«Nhập khoản thu» áp cho ai?** Nút «Ghi khoản thu» là một nút dùng chung cho Bán hàng, Kế toán, Hướng dẫn viên và Đối tác. **Khuyến nghị: đổi cho mọi vai** (luật «mỗi việc một tên»; kèm sửa ba bài hướng dẫn và bảng tham chiếu). Chỉ đổi cho Đối tác thì cùng một việc có hai tên.
3. **Hai chữ còn lại:** nút thứ hai viết «cty» đúng lời chủ hay viết đủ «công ty» (**khuyến nghị viết đủ**, giao diện chưa có chỗ nào viết tắt); nút gập ở H1 tên «Cách tính giảm giá và đặt cọc» (**khuyến nghị**) hay «Giải thích giảm giá, đặt cọc».

## 6. Điều AI tự quyết (chủ bác được)
- H1: tiêu đề «Thanh toán» chỉ ẩn với mắt, trình đọc màn hình vẫn đọc tên khối. Ẩn «Người phụ trách» chỉ ở Tạo đơn của tài khoản Đối tác; quyền mời Bán hàng ở máy chủ giữ nguyên. **Đây là chủ đổi một phần ADR-0142 mục (b) («Đối tác mời được một Bán hàng lúc lập») ngày 20/11/2026, ở mức giao diện**; đơn của đối tác vào thẳng «Chờ Bán hàng nhận». Thực tập giữ khối này.
- H3: sửa chỗ chật bằng cách xếp một cột khi màn 900–1179. Không tái hiện được chữ đè hẳn lên nhau như ảnh thứ ba của chủ trên mã hiện tại (đã thử 940–1180); chỉ thấy chữ và số bị vỡ dòng.
- H4: ngưỡng «1 đến 5» và «trên 5»; dùng ô tìm thay cho danh sách chọn sản phẩm (kho thật có hàng chục dòng).

## 6b. Sau kiểm độc lập (20/11)
- Người kiểm độc lập kết luận «đạt có điều kiện», một lỗi Nặng: luật thu gọn H2 giấu cả nơi trả đối tác tự gõ trong nháp cũ. **Đã sửa:** chỉ thu gọn khi nơi trả trống hoặc còn là gợi ý của dịch vụ; thêm ca kiểm.
- Hai hệ quả của H1 mà mục 6 chưa nói, chủ cần biết: (1) nháp cũ của đối tác đã có lời mời Bán hàng thì lời mời được giữ, nhưng đối tác không còn thấy hay gỡ được trên form; (2) tài khoản lai Bán hàng + Đối tác cũng dùng form gọn nên cũng không còn khối «Người phụ trách» ở Tạo đơn.
- Đặt cọc vượt tổng bị máy chủ từ chối bằng mã 409 nên nút gập không tự mở (trình duyệt đã chặn ca này từ trước, câu lỗi vẫn hiện). Giảm giá vượt trần (400) thì nút gập tự mở.
- Bằng chứng trình duyệt của H1–H4 là ảnh chụp thật trên máy thử và lượt chấm của trợ lý đánh giá giao diện (ảnh ngoài kho); chưa có kịch bản Chrome tự động mới cho H2, H3, H4. Kịch bản `ban-hang-phu-trach-smoke.mjs` và `kenh-thu-smoke.mjs` hỏng ở bước dựng môi trường (lỗi có từ trước, ADR-0185) nên không chạy được.
- Trợ lý đánh giá giao diện: không có phát hiện Chặn việc hay Nặng do đợt này. Điểm nhỏ mới: lọc Kho vé ra rỗng chưa có lối «bỏ lọc» (để sau). Điểm có từ trước còn nguyên: «Tổng cộng» và «Còn lại» cùng tô đỏ (G3); hai nút chọn tròn của «Hình thức thanh toán» nhỏ hơn 44 px trên điện thoại.

## 7. Điều đã tra
- H1: `public/order-form.html` (khối `pay-card`, `tra-sau-khoi`, `ban-hang-card`), `web/order-form.ts` (`napTraSau`, `renderBanHang`, câu `discount-hint`), khối gập dùng chung `web/khoi-gap.ts`. Kịch bản Chrome chạm phần này: `tra-sau-smoke`, `dat-coc-smoke`, `ban-hang-phu-trach-smoke`.
- H2: `src/shared/chang-dua-don.ts` (`kiemChang`), `src/shared/chang-form.ts` (`loiChang`), `migrations/0034_chang_dua_don.sql` (ràng buộc nơi đón), `src/modules/orders/xac-nhan-route.ts`, `src/shared/permissions.ts` (`order.trip.edit`: Đối tác không có), ADR-0047, ADR-0134, ADR-0154, ADR-0214.
- H3: `web/order.ts` (`nutGhiThu`, `nutCongNo`), `web/phan-doi-tac.ts`, bảng tham chiếu `src/shared/bang-tham-chieu-viec.ts`, ba bài hướng dẫn có chữ «Ghi khoản thu».
- H4: `web/ve-kho.ts` (`taiKho`), kiểu dáng bộ lọc có sẵn `.loc-nhom`, `.loc-nut`.
