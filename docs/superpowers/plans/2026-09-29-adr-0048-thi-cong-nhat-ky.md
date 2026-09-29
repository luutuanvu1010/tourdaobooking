# Nhật ký thi công ADR-0048 (nhà xe đối tác, tài xế đối tác `DRIVER_PARTNER`)

- **Kế hoạch:** `docs/superpowers/plans/2026-09-29-adr-0048-thi-cong.md` (vai lập kế hoạch, 2026-09-29; đo trên `377813d`).
- **Đề xuất sửa luật:** `docs/superpowers/plans/2026-09-29-adr-0048-de-xuat-luat.md` (CHỜ CHỦ DUYỆT).
- **Nguồn chuẩn tắc:** ADR-0048 (accepted 2026-09-28: D1, D2; Q4 = Q5 = Q6 = (a)).
- **Nhánh thi công:** `worktree-agent-ae0f600ceaab6d8b4` (worktree `.claude/worktrees/agent-ae0f600ceaab6d8b4`), tách từ `main` @ `ce831f8`; đã gộp nhánh kế hoạch `worktree-agent-a41aedf108f7e51a8` @ `2602301` (chứa `adr-van-chuyen-0047-0048` @ `96d7048`, ADR-0048 accepted) bằng `git merge --no-ff` → `3e6b719`.
- **Cách thi công:** executing-plans, một phiên thi công (vai "người thi công Phần A") do điều phối giao 2026-09-29. Không tự nghiệm thu.
- **Trạng thái:** ĐANG THI CÔNG Phần A (A0 → A15). Phần B chưa làm (điều phối: dừng sau A15).
- **Người ghi nhật ký này không tự nghiệm thu** (N8). Kết quả kiểm độc lập ghi ở mục 8.

## 1. Mốc ban đầu (Task A0)

