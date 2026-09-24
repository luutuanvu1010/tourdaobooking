# Kế hoạch: hàng rào quyền + vá lỗ hổng "nhân viên sửa hồ sơ nhân viên"

- **Ngày:** 2026-09-24   **Trạng thái:** GĐ0 thi công trên nhánh `worktree-hang-rao-quyen` (chưa gộp); GĐ1–GĐ4 chờ chủ dự án quyết (§5).
- **Liên quan:** kiểm toán `docs/AUDIT-2026-09-22-KIEN-TRUC.md` F-01/F-07; `docs/adr/ADR-0013` (proposed); ADR-0001/0005/0007 (accepted 2026-09-20); ADR-0014 điều 8; ADR-0017 (accepted 2026-09-24, nhánh `dot-e-the-don-gon-va-bieu-tuong`); đặc tả 11 vai (nhánh `mo-hinh-nguoi-vai-quyen`, chờ duyệt); Hiến pháp P4, P8, P16, P17, P20, P21, N7.
- **Bằng chứng chạy thật:** `tests/audit/redteam.test.mjs` R3/R3b/R3c/R3d; `docs/evidence/2026-09-24-lo-hong-ho-so/`.
- **Nguyên tắc của tài liệu này:** mô tả (thua mã); ngày hạn trong `docs/quyen-hoan.json` là **đề xuất**, chủ dự án xác nhận mới thành hạn thật.

## 0. Tóm tắt cho chủ dự án

Mã làm đúng đặc tả; đặc tả sinh lỗ vì ba quyết định duyệt cùng ngày 20/9 không được ghép lại, và vì bản đồ quyền không phải thứ máy dùng để chặn ở màn Hồ sơ. GĐ0 (nhánh này) dựng hai hàng rào máy để lỗi cùng loại không tái diễn âm thầm, kèm danh sách hoãn có hạn. GĐ1–GĐ2 vá lỗ và sửa cơ chế (hai ADR). GĐ3 mới thi công ADR-0017 và mô hình 11 vai. GĐ4 là ba luật quy trình, chỉ đề xuất.

## 1. Nguyên nhân gốc (rút gọn từ phân tích 2026-09-24)

| Tầng | Sự thật đã kiểm | Bằng chứng |
|---|---|---|
| Mã | 12 route `/api/parties*` không gọi `can()`; cổng duy nhất là `access: "office"` = `isOffice` = `can(order.view)` | `src/modules/parties/index.ts:115–282`; `src/shared/permissions.ts:110`; `src/shared/router.ts:141` |
| Đặc tả | N1 §7.2 ghi "sửa hồ sơ: SALES · ACCOUNTING · ADMIN" và "`parties` không đọc `staff`, không trả `accountId`" | `docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md` §7.2 |
| ADR | ADR-0001 điều 6 (danh bạ chung gồm nhân sự) + ADR-0005 (tên tài khoản = tên hồ sơ) + ADR-0007 ("sửa hồ sơ **khách, đại lý**" cho mọi nhân viên; "quản lý tài khoản" chỉ ADMIN) — cùng commit `95399be` 2026-09-20. Ghép lại thành lỗ; không bước nào hỏi "bảng này chứa ai". Kiểm toán 22/9 ghi "ADR-0007 viết trước khi nhân sự vào bảng" — sai thời gian, đây là lỗi **ghép** | `git log --diff-filter=A -- docs/adr/ADR-000{1,7}*` |
| Cơ chế | **13/25 ô** của `MATRIX` không được máy chủ hỏi (`party.view/write`, `admin.manage(.superadmin)`, `money.view`, `contact.view`, `task.progress`, `dispatch.guides.view/request`, `payment.*`, `invoice.*`); `permissions.test.ts` chỉ khoá GIÁ TRỊ ô → hàng rào giả (P16). ADR-0007 điều 3 hứa "máy chủ kiểm theo bảng, test phủ từng ô" → lệch, ghi ở `SYSTEM-DESIGN.md` §16 | `src/permission-enforcement.test.ts` (GĐ0) liệt kê |
| Lỗ tiềm ẩn | Đổi đúng một ô (`order.view` của FIELD → `any`, điều ADR-0017 đòi) thì FIELD `PUT /api/parties/pty-<admin>` → **200**, thêm SĐT → **201**, dù ADR-0017 điều 4 nói "chỉ mở quyền XEM" | `docs/evidence/2026-09-24-lo-hong-ho-so/` |

