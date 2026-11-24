# Bằng chứng — xem trước khung gốc giao diện trên bốn màn mẫu (21/11/2026)

Hồ sơ có ngày. Việc: bước 1 của phiên thi công khung gốc (sổ việc `docs/superpowers/plans/2026-11-21-khung-goc-giao-dien-thi-cong-nhat-ky.md`). Bản đề xuất luật: `docs/superpowers/specs/2026-11-21-khung-goc-giao-dien/DE-XUAT-ADR-khung-goc-giao-dien.md` (lúc viết tệp này **chưa duyệt**).
**Chưa sửa mã của Nền tảng.** Ảnh «đề xuất» làm bằng cách tiêm một lớp kiểu và một đoạn sắp lại phần tử vào trang đang chạy trên máy thử. Không chạm bản chạy thật, không dữ liệu thật. Ảnh và số đo nằm **ngoài kho** ở `~/tourdao-khung-goc-2026-11-21/` (ADR-0215 Đ3).

## Máy thử

Kho dữ liệu giả chép từ đợt 20/11 (`~/tourdao-danh-gia-2026-11-20/d1` → `~/tourdao-khung-goc-2026-11-21/d1`), tài khoản thử cùng đợt. Bản được chụp: nhánh này tại `f38b2c261` (mã giống bản chính `6e50cd18b`, bản 3.19).
`npm run build:web`, rồi `node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/may-chu.mjs --d1 ~/tourdao-khung-goc-2026-11-21/d1 --port 8843`. Chỉ đăng nhập và GET.

## Tệp

| Tệp | Việc |
|---|---|
| `lop-xem-truoc/khung-goc.css` | lớp kiểu của khung (thang đo, khuôn trang, khối, lưới, bảng, thanh nút) cộng phần «cầu nối tạm» cho phần tử cũ. Phần A tới E dự kiến chép vào khối «khung gốc» của `public/app.css` ở bước 2; phần F bỏ khi bốn màn được dựng lại bằng hàm của khung |
| `lop-xem-truoc/sap-lai.js` | đoạn chạy trong trang: gắn `<body data-kg>` (tên tạm, tên thật chốt ở bước 2, **không** dùng `data-khuon`), đổi phần tử cũ sang lớp của khung, dời vài phần tử. Chữ trên nút, nhãn giữ nguyên |
| `kich-ban/chup.mjs` | chụp bốn màn ở 390, 1.130, 1.440 (lượt `truoc`, lượt `sau` có `--lop --sap`); `--nhan rong --kho 1440x900,1920x1080 [--rong hai-muc]` cho ảnh so bề rộng trang. Điện thoại chụp bằng khung nhìn cao bằng ảnh để thanh dính đáy nằm ở đáy ảnh |
| `kich-ban/quet.mjs` | quét bốn màn ở mọi bề rộng 360 tới 1.920 bước 20: tràn ngang, chữ bị bóp, khối lệch mép vùng nội dung, phần tử thò ra ngoài khối, số kiểu vỏ, khoảng cách giữa các khối có thuộc thang không |
| `thang-do.html` + `kich-ban/chup-html.mjs` | trang số của thang đo, dựng trên nguồn của máy thử để nút, ô nhập, khối vẽ bằng đúng tệp kiểu và phông của Nền tảng |
| `kich-ban/ghep.py` | ghép tờ so sánh «hiện tại / đề xuất» và tờ so sánh bề rộng trang |

Thứ tự đã chạy: `chup --nhan truoc` → `chup --nhan sau --lop … --sap …` → `quet --lop … --sap …` → `chup --nhan rong …` (hai lượt) → `ghep.py` → `chup-html` cho từng tờ và cho `thang-do.html`.

## Kết quả lượt quét (lớp xem trước, 4 màn × 79 bề rộng = 316 ô)

Tràn ngang 0; chữ bị bóp 0; khối lệch mép 0; phần tử thò ra ngoài khối 0. Kiểu vỏ: một kiểu, đệm 16 (vùng nội dung hẹp hơn 560) hoặc 24. Khoảng cách giữa các khối: 16.
Lượt đầu màn Chi tiết đơn có một khoảng 30 ở cả 79 bề rộng (dòng «Lập … bởi …» còn lề mặc định của trình duyệt); đã sửa trong lớp và quét lại cả bốn màn: 316 ô, 0 ô có điều phải xem.
Đối chiếu: trang đang có, màn Đơn hàng ở cửa sổ 1.130 có 30 đoạn chữ bị bóp (lỗi đã ghi ở hồ sơ phân tích).

## Bẫy đã gặp

- Biến chứa nhiều tham số (`L="--lop a --sap b"`) rồi viết `$L` trong zsh **không** tách thành từng tham số: kịch bản chạy như không có `--lop`, ảnh «đề xuất» lặng lẽ thành ảnh «hiện tại». Dấu hiệu: chiều cao trang in ra trùng lượt `truoc`. Viết tham số thẳng vào lệnh.
- Chụp «vượt khung nhìn» ở điện thoại làm thanh dính đáy và thanh tab nằm lơ lửng giữa ảnh, che nội dung. Kéo khung nhìn cao bằng ảnh rồi mới chụp.
- Con trực tiếp của vùng xếp dọc mà mang `flex: 1 1 320px` thì 320 thành **chiều cao** (đoạn dẫn của trang Địa điểm từng cao 320).
- Phần tử `display: contents` (`#order`) không truyền luật «con trực tiếp của main» cho con của nó: phải đặt lại lề cho các con đó.
- Lớp `.toolbar .btn-primary { display: none }` (ẩn «+ Tạo đơn» ở điện thoại) gắn vào tên lớp cũ của thanh công cụ: đổi lớp thanh là nút hiện lại.
- `object-fit: cover` trong tờ ghép phóng lệch ảnh của trang ngắn. Dùng bề rộng 100 %, chiều cao tự tính.

## Giới hạn

Chrome giả lập, chưa phải iPhone, iPad, Android thật. Chỉ chụp màn vừa tải: chưa có ảnh bảng trượt «Thêm địa điểm», hộp lọc, đơn nháp, đơn của Đối tác. Tài khoản chụp: Bán hàng (Đơn hàng, Chi tiết đơn), Quản trị (Sửa xe, Địa điểm). Chưa có người chấm độc lập; trợ lý đánh giá giao diện chấm sau khi thi công (bước 3).
