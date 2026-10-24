# Bản tách đề xuất 0140 — Đại lý tổ chức nhiều nhân viên (24/10)

> Bản nháp, CHƯA duyệt, chưa vào `docs/adr/`. Trỏ về nháp gốc `2026-10-24-de-xuat-adr-dai-ly-to-chuc-nhieu-nhan-vien.md` (không sửa nháp gốc).
> Lý do có bản này: chủ trả lời «Duyệt nháp 0140 theo khuyến nghị» (24/10), nhưng nháp gốc chưa đủ điều kiện duyệt:
> (1) nháp tự đặt điều kiện «chủ xác nhận có ca dùng thật trước khi duyệt» (ngưỡng ADR-0014 điều 5: ≥ 2 tài khoản cùng một tổ chức cần thấy chung đơn) — đây là câu hỏi sự thật, không có khuyến nghị để áp;
> (2) một lượt có ≥ 4 quyết định chạm quyền/dữ liệu, vượt trần 3 (CLAUDE.md §9), và trang ghép lượt 3 chưa có bảng từng ô;
> (3) câu 2, 3 của nháp gốc không có khuyến nghị.

## 1. Điểm nháp gốc chưa nói (đọc mã 24/10)

Đơn do tài khoản Đối tác lập có bên đặt bị máy chủ **ép là hồ sơ người hưởng của chính tài khoản** (hồ sơ cá nhân). Nên «đơn của tổ chức = đơn có bên đặt là hồ sơ tổ chức» sẽ **rỗng** nếu không đổi luật ép bên đặt. Đổi luật ép = đổi **người nhận hoa hồng và công nợ** (từ cá nhân sang tổ chức) ⇒ chạm tiền, phải đi trước phạm vi xem và sau ADR-0081 (đối tác xem sổ, đã duyệt, chưa dựng).

## 2. Tách thành hai lượt (mỗi lượt ≤ 3 quyết định)

**0140a — Thành viên và bên đặt (dữ liệu, tiền).** Thi công sau ADR-0081.
- D1. Bảng thành viên tài khoản ↔ hồ sơ tổ chức đại lý, hiệu lực theo ngày (mở/đóng, không xoá), một tài khoản tối đa một tổ chức tại một ngày; tài khoản lai (nội bộ + Đối tác) không được làm thành viên. Chủ bảng: chọn khi soạn bản chính (`staff` hay `parties`).
- D2. Tài khoản đang là thành viên lập đơn ⇒ máy chủ ép bên đặt = **hồ sơ tổ chức**; hoa hồng và công nợ ghi cho tổ chức, nhân viên chỉ là người lập. Đơn cũ không đổi.
- D3. Ai quản lý danh sách thành viên: **chỉ Quản trị, Toàn quyền** (khuyến nghị cho câu 3 nháp gốc); nhật ký thêm/bớt không ghi SĐT.

**0140b — Phạm vi xem theo tổ chức (quyền).** Thi công sau 0140a.
- D1. Thêm phạm vi `org` («đơn có bên đặt là tổ chức mình đang là thành viên»), lọc bằng SQL ở máy chủ; rời tổ chức ⇒ mất quyền xem ở lần gọi kế tiếp; hai tổ chức không bao giờ thấy đơn của nhau.
- D2. Ô mở theo tổ chức — **chỉ xem**: `order.view`, `order.history.view`, `contact.view`, `money.view` (giá đơn). **Giữ `own`**: `order.modify`, `order.passenger.write`, `payment.receive`, và **`order.terms.view` (hoa hồng)** — nhân viên không thấy tiền hoa hồng của tổ chức (khuyến nghị cho câu 2 nháp gốc; bảng từng ô ở trang ghép lượt 3).
- D3. Bật theo **từng tổ chức**, mặc định tắt, Toàn quyền bật, có ngày hiệu lực (nút bấm ADR-0014 điều 5 đã hẹn).

## 3. Lỗ đang hở (đã rà 24/10)

`docs/quyen-hoan.json`: không mục nào chạm ô của Đối tác. D-1 (Đối tác đọc lý do nội bộ trong lịch sử đơn, kiểm toán 13/10) đã vá ở bản 1.92 — mở `order.history.view` theo tổ chức thừa hưởng bản vá đó, nhưng phải chạy lại bài của D-1 với hai tài khoản cùng tổ chức. Bốn lỗi High kiểm toán 12/10 không chạm ô Đối tác; riêng K-A-2 (ca vàng sổ đại lý chưa ai xác nhận) nằm cạnh 0140a D2. Hàng xóm cần nhớ: `BL-ADR0117-DANH-BA-TEN-LOAI` (tài khoản lai thấy tên loại ở Danh bạ — chủ chưa quyết).

## 4. Chưa kiểm
Chưa đếm production có tổ chức nào nhiều tài khoản. Chưa đọc toàn văn ADR-0081 để biết «Sổ của tôi» đọc theo hồ sơ nào. Chưa thiết kế giao diện.
