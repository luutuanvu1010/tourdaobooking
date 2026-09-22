# ADR-0014 Phase A — Nền tảng quyền (đóng D-01/D-02, điều 8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm hai quyền `PARTNER`/`SUPER_ADMIN`, thực thi phạm vi "của mình" ở máy chủ cho liệt kê/xem đơn (đóng lỗ D-01, điều kiện bắt buộc trước khi cấp bất kỳ tài khoản đối tác thật nào), sửa mặc định quyền khi tạo tài khoản (D-02), và giới hạn Quản trị viên chỉ quản lý tài khoản cấp dưới (điều 8, đính chính trực tiếp của chủ dự án).

**Architecture:** Dùng lại nguyên cơ chế quyền đa trị đã có (`stf_permission_type`/`stf_permission`, ADR-0005) — thêm quyền mới chỉ là dữ liệu, không đổi schema. Mọi năng lực mới đi qua đúng MỘT bảng (`src/shared/permissions.ts` `MATRIX`), kiểm bằng `can()`. `PARTNER` cần một access-level mới ở router (`"orders"`) vì bốn mức hiện có (`public/staff/office/admin`) không có mức nào đúng cho một tài khoản chỉ được chạm route đơn theo phạm vi "của mình" — `office` hiện loại `PARTNER` (scope `own` không có `ctx.ownerId` ở tầng cổng); `admin.manage.superadmin` và điều 8 tái dùng route `PUT /api/staff/:id/permissions`/`PATCH /api/staff/:id`/`POST /unlock`/`POST /reset-pin` đã có, không thêm route mới.

**Tech Stack:** TypeScript thuần (Cloudflare Workers), D1 (SQLite), `node --test`.

**Spec:** `docs/adr/ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md` (điều 1–3, 7, 8; **KHÔNG** đụng nội dung ADR đã accepted — chỉ hiện thực hoá), `docs/superpowers/specs/2026-09-22-tai-khoan-doi-tac-super-admin.md`. Đây là **Phase A** của một kế hoạch nhiều phase — Phase B (ba cấp người phụ trách/`order.money.edit` cho FIELD/`order.cancel`/dòng điều chỉnh, điều 6, 11), Phase C (CTV chọn HDV lúc lập đơn + "xin nhận/duyệt", điều 9–10), Phase D (chấm đếm báo CTV, điều 12) viết plan riêng ở phiên sau — KHÔNG nằm trong phạm vi plan này.

## Global Constraints

- Tiền = `INTEGER` VNĐ, dẫn xuất chỉ tính ở server — không chạm ở Phase A (không đụng tiền).
- Migration: chỉ thêm tệp mới, không sửa tệp đã áp remote. Số hiệu: `0020` (cao nhất hiện có trên mọi nhánh/worktree đã kiểm là `0018`; `0019` đang giữ cho B5 theo `CLAUDE.md` §10, dù B5 chưa thật sự tiêu số này trong bất kỳ `migrations/` nào — tránh trùng, dùng `0020`).
- Sửa hành vi → test đỏ trước, xanh sau (`CLAUDE.md` §7).
- Vai trò hồ sơ (HDV, tài xế…) không bao giờ là điều kiện quyền — `PARTNER` là quyền app, không phải vai trò hồ sơ (`src/CLAUDE.md`).
- Router `office` (`isOffice`) giữ nguyên nghĩa (SALES/ACCOUNTING/ADMIN với `order.view=any`, cộng SUPER_ADMIN vì `any` không cần ngữ cảnh) — **không** đổi `isOffice`, vì nó còn dùng để hiện/ẩn mục "Hồ sơ" ở `web/account.ts` và tab điều hướng ở `web/shell.ts`; PARTNER không được thấy các mục đó.
- `npm test`, `npm run typecheck` phải xanh sau mỗi task trước khi commit.
- **Việc lớn** (CLAUDE.md §3): sau khi hết các task, bắt buộc một subagent kiểm độc lập, chỉ đọc, trước khi báo "đạt".

---

### Task 1: Migration — thêm hai mã quyền `PARTNER`/`SUPER_ADMIN`

**Files:**
- Create: `migrations/0020_partner_super_admin_permission_types.sql`
- Test: `src/migrations-0020.test.ts`

**Interfaces:**
- Produces: hai dòng mới trong `stf_permission_type` (`code = 'PARTNER'`, `code = 'SUPER_ADMIN'`) — Task 2 (permissions.ts) và các route sau dùng hai mã này.

- [ ] **Step 1: Viết migration (data-only, không đổi schema)**

```sql
-- Migration 0020 — ADR-0014 điều 1: thêm hai mã quyền app PARTNER (Đối tác) và SUPER_ADMIN (Super Admin), dùng lại nguyên
-- cơ chế quyền đa trị của ADR-0005 (stf_permission_type/stf_permission). CHỈ thêm dữ liệu, không đổi cấu trúc bảng.
-- Không gieo SĐT của chủ dự án ở đây (CLAUDE.md §10, bài học từ F-12): gán SUPER_ADMIN cho tài khoản chủ bằng SQL runbook lúc thi công, KHÔNG migration.
INSERT INTO stf_permission_type (code, name, description, sort_order) VALUES
  ('PARTNER', 'Đối tác', 'Tài khoản của người ngoài công ty (CTV, hướng dẫn viên/lái xe/lái cano bên ngoài, lễ tân khách sạn, công ty du lịch): chỉ thấy/sửa/xác nhận/huỷ đơn của chính mình', 5),
  ('SUPER_ADMIN', 'Super Admin', 'Vai trên Quản trị: làm được mọi thao tác, kể cả quản lý tài khoản Quản trị/Super Admin khác (ADR-0014 điều 8)', 6);
```

- [ ] **Step 2: Viết test migration (khuôn `src/migrations-0017.test.ts`)**

Đọc trước tệp mẫu để khớp khuôn thật của bộ khung test migration:

Run: `cat src/migrations-0017.test.ts`

Sau đó viết `src/migrations-0020.test.ts` theo đúng khuôn đó (dựng SQLite tạm, áp toàn bộ `migrations/*.sql` theo thứ tự, rồi kiểm), với nội dung kiểm:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { withMigratedDb } from "./migrations-test-helper.ts"; // tên hàm thật lấy từ migrations-0017.test.ts, sửa lại cho khớp

