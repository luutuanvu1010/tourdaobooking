# Bằng chứng: Trang chủ mới — Task 3 (kịch bản Chrome + kiểm toàn cục) (2026-09-23)

Artifact của Task 3 (task cuối) kế hoạch "Trang chủ mới (Dashboard)"
(`docs/superpowers/sdd/2026-09-23-trang-chu-moi/`). Hiến pháp §8.2: bằng chứng thay cho lời khai.
**Mã được đo: cây làm việc sạch trên nhánh `worktree-trang-chu-moi`, đứng sau Task 1 (`7c0eac9`, `cb24e9a`)
và Task 2 (`5359521`, `155da51`, `e944fe4`).** Đây là **bằng chứng hành vi trình duyệt DUY NHẤT** cho trang
`/home`: `npm test` (luật thuần + `dashboard.test.ts`, chạy trên `node:sqlite`) và `npm run test:e2e -- pwa`
(chỉ phủ manifest/icon/meta iOS/CSS-lint sau mốc PWA) không chạm DOM thật của `web/home.ts`.

Đo trên `wrangler dev` cục bộ với D1 tạm và tài khoản thử (ADMIN `0900000204`, cộng một tài khoản FIELD tạo
riêng cho kịch bản `0900000399`), bằng Chrome headless qua CDP, hai khổ: máy tính 1040×800
(`deviceScaleFactor: 1`) và điện thoại 390×844 (`deviceScaleFactor: 2`). **Không phải** đo trên iPhone thật,
mạng thật hay Workers Assets thật.

## Ký duyệt thị giác

**Chưa ký.** Chủ dự án xem `anh/` rồi ghi tại đây: ngày, ai ký, điểm cần sửa (nếu có).

## Đối chiếu ảnh

| Ảnh (`anh/`) | Trang | Tài khoản | Khổ |
|---|---|---|---|
| `trang-chu-may-tinh.png` | `/home` (có dữ liệu: 3 ô số liệu, "Chuyến đón hôm nay", "Doanh thu của tôi") | ADMIN thử | 1040×800 |
| `trang-chu-dien-thoai.png` | `/home` (cùng dữ liệu, bố cục 1 cột + tab bar 6 mục) | ADMIN thử | 390×844 |
| `trang-chu-loi-khong-co-quyen.png` | `/home` (trạng thái LỖI THẬT — 403 từ máy chủ) | Tài khoản chỉ FIELD (không có quyền văn phòng) | 390×844 |

3 ảnh — không có ảnh "đang tải" riêng (khung xương `#loading` chỉ hiện trong vài trăm ms, không phải trạng
thái người dùng nhìn thấy lâu; hành vi ẩn/hiện đúng lúc được kiểm bằng đọc HTML tĩnh + đọc DOM sau khi tải
xong, xem mục "Kịch bản" bên dưới).

## Kịch bản

`kich-ban/trang-chu-smoke.mjs` — dùng lại NGUYÊN cơ chế CDP của A2 (`startEnv`/`ACCOUNTS`/`ok`/`vnDate` từ
`docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`, không viết lại) theo đúng mẫu cấu trúc của
`docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/kich-ban/dot-c-smoke.mjs`.

### Dữ liệu tạo trước (qua API thật, không qua giao diện)

| Đơn | Trạng thái | Dịch vụ | Tiền |
|---|---|---|---|
| R1 | confirmed | sort_order 0 = **NGÀY MAI**, 19:30, Sân bay Cam Ranh, "Đưa đón sân bay…"; sort_order 1 = **HÔM NAY**, 06:15, Bến Cầu Đá, "Tour 4 đảo…" | subtotal 300.000, cọc 300.000 → còn lại 0 (đã trả đủ) |
| R2 | **nháp** (không xác nhận) | 1 dịch vụ HÔM NAY | subtotal 100.000 |
| R3 | confirmed | 1 dịch vụ ngày khác hôm nay (+5 ngày) | subtotal 500.000, cọc 0 → còn lại 500.000 |

