# Lịch sử thiết kế giao diện — tư liệu cho cuộc đánh giá UX tổng thể

Soạn 27/10/2026, chỉ đọc, trong worktree `danh-gia-ux-tong-the` (gốc `R` = `/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/danh-gia-ux-tong-the`). Mọi đường dẫn dưới đây tính từ `R`. Chữ "(suy ra)" = ngày hay giá trị tôi tự suy từ nội dung tệp, tệp không ghi thẳng. Chữ "chưa kiểm" = tôi không đọc tới.

Giá trị THẬT đang chạy (để so mọi đợt): `public/app.css` — nền trang `--c-surface-alt #f2f5f9` (dòng 42, đổi từ `#eaf2f8` ở bản 1.70, chú thích dòng 39–41), viền `--c-border #e1e7ef` (dòng 46), MỌI chữ Be Vietnam Pro (dòng 3–7, 61–62; Nunito/Lexend/Noto Sans chỉ là phông tuỳ chọn của ADR-0087, dòng 13), bo góc 8/12/18/999 (dòng 51–54), `--tap-min 44px` (125), `--bar-h 60px` (126), `--tabbar-h 56px` (139), `--w-sidebar 248px` (183, "bản vẽ menu 15/10"), `--h-muc-menu 40px` (146), thanh bên nền = nền trang `--c-sidebar-bg: var(--c-surface-alt)` (372), thanh đầu điện thoại nền trắng `--c-bar-bg: var(--c-surface)` (368), `--c-status-bar #ffffff` (410).

---

## 1. Từng đợt bản vẽ trong `docs/design/`

Hai cách dựng bản vẽ (ảnh hưởng tới độ lệch):
- **Kéo thành phần từ hệ thiết kế Claude Design qua `x-import`** (vỏ máy tính, Sidebar, Button…): `2026-10-01-dua-don-hanh-khach/vo-may-tinh.dc.html`, `tao-don-2026-10-18/TaoDonForm.dc.html`, `van-chuyen-dieu-phoi/project/*`. Thanh bên khi đó là `TourOBookingDesignSystem_34f284.Sidebar`, nền `var(--c-primary-strong)` (`tao-don-2026-10-18/_ds/.../_ds_bundle.js`, hàm `Sidebar`).
- **Vẽ lại vỏ bằng tay, viết cứng giá trị**: `menu-may-tinh-2026-10-15`, `so-cong-no-2026-10-25`, `hoa-hong-ho-tro-2026-10-25`, `gop-y-2026-09-30`, `nhom-dich-vu-2026-09-30`, `thong-bao-mockup`, `van-chuyen-1a/project/vo-may-tinh.dc.html` (aside `background:var(--c-primary-strong)`). Đây là chỗ giá trị trôi giữa các đợt.

Có ba hệ thiết kế Claude Design khác nhau nằm trong kho:
- **"Tour Đảo — Design System"** `8db7ceb8…` (`mockup-by-ClaudeDesign/_ds/…/readme.md`, cũng ở `a2-mockup/output/extracted/_ds`): trích từ **website công khai tourdaovn** — nền trang TRẮNG, Be Vietnam Pro 700/800 tiêu đề + Nunito nội dung, thân 17px, line-height 1.68, thang 14 bậc tới 60px (`tokens/typography.css` dòng 5–32).
- **"Tour Đảo Booking — Design System"** `34f284df…` (`van-chuyen-dieu-phoi/project/_ds/…/readme.md`, bản chép ở dua-don, tao-don): hệ của CRM — nền `#eaf2f8`, viền `#d3e1ec`, thanh bên máy tính navy đậm `#082f49` 236px, thanh đầu điện thoại navy, thân Nunito 16/1.5, tiêu đề Be Vietnam Pro 700/800 (`tokens/typography.css` dòng 3–29; readme mục "VISUAL FOUNDATIONS", "Products"). Bản chép 18/10 vẫn giữ các giá trị này (`tao-don-2026-10-18/_ds/…/tokens/colors.css` dòng 19, 21, `--surface-sidebar: var(--c-primary-strong)`).
- **"Tour Dao Travel ERP Design System"** `16f26bf7…` (`so-cong-no-2026-10-25/_ds/…/readme.md`): hệ LẠ, mượn kiến trúc SAP Fundamental — đỏ thương hiệu `#8B1E2D`, chữ Times New Roman cho tiêu đề/số KPI, JetBrains Mono, thân 14px, bo 3/6/10, biểu tượng Lucide qua CDN. Màn Sổ công nợ v2 thật ra KHÔNG dùng hệ này (vẽ tay bằng giá trị app.css: `#0c4a6e`, `#f2f5f9`, `#e1e7ef`, Be Vietnam Pro — `So Cong No v2.dc.html`), nhưng hệ lạ vẫn nằm trong kho: đề bài sau ghi "dùng hệ thiết kế của dự án" có thể vớ phải nó.

