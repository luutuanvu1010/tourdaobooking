# Island Booking System — Design System v2

Hệ thống thiết kế cho **Nền tảng đặt dịch vụ tour nội bộ của Công ty TNHH Tour Đảo (Nha Trang)**. Bộ này là nền để vẽ lại mọi màn hình cho đồng bộ: token ba tầng, từ vựng trạng thái, 27 thành phần dùng chung và sổ tay dùng. Chưa vẽ màn hình nghiệp vụ nào (theo đề bài).

- Chạy trên web và cài lên iPhone như ứng dụng ("Tour Đảo Booking"); ~30 nhân viên + gần 1.000 đối tác.
- Người dùng: bán hàng (lập đơn trên điện thoại khi đang nói chuyện với khách), kế toán (đối chiếu công nợ trên máy tính), điều phối (xếp xe, tài xế), tài xế (bấm "Đã đón / Đã trả" ngoài nắng, bằng ngón cái), đối tác / cộng tác viên (gửi đơn từ điện thoại).
- Thiết kế điện thoại trước (390×844, một tay) rồi máy tính (1040); kiểm thêm 768 và 1440.

## Nguồn

- Mã đang chạy: **https://github.com/luutuanvu1010/tourdaobooking** (nhánh `main`). Đã đọc `public/app.css` (`:root`), `web/icons.ts`, `public/fonts/`, `public/icons/`, `docs/design/*`. Nên mở repo này để xem thêm khi dựng màn hình thật — đặc biệt `docs/design/` (các bản vẽ trước) và `docs/SPEC-tourdao-sales.md` (luật nghiệp vụ).
- Đề bài v2 của chủ dự án (mục 1–11): mọi giá trị gốc lấy từ mục 8; quyết định đã chốt ở mục 5.
- Logo: `uploads/logo-tour-dao-96.png` (chủ dự án gửi) → `assets/logo-96.png`.
- Bản xem trước dựng bằng React chỉ để xem trên Claude — không phải cách Nền tảng được xây (Nền tảng là TypeScript thuần + HTML tĩnh).

## Cách dùng

```html
<link rel="stylesheet" href="styles.css">
<body class="ib-goc"><div class="ib-khung"> … </div></body>
```

`styles.css` chỉ là danh sách `@import`: phông → token gốc → ý nghĩa → thành phần → nền tảng → CSS của sáu nhóm thành phần. `.ib-khung` là khung ứng dụng (container `ib`): thành phần đọc bề rộng khung để đổi điện thoại ↔ máy tính. Không có khung = bố cục điện thoại (điện thoại trước). Đổi phông công ty: `data-phong="nunito" | "lexend" | "noto-sans"` trên gốc. Đổi vỏ: `--vo-bg`, `--vo-chu`, `--vo-vien`.

---

## Nguyên tắc vàng: "một ý nghĩa, một hình"

Một trạng thái có đúng một chữ, một tông, một biểu tượng. Một hành động chính có đúng một kiểu nút. Mọi ô nhập có nhãn luôn thấy, nằm trên ô.

Năm tiêu chí theo thứ tự: **1. Nhanh và mượt** (150–200 ms, khung xương, không nhảy bố cục) · **2. Dễ nhìn** (chữ 16, WCAG AA, vành tiêu điểm 3 px, không chỉ dựa màu) · **3. Gọn mắt** (ít viền, ít nền, một bo, một bóng nhẹ) · **4. Đúng phong cách quản trị** (điềm đạm, dày dạn, kiểu Oracle Redwood / SAP Fiori; màu nhấn tiết kiệm) · **5. Đơn giản** (ít thành phần, ít biến thể).

### Vì sao bộ này giúp nhân viên làm nhanh hơn và đỡ nhầm hơn

