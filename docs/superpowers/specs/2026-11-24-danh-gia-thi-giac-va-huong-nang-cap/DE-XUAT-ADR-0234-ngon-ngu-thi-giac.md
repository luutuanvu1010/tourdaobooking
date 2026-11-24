# ADR-0234 (đề xuất) — Ngôn ngữ thị giác chung: bảy nguyên tắc dùng màu, chữ, bề mặt, mật độ; giá trị đóng; máy canh chỉ cho giảm

- **Trạng thái:** **đề xuất**. Chủ dự án đã duyệt **hướng** ngày 24/11/2026, gõ trong ô chat của phiên đánh giá, nguyên văn «ok chọn B, làm theo khuyến nghị», trả lời ba điều ở mục 8 của `BAO-CAO.md` cùng thư mục: (1) chọn phương án B; (2) đổi lại một phần đặc tả «Thị giác 1.70» (2/10) và đề cương 27/10 bằng một ADR mới; (3) hai mức mật độ đi theo thiết bị. Lời đó duyệt ba điều về **nguyên tắc**; **chữ của ADR này** và **số đo cụ thể** (thang chữ, hai mức mật độ, các trần) chủ duyệt sau, cùng ảnh trước và sau của đợt gốc, như ADR-0222 Đ8. Khi duyệt, phiên thi công chép tệp này vào `docs/adr/ADR-0234-ngon-ngu-thi-giac.md` và thêm dòng mục lục; số `0234` đã kiểm trống trên bản chính và mọi nhánh chưa nhập lúc soạn (24/11), kiểm lại lúc chép.
- **Ngày:** 2026-11-24.
- **Nguồn:** `BAO-CAO.md`, `PHU-LUC.md` (phần D bảy nguyên tắc, phần E bảng quyết định bị đụng, phần I kết quả kiểm độc lập) cùng thư mục; ảnh ở trang so sánh riêng tư ghi đầu `BAO-CAO.md`; lớp kiểu xem trước ở `docs/evidence/2026-11-24-danh-gia-thi-giac/kich-ban/lop-kieu/`.
- **Loại:** việc lớn vì là luật. Không chạm dữ liệu, quyền, tiền, máy chủ. **Cửa:** hai chiều (đổi giá trị token, gỡ được bằng một ADR khác).
- **Xây trên lỗ đang hở:** không.
- **Vị trí:** nằm dưới ADR-0222 (khung gốc). ADR-0222 quản **bố cục**; ADR này quản **diện mạo** của khung đó: giá trị gốc (tầng 1 của khung) và dáng thành phần (tầng 5). Điều Hiến chương đề xuất ngày 21/11 (`../2026-11-21-khung-goc-giao-dien/DE-XUAT-HIEN-CHUONG.md`, số giữ chỗ 5.30) vẫn chờ chủ duyệt riêng; ADR này không thêm điều Hiến chương nào.

## Bối cảnh

Đo 111 màn × 3 bề rộng trên bản 3.42 (`PHU-LUC.md` phần B): giá trị đã kỷ luật (33 trên 35 màu đang hiện là token, phép đo không thấy chữ thiếu tương phản) nhưng **cách dùng** chưa có luật: 68 % số mẩu chữ ở điện thoại là chữ đậm (53 % theo ký tự); bốn sắc đỏ cho bốn loại việc; khối vừa viền vừa bóng; 15 cỡ chữ, hai họ phông gần giống nhau, tiền viết 30 kiểu; khung chung chiếm trung vị 20 % màn điện thoại (tới 34 %); một mật độ cho cả điện thoại lẫn bảng văn phòng; cùng động từ «Thêm» mang bốn dáng màu.

## Quyết định

