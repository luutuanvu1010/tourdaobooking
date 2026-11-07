# Xem như vai khác — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Mỗi bước có ô `- [ ]`. Việc lớn (quyền, nhật ký): thi công xong phải có **người kiểm độc lập chỉ đọc** (CLAUDE.md §3, Hiến pháp N8) — người thi công không tự nghiệm thu.

**Goal:** Tài khoản giữ Toàn quyền đóng một mã quyền (một mỗi lần) từ bảng điều khiển cá nhân; máy chủ thu quyền hiệu lực của phiên đúng bộ quyền đó.

**Architecture:** Một cột `acting_role` trên `aut_session`; `currentStaff` là chỗ duy nhất đổi `staff.permissions` thành bộ hiệu lực (giữ `realPermissions` cho các cổng xét quyền thật); `audit_log` thêm cột `acting_role`; thanh báo ở `web/shell.ts`.

**Tech Stack:** TypeScript, Cloudflare Workers + D1, giao diện thuần dựng bằng `h()`, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-07-xem-nhu-vai-khac-design.md`; quyết định: `docs/adr/ADR-0180-toan-quyen-xem-nhu-vai-khac.md` (accepted 2026-11-07, ADR thắng đặc tả khi lệch).

## Global Constraints
- Chữ giao diện tiếng Việt CÓ DẤU, tra `docs/BANG-THAM-CHIEU.md`; **tên mục chọn vai và thanh báo chưa có trong bảng → đưa chủ 2–3 tên chọn, không tự đặt** (Task 6). Gọi hệ thống là «Nền tảng».
- Danh sách chọn = `PERMISSION_CODES` trừ `SUPER_ADMIN` (10 mã). Một mã mỗi lần. Hết hạn **60 phút không thao tác** (`HAN_XEM_NHU_VAI_PHUT = 60`).
- Chỉ người THẬT giữ `SUPER_ADMIN` bật được. Route bật/thoát và cổng bảo trì xét quyền THẬT.
- Migration: chỉ thêm tệp mới; số = lớn nhất trong `migrations/` của main lúc gộp + 1 (nhánh này hiện thấy `0144`; kiểm `git ls-tree --name-only <nhánh> migrations/` mọi nhánh chưa gộp); bảng/cột mới → `docs/data-dictionary.json` + `npm run dict`.
- Nhật ký không ghi SĐT/email/MST; chỉ ghi mã vai. Module `auth`, `staff`, `feedback` là module «nghiêm»: SQL qua `defineSql`, câu tĩnh. Giao diện không `innerHTML`.
- Mọi bước chạy `npm run typecheck` (không phủ `*.test.ts`) và `npm test` xanh trước khi commit cuối; commit tiếng Việt nhỏ.

## Review Focus
1. Phiên Toàn quyền nhiều máy: đóng vai ở máy A, máy B vẫn Toàn quyền.
2. Đóng vai khi chế độ bảo trì đang bật: vẫn vào được, vẫn thoát được.
3. Đóng vai `DRIVER_PARTNER`/`PARTNER`/`DRIVER` khi chủ không có hồ sơ tương ứng: ghi bị từ chối bằng câu tiếng Việt, không 500.
4. Quá 60 phút không thao tác: request kế tiếp đã là Toàn quyền, dấu vai không còn.
5. Gửi `role: "SUPER_ADMIN"` hoặc mã lạ vào route bật: 400, không đổi phiên.

---

### Task 1: Luật thuần `src/shared/xem-nhu-vai.ts`

**Files:** Create `src/shared/xem-nhu-vai.ts`, `src/shared/xem-nhu-vai.test.ts`.

**Interfaces — Produces:**
- `export const HAN_XEM_NHU_VAI_PHUT = 60`
- `export const VAI_CHON_DUOC: readonly PermissionCode[]` (= `PERMISSION_CODES` bỏ `SUPER_ADMIN`)
- `export function laVaiChonDuoc(x: unknown): x is PermissionCode`
- `export function daHetHan(lastSeenIso: string, nowMs: number): boolean` (true khi `nowMs - Date.parse(lastSeenIso) > 60*60*1000`)
- `export function quyenHieuLuc(real: readonly PermissionCode[], acting: PermissionCode | null): PermissionCode[]` (acting null → `[...real]`; ngược lại `[acting]`)

- [ ] **Step 1: Viết test đỏ.** Các bài: `VAI_CHON_DUOC` có đúng 10 mã và không chứa `SUPER_ADMIN`; `laVaiChonDuoc("SUPER_ADMIN") === false`, `laVaiChonDuoc("SALES") === true`, `laVaiChonDuoc(5) === false`; `daHetHan` đúng ở 59'59" (false) và 60'01" (true); `quyenHieuLuc(["SUPER_ADMIN"], "ACCOUNTING")` = `["ACCOUNTING"]`; `quyenHieuLuc(["SUPER_ADMIN","ADMIN"], null)` giữ nguyên.
- [ ] **Step 2: Chạy** `node --test src/shared/xem-nhu-vai.test.ts` → đỏ (chưa có tệp).
- [ ] **Step 3: Viết tệp theo Interfaces.** Tệp thuần, không import module.
- [ ] **Step 4: Chạy lại** → xanh. **Step 5: Commit** «Luật thuần cho xem như vai khác (ADR-0180)».

### Task 2: Migration và từ điển dữ liệu

**Files:** Create `migrations/<số>_xem_nhu_vai.sql`; modify `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` (sinh), tệp bài migration liên quan nếu `src/migrations-*.test.ts` liệt kê tệp.

- [ ] **Step 1: Test đỏ** (cạnh bài migration hiện có): sau khi áp mọi migration trên D1 thử, `PRAGMA table_info(aut_session)` có `acting_role` (TEXT, nullable, CHECK nằm trong 10 mã quyền), `PRAGMA table_info(audit_log)` có `acting_role` (TEXT, nullable). Bài từ điển (`npm run dict` rồi `git diff --exit-code docs/DATA-DICTIONARY.md`) đỏ khi thiếu mô tả.
- [ ] **Step 2: Viết migration** `ALTER TABLE aut_session ADD COLUMN acting_role TEXT CHECK (acting_role IS NULL OR acting_role IN (<10 mã>))` và `ALTER TABLE audit_log ADD COLUMN acting_role TEXT`. Cột kiểm toán chung theo luật `architecture.test.ts` nếu bài đòi (bảng đã có thì không thêm).
- [ ] **Step 3: Sửa `data-dictionary.json`**, chạy `npm run dict`. **Step 4:** `npm run db:migrate:local` rồi chạy bài → xanh. **Step 5: Commit.**

### Task 3: Phiên mang vai; `currentStaff` tính quyền hiệu lực

**Files:** Modify `src/modules/auth/repository.ts` (`SS_FIND_LIVE`, `SessionRow`, thêm `setActingRoleStatement(db, sessionId, role: PermissionCode | null, nowIso): D1PreparedStatement`), `src/modules/auth/index.ts` (`currentStaff`), `src/shared/contracts.ts` (`StaffProfile`), `src/shared/router.ts` (truyền quyền thật cho cổng bảo trì); Test `src/modules/auth/xem-nhu-vai-phien.test.ts`.

**Interfaces — Consumes:** Task 1. **Produces:** `StaffProfile.actingRole?: PermissionCode` và `StaffProfile.realPermissions?: PermissionCode[]` (chỉ có khi đang đóng vai); `currentStaff` trả `staff.permissions` đã là bộ hiệu lực.

- [ ] **Step 1: Test đỏ** (khung thử gieo phiên Toàn quyền): (a) phiên có `acting_role='ACCOUNTING'`, `last_seen_at` mới → `staff.permissions` = `["ACCOUNTING"]`, `actingRole='ACCOUNTING'`, `realPermissions` chứa `SUPER_ADMIN`; (b) `last_seen_at` cũ hơn 60' → `permissions` là bộ thật và `actingRole` rỗng (Review Focus 4); (c) phiên khác cùng tài khoản không có vai → vẫn Toàn quyền (Review Focus 1); (d) tài khoản KHÔNG giữ `SUPER_ADMIN` mà dòng phiên có `acting_role` (dữ liệu hỏng) → bỏ qua cột, trả bộ thật.
- [ ] **Step 2: Chạy** → đỏ.
- [ ] **Step 3: Sửa `SS_FIND_LIVE` và `SessionRow` để đọc `acting_role`**; trong `currentStaff` gọi `daHetHan` và `quyenHieuLuc` đúng MỘT chỗ sau khi có `row` và `staff`; không đọc thêm chặng D1. Thêm `setActingRoleStatement` (câu tĩnh `defineSql`).
- [ ] **Step 4: Router:** `injected.maintenanceBlock(env, staffThat, baoTri)` với `staffThat = { ...staff, permissions: staff.realPermissions ?? staff.permissions }` (bảo trì xét quyền THẬT). Bài đỏ trước: bảo trì bật + đóng vai Bán hàng → request vẫn qua cổng bảo trì.
- [ ] **Step 5: Chạy** các bài auth + `npm run typecheck` → xanh. **Commit.**

### Task 4: Route bật/thoát đóng vai

**Files:** Modify `src/modules/auth/index.ts` (thêm route cạnh `GET /api/auth/me`), `src/shared/bang-tham-chieu*` nếu có câu báo mới; Test `src/modules/auth/xem-nhu-vai-route.test.ts`.

**Interfaces — Produces:** `POST /api/auth/xem-nhu-vai` thân `{ role: PermissionCode }` → 200 `MeResponse`; `DELETE /api/auth/xem-nhu-vai` → 200 `MeResponse`. Cả hai `access: "staff"`, xét quyền THẬT (`staff.realPermissions ?? staff.permissions` phải chứa `SUPER_ADMIN`); sai → 403 «Chỉ người phụ trách hệ thống mới dùng được chức năng này.» (không viết «Toàn quyền» ra, ADR-0044); `role` không thuộc `VAI_CHON_DUOC` → 400.

- [ ] **Step 1: Test đỏ:** Bán hàng gọi POST → 403, `acting_role` vẫn NULL; Toàn quyền gọi POST `role:"SUPER_ADMIN"` và `role:"XYZ"` → 400 (Review Focus 5); POST `role:"ACCOUNTING"` → 200 và dòng phiên đúng; trong lúc đóng Bán hàng thì DELETE vẫn 200 (đi qua cổng dù quyền hiệu lực không có `SUPER_ADMIN`); POST thiếu `Origin` cùng site → bị chặn như mọi POST; khi bảo trì bật vẫn gọi được cả hai.
- [ ] **Step 2: Chạy** → đỏ. **Step 3: Cài route** dùng `setActingRoleStatement`; ghi nhật ký `audit_log` cho việc bật/thoát (hành động mới `acting_role_set` / `acting_role_cleared`, thêm vào `isAuditAction` và bảng từ vựng — mã hành động tuân tệp nhật ký hiện có).
- [ ] **Step 4: Chạy** → xanh; `GET /api/auth/me` trả thêm `actingRole` (cập nhật `MeResponse` trong `contracts.ts`). **Commit.**

### Task 5: Nhật ký mang dấu vai

**Files:** Modify `src/modules/audit/repository.ts` (`AuditInput`, `insertStatement`); Test `src/modules/audit/acting-role.test.ts`.

- [ ] **Step 1: Quyết cách hàm ghi biết vai (ghi kết luận vào ADR-0180 phần Ghi chú thi công, báo chủ).** `wrangler.jsonc` không bật `nodejs_compat` nên không dùng `AsyncLocalStorage`. Ứng viên khuyến nghị: `insertStatement` điền `acting_role` bằng truy vấn con theo `staff_id`: `(SELECT acting_role FROM aut_session WHERE staff_id = ? AND ended_at IS NULL AND acting_role IS NOT NULL AND last_seen_at > ? ORDER BY last_seen_at DESC LIMIT 1)` (mốc `?` = bây giờ − 60 phút). **Hạn chế đã biết:** Toàn quyền nhiều máy, máy B không đóng vai nhưng có thể bị gắn dấu khi máy A đang đóng trong 60 phút (an toàn hướng «gắn thừa», không bao giờ thiếu). Ứng viên thay thế: router tiêm `actingRole` vào `Ctx` và bắt buộc mọi handler truyền — bị loại vì ~44 tệp gọi ghi nhật ký.
- [ ] **Step 2: Test đỏ:** (a) ghi một `insertStatement` cho staff có phiên đang đóng `SALES` → dòng nhật ký `acting_role='SALES'`; (b) staff không đóng vai → `acting_role IS NULL`; (c) phiên quá 60' → NULL; (d) bài khoá: `grep` mọi `INSERT INTO audit_log` ngoài `insertStatement` — danh sách phải rỗng (không đường ghi nhật ký nào bỏ qua hàm).
- [ ] **Step 3: Cài** theo Step 1; giữ `onlyIf` đang có. **Step 4: Chạy** `node --test src/modules/audit` + bài (d) → xanh. **Commit.**

### Task 6: Giao diện: mục chọn vai và thanh báo

**Files:** Modify `web/account.ts` (bảng điều khiển cá nhân; xác nhận lại bằng grep nếu tên tệp khác), `web/shell.ts` (thanh báo trên mọi trang có khung), `web/api.ts`, `public/app.css` (token), `docs/BANG-THAM-CHIEU.md` (qua nguồn `src/shared/bang-tham-chieu*.ts`, ADR-0167); Test `src/xem-nhu-vai-web.test.ts` (khuôn các bài `*-web.test.ts` hiện có).

- [ ] **Step 1: Hỏi chủ chọn tên** (2–3 phương án mỗi cái): tên mục «Xem như vai khác», thanh «Đang xem như vai X», nút «Thoát». Gom một lần hỏi; đợi trả lời mới viết chữ.
- [ ] **Step 2: Test đỏ:** mục chọn chỉ dựng khi `staff.realPermissions ?? staff.permissions` chứa `SUPER_ADMIN`; danh sách có đúng `VAI_CHON_DUOC` và nhãn lấy từ `PERMISSION_LABELS` (không có mã thô); thanh báo dựng khi `me.actingRole` có và có nút Thoát; menu/tab theo `staff.permissions` hiệu lực (có sẵn).
- [ ] **Step 3: Cài.** Dùng `h()`, token CSS (không hex/px thô), ô gõ 16px; thanh báo cố định, `role="status"`. **Step 4:** `npm run build:web`, test xanh. **Step 5: Commit.**

### Task 7: Rà các nơi đọc quyền ngoài bộ hiệu lực

**Files:** rà bằng `grep -rn "stf_permission\|v_stf_toan_quyen\|\"SUPER_ADMIN\"" src --include='*.ts'` (bỏ `*.test.ts`); ví dụ đã biết `src/modules/feedback/repository.ts` (view theo `staff.id`); Test `src/xem-nhu-vai-khong-lo-toan-quyen.test.ts`.

- [ ] **Step 1:** Lập bảng từng chỗ trong ADR-0180 phần Ghi chú thi công: «theo bộ hiệu lực» hay «theo quyền thật» và vì sao (mặc định: hiệu lực; riêng bật/thoát và bảo trì: thật).
- [ ] **Step 2: Test đỏ:** với phiên đang đóng `SALES`, quét **toàn bộ route** của bản đồ route (`routes` của mọi module) và mọi thao tác trong `MATRIX`: kết quả cho phép/từ chối giống hệt một tài khoản chỉ giữ `SALES` (so với nhân viên thử thật cùng quyền). Thêm ca: Góp ý/kỹ thuật chỉ Toàn quyền trả 403 lúc đóng vai (ADR-0038).
- [ ] **Step 3: Sửa từng chỗ lệch** (kể cả `feedback`); mỗi chỗ một test. **Step 4: Chạy** → xanh. **Commit.**

### Task 8: Ma trận, e2e, hàng rào, tài liệu

**Files:** Create `tests/e2e/xem-nhu-vai.mjs` (đăng nhập qua `login()`/`session()` của `tests/e2e/lib.mjs`); modify `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md` §7–§8, `docs/CHANGE-GUIDE.md` (công thức mới), `docs/HANDOFF-N1.md` (mục chờ phát hành), `src/permissions.test.ts`-họ hàng nếu bài ADR-0014 đọc `staff.permissions`.

- [ ] **Step 1: Test đỏ** ma trận 10 vai chọn được: mỗi vai, `GET /api/auth/me` trả đúng `permissions` của mã đó và không có `SUPER_ADMIN`; vai ngoài danh sách bị 400. Bài ADR-0014 («cột Toàn quyền = `any`») giữ nguyên và đọc bản đồ, không đọc phiên.
- [ ] **Step 2: e2e:** Toàn quyền bật `ACCOUNTING` → thao tác Kế toán qua, thao tác Bán hàng 403 → `DELETE` → Toàn quyền lại; ghi nhật ký có dấu.
- [ ] **Step 3: Quan sát chặn thật** (P16): bỏ điều kiện «quyền thật» ở route bật → bài «Bán hàng gọi POST → 403» phải đỏ; hoàn nguyên. Ghi dòng vào `docs/SO-HANG-RAO.md` (chặn gì, cơ chế, ngày quan sát).
- [ ] **Step 4: Cập nhật tài liệu mô tả** cùng commit. **Step 5:** `npm run typecheck`, `npm test`, `npm run test:e2e -- xem-nhu-vai` (cần mạng) → xanh. **Commit.**

### Task 9: Kiểm độc lập (không phải người thi công)

- [ ] **Step 1:** Giao `nguoi-kiem-doc-lap` đọc mã thật, chạy lại `npm test`, `npm run typecheck`, e2e; riêng soi các điểm vòng trước ghi «chưa soi sâu»: trigger `0135`, `0144` với vai đối tác/tài xế, ADR-0018/0090/0176, và bảng từng chỗ của Task 7.
- [ ] **Step 2:** Chỉ báo «đạt» khi báo cáo đó đạt. Phát hiện → sửa ở phiên thi công rồi kiểm lại. Việc gộp vào `main` và triển khai theo CLAUDE.md §8 do chủ chạy.

## Self-review
- **Phủ đặc tả:** cột phiên (T2–T3), quyền hiệu lực một chỗ (T3), hết 60' (T1, T3), bật/thoát qua mọi cổng và bảo trì (T3–T4), danh sách 10 mã (T1), nhật ký một hàm (T5), thanh báo và mục chọn (T6), rà nơi đọc quyền (T7), tiêu chí 1–6 và hàng rào (T4, T7, T8), kiểm độc lập (T9).
- **Điều chưa quyết, đã đánh dấu:** cách nhật ký biết vai (T5 Step 1, hạn chế đa máy), số migration, tên chữ (T6 Step 1).
