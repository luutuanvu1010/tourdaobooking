# Bằng chứng — Kiểm giao diện toàn diện, bước 0 (13/11/2026)

Hồ sơ có ngày. Báo cáo: `docs/superpowers/specs/2026-11-13-kiem-giao-dien/BAO-CAO.md`; danh sách phát hiện: `PHAT-HIEN.md` cùng thư mục.
Mã đo: `main` = `ab2422468` (bản 2.96). **Không chạm production, không dữ liệu thật.** Bộ ảnh đầy đủ và số liệu thô để **ngoài kho** ở
`~/tourdao-ux-2026-11-13/` (máy chủ dự án); trong kho chỉ có ảnh đại diện (`anh/`), số liệu tóm tắt (`so-lieu/`) và trang so sánh `so-sanh.html`.

## Dựng máy thử (đã làm, theo thứ tự)

1. Worktree phiên, `npm ci`, `npm run build:web`.
2. D1 tạm: `npx wrangler d1 migrations apply tourdao-sales-db --local --persist-to ~/tourdao-ux-2026-11-13/d1` (0001–0158).
3. Toàn quyền thử: `node scripts/create-staff.mjs "Toàn Quyền Thử" 0900000010 <PIN trong gieo-du-lieu.mjs> SUPER_ADMIN,ADMIN` → `wrangler d1 execute --local --persist-to … --file`.
4. Máy chủ thử (dùng lại kịch bản 27/10): `node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/may-chu.mjs --d1 ~/tourdao-ux-2026-11-13/d1 --port 8815`.
5. Tài khoản: `UX_BASE=http://127.0.0.1:8815 UX_PERSIST=~/tourdao-ux-2026-11-13/d1 UX_TK_FILE=~/tourdao-ux-2026-11-13/tai-khoan.json node kich-ban/gieo-du-lieu.mjs --chang tai-khoan`
   (13 tài khoản: 10 bộ quyền của 27/10 + **Quản lý bán hàng** 0900000914). Chép kho lúc này thành `d1-rong` (kho RỖNG, máy chủ cổng 8816).
6. Dữ liệu giả qua API thật: `--chang it` rồi `--chang nhieu` trên `d1` → 45 đơn (32 không nháp), 6 xe, 8 chuyến, 6 vé hỗ trợ. Bốn lệnh bị từ chối là lệnh cố ý (xác nhận đơn ngày đã qua).
   Trạng thái ÍT không giữ riêng (đã nâng lên NHIỀU) ⇒ đo RỖNG và NHIỀU.
7. **Tệp giao diện công ty giống production**: GET công khai `https://booking.tourdao.vn/giao-dien.css` 13/11 = `--c-text:#000000;--fs-h1:20px;--fs-label:16px;--fs-step-5:17px`;
   áp lên cả hai máy thử bằng PUT `/api/giao-dien` (khoá mới: `chu-chinh`, `co-tieu-de-trang`, `co-nhan`, `co-noi-dung`) — kịch bản `~/tourdao-ux-2026-11-13/ap-giao-dien.sh`. Sau khi áp, `/giao-dien.css` máy thử trùng production từng ký tự.
8. axe-core 4.13 (`axe.min.js`) ngoài kho, qua biến `AXE_JS`. Chrome của máy (`/Applications/Google Chrome.app`), headless qua CDP, không thêm dependency.

## Kịch bản (`kich-ban/`, chạy từ gốc kho)

