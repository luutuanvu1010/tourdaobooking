# Đánh giá khung giao diện Nền tảng — 30/10/2026

> Hồ sơ có ngày: viết xong là đóng băng; có gì mới thì viết tệp mới trỏ về tệp này.
> Phiên đánh giá (vai **kiểm**, không thi công): nhánh `claude/danh-gia-khung-giao-dien`, mã bản 2.48 (`3468fc1`, gồm `main` `6f072ff7`).
> Không sửa mã sản phẩm, không chạm production. Mọi ảnh và số đo lấy trên **máy chủ thử cục bộ, dữ liệu giả** (12 tài khoản thử, ~45 đơn) —
> cách dựng và chạy lại ở `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/README.md`.
> Lời yêu cầu của chủ (nguyên văn): «đánh giá lại toàn bộ khung giao diện … tôi cần giao diện thân thiện, mạch lạc, sang trọng và không gặp những
> lỗi hiển thị kiểu như có nhiều khoảng trống».

---

## 1. Kết luận

**Khung điều hướng đã vững, không cần làm lại từ đầu. Cái làm Nền tảng trông «không mạch lạc, nhiều khoảng trống, chưa sang» nằm ở thân trang:
chưa có luật bố cục chung**, nên trên máy tính nội dung bị kéo giãn về hai mép (giữa là khoảng trống), còn trên điện thoại thì thông tin quan
trọng bị cắt chữ. Thêm vào đó, mỗi màn có quá nhiều tín hiệu cùng to (tiêu đề lặp, nút đỏ khắp nơi, 7–10 cỡ chữ, 9–15 kiểu nút), nên mắt không
biết nhìn vào đâu.

Phần lớn sửa được bằng **một bộ luật bố cục dùng chung** áp ở khung, không phải vẽ lại từng trang và không chạm dữ liệu, quyền hay cách tính tiền.
Sáu ảnh «trước | sau» ở mục 4 dựng bằng một lớp CSS chèn tạm (khoảng 120 dòng) cho thấy mức thay đổi có thể đạt được.

### Bảng điểm (đánh giá chuyên gia, có số đo kèm theo — không phải phép đo tự động)

| Hạng mục | Điểm | Vì sao |
|---|---|---|
| Khung điều hướng (thanh bên, thanh trên, thanh tab) | **7/10** | Đúng mô hình, nhóm gập hợp lý, tab dưới theo vai. Trừ điểm: mục đang mở hay bị khuất, tab sáng nhầm, tên mục khác tên trang |
| Bố cục thân trang trên máy tính | **4/10** | Giãn hai mép, hố trống, khối tóm tắt vỡ chữ ở laptop, ngăn chi tiết trống chiếm nửa màn |
| Điện thoại | **6,5/10** | Có mẫu rất tốt (thanh tổng tiền dính đáy, nút chính to cho tài xế). Trừ điểm: cắt tên khách / số khách / mã đơn, hàng nút cao thấp lệch, dải báo chiếm chỗ |
| Nhất quán thành phần (nút, thẻ, nhãn) | **5/10** | 9–15 kiểu nút mỗi màn; cùng một việc lúc là nút, lúc là chữ gạch chân |
| Chữ và phân cấp thị giác (độ «sang») | **5/10** | 7–10 cỡ chữ mỗi màn, độ đậm thực tế chỉ 500 và 600, mọi thứ cùng màu xanh navy |
| Lời lẽ, hướng dẫn (độ «thân thiện») | **6/10** | Nhãn tiếng Việt tốt; nhưng đầu trang hay có đoạn giải thích dài nhiều thuật ngữ, trạng thái trống không chỉ việc tiếp theo |

### Cái đã tốt — giữ nguyên

