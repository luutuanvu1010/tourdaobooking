# Điều chỉnh công nợ cần người thứ hai duyệt — kịch bản Chrome (13/10/2026)

Hồ sơ có ngày (không sửa lại cho khớp hiện trạng). Nền: `main` ở bản 1.92 (`972c9e1b`). Luật: ADR-0115 đợt 1. Màn: `/dieu-chinh-cong-no` (`web/dieu-chinh-cong-no.ts`, `public/dieu-chinh-cong-no.html`).

**Kết quả lần chạy đủ (13/10):** `kich-ban/dieu-chinh-smoke.mjs` — 36 bước, **32 xanh, 4 đỏ**. Bốn bước đỏ là cùng MỘT lỗi giao diện thật (xem dưới); mọi bước còn lại xanh, kể cả axe-core 4.12.1 (0 vi phạm critical/serious, không có vi phạm nhẹ), thanh bên Quản trị đúng **25** mục và Toàn quyền đúng **32** mục (con số trong `trang-chu-smoke.mjs`, nay đã đo thật).

## Lỗi thật phát hiện (chưa sửa, chờ chủ quyết)

Nút «Gửi yêu cầu chờ duyệt» bị khoá và **không mở lại** (phải tải lại trang) trong hai trường hợp: (1) gửi xong thành công; (2) máy chủ trả 409 (ví dụ «vượt trần», «quyết toán khi chưa có nợ»). Nguyên nhân: `web/dieu-chinh-cong-no.ts` hàm `chay` (dòng 51–64): `tat(true)` ở đầu, nhưng nhánh thành công không gọi `tat(false)`, và nhánh 409 chỉ tải lại danh sách (`await load(true)`) mà không mở nút; với thẻ yêu cầu thì thẻ được vẽ lại nên không thấy, với biểu mẫu thì nút (`nutGui`, dòng 174) kẹt. Tái hiện: Kế toán gửi một yêu cầu, rồi thử gửi yêu cầu thứ hai — nút xám. Hậu quả: Kế toán sửa số tiền sau câu «vượt trần» không gửi lại được nếu chưa tải lại trang. Các bước đỏ: `5b` và `2b` ở cả hai khổ.

## Cách chạy

Từ gốc repo, sau `npm run build:web`; D1 local TẠM (Turnstile tắt, không `--remote`, không production); cần axe-core lấy ngoài repo (`npm pack axe-core`).

```
AXE_JS=<…/package/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-13-dieu-chinh-cong-no/kich-ban/dieu-chinh-smoke.mjs
```

Thiếu `AXE_JS` thì dừng ngay. Mỗi bước chạy riêng; cuối cùng in `DIEU CHINH SMOKE OK` hoặc danh sách bước đỏ (thoát 1). Máy tải nặng thì mất 40–50 phút (mỗi lần đọc số dư là một lệnh `wrangler d1 execute`).

**Phá thử (P16):** `DC_PHA=duyet` (giả máy chủ cho người gửi tự duyệt) ⇒ bước 3 đỏ; `DC_PHA=ly-do` (từ chối gửi lý do «x») ⇒ bước 4a và 4d đỏ. Dùng kèm `DC_KHO=390` và `DC_DUNG=<mã bước>` cho nhanh, và `OUT=<thư mục tạm>`.

## Bước → ảnh

| Bước | Ảnh | Kết quả |
|---|---|---|
| 1 Kế toán mở màn, hai khối rỗng | `01-ke-toan-rong-390` | ✓ |
| 5 ca bị chặn (quyết toán khi chưa có nợ, vượt trần) | `05-ca-bi-chan-1040` | ✓ câu tiếng Việt, không mã thô |
| 2 gửi bằng biểu mẫu thật, «Chờ duyệt», số dư chưa đổi | `02-ke-toan-cho-duyet-390`, `-1040` | ✓ (nút Gửi còn xám: lỗi 2b) |
| 4a Quản trị từ chối: thiếu lý do, rồi có lý do | `04a-quan-tri-tu-choi-390` | ✓ «Cần ghi lý do.» |
| 6 Quản trị chỉ thấy khối «Chờ duyệt» | `06-quan-tri-cho-duyet-1040` | ✓ |
| 4d Kế toán thấy Đã duyệt / Bị từ chối kèm lý do / Đã rút | `04d-ke-toan-ket-qua-390` | ✓ |
| 6b Bán hàng bị chặn | `06b-ban-hang-bi-chan-390` | ✓ |
| 7 máy tính rộng 1280 | `07-ke-toan-1280` | ✓ không tràn, `<main>` ≤ `--w-main` |

## Chưa kiểm

iPhone thật; hết hạn 7 ngày (cần đổi giờ máy chủ); tháng đã khoá; chuông thông báo; `trang-chu-smoke.mjs` chưa chạy lại nguyên cả kịch bản (chỉ hai con số 25 / 32 được đo ở đây).
