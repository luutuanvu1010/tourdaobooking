# Màn Tạo đơn bốn bước và chữ "Khách có mặt" (2026-10-14)

Đặc tả ngắn viết TRƯỚC khi thi công (hồ sơ có ngày). Chủ dự án duyệt 14/10/2026: «chốt tên "Khách có mặt", làm bản bốn bước». Chỉ đổi chữ hiển thị và cách vẽ / sắp xếp; không đổi dữ liệu, quyền, tiền, máy chủ. Nguồn ý: `docs/evidence/2026-10-13-dot-1/sau/huong-khuyen-nghi-390.png`, `docs/superpowers/specs/2026-10-13-khach-co-mat-thay-check-in.md` (phương án A), `.../2026-10-13-prompt-claude-design-tao-don-bon-buoc.md`. **Chưa có mockup chủ duyệt**: làm theo ảnh phác và mô tả ở các tài liệu đó.

## 1. Việc A: nhãn "Khách có mặt" (chỉ chữ; cột `checkin_*`, khoá `checkinDate/Time/Place` giữ nguyên)

| Nơi | Trước | Sau |
|---|---|---|
| Form Tạo/sửa đơn, bảng "Sửa thông tin chuyến" | nhóm "Check-in", "Ngày/Giờ/Nơi check-in" | nhóm "Khách có mặt", "Có mặt lúc", "Có mặt tại" (chữ mờ "Ví dụ: Cảng Vinpearl"); ngày ẩn, lối "Có mặt khác ngày"; ngày LUÔN hiện khi đã có giá trị |
| Phiếu gửi khách (`order-confirmation.ts`) | "Check-in", "Đón khách" | "Khách có mặt", "Xe đón khách" |
| Màn hướng dẫn viên, trang đơn, tóm tắt thẻ | "Check-in …" | "Khách có mặt …" |
| Tin báo đổi đơn, nhật ký chuyến, lỗi kiểm máy chủ | "ngày/giờ/nơi check-in" | "ngày/giờ/nơi khách có mặt" |

Nhật ký cũ trên production vẫn mang chữ "check-in" (nhật ký chỉ-thêm), nên hàm đọc tin (`tin-doi-don.ts`) nhận CẢ chữ cũ lẫn chữ mới; bài kiểm giữ ca chữ cũ.

## 2. Việc B: bốn bước trên một trang cuộn

1. Thanh tiến độ dính (phương án A): bốn chấm tròn đánh số + chữ «Khách», «Dịch vụ», «Thanh toán», «Phụ trách»; bấm thì cuộn tới bước; bước đủ thông tin có dấu ✓; bước đang xem nổi bật theo vị trí cuộn. Vai không chọn được người phụ trách (Thực tập, Đối tác thuần) và lúc sửa đơn: chỉ ba bước.
2. Thứ tự: (1) Ngày khởi hành + Khách, (2) Dịch vụ (+ Hành khách), (3) Thanh toán + Tóm tắt, (4) Người phụ trách. Thanh dính đáy giữ nguyên.
3. Gập: Email + Ghi chú của khách sau «+ Thêm chi tiết (email, ghi chú)»; Xe riêng, Xe tối thiểu, Số hiệu chuyến bay sau «+ Thêm chi tiết» TRONG từng chặng; chặng đã đủ nơi đón và không ô ít dùng nào có giá trị gọn thành MỘT dòng («Chiều đi · Đón 07:30 · Khách sạn ABC → Cảng Vinpearl»); «Thông tin chuyến» (giờ khởi hành + Khách có mặt + ghi chú dịch vụ) gập sẵn.
4. **An toàn của phần gập:** (a) tự mở khi bên trong có giá trị khác mặc định (mở nháp, bản sửa, người dùng đã gõ); (b) tự mở và cuộn tới ô lỗi khi Lưu bị từ chối (kiểm ở máy khách lẫn lỗi 400 của máy chủ — máy chủ không chỉ ra ô, nên khi đó mở mọi khối gập của dịch vụ hoặc của khách bị nêu); (c) `aria-expanded` + `aria-controls`, tới được bằng bàn phím; (d) nội dung gập chỉ ẩn bằng `hidden`, vẫn nằm trong cây DOM — không ô nào mất, thân gửi lên không đổi.

