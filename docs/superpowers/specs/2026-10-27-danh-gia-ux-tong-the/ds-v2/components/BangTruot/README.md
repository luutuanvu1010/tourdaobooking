Bảng trượt / hộp thoại **một khuôn** `.sheet*`: điện thoại (≤ 640) trượt từ đáy, bo trên `radius-lg`; từ 641 là hộp giữa màn rộng `w-sheet` 520. Lớp phủ `.sheet-scrim` `c-scrim`, đầu `.sheet-head` (tiêu đề `.sheet-title` `fs-title` 18 + nút đóng), thân `.sheet-body` cuộn, chân `.sheet-foot`; lớp xếp `z-truot`.

**Trong mã:** `web/bang-truot.ts` `moBangTruot({ title, body, foot, footClass, vaiTro })` (bẫy tiêu điểm, Esc / chạm nền đóng, `open` sau hai khung hình); CSS khối bảng trượt của `public/app.css` (chép nguyên vào bundle). Nút đóng trong mã là `btn btn-link sheet-close` (lớp cũ); bản xem trước vẽ bằng `.nut[data-cap=loi]`.

## Khi nào dùng
Sửa nhanh một phần, bộ lọc nhiều ô, thêm mới trong trang danh sách. Việc dài hơn một màn thì dùng trang riêng.

## Đừng
Không hai nút chính; không bảng trượt lồng bảng trượt.
