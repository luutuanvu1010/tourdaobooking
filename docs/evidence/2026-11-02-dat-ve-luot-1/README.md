# Bằng chứng giao diện: Đặt vé của đối tác, lượt 1 (2/11/2026)

Hồ sơ có ngày: chụp một lần, không sửa lại cho khớp hiện trạng. Có thay đổi mới thì chụp bộ mới trong thư mục mới.

## Cách chụp

Từ gốc kho, sau `npm run build:web`:

```
CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-11-02-dat-ve-luot-1/kich-ban/chup-anh.mjs
```

Kịch bản dựng một D1 tạm cục bộ (không đụng production), gieo hai vai, hai cấp, một đối tác có cấp riêng, một đối tác có mức riêng, rồi chụp bằng Chrome thật. Khổ 390 chụp hai lần độ nét (ảnh rộng 780 px); khổ 1280 chụp một lần. Trong ảnh toàn trang, thanh dưới cố định (thanh tab điện thoại, thanh nút dính đáy) được ẩn tạm vì chụp toàn trang vẽ chúng một lần ở giữa trang; đó chỉ là chuyện của cách chụp, không phải giao diện thật. Trang Hoa hồng có thanh dính đáy riêng; khi nó hiện, trang tự ẩn thanh tab, và khi kịch bản ẩn thanh dính đáy thì trang hiện lại thanh tab. Vì vậy kịch bản ẩn lặp tới khi không còn thanh nào hiện ở nửa dưới màn hình, rồi kiểm lại bằng số đo trước khi chụp (còn thì dừng, không chụp ảnh sai). Bản chụp đầu của hai ảnh Hoa hồng khổ 390 để sót thanh tab ở giữa trang vì chỉ ẩn một lượt; hai ảnh đó (và các ảnh Hoa hồng khác) đã chụp lại sau khi sửa kịch bản, ngày 2/11/2026.

## Ảnh

| Tệp | Cảnh |
|---|---|
| `form-doi-tac-390.png`, `form-doi-tac-1280.png` | Màn Tạo đơn của Đối tác (dạng gọn): ba bước, ô «Giảm giá cho khách», ô «Ghi chú» trong thẻ dịch vụ |
| `form-ban-hang-390.png`, `form-ban-hang-1280.png` | Màn Tạo đơn của Bán hàng (đối chứng: bốn bước, có «Đơn của», «Sửa giá», «Người phụ trách») |
| `hoa-hong-cap-do-dai-ly-390.png`, `…-1280.png` | Hoa hồng đối tác, thẻ «Cấp độ đại lý» |
| `hoa-hong-vai-nguoi-dung-390.png`, `…-1280.png` | Hoa hồng đối tác, thẻ «Vai người dùng», gồm khối «Người có cấp riêng» |
| `quan-ly-tai-khoan-loc-390.png`, `…-1280.png` | Quản lý tài khoản, đã bấm lọc «Nhân viên kinh doanh» |
| `cat-o-giam-gia-390.png`, `cat-dong-ghi-chu-390.png`, `cat-the-dich-vu-390.png` | Cắt sát: ô giảm giá, dòng ghi chú, thẻ dịch vụ của form Đối tác |
| `cat-hang-loc-390.png`, `cat-hang-loc-1280.png` | Cắt sát: hàng lọc ở Quản lý tài khoản |
| `cat-dau-khoi-nguoi-co-cap-rieng-390.png`, `…-1280.png` | Cắt sát: đầu khối «Người có cấp riêng» |

## Lỗi giao diện thấy trong ảnh thật và đã sửa trong lượt này

1. Khối «Người có cấp riêng» dính liền phần trên, tiêu đề phụ lệch bậc, nút «Chọn cấp riêng cho đối tác» chạm ô «Tìm» ở khổ 390: thêm vạch ngăn và khoảng cách bằng token.
2. Nút đầu mỗi thẻ («＋ Thêm cấp độ đại lý», «＋ Thêm vai trò») chạm vạch chân thanh thẻ ở khổ 390: thêm khoảng cách dưới thanh thẻ bằng token.

## Điều thấy trong ảnh mà chưa sửa (có từ trước lượt này, không thuộc phạm vi)

- Hộp danh sách dịch vụ ở màn Tạo đơn để trống một khoảng cao khi chỉ có một kết quả tìm.
- Tên thẻ lặp lại ở tiêu đề khối nhỏ ngay dưới thanh thẻ trong Hoa hồng đối tác («Cấp độ đại lý» / «Vai người dùng»).