| Bước | Kết quả |
|---|---|
| 1. ADR-0048 accepted trên nhánh | Có: `docs/adr/ADR-0048-nha-xe-doi-tac-va-tai-xe-doi-tac.md`, dòng Trạng thái "**accepted**", Q4 = Q5 = Q6 = (a) (đọc 2026-09-29 trên `3e6b719`). |
| 2. `docs/quyen-hoan.json` → `phat_hien` | `[]` — không xây trên lỗ đang hở. |
| 3. Chưa ai thêm `DRIVER_PARTNER` / `DRIVER_EXTERNAL` / `CARRIER` / `DRIVES_FOR` | `grep -rn` trong `src migrations web` → rỗng. |
| 4. Số migration; nhánh ADR-0047 đã gộp `main` chưa; 0034–0036 có chạm `stf_`/`pty_`/`vc_` không | Số lớn nhất `0033_van_chuyen_xe.sql`. Nhật ký git trên MỌI nhánh (`--all`) lọc theo `migrations/0034*` … `migrations/004*` → rỗng: CHƯA nhánh nào (kể cả ADR-0047) có tệp 0034+ ⇒ ADR-0047 chưa gộp `main`, chưa có migration thật để soát; không áp phần "nhánh gộp sau" của mục 1.7 (không thêm ô `order.passenger.write`). Để K3 kiểm lại. |
| 5. Mốc `npm test` / `typecheck` (số test, số lỗi, `uptime` nếu ca CPU đỏ) | `npm ci`; `npm test` **1313/1313** xanh (0 đỏ, kể cả ca CPU `claude-guard`; `uptime` lúc đo: tải 3.46 2.84 2.45); `npm run typecheck` **0 lỗi**. Node v22.22.3. |
| 6. Mốc e2e (đỏ sẵn có) | `npm run test:e2e` (đủ bộ) **24/24 kịch bản xanh**, đuôi `audit-invariants` đạt (một cảnh báo sẵn có `R-ORD-6a` — mức cảnh báo, không chặn). Không đỏ sẵn có. Một người thi công khác chạy wrangler song song ở worktree `agent-aa4ba1b121f98db87` — không đụng tới tiến trình của họ. |
| 7. Độ lệch số dòng trích dẫn so với `377813d` | 0 — mã và migration giống `ce831f8`; đã soát `permissions.ts:5,29-31,52-104,158-168`, `roles.ts:7-10,49,75-81,130-158`, `permissions.test.ts:11-53,249-280`, `cong-quyen.test.ts:50-84`, `accounts/index.ts:46-58,341-391,509-600`, `staff/index.ts:159-175,236-323`, `parties/index.ts:129-139,770-796`, `van-chuyen/rules.ts:109-118`, `migrations/0024:75-79`: khớp. |
| 8. Chỗ "đúng số lượng" mới tìm thấy (ngoài mục 1.2 của kế hoạch) | Không có chỗ mới ngoài danh sách của kế hoạch: `permissions.test.ts:249-261`, `cong-quyen.test.ts:49-53`, `handler-view.test.ts:127-130`, `bang-tin.test.ts:25-35,309`, `start-page.test.ts:59-68`, `giay-to-hien-thi.test.ts:153-154`, `roles.test.ts:11-16`, `route-access.test.ts:214,237-238`, `tai-xe-cong.test.ts:88`, `vai-smoke.mjs:31-34`. Bẫy thêm: `roles.test.ts:17` khẳng định MỌI vai bên ngoài mặc định đúng `["PARTNER"]` — sẽ đỏ với `DRIVER_EXTERNAL` (sửa có ngoại lệ tường minh, không xoá vòng). |
| 9. Mốc Chrome (✓/✗ từng kịch bản; số ô vai màn hình đang có) | `npm run build:web` rồi chạy (axe `/private/tmp/tach-dm-axe/package/axe.min.js`, `OUT=/tmp/adr48-chrome-out/a0/…`): `vai-smoke` ✓7 xanh (Quản trị thấy **10** ô vai); `xe-smoke` ✓13 xanh; `tai-xe-trang-dau-smoke` ✓4 xanh; `nhan-tai-xe-smoke` ✓4 xanh. **Đỏ sẵn có:** `dot-a-smoke` ✗ sau ✓8 ("hết giờ chờ: nhat-ky: thẻ đã dựng xong" — trang Nhật ký nay chỉ Toàn quyền, ADR-0038); `trang-chu-smoke` ✗ sau ✓11 ("phải có đúng 2 dòng cảnh báo (Sheet đổi giá + góp ý)", thấy 1 — góp ý nay chỉ Toàn quyền, ADR-0038). Hai đỏ này có trước, không do ADR-0048. |

## 2. Câu trả lời của chủ dự án

| Câu | Trả lời (nguyên văn, ngày giờ, kênh) | Áp ở |
|---|---|---|
| Q1 — sửa chủ xe sau khi thêm | **"Sửa được, ghi nhật ký"** — chủ trả lời trực tiếp điều phối 2026-09-29, điều phối chuyển lại trong lời giao việc = phương án (a): nhật ký ghi "chủ A → B" | Task A9 bước 5 (làm theo (a)) |
| Q2 — màn "Nhà xe" riêng | **Không làm màn riêng "Nhà xe"** — tìm nhà xe ở Danh bạ bằng ô lọc; danh sách xe lọc theo chủ xe (chủ ↔ điều phối 2026-09-29, điều phối chuyển lại) = phương án (a) | Phần B |
| Duyệt tệp đề xuất luật (mục 1–6) | _(chờ)_ | Task K3 |

## 3. Bảng từng task

