# Đề xuất ADR (số tạm 0139) — Tài xế công ty thấy SĐT hướng dẫn viên và tên dịch vụ của chuyến mình chạy

> **Bản nháp chờ chủ duyệt** (bản 2, sửa sau lượt soát sự thật 24/10), không phải ADR; chưa chuyển vào `docs/adr/`. Số tạm 0139 (0138 giữ cho nháp «gắn mức TA riêng»; 0137 là số lớn nhất ở mọi nhánh; **0136 là số đã hẹn cho bước xác nhận đơn**, đừng chiếm).
> Nguồn: góp ý YC-0015 (20/10): «Chi tiết chuyến xe: chi tiết sản phẩm, SĐT khách hàng, SĐT HDV phụ trách». Kế hoạch `2026-10-24-phan-tich-gop-y-ho-tro-ke-hoach.md` mục 8 (Q3), 9, 10.
> Việc lớn (quyền + dữ liệu cá nhân): ADR chủ duyệt + trang ghép (`2026-10-24-trang-ghep-luot-duyet-1.md`) + người kiểm độc lập. **Sửa/bổ sung:** ADR-0049 D3 (thứ tài xế công ty thấy — dòng «không bao giờ»). ADR-0053 D7 (tài xế đối tác) **chỉ đổi nếu chủ chọn phương án B**.
> **Xây trên lỗ đang hở:** đã rà `docs/quyen-hoan.json` 24/10: sáu phát hiện HIGH đang mở (TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-5.11, HC-4.2) — không mục nào thuộc DTO tài xế hay liên hệ nhân viên ⇒ «không».

## 1. Hiện trạng (đọc mã 24/10, đã soát)

- DTO tài xế (`src/modules/van-chuyen/tai-xe-dto.ts`, MỘT hàm khung cho mọi tài xế) đã có: tên + SĐT **người liên hệ của đơn** trong ngày chạy (`lienHe`), SĐT văn phòng (`sdtVanPhong`), mã đơn (tài xế công ty mọi lúc), và **tên người đi kèm chuyến** (`tenNguoiDiKem` — suất `CREW` trên chuyến, mọi tài xế kể cả đối tác, mọi lúc, chỉ tên; lời chủ 2026-10-01).
- **Chưa có:** SĐT của người đi kèm; tên dịch vụ. Tên dịch vụ **đã có sẵn** trong dữ liệu lịch của `van-chuyen` (`tenDichVu: c.serviceName`, `dieu-phoi-dto.ts`) ⇒ không cần hợp đồng mới cho vế này.
- «SĐT khách» người gửi xin **đã có** (là SĐT người liên hệ) — chỉ cần trả lời người gửi.
- **«HDV phụ trách đơn» ≠ «HDV đi kèm chuyến».** Người phụ trách đơn là dòng `HANDLE` của `dispatch` (`v_dsp_order_handler`), có thể là Bán hàng/Quản trị (dữ liệu cũ gieo bằng người lập), có thể chưa có ai, có thể là hồ sơ không tài khoản; máy chủ **không có cách hợp lệ** biết người đó «là HDV» (vai hồ sơ không được làm điều kiện cho phép). Còn người đi kèm chuyến là suất `CREW` ngay trên chuyến, thuộc `van-chuyen`.
- `van-chuyen` **không có cạnh** sang `dispatch`/`staff` (`src/architecture.test.ts`: `"van-chuyen": ["parties","audit","orders","locations","ky-so"]`). Đọc người phụ trách đơn từ đó cần **nới hàng rào kiến trúc** (thêm cạnh — Điều 9.4, chủ duyệt) hoặc gốc lắp ráp tiêm hàm (khuôn `ctx.isAssigned`).

## 2. Quyết định đề xuất

**D1 — Số của ai.** Phương án **1 (khuyến nghị): SĐT người đi kèm chuyến** (suất `CREW` — người thực sự có mặt cùng xe). Dữ liệu nằm trong `van-chuyen`; SĐT lấy qua một hàm hẹp mới của `parties` (cạnh `van-chuyen → parties` đã có), gọi trong thân route sau `can(`. **Không** nới cạnh kiến trúc. Phương án 2: SĐT người phụ trách đơn — cần thêm cạnh `van-chuyen → dispatch` (nới hàng rào) hoặc hàm tiêm, và phải chấp nhận số đó có thể là của Bán hàng/Quản trị.

**D2 — Ai thấy, khi nào.** Phương án **A (khuyến nghị): chỉ tài xế công ty** (quyền `DRIVER`), chuyến mình có dòng lái mở, **chỉ trong ngày chạy** (`trongNgayChay`). Tài xế đối tác giữ nguyên ADR-0053 D7 (người ngoài; số nhân viên đã lộ không lấy lại được). Trong DTO tách hai loại tài xế bằng đúng dấu hiện có của hàm khung (người **không** có vế hạn Từ chối = tài xế công ty — `khung.han === undefined`), không thêm nhánh vai. Phương án B: cả tài xế đối tác, trong khung xem khách — sửa ADR-0053 D7, thêm một cửa một chiều.

**D3 — Thấy gì.** Tên dịch vụ của chính dịch vụ có chặng trên chuyến (không phải mọi dịch vụ của đơn), không giá; SĐT người đi kèm (D1). Không bao giờ: tiền, ghi chú đơn, người lập, bên đặt/đại lý. Nhật ký không ghi SĐT.

## 3. Tiêu chí nghiệm thu (viết trước)

1. Tài xế công ty, chuyến mình lái, trong ngày chạy: thấy tên dịch vụ của chặng và SĐT người đi kèm; ngày khác: không thấy SĐT người đi kèm (tên dịch vụ: theo chủ, mặc định cũng chỉ trong ngày chạy).
2. Tài xế công ty không lái chuyến đó: 404 như hiện nay.
3. Tài xế đối tác (phương án A): phản hồi **không có** khoá SĐT người đi kèm hay tên dịch vụ ở bất kỳ thời điểm nào — ca mới trong `tai-xe-dto.test.ts` và bài «số lạ» kiểu toàn Nền tảng.
4. Người đi kèm là hồ sơ không có SĐT: không có khoá, không lỗi.
5. Nhật ký `trip_*` vẫn `order_id` NULL, không ghi SĐT.

## 4. Câu cho chủ

1. **D1:** số của **người đi kèm chuyến** (khuyến nghị) hay **người phụ trách đơn**?
2. **D2:** chỉ **tài xế công ty** (khuyến nghị) hay cả tài xế đối tác?