- Bảng màu thương hiệu (xanh biển đậm, san hô, cát) trên nền xám xanh với thẻ trắng: sạch, đúng chất du lịch biển.
- Phông Be Vietnam Pro, dấu tiếng Việt chuẩn; ô gõ 16 px nên iPhone không tự phóng to.
- Khung: thanh bên có nhóm gập, thanh tab dưới theo vai với nút Tạo đơn ở giữa, đường dẫn «Đơn hàng › TD-…» trên thanh trên.
- Mẫu đáng nhân rộng: thanh «0 dịch vụ · Tổng 0 ₫ · Lưu» dính đáy ở Tạo đơn trên điện thoại; màn chạy xe của tài xế chỉ một nút chính lớn «Đã tới»;
  bảng Xe trên máy tính gọn, thẳng cột; Điều phối xe có dòng thời gian theo xe.
- Đã có lớp thành phần chung v2 (đợt 0, bản 2.47) — nền móng để áp luật bố cục.

---

## 2. Bảy nguyên nhân gốc

Mỗi nguyên nhân có số đo và ảnh. Ảnh «hiện trạng» ở `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/anh/hien-trang/`.

### G1. Không có lưới bố cục — trên màn rộng, chữ một đầu, nút một đầu, giữa trống

- Phép dò «khối một đầu» (phần có chữ / ô / nút chỉ chiếm ≤ 35 % bề rộng khối): **147 khối trên 35/45 trang ở 1440 px**, 87 khối / 27 trang ở 1040 px.
  Bộ đo lưới 30/10 (`docs/evidence/2026-10-30-luoi-bo-cuc/`) cùng kết luận: hàng có khoảng trống > 240 px ở 17/45 trang (1040) và 28/45 trang (1440),
  khoảng trống phình theo bề rộng màn.
- Ví dụ thấy ngay:
  - **Đơn hàng**: mỗi thẻ đơn chỉ dùng ~400 px bên trái, nhãn trạng thái dạt mép phải, giữa trống ~800 px (`SALES-orders-1440.jpg`).
  - **Chi tiết đơn → Khách hàng**: nhãn «Tên» ở mép trái, giá trị ở mép phải cách 500 px — mắt phải kéo ngang cả thẻ (`SALES-order-1440.jpg`).
  - **Trang chủ**: thẻ «Doanh thu của tôi» kéo hết 1.140 px, biểu đồ chỉ 130 px ở góc phải; cột «Lối tắt» hết nội dung từ giữa trang (`SALES-trang-chu-1440.jpg`).
  - **Sổ công nợ**: ngăn phải rộng ~620 px chỉ có câu «Chọn một bên ở danh sách để xem từng đơn.» (`ACCOUNTING-so-cong-no-1440.jpg`).
  - **Hỗ trợ**: một thẻ 320 px, phần còn lại của màn trống (`SALES-feedback-1440.jpg`).
  - **Trang «Tôi»**: lưới hai cột ép các thẻ thẳng hàng ngang, để lại hố trống hàng nghìn điểm ảnh bên phải (`SALES-account-1440.jpg`).
  - **Danh bạ**: cột «Công việc hôm nay» chiếm ~¼ bảng mà phần lớn ô trống (`SALES-parties-1440.jpg`).
  - **Danh mục dịch vụ**: tên nhóm bên trái, cụm 8 điều khiển dạt mép phải (`ADMIN-catalog-1440.jpg`).

### G2. Lưới «co theo nội dung» — vỡ chữ ở laptop

- **Chi tiết đơn, dải tóm tắt (lỗi hiển thị nặng nhất)**: ở 1040 px, ô «Mã đơn» chiếm ~300 px gần trống, bốn cột Đón / Khách / Số khách / Còn lại bị ép
  còn ~80 px nên chữ xuống dòng **từng từ** («8 / người / lớn, 1 / trẻ / em»), dải cao gần 400 px. Gốc: `.order-summary-band .grid4` dùng
  `repeat(4, auto)` (`public/app.css` dòng 1593), cộng ô Mã đơn lặp mã đã có trên thanh trên. Ảnh: `anh/truoc-sau/01-chi-tiet-don-1040.jpg`.
