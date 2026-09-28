# Nhật ký thi công — Tách "Danh mục giấy tờ" theo chủ dữ liệu (2026-09-28)

- **Nhánh:** `worktree-agent-afbeda3cc36823996` (worktree `.claude/worktrees/agent-afbeda3cc36823996`), tách từ `origin/main` @ `3bb73f0` (bản 1.35 — theo lời giao của điều phối; người thi công KHÔNG tự kiểm trạng thái production).
- **Căn cứ:** chủ dự án chọn 2026-09-28, trực tiếp với điều phối: **"Tách theo chủ dữ liệu"**. Lời giao (chép ý): "Loại giấy tờ xe" → nhóm Vận chuyển (mục con dưới "Vận chuyển" sau "Sắp hết hạn"; dòng trong nhóm VẬN CHUYỂN của trang Tôi sau "Giấy tờ sắp hết hạn"); "Loại giấy tờ người" (loại giấy tờ của người + hạng giấy phép lái xe — "giấy tờ thuộc về người") → mục danh mục chung nhóm QUẢN TRỊ (thanh bên: ngay sau "Địa điểm", trước "Vận chuyển"; trang Tôi: thay chỗ dòng "Danh mục giấy tờ" cũ, sau "Địa điểm"); bỏ dòng "Danh mục giấy tờ"; đường dẫn cũ không được thành 404; quyền hiện / ẩn giữ như cũ (ô `admin.manage`, mục cha "Vận chuyển" theo `vehicle.manage`); không đổi `permissions.ts`, route, `contracts.ts`, không migration; không sửa tệp luật (chỉ đề xuất); không thêm mục nhật ký thay đổi (điều phối gộp 1.36).
- **Loại việc:** giao diện (điều hướng + trang); không đụng dữ liệu, quyền máy chủ, tiền, triển khai. Luật (`web/CLAUDE.md`) chỉ **đề xuất**: `docs/superpowers/plans/2026-09-28-tach-danh-muc-giay-to-de-xuat-luat.md`.
- **Người ghi sổ này là người thi công — KHÔNG tự nghiệm thu (N8).** Chưa có người kiểm độc lập.

## 1. Tiêu chí nghiệm thu (viết trước khi làm — P20)

1. Máy tính (thanh bên), Quản trị: nhóm QUẢN TRỊ có "Loại giấy tờ người" ngay sau "Địa điểm", trước "Vận chuyển"; dưới "Vận chuyển" có "Xe", "Sắp hết hạn", "Loại giấy tờ xe". Bấm mở đúng trang; mục đang mở sáng; mục cha "Vận chuyển" chữ trắng khi ở trang Loại giấy tờ xe.
2. Điện thoại (390), Quản trị, trang Tôi: thẻ đầu = Danh bạ, Địa điểm, Loại giấy tờ người; nhóm VẬN CHUYỂN = Xe, Giấy tờ sắp hết hạn, Loại giấy tờ xe. Không còn dòng "Danh mục giấy tờ".
3. `/loai-giay-to-nguoi`: hai khối — loại giấy tờ của người (4 dòng gieo), hạng giấy phép lái xe (8); không khối xe. `/loai-giay-to-xe`: một khối (6); không khối người / hạng. Thêm / sửa / ngưng chạy như trang cũ.
4. Bán hàng: không thấy mục nào ở thanh bên / trang Tôi; mở thẳng hai trang → câu "Chỉ quản trị viên xem và sửa được danh mục giấy tờ.", không bảng, không gọi API danh mục.
5. `/danh-muc-giay-to` không 404: tự chuyển sang `/loai-giay-to-nguoi`.
6. `npm test`, `npm run typecheck` (thoát 0), `npm run build:web`, `npm run test:e2e -- pwa` xanh; kịch bản Chrome bị ảnh hưởng xanh, trừ chỗ đỏ sẵn đã ghi ở sổ Vận chuyển 1a mục 11.12.

## 2. Cách dựng đã chọn và giả định (P8 — bề mặt, đảo ngược được)

