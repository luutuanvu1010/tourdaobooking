# Bằng chứng — sửa hai lỗi bố cục làm hỏng việc (21/11/2026)

Hồ sơ có ngày. Việc do hồ sơ `docs/superpowers/specs/2026-11-21-khung-goc-giao-dien/BAO-CAO.md` (mục 5, hàng «Ngay») và phát hiện mức Chặn việc của đợt đánh giá 20/11 (`docs/superpowers/specs/2026-11-20-danh-gia-lai-giao-dien/PHAT-HIEN.md`, màn 62) đề nghị.
Bản gốc được đo: `f38b2c261` (bản chính `6e50cd18b`, bản 3.19, cộng hai lần lưu chỉ thêm tài liệu). **Không chạm bản chạy thật, không dữ liệu thật.** Ảnh và số đo để **ngoài kho** ở `~/tourdao-sua-hai-loi-2026-11-21/` (kho công khai).

## Hai lỗi và cách sửa

| Lỗi | Gốc | Sửa |
|---|---|---|
| Đơn hàng: cửa sổ 1.100 tới 1.199 thì cột tên khách co về 0, tên gãy mỗi dòng một chữ (cả năm bộ quyền). Từ 1.200 tới 1.255 cột tên vẫn chỉ 42 tới 97 điểm | Bảng bật bằng mốc theo cửa sổ `@media (min-width: 1100px)`, quên thanh bên 248 điểm | Bảng bật theo bề rộng của chính vùng chứa nó: `public/orders.html` bọc hàng tiêu đề cột và danh sách trong `.don-bang`; `public/app.css` khối [14] dùng truy vấn khung chứa, mốc 960 (phần cố định 862 cộng cột tên ít nhất 98). Hẹp hơn thì là thẻ như trước nay ở cửa sổ nhỏ |
| Chính sách điều phối ở điện thoại: Quản trị đổi hai số hạn chốt xong không có nút lưu. Cùng gốc: thẻ Hạn mức Từ chối của Toàn quyền không có nút «Lưu cài đặt» | `@media (max-width: 640px) { .dp-cs-actions { display: none; } }` giấu nút trong thẻ vô điều kiện, trong khi chỉ biểu mẫu đầy đủ của Toàn quyền có thanh nút dính đáy thay nó | Luật giấu chỉ áp khi thanh đáy `#cs-bottom` thật sự đang hiện và chỉ cho biểu mẫu chính sách. Lưu xong, nhánh Quản trị và biểu mẫu cài đặt hạn mức cuộn tới câu báo; câu báo được chừa chỗ cho thanh trên dính |

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

Nó đo: màn Đơn hàng của năm bộ quyền (Bán hàng 15 bề rộng từ 390 tới 1.920, bốn bộ còn lại 4 bề rộng; thêm ba cảnh đang tìm, không có kết quả, đang lọc) gồm chế độ thẻ hay bảng, bề rộng cột tên, chữ bị bóp, tràn ngang, vị trí và kích thước các phần tử; trang Chính sách điều phối của Quản trị và Toàn quyền ở 390 và 1.280 gồm số nút lưu đang nhìn thấy của từng biểu mẫu. Bấm lưu chạm theo toạ độ thật vào nút đang nhìn thấy (nút bị giấu hay bị che thì không lưu được), rồi thử câu báo có nằm trọn trong khung nhìn, không bị thanh dính che.

Hai lượt `truoc` và `sau` phải đo trên cùng một trạng thái dữ liệu: mỗi lần lưu thêm một bản vào lịch sử chính sách, làm cột lịch sử ở máy tính cao lên.

Lệnh nghiệm thu của đề bài (kịch bản của đợt phân tích): `node docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/quet-be-rong.mjs --base http://127.0.0.1:8841 --bo <BỘ> --trang /orders --tu 900 --den 1500 --buoc 10`.

## Kết quả ngày 21/11/2026

