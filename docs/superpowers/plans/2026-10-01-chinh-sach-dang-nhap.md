# Chính sách đăng nhập — Toàn quyền chọn quyền nào "một máy" / "nhiều máy" (ADR-0085) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toàn quyền đặt cho từng quyền app (9 mã, trừ `SUPER_ADMIN`) là "Một máy" hay "Nhiều máy" ở mục "Chính sách đăng nhập" trên trang `/sessions`; máy chủ dùng chính sách đó mỗi lần cấp phiên, khi đổi quyền/vai của một người, và khi lưu chính sách (siết theo tập, đăng xuất máy thừa ngay, giữ phiên mới nhất).

**Architecture:** Bảng `aut_session_policy` (module `auth`, mỗi quyền tối đa một dòng hiện hành) + hai view công bố mới của `staff` (`v_stf_quyen_mo`, `v_stf_nhieu_may_co_dinh`) để câu SQL của `auth` biết "tài khoản này được nhiều máy" mà không đọc thẳng bảng `stf_*`/`pty_*`. MỘT mẩu điều kiện SQL "được nhiều máy" sinh ba câu (siết theo tập, đánh dấu một máy, đếm xem trước) — nguồn chính sách là bảng (khi lưu) hoặc tham số JSON (khi xem trước); hàm thuần `isSingleDevice(quyền, vai, tậpNhiềuMáy)` là bản TypeScript của cùng điều kiện, có bài đối chiếu. Lưu chính sách là MỘT lô all-or-nothing (câu thua tự gây lỗi ràng buộc → cả lô lùi → 409). Đổi quyền/vai: câu phiên chạy ở lô thứ hai chỉ khi lô có câu chốt "quản trị viên cuối" đã thắng — thay điều kiện SQL cài cứng `NOT EXISTS v_stf_toan_quyen`.

**Tech Stack:** TypeScript, Cloudflare Workers + D1 (SQLite), `node --test` trên `node:sqlite`, khung thử cả ứng dụng `tests/audit/harness.mjs`, e2e `tests/e2e`, giao diện thuần dựng bằng `h()`, kịch bản Chrome CDP.

**Spec:** `docs/superpowers/specs/2026-10-01-chinh-sach-dang-nhap-dac-ta.md` (ĐÃ DUYỆT) + `docs/adr/ADR-0085-chinh-sach-dang-nhap.md` (accepted, sửa ADR-0075 điều 3). Đọc cả hai trước khi làm; đọc kèm nhật ký Phần A `docs/superpowers/plans/2026-10-01-dang-nhap-thi-cong-nhat-ky.md` (bẫy khung thử, thứ tự lô).

**Cách thi công:** subagent-driven (chủ đã chọn cho dự án này) — mỗi task một phiên phụ thi công + một phiên phụ kiểm; cuối cùng `nguoi-kiem-doc-lap` (việc lớn: dữ liệu + quyền + hàng rào — CLAUDE.md §3). Ghi tiến độ, ruling, số liệu vào sổ `docs/superpowers/plans/2026-10-01-chinh-sach-dang-nhap-thi-cong-nhat-ky.md` (tạo ở Task 0).

**Thứ tự với Phần B (ADR-0074):** tuần tự — việc này đổi chữ ký `isSingleDevice` / `issueLoginSession` mà Phần B dùng (đặc tả §8). Không chạy song song.

## Global Constraints

- Mọi chữ hiện cho người dùng, câu lỗi, tài liệu, commit: **tiếng Việt có dấu**; không lộ mã thô (`multi`, `PARTNER`, `mat-mien`…) ra giao diện.
- Quyền đặt được: đúng 9 mã `SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, INTERN, DRIVER, DRIVER_PARTNER, HR` (không `SUPER_ADMIN`). Quyền chưa từng đặt = **Một máy** (bảng trống = hành vi bản 1.58).
- "Được nhiều máy" = giữ `SUPER_ADMIN` **hoặc** vai `IT` còn hiệu lực (`location_id IS NULL AND valid_to_date IS NULL` — cùng định nghĩa `OPEN_ROLE_CODES_FOR`) **hoặc** ≥ 1 quyền hiệu lực (`stf_permission.valid_to_at IS NULL`) mà chính sách hiện hành đặt "Nhiều máy". Toàn quyền và vai IT khoá cứng.
- Chính sách đọc từ D1 mỗi lần cấp phiên (một câu, ≤ 9 dòng); **không** lưu đệm trong bộ nhớ Worker.
- Mỗi quyền một dòng có kiểu rõ — không JSON; không xoá cứng (`valid_from_at`/`valid_to_at`); chỉ module `auth` ghi `aut_session_policy`; chỉ `thongbao` ghi `ntf_push_sub`.
- Mọi SQL qua `defineSql(module, tên, sql)`, câu tĩnh; đọc xuyên module chỉ qua view `v_<tiền tố>_*`. Không chuỗi `pty_party_role` nào trong `src/`/`web/` (R-N1-12) — vai IT chỉ đọc qua view.
- Câu ghi KHÔNG bắt đầu bằng `WITH` (khung thử coi câu bắt đầu bằng `WITH` là câu đọc) — dùng truy vấn con viết thẳng.
- Siết theo tập: số câu trong lô **không phụ thuộc số người** (≤ 2 câu mỗi quyền đổi + 3 câu siết + 1 nhật ký); máy bị kết thúc → `ctx.dongBangTin` **một lần** cho cả danh sách.
- Nới (một máy → nhiều máy): **không ghi gì** lên `aut_session`.
- Nhật ký `session_policy_changed` im lặng (`SILENT_AUDIT_ACTIONS`); không tên, SĐT, IP. `console.*` không mã phiên, IP, UA, SĐT.
- Ô quyền mới `auth.session.policy` đủ **10 cột** theo thứ tự `SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR`, chỉ `SUPER_ADMIN`; route hỏi `can()` trong handler; giao diện hỏi đúng ô này (không dùng chung `auth.session.viewAll`).
- Giao diện: không `innerHTML` (dựng bằng `h()`), giá trị CSS vào token, ô gõ 16px, xác nhận bằng hộp trong trang (không `confirm()`).
- **Không nới luật cho môi trường thử** (e2e, khung thử): e2e khôi phục chính sách trong `finally`; khung thử tính `single` bằng đúng chính sách thật.
- Migration: chỉ thêm tệp; số = lớn nhất **mọi nhánh** + 1 (lúc viết kế hoạch: **0067**); bài kiểm tìm tệp theo **đuôi** `_aut_session_policy.sql`.
- Không `git push`, không merge `main`, không deploy (CLAUDE.md §8). Commit nhỏ, thông điệp tiếng Việt (tiêu đề nói việc, thân nói vì sao), đuôi `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Lệnh git tách riêng từng lệnh (móc từ chối lệnh git ghép).

## Review Focus

1. **Câu chốt "quản trị viên cuối" thua mà máy vẫn bị đăng xuất** (chính sách "ADMIN = Nhiều máy", gỡ ADMIN của quản trị viên cuối) — người dùng mong: 409, không phiên nào đổi. Kiểm tra phải đi qua câu chốt TRONG lô (không phải lời kiểm trước lô `checkAccountChange`, vốn chặn sớm và làm bài rỗng nghĩa). Bài: Task 4 bước "chạy đua câu chốt" (ngưng quản trị viên thứ hai giữa lời kiểm trước và lô) + đột biến.
2. **Lưu chính sách chạy đua** (hai Toàn quyền lưu cùng lúc từ cùng một bản; một lần lưu nhiều quyền mà chỉ một quyền thua) — mong: một 200, một 409, bên thua không ghi dòng chính sách nào và không đăng xuất máy nào. Bài: Task 3 (SQLite thật, lô lùi) + Task 6 (route, `Promise.all`).
3. **Đăng nhập chạy đua với lần lưu "Một máy"** — phiên mới có thể mang `single = 0` theo chính sách cũ; mong: bất biến cảnh báo `R-AUT-SESSION-3` thấy được, lần đăng nhập sau tự lành; e2e `--strict` không đỏ vì khe đã biết. Bài: Task 7 (mức `warn`, không phải `warn-unless-strict`).
4. **Đối tác ~1000 tài khoản chuyển về "Một máy"** — mong: một lô, số câu cố định, xong trong vài giây, mỗi tài khoản còn đúng phiên mới nhất, đúng một lời gọi đóng Bảng tin. Bài: Task 3 (5 vs 50 tài khoản cùng số câu), Task 6 (route 50 tài khoản, một lời gọi `dongBangTin`), Task 9 (D1 local, 1000 tài khoản, đo giờ).
5. **Máy được giữ lại mất thông báo / đăng ký `session_id` NULL bị tắt nhầm** khi siết theo chính sách — mong: chỉ đăng ký của phiên vừa kết thúc bị tắt (lý do `mat-mien`), máy giữ lại và đăng ký chưa gắn phiên còn bật; nhánh mới của gốc lắp ráp không rơi vào nhánh cũ (khoá phân biệt riêng). Bài: Task 5 (SQLite thật, ba dòng `ntf_push_sub`; bài dây thật qua gốc lắp ráp).
6. (thêm) **Chữ Trợ giúp vượt trần đọc A4** — Quản trị đang đúng 3150 chữ (21 phút), Phần chung 1346 chữ (9 phút, còn 4 chữ). Bài: Task 8 đo trước khi sửa, chữ đổi được cân từng chữ.

---

## Bản đồ tệp

| Tệp | Việc |
|---|---|
| `migrations/0067_aut_session_policy.sql` (tạo) | Bảng `aut_session_policy` + chỉ mục duy nhất có điều kiện; view `v_stf_quyen_mo`, `v_stf_nhieu_may_co_dinh` |
| `src/migrations-aut-session-policy.test.ts` (tạo) | Kiểm migration trên SQLite thật |
| `src/shared/chinh-sach-dang-nhap.ts` + `.test.ts` (tạo) | Luật thuần dùng chung server ↔ giao diện: 9 mã đặt được, kiểm thân gửi lên, tính thay đổi, tập nhiều máy sau đổi, câu cảnh báo Đối tác |
| `src/shared/contracts.ts` (sửa) | DTO chính sách |
| `src/shared/permissions.ts`, `permissions.test.ts` (sửa) | Ô `auth.session.policy` |
| `src/shared/audit-actions.ts` (sửa), `src/modules/audit/an-toan-quyen.test.ts` (sửa tên bài 7 → 8) | `session_policy_changed` (im lặng) |
| `src/shared/tro-ly-cau-truc-ten.ts` (sửa) + `tro-ly-cau-truc.ts` (sinh lại) | Tên lời thường của ô mới |
| `src/modules/auth/session-ledger.ts`, `session-ledger.test.ts` (sửa) | `isSingleDevice(quyền, vai, tậpNhiềuMáy)` |
| `src/modules/auth/repository.ts`, `session-repo.test.ts` (sửa) | SQL chính sách + siết/đánh dấu/đếm theo tập; bỏ `KHONG_TOAN_QUYEN`, `SS_MARK_MULTI` |
| `src/modules/auth/chinh-sach-repo.test.ts` (tạo) | SQL chính sách + siết theo tập trên SQLite thật |
| `src/modules/auth/index.ts` (sửa) | `issueLoginSession` đọc chính sách; `exemptionChangeStatements` nhận `nhieuMay`; hàm công bố chính sách |
| `src/modules/accounts/index.ts` (sửa) | Route đổi quyền: câu phiên ở lô thứ hai; ba route chính sách |
| `src/modules/accounts/mat-mien-route.test.ts` (sửa) | Viết lại theo chính sách; bài chạy đua câu chốt |
| `src/modules/accounts/chinh-sach-phien-route.test.ts` (tạo) | Bài route chính sách (403/400/409, đăng nhập thật, 50 tài khoản) |
| `tests/audit/harness.mjs` (sửa) | `token()` tính `single` theo chính sách thật |
| `src/shared/router.ts`, `src/index.ts`, `src/modules/thongbao/repository.ts`, `index.ts` (sửa) | Dạng `dongBangTin` "danh sách phiên, chỉ-phiên" không `staffId` |
| `src/modules/thongbao/may-theo-phien.test.ts` (sửa), `src/tat-thong-bao-dung-may.test.ts` (sửa) | Bài SQL + hàng rào (NỚI có chủ đích, chủ đã duyệt ADR-0085 Q3) |
| `src/route-access.test.ts`, `src/route-write-guard.test.ts` (sửa) | +3 route; ô mới vào `ADMIN_OPS` |
| `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` (sửa) | `R-AUT-SESSION-3` (cảnh báo) |
| `web/chinh-sach-dang-nhap-ui.ts` (tạo), `web/sessions.ts`, `public/sessions.html`, `web/account.ts` (sửa) | Mục "Chính sách đăng nhập"; câu một máy ở trang Tôi |
| `docs/evidence/2026-10-01-chinh-sach-dang-nhap/kich-ban/chinh-sach.mjs` (tạo) | Kịch bản Chrome |
| `src/shared/huong-dan-chung.ts`, `huong-dan-quan-tri.ts`, `huong-dan-nhan-su.ts` (sửa) | Trợ giúp (giữ trần A4) |
| `src/shared/changelog.ts`, `src/shared/app-info.test.ts` (sửa) | Mục nhật ký phiên bản 1.60 |
| `tests/e2e/chinh-sach-phien.mjs` (tạo), `tests/e2e/run.mjs` (sửa) | e2e chính sách + đo 1000 tài khoản |
| `docs/data-dictionary.json` (+ `npm run dict`), `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md` | Tài liệu (`CLAUDE.md`, `web/CLAUDE.md` KHÔNG sửa — chỉ đề xuất dòng ở Task 10, N9) |

---

### Task 0: Đồng bộ nhánh, chốt số, chụp hiện trạng

**Files:** tạo `docs/superpowers/plans/2026-10-01-chinh-sach-dang-nhap-thi-cong-nhat-ky.md`. Không sửa mã.

- [ ] **Step 1: Gộp `main` mới nhất** (lệnh riêng): `git fetch` rồi `git merge main`. Xung đột → giải, ghi vào sổ.
- [ ] **Step 2: Chốt số migration.** Chạy:

```bash
git log --all -m --name-only --format= -- 'migrations/006*' 'migrations/007*'
```

  Lấy số lớn nhất (lúc viết kế hoạch: `0066_pty_person_gender.sql` — ADR-0084 trợ lý Mai) + 1. Kế hoạch viết `0067`; nếu số đã bị dùng, đổi tên tệp ở Task 1 và mọi chỗ ghi số (đầu tệp SQL, `data-dictionary.json`, `SYSTEM-DESIGN.md`, `SO-HANG-RAO.md`) — bài kiểm tìm theo đuôi nên không phải sửa.
- [ ] **Step 3: Chốt số bản.** `grep -n 'version: "' src/shared/changelog.ts | head -3` — lúc viết kế hoạch mục đầu là `1.59` ⇒ bản này **1.60**. Ghi vào sổ "PHẢI KIỂM LẠI LÚC GỘP".
- [ ] **Step 4: Chụp chỗ đụng** (dán vào sổ):

```bash
grep -n "isSingleDevice\|exemptionChangeStatements\|requireToanQuyen\|KHONG_TOAN_QUYEN\|markMultiStatement" -r src tests/audit
```

  Hiện trạng đọc lúc viết kế hoạch: `auth/repository.ts:124` `KHONG_TOAN_QUYEN`, `:125-128` `SS_END_ALL_BUT_NEWEST`/`SS_MARK_SINGLE`, `:132-134` `SS_MARK_MULTI`; `auth/index.ts:77` (`issueLoginSession`), `:141-158` (`exemptionChangeStatements`); `accounts/index.ts:542` (route đổi quyền), `:602` (route đổi vai); `tests/audit/harness.mjs:136`.
- [ ] **Step 5:** `npm run typecheck` (0 lỗi) và `npm test` xanh trước khi đụng gì; ghi số bài vào sổ.
- [ ] **Step 6: Commit** sổ: `git add docs/superpowers/plans/2026-10-01-chinh-sach-dang-nhap-thi-cong-nhat-ky.md` rồi `git commit -m "Sổ thi công chính sách đăng nhập (ADR-0085): hiện trạng, số migration, số bản"` (thân: vì sao chốt số trước).

---

### Task 1: Migration bảng chính sách + hai view của `staff`

**Files:**
- Create: `migrations/0067_aut_session_policy.sql`
- Create: `src/migrations-aut-session-policy.test.ts`
- Modify: `docs/data-dictionary.json` (+ `npm run dict` → `docs/DATA-DICTIONARY.md`)

**Interfaces:**
- Produces: bảng `aut_session_policy(id, permission_code, multi, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by)`; chỉ mục `aut_session_policy_one_current (permission_code) WHERE valid_to_at IS NULL`; view `v_stf_quyen_mo(staff_id, permission_code)`; view `v_stf_nhieu_may_co_dinh(staff_id)`.

- [ ] **Step 1: Viết test đỏ** — `src/migrations-aut-session-policy.test.ts`:

```ts
// Kiểm migration *_aut_session_policy.sql (ADR-0085 Q1): chính sách đăng nhập theo quyền app + hai view công bố của staff mà SQL của auth đọc.
// Tệp tìm theo ĐUÔI tên (số migration đổi được lúc gộp).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_aut_session_policy.sql"));
const all = () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
};
const AT = "2026-10-02T01:00:00.000Z";
const ins = (db: DatabaseSync, id: string, code: string | null, multi: number, to: string | null = null) =>
  db.prepare(
    "INSERT INTO aut_session_policy (id, permission_code, multi, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL)",
  ).run(id, code, multi, AT, to, AT, AT);
function nhanVien(db: DatabaseSync, id: string, perms: string[], roles: string[] = []) {
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-${id}', 'PERSON', 'Người ${id}', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('${id}', '', '09${id.padStart(8, "0")}', 'x', 'sales', 1, '${AT}', 'pty-${id}')`);
  for (const p of perms) db.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('${id}-${p}', '${id}', '${p}', '${AT}', '${AT}', '${AT}')`);
  for (const r of roles) db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-${id}-${r}', 'pty-${id}', '${r}', NULL, '2026-01-01', '${AT}', '${AT}')`);
}

test("(a) đúng một tệp *_aut_session_policy.sql", () => {
  assert.equal(MATCHES.length, 1, JSON.stringify(MATCHES));
});

test("(b) 9 mã đặt được nhận; SUPER_ADMIN, mã lạ, multi ngoài 0/1, permission_code NULL bị CSDL chặn", () => {
  const db = all();
  for (const [i, c] of ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "INTERN", "DRIVER", "DRIVER_PARTNER", "HR"].entries()) ins(db, `ok${i}`, c, i % 2);
  assert.throws(() => ins(db, "x1", "SUPER_ADMIN", 1), /CHECK/);
  assert.throws(() => ins(db, "x2", "BOSS", 1), /CHECK/);
  assert.throws(() => ins(db, "x3", "SALES", 2, "2026-10-03T00:00:00.000Z"), /CHECK/);
  assert.throws(() => ins(db, "x4", null, 1, "2026-10-03T00:00:00.000Z"), /NOT NULL/);
});

test("(c) mỗi quyền tối đa MỘT dòng hiện hành; dòng đã đóng không tính; valid_to_at không trước valid_from_at", () => {
  const db = all();
  ins(db, "p1", "SALES", 1);
  assert.throws(() => ins(db, "p2", "SALES", 0), /UNIQUE/);
  db.prepare("UPDATE aut_session_policy SET valid_to_at = ? WHERE id = 'p1'").run(AT);
  ins(db, "p2", "SALES", 0);
  assert.throws(() => ins(db, "p3", "HR", 0, "2026-01-01T00:00:00.000Z"), /CHECK/);
});