- **G1 — hai trang riêng**, không một trang có tham số: thanh bên sáng mục theo ĐƯỜNG DẪN (`active(path)`) và breadcrumb tra theo đường dẫn / `data-title`; tham số `?nhom=` sẽ làm hai mục chung một đường dẫn. Mã dùng chung: `web/danh-muc-giay-to-khoi.ts` (đổi tên từ `web/danh-muc-giay-to.ts`, hành vi thêm / sửa / ngưng / khoá lạc quan giữ nguyên); hai tệp vào: `web/loai-giay-to-xe.ts`, `web/loai-giay-to-nguoi.ts`.
- **G2 — đường dẫn cũ:** `public/danh-muc-giay-to.html` thành trang chuyển hướng KHÔNG JS (`<meta http-equiv="refresh" content="0; url=/loai-giay-to-nguoi">` + liên kết dự phòng tới cả hai trang), đúng khuôn `public/home.html` (CSP cấm script nội tuyến). Vẫn trong `PAGES` + `PRECACHE`; bỏ `/js/danh-muc-giay-to.js` khỏi `PRECACHE` và `build:web` (trang không còn mã; tệp trong `PRECACHE` mà không có thì `pwa` e2e đỏ). Đích chọn trang NGƯỜI (gợi ý của lời giao). Chrome đo `history.length` = 2 sau chuyển (mục lịch sử bị THAY, nút Lùi không kẹt vòng) — ghi nhận, không khẳng định. Máy còn service worker 1.35: lần mở đầu được phục vụ trang cũ + JS cũ từ bộ đệm (API không đổi nên vẫn dùng được), lần sau nhận trang chuyển hướng.
- **G3 — trang một khối (xe):** tên trang (h1) đã là tên khối nên khối không có h2 riêng; "Sửa: …" / "Thêm loại giấy tờ xe" là h2 (khuôn trang Địa điểm). Trang hai khối giữ h2 cho khối, h3 cho "Sửa / Thêm" như cũ.
- **G4 — biểu tượng** mục "Loại giấy tờ người": `doc-check` (có sẵn ở `web/icons.ts`, không vẽ hình mới). Mục con "Loại giấy tờ xe" không biểu tượng (như "Xe", "Sắp hết hạn").
- **G5 — điều kiện hiện:** "Loại giấy tờ người" = `can(staff, "admin.manage")` (thanh bên: cờ mới `danhMuc` của `navGroups` / `sidebar` / `addNav`; trang Tôi: như dòng cũ). "Loại giấy tờ xe" = nằm trong khối `vehicle.manage` VÀ `admin.manage` (route sửa danh mục hỏi ô này). Hệ quả: tài khoản chỉ Toàn quyền (không kèm Quản trị) cũng thấy "Loại giấy tờ người" ở thanh bên (trước đây chỉ có dòng ở trang Tôi, cùng ô). Cờ mới KHÔNG vào bản nhớ khung (ADR-0035: 5 trường đã duyệt) — như `vehicle`: khung tạm thiếu hai mục một nhịp, khung thật vẽ đủ.
- **G6 — chữ:** câu từ chối giữ "Chỉ quản trị viên xem và sửa được danh mục giấy tờ." cho cả hai trang; breadcrumb trang xe "Vận chuyển › Loại giấy tờ xe" (như các trang Vận chuyển khác, điện thoại chỉ hiện phần cuối), trang người "Loại giấy tờ người"; dòng mô tả dưới h1 viết mới cho từng trang.
- **G7 — tên kịch bản** giữ `danh-muc-giay-to-smoke.mjs` (bảng Chrome của `web/CLAUDE.md` đang trỏ tên này; đổi bảng phải chờ chủ).
- **G8 — ảnh `00-cho-vao-*`** (so bản vẽ 00) KHÔNG chụp lại: chúng chụp trước khi tách; giao diện hiện tại có ở 6 ảnh `loai-giay-to-*` (README bằng chứng đã ghi).

## 3. Commit