## 2. Tiêu chí nghiệm thu (viết TRƯỚC khi làm — P20)

### GĐ0 (nhánh này)
1. `npm test` xanh trên nhánh; `npm run typecheck` 0 lỗi.
2. **Hàng rào 1** `src/permission-enforcement.test.ts`: mọi ô của `MATRIX` hoặc có ít nhất một lời gọi `can(`/`MATRIX[` với chuỗi ô đó trong `src/modules/**` (ngoài test), hoặc có mục trong `docs/quyen-hoan.json` (`thao_tac`) với lý do, kế hoạch, hạn ≥ hôm nay (giờ VN), người chịu trách nhiệm. Mục hoãn cho ô đã được thi hành → đỏ ("hoãn thừa"). Hết hạn → đỏ.
3. **Hàng rào 2** `src/route-write-guard.test.ts`: mọi route `POST/PUT/PATCH/DELETE` có `access ≠ "public"` trong `src/modules/*/index.ts` phải có trong thân handler một lời gọi kiểm quyền được công nhận (`can(`, `MATRIX[`, `canRead(`, `mayManage(`, `canManageAccount(`, `handlerChangeVerdict(`, `mayChangeHandler(`, `checkAssignee(`), hoặc có mục `cua_ghi` trong `docs/quyen-hoan.json` (hoãn có hạn, hoặc ngoại lệ có lý do). Mục cho route đã có kiểm → đỏ. Route không còn tồn tại → đỏ. Số route bóc được phải bằng số lời gọi `route(` trong tệp (chống regex bỏ sót).
4. **Quan sát chặn thật (P16)**, ghi vào `docs/SO-HANG-RAO.md`: (a) xoá mục `party.write` khỏi danh sách hoãn → hàng rào 1 đỏ, nêu đúng tên ô; hoàn nguyên → xanh. (b) bỏ dòng `can(staff, "order.create")` ở `POST /api/orders` → hàng rào 2 đỏ, nêu đúng route; hoàn nguyên → xanh.
5. `docs/quyen-hoan.json` liệt kê đúng 13 ô và đúng các route ghi chưa hỏi bảng; không mục thừa (hàng rào tự kiểm).
6. `tests/audit/redteam.test.mjs` thêm R3c (SALES thêm SĐT vào hồ sơ ADMIN → 201) và R3d (SALES ngưng hồ sơ khách → đồng nghiệp sửa đơn nháp 400) theo khuôn FINDING của tệp; chạy xanh (tức lỗ còn).
7. `docs/SYSTEM-DESIGN.md` §16 có dòng lệch ADR-0007 điều 3; §8 sửa câu sai về `PATCH /api/feedback/:id`; `docs/CHANGE-GUIDE.md` §3 có dòng cho hai hàng rào.
8. Người kiểm độc lập (chỉ đọc) xác nhận 1–7 bằng cách tự chạy lệnh.

### GĐ1 — ADR-0013 (vá lỗ)
- R3, R3b, R3c chuyển **đỏ** rồi được viết lại thành test hồi quy (SALES/ACCOUNTING → 403; ADMIN với mục tiêu cấp dưới → 200; ADMIN với mục tiêu ADMIN/SUPER_ADMIN → 403 theo ADR-0014 điều 8).
- Gỡ `party.view`, `party.write` và 4 route office của Hồ sơ khỏi `docs/quyen-hoan.json` (hàng rào 1/2 sẽ ép: mục thừa → đỏ).
- `audit-invariants` thêm câu kiểm một chiều "tài khoản đang hoạt động ⇒ hồ sơ đang hoạt động" (điều 4 sửa, §5).
- Người kiểm độc lập.

