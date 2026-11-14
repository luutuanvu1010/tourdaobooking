# Bước 1 — sửa khung chung giao diện (13/11/2026)

> Kế hoạch gốc: `docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md` mục 5 bước 1 (nhánh `claude/blissful-villani-4d7668`).
> Phát hiện gốc: `docs/superpowers/specs/2026-11-13-kiem-giao-dien/PHAT-HIEN.md`. Lời chủ (qua phiên điều phối, 13/11): «Làm cả hai» — bước 1 và soạn ADR
> lên kho song song; ADR do phiên Kế hoạch làm. **Không** đụng K1–K5. Nhánh `claude/buoc-1-khung-chung`; không nhập bản chính, không triển khai.
> Ghi chú vai (P15): phiên này làm bước 0 (kiểm, đã xong và đã có người kiểm lại). Bước 1 là việc mới (thi công); nghiệm thu do một trợ lý kiểm độc lập khác.

## Tiêu chí nghiệm thu (viết trước khi sửa; đo bằng kịch bản bước 0)

| Mã | Việc | Đạt khi | Đo |
|---|---|---|---|
| N3 | Thanh nút dưới khi màn thấp (xoay ngang, phóng 200 %) | Ở 844×390 và 640×400 (tỉ lệ 2): 0 nút / ô nhập của Tạo đơn bị thanh nút đè sau khi cuộn vào giữa (T3); ở 390×844 và 1280×800 thanh nút giữ nguyên như cũ | `do-quet.mjs --trang /order-form` (khổ t16-zoom200) + `soi-mot-o.mjs … 844 390` |
| N5 | Vùng chạm nút ảnh đại diện | `button.bar-avatar` có vùng chạm ≥ 44 × 44 ở 360/390/430; hình tròn nhìn thấy giữ 30 px | `do-quet.mjs` → `T4.theoLop` không còn `bar-avatar 30×30` |
| N9 | Dải thông báo ở điện thoại | ≤ 64 px ở 390 (nay 89–113); chữ không tràn, nút «Xem» / «Bật ngay» / nút đóng vẫn ≥ 44 px; máy tính không đổi | đo `#strips .dai` |
| N10 | Nhảy bố cục khi dữ liệu về | Mở lại (4G chậm, CPU 4×) Dịch vụ, Vé điện tử, Quản lý tài khoản: CLS < 0,1 (nay 0,49 / 0,45 / 0,30) | kịch bản đo nguồn nhảy bố cục (layout-shift) |
| N11 | Hộp hỏi kiểu trình duyệt | 0 chỗ gọi `confirm(`/`alert(` trong `web/`; bài khoá trần hạ về 0; nút đỏ dùng đúng tên nút đã có trong bảng tham chiếu, nút giữ «Giữ nguyên» | `node --test src/ratchet-confirm-alert.test.ts src/bang-tham-chieu.test.ts` |
| chung | Không làm hỏng chỗ khác | `npm test`, `npm run typecheck` xanh; quét lại toàn bộ 2.709 ô không tăng lỗi T1 / T3 / T4; kịch bản Chrome khung chung `dot-0-smoke.mjs` đạt | chạy một lần ở cuối |

## Đổi điều người dùng thấy — chủ ĐÃ DUYỆT 13/11 («Theo khuyến nghị», qua phiên điều phối): câu 1 và câu 2 theo phương án khuyến nghị (ảnh ở `docs/evidence/2026-11-13-buoc-1-khung-chung/xem-truoc/`)

1. **Dải thông báo trên điện thoại gọn lại tối đa hai dòng** (113 → 53 px). Câu dài bị cắt bằng «…»; bấm «Xem» vẫn đọc đủ. Máy tính không đổi. Ảnh `dai.jpg`.
2. **Màn thấp (điện thoại xoay ngang, phóng to 200 %): thanh nút Lưu thôi dính đáy**, nằm ở cuối biểu mẫu như một khối thường — phải cuộn xuống mới bấm Lưu,
   nhưng không còn che nội dung. Điện thoại cầm dọc và máy tính giữ nguyên. Ảnh `ngang.jpg`. Phương án khác: giữ dính đáy nhưng thu còn một dòng (tổng tiền + nút Lưu).

## Tự quyết, ghi lại (không đổi nghĩa, theo kế hoạch đã chốt)

