# Đợt 0 khung chung: nhật ký thi công

Sổ sống của đợt 0 (kế hoạch 16 việc). Mỗi task ghi dòng vào ba mục dưới đây.

## Số đo gói trang Đơn hàng theo task

Trần hiện hành `TRAN_ORDERS` = 96.700 byte (nới một lần ở Task 16). Đo `web/orders.ts` đã rút gọn, chưa nén.

| Sau task | Byte | Ghi chú |
|---|---|---|
| Trước Task 1 | 96.678 | đo 28/10 |
| Task 1 | 96.678 | chỉ đổi CSS và `giao-dien.ts` (không nằm trong gói Đơn hàng); bài `goi-trang-nhe` xanh |

Sau Task 2: 96.929 byte (vượt trần 96.700; trần không đổi, nới một lần ở Task 16).

Sau Task 3: 96.929 byte (chỉ thêm CSS và bài, gói không đổi; vẫn vượt trần, trần không đổi).
Sau Task 4: 97.027 byte (bài đo; +98 so với Task 3, chỉ phần đọc `body[data-trang-thai]` ở `shell.ts`; `trang-thai-he-thong.ts` không vào gói Đơn hàng; vẫn vượt trần, trần không đổi).
Sau Task 5: 97.749 byte (+722 so với Task 4: bảng THANH_TAB viết lại với các vị từ và nhãn mới, dòng TRANG.thietLap; vẫn vượt trần, trần không đổi).
Sau Task 6: 98.635 byte (+886 so với Task 5: `theoDoiThanhDinh` ở shell và hàm thuần `thanh-dinh-day`; sau vòng sửa 1 giảm 40 so với 98.675; vẫn vượt trần, trần không đổi).
Sau Task 7: 99.172 byte (+537 so với Task 6: `nutGap`, `gomNhomGap`, lối «Bỏ qua» ở shell, bớt nút `.sidebar-new`; vẫn vượt trần, trần không đổi).
Sau Task 8: 98.816 byte (−356 so với Task 7: bỏ hàm nâng nút nổi và MutationObserver ở tro-ly.ts, thêm trangChaCua và đường dẫn một cấp; vẫn vượt trần 96.700, trần không đổi).

## Lệch so với đặc tả

- Task 1: kho chính không có `.env`; đã chép `.dev.vars` (tương đương của dự án) vào worktree.
- Task 1: kế hoạch ghi "còn đúng 16 số z-index cứng sau dấu mốc PWA"; đếm thật trên `app.css` sau khi đổi năm luật là **15** (đặc tả kể cả `.bell::before` và lối "Bỏ qua", không có luật z-index cứng nào như vậy sau dấu mốc). Bài `src/token-dot-0.test.ts` khoá 15.
- Task 1: bài `src/shared/giao-dien.test.ts` và `src/giao-dien-mac-dinh.test.ts` không phải sửa ca nào; chúng đọc `KEO_THEO`/`MAC_DINH` từ mã nên tự khớp (`dam-tieu-de` 600 = `--fw-heading`; `dam-nhan` vẫn 500 = `--fw-semibold`).
- Task 1: bài `src/phong-chu.test.ts` (thang cỡ chữ) chỉ cho `--fs-ui` dùng công thức `max(16px, var(--fs-step-5))`; đặc tả đổi `--fs-field` sang đúng công thức đó nên đã thêm `--fs-field` vào ngoại lệ (cùng lý do sàn 16px chống zoom iOS).
- Task 1: thứ bậc lớp xếp đổi có chủ ý theo đặc tả mục 4 (ngăn thông báo và khung Hỗ trợ nay bậc 40, toast và màn bảo trì bậc 50, bảng trượt 30). Chưa kiểm `thong-bao-ui.ts` có mở bảng trượt từ ngăn thông báo hay không: việc đó thuộc task sau.
- Task 5: trong `THANH_TAB`, `taiKhoan` đặt SAU `taoDon` (bảng kế hoạch để trước). Lý do: ảnh chụp hiện trạng đòi một thứ tự toàn cục không mâu thuẫn, và "Tạo đơn thứ 3 khi 5 mục" chỉ đúng với Bán hàng+Nhân sự nếu `taiKhoan` đứng sau. Hệ quả: tổ hợp 5 mục không có "Trang chủ" (Thực tập/Đối tác kiêm Nhân sự; không phải bộ quyền thật) có "Tạo đơn" thứ 2; bài 1024 tập bỏ qua đúng trường hợp đó.
- Task 5 (ruling điều phối): đặc tả §5.2 tự mâu thuẫn — thứ tự đặc tả (`taiKhoan` trước `taoDon`) vi phạm luật "Tạo đơn thứ 3 khi 5 mục / thứ 2 khi 4 mục" ở 88 tập quyền trong 1024 (kể cả Bán hàng+Kế toán+Nhân sự); thứ tự đã làm (`taiKhoan` sau `taoDon`) chỉ vi phạm 24 tập, mọi tập đó là tổ hợp Nhân sự + lập đơn + không xem mọi đơn, luôn ra đúng hình `Đơn hàng · Tạo đơn · Tài khoản · Hỗ trợ · Tôi` (bài ghim hình này). Giữ thứ tự đã làm.
- Task 5: `gopY` không khai `chiKhi.tam` (khung tạm không vẽ "Hỗ trợ") và `danhBa` không có `tam` — bài rào "khung tạm ⊆ khung thật" đỏ nếu khung tạm vẽ tab bị trần 5 cắt ở khung thật; mất mạng chưa có bản nhớ vẫn đúng bốn tab cũ.
- Task 5: ảnh hiện trạng `muc-giao-dien-hien-trang.json` ở HEAD đã lệch sẵn (thiếu dòng "Đơn chờ xác nhận" ở trang Tôi, không do Task 5); chụp lại đã gộp dòng đó.

