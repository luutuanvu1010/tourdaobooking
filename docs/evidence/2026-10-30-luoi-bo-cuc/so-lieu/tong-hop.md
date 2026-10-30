# Tổng hợp số đo lưới bố cục — sinh tự động từ so-lieu/luoi.json (2026-10-29T18:04:47.962Z)

## 1. Theo khuôn trang

| Khuôn | Số trang | Bề rộng khối nội dung 1040 (px) | 1440 (px) | Trần max-width đang chặn (1040 / 1440) | (b) hàng >240 px ở 1040 · trang có | (b) ở 1440 | (c) ô lệch độ dài · dòng ô bỏ trống phải >240 (1040) | (d) vùng trống (1040) | (e) 390: trang tràn · hàng nút lộn xộn | (f) trang có tiêu đề lớn trong thân · trùng chữ thanh trên (1040) |
|---|---|---|---|---|---|---|---|---|---|---|
| bảng điều khiển | 8 | 744, 760 | 1144, 1160 | — / — | 7 · 3 | 14 | 0 · 1 | 4 | 0 · 2 | 7 · 6 |
| danh sách | 12 | 760 | 1160 | 420px --w-narrow=--w-ntf-panel / 420px --w-narrow=--w-ntf-panel | 35 · 5 | 40 | 1 · 1 | 1 | 1 · 0 | 12 · 11 |
| chi tiết | 4 | 760 | 1160 | — / — | 11 · 3 | 28 | 0 · 0 | 2 | 0 · 2 | 2 · 2 |
| biểu mẫu | 6 | 760 | 1088, 1160 | 640px --w-confirm=--w-vc-form=--w-sheet-hk / 1120px --w-form; 640px --w-confirm=--w-vc-form=--w-sheet-hk | 1 · 1 | 45 | 1 · 2 | 1 | 0 · 0 | 6 · 6 |
| thiết lập | 15 | 760 | 1160 | — / 900px --w-thiet-lap-max | 59 · 5 | 107 | 5 · 10 | 0 | 0 · 1 | 15 · 14 |

Ghi: bề rộng khối nội dung là khối cấp một lớn nhất trong `main` (bỏ tiêu đề, dải anh em, đoạn chú thích, thông báo). «Trần đang chặn» là phần tử có max-width px mà bề rộng thật bằng đúng trần ở khổ đó (±2 px); «—» nghĩa là ở khổ đó không trần nào chặn, nội dung rộng theo cột.

## 2. Từng trang (1040 / 1440)

