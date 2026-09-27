# Đặc tả: tối ưu tải trang — phần ít thay đổi nằm sẵn trên máy, mỗi lần bấm chỉ chờ dữ liệu

- **Nguồn:** chủ dự án, phiên chat 2026-09-27: *"những gì ít và/hoặc hiếm khi thay đổi (bộ khung, nền, logo…) thì lưu đệm trên máy, để mỗi khi tải trang sẽ đạt tốc độ nhanh nhất"*; yêu cầu đặc tả + ADR ngắn trước khi thi công tiếp.
- **Quyết định kèm theo:** ADR-0035 (proposed). **Loại việc:** việc lớn (cách bản mới đến máy nhân viên) → người kiểm độc lập, chỉ đọc.
- **Không** migration, không đổi API, không đổi quyền. Máy chủ vẫn quyết mọi quyền; dữ liệu `/api/*` vẫn **không bao giờ** vào bộ nhớ đệm của service worker.

## 1. Hiện trạng đo được (2026-09-27)

| Thứ | Đang ở đâu | Đo |
|---|---|---|
| HTML, CSS (nền, màu), phông chữ, logo/icon, JS của trang | Bộ nhớ đệm service worker (có từ 2026-09-19) — nhưng chỉ 6/14 trang nạp sẵn | Lần hỏi lại ở nền là GET có điều kiện: production trả `304`, 0 byte |
| **Bộ khung vẽ bằng mã**: thanh trên (chữ cái tên, ô tìm, nút Tạo đơn), menu bên, thanh tab dưới | Vẽ **sau** khi `GET /api/auth/me` trả lời (`web/shell.ts` `initShell()`); `public/*.html` chỉ có `<header id="topbar"></header>` rỗng | Khung trống ≈ một lượt mạng mỗi lần chuyển trang (≈ 150–280 ms) |
| Dữ liệu trang | Hỏi **sau** `/api/auth/me` (nối đuôi) | `/orders` dữ liệu hiện sau 417 ms (Chrome, trễ giả lập 150 ms/lượt) |
| Chuyển trang | Tải lại cả trang → màn trắng chớp giữa hai trang | chưa đo |

## 2. Phạm vi (mỗi mục một lát, làm theo thứ tự)

- **Lát 1 — đã thi công trên nhánh `worktree-toi-uu-tai-trang` (7e38695), chờ duyệt ADR:**
  - Nạp sẵn **mọi** trang + mọi JS lúc cài bản mới, lấy thẳng máy chủ (`cache: "reload"`); test đối chiếu `build:web`.
  - Gửi lời gọi dữ liệu **song song** với `/api/auth/me` ở Đơn hàng, Trang chủ, Chi tiết đơn, Lập/Sửa đơn (`web/goi-som.ts`); vẫn chỉ dùng dữ liệu sau `initShell()`.
  - Kết quả đo: `/orders` 417 → 215 ms; `/` (tài khoản quản trị) 419 → 419 ms, vì khối "Cần xem lại" phải biết vai trước — lát 2 giải.
- **Lát 2 — vẽ bộ khung ngay (Q1 = A; đã thi công):** lưu trên máy một **"bản nhớ khung"** gồm chữ cái đầu tên + các mục menu được thấy (4 cờ: quản trị / thấy mọi đơn / văn phòng / được lập đơn). Mở trang → vẽ thanh trên, menu, tab **ngay** từ bản nhớ; `/api/auth/me` về thì vẽ lại nếu khác và ghi đè bản nhớ. Đăng xuất / hết phiên → xoá bản nhớ. Không lưu SĐT, email, dữ liệu khách hay đơn.
- **Lát 3 — chuyển trang không chớp trắng (giả định bề mặt, đảo ngược được; đã thi công):** bật hiệu ứng chuyển trang của trình duyệt bằng một dòng CSS (`@view-transition { navigation: auto; }`); máy không hỗ trợ thì như cũ.
- **Lát 4 — gọn mã dùng chung (giả định bề mặt):** tách phần mã chung của các trang (khung, menu, biểu tượng) thành một tệp dùng chung để iPhone không phải đọc lại ~14 bản sao; kiểm lại `build:web`, `PRECACHE`, CSP.

- **Lát 4 — KHÔNG làm (đo 2026-09-27):** tách mã chung (esbuild `--splitting`) giảm tổng JS 672 KB → 260 KB (chưa nén), nhưng mỗi lần chuyển trang iPhone vẫn phải đọc phần mã chung (chunk lớn nhất 47 KB) cộng mã trang — gần như cũ, nên người dùng không thấy nhanh hơn; cái giá là tên tệp chunk đổi theo mỗi bản dựng nên `PRECACHE` phải sinh tự động lúc build. Lợi chỉ còn ở dung lượng nạp sẵn mỗi lần triển khai. Xem lại nếu đo trên iPhone thật thấy thời gian đọc mã đáng kể.