test("migration 0020: PARTNER và SUPER_ADMIN có trong stf_permission_type, không có mã trùng", async () => {
  await withMigratedDb(async (db) => {
    const rows = db.prepare("SELECT code, name FROM stf_permission_type WHERE code IN ('PARTNER', 'SUPER_ADMIN') ORDER BY code").all() as { code: string; name: string }[];
    assert.deepEqual(
      rows.map((r) => r.code),
      ["PARTNER", "SUPER_ADMIN"],
    );
    assert.equal(rows.find((r) => r.code === "PARTNER")!.name, "Đối tác");
    assert.equal(rows.find((r) => r.code === "SUPER_ADMIN")!.name, "Super Admin");
  });
});
```

*(Lưu ý cho người thi công: `migrations-0017.test.ts` là khuôn CÓ THẬT trong repo — đọc nó trước để lấy đúng tên hàm dựng SQLite tạm/áp migration, KHÔNG bịa tên `withMigratedDb`. Sửa lại import/gọi hàm cho khớp.)*

- [ ] **Step 3: Chạy test, xác nhận xanh**

Run: `node --test src/migrations-0020.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add migrations/0020_partner_super_admin_permission_types.sql src/migrations-0020.test.ts
git commit -m "Thêm quyền PARTNER và SUPER_ADMIN (ADR-0014 điều 1, migration data-only)"
```

---

### Task 2: `permissions.ts` — mở rộng bản đồ quyền theo đúng bảng ADR-0014

**Files:**
- Modify: `src/shared/permissions.ts`
- Modify: `src/shared/permissions.test.ts`

**Interfaces:**
- Consumes: không có (task nền tảng, không phụ thuộc task khác).
- Produces: `PERMISSION_CODES` gồm 6 mã (`SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN`); `MATRIX` có thêm 3 thao tác mới (`admin.manage.superadmin`, `order.cancel`, `dispatch.guides.view`, `dispatch.request` — **bốn**, không phải ba, xem bảng dưới); `canAccessOrders(who)` — hàm mới, Task 3 (router) dùng.

- [ ] **Step 1: Đọc file hiện tại để biết đúng vị trí sửa**

Run: `cat src/shared/permissions.ts`

- [ ] **Step 2: Sửa `PERMISSION_CODES`, `PERMISSION_LABEL`, `Row`, `row()`**

```ts
export const PERMISSION_CODES = ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "SUPER_ADMIN"] as const;
export type PermissionCode = (typeof PERMISSION_CODES)[number];

export const PERMISSION_LABEL: Record<PermissionCode, string> = {
  SALES: "Bán hàng",
  ACCOUNTING: "Kế toán",
  ADMIN: "Quản trị",
  FIELD: "Thực hiện",
  PARTNER: "Đối tác",
  SUPER_ADMIN: "Super Admin",
};
```

```ts
/** Thứ tự cột của mỗi hàng ở MATRIX. */
type Row = Record<PermissionCode, Scope>;
const row = (SALES: Scope, ACCOUNTING: Scope, ADMIN: Scope, FIELD: Scope, PARTNER: Scope, SUPER_ADMIN: Scope): Row => ({ SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN });
```

- [ ] **Step 3: Sửa `MATRIX` — thêm hai cột vào MỌI dòng hiện có, theo quy tắc ADR-0014 điều 2 (`SUPER_ADMIN` = `any` ở MỌI thao tác, không ngoại lệ; `PARTNER` theo đúng bảng ADR)**

Thay toàn bộ khối `export const MATRIX = { ... }` bằng:

```ts
export const MATRIX = {
  "order.view": row("any", "any", "any", "none", "own", "any"),
  "money.view": row("any", "any", "any", "none", "own", "any"),
  "order.history.view": row("ownOrAssigned", "any", "any", "none", "own", "any"),
  "contact.view": row("any", "any", "any", "assigned", "ownOrAssigned", "any"), // ADR-0014 điều 10: PARTNER own (đơn tự lập) + assigned (đơn được duyệt "xin nhận")
  "order.create": row("any", "none", "any", "none", "any", "any"),
  "order.modify": row("ownOrAssigned", "none", "any", "none", "own", "any"),
  "order.trip.edit": row("ownOrAssigned", "none", "any", "none", "none", "any"),
  "task.progress": row("none", "none", "any", "assigned", "assigned", "any"), // ADR-0014 điều 10: chỉ có tác dụng cho đơn PARTNER đang phụ trách sau khi được duyệt
  "order.money.edit": row("own", "any", "any", "assigned", "none", "any"), // ADR-0014 điều 6: FIELD assigned (dòng điều chỉnh — cơ chế ở Phase B, CHƯA có route dùng)
  "order.cancel": row("none", "none", "none", "assigned", "none", "any"), // ADR-0014 điều 11: thao tác MỚI, hẹp — CHƯA có route dùng (Phase B)
  "dispatch.assign": row("ownOrAssigned", "none", "any", "none", "none", "any"),
  "dispatch.claim": row("any", "none", "any", "none", "none", "any"),
  "dispatch.guides.view": row("none", "none", "none", "none", "any", "any"), // ADR-0014 điều 9: thao tác MỚI — CHƯA có route dùng (Phase C)
  "dispatch.request": row("none", "none", "none", "none", "any", "any"), // ADR-0014 điều 10: thao tác MỚI — CHƯA có route dùng (Phase C)
  "payment.receive": row("own", "any", "any", "none", "none", "any"),
  "payment.refund": row("none", "any", "any", "none", "none", "any"),
  "invoice.request": row("own", "any", "any", "none", "none", "any"),
  "invoice.issue": row("none", "any", "any", "none", "none", "any"),
  "party.view": row("any", "any", "any", "none", "none", "any"),
  "party.write": row("any", "any", "any", "none", "none", "any"),
  "admin.manage": row("none", "none", "any", "none", "none", "any"), // điều 8: ô vẫn "any" cho ADMIN; giới hạn "cấp dưới" nằm NGOÀI MATRIX (canManageAccount, Task 6)
  "admin.manage.superadmin": row("none", "none", "none", "none", "none", "any"), // thao tác MỚI: chỉ SUPER_ADMIN gán/gỡ SUPER_ADMIN
  "feedback.submit": row("any", "any", "any", "any", "any", "any"),
  "feedback.view": row("own", "own", "any", "own", "own", "any"),
  "feedback.triage": row("none", "none", "any", "none", "none", "any"),
} as const satisfies Record<string, Row>;
```

- [ ] **Step 4: Thêm hàm `canAccessOrders` (cuối file, cạnh `isOffice`)**

```ts
/**
 * Tài khoản dùng được route đơn (`/api/orders*`): nhân sự văn phòng (ADR-0007) HOẶC tài khoản Đối tác (ADR-0014 điều 2/3) — mỗi route đơn vẫn tự
 * gọi `can()` để kiểm phạm vi "của mình". Router dùng cho access "orders". KHÔNG dùng để hiện/ẩn mục giao diện của nhân sự văn phòng (dùng `isOffice`).
 */
