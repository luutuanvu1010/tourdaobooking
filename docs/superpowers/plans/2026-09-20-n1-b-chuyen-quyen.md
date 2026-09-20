# N1-B — Chuyển quyền, giao diện, trang Hồ sơ/Địa điểm, kiểm toán bất biến và phát hành 2 — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển toàn bộ đọc/ghi `staff.role`/`staff.full_name` sang quyền (`stf_permission`) và hồ sơ (`pty_*`) trên máy chủ, scripts, e2e và giao diện; thêm trang Hồ sơ và Địa điểm, kiểm toán bất biến D1 và tài liệu — hoàn tất lần phát hành 1 của N1; kèm task riêng cho lần phát hành 2 (`0013` siết).

**Architecture:** Đổi hợp đồng `StaffProfile.role → permissions` là MỘT task nguyên khối (B1) vì tách nhỏ hơn để `tsc`/e2e đỏ giữa chừng; đọc tên/quyền của người dùng bằng MỘT truy vấn D1 mỗi request; đọc nhãn xuyên module chỉ qua view công bố; migration siết `0013` tách hẳn ra lần phát hành 2.

**Tech Stack:** TypeScript, Cloudflare Workers + D1, esbuild (web), `wrangler dev` cho e2e, Chrome headless qua CDP (kiểm giao diện, tệp tạm không commit).

**Spec:** `docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md` (đã duyệt 2026-09-20) và ADR-0001…0008 (`docs/adr/`).

**Điều kiện:** kế hoạch A (`docs/superpowers/plans/2026-09-20-n1-a-nen-du-lieu.md`, T0–T8) đã xong trên cùng nhánh: `npm test` xanh, `npm run test:e2e` = 9/9. **Task B5 là lần phát hành 2** — chỉ làm sau khi chủ dự án đã áp `0009…0012` lên remote, triển khai Worker N1 và xác nhận chạy ổn; nó KHÔNG chạy cùng đợt với B1–B4.

**Cách kiểm chứng kế hoạch này (đã làm khi soạn):** mọi thao tác trong kế hoạch (ghi tệp, thay chuỗi, chạy lệnh, cả các bước "phải đỏ") đã được **áp dụng thật** vào một worktree sạch tạo từ nền T0 và các lệnh kiểm ở cuối mỗi task đã chạy; các con số ghi "lần kiểm khi soạn" là kết quả thật của lần chạy đó. Mã trong kế hoạch là mã đã chạy được — nếu một bước lệch với thực tế, đó là dấu hiệu nền đã đổi (báo người điều phối), không phải để tự đoán lại.

## Global Constraints

- **Ngôn ngữ:** tài liệu, chú thích, thông báo lỗi trả cho người dùng, nhật ký, giao diện — tiếng Việt ĐẦY ĐỦ DẤU; định danh mã, mã lỗi (`invalid_input`, `stale`…), tên bảng/cột — tiếng Anh.
- **Node:** môi trường soạn kế hoạch Node 22.22.3 (`node --test` chạy trực tiếp `.ts`; `node:sqlite` cho test schema — có cảnh báo "ExperimentalWarning", bình thường). Test chạy bằng `npm test` (= `node --test "src/**/*.test.ts"`).
- **Import:** tệp thuần (`rules.ts`, `src/shared/*`) và `repository.ts` của **module nghiêm** (`locations`, `parties`, `staff`) import bằng đuôi `.ts` tường minh (để `node --test` và bài kiểm kiến trúc nạp được); `index.ts` và tệp của module cũ không đuôi.
- **Ranh giới module** (ADR-0002, `docs/ARCHITECTURE.md`): module khác chỉ import `index.ts`; `src/shared/` và `web/` không import `src/modules/`; chiều phụ thuộc cho phép ở `ALLOWED_EDGES` (`src/architecture.test.ts`), không vòng.
- **SQL của module nghiêm:** đăng ký bằng `defineSql`, **tĩnh** (tham số tuỳ chọn viết `?N IS NULL OR …`, không ghép chuỗi theo đầu vào); đọc xuyên module CHỈ qua view công bố `v_<tiền tố>_<tên>`; ghi xuyên module = nhận câu lệnh chưa chạy từ `index.ts` của module chủ rồi gộp vào một `db.batch()`.
- **Bảng mới** (ADR-0003): tiền tố `pty_`/`loc_`/`stf_`; cột `created_at`/`updated_at` (TEXT NOT NULL, ISO-8601 UTC) và `created_by`/`updated_by` (TEXT **NULL**, **không** khoá ngoại; NULL = hệ thống); bảng tra cứu khoá chính `code` TEXT; khoá ngoại `NO ACTION`, cấm `ON DELETE CASCADE`; không xoá cứng (đóng hiệu lực hoặc `active = 0`); ngày dân sự `YYYY-MM-DD` giờ Việt Nam qua `vnToday(new Date())` (không dùng `date('now')` cho "hôm nay").
- **Migration:** chỉ thêm tệp mới, không sửa tệp đã áp; `0009…0012` là migration MỞ RỘNG (mã cũ vẫn chạy); **`0013` (siết) KHÔNG được có mặt trong `migrations/` trước Task B5** — `wrangler d1 migrations apply` áp mọi migration chưa áp.
- **Nhật ký:** không ghi SĐT, email, MST (chỉ tên/loại/mã); mọi hành động mới khai ở `src/shared/audit-actions.ts`.
- **Quyền:** bản đồ quyền → thao tác (ADR-0007) chỉ ở `src/shared/permissions.ts`; quyền app (SALES/ACCOUNTING/ADMIN/FIELD) ≠ vai trò hồ sơ — vai trò hồ sơ (HDV, tài xế…) không bao giờ là điều kiện cho phép (R-N1-12).
- **Cột chết:** `staff.role` chỉ được GHI hằng `'sales'`, `staff.full_name` chỉ được GHI `''` (ADR-0005; R-N1-14); không SQL nào đọc chúng.
- **Kiểm tra chuẩn:** `npm test`; `npx tsc --noEmit` (sạch); `npx tsc --noEmit -p web --pretty false` = **đúng 4 lỗi A2 đã biết** (`web/order-form.ts` 101,5 và 124,22; `web/order.ts` 44,22 và 44,33) — KHÔNG sửa; `npm run test:e2e` (cần mạng: Sheet thật).
- **Tệp tạm:** các bước "Tạo tệp tạm `$TMPDIR/…`" dùng thư mục tạm của phiên (macOS đặt sẵn `$TMPDIR`; nếu trống, dùng `export TMPDIR=$(mktemp -d)`). Tệp tạm nằm NGOÀI repo và KHÔNG được commit. Lệnh chạy chúng luôn từ gốc repo.
- **Phạm vi cấm:** không đẩy lên GitHub, không merge vào `main`, không triển khai (chủ dự án tự làm — `docs/HANDOFF-N1.md`); không sửa ADR/đặc tả đã duyệt (chỉ đính chính lỗi thực tế và báo chủ dự án); không đụng `orders` ngoài chỗ kế hoạch nêu.
- **Commit:** một commit mỗi task, thông điệp tiếng Việt như trong bước Commit, kèm dòng đồng tác giả theo môi trường.

## Bản đồ tệp

| Tệp | Trách nhiệm |
|---|---|
| `src/modules/staff/{repository,index,rules}.ts` | tài khoản + quyền: một truy vấn kèm tên/quyền, `createAccountStatements`, `setPermissionStatements`, luật admin cuối; **module nghiêm** |
| `src/modules/accounts/index.ts` | route quản trị tài khoản (`PATCH`, `PUT …/permissions`, tạo, Sheet, PIN) |
| `src/shared/{contracts,router}.ts` | `StaffProfile.permissions`; `access: "office"` |
| `src/modules/{orders,catalog,audit}/…` | quyền theo ADR-0007; đọc nhãn qua view; `insertRow` union literal |
| `scripts/{staff-lib,create-staff,import-staff,audit-invariants}.mjs` | tạo tài khoản kèm hồ sơ + quyền; kiểm toán bất biến D1 |
| `web/{shell,account,staff,audit,catalog,parties,locations}.ts`, `public/{staff,parties,locations}.html` | giao diện theo quyền; hai trang mới |
| `tests/e2e/{admin,admin-race,orders,permissions,lib,run}.mjs` | e2e theo quyền |
| `docs/{ARCHITECTURE,SPEC-tourdao-sales,HANDOFF-M4,HANDOFF-N1}.md` | tài liệu và runbook triển khai hai lần phát hành |
| `migrations/0013_staff_party_required.sql`, `src/migrations-0013.test.ts` | **chỉ ở lần phát hành 2 (Task B5)** |

---

### Task B1: Đổi `role` → quyền và `full_name` → hồ sơ trên toàn máy chủ (một task nguyên khối)

**Task nguyên khối có chủ ý.** Đổi hợp đồng `StaffProfile.role → permissions` làm `tsc` và e2e đỏ cho tới khi mọi đường đọc `role` được chuyển; tách nhỏ hơn sẽ để lại trạng thái đỏ giữa chừng (đặc tả §13/T8). Vì vậy KHÔNG chạy `npm test`/`tsc`/e2e giữa các bước ghi mã — chỉ chạy ở cuối. Riêng test luật `staff` (Nhóm 1) chạy được ngay. `tsc -p web` sẽ có thêm lỗi ở `web/*` (còn đọc `staff.role`) cho tới Task B2 — điều đó là đúng dự kiến.

Các quyết định đã chốt trong đặc tả: (1) `currentStaff` chạy ở MỌI request nên đọc tên + quyền bằng MỘT truy vấn (D1 giới hạn số truy vấn mỗi lần gọi Worker); (2) `staff.role` chỉ còn được GHI hằng `'sales'` và `staff.full_name` ghi `''` (cột chết, ADR-0005) — R-N1-14 kiểm ở `architecture.test.ts`; (3) đổi tên tài khoản = đổi tên hồ sơ (`parties`), không có bản sao tên; (4) ngưng/hạ quyền quản trị viên cuối bị chặn ngay trong câu SQL (`OTHER_ADMIN`) — hai admin sửa nhau cùng lúc không thể làm hết admin; khi bỏ ADMIN, câu đóng ADMIN đứng đầu batch, dòng nhật ký `changes() > 0` ngay sau, các câu còn lại mang cùng điều kiện; (5) quyền theo ADR-0007: `order.history.view` — SALES chỉ thấy nhật ký đơn của mình (đổi hành vi A1, có chủ đích, `orders.mjs` đổi theo); FIELD bị chặn mọi route đơn/tiền/hồ sơ (`access: "office"`); (6) tài khoản mới ghi `role='sales'` hằng và `full_name=''`; (7) đọc tên/mã đơn xuyên module CHỈ qua view (`v_stf_staff_label`, `v_ord_order_label`, `v_pty_party_label`, `v_loc_location_label`).

**Files:**
- Ghi đè: `src/modules/staff/{repository.ts,index.ts,rules.ts,rules.test.ts}`, `src/modules/accounts/index.ts`, `src/modules/orders/index.ts`, `src/modules/audit/repository.ts`, `scripts/{staff-lib.mjs,create-staff.mjs}`, `tests/e2e/admin-race.mjs`
- Tạo: `tests/e2e/permissions.mjs`
- Sửa: `src/shared/{contracts.ts,router.ts}`, `src/modules/parties/{repository.ts,index.ts}`, `src/modules/orders/{rules.ts,rules.test.ts,repository.ts}`, `src/modules/catalog/index.ts`, `src/modules/staff/password.test.ts`, `scripts/import-staff.mjs`, `tests/e2e/{lib.mjs,run.mjs,orders.mjs,admin.mjs}`, `src/architecture.test.ts`, `docs/data-dictionary.json`

**Interfaces:**
- Consumes: T2 (`permissions.ts`), T5 (`stf_permission`, `staff.party_id`, `v_stf_staff_label`, `v_pty_party_label`), T8 (`parties`: `newPersonStatements`, `splitPersonName`), T1 (`defineSql`, bài kiểm).
- Produces: `StaffProfile { id, fullName, phone, partyId: string | null, permissions: PermissionCode[] }` (không còn `role`); `Access = "public" | "staff" | "office" | "admin"`; API `staff`: `authenticate`, `getActiveStaff` (MỘT truy vấn D1 kèm tên + quyền), `getStaffAccount`, `listStaffAccounts`, `findStaffByPhone`, `createAccountStatements(db, {fullName, phone, permissions}, actorId)`, `renameAccountStatements`, `setPermissionStatements`, `updateStaffStatement`, `setPinStatement`, `checkAccountChange`, `countActiveAdmins`; API `parties`: `renamePersonStatements`; route `PUT /api/staff/:id/permissions`; `staff` thành module **nghiêm**.

**Nhóm 1 — luật tài khoản theo quyền (test trước)**

- [ ] **Bước 1: Tạo/ghi `src/modules/staff/rules.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAccountChange, generatePin, isWeakPin } from "./rules.ts";

const admin = { id: "a1", permissions: ["ADMIN"] as const, active: true };
const sales = { id: "s1", permissions: ["SALES"] as const, active: true };
const both = { id: "b1", permissions: ["SALES", "ADMIN"] as const, active: true };

test("không tự ngưng hoặc tự đổi quyền của chính mình", () => {
  assert.match(checkAccountChange("a1", admin, { active: false }, 2)!, /tự ngưng/);
  assert.match(checkAccountChange("a1", admin, { permissions: ["SALES"] }, 2)!, /tự ngưng/);
  assert.match(checkAccountChange("a1", admin, { permissions: ["ADMIN", "ACCOUNTING"] }, 2)!, /tự ngưng/, "thêm quyền cho mình cũng bị chặn");
  assert.equal(checkAccountChange("a1", admin, { permissions: ["ADMIN"] }, 2), null, "không thay đổi gì");
  assert.equal(checkAccountChange("a1", both, { permissions: ["ADMIN", "SALES"] }, 2), null, "cùng tập quyền, khác thứ tự = không đổi");
});

test("không để hết admin đang hoạt động", () => {
  assert.match(checkAccountChange("x", admin, { active: false }, 1)!, /ít nhất một quản trị viên/);
  assert.match(checkAccountChange("x", admin, { permissions: ["SALES"] }, 1)!, /ít nhất một quản trị viên/);
  assert.match(checkAccountChange("x", both, { permissions: ["SALES"] }, 1)!, /ít nhất một quản trị viên/, "bỏ ADMIN nhưng giữ SALES vẫn là mất admin");
  assert.equal(checkAccountChange("x", both, { permissions: ["ADMIN"] }, 1), null, "bỏ SALES, còn ADMIN thì không mất admin");
  assert.equal(checkAccountChange("x", admin, { active: false }, 2), null);
});

test("sửa nhân viên thường luôn được (không phải admin cuối)", () => {
  assert.equal(checkAccountChange("a1", sales, { active: false }, 1), null);
  assert.equal(checkAccountChange("a1", sales, { permissions: ["SALES", "ADMIN"] }, 1), null);
  assert.equal(checkAccountChange("a1", { id: "z", permissions: ["ADMIN"] as const, active: false }, { active: true }, 1), null, "admin đã ngưng không tính là mất admin");
});

test("PIN yếu bị loại; PIN sinh ra luôn 6 số và không yếu", () => {
  for (const w of ["000000", "111111", "123456", "654321", "234567", "890123"]) assert.ok(isWeakPin(w), w);
  for (const ok of ["135790", "482915", "100200"]) assert.ok(!isWeakPin(ok), ok);
  for (let i = 0; i < 2000; i++) {
    const p = generatePin();
    assert.match(p, /^\d{6}$/);
    assert.ok(!isWeakPin(p));
  }
  // random giả trả PIN yếu trước rồi PIN tốt → phải bỏ qua PIN yếu
  const seq = [111111, 123456, 482915];
  assert.equal(generatePin(() => seq.shift()!), "482915");
});
```

- [ ] **Bước 2: Chạy** `node --test src/modules/staff/rules.test.ts`

Kỳ vọng: **LỖI** — các test `checkAccountChange` lỗi (hàm còn nhận `role`).

- [ ] **Bước 3: Tạo/ghi `src/modules/staff/rules.ts`**

```ts
// Luật thuần của quản lý tài khoản nhân viên. Chỉ import kiểu, không I/O.
import type { PermissionCode } from "../../shared/permissions.ts";

/** PIN quá dễ đoán: cả 6 số giống nhau hoặc chạy liên tiếp tăng/giảm, kể cả cuộn vòng (000000, 123456, 654321, 890123…). */
export function isWeakPin(pin: string): boolean {
  return /^(\d)\1{5}$/.test(pin) || "01234567890123456789".includes(pin) || "98765432109876543210".includes(pin);
}

/** Sinh PIN 6 chữ số ngẫu nhiên có kiểm soát (rejection sampling, không thiên lệch), bỏ PIN yếu. `random` để test được. */
export function generatePin(random: (max: number) => number = randomBelow): string {
  for (;;) {
    const pin = String(random(1_000_000)).padStart(6, "0");
    if (!isWeakPin(pin)) return pin;
  }
}

function randomBelow(max: number): number {
  const limit = 0x1_0000_0000 - (0x1_0000_0000 % max);
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < limit) return buf[0]! % max;
  }
}

const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Kiểm tra một thay đổi tài khoản do `actorId` thực hiện. Trả thông báo lỗi, hoặc null nếu hợp lệ.
 * - Không tự ngưng hoặc tự đổi quyền của chính mình (tránh tự khoá).
 * - Không để hệ thống hết quản trị viên hoạt động (không còn ai vào bảng Admin để sửa) — quản trị viên = tài khoản đang hoạt động có quyền ADMIN.
 */
export function checkAccountChange(
  actorId: string,
  target: { id: string; permissions: readonly PermissionCode[]; active: boolean },
  next: { permissions?: readonly PermissionCode[]; active?: boolean },
  activeAdminCount: number,
): string | null {
  const nextPermissions = next.permissions ?? target.permissions;
  const nextActive = next.active ?? target.active;
  const permissionsChanged = next.permissions !== undefined && !sameSet(next.permissions, target.permissions);
  const losesAdmin = target.permissions.includes("ADMIN") && target.active && (!nextPermissions.includes("ADMIN") || !nextActive);
  if (target.id === actorId && (nextActive === false || permissionsChanged)) {
    return "Không thể tự ngưng hoặc tự đổi quyền của chính mình. Hãy nhờ một quản trị viên khác.";
  }
  if (losesAdmin && activeAdminCount <= 1) return "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động.";
  return null;
}
```

- [ ] **Bước 4: Chạy** `node --test src/modules/staff/rules.test.ts`

Kỳ vọng: toàn bộ test đạt. (lần kiểm khi soạn: 4 tests, 4 đạt, 0 lỗi)

**Nhóm 2 — hợp đồng và router**

- [ ] **Bước 5: Sửa `src/shared/contracts.ts`**

Thay đoạn (đúng một chỗ):

```ts
import type { CatalogService, PaxCode, PaxCounts, Prices } from "./order-lines.ts";
```

bằng:

```ts
import type { CatalogService, PaxCode, PaxCounts, Prices } from "./order-lines.ts";
import type { PermissionCode } from "./permissions.ts";
```

Thay đoạn (đúng một chỗ):

```ts
export type { AuditAction, AuditTargetType, CatalogService, PaxCode, PaxCounts, Prices };
```

bằng:

```ts
export type { AuditAction, AuditTargetType, CatalogService, PaxCode, PaxCounts, PermissionCode, Prices };
```

Thay đoạn (đúng một chỗ):

```ts
export type StaffRole = "sales" | "admin";

export interface StaffProfile {
  id: string;
  fullName: string;
  phone: string;
  role: StaffRole;
}
```

bằng:

```ts
export interface StaffProfile {
  id: string;
  /** Tên hiển thị lấy từ hồ sơ (pty_party.display_name), không phải cột staff.full_name (cột chết). */
  fullName: string;
  phone: string;
  /** Hồ sơ của tài khoản; null chỉ trong khoảng giữa hai lần triển khai N1 (đặc tả N1 §9). */
  partyId: string | null;
  /** Quyền trong app (ADR-0005), đọc từ stf_permission — KHÔNG phải vai trò hồ sơ (HDV, tài xế…). */
  permissions: PermissionCode[];
}
```

Thay đoạn (đúng một chỗ):

```ts
export interface StaffSheetCandidateDto {
```

bằng:

```ts
/** Thân yêu cầu PUT /api/staff/:id/permissions: TOÀN BỘ tập quyền mong muốn (không rỗng). */
export interface StaffPermissionsRequest { permissions: PermissionCode[] }

export interface StaffSheetCandidateDto {
```

- [ ] **Bước 6: Sửa `src/shared/router.ts`**

Thay đoạn (đúng một chỗ):

```ts
import { error, json } from "./http";
```

bằng:

```ts
import { error, json } from "./http";
import { hasPermission, isOffice } from "./permissions.ts";
```

Thay đoạn (đúng một chỗ):

```ts
export type Access = "public" | "staff" | "admin";
```

bằng:

```ts
/** public: không cần đăng nhập; staff: mọi tài khoản đăng nhập; office: nhân sự văn phòng (mọi quyền trừ chỉ-FIELD — ADR-0007); admin: quyền ADMIN. */
export type Access = "public" | "staff" | "office" | "admin";
```

Thay đoạn (đúng một chỗ):

```ts
      if (hit.r.access === "admin" && staff.role !== "admin") return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
```

bằng:

```ts
      if (hit.r.access === "admin" && !hasPermission(staff, "ADMIN")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      if (hit.r.access === "office" && !isOffice(staff)) return error(403, "forbidden", "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này.");
```

**Nhóm 3 — module `staff` (năng lực nền, không có route) và `parties`**

- [ ] **Bước 7: Tạo/ghi `src/modules/staff/repository.ts`** — không còn `SELECT *`; tên từ view `v_pty_party_label` (LEFT JOIN); quyền trong CÙNG truy vấn; mọi SQL qua `defineSql`; tệp import bằng đuôi `.ts`

```ts
// SQL của bảng `staff` và `stf_*`. Mọi câu đi qua defineSql (ADR-0002 điều 8(b)) và tệp này import bằng đuôi .ts để bài kiểm kiến trúc nạp được.
// Tên người dùng KHÔNG đọc từ cột staff.full_name (cột chết, ADR-0005) mà từ hồ sơ qua view công bố v_pty_party_label (LEFT JOIN: tài khoản
// chưa có hồ sơ — khoảng giữa hai lần triển khai N1 — vẫn hiện, nhãn "(chưa có hồ sơ)"). Quyền đọc từ stf_permission trong CÙNG một truy vấn
// (D1 giới hạn số truy vấn mỗi lần gọi Worker và getActiveStaff chạy ở mọi request). Không có SELECT * (R-N1-14).
import { PERMISSION_CODES, isPermissionCode, type PermissionCode } from "../../shared/permissions.ts";
import { defineSql } from "../../shared/sql-registry.ts";

export const NO_PARTY_LABEL = "(chưa có hồ sơ)";

/** Hàng tài khoản dùng cho hiển thị/quản trị (KHÔNG có pin_hash). */
export interface StaffRow {
  id: string;
  phone: string;
  active: number;
  created_at: string;
  credentials_changed_at: number | null;
  party_id: string | null;
  label: string;
  /** group_concat mã quyền đang mở; null nếu không có quyền nào. */
  permissions: string | null;
}
/** Hàng dùng khi xác thực: thêm pin_hash. */
export interface StaffAuthRow extends StaffRow {
  pin_hash: string;
}

export const parsePermissions = (s: string | null): PermissionCode[] =>
  PERMISSION_CODES.filter((code) => (s ?? "").split(",").filter(isPermissionCode).includes(code));

const COLUMNS = `s.id, s.phone, s.active, s.created_at, s.credentials_changed_at, s.party_id,
  COALESCE(pl.display_name, '${NO_PARTY_LABEL}') AS label,
  (SELECT group_concat(p.permission_type_code) FROM stf_permission p WHERE p.staff_id = s.id AND p.valid_to_at IS NULL) AS permissions`;
const FROM = "FROM staff s LEFT JOIN v_pty_party_label pl ON pl.id = s.party_id";

const FIND_BY_PHONE = defineSql("staff", "find_by_phone", `SELECT ${COLUMNS}, s.pin_hash ${FROM} WHERE s.phone = ?1`);
const FIND_BY_ID = defineSql("staff", "find_by_id", `SELECT ${COLUMNS}, s.pin_hash ${FROM} WHERE s.id = ?1`);
const LIST = defineSql("staff", "list", `SELECT ${COLUMNS} ${FROM} ORDER BY s.active DESC, pl.sort_key COLLATE NOCASE, s.created_at`);

/** Đếm quản trị viên đang hoạt động (có quyền ADMIN đang mở). */
const COUNT_ACTIVE_ADMINS = defineSql(
  "staff",
  "count_active_admins",
  `SELECT count(*) AS n FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.permission_type_code = 'ADMIN' AND p.valid_to_at IS NULL WHERE s.active = 1`,
);

// Câu bảo vệ "còn quản trị viên hoạt động KHÁC tài khoản ?N" — nằm ngay trong câu ghi nên hai admin sửa nhau cùng lúc cũng không thể làm hết admin
// (D1 tuần tự hoá các batch). ?N là id tài khoản bị ảnh hưởng.
const OTHER_ADMIN = (n: number): string =>
  `(SELECT count(*) FROM staff s2 JOIN stf_permission p2 ON p2.staff_id = s2.id AND p2.permission_type_code = 'ADMIN' AND p2.valid_to_at IS NULL WHERE s2.active = 1 AND s2.id <> ?${n}) >= 1`;

// role/full_name là cột CHẾT (ADR-0005): ghi hằng để thoả NOT NULL, không ai đọc. full_name ghi '' (không sao chép tên hồ sơ để khỏi lệch).
const INSERT_STAFF = defineSql(
  "staff",
  "insert",
  `INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?1, '', ?2, ?3, 'sales', 1, ?4, ?5)`,
);
// phone/active tuỳ chọn (COALESCE); ?4 = 1 khi thay đổi này có thể làm mất một quản trị viên (ngưng tài khoản đang là ADMIN).
const UPDATE_STAFF = defineSql(
  "staff",
  "update",
  `UPDATE staff SET phone = COALESCE(?2, phone), active = COALESCE(?3, active) WHERE id = ?1 AND (?4 = 0 OR ${OTHER_ADMIN(1)})`,
);
const SET_PIN = defineSql("staff", "set_pin", "UPDATE staff SET pin_hash = ?2, credentials_changed_at = ?3 WHERE id = ?1");
const INSERT_PERMISSION = defineSql(
  "staff",
  "insert_permission",
  `INSERT OR IGNORE INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?4, ?5, ?4, ?5 WHERE (?6 = 0 OR ${OTHER_ADMIN(2)})`,
);
const CLOSE_PERMISSION = defineSql(
  "staff",
  "close_permission",
  `UPDATE stf_permission SET valid_to_at = ?3, updated_at = ?3, updated_by = ?4
   WHERE staff_id = ?1 AND permission_type_code = ?2 AND valid_to_at IS NULL AND (?5 = 0 OR ${OTHER_ADMIN(1)})`,
);

export const findByPhone = (db: D1Database, phone: string): Promise<StaffAuthRow | null> => db.prepare(FIND_BY_PHONE).bind(phone).first<StaffAuthRow>();
export const findById = (db: D1Database, id: string): Promise<StaffAuthRow | null> => db.prepare(FIND_BY_ID).bind(id).first<StaffAuthRow>();

export async function listAll(db: D1Database): Promise<StaffRow[]> {
  return (await db.prepare(LIST).all<StaffRow>()).results;
}

export async function countActiveAdmins(db: D1Database): Promise<number> {
  return (await db.prepare(COUNT_ACTIVE_ADMINS).first<{ n: number }>())?.n ?? 0;
}

export const insertStaffStatement = (db: D1Database, v: { id: string; phone: string; pinHash: string; createdAt: string; partyId: string }): D1PreparedStatement =>
  db.prepare(INSERT_STAFF).bind(v.id, v.phone, v.pinHash, v.createdAt, v.partyId);

export const updateStaffStatement = (db: D1Database, id: string, patch: { phone?: string; active?: boolean }, losesAdmin: boolean): D1PreparedStatement =>
  db.prepare(UPDATE_STAFF).bind(id, patch.phone ?? null, patch.active === undefined ? null : patch.active ? 1 : 0, losesAdmin ? 1 : 0);

export const setPinStatement = (db: D1Database, id: string, pinHash: string, at: number): D1PreparedStatement => db.prepare(SET_PIN).bind(id, pinHash, at);

export const insertPermissionStatement = (db: D1Database, staffId: string, code: PermissionCode, actorId: string | null, at: string, guarded: boolean): D1PreparedStatement =>
  db.prepare(INSERT_PERMISSION).bind(crypto.randomUUID(), staffId, code, at, actorId, guarded ? 1 : 0);

export const closePermissionStatement = (db: D1Database, staffId: string, code: PermissionCode, actorId: string, at: string, guarded: boolean): D1PreparedStatement =>
  db.prepare(CLOSE_PERMISSION).bind(staffId, code, at, actorId, guarded ? 1 : 0);
```

