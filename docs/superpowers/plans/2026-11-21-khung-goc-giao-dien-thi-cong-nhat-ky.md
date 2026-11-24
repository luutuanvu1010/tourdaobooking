# Khung gốc giao diện — sổ việc thi công (mở 21/11/2026)

> Tài liệu sống của việc này: trạng thái ghi ở đây, không ở trí nhớ phiên (P19). Phiên làm vai **thi công**; kiểm do trợ lý khác (N8).
> Luật: **ADR-0222** (`docs/adr/ADR-0222-khung-goc-giao-dien.md`), chủ dự án duyệt 21/11/2026, nguyên văn «oko duyệt» (cùng lời đó duyệt hình bốn màn mẫu và thang đo; bề rộng trang giữ ba mức 15/11). Hồ sơ phân tích: `docs/superpowers/specs/2026-11-21-khung-goc-giao-dien/`.
> Lời chủ dự án 21/11, nguyên văn: «bố cục lại từ gốc… áp khung, luật để tự động các màn buộc phải tuân thủ theo (là gốc), rồi mỗi màn cần có tùy biến gì cho phù hợp thì cũng phải dựa trên cái gốc».
> Nhánh `claude/jovial-leakey-a25fd6`, đã nhập bản chính `c23447ce9` (có bản sửa hai lỗi bố cục). Không nhập bản chính, không triển khai.
> Ngoài phạm vi: chuyển màn ngoài bốn màn mẫu; đổi chữ trên nút, nhãn; dữ liệu, quyền, tiền, máy chủ.

## Bảng việc

| Bước | Việc | Xong khi | Trạng thái |
|---|---|---|---|
| 0 | Chép luật thành ADR, dòng mục lục; soạn chữ đề xuất một điều mới của Hiến chương | ADR và mục lục đã ghi; bản đề xuất Hiến chương có trên nhánh | ADR-0222 và mục lục **xong** (`a81600291`); bản đề xuất Hiến chương: xem mục «Còn lại» |
| 1 | Xem trước bằng ảnh thật trên bốn màn mẫu | chủ duyệt hình | **xong**, chủ duyệt 21/11 |
| 2 | Khung và máy canh | mỗi hàng rào đã thấy đỏ thật một lần và có dòng ở `docs/SO-HANG-RAO.md` | **xong**: phần khung, hàm dựng, sổ ngoại lệ, bài kiểm (`65e1d541c`); lệnh đo `npm run do-khung` (`b294d5764`); 23 phép phá thử bài kiểm và 2 phép phá thử lệnh đo đều đỏ rồi hoàn nguyên; ba dòng ở sổ hàng rào |
| 3 | Chuyển bốn màn mẫu sang khung, gỡ lớp kiểu cũ | đúng hình đã duyệt; sáu tiêu chí nghiệm thu của ADR | **xong cả bốn màn**: mười hai ảnh trang thật (bốn màn × 390, 1.130, 1.440) khác ảnh đã duyệt 0,00 %; lệnh đo quét 79 bề rộng mỗi màn. Phần ruột chưa có trong ảnh đã duyệt vẫn dùng lớp cũ (mục 8 và 11) |
| 4 | Trợ lý đánh giá giao diện chấm bốn màn; người kiểm độc lập soát; `npm test`, `npm run typecheck` một lần ở cuối | cả hai báo cáo; hai lệnh xanh | chưa làm |

## Đã dựng gì (bước 2)

