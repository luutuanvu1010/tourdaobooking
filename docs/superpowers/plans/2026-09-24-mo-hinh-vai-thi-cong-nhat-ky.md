# Nhật ký thi công — Mô hình người–vai–quyền GĐ0–1 (ADR-0018)

Kế hoạch: `docs/superpowers/plans/2026-09-24-mo-hinh-vai-gd0-gd1.md`. Sổ điều phối gốc (đầy đủ ruling, dispatch, review): `.superpowers/sdd/2026-09-24-mo-hinh-vai-gd0-gd1/progress.md` + `task-1-report.md`…`task-9-report.md`. Nhánh: `gd1-mo-hinh-vai`. Cách A (subagent-driven): mỗi task có người thi công riêng + một người kiểm độc lập chỉ-đọc trước khi sang task kế (CLAUDE.md §3).

## Nền (Task 0)

`npm ci && npm test` → **656 test, 655 xanh, 1 đỏ đã biết** (`src/claude-guard.test.ts` "guard-remote: lệnh dị dạng không làm hook quá giờ" — ca đo thời gian, đỏ khi chạy TRONG git worktree, ghi ở `docs/SO-HANG-RAO.md`; không phải lỗi thi công). `npm run typecheck` → 0 lỗi. Nhánh dựng từ `mo-hinh-nguoi-vai-quyen` (`f6efb8f`) gộp `origin/main` (`b4a978f`, đã có bản 1.5) → `2e32bc4`. Số migration `0024` xác nhận còn trống (`git log --all --diff-filter=A -- migrations/0024* migrations/0025*` → rỗng).

## Từng task

### Task 1 — Migration 0024: danh mục vai, mã quyền, bảng chỉnh tay, view nhóm vai, trigger LC-1/LC-3
- Commit: `2e32bc4..7a69805` (thi công đầu `4341932`; fix round 1 — thêm `CHECK` cho `role_group`/`direction` theo yêu cầu kiểm độc lập — `7a69805`).
- Test: thi công đầu `npm test` 662/663 (chỉ ca nền đỏ), focused 46/46, e2e `parties` 18/18. Sau fix round: `migrations-0024.test.ts` 9/9, focused 48/48, `npm test` 665/665 (ca nền tình cờ xanh lần chạy này — không phải cam kết).
- P16 (chép nguyên văn ở `docs/SO-HANG-RAO.md`, hai dòng trigger LC-1 và LC-3 `_ins`/`_upd`, xem đó để tránh trùng lặp): 3 lần quan sát chặn thật (LC-1, LC-3 insert, LC-3 update) + 2 lần cho `CHECK` mới (`role_group`, `direction`) ở fix round 1.
- Kiểm độc lập: vòng 1 (opus) — Spec ✅, Quality "Needs fixes" (I-1: `role_group`/`direction` thiếu `CHECK` cho tập đóng, trái ADR-0003 điều 3; I-2: kế hoạch Task 6 còn ghi tên trigger cũ). Vòng 2 (sonnet, sau fix) — ĐÃ SỬA, không hồi quy mới. **Hoàn tất, review sạch sau 1 vòng sửa.**
- Ruling áp dụng: R9 (đổi tên trigger LC-1 → `lc1_stf_permission_external_partner_only`, không nới hàng rào hai-pha B5), R10 (fix tạm `tests/e2e/parties.mjs` chuyển vào Task 1), R12 (thêm `CHECK`, không cần chủ duyệt vì là SIẾT thêm), R13 (điều phối tự sửa kế hoạch Task 6 theo tên trigger mới).
- Nợ còn lại (deferred): M-1 (điều kiện trigger chưa có ca "dòng đã đóng vẫn cho phép"), M-2 (`reason` CHECK chấp nhận chuỗi toàn khoảng trắng), M-3 (chú thích quá lời "lớp cuối" — LC-1 chỉ canh INSERT), regex `/CHECK/` trong 2 test mới quá rộng (nên hẹp theo tên cột).

