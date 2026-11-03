# ADR-0161 — Chính sách chiết khấu bốn trục, giới hạn nhập và trần giảm giá không tính dòng vượt

- **Trạng thái:** **accepted** 2026-11-03 — chủ dự án chọn ở hộp hỏi, nguyên văn: *«Duyệt, gồm siết trần»*, sau khi đọc đặc tả và phần mô tả việc siết trần. Lời chủ trước đó, nguyên văn: *«đặt chính sách ở Hoa hồng đối tác, 4 trục»*; *«hoa hồng không thể vượt thành tiền»*; *«2 điều này cần thay đổi được trong bảng điều khiển của Super Admin ( không khóa cứng trong code)»*.
- **Nguồn thi công:** `docs/superpowers/specs/2026-11-03-chinh-sach-chiet-khau-bon-truc-design.md`. Lệch giữa hai nơi: ADR này thắng.
- **Loại:** việc lớn (tiền, dữ liệu). Hai chiều: bảng mới chỉ thêm, mọi phần còn lại là mã.
- **Số quyết định chạm quyền, dữ liệu, tiền trong lượt duyệt này: 3** (Đ3, Đ4, Đ5). Không thêm ô quyền. Trang ghép: đặc tả mục 6.
- **Xây trên lỗ đang hở:** không. Điều kiện chung: `HC-5.19` hạn 2026-11-05.
- **Quan hệ với ADR cũ:** **bổ sung ADR-0079 điều 8** (dòng vượt thành tiền tính 0 khi tính trần, như dòng thiếu mức). Giữ nguyên ADR-0077 (không đặt số lên `catalog_*`, chụp mức lúc xác nhận, giữ đơn ở Đã giao), ADR-0117 lần 2 (cấp), ADR-0133 (ba số theo loại khách), ADR-0138 (cấp riêng), ADR-0148 (Đổi, Sửa, Ngừng). Không đụng ADR-0148 Đ2, Đ3 (nhập bằng giá đại lý).

## Bối cảnh

Sau lần xoá dữ liệu thử (ADR-0158), Kế toán phải nhập lại mức của hơn 100 dịch vụ cho sáu cấp, tức khoảng 720 ô. Hôm nay mỗi mức là một lần mở hộp, còn bảng cấp nhân dịch vụ chỉ để xem. Máy đang nhận 60%, 123.456 đ và cả mức cao hơn giá vé. Chạy thử cho thấy mức vượt giá bị giữ ở Đã giao và sổ không ghi, nhưng nó còn nới trần giảm giá: đối tác lập được đơn 600.000 đ giảm về 0 đ, xác nhận ngay.

## Quyết định

**Đ1. Bốn trục độc lập, đặt ở trang Hoa hồng đối tác:** Cấp đại lý, Dịch vụ, «Tính bằng», «Áp cho». Không thêm bảng cho trục, không tạo «gói chiết khấu» dùng chung: mỗi dòng mức thuộc đúng một cấp và một phạm vi dịch vụ.

**Đ2. «Tính bằng» (Phần trăm, Số tiền) và «Áp cho» (Mọi khách như nhau, Riêng từng loại khách) là tập đóng,** vì mỗi giá trị là một công thức (Hiến chương 2.2). Bỏ phần trăm riêng theo loại khách. «Điều kiện áp dụng» là ghi chú để đọc, máy không tự kiểm.

**Đ3. Giới hạn nhập đổi được, không khoá trong mã.** Bảng chỉ-thêm `prc_entry_limit_policy` (`max_rate_bp`, `amount_step`), gieo 50% và 1.000 đ. Chỉ ô `settings.ops` đổi. Áp ở máy chủ khi thêm, Đổi, và Sửa có số mới; số 0 luôn được nhận; không áp lại dòng đã có, không đụng đơn đã chụp; Ghi mức tay không áp.

**Đ4. Hoa hồng không vượt thành tiền.** Dòng phạm vi một dịch vụ tính bằng số tiền mà vượt giá bán lẻ thì máy chủ từ chối lúc nhập. Phạm vi nhóm và tất cả không có một giá để so, nên dựa vào Đ5 và rào Đã giao đã có. Màn đơn hiện «Hoa hồng vượt thành tiền — Kế toán xem lại» thay cho số âm. Công thức hoa hồng và sổ không đổi.

**Đ5. Trần giảm giá không tính dòng vượt.** Khi tính trần của đơn có người hưởng, dòng có hoa hồng lớn hơn thành tiền của chính dòng đó được tính 0. Áp cho mọi người sửa đơn có người hưởng, ở mọi cổng đang dùng trần (lập đơn, sửa nháp, gửi đơn, xác nhận, đổi bên đặt). Cảnh báo sau xác nhận vẫn dùng số gốc. Câu báo nói rõ mức đang vượt giá bán.

**Đ6. Vai trò chỉ đi qua cấp trên giao diện.** Bỏ hai lối thêm mới mức riêng của vai trò; dòng riêng đã có vẫn hiện, vẫn Đổi, Sửa, Ngừng được; lối «Một đối tác» giữ làm ngoại lệ. Route và thứ tự chọn mức không đổi, nên đảo được.

## Hệ quả

Kế toán nhập trực tiếp trên bảng theo hàng và cột, không cần quyền mới. Đơn đã xác nhận không đổi số. Một mức nhập sai ở phạm vi rộng vẫn nhận được, nhưng không còn mở rộng trần giảm giá; đơn có dòng vượt vẫn bị giữ ở Đã giao tới khi Kế toán sửa. Đơn toàn trẻ em miễn phí với mức «Mọi khách như nhau» có thể bị giữ ở Đã giao, đặc tả chấp nhận rủi ro này.

## Ngoài phạm vi

Nhập từ tệp bảng tính, bảng đồng bộ Sheet, bảng quyền, điều kiện máy tự kiểm (`docs/BACKLOG.md` mục 62). Gắn vai trò có sẵn cho hồ sơ công ty (ADR-0155 Đ1).

## Hoàn tác

Trả mã về bản trước là đủ. Bảng `prc_entry_limit_policy` để yên, không ai đọc thì vô hại. Dòng mức đã nhập vẫn là dòng thường, không phụ thuộc bảng này.