- **Điều phối xe**: khối chuyến gần nửa đêm bị cắt ở mép phải dòng thời gian («01 4/1»), tên tài xế bị cắt (`SALES-dieu-phoi-1440.jpg`).
- **Quản lý tài khoản**: cột «Tạo lúc» xuống hai dòng trong khi cột bên cạnh một dòng; hàng thao tác bốn liên kết xuống hai dòng (`ADMIN-staff-1440.jpg`).

### G3. Quá nhiều tín hiệu cùng to — mắt không biết nhìn đâu

- **Tên trang lặp** ở 39/45 trang máy tính (bộ đo 30/10); **Sổ công nợ lặp ba lần** (thanh trên, nút tab, tiêu đề lớn); trang «Báo bận» của tài xế đối tác lặp
  cả trên điện thoại. Quyết định cổng 2b (28/10) đã chốt «tên trang chỉ ở thanh trên» nhưng thân trang chưa áp.
- **Đơn hàng có hai ô tìm và hai nút Tạo đơn** cùng lúc (thanh trên + đầu trang). Nút đỏ «Tạo đơn» hiện ở mọi trang của người lập được đơn — **kể cả chính trang Tạo đơn**
  và các trang thiết lập.
- **Đơn chờ xác nhận**: mỗi thẻ có nút đỏ «Kiểm vé» dài 1.126 px, lặp 4 lần trên một màn (`anh/truoc-sau/04-cho-xac-nhan-1440.jpg`).
- **Trang «Tôi» có ba nút «Đăng xuất»** (chân thanh bên, danh sách liên kết, khối máy đăng nhập).
- **Dải «Còn 14 ngày để bật bảo mật hai lớp — Bật ngay»** dùng màu đỏ của lỗi, hiện ở đầu mọi trang, chữ «Bật ngay» lặp hai lần (trong câu và trên nút). Lời nhắc
  còn hai tuần mà dùng màu báo lỗi làm người dùng quen bỏ qua màu đỏ — tới khi có lỗi thật thì không ai để ý.

### G4. Phân cấp chữ và nút yếu — phẳng, «ồn», chưa sang

Số đo (`so-lieu/dem-kieu-1440.txt`, tài khoản Quản trị, 9 trang):

- **7–10 cỡ chữ khác nhau mỗi màn**, trong đó có ba cỡ lẻ 12,8 / 13,6 / 14,4 px còn sót từ kiểu cũ (`--fs-old-*`, ngoài thang). Thang token có tới 14 bậc
  từ 12 tới 32 px, mỗi bậc cách nhau 1–2 px — quá sát để mắt phân biệt vai trò.
- **Độ đậm thực tế chỉ 500 và 600**: token «semibold» = 500 (bằng «medium»), «bold» = «heavy» = 600 (`public/app.css` dòng 415–420). Tiêu đề, nhãn, nút
  chỉ khác nhau rất nhẹ.
- **9–15 kiểu nút mỗi màn** (Tạo đơn: 15). Một hệ thống cao cấp thường chỉ 3–4: nút chính đặc, nút phụ viền, nút chữ, nút nguy hiểm.
- **Mọi thứ cùng màu xanh navy**: tiêu đề trang, tiêu đề từng thẻ, liên kết, nút viền, số liệu — nên không còn màu nào báo «chỗ này bấm được».
- **Liên kết gạch chân dày** làm nút trong bảng (Quản lý tài khoản: «Sửa · Đặt lại PIN · Tắt bảo mật hai lớp · Ngưng»; Danh mục: «Đổi tên · Lên · Xuống · Tắt»)
  — dáng web đời cũ.
- **Cách ghi tiền chưa thống nhất**: «1.080.000 ₫», «1,08tr ₫», «700k ₫», «38,15tr ₫», và «1.650.000» không có ₫ ở danh sách dịch vụ của Tạo đơn.

### G5. Điện thoại: cắt mất thông tin quan trọng

Phép dò «chữ bị cắt» (`so-lieu/loi-hien-thi.json`): **244 chỗ chữ bị cắt thật** trên 45 trang × 3 khổ (đã loại tiêu đề ẩn cho trình đọc màn hình).