## 3. Tiêu chí nghiệm thu (đo bằng kịch bản Chrome `docs/evidence/2026-10-14-tao-don-bon-buoc/kich-ban/chup-anh.mjs`)

Số đo bản trước (1.91 trên main, Bán hàng, 390, chiều cao trang): vào 2.424 px; một dịch vụ (TD101, 2 khách, có đưa đón, chưa mở gì) **3.716 px**; mở hết mọi khối 4.114 px; lỗi lưu 4.445 px. Máy tính (1040): một dịch vụ 3.124 px. (Con số 4.144 px của đợt 1 là đơn có mở «Thông tin chuyến»; ở đây đo cả trạng thái mặc định.)
- T1: ở 390, trạng thái «một dịch vụ» của Bán hàng **giảm ít nhất 10%** (≤ 3.344 px) và «vào» giảm (< 2.424 px).
- T2: mọi ô của form cũ (id, `data-o`, `data-trip`, `data-action` mà bài kiểm / kịch bản dùng) vẫn có trong DOM và tới được sau khi bấm mở khối gập.
- T3: khối gập tự mở khi có dữ liệu: mở lại nháp có email, ghi chú, xe riêng, xe tối thiểu, nơi/giờ có mặt thì các khối đó mở sẵn; nháp «sạch» thì chặng gọn một dòng.
- T4: khối gập tự mở khi lỗi: chặng gọn + xoá nơi đón (hoặc gõ số chỗ sai) rồi Lưu → chặng mở, ô lỗi hiện và nhận focus; lỗi 400 giả của máy chủ mở khối bị nêu.
- T5: thân POST và PUT gửi lên máy chủ cho cùng thao tác **giống nhau từng byte** (đã bỏ id ngẫu nhiên và dấu khoá lạc quan) so với bản trước (`than-gui-truoc.json` / `than-gui-sau.json`).
- T6: thanh tiến độ: bấm «Dịch vụ» cuộn tới bước 2; bước có tên + SĐT khách hiện ✓; bước đang xem đổi theo cuộn.
- T7: axe không thêm vi phạm; không lỗi console; typecheck 0 lỗi, `npm test` xanh; hàng rào mới có quan sát đỏ thật (phá mã một lần → đỏ → hoàn nguyên).

## 4. Giả định (chủ chưa nói; đều hoàn tác được)

1. «Xe đón khách» thay «Đón khách» trên phiếu gửi khách (theo khuyến nghị nghiên cứu 13/10, chủ chưa trả lời riêng câu này).
2. Chấm ✓: Khách = có ngày khởi hành + tên + SĐT; Dịch vụ = có dịch vụ và không dịch vụ nào còn lỗi chặn Lưu; Thanh toán = có dịch vụ và số tiền không vượt tạm tính / tổng (bước này không bắt buộc ô nào); Phụ trách = đã chọn người.
3. Chặng mới tạo (nơi đón còn trống) mở sẵn vì phải nhập; chặng chỉ gọn khi mở nháp / đủ nơi đón ngay lúc dựng, và đã mở thì giữ mở (không tự gập giữa lúc đang gõ).
4. Khi Lưu bị từ chối, cuộn tới ô lỗi đầu tiên (kể cả điện thoại; trước đây cuộn tới banner cuối form) và hiện thêm câu lỗi dưới ô tên/SĐT; banner vẫn liệt kê đủ.
5. Ngày «Có mặt» hiện khi có giá trị khác rỗng (kể cả trùng ngày khởi hành), không dùng `canHienNgayDon` vì ô này không tự điền ngày.
6. Số phiên bản nhật ký thay đổi là số TẠM, phiên phát hành quyết ở bước A.0.

## 5. Không làm

