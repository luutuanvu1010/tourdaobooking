<!-- Hồ sơ có ngày (27/10/2026), phụ lục của BAO-CAO.md cùng thư mục: kiểm kê thành phần giao diện TỪ MÃ do một subagent chỉ-đọc lập (không mở trình duyệt). Phần đo TRÊN MÀN HÌNH ở KIEM-KE.md. Không sửa lại cho khớp hiện trạng; có gì mới thì viết bản mới. -->

# Sổ lệch thành phần giao diện — kiểm kê từ mã (public/app.css, web/*.ts, public/*.html)

Ngày lập: 2026-10-27. Nguồn: worktree `danh-gia-ux-tong-the-v2` (HEAD 7b5c8218), chỉ đọc, không mở trình duyệt.
Cách đếm: grep bộ chọn trong `public/app.css` (3.905 dòng; `:root` ở dòng 26–558), rồi tìm nguyên chữ tên lớp trong `web/**/*.ts` (trừ `*.test.ts`), `public/*.html`, `src/shared/*.ts`. Số dòng ghi dạng `app.css:NNN` để người sau kiểm lại bằng `sed -n 'NNNp' public/app.css`. Lớp dựng động trong TS (`chip dp-chip-${tone}`) được ghi chú riêng; "Dùng ở" chỉ liệt kê tệp tiêu biểu khi danh sách dài.

## 0. Số tổng để nhìn nhanh

| Đại lượng | Số | Ghi chú |
|---|---|---|
| Dòng `public/app.css` | 3.905 | `:root` 26–558; mốc "app iPhone (PWA)" ở dòng 875 |
| Token trong `:root` | 470 định nghĩa (464 dòng bắt đầu bằng `--`) | ngoài `:root` chỉ có 1 token nữa: `--dinh-form` (app.css:3723) |
| Dòng bộ chọn (luật CSS) sau `:root` | 2.244 | đếm dòng có `{` hoặc kết thúc bằng `,` |
| Tên lớp khác nhau trong app.css | 1.806 | |
| Tệp `web/*.ts` (không tính test) | 127 | |
| Trang `public/*.html` | 47 | |
| Số lần `min-height: var(--tap-min)` | 155 | trong đó 21 dòng dạng `.<khối> .btn { min-height: var(--tap-min); }` — mỗi khối tự vá lại chiều cao 44px cho nút, vì `.btn` gốc (app.css:591) không khai chiều cao; ở điện thoại mới có `.btn:not(.btn-link) { min-height: 44 }` (app.css:1155) |

## 1. NÚT

Thước đo chung: `--tap-min` 44px, `--h-field` 52px, `--radius-sm` 8px, `--radius-md` 12px, `--radius-pill` 999px, `--fs-ui` 16px, `--fs-label` 14px, `--fs-badge` 12px.

| Kiểu / lớp | Dòng app.css | Nhận dạng (nền · viền · bo · cao · chữ) | Dùng ở (tệp) |
|---|---|---|---|
| `.btn` (gốc) | 591 | nền `#fff` (hex cứng) · viền 1px primary · bo 8 · **không khai chiều cao** (padding `10px 18px` cứng → ≈ 44–46px tuỳ chữ; ≤640px ép 44 ở :1155) · chữ 16 bold | 103 tệp (gần như mọi trang) |
| `.btn-primary` (nhạt) | 594 | nền `--c-btn-soft-bg` · viền soft · chữ soft-text | 80 tệp |
| `.btn-primary[type=submit]`, `.btn-chinh`, `.sheet-foot .btn-primary`, `.login-submit` (đặc) | 597 | nền `--c-btn-primary-bg` đặc · bóng `--shadow-btn-solid` · khoá thì về nhạt (:598) | `.btn-chinh` 23 tệp |
| `.btn-accent` | 599 | nền san hô `--c-accent` đặc · chữ `#fff` (hex cứng) · bóng accent | 18 tệp (Vận chuyển, Trang chủ, Xác nhận đơn, shell) |
| `.btn-danger` | 606 | nền trắng · viền + chữ `--c-danger` | 13 tệp |
| `.btn-link` | 607 | không nền, không viền · gạch chân · cao 44 · padding `4px 8px` cứng · 600 | 40 tệp |
| `.btn-block` | 1298 | như trên, rộng 100%, cao 44 | 9 tệp (bảng trượt) |
| `.pill-btn` / `.pill-btn-danger` | 736–737 | nền xanh nhạt · **không viền** · bo 8 (dù tên "pill") · cao 44 · chữ 14 semibold; danger = san hô nhạt | 11 tệp (catalog, bảng giá, HDV, sessions, staff…) |
| `#order-form .pill-btn` (Việc 8, thang ba cấp) | 1497 | **đổi thành** nền trắng viền 1px primary — cùng tên lớp, khác hình ở trang Tạo đơn | order-form.html, khoi-dua-don, khoi-hanh-khach |
| `.gap-nut` (lối nhỏ "+ Thêm …") | 3748 | không nền/viền · chữ primary · dấu "+"/"−" tự vẽ · cao 44 | khoi-gap.ts |
| `.loc-nut` (bộ lọc đơn, chọn "Đón/Không đón", "Khách lẻ/Qua đối tác") | 629–630 | nền surface · viền 1px `--c-border` · **bo 999** · cao 44 · chữ 14 bold; bật = xanh nhạt + viền primary; nhưng `.dqdt-chon-ai .loc-nut` và `.dd-chon-don .loc-nut` đổi lại bo 8 (:3649, :3231) | orders, khoi-dua-don, dat-qua-doi-tac |
| `.scn-loc-nut` (Sổ công nợ) | 847–848 | nền `--c-card` · viền `--c-border` · bo 999 · chữ primary bold; **bật = nền primary đặc chữ trắng** (khác `.loc-nut` bật = nhạt) | so-cong-no.ts |
| `.catalog-nut-nhom` (nhóm dịch vụ, ô chọn dịch vụ) | 1428–1432 | nền surface · viền border · bo 8 · cao 44 · chữ 16 semibold; chọn = primary đặc | catalog-picker.ts |
| `.ntf-strip button` | 2224 | nền surface · viền primary · bo 8 · cao 44 · chữ **14 heavy** (≈ `.btn` nhưng chữ nhỏ, đậm hơn) | shell, thong-bao-ui |
| `.vc-btn` (khung Vận chuyển) | 2324 | cao 44 · bo 8 · chữ **16 heavy** (`.btn` là bold) · không nền mặc định | 27 tệp |
| ↳ `.vc-btn-line` | 2325 | nền surface · viền primary (≈ `.btn` gốc nhưng chữ heavy) | 3 tệp |
| ↳ `.vc-btn-soft` | 2327 | nền xanh nhạt · viền primary (≈ `.btn-primary` nhạt nhưng có viền primary) | parties.ts |
| ↳ `.vc-btn-ghost` / `-ghost-primary` | 2328–2329 | nền surface · viền `--c-border` xám · chữ đen / chữ primary · bold | 21 tệp dùng `-ghost-primary` |
| ↳ `.vc-btn-stop` | 2330 | nền surface · viền `--c-danger` (≈ `.btn-danger` nhưng chữ `--c-danger-text`) | 2 tệp |
| ↳ `.vc-btn-danger` | 2332 | **đỏ đặc** (nền tảng chung không có nút đỏ đặc) | 7 tệp |
| ↳ `.vc-btn-text` | 2333 | không nền/viền · chữ primary bold (≈ `.btn-link` nhưng không gạch chân) | 6 tệp |
| ↳ `.vc-btn:disabled` | 2338 | xám phẳng `--c-surface-alt`, opacity 1 (`.btn:disabled` là opacity .5, :592) | — |
| ↳ `.vc-bottom-bar .vc-btn`, `.vc-sheet-foot .vc-btn` | 2351, 2495 | rộng 100% · cao **52** (`--h-field`) · chữ 17 | giay-to-ui, xe |
| `.dp-khach-btn`, `.dp-gb-btn`, `.dp-date-btn`, `.dp-cxl-btn` | 2988, 3048, 2820, 2928 | biến thể cỡ chữ của `.vc-btn` (14 / 12 / 20) | tien-do-ui, chuyen, dieu-phoi.html |
| `.vc-seg button` (phân đoạn) | 2411–2412 | không viền · chữ 15 bold muted · chọn = xanh nhạt | xe-sua.ts |
| `.hdv .btn.hdv-claim` ("Nhận") | 1090 | cao **52** · chữ 18 heavy · **bo 12** | viec-cua-toi.ts |
| `.hdv .btn.hdv-act` ("Sửa số khách"/"Huỷ") | 1104 | cao **48** · bo 12 · heavy | viec-cua-toi.ts |
| `.sheet-foot.hdv-sheet-foot .btn` | 1122 | cao 52 · bo 12 · heavy (chân bảng trượt của HDV khác chân bảng trượt chung) | viec-cua-toi.ts |
| `.xb-nut`, `.xb-nut-tuan`, `.xb-nut-lon`, `.xb-them` | 3369–3372 | nền surface · viền `--c-border` · bo 8 · cao 44 · chữ 14 bold primary (tuần: 20; lớn: 16) | lich-xe-ban |
| `.xb-nut-form .btn` | 3379 | ép `.btn` cao 44 chữ 16 | lich-xe-ban |
| `.tl-fab` (nút nổi "Hỗ trợ") | 3119 | fixed góc phải dưới · nền `--c-fab-bg` · bo 999 · bóng float · chữ 14 bold | tro-ly.ts |
| `.tl-mau-nut` (câu hỏi mẫu) | 3166 | nền xanh nhạt · viền `--c-border` · bo 999 · chữ 14 | tro-ly.ts |
| `.dash-day` (3 nút ngày "Chuyến đón") | 1772–1774 | trong khay `--c-surface-alt` bo 999 · nút không viền · chọn = `--c-selected-bg` | home.ts |
| `.dash-hero-nut` (nút tròn trên dải chào điện thoại) | 1850 | 44×44 tròn · nền = màu chữ mờ `--hero-btn-tint` | home.ts |
| `.dash-o-muc` (ô chức năng Trang chủ) | 1813 | không nền; ô biểu tượng `--tile-box` tô theo nhóm (:1815–1820) | home.ts (lớp màu gắn động `dash-o-hop-${mau}`) |
| `.dash-viec-nut .btn` ("Việc của bạn") | 2133 | ép `.btn` cao 44 chữ 14 | home.ts |
| `.counter-btn` (− / +) | 1324 | 44×44 · không nền/viền · chữ 20 bold primary | counter.ts |
| `.login-actions .login-submit` | 1711 | cao **52** · chữ 16 heavy · đặc màu · vòng quay khi gửi | login |
| `.login-actions .login-passkey-btn` | 1718 | 52×52 · viền primary | login.html |
| `.maint-quick .btn[aria-pressed]` | 1668–1669 | `.btn` + bật = `--c-selected-*` | account.ts |
| `.mobile-sum-nut` (mở tóm tắt tiền) | 1476 | không nền/viền · rộng 100% · cao 44 | order-form.html |
| `.hh-loai-nut` (mở/gập loại đối tác) | 3863–3867 | không nền/viền · text-align trái · mũi tên ▾/▴ bằng `::after` | hoa-hong-bang.ts |
| `.buoc-nut` (thanh bước Tạo đơn) | 3733–3738 | không nền · chữ 12 semibold · chấm `--fb-dot` viền `--fb-line` | thanh-buoc.ts |
| `.row-link` (dòng liên kết trang Tôi) | 1041 | rộng 100% · cao 48 (`--row-h`) · kẻ dưới `--c-line` · không nền | account.ts |
| `.scn-ben` (chọn bên trong Sổ công nợ) | 852–853 | dòng cao 44 · kẻ dưới `--c-line` · đang chọn = xanh nhạt | so-cong-no.ts |
| `.catalog-list button` | 1448–1450 | dòng cao 44 · không viền · hover `--c-surface-alt` | catalog-picker.ts |
| `.hd-nut` (chữ "tên nút" trong Hướng dẫn) | 2188 | inline · viền border · bo 8 · nền surface-alt (trang trí, không bấm) | help.ts |
| Nút biểu tượng 44×44 không nền: `.order-card-toggle` 686, `.catalog-tim-xoa` 1423, `.loc-chip-bo` 623, `.sheet-close` 1560, `.bar-back` 1137 | — | 5 lớp, cùng hình | — |
| **Tab / phân đoạn** (họ riêng): `#tabbar .tab` 1144 (icon + chữ 12, chọn = viên xanh nhạt), `.ht-tab` 937 (gạch chân 3px), `.ntf-tab` 2236 (gạch chân, chữ 14 heavy), `.dp-tab` 2835 (khay xanh nhạt, bo 6, cao 40), `.tx-tab` 3427 (viên thuốc xanh nhạt, chọn = `--c-pill-on-bg` đậm), `.vc-seg` 2410 (hộp 2 cột viền), `.dai-anh-em-muc` 3757 (viên thuốc cao 44, chọn = xanh nhạt viền primary), `.dash-day` 1772 (khay viên thuốc) | — | **8 kiểu tab** khác nhau về hình | feedback, thong-bao-ui, dieu-phoi, bang-gia-xe/hoa-hong.html, xe-sua, dai-trang-anh-em, home, shell |