**Không làm (ADR-0035 điều 4):** đổi app thành một trang duy nhất.

## 3. Tiêu chí nghiệm thu (kiểm được)

1. `npm test` đỏ nếu một trang/JS thiếu trong `PRECACHE` (đã có, đã thấy đỏ thật).
2. Bài đo Chrome (trễ 150 ms): `/orders` dữ liệu ≤ 250 ms; sau lát 2, thanh tab/menu có mặt **trước** khi `/api/auth/me` trả lời (đo bằng thời điểm phần tử xuất hiện so với `responseEnd` của `/api/auth/me`).
3. Sau lát 2: đổi quyền một tài khoản → lần mở kế tiếp menu đúng quyền mới sau khi `/api/auth/me` về; đăng xuất → bản nhớ khung bị xoá (kiểm bằng Chrome).
4. Bảng tin giữ đúng hành vi: một kết nối mỗi trang, `can-tai-lai`/`don-thay-doi` gọi dữ liệu **mới** (không dùng lại lời gọi sớm).
5. Các kịch bản Chrome của `web/CLAUDE.md` cho các tệp đã chạm đạt; lỗi tương phản thanh bên có sẵn trên `main` (không do việc này) ghi riêng.
6. Sau triển khai: bản mới đến máy (`kiem-phien-ban.mjs --sau-deploy`); cách tắt khẩn cấp ở `docs/PWA-IPHONE.md` vẫn dùng được.

## 4. Tệp sẽ chạm (thống nhất thứ tự với phiên Thông báo — ADR-0034)

| Lát | Tệp | Đụng phiên Thông báo? |
|---|---|---|
| 1 (xong) | `src/shared/sw-policy.ts` (+test), `web/sw/sw.ts` (2 dòng ở `install`), `web/goi-som.ts` (mới), `web/orders.ts`, `web/order.ts`, `web/home.ts`, `web/order-form.ts`, 3 tài liệu | `web/sw/sw.ts`: họ thêm xử lý `push` (khác đoạn) |
| 2 | `web/shell.ts` (vẽ khung từ bản nhớ), `web/api.ts` hoặc `web/shell.ts` (xoá bản nhớ ở đăng xuất/hết phiên), tệp logic thuần mới `web/khung-nho.ts` + test | **Có** — họ thêm chuông vào `web/shell.ts`. Đề xuất: gộp lát 1 trước; lát 2 làm SAU khi nhánh Thông báo gộp, hoặc bên nào gộp sau tự hoà giải |
| 3 | `public/app.css` (1 khối) | Không |
| 4 | `package.json` (`build:web`), `src/shared/sw-policy.ts` (`STATIC_FILE`, `PRECACHE`), có thể `public/_headers` | `sw-policy.ts` nếu họ đổi danh sách |

Bảng tin (`web/bangtin.ts`, ADR-0022): không chạm ở lát nào.

## 5. Bẫy đã biết

- **Turnstile / `login.js` cũ (CLAUDE.md §10):** `login.js` đã nằm trong `PRECACHE` từ trước; lát 1 không đổi điều đó. Ở lần mở đầu tiên sau triển khai trình duyệt vẫn có thể chạy khung cũ → giữ quy tắc: đặt `TURNSTILE_SECRET_KEY` **sau** khi nhân viên đã mở app một lần.
- Nạp sẵn mọi trang ≈ 250 KB nén **mỗi máy mỗi lần triển khai** (trước ≈ 150 KB). Triển khai nhiều lần/ngày thì mỗi máy tải chừng ấy mỗi lần — chấp nhận được với 4G.
- Bản nhớ khung (lát 2) có thể cũ trong một lượt mạng (vd vừa bị gỡ quyền quản trị: menu quản trị hiện thoáng rồi biến). Chỉ là liên kết; máy chủ vẫn từ chối (403).
- Máy dùng chung (nhiều người trên một iPhone): đăng xuất xoá bản nhớ; phiên hết hạn → về đăng nhập, bản nhớ bị ghi đè ở lần đăng nhập sau.

## 6. Câu hỏi cho chủ — ĐÃ TRẢ LỜI 2026-09-27: Q1 = A, Q2 = duyệt

- **Q1 (dữ liệu trên máy):** cho phép lưu "bản nhớ khung" (chữ cái đầu tên + 4 cờ menu, không SĐT/dữ liệu khách) trên máy để khung hiện tức thì? (A) cho phép — khuyến nghị; (B) không lưu gì, chỉ vẽ khung trống không có mục rồi điền sau; (C) giữ như hiện nay.
- **Q2:** duyệt ADR-0035 (gồm cả lát 1 đã làm)?