| Thư mục | Ngày | Màn | Hệ / giá trị dùng | Bố cục, điều hướng chính | Thành phần riêng |
|---|---|---|---|---|---|
| `a2-mockup` | 19/09 (`REVIEW.md` dòng 3) | Form lập/sửa đơn với THẺ DỊCH VỤ + Trang chi tiết đơn, 12 artboard 390 (+ máy tính ≥960) | Đề bài ép token tourdaovn: nền `#EAF2F8`, viền `#D3E1EC`, Be Vietnam Pro tiêu đề + Nunito nội dung 16px, line-height 1.68, nút bo 8px, thẻ 12px, huy hiệu pill (`PROMPT.md` dòng 39–48) | Vỏ PWA: **thanh đầu navy** có "‹", thanh tab dưới, form ẩn tab + nút "Lưu đơn nháp" dính đáy (`PROMPT.md` dòng 13, 59); máy tính hai cột, cột phải tóm tắt dính (A6) | Bộ đếm −/+ 44px, nhãn giá san hô, huy hiệu Nháp cát / Đã xác nhận xanh lá / Đã huỷ "past" xám (dòng 44); đề xuất 4 token trạng thái, thành bộ `--c-danger*` (REVIEW mục 2) |
| `mockup-by-ClaudeDesign` | 21/09 (`13 Tai lieu ban giao.dc.html` đầu tệp) | Thiết kế lại 11 trang: đăng nhập, đơn hàng, đơn, lập đơn, nhân viên, hồ sơ, dịch vụ, địa điểm, Tôi, nhật ký, góp ý + lớp phủ/trạng thái; thêm "00 Trang chu (v2)", "Order Card - 3 Phong Cach" | Hệ `8db7ceb8` (tourdaovn). Tài liệu bàn giao ghi nền app `#F8FAFC`, viền `#E2E8F0`, `--c-primary-soft #F0F7FC`, thang chữ 11…32, bo 8/12/**14 (khung app)**/999, bóng "tông xanh" | Phong cách "Tiêu chuẩn"; **thanh đầu máy tính cao 60px nền trắng**; tab điện thoại 3 tab bán hàng / 5 tab admin; nội dung ≤1200px, cột phụ 340px dính; bảng → thẻ dưới 900px; thứ tự 9 trường cốt lõi của đơn (giờ đón đứng đầu) | Lớp phủ một khuôn (≤640 trượt đáy bo trên 20px, >640 hộp giữa ≤560px); chỉ 10 biểu tượng; trạng thái đơn: Nháp cát · Đã xác nhận xanh · **Đã huỷ san hô nhạt**; **san hô dùng cho "hành động huỷ", số tiền còn thiếu, lỗi máy chủ, viền lỗi ô** (mục 2, 6) |
| `tour-o-booking-hdv` | 27/09 (suy ra: `TODAY = new Date(2026, 8, 27)` trong `Viec cua toi - HDV v2.dc.html`) | "Việc của tôi" của HDV: Chờ nhận / Đơn của tôi, bảng sửa số khách, hộp huỷ | Nunito + Be Vietnam Pro qua Google Fonts, viền `#d3e1ec` | Hai nhóm danh sách, thẻ có nút "Nhận"/"Gọi" | Bảng trượt sửa số khách (bộ đếm), hộp xác nhận "Huỷ đơn …? / Giữ đơn" (chữ "Giữ đơn" nay bị cấm, mục 2) |
| `thong-bao-mockup` | 27/09 (ghi trong tệp) | Chuông, hộp hai ngăn "Của tôi"/"Tất cả", dải tin quan trọng màu cát, "Gửi thông báo" | Token sao chép: nền `#eaf2f8`, viền `#d3e1ec`, bo 8/12/18/999, Be Vietnam Pro + Nunito | Bảng thử theo vai (Bán hàng/Kế toán/Toàn quyền), khổ máy tính/điện thoại | Chuông + số đỏ, dải cát đầu mọi trang tới khi "Đã hiểu" |
| `van-chuyen-1a` | 28/09 (`README.md` dòng 3) | Xe, thêm/sửa xe, chi tiết xe, giấy tờ người, giấy tờ của tôi, sắp hết hạn, trang đầu tài xế (390 + 1040) | Hệ `34f284df`; vỏ máy tính thanh bên `--c-primary-strong` (navy đậm) | "Vận chuyển" là mục cha trên **menu dọc** (nhóm QUẢN TRỊ), không tab ngang; điện thoại: hai dòng liên kết ở trang Tôi; **nút chính dính đáy rộng hết trên điện thoại, góc phải tiêu đề trên máy tính** (README dòng 27–28) | `bang-truot`, `form-giay-to`, `vo-dien-thoai`, `vo-may-tinh`; token MỚI `--w-doc-chip`, `--t-reveal` |
| `van-chuyen-dieu-phoi` | 29/09 (`README.md` dòng 3) | Điều phối xe, chi tiết/tạo chuyến, Cuốc của tôi, chuyến đang chạy, xuất bến, biểu mẫu chặng (mốc 6 giờ), chính sách điều phối | Hệ `34f284df` đầy đủ (`_ds_bundle.js` là "nơi duy nhất ghi biến thể Button / Chip / Banner / Sheet / Field / Sidebar / TabBar / MobileBar", README dòng 11) | Giữ vỏ thật, thêm 3 mục con dưới "Vận chuyển"; tài xế: tab "Cuốc của tôi" làm trang mở đầu (Q5) | Khối `dp-chua-xep`, `dp-dong-thoi-gian`, `dp-can-xu-ly`; cỡ chữ 11px và 8px nhỏ hơn `--fs-badge` (README dòng 43). Bản đối chiếu: "dùng được làm khung bố cục, KHÔNG thi công nguyên trạng" (dòng 5) |
| `gop-y-2026-09-30` | 30/09 | Bộ lọc đơn, Trang chủ thêm ngày mai/ngày kia, Góp ý thanh bước, lọc sản phẩm lập đơn (390 + 1040) | HTML tĩnh tự chứa, giá trị app.css lúc đó: nền `#eaf2f8`, viền `#d3e1ec` (README dòng 3) | Bảng trượt lọc (điện thoại), hộp giữa màn (máy tính); Trang chủ cách A — ba nút Hôm nay/Ngày mai/Ngày kia (dòng 32) | Chip "đang lọc" + "Xoá lọc"; **thẻ đơn nay 3 dòng** (nới "đúng 2 dòng" của Đợt E, dòng 26, 35) |
| `nhom-dich-vu-2026-09-30` | 30/09 | Chip "Nhóm dịch vụ" ở ô chọn dịch vụ | Chép khuôn và token từ ảnh `d-loc-san-pham-lap-don.html` (README dòng 3) | Khuyến nghị: hàng chip nhóm RIÊNG dưới hàng lọc, lọc kết hợp được (dòng 9) | Chip lọc; đổi "Theo nhóm" thành "Giá theo nhóm" |
| `2026-10-01-dua-don-hanh-khach` | 01/10 (`github.md` dòng 5) | M1–M7: đưa đón (chặng) và hành khách trong form, chi tiết đơn, hai bảng trượt sửa, dịch vụ hai chiều, danh mục; 390 + 1040 | Hệ `34f284df` qua `x-import`; nền bản vẽ `#dfe7ee` (`00 Muc luc va cau chu.dc.html`) | Form điện thoại ẩn thanh tab, thay thanh lưu dính đáy (`data-tabbar="off"`); máy tính: bảng hành khách trải ngang dưới hàng "thẻ dịch vụ \| Tóm tắt"; cột Tóm tắt 260px (app thật 340px) | Khối chặng, ô "Nơi trả gợi ý", lưới ô `minmax(200px,1fr)`; đề xuất nhóm token "Riêng" |
| `2026-10-02-trang-chu-may-tinh` | 02/10 | Chỉ có **10 ảnh tham chiếu** trong `tham-chieu/` (ảnh hiện trạng + phác thảo AI). Đề bài ở `docs/superpowers/specs/2026-10-02-trang-chu-may-tinh-lenh-claude-design.md`; **không có bản vẽ kết quả trong `docs/design`** | Đề bài: Be Vietnam Pro "chữ thường, nét mảnh" — nội dung 400, nhấn ≤500, 600 chỉ cho số lớn nhất, **bỏ 700/800, không viết HOA trong vùng nội dung** (spec, mục 3.3); bóng `0 1px 3px rgba(15,23,42,.08)` | Giữ thanh bên 236px và thanh trên 60px (chuông, ô tìm, nút san hô "Tạo đơn"); dải chào theo màu thanh trên (trắng); hàng "Lối tắt" ≤8 ô | Đề bài nói thanh bên hiện là "khối xanh đậm `#082f49`" và phải đẹp ở cả hai tông (mục 3.2) |
| `van-chuyen-dot-3-7` | 02/10 (`README.md` dòng 1) | Lịch xe bận, chi phí xe thuê, xe đang chạy, tài xế từ chối/báo bận, đưa đón xe riêng | Hệ `34f284df` (`colors.css`: nền `#eaf2f8`, viền `#d3e1ec`, `--surface-sidebar: var(--c-primary-strong)`); lịch xe bận nền `#EAF2F8`, Nunito | Chủ kèm lời: **"đổi lại nền cho thanh bên trái (xanh đậm nên đổi thành màu nền toàn trang)"** (README dòng 15) — gốc của thanh bên sáng hôm nay (app.css dòng 372) | Bốn tệp chỉ là bản chép chữ + dữ liệu, khung trang mô tả bằng chú thích (README dòng 13) |
| `menu-may-tinh-2026-10-15` | 15/10 (`README.md` dòng 1) | Menu máy tính theo việc + Trang chủ "Việc của bạn" | Vẽ tay, giá trị app.css mới: nền `#f2f5f9`, viền `#e1e7ef`, Be Vietnam Pro; nút cao 36/40px | **Thanh bên 248px nền sáng = nền trang**, viền phải `#e1e7ef`; nhóm theo việc (bán · vận chuyển · tiền), tối đa 10 mục mỗi vai, 14 mục thiết lập gói vào nhóm đóng sẵn; **nút san hô "Tạo đơn" đứng đầu thanh bên**; Trang chủ: thẻ việc xếp gấp nhất bên trái, mỗi thẻ đúng một nút | Thẻ "Việc của bạn" (giá trị, đơn vị, nút, trạng thái lỗi "—" + "Thử lại"); bảng thử theo vai |
| `tao-don-2026-10-18` | 18/10 (`README.md` dòng 1) | Tạo đơn thiết kế lại, 12 artboard bấm được (390, 1040/1440) + 4 ảnh hiện trạng 14/10 | Đề bài đòi Be Vietnam Pro, `#f2f5f9`, `#e1e7ef` (`PROMPT-CLAUDE-DESIGN.md` dòng 105–108) nhưng bản vẽ trả về giá trị hệ `34f284df`: **nền `#eaf2f8`, viền `#d3e1ec`, thân Nunito**, thanh bên + thanh trên điện thoại nền xanh; Claude Design tự ghi "ảnh 14/10 cho thấy bản chạy thật đang dùng nền trắng — cần chốt một bên" (`Tao don thiet ke lai.dc.html`, mục ghi chú; README dòng 7 xác nhận giá trị đó đã cũ) | Ô tìm → hàng nhóm cuộn ngang → khung danh sách luôn mở → thẻ dưới; một thẻ mở; điện thoại bỏ khối Tóm tắt, thanh dính cuối trang; máy tính hai cột, cột phải dính | **Thang nút ba cấp** (Chính nền xanh đậm — chỉ một nút; Phụ viền 1px cao 44px; Lối nhỏ chữ xanh gạch chân); bỏ nút viên thuốc, nền xanh nhạt, nét đứt; **"Tạo đơn" san hô chỉ ở thanh trên**; 2 biểu tượng MỚI (thùng rác, kính lúp) |
| `so-cong-no-2026-10-25` | 25/10 (`YEU-CAU-CHINH.md` dòng 1, 33) | Sổ công nợ (Kế toán) + Sổ của tôi (Đối tác), hai lượt; dùng 2a và 2b | Vẽ tay giá trị app.css (`#f2f5f9`, `#e1e7ef`, Be Vietnam Pro, `tabular-nums`); `_ds` đi kèm là hệ lạ "Travel ERP" (xem trên) | Thanh bên 248px nền sáng như 15/10 (`<nav … width:248px … background:#f2f5f9>`); Sổ công nợ = danh sách + ngăn chi tiết bên phải; Sổ của tôi = bảng kê theo tháng; mục menu gộp "Sổ công nợ & khoá sổ" vì trần 10 mục (dòng 37) | Bảng màu trạng thái riêng trong mã vẽ: Đã giao `#dcebf6`/`#082f49`, Đã xác nhận xanh lá, **Đã huỷ nền cát `#fbe3b3`** |
| `hoa-hong-ho-tro-2026-10-25` | 25/10 (`README.md` dòng 1) | Hoa hồng đối tác (Mức đang áp dụng, Thiết lập) + Hỗ trợ (Việc của nhóm, luồng một yêu cầu) | Be Vietnam Pro qua Google Fonts; biến riêng trong khung `--p:#0c4a6e … --ln:#e1e7ef --alt:#f2f5f9`; viền thẻ `#cbd5e1` (12 lần) khác app.css; bo có 14px và 22px | Vẽ đúng khổ vùng nội dung 760 (máy tính 1040), cột trái 320; nút nổi "Trợ lý" và thanh tab vẽ đúng chỗ; nút chính của màn là "Nhận việc" và "Gửi", "Gửi yêu cầu" là nút viền | Chip trạng thái/ưu tiên/người xử lý bấm được; "đặc tả thắng bản vẽ" (README dòng 13) |

