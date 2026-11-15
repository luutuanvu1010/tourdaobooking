# ADR-0165 — Ẩn đơn đã có tiền: đơn biến mất, Sổ công nợ giữ nguyên

- **Trạng thái:** **accepted** 2026-11-04 — chủ dự án chọn ở hộp bước tiếp theo, câu «Bạn duyệt quyết định nào trước?», nguyên văn: *«Duyệt cả ba»* (cùng ADR-0162, ADR-0164), theo ba câu duyệt ở trang ghép. Lời chủ trước đó, chọn trong hộp hỏi: trước hết *«Ẩn luôn, báo cáo tự loại ra»*; sau khi được báo cách tự đảo tiền không đạt kiểm tra và Nền tảng chưa có báo cáo doanh thu theo tháng, chủ chọn *«Đơn biến mất, sổ giữ nguyên»*.
- **Cửa:** hai chiều. Không dòng sổ nào được ghi, hiện lại là về nguyên trạng.
- **Loại:** việc lớn (tiền, dữ liệu).
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 3** ([ADR-0162](ADR-0162-ban-development-doc-lap-va-mot-lenh-len-chinh-thuc.md), [ADR-0164](ADR-0164-toan-quyen-an-du-lieu-vo-hieu-hoa-va-co-lap.md), ADR-0165). Trang ghép: `docs/superpowers/specs/2026-11-04-trang-ghep-an-du-lieu.md`.
- **Xây trên lỗ đang hở: TNV-G1, TNV-G3, TNV-G4, HC-4.2.** Quyết định này không thêm dòng sổ nào nên không làm các lỗi đó nặng thêm, nhưng nó chạm vùng sổ tiền và có thể che triệu chứng, ví dụ ẩn một đơn đang lệch tiền. Theo `CLAUDE.md` §3, khi duyệt chủ phải chọn «Cho phép, có ghi lý do» cho bốn mã này. Câu duyệt 3 ở trang ghép ghi kèm việc đó, và ngay trước lời duyệt chủ được báo bằng lời thường rằng phần này chạm vùng sổ tiền còn bốn lỗi đang mở. Chủ không gõ lại cụm trên; người soạn hiểu *«Duyệt cả ba»* đã gồm nó, ghi ở `docs/quyen-hoan.json` (trường `xay_tren_cho_phep`) và báo lại chủ. Hạn của bốn mã giữ nguyên.
- **Áp luật:** Hiến chương hệ thống 4.2 (số dư là cộng dồn các dòng), 4.2a và 5.5 (sửa sai bằng dòng đảo), 5.14 (khoá kỳ); Hiến pháp N5 và N7. Sổ không bị sửa, không bị lọc, nên không lệch điều nào.

## Hai cách đã bỏ

- **Lọc đơn ẩn khỏi Sổ công nợ:** số dư thành tổng của các dòng do người chọn (trái 4.2), tháng đã khoá có thể đổi số, và người đang giữ tiền không còn bị đòi.
- **Máy tự đảo tiền rồi ẩn:** trái quyết định 19/10 của chủ (dòng hoa hồng, giá vốn, giảm giá phải có người thứ hai duyệt); đơn đã giao không có đường đảo và kiểm dữ liệu `R-BIL-1` sẽ báo lỗi; hiện lại không làm được nếu không có migration mới.

## Đ1 — Đơn có tiền ẩn được

Quyết định này bỏ điều kiện «mọi khoản tiền của đơn về 0» ở ADR-0164 Đ2, kể cả với đơn đã giao. Các điều kiện còn lại giữ nguyên: không còn khách trên chuyến chưa kết thúc, không còn vé đã cấp chưa đóng.

## Đ2 — Số nào đổi, số nào không

Luật chia theo nguồn đọc: **số tính từ đơn thì lọc, số tính từ sổ thì giữ.** Nền tảng chưa có báo cáo doanh thu theo tháng. Khi thi công phải rà lại đủ mọi nơi hiện tiền theo luật này; bảng dưới là các nơi đã đối chiếu với mã.

