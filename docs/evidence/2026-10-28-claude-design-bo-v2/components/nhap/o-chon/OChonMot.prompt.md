Ô chọn một cho 2–5 lựa chọn loại trừ nhau, thấy hết cùng lúc.

```jsx
<fieldset><legend>Hình thức thu</legend>
  <OChonMot ten="ht" giaTri="tien-mat" nhan="Tiền mặt" chon={ht === "tien-mat"} onDoi={datHt} />
  <OChonMot ten="ht" giaTri="chuyen-khoan" nhan="Chuyển khoản" chon={ht === "chuyen-khoan"} onDoi={datHt} />
</fieldset>
```

- Trên 5 lựa chọn: ONhap kieu="chon".
