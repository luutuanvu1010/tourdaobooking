# Số đo lưới bố cục trên màn hình — 30/10/2026 (Chặng 3)

Hồ sơ có ngày: viết xong là đóng băng. Mục đích: số liệu hiện trạng cho đề bài thiết kế «lưới bố cục», trả lời lời chê của chủ dự án «không mạch lạc, có những khoảng trống vô lý». Phiên trước đếm tĩnh trong `public/app.css` (BAN-GIAO.md mục 3.1 của `docs/superpowers/specs/2026-10-29-tai-cau-truc-giao-dien/`); bộ này đo **trên màn hình**, theo trang và theo khuôn trang.

## Đo cái gì, trên máy nào

- Mã: worktree `chang-3-luoi-bo-cuc` (phần web giống `main` a129d3dd), `npm ci` + `npm run build:web`. Máy chủ thử `wrangler dev` cổng 8810 (`kich-ban/may-chu.mjs`), **không chạm production**.
- Dữ liệu: kho D1 riêng `~/tourdao-ux-luoi/d1` = bản chép kho 27/10 (`~/tourdao-ux-2026-10-27-v2/d1`, trạng thái NHIỀU: 49 đơn, 14 tài khoản) + áp migration 0120–0127. Không ghi dữ liệu nào trong lúc đo.
- Tài khoản: `docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/tai-khoan.json`. Bộ quyền rộng nhất có lối vào theo `docs/evidence/2026-10-29-dot-0-khung-chung/ma-tran-quyen.json`: SUPER_ADMIN cho 41 trang, DRIVER cho `/tai-xe`, `/cuoc`, `/cuoc-chuyen` (chuyến đang chạy của chính tài xế thử), DRIVER_PARTNER cho `/ban`. Tổng 45 trang × 3 khổ = 135 ô, 0 ô lỗi.
- Khổ: 1040×900 và 1440×900 (chính), 390×844 (chỉ dùng cho mục e). Chi tiết đơn mở đơn có nhiều dòng dịch vụ nhất; Chi tiết chuyến mở chuyến đang chạy mới nhất.
- Khuôn trang: bảng `KIEM-KE.md` mục 5 (27/10) + `/thiet-lap` = thiết lập (kế hoạch 0b Task 6).

## Tệp

| Tệp | Là gì |
|---|---|
| `kich-ban/do-luoi.js` | biểu thức đo chạy trong trang (getComputedStyle, getBoundingClientRect, hộp chữ thật bằng Range) — sáu mục a–f |
| `kich-ban/do-luoi.mjs` | duyệt 45 trang × 3 khổ, ghi `so-lieu/luoi.json`, chụp ảnh đại diện |
| `kich-ban/tong-hop-luoi.mjs` | sinh `so-lieu/tong-hop.md` từ `luoi.json` |
| `kich-ban/soi-phan-tu.mjs` | soi tay một phần tử (dùng cho phát hiện 5) |
| `kich-ban/{may-chu,cdp}.mjs` | chép nguyên từ bộ 29/10 (`do-trang.mjs`, `do-trong-trang.js` chép theo đề bài để tham khảo, không chạy) |
| `so-lieu/luoi.json` | số thô từng ô (mọi khoảng trống tính bằng px, kèm chọn lọc phần tử) |
| `so-lieu/tong-hop.md` | bảng theo khuôn, bảng 45 trang, ví dụ tệ nhất từng mục |
| `anh/NN-<trang>-<khổ>.png` | 25 ảnh: 11 trang đại diện ở 1040 và 1440, thêm 390 cho Đơn hàng, Chi tiết đơn, Tạo đơn; cắt tối đa 2 màn |

Chạy lại (từ gốc worktree, máy chủ đang chạy): `node docs/evidence/2026-10-30-luoi-bo-cuc/kich-ban/do-luoi.mjs` rồi `node docs/evidence/2026-10-30-luoi-bo-cuc/kich-ban/tong-hop-luoi.mjs`.