- **Thuộc tính khai khuôn:** `data-khung-goc` ở `<body>`, bảy giá trị. Không dùng `data-khuon` (dải nhắc bảo mật) hay `data-khung`, `data-khung-tam` (đã có việc khác).
- **Tệp kiểu** `public/app.css`: thang đo `--kg-*` ở `:root` (trước dấu mốc PWA vì có số px); phần khung nằm giữa hai dấu mốc «Khung gốc giao diện (ADR-0222)» và «Hết khung gốc giao diện (ADR-0222)» ở cuối tệp. Mọi bộ chọn trong đó mở đầu bằng `body[data-khung-goc]`, nên trang chưa chuyển không bị đụng.
- **Hàm dựng** `web/khung.ts`: `khoi`, `luoi`, `truong`, `cap`, `thanhNut`, `thanhViec`, `thanhLoc`, `dauTrang`, `thanhDay`, `haiCot`, `dsDong`, `vungPhu`, `khuonCot`, `datKhuonBang`, `o`. Nút vẫn viết thẳng `h("button", { class: "nut", "data-cap": … })`.
- **Sổ** `src/shared/khung-goc.ts`: bảy khuôn và mức bề rộng được khai, sổ ngoại lệ (sáu mục ADR nêu tên), danh sách trang chưa chuyển, hai máy soát thuần (`soatTrang`, `soatNgoaiLe`).
- **Bài kiểm** `src/khung-goc.test.ts` (máy canh Đ7a), `src/khung-web.test.ts` (cấu trúc hàm dựng, khuôn cột bảng Đơn hàng); phép đếm dùng chung `scripts/giao-dien/dem-khung-goc.mjs`.
- **Công cụ so ảnh** `docs/evidence/2026-11-21-khung-goc-thi-cong/kich-ban/so-anh.py`: so ảnh trang thật với ảnh chủ đã duyệt, in tỉ lệ điểm ảnh khác.

## Quyết định của người thi công (bề mặt, đảo ngược được; ghi để người kiểm cân)

1. **«Phần khung» chỉ là đoạn giữa hai dấu mốc.** Khối «Thành phần chung v2» và khung ngoài tính là ngoài khung (vẫn bị đếm). Bổ sung cho bộ thành phần viết ở tầng 5 của phần khung. Sai thì: con số «luật bố cục riêng» cao hơn thực chất, không hại.
2. **Trần dùng phép `≤` rồi hạ tay**, đúng khuôn bài khoá `confirm` mà ADR chỉ tới. Giữa hai lần hạ trần có thể có khoảng hở bằng số luật vừa gỡ. Thêm một danh sách trang đóng băng lúc lập luật để trang mới không thể «xin» chưa chuyển.
3. **Không có hàm dựng nút.** Máy so chữ nút (ADR-0167) đọc `h("button", …, "Chữ")` trong mã; bọc nút trong hàm sẽ làm nó mù.
4. **Bảng lưới của khuôn Danh sách:** màn khai cột bằng tên cột của thang (`src/shared/bang-don.ts`), hàm của khung ghép thành khuôn cột và đặt lên khối bảng; ô khai vùng bằng tên. Không có luật riêng của màn trong tệp kiểu.
5. **Bảng Đơn hàng giữ khoảng cách 8 trước nút xổ như ảnh đã duyệt.** Đúng ở mốc 800 tới 807, cột trạng thái lấn vào khoảng cách đó tối đa 8 điểm (huy hiệu hẹp hơn cột nên không chạm nút). Cột tên khách không bao giờ hẹp hơn 180 (bài `src/khung-web.test.ts` cộng lại từ token).
6. **Tên trang (h1):** phần khung không đặt luật; khung ngoài quyết như trước (trang không khai `data-title`, như Đơn hàng, vẫn hiện h1 ở điện thoại).
7. **Địa điểm:** biểu mẫu thêm và sửa mở trong bảng trượt; lỗi của thao tác hiện ngay trong bảng. Bảng tham chiếu chữ nút đã cập nhật nơi đặt nút (không đổi tên nút nào).
8. **Đơn hàng, bảng «Lọc đơn»:** chỉ đổi nút sang nút của bộ thành phần chung; bố cục bên trong bảng lọc (các lớp `loc-*`) chưa dựng lại bằng khung, vì không có trong ảnh đã duyệt. Việc còn lại cho đợt họ màn Đơn hàng.
9. **Bài `src/don-hang-bang-theo-vung.test.ts` đã gỡ**, vì đối tượng nó canh (khối `.don-bang`) không còn; điều nó canh (bảng bật theo vùng chứa, cột tên khách không bị bóp) nay nằm ở `src/khung-goc.test.ts` và `src/khung-web.test.ts`. Dòng sổ hàng rào tương ứng phải sửa.
10. **Máy sinh sơ đồ trang của trợ lý** (`scripts/sinh-so-do-trang.mjs`) nhận thêm thanh nút của khung; **bản gương bộ thành phần** thêm nhóm token «khung-goc».
11. **Chi tiết đơn:** dựng lại khung trang ngay trong mã (thanh việc, hai cột, mọi khối, cặp nhãn và giá trị, mục con của Dịch vụ). Thứ tự trong mã là thứ tự của điện thoại; vùng nội dung từ 560 thì tệp kiểu đưa thanh việc lên đầu. Nút «Xem ảnh gửi khách» và «Huỷ đơn» có hai bản (đầu trang ở máy tính; dính đáy và cuối trang ở điện thoại). Phần ruột không có trong ảnh đã duyệt giữ lớp cũ.
12. **Hình duyệt 21/11 thay mốc 1180 của quyết định 20/11 (H3).** H3 cho trang đơn một cột khi cửa sổ dưới 1.180; ảnh chủ duyệt 21/11 ở cửa sổ 1.130 là hai cột 7/5 theo vùng nội dung. Bài `src/sua-giao-dien-bon-y-noi-day.test.ts` ca H3 viết lại theo khung. Đã nói với chủ trong báo cáo.
13. **Nút chốt của đơn nháp** giữ màu san hô; «Xác nhận khách đã trả đủ», «Hoàn thành» thành nút phụ. Trạng thái này không có trong ảnh đã duyệt.
14. **Trần gói trang Đơn hàng nới 115.438 → 116.518** (lý do ở `src/goi-trang-nhe.test.ts`); đã rút gọn trước khi nới.