- [ ] **Bước 8: Tạo/ghi `src/modules/staff/index.ts`**

```ts
// API công khai của module staff — module khác CHỈ import từ file này. Không có route: API quản trị ở module `accounts`.
// staff sở hữu bảng `staff`, `stf_*` và luật tài khoản; các hàm ghi trả về CÂU LỆNH D1 chưa chạy để module gọi (accounts) gộp cùng nhật ký
// audit vào một db.batch() — đổi tài khoản và ghi dấu vết thành công/thất bại cùng nhau. Tên người thuộc hồ sơ (module parties):
// tạo/đổi tên tài khoản gọi hàm của parties (cạnh staff → parties, ADR-0002); staff.full_name/role là cột chết (ADR-0005).
import { newPersonStatements, renamePersonStatements, splitPersonName } from "../parties";
import { hashPin, verifyDummy, verifyPin } from "./password";
import { isValidPin, normalizePhone } from "./phone";
import {
  closePermissionStatement, countActiveAdmins, findById, findByPhone, insertPermissionStatement, insertStaffStatement, listAll, parsePermissions,
  setPinStatement as setPinRow, updateStaffStatement, type StaffRow,
} from "./repository";
import { checkAccountChange, generatePin, isWeakPin } from "./rules";
import { parseStaffSheet, type StaffCandidate, type StaffSheetParse } from "./sheet";
import type { StaffAccount, StaffProfile } from "../../shared/contracts";
import type { PermissionCode } from "../../shared/permissions";
import { vnToday } from "../../shared/vn-date";

export type { StaffAccount, StaffCandidate, StaffProfile, StaffSheetParse };
export { checkAccountChange, countActiveAdmins, generatePin, hashPin, isValidPin, isWeakPin, normalizePhone, parseStaffSheet, updateStaffStatement };

function toProfile(s: StaffRow): StaffProfile {
  return { id: s.id, fullName: s.label, phone: s.phone, partyId: s.party_id, permissions: parsePermissions(s.permissions) };
}

function toAccount(s: StaffRow): StaffAccount {
  return { ...toProfile(s), active: s.active === 1, createdAt: s.created_at };
}

/** Trả hồ sơ nhân viên nếu SĐT+PIN đúng và tài khoản còn hoạt động; ngược lại null. */
export async function authenticate(db: D1Database, rawPhone: string, pin: string): Promise<StaffProfile | null> {
  const phone = normalizePhone(rawPhone);
  const staff = phone ? await findByPhone(db, phone) : null;
  if (!staff) {
    await verifyDummy(pin);
    return null;
  }
  const ok = await verifyPin(pin, staff.pin_hash);
  if (!ok || !staff.active) return null;
  return toProfile(staff);
}

/**
 * Lấy nhân viên đang hoạt động theo id (xác thực lại phiên mỗi request) — MỘT truy vấn D1 kèm tên và quyền.
 * `sessionIssuedAt` (mili-giây Unix): phiên phát hành trước lần đổi/đặt lại PIN gần nhất bị coi là hết hiệu lực.
 */
export async function getActiveStaff(db: D1Database, id: string, sessionIssuedAt?: number): Promise<StaffProfile | null> {
  const staff = await findById(db, id);
  if (!staff || !staff.active) return null;
  if (sessionIssuedAt !== undefined && staff.credentials_changed_at !== null && staff.credentials_changed_at > sessionIssuedAt) return null;
  return toProfile(staff);
}

export async function getStaffAccount(db: D1Database, id: string): Promise<StaffAccount | null> {
  const s = await findById(db, id);
  return s ? toAccount(s) : null;
}

export async function listStaffAccounts(db: D1Database): Promise<StaffAccount[]> {
  return (await listAll(db)).map(toAccount);
}

export async function findStaffByPhone(db: D1Database, phone: string): Promise<StaffAccount | null> {
  const s = await findByPhone(db, phone);
  return s ? toAccount(s) : null;
}

/**
 * Câu lệnh tạo tài khoản: hồ sơ PERSON + vai trò hồ sơ STAFF (của parties) + tài khoản + quyền, theo thứ tự khoá ngoại; PIN ngẫu nhiên
 * (chỉ trả PIN thô ở đây để hiện một lần; DB chỉ lưu hash). `fullName` đã được người gọi kiểm không rỗng.
 * SĐT đăng nhập KHÔNG được sao chép thành liên hệ của hồ sơ (ADR-0001 mục 5).
 */
export async function createAccountStatements(
  db: D1Database,
  input: { fullName: string; phone: string; permissions: readonly PermissionCode[] },
  actorId: string | null,
): Promise<{ id: string; partyId: string; pin: string; statements: D1PreparedStatement[] }> {
  const now = new Date();
  const at = now.toISOString();
  const today = vnToday(now);
  const name = splitPersonName(input.fullName);
  if (!name) throw new Error("createAccountStatements: họ tên rỗng");
  const person = newPersonStatements(db, { name, roles: [{ roleTypeCode: "STAFF", locationId: null, from: today, to: null }], contactsFrom: today }, actorId, at);
  const id = crypto.randomUUID();
  const pin = generatePin();
  return {
    id,
    partyId: person.partyId,
    pin,
    statements: [
      ...person.statements,
      insertStaffStatement(db, { id, phone: input.phone, pinHash: await hashPin(pin), createdAt: at, partyId: person.partyId }),
      ...input.permissions.map((code) => insertPermissionStatement(db, id, code, actorId, at, false)),
    ],
  };
}

/** Đổi tên hiển thị của tài khoản = đổi tên hồ sơ (parties). Trả null nếu tài khoản chưa có hồ sơ (khoảng giữa hai lần triển khai N1). */
export function renameAccountStatements(db: D1Database, account: StaffAccount, fullName: string, actorId: string, at: string): D1PreparedStatement[] | null {
  const name = splitPersonName(fullName);
  return account.partyId && name ? renamePersonStatements(db, account.partyId, name, actorId, at) : null;
}

/**
 * Đặt tập quyền của tài khoản: đóng dòng quyền bị bỏ, mở dòng quyền mới (không xoá — lịch sử giữ nguyên).
 * Khi bỏ ADMIN, `guarded` là câu đóng ADMIN có điều kiện "còn quản trị viên hoạt động khác" và MỌI câu còn lại mang cùng điều kiện
 * (điều kiện bất biến trong giao dịch nên tất cả cùng áp dụng hoặc cùng không). Người gọi đặt `guarded` ĐẦU batch, ngay sau đó là câu nhật ký
 * `changes() > 0`, rồi đến `rest`; nếu `guarded.changes = 0` → 409 và không có gì thay đổi, không có dòng nhật ký.
 */
export function setPermissionStatements(
  db: D1Database,
  args: { staffId: string; current: readonly PermissionCode[]; next: readonly PermissionCode[]; actorId: string; at: string },
): { guarded: D1PreparedStatement | null; rest: D1PreparedStatement[]; changed: boolean } {
  const { staffId, current, next, actorId, at } = args;
  const removed = current.filter((c) => !next.includes(c));
  const added = next.filter((c) => !current.includes(c));
  const revokesAdmin = removed.includes("ADMIN");
  return {
    guarded: revokesAdmin ? closePermissionStatement(db, staffId, "ADMIN", actorId, at, true) : null,
    rest: [
      ...removed.filter((c) => c !== "ADMIN").map((c) => closePermissionStatement(db, staffId, c, actorId, at, revokesAdmin)),
      ...added.map((c) => insertPermissionStatement(db, staffId, c, actorId, at, revokesAdmin)),
    ],
    changed: removed.length + added.length > 0,
  };
}

/** Đặt PIN mới (hash) và thu hồi mọi phiên cũ. Trả PIN thô để hiện một lần cho người có thẩm quyền. */
export async function setPinStatement(db: D1Database, id: string, pin: string): Promise<D1PreparedStatement> {
  return setPinRow(db, id, await hashPin(pin), Date.now());
}

/** Đổi PIN mới: kiểm tra độ mạnh. Trả thông báo lỗi hoặc null. */
export function validateNewPin(pin: unknown, currentPin: string): string | null {
  if (!isValidPin(pin)) return "PIN mới phải gồm đúng 6 chữ số.";
  if (pin === currentPin) return "PIN mới phải khác PIN hiện tại.";
  if (isWeakPin(pin)) return "PIN mới quá dễ đoán (ví dụ 123456, 111111). Hãy chọn PIN khác.";
  return null;
}
```

- [ ] **Bước 9: Sửa `src/modules/parties/repository.ts`** — hàm đổi tên KHÔNG khoá lạc quan cho `staff` gọi khi quản trị viên đổi tên tài khoản

Thay đoạn (đúng một chỗ):

```ts
const UPDATE_PARTY = defineSql(
```

bằng:

```ts
// Đổi tên KHÔNG khoá lạc quan: dành cho quản trị viên đổi tên tài khoản (module staff gọi). Sửa hồ sơ từ giao diện dùng updatePartyStatements.
const RENAME_PERSON = defineSql(
  "parties",
  "rename_person",
  "UPDATE pty_person SET family_name = ?2, middle_name = ?3, given_name = ?4, updated_at = ?5, updated_by = ?6 WHERE party_id = ?1",
);
const RENAME_PARTY = defineSql("parties", "rename_party", "UPDATE pty_party SET display_name = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1");
const UPDATE_PARTY = defineSql(
```

Thay đoạn (đúng một chỗ):

```ts
/** Thêm một liên hệ; nếu là liên hệ chính
```

bằng:

```ts
export function renamePersonStatements(db: D1Database, partyId: string, name: PersonName, actorId: string, at: string): D1PreparedStatement[] {
  return [
    db.prepare(RENAME_PERSON).bind(partyId, name.family, name.middle, name.given, at, actorId),
    db.prepare(RENAME_PARTY).bind(partyId, composePersonName(name), at, actorId),
  ];
}

/** Thêm một liên hệ; nếu là liên hệ chính
```

- [ ] **Bước 10: Sửa `src/modules/parties/index.ts`** — tám route hồ sơ đổi `access` sang `"office"`: tài khoản chỉ-FIELD nhận 403 (R-N1-15)

Thay đoạn (đúng một chỗ):

```ts
newPersonStatements, updatePartyStatements,
```

bằng:

```ts
newPersonStatements, renamePersonStatements, updatePartyStatements,
```

Thay đoạn (đúng một chỗ):

```ts
findPartiesByPhone, splitPersonName };
```

bằng:

```ts
findPartiesByPhone, renamePersonStatements, splitPersonName };
```

Thay đoạn (đúng một chỗ):

```ts
route("GET", "/api/parties/meta", "staff",
```

bằng:

```ts
route("GET", "/api/parties/meta", "office",
```

Thay đoạn (đúng một chỗ):

```ts
route("GET", "/api/parties/lookup", "staff",
```

bằng:

```ts
route("GET", "/api/parties/lookup", "office",
```

Thay đoạn (đúng một chỗ):

```ts
route("GET", "/api/parties", "staff",
```

bằng:

```ts
route("GET", "/api/parties", "office",
```

Thay đoạn (đúng một chỗ):

```ts
route("POST", "/api/parties", "staff",
```

bằng:

```ts
route("POST", "/api/parties", "office",
```

Thay đoạn (đúng một chỗ):

```ts
route("GET", "/api/parties/:id", "staff",
```

bằng:

```ts
route("GET", "/api/parties/:id", "office",
```

Thay đoạn (đúng một chỗ):

```ts
route("PUT", "/api/parties/:id", "staff",
```

bằng:

```ts
route("PUT", "/api/parties/:id", "office",
```

Thay đoạn (đúng một chỗ):

```ts
route("POST", "/api/parties/:id/contacts", "staff",
```

bằng:

```ts
route("POST", "/api/parties/:id/contacts", "office",
```

Thay đoạn (đúng một chỗ):

```ts
route("POST", "/api/parties/:id/contacts/:cid/end", "staff",
```

bằng:

```ts
route("POST", "/api/parties/:id/contacts/:cid/end", "office",
```

**Nhóm 4 — `accounts` (route quản trị tài khoản)**

- [ ] **Bước 11: Tạo/ghi `src/modules/accounts/index.ts`** — bỏ `role`/`StaffRole`; tạo tài khoản qua `createAccountStatements`; `PATCH /api/staff/:id` chỉ còn tên/SĐT/ngưng; thêm `PUT /api/staff/:id/permissions`

```ts
// Module accounts — quản trị tài khoản nhân viên (chỉ admin) và đổi PIN cá nhân. Route: /api/staff*, /api/account/*.
// Sheet nhân viên chỉ là nguồn ĐỀ XUẤT: admin xem trước rồi xác nhận; Sheet không bao giờ tự tạo/ngưng tài khoản hay cấp quyền ngoài "Bán hàng".
// Quyền trong app (ADR-0005) là tập SALES/ACCOUNTING/ADMIN/FIELD của tài khoản; KHÔNG phải vai trò hồ sơ (HDV, tài xế… — module parties).
import { auditStatement, type AuditAction } from "../audit";
import { lockedPhones, newSessionCookie, unlockPhone, verifyPinThrottled } from "../auth";
import {
  checkAccountChange, countActiveAdmins, createAccountStatements, findStaffByPhone, generatePin, getStaffAccount, isValidPin, listStaffAccounts, normalizePhone,
  parseStaffSheet, renameAccountStatements, setPermissionStatements, setPinStatement, updateStaffStatement, validateNewPin, type StaffAccount,
} from "../staff";
import type { StaffAccountDto, StaffListResponse, StaffResponse, StaffSheetApplyResponse, StaffSheetPreviewResponse, StaffWithPinResponse } from "../../shared/contracts";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { PERMISSION_CODES, PERMISSION_LABEL, isPermissionCode, type PermissionCode } from "../../shared/permissions";
import { route, type AppModule, type Ctx } from "../../shared/router";
import { SheetError, fetchSheetCsv } from "../../shared/sheets";

const isUniqueViolation = (e: unknown) => e instanceof Error && /UNIQUE constraint failed: staff\.phone/.test(e.message);
const PHONE_TAKEN = () => error(409, "phone_taken", "Số điện thoại này đã có tài khoản.");
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy nhân viên.");
const LAST_ADMIN = () => error(409, "account_rule", "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động.");
const labelOf = (list: readonly PermissionCode[]) => (list.length ? list.map((p) => PERMISSION_LABEL[p]).join(", ") : "không có quyền");

function sheetError(e: unknown): Response {
  if (e instanceof SheetError) return error(e.code === "sheet_unreachable" ? 502 : 424, e.code, e.message);
  throw e;
}

function cleanName(v: unknown): { value?: string; error?: string } {
  if (typeof v !== "string" || !v.trim()) return { error: "Họ tên là bắt buộc." };
  const s = v.trim().replace(/\s+/g, " ");
  return s.length > 200 ? { error: "Họ tên tối đa 200 ký tự." } : { value: s };
}

/** Tập quyền từ đầu vào: mảng mã hợp lệ, không trùng, ít nhất một (tài khoản không quyền không làm được gì). Trả tập theo thứ tự chuẩn hoặc lỗi. */
function cleanPermissions(v: unknown): { value?: PermissionCode[]; error?: string } {
  if (!Array.isArray(v) || v.length === 0 || !v.every(isPermissionCode)) return { error: `Quyền phải là một danh sách không rỗng gồm: ${PERMISSION_CODES.join(", ")}.` };
  return { value: PERMISSION_CODES.filter((code) => v.includes(code)) };
}

const dto = (s: StaffAccount, locked: Set<string>): StaffAccountDto => ({ ...s, locked: locked.has(s.phone) });

/** Câu lệnh nhật ký cho thao tác quản trị trên một tài khoản. */
const adminAudit = (db: D1Database, adminId: string, action: AuditAction, targetId: string | undefined, detail?: string, onlyIf?: string) =>
  auditStatement(db, { staffId: adminId, action, at: new Date().toISOString(), targetType: "staff", targetId, detail }, onlyIf);

/** Tài khoản theo `:id`; id sai dạng hoặc không có → null (route trả 404). */
async function target(ctx: Ctx): Promise<StaffAccount | null> {
  const id = ctx.params.id!;
  return UUID_RE.test(id) ? getStaffAccount(ctx.env.DB, id) : null;
}

export const accountsModule: AppModule = {
  name: "accounts",
  routes: [
    // ---- Đổi PIN của chính mình -------------------------------------------------
    route("POST", "/api/account/change-pin", "staff", async ({ request, env, staff }) => {
      const body = await readJson(request);
      const currentPin = body?.currentPin;
      if (!isValidPin(currentPin)) return error(400, "invalid_input", "Cần nhập PIN hiện tại (6 số).");
      const problem = validateNewPin(body?.newPin, currentPin);
      if (problem) return error(400, "invalid_input", problem);
      // Cùng bộ đếm chống dò với đăng nhập: đổi PIN không được thành đường vòng để dò PIN hiện tại.
      const check = await verifyPinThrottled(request, env, staff.phone, currentPin);
      if (!check.ok) return check.response.status === 401 ? error(403, "invalid_credentials", "PIN hiện tại không đúng.") : check.response;
      const at = new Date().toISOString();
      await env.DB.batch([
        await setPinStatement(env.DB, staff.id, body!.newPin as string),
        auditStatement(env.DB, { staffId: staff.id, action: "pin_changed", at, targetType: "staff", targetId: staff.id }),
      ]);
      // Mọi phiên cũ (kể cả thiết bị khác) đã bị thu hồi; cấp phiên mới để thiết bị này không phải đăng nhập lại.
      return json({ ok: true }, 200, { "set-cookie": await newSessionCookie(request, env, staff.id) });
    }),

    // ---- Danh sách / tạo thủ công ------------------------------------------------
    route("GET", "/api/staff", "admin", async ({ env }) => {
      const [staff, locked] = await Promise.all([listStaffAccounts(env.DB), lockedPhones(env.DB)]);
      return json({ staff: staff.map((s) => dto(s, locked)) } satisfies StaffListResponse);
    }),

    route("POST", "/api/staff", "admin", async ({ request, env, staff: admin }) => {
      const db = env.DB;
      const body = await readJson(request);
      const name = cleanName(body?.fullName);
      if (name.error) return error(400, "invalid_input", name.error);
      const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
      if (!phone) return error(400, "invalid_input", "Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
      const perms = cleanPermissions(body?.permissions ?? ["SALES"]);
      if (perms.error) return error(400, "invalid_input", perms.error);
      if (await findStaffByPhone(db, phone)) return PHONE_TAKEN();
      const created = await createAccountStatements(db, { fullName: name.value!, phone, permissions: perms.value! }, admin.id);
      try {
        await db.batch([...created.statements, adminAudit(db, admin.id, "staff_created", created.id, `quyền: ${labelOf(perms.value!)}`)]);
      } catch (e) {
        if (isUniqueViolation(e)) return PHONE_TAKEN();
        throw e;
      }
      return json({ staff: dto((await getStaffAccount(db, created.id))!, new Set()), pin: created.pin } satisfies StaffWithPinResponse, 201);
    }),

    // ---- Đồng bộ từ Google Sheet: xem trước rồi áp dụng --------------------------
    route("GET", "/api/staff/sheet", "admin", async ({ env }) => {
      let parsed;
      try {
        parsed = parseStaffSheet(await fetchSheetCsv(env.STAFF_SHEET_ID));
      } catch (e) {
        return sheetError(e);
      }
      if (!parsed.ok) return error(422, "sheet_bad_format", `Sheet thiếu cột "Tên người dùng" hoặc "Số điện thoại" (đọc được: ${parsed.headers.join(" | ")}).`);
      const existing = new Map((await listStaffAccounts(env.DB)).map((s) => [s.phone, s]));
      const inSheet = new Set(parsed.candidates.map((c) => c.phone));
      return json({
        candidates: parsed.candidates.map((c) => {
          const have = existing.get(c.phone);
          return { row: c.row, name: c.name, phone: c.phone, status: !have ? "new" : have.fullName === c.name ? "same" : "name_differs", currentName: have?.fullName ?? null };
        }),
        problems: parsed.problems,
        notInSheet: [...existing.values()].filter((s) => !inSheet.has(s.phone)).map((s) => ({ fullName: s.fullName, phone: s.phone, active: s.active })),
      } satisfies StaffSheetPreviewResponse);
    }),

    route("POST", "/api/staff/sheet/apply", "admin", async ({ request, env, staff: admin }) => {
      const db = env.DB;
      const body = await readJson(request);
      const wanted = Array.isArray(body?.phones) ? body.phones.filter((p): p is string => typeof p === "string") : [];
      if (wanted.length === 0) return error(400, "invalid_input", "Chưa chọn ai để thêm.");
      // Tải lại Sheet và chỉ tin dữ liệu của Sheet, không tin tên/SĐT do client gửi.
      let parsed;
      try {
        parsed = parseStaffSheet(await fetchSheetCsv(env.STAFF_SHEET_ID));
      } catch (e) {
        return sheetError(e);
      }
      if (!parsed.ok) return error(422, "sheet_bad_format", "Sheet thiếu cột bắt buộc.");
      const pick = new Set(wanted);
      const todo = [];
      for (const c of parsed.candidates) if (pick.has(c.phone) && !(await findStaffByPhone(db, c.phone))) todo.push(c);
      if (todo.length === 0) return error(409, "nothing_to_add", "Không có ai để thêm (đã có tài khoản hoặc Sheet vừa thay đổi). Hãy đồng bộ lại.");
      const made = await Promise.all(todo.map(async (c) => ({ c, ...(await createAccountStatements(db, { fullName: c.name, phone: c.phone, permissions: ["SALES"] }, admin.id)) })));
      try {
        await db.batch([
          ...made.flatMap((m) => [...m.statements, adminAudit(db, admin.id, "staff_created", m.id, "nạp từ Google Sheet, quyền: Bán hàng")]),
          adminAudit(db, admin.id, "staff_synced", undefined, `thêm ${made.length} tài khoản từ Google Sheet`),
        ]);
      } catch (e) {
        if (isUniqueViolation(e)) return error(409, "phone_taken", "Có số điện thoại vừa được tạo bởi người khác. Hãy đồng bộ lại.");
        throw e;
      }
      return json({ created: made.map((m) => ({ id: m.id, fullName: m.c.name, phone: m.c.phone, pin: m.pin })) } satisfies StaffSheetApplyResponse, 201);
    }),

    // ---- Sửa một tài khoản (tên, SĐT đăng nhập, ngưng/kích hoạt) --------------------------------
    route("PATCH", "/api/staff/:id", "admin", async (ctx) => {
      const { request, env, staff: admin } = ctx;
      const db = env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      const body = await readJson(request);
      if (!body) return error(400, "invalid_input", "Dữ liệu không hợp lệ.");
      const patch: { fullName?: string; phone?: string; active?: boolean } = {};
      if (body.fullName !== undefined) {
        const n = cleanName(body.fullName);
        if (n.error) return error(400, "invalid_input", n.error);
        if (n.value !== t.fullName) patch.fullName = n.value;
      }
      if (body.phone !== undefined) {
        const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : null;
        if (!phone) return error(400, "invalid_input", "Số điện thoại không hợp lệ.");
        if (phone !== t.phone) {
          if (await findStaffByPhone(db, phone)) return PHONE_TAKEN();
          patch.phone = phone;
        }
      }
      if (body.active !== undefined) {
        if (typeof body.active !== "boolean") return error(400, "invalid_input", "Trạng thái phải là true/false.");
        if (body.active !== t.active) patch.active = body.active;
      }
      if (Object.keys(patch).length === 0) return json({ staff: dto(t, await lockedPhones(db)) } satisfies StaffResponse);

      const problem = checkAccountChange(admin.id, t, { active: patch.active }, await countActiveAdmins(db));
      if (problem) return error(409, "account_rule", problem);
      const losesAdmin = t.permissions.includes("ADMIN") && t.active && patch.active === false;

      const at = new Date().toISOString();
      const stmts: D1PreparedStatement[] = [];
      if (patch.fullName !== undefined) {
        const rename = renameAccountStatements(db, t, patch.fullName, admin.id, at);
        if (!rename) return error(409, "no_party", "Tài khoản này chưa có hồ sơ (đang di trú dữ liệu). Thử lại sau ít phút.");
        stmts.push(...rename);
      }
      // Câu UPDATE tài khoản đứng CUỐI nhóm ghi để `changes()` của các dòng nhật ký sau nó tham chiếu đúng câu này.
      const needsUpdate = patch.phone !== undefined || patch.active !== undefined;
      if (needsUpdate) stmts.push(updateStaffStatement(db, t.id, patch, losesAdmin));
      const updateIndex = stmts.length - 1;
      // Chỉ ghi nhật ký nếu UPDATE thực sự áp dụng (changes() > 0), tránh ghi dấu vết cho thao tác bị chặn khi tranh chấp.
      const onlyIf = needsUpdate ? "changes() > 0" : undefined;
      const log = (action: AuditAction, detail?: string) => adminAudit(db, admin.id, action, t.id, detail, onlyIf);
      if (patch.fullName !== undefined || patch.phone !== undefined) {
        const bits = [patch.fullName !== undefined && `tên "${t.fullName}" → "${patch.fullName}"`, patch.phone !== undefined && `SĐT ${t.phone} → ${patch.phone}`].filter(Boolean);
        stmts.push(log("staff_updated", bits.join("; ")));
      }
      if (patch.active === false) stmts.push(log("staff_suspended"));
      if (patch.active === true) stmts.push(log("staff_reactivated"));
      let results;
      try {
        results = await db.batch(stmts);
      } catch (e) {
        if (isUniqueViolation(e)) return PHONE_TAKEN();
        throw e;
      }
      if (needsUpdate && (results[updateIndex]!.meta.changes ?? 0) === 0) return LAST_ADMIN();
      return json({ staff: dto((await getStaffAccount(db, t.id))!, await lockedPhones(db)) } satisfies StaffResponse);
    }),

    // ---- Đặt tập quyền của tài khoản (ADR-0005) ---------------------------------------------------------
    route("PUT", "/api/staff/:id/permissions", "admin", async (ctx) => {
      const { request, env, staff: admin } = ctx;
      const db = env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      const perms = cleanPermissions((await readJson(request))?.permissions);
      if (perms.error) return error(400, "invalid_input", perms.error);
      const next = perms.value!;
      const problem = checkAccountChange(admin.id, t, { permissions: next }, await countActiveAdmins(db));
      if (problem) return error(409, "account_rule", problem);

      const at = new Date().toISOString();
      const plan = setPermissionStatements(db, { staffId: t.id, current: t.permissions, next, actorId: admin.id, at });
      if (!plan.changed) return json({ staff: dto(t, await lockedPhones(db)) } satisfies StaffResponse);
      const detail = `${labelOf(t.permissions)} → ${labelOf(next)}`;
      // Khi bỏ ADMIN: câu đóng ADMIN có điều kiện đứng đầu; nhật ký chỉ ghi nếu nó thắng (changes() > 0); các câu còn lại mang cùng điều kiện.
      const stmts = [...(plan.guarded ? [plan.guarded] : []), adminAudit(db, admin.id, "permission_changed", t.id, detail, plan.guarded ? "changes() > 0" : undefined), ...plan.rest];
      const results = await db.batch(stmts);
      if (plan.guarded && (results[0]!.meta.changes ?? 0) === 0) return LAST_ADMIN();
      return json({ staff: dto((await getStaffAccount(db, t.id))!, await lockedPhones(db)) } satisfies StaffResponse);
    }),

    route("POST", "/api/staff/:id/reset-pin", "admin", async (ctx) => {
      const db = ctx.env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      const pin = generatePin();
      await db.batch([await setPinStatement(db, t.id, pin), adminAudit(db, ctx.staff.id, "pin_reset", t.id)]); // nhật ký KHÔNG chứa PIN
      await unlockPhone(db, t.phone);
      return json({ staff: dto((await getStaffAccount(db, t.id))!, new Set()), pin } satisfies StaffWithPinResponse);
    }),

    route("POST", "/api/staff/:id/unlock", "admin", async (ctx) => {
      const db = ctx.env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      await unlockPhone(db, t.phone);
      await adminAudit(db, ctx.staff.id, "login_unlocked", t.id).run();
      return json({ ok: true });
    }),
  ],
};
```

**Nhóm 5 — `orders`, `catalog`, `audit`: quyền theo ADR-0007 và đọc nhãn qua view**

- [ ] **Bước 12: Tạo/ghi `src/modules/orders/index.ts`** — `canModify` → `can(staff, "order.modify" | "order.trip.edit", { ownerId })`; `POST /api/orders` cần `order.create`; nhật ký đơn cần `order.history.view` (SALES: đơn của mình); mọi route `access: "office"`

