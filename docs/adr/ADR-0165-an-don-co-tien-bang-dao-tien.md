# ADR-0165 — Ẩn đơn đã có tiền: đảo tiền rồi ẩn, báo cáo tự bớt

- **Trạng thái:** **proposed** 2026-11-04, **chưa duyệt được** tới khi đạt điều kiện ở dòng «Xây trên lỗ đang hở». Lời chủ, chọn trong hộp hỏi: *«Ẩn luôn, báo cáo tự loại ra»*, với câu hỏi nêu ví dụ đơn có khoản thu 2 triệu đồng và rủi ro đơn thật bị ẩn nhầm làm sổ thiếu tiền. Phương án đó có ghi «có thể vướng luật sổ tiền (tôi phải kiểm lại trước khi trình)»; quyết định này là kết quả kiểm lại.
- **Cửa:** một chiều về sổ tiền, vì dòng đảo là chỉ-thêm và ở lại trong sổ; việc ẩn thì hai chiều.
- **Loại:** việc lớn (tiền, dữ liệu).
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 3** ([ADR-0162](ADR-0162-ban-development-doc-lap-va-mot-lenh-len-chinh-thuc.md), [ADR-0164](ADR-0164-toan-quyen-an-du-lieu-vo-hieu-hoa-va-co-lap.md), ADR-0165). Trang ghép: `docs/superpowers/specs/2026-11-04-trang-ghep-an-du-lieu.md`.
- **Xây trên lỗ đang hở: TNV-G3** (sửa sai sau Đã giao có thể làm tiền biến khỏi sổ), **TNV-G4** (đảo sai thứ tự có thể làm «đã thu» âm), **TNV-G1** (đơn huỷ còn tiền đã thu), **HC-4.2** (mục điều chỉnh sổ tiền chưa được đóng ở `docs/quyen-hoan.json`). Theo `CLAUDE.md` §3, quyết định này không được duyệt trước khi từng lỗ được sửa, hoặc chủ chọn «Cho phép, có ghi lý do» cho từng mã.
- **Thay một câu:** ADR-0088 đ3 («Đảo đơn lẻ một lần thu trên đơn đã Đã giao bị chặn») thêm một ngoại lệ có tên duy nhất là lệnh ẩn đơn ở Đ3 dưới đây. Không sửa thân ADR-0088.
- **Áp luật:** Hiến chương hệ thống 4.2 (số dư là cộng dồn các dòng), 4.2a và 5.5 (sửa sai bằng dòng đảo), 5.14 (kỳ đã khoá); Phần I 4.2; Hiến pháp N5 («chỉ tiến tới bằng một thay đổi mới»).

## Vì sao không lọc báo cáo

Lọc đơn ẩn khỏi báo cáo sẽ làm số dư thành tổng của các dòng do người chọn, trái Hiến chương hệ thống 4.2. Nó còn làm tháng đã khoá đổi số âm thầm (5.14), và sổ với báo cáo sẽ ra hai số dư khác nhau cho cùng một đối tác (Hiến pháp N7). **Lựa chọn của người soạn:** đạt đúng kết quả chủ muốn bằng dòng đảo, là đường Hiến pháp cho phép. Không báo cáo nào phải sửa, vì con số tự giảm theo đúng sổ.

## Đ1 — Khi bấm Ẩn một đơn có tiền

Trong **một lô**, theo đúng thứ tự để không làm số âm: máy ghi dòng đảo cho mọi khoản thu và dòng công nợ, kể cả hoa hồng, còn hiệu lực của đơn, ngày phát sinh là hôm nay, lý do «Ẩn đơn: <lý do>»; rồi ẩn đơn theo ADR-0164. Toàn quyền chỉ bấm một lần, vì lệnh đảo một dòng gốc không cần người thứ hai duyệt (ADR-0115 điều 3).

## Đ2 — Báo cáo thay đổi thế nào

Đơn có khoản thu 2 triệu đồng thu trong **tháng đang mở**: bấm Ẩn thì báo cáo tháng này giảm 2 triệu. Đơn thu trong **tháng đã khoá sổ**: báo cáo tháng đó giữ nguyên 2 triệu, còn dòng đảo nằm ở tháng đang mở, nên tháng đang mở giảm 2 triệu.

## Đ3 — Đơn đã giao

Hôm nay không đảo riêng lẻ được khoản thu của đơn đã giao. Lệnh ẩn được đảo cả đơn trong một lô, và chỉ lệnh này (ngoại lệ có tên của ADR-0088 đ3).

## Đ4 — Tiền đã ra khỏi công ty thì chưa ẩn được

Đơn đã có **khoản hoàn cho khách** hoặc đã **quyết toán với đối tác** bị từ chối, kèm câu nói rõ lý do (đề xuất của người soạn). Tiền đó đã thật sự đi ra ngoài, một dòng đảo trong sổ không làm nó quay về, và sổ sẽ nói sai sự thật.

## Đ5 — Hiện lại đơn có tiền

Máy ghi **dòng mới** cùng số tiền, ngày hôm nay, trỏ về dòng gốc, rồi hiện đơn. Không đảo của đảo, vì cơ sở dữ liệu cấm. Vậy một lần ẩn rồi hiện lại để lại trong sổ hai cặp dòng, tổng bằng 0 ngoài số gốc.

## Đ6 — Ai thấy gì

- **Kế toán** thấy dòng đảo trong sổ: số tiền, ngày, người làm, lý do, và «Đơn đã ẩn» thay cho nội dung đơn. Nhờ vậy, số giảm luôn có lời giải thích. Chỉ Toàn quyền mở được đơn đó.
- **Đối tác** nhận tin số dư đổi theo luật đang có (ADR-0092 Đ5d, ADR-0115), không kèm mã đơn; chủ đang cân nhắc giữ hay bỏ tin này thì quyết định đó áp ở đây.
- **Người thu tiền** thấy số «chưa nộp về công ty» giảm theo.

## Hệ quả chủ cần biết

- **Ẩn nhầm đơn thật làm số trong sổ giảm thật.** Ví dụ một nhân viên thật sự đang giữ 2 triệu tiền mặt: sau khi ẩn, sổ không còn đòi người đó nộp 2 triệu nữa, cho tới khi hiện lại. Dấu vết nằm ở dòng đảo và lý do, nhưng không có người thứ hai chặn trước.
- **Sổ sẽ có thêm các dòng đảo**, nên không «sạch» như lúc chưa có gì. Muốn sổ sạch hẳn thì chỉ có xoá, đang tạm gác.
- **Chưa kiểm:** nghĩa vụ kế toán và thuế với khoản thu đã xuất hoá đơn hay biên nhận đã gửi khách. Cần kế toán xác nhận trước khi dùng trên đơn thật.

## Tiêu chí nghiệm thu

1. Sổ vàng thêm ca: ẩn đơn có khoản thu ở tháng đang mở, số báo cáo giảm đúng số đó, `R-BIL` đạt; Kế toán hoặc chủ xác nhận ca này.
2. Đơn có khoản thu ở tháng đã khoá: báo cáo tháng đó không đổi một đồng, dòng đảo nằm ở tháng đang mở.
3. Đơn đã giao ẩn được bằng lệnh ẩn; đảo riêng lẻ ở route cũ vẫn bị chặn như trước.
4. Đơn đã có khoản hoàn hoặc đã quyết toán bị từ chối, không dòng nào được ghi.
5. Một câu trong lô hỏng thì không dòng đảo nào được ghi và đơn không bị ẩn.
6. Ẩn rồi hiện lại: tổng phải thu, đã thu, số dư đối tác về đúng số trước khi ẩn; `audit-invariants` đạt.
