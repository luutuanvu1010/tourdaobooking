# Bằng chứng: Trang chủ mới + khung điều hướng dọc — Đợt D (2026-09-23)

**Cập nhật Task 6 (2026-09-23):** README này ĐÃ VIẾT LẠI TOÀN BỘ — bản trước mô tả trạng thái sau Task 3 (trang ở
`/home`, chưa có thanh bên dọc, chỉ 3 ảnh, "12 bước"). Từ Task 4 (ADR-0015) và Task 5, trang đã đổi rất nhiều:
thanh điều hướng dọc thay thanh ngang ở máy tính, `/` là Trang chủ (không còn `/home`), `/orders` là Đơn hàng.
Mã được đo: cây làm việc **sạch** trên nhánh `worktree-trang-chu-moi`, đứng sau Task 1–5 và Task 6 (Phần A, F-1…
F-5) — xem `git log` để biết mã băm chính xác lúc đọc README này.

Artifact bằng chứng cho toàn bộ kế hoạch "Đợt D — khung điều hướng dọc" (`docs/superpowers/plans/2026-09-23-dot-
d-khung-dieu-huong-doc.md`) và kế hoạch gốc "Trang chủ mới" (`docs/superpowers/sdd/2026-09-23-trang-chu-moi/`).
Hiến pháp §8.2: bằng chứng thay cho lời khai. Đây là **bằng chứng hành vi trình duyệt DUY NHẤT** cho Trang chủ và
cho khung dùng chung (thanh bên, thanh công việc) — `npm test` (luật thuần) và `npm run test:e2e -- pwa` (chỉ phủ
manifest/service worker/meta iOS) không chạm DOM thật của `web/home.ts`/`web/shell.ts`.

Đo trên `wrangler dev` cục bộ với D1 tạm và tài khoản thử (ADMIN `0900000204`, cộng một tài khoản FIELD và một tài
khoản SALES mới tạo riêng cho kịch bản), bằng Chrome headless qua CDP, hai khổ chính: máy tính 1040×800
(`deviceScaleFactor: 1`) và điện thoại 390×844 (`deviceScaleFactor: 2`), cộng một dải khổ 640…1920px để quét khung
dùng chung (mục G). **Không phải** đo trên iPhone thật, mạng thật hay Workers Assets thật.

## Ký duyệt thị giác

**Chưa ký.** Nội dung ảnh đã đổi nhiều lần từ Task 1 tới Task 6 (đợt trước có thể đã xem ảnh cũ) — chủ dự án xem
lại `anh/` (12 ảnh, bảng dưới) rồi ghi tại đây: ngày, ai ký, điểm cần sửa (nếu có).

## Đối chiếu ảnh (12 ảnh)

