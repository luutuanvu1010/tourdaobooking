# Đặc tả ngắn — chứng từ nội bộ cho khoản «đã hoàn ngoài hệ thống» (ca SV-DH-07)

> Hồ sơ có ngày (28/10/2026), **bản nháp chờ chủ duyệt**. AI soạn, không tự duyệt (Hiến pháp N3). Việc lớn (tiền, dữ liệu): thi công xong cần người kiểm độc lập.
> Nguồn: lời chủ dự án khi xác nhận sổ vàng 14/10 (ghi ở `docs/BACKLOG.md` mục 35, mã `BL-SV-CHUNG-TU-HOAN-NGOAI`); chủ chọn 28/10 «Giữ điều kiện, soạn đặc tả chứng từ».
> Xây trên lỗ đang hở: **TNV-G1** (`docs/quyen-hoan.json`) — đặc tả này là một trong các điều kiện để ĐÓNG lỗ đó, không nới luật nào của lỗ.

## 1. Vấn đề
Khoản «đã hoàn ngoài hệ thống» (ADR-0089 đ16, X-3, X-4) dùng cho đơn huỷ CŨ mà công ty đã trả tay tiền thu trước cho khách trước khi có lệnh hoàn trong Nền tảng. Hôm nay Toàn quyền chỉ ghi **số tiền, lý do, ngày**, rồi Quản trị xác nhận. Chủ yêu cầu thu chi phải có chứng từ nội bộ: chi vì mục đích gì, số tiền, chi cho ai, hình thức nào, số chứng từ và ngày.

## 2. Đề xuất
Đã có sẵn: mục đích (= ô lý do), số tiền, ngày (= ngày phát sinh). Thêm **ba trường bắt buộc** cho dòng ghi mới:

| Trường | Nghĩa | Ràng buộc |
|---|---|---|
| Số chứng từ | số phiếu chi nội bộ | chữ, 1–50 ký tự |
| Hình thức chi | Tiền mặt / Chuyển khoản / Khác | một trong ba mã, như hình thức của lần thu |
| Người nhận tiền | tên người cầm tiền về (thường là khách đặt) | chữ, 1–120 ký tự; mặc định điền sẵn tên khách của đơn, sửa được |

- **Không** thu số tài khoản, số điện thoại, giấy tờ cá nhân của người nhận. Ba trường **không** vào nhật ký (nhật ký giữ như nay: chỉ lý do).
- Dữ liệu: thêm ba cột vào `bil_outside_refund` theo kiểu chỉ-thêm (migration mới, cột cho phép trống ở CSDL để không đụng dòng cũ); máy chủ bắt buộc với dòng ghi mới, và một trigger bắt buộc cho dòng `RECORD` chèn sau migration. Cập nhật `docs/data-dictionary.json`.
- Quản trị thấy đủ ba trường **trước khi** bấm Xác nhận / Từ chối; trang đơn hiện «Đã hoàn ngoài hệ thống 300.000 ₫ · phiếu chi PC-012 · tiền mặt · người nhận: …».
- Số tiền, luật một dòng hiệu lực, tách người ghi / người xác nhận, cách tính «còn giữ»: **không đổi**. Ca SV-DH-07 chỉ thêm ba trường vào bước ghi; đáp án tiền giữ nguyên.

## 3. Ba điều cần chủ quyết
1. **Ba trường trên đã đủ chưa?** Khuyến nghị: đủ — mục đích và ngày dùng lại ô có sẵn.
2. **Người nhận tiền:** điền sẵn tên khách của đơn rồi cho sửa (khuyến nghị), hay bắt gõ tay mỗi lần?
3. **Ảnh phiếu chi:** chưa làm ở lượt này (khuyến nghị — làm sau khi tệp kèm trên kho tệp, ADR-0144, đã chạy ổn trên production), hay làm luôn?

## 4. Khi chủ duyệt
Ghi quyết định thành dòng làm rõ cho ADR-0089 đ16 (hoặc ADR bổ sung nếu chủ muốn) → kế hoạch ngắn → thi công đỏ trước xanh sau (máy chủ, trigger, trang đơn) → viết lại ca SV-DH-07 → chủ xác nhận ca → người kiểm độc lập.

## 5. Giả định và điều chưa chắc
- Chưa kiểm production có dòng «đã hoàn ngoài hệ thống» nào chưa (không đọc D1 thật từ phiên này). Nếu có, dòng cũ giữ nguyên, không bắt bổ sung.
- Phạm vi đ16 vẫn là đơn huỷ trước ngày ADR-0089 lên production (X-3); dữ liệu production hôm nay chủ yếu là đơn thử.