| Task | Commit | Đỏ trước (dòng đỏ nguyên văn) | Xanh sau (lệnh + số) | P16 (đột biến → đỏ → hoàn nguyên) | Ghi chú |
|---|---|---|---|---|---|
| A0 | — | — | — | — | |
| A1 migration 0037 + cột 9 + vai | (commit A1) | `node --test src/migrations-tai-xe-doi-tac.test.ts src/shared/{permissions,cong-quyen,roles}.test.ts src/roles-schema.test.ts` → pass 23 / fail 7: "SyntaxError: The requested module './shared/permissions.ts' does not provide an export named 'EXTERNAL_PERMISSIONS'"; "not ok 28 - ADR-0048 D2: MỌI ô của Tài xế đối tác (DRIVER_PARTNER) — ghim nguyên dòng, mọi ô tiền = none"; "not ok 26 - seesOnlyAssignedOrders: trên cả 512 tập con quyền…"; "not ok 8 - … với mọi tổ hợp 9 mã quyền…" | 12 tệp test của bước 6 → pass 164 / fail 0; `npm test` **1329/1329**; tsc 0; `npm run db:migrate:local` áp `0037_tai_xe_doi_tac.sql` ✅ (D1 đọc được `DROP TRIGGER` — gỡ điểm chưa chắc 14.2.1 cho 0037); `npm run test:e2e -- parties roles permissions admin` → 5/5 xanh; Chrome `vai-smoke` ✓7 xanh (11 ô vai), `nhan-tai-xe-smoke` ✓4 xanh, `dot-a-smoke` đỏ Y HỆT mốc A0 (✓8 rồi "nhat-ky") | 2026-09-29, mỗi phép trên bản đang làm, hoàn nguyên bằng bản sao → xanh lại: **(a)** `money.view` cột `DRIVER_PARTNER` → `"own"` ⇒ "not ok 18 - ADR-0048 D2: MỌI ô của Tài xế đối tác (DRIVER_PARTNER) — ghim nguyên dòng, mọi ô tiền = none" (`+ 'money.view': 'own'`), kèm "not ok 1 … money.view × DRIVER_PARTNER"; hoàn nguyên → pass 19 fail 0. **(b)** thêm `"DRIVER_PARTNER"` vào `ORDERS_GATE` ⇒ "not ok 7 - ADR-0048 D2: Tài xế đối tác (DRIVER_PARTNER) không nằm trong cổng nào…" error "DRIVER_PARTNER lọt vào cổng […,"INTERN","DRIVER_PARTNER"]" (+ 4 bài cổng khác); hoàn nguyên → pass 7. **(c)** trigger LC-1 `NOT IN ('PARTNER')` ⇒ "not ok 7 - 4(d) LC-1 mới: tài khoản vai bên ngoài CHƯA có quyền nào chèn DRIVER_PARTNER → được", "not ok 10 - 4(g) một nguồn…", "not ok 12 - (f) chỉ còn MỘT trigger…"; hoàn nguyên → pass 13. **(d)** xoá khối `CREATE TRIGGER lc1b_…` ⇒ "not ok 4 - 4(a) LC-1b…" / "not ok 5 - 4(b)…" / "not ok 6 - 4(c)…" error "Missing expected exception"; hoàn nguyên → pass 13. **(e)** `EXTERNAL_PERMISSIONS = ["PARTNER"]` ⇒ "not ok 10 - 4(g) một nguồn…" error "Missing expected exception: DRIVER_PARTNER ngoài EXTERNAL_PERMISSIONS nhưng CSDL cho qua"; hoàn nguyên → pass 13 | Thêm hàm `isExternalPermission` ở `permissions.ts` (đọc chính hằng `EXTERNAL_PERMISSIONS` — `.includes` của bộ `as const` không nhận `PermissionCode` ở tsc). `migrations-0024.test.ts` LC-1 SIẾT thêm mã `DRIVER`. `roles.test.ts:17` sửa thành ngoại lệ có tên `DRIVER_EXTERNAL` (không xoá vòng) + khẳng định mọi mặc định vai bên ngoài ∈ `EXTERNAL_PERMISSIONS`. `role-picker.ts` chỉ đổi import/hàm (logic khoá chéo ở B1): hệ quả tạm — nhóm bên ngoài nay mở ô "Cộng thêm Tài xế đối tác"; máy chủ vẫn chặn lai ở Task A2 (nợ giao diện B1). |
| A2 LC-1b năm đường | (commit A2) | `node --test src/shared/roles.test.ts src/modules/accounts/tai-khoan-lai.test.ts` → pass 2 / fail 7: "not ok 1 - #1 POST /api/staff có vai … expected: 400 actual: **500**"; "not ok 2 - #2 … actual: 500"; "not ok 3 - #4 … actual: 500"; "not ok 4/5 - #5 … actual: 500" (trigger 0037 chặn nhưng route chưa ánh xạ → 500); `roles.test.ts`: taiKhoanLaiProblem chưa có. Hai ca 5b (i)/(ii) XANH ngay từ đầu — trigger không chặn nhầm | `roles.test.ts` + `tai-khoan-lai.test.ts` + `staff/account-roles.test.ts` + `accounts/*.test.ts` → pass 65 / fail 0; `npm test` **1339/1339**; tsc 0; `npm run test:e2e -- roles admin admin-race` → 4/4 xanh | 2026-09-29: **(a)** bỏ `taiKhoanLaiProblem` ở đường #2 → "not ok 2 - #2 POST /api/staff đường cũ … expected: 400 actual: 409" thân `{"error":{"code":"account_rule","message":"Tài khoản Tài xế đối tác không giữ thêm quyền nào khác."}}` — **route thật trả 409 `account_rule`, KHÔNG 500** (bằng chứng lưới `ruleViolation` trong `catch` đường #2); hoàn nguyên → pass 8. **(a')** bỏ lời kiểm ở đường #4 → "not ok 3 - #4 … expected: 400 actual: 409" `account_rule` (bằng chứng `try/catch` mới quanh `db.batch` của #4); hoàn nguyên → pass 8. **(b)** bỏ chốt "vai Tài xế đối tác cùng vai bên ngoài khác" → "not ok 1 - #1 … expected: 'Vai Tài xế đối tác không đi cùng vai bên ngoài khác — một người chọn một…' actual: 'Tài khoản Tài xế đối tác không giữ thêm quyền nào khác.'", "not ok 5", "not ok 26" (roles.test); hoàn nguyên → xanh. **(c)** đảo `rest` của `setPermissionStatements` (chèn trước đóng) → "not ok 6 - 5b (i): 'Tài xế taxi' → 'Tài xế đối tác' … expected: 200 actual: 409" (+ ca đổi hẳn của #4); hoàn nguyên → pass 8 | 5b (ii) không đỏ dưới (c): lô gỡ Quản trị đóng ADMIN bằng câu chốt ĐẦU lô, `rest` chỉ có câu chèn — thứ tự đúng tự nhiên. Đường #3 (Sheet): vai cố định `SALES_STAFF`, `roles.test.ts` khẳng định `defaultPermissions(["SALES_STAFF"])` không có `DRIVER_PARTNER`; không thêm mã. |
| A3 "Toàn công ty", trang đầu | (commit A3) | `node --test src/shared/{thong-bao,bang-tin,start-page}.test.ts` → pass 39 / fail 2: "SyntaxError: The requested module './start-page.ts' does not provide an export named 'coPhanTaiXe'"; "not ok 34 - ADR-0048: 'Toàn công ty' không gồm Tài xế đối tác…". Bài `nhanKetNoi(chỉ DRIVER_PARTNER) = ["nguoi:<id>"]` XANH ngay (Bảng tin không đổi luật — đúng ADR) | tệp trên + `src/thong-bao-web.test.ts src/bang-tin-guard.test.ts` → pass 71; `npm test` **1342/1342**; tsc 0; `npm run build:web` được | 2026-09-29: **(a)** `laNoiBo` trở lại `p !== "PARTNER"` → "not ok 8 - ADR-0048: 'Toàn công ty' không gồm Tài xế đối tác… expected: false actual: true"; hoàn nguyên → xanh. **(b)** bỏ vế `DRIVER_PARTNER` khỏi `coPhanTaiXe` → "not ok 10 - homeRedirect: chỉ Tài xế đối tác (DRIVER_PARTNER) → /tai-xe… expected: '/tai-xe' actual: null"; hoàn nguyên → pass 26 | Bài 512 tập con dùng `coPhanTaiXe` làm kỳ vọng (theo kế hoạch) nên KHÔNG đỏ dưới (b) — ca tường minh ở bài riêng mới là hàng rào. `web/account.ts:91` dùng `coPhanTaiXe`. `web/shell.ts`, `web/tai-xe.ts` đi theo `homeRedirect` — tự đúng, không sửa. |
| A4 cổng toàn tuyến hai mã | (commit A4) | — (bài SIẾT: xanh ngay khi A1, A3 đúng — đúng kế hoạch bước 2) | `node --test src/tai-xe-cong.test.ts` → pass 5 (hai bài × hai mã + bài danh sách); `BANG_STAFF` giữ MỘT bảng (mã trả giống hệt cho `DRIVER` và `DRIVER_PARTNER` ở mọi route `staff`) | 2026-09-29: tạm thêm `"DRIVER_PARTNER"` vào `OFFICE_GATE` → "not ok 4 - ADR-0040 D3 + ADR-0048 D2: tài khoản CHỈ-DRIVER_PARTNER gọi MỌI route cổng office / orders / admin → 403 forbidden ở CỔNG" error "DRIVER_PARTNER — GET /api/catalog: 403 phải là của CỔNG, thấy \"Tài khoản này không được xem bảng giá.\""; bài của `DRIVER` vẫn xanh; hoàn nguyên → pass 5 | Đối chiếu ADR-0048 D2 từng dòng `BANG_STAFF`: không dòng nào cần tách theo mã. |
| A5 migration 0038 | (commit A5) | `node --test src/migrations-nha-xe-doi-tac.test.ts` (chưa có tệp) → "not ok 3 - (c) … error: 'no such table: v_pty_owner_company'", "not ok 4/5 … 'FOREIGN KEY constraint failed'" (chưa có mã CARRIER), (a) (b) đỏ; sau migration còn "not ok 7 - (g) sổ dữ liệu có ba view mới…" tới khi sửa `docs/data-dictionary.json` | tệp mới + `src/architecture.test.ts src/roles-schema.test.ts` → pass 34; `npm run dict` (3 dòng mới ở `DATA-DICTIONARY.md`); `npm test` **1351/1351**; `db:migrate:local` áp `0038_nha_xe_doi_tac.sql` ✅; `npm run test:e2e -- parties` (meta thêm `CARRIER`, `DRIVES_FOR`) → 2/2 xanh. `src/architecture.test.ts` KHÔNG sửa, xanh | 2026-09-29, hoàn nguyên từng lần bằng bản sao → pass 7: **(1)** xoá trigger `pty_relationship_drives_for_person` → "not ok 6 - (f) B1.2: 'Tài xế của' từ hồ sơ TỔ CHỨC → ABORT *_person…" error "Missing expected exception." (+ (a) đếm trigger); **(2)** xoá trigger `…_carrier` → "not ok 6 - (f) …" "Missing expected exception."; **(3)** bỏ nhánh `UNION` đầu của `v_pty_carrier_driver` (T = X) → "not ok 5 - (e) v_pty_carrier_driver: T = X (nhà xe CÁ NHÂN tự lái)…" (+ actual − expected); **(4)** bỏ `JOIN v_pty_carrier` ở nhánh sau → "not ok 5 - (e) …" (dòng "nhà xe thôi → mất cả hai" còn tài xế) | Sự cố nhỏ: bài (c) lúc đầu viết cứng id hồ sơ công ty chủ gieo ở 0030 → `npm test` đỏ ở bài có sẵn "không id cứng (ADR-0024 điều 6)"; sửa thành tra theo tên hồ sơ. |
| A6 route quan hệ | | | | 1 | |
| A7 hàm công bố | | | | a–b | |
| A8 migration 0039 + fixture | | | | a–c | |
| A9 route xe / nhà xe / lọc (bước 5 chờ Q1) | | | | 1 | |
| A10 sắp hết hạn | | | | 1 | |
| A11 kiểm bất biến | | | | 1 | |
| A12 e2e | | | | — | |
| A13 sổ hàng rào | | — | — | — | |
| A14 tài liệu | | — | — | — | |
| A15 tự kiểm Phần A | — | — | | — | |
| B1–B5 | | | | | |
| K1 nhật ký thay đổi | | | | — | số bản: |

