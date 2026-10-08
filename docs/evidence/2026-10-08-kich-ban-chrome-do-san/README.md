# Kịch bản Chrome đỏ sẵn trên main — nguyên nhân và bản sửa (8/10/2026)

Hồ sơ có ngày (không sửa lại cho khớp hiện trạng). Gốc: `main` 4d98a205. Phiên làm nhánh QR thanh toán (2026-10-08) phát hiện bốn kịch bản đỏ sẵn, sau đó báo thêm `dat-gap-smoke.mjs`.

Cách chạy: Chrome headless trên macOS, `axe-core` 4.13.0 lấy bằng `npm pack` ngoài kho, D1 local tạm của `a2-cdp.mjs`, `OUT=<thư mục tạm>` (không đè ảnh/kết quả của hồ sơ cũ). Lần chạy cuối của mỗi kịch bản không chạy song song với kịch bản khác của phiên này (phiên QR vẫn chạy kịch bản của nó trên cùng máy): lần đầu chạy bốn kịch bản cùng lúc, `v1-nguoi-phu-trach` đỏ thêm bước p, q vì `wrangler d1 execute` lỗi khi máy bận (chạy lại riêng `ONLY=p,q` thì qua — cùng hiện tượng nhật ký 1/10 đã ghi).

## Kết quả trước / sau

| Kịch bản | Trước (main 4d98a205) | Sau (nhánh này) |
|---|---|---|
| `2026-09-20-a2/kich-ban/a2-smoke-form.mjs` | dừng ở bước 1b (đếm 4 mục, thực tế 5) | **còn đỏ ở bước 4b — lỗi giao diện thật** (dưới); bản sao tạm bỏ qua riêng 4b: 24 bước còn lại ✓ (25 dòng ✓ gồm cả 4b đã bỏ qua) |
| `2026-09-20-a2/kich-ban/a2-smoke-order.mjs` | 2 ✓, dừng ở bước 3 "form mở lại đơn" | 11/11 ✓ |
| `2026-09-20-a2/kich-ban/a2-smoke-sheet.mjs` | 7 ✓, dừng ở bước 5 "đóng bảng + banner đã lưu" | 14/14 ✓ |
| `2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs` | 12 ✓ / 5 ✗ (h, j, l; p, q do máy bận) | 17/17 ✓ |
| `2026-09-29-adr-0049/kich-ban/dat-gap-smoke.mjs` | 8 ✓ / 4 ✗ (3, 7, 8, 10) | 12/12 ✓ |

## Nguyên nhân

**Chung — luật một phiên (ADR-0074/ADR-0075, duyệt 1/10).** Tài khoản không phải Toàn quyền chỉ có một phiên; đăng nhập mới kết thúc phiên cũ với lý do `bi_thay`. Kịch bản viết trước đó đăng nhập lại tuỳ ý. Phép thử đối chứng (D1 tạm, trang Bán hàng đang mở ở `/order`): đăng nhập tài khoản KHÁC → `/api/auth/me` của trang vẫn 200, mở form bình thường; đăng nhập lại CHÍNH tài khoản đó → 401, trang bị đưa về `/login?next=…`; sổ phiên ghi `end_reason = bi_thay`.
- `a2-smoke-order` (bước 2), `a2-smoke-sheet` (`getOrder()` ở bước 3; bước 4–4b vẫn qua vì `fetch` của trang bị giả lập), `v1-nguoi-phu-trach` (`assigneesApi()` / `handlerOf()` gọi bằng Sales Một; bước l đỏ theo vì 401 ở trang đã bị thay), `a2-smoke-form` bước 10a ("cùng người lập, phiên khác"): lời gọi Node đăng nhập lại giết trang đang mở.
- `dat-gap-smoke`: chiều ngược lại — `call` của `dp-lib.mjs` nhớ một phiên mỗi tài khoản, `env.as` cùng tài khoản giết phiên nhớ đó, lời đọc sau nhận 401.

