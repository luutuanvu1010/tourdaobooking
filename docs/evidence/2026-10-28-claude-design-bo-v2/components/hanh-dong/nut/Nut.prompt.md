Nút ba cấp (Chính, Phụ, Lối nhỏ) × hai cỡ (44, 52); một vùng tối đa một nút Chính; nút tắt luôn có một dòng lý do.

```jsx
<Nut bieuTuong="check">Lưu đơn</Nut>
<Nut cap="phu">Xem chi tiết</Nut>
<Nut cap="loi-nho">Sửa số khách</Nut>
<Nut tat lyDoTat="Chọn lý do để lưu">Lưu thay đổi</Nut>
<Nut co="lon" rong dangTai>Đang lưu…</Nut>
```

- cap="san-ho": CHỈ "Xác nhận đơn để gửi khách" và "+ Tạo đơn" ở thanh trên.
- cap="phu-nguy-hiem": huỷ/xoá ngoài hộp xác nhận. cap="do-dac": CHỈ trong HopXacNhan.
- Không có children + có nhan = nút chỉ hình 44×44.