test("(d) v_stf_quyen_mo: chỉ quyền còn hiệu lực; v_stf_nhieu_may_co_dinh: Toàn quyền HOẶC vai IT đang mở (không gắn nơi, chưa đóng)", () => {
  const db = all();
  nhanVien(db, "1", ["SALES"]);
  nhanVien(db, "2", ["SUPER_ADMIN"]);
  nhanVien(db, "3", ["ADMIN"], ["IT"]);
  nhanVien(db, "4", ["ADMIN"], ["DIRECTOR"]);
  db.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, valid_to_at, created_at, updated_at) VALUES ('1-HR-cu', '1', 'HR', '${AT}', '${AT}', '${AT}', '${AT}')`);
  const mo = db.prepare("SELECT staff_id, permission_code FROM v_stf_quyen_mo WHERE staff_id = '1'").all().map((r) => ({ ...r }));
  assert.deepEqual(mo, [{ staff_id: "1", permission_code: "SALES" }], "quyền đã đóng không tính");
  const coDinh = db.prepare("SELECT staff_id FROM v_stf_nhieu_may_co_dinh ORDER BY staff_id").all().map((r) => r.staff_id);
  assert.deepEqual(coDinh, ["2", "3"]);
  db.exec("UPDATE pty_party_role SET valid_to_date = '2026-09-30' WHERE id = 'r-3-IT'");
  assert.deepEqual(db.prepare("SELECT staff_id FROM v_stf_nhieu_may_co_dinh ORDER BY staff_id").all().map((r) => r.staff_id), ["2"], "vai IT đã đóng không tính");
});
```

  Nếu `pty_party_role` đòi thêm cột NOT NULL ở bản hiện tại (`PRAGMA table_info(pty_party_role)`), bổ sung vào `nhanVien()`; trigger LC-3 có thể chặn vai — `IT`, `DIRECTOR` cùng nhóm nội bộ nên không xung đột.
- [ ] **Step 2:** `node --test src/migrations-aut-session-policy.test.ts` → FAIL (`(a)` 0 tệp; các bài sau lỗi "no such table").
- [ ] **Step 3: Viết migration** `migrations/0067_aut_session_policy.sql`:

```sql
-- Migration 0067 — ADR-0085 (accepted 2026-10-01): CHÍNH SÁCH ĐĂNG NHẬP theo quyền app. Mỗi quyền đặt được (9 mã, KHÔNG có SUPER_ADMIN — Toàn quyền và vai
-- IT luôn nhiều máy, khoá cứng) tối đa MỘT dòng hiện hành; multi = 1 là "Nhiều máy". Bảng trống = mọi quyền "Một máy" (hành vi bản 1.58).
-- Không xoá dòng: đổi chính sách = đóng dòng hiện hành (valid_to_at) rồi chèn dòng mới, cùng một lô. Chỉ module auth ghi bảng này.
CREATE TABLE aut_session_policy (
  id TEXT PRIMARY KEY,
  permission_code TEXT NOT NULL CHECK (permission_code IN ('SALES', 'ACCOUNTING', 'ADMIN', 'FIELD', 'PARTNER', 'INTERN', 'DRIVER', 'DRIVER_PARTNER', 'HR')),
  multi INTEGER NOT NULL CHECK (multi IN (0, 1)),
  valid_from_at TEXT NOT NULL,
  valid_to_at TEXT CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
-- Lưới khi hai Toàn quyền lưu cùng lúc: chỉ một dòng hiện hành mỗi quyền (câu chèn thứ hai vỡ UNIQUE → cả lô lùi → 409).
CREATE UNIQUE INDEX aut_session_policy_one_current ON aut_session_policy (permission_code) WHERE valid_to_at IS NULL;

-- View công bố của module staff (ADR-0002 điều 3) cho SQL "được nhiều máy" của auth (ADR-0085 Q1 điều 2). Chỉ khoá + mã, không tên, không SĐT.
-- (1) quyền app CÒN HIỆU LỰC của từng tài khoản (= quyền từ vai + chỉnh tay đã tính sẵn vào stf_permission).
CREATE VIEW v_stf_quyen_mo AS
  SELECT p.staff_id, p.permission_type_code AS permission_code
  FROM stf_permission p
  WHERE p.valid_to_at IS NULL;
-- (2) tài khoản LUÔN được nhiều máy, chính sách không đổi được: giữ Toàn quyền, hoặc vai IT đang mở. "Đang mở" = không gắn nơi và chưa đóng — CÙNG định nghĩa
-- với open_role_codes_for (parties) mà issueLoginSession dùng qua accountRoleCodesOf, để SQL và TypeScript (isSingleDevice) cho cùng kết quả.
-- Vai hồ sơ ở đây KHÔNG phải điều kiện cho phép thao tác: là lệch kế thừa có tên của ADR-0075 điều 3 (ADR-0085 Q1 điều 2), chỉ quyết số máy.
CREATE VIEW v_stf_nhieu_may_co_dinh AS
  SELECT p.staff_id FROM stf_permission p WHERE p.permission_type_code = 'SUPER_ADMIN' AND p.valid_to_at IS NULL
  UNION
  SELECT s.id FROM staff s JOIN pty_party_role r ON r.party_id = s.party_id
  WHERE r.role_type_code = 'IT' AND r.location_id IS NULL AND r.valid_to_date IS NULL;
```

- [ ] **Step 4:** Chạy lại test → PASS (4/4). Chạy `node --test src/architecture.test.ts` → ĐỎ ở bài sổ dữ liệu (bảng/view chưa có trong `data-dictionary.json`) — đúng mong đợi, Step 5 sửa.
- [ ] **Step 5: Từ điển dữ liệu.** Thêm vào `docs/data-dictionary.json`:
  - mảng `tables`: `{ "name": "aut_session_policy", "module": "auth", "kind": "table", "note": "chính sách đăng nhập (ADR-0085, migration 0067): mỗi quyền app đặt được (9 mã, không SUPER_ADMIN) tối đa một dòng hiện hành; multi = 1 là Nhiều máy; bảng trống = mọi quyền Một máy. Không xoá dòng — đổi = đóng dòng hiện hành (valid_to_at) + chèn dòng mới trong cùng lô; lưu có kiểm phiên bản (id dòng đang xem)" }` kèm cột theo khuôn các bảng `aut_*` sẵn có (xem cách `aut_session` khai cột trong tệp).
  - mảng `views`: `{ "name": "v_stf_quyen_mo", "module": "staff", "columns": ["staff_id", "permission_code"] }`, `{ "name": "v_stf_nhieu_may_co_dinh", "module": "staff", "columns": ["staff_id"] }`.
  - Chạy `npm run dict`.
- [ ] **Step 6:** `node --test src/architecture.test.ts src/migrations-aut-session-policy.test.ts src/migrations-aut-session.test.ts` → PASS; `npm test` xanh.
- [ ] **Step 7: Commit** — `git add migrations/0067_aut_session_policy.sql src/migrations-aut-session-policy.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md`, rồi `git commit` với tiêu đề "Migration chính sách đăng nhập aut_session_policy + hai view staff (ADR-0085)" và thân: "Toàn quyền cần đặt một máy/nhiều máy theo quyền app; SQL siết theo tập của auth phải đọc quyền và vai IT qua view công bố, không JOIN bảng stf_/pty_."

---

### Task 2: Luật thuần, DTO, ô quyền, hành động nhật ký

**Files:**
- Create: `src/shared/chinh-sach-dang-nhap.ts`, `src/shared/chinh-sach-dang-nhap.test.ts`
- Modify: `src/shared/contracts.ts` (sau `StaffSessionListResponse`, ~dòng 100)
- Modify: `src/modules/auth/session-ledger.ts:23-25`, `src/modules/auth/session-ledger.test.ts:17-23`
- Modify: `src/shared/permissions.ts:183-186`, `src/shared/permissions.test.ts` (bảng đầy đủ ~`:77-78`, `ADMIN_NONE_OPS` ~`:246`, mọi dòng ghim có `"auth.session.revoke": "none"`)
- Modify: `src/shared/audit-actions.ts` (~`:149` và `SILENT_AUDIT_ACTIONS` ~`:161-169`), `src/modules/audit/an-toan-quyen.test.ts:46` (tên bài "7" → "8")
- Modify: `src/shared/tro-ly-cau-truc-ten.ts:121` (+ chạy `node scripts/sinh-so-do-trang.mjs`)

**Interfaces:**
- Produces (`src/shared/chinh-sach-dang-nhap.ts`):
  - `QUYEN_DAT_DUOC: readonly ["SALES","ACCOUNTING","ADMIN","FIELD","PARTNER","INTERN","DRIVER","DRIVER_PARTNER","HR"]`, `type QuyenDatDuoc`, `isQuyenDatDuoc(v: unknown): v is QuyenDatDuoc`
  - `CANH_BAO_NHIEU_MAY_BEN_NGOAI: string`, `canCanhBaoBenNgoai(chon: ReadonlyMap<QuyenDatDuoc, boolean>): boolean`
  - `kiemThayDoiChinhSach(v: unknown): { ok: true; value: SessionPolicyChange[] } | { ok: false; message: string }`
  - `docTapNhieuMayThamSo(raw: string | null): { ok: true; value: QuyenDatDuoc[] } | { ok: false; message: string }`
  - `tapNhieuMaySau(rows: readonly { permissionCode: PermissionCode; multi: boolean }[], thayDoi: readonly SessionPolicyChange[]): QuyenDatDuoc[]`
  - `thayDoiChinhSach(rows: readonly SessionPolicyRowDto[], chon: ReadonlyMap<QuyenDatDuoc, boolean>): SessionPolicyChange[]`
  - `moTaThayDoiChinhSach(thayDoi: readonly SessionPolicyChange[], dem: { soPhien: number; soNguoi: number }): string`
- Produces (`contracts.ts`): `SessionPolicyRowDto { permissionCode: PermissionCode; label: string; multi: boolean; banId: string | null }`, `SessionPolicyResponse { rows: SessionPolicyRowDto[] }`, `SessionPolicyPreviewResponse { soPhien: number; soNguoi: number }`, `SessionPolicyChange { permissionCode: PermissionCode; multi: boolean; banDangXem: string | null }`, `SessionPolicySaveRequest { thayDoi: SessionPolicyChange[] }`, `SessionPolicySaveResponse { rows: SessionPolicyRowDto[]; soPhien: number; soNguoi: number }`.
- Produces (`session-ledger.ts`): `type TapNhieuMay = ReadonlySet<PermissionCode>`; `isSingleDevice(permissions, roles, nhieuMay: TapNhieuMay): boolean` (tham số thứ ba BẮT BUỘC — typecheck bắt mọi nơi gọi quên).
- Produces: ô `auth.session.policy`; hành động `session_policy_changed`.

- [ ] **Step 1: Test đỏ — luật thuần** `src/shared/chinh-sach-dang-nhap.test.ts`:

```ts
// Luật thuần của chính sách đăng nhập (ADR-0085; đặc tả §2, §4.2, §5) — dùng chung máy chủ và giao diện.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANH_BAO_NHIEU_MAY_BEN_NGOAI, QUYEN_DAT_DUOC, canCanhBaoBenNgoai, docTapNhieuMayThamSo, isQuyenDatDuoc, kiemThayDoiChinhSach, moTaThayDoiChinhSach,
  tapNhieuMaySau, thayDoiChinhSach, type QuyenDatDuoc,
} from "./chinh-sach-dang-nhap.ts";
import { PERMISSION_CODES } from "./permissions.ts";

test("9 mã đặt được = mọi mã quyền trừ SUPER_ADMIN, đúng thứ tự PERMISSION_CODES", () => {
  assert.deepEqual([...QUYEN_DAT_DUOC], PERMISSION_CODES.filter((c) => c !== "SUPER_ADMIN"));
  assert.equal(isQuyenDatDuoc("SUPER_ADMIN"), false);
  assert.equal(isQuyenDatDuoc("BOSS"), false);
  assert.equal(isQuyenDatDuoc("PARTNER"), true);
});

test("kiemThayDoiChinhSach: nhận danh sách hợp lệ; từ chối SUPER_ADMIN, mã lạ, trùng mã, rỗng, multi không phải boolean, banDangXem sai kiểu", () => {
  const ok = kiemThayDoiChinhSach([{ permissionCode: "SALES", multi: true, banDangXem: null }, { permissionCode: "HR", multi: false, banDangXem: "abc" }]);
  assert.deepEqual(ok, { ok: true, value: [{ permissionCode: "SALES", multi: true, banDangXem: null }, { permissionCode: "HR", multi: false, banDangXem: "abc" }] });
  const sa = kiemThayDoiChinhSach([{ permissionCode: "SUPER_ADMIN", multi: false, banDangXem: null }]);
  assert.equal(sa.ok, false);
  assert.match((sa as { message: string }).message, /Toàn quyền luôn được nhiều máy/);
  for (const bad of [
    undefined, [], "SALES", [{ permissionCode: "BOSS", multi: true, banDangXem: null }],
    [{ permissionCode: "SALES", multi: true, banDangXem: null }, { permissionCode: "SALES", multi: false, banDangXem: null }],
    [{ permissionCode: "SALES", multi: 1, banDangXem: null }], [{ permissionCode: "SALES", multi: true, banDangXem: 5 }],
    [{ permissionCode: "SALES", multi: true, banDangXem: "x".repeat(65) }], [{ permissionCode: "SALES", multi: true }],
  ]) assert.equal(kiemThayDoiChinhSach(bad).ok, false, JSON.stringify(bad));
});

test("docTapNhieuMayThamSo: chuỗi rỗng = không quyền nào; danh sách phẩy; SUPER_ADMIN / mã lạ → lỗi; thiếu tham số → lỗi", () => {
  assert.deepEqual(docTapNhieuMayThamSo(""), { ok: true, value: [] });
  assert.deepEqual(docTapNhieuMayThamSo("HR,SALES"), { ok: true, value: ["SALES", "HR"] });
  assert.equal(docTapNhieuMayThamSo("SUPER_ADMIN").ok, false);
  assert.equal(docTapNhieuMayThamSo("SALES,BOSS").ok, false);
  assert.equal(docTapNhieuMayThamSo(null).ok, false);
});

test("tapNhieuMaySau: chính sách hiện hành + thay đổi → tập nhiều máy mới", () => {
  const rows = [{ permissionCode: "SALES" as const, multi: true }, { permissionCode: "HR" as const, multi: false }];
  assert.deepEqual(tapNhieuMaySau(rows, [{ permissionCode: "SALES", multi: false, banDangXem: "a" }, { permissionCode: "PARTNER", multi: true, banDangXem: null }]), ["PARTNER"]);
  assert.deepEqual(tapNhieuMaySau(rows, []), ["SALES"]);
});

test("thayDoiChinhSach: chỉ gửi quyền có lựa chọn KHÁC bản đang xem, kèm id bản đang xem", () => {
  const rows = QUYEN_DAT_DUOC.map((c) => ({ permissionCode: c, label: c, multi: c === "SALES", banId: c === "SALES" ? "ban-sales" : null }));
  const chon = new Map<QuyenDatDuoc, boolean>(QUYEN_DAT_DUOC.map((c) => [c, c === "PARTNER"]));
  assert.deepEqual(thayDoiChinhSach(rows, chon), [
    { permissionCode: "SALES", multi: false, banDangXem: "ban-sales" },
    { permissionCode: "PARTNER", multi: true, banDangXem: null },
  ]);
});

test("cảnh báo bên ngoài: chỉ khi Đối tác hoặc Tài xế đối tác chọn Nhiều máy; chữ đúng đặc tả §5", () => {
  assert.equal(canCanhBaoBenNgoai(new Map([["PARTNER", true]])), true);
  assert.equal(canCanhBaoBenNgoai(new Map([["DRIVER_PARTNER", true]])), true);
  assert.equal(canCanhBaoBenNgoai(new Map([["PARTNER", false], ["SALES", true]])), false);
  assert.equal(
    CANH_BAO_NHIEU_MAY_BEN_NGOAI,
    "Nhiều máy: nếu ai đó biết PIN, họ đăng nhập song song mà chủ tài khoản không bị đẩy ra để nhận biết. Quyền Đối tác gồm cả lữ hành, HDV độc lập, lễ tân, taxi, cộng tác viên — không chọn riêng được từng loại.",
  );
});

test("moTaThayDoiChinhSach: nhãn quyền tiếng Việt + số máy/số người; không mã thô", () => {
  const s = moTaThayDoiChinhSach([{ permissionCode: "SALES", multi: true, banDangXem: null }, { permissionCode: "PARTNER", multi: false, banDangXem: "x" }], { soPhien: 3, soNguoi: 2 });
  assert.equal(s, "Bán hàng → Nhiều máy; Đối tác → Một máy; đăng xuất 3 máy của 2 người");
  assert.doesNotMatch(s, /SALES|PARTNER|multi/);
});
```

- [ ] **Step 2:** `node --test src/shared/chinh-sach-dang-nhap.test.ts` → FAIL (thiếu tệp).
- [ ] **Step 3: DTO** — thêm vào `src/shared/contracts.ts` ngay sau `StaffSessionListResponse`:

```ts
/** Chính sách đăng nhập (ADR-0085): một dòng mỗi quyền đặt được (9 mã, thứ tự QUYEN_DAT_DUOC). `banId` = id dòng hiện hành (null = chưa từng đặt = Một máy). */
export interface SessionPolicyRowDto { permissionCode: PermissionCode; label: string; multi: boolean; banId: string | null }
export interface SessionPolicyResponse { rows: SessionPolicyRowDto[] }
/** Xem trước: số phiên sẽ kết thúc và số người bị ảnh hưởng nếu tập "Nhiều máy" thành đúng tập đã chọn. */
export interface SessionPolicyPreviewResponse { soPhien: number; soNguoi: number }
/** Một quyền đổi khi lưu: `banDangXem` = `banId` lúc tải (kiểm phiên bản — khác dòng hiện hành thì 409). */
export interface SessionPolicyChange { permissionCode: PermissionCode; multi: boolean; banDangXem: string | null }
export interface SessionPolicySaveRequest { thayDoi: SessionPolicyChange[] }
export interface SessionPolicySaveResponse { rows: SessionPolicyRowDto[]; soPhien: number; soNguoi: number }
```

  (Nếu `contracts.ts` chưa import `PermissionCode`, thêm `import type { PermissionCode } from "./permissions.ts";` theo kiểu import đang dùng ở tệp.)
- [ ] **Step 4: Luật thuần** `src/shared/chinh-sach-dang-nhap.ts`:

```ts
// Luật THUẦN của chính sách đăng nhập (ADR-0085; đặc tả docs/superpowers/specs/2026-10-01-chinh-sach-dang-nhap-dac-ta.md §2, §4.2, §5). Dùng chung máy chủ
// (kiểm thân gửi lên, mô tả nhật ký) và giao diện (tính thay đổi, cảnh báo). Không I/O.
import type { SessionPolicyChange, SessionPolicyRowDto } from "./contracts.ts";
import { PERMISSION_LABEL, type PermissionCode } from "./permissions.ts";

/** Quyền đặt được = 9 mã quyền app trừ SUPER_ADMIN (Toàn quyền luôn nhiều máy — khoá cứng). Thứ tự = PERMISSION_CODES. */
export const QUYEN_DAT_DUOC = ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "INTERN", "DRIVER", "DRIVER_PARTNER", "HR"] as const satisfies readonly PermissionCode[];
export type QuyenDatDuoc = (typeof QUYEN_DAT_DUOC)[number];
export const isQuyenDatDuoc = (v: unknown): v is QuyenDatDuoc => typeof v === "string" && (QUYEN_DAT_DUOC as readonly string[]).includes(v);

/** ADR-0085 điều 10: cảnh báo khi quyền bên ngoài đặt Nhiều máy (chưa bắt bảo mật hai lớp). */
const QUYEN_BEN_NGOAI: readonly QuyenDatDuoc[] = ["PARTNER", "DRIVER_PARTNER"];
export const CANH_BAO_NHIEU_MAY_BEN_NGOAI =
  "Nhiều máy: nếu ai đó biết PIN, họ đăng nhập song song mà chủ tài khoản không bị đẩy ra để nhận biết. Quyền Đối tác gồm cả lữ hành, HDV độc lập, lễ tân, taxi, cộng tác viên — không chọn riêng được từng loại.";
export const canCanhBaoBenNgoai = (chon: ReadonlyMap<QuyenDatDuoc, boolean>): boolean => QUYEN_BEN_NGOAI.some((c) => chon.get(c) === true);

const SAI = (message: string) => ({ ok: false as const, message });

/** Thân `PUT /api/sessions/policy`: 1–9 thay đổi, mỗi mã một lần, mã thuộc 9 mã đặt được, `multi` boolean, `banDangXem` chuỗi ≤ 64 ký tự hoặc null. */
export function kiemThayDoiChinhSach(v: unknown): { ok: true; value: SessionPolicyChange[] } | { ok: false; message: string } {
  if (!Array.isArray(v) || v.length === 0 || v.length > QUYEN_DAT_DUOC.length) return SAI("Chưa có thay đổi nào để lưu.");
  const out: SessionPolicyChange[] = [];
  for (const x of v as unknown[]) {
    const o = (x ?? {}) as Record<string, unknown>;
    if (o.permissionCode === "SUPER_ADMIN") return SAI("Toàn quyền luôn được nhiều máy — không đặt được.");
    if (!isQuyenDatDuoc(o.permissionCode)) return SAI("Quyền không hợp lệ.");
    if (typeof o.multi !== "boolean") return SAI("Lựa chọn Một máy / Nhiều máy không hợp lệ.");
    if (!(o.banDangXem === null || (typeof o.banDangXem === "string" && o.banDangXem.length > 0 && o.banDangXem.length <= 64))) return SAI("Thiếu phiên bản chính sách đang xem — tải lại trang.");
    if (out.some((y) => y.permissionCode === o.permissionCode)) return SAI("Một quyền chỉ được đổi một lần mỗi lần lưu.");
    out.push({ permissionCode: o.permissionCode, multi: o.multi, banDangXem: o.banDangXem });
  }
  return { ok: true, value: out };
}

/** Tham số `nhieuMay` của xem trước: danh sách phẩy (rỗng = không quyền nào Nhiều máy). Trả theo thứ tự QUYEN_DAT_DUOC. */
export function docTapNhieuMayThamSo(raw: string | null): { ok: true; value: QuyenDatDuoc[] } | { ok: false; message: string } {
  if (raw === null) return SAI("Thiếu tập quyền cần xem trước.");
  const parts = raw === "" ? [] : raw.split(",");
  if (parts.includes("SUPER_ADMIN")) return SAI("Toàn quyền luôn được nhiều máy — không đặt được.");
  if (!parts.every(isQuyenDatDuoc)) return SAI("Quyền không hợp lệ.");
  return { ok: true, value: QUYEN_DAT_DUOC.filter((c) => parts.includes(c)) };
}

/** Tập quyền "Nhiều máy" sau khi áp các thay đổi lên chính sách hiện hành. */
export function tapNhieuMaySau(rows: readonly { permissionCode: PermissionCode; multi: boolean }[], thayDoi: readonly SessionPolicyChange[]): QuyenDatDuoc[] {
  const cuoi = new Map<PermissionCode, boolean>(rows.map((r) => [r.permissionCode, r.multi]));
  for (const t of thayDoi) cuoi.set(t.permissionCode, t.multi);
  return QUYEN_DAT_DUOC.filter((c) => cuoi.get(c) === true);
}

/** Giao diện: chỉ gửi quyền có lựa chọn khác bản đang xem, kèm id dòng đang xem (kiểm phiên bản). */
export const thayDoiChinhSach = (rows: readonly SessionPolicyRowDto[], chon: ReadonlyMap<QuyenDatDuoc, boolean>): SessionPolicyChange[] =>
  rows.flatMap((r) => {
    const c = isQuyenDatDuoc(r.permissionCode) ? chon.get(r.permissionCode) : undefined;
    return c === undefined || c === r.multi ? [] : [{ permissionCode: r.permissionCode, multi: c, banDangXem: r.banId }];
  });

/** Chi tiết nhật ký `session_policy_changed` (ADR-0085 điều 9): quyền đổi + giá trị mới + số máy/số người — không tên, SĐT, IP. */
export const moTaThayDoiChinhSach = (thayDoi: readonly SessionPolicyChange[], dem: { soPhien: number; soNguoi: number }): string =>
  [...thayDoi.map((t) => `${PERMISSION_LABEL[t.permissionCode]} → ${t.multi ? "Nhiều máy" : "Một máy"}`), `đăng xuất ${dem.soPhien} máy của ${dem.soNguoi} người`].join("; ");
```

- [ ] **Step 5:** `node --test src/shared/chinh-sach-dang-nhap.test.ts` → PASS.
- [ ] **Step 6: Test đỏ — `isSingleDevice` có chính sách.** Thay bài "miễn một máy" ở `src/modules/auth/session-ledger.test.ts:17-23` bằng:

```ts
test("được nhiều máy (ADR-0085 Q1 điều 2): SUPER_ADMIN hoặc vai IT (khoá cứng) hoặc một quyền mà chính sách đặt Nhiều máy; bảng trống = như bản 1.58", () => {
  const TRONG = new Set<PermissionCode>();
  assert.equal(isSingleDevice(["SUPER_ADMIN"], [], TRONG), false);
  assert.equal(isSingleDevice(["ADMIN"], ["IT"], TRONG), false);
  assert.equal(isSingleDevice(["ADMIN"], ["DIRECTOR"], TRONG), true);
  assert.equal(isSingleDevice(["PARTNER"], [], TRONG), true);
  assert.equal(isSingleDevice(["HR"], ["HR_STAFF"], TRONG), true);
  // Một quyền Nhiều máy là đủ (chủ chọn 2026-10-01).
  assert.equal(isSingleDevice(["SALES", "ACCOUNTING"], [], new Set<PermissionCode>(["ACCOUNTING"])), false);
  assert.equal(isSingleDevice(["SALES"], [], new Set<PermissionCode>(["ACCOUNTING"])), true);
  // Toàn quyền / IT khoá cứng: chính sách không làm họ thành một máy (chính sách không có mã SUPER_ADMIN để đặt).
  assert.equal(isSingleDevice(["SUPER_ADMIN"], [], new Set<PermissionCode>(["SALES"])), false);
});
```

  Thêm `import type { PermissionCode } from "../../shared/permissions.ts";` ở đầu tệp. Chạy → FAIL (tham số thứ ba bị bỏ qua: ca "ACCOUNTING" trả `true`).
- [ ] **Step 7: Sửa `isSingleDevice`** (`src/modules/auth/session-ledger.ts:23-25`):

```ts
/** Tập quyền mà chính sách đăng nhập hiện hành đặt "Nhiều máy" (ADR-0085). Tập rỗng = bảng chính sách trống = hành vi bản 1.58. */
export type TapNhieuMay = ReadonlySet<PermissionCode>;

/**
 * ADR-0085 Q1 điều 2 (thay ADR-0075 điều 3): tài khoản chịu luật MỘT máy trừ khi giữ SUPER_ADMIN, hoặc vai IT còn hiệu lực (hai điều khoá cứng), hoặc ít nhất
 * một quyền hiệu lực mà chính sách đặt Nhiều máy. Bản TypeScript của mẩu SQL `nhieuMayDieuKien` (auth/repository.ts) — bài đối chiếu ở chinh-sach-repo.test.ts.
 * Tham số `nhieuMay` BẮT BUỘC: quên chính sách là lỗi typecheck (tệp test và khung thử không qua typecheck — tự rà).
 */
export const isSingleDevice = (permissions: readonly PermissionCode[], roles: readonly RoleCode[], nhieuMay: TapNhieuMay): boolean =>
  !(permissions.includes("SUPER_ADMIN") || roles.includes("IT") || permissions.some((p) => nhieuMay.has(p)));
```

  Chạy bài → PASS. `npm run typecheck` sẽ ĐỎ ở `auth/index.ts:77, :146-147` — đúng mong đợi, Task 4 sửa; **chưa commit typecheck đỏ**: tạm truyền `new Set()` ở hai chỗ đó kèm chú thích `// Task 4: đọc chính sách thật` để giữ hành vi 1.58 và typecheck xanh.
- [ ] **Step 8: Ô quyền.** `src/shared/permissions.ts`, sau dòng `"auth.session.revoke"` (~`:186`):

```ts
  // ADR-0085 Q1 điều 3: đặt chính sách đăng nhập (quyền nào Một máy / Nhiều máy) — chỉ Toàn quyền. Route GET/PUT /api/sessions/policy (+ xem trước) hỏi ô này
  // trong handler; giao diện hỏi đúng ô này (không dùng chung auth.session.viewAll — luật 1.52).
  "auth.session.policy": row("none", "none", "none", "none", "none", "any", "none", "none", "none", "none"),
```

  `src/shared/permissions.test.ts`: (a) bảng đầy đủ — thêm dòng `"auth.session.policy": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0085: chỉ Toàn quyền` sau dòng `auth.session.revoke` (~`:78`); (b) `ADMIN_NONE_OPS` — thêm `"auth.session.policy"` cạnh hai ô `auth.session.*` (~`:246`); (c) mọi dòng ghim: `grep -n '"auth.session.revoke": "none"' src/shared/permissions.test.ts` → ở MỖI dòng tìm được thêm `"auth.session.policy": "none",`. Chạy `node --test src/shared/permissions.test.ts` → đỏ trước (b)(c) nếu thiếu, xanh sau.
- [ ] **Step 9: Hành động nhật ký.** `src/shared/audit-actions.ts`: thêm cạnh `session_revoked`:

```ts
  session_policy_changed: { label: "Đổi chính sách đăng nhập", group: "staff" }, // ADR-0085 điều 9: quyền đổi + giá trị mới + số máy/số người — KHÔNG tên, SĐT, IP
```

  và thêm `"session_policy_changed", // ADR-0085 điều 9` vào `SILENT_AUDIT_ACTIONS`. Sửa tên bài `src/modules/audit/an-toan-quyen.test.ts:46` "7 thao tác im lặng" → "8 thao tác im lặng" (thân bài dùng mảng nên không đổi).
- [ ] **Step 10: Tên lời thường cho trợ lý.** `src/shared/tro-ly-cau-truc-ten.ts` sau dòng `auth.session.revoke`:

```ts
  "auth.session.policy": { ten: "đặt chính sách đăng nhập", moTa: "Chọn quyền nào chỉ đăng nhập một máy, quyền nào được nhiều máy." },
```

  Chạy `node scripts/sinh-so-do-trang.mjs` (sinh lại `tro-ly-cau-truc.ts`/`so-do-trang.ts`).
- [ ] **Step 11:** `npm run typecheck` (0 lỗi) và `npm test` xanh (gồm `tro-ly*.test.ts`, `an-toan-quyen.test.ts`, `permissions.test.ts`).
- [ ] **Step 12: Commit** — `git add src/shared/chinh-sach-dang-nhap.ts src/shared/chinh-sach-dang-nhap.test.ts src/shared/contracts.ts src/modules/auth/session-ledger.ts src/modules/auth/session-ledger.test.ts src/modules/auth/index.ts src/shared/permissions.ts src/shared/permissions.test.ts src/shared/audit-actions.ts src/modules/audit/an-toan-quyen.test.ts src/shared/tro-ly-cau-truc-ten.ts src/shared/tro-ly-cau-truc.ts src/shared/so-do-trang.ts`; tiêu đề "Luật thuần chính sách đăng nhập, ô auth.session.policy, nhật ký im lặng (ADR-0085)"; thân: "isSingleDevice nhận tập Nhiều máy bắt buộc để không nơi nào quên chính sách; ô mới chỉ Toàn quyền theo ADR-0085 Q1 điều 3."

---

### Task 3: SQL chính sách và siết theo tập (module `auth`)

**Files:**
- Modify: `src/modules/auth/repository.ts` (khối sổ phiên `:104-177`)
- Create: `src/modules/auth/chinh-sach-repo.test.ts`
- Modify: `src/modules/auth/session-repo.test.ts` (bỏ import/bài `markMultiStatement`; bài `endAllButNewestStatement`/`markSingleStatement` không còn tự kiểm Toàn quyền)

**Interfaces:**
- Consumes: bảng + view của Task 1.
- Produces (`auth/repository.ts`):
  - `interface PolicyRow { id: string; permission_code: string; multi: number }`; `listPolicyRows(db): Promise<PolicyRow[]>`
  - `closePolicyStatement(db, v: { id: string; code: string; at: string; by: string })`
  - `insertPolicyAfterCloseStatement(db, v: { id: string; code: string; multi: boolean; at: string; by: string })` — ghi `permission_code` NULL (⇒ lỗi NOT NULL, cả lô lùi) khi câu ĐÓNG ngay trước không đổi dòng nào
  - `insertPolicyNewStatement(db, v: { id: string; code: string; multi: boolean; at: string; by: string })` — dòng hiện hành đã có ⇒ lỗi UNIQUE
  - `endExpiredAllStatement(db, at)`; `sietTheoTapStatement(db, at, by)` (`RETURNING id, staff_id`); `danhDauMotMayTheoTapStatement(db, at, by)`
  - `demSietTheoTap(db, nhieuMay: readonly string[], nowIso: string): Promise<{ soPhien: number; soNguoi: number }>`
  - `laLoiChinhSachCu(e: unknown): boolean`
  - XOÁ `markMultiStatement` + `SS_MARK_MULTI` (nới không ghi phiên). `endAllButNewestStatement`/`markSingleStatement` giữ nguyên ở task này (Task 4 bỏ `KHONG_TOAN_QUYEN`).

- [ ] **Step 1: Test đỏ** — `src/modules/auth/chinh-sach-repo.test.ts` (D1 giả theo đúng khuôn `session-repo.test.ts`: chép hàm `fakeD1` của tệp đó, kể cả nhánh `RETURNING` và BEGIN/COMMIT/ROLLBACK; thêm bộ đếm số câu mỗi lô):

```ts
// SQL chính sách đăng nhập + siết theo tập (ADR-0085 Q1–Q2; đặc tả §4.2, §4.3, §6 quy tắc 2, 3, 6) trên SQLite THẬT dựng từ migrations/*.sql.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import {
  closePolicyStatement, danhDauMotMayTheoTapStatement, demSietTheoTap, endExpiredAllStatement, insertPolicyAfterCloseStatement, insertPolicyNewStatement,
  laLoiChinhSachCu, listPolicyRows, sietTheoTapStatement,
} from "./repository.ts";
import { isSingleDevice } from "./session-ledger.ts";
import type { PermissionCode } from "../../shared/permissions.ts";
import type { RoleCode } from "../../shared/roles.ts";

const DIR = new URL("../../../migrations/", import.meta.url);
const NOW = "2026-10-02T01:00:00.000Z";
const LATER = "2026-10-09T01:00:00.000Z";
const loDaChay: number[] = [];

function fakeD1(sqlite: DatabaseSync): D1Database {
  const stmt = (sql: string, args: SupportedValueType[] = []) => ({
    sql, args,
    bind: (...a: SupportedValueType[]) => stmt(sql, a),
    first: async () => { const r = sqlite.prepare(sql).get(...args); return r ? { ...r } : null; },
    all: async () => ({ results: sqlite.prepare(sql).all(...args).map((r) => ({ ...r })), meta: {} }),
    run: async () => ({ results: [], meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
  });
  return {
    prepare: (sql: string) => stmt(sql),
    batch: async (stmts: { sql: string; args: SupportedValueType[] }[]) => {
      loDaChay.push(stmts.length);
      sqlite.exec("BEGIN");
      try {
        const out = stmts.map((s) => {
          if (/\bRETURNING\b/i.test(s.sql)) { const rows = sqlite.prepare(s.sql).all(...s.args).map((r) => ({ ...r })); return { results: rows, meta: { changes: rows.length } }; }
          return { results: [], meta: { changes: Number(sqlite.prepare(s.sql).run(...s.args).changes) } };
        });
        sqlite.exec("COMMIT");
        return out;
      } catch (e) { sqlite.exec("ROLLBACK"); throw e; }
    },
  } as unknown as D1Database;
}
function setup() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  return { sqlite, db: fakeD1(sqlite) };
}
let soDt = 0;
function nhanVien(sqlite: DatabaseSync, id: string, perms: PermissionCode[], roles: RoleCode[] = []) {
  sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-${id}', 'PERSON', 'N ${id}', 1, '${NOW}', '${NOW}')`);
  sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('${id}', '', '09${String(++soDt).padStart(8, "0")}', 'x', 'sales', 1, '${NOW}', 'pty-${id}')`);
  for (const p of perms) sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('${id}-${p}', '${id}', '${p}', '${NOW}', '${NOW}', '${NOW}')`);
  for (const r of roles) sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-${id}-${r}', 'pty-${id}', '${r}', NULL, '2026-01-01', '${NOW}', '${NOW}')`);
}
function phien(sqlite: DatabaseSync, id: string, staff: string, createdAt: string, single = 0, expires = LATER) {
  sqlite.prepare(
    "INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by) " +
      "VALUES (?1, ?2, 'PIN', ?3, NULL, 'Máy', NULL, NULL, ?4, ?4, ?5, NULL, NULL, NULL, ?2, ?4, NULL)",
  ).run(id, staff, single, createdAt, expires);
}
const datChinhSach = (sqlite: DatabaseSync, code: string, multi: 0 | 1, id = `pol-${code}`) =>
  sqlite.exec(`INSERT INTO aut_session_policy (id, permission_code, multi, valid_from_at, created_at, updated_at) VALUES ('${id}', '${code}', ${multi}, '${NOW}', '${NOW}', '${NOW}')`);
