# Đặc tả đợt 0 — đưa khung chung vào mã (bản 3, 28/10/2026)

Trạng thái: **bản 3 sau QA1 lần 2**, chờ QA1 lần 3 (chỉ kiểm ba chỗ sửa) rồi chủ duyệt. Bản 1 (930781cd) bị QA1 lần 1 trả về: 3 CHẶN / 11 SỬA / 16 MƠ HỒ / 6 PHẠM VI → bản 2 (0b76a29a) xử lý hết; QA1 lần 2 soát 27 mã: 24 ĐẠT, 3 CHƯA (A1 danh sách trang có thanh dính; B2 giá trị thật của token chiều cao và khung xương; B8 số hình) + 4 ghi chú nội tại — bản 3 sửa hết; bảng tra ở phụ lục B. Người soạn: Main session (vai lập kế hoạch và đặc tả, không thi công). Người đọc: phiên kiểm QA1 (chỉ đọc) → chủ dự án (tờ tóm tắt riêng, lời thường, một câu hỏi) → phiên lập kế hoạch (`superpowers:writing-plans`) → phiên thi công. Đây là **việc lớn** theo `CLAUDE.md` §3 (chạm triển khai: cấu hình 404; chạm khung mọi trang): đặc tả → chủ duyệt → kế hoạch → thi công trên nhánh → kiểm độc lập (QA2) → **cổng phát hành đợt 0** (bản local + tờ so sánh trước/sau) → chủ gộp → chủ phát hành.

## 0. Tóm tắt và phạm vi

Đợt 0 là bước 5 của `LO-TRINH.md` (Chặng 1, hiệu lực sau cổng 1): **token + lớp thành phần dùng chung + khung chung, không vẽ lại màn nghiệp vụ nào**. Sau đợt này, 47 trang vẫn dùng thân cũ nhưng cùng mang vỏ mới: thanh trên một kiểu, thanh tab dưới theo bộ quyền, thanh bên 10 mục có phần giữa cuộn, thanh tab tự ẩn khi trang có thanh dính đáy, một dải trên trang, Trợ lý trên thanh trên, trang 403 / 404 / thiếu mã / mất mạng có vỏ, một hộp xác nhận thay hộp của hệ điều hành (áp mẫu ở 5 chỗ, hàng rào không tăng), một kiểu thông báo ngắn. Năm họ màn vẽ lại ở Chặng 3 sẽ đặt vào khung này.

**Trong phạm vi (11 khối):** T1 token mở rộng · K1 thanh trên · K2 thanh tab theo bộ quyền + K2b trang mục lục Thiết lập · K3 thanh bên (kèm nhóm gập Điều phối) · K4 chân dính một kiểu · K5 dải trên trang · K6 Trợ lý lên thanh trên · S1 trạng thái hệ thống (hàm chung, 404 HTML, mất mạng) · L1 hộp xác nhận · L2 thông báo ngắn · C1 lớp thành phần dùng chung + hai hình MỚI · D1 tài liệu, kịch bản, nhật ký, hạt giống tài khoản thử.

**Ngoài phạm vi (mục 9):** khung tải (ADR-0143) trừ khi chủ chọn gộp ở câu hỏi mục 3; thân các trang; 8 bảng trượt tự dựng; xác nhận trong trang; 15 chỗ `confirm()` còn lại; câu lỗi nghiệp vụ (câu 9 cổng 1); gộp lời gọi API; bộ nhớ dữ liệu khi mất mạng; phím `/`.

## 1. Nguồn sự thật và thứ tự ưu tiên khi lệch

1. Quyết định của chủ: `QUYET-DINH-CONG-1.md` (27/10), `QUYET-DINH-CONG-2A-2026-10-28.md`, `QUYET-DINH-CONG-2B-2026-10-28.md` (thư mục `2026-10-27-danh-gia-ux-tong-the/`; hồ sơ cổng 2b **nằm trên nhánh này**, chưa vào main — chủ gộp cùng đặc tả bằng một lệnh).
2. Đề bài số 1 mục 5 (quyết định vẽ) và Bàn giao: `PROMPT-CLAUDE-DESIGN-1-KHUNG-CHUNG.md`.
3. Bộ v2 bản 8 (token thật): `ds-v2/tokens.json` (248 token: 36 MỚI, 13 ĐỔI) và <https://claude.ai/artifact/R7vYe6PdU85WCSYkanWNP5>.
4. Bản vẽ khung chung (diện mạo, chữ mẫu): `docs/evidence/2026-10-28-claude-design-khung-chung/` + `DOI-CHIEU-KHUNG-CHUNG-2026-10-28.md`.
5. Đề cương `HE-THONG-HOP-NHAT.md` mục 3 (thành phần × trạng thái) và mục 7 (token MỚI/BỎ).
6. Mã đang chạy ở `main` 60aadbf9 (bản đồ mã: phụ lục A).

Lệch giữa các nguồn: quyết định thắng đề bài; đề bài thắng bản vẽ; token trong bộ v2 thắng số trong bản vẽ; chữ thật của máy chủ thắng chữ đề xuất; ADR đã duyệt thắng mọi thứ ở trên (ghi lại chỗ lệch, không tự vượt). **Một lệch đã biết:** biên bản 2B mục E (do Main session soạn) xếp phím `/` vào đợt 0, trong khi biên bản 2A câu 2 (chủ chốt) ghi "thi công sau đợt 0" — theo 2A: phím `/` **không** làm ở đợt 0 (`Esc` đã có trong `moBangTruot`, giữ).

## 2. Quyết định đã chốt — không hỏi lại

| # | Nội dung | Nguồn |
|---|---|---|
| Q-1 | Mô hình điều hướng giữ: thanh tab dưới (≤ 899) + thanh bên 5 nhóm (≥ 900), trần 10 mục hiện sẵn, nhóm gập đếm là một | ADR-0015, cổng 1 câu 6 |
| Q-2 | Khổ 641–899 (iPad dọc) dùng bố cục điện thoại (phương án B); không thi công thanh bên gọn | cổng 2b câu 1 |
| Q-3 | Tiêu đề trang ở máy tính nằm trên thanh trên, 18/600, cắt một dòng (phương án A) | cổng 2b câu 2 |
| Q-4 | "+ Tạo đơn" chỉ ở hai chỗ: nút tròn san hô trên thanh tab (điện thoại) và nút san hô góc phải thanh trên (máy tính); bỏ khỏi thanh bên | cổng 2a E1, đề bài 5.4–5.5 |
| Q-5 | Nút nổi Trợ lý chuyển lên thanh trên | cổng 1 câu 4 |
| Q-6 | Chân dính là thanh dính đáy duy nhất; thanh dính đang hiện thì thanh tab ẩn; nút cao 52 | đề bài 5.1, 5.6 |
| Q-7 | Dải trên trang: tối đa một, một dòng 44, ưu tiên bảo trì > thông báo quan trọng > nhắc bảo mật; nhớ "đã đọc" theo phiên; thông báo quan trọng vẫn bắt "Đã hiểu" (ADR-0034 điều 8); không hiện dải bảo mật ở biểu mẫu | cổng 1 câu 8, đề bài 5.3 |
| Q-8 | Bảo trì: Toàn quyền thấy dải; người khác đang mở phiên thấy lớp phủ đếm ngược + Đăng xuất (+ Thử lại); màn Đăng nhập có dải đếm ngược | đề bài 5.3, cổng 2b D |
| Q-9 | Một khuôn lớp phủ: bảng trượt từ đáy ≤ 640, hộp thoại giữa màn 520 từ 641 (hai ngoại lệ có tên: `.sheet-wide` 640, `.hk-sheet` 640 giữ); `Esc` đóng; hộp xác nhận một chiều nói hậu quả, nút nguy hiểm tách riêng | đề bài 5.7, cổng 2b C |
| Q-10 | Thông báo ngắn nền tối chữ trắng, tự tắt 3 giây, "Hoàn tác" màu cát, không đè chân dính | cổng 2a, đề bài 5.7 |
| Q-11 | Năm tông trạng thái kèm hình: Biển `history` · Xanh lá `check` · Cát `clock` · Đỏ `alertCircle` · Xám `minus` | cổng 2a E2 |
| Q-12 | Ba mốc 640 / 900 / 1200; nội dung tối đa 1280 căn giữa; vùng chạm 44; ô gõ 16; vành tiêu điểm 3 px | cổng 2a, đề bài 5.9 |
| Q-13 | Độ đậm 400 / 500 / 600 (nội dung / nhãn, nút / tiêu đề, số lớn) bằng token; ba núm độ đậm ở Giao diện công ty giữ | cổng 1 câu 2 |
| Q-14 | Tiền ghi đủ "1.080.000 ₫" ở mọi khổ | cổng 1 câu 7 |
| Q-15 | Trang 404 chung: trả HTML, chuẩn bị trên bản thử kèm kiểm tự động; lên production trong lần phát hành chủ duyệt | cổng 1 câu 10 |
| Q-16 | Câu lỗi nghiệp vụ nói sai lý do: chủ duyệt danh sách trước, làm ở đợt Chi tiết — **không trong đợt 0** | cổng 1 câu 9 |
| Q-17 | Khung tải: chỉ soạn ADR-0143 và đo; thi công sau khi chủ duyệt ADR bằng câu riêng | cổng 1 quyết định 3 |
| Q-18 | Cổng phát hành đợt 0: bản local + tờ so sánh trước/sau theo bộ đo Chặng 1, chủ duyệt rồi mới gộp và phát hành | cổng 2b mục B |
| Q-19 | Phím tắt máy tính `/`, `Esc`, `N`: thi công **sau** đợt 0 (`Esc` đóng lớp phủ đã có sẵn, giữ) | cổng 2a câu 2 |
| Q-20 | Token giữ tên theo mã; tên tiếng Việt chỉ là tên hiển thị trong bộ; không đặt tên mới cho thứ đã có tên | cổng 2a D1 |
| Q-21 | Mục "Thiết lập" ở thanh tab mở trang mục lục Thiết lập mới (đường dẫn mới) | cổng 2b mục E |
| Q-22 | Cột phải Chi tiết dính; huy hiệu Chi tiết ở điện thoại nằm trong thẻ tóm tắt; biểu mẫu máy tính có "Huỷ bỏ" + "Lưu" ở góc phải thanh trên — là việc của **Chặng 3** (họ Chi tiết, Biểu mẫu), không hỏi lại | cổng 2b C, D |

