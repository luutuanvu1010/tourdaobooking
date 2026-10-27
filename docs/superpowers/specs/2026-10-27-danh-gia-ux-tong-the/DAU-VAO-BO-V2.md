# Đầu vào dựng bộ "Island Booking System — Design System v2" (28/10/2026)

Hồ sơ có ngày, bước 2a của `QUYET-DINH-2026-10-28-AI-DUNG-BO-V2.md`. Mỗi dòng ghi nguồn: **từ mã** = chép nguyên từ `public/app.css` (khối `:root`, dòng 26–558), `web/icons.ts`, `public/fonts/`, `src/shared/giao-dien.ts`, `src/shared/app-info.ts` trên main 2847b6c2; **MỚI** = theo đề cương `HE-THONG-HOP-NHAT.md` đã duyệt cổng 1 và quyết định của chủ 27/10. Claude Design không được tự đặt giá trị ngoài tờ này; thiếu thì đề xuất và đánh dấu MỚI kèm lý do.

## 1. Tên, logo, phông (từ mã)

- Tên hệ thống: **Island Booking System** (`APP_NAME`); tên cài lên iPhone "Tour Đảo Booking". Chủ: Công ty TNHH Tour Đảo, Nha Trang.
- Logo: `public/icons/logo-96.png` (vuông, dùng 30×30 cạnh tên ở thanh trên và thanh bên); biểu tượng cài đặt `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`.
- Phông: **Be Vietnam Pro** tự lưu (`be-vietnam-pro-400/500/600/700/800.woff2`), dùng cho cả tiêu đề (`--font-display`) và nội dung (`--font`). Dự phòng: `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif`. Mã đơn, số kỹ thuật: `--font-mono: ui-monospace, Menlo, Consolas, monospace`.
- Toàn quyền đổi được phông ở "Giao diện công ty" (ADR-0087): Nunito, Lexend, Noto Sans (mỗi phông 400–700, cũng tự lưu). Bộ v2 thiết kế trên Be Vietnam Pro, nhưng mọi thành phần phải vẫn đúng khi đổi sang ba phông kia.

## 2. Tầng gốc: màu (từ mã, mã hex nguyên văn)

