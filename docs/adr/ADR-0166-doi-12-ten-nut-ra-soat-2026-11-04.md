# ADR-0166 — Đổi 12 tên nút sau rà soát 4/11, kèm bốn chỗ đổi cách chạy (gán cấp cho đối tác, bỏ ghi đè giá, xác nhận đơn có hộp hỏi, tách nhãn «Chưa xác nhận»)

- **Trạng thái:** **accepted** — chủ dự án trả lời trang `docs/superpowers/specs/2026-11-04-ra-soat-nut-bam/TOM-TAT-CHO-CHU.md` ngày 2026-11-04, nguyên văn: *«Về cơ bản tôi đồng ý với tất cả những đề xuất của bạn ở trên»* (ghi ở `QUYET-DINH-CHU.md` cùng thư mục). AI soạn và ghi lại, không tự duyệt (Hiến pháp N3, N9).
- **Ngày:** 2026-11-04. **Số:** 0166 (0161 là số lớn nhất trong thư mục lúc soạn; 0162–0165 đang chờ ở nhánh khác, chưa nhập).
- **Thay câu của** (chỉ CHỮ hiện cho người dùng và các chỗ nêu ở mục «Đổi cách chạy»; thân các ADR cũ không sửa): **ADR-0030** (nhãn «Chờ xác nhận» cho đơn chưa gửi, Q-A2: phần này CHỈ bị thay khi việc tách nhãn ở câu 5 được thi công, xem mục «Chưa thi công»); **ADR-0108 điểm (f)** (tên nút «Khách đã chuyển khoản» → «Ghi khoản thu này»); **ADR-0136** (dòng 33: nút «Gửi xác nhận» → «Gửi kiểm vé»; dòng 58: nút «Lưu, chờ xác nhận» → «Lưu đơn (chưa xác nhận)»; nút «Còn vé» → «Còn vé, xác nhận đơn» và thêm một bước hỏi). Cơ chế và mã nội bộ (`data-action`, đường API, tên cột, mã nhật ký) không đổi.

## Bối cảnh

Rà soát 4/11 đọc 298 việc quan trọng trong 874 nút (hồ sơ `docs/superpowers/specs/2026-11-04-ra-soat-nut-bam/`). Chủ chọn tên cho 12 nút tên chưa rõ hoặc gây hiểu lầm. ADR-0130 đã cho phép đổi tên thuần bằng cách thêm dòng vào bảng từ, nhưng ba quyết định đã duyệt đang ghi tên cũ, và bốn nút đổi cả cách chạy, nên cần bản ghi này trước khi sửa mã.

## Quyết định

1. **Bảng đổi tên** (mỗi tên đổi cùng lúc ở nút, câu báo, nhãn nhật ký hiện cho người dùng, Hướng dẫn và kịch bản kiểm; chữ cũ được thêm vào `TU_DA_LOAI`/`CAM_THEO_TEP` ở `src/shared/bang-tu-giao-dien.ts`):

| Câu | Cũ | Mới |
|---|---|---|
| 1 | Thêm vai trò vào cấp này | Hai nút «Gán cho vai trò» và «Gán cho đối tác» (ô chọn trong hộp giữ «Vai người dùng») |
| 2 | Bỏ ghi đè | Bỏ ghi đè giá (dấu Ẩn được giữ) |
| 3 | Chuẩn bị N vé để gửi | Mở vé để gửi khách (kèm câu báo vé không về kho, cả ở «Tạo đường dẫn cho khách») |
| 4 | Còn vé | Còn vé, xác nhận đơn (kèm hộp hỏi lại) |
| 5 | Lưu, chờ xác nhận | Lưu đơn (chưa xác nhận); hộp ảnh «Xác nhận đơn để gửi khách» → «Ảnh gửi khách» |
| 6 | Đòi được khách / huỷ khoản | Ghi khoản thu đòi được |
| 7 | Cứu hộ | Kết thúc gián đoạn (xe hỏng) |
| 8 | Gửi xác nhận | Gửi kiểm vé |
| 9 | Đóng (liên hệ · điều kiện cho xe chạy · điều khoản người bán) | Ngừng dùng · Ngừng điều kiện · Ngừng điều khoản (nút «Đóng» chỉ gập khung giữ nguyên) |
| 10 | Khách đã chuyển khoản | Ghi khoản thu này |
| 11 | Hẹn ngày kết thúc | Đặt ngày kết thúc (kèm câu «chỉ đặt được một lần») |
| 12 | Ẩn / Hiện lại / Đã ẩn ở Dịch vụ & giá | Ngừng bán / Mở bán lại / Đã ngừng bán. Nút «Ẩn» mới của Toàn quyền (ADR-0164) không thuộc ADR này |

