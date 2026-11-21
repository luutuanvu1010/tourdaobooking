# Khung gốc giao diện — sổ việc thi công (mở 21/11/2026)

> Tài liệu sống của việc này: trạng thái ghi ở đây, không ở trí nhớ phiên (P19). Phiên làm vai **thi công**; kiểm do trợ lý khác (N8).
> Bản đề xuất luật: `docs/superpowers/specs/2026-11-21-khung-goc-giao-dien/DE-XUAT-ADR-khung-goc-giao-dien.md` (**chưa duyệt** lúc mở sổ). Hồ sơ phân tích cùng thư mục.
> Lời chủ dự án 21/11, nguyên văn: «bố cục lại từ gốc… áp khung, luật để tự động các màn buộc phải tuân thủ theo (là gốc), rồi mỗi màn cần có tùy biến gì cho phù hợp thì cũng phải dựa trên cái gốc».
> Nhánh `claude/jovial-leakey-a25fd6`, cắt từ `claude/platform-ui-reassessment-d0c333` (`f38b2c261`). Không nhập bản chính, không triển khai.
> Ngoài phạm vi: chuyển màn ngoài bốn màn mẫu; đổi chữ trên nút, nhãn; dữ liệu, quyền, tiền, máy chủ.

## Bảng việc

| Bước | Việc | Xong khi | Trạng thái |
|---|---|---|---|
| 0 | Chủ duyệt bản đề xuất luật; chép thành ADR (số kế tiếp, lúc mở sổ là 0222); soạn diff một điều mới của Hiến chương để chủ duyệt riêng | có lời duyệt chủ gõ trong ô chat; ADR và dòng mục lục đã ghi | **chờ chủ** |
| 1 | Xem trước bằng ảnh thật trên bốn màn mẫu, chưa sửa mã | chủ duyệt hình | ảnh đã gửi 21/11, **chờ chủ** |
| 2 | Khung và máy canh: khối «khung gốc» trong `public/app.css`; hàm dựng dùng chung ở `web/`; sổ ngoại lệ ở `src/shared/`; bài kiểm Đ7(a); lệnh đo Đ7(b) | mỗi hàng rào đã thấy đỏ thật một lần và có dòng ở `docs/SO-HANG-RAO.md` | chưa làm (sau bước 0 và 1) |
| 3 | Chuyển bốn màn mẫu sang khung, gỡ hẳn lớp kiểu cũ của bốn màn | đúng hình đã duyệt; sáu tiêu chí nghiệm thu của bản đề xuất | chưa làm |
| 4 | Trợ lý đánh giá giao diện chấm bốn màn; người kiểm độc lập soát (lưu thành lần lưu trước khi giao); `npm test`, `npm run typecheck` một lần ở cuối | cả hai báo cáo; hai lệnh xanh | chưa làm |

## Bước 1 — đã làm gì (21/11)

Bằng chứng, kịch bản và lớp xem trước: `docs/evidence/2026-11-21-khung-goc-xem-truoc/` (README ở đó). Ảnh gửi chủ: `~/tourdao-khung-goc-2026-11-21/gui-chu/` (sáu tờ: bốn màn mẫu, trang số của thang đo, so sánh bề rộng trang).
Lượt quét lớp xem trước, 4 màn × 79 bề rộng (360 tới 1.920): 0 tràn ngang, 0 chữ bị bóp, 0 khối lệch mép, một kiểu vỏ khối, khoảng cách giữa các khối 16.

## Điều phiên tự đề xuất trong ảnh (bề mặt, đảo ngược được; chủ duyệt bằng ảnh — Đ8 của bản đề xuất)