## 3. Một câu xin chủ (mặc định nếu không trả lời: theo đề xuất)

**Khung tải (ADR-0143) có gộp vào đợt 0 không?** *Đề xuất: không — tách thành đợt 0b, làm ngay sau khi chủ duyệt ADR-0143 và có số đo của bản đợt 0.* Lý do: ADR chưa duyệt; nó đổi cách phát hành và service worker (ADR-0035), đổi hành vi khi mất mạng; gộp vào làm đợt phình to và khó quy nguyên nhân khi so số đo. Mất gì nếu tách: sau đợt 0, mở trang lần đầu trên 4G chậm chưa nhanh lên rõ (chỉ bớt nhảy bố cục); phần nhanh lên thật đến ở đợt 0b.

## 4. T1 — Token mở rộng (`public/app.css` `:root`), theo expand–contract

Luật: thêm tên mới cho ý nghĩa chưa có tên; **không đặt tên mới cho thứ đã có tên** (Q-20); bí danh chỉ khi **giá trị bằng nhau** (`--ten-cu: var(--ten-moi)`); token cũ có giá trị khác thì **giữ giá trị**, ghi `docs/BACKLOG.md` để Chặng 3 quyết theo họ. Không đổi giá trị nhóm "Bản sao từ tourdaovn" (dòng 27–38). Bỏ bí danh ở phát hành 2 (LO-TRINH bước 12). Mọi giá trị dưới đây đối chiếu `ds-v2/tokens.json` bản 8; tệp JSON thắng nếu lệch. Mọi luật CSS mới nằm sau dấu mốc PWA (~875) và chỉ dùng token (`tests/e2e/pwa.mjs`).

| Nhóm | Thêm (MỚI) / đổi (ĐỔI) | Nguồn | Ghi chú thi công |
|---|---|---|---|
| Chiều cao | MỚI `--h-control` 44, `--h-control-lon` 52 | bộ | Bí danh theo giá trị thật trong `:root` (QA1 đã dò): bằng 44 → `--tap-min`, `--counter-btn` thành `var(--h-control)`; bằng 52 → `--h-field`, `--h-field-wide`, `--search-h`, `--h-hdv-btn` thành `var(--h-control-lon)` (ô gõ và ô tìm **cũ giữ 52**, không hạ xuống 44; `.o` mới cao 44 là lớp khác); khác giá trị → `--h-hdv-act` 48, `--row-h` 48, `--h-dp-tab` 40 **giữ** → BACKLOG (**3** token) |
| Lớp xếp | MỚI `--z-dinh` 10 · `--z-tab` 20 · `--z-truot` 30 · `--z-phu` 40 · `--z-tren-cung` 50 | bộ | Thay **5** số cứng: `#topbar` 20 → `--z-dinh`; `#tabbar` 30 → `--z-tab`; `.sheet-root` 50 → `--z-truot`; `.toast-vung` 40 → `--z-tren-cung` (bộ xếp toast cùng bậc dải/màn che bảo trì); `.maint-screen` 60 → `--z-tren-cung`; lối "Bỏ qua" → `--z-tren-cung`. Ba token lẻ: `--z-ntf` 45 → `var(--z-phu)`, `--z-tl-khung` 36 → `var(--z-phu)`, `--z-tl-fab` 35 bỏ cùng nút nổi. **Thứ bậc đổi:** hộp thông báo (40) sẽ nằm **trên** bảng trượt (30), nay là 45 < 50 — kế hoạch kiểm `thong-bao-ui.ts` có mở bảng trượt từ hộp thông báo không; nếu có thì hộp **đóng trước** khi bảng mở (một lớp phủ một lúc, Q-9), không chỉnh z. **16** số cứng còn lại sau dấu mốc PWA (`.fb-step-dot`, `.ht-tra-loi`, `.sidebar-group`, `.catalog-muc`, `body.trang-chu::before`, `.bell::before`, `.vc-bottom-bar`, `.vc-filters`, `.dp-*` ×5, `.xb-*`, `.buoc-*` ×2) **giữ nguyên**, ghi BACKLOG, dọn theo họ ở Chặng 3 |
| Chuyển động | MỚI `--t-nhanh` 150ms, `--t-vua` 200ms; đường cong giữ `ease-out` | bộ | `--m-fast` 180 / `--m-base` 300 **giữ** (bộ v2 cũng giữ riêng); lớp mới dùng `--t-*` |
| Bo | MỚI `--bo-control` 8 (= `--radius-sm`) | bộ | nút, ô, chip của lớp mới |
| Bề rộng | MỚI `--w-noi-dung-max` 1280 | bộ | `--w-main` 1200 → `var(--w-noi-dung-max)` (ĐỔI đã duyệt 2a); mốc 1400 riêng của Trang chủ bỏ |
| Bề rộng (từ bản vẽ) | MỚI `--w-ngan-chi-tiet` 360, `--w-cot-phai` 340, `--w-thiet-lap-max` 900, `--w-tim-thanh-tren` 280, `--w-tim-thanh-tren-min` 160 | **bản vẽ** (`DOI-CHIEU` §4), 7c đưa vào bộ | đợt 0 chỉ dùng `--w-thiet-lap-max` (trang `/thiet-lap`) và hai token ô tìm; hai token kia khai sẵn cho Chặng 3 |
| Tab (từ bản vẽ) | MỚI `--h-tab-gach` 3, `--w-tab-mo-mep` 32 | bản vẽ, 7c đưa vào bộ | hai biến thể Tab (mục 8) và mờ mép thanh bên |
| Màu | MỚI `--c-mat-mang-bg` = `--c-sand-soft`; `--c-check-border` = `--c-text-muted`; `--c-switch-off-bg` = `--c-input-border-hover`; `--c-toast-bg` = `--c-primary-strong` | bộ | **Luật hiện có** đổi token (không đổi DOM) để sửa lỗi thật B-VIEN-O-CHON-TUONG-PHAN ngay đợt 0 (QA1 đã dò): `.vc-radio-dot` viền `--c-border` (~2499, tương phản 1,25:1) → `--c-check-border`; `.dp-switch` nền tắt `--c-border` (~2637) và `.dd-switch-o .dp-switch` `--c-placeholder` (~3231) → `--c-switch-off-bg`; `.pick-mark` đã là `--c-text-muted`, giữ. Ô tích gốc (`.vc-check input`, `.ntf-*`) chỉ dùng `accent-color`, không có luật viền → **không làm gì** |
| Màu (từ bản vẽ) | MỚI `--c-hoan-tac` = `--c-sand` | bản vẽ, 7c | nút "Hoàn tác" trên nền tối |
| Đệm (từ Claude Design) | MỚI 14 token họ `dem`: `--pad-nut` 16, `--pad-o` 12, `--pad-chip` 12, `--pad-tab` 16, `--pad-huy-hieu-doc` 3, `--pad-huy-hieu-ngang` 8, `--pad-huy-hieu-bt` 6, `--pad-the` 16, `--pad-the-rong` 24, `--le-trang` 16, `--le-trang-rong` 32, `--nhip-khoi` 24, `--h-o-nhieu-dong` 96, `--vanh-cach` 2 | bộ | chỉ dùng trong lớp thành phần mới (mục 8) và khung |
| Khung xương | MỚI `--skel-dong` 16, `--skel-so` 26, `--skel-vien` 96 | bộ | 14 `--skel-*` cũ (QA1 đã dò): **bằng** → bí danh `--skel-md` 16, `--skel-num` 26, `--skel-pill` 96 (`--skel-money-mt` cũng 96 nhưng là lề trên, không phải chiều cao: kế hoạch quyết, mặc định **không** bí danh); **10** cái khác giá trị (`sm` 14, `title` 20, `tag` 22, `time` 48, `money` 56, `pill-mt` 112, `bar-mt` 40, `num-mt` 28, `time-mt` 56, `name-mt` 18) **giữ** → BACKLOG |
| Tiêu điểm | ĐỔI `--focus-ring` 2 → 3 px; MỚI `--vanh-cach` 2 | bộ | `khung-dang-tai-css` / axe còn xanh |
| Cỡ chữ (ĐỔI đã duyệt 2a) | `--fs-field` 17 → 16 (ô gõ 16 ở 8 chỗ); `--fs-h1` 1,5rem → `var(--fs-step-11)` 24; `--fs-h2` 1,1rem → `var(--fs-step-7)` 18 | bộ (13 ĐỔI) | làm ở đợt 0 vì chỉ là token; `--fw-home-stat` 700 tự theo công thức của `app.css` ~476, ghi một dòng kiểm |
| Độ đậm (ĐỔI) | `--fw-heading` 600, `--fw-bold` 600, `--fw-heavy` 600; `--fw-semibold` giữ 500 | bộ, cổng 1 | `src/shared/giao-dien.ts`: núm `dam-tieu-de` (`--fw-heading`) **kéo thêm** `--fw-bold`, `--fw-heavy`; núm `dam-nhan` chỉ kéo `--fw-semibold` (hiện kéo `--fw-bold`+`--fw-heavy` — tách); `MAC_DINH` cập nhật; bài `giao-dien-mac-dinh`, `token-giao-dien` sửa có chủ đích; ba núm chủ vẫn chỉnh được (Q-13) |
| Khung (đã có tên) | **không thêm**: dùng `--bar-h` 60, `--tabbar-h` 56, `--w-sidebar` 248, `--w-sheet` 520, `--w-toast` 360 đang có | mã = bộ | chiều cao thanh trên là 60 ở cả hai khổ (không ghi đè 56) |
| Dải | MỚI `--h-dai-tren` 44 | đề bài 5.3, 7c đưa vào bộ | chiều cao một dòng của `.dai` |
| Mốc | không có token (CSS không nhận biến trong `@media`); ba token mốc `moc-dien-thoai/may-tinh/rong` của bộ **chỉ là tài liệu** (7c ghi vậy); chú thích đầu `:root`: `/* mốc: 640 / 900 / 1200 */`; mọi luật mới dùng đúng ba mốc; luật cũ ở 960/1024/1400/720 giữ, dọn ở Chặng 3 | bộ | — |