| Nhóm | Token | Giá trị | Dùng cho |
|---|---|---|---|
| Biển (thương hiệu, chép từ website tourdao.vn) | `--c-primary` | `#0c4a6e` | nút chính, chữ nhấn, tab đang chọn |
| | `--c-primary-strong` | `#082f49` | rê chuột đậm, nền tổng |
| | `--c-primary-soft` | `#dcebf6` | nền nhạt: tab/thanh bên đang chọn, huy hiệu "đang diễn ra", chip chọn |
| | `--c-primary-soft-hover` | `#c9def0` | rê chuột trên nền nhạt |
| | `--c-btn-primary-hover-bg` | `#0b5c84` | rê chuột nút chính |
| San hô (nhấn mạnh) | `--c-accent` | `#c0392b` | CHỈ "Xác nhận đơn để gửi khách" và nút "+ Tạo đơn" ở thanh trên |
| | `--c-accent-strong` | `#96271a` | rê chuột san hô |
| | `--c-accent-soft` | `#fef2f0` | nền nhạt san hô |
| Cát (chờ, cần làm) | `--c-sand` | `#f5a623` | số nổi bật trên nền tối |
| | `--c-sand-soft` | `#fbe3b3` | nền huy hiệu chờ |
| | `--c-sand-text` | `#5a4109` | chữ trên nền cát |
| | `--c-sand-border` | `#e9d3a4` | viền cát |
| Xanh lá (xong, tốt) | `--c-green-soft` | `#dcfce7` | nền huy hiệu xong |
| | `--c-green-text` | `#166534` | chữ xanh lá |
| | `--c-green-border` | `#a7e3bc` | viền xanh lá |
| Đỏ (lỗi, huỷ, quá hạn) | `--c-danger` | `#b01235` | nút nguy hiểm trong hộp xác nhận, viền ô lỗi |
| | `--c-danger-text` | `#8e0e2b` | chữ đỏ |
| | `--c-danger-soft` | `#fde9ee` | nền dải lỗi, huy hiệu huỷ |
| | `--c-danger-border` | `#f1c3cf` | viền đỏ nhạt |
| Đầm phá (tiêu điểm, chỉ báo) | `--c-lagoon` | `#0e7490` | ô số liệu vận chuyển |
| | `--c-lagoon-strong` | `#155e75` | nền tổng thứ hai |
| | `--c-lagoon-soft` | `#e0f2f7` | nền ô số liệu |
| | `--c-lagoon-vivid` | `#0891b2` | = `--c-focus`, `--c-indicator` (vành tiêu điểm 3px, vạch chỉ báo) |
| | `--c-focus-ring` | `rgba(8,145,178,.2)` | quầng tiêu điểm |
| Nền, chữ, viền | `--c-surface` | `#ffffff` | nền trang, thẻ (gộp `--c-card`, `--c-bg`) |
| | `--c-surface-alt` | `#f2f5f9` | nền phụ: thanh bên, khối, huy hiệu xám |
| | `--c-soft-hover` | `#f1f5f9` | rê chuột dòng |
| | `--c-text` | `#0f172a` | chữ chính |
| | `--c-text-muted` | `#475569` | chữ phụ, nhãn, huy hiệu xám |
| | `--c-text-inverse` | `#f8fafc` | chữ trên nền tối |
| | `--c-on-dark` | `#ffffff` | chữ trên nút chính, nền tổng |
| | `--c-placeholder` | `#94a3b8` | chữ gợi ý trong ô |
| | `--c-border` | `#e1e7ef` | viền thẻ, kẻ dòng (gộp `--c-line`) |
| | `--c-input-border` | `#c9d4e0` | viền ô nhập |
| | `--c-input-border-hover` | `#94a3b8` | viền ô khi rê |
| | `--c-scrim` | `rgba(15,23,42,.45)` | màn mờ sau bảng trượt, hộp thoại |
| | `--c-tabbar-glass` | `rgba(255,255,255,.86)` | nền thanh tab dưới (mờ kính) |
| Điểm lẻ còn dùng | `--c-summary-due` | `#fcd34d` | số "còn phải thu" trên nền tổng tối |
| | `--c-ntf-unread` | `#f4f9fd` | dòng thông báo chưa đọc |
| | `--c-xe-ban-bg` | `#fef3c7` | ô lịch xe bận |
| | `--c-tile-toi-bg` | `#fdf1d8` | ô số liệu "của tôi" |
| | `--c-tile-all-bg` | `#eef2f6` | ô số liệu "tất cả" |

Thanh trên và vỏ ngoài (`--c-bar-bg`, `--c-on-bar`, `--c-status-bar`) mặc định trắng/biển; Toàn quyền đổi được ở Giao diện công ty. Khoảng 60 token màu còn lại trong mã là bí danh trỏ về các giá trị trên (ví dụ `--c-sidebar-active → --c-primary-soft`), **không đưa vào bộ v2** (BỎ theo đề cương mục 7).

## 3. Tầng gốc: chữ, khoảng cách, bo góc, bóng, chuyển động (từ mã)