### Task 2 — `permissions.ts`: mã `INTERN`, nhãn "Toàn quyền", `canAccessOrders` tổng quát
- Commit: `67a9d07..a75fe15`.
- Test: `npm test` 667/667; `typecheck` 0.
- P16: `order.view` × `INTERN` × phạm vi `own`→`any` — đỏ rồi phục hồi (chi tiết trong báo cáo Task 2, không phải một trong 10 hàng rào mới của Task 9 vì không phải cơ chế CHẶN, mà là test khoá giá trị bảng quyền).
- Kiểm độc lập (sonnet): so máy 25 hàng của `MATRIX` với 6 cột cũ (không đổi ô nào); `canAccessOrders`/`homeRedirect` giống công thức cũ trên toàn bộ 64 tổ hợp mã cũ. **Approved.**
- Nợ còn lại: chú thích lỗi thời (`isOffice` bỏ sót PARTNER/INTERN trong lời giải thích), chuỗi "Super Admin" tiếng Anh còn ở `accounts/index.ts` (kế hoạch đã giao cho Task 7 xử lý, không phải sót).

### Task 3 — `roles.ts`: danh mục vai, quyền hiệu lực, kiểm gán vai
- Commit: `a75fe15..247402c` (thi công đầu `2f2abc1`; fix round 1 vá lỗ lách LC-4 qua chỉnh tay "ngủ" — `b7de6cd`; fix round 2 ghim chiều gỡ dòng chỉnh tay cao đã ngủ — `247402c`, amend từ `ffa78ad`).
- Test: thi công đầu `roles.test.ts` 8/8, `roles-schema.test.ts` 2/2, `npm test` 677/677. Fix round 1: `roles.test.ts` 13/13, `npm test` 682 (681 xanh, 1 ca nền). Fix round 2: `roles.test.ts` 15/15, `npm test` 684/684.
- P16: xem `docs/SO-HANG-RAO.md` hai dòng "`src/roles-schema.test.ts`" và "`roleAssignmentProblem`/`highPermissionProblem` — chỉnh tay 'ngủ'" — 1 lần cho schema, 4 vòng cho hàm LC-4 (mỗi vòng canh đúng một nửa cơ chế: bỏ vế `adds`, bỏ vế `removes`, bỏ nửa "vai bị gỡ", `highPermissionProblem` chỉ bắt chiều cấp).
- Kiểm độc lập: vòng 1 (sonnet) — Spec ✅ (roles-schema có răng, 3 đột biến đỏ); Quality "Needs fixes" — **I-1 quan trọng: lỗ lách LC-4 qua chỉnh tay "ngủ"** (`highPermissionProblem` chỉ so quyền RÒNG hôm nay, nên một người không phải Toàn quyền có thể thêm `adds:[SUPER_ADMIN]` vào một Giám đốc — không đổi gì hôm nay vì Giám đốc đã có sẵn quyền đó qua mặc định — dòng "ngủ" này tự kích hoạt khi vai đổi sau); I-2 (thiếu ca ghim gỡ Giám đốc/Điều hành chung bằng cách không chọn lại, và gỡ ADMIN qua thay đổi ròng). Vòng 2 (sau fix round 1) — I-1/I-2 ĐÃ SỬA; phát hiện MỚI: chưa ghim chiều "BỎ một dòng chỉnh tay cao đã ngủ" (chỉ thêm được ghim, chưa ghim gỡ). Vòng 3 (sau fix round 2) — ĐÃ SỬA, đúng 2 test mới đỏ dưới đột biến của người kiểm. **Hoàn tất, review sạch sau 2 vòng sửa.**
- Ruling áp dụng: R15 (thêm tham số bắt buộc `currentAdjustments` cho `roleAssignmentProblem`, luật "không đổi dòng chỉnh tay cao đang có mà không phải Toàn quyền"), R16 (thêm test cho cả hai chiều LC-4 + ca "ngủ" + "chỉnh tay không đổi vẫn cho lưu").
- Nợ còn lại: `effectivePermissions` chưa lọc LC-1 cho tập vai MIXED (roleAssignmentProblem + trigger LC-3 đã chặn MIXED trước, nên không có đường tới được trạng thái đó); `HandlesOrders`/`handles` chưa có test (dùng ở GĐ2).
- **Cảnh báo giao diện hàm cho Task 5/7/8:** `roleAssignmentProblem` nay có tham số BẮT BUỘC `currentAdjustments` = dòng chỉnh tay THẬT đang có của tài khoản (đọc từ CSDL), không phải dữ liệu của yêu cầu đang gửi lên — gọi sai làm lỗ LC-4 quay lại.

