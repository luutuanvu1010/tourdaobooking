Thanh bên máy tính (≥ 900) rộng 248, nhóm gập, mục đang chọn có vạch đầm phá; chân: Của tôi, Hỗ trợ, Hướng dẫn, tên người.

```jsx
<ThanhBen chon="orders" onChon={di} nguoi={{ ten: "Phạm Thu Hà", vaiTro: "Bán hàng", chuTat: "TH" }}
  nhom={[{ id: "chinh", muc: [{ id: "orders", nhan: "Đơn hàng", bieuTuong: "orders" }] },
         { id: "vc", nhan: "Vận chuyển", muc: [{ id: "chuyen", nhan: "Chuyến", bieuTuong: "truck" }] }]} />
```

- Tên nhóm viết thường đầu câu, không in hoa.
