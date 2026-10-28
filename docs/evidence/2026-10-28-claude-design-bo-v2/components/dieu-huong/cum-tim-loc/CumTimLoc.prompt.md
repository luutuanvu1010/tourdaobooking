Cụm Tìm + Lọc + Sắp xếp ở đầu mọi danh sách dài; cuối danh sách dùng PhanTrang.

```jsx
<CumTimLoc tuKhoa={tu} onTim={datTu}
  loc={[{ id: "tour", nhan: "Tour đảo", dem: 8 }]} locChon={loc} onLoc={doiLoc}
  sapXep={sap} luaChonSapXep={[{ giaTri: "moi", nhan: "Mới nhất" }]} onSapXep={datSap}
  ketQua="3 đơn khớp" onXoaLoc={xoaLoc} />
```

- goiY mặc định "Tìm theo tên, số điện thoại, mã đơn".
