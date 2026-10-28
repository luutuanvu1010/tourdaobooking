# Đặc tả đợt 0 — đưa khung chung vào mã (bản 1, 28/10/2026)

Trạng thái: **nháp chờ QA1**, chưa duyệt. Người soạn: Main session (vai lập kế hoạch và đặc tả, không thi công). Người đọc: phiên kiểm QA1 (chỉ đọc), rồi chủ dự án (tờ tóm tắt riêng, tối đa 3 câu), rồi phiên lập kế hoạch (`superpowers:writing-plans`) và phiên thi công. Đây là **việc lớn** theo `CLAUDE.md` §3 (chạm triển khai: cấu hình 404; chạm khung mọi trang): đặc tả → chủ duyệt → kế hoạch → thi công trên nhánh → kiểm độc lập → **cổng phát hành đợt 0** (bản local + tờ so sánh trước/sau) → chủ gộp → chủ phát hành.

## 0. Tóm tắt và phạm vi

Đợt 0 là bước 5 của `LO-TRINH.md` (Chặng 1, có hiệu lực sau cổng 1): **token + lớp thành phần dùng chung + khung chung, không vẽ lại màn nghiệp vụ nào**. Sau đợt này, mọi trang hiện có vẫn dùng thân trang cũ, nhưng cùng mang một vỏ mới: thanh trên một kiểu, thanh tab dưới theo bộ quyền, thanh bên 10 mục có phần giữa cuộn, chân dính thay thanh tab ở trang con, một dải trên trang, Trợ lý trên thanh trên, trang 403 / 404 / thiếu mã / mất mạng có vỏ, một hộp xác nhận thay hộp của hệ điều hành, một kiểu thông báo ngắn. Năm họ màn vẽ lại ở Chặng 3 sẽ đặt vào khung này.

**Trong phạm vi (10 khối):** T1 token mở rộng · K1 thanh trên · K2 thanh tab theo bộ quyền + trang mục lục Thiết lập · K3 thanh bên · K4 chân dính một kiểu · K5 dải trên trang · K6 Trợ lý lên thanh trên · S1 trạng thái hệ thống (hàm chung, 404 HTML, mất mạng) · L1 hộp xác nhận + thay `confirm()`/`alert()` · L2 thông báo ngắn một cơ chế · C1 lớp thành phần dùng chung (CSS + hai hình MỚI) · D1 tài liệu, kịch bản, nhật ký.

**Ngoài phạm vi (mục 9):** khung tải (ADR-0143) trừ khi chủ chọn gộp ở câu 1; thân các trang; 8 bảng trượt tự dựng; xác nhận trong trang; câu lỗi nghiệp vụ (câu 9 cổng 1); gộp lời gọi API; bộ nhớ dữ liệu khi mất mạng.

## 1. Nguồn sự thật và thứ tự ưu tiên khi lệch

1. Quyết định của chủ: `QUYET-DINH-CONG-1.md` (27/10), `QUYET-DINH-CONG-2A-2026-10-28.md`, `QUYET-DINH-CONG-2B-2026-10-28.md` (cùng thư mục `2026-10-27-danh-gia-ux-tong-the/`).
2. Đề bài số 1 mục 5 (quyết định vẽ) và Bàn giao: `PROMPT-CLAUDE-DESIGN-1-KHUNG-CHUNG.md`.
3. Bộ v2 bản 8 (token thật): `ds-v2/tokens.json` (bản chụp) và <https://claude.ai/artifact/R7vYe6PdU85WCSYkanWNP5>.
4. Bản vẽ khung chung (diện mạo, chữ mẫu): `docs/evidence/2026-10-28-claude-design-khung-chung/` + đối chiếu `DOI-CHIEU-KHUNG-CHUNG-2026-10-28.md`.
5. Đề cương `HE-THONG-HOP-NHAT.md` mục 3 (bảng thành phần × trạng thái) và mục 7 (token MỚI/BỎ).
6. Mã đang chạy ở `main` 431bb82f (bản đồ mã ở mục 13 và phụ lục A).

Lệch giữa các nguồn: quyết định thắng đề bài; đề bài thắng bản vẽ; token trong bộ v2 thắng số trong bản vẽ; chữ thật của máy chủ thắng chữ đề xuất; ADR đã duyệt thắng mọi thứ ở trên (ghi lại chỗ lệch, không tự vượt).

## 2. Quyết định đã chốt — không hỏi lại

| # | Nội dung | Nguồn |
|---|---|---|
| Q-1 | Mô hình điều hướng giữ: thanh tab dưới (≤ 899) + thanh bên 5 nhóm (≥ 900), trần 10 mục hiện sẵn, nhóm gập đếm là một | ADR-0015, cổng 1 câu 6 |
| Q-2 | Khổ 641–899 (iPad dọc) dùng bố cục điện thoại (phương án B); không thi công thanh bên gọn | cổng 2b câu 1 |
| Q-3 | Tiêu đề trang ở máy tính nằm trên thanh trên, 18/600, cắt một dòng (phương án A) | cổng 2b câu 2 |
| Q-4 | "+ Tạo đơn" chỉ ở hai chỗ: nút tròn san hô giữa thanh tab (điện thoại) và nút san hô góc phải thanh trên (máy tính); bỏ khỏi thanh bên | cổng 2a E1, đề bài 5.4–5.5 |
| Q-5 | Nút nổi Trợ lý chuyển lên thanh trên | cổng 1 câu 4 |
| Q-6 | Chân dính là thanh dính đáy duy nhất; trang con có chân dính thì không hiện thanh tab; nút cao 52 | đề bài 5.1, 5.6 |
| Q-7 | Dải trên trang: tối đa một, một dòng 44, ưu tiên bảo trì > thông báo quan trọng > nhắc bảo mật; nhớ "đã đọc" theo phiên; thông báo quan trọng vẫn bắt "Đã hiểu"; không hiện dải bảo mật ở biểu mẫu | cổng 1 câu 8, đề bài 5.3 |
| Q-8 | Bảo trì: Toàn quyền thấy dải; người khác đang mở phiên thấy lớp phủ đếm ngược + Đăng xuất (+ Thử lại); màn Đăng nhập có dải đếm ngược | đề bài 5.3, cổng 2b D |
| Q-9 | Một khuôn lớp phủ: bảng trượt từ đáy ≤ 640, hộp thoại giữa màn 520 từ 641; `Esc` đóng; hộp xác nhận một chiều nói hậu quả, nút nguy hiểm tách riêng | đề bài 5.7, cổng 2b C |
| Q-10 | Thông báo ngắn nền tối chữ trắng, tự tắt 3 giây, "Hoàn tác" màu cát, không đè chân dính | cổng 2a, đề bài 5.7 |
| Q-11 | Năm tông trạng thái kèm hình: Biển `history` · Xanh lá `check` · Cát `clock` · Đỏ `alertCircle` · Xám `minus` | cổng 2a E2 |
| Q-12 | Ba mốc 640 / 900 / 1200; nội dung tối đa 1280 căn giữa; vùng chạm 44; ô gõ 16; vành tiêu điểm 3 px | cổng 2a, đề bài 5.9 |
| Q-13 | Độ đậm 400 / 500 / 600 (nội dung / nhãn, nút / tiêu đề, số lớn) bằng token | cổng 1 câu 2 |
| Q-14 | Tiền ghi đủ "1.080.000 ₫" ở mọi khổ | cổng 1 câu 7 |
| Q-15 | Trang 404 chung: Worker/Assets trả HTML, chuẩn bị trên bản thử kèm kiểm tự động; lên production trong lần phát hành chủ duyệt | cổng 1 câu 10 |
| Q-16 | Câu lỗi nghiệp vụ nói sai lý do: chủ duyệt danh sách trước, làm ở đợt Chi tiết — **không trong đợt 0** | cổng 1 câu 9 |
| Q-17 | Khung tải (tách gói, nạp sẵn theo vai…): chỉ soạn ADR-0143 và đo; thi công sau khi chủ duyệt ADR bằng câu riêng | cổng 1 quyết định 3 |
| Q-18 | Cổng phát hành đợt 0: bản local + tờ so sánh trước/sau theo bộ đo Chặng 1, chủ duyệt rồi mới gộp và phát hành | cổng 2b mục B |
| Q-19 | Phím tắt máy tính `/` vào ô tìm, `Esc` đóng lớp phủ; `N` để sau | cổng 2a câu 2 |
| Q-20 | Token giữ tên theo mã (`--c-*`, `--fs-step-*`, `--s1…s7`…); tên tiếng Việt chỉ là tên hiển thị trong bộ | cổng 2a D1 |