- **Tên và vai của chính người dùng ở chân thanh bên bị cắt trên cả 45 trang máy tính** (178 chỗ): «Toàn Qu…», «Quản trị · …» — vì nút «Đăng xuất» đứng cùng hàng.
- **Đơn hàng trên iPhone**: tên khách bị cắt («Ng…», «Hồ…») vì nhãn trạng thái chiếm cùng dòng; **số khách «2NL» bị cắt thành «2I» / «2N»** (cố ý cho phép co trong
  mã, nhưng làm sai nghĩa); số tiền cũng bị cắt khi dòng dài (`anh/truoc-sau/03-danh-sach-don-390.jpg`). Cùng lỗi ở danh sách của hướng dẫn viên (`FIELD-orders-390.jpg`).
- **Mã đơn trên thanh trên bị cắt** «TD-20261030-0…» ở Chi tiết đơn (điện thoại và 1040 px) — đúng thứ người dùng cần đọc cho khách qua điện thoại.
- **Hàng nút cao thấp lệch**: Chi tiết đơn trên iPhone có ba nút ba chiều cao (2 dòng / 3 dòng / 1 dòng) (`SALES-order-390.jpg`).
- Trang Nhật ký tràn ngang ở 390 px (ô chọn rộng 546 px).
- **Ô ngày giờ hiện kiểu Mỹ** «10/30/2026, 06:42 PM» trên trình duyệt máy thử (Báo bận, Tạo đơn, Bảng kê xe…). Trình duyệt tự chọn kiểu theo ngôn ngữ máy, nên
  iPhone để tiếng Việt sẽ hiện đúng 30/10, nhưng máy tính Windows/Chrome tiếng Anh sẽ hiện tháng trước ngày — **chưa kiểm trên máy thật**.

### G6. Không biết mình đang ở đâu

- **Thanh bên không tự cuộn tới mục đang mở.** Laptop 1366×768 (trình duyệt còn ~650 px chiều cao): **19/32 trang của Toàn quyền và 6/14 trang của Kế toán**
  có mục đang mở nằm khuất dưới phần chân thanh bên (`so-lieu/thanh-ben-1366x650.txt`).
- **Thanh tab sáng nhầm «Tôi»** ở các trang không có trên thanh tab (ví dụ Bảng kê chi phí xe — `ACCOUNTING-bang-ke-xe-cuoi-390.jpg`).
- **Tên mục menu khác tên trang**: «Xe & giấy tờ» → trang «Xe»; «Sổ công nợ & khoá sổ» → «Sổ công nợ»; «Dịch vụ & giá» → tiêu đề «Danh mục dịch vụ & giá» →
  đường dẫn «Dịch vụ»; «Của tôi» (thanh bên) ↔ «Tôi» (trang, tab).
- **Tạo đơn**: thanh bước ghi 4 bước (Khách · Dịch vụ · Thanh toán · Phụ trách) nhưng trang có thêm khối «Hành khách» không nằm trong bước nào; thứ tự khối
  trên máy tính (… Thanh toán → Hành khách) khác điện thoại (… Hành khách → Thanh toán).

### G7. Chưa «thân thiện» ở những chỗ nhạy cảm

- **Đoạn giải thích dài nhiều thuật ngữ ở đầu trang** thay cho hướng dẫn ngắn: Hoa hồng đối tác (khung vàng 5 dòng, «mức riêng hay cấp riêng», «Ghi mức tay»),
  Danh bạ («Mục "Công việc tại đâu" chỉ để ghi và tìm…»), Danh mục dịch vụ.
- **Việc nguy hiểm đứng sát việc thường**: «Huỷ đơn» cạnh «Sửa thông tin chuyến»; «Tắt bảo mật hai lớp», «Ngưng» là liên kết đỏ trong cùng hàng với «Sửa».
- **Nút xám không nói vì sao**: «Lưu khung bận» (tài xế đối tác), «Kết thúc chuyến» (màu san hô nhạt trông như lỗi), «Đã giao – đã thu đủ».
- **Trạng thái trống chỉ là một dòng chữ xám**, không có việc tiếp theo: «Chưa có cấp đại lý nào.», «Không có phiếu nào đang chờ xác minh» (khối này vẫn chiếm
  cả một thẻ lớn đầu trang Quản lý tài khoản).