```ts
// Module orders — sổ đơn hàng (spec §2.1 order/order_service/order_item, §2.3 bất biến). Route: /api/orders*.
// Mọi nhân viên đang hoạt động xem được mọi đơn (§2.4-4); chỉ người lập đơn hoặc admin được sửa/xác nhận/huỷ.
import { getAuditTrail } from "../audit";
import type { CatalogChangeDto, CatalogChangedBody, IncompleteTripBody, OrderDetailResponse, OrderListResponse, OrderResponse } from "../../shared/contracts";
import { UUID_RE, error, intParam, json, readJson } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { vnToday } from "../../shared/vn-date";
import { cancelOrder, confirmOrder, createOrder, findOrder, getMeta, getStoredServices, listOrders, updateDraftOrder, updateTrip } from "./repository";
import { canTransition, isOrderStatus, validateOrder, type Failure } from "./rules";
import { loadOrderView, validationContext } from "./service";
import { confirmGaps, describeTripUpdates, summarizeDeviations, validateTripUpdate } from "./service-rules";

const FORBIDDEN = () => error(403, "forbidden", "Chỉ người lập đơn hoặc quản trị viên mới được thay đổi đơn này.");
const CANNOT_CREATE = () => error(403, "forbidden", "Tài khoản này không được lập đơn.");
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy đơn.");
const NOT_EDITABLE = () => error(409, "not_editable", "Chỉ sửa được đơn ở trạng thái nháp. Muốn đổi đơn đã xác nhận, hãy huỷ và tạo đơn mới.");
const CANCELLED = () => error(409, "not_editable", "Đơn đã huỷ, không sửa được.");
const STALE = () => error(409, "stale", "Đơn vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
const RACED = () => error(409, "invalid_transition", "Đơn vừa được người khác đổi trạng thái, hãy tải lại.");

/** Lỗi kiểm đầu vào → phản hồi: tab cũ 409, giá danh mục vừa đổi 409 kèm chi tiết, còn lại 400. */
function failure(f: Failure): Response {
  if (f.code === "client_outdated") return error(409, "client_outdated", f.message);
  if (f.code === "catalog_changed") {
    return json({ error: { code: "catalog_changed", message: f.message, changes: f.details as CatalogChangeDto[] } } satisfies CatalogChangedBody, 409);
  }
  return error(400, f.code ?? "invalid_input", f.message);
}

export const ordersModule: AppModule = {
  name: "orders",
  routes: [
    route("GET", "/api/orders", "office", async ({ env, url }) => {
      const raw = url.searchParams.get("status");
      const status = raw ? (isOrderStatus(raw) ? raw : undefined) : null;
      if (status === undefined) return error(400, "invalid_input", "Trạng thái lọc không hợp lệ.");
      const result = await listOrders(env.DB, {
        q: (url.searchParams.get("q") ?? "").trim().slice(0, 100),
        status,
        limit: intParam(url.searchParams.get("limit"), 30, 1, 100),
        offset: intParam(url.searchParams.get("offset"), 0, 0, 100000),
      });
      return json(result satisfies OrderListResponse);
    }),

    route("POST", "/api/orders", "office", async ({ env, request, staff }) => {
      if (!can(staff, "order.create")) return CANNOT_CREATE();
      const parsed = validateOrder(await readJson(request), await validationContext(env.DB, null));
      if (!parsed.ok) return failure(parsed);
      const id = await createOrder(env.DB, staff.id, parsed.value);
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse, 201);
    }),

    route("GET", "/api/orders/:id", "office", async ({ env, params, staff }) => {
      if (!UUID_RE.test(params.id!)) return NOT_FOUND();
      const order = await loadOrderView(env.DB, params.id!);
      if (!order) return NOT_FOUND();
      // ADR-0007: nhật ký/lịch sử sửa đơn — SALES chỉ đơn của mình; ACCOUNTING và ADMIN mọi đơn.
      const owner = { ownerId: order.staffId };
      const history = can(staff, "order.history.view", owner) ? await getAuditTrail(env.DB, order.id) : [];
      return json({ order, history, canModify: can(staff, "order.modify", owner) } satisfies OrderDetailResponse);
    }),

    route("PUT", "/api/orders/:id", "office", async ({ env, request, params, staff }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.modify", { ownerId: meta.staffId })) return FORBIDDEN();
      if (meta.status !== "draft") return NOT_EDITABLE();
      const parsed = validateOrder(await readJson(request), await validationContext(env.DB, id));
      if (!parsed.ok) return failure(parsed);
      const expected = parsed.value.expectedUpdatedAt;
      if (!expected) return error(400, "invalid_input", "Thiếu expectedUpdatedAt (mốc cập nhật của đơn mà form đã đọc).");
      if (!(await updateDraftOrder(env.DB, id, staff.id, { ...parsed.value, expectedUpdatedAt: expected }))) {
        const now = await getMeta(env.DB, id);
        return now && now.status !== "draft" ? NOT_EDITABLE() : STALE();
      }
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),

    // Sửa trường vận hành (ngày giờ khởi hành, đón, check-in, ghi chú) — kể cả đơn ĐÃ XÁC NHẬN (Q9). Không đổi khách/tiền.
    route("PUT", "/api/orders/:id/trip", "office", async ({ env, request, params, staff }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId })) return FORBIDDEN();
      if (meta.status === "cancelled") return CANCELLED();
      const stored = await getStoredServices(env.DB, id);
      const parsed = validateTripUpdate(await readJson(request), stored.map((s) => ({ id: s.id, departDate: s.trip.departDate })), meta.status, vnToday(new Date()));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const detail = describeTripUpdates(stored, parsed.value.updates);
      if (detail === null) return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse); // không đổi gì
      if (!(await updateTrip(env.DB, id, staff.id, parsed.value.updates, parsed.value.expectedUpdatedAt, detail))) {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),

    route("POST", "/api/orders/:id/status", "office", async ({ env, request, params, staff }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const body = await readJson(request);
      const to = body?.status;
      if (to !== "confirmed" && to !== "cancelled") return error(400, "invalid_input", "Trạng thái đích phải là confirmed hoặc cancelled.");
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.modify", { ownerId: meta.staffId })) return FORBIDDEN();
      const from = meta.status;
      if (!canTransition(from, to)) return error(409, "invalid_transition", `Không thể chuyển đơn từ "${from}" sang "${to}".`);

      if (to === "cancelled") {
        if (!(await cancelOrder(env.DB, id, staff.id, from, meta.updatedAt))) return RACED();
      } else {
        const today = vnToday(new Date());
        const order = await findOrder(env.DB, id);
        const detail = order ? summarizeDeviations(order.services.flatMap((s) => s.items)) : undefined;
        if (!(await confirmOrder(env.DB, id, staff.id, today, meta.updatedAt, detail))) {
          // Thua vì đơn đã đổi trạng thái, hay vì chưa đủ chuyến? Đọc lại để trả đúng lý do (không ghi nhật ký cho lần xác nhận thất bại).
          const now = await getMeta(env.DB, id);
          if (!now || now.status !== "draft") return RACED();
          const stored = await getStoredServices(env.DB, id);
          const missing = confirmGaps(stored.map((s) => ({ id: s.id, name: s.name, departDate: s.trip.departDate, pax: s.pax })), today);
          if (missing.length === 0) return STALE(); // vừa có người bổ sung xong — thử lại
          return json({ error: { code: "incomplete_trip", message: "Chưa đủ thông tin chuyến để xác nhận đơn.", missing } } satisfies IncompleteTripBody, 409);
        }
      }
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),
  ],
};
```

- [ ] **Bước 13: Sửa `src/modules/orders/rules.ts`** — `canModify` bị thay bằng `can` của `shared/permissions.ts`

Thay đoạn (đúng một chỗ):

```ts
/** Ai được sửa/xác nhận/huỷ đơn: người lập đơn hoặc admin. Xem đơn thì mọi nhân viên đều được (§2.4-4). */
export function canModify(staff: { id: string; role: "sales" | "admin" }, order: { staffId: string }): boolean {
  return staff.role === "admin" || staff.id === order.staffId;
}
```

bằng:

```ts

```

- [ ] **Bước 14: Sửa `src/modules/orders/rules.test.ts`** — ma trận quyền đã được test từng ô ở `permissions.test.ts`

Thay đoạn (đúng một chỗ):

```ts
import { canModify, canTransition,
```

bằng:

```ts
import { canTransition,
```

Thay đoạn (đúng một chỗ):

```ts

test("chỉ người lập đơn hoặc admin được sửa/đổi trạng thái", () => {
  const order = { staffId: "a" };
  assert.ok(canModify({ id: "a", role: "sales" }, order));
  assert.ok(canModify({ id: "z", role: "admin" }, order));
  assert.ok(!canModify({ id: "b", role: "sales" }, order));
});
```

bằng:

```ts

```

- [ ] **Bước 15: Sửa `src/modules/orders/repository.ts`**

Thay đoạn (đúng một chỗ):

```ts
const ORDER_SELECT = `SELECT o.*, s.full_name AS staff_name FROM orders o JOIN staff s ON s.id = o.staff_id`;
```

bằng:

```ts
const ORDER_SELECT = `SELECT o.*, s.label AS staff_name FROM orders o JOIN v_stf_staff_label s ON s.id = o.staff_id`;
```

Thay đoạn (đúng một chỗ):

```ts
OR s.full_name LIKE ? ESCAPE '\\')`);
```

bằng:

```ts
OR s.label LIKE ? ESCAPE '\\')`);
```

- [ ] **Bước 16: Sửa `src/modules/catalog/index.ts`** — bảng giá là "tiền": FIELD không xem (ADR-0007 điều 3)

Thay đoạn (đúng một chỗ):

```ts
route("GET", "/api/catalog", "staff",
```

bằng:

```ts
route("GET", "/api/catalog", "office",
```

- [ ] **Bước 17: Tạo/ghi `src/modules/audit/repository.ts`** — ba `JOIN staff` (kể cả nối đa hình theo `target_id`) → `v_stf_staff_label`; `JOIN orders` → `v_ord_order_label`; nhãn đối tượng hồ sơ/địa điểm qua view

```ts
import { isAuditAction, type AuditAction, type AuditTargetType } from "../../shared/audit-actions";
import type { AuditEntryDto, AuditListResponse, AuditRecordDto } from "../../shared/contracts";
import { escapeLike } from "../../shared/http";

export { isAuditAction, type AuditAction, type AuditTargetType };

export interface AuditInput {
  /**
   * id do người gọi chọn (UUID mới) để CÁC CÂU SAU trong cùng batch hỏi "dòng này đã được ghi chưa" (`EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`).
   * Vì dòng chỉ được ghi khi `onlyIf` đúng (vd `changes() > 0`) và id là duy nhất cho request này, đó là cách chắc chắn để biết
   * "UPDATE của chính tôi đã thắng" — khác với so mốc thời gian, có thể trùng khi hai request cùng mili-giây. Bỏ trống = tự sinh.
   */
  id?: string;
  /** Người thao tác; bỏ trống (null) = hệ thống tự làm (vd Cron đồng bộ Sheet). */
  staffId?: string | null;
  action: AuditAction;
  at: string;
  orderId?: string; // hành động thuộc một đơn
  targetType?: AuditTargetType;
  targetId?: string;
  /** Mô tả ngắn cho người đọc. KHÔNG bao giờ đưa PIN hay bí mật vào đây. */
  detail?: string;
}

export type AuditEntry = AuditEntryDto;
export type AuditRecord = AuditRecordDto;

export function insertStatement(db: D1Database, e: AuditInput, onlyIf?: string): D1PreparedStatement {
  // SQL không còn CHECK liệt kê (0007) → chốt ở đây để giá trị lạ không bao giờ vào nhật ký.
  if (!isAuditAction(e.action)) throw new Error(`Hành động nhật ký không hợp lệ: ${String(e.action)}`);
  const targetType = e.targetType ?? (e.orderId ? "order" : null);
  const targetId = e.targetId ?? e.orderId ?? null;
  return db
    .prepare(
      `INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, ? ${onlyIf ? `WHERE ${onlyIf}` : ""}`,
    )
    .bind(e.id ?? crypto.randomUUID(), e.orderId ?? null, e.staffId ?? null, e.action, targetType, targetId, e.detail ?? null, e.at);
}

export const SYSTEM_ACTOR_NAME = "Hệ thống (tự động)";

export async function listByOrder(db: D1Database, orderId: string): Promise<AuditEntry[]> {
  const { results } = await db
    .prepare(
      `SELECT a.action, a.staff_id, s.label AS staff_name, a.detail, a.created_at
       FROM audit_log a LEFT JOIN v_stf_staff_label s ON s.id = a.staff_id
       WHERE a.order_id = ? ORDER BY a.created_at, a.rowid`,
    )
    .bind(orderId)
    .all<{ action: AuditAction; staff_id: string | null; staff_name: string | null; detail: string | null; created_at: string }>();
  return results.map((r) => ({ action: r.action, staffId: r.staff_id, staffName: r.staff_name ?? SYSTEM_ACTOR_NAME, at: r.created_at, detail: r.detail }));
}

/** Nhật ký toàn hệ thống, mới nhất trước; lọc theo hành động và/hoặc tìm theo đối tượng / tên người thao tác. */
export async function listAll(
  db: D1Database,
  opts: { action: AuditAction | null; q: string; limit: number; offset: number },
): Promise<AuditListResponse> {
  const where: string[] = [];
  const binds: (string | number)[] = [];
  if (opts.action) {
    where.push("a.action = ?");
    binds.push(opts.action);
  }
  if (opts.q) {
    const like = `%${escapeLike(opts.q)}%`;
    where.push(
      "(o.order_code LIKE ? ESCAPE '\\' OR s.label LIKE ? ESCAPE '\\' OR t.label LIKE ? ESCAPE '\\' OR pt.display_name LIKE ? ESCAPE '\\' OR (a.target_type = 'catalog' AND a.target_id LIKE ? ESCAPE '\\'))",
    );
    binds.push(like, like, like, like, like);
  }
  // LEFT JOIN: hành động không gắn với đơn (order_id NULL) vẫn phải hiện ra.
  const { results } = await db
    .prepare(
      `SELECT a.id, a.action, a.staff_id, s.label AS staff_name, a.order_id, o.order_code,
              a.target_type, a.target_id, t.label AS target_staff_name, pt.display_name AS target_party_name, lt.name AS target_location_name, a.detail, a.created_at
       FROM audit_log a
       LEFT JOIN v_stf_staff_label s ON s.id = a.staff_id
       LEFT JOIN v_ord_order_label o ON o.id = a.order_id
       LEFT JOIN v_stf_staff_label t ON a.target_type = 'staff' AND t.id = a.target_id
       LEFT JOIN v_pty_party_label pt ON a.target_type = 'party' AND pt.id = a.target_id
       LEFT JOIN v_loc_location_label lt ON a.target_type = 'location' AND lt.id = a.target_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY a.created_at DESC, a.rowid DESC LIMIT ? OFFSET ?`,
    )
    .bind(...binds, opts.limit + 1, opts.offset)
    .all<{
      id: string; action: AuditAction; staff_id: string | null; staff_name: string | null; order_id: string | null; order_code: string | null;
      target_type: AuditTargetType | null; target_id: string | null; target_staff_name: string | null; target_party_name: string | null; target_location_name: string | null; detail: string | null; created_at: string;
    }>();
  const entries = results.slice(0, opts.limit).map((r) => ({
    id: r.id,
    action: r.action,
    staffId: r.staff_id,
    staffName: r.staff_name ?? SYSTEM_ACTOR_NAME,
    at: r.created_at,
    detail: r.detail,
    targetType: r.target_type,
    targetId: r.target_id,
    targetLabel: r.order_code ?? r.target_staff_name ?? r.target_party_name ?? r.target_location_name ?? (r.target_type === "catalog" ? r.target_id : null),
    orderId: r.order_id,
  }));
  return { entries, hasMore: results.length > opts.limit };
}
```

**Nhóm 6 — scripts tạo tài khoản (tạo cả hồ sơ + vai STAFF + quyền)**

- [ ] **Bước 18: Tạo/ghi `scripts/staff-lib.mjs`**

```js
// Dùng chung cho create-staff.mjs, import-staff.mjs và tests/e2e/run.mjs.
// Băm PIN bằng CHÍNH hàm của Worker (src/modules/staff/password.ts) → không thể lệch định dạng hash.
// Tạo tài khoản = hồ sơ PERSON + vai trò hồ sơ STAFF + tài khoản + quyền, đúng như Worker (staff.createAccountStatements): tách tên bằng chính
// splitPersonName của parties. staff.role/full_name là cột chết (ADR-0005): ghi hằng 'sales' / ''. Tài khoản do script tạo có created_by NULL (= hệ thống).
import { randomUUID } from "node:crypto";
import { splitPersonName, composePersonName } from "../src/modules/parties/rules.ts";
import { hashPin } from "../src/modules/staff/password.ts";
import { PERMISSION_CODES, isPermissionCode } from "../src/shared/permissions.ts";
import { vnToday } from "../src/shared/vn-date.ts";

export { hashPin, PERMISSION_CODES, isPermissionCode };

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const qn = (s) => (s === null || s === undefined ? "NULL" : q(s));

/** Nhiều câu INSERT (ngăn cách bằng xuống dòng) tạo một tài khoản đầy đủ. `permissions` mặc định ["SALES"]. */
export async function insertStaffSql({ name, phone, pin, permissions = ["SALES"], active = 1 }) {
  const n = splitPersonName(name);
  if (!n) throw new Error("Họ tên rỗng");
  if (!Array.isArray(permissions) || permissions.length === 0 || !permissions.every(isPermissionCode)) {
    throw new Error(`Quyền phải là danh sách không rỗng gồm: ${PERMISSION_CODES.join(", ")}`);
  }
  const now = new Date();
  const at = q(now.toISOString());
  const partyId = randomUUID();
  const staffId = randomUUID();
  return [
    `INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (${q(partyId)}, 'PERSON', ${q(composePersonName(n))}, ${active}, ${at}, ${at});`,
    `INSERT INTO pty_person (party_id, family_name, middle_name, given_name, created_at, updated_at) VALUES (${q(partyId)}, ${qn(n.family)}, ${qn(n.middle)}, ${q(n.given)}, ${at}, ${at});`,
    `INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (${q(randomUUID())}, ${q(partyId)}, 'STAFF', ${q(vnToday(now))}, ${at}, ${at});`,
    `INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (${q(staffId)}, '', ${q(phone)}, ${q(await hashPin(pin))}, 'sales', ${active}, ${at}, ${q(partyId)});`,
    ...permissions.map(
      (code) => `INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES (${q(randomUUID())}, ${q(staffId)}, ${q(code)}, ${at}, ${at}, ${at});`,
    ),
  ].join("\n");
}
```

- [ ] **Bước 19: Tạo/ghi `scripts/create-staff.mjs`**

```js
// Cửa khẩn cấp (vd mất hết admin): tạo tài khoản bằng SQL, KHÔNG qua bảng Admin nên KHÔNG ghi nhật ký.
// Dùng: node scripts/create-staff.mjs "<Họ tên>" <SĐT> <PIN 6 số> [QUYỀN[,QUYỀN…]] > staff.local.sql
//   QUYỀN: SALES (mặc định), ACCOUNTING, ADMIN, FIELD — ví dụ quản trị viên: SALES,ADMIN hoặc chỉ ADMIN.
// Rồi: npx wrangler d1 execute tourdao-sales-db --local|--remote --file staff.local.sql
import { isWeakPin } from "../src/modules/staff/rules.ts";
import { PERMISSION_CODES, insertStaffSql, isPermissionCode } from "./staff-lib.mjs";

const [name, phone, pin, perm = "SALES"] = process.argv.slice(2);
const permissions = perm.split(",").map((p) => p.trim().toUpperCase()).filter(Boolean);
if (!name?.trim() || !/^0\d{9}$/.test(phone ?? "") || !/^\d{6}$/.test(pin ?? "") || permissions.length === 0 || !permissions.every(isPermissionCode)) {
  console.error(`Dùng: node scripts/create-staff.mjs "<Họ tên>" <SĐT 0xxxxxxxxx> <PIN 6 số> [${PERMISSION_CODES.join("|")}[,…]]`);
  process.exit(1);
}
if (isWeakPin(pin)) {
  console.error("PIN quá dễ đoán (vd 123456, 111111). Chọn PIN khác.");
  process.exit(1);
}
console.log(await insertStaffSql({ name, phone, pin, permissions }));
```

- [ ] **Bước 20: Sửa `scripts/import-staff.mjs`**

Thay đoạn (đúng một chỗ):

```js
// mọi tài khoản mới đều là vai trò `sales`; cấp `admin` bằng scripts/create-staff.mjs hoặc bảng Admin.
```

bằng:

```js
// mọi tài khoản mới chỉ có quyền Bán hàng (SALES); cấp Quản trị bằng scripts/create-staff.mjs (SALES,ADMIN) hoặc bảng Admin.
```

Thay đoạn (đúng một chỗ):

```js
sql.push(await insertStaffSql({ name: c.name, phone: c.phone, pin, role: "sales" }));
```

bằng:

```js
sql.push(await insertStaffSql({ name: c.name, phone: c.phone, pin, permissions: ["SALES"] }));
```

Thay đoạn (đúng một chỗ):

```js
pins.push(`${c.phone}\t${pin}\t${c.name}\tsales`);
```

bằng:

```js
pins.push(`${c.phone}\t${pin}\t${c.name}\tSALES`);
```

Thay đoạn (đúng một chỗ):

```js
`SĐT\tPIN\tHọ tên\tVai trò\n${pins.join("\n")}\n`
```

bằng:

```js
`SĐT\tPIN\tHọ tên\tQuyền\n${pins.join("\n")}\n`
```

- [ ] **Bước 21: Sửa `src/modules/staff/password.test.ts`**

Thay đoạn (đúng một chỗ):

```ts
const sql: string = await insertStaffSql({ name: "A", phone: "0900000009", pin: "482915", role: "sales" });
```

bằng:

```ts
const sql: string = await insertStaffSql({ name: "Nguyễn Văn A", phone: "0900000009", pin: "482915", permissions: ["SALES"] });
```

**Nhóm 7 — e2e (viết lại theo quyền) và kiểm kiến trúc**

- [ ] **Bước 22: Sửa `tests/e2e/lib.mjs`**

Thay đoạn (đúng một chỗ):

```js
  salesA: { name: "NV Bán A (test)", phone: "0900000002", pin: "246810", role: "sales" },
  salesB: { name: "NV Bán B (test)", phone: "0900000003", pin: "135790", role: "sales" },
  admin: { name: "QTV Test", phone: "0900000004", pin: "112233", role: "admin" },
};
```

bằng:

```js
  salesA: { name: "NV Bán A (test)", phone: "0900000002", pin: "246810", permissions: ["SALES"] },
  salesB: { name: "NV Bán B (test)", phone: "0900000003", pin: "135790", permissions: ["SALES"] },
  admin: { name: "QTV Test", phone: "0900000004", pin: "112233", permissions: ["ADMIN"] },
  accountant: { name: "Kế Toán Test", phone: "0900000005", pin: "224466", permissions: ["ACCOUNTING"] },
  field: { name: "Hiện Trường Test", phone: "0900000006", pin: "335577", permissions: ["FIELD"] },
};
```

- [ ] **Bước 23: Sửa `tests/e2e/run.mjs`**

Thay đoạn (đúng một chỗ):

```js
insertStaffSql({ name: a.name, phone: a.phone, pin: a.pin, role: a.role })
```

bằng:

```js
insertStaffSql({ name: a.name, phone: a.phone, pin: a.pin, permissions: a.permissions })
```

Thay đoạn (đúng một chỗ):

```js
"admin-race", "locations", "parties"];
```

bằng:

```js
"admin-race", "locations", "parties", "permissions"];
```

- [ ] **Bước 24: Sửa `tests/e2e/orders.mjs`** — hành vi đổi có chủ đích: SALES không còn xem nhật ký đơn của người khác

Thay đoạn (đúng một chỗ):

```js
assert.equal(r.status, 200); assert.equal(r.body.order.staffName, "NV Bán A (test)");
assert.equal(r.body.history.length, 1);
```

bằng:

```js
assert.equal(r.status, 200); assert.equal(r.body.order.staffName, "NV Bán A (test)");
assert.equal(r.body.history.length, 0, "SALES chỉ xem nhật ký đơn của mình (ADR-0007) — B không thấy nhật ký đơn của A");
assert.equal((await call(A, "GET", `/api/orders/${o.id}`)).body.history.length, 1, "người lập đơn thấy nhật ký của mình");
```

- [ ] **Bước 25: Tạo/ghi `tests/e2e/admin.mjs`** — viết lại theo quyền: tạo với `permissions`, `PUT …/permissions`, tự đổi quyền bị chặn, hồ sơ nhân sự có vai STAFF và KHÔNG có liên hệ, quyền có hiệu lực NGAY với phiên đang mở