---

## 2. `docs/SYSTEM-DESIGN.md` §9 (Giao diện, dòng 1277–1435) và §15 (Thuật ngữ, dòng 1576–1614)

### 2a. §9 — bảng trang (dòng 1279–1325) tóm gọn

Bảng có cột Trang · HTML · Bundle · API · Ai vào được. Khoảng 45 dòng. Nhóm theo người vào:
- **Mọi tài khoản:** Tôi (`/account`, 1286), Hỗ trợ (`/feedback`, 1314), Hướng dẫn (`/help`, 1315). Đăng nhập công khai (1283).
- **Cổng `orders` (văn phòng, Đối tác, Thực tập):** Trang chủ (1281 — kèm ô `order.view`/`money.view`/`contact.view`; tài khoản không xem mọi đơn bị chuyển sang `/orders`), Đơn hàng (1282), Chi tiết đơn (1285). Lập/sửa đơn cần `order.create` (1284).
- **Tài xế:** Trang đầu tài xế `/tai-xe` (1289, chỉ tài khoản "chỉ tài xế"), Cuốc của tôi `/cuoc` (1290), Chuyến của tài xế (1291).
- **Vận chuyển văn phòng (`trip.view`/`vehicle.manage`, cổng `office`):** Điều phối xe, Chi tiết chuyến, Tạo/sửa chuyến, Xe đang chạy, Xe, Thêm/sửa xe, Chi tiết xe, Giấy tờ sắp hết hạn, Lịch xe bận, Bảng giá thuê xe, Bảng kê chi phí xe, Đề nghị chuyển khách (1292–1308).
- **Quản trị (`admin.manage`):** Địa điểm, Dịch vụ, Loại giấy tờ xe/người, Lý do điều phối (1297–1301, 1309–1310). Quản lý tài khoản cổng `accounts` gồm cả Nhân sự (1311).
- **Chỉ Toàn quyền:** Giao diện công ty (1287), Chính sách điều phối, Điều kiện xuất bến (1299–1300), Nhật ký (1312), Phiên đăng nhập (1313), Gửi thông báo (1316), Trợ lý Hỗ trợ cài đặt (1317).
- **Tiền (Kế toán, Toàn quyền, có phần Quản trị/Bán hàng):** Sổ công nợ (1318), Khoá sổ tháng (1319), Điều chỉnh công nợ (1320), Hoa hồng đối tác (1321), Người bán dịch vụ (1322), Chụp bù mức (1323), ô "Đặt qua đối tác" (1324), khối "Phần đối tác" (1325).