2. **Đổi cách chạy** (việc lớn: bài đỏ trước xanh sau, người kiểm độc lập):
   - **Câu 1:** ở trang chi tiết cấp có hai nút. «Gán cho vai trò» chạy như nút cũ. «Gán cho đối tác» mở hộp cấp riêng (`datCapRieng`) với cấp đang xem chọn sẵn; hộp vẫn bắt chọn đối tác. Không đổi dữ liệu hay API. Ba tên của cấp riêng ở Danh bạ và Quản lý tài khoản dùng chung «Chọn cấp riêng cho đối tác».
   - **Câu 2:** `DELETE /api/catalog/:code/override` hôm nay xoá cả dòng ghi đè nên mất luôn dấu Ẩn (SYSTEM-DESIGN dòng «bỏ toàn bộ ghi đè»; đặc tả `2026-10-30-tinh-trang-ban-va-phu-thu/B-dong-ban/DE-XUAT-ADR.md` H5 cũng mô tả như vậy, đó là đề xuất chưa duyệt). Nay chỉ bỏ giá: dịch vụ đang ẩn vẫn ẩn và về giá Sheet; dịch vụ không ẩn thì không còn dòng ghi đè. Không có ADR đã duyệt nào ghi hành vi cũ; `docs/SYSTEM-DESIGN.md` (tài liệu mô tả) sửa cùng lần lưu.
   - **Câu 4:** bấm «Còn vé, xác nhận đơn» hiện hộp hỏi nói rõ: giá bị khoá, hoa hồng được chụp, vé được cấp, tiền cọc khách khai thành khoản thu, không hoàn tác được. Chỉ khi đồng ý mới gọi máy chủ. Áp cho mọi nơi có nút này.
   - **Câu 5 (phần nút):** nút lưu đơn đổi tên; hộp dựng ảnh đổi tên «Ảnh gửi khách».

3. **Chưa thi công, chờ chủ quyết (câu 5, tách nhãn):** nhãn «Chưa xác nhận» cho đơn chưa gửi và giữ «Chờ xác nhận» cho đơn đang chờ người kiểm vé cần cờ «có yêu cầu xác nhận đang mở» ở danh sách đơn, lọc, Việc của tôi, biên nhận và vé hỗ trợ. Danh sách đơn hiện không có cờ này (chỉ trang chi tiết có `xacNhan`, và chỉ cho người lập hoặc người xét duyệt). Thêm cờ là đổi dữ liệu trả về và phải quyết ai được thấy gì. Trong khi chờ, nhãn trạng thái giữ «Chờ xác nhận» (ADR-0030 còn hiệu lực).

4. Chữ «Nháp» không dùng lại trên giao diện.

## Tiêu chí nghiệm thu (hành vi kiểm được)

- Máy chặn: đưa lại một chữ cũ (ví dụ «Bỏ ghi đè» trần, «Chuẩn bị 3 vé để gửi», «Hẹn ngày kết thúc») vào chuỗi giao diện thì `node --test src/bang-tu-giao-dien.test.ts` đỏ; tên mới (bắt đầu bằng tên cũ như «Còn vé, xác nhận đơn», «Bỏ ghi đè giá») không bị chặn nhầm.
- Hướng dẫn: `node --test src/huong-dan-may-canh.test.ts` xanh (mọi `[[…]]` khớp tên trên màn hình).
- Câu 2 (bài máy chủ): dịch vụ vừa ẩn vừa có giá, sau khi gọi route vẫn ẩn và giá về Sheet, dòng ghi đè còn; dịch vụ không ẩn, sau khi gọi không còn dòng ghi đè; nhật ký nói «bỏ ghi đè giá».
- Câu 1 (bài): nút «Gán cho đối tác» mở hộp cấp riêng với cấp đang xem được chọn sẵn, không gửi gì lên máy chủ khi chưa bấm Lưu; trần gói trang nhẹ `src/goi-trang-nhe.test.ts` xanh.
- Câu 4 (bài): chữ hộp hỏi chứa đủ năm hậu quả; huỷ hộp thì không gọi máy chủ.
- `npm run typecheck` 0 lỗi, `npm test` xanh, e2e các kịch bản đã sửa xanh.

## Hệ quả

- Mục cũ của `src/shared/changelog.ts` giữ nguyên chữ cũ (hồ sơ có ngày).
- Nút «Ẩn» mới của Toàn quyền (ADR-0164, chưa duyệt) không bị ràng buộc bởi bản ghi này; khi làm sẽ giữ «Ẩn» / «Hiện lại».
- Còn lại: nhãn đơn chưa gửi «Chưa xác nhận» (mục 3).