| Ảnh (`anh/`) | Trang | Tài khoản | Khổ | Chứng minh điều gì |
|---|---|---|---|---|
| `trang-chu-may-tinh.png` | `/` (dữ liệu thật: 3 ô số liệu, "Chuyến đón hôm nay", "Doanh thu của tôi" kèm biểu đồ 7 cột, khối "Cần xem lại") | ADMIN thử | 1040×800 | Trang chủ đầy đủ dữ liệu ở máy tính, bố cục lưới, khối "Cần xem lại" (Task 3) hiện đúng 2 cảnh báo |
| `trang-chu-dien-thoai.png` | `/` (cùng dữ liệu) | ADMIN thử | 390×844 | Bố cục lưới 2×2 gộp doanh thu (Task 1), tab bar 6 mục, không tràn ngang |
| `trang-chu-may-tinh-tuan-trang.png` | `/` (tài khoản CHƯA từng lập đơn — "tuần trắng") | SALES mới tạo | 1040×800 | Doanh thu "0 ₫", dòng phụ "Tuần này · 0 đơn" hiện thật ở máy tính; khối "Cần xem lại" ẨN (không phải admin) |
| `trang-chu-dien-thoai-tuan-trang.png` | `/` (cùng "tuần trắng") | SALES mới tạo | 390×844 | Cùng số liệu rỗng ở bản rút gọn điện thoại |
| `trang-chu-loi-khong-co-quyen.png` | `/` (trạng thái LỖI THẬT — 403 từ máy chủ, không giả lập) | Tài khoản chỉ FIELD (không có quyền văn phòng) | 390×844 | Route `access: "office"` từ chối đúng; chỉ banner lỗi hiện, khối số liệu/danh sách ẩn hết |
| `task-4-sidebar-field-may-tinh.png` | `/staff` (FIELD bị 403 ở trang này, nhưng thanh bên vẫn dựng theo quyền) | Tài khoản chỉ FIELD | 1040×800 | Thanh bên chỉ còn nhóm "TÔI" (2 mục: Tài khoản, Góp ý/Báo lỗi) — đúng bản đồ quyền, không lộ mục văn phòng |
| `task-4-thanh-ben-huy-hieu.png` | `/staff` | ADMIN thử | 1040×800 | Huy hiệu số đếm trên thanh bên (vd "Đơn hàng" = số đơn CHƯA xác nhận, không phải tổng số đơn) |
| `task-4-chan-thanh-ben-sau-khi-cuon.png` | `/staff` (đã cuộn hết trang dài) | ADMIN thử | 1040×800 | Chân thanh bên (avatar/tên/vai/Đăng xuất) GHIM lại trong khung nhìn, không tụt xuống đáy tài liệu |
| `task-4-tim-kiem-da-loc.png` | `/` (đã gõ SĐT vào ô tìm + Enter) | ADMIN thử | 1040×800 | Ô tìm kiếm trên thanh công việc lọc THẬT — danh sách rút còn đúng 1 đơn khớp SĐT |
| `task-4-lap-don-641.png` | `/order-form` | ADMIN thử | 641×800 (hẹp nhất có thanh bên) | Trang Lập đơn không tràn ngang, `main` bám mép trái ngay sau thanh bên |
| `task-4-breadcrumb-trang-chu-may-tinh.png` | `/` | ADMIN thử | 1040×800 | Breadcrumb máy tính hiện đúng nhãn "Trang chủ" (trang này KHÔNG khai `data-title`, breadcrumb suy ra từ mục điều hướng đang mở) |
| `task-4-breadcrumb-don-hang-may-tinh.png` | `/orders` | ADMIN thử | 1040×800 | Breadcrumb máy tính hiện đúng nhãn "Đơn hàng" |

## Kịch bản

`kich-ban/trang-chu-smoke.mjs` — dùng lại NGUYÊN cơ chế CDP của A2 (`startEnv`/`ACCOUNTS`/`ok`/`vnDate` từ
`docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`, không viết lại) theo mẫu cấu trúc của
`docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/kich-ban/dot-c-smoke.mjs`. Kịch bản đã lớn hơn nhiều qua
các vòng Task 1 → Task 6 (33 điểm `ok(...)` ghi nhật ký ở bản hiện tại — không ghi cứng một số "N bước", số này
đã lỗi thời hai lần rồi; xem đề xuất sửa `web/CLAUDE.md` ở `docs/superpowers/specs/2026-09-23-dot-d-can-chu-
duyet.md` mục 3). Mọi bước in một dòng "✓"; kịch bản dừng ở lần `assert` đỏ đầu tiên.

### Các khối kiểm chính (không liệt kê từng dòng — xem mã)

- **Kiểm tĩnh + dữ liệu thật qua API** (không qua giao diện): 3 đơn (R1 bẫy Task 1 — hai dịch vụ ngày khác nhau,
  R2 nháp, R3 còn thiếu tiền), 1 dòng `catalog_override` lệch Sheet, 2 góp ý MỚI — dựng đúng dữ liệu để bắt lại
  bug Task 1 (lấy nhầm dịch vụ) và phủ khối "Cần xem lại" (Task 3).
- **Đối chiếu `GET /api/orders/dashboard`** với số tự tay tính (lưới thứ hai ngoài `dashboard.test.ts`).
- **Mở `/` ở 1040×800 và 390×844 (ADMIN):** đối chiếu MỖI SỐ trên màn hình thật với dữ liệu trên; biểu đồ 7 cột
  (Task 2); khối "Cần xem lại" (Task 3); axe 0 vi phạm `critical`/`serious`.
