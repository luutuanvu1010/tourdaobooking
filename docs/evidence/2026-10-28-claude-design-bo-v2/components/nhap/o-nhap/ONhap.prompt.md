Ô nhập một khuôn cho tám kiểu (chữ, số, tiền, SĐT, ngày, giờ, chọn, nhiều dòng); nhãn luôn trên ô, lỗi nói cách sửa.

```jsx
<ONhap nhan="Tên khách" macDinh="Nguyễn Thị Lan Anh" />
<ONhap nhan="Số điện thoại" kieu="sdt" loi="Số điện thoại cần 10 chữ số, bắt đầu bằng 0" />
<ONhap nhan="Tiền cọc" kieu="tien" macDinh="410.000" />
<ONhap nhan="Ghi chú" kieu="nhieu-dong" tuyChon />
```

- tien: canh phải, hậu tố ₫; ghiTien(1080000) → "1.080.000 ₫".
- ngay dd/mm/yyyy, gio hh:mm (bàn phím số).
- Không nhãn nổi, không dấu *; ô không bắt buộc dùng tuyChon.
- co="lon" (52) ở chân dính.
