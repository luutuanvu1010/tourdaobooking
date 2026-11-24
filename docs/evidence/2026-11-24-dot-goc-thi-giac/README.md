# Bằng chứng — đợt gốc ngôn ngữ thị giác, bước 1 (ảnh xem trước để chủ duyệt), 24/11/2026

Hồ sơ có ngày. Kế hoạch: `docs/superpowers/plans/2026-11-24-dot-goc-ngon-ngu-thi-giac.md`; luật đề xuất: `docs/superpowers/specs/2026-11-24-danh-gia-thi-giac-va-huong-nang-cap/DE-XUAT-ADR-0234-ngon-ngu-thi-giac.md`.
**Chưa sửa mã sản phẩm.** Ảnh, số đo, tệp kiểu sinh ra để **ngoài kho** ở `~/tourdao-thi-giac-2026-11-24/` (thư mục `anh/dot-goc-*`, `so-do/dot-goc-*`, `dot-goc/`). Trang ảnh riêng tư gửi chủ: `https://claude.ai/artifact/Mzhp1jAobBgd9yfdEBBBUh`.

## Khác lượt 24/11 ở đâu

Lớp xem trước B của lượt đánh giá (`../2026-11-24-danh-gia-thi-giac/kich-ban/lop-kieu/`) là một lớp kiểu **tiêm chồng** lên trang, có luật viết riêng cho từng màn và một `color-mix()`. Bước này thay bằng **chính bản sửa tệp kiểu**: `kich-ban/va-tep-kieu.py` đọc `public/app.css`, áp một danh sách sửa có tên (mỗi sửa phải trúng đúng một dòng), ghi tệp đề xuất ngoài kho; kịch bản chụp **thay** `/app.css` của trang bằng tệp đó. Ảnh «hiện tại» đi cùng đường (thay bằng chính `public/app.css`). Bước 4 của kế hoạch chỉ là chạy lại `va-tep-kieu.py` với ra là `public/app.css`, nên mã trùng ảnh đã duyệt.

Ba tầng được sửa, không luật riêng cho màn nào: giá trị gốc (`:root`), khung chung (thanh dưới, thanh bên, ảnh đại diện, dải nhắc), thành phần chung (`.btn`, `.nut`, `.badge`, `.huy-hieu`, `.nhan`, tiền, bảng và cặp nhãn–số của khung gốc, mức «gọn»). Luật tiền: thêm token `--c-tien` và sửa tại chỗ màu của các luật tiền đang có (kể cả của Trang chủ, Tạo đơn, bảng kê xe). Ngoại lệ có tên duy nhất: huy hiệu đếm `#dash-today-count` của Trang chủ mượn lớp trạng thái nên không nhận chấm.

## Dựng máy thử (đã làm)

1. `npm ci`, `npm run build:web` trong bản làm việc `claude/dot-goc-thi-giac-e74c62` (cắt từ `b8a73e320`).
2. Máy chủ thử trên kho dữ liệu thử của lượt 24/11: `node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/may-chu.mjs --d1 ~/tourdao-thi-giac-2026-11-24/d1 --port 8851`.
3. Bộ núm: GET công khai `/giao-dien.css` của bản chạy thật lúc chụp trùng từng ký tự với máy thử (chủ chưa đổi núm từ 11:26).
4. Dùng lại `tai-khoan.json` và `phien.json` của lượt 24/11: mỗi tài khoản thử chỉ đăng nhập một nơi.

## Kịch bản (`kich-ban/`, chạy từ gốc kho)

| Tệp | Việc |
|---|---|
| `va-tep-kieu.py <ra.css>` | sinh tệp kiểu đề xuất từ `public/app.css` |
| `chup.mjs` | bản chép của kịch bản chụp 24/11, thêm `--thay-css <tệp>` và ghi `chuotMin` (máy có chuột hay không) |
| `ghep-cap.py` | ghép ảnh hiện tại / đề xuất thành một ảnh hai cột |
| `bon-phep-do.py` | bốn phép đo của Đ5b (chữ đậm, nút nền đặc, màu tiền, bóng mờ) và dải nhắc, khung chung, tràn ngang, so hai bộ |

Lệnh đã chạy: `chup.mjs --so 1,8,13,16,18,38,58 --rong 390,1280,1440 --thay-css <tệp> --ten-bo dot-goc-hien-tai|dot-goc-de-xuat --luong 3 --lai`. Máy có chuột ở 1.280 và 1.440, không ở 390 (đã ghi trong số đo).

## Kết quả đo (bảy màn × ba bề rộng)

Không màn nào tràn ngang; không còn phần tử có bóng mờ; mỗi màn tối đa một nút nền đặc trong vùng nội dung; tiền một màu mực (trắng trên dải tóm tắt nền đậm; tiền đã đủ màu xám); dải nhắc 53–61 → 45 (44 cộng đường kẻ dưới); ở điện thoại không chỗ bấm nào dưới cỡ ngón tay (như trước). Chữ đậm (tỉ lệ mẩu chữ ≥ 600 theo `do-thi-giac.js` của lượt 24/11 — khác cách đo của `npm run do-khung`, nơi chữ đậm là chữ đậm HƠN chữ thân, nên hai bộ số không so trực tiếp được): Đơn hàng 51 → 33 % (390), 67 → 43 % (1.280); Sửa xe 84 → 53 %; Địa điểm 36 → 24 % (1.280); Đối tác Đơn hàng 60 → 42 %; Chi tiết đơn 61 → 59 %; Tạo đơn 78 → 78 % (ruột trang, để đợt A tới F). Bảng Đơn hàng ở 1.440 × 900: 12 → 15 dòng.

## Lượt chấm của trợ lý đánh giá giao diện (24/11, trên ảnh cặp)

Hai phát hiện Nặng do đề xuất gây ra, đã sửa trong bản sửa tệp kiểu và chụp lại: (1) nút chính bị khoá (màn Đăng nhập) nền trắng viền mảnh giống ô nhập — nay nền xám nhạt không viền; (2) dải nhắc một dòng ở điện thoại cắt mất ý — điện thoại giữ tối đa hai dòng như quyết định 13/11, từ 641 trở lên một dòng. Phát hiện Vừa về vùng chạm của nút trong dải: máy đo cho 0 chỗ bấm nhỏ ở cả hai bộ (nút giữ cao 44). Phát hiện về mức gọn ở Địa điểm: màn đó khuôn Thiết lập, đúng luật không nhận mức gọn. Các điều còn lại là chủ ý của luật (dải đỏ bớt gắt, tiền còn nợ không đỏ, số «Còn lại» trên dải tóm tắt thôi vàng), đã nêu trên trang ảnh cho chủ.

## Chưa kiểm

iPhone, iPad thật; chủ đề tối; 104 màn còn lại (bước 5 chụp đủ 111 màn sau khi chủ duyệt); trạng thái sau khi bấm.