- Thang cỡ chữ 14 bậc `--fs-step-1…14`: 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 32 px. Ô nhập luôn ≥ 16 px (iPhone không phóng). Chiều cao dòng tiêu đề `--lh-heading: 1.16`; dòng nội dung 18/20/22/24 px theo cỡ.
- Độ đậm hiện tại: cả năm token (`--fw-medium`, `--fw-semibold`, `--fw-bold`, `--fw-heavy`, `--fw-heading`) = 500; `--fw-regular` = 400. **Chủ quyết 27/10 (MỚI): ba mức 400 nội dung / 500 nhãn, nút / 600 tiêu đề, số lớn.**
- Khoảng cách `--s1…--s7`: 4, 8, 12, 16, 24, 32, 48 px.
- Bo góc: `--radius-xs` 6, `--radius-sm` 8, `--radius-md` 12, `--radius-lg` 18, `--radius-pill` 999, `--radius-tile` 14. **MỚI: nút và ô dùng một bo 8 (`--bo-control`); viên thuốc 999 chỉ cho chip, tab, huy hiệu.**
- Bóng: `--shadow-card` `0 1px 2px rgba(15,23,42,.04), 0 3px 10px rgba(15,23,42,.05)`; `--shadow-card-hover` `0 2px 6px rgba(15,23,42,.06), 0 12px 28px rgba(15,23,42,.1)`; `--shadow-overlay` `0 16px 48px rgba(15,23,42,.18), 0 2px 8px rgba(15,23,42,.06)`; `--shadow-float` `0 4px 14px rgba(15,23,42,.12), 0 1px 3px rgba(15,23,42,.08)`; `--shadow-btn-solid` `0 1px 2px rgba(8,47,73,.22), 0 4px 14px rgba(12,74,110,.24)`.
- Chuyển động: `--ease-out: cubic-bezier(.22, 1, .36, 1)`. **MỚI: thang thời lượng `--t-nhanh` 150 ms, `--t-vua` 200 ms; `prefers-reduced-motion` đặt về 0.**
- Chiều cao: vùng chạm tối thiểu 44 (`--tap-min`); ô nhập 52 ở chân dính (`--h-field`); thanh trên 60 (`--bar-h`). **MỚI: `--h-control` 44, `--h-control-lon` 52 thay 9 token cùng họ.**
- **MỚI:** `--w-noi-dung-max` 1280 px ở khổ 1440; lớp xếp `--z-dinh` 10, `--z-tab` 20, `--z-truot` 30, `--z-phu` 40, `--z-tren-cung` 50.

## 4. Biểu tượng (từ mã, 40 cái, nét 2 px, lưới 24, không emoji)

`home, orders, plus, me, services, staff, back, next, lock, alert, close, check, contact-card, pin, history, chat, palette, doc-check, money, assign, clock, chart, handset, guests, face, help, bell, megaphone, userPlus, checkCircle, swap, filePlus, ban, truck, eye, chevron-down, resize, search, grid, trash` (đếm lại 28/10: bản đầu ghi 37 vì sót ba tên viết liền). Bo góc biểu tượng cài đặt `22.37%`. **MỚI: năm biểu tượng trạng thái** cho năm tông (đồng hồ, mũi tên vòng, dấu tích, dấu chấm than, dấu gạch) — chọn từ danh sách trên khi có (`clock`, `swap`, `check`, `alert`, `ban`) hoặc đề xuất thêm.

## 5. Cấu trúc bộ v2 (MỚI, theo đề cương mục 7)

Ba tầng: **gốc** (`--goc-*`: mục 2–4 ở trên) → **ý nghĩa** (`--c-surface`, `--c-border`, `--c-text`, `--c-primary`, năm tông trạng thái, `--c-focus`, `--h-control`, `--z-*`, chuyển động) → **thành phần** (`--nut-*`, `--the-*`, `--o-*`, `--huy-hieu-*`, `--bang-truot-*`, chỉ khi thành phần cần giá trị khác ý nghĩa). Tên token tiếng Việt không dấu như mã hiện có. Mỗi token một dòng công dụng.

## 6. Từ vựng trạng thái (MỚI, đề cương mục 5)

Một trạng thái = một chữ + một tông + một biểu tượng + một hình huy hiệu (12/500, bo 999, không viền, nền nhạt chữ đậm).

| Tông | Nền / chữ | Biểu tượng | Ví dụ trạng thái |
|---|---|---|---|
| Cát | `--c-sand-soft` / `--c-sand-text` | đồng hồ | Chờ xác nhận, Chưa xếp, Sắp hết hạn, Chưa ai nhận, Vé mới |
| Biển | `--c-primary-soft` / `--c-primary` | mũi tên vòng | Đang xử lý, Đang chạy, Đã xếp, Đã giao |
| Xanh lá | `--c-green-soft` / `--c-green-text` | dấu tích | Đã xác nhận, Hoàn tất, Còn hạn, Đã thu đủ, Vé xong |
| Đỏ | `--c-danger-soft` / `--c-danger-text` | chấm than | Đã huỷ, Từ chối, Hết hạn, Quá hạn, Giữ lại |
| Xám | `--c-surface-alt` / `--c-text-muted` | gạch ngang | Nháp, Ngưng dùng, Đã khoá, Không còn trong Sheet |

