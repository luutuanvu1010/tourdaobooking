# Bằng chứng — phân tích bố cục và khung gốc giao diện (21/11/2026)

Hồ sơ có ngày. Báo cáo: `docs/superpowers/specs/2026-11-21-khung-goc-giao-dien/BAO-CAO.md` (cùng thư mục có `SO-LIEU.md` do máy sinh và `DE-XUAT-ADR-khung-goc-giao-dien.md`).
Bản được đo: bản chính `6e50cd18b` (bản 3.19). **Không chạm bản chạy thật, không dữ liệu thật.** Ảnh và số đo để **ngoài kho** ở `~/tourdao-bo-cuc-2026-11-21/` (kho công khai).

## Máy thử

Dùng lại kho dữ liệu giả và 13 tài khoản thử của đợt 20/11 (`~/tourdao-danh-gia-2026-11-20/`, xem `docs/evidence/2026-11-20-danh-gia-lai-giao-dien/README.md`). Từ bản được chấm 20/11 tới bản chính hôm nay không có migration mới.
`npm run build:web`, rồi `node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/may-chu.mjs --d1 ~/tourdao-danh-gia-2026-11-20/d1 --port 8835`. Chỉ đăng nhập và GET.

## Kịch bản (`kich-ban/`, chạy từ gốc kho)

| Tệp | Việc |
|---|---|
| `do-bo-cuc.mjs` | đo bố cục bên trong 87 màn (bảng màn của đợt 20/11) ở bốn bề rộng 390, 1.130, 1.440, 1.920: lớp bọc, khối cấp 1, thẻ ở mọi tầng, tiêu đề, ô nhập, nút, nút chính, bảng, thanh dính, cỡ chữ, tên lớp; chụp ảnh thường và ảnh kẻ khung ở 390 và 1.130 |
| `tong-hop-bo-cuc.mjs` | gom số đo thành các con số của hồ sơ; chứa bảng xếp 87 màn vào tám loại (`LOAI_TRANG`) |
| `kiem-ke-ma.mjs` | đếm trong `public/app.css` và `web/*.ts`: luật, họ lớp, bề rộng, cách chia cột, mốc đổi bố cục, khoảng cách, token, lớp cũ và lớp mới |
| `quet-be-rong.mjs` | quét một màn (bước mịn) hoặc cả 87 màn ở sáu bề rộng trung gian, tìm chữ bị bóp dọc và tràn ngang |
| `lap-so-lieu.mjs` | sinh `SO-LIEU.md` từ ba tệp số đo |
| `ve-anh.py` | ghép bản đồ bề rộng và các tờ so sánh trang cùng loại |
| `chup-html.mjs` | chụp `so-do-khung-goc.html` (sơ đồ khung gốc đề xuất) thành ảnh |

Thứ tự đã chạy: `do-bo-cuc` → `tong-hop-bo-cuc` → `kiem-ke-ma` → `quet-be-rong --tat-ca` → `lap-so-lieu --ban 6e50cd18b` → `ve-anh.py` → `chup-html`.

## Bẫy đã gặp

- Bộ chặn sửa tệp luật đọc cả kịch bản nằm ngoài thư mục mã. Kịch bản có lệnh ghi tệp mà ghép đường dẫn kiểu `join(HERE, "..", "..")` thì bị chặn nhầm, vì cây làm việc nằm dưới `.claude/worktrees/`. Dùng đường dẫn tính từ gốc kho.
- Khối phép đo chạy trong trang là một chuỗi mẫu: không viết dấu huyền trong đó, kể cả trong chú thích.
- Phần tử `display: contents` không có hộp riêng: phải lấy thẳng các con của nó, nếu không trang Tạo đơn ở điện thoại ra «0 khối».

## Giới hạn

Chỉ đo màn vừa tải, Chrome giả lập. 15 màn rỗng hoặc gần rỗng như đợt 20/11. «Thẻ» nhận theo vỏ (viền, nền, bóng) nên dòng danh sách có vỏ cũng được tính. Loại màn và vị trí nút chính là cách xếp của phiên phân tích. Bề rộng 1.130 suy từ ảnh chủ gửi 20/11, chưa hỏi chủ.
Các Chrome ẩn bật trước phiên này (12:26 ngày 20/11; 19:41 và 19:42) là của phiên khác: không tắt.