R1 dựng đúng hình dạng bẫy đã gây lỗi thật ở Task 1 (kiểm độc lập vòng 1): `sort_order` NGƯỢC chiều ngày, giờ
và nơi đón của hai dịch vụ khác hẳn nhau, để phép đo "giờ/nơi đón hiển thị đúng dịch vụ hôm nay" không thể
tình cờ đúng.

### Các bước kiểm (đúng thứ tự chạy trong kịch bản)

- **Kiểm tĩnh (không cần trình duyệt):** đọc `public/home.html` xác nhận `#dash-today-count`, `#dash-stats`,
  `#dash-layout` có sẵn thuộc tính `hidden` NGAY TRONG MARKUP GỐC (trước khi JS chạy) — lỗi đã sửa ở Task 2
  (khối rỗng/huy hiệu xanh rỗng lúc tải).
- **(F) Ghim thứ tự khai route:** `GET /api/orders/dashboard` (đăng nhập ADMIN thật) phải trả **200** với đúng
  hình dạng `DashboardResponse`, không phải 404 do bị route `GET /api/orders/:id` nuốt mất nếu ai đó lỡ dời
  thứ tự khai route trong `src/modules/orders/index.ts`.
- **Đối chiếu API với số tự tay tính** (lưới thứ hai ngoài `dashboard.test.ts` của Task 1, qua đường HTTP
  thật): `draftCount=1` (R2), `unpaid` = 1 đơn/500.000/ngày của R3, `today` = đúng `[R1]` với
  `trip = { departDate: HÔM NAY, pickupTime: "06:15", pickupPlace: "Bến Cầu Đá" }` (dịch vụ QUYẾT ĐỊNH,
  sort_order=1 — KHÔNG phải sort_order=0), `revenueWeek` = 2 đơn/800.000.
- **Mở `/home` ở 1040×800 và 390×844 (ADMIN):** đối chiếu MỖI SỐ trên màn hình thật với dữ liệu trên —
  3 ô số liệu, huy hiệu + danh sách "Chuyến đón hôm nay" (đúng 1 dòng, R2/R3 không lộ ra), khối "Doanh thu
  của tôi"; `#dash-layout` là `display: grid` ở 1040 và `display: block` ở 390; thứ tự DOM gốc
  `#dash-today` trước `#dash-revenue` không đổi ở cả hai khổ; không tràn ngang; không lỗi console; axe 0 vi
  phạm `critical`/`serious`.
- **(B) Bẫy Task 1 — ghim lại để không tái phát:** khẳng định `.dash-today-time` = **"06:15"** và
  `.dash-today-place` = **"Bến Cầu Đá"** (dịch vụ hôm nay), so trực tiếp với chuỗi LITERAL đã tạo, KHÔNG chỉ
  so với API (P16 dưới đây chứng minh phép so này bắt được lỗi thật khi tái tạo lại đúng kiểu bug cũ).
- **(D) Đo thật bố cục/tab bar:**
  - Thanh điều hướng máy tính (1040px, ADMIN): đúng 9 mục, không tràn ngang, `#topbar` tự nó không tràn.
  - Tab bar điện thoại (390px, ADMIN): đúng 6 mục ("Trang chủ", "Đơn hàng", "Đơn mới", "Dịch vụ", "Nhân viên",
    "Tôi"); đo **chiều cao thật** của `#tabbar`, so với token `--tabbar-h` và với `padding-bottom` thật của
    `<main>`; đo nhãn có xuống 2 dòng không; đo tràn ngang. Kết quả và phân tích: xem mục "Kết quả đo mục D"
    bên dưới.
