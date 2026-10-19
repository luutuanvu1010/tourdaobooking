# Khung kế hoạch: Sổ đại lý đợt 3 (quyết toán tháng, đại lý xem sổ của mình)

> **Trạng thái: KHUNG, chưa đủ để thi công.** Chi tiết hoá (chữ ký hàm, bài kiểm từng bước) **sau khi đợt 2 đã vào bản chính**, vì mã đợt 3 đọc ba loại dòng và loại phiếu do đợt 2 tạo. Đây là lựa chọn của phiên lập kế hoạch, ghi ở đặc tả đợt 2 §3 mục 8. Lượt duyệt đợt 3 tách khỏi đợt 2 (CLAUDE.md §9: tối đa 3 quyết định chạm quyền / dữ liệu mỗi lượt).

**Nguồn đã duyệt:** ADR-0080 phần D2 (điều 8–10), ADR-0081 (toàn bộ), C9 = A (ẩn % của chính đại lý). Các câu đã bị ADR sau sửa:
- ADR-0092: «không vượt» đã có hai lớp; R-BIL-13 ở mức lỗi; «ô mã giao dịch riêng» thay ghi chú.
- ADR-0115: điều chỉnh có người duyệt; ví dụ D-3 đi qua đường này.
- ADR-0132: `minhKhaiChoXacNhan` chỉ còn khoản «Công ty thu – chuyển khoản».
- ADR-0117: tài khoản lai có quyền nội bộ không là người hưởng.

**Đo mã 2026-10-18:** route `POST /api/ledger/settlements` có, `ghiQuyetToan` nhận `nop` / `tra`, mỗi phiếu một chiều, tối đa 100 đơn, đã kiểm không vượt. Chưa có: kiểu `bu_tru`, bảng kê tháng, màn «Quyết toán», ô `ledger.partner.view`, route sổ đối tác, DTO `SoDoiTacResponse`, màn «Sổ của tôi» cho Đối tác, view công bố của `orders` liệt kê đơn theo bên đặt / người hưởng.

## Việc (mỗi việc một task, đỏ trước xanh sau, người kiểm độc lập)

1. **Kiểu `bu_tru`:** một bên, nhiều đơn, số có dấu mỗi đơn, đi trong một phiếu. Mỗi đơn sinh một dòng `SETTLEMENT` đúng chiều. Kiểm «không vượt» bằng trigger `bil_debt_line_settlement_no_flip` có sẵn (migration 0080; cộng mọi loại dòng của cặp trên đơn, nên đã tính dòng thương mại của đợt 2). Kiểm định kỳ R-BIL-13 thì đợt 2 **giữ nguyên** (chỉ cộng giữ hộ + quyết toán), vì Tour Đảo nợ người hưởng là số âm hợp lệ; đợt 3 có cần một kiểm định kỳ riêng cho bù trừ hay không thì quyết ở đây, ca kiểm C-2 (Tour Đảo nợ CTV 150.000) không được báo nhầm. Màn hiện «Tiền thực chuyển: X ₫ (đại lý → công ty)», số này không lưu.
2. **Chỗ ghi mã giao dịch ngân hàng cho phiếu quyết toán** (ADR-0092 Đ6): bảng `bil_receipt_bank_txn` hôm nay khoá theo lần thu. Cần một chỗ cho phiếu `SETTLEMENT` (bảng hoặc cột mới). **Quyết định chạm dữ liệu ⇒ hỏi chủ ở lượt đợt 3.**
3. **Bảng kê tháng** (`ledger.view any`): một bên × một tháng — đầu kỳ, phát sinh từng dòng, cuối kỳ, cờ tháng đã khoá. Dựng từ `balancesAt`, `linesOfParty`, `ky-so`.
4. **Màn «Quyết toán» cho Kế toán:** chọn một bên, xem bảng kê, chọn nhiều đơn, nhập số từng đơn, xem tiền thực chuyển, ghi. Thêm mục menu theo `ledger.write`.
5. **View công bố mới của `orders`:** đơn theo bên đặt / người hưởng (chỉ khoá + mã đơn + ngày đi + trạng thái).
6. **Ô `ledger.partner.view`** (cột Đối tác `own`, còn lại `none`, kể cả cột Nhân sự). Thêm một ô (một thao tác) **không** nhân đôi bài «tập con quyền», vì bài đó nhân theo số **mã quyền** (10 mã, 1024 tập), không theo số thao tác; chỉ thêm một dòng vào bản đồ quyền và bài khoá giá trị. **Quyết định chạm quyền ⇒ hỏi chủ ở lượt đợt 3.**
7. **Route `GET /api/ledger/doi-tac`** (cổng `orders`): bỏ qua mọi `partyId` trình duyệt gửi. Chỉ đơn mà hồ sơ là bên đặt; chỉ dòng có `kind_code` ∈ {`HELD`, `HOA_HONG`, `GIAM_GIA_BEN_DAT`, `SETTLEMENT`, `REFUND`}, **không bao giờ** `GIA_VON`. DTO `SoDoiTacResponse` dựng từng trường theo danh sách trắng; `conLai` tính bằng một hàm của `billing`. Bài đẳng thức «diễn giải = sổ».
8. **Màn «Sổ của tôi» cho Đối tác:** tổng còn phải trả / được nhận, theo tháng, từng đơn. Đơn nhân viên lập hộ có mã đơn nhưng không có đường mở chi tiết.
9. **Hàng rào:** số lạ 480.017 / 470.019 / 460.023 / 450.029 trên mọi bề mặt Đối tác, với danh sách bề mặt **sinh từ router**, không viết tay; khoá tên trường DTO; không chọn bên; ghim ô mới.
10. **Ca vàng D-1…D-4, E-1…E-n** của ADR-0080 / 0081 vào sổ vàng ở trạng thái `cho_xac_nhan`, kèm phiếu cho Kế toán như đợt 2.

## Câu hỏi để dành cho lượt duyệt đợt 3 (tối đa ba)

1. Đại lý chỉ được xem sổ của mình **sau khi** lớp hai đăng nhập (ADR-0121) đã bật cho tài khoản bên ngoài? Khuyến nghị an toàn: có, vì sổ chứa tiền. Hôm nay mã chưa ép lớp hai cho tài khoản bên ngoài.
2. Khoản đại lý chịu theo phân định trách nhiệm (ADR-0116, T9) có vào sổ đối tác và vào bù trừ không? ADR-0088 điều 9 hứa «đối tác thấy nợ ở Sổ của tôi», trong khi ADR-0081 điều 3 mặc định loại dòng mới không tính. Hai câu này vênh nhau.
3. Chỗ ghi mã giao dịch ngân hàng của phiếu quyết toán (việc 2).

## Điều chưa chắc

- Hoa hồng khi hoàn / giảm trừ sau «Đã giao» (đặc tả đợt 2 §7) phải quyết trước khi thi công ADR-0116, nếu không bù trừ có thể trả hoa hồng trên số đã hoàn.
- Đơn đã huỷ có cọc đại lý giữ (ADR-0081 điều 5): bù trừ lấy hết dòng giữ hộ của đại lý trong khi còn khoản duyệt hoàn chưa chi sẽ vướng trigger `bil_refund_within_held` (0082). Phải có ca kiểm.
