# Bảng phủ — đánh giá lại giao diện 20/11/2026

> Hồ sơ có ngày. Sinh bằng `docs/evidence/2026-11-20-danh-gia-lai-giao-dien/kich-ban/lap-bang-phu.mjs` từ ma trận quyền (sinh từ mã), bảng màn, trạng thái chụp và bảng gộp phát hiện; không chép tay.
> Bản được chấm: mã giao diện của bản chính `31d4c0174`; ảnh chụp ở các lần lưu của nhánh đợt này, chỉ thêm tài liệu (`public`, `web`, `src` không đổi). Một màn = một bộ quyền với một trang, đủ hai khổ 390 và 1280. Tổng: 87 màn (trần 110, không phải cắt).

## 1. Từng trang trong `PAGES`

| Trang | Bộ quyền có lối vào (sinh từ mã) | Chấm với bộ quyền … / không chấm vì … |
|---|---|---|
| `/` | Bán hàng, Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng | chấm với Bán hàng (màn 1), Quản lý bán hàng (màn 2), Kế toán (màn 3), Quản trị (màn 4), Toàn quyền (màn 5) |
| `/404` | không bộ nào (mở bằng địa chỉ) | chấm với Bán hàng (màn 84) |
| `/account` | cả 11 bộ | chấm với Đối tác (màn 75), Bán hàng (màn 79) |
| `/audit` | Quản trị, Toàn quyền | chấm với Toàn quyền (màn 68) |
| `/ban` | Tài xế đối tác | chấm với Tài xế đối tác (màn 29) |
| `/bang-gia-xe` | Kế toán, Quản trị, Toàn quyền | chấm với Kế toán (màn 41) |
| `/bang-ke-xe` | Kế toán, Quản trị, Toàn quyền | chấm với Kế toán (màn 42) |
| `/cap-dai-ly` | Kế toán, Quản trị, Toàn quyền | chấm với Kế toán (màn 48) |
| `/catalog` | Quản trị, Toàn quyền, Quản lý bán hàng | chấm với Quản lý bán hàng (màn 56) |
| `/chinh-sach-dieu-phoi` | Quản trị, Toàn quyền | chấm với Quản trị (màn 62) |
| `/cho-xac-nhan` | Bán hàng, Quản trị, Toàn quyền, Quản lý bán hàng | chấm với Quản lý bán hàng (màn 23) |
| `/chup-bu` | Kế toán, Quản trị, Toàn quyền | chấm với Kế toán (màn 51) |
| `/chuyen` | Bán hàng, Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng | chấm với Quản trị (màn 32) |
| `/chuyen-sua` | Bán hàng, Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng | chấm với Quản trị (màn 33) |
| `/cuoc` | Tài xế công ty, Tài xế đối tác | chấm với Tài xế công ty (màn 9), Tài xế đối tác (màn 10) |
| `/cuoc-chuyen` | Tài xế công ty, Tài xế đối tác | chấm với Tài xế công ty (màn 26), Tài xế đối tác (màn 28) |
| `/dac-diem-dich-vu` | Bán hàng, Quản trị, Toàn quyền, Quản lý bán hàng | chấm với Quản trị (màn 65) |
| `/dang-ky` | không bộ nào (mở bằng địa chỉ) | chấm với người chưa đăng nhập (màn 78) |
| `/danh-muc-giay-to` | không bộ nào (mở bằng địa chỉ) | không chấm vì trang cũ, chỉ chuyển hướng sang Loại giấy tờ cá nhân |
| `/de-nghi` | Quản trị, Toàn quyền | chấm với Quản trị (màn 35) |
| `/dieu-chinh-cong-no` | Kế toán, Quản trị, Toàn quyền | chấm với Kế toán (màn 45) |
| `/dieu-kien-xuat-ben` | Quản trị, Toàn quyền | chấm với Quản trị (màn 63), Toàn quyền (màn 87) |
| `/dieu-phoi` | Bán hàng, Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng | chấm với Quản trị (màn 30), Bán hàng (màn 31) |
| `/feedback` | cả 11 bộ | chấm với Bán hàng (màn 81) |
| `/giao-dien` | Quản trị, Toàn quyền | chấm với Toàn quyền (màn 66) |
| `/giay-to-sap-het-han` | Quản trị, Toàn quyền | chấm với Quản trị (màn 40) |
| `/gui-thong-bao` | Quản trị, Toàn quyền | chấm với Toàn quyền (màn 69) |
| `/han-muc-tra-sau` | Kế toán, Quản trị, Toàn quyền | chấm với Kế toán (màn 49) |
| `/help` | cả 11 bộ | chấm với Bán hàng (màn 82) |
| `/hoa-hong` | Bán hàng, Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng | chấm với Kế toán (màn 47) |
| `/hoa-hong-gioi-han` | Quản trị, Toàn quyền | chấm với Toàn quyền (màn 52) |
| `/home` | không bộ nào (mở bằng địa chỉ) | không chấm vì trang cũ, chỉ chuyển hướng về Trang chủ «/» |
| `/huong-dan` | cả 11 bộ | chấm với Đối tác (màn 77), Bán hàng (màn 80) |
| `/khoa-thang` | Kế toán, Toàn quyền | chấm với Kế toán (màn 44) |
| `/lich-xe-ban` | Quản trị, Toàn quyền | chấm với Quản trị (màn 39) |
| `/loai-giay-to-nguoi` | Quản trị, Toàn quyền | chấm với Quản trị (màn 59) |
| `/loai-giay-to-xe` | Quản trị, Toàn quyền | chấm với Quản trị (màn 60) |
| `/locations` | Quản trị, Toàn quyền | chấm với Quản trị (màn 58) |
| `/login` | không bộ nào (mở bằng địa chỉ) | chấm với người chưa đăng nhập (màn 83) |
| `/luat-ban` | Bán hàng, Quản trị, Toàn quyền, Quản lý bán hàng | chấm với Quản trị (màn 64) |
| `/ly-do-dieu-phoi` | Quản trị, Toàn quyền | chấm với Quản trị (màn 61) |
| `/ngoai-mang` | không bộ nào (mở bằng địa chỉ) | chấm với Bán hàng (màn 85) |
| `/nguoi-ban` | Kế toán, Quản trị, Toàn quyền | chấm với Kế toán (màn 50) |
| `/order` | Bán hàng, Thực tập sinh, Kế toán, Quản trị, Hướng dẫn viên, Đối tác, Toàn quyền, Quản lý bán hàng | chấm với Bán hàng (màn 18), Đối tác (màn 19), Kế toán (màn 20), Hướng dẫn viên (màn 21), Quản trị (màn 22) |
| `/order-form` | Bán hàng, Thực tập sinh, Quản trị, Đối tác, Toàn quyền, Quản lý bán hàng | chấm với Bán hàng (màn 12), Đối tác (màn 13), Thực tập sinh (màn 14), Bán hàng (màn 15) |
| `/orders` | Bán hàng, Thực tập sinh, Kế toán, Quản trị, Hướng dẫn viên, Đối tác, Toàn quyền, Quản lý bán hàng | chấm với Thực tập sinh (màn 6), Hướng dẫn viên (màn 7), Đối tác (màn 8), Bán hàng (màn 16), Kế toán (màn 17) |
| `/parties` | Bán hàng, Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng | chấm với Bán hàng (màn 24) |
| `/phan-dinh` | Kế toán, Quản trị, Toàn quyền | chấm với Kế toán (màn 46) |
| `/phi-don` | Quản trị, Toàn quyền | chấm với Quản trị (màn 53) |
| `/phieu-dang-ky` | Quản trị, Toàn quyền, Nhân sự, Quản lý bán hàng | chấm với Quản trị (màn 55) |
| `/quet-ve` | Bán hàng, Kế toán, Quản trị, Hướng dẫn viên, Toàn quyền, Tài xế công ty, Quản lý bán hàng | chấm với Hướng dẫn viên (màn 71) |
| `/sessions` | Quản trị, Toàn quyền | chấm với Toàn quyền (màn 67) |
| `/so-cong-no` | Kế toán, Toàn quyền | chấm với Kế toán (màn 43) |
| `/staff` | Quản trị, Toàn quyền, Nhân sự | chấm với Nhân sự (màn 11), Quản trị (màn 54), Thực tập sinh (màn 86) |
| `/tai-xe` | Tài xế công ty, Tài xế đối tác | chấm với Tài xế công ty (màn 25), Tài xế đối tác (màn 27) |
| `/thiet-lap` | Quản trị, Toàn quyền | chấm với Quản trị (màn 57) |
| `/to-chuc` | không bộ nào (mở bằng địa chỉ) | chấm với Đối tác (màn 76) |
| `/tro-ly-cai-dat` | Quản trị, Toàn quyền | chấm với Toàn quyền (màn 70) |
| `/ve-cai-dat` | Quản trị, Toàn quyền | chấm với Toàn quyền (màn 74) |
| `/ve-doi-chieu` | Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng | chấm với Quản trị (màn 73) |
| `/ve-kho` | Bán hàng, Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng | chấm với Quản trị (màn 72) |
| `/xe` | Quản trị, Toàn quyền | chấm với Quản trị (màn 36) |
| `/xe-chi-tiet` | Quản trị, Toàn quyền | chấm với Quản trị (màn 37) |
| `/xe-dang-chay` | Bán hàng, Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng | chấm với Quản trị (màn 34) |
| `/xe-sua` | Quản trị, Toàn quyền | chấm với Quản trị (màn 38) |

