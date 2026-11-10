# ADR-0195 — Điều kiện hiển thị và mở rộng danh mục trường: ẩn hoặc bắt buộc một trường chỉ khi đơn (hoặc dịch vụ) thoả điều kiện khai sẵn

- **Trạng thái:** **proposed** 2026-11-10 (bản 2) — AI soạn theo yêu cầu của chủ dự án trong chat 10/11: chủ chọn «khuyến nghị» cho việc mở ADR này, rồi yêu cầu mở rộng số trường ẩn/hiện ở mọi vai, rồi nói «ok cập nhật ADR… làm theo khuyến nghị» (phạm vi nhóm 1 + nhóm 2, hoãn nhóm 3, như mục «Phạm vi trường» dưới đây). Lời «ok» là chọn phạm vi, **chưa phải lời duyệt ADR**: chưa thi công; cần người kiểm độc lập đọc, rồi chủ duyệt bằng lời rõ.
- **Loại:** việc lớn (dữ liệu, hợp đồng giữa bảng, máy chủ và giao diện). **Cửa:** hai chiều. Mở rộng ADR-0194 (đợt 1, đã duyệt và đã nhập `main`).
- **Câu chủ hỏi:** «Nếu muốn ẩn trường mà có điều kiện thì thế nào, chẳng hạn ẩn Ghi chú trong đơn Không đón, được tạo bởi Đối tác?»

## Vì sao cần
Đợt 1 của ADR-0194 chỉ khoá theo ba thứ: màn × trường × mã quyền. «Do Đối tác tạo» làm được (Đối tác là một quyền). «Không đón» thì chưa: đó là lựa chọn của **từng dịch vụ** (`pickupChoice = KHONG_DON`, ADR-0134), mà danh mục đợt 1 chỉ có trường cấp đơn.

## Đề xuất

**Đ1. Điều kiện là danh sách khai sẵn trong mã, không cho gõ tự do.** Mỗi điều kiện có mã, tên tiếng Việt (tra `docs/BANG-THAM-CHIEU.md`), và một hàm thuần ở `src/shared/` trả đúng/sai từ dữ liệu của đơn hoặc dịch vụ. Khởi đầu chỉ hai điều kiện: `DICH_VU_KHONG_DON` (dịch vụ có lựa chọn đón là «Không đón») và `DICH_VU_CO_DON`. «Người tạo là Đối tác» không cần điều kiện riêng vì đã có mã quyền.

**Đ2. Cột điều kiện trong bảng chính sách, theo cách mở rộng–thu hẹp.** Thêm cột `dieu_kien` (có thể trống = luôn áp, đúng như đợt 1) vào dòng chính sách bằng migration mới; khoá thành màn × trường × quyền × điều kiện. Dòng cũ không đổi nghĩa. Dòng chính sách vẫn chỉ-thêm.

**Đ3. Nới danh mục sang trường cấp dịch vụ và thêm màn mới.** Thêm màn con «Dịch vụ trong đơn» và hai màn chỉ xem «Chi tiết đơn», «Danh sách đơn» (xem mục «Phạm vi trường» dưới đây). Trường nào luật nền cần (giờ đón khi có đón, điểm đón, số khách, tiền, ngày khởi hành, lựa chọn đón) giữ «không được ẩn». Mỗi trường lồng trong thẻ dịch vụ phải có tên khoá được bài canh nhận ra (quy ước tên, ví dụ `LegInput.flightCode`).

**Đ4. Máy chủ tự kiểm điều kiện.** Khi nhận đơn, máy chủ tự tính điều kiện từ dữ liệu gửi lên rồi mới bỏ khoá trường ẩn; không tin cờ từ trình duyệt. Hai điều kiện cùng khớp thì **ẩn thắng chỉ khi mọi dòng khớp đều ẩn** (cùng nguyên tắc nhiều quyền của ADR-0194). Giao diện tính lại điều kiện ngay khi người dùng đổi lựa chọn đón và ẩn/hiện ô theo đó.

**Đ5. Một dịch vụ đổi lựa chọn đón: máy chủ bỏ giá trị của ô bị ẩn khi lưu, giao diện không hỏi lại** (khuyến nghị, câu hỏi 2). Bỏ ở đây nghĩa là không ghi giá trị gửi lên; xem Đ6 cho trường hợp sửa đơn đã có giá trị.

**Đ6. Ẩn không được xoá giá trị đã lưu.** Với trường chưa có kiểu «vắng khoá = giữ giá trị đang lưu» (nhóm 2), máy chủ khi sửa đơn chép giá trị từ bản đang lưu (`ctx.stored`, khuôn của `flightCode`) cho mọi trường ẩn; nếu không, sửa đơn sẽ xoá ghi chú cũ. Bài kiểm ép: ẩn `trip.note`, sửa đơn, ghi chú cũ vẫn còn.