| Trang | Khuôn | Bộ | main 1040 · 1440 | khối lớn nhất 1040 · 1440 | trần chặn 1440 | mực phải còn trống 1440 | b 1040 (lớn nhất px) | b 1440 | b >160 (1040) | c lệch · dòng trống phải | d | e tràn 390 · nút | f tiêu đề thân | f trùng | cắt 6 màn |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | bảng điều khiển | SUPER_ADMIN | 792 · 1192 | 744 · 1144 | — | 32 | 4 (512) | 3 (755) | 4 | 0 · 0 | 1 | không · 0 | không | — |  |
| `/orders` | danh sách | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 33 | 30 (451) | 30 (851) | 30 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/order` | chi tiết | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 32 | 2 (312) | 12 (712) | 10 | 0 · 0 | 2 | không · 0 | không | — |  |
| `/order-form` | biểu mẫu | SUPER_ADMIN | 792 · 1120 | 760 · 1088 | 1120px --w-form | 88 | 0 (224) | 44 (451) | 4 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/parties` | danh sách | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 32 | 0 (0) | 0 (0) | 0 | 0 · 0 | 1 | không · 0 | có | trùng |  |
| `/catalog` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 16 | 0 (177) | 14 (577) | 7 | 0 · 0 | 0 | không · 0 | có | — | có |
| `/staff` | danh sách | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 32 | 0 (179) | 1 (379) | 1 | 0 · 1 | 0 | không · 0 | có | trùng |  |
| `/sessions` | danh sách | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 16 | 0 (0) | 0 (0) | 0 | 0 · 0 | 0 | không · 0 | có | trùng | có |
| `/locations` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 32 | 0 (0) | 0 (0) | 0 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/loai-giay-to-nguoi` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 30 | 0 (0) | 0 (0) | 0 | 0 · 2 | 0 | không · 0 | có | trùng |  |
| `/dieu-phoi` | bảng điều khiển | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 33 | 0 (0) | 2 (465) | 0 | 0 · 0 | 1 | không · 0 | có | trùng |  |
| `/chuyen` | chi tiết | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 16 | 6 (564) | 10 (668) | 9 | 0 · 0 | 0 | không · 1 | có | trùng |  |
| `/chuyen-sua` | biểu mẫu | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 62 | 0 (0) | 0 (0) | 0 | 0 · 1 | 1 | không · 0 | có | trùng |  |
| `/xe-dang-chay` | danh sách | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 16 | 1 (557) | 1 (957) | 1 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/de-nghi` | danh sách | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 16 | 0 (0) | 0 (0) | 0 | 1 · 0 | 0 | không · 0 | có | trùng |  |
| `/bang-gia-xe` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 16 | 1 (337) | 1 (737) | 1 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/bang-ke-xe` | bảng điều khiển | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 32 | 2 (487) | 5 (887) | 2 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/xe` | danh sách | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | 420px --w-narrow=--w-ntf-panel | 33 | 1 (614) | 1 (1014) | 1 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/xe-sua` | biểu mẫu | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | 640px --w-confirm=--w-vc-form=--w-sheet-hk | 561 | 0 (0) | 0 (0) | 0 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/xe-chi-tiet` | chi tiết | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 33 | 0 (156) | 3 (494) | 0 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/lich-xe-ban` | bảng điều khiển | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 16 | 0 (189) | 1 (589) | 1 | 0 · 0 | 0 | không · 1 | có | trùng |  |
| `/giay-to-sap-het-han` | danh sách | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 115 | 0 (0) | 2 (321) | 0 | 0 · 0 | 0 | không · 0 | có | — |  |
| `/loai-giay-to-xe` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 74 | 0 (0) | 0 (0) | 0 | 0 · 1 | 0 | không · 0 | có | trùng |  |
| `/chinh-sach-dieu-phoi` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 33 | 0 (181) | 2 (581) | 1 | 0 · 2 | 0 | không · 0 | có | trùng |  |
| `/dieu-kien-xuat-ben` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 33 | 10 (484) | 10 (884) | 10 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/ly-do-dieu-phoi` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 33 | 44 (582) | 44 (982) | 44 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/khoa-thang` | bảng điều khiển | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 41 | 0 (0) | 0 (0) | 0 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/so-cong-no` | bảng điều khiển | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 194 | 0 (141) | 1 (274) | 0 | 0 · 1 | 1 | không · 1 | có | trùng |  |
| `/dieu-chinh-cong-no` | biểu mẫu | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 32 | 0 (0) | 0 (0) | 0 | 1 · 1 | 0 | không · 0 | có | trùng |  |
| `/hoa-hong` | bảng điều khiển | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 16 | 1 (419) | 1 (819) | 1 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/nguoi-ban` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 32 | 0 (0) | 0 (0) | 0 | 0 · 2 | 0 | không · 0 | có | trùng |  |
| `/chup-bu` | biểu mẫu | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 62 | 0 (0) | 0 (0) | 0 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/cho-xac-nhan` | danh sách | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 41 | 2 (497) | 2 (897) | 2 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/audit` | danh sách | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 16 | 0 (0) | 0 (0) | 0 | 0 · 0 | 0 | CÓ · 0 | có | trùng |  |
| `/gui-thong-bao` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 49 | 0 (0) | 0 (0) | 0 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/tro-ly-cai-dat` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 32 | 0 (0) | 0 (0) | 0 | 3 · 2 | 0 | không · 0 | có | trùng |  |
| `/giao-dien` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 43 | 3 (271) | 25 (671) | 9 | 0 · 0 | 0 | không · 1 | có | trùng |  |
| `/account` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 32 | 1 (292) | 11 (492) | 8 | 2 · 1 | 0 | không · 0 | có | trùng | có |
| `/feedback` | danh sách | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 16 | 1 (536) | 1 (936) | 1 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/help` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | — | 33 | 0 (0) | 0 (0) | 0 | 0 · 0 | 0 | không · 0 | có | trùng | có |
| `/thiet-lap` | thiết lập | SUPER_ADMIN | 792 · 1192 | 760 · 1160 | 900px --w-thiet-lap-max | 995 | 0 (0) | 0 (0) | 0 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/tai-xe` | bảng điều khiển | DRIVER | 792 · 1192 | 760 · 1160 | — | 33 | 0 (0) | 1 (250) | 0 | 0 · 0 | 1 | không · 0 | có | — |  |
| `/cuoc` | danh sách | DRIVER | 792 · 1192 | 760 · 1160 | — | 41 | 0 (144) | 2 (344) | 0 | 0 · 0 | 0 | không · 0 | có | trùng |  |
| `/cuoc-chuyen` | chi tiết | DRIVER | 792 · 1192 | 760 · 1160 | — | 16 | 3 (478) | 3 (878) | 3 | 0 · 0 | 0 | không · 1 | không | — |  |
| `/ban` | biểu mẫu | DRIVER_PARTNER | 792 · 1192 | 760 · 1160 | — | 33 | 1 (559) | 1 (959) | 1 | 0 · 0 | 0 | không · 0 | có | trùng |  |