| Tệp | Việc | Ghi ra |
|---|---|---|
| `gieo-du-lieu.mjs`, `ma-tran-quyen.mjs` | chép từ 27/10, thêm bộ Quản lý bán hàng | `nhat-ky-gieo-*.json`, `../ma-tran-quyen.json` (11 bộ, sinh từ `TRANG`) |
| `cdp.mjs` | chép từ 27/10: thêm tỉ lệ điểm ảnh + máy iPad; cây trợ năng (T15); **đặt lại bộ đếm mạng mỗi lần điều hướng** (bộ đếm cũ lệch làm mỗi ô chờ đủ hạn khi chạy song song) | — |
| `do-trong-trang.js` | chép từ 27/10: sửa bộ chọn thanh điều hướng theo DOM thật; **bỏ phần tử trong `<details>` đóng** | — |
| `do-them.js` (mới) | T3 (cuộn từng nút / số tiền vào giữa màn rồi thử điểm chạm), T7 (bề rộng nội dung), chồng chữ, số cỡ chữ, đơn vị chữ gốc | — |
| `do-quet.mjs` (mới) | mọi bộ quyền × trang có lối vào + 403/404/mất mạng; ảnh + đo đủ ở 390/820(iPad)/1280; chỉ số ở 360/430/1180/1024/1440; axe WCAG 2.0–2.2 AA + cây trợ năng ở 390 và 1280; Tab 12 lần ở 1280; T16 hai phép xấp xỉ | `~/tourdao-ux-2026-11-13/so-lieu/<nhãn>-<bộ>.json`, ảnh `~/…/anh/<nhãn>/<bộ>/` |
| `tong-hop.mjs` (mới) | gộp số liệu thô theo T1–T16 (lọc: hộp ≤ 2 px khi đếm cắt chữ; T4 chỉ khổ điện thoại) | `so-lieu/tong-hop.json`, `tong-hop.md` |
| `hanh-trinh.mjs`, `do-toc-do.mjs` | chép từ 27/10, chỉ đổi chỗ ghi | `so-lieu/hanh-trinh-*.json`, `so-lieu/toc-do.json` |
| `soi-mot-o.mjs` (mới) | đo lại MỘT ô bằng một biểu thức JS (cho người kiểm lại) | stdout |
| `chep-anh-dai-dien.mjs`, `dung-so-sanh.mjs` (mới) | ảnh đại diện thu nhỏ + trang so sánh | `anh/`, `so-sanh.html` |

Lệnh đã chạy (13/11): quét NHIỀU hai luồng song song (`--bo SUPER_ADMIN,HR,SALES,INTERN,FIELD,KHACH` và `--bo ADMIN,ACCOUNTING,SALES_MANAGER,PARTNER,DRIVER,DRIVER_PARTNER`),
quét RỖNG `--nhe` một luồng — 2.709 ô, 0 lỗi → `tong-hop.mjs` → `do-toc-do.mjs --bo SUPER_ADMIN,SALES,DRIVER_PARTNER` (chạy một mình) → `hanh-trinh.mjs --kho 390`
rồi `--kho 1280 --bo SALES,ACCOUNTING,ADMIN` (hành trình GHI dữ liệu, chạy sau cùng). Lượt quét đầu (06:23–06:50) bỏ đi vì đếm nhầm phần tử trong `<details>` đóng
(lưu ở `~/tourdao-ux-2026-11-13/luot-1/`); số trong báo cáo là lượt hai (06:53–07:18).

**Đo lại một ô** (máy chủ thử phải đang chạy, cổng 8815):

```
AXE_JS=<axe.min.js> node docs/evidence/2026-11-13-kiem-giao-dien/kich-ban/do-quet.mjs --nhan kiem-lai --base http://localhost:8815 --bo SALES --trang /orders
node docs/evidence/2026-11-13-kiem-giao-dien/kich-ban/soi-mot-o.mjs SALES /order-form 844 390 1 'document.querySelector(".thanh-hanh-dong-cuoi").getBoundingClientRect().height'
```

Lưu ý: hành trình đã tạo thêm vài đơn và hai tài khoản sau lượt quét, nên đếm lại ở danh sách đơn / tài khoản có thể lệch vài dòng.

## Giới hạn

Chrome giả lập không phải iPhone / iPad / Android thật (vùng an toàn, bàn phím ảo, cỡ chữ của máy, VoiceOver, TalkBack chưa kiểm). T16 chỉ là hai phép xấp xỉ.
`do-loi-hien-thi.js` của 30/10 dùng nguyên (không sửa hồ sơ cũ) nên phần cắt chữ chưa bỏ phần tử trong `<details>` đóng — ảnh hưởng nhỏ (đếm cắt chữ không thấy mục nào như vậy).
Điểm Nielsen (T18) là nhận định trên ảnh.
