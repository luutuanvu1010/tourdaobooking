# Phụ lục phát hiện — đánh giá UX tổng thể 27/10/2026

Hồ sơ có ngày (`PROMPT.md` mục 6.4, 6.5 sản phẩm số 2). Mỗi phát hiện: **mã** (H- = hệ thống: sửa một lần ở khung, token hay thành phần chung là hết ở mọi trang; C- = cục bộ: một trang) · **mức** (Chặn / Nặng / Vừa / Nhẹ) · trang · bộ quyền · khổ · bước tái hiện · bằng chứng (ảnh `~/tourdao-ux-2026-10-27-v2/anh/…` hoặc số liệu `docs/evidence/2026-10-27-danh-gia-ux-tong-the/so-lieu/…`, số dòng `app.css` trong `SO-LECH-TU-MA.md`) · **mặt** vi phạm (1–11, PROMPT mục 4) · **tiêu chí** phục vụ (1 Nhanh và mượt, 2 Dễ nhìn, 3 Gọn mắt, 4 Đúng phong cách quản trị, 5 Đơn giản). Xếp theo mức rồi phạm vi. Mã được `HE-THONG-HOP-NHAT.md`, `LO-TRINH.md`, `BAO-CAO.md` trỏ tới.

Nguồn: (a) kiểm kê từ mã (`SO-LECH-TU-MA.md`, cỡ gói đo bằng `wc -c`/`gzip`), (b) quét màn hình 45 trang × 10 bộ × 390/1040 (+768/1440) ở ba trạng thái (`so-lieu/nhieu.json`, `it.json`, `rong.json`; tổng hợp `so-lieu/tong-hop.md`), (c) hành trình thật (`so-lieu/hanh-trinh-390.json`, `-1040.json`), (d) đo tốc độ (`so-lieu/toc-do.json`), (e) gieo dữ liệu qua API (`kich-ban/nhat-ky-gieo-*.json`).

## A. Mức CHẶN (không làm xong việc, hoặc dễ nhập sai tiền / sai khách)

| Mã | Phạm vi | Trang · bộ · khổ | Phát hiện và bước tái hiện | Bằng chứng | Mặt | Tiêu chí |
|---|---|---|---|---|---|---|
| H-CAU-LOI | Hệ thống | Tạo đơn, Chi tiết đơn · Bán hàng, Toàn quyền · cả hai | Câu lỗi máy chủ không nói lý do thật nên người dùng không biết sửa gì: xác nhận một đơn có ngày đi **đã qua** trả 409 `incomplete_trip` với câu "Chưa đủ thông tin chuyến để xác nhận đơn." (thông tin chuyến đã đủ; lý do thật là ngày đã qua); gán vai "Công ty lữ hành" cho hồ sơ **tổ chức** trả 409 `role_via_account` với câu dẫn sang màn Quản lý tài khoản (sai đường: hồ sơ tổ chức không có tài khoản). Nguồn câu: `src/shared/order-errors.ts`. | `kich-ban/nhat-ky-gieo-nhieu.json` (4 lệnh bị từ chối), `nhat-ky-gieo-it.json` (1) | 6 | 5 |
| (điền từ quét/hành trình) | | | | | | |

## B. Mức NẶNG (việc hằng ngày tốn công rõ rệt hoặc gây hiểu nhầm)

