# Nhật ký thi công Vận chuyển lượt 1a (ADR-0040)

- **Kế hoạch:** `docs/superpowers/plans/2026-09-28-van-chuyen-1a.md` (vai lập kế hoạch, 2026-09-28; đo trên `9ead2e7`).
- **Đề xuất sửa luật:** `docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md` (CHỜ CHỦ DUYỆT).
- **Nguồn chuẩn tắc:**
  - ADR-0040 (accepted 2026-09-28; dòng trạng thái `9ead2e7`: chủ trả lời "Mọi nhân viên" cho ô xem giấy tờ của chính mình);
  - danh sách màn `docs/superpowers/specs/2026-09-28-van-chuyen-1a-man-hinh-can-ve.md`.
- **Nhánh thi công:** `worktree-agent-a9cf548897a76b7f7` (worktree `.claude/worktrees/agent-a9cf548897a76b7f7`). Tách từ `origin/main` @ `c276848` (bản 1.34), rồi gộp theo lệnh điều phối: `worktree-agent-ac0436b2bbf204613` @ `0d68af9` (kế hoạch, fast-forward) và `dac-ta-van-chuyen` @ `644a8ee` (ADR-0040 accepted + giữ chỗ migration 0031–0033) → đỉnh `3159fed`. Mã và migration giống hệt `c276848`.
- **Cách thi công:** executing-plans — một phiên thi công (vai THI CÔNG do điều phối giao 2026-09-28) tự làm Task A0 → A23, không giao tiếp subagent. Dừng ở A24 (mốc kiểm giữa chừng) và báo điều phối.
- **Trạng thái (2026-09-28, đỉnh nhánh sau commit này):** **PHẦN A XONG** — Task A0–A23 (A19 hoãn sang Phần B, R17), Ruling R18, R19, R22; kiểm độc lập mốc A24: **ĐẠT CÓ ĐIỀU KIỆN trên `30c2fef`** (mục 8; điều kiện: e2e đủ bộ dời sang người kiểm cuối Task K2). Người thi công Phần A **dừng hẳn**; Phần B (nhánh riêng, R16) gộp đỉnh mới. Chưa push, chưa gộp `main`, chưa lên production.
- **Người ghi nhật ký này không tự nghiệm thu** (N8). Kết quả của người kiểm độc lập ghi ở mục 8.

## 1. Mốc ban đầu (Task A0)

| Mục | Kết quả |
|---|---|
| Bước 1: ADR-0040 (accepted, có câu "Mọi nhân viên") trên nhánh thi công | Có (`git ls-tree HEAD docs/adr/` → `ADR-0040-van-chuyen-luot-1a-xe-giay-to-tai-xe.md`; dòng 3–5: "accepted", "Mọi nhân viên"). 2026-09-28 15:48. |
| Bước 2: `docs/quyen-hoan.json` → `phat_hien` | `[]` (đo trên `3159fed`). Không xây trên lỗ đang hở. |
| Bước 3: `DRIVER` / `vehicle.manage` / `party.document.*` chưa có trong `permissions.ts`, `roles.ts` | `grep` chỉ khớp `TAXI_DRIVER` (vai bên ngoài "Tài xế taxi", `roles.ts:9,38`) — mã khác, không phải `DRIVER`. Chưa ai thêm trước. |
| Bước 4: số migration lớn nhất trên nhánh; kết quả quét mọi nhánh; số dùng cho 1a | Lớn nhất `0030_ho_so_cong_ty_chu.sql`. Quét mọi ref (kể cả stash) bằng MỘT lệnh `git log --all --name-only -- migrations/` (worktree cô lập không cho vòng lặp `for-each-ref`): tệp số ≥ 0029 duy nhất ở mọi nhánh là `0030_ho_so_cong_ty_chu.sql`. ⇒ **0031, 0032, 0033** trống (khớp R13). 0029 vẫn giữ cho Thông báo đính kèm. |
| Bước 5: `npm test` (số test) / `npm run typecheck` | `npm test`: **1175/1175** đạt. `npm run typecheck`: mã thoát 0. (`uptime` 15:48: tải 1,67.) |
| Bước 6: `npm run test:e2e` đủ bộ — kịch bản đỏ sẵn có | **21/23 xanh, 2 đỏ sẵn có**: `catalog` (`tests/e2e/catalog.mjs:188`: người đồng bộ kỳ vọng 'Hệ thống (tự động)', thấy 'QTV Test') và `dispatch` (`tests/e2e/dispatch.mjs:69`: 400 `catalog_unavailable` "dịch vụ ZE1 không còn trong danh mục"). Cả hai phụ thuộc Google Sheet thật (dữ liệu Sheet đổi), không chạm 1a. `audit-invariants --strict` đạt. |
| Bước 7: Chrome (`vai-smoke`, `dot-a-smoke`, `trang-chu-smoke`) — số ✓/✗; **số ô vai `vai-smoke.mjs:34` thật sự đếm được** | Có Chrome (`/Applications/Google Chrome.app`, qua `chrome-wrap.sh`) và `axe.min.js` 4.13.0 (ngoài repo, `/private/tmp/vgt-axe/package/`). Ảnh ghi ra `/tmp/vc1a-chrome-moc/*` (`OUT=`), không bẩn repo. **Cả ba đỏ sẵn có:** `vai-smoke.mjs:34` — **9 ≠ 11** (Quản trị thấy 9 ô vai: 12 vai trừ 3 vai chỉ Toàn quyền — Giám đốc, Điều hành chung, IT — bị ẩn từ ADR-0042; dòng 35 còn hỏi `.disabled` của ô Giám đốc vốn không còn trong DOM). `dot-a-smoke.mjs` — 8 ✓ rồi đỏ ở "nhat-ky: thẻ đã dựng xong" (trang Nhật ký chỉ Toàn quyền từ ADR-0038; kịch bản đăng nhập Quản trị). `trang-chu-smoke.mjs` — 11 ✓ rồi đỏ ở dòng 450 "phải có đúng 2 dòng cảnh báo" (thấy 1: góp ý chỉ Toàn quyền xem từ ADR-0038). **Số ô vai thật: 9** ⇒ Task A2 đặt 10. |
| Bước 8: số dòng trích dẫn lệch so với kế hoạch (đo trên `9ead2e7`) | Không lệch (mã giống hệt `c276848`). Soát ngẫu nhiên: `permissions.ts:28-30`, `start-page.ts:16-18`, `web/home.ts:255-258`, `parties/index.ts:350-405`, `parties/repository.ts:238-243,407,434-436`, `architecture.test.ts:19-44,47-57,73-74,124-134,191-210,429-440` đúng; `route-access.test.ts` bài 86 route ở 190-208 (kế hoạch ghi 191-209, lệch 1). |
| Bước 9: khẳng định "đúng số lượng / đúng danh sách" tìm thêm được | Ngoài danh sách kế hoạch: (1) `src/shared/bang-tin.test.ts:309` (tên bài "128 tập con", không khẳng định số — suy từ MATRIX); (2) `src/modules/dispatch/rules.test.ts:87-92` (danh sách quyền được giao — DRIVER phải KHÔNG vào) và `:101` (vòng tập con, không khẳng định số); (3) giao diện tự thêm ô "Tài xế" khi `PERMISSION_CODES` có mã thứ tám: `web/role-picker.ts:73-74` (cộng/bớt tay), `web/staff.ts:193` (trình sửa quyền cũ), `web/gui-thong-bao.ts:149` (gửi thông báo theo nhóm quyền) — không kịch bản Chrome nào đếm các ô này; (4) `scripts/staff-lib.mjs:33`, `scripts/create-staff.mjs:11` (chữ trợ giúp liệt kê mã, tự đúng); (5) `tests/e2e/permissions.mjs:57` (nhãn PARTNER/INTERN, không đổi). Vai đã ngưng gán qua API (Task A4): chỉ `tests/e2e/parties.mjs:147-173` (GUIDE, DRIVER) và `src/modules/parties/ho-so-co-tai-khoan.test.ts:213,244,284` (DRIVER) — như kế hoạch; `src/modules/staff/index.ts:128` gieo vai STAFF bằng câu lệnh trực tiếp (không qua route) nên không bị lời kiểm A4 chạm. |

**Đỏ sẵn có trên nhánh gốc** (không phải lỗi của 1a, đo 2026-09-28 15:48–16:05 trên `3159fed`):
- e2e `catalog` và `dispatch` (dữ liệu Google Sheet thật đổi — xem bước 6).
- Chrome `vai-smoke.mjs` (dòng 34–35, lệch ADR-0042), `dot-a-smoke.mjs` (Nhật ký chỉ Toàn quyền, ADR-0038), `trang-chu-smoke.mjs` (khối "Cần xem lại" chỉ còn 1 dòng cho Quản trị, ADR-0038).

## 2. Câu trả lời của chủ dự án

| Câu | Nội dung | Trả lời (nguyên văn, ngày) | Ảnh hưởng |
|---|---|---|---|
| R5 (điều phối hỏi) | Ô "xem giấy tờ của chính mình (số che)" mở cho ai | **"Mọi nhân viên"** — phương án A, 2026-09-28 (ghi ở dòng trạng thái ADR-0040, `9ead2e7`) | Task A7 (không còn phụ thuộc) |
| Q1 | Quản trị có được nhập / xem đủ số giấy tờ của tài khoản cấp trên | **Không** — Ruling R8 của điều phối (2026-09-28): áp luật cấp bậc hiện có (`mayManage` / ADR-0042) | Task A8, A9 |
| Q2 | Thêm xe có bắt buộc số khung | **Bắt buộc ở máy chủ; cột CSDL để trống được** — Ruling R9 của điều phối (2026-09-28) | Task A13 |
| Đề xuất luật | Duyệt `docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md` (mục 1–5; 2e tuỳ chọn) | _(điền)_ | Task K3 |
| Truy vấn chỉ đọc (Ruling R1; kế hoạch mục 9 bước 4) | Số hồ sơ đang giữ vai "Tài xế" cũ (`DRIVER`) trên production: đang giữ / tổng số dòng | **chờ chủ chạy** — lệnh chỉ đọc soạn sẵn trong báo cáo Phần A (`npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT (SELECT count(*) FROM pty_party_role WHERE role_type_code = 'DRIVER' AND valid_to_date IS NULL) AS dang_giu_vai_tai_xe_cu, (SELECT count(*) FROM pty_party_role WHERE role_type_code = 'DRIVER') AS tong_so_dong"`); câu `SELECT` đã chạy thử trên D1 local (`--local`, 0 / 0) — cú pháp và tên cột đúng. _(điền: hai con số khi chủ chạy)_ | Task K3 (chỉ để biết; lượt 1a không đổi các dòng đó) |
| Bản vẽ | Link Claude Design bảy màn | Điều phối báo 2026-09-28 (lúc Task A3): chủ đã vẽ xong 7 màn; bản vẽ ở nhánh `dac-ta-van-chuyen` @ `65dde6a`, thư mục `docs/design/van-chuyen-1a/` (đọc `README.md` ở đó trước) — CHƯA gộp vào nhánh Phần A; yêu cầu máy chủ rút ra từ bản vẽ: Ruling R15 | Phần B |

## 3. Bảng từng task

Cột "Đột biến P16": sửa cố ý → đỏ → hoàn nguyên → xanh. Chép **nguyên văn** dòng đỏ, kèm ngày.

