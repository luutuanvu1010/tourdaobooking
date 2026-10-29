# Biên bản cổng phát hành đợt 0 khung chung — 2026-10-29

> Hồ sơ có ngày. Viết xong là đóng băng; có gì mới thì viết bản mới trỏ về bản này. Cổng này là điều kiện chủ dự án đặt
> tại cổng 2b (`QUYET-DINH-CONG-2B-2026-10-28.md` mục B) và đặc tả đợt 0 mục 12.

## Lời chủ dự án (nguyên văn, chiều 29/10/2026, trong Main session 8418e052)

> duyệt, xong đợt 0 rồi

Trả lời cho trang *Cổng phát hành đợt 0* (artifact `MZA8srFiyQAVKU86X1cYvm`, bản 2): lệnh chạy bản local
(`node scripts/dev-iphone.mjs`, 7 tài khoản thử), mười việc thử, tờ so sánh lời thường, ba câu hỏi.

## Ba câu và kết quả

| # | Câu | Trả lời | Thi hành |
|---|---|---|---|
| 1 | Duyệt phát hành đợt 0 (bản 2.47)? | **Duyệt** | Chủ đã tự chạy `day-len` và `trien-khai` trước khi báo (xem bằng chứng). |
| 2 | Khoá phóng to màn hình (`user-scalable=no`, chủ quyết 30/9; axe 4.13 báo `meta-viewport`, WCAG 1.4.4) giữ hay bỏ? | Không trả lời = theo đề xuất: **giữ** | Ghi nợ ở `docs/BACKLOG.md` §53; xét lại ở đợt 0b khi đo lại. |
| 3 | Ba chỗ xấu đi nhẹ: sửa ngay hay ghi nợ? | Không trả lời = theo đề xuất: **ghi nợ, sửa gộp ở đợt 0b** | CLS lạnh Trang chủ 0,225 → 0,322 và `/orders` 0,050 → 0,094; mã đơn bị cắt ở thanh trên 390; ba kiểu huy hiệu thanh bên lệch cỡ. |

## Bằng chứng (Main session đo sau khi chủ báo)

- **Bản chính:** `origin/main` = `25f127d1`, chứa `b0361984` (nhánh `dot-0-khung-chung`, 44 commit, đã nhập main `bd395034` hai lần) + một commit sửa khi gộp: `25f127d1` «Đợt 0 sửa: `/__scheduled` vào Worker trước để e2e giả lập Cron không nhận trang 404» (`wrangler.jsonc`, `src/cau-hinh-toc-do.test.ts`; 17:06 +07). Lệnh gộp đã xoá nhánh và worktree `dot-0-khung-chung`.
- **Production `booking.tourdao.vn`** (curl sau 17:06): `/api/auth/config` → `version: "2.47"`; `/khong-co-trang-nay` → **404 `text/html`** 984 B (trước đợt 0: JSON); `/api/khong-co` → 404 JSON (đúng: API không bị trang 404 bắt); `/thiet-lap` và `/ngoai-mang` → 200; `app.css` có khối «Thành phần chung v2».
- **Kiểm máy trên cây cuối `b0361984`** (phiên Code báo 15:57): `npm test` 6715 đạt / 0 đỏ; typecheck 0 lỗi; `build:web` đạt; `test:e2e -- pwa` 4/4; `public/js/orders.js` 101.700 / trần 101.719 byte.
- **Kịch bản Chrome** (phiên Code không chạy lại sau lần nhập main thứ hai; **Main session tự chạy** lúc 16:00 trên `b0361984`, log ngoài kho ở thư mục tạm phiên 8418e052): `dot-0-smoke.mjs` 20 bước «SMOKE OK (có axe)», `mat-mang-smoke.mjs` A/B/C «MAT MANG OK (có axe)».
- **Tờ so sánh trước/sau:** `docs/evidence/2026-10-29-dot-0-so-sanh/SO-SANH-TRUOC-SAU.md` (người kiểm lập, không phải người thi công). Cổng 10.16 ĐẠT theo trung vị (FCP lạnh +2,1 %, khung xong +1,4 %, CLS hai trang mới ≤ 0,1, chuyển trang ≤ 97 ms).
- **Nhật ký thi công:** `docs/superpowers/plans/2026-10-28-dot-0-khung-chung-nhat-ky.md`; lượt sửa cuối `72f8e898`.

## Quyết định điều phối đã ghi (Main session, đảo được)

- Ngưỡng 10.16 đọc theo **trung vị toàn Nền tảng** (bản 27/10 đo một lần nên ±5 % từng trang nằm trong nhiễu); ba trang `/orders`, `/nguoi-ban`, `/feedback` +5,1…5,3 % ghi «theo dõi ở đợt 0b».
- Số phiên bản 2.47 (main đã có 2.45, 2.46); ADR service worker trả `/ngoai-mang` = **ADR-0150** (số kế tiếp 0151).

## Nợ chuyển tiếp (ngoài §53 BACKLOG)

1. Ba chỗ xấu đi nhẹ ở câu 3 → đợt 0b.
2. Khoá phóng `user-scalable=no` → xét lại ở đợt 0b.
3. Quản trị gõ thẳng `/so-cong-no` còn dòng đỏ, chưa phải vỏ 403 (ngoài 6 chỗ đợt 0) → Chặng 3.
4. Trần gói trang Đơn hàng còn dư **19 byte**: đợt kế chạm mã chung phải xin chủ nới trước khi thi công.
5. Phiên Code `dot-0-khung-chung` còn mở (idle) → chủ đóng.

## Kế tiếp

- **7c** (LO-TRINH bước 6): chuyển bộ «Island Booking System — Design System v2» sang đồng bộ từ mã; từ đây `public/app.css` là nguồn duy nhất.
- **Đợt 0b khung tải:** chủ duyệt `ADR-0143` (proposed từ 27/10, trên main) bằng một câu riêng → đặc tả → kế hoạch → thi công → cổng phát hành 0b (cùng nhịp đợt 0).
- **Chặng 3:** năm đề bài họ màn, ba họ đầu song song.