```js
import assert from "node:assert/strict";
import { ACCOUNTS, call as raw, freshIp as fresh, randomPhone as rnd, session } from "./lib.mjs";

const login = (phone, pin, ip = fresh()) => raw(null, "POST", "/api/auth/login", { phone, pin }, ip);
const cookieOf = (r) => r.cookie;

const ADMIN = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);

// --- phân quyền API
assert.equal((await raw(null, "GET", "/api/staff")).status, 401);
assert.equal((await raw(SALES, "GET", "/api/staff")).status, 403);
assert.equal((await raw(SALES, "POST", "/api/staff", { fullName: "X", phone: rnd() })).status, 403);
assert.equal((await raw(SALES, "PUT", "/api/staff/00000000-0000-0000-0000-000000000000/permissions", { permissions: ["ADMIN"] })).status, 403, "sales không tự cấp quyền");
assert.equal((await raw(SALES, "GET", "/api/staff/sheet")).status, 403);

// --- tạo nhân viên
const phoneA = rnd();
let r = await raw(ADMIN, "POST", "/api/staff", { fullName: "  Nguyễn   Test Một ", phone: phoneA.replace(/^0/, "+84 ") });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.staff.phone, phoneA); assert.equal(r.body.staff.fullName, "Nguyễn Test Một"); assert.deepEqual(r.body.staff.permissions, ["SALES"]);
assert.ok(r.body.staff.partyId, "tài khoản mới phải có hồ sơ");
assert.match(r.body.pin, /^\d{6}$/);
const A = { id: r.body.staff.id, pin: r.body.pin, phone: phoneA, partyId: r.body.staff.partyId };
assert.equal((await raw(ADMIN, "POST", "/api/staff", { fullName: "Trùng", phone: phoneA })).status, 409);
assert.equal((await raw(ADMIN, "POST", "/api/staff", { fullName: "Sai", phone: "123" })).status, 400);
for (const bad of [["BOSS"], [], "SALES", ["SALES", "sales"], [1]]) assert.equal((await raw(ADMIN, "POST", "/api/staff", { fullName: "Sai quyền", phone: rnd(), permissions: bad })).status, 400, JSON.stringify(bad));
r = await login(A.phone, A.pin); assert.equal(r.status, 200);
const A_COOKIE = cookieOf(r);
console.log("✓ tạo + đăng nhập bằng PIN sinh ra");

// --- nhật ký: có dòng không gắn đơn (LEFT JOIN), KHÔNG chứa PIN
// hồ sơ nhân sự: có hồ sơ PERSON với tên tách đúng, vai trò hồ sơ STAFF, KHÔNG có liên hệ (SĐT đăng nhập ≠ SĐT liên hệ — ADR-0001 mục 5)
r = await raw(ADMIN, "GET", `/api/parties/${A.partyId}`);
assert.equal(r.status, 200);
assert.equal(r.body.party.kind, "PERSON"); assert.equal(r.body.party.displayName, "Nguyễn Test Một");
assert.equal(r.body.party.familyName, "Nguyễn"); assert.equal(r.body.party.middleName, "Test"); assert.equal(r.body.party.givenName, "Một");
assert.deepEqual(r.body.party.roleCodes, ["STAFF"]); assert.deepEqual(r.body.party.contacts, []);
console.log("✓ tài khoản mới có hồ sơ + vai trò STAFF, không sao chép SĐT");
r = await raw(ADMIN, "GET", "/api/audit?action=staff_created&limit=5");
assert.equal(r.status, 200);
const created = r.body.entries.find((e) => e.targetId === A.id);
assert.ok(created, "staff_created phải hiện trong /api/audit");
assert.equal(created.orderId, null); assert.equal(created.targetLabel, "Nguyễn Test Một");
assert.ok(!JSON.stringify(r.body).includes(A.pin), "PIN không được xuất hiện trong nhật ký");
console.log("✓ nhật ký hiển thị hành động không gắn đơn, không lộ PIN");

// --- sửa: đổi tên (= đổi tên hồ sơ), quyền, SĐT, ngưng
r = await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { fullName: "Nguyễn Test Hai" });
assert.equal(r.status, 200); assert.equal(r.body.staff.fullName, "Nguyễn Test Hai");
assert.equal((await raw(ADMIN, "GET", `/api/parties/${r.body.staff.partyId}`)).body.party.displayName, "Nguyễn Test Hai", "đổi tên tài khoản = đổi tên hồ sơ");
r = await raw(ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: ["ADMIN", "SALES"] });
assert.equal(r.status, 200, JSON.stringify(r.body)); assert.deepEqual(r.body.staff.permissions, ["SALES", "ADMIN"]);
r = await raw(ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: ["SALES"] });
assert.deepEqual(r.body.staff.permissions, ["SALES"]);
for (const bad of [[], ["BOSS"], "ADMIN", null]) assert.equal((await raw(ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: bad })).status, 400, JSON.stringify(bad));
assert.equal((await raw(ADMIN, "PUT", "/api/staff/khong-phai-id/permissions", { permissions: ["SALES"] })).status, 404);
// quyền có hiệu lực NGAY với phiên đang mở (getActiveStaff đọc quyền ở mỗi request)
assert.deepEqual((await raw(A_COOKIE, "GET", "/api/auth/me")).body.staff.permissions, ["SALES"]);
assert.equal((await raw(ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: ["SALES", "ACCOUNTING"] })).status, 200);
assert.deepEqual((await raw(A_COOKIE, "GET", "/api/auth/me")).body.staff.permissions, ["SALES", "ACCOUNTING"]);
assert.equal((await raw(ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: ["SALES"] })).status, 200);
r = await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { phone: "0900000002" });
assert.equal(r.status, 409); // trùng SĐT người khác
// tự ngưng / tự hạ quyền bị chặn
const me = (await raw(ADMIN, "GET", "/api/auth/me")).body.staff;
assert.equal((await raw(ADMIN, "PATCH", `/api/staff/${me.id}`, { active: false })).status, 409);
assert.equal((await raw(ADMIN, "PUT", `/api/staff/${me.id}/permissions`, { permissions: ["SALES"] })).status, 409);
assert.equal((await raw(ADMIN, "PUT", `/api/staff/${me.id}/permissions`, { permissions: ["ADMIN", "SALES"] })).status, 409, "cũng không tự thêm quyền cho mình");
// ngưng → hiệu lực NGAY với phiên đang mở
assert.equal((await raw(A_COOKIE, "GET", "/api/auth/me")).status, 200);
assert.equal((await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { active: false })).status, 200);
assert.equal((await raw(A_COOKIE, "GET", "/api/auth/me")).status, 401);
assert.equal((await login(A.phone, A.pin)).status, 401);
assert.equal((await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { active: true })).status, 200);
assert.equal((await login(A.phone, A.pin)).status, 200);
r = await raw(ADMIN, "GET", "/api/audit?q=Nguyễn Test&limit=20");
const actions = r.body.entries.filter((e) => e.targetId === A.id).map((e) => e.action);
for (const a of ["staff_created", "staff_updated", "permission_changed", "staff_suspended", "staff_reactivated"]) assert.ok(actions.includes(a), `thiếu ${a}: ${actions}`);
assert.ok(r.body.entries.some((e) => e.action === "permission_changed" && e.targetId === A.id && /Bán hàng/.test(e.detail)), "nhật ký đổi quyền có nhãn tiếng Việt");
console.log("✓ sửa/ngưng/kích hoạt, tự khoá bị chặn, ngưng có hiệu lực ngay, đủ nhật ký");

// --- đặt lại PIN thu hồi phiên cũ
const s1 = cookieOf(await login(A.phone, A.pin));
r = await raw(ADMIN, "POST", `/api/staff/${A.id}/reset-pin`);
assert.equal(r.status, 200); assert.match(r.body.pin, /^\d{6}$/); assert.notEqual(r.body.pin, A.pin);
const oldPin = A.pin; A.pin = r.body.pin;
assert.equal((await raw(s1, "GET", "/api/auth/me")).status, 401, "phiên cũ phải bị thu hồi");
assert.equal((await login(A.phone, oldPin)).status, 401);
assert.equal((await login(A.phone, A.pin)).status, 200);
r = await raw(ADMIN, "GET", "/api/audit?action=pin_reset&limit=3");
assert.ok(r.body.entries.some((e) => e.targetId === A.id));
assert.ok(!JSON.stringify(r.body).includes(A.pin));
console.log("✓ đặt lại PIN thu hồi phiên cũ, nhật ký không lộ PIN");

// --- đổi PIN của chính mình
let sess = cookieOf(await login(A.phone, A.pin));
const other = cookieOf(await login(A.phone, A.pin)); // thiết bị khác
assert.equal((await raw(sess, "POST", "/api/account/change-pin", { currentPin: "000000", newPin: "482915" })).status, 403);
assert.equal((await raw(sess, "POST", "/api/account/change-pin", { currentPin: A.pin, newPin: "123456" })).status, 400);
assert.equal((await raw(sess, "POST", "/api/account/change-pin", { currentPin: A.pin, newPin: A.pin })).status, 400);
r = await raw(sess, "POST", "/api/account/change-pin", { currentPin: A.pin, newPin: "482915" });
assert.equal(r.status, 200);
assert.equal((await raw(cookieOf(r), "GET", "/api/auth/me")).status, 200, "thiết bị đổi PIN giữ phiên mới");
assert.equal((await raw(other, "GET", "/api/auth/me")).status, 401, "thiết bị khác bị đăng xuất");
assert.equal((await login(A.phone, "482915")).status, 200);
A.pin = "482915";
console.log("✓ đổi PIN cá nhân");

// --- chống dò PIN
const victim = A.phone;
const ip1 = fresh();
for (let i = 0; i < 5; i++) assert.equal((await login(victim, "999888", ip1)).status, 401);
r = await login(victim, A.pin, fresh()); // PIN ĐÚNG nhưng đã bị khoá theo SĐT (IP khác)
assert.equal(r.status, 429, "khoá theo SĐT dù đến từ IP khác");
assert.ok(Number(r.headers.get("retry-after")) > 0);
assert.equal(r.body.error.code, "too_many_attempts");
r = await raw(ADMIN, "GET", "/api/staff");
assert.equal(r.body.staff.find((s) => s.id === A.id).locked, true);
assert.equal((await raw(ADMIN, "POST", `/api/staff/${A.id}/unlock`)).status, 200);
assert.equal((await login(victim, A.pin, fresh())).status, 200);
r = await raw(ADMIN, "GET", "/api/staff");
assert.equal(r.body.staff.find((s) => s.id === A.id).locked, false);
console.log("✓ khoá sau 5 lần sai, admin mở khoá được");

// bắn song song 40 lần dò vào một SĐT: tối đa 5 lần được kiểm PIN
const victim2 = rnd();
await raw(ADMIN, "POST", "/api/staff", { fullName: "Nạn nhân 2", phone: victim2 });
const burst = await Promise.all(Array.from({ length: 40 }, (_, i) => login(victim2, String(100000 + i * 7), fresh())));
const checked = burst.filter((b) => b.status === 401).length, blocked = burst.filter((b) => b.status === 429).length;
console.log(`  song song 40: ${checked} lần được kiểm, ${blocked} bị chặn`);
assert.ok(checked <= 5, `chỉ được kiểm tối đa 5 lần, thực tế ${checked}`);
assert.equal(checked + blocked, 40);
// đăng nhập đúng xoá bộ đếm
const okPhone = rnd();
r = await raw(ADMIN, "POST", "/api/staff", { fullName: "Đúng sai", phone: okPhone });
const okPin = r.body.pin;
for (let i = 0; i < 4; i++) await login(okPhone, "999888", fresh());
assert.equal((await login(okPhone, okPin, fresh())).status, 200);
for (let i = 0; i < 4; i++) assert.equal((await login(okPhone, "999888", fresh())).status, 401); // bộ đếm đã được xoá
console.log("✓ chống dò song song + đăng nhập đúng xoá bộ đếm");

// giới hạn theo IP: 30 lần sai vào 31 SĐT khác nhau từ cùng một IP
const ipx = fresh(); let ipBlocked = false;
for (let i = 0; i < 34 && !ipBlocked; i++) ipBlocked = (await login(rnd(), "999888", ipx)).status === 429;
assert.ok(ipBlocked, "cùng IP dò nhiều SĐT phải bị chặn");
console.log("✓ giới hạn theo IP");

// --- kéo từ Sheet (Sheet nhân viên thật, chưa có SĐT)
r = await raw(ADMIN, "GET", "/api/staff/sheet");
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log(`  Sheet: ${r.body.candidates.length} ứng viên, ${r.body.problems.length} vấn đề, ${r.body.notInSheet.length} có trong hệ thống nhưng không có trong Sheet`);
assert.ok(Array.isArray(r.body.candidates) && Array.isArray(r.body.problems) && Array.isArray(r.body.notInSheet));
assert.equal((await raw(ADMIN, "POST", "/api/staff/sheet/apply", { phones: [] })).status, 400);
assert.equal((await raw(ADMIN, "POST", "/api/staff/sheet/apply", { phones: ["0999999999"] })).status, 409); // không có trong Sheet → không tạo
assert.equal((await raw(SALES, "POST", "/api/staff/sheet/apply", { phones: ["0999999999"] })).status, 403);
console.log("✓ kéo từ Sheet: xem trước + chỉ tin dữ liệu Sheet");
console.log("E2E ADMIN OK");
```

- [ ] **Bước 26: Tạo/ghi `tests/e2e/admin-race.mjs`**

```js
import assert from "node:assert/strict";
import { ACCOUNTS, call, randomPhone as rnd, session } from "./lib.mjs";

const Z = await session(ACCOUNTS.admin);
const mk = async (name) => {
  const p = rnd();
  const r = await call(Z, "POST", "/api/staff", { fullName: name, phone: p, permissions: ["ADMIN"] });
  return { id: r.body.staff.id, phone: p, pin: r.body.pin };
};
const X = await mk("Race X"), Y = await mk("Race Y");
const xc = (await call(null, "POST", "/api/auth/login", { phone: X.phone, pin: X.pin })).cookie;
const yc = (await call(null, "POST", "/api/auth/login", { phone: Y.phone, pin: Y.pin })).cookie;
const isAdmin = (s) => s.permissions.includes("ADMIN") && s.active;
const list = (await call(xc, "GET", "/api/staff")).body.staff;
const others = list.filter((s) => isAdmin(s) && s.id !== X.id && s.id !== Y.id);
for (const o of others) assert.equal((await call(xc, "PATCH", `/api/staff/${o.id}`, { active: false })).status, 200);
const activeAdmins = async (c) => (await call(c, "GET", "/api/staff")).body?.staff?.filter(isAdmin) ?? [];
assert.equal((await activeAdmins(xc)).length, 2);

// hai admin cuối bỏ quyền ADMIN của nhau cùng lúc
const [a, b] = await Promise.all([
  call(xc, "PUT", `/api/staff/${Y.id}/permissions`, { permissions: ["SALES"] }),
  call(yc, "PUT", `/api/staff/${X.id}/permissions`, { permissions: ["SALES"] }),
]);
console.log("kết quả song song:", a.status, b.status);
const survivor = a.status === 200 ? xc : yc; // người thắng cuộc vẫn còn ADMIN
const left = await activeAdmins(survivor);
const permLogs = (await call(survivor, "GET", "/api/audit?action=permission_changed&limit=100")).body.entries.filter((e) => e.targetId === X.id || e.targetId === Y.id);

// khôi phục TRƯỚC khi kiểm, để kịch bản sau vẫn có admin test: mở lại các admin cũ, ngưng X/Y
for (const o of others) await call(survivor, "PATCH", `/api/staff/${o.id}`, { active: true });
for (const s of [X, Y]) await call(Z, "PATCH", `/api/staff/${s.id}`, { active: false });

// Bên thua nhận 409 (chốt chặn "còn admin khác" trong luật hoặc trong SQL) hoặc 403 (đã bị bỏ ADMIN trước khi request của mình chạy).
assert.equal([a, b].filter((x) => x.status === 200).length, 1, "đúng một bên thắng");
assert.ok([a.status, b.status].every((s) => s === 200 || s === 403 || s === 409));
assert.ok(left.length >= 1, "phải còn ít nhất 1 admin hoạt động");
console.log("admin còn lại:", left.map((s) => s.fullName).join(", "));
// bên thua KHÔNG được để lại dòng nhật ký "Đổi quyền"
assert.equal(permLogs.length, 1, `chỉ bên thắng có nhật ký: ${JSON.stringify(permLogs)}`);
console.log("✓ bên thua không ghi nhật ký");
console.log("RACE OK");
```

- [ ] **Bước 27: Tạo/ghi `tests/e2e/permissions.mjs`**

```js
// Bản đồ quyền ADR-0007 trên route thật: FIELD chỉ dùng việc được giao (không đơn/tiền/hồ sơ), ACCOUNTING xem nhưng không lập đơn,
// SALES chỉ nhật ký đơn của mình, ADMIN mọi thứ; quyền đổi có hiệu lực ngay; tài khoản nhiều quyền hợp các ô.
import assert from "node:assert/strict";
import { ACCOUNTS, call, orderInput, randomPhone, session } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const SALES_B = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant);
const FIELD = await session(ACCOUNTS.field);

// một đơn của salesA để thử xem/sửa
let r = await call(SALES, "POST", "/api/orders", orderInput());
assert.equal(r.status, 201, JSON.stringify(r.body));
const order = r.body.order;

// --- /me trả quyền và hồ sơ
for (const [cookie, perms] of [[SALES, ["SALES"]], [ADMIN, ["ADMIN"]], [ACC, ["ACCOUNTING"]], [FIELD, ["FIELD"]]]) {
  r = await call(cookie, "GET", "/api/auth/me");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.staff.permissions, perms);
  assert.ok(r.body.staff.partyId, "tài khoản seed phải có hồ sơ");
}
console.log("✓ /me trả quyền + hồ sơ");

// --- FIELD: chặn mặc định mọi bề mặt đơn/tiền/hồ sơ/quản trị (R-N1-15); vẫn đọc được địa điểm
const fieldDenied = [
  ["GET", "/api/orders"], ["GET", `/api/orders/${order.id}`], ["POST", "/api/orders", orderInput()], ["PUT", `/api/orders/${order.id}`, orderInput()],
  ["PUT", `/api/orders/${order.id}/trip`, {}], ["POST", `/api/orders/${order.id}/status`, { status: "cancelled" }], ["GET", "/api/catalog"],
  ["GET", "/api/parties"], ["GET", "/api/parties/meta"], ["GET", "/api/parties/lookup?phone=0901234567"], ["POST", "/api/parties", { kind: "PERSON", fullName: "A" }],
  ["GET", "/api/staff"], ["GET", "/api/audit"], ["POST", "/api/locations", {}],
];
for (const [method, path, body] of fieldDenied) {
  r = await call(FIELD, method, path, body);
  assert.equal(r.status, 403, `FIELD ${method} ${path} → ${r.status}`);
}
assert.equal((await call(FIELD, "GET", "/api/locations")).status, 200);
assert.equal((await call(null, "GET", "/api/orders")).status, 401);
console.log("✓ FIELD bị chặn mọi bề mặt đơn/tiền/hồ sơ/quản trị (mặc định từ chối)");

// --- ACCOUNTING: xem đơn/nhật ký/bảng giá/hồ sơ; KHÔNG lập/sửa/huỷ đơn; không quản trị
assert.equal((await call(ACC, "GET", "/api/orders")).status, 200);
assert.equal((await call(ACC, "GET", "/api/catalog")).status, 200);
r = await call(ACC, "GET", `/api/orders/${order.id}`);
assert.equal(r.status, 200); assert.ok(r.body.history.length >= 1, "kế toán xem nhật ký mọi đơn (đối chiếu tiền)"); assert.equal(r.body.canModify, false);
assert.equal((await call(ACC, "POST", "/api/orders", orderInput())).status, 403, "kế toán không lập đơn");
assert.equal((await call(ACC, "PUT", `/api/orders/${order.id}`, orderInput())).status, 403);
assert.equal((await call(ACC, "POST", `/api/orders/${order.id}/status`, { status: "cancelled" })).status, 403);
assert.equal((await call(ACC, "POST", "/api/parties", { kind: "PERSON", fullName: "Khách Kế Toán Tạo" })).status, 201, "kế toán tạo hồ sơ khách");
for (const [method, path, body] of [["GET", "/api/staff"], ["GET", "/api/audit"], ["POST", "/api/locations", {}], ["GET", "/api/catalog/admin"]]) {
  assert.equal((await call(ACC, method, path, body)).status, 403, `ACCOUNTING ${method} ${path}`);
}
console.log("✓ ACCOUNTING xem, không lập/sửa đơn, không quản trị");

// --- SALES: nhật ký chỉ của mình; ADMIN xem và sửa mọi đơn
assert.equal((await call(SALES_B, "GET", `/api/orders/${order.id}`)).body.history.length, 0);
assert.ok((await call(SALES, "GET", `/api/orders/${order.id}`)).body.history.length >= 1);
r = await call(ADMIN, "GET", `/api/orders/${order.id}`);
assert.ok(r.body.history.length >= 1); assert.equal(r.body.canModify, true);
assert.equal((await call(SALES_B, "PUT", `/api/orders/${order.id}`, orderInput())).status, 403);
console.log("✓ SALES nhật ký của mình, ADMIN mọi đơn");

// --- tài khoản nhiều quyền hợp các ô; quyền đổi có hiệu lực NGAY với phiên đang mở
const phone = randomPhone();
r = await call(ADMIN, "POST", "/api/staff", { fullName: "Nhiều Quyền Thử", phone, permissions: ["FIELD", "ACCOUNTING"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["ACCOUNTING", "FIELD"], "thứ tự chuẩn hoá");
const M = { id: r.body.staff.id };
const MC = (await call(null, "POST", "/api/auth/login", { phone, pin: r.body.pin })).cookie;
assert.equal((await call(MC, "GET", "/api/orders")).status, 200, "FIELD + ACCOUNTING = văn phòng");
assert.equal((await call(MC, "POST", "/api/orders", orderInput())).status, 403);
assert.equal((await call(ADMIN, "PUT", `/api/staff/${M.id}/permissions`, { permissions: ["FIELD"] })).status, 200);
assert.equal((await call(MC, "GET", "/api/orders")).status, 403, "bỏ ACCOUNTING → mất quyền xem đơn ngay");
assert.equal((await call(ADMIN, "PUT", `/api/staff/${M.id}/permissions`, { permissions: ["SALES", "FIELD"] })).status, 200);
assert.equal((await call(MC, "POST", "/api/orders", orderInput())).status, 201, "thêm SALES → lập đơn được ngay");
assert.equal((await call(ADMIN, "PATCH", `/api/staff/${M.id}`, { active: false })).status, 200);
console.log("✓ nhiều quyền + hiệu lực ngay");
console.log("E2E PERMISSIONS OK");
```

- [ ] **Bước 28: Sửa `src/architecture.test.ts`** — `staff` thành module nghiêm (SQL được EXPLAIN kiểm); `LEGACY` chỉ còn accounts/audit/auth/catalog/orders

Thay đoạn (đúng một chỗ):

```ts
const STRICT: readonly { module: string; file: string }[] = [
  { module: "locations", file: "modules/locations/repository.ts" },
  { module: "parties", file: "modules/parties/repository.ts" },
];
```

bằng:

```ts
const STRICT: readonly { module: string; file: string }[] = [
  { module: "locations", file: "modules/locations/repository.ts" },
  { module: "parties", file: "modules/parties/repository.ts" },
  { module: "staff", file: "modules/staff/repository.ts" },
];
```

Thay đoạn (đúng một chỗ):

```ts
 * Hạn: `staff` chuyển sang STRICT ở kế hoạch N1-B (Task B1); `audit`/`orders` bỏ JOIN thẳng bảng khi chạm ở N1-B (Task B4) và còn wonGuard của orders tới N2;
 * `accounts`, `auth`, `catalog` chưa có SQL riêng đáng kể — chuyển STRICT khi có SQL mới.
 */
const LEGACY = ["accounts", "audit", "auth", "catalog", "orders", "staff"] as const;
```

bằng:

```ts
 * Hạn: `audit` và `orders` đã bỏ JOIN thẳng bảng (đọc qua view công bố) ở N1-B nhưng SQL của chúng chưa đăng ký — chuyển STRICT khi được chạm ở N2;
 * `wonGuard` của orders (đọc audit_log) ở lại tới N2; `accounts`, `auth`, `catalog` chưa có SQL riêng đáng kể — chuyển STRICT khi có SQL mới.
 */
const LEGACY = ["accounts", "audit", "auth", "catalog", "orders"] as const;
```

- [ ] **Bước 29: Thêm vào CUỐI `src/architecture.test.ts`** — R-N1-14 (không đọc `staff.role`/`staff.full_name`, không `SELECT * FROM staff`) và kiểm cột chết có thật

```ts
// ---------------------------------------------------------------------------------------------------------------------
// R-N1-14 (đặc tả N1 §5): staff.role và staff.full_name là cột CHẾT (ADR-0005) — không SQL nào đọc chúng.
// Kiểm hai lớp: (1) KIỂU — StaffRecord/StaffProfile không có hai trường, đọc thuộc tính là lỗi `tsc`; (2) bài kiểm này quét mã nguồn.
// Quét chuỗi không phải cơ chế ranh giới (ADR-0002 điều 8) — chỉ là lưới thêm cho hai tên cột đã biết; SQL của staff còn được EXPLAIN kiểm ở trên.
// ---------------------------------------------------------------------------------------------------------------------
test("R-N1-14: không đọc staff.role / staff.full_name; không SELECT * FROM staff", () => {
  const WRITE_ONLY_FILES = new Set(["src/modules/staff/repository.ts", "scripts/staff-lib.mjs"]); // câu INSERT ghi hằng 'sales' và ''
  const files = [...walk(SRC), ...readdirSync(join(ROOT, "scripts")).filter((f) => f.endsWith(".mjs")).map((f) => join(ROOT, "scripts", f))];
  const problems: string[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file).split(sep).join("/");
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/^\s*(?:\/\/|\/\*|\*)/.test(line)) return; // dòng chú thích (//, /* … */, * …)
      const code = line.replace(/\/\/.*$/, ""); // bỏ chú thích cuối dòng
      const where = `${rel}:${i + 1}`;
      if (/\bfull_name\b/.test(code) && !WRITE_ONLY_FILES.has(rel)) problems.push(`${where}: đọc/ghi full_name`);
      if (/SELECT\s+\*\s+FROM\s+staff\b/i.test(code) || /\bs\.\*/.test(code)) problems.push(`${where}: SELECT * trên staff`);
      if (/\b(?:s|t|staff)\.role\b/.test(code) || /\brole\s*=\s*'(?:admin|sales)'/.test(code) || /\brole\s+IN\s*\(/i.test(code)) problems.push(`${where}: đọc staff.role`);
    });
  }
  assert.deepEqual(problems, []);
});

test("sổ dữ liệu: cột đánh dấu chết (deprecatedColumns) có thật trong bảng", () => {
  for (const t of dict.tables) for (const c of t.deprecatedColumns ?? []) assert.ok(columns(t.name).some((x) => x.name === c), `${t.name}.${c} không tồn tại`);
});
```

- [ ] **Bước 30: Sửa `docs/data-dictionary.json`** — đánh dấu hai cột chết của `staff` (ADR-0005)

Đặt trường cho bảng `staff`: `{"deprecatedColumns": ["role", "full_name"]}`

Rồi chạy `npm run dict` để sinh lại `docs/DATA-DICTIONARY.md`.

- [ ] **Bước 31: Chạy** `npm run dict`

Kỳ vọng: sinh lại `docs/DATA-DICTIONARY.md`.

**Kiểm chứng ở cuối task (lần đầu chạy sau Nhóm 1)**

- [ ] **Bước 32: Chạy** `npm test`

Kỳ vọng: toàn bộ đạt, 0 lỗi. (lần kiểm khi soạn: 158 tests, 158 đạt, 0 lỗi)

- [ ] **Bước 33: Chạy** `npx tsc --noEmit`

Kỳ vọng: không có lỗi (thoát 0).

- [ ] **Bước 34: Chạy** `npm run test:e2e`

Kỳ vọng: `E2E: 10/10 kịch bản xanh` (platform, pwa, orders, trip, admin, catalog, admin-race, locations, parties, permissions). `admin` và `admin-race` đã viết lại; `permissions` mới. (`tsc -p web` chưa kiểm ở đây: web còn đọc `staff.role` tới Task B2.) (lần kiểm khi soạn: `E2E: 10/10 kịch bản xanh`)

- [ ] **Bước 35: Commit**

```bash
git add <các tệp vừa tạo/sửa>
git commit -m "N1 B1: đổi role → quyền (stf_permission) và full_name → hồ sơ trên máy chủ; quyền theo ADR-0007; staff thành module nghiêm"
```

---

### Task B2: Giao diện: chuyển `staff.role` sang quyền (thanh điều hướng, tab Tôi, trang Nhật ký/Dịch vụ/Nhân viên)

`web/shell.ts` và `web/account.ts` là bản của PWA (đã gộp ở T0) — task này thêm quyền lên đúng cấu trúc đó (thanh tab, `initShell`), không dựng lại. Trang Hồ sơ/Địa điểm chưa có thiết kế điện thoại riêng: chúng vào được từ thanh điều hướng trên (máy tính) và từ mục liên kết của tab Tôi (điện thoại). Sau task này `tsc -p web` phải trở lại **đúng 4 lỗi A2** đã biết. Giao diện chưa có test tự động; kiểm bằng `tsc`, đóng gói esbuild, và (Task B3) kịch bản duyệt bằng Chrome.

**Files:**
- Ghi đè: `web/shell.ts`, `web/account.ts`, `web/staff.ts`
- Sửa: `web/audit.ts`, `web/catalog.ts`, `public/staff.html`

**Interfaces:**
- Consumes: `StaffProfile.permissions` (B1); `hasPermission`, `isOffice`, `PERMISSION_CODES`, `PERMISSION_LABEL` (`src/shared/permissions.ts`, web import qua `../src/shared/permissions`); `PUT /api/staff/:id/permissions`, `StaffPermissionsRequest`.
- Produces: Thanh điều hướng trên theo quyền (Đơn hàng/+ Đơn mới/Hồ sơ cho nhân sự văn phòng; Dịch vụ/Nhân viên/Địa điểm/Nhật ký cho ADMIN; tài khoản chỉ-FIELD không có mục nào); thanh tab dưới đáy chỉ có tab Tôi cho tài khoản chỉ-FIELD; tab Tôi hiển thị quyền và liên kết tới Hồ sơ/Địa điểm/Nhật ký; trang Nhân viên chọn quyền bằng bốn ô tick thay ô chọn vai trò.

- [ ] **Bước 1: Tạo/ghi `web/shell.ts`**

