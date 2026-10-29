# Tờ so sánh trước/sau đợt 0 khung chung (29/10/2026)

> Hồ sơ có ngày. Người lập: phiên kiểm độc lập QA2 (không thi công đợt 0). Đặc tả: `docs/superpowers/specs/2026-10-28-dot-0-khung-chung/DAC-TA.md` mục 10.16, 11, 12.2.
> «Trước» = cuộc đánh giá 27/10 (`docs/evidence/2026-10-27-danh-gia-ux-tong-the/`, chỉ đọc). «Sau» = nhánh `dot-0-khung-chung` (HEAD `d9dea648` + bằng chứng QA2), đo lại 29/10 bằng bản chép kịch bản ở `docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/` — cùng điều kiện: D1 tạm trạng thái NHIỀU (45 đơn, 12 tài khoản, 8 chuyến), 10 bộ quyền, khổ 390 / 1040 (+768 / 1440 cho danh sách, bảng điều khiển), axe 4.13 WCAG 2.1 A/AA, tốc độ 4G chậm + CPU 4× ở 390×844.

## Kết luận

**Cổng 10.16 ĐẠT theo trung vị toàn Nền tảng; nếu đọc ngưỡng 5 % theo từng trang thì 3/45 trang vượt nhẹ (+5,1…5,3 % FCP lạnh, ≈ 50 ms, đo lặp ba lần).** Lượt đo trên máy rảnh: trung vị FCP lạnh trên 45 trang chung 964 → 984 ms (+2,1 %), trung vị «khung xong» lạnh 949 → 962 ms (+1,4 %); CLS lạnh ở hai trang mới `/thiet-lap` 0,088 và 404 0,051 (≤ 0,1); chuyển trang «bấm → vẽ đầu» lớn nhất 97 ms qua ba lần lặp (≤ 101 ms).

Điểm cần chủ biết (không chặn cổng, ghi đúng như đo):
- **Ba trang lệch FCP lạnh nhỉnh hơn 5 % khi đo lặp ba lần** (trung vị): `/orders` 948 → 996 (+5,1 %), `/nguoi-ban` 936 → 984 (+5,1 %), `/feedback` 988 → 1040 (+5,3 %); `/xe-sua` đo lặp chỉ +1,7 %. Mức lệch ≈ 50 ms, cùng cỡ nhiễu một lần đo của 27/10 (27/10 chỉ đo một lần). Nếu đọc ngưỡng 5 % theo **từng trang** thì ba trang này là «xấu đi»; theo **trung vị toàn Nền tảng** thì đạt. Đặc tả không nói rõ cách đọc — ghi để chủ/điều phối chốt. Đối chiếu cỡ tải lạnh (`lanh.tai`): ba trang này tăng **bằng trung vị** mọi trang (JS +1,8…2,5 KB; thêm một tệp phông đậm 600 ≈ 28 KB do `--fw-*` 600, chung cho 41/45 trang), và nhóm trang nạp thêm phông có trung vị ΔFCP chỉ +1,7 % ⇒ không quy được phần lệch riêng cho ba trang; nghiêng về nhiễu đo. Phát hiện kèm: mở lạnh mọi trang nay tải thêm ≈ 28 KB phông (Be Vietnam Pro 600).
- CLS lạnh hai trang mới giống hệt ở cả hai lượt đo đầy đủ (kể cả lượt bị tải cao): `/thiet-lap` 0,0879, 404 0,051 — biên của `/thiet-lap` chỉ 0,012 so với ngưỡng 0,1.
- **CLS lạnh xấu đi ở hai trang cũ** (không thuộc ngưỡng cổng, ngưỡng chỉ áp hai trang mới): Trang chủ 0,225 → 0,322 (một lần đo); `/orders` 0,050 → 0,094 (hai trong ba lần lặp lên 0,168, vượt 0,1).
- Lượt đo đầu (`so-lieu/toc-do-lan1.json`) BỎ vì phiên khác đẩy tải máy lên ~10 giữa chừng (mọi trang chậm 5–17 %); đo lại khi tải trung vị 2,1. Ghi để người sau không dùng nhầm.

## 1. Tốc độ cảm nhận (mặt 11) — bảng K

Nguồn: `../2026-10-29-dot-0-khung-chung/so-lieu/so-toc-do.md` (sinh bằng `kich-ban/so-toc-do.mjs`), số thô `so-lieu/toc-do.json`, lặp `toc-do-tung-trang-lap3.json`, `toc-do-chuyen-lap3.json`.