Quyền, tiền (`buildLines`), migration, schema, `coODatQuaDoiTac`, luật lọc danh mục theo vai (ADR-0033), `playbook/`, `CLAUDE.md`, `.claude/`, ADR. Chưa kiểm trên iPhone thật (ô ngày giờ gốc): thử bằng `node scripts/dev-iphone.mjs`.

## 6. Sau kiểm độc lập (2026-10-14, người điều phối giao sửa; bản trên là hồ sơ lúc soạn, mục này ghi điều ĐỔI)

Người kiểm độc lập kết luận ĐẠT CÓ ĐIỀU KIỆN. Đã sửa:

1. **Thanh dính che ô đang focus (WCAG 2.2 mục 2.4.11).** Người kiểm đo Shift+Tab ngược từ cuối form: 1040 có 17/60 điểm dừng bị che phía trên, 390 có 30/59. Sửa bằng token `--dinh-form` (thanh tiến độ + khoảng đệm; điện thoại cộng thêm thanh trên cùng và vùng an toàn) cho `scroll-padding-top` của trang và `scroll-margin-top` của từng ô / bước. Kịch bản mới `kich-ban/diem-dung-bi-che.mjs` bấm Tab xuôi và Shift+Tab ngược bằng phím thật, bốn vai × 390 / 1040 × (mặc định, mở hết khối gập), khẳng định 0 điểm bị thanh tiến độ / thanh trên che; đã quan sát đỏ khi tắt hai thuộc tính. Thanh Lưu đáy và nút nổi Hỗ trợ có từ trước nên chỉ được đếm, không khẳng định; chưa đo khổ 641–959px.
2. **Số hiệu chuyến bay không gập nữa.** Tài xế dựa vào ô này để tự tra giờ bay. Nay ô hiện sẵn khi nơi đón / trả là sân bay hoặc đã có số hiệu; chặng có ô này luôn mở (không gập một dòng); chỉ Xe riêng và Xe tối thiểu còn sau «Thêm chi tiết (xe riêng, số chỗ)». Hàm thuần `chiTietChangCoGiaTri` bỏ `flightCode`; `changNenGon` nhận thêm cờ `coOSoHieuChang`. Bài thuần cập nhật trước (đỏ), rồi mã (xanh).
3. **✓ Khách hiện cả khi SĐT sai định dạng — GIỚI HẠN ĐÃ BIẾT.** Máy chủ từ chối bằng `PHONE_RE` ở `src/modules/orders/rules.ts`; chưa có hàm kiểm SĐT dùng chung ở `src/shared/` mà `web/` import được, nên KHÔNG chép biểu thức sang `web/` (hai luật dễ lệch) và không sửa `src/modules`. Đề xuất việc riêng: đưa hàm kiểm SĐT lên `src/shared/` rồi dùng cho ✓ Khách.
4. **Chấm vừa bấm giữ làm chấm đang xem** tới khi người dùng tự cuộn (con lăn, chạm kéo, phím cuộn) hoặc chuyển focus sang ô khác — trang đã ở đáy (máy tính) không cuộn thêm nên vị trí cuộn không nói đúng bước muốn tới. Đã quan sát đỏ. **✓ Thanh toán nghĩa là «không có lỗi tiền», không phải «đã điền»**: không đổi hình thức (ẩn ✓ khi mọi ô tiền trống sẽ làm bước này không bao giờ ✓ với đơn trả sau — đổi nghĩa, cần chủ quyết); ghi giới hạn.
5. **Hàng rào nối dây khối gập** vào `docs/SO-HANG-RAO.md` (hai dòng, ngày quan sát 2026-10-14; ghi rõ phần dựa vào kịch bản Chrome, ngoài `npm test`) và thêm bài văn bản trong `npm test` `src/khoi-gap-noi-day.test.ts` (xoá một lời gọi nối dây → đỏ). Người kiểm phá thử năm chỗ: ba chỗ đỏ đúng, hai chỗ chỉ đỏ khi phá cả hai lớp dự phòng cùng lúc.