const song = (sqlite: DatabaseSync, staff: string) =>
  sqlite.prepare("SELECT id, single FROM aut_session WHERE staff_id = ? AND ended_at IS NULL ORDER BY id").all(staff).map((r) => ({ ...r }));
/** Lô siết như route lưu chính sách: [dọn hạn → siết → đánh dấu]. */
const loSiet = (db: D1Database) => [endExpiredAllStatement(db, NOW), sietTheoTapStatement(db, NOW, "toan-quyen"), danhDauMotMayTheoTapStatement(db, NOW, "toan-quyen")];

test("lưu có kiểm phiên bản: đóng đúng id + chèn; id cũ (người khác vừa lưu) → lỗi ràng buộc, CẢ lô lùi (không dòng nào đổi, không phiên nào kết thúc)", async () => {
  const { sqlite, db } = setup();
  datChinhSach(sqlite, "SALES", 1, "ban-1");
  nhanVien(sqlite, "a", ["SALES"]);
  phien(sqlite, "a1", "a", "2026-10-01T00:00:00.000Z");
  phien(sqlite, "a2", "a", "2026-10-01T01:00:00.000Z");
  // Lần lưu 1 (thắng): SALES → Một máy từ bản ban-1.
  await db.batch([closePolicyStatement(db, { id: "ban-1", code: "SALES", at: NOW, by: "t" }), insertPolicyAfterCloseStatement(db, { id: "ban-2", code: "SALES", multi: false, at: NOW, by: "t" }), ...loSiet(db)]);
  assert.deepEqual((await listPolicyRows(db)).map((r) => ({ ...r })), [{ id: "ban-2", permission_code: "SALES", multi: 0 }]);
  assert.deepEqual(song(sqlite, "a"), [{ id: "a2", single: 1 }]);
  // Lần lưu 2 (thua): cũng từ bản ban-1, đổi SALES và HR. Câu đóng SALES không đổi dòng → chèn ghi NULL → NOT NULL → cả lô lùi (HR cũng không được ghi).
  const truoc = sqlite.prepare("SELECT * FROM aut_session ORDER BY id").all().map((r) => ({ ...r }));
  await assert.rejects(
    db.batch([
      insertPolicyNewStatement(db, { id: "hr-1", code: "HR", multi: true, at: NOW, by: "t2" }),
      closePolicyStatement(db, { id: "ban-1", code: "SALES", at: NOW, by: "t2" }), insertPolicyAfterCloseStatement(db, { id: "ban-3", code: "SALES", multi: true, at: NOW, by: "t2" }),
      ...loSiet(db),
    ]),
    (e) => laLoiChinhSachCu(e),
  );
  assert.deepEqual((await listPolicyRows(db)).map((r) => r.id), ["ban-2"], "không dòng nào của lần thua còn lại (kể cả HR)");
  assert.deepEqual(sqlite.prepare("SELECT * FROM aut_session ORDER BY id").all().map((r) => ({ ...r })), truoc);
});

test("chưa có dòng mà bên kia vừa chèn (banDangXem rỗng cả hai) → lỗi UNIQUE, nhận ra là chính sách cũ", async () => {
  const { db } = setup();
  await db.batch([insertPolicyNewStatement(db, { id: "x1", code: "PARTNER", multi: true, at: NOW, by: "t" })]);
  await assert.rejects(db.batch([insertPolicyNewStatement(db, { id: "x2", code: "PARTNER", multi: false, at: NOW, by: "t2" })]), (e) => laLoiChinhSachCu(e));
  assert.equal(laLoiChinhSachCu(new Error("UNIQUE constraint failed: staff.phone")), false);
});

test("siết theo tập: tài khoản một máy theo chính sách TRONG BẢNG còn đúng phiên còn hạn mới nhất (single=1); Toàn quyền, vai IT, quyền Nhiều máy không đụng", async () => {
  const { sqlite, db } = setup();
  datChinhSach(sqlite, "ACCOUNTING", 1);
  nhanVien(sqlite, "ban", ["SALES"]);
  nhanVien(sqlite, "lai", ["SALES", "ACCOUNTING"]); // một quyền Nhiều máy là đủ
  nhanVien(sqlite, "sup", ["SUPER_ADMIN"]);
  nhanVien(sqlite, "it", ["ADMIN"], ["IT"]);
  for (const s of ["ban", "lai", "sup", "it"]) {
    phien(sqlite, `${s}-1`, s, "2026-10-01T00:00:00.000Z");
    phien(sqlite, `${s}-2`, s, "2026-10-01T02:00:00.000Z");
  }
  phien(sqlite, "ban-het-han", "ban", "2026-10-01T03:00:00.000Z", 0, "2026-10-01T23:00:00.000Z"); // mới nhất nhưng đã hết hạn → het_han, không được giữ
  const kq = await db.batch(loSiet(db));
  assert.deepEqual(song(sqlite, "ban"), [{ id: "ban-2", single: 1 }]);
  assert.equal(sqlite.prepare("SELECT end_reason FROM aut_session WHERE id = 'ban-1'").get()!.end_reason, "mat_mien");
  assert.equal(sqlite.prepare("SELECT end_reason FROM aut_session WHERE id = 'ban-het-han'").get()!.end_reason, "het_han");
  for (const s of ["lai", "sup", "it"]) assert.equal(song(sqlite, s).length, 2, `${s} vẫn nhiều máy`);
  assert.deepEqual((kq[1]!.results as { id: string; staff_id: string }[]).map((r) => ({ ...r })), [{ id: "ban-1", staff_id: "ban" }], "RETURNING đúng phiên vừa kết thúc");
});

test("xem trước = đúng số câu siết sẽ làm (cùng mẩu điều kiện), và khớp isSingleDevice của TypeScript", async () => {
  const { sqlite, db } = setup();
  const nguoi: [string, PermissionCode[], RoleCode[]][] = [["s1", ["SALES"], []], ["s2", ["SALES", "HR"], []], ["p1", ["PARTNER"], []], ["it", ["ADMIN"], ["IT"]], ["sa", ["SUPER_ADMIN"], []]];
  for (const [id, perms, roles] of nguoi) {
    nhanVien(sqlite, id, perms, roles);
    phien(sqlite, `${id}-1`, id, "2026-10-01T00:00:00.000Z");
    phien(sqlite, `${id}-2`, id, "2026-10-01T01:00:00.000Z");
    phien(sqlite, `${id}-3`, id, "2026-10-01T02:00:00.000Z");
  }
  const tapMoi: PermissionCode[] = ["HR"]; // sau khi lưu: chỉ HR Nhiều máy
  const truoc = await demSietTheoTap(db, tapMoi, NOW);
  // TypeScript cùng điều kiện: ai là một máy?
  const motMayTs = nguoi.filter(([, p, r]) => isSingleDevice(p, r, new Set(tapMoi))).map(([id]) => id).sort();
  assert.deepEqual(motMayTs, ["p1", "s1"]);
  assert.deepEqual(truoc, { soPhien: 4, soNguoi: 2 });
  datChinhSach(sqlite, "HR", 1);
  const kq = await db.batch(loSiet(db));
  const daKetThuc = kq[1]!.results as { id: string; staff_id: string }[];
  assert.equal(daKetThuc.length, truoc.soPhien);
  assert.deepEqual([...new Set(daKetThuc.map((r) => r.staff_id))].sort(), motMayTs);
});

test("số câu trong lô siết không phụ thuộc số người: 5 và 50 tài khoản → cùng số câu; 50 tài khoản mỗi người còn đúng một phiên", async () => {
  for (const n of [5, 50]) {
    const { sqlite, db } = setup();
    for (let i = 0; i < n; i++) {
      nhanVien(sqlite, `p${i}`, ["PARTNER"]);
      phien(sqlite, `p${i}-a`, `p${i}`, "2026-10-01T00:00:00.000Z");
      phien(sqlite, `p${i}-b`, `p${i}`, "2026-10-01T01:00:00.000Z");
    }
    loDaChay.length = 0;
    const kq = await db.batch(loSiet(db));
    assert.deepEqual(loDaChay, [3], `${n} tài khoản: một lô 3 câu`);
    assert.equal(kq[1]!.results.length, n);
    assert.equal(sqlite.prepare("SELECT count(*) n FROM (SELECT staff_id FROM aut_session WHERE ended_at IS NULL GROUP BY staff_id HAVING count(*) > 1)").get()!.n, 0);
  }
});

test("đánh dấu một máy không vỡ chỉ mục khi tài khoản còn một phiên single=0; tài khoản nhiều máy không bị đánh dấu", async () => {
  const { sqlite, db } = setup();
  nhanVien(sqlite, "a", ["SALES"]);
  nhanVien(sqlite, "sa", ["SUPER_ADMIN"]);
  phien(sqlite, "a1", "a", "2026-10-01T00:00:00.000Z", 0);
  phien(sqlite, "sa1", "sa", "2026-10-01T00:00:00.000Z", 0);
  await db.batch(loSiet(db));
  assert.deepEqual(song(sqlite, "a"), [{ id: "a1", single: 1 }]);
  assert.deepEqual(song(sqlite, "sa"), [{ id: "sa1", single: 0 }]);
});
```

- [ ] **Step 2:** `node --test src/modules/auth/chinh-sach-repo.test.ts` → FAIL (thiếu hàm xuất).
- [ ] **Step 3: SQL** — trong `src/modules/auth/repository.ts`:
  (a) Xoá khối `(2e)` (`SS_MARK_MULTI`, `:129-134`) và thay bằng chú thích dưới; GIỮ NGUYÊN `(2d)` (`KHONG_TOAN_QUYEN`, `SS_END_ALL_BUT_NEWEST`, `SS_MARK_SINGLE`) — Task 4 mới bỏ điều kiện SQL đó, CÙNG commit với việc dời câu phiên sang lô thứ hai (bỏ trước thì giữa hai commit có lỗ CAO-1). Thêm sau `(2d)`:

```ts
// Nới (một máy → nhiều máy) KHÔNG ghi gì lên aut_session (ADR-0085 đặc tả §4.2 bước 4, §4.4): chỉ mục chỉ đếm single = 1 nên phiên cũ single = 1 sống cạnh
// phiên mới single = 0 không vi phạm.