| Commit | Việc |
|---|---|
| `8db6357` | Mã: khối dùng chung + hai trang + trang chuyển hướng, `web/shell.ts` (hai mục, tab Tôi), `web/account.ts` (hai dòng), `PAGES` / `PRECACHE` / `build:web` |
| `2a9d2b9` | Kịch bản Chrome: `danh-muc-giay-to-smoke.mjs` viết lại (10 bước), `xe-smoke.mjs` bước 1–2, `trang-chu-smoke.mjs` số mục 14 → 16 |
| `f516184` | `docs/SYSTEM-DESIGN.md` §9, `docs/CHANGE-GUIDE.md` (§3 + công thức y), `docs/SO-HANG-RAO.md`, README + 6 ảnh bằng chứng (bỏ 3 ảnh cũ), tệp đề xuất luật, nhật ký này |

## 4. Đỏ trước / xanh sau

- **`danh-muc-giay-to-smoke.mjs` (mới) trên mã cũ `3bb73f0`** (bản dựng ngoài repo bằng `git archive 3bb73f0` vào `/tmp`, chép kịch bản mới vào, `build:web`): **`0 ✓, 10 ✗`** — a `hết giờ chờ: dòng Loại giấy tờ người`, b `… mục Loại giấy tờ người`, c `… dòng Loại giấy tờ xe`, d `… mục con Loại giấy tờ xe`, e–g `… khối người` / `khối hạng`, h `… khối xe`, i `… chuyển sang Loại giấy tờ người`, j `… câu báo ở /loai-giay-to-nguoi` (trang chưa có). **Trên `8db6357`: `DANH MUC GIAY TO SMOKE OK (10 bước)`.**
- **`xe-smoke.mjs` bản CŨ (`3bb73f0`) trên mã mới** (bản sao tạm trong thư mục kịch bản, xoá ngay sau): **11 ✓, 2 ✗** — đúng hai bước việc này đổi: `✗ 1 … AssertionError [ERR_ASSERTION]: ["Dịch vụ & giá","Quản lý tài khoản","Địa điểm","Loại giấy tờ người","Vận chuyển","Xe","Sắp hết hạn","Loại giấy tờ xe"]` (`+ 'Loại giấy tờ người'`, `- 'Sắp hết hạn'`); `✗ 2 …` (`+ 'Loại giấy tờ người'`, `- 'Danh mục giấy tờ'`). **Bản mới: `XE SMOKE OK (13 bước)`.**
- **`trang-chu-smoke.mjs`** (khoá số mục thanh bên của Quản trị ở `:540` và `:966` — trước là `:538` / `:964`, dời hai dòng vì thêm chú thích):
  - kịch bản thật: 11 ✓ rồi đỏ `trang-chu-smoke.mjs:450:12` (`actual: 1, expected: 2` — khối "Cần xem lại" một dòng) = **đỏ sẵn** (ADR-0038), chưa tới dòng số mục;
  - bản sao tạm bỏ qua khối `:450` (+ các khẳng định về dòng góp ý thứ hai), giữ 16: 11 ✓ rồi đỏ đúng dòng số mục: `… phải có 16 mục … — thấy 15: ["Trang chủ","Đơn hàng","Tạo đơn","Danh bạ","Dịch vụ & giá","Quản lý tài khoản","Địa điểm","Loại giấy tờ người","Vận chuyển","Xe","Sắp hết hạn","Loại giấy tờ xe",…]` — phần thiếu DUY NHẤT là "Nhật ký" (nợ ADR-0038);
  - bản sao tạm bỏ qua `:450` và khoá **15** (coi nợ "Nhật ký" đã chữa): **41 ✓, `TRANG CHU SMOKE OK`**, thoát 0 — gồm lưới 14 khổ (G-1), chân thanh bên trong khung nhìn khi cuộn (G-3), thanh bên tự cuộn (G-3b), huy hiệu (G-2, G-9).
  - Hai bản sao đã xoá; kịch bản trong repo khoá **16** = 14 + 2 (CHỈ cộng phần việc này, tiền lệ Ruling R23). **Số THẬT của Quản trị nay là 15** (13 + 2).

## 5. P16 — điều kiện hiện / ẩn mới (sửa cố ý → đỏ → hoàn nguyên → xanh), 2026-09-28