### Task 4 — Module `parties`: hàm vai cho tài khoản, chặn vai nội bộ/bên ngoài ở route Hồ sơ, meta đủ loại vai
- Commit: `3bfa903..0c940ef`.
- Test: `npm test` 688/688 (2 lần, trước và sau P16, cùng kết quả — ca nền KHÔNG đỏ cả hai lần); `typecheck` 0 (3 tsconfig); e2e ĐỦ BỘ 18/18 + `audit-invariants --strict` đạt; Chrome `dot-a-smoke.mjs` 10/10.
- P16: xem `docs/SO-HANG-RAO.md` dòng "409 `role_via_account` ở route Hồ sơ" (nửa đầu — route TẠO vai).
- Kiểm độc lập (opus): Spec ✅ (giao diện hàm đúng khớp; route tạo/kết thúc vai trả 409 cho INTERNAL/EXTERNAL, OTHER không đổi; meta trả đủ loại vai kèm nhóm/trạng thái; giao diện lọc; Ruling R1 được ghim; `defineSql`/EXPLAIN sạch; R-N1-12 sạch; hàng rào xanh). Quality: **Approved**. Thêm điểm cộng: sửa luôn lỗi hiện mã `STAFF` thô ở danh sách Hồ sơ (meta trước đây bỏ sót loại vai không hoạt động).
- Ruling áp dụng: R1 (`OPEN_ROLE_CODES_FOR` thêm `AND location_id IS NULL` để khớp `ACCOUNT_ROLES_OF`).
- Nợ còn lại: M1 (một số nhánh của `accountRolesOf`/`reopenRoleStatement` chưa có test ghim riêng), M2 (nhánh `role_group_conflict` của `constraintProblem` không tới được qua route `parties`, chỉ phòng thủ — `accounts` phải tự map lỗi này, Task 7 đã làm), M3 (bình luận `REOPEN_ROLE` nói "đóng trong hôm nay" nhưng câu SQL mở lại BẤT KỲ dòng đã đóng nào — hợp đồng dựa vào Task 5 chỉ gọi với dòng đóng hôm nay, Task 5 review đã xác nhận), M4 (điều kiện "vai tài khoản = INTERNAL/EXTERNAL" lặp ở hai nơi, có thể gộp bằng `isRoleCode`). Ghi chú: API vẫn nhận gán MỚI cho mã vai đã ngưng dùng (STAFF/SALES/GUIDE/AGENT) — quyết định tạm của kế hoạch, xem mục dưới.

