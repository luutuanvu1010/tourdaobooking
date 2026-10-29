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
- `OUT`: nơi ghi ảnh (`<OUT>/anh/*.png`). Hai kịch bản mới mặc định `/tmp/…`. Bản chép dùng thư viện `vc-lib.mjs` (xe-smoke, tai-xe-trang-dau-smoke) và bản chép `v1-dang-nhap.mjs` từ Task 15b mặc định `/tmp/…` (không còn ghi vào thư mục có ngày cũ).
- **Nới có chủ đích — luật axe `meta-viewport`:** hai bản chép `v1-bao-tri.mjs` và `v1-dang-nhap.mjs` tắt RIÊNG luật này. axe 4.13 mới bắt `user-scalable=no`; thẻ viewport đó có ở mọi trang từ TRƯỚC đợt 0 (chủ quyết 30/9 «khoá chức năng phóng»), không do đợt 0. Mọi luật khác giữ nguyên. Nợ ghi một mục ở nhật ký thi công (`docs/superpowers/plans/2026-10-28-dot-0-khung-chung-nhat-ky.md`, «Nợ `user-scalable=no`»). `dot-0-smoke.mjs` không tắt luật này: nó chỉ đỏ ở mức nghiêm trọng, `meta-viewport` mức vừa hiện ở dòng «axe nhẹ».
- Không cần mạng ngoài. Mỗi kịch bản tự dựng D1 tạm + `wrangler dev` cổng trống + Chrome headless, dọn khi xong.
- `dot-0-smoke.mjs`: `ONLY=1,4,9` chạy vài bước.

## Kịch bản mới

| Tệp | Phủ |
|---|---|
| `kich-ban/dot-0-smoke.mjs` | 12 bước của kế hoạch Task 15 (thanh tab theo bộ quyền, thanh dính ẩn thanh tab, thiếu mã, thanh bên 10 khối + «Bỏ qua», 403 `/audit`, thứ tự thanh trên, 404, dải bảo trì, axe, hộp xác nhận, báo ngắn, `/thiet-lap`) + 5 bước điểm người kiểm để lại (13–17; bước 14 chỉ chụp để soát mắt, in «◦», không «✓») + 3 bước Q-2 của Task 15b (18–20: 768×1024 bốn bộ quyền, thanh tĩnh/dính ở 768, biên 899/900, 1024×768, 1280) |
| `kich-ban/mat-mang-smoke.mjs` | Mất mạng: bộ đệm hụt ⇒ trang «Ngoài mạng»; trang đã vẽ ⇒ dải ngoài mạng giữ nội dung; hụt cả `/ngoai-mang` ⇒ chữ 503. Giả lập ngoài mạng đặt cả trên đích `service_worker` (giả lập ở trang không chắc phủ worker) |

## Bản chép («thay bằng»)

