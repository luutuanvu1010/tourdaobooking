# Bằng chứng — Đánh giá UX tổng thể 27/10/2026 (bản mới của đề bài)

Hồ sơ có ngày. Báo cáo và phụ lục ở `docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/` (`BAO-CAO.md` cho chủ; `PHU-LUC-PHAT-HIEN.md`, `KIEM-KE.md`, `HE-THONG-HOP-NHAT.md`, `LO-TRINH.md`, `SO-LECH-TU-MA.md`, `PROMPT.md`). Thư mục này giữ **kịch bản, số liệu và ảnh đại diện**; bộ ảnh đầy đủ (vài nghìn tệp JPEG) để **ngoài kho** ở `~/tourdao-ux-2026-10-27-v2/anh/` (máy chủ dự án), đường dẫn ghi trong các tệp số liệu dưới dạng `~/…`.

## Không dữ liệu thật, không production

Mọi thứ chạy trên **máy chủ thử cục bộ** (`wrangler dev` qua `kich-ban/may-chu.mjs`) với **ba kho D1 tạm** cố định ở `~/tourdao-ux-2026-10-27-v2/`: `d1` (trạng thái NHIỀU, cổng 8795), `d1-it` (ÍT, cổng 8796), `d1-rong` (RỖNG, cổng 8797). Dữ liệu gieo qua API thật bằng `kich-ban/gieo-du-lieu.mjs` (tên khách, SĐT, đơn, xe, chuyến, vé đều giả; danh mục dịch vụ kéo từ Google Sheet thật **chỉ đọc** ở lần gọi `/api/catalog` đầu). Turnstile, Face ID, Web Push tắt bằng `--var`; khoá phiên là chuỗi cố định chỉ của máy thử (ghi trong `may-chu.mjs`). Không có ảnh nào chứa tên hay số điện thoại thật.

## Tài khoản giả (PIN do máy chủ sinh, lưu ở `kich-ban/tai-khoan.json` cho kho `d1`/`d1-it` và `kich-ban/tai-khoan-rong.json` cho `d1-rong`)

| Bộ quyền | Tài khoản | SĐT | Vai gán |
|---|---|---|---|
| SUPER_ADMIN (+ADMIN) | Toàn Quyền Thử | 0900000010 | IT |
| SALES | Bán Hàng Thử, Bán Hàng Hai | 0900000901, 0900000902 | Nhân viên kinh doanh |
| INTERN | Thực Tập Thử | 0900000903 | Thực tập |
| ACCOUNTING | Kế Toán Thử | 0900000904 | Kế toán |
| ADMIN | Quản Trị Thử | 0900000905 | Giám đốc |
| FIELD | Hướng Dẫn Thử | 0900000906 | Hướng dẫn viên nội bộ |
| PARTNER | Cộng Tác Thử, Lữ Hành Thử | 0900000907, 0900000908 | Cộng tác viên, Công ty lữ hành (hồ sơ cá nhân) |
| DRIVER | Tài Xế Công Ty Thử | 0900000909 | Tài xế công ty |
| DRIVER_PARTNER | Tài Xế Đối Tác Thử | 0900000910 | Tài xế đối tác |
| HR | Nhân Sự Thử | 0900000911 | Hành chính nhân sự |

Hành trình thật tạo thêm hai tài khoản qua màn hình: 0900000912 (Toàn quyền tạo), 0900000913 (Nhân sự tạo).

## Kịch bản (`kich-ban/`, chạy từ gốc kho; Node 22, Chrome có sẵn trên máy, không thêm dependency)

| Tệp | Việc | Ghi ra |
|---|---|---|
| `may-chu.mjs` | bật máy chủ thử (`--port`, `--d1`, `--turnstile`) | log ở `~/tourdao-ux-2026-10-27-v2/may-chu*.log` |
| `gieo-du-lieu.mjs --chang tai-khoan\|it\|nhieu` | gieo tài khoản + dữ liệu qua API; mọi lệnh ghi và lệnh bị từ chối ghi lại | `nhat-ky-gieo-<chặng>.json`, `du-lieu-gieo-<chặng>.json` |
| `ma-tran-quyen.mjs` | sinh từ mã: 15 vai → 10 bộ quyền, bộ → trang có lối vào, mục thanh bên | `../ma-tran-quyen.json` |
| `cdp.mjs` | khung Chrome headless qua CDP: mỗi tài khoản một ngăn trình duyệt; mọi lệnh có hạn 45 s; ảnh cả trang cắt ở 9.000 px | — |
| `do-trong-trang.js` | biểu thức đo trong trang: hit-test, getComputedStyle, vùng chạm < 44, ô gõ < 16px, tràn ngang, chữ Anh, chữ ký nút/huy hiệu/thẻ/ô gõ, h1, vùng dính, bảng | — |
| `do-trang.mjs --nhan nhieu\|it\|rong` | quét MỌI trang × MỌI bộ quyền × khổ 390/1040 (+768/1440 cho danh sách, bảng điều khiển) + 403/404/mất mạng; axe WCAG 2.1 A/AA (`AXE_JS` ngoài kho); Tab 12 lần ở 1040 | `../so-lieu/<nhan>.json`; ảnh `~/tourdao-ux-2026-10-27-v2/anh/<nhan>/<bộ>/<trang>-<khổ>.jpg` + `-man-dau.jpg` |
| `do-toc-do.mjs` | đo tốc độ cảm nhận: 4G chậm (1,6 Mbit/s ↓, 750 kbit/s ↑, 150 ms) + CPU chậm 4×, 390×844; lạnh / chờ nạp sẵn / nóng; FCP, LCP, CLS, TBT, khung xong, nội dung xong, cỡ tải; chuyển trang và phản hồi chạm | `../so-lieu/toc-do.json` |
| `hanh-trinh.mjs [--kho 390\|1040]` | 10 hành trình thật (một mỗi bộ quyền) từ màn Đăng nhập: đếm chạm, gõ, cuộn, đoán; bấm bằng toạ độ thật | `../so-lieu/hanh-trinh-<khổ>.json`; ảnh `~/…/anh/hanh-trinh/<khổ>/<bộ>/` |
| `tong-hop.mjs` | gộp số liệu quét thành bảng Markdown (trang × họ × bộ × ảnh; số đo từng trang; 403/404/mất mạng; rỗng vs nhiều; sổ lệch đo trên màn hình; axe; chữ Anh; console; thanh điều hướng; 15 vai → 10 bộ) | `../so-lieu/tong-hop.md`, `tong-hop.json` |
| `dem-ban-chup.mjs` | đếm ảnh đã chụp | — |

