# Nhật ký thi công: menu máy tính theo việc (15/10/2026)

## Task 1 — Hướng dẫn viên thấy mục Đơn hàng (ADR-0017)

- Bước 5 (kiểm route thật): trang `/orders` của hướng dẫn viên chỉ gọi `GET /api/orders`, nên chỉ hiện đơn mình phụ trách. Đơn tự do (`GET /api/orders/pool`) chỉ nằm ở khối "Đơn chờ nhận" trang Của tôi (`web/viec-cua-toi.ts`).
- Quyết định của người điều phối 15/10 (hướng 1): mục Đơn hàng của FIELD = đơn mình phụ trách; đơn tự do ở Của tôi › Đơn chờ nhận. KHÔNG thêm khối nào vào `/orders`.
- Sửa: `TRANG.donHang.hien` = `canAccessOrders` (thay cả biểu thức `coMucDonHang(...)` vì cổng "orders" là tập cha của nó — 1024 tập quyền xanh; viết `|| canAccessOrders(s)` làm gói trang Đơn hàng vượt trần 96000 byte đúng 1 byte, bài `goi-trang-nhe` đỏ, nên rút gọn thay vì nới trần); khung tạm (`tam`) giữ nguyên (thiếu cờ FIELD một nhịp, ADR-0035).
- Bài phải sửa: `tests/audit/muc-hien-mo-duoc-khung.mjs` bỏ dòng DUOC_MA_AN "HDV chỉ-FIELD không thấy mục Đơn hàng" (dòng "chờ chủ" nay đã được chủ quyết, giữ nguyên dòng thanh-tren). Không nới bài bảo vệ quyền nào.
- Ảnh chụp `src/muc-giao-dien-hien-trang.json` chụp lại: ngoài mục Đơn hàng cho tập có FIELD, còn thêm mục "Điều chỉnh công nợ" (ADR-0115, commit 8d9e6cbc) vì ảnh cũ đã lỗi thời so với mã; trường `nguon` thành "cây làm việc".

## Task 2 + 3 — Bảng mục mới và thanh bên mới

- Task 2 Bước 1 (kiểm số có gộp "Giá & chi phí" được không): chạy trên 1024 tập quyền, kết quả **`tập lệch: 0`** ⇒ hai trang `bangGiaXe` và `bangKeXe` có cùng điều kiện hiện trên mọi tập quyền, nên gộp thành MỘT mục "Giá & chi phí" (`gom: ["bangGiaXe", "bangKeXe"]`). Nhóm VẬN CHUYỂN có 5 mục (Task 4 đọc kết quả này: không cần tách hai mục).
- Trần 10 mục hiện sẵn: bài `src/muc-giao-dien-menu-moi.test.ts` kiểm cho 11 vai thật; bài "mọi tập quyền" (1024 tập) ép: trang thấy trước đây vẫn tới được, không thấy thêm trang nào.
- Bảng mục: nhóm đổi thành HẰNG NGÀY / VẬN CHUYỂN / TIỀN / THIẾT LẬP / CHÂN MENU; bỏ mục cha "Vận chuyển" (`CHA_THANH_BEN`); thêm `noiBat`, `gom`, `sangTaiMuc`, `thietLapMoSan`. Mục THIẾT LẬP không còn biểu tượng (bản vẽ không vẽ; tiết kiệm byte gói). "Chính sách điều phối" không có biểu tượng `settings` nên đã bỏ cùng nhóm; "Đề nghị chuyển khách" dùng biểu tượng `swap` có sẵn.
- Gói trang Đơn hàng: sau thanh bên mới còn 95.979 byte (trần 96.000, dư 21 byte). Phần mã thanh bên cũ (mục cha/mục con, `navGroups`/`NavItem` sao chép) đã bỏ để bù. Ai thêm mã vào `web/shell.ts` hoặc `src/shared/muc-giao-dien.ts` sau này sẽ chạm trần; không nới trần.
- Số "dịch vụ lệch giá" (`catalogConflictBadge`) nay dùng chung MỘT lời gọi cho cả huy hiệu mục "Dịch vụ & giá" và chữ đếm nút Thiết lập ("N · M lệch giá" khi M > 0).
- Bài đã sửa vì đổi nhãn/nhóm/DOM chính đáng (không bài bảo vệ quyền nào bị nới): `src/muc-giao-dien-hien-trang.test.ts` (dạng chuỗi so sánh: bỏ "cha/con", thêm "noi-bat"), `scripts/chup-muc-giao-dien.mjs` (đọc DOM thanh bên mới), `tests/audit/muc-hien-mo-duoc-khung.mjs` (bỏ nhánh `kieu: "cha"`, bỏ dòng liên kết viết tay của mục cha), `src/token-giao-dien.test.ts` (bỏ `:not(.sidebar-parent)` khỏi luật rê chuột), `src/shared/tro-ly-cau-truc.test.ts` (tên nhóm menu), `scripts/sinh-so-do-trang.mjs` (mục gộp vẫn ghi nhãn cho các trang nó gom) rồi sinh lại `src/shared/so-do-trang.ts`, `src/shared/tro-ly-cau-truc.ts`.
- Nợ chuyển cho Task 7: các tệp `src/shared/huong-dan-{ban-hang,doi-tac,ke-toan,quan-tri}.ts` vẫn nói "Nhóm BÁN HÀNG" (nội dung Trợ giúp và kho trợ lý) — cần viết lại theo nhóm mới.