## 3. Ví dụ tệ nhất

### (b) Hàng «chữ một đầu, nút/số một đầu» ở 1040 (mỗi trang một ví dụ, khoảng trống giữa hai cụm mực)

- `/xe` 614 px — `main#noi-dung-chinh > div.vc-page-head` (flex, justify-content space-between) — «Xe» … «Thêm xe»
- `/ly-do-dieu-phoi` 582 px — `main#noi-dung-chinh > div#ld-nhom > section.vc-card.dp-group > div.dp-reason` (flex, justify-content normal) — «Ốm» … «Sửa»
- `/chuyen` 564 px — `div.dp-ct-layout > div.dp-ct-main > section.dp-run-list > div.dp-card-head.dp-run-list-head` (flex, justify-content normal) — «Điểm dừng» … «Tải hiện tại 2/16»
- `/ban` 559 px — `main#noi-dung-chinh > div#bb-trang.bb-trang > section.bb-ds > div.vc-card.bb-khung` (grid, justify-content normal) — «Ốm» … «Rút khung bận»
- `/xe-dang-chay` 557 px — `main#noi-dung-chinh > div#xdc-trang > div.xdc-head` (flex, justify-content normal) — «Xe đang chạy» … «0 xe»
- `/feedback` 536 px — `main#noi-dung-chinh > div.ht-dau` (flex, justify-content space-between) — «Hỗ trợ» … «＋ Gửi yêu cầu»
- `/` 512 px — `main#noi-dung-chinh > div#dash-grid.dash-grid > section#dash-today.card.dash-today > div.dash-today-head` (flex, justify-content normal) — «1» … «Xem tất cả»
- `/cho-xac-nhan` 497 px — `section#cx-noi-dung > ul#cx-danh-sach.cx-ds > li.cx-the > div.cx-the-dau` (flex, justify-content space-between) — «TD-20261027-0015» … «Quá hạn»
- `/bang-ke-xe` 487 px — `div#bk-trang > div.bk-ket-qua > section.vc-card.bk-nhom > div.bk-nhom-dau` (flex, justify-content normal) — «Nhà xe Hải Âu Thử 2 chuyến» … «TỔNG NHÓM 900.000 ₫»
- `/dieu-kien-xuat-ben` 484 px — `main#noi-dung-chinh > section#dk-hang-bang.vc-card.dp-group > div.dp-reason` (flex, justify-content normal) — «Hạng B Tối đa 8 khách · áp từ 01/09/2026» … «Đổi»

### (b) cùng phép đo ở 1440

