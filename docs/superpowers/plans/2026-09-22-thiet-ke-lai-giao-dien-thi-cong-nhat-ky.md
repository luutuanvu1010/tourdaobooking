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

### Bước 1 hoàn tất thi công (2026-09-22)

- `npm test` — 450/450 pass. `npm run typecheck` — `tsc` (server) + `-p web` + `-p web/sw`: 0 lỗi. `npm run test:e2e -- orders` — 1/1 kịch bản xanh (`E2E OK`). `npm run test:e2e -- pwa` — 1/1 kịch bản xanh (`E2E PWA OK`). Cả 4 lệnh chạy THẬT trong phiên Task 6 (không phải suy đoán từ Task 5), tại commit `fdf6bfc`.
- Kịch bản Chrome:
  - `a2-smoke-order.mjs` — ✓ (11 bước, `UI SMOKE ORDER OK`, thoát mã 0).
  - `a2-smoke-form.mjs` — ✓ (22 bước, `UI SMOKE FORM OK`, thoát mã 0).
  - `a2-smoke-sheet.mjs` — ✓ (13 bước, `UI SMOKE SHEET OK`, thoát mã 0).
  - `v1-nguoi-phu-trach.mjs` — ✓ tại commit `89a2a02` (chạy ở Task 5, 12/12 bước), **không chạy lại** sau `fdf6bfc` (thay đổi 1 dòng `preventDefault`, không đụng CSS/DOM khối người phụ trách — theo đúng quyết định Task 5, kế thừa ở Task 6).
  - `v1-dang-nhap.mjs` — ✓ (15 bước a–o, `V1 DANG NHAP OK`, thoát mã 0; cần mạng thật để tải script Turnstile + gọi siteverify bằng khoá thử — mạng sẵn có trong sandbox này, không cần giả lập).
  - `v1-bao-tri.mjs` — ✓ (17 bước, "Giao diện chế độ bảo trì: tất cả bước ✓", thoát mã 0).
  - Không có kịch bản Chrome nào ✗ — khung dùng chung mới (`--bar-h`/`--w-main`, Task 3) không làm hỏng hành vi cũ ở bất kỳ trang nào đã có kịch bản.
  - Lưu ý kỹ thuật: `v1-dang-nhap.mjs` tự ghi đè 5 tệp bằng chứng (`docs/evidence/2026-09-21-v1-0/anh/dang-nhap-*.png` + `ket-qua-dang-nhap.json`) — đã `git checkout --` khôi phục nguyên trạng sau khi xác nhận kết quả (giống cách Task 5 xử lý với `v1-nguoi-phu-trach.mjs`); không có bằng chứng ảnh mới nào cho giao diện đã restyle được đưa vào repo ở Task 6.
- Xem tay trên điện thoại thật: **CHƯA làm** — cần chủ dự án tự làm (không có điện thoại thật trong sandbox này để thực hiện; đây không phải kết quả suy đoán).
- CHƯA có người kiểm độc lập đọc lại mã (việc lớn theo CLAUDE.md §3 — cần trước khi báo "đạt" với chủ dự án).