```ts
import { ApiError, api, type Staff, type Api } from "./api";
import { hasPermission, isOffice } from "../src/shared/permissions";
import { byId, h, replaceChildren } from "./dom";
import { icon, type IconName } from "./icons";
import { registerServiceWorker } from "./pwa";

interface Tab {
  href: string;
  label: string;
  icon: IconName;
  active: (path: string) => boolean;
}

/**
 * Thanh tab dưới đáy (điện thoại): nhân sự văn phòng 3 tab, admin 5 tab; tài khoản chỉ-FIELD chỉ có tab Tôi (việc được giao thuộc N2).
 * /order thuộc tab Đơn hàng, /audit thuộc tab Tôi. Trang Hồ sơ/Địa điểm có ở thanh điều hướng trên và ở mục liên kết của tab Tôi (chưa có thiết kế điện thoại riêng).
 */
function tabsFor(admin: boolean, office: boolean): Tab[] {
  const adminTabs: Tab[] =
    admin
      ? [
          { href: "/catalog", label: "Dịch vụ", icon: "services", active: (p) => p === "/catalog" },
          { href: "/staff", label: "Nhân viên", icon: "staff", active: (p) => p === "/staff" },
        ]
      : [];
  const officeTabs: Tab[] = office
    ? [
        { href: "/", label: "Đơn hàng", icon: "orders", active: (p) => p === "/" || p === "/order" },
        { href: "/order-form", label: "Đơn mới", icon: "plus", active: (p) => p === "/order-form" },
      ]
    : [];
  return [
    ...officeTabs,
    ...adminTabs,
    { href: "/account", label: "Tôi", icon: "me", active: (p) => p === "/account" || p === "/audit" },
  ];
}

function tabBar(admin: boolean, office: boolean, path: string): HTMLElement {
  return h(
    "nav",
    { id: "tabbar", "aria-label": "Điều hướng chính" },
    ...tabsFor(admin, office).map((t) =>
      h("a", { href: t.href, class: t.icon === "plus" ? "tab tab-new" : "tab", "aria-current": t.active(path) ? "page" : false }, h("span", { class: "tab-icon" }, icon(t.icon)), h("span", null, t.label)),
    ),
  );
}

export async function logout(): Promise<void> {
  await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  location.assign("/login");
}

/** Đổi tiêu đề trên thanh đầu trang (điện thoại) sau khi trang biết nội dung, vd mã đơn. */
export function setBarTitle(text: string): void {
  const el = document.getElementById("bar-title");
  if (el) el.textContent = text;
}

/** Khung chung các trang sau đăng nhập: vẽ ngay phần không cần biết người dùng (khỏi nháy trắng), rồi xác thực phiên và điền phần còn lại. Trả nhân viên hiện tại. */
export async function initShell(): Promise<Staff> {
  registerServiceWorker();
  const { title, back, tabbar } = document.body.dataset;
  const path = location.pathname.replace(/\/+$/, "") || "/";

  const backLink = back ? h("a", { class: "bar-back", href: back, "aria-label": "Quay lại" }, icon("back", 26)) : null;
  backLink?.addEventListener("click", (e) => {
    if (history.length > 1) {
      e.preventDefault();
      history.back();
    }
  });
  const nav = h("nav", { class: "topnav" });
  const who = h("div", { class: "who" });
  replaceChildren(
    byId("topbar"),
    backLink,
    h("a", { class: "brand", href: "/" }, h("img", { class: "brand-logo", src: "/icons/logo-96.png", alt: "", width: 30, height: 30 }), "Tour Đảo ", h("span", null, "Booking")),
    title ? h("span", { class: "bar-title", id: "bar-title" }, title) : null,
    nav,
    who,
  );

  const addTabBar = (admin: boolean, office = true) => {
    if (tabbar === "off") return;
    document.body.append(tabBar(admin, office, path));
    document.body.classList.add("has-tabbar");
  };
  let me: Api.MeResponse;
  try {
    me = await api<Api.MeResponse>("/api/auth/me");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Mất mạng (khung vẫn mở được từ cache): báo rõ thay vì để trang trống, rồi giữ lời gọi treo như goLogin() ở api.ts.
    const el = document.getElementById("error");
    if (el) showError(el, "Không có kết nối mạng. Kiểm tra Wi-Fi hoặc 4G rồi mở lại app.");
    addTabBar(false); // không biết vai khi mất mạng: hiện 3 tab cơ bản để còn điều hướng (QA2 Q2-04)
    return new Promise<never>(() => undefined);
  }
  const { staff } = me;
  const admin = hasPermission(staff, "ADMIN");
  const office = isOffice(staff);
  const logoutBtn = h("button", { class: "btn btn-link", type: "button" }, "Đăng xuất");
  logoutBtn.addEventListener("click", () => void logout());
  replaceChildren(
    nav,
    office && h("a", { href: "/" }, "Đơn hàng"),
    office && h("a", { href: "/order-form" }, "+ Đơn mới"),
    office && h("a", { href: "/parties" }, "Hồ sơ"),
    admin && h("a", { href: "/catalog" }, "Dịch vụ"),
    admin && h("a", { href: "/staff" }, "Nhân viên"),
    admin && h("a", { href: "/locations" }, "Địa điểm"),
    admin && h("a", { href: "/audit" }, "Nhật ký"),
  );
  replaceChildren(who, h("a", { href: "/account", title: "Tôi" }, staff.fullName), logoutBtn);
  addTabBar(admin, office);
  return staff;
}

export function showError(el: HTMLElement, message: string | null): void {
  el.textContent = message ?? "";
  el.hidden = !message;
}
```

- [ ] **Bước 2: Tạo/ghi `web/account.ts`**

```ts
import { ApiError, api } from "./api";
import { PERMISSION_LABEL, hasPermission, isOffice } from "../src/shared/permissions";
import { byId, h, replaceChildren } from "./dom";
import { initials } from "./format";
import { icon } from "./icons";
import { initShell, logout, showError } from "./shell";

const errorEl = byId("error");
const okEl = byId("ok");
const form = byId<HTMLFormElement>("pin-form");

const staff = await initShell();
replaceChildren(
  byId("me"),
  h(
    "div",
    { class: "profile" },
    h("span", { class: "avatar", "aria-hidden": "true" }, initials(staff.fullName)),
    h("div", null, h("div", { class: "profile-name" }, staff.fullName), h("div", { class: "muted" }, `${staff.phone} · ${staff.permissions.map((p) => PERMISSION_LABEL[p]).join(", ") || "chưa có quyền"}`)),
  ),
);
const logoutBtn = h("button", { class: "row-link danger", type: "button" }, "Đăng xuất");
logoutBtn.addEventListener("click", () => void logout());
replaceChildren(
  byId("links"),
  isOffice(staff) && h("a", { class: "row-link", href: "/parties" }, "Hồ sơ", icon("next", 20)),
  hasPermission(staff, "ADMIN") && h("a", { class: "row-link", href: "/locations" }, "Địa điểm", icon("next", 20)),
  hasPermission(staff, "ADMIN") && h("a", { class: "row-link", href: "/audit" }, "Nhật ký", icon("next", 20)),
  logoutBtn,
);
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError(errorEl, null);
  okEl.hidden = true;
  const currentPin = byId<HTMLInputElement>("current").value;
  const newPin = byId<HTMLInputElement>("new").value;
  if (newPin !== byId<HTMLInputElement>("confirm").value) return showError(errorEl, "Hai lần nhập PIN mới không khớp.");
  try {
    await api("/api/account/change-pin", { method: "POST", body: { currentPin, newPin } });
    form.reset();
    okEl.hidden = false;
  } catch (err) {
    showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
  }
});
```

- [ ] **Bước 3: Tạo/ghi `web/staff.ts`**

```ts
import { ApiError, api, type SheetCandidate, type StaffAccount, type Api } from "./api";
import { PERMISSION_CODES, PERMISSION_LABEL, hasPermission, type PermissionCode } from "../src/shared/permissions";
import { byId, h, replaceChildren } from "./dom";
import { dateTime } from "./format";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const listEl = byId("list");
const secretEl = byId("secret");
const sheetEl = byId("sheet");
const editEl = byId("edit");
const permissionsLabel = (list: readonly PermissionCode[]): string => (list.length ? list.map((p) => PERMISSION_LABEL[p]).join(", ") : "—");
const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

let me: { id: string };
let accounts: StaffAccount[] = [];

const fail = (err: unknown) => showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

/** PIN chỉ hiện đúng một lần ở đây; không lưu vào bất kỳ đâu phía client. */
function showSecrets(title: string, rows: { name: string; phone: string; pin: string }[]): void {
  const copy = h("button", { type: "button", class: "btn" }, "Sao chép danh sách");
  copy.addEventListener("click", async () => {
    await navigator.clipboard?.writeText(rows.map((r) => `${r.name}\t${r.phone}\t${r.pin}`).join("\n")).catch(() => undefined);
    copy.textContent = "Đã sao chép";
  });
  const close = h("button", { type: "button", class: "btn btn-link" }, "Đã ghi lại, ẩn đi");
  close.addEventListener("click", () => {
    secretEl.hidden = true;
    replaceChildren(secretEl);
  });
  replaceChildren(
    secretEl,
    h("h2", null, title),
    h("p", { class: "alert warn" }, "PIN chỉ hiển thị một lần duy nhất. Hãy gửi riêng cho từng người (không gửi vào nhóm chung); họ nên tự đổi PIN sau khi đăng nhập."),
    h("table", { class: "items" }, h("thead", null, h("tr", null, h("th", null, "Họ tên"), h("th", null, "Số điện thoại (tên đăng nhập)"), h("th", null, "PIN"))),
      h("tbody", null, ...rows.map((r) => h("tr", null, h("td", null, r.name), h("td", null, r.phone), h("td", { class: "pin" }, r.pin))))),
    h("div", { class: "actions", style: "margin-top:12px" }, copy, close),
  );
  secretEl.hidden = false;
  secretEl.scrollIntoView({ block: "nearest" });
}

async function act<T>(fn: () => Promise<T>): Promise<T | undefined> {
  showError(errorEl, null);
  try {
    return await fn();
  } catch (err) {
    fail(err);
    return undefined;
  }
}

function row(s: StaffAccount): HTMLElement {
  const btn = (label: string, onclick: () => void, cls = "btn btn-link") => {
    const b = h("button", { type: "button", class: cls }, label);
    b.addEventListener("click", onclick);
    return b;
  };
  const isMe = s.id === me.id;
  return h(
    "tr",
    { class: s.active ? "" : "row-off" },
    h("td", null, s.fullName, isMe && h("span", { class: "muted" }, " (bạn)"), !s.active && h("span", { class: "badge badge-cancelled" }, "Ngưng"), s.locked && h("span", { class: "badge badge-draft" }, "Bị khoá đăng nhập")),
    h("td", null, s.phone),
    h("td", null, permissionsLabel(s.permissions)),
    h("td", { class: "muted" }, dateTime(s.createdAt)),
    h(
      "td",
      { class: "row-actions" },
      btn("Sửa", () => openEdit(s)),
      btn("Đặt lại PIN", async () => {
        if (!confirm(`Đặt lại PIN của ${s.fullName}? PIN cũ và mọi phiên đang đăng nhập sẽ mất hiệu lực.`)) return;
        const r = await act(() => api<Api.StaffWithPinResponse>(`/api/staff/${s.id}/reset-pin`, { method: "POST" }));
        if (r) {
          showSecrets("PIN mới", [{ name: s.fullName, phone: s.phone, pin: r.pin }]);
          await load();
        }
      }),
      s.locked && btn("Mở khoá", async () => {
        if (await act(() => api(`/api/staff/${s.id}/unlock`, { method: "POST" }))) await load();
      }),
      !isMe &&
        btn(
          s.active ? "Ngưng" : "Kích hoạt lại",
          async () => {
            if (s.active && !confirm(`Ngưng tài khoản ${s.fullName}? Họ sẽ bị đăng xuất ngay.`)) return;
            if (await act(() => api(`/api/staff/${s.id}`, { method: "PATCH", body: { active: !s.active } }))) await load();
          },
          s.active ? "btn btn-link danger" : "btn btn-link",
        ),
    ),
  );
}

function openEdit(s: StaffAccount): void {
  const name = h("input", { type: "text", value: s.fullName, maxLength: 200 });
  const phone = h("input", { type: "tel", value: s.phone });
  const isMe = s.id === me.id; // không tự đổi quyền của mình
  const boxes = new Map<PermissionCode, HTMLInputElement>();
  const permissionBoxes = PERMISSION_CODES.map((code) => {
    const box = h("input", { type: "checkbox", checked: s.permissions.includes(code), disabled: isMe, style: "width:auto;display:inline;margin:0 6px 0 0" });
    boxes.set(code, box);
    return h("label", { class: "check" }, box, PERMISSION_LABEL[code]);
  });
  const save = h("button", { type: "button", class: "btn btn-primary" }, "Lưu");
  const cancel = h("button", { type: "button", class: "btn" }, "Đóng");
  cancel.addEventListener("click", () => (editEl.hidden = true));
  save.addEventListener("click", async () => {
    const chosen = PERMISSION_CODES.filter((code) => boxes.get(code)!.checked);
    if (!isMe && chosen.length === 0) return showError(errorEl, "Chọn ít nhất một quyền.");
    if (!(await act(() => api(`/api/staff/${s.id}`, { method: "PATCH", body: { fullName: name.value, phone: phone.value } })))) return;
    if (!isMe && !sameSet(chosen, s.permissions)) {
      const body: Api.StaffPermissionsRequest = { permissions: chosen };
      if (!(await act(() => api(`/api/staff/${s.id}/permissions`, { method: "PUT", body })))) return void (await load());
    }
    editEl.hidden = true;
    await load();
  });
  replaceChildren(
    editEl,
    h("h2", null, `Sửa: ${s.fullName}`),
    h("div", { class: "grid three" }, h("label", null, "Họ tên", name), h("label", null, "Số điện thoại đăng nhập", phone), h("div", null, h("strong", null, "Quyền trong app"), ...permissionBoxes)),
    h("p", { class: "muted" }, "Đổi số điện thoại sẽ đổi tên đăng nhập của người này. Phiên đang đăng nhập vẫn giữ nguyên."),
    h("div", { class: "actions" }, save, cancel),
  );
  editEl.hidden = false;
  editEl.scrollIntoView({ block: "nearest" });
}

async function load(): Promise<void> {
  const r = await act(() => api<Api.StaffListResponse>("/api/staff"));
  if (!r) return;
  accounts = r.staff;
  replaceChildren(listEl, ...accounts.map(row));
}

// ---- Thêm thủ công
byId<HTMLFormElement>("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = byId<HTMLInputElement>("add-name");
  const phone = byId<HTMLInputElement>("add-phone");
  const chosen = PERMISSION_CODES.filter((code) => byId<HTMLInputElement>(`add-perm-${code}`).checked);
  if (chosen.length === 0) return showError(errorEl, "Chọn ít nhất một quyền.");
  const r = await act(() => api<Api.StaffWithPinResponse>("/api/staff", { method: "POST", body: { fullName: name.value, phone: phone.value, permissions: chosen } }));
  if (r) {
    showSecrets("Tài khoản mới", [{ name: r.staff.fullName, phone: r.staff.phone, pin: r.pin }]);
    name.value = phone.value = "";
    for (const code of PERMISSION_CODES) byId<HTMLInputElement>(`add-perm-${code}`).checked = code === "SALES";
    await load();
  }
});

// ---- Đồng bộ từ Google Sheet: xem trước rồi mới xác nhận
byId("sheet-pull").addEventListener("click", async () => {
  const r = await act(() =>
    api<Api.StaffSheetPreviewResponse>("/api/staff/sheet"),
  );
  if (!r) return;
  const fresh = r.candidates.filter((c) => c.status === "new");
  const boxes = new Map<string, HTMLInputElement>();
  const apply = h("button", { type: "button", class: "btn btn-accent" }, "Tạo tài khoản cho người đã chọn");
  const refresh = () => {
    const n = [...boxes.values()].filter((b) => b.checked).length;
    apply.disabled = n === 0;
    apply.textContent = n ? `Tạo ${n} tài khoản` : "Tạo tài khoản cho người đã chọn";
  };
  for (const c of fresh) {
    const box = h("input", { type: "checkbox", checked: true, style: "width:auto;display:inline;margin:0 8px 0 0" });
    box.addEventListener("change", refresh);
    boxes.set(c.phone, box);
  }
  apply.addEventListener("click", async () => {
    const phones = [...boxes].filter(([, b]) => b.checked).map(([p]) => p);
    const res = await act(() => api<Api.StaffSheetApplyResponse>("/api/staff/sheet/apply", { method: "POST", body: { phones } }));
    if (res) {
      sheetEl.hidden = true;
      showSecrets(`Đã tạo ${res.created.length} tài khoản`, res.created.map((c) => ({ name: c.fullName, phone: c.phone, pin: c.pin })));
      await load();
    }
  });
  const close = h("button", { type: "button", class: "btn" }, "Đóng");
  close.addEventListener("click", () => (sheetEl.hidden = true));
  replaceChildren(
    sheetEl,
    h("h2", null, "Xem trước dữ liệu từ Google Sheet"),
    h("p", { class: "muted" }, "Sheet chỉ là nguồn đề xuất. Mọi tài khoản mới chỉ có quyền Bán hàng (đổi quyền ở nút Sửa). Sheet không tự ngưng hay xoá ai."),
    fresh.length === 0
      ? h("p", { class: "alert warn" }, r.candidates.length === 0 && r.problems.length > 0
          ? "Sheet chưa có ai kèm số điện thoại hợp lệ. Hãy điền số điện thoại vào Sheet rồi đồng bộ lại."
          : "Không có ai mới để thêm — mọi người trong Sheet đều đã có tài khoản.")
      : h("div", null, h("h3", null, `Người mới (${fresh.length})`), ...fresh.map((c) => h("label", { class: "check" }, boxes.get(c.phone)!, `${c.name} — ${c.phone}`))),
    r.candidates.some((c) => c.status !== "new") &&
      h("div", null, h("h3", null, "Đã có tài khoản"), h("ul", { class: "history" }, ...r.candidates.filter((c) => c.status !== "new").map((c) => h("li", null, `${c.phone}: `, c.status === "name_differs" ? `Sheet ghi "${c.name}", hệ thống đang là "${c.currentName}" (sửa tên ở nút Sửa nếu cần)` : `${c.name} — không đổi`)))),
    r.problems.length > 0 && h("div", null, h("h3", null, `Dòng bị bỏ qua (${r.problems.length})`), h("ul", { class: "history" }, ...r.problems.map((p) => h("li", null, `Dòng ${p.row}: ${p.message}`)))),
    r.notInSheet.length > 0 && h("details", null, h("summary", { class: "muted" }, `${r.notInSheet.length} tài khoản có trong hệ thống nhưng không có trong Sheet (không bị đụng tới)`), h("ul", { class: "history" }, ...r.notInSheet.map((s) => h("li", null, `${s.fullName} — ${s.phone}${s.active ? "" : " (đã ngưng)"}`)))),
    h("div", { class: "actions", style: "margin-top:12px" }, fresh.length > 0 && apply, close),
  );
  refresh();
  sheetEl.hidden = false;
  sheetEl.scrollIntoView({ block: "nearest" });
});

const staff = await initShell();
me = staff;
if (!hasPermission(staff, "ADMIN")) showError(errorEl, "Chỉ quản trị viên được vào trang này.");
else await load();
```

- [ ] **Bước 4: Sửa `web/audit.ts`**

Thay đoạn (đúng một chỗ):

```ts
import { AUDIT_ACTIONS, AUDIT_GROUPS, type AuditAction, type AuditGroup } from "../src/shared/audit-actions";
```

bằng:

```ts
import { AUDIT_ACTIONS, AUDIT_GROUPS, type AuditAction, type AuditGroup } from "../src/shared/audit-actions";
import { hasPermission } from "../src/shared/permissions";
```

Thay đoạn (đúng một chỗ):

```ts
if (staff.role !== "admin")
```

bằng:

```ts
if (!hasPermission(staff, "ADMIN"))
```

- [ ] **Bước 5: Sửa `web/catalog.ts`**

Thay đoạn (đúng một chỗ):

```ts
import { ApiError, api, type CatalogAdminItem, type CatalogSyncState, type PaxCode, type Api } from "./api";
```

bằng:

```ts
import { hasPermission } from "../src/shared/permissions";
import { ApiError, api, type CatalogAdminItem, type CatalogSyncState, type PaxCode, type Api } from "./api";
```

Thay đoạn (đúng một chỗ):

```ts
if (staff.role !== "admin")
```

bằng:

```ts
if (!hasPermission(staff, "ADMIN"))
```

- [ ] **Bước 6: Sửa `public/staff.html`**

Thay đoạn (đúng một chỗ):

```html
      <label>Vai trò<select id="add-role"><option value="sales">Nhân viên</option><option value="admin">Quản trị viên</option></select></label>
```

bằng:

```html
      <div>
        <strong>Quyền trong app</strong>
        <label class="check"><input id="add-perm-SALES" type="checkbox" checked style="width:auto;display:inline;margin:0 6px 0 0">Bán hàng</label>
        <label class="check"><input id="add-perm-ACCOUNTING" type="checkbox" style="width:auto;display:inline;margin:0 6px 0 0">Kế toán</label>
        <label class="check"><input id="add-perm-ADMIN" type="checkbox" style="width:auto;display:inline;margin:0 6px 0 0">Quản trị</label>
        <label class="check"><input id="add-perm-FIELD" type="checkbox" style="width:auto;display:inline;margin:0 6px 0 0">Thực hiện</label>
      </div>
```

Thay đoạn (đúng một chỗ):

```html
<th>Vai trò</th>
```

bằng:

```html
<th>Quyền</th>
```

- [ ] **Bước 7: Chạy** `grep -rn 'staff\.role\|\.role ===' web --include='*.ts'; test $? -eq 1`

Kỳ vọng: không in dòng nào: `web/` không còn đọc `staff.role` (grep không tìm thấy → thoát 1 → `test` thoát 0).

- [ ] **Bước 8: Chạy** `npx tsc --noEmit`

Kỳ vọng: không có lỗi (thoát 0).

- [ ] **Bước 9: Chạy** `npx tsc --noEmit -p web --pretty false`

Kỳ vọng: **LỖI** — đúng 4 lỗi đã biết (thuộc A2, KHÔNG sửa ở kế hoạch này): `web/order-form.ts` (101,5) TS2353 và (124,22) TS2339; `web/order.ts` (44,22) TS2339 và (44,33) TS7006. Nếu có lỗi khác là do bước vừa làm.

- [ ] **Bước 10: Chạy** `npm run build:web`

Kỳ vọng: esbuild đóng gói không lỗi (`Done in …ms`, hai lần: các trang và service worker).

- [ ] **Bước 11: Chạy** `npm run test:e2e -- platform pwa`

Kỳ vọng: `E2E: 2/2 kịch bản xanh`. (lần kiểm khi soạn: `E2E: 2/2 kịch bản xanh`)

- [ ] **Bước 12: Commit**

```bash
git add <các tệp vừa tạo/sửa>
git commit -m "N1 B2: giao diện đọc quyền thay vì role (thanh điều hướng, tab Tôi, trang Nhân viên)"
```

---

### Task B3: Trang Hồ sơ (`/parties`) và Địa điểm (`/locations`) + kiểm giao diện bằng trình duyệt thật

PWA yêu cầu mọi trang HTML trong `public/` phải có trong `PAGES` của `src/shared/sw-policy.ts` (test `sw-policy.test.ts` đối chiếu) — thêm hai trang ở đó; service worker chỉ cache khung tĩnh, không bao giờ cache `/api`. Không có test giao diện tự động trong repo, nên task này kết thúc bằng một kịch bản duyệt bằng Chrome headless điều khiển qua CDP (tệp tạm, không commit) chạy trên `wrangler dev` cục bộ với D1 tạm: nó đã phát hiện một lỗi thật (ô chọn mặc định không chọn mục nào) khi soạn kế hoạch.

**Files:**
- Tạo: `public/parties.html`, `public/locations.html`, `web/parties.ts`, `web/locations.ts`
- Sửa: `src/shared/sw-policy.ts`, `package.json`

**Interfaces:**
- Consumes: `/api/parties*`, `/api/locations*` (T6, T8, B1); `initShell`, `showError`, `h`, `byId` của web; quy ước PWA của các trang HTML (thẻ `<head>`, `data-title`).
- Produces: Trang Hồ sơ: tìm/lọc (tên, SĐT, loại, vai trò, nơi, gồm cả đã ngưng), tạo hồ sơ với **cảnh báo trùng SĐT** (ADR-0001 mục 8), chi tiết/sửa (khoá lạc quan), liên hệ (thêm/đóng, một liên hệ chính), vai trò theo nơi và quan hệ (chỉ ADMIN sửa). Trang Địa điểm (ADMIN): xem/thêm/sửa/ngưng dùng.

- [ ] **Bước 1: Tạo/ghi `public/parties.html`**

```html
<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="robots" content="noindex"><meta name="theme-color" content="#0c4a6e"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Tour Đảo"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" type="image/png" href="/icons/icon-192.png"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"><link rel="stylesheet" href="/app.css"><title>Hồ sơ — Tour Đảo Booking</title></head>
<body data-title="Hồ sơ">
<header id="topbar"></header>
<main>
  <h1>Hồ sơ</h1>
  <p class="muted">Danh bạ chung: khách hàng, đại lý, hướng dẫn viên, lái cano, tài xế, nhân sự… Vai trò chỉ để ghi và tìm — không giới hạn ai được chọn.</p>
  <div id="error" class="alert" role="alert" hidden></div>
  <section class="card">
    <form id="search-form" class="grid three" autocomplete="off">
      <label>Tìm (tên hoặc số điện thoại)<input id="q" type="search" maxlength="100"></label>
      <label>Loại<select id="kind"><option value="">Tất cả</option><option value="PERSON">Cá nhân</option><option value="ORGANIZATION">Tổ chức</option></select></label>
      <label>Vai trò (đang hiệu lực hôm nay)<select id="role"><option value="">Tất cả</option></select></label>
      <label>Nơi (của vai trò)<select id="location"><option value="">Tất cả</option></select></label>
      <label class="check"><input id="inactive" type="checkbox" style="width:auto;display:inline;margin:0 6px 0 0">Gồm cả hồ sơ đã ngưng</label>
      <div><button class="btn btn-primary" type="submit">Tìm</button> <button id="new" class="btn" type="button">+ Hồ sơ mới</button></div>
    </form>
  </section>
  <section id="create" class="card" hidden></section>
  <section id="detail" class="card" hidden></section>
  <section class="card table-wrap">
    <table class="items">
      <thead><tr><th>Tên</th><th>Loại</th><th>Điện thoại chính</th><th>Vai trò hôm nay</th></tr></thead>
      <tbody id="list"></tbody>
    </table>
    <p id="empty" class="muted" hidden>Không có hồ sơ nào khớp.</p>
    <div><button id="more" class="btn" type="button" hidden>Xem thêm</button></div>
  </section>
</main>
<script type="module" src="/js/parties.js"></script>
</body></html>
```

- [ ] **Bước 2: Tạo/ghi `public/locations.html`**

```html
<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="robots" content="noindex"><meta name="theme-color" content="#0c4a6e"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Tour Đảo"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" type="image/png" href="/icons/icon-192.png"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"><link rel="stylesheet" href="/app.css"><title>Địa điểm — Tour Đảo Booking</title></head>
<body data-title="Địa điểm">
<header id="topbar"></header>
<main>
  <h1>Địa điểm</h1>
  <p class="muted">Nơi phát sinh nghiệp vụ: văn phòng, quầy vé, bến tàu, bến cảng. Địa điểm không xoá được — chỉ ngưng dùng.</p>
  <div id="error" class="alert" role="alert" hidden></div>
  <section id="edit" class="card" hidden></section>
  <section class="card">
    <h2>Thêm địa điểm</h2>
    <form id="add-form" class="grid three" autocomplete="off">
      <label>Mã (chữ HOA, số, gạch dưới)<input id="add-code" type="text" maxlength="40" placeholder="QUAY_VE_05" required></label>
      <label>Tên<input id="add-name" type="text" maxlength="100" required></label>
      <label>Loại<select id="add-type"></select></label>
      <label>Địa chỉ<input id="add-address" type="text" maxlength="300"></label>
      <label>Thứ tự<input id="add-sort" type="number" min="0" max="9999" value="0"></label>
      <div><button class="btn btn-primary" type="submit">Thêm</button></div>
    </form>
  </section>
  <section class="card table-wrap">
    <table class="items">
      <thead><tr><th>Mã</th><th>Tên</th><th>Loại</th><th>Địa chỉ</th><th>Thứ tự</th><th></th></tr></thead>
      <tbody id="list"></tbody>
    </table>
  </section>
</main>
<script type="module" src="/js/locations.js"></script>
</body></html>
```

- [ ] **Bước 3: Chạy** `npm test`

Kỳ vọng: **LỖI** — **LỖI** ở `sw-policy.test.ts` "danh sách trang khớp đúng các file HTML trong public/" (hai trang mới chưa có trong `PAGES`).

- [ ] **Bước 4: Sửa `src/shared/sw-policy.ts`**

Thay đoạn (đúng một chỗ):

```ts
export const PAGES: readonly string[] = ["/", "/login", "/order-form", "/order", "/account", "/catalog", "/staff", "/audit"];
```

bằng:

```ts
export const PAGES: readonly string[] = ["/", "/login", "/order-form", "/order", "/account", "/catalog", "/staff", "/audit", "/parties", "/locations"];
```

Thay đoạn (đúng một chỗ):

```ts
/** Nạp sẵn lúc cài. Trang admin (/catalog, /staff, /audit) tự vào cache ở lần mở đầu. */
```

bằng:

```ts
/** Nạp sẵn lúc cài. Các trang còn lại (/catalog, /staff, /audit, /parties, /locations) tự vào cache ở lần mở đầu. */
```

- [ ] **Bước 5: Tạo/ghi `web/locations.ts`**

