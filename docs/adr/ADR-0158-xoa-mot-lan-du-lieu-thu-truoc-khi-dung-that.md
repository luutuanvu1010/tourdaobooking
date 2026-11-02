# ADR-0158 — Xoá một lần dữ liệu thử trước khi dùng thật

- **Trạng thái:** **đề xuất** 2026-11-02, chờ chủ dự án duyệt. Lời chủ trong chat, nguyên văn: *«Đóng tất cả dữ liệu cũ gồm đơn hàng, chính sách giá , cấp độ đại lý»*; rồi chọn *«Toàn bộ là đơn thử»*, *«Xóa khỏi cơ sở dữl iệu»*, *«Toàn bộ hoa hồng, nhập lại»*, *«Đóng và xóa»*, *«Xoá cả phần gắn đơn»*.
- **Loại:** việc lớn (dữ liệu, tiền). **Cửa một chiều.** Đường quay lại duy nhất là điểm khôi phục Time Travel của D1.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 1.**
- **Xây trên lỗ đang hở:** chưa đối chiếu `docs/quyen-hoan.json`; việc này không thêm route, không đổi quyền, không đổi mã Nền tảng.
- **Quan hệ với luật:** Hiến chương 5.5 (chỉ-thêm), `CLAUDE.md` §7 (không xoá cứng) và các trigger chặn xoá **giữ nguyên hiệu lực**. Đây là một lần dọn dữ liệu thử do chủ quyết, trước khi Nền tảng dùng thật; không phải tiền lệ cho dữ liệu thật và không mở đường xoá nào trong mã.

## Bối cảnh

Dữ liệu trên production là dữ liệu thử. `docs/BACKLOG.md` mục 57 đã hẹn một lần dọn trước khi dùng thật, và chủ muốn Nền tảng bắt đầu sạch. Luật không xoá cứng được dựng cho dữ liệu nghiệp vụ thật; giữ đơn thử và sổ tiền thử sẽ làm sai mọi báo cáo về sau.

## Đ1 — Phần bị xoá

Tệp `scripts/don-du-lieu-thu/migrations/0001_xoa_du_lieu_thu_adr_0158.sql` xoá toàn bộ dòng của:

1. **Đơn và phần gắn đơn:** đơn, dòng dịch vụ, hành khách, lượt đưa đón, phân công, yêu cầu xác nhận, lý do huỷ, điều chỉnh tiền, điều khoản đã chụp.
2. **Sổ tiền:** các bảng `bil_*` gắn đơn, gồm phiếu thu, công nợ, bút toán, duyệt cọc, hoàn tiền, đối chiếu; kể cả dòng không gắn đơn của chính các bảng này, vì sổ không còn nghĩa khi mất một phần.
3. **Chuyến xe:** chuyến và mọi bảng con.
4. **Vé đã cấp:** phân bổ, lần giao, đường dẫn khách. Vé đang cấp chuyển sang huỷ (`VOID`), không về kho, và ảnh được xoá khỏi kho sau hạn lưu. Vé đã mở ảnh được ghi dấu mở trước khi xoá phân bổ, nên không nhập lại được.
5. **Hoa hồng và cấp:** mọi mức hoa hồng, cấp độ đại lý, gán cấp theo vai và theo hồ sơ.
6. **Nhật ký:** chỉ các dòng có `order_id` và các dòng đi đôi với sự kiện chuyến (`R-VC-6` buộc hai bên có nhau). Nhật ký khác giữ nguyên, kể cả dòng về mức hoa hồng đã xoá.

Vé hỗ trợ giữ lại, chỉ bỏ liên kết và mã đơn.

## Đ2 — Phần giữ lại

Tài khoản, quyền, hồ sơ khách và đại lý, loại đối tác, danh mục dịch vụ và **giá bán dịch vụ** (`catalog_override`), **giá thuê xe** (`vc_rental_rate`), **điều khoản nhà cung cấp**, luật bán, địa điểm, xe, tài xế, cài đặt, kho vé chưa cấp, vé hỗ trợ, nhật ký không gắn đơn, **kỳ đã khoá sổ** (tháng đã khoá vẫn không ghi được).

## Đ3 — Cách làm

- **Nằm ngoài `migrations/`,** có cấu hình riêng `scripts/don-du-lieu-thu/wrangler.jsonc`. Nhờ vậy không lọt vào bộ kiểm hay lần triển khai nào, không cần nhập vào bản chính, không cần triển khai. Chỉ chạy khi chủ gõ lệnh theo `scripts/don-du-lieu-thu/README.md`.
- Trigger chặn xoá của đúng các bảng trên và trigger canh dấu mở ảnh bị gỡ rồi đặt lại nguyên văn trong cùng tệp. Bài `src/don-du-lieu-thu.test.ts` so toàn bộ trigger, bảng, view trước và sau: phải giống hệt.
- **Chốt chặn:** tệp dừng trước mọi câu xoá nếu số đơn, phiếu thu, chuyến, vé đã cấp, mức hoa hồng hay cấp lớn hơn số chủ đã đếm. Có người tạo thêm sau lần đếm thì không xoá gì, phải đếm lại.
- Chủ lấy điểm khôi phục trước khi chạy, và chạy `audit-invariants --db remote` sau khi chạy.

## Hệ quả chủ cần biết

- **Đừng tạo đơn, mức hoa hồng hay cấp từ lúc đếm đến lúc chạy.** Sau khi chạy, không còn cấp độ đại lý và mức hoa hồng: đối tác không có hoa hồng và cột Cấp độ đại lý không chọn được gì tới khi Kế toán nhập lại. Nên nhập ngay sau khi chạy, trước khi đối tác đặt vé.
- Điểm khôi phục chỉ giữ trong thời hạn Time Travel của D1, và khôi phục đưa **cả** cơ sở dữ liệu về lúc đó.
- Việc D1 trên production hoàn tác cả tệp khi hỏng giữa chừng **chưa kiểm được**; có lỗi giữa chừng thì dùng điểm khôi phục, không chạy lại.
- Mã đơn đánh số lại theo ngày từ 0001. Đơn mới tạo cùng ngày xoá có thể trùng mã với đơn thử đã in hay đã gửi trước đó.
