Tab một kiểu duy nhất (rãnh xám, mục chọn nổi trắng) để đổi 2–5 lát nội dung trong cùng trang.

```jsx
<Tab nhan="Lọc theo ngày" chon={chon} onChon={datChon}
  muc={[{ id: "hom-nay", nhan: "Hôm nay", dem: 12 }, { id: "ngay-mai", nhan: "Ngày mai" }, { id: "tat-ca", nhan: "Tất cả" }]} />
```

- rong: chia đều hết ngang (điện thoại, ≤ 3 mục).
- Nhiều mục thì trượt ngang. Không dùng làm điều hướng trang.