## 3. Hai câu xin chủ (mặc định nếu không trả lời: theo đề xuất)

1. **Khung tải (ADR-0143) có gộp vào đợt 0 không?** *Đề xuất: không — tách thành đợt 0b, làm ngay sau khi chủ duyệt ADR-0143 và có số đo của bản đợt 0.* Lý do: ADR chưa duyệt; nó đổi cách phát hành và service worker (ADR-0035), đổi hành vi khi mất mạng; gộp vào đợt 0 làm đợt phình to và khó quy nguyên nhân khi so số đo. Mất gì nếu tách: sau đợt 0, mở trang lần đầu trên 4G chậm chưa nhanh lên rõ (chỉ bớt nhảy bố cục); phần nhanh lên thật đến ở đợt 0b.
2. **Trên điện thoại, mục "Thiết lập" ở thanh tab của Toàn quyền và Quản trị mở gì?** *Đề xuất: một trang mục lục mới `/thiet-lap` liệt kê các trang thiết lập người đó mở được (khuôn Thiết lập, một cột).* Cách khác: mở trang Tôi như nay (không có trang mới, nhưng trang Tôi đang gánh 20 dòng liên kết và không phải mục lục thiết lập). Mất gì nếu theo đề xuất: thêm một trang (công thức c), đợt 0 dài thêm khoảng nửa ngày.

## 4. T1 — Token mở rộng (`public/app.css` `:root`), theo expand–contract

Luật: **thêm tên mới, giữ tên cũ làm bí danh** (`--ten-cu: var(--ten-moi)`), không đổi giá trị nhóm "Bản sao từ tourdaovn" (dòng 27–38). Bỏ bí danh ở phát hành 2 (LO-TRINH bước 12). Mọi giá trị dưới đây lấy từ `ds-v2/tokens.json` bản 8; con số ghi ở đây để kiểm, tệp JSON thắng nếu lệch.

| Nhóm | Token thêm (MỚI) hoặc đổi (ĐỔI) | Ghi chú thi công |
|---|---|---|
| Chiều cao | MỚI `--h-control` 44, `--h-control-lon` 52 | 9 token cùng họ (`--tap-min`, `--counter-btn`, `--h-field`, `--h-field-wide`, `--h-hdv-btn`, `--h-hdv-act`, `--search-h`, `--row-h`, `--h-dp-tab`) **trỏ về** hai token này bằng bí danh, giữ tên |
| Lớp xếp | MỚI `--z-dinh` 10 · `--z-tab` 20 · `--z-bang-truot` 30 · `--z-phu` 40 · `--z-tren-cung` 50 | Thay 5 số cứng: topbar 20 → `--z-dinh`; tab 30 → `--z-tab`; `.sheet-root` 50 → `--z-bang-truot`; toast 40 → `--z-phu`; `.maint-screen` 60 và lối "Bỏ qua" → `--z-tren-cung`. Ba token lẻ `--z-ntf`, `--z-tl-fab`, `--z-tl-khung` trỏ về bậc gần nhất (ntf = `--z-phu`; tl-khung = `--z-bang-truot`; tl-fab bỏ cùng nút nổi) |
| Chuyển động | MỚI `--t-nhanh` 150ms, `--t-vua` 200ms; đường cong giữ `ease-out` | `--m-fast`, `--m-base` thành bí danh |
| Bo | MỚI `--bo-control` 8 (= `--radius-sm`) | nút, ô, chip |
| Bề rộng | MỚI `--w-noi-dung-max` 1280; `--w-ngan-chi-tiet` 360; `--w-cot-phai` 340; `--w-thiet-lap-max` 900; `--w-tim-thanh-tren` 280 và `--w-tim-thanh-tren-min` 160 | `--w-main` 1200 thành bí danh của `--w-noi-dung-max`; mốc 1400 riêng của Trang chủ bỏ (dùng 1200). Bốn token cuối là 4 trong 9 token bản vẽ đề xuất, đổi tên theo mã |
| Tab | MỚI `--h-tab-gach` 3, `--w-tab-mo-mep` 32 | hai biến thể Tab (mục 8) |
| Màu | MỚI `--c-mat-mang-bg` = `--c-sand-soft`; `--c-check-border` = `--c-text-muted`; `--c-switch-off-bg` = `--c-input-border-hover`; `--c-toast-bg` = `--c-primary-strong`; `--c-hoan-tac` = `--c-sand` | `--c-check-border` sửa lỗi tương phản viền ô chọn (B-VIEN-O-CHON-TUONG-PHAN, bảng gộp 28/10) |
| Đệm (từ Claude Design) | MỚI họ `dem` 14 token: `--pad-nut` 16, `--pad-o` 12, `--pad-chip` 12, `--pad-tab` 16, `--pad-huy-hieu-doc` 3, `--pad-huy-hieu-ngang` 8, `--pad-huy-hieu-bt` 6, `--pad-the` 16, `--pad-the-rong` 24, `--le-trang` 16, `--le-trang-rong` 32, `--nhip-khoi` 24, `--h-o-nhieu-dong` 96, `--vanh-cach` 2 | chỉ dùng trong lớp thành phần mới (mục 8) và khung; không sửa lớp cũ |
| Khung xương | MỚI `--skel-dong` 16, `--skel-so` 26, `--skel-vien` 96 | 14 token `--skel-*` cũ trỏ về ba token này |
| Tiêu điểm | ĐỔI `--focus-ring` 2 → 3 px; MỚI `--vanh-cach` 2 (offset) | bài `khung-dang-tai-css` / axe phải còn xanh |
| Độ đậm | ĐỔI tiêu đề và số lớn 500 → 600: `--fw-heading` = 600, `--fw-bold` = 600, `--fw-heavy` = 600; `--fw-semibold` giữ 500 cho nhãn, nút | `src/shared/giao-dien.ts`: `KEO_THEO` của núm `dam-nhan` hiện kéo `--fw-bold` và `--fw-heavy` — tách để núm "đậm nhãn" không kéo tiêu đề; `MAC_DINH` cập nhật; bài `giao-dien-mac-dinh.test.ts`, `token-giao-dien.test.ts` sửa có chủ đích |
| Khung | MỚI `--h-thanh-tren` 60 (điện thoại 56 nếu mã đang 56 — lấy số đang chạy), `--h-thanh-tab` 56, `--h-dai-tren` 44, `--w-thanh-ben` 248, `--h-muc-thanh-ben` 40, `--w-bang-truot` 520, `--w-toast` 360 | nếu đã có token cùng nghĩa (`--sidebar-w`, `--w-toast`…) thì giữ tên cũ làm bí danh |
| Mốc | không có token (CSS không nhận biến trong media query); ghi một dòng chú thích ở đầu `:root`: `/* mốc: 640 / 900 / 1200 */` và **dùng đúng ba mốc** cho mọi luật mới (max-width 640 / min-width 641; max 899 / min 900; min 1200). Không thêm luật mới ở 960, 1024, 1400, 720 | luật cũ ở các mốc lẻ giữ nguyên, dọn ở Chặng 3 |

Không thêm `--w-sidebar-gon` (phương án A bị loại). Không đổi tên 92 bí danh đang có. Mọi luật CSS mới nằm **sau dấu mốc PWA** của `app.css` (~875) và chỉ dùng token (bài `tests/e2e/pwa.mjs`).

## 5. Khung

### 5.1 K1 — Thanh trên (`web/shell.ts`, `#topbar`)