Luật đi kèm: "nơi duy nhất quyết ai thấy lối vào trang nào là bảng `TRANG` ở `src/shared/muc-giao-dien.ts`"; mọi đường trang nằm trong `PAGES` (`src/shared/sw-policy.ts`) (dòng 1327). Thanh tab điện thoại do `THANH_TAB` cùng tệp đó quyết (`docs/PWA-IPHONE.md` dòng 13).

Phần mô tả sau bảng: thành phần DOM (`h()`, `icons.ts`, `shell.ts`… dòng 1378); người phụ trách ba trạng thái (1380–1385); ô chọn dịch vụ thiết kế lại 18/10 (1387–1394); form Tạo đơn nhãn nổi, bốn bước, thẻ gập, một ô Nơi đón/Nơi trả, "Khách có mặt" thay "Check-in", công tắc "Đơn của" (1396–1404); Bảng tin WebSocket (1406–1412); ảnh xác nhận PNG (1413); màn Đăng nhập theo bản vẽ 24/09 "tuân thủ 100%" (1415); chế độ bảo trì (1417); PWA — manifest `theme_color #ffffff`, thanh đầu nền trắng từ 1.65 (1419); Web Push (1421); đợt V1 3/10: nút "Hỗ trợ" nổi né mọi thanh cuối trang mang lớp `.thanh-hanh-dong-cuoi` (1427), một hàm ngày `ngayNgan` (1428), nhãn phạm vi "Toàn công ty"/"Của tôi" trên Trang chủ (1429); CSS token ở `:root` của `app.css` (1432).

### 2b. Bảng thuật ngữ (khái niệm → chữ chuẩn → chữ cấm/cũ)

§15 tự nó KHÔNG có cột "chữ cấm": bảng gốc có ba cột Tiếng Việt · Định danh mã · Ghi chú (dòng 1578). Bảng dưới đây ghép ba nguồn, mỗi dòng ghi nguồn: **[§15]** = ghi chú tên cũ trong §15; **[BT]** = danh sách chặn máy `src/shared/bang-tu-giao-dien.ts` (ADR-0130; `npm test` đỏ nếu chữ cũ quay lại); **[§9]** = SYSTEM-DESIGN §9; **[CL]** = CLAUDE.md §7.

| Khái niệm | Chữ chuẩn | Chữ cấm / cũ | Nguồn |
|---|---|---|---|
| Hệ thống | Nền tảng | App, app (trừ "App Store") | [BT] dòng 22, [CL] |
| Danh sách hồ sơ người/tổ chức | Danh bạ (mỗi mục vẫn là "hồ sơ") | "Hồ sơ" làm tên màn (trước bản 1.10) | [§15] dòng 1589 |
| Vai trò hồ sơ | mục "Công việc tại đâu"; quan hệ ở "Người liên hệ, tài xế" | "Người liên hệ" (tới ADR-0048) | [§15] 1590 |
| Màn tài khoản | Quản lý tài khoản (tab điện thoại "Tài khoản"); trang cá nhân "Tôi", mục thanh bên "Của tôi" | "Nhân viên" (trước 1.10) | [§15] 1591 |
| Tiền khách trả từng lần | khoản thu (Ghi khoản thu · Sửa khoản thu đã ghi · Ghi bù khoản thu) | lần thu, LẦN THU; Lệnh Thay, Thay lần | [BT] 16, 18; [§15] 1586 |
| Hoàn tiền | khoản hoàn tiền | lần hoàn | [BT] 17 |
| Huỷ một khoản (dòng ngược) | Huỷ khoản thu · (đã huỷ) · Huỷ dòng | Đảo (trừ nghĩa hòn đảo) | [BT] 20, `NGHIA_HON_DAO` |
| Người cầm tiền | Người thu tiền | Người nhận tiền, Người thu | [BT] 27 |
| Tiền chưa nộp | chưa nộp về công ty | giữ hộ, người đang giữ tiền | [BT] 28 |
| Một đoạn đưa đón | lượt đưa đón (tắt "lượt") | chặng, CHẶNG | [BT] 29 |
| Mốc 6 giờ | hạn chốt (Hạn chốt trước giờ đón · Sắp tới hạn chốt · Quá hạn chốt) | mốc tối thiểu / mốc 6 giờ / dưới, sát, quá mốc | [BT] 30 |
| Xe bắt đầu chạy | cho xe chạy / xe chạy | xuất bến, XUẤT BẾN | [BT] 31 |
| Vai của tài khoản | vai trò | vai (đứng một mình) | [BT] 33 |
| Phiên đăng nhập | máy đang đăng nhập (Đăng xuất máy này) | phiên (trừ "phiên bản") | [BT] 34 |
| Khách có mặt | Khách có mặt, Có mặt lúc, Có mặt tại | Check-in (chỉ đổi chữ, cột giữ) | [§9] 1402 |
| Hoa hồng | Chính sách hoa hồng; Mức riêng | Mức TA; Dòng riêng, Riêng của loại | [BT] 37–38 |
| Hiệu lực mức | Ngừng · Áp dụng chính sách cho loại · Ngừng áp dụng · Đang/Sắp áp dụng · Đã ngừng | Đóng mức, Đóng dòng, Kết thúc gắn, Gắn mức, Đang áp, Sắp áp, Đã đóng | [BT] 39 |
| Hàng việc hỗ trợ | Việc của nhóm | Hàng đợi nhóm | [BT] 41 |
| Trang hướng dẫn | Hướng dẫn | Trợ giúp | [BT] 42 |
| Nút trong hộp huỷ đơn | Không huỷ | Giữ đơn | [BT] 24 |
| Bỏ đánh dấu | Bỏ đánh dấu | Bỏ dấu | [BT] 23 |
| Mã trạng thái | Nháp · Đã xác nhận · Đã huỷ | `draft`, `confirmed`, `cancelled` lộ ra màn | [§15] 1581, [CL] |

Lưu ý còn treo: trùng tên "Hỗ trợ" (trang / Trợ lý / vé) — BACKLOG `BL-VE-TRUNG-TEN` (`bang-tu-giao-dien.ts` dòng 40). Mã `DRIVER` ở hai bảng khác nghĩa ([§15] 1601).

---

## 3. Cấu trúc khuôn đề bài `docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/PROMPT-CLAUDE-DESIGN.md`

