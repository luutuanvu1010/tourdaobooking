# ADR-0228 — Công tắc đơn đối tác: tách «Ẩn thông tin khách» làm hai, miễn đủ tên khách có công tắc, đơn đối tác không cần giờ đón

- **Trạng thái:** **accepted** 2026-11-22 — chủ dự án trong phiên điều phối, nguyên văn (mục 2 và 3 của lời trả lời): *«2- Duyệt đề xuất, 3- Tên 3 công tắc mới: hãy đặt theo đúng bản chất, ngắn gọn và dễ hiểu. b- miễn (đặt tùy chọn miễn này có thể bật/tắt trong bảng điều khiển của Super Admin), c- chờ văn phòng, mục đích của việc này là cho đơn được hoàn tất ở màn của đối tác, không bị nghẽn. d- để sau.»* Hồ sơ lời chủ và cách đọc: `docs/superpowers/plans/2026-11-22-quyet-dinh-chu-ke-hoach-16-viec.md` (nhánh kế hoạch). Bản đề xuất trình chủ: `docs/superpowers/specs/2026-11-21-DE-XUAT-ADR-0228-tach-cong-tac-khach-va-gio-don.md`. AI soạn và chép lại, không tự duyệt.
- **Giả định ghi rõ (chủ bác được):** «mặc định Bật (miễn)» của công tắc ở Đ2 là cách phiên điều phối đọc chữ «miễn» và mục đích «đơn không bị nghẽn»; chủ không nói riêng vị trí mặc định.
- **Nguồn:** việc 8 của kế hoạch 16 việc (`docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md`, nhánh kế hoạch).
- **Số:** 0228 (giữ trước bởi phiên điều phối). Migration `0183` (giữ trước).
- **Loại:** việc lớn (luật lập đơn và gửi đơn của đối tác, ba bảng cài đặt mới). **Cửa:** một chiều mềm: bảng công tắc chỉ thêm ở lại; tắt / bật lại là về hành vi cũ; dấu miễn đã chụp lên đơn không đổi.
- **Quan hệ với ADR cũ:** **sửa** ADR-0154 Đ2 (một công tắc thành hai) và Đ3.1 (dấu miễn danh sách nay theo công tắc riêng ở Đ2, không theo công tắc ẩn khách). **Thêm** phương án «khác» của ADR-0193 câu (i) thành một công tắc riêng (Đ3); công tắc «Bắt buộc giờ đón cho đơn đối tác» giữ nguyên. **Giữ** ADR-0221 (nơi đón), ADR-0193 câu (ii), ADR-0047, luật THIEU_TEN của điều phối (đơn không mang dấu vẫn bị giữ), ADR-0154 Đ3.2–Đ3.4 (cách đọc dấu).
- **Xây trên lỗ đang hở:** HC-5.19 (có migration mới, chỉ thêm ba bảng). Chủ 22/11/2026 chấp nhận rủi ro không diễn tập khôi phục (mục 1 của lời trả lời); khoá `xay_tren_cho_phep_adr_0228` ở `docs/quyen-hoan.json`.

## Quyết định

1. **Đ1 — Tách công tắc khách làm hai.** Công tắc «Ẩn thông tin khách khi đối tác đặt vé» (bảng 0133) đổi tên thành **«Đối tác không nhập tên, SĐT khách»** và chỉ còn nói về tên, số điện thoại (kèm email, ghi chú khách, hồ sơ khách). Công tắc mới **«Đối tác không nhập danh sách hành khách»**: bật thì form của đối tác không có khối Hành khách, máy chủ bỏ danh sách gửi lên. Lúc phát hành, công tắc mới gieo đúng vị trí hiệu lực của công tắc cũ. Phạm vi như cũ: tài khoản Đối tác thuần (ADR-0154 C2).
2. **Đ2 — Công tắc «Đơn đối tác không cần đủ tên khách».** Bật thì đơn do tài khoản Đối tác thuần lập lúc đó mang dấu miễn danh sách (`orders.manifest_exempt = 1`, chụp lúc lập — cách đọc dấu theo ADR-0154 Đ3.2–Đ3.4), nên xe chạy được dù chưa đủ tên. Tắt thì đơn mới không mang dấu, xe phải đủ tên. Gieo **Bật** (giả định ghi ở trên). Đơn đã lập giữ dấu như lúc lập.
3. **Đ3 — Công tắc «Đơn đối tác không cần giờ đón».** Gieo Tắt. Bật thì lượt đầu có Đón chưa giờ không còn là lý do đưa đơn của Đối tác sang văn phòng xét: dịch vụ không cần kiểm vé thì đơn xác nhận ngay, văn phòng chốt giờ sau bằng «Sửa đưa đón», xe chưa xếp được tới khi có giờ. **Lượt đón đã vào hạn chốt vẫn chờ văn phòng** (chủ: «c- chờ văn phòng»), vì đối tác không có ô giờ để tự sửa mà ADR-0193 (ii) cấm xác nhận khi thiếu giờ lúc đó. Kiểm định kỳ `R-ORD-17w` không đếm đơn xác nhận lúc công tắc này Bật.
4. **Để sau (chủ: «d- để sau»):** gộp «Bắt buộc giờ đón» và «Đơn đối tác không cần giờ đón» thành một lựa chọn ba mức.
5. **Thêm cùng đợt (bề mặt):** trang đơn không lặp mục — dải tóm tắt bỏ ô «Khách» và nơi đón; khối Khách hàng bỏ dòng «Tên» khi trùng «Bên đặt».

## Trang ghép

- **Bảng nào chứa gì:** ba bảng mới chỉ chứa dòng bật/tắt (không dữ liệu khách). Bảng đơn, hành khách, lượt đón: không đổi cột.
- **Quyền:** đổi bốn công tắc: chỉ Toàn quyền (ô `settings.ops`). Không thêm quyền. Văn phòng sửa giờ đón, danh sách khách bằng nút đang có.
- **Cổng nào canh cửa nào:** lập đơn: máy chủ đọc hai công tắc khách (bỏ trường bị ẩn) và công tắc miễn đủ tên (chụp dấu). Lưu nháp: hai công tắc khách; dấu không đổi. Gửi đơn: công tắc giờ đón (`diNhanhAViThieuGio`, cùng hàm ở khối «xác nhận» của trang đơn). Cho xe chạy: luật THIEU_TEN đọc dấu như cũ. Giao diện: form đối tác ẩn khối Khách hàng / Hành khách theo từng công tắc; trang Tôi có bốn khối.

## Tiêu chí nghiệm thu

- Vị trí gieo: mọi thứ như bản trước, trừ đơn đối tác mới mang dấu miễn (Đ2 gieo Bật).
- Tắt «danh sách hành khách», giữ «tên, SĐT»: đối tác vẫn nhập tên, SĐT khách, không thấy khối Hành khách.
- Tắt «Đơn đối tác không cần đủ tên khách»: chuyến chở khách của đơn mới bị giữ «thiếu tên» tới khi đủ tên.
- Bật «không cần giờ đón»: đơn có đón chưa giờ, dịch vụ không cần kiểm vé ⇒ xác nhận ngay; lượt đón hôm nay chưa giờ ⇒ vẫn qua văn phòng.
- Tài khoản khác Toàn quyền đổi công tắc ⇒ 403. Bài kiểm: `src/modules/orders/an-khach-route.test.ts`, `khong-can-gio-don.test.ts`, `src/migrations-tach-cong-tac-khach.test.ts`, `src/audit-invariants.test.ts` (R-ORD-17w); kịch bản Chrome `docs/evidence/2026-11-21-viec-8/kich-ban/viec-8-smoke.mjs`.
