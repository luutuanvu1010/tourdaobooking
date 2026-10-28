Bộ đếm − / + cho số khách theo loại và số lượt, giữ nguyên cơ chế `counter.ts` của mã: hai nút vuông `h-control` 44 (vùng chạm tối thiểu) kẹp một ô số `counter-field` 48, chữ 20/600 đều cột.

## Khi nào dùng
Số nhỏ (0–50) thay đổi từng đơn vị: Người lớn, Trẻ em, Người cao tuổi, Em bé trong thẻ dịch vụ; số người được chở của xe. Mỗi ô có nhãn loại + dòng nhỏ giá và điều kiện («1.200.000 · cao 1–1,4 m») ngay trên bộ đếm.

## Trạng thái
Bình thường · rê chuột nút nền `c-soft-hover` · tiêu điểm vành `c-focus` bên trong · nút «−» tắt khi ở mức tối thiểu, «+» tắt khi chạm trần (màu `c-placeholder`, không mờ) · lỗi (`data-loi="true"`): viền `c-danger` + câu dưới («Tối đa 50 khách.»).

## Người dùng truyền gì
Giá trị, `min`, `max`, bước; `aria-label` cho hai nút («Bớt một người lớn», «Thêm một người lớn»); ô số là `<output>` đọc được bằng trình đọc màn hình.

## Đừng
Không cho gõ thẳng vào ô số ở điện thoại (bàn phím che bộ đếm); không thu nút dưới 44.
