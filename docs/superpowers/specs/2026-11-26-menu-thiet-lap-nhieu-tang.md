# Đặc tả ngắn — Menu Thiết lập nhiều tầng cho Quản trị và Toàn quyền (26/11/2026)

> Trạng thái: **chủ duyệt 26/11/2026**, nguyên văn «Duyệt cả ba» (phương án A, bộ tên khuyến nghị, điện thoại hiện sẵn có tiêu đề, tách trang «Cài đặt lập đơn» sau khi nhánh P1 vào `main`). Chủ duyệt ảnh 390 + 1280 (Toàn quyền, Quản trị, Kế toán) cùng ngày, nguyên văn «Duyệt ảnh». Phần tách trang «Cài đặt lập đơn» làm ở lần sau, khi nhánh P1 đã nhập. Lời chủ 26/11 nguyên văn: «Tái cấu trúc mạnh mẽ menu của Admin, Super Admin theo nhiều tầng theo nhiều nhóm khác nhau ở 1 phiên khác». Bàn giao: `docs/superpowers/plans/2026-11-26-ban-giao-phien-dieu-phoi-giao-dien.md` §4 (nhánh `claude/tour-booking-ui-audit-b8c386`). Khung gốc ADR-0222, ngôn ngữ thị giác ADR-0234.

## 1. Việc gì, cho ai, vì sao

Hôm nay nhóm «Thiết lập» ở thanh bên máy tính và trang Thiết lập trên điện thoại là **một danh sách phẳng**: Quản trị thấy 18 mục, Toàn quyền 25 mục, xếp không theo chủ đề (Hoa hồng đứng cạnh Phí đưa đón, Nhật ký cạnh Giao diện). Việc này chia Thiết lập thành các **nhóm con theo chủ đề** (tầng 2), mỗi nhóm con gập/mở được, để người dùng tìm một mục trong 2 lần nhìn thay vì đọc cả cột. Menu chỉ ẩn/hiện theo bảng quyền (`can()`); không đổi quyền máy chủ, không thêm, bớt trang nào.

Hiện trạng đo bằng `thanhBen()` ngày 26/11 (mục Thiết lập theo bộ quyền): Quản trị 18; Toàn quyền 25; Kế toán 8; Quản lý bán hàng 7; Bán hàng 4; Nhân sự 2; Kế toán + Bán hàng 10. Bảng `THANH_BEN` dùng chung cho mọi vai nên cây mới áp cho cả các vai này.

## 2. Phương án (khuyến nghị A)

| | Làm gì | Được | Mất |
|---|---|---|---|
| **A** | Giữ 4 nhóm trên cùng (Hằng ngày, Vận chuyển, Tiền, Thiết lập). Chia **bên trong** Thiết lập thành 6 nhóm con. | Không đụng trần «10 khối hiện sẵn» (đặc tả khung §5.4, bài `nhom-gap-thanh-ben`); các vai khác chỉ thấy nhóm con có mục của mình. | Thiết lập vẫn là một nút; muốn tới mục phải mở 2 tầng. |
| B | Bỏ Thiết lập, đưa 6 nhóm con lên tầng trên cùng. | Ít bấm hơn một lần. | Quản trị lên 14 khối, Toàn quyền 15 ⇒ chủ phải nới trần 10. |
| C | Cài đặt về cạnh việc: cài đặt xe vào nhóm Vận chuyển, hoa hồng/hạn mức vào nhóm Tiền, phần còn lại ở Thiết lập. | Gần việc hằng ngày. | Toàn quyền lên 11 khối (nới trần); menu Kế toán đổi nhiều. |

**Cây A** (tên nhóm con là bộ khuyến nghị, chờ chủ chọn — câu 1):

1. **Dịch vụ & giá bán**: Dịch vụ & giá · Đặc điểm dịch vụ · Luật bán · Phí đưa đón · Nhà cung cấp
2. **Đối tác & hoa hồng**: Hoa hồng đối tác · Cấp độ đại lý · Giới hạn nhập hoa hồng · Hạn mức trả sau · Chụp bù mức · Phiếu đăng ký đối tác
3. **Vé**: Vé điện tử · Đối chiếu vé · Cài đặt vé điện tử
4. **Danh mục vận chuyển**: Địa điểm · Loại giấy tờ xe · Lý do điều phối · Chính sách điều phối
5. **Tài khoản & an toàn**: Quản lý tài khoản · Loại giấy tờ cá nhân · Máy đang đăng nhập · Nhật ký
6. **Hệ thống** (chỉ Toàn quyền): Gửi thông báo · Trợ lý Hỗ trợ · Giao diện · *chỗ cho «Cài đặt lập đơn» — câu 3*

