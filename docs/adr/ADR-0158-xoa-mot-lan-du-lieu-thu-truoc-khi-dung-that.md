# ADR-0158 — Xoá một lần dữ liệu thử trước khi dùng thật

- **Trạng thái:** **đề xuất** 2026-11-02, chờ chủ dự án duyệt. Lời chủ trong chat, nguyên văn: *«Đóng tất cả dữ liệu cũ gồm đơn hàng, chính sách giá , cấp độ đại lý»*; rồi chọn *«Toàn bộ là đơn thử»*, *«Xóa khỏi cơ sở dữl iệu»*, *«Toàn bộ hoa hồng, nhập lại»*, *«Đóng và xóa»*, *«Xoá cả phần gắn đơn»*.
- **Loại:** việc lớn (dữ liệu, tiền, triển khai). **Cửa một chiều.** Đường quay lại duy nhất là điểm khôi phục Time Travel của D1.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 1.**
- **Xây trên lỗ đang hở:** chưa đối chiếu `docs/quyen-hoan.json` với việc này; không thêm route, không đổi quyền.
- **Quan hệ với luật:** Hiến chương 5.5 (chỉ-thêm), `CLAUDE.md` §7 (không xoá cứng) và các trigger chặn xoá **giữ nguyên hiệu lực**. Đây là một lần dọn dữ liệu thử do chủ quyết, trước khi Nền tảng dùng thật; không phải tiền lệ cho dữ liệu thật và không mở đường xoá nào trong mã.

## Bối cảnh

Dữ liệu trên production là dữ liệu thử. `docs/BACKLOG.md` mục 57 đã hẹn một lần dọn trước khi dùng thật, và chủ muốn Nền tảng bắt đầu sạch. Luật không xoá cứng được dựng cho dữ liệu nghiệp vụ thật; giữ đơn thử và sổ tiền thử sẽ làm sai mọi báo cáo về sau.

## Đ1 — Phần bị xoá

Một migration duy nhất `0135_don_du_lieu_thu.sql` xoá toàn bộ dòng của:

1. **Đơn và phần gắn đơn:** đơn, dòng dịch vụ, hành khách, lượt đưa đón, phân công, yêu cầu xác nhận, lý do huỷ, điều chỉnh tiền, điều khoản đã chụp.
2. **Sổ tiền:** các bảng `bil_*` gắn đơn, gồm phiếu thu, công nợ, bút toán, duyệt cọc, hoàn tiền, đối chiếu; kể cả dòng không gắn đơn của chính các bảng này, vì sổ không còn nghĩa khi mất một phần.
3. **Chuyến xe:** chuyến và mọi bảng con.
4. **Vé đã cấp:** phân bổ, lần giao, đường dẫn khách. Vé đang ở trạng thái đã cấp chuyển sang huỷ (`VOID`), không về kho, để vé thử không bao giờ được phát cho khách thật.
5. **Hoa hồng và cấp:** mọi mức hoa hồng, cấp độ đại lý, gán cấp theo vai và theo hồ sơ.
6. **Nhật ký:** chỉ các dòng có `order_id` và các dòng đi đôi với sự kiện chuyến (`R-VC-6` buộc hai bên có nhau). Nhật ký khác giữ nguyên.

`fbk_ticket.order_id` và `order_code` đặt về rỗng; vé hỗ trợ giữ nguyên.

## Đ2 — Phần giữ lại

Tài khoản, quyền, hồ sơ khách và đại lý, loại đối tác, danh mục dịch vụ, địa điểm, xe, tài xế, điều khoản nhà cung cấp, luật bán, cài đặt, kho vé chưa cấp, vé hỗ trợ, nhật ký không gắn đơn, kỳ đã khoá sổ.

## Đ3 — Cách làm

- Trigger chặn xoá của đúng các bảng trên bị gỡ rồi đặt lại nguyên văn trong cùng migration. Bài kiểm so toàn bộ trigger, bảng, view trước và sau: phải giống hệt.
- **Chốt chặn đơn thật:** migration tự huỷ cả lần chạy nếu số đơn hoặc số phiếu thu lớn hơn số chủ đã đếm trước khi duyệt. Có khách thật phát sinh sau lần đếm thì không xoá gì.
- Chỉ áp qua `npm run trien-khai`, có điểm khôi phục trước khi chạy, sau đó chạy `audit-invariants --db remote`.

## Hệ quả chủ cần biết

- Sau khi xoá, không còn cấp độ đại lý và mức hoa hồng: đối tác không có hoa hồng và cột Cấp độ đại lý không chọn được gì tới khi Kế toán nhập lại. **Nên nhập ngay sau lần chạy, trước khi đối tác đặt vé.**
- Migration chạy khi triển khai bản nào có nó. **Sau khi nhập vào bản chính, lần triển khai kế tiếp sẽ xoá**, dù người chạy đang triển khai việc khác.
- Điểm khôi phục chỉ giữ trong thời hạn Time Travel của D1, và khôi phục sẽ đưa **cả** cơ sở dữ liệu về lúc đó.
- Ảnh vé trên kho R2 của vé đã huỷ do việc dọn định kỳ xử lý theo luật sẵn có nếu đủ điều kiện; **chưa kiểm** ca này.
- Mã đơn đánh số lại theo ngày từ 0001. Đơn mới tạo cùng ngày xoá có thể trùng mã với đơn thử đã in hay đã gửi trước đó.
