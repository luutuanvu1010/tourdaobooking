# Bằng chứng — Đánh giá khung giao diện 30/10/2026

Hồ sơ có ngày. Báo cáo: `docs/superpowers/specs/2026-10-30-danh-gia-khung-giao-dien/BAO-CAO.md`. Mã đo: bản 2.48 (`3468fc1` trên nhánh
`claude/danh-gia-khung-giao-dien`, gồm `main` `6f072ff7`). **Không chạm production, không dữ liệu thật.**

## Dựng máy thử (đã làm, theo thứ tự)

1. Worktree `.claude/worktrees/danh-gia-khung-giao-dien`, `npm ci`, `npm run build:web`.
2. Kho D1 tạm `/tmp/ux/d1`: `npx wrangler d1 migrations apply tourdao-sales-db --local --persist-to /tmp/ux/d1` (0001–0127).
3. Một tài khoản Toàn quyền thử bằng `scripts/create-staff.mjs "Toàn Quyền Thử" 0900000010 <PIN> SUPER_ADMIN,ADMIN` rồi `wrangler d1 execute --local --persist-to /tmp/ux/d1`.
4. Máy chủ thử: `node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/may-chu.mjs --d1 /tmp/ux/d1 --port 8795` (Turnstile, Face ID, Web Push tắt).
5. Dữ liệu giả qua API thật, dùng lại kịch bản 27/10: `UX_PERSIST=/tmp/ux/d1 UX_TK_FILE=/tmp/ux/tai-khoan.json node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/gieo-du-lieu.mjs --chang tai-khoan|it|nhieu`
   → 12 tài khoản (10 bộ quyền), ~45 đơn, 6 xe, 3 chuyến, vé hỗ trợ, thông báo. Bốn lệnh bị từ chối là lệnh cố ý của kịch bản (xác nhận đơn ngày đã qua).
   Danh mục dịch vụ máy chủ tự đọc bản CSV chỉ-đọc của Google Sheet dịch vụ (cần mạng). Kịch bản gieo ghi đè các tệp nhật ký `nhat-ky-gieo-*.json` của thư mục 27/10 —
   đã hoàn nguyên bằng `git restore`, không commit.
6. Trình duyệt: Chromium của Playwright (Python 1.56) ở `/opt/pw-browsers`, chạy bằng `--no-sandbox` (máy chạy dưới quyền root). Đặt `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`.

Tệp tài khoản thử `/tmp/ux/tai-khoan.json` (PIN do máy chủ sinh) và mã đơn / chuyến / xe đại diện `/tmp/ux/id.json` nằm ngoài kho; dựng lại bằng bước 5 và
truy vấn chỉ-đọc trên kho tạm.

## Kịch bản (`kich-ban/`)

| Tệp | Việc | Ghi ra |
|---|---|---|
| `chup.py --vai A,B --kho 390x844,1440x900 [--trang …] [--css tệp]` | đăng nhập từng vai qua API, chụp mọi trang có lối vào (ma trận `docs/evidence/2026-10-29-dot-0-khung-chung/ma-tran-quyen.json`), tối đa N màn; `--css` chèn thêm CSS để chụp ảnh «sau» | ảnh PNG (ngoài kho, `/tmp/ux/anh`, `/tmp/ux/truoc`, `/tmp/ux/sau`) |
| `do-loi-hien-thi.js` | biểu thức đo trong trang: chữ bị cắt, phần tử bấm được bị phần cố định đè, tràn ngang, khối «một đầu» (nội dung ≤ 35 % bề rộng) | — |
| `do-loi.py --vai SUPER_ADMIN,DRIVER,DRIVER_PARTNER` | chạy `do-loi-hien-thi.js` trên 45 trang × 390 / 1040 / 1440 (vai rộng nhất có lối vào) | `so-lieu/loi-hien-thi.json` (138 ô, 0 lỗi kịch bản) |
| `soi-thanh-ben.py` | ở 1366×650, mục thanh bên của trang đang mở có nằm trong phần thấy được không | `so-lieu/thanh-ben-1366x650.txt` |
| `dem-kieu.py` | đếm cỡ chữ, độ đậm, màu chữ, kiểu nút khác nhau trên 9 trang (Quản trị, 1440) | `so-lieu/dem-kieu-1440.txt` |
| `minh-hoa-sau.css` | lớp CSS minh hoạ cho ảnh «sau» — **không phải mã thi công** | — |
| `ghep-truoc-sau.py` | ghép ảnh đôi trước / sau có chú thích | `anh/truoc-sau/*.jpg` |

## Đọc số liệu

- `loi-hien-thi.json` → `cat`: có cả tiêu đề ẩn cho trình đọc màn hình (`visually-hidden`, hộp 1 px) — báo cáo đã loại các mục đó (244 chỗ «cắt thật»).
- `che`: 160 mục thanh bên «bị chân thanh bên đè» là mục nằm ngoài phần thấy được của thanh bên khi cuộn trang; còn lại là phần tử trôi dưới thanh trên / thanh bước
  dính khi cuộn — hành vi bình thường, **không** tính là lỗi. Câu hỏi «mục đang mở có thấy không» đo riêng bằng `soi-thanh-ben.py`.
- `rong`: cũng đếm hàng tiêu đề bảng và hàng «tiêu đề – nút» — chỉ số so trước / sau, không phải danh sách lỗi.
- Ảnh «Bảng kê xe» lúc đầu trông như khối Tổng cộng bị thanh tab che; cuộn hết trang thì khối hiện đủ (`anh/hien-trang/ACCOUNTING-bang-ke-xe-cuoi-390.jpg`) — không phải lỗi.

## Ảnh trong kho

- `anh/truoc-sau/` — 6 ảnh đôi «trước | sau (minh hoạ)».
- `anh/hien-trang/` — 26 ảnh hiện trạng được trích trong báo cáo (JPEG, cắt tối đa ~2 màn). Tên: `<bộ quyền>-<trang>-<khổ>.jpg`.
- Ảnh chụp cả trang: thanh bên và thanh tab cố định hiện ở vị trí màn đầu (thanh tab nằm giữa ảnh 390) — do cách chụp, không phải lỗi.

## Giới hạn

Chrome máy thử không phải iPhone thật (vùng an toàn, bàn phím, kiểu ô ngày giờ theo ngôn ngữ máy chưa kiểm). Một bộ dữ liệu, chỉ trạng thái lúc mở trang.
Bộ đo lưới bố cục 30/10 (`docs/evidence/2026-10-30-luoi-bo-cuc/`) đã đo kỹ bề rộng và hàng «chữ một đầu» trên gần cùng mã — phiên này không chạy lại toàn bộ, chỉ trích số.
