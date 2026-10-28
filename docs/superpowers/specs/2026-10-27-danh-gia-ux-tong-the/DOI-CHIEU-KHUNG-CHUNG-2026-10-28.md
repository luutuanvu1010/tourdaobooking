# Đối chiếu bản vẽ "Khung chung và năm khuôn trang" với đề bài số 1 (28/10/2026, chiều)

Hồ sơ có ngày. Người soạn: Main session (phiên điều phối Chặng 2). Đầu vào: bản xuất Claude Design chép ở `docs/evidence/2026-10-28-claude-design-khung-chung/` (xem `GHI-CHU-NGUON.md` ở đó); đề bài `PROMPT-CLAUDE-DESIGN-1-KHUNG-CHUNG.md` (mục 5 quyết định, 6 bộ quyền, 8 token, 9 sản phẩm, 10 đừng làm); mã `src/shared/muc-giao-dien.ts`, `web/shell.ts`, `src/shared/app-info.ts` để soát vài điểm bản vẽ tự khai. Kết quả dùng cho tờ `TO-CONG-2B-2026-10-28.md`.

## 1. Cách kiểm

1. **Phiên con chỉ đọc** (một lượt, 20 lần đọc tệp): đọc 7 tệp `.dc.html` và bộ `_ds/` kèm theo, đối chiếu từng dòng mục 5/6/9 của đề bài, đếm giá trị viết cứng, tìm chữ Anh và dữ liệu thật. Bảng ở mục 3 là của phiên này, Main session soát lại từng dòng có bằng chứng.
2. **Main session nhìn thật**: dựng `Khung chung.dc.html` bằng Chrome ẩn (chỉ để chụp; `--allow-file-access-from-files --virtual-time-budget=30000`, mỗi mục một lần qua `#k1 … #token`), đọc DOM để đếm artboard (K1 có đúng 10 nhãn `data-screen-label`, một bộ quyền một khung), xem ảnh K2, K3 (đầu, giữa, cuối), K4, K5 390, K6, T1–T5. Lần chụp đầu với ngân sách 10 s chỉ ra 5/10 khung K1 — là chụp sớm, không phải bản vẽ thiếu.
3. Soát bằng mã ba điểm phiên con đánh dấu "chưa đối chiếu": nhóm đầu thanh bên không có nhãn "HẰNG NGÀY" — **đúng mã** (`web/shell.ts` bỏ tiêu đề nhóm HẰNG NGÀY và CHÂN MENU); 13 ảnh `hien-trang/` **giống từng byte** ảnh ở `docs/evidence/2026-10-27-danh-gia-ux-tong-the/anh/`; tên sản phẩm trong mã là `APP_NAME = "Island Booking System"` (`src/shared/app-info.ts`), màn Đăng nhập của bản vẽ ghi "Tour Đảo Booking" là tên cũ.

## 2. Bản vẽ gồm gì

Một trang tổng có mục lục 9 phần, mỗi lần dựng một phần: **K1** 10 bộ × 390 (trang đầu của bộ; Bán hàng kèm dải nhắc bảo mật) · **K2** 768 phương án A (thanh bên gọn 56, rê/chạm xổ nhãn đè nội dung) và B (thanh tab dưới), cùng Toàn quyền / Đơn hàng nhiều · **K3** 10 bộ × 1040 + K3·11 Toàn quyền tiêu đề tách (phương án B) + K3·12 bấm Tab lần đầu (lối "Bỏ qua tới nội dung chính", phím `/`, `Esc`) · **K4** 1440: Toàn quyền Trang chủ hai cột, Kế toán Đơn hàng đang chọn dòng (ngăn chi tiết phải 360), Bán hàng Chi tiết hai cột · **K5** 10 trạng thái hệ thống × 390 và × 1040, một bản 1440 (403) · **K6** bảng trượt Lọc đơn, hộp thoại 520 (1040 và 1440), hộp xác nhận Huỷ đơn (hai khổ), thông báo ngắn năm tông (hai khổ), dải trên trang bốn loại, bảng năm tông, Tab hai biến thể · **T1–T5** năm khuôn × 390 và 1040, mỗi khuôn có công tắc Rỗng · Ít · Nhiều · Đang tải · Lỗi, thêm T3·Bước · bảng **Token đã dùng** 40 dòng (tên theo mã ↔ tên trong bộ ↔ giá trị ↔ dùng ở đâu) · **Token MỚI** 9 dòng có lý do · 5 dòng "Vì sao khung này giúp làm nhanh hơn" · 12 ghi chú chỗ bản vẽ tự quyết · 13 ảnh hiện trạng có chú thích.