Quản trị thấy nhóm 1–5 (Hệ thống ẩn vì rỗng); Kế toán thấy 1, 2, 3; Nhân sự thấy 2 mục phẳng.

## 3. Xong khi
- Toàn quyền, máy tính 1280: mở Thiết lập thấy 6 dòng nhóm con, mỗi dòng có số mục; bấm «Vé» mở ra 3 mục. Đứng ở trang Luật bán thì nhóm «Dịch vụ & giá bán» tự mở, các nhóm khác đóng.
- Quản trị, điện thoại 390: bấm tab Thiết lập, trang Thiết lập hiện 5 tiêu đề nhóm, dưới mỗi tiêu đề là các mục; không còn danh sách phẳng 18 dòng.
- Kế toán: Thiết lập có 3 nhóm con (8 mục như cũ). Nhân sự: 2 mục phẳng, không có tiêu đề nhóm.
- Mọi bộ quyền (1024 tập): không mất lối vào trang nào, không thấy thêm trang nào (bài `muc-giao-dien-menu-moi`, `muc-hien-mo-duoc-*`, ảnh chụp `muc-giao-dien-hien-trang`); trần 10 khối giữ nguyên.
- Bài mới đỏ trước, xanh sau: thứ tự nhóm con của Toàn quyền, Quản trị, Kế toán; trang Thiết lập điện thoại có tiêu đề nhóm.
- Ảnh 390 + 1280 của Toàn quyền, Quản trị, Kế toán được trợ lý `nguoi-danh-gia-giao-dien` chấm rồi chủ duyệt trước khi nhập.

## 4. Không làm lần này
Không đổi quyền, không đổi trang nào, không đổi nhóm Hằng ngày / Vận chuyển / Tiền, không đổi trang «Của tôi» (danh sách lối vào `TRANG_TOI` giữ nguyên), không đổi thanh tab điện thoại. Mục «Quét vé» bị ẩn với Toàn quyền vì trần 10 khối — giữ nguyên.

**Loại việc:** việc nhỏ về hành vi (chỉ giao diện điều hướng), nhưng phải **nới trần dung lượng gói trang Đơn hàng** (hôm nay dư 41 byte; tên nhóm có dấu tốn byte) — dự kiến +200 đến +400 byte, ghi số đo thật ở commit. Không cần ADR.

## 5. Câu hỏi cho chủ
1. **Chọn phương án và bộ tên nhóm.** Khuyến nghị **A** với bộ tên ở mục 2, vì không phải nới trần và đổi ít nhất cho các vai khác. Bộ tên thay thế: «Bán hàng» · «Đối tác» · «Vé điện tử & đối chiếu» · «Xe & điều phối» · «Người dùng & nhật ký» · «Cài đặt chung».
2. **Trên điện thoại, nhóm con hiện sẵn hay gập?** Khuyến nghị **hiện sẵn có tiêu đề** (trang Thiết lập điện thoại vốn là trang danh sách, gập thêm một tầng là thêm một lần chạm).
3. **Các công tắc «Cài đặt lập đơn» của Toàn quyền** (9 công tắc đang nằm cuối trang «Của tôi»; phiên P1 sắp thêm ô đặt cọc đối tác và ô bằng lái): khuyến nghị **tách thành trang riêng «Cài đặt lập đơn» trong nhóm Hệ thống**, nội dung và quyền giữ nguyên, vì chủ gọi chỗ này là «bảng điều khiển» và người cần chỉnh không phải tìm trong trang cá nhân. Cách kia: giữ ở «Của tôi», menu không đổi. Phiên P1 xác nhận 26/11: hai thẻ mới (`o-dat-coc-cai-dat`, `o-bang-lai-cai-dat`) đặt cuối nhóm này và mở cho cả Quản trị (ô mới `settings.form_fields`, ADMIN + SUPER_ADMIN); nên nếu tách trang, mục hiện khi có `settings.ops` HOẶC `settings.form_fields` — Quản trị thấy trang với đúng hai thẻ đó, Toàn quyền thấy đủ 11. Tách trang chỉ làm sau khi nhánh P1 vào `main`.

## 6. Điều AI tự quyết (chủ bác được)
- Máy tính: nhóm con chứa trang đang đứng tự mở, nhóm khác đóng; nhóm con đóng mà chứa trang đang đứng thì có chấm báo (khuôn nhóm «Điều phối»).
- Nhóm con chỉ còn 1 mục hiện với người xem thì hiện phẳng (khuôn `gomNhomGap`); tổng Thiết lập ≤ 5 mục thì không chia nhóm con.
- Thứ tự mục trong nhóm con theo bảng trên; tên mục giữ nguyên.
- Viết gọn để bớt byte: mỗi nhóm con một hằng dùng chung (khuôn `DIEU_PHOI`), không chép tên vào từng dòng.