1. Mỗi trạng thái chỉ còn một chữ, một màu, một hình (23 trạng thái thay cho 24 kiểu huy hiệu và 10 chữ trùng nghĩa) — liếc là biết đơn đang ở đâu, không phải đọc.
2. Một vùng chỉ một nút Chính, san hô chỉ ở hai chỗ chốt — ngón tay luôn tìm đúng nút cần bấm, không bấm nhầm "Huỷ" vì nó trông giống "Lưu".
3. Nút tắt luôn nói vì sao tắt, lỗi luôn nói cách sửa — người bán hàng sửa ngay khi khách còn đứng đó, không phải gọi hỏi.
4. Nút 44–52, chân dính trong tầm ngón cái, tên khách không bao giờ bị cắt — tài xế bấm đúng ngoài nắng bằng một tay.
5. Bảng ≥ 900 / thẻ ba dòng < 900 cùng một dữ liệu, cùng một chỗ — kế toán và bán hàng nhìn cùng một đơn theo cùng một thứ tự.

---

## CONTENT FUNDAMENTALS — Giọng chữ

- **Ngôn ngữ**: tiếng Việt có dấu, 100% chữ trên giao diện. Không chữ tiếng Anh (trừ tên riêng: Google Sheet, Zalo). Tên token, prop, tên tệp: tiếng Việt không dấu.
- **Giọng**: điềm đạm, như một đồng nghiệp có kinh nghiệm — nói việc cụ thể, không khen, không đùa, không chấm than. Không "Bạn có chắc chắn không?", không "Thành công!".
- **Ngôi**: tránh đại từ khi được; cần thì gọi người dùng là "bạn" ("Bạn chưa có quyền xem trang này"). Hệ thống không xưng "tôi"/"chúng tôi".
- **Viết hoa**: chỉ chữ đầu câu và tên riêng — kể cả tiêu đề, nhãn, tab, tên nhóm thanh bên, tiêu đề cột bảng. **Không bao giờ IN HOA cả dòng**, không giãn chữ.
- **Nút**: động từ + đối tượng, 1–3 chữ: "Lưu đơn", "Huỷ đơn", "Xếp xe", "Thử lại". Nút đỏ nói đúng việc ("Huỷ đơn"), không "Đồng ý".
- **Báo xong**: bắt đầu bằng "Đã …": "Đã xác nhận đơn TD-2026-10-0412".
- **Lỗi**: nói cách sửa, không đổ lỗi: "Số điện thoại cần 10 chữ số, bắt đầu bằng 0".
- **Nút tắt**: một dòng lý do: "Chọn lý do để lưu".
- **Rỗng**: nói sự thật + một bước tiếp: "Chưa có đơn nào hôm nay" + "+ Tạo đơn".
- **Mất mạng**: "Đang ngoài mạng — đang hiện dữ liệu lần xem gần nhất" + "Thử lại".
- **Ô tìm**: "Tìm theo tên, số điện thoại, mã đơn".
- **Số liệu**: tiền ghi đủ "1.080.000 ₫" ở mọi khổ (dấu chấm nghìn, khoảng trắng, ₫ — `ghiTien()`); "còn phải thu 670.000 ₫"; số khách "2 NL · 1 TE"; ngày dd/mm/yyyy "28/10/2026"; giờ 24h "07:30"; mã đơn và biển số chữ máy: `TD-2026-10-0412`, `79B-123.45 – 16 chỗ`.
- **Dấu nối**: " · " (chấm giữa) giữa các mảnh thông tin cùng dòng; " – " trong tên dịch vụ ("Tour 3 đảo – ca sáng"); " — " giữa hai vế câu.
- **Emoji**: không bao giờ. Ký tự Unicode không thay biểu tượng (trừ "₫", "·", "…", "−").
- **Ô tuỳ chọn**: "(tuỳ chọn)" sau nhãn. Ô bắt buộc không ghi gì, không dấu *.

---

## VISUAL FOUNDATIONS — Nền tảng thị giác