Không thêm `--w-sidebar-gon` (phương án A bị loại; bộ ghi "chưa dùng" ở 7c). Không đổi tên 92 bí danh đang có.

## 5. Khung

### 5.1 K1 — Thanh trên (`web/shell.ts`, `#topbar`)

- Một thanh cho mọi trang trong, cao `--bar-h`, dính (`position: sticky`, `--z-dinh`), nền `--c-surface`, kẻ dưới `--c-border`.
- **Trái:** trang cấp một (là mục đang hiện của thanh tab hoặc thanh bên của người xem) → logo nhỏ + `APP_NAME`, không nút lùi; trang con → điện thoại: nút lùi `.bar-back` (vùng chạm 44); máy tính: đường dẫn **một cấp** "Trang cha › Tiêu đề". Trang cha lấy từ `cungSang` của bảng `TRANG`, không khai thêm ở shell.
- **Giữa:** tiêu đề `--fs-step-7` 18 / `--fw-heading` 600, một dòng, cắt bằng "…" — chỗ duy nhất được cắt chữ. Nguồn tiêu đề giữ (`data-title` → `nhanTheoDuong` → `APP_NAME`). Trang chủ giữ dải chào làm thanh trên (ngoại lệ đã có).
- **Phải, theo thứ tự:** ô "Tìm đơn" (chỉ ≥ 900, chỉ bộ `seesAllOrders` — giữ `THANH_TREN`; rộng `--w-tim-thanh-tren`, co tới `--w-tim-thanh-tren-min` trước khi cắt tiêu đề; gợi ý "Tìm mã đơn, tên khách, SĐT…"; **không** hiện `kbd` `/` vì phím `/` chưa làm) → **tối đa một nút chính** ("+ Tạo đơn" san hô `--c-accent`, máy tính, bộ có `order.create`, là `THANH_TREN` `nut` hiện có; điện thoại không có nút này) → chuông (`ganThongBao`, giữ) → **Trợ lý** (5.8).
- Điện thoại: trang có ô tìm trong thân (Trang chủ, Đơn hàng) thì thanh trên không có ô tìm — như nay.
- Ở ≥ 1200: thân trang `max-width: var(--w-noi-dung-max)` căn giữa; thanh trên và thanh bên vẫn full chiều rộng.

### 5.2 K2 — Thanh tab dưới theo bộ quyền (`src/shared/muc-giao-dien.ts` `THANH_TAB`, `web/shell.ts` `tabBar`)

- Hiện ở ≤ 899 (gồm iPad dọc, Q-2), ẩn ở ≥ 900 và **ẩn động khi thanh dính đáy đang hiện** (5.5). 4–5 mục, nhãn `--fs-step-1` 12 dưới biểu tượng, mục đang mở `aria-current="page"` nền `--c-primary-soft`; nút Tạo đơn là nút tròn san hô, **đứng thứ 3 khi có 5 mục, thứ 2 khi có 4 mục**; chừa `env(safe-area-inset-bottom)`.
- **Danh sách đích** (đề bài mục 6; tiêu chí nghiệm thu, bài kiểm khoá từng dòng):

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

- **Một bảng `THANH_TAB` khai báo, thứ tự duy nhất cho cả 10 bộ:** `trangChu` · `trangTaiXe` · `donHang` · `taiKhoan` · `taoDon` · `soCongNo` · `danhBa` · `thietLap` · `cuoc` · `ban` · `gopY` (Hỗ trợ) · `troGiup` (Hướng dẫn) · `toi`; mỗi dòng `chiKhi` theo **quyền**, không theo tên vai (luật `muc-giao-dien.ts`). Vị từ đề xuất (QA1 đã dò với `permissions.ts`): `taiKhoan` = mở được `/staff` **và không** `admin.manage`; `soCongNo` = mở được `/so-cong-no` và không `order.create`; `danhBa` = mở được `/parties`, có `order.create`, không `admin.manage`; `thietLap` = `admin.manage`; `gopY` = **không** mở được Trang chủ văn phòng `/` (tức TT, HDV, ĐT, NS, TX, TXĐT); `troGiup` = không Trang chủ, không `order.create`, không `chiTaiXe` (HDV, NS); `cuoc`/`ban` như nay; bỏ `dichVu`. Kế hoạch được đổi vị từ miễn bảng trên đúng cho cả 10 bộ (kiểm bằng `src/muc-giao-dien-hien-trang.json` và `docs/evidence/2026-10-27-danh-gia-ux-tong-the/ma-tran-quyen.json`).
- `gopY` và `troGiup` có `chiKhi` hẹp hơn quyền mở trang → bài `src/muc-hien-mo-duoc-*.test.ts` đòi kê "được mà ẩn" kèm lý do; **cho sẵn:** Hỗ trợ ẩn ở TQ, QT, KT, BH (có Trang chủ; vào Hỗ trợ qua Tôi và chân thanh bên); Hướng dẫn ẩn ở mọi bộ trừ HDV, NS (vào qua Tôi và chân thanh bên).
- Mục chỉ hiện khi trang mở được (`coHien`/`moTrang`). Trang không thuộc mục nào (403, 404, trang mở từ Tôi của bộ không có tab tương ứng…) → **không sáng mục nào**, không mượn "Tôi". **Sửa `sangTabToi`:** "Tôi" sáng ở `/account` và các trang `TRANG_TOI` không có `khongSangTabToi` **trừ** trang đã có tab riêng đang hiện cho người xem (tổng quát hoá `coTabCuoc` thành "tập tab đang hiện"): Kế toán ở `/so-cong-no` chỉ sáng Sổ công nợ; HDV/NS ở `/help` chỉ sáng Hướng dẫn; TQ ở 8 trang THIẾT LẬP chỉ sáng Thiết lập.
- Ảnh hiện trạng `src/muc-giao-dien-hien-trang.json` chụp lại (`node scripts/chup-muc-giao-dien.mjs --ghi`); **đọc diff**: chỉ thêm/bớt đúng các mục trên; mục "thấy thêm" ngoài danh sách là nới quyền → dừng.

### 5.3 K2b — Trang mục lục Thiết lập `/thiet-lap` (Q-21)

- Trang mới theo công thức c (`docs/CHANGE-GUIDE.md`): `public/thiet-lap.html`, `web/thiet-lap.ts`, `build:web`, `PAGES` + `PRECACHE`, một dòng `TRANG` (`duong: "/thiet-lap"`, tiêu đề "Thiết lập", `cungSang` = chính nó + mọi trang nhóm THIẾT LẬP để tab sáng), dòng `GOI_CHINH`. Không thêm vào `THANH_BEN` (máy tính đã có nhóm THIẾT LẬP); đường dẫn vẫn mở được ở máy tính.
- Quyền: mở được khi có `admin.manage` (= điều kiện mục tab). Người khác: trạng thái 403 (mục 6).
- Nội dung (khuôn Thiết lập, một cột ≤ `--w-thiet-lap-max`): **mỗi dòng = một mục THIẾT LẬP mà `thanhBen()` trả cho người đó** (15 mục phẳng của `THANH_BEN`, không có `gom`), liên kết cao `--h-control`, kèm số "lệch giá" nếu `trinhBay()` có; không ô tìm (< 20 mục). Không thêm trang Tôi vào đây.

### 5.4 K3 — Thanh bên (`sidebar`, `sidebarGroup`, `THANH_BEN`)

