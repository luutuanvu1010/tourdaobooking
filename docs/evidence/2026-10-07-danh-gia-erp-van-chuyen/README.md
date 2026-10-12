# Bằng chứng — Đánh giá ERP phân hệ Vận chuyển và Bán hàng (2026-10-07)

Báo cáo: `docs/superpowers/specs/2026-10-07-danh-gia-erp-van-chuyen-ban-hang.md`. Mã kiểm: `main` = HEAD `4d98a205`. Mọi tên khách, SĐT, biển số trong thư mục này là **GIẢ** (dữ liệu của khung thử).

- `kich-ban/` — bài thử tình huống chạy trên khung thử toàn ứng dụng (`tests/audit/harness.mjs`, `tests/audit/dieu-phoi-khung.mjs`; SQLite thật, đồng hồ giả, không mạng), kèm log lần chạy:
  - `sc-ghep/` (ghép 10 đơn, sức chứa, thêm/bớt khách, mốc giờ), `sc-nangluc/` (quay đầu xe, khung bận, xe riêng, chiều về, nhà xe, trùng giờ), `sc-vanhanh/` (tài xế chạy trọn chuyến, sửa nhầm, đổi khi chạy, bấm trùng, bấm thay, tin cho tài xế);
  - `kiem-V1` … `kiem-V5/` — bài của vòng kiểm phản biện (chạy lại + bài mới);
  - `ui/` — kịch bản Chrome `ghep-10-don.mjs`, `xe-rieng.mjs`, bản vá `cuoc-smoke-va.mjs` (dựng trên `docs/evidence/2026-09-29-adr-0049/kich-ban/dp-lib.mjs`) và log.
- `anh/` — 18 ảnh chọn lọc (khổ 390 = điện thoại giả lập, 1040 = máy tính). Chrome headless, D1 tạm; chưa thử iPhone thật, chưa chạy axe.
- `du-lieu/` — dữ liệu thô của ba vòng: `map.json` (5 người đọc mã), `scen.json` (tình huống + giao diện), `candidates.json` (danh sách đã gộp, mã `Cxx`), `verify.json` (kết quả kiểm phản biện — **nguồn cuối** của báo cáo).

Chạy lại (từ gốc repo): `node --test docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/kich-ban/sc-ghep/*.test.mjs` (tương tự cho các thư mục khác). Bài **ghi lại hành vi quan sát được**, không khẳng định hành vi "đúng"; không nằm trong `npm test`.
