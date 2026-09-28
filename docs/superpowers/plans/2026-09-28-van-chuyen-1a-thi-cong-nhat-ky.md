# Nhật ký thi công Vận chuyển lượt 1a (ADR-0040)

- **Kế hoạch:** `docs/superpowers/plans/2026-09-28-van-chuyen-1a.md` (vai lập kế hoạch, 2026-09-28; đo trên `9ead2e7`).
- **Đề xuất sửa luật:** `docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md` (CHỜ CHỦ DUYỆT).
- **Nguồn chuẩn tắc:**
  - ADR-0040 (accepted 2026-09-28; dòng trạng thái `9ead2e7`: chủ trả lời "Mọi nhân viên" cho ô xem giấy tờ của chính mình);
  - danh sách màn `docs/superpowers/specs/2026-09-28-van-chuyen-1a-man-hinh-can-ve.md`.
- **Nhánh thi công:** `worktree-agent-a9cf548897a76b7f7` (worktree `.claude/worktrees/agent-a9cf548897a76b7f7`). Tách từ `origin/main` @ `c276848` (bản 1.34), rồi gộp theo lệnh điều phối: `worktree-agent-ac0436b2bbf204613` @ `0d68af9` (kế hoạch, fast-forward) và `dac-ta-van-chuyen` @ `644a8ee` (ADR-0040 accepted + giữ chỗ migration 0031–0033) → đỉnh `3159fed`. Mã và migration giống hệt `c276848`.
- **Cách thi công:** executing-plans — một phiên thi công (vai THI CÔNG do điều phối giao 2026-09-28) tự làm Task A0 → A23, không giao tiếp subagent. Dừng ở A24 (mốc kiểm giữa chừng) và báo điều phối.
- **Trạng thái:** ĐANG THI CÔNG PHẦN A. Phần B **chờ bản vẽ** Claude Design của chủ. Chưa push, chưa gộp, chưa lên production.
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
| Truy vấn chỉ đọc (Ruling R1; kế hoạch mục 9 bước 4) | Số hồ sơ đang giữ vai "Tài xế" cũ (`DRIVER`) trên production: đang giữ / tổng số dòng | _(điền: hai con số)_ | Task K3 (chỉ để biết; lượt 1a không đổi các dòng đó) |
| Bản vẽ | Link Claude Design bảy màn | _(điền: link, ngày)_ | Phần B |

## 3. Bảng từng task

Cột "Đột biến P16": sửa cố ý → đỏ → hoàn nguyên → xanh. Chép **nguyên văn** dòng đỏ, kèm ngày.