### Task 5 — Module `staff`: trạng thái vai, câu đổi vai + chỉnh tay, tạo tài khoản theo vai / trên hồ sơ có sẵn
- Commit: `0c940ef..f642848` (thi công đầu `9fd102b`; fix round 1 ghim `OTHER_ADMIN` cho cả hai câu chỉnh tay — `f642848`).
- Test: thi công đầu `account-roles.test.ts` 7/7. Fix round 1: 9/9; `npm test` 697/697; `typecheck` 0.
- P16: xem `docs/SO-HANG-RAO.md` dòng "`OTHER_ADMIN` trên câu chỉnh tay" — hai phép (đổi tham số, ép `guarded` thành hằng), cùng một ca đỏ.
- Kiểm độc lập: vòng 1 (opus) — Spec ✅ (mọi hành vi đã thử THẬT, kể cả đường có chốt "còn quản trị khác" trên bản sao tạm); Quality "Needs fixes" — **I-1 quan trọng: chốt `OTHER_ADMIN` không được ghim ở hai câu chỉnh tay** (đột biến tham số hoặc đột biến `guarded: false` đều giữ 7/7 xanh — có thể nửa-áp dụng, batch2 `[0,0,1,1]`). Vòng 2 (sau fix, sonnet) — ĐÃ SỬA, tự chạy đột biến trên bản sao tạm → đúng ca dự kiến đỏ. **Hoàn tất, review sạch sau 1 vòng sửa.**
- Ruling áp dụng: R20 (`ruleViolation` ở `accounts` ánh xạ thêm lỗi tranh chấp đồng thời của `stf_permission_adjustment`/vai thành 409 "tải lại rồi thử lại", giao cho Task 7), R21 (nhánh "dừng route TRƯỚC lô vai khi hết quản trị viên khác" không có test quyết định trong Task 5 — giao Task 7 thêm ca cấp `staff` thật + ghi vào Sổ hàng rào là "dựa vào kỷ luật + kiểm độc lập" trừ khi tìm được cách ghim chắc), R22 (không đổi gì — hai lô không nguyên tử đã được kế hoạch chấp nhận, chỉ xảy ra khi đang GỠ quản trị nên trạng thái nửa vời không leo thang).
- Nợ còn lại: helper `change()` trong test chạy cả lô vai khi guard thua (route thật không làm vậy — đã fix cùng I-1); kiểm "hồ sơ ngưng dùng"/"nhóm lẫn lộn" chưa có ca DB thật (mutation giữ xanh); dòng chỉnh tay không đổi không bị đóng/mở lại (mutation giữ xanh); sửa CHỈ lý do của dòng chỉnh tay đang có bị bỏ qua âm thầm (UI của Task 7/8 tự tránh bằng cách bỏ qua PUT không đổi); thứ tự "lý do mới nhất trước" chưa ghim.
- ⚠️ cho chủ/phiên sau (đã đưa vào `docs/HANDOFF-N1.md` "Việc còn treo"): (a) hồ sơ đang giữ "Kế toán" không địa điểm = R2; (b) tạo tài khoản trên hồ sơ có sẵn KHÔNG đóng các dòng vai cũ (`STAFF`/`SALES`/`GUIDE`/`AGENT`) trên hồ sơ đó — câu hỏi dữ liệu, không phải lỗi; (c) hồ sơ có sẵn giữ vai EXTERNAL theo địa điểm qua được kiểm nhóm rồi mới vấp LC-3 — Task 7 đã ánh xạ lỗi này.

### Task 6 — Kiểm bất biến dữ liệu R-LC-1, R-LC-3; sửa kiểm "thiếu vai STAFF"
- Commit: `f642848..53dd8ff`.
- Test: `audit-invariants.test.ts` RED trước (15/18) → GREEN sau (18/18); `npm test` 700/700; e2e `parties` 1/1 + ĐỦ BỘ 18/18 kèm `audit --strict` (gồm R-LC-1/R-LC-3).
- P16: xem `docs/SO-HANG-RAO.md` dòng "`scripts/audit-checks.mjs` R-LC-1/R-LC-3" — **đặc biệt: người kiểm độc lập tái tạo lại phép đột biến R-LC-1 và phát hiện nó làm ĐỎ CẢ HAI ca cùng lúc** (ca R-LC-1 và ca "dữ liệu khoẻ: MỌI kiểm … cho 0 vi phạm") — báo cáo gốc của Task 6 dùng nhầm chữ "đảng viên" để gọi một hồ sơ thử nghiệm trong dữ liệu dựng sẵn; từ đúng là "hồ sơ" (đã sửa khi chép vào Sổ hàng rào).
- Kiểm độc lập (sonnet): Spec ✅ (đối chiếu byte-với-brief; SQL kiểm vs điều kiện trigger 0024: cùng định nghĩa "dòng đang mở", cùng loại trừ PARTNER, cùng cặp INTERNAL/EXTERNAL — không bỏ sót trạng thái nào trigger chặn, không báo giả; tự chạy lại đột biến R-LC-3 trên bản sao tạm → đúng ca đỏ). Quality: **Approved.**
- Ruling áp dụng: R23 (kịch bản e2e chỉ chạy `audit-invariants --strict` khi chạy ĐỦ BỘ không lọc tên — Task 7 phải dùng bộ ĐỦ để cổng này có tác dụng thật).
- Nợ còn lại: 3 phép đột biến khác (bỏ điều kiện `valid_to_date IS NULL` ở R-LC-1, bỏ `valid_to_at IS NULL` ở phía quyền, đổi `count(DISTINCT …)` thành `count(*)` ở R-LC-3) vẫn giữ 18/18 xanh — cần thêm ca "vai đã đóng"/"quyền đã thu hồi"/"hai vai INTERNAL cùng lúc" ở lượt sau.