| `do-co-goi.sh <gốc kho>` | cỡ gói tĩnh từng trang (thô / gzip), phông, HTML có preload/prefetch không | `../so-lieu/co-goi.txt` |
| `dem-token.mjs <gốc kho>` | đếm token `:root` của `app.css`: không dùng, dùng 1 lần, bí danh, trùng giá trị | `../so-lieu/token.txt` |
| `chep-anh-dai-dien.mjs` | chép ảnh được trích dẫn trong hồ sơ + ảnh 390/1040 mọi trang + 3 trạng thái chung vào `../anh/` | `../anh/*.jpg` |

Lệnh đã chạy (theo thứ tự, 27/10/2026): `may-chu.mjs` ×3 (8795/8796/8797) → `gieo-du-lieu.mjs --chang tai-khoan` (kho d1 và d1-rong) → `--chang it` (kho d1-it) → `--chang nhieu` (kho d1) → `ma-tran-quyen.mjs` → `do-trang.mjs` ×3 (chạy song song; lượt đầu 15:29 treo ở `/help` vì chụp cả trang không giới hạn, dừng lúc 15:49, sửa `cdp.mjs`, chạy lại 15:50, xong 16:58–17:07, 474 ô mỗi lượt, 0 lỗi kịch bản) → `do-co-goi.sh`, `dem-token.mjs` → `tong-hop.mjs` → `hanh-trinh.mjs` chạy thử trên kho RỖNG rồi ÍT để sửa ba nhãn kịch bản lệch màn hình thật (thẻ "Xác nhận đơn" không phải nút; nút tài xế là "Cho xe chạy"; điều phối không còn lượt chưa xếp) → `hanh-trinh.mjs --kho 390` (10 bộ, 17:06) rồi `--kho 1040 --bo SALES,ACCOUNTING,ADMIN` (17:11) trên kho NHIỀU → `do-toc-do.mjs` (17:13, chạy một mình) → `tong-hop.mjs` lần cuối → `chep-anh-dai-dien.mjs`. Hai lượt chạy thử của `hanh-trinh.mjs` không giữ số liệu (đã xoá) vì dữ liệu không đủ để đi hết hành trình.

## Ảnh đại diện trong kho (`anh/`)

Chép bằng `kich-ban/chep-anh-dai-dien.mjs` từ bộ ảnh đầy đủ: mọi ảnh được trích dẫn trong năm tệp hồ sơ (quy ước `ảnh nhieu/ADMIN/xe-390` → `anh/nhieu-ADMIN-xe-390.jpg`, ảnh màn đầu; `ảnh ht/390/SALES/15` → `anh/ht-390-SALES-15.jpg`, bước hành trình) + ảnh màn đầu 390 và 1040 của mọi trang (trạng thái NHIỀU, bộ quyền rộng nhất) + ảnh 403 / 404 / mất mạng của Bán hàng. Ảnh JPEG chất lượng vừa, mỗi tệp 40–120 KB.

## Điều chưa làm / giới hạn

- Chrome headless không đo được vùng an toàn iPhone (`safe-area-inset`), bàn phím iOS, Face ID, cài đặt PWA → danh sách thử tay ở `docs/PWA-IPHONE.md` (mục 8–15 bổ sung 27/10).
- Mạng 4G và CPU chậm là giả lập của Chrome, không phải thiết bị thật; số đo nóng/lạnh đọc tương đối giữa các trang.
- Service worker chỉ đăng ký trên `localhost` (không phải 127.0.0.1): mọi lượt quét dùng `http://localhost:<cổng>`.
- Luật một máy (ADR-0075): đăng nhập mới đá phiên cũ, nên các kịch bản dùng chung tài khoản không chạy song song trên cùng kho.
- Cột "thanh điều hướng" của `do-trong-trang.js` (`nav`, `coTabbar`) dùng bộ chọn `.tabbar/.topbar` không khớp DOM thật (`#tabbar`, `#topbar`) nên rỗng; không sửa giữa lượt để ba lượt cùng một thước; thanh tab nhìn thấy lấy từ bước "sau đăng nhập" của `hanh-trinh.mjs`.
- Lượt quét mở `/cuoc-chuyen` của tài xế bằng mã chuyến đầu tiên của kho, không phải chuyến của tài xế đó, nên ảnh quét là hộp "Không tìm thấy chuyến."; màn chuyến thật lấy từ hành trình Tài xế.
- Kịch bản hành trình chỉ bấm nhãn đã định trước: Tài xế dừng ở "Đã tới" (nhãn không có trong kịch bản), Tài xế đối tác gõ lý do thay vì chọn nút tròn nên khung bận không lưu — hai chỗ này được ghi là phát hiện (nút tắt không giải thích) chứ không chạy lại cho "đẹp số".
