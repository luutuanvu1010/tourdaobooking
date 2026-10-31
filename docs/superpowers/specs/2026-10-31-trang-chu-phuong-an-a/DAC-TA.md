# Đặc tả: Trang chủ máy tính theo Phương án A

Ngày 2026-10-31. Trạng thái: **chủ đã duyệt 2026-10-31** (xem cuối mục 8). Bản vẽ xem thử: artifact `TN9vcRmkBg5MDPXaWf1gJ7`. Thi công ở nhánh `thi-cong-trang-chu-a`.

## 1. Mục tiêu

Trang chủ máy tính hiện xếp hơn mười khối cùng cỡ từ trên xuống, nên người mở trang buổi sáng không biết việc nào gấp. Phương án A trả lời một câu: «Hôm nay tôi cần làm gì ngay?». Việc gấp lên đầu, chuyến đón chiếm cột lớn, các khối chờ gom vào một thẻ ở cột phụ. Điện thoại giữ bản vẽ kiểu MoMo đã duyệt, không đổi hình dạng.

## 2. Bố cục (máy tính, từ 1100 px; dưới đó một cột theo thứ tự đọc)

```
Chào buổi sáng, <tên>   [viên bảo trì] [nhãn vai]
[ Dải việc gấp: «3 đơn chờ xác nhận, 1 đơn quá 2 giờ»  [Xác nhận ngay] ]  <- ẩn hẳn nếu không gấp
+-------------------------------------+-----------------------+
| Chuyến đón hôm nay (2/3)            | Đang chờ bạn (1/3)    |
|  Hôm nay | Ngày mai | Ngày kia      |  Chờ xác nhận      3  |
|  giờ | khách + số khách | điểm đón  |  Chờ đối chiếu     2  |
|  + dịch vụ | trạng thái (+ còn thu) |  Thu trước đơn huỷ 1  |
|  ...mỗi chuyến một dòng thẳng cột   +-----------------------+
|                                     | Doanh thu tuần này    |
| (Cần xem lại: giữ nguyên, Quản trị) |  biểu đồ GIÃN theo thẻ|
+-------------------------------------+-----------------------+
Lối tắt: một dãy gọn một hàng, cuối dãy «Tất cả»
```

Dải việc gấp dùng **một** nút san hô, là nút chốt duy nhất của màn (luật 7). Bảng «Chuyến đón» là bảng thẳng cột, tên khách, số khách và tiền được xuống dòng, chỉ địa chỉ đón mới được rút «…» (luật 3, 6). Các dòng trong «Đang chờ bạn» là liên kết có số, bấm mở trang xử lý; dòng có số 0 thì ẩn, thẻ không còn dòng nào thì ẩn cả thẻ và cột phụ chỉ còn thẻ doanh thu (luật 9). Biểu đồ doanh thu cao theo thẻ (chiều cao tối thiểu là một token mới, không còn cố định bằng `--h-chart`).

## 3. Quy tắc dải việc gấp

Dải hiện khi có ít nhất một đơn chờ xác nhận thoả **một trong hai**: đã chờ quá 2 giờ kể từ lúc gửi; hoặc ngày đi là hôm nay hay ngày mai. Không đơn nào thoả thì dải ẩn hẳn, không để chỗ trống. Câu trên dải đếm theo thứ tự: tổng đơn chờ, rồi số đơn quá 2 giờ. Nút «Xác nhận ngay» mở trang `/cho-xac-nhan`. Chỉ người giữ quyền xét duyệt xác nhận đơn mới thấy dải, vì chỉ họ gọi được danh sách chờ. Cách hiểu «khách đi trong 2 ngày» (đơn chờ có ngày đi sớm) cần chủ xác nhận, xem mục 8.

## 4. Khối nào hiện cho vai nào

Không đổi quyền. Mỗi dòng giữ nguyên cổng đang dùng: «Chờ xác nhận» cho người có ô xét duyệt xác nhận đơn; «Chờ đối chiếu» cho người có ô ghi sổ tiền và không giữ quyền Đối tác; «Thu trước đơn huỷ» cho người xem được sổ tiền và không giữ quyền Đối tác; «Doanh thu tuần này» chỉ cho người lập được đơn. Chuyến đón vẫn cần ba ô xem đơn, xem tiền, xem liên hệ như hiện nay. Vai không có quyền thì dòng không được dựng, và máy chủ không trả số cho họ.

## 5. Dữ liệu và máy chủ

**Không cần migration, không đổi cách tính tiền.** Chuyến đón đã đủ trường (giờ đón, nơi đón, số khách, dịch vụ, trạng thái) trong dữ liệu Trang chủ hiện có. Ba số của «Đang chờ bạn» đã tải sẵn từ ba nguồn đang dùng.