### Task 7 — Module `accounts`: route vai, LC-4, e2e roles
- Commit: `53dd8ff..119dfcd`.
- Test: `npm test` 701/701; `typecheck` 0; e2e ĐỦ BỘ 19/19 kèm `audit --strict`.
- P16 (ba dòng, ngày 2026-09-24, đã hoàn nguyên trước commit — xem `docs/SO-HANG-RAO.md` các dòng "LC-4 ở route cũ", "409 `role_via_account`…" (nửa sau, route KẾT THÚC vai), "Thứ tự chạy lô vai theo chốt (R21a)"). **Không có P16 cho nhánh R21b** (route dừng TRƯỚC lô vai khi hết quản trị viên khác ở TẦNG ROUTE) — thử xoá dòng đó không làm gì đỏ (khác với P16 = quan sát CHẶN được); ghi rõ trong Sổ hàng rào là "dựa vào kỷ luật + kiểm độc lập", không phải "đã thấy chặn thật".
- Kiểm độc lập (opus, sau một lần dừng phiên do lệnh chủ "dừng" — không liên quan Task 7, việc UI bị giao nhầm sang phiên này — rồi tái dispatch): Spec ✅; LC-4 không lọt qua cả 4 đường gọi; hàng rào + ảnh chụp số route (71) ổn; tài khoản role-managed khoá đúng 409 `role_managed`; dòng nhật ký đúng; chuỗi hiển thị đúng; tự tái tạo P16 R21a đỏ; tự chạy 2 đột biến riêng (bỏ `mayManage` → hàng rào 2 đỏ; `GET roles` đổi mức `admin`→`office` → hàng rào truy cập đỏ). Quality: **Approved.**
- Ruling áp dụng: R17 (thêm ca e2e cho route KẾT THÚC vai của Hồ sơ trả 409), R20 (ánh xạ lỗi tranh chấp đồng thời), R21 (ca staff thật gỡ ADMIN + giữ đúng thứ tự "dừng route trước lô vai"), R23 (chạy e2e ĐỦ BỘ để cổng `audit --strict` có tác dụng), R4 (số phiên bản — xem mục "Nhật ký thay đổi" ở Task 9).
- Nợ còn lại: hai lô không nguyên tử vẫn còn (chấp nhận theo kế hoạch, R22); mapping R20 + điểm dừng R21b không có test xác định (mục Sổ hàng rào ghi "dựa vào kỷ luật + kiểm độc lập").
- Ghi vào Task 9 (đề xuất, không tự sửa): `docs/quyen-hoan.json` các dòng `admin.manage.superadmin` (~dòng 29) và route `POST /api/staff` (~dòng 107) còn ghi lý do cũ "kiểm tay `includes('SUPER_ADMIN')`" — nay đã được thi hành bằng `highPermissionProblem`/`roleAssignmentProblem` trên cả 4 đường; xem mục "Đề xuất chờ chủ duyệt" dưới.