140 dòng, khoảng 21 KB. Phần dán vào Claude Design nằm giữa `---- BẮT ĐẦU ----` (dòng 5) và `---- HẾT ----` (dòng 140); trước đó ba dòng ghi nguồn và lỗi số "113 → 114 dịch vụ".

| Mục | Dòng | Nội dung, cách viết |
|---|---|---|
| Câu mở vai | 7 | "nhà thiết kế sản phẩm cao cấp, phần mềm quản trị"; điện thoại trước (390×844), rồi máy tính 1040 (kiểm 1440); bắt dùng đúng một hệ thiết kế |
| Bối cảnh | 9–10 | Ai dùng (≈30 nhân viên, không rành máy, ngón cái trên iPhone), màn này để làm gì |
| Bốn tiêu chí theo thứ tự ưu tiên | 12–14 | Dễ nhìn · Gọn mắt · Đúng phong cách quản trị · Đơn giản; "nguyên tắc vàng" một chạm |
| Hiện trạng (kèm ảnh 14/10) | 16–22 | 6 gạch lỗi cụ thể của bản đang chạy |
| Quyết định đã chốt | 24–61 | Câu khoá: "Vẽ đúng như dưới đây; đề xuất khác ghi vào ghi chú riêng, KHÔNG đưa lên artboard". Chia vùng A Chọn dịch vụ (27–36) · B Ngày đi và khối khách (38–45) · C Thẻ dịch vụ (47–53) · D Phần còn lại: thang nút ba cấp, thanh toán, thanh dính, máy tính (55–61) |
| Biến thể theo vai | 63–66 | Mỗi biến thể một artboard: Đối tác/Thực tập, tài khoản lai, bảng "Đổi khách" |
| Dữ liệu mẫu (dùng đúng) | 68–103 | Khách, đơn ba dịch vụ có phép tính, 14 nhóm có độ dài, 22 dòng danh mục mẫu |
| Hệ thống thiết kế (BẮT BUỘC) | 105–112 | Phông, mã màu từng vai, khoảng cách, bo góc, bóng, cỡ ô 16px, chạm 44px, AA, focus, biểu tượng, cách đề xuất token MỚI |
| Sản phẩm cần giao | 114–128 | Một HTML bấm được, 12 artboard đánh số kèm trạng thái cụ thể; thêm 3–5 dòng "vì sao" |
| Đừng làm | 130–136 | 6 điều cấm (không đổi nghiệp vụ, không gộp biến thể, không đưa lại bảng tick, không màu/phông mới, không chữ Anh, không bỏ chức năng) |
| Câu chốt | 138 | "Thiếu thông tin quan trọng thì hỏi TRƯỚC khi vẽ, tối đa 3 câu" |

Cùng khung với đề bài A2 19/09 (`docs/design/a2-mockup/PROMPT.md`: Việc cần làm → Tài liệu đính kèm → Ràng buộc thiết kế → Cách trình bày → Không làm → hỏi tối đa 3 câu). Nhận xét: phần "Hệ thống thiết kế" của đề bài 18/10 MÂU THUẪN với hệ được chỉ định (dòng 7 bảo dùng "Tour Đảo Booking — Design System", dòng 106–107 lại ghi giá trị app.css mới) — Claude Design đi theo hệ (xem mục 7). Đề bài còn dùng chữ "chặng" (dòng 52, 56, 119) đúng hôm chữ này bị đưa vào danh sách cấm.

---

## 4. ADR đã duyệt liên quan điều hướng, khuôn trang, giao diện (`docs/adr/README.md`)

| ADR | Tên | Trạng thái | Ràng buộc giao diện |
|---|---|---|---|
| 0015 | Khung điều hướng dọc | accepted 23/09 (dòng 21) | Máy tính dùng thanh bên dọc thay thanh ngang, điện thoại giữ thanh tab đáy; `/` là Trang chủ, Đơn hàng sang `/orders`; huy hiệu đếm chỉ hiện khi có dữ liệu thật. ADR ghi ngưỡng ≥900px, mã chạy từ 641px — mã đúng, lệch có chủ ý ở SYSTEM-DESIGN §16 |
| 0016 | Đăng nhập nhanh (Face ID, Google) | accepted 23/09 (dòng 22) | Passkey là đường chính trên màn Đăng nhập, PIN song song |
| 0021 | Một ngày cho cả đơn; bỏ dịch vụ nhập tay | accepted 25/09 (dòng 27) | Ô "Chọn ngày" ở đầu form, thẻ không có ô ngày riêng; ẩn nút "Dịch vụ nhập tay" — sau được **ADR-0061** (dòng 66) mở lại cho nội bộ bằng công tắc mặc định TẮT, Đối tác luôn bị chặn. Đề bài 18/10 vẽ nút "chỉ hiện với tài khoản được phép" là khớp |
| 0022 | Bảng tin | accepted 25/09 (dòng 28) | Màn tự làm mới khi đơn đổi; chỉ 5 loại tin hiện thông báo nổi (§9 dòng 1410) |
| 0034, 0045 | Thông báo hệ thống | accepted 27–28/09 (dòng 39, 50) | Chuông, hai ngăn "Của tôi"/"Tất cả", mở hộp là đọc hết |
| 0035 | Khung app nằm sẵn trên máy | accepted 27/09 (dòng 40) | Nạp sẵn mọi trang/JS; "bản nhớ khung" vẽ thanh trên/menu/tab tức thì; KHÔNG thành app một trang |
| 0036, 0039 | Thông báo màn hình khoá, giờ yên lặng | accepted 27–28/09 (dòng 41, 44) | Mục "Thông báo trên điện thoại" ở trang Tôi |
| 0040 | Vận chuyển lượt 1a | accepted 28/09 (dòng 45) | Tài xế không vào cổng đơn hàng; menu tài xế riêng (`van-chuyen-1a/README.md` dòng 40) |
| 0058 | Nhóm dịch vụ | accepted 30/09 (dòng 63) | Chip lọc theo nhóm ở ô chọn dịch vụ (Điều 8) |
| 0059 | Xe đón trên chi tiết đơn | accepted 30/09 (dòng 64) | Khối "Xe đón" chỉ cho người có `trip.view` |
| 0087 | Giao diện công ty | accepted 02/10 (dòng 99) | Toàn quyền ghi đè token (màu, phông trong danh sách có sẵn, cỡ, độ đậm); kiểm tương phản ≥4,5:1; mọi màn mới phải đi qua token theo vai |
| 0102 | Tốc độ đợt 1 | accepted 05/10 (dòng 112) | Tệp màu `/giao-dien.css` đệm bởi service worker; huy hiệu thanh bên qua hai route đếm nhẹ |
| 0105 | Hai nút "Chỉ đường" | accepted 08/10 (dòng 114) | Màn tài xế: nút Google mọi máy, nút Apple chỉ máy Apple |
| 0130 | Bảng từ giao diện | accepted 18/10 (dòng 136) | Một nơi ghi chữ đã loại, bài kiểm chặn chữ cũ (mục 2b) |
| 0135 | Nháp riêng tư | accepted 19/10 (dòng 141) | **Bỏ ô "Thanh toán trước" khỏi màn Tạo đơn**; nháp không có QR |
| 0136 | Bước Xác nhận đơn + «Gửi đơn» của Đối tác | accepted 25/10 (dòng 142) | Đơn cần xác nhận hoặc có lượt dưới hạn chốt phải "Gửi xác nhận"; đổi nút cuối của luồng lập đơn |
| 0066 | Trợ lý AI "Hỗ trợ" | accepted 30/09, văn bản ở đặc tả, chưa có tệp ADR (dòng 97) | Nút nổi "Hỗ trợ" ở mọi trang (§9 dòng 1317, 1427) |