export const canAccessOrders = (who: PermissionHolder): boolean => isOffice(who) || hasPermission(who, "PARTNER");
```

- [ ] **Step 5: Sửa `permissions.test.ts` — bảng đối chiếu tay `ADR` mở rộng lên 6 cột, thêm dòng PARTNER và quy tắc SUPER_ADMIN, thêm test cho `canAccessOrders`**

Đọc file hiện tại trước:

Run: `cat src/shared/permissions.test.ts`

Sửa hằng `ADR` (khối `Record<string, [Scope, Scope, Scope, Scope]>`) và `ORDER` thành 6 cột, thêm đủ 4 thao tác mới, viết LẠI test đầu tiên theo đúng khối `MATRIX` ở Step 3 (copy nguyên văn từng ô, không suy luận lại), rồi thêm khối test mới sau nó:

```ts
test("ADR-0014 điều 2: SUPER_ADMIN = any ở MỌI thao tác, không ngoại lệ", () => {
  const who = { id: "sa", permissions: ["SUPER_ADMIN"] as const };
  for (const op of Object.keys(MATRIX) as OperationCode[]) assert.equal(can(who, op, { ownerId: "x" }), true, `SUPER_ADMIN × ${op}`);
});

test("ADR-0014: PARTNER chỉ thấy/sửa đơn của mình, không tự nhận việc, không đụng danh bạ/quản trị", () => {
  const partner = { id: "p1", permissions: ["PARTNER"] as const };
  assert.equal(can(partner, "order.view", { ownerId: "p1" }), true);
  assert.equal(can(partner, "order.view", { ownerId: "other" }), false);
  assert.equal(can(partner, "order.view"), false, "không ngữ cảnh = không có gì để xem là của mình");
  assert.equal(can(partner, "order.create"), true);
  assert.equal(can(partner, "order.modify", { ownerId: "p1" }), true);
  assert.equal(can(partner, "order.modify", { ownerId: "other" }), false);
  assert.equal(can(partner, "dispatch.assign"), false);
  assert.equal(can(partner, "dispatch.claim"), false);
  assert.equal(can(partner, "order.money.edit", { ownerId: "p1" }), false);
  assert.equal(can(partner, "order.cancel", { ownerId: "p1", assigned: true }), false);
  assert.equal(can(partner, "party.view"), false);
  assert.equal(can(partner, "party.write"), false);
  assert.equal(can(partner, "admin.manage"), false);
  assert.equal(can(partner, "contact.view", { ownerId: "other", assigned: true }), true, "đơn đang phụ trách sau khi được duyệt xin nhận (điều 10)");
  assert.equal(can(partner, "task.progress", { assigned: true }), true);
  assert.equal(can(partner, "task.progress"), false);
});

test("ADR-0014 điều 6/11: FIELD được sửa tiền và huỷ đơn ĐANG PHỤ TRÁCH, không được lập/sửa/xác nhận đơn", () => {
  const field = { id: "f1", permissions: ["FIELD"] as const };
  assert.equal(can(field, "order.money.edit", { ownerId: "x", assigned: true }), true);
  assert.equal(can(field, "order.money.edit", { ownerId: "x", assigned: false }), false);
  assert.equal(can(field, "order.cancel", { ownerId: "x", assigned: true }), true);
  assert.equal(can(field, "order.cancel", { ownerId: "x", assigned: false }), false);
  assert.equal(can(field, "order.modify", { ownerId: "x", assigned: true }), false, "vẫn không tự xác nhận/sửa nháp — chỉ order.money.edit/order.cancel mở");
});