**Đếm kiểu nút khác nhau về hình dáng (nền/viền/bo/cao/cỡ chữ)** — gộp các dòng chỉ đổi cỡ chữ hoặc bố cục:

- Họ `.btn` chung: 6 kiểu (gốc, nhạt, đặc, san hô, nguy hiểm, liên kết).
- Họ `.pill-btn`: 2 kiểu (nền nhạt không viền; trong form Tạo đơn thành viền 1px) + lối nhỏ `.gap-nut` = 3.
- Viên thuốc chọn-được: `.loc-nut` (bật nhạt), `.scn-loc-nut` (bật đặc), `.tl-mau-nut`, `.dash-day` = 4.
- Họ `.vc-btn`: 7 biến thể màu + 1 kiểu khoá xám phẳng + 1 cỡ 52px ở thanh đáy = 9.
- Nút riêng hình: `.catalog-nut-nhom`, `.ntf-strip button`, `.xb-nut`, `.hdv-claim` (52/bo 12), `.hdv-act` (48/bo 12), `.login-submit` (52), `.login-passkey-btn`, `.tl-fab`, `.counter-btn`, `.dash-hero-nut`, `.dash-o-muc`, `.buoc-nut`, `.hh-loai-nut`, `.mobile-sum-nut`, `.row-link`, `.scn-ben`, `.catalog-list button`, `.vc-seg button` = 18.
- Tab/phân đoạn: 8 kiểu.

**Tổng ≈ 48 kiểu nút khác nhau** (6 + 3 + 4 + 9 + 18 + 8), trong đó có ít nhất **4 nút "viền primary trên nền trắng" cùng hình nhưng khác tên** (`.btn`, `.vc-btn-line`, `.ntf-strip button`, `#order-form .pill-btn`) và **3 nút "nền xanh nhạt"** (`.btn-primary`, `.pill-btn`, `.vc-btn-soft`) khác nhau ở viền. Chiều cao nút gặp 5 giá trị: ≈46 (`.btn` máy tính), 44, 48, 52, 40 (`.dp-tab`). Bo góc nút gặp 4 giá trị: 6, 8, 12, 999.

## 2. THẺ (card)

