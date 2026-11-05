# ADR-0171 — Siết ba đường vé và tiền sau kiểm độc lập ADR-0170

- **Trạng thái:** **accepted** 2026-11-05 — chủ dự án trong chat, trả lời ba câu hỏi, chọn nguyên văn: *«Chặn, nhờ văn phòng»*, *«Vé mới chờ đủ tiền»*, *«Chọn đúng người giữ»*.
- **Loại:** việc lớn (tiền, quyền, luồng khách). **Cửa:** hai chiều, không migration, không đổi số đã ghi trong sổ.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt:** 3 (Đ1, Đ2, Đ3), đúng trần `CLAUDE.md` §9. Trang ghép ở cuối văn bản này.
- **Quan hệ với ADR cũ:** **mở rộng** ADR-0170 Đ3 sang sửa số khách. **Đổi** ADR-0153 ở chỗ đường dẫn khách cho xem mọi vé đang giữ của đơn. **Thay** lời «Để nguyên, ghi sổ việc» ngày 3/11 cho riêng `BL-DC-CHUYEN-CONG-TY-GIU`: lời đó dựa trên mô tả «Kế toán chọn nhầm», còn người kiểm độc lập thấy nút trên giao diện gửi cứng «công ty giữ», không có lựa chọn nào khác. `BL-DC-HUY-GHI-TAY` không đổi.

## Bối cảnh

Người kiểm độc lập của ADR-0170 đã chạy thật ba tình huống:

1. Tài khoản vừa Bán hàng vừa Đối tác sửa được số khách trên đơn của mình sau khi đã mở vé (`POST /api/orders/:id/money-edit`, `handler-money-edit`). Giảm khách thì đơn giảm tiền mà vé đã lộ vẫn còn.
2. Đường dẫn khách (`/ve/:token`, `/api/ve-khach/:token/anh/:slot`) không kiểm tiền. Đối tác đã có đường dẫn, số khách tăng 2→4 thì lấy được ảnh vé 4 và cả 4 vé bị đóng dấu đã lộ, trong khi màn đơn báo chưa thu đủ.
3. Đối tác ghi «Tôi thu» trên đơn A rồi huỷ A; Quản trị duyệt chuyển, Kế toán bấm nút chuyển sang đơn B: đơn B mở vé, đơn A còn đúng số tiền đó trên đối tác.

## Quyết định

**Đ1. Người giữ quyền Đối tác không tự sửa số khách trên đơn đã mở vé.**
1. Áp ở cả hai route trên, cho mọi tài khoản giữ quyền Đối tác kể cả lai, đo bằng `holdsPartner`, dù tăng hay giảm.
2. Đơn chưa mở vé không đổi. Văn phòng không bị chặn; muốn sửa thì nhờ Quản trị hoặc Kế toán.
3. Không đọc được tình trạng vé thì chặn, cùng cách ADR-0170 Đ3 mục 3. Trả 409 trước khi soạn lô ghi.

**Đ2. Đường dẫn khách: vé đã mở thì vẫn xem, vé chưa mở chờ đủ tiền.**
1. Vé đã có dấu lộ trước đó: khách vẫn xem và tải như cũ, kể cả khi đơn đang thiếu tiền. Không tắt đường dẫn đã gửi.
2. Vé chưa có dấu lộ: chỉ hiện và chỉ trả ảnh khi cổng tiền của đơn đạt (`thuDu` trên `tienDonVe`, về sau `veMoDuoc` của ADR-0168). Không đọc được tiền thì coi như chưa đạt.
3. Thứ tự giữ nguyên: xét cổng, rồi nhật ký và dấu lộ, rồi mới đọc kho. Số thứ tự vé trên đường dẫn không được đổi khi có vé mới hiện thêm.
4. Áp cho mọi đơn, không riêng đơn đối tác, vì cổng tiền đã tự phân biệt.
5. Trang của khách chỉ nói còn vé chưa sẵn sàng và bảo liên hệ người đặt, không nói chuyện tiền của đơn.

