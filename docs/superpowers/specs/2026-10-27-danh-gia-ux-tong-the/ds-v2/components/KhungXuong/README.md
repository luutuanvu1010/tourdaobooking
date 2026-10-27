Khung xương giữ chỗ **cùng lưới với nội dung thật** trong lúc chờ dữ liệu, để trang không nhảy (CLS ≈ 0). Gộp 4 cách «đang tải» và 14 token `skel-*` của mã về 3 thanh: dòng `skel-dong` 16, số `skel-so` 26, viên `skel-vien` 96 (H-TAI-RONG).

## Khi nào dùng
Mỗi khuôn trang có một khung xương riêng theo đúng bố cục: Danh sách = 3 thẻ/dòng xương; Chi tiết = dải tóm tắt + 2 khối; Bảng điều khiển = lưới ô số liệu + 3 dòng; Biểu mẫu = nhóm trường. Hiện **ngay** khi HTML tới (không chờ JS), thay bằng nội dung khi dữ liệu về; không hiện chữ «Đang tải…» rời.

## Trạng thái
Chỉ có một: nhấp nháy nhẹ (`nhap-nhay`, 4 × `m-base`); máy «Giảm chuyển động» thì đứng yên. Mất mạng: khung xương **dừng** và nhường chỗ cho dải mất mạng + nội dung lần xem gần nhất (không nhấp nháy mãi — H-MAT-MANG).

## Người dùng truyền gì
Số dòng và kiểu (`data-kieu="so"|"vien"`, `data-rong="nua"|"phan-ba"`) khớp với nội dung sẽ tới; đặt `aria-busy="true"` ở vùng đang tải và `aria-hidden` ở xương.

## Đừng
Không khung xương chung chung một khối xám; không vòng quay toàn trang; không để xương chạy quá 10 giây mà không báo lỗi.