- Mốc `truoc` (bản gốc): không đạt bốn tiêu chí: chữ bị bóp ở 1.100 và 1.130 (cả năm bộ quyền ở 1.130); cột tên dưới 96 điểm từ 1.100 tới 1.250; Quản trị ở 390 không có nút lưu nào; biểu mẫu cài đặt hạn mức của Toàn quyền ở 390 không có nút lưu.
- Lượt `sau`: **25 tiêu chí đạt, 0 không đạt**. Đơn hàng: 27 ô giữ nguyên từng điểm so với mốc (gồm 390, 768, 1.040, 1.090 và từ 1.256 trở lên); 10 ô đổi từ bảng sang thẻ (1.100 tới 1.255). Cột tên hẹp nhất khi là bảng: 98 điểm (cửa sổ 1.256). Chính sách điều phối ở 1.280: mọi vị trí giữ nguyên. Ở 390: Quản trị có đúng một nút «Lưu hạn chốt»; Toàn quyền vẫn đúng một nút lưu cho biểu mẫu chính sách (thanh đáy), thêm nút «Lưu cài đặt» trong thẻ Hạn mức. Năm lần bấm lưu thật đều được, câu báo nằm trong khung nhìn.
- Lệnh nghiệm thu: năm bộ quyền, mỗi bộ 61 bề rộng, 0 dòng có chữ bị bóp, 0 dòng tràn ngang.
- Kịch bản Chrome cũ `docs/evidence/2026-09-29-adr-0049/kich-ban/chinh-sach-dieu-phoi-smoke.mjs`: 8 bước đạt, 6 bước đỏ (1, 5, 8, 10, 11, 12), **giống hệt** khi chạy trên bản gốc chưa sửa. Sáu bước đỏ là do kịch bản cũ chưa theo các thay đổi về thanh bên, từ ngữ và chế độ hai số của Quản trị (ADR-0128); không do đợt sửa này.

## Điều ghi nhận thêm, ngoài phạm vi (chưa sửa)

1. **Toàn quyền lưu chính sách lần thứ hai trên cùng trang thì không gửi gì đi.** Sau một lần «Lưu thành bản mới» thành công, lần bấm kế tiếp (không tải lại trang) bị bỏ qua lặng lẽ, câu báo «Đã lưu bản mới» của lần trước vẫn nằm đó. Đo được: 4 lần bấm, máy chủ thử chỉ nhận 2 lệnh. Gốc: cờ «đang gửi» của `web/chinh-sach-dieu-phoi.ts` chỉ được hạ ở nhánh lỗi. Kịch bản đo tải lại trang giữa hai lần lưu của Toàn quyền để tránh lỗi này.
2. Câu báo «đã lưu» ở các trang khác (Lý do điều phối, Điều kiện cho xe chạy, Khoá tháng, Người bán) vẫn có thể chui dưới thanh trên dính ở điện thoại sau khi trang cuộn tới: luật chừa chỗ chỉ nêu `#error` và, từ đợt này, `#cs-ok` cùng dải báo của thẻ Hạn mức.
3. Ở điện thoại của Toàn quyền, thanh đáy «Lưu thành bản mới» luôn hiện, kể cả khi đang sửa thẻ Hạn mức phía dưới, nên có lúc hai nút nền đặc cùng trên một màn.
4. Kịch bản Chrome cũ nêu trên cần cập nhật sáu bước và thêm bước cho chế độ hai số của Quản trị.

## Giới hạn

Chrome giả lập, chưa phải iPhone thật; chỉ đo trên dữ liệu thử. Ở Chrome ẩn thanh cuộn không chiếm chỗ; máy có thanh cuộn chiếm chỗ (khoảng 15 điểm) thì vùng nội dung hẹp hơn chừng đó, tức bảng bật từ cửa sổ khoảng 1.271 thay vì 1.256. Trình duyệt quá cũ không hiểu truy vấn khung chứa sẽ luôn thấy dạng thẻ.
