# Trình chủ — ADR lượt B (ba quyết định)

> Đề xuất, chờ chủ duyệt, nên duyệt sau lượt A. Chi tiết: ADR-0191, ADR-0192, ADR-0193 ở `docs/adr/`, trang ghép `docs/superpowers/specs/2026-11-09-trang-ghep-adr-luot-b.md`. Hồ sơ có ngày: duyệt xong thì đóng băng.

**Kết luận.** Hai việc siết lại một kẽ quyền và giữ chữ người dùng đã gõ; việc thứ ba là công tắc bạn yêu cầu hôm 8/11 để Đối tác gửi đơn có đón mà không cần giờ. Công tắc cần thêm một bảng nhỏ trong cơ sở dữ liệu, nên chạm lỗi «chưa diễn tập khôi phục dữ liệu» — kế hoạch trước ghi lượt này không chạm lỗi nào, chỗ đó ghi thiếu. Vì vậy câu duyệt cần thêm «Cho phép, có ghi lý do» cho ADR-0193.

## Quyết định 1 — PIN đầu của tài khoản Bán hàng do Quản trị cấp (ADR-0191)

Hôm nay Nhân sự tạo tài khoản Bán hàng và được thấy PIN, tức là cầm chìa khoá của một tài khoản xem được số điện thoại mọi khách, dù chính Nhân sự không được xem.

- **Khuyến nghị:** Nhân sự vẫn tạo tài khoản, nhưng với tài khoản xem được khách (thực tế là vai Bán hàng; Quản lý bán hàng vốn chỉ Quản trị gán) máy không hiện PIN; Quản trị bấm «Đặt lại PIN» rồi giao tận tay. Nhân sự cũng không được gán thêm vai Bán hàng cho một tài khoản có sẵn (phải nhờ Quản trị). Tạo tài khoản tài xế, đối tác: như cũ.
- **Còn một kẽ, nói thẳng:** Nhân sự tạo tài khoản tài xế (biết PIN), sau đó Quản trị gán thêm vai Bán hàng — Nhân sự vẫn biết PIN. Máy sẽ nhắc Quản trị đặt lại PIN trong trường hợp đó; muốn chặn hẳn thì chọn phương án khác dưới đây.
- Phương án khác cho đường vòng: cho Nhân sự gán vai, nhưng máy tự đổi PIN và đăng xuất tài khoản đó, rồi Quản trị cấp PIN mới.

## Quyết định 2 — Giữ chữ đã gõ khi hết phiên (ADR-0192)

Hôm nay đang lập đơn mà hết phiên thì đăng nhập lại xong form trống trơn.

- **Khuyến nghị:** lúc hết phiên, máy lưu tạm chữ trên form trong bộ nhớ của thẻ trình duyệt (mất khi đóng ứng dụng), gắn với đúng tài khoản. Đăng nhập lại trong 30 phút, cùng tài khoản, thì chữ hiện lại một lần rồi xoá; người khác đăng nhập trên cùng máy thì xoá luôn, không thấy gì. Đây là lần duy nhất Nền tảng cho lưu tên, số khách trên máy.
- Kèm một việc nhỏ về dung lượng: ưu tiên cách không làm nặng trang Đơn hàng; không được thì cho nới giới hạn dung lượng trang đó tối đa 100 byte (rất nhỏ).

## Quyết định 3 — Công tắc «bắt buộc giờ đón cho đơn đối tác» (ADR-0193)

- **Khuyến nghị:** Toàn quyền có nút trên trang Tôi, mặc định đang bật (như hôm nay). Khi tắt, Đối tác gửi đơn có đón mà chưa có giờ vẫn gửi được, đơn hiện nhắc vàng «Chưa chốt giờ», xe chưa xếp được cho tới khi văn phòng điền giờ. Hai câu nhỏ, đều chọn phương án an toàn:
  - (i) Khi tắt, đơn vẫn qua văn phòng xem trước khi xác nhận, chỉ không bắt điền giờ. (Phương án khác: đơn tự xác nhận luôn, không ai xem.)
  - (ii) Đơn có đón mà chưa có giờ, nếu ngày đón đã sát (ví dụ đón ngay hôm nay), phải điền giờ đón trước rồi mới xác nhận được — áp cho mọi đơn, kể cả văn phòng lập. (Phương án khác: chỉ áp cho đơn đối tác.)
- Tên nút: khuyến nghị «Bắt buộc giờ đón cho đơn đối tác»; hai tên khác ở ADR.
- **Phải biết:** cần một bảng mới, mà dữ liệu chưa từng được diễn tập khôi phục (hạn 31/12). Bảng chỉ thêm, mặc định giữ nguyên hành vi hôm nay, nên rủi ro thấp.

## Câu duyệt mẫu (chép nguyên rồi gửi, hoặc sửa)

> Duyệt ADR-0191, ADR-0192, ADR-0193 theo khuyến nghị: 0191 chặn Nhân sự gán thêm vai xem khách (3a); 0192 cho nới tối đa 100 byte nếu cần; 0193 câu (i) vẫn qua văn phòng, câu (ii) áp mọi đơn, tên nút (1). Với ADR-0193: Cho phép, có ghi lý do (xây trên lỗi HC-5.19, vì chỉ thêm một bảng, mặc định giữ hành vi cũ).

Nếu chưa muốn cho xây trên lỗi đang mở: «Duyệt ADR-0191, ADR-0192; ADR-0193 chờ diễn tập khôi phục.»
