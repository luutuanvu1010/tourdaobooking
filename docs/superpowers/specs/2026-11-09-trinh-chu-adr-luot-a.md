# Trình chủ — ADR lượt A (ba quyết định)

> Đề xuất, chờ chủ duyệt. Chi tiết: ADR-0188, ADR-0189, ADR-0190 ở `docs/adr/`, trang ghép `docs/superpowers/specs/2026-11-09-trang-ghep-adr-luot-a.md`. Hồ sơ có ngày: duyệt xong thì đóng băng.

**Kết luận.** Ba sửa đổi này đều là siết lại, không mở thêm quyền nào, không cần sửa cơ sở dữ liệu. Duyệt xong thì phiên thi công Đợt 2 mới bắt đầu viết mã. Một trong ba (đơn trả sau) nằm trong vùng sổ tiền còn một lỗi đang mở, nên câu duyệt cần thêm chữ «Cho phép, có ghi lý do».

## Quyết định 1 — Đổi bên đặt của đơn trả sau (ADR-0188)

Hôm nay, đơn trả sau đã thu đủ tiền có thể đổi sang bất kỳ ai, kể cả người không được cấp hạn mức. Nếu sau đó có khoản thu bị huỷ, món nợ rơi vào người không ai cấp hạn mức.

- **Khuyến nghị:** chỉ cho đổi sang bên có hạn mức trả sau còn hiệu lực, không có đơn quá hạn; không đổi sang khách lẻ. Cửa gộp hồ sơ chặn cùng cách (lựa chọn 4a). Ba câu báo dùng đúng phương án (1) của phiếu chữ.
- Phương án khác: chỉ chặn đổi bên đặt, để cửa gộp hồ sơ lại sau (ghi vào danh sách việc để sau).
- **Phải biết:** việc này chạm vùng có lỗi «bút toán điều chỉnh chưa có người duyệt thứ hai» (hạn 30/11). Lý do vẫn nên cho làm: nó chỉ thêm điều kiện từ chối, không thêm cách ghi sổ nào.

## Quyết định 2 — Tài xế không còn thấy khách của chuyến quên bấm «Kết thúc» (ADR-0189)

Hôm nay tài xế quên bấm «Kết thúc» thì còn thấy tên, số liên hệ khách nhiều ngày sau.

- **Khuyến nghị:** từ 0 giờ ngày thứ hai sau ngày xe chạy, máy tài xế không còn tên, năm sinh, số liên hệ, chỉ đường; tài xế vẫn bấm đón, vắng, trả, Kết thúc được; trên màn có dòng nhắc «Chuyến chưa bấm Kết thúc — tên khách đã ẩn. Bấm Kết thúc khi xong hoặc báo văn phòng.» Văn phòng thấy như cũ.
- Phần **máy tự kết thúc chuyến** không nằm trong lượt này, vì cách duy nhất máy làm được hôm nay sẽ ghi mọi khách chưa xong thành «chuyến bị gián đoạn», tức ghi sai. Bạn đã đồng ý tách phần đó ra hôm 9/11.

## Quyết định 3 — Ai được ngừng dùng hồ sơ khách (ADR-0190)

Hôm nay mọi nhân viên Bán hàng, Kế toán đều tắt được hồ sơ khách dùng chung, làm đơn nháp của đồng nghiệp không lưu được, và nhật ký không ghi việc tắt.

- **Khuyến nghị:** chỉ Quản trị và Toàn quyền tắt hoặc bật lại hồ sơ (khách, đại lý, người chưa có tài khoản); Bán hàng vẫn sửa tên, số như cũ; nhật ký ghi rõ «ngừng dùng» hoặc «dùng lại».
- Phương án khác: giữ như cũ, chỉ thêm dòng nhật ký (không chặn được việc làm hỏng đơn của người khác).

## Câu duyệt mẫu (chép nguyên rồi gửi, hoặc sửa)

> Duyệt ADR-0188, ADR-0189, ADR-0190 theo khuyến nghị, kể cả chặn cửa gộp hồ sơ (4a). Với ADR-0188: Cho phép, có ghi lý do (xây trên lỗi HC-4.2, vì chỉ siết, không thêm cách ghi sổ).

Nếu bạn chưa muốn cho xây trên lỗi đang mở, gửi: «Duyệt ADR-0189, ADR-0190; ADR-0188 chờ lỗi HC-4.2 đóng.» Khi đó đơn trả sau tạm chưa được sửa, nhưng theo lời cấm cấp hạn mức trả sau đang áp thì chưa đối tác nào có hạn mức, nên chưa ai bị ảnh hưởng (điều này chưa kiểm trên bản thật).