### Task 8 — Giao diện Nhân viên: chọn vai + Chrome
- Commit: `119dfcd..f51963a` (thi công đầu `4684dc2`; fix round 1 thêm bước Hồ sơ vào `vai-smoke.mjs` cho Ruling R18 — `f51963a`).
- Test: `npm test` 701/701 (không đổi hành vi máy chủ); `typecheck` 0; `vai-smoke.mjs` OK (4 mục rồi 5 mục sau fix); `dot-a-smoke.mjs` 10/10; `passkey-smoke.mjs` 9/9 (chạy lại vì cùng kho cookie).
- P16: xem `docs/SO-HANG-RAO.md` dòng "Kịch bản Chrome `vai-smoke.mjs`" — LC-3 giao diện (thi công đầu) + R18 bước Hồ sơ (fix round 1).
- Kiểm độc lập (sonnet): Spec **❌ chỉ ở R18** (hành vi đúng ở `web/parties.ts`, nhưng KHÔNG có kịch bản Chrome ghim lại — Ruling R18 là lệnh bắt buộc trong brief, không phải tuỳ chọn); mọi phần khác ✅ (route theo trạng thái vai, lỗi tiếng Việt, không lộ mã thô, máy chủ vẫn là nơi quyết, điền sẵn + bỏ qua PUT không đổi, kịch bản vá đúng một cuộc đua). Quality: "Needs fixes" → fix round 1 → **Approved** (không có hồi quy mới).
- Ruling áp dụng: R18 (thêm bước Hồ sơ vào `vai-smoke.mjs`), R14 (kịch bản hồi quy ghi ảnh vào thư mục tạm, không ghi đè bằng chứng cũ).
- Nợ còn lại: mở form sửa vai của CHÍNH MÌNH không tự khoá các ô vai — chỉ chặn lúc lưu (403 tiếng Việt); polish giao diện để sau.

## Kết quả kiểm độc lập từng task (tóm tắt)

| Task | Người kiểm | Vòng | Kết quả |
|---|---|---|---|
| 1 | opus → sonnet | 2 | Sạch sau 1 vòng sửa (CHECK cho tập đóng) |
| 2 | sonnet | 1 | Approved ngay |
| 3 | sonnet | 3 | Sạch sau 2 vòng sửa (lỗ LC-4 qua chỉnh tay "ngủ", rồi ghim chiều gỡ) |
| 4 | opus | 1 | Approved ngay |
| 5 | opus → sonnet | 2 | Sạch sau 1 vòng sửa (ghim `OTHER_ADMIN`) |
| 6 | sonnet | 1 | Approved ngay |
| 7 | opus | 1 (sau 1 lần dừng phiên không liên quan) | Approved ngay |
| 8 | sonnet | 2 | Sạch sau 1 vòng sửa (thiếu bước Hồ sơ R18) |

Task 10 (một vòng kiểm độc lập toàn nhánh, sau khi gộp `origin/main` mới nhất) — **chưa chạy, ngoài phạm vi Task 9.**

## Merge trước Task 9 (Ruling R25)

Gộp `origin/main` (`d9858c6` — Đợt E, trang Đăng nhập 1.6/1.7) vào `gd1-mo-hinh-vai` → `1dd9dc3`. Đụng độ CHỈ ở `docs/adr/README.md` (giữ dòng ADR-0018). `npm test` 755/755, `typecheck` 0, `npm run build:web` sạch. CHANGELOG đầu bản trên `main` = 1.7 → Task 9 dùng **1.8**.

## Quyết định tạm của giai đoạn 1 và rủi ro còn lại

(Chép nguyên văn từ `docs/superpowers/plans/2026-09-24-mo-hinh-vai-gd0-gd1.md` §"Quyết định tạm của giai đoạn 1 và rủi ro còn lại", để người kiểm và chủ dự án thấy cùng một chỗ; mỗi dòng là lựa chọn có chủ ý, không phải sót.)