1. **Đ1 — Bảy nguyên tắc** (chữ đủ và phép kiểm ở `PHU-LUC.md` phần D): (1) trong một dòng chỉ một thứ đậm, trong một khối chỉ một con số nổi; (2) mỗi màu một việc, tiền viết màu mực, san hô chỉ cho một hành động chốt mỗi màn, trạng thái luôn có chữ và dấu, không chỉ màu; (3) phẳng trước, nổi khi thật sự nổi: khối viền mảnh không bóng, chỉ lớp nổi có bóng, hai bậc bo góc cộng tròn hẳn; (4) một thang chữ ngắn, một họ phông, tiền viết một kiểu (đủ số, số đều cột); (5) khung chung nói nhỏ hơn nội dung: thanh trên mang tên trang, dải nhắc một dòng nền trắng có vạch màu, khung chung ở điện thoại không quá một phần tư màn; (6) hai mức mật độ đi theo khuôn và thiết bị, không phải công tắc của người dùng; (7) một màn một nút nền đặc, một động từ một cấp nút, một dáng cho ô chọn, ô tích, tab, một khuôn chung cho rỗng, đang tải, lỗi, không quyền.
2. **Đ2 — Giá trị đóng.** Bảng vai màu (mực, biển đậm, xanh nhạt «đang chọn», san hô, đỏ, cát, lá, ngọc cho vòng tiêu điểm và vạch chỉ báo), thang chữ, hai bậc bo góc, ba tầng bề mặt, hai mức mật độ là **một** bộ giá trị ở tầng gốc của khung (ADR-0222 Đ1). Màn cần giá trị mới thì sửa bộ chung, không thêm token cho một màn. **Số cụ thể chủ duyệt bằng ảnh** ở đợt gốc; điểm khởi đầu là lớp xem trước B: thang chữ 12 · 14 · 16 · 18 · 24 · 32; bo 8 và 12; mức «gọn» dòng 44, đầu bảng 36, chữ bảng 14; mức «thoáng» dòng 52, vùng chạm từ 44.
3. **Đ3 — Mức «gọn» chỉ máy chọn.** Bật khi màn rộng từ 900 **và** thiết bị có chuột, chỉ cho bảng của khuôn Danh sách (và bảng trong khuôn khác khi sổ ngoại lệ cho phép). Chỉ giảm chiều dọc và một bậc chữ bảng; không đổi cỡ nút, ô nhập, vùng chạm; không chữ dưới 12. Không thêm núm ở màn Giao diện công ty.
4. **Đ4 — Một dáng cho mỗi cấp nút và mỗi thành phần**, áp lên bộ thành phần chung đã là thế hệ duy nhất theo ADR-0222 Đ4: nút chính (nền đặc biển đậm), nút chốt (san hô, tối đa một mỗi màn), nút phụ (nền trắng viền mảnh), lối chữ, nút nguy hiểm (chỉ nền đặc trong hộp xác nhận). Một bảng «động từ → cấp nút» nằm trong mã cạnh bộ thành phần.
5. **Đ5 — Máy canh, theo khuôn trần chỉ được giảm của ADR-0222 Đ7a.** (a) Bài kiểm trong `npm test`: số token màu, số cỡ chữ, số kiểu bo góc, số kiểu bóng trong tệp kiểu có trần, chỉ được giảm; thêm ngoài bảng là đỏ; cấm `color-mix()` và màu viết thẳng ngoài khối `:root`. (b) Lệnh đo trên trang thật (`npm run do-khung`, đã chạy trong lượt kiểm GitHub) thêm bốn phép đo của `do-thi-giac.js`: tỉ lệ mẩu chữ ở mức đậm, số nút nền đặc trong vùng nội dung, màu của số tiền, bóng trên khối trong vùng nội dung. **Ngưỡng là trần đo ở đợt gốc, chỉ được hạ** theo từng đợt khung gốc; không ghi cứng một con số đích (lớp xem trước B còn vượt 40 % chữ đậm ở 4 trên 9 màn). (c) Bảy nguyên tắc vào tiêu chí của trợ lý đánh giá giao diện (đề xuất sửa `docs/TIEU-CHI-GIAO-DIEN.md`, chủ duyệt). Mỗi hàng rào có dòng ở `docs/SO-HANG-RAO.md` sau khi thấy đỏ thật một lần.
6. **Đ6 — Cách chuyển.** Một **đợt gốc** đứng trước đợt A của kế hoạch tám đợt đã duyệt 21/11: đổi giá trị gốc, khung chung, thành phần dùng chung, dựng máy canh, chụp lại bốn màn mẫu khung gốc và hai màn của đối tác để chủ duyệt ảnh. Phần ruột trang (bỏ chữ đậm thừa, đưa nút về đúng cấp, thay ô chọn và ô tích gốc, khuôn trạng thái) đi cùng từng đợt A tới F, thứ tự giữ nguyên; ảnh đề xuất của mỗi đợt vẽ theo ngôn ngữ này. Không lập lộ trình song song.

## Quan hệ với quyết định cũ

**Đổi lại** (chủ đồng ý về nguyên tắc 24/11; ADR này là văn bản đổi):
- Đặc tả «Thị giác 1.70» (`docs/superpowers/specs/2026-10-02-thi-giac-nen-tang-design.md`, chủ duyệt 2/10): bỏ bóng mềm hai lớp của thẻ; bỏ bóng màu dưới nút chính và nút san hô; bỏ độ bóng ô chức năng Trang chủ; dải tóm tắt Chi tiết đơn một màu, không chuyển màu; thanh tab điện thoại nền đặc, không mờ kính. **Giữ** từ 1.70: bốn màu của hướng «Năng động» (biển đậm, xanh ngọc, san hô, cát), chuyển động nhẹ và chế độ giảm chuyển động, vòng tiêu điểm. Nền trang nhích từ `#f2f5f9` sang trung tính hơn (số duyệt bằng ảnh).
- Đề cương hệ thống hợp nhất 27/10 (`../2026-10-27-danh-gia-ux-tong-the/HE-THONG-HOP-NHAT.md` mục 8, chủ duyệt cả gói): thang cỡ chữ 14 bậc «giữ mã» gộp còn thang ngắn ở Đ2; bo góc 8/12/18/tròn «giữ mã» bỏ bậc 18; mật độ «gọn/thoáng» dòng 40/48 **do chủ chọn ở Giao diện công ty** thành Đ3 (máy chọn theo thiết bị, số duyệt bằng ảnh). **Giữ** từ đề cương: ba tầng token, huy hiệu trạng thái có biểu tượng và chữ, thang nút ba cấp.
- Chú thích token san hô ở đầu `public/app.css` («hành động chốt **và nhãn giá**»): san hô không còn cho số tiền.
- Kế hoạch 13/11 mục 8 («giữ màu, phông, biểu tượng của Tour Đảo»): tiêu đề thôi dùng Be Vietnam Pro, dùng chung phông nội dung chủ đang chọn ở núm. Màu, biểu tượng giữ.

