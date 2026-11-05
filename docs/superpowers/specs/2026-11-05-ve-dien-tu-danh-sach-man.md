# Danh sách màn của phân hệ vé điện tử (đề xuất, 2026-11-05)

**Trạng thái:** chờ chủ dự án chốt. Bổ sung cho `2026-11-05-ve-tour-dao-design.md`. Chưa có mã, chưa có bản vẽ.

## Hiện trạng đọc từ mã

Hôm nay có bốn chỗ: `/ve-kho` (nhập lô, số còn, lô đã huỷ), khối «Vé điện tử» trên đơn, trang khách `/ve/:token`, trang cài đặt trần lô `/ve-cai-dat`. **Chưa có:** nhà cung cấp theo lô (`vdt_batch` chỉ mang dịch vụ và loại khách), giá mua vé (ADR-0153 để ngoài phạm vi), số tiền, báo cáo.

## Các màn

| # | Màn | Dùng để | Ai xem | Dữ liệu | Đợt |
|---|---|---|---|---|---|
| 1 | Tổng quan vé | Tồn kho, sắp hết hạn, đơn thiếu vé; bấm vào để tới màn chi tiết. Số vé đã dùng hôm nay chỉ hiện cho người có `ve.doi-chieu.view`. Kế toán chỉ thấy vé Tour Đảo | Bán hàng, Quản lý bán hàng, Quản trị, Toàn quyền, Kế toán | Có sẵn + quét | 2 |
| 2 | Tồn kho (sửa `/ve-kho`) | Lọc theo vé do ai phát, nhóm dịch vụ, dịch vụ, loại khách, hạn dùng | Như `ve.kho.manage`; Kế toán thấy vé Tour Đảo | Có sẵn | 1 |
| 3 | Chi tiết lô | Vé trong lô: trong kho, đang giữ, đã dùng, đã huỷ; không hiện mã đủ | Như màn 2 | Có sẵn | 1 |
| 4 | Nhập lô vé hãng ngoài (đã có) | Giữ nguyên, không thêm nhà cung cấp và giá mua (chủ chốt 5/11) | Như `ve.kho.manage` | Có sẵn | Đã có |
| 5 | Tạo vé Tour Đảo | Chọn dịch vụ, số lượng, hạn, tên tiếng Anh nếu có; xem trước vé rồi tạo | Toàn quyền, Kế toán, Quản lý bán hàng, Quản trị | Mới | 1 |
| 6 | Nhà cung cấp vé | **Không làm ở phân hệ này**; chuyển sang phân hệ kế toán, làm về sau (chủ chốt 5/11) | — | — | — |
| 7 | Khối vé trên đơn (đã có) | Thêm loại vé, «Đã dùng x/y» ở đợt 1–2; chuyển sang vé đoàn ở đợt 3 | Như hiện tại | Quét | 1–3 |
| 8 | Quét vé | Camera, ba màu kết quả, bỏ lượt quét, các lượt vừa quét | Người có quyền quét | Mới | 2 |
| 9 | Tra cứu một vé | Nhập số cuối, xem vòng đời: tạo, cấp, mở, quét, huỷ. Kế toán chỉ tra được vé Tour Đảo | Quản trị, Toàn quyền, Kế toán | Có sẵn + quét | 2 |
| 10 | Đối chiếu khách thực tế | Theo ngày và dịch vụ: khách theo đơn, vé đã dùng, chênh lệch | `ve.doi-chieu.view` | Quét | 2 |
| 11 | Theo dõi người quét | Theo người, theo ngày: tính đã dùng, chỉ xem, bị từ chối, lượt đã bỏ | `ve.doi-chieu.view` | Quét | 2 |
| 12 | Doanh thu và sổ vé | Xem mục dưới | Kế toán, Toàn quyền | Tính từ đơn | 3 |
| 13 | Cài đặt vé (sửa `/ve-cai-dat`) | Trần lô, ngưỡng báo thiếu, nội dung lưu ý trên vé | Toàn quyền | Mới | 1 |
| 14 | Trang khách (đã có) | Chỉ hiện vé đã mở ở đợt 1; thêm vé đoàn ở đợt 3 | Khách | Có sẵn | 1, 3 |

Ngoài ra, màn Danh mục có thêm hai ô trên từng dịch vụ: «Có vé» và «Vé do ai phát» (Quản trị, Toàn quyền, đợt 1). Đây là hai ô trên màn có sẵn nên không tính thành màn mới. Nhà cung cấp dịch vụ vẫn đặt ở màn «Người bán dịch vụ», độc lập với hai ô này.

Phân loại không cần màn riêng: vé do ai phát, nhóm dịch vụ, dịch vụ, loại khách, trạng thái, hạn dùng là bộ lọc dùng chung cho các màn 2, 10, 12. Menu đề xuất: một nhóm «Vé điện tử», ai không có quyền thì không thấy mục đó. Hướng dẫn viên và Tài xế công ty chỉ thấy «Quét vé».

## Tiền: nên và không nên

Vé không mang giá, vì giá thuộc từng đơn. Số tiền ở màn 12 **tính từ dòng dịch vụ của đơn**, nên dùng lại một nguồn tiền, không tạo sổ thứ hai.

- **Bán ra:** tiền của các dòng dịch vụ có vé, trên đơn đã xác nhận.
- **Đã thực hiện:** phần tương ứng với vé đã dùng. **Chưa thực hiện:** phần còn lại. Đây là số tham khảo cho kế toán, không phải bút toán.
- **Vốn mua vé, chênh lệch:** không có ở đây, thuộc phân hệ kế toán làm về sau (chủ chốt 5/11).
- **Sổ vé:** đã tạo = trong kho + đã cấp chưa mở + đã mở chưa dùng + đã dùng + đã huỷ; mỗi vé thuộc đúng một ô.

Vẫn giữ lựa chọn của chủ dự án 5/11: số vé đã dùng **không** tự đổi tiền, hoa hồng hay sổ công nợ. Các màn này chỉ đọc.

## Cần chủ dự án quyết

1. **Tiền «đã thực hiện» tính theo mốc nào:** vé đã dùng (khuyến nghị, đúng bản chất cam kết đã thực hiện), hay bước «Xong và đủ tiền». Kế toán nên xác nhận, vì hai mốc có thể lệch ngày.

Đề xuất làm màn 12 sau cùng, vì cần lời xác nhận của kế toán.