---

## 3. Danh sách lỗi hiển thị cần sửa — xếp theo ưu tiên

**Ưu tiên 1 — lỗi thấy ngay, sửa nhỏ, đảo ngược được** (CSS và vài dòng giao diện; không chạm dữ liệu, quyền, cách tính tiền).

| # | Trang · khổ | Lỗi | Gốc (cho người thi công) | Cách sửa |
|---|---|---|---|---|
| 1 | Chi tiết đơn · 900–1200 px | Dải tóm tắt vỡ chữ từng từ | `.order-summary-band .grid4 { repeat(4, auto) }` + ô Mã đơn | 4 cột `minmax(0,1fr)`; mã đơn + trạng thái thành hàng trên (ảnh 01) |
| 2 | Đơn hàng · điện thoại | Cắt tên khách, «2NL»→«2I», cắt số tiền | `.order-row-pax` được co; `.order-card-line2 {nowrap; overflow:hidden}`; nhãn trạng thái cùng dòng tên | Không cắt tên / số khách / tiền; dòng 2 được xuống hàng; nhãn trạng thái dòng riêng (ảnh 03) |
| 3 | Mọi trang · máy tính | Tên, vai người dùng ở chân thanh bên bị cắt | `.sidebar-name/.sidebar-role` nowrap + «Đăng xuất» cùng hàng | Cho xuống dòng; «Đăng xuất» hàng riêng hoặc biểu tượng |
| 4 | 19/32 trang Toàn quyền · laptop | Mục đang mở khuất ở thanh bên | Thanh bên không cuộn tới mục `aria-current` | Khi dựng thanh bên: cuộn mục đang mở vào giữa phần thấy được |
| 5 | Chi tiết đơn · máy tính | «Xem biên nhận» rơi dòng riêng; «Huỷ đơn» sát nút sửa | Hai khối `#actions`, `#send` riêng | Một thanh công cụ: việc sửa trái, «Huỷ đơn» tách phải (ảnh 01) |
| 6 | Chi tiết đơn · điện thoại, 1040 | Mã đơn trên thanh trên bị cắt | `.bar-title` ellipsis | Rút chữ «Đơn hàng ›» ở khổ hẹp, ưu tiên mã đơn |
| 7 | 39/45 trang · máy tính; Báo bận · điện thoại | Tên trang lặp 2–3 lần | Quyết định cổng 2b chưa áp vào thân trang | Ẩn tiêu đề lớn trong thân (giữ cho trình đọc màn hình) — đúng quyết định đã chốt |
| 8 | Sổ công nợ · máy tính | Ngăn chi tiết trống chiếm nửa màn | Chưa chọn bên nào thì vẫn dựng ngăn | Tự chọn bên đầu danh sách, hoặc ẩn ngăn tới khi chọn |
| 9 | Đơn chờ xác nhận · máy tính | Nút đỏ 1.126 px lặp mỗi thẻ | Nút `.cx-ds-nut` là ô của lưới một cột `.cx-the` nên giãn hết bề rộng thẻ | Nút cỡ vừa, đứng cạnh thông tin (ảnh 04) |
| 10 | Trang «Tôi» · máy tính | Hố trống; 3 nút Đăng xuất | Lưới 2 cột ép hàng | Xếp thẻ kín hai cột kiểu cột báo, tự về 1 cột ở màn hẹp (ảnh 05); giữ 1 nút Đăng xuất |
| 11 | Trang chủ · máy tính | Thẻ doanh thu giãn, biểu đồ tí hon | Biểu đồ cố định `--w-home-chart: 132px` trong thẻ rộng hết hàng | Biểu đồ giãn theo thẻ (tối đa ~560 px) (ảnh 06) |
| 12 | Hoa hồng · máy tính | Ô «— Chọn dịch vụ —» rơi dòng dưới; khung cảnh báo dính sát tiêu đề và thẻ dưới | Lưới `.hh-tn-form`; thiếu khoảng cách khối | Gộp ô gõ và ô chọn dịch vụ; khoảng cách khối theo thang |
| 13 | Điều phối xe · máy tính | Khối chuyến cuối ngày bị cắt mép phải | Trục giờ không chừa lề phải | Chừa lề bằng bề rộng khối nhỏ nhất |
| 14 | Nhật ký · 390 | Tràn ngang | Ô chọn rộng 546 px | `max-width: 100%` |
| 15 | Thanh tab · điện thoại | Sáng nhầm «Tôi» | Trang ngoài tab rơi về mục mặc định | Không sáng mục nào, hoặc sáng đúng nhóm |