```ts
// Trang Địa điểm (chỉ quản trị viên): xem, thêm, sửa, ngưng dùng. Dữ liệu qua /api/locations; sửa có khoá lạc quan (expectedUpdatedAt).
import { hasPermission } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const listEl = byId("list");
const editEl = byId("edit");
let types: Api.LocationTypeDto[] = [];

const fail = (err: unknown) => showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

async function act<T>(fn: () => Promise<T>): Promise<T | undefined> {
  showError(errorEl, null);
  try {
    return await fn();
  } catch (err) {
    fail(err);
    return undefined;
  }
}

const typeOptions = (selected?: string) => types.map((t) => h("option", { value: t.code, selected: t.code === selected }, t.name));

function row(l: Api.LocationDto): HTMLElement {
  const edit = h("button", { type: "button", class: "btn btn-link" }, "Sửa");
  edit.addEventListener("click", () => openEdit(l));
  return h(
    "tr",
    { class: l.active ? "" : "row-off" },
    h("td", null, l.code),
    h("td", null, l.name, !l.active && h("span", { class: "badge badge-cancelled" }, "Ngưng dùng")),
    h("td", null, l.locationTypeName),
    h("td", { class: "muted" }, l.address ?? ""),
    h("td", null, String(l.sortOrder)),
    h("td", { class: "row-actions" }, edit),
  );
}

function openEdit(l: Api.LocationDto): void {
  const name = h("input", { type: "text", value: l.name, maxLength: 100 });
  const type = h("select", null, ...typeOptions(l.locationTypeCode));
  const address = h("input", { type: "text", value: l.address ?? "", maxLength: 300 });
  const sort = h("input", { type: "number", value: String(l.sortOrder), min: 0, max: 9999 });
  const active = h("input", { type: "checkbox", checked: l.active, style: "width:auto;display:inline;margin:0 6px 0 0" });
  const save = h("button", { type: "button", class: "btn btn-primary" }, "Lưu");
  const close = h("button", { type: "button", class: "btn" }, "Đóng");
  close.addEventListener("click", () => (editEl.hidden = true));
  save.addEventListener("click", async () => {
    const body = { name: name.value, locationTypeCode: type.value, address: address.value || null, sortOrder: Number(sort.value), active: active.checked, expectedUpdatedAt: l.updatedAt };
    if (await act(() => api<Api.LocationResponse>(`/api/locations/${l.id}`, { method: "PUT", body }))) {
      editEl.hidden = true;
      await load();
    }
  });
  replaceChildren(
    editEl,
    h("h2", null, `Sửa: ${l.code}`),
    h("div", { class: "grid three" }, h("label", null, "Tên", name), h("label", null, "Loại", type), h("label", null, "Địa chỉ", address), h("label", null, "Thứ tự", sort), h("label", { class: "check" }, active, "Đang dùng")),
    h("p", { class: "muted" }, "Mã là định danh, không đổi được. Địa điểm đã dùng ở vai trò hồ sơ không xoá được — chỉ ngưng dùng."),
    h("div", { class: "actions" }, save, close),
  );
  editEl.hidden = false;
  editEl.scrollIntoView({ block: "nearest" });
}

async function load(): Promise<void> {
  const r = await act(() => api<Api.LocationListResponse>("/api/locations"));
  if (!r) return;
  types = r.types;
  replaceChildren(byId("add-type"), ...typeOptions());
  replaceChildren(listEl, ...r.locations.map(row));
}

byId<HTMLFormElement>("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    code: byId<HTMLInputElement>("add-code").value.trim(),
    name: byId<HTMLInputElement>("add-name").value,
    locationTypeCode: byId<HTMLSelectElement>("add-type").value,
    address: byId<HTMLInputElement>("add-address").value || null,
    sortOrder: Number(byId<HTMLInputElement>("add-sort").value || 0),
  };
  if (await act(() => api<Api.LocationResponse>("/api/locations", { method: "POST", body }))) {
    for (const id of ["add-code", "add-name", "add-address"]) byId<HTMLInputElement>(id).value = "";
    await load();
  }
});

const staff = await initShell();
if (!hasPermission(staff, "ADMIN")) showError(errorEl, "Chỉ quản trị viên được vào trang này.");
else await load();
```

- [ ] **Bước 6: Tạo/ghi `web/parties.ts`**

```ts
// Trang Hồ sơ: tìm/lọc, tạo (cảnh báo trùng SĐT — ADR-0001 mục 8), xem/sửa, liên hệ, vai trò theo nơi và quan hệ.
// Vai trò và quan hệ chỉ quản trị viên sửa (ADR-0007); mọi nhân sự văn phòng tạo/sửa hồ sơ và liên hệ. Sửa hồ sơ dùng khoá lạc quan.
import { hasPermission } from "../src/shared/permissions";
import { ApiError, api, type Api, type Staff } from "./api";
import { byId, h, replaceChildren, type Child } from "./dom";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const listEl = byId("list");
const detailEl = byId("detail");
const createEl = byId("create");
const PAGE = 30;

let me: Staff;
let admin = false;
let meta: Api.PartyMetaResponse = { roleTypes: [], relationshipTypes: [] };
let locations: Api.LocationDto[] = [];
let offset = 0;
let openId: string | null = null;

const fail = (err: unknown) => showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
async function act<T>(fn: () => Promise<T>): Promise<T | undefined> {
  showError(errorEl, null);
  try {
    return await fn();
  } catch (err) {
    fail(err);
    return undefined;
  }
}

const KIND_LABEL = { PERSON: "Cá nhân", ORGANIZATION: "Tổ chức" } as const;
const button = (label: string, onclick: () => void, cls = "btn btn-link"): HTMLButtonElement => {
  const b = h("button", { type: "button", class: cls }, label);
  b.addEventListener("click", onclick);
  return b;
};
const field = (label: string, input: Child): HTMLElement => h("label", null, label, input);
const input = (value = "", extra: Record<string, unknown> = {}) => h("input", { type: "text", value, ...extra });
/** Ô chọn; mặc định chọn MỤC ĐẦU (gán value = "" khi không có mục rỗng sẽ không chọn gì và select.value trả ""). */
const select = (options: { value: string; label: string }[], selected = options[0]?.value ?? "") => {
  const s = h("select", null, ...options.map((o) => h("option", { value: o.value }, o.label)));
  s.value = selected;
  return s;
};
const period = (from: string, to: string | null) => (to ? `${from} → ${to}` : `từ ${from}`);
const checkbox = (checked: boolean) => h("input", { type: "checkbox", checked, style: "width:auto;display:inline;margin:0 6px 0 0" });
const roleLabel = (code: string) => meta.roleTypes.find((t) => t.code === code)?.name ?? code;

// ---- Danh sách + tìm kiếm -----------------------------------------------------------------------------------------
function queryString(extra: Record<string, string>): string {
  const p = new URLSearchParams({ limit: String(PAGE), ...extra });
  for (const [k, id] of [["q", "q"], ["kind", "kind"], ["role", "role"], ["location", "location"]] as const) {
    const v = byId<HTMLInputElement | HTMLSelectElement>(id).value.trim();
    if (v) p.set(k, v);
  }
  if (byId<HTMLInputElement>("inactive").checked) p.set("includeInactive", "1");
  return p.toString();
}

async function search(reset = true): Promise<void> {
  if (reset) offset = 0;
  const r = await act(() => api<Api.PartyListResponse>(`/api/parties?${queryString({ offset: String(offset) })}`));
  if (!r) return;
  const rows = r.parties.map((p) => {
    const tr = h("tr", { class: p.active ? "" : "row-off", style: "cursor:pointer" }, h("td", null, p.displayName, !p.active && h("span", { class: "badge badge-cancelled" }, "Ngưng")), h("td", null, KIND_LABEL[p.kind]), h("td", null, p.primaryPhone ?? ""), h("td", null, p.roleCodes.map(roleLabel).join(", ")));
    tr.addEventListener("click", () => void openDetail(p.id));
    return tr;
  });
  if (reset) replaceChildren(listEl, ...rows);
  else listEl.append(...rows);
  byId("empty").hidden = listEl.children.length > 0;
  byId("more").hidden = !r.hasMore;
  offset += r.parties.length;
}

// ---- Tạo hồ sơ (cảnh báo trùng SĐT) ------------------------------------------------------------------------------------
function openCreate(): void {
  const kind = select([{ value: "PERSON", label: "Cá nhân" }, { value: "ORGANIZATION", label: "Tổ chức (đại lý, công ty)" }]);
  const fullName = input("", { maxLength: 200 });
  const displayName = input("", { maxLength: 200 });
  const legalName = input("", { maxLength: 300 });
  const taxCode = input("", { maxLength: 14 });
  const address = input("", { maxLength: 300 });
  const invoiceEmail = input("", { maxLength: 200, type: "email" });
  const phone = input("", { type: "tel", maxLength: 30 });
  const email = input("", { type: "email", maxLength: 200 });
  const dupBox = h("div", { class: "alert warn", hidden: true });
  const personFields = h("div", { class: "grid three" }, field("Họ và tên", fullName));
  const orgFields = h("div", { class: "grid three" }, field("Tên gọi", displayName), field("Tên pháp lý", legalName), field("Mã số thuế", taxCode), field("Địa chỉ", address), field("Email nhận hoá đơn", invoiceEmail));
  const sync = () => {
    personFields.hidden = kind.value !== "PERSON";
    orgFields.hidden = kind.value !== "ORGANIZATION";
  };
  kind.addEventListener("change", sync);

  let timer: number | undefined;
  phone.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      dupBox.hidden = true;
      if (phone.value.replace(/\D/g, "").length < 10) return;
      const r = await act(() => api<Api.PartyLookupResponse>(`/api/parties/lookup?phone=${encodeURIComponent(phone.value)}`));
      if (!r || r.matches.length === 0) return;
      replaceChildren(
        dupBox,
        h("strong", null, `Đã có ${r.matches.length} hồ sơ dùng số này — kiểm tra trước khi tạo mới:`),
        ...r.matches.map((m) => h("div", null, `${m.displayName} (${KIND_LABEL[m.kind]}) `, button("Mở hồ sơ này", () => void openDetail(m.id)))),
        h("div", { class: "muted" }, "Cùng một số có thể thuộc nhiều hồ sơ (vd người nhà, công ty). Nếu đúng người thì dùng hồ sơ có sẵn."),
      );
      dupBox.hidden = false;
    }, 400);
  });

  const save = h("button", { type: "button", class: "btn btn-primary" }, "Tạo hồ sơ");
  save.addEventListener("click", async () => {
    const contacts: Record<string, unknown>[] = [];
    if (phone.value.trim()) contacts.push({ kind: "PHONE", value: phone.value });
    if (email.value.trim()) contacts.push({ kind: "EMAIL", value: email.value });
    const body =
      kind.value === "PERSON"
        ? { kind: "PERSON", fullName: fullName.value, contacts }
        : { kind: "ORGANIZATION", displayName: displayName.value, legalName: legalName.value, taxCode: taxCode.value, address: address.value, invoiceEmail: invoiceEmail.value, contacts };
    const r = await act(() => api<Api.PartyResponse>("/api/parties", { method: "POST", body }));
    if (r) {
      createEl.hidden = true;
      await search();
      await openDetail(r.party.id);
    }
  });
  replaceChildren(
    createEl,
    h("h2", null, "Hồ sơ mới"),
    field("Loại", kind),
    personFields,
    orgFields,
    h("div", { class: "grid three" }, field("Số điện thoại (không bắt buộc)", phone), field("Email (không bắt buộc)", email)),
    dupBox,
    h("div", { class: "actions" }, save, button("Đóng", () => (createEl.hidden = true), "btn")),
  );
  sync();
  createEl.hidden = false;
  createEl.scrollIntoView({ block: "nearest" });
}

// ---- Chi tiết ----------------------------------------------------------------------------------------------------------
async function reload(): Promise<void> {
  if (openId) await openDetail(openId);
  await search();
}

async function openDetail(id: string): Promise<void> {
  const r = await act(() => api<Api.PartyResponse>(`/api/parties/${id}`));
  if (!r) return;
  openId = id;
  const p = r.party;

  // -- thông tin + sửa
  const person = p.kind === "PERSON";
  const fullName = input(p.displayName, { maxLength: 200 });
  const displayName = input(p.displayName, { maxLength: 200 });
  const legalName = input(p.legalName ?? "", { maxLength: 300 });
  const taxCode = input(p.taxCode ?? "", { maxLength: 14 });
  const address = input(p.address ?? "", { maxLength: 300 });
  const invoiceEmail = input(p.invoiceEmail ?? "", { maxLength: 200, type: "email" });
  const active = checkbox(p.active);
  const saveInfo = button(
    "Lưu thông tin",
    async () => {
      const body = person
        ? { fullName: fullName.value, active: active.checked, expectedUpdatedAt: p.updatedAt }
        : { displayName: displayName.value, legalName: legalName.value, taxCode: taxCode.value, address: address.value, invoiceEmail: invoiceEmail.value, active: active.checked, expectedUpdatedAt: p.updatedAt };
      if (await act(() => api<Api.PartyResponse>(`/api/parties/${id}`, { method: "PUT", body }))) await reload();
    },
    "btn btn-primary",
  );
  const info = h(
    "div",
    null,
    h("div", { class: "grid three" }, ...(person ? [field("Họ và tên (tên = từ cuối)", fullName)] : [field("Tên gọi", displayName), field("Tên pháp lý", legalName), field("Mã số thuế", taxCode), field("Địa chỉ", address), field("Email nhận hoá đơn", invoiceEmail)]), h("label", { class: "check" }, active, "Đang dùng")),
    h("div", { class: "actions" }, saveInfo),
  );

  // -- liên hệ
  const contactRows = p.contacts.map((c) =>
    h("tr", { class: c.validTo ? "row-off" : "" }, h("td", null, c.kind === "PHONE" ? "Điện thoại" : "Email"), h("td", null, c.value, c.isPrimary && !c.validTo && h("span", { class: "badge" }, "chính")), h("td", { class: "muted" }, c.label ?? ""), h("td", { class: "muted" }, period(c.validFrom, c.validTo)), h("td", null, !c.validTo && button("Đóng", async () => { if (await act(() => api(`/api/parties/${id}/contacts/${c.id}/end`, { method: "POST", body: {} }))) await reload(); }))),
  );
  const cKind = select([{ value: "PHONE", label: "Điện thoại" }, { value: "EMAIL", label: "Email" }]);
  const cValue = input("", { maxLength: 200 });
  const cLabel = input("", { maxLength: 50, placeholder: "Zalo, hotline…" });
  const cPrimary = checkbox(false);
  const addContact = button("Thêm liên hệ", async () => {
    const body = { kind: cKind.value, value: cValue.value, label: cLabel.value || null, isPrimary: cPrimary.checked };
    if (await act(() => api(`/api/parties/${id}/contacts`, { method: "POST", body }))) await reload();
  }, "btn");

  // -- vai trò theo nơi
  const roleRows = p.roles.map((r2) =>
    h("tr", { class: r2.validTo ? "row-off" : "" }, h("td", null, r2.roleName), h("td", null, r2.locationName ?? "(mọi nơi)"), h("td", { class: "muted" }, period(r2.validFrom, r2.validTo)), h("td", null, admin && !r2.validTo && button("Kết thúc", async () => { if (await act(() => api(`/api/parties/${id}/roles/${r2.id}/end`, { method: "POST", body: {} }))) await reload(); }))),
  );
  const rType = select(meta.roleTypes.map((t) => ({ value: t.code, label: t.name })));
  const rLoc = select([{ value: "", label: "(mọi nơi)" }, ...locations.filter((l) => l.active).map((l) => ({ value: l.id, label: l.name }))]);
  const rFrom = input("", { type: "date" });
  const addRole = button("Thêm vai trò", async () => {
    const body = { roleTypeCode: rType.value, locationId: rLoc.value || null, validFrom: rFrom.value || undefined };
    if (await act(() => api(`/api/parties/${id}/roles`, { method: "POST", body }))) await reload();
  }, "btn");

  // -- quan hệ
  const relRows = p.relationships.map((x) =>
    h("tr", { class: x.validTo ? "row-off" : "" }, h("td", null, `${x.fromPartyName} — ${x.typeName} — ${x.toPartyName}`), h("td", { class: "muted" }, period(x.validFrom, x.validTo)), h("td", null, admin && !x.validTo && button("Kết thúc", async () => { if (await act(() => api(`/api/parties/${id}/relationships/${x.id}/end`, { method: "POST", body: {} }))) await reload(); }))),
  );
  const relQ = input("", { placeholder: "Gõ tên hồ sơ cần liên kết…" });
  const relPick = h("select", null);
  const relDir = select([{ value: "from", label: "Hồ sơ này LÀ người liên hệ của…" }, { value: "to", label: "Hồ sơ này CÓ người liên hệ là…" }]);
  let relTimer: number | undefined;
  relQ.addEventListener("input", () => {
    window.clearTimeout(relTimer);
    relTimer = window.setTimeout(async () => {
      if (relQ.value.trim().length < 2) return replaceChildren(relPick);
      const found = await act(() => api<Api.PartyListResponse>(`/api/parties?limit=10&q=${encodeURIComponent(relQ.value.trim())}`));
      replaceChildren(relPick, ...(found?.parties.filter((x) => x.id !== id).map((x) => h("option", { value: x.id }, `${x.displayName} (${KIND_LABEL[x.kind]})`)) ?? []));
    }, 300);
  });
  const addRel = button("Thêm quan hệ", async () => {
    if (!relPick.value) return showError(errorEl, "Chọn hồ sơ cần liên kết.");
    const body = relDir.value === "from" ? { fromPartyId: id, toPartyId: relPick.value, relationshipTypeCode: "CONTACT_OF" } : { fromPartyId: relPick.value, toPartyId: id, relationshipTypeCode: "CONTACT_OF" };
    if (await act(() => api(`/api/parties/${id}/relationships`, { method: "POST", body }))) await reload();
  }, "btn");

  replaceChildren(
    detailEl,
    h("h2", null, p.displayName, " ", h("span", { class: "muted" }, KIND_LABEL[p.kind])),
    info,
    h("h3", null, "Liên hệ"),
    h("table", { class: "items" }, h("tbody", null, ...contactRows)),
    h("div", { class: "grid three" }, field("Loại", cKind), field("Giá trị", cValue), field("Ghi chú", cLabel), h("label", { class: "check" }, cPrimary, "Liên hệ chính")),
    h("div", { class: "actions" }, addContact),
    h("h3", null, "Vai trò theo nơi"),
    h("table", { class: "items" }, h("tbody", null, ...roleRows)),
    admin
      ? h("div", null, h("div", { class: "grid three" }, field("Vai trò", rType), field("Nơi", rLoc), field("Từ ngày (mặc định hôm nay)", rFrom)), h("div", { class: "actions" }, addRole))
      : h("p", { class: "muted" }, "Chỉ quản trị viên thêm/kết thúc vai trò."),
    h("h3", null, "Quan hệ"),
    h("table", { class: "items" }, h("tbody", null, ...relRows)),
    admin ? h("div", null, h("div", { class: "grid three" }, field("Loại", relDir), field("Tìm hồ sơ", relQ), field("Chọn", relPick)), h("div", { class: "actions" }, addRel)) : null,
    h("div", { class: "actions", style: "margin-top:12px" }, button("Đóng", () => { detailEl.hidden = true; openId = null; }, "btn")),
  );
  detailEl.hidden = false;
  detailEl.scrollIntoView({ block: "nearest" });
}

byId<HTMLFormElement>("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  void search();
});
byId("new").addEventListener("click", openCreate);
byId("more").addEventListener("click", () => void search(false));

me = await initShell();
admin = hasPermission(me, "ADMIN");
const [m, l] = await Promise.all([act(() => api<Api.PartyMetaResponse>("/api/parties/meta")), act(() => api<Api.LocationListResponse>("/api/locations"))]);
if (m) meta = m;
if (l) locations = l.locations;
replaceChildren(byId("role"), h("option", { value: "" }, "Tất cả"), ...meta.roleTypes.map((t) => h("option", { value: t.code }, t.name)));
replaceChildren(byId("location"), h("option", { value: "" }, "Tất cả"), ...locations.filter((x) => x.active).map((x) => h("option", { value: x.id }, x.name)));
await search();
```

- [ ] **Bước 7: Sửa `package.json`** — đóng gói hai trang mới (dòng `build:web`, lệnh esbuild đầu tiên)

Thay đoạn (đúng một chỗ):

```json
web/catalog.ts --bundle
```

bằng:

```json
web/catalog.ts web/parties.ts web/locations.ts --bundle
```

- [ ] **Bước 8: Chạy** `npm test`

Kỳ vọng: toàn bộ đạt, 0 lỗi. (lần kiểm khi soạn: 158 tests, 158 đạt, 0 lỗi)

- [ ] **Bước 9: Chạy** `npx tsc --noEmit`

Kỳ vọng: không có lỗi (thoát 0).

- [ ] **Bước 10: Chạy** `npx tsc --noEmit -p web --pretty false`

Kỳ vọng: **LỖI** — đúng 4 lỗi đã biết (thuộc A2, KHÔNG sửa ở kế hoạch này): `web/order-form.ts` (101,5) TS2353 và (124,22) TS2339; `web/order.ts` (44,22) TS2339 và (44,33) TS7006. Nếu có lỗi khác là do bước vừa làm.

- [ ] **Bước 11: Chạy** `npm run build:web`

Kỳ vọng: không lỗi; `public/js/parties.js`, `public/js/locations.js` xuất hiện (thư mục `public/js` được git bỏ qua).

- [ ] **Bước 12: Tạo tệp tạm `$TMPDIR/ui-smoke.mjs` (KHÔNG commit) rồi chạy** — kiểm giao diện bằng Chrome (cần Google Chrome; đặt `CHROME_BIN` nếu ở chỗ khác)