**Đ3. Chuyển cọc phải ghi đúng người đang giữ tiền.**
1. Nút chuyển tự lấy người còn giữ tiền của đơn cũ. Không ai còn giữ thì mới là công ty.
2. Máy chủ từ chối ghi «công ty giữ» khi đơn cũ còn người chưa nộp, kể cả gọi API trực tiếp. Giao diện ẩn không thay cho cổng.
3. Nhiều người cùng còn giữ tiền trên một đơn cũ: chặn và yêu cầu nộp trước hoặc chuyển từng phần theo từng người, thợ chọn cách ít đổi route nhất và ghi sổ.
4. Không đổi các dòng sổ đã có. Đơn đã chuyển nhầm trước đây (nếu có) xử lý riêng, không nằm trong việc này.

## Tiêu chí nghiệm thu

1. Tài khoản lai, đơn đã mở vé: `money-edit` tăng và giảm đều 409, đơn và sổ không đổi; đơn chưa mở: 200; Quản trị: 200.
2. Đường dẫn đã tạo, số khách 2→4, chưa thu thêm: trang khách thấy 2 vé, ảnh vé 3 và 4 không trả, không đóng dấu, không đọc kho; thu đủ: thấy 4 vé; vé 1 và 2 giữ nguyên số thứ tự.
3. Đơn đang thiếu tiền nhưng vé 1, 2 đã mở: khách vẫn tải được vé 1, 2.
4. Chuyển cọc khi đơn cũ còn đối tác giữ: gửi `cong_ty` bị từ chối; nút tự ghi đối tác; đơn mới khoá tới khi nộp đủ. Đơn cũ đã nộp đủ: chuyển như cũ, đơn mới mở.
5. Mỗi điều có bài đỏ trước, thử phá đỏ rồi hoàn nguyên, có dòng `docs/SO-HANG-RAO.md`.

## Trang ghép

| (1) Bảng | Chứa | Đổi |
|---|---|---|
| `vdt_allocation`, đường dẫn khách | phân bổ và đường dẫn của mọi đơn | chỉ đổi điều kiện đọc, không đổi cấu trúc |
| `bil_debt_line`, khoản thu | dòng giữ hộ, khoản chuyển | khoản chuyển mới mang đúng người giữ, dòng cũ giữ nguyên |
| `orders`, dòng tiền đơn | đơn của mọi người lập | thêm luật chặn sửa số khách cho người giữ quyền Đối tác |

| (2) Ô quyền | Đổi | Áp cho |
|---|---|---|
| `order.money.edit`, ô sửa của người phụ trách | không đổi ô; thêm luật ở route | người giữ quyền Đối tác, đơn đã mở vé |
| quyền chuyển cọc của Kế toán | không đổi | thêm điều kiện về dữ liệu, không đổi ai được bấm |
| route công khai đường dẫn khách | vẫn công khai theo mã đường dẫn | không có quyền mới; thêm cổng tiền với vé chưa mở |

| (3) Cửa | Cổng máy chủ | Giao diện ẩn/hiện |
|---|---|---|
| Sửa số khách | `can`, rồi luật Đ1, rồi soạn lô | ẩn nút theo `coVeDaMo`; đổi nghĩa chỗ này: người giữ quyền Đối tác mất nút trên đơn đã mở vé |
| Trang và ảnh đường dẫn khách | mã đường dẫn, rồi Đ2 | trang khách hiện ít vé hơn khi đơn thiếu tiền |
| Chuyển cọc | quyền, duyệt, rồi Đ3 | nút chuyển đổi câu từ «tiền do Công ty giữ» sang tên người đang giữ |

**Chỗ dễ nhầm:** khách đang cầm đường dẫn có thể thấy số vé ít hơn số người đi khi đơn vừa tăng khách mà chưa thu thêm; đó là cố ý. Khi ADR-0168 nhập, cổng ở Đ2 đổi sang `veMoDuoc`, nên đơn Trả sau trong hạn mức vẫn hiện đủ vé.

## Hệ quả

Kế toán có thể gặp lệnh chuyển cọc bị từ chối và phải ghi nộp trước. Tài khoản lai phải nhờ văn phòng khi sửa số khách sau khi mở vé. Đã biết, không đổi: gỡ quyền Đối tác của một tài khoản làm các đơn của tài khoản đó thôi bị xét theo Đ2 của ADR-0170.
