# Kiểm toán toàn Nền tảng sau sổ đại lý đợt 1 (2026-10-12)

> **Hồ sơ đóng băng ngày 2026-10-12**: đúng tại ngày viết, không sửa cho khớp hiện trạng. Có gì mới thì viết bản mới trỏ về bản này. Mốc kiểm: `main` = `1c471990` (bản 1.87 trên production theo `docs/HANDOFF-N1.md`).

## Kết luận

Nền tảng chạy đúng khung đã khai và hàng rào máy còn nguyên: bộ kiểm 3.799 bài, 0 đỏ, kiểm kiểu chữ sạch. Không có lỗi mức Critical, và chưa thấy chỗ nào tính sai tiền thật. Có **bốn lỗi mức High**: đều là chỗ luật đã được duyệt nhưng máy không canh hoặc máy chủ chưa thi hành, nên một thay đổi sau này có thể làm hở mà không bài nào đỏ. Tài liệu mô tả (`SYSTEM-DESIGN`, sơ đồ kiến trúc, `CHANGE-GUIDE`…) đã được sửa cho khớp mã. Tài liệu luật còn lệch nhiều chỗ, tôi chỉ đề xuất, chờ bạn duyệt.

## Bốn lỗi mức High (chưa có trong sổ hoãn `docs/quyen-hoan.json`)

| Mã | Chuyện gì, nói thường | Xử lý khuyến nghị |
|---|---|---|
| K-B-1 | ADR-0100 (bạn đã duyệt) nói Thực tập chỉ được bán giá danh mục, không giảm giá. Máy chủ chưa thi hành: người kiểm thử trên khung thử, Thực tập lập được đơn 100.000 cho dịch vụ giá 500.000, giảm thêm 50.000 rồi tự xác nhận. Đối tác làm cùng việc thì bị chặn. | Thi công đúng ADR-0100 (đỏ trước, xanh sau, có người kiểm). |
| K-A-1 | Bài kiểm câu truy vấn không phủ 17 câu truy vấn tiền của cọc đơn huỷ và thay lần thu. Người kiểm cấy thử một câu ghi bậy vào bảng đơn, bài vẫn xanh. 17 câu hiện có đều sạch. | Đưa hai tệp vào danh sách được kiểm. Việc nhỏ. |
| K-A-3 | Hoa hồng và giá vốn hiện chỉ có một hàm tính, nhưng không máy nào chặn việc ai đó viết công thức thứ hai. Cấy thử thì 0 bài đỏ (Hiến chương 5.4). | Thêm rào theo khuôn `buildlines-guard`. Việc nhỏ. |
| K-A-2 | Các ca vàng của sổ công nợ lượt 1, sổ đại lý và cọc đơn huỷ (25 ca) chưa ca nào được bạn hoặc Kế toán xác nhận, trong khi các phần này đã chạy trên production (Hiến chương 5.17). | Một buổi Kế toán xác nhận 25 ca; hoặc ghi lệch có chủ ý có hạn. |

## Trước khi làm sổ đại lý đợt 2 (mức Medium, đều liên quan tiền)

ADR-0109 (bạn duyệt 8/10, đổi cách tính phần giảm giá bên đặt chịu) chỉ nằm ở các nhánh chưa nhập, nên đợt 2 làm theo ADR-0079 cũ có thể ghi nợ đại lý quá phần giảm giá thật (K-C-01). Hai điều kiện bạn đặt ra để dựng lại môi trường thử đều đã xảy ra mà kho không có dấu nào cho thấy bạn được nhắc (K-C-04). Khoá tháng là thao tác một chiều đã chạy thật, còn cách cứu khi khoá nhầm (khôi phục cả cơ sở dữ liệu) chưa ai diễn tập, và lỗ này chưa có câu cho phép riêng (K-C-03). Bán hàng đổi được người hưởng hoa hồng của đơn đã xác nhận vì đổi bên đặt chỉ hỏi quyền sửa chuyến (K-B-3). Cơ sở dữ liệu không phát hiện tài khoản cũ giữ cùng lúc quyền nội bộ và quyền Đối tác (K-B-4). Phần còn lại là tài liệu luật cũ: mục lục ADR xếp 14 ADR đã duyệt dưới nhãn "chờ duyệt", bảng thi hành của Hiến chương sai ở khoảng 8 ô, tờ khai Kernel 18 cũ và chưa có người duyệt. Chi tiết ở các báo cáo trong `phu-luc/`.

## Lịch (tính từ 12/10)

Ngày **31/10**: năm mục mức cao trong sổ hoãn (TNV-G1, TNV-G3, TNV-G4, HC-4.2, HC-5.19) cùng hết hạn, từ **1/11** `npm test` đỏ ở mọi nhánh và cổng xanh giữ mọi phiên làm việc. Cần vá hoặc gia hạn có lý do trước ngày đó. Sau đó: 15/11 (HC-5.11), 30/11 và 31/12 (bốn ô chưa có route), 31/3/2027 (nhóm dịch vụ còn ở diện cũ). Dòng "hạn 15/10" ở Hiến chương là chữ cũ.

## Ba quyết định cần bạn

1. **Vá ba chỗ hở tiền (K-B-1, K-A-1, K-A-3) trước mọi việc mới.** Khuyến nghị: làm một lượt riêng, có người kiểm độc lập. Cách khác: ghi vào sổ hoãn kèm người chịu trách nhiệm và hạn.
2. **Sổ vàng (K-A-2).** Khuyến nghị: Kế toán xác nhận 25 ca. Cách khác: ghi lệch có chủ ý kèm hạn.
3. **Điều kiện trước đợt 2.** Khuyến nghị: chưa mở đợt 2; trước đó nhập ADR-0109 vào bản chính, trả lời câu môi trường thử, và dặn không khoá tháng nào cho tới khi diễn tập khôi phục.

Ngoài ba quyết định: bạn đọc `de-xuat-sua-luat.md` (gom theo từng tệp luật; AI không được tự sửa các tệp đó).

## Việc đã làm trong lượt này và điều chưa kiểm

Đã làm: chụp hiện trạng bằng năm trợ lý đọc mã; sửa tám tài liệu mô tả cho khớp mã (commit `09c00c05`, kèm một lượt sửa nhỏ sau kiểm); ba người kiểm độc lập đối chiếu với Hiến pháp ghim v2.3.0, Hiến chương, ADR, Kernel 18; người kiểm thứ tư đọc lại tài liệu đã sửa và tự chạy lại cả bộ kiểm (98% khẳng định mới đúng). Số 0019 của migration B5 còn ghi ba kiểu trong ba tệp luật nên tôi để nguyên, chờ bạn chọn (mục trong `de-xuat-sua-luat.md`).

Chưa kiểm: trạng thái production thật (không được dùng lệnh Cloudflare), kịch bản e2e và Chrome, hai trang HTML sơ đồ trên trình duyệt, các ADR chỉ có ở nhánh chưa nhập (chỉ đọc dòng trạng thái). Lỗ K-B-1 chỉ tái hiện trên khung thử, không phải production.

Các báo cáo gốc và phần đề xuất chi tiết nằm ở `phu-luc/`. Hồ sơ kiểm kê thô của năm trợ lý đầu không giữ lại; điều đúng của chúng đã đi vào tài liệu mô tả và được người kiểm D đối chiếu.
