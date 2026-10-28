# Bằng chứng đợt 0 — khung chung (29/10/2026)

Kịch bản Chrome cho đặc tả `docs/superpowers/specs/2026-10-28-dot-0-khung-chung/DAC-TA.md` (mục 10, 11) và bản chép của các kịch bản cũ đỏ vì vỏ đổi.
Hồ sơ có ngày (thư mục `docs/evidence/<ngày cũ>/`) giữ nguyên; bản sửa nằm ở đây.

## Cách chạy

Từ GỐC repo, sau `npm run build:web`:

```
AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ghi ảnh> node docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/<tên>.mjs
```

- `AXE_JS`: đường tới `axe.min.js` (axe-core, lấy bằng `npm pack axe-core` NGOÀI repo). `dot-0-smoke.mjs` và `mat-mang-smoke.mjs` dừng ngay nếu thiếu.
- `CHROME_BIN`: Chrome (mặc định đường cài macOS); `chrome-wrap.sh` gọi đúng bản đó.
- `OUT`: nơi ghi ảnh (`<OUT>/anh/*.png`). Hai kịch bản mới mặc định `/tmp/…`. Bản chép dùng thư viện `vc-lib.mjs` (xe-smoke, tai-xe-trang-dau-smoke) mặc định ghi vào thư mục CŨ `docs/evidence/2026-09-28-van-chuyen-1a` — luôn đặt `OUT` khi chạy chúng.
- Không cần mạng ngoài. Mỗi kịch bản tự dựng D1 tạm + `wrangler dev` cổng trống + Chrome headless, dọn khi xong.
- `dot-0-smoke.mjs`: `ONLY=1,4,9` chạy vài bước.

## Kịch bản mới

| Tệp | Phủ |
|---|---|
| `kich-ban/dot-0-smoke.mjs` | 12 bước của kế hoạch Task 15 (thanh tab theo bộ quyền, thanh dính ẩn thanh tab, thiếu mã, thanh bên 10 khối + «Bỏ qua», 403 `/audit`, thứ tự thanh trên, 404, dải bảo trì, axe, hộp xác nhận, báo ngắn, `/thiet-lap`) + 5 bước điểm người kiểm để lại (13–17) |
| `kich-ban/mat-mang-smoke.mjs` | Mất mạng: bộ đệm hụt ⇒ trang «Ngoài mạng»; trang đã vẽ ⇒ dải ngoài mạng giữ nội dung; hụt cả `/ngoai-mang` ⇒ chữ 503. Giả lập ngoài mạng đặt cả trên đích `service_worker` (giả lập ở trang không chắc phủ worker) |

## Bản chép («thay bằng»)

| Bản cũ (giữ nguyên) | Thay bằng (thư mục này) | Sửa gì |
|---|---|---|
| `2026-09-21-v1-0/kich-ban/v1-bao-tri.mjs` | `kich-ban/v1-bao-tri.mjs` | dải `.dai[data-loai="bao-tri"]` (Task 9); chữ «Nền tảng»; tắt riêng luật axe `meta-viewport`; lấy phiên Bán hàng mới cho bước TỰ TẮT |
| `2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs` | `kich-ban/trang-chu-smoke.mjs` | token `--w-main` đọc qua `var()`; thanh bên Quản trị (thứ tự Điều phối, không nút Tạo đơn, khối gập); thanh tab Quản trị 5 mục |
| `2026-10-01-han-che-quan-tri-hcns/kich-ban/quyen-thieu-quan-tri-smoke.mjs` | `kich-ban/quyen-thieu-quan-tri-smoke.mjs` | thanh tab Nhân sự 4 mục; `/audit` không quyền là trạng thái 403 |
| `2026-09-28-van-chuyen-1a/kich-ban/xe-smoke.mjs` | `kich-ban/xe-smoke.mjs` | nhóm VẬN CHUYỂN có khối gập Điều phối (bước 2, 8b, 9 đỏ cả ở gốc nhánh) |
| `2026-09-28-van-chuyen-1a/kich-ban/tai-xe-trang-dau-smoke.mjs` | `kich-ban/tai-xe-trang-dau-smoke.mjs` | thanh tab tài xế công ty 4 mục (thêm Hỗ trợ) |
| `2026-09-23-nhat-ky-thay-doi/kich-ban/help-smoke.mjs` | `kich-ban/help-smoke.mjs` | thanh tab Bán hàng 5 mục |
| `2026-09-30-tro-ly/kich-ban/tro-ly-smoke.mjs` | `kich-ban/tro-ly-smoke.mjs` | `#tl-fab` → `#tl-nut` (nút Trợ lý ở thanh trên); tiêu đề khung «Trợ lý» |

Kịch bản cũ còn đỏ sẵn từ trước đợt 0 (đỏ y hệt ở gốc nhánh) và lý do: nhật ký thi công `docs/superpowers/plans/2026-10-28-dot-0-khung-chung-nhat-ky.md`, mục «Task 15».

Ảnh (`anh/`): `dot-0-smoke.mjs` và `mat-mang-smoke.mjs` chạy với `OUT=docs/evidence/2026-10-29-dot-0-khung-chung`.