| Chỉ số (390×844, 4G chậm, CPU 4×) | 27/10 | Mới | Đánh giá |
|---|---:|---:|---|
| Trung vị FCP lạnh, 45 trang chung | 964 ms | 984 ms | chưa đổi (+2,1 %, trong ngưỡng 5 %) |
| Trung vị khung xong lạnh | 949 ms | 962 ms | chưa đổi (+1,4 %) |
| Trang > 5 % FCP (một lần đo) | — | 4 / 45 | đo lặp: 3 trang +5,1…5,3 % (xem trên) |
| CLS lạnh `/thiet-lap` (mới) | — | 0,088 | đạt ≤ 0,1 |
| CLS lạnh 404 `/khong-co-trang-nay` (mới; 27/10 là chữ JSON) | — | 0,051 | đạt ≤ 0,1 |
| Chuyển trang 390 → `/orders` bấm→vẽ (3 lần) | 77 | 69 / 69 / 81 | tốt lên nhẹ |
| Chuyển trang 390 → `/order-form` | 101 | 77 / 97 / 73 | chưa đổi, ≤ 101 |
| Chuyển trang 1040 → `/orders` | 45 | 32 / 45 / 72 | chưa đổi |
| Chuyển trang 1040 → `/` | 49 | 60 / 56 / 80 | xấu đi nhẹ (+10…30 ms), vẫn dưới 101 |
| Chuyển trang 1040 → `/order-form` | 57 | không đo được | thanh bên Toàn quyền không còn mục Tạo đơn (nút ở thanh trên) — bộ chọn 27/10 giữ nguyên để so đúng |
| Phản hồi chạm (Lọc / Tất cả, 390 + 1040) | 10–13 ms | 10–19 ms | chưa đổi (≤ 100) |
| Nóng (service worker) FCP | 36–120 ms | 36–120 ms | chưa đổi |

Ngân sách 1 giây mở trang lạnh: vẫn vượt ở phần lớn trang (≈ 1 s FCP, 1,3–1,9 s nội dung) — như 27/10; «nhanh lên thật» là đợt 0b theo đặc tả.

## 2. Mười một mặt

Số ở cột 27/10 ↔ mới là tổng trên **472 ô chung** (cùng bộ, trang, khổ, trạng thái) của hai lượt quét, nguồn `so-lieu/so-quet.txt` (`kich-ban/so-quet.mjs`) và `so-lieu/tong-hop.md` (cùng cấu trúc bảng A–K của 27/10).

