# Ảnh phác chip "Nhóm dịch vụ" ở ô chọn dịch vụ (câu Q1)

Nguồn: ADR-0058 Điều 8 (`docs/adr/ADR-0058-nhom-dich-vu.md`), Task A5 của kế hoạch lượt 1. Khuôn dựng và giá trị token chép từ ảnh phác bản 1.42 (`docs/design/gop-y-2026-09-30/d-loc-san-pham-lap-don.html`). Ảnh tĩnh, số liệu giả, chưa phải màn thật. Mở `chip-nhom-lap-don.html` bằng trình duyệt (`chip-nhom-lap-don.png` là ảnh chụp hai khung).

## Câu hỏi Q1 cho chủ

Khi lập đơn, chip lọc theo nhóm dịch vụ (Tour đảo, Thể thao biển…) đặt thế nào?

- **Cách 1 (khuyến nghị):** thêm một hàng riêng "Nhóm dịch vụ" dưới hàng lọc sẵn có; dùng cùng lúc được (vd "Hay dùng" + "Thể thao biển"). Chip "Theo nhóm" cũ đổi chữ thành "Giá theo nhóm". Được: rõ, lọc kết hợp. Mất: thêm một hàng trên điện thoại.
- **Cách 2:** nối chip nhóm vào cuối hàng lọc sẵn có; mỗi lần chỉ một bộ lọc. Được: gọn một hàng. Mất: không lọc "Hay dùng" trong một nhóm; hàng dài, phải vuốt nhiều.

## Khuyến nghị: cách 1, ba lý do

1. Chữ "Theo nhóm" ở hàng cũ đã có nghĩa khác (giá tính theo nhóm khách), dễ nhầm với nhóm dịch vụ.
2. 14 nhóm + "Tất cả" + "Chưa phân loại" nối thêm vào hàng đã có 3 chip lọc thì rất dài ở khổ 390px.
3. ADR-0058 Đ8 cần "Tất cả" và dòng "Đang lọc … — N dịch vụ" riêng cho nhóm, khó gộp chung một lựa chọn với "Hay dùng".

## Nói thật về bản 1.42

Bản 1.42 đã chừa chỗ thêm chip nhóm ở **cuối cùng hàng** lọc (chú thích trong `web/catalog-picker.ts`, ô `data-cho="nhom"`), tức là sẵn nghiêng về cách 2. Kế hoạch vẫn khuyến nghị cách 1; chọn cách nào thì `data-cho="nhom"` vẫn là điểm gắn. Câu này chỉ chặn Task A6.