### GĐ2 — ADR-0018 (sửa cơ chế; TRƯỚC ADR-0017)
- Cổng `office` khai tường minh bằng danh sách quyền, không suy từ `order.view`; test khoá định nghĩa.
- Route quản trị gọi `can(admin.manage)` (+ `canManageAccount`), `POST /api/staff` gọi `can(admin.manage.superadmin)` khi cấp SUPER_ADMIN, `PATCH /api/feedback/:id` gọi `can(feedback.triage)`, `PUT /api/maintenance` → ô `settings.ops` (đặc tả 11 vai) hoặc ô riêng; thao tác tự phục vụ tài khoản → ô `account.self` hoặc ghi ngoại lệ vĩnh viễn có lý do.
- Ô không có nghiệp vụ (`task.progress`, `dispatch.guides.view`, `dispatch.request`) → bỏ khỏi `MATRIX` hoặc thi hành; `payment.*`/`invoice.*` giữ hoãn tới N3.
- Sau GĐ2, `docs/quyen-hoan.json` chỉ còn mục N3.
- Thí nghiệm `docs/evidence/2026-09-24-lo-hong-ho-so/kich-ban/lo-hong.mjs` với `order.view` của FIELD = `any` phải cho FIELD **403** ở `/api/parties*`.

### GĐ3 — ADR-0017 + 11 vai GĐ0
- Chỉ bắt đầu khi GĐ2 gộp `main`. Thêm e2e: FIELD → 403 ở `PUT /api/parties/:id` và `POST …/contacts`.

### GĐ4 — luật quy trình (đề xuất, chủ duyệt mới hiệu lực — N9)
- Ba đoạn nguyên văn ở §4, đặt vào `CLAUDE.md` §3/§9 và `docs/CHANGE-GUIDE.md` bằng PR riêng.

## 3. Giai đoạn và sản phẩm

| GĐ | Sản phẩm | Cửa | Người kiểm |
|---|---|---|---|
| 0 | `scripts/source-mask-lib.mjs`, `src/permission-enforcement.test.ts`, `src/route-write-guard.test.ts`, `docs/quyen-hoan.json`, `docs/SO-HANG-RAO.md`, R3c/R3d, bằng chứng, sửa §16/§8/CHANGE-GUIDE | hai chiều (gỡ được bằng một commit) | subagent chỉ đọc |
| 1 | ADR-0013 sửa lời (§5 Q1–Q2) → accepted → thi công `party.staff.write` + tiêm `partyHasAccount` (ADR-0013 điều 3) | hai chiều | subagent chỉ đọc |
| 2 | ADR-0018 (dàn ý §2 GĐ2) → accepted → thi công | hai chiều nhưng chạm mọi route: tách nhỏ theo module | subagent chỉ đọc |
| 3 | ADR-0017 + 11 vai GĐ0 theo kế hoạch riêng | — | theo kế hoạch đó |
| 4 | Ba luật quy trình | luật | chủ dự án |

## 4. Ba luật quy trình — nguyên văn đề xuất (N9: AI không tự áp)

**(a) Bước ghép khi duyệt** — thêm vào `CLAUDE.md` §9 (Quy trình):
> Khi một lượt duyệt gồm ≥ 2 quyết định (ADR/đặc tả) hoặc khi một bảng dùng chung nhận thêm một loại dữ liệu mới, người soạn phải kèm **một trang ghép**: (1) bảng này chứa những loại thực thể nào; (2) từng dòng bản đồ quyền chạm bảng này áp cho loại nào; (3) cổng nào canh cửa nào. Không có trang ghép thì lượt duyệt chưa đủ điều kiện. Mỗi lượt duyệt tối đa 3 quyết định có chạm quyền/dữ liệu.