**Riêng `a2-smoke-form` bước 1b — kịch bản lạc hậu.** Từ ADR-0047 Phần B (bản vẽ điện thoại M2, 1/10) dưới 960px có khối "Hành khách" ngay sau "Dịch vụ"; kịch bản vẫn đếm bốn mục.

**Riêng `v1-nguoi-phu-trach` bước j — vi phạm axe đã duyệt.** Chủ dự án khoá phóng to (9ae19510, 30/9) nên mọi trang có `maximum-scale=1, user-scalable=no` và axe báo `meta-viewport`.

## Cách sửa (chỉ sửa kịch bản; không khẳng định nào bị nới)

- Đọc không phụ thuộc người gọi → tài khoản Toàn quyền `ACCOUNTS.chu` (được nhiều máy): order, sheet, v1. "Người khác sửa / huỷ ở nơi khác" cũng đi bằng `chu`; status 200 vẫn được kiểm.
- Đọc phải đúng vai → `fetch` qua chính trang đang mở của vai đó (`dat-gap-smoke`; Đối tác vẫn chỉ nhận `{ daDuyet: true }`).
- "Cùng người, tab khác" → `env.openPage()` không đăng nhập lại (form bước 10a).
- Form bước 1b: danh sách mong đợi thêm "Hành khách" ở đúng vị trí (ghim cả vị trí M2).
- v1 bước j: `axeRun` bỏ ĐÚNG vi phạm `meta-viewport` (một nút, `meta[name="viewport"]`, chuỗi viewport đúng bản đã duyệt); kết quả thô vẫn ghi ở `results.axe` (19/19 trạng thái có `meta-viewport`, 0 vi phạm khác). Quan sát chặn thật: đổi chuỗi đã duyệt trong bản sao tạm → bước j đỏ (`axe (danh-sach-390): [meta-viewport…]`) → xoá bản sao, bản thật 17/17.

## Lỗi giao diện thật (chưa sửa, chờ chủ dự án)

`a2-smoke-form` bước 4b đỏ đúng chỗ: ô số của bộ đếm số khách mất dấu focus. Đo trong Chrome (390px): nút "Tăng" có khung 2px lùi vào trong; ô số `outline-style: none`, `box-shadow` trong suốt, viền trái vẫn màu thường, khung `.counter` `overflow: hidden`. Gốc: lần sửa 1c718023 (2/10, vòng kiểm thị giác 1.69, mục TB-1) đổi `input:focus` thành `input:not([type="checkbox"]):not([type="radio"]):focus` (độ ưu tiên 0,3,1) — đè luật `.counter .counter-field:focus-visible` (0,3,0) — ghi chú cạnh luật đó ("thắng `input:focus`") nay sai. Đã rà mọi luật `:focus` / `:focus-visible` chạm ô nhập trong `public/app.css`: chỉ ô số bộ đếm bị đè (các luật khác tô phần tử khác, vd `.pick-mark`, `.dd-che-do`). Chưa rà khung `overflow: hidden` khác có thể cắt vòng `box-shadow` của ô nhập. Bản sửa (nếu chủ cho) phải giữ TB-1 (ô tích / ô chọn một vẫn dùng khung `:focus-visible` chung) và giữ xanh bài `src/token-giao-dien.test.ts`.

## Chưa làm / chưa kiểm

- `v1-xac-nhan-png.mjs` bước j (cùng `meta-viewport`, nhật ký 1/10) — chưa chạy lại, chưa sửa.
- Các kịch bản khác dùng `call` nhớ phiên của `dp-lib.mjs` cùng `env.as` có thể vấp cùng kiểu — chưa rà.
- Đã chạy trên nhánh: `npm run typecheck` 0 lỗi; `npm test` 3375 đạt / 0 đỏ (cộng bài đo giờ 1/1). Không chạy e2e (không chạm API).
