Ô tích `.o-tich`, ô chọn một `.o-chon-mot` và công tắc `.cong-tac` — lớp đặt **thẳng lên `<input>`**: hai ô dùng ô gốc của trình duyệt (`accent-color: c-primary`) cỡ `h-control` 44; công tắc là `appearance: none` rộng 44, cao `s5`, nền tắt `c-switch-off-bg`, bật `c-primary`.

**Trong mã:** khối «Thành phần chung v2» của `public/app.css`. Ba luật cũ (`.vc-radio-dot`, `.dp-switch`, `.dd-switch-o .dp-switch`) đã đổi sang `c-check-border` / `c-switch-off-bg` ở đợt 0 (sửa B-VIEN-O-CHON-TUONG-PHAN).

## Khi nào dùng
Ô tích: bật/tắt một lựa chọn trong biểu mẫu, chọn nhiều. Ô chọn một: 2–5 lựa chọn loại trừ nhau, hiện hết (nhiều hơn thì ô `.o[data-loai=chon]`). Công tắc: thiết lập có hiệu lực ngay (`role="switch"`).

## Trạng thái
Chọn / chưa chọn · tiêu điểm vành `c-focus` · tắt (`disabled`).

## Người dùng truyền gì
`<label>` bọc ô + chữ để cả dòng bấm được; nhóm ô chọn một có `role="radiogroup"` hoặc `<fieldset>`.

## Đừng
Không dùng công tắc trong biểu mẫu cần bấm Lưu; không tự vẽ dấu tích.