| Mã | Phạm vi | Trang · bộ · khổ | Phát hiện và bước tái hiện | Bằng chứng | Mặt | Tiêu chí |
|---|---|---|---|---|---|---|
| H-GOI | Hệ thống | mọi trang · mọi bộ · cả hai | **Khung chung đóng lặp vào từng gói trang**: trang nhẹ nhất (`cho-xac-nhan.js`) 77.239 byte thô / 24.763 nén, nặng nhất `help.js` 364.888 / 84.577, `order.js` 320.571 / 98.590, `order-form.js` 200.141 / 64.678; tổng 45 gói ≈ 5,1 MB thô; mỗi gói chứa cùng `shell.ts`, `api.ts`, `dom.ts`, biểu tượng. `app.css` 426.455 / 90.154 nén nạp ở cả 47 trang cùng `giao-dien.css`. Service worker nạp sẵn **toàn bộ** 47 HTML + 45 JS + CSS + 5 phông + icon = 102 mục ≈ 1,9 MB nén ngay lần mở đầu (`PRECACHE`, `src/shared/sw-policy.ts:26`). Không trang nào có `preload`/`modulepreload`/`prefetch`/Speculation Rules; `app.css` không có View Transitions. Gói `orders.js` 96.683 byte **vượt trần 96.000** của ràng buộc (PROMPT mục 5) 683 byte. | bảng cỡ gói ở `KIEM-KE.md` mục E; `public/*.html` (grep); số đo thật H-TOC-DO | 11 | 1 |
| H-NUT | Hệ thống | mọi trang · mọi bộ · cả hai | **≈ 48 kiểu nút** khác hình: 6 họ `.btn`, 3 pill, 4 viên thuốc chọn, 9 `.vc-btn`, 18 nút riêng, 8 kiểu tab; cùng hình "viền primary nền trắng" dưới ≥ 4 tên (`.btn` :591, `.vc-btn-line` :2325, `.ntf-strip button` :2224, `#order-form .pill-btn` :1497); `.btn` gốc không khai chiều cao nên 21 khối tự vá `min-height: 44`; chiều cao gặp ≈46/44/48/52/40, bo góc 6/8/12/999; nút đỏ đặc chỉ có ở Vận chuyển. Trên màn hình: số chữ ký nút đo được ở `tong-hop.md` E.Nút. | `SO-LECH-TU-MA.md` §1; `so-lieu/tong-hop.json` soLech | 7 | 3, 4 |
| H-CHIP | Hệ thống | mọi trang có trạng thái · cả hai | **7 họ huy hiệu** (`.badge` 12,8px bo 999; `.chip` 12; `.hdv-chip` 14 bo 12; `.ht-chip` cao 44 bấm được; `.vc-chip` viền; `.dp-chip-*` 6 tông; `.ntf-chip`): cùng ý "chờ / cảnh báo" có 10 khai báo ≥ 6 hình, "xong" 10 khai báo; không huy hiệu nào có biểu tượng (chỉ dựa màu); `.badge-draft` (cát) bị mượn cho ≈ 12 ý nghĩa khác ("Máy này", "Chưa bật", "Ghi chú nội bộ", "Bị khoá đăng nhập"…). Nhãn trạng thái **đơn** thống nhất tốt (một nguồn `order-status-label.ts`). Cùng chữ khác hình đo trên màn hình: `tong-hop.md` E.Huy hiệu cùng chữ khác hình. | `SO-LECH-TU-MA.md` §4 | 5 | 2, 5 |
| H-HOP-THOAI | Hệ thống | 31 + 7 + 8 tệp · cả hai | **5 cách dựng hộp thoại**: khuôn chung `moBangTruot` (31 tệp), 7 tệp chép tay cùng lớp `.sheet-root` (Việc của tôi, người phụ trách, đổi khách, sửa chuyến, xác nhận đơn, thông báo), ngăn toàn màn `.ntf-panel`, khung nổi `.tl-khung`, và **17 lần `window.confirm()` của hệ điều hành** ở 8 tệp (staff 6, catalog 3, account 2…): hộp xác nhận hành động một chiều không theo thiết kế, không nói hậu quả. Chân bảng trượt 4 kiểu nút. | `SO-LECH-TU-MA.md` §6 | 6 | 4, 5 |
| H-THONG-BAO | Hệ thống | mọi trang · cả hai | Thông báo không có kiểu chung: `.alert` và `.banner` cùng hình khác tên; `.vc-alert` nhỏ hơn; 3 dải trên trang cùng hình (`.ntf-strip`, `.maint-strip`, `.mfa-strip`); báo "Đã lưu" có **≥ 9 cơ chế** (dải ok, ô lỗi dùng để báo thành công ở Chính sách điều phối, textContent, banner info, toast…) → người dùng không học được một dấu hiệu "xong". | `SO-LECH-TU-MA.md` §7 | 6 | 5 |
| H-O-NHAP | Hệ thống | mọi biểu mẫu · cả hai | Ô nhập **2 cỡ chữ (16/17)**, **3 chiều cao (≈46/44/52)**, 2 token viền (`--c-input-border` vs `--c-border`), bo 8/12/999; nhãn ô 3 kiểu (13,6px xám mặc định :582; 14 bold đen ở Vận chuyển/Đăng nhập; nhãn nổi trong khung ở Tạo đơn — nhãn nổi lệch luật "nhãn luôn thấy" mặt 4); 7 lớp "lỗi dưới ô", 4 lớp "gợi ý"; 6 cách dựng ô tích/chọn. | `SO-LECH-TU-MA.md` §5; ô gõ < 16px đo thật: bảng B1 `tong-hop.md` | 4 | 5, 2 |
| H-THE | Hệ thống | mọi trang · cả hai | **≈ 14 kiểu thẻ**: nền dùng 3 token cùng trắng (`--c-bg`/`--c-surface`/`--c-card`), viền 4 cách (ring bóng; `--c-border` 83 lần; `--c-line` 4; `--c-input-border` 6), bo 8/12/18, bóng có/không không theo quy tắc (Trang chủ bo 18, phần còn lại 12, thẻ con 8). | `SO-LECH-TU-MA.md` §2 | 2, 3 | 3 |
| H-DONG | Hệ thống | mọi danh sách · cả hai | **≈ 25 lớp "dòng kẻ 1px"** (70 lần `--c-border`, 12 lần `--c-line`) cùng hình không có lớp chung; cụm tìm–lọc–sắp xếp–tải thêm chỉ Đơn hàng có đủ; mốc bảng → thẻ 900 chung nhưng Sổ công nợ 720/1024, Tạo đơn 959/960, Trang chủ 1200/1400. | `SO-LECH-TU-MA.md` §3 | 3, 8 | 3, 5 |
| H-DAU-TRANG | Hệ thống | mọi trang · cả hai | **≈ 12 kiểu đầu trang**; cỡ h1 gặp 6 giá trị (18/20/24/26/32) đo trên màn hình ở `tong-hop.md` E.Tiêu đề h1; màu h1 lúc primary lúc đen; 2 kiểu breadcrumb; đầu trang HDV dựng như một thẻ. Hành động chính không ở cùng chỗ giữa các trang. | `SO-LECH-TU-MA.md` §8 | 2 | 2, 4 |
| H-TOKEN | Hệ thống | `public/app.css` · — | Token **không có tầng thành phần**: 464 token, 92 là bí danh trỏ token khác, 201 chỉ dùng đúng 1 lần, 126 (27 %) là số đo riêng một màn (`--w-*` 92, `--h-*` 34), 36 giá trị có ≥ 3 token trùng (riêng trắng `#ffffff` 4 tên); 64 tiền tố lớp theo trang, cụm Vận chuyển–Điều phối chiếm 42 % luật CSS, thành phần chung ≈ 6 %. Hệ quả: mỗi đợt vẽ tự dựng lại thành phần (H-NUT, H-CHIP, H-THE…). Đã tốt: sau dòng 875 không còn px/hex cứng (0/0/0); 14 bậc cỡ chữ. | `SO-LECH-TU-MA.md` §11–12; `tmp dem-token` (ghi ở `KIEM-KE.md` mục F) | 7 | 3, 4 |
| H-DO-DAM | Hệ thống | mọi trang · cả hai | **Cả 5 token độ đậm (`--fw-medium/semibold/bold/heavy/heading`) cùng bằng 500** (`app.css:415–419`): tiêu đề, nhãn, nút, số lớn và thân chỉ khác nhau bằng cỡ chữ; Be Vietnam Pro có sẵn 400–800 nhưng không dùng. Nhìn "phẳng", khó quét mắt trong bảng dày. **Cần chủ quyết** (có thể là lựa chọn "Thị giác 1.70"). | `app.css:414–419`; ảnh bất kỳ trang danh sách 1040 | 7 | 2, 3 |
| H-TAI-RONG | Hệ thống | mọi trang · cả hai | "Đang tải" có 4 cách (khung xương thẻ đơn, 2 khung xương Trang chủ với 14 token riêng, vòng quay chỉ ở Đăng nhập, chữ "Đang tải…" ở 16 tệp); "rỗng" 20 lớp 3 hình, phần lớn chỉ một câu xám, không nút việc tiếp theo. Trang nào hiện màn trắng khi tải và trạng thái rỗng nói gì: bảng D `tong-hop.md`, số đo `khungXuong` ở `toc-do.json`. | `SO-LECH-TU-MA.md` §10 | 3, 11 | 1, 5 |
| H-DINH | Hệ thống | chi tiết, biểu mẫu, tài xế, Hỗ trợ · 390 | Thanh dính đáy **5 kiểu** nền/kẻ (`.form-actions`, `.vc-bottom-bar` đứng trên thanh tab, `.ht-tra-loi`, `.dp-nhieu`, `.sheet-foot`); z-index 13 giá trị rời (0…60). Vùng dính đo thật: `tong-hop.md` E.Vùng dính. | `SO-LECH-TU-MA.md` §9 | 2, 8 | 5 |
| H-TAB | Hệ thống | Hỗ trợ, Thông báo, Điều phối, Tài xế, Xe, Hoa hồng, Trang chủ · cả hai | **8 kiểu tab / phân đoạn** khác hình (gạch chân 3px, viên thuốc, khay, hộp 2 cột…). | `SO-LECH-TU-MA.md` §1 cuối | 1, 2 | 5 |
| (điền từ quét: H-CHAM-44, H-FOCUS, H-AXE, H-TRAN, H-CHU-ANH, H-403, H-404, H-MAT-MANG, H-DIEU-HUONG, H-HANH-TRINH, H-TOC-DO) | | | | | | |