## Task 4 — Dải chuyển nhanh giữa trang anh em + sửa M-1

- Hàm `traAnhEm(duong, who)` ở TỆP RIÊNG `src/shared/muc-giao-dien-gom.ts` (không ở `muc-giao-dien.ts`): gói `web/orders.ts` chỉ dư 3 byte dưới trần 96000, nên không thêm byte nào vào `muc-giao-dien.ts`/`shell.ts`. Nguồn dữ liệu là trường `gom` của THANH_BEN + `coHien`; nhãn trang ở một bảng nhỏ trong tệp mới. Trang mở từ Xe (`/xe-chi-tiet`, `/xe-sua`) vẫn tính là "Xe" nhờ `sangTai`. Bài: `src/shared/muc-giao-dien-gom.test.ts` (1024 tập quyền: chỉ trả trang người đó thấy).
- `web/dai-trang-anh-em.ts` (`daiTrangAnhEm`, `ganDaiTrangAnhEm`) gắn vào đầu `<main>` của năm trang xe / giá bằng DOM, sau `initShell()`; `null` khi ≤ 1 liên kết. CSS `.dai-anh-em*` cuối `public/app.css` (chỉ token; hẹp thì cuộn ngang, không tràn).
- M-1: `web/giay-to-sap-het-han.ts` tìm huy hiệu ở `#sidebar a[href="/xe"] .sidebar-item-badge` (mục gộp "Xe & giấy tờ", đúng DOM của `sidebarItem` ở `web/shell.ts`) thay vì liên kết riêng không còn tồn tại. Bài tĩnh `src/huy-hieu-sap-het-han-dong-bo.test.ts` đọc href mục gộp từ THANH_BEN. Cách cập nhật giữ nguyên: đổi chữ số, hoặc gỡ phần tử khi đếm về 0.
- Việc cho Task 7: các kịch bản Chrome (`xe-smoke.mjs`, `sap-het-han-smoke.mjs`, `lich-xe-ban-smoke.mjs`, `trang-chu-smoke.mjs`) CHƯA chạy ở Task 4 (cần Chrome + mạng); cần rà các bước đếm mục thanh bên theo bảng menu mới và thêm kiểm dải `nav.dai-anh-em`.
- Gói `web/orders.ts` vẫn dư 3 byte (95997/96000), không đổi.

## Task 5 — Luật chọn thẻ "Việc của bạn" (hàm thuần)

- Tệp mới `src/shared/viec-cua-ban.ts` (+ bài `viec-cua-ban.test.ts`): `viecCuaBan(who, nguon)` và `nguonCanTai(who)`. Chỉ `web/home.ts` (Task 6) và bài kiểm được import; gói `web/orders.ts` vẫn dư 3 byte (95997/96000), tệp mới không nằm trong gói.
- Đối chiếu bản đồ quyền thật: Kế toán GIỮ `ledger.adjust.approve` (any), nên có thẻ `dieuChinh`; Kế toán không có `order.create`/`admin.manage` nên không có `chuaPhuTrach`. Quản trị và Toàn quyền cũng giữ `dieuChinh`; chỉ Toàn quyền giữ `feedback.triage`.
- Quyết định thẻ cọc: `grep -rn "ledger/coc" web/` không có kết quả, nên BỎ khoá `cocCanChi`; Kế toán thành bốn thẻ `dieuChinh · nhap · conThieu · chuyenHomNay`. Nợ ghi ở `docs/BACKLOG.md` mục 30.
- Điều kiện "cả bốn vai" dùng ô `order.view` (chỉ ô `any` tính khi không có ngữ cảnh). Tiền định dạng bằng `vndShort` (`src/shared/money.ts`).
- Task 5 sửa vòng 1: mọi thẻ đơn/tiền/chuyến cần `seesAllOrders` (cả `nguonCanTai`; bài 1024 tập quyền); đích thẻ nháp là `/orders`; Quản trị xếp dieuChinh/conThieu sau chuyenHomNay theo đặc tả §9.3; nút `nhap`/`conThieu` theo `order.modify`/`ledger.write`; gói orders vẫn dư 3 byte.