- **Tuần trắng (E):** tài khoản SALES mới, doanh thu "0 ₫" đúng cả hai khổ.
- **Trạng thái lỗi thật (C):** tài khoản chỉ FIELD → 403 thật qua `access: "office"`.
- **Mục G — khung dùng chung (thanh bên + thanh công việc + `main`), Task 4/6:** quét **BA trang** (không chỉ
  một — khuyết tật của vòng kiểm đầu, đã vá): `/staff` (14 khổ 640…1920, DUY NHẤT chạy nhánh ≤640px), `/order-
  form?id=<đơn nháp>` (9 khổ, breadcrumb DÀI — bộc lộ lỗi "nút đè tiêu đề"), `/audit` (8 khổ, ô chọn rộng — bộc lộ
  lỗi tràn ngang). Mỗi khổ ≥641px kiểm: không tràn ngang, đủ lối điều hướng + đường tới Đăng xuất, thanh bên 10
  mục đúng token bề rộng, thanh công việc cao đúng token và không gãy dòng, nút "Lập đơn mới" không đè tiêu đề,
  ô tìm kiếm chỉ từ 900px, **`main` khớp trần bề rộng đọc từ `public/app.css` (không phải từ chính trang — Task 6
  A-3)**, breadcrumb dài bị CẮT THẬT bằng ellipsis khi chật (Task 6 A-1.1). Cộng: huy hiệu đúng số, chân thanh bên
  ghim + tự cuộn, lời gọi huy hiệu chỉ khi thanh bên hiện thật (kể cả sau khi đổi khổ không tải lại trang), ô tìm
  kiếm lọc thật, breadcrumb hai trang không khai `data-title` (`/`, `/orders`) vẫn đúng nhãn ở máy tính.
- **Mục H — ba địa chỉ sau Task 5:** `/` → Trang chủ, `/orders` → Đơn hàng, `/home` → tự chuyển hướng về `/`.

## Chạy (từ gốc repo, sau `npm run build:web`)

```
AXE_JS=<đường dẫn axe.min.js> CHROME_BIN=<đường dẫn chrome-wrap.sh> \
  node docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs
```

Lần chạy ghi bằng chứng này (Task 6, 2026-09-23) dùng `axe-core` cài sẵn ngoài repo và
`CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh` (đường dẫn tương đối, chỉ đúng khi chạy từ gốc
repo). **Kết quả:** thoát mã 0, mọi bước ✓ (`TRANG CHU SMOKE OK`), cây `public/app.css`/`src/`/`web/` sạch tại
thời điểm chạy lần cuối để chụp ảnh (đã kiểm bằng `git status` — chỉ ảnh trong `anh/` đổi, không có mã).

## P16 — đã quan sát cơ chế kiểm chặn thật (Task 4, ba lần, và Task 6, hai lần thêm)

### Task 4 (giữ nguyên, ba lần — mỗi lần một biện pháp của vòng sửa)

Mỗi lần: hoàn nguyên ĐÚNG một bản vá (giữ nguyên lưới kiểm đã mở rộng) → chạy lưới → chép nguyên văn dòng đỏ →
hoàn nguyên lại. Chi tiết đầy đủ: `.superpowers/sdd/2026-09-23-dot-d-khung-dieu-huong-doc/task-4-fix-2-report.md`
mục 7. Tóm tắt:

```
(1) Hoàn nguyên mục 1 (chỉ CSS) → đỏ tại trang-chu-smoke.mjs:855:
AssertionError [ERR_ASSERTION]: /order-form?id=… (breadcrumb DÀI) @ 900px: thanh công việc gãy 2 dòng —
{"innerWidth":900,"topbarBottom":60,"mainTop":60,"newBtnTop":58,"newBtnBottom":104,"newBtnHeight":46,
"barTitleClipped":0,…,"topbarHeight":60,"topbarRows":2,"topbarContentOverflow":45,
"barTitleText":"Sửa đơn TD-20260923-0002",…}
2 !== 1

(2) Hoàn nguyên mục 2 → đỏ tại :835:
AssertionError [ERR_ASSERTION]: /audit @ 641px: tràn ngang — scrollWidth 646 > innerWidth 641

(3) Hoàn nguyên mục 3 → đỏ tại :1066 (bước chờ huy hiệu trước khi chụp ảnh, G-7):
Error: hết giờ chờ: huy hiệu nạp xong sau khi đổi khổ (/home)
document.querySelector('#sidebar .sidebar-item-badge') !== null
```
(Dán rút gọn — nguyên văn đầy đủ, gồm cả biến thể "1b"/"3b" tạm tắt khẳng định trước để cô lập đúng khẳng định
MỚI, nằm ở `task-4-fix-2-report.md` mục 7.)

### Task 6 — vá ba lỗ hổng của chính lưới kiểm (A-1, A-2, A-3 của brief Task 6)