// ---- Chính sách đăng nhập `aut_session_policy` (ADR-0085, migration 0067) ----------------------------------------------------------------
// MỘT mẩu điều kiện "tài khoản <cột> được nhiều máy" cho ba câu (siết, đánh dấu, đếm xem trước) và cho bất biến R-AUT-SESSION-3 (scripts/audit-checks.mjs chép
// nguyên văn — bài đối chiếu ở src/audit-invariants.test.ts). Nguồn chính sách: bảng (khi lưu — đọc SAU các câu ghi chính sách cùng lô) hoặc tham số JSON
// (xem trước). Quyền / vai IT đọc qua view công bố của staff (v_stf_*), không JOIN bảng stf_/pty_. Bản TypeScript: isSingleDevice (session-ledger.ts).
const nhieuMayDieuKien = (cotStaff: string, nguonQuyen: string): string =>
  `(EXISTS (SELECT 1 FROM v_stf_nhieu_may_co_dinh f WHERE f.staff_id = ${cotStaff}) OR EXISTS (SELECT 1 FROM v_stf_quyen_mo q WHERE q.staff_id = ${cotStaff} AND q.permission_code IN (${nguonQuyen})))`;
const NGUON_BANG = "SELECT p.permission_code FROM aut_session_policy p WHERE p.valid_to_at IS NULL AND p.multi = 1";
const moiNhatConSong = (cotStaff: string, locHan: string) =>
  `(SELECT n.id FROM aut_session n WHERE n.staff_id = ${cotStaff} AND n.ended_at IS NULL${locHan} ORDER BY n.created_at DESC, n.id DESC LIMIT 1)`;

export interface PolicyRow { id: string; permission_code: string; multi: number }
const POL_LIST = defineSql("auth", "policy_list", "SELECT id, permission_code, multi FROM aut_session_policy WHERE valid_to_at IS NULL ORDER BY permission_code");
const POL_CLOSE = defineSql("auth", "policy_close",
  "UPDATE aut_session_policy SET valid_to_at = ?3, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND permission_code = ?2 AND valid_to_at IS NULL");
// Chèn SAU câu đóng: câu đóng thua (id đang xem đã không còn là dòng hiện hành) ⇒ permission_code NULL ⇒ lỗi NOT NULL ⇒ CẢ lô lùi (all-or-nothing, đặc tả §4.2
// bước 3.1 — lần lưu nhiều quyền không được ghi một nửa). changes() là của câu hoàn tất ngay trước (câu đóng).
const POL_INSERT_AFTER_CLOSE = defineSql("auth", "policy_insert_after_close",
  "INSERT INTO aut_session_policy (id, permission_code, multi, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) " +
    "SELECT ?1, CASE WHEN changes() > 0 THEN ?2 END, ?3, ?4, NULL, ?4, ?5, ?4, ?5");
// Chèn khi bản đang xem CHƯA có dòng: dòng hiện hành đã có (người khác vừa đặt) ⇒ chỉ mục aut_session_policy_one_current vỡ ⇒ cả lô lùi.
const POL_INSERT_NEW = defineSql("auth", "policy_insert_new",
  "INSERT INTO aut_session_policy (id, permission_code, multi, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, NULL, ?4, ?5, ?4, ?5)");
// Siết theo tập (đặc tả §4.2 bước 3.3): dọn hạn MỌI tài khoản → kết thúc mọi phiên trừ phiên mới nhất của tài khoản nay một máy → đánh dấu single = 1.
// Số câu cố định, không phụ thuộc số người. Câu ghi không mở đầu bằng WITH (khung thử coi WITH là câu đọc).
const SS_END_EXPIRED_ALL = defineSql("auth", "session_end_expired_all",
  "UPDATE aut_session SET ended_at = ?1, end_reason = 'het_han', updated_at = ?1, updated_by = NULL WHERE ended_at IS NULL AND expires_at <= ?1");
const SS_SIET_THEO_TAP = defineSql("auth", "session_siet_theo_tap",
  "UPDATE aut_session SET ended_at = ?1, end_reason = 'mat_mien', ended_by = ?2, updated_at = ?1, updated_by = ?2 WHERE ended_at IS NULL " +
    `AND NOT ${nhieuMayDieuKien("aut_session.staff_id", NGUON_BANG)} AND id <> ${moiNhatConSong("aut_session.staff_id", "")} RETURNING id, staff_id`);
const SS_DANH_DAU_MOT_MAY = defineSql("auth", "session_danh_dau_mot_may_theo_tap",
  `UPDATE aut_session SET single = 1, updated_at = ?1, updated_by = ?2 WHERE ended_at IS NULL AND single = 0 AND NOT ${nhieuMayDieuKien("aut_session.staff_id", NGUON_BANG)}`);
// Xem trước (đặc tả §4.3): cùng mẩu điều kiện, nguồn = tập đề xuất (JSON ?1); phiên còn hạn tại ?2 (lô thật dọn hạn trước nên tương đương).
const SS_DEM_SIET = defineSql("auth", "session_dem_siet_theo_tap",
  "SELECT count(*) AS so_phien, count(DISTINCT s.staff_id) AS so_nguoi FROM aut_session s WHERE s.ended_at IS NULL AND s.expires_at > ?2 " +
    `AND NOT ${nhieuMayDieuKien("s.staff_id", "SELECT value FROM json_each(?1)")} AND s.id <> ${moiNhatConSong("s.staff_id", " AND n.expires_at > ?2")}`);
```

  (b) Hàm xuất (`:139-148`): xoá `markMultiStatement`; giữ nguyên `endAllButNewestStatement`, `markSingleStatement`; thêm:

```ts
export async function listPolicyRows(db: D1Database): Promise<PolicyRow[]> {
  return (await db.prepare(POL_LIST).all<PolicyRow>()).results;
}
export const closePolicyStatement = (db: D1Database, v: { id: string; code: string; at: string; by: string }): D1PreparedStatement =>
  db.prepare(POL_CLOSE).bind(v.id, v.code, v.at, v.by);
export const insertPolicyAfterCloseStatement = (db: D1Database, v: { id: string; code: string; multi: boolean; at: string; by: string }): D1PreparedStatement =>
  db.prepare(POL_INSERT_AFTER_CLOSE).bind(v.id, v.code, v.multi ? 1 : 0, v.at, v.by);
export const insertPolicyNewStatement = (db: D1Database, v: { id: string; code: string; multi: boolean; at: string; by: string }): D1PreparedStatement =>
  db.prepare(POL_INSERT_NEW).bind(v.id, v.code, v.multi ? 1 : 0, v.at, v.by);
/** Lỗi ràng buộc do lần lưu dựa trên bản chính sách cũ (NOT NULL của câu chèn sau đóng, hoặc UNIQUE dòng hiện hành). */
export const laLoiChinhSachCu = (e: unknown): boolean => e instanceof Error && /aut_session_policy\.permission_code/.test(e.message);
export const endExpiredAllStatement = (db: D1Database, at: string): D1PreparedStatement => db.prepare(SS_END_EXPIRED_ALL).bind(at);
export const sietTheoTapStatement = (db: D1Database, at: string, by: string): D1PreparedStatement => db.prepare(SS_SIET_THEO_TAP).bind(at, by);
export const danhDauMotMayTheoTapStatement = (db: D1Database, at: string, by: string): D1PreparedStatement => db.prepare(SS_DANH_DAU_MOT_MAY).bind(at, by);
export async function demSietTheoTap(db: D1Database, nhieuMay: readonly string[], nowIso: string): Promise<{ soPhien: number; soNguoi: number }> {
  const r = await db.prepare(SS_DEM_SIET).bind(JSON.stringify(nhieuMay), nowIso).first<{ so_phien: number; so_nguoi: number }>();
  return { soPhien: r?.so_phien ?? 0, soNguoi: r?.so_nguoi ?? 0 };
}
```

- [ ] **Step 4: Sửa `session-repo.test.ts`** — bỏ `markMultiStatement` khỏi import và bài dùng nó. Chạy `node --test src/modules/auth/session-repo.test.ts src/modules/auth/chinh-sach-repo.test.ts` → PASS.
- [ ] **Step 5:** `node --test src/architecture.test.ts` (EXPLAIN: `auth` chỉ đọc bảng của mình + view `v_stf_*`) → PASS. `npm run typecheck` sẽ đỏ ở `auth/index.ts` (`markMultiStatement` biến mất): sửa `exemptionChangeStatements` NHÁNH "được miễn" thành `return { statements: [], ketQua: none }` ngay ở task này (nới không ghi gì — đặc tả §4.4), bỏ import `markMultiStatement`; giữ tham số `requireToanQuyen` tới Task 4 (không dùng nữa — ghi `void v.requireToanQuyen` KHÔNG được; xoá luôn khỏi kiểu và hai nơi gọi ở `accounts/index.ts:542, :603`). Bài `mat-mien-route.test.ts` bài 2 ("cấp Toàn quyền → single=0") sẽ ĐỎ — đúng đổi hành vi có chủ đích; Task 4 viết lại. **Ghi vào sổ**; để commit xanh, đánh dấu bài đó `test.skip("… — Task 4 viết lại theo ADR-0085 (nới không ghi phiên)")` và Task 4 bỏ `skip`.
- [ ] **Step 6:** `npm test` xanh (trừ bài skip có ghi lý do), `npm run typecheck` 0.
- [ ] **Step 7: Commit** — `git add src/modules/auth/repository.ts src/modules/auth/chinh-sach-repo.test.ts src/modules/auth/session-repo.test.ts src/modules/auth/index.ts src/modules/accounts/index.ts src/modules/accounts/mat-mien-route.test.ts`; tiêu đề "SQL chính sách đăng nhập: lưu all-or-nothing, siết theo tập, đếm xem trước (ADR-0085)"; thân: "Một mẩu điều kiện cho siết/đánh dấu/đếm để xem trước khớp việc thật; lần lưu thua lùi cả lô; bỏ điều kiện SQL cài cứng 'không giữ Toàn quyền' (thay bằng thứ tự lô ở Task 4)."

---

### Task 4: Dùng chính sách khi cấp phiên và khi đổi quyền/vai; câu phiên ở lô thứ hai

**Files:**
- Modify: `src/modules/auth/index.ts:71-99` (`issueLoginSession`), `:131-158` (`exemptionChangeStatements`), khối xuất
- Modify: `src/modules/auth/repository.ts:118-128` (bỏ `KHONG_TOAN_QUYEN`), `src/modules/auth/session-repo.test.ts`
- Modify: `src/modules/accounts/index.ts:511-560` (route `PUT /api/staff/:id/permissions`), `:573-634` (route `PUT /api/staff/:id/roles`)
- Modify: `tests/audit/harness.mjs:37-40` (bundle), `:130-145` (`token`)
- Modify: `src/modules/accounts/mat-mien-route.test.ts` (viết lại)

**Interfaces:**
- Consumes: `isSingleDevice(…, nhieuMay)` (Task 2), `listPolicyRows`, `endAllButNewestStatement`, `markSingleStatement` (Task 3).
- Produces (`auth/index.ts`):
  - `docChinhSachPhien(db): Promise<{ id: string; permissionCode: QuyenDatDuoc; multi: boolean }[]>` (bỏ qua mã lạ)
  - `docTapNhieuMay(db): Promise<TapNhieuMay>`
  - `exemptionChangeStatements(db, v: { staffId; at; by; nhieuMay: TapNhieuMay; before: {permissions; roles}; after: {permissions; roles} })` — mất nhiều máy → 3 câu; được nhiều máy / không đổi → `[]`.
  - `export type { TapNhieuMay }`.

- [ ] **Step 1: Test đỏ — viết lại `src/modules/accounts/mat-mien-route.test.ts`.** Giữ hàm phụ `setup/maPhien/callWith/mayKhac/lui/song` hiện có; thêm:

```ts
/** Đặt chính sách thẳng vào bảng (bài route không kiểm route lưu chính sách — có bài riêng). */
const datChinhSach = (w: any, code: string, multi: 0 | 1) =>
  w.sqlite.exec(`INSERT INTO aut_session_policy (id, permission_code, multi, valid_from_at, created_at, updated_at) VALUES ('pol-${code}', '${code}', ${multi}, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`);
const ADM2 = "44444444-4444-4444-8444-444444444444";
```

  Thay bài 2 (đang `skip`) bằng:

```ts
test("ADR-0085 §4.4: tài khoản ĐƯỢC nhiều máy (cấp Toàn quyền, hoặc thêm quyền mà chính sách đặt Nhiều máy) → KHÔNG ghi gì lên phiên; không gọi Bảng tin theo phiên", async () => {
  const { w, goi } = setup();
  datChinhSach(w, "ACCOUNTING", 1);
  const tk = await w.token(SALES);
  const truoc = w.q("SELECT id, single, updated_at FROM aut_session WHERE staff_id = ?", SALES);
  assert.equal(truoc[0].single, 1);
  for (const perms of [["SALES", "ACCOUNTING"], ["SALES", "ACCOUNTING", "SUPER_ADMIN"]]) {
    const r = await w.call("PUT", `/api/staff/${SALES}/permissions`, { as: SUP, body: { permissions: perms } });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(w.q("SELECT id, single, updated_at FROM aut_session WHERE staff_id = ?", SALES), truoc, `nới (${perms}) không ghi phiên`);
  }
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 200);
  assert.ok(!goi.some((g) => "sessionIds" in g), JSON.stringify(goi));
});
```

  Thêm bài theo chính sách + bài AC9 + bài chạy đua câu chốt:

```ts
test("ADR-0085 §4.4: bỏ quyền mà chính sách đặt Nhiều máy (ACCOUNTING) → còn đúng phiên mới nhất, máy cũ 'mat_mien' + 401, Bảng tin dạng giữ-phiên", async () => {
  const { w, goi } = setup();
  datChinhSach(w, "ACCOUNTING", 1);
  w.sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('s-acc', '${SALES}', 'ACCOUNTING', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`);
  const tk = await w.token(SALES);
  const cu = maPhien(tk);
  assert.equal(w.q("SELECT single FROM aut_session WHERE id = ?", cu)[0].single, 0, "khung thử cấp phiên theo chính sách thật: nhiều máy");
  lui(w, cu);
  mayKhac(w, "may-moi", SALES, 0);
  const r = await w.call("PUT", `/api/staff/${SALES}/permissions`, { as: SUP, body: { permissions: ["SALES"] } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(song(w, SALES), [{ id: "may-moi", single: 1 }]);
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 401);
  assert.ok(goi.some((g) => JSON.stringify(g) === JSON.stringify({ staffId: SALES, sessionIds: [cu], giuPhien: "may-moi" })), JSON.stringify(goi));
});

test("ADR-0085 Q2 điều 7 + AC9: QUẢN TRỊ đổi vai (Kế toán → Nhân viên kinh doanh) khi chính sách 'Kế toán = Nhiều máy' → máy thừa đăng xuất ngay", async () => {
  const { w } = setup();
  datChinhSach(w, "ACCOUNTING", 1);
  w.sqlite.exec(`UPDATE stf_permission SET permission_type_code = 'ACCOUNTING' WHERE staff_id = '${SALES}'`);
  const tk = await w.token(SALES);
  const cu = maPhien(tk);
  lui(w, cu);
  mayKhac(w, "may-moi", SALES, 0);
  const r = await w.call("PUT", `/api/staff/${SALES}/roles`, { as: ADM, body: { roles: ["SALES_STAFF"] } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(song(w, SALES), [{ id: "may-moi", single: 1 }]);
  assert.equal(w.q("SELECT end_reason, ended_by FROM aut_session WHERE id = ?", cu)[0].ended_by, ADM);
});

test("ADR-0085 §6 quy tắc 4 (AC8): 'ADMIN = Nhiều máy', gỡ ADMIN mà câu chốt TRONG LÔ thua (quản trị viên kia bị ngưng giữa lời kiểm trước và lô) → 409, KHÔNG phiên nào kết thúc", async () => {
  const { w } = setup();
  datChinhSach(w, "ADMIN", 1);
  seedStaff(w.sqlite, { id: ADM2, phone: "0900000004", name: "Quản trị Hai", perms: ["ADMIN"] });
  const tk = await w.token(ADM);
  assert.equal(w.q("SELECT single FROM aut_session WHERE id = ?", maPhien(tk))[0].single, 0, "Quản trị nhiều máy theo chính sách");
  mayKhac(w, "may-hai", ADM, 0);
  const truoc = w.q("SELECT id, single, ended_at, updated_at FROM aut_session WHERE staff_id = ? ORDER BY id", ADM);
  // Lời kiểm trước lô (countActiveAdmins = 2) cho qua; ngay trước lô ĐẦU TIÊN, quản trị viên kia bị ngưng → câu chốt trong lô thua.
  const goc = w.env.DB.batch;
  let lan = 0;
  w.env.DB.batch = async (stmts: unknown[]) => {
    if (lan++ === 0) w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${ADM2}'`);
    return goc(stmts);
  };
  const r = await w.call("PUT", `/api/staff/${ADM}/permissions`, { as: SUP, body: { permissions: ["SALES"] } });
  w.env.DB.batch = goc;
  assert.equal(r.status, 409, r.text);
  assert.equal(lan, 1, "chỉ MỘT lô chạy — lô phiên không được chạy khi câu chốt thua");
  assert.deepEqual(w.q("SELECT id, single, ended_at, updated_at FROM aut_session WHERE staff_id = ? ORDER BY id", ADM), truoc);
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 200);
});
```

  Bài 1 (bỏ Toàn quyền của SUP2) và bài 3 (vai IT) giữ nguyên ý; bài 4 cũ ("quản trị viên cuối, 409") — đổi sang dùng cùng kỹ thuật chèn ngưng giữa chừng (bài cũ chặn ở lời kiểm trước lô nên rỗng nghĩa — ghi điều này trong chú thích bài). Thêm `seedStaff` vào import nếu chưa có.
- [ ] **Step 2:** `node --test src/modules/accounts/mat-mien-route.test.ts` → FAIL (khung thử chưa đọc chính sách: phiên SALES/ADM mang `single = 1`; route chưa dùng chính sách).
- [ ] **Step 3: Khung thử.** `tests/audit/harness.mjs`: dòng bundle `:39` thêm `export { docTapNhieuMay } from "./modules/auth";`; trong `token()` (`:136`) thay bằng:

```js
      const prof = await app.getActiveStaff(env.DB, as);
      // single theo ĐÚNG luật thật (ADR-0085): quyền + vai + chính sách đọc từ bảng — không nới luật cho khung thử; quên tham số chính sách là lỗi (không mặc định).
      const nhieuMay = await app.docTapNhieuMay(env.DB);
      const single = prof && !app.isSingleDevice(prof.permissions, await app.accountRoleCodesOf(env.DB, as), nhieuMay) ? 0 : 1;
```

- [ ] **Step 4: `auth/index.ts`.**
  (a) Thêm (gần khối xuất sổ phiên):

```ts
/** Chính sách đăng nhập hiện hành (ADR-0085): đọc D1 MỖI lần gọi — không lưu đệm trong Worker (mỗi bản Worker sẽ giữ một bản khác nhau). Bỏ qua mã lạ. */
export async function docChinhSachPhien(db: D1Database): Promise<{ id: string; permissionCode: QuyenDatDuoc; multi: boolean }[]> {
  return (await listPolicyRows(db)).flatMap((r) => (isQuyenDatDuoc(r.permission_code) ? [{ id: r.id, permissionCode: r.permission_code, multi: r.multi === 1 }] : []));
}
export const docTapNhieuMay = async (db: D1Database): Promise<TapNhieuMay> =>
  new Set((await docChinhSachPhien(db)).filter((r) => r.multi).map((r) => r.permissionCode));
export type { TapNhieuMay };
```

  với import `listPolicyRows` từ `./repository`, `isQuyenDatDuoc, type QuyenDatDuoc` từ `../../shared/chinh-sach-dang-nhap`, `type TapNhieuMay` từ `./session-ledger`.
  (b) `issueLoginSession` (`:76-77`): thay

```ts
  const roles = await accountRoleCodesOf(env.DB, profile.id);
  const single = isSingleDevice(profile.permissions, roles);
```

  bằng

```ts
  // ADR-0085: chính sách đọc MỖI lần cấp phiên (một câu ≤ 9 dòng), cùng lúc với vai.
  const [roles, nhieuMay] = await Promise.all([accountRoleCodesOf(env.DB, profile.id), docTapNhieuMay(env.DB)]);
  const single = isSingleDevice(profile.permissions, roles, nhieuMay);
```

  (bỏ `new Set()` tạm của Task 2).
  (c) `exemptionChangeStatements` — kiểu `v` thay `requireToanQuyen: boolean` bằng `nhieuMay: TapNhieuMay`; thân:

```ts
  const truoc = isSingleDevice(v.before.permissions, v.before.roles, v.nhieuMay);
  const sau = isSingleDevice(v.after.permissions, v.after.roles, v.nhieuMay);
  const none = () => ({ endedSessionIds: [], keptSessionId: null });
  // Nới (một máy → nhiều máy) hoặc không đổi: KHÔNG ghi gì lên aut_session (ADR-0085 đặc tả §4.4).
  if (!(!truoc && sau)) return { statements: [], ketQua: none };
  return {
    statements: [endExpiredSessionsStatement(db, v.staffId, v.at), endAllButNewestStatement(db, v.staffId, v.at, v.by), markSingleStatement(db, v.staffId, v.at, v.by)],
    ketQua: (results) => {
      const ids = (r: D1Result | undefined) => ((r?.results ?? []) as { id: string }[]).map((x) => x.id);
      return { endedSessionIds: ids(results.at(-2)), keptSessionId: ids(results.at(-1))[0] ?? null };
    },
  };