| Task | Việc | Commit | `npm test` sau | Dòng ĐỎ trước (đã thấy) | Đột biến P16 (ngày · đột biến · dòng đỏ) | Người kiểm |
|---|---|---|---|---|---|---|
| A0 | Điều kiện trước, mốc | (commit A0 — chỉ nhật ký) | 1175/1175; tsc 0 | — | — | — |
| A1 | `src/shared/giay-to.ts` | (commit A1) | 1180/1180; tsc 0 | 2026-09-28: `node --test src/shared/giay-to.test.ts` → `not ok 1 - src/shared/giay-to.test.ts` … `ERR_MODULE_NOT_FOUND: Cannot find module …/src/shared/giay-to.ts` | — (luật thuần, không phải hàng rào) | chưa |
| A2 | Quyền `DRIVER`, vai `DRIVER_INTERNAL`, migration 0031, cột thứ tám, 256 tập con | (commit A2) | 1189/1189; tsc 0; e2e `parties roles permissions admin` 5/5; `db:migrate:local` áp `0031_vai_quyen_tai_xe.sql` ✅; Chrome `vai-smoke` **7 ✓ XANH** (mốc A0: đỏ dòng 34), `dot-a-smoke` 8 ✓ rồi đỏ đúng chỗ mốc A0 (Nhật ký chỉ Toàn quyền) | 2026-09-28: 16 bài đỏ — migration (a) "expected: 1 / actual: 0" (tệp chưa có), (c) "Cannot read properties of undefined (reading 'name')"; permissions "bản đồ quyền khớp TỪNG Ô … × 8 quyền" (PERMISSION_CODES lệch ORDER), "seesOnlyAssignedOrders … 256" (expected 256 / actual 128), "ghim nguyên dòng"; roles "danh mục: đủ 13 vai" (13 ≠ 12); 0024 "DRIVER cũ ngưng gán mới"; cong-quyen "8 mã quyền"; handler-view/bang-tin "256 tập con" | 2026-09-28 · (a) `order.view` cột DRIVER `none`→`own` ⇒ `not ok 17 - ADR-0040 D3: MỌI ô của Tài xế (DRIVER) — ghim nguyên dòng` (+ 3 bài khác của tệp) → hoàn nguyên → 18/18 · (b) thêm `"DRIVER"` vào `OFFICE_GATE` ⇒ `not ok 1 - ADR-0019: ba danh sách cổng khai tường minh (khoá giá trị)` và `not ok 6 - ADR-0040 D3: Tài xế (DRIVER) không nằm trong cổng nào — tài khoản chỉ-DRIVER không qua admin/office/orders` (+2) → hoàn nguyên → 6/6 · (c) bỏ `UPDATE pty_role_type SET active = 0 WHERE code = 'DRIVER'` ⇒ `not ok 4 - (d) mã vai hồ sơ cũ DRIVER: vẫn nhóm OTHER, vẫn tên 'Tài xế', NGƯNG gán mới (active = 0)` → hoàn nguyên → 6/6 | chưa |
| A3 | Trang đầu tài xế — **theo Ruling R10: tạm là `/account`** (hằng `TRANG_DAU_TAI_XE`; Phần B đổi sang `/tai-xe`) | (commit A3) | 1191/1191; tsc 0; Chrome MỚI `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/tai-xe-trang-dau-smoke.mjs` **2 ✓** (390 + 1040: "/" → `/account`, không lời gọi `/api/orders*`, không lỗi console; ảnh ở `docs/evidence/2026-09-28-van-chuyen-1a/anh/`); `trang-chu-smoke` 11 ✓ rồi đỏ ĐÚNG chỗ mốc A0 (dòng 450, "1 !== 2") | 2026-09-28: `not ok 1 - src/shared/start-page.test.ts` (`error: 'test failed'` — nạp tệp hỏng vì `TRANG_DAU_TAI_XE` chưa được xuất) | 2026-09-28 · bỏ dòng `if (hasPermission(who, "DRIVER")) return TRANG_DAU_TAI_XE;` ⇒ `not ok 9 - homeRedirect: chỉ Tài xế (DRIVER) → trang đầu của tài xế (Ruling R10: tạm là trang Tài khoản) — …` và `not ok 10 - homeRedirect: 256 tập con quyền — …` → hoàn nguyên → 10/10 · cùng đột biến + `npm run build:web` ⇒ kịch bản Chrome `Error: hết giờ chờ: tài xế mở "/" được đưa sang /account` (thoát 1) → hoàn nguyên + build lại → `TAI XE TRANG DAU SMOKE OK` | chưa |
| A4 | Vai đã ngưng không gán mới (Ruling R6: MỌI loại đã ngưng, trừ `OWNER_COMPANY`) | (commit A4) | 1194/1194; tsc 0; e2e `parties company` 3/3 (e2e parties thêm ca GUIDE/DRIVER → 409 `role_type_inactive`) | 2026-09-28: `not ok 1 - R6: Quản trị gán loại vai ĐÃ NGƯNG (DRIVER cũ, STAFF, SALES, GUIDE, AGENT) → 409 role_type_inactive, …` — `expected: 409 / actual: 201` | 2026-09-28 · bỏ dòng `if (!doiCongTyChu && loai !== null && !loai.active) return ROLE_TYPE_INACTIVE();` ⇒ cùng dòng đỏ (409 / 201) → hoàn nguyên → 3/3 | chưa |
| A5 | Migration 0032 giấy tờ của người | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: 9 khối — CCCD ins/upd, superseded, voided, identity, no_delete, renew_ins, next_uq, CHECK GPLX)_ | _(điền)_ |
| A6 | Luật thuần giấy tờ người | _(điền)_ | _(điền)_ | _(điền)_ | — | _(điền)_ |
| A7 | Route đọc + ô `party.document.view/write` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ô view; ô write; che số)_ | _(điền)_ |
| A8 | Route ghi (thêm / gia hạn / sửa sai / huỷ dòng) | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ô write; cấp bậc; dòng hiện hành; số vào nhật ký)_ | _(điền)_ |
| A9 | Xem đủ số + ô `party.document.reveal` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ô; thứ tự nhật ký; cấp bậc)_ | _(điền)_ |
| A10 | Danh mục loại giấy tờ người + hạng | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: luật 4 hàng rào 2; `fixed_type`)_ | _(điền)_ |
| A11 | Hàm công bố `expiringDriverDocuments` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: bỏ lọc vai; thêm cột số)_ | _(điền)_ |
| A12 | Migration 0033 + sổ dữ liệu + cạnh / tiền tố (nới) | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: chỉ mục biển số, số khung; CHECK ngừng; trigger; bỏ cạnh parties)_ | _(điền)_ |
| A13 | Module `van-chuyen`: xe + ô `vehicle.manage` + STRICT | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ô; số khung; `.prepare` thô)_ | _(điền)_ |
| A14 | Giấy tờ xe | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ô; dòng hiện hành)_ | _(điền)_ |
| A15 | Danh mục loại giấy tờ xe, ngưỡng, danh sách sắp hết hạn | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: `settings.ops`; lọc xe ngừng; `vehicle.manage`)_ | _(điền)_ |
| A16 | Bài toàn tuyến che số + nhật ký không số | _(điền)_ | _(điền)_ | — | _(điền: số vào detail; `cheSo` trả nguyên; bớt ca `TUYEN`)_ | _(điền)_ |
| A17 | `R-PTY-2..4`, `R-VC-1..2` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ba đột biến SQL)_ | _(điền)_ |
| A18 | Bài cổng toàn tuyến của tài xế (siết, có thể bỏ) | _(điền hoặc "không làm")_ | _(điền)_ | — | _(điền: DRIVER vào ORDERS_GATE)_ | _(điền)_ |
| A19 | Trang Danh mục giấy tờ (khuôn sẵn) + Chrome | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: bỏ điều kiện liên kết)_ | _(điền)_ |
| A20 | E2E `van-chuyen` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ô `vehicle.manage` của ADMIN = none)_ | _(điền)_ |
| A21 | Sổ hàng rào | _(điền)_ | — | — | — | _(điền)_ |
| A22 | Tài liệu mô tả + đề xuất luật | _(điền)_ | _(điền)_ | — | — | _(điền)_ |
| A23 | Kiểm toàn bộ Phần A (tự khai) | — | _(điền)_ | — | — | — |
| A24 | Kiểm độc lập giữa chừng (khuyến nghị) | — | — | — | — | _(điền hoặc "điều phối không chọn")_ |
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
- **Q1, Q2 của kế hoạch mục 12** coi như đã trả lời bằng R8, R9 (mặc định (a) cả hai) — ghi ở mục 2.
- **Cấm của lượt thi công:** không `git push`, không gộp vào `main`; không lệnh `--remote`, `wrangler deploy`/`secret`; không sửa `CLAUDE.md`, `.claude/`, `playbook/`, `docs/adr/` (kể cả `docs/adr/README.md`), `src/CLAUDE.md`, `web/CLAUDE.md`. Truy vấn chỉ-đọc remote là việc của CHỦ (câu lệnh viết sẵn trong báo cáo).

