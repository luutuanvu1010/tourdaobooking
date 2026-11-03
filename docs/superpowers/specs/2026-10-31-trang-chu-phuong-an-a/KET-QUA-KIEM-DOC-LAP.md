# Kết quả kiểm độc lập: Trang chủ máy tính Phương án A

Ngày 2026-10-31. Người kiểm: phiên kiểm độc lập, chỉ đọc mã sản phẩm (không sửa mã, không đẩy, không gộp, không triển khai). Đối tượng: nhánh `thi-cong-trang-chu-a`, commit cuối `b1955c75`, so với đặc tả `DAC-TA.md` (commit `36ac132a`) và bản vẽ xem thử. Báo cáo và số liệu của người thi công không được tin: mọi số dưới đây là đo lại trong worktree riêng `kiem-trang-chu-a` (và một worktree `main` `e05963c5` để so). Không đọc `.env`, không dùng khoá bí mật; kịch bản Chrome chạy trên D1 tạm cục bộ.

## Kết luận: ĐẠT CÓ ĐIỀU KIỆN

Không có lỗi chặn phát hành trong mã. Test 6896/6900 đạt (0 đỏ, 4 «todo» sẵn có), typecheck sạch, gói Đơn hàng không đổi một byte, luật dải đúng quyết định chủ, quyền và tiền không đổi. Điều kiện là việc của chủ chứ không phải của mã: (1) chủ nhìn ảnh và duyệt thẩm mỹ, đặc biệt dải việc gấp màu cát thay vì san hô như bản vẽ; (2) chủ biết 12 mục «nút khuất» là nợ SẴN CÓ của thanh bên trên `main`, nhánh này không gây ra và không làm nặng thêm.

## Từng mục

**1. Test, typecheck, gói. ĐẠT.**
- `npm test`: `# tests 6900 / pass 6896 / fail 0 / skipped 0 / todo 4`, thoát mã 0 (~240 giây).
- `npm run typecheck` (ba lượt `tsc`): thoát mã 0, không lỗi.
- Gói `web/orders.ts` đo bằng esbuild cùng cấu hình bài `goi-trang-nhe`: nhánh 102.454 byte, `main` 102.454 byte, trần 102.554. Bằng nhau, dư 100 byte. Gói này không chứa `viec-gap` lẫn `viec-cua-ban`. `web/home.ts` tăng 116.660 → 116.990 (+330) và là nơi duy nhất nhập `viec-gap` (có bài khoá).
- Cây sạch sau `build:web`, không tệp sinh ra lệch.

