# ADR-0173 — Luật vận hành công nợ

- **Trạng thái:** **accepted** 2026-11-05 — chủ dự án trả lời 12 câu trong chat, chọn nguyên văn ở từng điều dưới đây.
- **Loại:** việc lớn (tiền, quyền). **Cửa:** hai chiều.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt:** gom thành 3 (Đ1, Đ2, Đ3). Trang ghép ở cuối.
- **Quan hệ với ADR cũ:** bổ sung ADR-0168 và ADR-0172. Thêm việc nới hạn của một đơn, nên ADR-0172 Đ3 mục 2 «đổi cài đặt không đổi mốc» vẫn đúng, nhưng lệnh nới hạn thì đổi được.

## Quyết định

**Đ1. Ai quyết được bao nhiêu.**
1. *«Có trần do Toàn quyền đặt»:* Quản trị đặt hạn mức tới mức trần; cao hơn thì Toàn quyền đặt. Chưa đặt trần thì Quản trị không đặt được hạn mức.
2. *«Không cho»* vượt hạn mức: không có ngoại lệ theo đơn.
3. *«Quản trị, Toàn quyền nới»* hạn trả của một đơn: bắt buộc ghi lý do, có nhật ký gồm mốc cũ, mốc mới, người nới. Chỉ nới về sau, không rút ngắn. Trạng thái quá hạn và cả mốc hết ân hạn tính lại theo hạn mới, số giờ ân hạn của đơn giữ nguyên.

**Đ2. Hạn và quá hạn.**
1. *«Tính liên tục»:* giờ tính cả đêm, cuối tuần, ngày lễ.
2. *«Giữ nguyên hạn»:* trả một phần không đổi hạn trả. Hạn mức trống ra đúng số đã về công ty.
3. *«Đơn công nợ mới, vé chưa mở»:* hết ân hạn còn nợ thì chặn hai việc đó; đơn trả trước vẫn đặt được.
4. *«Không tự huỷ»:* máy chỉ báo, người có quyền huỷ quyết định.

**Đ3. Tiền và đại lý.**
1. *«Sau khi thu đủ tiền»:* đơn công nợ còn nợ thì hoa hồng chưa được trả hay đối trừ.
2. *«Nhắc trên Nền tảng»:* gửi tin trong Nền tảng cho đại lý trước hạn 6 giờ và lúc quá hạn; Kế toán nhận tin lúc quá hạn. Mỗi đơn mỗi mốc gửi một lần.
3. *«Xem đủ của mình»:* đại lý xem hạn mức, số đang nợ, còn được dùng, từng đơn nợ kèm hạn trả; chỉ của chính hồ sơ mình.
4. *«Ghi từng đơn»:* không thêm màn thu gộp.
5. *«Chặn tới khi hết nợ»:* không ngừng được hồ sơ đại lý còn đơn công nợ chưa trả; câu báo nêu mã đơn.

## Tiêu chí nghiệm thu

1. Trần 100.000.000 ₫: Quản trị đặt 100.000.000 ₫ được, 100.000.001 ₫ thì 403 kèm câu rõ; Toàn quyền đặt được. Chưa có trần: Quản trị 403.
2. Nới hạn: Quản trị, Toàn quyền được; thiếu lý do 400; rút ngắn 409; Kế toán, Bán hàng, Đối tác 403; đơn đang quá hạn được nới thì mở lại đơn mới và vé chưa mở.
3. Trả một phần: hạn không đổi, số còn được dùng tăng đúng phần đã về.
4. Hết ân hạn: đơn trả trước vẫn xác nhận được; đơn không tự huỷ.
5. Đơn công nợ còn nợ: hoa hồng không vào kỳ trả, không đối trừ; thu đủ thì vào.
6. Tin nhắc: đúng mốc, đúng người, không gửi lặp; đơn đã trả đủ không nhắc.
7. Đại lý A không xem được nợ của đại lý B bằng mọi đường.
8. Ngừng hồ sơ còn nợ: 409 nêu mã đơn; hết nợ thì ngừng được.
9. Mỗi điều có bài đỏ trước, thử phá đỏ rồi hoàn nguyên, có dòng `docs/SO-HANG-RAO.md`.

## Trang ghép

| (1) Bảng | Chứa | Đổi |
|---|---|---|
| bảng cài đặt công nợ (mới, của `billing`) | mức trần cho Quản trị | một dòng hiệu lực, không xoá cứng |
| `orders` | hai mốc giờ của đơn công nợ | đổi được qua lệnh nới hạn, không qua đường khác |
| bảng hoa hồng và kỳ trả | hoa hồng của mọi đơn | thêm điều kiện đơn công nợ đã thu đủ, thợ tra đúng chỗ đang tính |
| hộp thư Nền tảng | tin của mọi việc | thêm loại tin nhắc nợ; chống gửi lặp |

| (2) Ô quyền | Đổi | Áp cho |
|---|---|---|
| ô đặt trần (mới) | chỉ `SUPER_ADMIN` | mức trần |
| ô ghi hạn mức | `ADMIN` bị giới hạn bởi trần | Quản trị |
| ô nới hạn đơn (mới) | `ADMIN`, `SUPER_ADMIN` | đơn công nợ đã xác nhận |
| ô đại lý xem nợ (mới) | `PARTNER` phạm vi `own` | hồ sơ của chính tài khoản |

Thêm ô mới phải cập nhật bảng ghim ở `src/shared/permissions.test.ts`, không thêm mã quyền.

| (3) Cửa | Cổng máy chủ | Giao diện ẩn/hiện |
|---|---|---|
| Đặt hạn mức | ô ghi, rồi so trần ở máy chủ | ô nhập báo trần; máy chủ vẫn chặn |
| Nới hạn | ô nới, rồi trạng thái đơn | nút trên màn đơn, theo cờ máy chủ |
| Đại lý xem nợ | ô xem, `partyId` lấy từ phiên, không nhận từ trình duyệt | mục nhỏ trong trang của đối tác |
| Ngừng hồ sơ | luật ngừng hiện có, thêm kiểm nợ qua hàm do gốc lắp ráp tiêm; không đọc được thì chặn | câu báo nêu mã đơn |
| Trả hoa hồng | module hoa hồng hỏi `billing` qua view hoặc hàm tiêm | số hiện rõ khoản chờ thu đủ |