Không phải ADR, mà là **đặc tả chủ đã duyệt** (không gắn số ADR):
- Đợt D menu dọc + Trang chủ mặc định: `docs/superpowers/specs/2026-09-23-dot-d-khung-dieu-huong-doc.md`, `2026-09-23-dot-d-can-chu-duyet.md` (chưa kiểm dòng trạng thái).
- Đợt E thẻ đơn hai dòng + biểu tượng: `2026-09-23-dot-e-the-don-gon-va-bieu-tuong.md` (chưa kiểm).
- Trang chủ mới: `2026-09-23-trang-chu-moi-design.md`, `…-quyet-dinh.md`; Trang chủ điện thoại kiểu MoMo 1.66: `2026-09-30-trang-chu-dien-thoai-kieu-momo-lenh-claude-design.md`; Trang chủ máy tính 2/10 (mục 1) (chưa kiểm trạng thái).
- Thị giác toàn Nền tảng 1.70: `2026-10-02-thi-giac-nen-tang-design.md` dòng 3 — **ĐÃ DUYỆT 02/10** (nút chính đặc navy, màu ngọc `--c-lagoon`, nền `#f2f5f9`, chuyển động nhẹ, "bấm lún 97%").
- Menu máy tính theo việc + Việc của bạn: `2026-10-14-menu-may-tinh-viec-cua-ban/DAC-TA.md` dòng 3 — "chủ đã duyệt 3 điểm 14/10"; `DE-XUAT-SUA-LUAT.md` chỉ là ĐỀ XUẤT sửa `web/CLAUDE.md`, chưa áp dụng (dòng 3).
- Tạo đơn thiết kế lại 18/10: `2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md`; bản đề xuất `DE-XUAT-ADR-0130.md` (chưa kiểm trạng thái từng điểm).

---

## 5. `docs/PWA-IPHONE.md` — mục "Danh sách kiểm trên iPhone thật" (dòng 33–43)

Cấu trúc tệp (tiêu đề cấp 2): Cách hoạt động (7) · Chưa làm (cố ý) (17) · Đã kiểm gì (25) · **Danh sách kiểm trên iPhone thật (33)** · Cách thử iPhone bằng D1 tạm (45) · Sau khi deploy (52) · Dựng lại icon (60) · Đổi tên hiển thị (71).

Nguyên văn mục cần bổ sung:

> ## Danh sách kiểm trên iPhone thật
>
> Xếp theo rủi ro: mục 1 là thứ Chrome headless không kiểm được và dễ hỏng nhất.
>
> 1. **Bàn phím:** mở app từ icon → `/order-form` → bấm vào ô "Tên khách" cho bàn phím hiện lên: nút "Lưu đơn nháp" (đang `position: sticky; bottom: 0`) còn thấy và bấm được không? iOS thu nhỏ vùng nhìn thấy mà không đổi khung bố cục nên nút có thể nằm sau bàn phím. Nếu bị che: đóng bàn phím rồi bấm được là chấp nhận được; nếu vẫn kẹt thì báo lại để đổi cách đặt nút.
> 2. Safari mở link → Chia sẻ → Thêm vào Màn hình chính: tên dưới icon là "Island Booking" (máy đã cài từ trước 24/9 còn "Tour Đảo" tới khi gỡ cài lại), icon là buồm vàng + thuyền xanh trên nền nâu đỏ, không có góc đen.
> 3. Mở từ icon: toàn màn hình, thanh trạng thái nền trắng (`theme_color` = `--c-status-bar`, `apple-mobile-web-app-status-bar-style` = `default`), chữ giờ/pin đọc được (kể cả ở màn hình đăng nhập).
> 4. Đăng nhập → thanh tab dưới đáy không đè lên thanh home; vào một đơn → nút "‹" quay lại danh sách; vuốt từ mép trái cũng quay lại.
> 5. Ô SĐT và ô tiền hiện bàn phím số.
> 6. Tắt hẳn app rồi mở lại: màn hình hiện gần như tức thì (khung từ cache), dữ liệu tải sau.
> 7. Tab Tôi → Đăng xuất về màn hình đăng nhập.

Điểm cần biết khi bổ sung:
- Đoạn ngay trên (dòng 31) ghi: thử iPhone thật 19/09 chỉ có lời "nhìn ổn", **chưa có kết quả từng mục**, danh sách chưa đánh dấu mục nào.
- Mục 1 còn gọi nút "Lưu đơn nháp"; nút chính hiện nay là "Lưu, chờ xác nhận" (đề bài 18/10 dòng 56), và form đã có thanh dính "Tổng + nút" thay vì nút trơn — mục này cần viết lại theo màn hiện tại.
- Dòng 13 của cùng tệp còn ghi cũ: "SALES 4 tab, ADMIN 6 tab, kế toán 3 tab…" và "Máy tính (>640px) giữ nguyên thanh điều hướng cũ" — tài liệu mô tả, thua mã (nguồn thật: `THANH_TAB` trong `src/shared/muc-giao-dien.ts`; chưa kiểm số tab hiện tại).
- Danh sách chưa có mục cho: nút "Hỗ trợ" nổi vs thanh dính cuối trang, bảng trượt trên bàn phím, hàng nhóm cuộn ngang bằng ngón cái, Face ID, thông báo màn hình khoá, tài xế (Cuốc của tôi, Chỉ đường).

---

## 6. `docs/AUDIT-2026-09-22-DOI-TAC.md` (hồ sơ có ngày 22/09)

