# Kế hoạch đợt gốc — ngôn ngữ thị giác (24/11/2026)

> Chủ dự án 24/11, nguyên văn: «ok chọn B, làm theo khuyến nghị» (phương án B của `docs/superpowers/specs/2026-11-24-danh-gia-thi-giac-va-huong-nang-cap/BAO-CAO.md`). Luật: đề xuất `DE-XUAT-ADR-0234-ngon-ngu-thi-giac.md` cùng thư mục đó, chờ chủ duyệt chữ cùng ảnh của bước 1.
> Đợt gốc đứng **trước đợt A** của kế hoạch tám đợt đã duyệt 21/11 (`2026-11-21-chuyen-toan-bo-man-sang-khung-goc.md`); các đợt A tới F giữ nguyên thứ tự. Trạng thái sống ghi ở sổ việc `2026-11-21-khung-goc-giao-dien-thi-cong-nhat-ky.md`, không ở tệp này.
> Vai: phiên soạn kế hoạch này không thi công (Hiến pháp P15). Thi công ở phiên riêng; kiểm ở trợ lý khác (N8).

## Ngoài phạm vi

Ruột từng trang (để cho các đợt A tới F); đổi chữ trên nút, nhãn; chủ đề tối; dữ liệu, quyền, tiền, máy chủ; Hiến chương.

## Bước

| Bước | Việc | Xong khi |
|---|---|---|
| 0 | Bản làm việc riêng **tạo từ nhánh `claude/xenodochial-mccarthy-41fc32`** (hoặc sau khi chủ đã nhập nhánh đó vào bản chính) để có hồ sơ 24/11; kiểm không phiên nào đang sửa `public/app.css` hay `web/khung.ts` | ghi ở sổ việc |
| 1 | **Ảnh xem trước để chủ duyệt** (chưa sửa mã): lớp B (`docs/evidence/2026-11-24-danh-gia-thi-giac/kich-ban/lop-kieu/phuong-an-a.css` + `-b.css`) chuyển thành bản «giá trị gốc + thành phần + khung chung» (bỏ luật viết riêng cho từng màn, thay `color-mix()`), tiêm lên **bốn màn mẫu khung gốc** (Đơn hàng, Chi tiết đơn, Sửa xe, Địa điểm) và **hai màn của đối tác** (Đơn hàng, Tạo đơn của Đối tác) ở 390 và 1.280, cộng Đơn hàng ở 1.440 cho mức gọn; dùng `chup.mjs --tiem` của lượt 24/11 (mỗi tài khoản thử đăng nhập một lần) | chủ duyệt chữ ADR-0234 và sáu cặp ảnh; số của thang chữ và hai mức mật độ ghi vào ADR lúc chép |
| 2 | Chép ADR-0234 vào `docs/adr/`, dòng mục lục (kiểm lại số trống trên mọi nhánh) | ADR có trạng thái accepted, ngày, nguyên văn lời duyệt |
| 3 | **Máy canh trước, giá trị sau:** bài kiểm trần (Đ5a) và bốn phép đo thêm vào `npm run do-khung` (Đ5b), đo trần trên mã hiện tại | mỗi hàng rào đã thấy đỏ thật một lần (sửa cố ý → đỏ → hoàn nguyên), có dòng ở `docs/SO-HANG-RAO.md` |
| 4 | Thi công: giá trị gốc ở `:root` (bóng, bo góc, thang chữ, phông tiêu đề, nền, viền, mặc định núm trong `src/shared/giao-dien.ts`); khung chung (thanh trên, dải nhắc, thanh dưới, thanh bên, ảnh đại diện); thành phần chung (`.nut`, `.o`, `.huy-hieu`, `.badge`, `.btn`, `.card`, khối và dòng của khung gốc); luật viết tiền; mức gọn cho khuôn Danh sách; bảng «động từ → cấp nút» | ảnh trang thật trùng ảnh đã duyệt ở bước 1 (công cụ so ảnh của khung gốc); hạ trần về đúng số đo sau đợt |
| 5 | Kiểm: lệnh đo khung gốc quét 360–1.920; chụp lại 111 màn bằng kịch bản 24/11 so với lượt «hiện tại» (không màn nào tràn ngang, tương phản không tệ hơn); trợ lý đánh giá giao diện; người kiểm độc lập; `npm test` và `npm run typecheck` một lần ở cuối; mục nhật ký thay đổi | tiêu chí nghiệm thu 1–5 của ADR-0234 đạt |
| 6 | Chủ nhập bản chính và triển khai | ghi trạng thái triển khai ở `docs/HANDOFF-N1.md` |

## Điều đợt A tới F nhận thêm

Mỗi đợt: ảnh đề xuất vẽ theo ADR-0234; tiêu chí nghiệm thu thêm bốn phép đo của Đ5b (trần chỉ được hạ); việc ruột trang: bỏ chữ đậm thừa, đưa nút về đúng cấp theo bảng động từ, thay ô chọn và ô tích gốc của trình duyệt, đưa rỗng, đang tải, lỗi, không quyền về một khuôn. Ảnh xem trước đợt A chụp 21/11 (`~/tourdao-khung-goc-dot-a/`) phải vẽ lại.

## Rủi ro đã biết

- Đổi mặc định núm «Phông tiêu đề», «Nền trang», «Viền»: chủ chưa ghi đè ba núm này nên mọi người thấy đổi ngay khi triển khai; bản chạy thật đang ghi đè phông nội dung và hai độ đậm, những núm đó giữ.
- Đổi giá trị gốc chạm mọi trang, kể cả trang chưa chuyển khung gốc: bước 5 phải chụp lại đủ 111 màn, không chỉ màn mẫu.
- Trần gói trang (`src/goi-trang-nhe.test.ts`) có thể phải nới nếu bảng «động từ → cấp nút» vào gói; ghi lý do ở lần lưu.