Có **một chỗ phải sửa máy chủ**, rủi ro nhỏ: danh sách chờ xác nhận (`GET /api/orders/cho-xac-nhan`) trả `hanLuc` (hạn) nhưng **không trả lúc gửi**. Hạn không cố định 15 phút (đổi theo giờ trong ngày), nên không thể suy ngược «quá 2 giờ» từ hạn một cách chắc chắn. Cần thêm trường `guiLuc` (đã có sẵn trong cột `submitted_at`) vào kiểu `DonChoXacNhanDto` và vào route. Đây là thêm trường, không đổi dữ liệu cũ, không đụng migration; vẫn thuộc «hợp đồng giữa các phần» nên cần chủ duyệt (quyết định 3) và test đỏ trước. Ngày đi của đơn chờ đã có (`ngayDi`).

## 6. Tệp sẽ sửa

Giao diện: `public/index.html`, `web/home.ts`, `public/app.css` (phần `dash-*`; giá trị mới vào token ở đầu tệp), khung xương lúc tải cho cùng bố cục. Luật thuần mới, có test cạnh tệp: `src/shared/viec-gap.ts` (nhận danh sách chờ và giờ hiện tại, trả có hiện dải không và câu chữ), chỉ `web/home.ts` được import, giống `viec-cua-ban.ts`. Máy chủ: `src/shared/contracts.ts` và `src/modules/orders/xac-nhan-route.ts` (thêm `guiLuc`). Không chạm `web/shell.ts`, `muc-giao-dien.ts`, `bang-tin.ts`, vì gói Đơn hàng chỉ còn dư rất ít so với trần (`TRAN_ORDERS` trong `src/goi-trang-nhe.test.ts`); gói Trang chủ không có trần riêng nhưng không được kéo mã mới vào gói Đơn hàng.

## 7. Cách kiểm và rủi ro

Kiểm bằng máy: test thuần cho luật dải (đúng 2 giờ, đúng biên hôm nay/ngày mai, không đơn, vắng quyền); test có sẵn cần sửa vì cấu trúc đổi: `src/viec-cua-ban-trang-chu.test.ts` (ép chuỗi mã trong `web/home.ts`), `src/muc-giao-dien-hien-trang.test.ts`, `src/token-giao-dien.test.ts` (không giá trị viết cứng trong CSS), `src/shared/viec-cua-ban.test.ts` nếu đổi thẻ. Kiểm bằng Chrome: chạy `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/do-loi-hien-thi.js` ở các khổ 1366×650, 1440×900, 1100 và 900 px, cho các vai Quản trị, Điều phối, Kế toán, Nhân viên lập đơn, Hướng dẫn viên. **Ngưỡng: chữ định danh bị cắt = 0, tràn ngang = 0**, mục thanh bên đang mở thấy được; kèm một lần quan sát rào chặn thật. Rủi ro chính: (a) tài khoản thật có nhiều dòng chờ làm cột phụ dài hơn cột chuyến đón, cần thử với dữ liệu nhiều; (b) dải việc gấp nhảy hiện sau khi trang đã vẽ, nên dải phải nằm trong khung xương để không đẩy bố cục; (c) bỏ dòng thời gian trang trí của khối chuyến đón để lấy chỗ cho bảng thẳng cột (thông tin giờ đã có trong từng dòng).

## 8. Cần chủ duyệt

1. **Nghĩa của «khách đi trong 2 ngày».** Nếu hiểu là mọi khách đi hôm nay hoặc ngày mai thì dải gần như ngày nào cũng hiện, trái luật «vùng chỉ hiện khi có nội dung». *Khuyến nghị:* chỉ tính **đơn đang chờ xác nhận** mà ngày đi là hôm nay hoặc ngày mai.
2. **Số phận bốn thẻ «Việc của bạn» hiện nay** (Đơn nháp, Còn thiếu tiền, Chưa có người phụ trách, Điều chỉnh công nợ, Góp ý…). Bản vẽ không có chỗ cho chúng. *Khuyến nghị:* thành các dòng thêm trong «Đang chờ bạn» (cùng luật dòng 0 thì ẩn, cùng cổng quyền), thay cho bốn thẻ lớn; khối «Cần xem lại» của Quản trị giữ nguyên dưới cột chuyến đón.
3. **Thêm trường `guiLuc` vào danh sách chờ xác nhận** (mục 5): sửa máy chủ nhỏ, không migration. *Khuyến nghị:* đồng ý; nếu không, dải chỉ dùng được điều kiện «đi trong 2 ngày» và bỏ «quá 2 giờ».

**Bản duyệt (2026-10-31).** Sau khi đọc đặc tả và ba khuyến nghị trên, chủ dự án nói «viết đi», tức là duyệt cả ba quyết định theo khuyến nghị: (1) dải việc gấp chỉ tính đơn đang chờ xác nhận có ngày đi là hôm nay hoặc ngày mai, hoặc đã chờ quá 2 giờ kể từ lúc gửi, không có thì ẩn; (2) các thẻ «Việc của bạn» cũ thành dòng trong thẻ «Đang chờ bạn», giữ nguyên cổng quyền theo vai, khối «Cần xem lại» của Quản trị giữ nguyên; (3) thêm trường `guiLuc` (từ cột `submitted_at`, đọc-thêm, không migration) vào `DonChoXacNhanDto` và route `xac-nhan-route.ts`. Điện thoại giữ bản vẽ kiểu MoMo, không làm lại.
