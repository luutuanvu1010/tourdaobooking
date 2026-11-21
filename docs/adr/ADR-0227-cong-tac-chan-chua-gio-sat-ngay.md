# ADR-0227 — Công tắc của Toàn quyền cho chặn «đơn chưa có giờ đón mà sát ngày đón»; gom công tắc lập đơn vào nhóm «Cài đặt lập đơn»

- **Trạng thái:** **proposed** 2026-11-21 — AI soạn theo việc 7 của kế hoạch `docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md` (nhánh `claude/partner-features-detailed-plan-f32f89`). Mã đã thi công trên nhánh theo **giả định** vị trí mặc định Bật và tên nút phương án (1) (hai câu đã gửi chủ qua phiên điều phối, chưa có trả lời lúc soạn). Chủ chọn khác thì chỉ đổi giá trị gieo trong migration 0182 (chưa áp lên bản thật) và chữ nút.
- **Ngày:** 2026-11-21.
- **Loại:** việc lớn (luật xác nhận đơn, một bảng cài đặt mới). **Cửa:** hai chiều — bật lại là về đúng hành vi hôm nay; bảng công tắc chỉ thêm ở lại.
- **Sửa:** ADR-0193 câu (ii) — thêm «khi công tắc Bật». Không sửa nguyên văn ADR-0193.
- **Xây trên lỗ đang hở:** HC-5.19 (có migration mới). Cần chủ ghi lời «Cho phép xây trên HC-5.19, có lý do» khi duyệt; khoá cho phép chưa ghi vào `docs/quyen-hoan.json`.
- **Số quyết định chạm quyền/dữ liệu:** 1.

## Bối cảnh
Hôm nay có bốn chỗ chặn đơn thiếu giờ đón. Chỗ (2) — bắt buộc giờ đón cho đơn đối tác — đã có công tắc (ADR-0193 mục 1). Chỗ (3) — mọi đơn có lượt đón chưa giờ mà ngày đón đã vào hạn chốt thì không xác nhận được (ADR-0193 câu (ii)) — chưa có công tắc. Chủ muốn bỏ được chặn này. Các công tắc lập đơn của Toàn quyền đang rải trên trang Tôi.

## Quyết định
1. **Đ1 — Công tắc «Chặn đơn chưa có giờ đón khi sát ngày đón».** Theo khuôn ADR-0193 (bảng chỉ thêm `ord_pickup_deadline_policy`, nhật ký `pickup_deadline_policy_changed`, ô quyền `settings.ops` — chỉ Toàn quyền; máy chủ kiểm lại). Gieo **Bật** (đúng hành vi hôm nay); không có dòng nào cũng coi là Bật. Khi Tắt: lượt đón chưa giờ đã vào hạn chốt không còn chặn xác nhận ở cả ba cửa (`/status`, Gửi đơn tự xác nhận, Còn vé). Mỗi cửa đọc công tắc **một lần** lúc bấm; cùng giá trị đó vào kiểm tra trước khi ghi, vào câu SQL xác nhận và vào phần chẩn đoán khi ghi thua — ba lớp không lệch nhau.
2. **Đ2 — Nhóm «Cài đặt lập đơn».** Trang Tôi gom năm công tắc lập đơn (Dịch vụ nhập tay, Ẩn thông tin khách, Bắt buộc giờ đón cho đơn đối tác, Đối tác không nhập nơi đón, công tắc mới) dưới một tên nhóm. Chỉ đổi cách trình bày; mỗi công tắc giữ đường máy chủ và quyền như cũ.

## Không đổi
Chỗ (1) đơn đối tác có đón chưa giờ luôn qua văn phòng (thuộc việc 8); chỗ (2) và công tắc của nó; cổng hạn chốt và Đặt gấp cho lượt **đã có** giờ; điều phối không xếp xe cho lượt chưa giờ; kiểm định kỳ `R-ORD-17w`.

## Trang ghép
- **Bảng mới `ord_pickup_deadline_policy`:** chỉ chứa dòng công tắc (cờ 0/1, mốc giờ, id nhân viên). Không dữ liệu cá nhân.
- **Quyền:** đọc: `order.create` (người lập đơn); đổi: `settings.ops` (chỉ Toàn quyền). Không thêm ô quyền.
- **Cổng:** ba cửa xác nhận đơn đọc công tắc; giao diện chỉ hiện khối cho tài khoản máy chủ trả «đổi được»; nhóm tự ẩn khi không khối nào hiện.

## Hệ quả khi Tắt (nói một lần)
Tắt là mở lại lỗ ADR-0193 đã vá: đơn đón hôm nay hoặc ngày mai mà chưa có giờ được xác nhận thẳng, vé mở khi chưa có giờ, điều phối chưa xếp được xe cho tới khi văn phòng điền giờ.

## Tiêu chí nghiệm thu
- Toàn quyền tắt → nhân viên xác nhận đơn đón hôm nay chưa có giờ → được; bật lại → bị chặn với câu cũ.
- Tài khoản khác không thấy công tắc; gọi thẳng máy chủ để đổi → 403.
- Bài kiểm: `src/modules/orders/cong-tac-chan-chua-gio.test.ts`, `src/migrations-cong-tac-chan-chua-gio.test.ts`.

## Điều chủ cần quyết
1. Vị trí mặc định: Bật (khuyến nghị, giữ an toàn như hôm nay) hay Tắt (đúng chữ «bỏ chặn»).
2. Tên nút: (1) «Tắt chặn chưa có giờ đón / Bật chặn chưa có giờ đón» (khuyến nghị) hay (2) «Tắt bắt buộc giờ đón sát ngày / Bật bắt buộc giờ đón sát ngày».
3. Cho phép xây trên HC-5.19.
