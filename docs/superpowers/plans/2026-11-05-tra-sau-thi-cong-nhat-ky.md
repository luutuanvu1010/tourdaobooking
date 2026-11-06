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

## Nợ đã biết (ghi để làm sau, KHÔNG sửa trong lượt này)

1. ~~Phân định trách nhiệm và `coc/chuyen` chưa nối `cauTangChoDon`~~ — **ĐÓNG 2026-11-06, commit 93176bfb** (kế hoạch 2026-11-05 Task 2): bảng ĐƯỜNG GHI chạy thật (11 dòng) đỏ ở chuyển cọc và ghi theo phân định; đã nối, kèm hai đường bảng tự tìm ra: duyệt điều chỉnh sổ và ghi đổi bên chịu.
2. ~~Cổng huỷ đơn Trả sau không gác khi vé được mở đúng giữa hai bước~~ — **ĐÓNG 2026-11-06, commit 93176bfb**: lô huỷ mang câu bảo vệ «vé vừa mở» theo `qua.chanVeDaMo`; hết nợ thì gác phiên bản; bài đua ở `/status` và `handler-cancel`.
3. ~~Cổng sửa tăng tiền quá chặt~~ — **ĐÓNG 2026-11-06, commit c3725654** (Task 3): so phần tăng với phần còn được dùng (gồm nợ của đơn); không đọc được nợ ⇒ 503.
4. ~~Bài quét đường thu tiền yếu~~ — **ĐÓNG 2026-11-06, commit 93176bfb**: bốn bài QUÉT xoá; ba hàm ghi đòi kiểu mang nhãn (typecheck buộc; chỉ chặn nhầm, không chặn ép kiểu `as` cố ý) và bảng ĐƯỜNG GHI chạy thật.
5. R-CRD-3 (nợ vượt hạn mức) thay bằng cảnh báo trên màn Hạn mức trả sau, không có hàng rào máy. — **Giữ cách làm (đúng ADR), có bài GHIM 2026-11-06, commit c3725654**; sổ hàng rào ghi «chỉ cảnh báo, dựa vào người xem».
6. `GET /api/tra-sau/con-duoc-dung` nhận `benDat` từ trình duyệt (tài khoản Đối tác bị ép về hồ sơ của phiên, văn phòng thì tự chọn). — **Giữ cách làm, bài GHIM 2026-11-06, commit c3725654** (đúng ba khoá; Đối tác gửi `benDat` người khác vẫn nhận số của mình; Hướng dẫn viên 403).
7. ~~Gộp hồ sơ fail-open~~ — **ĐÓNG**: `conNoTraSau` bắt buộc từ Task 4b; bài «đọc nợ LỖI thì xem trước và lệnh gộp không ghi» thêm 2026-11-06, commit c3725654 (bài ghim).

## Ruling thi công Task 2, 3 (2026-11-06)

- Kiểu nhãn của đường sửa số khách đặt ở `insertMoneyAdjustment` (câu ghi duy nhất, gọi trong `soanSuaSoKhach`), không ở tham số `soanSuaSoKhach`: tổng mới chỉ biết bên trong hàm đó; bài `src/so-khach-mot-luat-tien.test.ts` siết thành 11 đối số, đối số cuối `cong.qua`.
- Lô huỷ thua vì câu bảo vệ: người giữ quyền Đối tác nhận câu ADR-0170 (`don_da_mo_ve`), văn phòng nhận `tra_sau_con_no_da_mo_ve` (`dichLoiLoHuy`). Gốc lắp ráp không nuốt lỗi soạn câu trả vé khi có cờ (trước đây nuốt ⇒ mất câu bảo vệ của cả ADR-0170).
- Câu 409 sửa tăng (chữ mới, đảo ngược được, chưa vào bảng từ): «Số tiền tăng thêm … vượt hạn mức: bên đặt còn được dùng … (hạn mức …, đang nợ …)».
- Thêm `cauTangChoDon` ở duyệt điều chỉnh sổ — ngoài danh sách của kế hoạch, theo ADR-0168 Đ2 mục 4 («mọi đường làm nợ tăng»), do bảng chạy thật tìm ra.

## Điều chưa làm

- e2e vé của đơn Trả sau (cần gieo kho vé): chỉ có bài đơn vị `src/tra-sau-ve.test.ts`.
- `audit-invariants` chạy cuối bộ e2e đủ bộ của `run.mjs`, không chạy riêng trong `tests/e2e/tra-sau.mjs`.
- Bài `src/bang-tham-chieu.test.ts` có một chỗ lệch có từ trước (`web/hoa-hong-cap.ts:149`), không thuộc việc này.
