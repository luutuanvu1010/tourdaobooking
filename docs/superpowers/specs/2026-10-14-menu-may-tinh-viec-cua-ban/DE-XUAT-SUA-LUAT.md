# Đề xuất sửa `web/CLAUDE.md` sau menu máy tính theo việc (15/10)

> Trạng thái: **ĐỀ XUẤT, chưa áp dụng.** `web/CLAUDE.md` là luật chi phối AI (CLAUDE.md §3, N9): AI không tự sửa, chủ duyệt mới có hiệu lực. Tệp này chỉ để chủ đọc và dán vào (hoặc bảo một phiên sửa luật làm).
> Số mục lấy từ chạy hàm `thanhBen()` thật ngày 15/10 (script thử ngoài repo), KHÔNG đoán. Đếm gồm nút nổi bật «Tạo đơn» và ba mục chân menu (Của tôi, Góp ý / Báo lỗi, Trợ giúp), gồm cả các mục của nhóm Thiết lập.

## Số mục thanh bên theo vai (đo bằng `thanhBen()`, TẠI NGÀY 2026-10-15; hồ sơ có ngày, không sửa lại khi bảng đổi)

| Vai | Tổng mục | Hiện sẵn (không tính Tạo đơn, Thiết lập, chân menu) | Thiết lập |
|---|---|---|---|
| Bán hàng | 10 | 5 | 1 |
| Kế toán | 13 | 8 | 2 |
| Quản trị | 21 | 9 | 8 |
| Toàn quyền (chỉ `SUPER_ADMIN`) | 28 | 10 | 14 |
| Quản trị + Kế toán | 22 | 10 | 8 |

Chi tiết nhãn Quản trị: HẰNG NGÀY 4 (Tạo đơn, Trang chủ, Đơn hàng, Danh bạ), VẬN CHUYỂN 5 (Điều phối xe, Xe đang chạy, Đề nghị chuyển khách, Xe & giấy tờ, Giá & chi phí), TIỀN 1 (Điều chỉnh công nợ), THIẾT LẬP 8, chân menu 3. Toàn quyền thêm Khoá sổ tháng (TIỀN) và 6 mục THIẾT LẬP (Chính sách điều phối, Phiên đăng nhập, Nhật ký, Gửi thông báo, Trợ lý Hỗ trợ, Giao diện).

**Lưu ý cho người sửa kịch bản (Task 7b):** các con số trên là số mục theo bảng, không phải số `.sidebar-item` đếm được trong DOM. Nhóm Thiết lập thu gọn có thể không đưa mục vào DOM hoặc ẩn chúng; nút «Tạo đơn» vẽ riêng. Hãy đếm lại bằng chính kịch bản trước khi ghi số vào luật.

## Diff đề xuất cho `web/CLAUDE.md`

### Dòng bảng «Xe (bản vẽ 00–02)» (hiện ở dòng 54)

Thay đoạn nói về số mục và danh sách nhãn cũ:

```diff
-`xe-smoke.mjs` (13 bước) + `trang-chu-smoke.mjs` (đếm mục thanh bên — Quản trị nay **17** mục (thêm "Điều phối xe" dưới "Vận chuyển"), so ĐÚNG danh sách nhãn ở `:541` (`ADMIN_NAV`), số mục ở `:557` và số mục từng trang ở `:873` (Quản trị 17) / `:883` (trang `/audit` mở bằng Quản trị + Toàn quyền: 20). Nợ "Nhật ký" ĐÃ BỎ: …
+`xe-smoke.mjs` (13 bước) + `trang-chu-smoke.mjs` (đếm mục thanh bên theo bảng `THANH_BEN` sau menu theo việc 15/10: Quản trị **21** mục (hiện sẵn 9, Thiết lập 8), Toàn quyền **28** (hiện sẵn 10, Thiết lập 14), Kế toán 13, Bán hàng 10 — số đo bằng `thanhBen()`, kịch bản phải đếm lại trong DOM thật (nhóm Thiết lập thu gọn); danh sách nhãn `ADMIN_NAV` trong kịch bản phải khớp bảng này. Nợ "Nhật ký" ĐÃ BỎ: …
```