## Còn lại (cập nhật khi xong từng việc)

- **Đợt gốc ngôn ngữ thị giác (mới, đứng trước đợt A):** chủ chọn phương án B ngày 24/11 («ok chọn B, làm theo khuyến nghị»). Kế hoạch `docs/superpowers/plans/2026-11-24-dot-goc-ngon-ngu-thi-giac.md`; luật đề xuất `docs/superpowers/specs/2026-11-24-danh-gia-thi-giac-va-huong-nang-cap/DE-XUAT-ADR-0234-ngon-ngu-thi-giac.md` (chờ chủ duyệt chữ cùng ảnh). Hệ quả cho sổ này: ảnh đã duyệt 21/11 của bốn màn mẫu thôi là chuẩn so ảnh sau đợt gốc; ảnh xem trước đợt A (21/11) vẽ lại. Trạng thái 24/11: bước 0 xong (không nhánh nào khác đang sửa `public/app.css`, `web/khung.ts`; bản làm việc `claude/dot-goc-thi-giac-e74c62`). Bước 1 xong: chủ duyệt chữ ADR-0234 và ảnh chín màn (trang ảnh riêng tư bản 2), nguyên văn «duyệt, thi công». Bước 2 xong: `docs/adr/ADR-0234-ngon-ngu-thi-giac.md`, dòng mục lục. Bước 3 xong: ba hàng rào (bài `src/ngon-ngu-thi-giac.test.ts`, bốn phép đo trong `npm run do-khung`, bài `src/cap-nut.test.ts`), mỗi cái đã thấy đỏ thật, ba dòng ở `docs/SO-HANG-RAO.md`. Bước 4 xong: `public/app.css` sinh bằng `va-tep-kieu.py` (trùng bản đã chụp, trừ hai dòng chú thích đóng lại sau soát), mặc định núm, bản gương bộ v2, bảng động từ → cấp nút. Bước 5: lệnh đo khung đạt 316/316 ô trên máy thử và bản lượt kiểm GitHub (`do-khung-ci.mjs`); trợ lý đánh giá giao diện chấm ảnh xem trước (hai Nặng đã sửa); người kiểm độc lập đạt có điều kiện (đã sửa, điều chưa canh ghi ở sổ hàng rào); chụp lại 111 màn, chấm bản cuối, `npm test`, `npm run typecheck`: xem nhật ký cuối sổ.
- **Trần mới sau đợt gốc** (ghi cho đợt A tới F, chỉ được hạ): tệp kiểu 45 · 1 · 7 · 10 · 22 (màu token, màu ngoài `:root`, cỡ chữ, bo góc, bóng); chữ đậm theo khuôn Danh sách 44 %, Chi tiết 58 %, Biểu mẫu 57 %, Thiết lập 28 %; nút nền đặc 1; tiền lệch màu 0; khối có bóng 0; nút lệch bảng động từ 21. Năm con số khung gốc giữ nguyên (luật bố cục riêng 2.558: hai khai báo đệm thừa của dải nhắc bù cho hai khai báo của chấm huy hiệu).
- **Chuẩn so ảnh mới** của bốn màn mẫu: ảnh `~/tourdao-thi-giac-2026-11-24/anh/dot-goc-de-xuat/` (lượt cuối trước khi chủ duyệt), thay ảnh 21/11.
- **Năm con số sau đợt này:** 2.558 · 122 · 15 · 148 · 61 (trước: 2.597 · 128 · 16 · 154 · 65); trần đã hạ về đúng số đo.
- **Chưa làm:** tiêu chí «đúng khuôn» cho trợ lý đánh giá giao diện, đo bề rộng trung gian ở máy đo màn (ADR-0222 Đ7c).
- **Chưa thử:** iPhone, iPad thật; trạng thái ngoài ảnh của Chi tiết đơn (đơn chờ xác nhận, Trả sau, thành viên tổ chức).
- **Chữ đề xuất** một điều mới của Hiến chương (`docs/superpowers/specs/2026-11-21-khung-goc-giao-dien/DE-XUAT-HIEN-CHUONG.md`), và đề xuất sửa `web/CLAUDE.md`, công thức thêm trang ở `docs/CHANGE-GUIDE.md`, `docs/TIEU-CHI-GIAO-DIEN.md` (tệp luật: chỉ đề xuất, chủ duyệt).
- Kịch bản Chrome gắn với bốn màn (bảng ở `web/CLAUDE.md`): sửa bộ chọn đã đổi, chạy lại phần chạy được.
- Chép lại kho dữ liệu giả của máy thử trước lượt ảnh cuối (lượt bấm thử Địa điểm đã thêm một địa điểm và một khu vực thử).
- Bước 4.