- Một thanh cho mọi trang trong, cao `--h-thanh-tren`, dính (`position: sticky`, `--z-dinh`), nền `--c-surface`, kẻ dưới `--c-border`.
- **Trái:** trang cấp một (là mục của thanh tab hoặc thanh bên) → logo nhỏ + tên ứng dụng (`APP_NAME`), không nút lùi; trang con → điện thoại: nút lùi `.bar-back` (vùng chạm 44); máy tính: đường dẫn **một cấp** "Trang cha › Tiêu đề". Trang cha lấy từ `cungSang` của bảng `TRANG` (`muc-giao-dien.ts`), không khai thêm ở shell.
- **Giữa:** tiêu đề 18 / 600 (`--fs-step-7`, `--fw-heading`), một dòng, cắt bằng "…" — chỗ duy nhất được cắt chữ. Nguồn tiêu đề giữ như nay (`data-title` → `nhanTheoDuong` → `APP_NAME`). Trang chủ giữ dải chào làm thanh trên (ngoại lệ đã có).
- **Phải, theo thứ tự:** ô "Tìm đơn" (chỉ máy tính ≥ 900, chỉ bộ `seesAllOrders` — giữ `THANH_TREN` như nay; rộng `--w-tim-thanh-tren`, co tới `--w-tim-thanh-tren-min` trước khi cắt tiêu đề; gợi ý "Tìm mã đơn, tên khách, SĐT…"; hiện `kbd` `/`) → **tối đa một nút chính** (máy tính: "+ Tạo đơn" san hô `--c-accent` cho bộ có `order.create`, là `THANH_TREN` `nut` hiện có; điện thoại không có nút này, Tạo đơn ở thanh tab) → chuông (`ganThongBao`, giữ) → **Trợ lý** (mục 5.6).
- Điện thoại: ở trang có ô tìm trong thân (Trang chủ, Đơn hàng), thanh trên không có ô tìm — như nay.
- Ở 1440: thân trang `max-width: var(--w-noi-dung-max)` căn giữa; thanh trên và thanh bên vẫn full chiều rộng.

### 5.2 K2 — Thanh tab dưới theo bộ quyền (`src/shared/muc-giao-dien.ts` `THANH_TAB`, `web/shell.ts` `tabBar`)

- Hiện ở ≤ 899 (gồm iPad dọc, quyết định Q-2), ẩn ở ≥ 900 và ở trang có chân dính (5.4). 4–5 mục, nhãn `--fs-step-1` 12 dưới biểu tượng, mục đang mở `aria-current="page"` nền `--c-primary-soft`; mục giữa là nút tròn san hô "+" cho Tạo đơn khi bộ có `order.create`; chừa `env(safe-area-inset-bottom)`.
- **Danh sách đích theo bộ quyền** (đề bài mục 6; là tiêu chí nghiệm thu, bài kiểm phải khoá đúng từng dòng):

| Bộ quyền | Thanh tab (trái → phải) |
|---|---|
| Toàn quyền, Quản trị | Trang chủ · Đơn hàng · **+ Tạo đơn** · Thiết lập · Tôi |
| Kế toán | Trang chủ · Đơn hàng · Sổ công nợ · Tôi |
| Bán hàng | Trang chủ · Đơn hàng · **+ Tạo đơn** · Danh bạ · Tôi |
| Thực tập, Đối tác | Đơn hàng · **+ Tạo đơn** · Hỗ trợ · Tôi |
| Hướng dẫn viên | Đơn hàng · Hỗ trợ · Hướng dẫn · Tôi |
| Nhân sự | Tài khoản · Hỗ trợ · Hướng dẫn · Tôi |
| Tài xế công ty | Trang chủ (tài xế) · Cuốc của tôi · Hỗ trợ · Tôi |
| Tài xế đối tác | Trang chủ (tài xế) · Cuốc của tôi · Báo bận · Hỗ trợ · Tôi |

- Cách khai: vẫn **một bảng `THANH_TAB` khai báo** với `chiKhi` theo **quyền** (không theo tên vai), theo luật của `muc-giao-dien.ts` ("không điều kiện nào ở shell"). Mục mới: Thiết lập (`/thiet-lap`, chỉ khi có `admin.manage`), Sổ công nợ (chỉ khi mở được `/so-cong-no` và không có `order.create`), Danh bạ (mở được `/parties`, có `order.create`, không có `admin.manage`), Hỗ trợ (`/feedback`, chỉ bộ **không** mở được Trang chủ văn phòng `/`), Hướng dẫn (`/help`, chỉ bộ không có Trang chủ, không có `order.create`, không phải tài xế). Mục bỏ: Dịch vụ (`dichVu`) và Tài khoản với bộ có Thiết lập (Tài khoản chỉ còn cho Nhân sự). Kế hoạch được chọn cách viết vị từ khác miễn bảng trên đúng cho cả 10 bộ (kiểm bằng `ma-tran-quyen.json`/`src/muc-giao-dien-hien-trang.json`).
- Mục chỉ hiện khi trang mở được (`coHien`/`moTrang` như nay). Trang không thuộc mục nào (403, 404, Hỗ trợ ở bộ có Trang chủ…) → **không sáng mục nào**, không mượn "Tôi" (sửa `sangTabToi` cho đúng luật: Tôi chỉ sáng ở `/account` và các trang `TRANG_TOI` không có `khongSangTabToi`).
- Ảnh hiện trạng `src/muc-giao-dien-hien-trang.json` chụp lại bằng `node scripts/chup-muc-giao-dien.mjs --ghi`; **đọc diff**: chỉ được thêm/bớt đúng các mục nêu trên, không mục nào "thấy thêm" ngoài danh sách (đó là nới quyền).

### 5.3 K2b — Trang mục lục Thiết lập `/thiet-lap` (câu 2 mục 3; làm nếu chủ không nói khác)

- Trang mới theo công thức c (`docs/CHANGE-GUIDE.md`): `public/thiet-lap.html`, `web/thiet-lap.ts`, `build:web`, `PAGES` + `PRECACHE`, một dòng `TRANG` (`duong: "/thiet-lap"`, tiêu đề "Thiết lập", `cungSang` = chính nó), dòng `GOI_CHINH`. Không thêm vào `THANH_BEN` (máy tính đã có nhóm THIẾT LẬP); đường dẫn vẫn mở được ở máy tính.
- Quyền: mở được khi có `admin.manage` (cùng điều kiện mục tab). Người khác: trạng thái 403 (mục 6).
- Nội dung (khuôn Thiết lập, một cột ≤ `--w-thiet-lap-max`): các nhóm `gom` của nhóm THIẾT LẬP trong `THANH_BEN` (đọc từ bảng, không chép tay), mỗi dòng là liên kết cao `--h-control` tới trang người đó mở được; nhóm rỗng ẩn. Không ô tìm (dưới 20 mục). Không thêm trang Tôi vào đây.
- Tab "Thiết lập" sáng khi đang ở `/thiet-lap` **và** ở mọi trang thuộc nhóm THIẾT LẬP (`cungSang`), để người dùng thấy mình đang trong Thiết lập.

### 5.4 K3 — Thanh bên (`sidebar`, `sidebarGroup`, `THANH_BEN`)