**Màu.** Nền trắng (`--c-nen`) cho trang và thẻ; xám mây `--c-nen-phu` #f2f5f9 cho thanh bên, khối, ô tắt. Chữ mực #0f172a (`--c-chu`), phụ #475569 (`--c-chu-phu`) — thông tin thứ yếu lùi về xám. Màu chính Biển #0c4a6e (`--c-chinh`) cho nút Chính, chữ nhấn, mục đang chọn (nền `--c-chinh-nhat`). San hô #c0392b (`--c-nhan`) **chỉ** cho "Xác nhận đơn để gửi khách" và "+ Tạo đơn". Đỏ #b01235 (`--c-nguy-hiem`) cho lỗi và nút nguy hiểm. Đầm phá rực #0891b2 (`--c-tieu-diem`) chỉ cho vành tiêu điểm và vạch chỉ báo. Năm tông trạng thái là cặp nền nhạt / chữ đậm có sẵn (`--tt-cat-*`, `--tt-bien-*`, `--tt-la-*`, `--tt-do-*`, `--tt-xam-*`). Màu nhấn dùng tiết kiệm: một màn bình thường chỉ có biển + xám, cộng huy hiệu.

**Chữ.** Be Vietnam Pro (`--f-chinh`), ba độ đậm: 400 nội dung · 500 nhãn và nút · 600 tiêu đề và số lớn. Thang 14 bậc 12→32 (`--co-1`…`--co-14`). Vai: tiêu đề trang 20 (điện thoại) / 24 (máy tính); tiêu đề khối 16 / 18; nội dung 16 dòng 24; phụ 14 dòng 20; huy hiệu 12. Chữ máy (`--f-so`) cho mã đơn, biển số, số kỹ thuật. Số tiền dùng số đều (`tabular-nums`). Thành phần đúng với Nunito, Lexend, Noto Sans — không dựa nét riêng của phông nào (không cắt chữ theo chiều cao cố định, không canh theo đường cơ sở riêng).

**Khoảng cách.** Bảy bậc 4/8/12/16/24/32/48 (`--kc-1`…`--kc-7`). Lề trang 16 (điện thoại) / 32 (máy tính); đệm thẻ 16 / 24; giữa khối 24. Dòng danh sách ≥ 44, đệm 12×16 (`--pad-dong`), kẻ dưới 1 px `--c-vien`. Một mật độ, chưa có chế độ gọn / thoáng.

**Nền và hình ảnh.** Không ảnh nền, không minh hoạ, không hoạ tiết, không gradient. Nền phẳng trắng / xám mây. Ảnh (nếu sau này có, vd ảnh xe, giấy tờ) đặt trong khung bo 12, không phủ chữ lên ảnh.

**Bo góc.** Bốn bậc: 8 nút, ô, ô tích (`--r-dieu-khien`) · 12 thẻ, dải, báo xong (`--r-the`) · 18 bảng trượt (`--r-bang-truot`) · 999 chip, tab, huy hiệu, công tắc (`--r-tron`).

**Thẻ.** Nền trắng, bo 12, một bóng nhẹ `--sh-the`, **không viền**. Thẻ bấm được: cả thẻ là vùng bấm, mũi tên `next` bên phải, rê thì đổi nền (`--c-nen-re`) chứ không nổi bóng. Không lồng thẻ.

