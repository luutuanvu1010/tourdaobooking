# Bằng chứng T2b — Tour Đảo là hồ sơ tổ chức (ADR-0024 điều 6)

Nhật ký thi công: `docs/superpowers/plans/2026-09-28-t2b-thi-cong-nhat-ky.md`. Đo bằng Chrome headless trên `wrangler dev` cục bộ (D1 tạm) — **không phải iPhone thật, không phải dữ liệu production**.

## Kịch bản

`kich-ban/t2b-danh-ba-smoke.mjs` — Danh bạ và hồ sơ công ty chủ (chỉ phần hàng rào mới bắt buộc, chỉ đạo D7 + D12 của điều phối):
- **A. Quản trị:** hồ sơ công ty chủ không có nút "Lưu thông tin"/"Thêm liên hệ"; ô "Công việc" không có "Công ty chủ" (cả trên hồ sơ tổ chức khác); bấm "Kết thúc" dòng "Công ty chủ" → câu tiếng Việt (403, "người phụ trách hệ thống"), không chữ "Toàn quyền", không mã thô.
- **B. Tài khoản chỉ giữ quyền Toàn quyền** (gieo riêng trong D1 tạm): sửa được hồ sơ công ty chủ; "Kết thúc" → câu chỉ cách đổi (409); lựa chọn "Công ty chủ" không có trên hồ sơ cá nhân, không có trên chính công ty chủ, CÓ trên hồ sơ tổ chức khác; chọn + "Thêm công việc" → câu xác nhận ("Trang đăng nhập và biên nhận sẽ dùng thông tin của hồ sơ này…") → ĐỔI thật trên D1 tạm (trigger của migration 0030) → đúng một công ty chủ, là hồ sơ mới; `GET /api/company` trả hồ sơ mới; axe sạch ở 1040 và 390.

Chạy từ GỐC repo, sau `npm run build:web` (cần Chrome và `axe-core` ngoài repo):

```
AXE_JS=<…/axe-core/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-28-t2b/kich-ban/t2b-danh-ba-smoke.mjs
```

Kết quả 2026-09-28 (người thi công, tự khai): 2 dòng ✓, `T2B DANH BA SMOKE OK`. Chạy trên giao diện CŨ (trước T2b): A ✓, B ✗ (tài khoản chỉ Toàn quyền không thấy khối công việc).

Kịch bản khác đã sửa trong T2b:
- `docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs` — bước a (chân trang = hồ sơ công ty chủ qua cấu hình), bước **a2** mới (đổi tên gọi trong D1 tạm → chân trang đổi theo), bước e (cấu hình lỗi → chữ tĩnh dự phòng), bước f (tập trường cấu hình mới). 16/16 ✓.
- `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs` — thêm khẳng định ô công việc của Quản trị không có "Công ty chủ". 6 ✓, `VAI SMOKE OK`.

## Ảnh (`anh/`)

| Ảnh | Nội dung |
|---|---|
| `t2b-quan-tri-cong-ty-chu-1040.png` | Quản trị mở hồ sơ công ty chủ, đã bấm "Kết thúc" → câu báo tiếng Việt |
| `t2b-doi-cong-ty-chu-chon-1040.png` | Người giữ ô chọn "Công ty chủ" trên hồ sơ tổ chức khác (trước khi xác nhận) |
| `t2b-doi-cong-ty-chu-xong-1040.png` | Sau khi đổi: hồ sơ mới giữ dòng "Công ty chủ" |
| `t2b-cong-ty-chu-moi-390.png` | Hồ sơ công ty chủ mới trên khổ điện thoại |
| `dang-nhap-390-truoc-t2b.png`, `dang-nhap-1040-truoc-t2b.png` | Màn đăng nhập TRƯỚC T2b (ảnh bước i của `v1-dang-nhap.mjs`, mốc Task 0) |
| `dang-nhap-390-sau-t2b.png`, `dang-nhap-1040-sau-t2b.png` | Màn đăng nhập SAU T2b — bố cục giữ nguyên; khác duy nhất: dòng địa chỉ sửa khớp dữ liệu hồ sơ ("19 Đường B2, Khu đô thị…, Tỉnh Khánh Hoà" — chỉ đạo D3/Q2 của điều phối) |

## Giới hạn

- Không phải iPhone thật; không đo trên dữ liệu production (chân trang production hiện tên gọi + MST của hồ sơ công ty chủ do migration chép từ `company_profile`).
- Kịch bản không đổi công ty chủ trên D1 dùng chung (e2e): đổi chỉ kiểm trên D1 tạm của kịch bản này và ở harness `src/modules/parties/cong-ty-chu.test.ts`.
