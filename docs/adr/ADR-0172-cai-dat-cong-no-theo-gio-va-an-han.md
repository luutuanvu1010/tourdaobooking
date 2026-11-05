# ADR-0172 — Cài đặt công nợ: Quản trị đặt, gợi ý theo cấp, hạn theo giờ và ân hạn

- **Trạng thái:** **accepted** 2026-11-05 — chủ dự án trong chat. Nguyên văn: *«Các tùy chọn về hạn mức, số ngày ân hạn ... cần được thiết lập trong tùy chọn của Admin, Super Admin»*, *«Tổng hạn mức của công nợ cho 1 đại lý cụ thể ở cấp TA1 là 50 triệu, thời hạn trả (tính theo từng đơn) là (ví dụ) 36 giờ kể từ khi đơn được xác nhận thành công»*. Trả lời câu hỏi, chọn: *«Bật riêng từng đại lý»*, *«Trong Cấp độ đại lý»*, *«Có thêm ân hạn»*, *«Lên trước diễn tập»*.
- **Loại:** việc lớn (quyền, tiền, dữ liệu). **Cửa:** hai chiều; migration `0141_tra_sau_han_muc` chưa áp production nên sửa được.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt:** 3 (Đ1, Đ2, Đ3), đúng trần `CLAUDE.md` §9. Trang ghép ở cuối.
- **Quan hệ với ADR cũ:** **sửa** ADR-0168: thêm Quản trị vào người đặt hạn mức; đổi hạn trả từ ngày sang giờ; thêm ân hạn; bỏ điều kiện «chỉ phát hành sau diễn tập» cho riêng việc này. Các điều khác của ADR-0168 giữ nguyên, gồm luật hai lớp: nợ cộng đơn mới không vượt hạn mức, và mỗi đơn có hạn riêng.

## Quyết định

**Đ1. Quản trị và Toàn quyền đặt, chỗ đặt ở màn «Cấp độ đại lý».**
1. Đặt, đổi, ngừng công nợ của đại lý: `ADMIN`, `SUPER_ADMIN`. Kế toán vẫn xem được, không ghi.
2. Mỗi dòng đại lý ở `/cap-dai-ly` có một ô công nợ, bấm mở bảng nhỏ theo khuôn ô cấp. Không thêm trang cài đặt.
3. Màn `/han-muc-tra-sau` bỏ phần ghi, chỉ còn danh sách đang nợ và quá hạn.
4. Tên hiện trên ô do chủ chọn lúc làm: «Công nợ» trùng chữ với «Sổ công nợ» đang có (ADR-0167).

**Đ2. Số gợi ý theo cấp, bật riêng từng đại lý.**
1. Mỗi cấp đại lý có thể có số gợi ý: hạn mức, thời hạn trả, ân hạn. Ví dụ TA1: 50.000.000 ₫, 36 giờ.
2. Số gợi ý không cho ai công nợ. Đại lý chỉ có công nợ khi Quản trị hoặc Toàn quyền bật riêng; bảng điền sẵn số gợi ý của cấp, đổi được.
3. Số đã bật thuộc về đại lý. Đổi số gợi ý hay đổi cấp không làm đổi công nợ đã bật.

**Đ3. Thời hạn trả tính bằng giờ theo từng đơn, có ân hạn.**
1. Hai số của mỗi đại lý: thời hạn trả (giờ, từ 1 trở lên) và ân hạn (giờ, từ 0 trở lên). Trần do thợ đặt để chặn nhập nhầm, tối đa 365 ngày mỗi số.
2. Lúc đơn xác nhận thành công, máy chụp vào đơn hai mốc giờ theo giờ máy chủ: hạn trả = giờ xác nhận + thời hạn; hết ân hạn = hạn trả + ân hạn. Đổi cài đặt sau đó không đổi mốc của đơn đã xác nhận.
3. Trước hạn trả: bình thường. Từ hạn trả tới hết ân hạn: màn đơn và danh sách nợ báo quá hạn đang trong ân hạn, chưa chặn gì. Hết ân hạn mà còn nợ: áp đúng luật quá hạn của ADR-0168 (chặn đơn công nợ mới của bên đặt, chặn vé chưa mở; vé đã mở vẫn xem).
4. So mốc bằng dấu thời gian đầy đủ, không so theo ngày. Giờ hiện cho người dùng theo giờ Việt Nam.

## Phát hành

Trả sau được lên khi đã xong và người kiểm độc lập đạt, không chờ diễn tập khôi phục. Diễn tập dời tới 2026-12-31, ghi ở `docs/quyen-hoan.json` mục `HC-5.19`.

## Tiêu chí nghiệm thu

1. Quản trị, Toàn quyền bật được; Kế toán, Bán hàng, Đối tác 403.
2. Đại lý TA1 chưa bật: không dùng được công nợ dù cấp có số gợi ý. Bật: bảng điền sẵn 50.000.000 ₫, 36 giờ.
3. Hạn mức 50.000.000 ₫: nợ 45.000.000 ₫ thì đơn 6.000.000 ₫ bị chặn, đơn 5.000.000 ₫ được.
4. Thời hạn 36 giờ, ân hạn 12 giờ, xác nhận lúc T: tại T+35 giờ không quá hạn; T+37 giờ báo trong ân hạn, chưa chặn; T+49 giờ còn nợ thì chặn đơn mới và vé chưa mở; thu đủ thì mở lại.
5. Đổi thời hạn của đại lý: đơn đã xác nhận giữ mốc cũ, đơn mới theo số mới.
6. Mỗi điều có bài đỏ trước, thử phá đỏ rồi hoàn nguyên, có dòng `docs/SO-HANG-RAO.md`.

## Trang ghép

| (1) Bảng | Chứa | Đổi |
|---|---|---|
| `bil_credit_limit` | công nợ đã bật của từng hồ sơ | `term_days` thành thời hạn giờ, thêm ân hạn giờ |
| bảng gợi ý theo cấp (mới, của `billing`) | số gợi ý của từng cấp | chỉ dùng để điền sẵn, không cổng nào đọc |
| `orders` | đơn của mọi người lập | `credit_due_date` thành hai mốc giờ, chỉ đơn công nợ có |

| (2) Ô quyền | Đổi | Áp cho |
|---|---|---|
| ô ghi hạn mức của ADR-0168 | thêm cột `ADMIN` | đặt, đổi, ngừng công nợ, số gợi ý |
| ô xem hạn mức | không đổi | Kế toán, Quản trị, Toàn quyền |
| `order.create`, xem cấp đại lý | không đổi | người xem màn cấp mà không có ô ghi thì thấy ô chỉ đọc hoặc không thấy, theo cờ máy chủ |

| (3) Cửa | Cổng máy chủ | Giao diện ẩn/hiện |
|---|---|---|
| Ô công nợ ở `/cap-dai-ly` | route ghi hỏi ô ghi hạn mức | màn cấp đại lý đổi nghĩa: nay có cả việc tiền; ẩn nút theo cờ máy chủ, Kế toán không ghi được |
| Xác nhận đơn công nợ | cổng hạn mức, luật quá hạn theo mốc hết ân hạn | màn đặt đơn đọc đường hẹp `con-duoc-dung` |
| Vé chưa mở | `moVeDuoc` theo mốc hết ân hạn | khối vé báo lý do |

**Chỗ dễ nhầm:** Quản trị bật được công nợ cho đại lý tức là quyết được việc công ty cho nợ; nhật ký phải ghi người đặt và số tiền. Người được đặt là chính mình: nếu tài khoản Quản trị cũng là đại lý được hưởng thì máy chặn tự đặt cho mình.
