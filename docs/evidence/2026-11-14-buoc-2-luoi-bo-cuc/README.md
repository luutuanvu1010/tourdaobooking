# Bằng chứng — bước 2 lưới bố cục chung (14/11/2026)

Hồ sơ có ngày. Kế hoạch và tiêu chí: `docs/superpowers/plans/2026-11-14-buoc-2-luoi-bo-cuc.md`. Không chạm production, không dữ liệu thật.
Kho thử, ảnh đầy đủ và số liệu thô để ngoài kho ở `~/tourdao-ux-2026-11-14-buoc-2/` (chép kho bước 0 `~/tourdao-ux-2026-11-13/d1`, áp migration tới `0162`).

- `kich-ban/do-luoi.mjs` — đo lề, bề rộng, nhịp, khối «một đầu», tràn ngang; `--xe-dich` đo vùng nội dung nhảy ngang khi mở lại trang; `--css` / `--js` tiêm lớp xem trước; `--anh` chụp ảnh.
- `kich-ban/tong-hop-luoi.mjs` — gộp số liệu theo khổ.
- `xem-truoc/` — lớp CSS / JS tiêm tạm (không phải mã phát hành) và sáu tấm ảnh trước / sau gửi chủ.
- `so-lieu/luoi-truoc-tom-tat.json` — hiện trạng trên `main` 8b5c45e8d (784 ô). `so-lieu/xe-dich-truoc-sau.json` — thanh bên dựng muộn: 70/78 → 0/78 trang nhảy ngang.

Máy chủ thử: `node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/may-chu.mjs --d1 ~/tourdao-ux-2026-11-14-buoc-2/d1 --port 8825` (sau `npm run build:web`).
Giới hạn: Chrome giả lập, chưa thử iPhone / iPad / Android thật.