## 2. Từng màn (cũng là bảng việc)

| Màn | Họ màn | Bộ quyền : trang | Trạng thái | Máy đo (dòng đầu) | Chặn việc / Nặng / Nhỏ | Dữ liệu và ghi chú |
|---|---|---|---|---|---|---|
| 1 | Đơn hàng + chi tiết | SALES:/ | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 6 | có dữ liệu thử; màn đầu sau đăng nhập |
| 2 | Đơn hàng + chi tiết | SALES_MANAGER:/ | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 2 / 6 | có dữ liệu thử; màn đầu sau đăng nhập |
| 3 | Tiền | ACCOUNTING:/ | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 5 | có dữ liệu thử; màn đầu sau đăng nhập |
| 4 | Quản trị, Thiết lập | ADMIN:/ | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 2 / 5 | có dữ liệu thử; màn đầu sau đăng nhập |
| 5 | Quản trị, Thiết lập | SUPER_ADMIN:/ | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 7 | có dữ liệu thử; màn đầu sau đăng nhập |
| 6 | Đơn hàng + chi tiết | INTERN:/orders | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 0 / 5 | có dữ liệu thử; màn đầu sau đăng nhập |
| 7 | Đơn hàng + chi tiết | FIELD:/orders | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 1 / 5 | có dữ liệu thử; màn đầu sau đăng nhập |
| 8 | Màn của đối tác bên ngoài | PARTNER:/orders | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 0 / 4 | có dữ liệu thử; màn đầu sau đăng nhập |
| 9 | Tài xế, chuyến | DRIVER:/cuoc | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 4 | có dữ liệu thử; màn đầu sau đăng nhập |
| 10 | Tài xế, chuyến | DRIVER_PARTNER:/cuoc | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 5 | có dữ liệu thử; màn đầu sau đăng nhập |
| 11 | Quản trị, Thiết lập | HR:/staff | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 2 / 7 | có dữ liệu thử; màn đầu sau đăng nhập |
| 12 | Lập đơn | SALES:/order-form | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 0 / 5 | có dữ liệu thử; họ Lập đơn đang có đợt sửa đã duyệt, chưa thi công |
| 13 | Lập đơn | PARTNER:/order-form | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 5 | có dữ liệu thử; họ Lập đơn đang có đợt sửa đã duyệt, chưa thi công |
| 14 | Lập đơn | INTERN:/order-form | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 3 | có dữ liệu thử; họ Lập đơn đang có đợt sửa đã duyệt, chưa thi công |
| 15 | Lập đơn | SALES:/order-form | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 1 / 5 | đơn mở ra là đơn đã có mã (màn «Sửa đơn»), không phải nháp chưa gửi; họ Lập đơn đang có đợt sửa đã duyệt, chưa thi công |
| 16 | Đơn hàng + chi tiết | SALES:/orders | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 0 / 8 | có dữ liệu thử |
| 17 | Đơn hàng + chi tiết | ACCOUNTING:/orders | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 3 / 4 | có dữ liệu thử |
| 18 | Đơn hàng + chi tiết | SALES:/order | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 2 / 5 | có dữ liệu thử; trang dài, máy dừng ở số ảnh tối đa nên CHƯA CHỤP HẾT |
| 19 | Đơn hàng + chi tiết | PARTNER:/order | đã chụp, đã chấm | có vi phạm (1 tiêu chí không đạt) | 0 / 1 / 5 | có dữ liệu thử |
| 20 | Đơn hàng + chi tiết | ACCOUNTING:/order | đã chụp, đã chấm | có vi phạm (1 tiêu chí không đạt) | 0 / 2 / 5 | có dữ liệu thử; trang dài, máy dừng ở số ảnh tối đa nên CHƯA CHỤP HẾT |
| 21 | Đơn hàng + chi tiết | FIELD:/order | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 6 | có dữ liệu thử |
| 22 | Đơn hàng + chi tiết | ADMIN:/order | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 6 | có dữ liệu thử; trang dài, máy dừng ở số ảnh tối đa nên CHƯA CHỤP HẾT |
| 23 | Đơn hàng + chi tiết | SALES_MANAGER:/cho-xac-nhan | đã chụp, đã chấm | có vi phạm (4 tiêu chí không đạt) | 0 / 1 / 5 | có dữ liệu thử |
| 24 | Đơn hàng + chi tiết | SALES:/parties | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 1 / 5 | có dữ liệu thử |
| 25 | Tài xế, chuyến | DRIVER:/tai-xe | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 4 | có dữ liệu thử |
| 26 | Tài xế, chuyến | DRIVER:/cuoc-chuyen | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 3 | có dữ liệu thử |
| 27 | Tài xế, chuyến | DRIVER_PARTNER:/tai-xe | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 3 | có dữ liệu thử |
| 28 | Tài xế, chuyến | DRIVER_PARTNER:/cuoc-chuyen | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 4 | có dữ liệu thử |
| 29 | Tài xế, chuyến | DRIVER_PARTNER:/ban | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 2 / 3 | có dữ liệu thử |
| 30 | Điều phối xe | ADMIN:/dieu-phoi | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 1 / 7 | có dữ liệu thử |
| 31 | Điều phối xe | SALES:/dieu-phoi | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 1 / 7 | có dữ liệu thử |
| 32 | Điều phối xe | ADMIN:/chuyen | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 3 / 5 | có dữ liệu thử |
| 33 | Điều phối xe | ADMIN:/chuyen-sua | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 6 | có dữ liệu thử |
| 34 | Điều phối xe | ADMIN:/xe-dang-chay | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 4 | chấm trên màn rỗng (0 xe đang chạy) |
| 35 | Điều phối xe | ADMIN:/de-nghi | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 4 | chấm trên màn rỗng (không có đề nghị) |
| 36 | Điều phối xe | ADMIN:/xe | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 6 | có dữ liệu thử |
| 37 | Điều phối xe | ADMIN:/xe-chi-tiet | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 4 | có dữ liệu thử |
| 38 | Điều phối xe | ADMIN:/xe-sua | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 3 | có dữ liệu thử |
| 39 | Điều phối xe | ADMIN:/lich-xe-ban | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 5 | có dữ liệu thử |
| 40 | Điều phối xe | ADMIN:/giay-to-sap-het-han | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 4 | có dữ liệu thử |
| 41 | Điều phối xe | ACCOUNTING:/bang-gia-xe | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 2 / 5 | chấm trên màn rỗng (nhà xe chưa có giá) |
| 42 | Điều phối xe | ACCOUNTING:/bang-ke-xe | đã chụp, đã chấm | có vi phạm (1 tiêu chí không đạt) | 0 / 0 / 5 | có dữ liệu thử |
| 43 | Tiền | ACCOUNTING:/so-cong-no | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 5 | có dữ liệu thử |
| 44 | Tiền | ACCOUNTING:/khoa-thang | đã chụp, đã chấm | có vi phạm (1 tiêu chí không đạt) | 0 / 0 / 2 | chấm trên màn rỗng (chưa có tháng khoá được) |
| 45 | Tiền | ACCOUNTING:/dieu-chinh-cong-no | đã chụp, đã chấm | có vi phạm (1 tiêu chí không đạt) | 0 / 0 / 4 | có dữ liệu thử |
| 46 | Tiền | ACCOUNTING:/phan-dinh | đã chụp, đã chấm | đạt | 0 / 0 / 3 | chấm trên màn rỗng (chưa có phiếu) |
| 47 | Tiền | ACCOUNTING:/hoa-hong | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 1 / 7 | có dữ liệu thử |
| 48 | Tiền | ACCOUNTING:/cap-dai-ly | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 4 | gần rỗng (chưa có cấp độ đại lý nào); chấm trong lượt gộp `ti-thiet-lap` |
| 49 | Tiền | ACCOUNTING:/han-muc-tra-sau | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 2 | chấm trên màn rỗng (chưa đối tác nào bật Trả sau); chấm trong lượt gộp `ti-thiet-lap` |
| 50 | Tiền | ACCOUNTING:/nguoi-ban | đã chụp, đã chấm | có vi phạm (1 tiêu chí không đạt) | 0 / 0 / 4 | có dữ liệu thử; chấm trong lượt gộp `ti-thiet-lap` |
| 51 | Tiền | ACCOUNTING:/chup-bu | đã chụp, đã chấm | đạt | 0 / 0 / 0 | chấm trên màn rỗng (không còn đơn chờ chụp bù); chấm trong lượt gộp `ti-thiet-lap-2` |
| 52 | Tiền | SUPER_ADMIN:/hoa-hong-gioi-han | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 5 | có dữ liệu thử; chấm trong lượt gộp `ti-thiet-lap-2` |
| 53 | Tiền | ADMIN:/phi-don | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 3 / 5 | gần rỗng (chưa có mức phí); chấm trong lượt gộp `ti-thiet-lap-2` |
| 54 | Quản trị, Thiết lập | ADMIN:/staff | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 3 / 5 | có dữ liệu thử |
| 55 | Quản trị, Thiết lập | ADMIN:/phieu-dang-ky | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 5 | chấm trên màn rỗng (không có phiếu chờ) |
| 56 | Quản trị, Thiết lập | SALES_MANAGER:/catalog | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 3 / 8 | có dữ liệu thử; trang dài, máy dừng ở số ảnh tối đa nên CHƯA CHỤP HẾT |
| 57 | Quản trị, Thiết lập | ADMIN:/thiet-lap | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 5 | có dữ liệu thử |
| 58 | Quản trị, Thiết lập | ADMIN:/locations | đã chụp, đã chấm | có vi phạm (4 tiêu chí không đạt) | 0 / 1 / 7 | có dữ liệu thử; chấm trong lượt gộp `dm-1` |
| 59 | Quản trị, Thiết lập | ADMIN:/loai-giay-to-nguoi | đã chụp, đã chấm | có vi phạm (4 tiêu chí không đạt) | 0 / 1 / 7 | có dữ liệu thử; chấm trong lượt gộp `dm-1` |
| 60 | Quản trị, Thiết lập | ADMIN:/loai-giay-to-xe | đã chụp, đã chấm | có vi phạm (4 tiêu chí không đạt) | 0 / 1 / 7 | có dữ liệu thử; chấm trong lượt gộp `dm-1` |
| 61 | Quản trị, Thiết lập | ADMIN:/ly-do-dieu-phoi | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 5 | có dữ liệu thử; chấm trong lượt gộp `dm-2` |
| 62 | Quản trị, Thiết lập | ADMIN:/chinh-sach-dieu-phoi | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 1 / 0 / 4 | có dữ liệu thử; chấm trong lượt gộp `dm-2` |
| 63 | Quản trị, Thiết lập | ADMIN:/dieu-kien-xuat-ben | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 3 | màn báo không có quyền (trang chỉ Toàn quyền xem được; đã chấm thêm màn 87); chấm trong lượt gộp `dm-2` |
| 64 | Quản trị, Thiết lập | ADMIN:/luat-ban | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 2 | chấm trên màn rỗng (chưa có luật); chấm trong lượt gộp `dm-3` |
| 65 | Quản trị, Thiết lập | ADMIN:/dac-diem-dich-vu | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 4 | chấm trên màn rỗng (chưa có đặc điểm); chấm trong lượt gộp `dm-3` |
| 66 | Quản trị, Thiết lập | SUPER_ADMIN:/giao-dien | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 8 | có dữ liệu thử; chấm trong lượt gộp `dm-3` |
| 67 | Quản trị, Thiết lập | SUPER_ADMIN:/sessions | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 2 / 5 | có dữ liệu thử; trang dài, máy dừng ở số ảnh tối đa nên CHƯA CHỤP HẾT; chấm trong lượt gộp `kt-1` |
| 68 | Quản trị, Thiết lập | SUPER_ADMIN:/audit | đã chụp, đã chấm | có vi phạm (4 tiêu chí không đạt) | 0 / 1 / 4 | có dữ liệu thử; trang dài, máy dừng ở số ảnh tối đa nên CHƯA CHỤP HẾT; chấm trong lượt gộp `kt-1` |
| 69 | Quản trị, Thiết lập | SUPER_ADMIN:/gui-thong-bao | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 1 / 4 | có dữ liệu thử; chấm trong lượt gộp `kt-1` |
| 70 | Quản trị, Thiết lập | SUPER_ADMIN:/tro-ly-cai-dat | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 1 / 7 | có dữ liệu thử |
| 71 | Vé điện tử (họ mới) | FIELD:/quet-ve | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 3 | có dữ liệu thử |
| 72 | Vé điện tử (họ mới) | ADMIN:/ve-kho | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 1 / 7 | chấm trên màn rỗng (kho chưa có vé); chấm trong lượt gộp `ve-1` |
| 73 | Vé điện tử (họ mới) | ADMIN:/ve-doi-chieu | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 5 | chấm trên màn rỗng (ngày không có lượt quét); chấm trong lượt gộp `ve-1` |
| 74 | Vé điện tử (họ mới) | SUPER_ADMIN:/ve-cai-dat | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 3 | có dữ liệu thử; chấm trong lượt gộp `ve-1` |
| 75 | Màn của đối tác bên ngoài | PARTNER:/account | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 1 / 7 | có dữ liệu thử; trang dài, máy dừng ở số ảnh tối đa nên CHƯA CHỤP HẾT |
| 76 | Màn của đối tác bên ngoài | PARTNER:/to-chuc | đã chụp, đã chấm | có vi phạm (1 tiêu chí không đạt) | 0 / 2 / 1 | màn báo lỗi (kho thử không có người quản lý tổ chức) |
| 77 | Màn của đối tác bên ngoài | PARTNER:/huong-dan | đã chụp, đã chấm | có vi phạm (1 tiêu chí không đạt) | 0 / 0 / 5 | có dữ liệu thử |
| 78 | Màn của đối tác bên ngoài | KHACH:/dang-ky | đã chụp, đã chấm | có vi phạm (1 tiêu chí không đạt) | 0 / 2 / 0 | trạng thái «tạm ngừng nhận đăng ký» của kho thử; biểu mẫu đăng ký đầy đủ chưa chấm |
| 79 | Trợ giúp, Của tôi (họ mới) | SALES:/account | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 2 / 5 | có dữ liệu thử; trang dài, máy dừng ở số ảnh tối đa nên CHƯA CHỤP HẾT |
| 80 | Trợ giúp, Của tôi (họ mới) | SALES:/huong-dan | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 1 / 5 | có dữ liệu thử |
| 81 | Trợ giúp, Của tôi (họ mới) | SALES:/feedback | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 4 | có dữ liệu thử |
| 82 | Trợ giúp, Của tôi (họ mới) | SALES:/help | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 0 / 6 | có dữ liệu thử; trang dài, máy dừng ở số ảnh tối đa nên CHƯA CHỤP HẾT |
| 83 | Đăng nhập, trạng thái | KHACH:/login | đã chụp, đã chấm | đạt | 0 / 0 / 1 | có dữ liệu thử |
| 84 | Đăng nhập, trạng thái | SALES:/404 | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 3 | có dữ liệu thử |
| 85 | Đăng nhập, trạng thái | SALES:/ngoai-mang | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 3 | có dữ liệu thử |
| 86 | Đăng nhập, trạng thái | INTERN:/staff | đã chụp, đã chấm | có vi phạm (2 tiêu chí không đạt) | 0 / 0 / 5 | màn «không có quyền» (chủ ý) |
| 87 | Quản trị, Thiết lập | SUPER_ADMIN:/dieu-kien-xuat-ben | đã chụp, đã chấm | có vi phạm (3 tiêu chí không đạt) | 0 / 2 / 3 | có dữ liệu thử |

Không ô nào «đo thiếu» hay «ô hỏng» ở lượt chụp cuối. Hai trang `/404` và `/ngoai-mang` lượt đầu chụp bằng người chưa đăng nhập ra ô hỏng (bị chuyển về Đăng nhập), đã chụp lại bằng tài khoản Bán hàng.
Màn 68 chấm hai lần: lượt gộp có một dòng sai khuôn nên giao lại riêng một lần; bảng gộp dùng báo cáo riêng.