Vỏ chung `KhungApp` nhận tham số khổ (390 / 768a / 768b / 1040 / 1440), bộ quyền (10), trang (14 loại, kể cả 403, 404, thiếu mã, mất mạng chưa nạp, Đăng nhập), trạng thái dữ liệu (5), dải (4), lớp phủ (lọc / xác nhận / báo xong / bảo trì), tiêu đề tách, chọn dòng, bỏ qua. Năm thân trang là năm tệp riêng.

## 3. Đối chiếu mục 5, 6, 9 (ĐẠT 25 · LỆCH 3 · THIẾU 0)

| Điều | Kết quả | Bằng chứng / lệch gì |
|---|---|---|
| 5.1 thanh tab 4–5 mục theo bộ | ĐẠT | `KhungApp` bảng `BO`: 10 bộ đúng bảng mục 6 (Toàn quyền, Quản trị, Bán hàng, Tài xế đối tác 5 mục; còn lại 4) |
| 5.1 khổ 768 vẽ cả A và B | ĐẠT | K2·A `kho=768a` thanh bên 56 + xổ nhãn khi rê; K2·B `kho=768b` thanh tab; cùng Toàn quyền, Đơn hàng nhiều, thân thẻ hai cột |
| 5.1 chân dính thay thanh tab ở trang con | ĐẠT | `coTab = hẹp && !chanDinh`; chi tiết, biểu mẫu, bước có chân dính → không thanh tab |
| 5.1 sáng mục, trang con sáng cha, 403/404 không sáng | ĐẠT | `PAGE['chi-tiet'].tab = 'don-hang'`, `aria-current="page"`; 403/404 không có tab/thanh bên sáng |
| 5.2 thanh trên một kiểu: logo cấp một / quay lại / đường dẫn một cấp | ĐẠT | `coLogo = hẹp && cấp một`, `coLui = hẹp && trang con`, `coDuong = máy tính && trang con` |
| 5.2 tiêu đề 18/600 cắt "…" | ĐẠT | `--co-7` (= 18) `--fw-tieu-de` (= 600) `text-overflow: ellipsis` |
| 5.2 tối đa một hành động + chuông + Trợ lý, không nút nổi | ĐẠT | Một nút ở góc phải + chuông + Trợ lý; không nút nổi. Biểu mẫu máy tính thêm nút phụ "Huỷ bỏ" cạnh "Lưu chuyến" (ghi chú 3 của bản vẽ, chấp nhận) |
| 5.2 ô Tìm đơn chỉ 4 bộ, phím `/` | ĐẠT | `BO.tim` đúng cho Toàn quyền, Quản trị, Kế toán, Bán hàng; gợi ý "Tìm mã đơn, tên khách, SĐT…", phím tắt `/` |
| 5.2 tiêu đề B một artboard 1040 | ĐẠT | K3·11 `tach: true` → tiêu đề 24 thành dòng riêng dưới thanh |
| 5.3 một dải 44, thứ tự ưu tiên, nút Xem, ẩn bảo mật ở biểu mẫu, ô tìm không đè | ĐẠT | `--dai-tren-h` = 44; chỉ một `dai`; dải bảo mật tắt ở `bieu-mau`; K1 Bán hàng dải và ô tìm xếp theo luồng; dải quan trọng không có nút đóng (bắt bấm Đã hiểu) |
| 5.3 bảo trì = dải Toàn quyền + lớp phủ + Đăng nhập | ĐẠT | K5·05 Toàn quyền dải Biển; K5·03 lớp phủ đếm ngược 42:15 + Đăng xuất (thêm "Thử lại", ngoài đề bài, chấp nhận); K5·04 Đăng nhập dải đếm ngược cùng câu của máy |
| 5.4 nút tròn san hô, nhãn 12, vùng an toàn đáy | ĐẠT | nút tròn `--c-nhan` (= #c0392b) giữa thanh tab; nhãn `--fs-huy-hieu` 12; `padding-bottom: var(--safe-bottom)` |
| 5.5 thanh bên cuộn giữa, chân dính riêng, Bỏ qua, không lặp Tạo đơn, Toàn quyền 10 mục | ĐẠT | `.ib-thanh-ben__cuon` cuộn + `__chan` dính; K3·12; `BEN` không có Tạo đơn; Điều phối gập = Điều phối xe + Đề nghị chuyển khách; Toàn quyền 3 + 4 + 2 + 1 = 10. **Điểm nhìn thấy:** ở khổ 1040 × 800 mục "THIẾT LẬP" của Toàn quyền nằm đúng mép vùng cuộn nên hiện nửa chữ ở vị trí cuộn đầu — không phải bị chân menu đè như hiện trạng ảnh 11, nhưng trông giống; đặc tả đợt 0 thêm mờ mép hoặc nhịp dòng thanh bên gọn hơn |
| 5.6 hành động chính một chỗ; dải 1 chính + 2 phụ + "⋯" | ĐẠT | Chi tiết: san hô "Xác nhận đơn để gửi khách" + 2 phụ + "…" (Xem biên nhận, Huỷ đơn); điện thoại nút chính chỉ ở chân dính |
| 5.6 chân dính 52 một kiểu | ĐẠT | `ib-chan-dinh` của bộ; nút `--h-dieu-khien-lon` = 52 |
| 5.6 Tab hai biến thể | ĐẠT | K6·Tab: gạch chân (`--tab-gach`) và viên thuốc cuộn ngang có mờ mép (`--tab-mo-mep`) |
| 5.7 một khuôn bảng trượt / hộp thoại, `Esc` | **LỆCH** | Khuôn đúng (`ib-bang-truot`, `aria-keyshortcuts="Escape"`, hộp 520) nhưng đổi sang hộp thoại giữa màn **từ 768** (bộ `_ds` của Claude Design dùng `@container (min-width: 768px)`, chú thích K6 và K2·B ghi "từ 768"); đề bài 5.9 và mục 8 chốt mốc điện thoại **640** |
| 5.7 hộp xác nhận nói hậu quả, vòng Đỏ, nút nguy hiểm tách | ĐẠT | `role="alertdialog"`, "Không hoàn tác được…", vòng `--tt-do-bg`; điện thoại xếp dọc cách nhau, máy tính hai đầu |
| 5.7 thông báo ngắn nền tối, Hoàn tác cát, 3 s, không đè chân dính | ĐẠT | `.ib-bao-xong` nền `--c-nen-toi` (#082f49), "Hoàn tác" `--c-hoan-tac` = cát; nằm trên chân dính; 3 s ghi ở chú thích (bản vẽ tĩnh) |
| 5.7 năm tông kèm hình | ĐẠT | Biển `history` · Xanh lá `check` · Cát `clock` · Đỏ `alertCircle` (MỚI, vẽ trong `ib-icon.js`) · Xám `minus`; áp đúng trên huy hiệu đơn |
| 5.8 mất mạng hai trường hợp | ĐẠT | K5·01 trang đã nạp: giữ vỏ + dữ liệu cũ + dải Cát "Đang ngoài mạng — dữ liệu lần xem gần nhất" + Thử lại, thanh tab dùng được, không khung xương; K5·02 trang chưa nạp: vỏ + hình + câu + Thử lại + "tự thử lại khi có mạng" |
| 5.8 403 / 404 / thiếu mã | ĐẠT | "Bạn không có quyền xem trang này" + "Về trang đầu của bạn", không ô tìm/bộ lọc, không sáng mục; 404 và thiếu mã câu Việt + nút về; không JSON |
| 5.8 khung xương, rỗng vòng 56, lỗi máy chủ | ĐẠT | mỗi thân có `aria-busy` + khối xương đúng hình; `.ib-rong__bt` 56; lỗi "Máy chủ không trả lời trong 15 giây…" + Thử lại; không chữ "Đang tải…" trần |
| 5.9 ba mốc 640 / 900 / 1200 | **LỆCH** | Artboard cố định nên không đo được mốc; bộ `_ds` kèm bản vẽ chỉ có mốc 768 và 900; hai cột ≥ 1200 dựng bằng tham số, không bằng mốc. Cùng gốc với dòng 5.7 — bản vẽ dùng bộ Claude Design tự xuất, không phải bộ v2 bản 8 |
| 5.9 nội dung 1280 căn giữa, không giãn bảng | ĐẠT | `max-width: var(--w-noi-dung)` = 1280; ghi chú 7: ở 1440 vùng nội dung 1192 nên căn giữa chỉ thấy từ 1528 |
| 5.9 vùng chạm 44, ô gõ 16, vành 3, tiền "1.080.000 ₫", ngày, in hoa chỉ tên nhóm, 400/500/600, một mật độ | ĐẠT | `--h-cham` 44, `--co-5` 16, `--vanh-tieu-diem` 3; tiền đúng mọi chỗ; in hoa chỉ VẬN CHUYỂN / TIỀN / THIẾT LẬP / LỐI TẮT; không núm gọn/thoáng |
| 5.10 Danh sách / Biểu mẫu (+ thanh bước) / Bảng điều khiển / Thiết lập | ĐẠT | Đủ vùng cố định và 5 trạng thái; Trang chủ Bán hàng đúng mục 7 (2 · 18.450.000 ₫ · 1 · 1; Việc của bạn 3 / 1 / 2 / 1 / 4; không "Cần xem lại"); Thiết lập rộng tối đa 900, thanh tìm chỉ khi Nhiều |
| 5.10 Chi tiết | **LỆCH (nhỏ)** | Cột phải ở máy tính **không `position: sticky`** dù chú thích K4·03 nói "dính" (Danh sách và Biểu mẫu có dính); ở điện thoại huy hiệu trạng thái nằm trong thẻ tóm tắt đầu thân, không ở thanh trên như 5.10 |
| Mục 6 thanh tab và thanh bên từng bộ | ĐẠT | `BEN`: Quản trị bỏ Sổ công nợ, Thiết lập 10; Kế toán Điều phối xe (không gập) + Thiết lập 3; Bán hàng Thiết lập 1; Thực tập / Hướng dẫn viên / Đối tác chỉ Đơn hàng; Nhân sự Quản lý tài khoản trong nhóm Thiết lập mở sẵn; hai bộ tài xế đúng; thân ba bộ này là khung xương (đúng mục 10: không vẽ màn nghiệp vụ) |
| Mục 9 K1–K6, T1–T5, hai bảng token, giải thích | ĐẠT | K1 10 · K2 2 · K3 12 · K4 3 · K5 10 + 10 + 1 · K6 7 + dải/tông/tab · T 5 × 2 + T3·Bước · 2 bảng token · 5 dòng Vì sao. Chưa kiểm được: giá trị 4 bóng và vành mờ "(bộ đã bỏ, giữ theo mục 8)" bản vẽ tự đặt inline — đặc tả đợt 0 lấy thẳng từ `public/app.css` |

## 4. Token, chữ Anh, dữ liệu

- **Viết cứng:** 22 mã màu ngoài `var()` đều ở `Khung chung.dc.html` và **ngoài khung vẽ** (17 là cột "Giá trị" của bảng token, 3 nền trang canvas, 2 `#000` trong mask); 6 tệp còn lại 0 mã màu. Số px viết cứng trong khung: gần hết là kẻ 1 px, cách 2 px, bề rộng khối khung xương, ô biểu tượng 32/36/48, `--safe-bottom: 34px` mô phỏng iPhone. Không có màu, cỡ chữ, chiều cao điều khiển, bo góc nào viết cứng.
- **Tên token:** trong markup là tên tiếng Việt của bộ Claude Design (`--c-chinh`, `--kc-3`, `--co-7`); bảng "Token đã dùng" ánh xạ đúng sang tên theo mã (`--c-primary`, `--s1…s7`, `--fs-step-*`) như mục 8 yêu cầu. 9 token MỚI (`--w-thanh-ben-gon` 56, `--c-hoan-tac`, `--tab-gach` 3, `--tab-mo-mep` 32, `--w-ngan-chi-tiet` 360, `--w-cot-phai` 340, `--w-thiet-lap` 900, `--w-tim-thanh-tren` 280 co tới 160, hình `alertCircle`) đều có lý do nhưng **đặt tên Việt** → đổi tên theo quy ước mã khi viết đặc tả (`--w-sidebar-gon` đã có trong bộ bản 8 cùng nghĩa với `--w-thanh-ben-gon`: dùng tên đã có).
- **Chữ Anh trên màn:** không có "Loading", "dd/mm/yyyy", JSON; "Esc", "Tab" chỉ ở chú thích. Còn "Email" (nhãn khối Khách hàng, giữ vì là từ thông dụng và là nhãn đang chạy), "Wi-Fi", "4G", "PIN", "Google Sheet", tên riêng Cano / Vinpearl — chấp nhận.
- **Dữ liệu:** khách, đơn, tiền, điểm đón đều giả (mục 7). Màn Đăng nhập có mã số thuế, địa chỉ, số điện thoại hỗ trợ của công ty — chép từ trang đăng nhập đang chạy, là thông tin công khai của công ty, không phải dữ liệu khách; giữ.
- **Tên sản phẩm:** thanh bên "Island Booking System" (đúng `APP_NAME`); màn Đăng nhập "Tour Đảo Booking" (tên cũ) → đặc tả theo mã.
- **Mục 10:** không đổi mô hình điều hướng; không màn nghiệp vụ ngoài năm trang đại diện; không thêm trường (chỉ thêm hai tiêu đề nhóm "Xe và tài xế", "Giờ chạy"); không màu, phông mới; không chế độ tối; không nút nổi. Định dạng `.dc.html` là cách Claude Design dựng bản vẽ tương tác, không phải mã sản phẩm, không mang vào Nền tảng.

## 5. Kết luận và cách xử lý ba điểm lệch

Bản vẽ **đủ để đưa chủ duyệt cổng 2b**, không cần trả Claude Design vẽ lại. Ba điểm lệch xử lý ở đặc tả đợt 0, theo thứ tự ưu tiên đã ghi ở Bàn giao của đề bài (quyết định mục 5 thắng bản vẽ):

1. **Mốc 640, không phải 768:** bảng trượt từ đáy ở ≤ 640; hộp thoại giữa màn từ 641. Chỉ khác nhau ở khoảng 641–767. Gốc là bộ `_ds` Claude Design tự xuất kèm bản vẽ (mốc 768), còn bộ v2 bản 8 đã có ba mốc 640 / 900 / 1200.
2. **Cột phải khuôn Chi tiết dính khi cuộn** (như Danh sách và Biểu mẫu đã làm).
3. **Huy hiệu trạng thái ở điện thoại:** Main session chọn **theo bản vẽ** (huy hiệu trong thẻ tóm tắt ngay đầu thân, thấy không cần cuộn) vì thanh trên 390 không đủ chỗ cho nút quay lại + mã đơn + huy hiệu + chuông + Trợ lý; máy tính giữ huy hiệu cạnh mã đơn trên thanh. Đảo được bằng cách sửa đặc tả.

Các điểm Main session tự quyết khác (đảo được, chủ chỉ cần biết): lớp phủ bảo trì có thêm "Thử lại"; biểu mẫu máy tính có "Huỷ bỏ" + "Lưu chuyến" ở góc phải thanh trên; mờ mép hoặc nhịp gọn cho thanh bên ở khổ cao 800; tên sản phẩm trên Đăng nhập theo mã; tên token MỚI đổi theo quy ước mã; "Email" giữ.

## 6. Hai câu chủ chọn tại cổng 2b (bản vẽ đã có cả hai phương án)

- **Khổ 641–899 (iPad dọc):** A thanh bên gọn 56 (K2·A) hay B thanh tab dưới như điện thoại (K2·B). Main session **khuyến nghị B**: không phải xây và kiểm thêm một trạng thái bố cục (đúng điều E3 cổng 2a đã cảnh báo), người dùng chuyển điện thoại ↔ iPad thấy y hệt, "+ Tạo đơn" vẫn ở giữa thanh dưới trong tầm ngón cái; hộp thoại giữa màn vẫn dùng từ 641 vì nội dung đủ rộng. Mất: iPad dọc không có thanh bên, tới trang khác phải qua "Thiết lập" / "Tôi" như điện thoại. Chọn A thì bộ bản 8 đã có `--w-sidebar-gon` 56 và bản vẽ đã có cách xổ nhãn.
- **Tiêu đề trang ở máy tính:** A trên thanh trên (18, mọi artboard khác) hay B tách dòng riêng 24 dưới thanh (K3·11). Khuyến nghị **A**: mỗi trang được thêm một dòng cho nội dung, ít thứ phải dựng; B thoáng hơn nhưng mỗi trang mất khoảng một dòng 44.