```js
// Kiểm giao diện MỘT LẦN (không commit): Chrome headless điều khiển qua CDP trên wrangler dev cục bộ với D1 tạm.
// Chạy từ gốc repo: node <đường dẫn>/ui-smoke.mjs
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const { insertStaffSql } = await import(pathToFileURL(join(ROOT, "scripts", "staff-lib.mjs")).href);
const CHROME = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const freePort = () => new Promise((res, rej) => { const s = createServer(); s.unref(); s.on("error", rej); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => res(port)); }); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wrangler = (args) => execFileSync("npx", ["wrangler", ...args], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", env: { ...process.env, CI: "1" } });

const persist = mkdtempSync(join(tmpdir(), "tourdao-ui-"));
const profile = mkdtempSync(join(tmpdir(), "tourdao-chrome-"));
let server, chrome;
const logs = [];
try {
  wrangler(["d1", "migrations", "apply", "tourdao-sales-db", "--local", "--persist-to", persist]);
  const accounts = { admin: ["QTV Smoke", "0900000104", "112233", ["ADMIN"]], sales: ["NV Smoke", "0900000102", "246810", ["SALES"]], field: ["HT Smoke", "0900000106", "335577", ["FIELD"]] };
  const seed = join(persist, "seed.sql");
  writeFileSync(seed, (await Promise.all(Object.values(accounts).map(([name, phone, pin, permissions]) => insertStaffSql({ name, phone, pin, permissions })))).join("\n"));
  wrangler(["d1", "execute", "tourdao-sales-db", "--local", "--persist-to", persist, "--file", seed]);

  const [port, inspector] = [await freePort(), await freePort()];
  const base = `http://127.0.0.1:${port}`;
  server = spawn("npx", ["wrangler", "dev", "--port", String(port), "--ip", "127.0.0.1", "--inspector-port", String(inspector), "--persist-to", persist, "--var", `SESSION_SECRET:${randomBytes(48).toString("base64url")}`],
    { cwd: ROOT, detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, CI: "1" } });
  server.stdout.on("data", (d) => logs.push(String(d))); server.stderr.on("data", (d) => logs.push(String(d)));
  for (let i = 0; ; i++) { if ((await fetch(`${base}/api/auth/me`).catch(() => null))?.status === 401) break; if (i > 180) throw new Error("wrangler không lên"); await sleep(500); }

  const login = async ([, phone, pin]) => {
    const r = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: base, "cf-connecting-ip": `10.9.${Math.floor(Math.random() * 250)}.1` }, body: JSON.stringify({ phone, pin }) });
    assert.equal(r.status, 200);
    const [pair] = r.headers.get("set-cookie").split(";");
    const i = pair.indexOf("=");
    return { name: pair.slice(0, i), value: pair.slice(i + 1) };
  };

  const cdpPort = await freePort();
  chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, "--no-first-run", "--disable-gpu", "--window-size=1200,1600", "about:blank"], { stdio: "ignore" });
  for (let i = 0; ; i++) { if ((await fetch(`http://127.0.0.1:${cdpPort}/json/version`).catch(() => null))?.ok) break; if (i > 60) throw new Error("Chrome không lên"); await sleep(250); }

  async function openPage() {
    const t = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r));
    let id = 0; const pending = new Map(); const consoleErrors = [];
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
      if (m.method === "Runtime.exceptionThrown") consoleErrors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
    });
    const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    await send("Network.enable"); await send("Runtime.enable"); await send("Page.enable");
    const ev = async (expression) => {
      const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error(`evaluate lỗi: ${JSON.stringify(r.result.exceptionDetails).slice(0, 400)} ← ${expression.slice(0, 120)}`);
      return r.result.result.value;
    };
    const waitFor = async (expression, what, ms = 8000) => { const end = Date.now() + ms; for (;;) { if (await ev(expression).catch(() => false)) return; if (Date.now() > end) throw new Error(`hết giờ chờ: ${what}\n${expression}`); await sleep(100); } };
    return { send, ev, waitFor, consoleErrors, close: () => { ws.close(); } };
  }
  async function as(account, path) {
    const page = await openPage();
    const c = await login(account);
    await page.send("Network.setCookie", { name: c.name, value: c.value, url: base, httpOnly: true });
    await page.send("Page.navigate", { url: base + path });
    await page.waitFor("document.readyState === 'complete'", "trang tải xong");
    return page;
  }
  const setVal = (id, v) => `(() => { const el = document.getElementById(${JSON.stringify(id)}); el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
  const clickText = (scope, text) => `(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)} + ' button')].find((x) => x.textContent.trim() === ${JSON.stringify(text)}); if (!b) return false; b.click(); return true; })()`;
  const okLog = (m) => console.log(`✓ ${m}`);

  // ============================ /staff (ADMIN) ============================
  let p = await as(accounts.admin, "/staff");
  await p.waitFor("document.querySelectorAll('#list tr').length >= 3", "danh sách nhân sự");
  assert.match(await p.ev("document.querySelector('thead').textContent"), /Quyền/);
  assert.match(await p.ev("document.getElementById('list').textContent"), /Quản trị/);
  assert.equal(await p.ev("['SALES','ACCOUNTING','ADMIN','FIELD'].map((c) => document.getElementById('add-perm-' + c).checked).join()"), "true,false,false,false", "mặc định chỉ Bán hàng");
  const navText = await p.ev("document.getElementById('topbar').textContent");
  for (const label of ["Đơn hàng", "Hồ sơ", "Dịch vụ", "Nhân viên", "Địa điểm", "Nhật ký"]) assert.ok(navText.includes(label), `admin phải thấy "${label}" trên thanh điều hướng: ${navText}`);
  okLog("/staff: cột Quyền, ô tick mặc định, thanh điều hướng admin");

  await p.ev(setVal("add-name", "Smoke Người Mới")); await p.ev(setVal("add-phone", "0900000199"));
  await p.ev("(() => { document.getElementById('add-perm-ACCOUNTING').checked = true; return true; })()");
  await p.ev("document.getElementById('add-form').requestSubmit(); true");
  await p.waitFor("!document.getElementById('secret').hidden && /Smoke Người Mới/.test(document.getElementById('secret').textContent)", "PIN hiện một lần");
  await p.waitFor("[...document.querySelectorAll('#list tr')].some((r) => /Smoke Người Mới/.test(r.textContent) && /Bán hàng, Kế toán/.test(r.textContent))", "hàng mới với hai quyền");
  okLog("/staff: tạo tài khoản với hai quyền, hiện PIN một lần");

  await p.ev(`(() => { const r = [...document.querySelectorAll('#list tr')].find((x) => /Smoke Người Mới/.test(x.textContent)); [...r.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Sửa').click(); return true; })()`);
  await p.waitFor("!document.getElementById('edit').hidden && document.querySelectorAll('#edit input[type=checkbox]').length === 4", "form sửa có bốn ô quyền");
  await p.ev("(() => { const boxes = [...document.querySelectorAll('#edit input[type=checkbox]')]; boxes[0].checked = false; return true; })()"); // bỏ Bán hàng
  await p.ev(clickText("#edit", "Lưu"));
  await p.waitFor("document.getElementById('edit').hidden && [...document.querySelectorAll('#list tr')].some((r) => /Smoke Người Mới/.test(r.textContent) && /^\\s*Smoke Người Mới.*Kế toán/.test(r.textContent) && !/Bán hàng/.test(r.textContent))", "sau khi sửa chỉ còn Kế toán");
  okLog("/staff: sửa tập quyền qua PUT permissions, bảng cập nhật");
  assert.deepEqual(p.consoleErrors, [], `lỗi console /staff: ${p.consoleErrors}`);
  p.close();

  // ============================ /locations (ADMIN) ============================
  p = await as(accounts.admin, "/locations");
  await p.waitFor("document.querySelectorAll('#list tr').length >= 8", "8 địa điểm gieo");
  assert.match(await p.ev("document.getElementById('list').textContent"), /Bến cảng Vinpearl/);
  await p.ev(setVal("add-code", "SMOKE_LOC")); await p.ev(setVal("add-name", "Điểm smoke"));
  await p.ev("document.getElementById('add-form').requestSubmit(); true");
  await p.waitFor("[...document.querySelectorAll('#list tr')].some((r) => /SMOKE_LOC/.test(r.textContent))", "địa điểm mới hiện");
  await p.ev(`(() => { const r = [...document.querySelectorAll('#list tr')].find((x) => /SMOKE_LOC/.test(x.textContent)); [...r.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Sửa').click(); return true; })()`);
  await p.waitFor("!document.getElementById('edit').hidden", "form sửa địa điểm");
  await p.ev("(() => { const i = document.querySelector('#edit input[type=text]'); i.value = 'Điểm smoke đã sửa'; return true; })()");
  await p.ev(clickText("#edit", "Lưu"));
  await p.waitFor("[...document.querySelectorAll('#list tr')].some((r) => /Điểm smoke đã sửa/.test(r.textContent))", "tên mới sau khi sửa");
  okLog("/locations: 8 địa điểm, thêm, sửa (khoá lạc quan qua updatedAt)");
  assert.deepEqual(p.consoleErrors, [], `lỗi console /locations: ${p.consoleErrors}`);
  p.close();

  // ============================ /parties (ADMIN) ============================
  p = await as(accounts.admin, "/parties");
  await p.waitFor("document.querySelectorAll('#role option').length >= 9 && document.querySelectorAll('#location option').length >= 9", "bộ lọc vai trò/nơi nạp xong");
  await p.waitFor("document.querySelectorAll('#list tr').length >= 3", "danh sách hồ sơ (hồ sơ nhân sự đã backfill/seed)");
  await p.ev("document.getElementById('new').click(); true");
  await p.waitFor("!document.getElementById('create').hidden", "form tạo hồ sơ");
  await p.ev(`(() => { const c = document.getElementById('create'); const ins = c.querySelectorAll('input'); ins[0].value = 'Smoke Khách Hàng'; const phone = [...ins].find((i) => i.type === 'tel'); phone.value = '0901112233'; return true; })()`);
  await p.ev(clickText("#create", "Tạo hồ sơ"));
  await p.waitFor("!document.getElementById('detail').hidden && /Smoke Khách Hàng/.test(document.getElementById('detail').textContent)", "mở chi tiết sau khi tạo");
  assert.match(await p.ev("document.getElementById('detail').textContent"), /0901112233/);
  okLog("/parties: tạo hồ sơ cá nhân kèm SĐT, mở chi tiết");

  // tạo hồ sơ thứ hai cùng số → cảnh báo trùng (bắt buộc hiện, ADR-0001 mục 8)
  await p.ev("document.getElementById('new').click(); true");
  await p.waitFor("!document.getElementById('create').hidden", "form tạo lần hai");
  await p.ev(`(() => { const phone = [...document.querySelectorAll('#create input')].find((i) => i.type === 'tel'); phone.value = '0901 112 233'; phone.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await p.waitFor("/Đã có 1 hồ sơ dùng số này/.test(document.getElementById('create').textContent)", "cảnh báo trùng SĐT", 5000);
  await p.ev(clickText("#create", "Đóng"));
  okLog("/parties: cảnh báo trùng SĐT hiện khi nhập số đã có");

  // liên hệ + vai trò theo nơi + quan hệ trong chi tiết
  await p.ev(`(() => { const d = document.getElementById('detail'); const tel = d.querySelectorAll('.grid')[1]; const sel = tel.querySelectorAll('select')[0]; sel.value = 'EMAIL'; const ins = tel.querySelectorAll('input'); ins[0].value = 'khach@smoke.vn'; return true; })()`);
  await p.ev(clickText("#detail", "Thêm liên hệ"));
  await p.waitFor("/khach@smoke.vn/.test(document.getElementById('detail').textContent)", "liên hệ email mới");
  await p.ev(`(() => { const d = document.getElementById('detail'); const grid = d.querySelectorAll('.grid')[2]; const [type, loc] = grid.querySelectorAll('select'); type.value = 'GUIDE'; loc.value = [...loc.options].find((o) => /Vinpearl/.test(o.textContent)).value; return true; })()`);
  await p.ev(clickText("#detail", "Thêm vai trò"));
  await p.waitFor("/Hướng dẫn viên/.test(document.getElementById('detail').textContent) && /Bến cảng Vinpearl/.test(document.getElementById('detail').textContent)", "vai trò HDV @ Vinpearl");
  okLog("/parties: thêm liên hệ, thêm vai trò HDV tại Bến cảng Vinpearl");

  // lọc "ai giữ vai HDV ở Bến cảng Vinpearl hôm nay"
  await p.ev(`(() => { const r = document.getElementById('role'); r.value = 'GUIDE'; const l = document.getElementById('location'); l.value = [...l.options].find((o) => /Vinpearl/.test(o.textContent)).value; document.getElementById('search-form').requestSubmit(); return true; })()`);
  await p.waitFor("document.querySelectorAll('#list tr').length === 1 && /Smoke Khách Hàng/.test(document.getElementById('list').textContent)", "lọc vai trò + nơi ra đúng một người");
  okLog("/parties: lọc HDV @ Bến cảng Vinpearl trả đúng một hồ sơ");

  // sửa hồ sơ (khoá lạc quan) rồi tìm theo tên mới
  await p.ev(`(() => { const d = document.getElementById('detail'); const name = d.querySelector('input'); name.value = 'Smoke Khách Đã Sửa'; return true; })()`);
  await p.ev(clickText("#detail", "Lưu thông tin"));
  await p.waitFor("/Smoke Khách Đã Sửa/.test(document.getElementById('detail').textContent)", "tên mới trong chi tiết");
  okLog("/parties: sửa tên hồ sơ (PUT + expectedUpdatedAt)");
  assert.deepEqual(p.consoleErrors, [], `lỗi console /parties: ${p.consoleErrors}`);
  p.close();

  // ============================ SALES: thấy Hồ sơ, không thấy quản trị, không thêm vai trò ============================
  p = await as(accounts.sales, "/parties");
  await p.waitFor("document.querySelectorAll('#list tr').length >= 1", "danh sách cho SALES");
  const salesNav = await p.ev("document.getElementById('topbar').textContent");
  assert.ok(salesNav.includes("Hồ sơ") && !salesNav.includes("Nhân viên") && !salesNav.includes("Nhật ký") && !salesNav.includes("Địa điểm"), `nav của SALES: ${salesNav}`);
  await p.ev(`(() => { const r = [...document.querySelectorAll('#list tr')].find((x) => /Smoke Khách Đã Sửa/.test(x.textContent)); r.click(); return true; })()`);
  await p.waitFor("/Chỉ quản trị viên thêm\\/kết thúc vai trò/.test(document.getElementById('detail').textContent)", "SALES không có form thêm vai trò");
  okLog("SALES: thấy Hồ sơ, không thấy mục quản trị, không thêm được vai trò");
  p.close();

  // ============================ FIELD: không có mục nào; trang Hồ sơ báo không dùng được ============================
  p = await as(accounts.field, "/parties");
  await p.waitFor("document.getElementById('error') && !document.getElementById('error').hidden", "FIELD nhận thông báo chặn");
  assert.match(await p.ev("document.getElementById('error').textContent"), /chỉ dùng cho việc được giao/);
  const fieldNav = await p.ev("document.getElementById('topbar').querySelector('nav').textContent");
  assert.equal(fieldNav.trim(), "", `FIELD không có mục điều hướng nào: "${fieldNav}"`);
  okLog("FIELD: thanh điều hướng trống, trang Hồ sơ báo tài khoản chỉ dùng cho việc được giao");
  p.close();

  console.log("\nUI SMOKE OK");
} catch (e) {
  console.error("\nUI SMOKE LỖI:", e.message);
  console.error(logs.join("").slice(-1500));
  process.exitCode = 1;
} finally {
  for (const proc of [server, chrome]) if (proc?.pid) { try { process.kill(proc === server ? -proc.pid : proc.pid, "SIGTERM"); } catch {} }
  await sleep(800);
  rmSync(persist, { recursive: true, force: true }); rmSync(profile, { recursive: true, force: true });
}
```

Chạy từ gốc repo:

```bash
node $TMPDIR/ui-smoke.mjs
```

Kỳ vọng của bước trên: 11 dòng `✓` rồi `UI SMOKE OK` (`/staff`: cột Quyền, tạo tài khoản hai quyền, sửa tập quyền; `/locations`: 8 địa điểm, thêm, sửa; `/parties`: tạo hồ sơ + SĐT, cảnh báo trùng SĐT, thêm liên hệ và vai trò HDV tại Bến cảng Vinpearl, lọc "HDV @ Bến cảng Vinpearl" ra đúng một người, sửa tên; SALES thấy Hồ sơ nhưng không thấy mục quản trị và không thêm được vai trò; FIELD không có mục điều hướng nào và trang Hồ sơ báo tài khoản chỉ dùng cho việc được giao). Không có lỗi console.

- [ ] **Bước 13: Commit**

```bash
git add <các tệp vừa tạo/sửa>
git commit -m "N1 B3: trang Hồ sơ và Địa điểm (tìm, tạo có cảnh báo trùng SĐT, liên hệ, vai trò theo nơi, quan hệ); khai vào sw-policy"
```

---

### Task B4: Dọn ngoại lệ 8(b), `scripts/audit-invariants.mjs`, tài liệu và runbook triển khai

Ba việc nhỏ khép lại lần phát hành 1. (1) ADR-0002 điều 8(b) yêu cầu đổi `table: string` động ở `orders/repository.ts` thành union literal (tên bảng không bao giờ đến từ đầu vào). (2) Tách `migration.test.ts` của `orders` khỏi các migration sau: các test đó kiểm chính `0008`, nhưng đang dựng schema từ MỌI migration rồi chèn `staff` thô — sẽ đỏ khi `0013` (bắt buộc `party_id`) có mặt ở lần phát hành 2; ghim vào `0008` là đúng ý đồ của tệp. (3) `audit-invariants.mjs` chạy được trên D1 remote (chỉ SELECT/PRAGMA) cho cổng triển khai; có kiểm ÂM (một cổng không thể "đỏ" thì vô nghĩa). Runbook `HANDOFF-N1.md` ghi rõ: **không triển khai khi A2 chưa xong** (nhánh chứa A1: giao diện đơn còn hỏng), và thứ tự hai lần phát hành.

**Files:**
- Tạo: `scripts/audit-invariants.mjs`, `docs/HANDOFF-N1.md`
- Sửa: `src/modules/orders/repository.ts`, `src/modules/orders/migration.test.ts`, `tests/e2e/run.mjs`, `docs/ARCHITECTURE.md`, `docs/SPEC-tourdao-sales.md`, `docs/HANDOFF-M4.md`

**Interfaces:**
- Consumes: Toàn bộ N1 lần phát hành 1 (T1–T8, B1–B3).
- Produces: `insertRow(db, table: WriteTable, …)` với union literal; `scripts/audit-invariants.mjs --db local|remote [--persist-to dir] [--strict]` (kiểm R-N1-1…5, 10, 13 bằng SQL chỉ-đọc, thoát 1 nếu vi phạm) và bước cuối của `npm run test:e2e`; tài liệu kiến trúc/SPEC/runbook cập nhật.

- [ ] **Bước 1: Sửa `src/modules/orders/repository.ts`**

Thay đoạn (đúng một chỗ):

```ts
function insertRow(db: D1Database, table: string, cols: string[], values: (string | number | null)[], guard?: Guard): D1PreparedStatement {
```

bằng:

```ts
/** Bảng được phép ghi bằng insertRow — union literal thay cho `string` động (ADR-0002 điều 8(b)): tên bảng không bao giờ đến từ đầu vào. */
type WriteTable = "order_service" | "order_item";

function insertRow(db: D1Database, table: WriteTable, cols: string[], values: (string | number | null)[], guard?: Guard): D1PreparedStatement {
```

- [ ] **Bước 2: Sửa `src/modules/orders/migration.test.ts`** — tiếp theo (bước sau) đổi cả năm chỗ `open(files)` thành `open(SCHEMA_0008)`

Thay đoạn (đúng một chỗ):

```ts
const upTo = (last: string) => files.filter((f) => f <= last);
```

bằng:

```ts
const upTo = (last: string) => files.filter((f) => f <= last);
/** Các test dưới đây kiểm chính migration 0008 nên dựng schema ĐẾN 0008: migration sau (vd 0013 bắt buộc party_id) không được làm đổi kết quả. */
const SCHEMA_0008 = upTo("0008_order_service.sql");
```

- [ ] **Bước 3: Chạy** `sed -i.bak 's/open(files)/open(SCHEMA_0008)/g' src/modules/orders/migration.test.ts && rm src/modules/orders/migration.test.ts.bak && grep -c 'open(SCHEMA_0008)' src/modules/orders/migration.test.ts`

Kỳ vọng: in `5` (năm chỗ đã đổi).

- [ ] **Bước 4: Tạo/ghi `scripts/audit-invariants.mjs`**

```js
// Kiểm toán bất biến dữ liệu N1 (đặc tả N1 §6) trên D1 — CHỈ ĐỌC (chỉ SELECT/PRAGMA), an toàn để chạy trên remote.
// Dùng: node scripts/audit-invariants.mjs --db local|remote [--persist-to <thư mục>] [--strict]
//   --strict: coi tài khoản chưa có hồ sơ (R-N1-1) là VI PHẠM. Không có --strict, chúng chỉ là CẢNH BÁO (khoảng giữa hai lần phát hành N1).
// Mỗi kiểm = một câu SQL trả SỐ dòng vi phạm (0 = đạt). Thoát mã 1 nếu có vi phạm. Một lần gọi wrangler cho mọi kiểm.
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const db = opt("--db");
const persist = opt("--persist-to");
const strict = args.includes("--strict");
if (!["local", "remote"].includes(db)) {
  console.error("Dùng: node scripts/audit-invariants.mjs --db local|remote [--persist-to thư-mục] [--strict]");
  process.exit(1);
}

const OPEN_ADMIN = `SELECT s.id FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.permission_type_code = 'ADMIN' AND p.valid_to_at IS NULL WHERE s.active = 1`;
const overlap = (table, keyCols, from) =>
  `SELECT count(*) FROM ${table} a JOIN ${table} b ON a.id < b.id AND ${keyCols.map((c) => `IFNULL(a.${c}, '') = IFNULL(b.${c}, '')`).join(" AND ")}
   AND NOT (COALESCE(a.valid_to_date, '9999-12-31') < b.${from} OR a.${from} > COALESCE(b.valid_to_date, '9999-12-31'))`;

/** [mã, mô tả, SQL đếm vi phạm, mức khi vi phạm: 'fail' | 'warn-unless-strict', 'rows' nếu số vi phạm = số dòng kết quả (PRAGMA)] */
const CHECKS = [
  ["R-N1-1", "mọi tài khoản có party_id", "SELECT count(*) FROM staff WHERE party_id IS NULL", "warn-unless-strict"],
  ["R-N1-1", "một hồ sơ tối đa một tài khoản", "SELECT count(*) FROM (SELECT party_id FROM staff WHERE party_id IS NOT NULL GROUP BY party_id HAVING count(*) > 1)", "fail"],
  ["R-N1-2", "cá nhân ⇔ có pty_person (không có pty_organization); tổ chức ngược lại",
    `SELECT count(*) FROM pty_party p WHERE
       (p.party_kind = 'PERSON' AND (NOT EXISTS (SELECT 1 FROM pty_person x WHERE x.party_id = p.id) OR EXISTS (SELECT 1 FROM pty_organization o WHERE o.party_id = p.id)))
    OR (p.party_kind = 'ORGANIZATION' AND (NOT EXISTS (SELECT 1 FROM pty_organization o WHERE o.party_id = p.id) OR EXISTS (SELECT 1 FROM pty_person x WHERE x.party_id = p.id)))`, "fail"],
  ["R-N1-3", "display_name của cá nhân = họ + tên đệm + tên",
    `SELECT count(*) FROM pty_party p JOIN pty_person e ON e.party_id = p.id
     WHERE p.display_name <> trim(COALESCE(e.family_name || ' ', '') || COALESCE(e.middle_name || ' ', '') || e.given_name)`, "fail"],
  ["R-N1-4", "vai trò hồ sơ không chồng lấn (cùng hồ sơ, vai trò, nơi)", overlap("pty_party_role", ["party_id", "role_type_code", "location_id"], "valid_from_date"), "fail"],
  ["R-N1-4", "quan hệ hồ sơ không chồng lấn", overlap("pty_party_relationship", ["from_party_id", "to_party_id", "relationship_type_code"], "valid_from_date"), "fail"],
  ["R-N1-5", "còn ít nhất một quản trị viên đang hoạt động", `SELECT CASE WHEN count(*) >= 1 THEN 0 ELSE 1 END FROM (${OPEN_ADMIN})`, "fail"],
  ["R-N1-10", "khoá ngoại toàn vẹn (PRAGMA foreign_key_check)", "PRAGMA foreign_key_check", "fail", "rows"],
  ["R-N1-13", "SĐT đăng nhập không được sao chép thành liên hệ do hệ thống tạo",
    `SELECT count(*) FROM pty_contact_point c JOIN staff s ON s.party_id = c.party_id
     WHERE c.contact_kind_code = 'PHONE' AND c.value_normalized = s.phone AND c.created_by IS NULL`, "fail"],
  ["thông tin", "nhân sự đã có hồ sơ nhưng thiếu vai trò STAFF",
    `SELECT count(*) FROM staff s WHERE s.party_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = s.party_id AND r.role_type_code = 'STAFF')`, "warn-unless-strict"],
  ["thông tin", "tài khoản đang hoạt động không có quyền nào (đăng nhập được nhưng không làm được gì)",
    `SELECT count(*) FROM staff s WHERE s.active = 1 AND NOT EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = s.id AND p.valid_to_at IS NULL)`, "warn-unless-strict"],
];

const cmd = ["wrangler", "d1", "execute", "tourdao-sales-db", `--${db}`, "--json", ...(persist ? ["--persist-to", persist] : []), "--command", CHECKS.map(([, , sql]) => `${sql.replace(/\s+/g, " ").trim()};`).join(" ")];
let results;
try {
  results = JSON.parse(execFileSync("npx", cmd, { encoding: "utf8", env: { ...process.env, CI: "1" }, stdio: ["ignore", "pipe", "pipe"] }));
} catch (e) {
  console.error(`Không chạy được truy vấn trên D1 (${db}): ${String(e.stderr ?? e.message).slice(0, 600)}`);
  process.exit(2);
}
if (!Array.isArray(results) || results.length !== CHECKS.length) {
  console.error(`Kết quả không khớp số kiểm (${results?.length} ≠ ${CHECKS.length}).`);
  process.exit(2);
}

let failed = 0;
let warned = 0;
CHECKS.forEach(([code, what, , level, mode], i) => {
  const n = mode === "rows" ? results[i].results.length : Number(Object.values(results[i].results[0] ?? { n: 0 })[0]);
  const bad = n > 0;
  const isFail = bad && (level === "fail" || strict);
  if (isFail) failed++;
  else if (bad) warned++;
  console.log(`${isFail ? "✗" : bad ? "⚠" : "✓"} ${code.padEnd(8)} ${what}${bad ? ` — ${n} vi phạm${isFail ? "" : " (cảnh báo: khoảng giữa hai lần phát hành N1; dùng --strict sau lần phát hành 2)"}` : ""}`);
});
console.log(`\n${failed ? `${failed} bất biến BỊ VI PHẠM` : "Mọi bất biến đạt"}${warned ? `, ${warned} cảnh báo` : ""} (D1 ${db}${strict ? ", --strict" : ""}).`);
process.exit(failed ? 1 : 0);
```

- [ ] **Bước 5: Tạo tệp tạm `$TMPDIR/audit-negative.sh` (KHÔNG commit) rồi chạy** — kiểm ÂM cho `audit-invariants` (D1 tạm + dữ liệu vi phạm cố ý)

```bash
#!/bin/bash
# Kiểm ÂM cho scripts/audit-invariants.mjs (một cổng không thể "đỏ" thì vô nghĩa): D1 tạm + dữ liệu vi phạm cố ý
# → script phải báo ✗ và thoát mã 1. Chạy từ gốc repo. Không đụng D1 thật.
set -u
cd "$(git rev-parse --show-toplevel)"
P=$(mktemp -d)
export CI=1
npx wrangler d1 migrations apply tourdao-sales-db --local --persist-to "$P" > /dev/null 2>&1
npx wrangler d1 execute tourdao-sales-db --local --persist-to "$P" --command "INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('bad-person', 'PERSON', 'Không có dòng person', '2026-09-20T00:00:00Z', '2026-09-20T00:00:00Z'); INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s-x', '', '0900000777', 'x', 'sales', '2026-09-20T00:00:00Z');" > /dev/null 2>&1
node scripts/audit-invariants.mjs --db local --persist-to "$P" > "$P/out.txt"
CODE=$?
cat "$P/out.txt"
grep -q "✗ R-N1-2" "$P/out.txt" && grep -q "✗ R-N1-5" "$P/out.txt" && grep -q "⚠ R-N1-1" "$P/out.txt" || { echo "KIỂM ÂM HỎNG: thiếu ✗ R-N1-2 / ✗ R-N1-5 / ⚠ R-N1-1"; rm -rf "$P"; exit 1; }
[ "$CODE" = "1" ] || { echo "KIỂM ÂM HỎNG: mã thoát $CODE, kỳ vọng 1"; rm -rf "$P"; exit 1; }
node scripts/audit-invariants.mjs --db local --persist-to "$P" --strict > "$P/strict.txt"
grep -q "✗ R-N1-1" "$P/strict.txt" || { echo "KIỂM ÂM HỎNG: --strict phải coi R-N1-1 là vi phạm"; rm -rf "$P"; exit 1; }
rm -rf "$P"
echo "KIỂM ÂM ĐẠT: audit-invariants bắt đúng vi phạm (mã thoát 1; --strict nâng R-N1-1 thành ✗)."
```

Chạy từ gốc repo:

```bash
bash $TMPDIR/audit-negative.sh
```

- [ ] **Bước 6: Sửa `tests/e2e/run.mjs`**

Thay đoạn (đúng một chỗ):

```js
} finally {
  if (server?.pid) {
```

bằng:

```js
  // Sau mọi kịch bản: bất biến dữ liệu N1 phải còn nguyên trên D1 tạm (chỉ khi chạy đủ bộ — chạy lẻ có thể để dữ liệu dở).
  if (!picked.length) {
    console.log("▶ audit-invariants");
    try {
      execFileSync("node", [join(ROOT, "scripts", "audit-invariants.mjs"), "--db", "local", "--persist-to", persist, "--strict"], { cwd: ROOT, stdio: "inherit" });
      console.log("✔ audit-invariants\n");
    } catch {
      failed++;
      console.log("✘ audit-invariants\n");
    }
  }
} finally {
  if (server?.pid) {
```

- [ ] **Bước 7: Sửa `docs/ARCHITECTURE.md`**

Thay đoạn (đúng một chỗ):

```md
src/modules/<tên>/      module nghiệp vụ: accounts, orders, catalog, audit, (M4/M5: company…)
```

bằng:

```md
src/modules/<tên>/      module nghiệp vụ: accounts, orders, catalog, audit, locations, parties, (M4/M5: company…)
```

Thay đoạn (đúng một chỗ):

```md
src/modules/auth, staff năng lực nền: phiên, đăng nhập, dữ liệu nhân viên (accounts dùng trực tiếp)
```

bằng:

```md
src/modules/auth, staff năng lực nền: phiên, đăng nhập, tài khoản + quyền app (accounts dùng trực tiếp); staff không có route
```

Thay đoạn (đúng một chỗ):

```md
2. **Kiểm quyền không phải là phụ thuộc**: route khai `auth: "public" | "staff" | "admin"`; router ở gốc lắp ráp xác thực rồi đưa `ctx.staff` vào handler.
```

bằng:

```md
2. **Kiểm quyền không phải là phụ thuộc**: route khai `access: "public" | "staff" | "office" | "admin"` (`office` = mọi quyền trừ chỉ-FIELD; `admin` = quyền ADMIN); router ở gốc lắp ráp xác thực rồi đưa `ctx.staff` (có `permissions`) vào handler. Bản đồ quyền → thao tác (ADR-0007) nằm ở MỘT nơi: `src/shared/permissions.ts` (`can(staff, op, ctx)`).
```

Thay đoạn (đúng một chỗ):

```md
4. **Đọc xuyên module**: được `JOIN` bảng của module khác **chỉ để lấy nhãn hiển thị** (tên nhân viên, mã đơn) trong truy vấn danh sách. Không bao giờ ghi, không dựa vào cột nội bộ khác ngoài khoá + nhãn.
```

bằng:

```md
4. **Đọc xuyên module**: chỉ để lấy nhãn hiển thị (tên nhân viên, mã đơn, tên hồ sơ, tên nơi) và **chỉ qua view công bố** `v_<tiền tố>_<tên>` của module chủ (`v_stf_staff_label`, `v_pty_party_label`, `v_loc_location_label`, `v_ord_order_label`) — chỉ-đọc, chỉ khoá + nhãn + cờ, danh sách cột nằm trong sổ dữ liệu. Không JOIN thẳng bảng gốc của module khác, không ghi, không dựa vào cột nội bộ. Ngoại lệ có hạn: `wonGuard` của `orders` đọc `audit_log` (tới N2).
```

Thay đoạn (đúng một chỗ):

```md
- Migration: chỉ thêm file mới (`0007_…` trở đi), không sửa file đã áp remote. Thử local → e2e xanh → hỏi chủ dự án → remote.
```

bằng:

```md
- Migration: chỉ thêm file mới, không sửa file đã áp remote. Thử local → e2e xanh → hỏi chủ dự án → remote. Thay đổi phá vỡ theo **expand–contract** trong HAI lần phát hành: migration "mở rộng" (chỉ thêm) trước, mã mới chạy, rồi migration "siết" (trigger bắt buộc…) ở lần sau — vì `wrangler d1 migrations apply` áp MỌI migration chưa áp nên migration siết KHÔNG được có mặt trong `migrations/` ở lần phát hành đầu (N1: `0013`, xem `docs/HANDOFF-N1.md`).
```

Thay đoạn (đúng một chỗ):

```md
## Nơi đặt code trong một module
```

bằng:

```md
## Chuẩn dữ liệu và kiểm máy (ADR-0002, ADR-0003, N1)

- **Sổ dữ liệu** `docs/data-dictionary.json` là nguồn sự thật: mọi bảng/view, module chủ, cột chết, cột của view, "cạnh toàn vẹn". `docs/DATA-DICTIONARY.md` được **sinh** (`npm run dict`); bài kiểm báo lỗi nếu lệch.
- **`src/architecture.test.ts`** (chạy trong `npm test`) kiểm: import chỉ qua `index.ts` và đúng chiều `ALLOWED_EDGES`, không vòng; `shared/` và `web/` không import module; sổ ↔ schema; tiền tố bảng ↔ module; khoá ngoại xuyên module đúng chiều (hoặc là cạnh toàn vẹn khai báo); view công bố đúng cột, không `INSTEAD OF`; bảng mới có cột kiểm toán, cột WHO `TEXT NULL` không khoá ngoại, không `CASCADE`, bảng tra cứu khoá `code`; R-N1-14 (không đọc cột chết `staff.role`/`staff.full_name`).
- **Ranh giới SQL của module nghiêm** (`locations`, `parties`, `staff`): mọi câu SQL của `repository.ts` đi qua `defineSql` (`src/shared/sql-registry.ts`) và **tĩnh** (tham số tuỳ chọn viết `?N IS NULL OR …`); bài kiểm hỏi CHÍNH SQLite (`EXPLAIN` trên schema "ranh giới", view công bố thay bằng bảng rỗng) câu đó đọc/ghi bảng nào — ghi bảng module khác, hay đọc thẳng bảng gốc module khác, đều đỏ. `repository.ts` của module nghiêm import bằng đuôi `.ts`. Module cũ (`accounts`, `audit`, `auth`, `catalog`, `orders`) còn ở `LEGACY` (ngoại lệ có hạn, gỡ khi được chạm).
- **Bảng mới**: tiền tố module (`pty_`, `loc_`, `stf_`, sau này `dsp_`, `bil_`); tra cứu dùng khoá mã `TEXT code`; tập giá trị mở là bảng tra cứu, không `CHECK` liệt kê; hiệu lực `valid_from/to_date` (ngày dân sự VN) hoặc `valid_from/to_at` (UTC); không xoá cứng — đóng hiệu lực hoặc `active = 0`; khoá ngoại `NO ACTION`; khoá lạc quan bằng `updated_at`.
- **`scripts/audit-invariants.mjs`** kiểm bất biến dữ liệu (R-N1-*) trên D1 local/remote, chỉ đọc; `npm run test:e2e` chạy nó cuối bộ (`--strict`).

## Nơi đặt code trong một module
```

- [ ] **Bước 8: Sửa `docs/SPEC-tourdao-sales.md`**

Thay đoạn (đúng một chỗ):

```md
| role | TEXT | `sales` \| `admin` — admin sửa được thông tin công ty, xem toàn bộ đơn |
```

bằng:

```md
| role | TEXT | **CỘT CHẾT từ N1 (ADR-0005)** — không đường mã nào đọc; tài khoản mới ghi hằng `'sales'`. Quyền trong app nằm ở `stf_permission` (SALES/ACCOUNTING/ADMIN/FIELD, một tài khoản nhiều quyền). `full_name` cũng là cột chết (ghi `''`): tên người ở hồ sơ `pty_party` |
```

- [ ] **Bước 9: Thêm vào CUỐI `docs/SPEC-tourdao-sales.md`**

```md
- **2026-09-20 — N1 (nền danh tính), ADR-0001…0008 + đặc tả `docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md`:** thêm hồ sơ (Party–Role–Relationship: `pty_*`), địa điểm (`loc_*`), quyền app đa trị (`stf_permission`) thay cột `staff.role` đơn trị; API `/api/parties*`, `/api/locations*`, `PUT /api/staff/:id/permissions`. Bản đồ quyền → thao tác của ADR-0007 thi hành ở `src/shared/permissions.ts`: mọi phần §2.4-4/5 ("mọi nhân viên xem được đơn của nhau", "người lập hoặc admin mới sửa") nay đọc là "SALES/ACCOUNTING/ADMIN xem được đơn; SALES chỉ sửa đơn của mình và chỉ xem nhật ký đơn của mình; ADMIN mọi đơn; FIELD không dùng màn hình/API đơn". Khoá số khách/dịch vụ/tiền sau xác nhận (Q9 của A1) **giữ nguyên tới N3**.
```

- [ ] **Bước 10: Sửa `docs/HANDOFF-M4.md`**

Thay đoạn (đúng một chỗ):

```md
- Chỉ người lập đơn hoặc admin được sửa/xác nhận/huỷ (`canModify`);
```

bằng:

```md
- Chỉ người lập đơn hoặc admin được sửa/xác nhận/huỷ (từ N1: `can(staff, "order.modify", { ownerId })` ở `src/shared/permissions.ts`; FIELD không dùng route đơn);
```

- [ ] **Bước 11: Tạo/ghi `docs/HANDOFF-N1.md`**

```md
# HANDOFF — N1 (nền danh tính: hồ sơ, địa điểm, quyền app)

Đặc tả: `docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md` (đã duyệt 2026-09-20). ADR: `docs/adr/ADR-0001…0008`. Kế hoạch: `docs/superpowers/plans/2026-09-20-n1-a-nen-du-lieu.md` và `…-n1-b-chuyen-quyen.md`.

## Đã có sau N1 (lần phát hành 1)
- Migration `0009…0012` (chỉ thêm — mã cũ vẫn chạy): `v_ord_order_label`, `loc_*` (8 địa điểm), `pty_*` (hồ sơ, liên hệ, vai trò theo nơi, quan hệ), `stf_*` + `staff.party_id` + backfill hồ sơ/quyền cho tài khoản có sẵn.
- API: `/api/parties*`, `/api/locations*`, `PUT /api/staff/:id/permissions`; `POST /api/staff` nhận `permissions[]` (thay `role`).
- Quyền theo bản đồ ADR-0007 ở `src/shared/permissions.ts`; router có `access: "office"`. Tài khoản chỉ-FIELD bị chặn mọi route đơn/tiền/hồ sơ (màn hình "việc của tôi" của họ thuộc N2 — hiện họ đăng nhập được nhưng không có mục nào).
- Trang web: `/parties` (Hồ sơ), `/locations` (Địa điểm), `/staff` (chọn quyền thay vai trò). Vào được từ thanh điều hướng trên (máy tính) và từ mục liên kết của tab Tôi (điện thoại); chưa có thiết kế điện thoại riêng cho hai trang mới (thuộc A2/N2). Hai trang mới đã khai trong `PAGES` của `src/shared/sw-policy.ts` (service worker chỉ cache khung tĩnh, không bao giờ cache `/api`).
- Kiểm máy: `src/architecture.test.ts`, `docs/data-dictionary.json`, `scripts/audit-invariants.mjs` (xem `docs/ARCHITECTURE.md`).

## Điều kiện TRƯỚC khi triển khai
- **Không triển khai khi A2 chưa xong.** Nhánh chứa A1 (đơn có `services[]`) — `tsc -p web` còn đúng 4 lỗi ở `web/order-form.ts`, `web/order.ts`; giao diện đơn sẽ hỏng trên production nếu chỉ triển khai N1.
- Chủ dự án chạy (chỉ đọc) và ghi lại kết quả: `npx wrangler d1 migrations list tourdao-sales-db --remote` (xem `0008` đã áp chưa) và `npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS orders FROM orders"`.
- Ghi điểm khôi phục D1 Time Travel trước khi áp: `npx wrangler d1 time-travel info tourdao-sales-db`.

## Triển khai — HAI lần phát hành (expand–contract)
`wrangler d1 migrations apply` áp MỌI migration chưa áp, nên migration siết `0013` KHÔNG được nằm trong `migrations/` ở lần 1.

**Lần 1 (mở rộng):**
1. `npm test && npm run typecheck && npm run test:e2e` xanh (typecheck: chỉ 4 lỗi A2 nếu A2 chưa gộp — nhưng xem điều kiện trên).
2. `npm run db:migrate:remote` (áp `0008` nếu chưa, rồi `0009…0012`), **ngay sau đó** `npx wrangler deploy` trong cùng lượt làm việc (khoảng giữa chỉ tính bằng phút: tài khoản do mã cũ tạo lúc đó chưa có hồ sơ/quyền — hiện nhãn "(chưa có hồ sơ)", đơn của họ không biến mất, họ bị từ chối theo mặc định cho tới khi `0013` backfill).
3. `node scripts/audit-invariants.mjs --db remote` (không `--strict`: còn cảnh báo "chưa có hồ sơ" là đúng nếu có tài khoản khoảng giữa). Mọi dòng `✗` là vi phạm thật.
4. Thử tay: đăng nhập bằng tài khoản admin; `/staff` hiện cột Quyền; `/parties`, `/locations` mở được; tạo thử một hồ sơ.

**Lần 2 (siết) — chỉ sau khi lần 1 chạy ổn:** làm Task B5 của kế hoạch N1-B (thêm `0013_staff_party_required.sql` + test), rồi `npm run db:migrate:remote`, `node scripts/audit-invariants.mjs --db remote --strict`, và kiểm `SELECT count(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'staff_party_required_%'` = 2.

**Hoàn tác:** mã — triển khai lại phiên bản Worker trước (migration lần 1 chỉ thêm nên mã cũ vẫn chạy). Dữ liệu — D1 Time Travel về điểm đã ghi (quyết định của chủ dự án; mất mọi thay đổi sau điểm đó). Migration không có `down`.

## Việc còn treo / nợ
- `staff.role` (ghi hằng `'sales'`) và `staff.full_name` (ghi `''`) là cột chết có chủ đích; gỡ khi lần đầu phải dựng lại `staff` (ADR-0003 điều 10). `docs/data-dictionary.json` ghi `deprecatedColumns`.
- Module `accounts`, `audit`, `auth`, `catalog`, `orders` còn ở `LEGACY` của `src/architecture.test.ts` (SQL chưa đăng ký); `wonGuard` của `orders` đọc `audit_log` (ngoại lệ tới N2).
- Sắp xếp danh sách nhân sự/hồ sơ theo `sort_key` dùng `COLLATE NOCASE` — chữ có dấu chưa theo chuẩn tiếng Việt (danh sách chỉ vài chục dòng; nếu cần sắp lại ở mã bằng `Intl.Collator('vi')`).
- `PRAGMA foreign_key_check` trong `audit-invariants` chưa kiểm được trên D1 remote từ máy này; nếu lệnh lỗi trên remote thì chạy riêng `npx wrangler d1 execute tourdao-sales-db --remote --command "PRAGMA foreign_key_check"`.
- Tiếp theo: N2 (người đặt/khách đi tour trên đơn, gộp hồ sơ, phân công, `updateDraftOrder` theo id bền — ADR-0006), N3 (sổ thu tiền, hoá đơn, sửa sau xác nhận), N4 (giá net HDV).
```

- [ ] **Bước 12: Chạy** `npm run dict`

Kỳ vọng: không đổi gì (sổ không đổi ở task này).

- [ ] **Bước 13: Chạy** `npm test`

Kỳ vọng: toàn bộ đạt, 0 lỗi. (lần kiểm khi soạn: 158 tests, 158 đạt, 0 lỗi)

- [ ] **Bước 14: Chạy** `npx tsc --noEmit`

Kỳ vọng: không có lỗi (thoát 0).

- [ ] **Bước 15: Chạy** `npx tsc --noEmit -p web --pretty false`

Kỳ vọng: **LỖI** — đúng 4 lỗi đã biết (thuộc A2, KHÔNG sửa ở kế hoạch này): `web/order-form.ts` (101,5) TS2353 và (124,22) TS2339; `web/order.ts` (44,22) TS2339 và (44,33) TS7006. Nếu có lỗi khác là do bước vừa làm.

- [ ] **Bước 16: Chạy** `npm run test:e2e`

Kỳ vọng: `E2E: 10/10 kịch bản xanh` rồi dòng `✔ audit-invariants` — trong đó 11 kiểm `✓` và `Mọi bất biến đạt (D1 local, --strict).` (lần kiểm khi soạn: `E2E: 10/10 kịch bản xanh`)

- [ ] **Bước 17: Commit**

```bash
git add <các tệp vừa tạo/sửa>
git commit -m "N1 B4: insertRow union literal, audit-invariants (+ kiểm âm), ghim migration.test của orders vào 0008, tài liệu ARCHITECTURE/SPEC/HANDOFF-N1"
```

---

### Task B5: LẦN PHÁT HÀNH 2: migration `0013` (siết) — chỉ làm SAU khi lần phát hành 1 đã chạy trên remote

**KHÔNG làm task này trong cùng đợt với B1–B4.** `wrangler d1 migrations apply` áp MỌI migration chưa áp: nếu `0013` có mặt trong `migrations/` khi áp lần phát hành 1, nó chạy cùng `0009…0012` và mã cũ (`INSERT INTO staff` không có `party_id`) sẽ hỏng. Task này chỉ bắt đầu khi chủ dự án xác nhận lần 1 ổn và chạy `SELECT count(*) FROM staff WHERE party_id IS NULL` (đếm; nếu > 0 thì `0013` sẽ backfill). `0013` có nội dung nhỏ (diff nhỏ) nhưng KHÔNG được ship ngoài vòng rà soát: **giao một lượt rà soát độc lập riêng cho migration này** trước khi áp. Test cũ của `orders` đã được ghim vào `0008` ở B4 nên không bị `0013` làm đỏ.

**Files:**
- Tạo: `migrations/0013_staff_party_required.sql` (script tạm), `src/migrations-0013.test.ts`

**Interfaces:**
- Consumes: Worker N1 (B1–B4) đã được triển khai; chủ dự án đã áp `0009…0012` lên remote và xác nhận chạy ổn (`docs/HANDOFF-N1.md`).
- Produces: Trigger `staff_party_required_ins/upd` (tài khoản BẮT BUỘC có `party_id`), `stf_permission_keep_admin_upd`, `staff_keep_admin_upd` (luôn còn quản trị viên hoạt động) và backfill lặp lại idempotent cho tài khoản do mã cũ tạo trong khoảng giữa hai lần triển khai.

- [ ] **Bước 1: Tạo/ghi `src/migrations-0013.test.ts`**

```ts
// Kiểm migration 0013 (SIẾT — lần phát hành 2) trên SQLite thật (node:sqlite). Tệp này và migrations/0013_*.sql chỉ có mặt SAU khi Worker mới
// đã chạy trên remote (đặc tả N1 §9). Bản chuyển thể phần "Pha 2" của docs/superpowers/specs/2026-09-20-n1-schema-verify-phased.py.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const sqlOf = (prefix: string) => readFileSync(new URL(files.find((f) => f.startsWith(prefix))!, DIR), "utf8");
const NOW = "2026-09-20T00:00:00.000Z";
const rows = (db: DatabaseSync, sql: string) => db.prepare(sql).all().map((r) => ({ ...r }));
const one = (db: DatabaseSync, sql: string) => Object.values(db.prepare(sql).get() ?? {})[0];
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);

/** Schema sau 0012 (mở rộng) với dữ liệu như production: hai tài khoản có sẵn (đã backfill ở 0012) + một tài khoản do MÃ CŨ tạo sau đó. */
function afterExpand(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files.filter((n) => n.slice(0, 4) <= "0011")) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES
    ('s-admin', 'Nguyễn Tuyên Phong', '0845256256', 'x', 'admin', 1, '2026-09-19T17:30:00.000Z'),
    ('s-sales', 'Trần Văn Bình', '0901000002', 'x', 'sales', 1, '2026-09-19T05:00:00.000Z')`);
  db.exec(sqlOf("0012"));
  // khoảng giữa hai lần phát hành: mã cũ tạo tài khoản KHÔNG có party_id/quyền, rồi đổi tên
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('s-old', 'Lê Thị Hoa', '0900000030', 'x', 'admin', 1, '2026-09-20T01:00:00.000Z')`);
  db.exec("UPDATE staff SET full_name = 'Lê Hoa' WHERE id = 's-old'");
  return db;
}