## Phạm vi trường (rà soát chỉ-đọc 10/11, chủ chọn khuyến nghị)
Rà soát đã đọc `ui-truong.ts`, `contracts.ts`, luật đơn, form, thẻ dịch vụ, hồ sơ, tài khoản, danh mục. Hoa hồng, hỗ trợ, vận chuyển mới đọc lướt nên không đưa vào đợt này.
- **Nhóm 1, chỉ sửa giao diện, làm trước:** Tạo đơn, thẻ dịch vụ: `legs[].flightCode`, `legs[].paxOverride` (cả hai đã có kiểu «vắng khoá = giữ»). Chi tiết đơn (màn mới `chi-tiet-don`, chỉ ẩn trên màn hình, dữ liệu vẫn có trong phản hồi API): email khách, ghi chú khách, ghi chú thanh toán, người lập. Danh sách đơn (màn mới `danh-sach-don`): ghi chú khách, điểm đón, người lập, giờ lập, số khách. Danh sách tài khoản: trạng thái khoá, số Face ID. Hỗ trợ: ô «Đơn liên quan».
- **Nhóm 2, sửa máy chủ nhỏ, làm cùng ADR này:** `trip.note` (ghi chú dịch vụ; Đối tác dùng làm «Ghi chú / Thời gian đón»), `trip.departTime`, `checkinDate`, `checkinTime`, `checkinPlace`. Mở rộng `thanKhiAnTruong` sang khoá trong `services[]` và giữ giá trị lưu (Đ6). Ẩn các ô «Có mặt» làm biên nhận và «Việc của tôi» của Hướng dẫn viên mất dòng này: phải ghi rõ ở chữ chú thích của trang chỉnh.
- **Nhóm 3, hoãn:** giới tính, tên pháp lý, mã số thuế, địa chỉ, email hoá đơn của hồ sơ; xe riêng, xe tối thiểu. Ảnh hưởng biên nhận, hoa hồng, xếp xe, chống trùng khách, công ty chủ.
- **Giữ «không được ẩn»** (kể cả ba trường hơi chặt về kỹ thuật): khách đặt cọc, hình thức thanh toán, người phụ trách, bên đặt, giảm giá. Thêm `departDate` và `pickupChoice` vào danh sách «máy chủ bắt buộc» của bài canh (b) (rà soát thấy hai trường này chưa được canh).
- **Bảng chính sách không cần migration thêm cho trường mới:** `gd_field_policy` không CHECK mã màn hay trường; thêm màn, trường chỉ sửa danh mục và nhãn. Cột điều kiện (Đ2) vẫn cần một migration.

## Ranh giới giữ nguyên từ ADR-0194
Chính sách chỉ nới hoặc thu phần hiển thị, không nới luật nền. Danh sách cho phép, mặc định không cho ẩn. Chỉ Toàn quyền chỉnh. Nhật ký chỉ ghi mã. Bảng rỗng hoặc lỗi tải cấu hình thì hiện đầy đủ.

## Ba điều chủ quyết khi duyệt (khuyến nghị đứng đầu)
1. **Chỉ hai điều kiện khởi đầu** (`DICH_VU_KHONG_DON`, `DICH_VU_CO_DON`); thêm điều kiện sau bằng ADR nhỏ riêng.
2. **Ô bị ẩn vì đổi lựa chọn: máy chủ bỏ giá trị khi lưu, giao diện không hỏi lại.** Phương án khác: hỏi xác nhận khi đổi lựa chọn mà ô đã có chữ.
3. **Danh sách trường ẩn được: nhóm 1 + nhóm 2 như mục «Phạm vi trường»**, thi công nhóm 1 trước rồi nhóm 2; nhóm 3 hoãn. (Chủ đã chọn phương án này trong chat 10/11; còn chờ lời duyệt ADR.)

## Trang ghép (CLAUDE.md §9)
Bảng chính sách nay chứa: dòng chính sách theo màn × trường × quyền × điều kiện (không chứa dữ liệu khách). Chạm: bản đồ quyền (không đổi, vẫn `settings.ops` để ghi), giao diện ẩn/hiện ở thẻ dịch vụ, máy chủ bỏ khoá trường ẩn ở lập và sửa đơn. Rủi ro: ẩn nhầm trường luật nền cần → danh sách cho phép + khôi phục mặc định + bài kiểm danh mục ↔ `contracts.ts` mở rộng cho trường dịch vụ.

## Kiểm
Chưa có người kiểm độc lập (cần trước khi chủ duyệt). Hàng rào mới (nếu duyệt) ghi `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.