- `/xe` 1014 px — `main#noi-dung-chinh > div.vc-page-head` — «Xe» … «Thêm xe»
- `/ly-do-dieu-phoi` 982 px — `main#noi-dung-chinh > div#ld-nhom > section.vc-card.dp-group > div.dp-reason` — «Ốm» … «Sửa»
- `/ban` 959 px — `main#noi-dung-chinh > div#bb-trang.bb-trang > section.bb-ds > div.vc-card.bb-khung` — «Ốm» … «Rút khung bận»
- `/xe-dang-chay` 957 px — `main#noi-dung-chinh > div#xdc-trang > div.xdc-head` — «Xe đang chạy» … «0 xe»
- `/feedback` 936 px — `main#noi-dung-chinh > div.ht-dau` — «Hỗ trợ» … «＋ Gửi yêu cầu»
- `/cho-xac-nhan` 897 px — `section#cx-noi-dung > ul#cx-danh-sach.cx-ds > li.cx-the > div.cx-the-dau` — «TD-20261027-0015» … «Quá hạn»
- `/bang-ke-xe` 887 px — `div#bk-trang > div.bk-ket-qua > section.vc-card.bk-nhom > div.bk-nhom-dau` — «Nhà xe Hải Âu Thử 2 chuyến» … «TỔNG NHÓM 900.000 ₫»
- `/dieu-kien-xuat-ben` 884 px — `main#noi-dung-chinh > section#dk-hang-bang.vc-card.dp-group > div.dp-reason` — «Hạng B Tối đa 8 khách · áp từ 01/09/2026» … «Đổi»
- `/cuoc-chuyen` 878 px — `section.dp-cc-khoi > div.dp-run-list.dp-cc-ke-tiep > section.vc-card.dp-run.is-sau > div.dp-run-lien-he` — «Liên hệ: Hồ Văn Sơn» … «0912000212»
- `/orders` 851 px — `div.order-card > div.order-card-head > a.order-row > div.order-row-top` — «Võ Đức Anh» … «Đã huỷ»

### (c) Ô nhập lệch độ dài dữ liệu (1040)

- `/de-nghi` ngay rộng 760 px — «Ngày chạy | dn-ngay» `input#dn-ngay.vc-input`
- `/dieu-chinh-cong-no` so rộng 728 px — «Số tiền (₫) | dc-so-tien» `input#dc-so-tien`
- `/tro-ly-cai-dat` so rộng 728 px — «Trần chi phí mỗi tháng (USD) | tl-tran-thang» `input#tl-tran-thang`
- `/tro-ly-cai-dat` so rộng 728 px — «Số câu mỗi người mỗi ngày | tl-tran-ngay» `input#tl-tran-ngay`
- `/tro-ly-cai-dat` so rộng 728 px — «Số token trả lời tối đa (800–4000) | tl-token-ra» `input#tl-token-ra`
- `/account` so rộng 728 px — «hs-cs-han-xoa» `input#hs-cs-han-xoa`
- `/account` so rộng 728 px — «hs-cs-han-phien» `input#hs-cs-han-phien`

### (c) Dòng ô nhập ngắn, phần phải khung trống > 240 px (1040)