## C. Mức VỪA (khó chịu, có đường vòng)

| Mã | Phạm vi | Trang · bộ · khổ | Phát hiện và bước tái hiện | Bằng chứng | Mặt | Tiêu chí |
|---|---|---|---|---|---|---|
| H-MOC | Hệ thống | — · cả hai | **7 mốc bề rộng** (640, 641, 720, 900, 960, 1024, 1200, 1400); một khối `(min-width: 640px)` lệch 1 px với cặp 640/641 (`app.css:589`): ở đúng 640px lưới đã chia 2–3 cột nhưng vẫn là khổ điện thoại. | `SO-LECH-TU-MA.md` §14 | 8 | 3 |
| H-NEN-CU | Hệ thống | mọi trang · cả hai | Lớp nền trước dòng 875 (`.btn`, `input`, `.badge`, `label`, `.kv`, `.btn-link`) còn 18 giá trị px và 3 hex cứng và 3 cỡ chữ rem lệch thang (12,8 / 13,6 / 14,4 px); mọi khối mới đè lên lớp này nên sửa ở đây kéo theo nhiều màn. | `SO-LECH-TU-MA.md` §13 | 7 | 3 |
| H-PHONG | Hệ thống | — · cả hai | Khai 18 `@font-face` cho 4 họ phông (Be Vietnam Pro 5 độ đậm, Nunito/Lexend/Noto Sans 4 độ đậm mỗi họ; 352 KB), nhưng độ đậm 600–800 không được token nào dùng (H-DO-DAM); service worker chỉ nạp sẵn Be Vietnam Pro, người chọn tông khác tải phông qua mạng mỗi lần mở lại khi cache phông bị dọn. | `public/fonts/`, `app.css:8–25`, `sw-policy.ts:29` | 11 | 1 |
| C-HUONG-DAN | Cục bộ | Hướng dẫn · mọi bộ · 390/1040 | Trang dài **65,7 màn ở 390** (39,6 màn ở 1040) vì chứa trọn nhật ký thay đổi mọi phiên bản; gói `help.js` nặng nhất (365 KB); kịch bản chụp cả trang treo ở đây. | `~/…/anh/nhieu/SALES/help-390.jpg`; `so-lieu/nhieu-SALES-tung-trang.json` | 3, 11 | 1, 3 |
| (điền từ quét) | | | | | | |

