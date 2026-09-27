# ADR-0035 — Phần ít thay đổi của app nằm sẵn trên máy; mỗi lần mở trang chỉ chờ dữ liệu

- **Trạng thái:** **accepted** — chủ dự án quyết trong phiên chat 2026-09-27: *"Q1 chọn A, duyệt ADR-0035"* (điều 3 áp phương án A: lưu bản nhớ khung). AI ghi lại, không tự quyết. Từ mốc này chỉ sửa dòng trạng thái; thay đổi nội dung = ADR mới.
- **Ngày:** 2026-09-27   **Loại:** cửa **hai chiều** — không migration, không đổi API/quyền; gỡ bằng revert commit và một lần triển khai (service worker `no-store` nên máy nhận bản gỡ ở lần mở kế tiếp).
- **Liên quan:** xây trên thiết kế PWA 2026-09-19 (`docs/PWA-IPHONE.md`, `src/shared/sw-policy.ts`); giữ nguyên Bảng tin (ADR-0022); phối hợp thứ tự với ADR-0034 (Thông báo, proposed — cùng chạm `web/shell.ts`, `web/sw/sw.ts`). Số 0030–0032 dành cho Đơn tự do, 0034 cho Thông báo → lấy 0035 (kiểm lại số lúc gộp).

## Bối cảnh

Chủ dự án muốn những gì ít thay đổi (bộ khung, nền, logo…) nằm sẵn trên máy để mở trang nhanh nhất. Đo 2026-09-27: HTML/CSS/phông/logo/JS đã nằm trong bộ nhớ đệm của service worker (lần hỏi lại ở nền chỉ nhận `304`), nhưng (1) 8/14 trang chưa nạp sẵn, (2) **bộ khung vẽ bằng mã** (thanh trên, menu, tab) chỉ hiện sau khi `/api/auth/me` trả lời, (3) dữ liệu trang hỏi nối đuôi sau `/api/auth/me`.

## Quyết định

1. **Tệp tĩnh:** service worker nạp sẵn **mọi** trang và mọi JS của trang ở lần cài mỗi bản dựng, lấy thẳng máy chủ (`cache: "reload"`); test giữ danh sách khớp `build:web`. Giữ cách phục vụ "bản trên máy trước, hỏi lại ở nền".
2. **Dữ liệu:** trang gửi lời gọi dữ liệu song song với `/api/auth/me`, chỉ dùng sau khi biết người dùng. **Bất biến giữ nguyên:** dữ liệu `/api/*` không bao giờ vào bộ nhớ đệm của service worker; máy chủ quyết mọi quyền.
3. **Bộ khung vẽ bằng mã** *(tuỳ Q1)*: lưu trên máy một "bản nhớ khung" tối thiểu — chữ cái đầu tên + 4 cờ quyết định mục menu — để vẽ khung tức thì; `/api/auth/me` là nguồn sự thật, về thì sửa khung và ghi đè bản nhớ; đăng xuất xoá. Không lưu SĐT, email, dữ liệu khách, đơn hay tiền.
4. **Không** chuyển app thành một trang duy nhất (tự điều hướng trong một trang). Lý do: phải viết lại cách mọi trang khởi động và cách Bảng tin nối lại theo trang; lợi thêm nhỏ so với 1–3 cộng hiệu ứng chuyển trang của trình duyệt. Xem lại nếu sau 1–3 vẫn thấy chậm trên iPhone thật.

## Hệ quả

- Mỗi máy tải ≈ 250 KB nén mỗi lần triển khai (trước ≈ 150 KB).
- Menu có thể cũ trong một lượt mạng sau khi đổi quyền; chỉ là liên kết, máy chủ vẫn từ chối.
- Trang mới phải thêm vào `PRECACHE` (test đỏ nếu quên) — đã ghi ở `docs/CHANGE-GUIDE.md` công thức c.
- Bẫy Turnstile giữ nguyên (CLAUDE.md §10): `login.js` vẫn có thể chạy bản cũ ở lần mở đầu sau triển khai.