## 4. Phán quyết của điều phối (Ruling) — kèm giá nếu sai

Diễn giải I1–I8 của kế hoạch mục 0 chờ điều phối xác nhận hoặc bác. Ghi mỗi Ruling một dòng.

| Mã | Nội dung | Áp ở | Giá nếu sai |
|---|---|---|---|
| R-ĐP1 (điều phối 2026-09-29) | **I1–I8 và G1–G7 CHẤP NHẬN như kế hoạch đề xuất**, kể cả G2 (quan hệ "Tài xế của" không đặt trước ngày kết thúc lúc tạo → 400) | mọi task Phần A | bác G2 → bỏ một điều kiện ở Task A6 |
| R-ĐP2 (điều phối 2026-09-29) | Migration dùng **0037, 0038, 0039**. Nhánh ADR-0047 thi công SONG SONG, dùng 0034–0035 | A1, A5, A8 | trùng số → đổi tên tệp nhánh lên sau |
| R-ĐP3 (điều phối 2026-09-29) | Hai nhánh cùng đụng `src/shared/permissions.ts` + `permissions.test.ts`; ADR-0047 thêm ô `order.passenger.write`. Làm đúng mục 1.7 của kế hoạch, **KHÔNG tự thêm ô của nhánh kia**; nhánh gộp SAU xử lý cột thứ 9 cho ô của nhánh kia | A1 | ô lạ lọt vào bản đồ không qua ADR |
| R-TC1 (người thi công tự diễn giải, 2026-09-29 — điều phối sửa nếu sai) | Lời giao "Nới LC-1 (trigger, `R-LC-1`, `EXTERNAL_ALLOWED`) chỉ ghi vào tệp đề xuất luật. Không sửa tệp luật thật" được hiểu là: **thi công trong mã** đúng như kế hoạch (trigger tạo lại ở migration 0037, `EXTERNAL_PERMISSIONS` thay `EXTERNAL_ALLOWED`, câu kiểm `R-LC-1` ở A11) — vì lời giao cũng đòi P16 cho "LC-1 mới" — và **ghi phần nới vào tệp đề xuất luật mục 1** để chủ xác nhận trước khi gộp. "Tệp luật thật" = `CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/adr/`, `playbook/`, `.claude/`: **không sửa**. `src/architecture.test.ts` không sửa | A1, A11, A14 | nếu điều phối muốn chưa thi công phần nới: hoàn nguyên đoạn trigger LC-1 của 0037, hằng, `R-LC-1` — khi đó không cấp được tài khoản Tài xế đối tác |

## 5. Sự cố

_(chưa có)_

## 6. Nợ còn lại (không chặn gộp)

- Bàn giao lượt 1b / lượt II (kế hoạch mục 14.3): B1.4, B1.5; view `v_pty_carrier_driver` là "hiện tại"; cột `DRIVER_PARTNER` của các ô chuyến mặc định `none`.
- Khoảng hở báo cáo "tài xế của nhà xe chưa có tài khoản không lên danh sách sắp hết hạn" (kế hoạch mục 14.2 điểm 2) — gợi ý ghi `docs/BACKLOG.md`.

## 7. Kết quả kiểm của người thi công (tự khai, chưa phải kiểm độc lập)

_(Task A15)_

## 8. Kiểm độc lập (`nguoi-kiem-doc-lap`, chỉ đọc)

### Giữa chừng (tuỳ điều phối, sau Task A15)

### Cuối — Task K2

## 9. Chưa kiểm (lúc viết mục này)

## 10. Phát hành (chủ dự án tự chạy — Task K3)

- Thứ tự với nhánh ADR-0047 (ai lên `main` trước; có phải đổi số migration của nhánh kia không):
- Lệnh đã đưa chủ:
- Kết quả kiểm chỉ đọc sau triển khai:
