# ADR-0119 — Khoản "Công ty thu – chuyển khoản" do hướng dẫn viên khai không tạo nợ; Kế toán duyệt được chuyển tiền sang đơn khác

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-14: *"duyệt cả hai theo khuyến nghị"* (văn bản đề xuất `docs/superpowers/specs/2026-10-14-de-xuat-adr-0118-hai-viec-doi-luat.md`). Hai điều dưới đây là phương án A của đề xuất đó; số ngày nhắc đối chiếu lấy mặc định 3 ngày vì chủ không nói khác.
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Chưa có người kiểm độc lập đọc văn bản; người kiểm đọc sau khi thi công.
- **Ngày:** 2026-10-14.
- **Số:** 0119. **Đổi số 2026-10-15** theo lời chủ ("nhánh đưa đón lên trước, mình đổi số"): lúc soạn mang số 0118 (kiểm không trùng ngày 2026-10-14), nhưng nhánh đưa đón theo nhóm cũng giữ 0118 và vào `main` trước. Đề xuất có ngày ở trên giữ nguyên tên cũ (hồ sơ đóng băng). Ca vàng, mã nguồn và tài liệu sống đã đổi sang 0119.
- **Loại:** việc lớn (tiền, quyền). Luật và mã đảo được; dữ liệu đã ghi không bị sửa (chỉ-thêm). Cần người kiểm độc lập sau khi thi công.
- **Quan hệ với ADR cũ:** **thay thế điều H3 của ADR-0026** (khoản "Công ty thu – chuyển khoản" do người không phải Kế toán khai vẫn tính vào nợ người khai tới khi Kế toán xác nhận) bằng Điều 1 dưới đây; **thay thế X-1 của ADR-0089** (duyệt chuyển dùng chung ô duyệt hoàn) bằng Điều 2. Các điều còn lại của hai ADR giữ nguyên. Ca vàng liên quan: SV-SC-02, SV-SC-06, SV-DH-05.
- **Xây trên lỗ đang hở:** không có.

## Điều 1 — Khai chuyển khoản không tạo nợ cho người khai
1. Khoản "Công ty thu – chuyển khoản" do **người không phải Kế toán/Toàn quyền** khai **không** sinh dòng *tiền đang giữ hộ* trên người khai nữa. Hướng dẫn viên chỉ nợ phần tiền họ thật sự cầm.
2. Khoản đó ở trạng thái **đang đối chiếu** cho tới khi Kế toán bấm "Công ty đã nhận". **Đơn còn khoản đang đối chiếu thì chưa bấm "Đã giao – đã thu đủ" được** (chốt thay cho H3).
3. Khoản đang đối chiếu **quá 3 ngày** hiện nhắc cho Kế toán (cùng chỗ nhắc việc tồn của sổ tiền; không tin đẩy mới nếu chưa có hạ tầng sẵn).
4. Kế toán "Công ty đã nhận" ⇒ khoản thành **đã thu**, không phát sinh dòng nợ nào. Kế toán thấy tiền không về thì **đảo lần thu** (đường có sẵn).
5. Khoản đã khai **trước** ngày áp luật này giữ nguyên dòng giữ hộ đang có (không sửa dữ liệu cũ); "Công ty đã nhận" cho khoản cũ vẫn đảo dòng giữ hộ của nó.
6. Ca vàng SV-SC-02 giữ đáp án cuối (anh Nam nợ 500.000); SV-SC-06 viết lại theo luật mới (không còn chuyện nộp bù rồi xác nhận bị từ chối vì không còn dòng giữ hộ cho khoản khai CK).

## Điều 2 — Kế toán duyệt chuyển tiền sang đơn khác
1. Tách ô quyền riêng `deposit.transfer.approve` ("duyệt chuyển tiền sang đơn mới"): **Kế toán, Quản trị, Toàn quyền** (phạm vi any). Ô `deposit.refund.approve` giữ nguyên cho **duyệt hoàn tiền cho khách** (Quản trị, Toàn quyền), vì chỉ hoàn mới làm tiền ra khỏi công ty.
2. Giữ nguyên: **người duyệt ≠ người ghi chuyển**; chỉ chuyển giữa hai đơn **cùng một người giữ tiền**; tổng đã duyệt ≤ tiền còn giữ; lý do bắt buộc.
3. Giao diện ẩn/hiện nút "Duyệt chuyển sang đơn mới" theo ô mới; nút "Duyệt hoàn thu trước" vẫn theo ô cũ. Máy chủ luôn kiểm lại.

## Tiêu chí nghiệm thu (P20)
- Bài đỏ trước, xanh sau, cho từng điều; ca vàng SV-SC-02, SV-SC-06, SV-DH-05 cập nhật rồi chủ xác nhận lại.
- Kế toán duyệt chuyển được, duyệt hoàn thì 403; Bán hàng/Đối tác không duyệt được cả hai.
- Khoản khai CK chưa xác nhận: nợ người khai không tăng; "Đã giao" bị chặn; sau khi Kế toán xác nhận thì "Đã giao" được.
- Mọi bài kiểm bản đồ quyền, kiến trúc, bất biến dữ liệu (`audit-invariants`) xanh; e2e của sổ tiền và đơn huỷ chạy lại.