## 5. Sự cố

- _(điền)_

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
- _(điền thêm)_

## 7. Kết quả kiểm của người thi công (tự khai, chưa phải kiểm độc lập)

- `npm test`: _(điền)_ · `npm run typecheck`: _(điền)_ · `npm run build:web`: _(điền)_
- `npm run db:migrate:local` (D1 đọc được 0031–0033): _(điền đầu ra)_
- `npm run test:e2e` đủ bộ + `audit-invariants --strict` (có `R-PTY-2..4`, `R-VC-1..2`): _(điền)_
- `node scripts/audit-invariants.mjs --db local`: _(điền)_
- `node --test "tests/audit/*.test.mjs"`: _(điền)_
- Chrome Phần A: `vai-smoke` _(điền)_ · `dot-a-smoke` _(điền)_ · `trang-chu-smoke` _(điền)_ · `dot-c-smoke` _(điền)_ · `danh-muc-giay-to-smoke` _(điền)_
- Chrome Phần B: _(điền từng kịch bản)_

## 8. Kiểm độc lập (`nguoi-kiem-doc-lap`, chỉ đọc)

- **Giữa chừng — Task A24 (nếu điều phối chọn):** _(điền: ĐẠT / ĐẠT CÓ ĐIỀU KIỆN / KHÔNG ĐẠT, ngày, mã commit; phép đột biến tự làm; phán ba điểm ở kế hoạch mục 14)_
- **Cuối — Task K2 (bắt buộc):**
  - **Kết luận:** _(điền: ĐẠT / ĐẠT CÓ ĐIỀU KIỆN / KHÔNG ĐẠT, ngày, trên mã commit nào)_
  - **Phép đột biến người kiểm tự làm:** _(điền)_
  - **Phát hiện và cách xử lý:** _(điền)_

## 9. Chưa kiểm (lúc viết mục này)

- _(điền: ví dụ iPhone thật, tài khoản thật trên production, dữ liệu hồ sơ giữ vai "Tài xế" cũ)_

## 10. Phát hành (chủ dự án tự chạy — Task K3)

- Chủ đã duyệt tệp đề xuất luật: _(điền ngày, nguyên văn)_; commit áp từng tệp luật: _(điền)_
- `npm run day-len -- <nhánh>`: _(điền: ngày giờ, kết quả)_
- `npm run trien-khai` (có migration 0031–0033): _(điền: số phiên bản, Worker, mốc lùi, `audit-invariants --db remote`, cổng phiên bản sau deploy)_
- AI kiểm bằng GET công khai sau triển khai: _(điền)_