**A-3 (bề rộng `main` so với token đọc độc lập từ `public/app.css`):** đổi `main { max-width: var(--w-main); ... }`
(dòng 118) thành hằng số lệch token (`max-width: 1300px`, giữ nguyên `--w-main: 1200px` ở `:root`) → chạy lại:

```
AssertionError [ERR_ASSERTION]: /staff @ 641px: max-width thật của <main> (1300px) phải khớp token đọc từ
public/app.css (1200px) — CSS cascade đang ghi đè bằng thứ khác?
1300 !== 1200
    at .../trang-chu-smoke.mjs:894:16
```
Hoàn nguyên (`cp` lại bản gốc, `diff` xác nhận giống hệt) → chạy lại: xanh.

**Lệch so với chữ P16 của bản giao việc, ghi rõ ra đây thay vì im lặng:** bản giao việc viết "đổi `--w-main`
trong CSS sang một con số sai → lưới phải đỏ". Đã THỬ đúng câu chữ đó trước (đổi `--w-main: 1200px` →
`--w-main: 1234px`, không đụng gì khác): kết quả **XANH**, không đỏ. Đây không phải lỗi khẳng định — đây là điều
KHÔNG THỂ TỰ ĐỘNG HOÁ ĐƯỢC theo đúng thiết kế: cả bộ đọc token (đọc `:root` bằng regex) lẫn trình duyệt (đọc CSS
đã build) đều đọc CÙNG một khai báo `--w-main` trong `public/app.css`, nên đổi giá trị của nó luôn làm cả hai vế
đổi theo nhau — không có cách nào tạo lệch giữa "giá trị đúng" (do chủ dự án chốt bằng mắt/tài liệu, không đo
được tự động) và "giá trị CSS đang dùng". Điều khẳng định A-3 THẬT SỰ bắt được là một lỗ hổng LÂN CẬN: quy tắc
CSS ngừng dùng token (bị ghi đè bằng số cứng hoặc cascade khác) — đó là mutation đã chứng minh đỏ ở trên
(`main { max-width: 1300px }` thay vì `var(--w-main)`). Giữ khẳng định vì nó có giá trị thật (đã tự lộ ra phát
hiện 960px bên dưới), nhưng không tự nhận đã làm đúng y hệt câu P16 gốc.

Việc siết này tự lộ ra một sự thật trước đó không ai đo: `main.form-page { max-width: var(--w-form) }` (Lập đơn)
chỉ nằm TRONG `@media (min-width: 960px)` — dưới 960px trang Lập đơn vẫn dùng `--w-main` chung, không phải
`--w-form` riêng như chú thích cũ ngụ ý. Bản đầu của khẳng định A-3 giả định `--w-form` áp dụng mọi khổ ≥641px,
tự đỏ SAI ở 641px — sửa bằng cách đọc trần theo từng khổ (`mainCap(width)`), không phải hằng số cố định.

**A-1.1 (breadcrumb bị cắt thật, không chỉ kiểm CSS có tồn tại):** gỡ `overflow: hidden; text-overflow:
ellipsis;` khỏi `.bar-title` (giữ `white-space: nowrap`) → chạy lại:

```
AssertionError [ERR_ASSERTION]: /order-form?id=… (breadcrumb DÀI) @ 900px: breadcrumb đang bị cắt thật (14px,
scrollWidth>clientWidth) nhưng overflow không phải "hidden" — {"barTitleClipped":14,"barTitleOverflow":"visible",
"barTitleTextOverflow":"clip",...}
actual: 'visible' expected: 'hidden'
```
Gỡ CẢ BA (`overflow`/`text-overflow`/`white-space`) → đỏ khác, ở lưới an toàn `sawRealClip` ("không đo được lần
nào breadcrumb THẬT SỰ bị cắt") — vì thiếu `white-space: nowrap` làm chữ XUỐNG DÒNG thay vì bị cắt, nên
`barTitleClipped` không còn > 0 ở khổ nào; đây cũng là một RED hợp lệ, chỉ khác cơ chế bắt lỗi (lưới sanity thay
vì khẳng định overflow/text-overflow trực tiếp). Hoàn nguyên cả hai lần → xanh; `git diff --stat public/app.css`
rỗng sau mỗi lần.

**Rủi ro đã biết của `sawRealClip`:** lưới an toàn này dựa vào việc breadcrumb "Sửa đơn TD-…" ở khổ 900px đo
được đúng 14px cắt — con số đó phụ thuộc ĐỘ DÀI mã đơn sinh ra lúc chạy (`TD-20260923-NNNN`, số thứ tự tăng theo
ngày) và phông chữ đang tải. Nếu một lần chạy sau này mã đơn ngắn hơn hoặc rộng cột đổi khiến KHÔNG khổ/trang nào
còn thật sự cắt breadcrumb, lưới sẽ đỏ TO (đúng thiết kế — không lặng lẽ mất tác dụng) nhưng người đọc log lần
đầu có thể tưởng nhầm là hồi quy thật; ghi lại đây để không mất công tra lại.

**A-1.2 (van an toàn `min-height`) — KHÔNG thêm khẳng định, đã thử và không chứng minh được đỏ:** làm đúng kịch
bản brief mô tả (ẩn `.topbar-search` bằng `ev(...)`, gán `textContent` của `.bar-title` một chuỗi rất dài), đo
`#topbar`/nút/`main` dưới CSS hiện tại (`min-height`) và dưới mô phỏng hoàn nguyên (`height`, ghi đè bằng inline
style trong cùng trang, không đụng `app.css`):

```
min-height (CSS hiện tại):                                    {"topbarH":60,"topbarBottom":60,"mainTop":60,"btnBottom":53,"titleClipped":3206}
height (mô phỏng hoàn nguyên, inline style ghi đè min-height): {"topbarH":60,"topbarBottom":60,"mainTop":60,"btnBottom":53,"titleClipped":3206}
```
**Giống hệt nhau.** Cơ chế: `.bar-title` (`flex: 0 1 auto; min-width: 0; white-space: nowrap; overflow: hidden;
text-overflow: ellipsis`) LUÔN co về đúng một dòng bất kể văn bản dài bao nhiêu — biện pháp 2 (breadcrumb co-cắt-
chữ) hấp thụ hết phần thiếu trước khi biện pháp 3 (`min-height`) có cơ hội phát huy tác dụng; `.topbar-new` là
`flex: none` (kích thước cố định). Không có cách nào (không đụng mã ứng dụng, không mutate chính CSS mà A-1.1 vừa
canh) tạo ra tình huống mà `min-height` thật sự khác `height`. Theo đúng chỉ dẫn brief ("Khẳng định không chứng
minh được là đỏ thì xoá đi, đừng để lại lưới giả"): **không thêm khẳng định A-1.2 vào kịch bản.**

## Chưa kiểm

- iPhone thật (bàn phím, an toàn màn hình…) — chưa đo, giống mọi bằng chứng Chrome headless khác trong repo.
- Tài khoản kế toán (ACCOUNTING) ở `/` — kịch bản dùng ADMIN (thấy đủ khối "Cần xem lại") và SALES mới (tuần
  trắng); kế toán chưa đo riêng.
- Đúng biên 899px/900px của mốc `@media (min-width: 900px)` — kịch bản đo ở 899 và 900 cho `/staff`/`/order-
  form`, sát mốc, nhưng chưa đo TỪNG pixel quanh mốc.
- `/audit` tràn ngang khổ điện thoại — lỗi CŨ có từ trước Đợt D, ghi nợ ở
  `docs/superpowers/specs/2026-09-23-dot-d-can-chu-duyet.md`, không thuộc phạm vi bằng chứng này (mục G chỉ quét
  `/audit` từ 641px, không quét ≤640px cho trang này — `/staff` là trang DUY NHẤT chạy nhánh đó).
- Chưa có ai NGOÀI người thi công Task 6 xem qua `anh/` hay chạy lại kịch bản (kiểm độc lập việc lớn theo
  `CLAUDE.md` §3 — Task 4/5 đã có kiểm độc lập riêng; Task 6 Phần A/F là việc "vá lưới kiểm + sửa tài liệu", cần
  điều phối viên tự xác định có cần thêm một vòng kiểm độc lập nữa hay không).

`npm test` (517/517) và `npm run typecheck` (0 lỗi) đã chạy xanh trên cây làm việc ghi bằng chứng này. Không có
thay đổi mã nguồn ứng dụng nào đi kèm README này ngoài `docs/evidence/2026-09-23-trang-chu-moi/` — mọi mutation
CSS dùng để đo P16 đã hoàn nguyên trước khi chụp ảnh cuối cùng.