## Định nghĩa phép đo (ngưỡng)

- **a)** bề rộng `main`, khối cấp một lớn nhất trong `main` (bỏ tiêu đề, dải anh em, chú thích, thông báo), và «trần đang chặn» = phần tử rộng ≥ 200 px có `max-width` px mà bề rộng thật bằng đúng trần (±2 px), kèm tên token (`--w-*` cùng giá trị px) và quy tắc CSS khớp. Thêm «mực phải còn trống» = từ chữ/ô xa nhất bên phải tới mép màn.
- **b)** phần tử flex hàng hoặc grid, rộng ≥ 300 px, 2–6 con: khoảng trống ngang lớn nhất giữa hai cụm **chữ thật** (hộp chữ đo bằng Range, không phải hộp khối) trên cùng một dòng. Đếm > 240 px theo đề bài; tệp thô ghi từ 120 px, tóm tắt có thêm cột > 160 px. Hàng lặp (mỗi thẻ đơn là một hàng) được đếm từng hàng.
- **c)** ô nhập theo loại (xếp theo thẻ → kiểu ô → chữ nhãn): ô SĐT/ngày/số rộng > 480 px, ô tên < 200 px. Thêm «dòng ô ngắn bỏ trống phải»: một dòng của lưới có ô nhập mà mép phải ô xa nhất còn cách mép trong khung > 240 px.
- **d)** con của flex hàng/grid có ngăn khác cùng hàng, rộng ≥ 20% bề rộng trong của `main`, cao hàng ≥ 100 px, không chứa ô nhập/nút, và < 3 phần tử nội dung hoặc chỉ một câu gợi ý («Chọn…», «Chưa có…»). Cột bảng rộng ≥ 20% bảng mà ≤ 50% ô có chữ.
- **e)** 390: trang rộng hơn màn (bỏ phần tử nằm trong vùng cuộn ngang có chủ đích); hàng có ≥ 2 nút mà nút khác chiều cao > 4 px, hoặc xuống dòng với số nút mỗi dòng không đều.
- **f)** tiêu đề cỡ ≥ 20 px trong 260 px đầu `main`; «trùng» khi chữ trùng đoạn cuối của tên trên thanh trên. Chỉ đếm ở 1040 (thanh trên 390 là thành phần khác).

Ngưỡng 50% của cột bảng, chiều cao hàng 100 px và mốc ghi 120 px được chọn sau lượt thử trên bảy chỗ đã biết (`anh/khoang-trong-7-cho-1040.jpg` của bàn giao 29/10); số thô nằm cạnh mỗi kết luận trong `luoi.json` để người dùng đổi ngưỡng.

## Bảng tóm tắt theo khuôn (1040 trừ khi ghi khác)

| Khuôn | Trang | Khối nội dung 1040 / 1440 (px) | Trần đang chặn | (b) hàng > 240 px: 1040 (số trang) / 1440 | (c) ô lệch 1040 / 1440 · dòng ô bỏ trống phải | (d) vùng trống | (e) 390 tràn · hàng nút | (f) có tiêu đề trong thân · trùng thanh trên |
|---|---|---|---|---|---|---|---|---|
| bảng điều khiển | 8 | 744–760 / 1144–1160 | không | 7 (3) / 14 | 0 / 0 · 1 | 4 | 0 · 2 | 7 · 6 |
| danh sách | 12 | 760 / 1160 | 420 `--w-narrow` (ô chọn Chủ xe ở `/xe`) | 35 (5) / 40 | 1 / 1 · 1 | 1 | 1 · 0 | 12 · 11 |
| chi tiết | 4 | 760 / 1160 | không | 11 (3) / 28 | 0 / 0 · 0 | 2 | 0 · 2 | 3 · 3 |
| biểu mẫu | 6 | 760 / 1088–1160 | 640 `--w-vc-form` (`/xe-sua`), 1120 `--w-form` (`/order-form`, chỉ 1440) | 1 (1) / 45 | 1 / 5 · 2 | 1 | 0 · 0 | 6 · 6 |
| thiết lập | 15 | 760 / 1160 | 900 `--w-thiet-lap-max` (`/thiet-lap`, chỉ 1440) | 59 (5) / 107 | 5 / 11 · 10 | 0 | 0 · 1 | 15 · 14 |
| **cộng** | **45** | | | **113 (17 trang) / 234 (28 trang)** | **7 / 17 · 14** | **8** | **1 · 5** | **43 · 40** |