**Ưu tiên 2 — bố cục theo luật chung** (mục 5): danh sách thành bảng trên máy tính (Đơn hàng, Danh bạ, Quản lý tài khoản, Chờ xác nhận), nhãn–giá trị
sát nhau, gom nút theo thang ba cấp, đưa việc nguy hiểm vào menu «Thêm…», bỏ cột trống, trạng thái trống có việc tiếp theo, hàng nút điện thoại đều chiều cao.

**Ưu tiên 3 — tinh chỉnh «sang»** (chạm token, cần chủ duyệt — mục 7 câu 3): thang chữ gọn, ba độ đậm thật, tiêu đề màu chữ chính, dải nhắc nhở màu cát,
cách ghi tiền thống nhất, rút gọn đoạn giải thích đầu trang.

---

## 4. Minh hoạ «trước | sau»

Sáu ảnh ở `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/anh/truoc-sau/`. Bên trái là bản 2.48 hiện tại; bên phải là **cùng trang, cùng dữ liệu**,
chỉ chèn thêm lớp CSS minh hoạ `kich-ban/minh-hoa-sau.css`. Lớp này viết nhanh để chụp ảnh, **không phải mã thi công** (giá trị viết thẳng px, chưa qua token,
chưa chạy kịch bản Chrome theo `web/CLAUDE.md`).

| Ảnh | Đổi gì |
|---|---|
| `01-chi-tiet-don-1040.jpg` | Dải tóm tắt 4 cột đều, hết vỡ chữ; một hàng nút, «Huỷ đơn» tách phải; nhãn–giá trị sát nhau; tên người dùng ở chân thanh bên hiện đủ |
| `02-danh-sach-don-1440.jpg` | Thẻ «chữ trái – nhãn phải» thành bảng thẳng cột: ngày · khách · điện thoại · số khách · còn thu · trạng thái |
| `03-danh-sach-don-390.jpg` | Tên khách, «2NL», số tiền hiện đủ; nhãn trạng thái luôn cùng một chỗ |
| `04-cho-xac-nhan-1440.jpg` | Nút «Kiểm vé» cỡ vừa đứng cạnh thông tin, không còn bốn thanh đỏ dài |
| `05-trang-toi-1440.jpg` | Thẻ xếp kín hai cột, hết hố trống |
| `06-trang-chu-1440.jpg` | Biểu đồ doanh thu giãn theo thẻ thay vì 130 px ở góc |

---

## 5. Mười luật khung đề xuất (để mọi trang mới tự đúng)