(Phần «Nợ "Nhật ký" ĐÃ BỎ: …» giữ nguyên như hiện có. Các số dòng `:541`, `:557`, `:873`, `:883` trong kịch bản sẽ đổi khi Task 7b sửa; không ghi số dòng vào luật nữa, ghi tên hằng `ADMIN_NAV`.)

### Thêm ba dòng vào bảng «Sửa tệp nào thì chạy kịch bản nào»

```diff
+| Thanh bên máy tính theo việc: `web/shell.ts` (nhóm `HẰNG NGÀY` / `VẬN CHUYỂN` / `TIỀN` / `THIẾT LẬP` / `CHÂN MENU`, nút Thiết lập thu gọn), `src/shared/muc-giao-dien.ts` (`THANH_BEN`, `thanhBen`, `thietLapMoSan`), `public/app.css` khối `.sidebar-*` | `trang-chu-smoke.mjs` (đếm mục từng vai, nhóm Thiết lập mở / đóng) + `pwa.mjs` + mọi kịch bản có `sidebar-item` + bài `src/muc-giao-dien-menu-moi.test.ts`, `src/muc-giao-dien-hien-trang.test.ts` (chụp lại ảnh mỗi khi đổi bảng; ĐỌC diff «thấy thêm»). Gói `web/orders.ts` dư rất ít dưới trần 96000 byte: chạy `src/goi-trang-nhe.test.ts` sau MỌI thay đổi chạm `shell.ts`, `muc-giao-dien.ts`, `vc-dem.ts` |
+| Dải chuyển nhanh giữa trang anh em: `web/dai-trang-anh-em.ts` (gắn ở `xe`, `lich-xe-ban`, `giay-to-sap-het-han`, `bang-gia-xe`, `bang-ke-xe`), `src/shared/muc-giao-dien-gom.ts`, khối `.dai-anh-em*` của `public/app.css` | bài `src/shared/muc-giao-dien-gom.test.ts` + `xe-smoke.mjs`, `sap-het-han-smoke.mjs` (chạy bằng tài khoản Quản trị: dải có đủ trang, trang đang đứng sáng, vòng tiêu điểm không bị cắt, ở 390 + 1040) |
+| Khối «Việc của bạn» ở Trang chủ máy tính: `web/home.ts` (`renderViec`, `theViec`, `taiDashboard`), `src/shared/viec-cua-ban.ts` (bảng `THE`, `viecCuaBan`, `nguonCanTai`), `src/shared/pham-vi-so.ts` (nhãn phạm vi từng thẻ), khối `.dash-viec*` của `public/app.css` | `trang-chu-smoke.mjs` (bốn vai văn phòng: thẻ, nhãn phạm vi, nút, «Còn N việc nữa», chuỗi lỗi → Thử lại → hồi phục) + bài `src/shared/viec-cua-ban.test.ts`, `src/viec-cua-ban-trang-chu.test.ts`, `src/shared/pham-vi-so.test.ts`. Thẻ chỉ dùng số đã có route đếm; lỗi nguồn là `null` («—» + Thử lại), không bao giờ thành 0 |
```

### Dòng `docs/SO-HANG-RAO.md` nên trỏ tới (không cần sửa luật)

Năm dòng mới ở `docs/SO-HANG-RAO.md` (thêm 15/10) cho: bảng thanh bên khớp điều kiện trang, thẻ chỉ theo quyền thật, nhãn phạm vi thẻ, selector huy hiệu «Xe & giấy tờ», nhãn dải anh em.

## Ba điều chủ cần quyết (nếu duyệt đề xuất này)

1. Có ghi số mục từng vai vào luật `web/CLAUDE.md` không, hay chỉ ghi «đọc từ `thanhBen()`» để khỏi lệch khi đổi bảng? Khuyến nghị: bỏ số cụ thể, chỉ ghi tên hằng và cách đo, vì con số đổi mỗi lần thêm trang.
2. Có đưa luật «mã mới của thanh bên / bảng mục / thẻ việc ở tệp riêng, chỉ trang cần mới import» vào `web/CLAUDE.md` không? Khuyến nghị: có (đã ghi ở `docs/CHANGE-GUIDE.md` công thức z16).
3. Ai sửa `web/CLAUDE.md`: chủ duyệt rồi một phiên sửa luật làm bằng công cụ sửa tệp (không bằng dòng lệnh).