- **(C) Trạng thái lỗi thật:** tạo một tài khoản CHỈ có quyền `FIELD` (không phải văn phòng) ngay trong kịch
  bản (`insertStaffSql`, cùng cách `docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs` đã làm),
  mở `/home` bằng tài khoản đó → route `access: "office"` của `GET /api/orders/dashboard` trả **403 THẬT**
  (`src/shared/router.ts`, không phải giả lập bằng cách chặn mạng) → khẳng định CHỈ còn banner `#error` hiện
  (có chữ), `#dash-stats`, `#dash-layout`, `#dash-today-count` đều **ẩn**, `#loading` (khung xương) đã ẩn
  (không kẹt lại). Đây là **phương án thay** cho việc chặn request `/api/orders/dashboard` bằng CDP
  `Fetch`/`Network` domain (brief cho phép dùng cách này nếu chặn mạng phức tạp) — một lỗi 403 thật, xảy ra
  đúng qua đường quyền thật của hệ thống, mạnh hơn một lần chặn mạng giả lập.

Mọi bước in một dòng "✓" (kiểu `ok()` của `a2-cdp.mjs`); kịch bản dừng ở lần `assert` đỏ đầu tiên (không có
cơ chế gom lỗi kiểu `dot-a-smoke.mjs`, giống `dot-c-smoke.mjs`).

### Chạy (từ gốc repo, sau `npm run build:web`)

```
AXE_JS=<đường dẫn axe.min.js> CHROME_BIN=<đường dẫn chrome-wrap.sh> \
  node docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs
```

Lần chạy ghi bằng chứng này dùng `axe-core` đã cài sẵn ngoài repo và
`CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh` (đường dẫn tương đối, chỉ đúng khi chạy từ
gốc repo).

**Kết quả lần chạy ghi bằng chứng này:** thoát mã 0, mọi bước ✓, không phải sửa mã Task 1–2 nào để qua (đo
mục D không phát hiện tràn/đè thật — xem dưới).

## Kết quả đo mục D (bố cục + rủi ro tràn tab bar) — ĐO THẬT, không đoán

- **Chiều cao thật của `#tabbar` ở 390px (ADMIN, 6 mục):** **59px**. Token `--tabbar-h` = **56px** → lệch
  **+3px** (mỗi nhãn vẫn nằm một dòng, không nhãn nào xuống 2 dòng — kiểm bằng so `getBoundingClientRect().height`
  của từng nhãn với chiều cao một dòng chữ tính từ `line-height` máy tính).
- **`padding-bottom` thật của `<main>`:** **72px** (= `--tabbar-h` 56px + `--s4` 16px cộng thêm trong CSS,
  vùng an toàn iOS = 0 trên Chrome headless không mô phỏng notch). **72px ≥ 59px** → đệm đáy hiện tại **ĐỦ**
  che chiều cao thật của tab bar (còn dư 13px), dù công thức CSS chỉ dựa vào token cố định chứ không đo động
  — nội dung cuối trang (khối "Doanh thu của tôi") **KHÔNG bị tab bar đè lên** trong kịch bản này.
- **Không tràn ngang** ở 390px (`scrollWidth - clientWidth` = 0).
- **Thanh điều hướng máy tính (1040px, ADMIN, 9 mục):** không tràn ngang, `#topbar` tự nó không tràn
  (`scrollWidth - clientWidth` = 0 cho cả trang lẫn `#topbar`). `flex-wrap: wrap` của `#topbar` là thiết kế có
  chủ đích từ trước (không phải điều Task 3 gây ra) nên không kiểm "có xuống dòng hay không", chỉ kiểm "có
  tràn ngang hay không".