- N5: chỉ nới vùng bấm vô hình quanh ảnh đại diện; hình không đổi.
- N10: thay dòng chữ «Đang tải…» ở ba trang bằng khung chờ chung của đợt 0 (dải xám) có chiều cao giữ chỗ — cùng thành phần các trang khác đã dùng.
- N11: thay 16 hộp hỏi của trình duyệt bằng hộp hỏi chung trong Nền tảng (`hoiXacNhan`, đã dùng ở nhiều trang); câu hỏi giữ nguyên chữ; nút đỏ mang đúng tên nút
  đã bấm (ví dụ «Đặt lại PIN»), nút còn lại «Giữ nguyên». Kế hoạch đã chốt ngưỡng T12 = 0.

## Nhật ký

- 13/11: lập nhánh, nhập bản chính 2.97; đo nguồn nhảy bố cục (Dịch vụ: khối chèn phía trên và nhóm dịch vụ nở ra; Vé điện tử: danh mục trong khối «Tạo vé» nở ra đẩy
  các khối dưới; Quản lý tài khoản: danh sách tài khoản nở ra đẩy khối «Hàng chờ xác minh»); Tạo đơn và Chính sách điều phối không tái hiện CLS cao của lượt đo bước 0.
  Sửa lại chẩn đoán Quản lý tài khoản: khối vai trong «Thêm tài khoản» (cao 300–700 px) dựng sau lần nạp đầu — đó mới là thứ đẩy «Hàng chờ xác minh».
- 13/11: N5, N10 (390), N11 xong, lần lưu 63a05ad26. Đo lại ở 390: Dịch vụ 0,09, Vé điện tử 0,05, Quản lý tài khoản 0. Bài bảng tham chiếu, bài khoá hộp hỏi
  (trần 0), bài cỡ gói trang xanh.
- **Phát hiện mới khi đo ở 1280 (bước 0 chỉ đo tốc độ ở 390):** (a) thanh trên máy tính lúc chưa dựng khung chỉ cao 24 px rồi nở lên 60 px — đã sửa (thanh cao sẵn);
  (b) **dải thông báo chèn muộn đẩy cả trang xuống 61 px** ở mọi trang máy tính khi có tin / nhắc hai lớp: Quản lý tài khoản 0,66, Dịch vụ 0,41, Đơn hàng ~0,1.
  Chưa sửa vì chưa biết trước có dải hay không lúc vẽ khung; cách sửa (nhớ dải lần trước để vẽ sẵn, hoặc giữ chỗ) là việc khung chung riêng — ghi để hỏi.
- 13/11: chủ duyệt «Theo khuyến nghị» (qua phiên điều phối «Audit giao diện»): dải điện thoại tối đa hai dòng cắt «…»; màn thấp thanh nút Lưu nằm cuối biểu mẫu.
  Đã làm: N9 dải 113/89 → 53 px ở 390 (nút 44 px, không tràn), máy tính 61 px không đổi; N3 ở 844×390 thanh nút `position: static`, ở 390×844 vẫn dính; T3 Tạo đơn khi
  phóng 200 %: 251 chỗ bị che → 0. Cắt chữ ở điện thoại +1 chỗ = chính câu dải bị cắt «…» theo duyệt.
- 13/11: bộ kiểm đủ (`npm test`) lần 1 đỏ 5 chỗ do đổi mã (bộ v2 lệch, hai bài Hướng dẫn đổi tệp neo, điều kiện @media hai vế, bài đếm đúng 2 confirm) — sửa ở 24392ff5f,
  lần 2 xanh (cả hai bước thoát 0). Quét lại 2.219 ô (kho NHIỀU) trước / sau: T1 tràn 0 → 0; ô điện thoại có nút < 44: 210 → 108, ảnh đại diện 138 → 0; chỗ bị che ở
  khổ T16: 1.597 → 88; T15 0 → 0; axe nặng 16 → 16. Kịch bản Chrome khung chung `dot-0-smoke.mjs`: 19 đạt, 1 đỏ (bước 20 đòi nút «Đăng xuất» ở chân thanh bên —
  kịch bản lỗi thời từ 5ce36e3eb ngày 8/11 đưa Đăng xuất vào menu tên tài khoản; bước 1 không đụng `web/shell.ts`; cập nhật kịch bản là việc riêng).