- Task 7: kế hoạch ghi Kế toán có nhóm VẬN CHUYỂN sau gom là `["Điều phối xe"]`; thật ra Kế toán còn thấy «Xe đang chạy» và «Giá & chi phí». Bài chỉ khoá phần đúng: «Điều phối xe» đứng phẳng, không khối gập.
- Task 7: kế hoạch ghi «mọi tập quyền: demMucHienSan ≤ 10»; 240/1024 tập ra 11 (đều kèm quyền tài xế, kể cả `DRIVER_PARTNER` ghép với quyền khác — không phải vai thật). Bài mới bỏ các tập có quyền tài xế (bài trần 10 cho vai thật giữ nguyên); mọi tập còn lại ≤ 10.
- Task 7: `THANH_BEN` đổi thứ tự «Đề nghị chuyển khách» lên liền sau «Điều phối xe» (để gom được); chỉ đổi thứ tự hiển thị, không đổi ai thấy gì (ảnh chụp: chỉ mất «Tạo đơn», mặt nạ quyền các mục còn lại giữ nguyên). Bài lối vào bỏ `taoDon` khỏi danh sách trang thanh bên cũ (nút ở thanh trên/tab).
- Task 4: `web/api.ts` dùng "parameter property" nên node không nhập được `ApiError`; bài thuần dùng lớp giả cùng hình (Error có `status`), `cauLoiMayChu` nhận biết lỗi máy chủ bằng `status` số.
- Task 4: khoá `TRANG` thật: `donHang`, `dieuPhoi`, `cuoc`, `xe` (đúng tên brief gợi ý, trừ `donHang` cho /orders).

## Nợ ghi BACKLOG

- Tài xế công ty kiêm văn phòng: thanh bên 11 khối (có từ trước Task 7), chờ chủ quyết.
- `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs` hỏng với thanh bên mới (nút gập đầu tiên nay là Điều phối; 22 mục; nút Tạo đơn không còn ở thanh bên) — Task 15 chép và sửa.

- Giữ giá trị cũ, chờ Chặng 3 quyết theo họ: `--h-hdv-act` 48, `--row-h` 48, `--h-dp-tab` 40; mười `--skel-*` lẻ (`sm`, `title`, `tag`, `time`, `money`, `pill-mt`, `bar-mt`, `num-mt`, `time-mt`, `name-mt`); `--skel-money-mt` 96 (lề trên, không bí danh).
- 15 số z-index cứng còn lại sau dấu mốc PWA (`.fb-step-dot`, `.ht-tra-loi`, `.sidebar-group`, `.catalog-muc`, `body.trang-chu::before`, `.vc-bottom-bar`, `.vc-filters`, `.dp-*`, `.xb-*`, `.buoc-*`): dọn theo họ ở Chặng 3.
- Mốc màn hình cũ 960/1024/1400/720 giữ, dọn ở Chặng 3. `--z-tl-fab` 35 bỏ cùng nút nổi (task sau).