**Kết luận:** nghi ngờ Task 2 nêu ("6 tab có thể khiến `#tabbar` vượt token cố định, tab bar đè nội dung
cuối trang") — SAI ở dữ liệu/nhãn thật hiện tại: vượt token thật (+3px) nhưng đệm đáy `<main>` đã có sẵn dư
16px (`--s4`) nên vẫn đủ che. **Không sửa CSS** (không có tràn/đè thật đo được — CLAUDE.md nói rõ chỉ sửa
đúng vấn đề đo được, không đổi khi chưa cần). Rủi ro còn lại nếu chủ dự án thêm tab thứ 7 trong tương lai:
biên an toàn hiện chỉ còn 13px — ghi ở mục "Chưa kiểm" bên dưới.

## P16 — đã quan sát cơ chế kiểm chặn thật một lần

Trước khi ghi "đạt", đã cố ý tái tạo ĐÚNG kiểu lỗi Task 1 để xem kịch bản có bắt được không: sửa tạm
`web/home.ts` (hàm `todayRow()`), comment dòng dựng `.dash-today-place`:

```diff
   const when: Child[] = [h("span", { class: "dash-today-time" }, time)];
-  if (o.trip.pickupPlace) when.push(h("span", { class: "dash-today-place" }, o.trip.pickupPlace));
+  // if (o.trip.pickupPlace) when.push(h("span", { class: "dash-today-place" }, o.trip.pickupPlace));
```

Chạy `npm run build:web` rồi chạy lại kịch bản → **đỏ ngay** ở đúng bước (B) (bẫy Task 1):

```
AssertionError [ERR_ASSERTION]: Trang chủ (máy tính, 1040×800): nơi đón hiển thị PHẢI là "Bến Cầu Đá"
(dịch vụ HÔM NAY) — thấy "null". Nếu đây là "Sân bay Cam Ranh" thì bug Task 1 ĐÃ TÁI PHÁT.
+ actual - expected
+ null
- 'Bến Cầu Đá'
```

Sau đó hoàn nguyên `web/home.ts` (`git diff --stat web/home.ts` xác nhận sạch), `npm run build:web` lại rồi
chạy lại kịch bản: thoát mã 0, mọi bước ✓ như cũ. `npm test` (500/500) và `npm run typecheck` (0 lỗi) chạy
lại sau khi hoàn nguyên — xanh. Cơ chế kiểm được coi là hoạt động thật (không chỉ "dựa vào kỷ luật").

## Chưa kiểm

- iPhone thật (bàn phím, an toàn màn hình…) — chưa đo, giống mọi bằng chứng Chrome headless khác trong repo.
- Tài khoản SALES/ACCOUNTING (không phải ADMIN) ở `/home` — brief chỉ định "văn phòng (ADMIN để thấy đủ)",
  kịch bản chỉ dùng ADMIN; SALES có 4 tab (không phải 6), chưa đo riêng.
- **Biên an toàn tab bar mỏng dần:** đệm đáy `<main>` hiện dư 13px so với chiều cao thật của tab bar 6 mục.
  Nếu sau này thêm tab thứ 7 (hoặc đổi cỡ chữ/khoảng cách), rủi ro tràn thật có thể xuất hiện — kịch bản này
  đo được TẠI THỜI ĐIỂM HIỆN TẠI, không phải một hàng rào tự động chặn thay đổi tương lai; `--tabbar-h` vẫn là
  token cố định chứ không đo động.
- `unassignedCount` ("Chưa có người phụ trách"): kịch bản đối chiếu số hiện trên màn hình với số API trả về
  (không tự đoán trước bằng tay), vì quy tắc gán người phụ trách mặc định khi tạo đơn qua API thuộc module
  `dispatch`, ngoài phạm vi Task 3 — quy tắc gán MẶC ĐỊNH đã có test riêng ở `dashboard.test.ts` (Task 1).
- Đúng biên 899px/900px (viewport 899 vs 900) của mốc `@media (min-width: 900px)` — kịch bản chỉ đo ở 1040
  và 390, chưa đo sát mốc.
- Chưa có ai ngoài người thi công xem qua `anh/` hay chạy lại kịch bản (kiểm độc lập việc lớn theo CLAUDE.md
  §3 — điều phối viên tự làm sau Task 3, không tự làm ở đây — N8). Việc lớn ở đây gồm: dữ liệu tiền
  (`vnd()`), quyền (route `access: "office"`), đọc xuyên module.

`npm test` (500/500) và `npm run typecheck` (0 lỗi) đã chạy xanh trên cây làm việc ghi bằng chứng này (không
có thay đổi mã nguồn nào ngoài `docs/evidence/2026-09-23-trang-chu-moi/` — mục D không phát hiện tràn/đè
thật nên không có commit sửa CSS đi kèm).