- Bỏ mục nổi bật `a.sidebar-new` ("Tạo đơn" `noiBat`) khỏi `THANH_BEN` (Q-4); bài `muc-giao-dien-menu-moi.test.ts` và `trang-chu-smoke.mjs` (đếm mục) sửa theo.
- **Nhóm gập con mới** (cơ chế chưa có; `gom` là một liên kết sáng theo nhiều đường, nhóm gập duy nhất hiện nay là THIẾT LẬP viết cứng ở `shell.ts` ~273): thêm trường `nhomGap?: { ma: "dieu-phoi"; nhan: "Điều phối" }` vào `ChoThanhBen`; `sidebarGroup` dựng nút gập `aria-expanded` + `aria-controls` cho mọi `nhomGap` (dùng chung với THIẾT LẬP, hết viết cứng); **mỗi mục con giữ `hien` riêng**; nhóm chỉ dựng khi ≥ 2 mục con hiện, 1 mục con thì hiện phẳng (Kế toán, Bán hàng thấy "Điều phối xe" không gập — đúng đề bài mục 6); nhóm gập đếm **1** vào trần 10; mở sẵn khi chứa trang đang mở. Áp cho "Điều phối xe" + "Đề nghị chuyển khách". Kết quả Toàn quyền: Trang chủ · Đơn hàng · Danh bạ | Điều phối (gập) · Xe đang chạy · Xe & giấy tờ (gập) · Giá & chi phí (gập) | Điều chỉnh công nợ · Sổ công nợ & khoá sổ (gập) | Thiết lập (gập) = **10**. Bài `muc-giao-dien-menu-moi.test.ts` (luật `gom` cùng điều kiện hiện) **không áp** cho `nhomGap`; thêm bài khoá "nhóm gập đếm 1, mục con lọc riêng". Ghi ở mục 13.
- Bố cục: phần giữa cuộn riêng (`overflow: auto`), chân thanh bên (CHÂN MENU + người dùng + Đăng xuất) dính đáy, **không đè** mục cuối; mờ mép dưới vùng cuộn (mặt nạ, cao `--w-tab-mo-mep`) báo còn mục; nhịp mục giữ số đang chạy.
- Mục đang mở `aria-current="page"` + vạch trái 3 px `--c-focus`; nhóm gập đang đóng chứa trang đang mở → chấm Biển cạnh tên nhóm. THIẾT LẬP mở sẵn theo `thietLapMoSan` như nay.
- Lối **"Bỏ qua tới nội dung chính"**: shell chèn `a.bo-qua` là phần tử bấm được đầu tiên của `body`, chỉ hiện khi `:focus-visible`, `--z-tren-cung`, trỏ phần tử `main` (47/47 trang đã có `<main>` — QA1 kiểm).

### 5.5 K4 — Chân dính một kiểu và luật "thanh dính duy nhất"

- Thành phần mới `.chan-dinh` (mục 8): dính đáy, nền `--c-surface`, kẻ trên `--c-border`, đệm `--le-trang`, nút cao `--h-control-lon` 52, chừa `env(safe-area-inset-bottom)`, `--z-dinh`; một nút chính + một nút phụ ("Quay lại") hoặc hành động kế.
- **Ẩn thanh tab ĐỘNG:** shell theo dõi (`MutationObserver` trên `hidden`/`class`/thêm-bớt nút) mọi phần tử khớp `.chan-dinh, .form-actions, .vc-bottom-bar, .vc-form-actions, .ht-tra-loi, .dp-nhieu` (kế hoạch kiểm thêm lớp chung `.thanh-hanh-dong-cuoi` đang có ở 10 tệp html + `chuyen.ts`, `cuoc-chuyen.ts`, `ho-tro-luong.ts`: dùng được nếu loại `.dp-run-end`, lớp này mang tên đó mà không dính); **khi có ít nhất một phần tử đang hiện thật** (`offsetParent !== null`) → `datThanhTab(false)` (lớp `body.tabbar-an`, `app.css` ~1152, đã có); hết → `datThanhTab(true)`. Trang luôn có thanh dính giữ/đặt `data-tabbar="off"` tĩnh để không chớp (**4 trang**, QA1 đã dò mã): `order-form` (đã có), `chuyen-sua` (`#cx-bottom` hiện ngay sau nạp), `xe-sua` (`#xe-bottom`), `giao-dien` (`.form-actions` tĩnh trong HTML). Trang có thanh dính **theo trạng thái** (`xe`, `hoa-hong`, `xe-chi-tiet`, `chinh-sach-dieu-phoi` — `.vc-bottom-bar` `hidden` lúc đầu; `cuoc-chuyen` — `#cc-day` ẩn khi tài xế không có việc kế và cả màn ẩn khi chuyến không còn mở; `dieu-phoi` — `.dp-nhieu` khi chọn nhiều; `feedback` — `.ht-tra-loi` khi mở luồng, đang gọi `datThanhTab`) **không** đặt thuộc tính tĩnh. `so-cong-no` **không có thanh dính ở ≤ 899** (`.scn-phep-tinh` chỉ `sticky` từ 1024), nên Kế toán ở trang cấp một của họ **luôn** có thanh tab.
- **Một kiểu nhìn:** các lớp cũ giữ tên (bộ sinh `sinh-so-do-trang.mjs` ~95 nhận diện `form-actions`/`vc-bottom-bar`; thêm `chan-dinh` vào bộ sinh) nhưng nhận chung khối CSS với `.chan-dinh` (nền, kẻ, chiều cao nút, safe-area, z). Không đổi DOM trang. Chuyển sang `.chan-dinh` thật ở Chặng 3.
- Toast, khung Trợ lý, lối "Bỏ qua" không nằm dưới thanh dính (mục 7).

### 5.6 K5 — Dải trên trang (`#strips`)

- **Một chủ sở hữu:** `stripsEl` của `shell.ts` là hàm tạo duy nhất; bản sao ở `thong-bao-ui.ts` (~41) gọi hàm của shell. Dải anh em (`dai-trang-anh-em.ts`) là điều hướng giữa trang cùng họ, **không** phải dải thông báo, giữ và không đếm.
- Bốn loại, một thành phần `.dai[data-tong]` cao `--h-dai-tren` 44 một dòng (ở 390 câu dài xuống hai dòng thay vì cắt), hình + câu + một nút chữ: bảo trì (Biển, `history`, "Đang bảo trì, dự kiến xong HH:MM", "Xem" mở bảng trượt có nút tắt bảo trì cho Toàn quyền) · thông báo quan trọng (Cát, `clock`, "Xem" mở bảng trượt đọc đủ + "Đã hiểu" — giữ cơ chế của ADR-0034 điều 8) · nhắc bảo mật hai lớp (Đỏ, `alertCircle`, "Bật ngay" + nút đóng; ADR-0074) · ngoài mạng (Cát, `clock`, "Đang ngoài mạng — dữ liệu lần xem gần nhất", "Thử lại").
- **Tối đa một dải hiện**: bảo trì > ngoài mạng > thông báo quan trọng > nhắc bảo mật. Chỗ "ngoài mạng" xếp thứ hai là **lựa chọn của Main session** (cổng 1 câu 8 chỉ xếp ba loại); đảo được bằng đổi thứ tự trong một mảng.
- Nhớ "đã đọc" theo phiên: đóng dải nhắc bảo mật → `sessionStorage` `dai-bao-mat-da-dong`; thông báo quan trọng chỉ tắt sau "Đã hiểu" (API hiện có). Không hiện dải nhắc bảo mật ở biểu mẫu: `body[data-khuon="bieu-mau"]`, đợt 0 đặt cho `order-form`, `chuyen-sua`, `xe-sua`, `dieu-chinh-cong-no`, `chup-bu`, `ban`.
- Trang chủ: bỏ cả hai viên bảo trì (`.dash-hero-bao-tri` ~699 và `.dash-dai-bao-tri` ~633 trong `home.ts`) và luật ẩn `.maint-strip`; dải hiện như mọi trang (K5·05). Luật 415c83c4 (ô tìm nhường chỗ cho dải) giữ. Ô tìm, khung xương không đè dải.

### 5.7 Bảo trì (giữ mã, chỉnh chữ và vỏ)

- `maintenance-screen.ts` giữ (`role=alertdialog`, nền `inert`, đếm ngược, "Thử lại" + "Đăng xuất", hỏi lại 20 s); diện mạo theo K5·03: hình `history` trong vòng, "Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là HH:MM.", câu phụ "Khi hệ thống mở lại, tải lại trang để tiếp tục; phần chưa lưu trên trang này sẽ mất." Không đóng bằng `Esc`.
- Đăng nhập: `showMaintenanceBanner` dùng `.dai` tông Biển cùng câu. Toàn quyền: dải bảo trì (5.6) thay `.maint-strip`.

### 5.8 K6 — Trợ lý lên thanh trên (`web/tro-ly.ts`)

- Bỏ nút nổi `.tl-fab` và cơ chế nâng `--tl-nang`; thanh trên có nút biểu tượng `chat` "Trợ lý" (vùng chạm 44) ở cả hai khổ, mở khung `.tl-khung` như nay (không modal, `--z-phu`). Khung khi mở nằm trên thanh dính/thanh tab ở điện thoại, góc dưới phải vùng nội dung ở máy tính; không che chân dính.
- Hỗ trợ dùng hình `handset`, Trợ lý dùng `chat`; 403 dùng `lock`.
- ADR chi phối Trợ lý là **ADR-0073 và ADR-0084** (0066/0069 không có tệp riêng, 0066 nằm ở đặc tả 30/9); chúng quy định việc, không quy định vị trí nút → ghi chú "vị trí nút đổi theo cổng 1 câu 4" vào ADR-0084, không sửa quyết định.

## 6. S1 — Trạng thái hệ thống

### 6.1 Hàm chung `trangThaiHeThong` (tệp mới `web/trang-thai-he-thong.ts`, **nạp động** `import()` từ shell/trang khi cần — xem 10.11)

`trangThaiHeThong(loai, tuyChon)` vẽ **vào `main`** (giữ thanh trên, thanh tab/thanh bên) bằng `h()`:

| `loai` | Vỏ | Thân | Nút |
|---|---|---|---|
| `403` | giữ; **không sáng mục nào**; không ô tìm, bộ lọc, nút chính của trang | hình khoá trong vòng 56 + "Bạn không có quyền xem trang này." | "Về trang đầu của bạn" → `GOI_CHINH`/`start-page` |
| `404` | như 403 | "Không có trang này." + "Địa chỉ có thể đã đổi hoặc gõ sai." | "Về trang đầu của bạn" |
| `thieu-ma` | giữ; mục cha sáng | "Thiếu mã <đối tượng>. Mở từ danh sách để xem đúng <đối tượng>." | "Về <trang cha>" |
| `mat-mang-chua-nap` | giữ; thanh tab dùng được | hình `history` + "Không có kết nối mạng" + "Trang này chưa mở lần nào trên máy nên chưa có dữ liệu để hiện. Kiểm tra Wi-Fi hoặc 4G rồi bấm Thử lại." + "Nền tảng tự thử lại khi có mạng." | "Thử lại"; tự thử lại khi `online` |
| `loi-may-chu` | giữ; vùng tìm/lọc **giữ chỗ** | `ApiError.message` nếu có, nếu không "Máy chủ không trả lời. Thử lại sau ít phút." (hết giờ: "…không trả lời trong 45 giây.") | "Thử lại" (gọi lại hàm tải của trang) |
| `rong` | giữ | hình trong vòng 56 + một câu vì sao rỗng + **một** nút việc kế (trang truyền) | theo trang |
| `dang-tai` | giữ | khung xương theo khuôn: `danh-sach`, `chi-tiet`, `bieu-mau`, `bang-dieu-khien`, `thiet-lap`; `--skel-*`; `aria-busy="true"`; không chữ "Đang tải…" trần | — |

- Trả phần tử để trang gỡ khi có dữ liệu. Không chữ Anh, không JSON. `loi-may-chu`, `rong`, `dang-tai`: đợt 0 **dựng + kiểm DOM**, dùng ở hai trang mới và nhánh mất mạng; trang khác chuyển ở Chặng 3.
- **Áp trong đợt 0** (thay mã riêng, đúng mẫu "mở trang bị 403"): `hoa-hong.ts` ~64, `nguoi-ban.ts` ~45 (`CAU_KHONG_CO_QUYEN_XEM`); thiếu mã: `order.ts` ~1689, `chuyen.ts` ~1286, `cuoc-chuyen.ts` ~986, `xe-chi-tiet.ts` ~21 (sửa luôn C-CHI-TIET-THIEU-MA). **Không** đụng `viec-cua-toi.ts` ~477 (403 của khối hàng chờ, ẩn khối có chủ đích) và `lam-moi-logic.ts` ~68 (tải lại nền màn cuốc, C55).
- Mục sáng: `tabBar`/`sidebar` đọc `body[data-trang-thai="403"|"404"]` để không sáng mục nào.

### 6.2 Trang 404 chung (Q-15)

- `public/404.html` + `web/khong-co-trang.ts` (`initShell` rồi `trangThaiHeThong("404")`); thêm `PAGES`/`PRECACHE`/`build:web`; không dòng `TRANG`.
- `wrangler.jsonc` `assets`: `not_found_handling: "404-page"` (wrangler 4.135.0 hỗ trợ — QA1 kiểm) để địa chỉ lạ ngoài `/api/*` được Workers Assets trả `/404.html` mã 404; `/api/*` giữ JSON. `tests/e2e/pwa.mjs`: `GET /khong-co-trang-nay` → 404 + `text/html`; `GET /api/khong-co` → 404 JSON. Đổi cấu hình triển khai → lên production trong lần phát hành đợt 0 chủ duyệt.

### 6.3 Mất mạng

- **Chỉ đường trong `PAGES` đi qua service worker** (`routeFor` trả "pass" cho đường lạ): "trang chưa nạp" = trang trong `PAGES` mà `cache.add` lúc cài hụt (`sw.ts` ~14, `allSettled`); địa chỉ lạ khi mất mạng ra trang lỗi của trình duyệt — chấp nhận.
- **Trang chưa nạp:** `staleWhileRevalidate` (`sw.ts` ~99–111) ở nhánh `refresh.catch`: nếu `event.request.mode === "navigate"` và không có bản trong bộ đệm → `cache.match("/ngoai-mang")` (trang mới: `public/ngoai-mang.html` + `web/ngoai-mang.ts`, công thức c, trong `PRECACHE`; thân `trangThaiHeThong("mat-mang-chua-nap")`), thay `text/plain` 503. Tài nguyên khác hết bộ đệm vẫn 503. `isCacheable`/ba lớp chặn `/api` giữ. Đây là đổi **câu trả khi hết bộ đệm**, không đổi điều 1–2 của ADR-0035 (vẫn nạp sẵn mọi trang, `/api/*` không vào cache). ADR-0035 tự quy định «thay đổi nội dung = ADR mới», nên **không ghi chú vào nó**: kế hoạch soạn **một ADR ngắn mới** (số kế tiếp trống, cấp sau khi grep mọi nhánh vì 0142 đang dùng ở nhánh khác và 0143 là khung tải) chỉ nói «điều hướng hết bộ đệm → `/ngoai-mang` thay 503 chữ trần», trạng thái *đề xuất*, chủ duyệt cùng cổng phát hành đợt 0; ADR-0143 vẫn riêng.
- **Trang đã nạp:** API lỗi mạng (`TypeError`/hết giờ) hoặc `navigator.onLine === false` → dải ngoài mạng (5.6) + "Thử lại"; **giữ nội dung đã vẽ**, không khung xương; thanh tab dùng được; nút gửi/"Tải thêm" tắt kèm lý do; nghe `online` → gọi lại hàm tải của trang, ẩn dải. Chưa kịp vẽ gì → thân `loi-may-chu` với câu mất mạng.
- **Không** lưu phản hồi API để xem "dữ liệu lần xem gần nhất" khi mở lại trang ngoài mạng (bộ nhớ dữ liệu: ADR-0143 / đợt 0b; tờ so sánh ghi rõ nếu chủ thử).
- Nhánh `shell.ts` ~469 (`KHUNG_MAT_MANG` bốn tab + treo lời hứa) thay bằng khung tạm `layKhungNho()` (ADR-0035) + dải ngoài mạng + thân `mat-mang-chua-nap`.
- Kịch bản `mat-mang-smoke.mjs` (mới) phải tạo được tình huống precache hụt (xoá một mục cache qua CDP `CacheStorage.deleteEntry`) rồi `Network.emulateNetworkConditions` offline.

## 7. Lớp phủ, hộp xác nhận, thông báo ngắn

### 7.1 L1 — Bảng trượt / hộp thoại (`web/bang-truot.ts` `moBangTruot`) và hộp xác nhận