- Bỏ mục nổi bật `a.sidebar-new` ("Tạo đơn" `noiBat`) khỏi `THANH_BEN` (Q-4); bài `muc-giao-dien-menu-moi.test.ts` và `trang-chu-smoke.mjs` (đếm mục) sửa theo.
- "Đề nghị chuyển khách" chuyển vào nhóm gập **"Điều phối"** cùng "Điều phối xe" (dùng cơ chế `gom`/`moTu` sẵn có). Kết quả Toàn quyền hiện sẵn: Trang chủ · Đơn hàng · Danh bạ | Điều phối (gập) · Xe đang chạy · Xe & giấy tờ (gập) · Giá & chi phí (gập) | Điều chỉnh công nợ · Sổ công nợ & khoá sổ (gập) | Thiết lập (gập) = **10**. Các bộ khác theo bảng mục 6 của đề bài (trần 10 giữ).
- Bố cục: phần giữa (`HẰNG NGÀY` … `THIẾT LẬP`) cuộn riêng (`overflow: auto`), chân thanh bên (CHÂN MENU + người dùng + Đăng xuất) dính đáy, **không đè** mục cuối; thêm mờ mép dưới của vùng cuộn (mặt nạ, cao `--w-tab-mo-mep`) để báo còn mục; nhịp mục `--h-muc-thanh-ben` 40 (số đang chạy nếu khác thì giữ số đang chạy và ghi lại).
- Mục đang mở `aria-current="page"` + vạch trái 3 px `--c-focus` (như bản vẽ); mục gập đang đóng chứa trang đang mở → chấm Biển cạnh tên nhóm. Nhóm THIẾT LẬP mở sẵn theo `thietLapMoSan` như nay.
- Lối **"Bỏ qua tới nội dung chính"**: shell chèn `a.bo-qua` là phần tử bấm được đầu tiên của `body`, chỉ hiện khi nhận tiêu điểm (`:focus-visible`), `--z-tren-cung`, nhảy tới phần tử `main` (trang chưa có `main` thì shell gán `id="noi-dung"` cho khối thân đầu tiên sau `#strips` — kế hoạch kiểm 47 trang).
- Phím `/`: khi không ở trong ô gõ, đưa tiêu điểm vào ô "Tìm đơn" của thanh trên (nếu có); `Esc` đóng lớp phủ đang mở (đã có ở `moBangTruot`).

### 5.5 K4 — Chân dính một kiểu

- Thành phần mới `.chan-dinh` (CSS trong lớp thành phần, mục 8): dính đáy, nền `--c-surface`, kẻ trên `--c-border`, đệm `--le-trang`, nút cao `--h-control-lon` 52, chừa `env(safe-area-inset-bottom)`, `--z-dinh`; chứa một nút chính + một nút phụ ("Quay lại") hoặc hành động kế.
- **Luật thanh dính duy nhất:** trang có chân dính thì **ẩn thanh tab**. Cơ chế: `data-tabbar="off"` trên `body` (đã có, `order-form.html` dùng) → đợt 0 đặt thuộc tính này ở các trang có thanh dính đáy riêng: `chuyen-sua`, `cuoc-chuyen`, `xe-sua`, `xe-chi-tiet`, `xe`, `hoa-hong`, `chinh-sach-dieu-phoi` (`.vc-bottom-bar`), `giao-dien` (`.form-actions`), `feedback` khi mở luồng (`.ht-tra-loi`, đã tắt tab bằng `datThanhTab`), `so-cong-no` (`.scn-phep-tinh`), `dieu-phoi` (`.dp-nhieu`). Trang cấp một trong số này (Hoa hồng, Xe, Sổ công nợ, Điều phối ở điện thoại vào từ Tôi) vẫn ẩn tab khi có thanh dính — đúng Q-6.
- **Một kiểu nhìn:** năm lớp cũ (`.form-actions`, `.vc-bottom-bar`, `.ht-tra-loi`, `.scn-phep-tinh`, `.dp-nhieu`) **giữ tên** (bộ sinh `sinh-so-do-trang.mjs` và kho Trợ lý nhận diện theo tên) nhưng nhận chung một khối CSS với `.chan-dinh` (nền, kẻ, chiều cao nút, safe-area, z). Không đổi DOM của trang. Chuyển sang `.chan-dinh` thật ở Chặng 3 theo họ.
- Toast và lớp "Bỏ qua" không bao giờ nằm dưới chân dính (mục 7).

### 5.6 K5 — Dải trên trang (`#strips`)

- **Một chủ sở hữu** cho `#strips`: hàm tạo lười `stripsEl` của `shell.ts` là duy nhất; bản sao ở `thong-bao-ui.ts` (~41) gọi lại hàm của shell. Dải anh em (`dai-trang-anh-em.ts`) là điều hướng giữa trang cùng họ, **không** phải dải thông báo, giữ nguyên và không đếm vào "một dải".
- Bốn loại dải, cùng một thành phần `.dai[data-tong]` cao `--h-dai-tren` 44 một dòng (ở 390 câu dài xuống hai dòng thay vì cắt), hình + câu + một nút chữ: bảo trì (Biển, `history`, "Đang bảo trì, dự kiến xong HH:MM", nút "Xem" mở bảng trượt có nút tắt bảo trì cho Toàn quyền) · thông báo quan trọng (Cát, `clock`, nút "Xem" mở bảng trượt đọc đủ + "Đã hiểu" — giữ cơ chế ack của ADR-0045) · nhắc bảo mật hai lớp (Đỏ, `alertCircle`, nút "Bật ngay" + nút đóng) · ngoài mạng (Cát, `clock`, "Đang ngoài mạng — dữ liệu lần xem gần nhất", nút "Thử lại").
- **Tối đa một dải hiện**: thứ tự bảo trì > ngoài mạng > thông báo quan trọng > nhắc bảo mật (ngoài mạng xếp sau bảo trì vì lớp phủ/dải bảo trì đã nói máy chủ đóng). Dải thấp hơn chờ dải cao hơn đóng.
- Nhớ "đã đọc" theo phiên: đóng dải nhắc bảo mật → `sessionStorage` khoá `dai-bao-mat-da-dong`, không hiện lại trong phiên trình duyệt; thông báo quan trọng chỉ tắt sau "Đã hiểu" (API ack hiện có). Không hiện dải nhắc bảo mật ở trang biểu mẫu (`data-khuon="bieu-mau"` trên `body`, đợt 0 đặt cho `order-form`, `chuyen-sua`, `xe-sua`, `dieu-chinh-cong-no`, `chup-bu`, `ban`).
- Trang chủ: bỏ ngoại lệ ẩn `.maint-strip` và viên bảo trì trong dải chào (`.dash-hero-bao-tri`); dải hiện như mọi trang (một kiểu, theo bản vẽ K5·05). Luật CSS 415c83c4 (ô tìm nhường chỗ cho dải) giữ.
- Ô tìm của Trang chủ, nút nổi (không còn), khung xương không được đè dải.

### 5.7 Bảo trì (giữ mã, chỉnh chữ và vỏ)

- `maintenance-screen.ts` giữ: lớp phủ `role=alertdialog`, nền `inert`, đồng hồ đếm ngược, "Thử lại" + "Đăng xuất", hỏi lại mỗi 20 giây; diện mạo theo bản vẽ K5·03 (hình `history` trong vòng, câu "Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là HH:MM.", câu phụ "Khi hệ thống mở lại, tải lại trang để tiếp tục; phần chưa lưu trên trang này sẽ mất."). Không đóng bằng `Esc`.
- Đăng nhập: `showMaintenanceBanner` dùng thành phần `.dai` tông Biển cùng câu.
- Toàn quyền: dải bảo trì (5.6) thay `.maint-strip` riêng.

### 5.8 K6 — Trợ lý lên thanh trên (`web/tro-ly.ts`)

- Bỏ nút nổi `.tl-fab` và cơ chế nâng `--tl-nang`; thanh trên có nút biểu tượng `chat` "Trợ lý" (vùng chạm 44) ở cả hai khổ, mở khung `.tl-khung` như nay (không modal). Khung Trợ lý khi mở không đè chân dính và không che thanh tab (vị trí: trên chân dính/thanh tab ở điện thoại, góc dưới phải vùng nội dung ở máy tính).
- Hỗ trợ dùng hình `handset`-tương-đương đang có (nếu chưa có thì `phone`), Trợ lý dùng `chat` — một hình một nghĩa.
- ADR-0066/0069/0084 chỉ quy định việc của Trợ lý, không quy định vị trí nút; ghi một dòng "vị trí nút đổi theo cổng 1 câu 4" vào ADR-0084 phần ghi chú (không sửa quyết định).

## 6. S1 — Trạng thái hệ thống

