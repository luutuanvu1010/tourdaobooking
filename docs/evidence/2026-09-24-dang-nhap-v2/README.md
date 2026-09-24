# Bằng chứng — Đăng nhập v2 (2026-09-24)

Làm lại màn Đăng nhập theo bản thiết kế **"Đăng nhập v2.dc.html"** của chủ dự án trên Claude Design
(dự án `2666a288-fc70-433a-a926-e735ec1f428e`). Nhánh `worktree-dang-nhap-v2`, commit `dda7c13` (thi công),
`ccb2b2c` (sửa theo người kiểm), `62f9811` (tài liệu mô tả). **Chưa push, chưa deploy.**

## Ảnh

| Tệp | Nội dung |
|---|---|
| `anh/thiet-ke-goc-390.png`, `anh/thiet-ke-goc-1040.png` | Bản thiết kế gốc, chụp từ bản tĩnh `thiet-ke-goc-tinh.html` (trạng thái mặc định: có Face ID, không bảo trì, PIN ẩn; ô Turnstile là hình giữ chỗ của bản thiết kế) |
| `anh/co-face-id-dien-thoai.png`, `anh/co-face-id-may-tinh.png` | Trang thật, có Face ID (nút PIN kiểu phụ). Ô Turnstile hiện chữ "Chỉ để kiểm tra" vì dùng khoá thử của Cloudflare |
| `anh/khong-face-id-dien-thoai.png` | Trang thật, trình duyệt không hỗ trợ Face ID: khối Face ID ẩn, nút PIN là nút chính |
| `anh/loi-sai-pin-dien-thoai.png` | Sai PIN: khung lỗi trong form, widget được reset |
| `anh/kho-375.png`, `anh/kho-320.png` | Khổ hẹp: không cuộn ngang; 375px khung widget 327px (≥ 300, cỡ "flexible") |

Kịch bản: `kich-ban/dang-nhap-v2.mjs` (cần mạng; cách chạy ở đầu tệp).

## Khác bản thiết kế (có chủ ý, bề mặt, đảo ngược được)

- Ô gõ 16px (bản thiết kế 17px): dưới 16px iOS tự phóng to khi chạm.
- Hai ô SĐT/PIN và các liên kết cao đủ 44px vùng chạm (bản thiết kế ô ~25px): `passkey-smoke` bước h và `v1-dang-nhap` bước i/m đo và đỏ khi thiếu.
- Màu xám không có token (#64748b, #e2e8f0, #f0f7fc, #94a3b8) và bóng logo #005b96 quy về token có sẵn (`--c-text-muted`, `--c-border`, `--c-surface-alt`, `--c-primary`).
- Chân trang lấy từ `GET /api/company` (tên viết hoa đúng như dữ liệu, địa chỉ đầy đủ "Khu đô thị"); email và dòng phiên bản ở hai dòng (bản thiết kế chung một dòng); phiên bản lấy từ `formatReleaseLine()`.
- Số hotline không ngắt giữa chừng (bản thiết kế "0845 / 256 256").
- Giữ dải navy vùng an toàn trên đầu (PWA iPhone: chữ trắng thanh trạng thái).
- Bỏ cột thương hiệu máy tính của Đợt C (bản v2 một cột ở mọi khổ) — trình chủ.

## Kiểm

| Lệnh | Kết quả |
|---|---|
| `npm test` | 656/656 |
| `npm run typecheck` | 0 lỗi |
| `npm run test:e2e` | 18/18 kịch bản xanh (kể cả `audit-invariants`) |
| `dang-nhap-v2.mjs` | 5/5 ✓ |
| `v1-dang-nhap.mjs` | 15/15 ✓ |
| `dot-c-smoke.mjs` | 6/6 ✓ (phần Đăng nhập nay kiểm "một cột, không cuộn ngang") |
| `passkey-smoke.mjs` | mọi bước ✓ |
| `v1-bao-tri.mjs` | mọi bước ✓ |

Một lần `npm test` 655/656 khi Chrome chạy song song; chạy lại 656/656 (nghi test đo tốc độ khi máy bận, không lặp lại).

## Người kiểm độc lập (chỉ đọc, `nguoi-kiem-doc-lap`)

- **Vòng 1 (trên `dda7c13`): CHƯA ĐẠT.** CHẶN: `tests/e2e/pwa.mjs:107` còn đòi `<h1>` = tên app → e2e đỏ (tự tái hiện). NÊN SỬA: `--shadow-logo` chép #005b96 là màu mới. Tiêu chí id, logic đăng nhập không đổi, không `innerHTML`, CSS chỉ token, tài liệu §9: ĐẠT.
- Sửa ở `ccb2b2c`: `pwa.mjs` đòi h1 "Đăng nhập" VÀ `.login-sub` chứa đúng `manifest.name`; bóng logo = `--c-primary`.
- **Vòng 2: ĐẠT.** Tự chạy lại toàn bộ (656/656, tsc 0, e2e 18/18); tự phá thử `.login-sub` trên bản sao tạm → `pwa.mjs:110` đỏ đúng chỗ (bài kiểm mới chặn thật, không nới). Nêu thêm 3 dòng tài liệu mô tả lệch (CHANGE-GUIDE công thức j, PWA-IPHONE) → đã sửa ở `62f9811`.

## Chưa làm

- Chưa thử iPhone thật. Chưa push, chưa deploy.
- `web/CLAUDE.md` (dòng bảng kịch bản cho `web/login.ts` và dòng Đợt C) còn ghi "cột thương hiệu" — tệp luật, chỉ đề xuất sửa, chờ chủ.