| Con số | Sau khi ẩn |
|---|---|
| Giá trị, đã thu, còn lại, biên nhận của đơn; số tiền trong danh sách đơn | đi theo đơn, chỉ Toàn quyền còn xem được |
| «Doanh thu của tôi», «Còn thiếu tiền» ở Trang chủ, các số đếm đơn | **không còn tính đơn này** |
| Sổ công nợ, số dư từng bên, sổ của Đối tác | **không đổi** |
| Khoản chờ xác nhận, yêu cầu điều chỉnh, phân định trách nhiệm | **giữ nguyên**, ghi «Đơn đã ẩn» |
| Sổ cọc: đơn huỷ còn giữ cọc, hạn hoàn tiền | **giữ nguyên**, ghi «Đơn đã ẩn», vì nghĩa vụ hoàn cọc không được biến mất (đề xuất của người soạn) |
| Bảng kiểm khoá tháng, tháng đã khoá | **không đổi** |
| Kiểm dữ liệu `audit-invariants` | quét đủ, kể cả đơn đã ẩn |

Ví dụ đơn có khoản thu 2 triệu do nhân viên đang giữ: bấm Ẩn thì đơn biến mất, doanh thu của người lập đơn giảm theo giá trị đơn, ô «Còn thiếu tiền» không còn tính đơn này, nhưng sổ vẫn đòi nhân viên đó nộp 2 triệu. Khoản do Công ty nhận hoặc chuyển khoản thì không sinh dòng nợ, nên sổ không có gì để đòi.

## Đ3 — Sổ vẫn làm việc bình thường

- Trên Sổ công nợ, dòng của đơn đã ẩn hiện «Đơn đã ẩn» thay cho tên, bấm vào thì có câu giải thích. Nhân viên nội bộ thấy kèm mã đơn để còn hỏi Toàn quyền; Đối tác và Tài xế đối tác không nhận được mã đơn lẫn mã nội bộ của đơn, kể cả trong dữ liệu máy chủ trả về (đề xuất của người soạn).
- **Mọi lệnh sổ tiền vẫn chạy theo đúng luật hiện hành, trừ ghi khoản thu mới của khách:** nộp, quyết toán, hoàn khách, đảo, điều chỉnh, xác nhận công ty đã nhận, phân định, các lệnh cọc. Trigger của ADR-0164 miễn cho các lệnh này, vì đó là tiền giữa các bên chứ không phải thao tác trên đơn.
- Các lệnh đó tra đơn qua view trạng thái và chủ đơn, nên các view này **không được lọc** (ADR-0164 Đ4); lọc thì Kế toán nhận «Không tìm thấy đơn» và tiền bị kẹt.

## Đ4 — Không phát sinh gì thêm

Lệnh ẩn không gửi tin, không ghi vào sổ. Số dư không đổi nên không có tin «số dư của bạn đổi». Hiện lại đơn là mọi số về như cũ.

## Hệ quả chủ cần biết

- **Đối tác vẫn thấy số dư gồm cả hoa hồng của đơn đã ẩn.** Muốn bớt thì Kế toán dùng yêu cầu điều chỉnh có người thứ hai duyệt (ADR-0115). Với đơn thử có tiền, phần dọn sổ này vẫn là việc tay.
- **Sổ công nợ vẫn còn dòng «Đơn đã ẩn»**, nên không sạch hoàn toàn; chỉ danh sách đơn là sạch.
- **Trang chủ và sổ có thể nói hai số khác nhau một cách có chủ ý:** «Còn thiếu tiền» giảm trong khi sổ vẫn đòi. Đó là hệ quả của luật ở Đ2, không phải lỗi.
- **Ẩn đơn đang lệch tiền có thể che lỗi trên màn hình**, nhưng kiểm dữ liệu vẫn báo.
- **Ẩn đơn thật làm chết đường dẫn biên nhận đã gửi khách**, kể cả khách đã trả tiền, cho tới khi hiện lại.

## Tiêu chí nghiệm thu

1. Ẩn đơn có tiền: mọi bảng `bil_*` có đúng số dòng như trước; số dư từ `v_bil_party_balance` giống hệt.
2. `audit-invariants` đạt trước và sau khi ẩn, kể cả với đơn đã giao.
3. «Doanh thu của tôi» và số đếm giảm đúng đơn đó; hai con số khớp với danh sách đơn sau khi lọc.
4. Kế toán nộp, quyết toán, đảo được dòng của đơn đã ẩn; ghi khoản thu mới của khách vào đơn đó bị từ chối ở cơ sở dữ liệu (quan sát chặn thật, ghi sổ hàng rào).
5. Ẩn rồi hiện lại: mọi con số như cũ.
6. Đối tác thấy «Đơn đã ẩn», dữ liệu máy chủ trả về không có mã đơn lẫn mã nội bộ của đơn, và không mở được đơn.
7. Đơn huỷ còn giữ cọc sau khi ẩn vẫn hiện ở sổ cọc với hạn hoàn tiền đúng.
