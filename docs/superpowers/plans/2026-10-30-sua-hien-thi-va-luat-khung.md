# Kế hoạch thi công — Sửa hiển thị và luật khung (30/10/2026)

> Nguồn: `docs/superpowers/specs/2026-10-30-danh-gia-khung-giao-dien/BAO-CAO.md`. Chủ dự án 30/10 (nguyên văn): «ok làm theo khuyến nghị của bạn, trước khi đưa lên
> Production thì tôi muốn nhìn thấy nó trước» ⇒ ba câu mục 7 của báo cáo chọn phương án khuyến nghị: (1) làm ngay đợt sửa lỗi hiển thị; (2) danh sách thành bảng
> trên máy tính; (3) duyệt gói tinh chỉnh token. **Không phát hành**: thi công trên nhánh `claude/danh-gia-khung-giao-dien`, chủ xem ảnh trước / sau rồi mới quyết.
> Không đụng `BACKLOG §55` (đợt 0b, Chặng 3 vẫn gác).

## Bối cảnh đo lại

- Production đang có tệp giao diện công ty (GET công khai `https://booking.tourdao.vn/giao-dien.css`, 30/10):
  `--c-text:#000000; --fs-h1:20px; --fs-label:16px; --fs-step-5:17px`. Máy thử áp đúng bốn giá trị này (PUT `/api/giao-dien` trên kho tạm) trước khi chụp ảnh
  «trước» và «sau» — ảnh khớp bản thật. Các núm của màn Giao diện công ty (ADR-0087) không đổi tên, không đổi mặc định.

## Phạm vi

### Đợt 1 — sửa lỗi hiển thị (mục 3 báo cáo; 13 mục — hai mục rút khỏi danh sách sau khi đọc mã, xem cuối)
1. Chi tiết đơn: dải tóm tắt 4 cột đều, mã đơn + trạng thái thành hàng trên.
2. Đơn hàng điện thoại: không cắt tên khách, số khách, «Còn thu»; thẻ ba hàng (ngày + trạng thái / tên / điện thoại · số khách · còn thu).
   **Thay quyết định «đúng 2 dòng» của Đợt E** — theo luật 6 chủ vừa duyệt; nêu lại trong báo cáo xem trước.
3. Chân thanh bên: tên, vai không bị cắt; «Đăng xuất» hàng riêng.
4. Thanh bên tự cuộn tới mục đang mở.
5. Chi tiết đơn: một thanh công cụ (việc sửa trái, «Huỷ đơn» phải); điện thoại: các nút cao bằng nhau.
6. Mã đơn trên thanh trên không bị cắt (điện thoại, 1040).
7. Một tiêu đề mỗi trang (cổng 2b): ẩn tiêu đề lớn trong thân (giữ cho trình đọc màn hình), trừ biển số ở Chi tiết xe.
8. Sổ công nợ (máy tính): tự chọn bên đầu danh sách.
9. Chờ xác nhận (máy tính): nút cỡ vừa đứng cạnh thông tin.
10. Trang Tôi (máy tính): thẻ xếp kín hai cột; ẩn dòng «Đăng xuất» trùng ở danh sách khi đã có ở thanh bên.
11. Trang chủ (máy tính): biểu đồ doanh thu giãn theo thẻ.
12. Hoa hồng: khoảng cách quanh dải cảnh báo.
13. Nhật ký 390: ô chọn không tràn.

### Đợt 2 — luật khung
14. Đơn hàng ≥ 1100 px: bảng thẳng cột + hàng tiêu đề cột.
15. Đơn hàng máy tính: bỏ ô tìm và nút «+ Tạo đơn» trùng với thanh trên; Tạo đơn: bỏ nút «Tạo đơn» của thanh trên khi đang ở chính trang đó.
16. Danh bạ: bộ lọc một hàng, «+ Hồ sơ mới» lên đầu trang.
17. Quản lý tài khoản: thao tác hàng một dòng, chữ không gạch chân, việc nguy hiểm tách sang phải.
18. Nhãn – giá trị sát nhau trong khối rộng (Chi tiết đơn); cột Thanh toán dính khi cuộn.
19. Danh mục dịch vụ: điều khiển của hàng nhóm đứng cạnh tên nhóm.
20. Liên kết trong bảng không gạch chân (gạch khi rê chuột).

### Đợt 3 — token (chủ duyệt gói)
21. Tiêu đề h1/h2 dùng màu chữ chính (token mới `--c-heading` = `var(--c-text)`); xanh navy dành cho thứ bấm được.
22. Bỏ cỡ chữ lẻ: `--fs-old-*` (12,8 / 13,6 / 14,4 px) → bậc 12 / 14 / 14; `--fs-step-4` 15 → 14; `--fs-step-8` 19 → 18.
23. Dải nhắc bảo mật hai lớp: tông cát khi còn > 3 ngày, đỏ khi ≤ 3 ngày hoặc quá hạn; bỏ chữ «— Bật ngay» lặp với nút.

## Tiêu chí nghiệm thu (đo bằng kịch bản ở `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/`, máy thử có tệp giao diện giống production)
- A1. Chữ định danh bị cắt (tên người, mã đơn, số khách, số tiền) = 0 ở 390 / 1040 / 1440 (`do-loi.py`, loại `order-row-place` là địa chỉ).
- A2. Tiêu đề lớn trùng thanh trên = 0 trang ở 1040 (trừ biển số Chi tiết xe).
- A3. Mục đang mở ở thanh bên thấy được: 32/32 trang Toàn quyền, 14/14 Kế toán ở 1366×650 (`soi-thanh-ben.py`).
- A4. Tràn ngang ở 390 = 0.
- A5. Dải tóm tắt Chi tiết đơn: không cột nào hẹp hơn 140 px ở 1040 và 1440.
- A6. `npm test` xanh, `npm run typecheck` 0 lỗi, `npm run build:web` được.
- A7. Ảnh trước / sau cho chủ xem (điện thoại 390, laptop 1040, màn 1440).
- Không đạt được thì ghi rõ trong báo cáo xem trước, không nói «xong».