## 7. Thang nút ba cấp (MỚI, đề cương mục 6)

| Cấp | Hình | Khi dùng | Số lượng mỗi vùng |
|---|---|---|---|
| Chính | nền `--c-primary`, chữ `--c-on-dark`; san hô `--c-accent` chỉ cho "Xác nhận đơn để gửi khách" và "+ Tạo đơn" thanh trên | việc tiếp theo duy nhất của màn | tối đa 1 |
| Phụ | nền trắng, viền 1 px `--c-primary`, chữ primary; biến thể nguy hiểm: viền + chữ `--c-danger` | thay thế, huỷ, quay lại | nhiều |
| Lối nhỏ | không nền, không viền, chữ primary 500, gạch chân khi rê | "Xem tất cả", "+ Thêm …" trong khối | nhiều |

Cao 44 (52 ở chân dính điện thoại và Đăng nhập), bo 8, chữ 16/500, biểu tượng 20 trước chữ; nút tắt xám phẳng (không mờ) **kèm một dòng nói vì sao tắt**; nút đỏ đặc chỉ trong hộp xác nhận hành động một chiều.

## 8. Thành phần bắt buộc có trong bộ (MỚI, đề cương mục 3; mỗi thành phần: khi nào dùng, trạng thái, biến thể, người dùng truyền gì vào, bản xem trước)

Nút ba cấp × hai cỡ · Tab · Ô nhập (chữ, số, tiền, SĐT, ngày, giờ, chọn, nhiều dòng; nhãn luôn nằm trên ô, 14/500; "(tuỳ chọn)" sau nhãn, không dấu *; lỗi = viền đỏ + câu dưới ô + cách sửa) · Ô tích, ô chọn một, công tắc · Bộ đếm − / + · Chip (bấm được, cao 44) · Huy hiệu trạng thái (không bấm, năm tông, có biểu tượng) · Thẻ (nền `--c-surface`, viền `--c-border`, bo 12; thẻ bấm được có rê và tiêu điểm) · Dòng danh sách (kẻ dưới 1 px, đệm 12×16, cao ≥ 44) · Bảng máy tính (số canh phải, tiêu đề dính, cột hành động cuối, 3 dòng khung xương, rỗng có câu + nút) · Cụm Tìm + Lọc + Sắp xếp + Tải thêm ("Tải thêm 50"; rỗng: "Không khớp" + "Xoá lọc") · Bảng trượt điện thoại / hộp thoại máy tính (một khuôn, chân 1 chính + 1 phụ, bẫy tiêu điểm, dải lỗi đầu bảng) · Hộp xác nhận hành động một chiều (câu nêu hậu quả + nút nguy hiểm) · Dải thông báo ba tông (lỗi chặn, cảnh báo, thông tin; có biểu tượng + câu "chuyện gì / làm gì tiếp") · Báo xong ngắn (3 giây, không che việc, có "Hoàn tác" khi được) · Dải trên trang (một hình, ba tông: bảo trì, thông báo quan trọng, nhắc bảo mật; thu gọn được một dòng) · Đầu trang (một) · Thanh dính đáy (một) · Thanh trên, thanh tab dưới (4–5 mục), thanh bên (nhóm gập) · Khung xương (ba kiểu: dòng, số, viên) · Trạng thái rỗng (biểu tượng + câu + một nút việc tiếp) · Phân trang / tải thêm · Trang mất mạng (dải "Đang ngoài mạng — dữ liệu lần xem gần nhất" + Thử lại) · Trang không quyền / không có trang (một trang chung: biểu tượng + câu + "Về trang đầu").

Không có: nút nổi (Trợ lý lên thanh trên — chủ 27/10), nhãn nổi trong ô (chủ 27/10), chế độ tối, núm mật độ bảng (chủ 27/10: một mật độ).

## 9. Khổ màn hình (từ mã + đề cương mục 4)

Thiết kế ở **390** (iPhone, ngón cái), **1040** (máy tính thường), kiểm thêm **768** (iPad) và **1440** (nội dung tối đa 1280). Bảng cột chỉ từ ≥ 900; dưới đó là thẻ ba dòng.
