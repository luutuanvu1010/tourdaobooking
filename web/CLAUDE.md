# web/CLAUDE.md — luật giao diện

> Chỉ thêm ràng buộc cho `web/` và `public/`, không nới `CLAUDE.md` gốc. Bằng chứng giao diện thật cần trình duyệt (kịch bản Chrome, không nằm trong CI). Công thức: `docs/CHANGE-GUIDE.md`; thiết kế: `docs/SYSTEM-DESIGN.md` §9.

## Hệ thống thiết kế (đọc đúng mục, đừng đọc hết)
- **Token** (màu, chữ, khoảng cách…): đầu `public/app.css` (`:root`), gồm ba nhóm:
  - **Bản sao từ `tourdaovn`** (tên và giá trị chuẩn, không import): không đổi giá trị.
  - **MỚI cho app nội bộ** (màu nguy hiểm, kích thước ô nhập/bộ đếm): do chủ duyệt.
  - **"Riêng của Tour Đảo Booking"** (kích thước điện thoại/PWA): cần kích thước hay giá trị giao diện mới thì **thêm token vào nhóm này**, không viết cứng.
  - Màu/chữ mới (thương hiệu hay chức năng), hoặc đổi giá trị nhóm đầu: **hỏi chủ**.
- **Thiết kế màn hình** (bố cục, trạng thái, nội dung chữ): `docs/superpowers/specs/2026-09-19-a2-giao-dien-design.md`; trang nào gọi API nào: `docs/SYSTEM-DESIGN.md` §9; iPhone/PWA: `docs/PWA-IPHONE.md`.
- **Bản thiết kế gốc và ảnh tham chiếu:** `docs/design/a2-mockup/` (trong `refs/`: `tourdaovn-design-brief.md`, `tourdaovn-tokens.css`); ảnh giao diện thật: `docs/evidence/`.

## Luật
- **Không `innerHTML`.** Dựng DOM bằng `h()` ở `web/dom.ts`.
- `web/` import `src/shared` **không đuôi**; **không** import `src/modules/`. Luật dùng ở cả server và giao diện là tệp thuần ở `src/shared/`, không chép tay sang đây.
- Giao diện chỉ **ẩn/hiện** theo quyền; máy chủ luôn kiểm lại. Thông báo, nhãn, lỗi: tiếng Việt có dấu, không lộ chữ Anh hay mã thô (vd `cancelled`).
- **CSS:** giá trị đi vào token ở `:root` của `public/app.css`. Khối **sau** dấu mốc `/* ---------- app iPhone (PWA)` chỉ dùng token: không hex, `rgb()`, `hsl()`, `px` ngoài `1px`, `rem`, `em` (`tests/e2e/pwa.mjs` quét). Script **không** bắt tên màu (`red`), `%`, `vw/vh/ch`, `color-mix()` — tự kiểm khi viết CSS mới.
- **Ô gõ 16px** (chống zoom iOS).
- **Trang mới:** làm theo `docs/CHANGE-GUIDE.md` công thức c. Tối thiểu: `public/<trang>.html` (kèm phần `<head>` iOS), khai ở `PAGES` trong `src/shared/sw-policy.ts` (`src/shared/sw-policy.test.ts` đỏ nếu thiếu), thêm tệp vào script `build:web` trong `package.json`, gọi `initShell()`, thêm điều hướng ở `web/shell.ts`, rồi `npm run test:e2e -- pwa`.
- **Service worker:** `/api/*` không bao giờ qua cache (`src/shared/sw-policy.ts`, có test). `CACHE_VERSION` do build **tự chèn** (`__BUILD_ID__`), không ai tăng tay; chi tiết `docs/PWA-IPHONE.md`.

## Bẫy đã cắn thật
- Form: dùng `location.replace` (không `assign`) sau khi lưu để Back/bfcache không đưa về form đã lưu (tránh đơn trùng).
- Enter trong ô tìm danh mục bị chặn **có chủ đích** (ô nằm trong `<form>`).
- Widget Turnstile ở `web/login.ts`: id khung **không được** là `turnstile`; không gọi `turnstile.ready()`; `theme: "light"` (app chỉ có giao diện sáng); phải **hỏi lại** cấu hình sau 403/503 vì `siteKey` từng kẹt `null` — đừng bỏ. Chi tiết: `docs/CHANGE-GUIDE.md` công thức l ("Bẫy widget").

