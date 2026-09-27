# Bằng chứng — tối ưu tải trang (ADR-0035), 2026-09-27

Máy: MacBook của chủ dự án, Chrome headless qua `chrome-wrap.sh`, D1 tạm, `wrangler dev`. Bản "trước" = `main` a74048e (xuất bằng `git archive` ra thư mục tạm, build lại).

## Đo tốc độ — `kich-ban/do-toc-do.mjs`

Tài khoản quản trị, khổ 390px, trễ giả lập 150 ms mỗi lượt mạng, mỗi trang 5 lần (trung vị 4 lần sau lần làm nóng).

| Trang | Khung (thanh tab) hiện | Dữ liệu hiện | Lời gọi dữ liệu song song với `/api/auth/me` |
|---|---|---|---|
| `/orders` trước | 166 ms (sau `/api/auth/me`) | 417 ms | không |
| `/orders` sau | **10 ms** (trước `/api/auth/me`) | **214 ms** | có |
| `/` trước | 162 ms | 418 ms | không |
| `/` sau | **9 ms** | **216 ms** | có (kể cả hai lời gọi "Cần xem lại" của quản trị) |

Production 2026-09-27: `GET /js/orders.js` với `If-None-Match` → `304`, 0 byte (lần hỏi lại ở nền của service worker không kéo lại mã).

## Kịch bản Chrome (bản cuối của nhánh)

| Kịch bản | Kết quả | Ghi chú |
|---|---|---|
| `v1-dang-nhap.mjs` | 16 ✓, đạt | Bản có `@view-transition` đỏ bước f, g (lỗi console do Chrome in) → lát 3 bị bỏ |
| `dot-a-smoke.mjs` | 10 ✓, đạt | |
| `help-smoke.mjs` | 6 ✓, đạt | |
| `a2-smoke-form/order/sheet.mjs` | 24 / 11 / 14 ✓, đạt | |
| `v1-nguoi-phu-trach.mjs` | 1 bước đỏ | Lỗi tương phản axe ở tên thương hiệu thanh bên — **`main` đỏ y hệt** |
| `trang-chu-smoke.mjs` | dừng ở bước axe máy tính | Cùng lỗi tương phản có sẵn trên `main`; bản tạm bỏ riêng luật `color-contrast` chạy **40/40 ✓** (bản trước khi xoá bản nhớ ở `/login`: đỏ I-1) |
| `v1-bao-tri.mjs`, `dot-c-smoke.mjs` | đỏ | **`main` đỏ y hệt** (không thấy mục "Chế độ bảo trì" ở trang Tôi) — phần bảo trì của khung CHƯA kiểm được bằng Chrome |

E2E: `npm run test:e2e -- pwa orders` 2/2 xanh. `npm test` 952/952, `npm run typecheck` 0 lỗi.

Chưa kiểm: iPhone Safari thật; tài khoản không phải quản trị trong bài đo.
