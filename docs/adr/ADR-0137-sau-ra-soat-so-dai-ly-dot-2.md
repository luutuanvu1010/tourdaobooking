# ADR-0137 — Sau rà soát Sổ đại lý đợt 2: không có tài khoản lai Kế toán + Đối tác; ghi lại ba chỗ mã chặt hơn hoặc khác chữ ADR cũ

- **Trạng thái:** **đề xuất** — chờ chủ dự án duyệt. Mọi điều dưới đây chủ đã trả lời bằng lời trong chat 23–24/10/2026 (điểm 1 *«Không thể có tài khoản nào đó lai giữa Kế toán và đối tác, nó đi ngược lại nguyên tắc tách biệt hồ sơ và vai trò của hệ thống, cũng phi thực tế»*; điểm 6 *«Duyệt khuyến nghị»*); ADR này chỉ chép lại thành văn bản để mã và ADR cũ hết lệch nhau.
- **Số:** số tạm 0137 (0136 đã được giữ cho bước xác nhận đơn, xem ADR-0135). Kiểm lại số lúc duyệt.
- **Ngày:** 2026-10-24.
- **Loại:** việc lớn (quyền, tiền). **Cửa:** hai chiều — chỉ ghi lại hiện trạng mã và nguyên tắc; không migration, không đổi giá trị ô nào của bản đồ quyền.
- **Quan hệ với ADR cũ:** làm rõ ADR-0081 điều 1 (đoạn tài khoản lai), ADR-0079 (mục bất biến `R-BIL-2`, điều 5 về tiền tố lỗi), ADR-0115 điều 5 (đảo dòng sổ). Không sửa chữ của các ADR đó.
- **Xây trên lỗ đang hở:** không.

## Bối cảnh
Lượt kiểm toàn nhánh Sổ đại lý đợt 2 (19/10) và lượt rà soát với chủ (23–24/10) tìm ra ba chỗ mã đã đi khác chữ ADR cũ, cộng một câu hỏi nguyên tắc (có tài khoản lai Kế toán + Đối tác hay không). Mã ở cả ba chỗ đều *chặt hơn hoặc vô hại hơn* chữ ADR, nhưng theo CLAUDE.md §2 lệch giữa tài liệu chuẩn tắc và mã phải được chủ biết và ghi lại, không để mã tự đúng.

## Quyết định
1. **Đ1 — Không có tài khoản lai Kế toán + Đối tác.** Một tài khoản giữ quyền bên ngoài (Đối tác, Tài xế đối tác) không giữ quyền nội bộ nào. Luật đã có: cấm tạo mới (ADR-0083 mục 1b) và kiểm định kỳ `R-LC-1` bắt tài khoản cũ; chủ chạy kiểm này trên hệ thống thật ngày 23–24/10, kết quả đạt (không có tài khoản nào vi phạm). Hệ quả: đoạn "tài khoản lai giữ `ledger.view` của cột nội bộ" của ADR-0081 điều 1 không còn là trường hợp thật. Các cổng "giữ quyền Đối tác thì không dùng" đã thêm ở lệnh huỷ khoản thu, đảo dòng sổ, sửa khoản thu đã ghi, quyết toán và hoàn tiền là **lớp phòng thủ phụ**, không thay luật này.
2. **Đ2 — `R-BIL-2` sau mốc so riêng phiếu "Đã giao".** ADR-0079 viết `R-BIL-2` so tổng dòng thương mại trên phiếu "Đã giao" *cộng phiếu điều chỉnh của đơn* với số tính lại từ bản chụp. Mã so riêng phiếu "Đã giao": nếu cộng điều chỉnh thì mọi đơn Kế toán sửa hoa hồng hợp lệ bằng điều chỉnh có duyệt (ví dụ D-3 của ADR-0080) sẽ bị báo lỗi mãi vì bản chụp đã đóng băng. Đổi lại, một phiếu điều chỉnh sai đã qua duyệt không bị kiểm định kỳ bắt; lớp canh phiếu điều chỉnh là người duyệt thứ hai (ADR-0115). Phần trước mốc (`R-BIL-2w`, cảnh báo) vẫn cộng điều chỉnh.
3. **Đ3 — Đảo dòng sổ chặt hơn ADR-0115 điều 5.** ADR-0115 điều 5 giữ "đảo dòng" sẵn có không cần người thứ hai duyệt. Mã nay: (a) dòng hoa hồng, giá vốn, giảm giá bên đặt **không đảo riêng được** (mã lỗi `commercial_line_needs_approval`); muốn sửa phải qua yêu cầu điều chỉnh có duyệt; (b) người giữ quyền Đối tác không dùng được các lệnh huỷ khoản thu, đảo dòng sổ, sửa khoản thu đã ghi, quyết toán, hoàn tiền; (c) kiểm định kỳ `R-BIL-20` đếm mọi dòng đảo thuộc ba loại thương mại. Lý do: khe cũ cho Kế toán một mình xoá hoa hồng hoặc giảm giá bên đặt khỏi sổ mà không ai duyệt và kiểm định kỳ không thấy. Các luồng hợp pháp (đảo lần thu, hoàn khách sau "Đã giao", huỷ đơn giữa chừng, thu cho nhà cung cấp rồi đảo) không đổi.
4. **Đ4 — Tên mã lỗi `delivered_terms:` thay `terms_missing:`.** ADR-0079 điều 5 đặt tiền tố `terms_missing:` cho lỗi lớp 2 của trigger "Đã giao"; mã dùng `delivered_terms:` (tên mã nội bộ). Người dùng chỉ thấy câu lời thường đã dịch, không thấy tên mã; không đổi hành vi.

## Hệ quả
- Ba điểm Đ2–Đ4 đã ghi ở `docs/SYSTEM-DESIGN.md` §16 ("Lệch có chủ ý") kèm nhật ký thi công `docs/superpowers/plans/2026-10-18-so-dai-ly-dot-2-thi-cong-nhat-ky.md`; khi ADR này được duyệt, §16 trỏ về ADR này thay vì nói "chờ chủ".
- Kiểm định kỳ `R-LC-1` là lưới của Đ1; nếu sau này xuất hiện tài khoản lai, nó đỏ ở `audit-invariants`.
- Ba sửa kèm theo cùng đợt rà soát (không cần ADR riêng vì nằm trong ADR-0078/0079/0132 đã duyệt): trần ghi khoản thu cho quầy nhà cung cấp tính sau giảm giá; Đối tác không dùng ô "thu cho"; cảnh báo khi hạ mức hoa hồng tay xuống dưới giảm giá đã áp.
- Cập nhật mục lục `docs/adr/README.md` sau khi được duyệt.
