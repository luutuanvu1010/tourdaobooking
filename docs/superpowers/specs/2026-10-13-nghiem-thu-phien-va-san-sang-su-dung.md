# Nghiệm thu phiên 8–13/10/2026 và chuẩn bị đưa Nền tảng vào sử dụng

> Hồ sơ có ngày, viết xong là đóng băng; không sửa lại cho khớp hiện trạng. Có gì mới thì viết bản mới và trỏ về đây. Nối tiếp `docs/superpowers/specs/2026-10-12-kiem-toan-toan-nen-tang/README.md` (kiểm toán) và `docs/superpowers/specs/2026-10-13-nghiem-thu-ban-1-89.md` (nghiệm thu bản 1.89).

## 1. Kết luận

Bốn bản (1.87, 1.88, 1.89, 1.90) đã lên production và qua kiểm máy; ba chỗ hở tiền do kiểm toán tìm ra đã vá và có người kiểm độc lập xác nhận. Nền tảng **sẵn sàng cho dùng thử có kiểm soát với nhóm nhỏ**. Chưa nên mở cho toàn bộ nhân viên và đối tác cho tới khi xong năm việc ở mục 5 (đa số là việc của chủ và Kế toán, không phải việc viết mã).

## 2. Nội dung chính của phiên

| Bản | Nội dung | Cách làm |
|---|---|---|
| 1.87 (12/10) | **Sổ đại lý đợt 1**: Kế toán đặt mức hoa hồng cho đối tác theo từng dịch vụ hoặc nhóm; ghi ai bán dịch vụ nào; đơn đặt qua đại lý hiện hoa hồng theo mức chụp lúc xác nhận; đối tác thấy hoa hồng của chính mình; khoá sổ từng tháng (ADR-0077, 0078 B1, 0080 D1; migration 0090) | Kế hoạch 14 task, mỗi task có người kiểm độc lập |
| (12/10) | **Kiểm toán toàn Nền tảng**: chụp lại hiện trạng, sửa tám tài liệu mô tả cho khớp mã, bốn người kiểm độc lập; kết quả không có lỗi Critical, bốn lỗi High | Hồ sơ `2026-10-12-kiem-toan-toan-nen-tang/` |
| 1.88 (12/10) | Gói **Vận chuyển A+C** (phiên khác): màn tài xế, tài xế nhà xe ngoài, chuyển khách giữa hai xe, bảng điều phối; migration 0091–0093 | Phiên khác làm; phiên này ghép bản chính vào nhánh vá |
| 1.89 (13/10) | **Vá ba chỗ hở tiền**: Thực tập chỉ giá danh mục, không giảm giá (ADR-0100); rào ranh giới SQL của billing; rào một công thức hoa hồng | Hai vòng người kiểm độc lập, 64 phép phá thử |
| 1.90 (13/10) | **Sửa lỗi ô tìm chữ dài** (báo lỗi hệ thống khi gõ họ tên có dấu dài) ở danh sách đơn, Danh bạ, Nhật ký, chọn người hưởng, Lịch sử trợ lý | Tác vụ riêng, có bài kiểm và e2e |

Số liệu: đợt vá 12–13/10 gồm 6 commit, 35 tệp, khoảng 1.800 dòng thêm; bộ kiểm cuối 4.467 bài đạt, 0 đỏ, 10 bài chờ (có từ trước).

## 3. Kết quả kiểm trên production (lệnh chỉ đọc)

Kiểm lúc 10:20 giờ Việt Nam ngày 13/10, sau khi bản 1.90 lên (lần triển khai gần nhất 10:15 giờ Việt Nam):
- Production báo phiên bản **1.90**; cổng `kiem-phien-ban.mjs --sau-deploy` ĐẠT.
- `wrangler d1 migrations list --remote`: không còn migration nào chưa áp (bản 1.90 không có migration).
- `audit-invariants.mjs --db remote`: mọi bất biến đạt, 4 cảnh báo có từ trước (xem dưới).
- `wrangler deployments list`: lần triển khai Worker gần nhất ngày 13/10 lúc 10:15 giờ Việt Nam (Version `89eed59f`).
- Chế độ bảo trì vẫn bật (cài đặt của chủ), tự hết lúc 20:10 giờ Việt Nam ngày 13/10.
- **Chưa kiểm:** ô tìm chữ dài trên production và luật giá Thực tập với tài khoản thật (cần đăng nhập); xem mục 4.

Kiểm chung (13/10, lúc production chạy 1.89): trang chủ, đăng nhập, Trợ giúp, manifest và service worker trả 200; các đường dữ liệu đơn, danh mục, nhân viên, việc của tôi trả 401 khi chưa đăng nhập; `GET /api/company` công khai theo thiết kế (biên nhận dùng). Bốn cảnh báo bất biến đã có từ trước (22 lần thu chưa rõ người thu; 7 xe thiếu giấy tờ xuất bến; 3 dịch vụ chưa phân nhóm; 42 đơn xác nhận trước sổ đại lý chờ chụp bù ở đợt 2).

## 4. Cách kiểm tra trên production (người dùng, khoảng 20 phút)

