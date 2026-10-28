Ô nhập một dòng, nhiều dòng, số, tiền, số điện thoại và ô chọn thả xuống, luôn đi cùng nhãn **nằm trên ô** và dòng lỗi **dưới ô**. Gộp các cỡ 16/17 px và chiều cao 46/44/52 của mã hiện tại (H-O-NHAP) về một lớp `.o-nhap` cao `h-control` 44.

## Khi nào dùng
Mọi chỗ người dùng gõ hay chọn một giá trị. Bọc trong `.truong` gồm `<label>` (chữ `nhan` 14/500), ô, và tuỳ chọn `.chu-thich-o` (12 px, `c-text-muted`) hoặc `.loi-o`. Bắt buộc là mặc định, **không dấu `*`**; ô không bắt buộc ghi «(tuỳ chọn)» sau nhãn bằng `<span class="tuy-chon">`.

## Biến thể
- `data-kieu="so"` / `data-kieu="tien"`: canh phải, chữ số đều cột; tiền có hậu tố «₫» bằng `.o-co-hau` + `.hau`.
- `type="tel"` cho số điện thoại; `inputmode` đúng loại để iPhone mở bàn phím số.
- `<textarea class="o-nhap">` cho nhiều dòng (cao tối thiểu 2 × 44, kéo dọc được).
- `<select class="o-nhap">` cho chọn thả xuống: mũi tên vẽ sẵn màu `c-text-muted`, không dùng mũi tên của hệ điều hành.
- `data-co="lon"`: cao `h-control-lon` 52 (Đăng nhập).

## Trạng thái
Bình thường viền `c-input-border` · rê chuột `c-input-border-hover` · đang gõ viền `c-focus` + vành `ring-field` màu `c-focus-ring` · tắt nền `c-surface-alt` · **lỗi** (`.truong[data-loi="true"]`): viền `c-danger`, dòng `.loi-o` có biểu tượng `alertCircle` và câu nói chuyện gì sai + cách sửa, ngay dưới ô — không toast, không hộp thoại.

## Người dùng truyền gì
`id` nối `for` của nhãn; `placeholder` chỉ là ví dụ định dạng («0905 123 456»), **không** thay nhãn; `autocomplete` khi có; giá trị tiền gõ số thuần, máy tự thêm dấu chấm khi rời ô. Chữ trong ô **không dưới 16 px**.

## Đừng
Không nhãn nổi (ô nhãn nổi của Tạo đơn không nhân rộng — câu 5 cổng 1); không hai ô cho cùng một việc (một ô gõ-lọc + một ô chọn); không báo lỗi ở nơi khác ngoài dưới ô.