Bảng 45 trang và mọi ví dụ: `so-lieu/tong-hop.md`.

## Phát hiện mạnh nhất

1. **Không có lưới: nội dung luôn giãn hết cột.** Ở mọi khuôn, khối nội dung rộng đúng cột trừ lề (760 px ở 1040, 1160 px ở 1440). Trần 1280 (`--w-main`) không bao giờ chặn ở hai khổ này vì `main` chỉ có 792/1192 px sau thanh bên 248 px. Chỉ bốn chỗ có trần thật: `/order-form` 1120 ở 1440, `/xe-sua` 640, `/thiet-lap` 900, ô chọn 420 ở `/xe`. Ngoài sáu mức trong CSS còn một mức thứ bảy: `/catalog` viết `style="max-width:1200px"` nội tuyến trên `main` (lệch `--w-main` 1280; chú thích `app.css` quanh dòng `body.has-sidebar main` vẫn ghi «--w-main 1200px»). Ảnh `03-xe-1440.png`, `10-catalog-1440.png`.
2. **«Chữ một đầu, nút một đầu» có ở 17/45 trang ở 1040 và 28/45 ở 1440**, khoảng trống phình theo khổ (+400 px khi màn rộng thêm 400 px). Tệ nhất: đầu trang Xe «Xe» … «Thêm xe» 614 → 1014 px; Lý do điều phối 44 hàng «Ốm» … «Sửa» 582 → 982 px; 30 thẻ Đơn hàng tên khách … trạng thái 451 → 851 px; đầu trang Hoa hồng 419 → 819 px. Ảnh `01-orders-1440.png`, `03-xe-1440.png`, `09-hoa-hong-1040.png`.
3. **Ô nhập rộng theo khung, không theo dữ liệu, theo cả hai chiều.** Ô số/ngày rộng > 480 px: 7 ô ở 1040, 17 ô ở 1440 (Số tiền ở Điều chỉnh công nợ 728 → 1128 px; Ngày chạy ở Đề nghị 760 → 1160 px; Tạo đơn ở 1440: Ngày khởi hành và Giảm giá 700 px). Ngược lại 14 dòng ô ngắn bỏ trống phải > 240 px, ví dụ Quản lý tài khoản: Họ tên và SĐT mỗi ô 235 px trong lưới ba cột, cột ba trống 247 px. Ảnh `06-order-form-1440.png`, `07-staff-1040.png`.
4. **Vùng trống chiếm chỗ: 8 chỗ ở 1040.** Sổ công nợ: ngăn phải 406 px (51% `main`) suốt chiều cao 356 px chỉ có câu «Chọn một bên ở danh sách để xem từng đơn.» (1440: 624 px). Danh bạ: cột «Công việc hôm nay» 219 px (30% bảng), 12/30 ô có chữ. Chuyến mới: cột «Xe trong ngày» 260 px chỉ có câu gợi ý. Trang chủ tài xế: ô 421 px một dòng chữ. Ảnh `08-so-cong-no-1040.png`, `08-so-cong-no-1440.png`, `02-parties-1040.png`.
5. **Chi tiết đơn, dải tóm tắt đầu đơn (đo tay bằng `soi-phan-tu.mjs`):** ở 1040 dải rộng 760 px nhưng ô «Mã đơn» chiếm 218 px gần trống, còn bốn cột Đón / Khách / Số khách / Còn lại dồn vào 381 px (khoảng 95 px mỗi cột) nên chữ xuống dòng từng từ, dải cao 387 px; ở 1440 cùng dải chỉ cao 183 px. Đây là lỗi lưới (chia cột cố định) chứ không phải thiếu chỗ. Ảnh `04-order-1040.png`, so `04-order-1440.png`.
6. **Tên trang lặp ở 40/45 trang** (1040): tiêu đề lớn 24/26/28 px trong thân trùng chữ với tên trên thanh trên — lệch quyết định cổng 2b (tên trang chỉ ở thanh trên). Ba cỡ chữ khác nhau cho cùng vai trò: 24 px phần lớn, 26 px cụm Vận chuyển, 28 px Chi tiết xe. Thấy ở mọi ảnh 1040/1440.
7. **Ở 390 vấn đề ngược lại: thiếu chỗ.** Chỉ `/audit` tràn ngang (ô chọn đẩy trang lên 549 px). 5 hàng nút lộn xộn: Chuyến của tôi (tài xế) 3 nút thành 3 dòng cao 52/52/44 px; Chi tiết chuyến 4 nút thành 3 dòng; Lịch xe bận, Sổ công nợ, Giao diện 4 hoặc 3 nút thành 2 dòng lệch số. Cùng một thẻ Đơn hàng ở 390 cắt tên khách và số khách («Ng…», «2I») trong khi ở 1440 hàng đó trống 851 px giữa hai cụm. Ảnh `01-orders-390.png` so `01-orders-1440.png`.

