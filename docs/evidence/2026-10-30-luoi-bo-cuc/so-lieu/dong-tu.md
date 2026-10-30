# Kiểm kê động từ trên nút — 30/10/2026

Hồ sơ có ngày. Một trợ lý chỉ đọc quét `web/**/*.ts` (khoảng 549 lời gọi `h("button", …)` và các hàm tạo nút `btn`, `nut`, `nutNhom`, `nutVung`, `nutGui`, `linkButton`, `nutBatTat`) và `public/*.html` (`<button>`, `a.btn`) trên nhánh `chang-3-luoi-bo-cuc` (mã web như `main` a129d3dd). Số lần là xấp xỉ. Đường dẫn tương đối với `web/`.

## 1. Động từ có nhiều nghĩa

| Động từ | ~Số lần | Các nghĩa thật | Ví dụ |
|---|---|---|---|
| Đóng | 42 | đóng hộp/bảng trượt; **đóng hẳn một điều kiện xuất bến** (hỏi lại, không mở lại được) | `bang-gia-xe.ts:254`; `dieu-kien-xuat-ben.ts:81-83` |
| Lưu | ~38 | ghi dữ liệu; «Lưu thành bản mới» tạo phiên bản; **«Lưu ảnh» chỉ lưu ảnh QR, không ghi gì** | `staff.ts:260`; `catalog.ts:625`; `order.ts:1179` |
| Huỷ | ~33 | đóng hộp không lưu; **huỷ bản ghi nghiệp vụ** (đơn, chuyến, người); «Huỷ dòng» = ghi bút toán đảo; «Huỷ sửa» = bỏ bản nháp; liên kết quay về | `hoa-hong-hop.ts:68`; `order.ts:1531`; `chi-phi-chuyen.ts:162`; `tro-ly-cai-dat.ts:415`; `xe-sua.ts:163` |
| Thôi | 20 | đóng, không làm gì (trùng Huỷ nghĩa 1) | `phieu-xoa.ts:162`, `sessions.ts:83` |
| Sửa / Sửa sai | ~22 / 4 | mở biểu mẫu sửa; ở Hoa hồng «Sửa» = chữa chỗ ghi nhầm, bắt lý do (ADR-0148) — nơi khác gọi việc đó là «Sửa sai» | `locations.ts:42`; `hoa-hong-bang.ts:67`; `parties.ts:639` |
| Đổi | ~16 | Hoa hồng: ngừng mức cũ, áp mức mới từ một ngày; mở sửa tại chỗ; chọn lại (khách, đối tác, nhóm); đổi tên; đổi tài khoản nhận tiền (`confirm()`); đổi vai trong nhóm (không hỏi) | `hoa-hong-bang.ts:60`; `dieu-kien-xuat-ben.ts:141`; `order.ts:1455`; `catalog.ts:334`; `parties.ts:910`; `ho-tro-nhom.ts:237` |
| Ngừng / Ngừng áp dụng / Ngừng dùng / Ngưng / Kết thúc | 7 / 3 / 3 / 9 | đặt ngày cuối hiệu lực (giữ lịch sử); ngừng xe (đảo được); ngưng tài khoản (đăng xuất, `confirm()`); kết thúc vai hồ sơ **ngay, không hỏi**; kết thúc giá; kết thúc chuyến | `hoa-hong-hop.ts:461-495`; `xe-sua.ts:140`; `staff.ts:170-174`; `parties.ts:309,328`; `bang-gia-xe.ts:141`; `cuoc-chuyen.ts:540` |
| Tắt / Bật | ~9 / ~8 | **tắt loại đối tác ⇒ máy chủ giữ đơn**; **tắt chính sách ⇒ vẫn áp cho gắn đang có**; tắt nhóm dịch vụ; tắt thông báo máy này; tắt bảo mật hai lớp của nhân viên; tắt bảo trì | `hoa-hong-thiet-lap.ts:54` (→ `src/shared/hoa-hong-hien-thi.ts:160`); `hoa-hong-thiet-lap.ts:127`; `catalog.ts:338`; `account.ts:339,790`; `staff.ts:160` |
| Gỡ / Bỏ / Xoá | ~7 / ~14 / 5 | Gỡ: xoá thật một khoá đăng nhập, gỡ thành viên, gỡ yếu tố xác thực; Bỏ: bỏ chọn (chỉ màn hình), **bỏ lượt đón (mất dữ liệu, bắt lý do)**, bỏ giá ghi đè (xoá trên máy chủ, `confirm()`), bỏ đánh dấu, bỏ tệp; Xoá: xoá dòng chưa lưu, xoá lọc, xoá ảnh | `account.ts:210`; `ho-tro-nhom.ts:242`; `catalog.ts:232,120`; `khoi-dua-don.ts:250`; `service-card.ts:375`; `orders.ts:293` |
| Duyệt / Chấp nhận / Đồng ý · Từ chối / Bác | 3/2/1 · 7/1 | cùng nghĩa «duyệt» · cùng nghĩa «từ chối» | `de-nghi.ts:93-94`; `xac-minh-hang-cho.ts:175`; `order.ts:435` |
| Bật lại | 4 cách | Bật, Hiện lại, Dùng lại, Kích hoạt lại | `catalog.ts:121`; `ho-tro-nhom.ts:116`; `staff.ts:170` |
| Thêm / Tạo / «+ … mới» | ~40 | «+ Chuyến mới» và «Tạo chuyến» là một việc | `dieu-phoi.ts:589,763` |
| Quay lại | 9 | lùi một bước; **«Quay lại bản này» = khôi phục cấu hình cũ** | `chuyen.ts:456`; `tro-ly-cai-dat.ts:240` |
| Đặt lại · Ẩn | 6 · ~6 | đặt lại hạn mức (vô hại) vs **Đặt lại PIN (mọi máy đăng xuất)**; ẩn dịch vụ (đảo được) vs **Ẩn danh hoá (xoá IP, không đảo được)** | `han-muc-tu-choi-the.ts:51`; `staff.ts:148`; `catalog.ts:121`; `sessions.ts:68` |

