# Bằng chứng — sửa giao diện nhỏ bản 1.39 (30/9/2026)

Ảnh `truoc/` chụp trên origin/main 836c8247 (trước khi sửa), `sau/` chụp trên nhánh `giao-dien-sua-nho-1-39` sau commit 824193f1 — đều do các kịch bản Chrome có sẵn sinh ra (chạy với `OUT=<thư mục tạm>`), rồi chép vào đây:

| Ảnh | Kịch bản sinh ra |
|---|---|
| `form-don-390.png`, `form-don-1040.png` | `docs/evidence/2026-09-26-mo-danh-muc-doi-tac/kich-ban/doi-tac-lap-don-smoke.mjs` |
| `trang-don-1040.png`, `trang-don-hdv-390.png`, `trang-don-hdv-1040.png` | `docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs` |
| `the-hdv-390.png`, `the-hdv-1040.png` | `docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/hdv-viec-cua-toi-smoke.mjs` |
| `tai-xe-xuat-ben-390.png`, `tai-xe-dang-chay-390.png` | `docs/evidence/2026-09-29-adr-0049/kich-ban/cuoc-smoke.mjs` (màn tài xế chỉ chụp ở 390 — kịch bản không mở màn tài xế ở 1040) |

Ảnh chụp cả trang: thanh đầu trang / thanh Lưu dính đáy hiện giữa ảnh là do cách chụp, không phải lỗi bố cục.

Kết quả chạy kịch bản (sau): a2-smoke-form, a2-smoke-order, a2-smoke-sheet, doi-tac-lap-don-smoke, dat-gap-smoke, help-smoke, hdv-viec-cua-toi-smoke (10 bước, có bước mới 1b), chon-hdv-lap-don-smoke, v1-nguoi-phu-trach, v1-xac-nhan-png, cuoc-smoke (12 bước) — 11/11 xanh. `a2-evidence.mjs` đỏ SẴN ở cả `truoc` (TypeError khi gán ô ngày của thẻ dịch vụ — ô này đã bỏ từ ADR-0021), không do bản này.