1. **Một trang, một tiêu đề** — tên trang ở thanh trên (đã chốt ở cổng 2b); thân trang không lặp.
2. **Ba khuôn bề rộng, không trang nào tự đặt**: đọc & biểu mẫu ≤ 760 px; danh sách & bảng: hết cột (≤ 1280 px); chi tiết: hai cột 2/3 + 1/3, cột phụ dính khi cuộn.
3. **Máy tính từ 1100 px: danh sách là bảng thẳng cột; dưới 900 px: thẻ.**
4. **Nhãn và giá trị đứng sát nhau** (lưới hai cột, nhãn ~160 px). Cấm «nhãn mép trái, giá trị mép phải» trong khối rộng hơn 480 px.
5. **Cột dữ liệu chia đều** (`minmax(0, 1fr)`); không để cột co về bề rộng một từ.
6. **Không bao giờ cắt thông tin định danh**: tên người, mã đơn, số khách, số tiền — được xuống dòng; chỉ địa chỉ và ghi chú mới được rút «…».
7. **Thang nút ba cấp**: mỗi vùng tối đa một nút đặc; nút viền cho việc phụ; còn lại là chữ. San hô chỉ cho một hành động chốt mỗi màn.
   Việc nguy hiểm (Huỷ, Ngưng, Tắt bảo mật) tách xa hoặc vào menu «Thêm…», luôn hỏi lại kèm hậu quả.
8. **Màu có nghĩa**: tiêu đề dùng màu chữ chính; xanh navy chỉ cho thứ bấm được hoặc đang chọn; đỏ chỉ cho lỗi thật; nhắc nhở dùng màu cát.
9. **Vùng chỉ hiện khi có nội dung**: ngăn chi tiết tự chọn dòng đầu hoặc ẩn; khối trống có một câu + một nút đi tiếp; cột bảng trống quá nửa thì bỏ.
10. **Luôn biết mình đang ở đâu**: thanh bên tự cuộn tới mục đang mở; tên mục menu trùng tên trang; thanh tab không sáng nhầm.

**Rào máy đi kèm** (để lỗi không quay lại): đưa kịch bản dò `kich-ban/do-loi-hien-thi.js` vào bộ kiểm giao diện với ngưỡng: chữ định danh bị cắt = 0, tràn ngang = 0,
mục thanh bên đang mở thấy được ở 100 % trang (khổ 1366×650). Theo luật dự án, rào chỉ được coi là hoạt động sau khi đã quan sát nó chặn thật một lần.

---

## 6. Lộ trình đề xuất (theo đợt, không kèm thời hạn)

Quan hệ với chương trình đang có: chủ đã **tạm gác thiết kế lại** (BACKLOG §55: đợt 0b khung tải chưa gộp, Chặng 3 lưới bố cục chưa gửi Claude Design).
Đợt 1 dưới đây là **sửa lỗi hiển thị**, không phải thiết kế lại, nên làm độc lập được; đợt 2–3 có thể thay cho, hoặc trở thành đầu vào của, đề bài lưới bố cục 1b
khi Chặng 3 mở lại — mười luật ở mục 5 trả lời đúng câu hỏi đề bài đó đặt ra.

**Đợt 1 — Sửa lỗi hiển thị** (15 mục Ưu tiên 1 ở mục 3)
- Việc: CSS ở khối thành phần chung + vài dòng giao diện (thanh bên cuộn tới mục mở, tự chọn bên ở Sổ công nợ, gộp hàng nút Chi tiết đơn).
- Lưu ý luật dự án: mục 1, 2 chạm **chỗ hiển thị tiền** (dải tóm tắt, «Còn thu») ⇒ coi là việc lớn, cần người kiểm độc lập chỉ đọc; chạy lại đúng các kịch bản Chrome
  ở bảng của `web/CLAUDE.md` cho từng tệp bị sửa.
- Tiêu chí nghiệm thu đo được (chạy lại `kich-ban/` của phiên này): chữ bị cắt thật 244 → chỉ còn địa chỉ / ghi chú; tiêu đề lặp 39/45 → 0; mục thanh bên đang mở thấy
  được 13/32 → 32/32 trang (Toàn quyền, 1366×650); tràn ngang ở 390 = 0; dải tóm tắt Chi tiết đơn không cột nào hẹp hơn 140 px ở 900–1440 px.

**Đợt 2 — Áp luật khung** (Ưu tiên 2)
- Việc: áp luật 2–5, 7, 9 cho năm khuôn trang; chuyển danh sách sang bảng trên máy tính; gom nút; trạng thái trống.
- Tiêu chí: khối «một đầu» ở 1440 px 147 → dưới 40; kiểu nút mỗi màn ≤ 5; ảnh so sánh trước / sau theo cổng phát hành (cổng 2b mục B) và chủ duyệt.