## 2. Việc nguy bấm là chạy, không hỏi lại

Tắt loại đối tác (giữ đơn) `hoa-hong-thiet-lap.ts:17-23` → `hoa-hong-hop.ts:569`; Tắt/Bật chính sách `hoa-hong-thiet-lap.ts:127`; Tắt nhóm dịch vụ, Ẩn dịch vụ `catalog.ts:338,121`; Kết thúc vai/quan hệ hồ sơ `parties.ts:309,328`; Lấy lại giá bảng (đổi chi phí chuyến) `chi-phi-chuyen.ts:122`; Gỡ một khoá đăng nhập `account.ts:210`; Quên máy này `account.ts:628`; Gỡ thành viên / đổi vai nhóm `ho-tro-nhom.ts:237-245`.

## 3. Việc nguy hỏi lại bằng hộp của trình duyệt (`confirm()`)

`order.ts:1058` (Đã giao – đã thu đủ / Hoàn thành), `order.ts:1588` (Xác nhận đơn), `staff.ts:149,166,174` (Đặt lại PIN, Gỡ Face ID, Ngưng tài khoản), `xac-nhan-don-ui.ts:55,168`, `parties.ts:321,915`, `catalog.ts:120,161,823`, `account.ts:640`. Đã hỏi lại trong trang (đúng khuôn): Huỷ đơn/chuyến/người, Đóng điều kiện, Ẩn danh hoá, Đăng xuất máy khác, Ngừng dùng xe, Thu hồi thông báo, Bật bảo trì, Đổi/Ngừng/Sửa ở Hoa hồng (`hoiXacNhan` ở `bang-truot.ts:85`).