- **Quy mô** (dòng 5): ~30 nhân viên nội bộ + đối tác ngoài tới ~1000 tài khoản — cộng tác viên (CTV), hướng dẫn viên bên ngoài, công ty du lịch; chủ kể thêm lễ tân khách sạn, lái cano (dòng 94).
- **Kết luận lúc đó** (dòng 18–22): nền tảng đủ cho ~10 người nội bộ, CHƯA đủ khi mở cho người ngoài; lỗ ở tầng mô hình quyền/tài khoản (D-01 P0: không tách dữ liệu giữa các bên).
- **Chủ quyết** (§4.1–4.5, dòng 89–140): CTV chỉ thấy đơn của mình, nhân viên thấy hết; đối tác tự lập đơn; đối tác thấy giá bán lẻ, ảnh xác nhận luôn là giá bán lẻ; **mỗi đối tác đúng 1 tài khoản**, Quản trị/Toàn quyền ngưng, đặt lại mã; CTV không tra hồ sơ khách theo SĐT; CTV sửa/xác nhận/huỷ đơn của mình; HDV/lái cano bên ngoài lập đơn được, không tự nhận việc ("xin nhận" rồi nhân viên duyệt); CTV chọn một HDV nội bộ hoặc để trống; **thí điểm 5 CTV trong 2 tuần** (dòng 129–139).
- **Điều quan trọng với người mới dùng** (rút từ D-04, D-07, D-08):
  - Tài khoản do Quản trị tạo, PIN trả cho Quản trị rồi chuyển tay qua chat (dòng 50); chưa có tự phục vụ quên PIN, chưa có phân cấp quản trị phía đối tác (dòng 66).
  - Phiên 7 ngày cố định; iOS tách cookie Safari và app đã cài nên phải đăng nhập lại một lần khi cài (cũng ở `PWA-IPHONE.md` dòng 22).
  - Bảng chọn người phụ trách sẽ thành 1000 tên và lộ tên đối tác khác (dòng 62–63).
  - Góp ý/báo lỗi của 1000 người dồn về một hai Quản trị (dòng 66).
- Các phần đã đổi sau ngày đó (ADR-0014 tài khoản đối tác, ADR-0074 xác thực hai lớp, ADR-0075/0085 phiên một máy, ADR-0027/0061 nhập tay): **chưa kiểm** từng điểm của báo cáo đã đóng hay chưa; đừng dùng báo cáo này làm hiện trạng.

---

## 7. Mâu thuẫn giữa các đợt

### Gốc rễ
Hệ thiết kế "Tour Đảo Booking — Design System" (`34f284df`) trên Claude Design **đã cũ so với `public/app.css`** nhưng vẫn là hệ mọi đề bài chỉ định: còn thân Nunito, nền `#eaf2f8`, viền `#d3e1ec`, thanh bên navy đậm 236px, thanh đầu điện thoại navy (`tao-don-2026-10-18/_ds/…/tokens/colors.css` dòng 19, 21; `…/tokens/typography.css` dòng 4; readme "Products"). Mã thật đã đổi: Be Vietnam Pro cho mọi chữ từ 30/09, nền `#f2f5f9` + viền `#e1e7ef` từ 1.70 (02/10), thanh đầu trắng từ 1.65, thanh bên nền trang (02/10) rồi 248px (15/10). Kết quả: đề bài 18/10 ghi đúng giá trị mới (dòng 105–108) mà bản vẽ vẫn trả giá trị hệ cũ (README tao-don dòng 7; ghi chú artboard 12 "Thanh bên máy tính và thanh trên điện thoại vẽ theo hệ thiết kế (nền xanh). Ảnh 14/10 cho thấy bản chạy thật đang dùng nền trắng — cần chốt một bên"). Chừng nào hệ trên Claude Design chưa cập nhật, mỗi đợt mới sẽ lặp lại độ lệch này.

### Từng trục