**(b) Sổ hàng rào** — thêm vào `CLAUDE.md` §3 (sau P16):
> Mọi hàng rào mà AI dựa vào để tin mình an toàn phải có dòng trong `docs/SO-HANG-RAO.md`: chặn cái gì, cơ chế, ngày quan sát chặn thật (sửa cố ý → đỏ → hoàn nguyên). Hàng rào không có dòng, hoặc dòng chưa có ngày quan sát, coi là lời khuyên.

**(c) Dừng dây chuyền** — thêm vào `CLAUDE.md` §3 và `docs/CHANGE-GUIDE.md`:
> Phát hiện an ninh mức HIGH trở lên (kiểm toán, red team) phải có mục trong `docs/quyen-hoan.json` (hoặc sổ tương đương) với người chịu trách nhiệm và hạn; quá hạn thì `npm test` đỏ. Đặc tả/kế hoạch chạm vùng đang hở phải ghi "xây trên lỗ đang hở: <mã>" và không được duyệt trước khi lỗ được vá hoặc chủ dự án gia hạn có ghi lý do.

## 5. Quyết định cần chủ dự án

| # | Câu hỏi | Khuyến nghị |
|---|---|---|
| Q1 | ADR-0013: duyệt nguyên văn (A) hay duyệt điều 1–3 + sửa điều 4 (B: bỏ "ngưng tài khoản ⇒ tự ngưng hồ sơ"; giữ "màn Hồ sơ từ chối đổi `active` của hồ sơ có tài khoản" + kiểm một chiều; thêm luật nghỉ việc = đóng vai có ngày + ngưng tài khoản, tạm khoá = chỉ ngưng tài khoản) | **B** |
| Q2 | Luật "hồ sơ **có tài khoản** chỉ quản trị (cấp trên) sửa" ôm cả hồ sơ công ty lữ hành khi công ty có tài khoản (11 vai) — SALES không sửa được địa chỉ/MST đại lý đó nữa | Đồng ý |
| Q3 | Tách cổng `office` (GĐ2) là điều kiện tiên quyết của ADR-0017 và 11 vai GĐ0 | Đồng ý — thi công ADR-0017 trước sẽ mở lỗ L2 (đã chứng minh) |
| Q4 | Xác nhận các hạn trong `docs/quyen-hoan.json`: 2026-10-08 (Hồ sơ), 2026-10-15 (cổng admin/ADR-0018), 2026-11-30 (ô chưa có nghiệp vụ, bảo trì), 2026-12-31 (N3) | Xác nhận hoặc sửa số |
| Q5 | Ba luật quy trình §4 | Duyệt (a)(b)(c) |
| Q6 | Chạy một lần lệnh chỉ-đọc trên production để xem có hồ sơ nhân viên nào đã bị sửa/ngưng bởi tài khoản không phải ADMIN (nhật ký `party_updated` theo `staff_id` không có quyền ADMIN) | Nên, trước GĐ1 |

## 6. Rủi ro

- Hai hàng rào là phân tích tĩnh (regex + đếm ngoặc trên mã đã che chuỗi/chú thích): route viết khác khuôn `route("METHOD", "path", "access", async (…) => {…})` sẽ làm test đỏ với thông báo rõ — cố ý, để không bỏ sót.
- Hạn hết → `npm test` đỏ chặn cả triển khai khẩn: gia hạn bằng cách sửa `han` (một dòng, có diff để rà) — đúng ý "dừng dây chuyền", nhưng chủ phải biết cơ chế này tồn tại.
- GĐ2 chạm mọi route quản trị: tách theo module, mỗi lát một người kiểm.

## 7. Nhật ký thi công GĐ0 (2026-09-24, nhánh `worktree-hang-rao-quyen` từ `45e0365`)