- `moBangTruot` là khuôn duy nhất; CSS `.sheet*` giữ tên, chỉnh: ≤ 640 trượt từ đáy có tay cầm; ≥ 641 hộp giữa màn `--w-sheet` 520 (giữ ngoại lệ `.sheet-wide` 640 và `.hk-sheet` 640), chân canh phải; bóng `--shadow-overlay`; `--z-truot`; dải lỗi đầu bảng khi gửi lỗi; `setBusy` quay nút chính.
- **Hộp xác nhận một chiều** — hàm mới `hoiXacNhan({ tieuDe, hauQua, nhanNguyHiem, nhanGiu })` trong `bang-truot.ts`, dựng trên `moBangTruot`, `role="alertdialog"`, trả `Promise<boolean>`: tiêu đề nêu việc, câu **nói hậu quả** (bắt buộc), vòng cảnh báo tông Đỏ, nút nguy hiểm đỏ đặc **tách xa** nút giữ (điện thoại xếp dọc, nút giữ sát ngón cái; máy tính hai đầu); `Esc` = giữ; không nút "✕" thứ ba.
- **Áp mẫu ở 5 chỗ** (trang Trang chủ / Thiết lập, không tái cấu trúc): `home.ts` (`confirm` ~335 + `alert` ~340), `tro-ly-cai-dat.ts` (1), `dieu-kien-xuat-ben.ts` (1), `account.ts` (bật/tắt bảo trì, 1 trong số chỗ của tệp). Câu hậu quả chép từ chữ đang có, không thêm luật. **15 chỗ còn lại** (`order` 2–3, `parties` 2, `staff` 6, `catalog` 3 — có `confirm` trong biểu thức `&&` đồng bộ, phải tái cấu trúc, `xac-nhan-don-ui` 2, `account` phần còn lại) chuyển ở Chặng 3 theo họ. Hàng rào mới: bài đếm `confirm(`/`alert(` trong `web/` **không được tăng** so với số sau đợt 0 (ratchet), ghi `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật; kế hoạch đếm lại số thật (grep sơ bộ 28/10: ≈ 21 dòng kể cả chú thích).
- 8 bảng trượt tự dựng và xác nhận trong trang: **không đụng** ở đợt 0 (BACKLOG).

### 7.2 L2 — Thông báo ngắn (`web/toast.ts`)

- Một thành phần `.toast` nền `--c-toast-bg`, chữ trắng, bo `--radius-md`, bóng, tối đa `--w-toast` 360, hình theo tông (mặc định Xanh lá `check`; Đỏ `alertCircle` chỉ cho "gửi chưa thành" không chặn trang), nút chữ "Hoàn tác" `--c-hoan-tac` khi có, nút đóng.
- `hienBaoNgan(cau, { tong?, hoanTac?: { nhan?, khiBam } })`: tự tắt sau **3 giây**; có "Hoàn tác" thì 5 giây và bấm được. `hienThongBao` (Bảng tin) cùng thành phần, giữ 6 giây, tối đa 3 cái.
- Vị trí: điện thoại — đáy, **trên** thanh dính hoặc thanh tab đang hiện (đọc chiều cao thật), `--z-tren-cung`; máy tính — đáy vùng nội dung, căn giữa vùng nội dung, không đè thanh bên (bỏ quy tắc góc trên phải); **giữ** luật `body:has(.buoc-thanh) .toast-vung` (dưới thanh bước Tạo đơn, M-3). Trên bảng trượt khi bảng đang mở.
- ≈ 20 câu "Đã lưu…" tại chỗ: Chặng 3.

## 8. C1 — Lớp thành phần dùng chung (CSS `public/app.css`, khối mới "Thành phần chung v2" sau dấu mốc PWA)

Một tên lớp gốc + biến thể bằng thuộc tính (`HE-THONG-HOP-NHAT.md` mục 3), chỉ token, đủ trạng thái cột ✔ của bảng đề cương. Lớp cũ **giữ nguyên**; đợt 0 chỉ dùng lớp mới ở khung, trạng thái hệ thống, hai trang mới, toast, hộp xác nhận. Ngoại lệ có chủ đích: ba luật cũ của ô chọn một và công tắc đổi token (mục 4).

| Lớp gốc | Biến thể | Ghi chú |
|---|---|---|
| `.nut` | `data-cap="chinh\|phu\|loi"`, `data-co="lon"`, `data-tong="san-ho\|nguy-hiem"`, `[disabled]` + `data-ly-do`, `data-ban="true"` | cao `--h-control`/`--h-control-lon`, đệm `--pad-nut`, bo `--bo-control`, vành `--focus-ring`/`--vanh-cach`; chỉ `hover: hover` |
| `.o` + `.nhan` | `data-loai="chu\|so\|tien\|sdt\|ngay\|gio\|chon\|nhieu-dong"`, `[aria-invalid]` + `.o-loi` | chữ 16, cao 44, đệm `--pad-o`, nhiều dòng tối thiểu `--h-o-nhieu-dong`; nhãn luôn thấy |
| `.o-tich`, `.o-chon-mot`, `.cong-tac` | — | viền `--c-check-border`; công tắc tắt `--c-switch-off-bg` |
| `.vien` (chip) | `[aria-pressed]` | cao 44, đệm `--pad-chip`, bo `--radius-pill` |
| `.huy-hieu` | `data-tong="bien\|la\|cat\|do\|xam"` | 12/500, pill, **luôn có hình** (Q-11), đệm `--pad-huy-hieu-*` |
| `.the` | `data-bam`, `data-loi` | nền `--c-surface`, viền `--c-border`, bo `--radius-md`, đệm `--pad-the`/`--pad-the-rong` |
| `.dong` | — | kẻ dưới 1 px, cao ≥ 44, đệm 12 × 16 |
| `.bang` | — | số canh phải, tiêu đề dính, hành động cột cuối |
| `.tab-phu` | `data-kieu="gach"` (`--h-tab-gach`) / `"vien"` (cuộn ngang, mờ mép `--w-tab-mo-mep`) | `role="tablist"` |
| `.dai` | `data-tong` | 5.6 |
| `.chan-dinh` | — | 5.5 |
| `.xuong` | `data-khuon` | 6.1; nhịp 1,2 s; `prefers-reduced-motion` tắt |
| `.rong` | — | 6.1 |
| `.toast` | `data-tong` | 7.2 |
| `.sheet*` (giữ tên) | — | 7.1 |
| `.bo-qua` | — | 5.4 |

- Hai hình MỚI vào `web/icons.ts` (`SHAPES`, hiện **40** hình): `alertCircle` (vòng r 9 + chấm than, khung 24, nét 2), `minus`; `history`, `clock`, `check`, `chat`, `lock`, `handset` đã có sẵn (QA1 kiểm).
- Tài liệu: mục "Thành phần chung v2" vào `web/CLAUDE.md`; sửa dòng "thêm điều hướng ở `web/shell.ts`" thành "khai ở `muc-giao-dien.ts`".

## 9. Không làm trong đợt 0

Khung tải (chờ ADR-0143; câu hỏi mục 3) · gộp lời gọi API · lưu phản hồi API để xem ngoài mạng · thân của 47 trang (Chặng 3) · tiêu đề lặp hai lần trong thân · 8 bảng trượt tự dựng, xác nhận trong trang, 15 `confirm()` còn lại · câu "Đã lưu" tại chỗ · câu lỗi nghiệp vụ (câu 9) · nhãn nổi Tạo đơn (đợt Biểu mẫu) · cột phải Chi tiết dính, huy hiệu trong thẻ tóm tắt, "Huỷ bỏ"+"Lưu" ở thanh trên biểu mẫu máy tính (Chặng 3, Q-22) · mật độ bảng · chế độ tối · đổi tên 460 token hay bỏ 92 bí danh, 16 z-index cứng, 10 skel và 3 token chiều cao khác giá trị (phát hành 2 / Chặng 3) · phím `/`, `N` (Q-19) · thanh bên gọn, tiêu đề tách dòng (loại) · tổng hoa hồng Đối tác (BACKLOG) · đổi quyền, API, dữ liệu, tiền (không có).

## 10. Tiêu chí nghiệm thu (hành vi kiểm được; mặc định cổng KHÔNG ĐẠT nếu thiếu bằng chứng)

1. Với mỗi bộ quyền trong `docs/evidence/2026-10-27-danh-gia-ux-tong-the/ma-tran-quyen.json`, thanh tab ở 390 đúng **từng mục, từng thứ tự** bảng 5.2 (bài mới `src/thanh-tab-theo-bo-quyen.test.ts`); không bộ nào quá 5; Tạo đơn ở vị trí 3/5 hoặc 2/4.
2. Thanh bên 1040 của Toàn quyền hiện sẵn đúng 10 mục theo 5.4, nhóm Điều phối gập có 2 con; Kế toán thấy "Điều phối xe" phẳng; không còn `a.sidebar-new` (`muc-giao-dien-menu-moi`, bài mới "nhóm gập"; `trang-chu-smoke.mjs`).
3. Ở 390: khi thanh dính đang hiện thật (`offsetParent`), **không có `#tabbar` hoặc `display: none`**; khi không có thanh dính hiện, `#tabbar` hiện; Kế toán ở `/so-cong-no` luôn có thanh tab; Tài xế ở `cuoc-chuyen` khi không có việc kế vẫn có thanh tab (đo `getComputedStyle`, không đọc thuộc tính).
4. Thanh trên 1040: `.topbar-search` chỉ với bộ `seesAllOrders`; nút "+ Tạo đơn" chỉ với `order.create` và chỉ một; không còn `.tl-fab` ở 47 trang × 10 bộ (`do-trang.mjs`).
5. `/audit` với Bán hàng → 403 có vỏ, không `aria-current`, không `.topbar-search`, không bộ lọc; "Về trang đầu của bạn" tới `GOI_CHINH`. `/order` không `id` → "Thiếu mã đơn", mục Đơn hàng sáng. Kế toán ở `/so-cong-no` chỉ một mục sáng.
6. `GET /khong-co-trang-nay` → 404 + HTML có vỏ; `GET /api/khong-co` → 404 JSON (`pwa.mjs`).
7. Mất mạng: (a) precache hụt + offline + mở trang trong `PAGES` → `/ngoai-mang` có vỏ + "Thử lại"; (b) trang đã mở, offline, làm mới dữ liệu → dải ngoài mạng + nội dung cũ nguyên, không khung xương; online → dải tự ẩn (`mat-mang-smoke.mjs`).
8. Bảo trì: `v1-bao-tri.mjs` xanh với vỏ mới; Trang chủ Toàn quyền hiện dải, không viên.
9. `hoiXacNhan` dùng ở 5 chỗ mục 7.1; bài ratchet `confirm(`/`alert(` quan sát chặn thật (thêm một `confirm(` → đỏ → hoàn nguyên); `v1-xac-nhan-png` và kịch bản chạm `home`/`account` xanh.
10. Toast: `hienBaoNgan` tắt sau 3 s (bài giả thời gian), "Hoàn tác" gọi được `khiBam`; ở 390 đáy toast cao hơn mép trên thanh tab/chân dính (hit-test).
11. Token: mọi MỚI/ĐỔI ở mục 4 có trong `:root` đúng giá trị `tokens.json`; **5** số z-index ở mục 4 không còn (16 số còn lại nguyên); `.vc-radio-dot` dùng `--c-check-border`, hai luật công tắc dùng `--c-switch-off-bg`; `giao-dien-mac-dinh`, `token-giao-dien`, `khung-dang-tai-css` xanh. **Trần gói** `web/orders.ts` 96.700 byte (`goi-trang-nhe.test.ts`) **không nới**: `trang-thai-he-thong.ts` nạp động; kế hoạch đo gói sau mỗi khối; vượt thì dừng hỏi chủ (tiền lệ nới có lý do ADR-0120/0136 là việc của chủ).
12. axe (WCAG 2.1 A/AA) không lỗi nghiêm trọng ở 47 trang × bộ rộng nhất × 390 + 1040; tương phản viền ô chọn ≥ 3:1 ở trang có ô chọn (Thiết lập, Tạo đơn).
13. Tab lần 1 ở 1040 là "Bỏ qua tới nội dung chính", Enter vào `main` (`do-trang.mjs` thử Tab).
14. `Esc` đóng bảng trượt Lọc (giữ); không có xử lý phím `/` mới.
15. Không chữ Anh mới, không JSON lộ ở 403/404/mất mạng (bảng G chạy lại = 0 dòng mới).
16. `do-toc-do.mjs` cùng điều kiện 27/10: FCP lạnh và "khung xong" không xấu đi quá 5 %; CLS lạnh ở hai trang mới ≤ 0,1; chuyển trang vẽ ≤ 101 ms. (Nhanh lên thật là đợt 0b.)
17. `npm test`, `typecheck`, `build:web`, `test:e2e -- pwa` xanh; `sinh-so-do-trang.mjs` sinh được với 3 trang mới (`/thiet-lap`, `/404`, `/ngoai-mang`) và nhận diện `.chan-dinh`; `changelog.ts` có mục đợt 0 qua `changelogProblems`.

