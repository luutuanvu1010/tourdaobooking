# Bản đề xuất ADR — Khung gốc giao diện: mỗi màn một khuôn, bố cục chỉ dựng từ khối và thang đo chung, tuỳ biến qua bốn cửa, có máy canh

- **Trạng thái:** **đề xuất** 2026-11-21, **chưa có hiệu lực**. AI soạn theo lời chủ dự án cùng ngày, nguyên văn: «tiếp tục việc sửa giao diện, bố cục lại từ gốc, nhiều màn hình có bố cục không đều, các module có. chiều rộng không giống nhau và rất nhiều vấn đề khác. Hãy phân tích lại toàn diện để chúng ta áp khung, luật để tự động các màn buộc phải tuân thủ theo (là gốc), rồi mỗi màn cần có tùy biến gì cho phù hợp thì cũng phải dựa trên cái gốc để đảm bảo giao diện, các thành phần giao diện,.... có sự nhất quán.» Chủ duyệt thì chép thành ADR ở `docs/adr/` (số dự kiến 0222, chốt lúc chép) và soạn diff một điều mới của Hiến chương (Hiến pháp N3, Điều 9).
- **Nguồn:** `BAO-CAO.md` và `SO-LIEU.md` cùng thư mục (đo 87 màn × 4 bề rộng trên bản chính `6e50cd18b`).
- **Loại:** việc lớn vì là luật. Không chạm dữ liệu, quyền, tiền, máy chủ. **Cửa:** hai chiều (gỡ được bằng một ADR khác; màn đã chuyển sang khuôn không cần chuyển lại).
- **Quan hệ với quyết định cũ:** **giữ** lưới 15/11 (lề 16 và 24, ba mức bề rộng, bám trái; `docs/superpowers/plans/2026-11-14-buoc-2-luoi-bo-cuc.md`), chỉ đổi cách khai: mức bề rộng đi theo khuôn. **Giữ** bộ thành phần chung đợt 0 (28/10) và nâng nó thành thế hệ duy nhất. **Giữ** ADR-0087 (bộ màu, phông, cỡ chữ của công ty), ADR-0167 (chữ trên giao diện), các bản vẽ Trang chủ đã duyệt. **Mở đường** cho ADR-0194 đợt 3 (Toàn quyền xếp thứ tự, nhóm trường trong khối có sẵn), vì bố cục thành thứ khai báo được. **Vá** kế hoạch 13/11 (`docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md` mục 5): chen bước 2b trước bước 3, không lập lộ trình mới.
- **Xây trên lỗ đang hở:** không.

## Bối cảnh

Lưới 15/11 quản viền ngoài của trang. Bên trong, mỗi trang tự dựng bằng bộ kiểu riêng: 146 họ lớp, 1.505 trên 1.807 tên lớp chỉ một tệp dùng, 64 trên 87 màn không dùng lớp nào của bộ thành phần chung. Hệ quả đo được ở máy tính: 24 kiểu vỏ thẻ, 52 tỉ lệ chia cột, 11 khoảng cách giữa các khối, nút chính của các trang cùng loại nằm ở ba tới năm kiểu vị trí, nơi bên trái nơi bên phải. Tệp kiểu có 10 mốc đổi bố cục theo bề rộng cửa sổ (hai mốc chính 641 và 900, tám mốc lẻ của từng trang); một mốc lẻ làm màn Đơn hàng vỡ cột tên khách khi cửa sổ rộng 1.100 tới 1.199. Bài kiểm lưới hiện có chỉ đọc chữ trong tệp kiểu, nên phần bên trong trang đang dựa vào kỷ luật.

## Quyết định