| Trục | Các quyết định khác nhau | Bằng chứng |
|---|---|---|
| Nền trang | trắng thuần (hệ tourdaovn) → `#F8FAFC` (bàn giao 21/09) → `#eaf2f8` (a2 19/09, hệ 34f284df, gop-y, thông báo, dot-3-7, bản vẽ tao-don 18/10) → `#f2f5f9` (app.css từ 1.70, menu 15/10, sổ công nợ, hoa hồng) | `mockup-by-ClaudeDesign/_ds/…/readme.md` mục Màu; `13 Tai lieu ban giao.dc.html` mục 2; `a2-mockup/PROMPT.md` dòng 41; `public/app.css` dòng 39–42 |
| Màu viền | `#E2E8F0` (21/09) · `#d3e1ec` (a2, hệ 34f284df, tao-don) · `#e1e7ef` (app.css, menu, sổ) · `#cbd5e1` (hoa hồng 25/10) | như trên; `hoa-hong-ho-tro-2026-10-25/ho-tro-ban-2.html` (12 lần `#cbd5e1`) |
| Phông | hai vai Be Vietnam Pro tiêu đề + Nunito nội dung (a2, 21/09, hệ 34f284df, tao-don bản vẽ, dot-3-7 Nunito toàn trang) · một phông Be Vietnam Pro (app.css từ 30/09, đề bài 18/10, menu, sổ, hoa hồng) · Times New Roman + JetBrains Mono (hệ "Travel ERP" trong so-cong-no `_ds`) | `public/app.css` dòng 3–7, 58–62; `van-chuyen-dot-3-7/Quản lý lịch xe bận.dc.html` (`font-family:'Nunito'`) |
| Cỡ chữ thân, giãn dòng | 17px / 1.68 (hệ tourdaovn; a2 đòi 16px nhưng giữ 1.68) · 16px / 1.5 (hệ 34f284df, app thật) · 15–17px (21/09) · 14px (hệ Travel ERP) | `mockup-by-ClaudeDesign/_ds/…/typography.css` dòng 18, 31; `van-chuyen-dieu-phoi/project/_ds/…/typography.css` dòng 10, 22; `a2-mockup/PROMPT.md` dòng 45 |
| Độ đậm | Be Vietnam Pro 700/800 cho tiêu đề, số (a2, 21/09, hệ 34f284df, bản vẽ tao-don) · "chữ thường, nét mảnh": ≤500, 600 chỉ số lớn nhất, bỏ 700/800 (Trang chủ máy tính 02/10, từ chốt 01/10) · đề bài tao-don 18/10 lại cho 400–700 | spec Trang chủ máy tính mục 3.3; `PROMPT-CLAUDE-DESIGN.md` dòng 106 |
| Chữ HOA nhãn nhóm | được, giãn .08em (a2, hệ 34f284df, tiêu đề mục trong khung danh mục tao-don 18/10) · cấm trong vùng nội dung Trang chủ (02/10) | `a2-mockup/PROMPT.md` dòng 45; spec Trang chủ máy tính mục 3.3; `Tao don thiet ke lai.dc.html` bảng token (`--ls-eyebrow`) |
| Nền thanh bên máy tính | navy đậm `#082f49` (hệ 34f284df, van-chuyen-1a, dieu-phoi, tao-don bản vẽ, đề bài 02/10 coi là "hiện tại") → chủ đòi "đổi thành màu nền toàn trang" 02/10 → mã: nền trang (`app.css` dòng 372); đặc tả thị giác 1.70 lại ghi "thanh trên + thanh bên nền trắng" → menu 15/10, sổ công nợ: nền `#f2f5f9` | `van-chuyen-dot-3-7/README.md` dòng 15; `2026-10-02-thi-giac-nen-tang-design.md` dòng 15. Mã thắng; câu "nền trắng" của 1.70 lệch mã |
| Bề rộng thanh bên | 236px (hệ 34f284df, đề bài 02/10, 1.70) → 248px (menu 15/10, app.css dòng 183) | `TaoDonForm.dc.html` (`width:236px`); `So Cong No v2.dc.html` (`width:248px`) |
| Thanh đầu điện thoại | navy, `theme-color` navy, `black-translucent` (a2, `pwa-shell-spec.md` Q9; hệ 34f284df) → trắng, `theme_color #ffffff`, kiểu `default` (từ 1.65) | `a2-mockup/refs/pwa-shell-spec.md` dòng 17, 36; SYSTEM-DESIGN dòng 1419; `app.css` dòng 368, 410 |
| Chiều cao thanh đầu | 52px (vỏ PWA đầu) → 60px (21/09, app.css dòng 126 "duyệt tăng từ 52px") | `public/app.css` dòng 126 |
| Chỗ nút "Tạo đơn" san hô | "+ Đơn mới" trên thanh đầu (21/09) · thanh công việc máy tính + vòng tròn giữa thanh tab điện thoại (hệ 34f284df, 1.70 "nút tròn + đặc san hô") · đứng đầu thanh bên (menu 15/10, `.sidebar-new` app.css dòng 1198) · "chỉ ở thanh trên, không nằm trong form" (tao-don 18/10) · đề bài 02/10: nút trên thanh trên | `menu-may-tinh-2026-10-15/…dc.html`; `Tao don thiet ke lai.dc.html` artboard 12 |
| Vị trí nút chính | dính đáy rộng hết (điện thoại) + góc phải tiêu đề (máy tính) (van-chuyen-1a) · cột phải dính (a2, tao-don) · thanh dính "Tổng + nút" thay khối Tóm tắt (tao-don điện thoại) · trong dòng danh sách ("Nhận việc", hoa hồng-hỗ trợ) | `van-chuyen-1a/README.md` dòng 28; `PROMPT-CLAUDE-DESIGN.md` dòng 58, 61 |
| Kiểu nút | nút chính navy, "Xác nhận đơn" san hô, phụ viền (a2) · nút viên thuốc, nền xanh nhạt, nét đứt cùng tồn tại (hiện trạng 14/10) · thang ba cấp, bỏ ba kiểu kia (tao-don 18/10) · bấm "lún 97%" (1.70) vs "không co/thu nhỏ" (hệ 34f284df "Press = brightness(.94). No scale/shrink") · cao 36/40px (menu 15/10) vs 44px (tao-don) | `PROMPT-CLAUDE-DESIGN.md` dòng 22, 56; thi-giac dòng 35; readme hệ 34f284df "Hover/press" |
| Nghĩa màu san hô | CHỈ hành động chốt + nhãn giá (a2, hệ 34f284df, app.css dòng 31) · san hô cho "hành động huỷ", tiền còn thiếu, banner lỗi, viền ô lỗi (bàn giao 21/09) · tiền còn thiếu nay là màu nguy hiểm đỏ (đề bài 02/10 mục 3.1), tao-don dùng `--c-accent-strong` cho số Tổng | `13 Tai lieu ban giao.dc.html` mục 2, 4, 6; `a2-mockup/PROMPT.md` dòng 42 |
| Màu "Đã huỷ" | xám "past" (a2) · san hô nhạt (21/09) · nền cát `#fbe3b3` (sổ công nợ 25/10) | `a2-mockup/PROMPT.md` dòng 44; `13 Tai lieu ban giao.dc.html` mục 4; `So Cong No v2.dc.html` bảng `TT` |
| Bo góc | 8/12/18/999 (a2, app.css) · thêm 14 "khung app" (21/09), 14 ô biểu tượng (02/10), 20 bo trên bảng trượt (21/09) vs 18 (hệ 34f284df) · 3/6/10 (Travel ERP) · 22px (hoa hồng) · token riêng 3/4/6px cho điều phối (app.css dòng 306–325) | các tệp trên |
| Bộ biểu tượng | 10 hình (21/09, "không thêm bộ icon") · 24 hình (hệ 34f284df) · ~29 hình (đề bài 02/10 mục 3.6) · +thùng rác, kính lúp MỚI (tao-don) · Lucide CDN (Travel ERP) | `13 Tai lieu ban giao.dc.html` mục 7 |
| Thẻ đơn | đúng 2 dòng (Đợt E 23/09) → 3 dòng khi có nơi đón (gop-y 30/09, chủ đồng ý giữ) · 9 trường theo thứ tự cố định (21/09) | `gop-y-2026-09-30/README.md` dòng 26, 35 |
| Bảng trên điện thoại | bảng → thẻ dưới 900px, không cuộn ngang (21/09) · trang admin vẫn cuộn ngang (`PWA-IPHONE.md` dòng 23) · bảng danh mục 1040 cuộn ngang (dua-don M7) | `13 Tai lieu ban giao.dc.html` mục 3 |

### Mâu thuẫn xuyên đợt (không phải về hình)
- **ADR-0135 (accepted 19/10) bỏ ô "Thanh toán trước" khỏi màn Tạo đơn**, nên artboard 8 (thanh toán, trả trước 2.000.000) và thanh dính "Trả trước…" của bản vẽ tao-don 18/10 lỗi thời ngay hôm sau. Cần đối chiếu mã hiện tại (chưa kiểm).
- **Chữ đã cấm 18/10** ("chặng", "xuất bến", "mốc 6 giờ", "Giữ đơn", "lần thu", "Trợ giúp") còn đầy trong bản vẽ dua-don, dieu-phoi, van-chuyen-1a, HDV và trong chính đề bài tao-don (dòng 52, 56, 119). Bản vẽ cũ không còn là nguồn chữ đáng tin; nguồn chữ là `src/shared/bang-tu-giao-dien.ts`.
- **Tên sản phẩm**: "Tour Đảo Booking" (a2, hệ 34f284df, tiêu đề màn Đăng nhập) vs "Island Booking System" (manifest từ 24/09, menu 15/10, thông báo).
- **Ngưỡng thanh bên**: ADR-0015 ghi ≥900px, mã 641px (lệch có chủ ý, SYSTEM-DESIGN §16); bàn giao 21/09 lại dùng 640/900px cho lớp phủ và bảng → thẻ.
- **Hệ lạ "Travel ERP"** trong `so-cong-no-2026-10-25/_ds` đỏ `#8B1E2D` trái hẳn bảng màu biển — nguy cơ bị dùng nhầm ở đợt sau.

### Chưa kiểm
Tôi không mở toàn bộ HTML lớn; giá trị lấy bằng tìm chuỗi (màu hex, `font-family`, bề rộng `nav`/`aside`). Chưa xem ảnh PNG. Chưa đối chiếu trạng thái từng đặc tả Đợt D, Đợt E, Trang chủ mới. Chưa kiểm số tab điện thoại hiện tại và chưa so mã thật với từng bản vẽ.