```

  Sửa chú thích JSDoc của hàm: "ADR-0085 Q2 điều 7 (thay ADR-0075 điều 3): … người gọi đặt các câu ở lô THỨ HAI nếu lô đổi quyền/vai có câu chốt; không có câu chốt thì nối cuối lô duy nhất".
- [ ] **Step 4b: Bỏ điều kiện SQL cài cứng** — `src/modules/auth/repository.ts` khối `(2d)`: xoá hằng `KHONG_TOAN_QUYEN` và thay hai câu bằng:

```ts
// (2d) Một tài khoản MẤT nhiều máy khi đổi quyền / vai (ADR-0085 Q2 điều 7, thay ADR-0075 điều 3): [dọn hạn (1) → kết thúc mọi phiên trừ phiên còn sống mới nhất
// → đánh dấu phiên còn lại single = 1]. Thứ tự giữ chỉ mục aut_session_one_live không vỡ. KHÔNG còn tự kiểm "không giữ Toàn quyền" trong SQL: route đặt hai câu
// này ở lô THỨ HAI, chỉ chạy khi lô đổi quyền/vai đã thắng câu chốt "quản trị viên cuối" (bài accounts/mat-mien-route.test.ts, đột biến ở sổ hàng rào).
// RETURNING id: phiên vừa bị kết thúc (đóng Bảng tin) / phiên được giữ (giữ thông báo của máy đó) — ADR-0075 điều 6.
const SS_END_ALL_BUT_NEWEST = defineSql("auth", "session_end_all_but_newest",
  "UPDATE aut_session SET ended_at = ?2, end_reason = 'mat_mien', ended_by = ?3, updated_at = ?2, updated_by = ?3 WHERE staff_id = ?1 AND ended_at IS NULL AND id <> " +
    "(SELECT id FROM aut_session WHERE staff_id = ?1 AND ended_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 1) RETURNING id");
const SS_MARK_SINGLE = defineSql("auth", "session_mark_single",
  "UPDATE aut_session SET single = 1, updated_at = ?2, updated_by = ?3 WHERE staff_id = ?1 AND ended_at IS NULL RETURNING id");
```

  `session-repo.test.ts`: bài nào khẳng định hai câu này "không đụng khi tài khoản còn giữ Toàn quyền" → đổi thành "chạy theo đúng `staff_id`, không đụng tài khoản khác" (điều kiện đã chuyển sang thứ tự lô — bài route AC8 ở Step 1 giữ nó).
- [ ] **Step 5: Route đổi quyền** (`accounts/index.ts:538-560`). Thay đoạn từ chú thích `// ADR-0075 điều 3: tài khoản ở route này…` tới `const matMien = phien.ketQua(results);` bằng:

```ts
      // ADR-0085 Q2 điều 7: chính sách đọc ĐẦU request; "được nhiều máy" TRƯỚC/SAU tính bằng cùng một bản. Câu phiên KHÔNG tự kiểm quyền trong SQL: có câu chốt
      // (gỡ ADMIN) thì câu phiên chạy ở lô THỨ HAI, chỉ khi lô quyền đã thắng câu chốt; không có câu chốt thì nối cuối lô duy nhất (nguyên tử).
      const nhieuMay = await docTapNhieuMay(db);
      const phien = exemptionChangeStatements(db, { staffId: t.id, at, by: admin.id, nhieuMay, before: { permissions: t.permissions, roles: [] }, after: { permissions: next, roles: [] } });
      const stmts = [
        ...(plan.guarded ? [plan.guarded] : []), adminAudit(db, admin.id, "permission_changed", t.id, detail, plan.guarded ? "changes() > 0" : undefined), ...plan.rest,
        ...(plan.guarded ? [] : phien.statements),
      ];
      let results: D1Result[];
      let loPhien: D1Result[] = [];
      try {
        results = await db.batch(stmts);
        if (plan.guarded && (results[0]!.meta.changes ?? 0) === 0) return LAST_ADMIN();
        loPhien = plan.guarded ? (phien.statements.length ? await db.batch(phien.statements) : []) : results;
      } catch (e) {
        const rule = ruleViolation(e); // lưới cuối: lỗi trigger (LC-1b…) thành 409, không 500
        if (rule) return rule;
        throw e;
      }
      const matMien = phien.ketQua(loPhien);
```

  Import `docTapNhieuMay` từ `../auth`.
- [ ] **Step 6: Route đổi vai** (`:600-606`): thay `requireToanQuyen: false` bằng `nhieuMay: await docTapNhieuMay(db)` (đọc trước `exemptionChangeStatements`, sau `state`); sửa chú thích "câu phiên đi cùng lô vai (lô thứ hai) — chỉ chạy khi câu chốt thắng; không câu chốt: cuối lô duy nhất". Cấu trúc lô giữ nguyên (đã đúng thứ tự).
- [ ] **Step 7:** `node --test src/modules/accounts/mat-mien-route.test.ts` → PASS (bỏ `skip`). `npm run typecheck` 0.
- [ ] **Step 8: Quan sát chặn thật (P16)** — sao lưu `src/modules/accounts/index.ts` vào `$TMPDIR/accounts-index.bak`; ở route đổi quyền đổi `...(plan.guarded ? [] : phien.statements)` thành `...phien.statements` và `plan.guarded ? (…) : results` thành `results` (câu phiên trở lại lô đầu, không còn SQL tự kiểm) → chạy `node --test src/modules/accounts/mat-mien-route.test.ts` → PHẢI ĐỎ ở bài "AC8" (phiên của ADM đã kết thúc dù 409). Ghi nguyên văn dòng `not ok …` vào sổ → khôi phục từ bản sao → xanh; `git status` chỉ còn các tệp của task.
- [ ] **Step 9:** `npm test` xanh (đặc biệt `phien-route.test.ts`, `dang-nhap-tat-may-cu.test.ts`, `tat-thong-bao-dung-may.test.ts`, `patch-staff.test.ts`, `tests/audit/*.test.mjs` như trước — năm bài đỏ sẵn D-02, P2, P3, P5, P6 nếu còn thì đối chiếu bản HEAD trước).
- [ ] **Step 10: Commit** — `git add src/modules/auth/index.ts src/modules/auth/repository.ts src/modules/auth/session-repo.test.ts src/modules/accounts/index.ts tests/audit/harness.mjs src/modules/accounts/mat-mien-route.test.ts`; tiêu đề "Cấp phiên và đổi quyền/vai dùng chính sách đăng nhập; câu phiên ở lô thứ hai sau câu chốt (ADR-0085)"; thân: "Thay điều kiện SQL cài cứng 'không giữ Toàn quyền' (CAO-1 của lượt kiểm thiết kế): với chính sách 'ADMIN = Nhiều máy', gỡ ADMIN của quản trị viên cuối từng có thể đăng xuất máy dù lần đổi bị từ chối."

---

### Task 5: Dạng `dongBangTin` "danh sách phiên, chỉ-phiên" (không `staffId`)

**Files:**
- Modify: `src/shared/router.ts:26-35` (`MucDongBangTin`)
- Modify: `src/modules/thongbao/repository.ts:150-177`, `src/modules/thongbao/index.ts:22`
- Modify: `src/index.ts:96-121` (hàm tiêm `dongBangTin`)
- Modify: `src/modules/thongbao/may-theo-phien.test.ts`, `src/tat-thong-bao-dung-may.test.ts`
- Modify: `src/dang-nhap-tat-may-cu.test.ts` (thêm bài dây thật cho nhánh mới)

**Interfaces:**
- Produces: biến thể `{ phienKetThuc: string[] }` của `MucDongBangTin` (khoá phân biệt riêng `phienKetThuc` — KHÔNG dùng lại `sessionIds`/`chiPhien`, để nhánh cũ không bắt nhầm); `tatMayCuaCacPhienStatement(db, sessionIds: readonly string[], at: string)` (lý do `mat-mien`).

- [ ] **Step 1: Test đỏ — SQL** (thêm vào `src/modules/thongbao/may-theo-phien.test.ts`, theo khuôn bài `TAT_MAY_CUA_PHIEN` có sẵn — dùng lại hàm dựng CSDL/chèn đăng ký của tệp):

```ts
test("ADR-0085 Q3: tatMayCuaCacPhienStatement — chỉ tắt đăng ký mang ĐÚNG các phiên trong danh sách (mọi tài khoản), lý do mat-mien; máy giữ lại, đăng ký session_id NULL, dòng đã tắt không đụng; danh sách rỗng → 0 dòng", () => {
  // Ba tài khoản; A: phiên A1 (kết thúc), A2 (giữ), NULL; B: phiên B1 (kết thúc); C: phiên C1 (không trong danh sách)
  // … chèn 5 đăng ký theo hàm phụ có sẵn của tệp (endpoint khác nhau), 1 dòng đã tắt của A1 từ trước.
  // Chạy câu với ["A1", "B1"] → A1 + B1 revoke_reason = 'mat-mien', revoked_at = AT; A2, NULL, C1 còn bật; dòng đã tắt giữ lý do cũ.
  // Chạy câu với [] → changes = 0.
});
```

  Viết thân bài cụ thể bằng đúng hàm phụ của tệp (đọc tệp trước; không đoán tên). Chạy → FAIL (thiếu hàm).
- [ ] **Step 2: SQL** — `src/modules/thongbao/repository.ts` sau `TAT_MAY_CUA_PHIEN`:

```ts
// ADR-0085 Q3: máy bị kết thúc vì Toàn quyền LƯU CHÍNH SÁCH (siết theo tập, nhiều tài khoản một lúc) — tắt CHỈ đăng ký mang đúng các phiên đó, lý do mat-mien.
// Không lọc theo tài khoản (danh sách phiên đã đủ hẹp — phiên thuộc đúng một tài khoản); không tắt máy được giữ, không tắt đăng ký chưa gắn phiên (session_id NULL).
const TAT_MAY_CUA_CAC_PHIEN = defineSql("thongbao", "tat_may_cua_cac_phien", `
  UPDATE ntf_push_sub SET revoked_at = ?2, revoke_reason = 'mat-mien', updated_at = ?2, updated_by = NULL
  WHERE revoked_at IS NULL AND session_id IN (SELECT value FROM json_each(?1))`);
```

  và hàm xuất `export const tatMayCuaCacPhienStatement = (db: D1Database, sessionIds: readonly string[], at: string): D1PreparedStatement => db.prepare(TAT_MAY_CUA_CAC_PHIEN).bind(JSON.stringify(sessionIds), at);`; thêm vào dòng xuất `thongbao/index.ts:22`. Chạy bài → PASS.
- [ ] **Step 3: Kiểu.** `src/shared/router.ts` — thêm biến thể và chú thích:

```ts
  // ADR-0085 Q3: Toàn quyền LƯU CHÍNH SÁCH làm nhiều tài khoản mất nhiều máy — MỘT lời gọi cho cả danh sách phiên vừa kết thúc (không một staffId nào):
  // đóng Bảng tin của đúng các phiên đó + tắt CHỈ đăng ký mang đúng các phiên đó (lý do mat-mien). Khoá `phienKetThuc` riêng để nhánh cũ không bắt nhầm.
  | { phienKetThuc: string[] }
```

- [ ] **Step 4: Test đỏ — dây thật qua gốc lắp ráp.** Thêm vào `src/dang-nhap-tat-may-cu.test.ts` (không `ghiDe` — gọi hàm tiêm thật):

```ts
test("ADR-0085 Q3: dongBangTin({ phienKetThuc }) qua gốc lắp ráp THẬT tắt đúng đăng ký của các phiên đó; máy giữ lại và đăng ký session_id NULL còn bật; không ném", async () => {
  // Dựng world() thường; seed SALES; chèn 3 dòng ntf_push_sub thẳng (session_id 'ket-thuc', 'giu', NULL) theo cột của bảng (đọc PRAGMA table_info(ntf_push_sub));
  // gọi hàm tiêm: lấy bằng app.taoAppChoKhungThu? — KHÔNG: gọi route thật làm phát sinh lời gọi là Task 6. Ở đây dùng hàm xuất của gốc lắp ráp nếu có
  // (src/index.ts xuất `taoAppChoKhungThu` + phần tiêm mặc định): tìm hàm tiêm mặc định bằng grep "dongBangTin: async (env, muc)" và xuất nó dưới tên
  // `dongBangTinMacDinh` cho bài (chỉ thêm xuất, không đổi hành vi).
  // Khẳng định: 'ket-thuc' → 'mat-mien'; 'giu' và NULL → revoked_at NULL.
});
```

  Cách gọi cụ thể: `src/index.ts` xuất thêm `export const dongBangTinMacDinh = <đối tượng tiêm>.dongBangTin` (đặt tên theo cấu trúc thật của tệp — đọc `:60-130` trước); khung thử bundle thêm `export { dongBangTinMacDinh } from "./index";`. Chạy → FAIL (nhánh mới chưa có: rơi vào nhánh cuối, `dongCua(env, muc)` + `muc.tatThongBao` undefined ⇒ không tắt gì ⇒ khẳng định 'mat-mien' đỏ).
- [ ] **Step 5: Gốc lắp ráp.** `src/index.ts` — trong `dongBangTin: async (env, muc) => {`, ĐẦU TIÊN (trước nhánh `chiPhien`):

```ts
      // ADR-0085 Q3 — danh sách phiên do lưu chính sách: xét TRƯỚC mọi nhánh khác (không có staffId; khoá riêng phienKetThuc).
      if (typeof muc === "object" && "phienKetThuc" in muc) {
        if (muc.phienKetThuc.length === 0) return;
        await nemNeuLoi([
          ["tram", dongCua(env, { sessionIds: muc.phienKetThuc })],
          ["tat-may", tatMayCuaCacPhienStatement(env.DB, muc.phienKetThuc, new Date().toISOString()).run()],
        ]);
        return;
      }
```

  Typecheck: các nhánh sau dùng `muc.staffId` — TypeScript thu hẹp kiểu sau `return`; nếu vẫn báo lỗi ở nhánh cuối (`dongCua(env, muc)`), thu hẹp tường minh bằng `if (typeof muc === "object" && !("staffId" in muc)) return;` ngay sau khối mới.
  Chạy bài Step 4 → PASS.
- [ ] **Step 6: Hàng rào — `src/tat-thong-bao-dung-may.test.ts` (NỚI có chủ đích, chủ đã duyệt ADR-0085 Q3).** Trong bài "MỌI route gọi dongBangTin…":
  (a) sau dòng đếm `"chỉ-phiên"` thêm:

```ts
    // ADR-0085 Q3 (NỚI có chủ đích, chủ duyệt 2026-10-01 — sổ hàng rào): dạng "danh sách phiên, chỉ-phiên" KHÔNG có staffId — CHỈ route lưu chính sách được dùng.
    co.push(...[...than.matchAll(/dongBangTin\(\{\s*phienKetThuc:[^}]*\}\)/g)].map(() => "chỉ-phiên danh sách"));
```

  (b) bảng ghim thêm dòng `"PUT /api/sessions/policy": ["chỉ-phiên danh sách"], // ADR-0085 Q3: lưu chính sách — tắt CHỈ máy của các phiên vừa kết thúc (một lời gọi cho cả danh sách)`;
  (c) đổi tên bài: thêm "…, lưu chính sách chỉ-phiên danh sách (ADR-0085 Q3)…".
  Chưa có route ⇒ bài sẽ đỏ ở bảng ghim tới Task 6 — **để bài xanh ở commit này, chưa thêm (b)**; Task 6 thêm (b) cùng route. Thêm (a) ngay (không đổi kết quả khi chưa ai gọi).
- [ ] **Step 7:** `npm run typecheck` 0; `npm test` xanh.
- [ ] **Step 8: Commit** — `git add src/shared/router.ts src/modules/thongbao/repository.ts src/modules/thongbao/index.ts src/modules/thongbao/may-theo-phien.test.ts src/index.ts tests/audit/harness.mjs src/dang-nhap-tat-may-cu.test.ts src/tat-thong-bao-dung-may.test.ts`; tiêu đề "Bảng tin + thông báo: dạng danh sách phiên chỉ-phiên cho lưu chính sách (ADR-0085 Q3)"; thân: "Siết theo tập kết thúc phiên của nhiều người — một lời gọi, không staffId; khoá riêng để không rơi vào nhánh tắt-mọi-máy cũ; máy giữ lại và đăng ký chưa gắn phiên không bị tắt."

---

### Task 6: Ba route chính sách (`accounts`)

**Files:**
- Modify: `src/modules/accounts/index.ts` (sau route `POST /api/sessions/:id/revoke`, cuối mảng `routes`)
- Modify: `src/modules/auth/index.ts` (xuất hàm cho accounts)
- Create: `src/modules/accounts/chinh-sach-phien-route.test.ts`
- Modify: `src/route-access.test.ts` (+3 dòng, 209 → 212), `src/route-write-guard.test.ts:101` (`ADMIN_OPS`), `src/tat-thong-bao-dung-may.test.ts` (dòng bảng ghim (b) của Task 5)

**Interfaces:**
- Consumes: Task 2 (luật thuần, DTO, ô, nhật ký), Task 3 (SQL), Task 4 (`docChinhSachPhien`), Task 5 (`{ phienKetThuc }`).
- Produces (auth/index.ts xuất thêm): `luuChinhSachStatements(db, v: { thayDoi: SessionPolicyChange[]; at: string; by: string }): D1PreparedStatement[]`; `sietTheoTapStatements(db, at, by): { statements: D1PreparedStatement[]; ketQua(results: readonly D1Result[]): { sessionIds: string[]; staffIds: string[] } }`; `demSietTheoTap`, `laLoiChinhSachCu`.
- Produces (HTTP): `GET /api/sessions/policy` → `SessionPolicyResponse`; `GET /api/sessions/policy/preview?nhieuMay=<phẩy>` → `SessionPolicyPreviewResponse`; `PUT /api/sessions/policy` (thân `SessionPolicySaveRequest`) → `SessionPolicySaveResponse` | 400 `invalid_input` | 403 `forbidden` | 409 `policy_stale`.

- [ ] **Step 1: Test đỏ** — `src/modules/accounts/chinh-sach-phien-route.test.ts` (khuôn `dang-nhap-tat-may-cu.test.ts`: `world()` + `seedStaff` + `hashPin` để đăng nhập route PIN thật):