**Đợt 3 — Tinh chỉnh «sang»** (Ưu tiên 3, cần chủ duyệt token)
- Việc: thang chữ 6 bậc (12 / 14 / 16 / 18 / 24 / 32), ba độ đậm thật (400 / 500 / 600–700), tiêu đề màu chữ chính, dải nhắc nhở màu cát khi còn xa hạn,
  một cách ghi tiền, rút gọn đoạn giải thích đầu trang, bỏ gạch chân liên kết trong bảng.
- Tiêu chí: cỡ chữ mỗi màn ≤ 6; không còn cỡ lẻ ngoài thang.

---

## 7. Cần chủ quyết (ba câu)

1. **Có làm ngay Đợt 1 «sửa lỗi hiển thị» trong khi thiết kế lại vẫn gác không?**
   - A. Làm ngay — nhỏ, đảo ngược được, hết các lỗi người dùng đang thấy hằng ngày. **(khuyến nghị)**
   - B. Gộp vào Chặng 3 khi mở lại — đỡ một lượt phát hành, nhưng lỗi còn nguyên tới lúc đó.
   - C. Để nguyên.
2. **Danh sách trên máy tính chuyển sang dạng bảng thẳng cột** (như ảnh 02) cho Đơn hàng, Danh bạ, Quản lý tài khoản, Chờ xác nhận?
   - A. Có — quét mắt nhanh, hết khoảng trống giữa. **(khuyến nghị)**
   - B. Giữ thẻ, chỉ gom nội dung lại gần nhau — ít đổi thói quen hơn, vẫn còn trống ở màn rộng.
3. **Tinh chỉnh «sang» chạm token** (thang chữ, độ đậm, màu tiêu đề, màu dải nhắc nhở) — các giá trị này thuộc nhóm token chủ duyệt.
   - A. Duyệt cả gói như mục 6 đợt 3. **(khuyến nghị)**
   - B. Thử trước trên ba màn (Trang chủ, Đơn hàng, Chi tiết đơn) rồi mới quyết.
   - C. Giữ nguyên.

Ghi nhận, chưa đưa vào ba câu trên (chạm nghiệp vụ, cần chủ quyết riêng khi tiện): thứ tự sắp xếp Đơn hàng của hướng dẫn viên (đơn đã xong / đã huỷ đứng trước,
đơn sắp đi nằm cuối); cách ghi tiền rút gọn («1,08tr ₫» hay «1.080.000 ₫») — câu này đã có trong danh sách hỏi của đánh giá 27/10.

---

## 8. Giới hạn của đánh giá này

- Một bộ dữ liệu giả (trạng thái «nhiều»); chỉ trạng thái lúc mở trang — hộp thoại, bảng trượt, biểu mẫu mở bằng nút chưa được quét.
- Chrome trên máy chủ thử, không phải iPhone thật: vùng an toàn, bàn phím iOS, kiểu hiện ô ngày giờ theo ngôn ngữ máy **chưa kiểm**.
- Bảng điểm mục 1 là đánh giá chuyên gia; các con số đi kèm là đo thật.
- Phép dò «khối một đầu» cũng đếm cả hàng tiêu đề bảng và hàng «tiêu đề – nút» đầu trang (hai kiểu chấp nhận được ở màn vừa), nên chỉ dùng làm chỉ số so trước / sau,
  không phải danh sách lỗi.
- Không đo lại tốc độ tải (đã có ở đánh giá 27/10 và đợt 0b).
- Hồ sơ liên quan đọc trước khi viết: `docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/BAO-CAO.md`,
  `docs/superpowers/specs/2026-10-29-tai-cau-truc-giao-dien/BAN-GIAO.md`, `docs/evidence/2026-10-30-luoi-bo-cuc/README.md`, BACKLOG §51, §53, §54, §55.
