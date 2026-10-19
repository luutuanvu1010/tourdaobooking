# Bằng chứng giao diện — Sổ đại lý đợt 2, Task 12 (2026-10-19)

Kịch bản: `kich-ban/so-dai-ly-dot-2-smoke.mjs` (D1 tạm + `wrangler dev` + Chrome headless, axe-core ngoài repo, không `--remote`). Chạy từ gốc repo sau `npm run build:web`:

```
AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-18-so-dai-ly-dot-2/kich-ban/so-dai-ly-dot-2-smoke.mjs
```

Lần chạy cuối 2026-10-19 (lần 4; các lần trước đỏ vì kịch bản: kiểm danh sách Chụp bù trước khi tải xong, CSP chặn `fetch(blob:)` khi lấy ảnh biên nhận): **SMOKE OK**, axe không lỗi critical / serious; 6 lỗi nhẹ `region — #strips` (dải thông báo bảo mật hai lớp có sẵn ở mọi trang, không do Task 12).

Ảnh (`anh/`, mỗi màn ở 390 và 1040):

| Ảnh | Nội dung |
|---|---|
| `1-don-dai-ly-truoc-da-giao-*` | Bán hàng: trang đơn đặt qua đại lý (tour + vé tắm bùn của nhà cung cấp) trước «Đã giao» |
| `1-form-khach-tra-dai-ly-*`, `1-form-khach-tra-tai-quay-*` | Form «Ghi khoản thu»: bốn lựa chọn người thu tiền, ô «Phần tiền này cho» (khoá vào quầy khi chọn quầy), câu chờ Kế toán |
| `1-form-khach-le-1040` | Đơn khách lẻ không quầy nhà cung cấp: chỉ «Công ty» và «Tôi thu» |
| `1-don-dai-ly-hai-khoan-cho-*` | Trang đơn sau khi khai hai khoản chờ Kế toán |
| `2-trang-chu-ke-toan-cho-doi-chieu-*`, `2-khoi-cho-doi-chieu-*` | Trang chủ Kế toán: khối «Chờ đối chiếu» với nút «Bên kia đã nhận» |
| `3-chup-bu-*`, `3-chup-bu-sau-ca-danh-sach-1040` | Trang «Chụp bù mức»: ba đơn, nhãn lý do lời thường; sau «Chụp bù cả danh sách» (2 đơn chụp được, 1 đơn xác nhận 5 ngày trước còn thiếu mức) |
| `4-don-dai-ly-sau-da-giao-*` | Quản trị: trang đơn sau «Đã giao – đã thu đủ» |
| `4-bien-nhan-hai-phan-*`, `4-bien-nhan-hai-phan-cuoi-*`, `4-bien-nhan-hai-phan-anh-*` | Hộp biên nhận; ảnh PNG gửi khách đầy đủ — tổng kết chia «Phần 1 · CÔNG TY TNHH TOUR ĐẢO», «Phần 2 · I Resort Nha Trang», chân trang «Phần 2 do I Resort Nha Trang bán; Tour Đảo là đối tác đặt vé.»; phần đã trả đủ in «Còn lại 0 ₫» |

Ghi chú: ảnh chụp khung form ở 390 có thanh đầu trang dính đè lên giữa ảnh — do cách chụp vượt khung nhìn (`captureBeyondViewport`), không phải lỗi bố cục.
