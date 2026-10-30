# Đề xuất sửa `web/CLAUDE.md` — trỏ hai kịch bản Chrome tới bản chép (luật khung 30/10/2026)

> Tệp luật: AI chỉ đề xuất (CLAUDE.md §3, N9); chủ duyệt mới sửa. Chỉ đổi ĐƯỜNG DẪN kịch bản cho khớp mã — không đổi nghĩa quy tắc.

## Vì sao

Luật khung 30/10 (chủ duyệt) đổi hai điều mà hai kịch bản cũ ghim cứng:
- Thẻ đơn không còn «đúng 2 dòng» (luật 6: không cắt tên, số khách, số tiền) ⇒ `v1-nguoi-phu-trach.mjs` bước a (trần cao 84px) và bước m (tên dài PHẢI bị cắt) đỏ đúng dự kiến.
- Trang Tôi máy tính xếp kiểu cột báo thay lưới hai cột ⇒ `dot-c-smoke.mjs` (kiểm `display: grid`, `#maintenance` ở cột 2) đỏ đúng dự kiến.

Bản chép ở `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/` chỉ đổi đúng các phép kiểm đó (đầu mỗi tệp ghi rõ); hồ sơ cũ giữ nguyên — cùng lệ «bản chép thay bằng»
của đợt 0 (`docs/evidence/2026-10-29-dot-0-khung-chung/README.md`).

## Sửa (bảng «Sửa tệp nào thì chạy lại kịch bản Chrome nào»)

1. Dòng `web/orders.ts`, `web/order.ts`, `web/handler-sheet.ts`, … → cột «Chạy»: `v1-nguoi-phu-trach.mjs` ⇒
   `v1-nguoi-phu-trach.mjs` **bản chép ở `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/`** (thay bản ở `docs/evidence/2026-09-21-v1-0/kich-ban/`).
2. Các dòng nhắc `dot-c-smoke.mjs` (trang Tôi, Đợt C, Face ID, giấy tờ, Xe…) ⇒ thêm câu: «phần trang Tôi chạy **bản chép** ở
   `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/dot-c-smoke.mjs`; phần `/feedback` của nó đã thay bằng `ho-tro-smoke.mjs` (dòng Trang Hỗ trợ)».
3. Thêm dòng mới cuối bảng:
   `| Luật khung 30/10 (khối «Luật khung 30/10» cuối public/app.css; dòng cuộn thanh bên ở web/shell.ts; tông dải nhắc ở web/dai.ts; Sổ công nợ tự chọn) | dot-0-smoke.mjs + mat-mang-smoke.mjs (đợt 0) + kịch bản đo docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/do-loi.py và soi-thanh-ben.py (máy thử có tệp giao diện giống production) |`

## Kết quả chạy hai bản chép (30/10, Chrome headless 141, axe-core 4.13)

Xem mục «Kịch bản Chrome đã chạy» của `docs/superpowers/plans/2026-10-30-sua-hien-thi-va-luat-khung.md`.