**2. Đọc diff `36ac132a..b1955c75` cho mã sản phẩm. ĐẠT.**
- (a) Luật dải (`src/shared/viec-gap.ts`): đúng quyết định chủ. Gấp = đơn đang chờ xác nhận có ngày đi hôm nay hoặc ngày mai (tính theo giờ Việt Nam bằng `vnToday`/`addDays`) HOẶC chờ lâu hơn 2 giờ (`nowMs - guiLuc > 2 giờ`, đúng 2 giờ chưa quá). Không đơn gấp thì ẩn hẳn. Chuỗi `guiLuc` hỏng thì không tính là quá (không đoán). Bài có biên 2 giờ ±1 ms, biên hôm nay/ngày mai, 00:30 sáng giờ VN, 1024 tập quyền.
- (b) `guiLuc`: chỉ thêm một trường từ cột có sẵn `submitted_at` vào `DonChoXacNhanDto` và một dòng ở `xac-nhan-route.ts`; không migration, không sửa dữ liệu cũ. Route vẫn chặn 403 với ai không giữ `order.confirm.review` (dòng đầu route không đổi); bài `xac-nhan-doc` thêm một dòng khẳng định `guiLuc` = `submitted_at` và vẫn khẳng định danh sách không lộ tên/SĐT/email. Trường chỉ là một mốc thời gian, mang ít thông tin hơn `hanLuc` đã có.
- (c) Quyền: dòng «Chờ xác nhận» vẫn cổng `order.confirm.review`; hai dòng mới «Chờ đối chiếu» và «Thu trước đơn huỷ» dùng đúng hàm gốc của hai khối cũ (`coKhoiChoDoiChieu`, `coKhoiThuTruoc`), bài mới `viec-cua-ban-doi-chieu.test.ts` so khớp trên cả 1024 tập quyền và khẳng định người giữ quyền Đối tác không thấy; thẻ doanh thu vẫn cổng `coOSoCuaToi`; các hàm tải số trả `undefined` khi vắng cổng nên không gọi nguồn. Không vai nào thấy thêm số liệu so với trước.
- (d) Tiền: không đụng cách tính; chỉ đổi bố cục. Số «còn lại» vẫn hiện, đo ở 5 chuyến có tên dài, địa chỉ dài và số tiền 12.345.000: `tenCat` (tên/tiền bị cắt) = 0 ở mọi lượt.
- (e) Token: rà các dòng thêm của `public/app.css`: mọi giá trị px, màu mới nằm ở khối `:root` (`--w-home-side-sm`, `--w-trip-gio`, `--w-trip-tien`, `--h-chart-min/max`, `--w-loi-tat-o`); ngoài `:root` chỉ dùng biến. Bài `token-giao-dien` nằm trong bộ test đã đạt.
- (f) Test sửa không bị nới: đối chiếu cũ/mới thì các bài I-1…I-5 giữ nguyên ý, chỉ đổi tên hàm/mã neo (`theViec` → `dongDangCho`, `dash-viec` → `dash-dang-cho`); số khoá thẻ 8 → 10 và danh sách `nguonCanTai` của Kế toán thêm hai nguồn là hệ quả đúng của hai dòng mới; có thêm bài mới (khung 7 nút san hô duy nhất, dải dựng cùng lúc với lưới, bảng thẳng cột, biểu đồ giãn). Điểm đáng ghi: một khẳng định cũ («nút Tạo đơn san hô ở trạng thái rỗng») được đổi thành khẳng định NGƯỢC LẠI (nút đã bỏ) vì luật «một nút san hô»; đó là thay đổi có chủ đích theo đặc tả, không phải nới cho qua.
- Ghi chú nhỏ: bản chép thiết kế `docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/ds-v2/components/bundle.css` (hồ sơ có ngày) bị sửa 7 dòng ở mục [11]; nên xác nhận đó là nguồn thiết kế còn sống chứ không phải hồ sơ đóng băng.

**3. Đối chiếu đặc tả. ĐẠT, lệch nhỏ.** Mọi điểm chính đúng: dải việc gấp đầu trang + nút «Xác nhận ngay» tới `/cho-xac-nhan`; bố cục hai cột từ 1100 px (một cột dưới đó); «Đang chờ bạn» là danh sách dòng có số, số 0 thì ẩn, hết dòng thì ẩn thẻ; bảng chuyến ba cột thẳng cột, chỉ địa chỉ đón mới có thể rút, không «…» ở tên/tiền; biểu đồ giãn theo thẻ bằng token mới; «Cần xem lại» giữ nguyên; điện thoại không đổi (đo 390 px: không dải, không thẻ mới, `#dash-so` bốn ô, không tràn); khung xương cùng bố cục; không đổi `shell.ts`/`muc-giao-dien.ts`. Lệch tìm thấy ngoài danh sách của người thi công: «Lối tắt» xuống hai hàng ở 900 px (đặc tả nói một hàng; đo `loiTat_hang` = 2 ở 900x800, 1 ở khổ còn lại), lệch nhỏ, thuộc bề mặt. Tác động «hai nút san hô» là sẵn có: nút «Tạo đơn» của thanh trên vẫn san hô như trên `main`; «một nút» chỉ đúng trong vùng nội dung.

Đánh giá sáu điểm người thi công tự nêu:
1. Dải màu cát thay vì san hô: bản vẽ dùng nền san hô nhạt viền san hô. Chọn cát tránh hai khối san hô cạnh nhau và hợp luật «một nút chốt», nhưng ở ảnh dải cát nằm sát dải cát «Bật bảo mật hai lớp» của khung nên hơi trùng màu. CẦN CHỦ duyệt thẩm mỹ (không chặn).
2. Ngày đi quá khứ không tính gấp: đúng chữ quyết định đã duyệt («hôm nay hoặc ngày mai»), và đơn chờ có ngày đi đã qua gần như chắc chắn cũng chờ quá 2 giờ nên vẫn lên dải. Hợp lý, không cần chủ quyết; nên ghi ở tài liệu sống.
3. Bỏ dòng «Đơn đi hôm nay»: hợp lý vì chính thẻ «Đơn đi» đã nằm cùng màn; khoá `chuyenHomNay` vẫn còn trong `viec-cua-ban.ts` nhưng máy tính không còn nguồn. Không cần chủ quyết.
4. Giữ nhãn «Đơn chờ xác nhận» (bản vẽ ghi «Chờ xác nhận»): chỉ là chữ, giữ cho nhất quán với điện thoại. Hợp lý.
5. `cauConLai` còn sót: hàm xuất ra trong `viec-cua-ban.ts` và bài của nó còn, không ai gọi trong `web/`. Mã chết vô hại; dọn ở lượt sau.
6. Cột phụ ẩn khi cả hai thẻ ẩn: đã kiểm thật trên D1 trống (Kế toán, 1440): lưới còn một cột 1144 px, thẻ chuyến đón rộng 1144 px. Hợp lý và đúng ý «cột chính chiếm hết hàng».

**4. Chrome thật. ĐẠT (với điều kiện ghi dưới).** Chrome macOS có sẵn. Chạy lại nguyên kịch bản của người thi công (sao chép ra ngoài, ghi kết quả ra `/tmp`, không đụng tệp bằng chứng): 20 lượt đo, 5 vai × 4 khổ, kết quả trùng số của họ. Chạy thêm kịch bản của tôi (`kiem-doc-lap/do-che-cat-tran.mjs`) cho Quản trị, Kế toán, Nhân viên lập đơn, Chủ ở 1366x650, 1440x900, 1100x800, 900x800, trên NHÁNH và trên `main` (cùng dữ liệu):
- Tràn ngang: 0 ở mọi lượt (`scrollWidth <= innerWidth`, mục `tran` = 0).
- Chữ định danh bị cắt (tên khách, tiền trong bảng chuyến): 0 ở mọi lượt (`tenCat`).
- Mục `cat` của kịch bản đo lỗi luôn bằng 1 ở mọi lượt, cả trên `main`: đó là một dương tính giả, tiêu đề `h1.visually-hidden` «Trang chủ» (ẩn-cho-mắt có chủ đích). Hướng dẫn viên được chuyển sang trang Đơn hàng nên không đo Trang chủ.
- 12 mục `che` (nút khuất): toàn bộ là mục thanh bên (`a.sidebar-item`) bị `div.sidebar-group` hoặc `div.sidebar-foot` đè khi cửa sổ thấp. Danh sách theo vai: 1366x650 Quản trị 3 (Xe & giấy tờ, Giá & chi phí, Điều chỉnh công nợ), Kế toán 3 (Giá & chi phí, Điều chỉnh công nợ, Sổ công nợ & khoá sổ), Chủ 4 (cả bốn mục trên); Chủ ở 1100x800 và 900x800 mỗi khổ 1 (Sổ công nợ & khoá sổ). Trên `main` cùng phép đo ra ĐÚNG các mục y hệt, đồng thời cả nhóm vai: NHÁNH KHÔNG GÂY RA mục nào và không thêm mục nào. Đây là nợ giao diện sẵn có của thanh bên, nên xếp việc riêng, không tính vào nhánh này.
- Quan sát thêm: dải đúng câu «3 đơn chờ xác nhận, 1 đơn quá 2 giờ» + dòng phụ «1 đơn có khách đi hôm nay hoặc ngày mai.»; nút san hô trong vùng nội dung duy nhất là «Xác nhận ngay»; sau khi đóng hai đơn gấp, dải ẩn hẳn và thẻ vẫn còn dòng «Đơn chờ xác nhận».
- Ảnh cho chủ xem: `kiem-doc-lap-anh/Quan_tri-1440x900.png`, `Ke_toan-1100x800.png`, `Nhan_vien_lap_don-1366x650.png` (cùng thư mục với báo cáo này); số liệu thô: `docs/evidence/2026-10-31-trang-chu-phuong-an-a/kiem-doc-lap/`.
- Chưa kiểm được: (i) axe-core (không có sẵn trong `node_modules`, theo yêu cầu không tải về); (ii) rủi ro (a) của đặc tả, tài khoản thật có rất nhiều dòng chờ làm cột phụ dài hơn cột chuyến đón (dữ liệu thử chỉ có 2 đến 4 dòng); (iii) vai Hướng dẫn viên và Điều phối ở chính Trang chủ (Hướng dẫn viên bị chuyển sang `/orders`; Điều phối không có tài khoản thử trong kịch bản chung); (iv) thao tác thật «Bên kia đã nhận» và «Thử lại» (đọc mã thấy hợp lý, test tĩnh có khoá, chưa bấm thử trên Chrome).
- Ghi chú đọc mã: làm mới lặng lẽ mà lời gọi danh sách chờ xác nhận lỗi thì dải ẩn và dòng «Đơn chờ xác nhận» hiện «—» (như thẻ cũ); không nghiêm trọng.

**5. Phiên bản. ĐẠT.** `node scripts/kiem-phien-ban.mjs`: «ĐẠT: bản ở máy 2.52 mới hơn production 2.51.» Ngày 2.52 là tạm, như ghi ở nhật ký thay đổi; phiên phát hành kiểm lại ở bước A.0 của `docs/HANDOFF-N1.md`.

## Việc cần làm trước khi đưa lên

Không có việc chặn trong mã. Trước khi gộp: chủ xem ba ảnh và quyết màu dải việc gấp (cát hay san hô); xác nhận chú thích về `bundle.css`. Có thể làm sau: dọn `cauConLai`/khoá `chuyenHomNay` chết; cho «Lối tắt» một hàng ở 900 px; xếp việc riêng cho 12 mục thanh bên bị khuất khi cửa sổ thấp (nợ sẵn có trên `main`); thử dữ liệu nhiều dòng chờ ở môi trường thật.

## Lệnh đã chạy (bằng chứng)

- `git worktree add --detach .claude/worktrees/kiem-trang-chu-a thi-cong-trang-chu-a` rồi `npm ci`; `npm test` (6900 tests, 6896 pass, 0 fail, thoát 0); `npm run typecheck` (thoát 0); `npm run build:web`.
- Đo gói: esbuild cùng cấu hình bài `src/goi-trang-nhe.test.ts` cho `web/orders.ts` ở nhánh và ở `main` `e05963c5`: 102.454 byte cả hai.
- Chrome: `node docs/evidence/2026-10-31-trang-chu-phuong-an-a/kich-ban/trang-chu-a-smoke.mjs` (bản sao ghi ra `/tmp`): «TỔNG trên 20 lượt đo: cat 20, tran 0, che 12, tranTrang 0, tenCat 0»; `kiem-doc-lap/do-che-cat-tran.mjs` trên nhánh và trên `main`.
- `node scripts/kiem-phien-ban.mjs`: ĐẠT 2.52 > 2.51.
