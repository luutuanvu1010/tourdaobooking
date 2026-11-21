# Máy đo và bộ ví dụ thử giao diện

Tiêu chí chấm nằm ở `docs/TIEU-CHI-GIAO-DIEN.md` (một nơi). Mọi lệnh chạy từ GỐC kho. Ảnh và số đo luôn ghi ra thư mục tạm ngoài kho (kho công khai).

## Đo một màn
```
node scripts/giao-dien/do-man.mjs --o SALES:/order-form,PARTNER:/order-form [--kho 390,1280] [--ra <thư mục ngoài kho>]
```
Lệnh dựng bản thử tạm (D1 tạm, `wrangler dev`, Chrome ẩn), gieo vài đơn, chụp từng màn cuộn (gối nhau 40 %), chấm 12 tiêu chí máy đo.
Kết quả: `anh/`, `so-do.json`, `tom-tat.md` (dòng đầu là kết luận).

## Ba mã thoát
- 0: mọi tiêu chí đạt.
- 1: có tiêu chí không đạt.
- 2: không chạy được hoặc ĐO THIẾU (thiếu axe, ô hỏng, `--khong-axe`). Không bao giờ coi là đạt.

Thiếu axe: chạy `npm ci`, hoặc đặt `AXE_JS=<đường dẫn axe.min.js>`.

## Bộ ví dụ thử (20 ca, `vi-du/ca.json`)
1. Chụp: `node scripts/giao-dien/chay-vi-du.mjs --ra <thư mục ngoài kho>` ⇒ `bang-chung/man-NN/` (giao người chấm) và `khoa/khoa.json` (giữ lại, KHÔNG giao).
2. Giao `bang-chung/man-NN/` cho trợ lý đánh giá, báo cáo lưu thành `<thư mục báo cáo>/man-NN.md`.
3. Chấm: `node scripts/giao-dien/cham-vi-du.mjs --khoa <khoa.json> --bao-cao <thư mục báo cáo>` ⇒ `ket-qua.md`.
`--tiem <tệp.js>` cấy lỗi lúc đo; `--an-tiem` giấu việc cấy khỏi kết quả (chỉ cho bộ ví dụ thử).

## Bộ quyền dùng được
Cả 11 bộ tạo được tài khoản thử và đăng nhập được (kiểm 20/11): SALES, INTERN, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, DRIVER, DRIVER_PARTNER, HR, SALES_MANAGER (cộng KHACH, chưa đăng nhập).
Mới đo trang thật với SALES, PARTNER, ACCOUNTING; bộ khác mở trang nào thì xem kết quả ô đó (có thể ra 403, đó là kết quả đo).

## Giới hạn
- Chỉ chụp màn ngay sau khi tải (chưa bấm gì); hai khổ 390 và 1280.
- Dữ liệu thử chỉ có họ màn Lập đơn, Đơn hàng, Chi tiết đơn (đơn của Bán hàng và một đơn của Đối tác).
- Chưa đo tốc độ, cỡ chữ lớn, iPad, iPhone thật.

## Đo khung gốc (`npm run do-khung`, từ 2026-11-21)
Lớp canh thứ hai của luật khung gốc giao diện: với mỗi màn đã khai `data-khung-goc`, quét mọi bề rộng cửa sổ 360 tới 1.920 (bước 20) trên máy thử cục bộ và kiểm tám điều: không tràn ngang, không chữ bị bóp, khối thẳng mép vùng nội dung, không phần tử thò ra ngoài khối, một kiểu vỏ khối, khoảng cách thuộc thang, nút chính đúng chỗ của khuôn, không phần tử fixed trong vùng nội dung.
- `npm run do-khung -- --dem`: chỉ in năm con số «chưa theo khung» đọc từ mã (không cần trình duyệt). Dùng để hạ trần ở `src/khung-goc.test.ts`.
- `npm run do-khung -- --tk <tệp tài khoản thử> [--base http://127.0.0.1:8843] [--bang <bảng màn.json>] [--man khoá,…] [--tu 360 --den 1920 --buoc 20] [--ra <thư mục ngoài kho>]`: cần máy thử đang chạy (xem đầu tệp `do-khung-goc.mjs`) và bảng màn `[{ khoa, tk, trang }]` mang mã bản ghi của kho dữ liệu giả đang dùng.
- Mã thoát như máy đo màn: 0 đạt hết, 1 có ô không đạt, 2 không chạy được hoặc ĐO THIẾU (trang đã chuyển khuôn mà bảng màn không có, hoặc chỉ đo vài màn bằng `--man`).
- Tệp: `do-khung-goc.mjs` (lệnh), `cham-khung-goc.mjs` (đoạn đo trong trang và máy chấm, bài `src/khung-do.test.ts`), `dem-khung-goc.mjs` (phép đếm, dùng chung với `src/khung-goc.test.ts`).
- Giới hạn: chỉ đo màn ngay sau khi tải (chưa mở bảng trượt, chưa bấm gì); một tài khoản mỗi màn; Chrome giả lập, chưa phải máy thật; không nằm trong `npm test`.
