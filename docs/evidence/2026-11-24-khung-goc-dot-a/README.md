# Bằng chứng — khung gốc giao diện, đợt A: Tạo / Sửa đơn, Đơn chờ xác nhận (vẽ lại 24/11/2026 theo ADR-0234)

Hồ sơ có ngày. Việc: đợt A của kế hoạch `docs/superpowers/plans/2026-11-21-chuyen-toan-bo-man-sang-khung-goc.md` (luật ADR-0222, ADR-0234). Bước 1: xem trước bằng ảnh thật, **chưa sửa mã của Nền tảng**. Ảnh xem trước đợt A ngày 21/11 (`~/tourdao-khung-goc-dot-a/`) KHÔNG dùng; kịch bản 21/11 (lần lưu `66e606025`) chỉ dùng lại khung chụp.
Ảnh, số đo, tệp kiểu sinh ra nằm **ngoài kho** ở `~/tourdao-dot-a-2026-11-24/` (ADR-0215 Đ3). Trang ảnh riêng tư gửi chủ: `https://claude.ai/artifact/QedXbcVQrvHgwtEYEQEwnA`.

## Máy thử

Kho dữ liệu giả chép riêng từ lượt 24/11 (`~/tourdao-thi-giac-2026-11-24/d1` → `~/tourdao-dot-a-2026-11-24/d1`), kèm `tai-khoan.json` và `phien.json` (mỗi tài khoản thử chỉ đăng nhập một nơi). **Cổng 8855.**
`npm ci`, `npm run build:web`, rồi `node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/may-chu.mjs --d1 ~/tourdao-dot-a-2026-11-24/d1 --port 8855`. Chỉ GET và bấm, gõ phía trình duyệt (không lưu).
Bộ núm giao diện của máy thử trùng bản chạy thật lúc chụp (GET công khai `/giao-dien.css`, 24/11).

## Tệp

| Tệp | Việc |
|---|---|
| `kich-ban/chup.mjs` | chín trạng thái × 390, 1.280, 1.440: Tạo đơn (Bán hàng, Đối tác, Kế toán không quyền), Sửa đơn (nháp, mở thẻ + hai hành khách, đơn đã xác nhận bị khoá), Đơn chờ xác nhận (có đơn, rỗng giả lập bằng thay đường API trong trình duyệt, Kế toán không quyền). Ghi bốn phép đo ADR-0234 (cùng đoạn đo của `npm run do-khung`) |
| `kich-ban/va-tep-kieu.py` | sinh tệp kiểu đề xuất từ `public/app.css` bằng danh sách sửa có tên: tham số mới của khung (cột phụ đứng sau, khối chỉ hiện từ 560, phần không phải nút trong thanh nút, nhóm chọn một, ô chọn dáng chung), độ đậm ruột Tạo đơn khoanh trong `#order-form`, sửa tại chỗ vài luật cũ |
| `lop-xem-truoc/sap-lai.js` | đoạn chạy trong trang lúc chụp: khai khuôn, đổi phần tử cũ sang lớp của khung, nút về cấp của bảng động từ, khuôn trạng thái chung |
| `kich-ban/ghep.py` | chép từ đợt A 21/11 (không dùng lần này; trang ảnh dựng thẳng bằng ảnh thu nhỏ) |

Thứ tự đã chạy: `chup.mjs --nhan truoc` → `python3 …/va-tep-kieu.py ~/tourdao-dot-a-2026-11-24/de-xuat/app.css` → `chup.mjs --nhan sau --thay-css ~/tourdao-dot-a-2026-11-24/de-xuat/app.css --sap docs/evidence/2026-11-24-khung-goc-dot-a/lop-xem-truoc/sap-lai.js`.

## Kết quả đo bản đề xuất

Chữ đậm (đoạn chữ đậm hơn chữ thân): Tạo đơn 78 % → 36 %; Sửa đơn mở thẻ 74–80 % → 28–35 %; Tạo đơn Đối tác 77 % → 36 %; Đơn chờ xác nhận 43 % → 30 %. Nút nền đặc: Đơn chờ xác nhận 4 → 0; Tạo đơn 1 (nút Lưu). Tiền lệch màu 0, khối có bóng 0, không tràn ngang, không chữ bị bóp.
Máy chấm khung (`DO_TRONG_TRANG` + `chamO` của `scripts/giao-dien/cham-khung-goc.mjs`) chấm bản đề xuất ở 17 bề rộng 360–1.920 trên bốn màn (Tạo đơn Bán hàng, Sửa đơn, Tạo đơn Đối tác, Đơn chờ xác nhận): 68/68 ô đạt với bộ núm thật; 24/24 ô (6 bề rộng) đạt khi gỡ `/giao-dien.css` (bộ núm mặc định như lượt kiểm GitHub).

## Bẫy

- Thanh nút thay cho `.form-actions` phải là con của vùng vẽ (form), không để ở chỗ cũ trong cột phải: lượt đầu thanh nằm trong cột phụ nên tóm tắt điện thoại hiện ở máy tính.
- Lượt kiểm GitHub (`do-khung-ci.mjs`) chưa gieo đơn chờ xác nhận: trang sẽ hiện khuôn rỗng (chữ đậm 67 %); khi thi công phải gieo một đơn đã gửi xác nhận.

## Giới hạn

Chrome giả lập, chưa phải iPhone, iPad thật. Chưa chụp: Trả sau, lỗi lưu, bảng trượt chọn người phụ trách, chế độ «Qua đối tác». Ảnh có phần theo ngày (nhãn «Ngày khởi hành đã qua», «Quá hạn», dải nhắc): so ảnh sau thi công phải chụp cùng ngày hoặc ghi trước những chỗ khác do ngày.