```ts
// ADR-0085 — route chính sách đăng nhập (đặc tả §4.2–4.3, §6 quy tắc 1–8, §11 AC2–AC8, AC11) chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { hashPin } from "../staff/password.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const LAI = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const HR = "66666666-6666-4666-8666-666666666666";
const SUP = "77777777-7777-4777-8777-777777777777";
const PIN = "135790";

async function setup(tuyChon: Record<string, unknown> = {}) {
  const w = world(tuyChon);
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0900000002", name: "Bình", perms: ["SALES", "ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000006", name: "Nhân sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  w.sqlite.prepare("UPDATE staff SET pin_hash = ?").run(await hashPin(PIN));
  return w;
}
/** Đăng nhập route PIN thật từ một "máy"; trả cookie. */
async function dangNhap(w: any, phone: string, ua: string): Promise<string> {
  const r = await w.call("POST", "/api/auth/login", { body: { phone, pin: PIN }, headers: { "user-agent": ua } });
  assert.equal(r.status, 200, r.text);
  return r.headers.get("set-cookie")!.split(";")[0]!;
}
const me = (w: any, cookie: string) => w.call("GET", "/api/auth/me", { headers: { cookie } });
const docBan = async (w: any) => (await w.call("GET", "/api/sessions/policy", { as: SUP })).json.rows as { permissionCode: string; multi: boolean; banId: string | null }[];
const banCua = (rows: { permissionCode: string; banId: string | null }[], c: string) => rows.find((r) => r.permissionCode === c)!.banId;
const luu = (w: any, thayDoi: unknown) => w.call("PUT", "/api/sessions/policy", { as: SUP, body: { thayDoi } });
const choMotNhip = () => new Promise((r) => setTimeout(r, 30));

test("§6 quy tắc 1 (AC5): Quản trị, Nhân sự, Bán hàng → 403 ở cả ba route; Toàn quyền đọc được 9 dòng, bảng trống = Một máy", async () => {
  const w = await setup();
  for (const as of [ADM, HR, SALES]) {
    assert.equal((await w.call("GET", "/api/sessions/policy", { as })).status, 403);
    assert.equal((await w.call("GET", "/api/sessions/policy/preview?nhieuMay=", { as })).status, 403);
    assert.equal((await w.call("PUT", "/api/sessions/policy", { as, body: { thayDoi: [{ permissionCode: "SALES", multi: true, banDangXem: null }] } })).status, 403);
  }
  const rows = await docBan(w);
  assert.deepEqual(rows.map((r) => r.permissionCode), ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "INTERN", "DRIVER", "DRIVER_PARTNER", "HR"]);
  assert.ok(rows.every((r) => r.multi === false && r.banId === null));
  assert.equal(w.q("SELECT count(*) n FROM aut_session_policy")[0].n, 0, "403 không ghi gì");
});

test("§6 quy tắc 2 (AC6): SUPER_ADMIN, mã lạ → 400; xem trước SUPER_ADMIN → 400", async () => {
  const w = await setup();
  assert.equal((await luu(w, [{ permissionCode: "SUPER_ADMIN", multi: false, banDangXem: null }])).status, 400);
  assert.equal((await luu(w, [{ permissionCode: "BOSS", multi: true, banDangXem: null }])).status, 400);
  assert.equal((await w.call("GET", "/api/sessions/policy/preview?nhieuMay=SUPER_ADMIN", { as: SUP })).status, 400);
});

test("§6 quy tắc 5 (AC2, AC3): 'Bán hàng = Nhiều máy' → hai lần đăng nhập SALES cùng sống; đặt lại 'Một máy' → xem trước 1 máy/1 người, sau lưu còn đúng phiên mới nhất, máy kia 401 'Không còn quyền dùng nhiều máy'", async () => {
  const goi: unknown[] = [];
  const w = await setup({ ghiDe: { dongBangTin: async (_e: unknown, m: unknown) => void goi.push(m) } });
  assert.equal((await luu(w, [{ permissionCode: "SALES", multi: true, banDangXem: null }])).status, 200);
  const m1 = await dangNhap(w, "0900000001", "iPhone");
  const m2 = await dangNhap(w, "0900000001", "Windows");
  assert.equal((await me(w, m1)).status, 200, "máy 1 vẫn sống khi máy 2 vào");
  assert.equal((await me(w, m2)).status, 200);
  const xt = await w.call("GET", "/api/sessions/policy/preview?nhieuMay=", { as: SUP });
  assert.deepEqual(xt.json, { soPhien: 1, soNguoi: 1 });
  goi.length = 0;
  const r = await luu(w, [{ permissionCode: "SALES", multi: false, banDangXem: banCua(await docBan(w), "SALES") }]);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.soPhien, 1);
  assert.equal((await me(w, m1)).status, 401);
  assert.equal((await me(w, m2)).status, 200);
  assert.equal((await w.call("POST", "/api/auth/session-ended", { headers: { cookie: m1 } })).json.reason, "Không còn quyền dùng nhiều máy");
  await choMotNhip();
  const daDong = w.q("SELECT id FROM aut_session WHERE staff_id = ? AND end_reason = 'mat_mien'", SALES).map((x: any) => x.id);
  assert.deepEqual(goi, [{ phienKetThuc: daDong }], "đúng MỘT lời gọi cho cả danh sách");
});

test("AC4: Bán hàng + Kế toán, chỉ Kế toán Nhiều máy → được nhiều máy", async () => {
  const w = await setup();
  assert.equal((await luu(w, [{ permissionCode: "ACCOUNTING", multi: true, banDangXem: null }])).status, 200);
  const a = await dangNhap(w, "0900000002", "iPhone");
  const b = await dangNhap(w, "0900000002", "Windows");
  assert.equal((await me(w, a)).status, 200);
  assert.equal((await me(w, b)).status, 200);
});

test("§6 quy tắc 3 (AC7): hai lần lưu đè nhau từ cùng một bản → một 200, một 409; bên thua không ghi dòng nào, không đăng xuất máy nào", async () => {
  const w = await setup();
  assert.equal((await luu(w, [{ permissionCode: "SALES", multi: true, banDangXem: null }])).status, 200);
  const ban = banCua(await docBan(w), "SALES");
  const [x, y] = await Promise.all([
    luu(w, [{ permissionCode: "SALES", multi: false, banDangXem: ban }]),
    luu(w, [{ permissionCode: "SALES", multi: false, banDangXem: ban }, { permissionCode: "HR", multi: true, banDangXem: null }]),
  ]);
  assert.deepEqual([x.status, y.status].sort(), [200, 409]);
  const thua = x.status === 409 ? x : y;
  assert.match(thua.json.error.message, /Chính sách vừa được người khác đổi/);
  assert.equal(w.q("SELECT count(*) n FROM aut_session_policy WHERE valid_to_at IS NULL")[0].n, x.status === 200 ? 1 : 2);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'session_policy_changed'")[0].n, 2, "lần đầu + lần thắng; bên thua không có dòng nhật ký");
});

test("§6 quy tắc 6 + Review Focus 4: 50 tài khoản Đối tác hai máy → lô lưu có cùng số câu như 5 tài khoản; một lời gọi dongBangTin; mỗi người còn một phiên", async () => {
  const soCau: number[][] = [];
  for (const n of [5, 50]) {
    const goi: unknown[] = [];
    const w = await setup({ ghiDe: { dongBangTin: async (_e: unknown, m: unknown) => void goi.push(m) } });
    assert.equal((await luu(w, [{ permissionCode: "PARTNER", multi: true, banDangXem: null }])).status, 200);
    for (let i = 0; i < n; i++) {
      const id = `aaaaaaaa-0000-4000-8000-${String(i).padStart(12, "0")}`;
      seedStaff(w.sqlite, { id, phone: `0911${String(i).padStart(6, "0")}`, name: `Đối tác ${i}`, perms: ["PARTNER"] });
      for (const [k, t] of [["a", "2026-10-01T00:00:00.000Z"], ["b", "2026-10-01T01:00:00.000Z"]] as const) {
        w.sqlite.prepare(
          "INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by) " +
            "VALUES (?1, ?2, 'PIN', 0, NULL, 'Máy', NULL, NULL, ?3, ?3, ?4, NULL, NULL, NULL, ?2, ?3, NULL)",
        ).run(`${id}-${k}`, id, t, new Date(Date.now() + 86400_000).toISOString());
      }
    }
    const goc = w.env.DB.batch;
    const lo: number[] = [];
    w.env.DB.batch = async (stmts: unknown[]) => { lo.push(stmts.length); return goc(stmts); };
    const r = await luu(w, [{ permissionCode: "PARTNER", multi: false, banDangXem: banCua(await docBan(w), "PARTNER") }]);
    w.env.DB.batch = goc;
    assert.equal(r.status, 200, r.text);
    assert.deepEqual({ soPhien: r.json.soPhien, soNguoi: r.json.soNguoi }, { soPhien: n, soNguoi: n });
    soCau.push(lo);
    await choMotNhip();
    assert.equal(goi.filter((g: any) => "phienKetThuc" in g).length, 1);
    assert.equal(w.q("SELECT count(*) n FROM (SELECT staff_id FROM aut_session WHERE ended_at IS NULL GROUP BY staff_id HAVING count(*) > 1)")[0].n, 0);
  }
  assert.deepEqual(soCau[0], soCau[1], `số câu mỗi lô: ${JSON.stringify(soCau)}`);
});

test("§6 quy tắc 7 (AC11): nhật ký session_policy_changed im lặng, không tên/SĐT/IP; nới không đụng phiên", async () => {
  const w = await setup();
  const tk = await w.token(SALES);
  const truoc = w.q("SELECT id, single, updated_at FROM aut_session WHERE staff_id = ?", SALES);
  assert.equal((await luu(w, [{ permissionCode: "SALES", multi: true, banDangXem: null }])).status, 200);
  assert.deepEqual(w.q("SELECT id, single, updated_at FROM aut_session WHERE staff_id = ?", SALES), truoc, "nới không ghi gì lên phiên");
  const [d] = w.q("SELECT staff_id, detail FROM audit_log WHERE action = 'session_policy_changed'");
  assert.equal(d.staff_id, SUP);
  assert.equal(d.detail, "Bán hàng → Nhiều máy; đăng xuất 0 máy của 0 người");
  assert.doesNotMatch(d.detail, /0900|An\b|Chủ|\d+\.\d+\.\d+\.\d+/);
  void tk;
});
```

  (Thông điệp 409 và 403 dùng chữ của Step 3.) Chạy → FAIL (404 — route chưa có).
- [ ] **Step 2: Hàm công bố của `auth`** (`auth/index.ts`, cạnh `docChinhSachPhien`):

```ts
/**
 * Lô ghi chính sách (ADR-0085 đặc tả §4.2 bước 3.1): mỗi quyền đổi — có bản đang xem: [đóng đúng id → chèn sau đóng]; chưa có dòng: [chèn mới]. Lần lưu dựa
 * trên bản cũ làm CẢ lô lùi (laLoiChinhSachCu) — người gọi trả 409. Chưa chạy.
 */
export function luuChinhSachStatements(db: D1Database, v: { thayDoi: readonly SessionPolicyChange[]; at: string; by: string }): D1PreparedStatement[] {
  return v.thayDoi.flatMap((t) => {
    const moi = { id: crypto.randomUUID(), code: t.permissionCode, multi: t.multi, at: v.at, by: v.by };
    return t.banDangXem === null
      ? [insertPolicyNewStatement(db, moi)]
      : [closePolicyStatement(db, { id: t.banDangXem, code: t.permissionCode, at: v.at, by: v.by }), insertPolicyAfterCloseStatement(db, moi)];
  });
}
/** Siết theo tập (đặc tả §4.2 bước 3.3): [dọn hạn → siết (RETURNING id, staff_id) → đánh dấu một máy]. Nối SAU các câu ghi chính sách cùng lô. */
export function sietTheoTapStatements(db: D1Database, at: string, by: string): { statements: D1PreparedStatement[]; ketQua: (r: readonly D1Result[]) => { sessionIds: string[]; staffIds: string[] } } {
  return {
    statements: [endExpiredAllStatement(db, at), sietTheoTapStatement(db, at, by), danhDauMotMayTheoTapStatement(db, at, by)],
    ketQua: (r) => {
      const rows = (r.at(-2)?.results ?? []) as { id: string; staff_id: string }[];
      return { sessionIds: rows.map((x) => x.id), staffIds: [...new Set(rows.map((x) => x.staff_id))] };
    },
  };
}
export { demSietTheoTap, laLoiChinhSachCu } from "./repository";
```

- [ ] **Step 3: Ba route** — `src/modules/accounts/index.ts`, hằng lỗi cạnh `NOT_SESSION_ADMIN`:

```ts
// ADR-0085 Q1 điều 3: chính sách đăng nhập — chỉ Toàn quyền.
const NOT_SESSION_POLICY = () => error(403, "forbidden", "Chỉ người phụ trách hệ thống đặt được chính sách đăng nhập.");
const POLICY_STALE = () => error(409, "policy_stale", "Chính sách vừa được người khác đổi — tải lại.");
/** 9 dòng theo QUYEN_DAT_DUOC; quyền chưa có dòng = Một máy, banId null. */
const chinhSachDto = (rows: readonly { id: string; permissionCode: QuyenDatDuoc; multi: boolean }[]): SessionPolicyRowDto[] =>
  QUYEN_DAT_DUOC.map((c) => {
    const r = rows.find((x) => x.permissionCode === c);
    return { permissionCode: c, label: PERMISSION_LABEL[c], multi: r?.multi ?? false, banId: r?.id ?? null };
  });
```

  Route (cuối mảng `routes`, sau `POST /api/sessions/:id/revoke`):

```ts
    // ---- Chính sách đăng nhập (ADR-0085). Ở module accounts vì lưu ghi nhật ký session_policy_changed trong CÙNG lô (auth không import audit). ----
    route("GET", "/api/sessions/policy", "admin", async ({ env, staff }) => {
      if (!can(staff, "auth.session.policy")) return NOT_SESSION_POLICY();
      return json({ rows: chinhSachDto(await docChinhSachPhien(env.DB)) } satisfies SessionPolicyResponse);
    }),

    // Xem trước: số phiên sẽ kết thúc + số người nếu tập "Nhiều máy" thành đúng `nhieuMay` (cùng mẩu điều kiện SQL với lô siết thật).
    route("GET", "/api/sessions/policy/preview", "admin", async ({ env, url, staff }) => {
      if (!can(staff, "auth.session.policy")) return NOT_SESSION_POLICY();
      const tap = docTapNhieuMayThamSo(url.searchParams.get("nhieuMay"));
      if (!tap.ok) return error(400, "invalid_input", tap.message);
      return json((await demSietTheoTap(env.DB, tap.value, new Date().toISOString())) satisfies SessionPolicyPreviewResponse);
    }),

    route("PUT", "/api/sessions/policy", "admin", async (ctx) => {
      if (!can(ctx.staff, "auth.session.policy")) return NOT_SESSION_POLICY();
      const parsed = kiemThayDoiChinhSach((await readJson(ctx.request))?.thayDoi);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const db = ctx.env.DB;
      const at = new Date().toISOString(); // MỘT mốc cho dòng chính sách, nhật ký, phiên bị kết thúc
      const hienHanh = await docChinhSachPhien(db);
      // Siết khi có quyền chuyển sang Một máy. Số đếm cho nhật ký lấy bằng CÙNG câu với xem trước, ngay trước lô (auditStatement nhận chuỗi cố định); lệch với số
      // RETURNING thật (chỉ khi có đăng nhập chen giữa) → một dòng log cảnh báo không dữ liệu cá nhân. Ghi là lựa chọn bề mặt ở sổ thi công.
      const siet = parsed.value.some((t) => !t.multi);
      const dem = siet ? await demSietTheoTap(db, tapNhieuMaySau(hienHanh, parsed.value), at) : { soPhien: 0, soNguoi: 0 };
      const lo = siet ? sietTheoTapStatements(db, at, ctx.staff.id) : null;
      let kq: D1Result[];
      try {
        kq = await db.batch([
          ...luuChinhSachStatements(db, { thayDoi: parsed.value, at, by: ctx.staff.id }),
          auditStatement(db, { staffId: ctx.staff.id, action: "session_policy_changed", at, targetType: "staff", detail: moTaThayDoiChinhSach(parsed.value, dem) }),
          ...(lo?.statements ?? []),
        ]);
      } catch (e) {
        if (laLoiChinhSachCu(e)) return POLICY_STALE();
        throw e;
      }
      const ketThuc = lo ? lo.ketQua(kq) : { sessionIds: [], staffIds: [] };
      if (ketThuc.sessionIds.length !== dem.soPhien) {
        console.warn(JSON.stringify({ level: "warn", event: "session_policy_count_drift", estimated: dem.soPhien, actual: ketThuc.sessionIds.length }));
      }
      // ADR-0085 Q3: MỘT lời gọi cho cả danh sách — đóng Bảng tin + tắt thông báo CHỈ của các máy vừa bị kết thúc (máy giữ lại, đăng ký chưa gắn phiên không đụng).
      if (ketThuc.sessionIds.length) ctx.dongBangTin({ phienKetThuc: ketThuc.sessionIds });
      return json({ rows: chinhSachDto(await docChinhSachPhien(db)), soPhien: ketThuc.sessionIds.length, soNguoi: ketThuc.staffIds.length } satisfies SessionPolicySaveResponse);
    }),
```

  Import: `docChinhSachPhien, luuChinhSachStatements, sietTheoTapStatements, demSietTheoTap, laLoiChinhSachCu` từ `../auth`; `QUYEN_DAT_DUOC, docTapNhieuMayThamSo, kiemThayDoiChinhSach, moTaThayDoiChinhSach, tapNhieuMaySau, type QuyenDatDuoc` từ `../../shared/chinh-sach-dang-nhap`; `PERMISSION_LABEL` từ `../../shared/permissions`; các DTO từ `../../shared/contracts`. Nếu kiểu `AuditInput` đòi `targetId`, truyền `targetId: undefined` như `adminAudit`. **Bẫy thứ tự route:** router khớp `/api/sessions/policy` trước `/api/sessions/:id/revoke`? — khác phương thức/độ dài nên không đụng; vẫn chạy bài `route-access` để thấy.
- [ ] **Step 4: Hàng rào và ảnh chụp.**
  - `src/route-write-guard.test.ts:101`: `ADMIN_OPS` thêm `"auth.session.policy"` (ô chỉ Toàn quyền, hẹp hơn `admin.manage` — cùng khuôn hai ô `auth.session.*`; ghi chú dòng `// ADR-0085`). Đây là thêm ô được công nhận — **người kiểm độc lập xin soi** (như Task 7 Phần A).
  - `src/route-access.test.ts`: SNAPSHOT thêm `{ method: "GET", path: "/api/sessions/policy", access: "admin" }`, `{ method: "GET", path: "/api/sessions/policy/preview", access: "admin" }`, `{ method: "PUT", path: "/api/sessions/policy", access: "admin" }` (chú thích ADR-0085: thân hỏi `auth.session.policy`); tên bài 209 → 212; dòng lịch sử `2026-10-0x (ADR-0085): + 3 route chính sách đăng nhập = 212`.
  - `src/tat-thong-bao-dung-may.test.ts`: thêm dòng bảng ghim (b) của Task 5 Step 6.
  - `docs/quyen-hoan.json`: KHÔNG thêm mục (route ghi đã hỏi `can()` — mục sẽ là "hoãn thừa"; bộ kiểm `cua_ghi` từ chối mục cho route GET).
- [ ] **Step 5:** `node --test src/modules/accounts/chinh-sach-phien-route.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/tat-thong-bao-dung-may.test.ts` → PASS. `npm run typecheck` 0, `npm test` xanh.
- [ ] **Step 6: Quan sát chặn thật (P16)** — trên bản sao (`$TMPDIR/…bak`), lần lượt, ghi `not ok …` vào sổ, khôi phục sau mỗi lần:
  (a) `auth.session.policy` cột ADMIN = `any` ⇒ `chinh-sach-phien-route.test.ts` bài 403 ĐỎ;
  (b) route PUT gọi `ctx.dongBangTin({ staffId: ctx.staff.id, tatThongBao: true })` thay dạng `phienKetThuc` ⇒ `tat-thong-bao-dung-may.test.ts` ĐỎ ở bảng ghim;
  (c) `POL_INSERT_AFTER_CLOSE` bỏ `CASE WHEN changes() > 0 THEN ?2 END` (ghi `?2`) ⇒ `chinh-sach-repo.test.ts` bài kiểm phiên bản ĐỎ + bài route AC7 ĐỎ (hai 200).
- [ ] **Step 7: Commit** — `git add src/modules/accounts/index.ts src/modules/auth/index.ts src/modules/accounts/chinh-sach-phien-route.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/tat-thong-bao-dung-may.test.ts`; tiêu đề "Route chính sách đăng nhập: xem, xem trước, lưu có kiểm phiên bản + siết theo tập (ADR-0085)"; thân: "Toàn quyền đặt quyền nào Một máy / Nhiều máy; lưu all-or-nothing, 409 khi dựa trên bản cũ; siết một lô số câu cố định, một lời gọi tắt thông báo cho cả danh sách."

---

### Task 7: Bất biến cảnh báo `R-AUT-SESSION-3`

**Files:**
- Modify: `scripts/audit-checks.mjs` (sau `R-AUT-SESSION-2`, ~`:839`)
- Modify: `src/audit-invariants.test.ts` (sau khối `R-AUT-SESSION-*`, ~`:570`)

- [ ] **Step 1: Test đỏ** — thêm vào `src/audit-invariants.test.ts` (dùng `one()`, `violations()` và cách dựng CSDL của các bài `R-AUT-SESSION-*` sẵn có):

```ts
test("R-AUT-SESSION-3 (ADR-0085 điều 8): mức warn (không đỏ ở --strict — khe đăng nhập chạy đua đã biết)", () => {
  assert.equal(one("R-AUT-SESSION-3").level, "warn");
});

test("R-AUT-SESSION-3: tài khoản theo chính sách HIỆN HÀNH là một máy mà có > 1 phiên sống còn hạn là MỘT vi phạm; nhiều máy (chính sách / Toàn quyền), phiên hết hạn không tính", () => {
  const db = /* CSDL đủ migration như các bài R-AUT-SESSION trên */;
  // a: SALES, 2 phiên sống single=0 (đăng nhập chạy đua lúc chính sách cũ) → vi phạm
  // b: SALES + ACCOUNTING, chính sách ACCOUNTING = 1, 2 phiên sống → không
  // c: SUPER_ADMIN, 2 phiên sống → không
  // d: SALES, 1 phiên sống + 1 phiên ended_at NULL nhưng expires_at đã qua → không
  assert.equal(violations(db, one("R-AUT-SESSION-3")), 1, "đếm theo tài khoản");
});

test("R-AUT-SESSION-3 đếm cùng tập tài khoản với xem trước khi tập Nhiều máy = chính sách hiện hành (cùng mẩu điều kiện)", async () => {
  // Cùng CSDL bài trên: demSietTheoTap(fakeD1(db), ["ACCOUNTING"], now).soNguoi === violations(db, one("R-AUT-SESSION-3"))
});
```

  Viết phần chèn dữ liệu bằng các câu `INSERT` cụ thể (pty_party, staff, stf_permission, aut_session_policy, aut_session) như `chinh-sach-repo.test.ts` Task 3; bài đối chiếu import `demSietTheoTap` từ `./modules/auth/repository.ts` và một `fakeD1` tối thiểu (`prepare().bind().first()`). Chạy → FAIL (không có mã).
- [ ] **Step 2: Kiểm** — `scripts/audit-checks.mjs`:

```js
  // R-AUT-SESSION-3 (ADR-0085 điều 8): tài khoản theo CHÍNH SÁCH HIỆN HÀNH là một máy mà có > 1 phiên sống còn hạn. Khe đã biết: lần đăng nhập đọc chính sách cũ
  // "Nhiều máy" ngay trước lô siết → phiên mới single = 0; tự lành ở lần đăng nhập sau. Mức WARN (không đỏ ở --strict của e2e / cổng triển khai) — để thấy, không để chặn.
  // Mẩu điều kiện "được nhiều máy" CHÉP NGUYÊN VĂN `nhieuMayDieuKien` của src/modules/auth/repository.ts (bài đối chiếu ở src/audit-invariants.test.ts).
  {
    code: "R-AUT-SESSION-3",
    what: "tài khoản theo chính sách hiện hành là một máy mà có hơn một phiên sống",
    sql: `SELECT count(*) FROM (SELECT x.staff_id FROM aut_session x WHERE x.ended_at IS NULL AND x.expires_at > ${BAY_GIO_ISO}
          AND NOT (EXISTS (SELECT 1 FROM v_stf_nhieu_may_co_dinh f WHERE f.staff_id = x.staff_id)
               OR EXISTS (SELECT 1 FROM v_stf_quyen_mo q WHERE q.staff_id = x.staff_id AND q.permission_code IN
                          (SELECT p.permission_code FROM aut_session_policy p WHERE p.valid_to_at IS NULL AND p.multi = 1)))
          GROUP BY x.staff_id HAVING count(*) > 1)`,
    level: "warn",
  },
```

- [ ] **Step 3:** Chạy bài → PASS. `npm test` xanh.
- [ ] **Step 4: Quan sát (P16, mức cảnh báo)** — đổi `HAVING count(*) > 1` thành `> 5` ⇒ bài thuần ĐỎ → khôi phục. Ghi vào sổ.
- [ ] **Step 5: Commit** — `git add scripts/audit-checks.mjs src/audit-invariants.test.ts`; tiêu đề "Bất biến cảnh báo R-AUT-SESSION-3: một máy theo chính sách mà nhiều phiên sống (ADR-0085)"; thân: "Bắt khe đăng nhập chạy đua với lần lưu chính sách; mức cảnh báo vì khe đã được chủ chấp nhận và tự lành."

---

### Task 8: Giao diện — mục "Chính sách đăng nhập", câu ở trang Tôi, Trợ giúp, nhật ký phiên bản, kịch bản Chrome

**Files:**
- Create: `web/chinh-sach-dang-nhap-ui.ts`
- Modify: `web/sessions.ts:50-53` (gọi mục mới TRƯỚC nhánh `auth.session.viewAll`), `public/sessions.html` (khung `#policy-card`)
- Modify: `web/account.ts:431`
- Modify: `public/app.css` (chỉ khi cần — dùng lớp sẵn có `.card`, `.alert warn`, `.maint-confirm`, `.maint-actions`, `.btn`, `.check`; thêm luật chỉ bằng token)
- Modify: `src/shared/huong-dan-chung.ts:89-92, :134`, `src/shared/huong-dan-quan-tri.ts` (`:37`, `:41`, `:217`, `:232`, `:237-240`), `src/shared/huong-dan-nhan-su.ts:38`
- Modify: `src/shared/changelog.ts` (mục đầu mới), `src/shared/app-info.test.ts`
- Create: `docs/evidence/2026-10-01-chinh-sach-dang-nhap/kich-ban/chinh-sach.mjs`