- 13/11 kiểm độc lập (trợ lý vai người kiểm, chỉ đọc): **ĐẠT CÓ ĐIỀU KIỆN** — nghiệp vụ, quyền, tiền, đường gọi máy chủ không đổi; 16 hộp hỏi giữ đúng câu và
  đúng nghĩa (đồng ý → làm, đóng → không làm), không chỗ nào gọi từ trong bảng trượt đang mở; các sửa sau lần đỏ chỉ siết hàng rào. Hai việc phải xử lý: (1) N10
  Dịch vụ chưa ổn định (ấm 0,10, lạnh tới 0,87); (2) ba chỗ cột «Màn hình» của bảng tham chiếu còn chữ «hộp hỏi của trình duyệt».
- 13/11 sau kiểm độc lập: (2) đã sửa, sinh lại bảng. (1) Khung chờ nhóm dịch vụ viết sẵn trong `public/catalog.html` (có ngay ở lần vẽ đầu); khung chờ khối «tự kiểm
  vé» cao gần bằng khối thật (token `--giu-cho-tu-kiem` 200 / 128 / 104 px theo khổ). Đo lại Dịch vụ ở 390: mở lại 0,05 ổn định (hai lượt), 360: 0,048.
  **Còn lại, ghi để hỏi (không tự nở phạm vi):** mở lần đầu (bộ nhớ trống) vẫn 0,11–0,54 do hai gốc chung của khung trang: (a) khối theo quyền chỉ vẽ khi mã trang
  chạy xong, lần vẽ đầu chưa có; (b) dải thông báo chèn muộn (53 px điện thoại, 61 px máy tính) đẩy cả trang — ở máy tính mở lại Dịch vụ vẫn 0,34 vì (b).
  Ghi chú phạm vi N3 (người kiểm nêu): luật `@media (max-height: 500px)` áp cho MỌI màn thấp hơn 500 px — điện thoại xoay ngang, phóng to 200 %, và cả cửa sổ máy
  tính rất thấp; áp cho mọi thanh nút cuối biểu mẫu dùng khuôn chung (`.form-actions`, `.vc-bottom-bar`, `.vc-form-actions`, `.chan-dinh`), không chỉ Tạo đơn.
  Bộ kiểm đủ lần 3 (sau các sửa này): xanh, cả hai bước thoát 0.
  Chưa kiểm: iPhone thật; số ô < 44 ở Điều phối máy tính tăng 11–15 → 15–20 giữa hai lượt quét (trang không đổi mã — nghi do dữ liệu hành trình thêm chuyến).
- 13/11 (lượt 3, chủ «Làm tiếp cả hai» qua phiên điều phối): **(1) hai gốc nhảy bố cục khi mở trang của khung trang.**
  (a) Dải chèn muộn: web/dai.ts nhớ chiều cao + TÊN LOẠI dải lần trước trong thẻ (sessionStorage `td_dai_cao`, không nội dung); tệp đầu trang mới `web/giu-cho-dai.ts`
  (→ `/js/giu-cho-dai.js`, chạy đồng bộ trong `<head>` của 58 trang có khung, ~300 byte, nạp sẵn ở service worker) đặt `--dai-giu` + `data-giu-dai`; `#strips` viết
  sẵn trong HTML ngay sau thanh trên; CSS `html[data-giu-dai] #strips:empty` giữ chỗ từ LẦN VẼ ĐẦU; shell thả khi tin + bảo mật đã trả lời; trang biểu mẫu không giữ
  chỗ cho dải bảo mật; lưới an toàn 8 giây; trang đăng nhập xoá khoá. (b) Khối theo quyền vẽ sau mã: `web/giu-khoi.ts` (`nhoKhoi`) ghi tên khối đã hiện ở trang
  (`td_khoi:<đường>`), tệp đầu trang đặt `data-giu-khoi`; áp cho «tự kiểm vé» (Dịch vụ & giá), «Thêm tài khoản», «Hàng chờ xác minh» (Quản lý tài khoản) — khung biểu
  mẫu giữ chỗ VÔ HÌNH (không bấm được trước khi mã gắn xử lý). Danh bạ: khối «Xoá dữ liệu cá nhân» dựng sau lần tìm đầu.
  Đo (4G chậm, CPU 4×, trang thứ hai trở đi trong thẻ): **điện thoại** — mọi trang của Toàn quyền < 0,1 (Quản lý tài khoản 0,001, Danh bạ 0,001, Dịch vụ 0,05).
  **Máy tính** — dải đã hết đẩy nội dung (vị trí `<main>` giữ nguyên); nhưng số đo dao động mạnh giữa các lần và nhiều lần vẫn trên 0,1 (người kiểm độc lập: Quản lý
  tài khoản 0,002–0,18, Danh bạ 0,13, Dịch vụ 0,22–0,29), phần lớn do **thanh bên máy tính dựng muộn** (nội dung bị đẩy ngang 0 → 248 px, thanh trên đổi cao) — gốc
  khác, chưa sửa, ghi là nợ riêng của khung trang (đã ghi lại lời khai ban đầu «dưới 0,1 khi ghé lần hai» là nói quá ở máy tính). **Còn lại:** trang ĐẦU TIÊN mở trong thẻ vẫn nhảy một lần (chưa có gì
  để nhớ); Tạo đơn (~0,12) và Trang chủ (~0,12) ở máy tính có cách dựng riêng — để bước 3 (họ màn). Người dùng thấy gì khác: không, ngoài khoảng trống giữ chỗ thoáng
  qua trước khi dải / khối hiện (thay cho cú nhảy).
  **Trần dung lượng gói Đơn hàng — KHÔNG phải nâng:** bản đầu đặt mã nhớ / thả chỗ dải trong web/dai.ts + web/shell.ts làm gói vượt trần 340 byte (đã hỏi chủ qua phiên
  điều phối); sau đó chuyển TOÀN BỘ phần nhớ / thả vào tệp đầu trang (theo dõi `#strips` bằng MutationObserver; dải về thì thôi giữ; chờ quá 8 giây không có dải
  thì quên và thả) ⇒ web/dai.ts, web/shell.ts, web/thong-bao-ui.ts trở về như bản chính, gói Đơn hàng nằm trong trần cũ (bài goi-trang-nhe xanh). Câu hỏi nâng trần:
  chủ đồng ý 13/11 nhưng không dùng, trần giữ nguyên (111.589); lời đồng ý không dùng cho lần sau. Đổi lại: khi lần trước có dải mà lần này không (vừa «Đã hiểu» tin / vừa bật bảo mật), chỗ trống giữ tối đa 8 giây rồi mới thu.
  **(2) Kịch bản Chrome:** `dot-0-smoke.mjs` bước 20 đo «Đăng xuất» trong menu tên tài khoản (chạy lại: đạt). 33 kịch bản cũ cài `window.confirm` giả: tiêm thêm
  `HOP_HOI_TU_DONG` (`docs/evidence/2026-11-13-buoc-1-khung-chung/kich-ban/hop-hoi-tu-dong.mjs`) — khi hộp hỏi trong trang hiện, hỏi lại đúng hàm trả lời của kịch bản
  rồi bấm nút đỏ / nút giữ (giữ nguyên cách ghi câu và đáp án); hai kịch bản đếm «0 hộp trình duyệt» (`phien.mjs`, `chinh-sach.mjs`) trả lời qua `__traLoiHopHoi`
  để số đếm giữ nghĩa. `lb-chung.mjs` (cấm confirm) giữ nguyên.
- 13/11 kiểm độc lập lượt 3: **ĐẠT CÓ ĐIỀU KIỆN** — mã, an ninh (chỉ lưu con số + tên, không nội dung; khung giữ chỗ vô hình; đăng nhập xoá sạch), hàng rào (không
  nới, trần gói giữ nguyên, ba tệp khung không đổi), 58 trang chèn đúng, 34 kịch bản có hàm giả nên không treo Chrome. Điều kiện: sửa lời khai máy tính (đã sửa ở trên).
  Nhỏ đã sửa: Quản lý tài khoản ghi trí nhớ khối cả khi không vào được trang; tệp đầu trang khai `nho` trước khi dùng. Nhỏ để lại: bài giu-cho-dai.test.ts chỉ khớp
  mã nguồn — việc thu chỗ sau 8 giây và chặn bấm khung vô hình dựa vào đo Chrome, không có máy canh (dựa vào kỷ luật).
  **Nợ mới (khung trang):** thanh bên máy tính dựng muộn đẩy nội dung ngang — cần chủ quyết có làm trong bước 1 hay để bước 2 (lưới bố cục).
- 13/11: chủ quyết (nguyên văn «Làm ở bước 2»): nợ «thanh bên máy tính dựng muộn đẩy nội dung ngang» KHÔNG làm ở bước 1; chuyển sang bước 2 (lưới bố cục chung).
  Bước 1 đóng ở đây.