| Kiểu / lớp | Dòng | Nhận dạng | Dùng ở |
|---|---|---|---|
| `.card` | 579 | nền `--c-bg` (bí danh của surface) · **không viền thật, viền vẽ bằng bóng** `--ring-card` + `--shadow-card` · bo 12 · đệm 16 · margin-bottom 16 | 38 tệp (18 TS + 20 HTML) |
| `.card-list > .card` (thẻ thay bảng ở điện thoại) | 727–729 | `.card` xếp flex ngang, margin 0 | 9 tệp |
| `.order-card` | 655 | nền `--c-surface` · viền 1px `--c-border` · bo 12 · bóng · đệm 12×16; rê = nhấc + bóng đậm (:656) | order-card.ts, orders.ts, giao-dien.ts |
| `.svc` (thẻ dịch vụ) | 1331 | nền `--c-card` · viền 1px · bo 12 · bóng; `.svc-the` (form) mở = viền primary + ring 1px (:1353); lỗi = viền đỏ (:1354) | service-card.ts, order-services.ts (`.svc-view`) |
| `.hdv-card` | 1072 | nền surface · viền 1px · bo 12 · **không bóng** | viec-cua-toi.ts |
| `.vc-card` | 2315 | nền surface · viền 1px · bo 12 · bóng (= `.order-card`) | 23 tệp (toàn phân hệ Vận chuyển, Điều phối) |
| `.hdv-head` | 1046 | khối đầu trang HDV dựng như thẻ: nền surface, viền, bo | viec-cua-toi.ts |
| `.dash-so`, `.dash-today`, `.dash-review`, `.dash-loi-tat`, `.dash-so-mt` | 1892, 1904, 2002, 2075, 2054, 2090 | viền 1px · **bo 18** (`--radius-lg`) · bóng; ô số liệu ngăn bằng khe 1px lộ màu viền | home.ts, index.html |
| `.dash-viec-the` ("Việc của bạn") | 2122 | nền `--c-card` · viền · bo 18 · bóng · **đệm 24**; tông cát = viền `--c-sand-border` | home.ts |
| `.dash-viec-rong` | 2135 | thẻ viền bo 18, không bóng, có icon xanh lá | home.ts |
| `.scn-o-tong` (3 ô tổng Sổ công nợ) | 837 | nền card · viền · bo 12 · **không bóng** | so-cong-no.ts |
| `.xm-the` (hàng chờ xác minh, phiếu xoá) | 805 | nền surface · viền **`--c-input-border`** (viền ô nhập, đậm hơn viền thẻ) | xac-minh-hang-cho, phieu-xoa |
| `.hk-the` (hành khách) | 3278 | viền · **bo 8** · đệm 12 | khoi-hanh-khach |
| `.dc-the` (điều chỉnh công nợ) | 3686 | viền `--c-line` · bo 8 | dieu-chinh-cong-no |
| `.pdt-dong` (phần đối tác) | 3669 | nền surface · viền · bo 8; thiếu = nền đỏ nhạt | phan-doi-tac |
| `.cx-the` (chờ xác nhận) | 3833 | nền surface · viền · bo 12 · không bóng | cho-xac-nhan.ts / .html |
| `.hh-lo` (lô loại đối tác), `.hh-tl-cs` (chính sách) | 3862, 3900 | nền `--c-bg` · viền **`--c-line`** · bo 12 · không bóng | hoa-hong-bang, hoa-hong-thiet-lap |
| `.hh-tn-kq` (kết quả tra nhanh) | 3854 | nền `--c-surface-alt` · bo 8 · không viền | hoa-hong-tra-nhanh |
| `.xb-the` (lưới lịch xe bận) | 3382 | nền surface · viền · bo 12 · overflow auto | lich-xe-ban |
| `.maint-card` | 1657 | nền surface · bo 18 · bóng `--shadow-overlay` · không viền · căn giữa | maintenance-screen |
| `.card.fb-tin` (bong bóng tin Hỗ trợ) | 921–923 | bo 18 một góc 6; mình = xanh nhạt; nội bộ = cát viền đứt | ho-tro-luong |
| `.owner-card` | 1620 | viền `--bw-owner` màu primary (khối Người phụ trách) | order-form |
| `.tl-khung` (khung trợ lý) | 3127 | fixed · nền surface · viền · bo 18 · bóng | tro-ly |
| `.pick` / `.dd-che-do` (ô chọn kiểu thẻ) | 1605, 3318 | nền surface · viền · bo 8 · cao 48; chọn = xanh nhạt viền primary | 10 tệp / catalog |
| `.tl-cd-ban-dong`, `.dp-sheet-sum` | 3175, 2712 | khối nền `--c-surface-alt` bo 8 không viền | tro-ly-cai-dat, dieu-phoi |
| `.bk-the`, `.bg-the`, `.dp-cuoc-the`, `.xdc-the`, `.dn-the` | 3520, 3440, 3012, 3103, 3113 | "thẻ" chỉ là thân bên trong `.vc-card`: không viền riêng, chỉ kẻ trên | bang-ke-xe, bang-gia-xe, cuoc, xe-dang-chay, de-nghi |

Tổng: **≈ 14 kiểu thẻ khác nhau** về hình. Lệch rõ ở ba trục: (1) **nền** dùng ba token cùng giá trị trắng (`--c-bg`, `--c-surface`, `--c-card`, app.css:38, 43, 65); (2) **viền** có 4 cách (ring bằng bóng, `--c-border`, `--c-line`, `--c-input-border`) — đếm cả tệp: `border: 1px solid var(--c-border)` 83 lần, `--c-input-border` 6, `--c-line` 4; (3) **bo góc** 8 / 12 / 18 và **bóng** có / không, không theo quy tắc rõ (Trang chủ bo 18, phần còn lại bo 12, thẻ con bo 8).

## 3. BẢNG và DANH SÁCH

| Kiểu / lớp | Dòng | Nhận dạng | Dùng ở |
|---|---|---|---|
| `.table-wrap` + `table.items` | 723–726 | bảng cuộn ngang; ô kẻ dưới `--c-line`, đệm 8 | 11 tệp (audit, catalog, locations, nguoi-ban, parties, sessions, staff, danh-muc-giay-to, ho-tro-nhom, tien-xe-ui) |
| `.card-list` | 727–729 | lưới thẻ thay bảng | 9 tệp (cùng các trang trên) |
| Mốc "bảng → thẻ" chung | 730–735 | `.table-wrap` ẩn **≤899px**, `.card-list` ẩn **≥900px** | — |
| `.vc-table` / `.vc-list` (+ `.vc-wide`/`.vc-narrow`) | 2381, 2371, 2610–2611 | khuôn riêng của Vận chuyển, **cùng mốc 899/900** nhưng dùng lớp ẩn/hiện riêng | xe.html, giay-to-sap-het-han.html |
| Hỗ trợ «Nhóm hỗ trợ» | 943 | dùng lại `.table-wrap`/`.card-list` (mốc 900) | ho-tro-nhom |
| Hoa hồng «ai hưởng gì» `.hh-bang`, `.hh-m` | 3860, 3874 | **không bảng**: lưới 1fr+auto, kẻ `--c-line`; ≤640 ẩn nút nhỏ trong dòng (:3904) | hoa-hong-bang |
| Sổ công nợ `.scn-khung` | 840, 872–873 | hai cột từ **1024px**, một cột ≤720px — **mốc riêng, không trùng 641/900** | so-cong-no |
| Bảng kê `.bk-hang` / `.bk-the` | 3506, 3520 | lưới 5 cột (máy tính) ↔ thẻ (điện thoại) trong `.vc-card` | bang-ke-xe |
| Bảng giá `.bg-hang` / `.bg-the` | 3431, 3440 | lưới 6 cột ↔ thẻ | bang-gia-xe |
| `.line-view` (dòng dịch vụ trang đơn) | 1523–1528 | lưới 1fr+auto, kẻ dưới `--c-border`, đệm 8×0 | order-services.ts |
| `.mline` (dòng trong form) | 1370–1372 | lưới, kẻ dưới `--c-border`, đệm 12×0 | service-card.ts |
| `.line` | 1363 | lưới 1fr+auto, kẻ `--c-border`, đệm 8×0 | service-card, confirmation-image |
| `.kv` (nhãn : giá trị) | 714–716 | flex space-between, đệm `4px 0` cứng; `.kv.strong` chữ 17,6px san hô | order, chuyen, order-form.html |
| `.row-link` | 1041 | dòng cao 48, kẻ `--c-line` | account.ts |
| Dòng kẻ của từng khối (kẻ dưới `--c-border`): `.ht-dong` 967, `.dp-hist-row` 2645, `.dash-today-row` 1776, `.dash-review-row` 1797, `.vc-xe-row` 2384, `.vc-due-row` 2570, `.passkey-row` 890, `.dd-dong` 3288, `.hm-row` 3801, `.catalog-row` 1447, `.dp-leg-hang` 3578, `.dp-gb-dong` 3049 | — | 12 lớp | mỗi lớp 1–2 tệp |
| Dòng kẻ dưới `--c-line` (bí danh cùng giá trị): `.nhom-dong` 759, `.ky-dong` 3604, `.hh-tl-dong` 3898, `.hh-m` 3874, `.scn-ben` 852, `.px-anh-hang` 826 | — | 6 lớp | — |
| Dòng kẻ **trên** (`border-top`): `.cp-dong` 3480, `.tx-dm-dong` 3461, `.hk-hang` 3274, `.bk-the` 3520, `.dp-cc-xong-dong` 3560 | — | 5 lớp | — |

Đếm trong cả tệp: `border-bottom: 1px solid var(--c-border)` 70 lần, `var(--c-line)` 12 lần; `border-top` tương ứng 39 / 10. Tức là "dòng danh sách" được viết lại ≈ 25 lần dưới ≈ 25 tên lớp, cùng một hình (kẻ 1px, đệm 12–16) nhưng không có lớp chung nào ngoài `.line-view`/`.mline`/`.row-link` (mỗi cái 1 tệp).

Điểm gãy "bảng → thẻ": **900/899px** là mốc chung (bảng chung, Vận chuyển, Hỗ trợ); riêng **Sổ công nợ 720/1024**, **form Tạo đơn 960/959** (:1437, :1488), **Trang chủ máy tính 1200/1400** (:2146, :2158).

## 4. HUY HIỆU TRẠNG THÁI / CHIP