- **Giám đốc = `ADMIN` + `SUPER_ADMIN`**: theo ADR-0018 điều 4 ("Toàn quyền, kèm Quản trị để các chốt 'còn ít nhất một quản trị viên' đếm đúng"); bảng ở đặc tả §4 viết tắt "Toàn quyền".
- **Cột `INTERN` tạm hẹp** (Task 2): lập đơn, xem/sửa đơn của mình; **chưa** đủ điều kiện làm người phụ trách (`checkAssignee`) — đơn Thực tập sinh lập vào hàng chưa có người. Giai đoạn 2 mở theo đặc tả §5.
- **Nhãn "Bán hàng" → "Kinh doanh"**: để giai đoạn 3 (đổi nhãn hiển thị cùng trang "Vai & quyền").
- **Route vai chung của Hồ sơ vẫn nhận mã vai đã ngưng** (`STAFF`, `SALES`, `GUIDE`, `AGENT`) nếu gọi thẳng API; chỉ giao diện lọc bỏ. Lý do: không làm vỡ dữ liệu/kịch bản đang dùng vai theo nơi. Trang Hồ sơ **không còn cho thêm "Hướng dẫn viên" theo nơi (theo bến)** — chủ dự án **đồng ý bỏ** (phiên chat 2026-09-24: "bỏ HDV theo bến").
- **Vai mở rồi gỡ trong CÙNG ngày**: dòng giữ từ-đến = hôm nay (không đặt được ngày kết thúc trước ngày bắt đầu); trang Hồ sơ vẫn liệt kê vai đó trong hôm ấy (đúng: người đó đã giữ vai một phần ngày). Luật cứng và quyền chỉ xét dòng đang mở nên không ảnh hưởng.
- **Gỡ quyền Quản trị khi đổi vai chạy hai lô** (Task 7): lô 1 = câu chốt "còn quản trị viên khác" + quyền + chỉnh tay + nhật ký; lô 2 = đóng/mở vai (bảng của `parties` không mang được điều kiện của `staff`). Nếu máy chủ hỏng đúng giữa hai lô, quyền đã đổi mà vai chưa đổi — nhật ký có dòng, quản trị làm lại được. Hệ quả với LC-6 ("nhật ký cùng `db.batch()` với thay đổi"): trong riêng trường hợp này, phần **vai** chạy ở lô sau dòng nhật ký; mọi trường hợp khác đủ một lô. Tranh chấp hai quản trị viên cuối chỉ xảy ra giữa hai Toàn quyền (LC-4).
- **Tài khoản chỉ có `SUPER_ADMIN`** (không kèm `ADMIN`): trang Nhân viên mở được (cổng trang đổi sang `can(…, "admin.manage")`), nhưng thanh điều hướng chưa hiện mục quản trị (`web/shell.ts` dùng `hasPermission(ADMIN)`) — ngoài phạm vi, ghi nợ.
- **Tài khoản công ty lữ hành** (hồ sơ tổ chức): chưa làm (giai đoạn 4); tạo tài khoản trên hồ sơ tổ chức bị từ chối có thông báo.
- **Phát hiện khi rà mã (chưa thử trên trình duyệt):** form lập đơn gọi `GET /api/catalog` (mức `office`), nên tài khoản không phải văn phòng lập đơn — Đối tác hiện nay và Thực tập sinh từ giai đoạn này — có thể không nạp được danh mục dịch vụ. Không sửa ở đây (giai đoạn 2, bảng thao tác mới); ghi nợ để chủ biết.

## Số ADR bị trùng (cần chủ quyết)

Tài liệu hàng rào trên `main` (từ phiên khác) đã dùng số **ADR-0018** để chỉ MỘT ADR KHÁC (cơ chế hàng rào quyền, không phải mô hình người–vai–quyền). ADR-0018 của kế hoạch này (mô hình người–vai–quyền, đã accepted 2026-09-24, `3528ff1`) cần một **số ADR mới** để hết trùng — Task 9 không tự đổi số (N9, luật chi phối chính mình); chủ dự án quyết đổi số nào và ai đổi.

## Đề xuất chờ chủ duyệt (KHÔNG tự sửa — hai tệp này chủ đã duyệt, N9)

### 1. `docs/quyen-hoan.json` — cập nhật `ly_do` cho khớp mã đã thi công (Task 7)

Hai chỗ nói "kiểm tay `includes('SUPER_ADMIN')`" nay đã sai — cơ chế thật là `highPermissionProblem`/`roleAssignmentProblem` (`src/shared/roles.ts`), áp trên cả 4 đường cấp quyền (`PUT /api/staff/:id/roles`, `PUT /api/staff/:id/permissions`, `POST /api/staff`, `POST /api/staff/sheet/apply`).