1. **Đ1 — Thang đo đóng.** Khoảng cách, bề rộng cột, cỡ ô nhập, bo góc, bóng, mốc đổi bố cục lấy từ **một** bộ số của khung. Khoảng cách giữ bảy bậc đang có (4, 8, 12, 16, 24, 32, 48). Bên trong trang dùng lưới 12 cột. Màn cần số mới thì sửa thang (mọi màn cùng hưởng), không thêm token riêng cho một màn. Thang chữ nhận kết quả việc phông chữ đang làm ở phiên sửa giao diện, không quyết lại ở đây.
2. **Đ2 — Mỗi màn đúng một khuôn trang.** Bảy khuôn: Danh sách, Chi tiết, Biểu mẫu, Thiết lập, Tổng quan, Trang đọc, Trạng thái. Khai ở `<body data-khuon>` (thuộc tính này đã có ở 12 trang cho khung chờ tải). Khuôn định sẵn: các vùng và thứ tự vùng, chỗ đặt nút chính ở máy tính và ở điện thoại, mức bề rộng. Mức bề rộng không còn chọn tay từng trang.
3. **Đ3 — Một kiểu khối; bố cục trong khối chỉ từ bộ dựng sẵn.** Một vỏ khối (đầu khối, thân, chân) với đệm, bo góc, viền cố định. Bên trong chỉ có: lưới cột (1 tới 4 cột trên lưới 12), hàng nhãn và giá trị, bảng, danh sách dòng, thanh nút. Thẻ không lồng quá một tầng.
4. **Đ4 — Một thế hệ thành phần.** Nút, ô nhập, huy hiệu, thẻ, tab của bộ thành phần chung là thế hệ duy nhất. Lớp cũ (`.btn`, `.card`, `.badge` và các kiểu nút riêng của trang) được đổi thành bí danh của lớp mới trong một đợt, rồi gỡ theo từng họ màn. Trong lúc chuyển, số tệp còn dùng lớp cũ chỉ được giảm.
5. **Đ5 — Tuỳ biến qua bốn cửa.** (a) chọn khuôn; (b) bật hay tắt vùng tuỳ chọn của khuôn; (c) chọn tham số trong thang (số cột, cỡ ô nhập, có cột phụ hay không); (d) ngoại lệ có tên, ghi ở **một** sổ trong mã (màn nào, phần nào, lý do, ngày chủ duyệt). Phần ngoại lệ nằm trong một khối «vùng tự do»; khung ngoài và vỏ khối vẫn theo khung. Khởi đầu sổ: Trang chủ (bản vẽ đã duyệt), Đăng nhập, màn bảo trì, dòng thời gian Điều phối xe, ảnh vé, Quét vé.
6. **Đ6 — Bố cục đáp theo chỗ trống thật.** Khung ngoài chỉ có hai mốc theo bề rộng cửa sổ (641: hết kiểu điện thoại; 900: có thanh bên). Bên trong trang, khối đổi số cột theo bề rộng của **vùng nội dung**, không theo bề rộng cửa sổ. Không thêm mốc riêng cho một màn.
7. **Đ7 — Máy canh.** (a) Bài kiểm trong `npm test`: trang không khai khuôn hợp lệ là đỏ; thêm bề rộng, cách chia cột, khoảng cách, mốc đổi bố cục ngoài phần khung của tệp kiểu là đỏ; các số «chưa theo khung» có trần và trần chỉ được giảm (theo khuôn bài khoá `confirm` hiện có); mục sổ ngoại lệ thiếu lý do hay ngày duyệt là đỏ. (b) Lệnh đo trên trang thật, dựng từ kịch bản của đợt này: với màn đã chuyển, quét mọi bề rộng từ 360 tới 1.920 và kiểm khối thẳng mép, một kiểu vỏ, khoảng cách thuộc thang, nút chính đúng chỗ, không chữ bị bóp, không tràn ngang. (c) Trợ lý đánh giá giao diện thêm tiêu chí «đúng khuôn» và đo thêm bề rộng trung gian. Mỗi hàng rào có một dòng ở `docs/SO-HANG-RAO.md` sau khi quan sát nó chặn thật.
8. **Đ8 — Cách chuyển.** Không đổi mọi màn một lần. Dựng khung và máy canh trước, làm bốn màn mẫu (mỗi khuôn chính một màn), chủ duyệt hình bằng ảnh thật trước và sau. Sau đó chuyển từng họ màn theo thứ tự bước 3 của kế hoạch 13/11; mỗi họ một lượt duyệt ảnh, một lượt kiểm độc lập, rồi hạ trần. **Số đo cụ thể của thang và hình của từng khuôn do chủ duyệt bằng ảnh, không nằm trong quyết định này.**

## Hệ quả

- Sau khi duyệt: một điều mới ở Hiến chương (diff đề xuất riêng), sửa `web/CLAUDE.md`, công thức thêm trang ở `docs/CHANGE-GUIDE.md`, `docs/TIEU-CHI-GIAO-DIEN.md`. Đều là tệp luật hoặc tài liệu sống, sửa một lần mỗi tệp.
- Mã khuôn dùng chung vào gói của mọi trang, nên trần gói trang Đơn hàng có thể phải nới một lần; đo lúc thi công, ghi lý do ở lần lưu.
- Hình của nhiều màn sẽ đổi: kịch bản Chrome, bài canh trang Hướng dẫn và ảnh trong Hướng dẫn phải cập nhật theo từng họ màn.
- Việc giao diện mới trong lúc chuyển phải dùng khung ngay; máy canh chặn thêm số riêng.
- Các phiên khác đang sửa `web/` (ví dụ phiên ADR-0221) cần xong hoặc xếp thứ tự trước mỗi đợt chuyển họ màn mình chạm.

## Tiêu chí nghiệm thu

1. Thêm vào tệp kiểu một luật đặt bề rộng riêng ngoài phần khung ⇒ `npm test` đỏ; gỡ đi thì xanh (quan sát đỏ thật một lần).
2. Tạo một trang mới không khai khuôn, hoặc khai khuôn ngoài bảy tên ⇒ `npm test` đỏ.
3. Bốn màn mẫu, mọi bề rộng 360 tới 1.920 bước 20: 0 đoạn chữ bị bóp, 0 tràn ngang; khối lớn kín vùng nội dung hoặc đúng cách chia cột của khuôn; một kiểu vỏ khối; khoảng cách chỉ thuộc thang; nút chính đúng vị trí của khuôn ở cả hai khổ.
4. Sau mỗi đợt, mọi số «chưa theo khung» nhỏ hơn trước đợt; không số nào tăng.
5. Mục sổ ngoại lệ thiếu lý do hoặc ngày duyệt ⇒ đỏ.
6. `npm test` thoát 0, `npm run typecheck` 0 lỗi; người kiểm độc lập và trợ lý đánh giá giao diện đã soát; chủ đã duyệt ảnh trước và sau của đợt.

## Điều chủ cần biết

- Quyết định này chỉ chốt **cách quản**, chưa chốt hình. Hình của từng khuôn bạn sẽ duyệt bằng ảnh ở bốn màn mẫu.
- Trang chủ, Đăng nhập, dòng thời gian Điều phối xe, ảnh vé vào sổ ngoại lệ từ đầu, không bị ép đổi.
- Hai lỗi làm hỏng việc (cột tên khách ở Đơn hàng khi cửa sổ rộng 1.100 tới 1.199; mất nút lưu ở Chính sách điều phối trên điện thoại) nên sửa riêng, không chờ khung.