## Rút khỏi danh sách sau khi đọc mã (không phải lỗi)
- Thanh tab sáng «Tôi» ở các trang mở từ trang Tôi: **có chủ đích** (`sangTabToi`, `web/shell.ts` — «Tôi» là trang mục lục trên điện thoại, giống tab «Thêm»).
- Điều phối xe, khối chuyến cuối ngày «bị cắt»: dòng thời gian là vùng **cuộn ngang** (`.dp-tl-cuon`); ảnh chụp ẩn thanh cuộn. Chuyến qua nửa đêm vượt trục 24:00 là chuyện trục giờ, không sửa ở đợt này.
- Ô «— Chọn dịch vụ —» ở Tra nhanh: cùng một ô (ô lọc + ô chọn chồng nhau trong cột «Dịch vụ»), không phải rơi dòng.

## Hoãn, cần chủ chọn (nêu trong báo cáo xem trước)
- Cách ghi tiền thống nhất («1,08tr ₫» / «700k ₫» / «1.080.000 ₫»): chạm hiển thị tiền ở nhiều nơi + câu hỏi đã treo từ 27/10 — cần chủ chọn một kiểu.
- Gộp thang chữ hết về 6 bậc: trang Đăng nhập theo bản vẽ «tuân thủ 100 %» dùng cỡ 26 / 32; số liệu lớn dùng 20 / 28 — gộp tiếp phải xin ngoại lệ.
- Độ đậm: đã có ba mức thật (400 / 500 / 600) và do núm của màn Giao diện công ty điều khiển — không đổi mặc định.
- Rút gọn đoạn giải thích đầu trang (Hoa hồng, Danh bạ, Danh mục): đổi chữ nghiệp vụ — cần chủ duyệt câu chữ (bảng từ ADR-0130).

## Luật dự án áp vào đợt này
- Mục 1, 2, 14 chạm chỗ hiển thị tiền ⇒ việc lớn: cần người kiểm độc lập chỉ đọc **trước khi day-len** — phiên này không có công cụ giao việc cho người kiểm khác, nên ghi «chưa kiểm độc lập».
- Kịch bản Chrome theo bảng `web/CLAUDE.md` cho các tệp bị sửa (cần `AXE_JS`, Chrome ngoài kho) — phiên này chạy kịch bản đo riêng; các kịch bản cũ ghi «chưa chạy».
- CSS mới sau dấu mốc PWA chỉ dùng token.

## Nhật ký thi công (30/10/2026, cùng phiên)
- Thứ tự: chụp ảnh «trước» + phép dò «trước» với tệp giao diện giống production **trước khi sửa** (số chuẩn: 256 chỗ chữ bị cắt, 19/32 và 6/14 trang khuất mục đang mở, 1 trang tràn ngang) → sửa → chụp «sau» cùng tham số.
- [23] Dải nhắc: bài kiểm đỏ trước (`tongDaiNhacHaiLop` chưa có) rồi xanh. Có lúc thử «luôn cát» để tiết kiệm byte — bỏ, vì đặc tả đợt 0 §5 (chủ duyệt) ghi «Đỏ» và lời duyệt 30/10 chỉ đổi phần «khi còn xa hạn». Kết quả: còn > 3 ngày → cát; ≤ 3 ngày hoặc quá hạn → đỏ. Phần này **thay đặc tả đợt 0 §5 cho trường hợp còn xa hạn** (đặc tả đợt 0 đóng băng, không sửa; ghi ở đây).
- [14] Hàng tiêu đề cột đặt tĩnh trong `public/orders.html` (không qua gói JS) để không thêm byte vào gói trang Đơn hàng.
- [4] Một dòng trong `web/shell.ts` (`scrollIntoView({ block: "nearest" })` cho mục `aria-current=page`) + `scroll-margin-block` ở CSS.
- **Trần gói trang Đơn hàng** (`src/goi-trang-nhe.test.ts`, sổ hàng rào ghi «nới có chủ ý chờ chủ duyệt»): mã gốc 101.695 byte (dư 24 byte so với trần 101.719); sau đợt này 101.833 byte (+138: dòng cuộn thanh bên, hàm tông dải nhắc; bỏ được 21 byte chữ lặp). **Bài này để ĐỎ, không tự nới** — chờ chủ duyệt trần mới (theo lệ «số đo + 100»: 101.933).
- Tấm gương bộ v2 (`src/bo-v2-khop-ma.test.ts`): sinh lại phần CHÉP TỪ MÃ (`node scripts/sinh-bundle-bo-v2.mjs`), sửa `tokens.json` (bậc 4, 8; mười token mới) → `node scripts/so-bo-v2-voi-ma.mjs` 0 lệch. Bộ trên Claude Design chưa xuất bản lại.
- Nhãn núm màn Giao diện công ty: «Màu chính (tiêu đề, liên kết, chữ nhấn)» → «Màu chính (liên kết, nút, chữ nhấn)» vì tiêu đề nay theo «Chữ chính».
