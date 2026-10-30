# Bản xem trước — Sửa hiển thị và luật khung (30/10/2026)

> Hồ sơ có ngày. Chủ dự án 30/10: «ok làm theo khuyến nghị của bạn, trước khi đưa lên Production thì tôi muốn nhìn thấy nó trước».
> Mã: nhánh `claude/danh-gia-khung-giao-dien` (chưa đẩy lên GitHub, chưa gộp `main`, **chưa lên production**). Kế hoạch + nhật ký thi công:
> `docs/superpowers/plans/2026-10-30-sua-hien-thi-va-luat-khung.md`. Ảnh: `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/anh/xem-truoc/`.
> Mọi ảnh và số đo lấy trên máy thử, dữ liệu giả, **áp đúng tệp giao diện công ty đang chạy trên production** (chữ nội dung 17, nhãn 16, tiêu đề trang 20, chữ đen) —
> nên ảnh «trước» giống bản thật bạn đang dùng.

## Số đo trước → sau (45 trang × điện thoại 390 / laptop 1040 / màn 1440)

| Chỉ số | Trước | Sau | Kịch bản |
|---|---|---|---|
| Chữ bị cắt «…» | 256 chỗ | **11** — 6 địa chỉ đón (được phép rút gọn), 4 tên tài xế trong cột hẹp của dòng thời gian Điều phối, 1 tiêu đề rất dài ở laptop | `kich-ban/do-loi.py` |
| Trang tràn ngang | 1 (Nhật ký, điện thoại) | 0 | `kich-ban/do-loi.py` |
| Mục đang mở bị khuất ở thanh bên (laptop 1366×768) | Toàn quyền 19/32 · Kế toán 6/14 | 0/32 · 0/14 | `kich-ban/soi-thanh-ben.py` |
| Tên trang lặp trong thân (máy tính) | 39/45 trang | 0 (trừ biển số ở Chi tiết xe — là nội dung, giữ) | luật CSS [7] |
| Khối «một đầu» ở 1440 (chỉ số tham khảo) | 142 | 123 | `kich-ban/do-loi.py` |
| Bộ kiểm tự động (`npm test`) | — | 6.785 xanh · **1 đỏ chờ chủ duyệt** (trần dung lượng gói trang Đơn hàng) | |
| Kiểm kiểu (`npm run typecheck`) | — | 0 lỗi | |

## Đã đổi gì (bạn sẽ thấy)

1. **Chi tiết đơn**: dải tóm tắt bốn cột đều, hết chữ xuống dòng từng từ ở laptop; các nút gom một hàng, «Huỷ đơn» tách sang phải; nhãn và giá trị đứng sát nhau;
   điện thoại: mã đơn trên thanh trên hiện đủ, các nút cùng hàng cao bằng nhau.
2. **Đơn hàng**: màn từ 1100 px là **bảng thẳng cột** có hàng tiêu đề; bỏ ô tìm và nút «+ Tạo đơn» trùng với thanh trên. Điện thoại / laptop: thẻ ba hàng, **không cắt**
   tên khách, số khách, còn thu (thẻ cao hơn trước — xem mục «Cần bạn để ý»).
3. **Thanh bên**: tự cuộn tới mục đang mở; tên và vai của bạn ở chân thanh bên hiện đủ, «Đăng xuất» một hàng riêng.
4. **Một trang một tiêu đề**: tên trang chỉ ở thanh trên (đúng quyết định 28/10); các trang Vận chuyển hết lặp đường dẫn «Chính sách điều phối › Vận chuyển › Chính sách điều phối › …» (lỗi có từ trước).
5. **Sổ công nợ** tự mở bên đầu danh sách (hết nửa màn trống). **Đơn chờ xác nhận**: nút «Kiểm vé» cỡ vừa cạnh thông tin. **Trang Tôi**: thẻ xếp kín hai cột.
   **Trang chủ**: biểu đồ doanh thu giãn theo ô. **Danh bạ**: bộ lọc thẳng cột. **Danh mục**: nút của hàng nhóm đứng cạnh tên nhóm. **Quản lý tài khoản**: thao tác
   không gạch chân, việc nguy hiểm chữ xám (đỏ khi rê chuột; hộp hỏi lại vẫn giữ).
6. **Màu và chữ**: tiêu đề dùng màu chữ chính (đen) thay xanh navy — xanh dành cho thứ bấm được; bỏ năm cỡ chữ lẻ (12,8 · 13,6 · 14,4 · 15 · 19 px);
   **dải nhắc bảo mật hai lớp màu cát khi còn hơn 3 ngày**, đỏ khi còn ≤ 3 ngày hoặc quá hạn; bỏ chữ «— Bật ngay» lặp với nút.

## Cần bạn để ý (đổi so với quyết định cũ)

- **Thẻ đơn trên điện thoại cao hơn**: hồi Đợt E (24/9) bạn chọn «đúng 2 dòng, tên dài cắt bằng …». Luật «không cắt tên, số khách, số tiền» bạn duyệt hôm nay thay quyết định đó.
  Trên bản thật (nhãn 16 px) dòng «điện thoại · số khách · còn thu» thường xuống hai hàng.
- **Dải nhắc bảo mật**: đặc tả đợt 0 ghi «Đỏ»; nay còn xa hạn thì màu cát (theo gói bạn duyệt), sát hạn vẫn đỏ.
- **Trang chủ, Đơn hàng, Chi tiết đơn ở máy tính không còn tiêu đề lớn trong thân** — tên trang nằm ở thanh trên.

## Chưa làm / chưa kiểm

- **Chưa kiểm độc lập** (luật dự án: phần chạm chỗ hiển thị tiền cần người kiểm khác, chỉ đọc, trước khi đưa lên) — phiên này không giao việc cho người kiểm khác được.
- **Chưa chạy các kịch bản Chrome cũ** theo bảng `web/CLAUDE.md` (cần axe-core ngoài kho); đã chạy kịch bản đo riêng của phiên này. Một số kịch bản cũ có thể đỏ vì đo
  đúng bố cục cũ (ví dụ đếm «đúng 2 dòng» của thẻ đơn, tìm tiêu đề lớn trong thân trang) — cần cập nhật khi chạy.
- **Chưa thử trên iPhone thật.**
- Hoãn, cần bạn chọn sau: một cách ghi tiền thống nhất («1,08tr ₫» / «700k ₫» / «1.080.000 ₫»); gộp hẳn thang chữ về 6 bậc (vướng bản vẽ Đăng nhập «tuân thủ 100 %»);
  rút gọn đoạn giải thích dài đầu trang Hoa hồng / Danh bạ / Danh mục (đổi chữ nghiệp vụ). Còn lại: tên tài xế trong cột hẹp của dòng thời gian Điều phối vẫn rút «…»;
  tiêu đề rất dài ở laptop (vd «Điều kiện cho xe chạy») vẫn rút «…».
- Bộ «Design System v2» trên Claude Design chưa xuất bản lại (bản chụp trong kho đã đồng bộ, máy so khớp 0 lệch).

## Cần bạn quyết

1. **Trần dung lượng gói trang Đơn hàng**: mã gốc đã sát trần (dư 24 byte); đợt này thêm 138 byte (dòng tự cuộn thanh bên, tông dải nhắc). Sổ hàng rào ghi nới trần phải
   chờ bạn duyệt. Đề xuất: nới 101.719 → 101.933 byte (theo lệ «số đo + 100»). Không duyệt thì phải bỏ một trong hai tính năng.
2. **Duyệt bản xem trước** (15 ảnh) để chuyển sang bước kiểm độc lập rồi mới lên production — hoặc chỉ ra chỗ muốn sửa.
