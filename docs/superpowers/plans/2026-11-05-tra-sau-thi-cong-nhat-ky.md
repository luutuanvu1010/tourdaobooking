# Trả sau theo hạn mức: sổ thi công (2026-11-05)

Kế hoạch: `2026-11-05-tra-sau-han-muc-ke-hoach.md`. Đặc tả: `docs/superpowers/specs/2026-11-05-tra-sau-han-muc.md`. ADR-0168.

## Ruling và quyết định trong lúc làm

- **Khe đổi bên đặt (đã đóng, commit 26766445):** lô đổi bên đặt nay gác phiên bản của bên đặt cũ; có bài đua trong `src/tra-sau-duong-ghi.test.ts`.
- **R-CRD-3 không làm ở bộ kiểm dữ liệu** (phải thu tính bằng mã, SQL không tính được). Thay bằng cảnh báo «nợ vượt hạn mức hiện hành» ở màn Hạn mức trả sau (`canhBaoVuotHanMuc`). Chủ ghi lệch này.
- **Đường `coc/chuyen` không nối `cauTangChoDon`:** nguồn là đơn đã huỷ có nợ đã về 0; đích chỉ nhận thêm tiền nên nợ không tăng.
- **Phân định trách nhiệm không nối `cauTangChoDon`:** chỉ chạy sau «Đã giao»; đơn Trả sau chỉ Đã giao khi `conLai = 0`; hoàn tiền luôn đi cặp với giảm trừ nên nợ ròng không đổi. Kết luận từ đọc mã, chưa có bài riêng.
- **Chữ mới** («Đặt hạn mức», «Ngừng hạn mức», «Hạn mức trả sau», «Còn được dùng …») dùng đúng chữ đã có ở ADR-0168; vào `docs/BANG-THAM-CHIEU.md` ở trạng thái «tên hiện tại», chủ chưa chọn riêng.
- **Trần gói trang Đơn hàng không đụng.** Trang mới vào `TRANG`/`THANH_BEN` làm gói `web/orders.ts` thêm byte, và các Task trước đã làm gói vượt trần 16 byte. Bù bằng hai hàm gom `ve`/`vk` (điều kiện hiện của mục) và `tl` (dòng nhóm Thiết lập) ở `src/shared/muc-giao-dien.ts`, giá trị không đổi.
- **Không có dòng ở trang «Tôi» (`TRANG_TOI`)** cho Hạn mức trả sau, để giữ trần; lối vào là thanh bên nhóm Thiết lập.
- **Số phiên bản:** mục nhật ký của Trả sau đã đặt 2.63 khi làm; sau khi nhập bản chính (9813f1a4) mục đó là 2.65 và migration là `0141_tra_sau_han_muc` (đổi từ 0139). Bước A.0 của lần triển khai đặt lại nếu cần.
- **Hướng dẫn:** bài mới «Cấp hạn mức trả sau cho đối tác»; bài «Kho vé điện tử» sửa một câu (đơn trả sau mở vé trước) vì `web/ve-don.ts` đổi.

## Nợ / điều chưa làm

- e2e vé của đơn Trả sau (cần gieo kho vé): chỉ có bài đơn vị `src/tra-sau-ve.test.ts`.
- `audit-invariants` chạy cuối bộ e2e đủ bộ của `run.mjs`, không chạy riêng trong `tests/e2e/tra-sau.mjs`.
- Bài `src/bang-tham-chieu.test.ts` có một chỗ lệch có từ trước (`web/hoa-hong-cap.ts:149`), không thuộc việc này.