### 6.1 Hàm chung `trangThaiHeThong` (tệp mới `web/trang-thai-he-thong.ts`)

`trangThaiHeThong(loai, tuyChon)` vẽ **vào thân trang** (giữ thanh trên, thanh tab/thanh bên) một trong các trạng thái, bằng `h()`, không `innerHTML`:

| `loai` | Vỏ | Thân | Nút |
|---|---|---|---|
| `403` | giữ; **không sáng mục nào**; không dựng ô tìm, bộ lọc, nút chính của trang | hình `ban`/`lock` trong vòng 56 + "Bạn không có quyền xem trang này." | "Về trang đầu của bạn" → `GOI_CHINH`/`start-page` |
| `404` | như 403 | "Không có trang này." + câu phụ "Địa chỉ có thể đã đổi hoặc gõ sai." | "Về trang đầu của bạn" |
| `thieu-ma` | giữ; mục cha sáng (trang con của Đơn hàng → Đơn hàng sáng) | "Thiếu mã <đối tượng>. Mở từ danh sách để xem đúng <đối tượng>." | "Về <trang cha>" |
| `mat-mang-chua-nap` | giữ; thanh tab dùng được | hình `history` + "Không có kết nối mạng" + "Trang này chưa mở lần nào trên máy nên chưa có dữ liệu để hiện. Kiểm tra Wi-Fi hoặc 4G rồi bấm Thử lại." + câu phụ "Nền tảng tự thử lại khi có mạng." | "Thử lại" (tải lại); tự thử lại khi `online` |
| `loi-may-chu` | giữ; vùng tìm/lọc **giữ chỗ** (không nhảy bố cục) | câu đúng lý do: thông điệp `ApiError.message` nếu có, nếu không "Máy chủ không trả lời. Thử lại sau ít phút." (hết giờ 45 s: "Máy chủ không trả lời trong 45 giây.") | "Thử lại" (gọi lại hàm tải của trang) |
| `rong` | giữ | hình nhỏ trong vòng 56 + một câu nói vì sao rỗng + **một** nút việc kế (do trang truyền) | theo trang |
| `dang-tai` | giữ | khung xương theo khuôn: `danh-sach` (dòng × 6), `chi-tiet` (thẻ tóm tắt + 2 khối), `bieu-mau` (nhãn + ô × 4), `bang-dieu-khien` (ô số × 4 + dòng × 3), `thiet-lap` (dòng × 5); dùng `--skel-*`; `aria-busy="true"`; không chữ "Đang tải…" trần | — |

- Trả về phần tử để trang gỡ khi có dữ liệu. Không chữ Anh, không JSON.
- **Áp trong đợt 0** (thay mã riêng): 403 ở `hoa-hong.ts`, `nguoi-ban.ts` (`CAU_KHONG_CO_QUYEN_XEM`), `lam-moi-logic.ts`, `viec-cua-toi.ts`; thiếu mã ở `order.ts`, `chuyen.ts`, `cuoc-chuyen.ts`, `xe-chi-tiet.ts` (sửa luôn C-CHI-TIET-THIEU-MA: thiếu mã báo thiếu mã, không báo lỗi mạng). `web/api.ts`: `ApiError` 403 ở lời gọi tải chính của trang → trang gọi `trangThaiHeThong("403")` (chuẩn chung; các trang còn lại chuyển ở Chặng 3, đợt 0 chỉ bốn trang trên + hai trang mới).
- Mục sáng: `tabBar`/`sidebar` đọc `body[data-trang-thai="403"|"404"]` để không sáng mục nào.

### 6.2 Trang 404 chung (Q-15)

- `public/404.html` + `web/khong-co-trang.ts` (gọi `initShell` rồi `trangThaiHeThong("404")`; khi chưa đăng nhập, `initShell` tự chuyển Đăng nhập như mọi trang). Thêm vào `PAGES`/`PRECACHE`/`build:web`; không có dòng `TRANG` (không lối vào).
- `wrangler.jsonc` `assets`: thêm `not_found_handling: "404-page"` để địa chỉ lạ **ngoài `/api/*`** được Workers Assets trả `/404.html` với mã 404. `/api/*` giữ JSON `not_found` (router). Kiểm `tests/e2e/pwa.mjs`: `GET /khong-co-trang-nay` → 404 + `text/html` + chứa tiêu đề; `GET /api/khong-co` → 404 + JSON. Kế hoạch kiểm phiên bản wrangler có hỗ trợ `not_found_handling`; nếu không, nhánh HTML ở `createApp` (router ~398) theo `Accept: text/html`.
- Đây là **đổi cấu hình triển khai**: chuẩn bị và kiểm trên bản thử; lên production trong lần phát hành đợt 0 mà chủ duyệt ở cổng phát hành.

### 6.3 Mất mạng

- **Trang chưa nạp** (không có trong bộ đệm SW): `web/sw/sw.ts` `staleWhileRevalidate` với `request.mode === "navigate"` và hết bộ đệm → trả trang `/ngoai-mang` (trang mới: `public/ngoai-mang.html` + `web/ngoai-mang.ts`, công thức c, nằm trong `PRECACHE`; thân là `trangThaiHeThong("mat-mang-chua-nap")`), thay cho `text/plain` 503. Tài nguyên khác hết bộ đệm vẫn 503 như nay. `isCacheable`/ba lớp chặn `/api` giữ.
- **Trang đã nạp**: khi lời gọi API lỗi mạng (`TypeError`/hết giờ) hoặc `navigator.onLine === false`: shell hiện dải ngoài mạng (5.6) + nút "Thử lại"; **giữ nội dung đã vẽ** (không xoá, không khung xương chạy); thanh tab dùng được; "Tải thêm"/nút gửi tắt kèm câu lý do; nghe `online` để tự gọi lại hàm tải của trang và ẩn dải. Nếu trang chưa kịp vẽ gì (mở trang đã có trong bộ đệm nhưng API lỗi) → thân là `trangThaiHeThong("loi-may-chu")` với câu mất mạng và nút Thử lại (không phải khung xương).
- **Không** lưu phản hồi API để hiện "dữ liệu lần xem gần nhất" khi mở lại trang ngoài mạng: đó là bộ nhớ dữ liệu, thuộc ADR-0143 / đợt 0b (ghi rõ trong tờ so sánh nếu chủ thử trường hợp này).
- Nhánh hiện nay ở `shell.ts` ~469 (`KHUNG_MAT_MANG` bốn tab + treo lời hứa) thay bằng: dựng khung tạm `layKhungNho()` (ADR-0035, giữ) + dải ngoài mạng + thân `mat-mang-chua-nap`.

## 7. Lớp phủ, hộp xác nhận, thông báo ngắn

### 7.1 L1 — Bảng trượt / hộp thoại (`web/bang-truot.ts` `moBangTruot`) và hộp xác nhận