test("canAccessOrders: văn phòng và PARTNER dùng được route đơn; FIELD một mình thì không", () => {
  assert.equal(canAccessOrders({ id: "a", permissions: ["SALES"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["ADMIN"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["SUPER_ADMIN"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["PARTNER"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["FIELD"] }), false);
  assert.equal(canAccessOrders({ id: "a", permissions: [] }), false);
});
```

Cũng sửa import ở đầu file để thêm `canAccessOrders`:

```ts
import { MATRIX, PERMISSION_CODES, can, canAccessOrders, hasPermission, isOffice, isPermissionCode, type OperationCode, type PermissionCode, type Scope } from "./permissions.ts";
```

Test `"FIELD không xem đơn/tiền/nhật ký; ADMIN làm mọi thao tác của bản đồ"` đang có ở file cũ (dòng ~111-116) dùng vòng lặp `for (const op of OPS) assert.equal(can(admin, op, ...), true, ...)` cho `ADMIN` — **giữ nguyên**, `ADMIN` vẫn `any` ở mọi ô kể cả 4 thao tác mới (điều 8 chỉ giới hạn ở tầng `canManageAccount`, không đổi giá trị `MATRIX`).

- [ ] **Step 6: Chạy test, sửa tới khi xanh**

Run: `node --test src/shared/permissions.test.ts`
Expected: PASS (mọi test, kể cả test cũ chưa sửa)

- [ ] **Step 7: `npm run typecheck`**

Run: `npm run typecheck`
Expected: 0 lỗi

- [ ] **Step 8: Commit**

```bash
git add src/shared/permissions.ts src/shared/permissions.test.ts
git commit -m "Mở rộng bản đồ quyền: PARTNER/SUPER_ADMIN, 4 thao tác mới (ADR-0014 điều 2)"
```

---

### Task 3: Router — access level mới `"orders"` cho route đơn

**Files:**
- Modify: `src/shared/router.ts`
- Modify: `src/shared/router.test.ts`

**Interfaces:**
- Consumes: `canAccessOrders` từ Task 2 (`src/shared/permissions.ts`).
- Produces: `Access` gồm `"public" | "staff" | "office" | "orders" | "admin"` — Task 5 (orders/index.ts) đổi 7 route từ `"office"` sang `"orders"`.

- [ ] **Step 1: Viết test đỏ trước — thêm route `"orders"` giả vào `build()` và hai ca kiểm**

Trong `src/shared/router.test.ts`, sửa mảng `routes` của `build()` (dòng ~17) để thêm một route mới:

```ts
routes: [
  route("GET", "/api/open", "public", ok),
  route("GET", "/api/mine", "staff", ok),
  route("GET", "/api/adm", "admin", ok),
  route("GET", "/api/off", "office", ok),
  route("GET", "/api/ord", "orders", ok),
],
```

Thêm test mới ở cuối file:

```ts
test("access \"orders\": văn phòng và Đối tác dùng được; chỉ Thực hiện thì không; chưa đăng nhập 401", async () => {
  const office = build(staffOf(["SALES"]), () => null);
  assert.equal((await office.get("/api/ord")).status, 200);
  const partner = build(staffOf(["PARTNER"]), () => null);
  assert.equal((await partner.get("/api/ord")).status, 200);
  const fieldOnly = build(staffOf(["FIELD"]), () => null);
  assert.equal((await fieldOnly.get("/api/ord")).status, 403);
  const anon = build(null, () => null);
  assert.equal((await anon.get("/api/ord")).status, 401);
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ (lỗi kiểu — `"orders"` chưa phải `Access` hợp lệ, hoặc router 404/403 sai)**

Run: `npm run typecheck 2>&1 | grep -i router.test || node --test src/shared/router.test.ts`
Expected: FAIL (lỗi kiểu `Access` hoặc test mới đỏ)

- [ ] **Step 3: Sửa `router.ts` — thêm `"orders"` vào `Access`, import `canAccessOrders`, thêm nhánh kiểm**

```ts
import { canAccessOrders, hasPermission, isOffice } from "./permissions.ts";
```

```ts
/** public: không cần đăng nhập; staff: mọi tài khoản đăng nhập; office: nhân sự văn phòng (ADR-0007); orders: văn phòng HOẶC Đối tác (ADR-0014); admin: quyền ADMIN. */
export type Access = "public" | "staff" | "office" | "orders" | "admin";
```

Sửa khối kiểm quyền trong `dispatch()` (gần dòng `if (hit.r.access === "office" && !isOffice(staff))`):

```ts
      if (hit.r.access === "admin" && !hasPermission(staff, "ADMIN")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      if (hit.r.access === "office" && !isOffice(staff)) return error(403, "forbidden", "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này.");
      if (hit.r.access === "orders" && !canAccessOrders(staff)) return error(403, "forbidden", "Tài khoản này không dùng được màn hình đơn.");
```

- [ ] **Step 4: Chạy lại test, xác nhận xanh**

Run: `node --test src/shared/router.test.ts`
Expected: PASS

- [ ] **Step 5: `npm run typecheck`**

Run: `npm run typecheck`
Expected: 0 lỗi

- [ ] **Step 6: Commit**

```bash
git add src/shared/router.ts src/shared/router.test.ts
git commit -m "Router: thêm access \"orders\" cho tài khoản Đối tác dùng route đơn (ADR-0014 điều 3)"
```

---

### Task 4: D-01 — lọc "của mình" ở `listOrders` (liệt kê đơn)

**Files:**
- Modify: `src/modules/orders/repository.ts` (hàm `listOrders`)
- Modify: `src/modules/orders/index.ts` (route `GET /api/orders`)
- Test: `src/modules/orders/repository.test.ts` (tạo mới nếu chưa có — kiểm bằng `node:sqlite` hay khuôn test D1 thật đã dùng ở module này; đọc file/thư mục lân cận trước để chọn đúng khuôn — xem Step 1)

**Interfaces:**
- Consumes: `canAccessOrders`/`can` từ `src/shared/permissions.ts` (đã có từ Task 2).
- Produces: `listOrders(db, { q, status, limit, offset, ownerId })` — `ownerId: string | null`, `null` = không lọc.

- [ ] **Step 1: Tìm khuôn test hiện có của module `orders` (module LEGACY — kiểm bằng D1 thật hay giả lập gì)**

Run: `find src/modules/orders -name "*.test.ts" && ls tests/audit/ 2>/dev/null`

Đọc một tệp `*.test.ts` cạnh `orders` (nếu có) để biết cách dựng D1 test hiện có trong module này; nếu module `orders` không có test đơn vị riêng (chỉ có `tests/e2e` + `tests/audit`), viết test Task này ở `tests/audit/` theo đúng khuôn `tests/audit/harness.mjs` đã dùng cho `doi-tac.test.mjs` (đọc `tests/audit/doi-tac.test.mjs` để lấy khuôn tạo hai tài khoản, tạo đơn, gọi API thật qua harness).

- [ ] **Step 2: Viết ca kiểm đỏ (khuôn `tests/audit`, dùng harness đã có)**

Thêm vào `tests/audit/doi-tac.test.mjs` (nối tiếp các ca `P1`–`P7` đã có — đọc file để lấy đúng cách gọi `harness`, tạo tài khoản, tạo đơn qua API):

```js
test("D-01 (đã sửa): PARTNER liệt kê đơn chỉ thấy đơn của chính mình", async () => {
  const app = await harness();
  const partnerA = await app.createStaff({ permissions: ["PARTNER"] });
  const partnerB = await app.createStaff({ permissions: ["PARTNER"] });
  const orderA = await app.createOrder(partnerA); // hàm thật lấy theo khuôn file — đọc trước khi viết
  const orderB = await app.createOrder(partnerB);
  const res = await app.get("/api/orders", { as: partnerA });
  assert.equal(res.status, 200);
  const ids = res.body.orders.map((o) => o.id);
  assert.ok(ids.includes(orderA.id));
  assert.ok(!ids.includes(orderB.id), "PARTNER B không được thấy trong danh sách của PARTNER A");
});
```

*(Người thi công: các hàm `harness()`, `createStaff`, `createOrder`, `get` PHẢI lấy tên/chữ ký THẬT từ `tests/audit/harness.mjs` và `tests/audit/doi-tac.test.mjs` — đọc hai tệp đó trước, đừng bịa tên hàm ở trên; sửa lại lời gọi cho khớp.)*

- [ ] **Step 3: Chạy test, xác nhận đỏ**

Run: `node --test tests/audit/doi-tac.test.mjs`
Expected: FAIL (PARTNER B's order vẫn xuất hiện — chưa lọc)

- [ ] **Step 4: Sửa `listOrders` (repository.ts) — thêm tham số `ownerId`**

```ts
export async function listOrders(
  db: D1Database,
  opts: { q: string; status: OrderStatus | null; limit: number; offset: number; ownerId: string | null },
): Promise<{ orders: OrderSummaryDto[]; hasMore: boolean }> {
  const where: string[] = [];
  const binds: (string | number)[] = [];
  if (opts.ownerId) {
    where.push("o.staff_id = ?");
    binds.push(opts.ownerId);
  }
  if (opts.status) {
    where.push("o.status = ?");
    binds.push(opts.status);
  }
  if (opts.q) {
    const like = `%${escapeLike(opts.q)}%`;
    where.push(`(o.order_code LIKE ? ESCAPE '\\' OR o.customer_name LIKE ? ESCAPE '\\' OR o.customer_phone LIKE ? ESCAPE '\\' OR s.label LIKE ? ESCAPE '\\')`);
    binds.push(like, like, like, like);
  }
  // ... phần còn lại GIỮ NGUYÊN (sql, results, page, return)
```

- [ ] **Step 5: Sửa route `GET /api/orders` (orders/index.ts) — truyền `ownerId` theo phạm vi, đổi access sang `"orders"`**

```ts
    route("GET", "/api/orders", "orders", async ({ env, url, staff }) => {
      const raw = url.searchParams.get("status");
      const status = raw ? (isOrderStatus(raw) ? raw : undefined) : null;
      if (status === undefined) return error(400, "invalid_input", "Trạng thái lọc không hợp lệ.");
      // can(staff, "order.view") KHÔNG ngữ cảnh: "any" (SALES/ACCOUNTING/ADMIN/SUPER_ADMIN) → true → không lọc; "own" (PARTNER) → false → lọc theo chính mình.
      // An toàn CHỈ đúng vì access "orders" đã loại trước những quyền order.view = "none" (FIELD) ở router (Task 3) — đừng gọi route này ở access khác.
      const ownerId = can(staff, "order.view") ? null : staff.id;
      const result = await listOrders(env.DB, {
        q: (url.searchParams.get("q") ?? "").trim().slice(0, 100),
        status,
        limit: intParam(url.searchParams.get("limit"), 30, 1, 100),
        offset: intParam(url.searchParams.get("offset"), 0, 0, 100000),
        ownerId,
      });
      return json(result satisfies OrderListResponse);
    }),
```

- [ ] **Step 6: Đổi access của 6 route đơn còn lại (`POST /api/orders`, `GET/PUT /api/orders/:id`, `PUT /api/orders/:id/trip`, `PUT /api/orders/:id/booker`, `POST /api/orders/:id/status`) từ `"office"` sang `"orders"`**

Sửa từng dòng `route("...", "/api/orders...", "office", ...)` → `route("...", "/api/orders...", "orders", ...)` — CHỈ đổi chữ `"office"` thành `"orders"`, không đổi gì khác ở 6 route này trong task này (kiểm `order.view` của `GET /api/orders/:id` là Task tiếp theo).

- [ ] **Step 7: Chạy lại test audit, xác nhận xanh**

Run: `node --test tests/audit/doi-tac.test.mjs`
Expected: PASS

- [ ] **Step 8: Chạy toàn bộ `npm test` và `npm run typecheck`**

Run: `npm test && npm run typecheck`
Expected: PASS, 0 lỗi (các route khác gọi `listOrders` phải được cập nhật lời gọi — nếu có nơi khác gọi `listOrders` ngoài route này, `typecheck` sẽ chỉ ra; thêm `ownerId: null` ở đó)

- [ ] **Step 9: Commit**

```bash
git add src/modules/orders/repository.ts src/modules/orders/index.ts tests/audit/doi-tac.test.mjs
git commit -m "D-01: lọc đơn theo phạm vi của mình cho tài khoản Đối tác ở GET /api/orders"
```

---

### Task 5: D-01 — xem chi tiết một đơn (`GET /api/orders/:id`) đúng phạm vi

**Files:**
- Modify: `src/modules/orders/index.ts` (route `GET /api/orders/:id`)
- Test: `tests/audit/doi-tac.test.mjs`

**Interfaces:**
- Consumes: `order.staffId` đã có sẵn trong `loadOrderView` (đã dùng ở route này).

- [ ] **Step 1: Viết ca kiểm đỏ**

```js
test("D-01 (đã sửa): PARTNER xem chi tiết đơn của người khác bị từ chối", async () => {
  const app = await harness();
  const partnerA = await app.createStaff({ permissions: ["PARTNER"] });
  const partnerB = await app.createStaff({ permissions: ["PARTNER"] });
  const orderB = await app.createOrder(partnerB);
  const res = await app.get(`/api/orders/${orderB.id}`, { as: partnerA });
  assert.equal(res.status, 403);
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `node --test tests/audit/doi-tac.test.mjs`
Expected: FAIL (200, không phải 403)

- [ ] **Step 3: Sửa route**

```ts
    route("GET", "/api/orders/:id", "orders", async ({ env, params, staff, isAssigned }) => {
      if (!UUID_RE.test(params.id!)) return NOT_FOUND();
      const [order, assigned] = await Promise.all([loadOrderView(env.DB, params.id!), isAssigned(params.id!)]);
      if (!order) return NOT_FOUND();
      const scope = { ownerId: order.staffId, assigned };
      if (!can(staff, "order.view", scope)) return FORBIDDEN();
      const history = can(staff, "order.history.view", scope) ? await getAuditTrail(env.DB, order.id) : [];
      return json({ order, history, canModify: can(staff, "order.modify", scope) } satisfies OrderDetailResponse);
    }),
```

(chỉ thêm dòng `if (!can(staff, "order.view", scope)) return FORBIDDEN();` và đổi `"office"` → `"orders"`; phần còn lại giữ nguyên nguyên văn)

- [ ] **Step 4: Chạy lại test, xác nhận xanh + không hồi quy**

Run: `node --test tests/audit/doi-tac.test.mjs && npm run test:e2e -- orders`
Expected: PASS

- [ ] **Step 5: `npm test && npm run typecheck`**

Expected: PASS, 0 lỗi

- [ ] **Step 6: Commit**

```bash
git add src/modules/orders/index.ts tests/audit/doi-tac.test.mjs
git commit -m "D-01: chặn xem chi tiết đơn của người khác cho tài khoản Đối tác"
```

---

### Task 6: D-01 — chặn `PARTNER` ở `/api/parties*` (xác nhận, không cần sửa mã)

**Files:**
- Test: `tests/audit/doi-tac.test.mjs`

**Interfaces:** không có (task này chỉ THÊM một ca kiểm xác nhận hành vi đã đúng sẵn từ Task 2/3 — `party.view`/`party.write` của `PARTNER` là `none`, và `/api/parties*` vẫn access `"office"` không đổi, mà `isOffice(PARTNER) === false`).

- [ ] **Step 1: Viết ca kiểm (không cần sửa mã trước — nếu ca này đỏ thì có lỗ hổng thật, dừng lại báo cáo, không tự ý sửa `/api/parties*` ngoài phạm vi task)**

```js
test("D-01 (đã sửa): PARTNER không vào được /api/parties (party.view/party.write = none, access vẫn office)", async () => {
  const app = await harness();
  const partner = await app.createStaff({ permissions: ["PARTNER"] });
  assert.equal((await app.get("/api/parties", { as: partner })).status, 403);
  assert.equal((await app.get("/api/parties/lookup?phone=0900000000", { as: partner })).status, 403);
});
```

- [ ] **Step 2: Chạy test**

Run: `node --test tests/audit/doi-tac.test.mjs`
Expected: PASS ngay (xác nhận lại, không phải sửa mã — nếu FAIL thì dừng, báo cáo trước khi làm gì khác)

- [ ] **Step 3: Commit**

```bash
git add tests/audit/doi-tac.test.mjs
git commit -m "Kiểm: xác nhận PARTNER không vào được /api/parties (đã đúng từ Task 2/3, không sửa mã)"
```

---

### Task 7: D-02 — mặc định quyền khi tạo tài khoản

**Files:**
- Modify: `src/modules/accounts/index.ts`
- Test: `src/modules/accounts/patch-staff.test.ts` (hoặc file test mới `src/modules/accounts/create-staff.test.ts` nếu `patch-staff.test.ts` không phủ route tạo — đọc trước để biết)

**Interfaces:** không có (task độc lập, không phụ thuộc PARTNER/SUPER_ADMIN).

- [ ] **Step 1: Đọc test hiện có để biết khuôn**

Run: `cat src/modules/accounts/patch-staff.test.ts`

- [ ] **Step 2: Viết ca kiểm đỏ (đơn vị thuần cho `cleanPermissions`/logic mặc định — không cần D1 nếu route test đã có khuôn nhẹ; nếu route cần D1 thật, dùng khuôn file đã đọc ở Step 1)**

```ts
test("D-02: POST /api/staff không kèm permissions → tài khoản không quyền nào (không còn tự động Bán hàng)", async () => {
  // dựng request thật qua app test đã có ở patch-staff.test.ts (đọc lại khuôn dựng app/DB ở đó), body KHÔNG có trường permissions
  const res = await postStaff({ fullName: "Người thử", phone: "0911111111" }); // KHÔNG có permissions
  assert.equal(res.status, 201);
  assert.deepEqual(res.body.staff.permissions, []);
});
```

*(Người thi công: hàm `postStaff`/cách dựng app test lấy nguyên từ khuôn đã đọc ở Step 1 — sửa lại lời gọi cho khớp chữ ký thật.)*

- [ ] **Step 3: Chạy test, xác nhận đỏ**

Run: `node --test src/modules/accounts/patch-staff.test.ts`
Expected: FAIL (`permissions` là `["SALES"]`, không phải `[]`)

- [ ] **Step 4: Sửa route `POST /api/staff`**

```ts
    route("POST", "/api/staff", "admin", async ({ request, env, staff: admin }) => {
      const db = env.DB;
      const body = await readJson(request);
      const name = cleanName(body?.fullName);
      if (name.error) return error(400, "invalid_input", name.error);
      const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
      if (!phone) return error(400, "invalid_input", "Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
      // D-02 (ADR-0014 điều 7): thiếu hẳn trường permissions → KHÔNG quyền nào (trước đây tự động Bán hàng — lỗ khi gọi thẳng API, bỏ qua màn quản trị vốn luôn gửi danh sách).
      // Gửi permissions: [] một cách tường minh vẫn bị cleanPermissions từ chối (đòi ≥ 1 quyền) — chỉ trường HOÀN TOÀN VẮNG MẶT mới hưởng mặc định này.
      const perms = body?.permissions === undefined ? { value: [] as PermissionCode[] } : cleanPermissions(body.permissions);
      if (perms.error) return error(400, "invalid_input", perms.error);
```

(phần còn lại của route GIỮ NGUYÊN — `labelOf(perms.value!)` đã có sẵn xử lý mảng rỗng: `list.length ? ... : "không có quyền"`)

- [ ] **Step 5: Chạy lại test, xác nhận xanh**

Run: `node --test src/modules/accounts/patch-staff.test.ts`
Expected: PASS

- [ ] **Step 6: Chạy test màn quản trị hiện có để chắc không hồi quy (màn luôn gửi danh sách quyền, không đụng nhánh mới)**

Run: `npm run test:e2e -- staff`
Expected: PASS

- [ ] **Step 7: `npm test && npm run typecheck`**

Expected: PASS, 0 lỗi

- [ ] **Step 8: Commit**

```bash
git add src/modules/accounts/index.ts src/modules/accounts/patch-staff.test.ts
git commit -m "D-02: bỏ trường permissions khi tạo tài khoản → không quyền nào (không còn tự động Bán hàng)"
```

---

### Task 8: Điều 8 — `canManageAccount` (luật thuần)

**Files:**
- Modify: `src/modules/staff/rules.ts`
- Modify: `src/modules/staff/rules.test.ts`

**Interfaces:**
- Produces: `canManageAccount(actor: readonly PermissionCode[], target: readonly PermissionCode[]): boolean` — Task 9 (accounts/index.ts) dùng.

- [ ] **Step 1: Đọc `rules.test.ts` hiện có để biết khuôn**

Run: `cat src/modules/staff/rules.test.ts`

- [ ] **Step 2: Viết ca kiểm đỏ**

```ts
import { canManageAccount } from "./rules.ts";

test("canManageAccount (ADR-0014 điều 8): ADMIN quản lý được cấp dưới, không quản lý được ADMIN/SUPER_ADMIN khác; SUPER_ADMIN quản lý được mọi tài khoản", () => {
  assert.equal(canManageAccount(["ADMIN"], ["SALES"]), true);
  assert.equal(canManageAccount(["ADMIN"], ["PARTNER"]), true);
  assert.equal(canManageAccount(["ADMIN"], []), true);
  assert.equal(canManageAccount(["ADMIN"], ["ADMIN"]), false);
  assert.equal(canManageAccount(["ADMIN"], ["SUPER_ADMIN"]), false);
  assert.equal(canManageAccount(["ADMIN"], ["SUPER_ADMIN", "ADMIN"]), false);
  assert.equal(canManageAccount(["SUPER_ADMIN"], ["ADMIN"]), true);
  assert.equal(canManageAccount(["SUPER_ADMIN"], ["SUPER_ADMIN"]), true);
  assert.equal(canManageAccount(["SUPER_ADMIN", "ADMIN"], ["ADMIN"]), true, "giữ cả hai quyền vẫn quản lý được nhờ SUPER_ADMIN");
  assert.equal(canManageAccount(["SALES"], ["SALES"]), false, "không giữ ADMIN/SUPER_ADMIN thì không quản lý ai");
});
```

- [ ] **Step 3: Chạy test, xác nhận đỏ**

Run: `node --test src/modules/staff/rules.test.ts`
Expected: FAIL (`canManageAccount` chưa tồn tại — lỗi import)

- [ ] **Step 4: Viết hàm trong `rules.ts`**

```ts
import type { PermissionCode } from "../../shared/permissions.ts";

/**
 * ADR-0014 điều 8 (đính chính trực tiếp của chủ dự án): `ADMIN` chỉ quản lý được tài khoản "cấp dưới" — KHÔNG giữ `ADMIN` hay `SUPER_ADMIN`.
 * `SUPER_ADMIN` quản lý được mọi tài khoản, kể cả `ADMIN`/`SUPER_ADMIN` khác. Không phải một ô của MATRIX (Scope không diễn đạt được "so cấp bậc mục tiêu").
 */
export function canManageAccount(actor: readonly PermissionCode[], target: readonly PermissionCode[]): boolean {
  if (actor.includes("SUPER_ADMIN")) return true;
  if (!actor.includes("ADMIN")) return false;
  return !target.includes("ADMIN") && !target.includes("SUPER_ADMIN");
}
```

- [ ] **Step 5: Chạy lại test, xác nhận xanh**

Run: `node --test src/modules/staff/rules.test.ts`
Expected: PASS

- [ ] **Step 6: `npm run typecheck`**

Expected: 0 lỗi

- [ ] **Step 7: Commit**

```bash
git add src/modules/staff/rules.ts src/modules/staff/rules.test.ts
git commit -m "Điều 8: hàm luật thuần canManageAccount (Admin chỉ quản lý cấp dưới)"
```

---

### Task 9: Điều 8 — gắn `canManageAccount` vào các route quản lý MỘT tài khoản

**Files:**
- Modify: `src/modules/accounts/index.ts` (import `canManageAccount` từ `../staff`; kiểm tra `src/modules/staff/index.ts` đã export lại `rules.ts` chưa — nếu chưa, thêm dòng export)
- Test: `src/modules/accounts/patch-staff.test.ts`

**Interfaces:**
- Consumes: `canManageAccount` từ Task 8.

- [ ] **Step 1: Kiểm tra `src/modules/staff/index.ts` có export `canManageAccount` chưa**

Run: `grep -n "export" src/modules/staff/index.ts | grep -i rule`

Nếu `checkAccountChange`/`generatePin`/... đã export qua `staff/index.ts`, thêm `canManageAccount` vào cùng dòng `export { ... } from "./rules";` (hoặc dòng tương ứng theo đúng cách file đó đang export). Không tự bịa dòng export nếu chưa đọc file thật.

- [ ] **Step 2: Viết bốn ca kiểm đỏ (PATCH mở/đình chỉ/sửa, PUT permissions, POST unlock, POST reset-pin — ADMIN đụng ADMIN khác bị chặn; SUPER_ADMIN thì không)**

```ts
test("Điều 8: ADMIN không đình chỉ được một ADMIN khác; SUPER_ADMIN thì được", async () => {
  // dựng app test theo khuôn đã có trong patch-staff.test.ts: 1 tài khoản ADMIN "actor", 1 tài khoản ADMIN khác "targetAdmin", 1 SUPER_ADMIN "superAdmin"
  const asAdmin = await patchStaff(targetAdmin.id, { active: false }, { as: actorAdmin });
  assert.equal(asAdmin.status, 403);
  const asSuperAdmin = await patchStaff(targetAdmin.id, { active: false }, { as: superAdmin });
  assert.equal(asSuperAdmin.status, 200);
});

test("Điều 8: ADMIN đình chỉ được tài khoản SALES/PARTNER (cấp dưới)", async () => {
  const res = await patchStaff(targetSales.id, { active: false }, { as: actorAdmin });
  assert.equal(res.status, 200);
});

test("Điều 8 (admin.manage.superadmin): ADMIN không cấp/gỡ được SUPER_ADMIN cho ai; SUPER_ADMIN thì được", async () => {
  const asAdmin = await putPermissions(targetSales.id, ["SALES", "SUPER_ADMIN"], { as: actorAdmin });
  assert.equal(asAdmin.status, 403);
  const asSuperAdmin = await putPermissions(targetSales.id, ["SALES", "SUPER_ADMIN"], { as: superAdmin });
  assert.equal(asSuperAdmin.status, 200);
});

test("Điều 8: ADMIN không unlock/reset-pin được một ADMIN khác; SUPER_ADMIN thì được", async () => {
  assert.equal((await unlockStaff(targetAdmin.id, { as: actorAdmin })).status, 403);
  assert.equal((await unlockStaff(targetAdmin.id, { as: superAdmin })).status, 200);
  assert.equal((await resetPin(targetAdmin.id, { as: actorAdmin })).status, 403);
});
```

*(Người thi công: `patchStaff`/`putPermissions`/`unlockStaff`/`resetPin` và cách dựng `actorAdmin`/`targetAdmin`/`targetSales`/`superAdmin` PHẢI lấy đúng khuôn từ `patch-staff.test.ts` đã đọc ở Task 7 Step 1 — sửa lại cho khớp chữ ký thật, đừng bịa.)*

- [ ] **Step 3: Chạy test, xác nhận đỏ**

Run: `node --test src/modules/accounts/patch-staff.test.ts`
Expected: FAIL (mọi thao tác đều 200, chưa có kiểm cấp bậc)

- [ ] **Step 4: Sửa `PATCH /api/staff/:id`, `PUT /api/staff/:id/permissions`, `POST /api/staff/:id/unlock`, `POST /api/staff/:id/reset-pin` — thêm kiểm `canManageAccount`, và cho `PUT .../permissions` thêm kiểm `admin.manage.superadmin`**

Ở đầu mỗi route (sau khi có `t` từ `target(ctx)`, TRƯỚC khi làm gì khác trên `t`), thêm:

```ts
      if (!canManageAccount(admin.permissions, t.permissions)) {
        return error(403, "forbidden", "Chỉ quản lý được tài khoản cấp dưới; tài khoản này do Super Admin quản lý.");
      }
```

Riêng `PUT /api/staff/:id/permissions`, thêm NGAY SAU dòng đó, sau khi đã có `next` (biến quyền đích):

```ts
      const grantsOrRevokesSuperAdmin = t.permissions.includes("SUPER_ADMIN") !== next.includes("SUPER_ADMIN");
      if (grantsOrRevokesSuperAdmin && !admin.permissions.includes("SUPER_ADMIN")) {
        return error(403, "forbidden", "Chỉ Super Admin mới cấp hoặc gỡ quyền Super Admin.");
      }
```

Import `canManageAccount` ở đầu `accounts/index.ts` (gộp vào dòng import đã có từ `../staff`).

- [ ] **Step 5: Chạy lại test, xác nhận xanh**

Run: `node --test src/modules/accounts/patch-staff.test.ts`
Expected: PASS

- [ ] **Step 6: Chạy e2e màn quản trị, xác nhận không hồi quy (ADMIN vẫn sửa được SALES/ACCOUNTING/FIELD như hôm nay)**

Run: `npm run test:e2e -- staff`
Expected: PASS

- [ ] **Step 7: `npm test && npm run typecheck`**

Expected: PASS, 0 lỗi

- [ ] **Step 8: Commit**

```bash
git add src/modules/accounts/index.ts src/modules/accounts/patch-staff.test.ts src/modules/staff/index.ts
git commit -m "Điều 8: Admin chỉ quản lý được tài khoản cấp dưới; chỉ Super Admin cấp/gỡ Super Admin"
```

---

### Task 10: Gieo Super Admin đầu tiên (SQL runbook — KHÔNG migration, KHÔNG tự chạy trên remote)

**Files:**
- Create: `docs/HANDOFF-N1.md` — thêm một đoạn runbook (đọc mục "TRẠNG THÁI TRIỂN KHAI" và các đoạn runbook khác trước, viết theo đúng khuôn)

**Interfaces:** không có.

- [ ] **Step 1: Đọc khuôn runbook đã có trong `docs/HANDOFF-N1.md` (ví dụ đoạn tắt bảo trì khẩn cấp) để viết cùng văn phong**

Run: `grep -n "wrangler d1 execute\|SQL" docs/HANDOFF-N1.md | head -20`

- [ ] **Step 2: Thêm đoạn runbook mới, gồm lệnh `wrangler d1 execute` THẬT (chủ dự án tự chạy, KHÔNG phải AI chạy — CLAUDE.md §8) để gán `SUPER_ADMIN` cho tài khoản của chủ theo SĐT 0989929373; SĐT không được gieo trong migration**

Nội dung đoạn thêm — dùng `staff.phone` để tìm `staff.id`, rồi `INSERT` một dòng `stf_permission` mở (giống cách `INSERT_PERMISSION` ở `staff/repository.ts` làm, nhưng chạy tay một lần):

```sql
-- Chạy MỘT LẦN, do chủ dự án tự chạy (không phải AI — CLAUDE.md §8), sau khi migration 0020 đã áp remote:
-- wrangler d1 execute tourdao-sales-db --remote --command "..."
INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at)
SELECT lower(hex(randomblob(16))), s.id, 'SUPER_ADMIN', datetime('now'), datetime('now'), datetime('now')
FROM staff s WHERE s.phone = '0989929373'
  AND NOT EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = s.id AND p.permission_type_code = 'SUPER_ADMIN' AND p.valid_to_at IS NULL);
```

- [ ] **Step 3: Commit tài liệu**

```bash
git add docs/HANDOFF-N1.md
git commit -m "Runbook: câu SQL gán Super Admin đầu tiên cho chủ dự án (chủ tự chạy, không migration)"
```

---

### Task 11: Chạy toàn bộ kiểm, viết nhật ký thi công

**Files:**
- Create: `docs/superpowers/plans/2026-09-22-adr-0014-phase-a-thi-cong-nhat-ky.md`

- [ ] **Step 1: Chạy toàn bộ**

Run: `npm test && npm run typecheck && npm run test:e2e && node scripts/audit-invariants.mjs --db local`
Expected: tất cả xanh; nếu `test:e2e`/`audit-invariants` cần D1 local đã migrate, chạy `npm run db:migrate:local` trước.

- [ ] **Step 2: Viết nhật ký thi công** (khuôn `docs/superpowers/plans/2026-09-20-n1-thi-cong-nhat-ky.md`): mỗi task đã làm, kết quả test, quyết định phát sinh lúc thi công (nếu có), Phase B/C/D còn lại chưa làm.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-09-22-adr-0014-phase-a-thi-cong-nhat-ky.md
git commit -m "Nhật ký thi công ADR-0014 Phase A"
```

---

### Task 12: Kiểm độc lập (việc lớn — CLAUDE.md §3, bắt buộc trước khi báo "đạt")

Không phải một task viết mã — dispatch một subagent **chỉ đọc**, đọc mã thật + chạy lại `npm test`/`npm run typecheck`/`node --test tests/audit/doi-tac.test.mjs`, đối chiếu với `docs/adr/ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md` điều 1–3, 7, 8, báo cáo đạt/không đạt — không tự sửa mã, không tự nhận "đạt" thay.