Chế độ bảo trì tự tắt lúc 20:10 giờ Việt Nam ngày 13/10; trước đó chỉ số điện thoại trong danh sách cho phép đăng nhập được.
1. Trang đăng nhập và Trợ giúp ghi đúng số phiên bản.
2. **Thực tập**: Tạo đơn, ô đơn giá và ô giảm giá chỉ đọc, có dòng «Tài khoản Thực tập không được giảm giá.»; lập đơn nháp theo giá danh mục, lưu và xác nhận được; xong huỷ đơn thử.
3. **Bán hàng**: ô đơn giá và ô giảm giá vẫn sửa được như trước.
4. **Ô tìm**: ở danh sách đơn, gõ cả một họ tên có dấu dài (trên 25 chữ): không báo lỗi hệ thống, kết quả tìm theo phần đầu. Làm tương tự ở Danh bạ.
5. **Kế toán / Quản trị**: mở màn «Hoa hồng đối tác» và «Khoá sổ tháng» (không khoá tháng nào khi kiểm); đơn đặt qua đối tác hiện hoa hồng.
6. **Đối tác**: đăng nhập, chỉ thấy đơn của mình và hoa hồng của chính mình; ô giảm giá vẫn bị khoá.
7. **Tài xế** (nếu có tài khoản): màn tài xế mở được, có nút chỉ đường.
Nếu một bước sai, ghi lại bước, tài khoản, giờ, rồi báo ngay; máy chủ vẫn chặn đơn lệch giá dù giao diện có hiện sai.

## 5. Chuẩn bị đưa vào sử dụng

Đã đạt (kỹ thuật): bộ kiểm và hàng rào máy xanh; mặc định từ chối quyền ở máy chủ; chống ghi trùng; nhật ký không ghi số điện thoại, email, mã số thuế; cổng phiên bản và cổng bất biến chạy mỗi lần triển khai; có điểm khôi phục Time Travel ghi trong `docs/HANDOFF-N1.md`.

Cần làm trước khi mở cho toàn bộ người dùng (đề xuất; tôi không đọc được dữ liệu production nên các mục dữ liệu là điều **chưa kiểm**):
1. **Dữ liệu.** Theo ghi nhận của phiên trước, production chỉ có dữ liệu thử. Chủ quyết: dọn dữ liệu thử hay giữ; nạp nhân viên thật từ Sheet, đồng bộ danh mục, tạo hồ sơ đại lý / đối tác thật. Ghi điểm Time Travel trước khi nạp.
2. **Diễn tập khôi phục.** Chưa diễn tập khôi phục lần nào (kiểm toán 12/10 đã ghi); làm một lần trên bản sao trước khi có dữ liệu thật và trước khi khoá tháng nào.
3. **Kế toán xác nhận sổ vàng.** 25 ca (cọc đơn huỷ, sổ đại lý, sổ công nợ) chưa ca nào được Kế toán hoặc chủ xác nhận; phải xong trước khi tin số tiền hoa hồng và cọc trên đơn thật (K-A-2).
4. **Kiểm tay đủ vai trên production** theo mục 4, mỗi vai một tài khoản thật; Face ID và đăng nhập trên iPhone (`docs/PWA-IPHONE.md`); bật thông báo (`docs/HUONG-DAN-BAT-THONG-BAO-DIEN-THOAI.md`).
5. **Tắt bảo trì và thông báo người dùng.** Chỉ chủ dùng được; chỉ tắt sau khi mọi người đã đăng nhập bằng bản mới; nói rõ kênh Góp ý / Báo lỗi trong Nền tảng và ai trực nhận (Toàn quyền).
Sau khi mở: đào tạo theo Trợ giúp từng vai; Kế toán đảo và ghi lại 22 lần thu chưa rõ người thu; giữ chưa khoá tháng cho tới khi diễn tập khôi phục xong.

## 6. Rủi ro còn lại và điều chưa kiểm

- Mốc **31/10**: năm mục mức cao trong sổ hoãn cùng hết hạn; từ 1/11 `npm test` đỏ ở mọi nhánh (ảnh hưởng người phát triển, không ảnh hưởng người dùng); cần vá hoặc gia hạn có lý do.
- Hệ quả đã biết của luật giá Thực tập: Thực tập kèm Quản trị bị chặn khi xác nhận hoặc sửa nháp có giảm giá của người khác; Thực tập kèm Bán hàng thấy nút nhập tay nhưng lưu luôn bị từ chối (`BACKLOG` mục 28).
- Chưa kiểm: luật giá Thực tập với tài khoản thật trên production; bộ kiểm API đầy đủ trên bản cuối; phần ghép hai tài liệu mô tả sau khi ghép bản chính chưa có người kiểm độc lập (sai ở đó chỉ là chữ); tài liệu gói Vận chuyển A+C còn sót vài chỗ (`BL-VA-TAI-LIEU-AC`).
- Chờ chủ duyệt: mục miễn có tên `holdsIntern` ở bài kiểm giao diện (khuyến nghị giữ).

## 7. Quyết định chờ chủ

1. Mức mở ra: dùng thử nhóm nhỏ trước (khuyến nghị) hay mở toàn bộ.
2. Xử lý dữ liệu thử trên production (dọn / giữ) trước khi nạp dữ liệu thật.
3. Hẹn buổi Kế toán xác nhận 25 ca sổ vàng và buổi diễn tập khôi phục.
4. Duyệt mục miễn `holdsIntern`; vá hoặc gia hạn năm mục hết hạn 31/10.