- `moBangTruot` là khuôn duy nhất; CSS `.sheet*` giữ tên, chỉnh: điện thoại ≤ 640 trượt từ đáy có tay cầm; ≥ 641 hộp giữa màn rộng `--w-bang-truot` 520, chân canh phải; bóng `--shadow-overlay`; `--z-bang-truot`; dải lỗi ở đầu bảng khi gửi lỗi; nút chính quay khi `setBusy`.
- **Hộp xác nhận một chiều** — hàm mới `hoiXacNhan({ tieuDe, hauQua, nhanNguyHiem, nhanGiu, tong?: "do" })` trong `bang-truot.ts`, dựng trên `moBangTruot`, `role="alertdialog"`, trả `Promise<boolean>`: tiêu đề nêu việc ("Huỷ đơn TD-…?"), câu **nói hậu quả** (bắt buộc, do nơi gọi truyền), vòng cảnh báo tông Đỏ, nút nguy hiểm đỏ đặc **tách xa** nút giữ (điện thoại xếp dọc, nút giữ sát ngón cái; máy tính hai đầu); `Esc` = giữ. Không có nút "✕" thứ ba.
- **Thay toàn bộ `confirm()` (≈ 20 chỗ) và `alert()` (1 chỗ)** bằng `hoiXacNhan`/`moBangTruot`: `xac-nhan-don-ui`, `account`, `tro-ly-cai-dat`, `dieu-kien-xuat-ben`, `order` (2), `home` (confirm + alert), `staff` (6), `parties`, `catalog`. Câu hậu quả lấy từ chữ đang có của mỗi chỗ, không thêm luật; kế hoạch liệt kê từng chỗ với câu cũ → câu mới. Sau đợt 0, `npm test` có bài cấm `confirm(`/`alert(` trong `web/` (hàng rào mới, ghi `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật).
- 8 bảng trượt tự dựng (`trip-sheet`, `handler-sheet`, `booker-sheet`, `assignee-picker`, `viec-cua-toi`, `confirmation-dialog`, `thong-bao-ui`, `ho-tro-luong`) và xác nhận trong trang (`.maint-confirm`, `.ntf-confirm`, `.hs-xac-nhan`, `.xm-xac-nhan`, bấm lần hai) **không đụng** ở đợt 0: chuyển về khuôn ở Chặng 3 theo họ màn. Ghi nợ vào `docs/BACKLOG.md`.

### 7.2 L2 — Thông báo ngắn (`web/toast.ts`)

- Một thành phần `.toast` nền `--c-toast-bg`, chữ trắng, bo `--radius-md`, bóng `--shadow-float`, tối đa `--w-toast` 360, có hình theo tông (năm tông Q-11, mặc định Xanh lá `check` cho "đã xong"; Đỏ `alertCircle` chỉ cho "gửi chưa thành" không chặn trang), nút chữ "Hoàn tác" màu `--c-hoan-tac` khi có, nút đóng.
- `hienBaoNgan(cau, { tong?, hoanTac?: { nhan?, khiBam } })`: tự tắt sau **3 giây** (`TU_AN_MS_BAO_NGAN` = 3000); có "Hoàn tác" thì 5 giây và bấm được (`pointer-events` bật). `hienThongBao` (Bảng tin, bấm mở thông báo) dùng cùng thành phần, giữ 6 giây, tối đa 3 cái.
- Vị trí: điện thoại — đáy, **trên** chân dính hoặc thanh tab (đọc chiều cao thật của thanh đang hiện, không số cứng), `--z-phu`; máy tính — đáy vùng nội dung, căn giữa vùng nội dung, **không đè thanh bên**; trên bảng trượt khi bảng đang mở (z cao hơn `--z-bang-truot`). Bỏ quy tắc góc trên phải.
- Khoảng 20 câu "Đã lưu…" tại chỗ trong các trang: không đổi ở đợt 0 (Chặng 3).

## 8. C1 — Lớp thành phần dùng chung (CSS trong `public/app.css`, khối mới "Thành phần chung v2", sau dấu mốc PWA)

Mỗi thành phần **một tên lớp gốc + biến thể bằng thuộc tính** (`HE-THONG-HOP-NHAT.md` mục 3), chỉ dùng token, có đủ trạng thái cột ✔ của bảng mục 3 ở đề cương. Lớp cũ (`.btn`, `.chip`, `.badge`, `.card`, `.empty`, `.skeleton-*`…) **giữ nguyên**, trang chuyển sang lớp mới ở Chặng 3; đợt 0 chỉ dùng lớp mới ở khung, trạng thái hệ thống, hai trang mới, toast, hộp xác nhận.

| Lớp gốc | Biến thể | Ghi chú |
|---|---|---|
| `.nut` | `data-cap="chinh\|phu\|loi"`, `data-co="lon"`, `data-tong="san-ho\|nguy-hiem"`, `[disabled]` kèm `data-ly-do` hiện câu vì sao tắt, `data-ban="true"` vòng quay | cao `--h-control`/`--h-control-lon`, đệm `--pad-nut`, bo `--bo-control`, vành `--focus-ring`/`--vanh-cach`; chỉ `hover:hover` mới có rê |
| `.o` (ô nhập) + `.nhan` | `data-loai="chu\|so\|tien\|sdt\|ngay\|gio\|chon\|nhieu-dong"`, `[aria-invalid]` + `.o-loi` câu dưới ô | chữ 16, cao 44, đệm `--pad-o`, nhiều dòng tối thiểu `--h-o-nhieu-dong`; nhãn luôn thấy, "(tuỳ chọn)" sau nhãn |
| `.o-tich`, `.o-chon-mot`, `.cong-tac` | — | viền `--c-check-border` khi chưa chọn; công tắc tắt nền `--c-switch-off-bg` |
| `.chip` v2: `.vien` | `[aria-pressed]` | cao 44, đệm `--pad-chip`, bo `--radius-pill` |
| `.huy-hieu` | `data-tong="bien\|la\|cat\|do\|xam"` | 12/500, bo pill, **luôn có hình** theo Q-11, đệm `--pad-huy-hieu-*` |
| `.the` | `data-bam="true"` (rê, tiêu điểm), `data-loi` | nền `--c-surface`, viền `--c-border`, bo `--radius-md`, đệm `--pad-the`/`--pad-the-rong` |
| `.dong` | — | kẻ dưới 1 px, cao ≥ 44, đệm 12 × 16 |
| `.bang` | — | số canh phải, tiêu đề dính (`--z-dinh` trong vùng cuộn), hành động cột cuối |
| `.tab-phu` | `data-kieu="gach"` (máy tính, gạch `--h-tab-gach`) / `"vien"` (điện thoại, cuộn ngang, mờ mép `--w-tab-mo-mep` bằng mask) | `role="tablist"`; tab mặc định do trang chọn |
| `.dai` | `data-tong` | mục 5.6 |
| `.chan-dinh` | — | mục 5.5 |
| `.xuong` | `data-khuon` | mục 6.1; nhịp 1,2 s; `prefers-reduced-motion` tắt nhịp |
| `.rong` | — | mục 6.1 |
| `.toast` | `data-tong` | mục 7.2 |
| `.sheet*` (giữ tên) | — | mục 7.1 |
| `.bo-qua` | — | mục 5.4 |

- Hai hình MỚI vào `web/icons.ts`: `alertCircle` (vòng r 9 + chấm than, khung 24, nét 2) và `minus`; kiểm `history`, `clock`, `check`, `chat`, `ban`/`lock` đã có (kế hoạch liệt kê tên thật).
- Tài liệu lớp: thêm mục "Thành phần chung v2" vào `web/CLAUDE.md` (tên lớp, biến thể, token) và sửa dòng "thêm điều hướng ở `web/shell.ts`" thành "khai ở `muc-giao-dien.ts`".

## 9. Không làm trong đợt 0 (ghi để không ai "tiện tay")

Khung tải (tách gói, nạp sẵn theo vai, `modulepreload`, Speculation Rules, View Transitions) — chờ ADR-0143 · gộp lời gọi API · lưu phản hồi API để xem ngoài mạng · thân của 44 trang (họ màn, Chặng 3) · tiêu đề lặp hai lần trong thân trang · 8 bảng trượt tự dựng và các xác nhận trong trang · câu "Đã lưu" tại chỗ · câu lỗi nghiệp vụ (`order-errors.ts`, câu 9) · nhãn nổi Tạo đơn (đợt Biểu mẫu) · mật độ bảng · chế độ tối · đổi tên 460 token hay bỏ 92 bí danh (phát hành 2) · phím `N` · thanh bên gọn (loại) · tiêu đề tách dòng (loại) · tổng hoa hồng Đối tác (BACKLOG) · đổi quyền, API, dữ liệu, tiền (không có).

## 10. Tiêu chí nghiệm thu (hành vi kiểm được; mặc định cổng là KHÔNG ĐẠT nếu thiếu bằng chứng)

1. Với mỗi bộ quyền trong `ma-tran-quyen.json`, thanh tab ở 390 đúng **từng mục, từng thứ tự** bảng 5.2 (bài đơn vị mới `src/thanh-tab-theo-bo-quyen.test.ts`), và không bộ nào quá 5 mục.
2. Thanh bên ở 1040 của Toàn quyền hiện sẵn đúng 10 mục theo 5.4; không bộ nào quá 10; không còn `a.sidebar-new` (`muc-giao-dien-menu-moi.test.ts`; kịch bản `trang-chu-smoke.mjs`).
3. Ở 390, tại mỗi trang có thanh dính đáy (danh sách 5.5), **không** có thanh tab (đo `getComputedStyle(#tabbar).display === "none"`, không đọc thuộc tính); tại trang cấp một, có thanh tab và không có thanh dính.
4. Thanh trên: ở 1040, `.topbar-search` chỉ có với bộ `seesAllOrders`; nút "+ Tạo đơn" chỉ với bộ có `order.create` và chỉ một nút; không còn `.tl-fab` ở bất kỳ trang nào (grep DOM 47 trang × 10 bộ bằng `do-trang.mjs`).
5. Mở `/audit` với Bán hàng → 403 có vỏ, không mục nào `aria-current`, không `.topbar-search`, không bộ lọc; nút "Về trang đầu của bạn" tới đúng `GOI_CHINH`. Mở `/order` không `id` → câu "Thiếu mã đơn", mục Đơn hàng sáng.
6. `GET /khong-co-trang-nay` → 404 + HTML có vỏ; `GET /api/khong-co` → 404 JSON (`tests/e2e/pwa.mjs`).
7. Mất mạng: (a) trang chưa có trong bộ đệm → trang `/ngoai-mang` có vỏ + "Thử lại"; (b) trang đã mở, tắt mạng, bấm làm mới dữ liệu → dải ngoài mạng + nội dung cũ còn nguyên, không khung xương; bật mạng → dải tự ẩn (kịch bản Chrome mới `mat-mang-smoke.mjs` dùng CDP `Network.emulateNetworkConditions`).
8. Bảo trì: `v1-bao-tri.mjs` xanh với vỏ mới (dải Toàn quyền, lớp phủ, dải Đăng nhập), Trang chủ Toàn quyền hiện dải chứ không hiện viên.
9. `confirm(`/`alert(` không còn trong `web/` (bài kiểm mới, quan sát chặn thật: cố ý thêm một `confirm(` → đỏ → hoàn nguyên); `v1-xac-nhan-png.mjs` và 6 kịch bản chạm `staff`/`order`/`home` xanh.
10. Toast: `hienBaoNgan` tự tắt sau 3 s (bài đơn vị giả thời gian), có "Hoàn tác" thì gọi được `khiBam`; ở 390 đáy toast cao hơn mép trên của thanh tab/chân dính (hit-test).
11. Token: mọi token MỚI ở mục 4 có trong `:root`; 5 z-index cứng không còn (grep `z-index:\s*\d` ngoài `:root` sau dấu mốc PWA = 0); `giao-dien-mac-dinh`, `token-giao-dien`, `khung-dang-tai-css`, `goi-trang-nhe` xanh (shell to hơn phải còn dưới trần; nếu vượt, tách `trang-thai-he-thong.ts` nạp động — ghi trong kế hoạch).
12. axe (WCAG 2.1 A/AA) không lỗi nghiêm trọng ở 47 trang × bộ rộng nhất × 390 + 1040 (`do-trang.mjs`), tương phản viền ô chọn ≥ 3:1.
13. Tab 12 lần đầu ở 1040: lần 1 là "Bỏ qua tới nội dung chính", Enter nhảy vào `main` (`do-trang.mjs` đã đo thử Tab).
14. Phím `/` ở Đơn hàng 1040 (Toàn quyền) đưa tiêu điểm vào ô Tìm đơn; `Esc` đóng bảng trượt Lọc.
15. Không chữ Anh mới, không JSON lộ ở 403/404/mất mạng (bảng G của `tong-hop.md` chạy lại = 0 dòng mới).
16. Số đo tốc độ chạy lại bằng `do-toc-do.mjs` cùng điều kiện 27/10: FCP lạnh và "khung xong" **không xấu đi quá 5 %**; CLS lạnh ở hai trang mới và các trang dùng khung xương chung ≤ 0,1; chuyển trang vẽ ≤ 101 ms như nay. (Nhanh lên thật là việc của đợt 0b.)
17. `npm test`, `npm run typecheck`, `npm run build:web`, `npm run test:e2e -- pwa` xanh; `sinh-so-do-trang.mjs` sinh được với 2–3 trang mới; nhật ký `changelog.ts` có mục đợt 0 bằng lời thường qua `changelogProblems`.

## 11. Kiểm máy và kịch bản phải chạy lại (theo bảng `web/CLAUDE.md` mục 4 + đợt đánh giá)

- **Bài đơn vị sửa có chủ đích:** `muc-giao-dien-hien-trang` (chụp lại, đọc diff), `muc-giao-dien-menu-moi`, `muc-hien-mo-duoc-{1,2,3}`, `muc-giao-dien-gom`, `sw-policy` (3 trang mới), `trang-chu-o`/`trang-chu-may-tinh` (nếu ô tìm/viên bảo trì đổi), `giao-dien-mac-dinh`, `token-giao-dien`, `khung-dang-tai-css`, `goi-trang-nhe`, `khung-nho-web`, `so-do-trang` (sinh lại). **Bài mới:** `thanh-tab-theo-bo-quyen`, `trang-thai-he-thong` (DOM), `toast` (thời gian), `cam-confirm-alert` (grep), e2e 404/ngoai-mang.
- **Kịch bản Chrome (phải xanh):** `v1-bao-tri`, `quyen-thieu-quan-tri-smoke`, `trang-chu-smoke`, `xe-smoke`, `xe-chi-tiet-smoke`, `giay-to-nguoi-smoke`, `a2-smoke-*` (3), `v1-nguoi-phu-trach`, `v1-xac-nhan-png`, `v1-dang-nhap`, `dot-c-smoke`, `ho-tro-smoke`, `help-smoke`, `tai-xe-trang-dau-smoke`, `cuoc-smoke`; thêm `mat-mang-smoke` (mới).
- **Số đo trước/sau:** `docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/` — `may-chu.mjs` + `gieo-du-lieu.mjs` (cùng hạt giống `du-lieu-gieo-nhieu.json`) → `do-trang.mjs --nhan nhieu` (10 bộ × trang × 390/1040 + 403/404/mất mạng) → `do-toc-do.mjs` → `tong-hop.mjs`; kết quả vào `docs/evidence/<ngày>-dot-0-so-sanh/so-lieu/`, ảnh ở `~/tourdao-ux-dot-0/anh/` (ngoài kho, như 27/10). Kịch bản 27/10 là hồ sơ có ngày: **chép** sang thư mục mới rồi mới sửa (ví dụ đổi cổng), không sửa tại chỗ.

## 12. Cổng phát hành đợt 0 (Q-18) — làm gì, ai làm

1. Phiên thi công xong + QA2 (subagent kiểm độc lập chỉ đọc) đạt → phiên thi công dựng **bản local** cho chủ: `node scripts/dev-iphone.mjs` (D1 tạm, hai tài khoản 0900000001/0900000002 — thêm tài khoản Kế toán, Hướng dẫn viên, Tài xế đối tác vào hạt giống của script để đủ **ba bộ trở lên** theo cổng 2b; PIN in ra màn hình) và `wrangler dev` trên `localhost` (có service worker) để thử mất mạng; gửi chủ đường dẫn và danh sách 10 việc thử (mục 4 `LO-TRINH.md`, 8–15).
2. **Phiên kiểm độc lập** lập **tờ so sánh có ngày** `docs/evidence/<ngày>-dot-0-so-sanh/SO-SANH-TRUOC-SAU.md`: cùng 11 mặt (PROMPT mục 4), 10 bộ quyền, 45 trang; bảng từng mặt: số đo 27/10 ↔ số đo mới ↔ tốt lên / chưa đổi / xấu đi; ảnh cặp trước/sau 390 + 1040 cho 10 trang đại diện × 3 bộ; bảng C (403/404/mất mạng), E (chữ ký thành phần: đếm giảm), F (axe), G (chữ Anh), K (tốc độ). Số 27/10 lấy từ `so-lieu/` cũ, **không chụp lại production**.
3. Main session đọc duyệt tờ → đưa chủ bằng trang lời thường (≤ 3 câu: duyệt phát hành; điểm xấu đi nào chấp nhận; việc nào dời). Chủ "duyệt" → `npm run day-len -- dot-0-khung-chung` → `npm run trien-khai` (bước A.0 nhật ký, `kiem-phien-ban` trước/sau). Chưa duyệt thì nhánh không gộp.

## 13. Chạm gì ngoài bề mặt — phải ghi rõ

| Chỗ | Gì | Ai duyệt |
|---|---|---|
| `wrangler.jsonc` `assets.not_found_handling` | cấu hình triển khai (Q-15) | chủ, tại cổng phát hành |
| `web/sw/sw.ts` nhánh điều hướng hết bộ đệm → `/ngoai-mang` | hành vi service worker; **không** đổi điều 1 ADR-0035 (vẫn nạp sẵn mọi trang), chỉ đổi câu trả khi hết bộ đệm (ADR-0036/0039 ghi chú) | ghi vào ADR-0036 phần ghi chú; không cần ADR mới |
| `src/shared/muc-giao-dien.ts` `THANH_TAB`, `THANH_BEN`, `TRANG` | khai báo điều hướng; không đổi quyền (`permissions.ts` không chạm) | đặc tả này |
| `src/shared/giao-dien.ts` `KEO_THEO`, `MAC_DINH` | token mặc định (ADR-0087) | đặc tả này; ADR-0087 ghi chú |
| ADR-0084 (Trợ lý) ghi chú vị trí nút; ADR-0035 **không** sửa (ADR-0143 riêng) | — | chủ đã quyết cổng 1 câu 4 |
| `docs/SO-HANG-RAO.md` | dòng mới: bài cấm `confirm(`/`alert(`; bài khoá thanh tab theo bộ quyền | kèm ngày quan sát chặn thật |
| `docs/BACKLOG.md` | nợ: 8 bảng trượt tự dựng, xác nhận trong trang, "Đã lưu" tại chỗ, tiêu đề lặp, bỏ bí danh (phát hành 2), lớp nghi chết 28 | — |
| `web/CLAUDE.md` | mục "Thành phần chung v2"; sửa dòng "thêm điều hướng ở shell"; bảng kịch bản thêm `mat-mang-smoke` và hai trang mới | — |
| Không chạm: `permissions.ts`, API, D1, migration, cách tính tiền, `order-errors.ts` | — | — |

## 14. Điểm còn mơ hồ — kế hoạch phải chốt bằng cách đọc mã (không hỏi chủ)

1. Tên biểu tượng thật đang có cho `history`, `clock`, `chat`, `ban`/`lock`, điện thoại (Hỗ trợ) trong `web/icons.ts`; thiếu cái nào thì vẽ thêm, kê trong kế hoạch.
2. 47 trang có phần tử `main` chưa; nếu không, chọn khối thân thống nhất cho lối "Bỏ qua".
3. Chiều cao thanh trên/thanh tab đang chạy (token nào) để đặt `--h-thanh-tren`, `--h-thanh-tab` đúng số thật.
4. `wrangler` phiên bản hiện có hỗ trợ `not_found_handling: "404-page"` không; nếu không thì nhánh HTML ở router.
5. Trần `goi-trang-nhe` còn chỗ cho shell lớn hơn không; nếu không, tách `trang-thai-he-thong.ts` thành import động cho trạng thái hiếm (403/404/mất mạng).
6. Danh sách đúng 20 chỗ `confirm()` với câu cũ → câu hậu quả mới (chép chữ đang có; không thêm luật).
7. Cách bộ sinh `sinh-so-do-trang.mjs` nhận diện chân dính (`form-actions`/`vc-bottom-bar`): nếu đọc theo tên lớp thì thêm tên `.chan-dinh` vào bộ sinh để trang mới sau này được nhận diện.
8. Trang Hỗ trợ ở bộ có Trang chủ (TQ/QT/KT/BH) không có tab: mục sáng khi mở `/feedback` từ Tôi — theo luật "không mượn Tôi" thì không sáng mục nào; kế hoạch kiểm kịch bản `ho-tro-smoke` có đang trông đợi tab Tôi sáng không.

## Phụ lục A — Bản đồ mã dùng để soạn (28/10, main 431bb82f; phiên con chỉ đọc lập, Main session soát)

`web/shell.ts` (511 dòng): `initShell` ~372, `tabBar` ~49, `sidebar` ~304, `sidebarGroup` ~268, `sidebarItem` ~245, `stripsEl` ~74, `setMaintenanceStrip` ~83, `ganDaiNhacHaiLop` ~103, `thanhCongViec` ~436, `ganTroLy` ~495, `datThanhTab` ~504, `showError` ~508, nhánh mất mạng ~469; `data-title`/`data-back`/`data-tabbar` trên `body`. `src/shared/muc-giao-dien.ts` (377): `TRANG` ~58, `NHOM_THANH_BEN` ~149, `THANH_BEN` ~164, `THANH_TAB` ~209, `THANH_TREN` ~230, `TRANG_TOI` ~247, `coHien`/`moTrang`/`sangTai`/`sangTaiMuc`/`thanhBen`/`thietLapMoSan`/`nhanTheoDuong`/`sangTabToi`/`coKhungNho`/`KHUNG_MAT_MANG` ~284–377; `muc-giao-dien-goi.ts` `GOI_CHINH`; `muc-giao-dien-gom.ts`. `src/shared/sw-policy.ts`: `PAGES` 47, `PRECACHE`. `web/home.ts` (887): `dungDauTrang`, `renderSoDienThoai` ~723, `renderSoMayTinh` ~92, `renderViec` ~460, `ganOTim` ~702, `confirm`/`alert` ~335–340. `web/maintenance-screen.ts`: `showMaintenanceScreen` ~67, `renderMaintenanceMessage` ~25; `web/login.ts` `showMaintenanceBanner` ~147; `src/shared/maintenance.ts`. `web/bang-truot.ts` `moBangTruot` (30 tệp dùng); `.sheet*` app.css ~1551; 8 bản tự dựng; ≈ 20 `confirm()`, 1 `alert()`. `web/toast.ts` (50): `hienThongBao`, `hienBaoNgan`, `TU_AN_MS` 6 s, `.toast-vung`; app.css ~2199. `src/shared/router.ts` 403 ~426, 404 ~398; `wrangler.jsonc` `run_worker_first` ~29; `web/sw/sw.ts` `staleWhileRevalidate` ~99; `web/api.ts` `ApiError`, 45 s, 503 bảo trì ~176. `web/icons.ts` `SHAPES` 40 hình, `icon()` ~142. `public/app.css` (3913): `:root` 26–557 ≈ 470 biến (`c` 103, `w` 92, `fs` 56, `h` 34, `skel` 14, `z` 3), 92 bí danh, mốc 641/640 ×30, 900/899 ×40, 960 ×4, 1200 ×2; dấu mốc PWA ~875; ≈ 107 tiền tố lớp. `src/shared/giao-dien.ts`: `NUM` 26 núm, `KEO_THEO`, `CHA`, `MAC_DINH`. Kiểm: bài đơn vị và kịch bản liệt kê ở mục 11; `scripts/dev-iphone.mjs` cổng 8787, tài khoản 0900000001/0900000002; `may-chu.mjs` cổng 8795 D1 `~/tourdao-ux-2026-10-27-v2/d1`. ADR chi phối: shell 0007, 0015, 0022, 0034, 0035, 0036, 0040, 0046, 0066/0069, 0071, 0072, 0074, 0075, 0094; muc-giao-dien thêm 0017, 0038, 0049, 0053, 0055, 0057, 0079, 0087, 0111, 0115, 0128, 0136; sw-policy 0102; sw 0036, 0039; ADR-0143 proposed.