| # | Mặt | 27/10 | Mới | Đánh giá |
|---|---|---|---|---|
| 1 | Điều hướng, kiến trúc thông tin | Thanh bên 22 mục phẳng (QT); thanh tab không theo bộ; 403/404 không sáng đúng | Thanh bên 10 khối có nhóm gập (Điều phối, THIẾT LẬP 15); thanh tab theo bộ quyền (kịch bản `dot-0-smoke` bước 1, 18); trang `/thiet-lap` mới gom 15 trang thiết lập | **tốt lên** |
| 1b | — số trang «có lối vào» của Quản trị theo ma trận | 33 | 39 (thêm `/thiet-lap`, `/audit`, `/sessions`, `/giao-dien`, `/tro-ly-cai-dat`, `/gui-thong-bao`) | **không đổi quyền thật**: `ma-tran-quyen.mjs` cộng `cungSang` của `/thiet-lap`, mà `cungSang` đó gồm MỌI trang nhóm THIẾT LẬP kể cả trang chỉ Toàn quyền (chỉ dùng để tô sáng mục). Trang Thiết lập của Quản trị hiện 10 mục, không có 5 trang trên; mở thẳng địa chỉ thì `/audit` ra vỏ 403, bốn trang còn lại ra dòng từ chối trong trang (mã trang không đổi ở đợt 0; chỉ tới được bằng gõ địa chỉ). Ghi để không đọc nhầm ma trận |
| 2 | Mẫu trang | 47 trang tự dựng đầu trang; trang tập trung không nút lùi | Thanh trên một kiểu + nút lùi ở trang tập trung ≤ 899; thân trang chưa đổi (Chặng 3) | tốt lên (vỏ) / chưa đổi (thân) |
| 3 | Danh sách, bảng | — | không chạm | chưa đổi |
| 4 | Biểu mẫu | ô gõ không nhãn 27 (390) | 16 | tốt lên (chủ yếu do ô tìm/thanh trên mới có nhãn); thân form chưa đổi |
| 5 | Từ vựng trạng thái | huy hiệu 24 kiểu, 10 chữ cùng chữ khác hình | 28 kiểu, 11 chữ | **xấu đi nhẹ**: thêm 3 kiểu huy hiệu của thanh bên (`sidebar-item-badge*`) và cỡ 12,8 px lẫn 12 px cho cùng `badge-confirmed` / `badge-draft` |
| 6 | Phản hồi hành động | `confirm()` của hệ điều hành; báo xong không thống nhất | Hộp xác nhận chung ở 5 chỗ (ratchet `confirm(`/`alert(` không tăng); báo ngắn chung (`dot-0-smoke` bước 10–11) | tốt lên |
| 7 | Thang nút, thứ bậc | 86 chữ ký nút | 93 | **xấu đi nhẹ về số đếm**: 62 chữ ký «mới» chủ yếu do `--fw-*` 600 (đã duyệt 2a) đổi độ đậm mọi nút — cùng khuôn, khác số đậm; thêm nút của khung (dải `dai-dong`, `sidebar-group-toggle`, `topbar-new`) |
| 8 | Đáp ứng theo thiết bị | 768: vùng chạm < 44 là 961, chữ cắt 98; 390: 9 ô tràn ngang | 768: 96 và 29 (Q-2: 641–899 dùng bố cục điện thoại); 390: 1 ô tràn | **tốt lên** |
| 8b | — tiêu đề thanh trên 390 | mã đơn hiện đủ | mã đơn ở thanh trên bị cắt «TD-20261029-0…» (nút Trợ lý chuyển lên thanh trên); mã đầy đủ vẫn ở thẻ đơn ngay dưới | **xấu đi nhẹ** (ảnh `anh/SALES-order-390.jpg` ↔ `anh/27-10/SALES-order-390.jpg`) |
| 8c | — số màn cuộn (390, tổng) | 1073 | 1135 (+5,8 %) | **xấu đi nhẹ**: thanh tab dưới + chừa đáy; chưa tách được phần nào do dải |
| 9 | Tiếp cận (axe) | nghiêm trọng: 30 nút (390) — 404 thiếu `title`/`lang`, `/gui-thong-bao` tương phản | 10 — chỉ còn `/gui-thong-bao` tương phản (có từ trước) | **tốt lên**; `meta-viewport` (mức vừa, `user-scalable=no`, có từ 30/9) còn nguyên — nợ chờ chủ |
| 10 | Ngôn ngữ | chữ Anh/mã thô: 15 chữ, gồm `error`, `not_found` ở 404 | 13 chữ — 404 hết JSON; còn `Admin` ở `/help`, mã địa điểm / mã giấy tờ ở 3 trang thiết lập (có từ trước) | tốt lên; bảng G: 0 dòng mới |
| 11 | Tốc độ cảm nhận | xem mục 1 | | chưa đổi (đạt cổng), ba trang +5 % ở ranh giới, CLS Trang chủ và `/orders` xấu đi |

## 3. Bảng C — ba trạng thái chung (390, mọi bộ)

| Trạng thái | 27/10 | Mới | Đánh giá |
|---|---|---|---|
| 403 (`/audit` với 8 bộ không quyền) | Trang nhật ký còn bộ lọc + dòng báo lỗi; 8 ô tràn ngang | Vỏ 403: «Bạn không có quyền xem trang này.» + «Về trang đầu của bạn»; hết tràn | **tốt lên** |
| 403 Quản trị (thử `/so-cong-no` — 27/10 thử `/audit`, nay Quản trị có lối vào `/audit` qua THIẾT LẬP) | — | Đầu trang + dòng đỏ «Trang Sổ công nợ chỉ Kế toán và Toàn quyền xem được.» — **chưa** là vỏ 403 | chưa đổi — `so-cong-no.ts` ngoài 6 chỗ đợt 0 áp mẫu (đặc tả 6.1); đề xuất đưa vào Chặng 3 |
| 404 (`/khong-co-trang-nay`, 10 bộ) | Chữ JSON `{"error":{"code":"not_found"…}}`, không vỏ, axe nghiêm trọng 2 luật | Vỏ 404 có thanh trên/bên; «Không có trang này.» | **tốt lên** |
| Mất mạng (trang đầu của bộ, chưa từng mở) | Thân cũ + «Không có kết nối mạng…» | Trang «Không có kết nối mạng» + «Trang này chưa mở lần nào trên máy nên chưa có dữ liệu để hiện…» + Thử lại | tốt lên; điểm mâu thuẫn dải «dữ liệu lần xem gần nhất» ↔ thân «chưa có dữ liệu» (bàn giao việc 5) thuộc phiên kiểm cả nhánh |

## 4. Bảng E, F, G — tóm tắt