| Task | Việc | Commit | `npm test` sau | Dòng ĐỎ trước (đã thấy) | Đột biến P16 (ngày · đột biến · dòng đỏ) | Người kiểm |
|---|---|---|---|---|---|---|
| A0 | Điều kiện trước, mốc | (commit A0 — chỉ nhật ký) | 1175/1175; tsc 0 | — | — | — |
| A1 | `src/shared/giay-to.ts` | (commit A1) | 1180/1180; tsc 0 | 2026-09-28: `node --test src/shared/giay-to.test.ts` → `not ok 1 - src/shared/giay-to.test.ts` … `ERR_MODULE_NOT_FOUND: Cannot find module …/src/shared/giay-to.ts` | — (luật thuần, không phải hàng rào) | chưa |
| A2 | Quyền `DRIVER`, vai `DRIVER_INTERNAL`, migration 0031, cột thứ tám, 256 tập con | (commit A2) | 1189/1189; tsc 0; e2e `parties roles permissions admin` 5/5; `db:migrate:local` áp `0031_vai_quyen_tai_xe.sql` ✅; Chrome `vai-smoke` **7 ✓ XANH** (mốc A0: đỏ dòng 34), `dot-a-smoke` 8 ✓ rồi đỏ đúng chỗ mốc A0 (Nhật ký chỉ Toàn quyền) | 2026-09-28: 16 bài đỏ — migration (a) "expected: 1 / actual: 0" (tệp chưa có), (c) "Cannot read properties of undefined (reading 'name')"; permissions "bản đồ quyền khớp TỪNG Ô … × 8 quyền" (PERMISSION_CODES lệch ORDER), "seesOnlyAssignedOrders … 256" (expected 256 / actual 128), "ghim nguyên dòng"; roles "danh mục: đủ 13 vai" (13 ≠ 12); 0024 "DRIVER cũ ngưng gán mới"; cong-quyen "8 mã quyền"; handler-view/bang-tin "256 tập con" | 2026-09-28 · (a) `order.view` cột DRIVER `none`→`own` ⇒ `not ok 17 - ADR-0040 D3: MỌI ô của Tài xế (DRIVER) — ghim nguyên dòng` (+ 3 bài khác của tệp) → hoàn nguyên → 18/18 · (b) thêm `"DRIVER"` vào `OFFICE_GATE` ⇒ `not ok 1 - ADR-0019: ba danh sách cổng khai tường minh (khoá giá trị)` và `not ok 6 - ADR-0040 D3: Tài xế (DRIVER) không nằm trong cổng nào — tài khoản chỉ-DRIVER không qua admin/office/orders` (+2) → hoàn nguyên → 6/6 · (c) bỏ `UPDATE pty_role_type SET active = 0 WHERE code = 'DRIVER'` ⇒ `not ok 4 - (d) mã vai hồ sơ cũ DRIVER: vẫn nhóm OTHER, vẫn tên 'Tài xế', NGƯNG gán mới (active = 0)` → hoàn nguyên → 6/6 | chưa |
| A3 | Trang đầu tài xế — **theo Ruling R10: tạm là `/account`** (hằng `TRANG_DAU_TAI_XE`; Phần B đổi sang `/tai-xe`) | (commit A3) | 1191/1191; tsc 0; Chrome MỚI `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/tai-xe-trang-dau-smoke.mjs` **2 ✓** (390 + 1040: "/" → `/account`, không lời gọi `/api/orders*`, không lỗi console; ảnh ở `docs/evidence/2026-09-28-van-chuyen-1a/anh/`); `trang-chu-smoke` 11 ✓ rồi đỏ ĐÚNG chỗ mốc A0 (dòng 450, "1 !== 2") | 2026-09-28: `not ok 1 - src/shared/start-page.test.ts` (`error: 'test failed'` — nạp tệp hỏng vì `TRANG_DAU_TAI_XE` chưa được xuất) | 2026-09-28 · bỏ dòng `if (hasPermission(who, "DRIVER")) return TRANG_DAU_TAI_XE;` ⇒ `not ok 9 - homeRedirect: chỉ Tài xế (DRIVER) → trang đầu của tài xế (Ruling R10: tạm là trang Tài khoản) — …` và `not ok 10 - homeRedirect: 256 tập con quyền — …` → hoàn nguyên → 10/10 · cùng đột biến + `npm run build:web` ⇒ kịch bản Chrome `Error: hết giờ chờ: tài xế mở "/" được đưa sang /account` (thoát 1) → hoàn nguyên + build lại → `TAI XE TRANG DAU SMOKE OK` | chưa |
| A4 | Vai đã ngưng không gán mới (Ruling R6: MỌI loại đã ngưng, trừ `OWNER_COMPANY`) | (commit A4) | 1194/1194; tsc 0; e2e `parties company` 3/3 (e2e parties thêm ca GUIDE/DRIVER → 409 `role_type_inactive`) | 2026-09-28: `not ok 1 - R6: Quản trị gán loại vai ĐÃ NGƯNG (DRIVER cũ, STAFF, SALES, GUIDE, AGENT) → 409 role_type_inactive, …` — `expected: 409 / actual: 201` | 2026-09-28 · bỏ dòng `if (!doiCongTyChu && loai !== null && !loai.active) return ROLE_TYPE_INACTIVE();` ⇒ cùng dòng đỏ (409 / 201) → hoàn nguyên → 3/3 | chưa |
| A5 | Migration 0032 giấy tờ của người | (commit A5) | 1204/1204; `db:migrate:local` áp `0032_giay_to_cua_nguoi.sql` ✅ (D1 đọc được 7 trigger có `WHEN … EXISTS`) | 2026-09-28: 10/10 bài của `src/migrations-giay-to-cua-nguoi.test.ts` đỏ (tệp chưa có) | 2026-09-28, bỏ từng khối (`/tmp/vc1a-p16.py`) → đúng ca đỏ → hoàn nguyên → 10/10: `_cccd_one_person_ins` ⇒ `not ok 4 - (d) một số CCCD thuộc đúng MỘT người…`; `_cccd_one_person_upd` ⇒ `not ok 4 - (d)…`; `_superseded` ⇒ `not ok 5 - (e) không sửa đè giấy tờ đã có dòng gia hạn CHƯA huỷ`; `_voided` ⇒ `not ok 6 - (f) dòng đã huỷ không sửa được (kể cả bỏ huỷ)`; `_identity` ⇒ `not ok 7 - (g) không đổi người, loại, dòng trước, mốc tạo…`; `_no_delete` ⇒ `not ok 8 - (h) không xoá dòng giấy tờ (Hiến chương 5.5)`; `_renew_ins` ⇒ `not ok 9 - (i) gia hạn: nối đúng người…`; chỉ mục `_next_uq` ⇒ `not ok 9 - (i)…`; `CHECK ((document_type_code = 'GPLX') = (license_class_code IS NOT NULL))` ⇒ `not ok 3 - (c) khoá ngoại / CHECK…`. (Bỏ một trigger còn làm đỏ thêm (a) vì (a) đếm ≥ 7 trigger mới.) | chưa |
| A6 | Luật thuần giấy tờ người (`src/modules/parties/giay-to.ts`) + luật NGÀY chung đặt ở `src/shared/giay-to.ts` (`kiemNgayCap`, `kiemNgayHetHan` — để `van-chuyen` dùng lại, không chép hai nơi) | (commit A6) | 1216/1216; tsc 0 | 2026-09-28: `not ok 1 - src/modules/parties/giay-to.test.ts` … `ERR_MODULE_NOT_FOUND: Cannot find module …/src/modules/parties/giay-to.ts`. Ghi thật: hai hàm ngày của tệp dùng chung viết CÙNG LÚC với bài kiểm riêng của chúng (không quan sát đỏ riêng); hành vi của chúng được phủ bởi các ca ngày của `giay-to.test.ts` (đã đỏ trước) | — (luật thuần; hàng rào "nhật ký không số" đo ở A8, A16) | chưa |
| A7 | Route đọc + ô `party.document.view/write` (+ R15 điểm 6: route 1 chỉ dòng hiện hành, ngày hết hạn tăng dần; DTO + thân yêu cầu ở `contracts.ts`) | (commit A7) | 1221/1221; tsc 0; `route-access` 89 route | 2026-09-28: bảng quyền — `not ok … bản đồ quyền khớp TỪNG Ô …`, `… ghim nguyên dòng` (DRIVER), `… ADR-0030 L1-12: MỌI ô của Đối tác …`, `… mười hai thao tác hẹp …`; route — 5/5 bài `giay-to-route.test.ts` đỏ `expected: 200 / actual: 404` (route chưa có) | 2026-09-28 · (a) `!can(staff, "party.document.view", { ownerId: staff.id })` → `false` ⇒ `not ok 2 - route 1 (R5 'Mọi nhân viên'): … Đối tác → 403 ĐÚNG MÃ (R4) …` (`expected: 403 / actual: 200`) · (b) `!can(staff, "party.document.write")` ở route 3 → `false` ⇒ `not ok 3 - route 3: Bán hàng, Kế toán → 403 ĐÚNG câu của ô …` (`403 / 200`) · (c) `maskedNumber: r.number_key` (không che) ⇒ `not ok 1 - route 1 …` và `not ok 4 - route 3 …` (`route 3 …: lộ số 079123456789`) · hoàn nguyên mỗi lần → 5/5 | chưa |
| A8 | Route ghi (thêm / gia hạn / sửa sai / huỷ dòng) + cấp bậc (Ruling R8) | (commit A8) | 1228/1228; tsc 0; `route-access` 92 route | 2026-09-28: 7 bài mới đỏ — `expected: 403 / actual: 405` (POST chưa có route) và `expected: 201 / actual: 404` | 2026-09-28 (`/tmp/vc1a-mut.py`, hoàn nguyên sau mỗi lần → 12/12) · (a) bỏ lời hỏi ô ở route 4 ⇒ **LẦN ĐẦU KHÔNG ĐỎ**: bài chỉ thử trên hồ sơ GẮN tài khoản, luật cấp bậc trả 403 cùng câu nên che lỗ → **sửa bài**: thêm hồ sơ không tài khoản cho Bán hàng/Kế toán ở cả ba route → chạy lại ⇒ `not ok 6 - route 4–6 quyền: …` (`403 / 201`); (a') route 5 ⇒ `not ok 6 …` (`403 / 201`); (a'') route 6 ⇒ `not ok 6 …` (`403 / 200`) · (b) bỏ lời kiểm cấp bậc ở route 4 ⇒ `not ok 12 - R8 (Q1): …` (`403 / 201`) · (c) bỏ lời kiểm "dòng hiện hành" ở route 6 ⇒ `not ok 10 - route 6 sửa sai: …` (`'document_not_current' / 'document_changed'` — trigger vẫn chặn, đúng hai lớp); (c') ở route 5 ⇒ `not ok 9 - route 5 gia hạn: …` (cùng cặp mã) · (d) nối số vào `detail` ⇒ `not ok 7 - route 4 thêm: …` và `not ok 10 …` (`nhật ký: Căn cước công dân (CCCD), không hạn số 079000000001`) | chưa |
| A9 | Xem đủ số + ô `party.document.reveal` (giấy không số → 409 `no_number`) | (commit A9) | 1232/1232; tsc 0; `route-access` 93 route | 2026-09-28: bảng quyền (`… ghim nguyên dòng`, `… Đối tác …`, `bản đồ quyền khớp TỪNG Ô …`) + 4 bài route 7 `expected: 403|200|409|500 / actual: 404` | 2026-09-28 (hoàn nguyên → 16/16) · (a) bỏ lời hỏi ô ⇒ `not ok 13 - route 7: Bán hàng, Kế toán → 403 ĐÚNG câu, …` (`403 / 200`, ở hồ sơ không tài khoản) · (b) bắt lỗi nhật ký rồi vẫn trả số ⇒ `not ok 16 - route 7: ghi nhật ký LỖI thì KHÔNG trả số (ghi trước, trả sau)` (`500 / 200`) · (c) bỏ lời kiểm cấp bậc ⇒ `not ok 15 - route 7: … Quản trị xem số trên hồ sơ gắn tài khoản Toàn quyền → 403 (R8) …` (`403 / 200`) | chưa |
| A10 | Danh mục loại giấy tờ người + hạng (luật kiểm danh mục loại giấy tờ đặt ở `src/shared/giay-to.ts` để giấy tờ xe dùng lại; hạng ở `parties/giay-to.ts`) | (commit A10) | 1238/1238; tsc 0; `route-access` 97 route | 2026-09-28: `SyntaxError: … does not provide an export named 'kiemLoaiGiayToMoi'` / `'kiemHangMoi'`; 4 bài route 8–11 `expected: 403|201|409 / actual: 405|404` | 2026-09-28 (hoàn nguyên → 29/29 của hai tệp) · (a) bỏ `if (!can(staff, "admin.manage")) return ADMIN_ONLY();` ở `POST /api/parties/document-types` ⇒ `not ok 27 - hàng rào cổng quản trị (ADR-0019): mọi route cổng admin có \`if (!can(<người gọi>, "<ô quản trị>")) return …\` …` (+ `not ok 21`, `not ok 22` của hàng rào 2) — hành vi không đỏ được vì cổng admin chỉ cho Quản trị/Toàn quyền, vốn có ô này (đúng như kế hoạch nói) · (b) bỏ lời kiểm `fixed_type` ⇒ `not ok 19 - route 9: ngưng CCCD / GPLX → 409 fixed_type …` (`409 / 200`) | chưa |
| A11 | Hàm công bố `expiringDriverDocuments` (+ kiểu `ExpiringPersonDocument`) — `parties/index.ts` xuất ĐÚNG hai tên mới (so dòng `export` với `c276848`) | (commit A11) | 1240/1240; tsc 0 | 2026-09-28: `not ok 1 … error: 'parties.expiringDriverDocuments is not a function'`, `not ok 2 … error: 'câu phải được đăng ký bằng defineSql'` | 2026-09-28 (hoàn nguyên → 2/2) · (a) thay điều kiện `EXISTS (… pty_party_role … = ?1 …)` bằng `?1 IS NOT NULL …` ⇒ `not ok 1 - expiringDriverDocuments: đúng hai dòng hiện hành của tài xế đang mở vai …` · (b) thêm `d.document_number` vào SELECT ⇒ `not ok 2 - câu SQL parties.expiring_driver_documents không chọn cột số, nơi cấp …` (`error: 'không chọn document_number'`) | chưa |
| A12 | Migration 0033 + sổ dữ liệu + cạnh / tiền tố (**NỚI — CHỜ CHỦ DUYỆT**, R14; chú thích tại chỗ ở `src/architecture.test.ts`) + R15 điểm 1 lớp CSDL ("dùng lại xe" vấp chỉ mục biển số) | (commit A12) | 1251/1251; `db:migrate:local` áp `0033_van_chuyen_xe.sql` ✅; id dòng chính sách gieo `5d6f216c-d03c-4d0a-a669-736e33dae350` (sinh một lần, không dãy ≥ 8 chữ số) | 2026-09-28: 11/11 bài `src/migrations-van-chuyen-xe.test.ts` đỏ (tệp chưa có) | 2026-09-28 (hoàn nguyên → 11/11): chỉ mục `vc_vehicle_plate_open_uq` ⇒ `not ok 4 - (d) biển số: … DÙNG LẠI xe cũ khi biển đã có chủ → chặn (R15 điểm 1)`; `vc_vehicle_chassis_uq` ⇒ `not ok 5 - (e) số khung …`; `CHECK ((status = 'retired') = (valid_to_date IS NOT NULL))` → `CHECK (1)` ⇒ `not ok 6 - (f) … ` (`Missing expected exception: ngừng thiếu ngày`); `vc_vehicle_no_delete`, `vc_vehicle_document_no_delete` ⇒ `not ok 8 - (h) không xoá xe, không xoá giấy tờ xe …`; `…_superseded`, `…_voided`, `…_identity`, `…_renew_ins`, chỉ mục `…_next_uq` ⇒ `not ok 9 - (i) giấy tờ xe: …`; `vc_expiry_policy_no_update`, `…_no_delete` ⇒ `not ok 10 - (j) chính sách ngưỡng …` (bỏ trigger còn đỏ (a) vì (a) đếm ≥ 8 trigger); bỏ `"parties"` khỏi `ALLOWED_EDGES["van-chuyen"]` ⇒ `not ok 7 - ADR-0002 điều 5/6: khoá ngoại xuyên module đúng chiều phụ thuộc hoặc là cạnh toàn vẹn đã khai` | chưa |
| A13 | Module `van-chuyen`: xe + ô `vehicle.manage` + STRICT + R15 điểm 1, 3 (lớp route: `vehicle_plate_taken` / `vehicle_chassis_taken`, câu "Biển số này đang dùng cho xe khác." / "Số khung này đã có ở xe khác."; lớp CSDL: `vehicle_plate_conflict` / `vehicle_chassis_conflict`) + trường cảnh báo theo bản vẽ màn 01 (`alertTypeName`, `alertDaysLeft`, `alertCount` — giả định GT1, mục 6) | (commit A13) | 1263/1263; tsc 0; `route-access` 101 route, 14 module | 2026-09-28: `rules.test.ts` `ERR_MODULE_NOT_FOUND …/van-chuyen/rules.ts`; `xe.test.ts` 6/6 đỏ (route chưa có); bảng quyền (`… ghim nguyên dòng`, `… Đối tác …`, `… TỪNG Ô …`, `… mười hai thao tác hẹp …`) | 2026-09-28 (hoàn nguyên mỗi lần) · (a) `!can(staff, "vehicle.manage")` ở route 13 → `false` ⇒ `not ok 1 - quyền: Bán hàng, Kế toán × 4 route xe → 403 …` (`403 / 201`) · (b) bỏ luật bắt buộc số khung (R9) ⇒ `not ok 3 - kiemXeMoi: …`, `not ok 4 - kiemSuaXe: …`, `not ok 9 - trùng (R15 điểm 3): … thiếu số khung → 400 (R9)` · (c) thêm `db.prepare("SELECT 1")` vào `van-chuyen/repository.ts` ⇒ `not ok 14 - ADR-0002 điều 8(b): tệp SQL của module nghiêm không được \`.prepare(\` với chuỗi/template thô` (+ `not ok 16`) — module ĐÃ ở STRICT · (d) R15 điểm 1: bỏ lời kiểm biển số lớp route ⇒ `not ok 3`, `not ok 4 - ngừng dùng và DÙNG LẠI xe (R15 điểm 1) …`, `not ok 5` (mã về `vehicle_plate_conflict` của lớp CSDL — đúng hai lớp) · (d') bỏ lời kiểm số khung lớp route ⇒ `not ok 3`, `not ok 5` (`'vehicle_chassis_taken' / 'vehicle_chassis_conflict'`) | chưa |
| A14 | Giấy tờ xe (thêm / gia hạn / sửa sai / huỷ dòng; xe đã ngừng → 409 `vehicle_retired` ở thêm + gia hạn) | (commit A14) | 1272/1272; tsc 0; `route-access` 104 route | 2026-09-28: `rules.test.ts` `SyntaxError: … does not provide an export named 'chiTietNhatKyXe'`; `giay-to-xe.test.ts` 5/5 đỏ (`expected: 201 / actual: 404`, route chưa có) | 2026-09-28 (hoàn nguyên → 5/5) · (a) bỏ lời hỏi `vehicle.manage` ở route 16 ⇒ `not ok 1 - quyền: Bán hàng, Kế toán × route 16–18 → 403 …` (`403 / 201`) · (b) bỏ lời kiểm "dòng hiện hành" ở route 18 ⇒ `not ok 4 - sửa sai: dòng cũ → 409 document_not_current …` (`'document_not_current' / 'document_changed'` — trigger vẫn chặn) · (c) bỏ lời kiểm "xe đã ngừng" ở route 16 ⇒ `not ok 5 - xe đã ngừng: …` (`409 / 201`) | chưa |
| A15 | Danh mục loại giấy tờ xe, ngưỡng (chỉ-thêm, hiệu lực ngay), danh sách sắp hết hạn gộp xe + tài xế + `count` (R15 điểm 2) | (commit A15) | 1276/1276; tsc 0; `route-access` **109** route (86 + 23) | 2026-09-28: 4/4 bài `sap-het-han.test.ts` đỏ (`expected: 403|200|201 / actual: 404`) | 2026-09-28 (hoàn nguyên → 13/13, 4/4) · (a) bỏ lời hỏi `settings.ops` ở route 22 ⇒ `not ok 2 - route 22 ngưỡng: Quản trị → 403 …` (`403 / 200`) **và** `not ok 11 - hàng rào cổng quản trị (ADR-0019): …` (+ `not ok 5`, `not ok 6` của hàng rào 2) · (b) bỏ `v.status <> 'retired'` ⇒ `not ok 1 - route 23: …` (`expected: 3 / actual: 4` — xe đã ngừng lọt vào) · (c) bỏ lời hỏi `vehicle.manage` ở route 23 ⇒ `not ok 1 - route 23: Bán hàng → 403 …` (`403 / 200`) + `not ok 6` hàng rào 2 | chưa |
| A16 | Bài toàn tuyến che số + nhật ký không số (`src/giay-to-khong-lo-so.test.ts`; 10 route giấy tờ lấy từ mã thật) | (commit A16) | xanh ngay trên mã A7–A15 (đúng kỳ vọng kế hoạch — bài là hàng rào, không phải hành vi mới) | — | 2026-09-28 (hoàn nguyên → 1/1 mỗi lần) · (a) route 4 nối số vào `detail` ⇒ `not ok 1 - …` (`error: 'nhật ký lộ "079888777666"'`) · (b) `cheSo` trả nguyên số ⇒ `not ok 1 - …` (`error: 'thân "thêm CCCD" lộ "079888777666"'`) · (c) xoá khoá `GET /api/parties/documents/meta` khỏi `TUYEN` ⇒ `not ok 1 - …` (so tập khoá lệch tập route thật) | chưa |
| A17 | `R-PTY-2..4` (R-PTY-4 mức `warn-unless-strict`), `R-VC-1..2` ở `scripts/audit-checks.mjs` | (commit A17) | 1282/1282; `node scripts/audit-invariants.mjs --db local`: 5 kiểm mới ✓; **R-N1-5 ✗ do môi trường** (D1 local của worktree mới chưa có tài khoản nào — không phải lỗi 1a; e2e đủ bộ chạy `--strict` trên D1 tạm có tài khoản mới là tín hiệu thật) | 2026-09-28: 5 bài mới đỏ `phải có đúng một kiểm R-PTY-2` (… R-VC-2) | 2026-09-28 (hoàn nguyên → 46/46) · (a) R-PTY-2 `> 1` → `> 2` ⇒ `not ok 42 - R-PTY-2 …` (`expected: 1 / actual: 0`) · (b) R-PTY-4 `>= 8` → `>= 20` ⇒ `not ok 44 - R-PTY-4 …` (`1 / 0`) · (c) R-VC-1 bỏ `status <> 'retired'` ⇒ `not ok 45 - R-VC-1 …` (`expected: 0 / actual: 1` — ca khoẻ "xe đã ngừng giữ biển cũ" thành vi phạm) | chưa |
| A18 | Bài cổng toàn tuyến của tài xế (`src/tai-xe-cong.test.ts`; giữ theo Ruling R11) — danh sách route tự quét mọi `src/modules/*` có `AppModule` (109 route, 14 module); 81 route office/orders/admin → 403 ĐÚNG câu cổng; 28 route `staff` có bảng `BANG_STAFF` ghi tay (đọc từng dòng: không route nào trả dữ liệu đơn/khách/tiền — hai route đơn cổng staff thử trên đơn CÓ THẬT → 403) | (commit A18) | xanh ngay (3/3) — bài siết, không hành vi mới | — | 2026-09-28 · thêm `"DRIVER"` vào `ORDERS_GATE` ⇒ `not ok 2 - ADR-0040 D3: tài khoản CHỈ-DRIVER gọi MỌI route cổng office / orders / admin → 403 forbidden ở CỔNG …` (`error: 'GET /api/catalog/for-order: 403 phải là của CỔNG, thấy "Tài khoản này không lập đơn nên không xem được danh mục dịch vụ."'`) → hoàn nguyên → 3/3 | chưa |
| A19 | Trang Danh mục giấy tờ (khuôn sẵn) + Chrome | **HOÃN sang Phần B** (người thi công, theo lời điều phối ở R15 "Không làm giao diện ở Phần A" và ranh giới R16: Phần A tránh `web/**`, `public/**`) — API danh mục (A10, A15) đã có; trang + `danh-muc-giay-to-smoke.mjs` + dòng liên kết ở trang Tôi chờ Phần B. Ghi nợ mục 6; **cần điều phối xác nhận** | — | — | — (chưa có hàng rào để đột biến) | — |
| A20 | E2E `van-chuyen` (`tests/e2e/van-chuyen.mjs`, 10 bước: tài khoản "Tài xế công ty" qua `POST /api/staff`; cổng 403; vai `DRIVER` cũ 409; giấy tờ người số che / xem đủ số + nhật ký / CCCD trùng / gia hạn chép số / sửa sai dòng cũ 409; xe + R15 dùng lại xe 409 `vehicle_plate_taken`; sắp hết hạn có `count`; ngưỡng Quản trị 403, Toàn quyền 7 → **khôi phục 30 ở `finally`**; nhật ký không số; **lớp CSDL bằng SQL gõ tay trên D1 local**: 6 lệnh bị trigger / chỉ mục chặn). `run.mjs`: đứng sau `roles`, trước `passkey`; `README.md` thêm dòng | (commit A20) | không đổi (e2e không thuộc `npm test`); `npm run test:e2e -- van-chuyen` ⇒ `E2E: 2/2 kịch bản xanh` (kịch bản + `audit-invariants --strict`) | — (kịch bản viết trên mã A1–A18 đã có). Hai lần đỏ đầu do CHÍNH kịch bản, diễn lại không nguyên văn: (1) câu INSERT biển trùng gõ `plate_number` quá ngắn → CHECK độ dài chặn trước chỉ mục ⇒ sửa kịch bản chép `plate_number` + `plate_key` của xe có thật để thử đúng chỉ mục `UNIQUE`; (2) gia hạn GPLX tới ngày xa làm giấy rơi khỏi danh sách sắp hết hạn ⇒ gia hạn tới `vnDate(12)` | 2026-09-28 · ô `vehicle.manage` của ADMIN → `"none"` ⇒ `E2E: 1/2 kịch bản LỖI` · `AssertionError [ERR_ASSERTION]: {"error":{"code":"forbidden","message":"Tài khoản này không quản lý được xe."}}` (`actual: 403`, `expected: 201`, bước 7) → hoàn nguyên (tệp chép lại từ bản sao lưu, không còn khác biệt) | chưa |
| A21 | Sổ hàng rào: 20 dòng mới ở `docs/SO-HANG-RAO.md` (dòng 104–123, trước "Cách thêm dòng"), mỗi dòng có ngày thấy chặn thật + dòng đỏ nguyên văn từ bảng này + giới hạn | (commit A21 — chỉ `docs/SO-HANG-RAO.md`) | không đổi (chỉ tài liệu) | — | Làm THÊM ở task này, 2026-09-28 (hoàn nguyên mỗi lần): (a) R-PTY-3 bỏ vế `p.party_id <> n.party_id OR` ⇒ `not ok 43 - R-PTY-3 (ADR-0040 D2): …` (`error: 'nối sang người khác'`); (b) R-PTY-3 `HAVING count(*) > 1` → `> 2` ⇒ `not ok 43 …` (`expected: 1 / actual: 0`); (c) R-VC-2 bỏ vế `p.vehicle_id <> n.vehicle_id OR` ⇒ `not ok 46 - R-VC-2 (ADR-0040 D1): …` (`error: 'nối sang xe khác'`); (d) R-VC-2 `> 1` → `> 2` ⇒ `not ok 46 …` (`1 / 0`); (e) R-VC-1 `> 1` → `> 2` ⇒ `not ok 45 - R-VC-1 (ADR-0040 D1): biển số không trùng giữa các xe CHƯA NGỪNG — …` (`1 / 0`) → 46/46; (f) Chrome `vai-smoke`: tên vai `DRIVER_INTERNAL` → "Tài xế nội bộ" + `build:web` ⇒ `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:` (`actual: 'Tài xế nội bộ'`, `expected: 'Tài xế công ty'`) → hoàn nguyên + build lại. Ghi rõ điều CHƯA có: `danh-muc-giay-to-smoke` (A19 hoãn); SQL gõ tay của e2e mới thấy XANH, chưa đột biến riêng trên D1 | chưa |
| A22 | Tài liệu mô tả + đề xuất luật: `docs/SYSTEM-DESIGN.md` §5 (7 bảng, 2 dòng bất biến, migration 0031–0033, sơ đồ), §7 (109 route, 23 dòng route mới, lời hỏi ô), §8 (cổng, 4 ô mới, cột `DRIVER`, vai 13, vai đã ngưng), §9 (trang đầu tài xế, `giay-to.ts`, `start-page.ts`), §14 (lượt 1b / 2 / để sau), §15 (8 thuật ngữ), §17 (K2, K5, K10, K11, K15); `docs/CHANGE-GUIDE.md` §1 (3 dòng), §2 d (số kế tiếp `0034`, tiền tố `vc_`), §2 e (`row()` tám cột, bước 5 mới), §2 u (mục 6 vai tài xế + vai đã ngưng), công thức mới **y**, §3 (4 dòng), §4 bẫy 49; `tests/e2e/README.md` (A20); đề xuất luật: số dòng đo lại trên `fedffdf`, 4a CHỜ PHẦN B, thêm 4c (`start-page.ts` → `tai-xe-trang-dau-smoke`), 4d (`roles.ts` / `role-picker.ts` → `vai-smoke`, kèm ghi chú sửa kịch bản theo ADR-0042). `npm run dict`: không đổi (sổ dữ liệu đã đủ 7 bảng + module từ A5, A12). KHÔNG sửa `docs/ARCHITECTURE.md`, `CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md`, `docs/adr/**` (R14) | (commit A22) | không đổi (chỉ tài liệu) | — | — | chưa |
| A23 | Kiểm toàn bộ Phần A (tự khai) — chi tiết mục 7 | (commit cuối Phần A, cùng mục 7) | 1285/1285; tsc 0; `build:web` 0; e2e đủ bộ `24/24 kịch bản xanh`; `tests/audit` 36/36; Chrome: xem mục 7 | — | — | — |
| R18 | Route 1 chặn tài khoản LAI mang quyền Đối tác (`holdsPartner`, cùng câu 403) | `af356c5` | 1287/1287 (cùng R19); tsc 0; e2e `parties van-chuyen` `3/3 kịch bản xanh` | 2026-09-28: `not ok 3 - route 1 (Ruling R18): tài khoản LAI — …` (`expected: 403 / actual: 200`) | 2026-09-28 · bỏ dòng `if (holdsPartner(staff)) return …` ⇒ `not ok 3 - route 1 (Ruling R18): …` (`expected: 403 / actual: 200`) → hoàn nguyên → 21/21 | chưa |
| R19 | Route 22: hai lần đổi mốc nhắc cùng mili-giây → 409 `stale` "Vừa có người đổi mốc nhắc, tải lại rồi thử lại." (không 500) | `0b35fa0` | (như trên) | 2026-09-28: `not ok 24 - route 22 (Ruling R19): …` (`expected: 409 / actual: 500`) — bài đứng đồng hồ bằng `mock.timers` (chỉ `Date`) | 2026-09-28 · tắt ánh xạ (`if (false)`) ⇒ `not ok 3 - route 22 (Ruling R19): …` (`expected: 409 / actual: 500`) → hoàn nguyên → 5/5 | chưa |
| R22 | Sổ hàng rào: "sửa sai giấy tờ phải có lý do" (lớp máy chủ; lớp CSDL không có — dựa vào kỷ luật) + P16 lần đầu cho lời kiểm lý do; thêm bài tầng route (người, xe) và hai ca thuần cho xe (thiếu lý do / lý do ngoài danh sách); đề xuất luật Mục 2f | (commit R22) | 1289/1289; tsc 0 | — (bài canh hành vi đã có — xanh ngay trên mã hiện tại) | 2026-09-28 · bỏ lời kiểm danh sách đóng ở `kiemSuaSai` ⇒ `not ok 13 - route 6 (Ruling R22): …`, `not ok 30 - kiemSuaSai: …` (`expected: 400 / actual: 500`); ở `kiemSuaSaiXe` ⇒ `not ok 5 - sửa sai giấy tờ xe (Ruling R22): …`, `not ok 15 - kiemSuaSaiXe: …` (`400 / 500`); bỏ riêng dòng `choXe` ⇒ **KHÔNG đỏ** (nhánh cuối là lưới thứ hai, cùng câu); bỏ cả hai lưới ⇒ `not ok 4 - sửa sai: …`, `not ok 15 …` (`400 / 200`) → hoàn nguyên → 33/33, 16/16 | A24 không phủ (sau `30c2fef`) |
| A24 | Kiểm độc lập giữa chừng (khuyến nghị) | — | — | — | — | **ĐẠT CÓ ĐIỀU KIỆN trên `30c2fef`** (mục 8) |
| B0–B8 | Phần B — giao diện theo bản vẽ | _(điền từng task)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ |
| K1 | Nhật ký thay đổi (số bản chốt lúc gộp; tạm 1.35) | _(điền)_ | _(điền)_ | — | — | _(điền)_ |

## 4. Phán quyết của điều phối (Ruling) — kèm giá nếu sai

Ruling đã có trong kế hoạch (mục 0), chép lại:
- **R1:**
  - Mã vai tài khoản **`DRIVER_INTERNAL`**, nhãn **"Tài xế công ty"** (khuôn `GUIDE_INTERNAL`).
  - Không dùng `DRIVER` cho vai: `pty_role_type` đã có `DRIVER` nhóm OTHER, `migrations/0011:76`.
  - Ngưng dòng `DRIVER` cũ (`active = 0`) để máy chặn gán mới.
  - Chủ chạy truy vấn chỉ-đọc đếm hồ sơ đang giữ vai `DRIVER` trước khi triển khai.
  - Mã quyền app `DRIVER` giữ được (tiền lệ `INTERN`).
  - **Tiền đề đã sửa trong kế hoạch:** `active = 0` hôm nay chỉ ẩn ở giao diện; Task A4 thêm lời kiểm ở route cho hàng rào máy thật. Áp cho **mọi** loại vai đã ngưng — điều phối có thể hẹp lại.
- **R2:**
  - Cột `DRIVER` không "tuyệt đối none". Ngoại lệ: `feedback.submit = any`, `feedback.view = own`, ô "xem giấy tờ của chính mình" (`own`); còn lại `none`.
  - Có bài ghim cả hàng.
- **R3:**
  - Tài khoản chỉ `DRIVER` đi tới trang đầu riêng (`/tai-xe`, qua `homeRedirect`), không gọi `/api/orders/dashboard`.
  - Có test khoá.
- **R4:**
  - Route "xem giấy tờ của chính mình" có cổng `"staff"`; thân route tự chặn Đối tác.
  - Route chỉ trả giấy tờ của chính người gọi, số che.
- **R5:** Chủ trả lời 2026-09-28: ô "xem giấy tờ của chính mình" mở cho **mọi nhân viên nội bộ** (A). Task A7 không còn phụ thuộc.

Ruling mới (điều phối giao cùng lệnh thi công, 2026-09-28; **thắng kế hoạch nếu lệch** — chép nguyên ý):
- **R6.** Lời kiểm máy chủ "loại vai đã ngưng (`active = 0`) thì không gán mới → 409 `role_type_inactive`" áp cho MỌI loại vai đã ngưng, trừ đường đổi công ty chủ (`OWNER_COMPANY`, ADR-0043). Lý do: đúng nghĩa "ngưng dùng" đã duyệt ở 0024; giao diện vốn đã ẩn các loại này. Sửa các test cũ đang gán loại vai đã ngưng sang loại còn dùng, như kế hoạch nêu.
- **R7.** Danh mục dùng `code` làm khoá chính (không UUID): chấp nhận. Vẫn đủ dấu vết, `active`, khoá lạc quan, nhật ký cùng lô.
- **R8 (Q1).** Quản trị KHÔNG được nhập hay "xem đủ số" giấy tờ của tài khoản cấp trên (Quản trị khác, chủ). Áp luật cấp bậc hiện có (`mayManage` / ADR-0042).
- **R9 (Q2).** Số khung bắt buộc ở máy chủ; cột CSDL để trống được.
- **R10.** Khi chưa có màn `/tai-xe` (Phần B chờ bản vẽ), `homeRedirect` đưa tài khoản chỉ có `DRIVER` tới trang **Tài khoản** hiện có (không 404, không gọi dashboard đơn). Phần B sẽ đổi sang `/tai-xe`. Có test khoá. ⇒ **Thay Task A3 của kế hoạch**: hằng `TRANG_DAU_TAI_XE = "/account"` (trang Tài khoản trong `PAGES`), bài khoá hỏi thêm `PAGES.includes(TRANG_DAU_TAI_XE)`.
- **R11.** Giữ A18 (bài cổng toàn tuyến, là siết thêm).
- **R12.** Nhãn vai: "Tài xế công ty". Mã vai `DRIVER_INTERNAL`. Mã vai hồ sơ cũ `DRIVER` đặt `active = 0`.
- **R13.** Migration 0031, 0032, 0033 (đã giữ chỗ). Số bản nhật ký thay đổi tạm 1.35, chốt lúc gộp.
- **R14.** Tệp đề xuất luật (cạnh module, ALLOWED_EDGES…) CHƯA áp vào tài liệu luật. Chủ duyệt trước khi day-len; điều phối trình.
- **R15** (điều phối gửi giữa lúc thi công Task A3, 2026-09-28 ~16:10, sau khi chủ vẽ xong 7 màn — bản vẽ ở nhánh `dac-ta-van-chuyen` @ `65dde6a`, `docs/design/van-chuyen-1a/README.md`). Bản vẽ đòi máy chủ Phần A đáp ứng; người thi công đối chiếu kế hoạch và áp như sau:
  1. **"Dùng lại xe"** (Ngừng → Đang dùng): kiểm lại biển số không trùng xe chưa ngừng khác ở CẢ HAI lớp — máy chủ (câu tra trước khi ghi, ở POST thêm xe và PUT sửa/dùng lại → 409 `vehicle_plate_taken`) và CSDL (chỉ mục duy nhất một phần `vc_vehicle_plate_open_uq`, đã có trong kế hoạch A12). Lỗi lớp CSDL (chỉ tới khi lớp máy chủ bị vượt, vd hai người ghi cùng lúc) ánh xạ mã RIÊNG `vehicle_plate_conflict` (cùng câu báo) để P16 của lớp máy chủ đỏ được (khuôn `document_not_current` ≠ `document_changed` của kế hoạch). Có test + P16 cho từng lớp (A12 lớp CSDL, A13 lớp máy chủ). Kế hoạch đã có ca "PUT xe cũ về active → 409" và G9; R15 thêm lớp máy chủ.
  2. **Số đếm cho huy hiệu menu**: `GET /api/van-chuyen/sap-het-han` trả thêm `count` (= số dòng, gồm đã hết + sắp hết — như dòng "{{ count }} giấy" của màn 06); chỉ người có `vehicle.manage` gọi được (lời hỏi đã có ở route 23). Chọn "API danh sách trả count" trong hai cách điều phối cho, không thêm route đếm riêng (không nở số route; cùng một câu tra).
  3. **Mã lỗi riêng**: biển trùng → 409 `vehicle_plate_taken` "Biển số này đang dùng cho xe khác."; số khung trùng → 409 `vehicle_chassis_taken` "Số khung này đã có ở xe khác." (thay `plate_taken` / `chassis_taken` của kế hoạch). Lớp CSDL: `vehicle_plate_conflict` / `vehicle_chassis_conflict`, cùng câu.
  4. **"Sửa sai" bắt buộc lý do** (danh sách đóng): kế hoạch đã có (`LY_DO_SUA_SAI`, `kiemSuaSai` A6, route A8/A14). Không đổi.
  5. **"Xem đủ số" = một POST**, ghi nhật ký trước rồi trả số: kế hoạch đã có (A9). Tự che 10 giây là việc giao diện, Phần B.
  6. **"Giấy tờ của tôi"** (route 1): chỉ trả dòng HIỆN HÀNH (màn 05 chỉ có giấy hiện hành; không dòng đã thay / đã huỷ), xếp **ngày hết hạn tăng dần, "không hạn" cuối** (rồi thứ tự loại) để giao diện lấy 2 giấy gần hạn nhất. Route 3 (Danh bạ) cùng thứ tự cho dòng hiện hành (quyết định thiết kế 3: đã hết → sắp hết → còn hạn → không hạn), dòng lịch sử đứng sau, giao diện gom theo `previousId`.
  - "Không làm giao diện ở Phần A. Phần B sẽ giao sau khi Phần A qua người kiểm." ⇒ người thi công **HOÃN Task A19** (trang "Danh mục giấy tờ" khuôn sẵn — là giao diện) sang Phần B; ghi ở mục 6 (nợ) và báo điều phối xác nhận. API danh mục (A10, A15) vẫn làm ở Phần A.
- **R16** (điều phối gửi giữa lúc thi công, 2026-09-28 ~17:10, sau Task A18): chủ yêu cầu làm Phần B (giao diện) SONG SONG — một trợ lý khác, nhánh riêng, gộp nhánh Phần A định kỳ. Ranh giới: Phần B KHÔNG sửa `migrations/`, `src/modules/**`, `permissions.ts`, `roles.ts`, `audit-checks.mjs`; Phần A tránh sửa `web/**`, `public/**` ngoài những gì kế hoạch Phần A đã ghi (trang đầu tạm R10 đã xong). Phần B sẽ đổi trang đầu của `DRIVER` sang `/tai-xe`; Phần A GIỮ NGUYÊN R10. Đổi hình dạng DTO / route mà giao diện dùng (`src/shared/contracts.ts`) phải ghi rõ trong commit. ⇒ Khẳng định việc hoãn Task A19 (trang danh mục là `web/`, `public/`) — thuộc Phần B. Các thay đổi `contracts.ts` ĐÃ có trước R16: commit A7 (`PersonDocument*`, `DocumentCorrectRequest`), A13 (`Vehicle*` kể cả GT1), A15 (`VanChuyenMetaResponse`, `ExpiringItemDto`, `ExpiringListResponse` có `count`) — tóm tắt lại trong báo cáo cho điều phối.
- **R17–R21** (điều phối trả lời sáu câu của báo cáo Phần A, 2026-09-28, sau Task A23 — chép nguyên ý):
  - **R17:** A19 hoãn sang Phần B — xác nhận; trợ lý giao diện làm màn danh mục theo khuôn có sẵn.
  - **R18:** chặn tài khoản lai ở route "giấy tờ của tôi" (route 1): tài khoản giữ BẤT KỲ quyền `PARTNER` nào (kể cả lai với quyền nội bộ) nhận 403, theo tiền lệ "chặn tài khoản lai" của ADR-0030. Thêm `holdsPartner` (hoặc hàm tương đương đang có), test, P16, dòng sổ hàng rào. ⇒ làm ở commit `af356c5`.
  - **R19:** lỗi 500 của route 22 (đổi mốc nhắc hai lần cùng mili-giây) → 409 với câu "Vừa có người đổi mốc nhắc, tải lại rồi thử lại."; có test. ⇒ làm ở commit `0b35fa0` (mã `stale` — người thi công chọn, cùng nghĩa khoá lạc quan; bề mặt, đổi được).
  - **R20:** GT1–GT4 giữ nguyên.
  - **R21:** cạnh `van-chuyen → parties, audit` và tiền tố `vc_`/`vc` vẫn chờ chủ duyệt ở tệp đề xuất luật; điều phối trình cuối đợt, người thi công không làm gì thêm.
  - **A24: CÓ** — điều phối giao người kiểm độc lập ngay sau khi xong R18, R19. Người thi công dừng, chờ kết quả.
- **R22** (điều phối, 2026-09-28, sau kiểm độc lập mốc A24 — điểm THẤP-2; chép nguyên ý):
  - (a) thêm một dòng `docs/SO-HANG-RAO.md`: chặn "sửa sai giấy tờ (người và xe) phải chọn lý do trong danh sách đóng"; cơ chế: máy chủ (`LY_DO_SUA_SAI` ở `src/shared/giay-to.ts` + route sửa sai + test); lớp CSDL: KHÔNG CÓ (lý do chỉ nằm trong nhật ký), **dựa vào kỷ luật**; ngày quan sát chặn thật — nếu chưa từng P16 lời kiểm lý do ở máy chủ thì làm ngay (bỏ bước kiểm lý do → test đỏ → hoàn nguyên) rồi ghi ngày.
  - (b) tệp đề xuất luật thêm **Mục 2f**: `docs/ARCHITECTURE.md` Phần I, bảng thi hành, dòng "5.1 Bất biến sát dữ liệu" (dòng 147 trên `c276848`), cột chỗ còn hở thêm "sửa sai giấy tờ phải có lý do (ADR-0040) chỉ ở mã — lý do nằm trong nhật ký, CSDL không có cột để kiểm"; lý do Hiến chương 6.2; thêm dòng vào bảng "Tóm tắt để chủ duyệt". Không sửa `docs/ARCHITECTURE.md` thật.
- **Q1, Q2 của kế hoạch mục 12** coi như đã trả lời bằng R8, R9 (mặc định (a) cả hai) — ghi ở mục 2.
- **Cấm của lượt thi công:** không `git push`, không gộp vào `main`; không lệnh `--remote`, `wrangler deploy`/`secret`; không sửa `CLAUDE.md`, `.claude/`, `playbook/`, `docs/adr/` (kể cả `docs/adr/README.md`), `src/CLAUDE.md`, `web/CLAUDE.md`. Truy vấn chỉ-đọc remote là việc của CHỦ (câu lệnh viết sẵn trong báo cáo).

## 5. Sự cố

- **2026-09-28, Task A15 — bài khoá lạc quan chập chờn.** Ca "mốc cũ → 409 stale" của danh mục loại giấy tờ xe đỏ một lần (`Cannot read properties of undefined (reading 'code')`: lần PUT "mốc cũ" lại 200). Gốc: khoá lạc quan so `updated_at` theo MILI-GIÂY; trên SQLite trong bộ nhớ, lần tạo và lần sửa đầu có thể cùng một mili-giây ⇒ mốc mới = mốc cũ. Sửa ở BÀI (không đổi hành vi máy chủ): chờ 5 ms trước lần sửa đầu ở bốn bài có cùng dạng (`sap-het-han`, `xe`, `giay-to-xe`, `giay-to-route` hai chỗ); chạy lại ba lần liên tiếp 35/35 xanh. **Nợ ghi ở mục 6**: cùng dạng khoá lạc quan theo mốc thời gian có sẵn ở `loc_location`, hồ sơ… — hai người lưu cùng một mili-giây trên cùng mốc gốc thì người sau ghi đè (rủi ro thấp; ngoài phạm vi 1a).

- **2026-09-28, Task A21 — máy có 19 tiến trình Chrome headless mồ côi** (cha = tiến trình 1, chạy 20–21 giờ, cổng gỡ lỗi từ xa mở — sót lại của các lần chạy kịch bản Chrome cũ bị ngắt giữa chừng). Người thi công đã dừng chúng (`kill`, chỉ các tiến trình mồ côi > 19 giờ) trước khi chạy Chrome cho P16, để máy đỡ bận. Không ảnh hưởng mã.

## 6. Nợ còn lại (không chặn gộp)

- **Lượt 1b** (ADR-0040 D3, thiết kế §4–§5):
  - ô "xem cuốc xe của mình" cho `DRIVER`;
  - trang `/tai-xe` hiện cuốc xe;
  - nghĩa của hạng GPLX (chở tối đa bao nhiêu khách);
  - bộ điều kiện xuất bến;
  - khoảng nghỉ;
  - chuyến / điểm dừng / phân bổ khách.
- **Lượt 2:** tài xế đối tác (nhóm bên ngoài) + sửa LC-1; quyết số phận mã vai hồ sơ cũ `DRIVER`.
- **Nhắc hạn trên chuông** (cơ chế nhắc theo thời gian) — ADR-0040 D1 để sau.
- **Chuyển chủ xe** (khi đổi công ty chủ, hoặc xe thuê) — ADR-0040 D1: "việc riêng".
- **Ảnh giấy tờ** (thiết kế H5 nhắc "ảnh giấy"): chưa làm ở 1a.
- **Task A19 hoãn sang Phần B** (**điều phối xác nhận — R17**; ban đầu người thi công hoãn theo lời điều phối ở R15: "Không làm giao diện ở Phần A"): trang "Danh mục giấy tờ" khuôn sẵn + kịch bản Chrome `danh-muc-giay-to-smoke.mjs` + dòng liên kết ở trang Tôi. API danh mục (A10, A15) ĐÃ có ở Phần A. Tiêu chí nghiệm thu mục 3 dòng 11 (phần "trang /danh-muc-giay-to … Chrome") và dòng sổ hàng rào tương ứng chờ Phần B. **Cần điều phối xác nhận.**

- **Khoá lạc quan theo mili-giây** (mục 5, sự cố A15): hai lần lưu cùng một mili-giây trên cùng mốc gốc thì lần sau không bị bắt "stale" — khuôn chung của dự án (địa điểm, hồ sơ, danh mục…), không riêng 1a. Chưa sửa.
- ~~**Đổi mốc nhắc hai lần cùng một mili-giây → 500**~~ — **ĐÃ XỬ LÝ (Ruling R19, `0b35fa0`)**: nay 409 `stale` "Vừa có người đổi mốc nhắc, tải lại rồi thử lại."; lô huỷ nên không dòng thừa.
- ~~**Câu hỏi — tài khoản lai ở route 1**~~ — **ĐÃ XỬ LÝ (Ruling R18, `af356c5`)**: mọi tài khoản giữ quyền `PARTNER` (kể cả lai) nhận 403 ở `GET /api/parties/documents/mine` (`holdsPartner`, tiền lệ ADR-0030).
- **Có sẵn từ trước, không thuộc 1a (ghi để khỏi lẫn):** hai route đơn cổng `staff` (`POST /api/orders/:id/handler-cancel`, `…/handler-money-edit`) trả 404 cho đơn KHÔNG tồn tại nhưng 403 cho đơn có thật (lộ "đơn có tồn tại" với mọi tài khoản đăng nhập, kể cả tài xế) — bài `src/tai-xe-cong.test.ts` thử trên đơn có thật nên thấy 403.
- **Hệ quả của mã quyền mới ở giao diện có sẵn (không sửa, ghi để Phần B / chủ biết):** trang lặp `PERMISSION_CODES` tự hiện "Tài xế" — nhóm nhận của trang Gửi thông báo (`web/gui-thong-bao.ts`) và ô chỉnh tay quyền ở bảng chọn vai (`web/role-picker.ts`). Hợp ADR-0040 D3 ("nhận thông báo gửi cho mình"), nhưng chưa ai thử trên giao diện.

**Giả định của người thi công** (P8 — bề mặt, đảo ngược được; **điều phối giữ nguyên cả bốn — Ruling R20**):
- **GT1** (A13): `VehicleDto` có thêm ba trường suy ra (`alertTypeName`, `alertDaysLeft`, `alertCount`) để giao diện dựng đúng dòng cảnh báo của bản vẽ màn 01 ("Phù hiệu đã hết hạn 8 ngày · 2 giấy sắp hết hạn", "Kiểm định còn 21 ngày"). Chỉ thêm trường, không đổi trường đã có của kế hoạch; không dữ liệu cá nhân. Bỏ được nếu điều phối không muốn.
- **GT2** (A7–A9): thân yêu cầu các route ghi giấy tờ (không có trong kế hoạch) đặt ở `src/shared/contracts.ts`: `PersonDocumentAddRequest`, `PersonDocumentRenewRequest`, `DocumentCorrectRequest` (`{ reason, value?, expectedUpdatedAt }` — tên khoá chữ Anh như các route `parties` cũ). Giấy tờ không có số mà bấm "Xem đủ số" → 409 `no_number`.
- **GT3** (A8): gia hạn không gửi hạng thì chép hạng dòng trước (kế hoạch chỉ nói chép số); hạng cũ đã ngưng thì phải chọn hạng mới. Gia hạn / thêm giấy tờ của loại đã ngưng → 400 (như "thêm").
- **GT4** (A10): nhật ký sửa danh mục (`party_document_catalog_changed`) không gắn đối tượng (không `target_type`) — mã danh mục không phải hồ sơ.

## 7. Kết quả kiểm của người thi công (tự khai, chưa phải kiểm độc lập)

Đo 2026-09-28 trên đỉnh nhánh `5f868d7` (mã giống commit cuối; commit cuối chỉ thêm tài liệu). Máy: không có `trien-khai` đang chạy; nhánh Phần B chạy `wrangler dev` / Chrome song song (thư mục D1 tạm riêng).

- `npm test`: **1285/1285** (thoát 0) · `npm run typecheck`: **thoát 0** (ba tsconfig) · `npm run build:web`: **thoát 0**.
- `npm run db:migrate:local`: `✅ No migrations to apply!` — 0031, 0032, 0033 đã áp lên D1 local ở Task A2, A5, A12 (mỗi lần `✅`).
- `npm run test:e2e` đủ bộ: **`E2E: 24/24 kịch bản xanh`** (thoát 0; `van-chuyen` đứng sau `roles`, trước `passkey`). So mốc A0 (21/23): `catalog`, `dispatch` nay XANH — do dữ liệu Google Sheet thật (bên ngoài), 1a không chạm hai kịch bản đó; KHÔNG phải "đã sửa". Đuôi `audit-invariants --strict`: "Mọi bất biến đạt, 2 cảnh báo (D1 local, --strict)" — có `R-PTY-2`, `R-PTY-3`, `R-PTY-4`, `R-VC-1`, `R-VC-2` (cả năm ✓). Hai cảnh báo `R-ORD-6a`, `R-ORD-6b` (mức cảnh báo, chuỗi điều chỉnh tiền đơn — không thuộc 1a) **không so được với mốc A0**: lúc đó `dispatch` đỏ sớm ở `tests/e2e/dispatch.mjs:69`, có thể chưa ghi các dòng điều chỉnh.
- `node scripts/audit-invariants.mjs --db local`: thoát 1 — 28 ✓, 1 ✗ `R-N1-5` ("còn ít nhất một quản trị viên đang hoạt động"): D1 local của worktree có **0 tài khoản** (`SELECT count(*) FROM staff` → 0) — môi trường, không phải 1a (như A17). Năm kiểm mới ✓.
- `node --test "tests/audit/*.test.mjs"`: **36/36** (thoát 0) — không có ca đỏ nào để phân loại.
- Chrome Phần A (`OUT=/tmp/vc1a-chrome/<tên>`, không ghi vào repo): `vai-smoke` **7 ✓, thoát 0** (mốc A0 đỏ dòng 34 — kịch bản đã sửa theo ADR-0042 ở A2) · `dot-a-smoke` 8 ✓ rồi đỏ **đúng chỗ mốc A0** (`Error: hết giờ chờ: nhat-ky: thẻ đã dựng xong (máy tính)` — Nhật ký chỉ Toàn quyền, ADR-0038) · `trang-chu-smoke` 11 ✓ rồi đỏ **đúng chỗ mốc A0** (`trang-chu-smoke.mjs:450`, `actual: 1` / `expected: 2`) · `dot-c-smoke` (không có mốc A0) 2 ✓ rồi đỏ `dot-c-smoke.mjs:124` "Tôi (máy tính): thứ tự DOM gốc phải giữ nguyên" — kịch bản kỳ vọng 6 mục, trang có thêm `#push` (mục Thông báo trên điện thoại, ADR-0036) vốn nằm trong `public/account.html` của `c276848`; `web/`, `public/` KHÔNG đổi so `c276848` ⇒ đỏ sẵn có, không thuộc 1a (suy từ mã; **chưa chạy lại trên `c276848`** để thấy bằng máy) · `tai-xe-trang-dau-smoke` **2 ✓, thoát 0** · `danh-muc-giay-to-smoke`: **chưa có** (Task A19 hoãn).
- `git diff --stat c276848 -- web public`: **rỗng**. `git diff --stat 3159fed -- CLAUDE.md .claude playbook docs/adr src/CLAUDE.md web/CLAUDE.md docs/ARCHITECTURE.md`: **rỗng** (Ruling R14).
- Lệnh chỉ đọc cho chủ (đếm hồ sơ đang giữ vai `DRIVER` cũ trên production) đã chạy thử NGUYÊN câu `SELECT` trên D1 local bằng `--local`: cú pháp + tên cột đúng (local 0 / 0). Lệnh `--remote` là việc của chủ.
- **Sau Ruling R18, R19** (đỉnh `0b35fa0`, 2026-09-28): `npm test` **1287/1287** (thoát 0; +2 bài mới) · `npm run typecheck` **thoát 0** · `npm run test:e2e -- parties van-chuyen` **`E2E: 3/3 kịch bản xanh`** (thoát 0; máy không có `trien-khai`, không `wrangler dev` nào khác lúc chạy). Không chạy lại e2e đủ bộ / Chrome (R18, R19 chỉ đổi hai route máy chủ; `web/`, `public/` vẫn không đổi).
- Chrome Phần B: xem mục 11.7 (người thi công Phần B điền 2026-09-28 — tám kịch bản mới + chạy lại kịch bản có sẵn).

## 8. Kiểm độc lập (`nguoi-kiem-doc-lap`, chỉ đọc)

### Kiểm độc lập mốc A24 (2026-09-28)

_Chép nguyên từ lời điều phối (người kiểm chỉ đọc); người thi công không đánh giá thêm._

- **Kết luận:** ĐẠT CÓ ĐIỀU KIỆN trên `30c2fef`.
- **Người kiểm tự chạy:**
  - `npm test`: 1287/1287;
  - typecheck: thoát 0;
  - `tests/audit`: 36/36;
  - `npm run dict` sinh lại trong bản sao riêng: diff rỗng;
  - D1 local áp đủ 0031–0033 (`wrangler d1 migrations apply --local --persist-to` thư mục tạm). Việc này giải quyết điểm "chưa chắc" số 1 ở mục 14 của kế hoạch.
- **P16, người kiểm tự phá trên bản `git archive` riêng, cả 4 đều đỏ rồi hoàn nguyên:**
  - bỏ trigger CCCD một người: đỏ ở `migrations-giay-to-cua-nguoi.test.ts`;
  - đảo thứ tự ghi nhật ký / trả số ở route reveal: đỏ ở `giay-to-route.test.ts`;
  - thêm DRIVER vào `OFFICE_GATE`: đỏ ở `cong-quyen.test.ts` + `tai-xe-cong.test.ts`;
  - phá trigger CCCD lần hai: xác nhận route 4/6 chỉ dịch lỗi CSDL, đúng như kế hoạch dòng 332.
- **Điều kiện:** e2e đủ bộ CHƯA chạy vì máy bận (`wrangler dev` của Phần B chạy suốt buổi). Dời sang người kiểm cuối (Task K2).
- **THẤP-1:** `docs/adr/README.md` đổi 1 dòng, do commit `644a8ee` của điều phối (giữ chỗ số migration), không phải của người thi công. Vô hại. Đã ghi nhận.
- **THẤP-2:** "sửa sai phải có lý do" chỉ có lớp máy chủ. Không có lớp CSDL vì lý do chỉ nằm trong nhật ký. → Ruling R22 (mục 4; đã làm — mục 3 dòng R22).
- **THẤP-3:** tài khoản lai PARTNER + ADMIN vẫn ghi / xem đủ số giấy tờ người khác như Quản trị.
  - Là nợ kiến trúc có từ trước: đường gán quyền cũ `POST /api/staff` không gửi `roles`, và `PUT /api/staff/:id/permissions` khi đích chưa có vai. Đã ghi sẵn ở `src/shared/permissions.ts:188-192`.
  - Chỉ Toàn quyền tạo được tổ hợp này (LC-4). Khi đã có ADMIN thật thì đúng ô ADR-0040 D2.
  - THẤP với 1a. Không vào `docs/quyen-hoan.json`, vì sổ đó chỉ nhận HIGH trở lên. Không sửa trong 1a.

### Kiểm độc lập cuối — Task K2

- **Cuối — Task K2 (bắt buộc; phải chạy e2e đủ bộ — điều kiện của A24; phủ cả R22 sau `30c2fef`):**
  - **Kết luận:** _(điền: ĐẠT / ĐẠT CÓ ĐIỀU KIỆN / KHÔNG ĐẠT, ngày, trên mã commit nào)_
  - **Phép đột biến người kiểm tự làm:** _(điền)_
  - **Phát hiện và cách xử lý:** _(điền)_

## 9. Chưa kiểm (lúc viết mục này)

- iPhone thật; tài khoản thật trên production.
- Dữ liệu production: số hồ sơ đang giữ vai hồ sơ cũ `DRIVER` (chủ tự chạy lệnh chỉ đọc — báo cáo Phần A).
- Giao diện có sẵn tự hiện mã quyền mới "Tài xế" (nhóm nhận ở trang Gửi thông báo, ô chỉnh tay ở bảng chọn vai) — chưa ai thử trên giao diện.
- Giao diện với tài khoản lai mang quyền Đối tác (nay 403 ở "giấy tờ của tôi" — R18): trang nào gọi route này phải ẩn mục — việc của Phần B, chưa kiểm.
- `dot-c-smoke` trên `c276848` (để thấy bằng máy rằng chỗ đỏ `:124` có sẵn).
- Lớp CSDL của e2e (6 câu SQL gõ tay) mới thấy XANH, chưa đột biến riêng trên D1 (trigger / chỉ mục đã thấy chặn ở bài `node:sqlite` — `docs/SO-HANG-RAO.md`).
- Toàn bộ Phần B (giao diện theo bản vẽ) và Task A19.
- e2e đủ bộ do NGƯỜI KIỂM độc lập tự chạy — điều kiện của A24, dời sang người kiểm cuối Task K2 (người thi công đã chạy đủ bộ ở A23: `24/24`, trên `5f868d7` — trước R18, R19, R22).
- R22 (sau `30c2fef`) chưa có người kiểm độc lập xem.

## 10. Phát hành (chủ dự án tự chạy — Task K3)

- Chủ đã duyệt tệp đề xuất luật: _(điền ngày, nguyên văn)_; commit áp từng tệp luật: _(điền)_
- `npm run day-len -- <nhánh>`: _(điền: ngày giờ, kết quả)_
- `npm run trien-khai` (có migration 0031–0033): _(điền: số phiên bản, Worker, mốc lùi, `audit-invariants --db remote`, cổng phiên bản sau deploy)_
- AI kiểm bằng GET công khai sau triển khai: _(điền)_

## 11. Phần B — giao diện theo bản vẽ (người thi công Phần B, 2026-09-28)

- **Nhánh:** `worktree-agent-a0820caa3926e181b` (worktree `.claude/worktrees/agent-a0820caa3926e181b`), tách từ `origin/main` @ `c276848` (bản 1.34); gộp `dac-ta-van-chuyen` (`65dde6a` bản vẽ, rồi `e4d2013` theo điều phối) và nhánh Phần A `worktree-agent-a9cf548897a76b7f7` (lần đầu `ce813ed`, lần hai `30c2fef` — R18, R19; lần cuối `5162f4a` — R22, commit gộp `b986bb7`, xem 11.7).
- **Căn cứ:** bản vẽ `docs/design/van-chuyen-1a/` (README + 00–07 + khung dùng chung); kế hoạch mục 7 (B0–B8); lời giao của điều phối (các tin bổ sung: A19 chuyển sang Phần B + soát nhãn "Tài xế"; R18 ẩn mục giấy tờ với tài khoản mang quyền Đối tác; gộp `e4d2013`; tệp đề xuất luật chỉ điền 4a, 4b; gộp đúng `5162f4a`; Task K1 — nhật ký thay đổi 1.35).
- **Ranh giới Phần A được giữ:** không sửa `migrations/`, `src/modules/**`, `src/shared/permissions.ts`, `src/shared/roles.ts`, `scripts/audit-checks.mjs`, `src/shared/contracts.ts`. Tệp dùng chung Phần B THÊM mới: `src/shared/giay-to-hien-thi.ts` (+ test); sửa `src/shared/start-page.ts` (+ test) và `src/shared/sw-policy.ts` theo lời giao.
- **Người ghi mục này là người thi công — KHÔNG tự nghiệm thu (N8).**

### 11.1 Mốc Chrome trước khi sửa (đỉnh gộp `448d47b`, 2026-09-28 17:25–17:52, Chrome headless, ảnh ra `/tmp`)

| Kịch bản | Kết quả mốc | Ghi chú |
|---|---|---|
| `tai-xe-trang-dau-smoke.mjs` (bản Phần A, 2 bước) | xanh 2/2 | |
| `dot-c-smoke.mjs` | **đỏ sẵn** (2 ✓ rồi dừng) | `Tôi (máy tính): thứ tự DOM gốc phải giữ nguyên — … "domOrder":["me","myjobs","links","maintenance","passkeys","push","pin-form"]` — `#push` (Thông báo) có từ trước |
| `dot-a-smoke.mjs` | **đỏ sẵn** (8 ✓) | `hết giờ chờ: nhat-ky: thẻ đã dựng xong (máy tính)` — Nhật ký chỉ Toàn quyền (ADR-0038), như mốc A0 |
| `t2b-danh-ba-smoke.mjs` | xanh 2/2 | |
| `vai-smoke.mjs` | xanh 7/7 | |
| `v1-bao-tri.mjs` | **đỏ sẵn** (3 ✓, 15 ✗) | bước đầu `hết giờ chờ: mục bảo trì hiện` — mục bảo trì không hiện cho tài khoản chủ trong kịch bản |
| `help-smoke.mjs` | **treo sẵn** ở bước d (3 ✓ a–c) | không kết thúc sau 13 phút → người thi công dừng tiến trình |
| `trang-chu-smoke.mjs` | **đỏ sẵn** (11 ✓) | dòng 450 "phải có đúng 2 dòng cảnh báo" (như mốc A0) |
| `hdv-viec-cua-toi-smoke.mjs` | xanh 10/10 | |

### 11.2 Bảng từng việc Phần B

| Việc | Commit | Kịch bản / test (xanh) | Dòng ĐỎ trước (đã thấy) | Đột biến P16 (2026-09-28 · đột biến · dòng đỏ → hoàn nguyên → xanh) |
|---|---|---|---|---|
| B0 nền: token bản vẽ, biểu tượng xe tải / mắt / mũi tên, luật hiển thị thuần, bảng trượt, form giấy tờ, bộ che số | `a56948c` | `src/shared/giay-to-hien-thi.test.ts` 16/16 (sau thêm R18: 17/17) | `not ok 1 - src/shared/giay-to-hien-thi.test.ts` … `ERR_MODULE_NOT_FOUND: …/src/shared/giay-to-hien-thi.ts` | — (luật hiển thị; điều kiện ẩn / hiện đo ở từng màn) |
| B1 màn 07 `/tai-xe` + điều hướng tài xế; `TRANG_DAU_TAI_XE` = `/tai-xe` | `c5cc9e2` | `tai-xe-trang-dau-smoke.mjs` 4/4; `start-page.test.ts` 10/10 | Chrome 0/4: `hết giờ chờ: khối Giấy tờ của tôi dựng xong` (1–2), `hết giờ chờ: dòng chưa có giấy tờ` (3), `hết giờ chờ: Bán hàng rời trang của tài xế` (4); test: `expected: '/tai-xe' actual: '/account'` | (a) cờ `taiXe` của `addNav` = `false` ⇒ `✗ 1 … điện thoại: đúng hai tab của tài xế`, `✗ 2 … máy tính: menu tài xế […]`, `✗ 3 … 1 !== 2` · (b) bỏ lời chặn tài khoản không phải tài xế ở `web/tai-xe.ts` ⇒ `✗ 4 … hết giờ chờ: Bán hàng rời trang của tài xế` |
| B2 màn 00 (menu + trang Tôi), 01 `/xe`, 02 `/xe-sua` | `5d35389` | `xe-smoke.mjs` 13/13 | 0/13: `hết giờ chờ: mục Vận chuyển`, `… nhóm VẬN CHUYỂN`, `… câu từ chối`, `… trạng thái trống`, `… form` … Lần xanh đầu lộ lỗi: ở 1040 cả thẻ lẫn bảng cùng hiện (`.vc-list` thắng `.vc-narrow` vì đứng sau) → đưa luật khổ xuống cuối CSS, thêm bước đo "đúng một cách trình bày theo khổ" | (a) `addNav(…, can(staff, "vehicle.manage"))` → `true` ⇒ `✗ 3 … { parent: true }` · (b) `if (can(staff, "vehicle.manage"))` ở `web/account.ts` → `if (true)` ⇒ `✗ 3 … eyebrow / top / vc: true` · (c) cùng đột biến ở `web/xe.ts` (nút "Thêm xe") ⇒ `✗ 3 … true !== false` |
| B5 màn 05 "Giấy tờ của tôi" + R18 (`coMucGiayToCuaToi`) | `5d35389` (cùng commit — cùng tệp `web/account.ts`) | `giay-to-cua-toi-smoke.mjs` 5/5; bài `coMucGiayToCuaToi` | test: `does not provide an export named 'coMucGiayToCuaToi'` | (a) bỏ `!holdsPartner(who)` ⇒ `✗ 4b … tài khoản lai … [{ method: 'GET', path: '/api/parties/documents/mine' }]` · (b) không gọi `initGiayToCuaToi()` ⇒ `✗ 1, 2 … hết giờ chờ: khối Giấy tờ của tôi`, `✗ 3` |
| B3 màn 03 `/xe-chi-tiet` | `32cd6bd` | `xe-chi-tiet-smoke.mjs` 7/7 | 0/7: `hết giờ chờ: sáu giấy tờ` / `… giấy tờ` | (a) `const ngung = xe.status === "retired"` → luôn sai ⇒ `✗ 7 … true !== false` · (b) "Gia hạn" cả giấy không hạn (máy tính) ⇒ `✗ 1 … giấy không hạn: không Gia hạn` |
| B4 màn 04 mục "Giấy tờ" ở Danh bạ + mở theo `?id=` | `35a370d` | `giay-to-nguoi-smoke.mjs` 7/7 | 0/7: `hết giờ chờ: hồ sơ mở thẳng theo id` | (a) bỏ `can(me, "party.document.write")` ở điều kiện mục ⇒ `✗ 4 … true !== false` · (b) bỏ `&& p.editable` ở "Xem đủ số" ⇒ `✗ 5` · (c) bỏ `&& p.editable` ở ghi ⇒ `✗ 5` · (d) tắt tự che (`conLai <= -86400000`) ⇒ `✗ 3 … hết giờ chờ: tự che` |
| B6 màn 06 `/giay-to-sap-het-han` + ô đổi mốc | `42390f0` | `sap-het-han-smoke.mjs` 7/7 | 0/7: `hết giờ chờ: trạng thái trống`, `… sáu dòng`, `… câu từ chối` … Lần xanh đầu đỏ bước 5 (nút "Đổi mốc" nằm trong dòng tiêu đề) → tách ra ngoài | ô đổi mốc theo `vehicle.manage` thay `settings.ops` ⇒ `✗ 2 … Quản trị không thấy ô đổi mốc (settings.ops chỉ Toàn quyền)` |
| A19 (điều phối chuyển sang Phần B) `/danh-muc-giay-to` khuôn sẵn + soát nhãn "Tài xế" (điều phối mục 2) | `a800746` | `danh-muc-giay-to-smoke.mjs` 6/6; `nhan-tai-xe-smoke.mjs` 4/4 | 0/6: `hết giờ chờ: dòng Danh mục giấy tờ`, `… khối người`, `… khối hạng`, `… câu báo` | (a) bỏ `can(staff, "admin.manage") &&` ở dòng trang Tôi ⇒ `✗ e … true !== false` · (b) chặn trang theo `feedback.submit` ⇒ `✗ e` (không còn câu "Chỉ quản trị viên…") |
| B7 | — | — | — | Chủ chưa yêu cầu vẽ lại trang Danh mục giấy tờ — làm theo khuôn sẵn (A19). |
| B8 bằng chứng | `50cecad` (50 ảnh + README); đề xuất luật 4a / 4b: `1e054d8` | ảnh `docs/evidence/2026-09-28-van-chuyen-1a/anh/`, `README.md`; `npm run test:e2e -- pwa` 2/2 (11.7) | — | — |
| K1 nhật ký thay đổi 1.35 (điều phối giao thêm) | `c251b73` | `changelog.test.ts` + `app-info.test.ts` 15/15; `kiem-phien-ban.mjs` ĐẠT | `bản #0 (1.35) gạch 1: dài 161 ký tự, tối đa 160` (lần viết đầu) | — (nội dung chữ) |

Cách chạy đột biến: tệp tạm ngoài repo (`/tmp/vc1b/dot-bien.py`: sửa đúng MỘT chỗ khớp một lần → `npm run build:web` → chạy kịch bản → chép lại tệp gốc → build lại, kiểm "đã hoàn nguyên: True").

### 11.3 Token

- Hai token MỚI của bản vẽ: `--w-doc-chip: 148px`, `--t-reveal: 10s` (web/giay-to-ui.ts đọc `--t-reveal` bằng `getComputedStyle` — chữ "10 giây" và đồng hồ cùng một nguồn).
- Đối chiếu bảng "Token đã dùng" của bản vẽ (26 dòng): mọi token màu / khoảng cách / bo góc / bóng / chữ / chiều cao / `--counter-*` / `--w-sheet` / `--m-*` / `--focus-ring` **đã có** trong `public/app.css`.
- Bản vẽ còn viết cứng số đo ở từng màn (cỡ chữ 15/17/19/22/24/26/28px, chiều cao dòng 36/56/60/64/72px, bề rộng cột, vòng 40/36px, lề thụt 42px…). Sau dấu mốc PWA không được viết cứng ⇒ thêm 38 token vào nhóm "Riêng" (`--pad-vc-chip`, `--pad-vc-no`, `--gap-vc-label`, `--bw-vc`, `--fs-vc-sm/md/lg/step/plate/h/plate-lg`, `--ls-vc-no`, `--sidebar-sub-indent`, `--h-vc-sub/link/row/row-lg/row-xl/due`, `--vc-ring(-sm)`, `--vc-radio(-on)`, `--vc-check`, `--w-vc-form/mine/head-min/plate/seats/status/date/date-sm/act/no/no-sm/person-type/person-act/chevron`), giá trị đúng bản vẽ, chú thích cạnh từng token. Kiểm bằng luật quét của `tests/e2e/pwa.mjs` (0 giá trị viết cứng) và tự soát `%`/tên màu (chỉ `width: 100%`).

### 11.4 Chỗ lệch bản vẽ và lý do

1. **Vỏ app giữ vỏ thật** (README bản vẽ, điểm đoán 1): menu tài xế là nhóm "TÔI" có sẵn (Trang chủ → `/tai-xe`, Của tôi, Góp ý / Báo lỗi, Trợ giúp) — bản vẽ đoán nhóm "CỦA TÔI" chỉ hai mục; chuông thông báo vẫn có ở thanh trên của tài xế (ADR-0040 D3: tài xế nhận thông báo gửi cho mình). Khung tạm từ bản nhớ khung (5 trường đã duyệt, ADR-0035) chưa biết "tài xế" nên thanh tab tài xế thiếu "Trang chủ" một nhịp trước khi `/api/auth/me` về. _Mã: `web/shell.ts:44` (tab), `web/shell.ts:207` (mục TÔI)._
2. **01:** cột GIẤY TỜ khi không có cảnh báo ghi "Không có giấy sắp hết hạn" (bản vẽ "Còn hạn") — máy chủ không cho biết xe có giấy tờ nào không, xe mới chưa nhập giấy sẽ hiện "Còn hạn" sai (trường còn thiếu — 11.6). Lọc ra rỗng: "Không có xe nào ở trạng thái này." (bản vẽ hiện "Chưa có xe nào" cả khi chỉ là lọc). Dòng cảnh báo dùng tên loại đầy đủ của danh mục ("Phù hiệu xe hợp đồng đã hết hạn 8 ngày · 2 giấy sắp hết hạn"). _Mã: `web/xe.ts:45`, `public/xe.html:11`._
3. **02:** ô "Tên / đời xe" gắn `name` (câu hỏi 11.6); bộ đếm mặc định 15 (bản vẽ mẫu 6), tối thiểu 1, không mức trần ở giao diện (máy chủ chặn > 100 bằng câu của máy chủ); "Ngừng dùng" trong hộp xác nhận **gửi ngay** giá trị đã lưu + trạng thái Ngừng (bản vẽ chỉ đổi trong form, phải bấm Lưu — dễ tưởng đã ngừng); "Dùng lại xe" giữ như bản vẽ (đổi trong form, bấm Lưu mới gửi, máy chủ kiểm biển số); breadcrumb "Vận chuyển › Xe › Sửa xe <biển>". _Mã: `web/xe-sua.ts:43` (15), `web/xe-sua.ts:186` (Ngừng gửi ngay), `web/xe-sua.ts:21`, `:35` (breadcrumb)._
4. **03:** "Lịch sử (N)" ở máy tính đặt dưới tên loại — cột nút 250px của bản vẽ không chứa được ba nút (chữ nút gãy dòng); chip "Hết hạn hôm nay" tông cát ở mọi màn (bản vẽ 03/04 vẽ đỏ, 06 vẽ cát — thống nhất theo máy chủ: hôm nay còn hạn, `level: "soon"`); hộp tóm tắt "Giấy tờ còn hạn" dùng dấu ✓ (bản vẽ vẽ tam giác cảnh báo cả khi còn hạn); "N giấy đã hết hạn" không kèm "· 0 giấy sắp hết hạn"; xe chưa có giấy / xe đã ngừng có câu riêng (bản vẽ không vẽ). _Mã: `web/xe-chi-tiet.ts:147-148`, `src/shared/giay-to-hien-thi.ts:47` (hôm nay), `web/giay-to-ui.ts:36` (✓), `src/shared/giay-to-hien-thi.ts:149`, `:155` (tóm tắt)._
5. **Bảng "Sửa sai"** (form-giay-to): lý do lấy từ danh sách ĐÓNG của máy chủ (`LY_DO_SUA_SAI` — xe 4 lý do, người 5–6; "Nhập sai hạng" chỉ với giấy phép lái xe) thay ba lý do bản vẽ vẽ ("Nhập nhầm số / ngày", "Chọn nhầm loại"); mỗi lý do MỘT ô (máy chủ nhận đúng một trường mỗi lần sửa sai) thay vì hiện cả ba ô. Gia hạn giấy tờ **xe** cũng có dòng "Số hiện tại … — để trống nếu không đổi số" (máy chủ chép số cũ khi để trống; bản vẽ chỉ ghi cho số che). Giao diện chỉ bắt "Nhập ngày hết hạn." và "chọn lý do" như bản vẽ; số bắt buộc theo loại và thứ tự ngày để máy chủ báo (một nguồn luật). _Mã: `web/giay-to-ui.ts:149-152`, `:176`, `:225` (lý do → một ô), `web/giay-to-ui.ts:124` (dòng "để trống nếu không đổi số")._
6. **04:** mục đặt trong khung chi tiết Danh bạ thật (bản vẽ vẽ lại hồ sơ dạng thẻ); tiêu đề "Giấy tờ" dùng kiểu h3 có sẵn của hồ sơ (bản vẽ: "cùng kiểu tiêu đề mục"); thêm "Lịch sử (N)" ở máy tính (bản vẽ chỉ vẽ ở điện thoại); hồ sơ tài khoản cấp trên: danh sách số che + câu "chỉ xem", không nút (Ruling R8; bản vẽ không vẽ). _Mã: `web/parties.ts:318` (mục), `web/parties.ts:408` (Lịch sử), `web/parties.ts:510` (chỉ xem)._
7. **05:** khối chỉ dựng khi có giấy tờ, hoặc là tài xế ("Chưa có giấy tờ nào."); nhân viên chưa có giấy thấy trang Tôi như cũ. Máy tính: khối trải hai cột (tối đa 720px) trong bố cục hai cột có sẵn của trang Tôi. _Mã: `web/account.ts:80`, `:87`, `:103`._
8. **06:** ô "Đổi mốc" (kế hoạch B6, bản vẽ không vẽ): nút chữ cạnh dòng tiêu đề, chỉ Toàn quyền, bảng trượt một ô số. _Mã: `web/giay-to-sap-het-han.ts:119-120`._
9. **07:** "Xem tất cả" → trang Tôi (danh sách đủ của màn 05); tài xế chưa có giấy: "Chưa có giấy tờ nào. Báo văn phòng để cập nhật." _Mã: `public/tai-xe.html:13`, `web/tai-xe.ts:37`._
10. **00:** thẻ đầu trang Tôi của Quản trị có thêm dòng "Danh mục giấy tờ" (A19, sau bản vẽ); huy hiệu "Sắp hết hạn" ẩn khi 0. _Mã: `web/account.ts:44`, `web/shell.ts:197`._

### 11.5 Giả định Phần B (P8 — bề mặt, đảo ngược được)

- **GB1** "Tên / đời xe" → `name`; `modelYear` = null khi thêm, giữ nguyên giá trị đã lưu khi sửa; hiện "tên + năm" nếu máy chủ có năm (`tenXe`). **Chờ điều phối xác nhận** (11.6 câu 3).
- **GB2** Mốc "sắp hết hạn" của chip giấy tờ NGƯỜI = 30 (`NGUONG_MAC_DINH`, bằng dòng gieo 0033) vì API chưa trả `warnDays` (11.6 câu 1).
- **GB3** Tài khoản không phải "chỉ tài xế" mở `/tai-xe` → về "/".
- **GB4** Người bấm "Xem đủ số" rồi ẩn ứng dụng / rời trang → số che ngay (ngoài 10 giây).

### 11.6 Gửi điều phối — trường API còn thiếu và câu hỏi (không chặn màn nào; giao diện đang chạy bằng giá trị thay thế)

1. **`warnDays` trong phản hồi giấy tờ của NGƯỜI** (`GET /api/parties/documents/mine`, `GET /api/parties/:id/documents`): nhân viên thường không gọi được `/api/van-chuyen/meta`, nên chip hạn ở trang Tôi, trang đầu tài xế, Danh bạ dùng 30 cố định — Toàn quyền đổi mốc thì chip giấy tờ người lệch danh sách "sắp hết hạn".
2. **Số giấy tờ hiện hành của xe trong `VehicleDto`** (vd `documentCount`): để cột GIẤY TỜ ghi đúng bản vẽ "Còn hạn" khi xe có giấy, và "Chưa có giấy tờ" khi chưa nhập.
3. **Câu hỏi dữ liệu:** bản vẽ có MỘT ô "Tên / đời xe", hợp đồng có `name` + `modelYear`. Phần B chọn GB1 (không tự tách năm). Phương án khác: (a) hai ô "Tên xe" + "Đời xe"; (b) tách 4 số cuối thành năm. Cần điều phối / chủ chốt.

### 11.7 Kết quả người thi công tự đo (CHƯA phải kiểm độc lập — Task K2)

**Gộp lần cuối (theo điều phối):** `5162f4a` (đỉnh Phần A — Ruling R22) → commit gộp `b986bb7`; `e4d2013` đã có trong nhánh từ trước (`git merge-base --is-ancestor e4d2013 HEAD` → có). Gộp chỉ chạm 6 tệp: `docs/SO-HANG-RAO.md`, tệp đề xuất luật (mục 2f + một dòng bảng tóm tắt — tự gộp, không xung đột với 4a / 4b), nhật ký này (phần Phần A), ba tệp bài máy chủ (`giay-to-route.test.ts`, `giay-to-xe.test.ts`, `rules.test.ts`) — **không tệp giao diện nào** ⇒ không kịch bản Chrome nào bị lần gộp này chạm.

**Trên `b986bb7`** (máy không có `trien-khai`, không `wrangler dev` / `node --test` nào khác lúc chạy):
- `npm test`: **1306/1306**, thoát 0.
- `npm run typecheck`: **thoát 0** (ba tsconfig).
- `npm run build:web`: **thoát 0**.

**Chrome — tám kịch bản Phần B** (ảnh ghi vào `docs/evidence/2026-09-28-van-chuyen-1a/anh/`; mã giao diện của `a800746` — sau đó `web/`, `public/` KHÔNG đổi, `src/shared/` chỉ đổi `changelog.ts` + `app-info.test.ts` ở K1: `git diff --stat a800746 HEAD -- web public src/shared package.json`):

| Kịch bản | Kết quả | Thời gian |
|---|---|---|
| `tai-xe-trang-dau-smoke.mjs` | 4 ✓, thoát 0 | 32 giây |
| `xe-smoke.mjs` | 13 ✓, thoát 0 | 28 giây |
| `xe-chi-tiet-smoke.mjs` | 7 ✓, thoát 0 | 21 giây |
| `giay-to-nguoi-smoke.mjs` | 7 ✓, thoát 0 | 47 giây |
| `giay-to-cua-toi-smoke.mjs` | 5 ✓, thoát 0 | 40 giây |
| `sap-het-han-smoke.mjs` | 7 ✓, thoát 0 | 40 giây |
| `danh-muc-giay-to-smoke.mjs` | 6 ✓, thoát 0 | 19 giây |
| `nhan-tai-xe-smoke.mjs` | 4 ✓, thoát 0 | 23 giây |

**Chrome — chạy lại kịch bản CÓ SẴN mà `web/CLAUDE.md` bắt cho các tệp Phần B chạm** (cùng mã, ảnh ra `/tmp`, so mốc 11.1):

| Kịch bản | Mốc 11.1 | Sau Phần B | Kết luận |
|---|---|---|---|
| `dot-c-smoke.mjs` | đỏ sẵn, 2 ✓ (`:124` thứ tự DOM — `#push`) | 2 ✓, đỏ **cùng chỗ** `:124`; danh sách con nay có thêm `links-top`, `vc-eyebrow`, `vc-links` (tài khoản Quản trị của kịch bản có ô vehicle.manage); `maintColumn` 2, `scrollOverflow` 0 | đỏ sẵn; Phần B thêm phần tử vào đúng mảng mà dòng đỏ đang khoá — ghi ở tệp đề xuất luật mục 4b ("Kèm") |
| `dot-a-smoke.mjs` | đỏ sẵn, 8 ✓ (Nhật ký chỉ Toàn quyền) | 8 ✓, đỏ **cùng chỗ** (`hết giờ chờ: nhat-ky: thẻ đã dựng xong (máy tính)`) | như mốc |
| `t2b-danh-ba-smoke.mjs` | 2/2 | **2/2**, thoát 0 | xanh |
| `vai-smoke.mjs` | 7/7 | **7/7**, thoát 0 | xanh |
| `v1-bao-tri.mjs` | đỏ sẵn, 3 ✓ | 3 ✓, đỏ **cùng chỗ** (bước đầu `hết giờ chờ: mục bảo trì hiện`) | như mốc |
| `help-smoke.mjs` | treo sẵn ở bước d (3 ✓ a–c) | treo ở bước d (3 ✓ a–c), người thi công dừng sau 600 giây | như mốc |
| `trang-chu-smoke.mjs` | đỏ sẵn, 11 ✓ (`:450`) | 11 ✓, đỏ **cùng chỗ** `:450` (`actual: 1`, `expected: 2`) | như mốc; dòng `:535` (11 mục thanh bên) chưa tới được — Phần B làm Quản trị có 14 mục (ghi ở "Kèm" của 4b) |
| `hdv-viec-cua-toi-smoke.mjs` | 10/10 | **10/10**, thoát 0 | xanh |

Sau mỗi lượt treo / hết giờ: người thi công dừng `wrangler dev`, `workerd`, Chrome headless mồ côi của chính worktree này (không đụng Chrome thường của máy). Lúc viết mục này: không còn `wrangler dev` nào của Phần B.

**Task K1 (điều phối giao thêm):** `c251b73` "Nhật ký thay đổi 1.35: phân hệ Vận chuyển lượt 1a" — mục 1.35 (ngày 2026-09-28, sáu gạch lời thường) ở đầu `CHANGELOG`, cùng commit sửa chuỗi kỳ vọng `src/shared/app-info.test.ts:21`. `node --test src/shared/changelog.test.ts src/shared/app-info.test.ts`: lần đầu **đỏ** (`bản #0 (1.35) gạch 1: dài 161 ký tự, tối đa 160`) → rút gọn → **15/15**. `node scripts/kiem-phien-ban.mjs` (GET công khai `/api/auth/config`, chỉ đọc): `ĐẠT: bản ở máy 1.35 mới hơn production 1.34.`, thoát 0. `web/CLAUDE.md` bắt `help-smoke.mjs` khi sửa `changelog.ts`:
- chạy nguyên kịch bản hai lần sau K1: **0 ✓, treo** (người thi công dừng ở 300 giây rồi 420 giây). Mốc 11.1 và lượt "sau Phần B" đã treo ở bước d (sau 3 ✓); nay treo ngay bước a.
- Hỏi thẳng trang đang treo qua CDP (tệp tạm ngoài repo): trang `/help` đã dựng xong — 35 bản (= `CHANGELOG.length`), bản đầu "Phiên bản 1.35 — ngày 28 tháng 9 năm 2026" kèm nhãn "Mới cập nhật"; trang cao **10.977 px** (kịch bản chụp ở tỉ lệ điểm ảnh 2 ⇒ ảnh cả trang cao ~22.000 px). Ảnh `a-tro-giup-390.png` KHÔNG được ghi ⇒ chỗ treo là lời gọi `Page.captureScreenshot` với `captureBeyondViewport` (ảnh cả trang) ở `help-smoke.mjs:70` (bước d: `:154`, bước e: `:179` cùng kiểu).
- Bản sao ngoài repo (`/tmp/vc1b/help-smoke-anh-khung.mjs`: y nguyên kịch bản, chỉ đổi `shot` thành chụp khung nhìn): **5/5 ✓ (a–e), "HELP SMOKE OK — mọi bước ✓", 14 giây, thoát 0**.
- Kết luận của người thi công (chưa ai kiểm): mọi phép kiểm của `help-smoke` đạt với 1.35; kịch bản treo vì ảnh cả trang của trang Trợ giúp quá cao với Chrome headless máy này — lỗi có sẵn (mốc 11.1 đã treo), nhật ký càng dài càng dễ treo. **Không sửa** `help-smoke.mjs` (kịch bản của tính năng khác, ngoài phạm vi Phần B) — nợ ghi ở 11.8.

**e2e:** `npm run test:e2e -- pwa` (Task B8; trên `50cecad` — mã như `b986bb7`, commit sau chỉ thêm ảnh + README; máy không có `trien-khai`, không `wrangler dev` nào khác): **`E2E: 2/2 kịch bản xanh`** (thoát 0) — `pwa` (manifest + luật quét giá trị viết cứng của khối PWA trong `app.css`, icon, font, service worker, "thẻ meta iOS, tên và màu nhất quán trên 21 trang") + kiểm cuối `day_loi`. **Chưa chạy (để K2):** `npm run test:e2e` đủ bộ (điều phối: K2 chạy đủ bộ).

**Đối chiếu mục 9 "Chưa kiểm" (người thi công Phần B; không sửa mục 9):**
- "Giao diện có sẵn tự hiện mã quyền mới 'Tài xế'" → `nhan-tai-xe-smoke.mjs` 4/4: màn Quản lý tài khoản hiện vai "Tài xế công ty" ở nhóm Nội bộ, xem trước "Tài xế"; trang Gửi thông báo có nhóm nhận "Tài xế"; không lộ mã thô `DRIVER` ở hai trang. Không sửa `web/role-picker.ts`, `web/gui-thong-bao.ts` (tự hiện theo `PERMISSION_LABEL` / `ROLES`).
- "Giao diện với tài khoản lai mang quyền Đối tác (R18)" → `coMucGiayToCuaToi` (`src/shared/giay-to-hien-thi.ts`) + bài đơn vị (mọi tổ hợp 8 quyền) + `giay-to-cua-toi-smoke.mjs` bước 4a (Đối tác) và 4b (lai Tài xế + Đối tác): không khối, KHÔNG gọi `/api/parties/documents/mine`. Đột biến bỏ `!holdsPartner(who)` ⇒ bước 4b đỏ (11.2).
- "Toàn bộ Phần B và Task A19" → mục 11.2, 11.7 (người thi công tự đo; K2 chưa kiểm).
- `dot-c-smoke` trên `c276848`: Phần B cũng chưa chạy trên `c276848`; mốc 11.1 đo trên đỉnh gộp `448d47b` (đã đỏ sẵn cùng chỗ trước khi Phần B sửa).

### 11.8 Nợ và việc cho điều phối (người thi công Phần B; không chặn màn nào)

1. **`help-smoke.mjs` treo ở ảnh cả trang `/help`** (11.7): tới khi người giữ kịch bản đổi cách chụp (chụp khung nhìn, hoặc `clip` giới hạn chiều cao), dòng `web/CLAUDE.md:48` (sửa `changelog.ts` → `help-smoke`) không dùng được làm cổng. Có sẵn từ trước Phần B.
2. **Tệp đề xuất luật, bảng tóm tắt cuối tệp:** dòng "4a (chờ Phần B), 4b (Phần B), 4c, 4d" còn nhãn "(chờ Phần B)" dù 4a đã điền — điều phối giao CHỈ điền mục 4a, 4b nên người thi công không sửa dòng tóm tắt; điều phối sửa khi trình chủ. Nếu chủ duyệt dòng "Trang đầu tài xế" của 4b thì bỏ 4c (đã ghi ở 4b).
3. **Hai kịch bản đỏ sẵn đang khoá thứ Phần B đổi:** `trang-chu-smoke.mjs:535` (11 mục thanh bên của Quản trị — nay 14: "Vận chuyển", "Xe", "Sắp hết hạn") và `dot-c-smoke.mjs:124,138` (thứ tự con trang Tôi — nay thêm `links-top`, `vc-eyebrow`, `vc-links`, `my-docs` tuỳ tài khoản). Không sửa (kịch bản của tính năng khác, đang đỏ vì lý do khác); đã ghi ở "Kèm" của mục 4b.
4. **Mục 11.6 còn mở:** `warnDays` cho giấy tờ người, số giấy tờ của xe trong `VehicleDto`, câu hỏi "Tên / đời xe" (GB1).
5. **Số bản 1.35 (K1):** số do điều phối giao; người thi công KHÔNG tự kiểm các nhánh đang xếp hàng khác có sửa `changelog.ts` không (bước "Chọn số" của Task K1) — chốt lại lúc gộp cuối.
