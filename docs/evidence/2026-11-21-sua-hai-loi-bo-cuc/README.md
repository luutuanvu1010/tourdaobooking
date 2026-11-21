# Bằng chứng — sửa hai lỗi bố cục làm hỏng việc (21/11/2026)

Hồ sơ có ngày. Việc do hồ sơ `docs/superpowers/specs/2026-11-21-khung-goc-giao-dien/BAO-CAO.md` (mục 5, hàng «Ngay») và phát hiện mức Chặn việc của đợt đánh giá 20/11 (`docs/superpowers/specs/2026-11-20-danh-gia-lai-giao-dien/PHAT-HIEN.md`, màn 62) đề nghị.
Bản gốc được đo: `f38b2c261` (bản chính `6e50cd18b`, bản 3.19, cộng hai lần lưu chỉ thêm tài liệu). **Không chạm bản chạy thật, không dữ liệu thật.** Ảnh và số đo để **ngoài kho** ở `~/tourdao-sua-hai-loi-2026-11-21/` (kho công khai).

## Hai lỗi và cách sửa

| Lỗi | Gốc | Sửa |
|---|---|---|
| Đơn hàng: cửa sổ 1.100 tới 1.199 thì cột tên khách co về 0, tên gãy mỗi dòng một chữ (cả năm bộ quyền). Từ 1.200 tới 1.255 cột tên vẫn chỉ 42 tới 97 điểm | Bảng bật bằng mốc theo cửa sổ `@media (min-width: 1100px)`, quên thanh bên 248 điểm | Bảng bật theo bề rộng của chính vùng chứa nó: `public/orders.html` bọc hàng tiêu đề cột và danh sách trong `.don-bang`; `public/app.css` khối [14] dùng truy vấn khung chứa, mốc 960 (phần cố định 862 cộng cột tên ít nhất 98). Hẹp hơn thì là thẻ như trước nay ở cửa sổ nhỏ |
| Chính sách điều phối ở điện thoại: Quản trị đổi hai số hạn chốt xong không có nút lưu. Cùng gốc: thẻ Hạn mức Từ chối của Toàn quyền không có nút «Lưu cài đặt» | `@media (max-width: 640px) { .dp-cs-actions { display: none; } }` giấu nút trong thẻ vô điều kiện, trong khi chỉ biểu mẫu đầy đủ của Toàn quyền có thanh nút dính đáy thay nó | Luật giấu chỉ áp khi thanh đáy `#cs-bottom` thật sự đang hiện và chỉ cho biểu mẫu chính sách. Lưu xong, nhánh Quản trị và biểu mẫu cài đặt hạn mức cuộn tới câu báo; câu báo được chừa chỗ cho thanh trên dính. Thanh đáy của Toàn quyền đặt ngay sau biểu mẫu chính sách, trước thẻ Hạn mức, nên chỉ bám đáy màn hình khi đang ở phần chính sách và không đè lên nút «Lưu cài đặt» |

Bài kiểm trong bộ kiểm chung: `src/don-hang-bang-theo-vung.test.ts`, `src/nut-luu-khong-mat-o-dien-thoai.test.ts` (dòng tương ứng ở `docs/SO-HANG-RAO.md`).

## Máy thử

Như `docs/evidence/2026-11-21-phan-tich-bo-cuc/README.md`, nhưng trên **bản chép riêng** của kho dữ liệu giả, vì bước bấm lưu có ghi:

1. `npm ci`, `npm run build:web`.
2. `rsync -a --delete --exclude 'v3/observability' ~/tourdao-danh-gia-2026-11-20/d1/ ~/tourdao-sua-hai-loi-2026-11-21/d1/` (lệnh này cũng là cách trả kho về nguyên trạng sau mỗi lượt có bấm lưu; tắt máy chủ thử trước khi chạy).
3. `node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/may-chu.mjs --d1 ~/tourdao-sua-hai-loi-2026-11-21/d1 --port 8841`.

Tài khoản thử: `~/tourdao-danh-gia-2026-11-20/tai-khoan.json`.

## Kịch bản (`kich-ban/do-hai-loi.mjs`, chạy từ gốc kho)

- `--nhan truoc`: đo bản chưa sửa làm mốc (chỉ đăng nhập và đọc).
- `--nhan sau --so truoc --luu`: đo bản đã sửa, so từng phần tử với mốc, bấm lưu thật, tự chấm; có dòng ✗ thì thoát 1.
- thêm `--cham-lai`: không mở trình duyệt, đọc lại số đo đã lưu rồi chấm và so lại.

Nó đo: màn Đơn hàng của năm bộ quyền (Bán hàng 15 bề rộng từ 390 tới 1.920, bốn bộ còn lại 4 bề rộng; thêm ba cảnh đang tìm, không có kết quả, đang lọc) gồm chế độ thẻ hay bảng, bề rộng cột tên, chữ bị bóp, tràn ngang, vị trí và kích thước các phần tử; trang Chính sách điều phối của Quản trị và Toàn quyền ở 390 và 1.280 gồm số nút lưu đang nhìn thấy của từng biểu mẫu, và những nút lưu nằm trong khung nhìn khi Toàn quyền đứng ở biểu mẫu cài đặt hạn mức. Bấm lưu chạm theo toạ độ thật vào nút đang nhìn thấy (nút bị giấu hay bị che thì không lưu được), rồi thử câu báo có nằm trọn trong khung nhìn, không bị thanh dính che.

Hai lượt `truoc` và `sau` phải đo trên cùng một trạng thái dữ liệu: mỗi lần lưu thêm một bản vào lịch sử chính sách, làm cột lịch sử ở máy tính cao lên.

Lệnh nghiệm thu của đề bài (kịch bản của đợt phân tích): `node docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/quet-be-rong.mjs --base http://127.0.0.1:8841 --bo <BỘ> --trang /orders --tu 900 --den 1500 --buoc 10`.

## Kết quả ngày 21/11/2026

- Mốc `truoc` (bản gốc): không đạt bốn tiêu chí: chữ bị bóp ở 1.100 và 1.130 (cả năm bộ quyền ở 1.130); cột tên dưới 98 điểm từ 1.100 tới 1.255; Quản trị ở 390 không có nút lưu nào; biểu mẫu cài đặt hạn mức của Toàn quyền ở 390 không có nút lưu.
- Lượt `sau` (sau cả phần sửa theo hai trợ lý kiểm): **26 tiêu chí đạt, 0 không đạt**. Đơn hàng: 27 ô giữ nguyên từng điểm so với mốc (gồm 390, 768, 1.040, 1.090 và từ 1.256 trở lên); 10 ô đổi từ bảng sang thẻ (1.100 tới 1.255). Cột tên hẹp nhất khi là bảng: 98 điểm (cửa sổ 1.256). Chính sách điều phối ở 1.280: mọi vị trí giữ nguyên. Ở 390: Quản trị có đúng một nút «Lưu hạn chốt»; Toàn quyền vẫn đúng một nút lưu cho biểu mẫu chính sách (thanh đáy), thêm nút «Lưu cài đặt» trong thẻ Hạn mức; đứng ở biểu mẫu cài đặt hạn mức thì trong khung nhìn chỉ có nút «Lưu cài đặt». Năm lần bấm lưu thật đều được, câu báo nằm trong khung nhìn.
- Lệnh nghiệm thu: năm bộ quyền, mỗi bộ 61 bề rộng, 0 dòng có chữ bị bóp, 0 dòng tràn ngang.
- Trợ lý `nguoi-danh-gia-giao-dien` (lần lưu `e4533db05`): hai lỗi đã hết. Một phát hiện mức Nặng do đợt sửa tạo ra: ở 390 của Toàn quyền, nút «Lưu cài đặt» và thanh đáy «Lưu thành bản mới» cùng hiện trên một màn, có lúc thanh đè nửa nút. Đã sửa bằng cách đổi chỗ thanh đáy (dòng thứ hai của bảng trên). Các điểm Nhỏ ghi ở mục dưới.
- Trợ lý `nguoi-kiem-doc-lap` (lần lưu `e4533db05`): sẵn sàng trình chủ, không mục Critical hay Important; tự đo lại ra cùng kết quả, tám phép phá thử đều đỏ đúng chỗ. Điểm Minor đã sửa: bài kiểm và kịch bản đo dùng 96, chú thích ghi 98, nay cùng là 98.
- Hai kịch bản Chrome cũ, chạy trên bản gốc và bản đã sửa cho kết quả **giống hệt nhau**, các bước đỏ đều do kịch bản chưa theo thay đổi của các đợt trước, không do đợt sửa này:
  - `docs/evidence/2026-09-29-adr-0049/kich-ban/chinh-sach-dieu-phoi-smoke.mjs`: 8 bước đạt, 6 bước đỏ (1, 5, 8, 10, 11, 12: thanh bên, từ ngữ, chế độ hai số của Quản trị theo ADR-0128).
  - `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/v1-nguoi-phu-trach.mjs`: 3 bước đạt, 14 bước đỏ (các câu kiểm về người phụ trách lệch luồng hiện hành, ví dụ đòi «HDV: …» trong khi trang hiện «Chờ Bán hàng nhận»).

## Điều ghi nhận thêm, ngoài phạm vi (chưa sửa)

1. **Toàn quyền lưu chính sách lần thứ hai trên cùng trang thì không gửi gì đi.** Sau một lần «Lưu thành bản mới» thành công, lần bấm kế tiếp (không tải lại trang) bị bỏ qua lặng lẽ, câu báo «Đã lưu bản mới» của lần trước vẫn nằm đó. Đo được: 4 lần bấm, máy chủ thử chỉ nhận 2 lệnh. Gốc: cờ «đang gửi» của `web/chinh-sach-dieu-phoi.ts` chỉ được hạ ở nhánh lỗi. Kịch bản đo tải lại trang giữa hai lần lưu của Toàn quyền để tránh lỗi này.
2. Câu báo «đã lưu» ở các trang khác (Lý do điều phối, Điều kiện cho xe chạy, Khoá tháng, Người bán) vẫn có thể chui dưới thanh trên dính ở điện thoại sau khi trang cuộn tới: luật chừa chỗ chỉ nêu `#error` và, từ đợt này, `#cs-ok` cùng dải báo của thẻ Hạn mức.
3. Hai kịch bản Chrome cũ nêu trên cần cập nhật các bước đỏ sẵn; kịch bản Chính sách điều phối cần thêm bước cho chế độ hai số của Quản trị.
4. Điểm Nhỏ của trợ lý chấm giao diện, chưa sửa: ở cửa sổ 1.100 tới 1.255 thẻ đơn trải rộng nên thưa (cùng dạng thẻ vẫn dùng dưới 1.100); cột «Còn thu» viết rút gọn ở điện thoại và viết đủ số ở khổ rộng (có sẵn); trong thẻ Hạn mức, nút «Lưu cài đặt» và «Đặt lại tất cả» nằm hai hàng lệch mép (máy tính cũng vậy); ba công tắc gạt của biểu mẫu chính sách cao 26 điểm ở điện thoại (có sẵn, máy đo xếp Nặng theo tiêu chí vùng chạm).
5. Từ cửa sổ 1.256 tới khoảng 1.300, cột tên khách của bảng rộng 98 tới 142 điểm nên tên dài xuống ba dòng, như ở 1.280 trước đợt sửa. Muốn thoáng hơn thì nâng mốc 960; đó là quyết định về hình, chưa đổi.

## Giới hạn

Chrome giả lập, chưa phải iPhone thật; chỉ đo trên dữ liệu thử. Ở Chrome ẩn thanh cuộn không chiếm chỗ; máy có thanh cuộn chiếm chỗ (khoảng 15 điểm) thì vùng nội dung hẹp hơn chừng đó, tức bảng bật từ cửa sổ khoảng 1.271 thay vì 1.256. Trình duyệt quá cũ không hiểu truy vấn khung chứa sẽ luôn thấy dạng thẻ.
