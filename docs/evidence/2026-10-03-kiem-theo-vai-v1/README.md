# Bằng chứng Đợt V1 — khắc phục kiểm theo vai (2026-10-03)

Lộ trình: `docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` mục 3 (V1.1–V1.5). Nhánh `claude/blissful-goodall-qs20d6`, commit
`9d57f418` (V1.1) · `29be5435` (V1.2) · `59782d3a` (V1.3) · `66f7a6f6` (V1.4) · `b95b15f4` (V1.5) + commit sửa sau kiểm Chrome (chữ nút hộp, tài liệu).
CHƯA lên production.

## Kịch bản Chrome `kich-ban/v1-smoke.mjs` — 8/8 bước xanh (3/10)

```
npm run build:web
CHROME_BIN=<chrome có --no-sandbox nếu chạy bằng root> OUT=docs/evidence/2026-10-03-kiem-theo-vai-v1 node docs/evidence/2026-10-03-kiem-theo-vai-v1/kich-ban/v1-smoke.mjs
```

| Bước | Việc | Ảnh (`anh/`) |
|---|---|---|
| 1 | HT-03 văn phòng 1040: hộp "Xuất bến thay tài xế" chuyến ngày khác có dải đỏ; đóng hộp không gửi | `1-van-phong-xuat-ben-thay-khac-ngay-may-tinh.png` |
| 2 | HT-03 tài xế 390: dải đỏ trên trang; "Xuất bến" chỉ mở hộp (5 dòng); quay lại không gửi; xác nhận → đúng 1 lệnh; chữ nút không tràn | `2a-…`, `2b-…` |
| 3 | HT-24 tài xế 390, đồng hồ trình duyệt giả 00:01 ngày sau ngày chạy: chuyến đang chạy ở "Hôm nay", đứng đầu, "Xuất bến dd/mm" | `3-cuoc-qua-nua-dem-dien-thoai.png` |
| 4, 4c | Kiểu A: "Vừa ghi … — Sai? Báo văn phòng."; hộp "Đã trả", hộp "Kết thúc chuyến" (quay lại không gửi, xác nhận đúng 1 lệnh) | `4a-…` → `4d-…` |
| 5 | Kiểu D (a) 390 cuộn cuối: nút "Hỗ trợ" không giao "Kết thúc chuyến"/"Kết thúc gián đoạn"; **phản chứng**: gỡ lớp `thanh-hanh-dong-cuoi` → nút nổi đè lại | `5a-…`, `5b-phan-chung-…` |
| 6 | Kiểu D (c) `/home` 390 + 1040: bốn ô số mang nhãn "Toàn công ty" / "Của tôi" | `6-trang-chu-nhan-pham-vi-*.png` |

Lần chạy đầu bước 2 bắt được một lỗi thật: nút "Vẫn xuất bến chuyến ngày 04/10" bị cắt chữ ở 390 → rút thành "Vẫn xuất bến" (và "Vẫn ghi đã tới" ở hộp
"Đã trả" 0 khách), thêm phép đo "chữ nút chân hộp không tràn".

Thư viện dùng chung `docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`: đăng nhập thử lại thêm mã `UND_ERR_SOCKET` (undici của Node 22.22 báo kết nối giữ-sống
đã chết bằng mã này thay vì `ECONNRESET` — cùng hiện tượng, máy chủ không nhận yêu cầu).

Kịch bản cũ `docs/evidence/2026-09-29-adr-0049/kich-ban/cuoc-smoke.mjs` sửa theo V1.3: bấm "Xuất bến" rồi bấm `[data-action="xuat-ben-xac-nhan"]` trong hộp.

## E2E

Môi trường phiên này **chặn mạng tới `challenges.cloudflare.com`** (Turnstile siteverify) → `npm run test:e2e -- …` chuẩn trả 503 `turnstile_unavailable`
ngay bước đăng nhập (đã thử, ghi lại). Đã chạy bằng một bản sao TẠM của `tests/e2e/run.mjs` chỉ khác hai dòng `--var TURNSTILE_SITE_KEY:` /
`--var TURNSTILE_SECRET_KEY:` (rỗng = tắt Turnstile; KHÔNG commit): `dieu-phoi`, `tai-xe-cuoc`, `van-chuyen`, `pwa` — **7/7 xanh**. Ca (9) mới của
`dieu-phoi.mjs` (hai đơn cùng Bến tàu) đỏ khi tắt `sapLaiDiem`, xanh khi bật. **Cần chạy lại bộ chuẩn trên máy có mạng** trước khi gộp.
