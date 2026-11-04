# Đối soát số đếm theo kênh (do máy sinh, đừng sửa tay)

Sinh bởi `liet-ke-nut.mjs`. Mục đích: chứng minh danh sách không sót so với một phép đếm độc lập.

| Kênh | Nghĩa | Số hàng |
|---|---|---:|
| button | h("button") có nhãn trực tiếp | 556 |
| confirm | confirm() của trình duyệt | 16 |
| goi-khuon | lời gọi hàm bọc, mỗi lời gọi là một nút | 189 |
| hop-giu | nút giữ nguyên của hộp hỏi xác nhận | 4 |
| hop-nguy-hiem | nút nguy hiểm của hộp hỏi xác nhận | 11 |
| hop-nhan | nút xác nhận truyền qua tham số hộp | 13 |
| html-button | <button> trong public/*.html | 43 |
| html-link | <a class=btn|nut> trong public/*.html | 5 |
| khuon | khuôn: h("button") bên trong hàm bọc, nhãn là tham số (không tính là nút) | 45 |
| link | liên kết trông như nút | 33 |
| menu-viec | mục trong menu ⋯ | 3 |
| vai-nut | role="button" hoặc <input type=submit> | 1 |
| **Tổng hàng** | | **919** |
| **Tổng nút thật (trừ khuôn)** | | **874** |

## So với đếm độc lập

| Phép đếm | Đếm độc lập (tìm qua nhiều dòng, nên grep từng dòng ra ít hơn) | Kịch bản | Khớp |
|---|---:|---:|---|
| `h("button"` trên tệp thô, kể cả chú thích | 599 | 599 (đã bỏ chú thích) | khớp |
| `h("button")` đều có một hàng (thẻ gốc button, gồm cả hàng khuôn) | 599 | 599 | khớp |
| `h("a")` có lớp nút đều có một hàng | 35 | 35 | khớp |
| `<button` trong public/*.html | 43 | 43 | khớp |

Hàng chưa đọc được chữ bằng máy (nhãn là biểu thức lúc chạy): **85** nút; không có chữ (chỉ biểu tượng hoặc aria): **8** nút. Các nút đó vẫn nằm trong danh sách kèm tệp:dòng; phần quan trọng đã đọc tay ở `NUT-QUAN-TRONG.md`.

## Nhãn `nhan:` KHÔNG tính là nút (cột, ô, lựa chọn…)

Có 57 chỗ `nhan:` nằm ngoài hộp đã biết. Các lời gọi bao chúng:

- 15 × `(không trong lời gọi)`
- 11 × `map < nhomChon < moBangTruot`
- 6 × `map < nhomChon`
- 5 × `push`
- 4 × `trangThaiToanTrang`
- 4 × `datDai`
- 3 × `map`
- 3 × `hopNgay`
- 3 × `hang < push`
- 1 × `map < oTim`
- 1 × `map < flatMap`
- 1 × `map < then`