| Bước | Việc | Kết quả quan sát |
|---|---|---|
| 1 | Viết tiêu chí §2 trước khi viết mã | — |
| 2 | `scripts/source-mask-lib.mjs`, `docs/quyen-hoan.json` (13 ô + 18 route hoãn + 7 ngoại lệ tự phục vụ), hai test | Lần chạy đầu: hàng rào 1 3/3 xanh, hàng rào 2 4/4 xanh → danh sách hoãn khớp thực trạng, không thiếu không thừa (test tự kiểm "hoãn thừa") |
| 3 | **Đột biến hàng rào 2** (P16): đổi `if (!can(staff, "order.create")) …` ở `POST /api/orders` thành chú thích | Đỏ: `Đường ghi chỉ dựa cổng thô, không hỏi bảng quyền và không có trong docs/quyen-hoan.json (cua_ghi): POST /api/orders (orders, access "orders")`; ca chống-rỗng đỏ theo (đúng); `git checkout` → 4/4 xanh, tệp sạch |
| 4 | **Đột biến hàng rào 1** (a): xoá mục hoãn `party.write` | Đỏ: `Ô không được máy chủ hỏi ở đâu và cũng không có trong docs/quyen-hoan.json: party.write` |
| 5 | **Đột biến hàng rào 1** (d): `han` của `party.view` = 2026-09-01 | Đỏ: `thao_tac "party.view": HẾT HẠN HOÃN (2026-09-01 < 2026-09-24) — vá theo "…" hoặc chủ dự án gia hạn có ghi lý do`; hoàn nguyên → 3/3 xanh, `diff -q` JSON nguyên vẹn |
| 6 | R3c/R3d vào `tests/audit/redteam.test.mjs` | `node --test --test-name-pattern="R3" tests/audit/redteam.test.mjs` → 4/4 (FINDING): R3c 201; R3d ngưng 200 → đồng nghiệp sửa đơn 400, nhật ký "cá nhân" |
| 7 | Bằng chứng `docs/evidence/2026-09-24-lo-hong-ho-so/` (kịch bản + README kết quả hai môi trường) | Kịch bản chạy được từ gốc repo (đường dẫn tương đối tới `tests/audit/harness.mjs`) |
| 8 | `docs/SYSTEM-DESIGN.md` §8 (sửa câu sai `PATCH /api/feedback/:id`), §16 (dòng lệch ADR-0007 điều 3); `docs/CHANGE-GUIDE.md` §3; `docs/SO-HANG-RAO.md` | — |
| 9 | `npm run typecheck` | 0 lỗi |
| 10 | `npm test` | **651 ca: 650 xanh, 1 đỏ** — `src/claude-guard.test.ts` ca "guard-remote: lệnh dị dạng không làm hook quá giờ (timeout 10 s của hook)": đo CPU của hàm thuần `evaluateBash` với đầu vào dị dạng, ngưỡng 1500 ms, đo được 1961–2057 ms. Đỏ 3/3 trong worktree VÀ 2/2 khi chạy đúng tệp đó của checkout gốc `main` (`45e0365`) cùng thời điểm; `uptime` load average **51** (nhiều phiên song song). Sáng cùng ngày, máy rảnh, `npm test` ở checkout gốc 644/644 xanh. ⇒ **do máy bận**, không do nhánh này (tệp không đổi). KHÔNG sửa ở đây (test hook thuộc luật) — xem §8 |

## 8. Việc còn treo sau GĐ0

- Ca đo CPU của `src/claude-guard.test.ts` vẫn nhạy với tải máy dù đã đổi từ đồng hồ sang CPU (2026-09-24, `587976e`/`45e0365`): với load average ~50, CPU time của một tiến trình cũng phình ~35% (tranh chấp lõi/bộ nhớ đệm). Đề nghị phiên riêng: hoặc nới ngưỡng có lý do, hoặc đo bằng số phép lặp thay vì thời gian. Người kiểm độc lập chạy lại `node --test src/claude-guard.test.ts` khi máy rảnh và ghi kết quả.
- Các hạn trong `docs/quyen-hoan.json` là đề xuất (Q4).
