# web/CLAUDE.md — luật giao diện

> Chỉ thêm ràng buộc cho `web/` và `public/`, không nới `CLAUDE.md` gốc. Bằng chứng giao diện thật cần trình duyệt (kịch bản Chrome, không nằm trong CI). Công thức: `docs/CHANGE-GUIDE.md`; thiết kế: `docs/SYSTEM-DESIGN.md` §9.

## Luật
- **Không `innerHTML`.** Dựng DOM bằng `h()` ở `web/dom.ts`.
- `web/` import `src/shared` **không đuôi**; **không** import `src/modules/`. Luật dùng ở cả server và giao diện là tệp thuần ở `src/shared/`, không chép tay sang đây.
- Giao diện chỉ **ẩn/hiện** theo quyền; máy chủ luôn kiểm lại. Thông báo, nhãn, lỗi: tiếng Việt có dấu, không lộ chữ Anh hay mã thô (vd `cancelled`).
- **CSS:** giá trị đi vào token ở `:root` của `public/app.css`. Khối **sau** dấu mốc `/* ---------- app iPhone (PWA)` chỉ dùng token: không hex, `rgb()`, `hsl()`, `px` ngoài `1px`, `rem`, `em` (`tests/e2e/pwa.mjs` quét). Script **không** bắt tên màu (`red`), `%`, `vw/vh/ch`, `color-mix()` — tự kiểm khi viết CSS mới.
- **Ô gõ 16px** (chống zoom iOS).
- **Trang mới:** thêm `public/<trang>.html`, khai ở `PAGES` trong `src/shared/sw-policy.ts`, và thêm tệp vào script `build:web` trong `package.json`.
- **Service worker:** `/api/*` không bao giờ qua cache (`src/shared/sw-policy.ts`, có test). `CACHE_VERSION` do build **tự chèn** (`__BUILD_ID__`), không ai tăng tay; chi tiết `docs/PWA-IPHONE.md`.

## Bẫy đã cắn thật
- Form: dùng `location.replace` (không `assign`) sau khi lưu để Back/bfcache không đưa về form đã lưu (tránh đơn trùng).
- Enter trong ô tìm danh mục bị chặn **có chủ đích** (ô nằm trong `<form>`).
- Widget Turnstile ở `web/login.ts`: id khung **không được** là `turnstile`; không gọi `turnstile.ready()`; `theme: "light"` (app chỉ có giao diện sáng); phải **hỏi lại** cấu hình sau 403/503 vì `siteKey` từng kẹt `null` — đừng bỏ. Chi tiết: `docs/CHANGE-GUIDE.md` công thức l ("Bẫy widget").

## Sửa tệp nào thì chạy lại kịch bản Chrome nào
Cần Chrome + axe-core **ngoài repo**; cách chạy `tests/e2e/README.md`. Các trang dùng **chung kho cookie**: trang của tài khoản nào phải mở **sau cùng**.
| Sửa | Chạy |
|---|---|
| `web/order-form.ts`, `web/order.ts`, `web/trip-sheet.ts` | ba `a2-smoke-*.mjs` ở `docs/evidence/2026-09-20-a2/kich-ban/` |
| `web/login.ts`, `public/login.html`, CSP ở `public/_headers` | `v1-dang-nhap.mjs` ở `docs/evidence/2026-09-21-v1-0/kich-ban/` (15 bước, ~9 phút, cần mạng) |
| `web/confirmation-image.ts`, `web/confirmation-dialog.ts`, `src/shared/order-confirmation.ts`, `src/shared/text-wrap.ts`, phần `moi=1`/nút "Xác nhận gửi khách" | `v1-xac-nhan-png.mjs` cùng thư mục (không cần mạng ngoài) |
| `web/orders.ts`, `web/order.ts`, `web/handler-sheet.ts`, `src/shared/handler-view.ts`, khối người phụ trách của `public/app.css` | `v1-nguoi-phu-trach.mjs` |
| `web/maintenance-screen.ts`, phần bảo trì của `web/api.ts`/`account.ts`/`shell.ts`/`login.ts`/`app.css` | `v1-bao-tri.mjs` (không cần mạng ngoài) |