**Viền.** Ít viền: chỉ ô nhập (`--c-vien-o` #c9d4e0), nút Phụ (viền biển 1 px), kẻ dòng (`--c-vien`). Không viền màu bên trái làm điểm nhấn (trừ vạch chỉ báo 3 px của mục thanh bên đang chọn).

**Bóng.** Ba mức: thẻ (`--sh-the`) · nổi cho báo xong và bảng chọn (`--sh-noi`) · lớp phủ cho bảng trượt (`--sh-lop-phu`). Không bóng trong, không bóng màu, nút phẳng.

**Trong suốt và nhoè.** Hai chỗ duy nhất: màn mờ rgba(15,23,42,.45) sau bảng trượt (`--bang-man`), kính rgba(255,255,255,.86) + nhoè 16 px dưới thanh tab (`--thanh-tab-bg`, `--thanh-tab-mo`).

**Chuyển động.** Một đường cong `--cd-cong` cubic-bezier(.22,1,.36,1); 150 ms (`--cd-nhanh`) cho rê, bấm, đổi màu; 200 ms (`--cd-vua`) cho mở bảng trượt, hiện báo xong, gập nhóm. Hình: hiện dần + trượt 8 px; bảng trượt đi lên từ đáy. Không nảy, không lắc. `prefers-reduced-motion` → 0 ms. Khung xương nhấp nháy chậm 1,2 s (không quét sáng).

**Rê chuột** (chỉ khi `hover: hover`). Nút đặc đậm lên (`--nut-chinh-bg-re`); nút Phụ, dòng, thẻ bấm được lấy nền `--c-nen-re`; Lối nhỏ gạch chân; viền ô đậm lên `--o-vien-re`. Không đổi độ mờ.

**Bấm.** Nút, bộ đếm, thẻ thu nhẹ (98% / 96% / 99%); nút Chính về `--c-chinh-dam`. Không gợn sóng.

**Tiêu điểm.** Một hình cho mọi điều khiển: vành 3 px `--c-tieu-diem` cách 2 px (`--vanh-tieu-diem`, `--vanh-cach`).

**Tắt.** Xám phẳng (`--nut-tat-bg` + `--nut-tat-chu`, tương phản ~7:1), không làm mờ, vẫn nhận tiêu điểm, luôn kèm một dòng lý do.

**Bố cục cố định.** Thanh trên 60 dính đỉnh (`--h-thanh-tren`); thanh tab dưới 56 + vùng an toàn (điện thoại, 768); thanh bên 248 (≥ 900); thanh dính đáy cho nút chốt; dải trên trang tối đa một, sát dưới thanh trên. Nội dung tối đa 1280 ở khổ 1440 (`--w-noi-dung`). Không nút nổi ở bất kỳ khổ nào.

**Khổ.** < 768 điện thoại · 768–899 máy tính bảng (thanh tab, hộp thoại giữa màn, thẻ ba dòng hai cột) · ≥ 900 máy tính (thanh bên, bảng cột) · 1440 (nội dung 1280 giữa màn).

**Vỏ ngoài.** Thanh trên mặc định trắng chữ biển; Toàn quyền đổi được màu vỏ (`--vo-bg`, `--vo-chu`, `--vo-vien`). Mọi thứ trong thanh theo `currentColor`; thành phần bên dưới không đọc màu vỏ.

**Không làm.** Không chế độ tối, không nút nổi, không nhãn nổi trong ô, không emoji, không gradient, không dựa màu đơn độc để nói trạng thái.

---

## ICONOGRAPHY — Biểu tượng

- **Bộ**: 37 hình chép đúng path từ `web/icons.ts` của repo + 1 hình MỚI `minus` (nửa ngang của `plus`, cho nút "−" của Bộ đếm). Lưới 24, nét 2 (`--bt-net`; mã cũ 1,8 và 2,2 — gộp về 2), đầu nét tròn, không tô đặc, màu `currentColor`.
- **Dùng**: thành phần `BieuTuong` (React) hoặc tệp SVG rời `assets/icons/<ten>.svg` (cùng path). Không có phông biểu tượng, không dùng PNG cho biểu tượng, không CDN.
- **Cỡ**: 20 trong nút, ô, dòng, mục điều hướng (`--bt-co`); 24 trên thanh trên, thanh tab, trạng thái rỗng (`--bt-co-lon`); 16 trong chip, câu lỗi; 14 trong huy hiệu.
- **Năm hình trạng thái**: `clock` Cát · `swap` Biển · `check` Xanh lá · `alert` Đỏ · `ban` Xám. Dải thông báo và dải trên trang dùng đúng hình của tông.
- **Một hình một nghĩa**: `chat` = Trợ lý · `handset` = Hỗ trợ / gọi khách · `help` = Hướng dẫn · `me` = Của tôi · `plus` = Tạo đơn · `truck` = Chuyến · `history` = dữ liệu lần trước / mất mạng · `lock` = không quyền / khoá · `search` = tìm / không có trang.
- **Emoji / Unicode**: không dùng emoji. Không dùng ký tự ✓ ✕ ⚠ thay biểu tượng.
- Tên 37 hình: home, orders, plus, me, services, staff, back, next, lock, alert, close, check, contact-card, pin, history, chat, palette, doc-check, money, assign, clock, chart, handset, guests, face, help, bell, megaphone, swap, ban, truck, eye, chevron-down, resize, search, grid, trash (+ minus MỚI).

---

## Luật dùng (có tên token)

| Việc | Luật | Token |
|---|---|---|
| Nút | Chính ≤ 1 mỗi vùng; Phụ cạnh Chính; Lối nhỏ trong dòng; cao 44, 52 ở chân dính | `--nut-h`, `--nut-h-lon`, `--nut-chinh-bg`, `--nut-phu-vien` |
| San hô | Chỉ "Xác nhận đơn để gửi khách" và "+ Tạo đơn" ở thanh trên | `--nut-san-ho-bg`, `--c-nhan` |
| Đỏ đặc | Chỉ trong Hộp xác nhận một chiều | `--nut-nguy-hiem` |
| Ô nhập | Nhãn trên 14/500; "(tuỳ chọn)"; lỗi = viền đỏ + câu cách sửa | `--o-h`, `--o-vien`, `--o-vien-loi`, `--o-nhan-cach` |
| Trạng thái | Chỉ qua từ vựng `HuyHieu trangThai` | `--tt-*-bg`, `--tt-*-chu` |
| Danh sách | Dòng ≥ 44, đệm 12×16, kẻ dưới | `--h-dong`, `--pad-dong`, `--c-vien` |
| Bảng | ≥ 900 bảng hàng 44, tiêu đề dính, số canh phải, hành động cuối; < 900 thẻ ba dòng | `--bang-hang-h`, `--z-dinh` |
| Bảng trượt | < 768 trượt đáy, ≥ 768 hộp thoại 520; chân 1 Chính + 1 Phụ | `--r-bang-truot`, `--w-bang-truot`, `--bang-man` |
| Dải trên trang | Tối đa một, thu gọn 44 | `--dai-tren-h` |
| Báo xong | 3 s, có Hoàn tác, không báo lỗi | `--bao-xong-tg`, `--w-bao-xong` |
| Tiêu điểm | Vành 3 px cách 2 px | `--vanh-tieu-diem`, `--c-tieu-diem` |

---

## Index — thư mục

- `styles.css` — điểm vào CSS (chỉ `@import`).
- `tokens/` — `fonts.css` (@font-face), `goc.css` (tầng 1), `y-nghia.css` (tầng 2), `thanh-phan.css` (tầng 3), `nen-tang.css` (đặt lại, tiêu điểm, khung `.ib-khung`, hoạt ảnh).
- `fonts/` — Be Vietnam Pro, Nunito, Lexend, Noto Sans 400/500/600 (woff2, OFL).
- `assets/` — `logo-96.png`, `app/` (biểu tượng app iPhone), `icons/` (38 SVG).
- `components/<nhom>/<thanh-phan>/` — `.jsx` + `.d.ts` + `.prompt.md` + `.card.html` (trang riêng, xem trước 390 và 1040). CSS mỗi nhóm: `components/<nhom>/<nhom>.css`.
- `guidelines/nen-tang/` — 21 thẻ nền tảng (Thương hiệu, Màu, Chữ, Khoảng cách & hình khối, Chuyển động, Biểu tượng, Tiêu điểm).
- `guidelines/token-goc.html`, `token-y-nghia.html`, `token-thanh-phan.html` — bảng token ba tầng (tên, giá trị, công dụng, nguồn).
- `guidelines/tu-ma-moi-bo.html` — bảng Từ mã / MỚI / BỎ.
- `guidelines/tong-quan-390.html` (Bảng A) và `tong-quan-1040.html` (Bảng B) — mọi thành phần, đánh số 00–26.
- `guidelines/trang/` — công cụ trình bày trang tài liệu (không phát hành).
- `SKILL.md`, `github.md`, `thumbnail.html`.

## Components — danh sách thành phần

| Số | Thành phần | Tên xuất | Thư mục |
|---|---|---|---|
| 00 | Biểu tượng (thêm) | `BieuTuong`, `HINH`, `TEN_BIEU_TUONG` | hien-thi/bieu-tuong |
| 01 | Nút ba cấp × hai cỡ | `Nut` | hanh-dong/nut |
| 02 | Tab | `Tab` | hanh-dong/tab |
| 03 | Ô nhập (chữ, số, tiền, SĐT, ngày, giờ, chọn, nhiều dòng) | `ONhap`, `ghiTien` | nhap/o-nhap |
| 04 | Ô tích, ô chọn một, công tắc | `OTich`, `OChonMot`, `CongTac` | nhap/o-chon |
| 05 | Bộ đếm − / + | `BoDem` | nhap/bo-dem |
| 06 | Chip bấm được | `Chip` | hanh-dong/chip |
| 07 | Huy hiệu trạng thái năm tông | `HuyHieu`, `TU_VUNG_TRANG_THAI`, `BIEU_TUONG_TONG` | hien-thi/huy-hieu |
| 08 | Thẻ (thường, bấm được) | `The` | hien-thi/the |
| 09 | Dòng danh sách | `DongDanhSach` | hien-thi/dong-danh-sach |
| 10 | Bảng máy tính | `BangDuLieu` | hien-thi/bang-du-lieu |
| 11 | Cụm Tìm + Lọc + Sắp xếp + Tải thêm | `CumTimLoc` (+ `PhanTrang`) | dieu-huong/cum-tim-loc |
| 12 | Bảng trượt / hộp thoại | `BangTruot` | phan-hoi/bang-truot |
| 13 | Hộp xác nhận hành động một chiều | `HopXacNhan` | phan-hoi/hop-xac-nhan |
| 14 | Dải thông báo ba tông | `DaiThongBao` | phan-hoi/dai-thong-bao |
| 15 | Báo xong ngắn | `BaoXong` | phan-hoi/bao-xong |
| 16 | Dải trên trang | `DaiTrenTrang` | phan-hoi/dai-tren-trang |
| 17 | Đầu trang | `DauTrang` | dieu-huong/dau-trang |
| 18 | Thanh dính đáy | `ThanhDinhDay` | dieu-huong/thanh-dinh-day |
| 19 | Thanh trên | `ThanhTren` | dieu-huong/thanh-tren |
| 20 | Thanh tab dưới | `ThanhTabDuoi` | dieu-huong/thanh-tab-duoi |
| 21 | Thanh bên nhóm gập | `ThanhBen` | dieu-huong/thanh-ben |
| 22 | Khung xương | `KhungXuong` | hien-thi/khung-xuong |
| 23 | Trạng thái rỗng | `TrangRong` | phan-hoi/trang-rong |
| 24 | Phân trang / tải thêm | `PhanTrang` | dieu-huong/phan-trang |
| 25 | Trang mất mạng | `TrangMatMang` | trang/trang-mat-mang |
| 26 | Trang không quyền / không có trang | `TrangLoi` | trang/trang-loi |

Không có UI kit màn hình — đề bài v2 chốt "chưa vẽ màn hình nào".

### Intentional additions

- `BieuTuong` (00) — bọc 37 hình của mã thành một thành phần để mọi thành phần khác dùng chung một nét.
- Biểu tượng `minus` — Bộ đếm cần nút "−"; bộ cũ không có.
- `ghiTien()` — một chỗ ghi tiền "1.080.000 ₫" cho mọi khổ.
- `TU_VUNG_TRANG_THAI` — từ vựng 23 trạng thái để thực thi "một ý nghĩa, một hình".
- `.ib-khung` — khung ứng dụng (container `ib`) để thành phần đổi khổ theo khung.

## Ghi chú

- Ảnh hiện trạng ở mục 4 của đề bài (6 ảnh `nhieu-*.jpg`) không có trong tệp gửi kèm; bộ dựa vào mô tả một dòng của từng ảnh.
- Bảng trượt / hộp thoại / báo xong trong sản phẩm thật nên dựng ở một gốc lớp phủ ngoài vùng cuộn (gốc đó tự là container `ib`).