**Đổi mặc định, không đổi núm** (ADR-0087): danh sách núm và ba giá trị chủ đang đặt (phông nội dung, hai độ đậm) giữ nguyên. Mặc định của núm «Phông tiêu đề» (chủ chưa ghi đè nên mọi người sẽ thấy đổi), «Nền trang», «Viền» đổi theo Đ2. Nguyên tắc 1 làm thứ bậc bằng cỡ, màu mực và mờ, nên vẫn đứng được khi chủ chỉnh núm độ đậm.

**Giữ nguyên:** ADR-0222 (khung gốc, bảy khuôn, bốn cửa tuỳ biến, sổ ngoại lệ) và lưới bề rộng ba mức 15/11; ADR-0015 điều hướng; ADR-0167 chữ trên giao diện (riêng nhãn viết HOA của dải tóm tắt đơn, nếu đổi cách hiện thì tra bảng tham chiếu lúc thi công); ADR-0194 (đợt 4 «màu: chọn chủ đề» là chỗ đặt chủ đề tối hay chủ đề khác sau này); quyết định 27/10 về ba mức độ đậm (chủ đang đặt 500 và 600 bằng núm); dải «Tin quan trọng» không có nút đóng (13/11) — đổi hình, giữ hành vi; đặc tả 2/10 mục rủi ro «không dùng `color-mix()`» — lớp xem trước có một chỗ dùng, thi công phải thay.

**Trang chủ:** bản vẽ đã duyệt là ngoại lệ có tên của ADR-0222 Đ5 và được giữ, kể cả hai nút san hô ở máy tính («Tạo đơn» trên thanh trên và «Xem đơn chờ xác nhận»). Đây là giả định của phiên soạn: khuyến nghị 24/11 không nói tới chỗ này. Trang chủ vẫn nhận giá trị gốc mới (bóng, bo góc, phông, màu tiền).

## Hệ quả

- Ảnh đã duyệt 21/11 của bốn màn mẫu khung gốc thôi là chuẩn so ảnh; chuẩn mới là ảnh chủ duyệt ở đợt gốc (công cụ so ảnh của khung gốc dùng lại).
- Ảnh xem trước của đợt A đã chụp 21/11 (`~/tourdao-khung-goc-dot-a/`, chưa duyệt) phải vẽ lại theo ngôn ngữ này.
- Ảnh trong Hướng dẫn, kịch bản bấm thử của từng họ màn cập nhật theo từng đợt (vốn đã nằm trong các đợt khung gốc).
- Chủ đề tối và chủ đề khác trở thành một bộ giá trị cho tầng theo nghĩa; trước khi làm phải dọn màu viết thẳng còn sót (nền `#fff` của `.btn`, nền nút gốc `#efefef`, nền chuyển màu ở 11 màn).

## Tiêu chí nghiệm thu (đợt gốc)

1. Thêm một màu, một cỡ chữ, một kiểu bóng hay một `color-mix()` vào tệp kiểu ngoài bảng ⇒ `npm test` đỏ; gỡ đi thì xanh (thấy đỏ thật một lần).
2. Lệnh đo trên trang thật báo bốn phép đo mới cho mọi màn trong bảng màn của nó; nâng một trần lên ⇒ đỏ.
3. Trên bốn màn mẫu khung gốc và hai màn của đối tác, ở 390 và 1.280: khối trong vùng nội dung không có bóng; số tiền màu mực, số đều cột; tối đa một nút san hô; dải nhắc một dòng; ở máy tính có chuột, bảng Danh sách ở mức gọn; ở điện thoại vùng chạm không giảm.
4. Trên 111 màn của lượt 24/11, không màn nào tràn ngang ở 390 và 1.280; tương phản không tệ hơn trước.
5. `npm test` thoát 0, `npm run typecheck` 0 lỗi; người kiểm độc lập và trợ lý đánh giá giao diện đã soát; chủ đã duyệt chữ ADR này và ảnh trước, sau của đợt gốc.