| Kiểu / lớp | Dòng | Nhận dạng | Dùng ở |
|---|---|---|---|
| `.badge` | 694 | padding `2px 10px` cứng · chữ **.8rem = 12,8px** (`--fs-old-badge`, lệch thang) · bold · bo `999px` cứng | 25 tệp |
| ↳ `-draft` cát / `-confirmed` xanh lá / `-cancelled` xám / `-delivered` biển nhạt / `-completed` primary đặc | 695–700 | 5 bộ màu | `-draft` 13 tệp, `-confirmed` 10, `-cancelled` 11, `-delivered` 1, `-completed` 0 (dựng động `badge-${khoa}`) |
| `.badge-new` | 2168 | đỏ nhạt | help.ts |
| `.chip` | 1313 | inline · padding `0 8` · chữ 12 semibold · bo 999 · không viền | 46 tệp (nhiều qua src/shared) |
| ↳ `.chip-unit` biển nhạt, `.chip-code`/`.chip-muted` xám, `.chip-warn` cát **có viền**, `.chip-picked` xanh lá có viền | 1314–1317 | 4 tông | 11 / 5+8 / 7 / 1 tệp |
| `.tag-price` | 1318 | san hô nhạt · **bo 8** · chữ 14 semibold | order-services, service-card |
| `.chip.hdv-chip` + `-ok` / `-muted` / `.chip-warn` | 1078–1081 | **chữ 14 bold · bo 12** (đè `.chip` 12/999 theo bản vẽ HDV) · viền `--c-border` | viec-cua-toi, assignee-picker, order-form (ánh xạ tone ở viec-cua-toi.ts:48–50) |
| `.ht-chip` + `.is-moi` / `.is-xu-ly` / `.is-xong` / `.is-tu-choi` | 992–997 | **chip bấm được** · cao 44 · bo 999 · chữ 14 bold · 4 tông (cát / biển / xanh lá / đỏ) | ho-tro-luong |
| `.ht-dem` / `.ht-so` | 939–941 | đếm tròn 20px, chữ 12 heavy; đỏ đặc / biển nhạt | feedback, ho-tro-danh-sach |
| `.vc-chip` + `-danger` / `-warn` / `-ok` / `-muted` | 2316–2320 | chữ 12 bold · **viền 1px theo tông** · bo 999 · `--pad-vc-chip`; `.nhan-chip` heavy + giãn chữ (:3406) | giay-to-ui, lich-xe-ban (tone dựng động `vc-chip-${tone}`, giay-to-ui.ts:27) |
| `.chip.dp-chip-*` (danger/warn/unit/muted/ok/**navy** đặc) | 2704–2710 | 6 tông trên `.chip` 12/999 | dieu-phoi-ui.ts:20 (`dp-chip-${tone}`), order.ts, chi-phi-chuyen |
| `.ntf-chip` + `-qt` / `-ok` / `-muted` | 2256–2259 | chữ 12 **heavy** · padding `1px 8` · viền trong suốt | thong-bao-ui, gui-thong-bao |
| `.svc-chip-gon` | 1347 | cát có viền · 12 bold | service-card |
| `.cp-chip-vien` | 3486 | xám có viền `--c-border` | chi-phi-chuyen |
| `.loc-chip-muc` (chip "đang lọc") | 622 | cao 44 · biển nhạt viền primary · 14 bold | orders |
| `.dash-dai-vai` (nhãn vai) | 1962 | viên thuốc biển nhạt · 12 semibold | home (máy tính) |
| `.order-card-line3.nhap-kt-noi` | 684 | viên xanh lá có viền | order-card |
| `.dp-khoi` / `.dp-lg-o` `.is-plan` / `-run` / `-done` / `-held` / `-nodrv` | 2868–2872 | 5 tông khối chuyến (biển nhạt / primary đặc / xanh lá / đỏ / viền đứt) | dieu-phoi |
| `.fb-status*`, `.fb-step*` | 895–918 | khối trạng thái Góp ý cũ — **không tệp nào còn dùng** (xem mục 15) | — |

**Cùng một ý nghĩa, bao nhiêu bộ màu?** Màu đều lấy từ cùng cặp token (`--c-sand-*`, `--c-green-*`, `--c-danger-*`, `--c-primary-soft`), nên *màu* khớp; cái lệch là *hình* (cỡ chữ 12 / 12,8 / 14; bo 8 / 12 / 999; có viền / không; cao 20 / 44):
- "Cảnh báo / chờ" (cát): `.badge-draft`, `.chip-warn`, `.vc-chip-warn`, `.dp-chip-warn`, `.ntf-chip-qt`, `.ht-chip.is-moi`, `.svc-chip-gon`, `.hdv-chip.chip-warn`, `.alert.warn`, `.banner-warning` → **10 khai báo, ≥ 6 hình**.
- "Xong / tốt" (xanh lá): `.badge-confirmed`, `.chip-picked`, `.vc-chip-ok`, `.dp-chip-ok`, `.ntf-chip-ok`, `.ht-chip.is-xong`, `.dp-lg-o.is-done`, `.dp-banner-ok`, `.alert.ok`, `.nhap-kt-noi` → **10 khai báo**.
- Trạng thái **đơn** (Chờ xác nhận / Đã xác nhận / Đã huỷ): nhãn chữ một nguồn `src/shared/order-status-label.ts:8` (`STATUS_LABEL`); lớp CSS một bộ `.badge-*` (:695–700) do hai chỗ dựng (`web/order-card.ts:108`, `web/order.ts:532` cùng mẫu `badge badge-${khoa}`); ảnh biên nhận vẽ lại bằng canvas với cùng token (`web/confirmation-image.ts:56–60`). → **thống nhất tốt**; nhưng `.badge-draft` bị dùng làm "màu cát chung" cho 12 ý nghĩa khác ("Máy này", "Chưa bật", "Ghi chú nội bộ", "Chưa ai nhận", "Bị khoá đăng nhập", "Không còn trong Sheet"… — account.ts:406, 594; ho-tro-luong.ts:413; ho-tro-danh-sach.ts:109; staff.ts:136; catalog.ts:109).

## 5. Ô NHẬP

| Kiểu / lớp | Dòng | Cỡ chữ · chiều cao · viền · bo | Dùng ở |
|---|---|---|---|
| `input, select, textarea` mặc định | 583 | chữ **16** (`--fs-ui`) · padding `10px 12px` cứng → cao ≈ 46 · viền `--c-input-border` (#c9d4e0) · bo 8 · nền `#fff` cứng; focus = viền `--c-focus` + vành (:585); textarea `min-height: 72px` cứng (:587) | mọi trang |
| `label` mặc định | 582 | chữ **.85rem = 13,6px** (`--fs-old-label`) · màu `--c-muted` · display block | mọi trang |
| `.login-field input` | 1700 | chữ **17** (`--fs-field`) semibold · cao **52** · padding `0 16` · viền input-border · bo 8; nhãn 14 bold (:1697) | login |
| `.vc-input` | 2401 | chữ 17 · min-height **52** · padding `0 12` · viền **`--c-border`** (nhạt hơn mặc định) · bo 8; nhãn `.vc-label` 14 bold (:2400); sai = viền `--bw-vc` đỏ (:2403) | 21 tệp (Vận chuyển, Điều phối, Xác nhận đơn) |
| `.o-noi-khung > input/select/textarea` (nhãn nổi) | 3702–3715 | min-height 52 · đệm trên 24 · nhãn 13 trong khung; ô chọn tự vẽ mũi tên (:3710) | o-nhan-noi.ts, order-form.html, khoi-dua-don, trip-fields |
| `.xb-o` (Lịch xe bận) | 3375 | chữ 16 regular · cao **44** · padding `0 8` · viền `--c-border` · bo 8 | lich-xe-ban |
| `.counter` + `.counter-field` | 1322–1326 | ô số 44 cao · chữ 16 bold · viền border · bo 8; nút ± 44×44 | counter.ts (dùng ở service-card, sheet-so-khach, chuyen, viec-cua-toi) |
| `.price-field` | 1329 | cao 44 · chữ 16 · canh phải | service-card |
| `.assignee-search` | 1639 | cao 44 · chữ 16 **màu primary** · viền border · **bo 12** | assignee-picker |
| `.dash-tim` (ô tìm nổi Trang chủ) | 1856–1861 | cao **52** (`--search-h`) · **bo 999** · bóng `--shadow-search` · chữ 16 medium · input bên trong không viền | home, index.html |
| `.topbar-search` (ô tìm thanh công việc ≥900) | 1245 | dùng ô mặc định, rộng tối đa `--w-search` | shell |
| `.catalog-tim #catalog-q` | 1420–1423 | ô mặc định + đệm 44 hai bên (kính lúp + ✕) | catalog-picker |
| `.scn-tim input`, `.scn-xep select` | 843, 845 | min-height 44 · chữ 17 | so-cong-no |
| `.ht-loc input[type=search]`, `.ht-nhom-them-nguoi input/select`, `.ht-tra-loi textarea` | 966, 952, 1027 | cao 44 · chữ 17 | ho-tro-danh-sach, ho-tro-nhom, ho-tro-luong |
| `.tl-o` (ô chat trợ lý) | 3158 | cao 44 · chữ 16 | tro-ly |
| `.toolbar input` / `select` | 617 | flex `1 1 220px` cứng; ≤640 ẩn nút primary (:1152) | audit, catalog, orders, sessions (HTML) |
| `.gd-dong input[type=color]`, `select` | 3352–3353 | 44×44; rộng `--w-gd-o` | giao-dien |
| Chọn một / nhiều kiểu thẻ: `.pick` 1605, `.dd-che-do` 3318 (cao 48, bo 8), `.chon-o` 770 (viên 44), `label.check` 750, `.vc-check` 2486, `.ntf-groups label` 2284 | — | 6 cách dựng ô tích/chọn | 10 / catalog / catalog / 17 / vc / thong-bao |
| Công tắc: `.dp-switch` 2629 (`--w-switch`×`--h-switch`, nền `--c-border`) | — | 1 kiểu, dùng 3 tệp | chinh-sach-dieu-phoi, ho-tro-nhom, khoi-dua-don |
| Lỗi dưới ô: `.field-error` 1393 (14 semibold đỏ, có icon), `.vc-field-error` 2404 (14 **bold**), `.xb-loi-o` 3377 (13 regular), `.gd-loi` 3355 (14), `.tx-loi` 3455, `.hk-loi` 3275, `.tl-cd-loi` 3163 | — | 7 lớp cho một việc | — |
| Gợi ý dưới ô: `.hint` 1396 (14 medium muted), `.vc-hint` 2405 (14 muted), `.dp-note` 2681 (**12** muted), `.muted` 569 (14,4px `--c-muted`) | — | 4 lớp | — |

Tóm lại: **chữ trong ô có 2 cỡ (16 / 17)**, **chiều cao 3 mức (≈46 mặc định / 44 / 52)**, **viền 2 token (`--c-input-border` mặc định + đăng nhập; `--c-border` ở Vận chuyển, Lịch xe bận, bộ đếm)**, **bo 3 giá trị (8 / 12 / 999)**. Nhãn ô có 3 kiểu: mặc định 13,6px xám; Vận chuyển/Đăng nhập 14 bold đen; nhãn nổi 13 trong khung.

## 6. BẢNG TRƯỢT / HỘP THOẠI

| Cách dựng | Tệp TS | Lớp CSS | Nhận dạng |
|---|---|---|---|
| Khuôn chung `moBangTruot()` | `web/bang-truot.ts:19` | `.sheet-root` 1553, `.sheet-scrim` 1554, `.sheet` 1555, `.sheet-head` 1558, `.sheet-body` 1561, `.sheet-foot` 1567 | điện thoại trượt từ đáy, bo 18 trên, bóng overlay, z 50; **≥641px** hộp giữa màn rộng `--w-sheet` 520 bo 18 (:1570–1572) | được **31 tệp** nhập |
| Tự dựng cùng lớp `.sheet*` (không qua khuôn) | `viec-cua-toi.ts` (`.hdv-sheet` 1107: chữ primary, chân nút cao 52 bo 12), `handler-sheet.ts`, `assignee-picker.ts` (`.assignee-sheet` 1634), `booker-sheet.ts`, `trip-sheet.ts`, `confirmation-dialog.ts` (`.confirm-*` 1581–1591), `thong-bao-ui.ts` | 7 tệp, mỗi tệp một `class: "sheet-root"` | cùng hình với khuôn, nhưng logic đóng/mở/inert chép tay 7 lần |
| Khuôn chung + lớp đè | `home.ts` ("Tất cả chức năng" `.sheet.dash-tc` 1827–1830: cao 88%, đầu không kẻ) ; `catalog.ts` (`.dd-sheet` 3343) ; `dieu-phoi*.ts` (`.dp-sheet-*` 2712, 2931) ; `giay-to-ui.ts` (`.vc-sheet-foot` 2495: nút 52px) | — | biến thể của khuôn |
| Ngăn toàn màn | `thong-bao-ui.ts` | `.ntf-panel` 2226 (fixed inset 0, đầu nền `--c-band-bg` navy :2231); máy tính thành hộp (:2267) ; `.ntf-dialog` 2263 | 1 kiểu riêng |
| Khung nổi kéo/đổi cỡ | `tro-ly.ts` | `.tl-khung` 3127 (fixed, không scrim, bo 18, bóng) + `.tl-fab` | 1 kiểu riêng |
| Lớp phủ bảo trì | `maintenance-screen.ts` | `.maint-screen` 1656 (z 60) + `.maint-card` 1657 (bo 18, bóng overlay) | 1 kiểu riêng |
| `window.confirm()` của trình duyệt | 8 tệp, 17 lần: staff.ts 6, catalog.ts 3, account.ts 2, xac-nhan-don-ui.ts 2, dieu-kien-xuat-ben, home, parties, tro-ly-cai-dat mỗi tệp 1 | — | hộp hệ điều hành, không theo thiết kế |
| Khối gập `<details>` | `.px-hop` 821, `.hd-muc` 2177, `.trip-body` 1398 | viền `--c-input-border` / `--c-line` bo 8 | phieu-xoa, help, order-form |

→ **5 cách dựng hộp thoại** (khuôn chung, chép tay cùng lớp, ngăn toàn màn, khung nổi, confirm() trình duyệt) + 1 lớp phủ. Chân bảng trượt có 4 kiểu nút: chung (`.sheet-foot .btn-primary` đặc, :597), HDV (cao 52 bo 12, :1122), Vận chuyển (cao 52 chữ 17, :2495), Đưa đón (hai cột bằng nhau, :3306).

## 7. THÔNG BÁO / DẢI BÁO / TOAST

| Kiểu / lớp | Dòng | Nhận dạng | Dựng bởi / dùng ở |
|---|---|---|---|
| `.alert` + `.warn` / `.ok` | 611–612, 743 | hộp đỏ nhạt viền đỏ · đệm 12×16 · bo 8 · margin-bottom 16 | `#error` của hầu hết trang (105 tệp có `error`; HTML đặt sẵn `role="alert"`) |
| `.banner` + `-danger` / `-warning` / `-info` | 1301–1308 | **cùng hình `.alert`** (đệm 12×16, bo 8, viền 1px) nhưng tên khác, có `.banner-actions`, `.banner-edit` | `web/banner.ts` vẽ từ `src/shared/order-errors.ts`; 31 tệp |
| `#error` cuộn tới | 1310 | `scroll-margin-top` chừa thanh đầu | order-form |
| `.toast-vung` + `.toast` | 2191–2194 | fixed · liên kết nổi cao 44 · chữ 14 semibold · nền surface viền border + vạch trái · tự ẩn 6 s · tối đa 3; `.toast-bao` báo ngắn không bấm | `web/toast.ts` (Bảng tin WebSocket qua `bangtin.ts`; báo ngắn `hienBaoNgan` chỉ `api.ts` gọi) |
| Vị trí toast theo trang | 2195–2204 | điện thoại trên/dưới tuỳ có thanh Lưu dính; trang bốn bước đặt dưới thanh bước (`--toast-tren`) | order-form |
| `.ntf-strip` (thông báo quan trọng) | 2219–2224 | dải cát viền dưới cát, có icon + nút viền primary | shell, thong-bao-ui |
| `.maint-strip` (bảo trì) | 1665 | dải cát cao 44, chữ 14 bold, căn giữa | shell, home, thong-bao-ui |
| `.mfa-strip` (bảo mật hai lớp) | 3763 | dải **đỏ** cao 44, chữ 14 bold, căn giữa (cùng hình `.maint-strip`, khác màu) | shell |
| `.sheet-warn` | 1562 | cảnh báo cát trong bảng trượt, chữ 14 semibold | 5 tệp |
| `.svc-warn` | 1395 | cảnh báo cát trong thẻ dịch vụ, chữ 14 | service-card |
| `.vc-alert` + 4 tông | 2321, 2317–2320 | hộp đệm 8×12 · chữ 14 **bold** · viền theo tông · bo 8 (nhỏ hơn `.alert`) | giay-to-ui |
| `.vc-warnbox`, `.vc-renew-note` | 2522, 2483 | hộp cát bold / hộp biển nhạt, bo 8 | giay-to-ui |
| `.dp-banner-ok`, `.dg-warn` | 2711, 2692 | tông thêm trên `.banner` | dieu-phoi-ui, dat-gap-ui |
| `.canh-bao-dt` (khung "số này của đối tác") | 3785 | khung nền cát dưới ô SĐT | canh-bao-doi-tac |
| `.pdt-cho-muc`, `.maint-confirm`, `.ntf-confirm`, `.tl-tin-loi`, `.dd-nhac`, `.hk-nhac-don`, `.xdc-nhac` | 3667, 1673, 2304, 3146, 3293, 3297, 3109 | 7 hộp/câu nhắc riêng từng khối | — |
| Câu "Đã lưu" (thành công) | — | **≥ 9 cơ chế** khác nhau: `dai("ok")` ban.ts:69; `bao = {loai:"ok"}` chinh-sach-dang-nhap-ui.ts:48; `showError(okEl, …)` chinh-sach-dieu-phoi.ts:236 (dùng ô lỗi để báo thành công); `textContent` catalog.ts:667, ho-tro-nhom.ts:67; `taiLai(msg)` han-muc-tu-choi-the.ts:131; `banner("info")` order.ts:1510; `bao.ok()` tro-ly-cai-dat.ts:74; `baoSauLenh` order.ts:325; `thanhCong()` viec-cua-toi.ts:224; toast `hienBaoNgan` api.ts | 15 tệp có chữ "Đã lưu" |

→ Thông báo lỗi chặn có 2 họ cùng hình khác tên (`.alert`, `.banner`) + 1 họ nhỏ hơn (`.vc-alert`); dải trên trang có 3 lớp cùng hình (`.ntf-strip`, `.maint-strip`, `.mfa-strip`); báo thành công không có kiểu chung.

## 8. ĐẦU TRANG

| Kiểu | Dòng | Nhận dạng | Dùng ở |
|---|---|---|---|
| `#topbar` chung — máy tính | 572, 1233–1292 | thanh trắng (`body.has-sidebar`), breadcrumb `.bar-title` cắt chữ, ô tìm từ 900, nút "Lập đơn mới" san hô từ 641, chuông; cao `--bar-h` 60 | 47 trang HTML + shell.ts |
| `#topbar` chung — điện thoại ≤640 | 1134–1138, 1160–1161 | sticky · cao 60 + vùng an toàn · `.bar-back` 44×44 · `.bar-title` **18 heavy** cắt "…" · `.bar-avatar`; `main > h1` ẩn khỏi mắt | shell.ts (`body[data-title]`) |
| Trang chủ điện thoại — dải chào | 1836–1850 | `#topbar` thành dải hero: avatar `--hero-avatar`, lời chào 14/17/13, chuông và nút tròn trên nền `--c-on-hero`; `body::before` dải navy vùng an toàn | home.ts |
| Trang chủ máy tính — lời chào | 1956–1964 | `.dash-dai` trên nền trang: ngày 13, lời chào **32** (`--fs-home-greet`), nhãn vai viên thuốc, viên bảo trì cát | home.ts, index.html |
| Chi tiết đơn | 720–722, 1532–1538 | `.detail-head` (h1 ẩn) + `.order-summary-band` dải gradient biển→ngọc chữ trắng, 4 ô nhãn 12 / giá trị 18, "Còn lại" vàng | order.ts |
| Đăng nhập | 1691–1692 | logo `--logo-login` bo icon iOS + h1 **26** (32 ở ≥900) căn giữa | login.html |
| Vận chuyển `.vc-page-head` | 2342–2343 | h1 **26** heavy + nút phải; `.vc-crumb-pre` breadcrumb riêng; `.vc-hello h1` 26 (trang đầu tài xế :2587); `.vc-due-top h1` **18** (:2560); `.vc-xe-head` khối đầu chi tiết xe (:2435) | 6 HTML + giay-to-ui, tai-xe.html |
| Điều phối `.dp-head` | 2817–2818 | h1 **24** (`--fs-vc-plate`) heavy + nút ngày; `.dp-ct-head` 2743; `.dp-cuoc-head h1` 26 (:3005); `.dp-cc-head` 3026 | dieu-phoi.html, chuyen.ts, ban/cuoc.html |
| HDV `.hdv-head` | 1046 | khối **dựng như thẻ** (nền surface, viền, bo) chứa tiêu đề + chip | viec-cua-toi |
| Hỗ trợ `.ht-dau` | 934–935 | h1 + nút, flex space-between; `.ht-tabs` gạch chân | feedback.html |
| Hoa hồng `.hh-dau` | 3844–3846 | h1 + nút "Thêm mức" (ẩn ≤640) | hoa-hong.html |
| Sổ công nợ `.scn-ct-dau h2` | 858 | h2 + nút | so-cong-no |
| Lịch xe bận `.xb-head` | 3365 | flex wrap space-between | lich-xe-ban.html |
| Bảng giá `.bg-dau` | 3420–3422 | h1 + câu muted | bang-gia-xe.html |
| Bảng kê `.bk-nhom-dau` | 3499 | dải nền `--c-band-bg` navy chữ trắng | bang-ke-xe |
| `h1` mặc định | 566–567 | **24** (`--fs-h1` 1.5rem) · màu primary · font display · margin-bottom 12 | các trang cũ (catalog, staff, parties…) |
| Dải trang anh em `.dai-anh-em` | 3755–3760 | hàng viên thuốc cao 44 dưới đầu trang (menu theo việc 15/10) | dai-trang-anh-em.ts |
| Đầu ngăn/hộp: `.sheet-head` 1558 (kẻ dưới), `.ntf-panel-head` 2231 (navy), `.tl-dau` 3132 (surface-alt) | — | 3 kiểu đầu hộp | — |

→ **≈ 12 kiểu đầu trang**; cỡ tiêu đề trang gặp **6 giá trị**: 18 (`.bar-title`, `.vc-due-top`), 20 (`--fs-hdv-h`), 24 (`h1` mặc định, `.dp-head`), 26 (`--fs-vc-h`, đăng nhập), 32 (Trang chủ máy tính, đăng nhập rộng); màu h1 lúc primary (mặc định :566) lúc `--c-text` (`.vc-hello` :2587, `.dash-dai-loi` :1959). Breadcrumb có 2 cách (`.bar-title` chung và `.vc-crumb-pre` riêng Vận chuyển).

## 9. THANH DÍNH (đáy / đỉnh / nổi)

Trong tệp có 18 `position: sticky` và 10 `position: fixed`.

| Thanh | Dòng | Nhận dạng |
|---|---|---|
| `#topbar` điện thoại | 1134 | sticky top, z 20, cao 60 + vùng an toàn |
| `#tabbar` | 1143 | fixed bottom, z 30, cao 56 + vùng an toàn, nền kính mờ `--c-tabbar-glass` |
| `#sidebar` máy tính | 1267 | sticky top, cao 100vh |
| `.sidebar-group` nút Thiết lập | 1194 | sticky đáy vùng cuộn thanh bên |
| `.form-actions` (Lưu đơn) | 717; điện thoại 1165 | sticky bottom; điện thoại nền `--c-bg`, kẻ trên **`--c-line`**, chừa thanh home |
| `.buoc-thanh` (thanh bước Tạo đơn) | 3729 | sticky top, z 6, cao `--h-buoc-thanh`, nền `--c-alt` |
| `.form-side`, `.order-layout .side` | 1504, 1546 | cột phải sticky top 16 (≥960 / ≥900) |
| `.vc-bottom-bar` (nút chính Vận chuyển) | 2350 | sticky bottom **trên thanh tab** (`--tabbar-h`), nền `--c-surface-alt`, kẻ trên `--c-border`, nút rộng 100% cao 52; ẩn ≥641 |
| `.vc-filters` | 2369 | sticky top dưới thanh đầu, nền surface-alt, cuộn ngang |
| `.ht-tra-loi` (ô trả lời Hỗ trợ) | 1025 | sticky bottom, z 5, nền surface-alt, kẻ trên border |
| `.dp-nhieu` (chọn nhiều chặng) | 3584 | sticky bottom, z 2, nền surface-alt, bo dưới 12 |
| `.scn-ct-khu` / `.scn-phep-tinh` | 873 | sticky top / bottom chỉ ≥1024 |
| `.gd-xem` (xem trước Giao diện) | 3360 | sticky top ≥900 |
| `.catalog-muc` (tiêu đề mục danh mục) | 1446 | sticky top trong danh sách cuộn |
| `.dp-tl-nhan`, `.dp-tl-nhom-t`, `.xb-dau-xe`/`.xb-xe` | 2878, 2886, 3388 | sticky trái/trên trong lưới thời gian |
| `.tl-fab` | 3119 | fixed góc phải dưới, nhích lên theo `--tl-nang` khi có thanh đáy; ẩn khi mở bảng trượt / tài xế đang chạy (:3121, :3565) |
| `.tl-khung`, `.sheet-root`, `.maint-screen`, `.ntf-panel`, `.toast-vung`, `body.trang-chu::before` | 3127, 1553, 1656, 2226, 2191, 1836 | các lớp fixed còn lại |

→ Thanh dính **đáy** có 5 kiểu nền/kẻ: `.form-actions` (bg + `--c-line`), `.vc-bottom-bar` (surface-alt + border, đứng trên tabbar), `.ht-tra-loi` (surface-alt + border), `.dp-nhieu` (surface-alt + bo dưới), `.sheet-foot` (surface + border). z-index gặp: 2, 4, 5, 6, 20, 30, 40, 50, 60 và token `--z-*` (3 cái).

## 10. KHUNG XƯƠNG / ĐANG TẢI / RỖNG

| Kiểu | Dòng | Nhận dạng | Dùng ở |
|---|---|---|---|
| `.skeleton-list` + `.skeleton-row` | 690–693 | dải cao `--h-order-skeleton` 76 bo 12 viền, nhịp `skeleton-pulse` 1,2 s | orders.html, index.html |
| Khung xương Trang chủ điện thoại `.dash-xg-*` | 1872–1891 | 8 token riêng `--skel-sm/md/title/num/tag/time/money/pill` (:451–458) | index.html |
| Khung xương Trang chủ máy tính `.dash-xuong-mt .dash-xg-*` | 1980–2000 | 6 token riêng `--skel-*-mt` (:503–508) | home.ts |
| Khung xương "Việc của bạn" | 1985 | cùng lưới thẻ thật | home.ts |
| Vòng quay `.login-spinner` | 1714–1717 | 16px, chỉ ở nút Đăng nhập (`--spinner`, :163) — **vòng quay duy nhất toàn Nền tảng** | login.html |
| Chữ "Đang tải…" | — | 16 tệp (catalog, so-cong-no, phieu-xoa, tien-xe-ui mỗi tệp 2 lần…), thường gán vào `.muted` hoặc ô trạng thái `.pick-status` 1615 / `.confirm-status` 1582 | — |
| Rỗng kiểu câu căn giữa: `.empty` 711 (đệm 24, `--c-muted`), `.pick-empty`/`.pick-status` 1615, `.assignee-empty` 1651, `.ntf-empty` 2260, `.vc-filter-empty` 2380, `.cp-trong` 3492 | — | 6 lớp, cùng ý "câu xám căn giữa" nhưng đệm/cỡ khác | — |
| Rỗng kiểu câu căn trái: `.catalog-empty` 1463, `.svc-empty` 1361, `.dp-reason-empty` 2668, `.dp-stop-empty` 2773, `.dp-col-empty` 2851, `.vc-empty-line` 2601, `.dp-cuoc-trong` 3025, `.xdc-rong` 3110, `.hk-trong` 3270, `.dd-trong` 3203, `.ht-trong` 976 | — | 11 lớp | — |
| Rỗng kiểu khối có biểu tượng: `.vc-empty` 2357 (icon primary, tiêu đề display 19, câu 15), `.hdv-empty` 1064 (viền đứt, semibold căn giữa), `.dash-viec-rong` 2135 (thẻ viền bo 18, icon xanh lá) | — | 3 lớp, 3 hình | — |
| Câu "Chưa có … / Không có …" | — | 51 tệp TS | — |

→ "Đang tải" có **4 cách** (khung xương thẻ đơn, khung xương Trang chủ ×2, vòng quay, chữ); "rỗng" có **20 lớp, 3 hình**.

## 11. Tiền tố lớp theo khối (số dòng bộ chọn chứa tiền tố, sau `:root`)

| Tiền tố | Dòng bộ chọn | Khối / đợt | Tiền tố | Dòng | Khối / đợt |
|---|---|---|---|---|---|
| `.dp-` | **444** | Điều phối xe, chuyến, tài xế (ADR-0049…) | `.scn-` | 40 | Sổ công nợ |
| `.vc-` | **279** | Vận chuyển 1a (ADR-0040) | `.bk-` | 36 | Bảng kê xe thuê |
| `.dd-` | 132 | Đưa đón trang đơn + danh mục (ADR-0047) | `.order-` | 31 | Thẻ đơn / trang đơn |
| `.is-` | 116 | trạng thái dùng chung | `.btn-` | 30 | nút chung |
| `.ht-` | 98 | Hỗ trợ thiết kế lại (PR 3) | `.cp-` | 29 | Chi phí chuyến |
| `.hh-` | 80 | Hoa hồng (PR 2) | `.hk-` | 27 | Hành khách |
| `.hdv-` | 79 | Việc của tôi HDV (ADR-0030) | `.loc-` | 25 | Bộ lọc đơn |
| `.dash-` | 77 | Trang chủ (điện thoại + máy tính) | `.dg-` | 23 | Đặt gấp |
| `.ntf-` | 72 | Thông báo (ADR-0034) | `.nhom-` / `.cx-` / `.assignee-` | 21 / 21 / 21 | Nhóm dịch vụ / Chờ xác nhận / Người phụ trách |
| `.svc-` | 69 | Thẻ dịch vụ form | `.o-` | 20 | Ô nhãn nổi |
| `.login-` | 60 | Đăng nhập (Claude Design 24/9) | `.maint-` / `.hd-` | 19 / 19 | Bảo trì / Hướng dẫn |
| `.tl-` | 59 | Trợ lý Hỗ trợ (ADR-0066) | `.xm-` / `.line-` | 18 / 18 | Xác minh / dòng dịch vụ |
| `.xb-` | 52 | Lịch xe bận (ADR-0055) | `.pdt-` / `.owner-` / `.mfa-` / `.hm-` | 17 ×4 | Phần đối tác / Người phụ trách / Hai lớp / Hạn mức |
| `.fb-` | 46 | Góp ý cũ + bong bóng tin (một phần chết) | `.chon-` / `.bb-` | 15 / 15 | Chọn nhiều / Báo bận |
| `.catalog-` | 46 | Ô chọn dịch vụ 18/10 | `.gd-` / `.dqdt-` / `.dc-` / `.buoc-` / `.bg-` | 13 ×5 | Giao diện / Đặt qua đối tác / Điều chỉnh công nợ / Bốn bước / Bảng giá |
| `.tx-` | 45 | Tiền xe thuê (ADR-0057) | `.sheet-` | 42 | bảng trượt chung |
| `.sidebar-` | 44 | Thanh bên (ADR-0015) | `.card-` / `.chip-` / `.badge-` / `.counter-` | 6 ×4 | thành phần chung |

Gộp theo phân hệ: **Vận chuyển + Điều phối + Tiền xe + Lịch xe + Báo bận + Đặt gấp + Xe đang chạy + Đề nghị** (`.dp- .vc- .xb- .tx- .bk- .bg- .cp- .bb- .dg- .xdc- .dn-`) = **953 dòng ≈ 42 %** của 2.244 dòng; các lớp thành phần chung thật sự (`.btn- .card- .chip- .badge- .sheet- .counter- .line- .field- .banner- .toast-`) = **≈ 125 dòng ≈ 6 %**. Có **64 tiền tố** từ 3 dòng trở lên.

## 12. Token `:root` theo nhóm chú thích (dòng 26–558)

| Nhóm (dòng mở đầu) | Token | Nhóm (dòng mở đầu) | Token |
|---|---|---|---|
| tourdaovn chuẩn (27) | 11 | Vận chuyển 1a (233) | **40** |
| Thị giác 1.70 nền/viền/bóng (39) | 17 | Bảng điều phối lượt 1 (276) | **41** |
| Hai vai phông (59) | 3 | Lịch xe bận (319) | 17 |
| Bí danh tên cũ (64) | 4 | Đưa đón / hành khách (338) + danh mục (348) | 9 + 2 |
| MỚI: màu nguy hiểm (69) | 5 | Tiền xe thuê (351) + hai chỗ đậm (377) | 14 + 5 |
| MỚI: ngôn ngữ form (75) | 6 | Màu theo vai (366) | 9 |
| Thang cỡ chữ 14 bậc + vai (82) | 20 | Nút lưu/xác nhận chính 1.70 (384) | 25 |
| Cỡ chữ khối cũ, rem (105) | 9 | Độ đậm chữ (411) | 6 |
| Riêng Island Booking System (121) | 27 | Trang chủ điện thoại (420 + 423) | **33** |
| Đăng nhập (149) | 30 | Trang chủ máy tính (459) | **48** |
| Thanh bên Đợt D (180) | 14 | Thị giác 1.70 "Năng động…" (509) | 20 |
| Việc của tôi HDV (197) | 12 | Ảnh biên nhận (532) | 4 |
| Người phụ trách (211) | 1 | Dải tóm tắt đơn (538) | 5 |
| Thông báo hệ thống (214) | 8 | Ô chức năng Trang chủ (545) | 6 |
| Trợ lý Hỗ trợ (223) + vị trí khung (231) | 7 + 1 | Chuyển động (552) | 5 |

Tổng 470. Theo tiền tố: `--c-` 103, **`--w-` 92**, `--fs-` 56, **`--h-` 34**, `--home-` 17, `--skel-` 14, `--radius-` 12, `--lh-` 11, `--shadow-` 9, `--fw-` 7, `--dp-` 7, `--hero-` 6… (54 tiền tố).

- **Cỡ chữ `--fs-*`: 56 token** — 14 bậc thang (`--fs-step-1…14`, 12→32px) + 42 token "theo vai" trỏ về bậc (`--fs-ui/label/badge/field/title/counter`, `--fs-hdv-*` 5, `--fs-vc-*` 7, `--fs-dp-*` 8, `--fs-home-*`/`--fs-stat`/`--fs-viec-so`/`--fs-login-*`/`--fs-bar-title`…) + 3 token cũ bằng **rem lệch thang** (`--fs-old-badge` .8rem = 12,8px, `--fs-old-label` .85rem = 13,6px, `--fs-old-muted` .9rem = 14,4px, :108–110) + `--fs-h1` 1.5rem, `--fs-h2` 1.1rem (17,6px), `--fs-pin` 1.25rem.
- **Bề rộng riêng từng màn `--w-*`: 92 token** (`--w-vc-*` 14, `--w-dp-*` 13, `--w-tx-*` 5, `--w-home-*` 5, `--w-hk-*` 4, `--w-hdv-*` 4, `--w-dd-*` 4, `--w-bk-*` 4, `--w-bg-*` 4, `--w-xb-*` 3…). **Chiều cao riêng `--h-*`: 34 token** (`--h-dp-*` 7, `--h-vc-*` 6, `--h-hdv-*` 2, `--h-field`, `--h-field-wide` cùng = 52…). Tức là **126 / 470 token (27 %) là số đo của một màn cụ thể**.
- Chiều cao "ô/nút" có 4 token cùng họ: `--tap-min` 44, `--counter-btn` 44, `--h-field` 52, `--h-field-wide` 52, `--h-hdv-btn` 52, `--h-hdv-act` 48, `--search-h` 52, `--row-h` 48, `--h-dp-tab` 40.

## 13. Giá trị cứng ngoài token

- **Sau mốc "app iPhone (PWA)" (dòng 876–3905), đã bỏ comment và dòng `@media`: 0 giá trị px (≠ 0/1px), 0 hex, 0 rgb().** Luật `web/CLAUDE.md` được giữ đúng ở phần này (tests/e2e/pwa.mjs kiểm).
- **Trước mốc (dòng 559–875, phần "trang cũ")**: 18 giá trị px ≠ 0/1 và 3 hex, tập trung ở chính các thành phần nền: `input/select/textarea` padding `10px 12px`, nền `#fff` (:583); `textarea min-height: 72px` (:587); `.btn` padding `10px 18px`, nền `#fff` (:591); `.btn-accent` chữ `#fff` (:599); `.btn-link` padding `4px 8px` (:607); `.toolbar input` `220px` (:617); `.badge` `2px 10px`, bo `999px` (:694); `.kv` `4px 0` (:714); `.secret` viền `2px` (:744); `.row-actions .btn-link` `4px 6px` (:748); `.badge + .badge` `8px` (:749); `label.check` `4px 0` (:750); `.scn-nhom-dau` viền `2px` (:861). Tệp tự ghi chú Sổ công nợ "đặt trước dấu mốc app iPhone vì có px" (:834).
- Trong `:root` còn 7 hex thương hiệu và ≈ 20 `rgba()` cho bóng — hợp lệ vì là token.

## 14. Media query (123 khối thật, bỏ 8 dòng chỉ là chữ trong comment)

| Điểm gãy | Số khối | Dùng cho |
|---|---|---|
| `(min-width: 641px)` | 30 | thanh bên / bỏ thanh tab, hộp thoại giữa màn, Trang chủ máy tính |
| `(max-width: 640px)` | 28 | điện thoại: thanh đầu, tab, nút 44, form dính |
| `(min-width: 640px)` | **1** (:589) | `.grid.two/.three` chia cột — **lệch 1px** với cặp 640/641: ở đúng 640px lưới đã 2–3 cột nhưng vẫn là khổ điện thoại |
| `(min-width: 900px)` | 28 | bảng thay thẻ, ô tìm thanh trên, bố cục 2 cột các trang |
| `(max-width: 899px)` | 11 | ẩn bảng |
| `(min-width: 960px)` / `(max-width: 959px)` | 4 / 1 | form Tạo đơn hai cột (:1437, :1488) |
| `(min-width: 1200px)` | 2 | Trang chủ máy tính hai cột, bảng điều phối 2a |
| `(min-width: 1400px)` | 1 | Trang chủ máy tính (:2158) |
| `(min-width: 1024px)` / `(max-width: 720px)` | 1 / 1 | **chỉ Sổ công nợ** (:872–873) |
| `(hover: hover)` | 10 | rê chuột |
| `(prefers-reduced-motion: reduce)` | 5 | tắt chuyển động |

→ **7 mốc bề rộng** (640, 641, 720, 900, 960, 1024, 1200, 1400); chuẩn chung là 641 và 900, còn 640 / 720 / 960 / 1024 là mốc riêng của 3 khối.

## 15. Lớp nghi không còn dùng (không tìm thấy nguyên chữ ở web/, public/, src/shared/)

Script quét 1.806 tên lớp: 61 lớp không thấy, trong đó 33 có thể dựng động (`is-*`, `*-chip-${tone}`, `badge-${khoa}`, `dash-o-hop-${mau}` — home.ts:523) nên chưa kết luận. **28 lớp còn lại nghi chết**, đáng kiểm: `.fb-status`, `.fb-status-nhan`, `.fb-status-nhanh`, `.fb-status-nut`, `.fb-step`, `.fb-step-dot`, `.fb-steps`, `.fb-uu-tien-o` (khối Góp ý cũ, app.css:894–931); `.hh-doi-tac`, `.hh-loai`, `.hh-loai-nhan`, `.hh-loai-ten`, `.hh-mucta`, `.hh-mucta-dau`, `.hh-tn-kq-khung` (Hoa hồng trước PR 2, :3624–3643); `.dd-goi-y-chua-chot`, `.dd-goi-y-tu-do`; `.login-maintenance`; `.narrow`; `.sum-ghi-chu`; `.loc-nhom-dem`; `.dash-o-so-cat/-san-ho/-xanh` và `.dash-o-hop-chot/-toi/-vc`, `.dash-viec-the-cat` (có thể dựng động từ tên màu — cần đọc `src/shared/trang-chu-o.ts`). Chưa kiểm bằng trình duyệt; chỉ là nghi vấn từ grep.

## Nhận xét

1. Lệch rõ nhất nằm ở **nút và chip**: cùng một hình "viền primary trên nền trắng, cao 44, bo 8" tồn tại dưới ít nhất 4 tên (`.btn`, `.vc-btn-line`, `.ntf-strip button`, `#order-form .pill-btn`), và `.btn` gốc không khai chiều cao nên 21 khối phải tự vá `min-height: 44`; chip có 7 họ (`.badge`, `.chip`, `.hdv-chip`, `.ht-chip`, `.vc-chip`, `.dp-chip-*`, `.ntf-chip`) với 3 cỡ chữ (12 / 12,8 / 14) và 3 bo góc (8 / 12 / 999) cho cùng ý nghĩa cát/xanh/đỏ.
2. **Mỗi đợt vẽ một ngôn ngữ riêng** đo được bằng tiền tố: 64 tiền tố, riêng cụm Vận chuyển–Điều phối chiếm 42 % luật CSS và 126 token `--w-*`/`--h-*` là số đo của từng màn; thành phần chung chỉ ≈ 6 % luật. Hộp thoại có 5 cách dựng, chân bảng trượt 4 kiểu nút, thanh dính đáy 5 kiểu nền, báo "Đã lưu" ≥ 9 cơ chế, trạng thái rỗng 20 lớp.
3. Thẻ và danh sách lệch ở **ba token cùng giá trị** (`--c-bg`/`--c-surface`/`--c-card` đều trắng; `--c-line` = `--c-border`) và ở bo góc 8/12/18, bóng có/không: ≈ 25 lớp "dòng kẻ 1px" không có lớp chung.
4. Ô nhập lệch ở cỡ chữ 16 vs 17 (`--fs-ui` vs `--fs-field`), chiều cao ≈46 / 44 / 52, hai token viền; nhãn ô 13,6px xám (trang cũ) đối đầu 14 bold đen (Vận chuyển, Đăng nhập).
5. Điểm gãy: chuẩn 641/900 đã bám tốt (58 + 39 khối), nhưng còn 640 (lệch 1px), 720/1024 (Sổ công nợ), 960 (form), 1200/1400 (Trang chủ) — và mốc "bảng → thẻ" thì thống nhất ở 900.
6. **Đã thống nhất tốt**: (a) sau mốc PWA không còn px/hex/rgb cứng — 0/0/0; (b) thang cỡ chữ 14 bậc và 5 mức độ đậm được mọi khối mới trỏ về; (c) màu trạng thái đều lấy từ cùng cặp token cát/xanh lá/đỏ/biển nên *màu* khớp dù *hình* lệch; (d) nhãn và lớp trạng thái đơn có đúng một nguồn (`order-status-label.ts` + `.badge-*`, biên nhận vẽ cùng token); (e) khuôn bảng trượt `moBangTruot` đã được 31 tệp dùng, chỉ 7 tệp cũ hơn còn chép tay; (f) vùng chạm 44px được giữ gần như khắp nơi (155 lần).
7. Phần "trang cũ" trước dòng 875 (`.btn`, `input`, `.badge`, `label`, `.kv`) vẫn là nơi giữ px/hex cứng và cỡ chữ rem lệch thang — đây là lớp nền mà mọi khối mới đè lên, nên sửa ở đây sẽ kéo theo nhiều màn.