## Ghi chú kỹ thuật

- Đo vùng chứa: `main` là vùng «trang», mỗi khối là vùng «khoi». Phần tử là vùng chứa thành khối chứa của con `position: fixed`: trang đã chuyển không đặt phần tử fixed trong `main`. Trình duyệt chưa hỗ trợ thì đứng ở bố cục hẹp nhất; **chưa thử iPhone đời cũ** (Đ6).
- Ảnh đã duyệt chụp bằng `chup.mjs` với thứ tự bốn màn trong một lượt và, ở điện thoại, `--cao-dt 1196` cho ba màn dài; so ảnh phải chụp cùng cách.
- Mã khuôn vào gói mọi trang dùng nó: đo trần gói trang Đơn hàng (`src/goi-trang-nhe.test.ts`) ở lượt `npm test` cuối; phải nới thì ghi lý do ở lần lưu.
- Phiên ADR-0221 (nhánh `claude/exciting-tu-2efdb7`) sửa `web/order.ts`, `web/order-form.ts`: nhánh nào nhập sau phải nhận nhánh kia và ghép tay `web/order.ts`.

## Nhật ký

- 21/11 sáng: mở phiên, làm bước 1, gửi chủ sáu tờ ảnh, dừng ở cổng duyệt.
- 21/11: chủ gõ «oko duyệt». Nhập bản chính `c23447ce9`. Chép ADR-0222 (`a81600291`). Dựng khung, hàm dựng, sổ, bài kiểm; chuyển Sửa xe và Địa điểm (`65e1d541c`); chuyển Đơn hàng.
- 24/11: phiên đánh giá thị giác (nhánh `claude/xenodochial-mccarthy-41fc32`) ghi đợt gốc ngôn ngữ thị giác vào mục «Còn lại» sau khi chủ chọn phương án B; chưa thi công.