Mỗi lượt: sửa cố ý → `npm run build:web` → chạy `danh-muc-giay-to-smoke.mjs` (ảnh ra `/tmp`) → hoàn nguyên bằng bản trong commit → so tệp với commit (sạch) → build lại.

| Lượt | Sửa cố ý | Kết quả đỏ (nguyên văn rút gọn) |
|---|---|---|
| 1 | `web/shell.ts`: `if (danhMuc)` → `if (true)` cho mục "Loại giấy tờ người"; `public/danh-muc-giay-to.html`: bỏ thẻ `<meta http-equiv="refresh">` | `✗ i … Error: hết giờ chờ: chuyển sang Loại giấy tờ người`; `✗ j … AssertionError [ERR_ASSERTION]: trang Tôi (390)` (`+ [ '/loai-giay-to-nguoi' ]` — thanh bên nằm trong DOM cả ở điện thoại); 8 bước còn lại ✓ |
| 2 | `web/account.ts`: `can(staff, "admin.manage") &&` → `true &&` cho dòng "Loại giấy tờ người" | `✗ j … trang Tôi (390)` (`+ [ '/loai-giay-to-nguoi' ]`); 9 bước còn lại ✓ |
| 3 | `web/danh-muc-giay-to-khoi.ts`: cổng trang `admin.manage` → `feedback.submit`; `web/shell.ts`: `if (danhMuc)` → `if (false)` cho mục con "Loại giấy tờ xe"; `web/account.ts`: `false &&` cho dòng "Loại giấy tờ xe" | `✗ c … hết giờ chờ: dòng Loại giấy tờ xe`; `✗ d … hết giờ chờ: mục con Loại giấy tờ xe`; `✗ j … Expected values to be strictly equal` (câu 403 của máy chủ hiện thay "Chỉ quản trị viên xem và sửa được danh mục giấy tờ."); 7 bước còn lại ✓ |
| Sau hoàn nguyên | mã = `2a9d2b9` (so tệp: sạch), build lại | **`DANH MUC GIAY TO SMOKE OK (10 bước)`** |

**Không quan sát được (dựa vào kỷ luật):** chiều "mục con / dòng 'Loại giấy tờ xe' hiện cho người có `vehicle.manage` mà thiếu `admin.manage`" — hôm nay hai ô cùng cột (Quản trị, Toàn quyền) nên không tài khoản thật nào phân biệt được; chỉ chiều "mất với Quản trị" có đột biến (lượt 3). Đã ghi ở `docs/SO-HANG-RAO.md` dòng `danh-muc-giay-to-smoke`.

## 6. Kết quả người thi công tự đo (CHƯA kiểm độc lập)

Mã như `2a9d2b9` (commit tài liệu `f516184` và commit ghi sổ sau đó không đổi `web/`, `public/*.html`, `src/`, `package.json`); `npm test` + typecheck chạy lại trên `f516184`: 1306/1306, thoát 0. Soát tài liệu mô tả (`grep "13 mục\|14 mục\|:538\|:964"` ngoài sổ lịch sử `docs/superpowers/plans/`): không còn số đếm / số dòng cũ của thanh bên. Trước mỗi lượt Chrome: không có `wrangler` / `workerd` nào khác đang chạy; sau cùng: không còn tiến trình nào của worktree này.

- `npm test`: **1306/1306**, thoát 0 (mốc trước khi sửa: 1306/1306).
- `npm run typecheck`: **thoát 0** (ba tsconfig).
- `npm run build:web`: **thoát 0** (`public/js/loai-giay-to-xe.js`, `public/js/loai-giay-to-nguoi.js`; không còn `danh-muc-giay-to.js`).
- `npm run test:e2e -- pwa`: **`E2E: 2/2 kịch bản xanh`**, thoát 0 — gồm "thẻ meta iOS, tên và màu nhất quán trên 23 trang" (21 + hai trang mới; trang chuyển hướng vẫn qua) và vòng `PAGES ∪ PRECACHE` trả 200 (không còn `/js/danh-muc-giay-to.js`).