- `/loai-giay-to-nguoi` trống phải 646 px / khung 728 px — `main#noi-dung-chinh > section#dm-hang.dm-khoi > div.card > div.grid.three.dm-them (một dòng lưới)` — ô:  82
- `/chinh-sach-dieu-phoi` trống phải 602 px / khung 726 px — `main#noi-dung-chinh > section#hm-the.vc-card.hm-card > form.hm-form (một dòng lưới)` — ô:  124
- `/tro-ly-cai-dat` trống phải 600 px / khung 728 px — `main#noi-dung-chinh > div#tl-trang.tl-trang > section#tl-ngu-canh.card > form.tl-cd-form (một dòng lưới)` — ô:  128
- `/dieu-chinh-cong-no` trống phải 514 px / khung 728 px — `main#noi-dung-chinh > div#dc-noi-dung > section#dc-khoi-gui.card > form#dc-form.dc-form (một dòng lưới)` — ô: dc-gui-btn 214
- `/so-cong-no` trống phải 438 px / khung 760 px — `main#noi-dung-chinh.scn-main > div#scn-noi-dung > div.scn-khung (một dòng lưới)` — ô: Tìm theo tên bên 306
- `/account` trống phải 416 px / khung 760 px — `main#noi-dung-chinh > div.account-layout (một dòng lưới)` — ô: my-sessions-logout 98
- `/tro-ly-cai-dat` trống phải 399 px / khung 728 px — `div#tl-trang.tl-trang > section#tl-bo-nao.card > div.tl-cd-form > form.tl-cd-form (một dòng lưới)` — ô:  126
- `/nguoi-ban` trống phải 370 px / khung 728 px — `main#noi-dung-chinh > div#nb-noi-dung > section#dk-add-card.card > form#dk-add-form (một dòng lưới)` — ô: Người bán Tour Đảo (công 358
- `/nguoi-ban` trống phải 370 px / khung 728 px — `div#nb-noi-dung > section#dk-add-card.card > form#dk-add-form > div.grid.two (một dòng lưới)` — ô: Người bán Tour Đảo (công 358
- `/chuyen-sua` trống phải 293 px / khung 760 px — `main#noi-dung-chinh > div#cx-layout.dp-cx-layout (một dòng lưới)` — ô: Xe 450
- `/chinh-sach-dieu-phoi` trống phải 293 px / khung 760 px — `main#noi-dung-chinh > div#cs-layout.dp-cs-layout (một dòng lưới)` — ô: Hạn chốt trước giờ đón ( 219
- `/staff` trống phải 247 px / khung 728 px — `main#noi-dung-chinh > section#add-card.card > form#add-form.grid.three (một dòng lưới)` — ô: Họ tên 235; Số điện thoại (tên đăng  235
- `/loai-giay-to-nguoi` trống phải 247 px / khung 728 px — `main#noi-dung-chinh > section#dm-nguoi.dm-khoi > div.card > div.grid.three.dm-them (một dòng lưới)` — ô: Mã (chữ HOA, số, gạch dư 235; Tên 235
- `/loai-giay-to-xe` trống phải 247 px / khung 728 px — `main#noi-dung-chinh > section#dm-xe.dm-khoi > div.card > div.grid.three.dm-them (một dòng lưới)` — ô: Mã (chữ HOA, số, gạch dư 235; Tên 235

### (d) Vùng trống chiếm chỗ (1040)

- `/tai-xe` 421 px (53% main) × cao hàng 146 px, 1 phần tử nội dung — `main#noi-dung-chinh > div.vc-tx-grid > section#tx-cuoc.vc-cuoc` — «Xem cuốc của tôi — hôm nay và ngày mai»
- `/so-cong-no` 406 px (51% main) × cao hàng 356 px, 1 phần tử nội dung — `main#noi-dung-chinh.scn-main > div#scn-noi-dung > div.scn-khung > section#scn-ct-khu.card.scn-ct-khu` — «Chọn một bên ở danh sách để xem từng đơn.»
- `/chuyen-sua` 260 px (33% main) × cao hàng 497 px, 2 phần tử nội dung — `main#noi-dung-chinh > div#cx-layout.dp-cx-layout > section#cx-ngay.vc-card.dp-hist.dp-cx-day` — «Xe trong ngày Chọn xe để xem các chuyến trong ngày.»
- `/order` 234 px (30% main) × cao hàng 115 px, 1 phần tử nội dung — `article.svc.svc-view > div.svc-lines > div.line-view > div.line-name` — «Tour lái xe địa hình ATV trong rừng Hòn Bà (90 phút) — Trẻ em Trẻ em dưới 16 tuổ»
- `/parties` 219 px (30% main) × cao hàng 1271 px, 12 phần tử nội dung — `table.items cột «Công việc hôm nay»` — «12/30 ô có chữ»
- `/order` 218 px (28% main) × cao hàng 339 px, 2 phần tử nội dung — `main#noi-dung-chinh > div#order > div.order-summary-band > div` — «MÃ ĐƠN TD-20261027-0003 Đã xác nhận»
- `/dieu-phoi` 188 px (24% main) × cao hàng 736 px, 4 phần tử nội dung — `main#noi-dung-chinh.dp-board > div#dp-trang > div.dp-cols > section#dp-cot-chua-xep.vc-card.dp-col.dp-col-chua-xep` — «Chưa xếp 0 0 khách chưa xếp · chưa có chuyến nào để xếp Không còn lượt đưa đón n»
- `/` 179 px (23% main) × cao hàng 100 px, 1 phần tử nội dung — `div#dash-grid.dash-grid > section#dash-loi-tat.card.dash-loi-tat > nav#dash-loi-tat-luoi.dash-loi-tat-luoi > a.dash-o-muc` — «Đơn hàng»

### (e) 390: tràn ngang và hàng nút lộn xộn

- `/chuyen` — 1 hàng nút: `div.dp-viec-vp-nut` 4 nút/3 dòng cao [44,44,44,44] (Thêm điểm đón / th | Cập nhật điểm theo | Gửi đề nghị cứu hộ | Cứu hộ)
- `/lich-xe-ban` — 1 hàng nút: `div#xb-nav.xb-nav` 4 nút/2 dòng cao [44,44,44,44] (‹ | Tuần này | › | Thêm lịch bận)
- `/so-cong-no` — 1 hàng nút: `div#scn-loc.scn-loc` 3 nút/2 dòng cao [44,44,44] (Tất cả (2) | Đang giữ (2) | Công ty nợ (0))
- `/audit` TRÀN (scrollWidth 549): `main#noi-dung-chinh > div.toolbar > select#action` tới 549
- `/giao-dien` — 1 hàng nút: `div.gd-xem-nut` 4 nút/2 dòng cao [46,46,46,46] (Lưu | Nút phụ | Nút viền | Xác nhận đơn)
- `/cuoc-chuyen` — 1 hàng nút: `div.dp-run-end.thanh-hanh-dong-cuoi` 3 nút/3 dòng cao [52,52,44] (Kết thúc chuyến | Chuyển khách sang  | Kết thúc gián đoạn)

### (f) Tiêu đề lớn trong thân (1040)

- `/orders` thanh trên «Đơn hàng» — thân: «Đơn hàng» 24px/600 — TRÙNG
- `/order-form` thanh trên «Tạo đơn» — thân: «Tạo đơn» 24px/600 — TRÙNG
- `/parties` thanh trên «Danh bạ» — thân: «Danh bạ» 24px/600 — TRÙNG
- `/catalog` thanh trên «Dịch vụ» — thân: «Danh mục dịch vụ & giá» 24px/600
- `/staff` thanh trên «Quản lý tài khoản» — thân: «Quản lý tài khoản» 24px/600 — TRÙNG
- `/sessions` thanh trên «Máy đang đăng nhập» — thân: «Máy đang đăng nhập» 24px/600 — TRÙNG
- `/locations` thanh trên «Địa điểm» — thân: «Địa điểm» 24px/600 — TRÙNG
- `/loai-giay-to-nguoi` thanh trên «Loại giấy tờ cá nhân» — thân: «Loại giấy tờ cá nhân» 24px/600 — TRÙNG
- `/dieu-phoi` thanh trên «Vận chuyển › Điều phối xe» — thân: «Điều phối xe» 24px/600 — TRÙNG
- `/chuyen` thanh trên «Vận chuyển › Điều phối xe › CX-2710-03» — thân: «CX-2710-03» 26px/600 — TRÙNG
- `/chuyen-sua` thanh trên «Vận chuyển › Điều phối xe › Chuyến mới» — thân: «Chuyến mới · 30/10» 26px/600 — TRÙNG
- `/xe-dang-chay` thanh trên «Vận chuyển › Xe đang chạy» — thân: «Xe đang chạy» 26px/600 — TRÙNG
- `/de-nghi` thanh trên «Vận chuyển › Đề nghị chuyển khách» — thân: «Đề nghị chuyển khách» 26px/600 — TRÙNG
- `/bang-gia-xe` thanh trên «Vận chuyển › Bảng giá thuê xe» — thân: «Bảng giá thuê xe» 24px/600 — TRÙNG
- `/bang-ke-xe` thanh trên «Vận chuyển › Bảng kê chi phí xe» — thân: «Bảng kê chi phí xe thuê» 24px/600 — TRÙNG
- `/xe` thanh trên «Vận chuyển › Xe» — thân: «Xe» 26px/600 — TRÙNG
- `/xe-sua` thanh trên «Vận chuyển › Xe › Thêm xe» — thân: «Thêm xe» 26px/600 — TRÙNG
- `/xe-chi-tiet` thanh trên «Vận chuyển › Xe › 79B-234.56» — thân: «79B-234.56» 28px/600 — TRÙNG
- `/lich-xe-ban` thanh trên «Vận chuyển › Lịch xe bận» — thân: «Lịch xe bận» 24px/600 — TRÙNG
- `/giay-to-sap-het-han` thanh trên «Vận chuyển › Sắp hết hạn» — thân: «Giấy tờ sắp hết hạn» 26px/600
- `/loai-giay-to-xe` thanh trên «Vận chuyển › Loại giấy tờ xe» — thân: «Loại giấy tờ xe» 24px/600 — TRÙNG
- `/chinh-sach-dieu-phoi` thanh trên «Vận chuyển › Chính sách điều phối» — thân: «Chính sách điều phối» 26px/600 — TRÙNG
- `/dieu-kien-xuat-ben` thanh trên «Vận chuyển › Chính sách điều phối › Điều kiện cho xe chạy» — thân: «Điều kiện cho xe chạy» 26px/600 — TRÙNG
- `/ly-do-dieu-phoi` thanh trên «Vận chuyển › Lý do điều phối» — thân: «Lý do điều phối» 26px/600 — TRÙNG
- `/khoa-thang` thanh trên «Khoá sổ tháng» — thân: «Khoá sổ tháng» 24px/600 — TRÙNG
- `/so-cong-no` thanh trên «Sổ công nợ» — thân: «Sổ công nợ» 24px/600 — TRÙNG
- `/dieu-chinh-cong-no` thanh trên «Điều chỉnh công nợ» — thân: «Điều chỉnh công nợ» 24px/600 — TRÙNG
- `/hoa-hong` thanh trên «Hoa hồng đối tác» — thân: «Hoa hồng đối tác» 24px/600 — TRÙNG
- `/nguoi-ban` thanh trên «Người bán dịch vụ» — thân: «Người bán dịch vụ» 24px/600 — TRÙNG
- `/chup-bu` thanh trên «Chụp bù mức» — thân: «Chụp bù mức» 24px/600 — TRÙNG
- `/cho-xac-nhan` thanh trên «Đơn chờ xác nhận» — thân: «Đơn chờ xác nhận» 24px/600 — TRÙNG
- `/audit` thanh trên «Nhật ký» — thân: «Nhật ký hệ thống» 24px/600 — TRÙNG
- `/gui-thong-bao` thanh trên «Gửi thông báo» — thân: «Gửi thông báo» 24px/600 — TRÙNG
- `/tro-ly-cai-dat` thanh trên «Trợ lý Hỗ trợ» — thân: «Trợ lý Hỗ trợ» 24px/600 — TRÙNG
- `/giao-dien` thanh trên «Giao diện» — thân: «Giao diện» 24px/600 — TRÙNG
- `/account` thanh trên «Tôi» — thân: «Tôi» 24px/600 — TRÙNG
- `/feedback` thanh trên «Hỗ trợ» — thân: «Hỗ trợ» 24px/600 — TRÙNG
- `/help` thanh trên «Hướng dẫn» — thân: «Hướng dẫn» 24px/600 — TRÙNG
- `/thiet-lap` thanh trên «Thiết lập» — thân: «Thiết lập» 24px/600 — TRÙNG
- `/tai-xe` thanh trên «Trang chủ» — thân: «Chào Thử» 26px/600
- `/cuoc` thanh trên «Cuốc của tôi» — thân: «Cuốc của tôi» 26px/600, «Hôm nay» 20px/600, «Ngày mai» 20px/600 — TRÙNG
- `/ban` thanh trên «Báo bận của tôi» — thân: «Báo bận của tôi» 26px/600 — TRÙNG

## 4. Ô không đo được

Không có ô lỗi.