## 11. Kiểm máy và kịch bản phải chạy lại

- **Bài đơn vị sửa có chủ đích:** `muc-giao-dien-hien-trang` (chụp lại, đọc diff), `muc-giao-dien-menu-moi`, `muc-hien-mo-duoc-{1,2,3}` (kê "được mà ẩn" 5.2), `muc-giao-dien-gom`, `sw-policy` (3 trang mới), `trang-chu-o`/`trang-chu-may-tinh`, `giao-dien-mac-dinh`, `token-giao-dien`, `khung-dang-tai-css`, `goi-trang-nhe`, `khung-nho-web`; các bài đọc sơ đồ trang (`huong-dan`, `tro-ly`, `tro-ly-cau-truc`, `khoa-thang-hien-thi`) sau khi bộ sinh chạy. **Bài mới:** `thanh-tab-theo-bo-quyen`, `nhom-gap-thanh-ben`, `trang-thai-he-thong` (DOM), `toast` (thời gian), `ratchet-confirm-alert`, e2e 404/ngoai-mang.
- **Kịch bản Chrome (phải xanh):** `v1-bao-tri`, `quyen-thieu-quan-tri-smoke`, `trang-chu-smoke`, `xe-smoke`, `xe-chi-tiet-smoke`, `giay-to-nguoi-smoke`, `a2-smoke-*` (3), `v1-nguoi-phu-trach`, `v1-xac-nhan-png`, `v1-dang-nhap`, `dot-c-smoke`, `ho-tro-smoke`, `help-smoke`, `tai-xe-trang-dau-smoke`, `cuoc-smoke`; mới `mat-mang-smoke`.
- **Số đo trước/sau:** chép `docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/` sang `docs/evidence/<ngày>-dot-0-so-sanh/kich-ban/` (hồ sơ có ngày không sửa tại chỗ) → `may-chu.mjs` + `gieo-du-lieu.mjs` (hạt giống `du-lieu-gieo-nhieu.json`) → `do-trang.mjs --nhan nhieu` → `do-toc-do.mjs` → `tong-hop.mjs`; số liệu vào `so-lieu/`, ảnh ở `~/tourdao-ux-dot-0/anh/`.

## 12. Cổng phát hành đợt 0 (Q-18)

1. Thi công xong + QA2 đạt → **bản local** cho chủ: `node scripts/dev-iphone.mjs` (D1 tạm); **hạt giống tài khoản thử mở rộng** (`scripts/dev-iphone.mjs` ~26): thêm Toàn quyền (SUPER_ADMIN), Kế toán (ACCOUNTING), Hướng dẫn viên (FIELD), Tài xế công ty (DRIVER), Tài xế đối tác (DRIVER_PARTNER) bên cạnh 0900000001 (SALES+ADMIN) và 0900000002 (SALES) — đủ TQ, BH, Tài xế như cổng 2b và dải bảo trì chỉ TQ thấy; PIN in ra màn hình. Thêm `wrangler dev` trên `localhost` (có service worker) để thử mất mạng. Gửi chủ đường dẫn + 10 việc thử (`LO-TRINH.md` mục 4, 8–15).
2. **Phiên kiểm độc lập** lập `docs/evidence/<ngày>-dot-0-so-sanh/SO-SANH-TRUOC-SAU.md`: 11 mặt (PROMPT mục 4), 10 bộ, 47 trang `PAGES` (Chặng 1 đo 45; hai trang mới ghi "mới"); bảng từng mặt: 27/10 ↔ mới ↔ tốt lên / chưa đổi / xấu đi; ảnh cặp 390 + 1040 cho 10 trang đại diện × 3 bộ; bảng C, E, F, G, K. Kê rõ những chỗ đợt 0 **có** chạm màn: Trang chủ (bỏ viên bảo trì), 6 trang 403/thiếu mã, các trang gắn thuộc tính `body` (5.5, 5.6), `--w-main` 1280 và `--fw-*` 600 (đã duyệt 2a), viền ô chọn một và công tắc, 5 chỗ hộp xác nhận.
3. Main session đọc duyệt → trang lời thường cho chủ (≤ 3 câu). Chủ "duyệt" → `npm run day-len -- dot-0-khung-chung` → `npm run trien-khai` (A.0 nhật ký, `kiem-phien-ban`). Chưa duyệt thì không gộp.

## 13. Chạm gì ngoài bề mặt — phải ghi rõ

| Chỗ | Gì | Ai duyệt |
|---|---|---|
| `wrangler.jsonc` `assets.not_found_handling` | cấu hình triển khai (Q-15) | chủ, cổng phát hành |
| `web/sw/sw.ts` nhánh `navigate` hết bộ đệm → `/ngoai-mang` | câu trả khi hết bộ đệm; **không** đổi điều 1–2 ADR-0035 | ADR ngắn mới (đề xuất); ADR-0035 không sửa; chủ duyệt ở cổng phát hành |
| `src/shared/muc-giao-dien.ts` `THANH_TAB`, `THANH_BEN` (+ trường `nhomGap`), `TRANG`, `sangTabToi`; `web/shell.ts` `sidebarGroup` (nhóm gập dùng chung với THIẾT LẬP), `tabBar`, `stripsEl`, quan sát thanh dính | khai báo và vẽ điều hướng; **không đổi quyền** (`permissions.ts` không chạm) | đặc tả này |
| `src/shared/giao-dien.ts` `KEO_THEO`, `MAC_DINH` | token mặc định (ADR-0087) | đặc tả này; ghi chú ADR-0087 |
| ADR-0084 ghi chú vị trí nút Trợ lý; ADR-0035 **không** sửa điều (ADR-0143 riêng) | — | cổng 1 câu 4 |
| `docs/SO-HANG-RAO.md` | dòng mới: ratchet `confirm(`/`alert(`; bài khoá thanh tab theo bộ quyền; bài nhóm gập | kèm ngày quan sát chặn thật |
| `docs/BACKLOG.md` | nợ: 8 bảng trượt tự dựng, xác nhận trong trang, 15 `confirm()`, "Đã lưu" tại chỗ, tiêu đề lặp, 16 z-index cứng, 10 skel + 3 chiều cao khác giá trị, bỏ bí danh (phát hành 2), 28 lớp nghi chết | — |
| `web/CLAUDE.md` | "Thành phần chung v2"; sửa dòng "thêm điều hướng ở shell"; bảng kịch bản thêm `mat-mang-smoke`, ba trang mới | — |
| `scripts/dev-iphone.mjs` hạt giống | thêm 5 tài khoản thử (chỉ D1 tạm) | đặc tả này |
| Không chạm: `permissions.ts`, API, D1 thật, migration, tiền, `order-errors.ts` | — | — |

## 14. Điểm còn mơ hồ — kế hoạch chốt bằng cách đọc mã (không hỏi chủ)

1. Đã chốt (QA1 lần 2): `history`, `clock`, `check`, `chat`, `lock`, `handset` có sẵn trong 40 hình của `icons.ts`; chỉ vẽ `alertCircle`, `minus`.
2. Số đo gói `web/orders.ts` hiện tại và sau từng khối (10.11); cách nạp động `trang-thai-he-thong.ts` và `hoiXacNhan` (có thể nạp động cùng `moBangTruot` nếu cần).
3. Đã kê ở mục 4 theo số thật (QA1 lần 2); kế hoạch chỉ kiểm lại một lần trước khi viết bí danh.
4. Cách quan sát thanh dính (MutationObserver phạm vi `main` + `body`) không làm chớp ở trang có `data-tabbar="off"` tĩnh; ghi rõ thứ tự gọi `datThanhTab`.
5. Số dòng `confirm(`/`alert(` thật (loại chú thích) để đặt ratchet.
6. `sangTabToi` tổng quát: cần `tabBar` truyền "tập tab đang hiện" vào `sangTabToi`, hay `sangTabToi` tự tính từ `thanhTab(staff)`.
7. Nhóm gập Điều phối và THIẾT LẬP dùng chung một hàm vẽ: `thietLapMoSan` và số "lệch giá" chỉ áp cho THIẾT LẬP.

## Phụ lục A — Bản đồ mã dùng để soạn (main 60aadbf9; phiên con lập, Main session và QA1 soát)