| Kịch bản Chrome (`AXE_JS` = axe-core 4.13.0 ngoài repo) | Kết quả | Ghi chú |
|---|---|---|
| `danh-muc-giay-to-smoke.mjs` | **10 ✓**, thoát 0 | ảnh vào `anh/` từ lượt sau hoàn nguyên |
| `xe-smoke.mjs` | **13 ✓**, thoát 0 | ảnh ra `/tmp` (không ghi đè ảnh `00-`…`02-`) |
| `trang-chu-smoke.mjs` | 11 ✓ rồi đỏ `:450:12` | **đỏ sẵn** (ADR-0038); bản sao khoá 15 + bỏ qua `:450`: 41 ✓ (mục 4) |
| `dot-c-smoke.mjs` | 2 ✓ rồi đỏ `:126:12` | **đỏ sẵn**: khác biệt DUY NHẤT `+ 'push'` (ADR-0036) — thứ tự con của trang Tôi KHÔNG đổi (hai dòng mới nằm trong thẻ có sẵn) |
| `tai-xe-trang-dau-smoke.mjs` | **4 ✓**, thoát 0 | chạy vì `web/shell.ts` đổi chữ ký `navGroups` / `addNav` (nhánh tài xế) |
| `sap-het-han-smoke.mjs` | **7 ✓**, thoát 0 | chạy vì nhóm VẬN CHUYỂN của `web/account.ts` có dòng mới (huy hiệu ở `#vc-links` vẫn đúng) |
| `help-smoke.mjs` | **5 ✓**, thoát 0 (`HELP SMOKE OK — mọi bước ✓`) | chạy vì mục "Trợ giúp" của thanh bên nay nằm dưới mép ở 1040×820 (kịch bản kiểm mục CÓ MẶT trong `#sidebar` và chấm đỏ, không kiểm đang trong khung nhìn) |

## 7. Đỏ sẵn (không do việc này, không chữa — theo lời giao)

- `trang-chu-smoke.mjs:450` (khối "Cần xem lại" một dòng — góp ý chỉ Toàn quyền, ADR-0038) và số mục thanh bên thiếu "Nhật ký" (ADR-0038): kịch bản khoá 16, số thật 15.
- `dot-c-smoke.mjs:126` / `:140`: thiếu `push` (Thông báo trên điện thoại, ADR-0036).

## 8. Chưa làm / chưa kiểm

- Chưa có người kiểm độc lập; chưa thử iPhone thật; chưa thử trên production.
- `web/CLAUDE.md` chưa sửa (luật) — đề xuất hai dòng ở `docs/superpowers/plans/2026-09-28-tach-danh-muc-giay-to-de-xuat-luat.md`, chờ chủ duyệt.
- Không thêm mục nhật ký thay đổi (điều phối viết mục 1.36 chung). **Lưu ý cho mục 1.36:** mục 1.35 trong `src/shared/changelog.ts` còn câu "(mục \"Danh mục giấy tờ\" ở trang Tôi)" — mục 1.36 nên nói chỗ mới: "Loại giấy tờ người" ở nhóm Quản trị, "Loại giấy tờ xe" trong Vận chuyển.
- **Quan sát (không sửa, bề mặt):** ở khung 1040×820, thanh bên của Quản trị nay 15 mục + 3 tiêu đề nhóm nên "Trợ giúp" nằm dưới mép, phải cuộn riêng thanh bên mới thấy (thanh bên đã có cuộn riêng — G-3b; tài khoản Quản trị + Toàn quyền của chủ đã 15 mục từ trước việc này). Chân thanh (tên, Đăng xuất) vẫn đứng yên.
- Ảnh `00-cho-vao-*` không chụp lại (G8).

## 9. Cho điều phối

- Việc có đổi app (trang, điều hướng) → khi phát hành cần `npm run trien-khai` (gộp vào bản 1.36 theo lời giao); không migration, không đổi máy chủ.
- Kiểm độc lập nên chạy lại: `danh-muc-giay-to-smoke`, `xe-smoke`, `trang-chu-smoke` (+ bản sao khoá 15 nếu muốn thấy phần sau `:450`), `dot-c-smoke`, `npm run test:e2e -- pwa`.