## D. Mức NHẸ (thẩm mỹ, chữ nghĩa)

| Mã | Phạm vi | Trang · bộ · khổ | Phát hiện và bước tái hiện | Bằng chứng | Mặt | Tiêu chí |
|---|---|---|---|---|---|---|
| H-LOP-CHET | Hệ thống | `app.css` · — | 28 lớp nghi không còn dùng (Góp ý cũ `.fb-status*`/`.fb-step*` :894–931; Hoa hồng trước PR 2 `.hh-loai*`/`.hh-mucta*` :3624–3643…); 3 token không dùng (`--fs-stat`, `--lh-28`, `--lh-32`). | `SO-LECH-TU-MA.md` §15 | 7 | 3 |
| (điền từ quét) | | | | | | |

## E. Ba màn mới nhất chấm theo cùng thang (Tạo đơn 18/10; Hoa hồng + Hỗ trợ 25/10; Sổ công nợ 25/10)

(điền sau quét: điểm tốt hơn phần còn lại đáng nhân rộng; điểm vẫn lệch)

## F. Hai câu hỏi xuyên suốt

(điền sau hành trình: người mới mở lần đầu có tự làm được việc chính không — Cộng tác viên, Tài xế đối tác; người làm cả ngày có tốn chạm, tốn cuộn thừa không — Bán hàng, Kế toán)