## Sửa tệp nào thì chạy lại kịch bản Chrome nào
Chạy `npm run build:web` trước. Cần Chrome + axe-core **ngoài repo**; cách chạy `tests/e2e/README.md`. Các trang dùng **chung kho cookie**: trang của tài khoản nào phải mở **sau cùng**.
| Sửa | Chạy |
|---|---|
| `web/order-form.ts`, `web/order.ts`, `web/trip-sheet.ts` | ba `a2-smoke-*.mjs` ở `docs/evidence/2026-09-20-a2/kich-ban/` |
| Khối "Người phụ trách" trong form lập đơn: `web/assignee-picker.ts`, `src/shared/assignee-pick.ts`, phần chọn người phụ trách của `web/order-form.ts` / `#owner-card` của `public/order-form.html`, khối `.owner-*`/`.assignee-*` của `public/app.css` (Task 1.8 phần b ADR-0030) | `chon-hdv-lap-don-smoke.mjs` ở `docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/` (12 bước, 390 + 1040, không cần mạng ngoài) + ba `a2-smoke-*.mjs` ở dòng trên |
| `web/login.ts`, `public/login.html`, CSP ở `public/_headers` | `v1-dang-nhap.mjs` ở `docs/evidence/2026-09-21-v1-0/kich-ban/` (15 bước, ước ~9 phút, cần mạng) + `dot-c-smoke.mjs` (cột thương hiệu máy tính, xem hàng cuối bảng) |
| `web/confirmation-image.ts`, `web/confirmation-dialog.ts`, `src/shared/order-confirmation.ts`, `src/shared/text-wrap.ts`, phần `moi=1`/nút "Xác nhận gửi khách" | `v1-xac-nhan-png.mjs` cùng thư mục (không cần mạng ngoài) |
| `web/orders.ts`, `web/order.ts`, `web/handler-sheet.ts`, `src/shared/handler-view.ts`, khối người phụ trách của `public/app.css` | `v1-nguoi-phu-trach.mjs` |
| `web/booker-picker.ts` (khối "Hồ sơ khách" ở form đơn, N2 lát 1) | `a2-smoke-form.mjs` ở `docs/evidence/2026-09-20-a2/kich-ban/` |
| `web/booker-sheet.ts` (bảng "Đổi khách" ở trang đơn, N2 lát 1) | `a2-smoke-order.mjs` (cùng thư mục) + `v1-nguoi-phu-trach.mjs` |
| `web/maintenance-screen.ts`, phần bảo trì của `web/api.ts`/`account.ts`/`shell.ts`/`login.ts`/`app.css` | `v1-bao-tri.mjs` (không cần mạng ngoài) |
| `web/feedback.ts`, `public/feedback.html`, dòng "Góp ý" ở `web/shell.ts`/`web/account.ts` | `dot-c-smoke.mjs` (bố cục 2 cột + hiện đồng thời danh sách/luồng máy tính, xem hàng cuối bảng) + `v1-bao-tri.mjs` (khung chung) và làm danh sách thử tay ở `docs/HANDOFF-FEEDBACK.md` |
| `web/account.ts`, `public/account.html` (hồ sơ, liên kết, đổi PIN, bố cục 2 cột máy tính — bảo trì đọc dòng riêng ở trên) | `dot-c-smoke.mjs` (xem hàng cuối bảng) + `v1-bao-tri.mjs` nếu đụng phần bảo trì |
| "Việc của tôi" của hướng dẫn viên: `web/viec-cua-toi.ts`, `src/shared/viec-cua-toi.ts`, khối `.hdv-*` của `public/app.css`, dòng gọi `initViecCuaToi` ở `web/account.ts` (Task 1.8 ADR-0030) | `hdv-viec-cua-toi-smoke.mjs` ở `docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/` (8 bước, 390 + 1040, không cần mạng ngoài) + `dot-c-smoke.mjs` nếu đụng bố cục 2 cột của trang Tôi |
| `web/staff.ts`, `web/catalog.ts`, `web/locations.ts`, `web/parties.ts`, `web/audit.ts` (mốc bảng→thẻ dùng chung, Bước 2 Đợt A) | `dot-a-smoke.mjs` ở `docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/` |
| Đợt C — cột thương hiệu Đăng nhập, bố cục 2 cột Tôi/Góp ý (`web/login.ts`, `web/account.ts`, `web/feedback.ts`, 3 tệp `.html` tương ứng) | `dot-c-smoke.mjs` ở `docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/kich-ban/` (3 trang × 2 khổ) |
| `web/home.ts`, `public/home.html`, khối `.dash-*` của `public/app.css`, hàm `getDashboard()`/route `GET /api/orders/dashboard` (`src/modules/orders/`) | `trang-chu-smoke.mjs` ở `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/` (12 bước; ghim "dịch vụ quyết định hôm nay" quyết cả giờ LẪN nơi đón, ghim thứ tự khai route dashboard trước `/api/orders/:id`, đo xuống dòng ô số liệu ở 390px và chiều cao tab bar) |
| Đăng nhập bằng Face ID (ADR-0016): `web/passkey.ts`, `src/shared/passkey-error.ts`, phần passkey của `web/login.ts`/`public/login.html`/`web/account.ts`/`public/account.html`/`web/staff.ts` — đăng nhập / trang Tôi / quản lý nhân viên | `passkey-smoke.mjs` ở `docs/evidence/2026-09-23-passkey/kich-ban/` (authenticator ẢO qua CDP miền WebAuthn, không cần Face ID thật, không cần mạng ngoài) + `v1-dang-nhap.mjs`, `v1-bao-tri.mjs`, `dot-c-smoke.mjs` nếu chạm chung các tệp trên |
| `web/help.ts`, `web/help-seen.ts`, `public/help.html`, mục "Trợ giúp"/chấm đỏ ở `web/shell.ts`/`web/account.ts`, `src/shared/changelog.ts` | `help-smoke.mjs` ở `docs/evidence/2026-09-23-nhat-ky-thay-doi/kich-ban/` (5 bước, không cần mạng) |
| `web/staff.ts` (nút "Đặt lại PIN" không hiện ở hàng/thẻ "(bạn)" — DK-T3-02) | `va3-smoke.mjs` ở `docs/evidence/2026-09-26-va-3-loi-kiem-toan/kich-ban/` (bước 1–2; phần DK-T4-02 của "Việc của tôi" nay ở `hdv-viec-cua-toi-smoke.mjs`, dòng trên) |
| `web/order-form.ts`, `web/service-card.ts` — phần khoá ô đơn giá, ô giảm giá và dòng báo cho tài khoản có quyền Đối tác (ADR-0027) | `doi-tac-lap-don-smoke.mjs` ở `docs/evidence/2026-09-26-mo-danh-muc-doi-tac/kich-ban/` (đếm số hàng của dòng báo; kèm ba `a2-smoke-*.mjs` ở dòng đầu bảng) |