- **E (sổ lệch thành phần)**: nút 86 → 93 chữ ký; huy hiệu 24 → 28; thẻ 26 → 26; ô gõ 16 → 13; huy hiệu cùng chữ khác hình 10 → 11; vùng dính 21 → 21 kiểu; câu trạng thái rỗng 13 → 13; phông 1 → 1. Bảng đầy đủ: `so-lieu/tong-hop.md` mục E.
- **F (axe)**: `document-title`, `html-has-lang` (404) hết; `color-contrast` `/gui-thong-bao` còn; `meta-viewport` còn (492 nút / 144 trang@khổ — tăng vì thêm ô).
- **G (chữ Anh)**: `error`, `not_found` hết; 13 chữ còn lại có từ trước; **0 dòng mới**.
- **I (thanh điều hướng)**: kịch bản 27/10 đọc thanh tab bằng bộ chọn cũ nên cột 390 vẫn «—» ở cả hai lượt; thanh tab theo bộ quyền được khẳng định bằng `dot-0-smoke` bước 1/18 thay vì bảng này.

## 5. Chỗ đợt 0 CÓ chạm màn (đặc tả 12.2)

| Chỗ | Thấy gì khi đo | Ảnh |
|---|---|---|
| Trang chủ — bỏ viên bảo trì | Không còn viên; dải bảo trì chỉ Toàn quyền thấy (`dot-0-smoke` bước 8; `v1-bao-tri` QA2 không chạy lại); CLS lạnh 0,225 → 0,322 (**xấu đi**) | `anh/*-trang-chu-*.jpg` |
| 6 trang 403 / thiếu mã (`hoa-hong`, `nguoi-ban`, `order`, `chuyen`, `cuoc-chuyen`, `xe-chi-tiet`) + `/audit` | Quét đo thấy `/audit` 403 có vỏ ở 8 bộ; năm trang còn lại QA2 không quét riêng (quét chỉ thử một trang 403 mỗi bộ) — dựa vào `dot-0-smoke` bước 3, 5 | `anh/SALES-403-audit-*.jpg` |
| Thuộc tính `body` (5.5, 5.6) | Thanh tab tự ẩn khi có thanh dính đáy; trang tập trung có nút lùi | `dot-0-smoke` bước 2, 16, 19 |
| `--w-main` 1280, `--fw-*` 600 (đã duyệt 2a) | Mọi nút đậm 600 — nguồn chính của 62 chữ ký nút «mới»; độ rộng 1280 ở 1440 chưa soát riêng | `anh/*-1040.jpg` |
| Viền ô chọn một, công tắc (`--c-check-border`, `--c-switch-off-bg`) | axe không bắt lỗi tương phản ở trang có ô chọn ở cả hai lượt; tỉ lệ viền ≥ 3:1 (tiêu chí 10.12) QA2 **chưa đo riêng** | — |
| 5 chỗ hộp xác nhận | Hộp chung thay `confirm()` | `dot-0-smoke` bước 10 |
| Trang mới `/thiet-lap`, `/404`, `/ngoai-mang` | ghi «mới»; FCP 964 / 976 ms, CLS 0,088 / 0,051 | `anh/SUPER_ADMIN-thiet-lap-*.jpg`, `anh/*-404-*.jpg` |

## 6. Ảnh cặp

`anh/<bộ>-<trang>-<390|1040>.jpg` (mới, ảnh màn đầu) và `anh/27-10/<cùng tên>` (trước, chép từ bộ ảnh đầy đủ 27/10 trên máy đo). 10 trang × 3 bộ:
- Bán hàng: Trang chủ, Đơn hàng, Chi tiết đơn, Tạo đơn, Danh bạ, Điều phối, Của tôi, Hướng dẫn, 403 `/audit`, 404.
- Kế toán: Trang chủ, Đơn hàng, Chi tiết đơn, Sổ công nợ, Chờ xác nhận, Hoa hồng, Bảng kê xe, Của tôi, 403 `/audit`, 404.
- Toàn quyền: Trang chủ, Đơn hàng, Thiết lập (mới — không có ảnh 27/10), Danh mục, Tài khoản, Xe, Nhật ký, Giao diện, Của tôi, 404.

## 7. Không đo lần này

- Kho ÍT và RỖNG (bảng D «rỗng ↔ nhiều»): không dựng lại; đợt 0 không đổi câu trạng thái rỗng (bảng E «chữ trạng thái rỗng» 13 → 13 ở kho NHIỀU).
- Hành trình thật (`hanh-trinh.mjs`, bảng L1/L2): không chạy lại (không thuộc 12.2).
- Đếm cỡ gói (`do-co-goi.sh`) và token (`dem-token.mjs`): không chạy; trần gói Đơn hàng do bài `goi-trang-nhe` canh (trần 101.719 byte, xanh).
