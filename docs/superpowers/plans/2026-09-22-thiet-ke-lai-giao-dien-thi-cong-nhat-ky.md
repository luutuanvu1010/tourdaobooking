# Nhật ký thi công — Thiết kế lại giao diện

## Bước 1 — Khung dùng chung + trang mẫu "Đơn hàng"

### Task 4: Rà soát khuôn lớp phủ dùng chung (2026-09-22)

Độc lập kiểm chứng `web/confirmation-dialog.ts` và `web/trip-sheet.ts` với 4 tiêu chí §8 đặc tả:

| Tiêu chí | `confirmation-dialog.ts` | `trip-sheet.ts` |
|---|---|---|
| `role="dialog"` + `aria-modal` + `aria-labelledby` | ✅ Dòng 135 | ✅ Dòng 62 |
| Nền `inert` khi mở, gỡ khi đóng | ✅ Dòng 231 (mở), 156 (đóng) | ✅ Dòng 126 (mở), 80 (đóng) |
| Esc / ✕ / chạm nền đóng, trả focus | ✅ Dòng 149 (Esc), 226 (✕), 227 (nền), 160 (focus) | ✅ Dòng 75 (Esc), 121 (✕), 122 (nền), 83 (focus) |
| Hai khung `requestAnimationFrame` trước khi mở | ✅ Dòng 234 | ✅ Dòng 129 |

**Kết luận:** Cả hai tệp ĐÃ ĐẠT đủ 4 tiêu chí — không cần sửa mã, không cần test mới.

Xác nhận 3 tệp không thuộc phạm vi 4 tiêu chí trên:
- `web/catalog-picker.ts` (dòng 2-3: không `role="dialog"`, không `inert` — ô tìm + danh sách nội tuyến)
- `web/banner.ts` (chỉ dựng DOM vào phần tử `role="alert"` — không phải hộp thoại)
- `web/maintenance-screen.ts` (dòng 87-91: `role="alertdialog"` toàn trang — thuộc bảng "trạng thái/thông báo" của §8, không phải bảng hộp thoại)

Kết luận: **Task 4 không có thay đổi mã.**