```diff
--- a/docs/quyen-hoan.json
+++ b/docs/quyen-hoan.json
@@ (mục "admin.manage.superadmin", ~dòng 29)
-      "ly_do": "Thi hành bằng kiểm tay admin.permissions.includes('SUPER_ADMIN') ở POST /api/staff và PUT /api/staff/:id/permissions, không qua can().",
+      "ly_do": "Thi hành bằng highPermissionProblem/roleAssignmentProblem (src/shared/roles.ts, LC-4) trên cả 4 đường cấp quyền (PUT /api/staff/:id/roles, PUT /api/staff/:id/permissions, POST /api/staff, POST /api/staff/sheet/apply), không qua can().",
@@ (mục route POST /api/staff, ~dòng 107)
-    { "method": "POST", "path": "/api/staff", "loai": "hoãn", "ly_do": "Cổng thô admin + kiểm tay includes('SUPER_ADMIN'); không hỏi admin.manage / admin.manage.superadmin.", "ke_hoach": "GĐ2 ADR-0018.", "han": "2026-10-15", "nguoi_chiu_trach_nhiem": "chủ dự án" },
+    { "method": "POST", "path": "/api/staff", "loai": "hoãn", "ly_do": "Cổng thô admin + highPermissionProblem/roleAssignmentProblem (LC-4); không hỏi admin.manage / admin.manage.superadmin.", "ke_hoach": "GĐ2 ADR-0018 (số ADR cần chủ xác nhận lại — xem mục 'Số ADR bị trùng').", "han": "2026-10-15", "nguoi_chiu_trach_nhiem": "chủ dự án" },
```

(Số dòng chính xác — kiểm bằng `grep -n "SUPER_ADMIN" docs/quyen-hoan.json` trước khi áp, có thể lệch vài dòng nếu tệp đã đổi từ khi viết đề xuất này.)

### 2. `web/CLAUDE.md` — thêm `web/role-picker.ts`/`web/staff.ts` vào bảng kịch bản Chrome

```diff
--- a/web/CLAUDE.md
+++ b/web/CLAUDE.md
@@ (bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào")
+| `web/role-picker.ts`, phần chọn vai của `web/staff.ts` (mô hình người–vai–quyền, ADR-0018) | `vai-smoke.mjs` ở `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/` (5 bước: thêm vai máy tính, sửa vai máy tính, vai điện thoại, Hồ sơ của tài khoản đã gán vai, đơn của Thực tập sinh) |
```

## ⚠️ cho chủ dự án (đã đưa vào `docs/HANDOFF-N1.md` "Việc còn treo / nợ", nhắc lại ở đây để gom một chỗ)

1. Hồ sơ đang giữ vai "Kế toán" (mã cũ `ACCOUNTANT`) không gắn địa điểm, đang mở — sẽ tự được đọc là vai mô hình mới sau khi áp `0024`. Quyền không đổi; chỉ đổi NƠI sửa (trang Nhân viên thay vì route quyền cũ). Câu đếm trước-deploy: mục runbook `0024` của `docs/HANDOFF-N1.md`.
2. Tạo tài khoản MỚI trên một hồ sơ ĐÃ CÓ vai kiểu cũ (STAFF/SALES/GUIDE/AGENT) không tự đóng các dòng vai cũ đó (đổi vai mới đóng). Câu hỏi dữ liệu, không phải lỗi.
3. API vẫn nhận gán MỚI cho mã vai đã ngưng dùng (`active = 0`) — chưa bị chặn ở máy chủ, chỉ giao diện lọc.
4. Một quản trị viên tự sửa vai của CHÍNH MÌNH ở trang Nhân viên nhận lỗi 403 tiếng Việt lúc LƯU (không có khoá ô riêng trước đó) — polish giao diện để sau.

## Kiểm cuối Task 9

`node --test src/shared/changelog.test.ts src/shared/app-info.test.ts` → 15/15 xanh (số phiên bản 1.8). `npm test`, `npm run typecheck`, `node scripts/kiem-phien-ban.mjs` — kết quả ghi trong báo cáo Task 9 (`.superpowers/sdd/2026-09-24-mo-hinh-vai-gd0-gd1/task-9-report.md`).