| Bản cũ (giữ nguyên) | Thay bằng (thư mục này) | Sửa gì |
|---|---|---|
| `2026-09-21-v1-0/kich-ban/v1-bao-tri.mjs` | `kich-ban/v1-bao-tri.mjs` | dải `.dai[data-loai="bao-tri"]` (Task 9); chữ «Nền tảng»; tắt riêng luật axe `meta-viewport`; lấy phiên Bán hàng mới cho bước TỰ TẮT |
| `2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs` | `kich-ban/v1-dang-nhap.mjs` (Task 15b) | tắt riêng luật axe `meta-viewport` (nới có chủ đích, xem trên); `OUT` mặc định `/tmp` |
| `2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs` | `kich-ban/trang-chu-smoke.mjs` | token `--w-main` đọc qua `var()`; thanh bên Quản trị (thứ tự Điều phối, không nút Tạo đơn, khối gập); thanh tab Quản trị 5 mục; Task 15b: lưới khung G-1 theo Q-2 (thanh bên từ 900, ≤ 899 thanh tab / nút lùi ở trang tập trung) |
| `2026-10-01-han-che-quan-tri-hcns/kich-ban/quyen-thieu-quan-tri-smoke.mjs` | `kich-ban/quyen-thieu-quan-tri-smoke.mjs` | thanh tab Nhân sự 4 mục; `/audit` không quyền là trạng thái 403 |
| `2026-09-28-van-chuyen-1a/kich-ban/xe-smoke.mjs` | `kich-ban/xe-smoke.mjs` | nhóm VẬN CHUYỂN có khối gập Điều phối (bước 2, 8b, 9 đỏ cả ở gốc nhánh); Task 15b: `OUT` mặc định `/tmp`, nạp `vc-lib` động sau khi đặt `OUT` |
| `2026-09-28-van-chuyen-1a/kich-ban/tai-xe-trang-dau-smoke.mjs` | `kich-ban/tai-xe-trang-dau-smoke.mjs` | thanh tab tài xế công ty 4 mục (thêm Hỗ trợ); Task 15b: như dòng trên |
| `2026-09-23-nhat-ky-thay-doi/kich-ban/help-smoke.mjs` | `kich-ban/help-smoke.mjs` | thanh tab Bán hàng 5 mục |
| `2026-09-30-tro-ly/kich-ban/tro-ly-smoke.mjs` | `kich-ban/tro-ly-smoke.mjs` | `#tl-fab` → `#tl-nut` (nút Trợ lý ở thanh trên); tiêu đề khung «Trợ lý» |

Kịch bản cũ còn đỏ sẵn từ trước đợt 0 (đỏ y hệt ở gốc nhánh) và lý do: nhật ký thi công `docs/superpowers/plans/2026-10-28-dot-0-khung-chung-nhat-ky.md`, mục «Task 15».

Ảnh (`anh/`): `dot-0-smoke.mjs` và `mat-mang-smoke.mjs` chạy với `OUT=docs/evidence/2026-10-29-dot-0-khung-chung`.

## Đo trước/sau (QA2, 29/10/2026 — đặc tả mục 10.16, 11, 12.2)

Bản chép kịch bản đo của `2026-10-27-danh-gia-ux-tong-the/kich-ban/` (cổng 8805, D1 tạm `~/tourdao-ux-dot-0/d1` trạng thái NHIỀU: 45 đơn, 12 tài khoản, 8 chuyến). Chỉ đo kho NHIỀU; kho ÍT và RỖNG **không** dựng lại (bảng D của 27/10 không so). Tờ so sánh: `../2026-10-29-dot-0-so-sanh/SO-SANH-TRUOC-SAU.md`.

- `ma-tran-quyen.json` **sinh lại** từ mã nhánh (`ma-tran-quyen.mjs`): bản đã commit là bản 27/10, chưa có `/thiet-lap`.
- `do-toc-do.mjs` thêm cờ (không đổi điều kiện đo; trang thêm chạy SAU mọi trang gốc): `--them /khong-co-trang-nay` (đo trang 404 mới), `--hau-to <chuỗi>` (đuôi tên tệp kết quả), `--chi-chuyen` + `--lap-chuyen N` (chỉ đo chuyển trang + chạm, lặp N lần). Bộ chọn chuyển trang giữ nguyên 27/10 nên 1040 → `/order-form` báo «không thấy mục» (thanh bên Toàn quyền không còn mục Tạo đơn — đổi có chủ đích ở đợt 0) và 390 → `/` không có cả hai lần.
- `so-toc-do.mjs` (mới): bảng so 27/10 ↔ mới theo ngưỡng 10.16 → `so-lieu/so-toc-do.md`.
- Số liệu: `so-lieu/toc-do.json` (lượt chính, máy rảnh, tải 1 phút trung vị 2,1), `toc-do-lan1.json` (lượt đầu, BỎ: tải máy lên ~10 do phiên khác), `toc-do-tung-trang-lap3.json` (4 trang lệch > 5 % đo lại ba lần), `toc-do-chuyen-lap3.json` (chuyển trang ba lần, máy rảnh), `toc-do-chuyen-lap3-tai-cao.json` (BỎ: tải lên 12 giữa chừng), `nhieu.json` (quét mọi trang × bộ × khổ, `do-trang.mjs`), `tong-hop.md/json`.
