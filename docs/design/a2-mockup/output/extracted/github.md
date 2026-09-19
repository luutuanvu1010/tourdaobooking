repo: luutuanvu1010/tourdaobooking
branch: main

## Last sync
date: 2026-09-19T13:20:00Z

### Updated in this project
- Dựng lại vỏ PWA (thanh đầu navy, nút “‹”, thanh tab 3 tab, nút Lưu dính đáy) từ `public/app.css` + `web/shell.ts` + `web/icons.ts`.
- Thiết kế lại phần “Dịch vụ” của form lập đơn: từ các dòng phẳng `.item` thành THẺ DỊCH VỤ (bộ đếm khách, đơn giá sửa được, khối Thông tin chuyến).
- Trang đơn: mỗi dịch vụ một khối thay cho `table.items.order-lines`; thêm trạng thái đã xác nhận và bảng sửa thông tin chuyến.
- Thêm 4 vai token trạng thái (danger MỚI; warning/success/info tái dùng sand, green, primary-soft).

## Screen map
| Màn hình trong project | Tệp nguồn trong repo |
|---|---|
| `Mockup A2 — Canvas.dc.html` · 1a–1g (form lập đơn) | `public/order-form.html`, `web/order-form.ts`, `public/app.css`, `src/shared/order-lines.ts` |
| `Mockup A2 — Canvas.dc.html` · 1h–1k (trang đơn, bottom sheet) | `public/order.html`, `web/order.ts`, `web/format.ts`, `public/app.css` |
| Vỏ PWA dùng chung trong cả hai tệp | `web/shell.ts`, `web/icons.ts`, `public/app.css` (khối `app iPhone (PWA)`), `docs/PWA-IPHONE.md` |
| `Mockup A2 — Prototype.dc.html` | `web/order-form.ts`, `web/order.ts`, `web/format.ts` (định dạng tiền, nhãn trạng thái) |
