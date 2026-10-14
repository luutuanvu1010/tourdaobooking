# Đề xuất ADR-0118 — hai chỗ đổi luật chủ nêu khi xác nhận sổ vàng (14/10/2026)

> Hồ sơ đề xuất có ngày, chưa phải quyết định. AI soạn, không tự duyệt (Hiến pháp N3). Nguồn: lời chủ dự án trong phiên xác nhận sổ vàng 14/10/2026, ca SV-SC-02 và SV-DH-05. Việc lớn (tiền, quyền): thi công xong cần người kiểm độc lập.

## Câu 1 — Hướng dẫn viên khai "Công ty thu – chuyển khoản" thì có bị tính nợ ngay không? (SV-SC-02)

**Hiện nay (ADR-0026, H3):** khoản đó vẫn tính vào nợ của hướng dẫn viên cho tới khi Kế toán bấm "Công ty đã nhận". Ví dụ khách trả 500.000 chuyển khoản + 500.000 tiền mặt: trước khi Kế toán bấm, anh Nam bị tính nợ cả 1.000.000.

**Chủ muốn:** anh Nam chỉ nợ phần tiền mặt anh thật sự cầm (500.000). Khoản chuyển khoản là của công ty, không tính vào nợ anh.

- **Phương án A (theo lời chủ, khuyến nghị):** khoản "Công ty thu – CK" do hướng dẫn viên khai không tạo nợ cho họ; hiện ở trạng thái "đang đối chiếu" cho tới khi Kế toán xác nhận. **Giữ nguyên chốt: đơn chưa Đã giao được khi còn khoản đang đối chiếu.** Cần kèm nhắc Kế toán đối chiếu quá hạn (số ngày chủ chọn).
- **Phương án B:** giữ H3 như cũ; ca SV-SC-02 chỉ sửa câu mô tả (số cuối đã đúng).
- **Một lời nhắc, nói một lần (P18):** H3 là chốt chống khai gian ("khai chuyển khoản nhưng thật ra cầm tiền mặt"). Phương án A bỏ chốt đó, nên chỉ còn chặn Đã giao và nhắc đối chiếu để thay thế. Chủ nghe rồi vẫn quyết thì làm.

## Câu 2 — Ai được duyệt chuyển tiền sang đơn khác? (SV-DH-05)

**Hiện nay (ADR-0089, X-1):** duyệt hoàn tiền cho khách và duyệt chuyển sang đơn mới dùng chung một ô quyền, chỉ Quản trị và Toàn quyền. Kế toán chỉ ghi lệnh sau khi đã được duyệt.

**Chủ muốn:** Kế toán cũng duyệt được việc chuyển 500.000 từ đơn A sang đơn B, để giảm tải cho Quản trị.

- **Phương án A (khuyến nghị):** tách ô riêng "duyệt chuyển tiền sang đơn mới", cấp cho Kế toán (thêm vào Quản trị, Toàn quyền). Duyệt **hoàn tiền cho khách** vẫn chỉ Quản trị và Toàn quyền, vì chỉ hoàn mới làm tiền ra khỏi công ty. Giữ "người duyệt ≠ người ghi chuyển". Chuyển vẫn chỉ cho cùng một người giữ tiền ở hai đơn.
- **Phương án B:** Kế toán duyệt cả hoàn lẫn chuyển (không khuyến nghị: Kế toán vừa duyệt vừa chi tiền ra).
- **Điều AI hiểu theo lời chủ, chủ sửa nếu hiểu sai:** "cấp quyền cho Kế toán chuyển" nghĩa là quyền **duyệt** chuyển, không phải bỏ bước duyệt.

## Trang ghép (CLAUDE.md §9)
- **Bảng chạm:** sổ tiền `bil_*` (dòng nợ hướng dẫn viên, khoản duyệt/chuyển của đơn huỷ). Không thêm loại thực thể mới.
- **Bản đồ quyền:** câu 1 không đổi quyền; câu 2 thêm một ô mới cho phương án A, `deposit.refund.approve` giữ nguyên cho hoàn.
- **Cổng canh:** câu 1: `billing/rules.ts` (cách tính nợ), chặn Đã giao ở `orders`/`billing`. Câu 2: route duyệt chuyển ở `billing/index.ts` và chỗ ẩn/hiện nút "Duyệt hoàn thu trước" trong `web/order.ts` (giao diện phải theo ô mới).
- **Nghiệm thu:** bài đỏ trước cho từng câu; sửa ca vàng SV-SC-02 và SV-DH-05 rồi chủ xác nhận lại; người kiểm độc lập chạy lại.

## Chủ chỉ cần trả lời
Câu 1: **A hay B**, và nếu A thì nhắc đối chiếu sau mấy ngày. Câu 2: **A hay B**, và "hiểu theo lời chủ" ở trên đúng chưa. Nếu không nói gì thì áp theo khuyến nghị (câu 1: A với nhắc sau 3 ngày; câu 2: A).