1. **Mốc bên trong trang** theo bề rộng vùng nội dung: 560, 800, 1.040. Cửa sổ 1.130 có thanh bên là vùng 834, rơi vào mức 800 tới 1.039.
2. **Chiều cao:** nút 44, ô nhập 48, nút chính ở thanh dính đáy 52. **Khối:** đệm 16 (vùng nội dung hẹp hơn 560) hoặc 24, bo góc 12, viền bằng bóng và bóng mềm (dáng thẻ của thị giác 1.70, chủ duyệt 2/10).
3. **Bảng:** cột ngắn 96, vừa 128, dài 200, cột co giãn không hẹp hơn 180; dòng cao ít nhất 52; dưới 800 thành thẻ dòng hoặc danh sách dòng.
4. **Chỗ đặt nút chính:** Danh sách — đầu trang bên phải; Chi tiết — đầu trang bên trái, việc nguy hiểm tách phải, điện thoại dính đáy; Biểu mẫu — thanh nút cuối, «Lưu» bên phải, điện thoại dính đáy; Thiết lập — đầu khối bên phải, «Sửa» cuối dòng.
5. **Chi tiết đơn ở điện thoại:** thanh tab nhường chỗ cho nút chính dính đáy (luật thanh dính của đợt 0, K4); khối tiền lên ngay sau dải tóm tắt; «Huỷ đơn» xuống cuối trang.
6. **Địa điểm:** biểu mẫu thêm và sửa chuyển vào bảng trượt; nút mở dùng lại đúng chữ đang có trên trang («Thêm địa điểm» là tiêu đề cũ của khối thêm, «Thêm khu vực đón» là chữ nút cũ); tên khối «Địa điểm» lấy từ tên trang; mã nằm dưới tên. Lúc thi công phải khai dòng ở bảng tham chiếu nếu máy so nút đòi (ADR-0167).
7. **Đơn hàng dạng bảng:** bỏ chữ «Còn thu» lặp trong ô vì đầu cột đã ghi; số điện thoại nằm dưới tên khi vùng nội dung hẹp hơn 1.040.
8. **Sửa xe:** bỏ lối «‹ Xe» trong thân trang (thanh trên đã có đường dẫn về).

## Điều chờ chủ

- Duyệt bản đề xuất luật (bước 0).
- Duyệt hình bốn màn mẫu và thang đo (tờ 1 tới 5).
- Bề rộng trang: mặc định giữ ba mức đã duyệt 15/11; tờ 6 chỉ để so.

## Ghi chú kỹ thuật cho bước 2 và 3

- Thuộc tính khai khuôn ở `<body>` phải là **tên mới** (bản xem trước dùng tạm `data-kg`). `data-khuon="bieu-mau"` giữ nghĩa «trang biểu mẫu không nhận dải nhắc bảo mật» (`web/dai.ts`, `src/giu-cho-dai.test.ts`).
- Đo vùng chứa: `main` làm vùng chứa `trang`, mỗi khối làm vùng chứa `khoi`. Phần tử là vùng chứa thì thành khối chứa của con `position: fixed`: trước khi gắn cho một trang phải soát trang đó không có con `fixed` trong `main` (bốn màn mẫu: thanh đáy là `sticky`, bảng trượt và toast gắn vào `body`). Trình duyệt chưa hỗ trợ thì đứng ở bố cục hẹp nhất; phải thử iPhone đời cũ (Đ6).
- Mã khuôn vào gói mọi trang: đo trần gói trang Đơn hàng (`src/goi-trang-nhe.test.ts`); phải nới thì ghi lý do ở lần lưu.
- Lưới 15/11 giữ nguyên: `data-rong`, ba mức, trần 1.120, bám trái, `src/luoi-bo-cuc.test.ts`.
- Phiên «Sửa hai lỗi bố cục làm hỏng việc» (nhánh `claude/jolly-jemison-3b33e1`) sửa màn Đơn hàng và Chính sách điều phối: nếu nó xong trước bước 3 thì dựng màn mẫu Đơn hàng trên bản đã sửa.
- Phiên ADR-0221 (nhánh `claude/exciting-tu-2efdb7`) sửa `web/order.ts`, `web/order-form.ts`: xếp thứ tự nhập trước khi chuyển màn Chi tiết đơn; số ADR kế tiếp tính sau 0221.

## Nhật ký

- 21/11: mở phiên từ phiên phân tích. Nhánh lúc mở cắt từ bản chính, chưa có hồ sơ: tiến thẳng lên `f38b2c261`. Máy thử cổng 8843, kho `~/tourdao-khung-goc-2026-11-21/d1`. Chụp hiện tại, soạn lớp xem trước, chụp đề xuất, quét 316 ô, làm trang số và tờ so sánh bề rộng, gửi chủ sáu tờ. Dừng ở cổng duyệt của bước 0 và bước 1.