## Giới hạn của số đo

- Một trạng thái dữ liệu (NHIỀU) và một bộ dữ liệu thử; Sổ công nợ chỉ có 2 bên, Đơn đi hôm nay 1 đơn — vùng trống có thể nhỏ đi khi dữ liệu nhiều hơn, hàng «chữ một đầu» thì không.
- Chỉ đo trạng thái lúc tải trang: hộp thoại, ngăn trượt, form mở bằng nút (Thêm mức hoa hồng, Sửa, Chỉnh riêng quyền…) không được mở nên không đo.
- Trang dài hơn 6 màn (`/catalog`, `/sessions`, `/account`, `/help`, cột «cắt 6 màn» trong `tong-hop.md`): mục b, c, d và trần chặn chỉ xét 6 màn đầu.
- (b) đếm từng hàng lặp, nên số lớn ở Đơn hàng, Lý do điều phối, Tạo đơn (danh mục dịch vụ ở 1440) phản ánh số dòng dữ liệu; «số trang có» là chỉ số ổn định hơn.
- (c) xếp loại ô theo chữ nhãn tiếng Việt và kiểu ô; có thể sót hoặc xếp nhầm (ví dụ ô «hạn» ở trang Tôi xếp là số). Danh sách từng ô nằm trong `luoi.json` (`c.tatCa`).
- (f) `tong-hop-luoi.mjs` bỏ tiêu đề ẩn cho trình đọc màn hình (`h1.visually-hidden` «Trang chủ» ở `/`) vì hộp 1×1 px lọt bộ lọc «thấy được»; lời chào lớn ở Trang chủ và Trang chủ tài xế không tính là trùng.
- Ảnh chụp vượt màn (2 màn): thanh bên và thanh tab dính hiện lơ lửng ở vị trí màn đầu (ở ảnh 390 thanh tab nằm giữa ảnh) — đó là cách chụp, không phải lỗi giao diện. Ảnh lấy từ lượt quét thứ nhất; số trong `luoi.json` từ lượt thứ hai (chỉ sửa cách xếp loại ô ở mục c), cùng kho, cùng mã.
- Chiều cao màn 900 cho cả hai khổ máy tính (bộ 27/10 dùng 1040×800), nên số «màn cuộn» không so trực tiếp với bộ cũ; bề rộng thì so được.
- Chụp màn hình không bị treo lần nào; không trang nào phải đo lại.
