Ô nhập `.o` kèm nhãn `.nhan` luôn thấy phía trên; `data-loai="chu|so|tien|sdt|ngay|gio|chon|nhieu-dong"`; cao `h-control` 44, chữ `fs-field` 16 (Safari iPhone không phóng to), đệm `pad-o`, bo `bo-control`, viền `c-input-border`.

**Trong mã:** khối «Thành phần chung v2» của `public/app.css`. Ô cũ (`input` trong `.field`, ô nhãn nổi `web/o-nhan-noi.ts`) giữ tới Chặng 3.

## Khi nào dùng
Mọi trường gõ của biểu mẫu mới. `so`, `tien`, `sdt`, `gio` dùng chữ số đều cột; `tien` canh phải; `nhieu-dong` cao tối thiểu `h-o-nhieu-dong` 96, kéo dãn dọc.

## Trạng thái
Bình thường · tiêu điểm vành `c-focus` 3 px + viền `c-focus` · lỗi `aria-invalid="true"` (viền `c-danger`) kèm câu `.o-loi` 14 ngay dưới, nối bằng `aria-describedby`.

## Người dùng truyền gì
Nhãn ngắn, `inputmode` đúng loại (tel, numeric), câu lỗi nói cách sửa («Email thiếu phần sau dấu @.»).

## Đừng
Không dùng chữ gợi ý thay nhãn; không cỡ chữ dưới 16 trong ô.