test("0013: backfill chỉ đụng tài khoản chưa có hồ sơ; hồ sơ/quyền đã có giữ nguyên", () => {
  const db = afterExpand();
  const before = rows(db, "SELECT party_id, given_name FROM pty_person ORDER BY party_id");
  const permsBefore = rows(db, "SELECT staff_id, permission_type_code FROM stf_permission ORDER BY staff_id");
  db.exec(sqlOf("0013"));
  assert.equal(one(db, "SELECT count(*) FROM staff WHERE party_id IS NULL"), 0);
  assert.deepEqual(rows(db, "SELECT family_name AS f, middle_name AS m, given_name AS g FROM pty_person WHERE party_id = 'pty-s-old'"), [{ f: "Lê", m: null, g: "Hoa" }], "tách theo tên HIỆN TẠI của tài khoản");
  assert.equal(one(db, "SELECT display_name FROM pty_party WHERE id = 'pty-s-old'"), "Lê Hoa");
  assert.deepEqual(rows(db, "SELECT permission_type_code AS p FROM stf_permission WHERE staff_id = 's-old'"), [{ p: "ADMIN" }], "cấp quyền từ cột role cho dòng chưa có quyền");
  assert.deepEqual(rows(db, "SELECT party_id, given_name FROM pty_person WHERE party_id <> 'pty-s-old' ORDER BY party_id"), before, "hồ sơ cũ không bị đụng");
  assert.deepEqual(rows(db, "SELECT staff_id, permission_type_code FROM stf_permission WHERE staff_id <> 's-old' ORDER BY staff_id"), permsBefore, "quyền cũ không bị nhân đôi");
  assert.equal(one(db, "SELECT count(*) FROM pty_party_role WHERE role_type_code = 'STAFF'"), 3);
  assert.deepEqual(rows(db, "PRAGMA foreign_key_check"), []);
});

test("0013: từ nay INSERT/UPDATE tài khoản thiếu party_id bị chặn", () => {
  const db = afterExpand();
  db.exec(sqlOf("0013"));
  fails(db, `INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s-x', '', '0900000040', 'x', 'sales', '${NOW}')`, /staff_party/);
  fails(db, "UPDATE staff SET party_id = NULL WHERE id = 's-sales'", /staff_party/);
  // đường ghi của mã mới (createAccountStatements): hồ sơ → tài khoản có party_id → quyền — không bị chặn
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('p-new', 'PERSON', 'Người Mới', '${NOW}', '${NOW}')`);
  db.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p-new', 'Mới', '${NOW}', '${NOW}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at, party_id) VALUES ('s-new', '', '0900000050', 'x', 'sales', '${NOW}', 'p-new')`);
  db.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('perm-new', 's-new', 'SALES', '${NOW}', '${NOW}', '${NOW}')`);
});

test("0013: luôn còn quản trị viên hoạt động — ngưng và thu hồi ADMIN cuối bị chặn, còn admin khác thì được", () => {
  const db = afterExpand();
  db.exec(sqlOf("0013")); // hai quản trị viên: s-admin và s-old
  db.exec("UPDATE staff SET active = 0 WHERE id = 's-old'"); // còn s-admin → được
  fails(db, "UPDATE staff SET active = 0 WHERE id = 's-admin'", /last_admin/);
  fails(db, "UPDATE stf_permission SET valid_to_at = '2026-10-01T00:00:00.000Z' WHERE staff_id = 's-admin' AND permission_type_code = 'ADMIN'", /last_admin/);
  db.exec("UPDATE staff SET active = 1 WHERE id = 's-old'");
  db.exec("UPDATE stf_permission SET valid_to_at = '2026-10-01T00:00:00.000Z' WHERE staff_id = 's-old' AND permission_type_code = 'ADMIN'"); // còn s-admin → được
  assert.equal(one(db, "SELECT count(*) FROM stf_permission WHERE permission_type_code = 'ADMIN' AND valid_to_at IS NULL"), 1);
});

test("0013: chạy sạch trên D1 chưa có tài khoản nào", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files.filter((n) => n.slice(0, 4) <= "0012")) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec(sqlOf("0013"));
  assert.equal(one(db, "SELECT count(*) FROM staff"), 0);
  assert.equal(one(db, "SELECT count(*) FROM sqlite_master WHERE type = 'trigger' AND (name LIKE 'staff_party_required_%' OR name IN ('staff_keep_admin_upd', 'stf_permission_keep_admin_upd'))"), 4);
});
```

- [ ] **Bước 2: Chạy** `node --test src/migrations-0013.test.ts`

Kỳ vọng: **LỖI** — lỗi: chưa có `migrations/0013_*.sql` (`sqlOf("0013")` không tìm thấy tệp).

- [ ] **Bước 3: Tạo tệp tạm `$TMPDIR/build-n1-0013.mjs` (KHÔNG commit) rồi chạy** — tạo `migrations/0013_staff_party_required.sql` = backfill lặp lại + bốn trigger lấy NGUYÊN VĂN từ DDL tham chiếu

```js
// MỘT LẦN (không commit): dựng migrations/0013_staff_party_required.sql = backfill lặp lại (chỉ dòng chưa có hồ sơ/quyền) + bốn trigger "siết"
// lấy NGUYÊN VĂN từ DDL tham chiếu đã duyệt. Chạy từ gốc repo: node <đường dẫn>/build-n1-0013.mjs [thư-mục-ra]
import { readFileSync, writeFileSync } from "node:fs";

const ref = readFileSync("docs/superpowers/specs/2026-09-20-n1-schema-reference.sql", "utf8");
const TRIGGER = /((?:--[^\n]*\n)*)CREATE TRIGGER (?:stf_permission_keep_admin_upd|staff_keep_admin_upd|staff_party_required_ins|staff_party_required_upd)\b[\s\S]*?\bEND;\n/g;
const triggers = [...ref.matchAll(TRIGGER)].map((m) => m[0]);
if (triggers.length !== 4) throw new Error(`Cần đúng 4 trigger, thấy ${triggers.length}`);

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
const text = `-- Migration 0013 — SIẾT (expand–contract, lần phát hành 2). Đặc tả N1 §9; ADR-0003 điều 10, ADR-0005.
-- CHỈ thêm vào migrations/ SAU KHI Worker mới (mã đọc quyền từ stf_permission, ghi party_id) đã chạy trên remote: wrangler d1 migrations apply
-- áp MỌI migration chưa áp, nên nếu tệp này có mặt ở lần phát hành 1 nó chạy cùng 0009–0012 và mã cũ (INSERT staff không có party_id) sẽ hỏng.
--
-- (1) Backfill lặp lại CHỈ cho tài khoản do mã cũ tạo trong khoảng giữa hai lần triển khai (chưa có hồ sơ/quyền). Idempotent: dòng đã có bị bỏ qua.
INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at)
SELECT 'pty-' || s.id, 'PERSON', trim(s.full_name), s.active, ${NOW}, ${NOW} FROM staff s WHERE s.party_id IS NULL;

INSERT INTO pty_person (party_id, family_name, middle_name, given_name, created_at, updated_at)
SELECT 'pty-' || t.id,
       CASE WHEN instr(t.head, ' ') > 0 THEN substr(t.head, 1, instr(t.head, ' ') - 1) ELSE NULLIF(t.head, '') END,
       CASE WHEN instr(t.head, ' ') > 0 THEN NULLIF(trim(substr(t.head, instr(t.head, ' ') + 1)), '') END,
       t.given, ${NOW}, ${NOW}
FROM (SELECT s.id AS id,
             trim(substr(trim(s.full_name), length(rtrim(trim(s.full_name), replace(trim(s.full_name), ' ', ''))) + 1)) AS given,
             trim(rtrim(trim(s.full_name), replace(trim(s.full_name), ' ', ''))) AS head
      FROM staff s WHERE s.party_id IS NULL) t;

INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at)
SELECT 'ptr-' || s.id, 'pty-' || s.id, 'STAFF', NULL, date(s.created_at, '+7 hours'), ${NOW}, ${NOW} FROM staff s WHERE s.party_id IS NULL;

-- Quyền cấp từ cột role (cột chết) cho dòng CHƯA có quyền nào: sales → SALES, admin → ADMIN.
INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at)
SELECT 'stp-' || s.id, s.id, CASE s.role WHEN 'admin' THEN 'ADMIN' ELSE 'SALES' END, ${NOW}, ${NOW}, ${NOW}
FROM staff s WHERE NOT EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = s.id);

UPDATE staff SET party_id = 'pty-' || id WHERE party_id IS NULL;

-- (2) Siết: từ đây tài khoản BẮT BUỘC có hồ sơ; luôn còn ít nhất một quản trị viên hoạt động (lưới cuối ở CSDL — mã vẫn kiểm trước).
${triggers.join("\n")}`;
const out = process.argv[2] ?? "migrations";
writeFileSync(`${out}/0013_staff_party_required.sql`, text);
console.log(`đã ghi ${out}/0013_staff_party_required.sql (${text.split("\n").length} dòng)`);
```

Chạy từ gốc repo:

```bash
node $TMPDIR/build-n1-0013.mjs migrations
```

- [ ] **Bước 4: Chạy** `node --test src/migrations-0013.test.ts`

Kỳ vọng: toàn bộ test đạt. (lần kiểm khi soạn: 4 tests, 4 đạt, 0 lỗi)

- [ ] **Bước 5: Chạy** `npm test`

Kỳ vọng: toàn bộ đạt, 0 lỗi. (lần kiểm khi soạn: 162 tests, 162 đạt, 0 lỗi)

- [ ] **Bước 6: Chạy** `npm run test:e2e`

Kỳ vọng: `E2E: 10/10 kịch bản xanh` + `✔ audit-invariants` (`--strict`) — e2e nạp tài khoản bằng `insertStaffSql` MỚI (có hồ sơ) nên không bị trigger chặn. (lần kiểm khi soạn: `E2E: 10/10 kịch bản xanh`)

- [ ] **Bước 7: Rà soát độc lập riêng migration `0013`**

Giao một subagent rà soát (chỉ đọc): đối chiếu `migrations/0013_staff_party_required.sql` với `docs/superpowers/specs/2026-09-20-n1-schema-reference.sql` mục 3–4 và `src/migrations-0013.test.ts`. Kỳ vọng: backfill chỉ chạm `staff.party_id IS NULL`, bốn trigger nguyên văn, không có `DROP`/dựng lại bảng. Chưa áp lên remote khi chưa có kết luận.

- [ ] **Bước 8: Commit**

```bash
git add <các tệp vừa tạo/sửa>
git commit -m "N1 B5 (phát hành 2): migration 0013 — bắt buộc party_id và giữ quản trị viên cuối"
```

- [ ] **Bước 9: Cổng sau khi áp lên remote (chủ dự án chạy hoặc dán kết quả)**

```bash
npm run db:migrate:remote
node scripts/audit-invariants.mjs --db remote --strict
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS null_party FROM staff WHERE party_id IS NULL"
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS triggers FROM sqlite_master WHERE type='trigger' AND name LIKE 'staff_party_required_%'"
```

Kỳ vọng: `Mọi bất biến đạt`; `null_party = 0`; `triggers = 2`.

---

## Tự rà soát toàn N1 (kế hoạch A + B ↔ đặc tả)

| Đặc tả | Task |
|---|---|
| §1 (a)–(f) phạm vi | A: T1–T8; B: B1–B4 |
| §5 cột chết `staff.role`/`staff.full_name`; đổi tên tài khoản = đổi tên hồ sơ | B1 (mã), B1 (R-N1-14 bằng máy), B4 (tài liệu) |
| §6 R-N1-1 (mọi tài khoản có `party_id`; một hồ sơ một tài khoản) | A/T5 (chỉ mục + backfill), B4 (kiểm toán), B5 (trigger bắt buộc) |
| §6 R-N1-2, R-N1-3 (loại hồ sơ ⇔ bảng con; tên hiển thị = ghép ba phần) | A/T7 (luật), B4 (`audit-invariants`) |
| §6 R-N1-5 (luôn còn quản trị viên hoạt động) | B1 (chặn trong SQL + e2e `admin`/`admin-race`), B4 (kiểm toán), B5 (trigger) |
| §6 R-N1-13 (SĐT đăng nhập không thành liên hệ) | A/T5 (test backfill), B1 (e2e `admin.mjs`), B4 (kiểm toán) |
| §6 R-N1-14 | B1 (`architecture.test.ts`, hai lớp: kiểu + quét) |
| §6 R-N1-15 (chỉ-FIELD bị chặn mọi route đơn/tiền/hồ sơ) | B1 (`access: "office"`, e2e `permissions.mjs`) |
| §7.1 `staff`/`accounts`, `permissions.ts`, hợp đồng, router | B1 |
| §7.2 `PUT /api/staff/:id/permissions`; `PATCH` (tên/SĐT/ngưng) | B1 |
| §7.3 ánh xạ màn hình ↔ dữ liệu (Hồ sơ, Địa điểm, Nhân sự) | B2, B3 |
| §7.4 kiểm kê điểm chạm | B1 (mã, scripts, e2e), B2 (web), B3 (sw-policy) — **ba điểm chạm mới tìm thấy khi thử gộp `main`**: `web/account.ts` (PWA), `src/shared/sw-policy.ts`, và `orders/migration.test.ts` cần ghim vào `0008` (B4) |
| §8 truy vấn 4–5 (quyền hiện có; danh sách nhân sự theo tên) | B1 (`repository.ts`), B3 (UI) |
| §9 hai lần phát hành; cổng; runbook | B4 (`HANDOFF-N1.md`), B5 (`0013`) |
| §10 kiểm thử: đơn vị, schema, kiến trúc, e2e (≥ 8 kịch bản mới), kiểm toán bất biến | A: T1–T8; B1 (`permissions.mjs`, `admin`, `admin-race` viết lại), B3 (kiểm giao diện), B4 (`audit-invariants` + kiểm âm) |
| §11 nợ | B4 (`HANDOFF-N1.md`), `docs/data-dictionary.json` (`deprecatedColumns`) |
| §13 trình tự T0–T13 | T0–T8 (kế hoạch A), B1–B5 (B1 = T8+T9 của đặc tả gộp vì đổi hợp đồng là nguyên khối; B2/B3 = T10; B4 = T9/T11/T12; B5 = T13) |

**Hành vi đổi có chủ đích so với A1** (ADR-0007 đã duyệt): SALES chỉ xem nhật ký đơn của mình (`orders.mjs` đổi theo); tài khoản chỉ-FIELD không dùng route đơn/tiền/hồ sơ; ACCOUNTING xem đơn nhưng không lập/sửa/huỷ đơn. Khoá số khách/dịch vụ/tiền sau xác nhận (Q9 của A1) **giữ nguyên tới N3**.

**Việc còn lại sau kế hoạch B (ngoài phạm vi N1):** N2 (người đặt/khách đi tour trên đơn, gộp hồ sơ, phân công, `updateDraftOrder` theo id bền — ADR-0006, màn hình "việc của tôi" cho FIELD), N3 (sổ thu tiền, hoá đơn, sửa sau xác nhận), N4 (giá net HDV), A2 (giao diện theo mockup — **phải xong trước khi triển khai N1**, xem `docs/HANDOFF-N1.md`).