**Interfaces:**
- Consumes: `GET/PUT /api/sessions/policy`, `GET /api/sessions/policy/preview` (Task 6); `thayDoiChinhSach`, `canCanhBaoBenNgoai`, `CANH_BAO_NHIEU_MAY_BEN_NGOAI`, `QUYEN_DAT_DUOC` (Task 2).
- Produces: `dungMucChinhSach(el: HTMLElement): Promise<void>` (web); chữ nút **"Lưu chính sách"**, **"Xác nhận lưu"**, **"Tất cả một máy"**, **"Tất cả nhiều máy"**, **"Thôi"** — Trợ giúp trỏ các nhãn này (bài A2).

- [ ] **Step 1: Đo trần A4 TRƯỚC khi sửa chữ** (ghi vào sổ):

```bash
node --input-type=module -e 'const m = await import("./src/shared/huong-dan.ts"); for (const n of m.HUONG_DAN) console.log(n.id, m.phutDoc(n), m.chuCuaNhom(n).reduce((a, s) => a + m.soChu(s), 0));'
```

  Lúc viết kế hoạch: `chung 9 1346`, `quan-tri 21 3150`, `nhan-su 5 604`. Ràng buộc: Phần chung ≤ 1350 chữ (giữ 9 phút) VÀ Quản trị ≤ 3150 chữ.
- [ ] **Step 2: Trợ giúp — sửa đúng các câu dưới (đã cân chữ):**
  - `huong-dan-chung.ts:90` — "Đăng nhập máy mới thì máy cũ tự đăng xuất (trừ IT, Toàn quyền)." → "Tuỳ quyền, đăng nhập máy mới thì máy cũ tự đăng xuất (do Toàn quyền đặt)." (14 → 14 chữ).
  - `huong-dan-chung.ts:134` — "**Đăng nhập hai máy được không?** Không, xem mục Mỗi tài khoản một máy." → "**Đăng nhập hai máy được không?** Tuỳ quyền, xem mục Mỗi tài khoản một máy." (+1).
  - `huong-dan-quan-tri.ts:37` — sau "Xem kỹ dòng **Sẽ thêm** và **Sẽ mất**." thêm " Đổi vai có thể đăng xuất máy thừa." (+7).
  - `huong-dan-quan-tri.ts:41` — ví dụ Ngọc → "> Ví dụ: Ngọc chuyển sang kế toán: bỏ Nhân viên kinh doanh, tick Kế toán, bấm Lưu." (−11).
  - `huong-dan-quan-tri.ts:217` — "Tạo tài khoản ở khung [[Thêm tài khoản]] của trang Quản lý tài khoản, cùng cách Hành chính nhân sự làm." → "Tạo tài khoản ở khung [[Thêm tài khoản]], như Hành chính nhân sự." (−7).
  - `huong-dan-quan-tri.ts:232` — xoá dòng ví dụ "> Ví dụ: gửi "Lịch nghỉ lễ" …" và dòng trống trước nó (−21).
  - `huong-dan-quan-tri.ts:240` (cuối mục "### Phiên đăng nhập") — thêm dòng: "- **Chính sách đăng nhập**: mỗi quyền chọn Một máy hoặc Nhiều máy (một quyền Nhiều máy là đủ); [[Lưu chính sách]], xem số máy sẽ đăng xuất, [[Xác nhận lưu]]." (+30).
  - `huong-dan-nhan-su.ts:38` — sau "Xem kỹ dòng **Sẽ thêm** và **Sẽ mất**." thêm " Đổi vai có thể đăng xuất máy thừa." (+7).
  Chạy lại lệnh đo Step 1: mong `chung` ≤ 1350, `quan-tri` ≤ 3150. Vượt → rút thêm trong CÙNG nhóm (không đổi ngưỡng bài), ghi lựa chọn vào sổ (bề mặt, đảo ngược được).
- [ ] **Step 3: Trang Tôi** — `web/account.ts:431`: "Mỗi tài khoản (trừ IT và Toàn quyền) chỉ đăng nhập trên một máy: đăng nhập máy mới thì máy cũ tự đăng xuất. Ứng dụng đã cài và Safari trên cùng một iPhone tính là hai máy." → "Tuỳ quyền, tài khoản chỉ đăng nhập trên một máy (do Toàn quyền đặt): đăng nhập máy mới thì máy cũ tự đăng xuất. Ứng dụng đã cài và Safari trên cùng một iPhone tính là hai máy." (giữ nguyên câu cuối — kịch bản Chrome Phần A khẳng định nó).
- [ ] **Step 4: Khung HTML** — `public/sessions.html`, ngay sau `<section id="secret" …>`:

```html
  <!-- web/chinh-sach-dang-nhap-ui.ts dựng mục này chỉ khi có ô auth.session.policy (ADR-0085) — hỏi ĐÚNG ô này, không dùng chung auth.session.viewAll. -->
  <section id="policy-card" class="card" hidden></section>
```

- [ ] **Step 5: Mục chính sách** — `web/chinh-sach-dang-nhap-ui.ts`:

```ts
// Mục "Chính sách đăng nhập" trên trang Phiên đăng nhập (ADR-0085; đặc tả §5). Toàn quyền chọn cho từng quyền Một máy / Nhiều máy; dòng Toàn quyền khoá cứng.
// Lưu: xem trước (số máy/số người) → hộp xác nhận TRONG TRANG (không confirm()) → PUT → tải lại. 409 → "Chính sách vừa được người khác đổi — đã tải lại".
// Người gọi đã hỏi can(staff, "auth.session.policy"); máy chủ vẫn kiểm lại.
import { ApiError, api, type Api } from "./api";
import { CANH_BAO_NHIEU_MAY_BEN_NGOAI, QUYEN_DAT_DUOC, canCanhBaoBenNgoai, isQuyenDatDuoc, thayDoiChinhSach, type QuyenDatDuoc } from "../src/shared/chinh-sach-dang-nhap";
import { h, replaceChildren } from "./dom";

export async function dungMucChinhSach(el: HTMLElement): Promise<void> {
  let rows: Api.SessionPolicyRowDto[] = [];
  let chon = new Map<QuyenDatDuoc, boolean>();
  let xemTruoc: Api.SessionPolicyPreviewResponse | null = null;
  let bao: { loai: "ok" | "loi"; chu: string } | null = null;
  let dangGui = false;

  async function tai(): Promise<void> {
    rows = (await api<Api.SessionPolicyResponse>("/api/sessions/policy")).rows;
    chon = new Map(rows.flatMap((r) => (isQuyenDatDuoc(r.permissionCode) ? [[r.permissionCode, r.multi] as [QuyenDatDuoc, boolean]] : [])));
    xemTruoc = null;
  }
  const nut = (label: string, onclick: () => void, cls: string): HTMLButtonElement => {
    const b = h("button", { type: "button", class: cls, disabled: dangGui }, label);
    b.addEventListener("click", onclick);
    return b;
  };
  const thayDoi = () => thayDoiChinhSach(rows, chon);

  async function bamLuu(): Promise<void> {
    if (dangGui || thayDoi().length === 0) return;
    dangGui = true;
    bao = null;
    render();
    try {
      const tap = QUYEN_DAT_DUOC.filter((c) => chon.get(c) === true).join(",");
      xemTruoc = await api<Api.SessionPolicyPreviewResponse>(`/api/sessions/policy/preview?nhieuMay=${encodeURIComponent(tap)}`);
    } catch (err) {
      bao = { loai: "loi", chu: err instanceof ApiError ? err.message : "Không kết nối được máy chủ." };
    } finally {
      dangGui = false;
      render();
    }
  }
  async function xacNhan(): Promise<void> {
    if (dangGui) return;
    dangGui = true;
    render();
    try {
      const r = await api<Api.SessionPolicySaveResponse>("/api/sessions/policy", { method: "PUT", body: { thayDoi: thayDoi() } satisfies Api.SessionPolicySaveRequest });
      bao = { loai: "ok", chu: `Đã lưu. Đã đăng xuất ${r.soPhien} máy của ${r.soNguoi} người.` };
      await tai();
    } catch (err) {
      if (err instanceof ApiError && err.code === "policy_stale") {
        await tai();
        bao = { loai: "loi", chu: "Chính sách vừa được người khác đổi — đã tải lại" };
      } else bao = { loai: "loi", chu: err instanceof ApiError ? err.message : "Không kết nối được máy chủ." };
    } finally {
      dangGui = false;
      xemTruoc = null;
      render();
    }
  }

  function dong(r: Api.SessionPolicyRowDto): HTMLElement {
    if (!isQuyenDatDuoc(r.permissionCode)) return h("tr", null);
    const code = r.permissionCode;
    const radio = (multi: boolean, label: string) => {
      const i = h("input", { type: "radio", name: `pol-${code}`, value: multi ? "1" : "0", checked: chon.get(code) === multi, disabled: dangGui });
      i.addEventListener("change", () => { chon.set(code, multi); xemTruoc = null; render(); });
      return h("label", { class: "check" }, i, label);
    };
    return h("tr", { "data-quyen": code }, h("td", null, r.label), h("td", null, radio(false, "Một máy")), h("td", null, radio(true, "Nhiều máy")));
  }

  function render(): void {
    const coDoi = thayDoi().length > 0;
    replaceChildren(
      el,
      h("h2", null, "Chính sách đăng nhập"),
      h("p", { class: "muted" }, "Mỗi quyền chọn Một máy (đăng nhập máy mới thì máy cũ tự đăng xuất) hoặc Nhiều máy. Tài khoản có một quyền Nhiều máy là được nhiều máy."),
      bao && h("div", { class: bao.loai === "ok" ? "alert ok" : "alert", role: bao.loai === "ok" ? "status" : "alert" }, bao.chu),
      h("table", { class: "items" },
        h("thead", null, h("tr", null, h("th", null, "Quyền"), h("th", null, ""), h("th", null, ""))),
        h("tbody", null, ...rows.map(dong),
          h("tr", { "data-quyen": "SUPER_ADMIN" }, h("td", null, "Toàn quyền"), h("td", { colSpan: 2, class: "muted" }, "Luôn nhiều máy · Vai IT luôn được nhiều máy")))),
      canCanhBaoBenNgoai(chon) && h("p", { class: "alert warn", "data-canh-bao": "ben-ngoai" }, CANH_BAO_NHIEU_MAY_BEN_NGOAI),
      h("div", { class: "maint-actions" },
        nut("Tất cả một máy", () => { for (const c of QUYEN_DAT_DUOC) chon.set(c, false); xemTruoc = null; render(); }, "btn"),
        nut("Tất cả nhiều máy", () => { for (const c of QUYEN_DAT_DUOC) chon.set(c, true); xemTruoc = null; render(); }, "btn"),
        coDoi && nut("Lưu chính sách", () => void bamLuu(), "btn btn-primary")),
      xemTruoc && h("div", { class: "maint-confirm", role: "group", "aria-label": "Xác nhận lưu chính sách" },
        h("p", null, h("strong", null, `Sẽ đăng xuất ${xemTruoc.soPhien} máy của ${xemTruoc.soNguoi} người. Lưu?`)),
        h("div", { class: "maint-actions" },
          nut("Xác nhận lưu", () => void xacNhan(), "btn btn-primary"),
          nut("Thôi", () => { xemTruoc = null; render(); }, "btn"))),
    );
    el.hidden = false;
  }

  try {
    await tai();
  } catch (err) {
    bao = { loai: "loi", chu: err instanceof ApiError ? err.message : "Không kết nối được máy chủ." };
  }
  render();
}
```

  Kiểm `web/api.ts` có hỗ trợ `body` đối tượng (đọc cách `staff.ts` gửi PUT) — dùng đúng khuôn đó; `Api.*` là không gian tên kiểu đang dùng ở `web/sessions.ts` (thêm các DTO mới nếu `Api` liệt kê tay). Nếu `h()` không nhận `false`/`null` làm con, lọc trước (đọc `web/dom.ts`).
- [ ] **Step 6: Nối vào trang** — `web/sessions.ts`, trước `if (!can(staff, "auth.session.viewAll")) {`:

```ts
// ADR-0085: mục "Chính sách đăng nhập" hỏi ĐÚNG ô của nó (luật 1.52) — không lồng trong nhánh auth.session.viewAll.
if (can(staff, "auth.session.policy")) void dungMucChinhSach(byId("policy-card"));
```

  và import `dungMucChinhSach` từ `./chinh-sach-dang-nhap-ui`.
- [ ] **Step 7: Nhật ký phiên bản** — `src/shared/changelog.ts`, mục ĐẦU mảng:

```ts
  {
    // Có migration 0067. Số "1.60" = mục đầu lúc lập kế hoạch (1.59) + 1 — KIỂM LẠI LÚC GỘP (nhánh khác gộp trước thì đánh lại số).
    version: "1.60",
    date: "<ngày thi công, YYYY-MM-DD>",
    items: [
      { kind: "moi", text: "Toàn quyền đặt được quyền nào chỉ đăng nhập một máy, quyền nào được nhiều máy, ở trang Phiên đăng nhập → Chính sách đăng nhập." },
      { kind: "doi", text: "Chuyển một quyền về Một máy thì các máy thừa đăng xuất ngay, giữ máy đăng nhập gần nhất. Đổi vai của một người cũng có thể đăng xuất máy thừa của họ." },
    ],
  },
```

  (Đọc kiểu `ChangeItem` để dùng đúng giá trị `kind`.) `src/shared/app-info.test.ts`: đổi số bản mong đợi theo mục mới.
- [ ] **Step 8:** `npm run build:web`; `npm run typecheck` 0; `node --test src/shared/huong-dan.test.ts src/shared/app-info.test.ts src/giao-dien-hoi-bang-quyen.test.ts` + mọi `src/**/tro-ly*.test.ts` (`node --test src/modules/tro-ly/*.test.ts src/shared/tro-ly*.test.ts` — tìm tên tệp bằng `ls`) → PASS, KHÔNG đổi ngưỡng bài nào (bài top-3 / C4 từng đổi số khi sửa chữ Trợ giúp — nếu đỏ, sửa CHỮ, ghi vào sổ). `npm test` xanh.
- [ ] **Step 9: Kịch bản Chrome** — `docs/evidence/2026-10-01-chinh-sach-dang-nhap/kich-ban/chinh-sach.mjs`, theo khuôn `docs/evidence/2026-10-01-dang-nhap-a/kich-ban/phien.mjs` (cùng `startEnv`, `env.as`, `env.sql`, `ok`, `sleep` từ `../../2026-09-20-a2/kich-ban/a2-cdp.mjs`; đọc đầu tệp mẫu để dùng đúng tên tài khoản `ACCOUNTS`):
  1. Toàn quyền (tài khoản chỉ Toàn quyền — miễn một máy, mở nhiều trang an toàn) mở `/sessions` ở 1040: thấy `#policy-card` với 9 dòng + dòng "Toàn quyền" chữ "Luôn nhiều máy"; chọn Đối tác = Nhiều máy → thấy `[data-canh-bao="ben-ngoai"]` đúng chữ đặc tả; bấm "Tất cả một máy" → dải cảnh báo biến mất; chọn Bán hàng = Nhiều máy → "Lưu chính sách" → hộp `.maint-confirm` "Sẽ đăng xuất 0 máy của 0 người. Lưu?" → "Xác nhận lưu" → báo "Đã lưu…"; `env.sql` thấy dòng `SALES multi=1`. Đếm `window.confirm` = 0 lần (gài hàm đếm như mẫu).
  2. Cùng trang ở 390: mục hiện, không cuộn ngang (`document.documentElement.scrollWidth <= innerWidth`).
  3. Chỉ Quản trị (cổng route "admin" có, ô không có) và Kế toán: mở `/sessions` → không có `#policy-card` hiện, không gọi `/api/sessions/policy` (theo dõi mạng như mẫu), không lỗi JS.
  4. Cuối kịch bản: khôi phục chính sách bằng API (GET bản đang có → PUT về Một máy với `banDangXem` vừa đọc) trong `finally`.
  Ảnh 01–04 vào `docs/evidence/2026-10-01-chinh-sach-dang-nhap/`. Chạy (gốc repo, sau `npm run build:web`): `CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-01-chinh-sach-dang-nhap/kich-ban/chinh-sach.mjs`. Chạy lại cả `docs/evidence/2026-10-01-dang-nhap-a/kich-ban/phien.mjs` (trang `/sessions` và câu trang Tôi đổi) và `help-smoke.mjs` (Trợ giúp + nhật ký phiên bản).
- [ ] **Step 10: Commit** — `git add web/chinh-sach-dang-nhap-ui.ts web/sessions.ts public/sessions.html web/account.ts src/shared/huong-dan-chung.ts src/shared/huong-dan-quan-tri.ts src/shared/huong-dan-nhan-su.ts src/shared/changelog.ts src/shared/app-info.test.ts docs/evidence/2026-10-01-chinh-sach-dang-nhap` (+ `public/app.css` nếu có sửa); tiêu đề "Giao diện chính sách đăng nhập trên trang Phiên đăng nhập, Trợ giúp, nhật ký 1.60 (ADR-0085)"; thân: "Toàn quyền cần chỗ đặt chính sách có xem trước số máy bị đăng xuất; Trợ giúp nói rõ luật một máy nay tuỳ quyền, giữ trần thời gian đọc."

---

### Task 9: e2e chính sách + đo 1000 tài khoản trên D1 local

**Files:**
- Create: `tests/e2e/chinh-sach-phien.mjs`
- Modify: `tests/e2e/run.mjs:38-40` (chú thích thứ tự + `ALL`), `:60-64` (`THOI_GIAN`)

- [ ] **Step 1: Kịch bản** `tests/e2e/chinh-sach-phien.mjs`:

```js
// E2E chính sách đăng nhập (ADR-0085; đặc tả §11 AC2–AC10). Đổi chính sách TOÀN HỆ THỐNG của D1 tạm ⇒ khôi phục trong `finally` (đặc tả §6 quy tắc 10);
// tài khoản thử dùng một lần (không đụng salesA/salesB dùng chung). Cookie lấy TƯỜNG MINH từ đăng nhập (không dựa helper tạo lại phiên).
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, call, gieoTaiKhoanLai, session, sql, sqlRows } from "./lib.mjs";

const SA = await session(ACCOUNTS.superAdmin);
const ADM = await session(ACCOUNTS.admin);
const HR = await session(ACCOUNTS.hr);
const ban = async () => (await call(SA, "GET", "/api/sessions/policy")).body.rows;
const banCua = (rows, c) => rows.find((r) => r.permissionCode === c).banId;
const luu = (thayDoi) => call(SA, "PUT", "/api/sessions/policy", { thayDoi });
async function dangNhapMay(tk, ua) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, "user-agent": ua, "cf-connecting-ip": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify({ phone: tk.phone, pin: tk.pin, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" }),
  });
  assert.equal(r.status, 200, `đăng nhập ${r.status}`);
  return r.headers.get("set-cookie").split(";")[0];
}
const ban0 = await ban(); // chính sách lúc vào kịch bản — khôi phục về đúng giá trị này
try {
  // 1. AC5: Quản trị, Nhân sự → 403
  for (const c of [ADM, HR]) {
    assert.equal((await call(c, "GET", "/api/sessions/policy")).status, 403);
    assert.equal((await call(c, "PUT", "/api/sessions/policy", { thayDoi: [{ permissionCode: "SALES", multi: true, banDangXem: null }] })).status, 403);
  }
  // 2. AC6: SUPER_ADMIN, mã lạ → 400
  assert.equal((await luu([{ permissionCode: "SUPER_ADMIN", multi: false, banDangXem: null }])).status, 400);
  assert.equal((await luu([{ permissionCode: "BOSS", multi: true, banDangXem: null }])).status, 400);
  console.log("✓ 403 Quản trị/Nhân sự; 400 SUPER_ADMIN/mã lạ");

  // 3. AC2: Bán hàng = Nhiều máy → hai máy cùng sống
  const X = await gieoTaiKhoanLai("Bán hàng thử chính sách", ["SALES"]);
  let r = await luu([{ permissionCode: "SALES", multi: true, banDangXem: banCua(await ban(), "SALES") }]);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const m1 = await dangNhapMay(X, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1");
  const m2 = await dangNhapMay(X, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0 Safari/537.36");
  assert.equal((await call(m1, "GET", "/api/auth/me")).status, 200, "máy 1 vẫn dùng được");
  assert.equal((await call(m2, "GET", "/api/auth/me")).status, 200);
  // Đăng ký thông báo hai máy (gắn phiên)
  const ep1 = `https://fcm.googleapis.com/fcm/send/e2e-cs-1-${Date.now()}`;
  const ep2 = `https://fcm.googleapis.com/fcm/send/e2e-cs-2-${Date.now()}`;
  assert.equal((await call(m1, "POST", "/api/account/thong-bao/may", { endpoint: ep1, thietBi: "Máy 1" })).status, 200);
  assert.equal((await call(m2, "POST", "/api/account/thong-bao/may", { endpoint: ep2, thietBi: "Máy 2" })).status, 200);
  console.log("✓ AC2: Bán hàng Nhiều máy — hai máy cùng sống");

  // 4. AC3: đặt lại Một máy — xem trước đúng số, sau lưu máy cũ 401 + lý do, thông báo máy cũ tắt (mat-mien), máy còn lại bật
  r = await call(SA, "GET", "/api/sessions/policy/preview?nhieuMay=");
  assert.deepEqual(r.body, { soPhien: 1, soNguoi: 1 });
  r = await luu([{ permissionCode: "SALES", multi: false, banDangXem: banCua(await ban(), "SALES") }]);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.soPhien, 1);
  assert.equal((await call(m1, "GET", "/api/auth/me")).status, 401);
  assert.equal((await call(m2, "GET", "/api/auth/me")).status, 200);
  assert.equal((await call(m1, "POST", "/api/auth/session-ended")).body.reason, "Không còn quyền dùng nhiều máy");
  await new Promise((ok) => setTimeout(ok, 500));
  const [d1] = await sqlRows(`SELECT revoked_at, revoke_reason FROM ntf_push_sub WHERE endpoint = '${ep1}'`);
  const [d2] = await sqlRows(`SELECT revoked_at FROM ntf_push_sub WHERE endpoint = '${ep2}'`);
  assert.equal(d1.revoke_reason, "mat-mien");
  assert.equal(d2.revoked_at, null, "máy giữ lại vẫn nhận thông báo");
  console.log("✓ AC3: siết — máy cũ 401 'Không còn quyền dùng nhiều máy', thông báo máy cũ tắt, máy giữ lại còn bật");

  // 5. AC7: hai lần lưu cùng bản → 200 + 409
  const b = banCua(await ban(), "HR");
  const [p, q] = await Promise.all([luu([{ permissionCode: "HR", multi: true, banDangXem: b }]), luu([{ permissionCode: "HR", multi: true, banDangXem: b }])]);
  assert.deepEqual([p.status, q.status].sort(), [200, 409]);
  console.log("✓ AC7: hai lần lưu đè nhau → 200 + 409");

  // 6. AC4: Bán hàng + Kế toán, chỉ Kế toán Nhiều máy → nhiều máy
  const Y = await gieoTaiKhoanLai("Bán hàng kế toán thử", ["SALES", "ACCOUNTING"]);
  assert.equal((await luu([{ permissionCode: "ACCOUNTING", multi: true, banDangXem: banCua(await ban(), "ACCOUNTING") }])).status, 200);
  const y1 = await dangNhapMay(Y, "iPhone A");
  const y2 = await dangNhapMay(Y, "Windows B");
  assert.equal((await call(y1, "GET", "/api/auth/me")).status, 200);
  assert.equal((await call(y2, "GET", "/api/auth/me")).status, 200);
  console.log("✓ AC4: một quyền Nhiều máy là đủ");

  // 7. AC9: Quản trị đổi vai Z (Kế toán → Nhân viên kinh doanh) → máy thừa đăng xuất ngay
  const Z = await gieoTaiKhoanLai("Kế toán thử đổi vai", ["ACCOUNTING"]);
  const z1 = await dangNhapMay(Z, "iPhone Z");
  const z2 = await dangNhapMay(Z, "Windows Z");
  r = await call(ADM, "PUT", `/api/staff/${Z.id}/roles`, { roles: ["SALES_STAFF"] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await call(z1, "GET", "/api/auth/me")).status, 401);
  assert.equal((await call(z2, "GET", "/api/auth/me")).status, 200);
  console.log("✓ AC9: Quản trị đổi vai → máy thừa đăng xuất ngay");

  // 8. AC10 / Review Focus 4: 1000 tài khoản Đối tác giả (hồ sơ đầy đủ — audit-invariants --strict), mỗi người 2 phiên sống → Đối tác về Một máy: một lô, đo giờ
  assert.equal((await luu([{ permissionCode: "PARTNER", multi: true, banDangXem: banCua(await ban(), "PARTNER") }])).status, 200);
  const at = new Date().toISOString();
  const at2 = new Date(Date.now() + 1000).toISOString(); // phiên thứ hai MỚI HƠN phiên thứ nhất (được giữ khi siết)
  const het = new Date(Date.now() + 86400_000).toISOString();
  const N = "WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1000)";
  await sql([
    `INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) ${N} SELECT 'pty-cs1000-' || i, 'PERSON', 'Đối tác thử ' || i, 1, '${at}', '${at}' FROM n;`,
    `INSERT INTO pty_person (party_id, given_name, created_at, updated_at) ${N} SELECT 'pty-cs1000-' || i, 'Thử ' || i, '${at}', '${at}' FROM n;`,
    `INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) ${N} SELECT 'ptr-cs1000-' || i, 'pty-cs1000-' || i, 'COLLABORATOR', '2026-01-01', '${at}', '${at}' FROM n;`,
    `INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) ${N} SELECT 'stf-cs1000-' || i, '', '0880' || substr('000000' || i, -6), 'x', 'sales', 1, '${at}', 'pty-cs1000-' || i FROM n;`,
    `INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) ${N} SELECT 'sp-cs1000-' || i, 'stf-cs1000-' || i, 'PARTNER', '${at}', '${at}', '${at}' FROM n;`,
    `INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by) ${N} SELECT 'ss-cs1000-a-' || i, 'stf-cs1000-' || i, 'PIN', 0, NULL, 'Máy', NULL, NULL, '${at}', '${at}', '${het}', NULL, NULL, NULL, 'stf-cs1000-' || i, '${at}', NULL FROM n;`,
    `INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by) ${N} SELECT 'ss-cs1000-b-' || i, 'stf-cs1000-' || i, 'PIN', 0, NULL, 'Máy', NULL, NULL, '${at2}', '${at2}', '${het}', NULL, NULL, NULL, 'stf-cs1000-' || i, '${at2}', NULL FROM n;`,
  ].join(" "));
  const t0 = Date.now();
  r = await luu([{ permissionCode: "PARTNER", multi: false, banDangXem: banCua(await ban(), "PARTNER") }]);
  const ms = Date.now() - t0;
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.soNguoi >= 1000, true);
  const [con] = await sqlRows("SELECT count(*) AS n FROM (SELECT staff_id FROM aut_session WHERE staff_id LIKE 'stf-cs1000-%' AND ended_at IS NULL GROUP BY staff_id HAVING count(*) > 1)");
  assert.equal(con.n, 0, "mỗi tài khoản còn đúng một phiên");
  console.log(`✓ AC10: siết 1000 tài khoản Đối tác — một lô, ${ms} ms, ${r.body.soPhien} máy / ${r.body.soNguoi} người`);
} finally {
  // Khôi phục chính sách lúc vào kịch bản: đọc bản HIỆN TẠI (lấy banId mới) rồi đặt lại từng quyền khác ban0.
  const hien = await ban();
  const thayDoi = hien.filter((h) => h.multi !== ban0.find((b) => b.permissionCode === h.permissionCode).multi)
    .map((h) => ({ permissionCode: h.permissionCode, multi: ban0.find((b) => b.permissionCode === h.permissionCode).multi, banDangXem: h.banId }));
  if (thayDoi.length) {
    const k = await luu(thayDoi);
    assert.equal(k.status, 200, `khôi phục chính sách: ${JSON.stringify(k.body)}`);
  }
  console.log("✓ đã khôi phục chính sách");
}
```

  Ghi chú cho người thi công: (a) `wrangler d1 execute --command` nhận nhiều câu nối bằng `;` — nếu bản wrangler đang dùng từ chối, gọi `sql()` từng câu; (b) đọc chữ ký `call()` của `lib.mjs` (thân là đối số thứ tư) và `gieoTaiKhoanLai` (trả `{ id, partyId, phone, pin, cookie }`) — `session({ phone, pin })` bên trong đã đăng nhập một lần, nên hai lần `dangNhapMay` sau đó là máy 2 và 3: điều chỉnh khẳng định "máy 1/máy 2" theo đúng thứ tự (máy cũ nhất bị kết thúc trước); (c) nếu `audit-invariants --strict` cuối nhóm báo vi phạm do dữ liệu 1000 tài khoản (vd thiếu cột hồ sơ), bổ sung đúng cột theo lời báo — KHÔNG nới bất biến.
- [ ] **Step 2: Đăng ký** — `tests/e2e/run.mjs`: thêm `"chinh-sach-phien"` vào `ALL` ngay TRƯỚC `"phien"`; chú thích: `// "chinh-sach-phien" (ADR-0085) đứng TRƯỚC "phien": đổi chính sách toàn hệ thống rồi KHÔI PHỤC ở finally; tài khoản thử dùng một lần + 1000 tài khoản Đối tác giả (hồ sơ đầy đủ).`; `THOI_GIAN` thêm `"chinh-sach-phien": 30`.
- [ ] **Step 3:** `npm run test:e2e -- chinh-sach-phien phien passkey` → xanh (cần mạng). Ghi số ms của AC10 vào sổ. Rồi `npm run test:e2e` đủ bộ → xanh, ba nhóm `audit-invariants` có `✓ R-AUT-SESSION-1/2` và dòng cảnh báo/✓ `R-AUT-SESSION-3`.
- [ ] **Step 4: Quan sát chặn thật (P16, e2e)** — tạm bỏ khối `finally` khôi phục, chạy `npm run test:e2e -- chinh-sach-phien phien` → `phien` PHẢI ĐỎ (chính sách "Nhiều máy" còn sót làm khẳng định "máy 1 bị đá" sai) — chứng minh khôi phục là cần; hoàn nguyên. Ghi vào sổ.
- [ ] **Step 5: Commit** — `git add tests/e2e/chinh-sach-phien.mjs tests/e2e/run.mjs`; tiêu đề "e2e chính sách đăng nhập + đo siết 1000 tài khoản Đối tác (ADR-0085)"; thân: "Chứng minh trên D1 thật: hai máy khi Nhiều máy, siết giữ máy mới nhất, 409 khi lưu đè, đổi vai đăng xuất máy thừa; khôi phục chính sách để kịch bản sau không bị nới luật."

---

### Task 10: Sổ hàng rào, tài liệu, chạy đủ

**Files:**
- Modify: `docs/SO-HANG-RAO.md` (dòng `:327` "Mất miễn…", dòng `:141` ADR-0046, thêm dòng mới)
- Modify: `docs/SYSTEM-DESIGN.md` (§4 sổ phiên, §5 bảng + migration 0067 + view, §8 ô quyền, bảng API)
- Modify: `docs/CHANGE-GUIDE.md` (công thức z8 thêm mục "chính sách đăng nhập"; bẫy 57 thêm câu)
- Modify: `docs/data-dictionary.json` (cột `ntf_push_sub.revoke_reason` thêm `mat-mien`) + `npm run dict`
- Modify: sổ thi công

- [ ] **Step 1: Sổ hàng rào** — mỗi dòng ghi đúng ngày + đột biến + thông báo đỏ ĐÃ quan sát ở Task 4/6/7/9 (dùng lại nguyên văn từ sổ thi công):
  - Viết lại dòng "Mất miễn một máy…" (`:327`): tên "Mất nhiều máy khi đổi quyền/vai → chỉ còn phiên còn hạn mới nhất (**ADR-0085 Q2 điều 7**, thay ADR-0075 điều 3)"; cơ chế "câu phiên ở LÔ THỨ HAI, chỉ chạy khi lô đổi quyền/vai đã thắng câu chốt; không còn điều kiện SQL `NOT EXISTS v_stf_toan_quyen`"; quan sát = đột biến Task 4 Step 8; ghi chú giữ "vai IT hết hạn theo ngày" + thêm "lô thứ hai không nguyên tử với lô quyền: lô hai hỏng ⇒ phiên thừa sống tới lần đăng nhập sau, R-AUT-SESSION-3 thấy".
  - Dòng `:141` (ADR-0046): thêm "**ADR-0085 Q3 (NỚI có chủ đích, CHỦ ĐÃ DUYỆT 2026-10-01 — ADR-0085 điều 11):** dạng `{ phienKetThuc }` không `staffId`, chỉ `PUT /api/sessions/policy`, nhãn `"chỉ-phiên danh sách"`; P16 = Task 6 Step 6 (b)".
  - Dòng mới "Ô `auth.session.policy` chỉ Toàn quyền + route hỏi `can()`" — quan sát Task 6 Step 6 (a).
  - Dòng mới "Lưu chính sách all-or-nothing (`policy_insert_after_close` + chỉ mục `aut_session_policy_one_current`)" — quan sát Task 6 Step 6 (c) + `src/migrations-aut-session-policy.test.ts` (c): bỏ `WHERE valid_to_at IS NULL` của chỉ mục ⇒ bài (c) đỏ (`UNIQUE` khi chèn dòng mới sau khi đóng) → khôi phục — CHẠY đột biến này ở bước này và ghi.
  - Dòng mới "Khôi phục chính sách ở `finally` của e2e" — quan sát Task 9 Step 4.
  - Dòng mới "`R-AUT-SESSION-3` (cảnh báo)" — quan sát Task 7 Step 4; ghi rõ "mức cảnh báo — KHÔNG chặn".
- [ ] **Step 2: Tài liệu mô tả** (thua mã — sửa theo mã): `SYSTEM-DESIGN.md` §4 (đoạn "miễn một máy" → "được nhiều máy theo chính sách; Toàn quyền/IT khoá cứng; siết theo tập; đổi quyền/vai lô thứ hai"), §5 (dòng `aut_session_policy`, hai view, dòng migration 0067), §8 (ô `auth.session.policy`), bảng API (+3 route); `CHANGE-GUIDE.md` z8 (+ "đổi chính sách: một mẩu điều kiện `nhieuMayDieuKien` cho siết/đánh dấu/đếm và R-AUT-SESSION-3 — sửa một chỗ phải sửa cả bất biến; lưu all-or-nothing; dạng `phienKetThuc`"), bẫy 57 (+ "khung thử `token()` đọc chính sách thật — bài đặt chính sách TRƯỚC khi lấy token"). `data-dictionary.json`: ghi chú `ntf_push_sub.revoke_reason` thêm `mat-mien` (lưu chính sách); `npm run dict`.
- [ ] **Step 3: Chạy đủ** (ghi số vào sổ): `npm run typecheck` (0), `npm test` (cả bước đo giờ hook — lúc máy rảnh), `npm run build:web`, `npm run test:e2e` (đủ bộ), `node scripts/audit-invariants.mjs --db local` (ghi: D1 local rỗng đỏ sẵn `R-N1-5` — lượt có nghĩa là ba lượt của e2e).
- [ ] **Step 4: Câu chờ chủ** (gom vào sổ, KHÔNG tự quyết): (1) đề xuất dòng bẫy CLAUDE.md §10 (N9 — chỉ đề xuất):

```diff
+- **Chính sách đăng nhập** (ADR-0085, migration `0067`): "được nhiều máy" = Toàn quyền / vai IT / một quyền mà `aut_session_policy` đặt Nhiều máy — MỘT mẩu SQL `nhieuMayDieuKien` (auth/repository.ts) dùng cho siết, đánh dấu, xem trước và chép ở `R-AUT-SESSION-3`; `isSingleDevice` là bản TS (tham số chính sách bắt buộc). Đổi quyền/vai: câu phiên ở lô thứ hai sau câu chốt. Lưu chính sách all-or-nothing (409 `policy_stale`). e2e đổi chính sách phải khôi phục ở `finally`. Chi tiết: `docs/CHANGE-GUIDE.md` công thức z8.
```

  (1b) đề xuất dòng cho bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" của `web/CLAUDE.md`: `| Mục "Chính sách đăng nhập" ở /sessions: web/chinh-sach-dang-nhap-ui.ts, src/shared/chinh-sach-dang-nhap.ts, khung #policy-card của public/sessions.html | chinh-sach.mjs ở docs/evidence/2026-10-01-chinh-sach-dang-nhap/kich-ban/ + phien.mjs ở docs/evidence/2026-10-01-dang-nhap-a/kich-ban/ |`; (2) số bản 1.60 + migration 0067 kiểm lại lúc gộp; (3) cách điền số máy/số người trong nhật ký (đếm ngay trước lô) — lựa chọn bề mặt, đổi được.
- [ ] **Step 5: Commit** — `git add docs/SO-HANG-RAO.md docs/SYSTEM-DESIGN.md docs/CHANGE-GUIDE.md docs/data-dictionary.json docs/DATA-DICTIONARY.md docs/superpowers/plans/2026-10-01-chinh-sach-dang-nhap-thi-cong-nhat-ky.md`; tiêu đề "Sổ hàng rào, tài liệu cho chính sách đăng nhập (ADR-0085)"; thân: "Hàng rào chỉ được tin khi có ngày quan sát chặn thật; dòng 'mất miễn' đổi cơ chế từ điều kiện SQL sang thứ tự lô."

---

### Task 11: Kiểm độc lập (chỉ đọc) — `nguoi-kiem-doc-lap`

**Files:** không sửa (người kiểm chỉ báo cáo).

- [ ] **Step 1:** Điều phối gọi subagent `nguoi-kiem-doc-lap` với yêu cầu: đọc đặc tả + ADR-0085 + kế hoạch này + `git diff main...HEAD`; tự chạy `npm run typecheck`, `npm test`, `npm run test:e2e -- chinh-sach-phien phien passkey admin`; làm lại ÍT NHẤT ba đột biến trên bản sao (Task 4 Step 8; Task 6 Step 6 (b); Task 7 Step 4) và một đột biến TỰ CHỌN; soi riêng: (a) `ADMIN_OPS` thêm ô; (b) ngoại lệ `"chỉ-phiên danh sách"` của hàng rào ADR-0046; (c) view `v_stf_nhieu_may_co_dinh` đọc `pty_party_role` trong migration (lệch kế thừa có tên); (d) e2e khôi phục chính sách; (e) đối chiếu từng mục §11 của đặc tả với bài kiểm.
- [ ] **Step 2:** Ghi kết luận vào sổ thi công. "ĐẠT CÓ ĐIỀU KIỆN"/"KHÔNG ĐẠT" → mỗi mục một vòng sửa (phiên thi công mới), rồi gọi lại người kiểm cho phần sửa (người thi công không tự nghiệm thu — N8).
- [ ] **Step 3:** Báo chủ theo 4 mục (Đã làm — Đã kiểm — Chưa làm/chưa kiểm — Cần bạn quyết), kèm lệnh `npm run day-len -- chinh-sach-dang-nhap` và dòng "chạy `npm run trien-khai`" (đổi app + migration) — KHÔNG tự chạy.

---

## Tự rà kế hoạch (writing-plans Self-Review)

**1. Phủ đặc tả:**

| Đặc tả | Task |
|---|---|
| §2 định nghĩa, 9 mã, bảng trống = Một máy | 1, 2 |
| §3 bảng, chỉ mục, không JSON, `single` là trạng thái thi hành, từ điển | 1, 3 (đánh dấu `single` trên phiên sống), 10 |
| §4.1 đọc mỗi lần cấp phiên, không lưu đệm | 4 Step 4(b) |
| §4.2 bước 1–6 (cổng, kiểm phiên bản, lô, nhật ký im lặng, siết theo tập qua view, nới không ghi, một lần `dongBangTin`, số câu cố định, `json_each`) | 2, 3, 5, 6 |
| §4.3 xem trước + hộp xác nhận trong trang | 3 (`demSietTheoTap`), 6, 8 |
| §4.4 đổi quyền/vai: cùng bản chính sách, lô thứ hai, bỏ `KHONG_TOAN_QUYEN`/`requireToanQuyen`, giữ "giữ-phiên", nới không ghi | 3, 4 |
| §4.5 khe chạy đua → `R-AUT-SESSION-3` | 7 |
| §5 giao diện (ô riêng, 9 dòng + Toàn quyền khoá, nút Tất cả, cảnh báo Đối tác, xem trước → xác nhận, 409, Trợ giúp, trần A4) | 8 |
| §6 quy tắc 1–10 | 1: 6; 2: 1, 2, 6; 3: 3, 6, 9; 4: 4; 5: 6, 9; 6: 3, 6, 9; 7: 2, 6; 8: 5; 9: 7; 10: 9 |
| §7 hàng rào phải đổi | 5, 6 (tat-thong-bao), 4 + 10 (dòng mất miễn), 2 (session-ledger.test) |
| §8 tuần tự với Phần B | đầu kế hoạch |
| §9 đo 1000 tài khoản | 9 |
| §11 AC1–AC12 | AC1: 9 Step 3 (`phien` cũ xanh không sửa); AC2–4: 6, 9; AC5: 6, 8, 9; AC6: 2, 6, 9; AC7: 6, 9; AC8: 4; AC9: 4, 9; AC10: 3, 6, 9; AC11: 6; AC12: 7, 8, 10 |

**2. Không giữ chỗ:** Hai chỗ kế hoạch CHỦ Ý để người thi công đọc mã rồi viết (không đoán tên hàm phụ): thân bài `tatMayCuaCacPhienStatement` ở Task 5 Step 1 (dùng hàm phụ có sẵn của `may-theo-phien.test.ts`) và cách xuất hàm tiêm mặc định ở Task 5 Step 4 (cấu trúc `src/index.ts`) — mỗi chỗ có khẳng định cụ thể phải đạt. Task 7 Step 1 phần chèn dữ liệu theo khuôn Task 3 (đã có mã đủ). Task 9 ghi chú (b) yêu cầu đọc thứ tự máy của `gieoTaiKhoanLai` (hàm đó đã đăng nhập một lần) để đặt đúng khẳng định "máy cũ nhất bị kết thúc".

**3. Nhất quán tên:** `isSingleDevice(perms, roles, nhieuMay)` (T2) ← T3 test, T4 harness/index; `docTapNhieuMay`, `docChinhSachPhien` (T4) ← T6; `luuChinhSachStatements`, `sietTheoTapStatements` (T6 auth) dùng `closePolicyStatement`, `insertPolicyAfterCloseStatement`, `insertPolicyNewStatement`, `endExpiredAllStatement`, `sietTheoTapStatement`, `danhDauMotMayTheoTapStatement` (T3); `{ phienKetThuc }` (T5) ← T6; `tatMayCuaCacPhienStatement` (T5); DTO `SessionPolicy*` (T2) ← T6, T8; nút "Lưu chính sách", "Xác nhận lưu" (T8 UI) ← T8 Trợ giúp.

**4. Review Focus:** 5 mục chính + mục 6 (trần A4) đều có bài ở task sở hữu: 1 → T4 bài AC8 + đột biến; 2 → T3 bài kiểm phiên bản + T6 bài AC7; 3 → T7; 4 → T3 (5 vs 50), T6 (50, một lời gọi), T9 (1000); 5 → T5 (SQL + dây thật), T6 bài AC3 (một lời gọi), T9 (mat-mien / máy giữ lại bật); 6 → T8 Step 1–2.

**Lệch / bổ sung so với đặc tả (người thi công ghi vào sổ, người kiểm xin soi):**
- Đặc tả §4.2 bước 3.1 nói "câu thua → 409", §4.2 bước 3.3 nói câu siết "tính theo chính sách thật đang lưu nếu câu đóng/chèn thua". Kế hoạch đọc là **all-or-nothing**: câu thua gây lỗi ràng buộc, CẢ lô lùi (không ghi nửa chừng, không siết, không nhật ký) → 409. Chặt hơn, khớp "cả lô trả 409" và tiêu chí AC7.
- Số máy/số người trong nhật ký: `auditStatement` nhận chuỗi cố định nên số lấy bằng câu đếm xem trước NGAY TRƯỚC lô; lệch với số thật (chỉ khi có đăng nhập chen giữa) → một dòng log cảnh báo không dữ liệu cá nhân. Phản hồi PUT trả số THẬT. Bề mặt, đổi được.
- Lý do tắt thông báo mới `mat-mien` (đặc tả không đặt tên; Phần A dùng `bi-thay` cho mất miễn qua đổi quyền/vai — giữ nguyên ở hai route đó).
- Hai view `v_stf_*` mới (đặc tả nói "đọc qua view của module staff" nhưng chưa có view phù hợp); view vai IT đọc `pty_party_role` trong migration — lệch kế thừa có tên của ADR-0075 điều 3.
