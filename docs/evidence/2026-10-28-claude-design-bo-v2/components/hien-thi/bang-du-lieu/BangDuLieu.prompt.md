Bảng máy tính: bảng cột khi khung ≥ 900, hẹp hơn tự thành thẻ ba dòng; tiêu đề dính, số canh phải, hành động cuối.

```jsx
<BangDuLieu nhan="Đơn hôm nay" dong={don}
  cot={[{ khoa: "id", nhan: "Mã đơn", gon: true }, { khoa: "khach", nhan: "Khách" }, { khoa: "tong", nhan: "Tổng tiền", can: "phai" }]}
  theBaDong={(d) => ({ dong1: d.khach, sau1: <HuyHieu trangThai={d.tt} />, dong2: d.id, dong3: d.tong })}
  hanhDong={(d) => <Nut cap="loi-nho">Xem</Nut>} />
```

- Cần khung ứng dụng .ib-khung (container "ib") để đổi khổ.
- dangTai, rong, caoToiDa (cuộn trong).