`web/shell.ts` (511): `initShell` ~372, `tabBar` ~49, `sidebar` ~304, `sidebarGroup` ~268 (THIẾT LẬP viết cứng ~273), `sidebarItem` ~245, `stripsEl` ~74, `setMaintenanceStrip` ~83, `ganDaiNhacHaiLop` ~103, `thanhCongViec` ~436, `ganTroLy` ~495, `datThanhTab` ~504 (lớp `tabbar-an`, `app.css` ~1152), `showError` ~508, nhánh mất mạng ~469, `data-tabbar="off"` → không dựng `#tabbar` ~429. `src/shared/muc-giao-dien.ts` (377): `TRANG` ~58, `NHOM_THANH_BEN` ~149, `THANH_BEN` ~164 (`gom` ~158 = một liên kết nhiều đường; THIẾT LẬP 15 mục phẳng ~182–196), `THANH_TAB` ~209, `THANH_TREN` ~230, `TRANG_TOI` ~247 (`khongSangTabToi`), `coHien`/`moTrang`/`sangTai`/`sangTaiMuc`/`thanhBen`/`thietLapMoSan`/`nhanTheoDuong`/`sangTabToi` ~354/`coKhungNho`/`KHUNG_MAT_MANG` ~284–377; `muc-giao-dien-goi.ts` `GOI_CHINH`. `src/shared/sw-policy.ts`: `PAGES` 47, `PRECACHE`. `web/home.ts` (887): `dungDauTrang`, `renderSoDienThoai` ~723, `renderSoMayTinh` ~92, `renderViec` ~460, viên bảo trì ~633 và ~699, `ganOTim` ~702, `confirm`/`alert` ~335–340. `web/maintenance-screen.ts`: `showMaintenanceScreen` ~67, `renderMaintenanceMessage` ~25; `web/login.ts` `showMaintenanceBanner` ~147. `web/bang-truot.ts` `moBangTruot` (30 tệp); `.sheet*` app.css ~1551, `.sheet-wide` ~1580 (`--w-confirm` 640), `.hk-sheet` ~3316; 8 bản tự dựng; `confirm()` 20 + `alert()` 1 (grep dòng ≈ 21). `web/toast.ts` (50): `hienThongBao`, `hienBaoNgan`, `TU_AN_MS` 6 s; app.css ~2199, luật `.buoc-thanh` ~2210. `src/shared/router.ts` 403 ~426, 404 ~398; `wrangler.jsonc` `run_worker_first` ~29 (wrangler 4.135.0); `web/sw/sw.ts` `staleWhileRevalidate` ~99–111, `cache.add` `allSettled` ~14, `routeFor`; `web/api.ts` `ApiError`, 45 s, 503 bảo trì ~176. `web/icons.ts` `SHAPES` **40** hình (đếm bằng eval đối tượng; grep tên khoá thiếu 3). ADR ở `docs/adr/`. `public/app.css` (3913): `:root` 26–557 ≈ 470 biến, 92 bí danh, `--bar-h` 60 ~126, `--tabbar-h` 56 ~139, `--w-sidebar` 248 ~183, `--w-sheet` 520 ~80, `--w-toast` 360 ~190, `--row-h` 48 ~143, `--h-hdv-act` 48 ~209, `--h-dp-tab` 40 ~305; z-index cứng 21 luật sau dấu mốc PWA ~875; mốc 641/640 ×30, 900/899 ×40, lẻ 960/1024/1400/720. `src/shared/giao-dien.ts`: `NUM` **25** núm, `KEO_THEO` ~46, `CHA`, `MAC_DINH`. `src/goi-trang-nhe.test.ts` ~28 `TRAN_ORDERS` 96_700. `scripts/dev-iphone.mjs` ~27–28 hai tài khoản; `scripts/sinh-so-do-trang.mjs` ~95 nhận diện chân dính theo tên lớp. ADR chi phối: shell 0007, 0015, 0022, 0034 (`#strips`, "Đã hiểu" điều 8), 0035 (khung tạm, bộ đệm), 0040, 0046, 0073/0084 (Trợ lý), 0071, 0072, 0074 (dải 2FA), 0075, 0094; muc-giao-dien thêm 0017, 0038, 0049, 0053, 0055, 0057, 0079, 0087, 0111, 0115, 0128, 0136; sw-policy 0102; sw 0035 (bộ đệm), 0036 (Web Push), 0039 (giờ yên lặng); ADR-0143 proposed.

## Phụ lục B — Bản 1 → bản 2: xử lý QA1 lần 1 (28/10)

| Mã QA1 | Xử lý ở bản 2 |
|---|---|
| A1 | 5.5 ẩn thanh tab động bằng quan sát thanh dính + `datThanhTab`; `data-tabbar="off"` tĩnh chỉ 5 trang luôn có thanh dính; 10.3 viết lại |
| A2 | mục 4: chỉ 5 số z-index; 16 số còn lại BACKLOG; 10.11 sửa |
| A3 | mục 4 + 8: luật cũ của ô tích/ô chọn/công tắc đổi token sang `--c-check-border`; 10.12 giữ |
| B1 | `--z-truot`; toast `--z-tren-cung`; `--z-tl-khung` → `--z-phu` |
| B2 | bí danh chỉ khi bằng giá trị; 3 chiều cao + 8 skel + `--m-*` giữ giá trị |
| B3 | dùng `--bar-h`, `--tabbar-h`, `--w-sidebar`, `--w-sheet`, `--w-toast`; bỏ `--h-muc-thanh-ben`; thanh trên 60 |
| B4 | 5.4 cơ chế `nhomGap` mới, lọc từng con, ≥ 2 mới gập; mục 13 |
| B5 | "Đã hiểu" → ADR-0034 điều 8; bộ đệm → ADR-0035; Trợ lý → ADR-0073/0084 |
| B6 | 6.1 chỉ `hoa-hong`, `nguoi-ban`; bỏ `viec-cua-toi`, `lam-moi-logic` |
| B7 | 10.3 "không có `#tabbar` hoặc display none" |
| B8 | 40 hình (QA1 lần 2 đếm lại; bản 2 ghi 37), 25 núm, bỏ "bài so-do-trang" |
| B9 | 5.6 bỏ cả hai viên |
| B10 | mục 4 cột Nguồn: 8 token bản vẽ ghi "bản vẽ, 7c" |
| B11 | nhánh `dac-ta-dot-0` đã ghép hồ sơ cổng 2b (bản 3: 5 commit trước main 60aadbf9) |
| C1 | 5.2 thứ tự khai duy nhất; Tạo đơn 3/5 hay 2/4; `taiKhoan` vị từ; kê "được mà ẩn" |
| C2 | 5.2 `sangTabToi` tổng quát; 14.8 cũ bỏ |
| C3 | 5.5 danh sách 11 trang chia tĩnh/động; thêm `vc-form-actions` |
| C4 | 6.3 chỉ `PAGES`; precache hụt; kịch bản tạo hụt bằng CDP |
| C5 | 7.1 số từng tệp; 5 chỗ mẫu; `catalog` `&&` ghi rõ |
| C6 | mục 4 thêm 3 ĐỔI cỡ chữ; mốc = tài liệu; token bản vẽ đánh dấu nguồn |
| C7 | 10.11 không nới trần, nạp động, vượt thì hỏi chủ |
| C8 | Q-9 giữ `.sheet-wide`, `.hk-sheet` |
| C9 | 7.2 giữ luật `.buoc-thanh` |
| C10 | 5.6 "ngoài mạng" là lựa chọn Main session, đảo được |
| C11 | bỏ câu 2 (Q-21); phím `/` theo 2A (Q-19), nêu lệch 2B.E ở mục 1 |
| C12 | 5.3 mỗi dòng = một mục THIẾT LẬP `thanhBen()` trả |
| C13 | 6.1 ba trạng thái "dựng + kiểm DOM" |
| C14 | 47 trang `PAGES` (Chặng 1 đo 45) |
| C15 | mục 4 `dam-tieu-de` kéo `--fw-bold/--fw-heavy` |
| C16 | 5.4 trỏ `main` |
| D1 | 7.1 5 chỗ mẫu + ratchet; 15 chỗ Chặng 3 |
| D2 | 12.2 kê chỗ chạm màn vào tờ so sánh |
| D3 | 12.1 hạt giống thêm SUPER_ADMIN, ACCOUNTING, FIELD, DRIVER, DRIVER_PARTNER |
| D4 | mục 4 ba ĐỔI làm ở đợt 0 |
| D5 | mục 13 thêm `nhomGap`, `sidebarGroup`, `sangTabToi`, quan sát thanh dính |
| D6 | mục 9 + Q-22 |

### Bản 2 → bản 3: xử lý QA1 lần 2 (28/10)

| Mã | Xử lý ở bản 3 |
|---|---|
| A1 (CHƯA) | 5.5: `cuoc-chuyen` chuyển sang "theo trạng thái" (`#cc-day`); bỏ `.scn-phep-tinh` khỏi bộ chọn; `so-cong-no` không có thanh dính ≤ 899; tĩnh còn 4 trang; 10.3 sửa; thêm gợi ý `.thanh-hanh-dong-cuoi` (loại `.dp-run-end`) |
| B2 (CHƯA) | mục 4: `--h-field`, `--h-field-wide`, `--search-h`, `--h-hdv-btn` = 52 → bí danh `--h-control-lon`; 44 chỉ `--tap-min`, `--counter-btn`; khác giá trị 3 token; skel bằng 3 (+`money-mt` tuỳ), khác 10; mục 9, 13, 14.3 sửa số |
| B8 (CHƯA) | 40 hình; tên hình có sẵn `history`/`clock`/`check`/`chat`/`lock`/`handset` chốt ở 5.8, 6.1, 8, 14.1 |
| N1–N2 | hết mâu thuẫn 3/6 chiều cao và `--h-field` 44/52 (theo B2) |
| N3 | B11 ghi số commit thật |
| N4 | 6.3 + mục 13: ADR ngắn mới thay vì ghi chú ADR-0035 (ADR-0035 tự cấm sửa nội dung); mục 4: thứ bậc `--z-ntf` trên bảng trượt → hộp đóng trước, kế hoạch kiểm |
| A3 ghi chú | mục 4: ba luật cũ cụ thể (`.vc-radio-dot`, `.dp-switch`, `.dd-switch-o .dp-switch`); ô tích gốc không làm gì |
| C1 ghi chú | đường dẫn thật `ma-tran-quyen.json` ở 5.2, 10.1 |
