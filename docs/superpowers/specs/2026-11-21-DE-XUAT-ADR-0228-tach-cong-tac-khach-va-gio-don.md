# ĐỀ XUẤT ADR-0228 — Tách công tắc «Ẩn thông tin khách» làm hai; thêm công tắc «Đơn đối tác không cần giờ đón»

> Ngày 21/11/2026. Trạng thái: **đề xuất, chờ chủ duyệt**. Nguồn: việc 8 của kế hoạch 16 việc (`docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md` trên nhánh kế hoạch, mục 5 «Việc 8» và mục 8). Chủ duyệt thì bản này thành `docs/adr/ADR-0228-…md`. Migration giữ trước: `0183`.

- **Loại:** việc lớn (luật lập đơn và gửi đơn của đối tác, hai bảng cài đặt mới). **Cửa:** một chiều mềm: bảng công tắc chỉ thêm ở lại; tắt công tắc là về hành vi cũ.
- **Quan hệ với ADR cũ:** **sửa** ADR-0154 Đ2 (một công tắc thành hai) và Đ3 (xem câu 2); **thêm** phương án «khác» của ADR-0193 câu (i) thành một công tắc riêng, không bỏ công tắc «Bắt buộc giờ đón cho đơn đối tác». **Giữ** ADR-0221 (nơi đón), ADR-0193 câu (ii) (lượt chưa giờ sát hạn chốt không xác nhận được), ADR-0047 (danh sách hành khách), luật THIEU_TEN của điều phối.
- **Xây trên lỗ đang hở:** HC-5.19 (có migration mới, chỉ thêm hai bảng; cần khoá cho phép trong `docs/quyen-hoan.json`, tiền lệ ADR-0193, ADR-0221).

## Quyết định (ba điều)
1. **Đ1 — Tách công tắc khách làm hai.** Công tắc đang có chỉ còn nói về **tên, số điện thoại** (và email, ghi chú khách) — đổi tên theo câu 1. Thêm công tắc mới về **danh sách hành khách**: bật thì form của đối tác không có khối Hành khách, máy chủ bỏ danh sách đối tác gửi lên. Lúc phát hành, công tắc mới được gieo **đúng vị trí của công tắc cũ lúc đó**, nên không ai thấy gì đổi cho tới khi Toàn quyền bấm. Phạm vi như hôm nay: tài khoản Đối tác thuần.
2. **Đ2 — Chuyến xe vẫn đòi đủ tên khách trước khi xuất bến.** Đơn đối tác lập sau bản này **không còn được miễn** «đủ tên khách» (dù công tắc nào đang bật); văn phòng hoặc đối tác bổ sung tên sau khi đơn xác nhận, bằng nút «Sửa danh sách hành khách» đang có. Đơn cũ đã mang dấu miễn giữ nguyên. *(Đây là điểm đổi so với hôm nay: ADR-0154 Đ3 chủ chọn «Bỏ luật với đơn của đối tác». Xem câu 2.)*
3. **Đ3 — Công tắc «Đơn đối tác không cần giờ đón».** Gieo **Tắt** (đúng hôm nay). Bật thì đơn có đón của đối tác mà chưa có giờ **không bị chuyển sang văn phòng xét chỉ vì thiếu giờ**: dịch vụ không cần kiểm vé thì đơn xác nhận ngay, văn phòng chốt giờ sau bằng «Sửa đưa đón»; xe chưa xếp được tới khi có giờ (như hôm nay). **Ngoại lệ an toàn:** lượt đón đã sát hạn chốt (ví dụ đón ngay hôm nay) thì đơn vẫn qua văn phòng, vì đối tác không tự nhập giờ được mà luật ADR-0193 (ii) cấm xác nhận khi thiếu giờ lúc đó.

## Trang ghép
- **Bảng nào chứa gì:** hai bảng mới, mỗi bảng chỉ chứa dòng bật/tắt (không dữ liệu khách). Bảng đơn, bảng hành khách, bảng lượt đón: không đổi cột; dấu «miễn danh sách» của đơn mới luôn là 0.
- **Quyền:** bật, tắt ba công tắc: chỉ Toàn quyền (ô cài đặt vận hành đang có). Không thêm quyền mới. Văn phòng sửa giờ đón, danh sách khách: nút đang có.
- **Cổng nào canh cửa nào:** lập và lưu nháp: máy chủ đọc hai công tắc khách, bỏ trường bị ẩn. Gửi đơn: máy chủ đọc công tắc giờ đón. Xuất bến: luật THIEU_TEN như mọi đơn. Giao diện: form đối tác ẩn khối Khách hàng / Hành khách theo từng công tắc; trang Tôi có thêm hai nút.

## Thêm cùng đợt (bề mặt, không cần duyệt riêng)
Trang đơn sau «Gửi đơn» không lặp mục: dải tóm tắt đầu trang bỏ ô «Khách» (đã có ngay khối Khách hàng bên dưới) và bỏ nơi đón ở ô «Đón» (đã có ở khối Đưa đón); khối Khách hàng bỏ dòng «Tên» khi trùng «Bên đặt».

## Tiêu chí nghiệm thu
- Ba công tắc ở vị trí gieo: mọi thứ như bản 3.25.
- Tắt «danh sách hành khách», giữ «tên, SĐT»: đối tác vẫn nhập tên, SĐT khách, không thấy khối Hành khách; chuyến chở khách đơn đó vẫn bị giữ «thiếu tên» tới khi đủ tên.
- Bật «không cần giờ đón»: đối tác gửi đơn có đón chưa giờ, dịch vụ không cần kiểm vé ⇒ đơn xác nhận ngay; lượt đón hôm nay chưa giờ ⇒ vẫn qua văn phòng.
- Tài khoản khác Toàn quyền đổi công tắc ⇒ bị từ chối.

## Điều chủ cần quyết (mỗi câu có khuyến nghị)
1. **Tên ba công tắc** (bảng tham chiếu chưa có): (a) công tắc cũ đổi tên: «Đối tác không nhập tên, SĐT khách» (khuyến nghị) / «Ẩn tên, SĐT khách khi đối tác đặt vé»; (b) công tắc mới: «Đối tác không nhập danh sách hành khách» (khuyến nghị) / «Ẩn danh sách hành khách khi đối tác đặt vé»; (c) «Đơn đối tác không cần giờ đón» (khuyến nghị) / «Văn phòng chốt giờ đón sau xác nhận». Khuyến nghị theo khuôn tên «Đối tác không nhập nơi đón» chủ đã chọn.
2. **Miễn «đủ tên khách»:** bỏ miễn cho đơn mới, chuyến vẫn đòi đủ tên trước khi xuất bến (khuyến nghị — đúng kế hoạch, an toàn với quy định xe hợp đồng; đổi lại văn phòng phải bổ sung tên) / giữ miễn như hôm nay khi công tắc «danh sách hành khách» bật.
3. **Lượt đón sát hạn chốt khi bật «không cần giờ đón»:** vẫn qua văn phòng (khuyến nghị — nếu không, đối tác bấm Gửi đơn sẽ bị từ chối mà không tự sửa được) / chặn gửi và báo đối tác gọi văn phòng.
