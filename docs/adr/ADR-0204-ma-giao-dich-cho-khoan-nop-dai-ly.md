# ADR-0204 — Khoản nộp của đại lý phải gắn mã giao dịch ngân hàng khi xác nhận

- **Trạng thái:** **accepted** 2026-11-15 — chủ dự án, nguyên văn: *«Duyệt cả hai»* (nút ở khung bước tiếp theo, trả lời câu «Bạn duyệt ADR-0204, ADR-0205 và ba câu chữ mới chứ?», sau khi có trang ghép `docs/superpowers/specs/2026-11-15-trang-ghep-adr-0204-0205.md` và ảnh thật ba màn). Trước đó, **đề xuất** 2026-11-14. Chủ đã ra lệnh thi công, nguyên văn: *«Làm Đợt 1»* (nút ở khung bước tiếp theo, trả lời câu «Bạn có cho làm ngay Đợt 1 (năm việc sửa nhỏ chặn sai tiền, sai vé) không?»). Lệnh thi công chưa phải lời duyệt văn bản này; mã đã làm trên nhánh, chưa nhập bản chính.
- **Loại:** việc lớn (tiền, dữ liệu: thêm một bảng; hợp đồng: thân lệnh xác nhận khoản nộp có thêm hai trường bắt buộc). **Cửa:** hai chiều về mã; bảng mới chỉ ghi thêm nên dữ liệu đã ghi thì giữ.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 2** (Đ1, Đ2). Không đổi ô quyền nào, không đổi ai được làm gì.
- **Xây trên lỗi an toàn chưa sửa:** không.
- **Quan hệ với ADR cũ:** bổ sung ADR-0182 phần B (khoản nộp đại lý) và mở rộng ADR-0092 Đ6 cùng ADR-0108 (mã giao dịch của khoản «Công ty thu») sang khoản nộp. Giữ ADR-0115 (điều chỉnh có người thứ hai duyệt): Đ2 đưa việc sửa khoản nộp đã xác nhận về đúng đường đó.
- **Nguồn:** kiểm toán 14/11/2026, phát hiện T1 và T2 (`docs/superpowers/specs/2026-11-14-kiem-toan-tien-ve-du-lieu-va-ke-hoach.md`).

## Bối cảnh

Khoản «Công ty thu» bằng chuyển khoản đã buộc có mã giao dịch ngân hàng và số tiền thực chuyển, và cơ sở dữ liệu không cho tổng các khoản gắn cùng một mã vượt số thực chuyển. Khoản nộp của đại lý (làm ngày 13/11) chưa có lớp này. Hệ quả: đại lý chuyển một lần 5 triệu, gửi cùng ảnh biên lai cho hai đơn, Kế toán xác nhận cả hai thì sổ ghi công ty đã nhận 10 triệu. Ngoài ra Kế toán huỷ lẻ được dòng sổ của một khoản nộp đã xác nhận, lúc đó sổ đảo lại mà khoản nộp vẫn ghi «đã xác nhận», và bộ soát số liệu không có luật nào bắt.

## Đ1 — Xác nhận khoản nộp phải kèm mã giao dịch và số tiền thực chuyển

1. Thêm bảng chỉ ghi thêm `bil_remittance_bank_txn` (migration 0166): mỗi khoản nộp tối đa một mã, cùng khuôn với `bil_receipt_bank_txn`.
2. Lệnh xác nhận khoản nộp nhận thêm `maGiaoDich` và `soThucChuyen`, cả hai bắt buộc. Thiếu thì 400, khoản vẫn chờ. Hai ô trên màn hình dùng đúng nhãn đang có của khoản «Công ty thu».
3. Một mã giao dịch là **một** lần chuyển tiền, dù được ghi ở bảng nào. Cơ sở dữ liệu chặn hai điều, tính chung khoản «Công ty thu» còn hiệu lực và khoản nộp chưa bị từ chối: cùng mã mà số thực chuyển khác nhau; tổng các khoản gắn cùng mã vượt số thực chuyển.
4. Một lần chuyển cho nhiều đơn vẫn hợp lệ, miễn tổng không vượt.
5. Khoản nộp chuyển sang «đã xác nhận» mà chưa có dòng mã thì cơ sở dữ liệu từ chối. Khoản đã xác nhận trước migration không bị đòi bổ sung (mốc `R-BIL-NP`).
6. Ảnh biên lai trùng ảnh của một khoản nộp hoặc khoản thu khác: người xác nhận thấy một dòng cảnh báo, máy không chặn. Dấu băm của ảnh không ra khỏi máy chủ.
7. Hai luật soát mới: R-BIL-NP1 (khoản nộp đã xác nhận phải còn dòng sổ có hiệu lực đúng số tiền), R-BIL-NP2 (khoản nộp xác nhận từ mốc phải có mã).

## Đ2 — Dòng sổ của khoản nộp đã xác nhận không huỷ lẻ được

Lệnh huỷ dòng sổ từ chối (409) dòng thuộc phiếu của một khoản nộp đã xác nhận, và cơ sở dữ liệu chặn thêm một lớp. Sửa khoản nộp ghi nhầm đi qua yêu cầu điều chỉnh có người thứ hai duyệt. Người kiểm độc lập đã lần mọi nơi sinh dòng đảo và không thấy nghiệp vụ hợp lệ nào khác cần đảo dòng này.

## Ngoài phạm vi, ghi nợ

- Lệnh Kế toán ghi «Nộp / trả» bằng tay chưa bắt mã, vì lệnh đó không có ô hình thức (tiền mặt hay chuyển khoản).
- Trùng mã cùng đơn giữa khoản nộp và khoản «Công ty thu» mới chặn ở máy chủ, chưa có lớp cơ sở dữ liệu.
- Nhập sao kê và khớp tự động: đợt sau.

## Hệ quả

- Kế toán phải gõ thêm hai ô khi xác nhận khoản nộp.
- Trình duyệt còn giữ bản giao diện cũ sẽ nhận lỗi «thiếu mã» khi xác nhận, cho tới khi tải bản mới; giao diện và máy chủ phải phát hành cùng lúc.
- Hàng rào ghi ở `docs/SO-HANG-RAO.md`; những dòng chưa có ngày quan sát chặn thật được coi là lời khuyên.
